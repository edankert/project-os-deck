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
import { sameDirectory } from './paths.js';

export interface SidecarHandle {
  workspaceId: string;
  base: string;
  /** False when Deck borrowed a sidecar someone else started. */
  ownedByDeck: boolean;
}

interface Record_ extends SidecarHandle {
  process: ChildProcess | null;
  stderrTail: string[];
  /**
   * False while the readiness wait is still running.
   *
   * The record is in the map before the sidecar answers, so that a quit
   * mid-wait still kills the child. That has a cost: `sidecarBaseFor` answers
   * with a live-looking address for the whole indexing window, which is ten
   * seconds for a large workspace and can be forty-five. A read arriving in
   * that window is refused by a port nobody is listening on yet, and a
   * connection refusal used to be read as "this sidecar has died", which
   * stopped it (ISS-0011). This flag is what tells the two apart.
   */
  ready: boolean;
}

const PORT_RANGE_START = 8900;
const PORT_RANGE_END = 8999;
/**
 * How long a sidecar has to answer.
 *
 * Long, because indexing is what it is doing: Your Trainer's 2660 notes take
 * about ten seconds before the server listens, measured on 2026-09-07, and a
 * vault in a later phase will be slower. A timeout under that turns a slow
 * start into a failed one.
 */
const READY_TIMEOUT_MS = 45_000;
/** How many ports Deck will try before it gives up on starting a sidecar. */
const START_ATTEMPTS = 4;

/**
 * Whether a sidecar died because the port was taken.
 *
 * Read off what Python printed, because that is where the truth is: the
 * process Deck spawned is the one that tried to bind. `Errno 48` is macOS and
 * `EADDRINUSE` is what node and Linux say.
 */
export function isPortCollision(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return /address already in use/i.test(text) || /EADDRINUSE/.test(text) || /errno 48/i.test(text);
}

export class SidecarSupervisor {
  private readonly records = new Map<string, Record_>();
  /**
   * One resolve in flight per workspace.
   *
   * Two windows now start at once, because a popped-out panel is reopened
   * beside the focus window, and each opens the workspace its state names. Two
   * resolves for one workspace used to fight: the second found the first's
   * child registered but not yet answering, called it a sidecar of ours that
   * had stopped answering, and stopped it. The first was still waiting on that
   * child, so it exited with no output at all (ISS-0010).
   */
  private readonly inFlight = new Map<string, Promise<SidecarHandle>>();
  private readonly python: string;
  /**
   * Set by `stopAll`, and never cleared: Deck is going.
   *
   * `stopAll` runs once, from the quit, and stops what is in the map at that
   * instant. A child spawned AFTER it is held by nobody — not in the array the
   * quit waits on, and there is no second `stopAll` — so it outlives Deck. The
   * window is real rather than theoretical: the port-collision retry spawns
   * exactly such a child, and that retry exists because ISS-0009 happens.
   */
  private stopped = false;

  constructor(python?: string) {
    this.python = python ?? defaultPython();
  }

  handle(workspaceId: string): SidecarHandle | null {
    const record = this.records.get(workspaceId);
    return record === undefined ? null : { ...record };
  }

  /** Reuse a live sidecar for this workspace, or start one. */
  async resolve(workspace: Workspace): Promise<SidecarHandle> {
    // A second caller waits for the first caller's answer rather than racing
    // it. Two windows asking at once is now the normal case, not the odd one.
    const pending = this.inFlight.get(workspace.id);
    if (pending !== undefined) return pending;
    const attempt = this.resolveOnce(workspace);
    this.inFlight.set(workspace.id, attempt);
    try {
      return await attempt;
    } finally {
      this.inFlight.delete(workspace.id);
    }
  }

  private async resolveOnce(workspace: Workspace): Promise<SidecarHandle> {
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
      // Borrowed only after `alive` answered, so there is no window to protect.
      ready: true,
    };
    this.records.set(workspace.id, record);
    return { ...record };
  }

  /**
   * Start a sidecar, and try another port when the one Deck offered turns out
   * not to be free.
   *
   * No probe can settle this on its own. Node sets `SO_REUSEADDR` on every
   * socket it binds and the sidecar's Python server does not, so a port whose
   * previous listener has gone but whose socket is still lingering binds here
   * and is refused there: Deck offers 8901, Python answers `[Errno 48]
   * Address already in use` and exits before it ever serves (ISS-0009). A race
   * with any other process has the same shape. So the answer is not a better
   * probe, it is trying the next port.
   */
  private async start(workspace: Workspace): Promise<SidecarHandle> {
    const tried: number[] = [];
    for (let attempt = 1; attempt <= START_ATTEMPTS; attempt += 1) {
      try {
        return await this.startOnce(workspace, tried);
      } catch (err) {
        const last = attempt === START_ATTEMPTS;
        if (last || !isPortCollision(err)) throw err;
        // Said out loud: a person watching the console should see why Deck
        // took a second run at it rather than wonder about the pause.
        console.log(
          `deck: port ${tried[tried.length - 1] ?? '?'} was taken when the sidecar tried to bind it; trying another`,
        );
      }
    }
    throw new Error(`the sidecar for ${workspace.name} could not find a free port in ${START_ATTEMPTS} attempts`);
  }

  private async startOnce(workspace: Workspace, tried: number[]): Promise<SidecarHandle> {
    if (this.stopped) throw new Error('Deck is shutting down; not starting a sidecar');
    const port = await freePort(PORT_RANGE_START, PORT_RANGE_END, '127.0.0.1', tried);
    tried.push(port);
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

    const record: Record_ = { workspaceId: workspace.id, base, ownedByDeck: true, process: child, stderrTail: [], ready: false };
    // Registered BEFORE the readiness wait, so a quit mid-wait still kills it.
    this.records.set(workspace.id, record);

    // And if the quit happened between the check above and the spawn, this is
    // the only moment anything will ever hold this child.
    if (this.stopped) {
      this.stopOne(workspace.id);
      throw new Error('Deck is shutting down; not starting a sidecar');
    }

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
    record.ready = true;
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
    // A sidecar that has not answered yet is not a sidecar that has died. It
    // belongs to the resolve that is still waiting on it, and that resolve
    // cleans up its own failure. Without this, one read from the served page
    // during a large workspace's indexing killed the sidecar the shell was
    // waiting for, and the person was told the sidecar had exited on its own
    // (ISS-0011).
    if (!record.ready) return;
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

  /** Whether a sidecar for this workspace is started and has not answered yet. */
  isStarting(workspaceId: string): boolean {
    const record = this.records.get(workspaceId);
    return record !== undefined && !record.ready;
  }

  /**
   * Stop everything Deck started, and hand back the children it signalled so
   * the caller can wait for them.
   *
   * The waiting matters at quit. `stopOne`'s escalation to SIGKILL is a
   * three-second `unref`'d timer, which cannot fire once the main process has
   * gone — so a sidecar that is slow on SIGTERM, or ignores it, outlived Deck
   * and kept both the port and the repository's `.cockpit/url` file. Edwin
   * walked TST-0011 on 2026-09-07 and passed it with the remark "I am not sure
   * if it doesn't leave anything running when I quit???"; he was right to
   * doubt it.
   */
  stopAll(): ChildProcess[] {
    this.stopped = true;
    const signalled: ChildProcess[] = [];
    for (const id of [...this.records.keys()]) {
      const record = this.records.get(id);
      const child = record !== undefined && record.ownedByDeck ? record.process : null;
      this.stopOne(id);
      if (child !== null) signalled.push(child);
    }
    return signalled;
  }
}

/**
 * Wait for signalled children to exit, and kill outright whatever is left.
 *
 * Called from the quit, where there is no later moment to escalate in. A
 * process that has not gone when the grace runs out is sent SIGKILL, which
 * nothing can ignore, rather than being left behind.
 */
export function waitForExit(children: ChildProcess[], graceMs = 3000): Promise<void> {
  const pending = children.filter((child) => child.exitCode === null && child.signalCode === null);
  if (pending.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let left = pending.length;
    const timer = setTimeout(() => {
      for (const child of pending) {
        try {
          child.kill('SIGKILL');
        } catch {
          // Already gone between the check and here, which is the good case.
        }
      }
      resolve();
    }, graceMs);
    // NOT unref'd: this timer is the only thing that ends the wait when a
    // child ignores SIGTERM, and the quit is being held open for it.
    const done = (): void => {
      left -= 1;
      if (left === 0) {
        clearTimeout(timer);
        resolve();
      }
    };
    for (const child of pending) child.once('exit', done);
  });
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

/**
 * The sidecar at this base is running AND serving the workspace we mean.
 *
 * The comparison is between two DIRECTORIES, not two strings. `identity.root`
 * is spelled by whoever launched that sidecar, and on macOS one directory has
 * more than one spelling: the cockpit launched with `/Users/edwin/...` while
 * Deck held `/Users/Edwin/...`, this guard called one directory two, and Deck
 * started a second sidecar on a repository the cockpit was already serving
 * (ISS-0023).
 */
async function alive(base: string, root: string): Promise<boolean> {
  try {
    const client = new SidecarClient(base, { timeoutMs: 1500 });
    const health = await client.health();
    if (health.service !== 'project-os-cockpit') return false;
    const identity = await client.identity();
    return sameDirectory(identity.root, root);
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

/**
 * A pause that is actually awaited, so its timer must NOT be unref'd.
 *
 * An unref'd timer is skipped when nothing else is keeping the event loop
 * alive, and a promise waiting on it then never settles. Under `node --test`
 * that surfaces as "Promise resolution is still pending", with no failing
 * assertion to point at; under Electron the loop never empties, so it hid.
 * The SIGKILL timer in `stopOne` is a different case: nothing awaits it, and
 * it should not hold the process open.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A port that was free when Deck asked, ON THE INTERFACE IT WILL BE USED ON.
 *
 * The interface is a parameter because getting it wrong is silent: a port
 * another process holds on every interface is still free on loopback, so a
 * probe that asks about `127.0.0.1` hands back a port that `0.0.0.0` cannot
 * listen on, and the failure arrives later as EADDRINUSE (ISS-0002).
 *
 * Binding is not the whole question either. A bind on loopback SUCCEEDS while
 * another process holds the same port on every interface, so two Decks both
 * end up listening on 7300 and which one a browser reaches is undetermined
 * (ISS-0004). So a port is offered only when nothing answers a connection to
 * it AND this process can bind it: the first question catches the listener the
 * second one cannot see.
 */
export async function freePort(
  start = PORT_RANGE_START,
  end = PORT_RANGE_END,
  bind = '127.0.0.1',
  skip: readonly number[] = [],
): Promise<number> {
  for (let port = start; port <= end; port += 1) {
    // A port already tried and refused by whoever had to bind it is not
    // offered again, however free it looks from here.
    if (skip.includes(port)) continue;
    if (await answersOn(port)) continue;
    if (await canBind(port, bind)) return port;
  }
  throw new Error(`no free port between ${start} and ${end} on ${bind}`);
}

/** Whether something accepts a connection here, whatever interface it bound. */
function answersOn(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    let settled = false;
    const done = (answer: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(answer);
    };
    socket.setTimeout(250);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function canBind(port: number, bind: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, bind);
  });
}
