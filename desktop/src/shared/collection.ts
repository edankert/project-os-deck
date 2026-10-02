/**
 * The collection: a view's derived list as an object on the Glass desk
 * (FEAT-0020, TASK-0095; ADR-0006).
 *
 * A collection owns a QUERY and a PRESENTATION. It never owns the notes: what
 * it lists is derived, every time, from the groups the view's source returns
 * now. So what is kept for a collection is where it stands on the desk and
 * how it is presented, keyed by workspace and view, and nothing about its
 * rows. A desk reopened next week resolves next week's rows (REQ-0001).
 *
 * Everything here is pure: which notes a collection holds, how a refreshed
 * result differs from the one on screen, what the header says, and where the
 * list should scroll to so the row a person was on is still where it was.
 */
import type { CardGroup, CardModel, Filters } from './types.js';

/**
 * How a collection draws its members. `table` is the complete list. `cards`
 * arranges the same members as cards on the desk (FEAT-0022). A collapsed
 * collection, in either, is the "stack": its header alone.
 */
export type Presentation = 'table' | 'cards';
export const PRESENTATIONS: readonly Presentation[] = Object.freeze(['table', 'cards']);

export interface CollectionLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Header only: the query's name, its exact count and whether it is narrowed. */
  collapsed: boolean;
  presentation: Presentation;
}

/** Below this the list's rows cannot be read, so a resize stops here. */
export const COLLECTION_MIN_WIDTH = 260;
export const COLLECTION_MIN_HEIGHT = 200;
/** Nothing larger than this is kept, so a desk saved on a wall screen still opens. */
export const COLLECTION_MAX_SIDE = 4000;
/** The header: the collection's name, count and controls. A collapsed collection is this tall. */
export const COLLECTION_HEAD_HEIGHT = 34;
/** How wide a collection nobody has resized is: a little wider than the column it replaces. */
export const COLLECTION_DEFAULT_WIDTH = 340;
const MARGIN = 12;

/**
 * Where a collection stands when nothing is stored for its view: down the
 * left of the field, as tall as the field allows. An old desk, saved before
 * collections existed, opens with this (REQ-0001's "safe defaults").
 */
export function defaultCollectionLayout(field: { width: number; height: number }): CollectionLayout {
  return {
    x: MARGIN,
    y: MARGIN,
    w: Math.max(COLLECTION_MIN_WIDTH, Math.min(COLLECTION_DEFAULT_WIDTH, field.width - 2 * MARGIN)),
    h: Math.max(COLLECTION_MIN_HEIGHT, field.height - 2 * MARGIN),
    collapsed: false,
    presentation: 'table',
  };
}

function side(value: unknown, least: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(COLLECTION_MAX_SIDE, Math.max(least, Math.round(value)));
}

/** No place further out than this is kept: no desk is this large, and a state file cannot then hold 1e300. */
export const COLLECTION_MAX_PLACE = 100000;

function place(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  // Infinity is a number here, and is held to the bound like any other that
  // is too large: it is what `1e999` in a state file reads as.
  return Math.max(0, Math.min(COLLECTION_MAX_PLACE, Math.round(value)));
}

/**
 * A layout read from the store or from a state file: whole and in range, or
 * null. A layout missing a number is no layout, and the caller falls back to
 * the default rather than guessing half of one. A place too far out is not
 * missing: it is held to `COLLECTION_MAX_PLACE`, and drawn inside the field
 * like any other (`fitCollection`).
 */
export function normaliseCollection(value: unknown): CollectionLayout | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const x = place(raw['x']);
  const y = place(raw['y']);
  const w = side(raw['w'], COLLECTION_MIN_WIDTH);
  const h = side(raw['h'], COLLECTION_MIN_HEIGHT);
  if (x === null || y === null || w === null || h === null) return null;
  const presentation = PRESENTATIONS.includes(raw['presentation'] as Presentation) ? (raw['presentation'] as Presentation) : 'table';
  return { x, y, w, h, collapsed: raw['collapsed'] === true, presentation };
}

/**
 * A collection as it is DRAWN in a field that may be smaller than the one it
 * was arranged in: never taller or wider than the field, and wholly inside
 * it. Wholly, and not only its header: the corner it is resized by is at its
 * bottom, and a list pushed half below the field could be neither read to its
 * end nor made shorter. For painting only; nothing stores it.
 */
export function fitCollection(layout: CollectionLayout, field: { width: number; height: number }): CollectionLayout {
  const w = Math.max(COLLECTION_MIN_WIDTH, Math.min(layout.w, field.width));
  const h = Math.max(COLLECTION_HEAD_HEIGHT, Math.min(layout.h, field.height));
  const drawn = layout.collapsed ? COLLECTION_HEAD_HEIGHT : h;
  return {
    ...layout,
    w,
    h,
    x: Math.max(0, Math.min(layout.x, field.width - w)),
    y: Math.max(0, Math.min(layout.y, field.height - drawn)),
  };
}

/** What a collection's Cards presentation needs to know to lay its members out. */
export interface CardGridInput {
  /** The space the cards have: the collection's body, under its header and its controls. */
  area: { left: number; top: number; width: number; height: number };
  /** One card's size as it is drawn, and the gap between two. */
  card: { width: number; height: number };
  gap: number;
  /** How many members there are to lay out. */
  count: number;
  /** The row of cards at the top of what is in view: 0 is the first. */
  firstRow: number;
}

export interface CardGrid {
  columns: number;
  /** Rows that fit in the area, whole. */
  rows: number;
  /** Rows the whole membership takes. */
  totalRows: number;
  /** The row at the top, after it is kept in range. */
  firstRow: number;
  /** The index of the first member drawn, and how many are. */
  first: number;
  drawn: number;
  /** The middle of each drawn card, in the same coordinates as `area`, by its place among the drawn. */
  centres: Array<{ x: number; y: number }>;
}

/**
 * The Cards presentation's layout (FEAT-0022, TASK-0101): the members in
 * rows, as many as the area holds whole, starting at a row.
 *
 * Only the cards in view are placed, which is what bounds the drawing; every
 * member has an index, so all of them are reached by moving the first row.
 * Nothing here decides WHICH notes are members: the caller hands the count of
 * the same ids the table lists.
 */
export function cardGrid(input: CardGridInput): CardGrid {
  const { area, card, gap, count } = input;
  const columns = Math.max(1, Math.floor((area.width + gap) / (card.width + gap)));
  const rows = Math.max(1, Math.floor((area.height + gap) / (card.height + gap)));
  const totalRows = Math.ceil(count / columns);
  const firstRow = Math.max(0, Math.min(Math.max(0, totalRows - rows), Math.round(input.firstRow)));
  const first = firstRow * columns;
  const drawn = Math.max(0, Math.min(count - first, rows * columns));
  // The cards are centred in the width they do not fill, so a resize does not leave a ragged right edge.
  const used = columns * card.width + (columns - 1) * gap;
  const inset = Math.max(0, (area.width - used) / 2);
  const centres: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < drawn; i += 1) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    centres.push({
      x: area.left + inset + column * (card.width + gap) + card.width / 2,
      y: area.top + row * (card.height + gap) + card.height / 2,
    });
  }
  return { columns, rows, totalRows, firstRow, first, drawn, centres };
}

/** The row a member is on, so the grid can be opened at the note a person was on. */
export function rowOfMember(index: number, columns: number): number {
  return index < 0 ? 0 : Math.floor(index / Math.max(1, columns));
}

/** What the Cards presentation says under its cards: which are drawn, of how many, and where the rest are. */
export function gridText(grid: CardGrid, count: number, elsewhere: number): string {
  if (count === 0) return 'no notes to draw';
  const parts = [grid.drawn === count ? `all ${count} drawn as cards` : `cards ${grid.first + 1} to ${grid.first + grid.drawn} of ${count}`];
  if (grid.drawn < count) parts.push('the wheel or Page Down shows more; the table lists all');
  if (elsewhere > 0) parts.push(`${elsewhere} of these ${elsewhere === 1 ? 'is' : 'are'} open or gathered elsewhere on the desk and ${elsewhere === 1 ? 'is' : 'are'} not drawn twice`);
  return parts.join(' · ');
}

/**
 * Every note a set of groups holds, each once, in the order the list shows
 * them: a group's cards and what each card holds under it. This IS the
 * collection's membership, and a count is its length.
 */
export function memberIds(groups: readonly CardGroup[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const walk = (cards: readonly CardModel[]): void => {
    for (const card of cards) {
      if (!seen.has(card.noteId)) {
        seen.add(card.noteId);
        out.push(card.noteId);
      }
      if (card.children.length > 0) walk(card.children);
    }
  };
  for (const group of groups) walk(group.cards);
  return out;
}

export interface CollectionSummary {
  /** Every note the view's source returns now. */
  total: number;
  /** The notes the list shows: the same, or fewer when it is narrowed. */
  shown: number;
  narrowed: boolean;
  /** Of the notes shown, how many have a place in the field: a card or a tile. */
  inField: number;
  /**
   * Of the notes shown, how many have no place in the field and are reachable
   * only through this list: a note held under another, or one a full band
   * counted and did not place. The list is their recovery route (DES-0003).
   */
  listOnly: number;
}

export function summarise(all: readonly CardGroup[], shown: readonly CardGroup[], narrowed: boolean, placed: ReadonlySet<string>): CollectionSummary {
  const shownIds = memberIds(shown);
  const inField = shownIds.filter((id) => placed.has(id)).length;
  return { total: memberIds(all).length, shown: shownIds.length, narrowed, inField, listOnly: shownIds.length - inField };
}

/** The count a collection's header carries: exact, and saying so when it is a part of the whole. */
export function countText(summary: CollectionSummary): string {
  const notes = (n: number): string => `${n} ${n === 1 ? 'note' : 'notes'}`;
  return summary.narrowed ? `${summary.shown} of ${notes(summary.total)}` : notes(summary.total);
}

/** What is narrowing the list, in words, or '' when nothing is. */
export function filterText(query: string, filters: Filters): string {
  const parts: string[] = [];
  const text = query.trim();
  if (text !== '') parts.push(`“${text}”`);
  if (filters.statuses.length > 0) parts.push(`status ${filters.statuses.join(', ')}`);
  if (filters.types.length > 0) parts.push(`type ${filters.types.join(', ')}`);
  return parts.join(' · ');
}

/** What differs in a list with every single note left out of it. */
export type ListChange = 'headings-reordered' | 'rows-reordered' | 'heading-changed';

export interface MembershipChange {
  /** In the new result and not in the one on screen. */
  added: string[];
  /** On screen and not in the new result. */
  removed: string[];
  /** In both, standing somewhere else: under another heading, or held under another note. */
  moved: string[];
  /** In both and where it was, showing something else: a status, a title, an owed mark, progress, a severity. */
  changed: string[];
  /**
   * What differs beyond the notes counted above: the headings are in another
   * order, the notes that stayed under a heading are in another order there,
   * or a heading itself differs (it reads differently, or one with no rows
   * arrived or left).
   */
  list: ListChange[];
}

/**
 * Each note of a result by where it stands and by what it shows. A note
 * listed more than once (needing a person, and under its own heading) is
 * described by all its rows, in an order that does not depend on the list's.
 */
function describe(groups: readonly CardGroup[]): Map<string, { place: string; shows: string }> {
  const rows = new Map<string, { places: string[]; shows: string[] }>();
  const walk = (group: CardGroup, cards: readonly CardModel[], under: string): void => {
    for (const card of cards) {
      const row = rows.get(card.noteId) ?? { places: [], shows: [] };
      row.places.push(`${group.key}\n${under}`);
      // Everything the card carries, which is what a row, a card and a face
      // draw from, but not the notes it holds: each of those is described itself.
      row.shows.push(JSON.stringify({ ...card, children: [] }));
      rows.set(card.noteId, row);
      if (card.children.length > 0) walk(group, card.children, card.noteId);
    }
  };
  for (const group of groups) walk(group, group.cards, '');
  return new Map([...rows].map(([id, row]) => [id, { place: row.places.sort().join('\n\n'), shows: row.shows.sort().join('\n') }]));
}

/** What a heading's own row says: its name and its marks. */
function heading(group: CardGroup): string {
  return `${group.label}\n${group.needsHuman}\n${group.suppressed}`;
}

/** The notes under a heading in the list's order, top to bottom, keeping only those asked for. */
function orderUnder(group: CardGroup, keep: ReadonlySet<string>): string {
  const out: string[] = [];
  const walk = (cards: readonly CardModel[]): void => {
    for (const card of cards) {
      if (keep.has(card.noteId)) out.push(card.noteId);
      if (card.children.length > 0) walk(card.children);
    }
  };
  walk(group.cards);
  return out.join('\n');
}

/**
 * How a refreshed result differs from the one on screen. The list is not
 * re-ordered under a pointer: the difference is announced, and applied when
 * the person asks (REQ-0001).
 *
 * Anything a row shows counts, and so does the order of the rows and of the
 * headings. A difference that is not counted here is never announced, and the
 * list then keeps the old rows with nothing to press: a result that changed
 * only its order, a note's progress or the note another is held under was
 * left that way.
 */
export function membershipChange(before: readonly CardGroup[], after: readonly CardGroup[]): MembershipChange {
  const a = describe(before);
  const b = describe(after);
  const added: string[] = [];
  const removed: string[] = [];
  const moved: string[] = [];
  const changed: string[] = [];
  const stayed = new Set<string>();
  for (const [id, now] of b) {
    const was = a.get(id);
    if (was === undefined) added.push(id);
    else if (was.place !== now.place) moved.push(id);
    else {
      stayed.add(id);
      if (was.shows !== now.shows) changed.push(id);
    }
  }
  for (const id of a.keys()) if (!b.has(id)) removed.push(id);
  // The headings and the order, compared over what is in both results: a
  // heading that arrived with a note under it is already said by that note.
  const list: ListChange[] = [];
  const was = new Map(before.map((g) => [g.key, g]));
  const now = new Map(after.map((g) => [g.key, g]));
  const inBoth = (groups: readonly CardGroup[], other: ReadonlyMap<string, CardGroup>): CardGroup[] => groups.filter((g) => other.has(g.key));
  if (inBoth(before, now).map((g) => g.key).join('\n') !== inBoth(after, was).map((g) => g.key).join('\n')) list.push('headings-reordered');
  if (inBoth(after, was).some((g) => orderUnder(was.get(g.key) as CardGroup, stayed) !== orderUnder(g, stayed))) list.push('rows-reordered');
  const empty = (groups: readonly CardGroup[], other: ReadonlyMap<string, CardGroup>): boolean => groups.some((g) => !other.has(g.key) && g.cards.length === 0);
  if (inBoth(after, was).some((g) => heading(was.get(g.key) as CardGroup) !== heading(g)) || empty(before, now) || empty(after, was)) list.push('heading-changed');
  return { added, removed, moved, changed, list };
}

/** How many notes a change counts: the number the announcement gives, and the one the field's chip gives. */
export function changeCount(change: MembershipChange): number {
  return change.added.length + change.removed.length + change.moved.length + change.changed.length;
}

/** Whether applying the refreshed result would show anything else: a note counted, or the list's order or headings. */
export function anyChange(change: MembershipChange): boolean {
  return changeCount(change) > 0 || change.list.length > 0;
}

const LIST_CHANGE_TEXT: Record<ListChange, string> = {
  'headings-reordered': 'the order of the headings changed',
  'rows-reordered': 'the order of the rows changed',
  'heading-changed': 'a heading changed',
};

/**
 * The announcement: what will change when the person applies it, in words
 * that say what to look for. '' when nothing will.
 */
export function changeText(change: MembershipChange): string {
  const said: string[] = [];
  const n = changeCount(change);
  if (n > 0) {
    const parts: string[] = [];
    if (change.added.length > 0) parts.push(`${change.added.length} added`);
    if (change.removed.length > 0) parts.push(`${change.removed.length} removed`);
    if (change.moved.length > 0) parts.push(`${change.moved.length} moved in the list`);
    if (change.changed.length > 0) parts.push(`${change.changed.length} changed what ${change.changed.length === 1 ? 'it shows' : 'they show'}`);
    said.push(`${n} ${n === 1 ? 'note' : 'notes'} changed: ${parts.join(', ')}`);
  }
  for (const what of change.list) said.push(LIST_CHANGE_TEXT[what]);
  return said.join('; ');
}

/**
 * What to say when the note a person had selected is not in the result any
 * more: it is named, and its document, if one is open, stays open. Null when
 * the selection is still a member or there was none.
 */
export function removedSelectionText(selected: string | null, after: readonly CardGroup[], documentOpen: boolean): string | null {
  if (selected === null || memberIds(after).includes(selected)) return null;
  return documentOpen
    ? `${selected} is no longer in this list; its document stays open`
    : `${selected} is no longer in this list`;
}

/** One drawn row, as the scroll anchor sees it: the note it is for, or null for a heading. */
export interface AnchorRow {
  id: string | null;
  /** The row's top edge, in the list's own scroll coordinates. */
  top: number;
  /**
   * The heading the row is under. A list shows one note in more than one
   * place (on the desk, joined to a held note, needing a person, and under
   * its own heading), so the note alone does not say which row was meant.
   */
  group?: string | null;
}

export interface ScrollAnchor {
  id: string;
  /** How far the list was scrolled past that row's top edge. */
  offset: number;
  /** The heading that row was under, when the list said. */
  group?: string | null;
}

/**
 * The row a list is scrolled to, by the note it is for: the first note's row
 * at or below the top of what is in view. Kept by identity, so the list can
 * be collapsed, re-presented or refreshed and come back to the same note
 * rather than to the same number of pixels.
 */
export function anchorAt(rows: readonly AnchorRow[], scrollTop: number): ScrollAnchor | null {
  let best: AnchorRow | null = null;
  for (const row of rows) {
    if (row.id === null) continue;
    if (row.top >= scrollTop) {
      best = row;
      break;
    }
    // Nothing starts in view: the last note's row above the top is the one being read.
    best = row;
  }
  if (best === null || best.id === null) return null;
  return best.group === undefined ? { id: best.id, offset: scrollTop - best.top } : { id: best.id, offset: scrollTop - best.top, group: best.group };
}

/**
 * The row at a point of the list, as an anchor: the note's row that `y` (in
 * the list's scroll coordinates) falls in. This is the row a pointer rests on
 * or the keyboard is on, and it is the one that must not move when the list
 * is redrawn: a row that slid out from under a pointer between aiming and
 * pressing opened the wrong note. Null when the point is on a heading or
 * above the first row; the caller then keeps the top row instead.
 */
export function anchorUnder(rows: readonly AnchorRow[], scrollTop: number, y: number): ScrollAnchor | null {
  let under: AnchorRow | null = null;
  for (const row of rows) {
    if (row.top > y) break;
    under = row;
  }
  if (under === null || under.id === null) return null;
  return under.group === undefined ? { id: under.id, offset: scrollTop - under.top } : { id: under.id, offset: scrollTop - under.top, group: under.group };
}

/**
 * The row at a point and the rows after it, each as an anchor, nearest
 * first. The row a person pressed may be the one that leaves: a note opened
 * from "Joined to what you are holding" is on the desk a moment later and has
 * no row there. The row below it is then the one to hold still, and so on
 * down, so the next press lands on the row it was aimed at.
 */
export function anchorsFrom(rows: readonly AnchorRow[], scrollTop: number, y: number, most = 12): ScrollAnchor[] {
  let at = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if ((rows[i] as AnchorRow).top > y) break;
    at = i;
  }
  const out: ScrollAnchor[] = [];
  if (at === -1 || (rows[at] as AnchorRow).id === null) return out;
  for (let i = at; i < rows.length && out.length < most; i += 1) {
    const row = rows[i] as AnchorRow;
    if (row.id === null) continue;
    out.push(row.group === undefined ? { id: row.id, offset: scrollTop - row.top } : { id: row.id, offset: scrollTop - row.top, group: row.group });
  }
  return out;
}

/**
 * Where to scroll so the first of these anchors that still has its row, under
 * its heading, is where it was. When none has, the first anchor's note under
 * any heading; null when that has no row either.
 */
export function scrollTopForFirst(anchors: readonly ScrollAnchor[], rows: readonly AnchorRow[]): number | null {
  for (const anchor of anchors) {
    const row = rows.find((r) => r.id === anchor.id && r.group === anchor.group);
    if (row !== undefined) return Math.max(0, row.top + anchor.offset);
  }
  return scrollTopFor(anchors[0] ?? null, rows);
}

/**
 * How a list that is derived from the desk keeps its order while a person is
 * on it: the notes that were listed stay in the order they had, and notes
 * that arrive are added after them, in the order `fresh` gives. With
 * `hold` false the fresh order is used as it is.
 */
export function steadyOrder(previous: readonly string[], fresh: readonly string[], hold: boolean): string[] {
  if (!hold) return [...fresh];
  const now = new Set(fresh);
  const kept = previous.filter((id) => now.has(id));
  const had = new Set(kept);
  return [...kept, ...fresh.filter((id) => !had.has(id))];
}

/**
 * Where to scroll so the anchor's row is where it was. Null when that note
 * has no row now; the caller then leaves the list where it is and says so.
 */
export function scrollTopFor(anchor: ScrollAnchor | null, rows: readonly AnchorRow[]): number | null {
  if (anchor === null) return null;
  // The row under the same heading when there is one: the same note's row
  // under another heading is a different place in the list.
  const row = rows.find((r) => r.id === anchor.id && anchor.group !== undefined && r.group === anchor.group) ?? rows.find((r) => r.id === anchor.id);
  return row === undefined ? null : Math.max(0, row.top + anchor.offset);
}

/**
 * The nearest row that survives, when the anchor's own note is gone: the next
 * surviving note after where it stood in the old order, else the one before.
 */
export function nearestSurvivor(gone: string, before: readonly string[], after: ReadonlySet<string>): string | null {
  const at = before.indexOf(gone);
  if (at === -1) return null;
  for (let i = at + 1; i < before.length; i += 1) if (after.has(before[i] as string)) return before[i] as string;
  for (let i = at - 1; i >= 0; i -= 1) if (after.has(before[i] as string)) return before[i] as string;
  return null;
}
