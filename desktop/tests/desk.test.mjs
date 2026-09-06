// TST-0004 — a desk reopens as it was left, and a desk naming a note that is
// gone opens without it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, navPayload, item } from './helpers.mjs';

const { reconcileDesk, deskFrom } = load('shared/desk.js');
const { cardsFromNav } = load('shared/sidecar-client.js');

const CARDS = [
  { noteId: 'FEAT-0002', title: 'The shell', noteType: 'feature', status: 'doing', rel: 'features/a.md' },
  { noteId: 'FEAT-0003', title: 'The store', noteType: 'feature', status: 'planned', rel: 'features/b.md' },
  { noteId: 'TASK-0006', title: 'It boots', noteType: 'task', status: 'backlog', rel: 'tasks/c.md' },
];

test('a saved desk restores exactly', () => {
  const desk = deskFrom('triage', 'aaaa1111', [
    { noteId: 'FEAT-0002', x: 10, y: 20 },
    { noteId: 'TASK-0006', x: 300, y: 40 },
  ]);
  const reconciled = reconcileDesk(desk, CARDS);
  assert.equal(reconciled.dropped, 0);
  assert.deepEqual(
    reconciled.cards.map((c) => [c.noteId, c.x, c.y]),
    [
      ['FEAT-0002', 10, 20],
      ['TASK-0006', 300, 40],
    ],
  );
});

test('a desk naming a note that is gone opens with the rest, and counts what it dropped', () => {
  const desk = deskFrom('triage', 'aaaa1111', [
    { noteId: 'FEAT-0002', x: 10, y: 20 },
    { noteId: 'FEAT-9999', x: 100, y: 200 },
    { noteId: 'ISS-9999', x: 100, y: 200 },
  ]);
  const reconciled = reconcileDesk(desk, CARDS);
  assert.equal(reconciled.dropped, 2);
  assert.deepEqual(reconciled.cards.map((c) => c.noteId), ['FEAT-0002']);
});

test("a card's status comes from the current list, never from what the desk saved", () => {
  const desk = deskFrom('triage', 'aaaa1111', [{ noteId: 'FEAT-0002', x: 0, y: 0 }]);
  const moved = CARDS.map((c) => (c.noteId === 'FEAT-0002' ? { ...c, status: 'done' } : c));
  const reconciled = reconcileDesk(desk, moved);
  assert.equal(reconciled.cards[0].card.status, 'done');
});

test('deskFrom copies its cards rather than keeping the caller\'s array', () => {
  const cards = [{ noteId: 'FEAT-0002', x: 1, y: 2 }];
  const desk = deskFrom('a', 'w', cards);
  cards[0].x = 999;
  assert.equal(desk.cards[0].x, 1);
});

test('a card is built from the payload the sidecar returned', () => {
  const raw = navPayload([
    item('FEAT-0002', 'The shell', 'doing', 'feature'),
    item('TASK-0006', 'It boots', 'backlog', 'task'),
  ]);
  const cards = cardsFromNav({ mode: raw.mode, groups: raw.groups.map(normalise) });
  assert.deepEqual(cards[0], {
    noteId: 'FEAT-0002',
    title: 'The shell',
    noteType: 'feature',
    status: 'doing',
    rel: 'docs/FEAT-0002.md',
  });
  // The needs-you group repeats the first item; a card appears once.
  assert.equal(cards.length, 2);
});

test('a card is built from a nested child as well as a top-level item', () => {
  const payload = {
    mode: 'x',
    groups: [
      {
        key: 'g',
        label: 'G',
        items: [{ ...item('FEAT-0002', 'The shell', 'doing', 'feature'), children: [item('TASK-0006', 'It boots', 'backlog', 'task')] }],
      },
    ],
  };
  const cards = cardsFromNav({ mode: 'x', groups: payload.groups.map(normalise) });
  assert.deepEqual(cards.map((c) => c.noteId), ['FEAT-0002', 'TASK-0006']);
});

function normalise(group) {
  const walk = (i) => ({
    id: i.id,
    title: i.title,
    status: i.status,
    url: i.url ?? null,
    subtitle: i.subtitle ?? null,
    noteType: i.type ?? '',
    owed: i.owed === true,
    children: (i.children ?? []).map(walk),
  });
  return { key: group.key, label: group.label, status: null, needsHuman: false, suppressed: false, items: group.items.map(walk) };
}
