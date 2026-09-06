// TST-0002 — the store broadcasts to every window and survives a restart,
// including a state file that has been damaged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from './helpers.mjs';

const { reduce, initialState, normaliseState, deskKey } = load('shared/store-state.js');
const { DeckStore } = load('main/store.js');
const { writeJsonFileAtomic, readJsonFile } = load('main/atomic-json.js');

function tmpFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-test-'));
  return path.join(dir, name);
}

test('the reducer is pure: it does not touch the state it was given', () => {
  const before = initialState();
  const snapshot = JSON.parse(JSON.stringify(before));
  const after = reduce(before, { type: 'select-view', viewId: 'a-view' });
  assert.deepEqual(before, snapshot, 'the input state was mutated');
  assert.notEqual(after, before);
  assert.equal(after.viewId, 'a-view');
});

test('an action that changes nothing returns the same object', () => {
  const state = reduce(initialState(), { type: 'select-view', viewId: 'a-view' });
  assert.equal(reduce(state, { type: 'select-view', viewId: 'a-view' }), state);
});

test('opening a different workspace clears what belonged to the old one', () => {
  let state = initialState();
  state = reduce(state, { type: 'open-workspace', workspaceId: 'aaaa1111' });
  state = reduce(state, { type: 'select-view', viewId: 'a-view' });
  state = reduce(state, { type: 'focus-note', noteId: 'FEAT-0002' });
  state = reduce(state, { type: 'open-workspace', workspaceId: 'bbbb2222' });
  assert.equal(state.viewId, null);
  assert.equal(state.noteId, null);
  assert.equal(state.deskName, null);
});

test('an action this build does not know is ignored rather than fatal', () => {
  const state = initialState();
  assert.equal(reduce(state, { type: 'from-a-later-version' }), state);
});

test('every live subscriber sees every change, and a closed one sees none', () => {
  const store = new DeckStore({ file: tmpFile('state.json'), writeDelayMs: 5 });
  const windowA = [];
  const windowB = [];
  const unsubscribeA = store.subscribe((s) => windowA.push(s.noteId));
  store.subscribe((s) => windowB.push(s.noteId));
  // A subscriber is handed the current state at once.
  assert.deepEqual(windowA, [null]);
  assert.deepEqual(windowB, [null]);

  store.dispatch({ type: 'focus-note', noteId: 'FEAT-0002' });
  assert.deepEqual(windowA, [null, 'FEAT-0002']);
  assert.deepEqual(windowB, [null, 'FEAT-0002']);

  unsubscribeA();
  store.dispatch({ type: 'focus-note', noteId: 'FEAT-0003' });
  assert.deepEqual(windowA, [null, 'FEAT-0002'], 'a closed window was still written to');
  assert.deepEqual(windowB, [null, 'FEAT-0002', 'FEAT-0003']);
  store.close();
});

test('one window that throws while rendering does not stop the others', () => {
  const store = new DeckStore({ file: tmpFile('state.json'), writeDelayMs: 5 });
  const seen = [];
  store.subscribe(() => {
    throw new Error('this window is broken');
  });
  store.subscribe((s) => seen.push(s.noteId));
  store.dispatch({ type: 'focus-note', noteId: 'FEAT-0002' });
  assert.deepEqual(seen, [null, 'FEAT-0002']);
  store.close();
});

test('the state survives a restart', () => {
  const file = tmpFile('state.json');
  const first = new DeckStore({ file, writeDelayMs: 1 });
  first.dispatch({ type: 'open-workspace', workspaceId: 'aaaa1111' });
  first.dispatch({ type: 'select-view', viewId: 'a-view' });
  first.dispatch({ type: 'focus-note', noteId: 'FEAT-0002' });
  first.dispatch({
    type: 'save-desk',
    desk: { name: 'triage', workspaceId: 'aaaa1111', cards: [{ noteId: 'FEAT-0002', x: 10, y: 20 }] },
  });
  first.close();

  const second = new DeckStore({ file, writeDelayMs: 1 });
  const state = second.getState();
  assert.equal(state.workspaceId, 'aaaa1111');
  assert.equal(state.viewId, 'a-view');
  assert.equal(state.noteId, 'FEAT-0002');
  assert.deepEqual(state.desks[deskKey('aaaa1111', 'triage')].cards, [{ noteId: 'FEAT-0002', x: 10, y: 20 }]);
  second.close();
});

test('a damaged state file leaves Deck starting from defaults', () => {
  for (const [what, contents] of [
    ['an empty file', ''],
    ['truncated JSON', '{"workspaceId": "aaa'],
    ['JSON of the wrong shape', '["not", "an", "object"]'],
    ['a number where the state should be', '42'],
    ['fields of the wrong type', '{"workspaceId": 5, "desks": "no", "revision": "later"}'],
  ]) {
    const file = tmpFile('state.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, 'utf-8');
    const store = new DeckStore({ file, writeDelayMs: 1 });
    assert.deepEqual(store.getState(), initialState(), `${what} did not fall back to defaults`);
    store.close();
  }
});

test('a desk of the wrong shape is dropped rather than kept half-read', () => {
  const state = normaliseState({
    workspaceId: 'aaaa1111',
    desks: {
      good: { name: 'a', workspaceId: 'aaaa1111', cards: [{ noteId: 'X', x: 1, y: 2 }] },
      nameless: { workspaceId: 'aaaa1111', cards: [] },
      notAnObject: 7,
      badCards: { name: 'b', workspaceId: 'aaaa1111', cards: [{ x: 1 }, { noteId: 'Y' }] },
    },
  });
  assert.deepEqual(Object.keys(state.desks).sort(), ['badCards', 'good']);
  assert.deepEqual(state.desks.badCards.cards, [{ noteId: 'Y', x: 0, y: 0 }]);
});

test('the write is atomic: a reader never sees half a file', () => {
  const file = tmpFile('atomic.json');
  writeJsonFileAtomic(file, { a: 1 });
  assert.deepEqual(readJsonFile(file), { a: 1 });

  // The temporary file is renamed into place, so nothing partial is ever
  // visible at the real path, and no stray temporary file is left behind.
  const dir = path.dirname(file);
  const leftovers = fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'));
  assert.deepEqual(leftovers, []);

  writeJsonFileAtomic(file, { a: 2 });
  assert.deepEqual(readJsonFile(file), { a: 2 });
});

test('reading a file that is not there is not an error', () => {
  assert.equal(readJsonFile(path.join(os.tmpdir(), 'deck-does-not-exist-1234.json')), null);
});


test('a window may not replace the whole state through the dispatch channel', () => {
  const { isRendererAction } = load('shared/store-state.js');
  assert.equal(isRendererAction({ type: 'focus-note', noteId: 'X' }), true);
  assert.equal(isRendererAction({ type: 'save-desk', desk: {} }), true);
  // `restore` carries a whole state, saved desks included.
  assert.equal(isRendererAction({ type: 'restore', state: initialState() }), false);
  assert.equal(isRendererAction({ type: 'anything-else' }), false);
  assert.equal(isRendererAction(null), false);
  assert.equal(isRendererAction('focus-note'), false);
  assert.equal(isRendererAction({}), false);
});
