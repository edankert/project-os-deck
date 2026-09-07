// TST-0016 — the groups the sidecar sends are drawn, and nothing is lost
// (TASK-0023).
//
// Deck used to flatten every group, child and mark into one list, so a view of
// four hundred notes was four hundred identical cards in one grid. The payload
// already says which notes need a person, which are finished, what is owed and
// what each note holds. These checks are over the model the navigator draws
// from, not over the elements, because the model is what decides the picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { groupsFromNav, flattenGroups, severityFromGroup } = load('shared/sidecar-client.js');
const { rowsFor, groupFoldKey, cardFoldKey } = load('shared/rows.js');

/** The shape the client hands on, after its own parsing. */
function group(key, label, items, extra = {}) {
  return { key, label, status: null, needsHuman: false, suppressed: false, items, ...extra };
}

function navItem(id, extra = {}) {
  return {
    id,
    title: `${id} title`,
    status: 'open',
    url: `/docs/${id}.md`,
    subtitle: null,
    noteType: 'issue',
    owed: false,
    owedVerb: null,
    mark: null,
    stale: false,
    lastVerified: null,
    progress: null,
    children: [],
    ...extra,
  };
}

// The shape of Your Trainer's issues view on 2026-09-07, cut down: notes that
// need triage, then severity bands, then the same bands again for finished
// work, which the sidecar marks suppressed.
const ISSUES = {
  mode: 'issues',
  groups: [
    group('needs-triage', 'Needs triage', [navItem('ISS-0256'), navItem('ISS-0259')], { needsHuman: true }),
    group('critical', 'Critical', [navItem('ISS-0070')]),
    group('high', 'High', [navItem('ISS-0088'), navItem('ISS-0089')]),
    group('high:done', 'High', [navItem('ISS-0001'), navItem('ISS-0002')], { suppressed: true }),
  ],
};

test('every group in the payload becomes a group Deck can draw', () => {
  const groups = groupsFromNav(ISSUES);
  assert.deepEqual(
    groups.map((g) => [g.key, g.label, g.cards.length]),
    [
      ['needs-triage', 'Needs triage', 2],
      ['critical', 'Critical', 1],
      ['high', 'High', 2],
      ['high:done', 'High', 2],
    ],
  );
  assert.equal(groups[0].needsHuman, true, 'the group a person has to act on says so');
  assert.equal(groups[3].suppressed, true, 'finished work stays marked as finished work');
});

test('no group loses an item and no group repeats one', () => {
  const groups = groupsFromNav(ISSUES);
  const total = groups.reduce((n, g) => n + g.cards.length, 0);
  assert.equal(total, 7, 'every item in the payload is drawn somewhere');
  for (const group_ of groups) {
    const ids = group_.cards.map((c) => c.noteId);
    assert.equal(new Set(ids).size, ids.length, `${group_.key} drew a note twice`);
  }
});

test('an id in two groups stays in both, because the sidecar meant it to be', () => {
  // "Needs you" repeats a note that also sits under its phase. Dropping the
  // second one empties the phase, which is what flattening used to do.
  const payload = {
    mode: 'features',
    groups: [
      group('needs-you', 'Needs you', [navItem('REQ-0092', { owed: true, owedVerb: 'Approve' })], { needsHuman: true }),
      group('PHASE-019', 'PHASE-019 · iOS Parity', [navItem('REQ-0092')]),
    ],
  };
  const groups = groupsFromNav(payload);
  assert.equal(groups[0].cards.length, 1);
  assert.equal(groups[1].cards.length, 1, 'the phase still holds the note that also needs a person');
  assert.equal(flattenGroups(groups).length, 1, 'flattened for a lookup, the note appears once');
});

test('what is owed, and the verb for it, reaches the card', () => {
  const groups = groupsFromNav({
    mode: 'features',
    groups: [group('needs-you', 'Needs you', [navItem('REQ-0092', { owed: true, owedVerb: 'Approve' })], { needsHuman: true })],
  });
  assert.equal(groups[0].cards[0].owed, true);
  assert.equal(groups[0].cards[0].owedVerb, 'Approve');
});

test('a note keeps what it holds, from either name the sidecar uses', () => {
  // A feature holds its tasks under "children"; a test surface holds its tests
  // under "items". Both are the same thing to Deck.
  const groups = groupsFromNav({
    mode: 'features',
    groups: [
      group('PHASE-019', 'PHASE-019', [navItem('FEAT-0085', { children: [navItem('TASK-0591'), navItem('TASK-0592')] })]),
    ],
  });
  assert.deepEqual(groups[0].cards[0].children.map((c) => c.noteId), ['TASK-0591', 'TASK-0592']);
  assert.deepEqual(flattenGroups(groups).map((c) => c.noteId), ['FEAT-0085', 'TASK-0591', 'TASK-0592']);
});

test("an issue's severity is the band it arrived in, finished or not", () => {
  assert.equal(severityFromGroup('critical'), 'critical');
  assert.equal(severityFromGroup('high:done'), 'high', 'a finished high issue is still a high issue');
  assert.equal(severityFromGroup('needs-triage'), null);
  assert.equal(severityFromGroup('PHASE-019'), null);
  const groups = groupsFromNav(ISSUES);
  assert.equal(groups[1].cards[0].severity, 'critical');
});

test('a group of finished work arrives folded, and everything else arrives open', () => {
  const groups = groupsFromNav(ISSUES);
  const rows = rowsFor({ groups, folds: {}, onDesk: new Set(), currentNoteId: null });
  const headings = rows.filter((r) => r.kind === 'group');
  assert.equal(headings.length, 4, 'every group has a heading, folded or not');
  assert.deepEqual(
    headings.map((h) => h.folded),
    [false, false, false, true],
    'only the suppressed group starts folded',
  );
  const drawn = rows.filter((r) => r.kind === 'card').map((r) => r.card.noteId);
  assert.ok(!drawn.includes('ISS-0001'), 'a folded group draws none of its notes');
  assert.equal(drawn.length, 5, 'the five notes outside the folded group are drawn');
});

test('unfolding a group is remembered, and folding an open one too', () => {
  const groups = groupsFromNav(ISSUES);
  const unfolded = rowsFor({
    groups,
    folds: { [groupFoldKey('high:done')]: false },
    onDesk: new Set(),
    currentNoteId: null,
  });
  assert.ok(
    unfolded.filter((r) => r.kind === 'card').map((r) => r.card.noteId).includes('ISS-0001'),
    'the group a person opened shows its notes',
  );
  const folded = rowsFor({
    groups,
    folds: { [groupFoldKey('critical')]: true },
    onDesk: new Set(),
    currentNoteId: null,
  });
  assert.ok(!folded.filter((r) => r.kind === 'card').map((r) => r.card.noteId).includes('ISS-0070'));
});

test('a note that holds other notes arrives closed and opens on demand', () => {
  const groups = groupsFromNav({
    mode: 'features',
    groups: [
      group('PHASE-019', 'PHASE-019', [navItem('FEAT-0085', { children: [navItem('TASK-0591'), navItem('TASK-0592')] })]),
    ],
  });
  const closed = rowsFor({ groups, folds: {}, onDesk: new Set(), currentNoteId: null });
  assert.deepEqual(closed.filter((r) => r.kind === 'card').map((r) => r.card.noteId), ['FEAT-0085']);
  const open = rowsFor({
    groups,
    folds: { [cardFoldKey('PHASE-019', 'FEAT-0085')]: false },
    onDesk: new Set(),
    currentNoteId: null,
  });
  assert.deepEqual(
    open.filter((r) => r.kind === 'card').map((r) => r.card.noteId),
    ['FEAT-0085', 'TASK-0591', 'TASK-0592'],
    "a feature's tasks are reachable from the feature",
  );
  assert.deepEqual(
    open.filter((r) => r.kind === 'card').map((r) => r.depth),
    [0, 1, 1],
    'what a note holds is drawn under it',
  );
});

test('a heading counts what the group holds, which is what the cockpit shows', () => {
  const groups = groupsFromNav(ISSUES);
  const rows = rowsFor({ groups, folds: {}, onDesk: new Set(), currentNoteId: null });
  assert.deepEqual(
    rows.filter((r) => r.kind === 'group').map((h) => [h.label, h.count]),
    [
      ['Needs triage', 2],
      ['Critical', 1],
      ['High', 2],
      ['High', 2],
    ],
  );
});
