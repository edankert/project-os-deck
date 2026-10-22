/** A read-only overview, cached by note revision and ledger content (TASK-0140). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildOverview, snapshotFocus } from '../shared/overview-model.js';
import { IMAGE, lastDates } from '../shared/overview-notes.js';
import { cockpitStalenessDays } from '../shared/overview-status.js';
import { readAcceptanceLedger } from './overview-ledger.js';
import type { Focus, OverviewModel } from '../shared/overview-types.js';
import type { Workspace } from '../shared/types.js';
import type { IndexSnapshot } from './note-index.js';

export type OverviewReply =
  | { workspaceId: string; revision: number; building: true }
  | (OverviewModel & { workspaceId: string; revision: number; building: false });

export function repositoryHead(root: string): string {
  try { return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; } // A vault need not be a Git repository.
}

/** Only notes and ledger history affect this provenance flag, not build output. */
export function repositoryDirty(root: string): boolean | undefined {
  try {
    return execFileSync('git', ['--no-optional-locks', '-C', root, 'status', '--porcelain', '-z', '--untracked-files=all', '--',
      ':(glob)**/*.md', ':(glob)**/releases/ledgers/*.json', 'SNAPSHOT.yaml'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).length > 0;
  } catch { return undefined; } // A vault need not be a Git repository.
}

export interface OverviewIo {
  readFile: (file: string) => string;
  head: (root: string) => string;
  now: () => string;
  dirty?: (root: string) => boolean | undefined;
  /** The pictures under the docs folder, each with its date (TASK-0181). Absent, the model lists none. */
  images?: (root: string, docsRoot: string, head: string) => Array<{ path: string; date: string }>;
}

/**
 * Each picture's last commit date, from one `git log` over the docs folder (RISK-0011: about
 * a third of a second on your-trainer's 2,900 commits). Kept per commit, since the dates
 * change only when HEAD does. An empty map when the folder is not in a Git repository.
 */
const datesByHead = new Map<string, Map<string, string>>();
function commitDates(root: string, docsRoot: string, head: string): Map<string, string> {
  const key = `${root}\0${docsRoot}\0${head}`;
  const known = datesByHead.get(key);
  if (known !== undefined) return known;
  let dated = new Map<string, string>();
  try {
    const top = fs.realpathSync(execFileSync('git', ['-C', docsRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    // Paths in the log are the repository's; the model's are the docs folder's. Both through
    // their real paths, since Git names the top by its own (a folder under /var is /private/var).
    const prefix = path.relative(top, fs.realpathSync(docsRoot)).split(path.sep).join('/');
    const log = execFileSync('git', ['-C', top, 'log', '--format=%x00%cs', '--name-only', 'HEAD', '--', prefix === '' ? '.' : prefix], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
    for (const [file, date] of lastDates(log)) {
      if (prefix === '') dated.set(file, date);
      else if (file.startsWith(`${prefix}/`)) dated.set(file.slice(prefix.length + 1), date);
    }
  } catch {
    dated = new Map(); // A vault need not be a Git repository.
  }
  datesByHead.clear(); // One commit's dates per workspace at a time is all a build reads.
  datesByHead.set(key, dated);
  return dated;
}

/**
 * The pictures under the docs folder (TASK-0181), skipping hidden folders and templates.
 * A picture's date is its last commit's; one never committed takes its file's own date.
 */
export function docsImages(root: string, docsRoot: string, head: string): Array<{ path: string; date: string }> {
  const dated = commitDates(root, docsRoot, head);
  const out: Array<{ path: string; date: string }> = [];
  const stack = [''];
  while (stack.length > 0) {
    const rel = stack.pop()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(path.join(docsRoot, rel), { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === '__templates__' || entry.name === 'node_modules') continue;
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile() && IMAGE.test(entry.name)) {
        let date = dated.get(child) ?? '';
        if (date === '') {
          try { date = fs.statSync(path.join(docsRoot, child)).mtime.toISOString().slice(0, 10); } catch { /* gone since it was listed */ }
        }
        out.push({ path: child, date });
      }
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Same local calendar and snapshot setting as the Python cockpit, and the snapshot's
 * focus (TASK-0165). Part of the cache key, so a changed focus rebuilds the model.
 */
export function overviewVerification(root: string, generated: string, readFile = (file: string) => fs.readFileSync(file, 'utf8')): { today: string; stalenessDays: number; focus?: Focus } {
  const now = new Date(generated);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let snapshot = '';
  try { snapshot = readFile(path.join(root, 'SNAPSHOT.yaml')); } catch { /* A plain vault uses the cockpit default. */ }
  const focus = snapshotFocus(snapshot);
  return { today, stalenessDays: cockpitStalenessDays(snapshot), ...(focus === undefined ? {} : { focus }) };
}

export class OverviewService {
  private readonly cached = new Map<string, { revision: number; ledgerRevision: string; verification: string; docsRoot: string; root: string; name: string; reply: OverviewReply }>();
  constructor(private readonly io: OverviewIo = {
    readFile: (file) => fs.readFileSync(file, 'utf8'), head: repositoryHead, dirty: repositoryDirty, now: () => new Date().toISOString(), images: docsImages,
  }) {}

  /** Clear on workspace removal: reopening starts a new index at revision one. */
  forget(workspaceId: string): void { this.cached.delete(workspaceId); }

  read(snapshot: IndexSnapshot, workspace: Pick<Workspace, 'id' | 'root' | 'name'>): OverviewReply {
    if (snapshot.building) {
      this.forget(workspace.id);
      return { workspaceId: workspace.id, revision: snapshot.revision, building: true };
    }
    const ledger = readAcceptanceLedger(snapshot.docsRoot);
    const generated = this.io.now();
    const settings = overviewVerification(workspace.root, generated, this.io.readFile);
    const verification = JSON.stringify(settings);
    const known = this.cached.get(workspace.id);
    if (known?.revision === snapshot.revision && known.ledgerRevision === ledger.revision && known.verification === verification && known.docsRoot === snapshot.docsRoot && known.root === workspace.root && known.name === workspace.name) return known.reply;
    const head = this.io.head(workspace.root);
    const model = buildOverview(snapshot.records, {
      workspace: workspace.name, head, dirty: this.io.dirty?.(workspace.root),
      ...(this.io.images === undefined ? {} : { images: this.io.images(workspace.root, snapshot.docsRoot, head) }),
      acceptanceResults: ledger.results, generated, ...settings,
      readBody: (rel) => {
        try { return this.io.readFile(path.join(snapshot.docsRoot, rel)); }
        catch { return ''; } // A file removed after indexing gets no body until the next revision.
      },
    });
    const reply: OverviewReply = { ...model, workspaceId: workspace.id, revision: snapshot.revision, building: false };
    this.cached.set(workspace.id, { revision: snapshot.revision, ledgerRevision: ledger.revision, verification, docsRoot: snapshot.docsRoot, root: workspace.root, name: workspace.name, reply });
    return reply;
  }
}
