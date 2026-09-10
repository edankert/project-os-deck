/**
 * The throw: a drag that leaves the field's edge toward another window
 * (TASK-0055). Pure over pointer samples and window rectangles, so the
 * recogniser and the choice of target are tested without a window.
 *
 * Deck already had every piece but the gesture: one store in the main
 * process, windows placed by display with their bounds remembered, a panel
 * address that says what a window carries, and a way to open a panel. What
 * this adds is the reading of a drag as a direction and a destination.
 */

/** How near the field's edge a dragged card must come before the target strip appears, in pixels. */
export const THROW_EDGE_PX = 44;
/**
 * How fast a card must be moving when it is released past the edge to count
 * as thrown rather than dropped, in pixels per millisecond. A slow drag off
 * the edge is a person hesitating, and it springs back.
 */
export const THROW_MIN_SPEED = 0.35;

export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PointerSample {
  t: number;
  x: number;
  y: number;
}

/** The edge a point is near or past, in the field's own coordinates, or null. */
export function edgeNear(
  point: { x: number; y: number },
  field: { width: number; height: number },
  distance = THROW_EDGE_PX,
): Edge | null {
  const gaps: Array<[Edge, number]> = [
    ['left', point.x],
    ['right', field.width - point.x],
    ['top', point.y],
    ['bottom', field.height - point.y],
  ];
  gaps.sort((a, b) => a[1] - b[1]);
  const [edge, gap] = gaps[0] as [Edge, number];
  return gap <= distance ? edge : null;
}

/**
 * What a person calls a display: its own name, or its number when the system
 * gives it none. macOS names some displays only " (2)", which read as "a new
 * reader on  (2)" in the strip (ISS-0062).
 */
export function displayName(label: string | undefined, index: number, primary: boolean): string {
  const trimmed = (label ?? '').trim();
  if (/[A-Za-z]/.test(trimmed)) return trimmed;
  // The number macOS gives it, when the name is only that: " (1)" is display 1,
  // whatever its place in Electron's list (ISS-0064).
  const numbered = /\((\d+)\)/.exec(trimmed);
  if (numbered !== null) return `display ${numbered[1]}`;
  return primary ? 'the main display' : `display ${index + 1}`;
}

/** Pixels per millisecond over the last `windowMs` of samples. */
export function speedOf(samples: readonly PointerSample[], windowMs = 90): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1] as PointerSample;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i -= 1) {
    const s = samples[i] as PointerSample;
    first = s;
    if (last.t - s.t >= windowMs) break;
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return Math.hypot(last.x - first.x, last.y - first.y) / dt;
}

/**
 * Whether this release is a throw, and toward which edge.
 *
 * Thrown means the last sample is within the edge distance, or past the
 * edge, and the card was still moving at `minSpeed` when it was let go.
 */
export function recogniseThrow(
  samples: readonly PointerSample[],
  field: { width: number; height: number },
  options: { edgeDistance?: number; minSpeed?: number } = {},
): Edge | null {
  const last = samples[samples.length - 1];
  if (last === undefined) return null;
  const edge = edgeNear(last, field, options.edgeDistance ?? THROW_EDGE_PX);
  if (edge === null) return null;
  return speedOf(samples) >= (options.minSpeed ?? THROW_MIN_SPEED) ? edge : null;
}

/** A window Deck could throw to. */
export interface WindowInfo {
  id: number;
  /** What it carries: a note in a reader, a desk, the Needs-you strip, or the focus window. */
  carries: 'note' | 'desk' | 'needs-you' | 'focus';
  bounds: Rect;
  displayId: number;
  displayLabel: string;
}

export interface DisplayInfo {
  id: number;
  label: string;
  workArea: Rect;
}

export type ThrowTarget =
  | { kind: 'window'; windowId: number; carries: WindowInfo['carries']; label: string; displayId: number }
  | { kind: 'display'; displayId: number; label: string }
  | { kind: 'tablet'; label: string };

function centre(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Whether a rectangle lies in this direction from another, judged by their centres. */
export function lies(edge: Edge, from: Rect, to: Rect): boolean {
  const a = centre(from);
  const b = centre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (edge === 'right') return dx > 0 && Math.abs(dx) >= Math.abs(dy) * 0.5;
  if (edge === 'left') return dx < 0 && Math.abs(dx) >= Math.abs(dy) * 0.5;
  if (edge === 'bottom') return dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.5;
  return dy < 0 && Math.abs(dy) >= Math.abs(dx) * 0.5;
}

const WORDS: Record<WindowInfo['carries'], string> = {
  note: 'reader',
  desk: 'desk',
  'needs-you': 'Needs-you strip',
  focus: 'Deck',
};

/**
 * Every place a throw toward this edge could land, nearest first.
 *
 * The windows that lie that way; then each display that way with no Deck
 * window on it, where a throw opens a new reader; then the tablet, when a
 * served page is following the store. The tablet has no position, so it is
 * offered at every edge, last. A Needs-you strip is not a target: it shows
 * what the record says is owed, and a hand does not put a note there.
 */
export function targetsToward(
  edge: Edge,
  self: Rect,
  windows: readonly WindowInfo[],
  displays: readonly DisplayInfo[],
  tabletFollowing: boolean,
): ThrowTarget[] {
  const a = centre(self);
  const distance = (r: Rect): number => Math.hypot(centre(r).x - a.x, centre(r).y - a.y);
  const out: ThrowTarget[] = windows
    .filter((w) => w.carries !== 'needs-you' && lies(edge, self, w.bounds))
    .sort((p, q) => distance(p.bounds) - distance(q.bounds))
    .map((w) => ({
      kind: 'window' as const,
      windowId: w.id,
      carries: w.carries,
      displayId: w.displayId,
      label: `${WORDS[w.carries]} on ${w.displayLabel}`,
    }));
  // Taken only by a window a note can land in: a display holding nothing but
  // a Needs-you strip still gets a new reader (ISS-0062).
  const occupied = new Set(windows.filter((w) => w.carries !== 'needs-you').map((w) => w.displayId));
  const selfDisplay = displays.find(
    (d) => a.x >= d.workArea.x && a.x < d.workArea.x + d.workArea.width && a.y >= d.workArea.y && a.y < d.workArea.y + d.workArea.height,
  );
  if (selfDisplay !== undefined) occupied.add(selfDisplay.id);
  for (const display of [...displays].sort((p, q) => distance(p.workArea) - distance(q.workArea))) {
    if (occupied.has(display.id)) continue;
    if (!lies(edge, self, display.workArea)) continue;
    out.push({ kind: 'display', displayId: display.id, label: `a new reader on ${display.label}` });
  }
  if (tabletFollowing) out.push({ kind: 'tablet', label: 'tablet' });
  return out;
}

/**
 * Where a new reader window opens on a display a note was thrown to: at the
 * edge of that display nearest the window it came from, so the note appears
 * on the side it flew toward.
 */
export function landingBounds(edge: Edge, display: Rect, size = { width: 560, height: 720 }): Rect {
  const width = Math.min(size.width, display.width);
  const height = Math.min(size.height, display.height);
  const y = display.y + Math.round((display.height - height) / 2);
  const x = display.x + Math.round((display.width - width) / 2);
  if (edge === 'right') return { x: display.x, y, width, height };
  if (edge === 'left') return { x: display.x + display.width - width, y, width, height };
  if (edge === 'bottom') return { x, y: display.y, width, height };
  return { x, y: display.y + display.height - height, width, height };
}
