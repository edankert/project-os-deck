/**
 * What this page can do, and where its data comes from.
 *
 * The renderer runs under two hosts. In the shell a preload bridge is present;
 * over the network it is not. Nothing here tests for Electron or reads a user
 * agent: the presence of the bridge is the question, and the capability set is
 * the answer.
 *
 * Data always travels the same road. Both hosts serve this page from Deck's
 * own HTTP host, so a read is a same-origin request to that host, which
 * proxies it to the workspace's sidecar.
 */
import type { Capabilities, DeckState, Workspace } from '../shared/types.js';
import { type DeckAction, initialState, reduce } from '../shared/store-state.js';
import { SERVED_CAPABILITIES, normaliseCapabilities } from '../shared/capability.js';
import { TABLET_LOCAL_ACTIONS, mergeServed } from '../shared/served-state.js';
import type { WriteVerb } from '../shared/write-client.js';

interface BridgeShape {
  capabilities(): Promise<unknown>;
  workspaces: {
    list(): Promise<unknown>;
    add(): Promise<unknown>;
    remove(id: string): Promise<unknown>;
    open(id: string): Promise<unknown>;
  };
  state: {
    get(): Promise<DeckState>;
    dispatch(action: DeckAction): Promise<DeckState>;
    subscribe(fn: (state: DeckState) => void): () => void;
  };
  clipboard: { write(text: string): Promise<unknown>; read(): Promise<unknown> };
  agents?: AgentBridge;
  shells?: ShellBridge;
  write: Record<WriteVerb, (request: unknown) => Promise<unknown>>;
}

/** Deck's own agent sessions, through the preload bridge (FEAT-0032). */
export interface AgentBridge {
  list(): Promise<unknown>;
  /** The cockpit's own sessions on a workspace, read by the main process (TASK-0199). */
  cockpit?(workspaceId: string): Promise<unknown>;
  /** What Needs you shows beyond the tickets: open requests and git (TASK-0202). */
  needs?(workspaceId: string): Promise<unknown>;
  /** Answer one of the cockpit's requests; the main process holds the shell secret (TASK-0204). */
  cockpitAnswer?(workspaceId: string, approvalId: string, allow: boolean): Promise<unknown>;
  /** Caught up: the cockpit's watermark moved to the digest's time, by the main process (TASK-0203). */
  caughtUp?(workspaceId: string, at: string): Promise<unknown>;
  conversation(id: string): Promise<unknown>;
  start(request: unknown): Promise<unknown>;
  send(id: string, text: string): Promise<unknown>;
  answer(id: string, permission: string, answer: unknown): Promise<unknown>;
  interrupt(id: string): Promise<unknown>;
  stop(id: string): Promise<unknown>;
  subscribe(fn: (change: unknown) => void): () => void;
}

/** The shells the drawer draws (FEAT-0035), in the shell only. */
export interface ShellBridge {
  /** With `recent`, each shell's latest output as well. */
  list(recent?: boolean): Promise<unknown>;
  open(where: { workspaceId: string } | { sessionId: string }, cols: number, rows: number): Promise<unknown>;
  write(id: string, data: string): Promise<unknown>;
  resize(id: string, cols: number, rows: number): Promise<unknown>;
  close(id: string): Promise<unknown>;
  subscribe(fn: (event: unknown) => void): () => void;
}

/** What a write came back as: the sidecar's own words when it refused. */
export interface WriteResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

function bridge(): BridgeShape | null {
  const value = (globalThis as unknown as { deck?: BridgeShape }).deck;
  return value ?? null;
}

export class Host {
  private caps: Capabilities = SERVED_CAPABILITIES;
  private local: DeckState = initialState();
  private listeners = new Set<(state: DeckState) => void>();
  private unsubscribeShared: (() => void) | null = null;
  /**
   * On a served page: the Mac's state as last read, and the tablet's own
   * workspace. What the page draws is the two merged (TASK-0057).
   */
  private remote: DeckState | null = null;
  private own: DeckState = initialState();
  private events: EventSource | null = null;

  async start(): Promise<void> {
    const b = bridge();
    if (b !== null) {
      this.caps = normaliseCapabilities(await b.capabilities());
      this.unsubscribeShared = b.state.subscribe((state) => {
        this.local = state;
        for (const fn of [...this.listeners]) fn(state);
      });
      return;
    }
    const response = await fetch('/deck/capabilities');
    this.caps = normaliseCapabilities(await response.json());
    await this.followTheStore();
  }

  /**
   * Read the Mac's state, then keep reading it.
   *
   * Until TASK-0057 a served page kept a fresh state of its own, so a tablet
   * showed its own desk and never saw a note lifted on the Mac. It now reads
   * `/deck/state` once and subscribes to `/deck/events`, and sends nothing
   * back: the tablet follows and never steers (ADR-0001). A host that has
   * neither route leaves the page on its own state, as it was before.
   */
  private async followTheStore(): Promise<void> {
    try {
      const response = await fetch('/deck/state');
      if (!response.ok) return;
      this.remote = (await response.json()) as DeckState;
      this.recompute();
    } catch {
      return;
    }
    if (typeof EventSource === 'undefined') return;
    const events = new EventSource('/deck/events');
    events.addEventListener('state', (event) => {
      try {
        this.remote = JSON.parse((event as MessageEvent<string>).data) as DeckState;
      } catch {
        return;
      }
      this.recompute();
    });
    this.events = events;
  }

  private recompute(): void {
    if (this.remote === null) return;
    const next = mergeServed(this.remote, this.own);
    this.local = next;
    for (const fn of [...this.listeners]) fn(next);
  }

  /**
   * The session calls, in the shell only (FEAT-0032): null on a served page, which has no
   * bridge, and null wherever the capability says no (RISK-0015).
   */
  agents(): AgentBridge | null {
    const b = bridge();
    return b?.agents !== undefined && this.caps.agents ? b.agents : null;
  }

  /** The shell drawer's calls: the shell's bridge, or null on a served page (FEAT-0035). */
  shells(): ShellBridge | null {
    const b = bridge();
    return b?.shells !== undefined && this.caps.shells ? b.shells : null;
  }

  capabilities(): Capabilities {
    return this.caps;
  }

  isShell(): boolean {
    return bridge() !== null;
  }

  state(): DeckState {
    return this.local;
  }

  onState(fn: (state: DeckState) => void): () => void {
    this.listeners.add(fn);
    fn(this.local);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Shared through the main process where there is one, local where there is not. */
  async dispatch(action: DeckAction): Promise<void> {
    const b = bridge();
    if (b !== null && this.caps.sharedStore) {
      await b.state.dispatch(action);
      return;
    }
    if (this.remote !== null) {
      // A tablet changes only what it keeps for itself. The rest belongs to
      // the Mac, and the tablet does not steer.
      if (!TABLET_LOCAL_ACTIONS.has(action.type)) return;
      // Reduced against what the page DRAWS, so "select the view already
      // shown" stays a no-operation, and the result becomes the tablet's own.
      const next = reduce(this.local, action);
      if (next === this.local) return;
      this.own = next;
      this.recompute();
      return;
    }
    const next = reduce(this.local, action);
    if (next === this.local) return;
    this.local = next;
    for (const fn of [...this.listeners]) fn(next);
  }

  async workspaces(): Promise<Workspace[]> {
    const b = bridge();
    if (b !== null) return (await b.workspaces.list()) as Workspace[];
    const response = await fetch('/deck/workspaces');
    const payload = (await response.json()) as { workspaces?: Workspace[] };
    return payload.workspaces ?? [];
  }

  async addWorkspace(): Promise<{ ok: boolean; reason?: string }> {
    const b = bridge();
    if (b === null) return { ok: false, reason: 'this host cannot add a workspace' };
    return (await b.workspaces.add()) as { ok: boolean; reason?: string };
  }

  async openWorkspace(id: string): Promise<{ ok: boolean; error?: string; borrowed?: boolean }> {
    const b = bridge();
    if (b !== null) return (await b.workspaces.open(id)) as { ok: boolean; error?: string };
    await this.dispatch({ type: 'open-workspace', workspaceId: id });
    return { ok: true };
  }

  async writeClipboard(text: string): Promise<boolean> {
    const b = bridge();
    if (b !== null && this.caps.clipboard) {
      await b.clipboard.write(text);
      return true;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async readClipboard(): Promise<string | null> {
    const b = bridge();
    if (b !== null && this.caps.clipboard) {
      const result = (await b.clipboard.read()) as { text?: string };
      return result.text ?? null;
    }
    return null;
  }

  /**
   * Change a note. Only ever in the shell, and only through the bridge.
   *
   * A served page has no bridge, so this is unreachable there — and the
   * renderer does not offer a verb at all when `write` is false, because a
   * control that is greyed out is a promise that it could work (ADR-0003).
   */
  async write(
    verb: WriteVerb,
    request: Record<string, unknown>,
  ): Promise<WriteResult> {
    const b = bridge();
    if (b === null || !this.caps.write) {
      return { ok: false, error: 'this host does not write' };
    }
    if (typeof b.write[verb] !== 'function') return { ok: false, error: 'this shell does not support that verb' };
    return (await b.write[verb](request)) as WriteResult;
  }

  /** Every read goes through Deck's own host, which proxies it. */
  async read(workspaceId: string, sidecarPath: string): Promise<unknown> {
    const response = await fetch(`/deck/sidecar/${encodeURIComponent(workspaceId)}${sidecarPath}`);
    if (!response.ok) {
      throw new Error(`Deck's host answered ${response.status} for ${sidecarPath}`);
    }
    return (await response.json()) as unknown;
  }

  stop(): void {
    this.events?.close();
    this.unsubscribeShared?.();
    this.listeners.clear();
  }
}
