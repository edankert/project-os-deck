/**
 * Deck's own index of a workspace's Markdown.
 *
 * The main process walks the notes, parses each one's frontmatter into a
 * record, watches for changes and raises a number when anything moves
 * (FEAT-0011). A view described as a query runs over this; the sidecar stays
 * the authority on obligations, on the rendered note, on the context and on
 * every write.
 *
 * **The revision is the point, not the watching.** A watcher that quietly
 * updates records leaves every open window drawing a list built from records
 * that no longer exist, with nothing to compare. One number per workspace,
 * raised on every accepted change, gives a window a cheap question: is what I
 * drew from still current (TASK-0039, and TASK-0051 is its first consumer).
 *
 * **A change to one file re-reads that file.** A workspace of 2715 notes
 * cannot be re-walked because somebody saved one of them. What cannot be
 * attributed to one file — a directory renamed, an editor writing ten files at
 * once — coalesces into a single rebuild after a short quiet period.
 */
import fs from 'node:fs';
import path from 'node:path';
import { type NoteRecord, type RecordProblem, isExcluded, recordFrom } from '../shared/records.js';

/**
 * How long the index waits for changes to stop arriving before it acts.
 *
 * Named rather than written into the timer, because it is a judgement: long
 * enough that saving ten files is one rebuild, short enough that a person who
 * edits a note and looks at Deck sees the mark before they wonder.
 */
export const QUIET_MS = 150;

/** The file system, injectable so a suite can count reads rather than time them. */
export interface IndexIo {
  readDir: (dir: string) => Array<{ name: string; isDirectory: boolean }>;
  readFile: (file: string) => string;
  mtimeMs: (file: string) => number;
}

export const nodeIo: IndexIo = {
  readDir: (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).map((e) => ({ name: e.name, isDirectory: e.isDirectory() })),
  readFile: (file) => fs.readFileSync(file, 'utf-8'),
  mtimeMs: (file) => fs.statSync(file).mtimeMs,
};

/**
 * Where a workspace's notes live.
 *
 * `<root>/docs` when there is one, which is what Deck already passes when it
 * starts a sidecar, so the two are looking at the same tree. A vault has no
 * `docs/` and its notes are the whole tree; PHASE-0003 decides whether that
 * needs anything more than this fallback.
 */
export function docsRootFor(root: string): string {
  const docs = path.join(root, 'docs');
  try {
    if (fs.statSync(docs).isDirectory()) return docs;
  } catch {
    // No docs directory: the workspace root is the tree.
  }
  return root;
}

/**
 * What Obsidian would put in front of a record's path.
 *
 * `docs` for a project-os repository, whose notes are under `docs/` while the
 * vault root is the repository; empty for a vault, whose notes are the tree.
 */
export function pathPrefixFor(root: string, docsRoot: string): string {
  const relative = path.relative(root, docsRoot);
  return relative === '' || relative.startsWith('..') ? '' : relative.split(path.sep).join('/');
}

export interface WalkResult {
  records: NoteRecord[];
  problems: RecordProblem[];
}

/**
 * Every note under a root, with the directories the sidecar ignores ignored.
 *
 * One unreadable file costs one record and never the walk: a file that will
 * not open, or whose frontmatter will not parse, is reported by path with the
 * reason and the rest of the tree still yields records.
 */
export function walkNotes(root: string, io: IndexIo = nodeIo): WalkResult {
  const records: NoteRecord[] = [];
  const problems: RecordProblem[] = [];
  const visit = (dir: string, prefix: string): void => {
    let entries: Array<{ name: string; isDirectory: boolean }>;
    try {
      entries = io.readDir(dir);
    } catch (err) {
      problems.push({ relPath: prefix === '' ? '.' : prefix, reason: `cannot be listed: ${reason(err)}`, line: null });
      return;
    }
    for (const entry of entries) {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory) {
        // Checked as a PARENT, which is the rule the sidecar uses: a file named
        // `.trash.md` is a note and a directory named `.trash` is not a place.
        if (isExcluded(`${rel}/x`)) continue;
        visit(path.join(dir, entry.name), rel);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      const one = readOne(path.join(dir, entry.name), rel, io);
      if (one.record !== null) records.push(one.record);
      problems.push(...one.problems);
    }
  };
  visit(root, '');
  records.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return { records, problems };
}

function readOne(
  file: string,
  relPath: string,
  io: IndexIo,
): { record: NoteRecord | null; problems: RecordProblem[] } {
  let text: string;
  let mtimeMs: number;
  try {
    text = io.readFile(file);
    mtimeMs = io.mtimeMs(file);
  } catch (err) {
    return { record: null, problems: [{ relPath, reason: `cannot be read: ${reason(err)}`, line: null }] };
  }
  return recordFrom(relPath, text, mtimeMs);
}

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface IndexSnapshot {
  workspaceId: string;
  docsRoot: string;
  /**
   * What sits between the workspace root and a record's path, usually `docs`.
   *
   * Empty for a vault, whose notes are the whole tree. A base file's
   * `inFolder` is written against the vault root, and a record's path is
   * relative to the docs root, so something has to say what is between them
   * (ISS-0027).
   */
  pathPrefix: string;
  /** Rises on every accepted change, and never falls. */
  revision: number;
  /** True until the first walk has finished. */
  building: boolean;
  records: NoteRecord[];
  problems: RecordProblem[];
}

export interface NoteIndexOptions {
  workspaceId: string;
  docsRoot: string;
  /** The docs root's own name under the workspace root; `pathPrefixFor` finds it. */
  pathPrefix?: string;
  io?: IndexIo;
  /** Called after every accepted change, with the new revision. */
  onChange?: (revision: number) => void;
  quietMs?: number;
}

export class NoteIndex {
  readonly workspaceId: string;
  readonly docsRoot: string;
  /** The docs root's own name under the workspace root, or empty. */
  readonly pathPrefix: string;
  private readonly io: IndexIo;
  private readonly onChange: (revision: number) => void;
  private readonly quietMs: number;
  private byPath = new Map<string, NoteRecord>();
  private problems: RecordProblem[] = [];
  private revision = 0;
  private built = false;
  private watcher: fs.FSWatcher | null = null;
  private pending = new Set<string>();
  private rebuildWanted = false;
  private timer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(options: NoteIndexOptions) {
    this.workspaceId = options.workspaceId;
    this.docsRoot = options.docsRoot;
    this.pathPrefix = options.pathPrefix ?? '';
    this.io = options.io ?? nodeIo;
    this.onChange = options.onChange ?? (() => {});
    this.quietMs = options.quietMs ?? QUIET_MS;
  }

  /** Walk the whole tree. Called once at the start, and again after a burst. */
  build(): void {
    const { records, problems } = walkNotes(this.docsRoot, this.io);
    // A rebuild that produces the same records is not a change, and must not
    // raise the number a window reads as "your picture is old" (ISS-0030). The
    // FIRST build always raises: a window drawing from revision 0 has drawn
    // nothing.
    const changed = !this.built || !sameRecords(this.byPath, records);
    this.byPath = new Map(records.map((r) => [r.relPath, r]));
    this.problems = problems;
    this.built = true;
    if (changed) this.raise();
  }

  snapshot(): IndexSnapshot {
    return {
      workspaceId: this.workspaceId,
      docsRoot: this.docsRoot,
      pathPrefix: this.pathPrefix,
      revision: this.revision,
      building: !this.built,
      records: [...this.byPath.values()],
      problems: [...this.problems],
    };
  }

  /**
   * Start watching. A platform that cannot watch recursively is reported as a
   * problem rather than left silently stale, because a stale index that nobody
   * knows is stale is worse than one that says so.
   */
  watch(): void {
    if (this.watcher !== null || this.closed) return;
    try {
      this.watcher = fs.watch(this.docsRoot, { recursive: true }, (_event, name) => {
        this.noticed(typeof name === 'string' ? name : null);
      });
      this.watcher.unref?.();
    } catch (err) {
      this.problems.push({ relPath: '.', reason: `cannot be watched: ${reason(err)}`, line: null });
    }
  }

  /** Feed a change in, as the watcher would. Exported shape, for the suite. */
  noticed(name: string | null): void {
    if (this.closed) return;
    if (name === null) this.rebuildWanted = true;
    else {
      const rel = name.split(path.sep).join('/');
      // A change under a directory the walk does not read is not a change to
      // the notes. Obsidian writes `.obsidian/workspace.json` whenever a pane
      // moves, and re-walking a vault for that — then telling every window its
      // notes had changed — was a banner nobody could act on (ISS-0030).
      if (isExcluded(rel)) return;
      // Anything else that is not one Markdown file is a rebuild: a renamed
      // directory arrives as its own name and says nothing about what moved.
      if (rel.toLowerCase().endsWith('.md')) this.pending.add(rel);
      else this.rebuildWanted = true;
    }
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.settle();
    }, this.quietMs);
    this.timer.unref?.();
  }

  /** Apply what arrived during the quiet period. One rebuild, or N re-reads. */
  settle(): void {
    const paths = [...this.pending];
    const rebuild = this.rebuildWanted;
    this.pending.clear();
    this.rebuildWanted = false;
    if (rebuild) {
      this.build();
      return;
    }
    if (paths.length === 0) return;
    let changed = false;
    for (const rel of paths) {
      // A file's problems are replaced with that file's new problems, so a
      // note somebody fixed stops being reported.
      this.problems = this.problems.filter((p) => p.relPath !== rel);
      const one = readOne(path.join(this.docsRoot, rel), rel, this.io);
      if (one.record === null) {
        // Gone, or unreadable. Either way the old record is not the truth.
        changed = this.byPath.delete(rel) || changed;
        // A file that was deleted is not a problem to report; a file that is
        // there and will not open is.
        if (existsUnder(this.docsRoot, rel)) this.problems.push(...one.problems);
        continue;
      }
      // **Compared, not assumed** (ISS-0041). This path used to set `changed`
      // for every event it was handed, so a save that wrote the same bytes —
      // and an editor's atomic write, which arrives as more than one event —
      // told every window its picture was old. That is ISS-0030's complaint on
      // the one-file route, which ISS-0030's fix never reached: it guarded the
      // full rebuild and this walks past it.
      const before = this.byPath.get(rel);
      const moved =
        before === undefined || before.mtimeMs !== one.record.mtimeMs || before.digest !== one.record.digest;
      this.byPath.set(rel, one.record);
      this.problems.push(...one.problems);
      changed = changed || moved;
    }
    if (changed) this.raise();
  }

  close(): void {
    this.closed = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.watcher?.close();
    this.watcher = null;
  }

  private raise(): void {
    this.revision += 1;
    this.onChange(this.revision);
  }
}

/**
 * Whether a fresh walk found what the index already holds.
 *
 * Compared by path, modification time AND the record's own digest.
 *
 * **The modification time alone was not enough** (ISS-0041). It answers
 * whether the file was written, and Deck needs to know whether what it holds
 * changed — a different question the moment a timestamp is preserved, which
 * `git checkout`, `git stash pop`, a restore and `rsync --times` all do. The
 * index took those changes, stored them, and raised no revision, so every
 * window kept a stale picture it believed was current.
 *
 * The digest is computed once while the note is parsed, so this stays a string
 * comparison per note rather than the walk of every frontmatter value of 2715
 * notes that the first version of this was written to avoid.
 */
function sameRecords(held: Map<string, NoteRecord>, found: NoteRecord[]): boolean {
  if (held.size !== found.length) return false;
  for (const record of found) {
    const existing = held.get(record.relPath);
    if (existing === undefined) return false;
    if (existing.mtimeMs !== record.mtimeMs || existing.digest !== record.digest) return false;
  }
  return true;
}

function existsUnder(root: string, rel: string): boolean {
  try {
    fs.statSync(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}
