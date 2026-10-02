// TST-0070: an arrangement is a plan before it is a move. It names what it
// moves, never changes a size, leaves alone what it does not name, and can be
// put back, except where a person has changed something since.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { planRead, planCompare, planRelated, planBasis, checkUndo, undoFor, ARRANGE_MARGIN, ARRANGE_GAP } = load('shared/arrange.js');
const { COLLECTION_HEAD_HEIGHT, cardGrid, rowOfMember, gridText } = load('shared/collection.js');
const { SEAT, SEAT_GAP } = load('shared/focus-ring.js');
const { reduce, initialState, deskCardsOf, collectionOf, DESK_ACTIONS, isRendererAction } = load('shared/store-state.js');

const field = { width: 1260, height: 745 };
const list = { x: 40, y: 60, w: 340, h: 600, collapsed: false, presentation: 'table' };
const doc = (noteId, x, y, w = 560, h = 520) => ({ noteId, x, y, w, h });
const input = (docs, collection = list, f = field) => ({ field: f, collection, docs });

test('Read puts the list down the left and the document beside it, at its own size', () => {
  const plan = planRead(input([doc('B', 600, 200), doc('A', 300, 120, 640, 560)]), 'A');
  assert.equal(plan.kind, 'read');
  assert.equal(plan.label, 'Read A');
  assert.deepEqual(plan.collection, { ...list, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN });
  assert.deepEqual(plan.cards, [{ noteId: 'A', x: ARRANGE_MARGIN + 340 + ARRANGE_GAP, y: ARRANGE_MARGIN }]);
  // Size is not part of a plan at all: there is nothing in it that could change one.
  assert.deepEqual(Object.keys(plan.cards[0]).sort(), ['noteId', 'x', 'y']);
  const outline = plan.objects.find((o) => o.id === 'A');
  assert.equal(outline.to.width, 640);
  assert.equal(outline.to.height, 560);
  // The other open note is not named, and the plan says it stays.
  assert.ok(!plan.cards.some((c) => c.noteId === 'B'));
  assert.ok(plan.notes.some((n) => n.includes('other open note stays')));
  // Reading is not gathering: no neighbourhood is brought round it.
  assert.equal(plan.focus, null);
  // A is already on top, so the stacking is left alone.
  assert.deepEqual(plan.order, []);
  // Asked for the one underneath, it is raised.
  assert.deepEqual(planRead(input([doc('B', 600, 200), doc('A', 300, 120)]), 'B').order, ['B']);
});

test('Read collapses the collection to its header when the two do not fit, and never shrinks the document', () => {
  const small = { width: 800, height: 600 };
  const plan = planRead(input([doc('A', 100, 100)], list, small), 'A');
  assert.equal(plan.collection.collapsed, true);
  assert.equal(plan.cards[0].y, ARRANGE_MARGIN + COLLECTION_HEAD_HEIGHT + ARRANGE_GAP, 'the document stands under the header, not over it');
  assert.equal(plan.objects.find((o) => o.id === 'A').to.width, 560);
  assert.ok(plan.notes.some((n) => n.includes('collapsed to its header')));
  // A document wider than the window keeps its size and the plan says so.
  const wide = planRead(input([doc('A', 0, 0, 900, 500)], list, small), 'A');
  assert.equal(wide.objects.find((o) => o.id === 'A')?.to.width ?? 900, 900);
  assert.ok(wide.notes.some((n) => n.includes('wider than this window')));
});

test('Read with no open note is refused in a sentence, and nothing is planned', () => {
  assert.match(planRead(input([]), 'A').refused, /needs an open note/);
});

test('Compare stands two documents side by side at their own sizes', () => {
  const wideField = { width: 1700, height: 900 };
  const plan = planCompare(input([doc('C', 900, 300), doc('A', 500, 200, 600, 500), doc('B', 50, 50, 520, 640)], list, wideField), 'A', 'B');
  const a = plan.cards.find((c) => c.noteId === 'A');
  const b = plan.cards.find((c) => c.noteId === 'B');
  assert.equal(a.x, ARRANGE_MARGIN + 340 + ARRANGE_GAP, 'beside the list when there is room for all three');
  assert.equal(b.x, a.x + 600 + ARRANGE_GAP, 'the second starts after the FIRST one\'s own width');
  assert.equal(a.y, b.y);
  assert.equal(plan.objects.find((o) => o.id === 'A').to.width, 600);
  assert.equal(plan.objects.find((o) => o.id === 'B').to.height, 640);
  assert.equal(plan.collection.collapsed, false);
  assert.ok(!plan.cards.some((c) => c.noteId === 'C'), 'a third note is left where a person put it');
});

test('Compare without room for the list collapses the collection and centres the two', () => {
  const plan = planCompare(input([doc('A', 500, 200), doc('B', 50, 50)]), 'A', 'B');
  assert.equal(plan.collection.collapsed, true);
  const a = plan.cards.find((c) => c.noteId === 'A');
  const b = plan.cards.find((c) => c.noteId === 'B');
  assert.equal(a.x, Math.round((1260 - (560 + ARRANGE_GAP + 560)) / 2));
  assert.equal(b.x - a.x, 560 + ARRANGE_GAP);
  assert.equal(a.y, ARRANGE_MARGIN + COLLECTION_HEAD_HEIGHT + ARRANGE_GAP);
});

test('Compare in a window too narrow for both keeps both sizes and says how far they overlap', () => {
  const small = { width: 900, height: 700 };
  const plan = planCompare(input([doc('A', 300, 200), doc('B', 50, 50)], list, small), 'A', 'B');
  const a = plan.cards.find((c) => c.noteId === 'A') ?? { x: 300 };
  const b = plan.cards.find((c) => c.noteId === 'B');
  assert.equal(a.x, ARRANGE_MARGIN);
  assert.equal(b.x, 900 - ARRANGE_MARGIN - 560);
  const over = a.x + 560 - b.x;
  assert.ok(over > 0);
  assert.ok(plan.notes.some((n) => n.includes(`overlap by ${over} px`)), plan.notes.join(' / '));
  for (const o of plan.objects.filter((x) => x.kind === 'document')) assert.equal(o.to.width, 560);
});

test('Compare needs two different open notes', () => {
  assert.match(planCompare(input([doc('A', 0, 0)]), 'A', 'A').refused, /two open notes/);
  assert.match(planCompare(input([doc('A', 0, 0)]), 'A', 'B').refused, /two open notes/);
});

test('Show related centres the document in the room beside the list, a row of cards down, gathers and opens its list', () => {
  const plan = planRelated(input([doc('A', 20, 20)]), 'A', 16);
  const left = ARRANGE_MARGIN + 340 + ARRANGE_GAP;
  const room = 1260 - ARRANGE_MARGIN - left;
  assert.deepEqual(plan.cards, [{ noteId: 'A', x: left + Math.round((room - 560) / 2), y: Math.round(ARRANGE_MARGIN + SEAT.height + SEAT_GAP) }]);
  assert.equal(plan.focus, 'A');
  assert.equal(plan.list, 'A');
  assert.ok(plan.notes.some((n) => n.includes('16 notes gather') && n.includes('all 16')));
  assert.ok(planRelated(input([doc('A', 20, 20)]), 'A', 0).notes.some((n) => n.includes('joined to no other note')));
});

test('Show related folds the collection to its header when the note does not fit beside the list, and stands the note under it', () => {
  const small = { width: 800, height: 600 };
  const plan = planRelated(input([doc('A', 100, 100)], list, small), 'A', 4);
  assert.deepEqual(plan.collection, { ...list, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN, collapsed: true });
  const header = plan.objects.find((o) => o.id === 'collection');
  assert.equal(header.to.height, COLLECTION_HEAD_HEIGHT, 'the preview outlines the header alone');
  // Centred in the whole field, since the list no longer takes the left of it, and a row of cards below the header.
  assert.deepEqual(plan.cards, [{ noteId: 'A', x: Math.round((800 - 560) / 2), y: Math.round(ARRANGE_MARGIN + COLLECTION_HEAD_HEIGHT + ARRANGE_GAP + SEAT.height + SEAT_GAP) }]);
  assert.ok(plan.notes.some((n) => n.includes('do not fit side by side') && n.includes('collapsed to its header')), plan.notes.join(' / '));
  // With room beside the list it is left open, and nothing is said about folding.
  const roomy = planRelated(input([doc('A', 100, 100)]), 'A', 4);
  assert.equal(roomy.collection.collapsed, false);
  assert.ok(!roomy.notes.some((n) => n.includes('collapsed')));
  // A view with no collection on the field has nothing to fold and says nothing about one.
  const none = planRelated(input([doc('A', 100, 100, 900, 500)], null, small), 'A', 4);
  assert.equal(none.collection, null);
  assert.ok(!none.notes.some((n) => n.includes('collapsed')));
});

test('a plan that would move nothing names no object', () => {
  const at = { x: ARRANGE_MARGIN + 340 + ARRANGE_GAP, y: ARRANGE_MARGIN };
  const plan = planRead(input([doc('A', at.x, at.y)], { ...list, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN }), 'A');
  assert.deepEqual(plan.cards, []);
  assert.equal(plan.collection, null);
  assert.deepEqual(plan.objects, []);
});

test('the basis of a plan changes when anything it was worked out from changes', () => {
  const base = planBasis(input([doc('A', 10, 10), doc('B', 50, 50)]));
  assert.equal(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)])), base);
  assert.notEqual(planBasis(input([doc('A', 11, 10), doc('B', 50, 50)])), base, 'a document moved');
  assert.notEqual(planBasis(input([doc('A', 10, 10, 600, 520), doc('B', 50, 50)])), base, 'a document resized');
  assert.notEqual(planBasis(input([doc('A', 10, 10)])), base, 'a document closed');
  assert.notEqual(planBasis(input([doc('B', 50, 50), doc('A', 10, 10)])), base, 'the stacking changed');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], { ...list, collapsed: true })), base, 'the collection was folded to its header');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], { ...list, presentation: 'cards' })), base, 'the collection changed from a table to cards');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], { ...list, x: 41 })), base, 'the collection moved');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], { ...list, w: 400 })), base, 'the collection was resized');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], null)), base, 'the collection left the field');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)], list, { width: 1000, height: 745 })), base, 'the window changed size');
  assert.notEqual(planBasis(input([doc('A', 10, 10), doc('B', 50, 50)]), '3 changed'), base, 'a changed result is waiting');
});

const undo = {
  label: 'Compare A and B',
  cards: [
    { noteId: 'A', before: { x: 500, y: 200 }, after: { x: 62, y: 62 }, size: { w: 560, h: 520 } },
    { noteId: 'B', before: { x: 50, y: 50 }, after: { x: 638, y: 62 }, size: { w: 560, h: 520 } },
  ],
  orderBefore: ['C', 'B', 'A'],
  collection: { before: list, after: { ...list, x: 12, y: 12, collapsed: true } },
  focusBefore: 'A',
  listBefore: null,
  emphasisBefore: null,
};

test('an undo puts back exactly what the arrangement moved when nothing has changed since', () => {
  const now = input([doc('C', 900, 300), doc('A', 62, 62), doc('B', 638, 62)], { ...list, x: 12, y: 12, collapsed: true });
  const check = checkUndo(undo, now);
  assert.deepEqual(check.changed, []);
  assert.deepEqual(check.cards, [{ noteId: 'A', x: 500, y: 200 }, { noteId: 'B', x: 50, y: 50 }]);
  assert.deepEqual(check.collection, list);
  assert.deepEqual(check.order, ['C', 'B', 'A']);
});

test('a plan leaves the collection\'s size alone, so in a field that is not a whole number of pixels high the undo still knows the collection', () => {
  // Until a plan stopped writing a height, a field 744.5 px high gave a planned height the store rounded,
  // and the undo took the collection for one a person had resized.
  const odd = { width: 1260, height: 744.5 };
  const tall = { ...list, h: 721 };
  const plan = planRead(input([doc('A', 300, 120)], tall, odd), 'A');
  assert.deepEqual(plan.collection, { ...tall, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN });
  const record = { ...undo, cards: [], collection: { before: tall, after: plan.collection } };
  const check = checkUndo(record, input([], plan.collection, odd));
  assert.deepEqual(check.changed, []);
  assert.deepEqual(check.collection, tall);
});

test('an undo names what a person changed since and leaves those objects alone', () => {
  // A was dragged, B was closed, and the collection was opened again by hand.
  const now = input([doc('C', 900, 300), doc('A', 300, 62)], { ...list, x: 12, y: 12, collapsed: false });
  const check = checkUndo(undo, now);
  assert.deepEqual(check.cards, [], 'neither document is put back');
  assert.equal(check.collection, null);
  assert.deepEqual(check.changed, ['A has been moved since', 'B has been closed since', 'the collection has been moved, resized or changed form since']);
  // Resized, not moved: also a different object from the one recorded.
  const resized = checkUndo(undo, input([doc('A', 62, 62, 700, 520), doc('B', 638, 62)], { ...list, x: 12, y: 12, collapsed: true }));
  assert.deepEqual(resized.changed, ['A has been resized since']);
  assert.deepEqual(resized.cards, [{ noteId: 'B', x: 50, y: 50 }]);
});

test('the cards presentation lays the members out in whole rows and draws only what is in view', () => {
  const area = { left: 12, top: 100, width: 620, height: 300 };
  const card = { width: SEAT.width, height: SEAT.height };
  const grid = cardGrid({ area, card, gap: 14, count: 131, firstRow: 0 });
  assert.equal(grid.columns, Math.floor((620 + 14) / (card.width + 14)));
  assert.equal(grid.rows, Math.floor((300 + 14) / (card.height + 14)));
  assert.equal(grid.drawn, grid.columns * grid.rows);
  assert.equal(grid.totalRows, Math.ceil(131 / grid.columns));
  assert.equal(grid.centres.length, grid.drawn);
  // No card reaches outside the area, and no two overlap.
  for (const c of grid.centres) {
    assert.ok(c.x - card.width / 2 >= area.left - 0.01 && c.x + card.width / 2 <= area.left + area.width + 0.01);
    assert.ok(c.y - card.height / 2 >= area.top - 0.01 && c.y + card.height / 2 <= area.top + area.height + 0.01);
  }
  for (let i = 0; i < grid.centres.length; i += 1) for (let j = i + 1; j < grid.centres.length; j += 1) {
    const a = grid.centres[i]; const b = grid.centres[j];
    assert.ok(Math.abs(a.x - b.x) >= card.width || Math.abs(a.y - b.y) >= card.height);
  }
  // Every member is reached by moving the first row: the rows, taken in turn, cover 0..130 once each.
  const seen = new Set();
  for (let row = 0; row < grid.totalRows; row += grid.rows) {
    const g = cardGrid({ area, card, gap: 14, count: 131, firstRow: row });
    for (let i = 0; i < g.drawn; i += 1) seen.add(g.first + i);
  }
  assert.equal(seen.size, 131);
  // Past the end is kept in range: the last rows, never an empty area.
  const end = cardGrid({ area, card, gap: 14, count: 131, firstRow: 999 });
  assert.equal(end.firstRow, grid.totalRows - grid.rows);
  assert.equal(end.first + end.drawn, 131);
  // Fewer members than fit: all drawn, and it says so.
  const few = cardGrid({ area, card, gap: 14, count: 5, firstRow: 3 });
  assert.equal(few.firstRow, 0);
  assert.equal(few.drawn, 5);
  assert.equal(gridText(few, 5, 0), 'all 5 drawn as cards');
  assert.match(gridText(grid, 131, 2), /^cards 1 to \d+ of 131 · .*table lists all · 2 of these are open or gathered elsewhere/);
  assert.equal(gridText(cardGrid({ area, card, gap: 14, count: 0, firstRow: 0 }), 0, 0), 'no notes to draw');
  assert.equal(rowOfMember(9, 4), 2);
  assert.equal(rowOfMember(-1, 4), 0);
});

function deskWith(cards) {
  let s = reduce(initialState(), { type: 'open-workspace', workspaceId: 'w' });
  s = reduce(s, { type: 'select-view', viewId: 'issues' });
  for (const c of cards) s = reduce(s, { type: 'put-on-desk', noteId: c.noteId, x: c.x, y: c.y, w: c.w ?? 560, h: c.h ?? 520 });
  return s;
}

// What the window does with a plan, through the real store: the desk is read
// as the store holds it, the record is made from that, and both Apply and Undo
// are one `arrange`.
const WS = 'w';
const VIEW = 'issues';
function deskInput(state, f) {
  return { field: f, collection: collectionOf(state, WS, VIEW), docs: deskCardsOf(state, WS, VIEW).map((c) => ({ noteId: c.noteId, x: c.x, y: c.y, w: c.w ?? 560, h: c.h ?? 520 })) };
}
const act = (from) => ({ type: 'arrange', cards: from.cards, order: from.order, ...(from.collection === null ? {} : { collection: from.collection }) });
const noSession = { focusBefore: null, listBefore: null, emphasisBefore: null };

test('in a field smaller than the stored collection, Apply stores no fitted size and Undo leaves the stored layout byte for byte what it was', () => {
  const stored = { x: 40, y: 60, w: 340, h: 820, collapsed: false, presentation: 'table' };
  const small = { width: 1260, height: 600 };
  let s = deskWith([{ noteId: 'A', x: 500, y: 200 }]);
  s = reduce(s, { type: 'set-collection', layout: stored });
  const before = JSON.stringify(collectionOf(s, WS, VIEW));
  const from = deskInput(s, small);
  const plan = planRead(from, 'A');
  // The list is 820 high and the field 600: it is DRAWN 600 high at the top, and the preview outlines that.
  const outline = plan.objects.find((o) => o.id === 'collection');
  assert.deepEqual(outline.from, { left: 40, top: 0, width: 340, height: 600 });
  assert.deepEqual(outline.to, { left: ARRANGE_MARGIN, top: 0, width: 340, height: 600 });
  // What is stored changes place only.
  assert.deepEqual(plan.collection, { ...stored, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN });
  const applied = reduce(s, act(plan));
  assert.deepEqual(collectionOf(applied, WS, VIEW), { ...stored, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN }, 'Apply wrote a width or a height');
  const check = checkUndo(undoFor(plan, from, noSession), deskInput(applied, small));
  assert.deepEqual(check.changed, []);
  const undone = reduce(applied, act(check));
  assert.equal(JSON.stringify(collectionOf(undone, WS, VIEW)), before);
  assert.deepEqual(deskCardsOf(undone, WS, VIEW).map((c) => [c.noteId, c.x, c.y]), [['A', 500, 200]]);
  // Folded to its header by a plan, it is stored at the size it had too.
  const narrow = { width: 800, height: 600 };
  const folded = planRead(deskInput(s, narrow), 'A');
  assert.deepEqual(folded.collection, { ...stored, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN, collapsed: true });
});

test('Undo leaves a note opened after the arrangement where it is in the stack: opened on top, it stays on top', () => {
  const wide = { width: 1700, height: 900 };
  const stack = (state) => deskCardsOf(state, WS, VIEW).map((c) => c.noteId);
  let s = deskWith([{ noteId: 'C', x: 900, y: 100 }, { noteId: 'B', x: 50, y: 100 }, { noteId: 'A', x: 500, y: 100 }]);
  const from = deskInput(s, wide);
  const plan = planCompare(from, 'B', 'C');
  const record = undoFor(plan, from, noSession);
  s = reduce(s, act(plan));
  assert.deepEqual(stack(s), ['A', 'B', 'C'], 'Compare raised its two');
  s = reduce(s, { type: 'put-on-desk', noteId: 'D', x: 300, y: 300, w: 560, h: 520 });
  assert.deepEqual(stack(s), ['A', 'B', 'C', 'D']);
  const check = checkUndo(record, deskInput(s, wide));
  assert.deepEqual(check.changed, [], 'opening a note is not a change to what the arrangement moved');
  assert.deepEqual(stack(reduce(s, act(check))), ['C', 'B', 'A', 'D'], 'the three are in the order they were, and the note opened since is still on top');
  // Opened since and then put under one of them by raising that one: it keeps the place it has.
  const raised = reduce(s, { type: 'raise-card', noteId: 'A' });
  assert.deepEqual(stack(raised), ['B', 'C', 'D', 'A']);
  assert.deepEqual(stack(reduce(raised, act(checkUndo(record, deskInput(raised, wide))))), ['C', 'B', 'D', 'A']);
  // With the stacking already what it was, the undo names no order.
  const same = checkUndo({ ...record, cards: [] }, { field: wide, collection: null, docs: [doc('C', 0, 0), doc('B', 0, 0), doc('A', 0, 0), doc('D', 0, 0)] });
  assert.deepEqual(same.order, []);
});

test('a collection that would be drawn where it already is, is not named and not stored', () => {
  // Stored 820 high and 60 down, in a field 600 high: it is drawn at the top either way.
  const tall = { x: ARRANGE_MARGIN, y: 60, w: 340, h: 820, collapsed: false, presentation: 'table' };
  const plan = planRead(input([doc('A', 300, 120)], tall, { width: 1260, height: 600 }), 'A');
  assert.equal(plan.collection, null);
  assert.deepEqual(plan.objects.map((o) => o.id), ['A']);
});

test('the store applies an arrangement as one change, and it changes no size', () => {
  let s = deskWith([{ noteId: 'A', x: 500, y: 200, w: 640, h: 560 }, { noteId: 'B', x: 50, y: 50 }, { noteId: 'C', x: 900, y: 300 }]);
  s = reduce(s, { type: 'set-collection', layout: list });
  const before = s.revision;
  const next = reduce(s, { type: 'arrange', cards: [{ noteId: 'A', x: 62, y: 62 }, { noteId: 'B', x: 718, y: 62 }, { noteId: 'NOT-OPEN', x: 5, y: 5 }], order: ['A', 'B'], collection: { ...list, x: 12, y: 12, collapsed: true } });
  assert.equal(next.revision, before + 1, 'one revision for the whole arrangement');
  const cards = deskCardsOf(next, 'w', 'issues');
  assert.deepEqual(cards.map((c) => c.noteId), ['C', 'A', 'B'], 'the two named end on top in the order given; the third is under them');
  const a = cards.find((c) => c.noteId === 'A');
  assert.deepEqual([a.x, a.y, a.w, a.h], [62, 62, 640, 560], 'moved, and still the size it was');
  assert.deepEqual([cards.find((c) => c.noteId === 'C').x, cards.find((c) => c.noteId === 'C').y], [900, 300], 'what was not named did not move');
  assert.equal(cards.length, 3, 'a place for a note that is not open opens nothing');
  assert.equal(collectionOf(next, 'w', 'issues').collapsed, true);
  assert.deepEqual(next.readingSizes, s.readingSizes, 'the size the next note opens at is not touched');
  // The same arrangement again changes nothing, so it is not a new revision.
  assert.equal(reduce(next, { type: 'arrange', cards: [{ noteId: 'A', x: 62, y: 62 }], order: ['A', 'B'] }), next);
  // Garbage is ignored, never thrown on.
  assert.equal(reduce(next, { type: 'arrange', cards: [{ noteId: 'A', x: NaN, y: 3 }, null], order: [7] }), next);
});

test('an arrangement is a desk action a window may send: it names the view whose desk it changes', () => {
  // Without the first a window's Apply is dropped at the channel; without the second the window does not
  // add the view it draws, and an arrangement made on one view lands on whichever the store has selected.
  assert.equal(isRendererAction({ type: 'arrange', cards: [] }), true, 'arrange cannot be dispatched from a window');
  assert.ok(DESK_ACTIONS.has('arrange'), 'a window would not name the view it draws on an arrangement');
  let s = deskWith([{ noteId: 'A', x: 500, y: 200 }]);
  s = reduce(s, { type: 'select-view', viewId: 'features' });
  s = reduce(s, { type: 'put-on-desk', noteId: 'A', x: 300, y: 300 });
  // The store shows Features; a window still drawing Issues arranges the Issues desk.
  const next = reduce(s, { type: 'arrange', cards: [{ noteId: 'A', x: 62, y: 62 }], collection: { ...list, x: 12, y: 12 }, viewId: 'issues' });
  assert.deepEqual(deskCardsOf(next, WS, 'issues').map((c) => [c.x, c.y]), [[62, 62]]);
  assert.deepEqual(deskCardsOf(next, WS, 'features').map((c) => [c.x, c.y]), [[300, 300]], 'the view on screen in the store took the arrangement');
  assert.deepEqual(collectionOf(next, WS, 'issues'), { ...list, x: 12, y: 12 });
  assert.equal(collectionOf(next, WS, 'features'), null);
});
