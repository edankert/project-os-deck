// TST-0019 — the desk is a chosen subset a person arranges, and it survives
// (TASK-0024, TASK-0025).
//
// The desk used to be whatever the flow layout produced from the whole view,
// which is why a saved desk was worth nothing and why Deck's state file held
// no desks after a day of use. What is on the desk, and where each card sits,
// is state now. Pointer input is the one part a machine cannot settle; the
// model underneath it is all here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { reduce, initialState, deskKey, deskCardsOf, isOnDesk } = load('shared/store-state.js');
const { nextSlot, clampToSurface, reconcileDesk, CARD_WIDTH } = load('shared/desk.js');

const WORKSPACE = 'aaaa1111';

function opened() {
  return reduce(initialState(), { type: 'open-workspace', workspaceId: WORKSPACE });
}

function withCards(...ids) {
  let state = opened();
  for (const [index, id] of ids.entries()) {
    state = reduce(state, { type: 'put-on-desk', noteId: id, x: 12 + index * 20, y: 12 });
  }
  return state;
}

test('a view opens with nothing on the desk', () => {
  const state = opened();
  assert.deepEqual(deskCardsOf(state, WORKSPACE), []);
});

test('a note goes on the desk, and off it again', () => {
  let state = reduce(opened(), { type: 'put-on-desk', noteId: 'ISS-0256', x: 12, y: 12 });
  assert.equal(isOnDesk(state, WORKSPACE, 'ISS-0256'), true);
  state = reduce(state, { type: 'take-off-desk', noteId: 'ISS-0256' });
  assert.equal(isOnDesk(state, WORKSPACE, 'ISS-0256'), false);
});

test('a note already on the desk is not put on it twice', () => {
  const once = reduce(opened(), { type: 'put-on-desk', noteId: 'ISS-0256', x: 12, y: 12 });
  const twice = reduce(once, { type: 'put-on-desk', noteId: 'ISS-0256', x: 90, y: 90 });
  assert.equal(twice, once, 'nothing changed, so the state is the same object');
});

test('changing the view leaves the desk alone', () => {
  // A desk holding notes from more than one view is the point of choosing what
  // goes on it.
  const state = reduce(withCards('ISS-0256'), { type: 'select-view', viewId: 'features' });
  assert.deepEqual(deskCardsOf(state, WORKSPACE).map((c) => c.noteId), ['ISS-0256']);
});

test('another workspace has its own desk, and neither disturbs the other', () => {
  let state = withCards('ISS-0256');
  state = reduce(state, { type: 'open-workspace', workspaceId: 'bbbb2222' });
  assert.deepEqual(deskCardsOf(state, 'bbbb2222'), [], 'the other workspace starts empty');
  state = reduce(state, { type: 'put-on-desk', noteId: 'FEAT-0001', x: 12, y: 12 });
  state = reduce(state, { type: 'open-workspace', workspaceId: WORKSPACE });
  assert.deepEqual(deskCardsOf(state, WORKSPACE).map((c) => c.noteId), ['ISS-0256'], 'and the first desk came back');
});

test('dragging one card moves that card and no other', () => {
  const before = withCards('ISS-0256', 'ISS-0259', 'ISS-0265');
  const after = reduce(before, { type: 'move-card', noteId: 'ISS-0259', x: 400, y: 250 });
  const cards = deskCardsOf(after, WORKSPACE);
  assert.deepEqual(cards.find((c) => c.noteId === 'ISS-0259'), { noteId: 'ISS-0259', x: 400, y: 250 });
  // Identity, not equality: an untouched card is the object it already was, so
  // "no other card moved" is checkable rather than asserted.
  const untouched = deskCardsOf(before, WORKSPACE).filter((c) => c.noteId !== 'ISS-0259');
  for (const card of untouched) {
    assert.equal(cards.includes(card), true, `${card.noteId} was rebuilt when another card moved`);
  }
});

test('a move to where the card already is changes nothing', () => {
  const before = withCards('ISS-0256');
  const same = reduce(before, { type: 'move-card', noteId: 'ISS-0256', x: 12, y: 12 });
  assert.equal(same, before);
});

test('a saved desk is what was on the desk, and opening it brings back exactly that', () => {
  let state = withCards('ISS-0256', 'ISS-0259');
  state = reduce(state, { type: 'move-card', noteId: 'ISS-0256', x: 300, y: 120 });
  state = reduce(state, { type: 'save-desk', name: 'triage' });
  assert.deepEqual(state.desks[deskKey(WORKSPACE, 'triage')].cards, [
    { noteId: 'ISS-0256', x: 300, y: 120 },
    { noteId: 'ISS-0259', x: 32, y: 12 },
  ]);

  // Wander off: clear the desk, put something else on it, then come back.
  state = reduce(state, { type: 'clear-desk' });
  state = reduce(state, { type: 'put-on-desk', noteId: 'ISS-9999', x: 0, y: 0 });
  state = reduce(state, { type: 'open-desk', name: 'triage' });
  assert.deepEqual(
    deskCardsOf(state, WORKSPACE),
    [
      { noteId: 'ISS-0256', x: 300, y: 120 },
      { noteId: 'ISS-0259', x: 32, y: 12 },
    ],
    'the desk came back with its own cards and nothing else',
  );
  assert.equal(state.deskName, 'triage');
});

test('a saved desk is a copy, so moving a card afterwards does not rewrite it', () => {
  let state = reduce(withCards('ISS-0256'), { type: 'save-desk', name: 'triage' });
  state = reduce(state, { type: 'move-card', noteId: 'ISS-0256', x: 900, y: 900 });
  assert.deepEqual(state.desks[deskKey(WORKSPACE, 'triage')].cards, [{ noteId: 'ISS-0256', x: 12, y: 12 }]);
});

test('a desk naming a note the view no longer shows opens without it and says how many', () => {
  const available = [
    { noteId: 'ISS-0256', title: 'still here', noteType: 'issue', status: 'open', children: [] },
  ];
  const reconciled = reconcileDesk(
    [
      { noteId: 'ISS-0256', x: 10, y: 20 },
      { noteId: 'ISS-9998', x: 30, y: 40 },
      { noteId: 'ISS-9999', x: 50, y: 60 },
    ],
    available,
  );
  assert.equal(reconciled.dropped, 2);
  assert.deepEqual(reconciled.cards.map((c) => c.noteId), ['ISS-0256']);
});

test('a card added to the desk lands where nothing already is', () => {
  const width = CARD_WIDTH * 3 + 48;
  const first = nextSlot([], width);
  const second = nextSlot([first], width);
  const third = nextSlot([first, second], width);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(second, third);
  assert.equal(new Set([first, second, third].map((s) => `${s.x},${s.y}`)).size, 3);
});

test('a narrow desk stacks its cards down rather than off the side', () => {
  const slots = [];
  for (let i = 0; i < 3; i += 1) slots.push(nextSlot(slots, CARD_WIDTH + 20));
  assert.deepEqual(slots.map((s) => s.x), [12, 12, 12], 'one column when only one fits');
  assert.equal(new Set(slots.map((s) => s.y)).size, 3, 'and each one below the last');
});

test('a card dragged past the edge stays reachable', () => {
  const surface = { width: 800, height: 600 };
  assert.deepEqual(clampToSurface({ x: 5000, y: 5000 }, surface), { x: 752, y: 552 });
  assert.deepEqual(clampToSurface({ x: -300, y: -20 }, surface), { x: 0, y: 0 });
  assert.deepEqual(clampToSurface({ x: 120.4, y: 33.6 }, surface), { x: 120, y: 34 });
});

test('a desk restored onto a smaller window comes back on screen', () => {
  const saved = { x: 1400, y: 900 };
  const onLaptop = clampToSurface(saved, { width: 900, height: 500 });
  assert.ok(onLaptop.x <= 900 - 48 && onLaptop.y <= 500 - 48, `${JSON.stringify(onLaptop)} is off the surface`);
});
