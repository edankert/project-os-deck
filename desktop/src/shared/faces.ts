/**
 * What a card shows, READ from the view's description rather than decided here.
 *
 * Every card used to show id, title, type and a status stripe, whatever it
 * held, which is the cockpit's row with rounded corners (TASK-0028). Four
 * faces were then written as branches on a note's TYPE — `if noteType ===
 * 'test'`, `if noteType === 'issue'` — and that is the version this module
 * replaces (TASK-0044).
 *
 * **The branch was wrong in a way that only showed up outside project-os.** A
 * vault's character with a portrait, a page with a number and a chapter that
 * orders its pages all arrived as plain cards, because none of them is one of
 * the four types somebody thought of. A face is now a section of the view's
 * description: a title, a subtitle, an image, a list of fields and a measure,
 * all by property name. A vault type gets a face by writing one.
 *
 * This module holds no note type at all. What it holds is how to READ a face
 * section and how to turn one into the line a person sees.
 */
import type { FaceSection, FaceSpec } from './description.js';
import type { CardModel, Progress } from './types.js';
import { bandFor, isCompleted } from './statuses.js';

export { bandFor, isCompleted };

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
  const done = card.children.filter((c) => isCompleted(c.status)).length;
  const stale = card.children.filter((c) => c.stale).length;
  return { done, total: card.children.length, stale };
}

/** The face spec this card is drawn with: its type's, or the section's default. */
export function specFor(section: FaceSection, card: CardModel): FaceSpec {
  return section.byType[card.noteType] ?? section.default;
}

/**
 * The face a card wears, from the spec the description gave it.
 *
 * A measure the note cannot actually supply falls back to `plain` rather than
 * drawing an empty band: an issue with no severity, a note with no children.
 * That is a property of the DATA, not of the type, so it stays here.
 */
export function faceFor(card: CardModel, section: FaceSection): Face {
  const spec = specFor(section, card);
  switch (spec.measure) {
    case 'progress': {
      const progress = progressOf(card);
      if (progress === null || progress.total === 0) return { kind: 'plain' };
      return { kind: 'progress', done: progress.done, total: progress.total, stale: progress.stale };
    }
    case 'severity':
      return card.severity === null ? { kind: 'plain' } : { kind: 'severity', severity: card.severity };
    case 'verified':
      return { kind: 'verified', lastVerified: card.lastVerified, stale: card.stale };
    default:
      return { kind: 'plain' };
  }
}

/** The line under a card's title, in words a person reads. */
export function faceText(card: CardModel, section: FaceSection): string {
  const face = faceFor(card, section);
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

/**
 * What a card shows beside its title, read off the record by property name.
 *
 * This is what makes a face a DESCRIPTION rather than a shape: a base file
 * naming `note.portrait` as its image, or `role` and `archetype` as its
 * fields, reaches the card without anything here knowing what a character is.
 */
export function fieldsFor(
  spec: FaceSpec,
  record: Record<string, unknown> | null,
): Array<{ property: string; value: string }> {
  if (record === null) return [];
  const out: Array<{ property: string; value: string }> = [];
  for (const property of spec.fields) {
    const value = readProperty(record, property);
    if (value === null) continue;
    out.push({ property, value });
  }
  return out;
}

/**
 * One property of a record, by the name a description uses.
 *
 * `note.x` and a bare `x` are the same frontmatter key — the namespace is how
 * a base file disambiguates, not a second place to look — and `file.name` and
 * `file.path` name the file rather than its frontmatter.
 */
export function readProperty(record: Record<string, unknown>, property: string): string | null {
  const name = property.startsWith('note.') ? property.slice(5) : property;
  const value = record[name];
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length === 0 ? null : value.map((v) => String(v)).join(', ');
  return String(value);
}
