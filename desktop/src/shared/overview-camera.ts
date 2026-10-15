/**
 * The overview's camera: how a screen stands in 3D, and how the mouse moves it
 * (TASK-0156).
 *
 * Edwin, 2026-10-15: "can we make the wheels (and the other lists/trapeziums) a
 * little more 3d, and allow to move them using the middle mouse button and zoom
 * in / out?" Every overview screen stands on a plane the camera looks at. The
 * ring screens (the wheel, re-phasing and the release test) lean back by
 * default; the screens that are mostly text to read (a ticket, a design, a
 * feature's gate) start flat and can still be turned, panned and zoomed.
 *
 * - Middle-button drag turns: across spins the plane, up and down tilts it.
 * - Shift with the middle button pans.
 * - The scroll wheel, or a trackpad pinch, zooms toward the pointer.
 * - Double-click on empty space, or 0, puts it back; + and − zoom.
 *
 * Pure, so the overview-screens suite tests it without a window; the renderer
 * turns a camera into one CSS transform.
 */
import type { ScreenKind } from './overview-scene.js';

export interface Camera {
  /** Degrees the plane leans back, 0 (flat) to 70. */
  tilt: number;
  /** Degrees the plane is turned about its own centre. */
  spin: number;
  /** Pixels the plane is moved, after the turn. */
  panX: number;
  panY: number;
  /** 1 is the scene fitted to the window. */
  zoom: number;
}

export const ZOOM = { min: 0.4, max: 6 } as const;
export const TILT = { min: 0, max: 70 } as const;

/** How each screen stands before anyone moves it. */
const LEAN: Readonly<Record<ScreenKind, number>> = {
  wheel: 26,
  rephase: 26,
  'test-run': 22,
  phase: 10,
  ticket: 0,
  design: 0,
  accept: 0,
};

export function defaultCamera(screen: ScreenKind): Camera {
  return { tilt: LEAN[screen] ?? 0, spin: 0, panX: 0, panY: 0, zoom: 1 };
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** A middle-button drag of (dx, dy) pixels: across spins, up and down tilts. */
export function turned(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, spin: (camera.spin + dx * 0.3) % 360, tilt: clamp(camera.tilt - dy * 0.25, TILT.min, TILT.max) };
}

/** A Shift-middle-button drag: the plane moves with the pointer. */
export function panned(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, panX: camera.panX + dx, panY: camera.panY + dy };
}

/**
 * Zoom by `factor` toward a point (px, py), measured from the centre of the view,
 * so what is under the pointer stays under it on a flat plane.
 */
export function zoomed(camera: Camera, factor: number, px = 0, py = 0): Camera {
  const zoom = clamp(camera.zoom * factor, ZOOM.min, ZOOM.max);
  const k = zoom / camera.zoom;
  return { ...camera, zoom, panX: px - (px - camera.panX) * k, panY: py - (py - camera.panY) * k };
}

/** A scroll wheel's turn as a zoom factor: a notch toward the person zooms out. */
export function wheelFactor(deltaY: number): number {
  return Math.exp(-clamp(deltaY, -240, 240) * 0.0018);
}

/** The camera as one CSS transform, applied about the centre of the view. */
export function cameraTransform(camera: Camera): string {
  const f = (n: number): string => (Math.round(n * 100) / 100).toString();
  return `translate(${f(camera.panX)}px, ${f(camera.panY)}px) rotateX(${f(camera.tilt)}deg) rotateZ(${f(camera.spin)}deg) scale(${f(camera.zoom)})`;
}

export function isDefault(camera: Camera, screen: ScreenKind): boolean {
  const d = defaultCamera(screen);
  return camera.tilt === d.tilt && camera.spin === d.spin && camera.panX === 0 && camera.panY === 0 && camera.zoom === 1;
}
