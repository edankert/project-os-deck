// TST-0007 — the host serves the renderer, proxies reads, and refuses every
// method and path that is not one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load, desktopRoot, fakeSidecar, HEALTH, navPayload, item } from './helpers.mjs';

const { DeckHost, resolveWithin, isForwardable, resolveSidecarTarget } = load('main/host.js');
const { SHELL_CAPABILITIES, SERVED_CAPABILITIES, normaliseCapabilities, can } = load('shared/capability.js');

const WEB_ROOT = path.join(desktopRoot, 'dist', 'web');
const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };

async function standUp() {
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/cockpit/nav': navPayload([item('FEAT-0002', 'The shell', 'doing', 'feature')]),
  });
  const host = new DeckHost({
    webRoot: WEB_ROOT,
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [WORKSPACE],
    sidecarBaseFor: (id) => (id === WORKSPACE.id ? sidecar.base : null),
  });
  const { port } = await host.listen(0);
  return { sidecar, host, origin: `http://127.0.0.1:${port}` };
}

test('the host serves the renderer that the shell also loads', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    const page = await fetch(`${origin}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.match(html, /<title>Deck<\/title>/);

    const module = await fetch(`${origin}/renderer/renderer.js`);
    assert.equal(module.status, 200);
    assert.match(module.headers.get('content-type'), /javascript/);

    const style = await fetch(`${origin}/deck.css`);
    assert.equal(style.status, 200);
    assert.match(style.headers.get('content-type'), /text\/css/);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('a read under the sidecar prefix reaches the sidecar and comes back', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    const response = await fetch(`${origin}/deck/sidecar/${WORKSPACE.id}/api/cockpit/nav?mode=features`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.groups.length, 2);
    assert.deepEqual(sidecar.received.at(-1), { method: 'GET', url: '/api/cockpit/nav?mode=features' });
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('every method that is not a read is refused, and nothing reaches the sidecar', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await fetch(`${origin}/deck/sidecar/${WORKSPACE.id}/api/notes/transition`, { method });
      assert.equal(response.status, 405, `${method} was not refused`);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
    // `fetch` will not send these at all, so they go over a raw socket: the
    // refusal has to hold for a client that is not a browser.
    for (const method of ['TRACE', 'PROPFIND', 'FOO']) {
      const status = await rawRequest(origin, method, `/deck/sidecar/${WORKSPACE.id}/api/notes/transition`);
      // 405 is Deck refusing it; 400 is Node's own parser refusing a method it
      // does not know, before Deck is reached. Either is a refusal, and the
      // claim under test is the line below: nothing arrived at the sidecar.
      assert.ok(status === 405 || status === 400, `${method} answered ${status}`);
    }

    // The point of the test: the sidecar never saw any of them.
    assert.deepEqual(sidecar.received, []);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('only the reads Deck actually makes are forwarded', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    // Deck's host makes every request look like it came from loopback, and the
    // sidecar withholds some reads from everywhere else. Forwarding "anything
    // under /api" would hand those to a tablet.
    for (const blocked of [
      '/api/inbox',
      '/api/inbox/notes.md',
      '/_inbox/screenshot.png',
      '/api/cockpit/dispatch',
      '/api/cockpit/state',
      '/api/cockpit/sessions',
      '/_events',
      '/',
      '/api/cockpit/nav/../../api/inbox',
    ]) {
      const response = await fetch(`${origin}/deck/sidecar/${WORKSPACE.id}${blocked}`);
      assert.equal(response.status, 403, `${blocked} was forwarded`);
    }
    assert.deepEqual(sidecar.received, [], 'a path Deck does not forward still reached the sidecar');

    // And the ones it does make still go through.
    for (const allowed of ['/healthz', '/api/cockpit/nav?mode=features']) {
      const response = await fetch(`${origin}/deck/sidecar/${WORKSPACE.id}${allowed}`);
      assert.equal(response.status, 200, `${allowed} was refused`);
    }
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('a path that only becomes forbidden after decoding is still refused', async () => {
  // The hole this closes: decode once, check the result, then hand the
  // still-encoded remainder to `fetch`, which decodes again and resolves
  // `%252e%252e` into `..`. Two decodings and one check is no check.
  const { sidecar, host, origin } = await standUp();
  try {
    for (const attempt of [
      '/api/render/%2e%2e/%2e%2e/api/inbox',
      '/api/render/%252e%252e/%252e%252e/api/inbox',
      '/api/render/%25252e%25252e/api/inbox',
      '/api/render/..%2f..%2fapi/inbox',
      '/api/render/%2E%2E/api/inbox',
      '/api/cockpit/nav/%2e%2e/%2e%2e/_events',
      '/api/render/./../api/inbox',
    ]) {
      const response = await fetch(`${origin}/deck/sidecar/${WORKSPACE.id}${attempt}`);
      assert.equal(response.status, 403, `${attempt} was forwarded`);
    }
    assert.deepEqual(sidecar.received, [], 'an encoded traversal reached the sidecar');
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('the target is checked after it is resolved, not before', () => {
  const base = 'http://127.0.0.1:9999';
  assert.notEqual(resolveSidecarTarget(base, '/api/cockpit/nav?mode=x'), null);
  assert.equal(resolveSidecarTarget(base, '/api/render/%2e%2e/api/inbox'), null);
  assert.equal(resolveSidecarTarget(base, '/api/render/../api/inbox'), null);
  assert.equal(resolveSidecarTarget(base, '/api/inbox'), null);
  // A path that resolves to another host is not this sidecar's path.
  assert.equal(resolveSidecarTarget(base, '//evil.example/api/render'), null);
  assert.equal(resolveSidecarTarget(base, 'http://evil.example/api/render'), null);
  const ok = resolveSidecarTarget(base, '/api/render?path=docs/a.md');
  assert.equal(ok.pathname, '/api/render');
  assert.equal(ok.searchParams.get('path'), 'docs/a.md');
});

test('the forwarding rule matches on whole path segments', () => {
  assert.equal(isForwardable('/api/render'), true);
  assert.equal(isForwardable('/api/render/anything'), true);
  assert.equal(isForwardable('/api/rendering-secrets'), false, 'a prefix is not a path');
  assert.equal(isForwardable('/api/cockpit/nav'), true);
  assert.equal(isForwardable('/api/cockpit/navigate-elsewhere'), false);
  assert.equal(isForwardable('/api/inbox'), false);
  assert.equal(isForwardable('/api/render/../inbox'), false);
  assert.equal(isForwardable('/api/render/%2e%2e/inbox'), false, 'anything still encoded is refused');
  assert.equal(isForwardable('/api/render/./x'), false);
});

test('a HEAD is served, because it is a read', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    const response = await fetch(`${origin}/`, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('a path that walks out of what Deck serves is refused', async () => {
  const { sidecar, host, origin } = await standUp();
  const secret = path.join(desktopRoot, 'package.json');
  assert.ok(fs.existsSync(secret), 'the file the traversal aims at should exist');
  try {
    for (const attempt of [
      '/../package.json',
      '/../../package.json',
      '/%2e%2e/package.json',
      '/%2e%2e%2f%2e%2e%2fpackage.json',
      '/renderer/../../package.json',
    ]) {
      const response = await fetch(`${origin}${attempt}`);
      assert.ok(response.status === 403 || response.status === 404, `${attempt} answered ${response.status}`);
      const body = await response.text();
      assert.ok(!body.includes('project-os-deck-desktop'), `${attempt} served a file outside the document root`);
    }
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('the containment rule refuses an escape and accepts what is inside', () => {
  assert.equal(resolveWithin(WEB_ROOT, '/../package.json'), null);
  assert.equal(resolveWithin(WEB_ROOT, '/../../../../etc/passwd'), null);
  const inside = resolveWithin(WEB_ROOT, '/index.html');
  assert.ok(inside !== null && inside.endsWith(path.join('web', 'index.html')));
});

test('a request for a workspace with no sidecar says so rather than hanging', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    const response = await fetch(`${origin}/deck/sidecar/bbbb2222/api/cockpit/nav`);
    assert.equal(response.status, 503);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('a sidecar that dies mid-request is reported, not swallowed', async () => {
  const sidecar = await fakeSidecar({ '/healthz': HEALTH });
  const base = sidecar.base;
  await sidecar.close();
  const host = new DeckHost({
    webRoot: WEB_ROOT,
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [WORKSPACE],
    sidecarBaseFor: () => base,
  });
  const { port } = await host.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/deck/sidecar/${WORKSPACE.id}/healthz`);
    assert.equal(response.status, 502);
  } finally {
    await host.close();
  }
});

test('a sidecar that stopped answering is reported, so the next open looks again', async () => {
  const sidecar = await fakeSidecar({ '/healthz': HEALTH });
  const base = sidecar.base;
  await sidecar.close();
  const forgotten = [];
  const host = new DeckHost({
    webRoot: WEB_ROOT,
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [WORKSPACE],
    sidecarBaseFor: () => base,
    onSidecarUnreachable: (id) => forgotten.push(id),
  });
  const { port } = await host.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/deck/sidecar/${WORKSPACE.id}/healthz`);
    assert.equal(response.status, 502);
    assert.deepEqual(forgotten, [WORKSPACE.id]);
  } finally {
    await host.close();
  }
});

test('the served host reports reading capability and nothing only the shell can do', async () => {
  const { sidecar, host, origin } = await standUp();
  try {
    const response = await fetch(`${origin}/deck/capabilities`);
    const caps = await response.json();
    assert.deepEqual(caps, SERVED_CAPABILITIES);
    assert.equal(caps.popOutWindows, false);
    assert.equal(caps.sharedStore, false);
    assert.equal(SHELL_CAPABILITIES.popOutWindows, true, 'the shell should still offer what the served host cannot');

    const list = await (await fetch(`${origin}/deck/workspaces`)).json();
    assert.deepEqual(list.workspaces, [WORKSPACE]);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('a capability this build does not know is ignored rather than granted', () => {
  const caps = normaliseCapabilities({ popOutWindows: true, timeTravel: true, clipboard: 'yes' });
  assert.equal(caps.popOutWindows, true);
  assert.equal(caps.clipboard, false, 'a non-true value is not permission');
  assert.equal('timeTravel' in caps, false);
  assert.equal(can(null, 'popOutWindows'), false);
  assert.equal(can(undefined, 'clipboard'), false);
  assert.equal(can({ popOutWindows: true }, 'popOutWindows'), true);
});

test('the two capability sets differ exactly where the host does', () => {
  for (const key of Object.keys(SHELL_CAPABILITIES)) {
    assert.equal(SHELL_CAPABILITIES[key], true, `${key} should be offered by the shell`);
    assert.equal(SERVED_CAPABILITIES[key], false, `${key} should be absent when served`);
  }
});

test('a document root that does not exist is a startup failure, not a silent 404', () => {
  const missing = path.join(os.tmpdir(), 'deck-no-such-root-1234');
  assert.throws(() => resolveWithin(missing, '/index.html'));
});

/** `fetch` refuses to send some methods, so this sends one down a socket. */
async function rawRequest(origin, method, requestPath) {
  const { request } = await import('node:http');
  const url = new URL(origin);
  return await new Promise((resolve, reject) => {
    const req = request(
      { host: url.hostname, port: url.port, method, path: requestPath },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', reject);
    req.end();
  });
}
