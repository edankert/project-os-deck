// TST-0081: HTTP handlers and command-line reads over the built modules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { Duplex } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { load, desktopRoot } from './helpers.mjs';
const { DeckHost } = load('main/host.js');
const { NoteIndex } = load('main/note-index.js');
const { OverviewService } = load('main/overview-service.js');
const { SHELL_CAPABILITIES, SERVED_CAPABILITIES } = load('shared/capability.js');

// Real Node HTTP messages over an in-memory stream. This exercises the same
// handler even in environments that prohibit listening on localhost.
async function request(host, url, { method = 'GET' } = {}) {
  const chunks = [];
  const socket = new Duplex({ read() {}, write(chunk, _encoding, done) { chunks.push(chunk); done(); } });
  const req = new http.IncomingMessage(socket);
  req.url = new URL(url).pathname; req.method = method;
  const res = new http.ServerResponse(req); res.assignSocket(socket);
  try {
    await host.handle(req, res);
    const raw = Buffer.concat(chunks).toString('utf8');
    const split = raw.indexOf('\r\n\r\n');
    const lines = raw.slice(0, split).split('\r\n');
    const status = Number(lines.shift().split(' ')[1]);
    const headers = lines.map((line) => { const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1).trim()]; });
    return new Response(raw.slice(split + 4), { status, headers });
  } finally { socket.destroy(); }
}

function repository(t) {
  const root = fs.mkdtempSync(path.join(desktopRoot, 'dist', 'overview-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'SNAPSHOT.yaml'), 'project:\n  name: Example\n');
  const phase = path.join(root, 'docs', 'PHASE-0001.md');
  fs.writeFileSync(phase, '---\nid: PHASE-0001\ntype: phase\nstatus: active\n---\n# One\n## Exit Criteria\n- [ ] Finish it');
  fs.writeFileSync(path.join(root, 'docs', 'TASK-0001.md'), '---\nid: TASK-0001\ntype: task\nstatus: done\nphase: "[[PHASE-0001]]"\n---\n# First ticket');
  return { root, phase, workspace: { id: 'aaaa1111', name: 'Example', root, kind: 'project-os' } };
}

for (const [name, capabilities] of [['desktop', SHELL_CAPABILITIES], ['served', SERVED_CAPABILITIES]]) {
  test(`${name} host serves an overview, reuses its revision and refuses writes`, async (t) => {
    const { root, phase, workspace } = repository(t);
    const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
    t.after(() => index.close());
    let reads = 0, heads = 0, calls = 0;
    const service = new OverviewService({ readFile: (f) => { reads++; return fs.readFileSync(f, 'utf8'); }, head: () => { heads++; return 'abc123'; }, now: () => '2026-10-14T12:00:00Z' });
    const host = new DeckHost({ webRoot: path.join(desktopRoot, 'dist', 'web'), capabilities,
      listWorkspaces: () => [workspace], sidecarBaseFor: () => null,
      overviewFor: (id) => { calls++; return id === workspace.id ? service.read(index.snapshot(), workspace) : null; } });
    t.after(() => host.close());
    const fetch = (url, options) => request(host, url, options);
    const url = `http://deck.invalid/deck/overview/${workspace.id}`;
    const building = await (await fetch(url)).json();
    assert.deepEqual(building, { workspaceId: workspace.id, revision: 0, building: true });
    assert.equal(reads, 0);
    index.build();
    const first = await fetch(url);
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type'), /application\/json/);
    const model = await first.json();
    assert.equal(model.building, false); assert.equal(model.revision, 1);
    assert.equal(model.head, 'abc123'); assert.equal(model.workspace, 'Example');
    assert.equal(model.phases[0].exit.items[0].ticked, false);
    assert.equal(model.phases[0].counts.task.closed, 1);
    assert.equal(reads, 2); assert.equal(heads, 1);
    assert.deepEqual(await (await fetch(url)).json(), model);
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal(reads, 2); assert.equal(heads, 1);
    fs.writeFileSync(phase, fs.readFileSync(phase, 'utf8').replace('[ ]', '[x]'));
    index.noticed('PHASE-0001.md'); index.settle();
    const changed = await (await fetch(url)).json();
    assert.equal(changed.revision, 2); assert.equal(changed.phases[0].exit.items[0].ticked, true);
    assert.equal(reads, 4); assert.equal(heads, 2);
    const before = calls;
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await fetch(url, { method });
      assert.equal(response.status, 405, method); assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
    assert.equal(calls, before, 'writes never reach the overview provider');
    for (const tail of ['unknown1', 'aaaa1111/extra', 'a', 'aaaa1111%2Fextra']) {
      assert.equal((await fetch(url.replace(workspace.id, tail))).status, 404, tail);
    }
  });
}

test('a host without an overview provider returns 404', async (t) => {
  const host = new DeckHost({ webRoot: path.join(desktopRoot, 'dist', 'web'), capabilities: SERVED_CAPABILITIES, listWorkspaces: () => [], sidecarBaseFor: () => null });
  t.after(() => host.close());
  assert.equal((await request(host, 'http://deck.invalid/deck/overview/aaaa1111')).status, 404);
});

test('removal and reopening cannot reuse a previous index at the same revision', (t) => {
  const { root, workspace } = repository(t);
  const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
  t.after(() => index.close()); index.build();
  let reads = 0;
  const service = new OverviewService({ readFile: (f) => { reads++; return fs.readFileSync(f, 'utf8'); }, head: () => '', now: () => '' });
  const one = service.read(index.snapshot(), workspace);
  assert.strictEqual(service.read(index.snapshot(), workspace), one);
  service.forget(workspace.id);
  assert.notStrictEqual(service.read(index.snapshot(), workspace), one);
  assert.equal(reads, 4);
});

test('CLI prints per-phase counts or JSON, and rejects invalid requests without a window', (t) => {
  const { root } = repository(t);
  const cli = path.join(desktopRoot, 'scripts', 'overview.mjs');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const json = run(root, '--json');
  assert.equal(json.status, 0, json.stderr);
  const model = JSON.parse(json.stdout);
  assert.equal(model.workspace, 'Example'); assert.equal(Object.keys(model.tickets).length, 1);
  assert.equal(model.phases[0].exit.items[0].text, 'Finish it');
  const print = run(root);
  assert.equal(print.status, 0, print.stderr);
  assert.match(print.stdout, /PHASE-0001 One \(open\): 1 tickets; closed=1/);
  assert.match(print.stdout, /Acceptance states use note status/);
  assert.equal(run().status, 2); assert.equal(run(root, '--invalid').status, 2);
  assert.equal(run(path.join(root, 'missing')).status, 1);
  assert.equal(run('--help').status, 0);
});

test('the overview route also answers over a localhost socket when permitted', async (t) => {
  const host = new DeckHost({ webRoot: '', capabilities: SERVED_CAPABILITIES, listWorkspaces: () => [], sidecarBaseFor: () => null,
    overviewFor: () => ({ workspaceId: 'aaaa1111', revision: 0, building: true }) });
  t.after(() => host.close());
  let port;
  try { ({ port } = await host.listen(0)); }
  catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') { t.skip(`Localhost listeners unavailable: ${error.code}`); return; }
    throw error;
  }
  const response = await fetch(`http://127.0.0.1:${port}/deck/overview/aaaa1111`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).building, true);
});
