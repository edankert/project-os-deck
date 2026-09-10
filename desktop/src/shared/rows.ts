/**
 * The rows a navigator draws: the headings, the notes under them, and what a
 * fold does to both.
 *
 * Pure, and here rather than in the renderer, because what the list SHOWS is
 * the decision worth checking: a group of finished work arrives folded, a note
 * that holds a hundred tasks arrives closed, and a note a person opened stays
 * open. The renderer paints what this returns.
 */
import type { FaceSection } from './description.js';
import type { CardGroup, CardModel } from './types.js';

export interface NavigatorPaint {
  groups: CardGroup[];
  /** The face section of the view being drawn, which decides each row's mark. */
  faces: FaceSection;
  folds: Record<string, boolean>;
  onDesk: Set<string>;
  currentNoteId: string | null;
}

export type Row =
  | { kind: 'group'; key: string; label: string; count: number; folded: boolean; needsHuman: boolean }
  | {
      kind: 'card';
      key: string;
      card: CardModel;
      depth: number;
      expandable: boolean;
      expanded: boolean;
      /**
       * The row's place among every note the view holds, folded or not, from 1
       * (TASK-0033). A screen reader says "item 5 of 409" rather than "item 5
       * of the 30 drawn", because the list draws only what is unfolded.
       */
      position: number;
    };

/** How many notes the view holds, children included: the set a row's position counts in. */
export function totalRows(groups: CardGroup[]): number {
  let n = 0;
  const walk = (cards: CardModel[]): void => {
    for (const card of cards) {
      n += 1;
      walk(card.children);
    }
  };
  for (const group of groups) walk(group.cards);
  return n;
}

/** A group of finished work arrives folded; anything else arrives open. */
export function groupFoldKey(groupKey: string): string {
  return `g:${groupKey}`;
}

export function cardFoldKey(groupKey: string, noteId: string): string {
  return `i:${groupKey}:${noteId}`;
}

export function rowsFor(paint: NavigatorPaint): Row[] {
  const rows: Row[] = [];
  const counter = { at: 0 };
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
    if (folded) {
      counter.at += totalRows([group]);
      continue;
    }
    pushCards(rows, group.cards, group.key, 0, paint, counter);
  }
  return rows;
}

function pushCards(
  rows: Row[],
  cards: CardModel[],
  groupKey: string,
  depth: number,
  paint: NavigatorPaint,
  counter: { at: number },
): void {
  for (const card of cards) {
    const key = cardFoldKey(groupKey, card.noteId);
    const expandable = card.children.length > 0;
    // A note that holds other notes arrives closed. Your Trainer has a feature
    // with 136 tasks under it, and opening the view is not asking for them.
    const expanded = expandable && paint.folds[key] === false;
    counter.at += 1;
    rows.push({ kind: 'card', key, card, depth, expandable, expanded, position: counter.at });
    if (expanded) pushCards(rows, card.children, groupKey, depth + 1, paint, counter);
    // The children of a closed note still count in the view.
    else counter.at += totalRows([{ key: '', label: '', needsHuman: false, suppressed: false, cards: card.children }]);
  }
}

