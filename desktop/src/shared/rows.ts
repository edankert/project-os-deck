/**
 * The rows a navigator draws: the headings, the notes under them, and what a
 * fold does to both.
 *
 * Pure, and here rather than in the renderer, because what the list SHOWS is
 * the decision worth checking: a group of finished work arrives folded, a note
 * that holds a hundred tasks arrives closed, and a note a person opened stays
 * open. The renderer paints what this returns.
 */
import type { CardGroup, CardModel } from './types.js';

export interface NavigatorPaint {
  groups: CardGroup[];
  folds: Record<string, boolean>;
  onDesk: Set<string>;
  currentNoteId: string | null;
}

export type Row =
  | { kind: 'group'; key: string; label: string; count: number; folded: boolean; needsHuman: boolean }
  | { kind: 'card'; key: string; card: CardModel; depth: number; expandable: boolean; expanded: boolean };

/** A group of finished work arrives folded; anything else arrives open. */
export function groupFoldKey(groupKey: string): string {
  return `g:${groupKey}`;
}

export function cardFoldKey(groupKey: string, noteId: string): string {
  return `i:${groupKey}:${noteId}`;
}

export function rowsFor(paint: NavigatorPaint): Row[] {
  const rows: Row[] = [];
  for (const group of paint.groups) {
    const key = groupFoldKey(group.key);
    const folded = paint.folds[key] ?? group.suppressed;
    rows.push({
      kind: 'group',
      key,
      label: group.label,
      count: group.cards.length,
      folded,
      needsHuman: group.needsHuman,
    });
    if (folded) continue;
    pushCards(rows, group.cards, group.key, 0, paint);
  }
  return rows;
}

function pushCards(rows: Row[], cards: CardModel[], groupKey: string, depth: number, paint: NavigatorPaint): void {
  for (const card of cards) {
    const key = cardFoldKey(groupKey, card.noteId);
    const expandable = card.children.length > 0;
    // A note that holds other notes arrives closed. Your Trainer has a feature
    // with 136 tasks under it, and opening the view is not asking for them.
    const expanded = expandable && paint.folds[key] === false;
    rows.push({ kind: 'card', key, card, depth, expandable, expanded });
    if (expanded) pushCards(rows, card.children, groupKey, depth + 1, paint);
  }
}

