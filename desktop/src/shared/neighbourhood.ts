/**
 * A note's neighbourhood, read once per state of the workspace, and what
 * several held notes share (TASK-0036, TASK-0037, TASK-0056).
 *
 * Lifting a note and reaching for one both need the same answer: what it
 * links to and what links to it. The sidecar gives it per note, so the answer
 * is cached per note per INDEX REVISION, the number Deck's own index raises
 * whenever a note changes on disk. A second reach for the same note in the
 * same state of the workspace asks nothing; a changed workspace asks again.
 */
import type { NoteContext } from './sidecar-client.js';
import { neighboursOf } from './sidecar-client.js';

/** How long the pointer rests on a card before Deck reaches for it (TASK-0056). */
export const REACH_REST_MS = 450;
/** How long a finger presses a card on a tablet before Deck reaches for it. */
export const REACH_HOLD_MS = 500;

export class ContextCache {
  private readonly answers = new Map<string, NoteContext>();
  private readonly pending = new Map<string, Promise<NoteContext>>();
  /** How many requests reached the sidecar, for the check that a second reach asks nothing. */
  requests = 0;
  private readonly fetcher: (workspaceId: string, noteId: string) => Promise<NoteContext>;

  constructor(fetcher: (workspaceId: string, noteId: string) => Promise<NoteContext>) {
    this.fetcher = fetcher;
  }

  static key(workspaceId: string, noteId: string, revision: number): string {
    return `${workspaceId} ${revision} ${noteId}`;
  }

  /** The answer if Deck already has it for this state of the workspace. */
  peek(workspaceId: string, noteId: string, revision: number): NoteContext | undefined {
    return this.answers.get(ContextCache.key(workspaceId, noteId, revision));
  }

  /**
   * The answer, asking the sidecar at most once per note per revision, even
   * when a reach and a lift ask at the same moment.
   */
  get(workspaceId: string, noteId: string, revision: number): Promise<NoteContext> {
    const key = ContextCache.key(workspaceId, noteId, revision);
    const known = this.answers.get(key);
    if (known !== undefined) return Promise.resolve(known);
    const waiting = this.pending.get(key);
    if (waiting !== undefined) return waiting;
    this.requests += 1;
    const asked = this.fetcher(workspaceId, noteId).then(
      (answer) => {
        this.pending.delete(key);
        this.answers.set(key, answer);
        return answer;
      },
      (err: unknown) => {
        this.pending.delete(key);
        throw err;
      },
    );
    this.pending.set(key, asked);
    return asked;
  }

  /** Drop every answer from an older revision. Called when the index moves on. */
  forgetBefore(revision: number): void {
    for (const key of [...this.answers.keys()]) {
      const at = Number(key.split(' ')[1]);
      if (at < revision) this.answers.delete(key);
    }
  }
}

/** Every note joined to any held note, without the held notes themselves. */
export function joinedTo(held: readonly string[], contexts: ReadonlyMap<string, NoteContext>): Set<string> {
  const heldSet = new Set(held);
  const out = new Set<string>();
  for (const id of held) {
    const context = contexts.get(id);
    if (context === undefined) continue;
    for (const item of neighboursOf(context)) {
      if (!heldSet.has(item.id)) out.add(item.id);
    }
  }
  return out;
}

/**
 * What the held notes share: every note joined to two or more of them, with
 * how many (TASK-0037).
 *
 * Three issues on the desk: which feature do they all touch. No whole graph
 * is needed: the intersection of the contexts already fetched is the answer.
 * A held note is not counted, because it is on the desk rather than in the
 * field, and the mark belongs to field cards.
 */
export function sharedAmong(held: readonly string[], contexts: ReadonlyMap<string, NoteContext>): Map<string, number> {
  const heldSet = new Set(held);
  const counts = new Map<string, number>();
  for (const id of held) {
    const context = contexts.get(id);
    if (context === undefined) continue;
    for (const item of neighboursOf(context)) {
      if (heldSet.has(item.id)) continue;
      counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    }
  }
  for (const [id, n] of [...counts]) if (n < 2) counts.delete(id);
  return counts;
}
