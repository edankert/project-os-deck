/**
 * Deck's main process: the store, the windows, the sidecars and the host.
 *
 * The window loads its page from Deck's own HTTP host rather than from a file,
 * so the shell and a tablet run identical bytes over one origin (ADR-0001).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, app, clipboard, dialog, ipcMain, screen } from 'electron';
import { SHELL_CAPABILITIES, SERVED_CAPABILITIES } from '../shared/capability.js';
import { type DeckAction } from '../shared/store-state.js';
import type { WindowRole } from '../shared/types.js';
import { tryParseAddress } from '../shared/address.js';
import { DeckHost } from './host.js';
import { DeckStore } from './store.js';
import { SidecarSupervisor, freePort } from './sidecar.js';
import { WorkspaceBook } from './workspaces.js';
import { WindowBook } from './window-book.js';
import { type DisplayInfo, boundsKey, placeWindow } from './window-placement.js';

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
const sidecars = new SidecarSupervisor();

const host = new DeckHost({
  webRoot: WEB_ROOT,
  // A page this host serves can read. It is not the shell and does not pretend to be.
  capabilities: SERVED_CAPABILITIES,
  listWorkspaces: () => workspaces.list(),
  sidecarBaseFor: (id) => sidecars.handle(id)?.base ?? null,
  onSidecarUnreachable: (id) => sidecars.forget(id),
});

interface WindowInfo {
  role: WindowRole;
  panel: string | null;
  address: string | null;
  unsubscribe: () => void;
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

function createWindow(role: WindowRole, address: string | null, panel: string | null): BrowserWindow {
  const key = boundsKey(role, panel);
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

  win.once('ready-to-show', () => {
    // A satellite appears without taking the keyboard from the window in use.
    if (role === 'focus') win.show();
    else win.showInactive();
  });

  const unsubscribe = store.subscribe((state) => {
    if (!win.isDestroyed()) win.webContents.send('deck:state', state);
  });
  windowInfo.set(win.id, { role, panel, address, unsubscribe });
  if (role === 'focus') focusWindowId = win.id;

  const saveBounds = (): void => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const b = win.getBounds();
    const display = screen.getDisplayMatching(b);
    windowBook.set(key, { ...b, displayId: display.id });
  };
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
    windowInfo.get(win.id)?.unsubscribe();
    windowInfo.delete(win.id);
    if (focusWindowId === win.id) {
      // Promote a satellite rather than leaving Deck with no navigator.
      focusWindowId = null;
      for (const [id, info] of windowInfo) {
        if (info.role === 'satellite') {
          info.role = 'focus';
          focusWindowId = id;
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
    return { ok: true };
  });

  handle('deck:workspaces:open', async (_e, id: string) => {
    const workspace = workspaces.get(id);
    if (workspace === null) return { ok: false, error: `no workspace with id ${id}` };
    try {
      const handle = await sidecars.resolve(workspace);
      store.dispatch({ type: 'open-workspace', workspaceId: id });
      return { ok: true, borrowed: !handle.ownedByDeck };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle('deck:state:get', () => store.getState());
  handle('deck:state:dispatch', (_e, action: DeckAction) => store.dispatch(action));
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
    createWindow('satellite', address, parsed.address.panel);
    return { ok: true };
  });

  handle('deck:clipboard:write', (_e, text: string) => {
    clipboard.writeText(String(text));
    return { ok: true };
  });
  handle('deck:clipboard:read', () => ({ ok: true, text: clipboard.readText() }));
}

async function startHost(): Promise<void> {
  const bindLan = process.argv.includes('--lan');
  const port = await freePort(7300, 7399);
  const listening = await host.listen(port, bindLan ? '0.0.0.0' : '127.0.0.1');
  hostOrigin = `http://127.0.0.1:${listening.port}`;
  console.log(`deck: serving ${WEB_ROOT} on ${listening.address}:${listening.port}`);
}

app.whenReady().then(async () => {
  registerIpc();
  await startHost();
  if (process.argv.includes('--smoke')) {
    await runSmoke();
    return;
  }
  createWindow('focus', null, null);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow('focus', null, null);
  });
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
function shutdown(): void {
  if (shutDown) return;
  shutDown = true;
  store.close();
  sidecars.stopAll();
  void host.close();
}

app.on('before-quit', shutdown);
app.on('will-quit', shutdown);
process.once('exit', shutdown);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    shutdown();
    app.exit(1);
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
  const record = (ok: boolean, what: string): void => {
    if (!ok) failures.push(what);
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

      // The window booted before the workspace was opened, so give it the rail again.
      focus.webContents.reload();
      await once(focus.webContents, 'did-finish-load');
      await untilBooted(focus);
      await delay(1500);
      const drawn = (await focus.webContents.executeJavaScript(
        `({ cards: Array.from(document.querySelectorAll('.card:not([hidden]) .id')).map((e) => e.textContent), views: Array.from(document.querySelectorAll('#switcher button')).map((e) => e.textContent), status: document.getElementById('status').textContent })`,
      )) as { cards: string[]; views: string[]; status: string };
      record(drawn.cards.length > 0, 'the desk drew cards from the real workspace');
      record(drawn.views.length > 0, 'the switcher drew the views the provider returned');
      console.log(
        JSON.stringify(
          {
            workspace: prepared.name,
            sidecar: base,
            borrowedFromTheCockpit: opened.borrowed === true,
            itemsInTheProxiedPayload: items,
            viewsFromTheProvider: drawn.views,
            cardsOnTheDesk: drawn.cards.length,
            firstCards: drawn.cards.slice(0, 10),
            status: drawn.status,
          },
          null,
          2,
        ),
      );
      // Cards come from a pool. Switching to a smaller view must not create a
      // second set of elements, and switching back must not grow the pool.
      const poolBefore = (await focus.webContents.executeJavaScript(
        `document.querySelectorAll('.card').length`,
      )) as number;
      await focus.webContents.executeJavaScript(
        `document.querySelectorAll('#switcher button')[3].click()`,
      );
      await delay(2000);
      const afterSwitch = (await focus.webContents.executeJavaScript(
        `({ total: document.querySelectorAll('.card').length, visible: document.querySelectorAll('.card:not([hidden])').length })`,
      )) as { total: number; visible: number };
      record(
        afterSwitch.total <= poolBefore,
        `the pool did not grow when the view changed (${poolBefore} then ${afterSwitch.total})`,
      );
      record(afterSwitch.visible <= afterSwitch.total, 'no more cards are shown than the pool holds');
      await focus.webContents.executeJavaScript(
        `document.querySelectorAll('#switcher button')[2].click()`,
      );
      await delay(2000);

      // Open a card: the reader has to fill from the sidecar's rendered note.
      await focus.webContents.executeJavaScript(`document.querySelector('.card:not([hidden])').click()`);
      await delay(1500);
      const readerText = (await focus.webContents.executeJavaScript(
        `document.getElementById('reader').textContent.trim().slice(0, 80)`,
      )) as string;
      record(readerText.length > 20, `the reader filled from the note (saw: ${readerText.slice(0, 40)})`);

      // The address round trip, in the running application rather than a test.
      await focus.webContents.executeJavaScript(`document.getElementById('copy-address').click()`);
      await delay(400);
      const copied = clipboard.readText();
      const parsed = tryParseAddress(copied);
      record(parsed.ok, `the copied address parses (${copied})`);
      if (parsed.ok) {
        record(parsed.address.workspaceId === prepared.id, 'the address names the open workspace');
        record(parsed.address.note !== null, 'the address carries the focused note');
      }

      // A desk saved in the main process reaches the window that is drawing.
      store.dispatch({
        type: 'save-desk',
        desk: { name: 'smoke', workspaceId: prepared.id, cards: [{ noteId: drawn.cards[0] ?? '', x: 12, y: 34 }] },
      });
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

    const refused = await fetch(`${hostOrigin}/deck/capabilities`, { method: 'POST' });
    record(refused.status === 405, 'the host refuses a POST with 405');

    const satellite = createWindow('satellite', null, 'status');
    await once(satellite.webContents, 'did-finish-load');
    await untilBooted(satellite);
    record(!satellite.isFocused(), 'the satellite did not take focus');
    const satelliteChrome = (await satellite.webContents.executeJavaScript(
      `({ views: document.querySelectorAll('#switcher button').length, rail: getComputedStyle(document.getElementById('rail')).display, popOut: getComputedStyle(document.getElementById('pop-out')).display })`,
    )) as { views: number; rail: string; popOut: string };
    record(satelliteChrome.views === 0, 'the satellite drew no switcher, so it owns no navigation');
    record(satelliteChrome.rail === 'none', 'the satellite drew no workspace rail');

    store.dispatch({ type: 'focus-note', noteId: 'FEAT-0002' });
    await delay(300);
    const seen = (await satellite.webContents.executeJavaScript(
      'window.__deckLastState ? window.__deckLastState.noteId : null',
    )) as string | null;
    record(seen === 'FEAT-0002', 'the satellite saw the focused note change');

    // Closing the window that owns navigation must not leave Deck without one.
    focus.close();
    await delay(500);
    const promoted = windowInfo.get(satellite.id)?.role;
    record(promoted === 'focus', `a satellite was promoted when the focus window closed (it is now ${promoted})`);
    record(focusWindowId === satellite.id, 'the promoted window owns navigation');

    console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, failures: [String(err)] }, null, 2));
    failures.push('threw');
  }
  shutdown();
  // Give SIGTERM a moment to reach the children before the process goes.
  await delay(400);
  app.exit(failures.length === 0 ? 0 : 1);
}

interface PreparedWorkspace {
  id: string;
  name: string;
}

/** Add the workspace named on the command line, before any window opens. */
function prepareWorkspace(): PreparedWorkspace | null {
  const wanted = argValue('--workspace');
  if (wanted === null) return null;
  const added = workspaces.add(wanted);
  if (!added.ok) {
    console.log(JSON.stringify({ workspaceRefused: added.reason }));
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
