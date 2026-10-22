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
