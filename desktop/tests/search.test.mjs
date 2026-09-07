// TST-0017 — search and filter narrow the navigator, and find a note the pool
// never drew (TASK-0027).
//
// The card pool draws only what is on screen, so the browser's own find
// command cannot see a note that is not currently drawn. Deck matches over the
// model instead, which is what these checks are over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { narrowGroups, matchesCard, statusesIn, typesIn, countCards, countDistinct, isNarrowed } =
  load('shared/search.js');

function card(noteId, title, extra = {}) {
  return {
    noteId,
    title,
    noteType: 'issue',
    status: 'open',
    rel: null,
    subtitle: null,
    owed: false,
    owedVerb: null,
    groupKey: 'g',
    severity: null,
    lastVerified: null,
    stale: false,
    progress: null,
    children: [],
    ...extra,
  };
}

const GROUPS = [
  {
    key: 'needs-triage',
    label: 'Needs triage',
    needsHuman: true,
    suppressed: false,
    cards: [card('ISS-0256', 'Mid-ride mode transition unreliable'), card('ISS-0259', 'Audible countdown pips drift')],
  },
  {
    key: 'high',
    label: 'High',
    needsHuman: false,
    suppressed: false,
    cards: [
      card('ISS-0288', 'RideWithGPS profile route tab', { status: 'doing' }),
      card('FEAT-0085', 'BLE reliability layer', {
        noteType: 'feature',
        status: 'doing',
        children: [card('TASK-0591', 'Trainer compatibility test', { noteType: 'task', status: 'backlog' })],
      }),
    ],
  },
];

const NOTHING = { query: '', filters: { statuses: [], types: [] } };

test('nothing typed narrows nothing, and the same groups come back', () => {
  assert.equal(isNarrowed(NOTHING), false);
  assert.equal(narrowGroups(GROUPS, NOTHING), GROUPS, 'an unnarrowed view is the same object, not a copy');
});

test('a query matches on the id and on the title', () => {
  const byId = narrowGroups(GROUPS, { ...NOTHING, query: 'ISS-0259' });
  assert.deepEqual(byId.flatMap((g) => g.cards.map((c) => c.noteId)), ['ISS-0259']);
  const byTitle = narrowGroups(GROUPS, { ...NOTHING, query: 'countdown' });
  assert.deepEqual(byTitle.flatMap((g) => g.cards.map((c) => c.noteId)), ['ISS-0259']);
});

test('a query is matched case-insensitively, word by word', () => {
  assert.equal(matchesCard(card('ISS-0256', 'Mid-ride mode transition'), { ...NOTHING, query: 'RIDE mode' }), true);
  assert.equal(matchesCard(card('ISS-0256', 'Mid-ride mode transition'), { ...NOTHING, query: 'ride absent' }), false);
});

test('a group with nothing left in it is not drawn', () => {
  const narrowed = narrowGroups(GROUPS, { ...NOTHING, query: 'ISS-0256' });
  assert.deepEqual(narrowed.map((g) => g.key), ['needs-triage'], 'the empty group is gone, not drawn empty');
});

test('a note that matches is found even when nothing on screen holds it', () => {
  // TASK-0591 is a child of a collapsed feature, so no row and no card exists
  // for it when the search is typed. It still has to be findable.
  const narrowed = narrowGroups(GROUPS, { ...NOTHING, query: 'TASK-0591' });
  assert.deepEqual(narrowed.map((g) => g.key), ['high']);
  assert.deepEqual(narrowed[0].cards.map((c) => c.noteId), ['FEAT-0085'], 'the parent is kept so the child has a place');
  assert.deepEqual(narrowed[0].cards[0].children.map((c) => c.noteId), ['TASK-0591']);
});

test('a note kept for its own sake keeps everything it holds', () => {
  const narrowed = narrowGroups(GROUPS, { ...NOTHING, query: 'reliability' });
  assert.deepEqual(narrowed[0].cards[0].children.map((c) => c.noteId), ['TASK-0591']);
});

test('nothing matching leaves nothing drawn, and clearing brings it all back', () => {
  const none = narrowGroups(GROUPS, { ...NOTHING, query: 'zzzznothingmatchesthis' });
  assert.deepEqual(none, []);
  const restored = narrowGroups(GROUPS, NOTHING);
  assert.deepEqual(
    restored.map((g) => [g.key, g.cards.length]),
    [
      ['needs-triage', 2],
      ['high', 2],
    ],
  );
});

test('filtering by status shows only notes at that status', () => {
  const narrowed = narrowGroups(GROUPS, { query: '', filters: { statuses: ['doing'], types: [] } });
  assert.deepEqual(narrowed.flatMap((g) => g.cards.map((c) => c.noteId)), ['ISS-0288', 'FEAT-0085']);
});

test('filtering by type shows only notes of that type', () => {
  const narrowed = narrowGroups(GROUPS, { query: '', filters: { statuses: [], types: ['feature'] } });
  assert.deepEqual(narrowed.flatMap((g) => g.cards.map((c) => c.noteId)), ['FEAT-0085']);
});

test('a query and a filter both have to be satisfied', () => {
  const narrowed = narrowGroups(GROUPS, { query: 'ISS', filters: { statuses: ['doing'], types: [] } });
  assert.deepEqual(narrowed.flatMap((g) => g.cards.map((c) => c.noteId)), ['ISS-0288']);
});

test('the counts a heading shows come from what survived the narrowing', () => {
  const narrowed = narrowGroups(GROUPS, { ...NOTHING, query: 'ISS' });
  assert.deepEqual(narrowed.map((g) => [g.key, g.cards.length]), [
    ['needs-triage', 2],
    ['high', 1],
  ]);
  assert.equal(countCards(GROUPS[1].cards), 3, 'counting a group counts what its notes hold');
});

test('the filter lists offer what the view actually holds', () => {
  assert.deepEqual(statusesIn(GROUPS), ['backlog', 'doing', 'open']);
  assert.deepEqual(typesIn(GROUPS), ['feature', 'issue', 'task']);
});

test('the navigator counts notes, not rows', () => {
  // ISS-0015. The sidecar deliberately sends a note twice: once in Needs-you
  // and once under its own phase. Counting rows made "N of M" consistent on
  // both sides and not a count of notes, which is what the label promises.
  const owed = card('FEAT-0002', 'The shell', { noteType: 'feature', status: 'doing' });
  const groups = [
    { key: 'needs-you', label: 'Needs you', cards: [owed] },
    {
      key: 'phase',
      label: 'PHASE-0001',
      cards: [
        card('PHASE-0001', 'Deck', {
          noteType: 'phase',
          children: [owed, card('TASK-0006', 'Boots', { noteType: 'task', status: 'done' })],
        }),
      ],
    },
  ];
  assert.equal(countCards(groups[0].cards) + countCards(groups[1].cards), 4, 'rows');
  assert.equal(countDistinct(groups), 3, 'FEAT-0002 was counted twice');
});
