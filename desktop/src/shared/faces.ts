/**
 * What a card shows, decided from the note rather than from its element.
 *
 * Every card used to show id, title, type and a status stripe, whatever it
 * held, which is the cockpit's row with rounded corners (TASK-0028). A phase
 * or a feature has work inside it, an issue has a severity, and a test has a
 * last walk that can go stale. The decision is a pure function so it can be
 * checked without opening a window; the renderer only paints what comes back.
 */
import type { CardModel, Progress } from './types.js';

const DONE = new Set(['done', 'fixed', 'implemented', 'passing', 'released', 'merged', 'accepted', 'closed', 'retired', 'pass']);
const DOING = new Set(['doing', 'review', 'active', 'draft', 'proposed', 'ready']);

/** The band a status belongs to. Deck defines no vocabulary of its own here. */
export function bandFor(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === '') return 'none';
  if (DONE.has(value)) return 'done';
  if (DOING.has(value)) return 'doing';
  return 'owed';
}

export type Face =
  | { kind: 'progress'; done: number; total: number; stale: number }
  | { kind: 'severity'; severity: string }
  | { kind: 'verified'; lastVerified: string | null; stale: boolean }
  | { kind: 'plain' };

/**
 * How much of what a note holds is finished.
 *
 * Taken from the payload's own count where there is one, which is what the
 * tests view sends per surface, and counted from the children otherwise,
 * which is how a feature knows about its tasks.
 */
export function progressOf(card: CardModel): Progress | null {
  if (card.progress !== null) return card.progress;
  if (card.children.length === 0) return null;
  const done = card.children.filter((c) => bandFor(c.status) === 'done').length;
  const stale = card.children.filter((c) => c.stale).length;
  return { done, total: card.children.length, stale };
}

/**
 * A type Deck has no face for still draws, with what every card has.
 *
 * That is the rule for the Vault phase as much as for today: a vault's own
 * note types arrive without Deck knowing any of them.
 */
export function faceFor(card: CardModel): Face {
  const progress = progressOf(card);
  if (progress !== null && progress.total > 0) {
    return { kind: 'progress', done: progress.done, total: progress.total, stale: progress.stale };
  }
  if (card.noteType === 'test') {
    return { kind: 'verified', lastVerified: card.lastVerified, stale: card.stale };
  }
  if (card.noteType === 'issue' && card.severity !== null) {
    return { kind: 'severity', severity: card.severity };
  }
  return { kind: 'plain' };
}

/** The line under a card's title, in words a person reads. */
export function faceText(card: CardModel): string {
  const face = faceFor(card);
  switch (face.kind) {
    case 'progress':
      return `${face.done} of ${face.total} done`;
    case 'severity':
      return `${face.severity} · ${card.status || 'no status'}`;
    case 'verified':
      if (face.lastVerified === null) return face.stale ? 'never walked · stale' : 'never walked';
      return face.stale ? `walked ${face.lastVerified} · stale` : `walked ${face.lastVerified}`;
    default:
      return `${card.noteType || 'note'} · ${card.status || 'no status'}`;
  }
}
