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
import { COLLECTION_HEAD_HEIGHT, type CollectionLayout, fitCollection } from './collection.js';
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
  /**
   * The collection as the STORE holds it (the default, for a view with none
   * stored), or null when the view has none on the field. Where it is drawn
   * is worked out from this and the field (`fitCollection`). A plan is made
   * from the stored layout because a plan is what the store is told: made
   * from the drawn one, a window smaller than the collection wrote its
   * fitted height into the store, and the undo put that back as "before".
   */
  collection: CollectionLayout | null;
  /** Every document on this view's desk, lowest first: the last is the one on top. */
  docs: readonly ArrangeDoc[];
  /**
   * The field shows one object in front at a time and carries a bar that
   * names the collection and each open note (a narrow field, DES-0003). A
   * plan stores the same places there; what it says about reaching a
   * document that lies under another is different.
   */
  oneAtATime?: boolean;
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
  /** The collection's new layout as the store will hold it, or null when it stays as it is. Its size is never changed. */
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
  if (collection !== null && input.collection !== null) {
    // Named, and stored, only when it will be DRAWN somewhere else or in
    // another form. A collection taller than the field is drawn at the top
    // whatever height it is stored at, and a plan that says it moves when
    // nothing on screen would is not a preview of anything.
    const from = fitCollection(input.collection, input.field);
    const to = fitCollection(collection, input.field);
    if (!sameLayout(to, from)) {
      nextCollection = collection;
      objects.push({ id: 'collection', kind: 'collection', from: collectionRect(from), to: collectionRect(to) });
    }
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

/**
 * The collection as the list down the left of the field: where Read and Show
 * related want it. Only where it stands and whether it is folded change. Its
 * size is the one a person gave it and stays what the store holds: in a field
 * too small for it, it is drawn smaller and stored as it was.
 */
function collectionBeside(input: ArrangeInput): CollectionLayout | null {
  const c = input.collection;
  return c === null ? null : { ...c, x: ARRANGE_MARGIN, y: ARRANGE_MARGIN, collapsed: false };
}

/** A planned layout as it will be drawn in this field: what a document is stood beside. */
function drawn(layout: CollectionLayout | null, input: ArrangeInput): CollectionLayout | null {
  return layout === null ? null : fitCollection(layout, input.field);
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
  const list = drawn(beside, input);
  const { width } = input.field;
  let collection = beside;
  let x = ARRANGE_MARGIN;
  let y = ARRANGE_MARGIN;
  if (list !== null) {
    x = list.x + list.w + ARRANGE_GAP;
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
  const list = drawn(beside, input);
  let collection = beside;
  let ax: number;
  let bx: number;
  let y = ARRANGE_MARGIN;
  const afterList = list === null ? ARRANGE_MARGIN : list.x + list.w + ARRANGE_GAP;
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
      // How the one underneath is reached is said as the build offers it. A
      // narrow field shows one object at a time, and its bar names each open
      // note. Elsewhere the second stands on top: where it covers the first
      // completely there is nothing of the first to press, and its header is
      // still reached with Tab, where Enter brings it to the front.
      const covered = bx <= ax && bx + b.w >= ax + a.w && b.h >= a.h;
      const reach =
        input.oneAtATime === true
          ? `one is shown at a time in a window this narrow: the bar along its top names ${first} and ${second}, and pressing a name shows that note`
          : covered
            ? `${second} covers ${first} completely. Tab reaches ${first}'s header, and Enter there brings it to the front`
            : 'pressing either brings it to the front';
      notes.push(`${first} and ${second} are ${Math.round(both)} px wide together and this window has ${Math.round(width - 2 * ARRANGE_MARGIN)}. They keep their sizes and overlap by ${over} px; ${reach}.`);
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
 * What Show related says about the notes its document is joined to.
 *
 * Two numbers when they differ. A neighbour that is itself open as a document
 * has a row in the list and does not gather: counted from the gathered ones
 * alone, "its list of all N" said fewer than the list then held. And a note
 * whose links have not been read yet is not said to have none.
 */
function relatedNote(subject: string, gathers: number | null, listed: number): string {
  if (gathers === null) return `The notes joined to ${subject} are still being read. How many gather round it is said here when they have been.`;
  if (listed === 0) return `${subject} is joined to no other note, so nothing gathers round it; its list says so.`;
  const beyond = 'A card that does not fit in the window stands beyond its edge and is in the list.';
  const gather = `${gathers} ${gathers === 1 ? 'note gathers' : 'notes gather'} round ${subject}`;
  if (gathers === listed) return `${gather}, and its list of all ${listed} opens. ${beyond}`;
  const open = listed - gathers;
  if (gathers === 0) {
    return `Nothing gathers round ${subject}: ${listed === 1 ? 'the one note it is joined to is open as a document and stays' : `the ${listed} notes it is joined to are open as documents and stay`} where ${listed === 1 ? 'it is' : 'they are'}. Its list of ${listed === 1 ? 'that one' : `all ${listed}`} opens.`;
  }
  return `${gather}, and its list holds ${listed}: the other ${open === 1 ? 'one is open as a document and stays where it is' : `${open} are open as documents and stay where they are`}. ${beyond}`;
}

/**
 * Show related: the document with what it is joined to gathered round it and
 * its complete list open.
 *
 * The document stands in the middle of the space to the right of the list,
 * one row of cards down from the top, so cards have room on every side. How
 * many gather and how many the list holds are the caller's to say: this
 * module does not know the neighbourhood, only where the document goes.
 * `gathers` is null while the note's links have not been read.
 */
export function planRelated(input: ArrangeInput, subject: string, gathers: number | null, listed: number = gathers ?? 0): ArrangePlan | ArrangeRefusal {
  const doc = input.docs.find((d) => d.noteId === subject);
  if (doc === undefined) return { refused: 'Show related needs an open note: open one from the list or the field first' };
  const notes: string[] = [];
  const beside = collectionBeside(input);
  const list = drawn(beside, input);
  const { width } = input.field;
  const left = list === null ? ARRANGE_MARGIN : list.x + list.w + ARRANGE_GAP;
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
  notes.push(relatedNote(subject, gathers, Math.max(listed, gathers ?? 0)));
  return finish('related', `Show what ${subject} is joined to`, input, [{ doc, x, y }], collection, subject, subject, notes);
}

/** Everything a plan was worked out from, as one string: when it changes, the preview is stale. */
export function planBasis(input: ArrangeInput, extra = ''): string {
  const c = input.collection;
  return [
    `${Math.round(input.field.width)}x${Math.round(input.field.height)}${input.oneAtATime === true ? ' one at a time' : ''}`,
    c === null ? '-' : `${c.x},${c.y},${c.w},${c.h},${c.collapsed},${c.presentation}`,
    input.docs.map((d) => `${d.noteId}@${Math.round(d.x)},${Math.round(d.y)},${Math.round(d.w)}x${Math.round(d.h)}`).join(';'),
    extra,
  ].join('|');
}

/** What a preview is also worked out from and the desk does not show. Part of its basis, as `extra`. */
export interface ArrangeUnseen {
  /** How many notes have changed on disk and are waiting to be shown. */
  pending: number;
  /** Show related only: the note, and what is known of its links, as `planRelated` was given them. */
  related: { noteId: string; gathers: number | null; listed: number } | null;
}

/** "A", "A and B", "A, B and C". */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Why a preview was worked out again, in one sentence: what is different now
 * from when it was first shown.
 *
 * It names what it can know: which documents were opened, closed, moved,
 * resized or brought to the front, what was done to the collection, that the
 * window changed size, that notes changed on disk, that a note's links were
 * read. Which note changed on disk it cannot know, so it does not say. Until
 * this the preview said "the desk changed" whatever had, also when the desk
 * had not and a note on disk had.
 *
 * '' when nothing differs: the preview is the one that was first shown.
 */
export function reworkedBecause(was: ArrangeInput, now: ArrangeInput, wasUnseen: ArrangeUnseen, nowUnseen: ArrangeUnseen): string {
  const causes: string[] = [];
  const were = (ids: readonly string[], what: string): void => {
    if (ids.length > 0) causes.push(`${listOf(ids)} ${ids.length === 1 ? 'was' : 'were'} ${what}`);
  };
  const before = new Map(was.docs.map((d) => [d.noteId, d]));
  const after = new Set(now.docs.map((d) => d.noteId));
  const stayed = now.docs.filter((d) => before.has(d.noteId));
  were(now.docs.filter((d) => !before.has(d.noteId)).map((d) => d.noteId), 'opened');
  were(was.docs.filter((d) => !after.has(d.noteId)).map((d) => d.noteId), 'closed');
  were(stayed.filter((d) => moved(before.get(d.noteId) as ArrangeDoc, d.x, d.y)).map((d) => d.noteId), 'moved');
  were(
    stayed
      .filter((d) => {
        const then = before.get(d.noteId) as ArrangeDoc;
        return Math.round(then.w) !== Math.round(d.w) || Math.round(then.h) !== Math.round(d.h);
      })
      .map((d) => d.noteId),
    'resized',
  );
  // The stacking, among the documents open then and now: the one on top is the one a person pressed.
  const then = was.docs.filter((d) => after.has(d.noteId)).map((d) => d.noteId);
  const here = stayed.map((d) => d.noteId);
  if (then.some((id, i) => id !== here[i])) {
    const top = here[here.length - 1] as string;
    causes.push(top !== then[then.length - 1] ? `${top} was brought to the front` : 'the open notes were stacked in another order');
  }
  const a = was.collection;
  const b = now.collection;
  if (a === null || b === null) {
    if (a !== b) causes.push(b === null ? 'the collection left the field' : 'the collection came on to the field');
  } else {
    if (a.collapsed !== b.collapsed) causes.push(b.collapsed ? 'the collection was folded to its header' : 'the collection was opened from its header');
    if (a.presentation !== b.presentation) causes.push(`the collection was changed to ${b.presentation === 'cards' ? 'cards' : 'a table'}`);
    if (Math.round(a.x) !== Math.round(b.x) || Math.round(a.y) !== Math.round(b.y)) causes.push('the collection was moved');
    if (Math.round(a.w) !== Math.round(b.w) || Math.round(a.h) !== Math.round(b.h)) causes.push('the collection was resized');
  }
  if (Math.round(was.field.width) !== Math.round(now.field.width) || Math.round(was.field.height) !== Math.round(now.field.height)) causes.push('the window changed size');
  if (nowUnseen.pending > wasUnseen.pending) causes.push('notes changed on disk');
  else if (nowUnseen.pending < wasUnseen.pending) causes.push('the notes that had changed on disk were shown');
  const links = nowUnseen.related;
  const linksThen = wasUnseen.related;
  if (links !== null && linksThen !== null) {
    // Fewer gathering with as many listed is a neighbour opened as a document, which is named above.
    if (linksThen.gathers === null && links.gathers !== null) causes.push(`the notes joined to ${links.noteId} were read`);
    else if (linksThen.gathers !== null && links.gathers === null) causes.push(`the notes joined to ${links.noteId} are being read again`);
    else if (links.listed !== linksThen.listed) causes.push(`the notes joined to ${links.noteId} changed`);
  }
  return causes.length === 0 ? '' : `While this was shown, ${listOf(causes)}, so it was worked out again from what is there now.`;
}

/** What an applied arrangement changed, kept for the window so it can be put back. */
export interface ArrangeUndo {
  /** The desk it was applied on: a record belongs to one workspace and one view of it. */
  workspaceId: string | null;
  viewId: string | null;
  label: string;
  /** Each document the arrangement moved: where it was, and where it was put. */
  cards: Array<{ noteId: string; before: { x: number; y: number }; after: { x: number; y: number }; size: { w: number; h: number } }>;
  /** The stacking before, lowest first, for the documents on the desk then. */
  orderBefore: string[];
  /** The collection before and after, as the store held it, when the arrangement changed it. */
  collection: { before: CollectionLayout; after: CollectionLayout } | null;
  focusBefore: string | null;
  listBefore: string | null;
  emphasisBefore: { noteId: string; kind: string } | null;
}

/**
 * The record an applied plan leaves behind, taken from the desk the plan was
 * made from: where each document it moves stands now, the stacking, and the
 * collection as the store holds it. `was` is what the window alone knows.
 */
export function undoFor(plan: ArrangePlan, input: ArrangeInput, was: Pick<ArrangeUndo, 'workspaceId' | 'viewId' | 'focusBefore' | 'listBefore' | 'emphasisBefore'>): ArrangeUndo {
  const cards: ArrangeUndo['cards'] = [];
  for (const to of plan.cards) {
    const doc = input.docs.find((d) => d.noteId === to.noteId);
    if (doc === undefined) continue;
    cards.push({ noteId: to.noteId, before: { x: doc.x, y: doc.y }, after: { x: to.x, y: to.y }, size: { w: doc.w, h: doc.h } });
  }
  return {
    label: plan.label,
    cards,
    orderBefore: input.docs.map((d) => d.noteId),
    collection: plan.collection !== null && input.collection !== null ? { before: input.collection, after: plan.collection } : null,
    ...was,
  };
}

/**
 * Where an undo record stands for the desk on screen.
 *
 * `here`: it was applied on this view of this workspace, and is offered.
 * `another-view`: the same workspace shows another view. It is kept and not
 * offered, and is offered again when its view is back. `gone`: another
 * workspace is open. Two workspaces have views of the same id, so a record
 * kept by view id alone was offered on a desk it had never arranged; it is
 * forgotten instead, and is not there when its workspace is opened again.
 */
export function undoStanding(undo: Pick<ArrangeUndo, 'workspaceId' | 'viewId'>, workspaceId: string | null, viewId: string | null): 'here' | 'another-view' | 'gone' {
  if (undo.workspaceId !== workspaceId) return 'gone';
  return undo.viewId === viewId ? 'here' : 'another-view';
}

/** What the undo will and will not put back, given the desk as it is now. */
export interface UndoCheck {
  /** The documents still where the arrangement put them: these go back. */
  cards: Array<{ noteId: string; x: number; y: number }>;
  /** The collection goes back, or null when it was not changed or has been changed since. */
  collection: CollectionLayout | null;
  /**
   * The whole stacking after the undo, lowest first, or [] when it is that
   * already. A document opened since the arrangement is in it where it is now.
   */
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
  // The stacking: the documents that were on the desk then go back into the
  // order they were in, in the places in the stack they hold between them
  // now. A note opened since is not one of them and keeps its place: opened
  // on top, it stays on top. Until this it ended at the bottom, under every
  // document the undo raised, and nothing said so.
  const current = input.docs.map((d) => d.noteId);
  const open = new Set(current);
  const then = undo.orderBefore.filter((id) => open.has(id));
  const known = new Set(then);
  let next = 0;
  const order = current.map((id) => (known.has(id) ? (then[next++] as string) : id));
  return { cards, collection, order: order.every((id, i) => id === current[i]) ? [] : order, changed };
}

/**
 * Whether the undo's question, asked a moment ago, is still the one being
 * answered: the same things have changed since the arrangement, and the same
 * objects would go back. "Undo the rest" works the desk out again when it is
 * pressed. When that differs from what the question listed, pressing it would
 * put back, or leave, something the person was never told about, so the
 * question is shown again and that press puts nothing back.
 */
export function sameUndoQuestion(asked: UndoCheck, now: UndoCheck): boolean {
  const back = (check: UndoCheck): string => JSON.stringify([check.cards, check.collection]);
  return asked.changed.join('\n') === now.changed.join('\n') && back(asked) === back(now);
}
