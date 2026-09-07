// TST-0022 — a sidecar that cannot bind the port Deck offered is started on
// another one (ISS-0009).
//
// No probe can settle this. Node sets SO_REUSEADDR on everything it binds and
// the sidecar's Python server does not, so a port whose previous listener has
// gone but whose socket is still lingering binds here and is refused there.
// Deck offered 8901, Python answered "[Errno 48] Address already in use" and
// exited before it served, and the workspace would not open.
//
// The stand-in interpreter below is spawned exactly as the real one is, and it
// refuses its first port the way CPython does, traceback and all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from './helpers.mjs';

const { SidecarSupervisor, isPortCollision, freePort } = load('main/sidecar.js');

/**
 * An interpreter that behaves like the sidecar's Python: it refuses the first
 * ports it is given, and serves on the next one.
 */
function stubInterpreter(dir, refusals) {
  const marker = path.join(dir, 'refusals');
  fs.writeFileSync(marker, String(refusals), 'utf-8');
  const file = path.join(dir, 'python-stub.mjs');
  fs.writeFileSync(
    file,
    `#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
const argv = process.argv.slice(2);
const port = Number(argv[argv.indexOf('--port') + 1]);
// Spawned as: <interpreter> -m project_os_cockpit <docs> --port N --bind ...
const docs = argv[2];
const root = docs.replace(/\\/docs$/, '');
const marker = ${JSON.stringify(marker)};
const left = Number(fs.readFileSync(marker, 'utf-8'));
fs.appendFileSync(${JSON.stringify(path.join(dir, 'ports-tried'))}, port + '\\n');
if (left > 0) {
  fs.writeFileSync(marker, String(left - 1));
  // What CPython prints when socketserver cannot take the port.
  process.stderr.write([
    'Traceback (most recent call last):',
    '  File "server.py", line 377, in server_bind',
    '    socketserver.TCPServer.server_bind(self)',
    'OSError: [Errno 48] Address already in use',
    '',
  ].join('\\n'));
  process.exit(1);
}
const server = http.createServer((req, res) => {
  const body = req.url.startsWith('/healthz')
    ? { ok: true, service: 'project-os-cockpit', schema: 4, docs_root: docs }
    : { root, docs_root: docs, pid: process.pid };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});
server.listen(port, '127.0.0.1');
`,
    { mode: 0o755 },
  );
  return file;
}

function workspaceIn(dir) {
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.yaml'), 'version: 1\n', 'utf-8');
  return { id: 'aaaa1111', root: dir, name: 'a repo', kind: 'project-os' };
}

test('a port refused by the sidecar is not the end of it: Deck tries another', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sidecar-'));
  const supervisor = new SidecarSupervisor(stubInterpreter(dir, 1));
  try {
    const handle = await supervisor.resolve(workspaceIn(dir));
    assert.match(handle.base, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(handle.ownedByDeck, true);
    const tried = fs.readFileSync(path.join(dir, 'ports-tried'), 'utf-8').trim().split('\n');
    assert.equal(tried.length, 2, `expected one refusal and one success, got ${tried.join(', ')}`);
    assert.notEqual(tried[0], tried[1], 'the second attempt used the same port as the first');
  } finally {
    supervisor.stopAll();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a port that is refused every time is reported rather than retried forever', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sidecar-'));
  const supervisor = new SidecarSupervisor(stubInterpreter(dir, 99));
  try {
    await assert.rejects(
      () => supervisor.resolve(workspaceIn(dir)),
      /could not find a free port|Address already in use/,
    );
    const tried = fs.readFileSync(path.join(dir, 'ports-tried'), 'utf-8').trim().split('\n');
    assert.equal(tried.length, 4, `Deck should stop after four attempts, it made ${tried.length}`);
    assert.equal(new Set(tried).size, 4, 'every attempt used a different port');
  } finally {
    supervisor.stopAll();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a sidecar that fails for any other reason is reported at once', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sidecar-'));
  const file = path.join(dir, 'python-broken.mjs');
  fs.writeFileSync(
    file,
    "#!/usr/bin/env node\nimport fs from 'node:fs';\nfs.appendFileSync(" +
      JSON.stringify(path.join(dir, 'ports-tried')) +
      ", 'x\\n');\nprocess.stderr.write('ModuleNotFoundError: No module named project_os_cockpit\\n');\nprocess.exit(1);\n",
    { mode: 0o755 },
  );
  const supervisor = new SidecarSupervisor(file);
  try {
    await assert.rejects(() => supervisor.resolve(workspaceIn(dir)), /exited before it answered/);
    const tried = fs.readFileSync(path.join(dir, 'ports-tried'), 'utf-8').trim().split('\n');
    assert.equal(
      tried.length,
      1,
      'a python that cannot import the sidecar is not a port problem, so it is not retried',
    );
  } finally {
    supervisor.stopAll();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('what counts as the port being taken, read off what the sidecar printed', () => {
  assert.equal(isPortCollision(new Error('OSError: [Errno 48] Address already in use')), true);
  assert.equal(isPortCollision(new Error('listen EADDRINUSE: address already in use 127.0.0.1:8901')), true);
  assert.equal(isPortCollision(new Error('ModuleNotFoundError: No module named project_os_cockpit')), false);
  assert.equal(isPortCollision(new Error('the sidecar did not answer within 15s')), false);
});

test('a port already tried is not offered again', async () => {
  const first = await freePort(8900, 8999, '127.0.0.1');
  const second = await freePort(8900, 8999, '127.0.0.1', [first]);
  assert.notEqual(second, first);
  const third = await freePort(8900, 8999, '127.0.0.1', [first, second]);
  assert.ok(third !== first && third !== second, `${third} repeats a port already tried`);
});
