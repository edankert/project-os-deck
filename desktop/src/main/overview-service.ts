/** A read-only overview, cached by note revision and ledger content (TASK-0140). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildOverview, snapshotFocus } from '../shared/overview-model.js';
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
    readFile: (file) => fs.readFileSync(file, 'utf8'), head: repositoryHead, dirty: repositoryDirty, now: () => new Date().toISOString(),
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
    const model = buildOverview(snapshot.records, {
      workspace: workspace.name, head: this.io.head(workspace.root), dirty: this.io.dirty?.(workspace.root),
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
