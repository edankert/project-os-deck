// TST-0021 — a port another process is listening on is never offered as free
// (ISS-0002 and ISS-0004).
//
// Two faults, one probe. A probe that binds loopback while the host binds every
// interface hands back a port the host cannot listen on, and the failure
// arrives later as EADDRINUSE. A probe that only binds also passes while
// another process holds the same port on every interface, because a loopback
// bind succeeds beside it, and then two Decks listen on one port and which one
// a browser reaches is undetermined.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { load } from './helpers.mjs';

const { freePort } = load('main/sidecar.js');

/** A server that holds a port, on whichever interface the test needs. */
async function hold(port, bind) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, bind, resolve);
  });
  return {
    port: server.address().port,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** A port nothing is using, found by letting the operating system pick one. */
async function borrowedPort() {
  const probe = await hold(0, '127.0.0.1');
  const { port } = probe;
  await probe.close();
  return port;
}

test('a free port is offered when nothing holds it', async () => {
  const port = await borrowedPort();
  const found = await freePort(port, port + 5, '127.0.0.1');
  assert.equal(found, port);
});

test('a port another process holds on EVERY interface is skipped (ISS-0004)', async () => {
  const port = await borrowedPort();
  // This is the Deck started with --lan. A loopback bind still succeeds beside
  // it on macOS, so binding alone cannot see this listener.
  const wildcard = await hold(port, '0.0.0.0');
  try {
    const found = await freePort(port, port + 5, '127.0.0.1');
    assert.notEqual(found, port, 'the probe offered a port another process is already listening on');
    assert.ok(found > port && found <= port + 5, `expected a later port, got ${found}`);
  } finally {
    await wildcard.close();
  }
});

test('a port another process holds on loopback is skipped when binding every interface (ISS-0002)', async () => {
  const port = await borrowedPort();
  const loopback = await hold(port, '127.0.0.1');
  try {
    const found = await freePort(port, port + 5, '0.0.0.0');
    assert.notEqual(found, port, 'the probe offered a port that 0.0.0.0 cannot listen on');
  } finally {
    await loopback.close();
  }
});

test('a range with nothing free in it says so rather than handing back a port', async () => {
  const port = await borrowedPort();
  const held = await hold(port, '0.0.0.0');
  try {
    await assert.rejects(() => freePort(port, port, '127.0.0.1'), /no free port/);
  } finally {
    await held.close();
  }
});
