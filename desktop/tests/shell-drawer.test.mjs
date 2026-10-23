// TST-0107 — plain shells in the drawer (FEAT-0035): several at once, in folders Deck names,
// every one ended when Deck quits. The node suites run on a fake pty and never load node-pty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { ShellManager, registerShellCalls, loginShell } = load('main/shells.js');

/** A fake pty: records what is written, resized and killed, and lets the test speak for the shell. */
function fakeFactory() {
  const made = [];
  let pid = 4000;
  const factory = (file, args, options) => {
    const data = [];
    const exit = [];
    const p = { file, args, options, pid: ++pid, written: [], sizes: [], killed: null, onData: (fn) => data.push(fn), onExit: (fn) => exit.push(fn), write: (d) => p.written.push(d), resize: (c, r) => p.sizes.push([c, r]), kill: (s) => { p.killed = s ?? 'SIGHUP'; }, say: (d) => data.forEach((f) => f(d)), end: (code) => exit.forEach((f) => f({ exitCode: code })) };
    made.push(p);
    return p;
  };
  return { factory, made };
}

// --- TASK-0205: shells in the main process ---

test('a shell is the person\'s login shell in the folder named, its output streamed and its input written', () => {
  const { factory, made } = fakeFactory();
  // /bin/sh, which every machine has: a $SHELL that is not there is passed over, and CI's Linux has no zsh.
  const m = new ShellManager(factory, { SHELL: '/bin/sh', HOME: '/h', COCKPIT_SECRET_THING: 'x', CLAUDE_CODE_PLUGIN_DIRS: '/p', PATH: '/bin' });
  const events = [];
  m.onEvent((e) => events.push(e));
  const s = m.open('/repo/project', { cols: 120, rows: 40 });
  assert.deepEqual([s.id, s.title, s.folder, s.session, s.exited], ['shell-1', 'project', '/repo/project', null, false]);
  const p = made[0];
  assert.deepEqual([p.file, p.args, p.options.cwd, p.options.cols, p.options.rows, p.options.env.TERM], ['/bin/sh', ['-l'], '/repo/project', 120, 40, 'xterm-256color']);
  assert.ok(!('COCKPIT_SECRET_THING' in p.options.env) && !('CLAUDE_CODE_PLUGIN_DIRS' in p.options.env), 'the cockpit\'s variables stay out of a plain shell');
  p.say('hello\r\n');
  assert.deepEqual(events, [{ kind: 'data', id: 'shell-1', data: 'hello\r\n' }]);
  assert.equal(m.write('shell-1', 'ls\r'), true);
  assert.deepEqual(p.written, ['ls\r']);
  assert.equal(m.resize('shell-1', 90, 20), true);
  assert.equal(m.resize('shell-1', 99999, 0), true);
  assert.deepEqual(p.sizes, [[90, 20], [500, 5]], 'a size is kept within reason');
});

test('several shells run at once, each closes on its own, an ended one says so, and quitting ends every one', () => {
  const { factory, made } = fakeFactory();
  const m = new ShellManager(factory, { SHELL: '/bin/bash' });
  const events = [];
  m.onEvent((e) => events.push(e));
  m.open('/a');
  m.open('/b', { session: 'sess-1' });
  m.open('/c');
  assert.deepEqual(m.list().map((s) => [s.id, s.folder, s.session]), [['shell-1', '/a', null], ['shell-2', '/b', 'sess-1'], ['shell-3', '/c', null]]);
  assert.equal(m.close('shell-2'), true);
  assert.equal(made[1].killed, 'SIGHUP');
  assert.deepEqual(m.list().map((s) => s.id), ['shell-1', 'shell-3']);
  made[0].end(0);
  assert.deepEqual(events.at(-1), { kind: 'exit', id: 'shell-1', code: 0 });
  assert.equal(m.list()[0].exited, true);
  assert.equal(m.write('shell-1', 'x'), false, 'nothing is written to a shell that ended');
  m.closeAll();
  assert.equal(m.list().length, 0);
  assert.equal(made[2].killed, 'SIGHUP');
  assert.equal(made[0].killed, null, 'a shell that already ended is not signalled');
});

test('where node-pty did not install, shells are off and opening one says why', () => {
  const m = new ShellManager(null);
  assert.equal(m.available, false);
  assert.throws(() => m.open('/a'), /node-pty is not installed/);
  assert.equal(loginShell({ SHELL: '/usr/bin/fish' }, (f) => f === '/usr/bin/fish'), '/usr/bin/fish', 'the person\'s own shell when it is there');
  assert.equal(loginShell({}, (f) => f === '/bin/bash' || f === '/bin/sh'), '/bin/bash', 'else the first this machine has, never a shell it lacks');
  assert.equal(loginShell({ SHELL: '/no/such' }, (f) => f === '/bin/sh'), '/bin/sh');
});

test('the calls open a shell only in a folder Deck knows, named by id, and check every argument', async () => {
  const { factory, made } = fakeFactory();
  const m = new ShellManager(factory, { SHELL: '/bin/zsh' });
  const calls = new Map();
  registerShellCalls((ch, fn) => calls.set(ch, fn), m, { workspace: (id) => (id === 'w1' ? '/repo' : null), session: (id) => (id === 's1' ? '/repo-worktrees/task-1-s1' : null) });
  assert.deepEqual([...calls.keys()].sort(), ['deck:shells:close', 'deck:shells:list', 'deck:shells:open', 'deck:shells:resize', 'deck:shells:write']);
  assert.equal((await calls.get('deck:shells:open')({}, { workspaceId: 'w1' }, 80, 24)).shell.folder, '/repo');
  const forSession = await calls.get('deck:shells:open')({}, { sessionId: 's1' }, 80, 24);
  assert.deepEqual([forSession.shell.folder, forSession.shell.session], ['/repo-worktrees/task-1-s1', 's1']);
  assert.match((await calls.get('deck:shells:open')({}, { workspaceId: 'nope' })).error, /Deck knows/);
  assert.match((await calls.get('deck:shells:open')({}, { folder: '/etc' })).error, /Deck knows/, 'a path from the window is never used');
  assert.equal(made.length, 2);
  assert.deepEqual(await calls.get('deck:shells:write')({}, 'shell-1', 'echo hi\r'), { ok: true });
  assert.deepEqual(await calls.get('deck:shells:write')({}, '../shell-1', 'x'), { ok: false });
  assert.deepEqual(await calls.get('deck:shells:write')({}, 'shell-1', 'x'.repeat(70_000)), { ok: false });
  assert.deepEqual(await calls.get('deck:shells:close')({}, 'shell-2'), { ok: true });
  assert.deepEqual((await calls.get('deck:shells:list')({})).shells.map((s) => s.id), ['shell-1']);
});

test('the shell has the shells capability and a served page does not', () => {
  const { SHELL_CAPABILITIES, SERVED_CAPABILITIES, normaliseCapabilities } = load('shared/capability.js');
  assert.deepEqual([SHELL_CAPABILITIES.shells, SERVED_CAPABILITIES.shells, normaliseCapabilities({}).shells], [true, false, false]);
});

// --- TASK-0206: the drawer's tabs ---

import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';
const { NO_TABS, tabsAfter, tabWords } = load('shared/shell-tabs.js');
const tab = (id, over = {}) => ({ id, title: id.replace('shell-', 'f'), folder: `/f/${id}`, session: null, exited: false, ...over });

test('a new shell is shown at once; closing the shown one shows its neighbour; switching shows another', () => {
  let s = NO_TABS;
  for (const id of ['shell-1', 'shell-2', 'shell-3']) s = tabsAfter(s, { kind: 'opened', tab: tab(id) });
  assert.deepEqual([s.tabs.map((t) => t.id), s.active], [['shell-1', 'shell-2', 'shell-3'], 'shell-3']);
  s = tabsAfter(s, { kind: 'shown', id: 'shell-2' });
  assert.equal(s.active, 'shell-2');
  s = tabsAfter(s, { kind: 'closed', id: 'shell-2' });
  assert.deepEqual([s.tabs.map((t) => t.id), s.active], [['shell-1', 'shell-3'], 'shell-3'], 'the one after it');
  s = tabsAfter(s, { kind: 'closed', id: 'shell-3' });
  assert.equal(s.active, 'shell-1', 'the one before it, when it was last');
  s = tabsAfter(s, { kind: 'closed', id: 'shell-1' });
  assert.deepEqual(s, { tabs: [], active: null });
  assert.equal(tabsAfter(s, { kind: 'shown', id: 'shell-9' }), s, 'a tab that is not there is not shown');
});

test('closing a tab that is not shown keeps the shown one; an ended shell says so on its tab', () => {
  let s = NO_TABS;
  for (const id of ['shell-1', 'shell-2']) s = tabsAfter(s, { kind: 'opened', tab: tab(id) });
  s = tabsAfter(s, { kind: 'closed', id: 'shell-1' });
  assert.equal(s.active, 'shell-2');
  s = tabsAfter(s, { kind: 'exited', id: 'shell-2' });
  assert.equal(tabWords(s.tabs[0]), 'f2 (ended)');
  assert.equal(tabWords(tab('shell-4', { title: 'project-worktrees', session: 'abcdef1234' })), 'project-worktrees · abcdef12');
});

test('the drawer\'s button starts hidden, the terminal frame keeps its own policy, and Deck\'s page keeps its own', () => {
  const page = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'index.html'), 'utf8');
  assert.doesNotMatch(page, /shells-toggle/, 'not in the header, whose switcher wraps when it runs out of width (TASK-0212)');
  const renderer = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'renderer.ts'), 'utf8');
  assert.match(renderer, /if \(shellBridge !== null\) \{\n\s+shellsButton = document\.createElement\('button'\);/, 'made only when the host gives shells');
  assert.match(renderer, /if \(shellsButton !== null\) el\.rail\.appendChild\(shellsButton\);/, 'and kept at the rail\'s foot when the rail is drawn again');
  assert.match(page, /style-src 'self';/, 'Deck\'s page still allows no inline style');
  const frame = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'terminal.html'), 'utf8');
  assert.match(frame, /style-src 'self' 'unsafe-inline'/);
  assert.match(frame, /connect-src 'none'/, 'the frame reaches nothing; the drawer reaches the shell');
  assert.match(frame, /script-src 'self';/);
  for (const f of ['vendor/xterm.js', 'vendor/xterm.css', 'vendor/addon-fit.js', 'terminal.html', 'renderer/terminal-frame.js']) assert.ok(fs.existsSync(path.join(desktopRoot, 'dist', 'web', f)), f);
});

// --- TASK-0211: the review's round one ---

import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { El, loadWeb, standInPage } from './stand-in-page.mjs';
const { keepRecent, loadPty, WRITE_MAX } = load('main/shells.js');
const { piecesOf } = load('shared/shell-tabs.js');

test('Deck keeps each shell\'s latest output, cut at a line, and gives it to a window that asks', async () => {
  assert.equal(keepRecent('ab\n', 'cd', 10), 'ab\ncd');
  assert.equal(keepRecent('line one\nline two\n', 'three', 12), 'three', 'cut at the start of a line');
  assert.equal(keepRecent('', 'x'.repeat(30), 10), 'x'.repeat(10), 'with no line near, cut where it falls');
  const { factory, made } = fakeFactory();
  const m = new ShellManager(factory, { SHELL: '/bin/zsh' });
  const calls = new Map();
  registerShellCalls((ch, fn) => calls.set(ch, fn), m, { workspace: () => '/repo', session: () => null });
  await calls.get('deck:shells:open')({}, { workspaceId: 'w' }, 80, 24);
  made[0].say('first\r\n');
  made[0].say('$ ');
  assert.deepEqual(await calls.get('deck:shells:list')({}, true), { available: true, shells: m.list(), recent: { 'shell-1': 'first\r\n$ ' } });
  assert.equal('recent' in (await calls.get('deck:shells:list')({})), false, 'only when asked');
});

test('a paste larger than one write is sent in pieces that join back to it, never splitting a character', () => {
  const text = `${'a'.repeat(9)}😀${'b'.repeat(20)}`;
  const pieces = piecesOf(text, 10);
  assert.equal(pieces.join(''), text);
  assert.ok(pieces.every((p) => p.length <= 10));
  assert.equal(pieces[0], 'a'.repeat(9), 'the emoji is not cut in two');
  assert.deepEqual(piecesOf('', 10), []);
  const big = 'y'.repeat(WRITE_MAX * 2 + 5);
  assert.equal(piecesOf(big, 16_384).join(''), big);
});

/** A drawer on a stand-in page, with a fake bridge; frames answer with what is posted to them. */
async function drawerOn(running) {
  const document = standInPage();
  document.body = new El('body');
  const listeners = {};
  globalThis.window = { addEventListener: (t, fn) => { listeners[t] = fn; }, dispatchEvent: () => true, innerHeight: 900 };
  globalThis.location = { origin: 'file://' };
  globalThis.Event = class { constructor(type) { this.type = type; } };
  const written = [];
  let tell = () => undefined;
  const shells = {
    list: async (recent) => ({ available: true, shells: running.map((r) => r.shell), ...(recent ? { recent: Object.fromEntries(running.map((r) => [r.shell.id, r.recent])) } : {}) }),
    open: async () => ({ ok: false }), write: async (id, data) => { written.push([id, data]); return { ok: true }; },
    resize: async () => ({ ok: true }), close: async () => ({ ok: true }), subscribe: (fn) => { tell = fn; return () => undefined; },
  };
  const { ShellDrawer } = await loadWeb('renderer/shell-drawer.js');
  const d = new ShellDrawer({ shells, workspaceId: () => 'w', say: () => undefined }, null);
  await new Promise((r) => setTimeout(r, 0));
  const posted = new Map();
  for (const [id, f] of d.frames) { posted.set(id, []); f.frame.contentWindow = { postMessage: (m) => posted.get(id).push(m) }; }
  const frameSays = (id, data) => listeners.message({ origin: 'file://', source: d.frames.get(id).frame.contentWindow, data });
  return { d, posted, written, frameSays, tell: (e) => tell(e) };
}

test('a window that loads while shells run draws a tab for each, with what each printed last, and an end that came early is said once its frame is ready', async () => {
  const t = await drawerOn([
    { shell: { id: 'shell-1', title: 'repo', folder: '/repo', session: null, exited: false }, recent: 'earlier output\r\n$ ' },
    { shell: { id: 'shell-2', title: 'repo', folder: '/repo', session: null, exited: false }, recent: '' },
  ]);
  assert.deepEqual(t.d.tabs.tabs.map((x) => x.id), ['shell-1', 'shell-2']);
  t.tell({ kind: 'data', id: 'shell-2', data: 'bye\r\n' });
  t.tell({ kind: 'exit', id: 'shell-2', code: 3 });
  assert.equal(t.d.tabs.tabs[1].exited, true);
  assert.deepEqual(t.posted.get('shell-2'), [], 'nothing is posted to a frame that is not ready');
  t.frameSays('shell-1', { kind: 'ready', cols: 80, rows: 24 });
  t.frameSays('shell-2', { kind: 'ready', cols: 80, rows: 24 });
  assert.deepEqual(t.posted.get('shell-1')[0], { kind: 'data', data: 'earlier output\r\n$ ' });
  assert.deepEqual(t.posted.get('shell-2').filter((m) => m.kind !== 'focus'), [{ kind: 'data', data: 'bye\r\n' }, { kind: 'ended', code: 3 }], 'the output first, then the end');
});

test('a paste of 40,000 characters reaches the shell whole, in pieces, in order', async () => {
  const t = await drawerOn([{ shell: { id: 'shell-1', title: 'repo', folder: '/repo', session: null, exited: false }, recent: '' }]);
  const paste = Array.from({ length: 40_000 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
  t.frameSays('shell-1', { kind: 'input', data: paste });
  assert.ok(t.written.length >= 3);
  assert.ok(t.written.every(([id, data]) => id === 'shell-1' && data.length <= WRITE_MAX));
  assert.equal(t.written.map(([, data]) => data).join(''), paste);
});

test('the renderer reaches shells only when the host has the shells capability', async () => {
  const { Host } = await import(pathToFileURL(path.join(desktopRoot, 'dist', 'web', 'renderer', 'host-bridge.js')));
  const { SHELL_CAPABILITIES, SERVED_CAPABILITIES } = load('shared/capability.js');
  const saved = globalThis.deck;
  try {
    for (const [caps, reach] of [[SHELL_CAPABILITIES, true], [SERVED_CAPABILITIES, false], [{ ...SHELL_CAPABILITIES, shells: false }, false]]) {
      globalThis.deck = { capabilities: async () => caps, state: { subscribe: () => () => {} }, shells: { list: async () => ({}) } };
      const host = new Host();
      await host.start();
      assert.equal(host.shells() !== null, reach, JSON.stringify(caps));
    }
  } finally {
    if (saved === undefined) delete globalThis.deck; else globalThis.deck = saved;
  }
});

test('Deck\'s quit ends every shell: shutdown calls closeAll', () => {
  const main = fs.readFileSync(path.join(desktopRoot, 'src', 'main', 'main.ts'), 'utf8');
  const body = main.slice(main.indexOf('function shutdown(): void {'));
  const end = body.indexOf('\n}\n');
  assert.ok(end > 0);
  assert.match(body.slice(0, end), /^\s*shells\.closeAll\(\);/m, 'in the one function every quit path reaches');
  assert.match(main, /app\.on\('will-quit', shutdown\)/);
  assert.match(main, /for \(const signal of \['SIGINT', 'SIGTERM'\] as const\)/);
});

const pty = loadPty();
test('real shells and a job started in one are gone after closeAll', { skip: pty === null ? 'node-pty is not installed here' : false }, async () => {
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-pty-')));
  // Every pty this check makes is killed at its end whatever happens: a closeAll that did nothing would
  // otherwise leave live shells holding the suite open, so it hung instead of failing (TASK-0211's mutations).
  const made = [];
  const m = new ShellManager((...a) => { const p = pty(...a); made.push(p); return p; }, { ...process.env, SHELL: fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh' });
  let job = 0;
  try {
  const out = new Map();
  m.onEvent((e) => { if (e.kind === 'data') out.set(e.id, (out.get(e.id) ?? '') + e.data); });
  const a = m.open(folder);
  const b = m.open(folder);
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const until = async (fn, what) => { for (let i = 0; i < 200; i += 1) { if (fn()) return; await new Promise((r) => setTimeout(r, 50)); } assert.fail(what); };
  // A job in the background of one shell, its pid printed between markers the typed line itself does not contain.
  m.write(a.id, 'sleep 4242 & echo "J""OB=$!="\r');
  await until(() => /JOB=(\d+)=/.test(out.get(a.id) ?? ''), `the job's pid: ${JSON.stringify(out.get(a.id))}`);
  job = Number(/JOB=(\d+)=/.exec(out.get(a.id))[1]);
  m.write(b.id, 'echo "P""ID=$$="\r');
  await until(() => /PID=(\d+)=/.test(out.get(b.id) ?? ''), 'the second shell answers');
  const shells = [Number(/PID=(\d+)=/.exec(out.get(b.id))[1])];
  assert.ok(alive(job) && shells.every(alive), 'running before');
  m.closeAll();
  await until(() => !alive(job) && !shells.some(alive), 'the shells and the job end');
  assert.equal(m.list().length, 0);
  } finally {
    for (const p of made) try { p.kill('SIGKILL'); } catch { /* already gone */ }
    if (job > 0) try { process.kill(job, 'SIGKILL'); } catch { /* already gone */ }
  }
});

test('a window already open picks up a shell another window opened, the first time it hears of it', async () => {
  const running = [];
  const t = await drawerOn(running);
  assert.deepEqual(t.d.tabs.tabs, []);
  running.push({ shell: { id: 'shell-7', title: 'repo', folder: '/repo', session: null, exited: false }, recent: 'made elsewhere\r\n' });
  t.tell({ kind: 'data', id: 'shell-7', data: 'made elsewhere\r\n' });
  t.tell({ kind: 'data', id: 'shell-7', data: 'more' });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(t.d.tabs.tabs.map((x) => x.id), ['shell-7'], 'one tab, though two events named it');
  assert.deepEqual(t.d.frames.get('shell-7').waiting, ['made elsewhere\r\n']);
});
