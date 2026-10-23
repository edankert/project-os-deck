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
          if (step.text) yield { type: 'assistant', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'text', text: step.text }], ...(step.usage ? { usage: step.usage } : {}) } };
          if (step.raw) yield step.raw;
          if (step.use) {
            const [name, input, id] = step.use;
            yield { type: 'assistant', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'tool_use', id, name, input }] } };
            const answer = name === 'Read' || name === 'TodoWrite' ? { behavior: 'allow' } : await options.canUseTool(name, input, { signal: new AbortController().signal, toolUseID: id });
            yield { type: 'user', session_id: 'sdk-session-1', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: answer.behavior !== 'allow', content: answer.behavior === 'allow' ? 'ok' : answer.message }] } };
          }
        }
        yield { type: 'result', subtype: 'success', is_error: false, session_id: 'sdk-session-1', prompt: p, ...(steps.find((x) => x.result)?.result ?? {}) };
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
  assert.deepEqual([openRequests(s.records)[0].id, openRequests(s.records)[0].toolUse], ['claude-ask-tu3', 'tu3'], 'a request is known by its tool call\'s own id, unique across resumes');
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
  assert.deepEqual(codexPolicy('ask'), { approvalPolicy: 'untrusted', sandbox: 'workspace-write', approvalsReviewer: 'user' });
  assert.deepEqual(codexPolicy('edits'), { approvalPolicy: 'on-request', sandbox: 'workspace-write', approvalsReviewer: 'user' });
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
    assert.match(openRequests(s.records)[0].id, /^codex-ask-./);
    assert.equal(openRequests(s.records)[0].id, `codex-ask-${openRequests(s.records)[0].toolUse}`, 'known by the item it approves');
    assert.equal(requests().find((m) => m.method === 'thread/start').params.approvalsReviewer, 'user', 'a person answers Codex\'s approvals, whatever its config says');
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
    assert.deepEqual([resume.params.threadId, resume.params.approvalPolicy, resume.params.sandbox, resume.params.approvalsReviewer], ['thread-9', 'on-request', 'workspace-write', 'user']);
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

// --- TASK-0195: sessions reported to the sidecar ---

const { SidecarReporter } = load('main/agents/sidecar-report.js');

/** A recording fake sidecar: every post kept; an ask gets an approval id; an approval's status can be set as the cockpit would. */
function recordingSidecar({ down = false } = {}) {
  const posts = [];
  const approvals = new Map();
  let n = 0;
  return {
    posts,
    approvals,
    client: {
      async post(base, p, body) {
        if (down) throw new Error('connect ECONNREFUSED');
        posts.push({ base, path: p, body });
        if (p === '/api/cockpit/approvals/ask') {
          // As the real sidecar does: one record per session and tool use id, whatever its status, handed back to a repeat.
          const kept = [...approvals.values()].find((a) => a.session_id === body.session_id && a.tool_use_id === body.tool_use_id);
          if (kept !== undefined) return { ok: true, status: 200, json: { ok: true, approval_id: kept.approval_id, wait_ms: 5000 } };
          const id = `ap${++n}`; approvals.set(id, { approval_id: id, status: 'open', ...body }); return { ok: true, status: 200, json: { ok: true, approval_id: id, wait_ms: 5000 } }; }
        if (p === '/api/cockpit/approvals/handed-back') { const a = approvals.get(body.approval_id); if (a.status === 'open') a.status = 'handed-to-terminal'; return { ok: true, status: 200, json: { ok: true, approval: a } }; }
        return { ok: true, status: 200, json: { ok: true } };
      },
      async get(base, p) {
        const id = new URL(`http://x${p}`).searchParams.get('approval_id');
        return { ok: true, status: 200, json: { ok: true, approval: approvals.get(id) } };
      },
    },
  };
}

test('a Deck session is reported as the cockpit\'s own are: start, prompt, tools, an edit with its file, a request offered and withdrawn, the turn\'s end and the end', async () => {
  const side = recordingSidecar();
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ tool: 'Read', summary: 'a.md' }, { ask: 'Edit', summary: 'src/a.ts' }, { edit: 'src/a.ts', added: 2 }, { text: 'Reply text that must not be sent.' }]]) }, { now, newId });
  const r = new SidecarReporter(m, () => 'http://127.0.0.1:9', side.client, () => {}, 20);
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: 'TASK-0009', agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'An invented prompt.' });
  await until(() => m.get(s.id).state === 'waiting');
  const ask = side.posts.find((p) => p.path === '/api/cockpit/approvals/ask');
  assert.deepEqual([ask.body.session_id, ask.body.tool, ask.body.input.summary], [s.id, 'Edit', 'src/a.ts']);
  assert.ok(ask.body.tool_use_id.startsWith(`${s.id}:`), 'the id the sidecar knows a request by carries the session\'s own, so two sessions never share one');
  m.answer(s.id, openRequests(m.conversation(s.id))[0].id, { allow: true });
  await until(() => m.get(s.id).state === 'idle');
  await until(() => side.posts.some((p) => p.path === '/api/cockpit/approvals/handed-back'));
  await m.stop(s.id);
  await r.settled();
  r.close();
  const hooks = side.posts.filter((p) => p.path === '/api/agent-hook').map((p) => p.body);
  assert.deepEqual(hooks.map((h) => h.hook_event_name), ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PermissionRequest', 'PostToolUse', 'PostToolUse', 'Stop', 'SessionEnd']);
  for (const h of hooks) assert.deepEqual([h.session_id, h.agent, typeof h.cwd], [s.id, 'claude', 'string']);
  assert.equal(hooks[1].prompt, 'An invented prompt.');
  assert.deepEqual(hooks.find((h) => h.tool_input).tool_input, { file_path: 'src/a.ts' });
  for (const h of hooks.filter((x) => x.hook_event_name === 'PostToolUse')) assert.ok(typeof h.tool_use_id === 'string' && h.tool_use_id.startsWith(`${s.id}:`), 'every PostToolUse names its own tool use: with none, the sidecar closes every approval in the session');
  assert.equal(ask.body.tool_use_id, hooks.find((h) => h.hook_event_name === 'PostToolUse' && h.tool_name === 'Edit' && !h.tool_input).tool_use_id, 'the card is filed under the tool call\'s own id, so its PostToolUse closes it')
  assert.ok(!JSON.stringify(side.posts).includes('Reply text that must not be sent'), 'no reply text reaches the sidecar');
  assert.equal(side.approvals.get('ap1').status, 'handed-to-terminal');
});

test('a request answered in the cockpit first is the answer the agent gets', async () => {
  const side = recordingSidecar();
  const m = new SessionManager(dataDir(), { codex: fakeProvider('codex', [[{ ask: 'Bash', summary: 'npm test' }, { text: 'after' }]]) }, { now, newId });
  const r = new SidecarReporter(m, () => 'http://127.0.0.1:9', side.client, () => {}, 10);
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: null, agent: 'codex', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => side.approvals.size === 1);
  side.approvals.get('ap1').status = 'denied';
  await until(() => m.get(s.id).state === 'idle');
  r.close();
  const p = latest(m.conversation(s.id)).find((x) => x.kind === 'permission');
  assert.deepEqual([p.outcome, p.message], ['denied', 'Denied in the cockpit.']);
});

test('a sidecar that is down never stops a session, and says so once', async () => {
  const side = recordingSidecar({ down: true });
  const logged = [];
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ tool: 'Read' }, { text: 'fine' }]]) }, { now, newId });
  new SidecarReporter(m, () => 'http://127.0.0.1:9', side.client, (msg) => logged.push(msg), 10).close();
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: null, agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => m.get(s.id).state === 'idle');
  assert.equal(logged.length, 1);
  assert.match(logged[0], /ECONNREFUSED; the session goes on/);
  assert.ok(latest(m.conversation(s.id)).some((r) => r.kind === 'text' && r.text === 'fine'));
});

test('a session\'s events reach the sidecar in the order they happened, even when the sidecar answers slowly', async () => {
  const side = recordingSidecar();
  const slow = { ...side.client, post: async (b, p, body) => { await new Promise((x) => setTimeout(x, body.hook_event_name === 'SessionStart' ? 30 : 1)); return side.client.post(b, p, body); } };
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ ask: 'Edit', summary: 'x' }]]) }, { now, newId });
  const r = new SidecarReporter(m, () => 'http://127.0.0.1:9', slow, () => {}, 10);
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: null, agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => m.get(s.id).state === 'waiting');
  await r.settled();
  const order = side.posts.map((p) => p.body.hook_event_name ?? p.path);
  assert.deepEqual(order, ['SessionStart', 'UserPromptSubmit', 'PermissionRequest', '/api/cockpit/approvals/ask']);
  await m.stop(s.id);
  await r.settled();
  r.close();
});

// --- TASK-0196: only the shell reaches sessions ---

import { fakeSidecar, HEALTH } from './helpers.mjs';
const { SHELL_CAPABILITIES, SERVED_CAPABILITIES, normaliseCapabilities } = load('shared/capability.js');
const { parseStart, registerAgentCalls } = load('main/agents/ipc.js');
const { DeckHost } = load('main/host.js');

test('the shell has the agents capability and a served page does not', () => {
  assert.equal(SHELL_CAPABILITIES.agents, true);
  assert.equal(SERVED_CAPABILITIES.agents, false);
  assert.equal(normaliseCapabilities({}).agents, false, 'missing means no');
  assert.equal(normaliseCapabilities({ agents: 'yes' }).agents, false, 'only true means yes');
});

test('a start request is checked: the workspace\'s folder comes from Deck\'s list, and nothing outside what Deck offers is accepted', () => {
  const rootOf = (id) => (id === 'ws1' ? '/repos/ws1' : null);
  const good = { workspaceId: 'ws1', ticket: 'TASK-0001', agent: 'claude', model: 'claude-opus-5-5', effort: 'high', access: 'ask', place: 'worktree', prompt: 'Invented.', root: '/etc' };
  const req = parseStart(good, rootOf);
  assert.equal(req.root, '/repos/ws1', 'a folder the window sends is ignored');
  assert.deepEqual([req.ticket, req.agent, req.access, req.place], ['TASK-0001', 'claude', 'ask', 'worktree']);
  assert.equal(parseStart({ ...good, ticket: null }, rootOf).ticket, null);
  for (const [bad, why] of [
    [{ workspaceId: 'nope' }, /no such workspace/],
    [{ ticket: '../etc' }, /not a ticket id/],
    [{ agent: 'gpt' }, /not an agent/],
    [{ access: 'bypassPermissions' }, /not an access level/],
    [{ access: 'skip' }, /not an access level/],
    [{ place: 'elsewhere' }, /not a place/],
    [{ model: 'x; rm -rf /' }, /not a model/],
    [{ prompt: '   ' }, /starts with a prompt/],
  ]) assert.match(parseStart({ ...good, ...bad }, rootOf), why, JSON.stringify(bad));
});

test('the calls reach the manager, check their arguments, and an answer only allows or denies', async () => {
  const calls = new Map();
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ ask: 'Edit', summary: 'x' }]]) }, { now, newId });
  const repo = gitRepo();
  registerAgentCalls((ch, h) => calls.set(ch, h), m, (id) => (id === 'ws1' ? repo : null));
  assert.deepEqual([...calls.keys()].sort(), ['deck:agents:answer', 'deck:agents:cockpit', 'deck:agents:cockpit-answer', 'deck:agents:conversation', 'deck:agents:interrupt', 'deck:agents:list', 'deck:agents:needs', 'deck:agents:send', 'deck:agents:start', 'deck:agents:stop', 'deck:cockpit:caught-up']);
  assert.deepEqual(await calls.get('deck:agents:start')({}, { workspaceId: 'elsewhere', agent: 'claude', prompt: 'x' }), { ok: false, error: 'no such workspace' });
  const started = await calls.get('deck:agents:start')({}, { workspaceId: 'ws1', ticket: 'TASK-0002', agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  assert.equal(started.ok, true);
  const id = started.session.id;
  await until(() => m.get(id).state === 'waiting');
  assert.deepEqual(await calls.get('deck:agents:answer')({}, id, 'x', { allow: 'yes' }), { ok: false, error: 'an answer allows or denies' });
  const ask = openRequests(await calls.get('deck:agents:conversation')({}, id))[0];
  assert.deepEqual(await calls.get('deck:agents:answer')({}, id, ask.id, { allow: true }), { ok: true });
  await until(() => m.get(id).state === 'idle');
  assert.throws(() => calls.get('deck:agents:conversation')({}, '../../etc/passwd'), /not a session id/);
  assert.equal((await calls.get('deck:agents:list')({})).length, 1);
  assert.deepEqual(await calls.get('deck:agents:stop')({}, id), { ok: true });
});

test('Deck\'s served host forwards none of the sidecar\'s agent, session or approval routes', async () => {
  const sidecar = await fakeSidecar({ '/healthz': HEALTH });
  const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };
  const host = new DeckHost({ webRoot: path.join(desktopRoot, 'dist', 'web'), capabilities: SERVED_CAPABILITIES, listWorkspaces: () => [WORKSPACE], sidecarBaseFor: () => sidecar.base });
  const { port } = await host.listen(0);
  try {
    const caps = await (await fetch(`http://127.0.0.1:${port}/deck/capabilities`)).json();
    assert.equal(caps.agents, false, 'the served page is told it has no agents');
    for (const p of ['/api/agent-hook', '/api/cockpit/sessions', '/api/cockpit/agents', '/api/cockpit/agent-state', '/api/cockpit/approvals', '/api/cockpit/approvals/ask', '/api/cockpit/approvals/handed-back', '/api/cockpit/session-cache', '/api/cockpit/caught-up', '/api/cockpit/deliveries']) {
      for (const method of ['GET', 'POST']) {
        const res = await fetch(`http://127.0.0.1:${port}/deck/sidecar/${WORKSPACE.id}${p}`, { method });
        assert.ok([403, 404, 405].includes(res.status), `${method} ${p} answered ${res.status}`);
      }
    }
    assert.equal(sidecar.received.filter((r) => !r.url.startsWith('/healthz')).length, 0, 'nothing reached the sidecar');
    for (const p of ['/deck/agents', '/deck/agents/list', '/deck/sessions']) assert.ok([403, 404, 405].includes((await fetch(`http://127.0.0.1:${port}${p}`)).status), p);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('an agent report leaves Deck through the write client, and only to the three agent paths', async () => {
  const { postAgentReport, AGENT_REPORT_PATHS } = load('shared/write-client.js');
  assert.deepEqual([...AGENT_REPORT_PATHS], ['/api/agent-hook', '/api/cockpit/approvals/ask', '/api/cockpit/approvals/handed-back']);
  const sent = [];
  const fake = async (url, init) => { sent.push([url, init.method, init.headers['content-type']]); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  assert.deepEqual(await postAgentReport('http://127.0.0.1:9', '/api/agent-hook', { a: 1 }, fake), { ok: true, status: 200, json: { ok: true } });
  await assert.rejects(postAgentReport('http://127.0.0.1:9', '/api/notes/transition', {}, fake), /Deck reports agents only to/);
  assert.deepEqual(sent, [['http://127.0.0.1:9/api/agent-hook', 'POST', 'application/json']]);
});

// --- TASK-0207: review round one ---

test('interrupting a session denies what it was waiting for', async () => {
  const s = new AgentSession(record(), fakeProvider('claude', SCRIPT), now);
  await s.start('An invented prompt.');
  await until(() => openRequests(s.records).length === 1);
  await s.interrupt();
  assert.equal(openRequests(s.records).length, 0);
  assert.deepEqual(latest(s.records).filter((r) => r.kind === 'permission').map((r) => r.outcome), ['denied']);
});

test('an agent that ends by itself has its open requests denied', async () => {
  let hooks;
  let asked;
  const provider = { agent: 'claude', async start(_o, h) { hooks = h; h.identified('p1'); asked = h.ask({ id: 'claude-ask-x', tool: 'Bash', summary: 'ls' }); return { async send() {}, async interrupt() {}, async stop() {} }; } };
  const s = new AgentSession(record(), provider, now);
  await s.start('Invented.');
  await until(() => openRequests(s.records).length === 1);
  hooks.ended('the agent crashed');
  const answered = await Promise.race([asked, new Promise((done) => setTimeout(() => done('still waiting'), 500))]);
  assert.deepEqual(answered, { allow: false, message: 'the session ended' });
  assert.equal(s.record.state, 'failed');
});

test('a resumed session\'s request is never answered by the earlier turn\'s record the sidecar hands back', async () => {
  const side = recordingSidecar();
  const logs = [];
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ ask: 'Bash', summary: 'rm -rf build' }]]) }, { now, newId });
  const r = new SidecarReporter(m, () => 'http://127.0.0.1:9', side.client, (l) => logs.push(l), 10);
  const s = await m.start({ workspaceId: 'ws1', root: gitRepo(), ticket: 'TASK-0009', agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => side.approvals.size === 1);
  side.approvals.get('ap1').status = 'granted';
  await until(() => m.get(s.id).state === 'idle');
  await m.stop(s.id);
  // The resumed provider numbers its request as the first one was; the sidecar hands back the granted record.
  void m.send(s.id, 'Again, invented.');
  await until(() => openRequests(m.conversation(s.id)).length === 1);
  await new Promise((done) => setTimeout(done, 80));
  await r.settled();
  assert.equal(openRequests(m.conversation(s.id)).length, 1, 'still waiting for a person: the old grant was not taken as this request\'s');
  assert.equal(side.approvals.size, 1);
  assert.ok(logs.some((l) => /a record that is granted/.test(l)));
  m.answer(s.id, openRequests(m.conversation(s.id))[0].id, { allow: false });
  await m.stop(s.id);
  r.close();
});

test('a session in a worktree reports the repository as its folder, so the sidecar takes it', async () => {
  const side = recordingSidecar();
  const repo = gitRepo();
  const m = new SessionManager(dataDir(), { claude: fakeProvider('claude', [[{ text: 'ok' }]]) }, { now, newId });
  const r = new SidecarReporter(m, () => 'http://127.0.0.1:9', side.client, () => {}, 20);
  const s = await m.start({ workspaceId: 'ws1', root: repo, ticket: 'TASK-0009', agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'worktree', prompt: 'Invented.' });
  await until(() => m.get(s.id).state === 'idle');
  await m.stop(s.id);
  await r.settled();
  r.close();
  assert.notEqual(m.get(s.id).folder, repo);
  const hooks = side.posts.filter((p) => p.path === '/api/agent-hook').map((p) => p.body);
  assert.ok(hooks.length > 0);
  for (const h of hooks) assert.equal(h.cwd, repo);
});

test('stopping a session that is not running records it, so the cockpit hears it end', async () => {
  const dir = dataDir();
  const repo = gitRepo();
  const first = new SessionManager(dir, { claude: fakeProvider('claude', [[{ text: 'ok' }]]) }, { now, newId });
  const s = await first.start({ workspaceId: 'ws1', root: repo, ticket: null, agent: 'claude', model: 'm', effort: '', access: 'ask', place: 'checkout', prompt: 'Invented.' });
  await until(() => first.get(s.id).state === 'idle');
  const side = recordingSidecar();
  const again = new SessionManager(dir, { claude: fakeProvider('claude', []) }, { now, newId });
  const r = new SidecarReporter(again, () => 'http://127.0.0.1:9', side.client, () => {}, 20);
  await again.stop(s.id);
  await r.settled();
  r.close();
  assert.equal(again.get(s.id).state, 'stopped');
  assert.equal(latest(again.conversation(s.id)).at(-1).state, 'stopped');
  assert.deepEqual(side.posts.map((p) => p.body.hook_event_name), ['SessionEnd']);
});

test('the renderer reaches sessions only when the host has the agents capability', async () => {
  const { pathToFileURL } = await import('node:url');
  const { Host } = await import(pathToFileURL(path.join(desktopRoot, 'dist', 'web', 'renderer', 'host-bridge.js')));
  const bridge = { list: async () => [] };
  const saved = globalThis.deck;
  try {
    for (const [caps, reach] of [[SHELL_CAPABILITIES, true], [SERVED_CAPABILITIES, false], [{ ...SHELL_CAPABILITIES, agents: false }, false]]) {
      globalThis.deck = { capabilities: async () => caps, state: { subscribe: () => () => {} }, agents: bridge };
      const host = new Host();
      await host.start();
      assert.equal(host.agents() !== null, reach, JSON.stringify(caps));
    }
  } finally {
    if (saved === undefined) delete globalThis.deck; else globalThis.deck = saved;
  }
});

test('an agent whose next steps run while a change is being told never leaves the session in an older state', async () => {
  // Electron runs pending promise callbacks when a change is sent to a window, so the agent can end its
  // turn in the middle of the session telling that it is at work again (TASK-0201's walk). Simulated here
  // by ending the turn from inside a listener, at the moment the session says it is working again.
  let hooks;
  const provider = { agent: 'claude', async start(_o, h) { hooks = h; h.identified('p'); void h.ask({ id: 'a1', tool: 'Bash', summary: 'npm test' }); return { async send() {}, async interrupt() {}, async stop() {} }; } };
  const s = new AgentSession(record(), provider, now);
  let fired = false;
  s.onChange((c) => {
    if (!fired && c.kind === 'record' && c.record.kind === 'state' && c.record.state === 'working' && latest(s.records).some((r) => r.kind === 'permission' && r.outcome === 'denied')) {
      fired = true;
      hooks.record({ kind: 'text', at: now(), text: 'Not allowed.' });
      hooks.turnEnded();
    }
  });
  const told = [];
  s.onChange((c) => { if (c.kind === 'session') told.push(c.session.state); });
  await s.start('Invented.');
  await until(() => openRequests(s.records).length === 1);
  s.answer('a1', { allow: false });
  assert.equal(s.record.state, 'idle');
  assert.equal(told.at(-1), 'idle', 'the last state told is the one the session is in');
  assert.equal(latest(s.records).filter((r) => r.kind === 'state').at(-1).state, 'idle');
});

// --- TASK-0209: context and usage, as the agents report them ---

const { paneTurns: paneTurnsOf } = load('shared/agent-pane.js');

test('a Claude session records how full its context is and how much of the limit is used, and never a cost', async () => {
  const q = fakeQuery([[
    { text: 'Reading.', usage: { input_tokens: 1000, cache_read_input_tokens: 40000, cache_creation_input_tokens: 2000, output_tokens: 500 } },
    { text: 'A subagent step.', raw: { type: 'assistant', session_id: 'sdk-session-1', parent_tool_use_id: 'task-1', message: { content: [], usage: { input_tokens: 190000, output_tokens: 1 } } } },
    { raw: { type: 'rate_limit_event', session_id: 'sdk-session-1', rate_limit_info: { status: 'allowed', utilization: 0.42, rateLimitType: 'five_hour' } } },
    { result: { total_cost_usd: 1.5, modelUsage: { 'claude-opus-5-5': { contextWindow: 200000, costUSD: 1.5 }, 'claude-haiku-5-5': { contextWindow: 100000, costUSD: 0 } } } },
  ]]);
  const s = new AgentSession(record(), new ClaudeProvider(q, now, {}), now);
  await s.start('Work on TASK-0001, invented.');
  await until(() => s.record.state === 'idle');
  const usage = s.records.filter((r) => r.kind === 'usage');
  assert.deepEqual(usage.map((u) => [u.context, u.limit]), [[undefined, { percent: 42, window: '5-hour' }], [{ used: 43500, window: 200000 }, undefined]], 'the main conversation\'s last call, against the largest window; a subagent\'s call is not the context');
  assert.doesNotMatch(JSON.stringify(s.records), /usd|cost|1\.5/i);
  assert.ok(!paneTurnsOf(s.records).some((t) => t.items.some((i) => JSON.stringify(i).includes('usage'))), 'usage stands in the head, in no turn');
  await s.stop();
});

test('a Codex session records its context from the token update and its limit from the rate-limit update', async () => {
  const { provider } = fakeCodex([[{ say: 'Looking.' }, { usage: { tokens: 51000, window: 258000, percent: 63, minutes: 300 } }, { usage: { tokens: 0, window: 258000, percent: null } }]]);
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-codex-ws-')));
  const s = new AgentSession(record({ agent: 'codex', model: 'gpt-6-astra', effort: 'medium', folder }), provider, now);
  await s.start('Work on TASK-0001, invented.');
  try {
    await until(() => s.record.state === 'idle');
    assert.deepEqual(s.records.filter((r) => r.kind === 'usage').map((u) => [u.context, u.limit]), [[{ used: 51000, window: 258000 }, undefined], [undefined, { percent: 63, window: '5-hour' }]], 'an update with no tokens or no window records nothing');
  } finally {
    await s.stop();
  }
});
