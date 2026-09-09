/**
 * A record: what Deck knows about one note.
 *
 * Deck keeps its own index of a workspace's Markdown (FEAT-0011). Edwin decided
 * that on 2026-09-08 rather than asking the cockpit for a records endpoint:
 * "Decks own index, the Decks application are individual applications/views."
 * A view described as a query needs something to run over, and this is it.
 *
 * **The record holds the frontmatter as written.** Every key the file declares
 * is here under its own name, with its value in the shape the YAML gave it.
 * Nothing is dropped for being unrecognised, because a vault's `world`,
 * `chapter` and `portrait` are exactly what a base file filters on and Deck
 * knows none of them in advance.
 *
 * **Two indexers over one corpus will drift, and the drift has to be a failing
 * test rather than a person noticing that two applications disagree**
 * (RISK-0004). So the normalisation rules here MIRROR the sidecar's, in
 * `project-os-cockpit/src/project_os_cockpit/index.py`, and each one says where
 * its counterpart lives. One difference is deliberate and named below.
 */
import { firstHeading, parseFrontmatter, type YamlProblem } from './yaml.js';

/**
 * Directories whose contents are not notes.
 *
 * Mirrors `EXCLUDED_DIR_NAMES` and `_is_excluded_path` in the sidecar's
 * `index.py`: those four names, plus any directory whose name starts with a
 * dot, and the rule applies to PARENT directories only so a leaf file is never
 * excluded by its own name. `__templates__` is deliberately NOT here — it holds
 * the type-stub notes that a wikilink like `[[feature]]` resolves to, which is
 * Obsidian's own behaviour.
 */
export const EXCLUDED_DIRECTORIES: readonly string[] = ['__bases__', '.obsidian', '.trash', '.git'];

/** Whether a docs-root-relative path lies inside a directory that is not indexed. */
export function isExcluded(relPath: string): boolean {
  const parts = relPath.split('/');
  // Every part but the last: a file called `.trash.md` is a note.
  return parts
    .slice(0, -1)
    .some((part) => EXCLUDED_DIRECTORIES.includes(part) || part.startsWith('.'));
}

/** A template note, which the sidecar's type counts leave out (`_is_template`). */
export function isTemplate(relPath: string): boolean {
  return relPath.startsWith('__templates__/');
}

export interface NoteRecord {
  /** Docs-root-relative, POSIX separators, the way the sidecar writes it. */
  relPath: string;
  /** The file name without its extension, which is what a wikilink usually names. */
  fileName: string;
  /** Milliseconds since the epoch, so a write can say which version it saw. */
  mtimeMs: number;
  /** Every frontmatter key, under its own name, in its own shape. */
  frontmatter: Record<string, unknown>;
  /** The frontmatter `id`, where there is one; otherwise the file name. */
  id: string;
  title: string | null;
  /**
   * The note's types, normalised and lower-cased. More than one when `type:`
   * is a list, which is the one place Deck deliberately differs from the
   * sidecar — see `normaliseTypes`.
   */
  types: string[];
  status: string | null;
  aliases: string[];
}

/** A file the walk could not read, named with the reason. */
export interface RecordProblem {
  relPath: string;
  reason: string;
  line: number | null;
}

/**
 * The types a `type:` value names.
 *
 * A single string is normalised the way the sidecar's `_normalise_type` does
 * it: trim, strip a `[[...]]` wrapper, lower-case. Nothing else — not the
 * `|alias` half of a wikilink, because the sidecar does not strip it either
 * and Deck's answer for a file has to be the sidecar's answer for that file.
 *
 * **A LIST is where Deck deliberately differs.** `_normalise_type` returns
 * nothing at all when the value is not a string, so a note written
 * `type:\n  - "[[Project]]"` is counted under no type by the cockpit and
 * vanishes from its Library view. That is project-os-cockpit#ISS-0279, it is
 * already waiting for PHASE-0003 because it hides the vault's own types, and
 * Deck must not reproduce it: such a note is counted under each of its values.
 */
export function normaliseTypes(raw: unknown): string[] {
  if (typeof raw === 'string') {
    const one = normaliseType(raw);
    return one === null ? [] : [one];
  }
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string') continue;
      const one = normaliseType(entry);
      if (one !== null && !out.includes(one)) out.push(one);
    }
    return out;
  }
  return [];
}

function normaliseType(raw: string): string | null {
  let value = raw.trim();
  if (value === '') return null;
  if (value.startsWith('[[') && value.endsWith(']]')) value = value.slice(2, -2).trim();
  return value.toLowerCase() === '' ? null : value.toLowerCase();
}

/** Mirrors `_normalise_status`: a string, trimmed and lower-cased, or nothing. */
export function normaliseStatus(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value === '' ? null : value;
}

/**
 * What a wikilink points at: `[[Target|shown]]` and `[[Target#section]]` both
 * name `Target`. A value that is not a wikilink comes back unchanged, so this
 * is safe to run over anything a comparison meets.
 */
export function linkTarget(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  let text = value.trim();
  if (text.startsWith('[[') && text.endsWith(']]')) text = text.slice(2, -2);
  const pipe = text.indexOf('|');
  if (pipe !== -1) text = text.slice(0, pipe);
  const hash = text.indexOf('#');
  if (hash !== -1) text = text.slice(0, hash);
  return text.trim();
}

/** Build one record from a file's text. Never throws; problems are returned. */
export function recordFrom(
  relPath: string,
  text: string,
  mtimeMs: number,
): { record: NoteRecord; problems: RecordProblem[] } {
  const parsed = parseFrontmatter(text);
  const fileName = baseName(relPath);
  const fm = parsed.frontmatter;
  const declaredTitle = typeof fm['title'] === 'string' && fm['title'].trim() !== '' ? fm['title'].trim() : null;
  const record: NoteRecord = {
    relPath,
    fileName,
    mtimeMs,
    frontmatter: fm,
    id: typeof fm['id'] === 'string' && fm['id'].trim() !== '' ? fm['id'].trim() : fileName,
    // The sidecar falls back to the body's first `# ` heading, and so does
    // this, so a note with no `title:` is called the same thing in both.
    title: declaredTitle ?? firstHeading(parsed.body),
    types: normaliseTypes(fm['type']),
    status: normaliseStatus(fm['status']),
    aliases: stringList(fm['aliases']),
  };
  return { record, problems: parsed.problems.map((p) => toProblem(relPath, p)) };
}

function toProblem(relPath: string, problem: YamlProblem): RecordProblem {
  const where = problem.text === '' ? '' : `: ${problem.text}`;
  return { relPath, reason: `${problem.construct}${where}`, line: problem.line };
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() === '' ? [] : [value.trim()];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
}

function baseName(relPath: string): string {
  const last = relPath.split('/').pop() ?? relPath;
  return last.replace(/\.md$/i, '');
}

/**
 * How many notes of each type the index holds.
 *
 * Templates are left out, which is what the sidecar's `type_counts` does by
 * default, so the two numbers are about the same set of files. A note with two
 * types counts under both — see `normaliseTypes` for why that is the one
 * deliberate difference.
 */
export function typeCounts(records: NoteRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    if (isTemplate(record.relPath)) continue;
    for (const type of record.types) counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}
