// TST-0067 — a collection is exact, and what is kept for it is its place and
// not its rows (FEAT-0020, TASK-0095, REQ-0001).
//
// The collection is the view's derived list as an object on the Glass desk.
// Its membership is whatever the view's source returns now; the store keeps
// where it stands and how it is presented. Both halves are pure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const {
  COLLECTION_MIN_WIDTH, COLLECTION_MIN_HEIGHT, COLLECTION_MAX_SIDE, COLLECTION_HEAD_HEIGHT,
  defaultCollectionLayout, normaliseCollection, fitCollection, memberIds, summarise, countText, filterText,
  membershipChange, changeCount, changeText, removedSelectionText, anchorAt, anchorUnder, anchorsFrom, scrollTopForFirst, steadyOrder, scrollTopFor, nearestSurvivor,
} = load('shared/collection.js');
const { reduce, initialState, normaliseState, persistable, collectionOf, DESK_ACTIONS, isRendererAction } = load('shared/store-state.js');
const { servedState, TABLET_LOCAL_ACTIONS } = load('shared/served-state.js');
const { countDistinct, narrowGroups } = load('shared/search.js');

const WS = 'aaaa1111bbbb2222';
const card = (noteId, extra = {}) => ({ noteId, title: noteId, noteType: 'issue', status: 'open', rel: `${noteId}.md`, subtitle: null, owed: false, owedVerb: null, groupKey: 'g', severity: null, lastVerified: null, stale: false, progress: null, children: [], frontmatter: null, ...extra });
const group = (key, cards, extra = {}) => ({ key, label: key, needsHuman: false, suppressed: false, cards, ...extra });

function opened(view = 'issues') {
  let state = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  state = reduce(state, { type: 'select-view', viewId: view });
  return state;
}
const LAYOUT = { x: 40, y: 30, w: 420, h: 600, collapsed: false, presentation: 'table' };

test('the members of a collection are every note its groups hold, each once, children included, in list order', () => {
  const groups = [
    group('needs', [card('ISS-0002')], { needsHuman: true }),
    group('phase', [card('FEAT-0001', { children: [card('TASK-0001'), card('TASK-0002', { children: [card('TST-0001')] })] }), card('ISS-0002'), card('ISS-0003')]),
  ];
  assert.deepEqual(memberIds(groups), ['ISS-0002', 'FEAT-0001', 'TASK-0001', 'TASK-0002', 'TST-0001', 'ISS-0003']);
  // The count the list already shows is this number, so the two cannot disagree.
  assert.equal(memberIds(groups).length, countDistinct(groups));
  assert.deepEqual(memberIds([]), []);
});

test('the count resolves to exactly the rows it counts, including notes with no place in the field', () => {
  const groups = [group('a', [card('A', { children: [card('A1'), card('A2')] }), card('B'), card('C')])];
  // A and B have a slot in the field; C was counted past a band's capacity, and A's children are held under A.
  const placed = new Set(['A', 'B']);
  const all = summarise(groups, groups, false, placed);
  assert.deepEqual(all, { total: 5, shown: 5, narrowed: false, inField: 2, listOnly: 3 });
  assert.equal(all.inField + all.listOnly, all.shown, 'every note shown is in the field or in the list only');
  assert.equal(countText(all), '5 notes');
  // Narrowed: the header says how many of how many, and the parts still add up.
  const narrowing = { query: 'A', filters: { statuses: [], types: [] } };
  const shown = narrowGroups(groups, narrowing);
  const some = summarise(groups, shown, true, placed);
  assert.equal(some.total, 5);
  assert.equal(some.shown, memberIds(shown).length);
  assert.equal(some.inField + some.listOnly, some.shown);
  assert.equal(countText(some), `${some.shown} of 5 notes`);
  assert.equal(countText({ total: 1, shown: 1, narrowed: false, inField: 1, listOnly: 0 }), '1 note');
  assert.equal(countText({ total: 0, shown: 0, narrowed: false, inField: 0, listOnly: 0 }), '0 notes');
});

test('what narrows a list is said in words, and nothing is said when nothing does', () => {
  assert.equal(filterText('', { statuses: [], types: [] }), '');
  assert.equal(filterText('  ', { statuses: [], types: [] }), '');
  assert.equal(filterText('glass', { statuses: ['open'], types: ['issue'] }), '“glass” · status open · type issue');
  assert.equal(filterText('', { statuses: ['done'], types: [] }), 'status done');
});

test('a refreshed result is compared by note: added, removed, and changed in place', () => {
  const before = [group('a', [card('A'), card('B'), card('C', { children: [card('C1')] })])];
  const after = [group('a', [card('A'), card('C', { status: 'fixed', children: [card('C1')] }), card('D')])];
  const change = membershipChange(before, after);
  assert.deepEqual(change, { added: ['D'], removed: ['B'], changed: ['C'] });
  assert.equal(changeCount(change), 3);
  assert.equal(changeText(change), '3 notes changed: 1 added, 1 removed, 1 changed');
  // The same result again is no change, so nothing is announced.
  assert.deepEqual(membershipChange(before, before), { added: [], removed: [], changed: [] });
  assert.equal(changeText(membershipChange(before, before)), '');
  // A note moved to another heading, or newly owed, is a change even with the same status.
  assert.deepEqual(membershipChange([group('a', [card('A')])], [group('b', [card('A')])]).changed, ['A']);
  assert.deepEqual(membershipChange([group('a', [card('A')])], [group('a', [card('A', { owed: true })])]).changed, ['A']);
  assert.equal(changeText({ added: [], removed: ['B'], changed: [] }), '1 note changed: 1 removed');
});

test('a selected note that left the result is named, and its open document is said to stay', () => {
  const after = [group('a', [card('A')])];
  assert.equal(removedSelectionText('A', after, true), null);
  assert.equal(removedSelectionText(null, after, false), null);
  assert.equal(removedSelectionText('B', after, true), 'B is no longer in this list; its document stays open');
  assert.equal(removedSelectionText('B', after, false), 'B is no longer in this list');
  // A note held under another is still a member.
  assert.equal(removedSelectionText('A1', [group('a', [card('A', { children: [card('A1')] })])], false), null);
});

test('the nearest surviving row is the next one in the old order, else the one before', () => {
  const before = ['A', 'B', 'C', 'D'];
  assert.equal(nearestSurvivor('B', before, new Set(['A', 'C', 'D'])), 'C');
  assert.equal(nearestSurvivor('D', before, new Set(['A', 'B'])), 'B');
  assert.equal(nearestSurvivor('B', before, new Set(['A'])), 'A');
  assert.equal(nearestSurvivor('B', before, new Set()), null);
  assert.equal(nearestSurvivor('Z', before, new Set(before)), null);
});

test('the scroll anchor is a note, so the list comes back to the same row and not the same pixels', () => {
  const rows = [{ id: null, top: 0 }, { id: 'A', top: 30 }, { id: 'B', top: 56 }, { id: null, top: 82 }, { id: 'C', top: 112 }, { id: 'D', top: 138 }];
  // Scrolled so B's row is the first note's row at or below the top.
  const anchor = anchorAt(rows, 50);
  assert.deepEqual(anchor, { id: 'B', offset: -6 });
  assert.equal(scrollTopFor(anchor, rows), 50, 'the same rows scroll back to where they were');
  // The list was refreshed and a row was added above: B is 26 pixels lower, and so is the scroll.
  const grown = [{ id: null, top: 0 }, { id: 'NEW', top: 30 }, { id: 'A', top: 56 }, { id: 'B', top: 82 }, { id: 'C', top: 138 }];
  assert.equal(scrollTopFor(anchor, grown), 76);
  // The anchor's note is gone: nothing to scroll to, and the caller says so.
  assert.equal(scrollTopFor(anchor, [{ id: 'A', top: 30 }]), null);
  assert.equal(scrollTopFor(null, rows), null);
  // At the very top the anchor is the first note, not a heading.
  assert.deepEqual(anchorAt(rows, 0), { id: 'A', offset: -30 });
  // Past the last row: the last note is the one being read.
  assert.deepEqual(anchorAt(rows, 500), { id: 'D', offset: 362 });
  assert.equal(anchorAt([{ id: null, top: 0 }], 0), null);
});

test('the row under the pointer is the one that stays put when rows arrive above it', () => {
  // The list at its top; the pointer rests on C's row, 40 pixels down it.
  const rows = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'A', top: 30, group: 'deck:held' },
    { id: null, top: 60, group: 'g:one' },
    { id: 'B', top: 90, group: 'g:one' },
    { id: 'C', top: 120, group: 'g:one' },
  ];
  const anchor = anchorUnder(rows, 0, 130);
  assert.deepEqual(anchor, { id: 'C', offset: -120, group: 'g:one' });
  // A note is opened: it gets a row on the desk, above. The top row has not
  // moved, so anchoring on the top row would leave C 30 pixels lower, under
  // nothing, with B under the pointer instead.
  const grown = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'A', top: 30, group: 'deck:held' },
    { id: 'B', top: 60, group: 'deck:held' },
    { id: null, top: 90, group: 'g:one' },
    { id: 'B', top: 120, group: 'g:one' },
    { id: 'C', top: 150, group: 'g:one' },
  ];
  assert.equal(scrollTopFor(anchorAt(rows, 0), grown), 0, 'the top row alone would not scroll the list');
  assert.equal(scrollTopFor(anchor, grown), 30, 'the list scrolls by the row that arrived, and C is under the pointer still');
  // On a heading, or above the first row, there is no row to keep.
  assert.equal(anchorUnder(rows, 0, 70), null);
  assert.equal(anchorUnder(rows, 0, -5), null);
  // Scrolled: the point is in the list's scroll coordinates.
  assert.deepEqual(anchorUnder(rows, 100, 125), { id: 'C', offset: -20, group: 'g:one' });
});

test('when the pressed row leaves, the row below it is the one held still', () => {
  // Two notes are open. The pointer presses B under "joined"; C is the row below it.
  const rows = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'X', top: 30, group: 'deck:held' },
    { id: null, top: 60, group: 'deck:joined' },
    { id: 'A', top: 90, group: 'deck:joined' },
    { id: 'B', top: 120, group: 'deck:joined' },
    { id: 'C', top: 150, group: 'deck:joined' },
  ];
  const anchors = anchorsFrom(rows, 0, 130);
  assert.deepEqual(anchors.map((a) => a.id), ['B', 'C']);
  // B is opened: it gets a row on the desk and has none under "joined". One
  // row arrived above and one left at the pointer, so C has not moved.
  const after = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'X', top: 30, group: 'deck:held' },
    { id: 'B', top: 60, group: 'deck:held' },
    { id: null, top: 90, group: 'deck:joined' },
    { id: 'A', top: 120, group: 'deck:joined' },
    { id: 'C', top: 150, group: 'deck:joined' },
    { id: 'NEW', top: 180, group: 'deck:joined' },
  ];
  assert.equal(scrollTopForFirst(anchors, after), 0, 'C is where it was, so the list does not scroll');
  // Following B to its row on the desk would have scrolled the list back by sixty pixels' worth.
  assert.equal(scrollTopFor(anchors[0], after), 0);
  assert.notEqual(after.find((r) => r.id === 'B').top + anchors[0].offset, 0);
  // Nothing under the pointer survives under its heading: the pressed note, wherever it is.
  assert.equal(scrollTopForFirst(anchorsFrom(rows, 0, 130), [{ id: 'B', top: 400, group: 'g:other' }]), 280);
  assert.equal(scrollTopForFirst([], after), null);
  // A point on a heading has no row to start from.
  assert.deepEqual(anchorsFrom(rows, 0, 70), []);
});

test('rows that come from the desk keep their order while a person is on the list', () => {
  const previous = ['A', 'B', 'C', 'D'];
  // B was opened and left the group; E and F arrived; the fresh order puts them first.
  const fresh = ['F', 'E', 'D', 'C', 'A'];
  assert.deepEqual(steadyOrder(previous, fresh, true), ['A', 'C', 'D', 'F', 'E'], 'survivors keep their order and arrivals follow, in the fresh order');
  assert.deepEqual(steadyOrder(previous, fresh, false), fresh, 'with nobody on the list the fresh order is used');
  assert.deepEqual(steadyOrder([], fresh, true), fresh);
});

test('a note listed under two headings is kept by the heading its row was under', () => {
  // The same note on the desk, and under its own heading further down.
  const rows = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'B', top: 30, group: 'deck:held' },
    { id: null, top: 60, group: 'g:high' },
    { id: 'A', top: 90, group: 'g:high' },
    { id: 'B', top: 120, group: 'g:high' },
  ];
  const anchor = anchorAt(rows, 110);
  assert.deepEqual(anchor, { id: 'B', offset: -10, group: 'g:high' });
  // A heading of four rows arrives above: the row under the same heading is the one returned to.
  const grown = [
    { id: null, top: 0, group: 'deck:held' },
    { id: 'B', top: 30, group: 'deck:held' },
    { id: null, top: 60, group: 'deck:joined' },
    { id: 'C', top: 90, group: 'deck:joined' },
    { id: null, top: 120, group: 'g:high' },
    { id: 'A', top: 150, group: 'g:high' },
    { id: 'B', top: 180, group: 'g:high' },
  ];
  assert.equal(scrollTopFor(anchor, grown), 170, 'not 20, which is the same note on the desk');
  // Its heading is gone: the note's other row is better than losing the place.
  assert.equal(scrollTopFor(anchor, grown.slice(0, 2)), 20);
});

test('a view with nothing stored draws the default collection, down the left of the field', () => {
  const field = { width: 996, height: 780 };
  const layout = defaultCollectionLayout(field);
  assert.equal(layout.collapsed, false);
  assert.equal(layout.presentation, 'table');
  assert.ok(layout.x >= 0 && layout.y >= 0 && layout.x + layout.w <= field.width && layout.y + layout.h <= field.height);
  assert.ok(layout.w >= COLLECTION_MIN_WIDTH && layout.h >= COLLECTION_MIN_HEIGHT);
  // In a field too small for it, it is still at least the smallest readable size.
  const small = defaultCollectionLayout({ width: 200, height: 100 });
  assert.equal(small.w, COLLECTION_MIN_WIDTH);
  assert.equal(small.h, COLLECTION_MIN_HEIGHT);
  // And the store holds nothing for it until a person arranges it.
  assert.equal(collectionOf(opened(), WS, 'issues'), null);
});

test('the store keeps a collection\'s place, size, collapse and presentation, per view, and no row', () => {
  let state = opened('issues');
  state = reduce(state, { type: 'set-collection', layout: LAYOUT });
  assert.deepEqual(collectionOf(state, WS, 'issues'), LAYOUT);
  assert.equal(collectionOf(state, WS, 'features'), null, 'another view took the layout');
  // Only layout keys are kept: a row smuggled into the action is dropped.
  const smuggled = reduce(state, { type: 'set-collection', layout: { ...LAYOUT, x: 41, rows: ['ISS-0001'], members: 131, selected: 'ISS-0001' } });
  assert.deepEqual(Object.keys(collectionOf(smuggled, WS, 'issues')).sort(), ['collapsed', 'h', 'presentation', 'w', 'x', 'y']);
  // The same layout again changes nothing, so no window is told to redraw.
  assert.equal(reduce(state, { type: 'set-collection', layout: { ...LAYOUT } }), state);
  // Collapsing keeps the size, so expanding restores it.
  const collapsed = reduce(state, { type: 'set-collection', layout: { ...LAYOUT, collapsed: true } });
  assert.deepEqual(collectionOf(collapsed, WS, 'issues'), { ...LAYOUT, collapsed: true });
  assert.deepEqual(collectionOf(reduce(collapsed, { type: 'set-collection', layout: { ...collectionOf(collapsed, WS, 'issues'), collapsed: false } }), WS, 'issues'), LAYOUT);
  // A window drawing another view names it, as every desk action does.
  const other = reduce(state, { type: 'set-collection', layout: { ...LAYOUT, x: 500 }, viewId: 'features' });
  assert.equal(collectionOf(other, WS, 'features').x, 500);
  assert.equal(collectionOf(other, WS, 'issues').x, 40);
  assert.ok(DESK_ACTIONS.has('set-collection'));
  assert.ok(isRendererAction({ type: 'set-collection', layout: LAYOUT }));
});

test('a layout is clamped to what can be read, and one that is not whole is ignored', () => {
  let state = opened();
  state = reduce(state, { type: 'set-collection', layout: { x: -50, y: 12.6, w: 10, h: 999999, collapsed: false, presentation: 'table' } });
  assert.deepEqual(collectionOf(state, WS, 'issues'), { x: 0, y: 13, w: COLLECTION_MIN_WIDTH, h: COLLECTION_MAX_SIDE, collapsed: false, presentation: 'table' });
  for (const broken of [null, 7, [], {}, { x: 1, y: 2, w: 300 }, { x: 'a', y: 2, w: 300, h: 300 }, { x: 1, y: 2, w: NaN, h: 300 }]) {
    assert.equal(reduce(state, { type: 'set-collection', layout: broken }), state, `${JSON.stringify(broken)} changed the state`);
    assert.equal(normaliseCollection(broken), null);
  }
  // A presentation nobody defined reads as the table, the form that reaches every member.
  assert.equal(normaliseCollection({ ...LAYOUT, presentation: 'carousel' }).presentation, 'table');
  assert.equal(normaliseCollection({ ...LAYOUT, presentation: 'cards' }).presentation, 'cards');
  assert.equal(normaliseCollection({ ...LAYOUT, collapsed: 'yes' }).collapsed, false);
  // With no workspace or no view there is no desk to put it on.
  assert.equal(reduce(initialState(), { type: 'set-collection', layout: LAYOUT }).collections[WS], undefined);
});

test('a state file written before collections existed loads, and a junk entry is no layout', () => {
  const before = { workspaceId: WS, viewId: 'issues', deskCards: { [WS]: [{ noteId: 'OLD', x: 1, y: 2 }] } };
  const state = normaliseState(before);
  assert.deepEqual(state.collections, {});
  assert.equal(collectionOf(state, WS, 'issues'), null);
  assert.equal(state.deskCards[WS].length, 1, 'the old desk was lost');
  for (const junk of [null, 7, 'x', [], { [WS]: 'x' }, { [WS]: [] }, { [WS]: { issues: null } }, { [WS]: { issues: { x: 1 } } }]) {
    assert.equal(collectionOf(normaliseState({ collections: junk }), WS, 'issues'), null, `read a layout out of ${JSON.stringify(junk)}`);
  }
  // Written and read back, whole.
  let live = opened();
  live = reduce(live, { type: 'set-collection', layout: { ...LAYOUT, presentation: 'cards', collapsed: true } });
  const again = normaliseState(JSON.parse(JSON.stringify(persistable(live))));
  assert.deepEqual(collectionOf(again, WS, 'issues'), { ...LAYOUT, presentation: 'cards', collapsed: true });
  // What is written holds no row: the keys of the stored layout are all there is.
  const written = JSON.stringify(persistable(live).collections);
  assert.ok(!/noteId|rows|members/.test(written), written);
});

test('a tablet is told the layout of a workspace it can open, and cannot change it', () => {
  let state = opened();
  state = reduce(state, { type: 'set-collection', layout: LAYOUT });
  assert.deepEqual(servedState(state, new Set([WS])).collections, { [WS]: { issues: LAYOUT } });
  assert.deepEqual(servedState(state, new Set()).collections, {});
  // The tablet follows the Mac's desk and arranges nothing on it (ADR-0001).
  assert.ok(!TABLET_LOCAL_ACTIONS.has('set-collection'));
});

test('a field smaller than the collection draws it inside the field and changes nothing stored', () => {
  const stored = { x: 900, y: 700, w: 800, h: 900, collapsed: false, presentation: 'table' };
  const drawn = fitCollection(stored, { width: 640, height: 480 });
  assert.deepEqual(stored, { x: 900, y: 700, w: 800, h: 900, collapsed: false, presentation: 'table' }, 'fitting changed what it was given');
  assert.equal(drawn.w, 640);
  assert.equal(drawn.h, 480);
  assert.ok(drawn.x >= 0 && drawn.x + drawn.w <= 640);
  // The whole of it is inside the field, so its last row and its corner are in reach.
  assert.ok(drawn.y >= 0 && drawn.y + drawn.h <= 480);
  const low = fitCollection({ x: 10, y: 900, w: 300, h: 300, collapsed: false, presentation: 'table' }, { width: 640, height: 480 });
  assert.equal(low.y + low.h, 480, 'a collection stored below the field is not drawn with its corner out of reach');
  // Collapsed it is only its header, and that is what is kept inside.
  const header = fitCollection({ x: 10, y: 900, w: 300, h: 300, collapsed: true, presentation: 'table' }, { width: 640, height: 480 });
  assert.equal(header.y, 480 - COLLECTION_HEAD_HEIGHT);
  // Room enough: drawn as stored.
  assert.deepEqual(fitCollection(LAYOUT, { width: 1920, height: 1080 }), LAYOUT);
});
