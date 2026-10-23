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

// --- TASK-0198: the composer ---

const { MODELS, EFFORTS } = load('shared/agent-pane.js');

test('the composer offers Send to a session waiting or idle, Interrupt to one at work, Resume to one not running, and Stop while it runs', () => {
  const row = (state) => composerOf({ state });
  assert.deepEqual(row('working'), { send: false, interrupt: true, resume: false, stop: true });
  assert.deepEqual(row('waiting'), { send: true, interrupt: false, resume: false, stop: true });
  assert.deepEqual(row('idle'), { send: true, interrupt: false, resume: true, stop: true });
  assert.deepEqual(row('stopped'), { send: false, interrupt: false, resume: true, stop: false });
  assert.deepEqual(row('failed'), { send: false, interrupt: false, resume: true, stop: false });
});

test('each agent is offered its own models and efforts, and the access levels never include skipping permissions', () => {
  assert.deepEqual(MODELS.claude.map((m) => m.id), ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1']);
  assert.deepEqual(MODELS.codex.map((m) => m.word), ['GPT-6 Astra', 'Codex default']);
  assert.ok(EFFORTS.claude.includes('max') && !EFFORTS.codex.includes('max'));
  assert.deepEqual(Object.keys(ACCESS_WORD), ['ask', 'edits']);
  assert.doesNotMatch(JSON.stringify(ACCESS_WORD), /skip|bypass|danger/i);
});

// --- TASK-0199: agents over their start tickets, and the Agents list ---

import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';

const { agentMarkers, cockpitSummaries, deckSummaries, allSummaries, agentsPanel, startOf } = load('shared/agent-marks.js');
const { towersLayout, towersPlan, cubesOf } = load('shared/overview-towers.js');
const { wheelScene } = load('shared/overview-wheel.js');
const { phaseScene } = load('shared/overview-phase.js');
const { plainContext, walkScene } = load('shared/overview-scene.js');
const { parseAddress, formatAddress } = load('shared/address.js');
const { checkScene } = load('shared/overview-checks.js');
const { cockpitSessionsOf } = load('main/agents/ipc.js');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf8'));
const ctx = plainContext('abcd1234', 'overview');

/** One ticket of each place a marker can stand over: in a tower, a tile, the core, the shelf. */
function places(model) {
  const layout = towersLayout(model, ctx);
  const tower = layout.phases.flatMap((p) => p.towers)[0];
  return {
    layout,
    tower: tower.cubes[0].id,
    towerTop: tower.top,
    tile: layout.phases.flatMap((p) => p.tiles)[0]?.id ?? null,
    core: layout.core[0]?.id ?? null,
    shelf: layout.shelf.flatMap((s) => s.cubes)[0]?.id ?? null,
  };
}
const deckSession = (id, ticket, over = {}) => session({ id, ticket, workspaceId: 'abcd1234', lastActive: at(100), ...over });

for (const name of ['deck', 'your-trainer']) {
  test(`${name}: each Deck session stands over its exact start ticket, a tower's top or a tile, and one on no ticket the workspace holds is only in the list`, () => {
    const model = fixture(name);
    const p = places(model);
    const sessions = [deckSession('aaaaaaaa-1', p.tower), deckSession('bbbbbbbb-2', p.tower, { agent: 'codex', state: 'working' }), deckSession('cccccccc-3', 'TASK-9999'), ...(p.tile ? [deckSession('dddddddd-4', p.tile, { state: 'waiting' })] : []), ...(p.core ? [deckSession('eeeeeeee-5', p.core)] : []), ...(p.shelf ? [deckSession('ffffffff-6', p.shelf)] : [])];
    const summaries = deckSummaries(sessions, 'abcd1234');
    const marks = agentMarkers(p.layout, summaries, (id) => `t:${id}`);
    const by = new Map(marks.map((m) => [m.id, m]));
    assert.equal(by.get('aaaaaaaa-1').ticket, p.tower);
    assert.ok(by.get('aaaaaaaa-1').at[1] > p.towerTop, 'over the tower, not inside it');
    assert.ok(by.get('bbbbbbbb-2').at[1] > by.get('aaaaaaaa-1').at[1], 'two over one tower stand one above the other');
    assert.deepEqual([by.get('bbbbbbbb-2').agent, by.get('bbbbbbbb-2').state], ['codex', 'working']);
    assert.ok(!by.has('cccccccc-3'), 'a ticket the workspace does not hold has no marker');
    if (p.tile) assert.equal(by.get('dddddddd-4').state, 'waiting');
    for (const id of ['eeeeeeee-5', 'ffffffff-6']) if (summaries.some((s) => s.id === id)) assert.ok(by.has(id), `${id} on the core or the shelf`);
    const list = agentsPanel(summaries, ctx, null, { x: 0, y: 0, w: 100, h: 100 }, 99);
    assert.equal(list.rows.length, summaries.length, 'every session is in the list, the one on no ticket too');
    assert.ok(list.rows.some((r) => r.label.includes('cccccccc') && r.label.includes('on TASK-9999')));
    assert.equal(new Set(list.rows.map((r) => r.id)).size, list.rows.length, 'once each');
  });

  test(`${name}: the wheel draws every marker in the flat plan and the Agents list, and passes its checks`, () => {
    const model = fixture(name);
    const p = places(model);
    const agents = deckSummaries([deckSession('aaaaaaaa-1', p.tower, { state: 'waiting' }), deckSession('cccccccc-3', null)], 'abcd1234');
    const scene = wheelScene(model, ctx, { agents });
    const nodes = [...walkScene(scene.nodes)];
    const marks = nodes.filter((n) => n.kind === 'mark' && /\bov-agent\b/.test(n.cls ?? ''));
    assert.equal(marks.length, 1);
    assert.equal(parseAddress(marks[0].target).session, 'aaaaaaaa-1');
    const panel = nodes.find((n) => n.kind === 'panel' && n.key === 'agents');
    assert.deepEqual(panel.body.rows.map((r) => [r.id, r.start]), [['aaaaaaaa-1', p.tower], ['cccccccc-3', null]], 'the one waiting for you first');
    assert.match(panel.label, /2 agent sessions, 1 waiting for you/);
    for (const r of checkScene(scene)) assert.ok(r.ok, `${r.rule}: ${r.detail}`);
  });
}

test('a page given no sessions has no marker and no Agents list, as a served page (RISK-0015)', () => {
  const model = fixture('deck');
  const scene = wheelScene(model, ctx, {});
  const nodes = [...walkScene(scene.nodes)];
  assert.ok(!nodes.some((n) => n.kind === 'panel' && n.key === 'agents'));
  assert.ok(!nodes.some((n) => n.kind === 'mark' && /\bov-agent\b/.test(n.cls ?? '')));
  assert.deepEqual(nodes.find((n) => n.kind === 'towers').layout.agents, []);
});

test('an open session joins its marker to the tickets it worked on, makes the right side clear, and its address round-trips', () => {
  const model = fixture('deck');
  const p = places(model);
  const agents = deckSummaries([deckSession('aaaaaaaa-1', p.tower)], 'abcd1234');
  const scene = wheelScene(model, ctx, { agents, session: 'aaaaaaaa-1' });
  const layout = [...walkScene(scene.nodes)].find((n) => n.kind === 'towers').layout;
  assert.equal(layout.selection, null);
  assert.equal(layout.session.id, 'session:aaaaaaaa-1');
  assert.deepEqual(layout.session.links.map((l) => l.id), [p.tower]);
  assert.deepEqual(layout.session.at, layout.agents[0].at, 'the curves start at its marker');
  const address = parseAddress(scene.address);
  assert.equal(address.session, 'aaaaaaaa-1');
  assert.equal(formatAddress(address), scene.address);
  const panels = [...walkScene(scene.nodes)].filter((n) => n.kind === 'panel').map((n) => n.key);
  assert.ok(!panels.includes('needs-you') && !panels.includes('weeks'), 'the session pane stands where they were');
  assert.ok(!panels.includes('agents') && !panels.some((k) => /board|next/.test(k)), 'and the left side makes way for the ring, which moves left of the pane');
  assert.equal(parseAddress(scene.list.find((r) => r.id === 'back').target).session, null, 'Escape closes it');
  assert.ok([...walkScene(scene.nodes)].some((n) => n.kind === 'mark' && /ov-agent .*is-open/.test(n.cls ?? '')));
  assert.throws(() => parseAddress('deck://abcd1234/overview?page=phase&note=PHASE-0001&session=abc'), /session/);
});

test('a phase brought close draws only its own agents', () => {
  const model = fixture('deck');
  const layout = towersLayout(model, ctx);
  const [a, b] = layout.phases.filter((p) => p.towers.length > 0);
  const agents = deckSummaries([deckSession('aaaaaaaa-1', a.towers[0].cubes[0].id), deckSession('bbbbbbbb-2', b.towers[0].cubes[0].id)], 'abcd1234');
  const scene = phaseScene(model, a.id, ctx, { agents });
  const marks = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && /\bov-agent\b/.test(n.cls ?? '') && n.markId?.startsWith('agent-'));
  assert.deepEqual(marks.map((m) => m.markId), ['agent-aaaaaaaa-1']);
});

test('a cockpit session stands over the first ticket whose status it changed, and Deck\'s own sessions are not counted twice', () => {
  const model = fixture('deck');
  const ids = Object.keys(model.tickets).slice(0, 3);
  const payload = { sessions: [
    { session_id: 'cock-1', agent: 'claude', state: 'busy', started: at(10), ended: null, live: true, status_touched: { b: { id: ids[1], ts: at(30) }, a: { id: ids[0], ts: at(20) }, x: { id: 'TASK-9999', ts: at(5) } } },
    { session_id: 'cock-2', agent: 'codex', state: 'idle', started: at(1), ended: at(2), live: false, status_touched: {} },
    { session_id: 'deck-own', agent: 'claude', state: 'busy', started: at(3), ended: null, live: true, status_touched: {} },
  ] };
  const got = cockpitSummaries(payload, model, new Set(['deck-own']));
  assert.deepEqual(got.map((s) => [s.id, s.start, s.state, s.source]), [['cock-1', ids[0], 'working', 'cockpit'], ['cock-2', null, 'stopped', 'cockpit']]);
  assert.deepEqual(got[0].tickets, [ids[0], ids[1]], 'in the order the cockpit first saw them; one the workspace does not hold is left out');
  assert.equal(startOf({ changed: [['TASK-1', 'done']] }), 'TASK-1');
  const all = allSummaries(deckSummaries([deckSession('deck-own', ids[2], { state: 'waiting' })], 'abcd1234'), got);
  assert.deepEqual(all.map((s) => s.id), ['deck-own', 'cock-1', 'cock-2'], 'waiting first, then working, then the rest');
});

test('the cockpit\'s sessions reach the window without their prompts, files or costs', () => {
  const out = cockpitSessionsOf({ sessions: [{ session_id: 's1', agent: 'codex', state: 'idle', started: 'a', ended: null, live: true, last_prompt: 'secret words', prompts: ['secret words'], files: ['/private/x'], cost: { usd: 3 }, transcript_path: '/t', status_touched: { 'features/x.md': { id: 'FEAT-0001', status: 'done', ts: 't1', title: 'T' } } }] });
  assert.deepEqual(out, { sessions: [{ session_id: 's1', agent: 'codex', state: 'idle', started: 'a', ended: null, live: true, status_touched: { 0: { id: 'FEAT-0001', ts: 't1' } } }] });
  assert.doesNotMatch(JSON.stringify(out), /secret|private|usd|transcript/);
});

// --- TASK-0200: Work on this ---

const { firstPrompt, startDefaults } = load('shared/agent-marks.js');
const { WORK_ON } = load('shared/overview-select.js');

test('the first prompt is what the ticket asks of you when it needs you, else Work on with its id and title', () => {
  assert.equal(firstPrompt({ id: 'TASK-0007', title: 'An invented ticket', needsYou: true, needs: { say: 'decide which of two layouts to keep' } }), 'TASK-0007 An invented ticket: decide which of two layouts to keep');
  assert.equal(firstPrompt({ id: 'TASK-0008', title: 'Another invented ticket', needsYou: false }), 'Work on TASK-0008: Another invented ticket');
  assert.equal(firstPrompt({ id: 'TASK-0009', title: 'T', needsYou: true, needs: { say: '  ' } }), 'Work on TASK-0009: T', 'an empty ask falls back');
});

test('the dialog starts on Claude, its first model and effort, Ask before acting, in this checkout', () => {
  const d = startDefaults({ id: 'TASK-0008', title: 'Another invented ticket' });
  assert.deepEqual(d, { agent: 'claude', model: 'claude-opus-5-5', effort: 'high', access: 'ask', place: 'checkout', prompt: 'Work on TASK-0008: Another invented ticket' });
});

for (const name of ['deck', 'your-trainer']) {
  test(`${name}: Work on this is on a selected ticket's card in the shell only, on the wheel and with a phase close`, () => {
    const model = fixture(name);
    const p = places(model);
    const buttons = (scene) => [...walkScene(scene.nodes)].filter((n) => n.kind === 'panel' && n.body.kind === 'card').flatMap((n) => n.body.buttons);
    const shell = buttons(wheelScene(model, ctx, { select: p.tower, agents: [] }));
    const work = shell.find((b) => b.key === 'work');
    assert.equal(work.action, `${WORK_ON}${p.tower}`);
    assert.equal(work.text, '▶ Work on this');
    assert.ok(!buttons(wheelScene(model, ctx, { select: p.tower })).some((b) => b.key === 'work'), 'a served page has no Work on this');
    const phase = towersLayout(model, ctx).phases.find((x) => x.towers.some((t) => t.cubes.some((c) => c.id === p.tower)));
    assert.ok(buttons(phaseScene(model, phase.id, ctx, { select: p.tower, agents: [] })).some((b) => b.key === 'work'));
    const scene = wheelScene(model, ctx, { select: p.tower, agents: [] });
    assert.ok(scene.list.some((r) => r.id === 'card-work' && r.action === `${WORK_ON}${p.tower}`), 'the keyboard list has it too');
    for (const r of checkScene(scene)) assert.ok(r.ok, `${r.rule}: ${r.detail}`);
  });
}

test('what the dialog sends, with its defaults or with Codex chosen, is a start the main process accepts', () => {
  const { parseStart } = load('main/agents/ipc.js');
  const rootOf = (id) => (id === 'abcd1234' ? '/repo' : null);
  const d = startDefaults({ id: 'TASK-0008', title: 'Another invented ticket' });
  const req = parseStart({ workspaceId: 'abcd1234', ticket: 'TASK-0008', ...d }, rootOf);
  assert.deepEqual([req.root, req.ticket, req.agent, req.access, req.place, req.prompt], ['/repo', 'TASK-0008', 'claude', 'ask', 'checkout', 'Work on TASK-0008: Another invented ticket']);
  for (const m of MODELS.codex) for (const effort of EFFORTS.codex) assert.equal(typeof parseStart({ workspaceId: 'abcd1234', ticket: 'TASK-0008', ...d, agent: 'codex', model: m.id, effort, place: 'worktree', access: 'edits' }, rootOf), 'object', `${m.id} ${effort}`);
});

// --- TASK-0209: the review's round one ---

import { loadWeb, standInPage } from './stand-in-page.mjs';
const { panelSvgNodes } = load('shared/overview-panel.js');

test('a session open with no marker is still open: it stays in the address, the right side makes way, and Escape closes it', () => {
  const model = fixture('deck');
  for (const ticket of [null, 'TASK-9999']) {
    const agents = deckSummaries([deckSession('aaaaaaaa-1', ticket)], 'abcd1234');
    const scene = wheelScene(model, ctx, { agents, session: 'aaaaaaaa-1' });
    assert.equal(parseAddress(scene.address).session, 'aaaaaaaa-1', `on ${ticket ?? 'no ticket'}`);
    const panels = [...walkScene(scene.nodes)].filter((n) => n.kind === 'panel').map((n) => n.key);
    assert.ok(!panels.includes('needs-you') && !panels.includes('weeks'), 'the pane stands where they were');
    assert.equal(parseAddress(scene.list.find((r) => r.id === 'back').target).session, null, 'Escape closes it');
  }
  // A page given no sessions to show opens none, whatever its address says.
  assert.equal(parseAddress(wheelScene(model, ctx, { session: 'aaaaaaaa-1' }).address).session, null);
});

test('the head draws how full the context is and how much of the limit is used, from the latest each, and no cost', () => {
  const records = [...CONVERSATION,
    { kind: 'usage', at: at(16), context: { used: 40000, window: 200000 } },
    { kind: 'usage', at: at(17), limit: { percent: 12.4, window: '5-hour' } },
    { kind: 'usage', at: at(18), context: { used: 170000, window: 200000 } }];
  const m = paneOf(session(), records);
  assert.deepEqual([m.context.percent, m.context.words], [85, 'context 85% (170k of 200k)']);
  assert.deepEqual([m.limit.percent, m.limit.words], [12, '12% of the 5-hour limit used']);
  assert.deepEqual(paneTurns(records), paneTurns(CONVERSATION), 'usage draws in no turn');
  assert.deepEqual(paneTurns([{ kind: 'usage', at: at(0), limit: { percent: 3, window: 'weekly' } }, ...CONVERSATION]), paneTurns(CONVERSATION), 'nor starts one of its own');
  const none = paneOf(session(), CONVERSATION);
  assert.deepEqual([none.context, none.limit], [null, null], 'nothing until the agent reports it');
  assert.equal(paneOf(session(), [{ kind: 'usage', at: at(1), context: { used: 5, window: 0 } }]).context, null, 'a window of nothing is no bar');
  assert.doesNotMatch(JSON.stringify(m), /\$|usd|cost/i);
});

test('a Deck session lists the tickets it moved, from the cockpit\'s record of the same session, its start ticket first', () => {
  const model = fixture('deck');
  const ids = Object.keys(model.tickets).slice(0, 3);
  const cockpit = { sessions: [{ session_id: 'aaaaaaaa-1', agent: 'claude', state: 'busy', started: at(1), ended: null, live: true, status_touched: { b: { id: ids[2], ts: at(30) }, a: { id: ids[1], ts: at(20) }, x: { id: 'TASK-9999', ts: at(5) } } }] };
  const [s] = deckSummaries([deckSession('aaaaaaaa-1', ids[0])], 'abcd1234', cockpit, model);
  assert.deepEqual(s.moved, [ids[1], ids[2]], 'in the order the cockpit saw them; one the workspace does not hold is left out');
  assert.deepEqual(s.tickets, [ids[0], ids[1], ids[2]]);
  assert.deepEqual(cockpitSummaries(cockpit, model, new Set(['aaaaaaaa-1'])), [], 'and it is not also a cockpit session');
  assert.deepEqual(paneOf(session(), CONVERSATION, s.moved).moved, [ids[1], ids[2]]);
  assert.deepEqual(deckSummaries([deckSession('aaaaaaaa-1', ids[0])], 'abcd1234')[0].moved, [], 'with no cockpit record, none');
});

test('the Agents list leaves no session out: every cockpit session is kept, the window lists all, and the flat picture counts those it does not draw', async () => {
  const model = fixture('deck');
  const payload = { sessions: Array.from({ length: 14 }, (_, i) => ({ session_id: `cock-${i}`, agent: 'claude', state: 'idle', started: at(i), ended: null, live: true, status_touched: {} })) };
  const cockpit = cockpitSummaries(payload, model, new Set());
  assert.equal(cockpit.length, 14);
  const all = allSummaries(deckSummaries([deckSession('aaaaaaaa-1', null)], 'abcd1234'), cockpit);
  const { node, rows } = agentsPanel(all, ctx, null, { x: 0, y: 0, w: 420, h: 196 });
  assert.equal(rows.length, 15);
  assert.equal(node.body.rows.length, 15);
  assert.match(node.label, /^15 agent sessions/);
  const flat = [...walkScene(panelSvgNodes(node))].filter((n) => n.kind === 'text').map((n) => n.text);
  assert.ok(flat.includes('+10 more sessions'), flat.join(' | '));
  const { buildPanels } = await loadWeb('renderer/overview-panels.js');
  const document = standInPage();
  const scene = { screen: 'wheel', address: ctx.address({ page: 'wheel' }), width: 1600, height: 1000, title: 't', nodes: [node], list: rows };
  const layer = buildPanels(scene, document.createElement('div'), { reduced: true, loader: null });
  const descendants = (n) => [n, ...n.children.flatMap(descendants)];
  assert.equal(descendants(layer.element).filter((n) => (n.className ?? '').includes('ov-agent-row')).length, 15, 'the window draws every row, in a list that scrolls');
});

test('with no bridge, as on a served page, the overview is given no sessions and no Needs you extras, not empty lists', async () => {
  const { agentsFor, needsFor, watchAgents } = await loadWeb('renderer/agent-state.js');
  watchAgents(null, () => undefined);
  assert.equal(agentsFor('abcd1234', fixture('deck')), undefined);
  assert.equal(needsFor('abcd1234'), undefined);
});

test('the composer starts empty for each session it opens, a Stop armed on one is not armed on the next, and a failed Send gives the text back with why', async () => {
  const document = standInPage();
  const { AgentPane } = await loadWeb('renderer/agent-pane.js');
  const a = session({ id: 'aaaaaaaa-1' });
  const b = session({ id: 'bbbbbbbb-2' });
  const said = [];
  const sent = [];
  const agents = {
    list: async () => [a, b],
    conversation: async () => [],
    subscribe: () => () => undefined,
    send: async (id, text) => { sent.push([id, text]); return { ok: false, error: 'the session has ended' }; },
    interrupt: async () => ({ ok: true }), stop: async () => ({ ok: true }), answer: async () => ({ ok: true }),
  };
  const pane = new AgentPane({ agents, parent: document.createElement('div'), say: (m) => said.push(m), closed: () => undefined });
  const box = () => pane.composer.children[0];
  const buttons = () => pane.composer.children[2].children;
  const press = (word) => buttons().find((x) => x.textContent.startsWith(word)).fire('click');
  assert.ok(await pane.open(a.id));
  box().value = 'words for the first';
  box().fire('input');
  press('Stop');
  assert.ok(buttons().some((x) => x.textContent === 'Stop? Press again'));
  assert.ok(await pane.open(b.id));
  assert.equal(box().value, '', 'the first session\'s words are not in the second\'s box');
  assert.ok(buttons().some((x) => x.textContent === 'Stop'), 'nor is its armed Stop');
  box().value = 'push it, invented';
  box().fire('input');
  press('Send');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(sent, [[b.id, 'push it, invented']]);
  assert.equal(box().value, 'push it, invented', 'a prompt that did not go is given back');
  assert.deepEqual(said, ['the session has ended']);
  pane.close(false);
  assert.ok(await pane.open(b.id));
  assert.equal(box().value, '', 'closing forgets it');
});

test('the pane draws the two bars and the tickets moved in its head, and a Send whose call throws still gives the text back', async () => {
  const document = standInPage();
  const { AgentPane } = await loadWeb('renderer/agent-pane.js');
  const a = session({ id: 'aaaaaaaa-1' });
  const said = [];
  const agents = {
    list: async () => [a],
    conversation: async () => [{ kind: 'usage', at: at(1), context: { used: 170000, window: 200000 } }, { kind: 'usage', at: at(2), limit: { percent: 40, window: '5-hour' } }],
    subscribe: () => () => undefined,
    send: async () => { throw new Error('the main process is gone'); },
    interrupt: async () => ({ ok: true }), stop: async () => ({ ok: true }), answer: async () => ({ ok: true }),
  };
  const pane = new AgentPane({ agents, parent: document.createElement('div'), say: (m) => said.push(m), closed: () => undefined });
  assert.ok(await pane.open(a.id));
  pane.setMoved(['TASK-0002', 'TASK-0003']);
  const head = pane.body.children[0];
  const bars = head.children.filter((c) => (c.className ?? '').startsWith('ag-bar'));
  assert.deepEqual(bars.map((b) => [b.className, b.getAttribute('aria-label')]), [['ag-bar is-high', 'context 85% (170k of 200k)'], ['ag-bar', '40% of the 5-hour limit used']]);
  assert.equal(head.children.find((c) => c.className === 'ag-moved').textContent, 'Moved TASK-0002, TASK-0003');
  const box = pane.composer.children[0];
  box.value = 'invented words';
  box.fire('input');
  pane.composer.children[2].children.find((x) => x.textContent === 'Send').fire('click');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(pane.composer.children[0].value, 'invented words');
  assert.deepEqual(said, ['the main process is gone']);
});
