// TST-0002 — the store broadcasts to every window and survives a restart,
// including a state file that has been damaged, and one an older Deck wrote.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { reduce, initialState, normaliseState, persistable, isRendererAction } = load('shared/store-state.js');
const { DeckStore } = load('main/store.js');
const { writeJsonFileAtomic, readJsonFile } = load('main/atomic-json.js');

function tmpFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-test-'));
  return path.join(dir, name);
}

test('the reducer is pure: it does not touch the state it was given', () => {
  const before = initialState();
  const snapshot = JSON.parse(JSON.stringify(before));
  const after = reduce(before, { type: 'open-workspace', workspaceId: 'aaaa1111' });
  assert.deepEqual(before, snapshot, 'the input state was mutated');
  assert.notEqual(after, before);
  assert.equal(after.workspaceId, 'aaaa1111');
  assert.equal(after.revision, before.revision + 1);
});

test('an action that changes nothing returns the same object', () => {
  const state = reduce(initialState(), { type: 'open-workspace', workspaceId: 'aaaa1111' });
  assert.equal(reduce(state, { type: 'open-workspace', workspaceId: 'aaaa1111' }), state);
  const named = reduce(state, { type: 'set-actor', actor: 'user:someone' });
  assert.equal(reduce(named, { type: 'set-actor', actor: 'user:someone' }), named);
});

test('an action this build does not know is ignored rather than fatal', () => {
  const state = initialState();
  assert.equal(reduce(state, { type: 'from-a-later-version' }), state);
  // And so is every action Spread and Glass used to send (ADR-0010).
  for (const action of [{ type: 'select-view', viewId: 'issues' }, { type: 'put-on-desk', noteId: 'X', x: 1, y: 2 }, { type: 'select-surface', surface: 'glass' }]) {
    assert.equal(reduce(state, action), state, `${action.type} changed the state`);
  }
});

test('every live subscriber sees every change, and a closed one sees none', () => {
  const store = new DeckStore({ file: tmpFile('state.json'), writeDelayMs: 5 });
  const windowA = [];
  const windowB = [];
  const unsubscribeA = store.subscribe((s) => windowA.push(s.workspaceId));
  store.subscribe((s) => windowB.push(s.workspaceId));
  // A subscriber is handed the current state at once.
  assert.deepEqual(windowA, [null]);
  assert.deepEqual(windowB, [null]);

  store.dispatch({ type: 'open-workspace', workspaceId: 'aaaa1111' });
  assert.deepEqual(windowA, [null, 'aaaa1111']);
  assert.deepEqual(windowB, [null, 'aaaa1111']);

  unsubscribeA();
  store.dispatch({ type: 'open-workspace', workspaceId: 'bbbb2222' });
  assert.deepEqual(windowA, [null, 'aaaa1111'], 'a closed window was still written to');
  assert.deepEqual(windowB, [null, 'aaaa1111', 'bbbb2222']);
  store.close();
});

test('one window that throws while rendering does not stop the others', () => {
  const store = new DeckStore({ file: tmpFile('state.json'), writeDelayMs: 5 });
  const seen = [];
  store.subscribe(() => {
    throw new Error('this window is broken');
  });
  store.subscribe((s) => seen.push(s.workspaceId));
  store.dispatch({ type: 'open-workspace', workspaceId: 'aaaa1111' });
  assert.deepEqual(seen, [null, 'aaaa1111']);
  store.close();
});

test('the state survives a restart, and the index revisions do not', () => {
  const file = tmpFile('state.json');
  const first = new DeckStore({ file, writeDelayMs: 1 });
  first.dispatch({ type: 'open-workspace', workspaceId: 'aaaa1111' });
  first.dispatch({ type: 'set-actor', actor: 'user:someone' });
  first.dispatch({ type: 'index-changed', workspaceId: 'aaaa1111', revision: 3 });
  first.close();

  const second = new DeckStore({ file, writeDelayMs: 1 });
  const state = second.getState();
  assert.equal(state.workspaceId, 'aaaa1111');
  assert.equal(state.actor, 'user:someone');
  // Rebuilt from disk at every start, so a number carried over would claim a change nobody made.
  assert.deepEqual(state.indexRevisions, {});
  second.close();
});

test('a state file an older Deck wrote opens with its workspace and its name, and nothing else', () => {
  // The shape a Deck with Spread and Glass wrote, before 2026-10-23 (ADR-0010).
  const old = {
    workspaceId: 'aaaa1111',
    viewId: 'issues',
    deskName: 'triage',
    noteId: 'FEAT-0002',
    desks: { 'aaaa1111:triage': { name: 'triage', workspaceId: 'aaaa1111', cards: [{ noteId: 'FEAT-0002', x: 10, y: 20 }] } },
    deskCards: { aaaa1111: [{ noteId: 'FEAT-0002', x: 10, y: 20 }] },
    viewDesks: { aaaa1111: { issues: [{ noteId: 'ISS-0001', x: 1, y: 2, w: 400, h: 300 }] } },
    readingSizes: { aaaa1111: { issues: { w: 640, h: 480 } } },
    collections: { aaaa1111: { issues: { x: 0, y: 0, w: 420, h: 600, collapsed: false, as: 'table' } } },
    actor: 'user:someone',
    query: 'ble',
    filters: { statuses: ['open'], types: ['issue'] },
    folds: { quiet: true },
    revision: 41,
    flowCursor: null,
    surface: 'glass',
  };
  const file = tmpFile('deck-state.json');
  fs.writeFileSync(file, JSON.stringify(old), 'utf-8');
  const store = new DeckStore({ file, writeDelayMs: 1 });
  assert.deepEqual(store.getState(), { workspaceId: 'aaaa1111', actor: 'user:someone', revision: 41, indexRevisions: {} });
  // The next write keeps only what Deck still has.
  store.dispatch({ type: 'set-actor', actor: 'user:another' });
  store.close();
  assert.deepEqual(readJsonFile(file), { workspaceId: 'aaaa1111', actor: 'user:another', revision: 42 });
});

test('a damaged state file leaves Deck starting from defaults', () => {
  for (const [what, contents] of [
    ['an empty file', ''],
    ['truncated JSON', '{"workspaceId": "aaa'],
    ['JSON of the wrong shape', '["not", "an", "object"]'],
    ['a number where the state should be', '42'],
    ['fields of the wrong type', '{"workspaceId": 5, "actor": ["no"], "revision": "later"}'],
  ]) {
    const file = tmpFile('state.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, 'utf-8');
    const store = new DeckStore({ file, writeDelayMs: 1 });
    assert.deepEqual(store.getState(), initialState(), `${what} did not fall back to defaults`);
    store.close();
  }
});

test('what is written is the workspace, the name and the revision', () => {
  const state = normaliseState({ workspaceId: 'aaaa1111', actor: 'user:someone', revision: 7 });
  assert.deepEqual(persistable(reduce(state, { type: 'index-changed', workspaceId: 'aaaa1111', revision: 2 })), { workspaceId: 'aaaa1111', actor: 'user:someone', revision: 8 });
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

test('a window may dispatch only what a window does: open a workspace and set the name', () => {
  assert.equal(isRendererAction({ type: 'open-workspace', workspaceId: 'aaaa1111' }), true);
  assert.equal(isRendererAction({ type: 'set-actor', actor: 'user:someone' }), true);
  // `restore` carries a whole state; `index-changed` would tell every window its picture is stale.
  assert.equal(isRendererAction({ type: 'restore', state: initialState() }), false);
  assert.equal(isRendererAction({ type: 'index-changed', workspaceId: 'aaaa1111', revision: 9 }), false);
  assert.equal(isRendererAction({ type: 'anything-else' }), false);
  assert.equal(isRendererAction(null), false);
  assert.equal(isRendererAction('open-workspace'), false);
  assert.equal(isRendererAction({}), false);
});

test("the store's source is text", () => {
  // Until 2026-10-02 a separator stood in the source as four raw NUL bytes, so `file`
  // called it data and `grep` skipped it.
  const source = fs.readFileSync(path.join(desktopRoot, 'src', 'shared', 'store-state.ts'));
  const control = [...source].filter((byte) => byte < 0x20 && byte !== 0x0a && byte !== 0x09);
  assert.deepEqual(control, [], 'the source holds bytes that are not text');
});
