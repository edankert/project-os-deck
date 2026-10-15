/**
 * The overview's back and forward (TASK-0146): the screens a person has
 * visited in this window, as addresses, and where they are among them.
 *
 * It behaves as a browser's history does. Opening a screen after going back
 * drops the screens that were ahead. Going back or forward moves along the
 * list without changing it. Opening the screen already shown adds nothing.
 * Escape is not part of it: Escape goes up a level (ticket to phase, phase to
 * wheel), which is a different thing from going back.
 *
 * Pure, so the overview-screens suite can test it with no window.
 */

/** How many screens a window remembers. Past that, the oldest are forgotten. */
export const TRAIL_LIMIT = 200;

export interface Trail {
  readonly entries: readonly string[];
  /** Index of the screen shown now; -1 before the first. */
  readonly at: number;
}

export const emptyTrail = (): Trail => ({ entries: [], at: -1 });

export const current = (trail: Trail): string | null => trail.entries[trail.at] ?? null;
export const canGoBack = (trail: Trail): boolean => trail.at > 0;
export const canGoForward = (trail: Trail): boolean => trail.at >= 0 && trail.at < trail.entries.length - 1;

/** A screen was opened by a press, a key or an address: it becomes the newest entry. */
export function opened(trail: Trail, address: string): Trail {
  if (current(trail) === address) return trail;
  const entries = [...trail.entries.slice(0, trail.at + 1), address];
  const drop = Math.max(0, entries.length - TRAIL_LIMIT);
  return { entries: entries.slice(drop), at: entries.length - 1 - drop };
}

/** One step back or forward. Returns the trail unchanged when there is nowhere to go. */
export function stepped(trail: Trail, direction: -1 | 1): Trail {
  const at = trail.at + direction;
  if (at < 0 || at >= trail.entries.length) return trail;
  return { entries: trail.entries, at };
}

/** A step back or forward that has asked for its screen and not yet drawn it. */
export interface TravelIntent {
  address: string;
  next: Trail;
}

/**
 * The trail after a screen is drawn (Codex's review of TASK-0146).
 *
 * The draw that paints exactly the address a pending step asked for completes
 * that step. Any other draw (a click that overtook the step, or an address
 * typed in) is an ordinary visit, added after the screen shown, and the
 * pending step is forgotten. `replace` swaps the shown entry for the drawn
 * one, for the same screen redrawn in another colouring.
 */
export function afterDraw(trail: Trail, drawn: string, intent: TravelIntent | null, replace = false): Trail {
  if (intent !== null && intent.address === drawn) return intent.next;
  if (replace && trail.at >= 0) return { entries: trail.entries.map((e, i) => (i === trail.at ? drawn : e)), at: trail.at };
  return opened(trail, drawn);
}
