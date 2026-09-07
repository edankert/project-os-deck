/**
 * Narrowing the navigator: a query, and filters by status and by type.
 *
 * Deck owns search because Deck owns the DOM. The card pool draws only what is
 * on screen, so the browser's own find command cannot see a note that is not
 * currently drawn, and a person looking at four hundred issues with no search
 * box is scrolling (TASK-0027). Matching runs over the model rather than over
 * the drawn elements, which is what makes a note the pool never drew findable.
 */
import type { CardGroup, CardModel, Filters } from './types.js';

export interface Narrowing {
  query: string;
  filters: Filters;
}

export function isNarrowed(narrowing: Narrowing): boolean {
  return narrowing.query.trim() !== '' || narrowing.filters.statuses.length > 0 || narrowing.filters.types.length > 0;
}

/** Whether one card matches, ignoring what it holds. */
export function matchesCard(card: CardModel, narrowing: Narrowing): boolean {
  const query = narrowing.query.trim().toLowerCase();
  if (query !== '') {
    const haystack = `${card.noteId} ${card.title}`.toLowerCase();
    // Every word has to appear somewhere, so "iss ble" finds a BLE issue.
    for (const word of query.split(/\s+/)) {
      if (!haystack.includes(word)) return false;
    }
  }
  const { statuses, types } = narrowing.filters;
  if (statuses.length > 0 && !statuses.includes(card.status)) return false;
  if (types.length > 0 && !types.includes(card.noteType)) return false;
  return true;
}

/**
 * The groups that survive a narrowing.
 *
 * A card is kept when it matches, and also when something it holds matches: a
 * feature whose task was searched for still has to be drawn, or the task has
 * nowhere to appear. A card kept for its own sake keeps all of its children,
 * so opening it shows the same list it always did.
 */
export function narrowGroups(groups: CardGroup[], narrowing: Narrowing): CardGroup[] {
  if (!isNarrowed(narrowing)) return groups;
  const out: CardGroup[] = [];
  for (const group of groups) {
    const cards = narrowCards(group.cards, narrowing);
    if (cards.length > 0) out.push({ ...group, cards });
  }
  return out;
}

function narrowCards(cards: CardModel[], narrowing: Narrowing): CardModel[] {
  const out: CardModel[] = [];
  for (const card of cards) {
    if (matchesCard(card, narrowing)) {
      out.push(card);
      continue;
    }
    const children = narrowCards(card.children, narrowing);
    if (children.length > 0) out.push({ ...card, children });
  }
  return out;
}

/** Every status a set of groups holds, in the order they were met. */
export function statusesIn(groups: CardGroup[]): string[] {
  return valuesIn(groups, (card) => card.status);
}

/** Every note type a set of groups holds, in the order they were met. */
export function typesIn(groups: CardGroup[]): string[] {
  return valuesIn(groups, (card) => card.noteType);
}

function valuesIn(groups: CardGroup[], pick: (card: CardModel) => string): string[] {
  const seen = new Set<string>();
  const walk = (cards: CardModel[]): void => {
    for (const card of cards) {
      const value = pick(card);
      if (value !== '') seen.add(value);
      walk(card.children);
    }
  };
  for (const group of groups) walk(group.cards);
  return [...seen].sort();
}

/** How many cards a group draws, children included. */
export function countCards(cards: CardModel[]): number {
  let total = 0;
  for (const card of cards) total += 1 + countCards(card.children);
  return total;
}
