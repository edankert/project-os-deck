/**
 * Plain shells, owned by Deck's main process (FEAT-0035, TASK-0205; ADR-0009): each a login
 * shell in a folder Deck chose, the workspace's or an agent session's, several at once, every
 * one ended when Deck quits.
 *
 * The pty comes from an injected factory, so the node suites run on a fake one and never load
 * node-pty. node-pty is an optional dependency: where it did not install, `loadPty` answers null
 * and opening a shell says so. A shell is reached through the preload bridge only; the served
 * host has no route to it (RISK-0015).
 */
import fs from 'node:fs';
import { cleanEnvironment } from './agents/claude-provider.js';

/** What Deck needs of a pty: node-pty's own shape, narrowed. */
export interface Pty {
  pid: number;
  onData(fn: (data: string) => void): void;
  onExit(fn: (e: { exitCode: number; signal?: number }) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
}

export type PtyFactory = (file: string, args: string[], options: { cwd: string; cols: number; rows: number; env: NodeJS.ProcessEnv; name: string }) => Pty;

/** node-pty's spawn, or null when it is not installed or will not load here. */
export function loadPty(): PtyFactory | null {
  try {
    const pty = require('node-pty') as { spawn: PtyFactory };
    return (file, args, options) => pty.spawn(file, args, options);
  } catch {
    return null;
  }
}

export interface ShellInfo {
  id: string;
  /** What the tab says: the folder's last part. */
  title: string;
  folder: string;
  /** The agent session it was opened for, if any. */
  session: string | null;
  exited: boolean;
}

export type ShellEvent = { kind: 'data'; id: string; data: string } | { kind: 'exit'; id: string; code: number };

/**
 * The person's login shell: `$SHELL` when it exists, else the first of zsh, bash and sh this machine
 * has. Assuming zsh failed every shell in the Linux container, which has none (TASK-0206's walk).
 */
export function loginShell(env: NodeJS.ProcessEnv = process.env, exists: (file: string) => boolean = fs.existsSync): string {
  if (process.platform === 'win32') return env['ComSpec'] || 'powershell.exe';
  return [env['SHELL'], '/bin/zsh', '/bin/bash', '/bin/sh'].find((f): f is string => typeof f === 'string' && f !== '' && exists(f)) ?? '/bin/sh';
}

/** How much of a shell's latest output Deck keeps, for a window that loads while it runs (TASK-0211). */
export const RECENT_CHARS = 100_000;

/** The tail of a shell's output, cut at a line's start so a reloaded tab does not begin mid-line. */
export function keepRecent(kept: string, data: string, max = RECENT_CHARS): string {
  const all = kept + data;
  if (all.length <= max) return all;
  const cut = all.length - max;
  const line = all.indexOf('\n', cut);
  return line < 0 || line - cut > 4096 ? all.slice(cut) : all.slice(line + 1);
}

export class ShellManager {
  private readonly shells = new Map<string, { info: ShellInfo; pty: Pty; recent: string }>();
  private readonly listeners = new Set<(e: ShellEvent) => void>();
  private next = 1;

  constructor(private readonly factory: PtyFactory | null, private readonly env: NodeJS.ProcessEnv = process.env) {}

  get available(): boolean {
    return this.factory !== null;
  }

  onEvent(fn: (e: ShellEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  list(): ShellInfo[] {
    return [...this.shells.values()].map((s) => ({ ...s.info }));
  }

  /** A shell's latest output, up to `RECENT_CHARS`; empty for a shell Deck does not hold. */
  recent(id: string): string {
    return this.shells.get(id)?.recent ?? '';
  }

  /** A login shell in `folder`, which Deck chose: the workspace's repository or a session's folder. */
  open(folder: string, options: { cols?: number; rows?: number; session?: string | null } = {}): ShellInfo {
    if (this.factory === null) throw new Error('shells are off: node-pty is not installed here (see desktop/README.md)');
    const id = `shell-${this.next++}`;
    const shell = loginShell(this.env);
    const pty = this.factory(shell, process.platform === 'win32' ? [] : ['-l'], {
      cwd: folder, cols: clamp(options.cols ?? 100, 20, 500), rows: clamp(options.rows ?? 30, 5, 200),
      // The shell is the person's, not the cockpit's: Deck's own variables for agents are left out.
      env: { ...cleanEnvironment(this.env), TERM: 'xterm-256color', COLORTERM: 'truecolor' }, name: 'xterm-256color',
    });
    const info: ShellInfo = { id, title: folder.split(/[\\/]/).filter(Boolean).pop() ?? folder, folder, session: options.session ?? null, exited: false };
    const held = { info, pty, recent: '' };
    this.shells.set(id, held);
    pty.onData((data) => {
      held.recent = keepRecent(held.recent, data);
      this.tell({ kind: 'data', id, data });
    });
    pty.onExit((e) => {
      info.exited = true;
      this.tell({ kind: 'exit', id, code: e.exitCode });
    });
    return { ...info };
  }

  write(id: string, data: string): boolean {
    const s = this.shells.get(id);
    if (s === undefined || s.info.exited) return false;
    s.pty.write(data);
    return true;
  }

  resize(id: string, cols: number, rows: number): boolean {
    const s = this.shells.get(id);
    if (s === undefined || s.info.exited) return false;
    s.pty.resize(clamp(cols, 20, 500), clamp(rows, 5, 200));
    return true;
  }

  /** Close one shell: its process is killed by the pid Deck holds, and its tab goes. */
  close(id: string): boolean {
    const s = this.shells.get(id);
    if (s === undefined) return false;
    this.shells.delete(id);
    if (!s.info.exited) {
      try {
        s.pty.kill('SIGHUP');
      } catch {
        // Already gone.
      }
    }
    return true;
  }

  /** Deck is quitting: every shell it opened ends with it. */
  closeAll(): void {
    for (const id of [...this.shells.keys()]) this.close(id);
  }

  private tell(e: ShellEvent): void {
    for (const fn of this.listeners) fn(e);
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : lo)));

/** The most one write may carry; the drawer sends a larger paste in pieces (`piecesOf`). */
export const WRITE_MAX = 65_536;

type Handle = (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void;

/**
 * The shell calls the preload bridge carries. A shell opens in a folder Deck knows, the workspace's
 * repository or an agent session's folder, named by id: a window never sends a path.
 */
export function registerShellCalls(handle: Handle, manager: ShellManager, folderOf: { workspace(id: string): string | null; session(id: string): string | null }): void {
  const shellId = (raw: unknown): string => (typeof raw === 'string' && /^shell-\d{1,6}$/.test(raw) ? raw : '');
  const size = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) ? n : undefined);
  // With `recent`, each shell's latest output too: a window that loads while shells run draws them again (TASK-0211).
  handle('deck:shells:list', (_e, recent) => {
    const shells = manager.list();
    return { available: manager.available, shells, ...(recent === true ? { recent: Object.fromEntries(shells.map((s) => [s.id, manager.recent(s.id)])) } : {}) };
  });
  handle('deck:shells:open', (_e, raw, cols, rows) => {
    const where = (raw ?? {}) as { workspaceId?: unknown; sessionId?: unknown };
    const session = typeof where.sessionId === 'string' ? where.sessionId : null;
    const folder = session !== null ? folderOf.session(session) : typeof where.workspaceId === 'string' ? folderOf.workspace(where.workspaceId) : null;
    if (folder === null) return { ok: false, error: 'a shell opens in a workspace or a session Deck knows' };
    try {
      const c = size(cols);
      const r = size(rows);
      return { ok: true, shell: manager.open(folder, { ...(c !== undefined ? { cols: c } : {}), ...(r !== undefined ? { rows: r } : {}), session }) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  // A larger paste comes in pieces of at most this, from the drawer, in order.
  handle('deck:shells:write', (_e, id, data) => ({ ok: typeof data === 'string' && data.length <= WRITE_MAX && manager.write(shellId(id), data) }));
  handle('deck:shells:resize', (_e, id, cols, rows) => ({ ok: manager.resize(shellId(id), size(cols) ?? 0, size(rows) ?? 0) }));
  handle('deck:shells:close', (_e, id) => ({ ok: manager.close(shellId(id)) }));
}
