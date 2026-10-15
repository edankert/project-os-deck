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
    const service = new OverviewService({ readFile: (f) => { if (f.endsWith('.md')) reads++; return fs.readFileSync(f, 'utf8'); }, head: () => { heads++; return 'abc123'; }, now: () => '2026-10-14T12:00:00Z' });
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
  const service = new OverviewService({ readFile: (f) => { if (f.endsWith('.md')) reads++; return fs.readFileSync(f, 'utf8'); }, head: () => '', now: () => '' });
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
  assert.match(print.stdout, /Acceptance states use recorded platform results/);
  assert.equal(run().status, 2); assert.equal(run(root, '--invalid').status, 2);
  assert.equal(run(path.join(root, 'missing')).status, 1);
  assert.equal(run('--help').status, 0);
});

test('the overview route also answers over a localhost socket', async (t) => {
  const host = new DeckHost({ webRoot: '', capabilities: SERVED_CAPABILITIES, listWorkspaces: () => [], sidecarBaseFor: () => null,
    overviewFor: () => ({ workspaceId: 'aaaa1111', revision: 0, building: true }) });
  t.after(() => host.close());
  const { port } = await host.listen(0);
  const response = await fetch(`http://127.0.0.1:${port}/deck/overview/aaaa1111`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).building, true);
});


function acceptanceNote(root, id, status = 'active') {
  fs.writeFileSync(path.join(root, 'docs', `${id}.md`), `---\nid: ${id}\ntype: test\nlevel: acceptance\nstatus: ${status}\n---\n# ${id}`);
}
function ledgerFile(root, name, data) {
  const dir = path.join(root, 'docs', 'releases', 'ledgers');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test('the service and CLI read the recorded Deck ledger instead of note statuses', (t) => {
  const { root, workspace } = repository(t);
  for (const n of [8, 9, 10, 11, 12, 13, 15, 16]) acceptanceNote(root, `TST-${String(n).padStart(4, '0')}`);
  const recorded = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures/overview/ledger/WORKING-app.json'), 'utf8'));
  ledgerFile(root, 'WORKING-app.json', recorded);
  const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
  t.after(() => index.close()); index.build();
  const service = new OverviewService();
  const live = service.read(index.snapshot(), workspace);
  const command = spawnSync(process.execPath, [path.join(desktopRoot, 'scripts/overview.mjs'), root, '--json'], { encoding: 'utf8' });
  assert.equal(command.status, 0, command.stderr);
  for (const model of [live, JSON.parse(command.stdout)]) {
    for (const n of [8, 9, 12, 13]) assert.equal(model.tickets[`TST-${String(n).padStart(4, '0')}`].state, 'closed');
    for (const n of [10, 11]) assert.equal(model.tickets[`TST-${String(n).padStart(4, '0')}`].state, 'owed');
    for (const n of [15, 16]) assert.equal(model.tickets[`TST-${String(n).padStart(4, '0')}`].state, 'open');
  }
});

test('ledger edits, additions and removals refresh the cached overview without an index revision', (t) => {
  const { root, workspace } = repository(t);
  acceptanceNote(root, 'TST-0001');
  const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
  t.after(() => index.close()); index.build();
  const snapshot = index.snapshot(), service = new OverviewService();
  const read = () => service.read(snapshot, workspace);
  const before = read(); assert.equal(before.tickets['TST-0001'].state, 'open');
  const event = { check: 'TST-0001', result: 'pass', date: '2026-10-01' };
  const file = ledgerFile(root, 'WORKING-app.json', { platform: 'app', entries: [event] });
  const passed = read(); assert.equal(passed.tickets['TST-0001'].state, 'closed');
  assert.strictEqual(read(), passed);
  ledgerFile(root, 'WORKING-app.json', { platform: 'app', entries: [event, { check: event.check, invalidated_by: 'TASK-0140', date: '2026-10-02' }] });
  assert.equal(read().tickets['TST-0001'].state, 'owed');
  ledgerFile(root, 'WORKING-app.json', { platform: 'app', entries: [{ ...event, result: 'fail' }] });
  assert.equal(read().tickets['TST-0001'].state, 'failed');
  fs.unlinkSync(file);
  assert.equal(read().tickets['TST-0001'].state, 'open');
  assert.equal(read().revision, before.revision);
});

test('all ledger platforms count, including one with no result, and retesting clears a withdrawal', (t) => {
  const { root, workspace } = repository(t);
  acceptanceNote(root, 'TST-0001');
  const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
  t.after(() => index.close()); index.build();
  const service = new OverviewService(), read = () => service.read(index.snapshot(), workspace).tickets['TST-0001'].state;
  const pass = { check: 'TST-0001', result: 'pass', date: '2026-10-01' };
  ledgerFile(root, 'WORKING-android.json', { platform: 'android', entries: [pass] });
  const ios = (entries) => ledgerFile(root, 'WORKING-ios.json', { platform: 'ios', entries });
  ios([]); assert.equal(read(), 'open');
  ios([{ ...pass, result: 'excused' }]); assert.equal(read(), 'closed');
  ios([{ ...pass, result: 'fail' }]); assert.equal(read(), 'failed');
  const withdrawn = { check: pass.check, invalidated_by: 'TASK-0140', date: '2026-10-02' };
  ios([pass, withdrawn]); assert.equal(read(), 'owed');
  ios([pass, withdrawn, { ...pass, date: '2026-10-03' }]); assert.equal(read(), 'closed');
});

test('ledger resolution respects seals, dates, same-day file order and the old mark field', (t) => {
  const { root } = repository(t);
  const { readAcceptanceLedger } = load('main/overview-ledger.js');
  const entry = (check, result, date = '2026-09-01') => ({ check, result, date });
  ledgerFile(root, 'REL-0002-app.json', { platform: 'app', sealed: '2026-09-02', entries: [
    { check: 'TST-0001', mark: 'pass', date: '2026-09-01' }, entry('TST-0002', 'pass'), entry('TST-0003', 'fail'),
  ] });
  // Sealing, not the release id or filename, determines resolution order and expiry.
  ledgerFile(root, 'REL-0001-app.json', { platform: 'app', sealed: '2026-09-03', entries: [
    entry('TST-0001', 'excused'), entry('TST-0004', 'excused'),
    { check: 'TST-0002', invalidated_by: 'TASK-0140', date: '2026-09-02' },
  ] });
  ledgerFile(root, 'WORKING-app.json', { platform: 'app', entries: [
    entry('TST-0005', 'pass', '2026-09-05'), entry('TST-0005', 'fail', '2026-09-04'),
    entry('TST-0006', 'fail'), entry('TST-0006', 'pass'),
    entry('TST-0007', 'pass'), entry('TST-0007', 'fail'), entry('TST-0008', 'partial'),
    entry('TST-0009', 'na'),
  ] });
  const results = readAcceptanceLedger(path.join(root, 'docs')).results;
  assert.deepEqual({ ...results }, {
    'TST-0001': ['pass'], 'TST-0002': ['withdrawn'], 'TST-0003': ['not-run'], 'TST-0004': ['not-run'],
    'TST-0005': ['pass'], 'TST-0006': ['pass'], 'TST-0007': ['fail'], 'TST-0008': ['partial'], 'TST-0009': ['na'],
  });
});

test('an unreadable or malformed ledger cannot silently erase its verdicts', (t) => {
  const { root } = repository(t);
  const { readAcceptanceLedger } = load('main/overview-ledger.js');
  const read = () => readAcceptanceLedger(path.join(root, 'docs'));
  const valid = { platform: 'app', entries: [{ check: 'TST-0001', result: 'pass', date: '2026-10-14' }] };
  const file = ledgerFile(root, 'WORKING-app.json', valid);
  for (const data of [{ ...valid, platform: 'ios' }, { ...valid, entries: [{ ...valid.entries[0], date: '2026-02-30' }] },
    { ...valid, entries: [{ ...valid.entries[0], result: 'invented' }] }, { ...valid, entries: null }]) {
    fs.writeFileSync(file, JSON.stringify(data)); assert.throws(read, /Acceptance ledger/);
  }
  fs.writeFileSync(file, '{'); assert.throws(read, SyntaxError);
  fs.unlinkSync(file);
  ledgerFile(root, 'app.json', valid); assert.throws(read, /filename/);
});

test('fixture provenance detects staged, unstaged and untracked notes but ignores build files', (t) => {
  const { root } = repository(t);
  const { repositoryDirty } = load('main/overview-service.js');
  const git = (...args) => {
    const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  git('init', '--quiet'); git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'Fixture');
  assert.equal(repositoryDirty(root), false);
  fs.writeFileSync(path.join(root, 'build.js'), '// build output');
  assert.equal(repositoryDirty(root), false);
  acceptanceNote(root, 'TST-0001'); assert.equal(repositoryDirty(root), true);
  git('add', 'docs/TST-0001.md'); assert.equal(repositoryDirty(root), true);
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'Note');
  assert.equal(repositoryDirty(root), false);
  fs.appendFileSync(path.join(root, 'docs', 'TST-0001.md'), '\nChanged');
  const cli = spawnSync(process.execPath, [path.join(desktopRoot, 'scripts/overview.mjs'), root, '--json'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  const model = JSON.parse(cli.stdout);
  assert.equal(model.head, git('rev-parse', 'HEAD')); assert.equal(model.dirty, true);
});

test('manual verification refreshes on a calendar day or snapshot threshold change without a note revision', (t) => {
  const { root, workspace } = repository(t);
  fs.writeFileSync(path.join(root, 'docs/TST-0001.md'), '---\nid: TST-0001\ntype: test\nstatus: passing\nlast_verified: 2026-07-17\n---\n# Manual check');
  const index = new NoteIndex({ workspaceId: workspace.id, docsRoot: path.join(root, 'docs') });
  t.after(() => index.close()); index.build();
  let now = '2026-10-15T12:00:00Z';
  const service = new OverviewService({ readFile: (f) => fs.readFileSync(f, 'utf8'), head: () => '', now: () => now });
  const snapshot = index.snapshot();
  assert.equal(service.read(snapshot, workspace).tickets['TST-0001'].fill, 'delivered');
  now = '2026-10-16T12:00:00Z';
  assert.equal(service.read(snapshot, workspace).tickets['TST-0001'].fill, 'unproven');
  fs.writeFileSync(path.join(root, 'SNAPSHOT.yaml'), 'verification:\n  staleness_days: 91\n');
  assert.equal(service.read(snapshot, workspace).tickets['TST-0001'].fill, 'delivered');
});
