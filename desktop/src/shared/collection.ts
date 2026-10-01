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

function place(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

/**
 * A layout read from the store or from a state file: whole and in range, or
 * null. A layout missing a number is no layout, and the caller falls back to
 * the default rather than guessing half of one.
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
 * was arranged in: its header is always inside the field, and it is never
 * taller or wider than the field. For painting only; nothing stores it.
 */
export function fitCollection(layout: CollectionLayout, field: { width: number; height: number }): CollectionLayout {
  const w = Math.max(COLLECTION_MIN_WIDTH, Math.min(layout.w, field.width));
  const h = Math.max(COLLECTION_HEAD_HEIGHT, Math.min(layout.h, field.height));
  return {
    ...layout,
    w,
    h,
    x: Math.max(0, Math.min(layout.x, field.width - w)),
    y: Math.max(0, Math.min(layout.y, field.height - COLLECTION_HEAD_HEIGHT)),
  };
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

export interface MembershipChange {
  /** In the new result and not in the one on screen. */
  added: string[];
  /** On screen and not in the new result. */
  removed: string[];
  /** In both, with a different status, owed mark or heading. */
  changed: string[];
}

function describe(groups: readonly CardGroup[]): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (group: CardGroup, cards: readonly CardModel[]): void => {
    for (const card of cards) {
      out.set(card.noteId, `${out.get(card.noteId) ?? ''}|${group.key}|${card.status}|${card.owed}|${card.title}`);
      if (card.children.length > 0) walk(group, card.children);
    }
  };
  for (const group of groups) walk(group, group.cards);
  return out;
}

/**
 * How a refreshed result differs from the one on screen. The list is not
 * re-ordered under a pointer: the difference is announced, and applied when
 * the person asks (REQ-0001).
 */
export function membershipChange(before: readonly CardGroup[], after: readonly CardGroup[]): MembershipChange {
  const a = describe(before);
  const b = describe(after);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const [id, signature] of b) {
    if (!a.has(id)) added.push(id);
    else if (a.get(id) !== signature) changed.push(id);
  }
  for (const id of a.keys()) if (!b.has(id)) removed.push(id);
  return { added, removed, changed };
}

export function changeCount(change: MembershipChange): number {
  return change.added.length + change.removed.length + change.changed.length;
}

/** The announcement: what will change when the person applies it. '' when nothing will. */
export function changeText(change: MembershipChange): string {
  const parts: string[] = [];
  if (change.added.length > 0) parts.push(`${change.added.length} added`);
  if (change.removed.length > 0) parts.push(`${change.removed.length} removed`);
  if (change.changed.length > 0) parts.push(`${change.changed.length} changed`);
  const n = changeCount(change);
  if (n === 0) return '';
  return `${n} ${n === 1 ? 'note' : 'notes'} changed: ${parts.join(', ')}`;
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
}

export interface ScrollAnchor {
  id: string;
  /** How far the list was scrolled past that row's top edge. */
  offset: number;
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
  return best === null || best.id === null ? null : { id: best.id, offset: scrollTop - best.top };
}

/**
 * Where to scroll so the anchor's row is where it was. Null when that note
 * has no row now; the caller then leaves the list where it is and says so.
 */
export function scrollTopFor(anchor: ScrollAnchor | null, rows: readonly AnchorRow[]): number | null {
  if (anchor === null) return null;
  const row = rows.find((r) => r.id === anchor.id);
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
