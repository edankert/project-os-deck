/**
 * The sidecar for a workspace: found if one is already running, started if not.
 *
 * Reuse comes first because of RISK-0001. The sidecar writes `.cockpit/url`
 * into the repository and the `cockpit` command follows that file, so a second
 * sidecar on one repository silently captures that routing — and Deck and the
 * cockpit are meant to be open together during PHASE-0001, since the first
 * exit criterion is a side-by-side comparison.
 *
 * Deck stops only the sidecars Deck started.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { Workspace } from '../shared/types.js';
import { SidecarClient } from '../shared/sidecar-client.js';

export interface SidecarHandle {
  workspaceId: string;
  base: string;
  /** False when Deck borrowed a sidecar someone else started. */
  ownedByDeck: boolean;
}

interface Record_ extends SidecarHandle {
  process: ChildProcess | null;
  stderrTail: string[];
}

const PORT_RANGE_START = 8900;
const PORT_RANGE_END = 8999;
const READY_TIMEOUT_MS = 15_000;

export class SidecarSupervisor {
  private readonly records = new Map<string, Record_>();
  private readonly python: string;

  constructor(python?: string) {
    this.python = python ?? defaultPython();
  }

  handle(workspaceId: string): SidecarHandle | null {
    const record = this.records.get(workspaceId);
    return record === undefined ? null : { ...record };
  }

  /** Reuse a live sidecar for this workspace, or start one. */
  async resolve(workspace: Workspace): Promise<SidecarHandle> {
    const existing = this.records.get(workspace.id);
    if (existing !== undefined && (await alive(existing.base, workspace.root))) {
      return { ...existing };
    }
    // Same rule as `forget`: a sidecar of ours that is no longer answering is
    // stopped, not simply forgotten.
    if (existing !== undefined) this.forget(workspace.id);

    const borrowed = await this.borrow(workspace);
    if (borrowed !== null) return borrowed;
    return this.start(workspace);
  }

  /** A sidecar someone else started, named by the repository's discovery file. */
  private async borrow(workspace: Workspace): Promise<SidecarHandle | null> {
    const base = discoveryUrl(workspace.root);
    if (base === null) return null;
    if (!(await alive(base, workspace.root))) return null;
    const record: Record_ = {
      workspaceId: workspace.id,
      base,
      ownedByDeck: false,
      process: null,
      stderrTail: [],
    };
    this.records.set(workspace.id, record);
    return { ...record };
  }

  private async start(workspace: Workspace): Promise<SidecarHandle> {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const child = spawn(
      this.python,
      [
        '-m',
        'project_os_cockpit',
        path.join(workspace.root, 'docs'),
        '--port',
        String(port),
        '--bind',
        '127.0.0.1',
        '--no-open',
      ],
      {
        cwd: workspace.root,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const record: Record_ = { workspaceId: workspace.id, base, ownedByDeck: true, process: child, stderrTail: [] };
    // Registered BEFORE the readiness wait, so a quit mid-wait still kills it.
    this.records.set(workspace.id, record);

    child.stderr?.on('data', (chunk: Buffer) => {
      record.stderrTail.push(chunk.toString('utf-8'));
      if (record.stderrTail.length > 50) record.stderrTail.shift();
    });

    let exited = false;
    child.once('exit', () => {
      exited = true;
      if (this.records.get(workspace.id) === record) this.records.delete(workspace.id);
    });
    // An interpreter that is not there raises 'error', not 'exit'. Without this
    // handler that is an unhandled event, which takes the whole main process
    // down instead of telling the person their Python cannot be found.
    child.once('error', (err: Error) => {
      exited = true;
      record.stderrTail.push(`could not start ${this.python}: ${err.message}\n`);
      if (this.records.get(workspace.id) === record) this.records.delete(workspace.id);
    });

    const ready = await waitForHealth(base, workspace.root, () => exited);
    if (!ready) {
      this.stopOne(workspace.id);
      const tail = record.stderrTail.join('').split('\n').slice(-10).join('\n').trim();
      // The interpreter is named, always. The usual cause of this failure is a
      // python that cannot import the sidecar, and a message that does not say
      // which python was used sends the reader to the wrong place. DECK_PYTHON
      // overrides it.
      const which = `using ${this.python}`;
      throw new Error(
        exited
          ? `the sidecar for ${workspace.name} exited before it answered (${which})${tail === '' ? '' : `:\n${tail}`}`
          : `the sidecar for ${workspace.name} did not answer within ${READY_TIMEOUT_MS / 1000}s (${which})${tail === '' ? '' : `:\n${tail}`}`,
      );
    }
    return { ...record };
  }

  /**
   * Drop what we know about a workspace's sidecar without stopping it, so the
   * next resolve looks again. Used when one stops answering: a borrowed
   * sidecar is not ours to kill, and it may simply have been restarted.
   */
  forget(workspaceId: string): void {
    const record = this.records.get(workspaceId);
    if (record === undefined) return;
    if (record.ownedByDeck) {
      // Ours, and it stopped answering. Dropping the handle would leave the
      // process running with nothing holding it: `stopAll` at quit iterates
      // what is in this map, so a forgotten child outlives Deck.
      this.stopOne(workspaceId);
      return;
    }
    this.records.delete(workspaceId);
  }

  stopOne(workspaceId: string): void {
    const record = this.records.get(workspaceId);
    if (record === undefined) return;
    this.records.delete(workspaceId);
    if (!record.ownedByDeck || record.process === null) return;
    const child = record.process;
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    timer.unref?.();
    child.once('exit', () => clearTimeout(timer));
  }

  stopAll(): void {
    for (const id of [...this.records.keys()]) this.stopOne(id);
  }
}

/**
 * The address in a repository's `.cockpit/url`, or null when there is nothing
 * usable there.
 *
 * The sidecar writes this file when it starts and removes it at exit, but an
 * exit it did not choose leaves the file behind naming a port nobody is
 * listening on. So this says only "there is an address written here"; whether
 * anything is answering, and whether it is serving this repository, is a
 * separate question and a separate check.
 */
export function discoveryUrl(root: string): string | null {
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, '.cockpit', 'url'), 'utf-8');
  } catch {
    return null;
  }
  const base = text.trim();
  if (base === '' || !/^https?:\/\/[^\s]+$/.test(base)) return null;
  return base.replace(/\/+$/, '');
}

/**
 * The interpreter that can import the sidecar.
 *
 * Deck does not vendor the sidecar: it consumes it from the sibling checkout,
 * which in practice means the virtual environment beside this repository. A
 * bare `python3` usually cannot import it, and the resulting failure looks
 * like "the sidecar exited before it answered", which sends a reader to the
 * wrong place entirely.
 */
export function defaultPython(): string {
  const fromEnv = process.env['DECK_PYTHON'];
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv;
  // dist/main -> dist -> desktop -> the repository -> its parent.
  const reposRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const candidate = path.join(reposRoot, 'project-os-cockpit', '.venv', 'bin', 'python3');
  try {
    if (fs.statSync(candidate).isFile()) return candidate;
  } catch {
    // Fall through: a plain python3 that has the package installed is fine too.
  }
  return 'python3';
}

/** The sidecar at this base is running AND serving the workspace we mean. */
async function alive(base: string, root: string): Promise<boolean> {
  try {
    const client = new SidecarClient(base, { timeoutMs: 1500 });
    const health = await client.health();
    if (health.service !== 'project-os-cockpit') return false;
    const identity = await client.identity();
    return path.resolve(identity.root) === path.resolve(root);
  } catch {
    return false;
  }
}

async function waitForHealth(base: string, root: string, hasExited: () => boolean): Promise<boolean> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (hasExited()) return false;
    if (await alive(base, root)) return true;
    await delay(200);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}

/** A port that was free when Deck asked. Deck's own range, not the cockpit's. */
export function freePort(start = PORT_RANGE_START, end = PORT_RANGE_END): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number): void => {
      if (port > end) {
        reject(new Error(`no free port between ${start} and ${end}`));
        return;
      }
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    };
    tryPort(start);
  });
}
