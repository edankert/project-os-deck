/**
 * Deck's main process: the store, the window, the sidecars, the host, the agent
 * sessions and the shells. Since 2026-10-23 Deck is the overview (ADR-0010):
 * one window, which a person may open again, and no satellites.
 *
 * The window loads its page from Deck's own HTTP host rather than from a file,
 * so the shell and a tablet run identical bytes over one origin (ADR-0001).
 */
import type { ChildProcess } from 'node:child_process';
import { runDrive } from './drive.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserWindow, app, clipboard, dialog, ipcMain, screen, shell } from 'electron';
import { SHELL_CAPABILITIES, SERVED_CAPABILITIES } from '../shared/capability.js';
import { type DeckAction, isRendererAction } from '../shared/store-state.js';
import { addressFor, formatAddress } from '../shared/address.js';
import { DeckHost } from './host.js';
import { DeckStore } from './store.js';
import { SidecarSupervisor, freePort, waitForExit } from './sidecar.js';
import { WorkspaceBook } from './workspaces.js';
import { WindowBook } from './window-book.js';
import { type DisplayInfo, type SavedBounds, boundsKey, placeWindow } from './window-placement.js';
import { NoteIndex, docsRootFor, pathPrefixFor } from './note-index.js';
import { OverviewService } from './overview-service.js';
import {
  DESIGN_VERDICT_ENDPOINT,
  SidecarWriteClient,
  WriteRefused,
  tickRequestFrom,
  transitionRequestFrom,
} from '../shared/write-client.js';
import { navigationFor } from '../shared/origin.js';
import { defaultWorkspacePath, focusPolicy, pinnedCorpus, SMOKE_CORPUS, smokeVerdict } from './smoke-support.js';
import { SessionManager } from './agents/sessions.js';
import { SidecarReporter } from './agents/sidecar-report.js';
import { ClaudeProvider } from './agents/claude-provider.js';
import { CodexProvider } from './agents/codex-provider.js';
import { registerAgentCalls } from './agents/ipc.js';
import { ShellManager, loadPty, registerShellCalls } from './shells.js';
import type { AgentProvider } from './agents/provider.js';
import type { AgentKind } from '../shared/agent-types.js';

// Read once, at start, so every window in a run is treated the same way
// (ISS-0075). `focusApp` consults it; `runSmoke` prints it.
const FOCUS = focusPolicy(process.argv, process.env);

// Pinned before anything reads it: Electron derives this from the app name,
// and a later rename would strand the settings written under the old one.
//
// A smoke run gets a directory of its own, so it neither reads nor writes the
// state of a Deck a person is actually using, and so two smoke runs cannot
// affect each other.
app.setPath(
  'userData',
  process.argv.includes('--smoke') || process.argv.includes('--drive')
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'deck-smoke-'))
    : path.join(app.getPath('appData'), 'project-os-deck'),
);

const WEB_ROOT = path.join(__dirname, '..', 'web');
const PRELOAD = path.join(__dirname, '..', 'preload.js');

const store = new DeckStore({ file: path.join(app.getPath('userData'), 'deck-state.json') });
const workspaces = new WorkspaceBook(path.join(app.getPath('userData'), 'deck-workspaces.json'));
const windowBook = new WindowBook(path.join(app.getPath('userData'), 'deck-windows.json'));
const sidecars = new SidecarSupervisor();
/**
 * Deck's own agent sessions (FEAT-0032, ADR-0009): kept in Deck's data folder, never in a
 * repository, reported to each workspace's sidecar, and reached only through the shell's
 * preload bridge (RISK-0015).
 */
/**
 * In a scripted drive, and only there, `--fake-agents <script.json>` plays the suite's fake
 * provider instead of a real agent (TASK-0201): the walk shows the session screens with invented
 * words and reaches no model. Its sessions are kept in a temporary folder, not Deck's own.
 */
const fakeAgentScript = process.argv.includes('--drive') ? argValue('--fake-agents') : null;
const agentSessions = fakeAgentScript === null
  ? new SessionManager(path.join(app.getPath('userData'), 'agents'), { claude: new ClaudeProvider(), codex: new CodexProvider() })
  : new SessionManager(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-drive-agents-')), fakeAgents(fakeAgentScript));

function fakeAgents(scriptPath: string): Record<AgentKind, AgentProvider> {
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8')) as Partial<Record<AgentKind, unknown[]>> & { delay?: number };
  type Fake = { fakeProvider(agent: AgentKind, script: unknown[], options: { id: string; delay: number }): AgentProvider };
  // The suite's own fake, an ES module, loaded the way the Agent SDK is.
  const fake = (new Function('specifier', 'return import(specifier)') as (s: string) => Promise<Fake>)(pathToFileURL(path.join(__dirname, '..', '..', 'tests', 'fake-agent.mjs')).href);
  let n = 0;
  const one = (agent: AgentKind): AgentProvider => ({
    agent,
    start: async (options, hooks) => {
      // Each hook the fake calls goes to the drive's log, so a walk that fails says what the agent did.
      const said = (name: string): void => console.log(`deck: fake ${agent} ${name}`);
      const logged: typeof hooks = { ...hooks, turnEnded: () => { said('turn ended'); hooks.turnEnded(); }, ended: (reason) => { said(`ended ${reason ?? ''}`); hooks.ended(reason); }, ask: (r) => { said(`asks ${r.id}`); return hooks.ask(r); } };
      return (await fake).fakeProvider(agent, script[agent] ?? [], { id: `fake-${agent}-${(n += 1)}`, delay: script.delay ?? 500 }).start(options, logged);
    },
  });
  return { claude: one('claude'), codex: one('codex') };
}
/** Plain shells for the drawer (FEAT-0035): node-pty where it installed, none where it did not. */
const shells = new ShellManager(loadPty());
shells.onEvent((e) => {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('deck:shells:event', e);
});
const agentReports = new SidecarReporter(agentSessions, (id) => sidecars.handle(id)?.base ?? null);
agentSessions.onChange((change) => {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('deck:agents:change', change);
});
// In a drive with the fake agent, every change goes to the log in order (TASK-0201's walk).
if (fakeAgentScript !== null) {
  agentSessions.onChange(({ sessionId, change }) => {
    const c = change.kind === 'session' ? `session ${change.session.state}` : `record ${change.record.kind}${'state' in change.record ? ` ${change.record.state}` : 'outcome' in change.record ? ` ${change.record.outcome}` : ''}`;
    console.log(`deck: change ${sessionId.slice(0, 8)} ${c} -> ${agentSessions.get(sessionId)?.state}`);
  });
}

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

const overviews = new OverviewService();

const host = new DeckHost({
  webRoot: WEB_ROOT,
  // A page this host serves can read. It is not the shell and does not pretend to be.
  capabilities: SERVED_CAPABILITIES,
  listWorkspaces: () => workspaces.list(),
  sidecarBaseFor: (id) => sidecars.handle(id)?.base ?? null,
  docsRootFor: (id) => { const workspace = workspaces.get(id); return workspace ? docsRootFor(workspace.root) : null; },
  onSidecarUnreachable: (id) => sidecars.forget(id),
  isSidecarStarting: (id) => sidecars.isStarting(id),
  indexFor: (id) => indexes.get(id)?.snapshot() ?? null,
  overviewFor: (id) => {
    const workspace = workspaces.get(id);
    const snapshot = indexes.get(id)?.snapshot();
    return workspace && snapshot ? overviews.read(snapshot, workspace) : null;
  },
  // A tablet follows the Mac's state by READING it (TASK-0057). Nothing a
  // served page sends can reach the store: this host answers 405 to every
  // method that is not a read, and the page has no bridge.
  state: () => store.getState(),
  subscribeState: (fn) => store.subscribe(fn),
});

interface WindowInfo {
  unsubscribe: () => void;
  /** Write this window's geometry now, wherever the quit came from. */
  saveBounds: () => void;
}

const windowInfo = new Map<number, WindowInfo>();
let hostOrigin = '';
/** The port Deck's host is listening on, for a check that must not use loopback. */
let hostPort = 0;

function displays(): DisplayInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    workArea: { x: d.workArea.x, y: d.workArea.y, width: d.workArea.width, height: d.workArea.height },
    primary: d.id === screen.getPrimaryDisplay().id,
  }));
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

/**
 * Deck's window, at an address or at the overview Deck opens on.
 *
 * Every window is the same: the satellites and pop-out panels that carried one
 * thing left with Spread (ADR-0010). Its geometry is kept under the key the
 * main window always had, so a window comes back where it was left.
 */
function createWindow(address: string | null): BrowserWindow {
  const key = boundsKey('focus', null, null);
  const bounds = placeWindow(windowBook.get(key), displays());
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 520,
    minHeight: 380,
    title: 'Deck',
    show: false,
    backgroundColor: '#12141a',
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });

  const query = new URLSearchParams();
  if (address !== null) query.set('address', address);
  void win.loadURL(`${hostOrigin}/${query.size > 0 ? `?${query.toString()}` : ''}`);

  // **The bridge belongs to the origin, not to the window** (ISS-0029). A
  // preload runs on every document its `webContents` loads, so without these
  // two guards `window.deck.write.*` — the write channel, since 2026-09-09 —
  // would still be there after the window navigated somewhere Deck does not
  // serve. The ticket screen injects markup the sidecar rendered from a note's
  // own Markdown, and the page's policy stops a script and a form but not a
  // link somebody clicks.
  win.webContents.on('will-navigate', (event, url) => {
    const decision = navigationFor(hostOrigin, url);
    if (decision === 'follow') return;
    event.preventDefault();
    if (decision === 'open-outside') openOutside(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (navigationFor(hostOrigin, url) === 'open-outside') openOutside(url);
    // Never `allow`. A new window would carry this preload with it.
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => win.show());

  const unsubscribe = store.subscribe((state) => {
    if (!win.isDestroyed()) win.webContents.send('deck:state', state);
  });

  const saveBounds = (): void => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const b = win.getBounds();
    const display = screen.getDisplayMatching(b);
    windowBook.set(key, { ...b, displayId: display.id });
  };

  windowInfo.set(win.id, { unsubscribe, saveBounds });
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
  // A window names a workspace; Deck's own list says where it is.
  registerAgentCalls(handle as (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void, agentSessions, (id) => workspaces.get(id)?.root ?? null, (id) => sidecars.handle(id)?.base ?? null, { secretFor: (id) => sidecars.secretFor(id), actor: () => store.getState().actor });
  registerShellCalls(handle as (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void, shells, {
    workspace: (id) => workspaces.get(id)?.root ?? null,
    // A session's shell opens in its own folder: its worktree when it has one.
    session: (id) => agentSessions.get(id)?.folder ?? null,
  });

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
    overviews.forget(id);
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

  for (const verb of ['decide', 'mark-check', 'acceptance-run'] as const) {
    handle(`deck:write:${verb}`, async (_e, request: Record<string, unknown>) =>
      write(String(request?.['workspaceId'] ?? ''), (client, actor) => client.flow(verb, request, actor)));
  }

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
    if (process.argv.includes('--drive')) {
      // A scripted walk with a real pointer that keeps pictures (drive.ts).
      const script = argValue('--drive');
      const out = argValue('--drive-out');
      if (!script || !out) throw new Error('--drive needs a script, and --drive-out a directory for its pictures');
      const prepared = prepareWorkspace();
      if (prepared === null) throw new Error('--drive could not open the workspace');
      await ipcInvoke('deck:workspaces:open', prepared.id);
      const ok = await runDrive(
        {
          store,
          createWindow: (address) => createWindow(address),
          untilBooted,
          focusApp,
          prepared,
          origin: hostOrigin,
          openServedPage: () => {
            const page = new BrowserWindow({ width: 900, height: 700, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
            void page.loadURL(`${hostOrigin}/`);
            return page;
          },
        },
        script,
        out,
      );
      shutdown();
      await waitForExit(stopping);
      app.exit(ok ? 0 : 1);
      return;
    }
    createWindow(null);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(null);
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
  // An agent must not run on with nobody to answer it: every session Deck started stops with Deck. A quit
  // has already waited for this in `stopAgents`; a hard exit only gets to signal it.
  if (!agentsStopped) void agentSessions.stopAll();
  // Every shell Deck opened ends with it (FEAT-0035).
  shells.closeAll();
  agentReports.close();
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
let agentsStopped = false;
/**
 * Every session stopped and every report to the sidecar sent, before the sidecars themselves stop, so the
 * cockpit hears each session end (review, round one). Capped, so an agent slow to stop cannot hold the quit.
 */
async function stopAgents(): Promise<void> {
  if (agentsStopped) return;
  const all = (async () => {
    await agentSessions.stopAll();
    await agentReports.settled();
  })().catch(() => undefined);
  await Promise.race([all, new Promise((resolve) => setTimeout(resolve, 3000))]);
  agentsStopped = true;
}

let quitHeld = false;
app.on('before-quit', (event) => {
  if (!agentsStopped && !shutDown) {
    event.preventDefault();
    void stopAgents().then(() => app.quit());
    return;
  }
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
app.on('quit', () => {
  if (smokeCorpusDir === null) return;
  try {
    fs.rmSync(smokeCorpusDir, { recursive: true, force: true });
  } catch {
    // A temporary copy left behind is not worth failing the run for.
  }
});
process.once('exit', shutdown);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    // The same wait the GUI quit does. `app.exit` never raises `before-quit`,
    // so without this the signal path stopped the sidecars and left at once,
    // and `stopOne`'s SIGKILL escalation is an `unref`'d timer that cannot
    // fire from a process that has gone. A sidecar slow on SIGTERM outlived
    // Deck on `kill -TERM`, which is how a terminal-launched Deck is stopped.
    void stopAgents().finally(() => {
      shutdown();
      void waitForExit(stopping).finally(() => {
        app.exit(1);
      });
    });
  });
}

/**
 * A boot that proves the real Electron runtime works, without a person.
 *
 * It opens Deck's window on a workspace and checks that the overview is drawn
 * and that nothing of Spread or Glass is (ADR-0010). Then the served page a
 * tablet loads, the renderer's own guards, the tablet's routes over the
 * network and the quit. It prints a JSON verdict and exits non-zero on failure.
 */
async function runSmoke(): Promise<void> {
  // Said before the first window opens, so the first sign of a run that takes
  // the keyboard is a sentence rather than the window arriving (ISS-0075).
  console.log(`deck: smoke run — ${FOCUS.why}`);
  const failures: string[] = [];
  /**
   * Checks that need a workspace and did not get one. A check that cannot run
   * says so, by name, and is never counted as a pass either (ISS-0022).
   */
  const skipped: string[] = [];
  /**
   * Checks belonging to a configuration this run is not. The tablet-shaped
   * ones need `--lan`: a loopback run has not failed to make them.
   */
  const notApplicable: string[] = [];
  /** How many checks held. The verdict lists the ones that did not; this is what lets a run say how many were made. */
  let passed = 0;
  const record = (ok: boolean, what: string): void => {
    // One line per check when asked, so a run can be read as it goes and its checks counted.
    if (process.env['DECK_SMOKE_DEBUG'] === '1') console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
    if (ok) passed += 1;
    else failures.push(what);
  };
  /** Said before each section when every check is printed, so a line can be placed. */
  const section = (name: string): void => {
    if (process.env['DECK_SMOKE_DEBUG'] === '1') console.log(`==== ${name} ====`);
  };
  const skip = (what: string): void => {
    skipped.push(what);
  };
  const notHere = (what: string): void => {
    notApplicable.push(what);
  };
  /** The verdict, and with every check printed, how many checks the run made. */
  const verdict = (extra: string[] = []): void => {
    const all = [...failures, ...extra];
    if (process.env['DECK_SMOKE_DEBUG'] === '1') {
      console.log(`==== ${passed} passed, ${all.length} failed, ${skipped.length} skipped, ${notApplicable.length} not applicable ====`);
    }
    console.log(JSON.stringify(smokeVerdict(all, skipped, notApplicable), null, 2));
  };
  try {
    // The workspace exists, and its sidecar answers, before the window boots: the window opens the first
    // workspace in the rail on the wheel.
    const prepared = prepareWorkspace();
    section('the window and the workspace');
    if (prepared === null) skip('the workspace checks: no workspace could be added');
    else {
      const opened = (await ipcInvoke('deck:workspaces:open', prepared.id)) as { ok: boolean; error?: string };
      record(opened.ok, `the workspace opened${opened.error === undefined ? '' : `: ${opened.error}`}`);
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
    }

    const focus = createWindow(null);
    await once(focus.webContents, 'did-finish-load');
    await untilBooted(focus);
    const title = (await focus.webContents.executeJavaScript('document.title')) as string;
    record(typeof title === 'string' && title.length > 0, 'the window rendered a title');

    section('the overview');
    if (prepared === null) skip('the overview: no workspace was opened');
    else {
      const screen = await screenOf(focus);
      record(screen === 'wheel', `Deck opened on the wheel (it shows ${screen ?? 'nothing'})`);
      const drawn = (await focus.webContents.executeJavaScript(`({
        rows: (window.__deckOverview.current() || { list: [] }).list.length,
        tickets: document.querySelectorAll('#overview-area [data-ticket]').length,
        gone: ['switcher', 'surface-toggle', 'navigator', 'desk-area', 'field-area', 'reader', 'pop-out', 'scenes'].filter((id) => document.getElementById(id) !== null),
        shells: document.getElementById('shells-toggle') !== null,
      })`)) as { rows: number; tickets: number; gone: string[]; shells: boolean };
      record(drawn.tickets > 0, `the wheel draws the workspace's tickets (${drawn.tickets})`);
      record(drawn.rows > 0, `the wheel's list twin holds its rows (${drawn.rows})`);
      record(drawn.gone.length === 0, `nothing of Spread or Glass is in the page${drawn.gone.length === 0 ? '' : ` (${drawn.gone.join(', ')})`}`);
      record(drawn.shells, 'the rail offers the shell drawer');
      // An address from before 2026-10-23, naming the Spread surface: the wheel, and a line saying so.
      // Followed from another screen, so arriving on the wheel is something the address did.
      await focus.webContents.executeJavaScript(`window.__deckOverview.go(${JSON.stringify(formatAddress(addressFor(prepared.id, 'features', { page: 'rephase' })))})`);
      const before = await screenOf(focus);
      record(before === 'rephase', `the re-phasing screen opens from its address (it shows ${before ?? 'nothing'})`);
      const old = formatAddress(addressFor(prepared.id, 'features', { surface: 'spread' }));
      await focus.webContents.executeJavaScript(`window.__deckOverview.go(${JSON.stringify(old)})`);
      await delay(600);
      const after = (await focus.webContents.executeJavaScript(`({ screen: (window.__deckOverview.current() || {}).screen || null, said: document.getElementById('status').textContent })`)) as { screen: string | null; said: string };
      record(after.screen === 'wheel' && /not in this Deck/.test(after.said), `an address naming the Spread surface opens the wheel and says so ("${after.said}")`);
      const image = await focus.webContents.capturePage();
      const shot = path.join(app.getPath('temp'), 'deck-overview.png');
      fs.writeFileSync(shot, image.toPNG());
      console.log(JSON.stringify({ screenshot: shot }));
    }

    const caps = (await focus.webContents.executeJavaScript('window.deck ? window.deck.capabilities() : null')) as Record<string, unknown> | null;
    record(caps?.['write'] === true, 'the shell reports the write capability');
    record(caps?.['agents'] === true && caps?.['shells'] === true, 'the shell reports agent sessions and shells');
    const servedCaps = (await (await fetch(`${hostOrigin}/deck/capabilities`)).json()) as Record<string, unknown>;
    // The tablet does not write, and the verbs are ABSENT rather than disabled (ADR-0003).
    record(servedCaps['write'] === false, 'the served host reports no write capability');
    record(servedCaps['agents'] === false && servedCaps['shells'] === false, 'the served host reports no agent sessions and no shells');

    section('the navigation guard');
    await recordNavigationGuard(record);

    // **What a tablet loads**: a page with no bridge, opened here rather than needing a tablet.
    section('the served page');
    await recordServedPage(record, skip, prepared);

    // **The renderer's own guard, driven in a real window.** It cannot be a node check:
    // `node --test` cannot load the renderer at all (ISS-0008), which is how a deletable
    // Content-Security-Policy tag survived a full green suite.
    section('a script in a note does not run');
    await recordScriptInANoteDoesNotRun(record);

    // **What a tablet actually gets**, from the machine's own network address
    // rather than from loopback, which is the only way to exercise the path a
    // tablet takes (TST-0010).
    section('from the network');
    await recordFromTheNetwork(record, skip, notHere, prepared);

    // **The quit, measured against a REAL sidecar Deck started** (TST-0011, ISS-0021). A
    // temporary workspace with no `.cockpit/url` forces Deck to start its own child rather
    // than borrow one, so what is measured is a process Deck owns and is therefore Deck's to stop.
    section('the quit');
    await recordQuit(record, skip);

    verdict();
  } catch (err) {
    verdict([String(err)]);
    failures.push('threw');
  }
  shutdown();
  // Give SIGTERM a moment to reach the children before the process goes.
  await delay(400);
  app.exit(smokeVerdict(failures, skipped, notApplicable).ok ? 0 : 1);
}

/** Which overview screen a window shows, waited for: the model is read and drawn after boot. */
async function screenOf(win: BrowserWindow, timeoutMs = 20_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const screen = (await win.webContents.executeJavaScript(`(window.__deckOverview && window.__deckOverview.current() || {}).screen || null`)) as string | null;
    if (screen !== null) return screen;
    await delay(200);
  }
  return null;
}

/**
 * A script inside a note's markup does not run (ISS-0038).
 *
 * The ticket screen sets `innerHTML` from the sidecar's rendered Markdown,
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
  const win = createWindow(null);
  try {
    await once(win.webContents, 'did-finish-load');
    await untilBooted(win);
    const ran = await win.webContents.executeJavaScript(`
      (() => {
        window.__scriptInANoteRan = false;
        const host = document.createElement('div');
        // The route a note's text takes: innerHTML on an element of the page.
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
 * A page with no bridge shows the overview, and offers nothing that writes.
 *
 * The window is opened WITHOUT the preload, so the page is served exactly as a
 * tablet is: it fetches the served capability set and reads `/deck/state`. It
 * should draw the wheel of the workspace the Mac has open, and no name to write
 * with, no shell drawer and no agent session (ADR-0003, RISK-0015).
 */
async function recordServedPage(
  record: (ok: boolean, what: string) => void,
  skip: (what: string) => void,
  prepared: PreparedWorkspace | null,
): Promise<void> {
  if (prepared === null) {
    skip('the served page: no workspace was opened');
    return;
  }
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    void win.loadURL(`${hostOrigin}/`);
    await once(win.webContents, 'did-finish-load');
    await untilBooted(win);
    const seen = (await win.webContents.executeJavaScript(
      `({ bridge: typeof window.deck, mark: document.getElementById('host-mark').textContent, actor: !document.getElementById('actor').hidden, shells: document.getElementById('shells-toggle') !== null })`,
    )) as { bridge: string; mark: string; actor: boolean; shells: boolean };
    record(seen.bridge === 'undefined', 'the served page has no bridge, as on a tablet');
    record(/read only/.test(seen.mark), `the served page says it is read only ("${seen.mark}")`);
    const screen = await screenOf(win);
    record(screen === 'wheel', `the served page opens on the wheel (it shows ${screen ?? 'nothing'})`);
    record(!seen.actor, 'the served page shows no name to write with');
    record(!seen.shells, 'the served page offers no shell drawer');
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
  const win = createWindow(null);
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
/** The smoke run's pinned copy of this repository's notes, removed when Deck quits (TASK-0171). */
let smokeCorpusDir: string | null = null;

function prepareWorkspace(): PreparedWorkspace | null {
  const named = argValue('--workspace');
  let wanted = named ?? defaultWorkspacePath(__dirname);
  // The smoke run reads this repository's notes at a pinned commit unless it is told to
  // read a workspace live: a new note must not change what its checks pick (ISS-0092).
  if (named === null && process.argv.includes('--smoke') && !process.argv.includes('--live-corpus')) {
    smokeCorpusDir = pinnedCorpus(wanted, path.join(app.getPath('temp'), `deck-smoke-corpus-${process.pid}`));
    console.log(JSON.stringify({ smokeCorpus: SMOKE_CORPUS.slice(0, 7), copy: smokeCorpusDir }));
    wanted = smokeCorpusDir;
  }
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

/**
 * The smoke run's keyboard checks need Deck to be the application with the
 * keyboard — unless this run was asked not to take it (ISS-0075).
 *
 * In no-focus mode the window is shown WITHOUT being activated, so nothing
 * leaves the editor the person is typing in. `sendInputEvent` still reaches the window, so every pointer check
 * runs; the checks that assert `document.hasFocus()` do not, and the runner
 * says so before the first window opens.
 */
function focusApp(win: BrowserWindow): void {
  if (!FOCUS.takesKeyboard) {
    win.showInactive();
    win.webContents.focus();
    return;
  }
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
