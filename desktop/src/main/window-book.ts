/** Remembered window geometry, per window and with the display it was on. */
import type { SavedBounds } from './window-placement.js';
import { readJsonFile, writeJsonFileAtomic } from './atomic-json.js';
import { tryParseAddress } from '../shared/address.js';

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

/**
 * The panels that were open when Deck last ran.
 *
 * A popped-out window is remembered by its address, which already names the
 * panel it carries, so a restart brings back the same window carrying the same
 * thing rather than an empty duplicate (TASK-0026). An address that no longer
 * parses is dropped on the way in: a saved window is a convenience and never a
 * reason for Deck not to start.
 */
export class PanelBook {
  private readonly file: string;
  private addresses: string[];

  constructor(file: string) {
    this.file = file;
    this.addresses = normaliseAddresses(readJsonFile(file));
  }

  list(): string[] {
    return [...this.addresses];
  }

  add(address: string): void {
    if (this.addresses.includes(address)) return;
    this.write([...this.addresses, address]);
  }

  remove(address: string): void {
    if (!this.addresses.includes(address)) return;
    this.write(this.addresses.filter((a) => a !== address));
  }

  private write(next: string[]): void {
    this.addresses = next;
    try {
      writeJsonFileAtomic(this.file, { addresses: next });
    } catch {
      // A window that has to be popped out again is a small loss; failing the
      // pop-out over it is a larger one.
    }
  }
}

function normaliseAddresses(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  const raw = (value as Record<string, unknown>)['addresses'];
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is string => typeof a === 'string' && tryParseAddress(a).ok);
}
