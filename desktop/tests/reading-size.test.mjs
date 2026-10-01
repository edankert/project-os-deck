// TST-0065 — a document keeps the size a person chose (TASK-0104, ISS-0071).
//
// Edwin, 2026-09-12: "move should not change the size", and "the user makes a
// decision on how big the note should be and this should be respected (note:
// new notes opened should open in that size)". The rule is in two pure places,
// the reducer and `readingSizeFor`, so it is checked here without a window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { reduce, initialState, normaliseState, persistable, readingSizeOf, deskCardsOf } = load('shared/store-state.js');
const { READING_FIRST_USE, PANE_MIN_WIDTH, PANE_MIN_HEIGHT, PANE_MAX_SIDE, readingSizeFor, fitToField } = load('shared/panes.js');
const { servedState } = load('shared/served-state.js');

const WS = 'aaaa1111bbbb2222';

function opened(view = 'issues') {
  let state = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  state = reduce(state, { type: 'select-view', viewId: view });
  return state;
}
const card = (state, id, view) => deskCardsOf(state, WS, view).find((c) => c.noteId === id);
const size = (state, id, view) => {
  const c = card(state, id, view);
  return { w: c.w, h: c.h };
};

test('the size a document is drawn at: its own, then the view\'s, then the first-use size', () => {
  assert.deepEqual(readingSizeFor({ w: 700, h: 610 }, { w: 400, h: 300 }), { w: 700, h: 610, from: 'note' });
  assert.deepEqual(readingSizeFor({}, { w: 400, h: 300 }), { w: 400, h: 300, from: 'view' });
  assert.deepEqual(readingSizeFor({}, null), { ...READING_FIRST_USE, from: 'first-use' });
  assert.deepEqual(readingSizeFor({}, undefined), { ...READING_FIRST_USE, from: 'first-use' });
  // A desk saved by an older build may hold one side: that side is kept.
  assert.deepEqual(readingSizeFor({ w: 444 }, { w: 400, h: 300 }), { w: 444, h: 300, from: 'note' });
  assert.deepEqual(readingSizeFor({ h: 333 }, null), { w: READING_FIRST_USE.w, h: 333, from: 'note' });
});

test('the first-use size is a reading size, not the 320 by 240 preview it replaces', () => {
  // DES-0003 asks for about 60 to 80 characters a line. At the document's
  // 14 px text with 20 px of padding either side, an average character is
  // about 7 px wide, so 560 holds about 74.
  const characters = (READING_FIRST_USE.w - 40) / 7;
  assert.ok(characters >= 60 && characters <= 80, `the first-use width holds about ${characters.toFixed(0)} characters a line`);
  assert.ok(READING_FIRST_USE.h >= 400);
});

test('resizing a note sets its size and the size the next note opens at on that view', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 10, y: 10, w: READING_FIRST_USE.w, h: READING_FIRST_USE.h });
  assert.equal(readingSizeOf(state, WS, 'issues'), null, 'opening a note is not choosing a size');
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 700, h: 610 });
  assert.deepEqual(size(state, 'A'), { w: 700, h: 610 });
  assert.deepEqual(readingSizeOf(state, WS, 'issues'), { w: 700, h: 610 });
  // "new notes opened should open in that size": with nothing asked for, the
  // reducer writes the view's size on the new card.
  state = reduce(state, { type: 'put-on-desk', noteId: 'B', x: 40, y: 40 });
  assert.deepEqual(size(state, 'B'), { w: 700, h: 610 });
});

test('moving a note changes neither its size nor the view\'s', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 10, y: 10 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 640, h: 480 });
  const sizes = state.readingSizes;
  const moved = reduce(state, { type: 'move-card', noteId: 'A', x: 900, y: 55 });
  assert.deepEqual({ x: card(moved, 'A').x, y: card(moved, 'A').y }, { x: 900, y: 55 });
  assert.deepEqual(size(moved, 'A'), { w: 640, h: 480 }, 'a move changed the size');
  assert.equal(moved.readingSizes, sizes, 'a move touched the reading sizes');
  // Raising and widening are not resizes either.
  const raised = reduce(reduce(moved, { type: 'put-on-desk', noteId: 'B', x: 0, y: 0 }), { type: 'raise-card', noteId: 'A' });
  assert.deepEqual(size(raised, 'A'), { w: 640, h: 480 });
  assert.deepEqual(readingSizeOf(raised, WS, 'issues'), { w: 640, h: 480 });
  const widened = reduce(raised, { type: 'widen-card', noteId: 'A', wide: true });
  assert.deepEqual(size(widened, 'A'), { w: 640, h: 480 });
  assert.deepEqual(readingSizeOf(widened, WS, 'issues'), { w: 640, h: 480 });
});

test('resizing one note leaves every other open note the size it was', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 10, y: 10, w: 560, h: 520 });
  state = reduce(state, { type: 'put-on-desk', noteId: 'B', x: 40, y: 40, w: 560, h: 520 });
  state = reduce(state, { type: 'resize-card', noteId: 'B', w: 820, h: 700 });
  assert.deepEqual(size(state, 'A'), { w: 560, h: 520 }, 'resizing B changed A');
  assert.deepEqual(size(state, 'B'), { w: 820, h: 700 });
});

test('the size a window asks for wins over the view\'s when a note is opened', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 700, h: 610 });
  state = reduce(state, { type: 'put-on-desk', noteId: 'B', x: 0, y: 0, w: 500, h: 400 });
  assert.deepEqual(size(state, 'B'), { w: 500, h: 400 });
  // A size below what can be read, or absurdly large, is clamped as a resize is.
  state = reduce(state, { type: 'put-on-desk', noteId: 'C', x: 0, y: 0, w: 10, h: 99999 });
  assert.deepEqual(size(state, 'C'), { w: PANE_MIN_WIDTH, h: PANE_MAX_SIDE });
  // Half a size is no size: the view's is used.
  state = reduce(state, { type: 'put-on-desk', noteId: 'D', x: 0, y: 0, w: 500 });
  assert.deepEqual(size(state, 'D'), { w: 700, h: 610 });
});

test('a note opened where nobody has chosen a size carries none, as every card did before', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 12, y: 34 });
  assert.deepEqual(card(state, 'A'), { noteId: 'A', x: 12, y: 34, z: 1 });
  assert.deepEqual(readingSizeFor(card(state, 'A'), readingSizeOf(state, WS, 'issues')), { ...READING_FIRST_USE, from: 'first-use' });
});

test('each view keeps its own reading size, and so does each workspace', () => {
  let state = opened('issues');
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 700, h: 610 });
  state = reduce(state, { type: 'select-view', viewId: 'features' });
  assert.equal(readingSizeOf(state, WS, 'features'), null);
  state = reduce(state, { type: 'put-on-desk', noteId: 'F', x: 0, y: 0 });
  assert.equal(card(state, 'F').w, undefined, 'another view\'s size was used');
  state = reduce(state, { type: 'resize-card', noteId: 'F', w: 480, h: 360 });
  assert.deepEqual(readingSizeOf(state, WS, 'features'), { w: 480, h: 360 });
  assert.deepEqual(readingSizeOf(state, WS, 'issues'), { w: 700, h: 610 });
  // A window drawing a view other than the store's names it, as every desk action does.
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 720, h: 620, viewId: 'issues' });
  assert.deepEqual(readingSizeOf(state, WS, 'issues'), { w: 720, h: 620 });
  assert.deepEqual(readingSizeOf(state, WS, 'features'), { w: 480, h: 360 });
  assert.equal(readingSizeOf(state, 'ffff0000ffff0000', 'issues'), null);
  assert.equal(readingSizeOf(state, null, 'issues'), null);
  assert.equal(readingSizeOf(state, WS, null), null);
});

test('resizing clamps to what can be read, and a note that is not on the desk sets nothing', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 50, h: 20 });
  assert.deepEqual(size(state, 'A'), { w: PANE_MIN_WIDTH, h: PANE_MIN_HEIGHT });
  assert.deepEqual(readingSizeOf(state, WS, 'issues'), { w: PANE_MIN_WIDTH, h: PANE_MIN_HEIGHT });
  const same = reduce(state, { type: 'resize-card', noteId: 'NOT-HELD', w: 900, h: 900 });
  assert.equal(same, state, 'a note that is not held changed the state');
  // The same size again changes nothing, so no window is told to redraw.
  assert.equal(reduce(state, { type: 'resize-card', noteId: 'A', w: 50, h: 20 }), state);
});

test('a resize that changes only the view\'s size still counts as a change', () => {
  // A opened at the size the window asked for; the view has no size yet.
  // Resizing A to the size it already has is still the person choosing it.
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0, w: 560, h: 520 });
  const chosen = reduce(state, { type: 'resize-card', noteId: 'A', w: 560, h: 520 });
  assert.notEqual(chosen, state);
  assert.ok(chosen.revision > state.revision);
  assert.deepEqual(readingSizeOf(chosen, WS, 'issues'), { w: 560, h: 520 });
});

test('a state file written before reading sizes existed loads, and its notes keep their places and sizes', () => {
  const before = {
    workspaceId: WS,
    viewId: 'issues',
    deskCards: { [WS]: [{ noteId: 'OLD-1', x: 20, y: 30 }, { noteId: 'OLD-2', x: 60, y: 90, w: 500, h: 400 }] },
    viewDesks: { [WS]: { issues: [{ noteId: 'OLD-3', x: 5, y: 6, z: 4 }] } },
  };
  const state = normaliseState(before);
  assert.deepEqual(state.readingSizes, {});
  assert.deepEqual(card(state, 'OLD-1', 'issues'), { noteId: 'OLD-1', x: 20, y: 30 });
  assert.deepEqual(card(state, 'OLD-2', 'issues'), { noteId: 'OLD-2', x: 60, y: 90, w: 500, h: 400 });
  // Its own size wins; a note with none opens at the first-use size.
  assert.deepEqual(readingSizeFor(card(state, 'OLD-2', 'issues'), readingSizeOf(state, WS, 'issues')), { w: 500, h: 400, from: 'note' });
  assert.deepEqual(readingSizeFor(card(state, 'OLD-1', 'issues'), readingSizeOf(state, WS, 'issues')), { ...READING_FIRST_USE, from: 'first-use' });
});

test('reading sizes are written to the state file and read back, and junk in the file is no size', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 700, h: 610 });
  const again = normaliseState(JSON.parse(JSON.stringify(persistable(state))));
  assert.deepEqual(again.readingSizes, { [WS]: { issues: { w: 700, h: 610 } } });
  assert.deepEqual(size(again, 'A', 'issues'), { w: 700, h: 610 });
  for (const junk of [null, 7, 'x', [], { [WS]: 'x' }, { [WS]: [] }, { [WS]: { issues: null } }, { [WS]: { issues: { w: 'wide', h: 400 } } }, { [WS]: { issues: { w: 700 } } }]) {
    const read = normaliseState({ readingSizes: junk });
    assert.equal(readingSizeOf(read, WS, 'issues'), null, `read a size out of ${JSON.stringify(junk)}`);
  }
  // A size in the file is clamped as a resize is.
  const clamped = normaliseState({ readingSizes: { [WS]: { issues: { w: 1, h: 999999 } } } });
  assert.deepEqual(readingSizeOf(clamped, WS, 'issues'), { w: PANE_MIN_WIDTH, h: PANE_MAX_SIDE });
});

test('a tablet is told the reading size of a workspace it can open and of no other', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'A', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'A', w: 700, h: 610 });
  assert.deepEqual(servedState(state, new Set([WS])).readingSizes, { [WS]: { issues: { w: 700, h: 610 } } });
  assert.deepEqual(servedState(state, new Set()).readingSizes, {});
});

test('a field too small for a document draws it smaller and changes no stored size', () => {
  const chosen = { w: 900, h: 700 };
  const drawn = fitToField(chosen, { width: 640, height: 500 });
  assert.deepEqual(drawn, { w: 624, h: 484 });
  assert.deepEqual(chosen, { w: 900, h: 700 }, 'fitting changed the size it was given');
  // Room enough: drawn as chosen.
  assert.deepEqual(fitToField(chosen, { width: 1920, height: 1080 }), chosen);
  // Never below what can be read, however small the field.
  assert.deepEqual(fitToField(chosen, { width: 100, height: 100 }), { w: PANE_MIN_WIDTH, h: PANE_MIN_HEIGHT });
});
