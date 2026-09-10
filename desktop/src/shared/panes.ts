/**
 * The numbers a held note obeys when it is a pane on the front plane (TASK-0054).
 *
 * Stated once, here, because the reducer clamps to them, the renderer draws
 * with them and the task note quotes them. The DES-0002 review measured the
 * design's note window at 300 by 176 pixels and said a reader needs a minimum
 * size or a reading column; Deck has both.
 */

/** Below this a pane's body cannot be read, so a resize stops here. */
export const PANE_MIN_WIDTH = 280;
export const PANE_MIN_HEIGHT = 160;
/** A pane nobody has resized. */
export const PANE_DEFAULT_WIDTH = 320;
export const PANE_DEFAULT_HEIGHT = 240;
/** Nothing larger than this is kept, so a desk saved on a wall screen still opens. */
export const PANE_MAX_SIDE = 4000;
/**
 * The height of a pane's header: id, status and face, always readable.
 *
 * DES-0002's overlap rule is that a pane may cover another pane's body but
 * never its header, so a pane dropped over a header snaps to just below it.
 * A stack of eight is eight headers and one body.
 */
export const PANE_HEADER_HEIGHT = 34;
/** The reading column a widened pane moves to, at the right of the field. */
export const READING_COLUMN_WIDTH = 520;

/**
 * Where a pane lands when it is dropped, by the header rule.
 *
 * A pane whose top edge falls on another pane's header — horizontally
 * overlapping it, and with its top inside that header's band — is moved down
 * to sit just below that header. It repeats, because snapping below one
 * header can land on the next one in a stack. Pure, so the rule is tested
 * without a window.
 */
export function snapBelowHeaders(
  dropped: { noteId: string; x: number; y: number; w: number },
  others: Array<{ noteId: string; x: number; y: number; w: number }>,
): { x: number; y: number } {
  let y = dropped.y;
  for (let guard = 0; guard <= others.length; guard += 1) {
    const covered = others.find(
      (o) =>
        o.noteId !== dropped.noteId &&
        dropped.x < o.x + o.w &&
        dropped.x + dropped.w > o.x &&
        y >= o.y - PANE_HEADER_HEIGHT + 1 &&
        y < o.y + PANE_HEADER_HEIGHT,
    );
    if (covered === undefined) break;
    y = covered.y + PANE_HEADER_HEIGHT;
  }
  return { x: dropped.x, y };
}
