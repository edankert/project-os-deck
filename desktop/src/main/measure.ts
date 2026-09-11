/**
 * The measurements PHASE-0002 is judged on (TASK-0034, and FEAT-0001's three).
 *
 * `electron . --measure` opens each workspace in a throwaway state directory,
 * like the smoke run, and prints one JSON block per workspace:
 *
 * - the size and time of the one request that returns the whole edge list;
 * - how long the orbit's layout takes to solve, and how far an existing note
 *   moves when a note is added and the layout is solved again;
 * - the median and 95th-percentile frame time while turning through the quiet
 *   band in Glass, and while turning the orbit, with the count of elements in
 *   the document and of tiles and dots on the canvas.
 *
 * **The window is in front.** Every number DES-0002 carried about frame time
 * was taken in a background tab, where the browser suspends animation frames.
 * Here the application is asked for the keyboard, the window is shown and
 * focused, and the meter in the page records a frame only while the document
 * is visible and has focus; each result says whether both held.
 */
import os from 'node:os';
import type { BrowserWindow } from 'electron';
import type { DeckAction } from '../shared/store-state.js';
import type { DeckState, WindowRole } from '../shared/types.js';
import type { IndexSnapshot } from './note-index.js';
import type { GraphService } from './graph-service.js';
import { layoutOrbit } from '../shared/orbit.js';

export interface MeasureContext {
  store: { dispatch(action: DeckAction): DeckState; getState(): DeckState };
  addWorkspace(root: string): { ok: boolean; id?: string; name?: string; reason?: string };
  openWorkspace(id: string): Promise<{ ok: boolean; error?: string }>;
  snapshot(id: string): IndexSnapshot | null;
  graphs: GraphService;
  origin: string;
  createWindow(role: WindowRole, address: string | null, panel: string | null): BrowserWindow;
  focusApp(win: BrowserWindow): void;
  untilBooted(win: BrowserWindow): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One turn, measured only while the window holds the system's focus.
 *
 * Focus is taken immediately before, confirmed from inside the page, and a
 * run during which it was lost is taken again, up to three times. The first
 * version focused the window three seconds early and recorded no frames at
 * all in two of three workspaces, because something else took focus back.
 */
async function measuredTurn(ctx: MeasureContext, win: BrowserWindow, speed: string): Promise<unknown> {
  const js = <T>(code: string): Promise<T> => win.webContents.executeJavaScript(code) as Promise<T>;
  let last: { frames: number; focused: boolean } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    ctx.focusApp(win);
    for (let i = 0; i < 20 && !(await js<boolean>('document.hasFocus()')); i += 1) {
      await delay(100);
      if (i % 5 === 4) ctx.focusApp(win);
    }
    last = await js<{ frames: number; focused: boolean }>(`window.__deckGlass.measureTurn(5000, ${speed})`);
    if (last.focused && last.frames >= 200) return { ...last, attempts: attempt + 1 };
  }
  return { ...last, attempts: 3 };
}

function once(win: BrowserWindow, event: string): Promise<void> {
  return new Promise((resolve) => win.webContents.once(event as 'did-finish-load', () => resolve()));
}

export async function runMeasure(ctx: MeasureContext, roots: string[]): Promise<unknown[]> {
  const results: unknown[] = [];
  const machine = {
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cores: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 1e9),
    platform: `${os.platform()} ${os.release()}`,
  };
  for (const root of roots) {
    const added = ctx.addWorkspace(root);
    if (!added.ok || added.id === undefined) {
      results.push({ root, refused: added.reason });
      continue;
    }
    const id = added.id;
    const opened = await ctx.openWorkspace(id);
    if (!opened.ok) {
      results.push({ root, refused: opened.error });
      continue;
    }
    let snapshot = ctx.snapshot(id);
    for (let i = 0; i < 600 && (snapshot === null || snapshot.building); i += 1) {
      await delay(200);
      snapshot = ctx.snapshot(id);
    }
    if (snapshot === null || snapshot.building) {
      results.push({ root, refused: 'the index did not finish building in two minutes' });
      continue;
    }

    // FEAT-0001's first number: the one request for the whole edge list.
    const coldAt = Date.now();
    const cold = await fetch(`${ctx.origin}/deck/graph/${id}`);
    const body = await cold.text();
    const coldMs = Date.now() - coldAt;
    const warmAt = Date.now();
    await (await fetch(`${ctx.origin}/deck/graph/${id}`)).text();
    const warmMs = Date.now() - warmAt;
    const graph = JSON.parse(body) as { nodes: Array<{ id: string; inbound: number }>; edges: Array<{ resolved: boolean }>; ms: number };

    // FEAT-0001's second: the layout's solve, and the drift when a note arrives.
    const orbitAt = Date.now();
    const orbit = (await (await fetch(`${ctx.origin}/deck/orbit/${id}`)).json()) as { ms: number; layout: { places: Record<string, unknown>; orphans: string[] }; bridges: unknown[] };
    const orbitMs = Date.now() - orbitAt;
    const built = ctx.graphs.graphFor(snapshot).graph;
    const laid = (await ctx.graphs.layoutFor(snapshot)).layout;
    const hubs = [...built.nodes].sort((a, b) => b.inbound - a.inbound).slice(0, 3);
    const plus = {
      nodes: [...built.nodes, { id: 'MEASURE-NEW', rel: 'MEASURE-NEW.md', title: 'a note added', type: 'note', status: 'open', band: 'active', phase: hubs[0]?.phase ?? null, inbound: 0 }],
      edges: [...built.edges, ...hubs.map((h, i) => ({ source: 'MEASURE-NEW', target: h.id, wrote: h.id, offset: i, resolved: true, crossRepo: false }))],
    };
    const addedAt = Date.now();
    const again = layoutOrbit(plus, laid);
    const addedMs = Date.now() - addedAt;

    // TASK-0034: turning through the quiet band in Glass, and turning the orbit.
    ctx.store.dispatch({ type: 'open-workspace', workspaceId: id });
    ctx.store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    ctx.store.dispatch({ type: 'select-surface', surface: 'glass' });
    const win = ctx.createWindow('focus', `deck://${id}/issues`, null);
    win.setBounds({ x: 0, y: 0, width: 1440, height: 900 });
    let glass: unknown = null;
    let orbitTurn: unknown = null;
    try {
      await once(win, 'did-finish-load');
      await ctx.untilBooted(win);
      ctx.focusApp(win);
      await delay(3000);
      const js = <T>(code: string): Promise<T> => win.webContents.executeJavaScript(code) as Promise<T>;
      // The field a person will use: two notes held as panes, and a reach
      // drawn from a card, with its wires on the canvas (TASK-0034).
      const front = await js<string[]>(`[...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.dataset.band === 'front').map((e) => e.dataset.noteId).slice(0, 2)`);
      for (const [i, noteId] of front.entries()) ctx.store.dispatch({ type: 'put-on-desk', noteId, x: 16 + i * 28, y: 16 + i * 34 });
      await delay(1500);
      // A reach that is REQUIRED, not merely recorded: each near card in turn
      // until one holds, and the result says so if none did (ISS-0065).
      const reached = await js<string | null>(`(async () => {
        for (const c of [...document.querySelectorAll('.field-card:not(.leaving):not(.ghost)')]) {
          window.__deckGlass.reachFor(c.dataset.noteId);
          await new Promise((r) => setTimeout(r, 700));
          const r = window.__deckGlass.reaching();
          if (r && r.neighbours.length > 0) return r.noteId + ' ' + r.neighbours.length;
        }
        return null;
      })()`);
      if (reached === null) throw new Error('no card in the field could be reached for, so this measurement would have no wires');
      await js(`window.__deckGlass.model.face(Math.PI * 0.75); window.__deckGlass.render(false); true`);
      await delay(400);
      const turn = await measuredTurn(ctx, win, 'Math.PI / 5');
      const counts = await js<unknown>(`window.__deckGlass.counts()`);
      // The same turn with Chromium's CPU throttled four times, as a stand-in
      // for a slower machine. Emulated, and said so wherever it is quoted.
      let throttled: unknown = null;
      try {
        win.webContents.debugger.attach('1.3');
        await win.webContents.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate: 4 });
        await js(`window.__deckGlass.model.face(Math.PI * 0.75); window.__deckGlass.render(false); true`);
        throttled = await measuredTurn(ctx, win, 'Math.PI / 5');
        await win.webContents.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate: 1 });
        win.webContents.debugger.detach();
      } catch (err) {
        throttled = { unavailable: err instanceof Error ? err.message : String(err) };
      }
      glass = { turn, throttled4x: throttled, counts, view: 'issues', panes: await js<number>(`document.querySelectorAll('.pane').length`), reaching: reached, dealt: await js<number>(`window.__deckGlass.model.current.slots.size`) };
      await js(`document.querySelector('#surface-toggle button[data-surface="orbit"]').click()`);
      for (let i = 0; i < 120; i += 1) {
        if (await js<boolean>(`/the link graph: \\d+ notes/.test(document.getElementById('front-label').textContent)`)) break;
        await delay(250);
      }
      await delay(1500);
      const orbitRun = await measuredTurn(ctx, win, 'Math.PI / 5');
      orbitTurn = { turn: orbitRun, counts: await js<unknown>(`({ ...window.__deckGlass.counts(), ...window.__deckGlass.canvasCounts() })`) };
      ctx.store.dispatch({ type: 'select-surface', surface: 'glass' });
    } finally {
      win.destroy();
    }

    results.push({
      workspace: added.name,
      root,
      date: new Date().toISOString().slice(0, 10),
      machine,
      notes: snapshot.records.length,
      graph: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        resolved: graph.edges.filter((e) => e.resolved).length,
        bytes: body.length,
        coldMs,
        warmMs,
        buildMs: graph.ms,
      },
      orbit: {
        solveMs: orbit.ms,
        requestMs: orbitMs,
        orphans: orbit.layout.orphans.length,
        bridges: orbit.bridges.length,
        addOneNote: { drift: again.drift, solvedAgain: again.solvedAgain, ms: addedMs },
      },
      glass,
      orbitTurn,
    });
  }
  return results;
}
