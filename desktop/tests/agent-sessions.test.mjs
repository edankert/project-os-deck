// TST-0104 — Deck's own Claude and Codex sessions (FEAT-0032): one conversation model,
// a provider interface, and sessions that always ask before acting. Every check runs on
// a fake provider; no suite reaches a real model (RISK-0017).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
import { fakeProvider } from './fake-agent.mjs';

const { latest, turnsOf, openRequests } = load('shared/agent-types.js');
const { AgentSession } = load('main/agents/session.js');

let clock = 0;
const now = () => new Date(Date.UTC(2026, 9, 22, 13, 0, clock++)).toISOString();
const record = (over = {}) => ({
  id: 'deck-1', agent: 'claude', providerId: null, workspaceId: 'ws1', ticket: 'TASK-0001', folder: '/tmp/ws', place: 'checkout',
  model: 'claude-opus-5-5', effort: 'high', access: 'ask', created: '2026-10-22T13:00:00.000Z', lastActive: '2026-10-22T13:00:00.000Z', state: 'idle', ...over,
});
const until = async (cond) => { for (let i = 0; i < 200 && !cond(); i += 1) await new Promise((r) => setTimeout(r, 2)); assert.ok(cond(), 'waited too long'); };

// --- TASK-0191: the conversation model and the provider interface ---

const SCRIPT = [
  [{ text: 'Reading the ticket.' }, { tool: 'Read', summary: 'docs/tasks/TASK-0001.md' }, { plan: [['Read the ticket', true], ['Change the code', false]] }, { ask: 'Edit', summary: 'src/app.ts' }, { edit: 'src/app.ts', added: 3, removed: 1 }, { text: 'Done with the first part.' }],
  [{ ask: 'Bash', summary: 'rm -rf build' }, { text: 'Never reached.' }],
];

test('a session produces every kind of record, in order, and asks before it acts', async () => {
  const provider = fakeProvider('claude', SCRIPT);
  const s = new AgentSession(record(), provider, now);
  const states = [];
  s.onChange((c) => { if (c.kind === 'session') states.push(c.session.state); });
  await s.start('Work on TASK-0001: an invented ticket.');
  await until(() => openRequests(s.records).length === 1);
  // The permission request blocks the agent: nothing after it has happened yet.
  assert.equal(s.record.state, 'waiting');
  assert.ok(!s.records.some((r) => r.kind === 'edit'), 'the edit waits for the answer');
  const ask = openRequests(s.records)[0];
  assert.deepEqual([ask.tool, ask.summary], ['Edit', 'src/app.ts']);
  assert.equal(s.answer(ask.id, { allow: true }), true);
  await until(() => s.record.state === 'idle');
  const kinds = latest(s.records).map((r) => r.kind);
  for (const k of ['prompt', 'text', 'tool', 'plan', 'permission', 'edit', 'state']) assert.ok(kinds.includes(k), k);
  assert.deepEqual(kinds.filter((k) => k !== 'state'), ['prompt', 'text', 'tool', 'plan', 'permission', 'tool', 'edit', 'text']);
  assert.equal(latest(s.records).find((r) => r.kind === 'permission').outcome, 'approved');
  assert.equal(s.record.providerId, 'fake-session-1', 'the agent said who it is, which Resume needs');
  // Working, waiting for you, working again once answered, then idle.
  assert.deepEqual(states.filter((x, i) => x !== states[i - 1]).filter((x) => x !== undefined), ['working', 'waiting', 'working', 'idle']);
});

test('a denied request reaches the agent, and the agent goes no further', async () => {
  const s = new AgentSession(record(), fakeProvider('codex', SCRIPT), now);
  await s.start('First, an invented prompt.');
  await until(() => openRequests(s.records).length === 1);
  s.answer(openRequests(s.records)[0].id, { allow: true });
  await until(() => s.record.state === 'idle');
  const second = s.send('Second, also invented.');
  await until(() => openRequests(s.records).length === 1);
  assert.equal(openRequests(s.records)[0].summary, 'rm -rf build');
  s.answer(openRequests(s.records)[0].id, { allow: false, message: 'not now' });
  await second;
  await until(() => s.record.state === 'idle');
  const last = turnsOf(s.records).at(-1);
  assert.equal(last.prompt, 'Second, also invented.');
  const denied = last.records.find((r) => r.kind === 'permission');
  assert.deepEqual([denied.outcome, denied.message], ['denied', 'not now']);
  assert.ok(last.records.some((r) => r.kind === 'text' && r.text === 'Not allowed: not now.'));
  assert.ok(!last.records.some((r) => r.kind === 'text' && r.text === 'Never reached.'));
});

test('stopping a session denies what it was waiting for, so the agent is never left waiting on nobody', async () => {
  const s = new AgentSession(record(), fakeProvider('claude', SCRIPT), now);
  await s.start('An invented prompt.');
  await until(() => openRequests(s.records).length === 1);
  await s.stop();
  assert.equal(s.record.state, 'stopped');
  assert.equal(openRequests(s.records).length, 0);
  assert.equal(latest(s.records).find((r) => r.kind === 'permission').outcome, 'denied');
  assert.equal(s.answer('nothing-waits-here', { allow: true }), false, 'an answer to nothing is refused');
});

test('turns group what the agent did under the prompt it answered, each tool at its latest outcome', () => {
  const at = '2026-10-22T13:00:00.000Z';
  const rs = [
    { kind: 'state', at, state: 'working' },
    { kind: 'prompt', at, text: 'one' },
    { kind: 'tool', at, id: 't1', name: 'Bash', summary: 'ls', outcome: 'running' },
    { kind: 'permission', at, id: 'p1', tool: 'Bash', summary: 'ls', outcome: 'open' },
    { kind: 'tool', at, id: 't1', name: 'Bash', summary: 'ls', outcome: 'done' },
    { kind: 'permission', at, id: 'p1', tool: 'Bash', summary: 'ls', outcome: 'approved' },
    { kind: 'prompt', at, text: 'two' },
    { kind: 'text', at, text: 'ok' },
  ];
  const turns = turnsOf(rs);
  assert.deepEqual(turns.map((t) => t.prompt), [null, 'one', 'two']);
  assert.deepEqual(turns[1].records.map((r) => `${r.kind}:${r.outcome}`), ['tool:done', 'permission:approved']);
  assert.deepEqual(openRequests(rs), []);
});

test('a session started again from its record resumes the agent by its own id', async () => {
  const provider = fakeProvider('claude', SCRIPT.slice(1).map(() => [{ text: 'Resumed.' }]));
  const s = new AgentSession(record({ providerId: 'agent-own-id', state: 'idle' }), provider, now, [{ kind: 'prompt', at: '2026-10-22T12:00:00.000Z', text: 'earlier' }]);
  await s.send('Carry on, invented.');
  await until(() => s.record.state === 'idle');
  assert.equal(provider.started[0].resume, 'agent-own-id');
  assert.deepEqual(turnsOf(s.records).map((t) => t.prompt), ['earlier', 'Carry on, invented.']);
});

// --- TASK-0192: the Claude provider over the Agent SDK ---

const { ClaudeProvider, claudeOptions, cleanEnvironment, permissionModeFor, SETTING_SOURCES, editOf } = load('main/agents/claude-provider.js');

/**
 * A fake `query()`: for each prompt it reads from the stream, plays one turn of SDK-shaped
 * messages. A tool use asks `canUseTool` first, as the SDK does, and its result says whether
 * it ran. Everything here is invented (RISK-0016).
 */
function fakeQuery(turns) {
  const calls = [];
  const fn = ({ prompt, options }) => {
    calls.push(options);
    let interrupted = false;
    const gen = (async function* () {
      yield { type: 'system', subtype: 'init', session_id: options.resume ?? 'sdk-session-1' };
      let t = 0;
      for await (const p of prompt) {
        const steps = turns[t++] ?? [];
        for (const step of steps) {
          if (interrupted) break;
          if (step.text) yield { type: 'assistant', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'text', text: step.text }] } };
          if (step.use) {
            const [name, input, id] = step.use;
            yield { type: 'assistant', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'tool_use', id, name, input }] } };
            const answer = name === 'Read' || name === 'TodoWrite' ? { behavior: 'allow' } : await options.canUseTool(name, input, { signal: new AbortController().signal });
            yield { type: 'user', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: answer.behavior !== 'allow', content: answer.behavior === 'allow' ? 'ok' : answer.message }] } };
          }
        }
        yield { type: 'result', subtype: 'success', is_error: false, session_id: 'sdk-session-1', prompt: p };
      }
    })();
    gen.interrupt = async () => { interrupted = true; };
    return gen;
  };
  fn.calls = calls;
  return fn;
}

test('the Claude options never skip permissions, read only the repository\'s settings and leave the cockpit\'s variables out', () => {
  const start = { folder: '/tmp/ws', prompt: 'p', model: 'claude-opus-5-5', effort: 'high', access: 'ask' };
  const env = { PATH: '/usr/bin', HOME: '/Users/x', COCKPIT_HOOK_URL: 'http://127.0.0.1:1/api/agent-hook', COCKPIT_URL: 'x', CLAUDE_CODE_PLUGIN_DIRS: '/plugins', ANTHROPIC_MODEL: 'kept' };
  for (const access of ['ask', 'edits']) {
    const o = claudeOptions({ ...start, access }, async () => ({ behavior: 'deny', message: 'x' }), new AbortController(), env);
    assert.equal(o.permissionMode, access === 'edits' ? 'acceptEdits' : 'default');
    const text = JSON.stringify(o, (k, v) => (typeof v === 'function' || v instanceof AbortController ? '[fn]' : v));
    assert.doesNotMatch(text, /bypassPermissions|allowDangerouslySkipPermissions|dangerously/i, 'nothing that skips permissions');
    assert.ok(!('allowDangerouslySkipPermissions' in o));
    assert.deepEqual(o.settingSources, ['project', 'local']);
    assert.equal(typeof o.canUseTool, 'function');
    assert.deepEqual(Object.keys(o.env).sort(), ['ANTHROPIC_MODEL', 'HOME', 'PATH']);
    assert.equal(o.cwd, '/tmp/ws');
    assert.equal(o.model, 'claude-opus-5-5');
    assert.equal(o.effort, 'high');
    assert.ok(!('resume' in o));
  }
  assert.equal(claudeOptions({ ...start, resume: 'sdk-9' }, async () => ({}), new AbortController(), env).resume, 'sdk-9');
  assert.deepEqual([...SETTING_SOURCES], ['project', 'local']);
  assert.deepEqual(['ask', 'edits'].map(permissionModeFor), ['default', 'acceptEdits']);
  assert.deepEqual(Object.keys(cleanEnvironment({ COCKPIT_X: '1', A: '2', CLAUDE_CODE_PLUGIN_DIRS: '3' })), ['A']);
});

test('a Claude session: the SDK session id, text, a plan, a tool that asks, its edit once made, and the turn\'s end', async () => {
  const q = fakeQuery([[
    { text: 'Looking at the ticket.' },
    { use: ['Read', { file_path: 'docs/a.md' }, 'tu1'] },
    { use: ['TodoWrite', { todos: [{ content: 'Read it', status: 'completed' }, { content: 'Fix it', status: 'pending' }] }, 'tu2'] },
    { use: ['Edit', { file_path: 'src/a.ts', old_string: 'one', new_string: 'one\ntwo\nthree' }, 'tu3'] },
    { text: 'Edited.' },
  ], [{ use: ['Bash', { command: 'git push' }, 'tu4'] }]]);
  const s = new AgentSession(record(), new ClaudeProvider(q, now, { PATH: '/bin' }), now);
  await s.start('Work on TASK-0001, invented.');
  await until(() => openRequests(s.records).length === 1);
  assert.deepEqual([openRequests(s.records)[0].tool, openRequests(s.records)[0].summary], ['Edit', 'src/a.ts']);
  assert.ok(!s.records.some((r) => r.kind === 'edit'), 'no edit before it is allowed');
  s.answer(openRequests(s.records)[0].id, { allow: true });
  await until(() => s.record.state === 'idle');
  assert.equal(s.record.providerId, 'sdk-session-1');
  const rs = latest(s.records).filter((r) => r.kind !== 'state');
  assert.deepEqual(rs.map((r) => r.kind), ['prompt', 'text', 'tool', 'plan', 'tool', 'permission', 'edit', 'text']);
  assert.deepEqual(rs[3].steps, [{ text: 'Read it', done: true }, { text: 'Fix it', done: false }]);
  assert.deepEqual([rs[2].name, rs[2].summary, rs[2].outcome], ['Read', 'docs/a.md', 'done']);
  assert.deepEqual([rs[4].name, rs[4].outcome], ['Edit', 'done']);
  assert.deepEqual([rs[6].path, rs[6].added, rs[6].removed], ['src/a.ts', 3, 1]);
  // The next prompt goes into the same query, and a denial reaches the SDK: the tool fails, no edit.
  await s.send('Now push, invented.');
  await until(() => openRequests(s.records).length === 1);
  s.answer(openRequests(s.records)[0].id, { allow: false, message: 'not from Deck' });
  await until(() => s.record.state === 'idle');
  assert.equal(q.calls.length, 1, 'one query holds the whole session');
  const last = turnsOf(s.records).at(-1);
  assert.deepEqual(last.records.filter((r) => r.kind === 'tool').map((r) => [r.name, r.outcome]), [['Bash', 'failed']]);
  assert.equal(last.records.find((r) => r.kind === 'permission').outcome, 'denied');
});

test('a Claude session resumed from its record continues the SDK session by its id', async () => {
  const q = fakeQuery([[{ text: 'Back again.' }]]);
  const s = new AgentSession(record({ providerId: 'sdk-session-7' }), new ClaudeProvider(q, now, {}), now);
  await s.send('Carry on, invented.');
  await until(() => s.record.state === 'idle');
  assert.equal(q.calls[0].resume, 'sdk-session-7');
  assert.equal(q.calls[0].permissionMode, 'default');
});

test('edits count their lines: an Edit, a MultiEdit and a Write', () => {
  const at = 'now';
  assert.deepEqual(['added', 'removed'].map((k) => editOf('Edit', { file_path: 'a', old_string: 'x\ny', new_string: 'z' }, at)[k]), [1, 2]);
  assert.deepEqual(['added', 'removed'].map((k) => editOf('MultiEdit', { file_path: 'a', edits: [{ old_string: 'a', new_string: 'b\nc' }, { old_string: '', new_string: 'd' }] }, at)[k]), [3, 1]);
  assert.deepEqual(['added', 'removed'].map((k) => editOf('Write', { file_path: 'a', content: '1\n2\n3\n4' }, at)[k]), [4, 0]);
  assert.equal(editOf('Bash', { command: 'ls' }, at), null);
});

// --- TASK-0193: the Codex provider over codex app-server ---

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';
const { CodexProvider, codexPolicy, diffCounts } = load('main/agents/codex-provider.js');

/** A Codex provider over the fake app-server, with its script and a log of every request it got. */
function fakeCodex(turns) {
  const logFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-codex-')), 'log.jsonl');
  const spawnServer = (folder) => spawn(process.execPath, [path.join(desktopRoot, 'tests', 'fake-codex-app-server.mjs')], { cwd: folder, env: { ...process.env, FAKE_CODEX_SCRIPT: JSON.stringify(turns), FAKE_CODEX_LOG: logFile }, stdio: ['pipe', 'pipe', 'pipe'] });
  return { provider: new CodexProvider(spawnServer, now), requests: () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []) };
}

test('Codex never runs without asking: untrusted for "ask", on-request for "edits", always the workspace-write sandbox', () => {
  assert.deepEqual(codexPolicy('ask'), { approvalPolicy: 'untrusted', sandbox: 'workspace-write' });
  assert.deepEqual(codexPolicy('edits'), { approvalPolicy: 'on-request', sandbox: 'workspace-write' });
  for (const a of ['ask', 'edits']) assert.doesNotMatch(JSON.stringify(codexPolicy(a)), /never|danger-full-access/);
  assert.deepEqual(diffCounts('--- a/x\n+++ b/x\n@@ -1,2 +1,3 @@\n a\n-b\n+c\n+d'), { added: 2, removed: 1 });
});

test('a Codex session: a thread, text, a plan, a command and an edit each asked about, and the turn\'s end', async () => {
  const { provider, requests } = fakeCodex([
    [{ say: 'Looking at the ticket.' }, { plan: [['Read', true], ['Change', false]] }, { run: 'npm test', ask: true }, { patch: ['src/a.ts', '--- a/src/a.ts\n+++ b/src/a.ts\n@@\n-old\n+new\n+more'] }, { say: 'Done.' }],
    [{ run: 'git push', ask: true }],
  ]);
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-codex-ws-')));
  const s = new AgentSession(record({ agent: 'codex', model: 'gpt-6-astra', effort: 'medium', folder }), provider, now);
  await s.start('Work on TASK-0001, invented.');
  try {
    await until(() => openRequests(s.records).length === 1);
    assert.deepEqual([openRequests(s.records)[0].tool, openRequests(s.records)[0].summary], ['Bash', 'npm test']);
    s.answer(openRequests(s.records)[0].id, { allow: true });
    await until(() => openRequests(s.records).length === 1 && openRequests(s.records)[0].tool === 'Edit');
    assert.equal(openRequests(s.records)[0].summary, 'src/a.ts');
    assert.ok(!s.records.some((r) => r.kind === 'edit'), 'no edit before it is allowed');
    s.answer(openRequests(s.records)[0].id, { allow: true });
    await until(() => s.record.state === 'idle');
    assert.equal(s.record.providerId, 'thread-1');
    const rs = latest(s.records).filter((r) => r.kind !== 'state');
    assert.deepEqual(rs.map((r) => r.kind), ['prompt', 'text', 'plan', 'tool', 'permission', 'tool', 'permission', 'edit', 'text']);
    assert.deepEqual(rs.find((r) => r.kind === 'edit'), { kind: 'edit', at: rs.find((r) => r.kind === 'edit').at, path: 'src/a.ts', added: 2, removed: 1, diff: '--- a/src/a.ts\n+++ b/src/a.ts\n@@\n-old\n+new\n+more' });
    // The next prompt is a turn on the same thread; a refused command is declined, and fails.
    await s.send('Now push, invented.');
    await until(() => openRequests(s.records).length === 1);
    s.answer(openRequests(s.records)[0].id, { allow: false });
    await until(() => s.record.state === 'idle');
    const last = turnsOf(s.records).at(-1);
    assert.deepEqual(last.records.filter((r) => r.kind === 'tool').map((r) => [r.name, r.summary, r.outcome]), [['Bash', 'git push', 'failed']]);
    // What Deck sent: the thread with its folder, model and the policy for "ask"; each turn's text and effort; the answers.
    const sent = requests();
    const thread = sent.find((m) => m.method === 'thread/start');
    assert.deepEqual([thread.params.approvalPolicy, thread.params.sandbox, thread.params.cwd, thread.params.model], ['untrusted', 'workspace-write', folder, 'gpt-6-astra']);
    const turns = sent.filter((m) => m.method === 'turn/start');
    assert.deepEqual(turns.map((t) => [t.params.threadId, t.params.input[0].text, t.params.effort]), [['thread-1', 'Work on TASK-0001, invented.', 'medium'], ['thread-1', 'Now push, invented.', 'medium']]);
    assert.deepEqual(sent.filter((m) => m.result?.decision !== undefined).map((m) => m.result.decision), ['accept', 'accept', 'decline']);
    assert.ok(sent.some((m) => m.method === 'initialize') && sent.some((m) => m.method === 'initialized'));
  } finally {
    await s.stop();
  }
});

test('a request Deck does not know is refused, never granted, and a Codex session resumes its thread by id', async () => {
  const { provider, requests } = fakeCodex([[{ unknown: 'item/tool/requestUserInput' }]]);
  const s = new AgentSession(record({ agent: 'codex', providerId: 'thread-9', access: 'edits', folder: fs.mkdtempSync(path.join(os.tmpdir(), 'deck-codex-ws-')) }), provider, now);
  await s.send('Carry on, invented.');
  try {
    await until(() => s.record.state === 'idle');
    const sent = requests();
    const resume = sent.find((m) => m.method === 'thread/resume');
    assert.deepEqual([resume.params.threadId, resume.params.approvalPolicy, resume.params.sandbox], ['thread-9', 'on-request', 'workspace-write']);
    assert.ok(!sent.some((m) => m.method === 'thread/start'));
    const refusal = sent.find((m) => m.error !== undefined);
    assert.match(refusal.error.message, /Deck does not answer item\/tool\/requestUserInput/);
    assert.equal(s.record.providerId, 'thread-9');
  } finally {
    await s.stop();
  }
});

// --- TASK-0194: sessions kept with their start ticket, in a worktree or the checkout ---

import { execFileSync } from 'node:child_process';
const { SessionManager, worktreeFor } = load('main/agents/sessions.js');

function gitRepo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-agent-repo-')));
  const repo = path.join(root, 'project');
  fs.mkdirSync(repo);
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'T');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'one');
  return repo;
}
const dataDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'deck-agents-data-'));
let ids = 0;
const newId = () => `0000000${++ids}-aaaa-bbbb-cccc-dddddddddddd`;

test('a session started for a ticket is kept with it, and its conversation in its own file outside the repository', async () => {
  const repo = gitRepo();
  const dir = dataDir();
  const m = new SessionManager(dir, { claude: fakeProvider('claude', [[{ text: 'Hello.' }]]) }, { now, newId });
  const s = await m.start({ workspaceId: 'ws1', root: repo, ticket: 'TASK-0007', agent: 'claude', model: 'claude-opus-5-5', effort: 'high', access: 'ask', place: 'checkout', prompt: 'Invented prompt.' });
  await until(() => m.get(s.id).state === 'idle');
  const kept = JSON.parse(fs.readFileSync(path.join(dir, 'sessions.json'), 'utf8')).sessions;
  assert.deepEqual(kept.map((r) => [r.ticket, r.folder, r.place, r.agent, r.providerId, r.access]), [['TASK-0007', repo, 'checkout', 'claude', 'fake-session-1', 'ask']]);
  assert.deepEqual(m.conversation(s.id).filter((r) => r.kind !== 'state').map((r) => r.kind), ['prompt', 'text']);
  assert.ok(fs.existsSync(path.join(dir, `${s.id}.jsonl`)));
  assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }), '', 'nothing is written into the repository');
});

test('a session in a new worktree gets its own folder beside the repository, on its own branch; two sessions on one ticket are kept apart', async () => {
  const repo = gitRepo();
  fs.writeFileSync(path.join(repo, 'a.txt'), 'changed but not committed\n');
  const m = new SessionManager(dataDir(), { codex: fakeProvider('codex', [[{ text: 'One.' }]]), claude: fakeProvider('claude', [[{ text: 'Two.' }]]) }, { now, newId });
  const a = await m.start({ workspaceId: 'ws1', root: repo, ticket: 'TASK-0007', agent: 'codex', model: 'gpt-6-astra', effort: 'medium', access: 'ask', place: 'worktree', prompt: 'Invented.' });
  const b = await m.start({ workspaceId: 'ws1', root: repo, ticket: 'TASK-0007', agent: 'claude', model: 'claude-opus-5-5', effort: 'high', access: 'ask', place: 'worktree', prompt: 'Invented.' });
  const w = worktreeFor(repo, 'TASK-0007', a.id);
  assert.equal(a.folder, w.folder);
  assert.equal(path.dirname(a.folder), path.join(path.dirname(repo), 'project-worktrees'));
  assert.match(a.branch, /^deck\/task-0007-0000000\d$/);
  assert.notEqual(a.folder, b.folder);
  assert.ok(fs.existsSync(path.join(a.folder, 'a.txt')), 'the worktree holds the checkout, though the checkout is dirty');
  assert.equal(execFileSync('git', ['-C', repo, 'branch', '--list', 'deck/*'], { encoding: 'utf8' }).trim().split('\n').length, 2);
  assert.deepEqual(m.list().filter((r) => r.ticket === 'TASK-0007').length, 2);
  await m.stopAll();
  assert.ok(fs.existsSync(a.folder), 'Deck never removes a worktree');
});

test('a worktree git refuses gives a session that failed with git\'s own words', async () => {
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', []) }, { now, newId, git: async () => ({ ok: false, stdout: '', stderr: "fatal: a branch named 'deck/x' already exists" }) });
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: null, agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'worktree', prompt: 'Invented.' });
  assert.equal(s.state, 'failed');
  assert.match(m.conversation(s.id).at(-1).reason, /git worktree add failed: fatal: a branch named/);
});

test('after a restart a session that was at work comes back idle, and Resume continues it by the agent\'s own id', async () => {
  const repo = gitRepo();
  const dir = dataDir();
  const first = new SessionManager(dir, { claude: fakeProvider('claude', [[{ ask: 'Edit', summary: 'x' }]]) }, { now, newId });
  const s = await first.start({ workspaceId: 'ws1', root: repo, ticket: 'TASK-0008', agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => first.get(s.id).state === 'waiting');
  // Deck closes with the session waiting; a new manager reads what was kept.
  const provider = fakeProvider('claude', [[{ text: 'Resumed, invented.' }]]);
  const second = new SessionManager(dir, { claude: provider }, { now, newId });
  assert.equal(second.get(s.id).state, 'idle');
  assert.equal(second.get(s.id).providerId, 'fake-session-1');
  assert.equal(second.conversation(s.id).at(-1).reason, 'Deck restarted');
  await second.send(s.id, 'Carry on, invented.');
  await until(() => second.get(s.id).state === 'idle' && second.conversation(s.id).some((r) => r.kind === 'text' && r.text === 'Resumed, invented.'));
  assert.equal(provider.started[0].resume, 'fake-session-1');
  assert.deepEqual(second.conversation(s.id).filter((r) => r.kind === 'prompt').map((r) => r.text), ['Invented.', 'Carry on, invented.']);
});
