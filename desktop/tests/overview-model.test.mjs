// TST-0080: DES-0004's rules, exercised through the public builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
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

test('acceptance uses supplied platform results, otherwise status, and never calls active a pass', () => {
  const check = note('TST-0001', 'test', 'active', { level: 'acceptance' });
  for (const [results, expected] of [
    [[], 'open'], [['passed', 'excused'], 'closed'], [['passed', 'not-run'], 'open'],
    [['passed', 'withdrawn'], 'owed'], [['invalidated', 'failed'], 'failed'], [['passed', 'failed'], 'failed'],
  ]) assert.equal(run([check], { acceptanceResults: { 'TST-0001': results } }).tickets['TST-0001'].state, expected);
  assert.equal(run([check]).tickets['TST-0001'].state, 'open');
  for (const [status, expected] of [['passing', 'closed'], ['failing', 'failed'], ['withdrawn', 'owed'], ['retired', 'dropped']]) {
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
