/** Desks: an arrangement of cards with a name, where a new card lands, and what happens when a note it names is gone. */
import type { CardModel, Desk, DeskCard } from './types.js';

export interface ReconciledDesk {
  cards: Array<DeskCard & { card: CardModel }>;
  /** How many of the desk's cards named a note the workspace no longer has. */
  dropped: number;
}

/**
 * Join what is on the desk to the notes the workspace has now.
 *
 * A desk that refuses to open because one note was renamed is worse than a
 * desk that opens with one card missing and says so. The card's status comes
 * from the CURRENT list, never from what the desk saved, so a desk cannot
 * show a status that is no longer true.
 */
export function reconcileDesk(cards: DeskCard[], available: CardModel[]): ReconciledDesk {
  const byId = new Map(available.map((c) => [c.noteId, c]));
  const out: Array<DeskCard & { card: CardModel }> = [];
  let dropped = 0;
  for (const saved of cards) {
    const card = byId.get(saved.noteId);
    if (card === undefined) {
      dropped += 1;
      continue;
    }
    out.push({ noteId: saved.noteId, x: saved.x, y: saved.y, card });
  }
  return { cards: out, dropped };
}

/** A desk built from what is on the desk now. */
export function deskFrom(name: string, workspaceId: string, cards: DeskCard[]): Desk {
  return { name, workspaceId, cards: cards.map((c) => ({ noteId: c.noteId, x: c.x, y: c.y })) };
}

export const CARD_WIDTH = 210;
export const CARD_HEIGHT = 104;
const GAP = 12;

/**
 * Where a card just added to the desk goes.
 *
 * Left to right, then down, in the first slot nothing already occupies. A
 * person who adds six notes gets six cards they can read, not a pile in one
 * corner, and the first thing they do with one is drag it anyway.
 */
export function nextSlot(taken: DeskCard[], surfaceWidth: number): { x: number; y: number } {
  const columns = Math.max(1, Math.floor((surfaceWidth - GAP) / (CARD_WIDTH + GAP)));
  const occupied = new Set(taken.map((c) => `${c.x},${c.y}`));
  for (let index = 0; index < taken.length + columns * 2 + 1; index += 1) {
    const x = GAP + (index % columns) * (CARD_WIDTH + GAP);
    const y = GAP + Math.floor(index / columns) * (CARD_HEIGHT + GAP);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return { x: GAP, y: GAP };
}

/**
 * How much room a card may occupy on a desk that scrolls.
 *
 * The clamp has to run against the CONTENT, not against the window onto it.
 * Using the viewport meant a card dragged on a desk scrolled down 500 pixels
 * was clamped as though the desk were 400 tall, and it jumped several hundred
 * pixels on the first movement (ISS-0005). A desk never shrinks below its
 * viewport, so the larger of the two is the answer.
 */
export function deskBounds(surface: {
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}): { width: number; height: number } {
  return {
    width: Math.max(surface.clientWidth, surface.scrollWidth),
    height: Math.max(surface.clientHeight, surface.scrollHeight),
  };
}

/**
 * How much room a RESTORED card may occupy: the desk's own extent, which is
 * the window and every position the desk has been saved with.
 *
 * Three bounds have been tried here and the first two were both wrong, so the
 * reasoning is written down rather than left to be rediscovered.
 *
 * The CONTENT bound (`deskBounds`) is measured from the DOM, and for a
 * restored card the DOM is where this same clamp last put it. Each repaint
 * moved a card a little further down — a fold, a keystroke, a change from
 * another window (ISS-0017).
 *
 * The WINDOW alone is stable and squeezes the desk flat. Every card clamps
 * inside one screenful, so a desk holding more than a screenful draws cards on
 * top of each other and can never scroll to the rest: forty cards on a 900x600
 * desk painted 24 distinct positions.
 *
 * The desk's own EXTENT is both stable and right. It is a pure function of the
 * saved positions and the window, so painting it a hundred times changes
 * nothing, and it grows with the arrangement, because a card at y=2000 makes
 * the desk 2000 tall and is reached by scrolling. What the clamp still catches
 * is a negative coordinate and a position outside the extent it helped define
 * — which is a smaller job than "pull a big arrangement onto a small screen",
 * and that job was never the right one: doing it piles the cards up.
 */
export function placementBounds(
  surface: { clientWidth: number; clientHeight: number },
  cards: { x: number; y: number }[],
): { width: number; height: number } {
  let width = surface.clientWidth;
  let height = surface.clientHeight;
  for (const card of cards) {
    width = Math.max(width, card.x + CARD_WIDTH + GAP);
    height = Math.max(height, card.y + CARD_HEIGHT + GAP);
  }
  return { width, height };
}

/**
 * A position that is still reachable on this surface.
 *
 * A card dragged past the edge, or restored onto a window smaller than the one
 * it was saved on, has to come back far enough to be grabbed again. Enough of
 * the card is kept on screen to take hold of it.
 */
export function clampToSurface(
  position: { x: number; y: number },
  surface: { width: number; height: number },
): { x: number; y: number } {
  const grabbable = 48;
  const maxX = Math.max(0, surface.width - grabbable);
  const maxY = Math.max(0, surface.height - grabbable);
  return {
    x: Math.min(Math.max(0, Math.round(position.x)), maxX),
    y: Math.min(Math.max(0, Math.round(position.y)), maxY),
  };
}
