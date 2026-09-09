/**
 * Which workspaces Deck knows, and what kind each one is.
 *
 * A project-os repository is the directory that carries a `SNAPSHOT.yaml`. The
 * kind is returned by discovery because the view provider is chosen by it, so
 * a vault (`.obsidian`) is a new branch here rather than a new concept
 * elsewhere. Vault support itself is PHASE-0003.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Workspace, WorkspaceKind } from '../shared/types.js';
import { readJsonFile, writeJsonFileAtomic } from './atomic-json.js';
import { realDirectory } from './paths.js';

/**
 * Stable per machine, and one id per DIRECTORY rather than per path string:
 * the hash is taken over the spelling the file system uses, so a workspace
 * reached as `/Users/edwin/...` and as `/Users/Edwin/...` is one workspace
 * with one desk and one sidecar (ISS-0023).
 */
export function workspaceIdFor(root: string): string {
  return crypto.createHash('sha1').update(realDirectory(root)).digest('hex').slice(0, 16);
}

/** The kind of workspace at this path, or null when it is neither. */
export function detectKind(root: string): WorkspaceKind | null {
  if (isFile(path.join(root, 'SNAPSHOT.yaml'))) return 'project-os';
  if (isDirectory(path.join(root, '.obsidian'))) return 'vault';
  return null;
}

export function describeWorkspace(root: string): Workspace | null {
  // The spelling the file system uses, not the one the caller typed. A folder
  // picked through Deck's dialog can arrive as `/Users/Edwin/...` while the
  // same directory was reached as `/Users/edwin/...` a moment earlier, and two
  // spellings would give one directory two workspace ids, two saved desks and
  // two sidecars (ISS-0023).
  const resolved = realDirectory(root);
  const kind = detectKind(resolved);
  if (kind === null) return null;
  return { id: workspaceIdFor(resolved), root: resolved, name: nameFor(resolved, kind), kind };
}

function nameFor(root: string, kind: WorkspaceKind): string {
  if (kind === 'project-os') {
    const fromSnapshot = projectNameFromSnapshot(path.join(root, 'SNAPSHOT.yaml'));
    if (fromSnapshot !== null) return fromSnapshot;
  }
  return path.basename(root);
}

/**
 * `project.name` out of SNAPSHOT.yaml without a YAML parser: the file is large
 * and Deck needs one scalar from it. Anything unexpected falls back to the
 * directory name rather than failing to list the workspace.
 */
function projectNameFromSnapshot(file: string): string | null {
  try {
    const text = fs.readFileSync(file, 'utf-8');
    const match = /^project:\s*$([\s\S]*?)^\S/m.exec(text) ?? /^project:\s*$([\s\S]*)/m.exec(text);
    const block = match?.[1] ?? '';
    const name = /^\s+name:\s*["']?(.+?)["']?\s*$/m.exec(block);
    return name?.[1] ?? null;
  } catch {
    return null;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

interface StoredSettings {
  roots: string[];
}

/** The workspaces a person added, remembered between runs. */
export class WorkspaceBook {
  private readonly file: string;
  private roots: string[];

  constructor(file: string) {
    this.file = file;
    const stored = readJsonFile(file);
    this.roots = normaliseRoots(stored);
  }

  /** Recomputed from disk on every read, never trusted from the file. */
  list(): Workspace[] {
    const out: Workspace[] = [];
    for (const root of this.roots) {
      const workspace = describeWorkspace(root);
      if (workspace !== null) out.push(workspace);
    }
    return out;
  }

  get(id: string): Workspace | null {
    return this.list().find((w) => w.id === id) ?? null;
  }

  add(root: string): { ok: true; workspace: Workspace } | { ok: false; reason: string } {
    const resolved = realDirectory(root);
    const workspace = describeWorkspace(resolved);
    if (workspace === null) {
      return { ok: false, reason: `${resolved} carries neither a SNAPSHOT.yaml nor an .obsidian directory` };
    }
    if (!this.roots.includes(resolved)) {
      this.roots = [...this.roots, resolved];
      this.persist();
    }
    return { ok: true, workspace };
  }

  remove(id: string): void {
    const workspace = this.get(id);
    if (workspace === null) return;
    this.roots = this.roots.filter((r) => r !== workspace.root);
    this.persist();
  }

  private persist(): void {
    const value: StoredSettings = { roots: this.roots };
    writeJsonFileAtomic(this.file, value);
  }
}

function normaliseRoots(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  const raw = (value as Record<string, unknown>)['roots'];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && entry !== '') {
      const resolved = realDirectory(entry);
      if (!out.includes(resolved)) out.push(resolved);
    }
  }
  return out;
}
