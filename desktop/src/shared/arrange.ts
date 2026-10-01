/**
 * Arrangements of the Glass desk (FEAT-0022, TASK-0102): Read, Compare and
 * Show related, each worked out as a PLAN before anything moves.
 *
 * A plan is what the preview shows and what Apply commits: where each
 * affected object stands now, where it will stand, and one sentence for
 * anything that does not fit. It moves objects and nothing else. No plan
 * changes a document's size or a note's text, and no plan touches a document
 * it does not name: one a person placed by hand stays where it was put
 * (DES-0003, "Arrangement commands").
 *
 * Everything here is pure, so the three layouts, what an undo may restore and
 * when a preview has gone stale are checked without a window.
 */
import { COLLECTION_HEAD_HEIGHT, type CollectionLayout } from './collection.js';
import { type Rect, SEAT, SEAT_GAP } from './focus-ring.js';

export type ArrangeKind = 'read' | 'compare' | 'related';

/** A document on the desk, as the plan reads it: its stored place and the size it is read at. */
export interface ArrangeDoc {
  noteId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArrangeInput {
  field: { width: number; height: number };
  /** The collection as it is drawn now, or null when the view has none on the field. */
  collection: CollectionLayout | null;
  /** Every document on this view's desk, lowest first: the last is the one on top. */
  docs: readonly ArrangeDoc[];
}

/** One object a plan affects, for the preview: named, with where it is and where it goes. */
export interface ArrangeObject {
  id: string;
  kind: 'document' | 'collection';
  from: Rect;
  to: Rect;
}

export interface ArrangePlan {
  kind: ArrangeKind;
  /** What the command is called on screen: "Read ISS-0070", "Compare A and B". */
  label: string;
  subjects: string[];
  /** The documents whose place changes, with their new place. Size is never part of a plan. */
  cards: Array<{ noteId: string; x: number; y: number }>;
  /** The documents that end on top, lowest first; empty when the stacking does not change. */
  order: string[];
  /** The collection's new layout, or null when it stays as it is. */
  collection: CollectionLayout | null;
  /** The document whose neighbourhood is gathered afterwards; null for none. */
  focus: string | null;
  /** The document whose list of related notes is opened afterwards; null to leave lists alone. */
  list: string | null;
  /** Every object that moves or changes form, for the preview to outline and name. */
  objects: ArrangeObject[];
  /** What a person should know before applying: what does not fit, what is collapsed, what stays. */
  notes: string[];
}

/** Why a command cannot be planned, in a sentence the control shows. */
export interface ArrangeRefusal {
  refused: string;
}

/** The space kept between an object and the field's edge, and between two objects. */
export const ARRANGE_MARGIN = 12;
export const ARRANGE_GAP = 16;

function rectOf(doc: ArrangeDoc): Rect {
  return { left: doc.x, top: doc.y, width: doc.w, height: doc.h };
}

function collectionRect(layout: CollectionLayout): Rect {
  return { left: layout.x, top: layout.y, width: layout.w, height: layout.collapsed ? COLLECTION_HEAD_HEIGHT : layout.h };
}

/** The same layout as the store would hold it: the store keeps whole pixels. */
function sameLayout(a: CollectionLayout, b: CollectionLayout): boolean {
  const r = Math.round;
  return r(a.x) === r(b.x) && r(a.y) === r(b.y) && r(a.w) === r(b.w) && r(a.h) === r(b.h) && a.collapsed === b.collapsed && a.presentation === b.presentation;
}

function moved(doc: ArrangeDoc, x: number, y: number): boolean {
  return Math.round(doc.x) !== Math.round(x) || Math.round(doc.y) !== Math.round(y);
}

/** The documents that must be raised so `top` end on top in that order, or [] when they already are. */
function orderFor(docs: readonly ArrangeDoc[], top: readonly string[]): string[] {
  const tail = docs.slice(-top.length).map((d) => d.noteId);
  return tail.length === top.length && tail.every((id, i) => id === top[i]) ? [] : [...top];
}

function finish(
  kind: ArrangeKind,
  label: string,
  input: ArrangeInput,
  places: ReadonlyArray<{ doc: ArrangeDoc; x: number; y: number }>,
  collection: CollectionLayout | null,
  focus: string | null,
  list: string | null,
  notes: string[],
): ArrangePlan {
  const objects: ArrangeObject[] = [];
  const cards: ArrangePlan['cards'] = [];
  for (const { doc, x, y } of places) {
    if (!moved(doc, x, y)) continue;
    cards.push({ noteId: doc.noteId, x: Math.round(x), y: Math.round(y) });
    objects.push({ id: doc.noteId, kind: 'document', from: rectOf(doc), to: { left: Math.round(x), top: Math.round(y), width: doc.w, height: doc.h } });
  }
  let nextCollection: CollectionLayout | null = null;
  if (collection !== null && input.collection !== null && !sameLayout(collection, input.collection)) {
    nextCollection = collection;
    objects.push({ id: 'collection', kind: 'collection', from: collectionRect(input.collection), to: collectionRect(collection) });
  }
  return {
    kind,
    label,
    subjects: places.map((p) => p.doc.noteId),
    cards,
    order: orderFor(input.docs, places.map((p) => p.doc.noteId)),
    collection: nextCollection,
    focus,
    list,
    objects,
    notes,
  };
}

/** The collection as the list down the left of the field: where Read and Show related want it. */
function collectionBeside(input: ArrangeInput): CollectionLayout | null {
  const c = input.collection;
  if (c === null) return null;
  // Whole pixels, as the store keeps them: a field 744.5 px high gave a
  // planned height of 720.5, the store kept 721, and the undo then took the
  // collection for one a person had resized.
  const h = Math.max(COLLECTION_HEAD_HEIGHT, Math.min(Math.round(c.h), Math.floor(input.field.height - 2 * ARRANGE_MARGIN)));
  return { ...c, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN, h, collapsed: false };
}

/** The collection as its header alone, top left: still there to open, and under nothing. */
function collectionAsHeader(input: ArrangeInput): CollectionLayout | null {
  const c = input.collection;
  return c === null ? null : { ...c, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN, collapsed: true };
}

/**
 * Read: one full document with the collection beside it.
 *
 * The collection goes down the left as the list, and the document to its
 * right at the top. When the two do not fit side by side the collection is
 * collapsed to its header, so it is still there to open, and the document
 * stands under that header. The document is never made smaller to fit.
 */
export function planRead(input: ArrangeInput, subject: string): ArrangePlan | ArrangeRefusal {
  const doc = input.docs.find((d) => d.noteId === subject);
  if (doc === undefined) return { refused: 'Read needs an open note: open one from the list or the field first' };
  const notes: string[] = [];
  const beside = collectionBeside(input);
  const { width } = input.field;
  let collection = beside;
  let x = ARRANGE_MARGIN;
  let y = ARRANGE_MARGIN;
  if (beside !== null) {
    x = beside.x + beside.w + ARRANGE_GAP;
    if (x + doc.w > width - ARRANGE_MARGIN) {
      collection = collectionAsHeader(input);
      x = ARRANGE_MARGIN;
      y = ARRANGE_MARGIN + COLLECTION_HEAD_HEIGHT + ARRANGE_GAP;
      notes.push(`The list and ${subject} do not fit side by side in this window, so the collection is collapsed to its header above it. Its header opens it again.`);
    }
  }
  if (doc.w > width - 2 * ARRANGE_MARGIN) notes.push(`${subject} is wider than this window. It keeps its size; its corner resizes it.`);
  const others = input.docs.length - 1;
  if (others > 0) notes.push(`${others === 1 ? 'The other open note stays' : `The ${others} other open notes stay`} where ${others === 1 ? 'it is' : 'they are'}.`);
  return finish('read', `Read ${subject}`, input, [{ doc, x, y }], collection, null, null, notes);
}

/**
 * Compare: two full documents side by side, each at its own size.
 *
 * To the right of the list when there is room for the list as well; else
 * across the field with the collection collapsed to its header; else, when
 * the two are wider together than the field, at its two sides, overlapping in
 * the middle, with a sentence saying by how much. Neither is made smaller.
 */
export function planCompare(input: ArrangeInput, first: string, second: string): ArrangePlan | ArrangeRefusal {
  const a = input.docs.find((d) => d.noteId === first);
  const b = input.docs.find((d) => d.noteId === second);
  if (a === undefined || b === undefined || first === second) return { refused: 'Compare needs two open notes: open a second one first' };
  const notes: string[] = [];
  const { width } = input.field;
  const both = a.w + ARRANGE_GAP + b.w;
  const beside = collectionBeside(input);
  let collection = beside;
  let ax: number;
  let bx: number;
  let y = ARRANGE_MARGIN;
  const afterList = beside === null ? ARRANGE_MARGIN : beside.x + beside.w + ARRANGE_GAP;
  if (afterList + both <= width - ARRANGE_MARGIN) {
    ax = afterList;
    bx = ax + a.w + ARRANGE_GAP;
  } else {
    if (beside !== null) {
      collection = collectionAsHeader(input);
      y = ARRANGE_MARGIN + COLLECTION_HEAD_HEIGHT + ARRANGE_GAP;
      notes.push('There is no room for the list beside two notes, so the collection is collapsed to its header above them. Its header opens it again.');
    }
    if (both <= width - 2 * ARRANGE_MARGIN) {
      ax = Math.round((width - both) / 2);
      bx = ax + a.w + ARRANGE_GAP;
    } else {
      ax = ARRANGE_MARGIN;
      bx = Math.max(ARRANGE_MARGIN, width - ARRANGE_MARGIN - b.w);
      const over = Math.max(0, Math.round(ax + a.w - bx));
      notes.push(`${first} and ${second} are ${Math.round(both)} px wide together and this window has ${Math.round(width - 2 * ARRANGE_MARGIN)}. They keep their sizes and overlap by ${over} px; pressing either brings it to the front.`);
    }
  }
  const others = input.docs.length - 2;
  if (others > 0) notes.push(`${others === 1 ? 'The other open note stays' : `The ${others} other open notes stay`} where ${others === 1 ? 'it is' : 'they are'}.`);
  return finish(
    'compare',
    `Compare ${first} and ${second}`,
    input,
    [
      { doc: a, x: ax, y },
      { doc: b, x: bx, y },
    ],
    collection,
    null,
    null,
    notes,
  );
}

/**
 * Show related: the document with what it is joined to gathered round it and
 * its complete list open.
 *
 * The document stands in the middle of the space to the right of the list,
 * one row of cards down from the top, so cards have room on every side. How
 * many are gathered is the caller's to say: this module does not know the
 * neighbourhood, only where the document goes.
 */
export function planRelated(input: ArrangeInput, subject: string, neighbours: number): ArrangePlan | ArrangeRefusal {
  const doc = input.docs.find((d) => d.noteId === subject);
  if (doc === undefined) return { refused: 'Show related needs an open note: open one from the list or the field first' };
  const notes: string[] = [];
  const beside = collectionBeside(input);
  const { width } = input.field;
  const left = beside === null ? ARRANGE_MARGIN : beside.x + beside.w + ARRANGE_GAP;
  const room = width - ARRANGE_MARGIN - left;
  let collection = beside;
  let x: number;
  if (doc.w <= room) {
    x = left + Math.round((room - doc.w) / 2);
  } else {
    collection = collectionAsHeader(input);
    x = Math.max(ARRANGE_MARGIN, Math.round((width - doc.w) / 2));
    if (beside !== null) notes.push(`The list and ${subject} do not fit side by side in this window, so the collection is collapsed to its header. Its header opens it again.`);
  }
  const y = ARRANGE_MARGIN + (collection !== null && collection.collapsed ? COLLECTION_HEAD_HEIGHT + ARRANGE_GAP : 0) + SEAT.height + SEAT_GAP;
  notes.push(
    neighbours === 0
      ? `${subject} is joined to no other note, so nothing gathers round it; its list says so.`
      : `${neighbours} ${neighbours === 1 ? 'note gathers' : 'notes gather'} round ${subject}, and its list of all ${neighbours} opens. A card that does not fit in the window stands beyond its edge and is in the list.`,
  );
  return finish('related', `Show what ${subject} is joined to`, input, [{ doc, x, y }], collection, subject, subject, notes);
}

/** Everything a plan was worked out from, as one string: when it changes, the preview is stale. */
export function planBasis(input: ArrangeInput, extra = ''): string {
  const c = input.collection;
  return [
    `${Math.round(input.field.width)}x${Math.round(input.field.height)}`,
    c === null ? '-' : `${c.x},${c.y},${c.w},${c.h},${c.collapsed},${c.presentation}`,
    input.docs.map((d) => `${d.noteId}@${Math.round(d.x)},${Math.round(d.y)},${Math.round(d.w)}x${Math.round(d.h)}`).join(';'),
    extra,
  ].join('|');
}

/** What an applied arrangement changed, kept for the window so it can be put back. */
export interface ArrangeUndo {
  label: string;
  /** Each document the arrangement moved: where it was, and where it was put. */
  cards: Array<{ noteId: string; before: { x: number; y: number }; after: { x: number; y: number }; size: { w: number; h: number } }>;
  /** The stacking before, lowest first, for the documents on the desk then. */
  orderBefore: string[];
  /** The collection before and after, when the arrangement changed it. */
  collection: { before: CollectionLayout; after: CollectionLayout } | null;
  focusBefore: string | null;
  listBefore: string | null;
  emphasisBefore: { noteId: string; kind: string } | null;
}

/** What the undo will and will not put back, given the desk as it is now. */
export interface UndoCheck {
  /** The documents still where the arrangement put them: these go back. */
  cards: Array<{ noteId: string; x: number; y: number }>;
  /** The collection goes back, or null when it was not changed or has been changed since. */
  collection: CollectionLayout | null;
  /** The stacking to restore, for the documents that are still open. */
  order: string[];
  /** What a person changed since, one sentence each. Empty means the undo is exact. */
  changed: string[];
}

/**
 * Compare an undo record with the desk now.
 *
 * A document that was moved, resized or closed since the arrangement is not
 * the object the record describes, so the undo leaves it alone and says so.
 * The same for the collection. Everything else goes back where it was.
 */
export function checkUndo(undo: ArrangeUndo, input: ArrangeInput): UndoCheck {
  const changed: string[] = [];
  const cards: UndoCheck['cards'] = [];
  for (const record of undo.cards) {
    const now = input.docs.find((d) => d.noteId === record.noteId);
    if (now === undefined) {
      changed.push(`${record.noteId} has been closed since`);
      continue;
    }
    if (Math.round(now.x) !== Math.round(record.after.x) || Math.round(now.y) !== Math.round(record.after.y)) {
      changed.push(`${record.noteId} has been moved since`);
      continue;
    }
    if (Math.round(now.w) !== Math.round(record.size.w) || Math.round(now.h) !== Math.round(record.size.h)) {
      changed.push(`${record.noteId} has been resized since`);
      continue;
    }
    cards.push({ noteId: record.noteId, x: record.before.x, y: record.before.y });
  }
  let collection: CollectionLayout | null = null;
  if (undo.collection !== null) {
    if (input.collection !== null && sameLayout(input.collection, undo.collection.after)) collection = undo.collection.before;
    else changed.push('the collection has been moved, resized or changed form since');
  }
  const open = new Set(input.docs.map((d) => d.noteId));
  const order = undo.orderBefore.filter((id) => open.has(id));
  const current = input.docs.map((d) => d.noteId).filter((id) => order.includes(id));
  return { cards, collection, order: order.every((id, i) => id === current[i]) ? [] : order, changed };
}
