/**
 * The shell drawer (FEAT-0035, TASK-0206; ADR-0009): plain terminals at the bottom of Deck, a tab
 * each, several at once. ⌘ Shells in the header opens and closes it; it keeps its height.
 *
 * Each tab is a frame (`terminal.html`) where xterm.js draws the shell, under a policy of its own
 * that allows the inline styles xterm.js writes; Deck's page keeps its own policy. This module, in
 * Deck's page, is the only thing that reaches a shell: it passes output into the frame and the
 * frame's typing and size out to the main process. On a served page there are no shells
 * (`Host.shells()` is null), and neither the drawer nor its button is made (RISK-0015).
 */
import type { ShellBridge } from './host-bridge.js';
import { NO_TABS, tabWords, tabsAfter, type ShellTab, type TabsAction, type TabsState } from '../shared/shell-tabs.js';

const HEIGHT_KEY = 'deck.shells.height';
const OPEN_KEY = 'deck.shells.open';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== '') e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const stored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A page that cannot store it keeps the drawer as it is for this window.
  }
};

interface Frame {
  frame: HTMLIFrameElement;
  ready: boolean;
  /** Output that came before the frame could take it. */
  waiting: string[];
}

export interface ShellDrawerOptions {
  shells: ShellBridge;
  /** The workspace New shell opens in. */
  workspaceId(): string | null;
  say(message: string, error?: boolean): void;
}

let drawer: ShellDrawer | null = null;

/** Open a shell from elsewhere in Deck, as a session's pane does; false where there is no drawer. */
export function openShell(where: { workspaceId: string } | { sessionId: string }): boolean {
  if (drawer === null) return false;
  void drawer.open(where);
  return true;
}

export const hasShells = (): boolean => drawer !== null;

/** Make the drawer and its button, in the shell only. */
export function initShellDrawer(options: ShellDrawerOptions, button: HTMLButtonElement | null): ShellDrawer {
  drawer ??= new ShellDrawer(options, button);
  return drawer;
}

export class ShellDrawer {
  readonly element: HTMLElement;
  private state: TabsState = NO_TABS;
  private readonly frames = new Map<string, Frame>();
  private readonly tabsRow: HTMLElement;
  private readonly body: HTMLElement;
  private available = true;

  constructor(private readonly options: ShellDrawerOptions, private readonly button: HTMLButtonElement | null) {
    this.element = el('section', 'sh-drawer');
    this.element.setAttribute('aria-label', 'Shells');
    this.element.hidden = true;
    const grip = el('div', 'sh-grip');
    grip.title = 'Drag to make the drawer taller or shorter';
    this.tabsRow = el('div', 'sh-tabs');
    this.body = el('div', 'sh-body');
    this.element.append(grip, this.tabsRow, this.body);
    document.body.appendChild(this.element);
    this.setHeight(Number(stored(HEIGHT_KEY)) || 280);
    this.dragHeight(grip);
    if (button !== null) {
      button.hidden = false;
      button.addEventListener('click', () => this.toggle());
    }
    options.shells.subscribe((raw) => this.onShellEvent(raw as { kind: string; id: string; data?: string; code?: number }));
    window.addEventListener('message', (event) => this.onFrameMessage(event));
    void options.shells.list().then((res) => {
      const r = res as { available?: boolean; shells?: ShellTab[] };
      this.available = r.available !== false;
      // Shells opened before this window, by another of Deck's windows, are not drawn here.
      this.draw();
    });
    if (stored(OPEN_KEY) === 'yes') this.toggle(true);
  }

  get tabs(): TabsState {
    return this.state;
  }

  toggle(force?: boolean): void {
    const open = force ?? this.element.hidden;
    this.element.hidden = !open;
    this.button?.setAttribute('aria-pressed', String(open));
    store(OPEN_KEY, open ? 'yes' : 'no');
    document.body.classList.toggle('sh-open', open);
    if (open) this.draw();
    // The overview ends above the drawer: it lays itself out again on a resize.
    window.dispatchEvent(new Event('resize'));
  }

  /** A new shell: in the workspace's folder, or a session's folder. Opens the drawer on it. */
  async open(where?: { workspaceId: string } | { sessionId: string }): Promise<void> {
    const target = where ?? (this.options.workspaceId() !== null ? { workspaceId: this.options.workspaceId()! } : null);
    if (target === null) {
      this.options.say('open a workspace first: a shell starts in its folder', true);
      return;
    }
    const res = (await this.options.shells.open(target, 100, 24)) as { ok?: boolean; error?: string; shell?: ShellTab };
    if (res?.ok !== true || res.shell === undefined) {
      this.options.say(res?.error ?? 'the shell did not start', true);
      return;
    }
    this.frames.set(res.shell.id, this.makeFrame(res.shell.id));
    this.apply({ kind: 'opened', tab: res.shell });
    this.toggle(true);
  }

  async close(id: string): Promise<void> {
    await this.options.shells.close(id);
    this.frames.get(id)?.frame.remove();
    this.frames.delete(id);
    this.apply({ kind: 'closed', id });
  }

  private apply(action: TabsAction): void {
    this.state = tabsAfter(this.state, action);
    this.draw();
  }

  private makeFrame(id: string): Frame {
    const frame = el('iframe', 'sh-frame');
    frame.src = './terminal.html';
    frame.title = `Shell ${id}`;
    frame.dataset['shell'] = id;
    this.body.appendChild(frame);
    return { frame, ready: false, waiting: [] };
  }

  private draw(): void {
    const s = this.state;
    const row: HTMLElement[] = s.tabs.map((t) => {
      const tab = el('div', `sh-tab${t.id === s.active ? ' is-active' : ''}${t.exited ? ' has-ended' : ''}`);
      tab.dataset['shell'] = t.id;
      const name = el('button', 'sh-tab-name', tabWords(t));
      name.type = 'button';
      name.title = t.folder;
      name.addEventListener('click', () => this.apply({ kind: 'shown', id: t.id }));
      const x = el('button', 'sh-tab-close', '×');
      x.type = 'button';
      x.title = `Close this shell (${t.title})`;
      x.addEventListener('click', () => void this.close(t.id));
      tab.append(name, x);
      return tab;
    });
    const add = el('button', 'sh-new', '+ New shell');
    add.type = 'button';
    add.disabled = !this.available;
    add.title = this.available ? 'A new shell in this workspace\'s folder' : 'Shells are off: node-pty is not installed (see desktop/README.md)';
    add.addEventListener('click', () => void this.open());
    const hide = el('button', 'sh-hide', '▾');
    hide.type = 'button';
    hide.title = 'Hide the drawer (the shells go on running)';
    hide.addEventListener('click', () => this.toggle(false));
    this.tabsRow.replaceChildren(...row, add, hide);
    for (const [id, f] of this.frames) f.frame.hidden = id !== s.active;
    if (s.tabs.length === 0) this.body.dataset['empty'] = this.available ? 'No shells yet. + New shell opens one in this workspace.' : 'Shells are off here: node-pty is not installed.';
    else delete this.body.dataset['empty'];
    const active = s.active === null ? undefined : this.frames.get(s.active);
    if (active?.ready === true) active.frame.contentWindow?.postMessage({ kind: 'focus' }, location.origin);
  }

  private onShellEvent(e: { kind: string; id: string; data?: string; code?: number }): void {
    const f = this.frames.get(e.id);
    if (f === undefined) return;
    if (e.kind === 'data' && typeof e.data === 'string') {
      if (f.ready) f.frame.contentWindow?.postMessage({ kind: 'data', data: e.data }, location.origin);
      else f.waiting.push(e.data);
    } else if (e.kind === 'exit') {
      f.frame.contentWindow?.postMessage({ kind: 'ended', code: e.code ?? 0 }, location.origin);
      this.apply({ kind: 'exited', id: e.id });
    }
  }

  private onFrameMessage(event: MessageEvent): void {
    if (event.origin !== location.origin) return;
    const entry = [...this.frames].find(([, f]) => f.frame.contentWindow === event.source);
    if (entry === undefined) return;
    const [id, f] = entry;
    const m = event.data as { kind?: string; data?: string; cols?: number; rows?: number };
    if (m.kind === 'ready') {
      f.ready = true;
      for (const d of f.waiting.splice(0)) f.frame.contentWindow?.postMessage({ kind: 'data', data: d }, location.origin);
      if (this.state.active === id) f.frame.contentWindow?.postMessage({ kind: 'focus' }, location.origin);
    }
    if ((m.kind === 'ready' || m.kind === 'size') && typeof m.cols === 'number' && typeof m.rows === 'number') void this.options.shells.resize(id, m.cols, m.rows);
    if (m.kind === 'input' && typeof m.data === 'string') void this.options.shells.write(id, m.data);
  }

  private setHeight(h: number): void {
    const height = Math.max(120, Math.min(Math.round(window.innerHeight * 0.8), Math.round(h)));
    this.element.style.height = `${height}px`;
    store(HEIGHT_KEY, String(height));
    if (!this.element.hidden) window.dispatchEvent(new Event('resize'));
  }

  /** Drag the grip to make the drawer taller or shorter; the height is kept. */
  private dragHeight(grip: HTMLElement): void {
    grip.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      grip.setPointerCapture(down.pointerId);
      const start = this.element.getBoundingClientRect().height;
      const y0 = down.clientY;
      const move = (e: PointerEvent): void => this.setHeight(start + (y0 - e.clientY));
      const up = (): void => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }
}
