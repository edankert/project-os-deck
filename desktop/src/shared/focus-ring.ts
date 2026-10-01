/**
 * The neighbourhood: where an opened note's related cards stand while it is
 * the focus (FEAT-0017, TASK-0104).
 *
 * The note opened is a document at the size the person chose. The notes it
 * links to and the notes linking to it are the SAME cards the field was
 * already drawing, moved to seats around the document at the size they are
 * browsed at. This module is the geometry only: which seats exist around a
 * document, who takes which, and how far the desk must move to bring one into
 * view. Pure, so it is tested without a window.
 *
 * Until 2026-10-01 this module sized the document from the number of
 * neighbours and drew up to sixteen 168 by 44 copies inside the window
 * (TASK-0067). Edwin reversed all three on 2026-09-12 (ISS-0070, ISS-0071,
 * ISS-0072): the document keeps its size, the cards are moved and not copied,
 * and the arrangement may be larger than the window. So a seat is refused only
 * for lying over the document, over another seat, or above or below the
 * field; to the left and right the seats run on past the window's edge.
 */
import { CARD_BOX, FRONT, PERSPECTIVE } from './slots.js';

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The scale a front-band card straight ahead is drawn at, which is the size a
 * person browses at. A seated neighbour is drawn at exactly this scale, so
 * gathering a card never makes it smaller than it was a moment before
 * (ISS-0070: "why not the same size view as when browsing?").
 */
export const BROWSE_SCALE = PERSPECTIVE / (PERSPECTIVE + FRONT.depth);
/** A seated card on screen: the front band's box at the browsing scale. */
export const SEAT: Readonly<Size> = Object.freeze({
  width: CARD_BOX.width * BROWSE_SCALE,
  height: CARD_BOX.height * BROWSE_SCALE,
});
/** Space between the document and a seat, and between two seats. */
export const SEAT_GAP = 14;
/** Space kept clear at the top and the bottom of the field. */
export const EDGE_MARGIN = 12;
/** Columns of seats offered on each side before the layout gives up. */
const MOST_COLUMNS = 400;
/**
 * How long the document takes to open from its card or its row, and how long
 * the related cards take to gather. DES-0003 asks for a trial between 250 and
 * 400 ms against the earlier 300 + 700; these are the trial values, and
 * TASK-0097 records what the walk decides.
 */
export const OPEN_MS = 300;
export const GATHER_MS = 400;

export interface Seat extends Point {
  /** How many seats stand between this one and the document, on its side. */
  ring: number;
  /** Whether the whole seat is inside the field as laid out. */
  onScreen: boolean;
}

export interface SeatRequest {
  /** The document as drawn, in field pixels. */
  doc: Rect;
  field: Size;
  /** How many neighbours need a seat. */
  count: number;
  /** What is drawn over the field and must not hide a seat: the compass, another document. */
  avoid?: readonly Rect[];
}

function seatRect(p: Point): Rect {
  return { left: p.x - SEAT.width / 2, top: p.y - SEAT.height / 2, width: SEAT.width, height: SEAT.height };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function angleAbout(centre: Point, p: Point): number {
  return Math.atan2(p.y - centre.y, p.x - centre.x);
}

/** How far a rectangle is from another, edge to edge; 0 when they touch or overlap. */
function gapBetween(a: Rect, b: Rect): number {
  const dx = Math.max(0, a.left - (b.left + b.width), b.left - (a.left + a.width));
  const dy = Math.max(0, a.top - (b.top + b.height), b.top - (a.top + a.height));
  return Math.hypot(dx, dy);
}

/**
 * `count` seats around a document, nearest first.
 *
 * The seats lie on a grid whose rows are a card and a gap apart, measured from
 * the document's own middle. Columns stand to the left and to the right of the
 * document and run outward without limit; where the field has room above or
 * below the document, a row of seats stands there too. A seat is never laid
 * over the document, over another seat, over anything in `avoid`, or outside
 * the field's height, because a seat above or below the field could never be
 * turned to. Seats inside the field are filled before seats beyond its left
 * and right edges, so nothing is sent out of sight while a seat in sight is
 * free.
 *
 * The document's size is an INPUT and nothing here changes it: more
 * neighbours make the arrangement wider, never the document smaller.
 */
export function seatsAround(request: SeatRequest): Seat[] {
  const count = Math.max(0, Math.floor(request.count));
  if (count === 0) return [];
  const { doc, field } = request;
  const avoid = request.avoid ?? [];
  const pitchX = SEAT.width + SEAT_GAP;
  const pitchY = SEAT.height + SEAT_GAP;
  const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
  const top = EDGE_MARGIN + SEAT.height / 2;
  const bottom = field.height - EDGE_MARGIN - SEAT.height / 2;
  // Rows measured from the document's middle, kept inside the field's height.
  const rows: number[] = [];
  if (bottom >= top) {
    const first = Math.ceil((top - centre.y) / pitchY);
    const last = Math.floor((bottom - centre.y) / pitchY);
    for (let k = first; k <= last; k += 1) rows.push(centre.y + k * pitchY);
  }
  // A field too short for one whole seat still seats its neighbours, in one row.
  if (rows.length === 0) rows.push(field.height / 2);
  const keepOut: Rect = { left: doc.left - SEAT_GAP, top: doc.top - SEAT_GAP, width: doc.width + 2 * SEAT_GAP, height: doc.height + 2 * SEAT_GAP };
  const usable = (p: Point): boolean => {
    const r = seatRect(p);
    return !intersects(r, keepOut) && avoid.every((a) => !intersects(r, a));
  };
  const make = (p: Point, ring: number): Seat => {
    const r = seatRect(p);
    return { x: p.x, y: p.y, ring, onScreen: r.left >= 0 && r.left + r.width <= field.width && r.top >= 0 && r.top + r.height <= field.height };
  };
  const found: Seat[] = [];
  // Above and below the document, across its own width.
  const across: number[] = [];
  const half = Math.floor((doc.width / 2 - SEAT.width / 2) / pitchX);
  for (let j = -half; j <= half; j += 1) across.push(centre.x + j * pitchX);
  for (const y of rows) {
    for (const x of across) {
      const p = { x, y };
      if (!usable(p)) continue;
      const ring = Math.max(0, Math.round((Math.abs(y - centre.y) - doc.height / 2 - SEAT_GAP - SEAT.height / 2) / pitchY));
      found.push(make(p, ring));
    }
  }
  // To the left and the right, outward. Every column that could be in sight
  // is offered, so a seat in sight is never passed over, and past the field's
  // edges the columns go on until there are enough seats. `MOST_COLUMNS`
  // only stops a request whose `avoid` covers everything from running away.
  for (let ring = 0; ring < MOST_COLUMNS; ring += 1) {
    const left = doc.left - SEAT_GAP - SEAT.width / 2 - ring * pitchX;
    const right = doc.left + doc.width + SEAT_GAP + SEAT.width / 2 + ring * pitchX;
    const inSight = left + SEAT.width / 2 > 0 || right - SEAT.width / 2 < field.width;
    if (!inSight && found.length >= count) break;
    for (const x of [left, right]) {
      for (const y of rows) {
        const p = { x, y };
        if (usable(p)) found.push(make(p, ring));
      }
    }
  }
  // In sight first, then nearest the document's edge, then nearest its
  // middle, so the two sides fill together instead of one column first. Last,
  // clockwise from the top, so the same request always gives the same seats.
  const order = (s: Seat): number => {
    const a = angleAbout(centre, s) + Math.PI / 2;
    return ((a % TAU) + TAU) % TAU;
  };
  const near = (a: number, b: number): number => (Math.abs(a - b) < 1e-6 ? 0 : a - b);
  found.sort((a, b) =>
    Number(b.onScreen) - Number(a.onScreen)
    || near(gapBetween(seatRect(a), doc), gapBetween(seatRect(b), doc))
    || near(Math.hypot(a.x - centre.x, a.y - centre.y), Math.hypot(b.x - centre.x, b.y - centre.y))
    || order(a) - order(b));
  return found.slice(0, count);
}

/** What seating needs to know about one neighbour of the focus. */
export interface SeatNeighbour {
  id: string;
  /** Its angle around the document's middle where its card was drawn before, or null. */
  angle: number | null;
  /** Which side of the person it stood on when it was out of sight: negative left, positive right, 0 unknown. */
  side: number;
}

const TAU = 2 * Math.PI;

function wrap(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

function gap(a: number, b: number): number {
  const d = Math.abs(wrap(a) - wrap(b));
  return Math.min(d, TAU - d);
}

/** The angle a neighbour is sorted by: where it was, or its side, or the bottom. */
function sortAngle(n: SeatNeighbour): number {
  if (n.angle !== null) return wrap(n.angle);
  if (n.side !== 0) return n.side < 0 ? Math.PI : 0;
  return Math.PI / 2;
}

export interface Seating {
  id: string;
  seat: Seat;
}

/**
 * Give each neighbour a seat, keeping the circular order the cards had round
 * the document (after Yee et al., as before): the seats are taken in order of
 * angle, and the whole arrangement is turned to whichever seating moves the
 * cards least. Deterministic: the same neighbours and seats always seat the
 * same way. A neighbour past the last seat is not seated, and the caller
 * counts it; `seatsAround` returns one seat per neighbour, so that happens
 * only when the caller asked for fewer.
 */
export function seatNeighbours(neighbours: readonly SeatNeighbour[], seats: readonly Seat[], centre: Point): Seating[] {
  const n = Math.min(neighbours.length, seats.length);
  if (n === 0) return [];
  const ordered = [...neighbours]
    .sort((a, b) => sortAngle(a) - sortAngle(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, n);
  const places = seats.slice(0, n)
    .map((seat) => ({ seat, angle: wrap(angleAbout(centre, seat)) }))
    .sort((a, b) => a.angle - b.angle || a.seat.ring - b.seat.ring || a.seat.x - b.seat.x || a.seat.y - b.seat.y);
  let bestTurn = 0;
  let bestCost = Infinity;
  for (let r = 0; r < n; r += 1) {
    let cost = 0;
    for (let j = 0; j < n && cost < bestCost; j += 1) {
      cost += gap((places[(j + r) % n] as { angle: number }).angle, sortAngle(ordered[j] as SeatNeighbour));
    }
    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      bestTurn = r;
    }
  }
  return ordered.map((neighbour, j) => ({ id: neighbour.id, seat: (places[(j + bestTurn) % n] as { seat: Seat }).seat }));
}

/**
 * How far the desk must move to bring a rectangle wholly into the field: the
 * least movement that does it, or none when it is already there. A rectangle
 * larger than the field is brought to the field's top left.
 */
export function revealShift(rect: Rect, field: Size, margin = EDGE_MARGIN): Point {
  const along = (start: number, size: number, room: number): number => {
    if (size + 2 * margin >= room) return margin - start;
    if (start < margin) return margin - start;
    if (start + size > room - margin) return room - margin - (start + size);
    return 0;
  };
  return { x: along(rect.left, rect.width, field.width), y: along(rect.top, rect.height, field.height) };
}

/** How many rectangles lie wholly beyond each edge of the field. */
export function beyondEdges(rects: readonly Rect[], field: Size): { left: number; right: number; up: number; down: number } {
  const out = { left: 0, right: 0, up: 0, down: 0 };
  for (const r of rects) {
    if (r.left + r.width <= 0) out.left += 1;
    else if (r.left >= field.width) out.right += 1;
    else if (r.top + r.height <= 0) out.up += 1;
    else if (r.top >= field.height) out.down += 1;
  }
  return out;
}

/** Where the line from a rectangle's centre toward `to` leaves its edge. */
export function edgeAnchor(pane: Rect, to: Point): Point {
  const cx = pane.left + pane.width / 2;
  const cy = pane.top + pane.height / 2;
  const dx = to.x - cx;
  const dy = to.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx === 0 ? Infinity : pane.width / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : pane.height / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** Slow at both ends: 0 at 0, 1 at 1, symmetric about the middle. */
export function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return (1 - Math.cos(Math.PI * t)) / 2;
}
