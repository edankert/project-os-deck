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
 * The same number as `brief`, and it may never be higher: a promoted tile
 * showing nothing but its id would gain a click and no meaning. Being an
 * element is what gives it the click and the tab stop ISS-0073 is about, so
 * the promotion and the first readable level are the same moment.
 */
export const PROMOTE_AT = DETAIL_AT.brief;

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
export function promoted(width: number): boolean {
  return Number.isFinite(width) && width >= PROMOTE_AT;
}
