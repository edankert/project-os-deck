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
 * - Middle-button drag turns: across spins the plane, up and down tilts it. The
 *   near edge of the plane moves the way the hand moves, wherever the drag
 *   starts, as three.js's orbit camera does (TASK-0162).
 * - Shift with the middle button pans, until the picture's centre would leave
 *   the window.
 * - The scroll wheel, or a trackpad pinch, zooms toward the pointer.
 * - Home puts it back, as do the Home and 0 keys, Escape once it has moved, and
 *   a double-click on empty space; + and − zoom. Three views stand beside Home:
 *   from above, leaning and from the side.
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

export const ZOOM = { min: 0.6, max: 4 } as const;
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

/**
 * A middle-button drag of (dx, dy) pixels: across spins, up and down tilts.
 *
 * The plane leans back, so its near edge is the bottom of the screen. A
 * clockwise turn moves that edge to the left; so a drag to the right turns it
 * anticlockwise, and the part nearest the person goes where the hand goes
 * (Edwin, 2026-10-16: it "seems to now and again move opposite to the mouse").
 * Dragging down tilts it toward flat, which moves the near edge down too.
 */
export function turned(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, spin: (camera.spin - dx * 0.3) % 360, tilt: clamp(camera.tilt - dy * 0.25, TILT.min, TILT.max) };
}

/**
 * A Shift-middle-button drag: the plane moves with the pointer. With the view's
 * half width and half height it stops where the picture's centre would leave
 * the window, so the picture cannot be lost.
 */
export function panned(camera: Camera, dx: number, dy: number, half?: { w: number; h: number }): Camera {
  return withinView({ ...camera, panX: camera.panX + dx, panY: camera.panY + dy }, half);
}

/** The camera with its pan held inside a view of half size `half`; unchanged without one. */
export function withinView(camera: Camera, half?: { w: number; h: number }): Camera {
  if (half === undefined || !(half.w > 0) || !(half.h > 0)) return camera;
  return { ...camera, panX: clamp(camera.panX, -half.w, half.w), panY: clamp(camera.panY, -half.h, half.h) };
}

/** The three views beside Home. */
export type View = 'above' | 'leaning' | 'side';
export const VIEWS: readonly View[] = ['above', 'leaning', 'side'];
export const VIEW_WORD: Readonly<Record<View, string>> = { above: 'From above', leaning: 'Leaning', side: 'From the side' };

/**
 * A screen seen from one of the three views: flat, leaning as the ring
 * screens start, or nearly edge on. Each keeps the turn and the zoom the
 * person chose, and puts the picture back in the middle.
 */
export function viewed(camera: Camera, screen: ScreenKind, view: View): Camera {
  // Leaning is where the ring screens start, on every screen, as its callout says.
  const tilt = view === 'above' ? 0 : view === 'side' ? 68 : Math.max(LEAN[screen] ?? 0, LEAN.wheel);
  return { ...camera, tilt, panX: 0, panY: 0 };
}

/**
 * Zoom by `factor` toward a point (px, py), measured from the centre of the view,
 * so what is under the pointer stays under it on a flat plane.
 */
export function zoomed(camera: Camera, factor: number, px = 0, py = 0, half?: { w: number; h: number }): Camera {
  const zoom = clamp(camera.zoom * factor, ZOOM.min, ZOOM.max);
  const k = zoom / camera.zoom;
  return withinView({ ...camera, zoom, panX: px - (px - camera.panX) * k, panY: py - (py - camera.panY) * k }, half);
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

/** Whether the camera stands where the screen starts; Home is shown only when it does not. */
export function isDefault(camera: Camera, screen: ScreenKind): boolean {
  const d = defaultCamera(screen);
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.01;
  const spin = ((camera.spin % 360) + 360) % 360;
  return near(camera.tilt, d.tilt) && (near(spin, 0) || near(spin, 360)) && near(camera.panX, 0) && near(camera.panY, 0) && near(camera.zoom, 1);
}
