// TST-0082: the captured real corpora keep every ticket exactly once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, desktopRoot } from './helpers.mjs';
const { STATE_ORDER, CORE_KINDS, PHASE_KINDS, emptyCounts } = load('shared/overview-types.js');
const { buildOverview } = load('shared/overview-model.js');
const { docsRootFor, walkNotes } = load('main/note-index.js');
const { checkScene } = load('shared/overview-checks.js');

const expected = {
  deck: { dirty: false, testStates: { closed: 67, open: 21, dropped: 5, owed: 2 }, total: 395, unplaced: 1, core: 23, kinds: { req: 6, feat: 29, task: 152, test: 95, iss: 91, dec: 13, risk: 9 },
    phases: { 'PHASE-0001': 139, 'PHASE-0002': 172, 'PHASE-0003': 0, 'PHASE-0004': 2, 'PHASE-0005': 59 }, groups: [5, 0, 0], exits: 47 },
  'your-trainer': { dirty: true, testStates: { dropped: 232, closed: 9, open: 276, owed: 180, failed: 1 }, total: 2747, unplaced: 987, core: 1028, kinds: { req: 240, feat: 135, task: 1084, test: 698, iss: 549, dec: 24, risk: 17 },
    phases: { 'PHASE-001': 60, 'PHASE-002': 39, 'PHASE-003': 102, 'PHASE-004': 51, 'PHASE-005': 36, 'PHASE-006': 29,
      'PHASE-007': 46, 'PHASE-008': 16, 'PHASE-009': 7, 'PHASE-010': 142, 'PHASE-011': 80, 'PHASE-012': 123,
      'PHASE-013': 4, 'PHASE-014': 91, 'PHASE-015': 9, 'PHASE-016': 48, 'PHASE-017': 23, 'PHASE-018': 31,
      'PHASE-019': 174, 'PHASE-020': 61, 'PHASE-021': 172, 'PHASE-022': 2, 'PHASE-023': 6, 'PHASE-024': 12,
      'PHASE-025': 150, 'PHASE-026': 12, 'PHASE-999': 193 }, groups: [9, 17, 1], exits: 144 },
};

for (const [name, want] of Object.entries(expected)) {
  test(`${name}: real fixture totals, places, states, links and exit text remain consistent`, () => {
    const model = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf8'));
    const tickets = Object.values(model.tickets);
    const phases = [...model.phases, ...model.shelf, ...model.backlog];
    assert.match(model.head, /^[a-f0-9]{40}$/); assert.equal(typeof model.dirty, 'boolean'); assert.ok(Number.isFinite(Date.parse(model.generated)));
    assert.equal(tickets.length, want.total);
    assert.equal(model.dirty, want.dirty);
    assert.deepEqual(tickets.filter((t) => t.kind === 'test').reduce((counts, t) => { counts[t.state] = (counts[t.state] ?? 0) + 1; return counts; }, {}), want.testStates);
    if (name === 'deck') assert.deepEqual(model.phases.map((p) => p.id), ['PHASE-0001', 'PHASE-0002', 'PHASE-0004', 'PHASE-0003', 'PHASE-0005']);
    assert.equal(tickets.filter((t) => t.placedBy === 'none').length, want.unplaced);
    assert.equal(model.core.tickets.length, want.core);
    assert.deepEqual([model.phases.length, model.shelf.length, model.backlog.length], want.groups);
    assert.deepEqual(Object.fromEntries(phases.map((p) => [p.id, p.tickets.length])), want.phases);
    assert.deepEqual(Object.fromEntries(CORE_KINDS.map((k) => [k, tickets.filter((t) => t.kind === k).length])), want.kinds);
    const all = [...model.core.tickets, ...phases.flatMap((p) => p.tickets)];
    assert.deepEqual([...all].sort(), Object.keys(model.tickets).sort());
    assert.equal(new Set(all).size, all.length);
    for (const group of [model.core, ...phases]) {
      const counts = emptyCounts();
      const kinds = group === model.core ? CORE_KINDS : PHASE_KINDS;
      let previous = -1;
      for (const id of group.tickets) {
        const ticket = model.tickets[id];
        assert.equal(ticket.id, id);
        assert.equal(ticket.phase, group.id ?? null);
        const order = kinds.indexOf(ticket.kind) * STATE_ORDER.length + STATE_ORDER.indexOf(ticket.state);
        assert.ok(order >= previous, `${id} is out of drawing order`); previous = order;
        counts[ticket.kind][ticket.state]++;
      }
      assert.deepEqual(group.counts, counts);
    }
    for (const ticket of tickets) {
      assert.ok(['requirement', 'feature', 'task', 'test', 'issue', 'adr', 'design', 'risk'].includes(ticket.type), ticket.id);
      assert.ok(['open', 'doing', 'delivered', 'unproven', 'dropped', 'deferred'].includes(ticket.fill), ticket.id);
      assert.equal(typeof ticket.needsYou, 'boolean', ticket.id);
      assert.equal(ticket.kind === 'dec', ticket.type === 'adr' || ticket.type === 'design', ticket.id);
      if (['dec', 'risk'].includes(ticket.kind)) { assert.equal(ticket.phase, null); assert.equal(ticket.placedBy, 'project-wide'); }
      if (ticket.suggestion) { assert.equal(ticket.placedBy, 'none'); assert.ok(phases.some((p) => p.id === ticket.suggestion.phase)); }
    }
    assert.ok(tickets.some((t) => t.links.length > 0), 'links are real, not the placeholder arrays');
    assert.equal(phases.reduce((n, p) => n + p.exit.items.length, 0), want.exits);
    assert.ok(phases.flatMap((p) => p.exit.items).every((i) => i.text && !/^An exit criterion/.test(i.text)));
    assert.deepEqual(phases.filter((p) => p.exit.prose).map((p) => p.id).sort(), name === 'deck' ? [] : ['PHASE-019', 'PHASE-999']);
    // The checks must accept every id the real model can hand a drawing,
    // including the four legacy test documents in Your Trainer.
    const scene = { screen: 'wheel', address: 'deck://aaaa1111/features?page=wheel', width: 900, height: 600, title: name,
      nodes: tickets.map((t) => ({ kind: 'mark', tag: 'circle', attrs: {}, ticket: t.id })),
      list: tickets.map((t) => ({ id: t.id, label: t.title, group: t.kind })) };
    assert.ok(checkScene(scene).every((r) => r.ok));
  });
}

test('the builder indexes the Deck corpus with the fixture ticket ids and phase totals', () => {
  // Later phases can add notes without rewriting this historical fixture.
  // Every captured ticket must still be represented in the live model.
  const root = docsRootFor(path.dirname(desktopRoot));
  const { records, problems } = walkNotes(root);
  assert.deepEqual(problems, []);
  const fixture = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', 'deck.json'), 'utf8'));
  const model = buildOverview(records, { workspace: 'Deck', readBody: (rel) => fs.readFileSync(path.join(root, rel), 'utf8') });
  for (const id of Object.keys(fixture.tickets)) assert.ok(model.tickets[id], `The index lost ${id}`);
  const captured = new Set(Object.keys(fixture.tickets));
  assert.equal(Object.keys(model.tickets).filter((id) => captured.has(id)).length, expected.deck.total);
  // Status or phase edits are allowed after the capture; every live ticket
  // still belongs to one group, and the fixture's own grouping is pinned above.
  assert.equal(model.core.tickets.length + [...model.phases, ...model.shelf, ...model.backlog].reduce((n, p) => n + p.tickets.length, 0), Object.keys(model.tickets).length);
});
