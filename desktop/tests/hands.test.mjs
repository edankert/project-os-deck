// TST-0043 — the hands' state: pull, push and let go are store transitions,
// shared by every window and never written to disk; a held note is a pane
// whose place, size, stack and reading column are the desk record Spread
// saves (TASK-0053, TASK-0054, TASK-0033's surface).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from './helpers.mjs';

const { reduce, initialState, normaliseState, persistable, pulledIn, pushedIn, isRendererAction, DEFAULT_SURFACE } = load('shared/store-state.js');
const { DeckStore } = load('main/store.js');
const { PANE_MIN_WIDTH, PANE_MIN_HEIGHT, PANE_HEADER_HEIGHT, snapBelowHeaders } = load('shared/panes.js');
const { parseAddress, formatAddress, addressFor } = load('shared/address.js');

const WS = 'aaaa1111';

function opened() {
  return reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
}

test('a pull and a push are recorded per workspace, and the later gesture wins', () => {
  let state = opened();
  state = reduce(state, { type: 'pull', noteId: 'ISS-0001' });
  state = reduce(state, { type: 'push', noteId: 'ISS-0002' });
  assert.deepEqual(pulledIn(state, WS), ['ISS-0001']);
  assert.deepEqual(pushedIn(state, WS), ['ISS-0002']);
  state = reduce(state, { type: 'push', noteId: 'ISS-0001' });
  assert.deepEqual(pulledIn(state, WS), [], 'a note is pulled or pushed, never both');
  assert.deepEqual(pushedIn(state, WS), ['ISS-0002', 'ISS-0001']);
  assert.equal(reduce(state, { type: 'push', noteId: 'ISS-0001' }), state, 'pushing again changes nothing');
});

test('let go clears both sets for this workspace and touches no other', () => {
  let state = opened();
  state = reduce(state, { type: 'pull', noteId: 'A' });
  state = reduce(state, { type: 'open-workspace', workspaceId: 'bbbb2222' });
  state = reduce(state, { type: 'push', noteId: 'B' });
  state = reduce(state, { type: 'let-go' });
  assert.deepEqual(pushedIn(state, 'bbbb2222'), []);
  assert.deepEqual(pulledIn(state, WS), ['A'], 'let go reached into another workspace');
  assert.equal(reduce(state, { type: 'let-go' }), state);
});

test('the persister drops the session part, and a restart starts with nothing pulled', () => {
  let state = opened();
  state = reduce(state, { type: 'pull', noteId: 'A' });
  state = reduce(state, { type: 'put-on-desk', noteId: 'B', x: 10, y: 20 });
  const written = persistable(state);
  assert.equal('session' in written, false);
  assert.deepEqual(normaliseState(JSON.parse(JSON.stringify(state))).session, { pulled: {}, pushed: {} }, 'a session read off disk was honoured');

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-hands-')), 'state.json');
  const store = new DeckStore({ file, writeDelayMs: 1 });
  store.dispatch({ type: 'open-workspace', workspaceId: WS });
  store.dispatch({ type: 'pull', noteId: 'A' });
  store.dispatch({ type: 'put-on-desk', noteId: 'B', x: 10, y: 20 });
  store.close();
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf-8'));
  assert.equal('session' in onDisk, false, 'the session was written to disk');
  const again = new DeckStore({ file });
  assert.deepEqual(pulledIn(again.getState(), WS), []);
  assert.deepEqual(again.getState().deskCards[WS].map((c) => c.noteId), ['B'], 'the desk itself is kept');
  again.close();
});

test('the hands and the panes cross the window channel; restore still does not', () => {
  for (const type of ['pull', 'push', 'let-go', 'resize-card', 'raise-card', 'widen-card', 'select-surface']) {
    assert.equal(isRendererAction({ type }), true, `${type} cannot be dispatched from a window`);
  }
  assert.equal(isRendererAction({ type: 'restore' }), false);
});

test('a pane is resized, never below the stated minimum, and the size survives a restart', () => {
  let state = opened();
  state = reduce(state, { type: 'put-on-desk', noteId: 'N', x: 0, y: 0 });
  state = reduce(state, { type: 'resize-card', noteId: 'N', w: 120, h: 40 });
  const card = state.deskCards[WS][0];
  assert.equal(card.w, PANE_MIN_WIDTH);
  assert.equal(card.h, PANE_MIN_HEIGHT);
  state = reduce(state, { type: 'resize-card', noteId: 'N', w: 500, h: 360 });
  state = reduce(state, { type: 'move-card', noteId: 'N', x: 40, y: 60 });
  const moved = state.deskCards[WS][0];
  assert.deepEqual([moved.x, moved.y, moved.w, moved.h], [40, 60, 500, 360], 'a move lost the size');
  const back = normaliseState(JSON.parse(JSON.stringify(persistable(state))));
  assert.deepEqual([back.deskCards[WS][0].w, back.deskCards[WS][0].h], [500, 360]);
  // A saved desk keeps the size too, which is the record Spread saves.
  state = reduce(state, { type: 'save-desk', name: 'kept' });
  assert.equal(state.desks[`${WS}:kept`].cards[0].w, 500);
});

test('a desk saved before panes existed reads as it did', () => {
  const old = normaliseState({ deskCards: { [WS]: [{ noteId: 'N', x: 3, y: 4 }] } });
  assert.deepEqual(old.deskCards[WS], [{ noteId: 'N', x: 3, y: 4 }]);
});

test('raising a pane moves it to the top of the stack, which is the end of the desk', () => {
  let state = opened();
  for (const id of ['A', 'B', 'C']) state = reduce(state, { type: 'put-on-desk', noteId: id, x: 0, y: 0 });
  state = reduce(state, { type: 'raise-card', noteId: 'A' });
  assert.deepEqual(state.deskCards[WS].map((c) => c.noteId), ['B', 'C', 'A']);
  assert.equal(reduce(state, { type: 'raise-card', noteId: 'A' }), state, 'the top pane was raised again');
});

test('one reading column: widening a second pane takes the first out of it', () => {
  let state = opened();
  for (const id of ['A', 'B']) state = reduce(state, { type: 'put-on-desk', noteId: id, x: 0, y: 0 });
  state = reduce(state, { type: 'widen-card', noteId: 'A', wide: true });
  state = reduce(state, { type: 'widen-card', noteId: 'B', wide: true });
  assert.deepEqual(state.deskCards[WS].map((c) => c.wide === true), [false, true]);
  state = reduce(state, { type: 'widen-card', noteId: 'B', wide: false });
  assert.deepEqual(state.deskCards[WS].map((c) => c.wide === true), [false, false]);
});

test('a pane dropped on another pane’s header snaps below it, down a whole stack', () => {
  const stack = [
    { noteId: 'A', x: 100, y: 100, w: 320 },
    { noteId: 'B', x: 100, y: 100 + PANE_HEADER_HEIGHT, w: 320 },
  ];
  const landed = snapBelowHeaders({ noteId: 'C', x: 120, y: 110, w: 320 }, stack);
  assert.equal(landed.y, 100 + 2 * PANE_HEADER_HEIGHT, 'a header in the stack is covered');
  const clear = snapBelowHeaders({ noteId: 'C', x: 600, y: 110, w: 320 }, stack);
  assert.equal(clear.y, 110, 'a pane beside the stack moved');
  const onBody = snapBelowHeaders({ noteId: 'C', x: 120, y: 260, w: 320 }, stack);
  assert.equal(onBody.y, 260, 'covering a body is allowed');
});

test('the surface is Glass unless a person chose otherwise, and the address writes only the exception', () => {
  assert.equal(initialState().surface, 'glass');
  assert.equal(DEFAULT_SURFACE, 'glass');
  let state = reduce(opened(), { type: 'select-surface', surface: 'spread' });
  assert.equal(state.surface, 'spread');
  assert.equal(reduce(state, { type: 'select-surface', surface: 'hologram' }), state, 'a surface nothing draws was stored');
  assert.equal(normaliseState({ surface: 'hologram' }).surface, 'glass');
  assert.equal(normaliseState({ surface: 'spread' }).surface, 'spread');
  const glass = formatAddress(addressFor(WS, 'issues', { note: 'ISS-0008' }));
  assert.equal(glass.includes('surface'), false);
  assert.equal(parseAddress(glass).surface, null, 'no surface in the address means Glass');
  const spread = formatAddress(addressFor(WS, 'issues', { surface: 'spread', note: 'ISS-0008' }));
  assert.equal(parseAddress(spread).surface, 'spread');
  // Neither the yaw nor the hands are part of an address.
  assert.throws(() => parseAddress(`deck://${WS}/issues?yaw=3`), /not part of an address/);
  assert.throws(() => parseAddress(`deck://${WS}/issues?pulled=ISS-0008`), /not part of an address/);
});
