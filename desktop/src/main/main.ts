/**
 * Deck's main process: the store, the windows, the sidecars and the host.
 *
 * The window loads its page from Deck's own HTTP host rather than from a file,
 * so the shell and a tablet run identical bytes over one origin (ADR-0001).
 */
import type { ChildProcess } from 'node:child_process';
import { recordGlass } from './smoke-glass.js';
import { GraphService } from './graph-service.js';
import { runMeasure } from './measure.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, app, clipboard, dialog, ipcMain, screen, shell } from 'electron';
import { SHELL_CAPABILITIES, SERVED_CAPABILITIES } from '../shared/capability.js';
import { type DeckAction, isRendererAction } from '../shared/store-state.js';
import type { WindowRole } from '../shared/types.js';
import { addressFor, formatAddress, tryParseAddress } from '../shared/address.js';
import { type Edge, landingBounds } from '../shared/throw.js';
import { deskCardsOf } from '../shared/store-state.js';
import { PANE_HEADER_HEIGHT } from '../shared/panes.js';
import { DeckHost } from './host.js';
import { DeckStore } from './store.js';
import { SidecarSupervisor, freePort, waitForExit } from './sidecar.js';
import { WorkspaceBook } from './workspaces.js';
import { PanelBook, WindowBook } from './window-book.js';
import { type DisplayInfo, type SavedBounds, boundsKey, placeWindow } from './window-placement.js';
import { NoteIndex, docsRootFor, pathPrefixFor, walkNotes } from './note-index.js';
import {
  SidecarWriteClient,
  WriteRefused,
  tickRequestFrom,
  transitionRequestFrom,
} from '../shared/write-client.js';
import { navigationFor } from '../shared/origin.js';
import { defaultWorkspacePath, smokeVerdict } from './smoke-support.js';

// Pinned before anything reads it: Electron derives this from the app name,
// and a later rename would strand the settings written under the old one.
//
// A smoke run gets a directory of its own, so it neither reads nor writes the
// state of a Deck a person is actually using, and so two smoke runs cannot
// affect each other.
app.setPath(
  'userData',
  process.argv.includes('--smoke') || process.argv.includes('--measure')
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'deck-smoke-'))
    : path.join(app.getPath('appData'), 'project-os-deck'),
);

const WEB_ROOT = path.join(__dirname, '..', 'web');
const PRELOAD = path.join(__dirname, '..', 'preload.js');

const store = new DeckStore({ file: path.join(app.getPath('userData'), 'deck-state.json') });
const workspaces = new WorkspaceBook(path.join(app.getPath('userData'), 'deck-workspaces.json'));
const windowBook = new WindowBook(path.join(app.getPath('userData'), 'deck-windows.json'));
const panelBook = new PanelBook(path.join(app.getPath('userData'), 'deck-panels.json'));
const sidecars = new SidecarSupervisor();

/**
 * Deck's own index, one per open workspace.
 *
 * The main process reads the workspace's Markdown itself and keeps a record
 * per note (FEAT-0011). Edwin decided that on 2026-09-08 rather than asking
 * the cockpit for a records endpoint: "Decks own index, the Decks application
 * are individual applications/views." The sidecar stays the authority on
 * obligations, on the rendered note, on the context and on every write.
 */
const indexes = new Map<string, NoteIndex>();

/**
 * Build the index for a workspace, once, and keep it current.
 *
 * The walk is synchronous and a large vault takes a moment, so it runs after
 * the current turn rather than in the middle of opening the workspace: a
 * person waiting for a window should not wait for 2715 files first. Until it
 * finishes, the records path answers "still building" with the revision.
 */
function openIndex(workspace: { id: string; root: string }): void {
  if (indexes.has(workspace.id)) return;
  const docsRoot = docsRootFor(workspace.root);
  const index = new NoteIndex({
    workspaceId: workspace.id,
    docsRoot,
    pathPrefix: pathPrefixFor(workspace.root, docsRoot),
    onChange: (revision) => {
      store.dispatch({ type: 'index-changed', workspaceId: workspace.id, revision });
    },
  });
  indexes.set(workspace.id, index);
  setTimeout(() => {
    if (!indexes.has(workspace.id)) return;
    index.build();
    index.watch();
  }, 0).unref?.();
}

function closeIndexes(): void {
  for (const index of indexes.values()) index.close();
  indexes.clear();
}

/** The orbit's graph and its kept layout, from Deck's own index (TASK-0001, TASK-0002). */
const graphs = new GraphService(app.getPath('userData'));

const host = new DeckHost({
  webRoot: WEB_ROOT,
  // A page this host serves can read. It is not the shell and does not pretend to be.
  capabilities: SERVED_CAPABILITIES,
  listWorkspaces: () => workspaces.list(),
  sidecarBaseFor: (id) => sidecars.handle(id)?.base ?? null,
  onSidecarUnreachable: (id) => sidecars.forget(id),
  isSidecarStarting: (id) => sidecars.isStarting(id),
  indexFor: (id) => indexes.get(id)?.snapshot() ?? null,
  // A tablet follows the Mac's desk by READING it (TASK-0057). Nothing a
  // served page sends can reach the store: this host answers 405 to every
  // method that is not a read, and the page has no bridge.
  state: () => store.getState(),
  subscribeState: (fn) => store.subscribe(fn),
  // `/deck/graph/<id>`, `/deck/graph/<id>/sentence` and `/deck/orbit/<id>`:
  // reads over Deck's own index, answered like every other read on this host.
  extraReads: (pathname, search) => graphs.answer(pathname, search, (id) => indexes.get(id)?.snapshot() ?? null),
});

interface WindowInfo {
  role: WindowRole;
  panel: string | null;
  address: string | null;
  unsubscribe: () => void;
  /** Write this window's geometry now, wherever the quit came from. */
  saveBounds: () => void;
}

const windowInfo = new Map<number, WindowInfo>();
let hostOrigin = '';
/** The port Deck's host is listening on, for a check that must not use loopback. */
let hostPort = 0;
let focusWindowId: number | null = null;

function displays(): DisplayInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    workArea: { x: d.workArea.x, y: d.workArea.y, width: d.workArea.width, height: d.workArea.height },
    primary: d.id === screen.getPrimaryDisplay().id,
  }));
}

/**
 * What a panel is showing, so two windows carrying the same kind of panel get
 * two saved rectangles rather than one (ISS-0015).
 */
function panelSubject(panel: string | null, address: string | null): string | null {
  if (panel === null || address === null) return null;
  const parsed = tryParseAddress(address);
  if (!parsed.ok) return null;
  if (panel === 'desk') return parsed.address.desk;
  if (panel === 'note') return parsed.address.note;
  // The Needs-you strip shows one thing per workspace; there is nothing to
  // tell two of them apart, and two of them is not a case worth keying for.
  return null;
}

/**
 * Hand a link to the person's own browser.
 *
 * A seam rather than a direct call, so the smoke run can DRIVE the guard — a
 * check that opened a real browser would be a check nobody ran twice — and can
 * assert that the link went outward rather than merely that the window stayed.
 */
let openOutside = (url: string): void => {
  void shell.openExternal(url);
};

function createWindow(
  role: WindowRole,
  address: string | null,
  panel: string | null,
  landing: SavedBounds | null = null,
): BrowserWindow {
  const key = boundsKey(role, panel, panelSubject(panel, address));
  // A window a note was thrown into lands where the throw said, placed by the
  // same function that places every window (TASK-0055).
  const bounds = placeWindow(landing ?? windowBook.get(key), displays());
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 520,
    minHeight: 380,
    title: role === 'focus' ? 'Deck' : `Deck — ${panel ?? 'panel'}`,
    show: false,
    backgroundColor: '#12141a',
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });

  const query = new URLSearchParams({ role });
  if (address !== null) query.set('address', address);
  if (panel !== null) query.set('panel', panel);
  void win.loadURL(`${hostOrigin}/?${query.toString()}`);

  // **The bridge belongs to the origin, not to the window** (ISS-0029). A
  // preload runs on every document its `webContents` loads, so without these
  // two guards `window.deck.write.*` — the write channel, since 2026-09-09 —
  // would still be there after the window navigated somewhere Deck does not
  // serve. The reader injects markup the sidecar rendered from a note's own
  // Markdown, and the page's policy stops a script and a form but not a link
  // somebody clicks.
  win.webContents.on('will-navigate', (event, url) => {
    const decision = navigationFor(hostOrigin, url);
    if (decision === 'follow') return;
    event.preventDefault();
    if (decision === 'open-outside') openOutside(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (navigationFor(hostOrigin, url) === 'open-outside') openOutside(url);
    // Never `allow`. A new window would carry this preload with it, and a
    // popped-out panel is opened through `deck:window:open-panel`, which is a
    // route Deck controls.
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => {
    // A satellite appears without taking the keyboard from the window in use.
    if (role === 'focus') win.show();
    else win.showInactive();
  });

  const unsubscribe = store.subscribe((state) => {
    if (!win.isDestroyed()) win.webContents.send('deck:state', state);
  });

  const saveBounds = (): void => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const b = win.getBounds();
    const display = screen.getDisplayMatching(b);
    windowBook.set(key, { ...b, displayId: display.id });
  };

  windowInfo.set(win.id, { role, panel, address, unsubscribe, saveBounds });
  if (role === 'focus') focusWindowId = win.id;
  let timer: NodeJS.Timeout | null = null;
  const debouncedSave = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(saveBounds, 250);
    timer.unref?.();
  };
  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);
  win.on('close', saveBounds);

  win.on('closed', () => {
    // A panel closed ON PURPOSE does not come back at the next start. A panel
    // closed BY THE QUIT does: `app.quit()` closes every window before it
    // leaves, so without the guard a clean quit forgot every panel and only a
    // kill preserved them, which is the wrong way round (ISS-0006).
    if (!shutDown && role === 'satellite' && address !== null) panelBook.remove(address);
    windowInfo.get(win.id)?.unsubscribe();
    windowInfo.delete(win.id);
    if (focusWindowId === win.id) {
      // Promote a satellite rather than leaving Deck with no navigator.
      focusWindowId = null;
      for (const [id, info] of windowInfo) {
        // `!shutDown` for the same reason as the line above: `app.quit()` closes
        // every window, so without it a quit with a panel open promotes that
        // panel and then loads a URL into a window that is being destroyed,
        // against a host `shutdown()` has already closed.
        if (!shutDown && info.role === 'satellite') {
          info.role = 'focus';
          info.panel = null;
          focusWindowId = id;
          // The renderer asks its role once, at boot, and nothing pushes a
          // change: without this the promoted window was CALLED the focus
          // window while still drawing no view buttons, no workspace rail and
          // one panel's worth of the page (ISS-0020). Reloading is the whole
          // fix, because the state lives in the main process and comes back
          // with it; only the pinning is dropped, which is the point.
          const promoted = BrowserWindow.fromId(id);
          if (promoted !== null && !promoted.isDestroyed()) {
            void promoted.loadURL(`${hostOrigin}/?${new URLSearchParams({ role: 'focus' }).toString()}`);
          }
          break;
        }
      }
    }
  });

  return win;
}

type InvokeHandler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => unknown;
const smokeHandlers = new Map<string, InvokeHandler>();

/** Register once, and keep the handler so the smoke run can call it directly. */
function handle(channel: string, handler: InvokeHandler): void {
  smokeHandlers.set(channel, handler);
  ipcMain.handle(channel, handler);
}

function registerIpc(): void {
  handle('deck:capabilities', () => SHELL_CAPABILITIES);

  handle('deck:workspaces:list', () => workspaces.list());

  handle('deck:workspaces:add', async () => {
    const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (picked.canceled || picked.filePaths.length === 0) return { ok: false, reason: 'cancelled' };
    return workspaces.add(picked.filePaths[0] as string);
  });

  handle('deck:workspaces:remove', (_e, id: string) => {
    workspaces.remove(id);
    sidecars.stopOne(id);
    indexes.get(id)?.close();
    indexes.delete(id);
    return { ok: true };
  });

  handle('deck:workspaces:open', async (_e, id: string) => {
    const workspace = workspaces.get(id);
    if (workspace === null) return { ok: false, error: `no workspace with id ${id}` };
    try {
      const handle = await sidecars.resolve(workspace);
      openIndex(workspace);
      store.dispatch({ type: 'open-workspace', workspaceId: id });
      return { ok: true, borrowed: !handle.ownedByDeck };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle('deck:state:get', () => store.getState());
  handle('deck:state:dispatch', (_e, action: DeckAction) => {
    // The rule is stated once, in the shared module, and tested there.
    if (!isRendererAction(action)) return store.getState();
    return store.dispatch(action);
  });
  handle('deck:state:resend', (event) => {
    event.sender.send('deck:state', store.getState());
    return true;
  });

  handle('deck:window:role', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const info = win === null ? undefined : windowInfo.get(win.id);
    return { role: info?.role ?? 'focus', panel: info?.panel ?? null, isFocusWindow: win?.id === focusWindowId };
  });

  handle('deck:window:open-panel', (_e, address: string) => {
    const parsed = tryParseAddress(address);
    if (!parsed.ok) return { ok: false, error: parsed.reason };
    // Remembered by address, which already names the panel: a restart brings
    // the window back carrying the same thing (TASK-0026).
    panelBook.add(address);
    createWindow('satellite', address, parsed.address.panel);
    return { ok: true };
  });

  /**
   * Every other Deck window, where it is and what it carries, for a throw
   * (TASK-0055). The main process is the only thing that knows every window's
   * bounds and the display it is on, so the renderer asks rather than guesses.
   */
  handle('deck:windows:list', (event) => {
    const self = BrowserWindow.fromWebContents(event.sender);
    const all = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    const labelOf = (id: number): string => {
      const index = all.findIndex((d) => d.id === id);
      const display = all[index];
      if (display === undefined) return 'a display';
      if (typeof display.label === 'string' && display.label !== '') return display.label;
      return id === primaryId ? 'the main display' : `display ${index + 1}`;
    };
    const windows = [];
    for (const [id, info] of windowInfo) {
      if (self !== null && id === self.id) continue;
      const win = BrowserWindow.fromId(id);
      if (win === null || win.isDestroyed()) continue;
      const b = win.getBounds();
      const displayId = screen.getDisplayMatching(b).id;
      const carries = info.role === 'focus' ? 'focus' : (info.panel ?? 'focus');
      windows.push({ id, carries, bounds: b, displayId, displayLabel: labelOf(displayId) });
    }
    const selfBounds = self === null ? null : self.getBounds();
    return {
      self: selfBounds === null ? null : { bounds: selfBounds, displayId: screen.getDisplayMatching(selfBounds).id },
      windows,
      displays: all.map((d) => ({ id: d.id, label: labelOf(d.id), workArea: d.workArea })),
      // A served page following the store is a place a note can be thrown to.
      followers: host.followers(),
    };
  });

  /**
   * A note thrown to another window (TASK-0055).
   *
   * Landing is an action the windows already understand. A reader window is
   * re-addressed at the note, the way a pop-out is addressed; a desk panel and
   * the tablet get the note on the desk, which is per workspace and so is the
   * same desk everywhere; a display with no Deck window gets a new reader,
   * placed by the function that places every window.
   */
  handle('deck:window:throw', (_e, request: Record<string, unknown>) => {
    const noteId = typeof request?.['noteId'] === 'string' ? request['noteId'] : '';
    const workspaceId = typeof request?.['workspaceId'] === 'string' ? request['workspaceId'] : '';
    const viewId = typeof request?.['viewId'] === 'string' ? request['viewId'] : '';
    const target = (request?.['target'] ?? {}) as Record<string, unknown>;
    const edge = (['left', 'right', 'top', 'bottom'].includes(String(request?.['edge'])) ? request['edge'] : 'right') as Edge;
    if (noteId === '' || workspaceId === '' || viewId === '') return { ok: false, error: 'a throw names a note, a workspace and a view' };
    let address: string;
    try {
      address = formatAddress(addressFor(workspaceId, viewId, { note: noteId, panel: 'note' }));
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    const onTheDesk = (): void => {
      const cards = deskCardsOf(store.getState(), workspaceId);
      store.dispatch({ type: 'put-on-desk', noteId, x: 16 + (cards.length % 3) * 28, y: 16 + cards.length * PANE_HEADER_HEIGHT });
    };
    if (target['kind'] === 'tablet') {
      onTheDesk();
      return { ok: true, landed: 'tablet' };
    }
    if (target['kind'] === 'window') {
      const id = Number(target['windowId']);
      const info = windowInfo.get(id);
      const win = BrowserWindow.fromId(id);
      if (info === undefined || win === null || win.isDestroyed()) return { ok: false, error: 'that window has closed' };
      if (info.panel === 'desk') {
        onTheDesk();
        return { ok: true, landed: 'desk' };
      }
      if (info.role === 'focus') {
        store.dispatch({ type: 'focus-note', noteId });
        return { ok: true, landed: 'focus' };
      }
      if (info.panel === 'note') {
        if (info.address !== null) panelBook.remove(info.address);
        panelBook.add(address);
        info.address = address;
        const query = new URLSearchParams({ role: 'satellite', address, panel: 'note' });
        void win.loadURL(`${hostOrigin}/?${query.toString()}`);
        return { ok: true, landed: 'reader' };
      }
      return { ok: false, error: 'a Needs-you strip shows what the record says is owed, and a note is not thrown to it' };
    }
    if (target['kind'] === 'display') {
      const display = screen.getAllDisplays().find((d) => d.id === Number(target['displayId']));
      if (display === undefined) return { ok: false, error: 'that display is gone' };
      const bounds = landingBounds(edge, display.workArea);
      panelBook.add(address);
      createWindow('satellite', address, 'note', { ...bounds, displayId: display.id });
      return { ok: true, landed: 'new-reader' };
    }
    return { ok: false, error: 'a throw names where it goes' };
  });

  /**
   * A write, from the renderer, out to the sidecar over loopback.
   *
   * The whole route in one place: the renderer asks the bridge, the bridge
   * sends this message, and this handler makes the request. Nothing about it
   * is forwarded through Deck's HTTP host, which still answers 405 to every
   * method that is not a read — putting a loopback address on a request that
   * came from the network is the hole ADR-0001 closed for the sidecar's own
   * loopback-only reads (ADR-0003).
   *
   * The ACTOR is read from the store here rather than taken as an argument,
   * so there is one answer to who made a write and a window cannot claim a
   * different one.
   */
  const write = async (
    workspaceId: string,
    make: (client: SidecarWriteClient, actor: string) => Promise<unknown>,
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> => {
    const base = sidecars.handle(workspaceId)?.base ?? null;
    if (base === null) return { ok: false, error: `no sidecar is running for the workspace ${workspaceId}` };
    const actor = store.getState().actor;
    if (actor === '') return { ok: false, error: 'Deck has no name to write with; set one before making a change' };
    try {
      return { ok: true, result: await make(new SidecarWriteClient(base), actor) };
    } catch (err) {
      // The sidecar's own sentence, whole. It knows what Deck does not: that
      // the criterion matched two lines, or that the note changed underneath.
      if (err instanceof WriteRefused) return { ok: false, error: err.message };
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  handle('deck:write:transition', async (_e, request: { workspaceId: string } & Record<string, unknown>) =>
    write(String(request?.workspaceId ?? ''), (client, actor) => client.transition(transitionRequestFrom(request, actor))),
  );

  handle('deck:write:tick', async (_e, request: { workspaceId: string } & Record<string, unknown>) =>
    write(String(request?.workspaceId ?? ''), (client, actor) => client.tick(tickRequestFrom(request, actor))),
  );

  handle('deck:clipboard:write', (_e, text: string) => {
    clipboard.writeText(String(text));
    return { ok: true };
  });
  handle('deck:clipboard:read', () => ({ ok: true, text: clipboard.readText() }));
}

async function startHost(): Promise<void> {
  const bindLan = process.argv.includes('--lan');
  const bind = bindLan ? '0.0.0.0' : '127.0.0.1';
  // Probed on the interface the host will bind, not on loopback regardless.
  const port = await freePort(7300, 7399, bind);
  const listening = await host.listen(port, bind);
  hostOrigin = `http://127.0.0.1:${listening.port}`;
  hostPort = listening.port;
  console.log(`deck: serving ${WEB_ROOT} on ${listening.address}:${listening.port}`);
}

/**
 * The name Deck writes with, when nobody has chosen one.
 *
 * Derived from the machine rather than written in a source file: the cockpit
 * hard-codes `user:edwin` in four places, and a second application copying
 * that literal would be unusable by anybody else on the day they opened it
 * (TASK-0048). `user:` is the prefix project-os uses for a person, as against
 * `agent:` for a delegate.
 */
function defaultActor(): string {
  try {
    const name = os.userInfo().username.trim();
    return name === '' ? 'user:unknown' : `user:${name}`;
  } catch {
    // A machine that will not say who is using it is not a reason to refuse
    // to start; it is a reason to say so in the name.
    return 'user:unknown';
  }
}

app.whenReady().then(async () => {
  try {
    registerIpc();
    // Once, and only when nobody has chosen: a name a person typed is theirs.
    if (store.getState().actor === '') store.dispatch({ type: 'set-actor', actor: defaultActor() });
    await startHost();
    if (process.argv.includes('--smoke')) {
      await runSmoke();
      return;
    }
    if (process.argv.includes('--measure')) {
      // TASK-0034's measurement, and FEAT-0001's three numbers. The roots are
      // this repository, the cockpit's (the corpus FEAT-0001 was written
      // against) and Your Trainer (the fleet's largest), unless named.
      const named = argValue('--measure-workspaces');
      const here = defaultWorkspacePath(__dirname);
      const roots = named !== null ? named.split(',') : [here, path.join(here, '..', 'project-os-cockpit'), path.join(here, '..', 'your-trainer')];
      const results = await runMeasure(
        {
          store,
          addWorkspace: (root) => {
            const added = workspaces.add(root);
            return added.ok ? { ok: true, id: added.workspace.id, name: added.workspace.name } : { ok: false, reason: added.reason };
          },
          openWorkspace: async (id) => (await ipcInvoke('deck:workspaces:open', id)) as { ok: boolean; error?: string },
          snapshot: (id) => indexes.get(id)?.snapshot() ?? null,
          graphs,
          origin: hostOrigin,
          createWindow: (role, address, panel) => createWindow(role, address, panel),
          focusApp,
          untilBooted,
        },
        roots,
      );
      console.log(JSON.stringify({ measurements: results }, null, 2));
      shutdown();
      await waitForExit(stopping);
      app.exit(0);
      return;
    }
    createWindow('focus', null, null);
    for (const address of panelBook.list()) {
      const parsed = tryParseAddress(address);
      if (parsed.ok) createWindow('satellite', address, parsed.address.panel);
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow('focus', null, null);
    });
  } catch (err) {
    // Said out loud, and then stop. Without this the failure skips window
    // creation and macOS keeps the application alive with nothing on screen,
    // which reads as an application that does nothing when launched
    // (ISS-0002).
    const message = err instanceof Error ? err.message : String(err);
    console.error(`deck: could not start — ${message}`);
    dialog.showErrorBox('Deck could not start', message);
    shutdown();
    await waitForExit(stopping);
    app.exit(1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Everything Deck has to put back before it goes.
 *
 * Called on a normal quit, and again from the hard exit paths: `app.exit` does
 * not raise `before-quit`, so a sidecar Deck started would otherwise outlive
 * the application that started it, keeping the port and the repository's
 * `.cockpit/url` file (RISK-0001).
 */
let shutDown = false;
/** The children `stopAll` signalled, so the quit can wait for them. */
let stopping: ChildProcess[] = [];
function shutdown(): void {
  if (shutDown) return;
  shutDown = true;
  // Geometry first. A window's own `close` handler saves it, but a quit that
  // comes from a signal calls `app.exit`, which never closes the windows: a
  // move made in the last quarter second would go with it, and where a window
  // was is the whole question after a restart.
  for (const info of windowInfo.values()) {
    try {
      info.saveBounds();
    } catch {
      // One window's geometry is not worth stopping a quit for.
    }
  }
  store.close();
  closeIndexes();
  graphs.close();
  stopping = sidecars.stopAll();
  void host.close();
}

/**
 * A quit that waits for the sidecars it started to actually go.
 *
 * SIGTERM is sent and then the quit is held open until every child has exited
 * or the grace runs out, at which point what is left is killed outright. Doing
 * this in `stopOne` alone does not work: its escalation is an `unref`'d timer
 * and the main process is gone before it can fire, so a sidecar that is slow
 * on SIGTERM kept the port and the repository's `.cockpit/url` file. That is
 * the fifth criterion of FEAT-0002 and the doubt Edwin recorded when he walked
 * TST-0011 on 2026-09-07.
 */
let quitHeld = false;
app.on('before-quit', (event) => {
  const first = !shutDown;
  shutdown();
  if (!first || quitHeld || stopping.length === 0) return;
  quitHeld = true;
  event.preventDefault();
  void waitForExit(stopping).then(() => {
    stopping = [];
    app.quit();
  });
});
app.on('will-quit', shutdown);
process.once('exit', shutdown);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    // The same wait the GUI quit does. `app.exit` never raises `before-quit`,
    // so without this the signal path stopped the sidecars and left at once,
    // and `stopOne`'s SIGKILL escalation is an `unref`'d timer that cannot
    // fire from a process that has gone. A sidecar slow on SIGTERM outlived
    // Deck on `kill -TERM`, which is how a terminal-launched Deck is stopped.
    shutdown();
    void waitForExit(stopping).finally(() => {
      app.exit(1);
    });
  });
}

/**
 * A boot that proves the real Electron runtime works, without a person.
 *
 * It opens a focus window and a satellite, changes the state in one and reads
 * it back in the other, prints a JSON verdict and exits non-zero on failure.
 */
async function runSmoke(): Promise<void> {
  const failures: string[] = [];
  /**
   * Checks that need a workspace and did not get one.
   *
   * A run without `--workspace` used to skip the workspace half and then make
   * the assertions that depend on it anyway: the satellite drew nothing
   * because there was nothing to draw, and putting a card on the desk changed
   * a state with no workspace in it, so two checks failed and the reason was
   * nowhere in the output. Two people then spent a day looking for a defect in
   * the renderer that was never there (ISS-0022). A check that cannot run says
   * so, by name, and is never counted as a pass either.
   */
  const skipped: string[] = [];
  /**
   * Checks belonging to a configuration this run is not.
   *
   * The tablet-shaped ones need `--lan`. A loopback run has not failed to make
   * them; it has made a different run, and calling that a skip would either
   * turn the ordinary smoke run red or make a skip mean nothing.
   */
  const notApplicable: string[] = [];
  let drawnCards: string[] = [];
  const record = (ok: boolean, what: string): void => {
    if (!ok) failures.push(what);
  };
  const skip = (what: string): void => {
    skipped.push(what);
  };
  const notHere = (what: string): void => {
    notApplicable.push(what);
  };
  try {
    // The workspace has to exist before the first window boots: the rail is
    // drawn once at start, and a window that opened on an empty rail stays empty.
    const prepared = prepareWorkspace();
    // A developer's shortcut to the Glass section alone, which is the part
    // that takes the most iterations. A run that uses it says so in its
    // verdict, so it can never stand in for the whole smoke.
    if (process.env['DECK_SMOKE_ONLY'] === 'glass' && prepared !== null) {
      await ipcInvoke('deck:workspaces:open', prepared.id);
      skip('everything but Glass: DECK_SMOKE_ONLY=glass');
      await recordGlass({
        store,
        createWindow: (role, address, panel) => createWindow(role, address, panel),
        addressOf: (id) => windowInfo.get(id)?.address ?? null,
        displayCount: () => screen.getAllDisplays().length,
        record,
        skip,
        notHere,
        prepared,
        tempDir: app.getPath('temp'),
        untilBooted,
        focusApp,
        windows: () =>
          [...windowInfo.entries()].flatMap(([id, info]) => {
            const w = BrowserWindow.fromId(id);
            if (w === null || w.isDestroyed()) return [];
            return [{ id, address: info.address, displayId: screen.getDisplayMatching(w.getBounds()).id, win: w }];
          }),
      });
      console.log(JSON.stringify(smokeVerdict(failures, skipped, notApplicable), null, 2));
      shutdown();
      await delay(400);
      app.exit(1);
      return;
    }
    const focus = createWindow('focus', null, null);
    await once(focus.webContents, 'did-finish-load');
    await untilBooted(focus);
    const title = (await focus.webContents.executeJavaScript('document.title')) as string;
    record(typeof title === 'string' && title.length > 0, 'the focus window rendered a title');

    if (prepared !== null) {
      const opened = (await ipcInvoke('deck:workspaces:open', prepared.id)) as {
        ok: boolean;
        error?: string;
        borrowed?: boolean;
      };
      record(opened.ok, `the workspace opened${opened.error === undefined ? '' : `: ${opened.error}`}`);
      const base = sidecars.handle(prepared.id)?.base ?? '';
      const proxied = await fetch(`${hostOrigin}/deck/sidecar/${prepared.id}/api/cockpit/nav?mode=features`);
      const payload = (await proxied.json()) as { groups?: Array<{ items?: unknown[] }> };
      const items = (payload.groups ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);
      record(items > 0, 'the proxied read returned notes');

      // Deck's OWN index, read the way a page reads it. The walk runs after
      // the workspace opens, so this waits for it rather than racing it.
      let records = { building: true, records: [], revision: 0 };
      for (let attempt = 0; attempt < 40 && records.building; attempt += 1) {
        await delay(250);
        records = (await (await fetch(`${hostOrigin}/deck/records/${prepared.id}`)).json()) as typeof records;
      }
      record(!records.building, 'Deck built its own index of the workspace');
      record(records.records.length > 0, `Deck's index holds records (${records.records.length})`);
      record(records.revision > 0, 'the records answer carries the revision it was built from');
      const refusedRecords = await fetch(`${hostOrigin}/deck/records/${prepared.id}`, { method: 'POST' });
      record(refusedRecords.status === 405, 'the records path refuses a POST with 405');

      // These checks are Spread's. Glass is the surface Deck opens since
      // PHASE-0002, so Spread is chosen by name; Glass has its own section.
      store.dispatch({ type: 'select-surface', surface: 'spread' });
      // The window booted before the workspace was opened, so give it the rail again.
      focus.webContents.reload();
      await once(focus.webContents, 'did-finish-load');
      await untilBooted(focus);
      await delay(1500);
      const drawn = (await focus.webContents.executeJavaScript(
        `({
          rows: Array.from(document.querySelectorAll('.nav-row:not([hidden]) .id')).map((e) => e.textContent),
          groups: Array.from(document.querySelectorAll('.nav-group:not([hidden]) .label')).map((e) => e.textContent),
          cards: Array.from(document.querySelectorAll('.card:not([hidden]) .id')).map((e) => e.textContent),
          views: Array.from(document.querySelectorAll('#switcher button')).map((e) => e.textContent),
          status: document.getElementById('status').textContent
        })`,
      )) as { rows: string[]; groups: string[]; cards: string[]; views: string[]; status: string };
      drawnCards = drawn.rows;
      record(drawn.rows.length > 0, 'the navigator listed the notes in the view');
      record(drawn.groups.length > 0, "the navigator drew the sidecar's own groups as headings");
      // The desk is a chosen subset now. A view that fills it is the thing
      // TASK-0024 removed, so an empty desk here is the check, not a failure.
      record(drawn.cards.length === 0, `the desk starts empty (${drawn.cards.length} cards)`);
      record(drawn.views.length > 0, 'the switcher drew the views the provider returned');
      console.log(
        JSON.stringify(
          {
            workspace: prepared.name,
            sidecar: base,
            borrowedFromTheCockpit: opened.borrowed === true,
            itemsInTheProxiedPayload: items,
            viewsFromTheProvider: drawn.views,
            groupsInTheNavigator: drawn.groups.slice(0, 6),
            rowsInTheNavigator: drawn.rows.length,
            cardsOnTheDesk: drawn.cards.length,
            status: drawn.status,
          },
          null,
          2,
        ),
      );

      // Rows come from a pool. Switching to a smaller view must not create a
      // second set of elements, and switching back must not grow the pool.
      const poolBefore = (await focus.webContents.executeJavaScript(
        `document.querySelectorAll('.nav-row').length`,
      )) as number;
      await focus.webContents.executeJavaScript(
        `document.querySelectorAll('#switcher button')[3].click()`,
      );
      await delay(2000);
      // What the browser DISPLAYS, not what the DOM is marked as. ISS-0001 hid
      // its cards correctly and left them on the screen, and a count of
      // `:not([hidden])` reported the right number throughout.
      const onScreen = `Array.from(document.querySelectorAll('.nav-row')).filter((c) => getComputedStyle(c).display !== 'none').length`;
      const afterSwitch = (await focus.webContents.executeJavaScript(
        `({ total: document.querySelectorAll('.nav-row').length, marked: document.querySelectorAll('.nav-row:not([hidden])').length, shown: ${onScreen}, headings: document.querySelectorAll('.nav-group:not([hidden])').length, count: document.getElementById('nav-count').textContent })`,
      )) as { total: number; marked: number; shown: number; headings: number; count: string };
      record(
        afterSwitch.total <= poolBefore,
        `the pool did not grow when the view changed (${poolBefore} then ${afterSwitch.total})`,
      );
      record(
        afterSwitch.shown === afterSwitch.marked,
        `every row the pool hid left the screen (${afterSwitch.marked} marked, ${afterSwitch.shown} shown)`,
      );
      // The label counts NOTES the narrowing kept, children included, against
      // the notes the view holds; the list draws the rows that are not inside
      // something collapsed, which is a smaller number. So the check is that
      // the two halves agree when nothing is narrowed, and that the list is
      // never claiming to show more rows than it has (ISS-0007).
      const claim = /^(\d+) of (\d+)/.exec(afterSwitch.count.trim());
      const kept = Number(claim?.[1] ?? '-1');
      const held = Number(claim?.[2] ?? '-2');
      record(kept === held, `nothing is narrowed, so the navigator counts the same both sides (${afterSwitch.count})`);
      record(
        afterSwitch.shown <= kept,
        `the navigator draws no more rows than the notes it kept (${afterSwitch.shown} rows, ${kept} notes)`,
      );
      // Every issue in this repository is fixed, so this view is entirely
      // finished work: the headings are drawn and every row is folded behind
      // them. That is the fold doing its job rather than an empty view.
      record(
        afterSwitch.headings > 0,
        `the navigator drew its headings even where every note is folded away (${afterSwitch.headings})`,
      );
      await focus.webContents.executeJavaScript(
        `document.querySelectorAll('#switcher button')[2].click()`,
      );
      await delay(2000);

      // A click in the list puts one card on the desk and opens the note.
      await focus.webContents.executeJavaScript(`document.querySelector('.nav-row:not([hidden])').click()`);
      await delay(1500);
      const afterClick = (await focus.webContents.executeJavaScript(
        `({ cards: document.querySelectorAll('.card:not([hidden])').length, reader: document.getElementById('reader').textContent.trim().length, onDesk: document.querySelectorAll('.nav-row[data-on-desk="true"]').length })`,
      )) as { cards: number; reader: number; onDesk: number };
      record(afterClick.cards === 1, `clicking a row put one card on the desk (${afterClick.cards})`);
      record(afterClick.onDesk === 1, 'the navigator marked the row as being on the desk');
      record(afterClick.reader > 20, `the reader filled from the note (${afterClick.reader} characters)`);

      // Search narrows the list to notes that match, and clearing restores it.
      const searched = (await focus.webContents.executeJavaScript(
        `(async () => {
          const box = document.getElementById('search');
          const all = document.querySelectorAll('.nav-row:not([hidden])').length;
          box.value = 'zzzznothingmatchesthis';
          box.dispatchEvent(new Event('input'));
          await new Promise((r) => setTimeout(r, 600));
          const none = document.querySelectorAll('.nav-row:not([hidden])').length;
          box.value = '';
          box.dispatchEvent(new Event('input'));
          await new Promise((r) => setTimeout(r, 600));
          return { all, none, restored: document.querySelectorAll('.nav-row:not([hidden])').length };
        })()`,
      )) as { all: number; none: number; restored: number };
      record(searched.none === 0, `a search that matches nothing empties the list (${searched.none} rows)`);
      record(
        searched.restored === searched.all,
        `clearing the search restores the list (${searched.all} then ${searched.restored})`,
      );

      // Dragging is a pointer gesture, so the smoke moves the card the way the
      // renderer does and checks the position survives a reload.
      const movedTo = (await focus.webContents.executeJavaScript(
        `(async () => {
          const card = document.querySelector('.card:not([hidden])');
          const box = card.getBoundingClientRect();
          const opts = { bubbles: true, pointerId: 1, button: 0, clientX: box.left + 20, clientY: box.top + 20 };
          card.dispatchEvent(new PointerEvent('pointerdown', opts));
          card.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: box.left + 260, clientY: box.top + 190 }));
          card.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: box.left + 260, clientY: box.top + 190 }));
          await new Promise((r) => setTimeout(r, 500));
          return { left: card.style.left, top: card.style.top };
        })()`,
      )) as { left: string; top: string };
      record(movedTo.left !== '' && movedTo.left !== '12px', `the card moved when it was dragged (${movedTo.left})`);

      // The note a person left open comes back with the state that named it,
      // and so does the card, at the position it was dragged to.
      focus.webContents.reload();
      await once(focus.webContents, 'did-finish-load');
      await untilBooted(focus);
      await delay(1500);
      const afterRestart = (await focus.webContents.executeJavaScript(
        `({ reader: document.getElementById('reader').textContent.trim().length, cards: document.querySelectorAll('.card:not([hidden])').length, left: (document.querySelector('.card:not([hidden])') || {}).style?.left || '' })`,
      )) as { reader: number; cards: number; left: string };
      record(afterRestart.reader > 20, 'the note that was open came back after a reload');
      record(afterRestart.cards === 1, `the card on the desk came back after a reload (${afterRestart.cards})`);
      record(
        afterRestart.left === movedTo.left,
        `the card came back where it was dragged to (${movedTo.left} then ${afterRestart.left})`,
      );

      // A desk saved in the main process reaches the window that is drawing.
      store.dispatch({ type: 'save-desk', name: 'smoke' });
      await delay(400);
      const deskNames = (await focus.webContents.executeJavaScript(
        `Array.from(document.getElementById('desk-list').options).map((o) => o.value)`,
      )) as string[];
      record(deskNames.includes('smoke'), 'the saved desk reached the window');

      const image = await focus.webContents.capturePage();
      const shot = path.join(app.getPath('temp'), 'deck-spread.png');
      fs.writeFileSync(shot, image.toPNG());
      console.log(JSON.stringify({ screenshot: shot }));
    }

    const caps = (await focus.webContents.executeJavaScript(
      'window.deck ? window.deck.capabilities() : null',
    )) as Record<string, unknown> | null;
    record(caps?.['popOutWindows'] === true, 'the shell reports the pop-out capability');

    const served = await fetch(`${hostOrigin}/deck/capabilities`);
    const servedCaps = (await served.json()) as Record<string, unknown>;
    record(servedCaps['popOutWindows'] === false, 'the served host reports no pop-out capability');

    // The tablet does not write, and the verbs are ABSENT rather than disabled
    // (ADR-0003). Checked on the served host's own answer, and on the page.
    record(servedCaps['write'] === false, 'the served host reports no write capability');
    record(caps?.['write'] === true, 'the shell reports the write capability');
    const writeControls = (await focus.webContents.executeJavaScript(
      `({
        actuatorsHidden: document.getElementById('actuators').hidden,
        actor: document.getElementById('actor').textContent,
        staleHidden: document.getElementById('stale').hidden
      })`,
    )) as { actuatorsHidden: boolean; actor: string; staleHidden: boolean };
    record(/^writing as /.test(writeControls.actor), `the shell shows the name it writes with ("${writeControls.actor}")`);
    record(writeControls.staleHidden, 'no mark until something has actually changed under this window');

    // The mark, driven the way the index drives it: one number, and a window
    // drawing from an older one says so rather than re-arranging itself.
    if (prepared !== null) {
      const revision = store.getState().indexRevisions[prepared.id] ?? 0;
      store.dispatch({ type: 'index-changed', workspaceId: prepared.id, revision: revision + 1 });
      await delay(600);
      const marked = (await focus.webContents.executeJavaScript(
        `({ hidden: document.getElementById('stale').hidden, said: document.getElementById('stale').textContent })`,
      )) as { hidden: boolean; said: string };
      record(!marked.hidden, 'a change under the window was ANNOUNCED');
      record(/show me/.test(marked.said), 'the mark offers the action that takes it');
      await focus.webContents.executeJavaScript(`document.querySelector('#stale .action').click()`);
      await delay(1500);
      const cleared = (await focus.webContents.executeJavaScript(
        `document.getElementById('stale').hidden`,
      )) as boolean;
      record(cleared, 'the mark cleared when the person took the offered action');
    }

    const refused = await fetch(`${hostOrigin}/deck/capabilities`, { method: 'POST' });
    record(refused.status === 405, 'the host refuses a POST with 405');

    // Every check below needs a workspace: a satellite draws a workspace's
    // desk, and putting a card on that desk changes a workspace's state. They
    // used to run regardless, so a run without `--workspace` reported "a card
    // added elsewhere reached the satellite (0 then 0)" and sent two people
    // looking for a defect in the renderer that was never there (ISS-0022).
    if (prepared === null) {
      skip('the panel windows, the cross-window change and the promotion: no workspace was opened');
    } else {
      // A popped-out window carries ONE panel, named in its address.
      const panelAddress = `deck://${prepared.id}/features?panel=desk`;
      const satellite = createWindow('satellite', panelAddress, 'desk');
      await once(satellite.webContents, 'did-finish-load');
      await untilBooted(satellite);
      record(!satellite.isFocused(), 'the satellite did not take focus');
      const satelliteChrome = (await satellite.webContents.executeJavaScript(
        `({
          views: document.querySelectorAll('#switcher button').length,
          rail: getComputedStyle(document.getElementById('rail')).display,
          navigator: getComputedStyle(document.getElementById('navigator')).display,
          reader: getComputedStyle(document.getElementById('reader')).display,
          panel: document.body.dataset.panel
        })`,
      )) as { views: number; rail: string; navigator: string; reader: string; panel: string };
      record(satelliteChrome.views === 0, 'the satellite drew no switcher, so it owns no navigation');
      record(satelliteChrome.rail === 'none', 'the satellite drew no workspace rail');
      record(satelliteChrome.panel === 'desk', `the satellite carries the panel its address named (${satelliteChrome.panel})`);
      record(
        satelliteChrome.navigator === 'none' && satelliteChrome.reader === 'none',
        'a desk panel carries the desk and nothing else',
      );

      // What a person sees, not what the window was told. Reading the state a
      // window holds passes while the cards on it never move.
      const highlighted = async (win: BrowserWindow): Promise<string | null> =>
        (await win.webContents.executeJavaScript(
          `(document.querySelector('.card[aria-current="true"]:not([hidden]) .id') || {}).textContent || null`,
        )) as string | null;

      const visible = async (win: BrowserWindow): Promise<number> =>
        (await win.webContents.executeJavaScript(
          `document.querySelectorAll('.card:not([hidden])').length`,
        )) as number;

      // The desk holds one card. Putting a second one on it in the main process
      // has to reach the window that is drawing the desk.
      const onDesk = await visible(satellite);
      const second = drawnCards.find((id) => id !== null && id !== '') ?? 'FEAT-0002';
      store.dispatch({ type: 'put-on-desk', noteId: String(drawnCards[2] ?? second), x: 24, y: 240 });
      await delay(800);
      const afterPut = await visible(satellite);
      record(afterPut === onDesk + 1, `a card added elsewhere reached the satellite (${onDesk} then ${afterPut})`);

      const before = await highlighted(satellite);
      const target = String(drawnCards[2] ?? second);
      store.dispatch({ type: 'focus-note', noteId: target });
      await delay(800);
      const after = await highlighted(satellite);
      record(
        after === target && after !== before,
        `the satellite REDREW when the focused note changed (${before} then ${after}, wanted ${target})`,
      );

      // The other two panels: what each one carries, and what it does not.
      for (const [type, wanted] of [
        ['needs-you', { navigator: 'none', reader: 'none' }],
        ['note', { navigator: 'none', deskArea: 'none' }],
      ] as const) {
        const noteBit = type === 'note' ? `&note=${encodeURIComponent(String(drawnCards[0] ?? 'FEAT-0002'))}` : '';
        const address = `deck://${prepared.id}/features?panel=${type}${noteBit}`;
        const window_ = createWindow('satellite', address, type);
        await once(window_.webContents, 'did-finish-load');
        await untilBooted(window_);
        await delay(1200);
        const seen = (await window_.webContents.executeJavaScript(
          `({
            panel: document.body.dataset.panel,
            navigator: getComputedStyle(document.getElementById('navigator')).display,
            reader: getComputedStyle(document.getElementById('reader')).display,
            deskArea: getComputedStyle(document.getElementById('desk-area')).display,
            views: document.querySelectorAll('#switcher button').length,
            readerText: document.getElementById('reader').textContent.trim().length,
            cards: document.querySelectorAll('.card:not([hidden])').length,
            label: document.getElementById('desk-name').textContent
          })`,
        )) as Record<string, unknown>;
        record(seen['panel'] === type, `the ${type} window carries the panel its address named (${String(seen['panel'])})`);
        record(seen['views'] === 0, `the ${type} window draws no view buttons`);
        for (const [region, display] of Object.entries(wanted)) {
          record(seen[region] === display, `the ${type} window does not carry the ${region} (it is ${String(seen[region])})`);
        }
        if (type === 'note') {
          record(Number(seen['readerText']) > 20, 'the note window shows the note its address named');
        } else {
          // This repository owes nothing today, so the strip is empty and says
          // so. Either label proves the panel drew rather than sat blank.
          record(
            seen['label'] === 'nothing is owed' || seen['label'] === 'what needs you',
            `the needs-you window drew its strip (it says "${String(seen['label'])}")`,
          );
        }
        window_.close();
        await delay(300);
      }

      // Closing the window that owns navigation must not leave Deck without one.
      focus.close();
      await delay(500);
      const promoted = windowInfo.get(satellite.id)?.role;
      record(promoted === 'focus', `a satellite was promoted when the focus window closed (it is now ${promoted})`);
      record(focusWindowId === satellite.id, 'the promoted window owns navigation');
    }


    // **Glass** (PHASE-0002): the field, the desk lifted out of it, and the
    // hands, driven with real pointer events through `sendInputEvent`, which
    // hit-tests the way a person's pointer does. DES-0002 lost two revisions
    // to a synthetic click that never hit-tested.
    if (prepared === null) skip('Glass: no workspace was opened');
    else {
      await recordGlass({
        store,
        createWindow: (role, address, panel) => createWindow(role, address, panel),
        addressOf: (id) => windowInfo.get(id)?.address ?? null,
        displayCount: () => screen.getAllDisplays().length,
        record,
        skip,
        notHere,
        prepared,
        tempDir: app.getPath('temp'),
        untilBooted,
        focusApp,
        windows: () =>
          [...windowInfo.entries()].flatMap(([id, info]) => {
            const w = BrowserWindow.fromId(id);
            if (w === null || w.isDestroyed()) return [];
            return [{ id, address: info.address, displayId: screen.getDisplayMatching(w.getBounds()).id, win: w }];
          }),
      });
    }

    await recordNavigationGuard(record);

    // **The tablet follows the store** (TASK-0057). A page with no bridge is
    // exactly what a tablet loads, so the check opens one here rather than
    // needing a tablet, and times how long a lift on the Mac takes to reach it.
    await recordServedPageFollows(record, skip, prepared);

    // **The renderer's own guards, driven in a real window.** Neither of these
    // can be a node check: `node --test` cannot load the renderer at all
    // (ISS-0008), which is how a deletable Content-Security-Policy tag and a
    // half-fixed reason box both survived a full green suite.
    await recordScriptInANoteDoesNotRun(record);
    await recordEveryVerbAsksWhy(record, skip, prepared);

    // **What a tablet actually gets**, from the machine's own network address
    // rather than from loopback, which is the only way to exercise the path a
    // tablet takes (TST-0010). Safari and the visual absence of a control stay
    // a walk; the status codes do not have to.
    await recordFromTheNetwork(record, skip, notHere, prepared);

    // **The quit, measured against a REAL sidecar Deck started** (TST-0011's
    // last two steps, and the doubt Edwin recorded when he walked it on
    // 2026-09-07: "I am not sure if it doesn't leave anything running when I
    // quit???"). ISS-0021 exists to answer that, and until now only a person
    // could. A temporary workspace with no `.cockpit/url` forces Deck to start
    // its own child rather than borrow one, so what is measured is a process
    // Deck owns and is therefore Deck's to stop.
    await recordQuit(record, skip);

    console.log(JSON.stringify(smokeVerdict(failures, skipped, notApplicable), null, 2));
  } catch (err) {
    console.log(JSON.stringify(smokeVerdict([...failures, String(err)], skipped, notApplicable), null, 2));
    failures.push('threw');
  }
  shutdown();
  // Give SIGTERM a moment to reach the children before the process goes.
  await delay(400);
  app.exit(smokeVerdict(failures, skipped, notApplicable).ok ? 0 : 1);
}

/**
 * A script inside a note's markup does not run (ISS-0038).
 *
 * `renderer.ts` sets `article.innerHTML` from the sidecar's rendered Markdown,
 * and Python-Markdown passes raw HTML straight through, so a `<script>` in a
 * note arrives as a script tag. The only thing stopping it is the
 * Content-Security-Policy meta tag in `index.html` — and that tag is markup,
 * so nothing in a suite of TypeScript checks ever had an opinion about it.
 * Deleting it left 316 checks green and the smoke run `ok: true`.
 *
 * The stakes are the write bridge: since ADR-0003 this window holds
 * `window.deck.write.*`, with the actor read from Deck's own store, and a note
 * is a file anybody can put in a vault.
 *
 * Driven rather than read. A check that searched `index.html` for the string
 * is the shape ISS-0032 was filed against, and it survives a policy that is
 * present and wrong.
 */
async function recordScriptInANoteDoesNotRun(record: (ok: boolean, what: string) => void): Promise<void> {
  const win = createWindow('satellite', null, null);
  try {
    await once(win.webContents, 'did-finish-load');
    await untilBooted(win);
    const ran = await win.webContents.executeJavaScript(`
      (() => {
        window.__scriptInANoteRan = false;
        const host = document.createElement('div');
        // The exact route a note takes: innerHTML on the reader's article.
        host.innerHTML = '<script>window.__scriptInANoteRan = true;<\\/script>' +
          '<img src="x" onerror="window.__scriptInANoteRan = true">';
        document.body.appendChild(host);
        return new Promise((resolve) => setTimeout(() => resolve(window.__scriptInANoteRan), 300));
      })()
    `);
    record(ran === false, "a script tag inside a note's markup does not run in a Deck window");

    // And the policy is actually the reason, rather than the markup having
    // been rewritten on the way in.
    const policy = await win.webContents.executeJavaScript(
      `(document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || ''`,
    );
    record(
      typeof policy === 'string' && policy.includes("script-src 'self'"),
      "the window's content policy names `script-src 'self'`",
    );
  } finally {
    win.destroy();
  }
}

/**
 * Every verb asks why, and a verb Deck cannot perform is refused (ISS-0040,
 * ISS-0039).
 *
 * `applyVerb` is renderer code, so no node check reaches it — `grep applyVerb
 * desktop/tests/` found nothing on the day ISS-0040 was filed, which is how
 * ISS-0037 came to be fixed at the shell and half fixed at the screen.
 *
 * The control is PRESSED, the way a person presses it, in a window opened at
 * an address that focuses a note the sidecar offers verbs on. The write bridge
 * is replaced for the duration, so what is asserted is what the shell was
 * asked for and no note is touched.
 */
async function recordEveryVerbAsksWhy(
  record: (ok: boolean, what: string) => void,
  skip: (why: string) => void,
  prepared: PreparedWorkspace | null,
): Promise<void> {
  if (prepared === null) {
    skip('the verb controls: no workspace was opened, so no note could be focused');
    return;
  }
  const withVerbs = 'ISS-0008';
  const withEndpoint = 'DES-0001';

  // **The write is intercepted in the MAIN process, not in the page.**
  // `window.deck` comes through `contextBridge`, which freezes it, so an
  // assignment in the page is refused silently — the first version of this
  // check believed it had replaced the bridge and had not. Replacing the IPC
  // handler is Deck's own code replacing Deck's own code, and it is the only
  // thing standing between this run and a real write to the repository.
  const sent: Array<Record<string, unknown>> = [];
  const ticked: Array<Record<string, unknown>> = [];
  const held = new Map<string, InvokeHandler | undefined>();
  const catcher = (into: Array<Record<string, unknown>>) =>
    ((_e: Electron.IpcMainInvokeEvent, request: Record<string, unknown>): unknown => {
      into.push(request);
      return { ok: true, result: {} };
    }) as InvokeHandler;
  // Both write channels, because BOTH are things a person presses. Ticks were
  // not intercepted before, and nothing pressed one either (ISS-0053).
  for (const [channel, into] of [
    ['deck:write:transition', sent],
    ['deck:write:tick', ticked],
  ] as Array<[string, Array<Record<string, unknown>>]>) {
    held.set(channel, smokeHandlers.get(channel));
    const stub = catcher(into);
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, stub);
    smokeHandlers.set(channel, stub);
  }
  const putItBack = (): void => {
    for (const [channel, original] of held) {
      ipcMain.removeHandler(channel);
      if (original !== undefined) {
        ipcMain.handle(channel, original);
        smokeHandlers.set(channel, original);
      }
    }
  };

  /** Click a note's row in the navigator, which is how a person opens one. */
  const openTheNote = `
    (async () => {
      const row = document.querySelector('#nav-list [data-note-id="ID"]');
      if (row === null) return {found: false, verbs: 0};
      row.click();
      await new Promise((r) => setTimeout(r, 1500));
      return {found: true, verbs: document.querySelectorAll('#actuators button.verb').length};
    })()
  `;
  /**
   * Answer every box Deck puts in the status bar.
   *
   * It asks more than once: the reason, and then — for an issue leaving
   * `triage` — the severity. Answering only the first leaves the verb waiting
   * and reads as "the reason never arrived", which is not the same fault.
   */
  const pressAndAnswer = `
    (async () => {
      const verbs = [...document.querySelectorAll('#actuators button.verb')];
      const names = verbs.map((b) => b.textContent);
      // How each row was DRAWN, which a tooltip-only "unavailable" hid.
      const drawn = verbs.map((b) => ({
        verb: b.textContent, confirm: b.dataset.confirm, disabled: b.disabled, title: b.title,
      }));
      // Picked by what the ROW says, never by a verb name: Deck restates no
      // part of the sidecar's table and neither does this check.
      //
      // **No fallback to the first row** (ISS-0045). It used to fall back and
      // say nothing about which branch it took, so hard-wiring every row to
      // confirm left the run green with the claim unmeasured; it landed
      // correctly only by luck of ordering. No backtick may appear in this
      // comment: it is inside a template literal and would close it.
      const target = verbs.find((b) => b.dataset.confirm === 'CONFIRM');
      if (target === undefined) return {names, drawn, pressed: null, asked: 0, labels: [], said: ''};
      const pressed = {verb: target.textContent, confirm: target.dataset.confirm, disabled: target.disabled};
      target.click();
      await new Promise((r) => setTimeout(r, 200));
      let asked = 0;
      // The LABELS, not just the count. Deck asks twice for an issue leaving
      // triage — the reason, then the severity — so "a box appeared" is
      // satisfied by the severity box alone, and a check that counted boxes
      // survived putting the reason back inside the confirmation.
      const labels = [];
      for (let i = 0; i < 4; i += 1) {
        const form = document.querySelector('#status form');
        if (form === null) break;
        labels.push((form.textContent || '').trim());
        form.querySelector('input').value = asked === 0 ? 'REASON' : '';
        form.dispatchEvent(new Event('submit', {cancelable: true}));
        asked += 1;
        await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 300));
      return {names, drawn, pressed, asked, labels, said: (document.querySelector('#status') || {}).textContent || ''};
    })()
  `;
  const reason = 'because the smoke run pressed it';
  let skippedForSafety = false;

  const win = createWindow('satellite', `deck://${prepared.id}/issues?note=${withVerbs}`, null);
  try {
    await once(win.webContents, 'did-finish-load');
    await untilBooted(win);
    await delay(1200);

    // **Prove the interception took BEFORE pressing anything.** The first
    // version of this check replaced `window.deck.write` from inside the page.
    // `contextBridge` freezes that object, so the assignment was refused in
    // silence, the run pressed Accept for real, and ISS-0008 moved from
    // `triage` to `open` in this repository with a decision callout reading
    // "because the smoke run said so". A smoke run must never write to the
    // repository it is checking; this is the line that makes sure.
    const probe = (await win.webContents.executeJavaScript(
      `window.deck.write.transition({workspaceId: 'x', id: '__smoke_probe__', to: 'x'})`,
    )) as { ok?: boolean };
    const intercepted = sent.length === 1 && sent[0]?.['id'] === '__smoke_probe__' && probe?.ok === true;
    record(intercepted, 'the write path is intercepted, so nothing below can reach a note');
    if (!intercepted) {
      skip('the verb controls: the write path was NOT intercepted and driving them would write to this repository');
      skippedForSafety = true;
      return;
    }
    sent.length = 0;
    const opened = (await win.webContents.executeJavaScript(openTheNote.replace('ID', withVerbs))) as { found: boolean; verbs: number };
    record(opened.verbs > 0, `${withVerbs} opened in the reader with verbs on it, so this measures something`);
    if (opened.verbs > 0) {
      const seen = (await win.webContents.executeJavaScript(
        pressAndAnswer.replace('CONFIRM', 'false').replace('REASON', reason),
      )) as { names: string[]; drawn: Array<{ verb: string; confirm: string; disabled: boolean; title: string }>; pressed: { verb: string; confirm: string; disabled: boolean } | null; asked: number; labels: string[]; said: string };
      record(seen.names.length > 0, `the verbs drawn are the sidecar's: ${seen.names.join(', ')}`);
      // ISS-0040: the reason used to be asked for only inside a confirmation,
      // and Accept does not confirm.
      record(
        seen.pressed !== null && seen.pressed.confirm === 'false' && seen.pressed.disabled === false,
        `the verb pressed really is one that does not stop to confirm: ${JSON.stringify(seen.pressed)}`,
      );
      record(
        seen.labels.some((label) => /^why /i.test(label)),
        'pressing a verb that does NOT stop to confirm still asks why',
      );
      const request = sent.at(-1) ?? {};
      record(request['note'] === reason, 'and the reason a person typed reaches the shell, on that same verb');
      record(
        request['id'] === withVerbs && typeof request['to'] === 'string' && request['to'] !== '',
        `carrying the note and the status the row named (${String(request['to'])})`,
      );
    }

    // **The tick control, pressed** (ISS-0053). Six rounds hardened the verb
    // row and nobody pressed a tick — so `attachTicks` could be deleted,
    // leaving Deck unable to resolve a criterion anywhere, with the node
    // suite, this run and the round-trip script all green. That script ticks
    // through `client.tick`, which is the route with no interface on it.
    //
    // The note is CHOSEN by reading the workspace — see
    // `notesWithAnUntickedCriterion` — and OPENED by clicking its row in the
    // navigator, which is the route a person takes and the one this window
    // has already proved works.
    const candidates = notesWithAnUntickedCriterion(prepared.root);
    record(candidates.length > 0, 'this workspace has notes with unticked criteria, so this measures something');
    const tick = (await win.webContents.executeJavaScript(`
      (async () => {
        const wanted = ${JSON.stringify(candidates)};
        const probe = {wanted: wanted.length, tried: []};
        // **Toggle every group, which unfolds the folded ones.** The navigator
        // renders a folded group's rows nowhere, so every route this check
        // tried — clicking a row, the search box, addressing the window at the
        // note — failed for the same reason and looked like four different
        // faults.
        //
        // A toggle, not an unfold: this also FOLDS any group that was already
        // open, which is why it is written as "enough rows end up rendered"
        // rather than "every group is open". Saying "unfold" was wrong about
        // the code directly under it (ISS-0056).
        for (const twist of [...document.querySelectorAll('#nav-list .twist')]) twist.click();
        await new Promise((r) => setTimeout(r, 600));
        probe.rows = document.querySelectorAll('#nav-list [data-note-id]').length;
        for (const id of wanted) {
          const row = document.querySelector('#nav-list [data-note-id="' + id + '"]');
          if (row === null) continue;
          row.click();
          await new Promise((r) => setTimeout(r, 900));
          const control = document.querySelector('#reader button.tick');
          probe.tried.push({id, control: control !== null});
          if (control === null) continue;
          control.click();
          await new Promise((r) => setTimeout(r, 250));
          const form = document.querySelector('#status form');
          const label = form === null ? '' : (form.textContent || '').trim();
          if (form !== null) {
            form.querySelector('input').value = 'the smoke run pressed it';
            form.dispatchEvent(new Event('submit', {cancelable: true}));
            await new Promise((r) => setTimeout(r, 400));
          }
          // **And once more with the box left empty**, which is the refusal a
          // person meets most often: an empty answer is treated as no answer,
          // so nothing should be sent and Deck should say why. (No backtick may
          // appear in this comment — it is inside a template literal.)
          let refusedEmpty = null;
          const second = document.querySelector('#reader button.tick');
          if (second !== null) {
            second.click();
            await new Promise((r) => setTimeout(r, 250));
            const box = document.querySelector('#status form');
            if (box !== null) {
              box.querySelector('input').value = '';
              box.dispatchEvent(new Event('submit', {cancelable: true}));
              await new Promise((r) => setTimeout(r, 350));
              refusedEmpty = (document.querySelector('#status') || {}).textContent || '';
            }
          }
          return {found: id, asked: form !== null, label, refusedEmpty, probe};
        }
        return {found: null, probe};
      })()
    `)) as { found: string | null; asked?: boolean; label?: string; refusedEmpty?: string | null; probe?: unknown };
    // Printed only when it found nothing, which is the case a person has to
    // diagnose; on success it is noise.
    if (tick.found === null) console.log(JSON.stringify({ tickProbe: tick }));

    record(tick.found !== null, `a note with an unticked criterion offers a tick control in this view (tried ${candidates.length})`);
    if (tick.found !== null) {
      record(tick.asked === true && /^evidence for /i.test(tick.label ?? ''), 'pressing it asks for evidence');
      const wrote = ticked.at(-1) ?? {};
      record(
        ticked.length === 1 && wrote['evidence'] === 'the smoke run pressed it',
        'and the evidence a person typed reaches the shell',
      );
      record(
        typeof wrote['criterion'] === 'string' && (wrote['criterion'] as string) !== '',
        `naming the criterion the sidecar addressed (${String(wrote['criterion']).slice(0, 40)}…)`,
      );
      record(wrote['id'] === tick.found, 'on the note that was open');
      record(
        typeof tick.refusedEmpty === 'string' && /nothing was ticked/i.test(tick.refusedEmpty),
        `a tick with no evidence is refused before it is sent (${String(tick.refusedEmpty).slice(0, 60)})`,
      );
      record(ticked.length === 1, 'and nothing more reached the shell');
    }
  } finally {
    win.destroy();
    if (skippedForSafety) putItBack();
  }
  if (skippedForSafety) return;

  // A verb whose verdict belongs to a surface Deck does not have is drawn,
  // refused, and explained (ISS-0039). In a window of its own.
  const other = createWindow('satellite', `deck://${prepared.id}/intent?note=${withEndpoint}`, null);
  try {
    await once(other.webContents, 'did-finish-load');
    await untilBooted(other);
    await delay(1200);
    const before = sent.length;
    const opened = (await other.webContents.executeJavaScript(openTheNote.replace('ID', withEndpoint))) as { found: boolean; verbs: number };
    record(opened.verbs > 0, `${withEndpoint} opened with verbs on it, so this measures something too`);
    if (opened.verbs > 0) {
      const seen = (await other.webContents.executeJavaScript(
        pressAndAnswer.replace('CONFIRM', 'false').replace('REASON', reason),
      )) as { names: string[]; drawn: Array<{ verb: string; confirm: string; disabled: boolean; title: string }>; pressed: { verb: string; confirm: string; disabled: boolean } | null; asked: number; labels: string[]; said: string };
      // **Read off the BUTTON, not the status bar** (ISS-0045). The status bar
      // carries a sentence for many reasons, so reverting the drawn half left
      // these green while every row still looked like a working verb.
      record(
        seen.drawn.length > 0 && seen.drawn.every((row) => row.disabled),
        `every verb on ${withEndpoint} is drawn disabled: ${JSON.stringify(seen.drawn.map((r) => [r.verb, r.disabled]))}`,
      );
      record(
        seen.drawn.every((row) => /revision/i.test(row.title) && /cockpit/i.test(row.title)),
        'and each one says the verdict must name a revision and belongs in the cockpit',
      );
      // **The guard is driven, not inferred from the button** (ISS-0050).
      // Clicking a disabled button dispatches nothing, so "it asked nothing"
      // and "it sent nothing" were true of `<button disabled>` and would hold
      // on any page at all — while deleting `applyVerb`'s refusal, the layer
      // that actually stops the request, changed nothing any check could see.
      // Re-enabling the button in the page and pressing it asks Deck the
      // question instead of asking the DOM.
      const forced = (await other.webContents.executeJavaScript(`
        (async () => {
          const sent = [];
          const button = document.querySelector('#actuators button.verb');
          if (button === null) return {ran: false};
          button.disabled = false;
          button.click();
          await new Promise((r) => setTimeout(r, 400));
          const form = document.querySelector('#status form');
          return {
            ran: true,
            askedAnything: form !== null,
            said: (document.querySelector('#status') || {}).textContent || '',
          };
        })()
      `)) as { ran: boolean; askedAnything?: boolean; said?: string };
      record(forced.ran, 'the refusal inside applyVerb could be driven');
      record(forced.askedAnything === false, 'pressing it asks nothing, because Deck cannot record the verdict');
      record(sent.length === before, 'and sends nothing — with the button forced back on, so this is about Deck');
      record(
        /revision/i.test(forced.said ?? '') && /cockpit/i.test(forced.said ?? ''),
        'and Deck says the verdict must name a revision and belongs in the cockpit',
      );
    }
  } finally {
    other.destroy();
    putItBack();
  }
}

/**
 * The checks a person otherwise makes from a tablet, made from the network.
 *
 * Deck's host is bound beyond loopback only with `--lan`, so this runs when it
 * is and says so when it is not. What it drives is the half of TST-0010 that is
 * a status code rather than a judgement: the refusal of a write, both spellings
 * of a traversal, and the capability set a served page is given. What it cannot
 * drive is Safari rendering the page and a person seeing that a control is
 * ABSENT rather than greyed out.
 *
 * The address is this machine's own, not `127.0.0.1`: a request from loopback
 * is not the request a tablet makes, and the whole point of the allow-list is
 * what it does to a request that came from somewhere else.
 */
async function recordFromTheNetwork(
  record: (ok: boolean, what: string) => void,
  skip: (what: string) => void,
  notHere: (what: string) => void,
  prepared: PreparedWorkspace | null,
): Promise<void> {
  if (!process.argv.includes('--lan')) {
    notHere('the tablet-shaped checks: this run is on loopback; `npm run smoke:lan` makes them');
    return;
  }
  const address = lanAddress();
  if (address === null) {
    skip('the tablet-shaped checks: this machine has no network address to be reached at');
    return;
  }
  const origin = `http://${address}:${hostPort}`;

  const page = await fetch(`${origin}/`);
  record(page.status === 200, `the renderer is served over the network (${origin} answered ${page.status})`);

  const caps = (await (await fetch(`${origin}/deck/capabilities`)).json()) as Record<string, unknown>;
  record(caps['write'] === false, 'a page reached over the network is given no write capability');
  record(caps['popOutWindows'] === false, 'and no pop-out capability');
  record(caps['manageWorkspaces'] === false, 'and cannot add a workspace');

  const posted = await fetch(`${origin}/deck/workspaces`, { method: 'POST' });
  record(posted.status === 405, `a POST from the network is refused with 405 (it answered ${posted.status})`);

  // The two routes a tablet follows the store over are reads and nothing else
  // (TASK-0057). Every other method, from the network address.
  for (const route of ['/deck/state', '/deck/events']) {
    const refusedAll: string[] = [];
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const answered = await fetch(`${origin}${route}`, { method });
      if (answered.status !== 405) refusedAll.push(`${method} ${answered.status}`);
    }
    record(refusedAll.length === 0, `${route} refuses every write from the network with 405 (${refusedAll.join(', ') || 'all five'})`);
  }
  const stateRead = await fetch(`${origin}/deck/state`);
  const stateBody = (await stateRead.json()) as { actor?: string };
  record(stateRead.status === 200 && stateBody.actor === '', 'the state a tablet reads carries no name to write with');

  if (prepared === null) {
    skip('the traversal checks: no workspace was opened, so there is no sidecar to try to reach past');
    return;
  }
  // Both spellings, because one is a decoding deeper than the other and a
  // single check on the written form is what let a double-encoded traversal
  // through before (ISS-0014, and the hole ADR-0001 closed).
  for (const [spelling, tail] of [
    ['written plainly', '../../../../etc/passwd'],
    ['encoded once more', '%252e%252e%252f%252e%252e%252fetc/passwd'],
  ] as const) {
    const response = await fetch(`${origin}/deck/sidecar/${prepared.id}/api/render?file=${tail}`);
    record(
      response.status === 403,
      `a way out of an allowed path, ${spelling}, is refused by DECK's host with 403 (it answered ${response.status})`,
    );
  }
  // And an ordinary read still works, so the lock is not simply refusing
  // everything: a note whose name carries a space is the awkward case.
  const nav = await fetch(`${origin}/deck/sidecar/${prepared.id}/api/cockpit/nav?mode=features`);
  record(nav.status === 200, `an ordinary read from the network still answers (${nav.status})`);
}

/**
 * A page with no bridge follows the Mac's desk, and cannot change it.
 *
 * The window is opened WITHOUT the preload, so the page is served exactly as
 * a tablet is: it fetches the served capability set, reads `/deck/state` and
 * subscribes to `/deck/events`. A note is then put on the desk in the main
 * process, the way a lift on the Mac does it, and the page's own drawn state
 * is read back.
 */
async function recordServedPageFollows(
  record: (ok: boolean, what: string) => void,
  skip: (what: string) => void,
  prepared: PreparedWorkspace | null,
): Promise<void> {
  if (prepared === null) {
    skip('the served page following the store: no workspace was opened');
    return;
  }
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    void win.loadURL(`${hostOrigin}/`);
    await once(win.webContents, 'did-finish-load');
    await untilBooted(win);
    const before = (await win.webContents.executeJavaScript(
      `({ bridge: typeof window.deck, mark: document.getElementById('host-mark').textContent, follow: !document.getElementById('follow').hidden })`,
    )) as { bridge: string; mark: string; follow: boolean };
    record(before.bridge === 'undefined', 'the served page has no bridge, as on a tablet');
    record(before.follow, 'the served page offers the follow toggle');
    const lifted = `SMOKE-${Date.now()}`;
    const sentAt = Date.now();
    store.dispatch({ type: 'open-workspace', workspaceId: prepared.id });
    store.dispatch({ type: 'put-on-desk', noteId: lifted, x: 40, y: 40 });
    let arrived = -1;
    for (let i = 0; i < 40; i += 1) {
      const seen = (await win.webContents.executeJavaScript(
        `((window.__deckLastState || {}).deskCards || {})[${JSON.stringify(prepared.id)}] || []`,
      )) as Array<{ noteId: string }>;
      if (seen.some((c) => c.noteId === lifted)) {
        arrived = Date.now() - sentAt;
        break;
      }
      await delay(50);
    }
    record(arrived >= 0 && arrived < 1000, `a note lifted on the Mac reached the served page's desk within a second (${arrived}ms)`);
    // The tablet cannot take it back off: the action is not one it applies.
    await win.webContents.executeJavaScript(
      `document.querySelector('#nav-list .nav-row') && document.querySelector('#nav-list .nav-row').click()`,
    );
    await delay(600);
    record(
      store.getState().deskCards[prepared.id]?.some((c) => c.noteId === lifted) === true,
      'a click on the served page left the Mac’s desk as it was',
    );
    store.dispatch({ type: 'take-off-desk', noteId: lifted });
  } finally {
    win.destroy();
  }
}

/** This machine's own network address, or null when it has none. */
function lanAddress(): string | null {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return null;
}

/**
 * The navigation guard, DRIVEN rather than searched for.
 *
 * The previous check read the built file for three strings, which survives
 * inverting the very condition it claims to protect (ISS-0032). This makes a
 * real page try to leave and looks at where the window ended up.
 *
 * In a window of its own, opened and closed for the purpose, so a navigation
 * cannot disturb the window the rest of the run is using.
 */
async function recordNavigationGuard(record: (ok: boolean, what: string) => void): Promise<void> {
  const handedOut: string[] = [];
  const restore = openOutside;
  openOutside = (url) => handedOut.push(url);
  const win = createWindow('satellite', null, null);
  try {
    await once(win.webContents, 'did-finish-load');
    const home = win.webContents.getURL();

    // Not awaited: a navigation destroys the frame the call was made in, so
    // the promise never settles cleanly. What is asserted is where the window
    // ended up, which is the thing that matters.
    void win.webContents.executeJavaScript(`location.href = 'https://example.test/somewhere'`).catch(() => {});
    await delay(1200);
    record(win.webContents.getURL() === home, `a page that tried to leave Deck's origin did not`);
    record(handedOut.includes('https://example.test/somewhere'), 'and the link was handed to the browser instead');

    handedOut.length = 0;
    void win.webContents.executeJavaScript(`location.href = 'file:///etc/passwd'`).catch(() => {});
    await delay(1200);
    record(win.webContents.getURL() === home, 'a file: URL did not move the window either');
    record(handedOut.length === 0, 'and a file: URL was NOT handed to the operating system');
  } finally {
    openOutside = restore;
    if (!win.isDestroyed()) win.close();
    await delay(300);
  }
}

/**
 * Start a sidecar Deck owns, then run the production quit path and look for it.
 *
 * The quit path is `shutdown()` — which is what `before-quit`, `will-quit`, the
 * signal handlers and `process.exit` all call — followed by the wait
 * `before-quit` performs. Nothing here is a stand-in: the same functions run,
 * against the same supervisor, holding a real Python process.
 *
 * The pid is checked with `process.kill(pid, 0)`, which sends no signal and
 * only asks whether the process is there. Deck stops what Deck started and
 * nothing else, so a sidecar the cockpit is running is never touched.
 */
async function recordQuit(
  record: (ok: boolean, what: string) => void,
  skip: (what: string) => void,
): Promise<void> {
  let root: string;
  try {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-quit-'));
    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'SNAPSHOT.yaml'), 'project:\n  name: "the quit check"\n');
    fs.writeFileSync(path.join(root, 'docs', 'note.md'), '---\ntype: "[[issue]]"\nid: ISS-0001\n---\n# A note\n');
  } catch (err) {
    skip(`the quit check: a temporary workspace could not be made (${String(err)})`);
    return;
  }

  const added = workspaces.add(root);
  if (!added.ok) {
    skip(`the quit check: ${added.reason}`);
    return;
  }
  let handle;
  try {
    handle = await sidecars.resolve(added.workspace);
  } catch (err) {
    // A machine with no interpreter for the sidecar cannot run this check, and
    // that is a fact about the machine rather than a failure of the quit.
    skip(`the quit check: no sidecar could be started (${err instanceof Error ? err.message : String(err)})`);
    workspaces.remove(added.workspace.id);
    return;
  }
  const child = sidecars.processOf(added.workspace.id);
  if (!handle.ownedByDeck || child === null) {
    skip('the quit check: Deck borrowed a sidecar rather than starting one, so there is nothing of its own to stop');
    workspaces.remove(added.workspace.id);
    return;
  }
  const pid = child.pid ?? 0;
  record(pid > 0 && alivePid(pid), `Deck started a sidecar of its own (pid ${pid})`);

  // The production quit, whole: `shutdown()` is what every quit path calls,
  // and the wait is what `before-quit` performs before letting the app go.
  shutdown();
  await waitForExit(stopping);
  stopping = [];

  record(!alivePid(pid), `the sidecar Deck started is gone after the quit (pid ${pid})`);
  workspaces.remove(added.workspace.id);
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch {
    // A temporary directory left behind is not worth failing the run for.
  }
}

/** Whether this process exists. Signal 0 asks and does not touch it. */
function alivePid(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

interface PreparedWorkspace {
  id: string;
  name: string;
  /** Where it is on disk, so the smoke run can choose a note by reading it. */
  root: string;
}

/**
 * Add the workspace the smoke run drives, before any window opens.
 *
 * `--workspace` names it, and this repository is the default. The default is
 * not a convenience: without it `npm run smoke` opened no workspace, ran the
 * panel checks against one that did not exist, and reported two failures whose
 * cause was nowhere in the output (ISS-0022). Two commands that differ by a
 * flag should not run two different smoke runs.
 */
/**
 * A note in this workspace that still has an unticked criterion.
 *
 * Chosen HERE rather than by walking the navigator in the page, because the
 * page can only see one view's rows and the answer moved underneath the check
 * the first time it ran: closing out six issues ticked every box in the Issues
 * view, and a check that had passed all afternoon went red for a reason that
 * had nothing to do with Deck (ISS-0053). This reads the workspace and names
 * the note, so the run addresses a window straight at it.
 *
 * Returns null when the workspace genuinely has no unticked criterion, which
 * the caller reports as a failure rather than passing over: it means this
 * check measured nothing.
 */
function notesWithAnUntickedCriterion(root: string, most = 500): string[] {
  const docsRoot = docsRootFor(root);
  const found: string[] = [];
  for (const record of walkNotes(docsRoot).records) {
    if (record.relPath.startsWith('__templates__/')) continue;
    let text: string;
    try {
      text = fs.readFileSync(path.join(docsRoot, record.relPath), 'utf-8');
    } catch {
      continue;
    }
    // A blank line before the list, because the sidecar addresses no checkbox
    // on a note whose rendered and source counts disagree, and a list opening
    // straight after a paragraph is what causes that.
    if (/\n\n- \[ \] /.test(text)) found.push(record.id);
    if (found.length >= most) break;
  }
  // ALL of them, not the first few. Whether a checkbox gets an address is the
  // sidecar's judgement about the rendered document, and whether a note has a
  // row is the view's — neither is readable from the source. Capping this at
  // ten returned ten notes that no view lists, so the check reported that no
  // note in the workspace could be ticked while five in the open view could.
  return found;
}

function prepareWorkspace(): PreparedWorkspace | null {
  const wanted = argValue('--workspace') ?? defaultWorkspacePath(__dirname);
  const added = workspaces.add(wanted);
  if (!added.ok) {
    console.log(JSON.stringify({ workspaceRefused: added.reason, path: wanted }));
    return null;
  }
  return { id: added.workspace.id, name: added.workspace.name, root: added.workspace.root };
}

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

/** Call one of Deck's own IPC handlers from the smoke run, without a window. */
async function ipcInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = smokeHandlers.get(channel);
  if (handler === undefined) throw new Error(`no handler for ${channel}`);
  return handler({} as Electron.IpcMainInvokeEvent, ...args);
}

/** The smoke run's keyboard checks need Deck to be the application with the keyboard. */
function focusApp(win: BrowserWindow): void {
  if (process.platform === 'darwin') app.focus({ steal: true });
  win.show();
  win.focus();
  win.webContents.focus();
}

/** Wait for the renderer to finish booting, not merely to finish loading. */
async function untilBooted(win: BrowserWindow, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await win.webContents.executeJavaScript('window.__deckReady === true');
    if (ready === true) return;
    await delay(100);
  }
  throw new Error('a window never finished booting');
}

function once(emitter: Electron.WebContents, event: string): Promise<void> {
  return new Promise((resolve) => emitter.once(event as 'did-finish-load', () => resolve()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
