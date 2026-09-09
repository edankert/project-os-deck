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
  windows: { role(): Promise<unknown>; openPanel(address: string): Promise<unknown> };
  clipboard: { write(text: string): Promise<unknown>; read(): Promise<unknown> };
  write: { transition(request: unknown): Promise<unknown>; tick(request: unknown): Promise<unknown> };
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

  async openPanel(address: string): Promise<{ ok: boolean; error?: string }> {
    const b = bridge();
    if (b === null || !this.caps.popOutWindows) return { ok: false, error: 'this host has no windows to open' };
    return (await b.windows.openPanel(address)) as { ok: boolean; error?: string };
  }

  async windowRole(): Promise<{ role: string; panel: string | null }> {
    const b = bridge();
    if (b === null) return { role: 'focus', panel: null };
    return (await b.windows.role()) as { role: string; panel: string | null };
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
    verb: 'transition' | 'tick',
    request: Record<string, unknown>,
  ): Promise<WriteResult> {
    const b = bridge();
    if (b === null || !this.caps.write) {
      return { ok: false, error: 'this host does not write' };
    }
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
    this.unsubscribeShared?.();
    this.listeners.clear();
  }
}
