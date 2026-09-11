// TST-0049 — a desk for each view, and a note on every view, in the store
// (FEAT-0015: TASK-0058, TASK-0059).
//
// Until 2026-09-11 a workspace had one desk and every view drew it. Edwin
// asked for a desk per view, with some notes kept on every view. The reducer
// is pure, so the whole rule is checked here without a window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const {
  reduce,
  initialState,
  normaliseState,
  persistable,
  deskCardsOf,
  everyViewCardsOf,
  viewCardsOf,
  isOnEveryView,
  isRendererAction,
  deskKey,
} = load('shared/store-state.js');
const { servedState, mergeServed, TABLET_LOCAL_ACTIONS } = load('shared/served-state.js');

const WS = 'aaaa1111';
const OTHER = 'bbbb2222';

function on(view, ws = WS) {
  let state = reduce(initialState(), { type: 'open-workspace', workspaceId: ws });
  return reduce(state, { type: 'select-view', viewId: view });
}

const ids = (state, view, ws = WS) => deskCardsOf(state, ws, view).map((c) => c.noteId);
const put = (state, noteId, x = 10, y = 10, extra = {}) => reduce(state, { type: 'put-on-desk', noteId, x, y, ...extra });

test('a state file from before desks per view draws the same notes on every view of every workspace', () => {
  // What every file written before 2026-09-11 holds: one list per workspace.
  const old = normaliseState({
    workspaceId: WS,
    viewId: 'issues',
    deskCards: {
      [WS]: [{ noteId: 'A', x: 1, y: 2 }, { noteId: 'B', x: 3, y: 4, w: 400, h: 300 }],
      [OTHER]: [{ noteId: 'C', x: 5, y: 6 }],
    },
  });
  for (const view of ['issues', 'features', 'tests']) {
    assert.deepEqual(deskCardsOf(old, WS, view), [{ noteId: 'A', x: 1, y: 2 }, { noteId: 'B', x: 3, y: 4, w: 400, h: 300 }], `${view} in the current workspace`);
    assert.deepEqual(ids(old, view, OTHER), ['C'], `${view} in a workspace that is not current`);
  }
  assert.equal(isOnEveryView(old, WS, 'A'), true, 'a note held before this reads as on every view');
  assert.deepEqual(old.viewDesks, {});
});

test('a note put on the Issues desk is not on the Features desk, and is where it was after a switch away and back', () => {
  let state = put(on('issues'), 'ISS-0001', 40, 50);
  assert.deepEqual(ids(state, 'issues'), ['ISS-0001']);
  assert.deepEqual(ids(state, 'features'), []);
  state = reduce(state, { type: 'select-view', viewId: 'features' });
  assert.deepEqual(deskCardsOf(state, WS), [], 'the Features desk, drawn by default for the chosen view');
  state = reduce(state, { type: 'select-view', viewId: 'issues' });
  const [card] = deskCardsOf(state, WS);
  assert.deepEqual([card.noteId, card.x, card.y], ['ISS-0001', 40, 50]);
});

test('an action naming a view changes that view’s desk only, and with no view chosen nothing is put anywhere', () => {
  let state = on('features');
  state = put(state, 'ISS-0002', 0, 0, { viewId: 'issues' });
  assert.deepEqual(ids(state, 'issues'), ['ISS-0002'], 'the named view');
  assert.deepEqual(ids(state, 'features'), [], 'not the chosen one');
  state = reduce(state, { type: 'move-card', noteId: 'ISS-0002', x: 99, y: 98, viewId: 'issues' });
  assert.deepEqual([deskCardsOf(state, WS, 'issues')[0].x, deskCardsOf(state, WS, 'issues')[0].y], [99, 98]);

  const unchosen = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  assert.equal(put(unchosen, 'ISS-0003'), unchosen, 'a note was put on a desk no view had been chosen for');
  assert.notEqual(put(unchosen, 'ISS-0003', 0, 0, { viewId: 'issues' }), unchosen, 'naming the view is enough');
});

test('a view switch moves no card and clears the open desk’s name', () => {
  let state = put(on('issues'), 'A');
  state = reduce(state, { type: 'save-desk', name: 'triage' });
  assert.equal(state.deskName, 'triage');
  const before = state;
  state = reduce(state, { type: 'select-view', viewId: 'features' });
  assert.equal(state.deskName, null, 'the name would describe a desk the screen is not showing');
  assert.equal(state.viewDesks, before.viewDesks);
  assert.equal(state.deskCards, before.deskCards);
});

test('Clear takes off the view’s own notes and leaves the notes on every view; the workspace reset takes everything', () => {
  let state = put(put(on('issues'), 'A'), 'B');
  state = reduce(state, { type: 'set-every-view', noteId: 'A', on: true });
  state = put(state, 'C', 0, 0, { viewId: 'features' });
  const cleared = reduce(state, { type: 'clear-desk' });
  assert.deepEqual(ids(cleared, 'issues'), ['A'], 'the note on every view stayed');
  assert.deepEqual(ids(cleared, 'features'), ['A', 'C'], 'another view was cleared');
  const reset = reduce(state, { type: 'clear-desk', scope: 'workspace' });
  for (const view of ['issues', 'features']) assert.deepEqual(ids(reset, view), [], view);
  assert.equal(reduce(reset, { type: 'clear-desk', scope: 'workspace' }), reset, 'an empty workspace was reset again');
});

test('marking puts a note on every view at its place, once; unmarking gives it back to the view it was unmarked on', () => {
  let state = put(on('issues'), 'N', 120, 80);
  state = put(state, 'N', 300, 300, { viewId: 'tests' });
  state = reduce(state, { type: 'set-every-view', noteId: 'N', on: true });
  for (const view of ['issues', 'features', 'tests']) {
    const drawn = deskCardsOf(state, WS, view).filter((c) => c.noteId === 'N');
    assert.equal(drawn.length, 1, `${view} draws it ${drawn.length} times`);
    assert.deepEqual([drawn[0].x, drawn[0].y], [120, 80], `${view} draws it at the Issues place`);
  }
  assert.equal(reduce(state, { type: 'set-every-view', noteId: 'N', on: true }), state, 'marking twice changed something');

  state = reduce(state, { type: 'select-view', viewId: 'features' });
  state = reduce(state, { type: 'set-every-view', noteId: 'N', on: false });
  assert.deepEqual(ids(state, 'features'), ['N'], 'unmarked on Features, it stays on Features');
  assert.deepEqual(ids(state, 'issues'), [], 'and leaves Issues');
  assert.deepEqual(ids(state, 'tests'), [], 'and every other view');
  assert.equal(isOnEveryView(state, WS, 'N'), false);
});

test('taking off a note on every view takes it off every view; a view’s own note leaves that view only', () => {
  let state = put(on('issues'), 'E');
  state = reduce(state, { type: 'set-every-view', noteId: 'E', on: true });
  state = put(state, 'O');
  state = put(state, 'O', 0, 0, { viewId: 'features' });
  const noE = reduce(state, { type: 'take-off-desk', noteId: 'E', viewId: 'features' });
  assert.deepEqual(ids(noE, 'issues'), ['O']);
  assert.deepEqual(ids(noE, 'features'), ['O']);
  const noO = reduce(state, { type: 'take-off-desk', noteId: 'O' });
  assert.deepEqual(ids(noO, 'issues'), ['E']);
  assert.deepEqual(ids(noO, 'features'), ['E', 'O'], 'Features kept its own copy');
});

test('stacking crosses both lists: a raised note on every view comes above the view’s own, a new note comes on top', () => {
  let state = put(on('issues'), 'E');
  state = reduce(state, { type: 'set-every-view', noteId: 'E', on: true });
  state = put(put(state, 'A'), 'B');
  assert.deepEqual(ids(state, 'issues'), ['E', 'A', 'B']);
  state = reduce(state, { type: 'raise-card', noteId: 'E' });
  assert.deepEqual(ids(state, 'issues'), ['A', 'B', 'E'], 'the note on every view did not rise');
  assert.equal(reduce(state, { type: 'raise-card', noteId: 'E' }), state, 'the top card was raised again');
  state = put(state, 'C');
  assert.deepEqual(ids(state, 'issues'), ['A', 'B', 'E', 'C'], 'a note just put on the desk is on top');
  state = reduce(state, { type: 'raise-card', noteId: 'A' });
  assert.deepEqual(ids(state, 'issues'), ['B', 'E', 'C', 'A']);
  // A file with no stacking numbers draws in its list order.
  const old = normaliseState({ viewId: 'issues', deskCards: { [WS]: [{ noteId: 'P', x: 0, y: 0 }] }, viewDesks: { [WS]: { issues: [{ noteId: 'Q', x: 0, y: 0 }, { noteId: 'R', x: 0, y: 0 }] } } });
  assert.deepEqual(ids(old, 'issues'), ['P', 'Q', 'R']);
});

test('no drawn desk ever holds two cards in the reading column, whatever is widened and marked', () => {
  // A seeded walk through widen, mark, unmark and view switches.
  let seed = 7;
  const rand = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const views = ['issues', 'features', 'tests'];
  const notes = ['A', 'B', 'C', 'D', 'E'];
  let state = on('issues');
  for (const view of views) {
    for (const id of notes.slice(0, 3 + rand(3))) state = put(state, id, rand(500), rand(500), { viewId: view });
  }
  for (let step = 0; step < 400; step += 1) {
    const view = views[rand(3)];
    const noteId = notes[rand(5)];
    const kind = rand(4);
    if (kind === 0) state = reduce(state, { type: 'widen-card', noteId, wide: true, viewId: view });
    else if (kind === 1) state = reduce(state, { type: 'widen-card', noteId, wide: false, viewId: view });
    else if (kind === 2) state = reduce(state, { type: 'set-every-view', noteId, on: rand(2) === 0, viewId: view });
    else state = reduce(state, { type: 'select-view', viewId: view });
    for (const v of views) {
      const wide = deskCardsOf(state, WS, v).filter((c) => c.wide === true).map((c) => c.noteId);
      assert.ok(wide.length <= 1, `step ${step}: ${v} draws ${wide.join(', ')} in the reading column`);
      const drawn = ids(state, v);
      assert.equal(new Set(drawn).size, drawn.length, `step ${step}: ${v} draws a note twice (${drawn.join(', ')})`);
    }
  }
});

test('a desk saved on Issues opens on Features as the Features desk, and the notes on every view stay put', () => {
  let state = put(put(on('issues'), 'A', 10, 10), 'B', 20, 20);
  state = put(state, 'E', 30, 30);
  state = reduce(state, { type: 'set-every-view', noteId: 'E', on: true });
  state = reduce(state, { type: 'save-desk', name: 'kept' });
  assert.deepEqual(state.desks[deskKey(WS, 'kept')].cards.map((c) => c.noteId), ['A', 'B', 'E'], 'saved flat, in stacking order');
  assert.equal(state.desks[deskKey(WS, 'kept')].cards.some((c) => 'z' in c), false, 'a saved desk keeps no stacking numbers');

  state = reduce(state, { type: 'select-view', viewId: 'features' });
  state = put(state, 'F');
  state = reduce(state, { type: 'open-desk', name: 'kept' });
  assert.deepEqual(ids(state, 'features').sort(), ['A', 'B', 'E'], 'the saved notes replaced Features’ own');
  assert.deepEqual(everyViewCardsOf(state, WS).map((c) => c.noteId), ['E'], 'the note on every view was not doubled');
  assert.deepEqual(ids(state, 'issues'), ['A', 'B', 'E'], 'Issues is untouched');
  assert.equal(state.deskName, 'kept');

  // A desk saved before this feature has the same shape and opens the same way.
  const old = normaliseState({ workspaceId: WS, viewId: 'tests', desks: { [deskKey(WS, 'old')]: { name: 'old', workspaceId: WS, cards: [{ noteId: 'Z', x: 1, y: 1 }] } } });
  const opened = reduce(old, { type: 'open-desk', name: 'old' });
  assert.deepEqual(viewCardsOf(opened, WS, 'tests').map((c) => c.noteId), ['Z']);
});

test('the file keeps each view’s desk, and a malformed one reads as empty rather than stopping Deck', () => {
  const state = put(on('issues'), 'A');
  const written = JSON.parse(JSON.stringify(persistable(state)));
  assert.deepEqual(ids(normaliseState(written), 'issues'), ['A']);
  for (const junk of [7, 'x', [], { [WS]: 3 }, { [WS]: { issues: 'no' } }, { [WS]: { issues: [null, 1, { x: 2 }] } }]) {
    const read = normaliseState({ viewId: 'issues', viewDesks: junk });
    assert.deepEqual(ids(read, 'issues'), [], JSON.stringify(junk));
  }
});

test('the network sees each view’s desk only for workspaces whose sidecar answers, and the tablet draws the Mac’s view’s desk', () => {
  let state = put(on('issues', OTHER), 'SECRET');
  state = reduce(state, { type: 'open-workspace', workspaceId: WS });
  state = reduce(state, { type: 'select-view', viewId: 'issues' });
  state = put(state, 'SHOWN');
  const served = servedState(state, new Set([WS]));
  assert.deepEqual(Object.keys(served.viewDesks), [WS]);
  let tablet = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  tablet = reduce(tablet, { type: 'select-view', viewId: 'features' });
  const drawn = mergeServed(served, tablet, false);
  assert.equal(drawn.viewId, 'features', 'the tablet browses its own view');
  assert.deepEqual(deskCardsOf(drawn, WS).map((c) => c.noteId), ['SHOWN'], 'and draws the desk of the Mac’s current view');
});

test('the mark crosses the window channel and is not something a tablet applies to its own copy', () => {
  assert.equal(isRendererAction({ type: 'set-every-view' }), true);
  assert.equal(TABLET_LOCAL_ACTIONS.has('set-every-view'), false);
});
