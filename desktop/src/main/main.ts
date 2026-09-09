/**
 * Deck's main process: the store, the windows, the sidecars and the host.
 *
 * The window loads its page from Deck's own HTTP host rather than from a file,
 * so the shell and a tablet run identical bytes over one origin (ADR-0001).
 */
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, app, clipboard, dialog, ipcMain, screen, shell } from 'electron';
import { SHELL_CAPABILITIES, SERVED_CAPABILITIES } from '../shared/capability.js';
import { type DeckAction, isRendererAction } from '../shared/store-state.js';
import type { WindowRole } from '../shared/types.js';
import { tryParseAddress } from '../shared/address.js';
import { DeckHost } from './host.js';
import { DeckStore } from './store.js';
import { SidecarSupervisor, freePort, waitForExit } from './sidecar.js';
import { WorkspaceBook } from './workspaces.js';
import { PanelBook, WindowBook } from './window-book.js';
import { type DisplayInfo, boundsKey, placeWindow } from './window-placement.js';
import { NoteIndex, docsRootFor, pathPrefixFor } from './note-index.js';
import { SidecarWriteClient, WriteRefused } from '../shared/write-client.js';
import { sameOriginAs } from '../shared/origin.js';
import { defaultWorkspacePath, smokeVerdict } from './smoke-support.js';

// Pinned before anything reads it: Electron derives this from the app name,
// and a later rename would strand the settings written under the old one.
//
// A smoke run gets a directory of its own, so it neither reads nor writes the
// state of a Deck a person is actually using, and so two smoke runs cannot
// affect each other.
app.setPath(
  'userData',
  process.argv.includes('--smoke')
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

const host = new DeckHost({
  webRoot: WEB_ROOT,
  // A page this host serves can read. It is not the shell and does not pretend to be.
  capabilities: SERVED_CAPABILITIES,
  listWorkspaces: () => workspaces.list(),
  sidecarBaseFor: (id) => sidecars.handle(id)?.base ?? null,
  onSidecarUnreachable: (id) => sidecars.forget(id),
  isSidecarStarting: (id) => sidecars.isStarting(id),
  indexFor: (id) => indexes.get(id)?.snapshot() ?? null,
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

function createWindow(role: WindowRole, address: string | null, panel: string | null): BrowserWindow {
  const key = boundsKey(role, panel, panelSubject(panel, address));
  const bounds = placeWindow(windowBook.get(key), displays());
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
    if (sameOriginAs(hostOrigin, url)) return;
    event.preventDefault();
    // Opened where a link belongs, which is the person's browser. Refusing
    // silently would make a link in a note look broken.
    void shell.openExternal(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!sameOriginAs(hostOrigin, url)) void shell.openExternal(url);
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
    write(String(request?.workspaceId ?? ''), (client, actor) =>
      client.transition({
        id: String(request['id'] ?? ''),
        to: String(request['to'] ?? ''),
        actor,
        ...(typeof request['mtime'] === 'number' ? { mtime: request['mtime'] } : {}),
        ...(typeof request['option'] === 'string' ? { option: request['option'] } : {}),
      }),
    ),
  );

  handle('deck:write:tick', async (_e, request: { workspaceId: string } & Record<string, unknown>) =>
    write(String(request?.workspaceId ?? ''), (client, actor) =>
      client.tick({
        id: String(request['id'] ?? ''),
        criterion: String(request['criterion'] ?? ''),
        evidence: String(request['evidence'] ?? ''),
        actor,
        ...(typeof request['mtime'] === 'number' ? { mtime: request['mtime'] } : {}),
      }),
    ),
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
  let drawnCards: string[] = [];
  const record = (ok: boolean, what: string): void => {
    if (!ok) failures.push(what);
  };
  const skip = (what: string): void => {
    skipped.push(what);
  };
  try {
    // The workspace has to exist before the first window boots: the rail is
    // drawn once at start, and a window that opened on an empty rail stays empty.
    const prepared = prepareWorkspace();
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


    console.log(JSON.stringify(smokeVerdict(failures, skipped), null, 2));
  } catch (err) {
    console.log(JSON.stringify(smokeVerdict([...failures, String(err)], skipped), null, 2));
    failures.push('threw');
  }
  shutdown();
  // Give SIGTERM a moment to reach the children before the process goes.
  await delay(400);
  app.exit(smokeVerdict(failures, skipped).ok ? 0 : 1);
}

interface PreparedWorkspace {
  id: string;
  name: string;
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
function prepareWorkspace(): PreparedWorkspace | null {
  const wanted = argValue('--workspace') ?? defaultWorkspacePath(__dirname);
  const added = workspaces.add(wanted);
  if (!added.ok) {
    console.log(JSON.stringify({ workspaceRefused: added.reason, path: wanted }));
    return null;
  }
  return { id: added.workspace.id, name: added.workspace.name };
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
