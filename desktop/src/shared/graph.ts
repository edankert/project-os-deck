/**
 * The whole link graph of a workspace, as one payload (TASK-0001).
 *
 * **Deck's own index answers this, not the sidecar.** TASK-0001 was written on
 * 2026-09-07 as an endpoint in the cockpit, because the sidecar was then the
 * only index Deck had. On 2026-09-08 Edwin decided Deck keeps its OWN index of
 * the workspace's Markdown ("the Decks application are individual
 * applications/views", FEAT-0011), and the whole edge list is a read over
 * exactly that. So the cockpit is not changed, and the rules below mirror the
 * cockpit's `index.py` so a link Deck draws is a link the cockpit resolves.
 *
 * Mirrored from the cockpit, and pinned by TST-0046:
 * - A link is `[[target]]` or `[[target|shown]]`; an embed `![[...]]` is not a link.
 * - In a link-bearing frontmatter key (`parent`, `phase`, `related`, ...), a
 *   bare project-os id is a link too.
 * - A target resolves by note id, then alias, then file name, then title,
 *   then by the id at the front of a drifted slug. The first note to claim a
 *   name keeps it.
 * - A link to itself is not an edge. A template is neither end of one.
 *
 * What Deck adds is the OFFSET of every link in its file, because an edge's
 * callout quotes the sentence that made it, and a note that links to
 * ISS-0209 three times has three different sentences to show.
 */
import { bandFor } from './statuses.js';

/** The cockpit's `WIKILINK_RE`, with the alias half dropped. */
const WIKILINK = /\[\[([^|\]\n]+)(?:\|([^\]\n]+))?\]\]/g;
/** The cockpit's `PROJECT_OS_ID_RE`. */
const PROJECT_OS_ID = /\b(?:FEAT|TASK|REQ|ISS|CHG|ADR|RISK|TST|REL|PHASE|WF|PLAN)-[\w-]+/g;
/** The cockpit's `_ID_PREFIX_RE`: the id at the front of a drifted slug. */
const ID_PREFIX = /^([A-Z]{2,6}-\d{3,4})(?:-|$)/;
/** A cross-repository reference, `project-id#ID` (the cockpit's ADR-0024). */
const CROSS_REPO = /^[a-z0-9][a-z0-9-]*#/;

/** The cockpit's `_LINK_BEARING_FRONTMATTER_FIELDS`. */
export const LINK_BEARING_FIELDS: ReadonlySet<string> = new Set([
  'parent', 'phase', 'scope', 'specifies', 'validates', 'verifies',
  'affects', 'related', 'implements', 'fixes', 'fixed_by',
  'depends', 'blocks', 'tests', 'impacts',
  'previous_release', 'next_release',
  'supersedes', 'superseded_by',
  'causes', 'cause', 'mitigates', 'mitigated_by',
  'references', 'source', 'sources', 'reverts',
  'design',
]);

export interface GraphSource {
  relPath: string;
  fileName: string;
  id: string;
  /** Whether the frontmatter carried an `id`, which is what the id table is keyed on. */
  hasId: boolean;
  title: string | null;
  aliases: string[];
  types: string[];
  status: string | null;
  frontmatter: Record<string, unknown>;
  /** The whole file, frontmatter included, so an offset points into what is on disk. */
  text: string;
}

export interface GraphNode {
  id: string;
  rel: string;
  title: string;
  type: string;
  status: string;
  /** The status band the reader shows, from the cockpit's own table (`statuses.ts`). */
  band: string;
  /** The phase the note belongs to, by id, or null. A phase belongs to itself. */
  phase: string | null;
  /** How many other notes link to this one. */
  inbound: number;
}

export interface GraphEdge {
  source: string;
  /** Null when the link resolved to nothing: a dangling link is a finding, not noise. */
  target: string | null;
  /** What the link was written as, for a dangling one. */
  wrote: string;
  /** Where the link starts in the source file, in UTF-16 code units. */
  offset: number;
  resolved: boolean;
  /** A reference into another repository, which one sidecar cannot resolve. */
  crossRepo: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function isTemplate(relPath: string): boolean {
  return relPath.startsWith('__templates__/');
}

/** Every link in a file, with where it starts. */
export function linksIn(text: string): Array<{ target: string; offset: number }> {
  const out: Array<{ target: string; offset: number }> = [];
  const frontmatterEnd = frontmatterLength(text);
  for (const m of text.matchAll(WIKILINK)) {
    const at = m.index ?? 0;
    // `![[...]]` embeds an image or a note; the cockpit does not count it as a link.
    if (at > 0 && text[at - 1] === '!') continue;
    out.push({ target: (m[1] ?? '').trim(), offset: at });
  }
  // Bare ids, in the frontmatter keys that are meant to point at notes.
  if (frontmatterEnd > 0) {
    let key: string | null = null;
    let lineStart = 0;
    const block = text.slice(0, frontmatterEnd);
    for (const line of block.split('\n')) {
      const top = /^([A-Za-z_][\w-]*):/.exec(line);
      if (top !== null) key = top[1] ?? null;
      if (key !== null && LINK_BEARING_FIELDS.has(key)) {
        const spans = [...line.matchAll(WIKILINK)].map((w) => [w.index ?? 0, (w.index ?? 0) + w[0].length]);
        for (const id of line.matchAll(PROJECT_OS_ID)) {
          const at = id.index ?? 0;
          if (spans.some(([a, b]) => at >= (a as number) && at < (b as number))) continue;
          // The key's own name is not a reference.
          if (top !== null && at < (top[0]?.length ?? 0)) continue;
          out.push({ target: id[0], offset: lineStart + at });
        }
      }
      lineStart += line.length + 1;
    }
  }
  return out.sort((a, b) => a.offset - b.offset);
}

/** The length of a leading `---` frontmatter block, or 0. */
export function frontmatterLength(text: string): number {
  if (!text.startsWith('---')) return 0;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return 0;
  const after = text.indexOf('\n', end + 4);
  return after === -1 ? text.length : after + 1;
}

/**
 * The name tables, in the cockpit's order: id, alias, file name, title, and
 * the id at the front of a drifted slug last. The first claim wins.
 */
export class Resolver {
  private readonly byId = new Map<string, string>();
  private readonly byAlias = new Map<string, string>();
  private readonly byFile = new Map<string, string>();
  private readonly byTitle = new Map<string, string>();

  constructor(sources: readonly GraphSource[]) {
    const claim = (table: Map<string, string>, name: string | null, rel: string): void => {
      if (name === null || name === '' || table.has(name)) return;
      table.set(name, rel);
    };
    for (const s of sources) {
      if (s.hasId) claim(this.byId, s.id, s.relPath);
      for (const alias of s.aliases) claim(this.byAlias, alias, s.relPath);
      claim(this.byFile, s.fileName, s.relPath);
      claim(this.byTitle, s.title, s.relPath);
    }
  }

  resolve(target: string): string | null {
    const t = target.trim();
    if (t === '') return null;
    for (const table of [this.byId, this.byAlias, this.byFile, this.byTitle]) {
      const hit = table.get(t);
      if (hit !== undefined) return hit;
    }
    const prefix = ID_PREFIX.exec(t);
    if (prefix !== null) return this.byId.get(prefix[1] as string) ?? null;
    return null;
  }
}

/** A frontmatter value as the string a link table would see. */
function phaseTarget(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const wrapped = /^\s*\[\[([^|\]]+)/.exec(value);
  return (wrapped?.[1] ?? value).trim();
}

/**
 * A node's key: its id, unless another note claims the same one.
 *
 * Every `PLAN.md` without an `id` takes its file name, `PLAN`, as its id, so
 * a dozen plans would collapse into one node. An id claimed more than once is
 * replaced, for each note claiming it, by the note's path without `.md`.
 */
function keysFor(sources: readonly GraphSource[]): Map<string, string> {
  const claims = new Map<string, number>();
  for (const s of sources) claims.set(s.id, (claims.get(s.id) ?? 0) + 1);
  return new Map(sources.map((s) => [s.relPath, (claims.get(s.id) ?? 0) > 1 ? s.relPath.replace(/\.md$/i, '') : s.id]));
}

export function buildGraph(all: readonly GraphSource[]): Graph {
  const sources = all.filter((s) => !isTemplate(s.relPath));
  const resolver = new Resolver(all);
  const byRel = new Map(sources.map((s) => [s.relPath, s]));
  const key = keysFor(sources);
  const k = (s: GraphSource): string => key.get(s.relPath) ?? s.id;
  const edges: GraphEdge[] = [];
  const inbound = new Map<string, Set<string>>();
  for (const source of sources) {
    for (const link of linksIn(source.text)) {
      const rel = resolver.resolve(link.target);
      const target = rel === null ? null : byRel.get(rel) ?? null;
      if (target !== null && target.relPath === source.relPath) continue;
      if (rel !== null && target === null) continue; // a template: not an end of an edge
      edges.push({
        source: k(source),
        target: target === null ? null : k(target),
        wrote: link.target,
        offset: link.offset,
        resolved: target !== null,
        crossRepo: target === null && CROSS_REPO.test(link.target),
      });
      if (target !== null) {
        const into = inbound.get(k(target)) ?? new Set<string>();
        into.add(k(source));
        inbound.set(k(target), into);
      }
    }
  }
  const nodes: GraphNode[] = sources.map((s) => {
    const type = s.types[0] ?? '';
    const status = s.status ?? '';
    let phase: string | null = null;
    if (type === 'phase') phase = k(s);
    else {
      const wrote = phaseTarget(s.frontmatter['phase']);
      const rel = wrote === null ? null : resolver.resolve(wrote);
      const found = rel === null ? undefined : byRel.get(rel);
      phase = found === undefined ? null : k(found);
    }
    return {
      id: k(s),
      rel: s.relPath,
      title: s.title ?? s.id,
      type,
      status,
      band: bandFor(status),
      phase,
      inbound: inbound.get(k(s))?.size ?? 0,
    };
  });
  return { nodes, edges };
}

/**
 * The sentence a link sits in, for an edge's callout.
 *
 * The line the link is on, cut to the sentence around it when the line is a
 * paragraph. A frontmatter link's line is its `key: value`, which says what
 * kind of link it is.
 */
export function sentenceAt(text: string, offset: number): string {
  if (offset < 0 || offset >= text.length) return '';
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEndAt = text.indexOf('\n', offset);
  const line = text.slice(lineStart, lineEndAt === -1 ? text.length : lineEndAt);
  const at = offset - lineStart;
  let start = 0;
  let end = line.length;
  const boundary = /[.!?](?=\s+[A-Z[*_`"'(])/g;
  for (const m of line.matchAll(boundary)) {
    const pos = (m.index ?? 0) + 1;
    if (pos <= at) start = pos;
    else if (pos > at) {
      end = pos;
      break;
    }
  }
  const sentence = line.slice(start, end).trim().replace(/^[-*]\s+/, '');
  return sentence.length > 400 ? `${sentence.slice(0, 397)}…` : sentence;
}
