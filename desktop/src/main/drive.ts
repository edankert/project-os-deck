/**
 * A scripted walk through the real application, with a real pointer and a
 * real keyboard, that keeps pictures of what it saw.
 *
 * `electron . --drive <script.cjs> --drive-out <dir> [--workspace <path>]`
 *
 * The smoke run answers "did every check hold". This answers a different
 * question: "what does it look like when a person does this", which is what a
 * demonstration of a feature needs and what a developer needs before writing
 * the check. A drive script is a function that is handed the same input the
 * smoke run uses (`pointer`, `click`, `drag`, `press`, all through
 * `sendInputEvent`, which the browser hit-tests as it hit-tests a person's
 * pointer) and a `shot` that saves the window as a PNG. Everything the script
 * logs is written to `drive.json` beside the pictures, with the time each
 * step took, so a recorded demonstration says what was done and when.
 *
 * Like the smoke run and the measurement it starts from a throwaway state
 * directory, so it never reads or changes the desk a person has arranged, and
 * it writes nothing to the workspace: what it reads through is the sidecar's
 * read routes, and `git status` in the workspace is recorded before and after.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { DeckAction } from '../shared/store-state.js';
import type { DeckState, WindowRole } from '../shared/types.js';
import { click, delay, drag, gitStatus, pointer, press } from './smoke-glass.js';

export interface DriveHost {
  store: { dispatch(action: DeckAction): DeckState; getState(): DeckState };
  createWindow(role: WindowRole, address: string | null, panel: string | null): BrowserWindow;
  untilBooted(win: BrowserWindow): Promise<void>;
  focusApp(win: BrowserWindow): void;
  /** The workspace the run opens: this repository unless `--workspace` names another. */
  prepared: { id: string; name: string; root: string };
  origin: string;
  /** A page served with no bridge, exactly as a tablet loads it. */
  openServedPage(): BrowserWindow;
}

/** What a drive script is handed. */
export interface Drive extends DriveHost {
  out: string;
  pointer: typeof pointer;
  click: typeof click;
  drag: typeof drag;
  press: typeof press;
  delay: typeof delay;
  /** Run code in a window's page and return what it evaluates to. */
  js<T>(win: BrowserWindow, code: string): Promise<T>;
  /** A real wheel at a point: `deltaY` positive is a wheel turned toward the person. */
  wheel(win: BrowserWindow, x: number, y: number, deltaY: number, modifiers?: Array<'control' | 'shift'>, deltaX?: number): void;
  /** Save the window as `<name>.png` in the output directory. */
  shot(win: BrowserWindow, name: string): Promise<string>;
  /** Record a fact about the run, with the time since it started. */
  log(what: string, data?: unknown): void;
  /** Open a window, wait for it to boot, and give it the keyboard. */
  open(address: string, size?: { width: number; height: number }): Promise<BrowserWindow>;
}

type DriveScript = (drive: Drive) => Promise<void>;

export async function runDrive(host: DriveHost, scriptPath: string, out: string): Promise<boolean> {
  fs.mkdirSync(out, { recursive: true });
  const started = Date.now();
  const entries: Array<{ atMs: number; what: string; data?: unknown }> = [];
  const log = (what: string, data?: unknown): void => {
    entries.push(data === undefined ? { atMs: Date.now() - started, what } : { atMs: Date.now() - started, what, data });
    console.log(`drive: ${what}${data === undefined ? '' : ` ${JSON.stringify(data)}`}`);
  };
  const before = gitStatus(host.prepared.root);
  const drive: Drive = {
    ...host,
    out,
    pointer,
    click,
    drag,
    press,
    delay,
    js: <T>(win: BrowserWindow, code: string) => win.webContents.executeJavaScript(code) as Promise<T>,
    wheel: (win, x, y, deltaY, modifiers = [], deltaX = 0) =>
      // Chromium's input events count a wheel turned toward the person as a
      // negative delta, the opposite of the DOM's, so both are negated here.
      win.webContents.sendInputEvent({ type: 'mouseWheel', x: Math.round(x), y: Math.round(y), deltaX: -deltaX, deltaY: -deltaY, canScroll: true, modifiers } as unknown as Electron.MouseWheelInputEvent),
    shot: async (win, name) => {
      const file = path.join(out, `${name}.png`);
      fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG());
      log(`shot ${name}`);
      return file;
    },
    log,
    open: async (address, size = { width: 1440, height: 900 }) => {
      const win = host.createWindow('focus', address, null);
      win.setBounds({ x: 0, y: 0, ...size });
      await new Promise<void>((resolve) => win.webContents.once('did-finish-load', () => resolve()));
      await host.untilBooted(win);
      host.focusApp(win);
      // The first deal, the first context and the first paint.
      await delay(1500);
      return win;
    },
  };
  let ok = true;
  let error: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require(path.resolve(scriptPath)) as DriveScript | { default: DriveScript };
    const script = typeof loaded === 'function' ? loaded : loaded.default;
    await script(drive);
  } catch (err) {
    ok = false;
    error = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    log('the script stopped', error);
  }
  const after = gitStatus(host.prepared.root);
  // What the run must never do: change the workspace it read.
  const unchanged = before === after;
  if (!unchanged) ok = false;
  fs.writeFileSync(
    path.join(out, 'drive.json'),
    `${JSON.stringify({ script: path.basename(scriptPath), workspace: host.prepared.name, ok, error, workspaceUnchanged: unchanged, tookMs: Date.now() - started, entries }, null, 2)}\n`,
  );
  console.log(`drive: ${ok ? 'finished' : 'FAILED'}; ${entries.length} entries and the pictures are in ${out}`);
  return ok;
}
