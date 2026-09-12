/**
 * How much of a note is drawn, from how large it is actually drawn
 * (TASK-0074, ISS-0074).
 *
 * The field has had detail by distance since FEAT-0009: a mid-band card drops
 * its face line and its owed verb. That rule was keyed to the BAND the deal
 * assigned, and the zoom changes the scale and never the band, so zooming in
 * made a card bigger and told a person nothing new. Here the decision is the
 * width the card is drawn at, after the projection and the zoom, so a card at
 * a given apparent width shows the same amount whatever band it stands in.
 *
 * Pure and total: no DOM, no import from the renderer, and every input
 * returns a level.
 */

/** What a note shows, smallest first. */
export type DetailLevel = 'tile' | 'brief' | 'full' | 'more';

export const DETAIL_LEVELS: readonly DetailLevel[] = Object.freeze(['tile', 'brief', 'full', 'more']);

/**
 * The width, in pixels on screen, at which a note reaches each level.
 *
 * Read off the field as it is drawn today, so the unzoomed picture is the one
 * a person already knows:
 *
 * - A quiet tile on Your Trainer is 58 wide at depth 760 and lands at 34, so
 *   it is a `tile` — which is what it is today, an id on a canvas.
 * - A quiet tile in a small workspace is 140 wide (TASK-0073) and lands at
 *   83, so it is `brief` and is promoted to a real card. The large workspace
 *   keeps its tiles until a person zooms. That is the threshold ISS-0073's
 *   cost question turns on, and it is one number here rather than a rule.
 * - A mid-band card straight ahead lands at 119, so it stays `brief`: the id,
 *   the mark and the title, exactly as now.
 * - A front-band card lands at 138, so it is `full`: the face line and the
 *   owed verb as well, exactly as now.
 * - Nothing reaches `more` at 1x. A front card at 1.6x does, and a mid card
 *   at 2.5x does. This is the level ISS-0074 asked for and nothing has ever
 *   drawn.
 */
export const DETAIL_AT = Object.freeze({
  brief: 60,
  full: 130,
  more: 210,
});

/**
 * The width past which a quiet tile stops being painted on the canvas and is
 * drawn as an element (TASK-0077).
 *
 * **This was `brief` until the numbers were run, and the reason it moved is
 * worth keeping.** TASK-0074 set it at `brief` on the argument that being an
 * element is what gives a tile its click and its tab stop, so promoting one
 * that showed only an id would buy nothing. TASK-0076 then gave the PAINTED
 * band its own hit test and a roving tab stop, so a tile is clickable,
 * hoverable and reachable by keyboard whether or not it is an element.
 * Promotion is now only about DETAIL, and it can wait until a tile is drawn
 * at the size of a card that carries some.
 *
 * At `brief` it did not wait. On Your Trainer's Issues view the quiet band's
 * tiles are drawn between 83 and 122 pixels wide at 1x, so all 311 visible
 * ones promoted at once: about 2,200 more elements on a document of 2,303,
 * which is the doubling ISS-0073 warned about, taken without a person asking
 * for anything. At `full` none promotes at 1x, 14 at 1.4x, 59 at 1.8x and
 * 180 at 2.5x — it grows as a person zooms toward the band and is bounded by
 * what is on the screen.
 */
export const PROMOTE_AT = DETAIL_AT.full;

/**
 * How far a promoted tile must shrink before it is painted again.
 *
 * Without it a tile sitting exactly at the threshold is created and destroyed
 * on alternate frames as the zoom drifts a fraction, which reads as a flicker
 * and allocates an element every frame. Eight pixels is about a tenth of the
 * threshold: wide enough that no drift crosses both edges, narrow enough that
 * a person zooming out gets the tile back where they expect.
 */
export const DEMOTE_AT = PROMOTE_AT - 8;

/**
 * What each level draws, as the parts of a card.
 *
 * Stated here rather than in the stylesheet so the suite and the renderer
 * cannot disagree about what a level means, the way the slot test and the
 * renderer once disagreed about a card's anchor (TASK-0030).
 */
export const DETAIL_SHOWS: Readonly<Record<DetailLevel, readonly string[]>> = Object.freeze({
  tile: Object.freeze(['id']),
  brief: Object.freeze(['id', 'mark', 'title']),
  full: Object.freeze(['id', 'mark', 'title', 'face', 'owed']),
  more: Object.freeze(['id', 'mark', 'title', 'face', 'owed', 'status', 'progress', 'properties']),
});

/**
 * The level a note drawn this wide shows.
 *
 * `width` is the box's width on screen: `projection.scale * box.width`, after
 * `applyZoom`. A width that is zero, negative or absurd returns a level
 * rather than throwing, because it is called once per card per frame and a
 * card behind the person has no useful width.
 */
export function detailFor(width: number): DetailLevel {
  if (!Number.isFinite(width) || width < DETAIL_AT.brief) return 'tile';
  if (width < DETAIL_AT.full) return 'brief';
  if (width < DETAIL_AT.more) return 'full';
  return 'more';
}

/** Whether a quiet-band tile this wide should be drawn as an element instead of painted. */
export function promoted(width: number, wasPromoted = false): boolean {
  if (!Number.isFinite(width)) return false;
  return wasPromoted ? width >= DEMOTE_AT : width >= PROMOTE_AT;
}
