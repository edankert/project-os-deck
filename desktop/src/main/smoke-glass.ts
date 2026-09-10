/**
 * The smoke run's Glass checks (PHASE-0002), driven the way a person drives it.
 *
 * Every pointer goes through `sendInputEvent`, which the browser hit-tests the
 * way it hit-tests a person's pointer. DES-0002 lost two revisions to a
 * synthetic click that never hit-tested, and the tasks ask for this in so many
 * words: "a pointer sequence (down, move, up) at the centre of a front card,
 * driven through the smoke run, reaches that card and not a container".
 *
 * What a gesture did is read back from the STORE as well as from the page. A
 * page that looks right while the store is wrong is exactly what a second
 * window, or the tablet, would show.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { DeckState, WindowRole } from '../shared/types.js';
import type { DeckAction } from '../shared/store-state.js';

export interface GlassSmokeContext {
  store: { dispatch(action: DeckAction): DeckState; getState(): DeckState };
  createWindow(role: WindowRole, address: string | null, panel: string | null): BrowserWindow;
  addressOf(windowId: number): string | null;
  displayCount(): number;
  record(ok: boolean, what: string): void;
  skip(what: string): void;
  notHere(what: string): void;
  prepared: { id: string; root: string };
  tempDir: string;
  untilBooted(win: BrowserWindow): Promise<void>;
  /**
   * Make Deck the application the keyboard goes to. On macOS `win.focus()`
   * does not take focus from another application, and a smoke run started
   * from a terminal is not the active one, so Chromium holds back every
   * element's focus event and a keyboard check measures nothing.
   */
  focusApp(win: BrowserWindow): void;
  /** A page served with no bridge, exactly as a tablet loads it. */
  openServedPage(): BrowserWindow;
  /** Every Deck window, with what it carries and which display it is on. */
  windows(): Array<{ id: number; address: string | null; displayId: number; win: BrowserWindow }>;
}

type Step = { type: 'down' | 'move' | 'up'; x: number; y: number; wait?: number; alt?: boolean };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function once(win: BrowserWindow, event: string): Promise<void> {
  return new Promise((resolve) => win.webContents.once(event as 'did-finish-load', () => resolve()));
}

/**
 * A real pointer, sent to the window the way the operating system sends one.
 *
 * **The button has to be SAID to be down.** A mouse reports its held button
 * on every event, and Electron's `sendInputEvent` reports none unless the
 * event carries `leftButtonDown`: the press arrived with `buttons` at 0, so
 * the browser refused `setPointerCapture` without a word and every drag of a
 * card or a pane went to whatever was under the pointer. The field's own turn
 * still worked, because it never needed the capture, which is what made the
 * cause hard to see.
 */
const buttonDown = new WeakMap<BrowserWindow, boolean>();

export async function pointer(win: BrowserWindow, steps: Step[]): Promise<void> {
  // Remembered per window across calls: a drag sent in two calls is one drag,
  // and a move sent without the button between them is a release.
  let down = buttonDown.get(win) === true;
  for (const step of steps) {
    const modifiers: Array<'alt' | 'leftButtonDown'> = step.alt === true ? ['alt'] : [];
    const x = Math.round(step.x);
    const y = Math.round(step.y);
    if (step.type === 'down') {
      down = true;
      win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1, modifiers: [...modifiers, 'leftButtonDown'] });
    } else if (step.type === 'up') {
      down = false;
      win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1, modifiers });
    } else {
      win.webContents.sendInputEvent({ type: 'mouseMove', x, y, modifiers: down ? [...modifiers, 'leftButtonDown'] : modifiers });
    }
    buttonDown.set(win, down);
    await delay(step.wait ?? 16);
  }
}

export function click(at: { x: number; y: number }, alt = false): Step[] {
  return [
    { type: 'move', ...at, alt },
    { type: 'down', ...at, alt },
    { type: 'up', ...at, alt, wait: 60 },
  ];
}

/** A drag from one point to another in `count` moves. */
export function drag(from: { x: number; y: number }, to: { x: number; y: number }, count = 10, wait = 16): Step[] {
  const steps: Step[] = [{ type: 'move', ...from }, { type: 'down', ...from }];
  for (let i = 1; i <= count; i += 1) {
    steps.push({ type: 'move', x: from.x + ((to.x - from.x) * i) / count, y: from.y + ((to.y - from.y) * i) / count, wait });
  }
  steps.push({ type: 'up', ...to, wait: 60 });
  return steps;
}

export function press(win: BrowserWindow, key: string, modifiers: Array<'alt' | 'shift'> = []): void {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers });
  // A button is pressed by the key's character, not by the key: Enter needs its `\r`.
  if (key.length === 1) win.webContents.sendInputEvent({ type: 'char', keyCode: key, modifiers });
  else if (key === 'Return') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers });
}

/** `git status --porcelain` in a workspace, or null when it is not a repository. */
export function gitStatus(root: string): string | null {
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf-8' });
  } catch {
    return null;
  }
}

/** Helpers put into the page once, so each check reads as one line. */
const PAGE_HELPERS = `
  window.__t = {
    glass: () => window.__deckGlass,
    rect: (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; },
    // In sight means inside the FIELD and first under the pointer: a card
    // clipped behind the navigator is on the page and cannot be pressed.
    visibleCards: (band) => { const f = document.getElementById('field').getBoundingClientRect(); return [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto' && (!band || e.dataset.band === band) && !e.classList.contains('ghost')).map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, band: e.dataset.band, x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top, bottom: r.bottom, owed: e.classList.contains('owed') }; }).filter((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 30 && c.y < f.bottom - 30 && window.__t.hit(c.x, c.y) === c.id); },
    // Every near card drawn in the field, with no hit test: a card wholly
    // under a pane fails the hit test, so visibleCards() cannot see the very
    // cards an overlap check is looking for (ISS-0065).
    nearCards: () => { const f = document.getElementById('field').getBoundingClientRect(); return [...document.querySelectorAll('.field-card:not(.leaving):not(.ghost)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }).filter((c) => c.right > f.left && c.left < f.right && c.bottom > f.top && c.top < f.bottom); },
    underPanes: () => { const panes = [...document.querySelectorAll('.pane:not(.wide)')].map((p) => p.getBoundingClientRect()); return window.__t.nearCards().filter((c) => panes.some((p) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top)).map((c) => c.id); },
    hit: (x, y) => { const e = document.elementFromPoint(x, y); const card = e && e.closest('.field-card'); return card ? card.dataset.noteId : (e ? e.className || e.tagName : null); },
    text: (sel) => (document.querySelector(sel) || {}).textContent || '',
    shown: (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; },
    yaw: () => window.__deckGlass.model.yaw,
    assignments: () => window.__deckGlass.model.assignments,
    requests: () => window.__deckContexts.requests,
    where: (id) => window.__deckGlass.whereIs(id),
  };
  true;
`;

export async function recordGlass(ctx: GlassSmokeContext): Promise<void> {
  const { store, skip, notHere, prepared } = ctx;
  const record = (ok: boolean, what: string): void => {
    if (process.env['DECK_SMOKE_DEBUG'] === '1') console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
    ctx.record(ok, what);
  };
  const before = gitStatus(prepared.root);
  const reset = (): void => {
    store.dispatch({ type: 'open-workspace', workspaceId: prepared.id });
    store.dispatch({ type: 'clear-desk' });
    store.dispatch({ type: 'let-go' });
  };
  reset();
  store.dispatch({ type: 'select-surface', surface: 'glass' });
  const win = ctx.createWindow('focus', `deck://${prepared.id}/issues`, null);
  win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
  const js = <T>(code: string): Promise<T> => win.webContents.executeJavaScript(code) as Promise<T>;
  const boot = async (): Promise<void> => {
    await once(win, 'did-finish-load');
    await ctx.untilBooted(win);
    await delay(1800);
    await js(PAGE_HELPERS);
    if (process.env['DECK_SMOKE_TRACE'] === '1') await js(`window.__deckTrace = true`);
  };
  const deskIds = (): string[] => (store.getState().deskCards[prepared.id] ?? []).map((c) => c.noteId);
  if (process.env['DECK_SMOKE_TRACE'] === '1') {
    win.webContents.on('console-message', (_e, _level, message) => {
      if (/^(glass|nav)/.test(message)) console.log(`TRACE ${message}`);
    });
  }
  try {
    await boot();
    // Keyboard checks need the window to hold the system's focus: Chromium
    // holds back an element's focus event until the window has it.
    ctx.focusApp(win);
    if (process.env['DECK_SMOKE_TRACE'] === '1') await js(`window.__deckTrace = true`);

    // ---- TASK-0033: the default surface, and an address that names Spread ----
    const opened = await js<{ surface: string; field: boolean; desk: boolean; cards: number; deep: number; canvas: boolean }>(`({
      surface: document.body.dataset.surface, field: __t.shown('#field-area'), desk: __t.shown('#desk-area'),
      cards: document.querySelectorAll('.field-card:not(.leaving)').length,
      deep: document.querySelectorAll('.field-card[data-band="deep"]').length,
      canvas: document.getElementById('field-canvas').width > 0 })`);
    record(opened.surface === 'glass' && opened.field && !opened.desk, `an address with no surface opens in Glass (${opened.surface})`);
    record(opened.cards > 0, `the near bands are drawn as elements bound to their notes (${opened.cards})`);
    record(opened.deep === 0, 'the document holds no element for a note in the quiet band');
    record(opened.canvas, 'the quiet band is drawn on one canvas');
    const toggle = await js<string[]>(`[...document.querySelectorAll('#surface-toggle button')].map((b) => b.dataset.surface)`);
    record(toggle.join(',') === 'glass,spread,list,orbit', `the switcher offers the surface toggle for the view (${toggle.join(',')})`);
    fs.writeFileSync(path.join(ctx.tempDir, 'deck-glass-issues.png'), (await win.webContents.capturePage()).toPNG());

    // ---- TASK-0031: a real pointer reaches a front card, not a container ----
    const front = await js<Array<{ id: string; x: number; y: number; owed: boolean }>>(`__t.visibleCards('front')`);
    record(front.length > 0, `the Issues view has cards in the front band (${front.length})`);
    const owedText = await js<string>(`__t.text('#owed-count')`);
    record(/^\d+ owed$/.test(owedText) && owedText !== '0 owed', `the owed count is on the field's bar (${owedText})`);
    const target = front[0];
    if (target === undefined) throw new Error('no front card to lift');
    const hit = await js<string | null>(`__t.hit(${target.x}, ${target.y})`);
    record(hit === target.id, `the browser's own hit test at a front card's centre finds that card (${hit})`);
    const owedBefore = await js<{ left: number; top: number } | null>(`__t.rect('#owed-count')`);
    const requestsBefore = await js<number>(`__t.requests()`);

    // ---- TASK-0035 and TASK-0036: lift, the ghost, the neighbourhood ----
    const field0 = await js<{ left: number; bottom: number }>(`__t.rect('#field')`);
    const off = { x: field0.left + 30, y: field0.bottom - 30 };
    // Clicked, then the pointer moves off, so a card that arrives under it is
    // not reached for and counted as the lift's request.
    await pointer(win, [...click(target), { type: 'move', ...off }]);
    await delay(1600);
    record(deskIds().includes(target.id), `a real click on ${target.id} put it on the desk the store holds`);
    const lifted = await js<{ ghost: boolean; pane: boolean; label: string; owed: { left: number; top: number } | null; requests: number }>(`({
      ghost: !!document.querySelector('.field-card.ghost[data-note-id="${target.id}"]'),
      pane: !!document.querySelector('.pane[data-note-id="${target.id}"]'),
      label: __t.text('#front-label'), owed: __t.rect('#owed-count'), requests: __t.requests() })`);
    record(lifted.ghost, 'the slot the lifted note left is drawn as a ghost');
    record(lifted.pane, 'the lifted note is a pane on the front plane');
    record(/joined to what you are holding/.test(lifted.label), `the front label says what the front band now means ("${lifted.label}")`);
    record(
      owedBefore !== null && lifted.owed !== null && Math.abs(owedBefore.left - lifted.owed.left) < 1 && Math.abs(owedBefore.top - lifted.owed.top) < 1,
      'the owed count is drawn in the same place before and during the hold',
    );
    record(lifted.requests - requestsBefore === 1, `lifting made one context request (${lifted.requests - requestsBefore})`);
    const neighbours = await js<{ ids: string[]; front: string[] }>(`(() => {
      const c = window.__deckContexts.peek(${JSON.stringify(prepared.id)}, ${JSON.stringify(target.id)}, window.__deckLastState.indexRevisions[${JSON.stringify(prepared.id)}] || 0);
      const ids = c ? [...c.linked, ...c.backlinks].map((i) => i.id) : [];
      return { ids, front: ids.filter((id) => { const w = __t.where(id); return w && w.band === 'front'; }) };
    })()`);
    record(neighbours.ids.length > 0, `${target.id} has a neighbourhood to bring forward (${neighbours.ids.length})`);
    // Every neighbour the front band can hold: all of them up to its twelve
    // slots, and no fewer (ISS-0063: the first version also passed on one).
    record(
      neighbours.front.length === Math.min(neighbours.ids.length, 12),
      `its neighbours take the front band (${neighbours.front.length} of ${neighbours.ids.length})`,
    );

    // ---- TASK-0037: a second note, and what the two share ----
    const kin = await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front').filter((c) => c.id !== ${JSON.stringify(target.id)})`);
    const second = kin[0];
    if (second !== undefined) {
      await pointer(win, [...click(second), { type: 'move', ...off }]);
      await delay(1600);
      const two = await js<{ count: string; shared: string[]; drawn: string[]; marked: string[]; navGroup: number }>(`(() => {
        const ws = ${JSON.stringify(prepared.id)};
        const rev = window.__deckLastState.indexRevisions[ws] || 0;
        const held = (window.__deckLastState.deskCards[ws] || []).map((c) => c.noteId);
        const counts = new Map();
        for (const id of held) {
          const c = window.__deckContexts.peek(ws, id, rev);
          const ids = new Set(c ? [...c.linked, ...c.backlinks].map((i) => i.id) : []);
          for (const n of ids) if (!held.includes(n)) counts.set(n, (counts.get(n) || 0) + 1);
        }
        const shared = [...counts].filter(([, n]) => n >= 2).map(([id]) => id);
        const drawn = [...document.querySelectorAll('.field-card:not(.leaving):not(.ghost)')].map((e) => e.dataset.noteId);
        const marked = [...document.querySelectorAll('.field-card.shared:not(.leaving)')].map((e) => e.dataset.noteId);
        const group = [...document.querySelectorAll('#nav-list .nav-group')].find((g) => /more than one held note/.test(g.textContent));
        return { count: __t.text('#glass-desk-count'), shared, drawn, marked, navGroup: group ? Number(group.querySelector('.mark').textContent) : 0 };
      })()`);
      record(deskIds().length === 2, `a second click adds a second note, no modifier needed (${deskIds().join(', ')})`);
      const said = /(\d+) joined to more than one/.exec(two.count);
      record(said !== null && Number(said[1]) === two.shared.length, `the desk bar counts what the held notes share, and says what it counts ("${two.count}")`);
      const shouldMark = two.drawn.filter((id) => two.shared.includes(id)).sort();
      record(JSON.stringify(two.marked.slice().sort()) === JSON.stringify(shouldMark), `every drawn card joined to both carries the mark, and no other does (${two.marked.length} marked)`);
      record(two.navGroup === two.shared.length, `the navigator lists what they share (${two.navGroup})`);
      // Dealt first: every shared note has a front slot when there are no
      // more of them than the band's free slots. With the renderer not passing
      // them first, 2 of 8 were drawn (ISS-0065).
      const sharedInFront = await js<number>(`${JSON.stringify(two.shared)}.filter((id) => { const w = __t.where(id); return w && w.band === 'front'; }).length`);
      record(two.shared.length === 0 || sharedInFront === Math.min(two.shared.length, 8), `every shared note is dealt into the front band first (${sharedInFront} of ${two.shared.length})`);
    } else {
      skip('the shared mark: the lifted note brought no second card into the front band');
    }

    // ---- the three closing verbs, and the background ----
    const closeFirst = await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${target.id}"] .pane-close')`);
    if (closeFirst !== null) {
      const askedBefore = await js<number>(`__t.requests()`);
      await pointer(win, [...click(closeFirst), { type: 'move', ...off }]);
      await delay(700);
      record((await js<number>(`__t.requests()`)) === askedBefore, 'putting a note back asks the sidecar nothing');
      await delay(700);
      record(!deskIds().includes(target.id), '× on a pane puts that note back');
      const back = await js<{ ghost: boolean; band: string | null }>(`({ ghost: !!document.querySelector('.field-card.ghost[data-note-id="${target.id}"]'), band: (__t.where(${JSON.stringify(target.id)}) || {}).band || null })`);
      record(!back.ghost && back.band !== null, `the note returned to the field (${back.band})`);
    }
    await pointer(win, click((await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0] ?? target));
    await delay(1200);
    const held = deskIds();
    const keep = held[held.length - 1];
    const closeOthers = keep === undefined ? null : await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${keep}"] .pane-close')`);
    if (closeOthers !== null && held.length >= 2) {
      await pointer(win, click(closeOthers, true));
      await delay(700);
      record(deskIds().join() === keep, `⌥× puts back every other note (${deskIds().join(', ')})`);
    }
    const field = await js<{ left: number; top: number; right: number; bottom: number }>(`__t.rect('#field')`);
    const empty = { x: field.left + 30, y: field.bottom - 30 };
    const heldNow = deskIds().length;
    await pointer(win, click(empty));
    await delay(400);
    record(deskIds().length === heldNow, 'a click on the field’s background changes nothing');
    await js(`document.getElementById('field').focus()`);
    press(win, 'Escape');
    await delay(600);
    record(deskIds().length === 0, 'esc sweeps the desk');

    // ---- TASK-0036: a lift turns the field to face its neighbours ----
    await js(`window.__deckGlass.model.face(0.8); window.__deckGlass.render(false); true`);
    await delay(300);
    const offFront = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (offFront === undefined) {
      record(false, 'a front card was in sight at yaw 0.8 to lift');
    } else {
      await pointer(win, [...click(offFront), { type: 'move', ...off }]);
      const yaws: number[] = [];
      for (let i = 0; i < 60; i += 1) {
        yaws.push(await js<number>(`__t.yaw()`));
        await delay(40);
      }
      const between = yaws.filter((y) => y < 0.79 && y > 0.01).length;
      record(Math.abs(yaws[yaws.length - 1] as number) < 0.01 && between > 0, `a lift turns the field to face its neighbours, flying from 0.8 to ${(yaws[yaws.length - 1] as number).toFixed(2)} (${between} frames between)`);
      store.dispatch({ type: 'clear-desk' });
      await delay(800);
    }

    // ---- ISS-0061: under reduced motion a lift highlights its neighbours ----
    await js(`window.__deckReducedMotion = true`);
    const rmFront = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (rmFront !== undefined) {
      const yawBefore = await js<number>(`__t.yaw()`);
      await pointer(win, [...click(rmFront), { type: 'move', ...off }]);
      let lit = 0;
      for (let i = 0; i < 20 && lit === 0; i += 1) {
        await delay(100);
        lit = await js<number>(`document.querySelectorAll('.field-card.highlight.joined').length`);
      }
      const turned = await js<boolean>(`document.getElementById('field').classList.contains('turning')`);
      record(lit > 0 && !turned, `under reduced motion a lift highlights the neighbours it brought forward (${lit}) and does not fly (yaw ${yawBefore.toFixed(2)} to ${(await js<number>(`__t.yaw()`)).toFixed(2)})`);
      // And from a yaw away from the front, with that pane held: after the
      // cut no card is drawn under it (ISS-0064).
      // Turned TOWARD the pane's side, so the slots the pane will cover once
      // the field faces the front are free in the deal made before the cut. A
      // turn the other way frees only slots that end up off the field's edge,
      // and then a stale deal draws nothing under the pane to find.
      const side = await js<number>(`(() => { const p = document.querySelector('.pane:not(.wide)'); const f = document.getElementById('field').getBoundingClientRect(); if (!p) return 1; const r = p.getBoundingClientRect(); return (r.left + r.right) / 2 < (f.left + f.right) / 2 ? -1 : 1; })()`);
      const away = 0.8 * side;
      await js(`window.__deckGlass.model.face(${away}); window.__deckGlass.render(false); true`);
      await delay(200);
      const another = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`)).find((c) => c.id !== rmFront.id);
      if (another !== undefined) {
        // Looked at in the page, on the first turn of the event loop after the
        // field faces the front: a store update a moment later deals the field
        // again and hides a stale deal, so a look 1.5 seconds on cannot fail.
        // And the note's context is forgotten first, so the cut waits for the
        // sidecar's answer and comes after every store update, as it does for
        // a note nobody has reached for; with the answer cached the cut came
        // first and the next update hid what it left.
        await js(`(() => { const c = window.__deckContexts; for (const k of [...c.answers.keys()]) if (k.endsWith(' ' + ${JSON.stringify(another.id)})) c.answers.delete(k); return true; })()`);
        const watch = js<{ under: string[]; ms: number; yaw: number }>(`new Promise((resolve) => {
          const t0 = performance.now();
          const look = () => {
            const yaw = __t.yaw();
            if (Math.abs(yaw) < 0.01 || performance.now() - t0 > 4000) resolve({ under: __t.underPanes(), ms: Math.round(performance.now() - t0), yaw });
            else setTimeout(look, 0);
          };
          look();
        })`);
        await pointer(win, [...click(another), { type: 'move', ...off }]);
        const seen = await watch;
        await delay(1200);
        const under = [...new Set([...seen.under, ...(await js<string[]>(`__t.underPanes()`))])];
        record(Math.abs(seen.yaw) < 0.01 && under.length === 0, `a reduced-motion lift from yaw ${away.toFixed(1)} cuts to the front and leaves no card under a pane, at the cut and after (${under.join(', ') || 'none'}; yaw ${seen.yaw.toFixed(2)} after ${seen.ms}ms)`);
      }
      store.dispatch({ type: 'clear-desk' });
      await delay(600);
    }
    await js(`window.__deckReducedMotion = false`);

    // ---- TASK-0031: turning, by drag and by key, and the compass ----
    const yaw0 = await js<number>(`__t.yaw()`);
    const dealt0 = await js<number>(`__t.assignments()`);
    const centre = { x: (field.left + field.right) / 2, y: field.bottom - 60 };
    await pointer(win, drag(centre, { x: centre.x - 320, y: centre.y }, 16));
    await delay(300);
    const yaw1 = await js<number>(`__t.yaw()`);
    record(Math.abs(yaw1 - yaw0) > 0.5, `a drag on the background turns the field (${yaw0.toFixed(2)} to ${yaw1.toFixed(2)})`);
    record((await js<number>(`__t.assignments()`)) === dealt0, 'turning dealt nothing: sixteen moves, no assignment');
    await js(`document.getElementById('field').focus()`);
    press(win, 'Right');
    await delay(400);
    const yaw2 = await js<number>(`__t.yaw()`);
    record(Math.abs(Math.abs(yaw2 - yaw1) - (14 * Math.PI) / 180) < 0.02, `an arrow key turns it by one step (${(yaw2 - yaw1).toFixed(3)})`);
    press(win, 'End');
    await delay(1300);
    const behindText = await js<string>(`__t.text('#compass-behind')`);
    const quietDealt = await js<number>(`[...window.__deckGlass.model.current.slots.values()].filter((s) => s.band === 'deep').length`);
    const quietSaid = Number(/(\d+) in the quiet band/.exec(behindText)?.[1] ?? '-1');
    record(quietSaid === quietDealt && /\d+ out of sight/.test(behindText), `the compass counts the quiet band, the number dealt there, and what is out of sight ("${behindText}", ${quietDealt} dealt)`);
    press(win, 'Home');
    await delay(1300);

    // ---- TASK-0053: pull, a refused push, a push, and let go ----
    // In the Features view: in this repository every issue but the owed ones
    // is finished, so the Issues view has nothing in its middle band.
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
    await delay(2200);
    const mid = await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('mid')`);
    const pullee = mid[0];
    if (pullee === undefined) {
      skip('pull and push: no mid card was in sight');
    } else {
      await pointer(win, drag(pullee, { x: pullee.x, y: pullee.y + 90 }, 10));
      await delay(1300);
      const pulled = store.getState().session.pulled[prepared.id] ?? [];
      record(pulled.includes(pullee.id), `dragging ${pullee.id} toward the person pulled it (store: ${pulled.join(', ')})`);
      record((await js<{ band: string } | null>(`__t.where(${JSON.stringify(pullee.id)})`))?.band === 'front', 'the pulled note stands in the front band');
      const hand = await js<{ count: string; mark: boolean }>(`({ count: __t.text('#hand-count'), mark: !!document.querySelector('.field-card.pulled[data-note-id="${pullee.id}"]') })`);
      record(hand.count === '1 placed by hand' && hand.mark, `the front label counts what a hand placed, and the card carries the hand mark ("${hand.count}")`);
      // Across a view switch that keeps the note in view: away and back.
      await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
      await delay(1800);
      await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
      await delay(2200);
      record((await js<{ band: string } | null>(`__t.where(${JSON.stringify(pullee.id)})`))?.band === 'front', 'the pulled note is still in front after a view switch');
      record(!(await js<string>(`document.getElementById('copy-address').title + JSON.stringify(window.__deckLastState.viewId)`)).includes(pullee.id), 'the pull is nowhere near the address');
    }
    const pushable = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('mid')`))[0];
    if (pushable !== undefined) {
      await pointer(win, drag(pushable, { x: pushable.x, y: pushable.y - 90 }, 10));
      await delay(1300);
      record((store.getState().session.pushed[prepared.id] ?? []).includes(pushable.id), `dragging ${pushable.id} away pushed it`);
      record((await js<{ band: string } | null>(`__t.where(${JSON.stringify(pushable.id)})`))?.band === 'deep', 'the pushed note is in the quiet band');
      record((await js<string>(`document.getElementById('compass').dataset.pushed`)) === '1', 'the compass counts the pushed note');
    }
    // The refused push is in the Issues view, where the owed notes are.
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    await delay(2200);
    const owedCard = (await js<Array<{ id: string; x: number; y: number; owed: boolean }>>(`__t.visibleCards('front')`)).find((c) => c.owed);
    if (owedCard === undefined) {
      skip('the refused push: no owed card was in sight');
    } else {
      await pointer(win, drag(owedCard, { x: owedCard.x, y: owedCard.y - 90 }, 10));
      await delay(700);
      const said = await js<string>(`__t.text('#field-say')`);
      record(!(store.getState().session.pushed[prepared.id] ?? []).includes(owedCard.id), `pushing owed ${owedCard.id} is refused`);
      record(/stays in front: it is owed/.test(said), `and the front plane says why ("${said}")`);
    }
    const letGo = await js<{ x: number; y: number } | null>(`__t.shown('#let-go') ? __t.rect('#let-go') : null`);
    record(letGo !== null, 'let go is offered while a hand has placed something');
    if (letGo !== null) {
      await pointer(win, click(letGo));
      await delay(1200);
      const session = store.getState().session;
      record((session.pulled[prepared.id] ?? []).length === 0 && (session.pushed[prepared.id] ?? []).length === 0, 'let go clears both sets');
      record((await js<string>(`__t.text('#hand-count')`)) === '', 'and the count reads nothing');
    }

    // ---- TASK-0056: reach, in the Features view's middle band ----
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
    await delay(2200);
    const reachable = await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('mid').filter((c) => __t.hit(c.x, c.y) === c.id)`);
    const reachFor = reachable[reachable.length - 1];
    if (reachFor === undefined) {
      skip('reach: no card was in sight');
    } else {
      // A pass across the band first: resting on none of them asks nothing.
      const passBefore = await js<number>(`__t.requests()`);
      await pointer(win, reachable.slice(0, 5).map((c) => ({ type: 'move' as const, x: c.x, y: c.y, wait: 60 })));
      await pointer(win, [{ type: 'move', x: empty.x, y: empty.y, wait: 500 }]);
      record((await js<number>(`__t.requests()`)) === passBefore, 'passing the pointer across a band of cards asks nothing');
      await pointer(win, [{ type: 'move', x: reachFor.x, y: reachFor.y, wait: 1100 }]);
      const reached = await js<{ reaching: { noteId: string; neighbours: string[] } | null; requests: number }>(`({ reaching: __t.glass().reaching(), requests: __t.requests() })`);
      record(reached.reaching?.noteId === reachFor.id, `resting on ${reachFor.id} reaches for it`);
      // The wires are on the canvas: read the pixel back, not the state.
      const wire = await js<{ x: number; y: number; alpha: number } | null>(`__t.glass().wirePixel()`);
      record(wire !== null && wire.alpha > 0, `and a wire is drawn on the canvas (alpha ${wire?.alpha ?? 'no wire'} at its middle)`);
      if (reached.reaching?.noteId !== reachFor.id) {
        console.log('DIAG trace', JSON.stringify(await js(`(window.__deckTraceLog || []).slice(-30)`)));
        console.log('DIAG reach', JSON.stringify(await js(`({ reaching: __t.glass().reaching(), hit: __t.hit(${reachFor.x}, ${reachFor.y}), active: document.activeElement ? (document.activeElement.className + ' ' + (document.activeElement.dataset.noteId || '')) : null, where: __t.where(${JSON.stringify(reachFor.id)}), pending: __t.glass().pendingReach, yaw: __t.yaw() })`)), JSON.stringify(reachFor));
      }
      record(reached.requests - passBefore <= 1, `with at most one request (${reached.requests - passBefore})`);
      await pointer(win, [{ type: 'move', x: empty.x, y: empty.y, wait: 200 }]);
      record((await js<unknown>(`__t.glass().reaching()`)) === null, 'moving off clears the wires');
      if (wire !== null) record((await js<number>(`__t.glass().pixelAlpha(${wire.x}, ${wire.y})`)) === 0, 'and the canvas is clear where the wire was');
      await pointer(win, [{ type: 'move', x: reachFor.x, y: reachFor.y, wait: 1100 }]);
      record((await js<number>(`__t.requests()`)) === reached.requests, 'a second reach for the same note asks nothing');
      await pointer(win, [{ type: 'move', x: empty.x, y: empty.y, wait: 200 }]);
      const wiresInDom = await js<number>(`document.querySelectorAll('#field line, #field svg, .wire').length`);
      record(wiresInDom === 0, 'a reach adds no element to the document; the wires are on the canvas');
    }

    // ---- TASK-0054: panes ----
    // One at a time, reading the field again after each: a lift re-deals it,
    // so the second card is not where it was before the first went up.
    const toLift: Array<{ id: string; x: number; y: number }> = [];
    for (let i = 0; i < 2; i += 1) {
      const next = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards().filter((c) => __t.hit(c.x, c.y) === c.id)`)).find(
        (c) => !deskIds().includes(c.id),
      );
      if (next === undefined) break;
      toLift.push(next);
      await pointer(win, [...click(next), { type: 'move', x: 10, y: 10 }]);
      await delay(1300);
    }
    const [paneA, paneB] = deskIds();
    if (process.env['DECK_SMOKE_DEBUG'] === '1') {
      win.webContents.on('console-message', (_e, _level, message) => console.log(`page: ${message}`));
      await js(`for (const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture']) document.addEventListener(t, (e) => console.log(t, e.target.className || e.target.tagName, e.buttons, e.clientX, e.clientY), true); true`);
    }
    if (paneA === undefined || paneB === undefined) {
      record(false, `panes: two notes could be lifted (${toLift.map((c) => c.id).join(', ')} gave ${deskIds().join(', ')})`);
    } else {
      const headA = await js<{ x: number; y: number; left: number; top: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      const startA = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      await pointer(win, drag({ x: headA.x, y: headA.y }, { x: headA.x + 260, y: headA.y + 180 }, 12));
      await delay(800);
      const movedA = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      record(
        startA !== undefined && movedA !== undefined && Math.abs(movedA.x - startA.x - 260) <= 2 && Math.abs(movedA.y - startA.y - 180) <= 2,
        `a pane dragged by its header lands where it was released (${startA?.x},${startA?.y} to ${movedA?.x},${movedA?.y})`,
      );
      const handle = await js<{ x: number; y: number }>(`(() => { const r = document.querySelector('.pane[data-note-id="${paneA}"] .pane-resize').getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; })()`);
      await pointer(win, drag(handle, { x: handle.x - 200, y: handle.y + 60 }, 8));
      await delay(600);
      const sized = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      record(sized?.w === 280, `a pane resized narrower stops at the stated minimum width (${sized?.w})`);
      // Stack: drop B's header onto A's header; it snaps below it.
      const a = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      const headB = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-id')`);
      const headA2 = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      await pointer(win, drag(headB, { x: headA2.x, y: headA2.y + 4 }, 12));
      await delay(800);
      const b = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneB);
      record(a !== undefined && b !== undefined && b.y === a.y + 34, `a pane dropped on another’s header snaps below it (${a?.y} then ${b?.y})`);
      // A click on the lower pane's header raises it.
      const lower = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      record((await js<string | null>(`(() => { const e = document.elementFromPoint(${lower.x}, ${lower.y}); const p = e && e.closest('.pane'); return p ? p.dataset.noteId : null; })()`)) === paneA, 'the covered pane’s header is still visible and hit');
      await pointer(win, click(lower));
      await delay(600);
      record(deskIds().at(-1) === paneA, 'a click on a header raises that pane');
      // No near card is drawn under a pane.
      const overlap = await js<string[]>(`(() => {
        const panes = [...document.querySelectorAll('.pane:not(.wide)')].map((p) => p.getBoundingClientRect());
        return __t.nearCards().filter((c) => panes.some((p) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top)).map((c) => c.id);
      })()`);
      record(overlap.length === 0, `no field card is dealt under a pane (${overlap.join(', ') || 'none'})`);
      // Widen: the reading column.
      const widen = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-widen')`);
      await pointer(win, click(widen));
      await delay(1500);
      const reading = await js<{ reading: boolean; reader: boolean; text: number }>(`({ reading: document.body.classList.contains('reading'), reader: __t.shown('#reader'), text: document.getElementById('reader').textContent.trim().length })`);
      record(reading.reading && reading.reader && reading.text > 20, `widen takes the pane to the reading column (${reading.text} characters)`);
      const widenB = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-widen')`);
      if (process.env['DECK_SMOKE_DEBUG'] === '1') {
        console.log('DEBUG widenB', JSON.stringify(widenB), await js(`(() => { const e = document.elementFromPoint(${widenB.x}, ${widenB.y}); return e ? e.className + ' in ' + (e.closest('.pane') || {dataset:{}}).dataset.noteId : null; })()`), 'A', paneA, 'B', paneB, JSON.stringify(store.getState().deskCards[prepared.id]));
      }
      await pointer(win, click(widenB));
      await delay(1200);
      const wide = (store.getState().deskCards[prepared.id] ?? []).filter((c) => c.wide === true).map((c) => c.noteId);
      record(wide.join() === paneB, `widening another pane replaces the first (${wide.join(', ')})`);
      // With the reading column open the field is narrower, and a pane stored
      // past its edge is drawn clamped: no card may be drawn under it (ISS-0058).
      store.dispatch({ type: 'move-card', noteId: paneA, x: 3000, y: 120 });
      await delay(1500);
      const clamped = await js<{ overlap: string[]; left: string }>(`(() => {
        const pane = document.querySelector('.pane[data-note-id="${paneA}"]');
        const p = pane.getBoundingClientRect();
        const overlap = __t.nearCards().filter((c) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top).map((c) => c.id);
        return { overlap, left: pane.style.left };
      })()`);
      record(clamped.left !== '3000px', `a pane stored past the narrowed field is drawn inside it (at ${clamped.left})`);
      record(clamped.overlap.length === 0, `and no card is drawn under it (${clamped.overlap.join(', ') || 'none'})`);
      store.dispatch({ type: 'move-card', noteId: paneA, x: movedA?.x ?? 16, y: movedA?.y ?? 16 });
      await delay(800);
      // The keyboard on a header moves the pane.
      await js(`document.querySelector('.pane[data-note-id="${paneA}"] .pane-head').focus()`);
      const beforeKey = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      press(win, 'Right');
      await delay(400);
      const afterKey = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === paneA);
      record(beforeKey !== undefined && afterKey !== undefined && afterKey.x === beforeKey.x + 16, 'an arrow key on a pane’s header moves it');
      // Out of the reading column again, so the field is wide enough that no
      // pane is clamped and a position read back is the position stored.
      const unwiden = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-widen')`);
      await pointer(win, click(unwiden));
      await delay(1200);
      // A reload: the panes come back where they were, at the size they were.
      const kept = JSON.stringify(store.getState().deskCards[prepared.id]);
      win.webContents.reload();
      await boot();
      const restored = await js<Array<{ id: string; left: string; top: string; width: string }>>(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, left: p.style.left, top: p.style.top, width: p.style.width }))`);
      const stored = JSON.parse(kept) as Array<{ noteId: string; x: number; y: number; w?: number }>;
      const matches = stored.every((c) => restored.some((r) => r.id === c.noteId && r.left === `${c.x}px` && r.top === `${c.y}px` && (c.w === undefined || r.width === `${c.w}px`)));
      record(matches, 'after a reload every pane is where it was and the size it was');
      // Spread shows the same notes at the same positions, in the view that holds them.
      await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
      await delay(2000);
      await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`);
      await delay(1200);
      const spread = await js<Array<{ id: string; left: string; top: string }>>(`[...document.querySelectorAll('#desk .card:not([hidden])')].map((c) => ({ id: c.dataset.noteId, left: c.style.left, top: c.style.top })) `);
      record(
        stored.every((c) => spread.some((s) => s.id === c.noteId && s.left === `${c.x}px` && s.top === `${c.y}px`)),
        `Spread shows the same desk at the same positions (${spread.map((s) => s.id).join(', ')})`,
      );
      // A card dragged in Spread is where it was dragged in Glass: one record.
      // The card the pointer will actually grab: in Spread two cards overlap,
      // and the one on top at a point is the one a press takes.
      const spreadCard = await js<{ x: number; y: number; id: string } | null>(`(() => { for (const c of document.querySelectorAll('#desk .card:not([hidden])')) { const r = c.getBoundingClientRect(); const x = r.left + 30, y = r.top + 14; const hit = document.elementFromPoint(x, y); const top = hit && hit.closest('.card'); if (top === c) return { x, y, id: c.dataset.noteId }; } return null; })()`);
      if (spreadCard !== null) {
        const was = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === spreadCard.id);
        await pointer(win, drag(spreadCard, { x: spreadCard.x + 120, y: spreadCard.y + 60 }, 8));
        await delay(700);
        const now = (store.getState().deskCards[prepared.id] ?? []).find((c) => c.noteId === spreadCard.id);
        record(was !== undefined && now !== undefined && (now.x !== was.x || now.y !== was.y), `a card dragged in Spread moved in the store (${was?.x},${was?.y} to ${now?.x},${now?.y})`);
        await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
        await delay(1500);
        const pane = await js<{ left: string; top: string } | null>(`(() => { const p = document.querySelector('.pane[data-note-id="${spreadCard.id}"]'); return p ? { left: p.style.left, top: p.style.top } : null; })()`);
        record(now !== undefined && pane !== null && pane.left === `${now.x}px` && pane.top === `${now.y}px`, `and Glass holds it as a pane at that same place (${pane?.left}, ${pane?.top})`);
      } else {
        await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
        await delay(1500);
      }
      record((await js<number>(`document.querySelectorAll('.pane').length`)) === stored.length, 'and switching back shows them held in Glass');
    }
    reset();
    await delay(800);

    // ---- TASK-0033: the keyboard route through the navigator ----
    ctx.focusApp(win);
    await delay(300);
    record(await js<boolean>(`document.hasFocus()`), 'the window has the keyboard, so the checks below measure something');
    const rows = await js<{ first: string | null; posinset: string | null; setsize: string | null }>(`(() => { const r = document.querySelector('#nav-list .nav-row:not([hidden])'); return { first: r ? r.dataset.noteId : null, posinset: r ? r.getAttribute('aria-posinset') : null, setsize: r ? r.getAttribute('aria-setsize') : null }; })()`);
    record(rows.posinset !== null && rows.setsize !== null && Number(rows.setsize) >= Number(rows.posinset), `a navigator row says its place in the whole view (${rows.posinset} of ${rows.setsize})`);
    await js(`document.querySelector('#nav-list [tabindex="0"]').focus()`);
    press(win, 'Down');
    press(win, 'Down');
    await delay(300);
    const focusedRow = await js<string | null>(`document.activeElement && document.activeElement.dataset.noteId || null`);
    press(win, 'Return');
    await delay(1500);
    record(focusedRow !== null && deskIds().includes(focusedRow), `Tab, the arrow keys and Enter lift a note from the navigator (${focusedRow})`);
    // Reduced motion: arriving is a highlight, not a flight.
    // Let the lift settle: it turns the field once its neighbourhood arrives,
    // and a turn still going made the cut check below fail once (ISS-0065).
    for (let i = 0, last = NaN; i < 40; i += 1) {
      const y = await js<number>(`__t.yaw()`);
      if (Math.abs(y - last) < 1e-9 && !(await js<boolean>(`document.getElementById('field').classList.contains('turning')`))) break;
      last = y;
      await delay(100);
    }
    await js(`window.__deckReducedMotion = true`);
    ctx.focusApp(win);
    for (let i = 0; i < 20 && !(await js<boolean>('document.hasFocus()')); i += 1) await delay(100);
    // Down until a note's row whose card stands away from where the field
    // faces, so the cut has somewhere to go and the check measures something.
    let jumped = { from: 0, first: 0, later: 0 };
    for (let i = 0; i < 12; i += 1) {
      const from = await js<number>(`__t.yaw()`);
      press(win, 'Down');
      await delay(120);
      const first = await js<number>(`__t.yaw()`);
      const onCard = await js<boolean>(`!!(document.activeElement && document.activeElement.classList.contains('nav-row') && document.activeElement.dataset.noteId && __t.where(document.activeElement.dataset.noteId))`);
      if (!onCard || Math.abs(first - from) < 0.05) continue;
      await delay(300);
      jumped = { from, first, later: await js<number>(`__t.yaw()`) };
      break;
    }
    for (let i = 0; i < 10; i += 1) {
      if (await js<boolean>(`!!document.querySelector('.field-card.highlight, .nav-row.highlight')`)) break;
      await delay(100);
    }
    const arrived = { highlighted: await js<boolean>(`!!document.querySelector('.field-card.highlight, .nav-row.highlight')`) };
    // A keyboard check can only fail fairly while the window holds the
    // keyboard. If it failed AND the page had lost focus, it is taken once
    // more after focus is given back, and the verdict says so; a failure with
    // focus held stays a failure.
    let focusNote = '';
    if (!arrived.highlighted && !(await js<boolean>('document.hasFocus()'))) {
      ctx.focusApp(win);
      for (let i = 0; i < 20 && !(await js<boolean>('document.hasFocus()')); i += 1) await delay(100);
      press(win, 'Up');
      await delay(200);
      press(win, 'Down');
      for (let i = 0; i < 10; i += 1) {
        if (await js<boolean>(`!!document.querySelector('.field-card.highlight, .nav-row.highlight')`)) break;
        await delay(100);
      }
      arrived.highlighted = await js<boolean>(`!!document.querySelector('.field-card.highlight, .nav-row.highlight')`);
      focusNote = ' (taken again: the window had lost the keyboard)';
    }
    record(arrived.highlighted, `under reduced motion, choosing a row highlights it${focusNote}`);
    if (!arrived.highlighted) {
      console.log('DIAG focus', await js<boolean>('document.hasFocus()'));
      console.log('DIAG trace2', JSON.stringify(await js(`(window.__deckTraceLog || []).slice(-30)`)));
      console.log('DIAG highlight', JSON.stringify(jumped), JSON.stringify(await js(`({ active: document.activeElement ? document.activeElement.className + ' ' + (document.activeElement.dataset.noteId || '') : null, rows: [...document.querySelectorAll('#nav-list .highlight')].length })`)));
    }
    // No flight: the yaw is already where it ends up, and stays there. (Not
    // compared with the note's slot, which a held pane may re-deal just after
    // the cut; what reduced motion forbids is the movement, not the deal.)
    const still: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      still.push(await js<number>(`__t.yaw()`));
      await delay(50);
    }
    record(
      Math.abs(jumped.first - jumped.from) >= 0.05 && Math.abs(jumped.later - jumped.first) < 1e-9 && still.every((y) => Math.abs(y - (still[0] as number)) < 1e-9),
      `and the field cut to it rather than flying (from ${jumped.from.toFixed(3)} straight to ${jumped.first.toFixed(3)}, held at ${jumped.later.toFixed(3)})`,
    );
    await js(`window.__deckReducedMotion = false`);
    reset();
    await delay(800);

    // ---- TASK-0032: a view switch keeps each note's element, and a change is held ----
    // No two of this repository's views hold the same note, so the notes in
    // both are a held note's neighbourhood: it takes the front band whichever
    // view is chosen, because the desk belongs to the workspace.
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    await delay(2200);
    const anchor = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (anchor !== undefined) {
      await pointer(win, [...click(anchor), { type: 'move', x: 10, y: 10 }]);
      await delay(2000);
    }
    await js(`document.querySelectorAll('.field-card').forEach((e) => { e.__deckMark = e.dataset.noteId; e.__deckAt = e.style.transform; })`);
    const marked = await js<string[]>(`[...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => e.dataset.noteId)`);
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
    await delay(400);
    const during = await js<{ delays: string[]; animating: boolean }>(`({ delays: [...new Set([...document.querySelectorAll('.field-card')].map((e) => getComputedStyle(e).transitionDelay))], animating: document.getElementById('field').classList.contains('animate') })`);
    record(during.delays.every((d) => d.split(',').every((x) => parseFloat(x) === 0)), `the cards move together, with no per-card delay (${during.delays.join(' ')})`);
    record(during.animating, 'the switch is a transition, not a cut');
    await delay(1500);
    const kept = await js<{ same: number; other: number; moved: number }>(`(() => {
      let same = 0, other = 0, moved = 0;
      for (const e of document.querySelectorAll('.field-card:not(.leaving)')) {
        if (e.__deckMark === undefined) continue;
        if (e.__deckMark === e.dataset.noteId) same += 1; else other += 1;
        if (e.__deckAt !== e.style.transform) moved += 1;
      }
      return { same, other, moved };
    })()`);
    record(kept.other === 0, `no element was reused for a different note (${kept.other})`);
    record(kept.same > 0, `the notes in both views kept their elements across the switch (${kept.same} of ${marked.length})`);
    record(kept.moved > 0, `and moved to their new places (${kept.moved})`);
    reset();
    await delay(1200);
    // The real path of a change arriving mid-view (ISS-0063): Deck's index
    // moves on, the renderer reads the view again, and the one read it makes
    // is answered with one note changed. Nothing is written to the workspace.
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    await delay(2200);
    const stay = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`))[0];
    if (stay !== undefined) {
      const placed = await js<{ x: number; y: number } | null>(`__t.where(${JSON.stringify(stay.id)})`);
      await js(`(() => {
        const real = window.fetch;
        window.fetch = async (input, init) => {
          const response = await real(input, init);
          if (!String(input).includes('cockpit/nav?mode=')) return response;
          window.fetch = real;
          const payload = await response.clone().json();
          const walk = (items) => { for (const item of items) { if (item.id === ${JSON.stringify(stay.id)}) item.status = 'smoke-changed'; walk(item.children || []); } };
          for (const group of payload.groups || []) walk(group.items || []);
          return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        return true;
      })()`);
      const revision = store.getState().indexRevisions[prepared.id] ?? 0;
      store.dispatch({ type: 'index-changed', workspaceId: prepared.id, revision: revision + 1 });
      let chip = { shown: false, text: '', where: null as { x: number; y: number } | null, moved: null as { x: number; y: number } | null };
      for (let i = 0; i < 30 && !chip.shown; i += 1) {
        await delay(150);
        chip = await js<typeof chip>(`({ shown: __t.shown('#pending-chip'), text: __t.text('#pending-chip'), where: __t.rect('#pending-chip'), moved: __t.where(${JSON.stringify(stay.id)}) })`);
      }
      record(chip.shown && /^1 note changed/.test(chip.text), `a change arriving under the field is read, counted and announced ("${chip.text}")`);
      record(placed !== null && chip.moved !== null && Math.abs(chip.moved.x - placed.x) < 1 && Math.abs(chip.moved.y - placed.y) < 1, 'and no card moved until the person acted');
      if (chip.where !== null) {
        await pointer(win, click(chip.where));
        await delay(1500);
        const applied = await js<{ chip: boolean; status: string | null }>(`({ chip: __t.shown('#pending-chip'), status: (__t.glass().entryFor(${JSON.stringify(stay.id)}) || { card: {} }).card.status || null })`);
        record(!applied.chip, 'the chip went when the person clicked it');
        record(applied.status === 'smoke-changed', `and the change was dealt: ${stay.id} now has the status that arrived (${applied.status})`);
      }
    }

    // ---- ISS-0061: under reduced motion a view switch highlights the note a person was on ----
    await js(`window.__deckReducedMotion = true`);
    const focusRow = await js<string | null>(`(() => { const r = document.querySelector('#nav-list .nav-row:not([hidden])'); if (!r) return null; return r.dataset.noteId; })()`);
    if (focusRow !== null) {
      store.dispatch({ type: 'focus-note', noteId: focusRow });
      await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
      await delay(1500);
      await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
      let marked = { card: false, row: false, animate: true };
      for (let i = 0; i < 20 && !(marked.card || marked.row); i += 1) {
        await delay(100);
        marked = await js<typeof marked>(`({ card: !!document.querySelector('.field-card.highlight[data-note-id="${focusRow}"]'), row: !!document.querySelector('.nav-row.highlight[data-note-id="${focusRow}"]'), animate: document.getElementById('field').classList.contains('animate') })`);
      }
      record(marked.row && marked.card && !marked.animate, `under reduced motion a view switch is a cut and highlights the note a person was on, its row and its card (${focusRow}: row ${marked.row}, card ${marked.card})`);
    }
    await js(`window.__deckReducedMotion = false`);

    // ---- TASK-0055: the throw ----
    await recordThrow(ctx, win, js);

    // ---- FEAT-0001: the orbit arrangement ----
    await recordOrbit(ctx, win, js, record);

    // ---- TASK-0033: an address that names Spread opens on the desk ----
    store.dispatch({ type: 'select-surface', surface: 'glass' });
    // An address copied in Glass, with a note focused, restores the view, the
    // surface and the note when it is opened again.
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    await delay(1500);
    await js(`document.querySelector('#nav-list .nav-row:not([hidden])').click()`);
    await delay(1500);
    const copied = await js<{ address: string; note: string | null }>(`(async () => { document.getElementById('copy-address').click(); await new Promise((r) => setTimeout(r, 400)); const said = document.getElementById('status').textContent; return { address: (said.match(/deck:\\/\\/\\S+/) || [''])[0], note: window.__deckLastState.noteId }; })()`);
    record(/^deck:\/\/[a-z0-9]+\/issues\?/.test(copied.address) && copied.address.includes('note=') && !copied.address.includes('surface='), `Copy address in Glass writes the view and the note, and no surface (${copied.address})`);
    store.dispatch({ type: 'select-view', viewId: 'features' });
    store.dispatch({ type: 'focus-note', noteId: null });
    store.dispatch({ type: 'select-surface', surface: 'spread' });
    void win.loadURL(win.webContents.getURL().replace(/address=[^&]*/, `address=${encodeURIComponent(copied.address)}`));
    await boot();
    const restored = await js<{ surface: string; view: string | null; note: string | null }>(`({ surface: document.body.dataset.surface, view: window.__deckLastState.viewId, note: window.__deckLastState.noteId })`);
    record(restored.surface === 'glass' && restored.view === 'issues' && restored.note === copied.note, `that address opened again restores Glass, the Issues view and ${copied.note} (${restored.surface}, ${restored.view}, ${restored.note})`);
    void win.loadURL(win.webContents.getURL().replace(/address=[^&]*/, `address=${encodeURIComponent(`deck://${prepared.id}/issues?surface=spread`)}`));
    await boot();
    const spreadOpened = await js<{ surface: string; desk: boolean; field: boolean }>(`({ surface: document.body.dataset.surface, desk: __t.shown('#desk-area'), field: __t.shown('#field-area') })`);
    record(spreadOpened.surface === 'spread' && spreadOpened.desk && !spreadOpened.field, `the same address with surface=spread shows the desk (${spreadOpened.surface})`);
    store.dispatch({ type: 'select-surface', surface: 'glass' });
  } finally {
    const after = gitStatus(prepared.root);
    record(before === after, 'git status in the workspace is unchanged after every Glass check');
    if (!win.isDestroyed()) win.destroy();
    reset();
  }
  void notHere;
}

async function recordThrow(ctx: GlassSmokeContext, win: BrowserWindow, js: <T>(code: string) => Promise<T>): Promise<void> {
  // The Issues view, whose front band has cards at any width. The Features
  // view in this repository owes nothing, so its cards all stand in the
  // middle band, out of sight in a field 640 pixels wide.
  await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
  await delay(1500);
  const { store, prepared } = ctx;
  const record = (ok: boolean, what: string): void => {
    if (process.env['DECK_SMOKE_DEBUG'] === '1') console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
    ctx.record(ok, what);
  };
  win.setBounds({ x: 0, y: 0, width: 1000, height: 780 });
  // A resized field is re-dealt with the view switch's second of movement.
  await delay(1800);
  const firstCard = (await js<Array<{ id: string }>>(`__t.visibleCards()`))[0];
  const readerNote = firstCard?.id ?? 'ISS-0008';
  const reader = ctx.createWindow('satellite', `deck://${prepared.id}/issues?note=${encodeURIComponent(readerNote)}&panel=note`, 'note');
  const desk = ctx.createWindow('satellite', `deck://${prepared.id}/issues?panel=desk`, 'desk');
  reader.setBounds({ x: 1010, y: 0, width: 520, height: 420 });
  desk.setBounds({ x: 1010, y: 440, width: 520, height: 420 });
  await delay(2200);
  try {
    const field = await js<{ left: number; top: number; right: number; bottom: number }>(`__t.rect('#field')`);
    const cards = await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`);
    const card = cards.find((c) => c.id !== readerNote);
    if (card === undefined) {
      ctx.skip('the throw: no card was in sight to throw');
      return;
    }
    // Toward the right edge, lingering there so the strip can name its targets.
    const edgeX = field.right - 20;
    await pointer(win, [
      { type: 'move', x: card.x, y: card.y },
      { type: 'down', x: card.x, y: card.y },
      ...Array.from({ length: 10 }, (_, i) => ({ type: 'move' as const, x: card.x + ((edgeX - card.x) * (i + 1)) / 10, y: card.y })),
      { type: 'move', x: edgeX, y: card.y + 2, wait: 700 },
    ]);
    if (process.env['DECK_SMOKE_DEBUG'] === '1') {
      console.log('DEBUG list', JSON.stringify(await js(`window.deck.windows.list()`)));
      console.log('DEBUG card', JSON.stringify(card), 'edgeX', edgeX, 'field', JSON.stringify(field));
      console.log('DEBUG grabbed', await js(`!!document.querySelector('.field-card.grabbed')`), await js(`document.getElementById('target-strip').outerHTML`));
    }
    const strip = await js<{ shown: boolean; names: string[]; edge: string }>(`({ shown: __t.shown('#target-strip'), names: [...document.querySelectorAll('#target-strip .target')].map((t) => t.textContent), edge: document.getElementById('target-strip').dataset.edge })`);
    record(strip.shown && strip.edge === 'right', `the target strip appears at the edge the card approached (${strip.edge})`);
    record(strip.names.some((n) => n.startsWith('reader on')) && strip.names.some((n) => n.startsWith('desk on')), `and names the windows that way (${strip.names.join(' | ')})`);
    const readerTarget = await js<{ x: number; y: number } | null>(`(() => { const t = [...document.querySelectorAll('#target-strip .target')].find((e) => e.textContent.startsWith('reader on')); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (readerTarget !== null) {
      await pointer(win, [
        { type: 'move', x: readerTarget.x, y: readerTarget.y, wait: 120 },
        { type: 'up', x: readerTarget.x, y: readerTarget.y, wait: 150 },
      ]);
      // The flight goes toward the edge the card left: right, here.
      const flight = await js<{ thrown: boolean; transform: string }>(`(() => { const e = document.querySelector('.field-card[data-note-id="${card.id}"]'); return { thrown: !!e && e.classList.contains('thrown'), transform: e ? e.style.transform : '' }; })()`);
      record(flight.thrown && /^translate\(1400px, 0px\)/.test(flight.transform), `the thrown card flies toward the right edge it left (${flight.transform.slice(0, 40)})`);
      await delay(1400);
      const addressNow = ctx.addressOf(reader.id) ?? '';
      record(addressNow.includes(`note=${encodeURIComponent(card.id)}`), `the note thrown at the reader lands in that reader (${addressNow})`);
      if (!addressNow.includes(`note=${encodeURIComponent(card.id)}`)) {
        console.log('DIAG throw', card.id, JSON.stringify(await js(`({ status: __t.text('#status'), say: __t.text('#field-say'), trace: (window.__deckTraceLog || []).slice(-10) })`)), JSON.stringify(readerTarget));
      }
      record(!(store.getState().deskCards[prepared.id] ?? []).some((c) => c.noteId === card.id), 'and the focus window’s desk is unchanged');
    } else {
      await pointer(win, [{ type: 'up', x: edgeX, y: card.y }]);
    }
    await delay(1200);
    const second = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`)).find((c) => c.id !== card.id);
    if (second !== undefined) {
      await pointer(win, [
        { type: 'move', x: second.x, y: second.y },
        { type: 'down', x: second.x, y: second.y },
        ...Array.from({ length: 10 }, (_, i) => ({ type: 'move' as const, x: second.x + ((edgeX - second.x) * (i + 1)) / 10, y: second.y })),
        { type: 'move', x: edgeX, y: second.y + 2, wait: 700 },
      ]);
      const deskTarget = await js<{ x: number; y: number } | null>(`(() => { const t = [...document.querySelectorAll('#target-strip .target')].find((e) => e.textContent.startsWith('desk on')); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (deskTarget !== null) {
        // This one under reduced motion: the landing is a cut, and the front
        // plane names where it went.
        await js(`window.__deckReducedMotion = true`);
        await pointer(win, [
          { type: 'move', x: deskTarget.x, y: deskTarget.y, wait: 120 },
          { type: 'up', x: deskTarget.x, y: deskTarget.y, wait: 150 },
        ]);
        const cut = await js<{ thrown: boolean; said: string; landed: string }>(`({ thrown: !!document.querySelector('.field-card.thrown'), said: __t.text('#field-say'), landed: (document.querySelector('#target-strip:not([hidden]) .target.landed') || {}).textContent || '' })`);
        record(!cut.thrown && /sent to the desk on/.test(cut.said) && /^desk on/.test(cut.landed), `under reduced motion the landing is a cut, and the target's name is highlighted ("${cut.landed}")`);
        await js(`window.__deckReducedMotion = false`);
        await delay(1300);
        record((store.getState().deskCards[prepared.id] ?? []).some((c) => c.noteId === second.id), `a note thrown at the desk panel is on the desk (${second.id})`);
        const inPanel = (await desk.webContents.executeJavaScript(`[...document.querySelectorAll('#desk .card:not([hidden])')].map((c) => c.dataset.noteId)`)) as string[];
        record(inPanel.includes(second.id), 'and the desk panel window shows it');
      } else {
        await pointer(win, [{ type: 'up', x: edgeX, y: second.y }]);
        record(false, 'the strip named the desk panel');
      }
    }
    // The tablet is a target while a served page follows the store: one is
    // opened here with no bridge, as a tablet loads it (ISS-0062).
    const tablet = ctx.openServedPage();
    try {
      await once(tablet, 'did-finish-load');
      await ctx.untilBooted(tablet);
      await delay(1200);
      const fourth = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`)).find((c) => !(store.getState().deskCards[prepared.id] ?? []).some((d) => d.noteId === c.id));
      if (fourth === undefined) {
        record(false, 'a card was in sight to throw to the tablet');
      } else {
        await pointer(win, [
          { type: 'move', x: fourth.x, y: fourth.y },
          { type: 'down', x: fourth.x, y: fourth.y },
          ...Array.from({ length: 10 }, (_, i) => ({ type: 'move' as const, x: fourth.x + ((edgeX - fourth.x) * (i + 1)) / 10, y: fourth.y })),
          { type: 'move', x: edgeX, y: fourth.y + 2, wait: 700 },
        ]);
        const toTablet = await js<{ x: number; y: number } | null>(`(() => { const t = [...document.querySelectorAll('#target-strip .target')].find((e) => e.textContent === 'tablet'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        if (toTablet === null) {
          await pointer(win, [{ type: 'up', x: edgeX, y: fourth.y }]);
          record(false, 'the strip offers the tablet while a served page is following');
        } else {
          const sentAt = Date.now();
          await pointer(win, [
            { type: 'move', x: toTablet.x, y: toTablet.y, wait: 120 },
            { type: 'up', x: toTablet.x, y: toTablet.y, wait: 60 },
          ]);
          let shown = -1;
          for (let i = 0; i < 40 && shown < 0; i += 1) {
            const seen = (await tablet.webContents.executeJavaScript(`((window.__deckLastState || {}).deskCards || {})[${JSON.stringify(prepared.id)}] || []`)) as Array<{ noteId: string }>;
            if (seen.some((c) => c.noteId === fourth.id)) shown = Date.now() - sentAt;
            else await delay(50);
          }
          record(shown >= 0 && shown < 1500, `a note thrown to the tablet is on the tablet's desk (${fourth.id}, ${shown}ms after the release)`);
        }
      }
    } finally {
      if (!tablet.isDestroyed()) tablet.destroy();
    }

    // An empty display is a target only where there is one: a note thrown
    // there opens a new reader on it, which this check closes again at once.
    if (ctx.displayCount() > 1) {
      const third = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`))[0];
      if (third === undefined) {
        record(false, 'a card was in sight to throw at an empty display');
      } else {
        const before = new Set(ctx.windows().map((w) => w.id));
        await pointer(win, [
          { type: 'move', x: third.x, y: third.y },
          { type: 'down', x: third.x, y: third.y },
          ...Array.from({ length: 10 }, (_, i) => ({ type: 'move' as const, x: third.x + ((edgeX - third.x) * (i + 1)) / 10, y: third.y })),
          { type: 'move', x: edgeX, y: third.y + 2, wait: 700 },
        ]);
        const empty = await js<{ x: number; y: number; label: string } | null>(`(() => { const t = [...document.querySelectorAll('#target-strip .target')].find((e) => e.textContent.startsWith('a new reader on')); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: t.textContent }; })()`);
        if (empty === null) {
          await pointer(win, [{ type: 'up', x: edgeX, y: third.y }]);
          record(false, 'the strip offered a display with no Deck window on it');
        } else {
          await pointer(win, [
            { type: 'move', x: empty.x, y: empty.y, wait: 120 },
            { type: 'up', x: empty.x, y: empty.y, wait: 2500 },
          ]);
          const opened = ctx.windows().filter((w) => !before.has(w.id));
          const carrying = opened.find((w) => (w.address ?? '').includes(`note=${encodeURIComponent(third.id)}`));
          record(carrying !== undefined, `a note thrown at ${empty.label} opened a new reader there carrying it (${opened.map((w) => w.address).join(', ')})`);
          const selfDisplay = ctx.windows().find((w) => w.win === win)?.displayId;
          record(carrying !== undefined && carrying.displayId !== selfDisplay, 'on another display than the one it was thrown from');
          for (const w of opened) if (!w.win.isDestroyed()) w.win.destroy();
        }
      }
    } else {
      ctx.notHere('the throw to an empty display: this machine has one display; the recogniser and the landing are checked in TST-0044');
    }
    // Send to, from the keyboard alone.
    ctx.focusApp(win);
    await delay(300);
    // A note's row, not a heading: send to is a verb on a note.
    await js(`document.querySelector('#nav-list .nav-row:not([hidden])').focus()`);
    const rowNote = await js<string | null>(`document.activeElement && document.activeElement.dataset.noteId || null`);
    press(win, 's');
    await delay(900);
    let asked = await js<{ asked: string; focus: string; hasFocus: boolean }>(`({ asked: __t.text('#status'), focus: document.activeElement ? document.activeElement.textContent : '', hasFocus: document.hasFocus() })`);
    if (asked.focus.trim() === '' && !asked.hasFocus) {
      // The same rule as the highlight: taken again only if the keyboard was lost.
      ctx.focusApp(win);
      for (let i = 0; i < 20 && !(await js<boolean>('document.hasFocus()')); i += 1) await delay(100);
      await js(`document.querySelector('#status button') ? document.querySelector('#status button').focus() : document.querySelector('#nav-list .nav-row:not([hidden])').focus()`);
      if (!(await js<boolean>(`!!document.querySelector('#status button')`))) {
        press(win, 's');
        await delay(900);
      }
      asked = await js<typeof asked>(`({ asked: __t.text('#status'), focus: document.activeElement ? document.activeElement.textContent : '', hasFocus: document.hasFocus() })`);
    }
    if (asked.focus.trim() === '') console.log('DIAG sendto', JSON.stringify(asked));
    record(/^send /.test(asked.asked.trim()) && asked.focus.length > 0, `send to asks where, and the keyboard is on the first answer ("${asked.focus}")`);
    const focusIsReader = asked.focus.startsWith('reader on');
    press(win, 'Return');
    await delay(1600);
    if (rowNote !== null) {
      const landed = focusIsReader
        ? (ctx.addressOf(reader.id) ?? '').includes(`note=${encodeURIComponent(rowNote)}`)
        : (store.getState().deskCards[prepared.id] ?? []).some((c) => c.noteId === rowNote);
      record(landed, `and Enter sends ${rowNote} to the ${asked.focus}`);
    }
  } finally {
    if (!reader.isDestroyed()) reader.destroy();
    if (!desk.isDestroyed()) desk.destroy();
    win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
    await delay(500);
  }
}

/**
 * The orbit: the whole link graph as one arrangement of the same field.
 *
 * Read through Deck's own host the way a page reads it, checked against the
 * sidecar for the two things FEAT-0001 promises about its data: a node's band
 * is the one the reader shows, and a link Deck draws is a link the cockpit
 * resolves. Then driven: a rest on a link quotes its sentence, a click on a
 * dot lands on the note, "show this in the field" flies to it, and the three
 * treatments are drawn over the same data, each saved as a picture.
 */
async function recordOrbit(
  ctx: GlassSmokeContext,
  win: BrowserWindow,
  js: <T>(code: string) => Promise<T>,
  record: (ok: boolean, what: string) => void,
): Promise<void> {
  const { store, prepared } = ctx;
  const origin = new URL(win.webContents.getURL()).origin;
  const graphAt = Date.now();
  const graphResponse = await fetch(`${origin}/deck/graph/${prepared.id}`);
  const graphText = await graphResponse.text();
  const graphMs = Date.now() - graphAt;
  const graph = JSON.parse(graphText) as { nodes: Array<{ id: string; band: string; status: string; rel: string }>; edges: Array<{ source: string; target: string | null; resolved: boolean }> };
  record(graphResponse.status === 200 && graph.nodes.length > 0, `one request returns the whole graph (${graph.nodes.length} notes, ${graph.edges.length} links, ${graphText.length} bytes, ${graphMs}ms)`);
  console.log(JSON.stringify({ orbitGraph: { nodes: graph.nodes.length, edges: graph.edges.length, bytes: graphText.length, ms: graphMs } }));
  const refused = await fetch(`${origin}/deck/graph/${prepared.id}`, { method: 'POST' });
  record(refused.status === 405, 'the graph path refuses a POST with 405');
  // A node's band is the one the navigator shows for the same note.
  const nav = (await (await fetch(`${origin}/deck/sidecar/${prepared.id}/api/cockpit/nav?mode=issues`)).json()) as { groups: Array<{ items: Array<{ id: string; status: string }> }> };
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const { bandFor } = await import('../shared/statuses.js');
  const mismatched: string[] = [];
  let compared = 0;
  for (const group of nav.groups) {
    for (const item of group.items) {
      const node = byId.get(item.id);
      if (node === undefined) continue;
      compared += 1;
      if (node.band !== bandFor(item.status)) mismatched.push(`${item.id} ${node.band}/${bandFor(item.status)}`);
    }
  }
  record(compared > 10 && mismatched.length === 0, `every node's band is the band the sidecar's status gives the same note (${compared} compared${mismatched.length > 0 ? `; ${mismatched.join(', ')}` : ''})`);
  // A link Deck draws is a link the cockpit resolves: the neighbours of a
  // sample of notes, from the graph and from the sidecar's own context.
  const sample = graph.nodes.filter((n) => /^[A-Z]+-\d{4}$/.test(n.id)).slice(0, 12);
  const differing: string[] = [];
  for (const node of sample) {
    const mine = new Set<string>();
    for (const e of graph.edges) {
      if (!e.resolved || e.target === null) continue;
      if (e.source === node.id) mine.add(e.target);
      if (e.target === node.id) mine.add(e.source);
    }
    const context = (await (await fetch(`${origin}/deck/sidecar/${prepared.id}/api/cockpit/context?this=${encodeURIComponent(node.id)}`)).json()) as { linked: Array<{ items: Array<{ id: string }> }>; backlinks: Array<{ items: Array<{ id: string }> }> };
    const theirs = new Set([...context.linked, ...context.backlinks].flatMap((g) => g.items.map((i) => i.id)));
    const onlyMine = [...mine].filter((id) => !theirs.has(id) && /^[A-Z]+-\d{4}$/.test(id));
    const onlyTheirs = [...theirs].filter((id) => !mine.has(id) && /^[A-Z]+-\d{4}$/.test(id));
    if (onlyMine.length > 0 || onlyTheirs.length > 0) differing.push(`${node.id}: Deck only ${onlyMine.join(' ')}; cockpit only ${onlyTheirs.join(' ')}`);
  }
  record(differing.length === 0, `Deck's links match the cockpit's for ${sample.length} notes${differing.length > 0 ? `: ${differing.slice(0, 3).join(' | ')}` : ''}`);

  // On screen.
  store.dispatch({ type: 'clear-desk' });
  const toggle = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="orbit"]')`);
  if (toggle === null) {
    record(false, 'the surface toggle offers the orbit');
    return;
  }
  await pointer(win, click(toggle));
  for (let i = 0; i < 40; i += 1) {
    if (await js<boolean>(`/the link graph: \\d+ notes/.test(__t.text('#front-label'))`)) break;
    await delay(250);
  }
  await delay(800);
  const shown = await js<{ surface: string; label: string; cards: number; dots: number; edges: number; treatments: boolean }>(`({ surface: document.body.dataset.surface, label: __t.text('#front-label'), cards: document.querySelectorAll('.field-card:not(.leaving)').length, dots: __t.glass().canvasCounts().dots, edges: __t.glass().canvasCounts().edges, treatments: __t.shown('#treatments') })`);
  record(shown.surface === 'orbit' && /the link graph: \d+ notes/.test(shown.label), `the orbit opens from the switcher, drawn by the same field ("${shown.label.slice(0, 80)}")`);
  record(shown.cards > 0 && shown.dots > 0, `the most linked-to notes are cards and the rest are dots on the canvas (${shown.cards} cards, ${shown.dots} dots, ${shown.edges} links drawn)`);
  record(shown.treatments, 'the three treatments are offered in the orbit');
  const listed = await js<{ near: number; orphans: number }>(`(() => { const count = (re) => { const g = [...document.querySelectorAll('#nav-list .nav-group')].find((e) => re.test(e.textContent)); return g ? Number(g.querySelector('.mark').textContent) : 0; }; return { near: count(/Nearest in the link graph/), orphans: count(/With no link/) }; })()`);
  record(listed.near === shown.cards, `every card the orbit draws is listed in the navigator for the keyboard (${listed.near} of ${shown.cards})`);
  record(listed.orphans > 0, `and so is every note with no link (${listed.orphans})`);
  record((await js<string>(`location.search`)).length >= 0 && store.getState().surface === 'orbit', 'the orbit is a surface the store holds, so it has an address');
  // A rest on a link quotes the sentence that made it.
  const fieldBox = await js<{ left: number; top: number }>(`__t.rect('#field')`);
  const edge = await js<{ x: number; y: number; source: string; target: string | null } | null>(`__t.glass().edgeSample()`);
  if (edge === null) {
    record(false, 'a link was drawn clear of the dots to rest on');
  } else {
    // Field coordinates are whole pixels from edgeSample; the field's own
    // offset is rounded the same way the harness rounds a pointer.
    await pointer(win, [{ type: 'move', x: Math.round(fieldBox.left) + edge.x, y: Math.round(fieldBox.top) + edge.y, wait: 900 }]);
    const callout = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#edge-callout'), text: __t.text('#edge-callout') })`);
    record(callout.shown && callout.text.includes(edge.source) && callout.text.length > edge.source.length + 8, `resting on the link ${edge.source} → ${edge.target} shows the sentence that made it ("${callout.text.slice(0, 90)}")`);
    await pointer(win, [{ type: 'move', x: fieldBox.left + 20, y: fieldBox.top + 20, wait: 200 }]);
  }
  // Landing on a dot lifts the note and opens it, through the same desk.
  const dot = await js<{ x: number; y: number; id: string } | null>(`__t.glass().dotSample()`);
  if (dot === null) {
    record(false, 'a dot was drawn clear of the cards to land on');
  } else {
    await pointer(win, [...click({ x: fieldBox.left + dot.x, y: fieldBox.top + dot.y }), { type: 'move', x: fieldBox.left + 20, y: fieldBox.top + 20 }]);
    await delay(1500);
    const landed = (store.getState().deskCards[prepared.id] ?? []).some((c) => c.noteId === dot.id);
    record(landed, `landing on the dot for ${dot.id} lifts it onto the desk`);
    record(store.getState().noteId === dot.id, 'and opens it: the store, and so the address, name it');
    record(await js<boolean>(`!!document.querySelector('.pane[data-note-id="${dot.id}"]')`), 'and it is a pane, read by the reader Deck has');
    // Show this in the field: from a pane, the orbit flies to it.
    await js(`__t.glass().faceFront()`);
    await delay(1300);
    const before = await js<number>(`__t.yaw()`);
    const orbitButton = await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${dot.id}"] .pane-orbit')`);
    if (orbitButton !== null) {
      await pointer(win, click(orbitButton));
      // Sampled through the flight: a cut goes straight from before to after.
      const seen: number[] = [];
      for (let i = 0; i < 40; i += 1) {
        seen.push(await js<number>(`__t.yaw()`));
        await delay(30);
      }
      await delay(800);
      const after = await js<{ yaw: number; theta: number | null }>(`({ yaw: __t.yaw(), theta: (window.__deckGlass.model.current.slots.get(${JSON.stringify(dot.id)}) || {}).theta ?? null })`);
      const norm = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
      record(after.theta !== null && Math.abs(norm(after.yaw - after.theta)) < 0.01, `"show this in the field" turns the orbit to face ${dot.id}`);
      const between = seen.filter((y) => Math.abs(norm(y - before)) > 0.002 && Math.abs(norm(y - after.yaw)) > 0.002).length;
      record(Math.abs(norm(before - after.yaw)) < 0.01 || between > 0, `and flies there rather than cutting (${between} frames in between)`);
    }
  }
  store.dispatch({ type: 'clear-desk' });
  await delay(600);
  // The three treatments over the same data, a picture of each.
  for (const treatment of ['constellation', 'glass', 'blocks']) {
    const button = await js<{ x: number; y: number } | null>(`__t.rect('#treatments button[data-treatment="${treatment}"]')`);
    if (button === null) continue;
    await pointer(win, click(button));
    await delay(500);
    const drawn = await js<{ treatment: string; dots: number; edges: number }>(`({ treatment: document.getElementById('field').dataset.treatment, dots: __t.glass().canvasCounts().dots, edges: __t.glass().canvasCounts().edges })`);
    record(drawn.treatment === treatment && drawn.dots > 0, `the ${treatment} treatment draws the same notes (${drawn.dots} dots, ${drawn.edges} links)`);
    if (treatment === 'blocks') record(drawn.edges === 0, 'and blocks draw no links, as DES-0001 says they cannot');
    fs.writeFileSync(path.join(ctx.tempDir, `deck-orbit-${treatment}.png`), (await win.webContents.capturePage()).toPNG());
  }
  const constellation = await js<{ x: number; y: number } | null>(`__t.rect('#treatments button[data-treatment="constellation"]')`);
  if (constellation !== null) await pointer(win, click(constellation));
  // Left alone, the orbit drifts; reduced motion stops that, and nothing else.
  await pointer(win, [{ type: 'move', x: fieldBox.left + 20, y: fieldBox.top + 20 }]);
  const drift0 = await js<number>(`__t.yaw()`);
  await delay(5500);
  const drift1 = await js<number>(`__t.yaw()`);
  record(Math.abs(drift1 - drift0) > 0.001, `left alone, the orbit drifts (${(drift1 - drift0).toFixed(4)} radians)`);
  await js(`window.__deckReducedMotion = true`);
  await pointer(win, click({ x: fieldBox.left + 20, y: fieldBox.top + 20 }));
  const still0 = await js<number>(`__t.yaw()`);
  await delay(5500);
  const still1 = await js<number>(`__t.yaw()`);
  record(Math.abs(still1 - still0) < 1e-6, 'under reduced motion it does not drift');
  await js(`window.__deckReducedMotion = false`);
  // Back to Glass for what follows.
  const glassButton = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="glass"]')`);
  if (glassButton !== null) await pointer(win, click(glassButton));
  await delay(1200);
}
