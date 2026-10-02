/**
 * What joins two notes, in the source's own words (FEAT-0020, TASK-0098).
 *
 * The sidecar says WHICH notes a note is joined to. It does not say what a
 * join means. Deck's own index does, in exactly one case: a link written in a
 * note's frontmatter sits under a key the author chose, and that key is the
 * relationship as the source reports it (`graph.ts`, `GraphEdge.field`).
 *
 * So a relationship here is labelled with that key, verbatim, and with which
 * of the two notes wrote it. Nothing is translated into a nicer word and
 * nothing is inverted: a task whose `parent:` names a feature is shown, on
 * the feature, as "names this in its parent", not as "child", because "child"
 * is a meaning nobody wrote. A link in a note's text has no key and is a
 * plain link with a direction (DES-0003).
 */
import type { GraphEdge } from './graph.js';

export interface Relation {
  /** The frontmatter key the link was written under, or null for a link in the text. */
  field: string | null;
  /** 'out': the document wrote the link; 'in': the other note wrote it. */
  direction: 'out' | 'in';
}

/** Every distinct way two notes are joined, the document's own links first, named ones before plain ones. */
export function relationsBetween(edges: readonly GraphEdge[], documentId: string, otherId: string): Relation[] {
  const seen = new Set<string>();
  const out: Relation[] = [];
  for (const edge of edges) {
    let direction: 'out' | 'in';
    if (edge.source === documentId && edge.target === otherId) direction = 'out';
    else if (edge.source === otherId && edge.target === documentId) direction = 'in';
    else continue;
    const key = `${direction} ${edge.field ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ field: edge.field ?? null, direction });
  }
  const rank = (r: Relation): number => (r.direction === 'out' ? 0 : 2) + (r.field === null ? 1 : 0);
  return out.sort((a, b) => rank(a) - rank(b) || (a.field ?? '').localeCompare(b.field ?? ''));
}

/** The short label a row or a line carries: the keys, or "link" when the source names none. */
export function relationLabel(relations: readonly Relation[]): string {
  const named = [...new Set(relations.filter((r) => r.field !== null).map((r) => r.field as string))];
  return named.length === 0 ? 'link' : named.join(' · ');
}

/** One relation as a sentence, for a screen reader and for the callout on a line. */
export function relationSentence(documentId: string, otherId: string, relation: Relation): string {
  const writer = relation.direction === 'out' ? documentId : otherId;
  const named = relation.direction === 'out' ? otherId : documentId;
  return relation.field === null ? `${writer} links to ${named} in its text` : `${writer} names ${named} in its ${relation.field} field`;
}

/** Every relation between two notes as one sentence. With no edge known, only the direction is said. */
export function relationsSentence(documentId: string, otherId: string, relations: readonly Relation[], fallback: 'out' | 'in' | 'both'): string {
  if (relations.length === 0) {
    return fallback === 'out' ? `${documentId} links to ${otherId}` : fallback === 'in' ? `${otherId} links to ${documentId}` : `${documentId} and ${otherId} link to each other`;
  }
  return relations.map((r) => relationSentence(documentId, otherId, r)).join('; ');
}

/**
 * The keys by which a document's neighbours can be emphasised (FEAT-0022):
 * every frontmatter key that joins the document to at least one of them, with
 * the neighbours each one joins. A neighbour joined only by a link in the
 * text is in none of them, which is the point: it has no stated meaning to
 * emphasise.
 */
export function relationKinds(edges: readonly GraphEdge[], documentId: string, neighbourIds: readonly string[]): Map<string, Set<string>> {
  const neighbours = new Set(neighbourIds);
  const out = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.field === null || edge.field === undefined || edge.target === null) continue;
    const other = edge.source === documentId ? edge.target : edge.target === documentId ? edge.source : null;
    if (other === null || !neighbours.has(other)) continue;
    const set = out.get(edge.field) ?? new Set<string>();
    set.add(other);
    out.set(edge.field, set);
  }
  return new Map([...out].sort((a, b) => a[0].localeCompare(b[0])));
}

/** The neighbours of ONE document that a key picks out, or null when that key joins it to none of them. */
export function pickedOut(edges: readonly GraphEdge[], documentId: string, neighbourIds: readonly string[], kind: string): Set<string> | null {
  return relationKinds(edges, documentId, neighbourIds).get(kind) ?? null;
}

/**
 * What is said when a key is picked out: the count is of the notes joined to
 * the document the key was pressed on, which is named. `count` is null while
 * the workspace's links have not been read, and then no number is said.
 */
export function pickedOutSentence(kind: string, documentId: string, count: number | null): string {
  if (count === null) return `"${kind}" is picked out round ${documentId}; the rest are dimmed and still listed`;
  return `"${kind}": ${count} of the notes joined to ${documentId} ${count === 1 ? 'is' : 'are'} picked out; the rest are dimmed and still listed`;
}
