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
