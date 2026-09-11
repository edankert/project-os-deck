/**
 * Zoom: the wheel scales Glass and the orbit toward the pointer (FEAT-0016,
 * TASK-0064).
 *
 * A zoom is a scale and an offset applied AFTER `project()` has put a slot on
 * the screen: a point at (x, y) is drawn at (x × scale + dx, y × scale + dy),
 * and a card's own scale is multiplied by `scale`. It changes no slot, so the
 * field is dealt exactly as it would be at 1×, and the identity draws today's
 * field to the pixel. Pure, so the rules are tested without a window.
 */
import { CARD_BOX, VISIBLE_HALF_ANGLE, type Projection, type Viewport } from './slots.js';

export interface Zoom {
  scale: number;
  dx: number;
  dy: number;
}

export const IDENTITY_ZOOM: Readonly<Zoom> = Object.freeze({ scale: 1, dx: 0, dy: 0 });
/** How far out and in the wheel goes (decision 1). */
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.5;
/**
 * A mouse wheel's notch is reported as 100 pixels by Chromium on macOS, and
 * one notch is 1.1×: the rate is ln(1.1) per 100 pixels.
 */
export const WHEEL_RATE = Math.log(1.1) / 100;
/**
 * A trackpad pinch arrives as a wheel with Ctrl held and small deltas, a few
 * pixels per event, so it takes a larger step per pixel: 1% per pixel.
 */
export const PINCH_RATE = 0.01;
/** A wheel reported in lines, not pixels, is converted at this many pixels a line. */
export const LINE_PX = 16;
/** One press of `+` or `-`. */
export const KEY_STEP = 1.25;

export function isIdentity(zoom: Zoom): boolean {
  return zoom.scale === 1 && zoom.dx === 0 && zoom.dy === 0;
}

function clampScale(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/**
 * Keep the field on screen (decision 5). At a scale of 1 or more the zoomed
 * field covers the whole field area; below 1 it lies inside it.
 */
export function keepOnScreen(zoom: Zoom, field: Viewport): Zoom {
  const span = (offset: number, size: number): number => {
    const drawn = size * zoom.scale;
    const lo = zoom.scale >= 1 ? size - drawn : 0;
    const hi = zoom.scale >= 1 ? 0 : size - drawn;
    return Math.min(hi, Math.max(lo, offset));
  };
  return { scale: zoom.scale, dx: span(zoom.dx, field.width), dy: span(zoom.dy, field.height) };
}

/**
 * Zoom by a factor about a point on the screen: the field point under the
 * pivot is still under it afterwards, unless keeping the field on screen
 * moves it, which is the one case the pivot gives way.
 */
export function zoomAbout(zoom: Zoom, factor: number, pivot: { x: number; y: number }, field: Viewport): Zoom {
  const scale = clampScale(zoom.scale * (Number.isFinite(factor) && factor > 0 ? factor : 1));
  const f = scale / zoom.scale;
  const next = { scale, dx: pivot.x - (pivot.x - zoom.dx) * f, dy: pivot.y - (pivot.y - zoom.dy) * f };
  return keepOnScreen(next, field);
}

/** A point of the unzoomed field, where the zoom draws it. */
export function zoomPoint(point: { x: number; y: number }, zoom: Zoom): { x: number; y: number } {
  return { x: point.x * zoom.scale + zoom.dx, y: point.y * zoom.scale + zoom.dy };
}

/** A point on the screen, back in the unzoomed field: the inverse of `zoomPoint`. */
export function unzoomPoint(point: { x: number; y: number }, zoom: Zoom): { x: number; y: number } {
  return { x: (point.x - zoom.dx) / zoom.scale, y: (point.y - zoom.dy) / zoom.scale };
}

/**
 * A projection as the zoom draws it. `visible` is worked out again against
 * the field's edges with `project()`'s own rule, because a card zoomed past
 * the side is not visible and one zoomed out onto the field is.
 */
export function applyZoom(p: Projection, zoom: Zoom, field: Viewport): Projection {
  if (isIdentity(zoom)) return p;
  const x = p.x * zoom.scale + zoom.dx;
  const y = p.y * zoom.scale + zoom.dy;
  const scale = p.scale * zoom.scale;
  const half = (CARD_BOX.width / 2) * scale;
  const visible = Math.abs(p.phi) < VISIBLE_HALF_ANGLE && x + half > 0 && x - half < field.width;
  return { ...p, x, y, scale, visible };
}

/**
 * The factor a wheel event asks for. A negative `deltaY` zooms in, and the same
 * delta the other way is its exact inverse. `deltaMode` 1 is lines and 2 is
 * pages; both are converted to pixels first.
 */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean, pageHeight = 800): number {
  const px = deltaMode === 1 ? deltaY * LINE_PX : deltaMode === 2 ? deltaY * pageHeight : deltaY;
  return Math.exp(-px * (ctrlKey ? PINCH_RATE : WHEEL_RATE));
}
