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
/**
 * The size a note opens at on a view where nobody has resized one yet.
 *
 * Until TASK-0104 this was 320 by 240, which holds about forty characters a
 * line and eleven lines: a preview, not a reading size. DES-0003 asks for a
 * column of roughly 60 to 80 characters, and 560 wide holds about seventy at
 * the document's text size with its padding. TASK-0097 measures the line
 * length in the running application and records what the walk decides.
 */
export const READING_FIRST_USE: Readonly<{ w: number; h: number }> = Object.freeze({ w: 560, h: 520 });
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
 * Below this width a field cannot hold the collection and a readable document
 * side by side: the narrowest collection (260) and the narrowest readable
 * document (280) with their margins, and room to tell them apart. Such a
 * field shows one object in front at a time, with a bar to move between them
 * (DES-0003, "A narrow viewport uses one foreground object with an explicit
 * return, rather than shrinking prose to fit two objects").
 */
export const NARROW_FIELD_WIDTH = 720;
/** The bar a narrow field carries along its top: the collection and each open note, by name. */
export const NARROW_BAR_HEIGHT = 36;

/**
 * The size a held note is drawn at, and where that size came from.
 *
 * The note's own size wins: a person dragged its corner, or it was stamped
 * when the note was opened. Then the size the person last gave a note on this
 * view. Then the first-use size. Moving a note never reaches this function's
 * inputs, which is the whole of "a move is not a resize" (ISS-0071).
 */
export function readingSizeFor(
  card: { w?: number; h?: number },
  preference: { w: number; h: number } | null | undefined,
): { w: number; h: number; from: 'note' | 'view' | 'first-use' } {
  if (card.w !== undefined && card.h !== undefined) return { w: card.w, h: card.h, from: 'note' };
  if (preference !== null && preference !== undefined) {
    // A note with one side stored keeps that side: a desk saved by an older
    // build may hold a width and no height.
    return { w: card.w ?? preference.w, h: card.h ?? preference.h, from: card.w === undefined && card.h === undefined ? 'view' : 'note' };
  }
  return { w: card.w ?? READING_FIRST_USE.w, h: card.h ?? READING_FIRST_USE.h, from: card.w === undefined && card.h === undefined ? 'first-use' : 'note' };
}

/**
 * A reading size as it is DRAWN in a field too small to hold it.
 *
 * For painting only. Nothing stores the result, so a window made narrow for a
 * moment cannot overwrite the size a person chose or the view's preference
 * (DES-0003, "A temporary narrow layout must not overwrite the saved size").
 * Never below a pane's minimum, because below it the body cannot be read.
 */
export function fitToField(size: { w: number; h: number }, field: { width: number; height: number }, margin = 8): { w: number; h: number } {
  return {
    w: Math.max(PANE_MIN_WIDTH, Math.min(size.w, field.width - 2 * margin)),
    h: Math.max(PANE_MIN_HEIGHT, Math.min(size.h, field.height - 2 * margin)),
  };
}

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
