/**
 * The ring: where an opened note and its neighbours stand while it is the
 * focus (FEAT-0017, TASK-0067).
 *
 * The note opened is drawn as a pane in the middle of the field, and the notes
 * it links to and the notes linking to it stand around it as mini notes (small
 * cards with an id and a title). This module is the geometry only: the pane's
 * rectangle, the places on the ring, who gets a place, the order they keep,
 * and the arc each one moves along. Pure, so it is tested without a window.
 *
 * DES-0002 rev 5 once moved neighbours off a ring because it overlapped the
 * open card. Here the ring is sized from the pane so that cannot happen: the
 * places lie on a superellipse (|x/a|⁴ + |y/b|⁴ = 1, a rounded rectangle)
 * whose half-axes are 2^¼ times the box a mini note must stay outside. On that
 * curve max(|x|/a, |y|/b) is never below 2^-¼, so every place is clear of the
 * pane on one axis or the other.
 */

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

/** A mini note: a line of id and a line of title. */
export const MINI = Object.freeze({ width: 168, height: 44 });
/** The pane in the middle, at most and at least (the least is a pane's own minimum, TASK-0054). */
export const FOCUS_MAX = Object.freeze({ width: 640, height: 480 });
export const FOCUS_MIN = Object.freeze({ width: 280, height: 160 });
/** Space between the pane and a mini note, between two mini notes, and from the field's edge. */
export const RING_GAP = 16;
export const EDGE_MARGIN = 12;
/** Where the other held notes wait, as headers, while one note is the focus. */
export const DOCK_WIDTH = 240;
/** At most this many places on the ring; beyond it one is "+N more". */
export const RING_MAX = 16;
/** The two stages of opening: the card grows where it is, then everything gathers. */
export const GROW_MS = 300;
export const GATHER_MS = 700;

const SUPER = 2 ** 0.25;

export interface FocusLayout {
  /** The pane in the middle. */
  pane: Rect;
  /** The middle the ring turns about: the pane's centre. */
  centre: Point;
  /** Centres of the mini notes, clockwise from the top. */
  places: Point[];
}

function inside(p: Point, area: { x0: number; x1: number; y0: number; y1: number; avoid: readonly Rect[] }): boolean {
  const left = p.x - MINI.width / 2;
  const top = p.y - MINI.height / 2;
  if (left < area.x0 || left + MINI.width > area.x1 || top < area.y0 || top + MINI.height > area.y1) return false;
  // Clear of what is drawn over the field, such as the compass.
  return area.avoid.every((r) => left + MINI.width <= r.left || left >= r.left + r.width || top + MINI.height <= r.top || top >= r.top + r.height);
}

function overlaps(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < MINI.width + RING_GAP && Math.abs(a.y - b.y) < MINI.height + RING_GAP;
}

/**
 * `count` places on the curve for this pane, spaced evenly by DISTANCE along
 * it, clockwise from the top. Spaced by the curve's parameter instead, they
 * bunch at the corners and a 1920 by 1080 field held only 12. `grow` widens
 * the curve beyond the least that clears the pane, when more room is needed.
 */
function ringFor(centre: Point, pane: Size, count: number, grow: number, startAngle: number = -Math.PI / 2): Point[] {
  const a = (pane.width / 2 + RING_GAP + MINI.width / 2) * SUPER * grow;
  const b = (pane.height / 2 + RING_GAP + MINI.height / 2) * SUPER * grow;
  const at = (t: number): Point => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return { x: centre.x + a * Math.sign(c) * Math.sqrt(Math.abs(c)), y: centre.y + b * Math.sign(s) * Math.sqrt(Math.abs(s)) };
  };
  // Screen y runs down, so an increasing angle from -π/2 is clockwise from the top.
  const steps = 720;
  const points: Point[] = [];
  const length: number[] = [0];
  for (let i = 0; i <= steps; i += 1) {
    points.push(at(-Math.PI / 2 + (2 * Math.PI * i) / steps));
    if (i > 0) {
      const p = points[i] as Point;
      const q = points[i - 1] as Point;
      length.push((length[i - 1] as number) + Math.hypot(p.x - q.x, p.y - q.y));
    }
  }
  const total = length[steps] as number;
  // The first place stands where the curve crosses `startAngle` about the
  // centre: the top, unless the ring is started opposite the way the person
  // came, so the line between the two notes keeps its direction (decision 5).
  let startIndex = 0;
  let nearest = Infinity;
  for (let i = 0; i < steps; i += 1) {
    const p = points[i] as Point;
    const d = Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - centre.y, p.x - centre.x) - startAngle), Math.cos(Math.atan2(p.y - centre.y, p.x - centre.x) - startAngle)));
    if (d < nearest) {
      nearest = d;
      startIndex = i;
    }
  }
  const offset = length[startIndex] as number;
  const out: Point[] = [];
  for (let k = 0; k < count; k += 1) {
    const want = (offset + (total * k) / count) % total;
    let j = 0;
    while (j < steps - 1 && (length[j + 1] as number) < want) j += 1;
    const span = (length[j + 1] as number) - (length[j] as number);
    const f = span === 0 ? 0 : (want - (length[j] as number)) / span;
    const p = points[j] as Point;
    const q = points[j + 1] as Point;
    out.push({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f });
  }
  return out;
}

/**
 * The pane's rectangle and the ring's places for a field and a dock, with
 * every place clear of `avoid`: what is drawn over the field, the compass.
 *
 * A readable note matters more than a full ring, because "+N more" lists the
 * rest: the largest pane (up to 640 by 480, keeping that shape, never below
 * 280 by 160) whose ring holds at least `ENOUGH` places, or every neighbour
 * when there are fewer. Each place is inside the field, outside the dock and
 * clear of every other, and the ring may stand further out than the least
 * that clears the pane when the places need the room. When no pane manages
 * that, the arrangement that holds the most: a small field gets fewer.
 */
export const ENOUGH = 6;

export function focusLayout(field: Size, dock: number, wanted: number, startAngle: number = -Math.PI / 2, avoid: readonly Rect[] = []): FocusLayout {
  const need = Math.max(0, Math.min(RING_MAX, Math.floor(wanted)));
  const area = { x0: dock + EDGE_MARGIN, x1: field.width - EDGE_MARGIN, y0: EDGE_MARGIN, y1: field.height - EDGE_MARGIN, avoid };
  const centre = { x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2 };
  const clear = (places: Point[]): boolean => places.every((p, i) => places.every((q, j) => j <= i || !overlaps(p, q)));
  // The most places this pane's ring can hold, up to `need`: a whole ring,
  // standing further out if it must, or, where the field is too narrow for
  // one, the places of a ring that land on the field and stand clear of each
  // other, top and bottom arcs first. Whichever holds more.
  const placesFor = (pane: Size): Point[] => {
    let best: Point[] = [];
    for (let count = need; count >= 1 && best.length < count; count -= 1) {
      for (let grow = 1; grow <= 2; grow += 0.05) {
        const ring = ringFor(centre, pane, count, grow, startAngle);
        if (ring.every((p) => inside(p, area)) && clear(ring)) {
          if (ring.length > best.length) best = ring;
          break;
        }
      }
    }
    if (best.length === need) return best;
    for (let spread = need; spread <= 3 * RING_MAX; spread += 1) {
      const kept: Point[] = [];
      for (const p of ringFor(centre, pane, spread, 1, startAngle)) {
        if (kept.length < need && inside(p, area) && kept.every((q) => !overlaps(p, q))) kept.push(p);
      }
      if (kept.length > best.length) best = kept;
      if (best.length === need) break;
    }
    return best;
  };
  const target = Math.min(need, ENOUGH);
  let best: { pane: Size; places: Point[] } | null = null;
  for (let step = 0; step <= 20 && need > 0; step += 1) {
    const k = 1 - step / 20;
    const pane = {
      width: Math.max(FOCUS_MIN.width, Math.round(FOCUS_MAX.width * k)),
      height: Math.max(FOCUS_MIN.height, Math.round(FOCUS_MAX.height * k)),
    };
    const places = placesFor(pane);
    if (best === null || places.length > best.places.length) best = { pane, places };
    if (places.length >= target) {
      best = { pane, places };
      break;
    }
    if (pane.width === FOCUS_MIN.width && pane.height === FOCUS_MIN.height) break;
  }
  const chosen = best ?? { pane: { ...FOCUS_MIN }, places: [] };
  return {
    pane: { left: centre.x - chosen.pane.width / 2, top: centre.y - chosen.pane.height / 2, width: chosen.pane.width, height: chosen.pane.height },
    centre,
    places: chosen.places,
  };
}

/** What the ring needs to know about one neighbour of the focus. */
export interface RingNeighbour {
  id: string;
  /** The note that was the focus before this one: the mini note clicked came from its ring. */
  cameFrom?: boolean;
  held?: boolean;
  /** Joined to another held note as well. */
  shared?: boolean;
  owed?: boolean;
  /** 'out': the focus links to it; 'in': it links to the focus; 'both'. */
  direction: 'out' | 'in' | 'both';
  /** Its angle around the middle of the field where it was drawn before the lift, or null. */
  angle: number | null;
  /** Its bearing on the cylinder from where the person faces, negative to the left, or null when it has no slot. */
  bearing: number | null;
}

function rank(n: RingNeighbour): number {
  if (n.cameFrom === true) return 0;
  if (n.held === true) return 1;
  if (n.shared === true) return 2;
  if (n.owed === true) return 3;
  return n.direction === 'in' ? 5 : 4;
}

/**
 * Who gets a place. Everyone, when they fit; otherwise all but the last place
 * go by priority (decision 4) and the last is "+N more", N being everyone
 * left out, so the places plus N always equal the neighbours.
 */
export function chooseForRing(neighbours: readonly RingNeighbour[], places: number): { chosen: RingNeighbour[]; more: number } {
  if (neighbours.length <= places) return { chosen: [...neighbours], more: 0 };
  const room = Math.max(0, places - 1);
  const chosen = [...neighbours].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, room);
  return { chosen, more: neighbours.length - room };
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
function sortAngle(n: RingNeighbour): number {
  if (n.angle !== null) return wrap(n.angle);
  // Left of the person is the left of the ring (π), right is the right (0).
  if (n.bearing !== null) return n.bearing < 0 ? Math.PI : 0;
  return Math.PI / 2;
}

export interface RingSeat {
  id: string;
  place: Point;
}

/**
 * Seat the chosen neighbours on the places, keeping their circular order
 * (decision 5, after Yee et al.). The ring is turned to whichever seating
 * moves them least; when `cameFromAngle` is given, it is turned instead so the
 * note the person came from sits at that angle, opposite the direction the
 * new focus came from. With "+N more" the last place is its, and the
 * neighbours take the others in order.
 */
export function seatRing(chosen: readonly RingNeighbour[], layout: FocusLayout, more: number, cameFromAngle: number | null = null): { seats: RingSeat[]; morePlace: Point | null } {
  const places = layout.places;
  const usable = more > 0 ? places.slice(0, Math.max(0, places.length - 1)) : places;
  const morePlace = more > 0 && places.length > 0 ? (places[places.length - 1] as Point) : null;
  const ordered = [...chosen].sort((a, b) => sortAngle(a) - sortAngle(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const m = usable.length;
  if (ordered.length === 0 || m === 0) return { seats: [], morePlace };
  const angleOf = (p: Point): number => Math.atan2(p.y - layout.centre.y, p.x - layout.centre.x);
  const placeAngles = usable.map(angleOf);
  // Spread the neighbours over the places evenly when there are fewer of them.
  const slot = (j: number, r: number): number => (Math.round((j * m) / ordered.length) + r) % m;
  let bestTurn = 0;
  let bestCost = Infinity;
  const from = ordered.findIndex((n) => n.cameFrom === true);
  for (let r = 0; r < m; r += 1) {
    let cost = 0;
    if (from >= 0 && cameFromAngle !== null) {
      cost = gap(placeAngles[slot(from, r)] as number, cameFromAngle);
    } else {
      for (let j = 0; j < ordered.length; j += 1) cost += gap(placeAngles[slot(j, r)] as number, sortAngle(ordered[j] as RingNeighbour));
    }
    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      bestTurn = r;
    }
  }
  return { seats: ordered.map((n, j) => ({ id: n.id, place: usable[slot(j, bestTurn)] as Point })), morePlace };
}

/**
 * A point on the way from `start` to `end` at time `t`, moving by angle round
 * `centre` (the short way) and by distance from it, never in a straight line:
 * a straight line would carry the neighbours through the middle, under the
 * pane (decision 6).
 */
export function arcPoint(start: Point, end: Point, centre: Point, t: number): Point {
  if (t <= 0) return { x: start.x, y: start.y };
  if (t >= 1) return { x: end.x, y: end.y };
  const a0 = Math.atan2(start.y - centre.y, start.x - centre.x);
  const a1 = Math.atan2(end.y - centre.y, end.x - centre.x);
  let da = a1 - a0;
  if (da > Math.PI) da -= TAU;
  if (da < -Math.PI) da += TAU;
  const r0 = Math.hypot(start.x - centre.x, start.y - centre.y);
  const r1 = Math.hypot(end.x - centre.x, end.y - centre.y);
  const a = a0 + da * t;
  const r = r0 + (r1 - r0) * t;
  return { x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) };
}

/** Slow at both ends: 0 at 0, 1 at 1, symmetric about the middle. */
export function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return (1 - Math.cos(Math.PI * t)) / 2;
}
