/**
 * Deck's state, held once, in the main process.
 *
 * Every window subscribes. A change in one window reaches every other window
 * without a reload, which is the whole point: the cockpit keeps this state in
 * `localStorage`, read once when a window starts, so two of its windows never
 * see each other change.
 *
 * The reducer is pure and lives in `shared/store-state.ts`; this class is the
 * transport and the file.
 */
import type { DeckState } from '../shared/types.js';
import { type DeckAction, initialState, normaliseState, reduce } from '../shared/store-state.js';
import { readJsonFile, writeJsonFileAtomic } from './atomic-json.js';

export type Subscriber = (state: DeckState) => void;

export interface StoreOptions {
  file: string;
  /** How long the store waits for changes to settle before writing. */
  writeDelayMs?: number;
}

const DEFAULT_WRITE_DELAY_MS = 250;

export class DeckStore {
  private readonly file: string;
  private readonly writeDelayMs: number;
  private state: DeckState;
  private subscribers = new Set<Subscriber>();
  private timer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(options: StoreOptions) {
    this.file = options.file;
    this.writeDelayMs = options.writeDelayMs ?? DEFAULT_WRITE_DELAY_MS;
    const stored = readJsonFile(this.file);
    // A missing, empty, truncated or wrong-shaped file all mean "defaults".
    this.state = stored === null ? initialState() : normaliseState(stored);
  }

  getState(): DeckState {
    return this.state;
  }

  /**
   * A subscriber is sent the current state at once, so a window never has to
   * ask separately and never renders a default it then has to replace.
   */
  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    try {
      fn(this.state);
    } catch {
      // A window that throws on its first paint is still subscribed, and the
      // other windows are unaffected. Same rule as in dispatch.
    }
    return () => {
      this.subscribers.delete(fn);
    };
  }

  dispatch(action: DeckAction): DeckState {
    const next = reduce(this.state, action);
    if (next === this.state) return this.state;
    this.state = next;
    for (const fn of [...this.subscribers]) {
      try {
        fn(next);
      } catch {
        // A window that throws while rendering must not stop the others.
      }
    }
    this.scheduleWrite();
    return next;
  }

  private scheduleWrite(): void {
    this.dirty = true;
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.writeDelayMs);
    // Never hold the process open for a bookkeeping write.
    this.timer.unref?.();
  }

  /** Write now. Called on quit, and by the debounce timer. */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      writeJsonFileAtomic(this.file, this.state);
    } catch {
      // Losing the layout is a nuisance; refusing to quit over it is worse.
    }
  }

  close(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
    this.subscribers.clear();
  }
}
