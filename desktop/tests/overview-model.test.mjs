// TST-0080: DES-0004's rules, exercised through the public builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';
const { buildOverview, parseExitCriteria } = load('shared/overview-model.js');
const { recordFrom } = load('shared/records.js');

function note(id, type, status, fields = {}) {
  return { ...recordFrom(`${id}.md`, `---\nid: ${id}\ntype: ${type}\nstatus: ${status}\n---\n# ${id}`, 0).record,
    frontmatter: { id, type, status, ...fields } };
}
const phase = (id, fields = {}, status = 'active') => note(id, 'phase', status, fields);
const run = (records, options = {}) => buildOverview(records, { workspace: 'Example', readBody: () => '', ...options });

const rows = [
  ['requirement', { implemented: 'closed', approved: 'open', draft: 'open', retired: 'dropped', superseded: 'dropped' }],
  ['feature', { done: 'closed', doing: 'progress', review: 'progress', backlog: 'open', planned: 'open', cancelled: 'dropped', superseded: 'dropped', deferred: 'dropped' }],
  ['task', { done: 'closed', doing: 'progress', backlog: 'open', cancelled: 'dropped', superseded: 'dropped', deferred: 'dropped' }],
  ['test', { active: 'closed', passing: 'closed', ready: 'open', failing: 'failed', retired: 'dropped' }],
  ['issue', { fixed: 'closed', open: 'open', triage: 'open', declined: 'dropped', deferred: 'dropped' }],
  ['adr', { accepted: 'closed', proposed: 'open', draft: 'open', superseded: 'dropped', declined: 'dropped' }],
  ['design', { accepted: 'closed', proposed: 'open', draft: 'open', superseded: 'dropped', declined: 'dropped' }],
  ['risk', { closed: 'closed', mitigating: 'progress', open: 'open' }],
];
for (const [type, statuses] of rows) test(`state table: ${type}`, () => {
  for (const [status, expected] of Object.entries(statuses)) {
    const model = run([note('TICKET-001', type, status)]);
    assert.equal(model.tickets['TICKET-001'].state, expected, status);
  }
  assert.equal(run([note('TICKET-001', type, 'unknown')]).tickets['TICKET-001'].state, 'open');
});

test('acceptance uses platform results and never treats a note status as a verdict', () => {
  const check = note('TST-0001', 'test', 'active', { level: 'acceptance' });
  for (const [results, expected] of [
    [[], 'open'], [['pass', 'na'], 'closed'], [['pass', 'partial'], 'open'], [['pass', 'fail'], 'failed'], [['passed', 'excused'], 'closed'], [['passed', 'not-run'], 'open'],
    [['passed', 'withdrawn'], 'owed'], [['invalidated', 'failed'], 'failed'], [['passed', 'failed'], 'failed'],
  ]) assert.equal(run([check], { acceptanceResults: { 'TST-0001': results } }).tickets['TST-0001'].state, expected);
  assert.equal(run([check]).tickets['TST-0001'].state, 'open');
  for (const [status, expected] of [['passing', 'open'], ['failing', 'open'], ['withdrawn', 'open'], ['retired', 'dropped']]) {
    assert.equal(run([{ ...check, status }]).tickets['TST-0001'].state, expected);
  }
  assert.equal(run([{ ...check, status: 'retired' }], { acceptanceResults: { 'TST-0001': ['failed'] } }).tickets['TST-0001'].state, 'dropped');
  assert.equal(run([note('TST-0002', 'test', 'passing')], { ciGreen: false }).tickets['TST-0002'].state, 'open');
});

test('all five placement rules apply in order and project-wide types ignore phase claims', () => {
  const p1 = phase('PHASE-0001', { features: ['[[FEAT-0001]]'], tasks: ['[[TASK-0001]]', '[[TASK-0002]]', '[[TASK-0003]]'] });
  const p2 = phase('PHASE-0002');
  const records = [p1, p2,
    note('FEAT-0001', 'feature', 'doing', { phase: '[[PHASE-0002]]' }),
    note('TASK-0001', 'task', 'backlog', { phase: '[[PHASE-0002]]', parent: '[[FEAT-0001]]' }),
    note('TASK-0002', 'task', 'backlog', { parent: '[[FEAT-0001]]' }),
    note('TASK-0003', 'task', 'backlog', { phase: '[[PHASE-404]]' }),
    note('TASK-0004', 'task', 'backlog', { parent: '[[FEAT-0001]]' }),
    note('REQ-0001', 'requirement', 'draft', { implements: ['[[FEAT-0001]]'] }),
    note('TST-0001', 'test', 'ready', { covers: ['[[FEAT-0001]]'] }),
    note('ISS-0001', 'issue', 'open'),
    ...['adr', 'design', 'risk'].map((type, i) => note(`GLOBAL-000${i}`, type, 'draft', { phase: '[[PHASE-0001]]', parent: '[[FEAT-0001]]' })),
  ];
  const model = run(records);
  for (const [id, placement, home] of [
    ['FEAT-0001', 'own', 'PHASE-0002'], ['TASK-0001', 'own', 'PHASE-0002'],
    ['TASK-0002', 'member-list', 'PHASE-0001'], ['TASK-0003', 'member-list', 'PHASE-0001'],
    ['TASK-0004', 'parent', 'PHASE-0002'], ['REQ-0001', 'parent', 'PHASE-0002'], ['TST-0001', 'parent', 'PHASE-0002'],
    ['ISS-0001', 'none', null], ...[0, 1, 2].map((i) => [`GLOBAL-000${i}`, 'project-wide', null]),
  ]) assert.deepEqual([model.tickets[id].placedBy, model.tickets[id].phase], [placement, home], id);
  const homes = [...model.core.tickets, ...model.phases.flatMap((p) => p.tickets)];
  assert.equal(homes.length, new Set(homes).size);
  assert.equal(homes.length, Object.keys(model.tickets).length);
  assert.deepEqual(run(records.slice().reverse()), model, 'input order does not change placement');
});

test('feature inheritance handles chains and cycles without losing tickets', () => {
  const records = [phase('PHASE-0001'), note('FEAT-0001', 'feature', 'done', { parent: '[[FEAT-0002]]' }),
    note('FEAT-0002', 'feature', 'done', { phase: '[[PHASE-0001]]' }),
    note('FEAT-0003', 'feature', 'done', { parent: '[[FEAT-0004]]' }),
    note('FEAT-0004', 'feature', 'done', { parent: '[[FEAT-0003]]' })];
  const model = run(records);
  assert.equal(model.tickets['FEAT-0001'].phase, 'PHASE-0001');
  assert.deepEqual(model.core.tickets, ['FEAT-0003', 'FEAT-0004']);
});

test('phases sort by order, split into three kinds, and sort tickets by kind then state', () => {
  const records = [phase('PHASE-0001', { order: 2 }), phase('PHASE-0002', { order: 1 }),
    phase('PHASE-0003', {}, 'done'), phase('PHASE-0004', {}, 'superseded'), phase('PHASE-999'),
    phase('PHASE-0005', { kind: 'backlog' }),
    ...[['ISS-0001', 'issue', 'fixed'], ['TST-0001', 'test', 'active'], ['TASK-0001', 'task', 'backlog'],
      ['TASK-0002', 'task', 'doing'], ['TASK-0003', 'task', 'done'], ['TASK-0004', 'task', 'deferred'],
      ['REQ-0001', 'requirement', 'draft'], ['FEAT-0001', 'feature', 'doing']]
      .map(([id, type, status]) => note(id, type, status, { phase: '[[PHASE-0001]]' }))];
  const model = run(records);
  assert.deepEqual(model.phases.map((p) => p.id), ['PHASE-0002', 'PHASE-0001']);
  assert.deepEqual(model.shelf.map((p) => p.id), ['PHASE-0003', 'PHASE-0004']);
  assert.deepEqual(model.backlog.map((p) => p.id), ['PHASE-0005', 'PHASE-999']);
  assert.equal(model.phases[0].number, '002');
  assert.deepEqual(model.phases[1].tickets, ['REQ-0001', 'FEAT-0001', 'TASK-0003', 'TASK-0002', 'TASK-0001', 'TASK-0004', 'TST-0001', 'ISS-0001']);
});

test('exit criteria preserve checkbox text and ticked state, and distinguish prose from absence', () => {
  assert.deepEqual(parseExitCriteria('# Example\n## Exit Criteria\n- [x] First\n  continued\n- [ ] Second\n### Detail\n* [X] Third\n```md\n- [ ] Example\n```\n## Notes\n- [ ] Elsewhere'), {
    items: [{ text: 'First continued', ticked: true }, { text: 'Second', ticked: false }, { text: 'Third', ticked: true }], prose: false,
  });
  assert.deepEqual(parseExitCriteria('## Exit Criteria\nFinish the work.\n## Notes\n- [ ] Elsewhere'), { items: [], prose: true });
  assert.deepEqual(parseExitCriteria('## Goal\nNo exit section'), { items: [], prose: false });
  const p = run([phase('PHASE-0001')], { readBody: () => '# A short name\n## Exit Criteria\n- [ ] Finish it' }).phases[0];
  assert.equal(p.name, 'A short name');
  assert.equal(p.exit.items[0].text, 'Finish it');
});

test('wikilinks resolve in frontmatter and bodies without treating cross-repo ids as local', () => {
  const target = { ...note('FEAT-0001', 'feature', 'doing'), aliases: ['The feature'] };
  const records = [target, note('TASK-0001', 'task', 'doing', { parent: '[[FEAT-0001-old-slug|name]]', related: ['[[TASK-0001]]', '[[other#FEAT-0001]]'] })];
  const model = run(records, { readBody: (rel) => rel === 'TASK-0001.md' ? '[[The feature#Goal]] [[missing]] ![[IMAGE-0001]]' : '' });
  assert.deepEqual(model.tickets['TASK-0001'].links, ['FEAT-0001']);
});

test('suggestions prefer unique link plurality, then unique inclusive date range; neither moves a ticket', () => {
  const records = [phase('PHASE-0001', { created: '2026-01-01', updated: '2026-02-01' }),
    phase('PHASE-0002', { created: '2026-02-01', updated: '2026-03-01' }),
    ...[1, 2, 3].map((i) => note(`TASK-000${i}`, 'task', 'done', { phase: `[[PHASE-000${i === 3 ? 2 : 1}]]` })),
    note('ISS-0001', 'issue', 'open', { related: ['[[TASK-0001]]', '[[TASK-0002]]', '[[TASK-0003]]'], created: '2026-03-01' }),
    note('ISS-0002', 'issue', 'open', { related: ['[[TASK-0001]]', '[[TASK-0003]]'] }),
    note('ISS-0003', 'issue', 'open', { created: '2026-03-01' }),
    note('ISS-0004', 'issue', 'open', { created: '2026-02-01' }),
    note('ISS-0005', 'issue', 'open', { created: '2026-02-30' }),
    note('RISK-0001', 'risk', 'open', { created: '2026-03-01' })];
  const { tickets } = run(records);
  assert.deepEqual(tickets['ISS-0001'].suggestion, { phase: 'PHASE-0001', by: 'links' });
  assert.deepEqual(tickets['ISS-0003'].suggestion, { phase: 'PHASE-0002', by: 'dates' });
  for (const id of ['ISS-0002', 'ISS-0004', 'ISS-0005', 'RISK-0001']) assert.equal(tickets[id].suggestion, undefined, id);
  assert.equal(tickets['ISS-0001'].phase, null);
});

test('templates and other note types are excluded; duplicate ticket ids fail instead of disappearing', () => {
  const r = note('TASK-0001', 'task', 'done');
  assert.deepEqual(Object.keys(run([{ ...r, relPath: '__templates__/task.md' }, note('REF-0001', 'reference', 'active'), note('REF-0002', 'constructor', 'active')]).tickets), []);
  assert.throws(() => run([r, { ...r, relPath: 'other.md' }]), /Duplicate overview ticket/);
  const records = [phase('PHASE-0001'), r]; const before = structuredClone(records);
  const model = run(records, { head: 'abc', generated: '2026-10-14T12:00:00Z' });
  assert.equal(model.head, 'abc'); assert.equal(model.generated, '2026-10-14T12:00:00Z');
  assert.deepEqual(records, before);
  assert.equal(Object.keys(run([note('__proto__', 'test', 'retired')]).tickets).length, 1, 'an unusual declared id cannot overwrite the dictionary prototype');
});

test('only feature parents place a ticket, even when another ticket has a phase', () => {
  for (const field of ['parent', 'implements', 'covers']) {
    const model = run([phase('PHASE-0001'),
      note('TASK-0001', 'task', 'done', { phase: '[[PHASE-0001]]' }),
      note('TST-0001', 'test', 'active', { [field]: ['[[TASK-0001]]'] })]);
    assert.equal(model.tickets['TST-0001'].phase, null, field);
    assert.equal(model.tickets['TST-0001'].placedBy, 'none', field);
  }
});

test('a parent link to a non-ticket note is harmless and does not hide a feature parent', () => {
  const model = run([phase('PHASE-0001'), note('REF-0001', 'reference', 'active'),
    note('FEAT-0001', 'feature', 'doing', { phase: '[[PHASE-0001]]' }),
    note('TASK-0001', 'task', 'doing', { parent: ['[[REF-0001]]', '[[PHASE-0001]]', '[[FEAT-0001]]'] }),
    note('TASK-0002', 'task', 'doing', { parent: '[[REF-0001]]' })]);
  assert.equal(model.tickets['TASK-0001'].phase, 'PHASE-0001');
  assert.equal(model.tickets['TASK-0002'].phase, null);
});

test('member-list ties choose the first phase by order, then by id', () => {
  const p1 = phase('PHASE-0001', { order: 2, tasks: ['[[TASK-0001]]'] });
  const p2 = phase('PHASE-0002', { order: 1, tasks: ['[[TASK-0001]]'] });
  const task = note('TASK-0001', 'task', 'doing');
  assert.equal(run([p1, p2, task]).tickets[task.id].phase, 'PHASE-0002');
  p1.frontmatter.order = 1;
  assert.equal(run([p2, p1, task]).tickets[task.id].phase, 'PHASE-0001');
});

test('local lowercase filenames and aliases keep heading links local', () => {
  const local = { ...note('FEAT-0001', 'feature', 'doing', { phase: '[[PHASE-0001]]' }),
    relPath: 'features/some-note.md', fileName: 'some-note', aliases: ['local-alias'] };
  const model = run([phase('PHASE-0001'), local,
    note('TASK-0001', 'task', 'doing', { parent: '[[some-note#Heading]]' }),
    note('TASK-0002', 'task', 'doing', { parent: '[[local-alias#Heading]]' })],
  { readBody: (rel) => rel === 'TASK-0001.md' ? '[[some-note#Heading|shown]] [[other-project#FEAT-0001]]' : '' });
  for (const id of ['TASK-0001', 'TASK-0002']) {
    assert.equal(model.tickets[id].phase, 'PHASE-0001');
    assert.deepEqual(model.tickets[id].links, ['FEAT-0001']);
  }
});

test('real phase frontmatter orders the wheel, shelf and backlog with id ties', () => {
  // Exercise the YAML/index boundary as well as the builder; Deck puts Parity before Vault.
  const parsed = (id, order, status, kind = '') => recordFrom(`${id}.md`,
    `---\nid: ${id}\ntype: phase\nstatus: ${status}\n${order === null ? '' : `order: ${order}\n`}kind: ${kind}\n---\n# ${id}`, 0).record;
  for (const [status, kind, group] of [['active', '', 'phases'], ['done', '', 'shelf'], ['active', 'backlog', 'backlog']]) {
    const model = run([parsed('PHASE-0003', 4, status, kind), parsed('PHASE-0004', 3, status, kind),
      parsed('PHASE-0002', null, status, kind), parsed('PHASE-0005', 4, status, kind)]);
    assert.deepEqual(model[group].map((p) => p.id), ['PHASE-0002', 'PHASE-0004', 'PHASE-0003', 'PHASE-0005']);
  }
});

// TASK-0144: ticket fills are the cockpit's status rules, independent of DES-0004 state.
test('cockpit fills and attention cover each band, per-type completion and decision types', () => {
  for (const [type, status, fill, needsYou = false] of [
    ['feature', 'review', 'open', true], ['issue', 'triage', 'open', true],
    ['task', 'blocked', 'open', true], ['test', 'failing', 'open', true], ['issue', 'reopened', 'open', true],
    ['test', 'ready', 'open', true], ['task', 'ready', 'open'],
    ['test', 'active', 'doing'], ['task', 'doing', 'doing'], ['feature', 'in_progress', 'doing'],
    ['feature', 'in-progress', 'open'], ['task', 'in-review', 'open'], ['risk', 'mitigating', 'open'],
    ['requirement', 'accepted', 'delivered'], ['feature', 'accepted', 'open'],
    ['design', 'accepted', 'delivered'], ['decision', 'accepted', 'delivered'], ['adr', 'accepted', 'delivered'],
    ['task', 'done', 'delivered'], ['risk', 'closed', 'delivered'], ['test', 'passing', 'delivered'],
    ['task', 'deferred', 'deferred'], ['task', 'obsolete', 'dropped'], ['test', 'retired', 'dropped'],
    ...['cancelled', 'superseded', 'declined', 'reverted', 'deprecated', 'abandoned', 'reconciled'].map((s) => ['task', s, 'dropped']),
    ['task', 'unknown', 'open'], ['task', 'wont-fix', 'open'],
  ]) {
    const ticket = run([note('TICKET-001', type, status)]).tickets['TICKET-001'];
    assert.deepEqual([ticket.type, ticket.fill, ticket.needsYou], [type === 'decision' ? 'adr' : type, fill, needsYou], `${type} ${status}`);
  }
});

test('waivers and expired manual verification overlay completion, with a strict day boundary', () => {
  const generated = '2026-10-15T12:00:00Z';
  for (const [type, status, fields, fill] of [
    ['task', 'done', { verification_waiver: 'Pending evidence' }, 'unproven'],
    ['task', 'doing', { verification_waiver: 'Pending evidence' }, 'doing'],
    ['task', 'cancelled', { verification_waiver: 'Pending evidence' }, 'dropped'],
    ['test', 'passing', { last_verified: '2026-07-16' }, 'unproven'],
    ['test', 'passing', { last_verified: '2026-07-17' }, 'delivered'],
    ['test', 'passing', { last_verified: '2026-07-16', command: 'npm test' }, 'delivered'],
    ['test', 'passing', { last_verified: '2026-07-16', command: '  ' }, 'unproven'],
    ['task', 'done', { last_verified: '2026-07-16' }, 'delivered'],
    ...['', 'bad', '2026-02-30', '2027-01-01'].map((date) => ['test', 'passing', { last_verified: date }, 'delivered']),
  ]) assert.equal(run([note('ITEM', type, status, fields)], { generated }).tickets.ITEM.fill, fill, JSON.stringify([type, status, fields]));
  const old = note('TST-0001', 'test', 'passing', { last_verified: '2026-10-13T12:00:00Z' });
  assert.equal(run([old], { generated, stalenessDays: 1 }).tickets[old.id].fill, 'unproven');
  assert.equal(run([old], { generated, stalenessDays: 2 }).tickets[old.id].fill, 'delivered');
  const { cockpitStalenessDays } = load('shared/overview-status.js');
  assert.equal(cockpitStalenessDays('verification:\n  staleness_days: 0\n'), 0);
  assert.equal(cockpitStalenessDays('verification:\n  other: true\nnext:\n  staleness_days: 1\n'), 90);
  assert.equal(cockpitStalenessDays(''), 90);
});

test('unresolved depends uses cockpit resolution and type-specific completion, including non-tickets', () => {
  const blocker = { ...note('TASK-0002', 'task', 'doing'), fileName: 'blocker', aliases: ['Blocker alias'], title: 'Blocker title' };
  const dependent = (status, depends) => note('TASK-0001', 'task', status, { depends });
  for (const target of ['TASK-0002', '[[TASK-0002-old-slug|shown]]', '[[blocker]]', '[[Blocker alias]]', 'Blocker title']) {
    assert.equal(run([blocker, dependent('doing', [target])]).tickets['TASK-0001'].needsYou, true, target);
  }
  for (const depends of ['[[TASK-0002]]', [null, 2, {}, '[[missing]]', '[[other#TASK-0002]]', '[[blocker#Heading]]']]) {
    assert.equal(run([blocker, dependent('doing', depends)]).tickets['TASK-0001'].needsYou, false);
  }
  for (const status of ['done', 'cancelled', 'superseded', 'deferred']) assert.equal(run([blocker, dependent(status, ['TASK-0002'])]).tickets['TASK-0001'].needsYou, false, status);
  // A done-but-unproven dependency still counts done in the cockpit.
  assert.equal(run([note('TASK-0002', 'task', 'done', { verification_waiver: 'Pending' }), dependent('doing', ['TASK-0002'])]).tickets['TASK-0001'].needsYou, false);
  for (const [type, status, needs] of [['phase', 'active', true], ['phase', 'done', false], ['test', 'active', true], ['test', 'retired', false], ['feature', 'retired', true]]) {
    assert.equal(run([note('BLOCKER', type, status), dependent('doing', ['BLOCKER'])]).tickets['TASK-0001'].needsYou, needs, `${type} ${status}`);
  }
});

// Read-only parity against the actual stats GET builder, without starting a server.
// Risks, decisions and designs are absent from its slim items; the port still
// applies the same rule to them (covered by the synthetic cases above).
for (const workspace of ['deck', 'your-trainer']) test(`cockpit stats parity: ${workspace}`, async (t) => {
  const fs = await import('node:fs'); const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { desktopRoot } = await import('./helpers.mjs');
  const root = path.dirname(desktopRoot);
  const cockpit = path.resolve(root, '../project-os-cockpit');
  const source = workspace === 'deck' ? root : path.resolve(root, '../your-trainer');
  for (const required of [path.join(cockpit, 'src/project_os_cockpit/cockpit.py'), source]) if (!fs.existsSync(required)) {
    const reason = `SKIPPED cockpit parity (${workspace}): missing ${required}; no comparison was made`;
    console.warn(reason); t.skip(reason); return;
  }
  const python = spawnSync('python3', ['-c', `
import datetime, json, sys
from pathlib import Path
from project_os_cockpit.index import Index
from project_os_cockpit.cockpit import stats_payload, _staleness_days
root = Path(sys.argv[1]) / 'docs'
payload = stats_payload(Index.build(root))
items = {}
def visit(value):
    if isinstance(value, dict):
        if 'id' in value and 'state' in value and 'type' in value:
            item = {'fill': value['state'] or 'open', 'needsYou': bool(value.get('attn', False))}
            if value['id'] in items: assert items[value['id']] == item, value['id']
            items[value['id']] = item
        for child in value.values(): visit(child)
    elif isinstance(value, list):
        for child in value: visit(child)
visit(payload)
print(json.dumps({'items': items, 'today': datetime.date.today().isoformat(), 'days': _staleness_days(root)}))
`, source], { encoding: 'utf8', timeout: 25000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: path.join(cockpit, 'src'), PYTHONDONTWRITEBYTECODE: '1', PATH: `${path.join(cockpit, '.venv/bin')}${path.delimiter}${process.env.PATH}` } });
  assert.equal(python.status, 0, `Python stats builder failed: ${python.error ?? ''}\n${python.stderr}`);
  const reference = JSON.parse(python.stdout);
  const { walkNotes } = load('main/note-index.js');
  const docs = path.join(source, 'docs'); const { records, problems } = walkNotes(docs);
  assert.deepEqual(problems, []);
  const model = buildOverview(records, { workspace, today: reference.today, stalenessDays: reference.days,
    readBody: (rel) => fs.readFileSync(path.join(docs, rel), 'utf8') });
  const mismatches = [];
  for (const [id, want] of Object.entries(reference.items)) {
    const got = model.tickets[id];
    if (!got || got.fill !== want.fill || got.needsYou !== want.needsYou) mismatches.push(`${id}: cockpit ${JSON.stringify(want)}; Deck ${JSON.stringify(got && { fill: got.fill, needsYou: got.needsYou })}`);
  }
  const outside = Object.values(model.tickets).filter((ticket) => !Object.hasOwn(reference.items, ticket.id));
  t.diagnostic(`${workspace}: ${Object.keys(reference.items).length} items compared; ${mismatches.length} mismatches; ${outside.length} outside stats (${[...new Set(outside.map((ticket) => ticket.type))].join(', ')}), still governed by the port`);
  assert.ok(Object.keys(reference.items).length > 0, 'stats must actually report items');
  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

// TASK-0153 — a ticket that needs you says why, what to do and where, in the cockpit's order.
test('every ticket that needs you carries why, what to do and where to do it; no other ticket does', () => {
  const dependent = (id, depends) => note(id, 'task', 'doing', { depends });
  const records = [
    note('ISS-0001', 'issue', 'triage'),
    note('FEAT-0001', 'feature', 'review'),
    note('DES-0001', 'design', 'review'),
    note('REQ-0001', 'requirement', 'review'),
    note('TST-0001', 'test', 'ready'),
    note('TST-0002', 'test', 'failing'),
    note('ISS-0002', 'issue', 'reopened'),
    note('TASK-0002', 'task', 'doing'),
    dependent('TASK-0001', ['TASK-0002']),
    // Two reasons at once: a reason the note's own status gives comes before an unfinished
    // dependency, as in the cockpit, for every such status.
    note('FEAT-0002', 'feature', 'review', { depends: ['TASK-0002'] }),
    note('ISS-0003', 'issue', 'triage', { depends: ['TASK-0002'] }),
    note('TST-0003', 'test', 'failing', { depends: ['TASK-0002'] }),
    note('TST-0004', 'test', 'ready', { depends: ['TASK-0002'] }),
    note('TASK-0003', 'task', 'done'),
  ];
  const m = run(records);
  const needs = (id) => m.tickets[id].needs;
  assert.deepEqual(needs('ISS-0001'), { reason: 'triage', say: 'Decide: take it into the backlog, or decline it', action: { verbs: true } });
  assert.deepEqual(needs('FEAT-0001').action, { parts: { flow: 'accept', note: 'FEAT-0001' } });
  assert.deepEqual(needs('DES-0001').action, { parts: { flow: 'design', note: 'DES-0001' } });
  assert.deepEqual(needs('REQ-0001').action, { parts: { page: 'ticket', note: 'REQ-0001' } });
  assert.equal(needs('FEAT-0001').say, 'Review it, then accept it or send it back');
  assert.deepEqual([needs('TST-0001').reason, needs('TST-0001').say, needs('TST-0001').action], ['ready', 'Run this test: it has never been run', { parts: { flow: 'test-run' } }]);
  assert.deepEqual([needs('TST-0002').reason, needs('TST-0002').action], ['failed', { parts: { flow: 'test-run' } }]);
  assert.deepEqual([needs('ISS-0002').reason, needs('ISS-0002').action], ['failed', { parts: { page: 'ticket', note: 'ISS-0002' } }]);
  assert.deepEqual(needs('TASK-0001'), { reason: 'waiting', say: 'Waiting on TASK-0002: finish that first', action: { parts: { page: 'ticket', note: 'TASK-0002' } }, waitingOn: 'TASK-0002' });
  assert.equal(needs('FEAT-0002').reason, 'review', 'review comes before waiting');
  assert.equal(needs('ISS-0003').reason, 'triage', 'triage comes before waiting');
  assert.equal(needs('TST-0003').reason, 'failed', 'failed comes before waiting');
  assert.equal(needs('TST-0004').reason, 'ready', 'a test never run comes before waiting');
  for (const t of Object.values(m.tickets)) assert.equal(t.needs !== undefined, t.needsYou, `${t.id}: needs exactly when needsYou`);
});

test('on both fixtures, every ticket that needs you says why, and a waiting ticket names an unfinished blocker', () => {
  for (const name of ['deck', 'your-trainer']) {
    const m = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf-8'));
    for (const t of Object.values(m.tickets)) {
      assert.equal(t.needs !== undefined, t.needsYou === true, `${name} ${t.id}: needs exactly when needsYou`);
      if (t.needs?.reason !== 'waiting') continue;
      const on = t.needs.waitingOn;
      assert.ok(typeof on === 'string' && on !== '', `${name} ${t.id}: names what it waits on`);
      if (m.tickets[on] !== undefined) {
        assert.ok(!['delivered', 'dropped', 'unproven'].includes(m.tickets[on].fill), `${name} ${t.id}: ${on} is not finished`);
        assert.deepEqual(t.needs.action, { parts: { page: 'ticket', note: on } });
      } else assert.deepEqual(t.needs.action, { parts: { note: on } }, `${name} ${t.id}: a blocker the overview does not draw opens as a note`);
    }
  }
});
