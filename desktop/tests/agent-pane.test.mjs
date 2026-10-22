// TST-0105 — a session drawn as a conversation beside its ticket (FEAT-0033): the pane, the
// composer, the markers, the Agents list and Work on this, laid out from the conversation model.
// Every conversation here is invented (RISK-0016).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { paneOf, paneTurns, composerOf, ACCESS_WORD } = load('shared/agent-pane.js');

const at = (s) => `2026-10-22T13:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.000Z`;
const session = (over = {}) => ({ id: 'abcdef12-0000-0000-0000-000000000000', agent: 'claude', providerId: 'p', workspaceId: 'ws1', ticket: 'TASK-0001', folder: '/r', place: 'checkout', model: 'claude-opus-5-5', effort: 'high', access: 'ask', created: at(0), lastActive: at(600), state: 'idle', ...over });
const CONVERSATION = [
  { kind: 'state', at: at(0), state: 'working' },
  { kind: 'prompt', at: at(1), text: 'Work on TASK-0001: an invented ticket.' },
  { kind: 'text', at: at(2), text: 'Reading it.' },
  { kind: 'tool', at: at(3), id: 't1', name: 'Read', summary: 'a.md', outcome: 'running' },
  { kind: 'tool', at: at(4), id: 't1', name: 'Read', summary: 'a.md', outcome: 'done' },
  { kind: 'tool', at: at(5), id: 't2', name: 'Bash', summary: 'ls', outcome: 'done' },
  { kind: 'tool', at: at(6), id: 't3', name: 'Bash', summary: 'false', outcome: 'failed' },
  { kind: 'plan', at: at(7), steps: [{ text: 'Read', done: true }, { text: 'Fix', done: false }] },
  { kind: 'permission', at: at(8), id: 'p1', tool: 'Edit', summary: 'src/a.ts', outcome: 'open' },
  { kind: 'permission', at: at(9), id: 'p1', tool: 'Edit', summary: 'src/a.ts', outcome: 'approved' },
  { kind: 'edit', at: at(10), path: 'src/a.ts', added: 3, removed: 1, diff: '-a\n+b' },
  { kind: 'edit', at: at(11), path: 'src/b.ts', added: 1, removed: 0, diff: '+c' },
  { kind: 'edit', at: at(12), path: 'src/a.ts', added: 1, removed: 1, diff: '-d\n+e' },
  { kind: 'plan', at: at(13), steps: [{ text: 'Read', done: true }, { text: 'Fix', done: true }] },
  { kind: 'text', at: at(14), text: 'Done.' },
  { kind: 'state', at: at(15), state: 'idle' },
  { kind: 'prompt', at: at(300), text: 'Now push, invented.' },
  { kind: 'permission', at: at(301), id: 'p2', tool: 'Bash', summary: 'git push', outcome: 'open' },
];

// --- TASK-0197: the session pane ---

test('the pane draws the turns in order: the prompt, the text, the steps as counted chips, the plan, the request at its turn, the edits per file', () => {
  const turns = paneTurns(CONVERSATION);
  assert.deepEqual(turns.map((t) => t.prompt), ['Work on TASK-0001: an invented ticket.', 'Now push, invented.']);
  const first = turns[0].items;
  assert.deepEqual(first.map((i) => i.kind), ['text', 'steps', 'permission', 'edits', 'plan', 'text']);
  assert.deepEqual(first[1].chips, [{ name: 'Read', count: 1, failed: 0, running: 0 }, { name: 'Bash', count: 2, failed: 1, running: 0 }]);
  assert.deepEqual(first[2].request.outcome, 'approved');
  assert.deepEqual(first[3].files.map((f) => [f.path, f.added, f.removed]), [['src/a.ts', 4, 2], ['src/b.ts', 1, 0]]);
  assert.deepEqual(first[4].steps.map((s) => s.done), [true, true], 'the plan as it stands now');
  assert.deepEqual(turns[1].items.map((i) => [i.kind, i.request?.outcome]), [['permission', 'open']]);
});

test('a session waiting for you ends with who is waiting, and its open requests are listed for Approve and Deny', () => {
  const m = paneOf(session({ state: 'waiting' }), CONVERSATION);
  assert.equal(m.waiting, 'Claude is waiting for you');
  assert.deepEqual(m.open.map((r) => r.id), ['p2']);
  assert.equal(paneOf(session({ state: 'waiting', agent: 'codex' }), CONVERSATION).waiting, 'Codex is waiting for you');
  assert.equal(paneOf(session({ state: 'idle' }), CONVERSATION).waiting, null);
});

test('the head says who, where and how it runs, and how long; no cost appears anywhere', () => {
  const m = paneOf(session({ place: 'worktree', branch: 'deck/task-0001-abcdef12' }), CONVERSATION);
  assert.deepEqual([m.head.word, m.head.glyph, m.head.shortId, m.head.stateWord, m.head.ticket, m.head.where, m.head.access], ['Claude', '✳', 'abcdef12', 'idle', 'TASK-0001', 'worktree deck/task-0001-abcdef12', ACCESS_WORD.ask]);
  assert.equal(m.minutes, 5);
  assert.doesNotMatch(JSON.stringify(m), /\$|usd|cost/i);
});

test('a failure and a reason show as a note in the turn', () => {
  const turns = paneTurns([{ kind: 'prompt', at: at(1), text: 'x' }, { kind: 'state', at: at(2), state: 'failed', reason: 'codex app-server exited with 1' }, { kind: 'state', at: at(3), state: 'idle', reason: 'Deck restarted' }]);
  assert.deepEqual(turns[0].items.map((i) => i.text), ['Failed: codex app-server exited with 1', 'idle: Deck restarted']);
});
