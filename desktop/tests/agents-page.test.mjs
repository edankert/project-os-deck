// TST-0101 — DES-0006's page is drawn from the sessions the cockpit recorded, keeping only
// what may be committed, and every recorded session is on it (FEAT-0030, TASK-0178).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { desktopRoot } from './helpers.mjs';

const notes = () => import(path.join(desktopRoot, 'scripts', 'agents-notes.mjs'));

test('a transcript is counted, never copied: tool calls by name and the prompts a person typed', async () => {
  const { countTranscript } = await notes();
  const claude = [
    { type: 'user', message: { content: 'Please fix the SECRET-PROMPT bug' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'SECRET-REPLY' }, { type: 'tool_use', name: 'Bash', input: { command: 'rm -rf SECRET-COMMAND' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: 'SECRET-OUTPUT' }] }, toolUseResult: {} },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }, { type: 'tool_use', name: 'Edit' }] } },
    { type: 'user', message: { content: '<task-notification>harness</task-notification>' } },
    { type: 'user', isMeta: true, message: { content: 'meta' } },
    { type: 'user', message: { content: [{ type: 'text', text: 'and the second prompt' }] } },
  ].map((o) => JSON.stringify(o)).join('\n') + '\nnot json\n';
  assert.deepEqual(countTranscript(claude, 'claude'), { tools: { Bash: 2, Edit: 1 }, prompts: 2 }, 'two prompts, three tool calls; the harness, meta lines and tool results are not prompts');
  const codex = [
    { type: 'response_item', payload: { type: 'message', role: 'user', content: 'SECRET' } },
    { type: 'response_item', payload: { type: 'custom_tool_call', name: 'exec', input: 'SECRET' } },
    { type: 'response_item', payload: { type: 'function_call', name: 'exec' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', content: 'SECRET' } },
  ].map((o) => JSON.stringify(o)).join('\n');
  assert.deepEqual(countTranscript(codex, 'codex'), { tools: { exec: 2 }, prompts: 1 }, 'a Codex rollout counts the same way');
});

test('a session keeps ids, states, times, tickets and counts, and no text', async () => {
  const { sessionsFrom } = await notes();
  const session = (id, last, extra = {}) => ({
    session_id: id, agent: 'claude', started: '2026-10-20T10:00:00Z', last_event: last, ended: null, state: 'idle',
    transcript_path: '/Users/someone/.claude/projects/SECRET-PATH.jsonl', cwd: '/Users/someone/SECRET-CWD',
    prompts: [{ ts: '2026-10-20T10:00:01Z', text: 'SECRET-PROMPT' }],
    files: ['docs/a.md', 'src/SECRET-FILE.ts'], work_notes: ['features/x/plan/tasks/TASK-0002-Do-It.md'], docs_notes: ['changes/CHG-20261020-SECRET-CHANGE.md'],
    status_touched: { 'x/TASK-0002.md': { id: 'TASK-0002', status: 'done', ts: '2026-10-20T11:00:00Z', title: 'SECRET-TITLE' } },
    cost: { total_cost_usd: 1.234, used_percentage: 26, context_window_size: 1000000, total_duration_ms: 600000, rate_limits: { five_hour: { used_percentage: 39 }, seven_day: { used_percentage: 80 } } },
    ...extra,
  });
  const sessions = [session('aaaaaaaa-1', '2026-10-20T12:00:00Z'), session('bbbbbbbb-2', '2026-10-21T12:00:00Z'), session('cccccccc-3', '2026-10-19T12:00:00Z')];
  const approvals = [{ approval_id: 'x', session_id: 'cccccccc-3', agent: 'claude', tool: 'Bash', input: { command: 'SECRET-COMMAND', description: 'SECRET-DESCRIPTION' }, prompt: 'SECRET-COMMAND', status: 'granted', ts: '2026-10-19T11:00:00Z', kind: 'permission', closed_at: '2026-10-19T11:00:05Z' }];
  const agentState = { hook_sessions: { 'bbbbbbbb-2': { state: 'waiting', message: 'SECRET-MESSAGE' } } };
  const out = sessionsFrom({ sessions, approvals, agentState, counts: () => ({ tools: { Bash: 3 }, prompts: 1 }), tickets: new Set(['TASK-0002']), keep: 1 });
  const text = JSON.stringify(out);
  for (const secret of ['SECRET', '/Users/', 'src/', 'docs/a.md']) assert.ok(!text.includes(secret), `nothing like ${secret} gets through`);
  assert.deepEqual(out.sessions.map((s) => s.id), ['bbbbbbbb', 'cccccccc'], 'the most recent session, and the one a recent request belongs to, newest first');
  const b = out.sessions[0];
  assert.equal(b.state, 'waiting', 'the live state wins over the recorded one');
  assert.deepEqual(b.tickets, ['TASK-0002'], 'tickets from the status changes and the notes it wrote, only those the model holds');
  assert.deepEqual(b.changed, [['TASK-0002', 'done', '2026-10-20T11:00:00Z']]);
  assert.deepEqual(b.cost, { usd: 1.23, context: 26, window: 1000000, minutes: 10, fiveHour: 39, week: 80 });
  assert.deepEqual([b.files, b.prompts, b.tools], [2, 1, { Bash: 3 }], 'counts only');
  assert.deepEqual(out.requests, [{ session: 'cccccccc', agent: 'claude', tool: 'Bash', kind: 'permission', status: 'granted', ts: '2026-10-19T11:00:00Z', closed: '2026-10-19T11:00:05Z' }], 'a request keeps its tool and outcome, never its command');
});

test('the recorded fixtures hold only short words, ids, times and numbers', () => {
  const dir = path.join(desktopRoot, 'fixtures', 'agents');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-sessions.json'));
  assert.ok(files.length >= 3, 'Deck, your-trainer and the cockpit are recorded');
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const f of files) walk(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
  const bad = strings.filter((s) => s.length > 40 || /[/\\\s]/.test(s.replace(/^\d{4}-\d{2}-\d{2}T[\d:.+]+(Z|[+-]\d{2}:\d{2})?$/, '')));
  assert.deepEqual(bad, [], 'no string in the fixtures is long, holds a path or holds spaces (text would)');
});

test('the page holds every recorded session of every workspace, and loads nothing else from outside', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-agents-'));
  try {
    const page = path.join(out, 'agents.html');
    const run = spawnSync(process.execPath, [path.join(desktopRoot, 'scripts', 'agents-page.mjs'), '--page', page], { encoding: 'utf-8' });
    assert.equal(run.status, 0, run.stderr);
    const html = fs.readFileSync(page, 'utf-8');
    const data = JSON.parse(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(html)[1]);
    for (const ws of ['deck', 'your-trainer', 'cockpit']) {
      const recorded = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'agents', `${ws}-sessions.json`), 'utf-8'));
      assert.deepEqual(data[ws].agents.sessions.map((s) => s.id), recorded.sessions.map((s) => s.id), `${ws}: every recorded session`);
      const model = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'agents', `${ws}.json`), 'utf-8'));
      for (const s of recorded.sessions) for (const t of s.tickets) assert.ok(model.tickets[t] !== undefined, `${ws}: ${s.id}'s ticket ${t} is a ticket of the workspace`);
    }
    assert.match(html, /<title>DES-0006 Agent sessions<\/title>/);
    assert.match(html, /window\.__agents/, 'the agents layer is on the page');
    assert.deepEqual([...html.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/')), [], 'nothing else from outside');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
