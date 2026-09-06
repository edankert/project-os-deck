/** Desks: an arrangement of cards with a name, and what happens when a note it names is gone. */
import type { CardModel, Desk, DeskCard } from './types.js';

export interface ReconciledDesk {
  cards: Array<DeskCard & { card: CardModel }>;
  /** How many of the desk's cards named a note the workspace no longer has. */
  dropped: number;
}

/**
 * Join a saved desk to the notes the workspace has now.
 *
 * A desk that refuses to open because one note was renamed is worse than a
 * desk that opens with one card missing and says so. The card's status comes
 * from the CURRENT list, never from what the desk saved, so a desk cannot
 * show a status that is no longer true.
 */
export function reconcileDesk(desk: Desk, available: CardModel[]): ReconciledDesk {
  const byId = new Map(available.map((c) => [c.noteId, c]));
  const cards: Array<DeskCard & { card: CardModel }> = [];
  let dropped = 0;
  for (const saved of desk.cards) {
    const card = byId.get(saved.noteId);
    if (card === undefined) {
      dropped += 1;
      continue;
    }
    cards.push({ noteId: saved.noteId, x: saved.x, y: saved.y, card });
  }
  return { cards, dropped };
}

/** A desk built from what is currently on screen. */
export function deskFrom(name: string, workspaceId: string, cards: DeskCard[]): Desk {
  return { name, workspaceId, cards: cards.map((c) => ({ noteId: c.noteId, x: c.x, y: c.y })) };
}
