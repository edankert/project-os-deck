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
  const m = new ShellManager(factory, { SHELL: '/bin/zsh', HOME: '/h', COCKPIT_SECRET_THING: 'x', CLAUDE_CODE_PLUGIN_DIRS: '/p', PATH: '/bin' });
  const events = [];
  m.onEvent((e) => events.push(e));
  const s = m.open('/repo/project', { cols: 120, rows: 40 });
  assert.deepEqual([s.id, s.title, s.folder, s.session, s.exited], ['shell-1', 'project', '/repo/project', null, false]);
  const p = made[0];
  assert.deepEqual([p.file, p.args, p.options.cwd, p.options.cols, p.options.rows, p.options.env.TERM], ['/bin/zsh', ['-l'], '/repo/project', 120, 40, 'xterm-256color']);
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
  assert.match(page, /id="shells-toggle" hidden/);
  assert.match(page, /style-src 'self';/, 'Deck\'s page still allows no inline style');
  const frame = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'terminal.html'), 'utf8');
  assert.match(frame, /style-src 'self' 'unsafe-inline'/);
  assert.match(frame, /connect-src 'none'/, 'the frame reaches nothing; the drawer reaches the shell');
  assert.match(frame, /script-src 'self';/);
  for (const f of ['vendor/xterm.js', 'vendor/xterm.css', 'vendor/addon-fit.js', 'terminal.html', 'renderer/terminal-frame.js']) assert.ok(fs.existsSync(path.join(desktopRoot, 'dist', 'web', f)), f);
});
