/**
 * Where a window opens.
 *
 * A pure function of the saved bounds and the displays that are present, so
 * the second exit criterion of PHASE-0001 can be checked without a second
 * monitor. The cockpit's shell keeps one app-wide rectangle with no display
 * identity, so a window saved on a monitor that is later unplugged reopens at
 * coordinates no screen can show. That is the failure this function removes.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: number;
  /** The usable area, which excludes the menu bar and the dock. */
  workArea: Rect;
  primary: boolean;
}

export interface SavedBounds extends Rect {
  displayId: number;
}

export const DEFAULT_SIZE = { width: 1200, height: 820 };
const MIN_SIZE = { width: 520, height: 380 };

export function placeWindow(
  saved: SavedBounds | null,
  displays: DisplayInfo[],
  defaultSize: { width: number; height: number } = DEFAULT_SIZE,
): Rect {
  const primary = displays.find((d) => d.primary) ?? displays[0];
  if (primary === undefined) {
    // No display at all: hand back something sane rather than throw.
    return { x: 0, y: 0, ...defaultSize };
  }
  if (saved !== null) {
    const target = displays.find((d) => d.id === saved.displayId);
    if (target !== undefined && intersects(saved, target.workArea)) {
      return clampInto(saved, target.workArea);
    }
    // The display it was on is gone, or its rectangle no longer touches that
    // display. Keep the size the person chose and put it back on screen.
    return centreIn(primary.workArea, { width: saved.width, height: saved.height });
  }
  return centreIn(primary.workArea, defaultSize);
}

/** Two rectangles share at least one pixel. */
function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Keep the window's size and position, but never off the edge of its display. */
export function clampInto(rect: Rect, area: Rect): Rect {
  const width = Math.max(MIN_SIZE.width, Math.min(rect.width, area.width));
  const height = Math.max(MIN_SIZE.height, Math.min(rect.height, area.height));
  const x = Math.max(area.x, Math.min(rect.x, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(rect.y, area.y + area.height - height));
  return { x, y, width, height };
}

function centreIn(area: Rect, size: { width: number; height: number }): Rect {
  const width = Math.max(MIN_SIZE.width, Math.min(size.width, area.width));
  const height = Math.max(MIN_SIZE.height, Math.min(size.height, area.height));
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height,
  };
}

/**
 * The key a window's bounds are saved under. Per role and panel, so a status
 * satellite and the focus window do not fight over one rectangle.
 */
export function boundsKey(role: string, panel: string | null): string {
  return panel === null ? role : `${role}:${panel}`;
}
