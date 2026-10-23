/** Remembered window geometry, per window and with the display it was on. */
import type { SavedBounds } from './window-placement.js';
import { readJsonFile, writeJsonFileAtomic } from './atomic-json.js';

export class WindowBook {
  private readonly file: string;
  private bounds: Record<string, SavedBounds>;

  constructor(file: string) {
    this.file = file;
    this.bounds = normalise(readJsonFile(file));
  }

  get(key: string): SavedBounds | null {
    return this.bounds[key] ?? null;
  }

  set(key: string, value: SavedBounds): void {
    this.bounds = { ...this.bounds, [key]: value };
    try {
      writeJsonFileAtomic(this.file, this.bounds);
    } catch {
      // Geometry is a convenience; never fail a window over it.
    }
  }
}

function normalise(value: unknown): Record<string, SavedBounds> {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, SavedBounds> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const nums = ['x', 'y', 'width', 'height', 'displayId'].every(
      (k) => typeof r[k] === 'number' && Number.isFinite(r[k]),
    );
    if (!nums) continue;
    out[key] = {
      x: r['x'] as number,
      y: r['y'] as number,
      width: r['width'] as number,
      height: r['height'] as number,
      displayId: r['displayId'] as number,
    };
  }
  return out;
}
