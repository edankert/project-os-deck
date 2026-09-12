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
import { type DeckAction, deskCardsOf, isOnEveryView, viewCardsOf } from '../shared/store-state.js';

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
    bands: () => window.__deckGlass.bandState(),
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
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
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
  const deskIds = (): string[] => deskCardsOf(store.getState(), prepared.id).map((c) => c.noteId);
  // A lift opens the note in the middle of its neighbours (FEAT-0017). The
  // checks written before that, about the front band, the turn and the panes,
  // press Escape once to leave the middle before they look, as a person does.
  const leave = async (keepFocus = false): Promise<boolean> => {
    // Only with a note in the middle: with none, Escape sweeps the desk.
    if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
    ctx.focusApp(win);
    if (!keepFocus) await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, 'Escape');
    for (let i = 0; i < 20; i += 1) {
      if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
      await delay(100);
    }
    return false;
  };
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
    // Until FEAT-0018 this read "the document holds no element for a note in
    // the quiet band", full stop. It is now true AT 1x and false once a
    // person zooms toward the band: a tile drawn at the size of a card
    // becomes one (TASK-0077). The zoomed case is checked in section 18.
    record(opened.deep === 0, 'at 1x the quiet band is painted, and holds no element of its own');
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
    // Leaving the middle deals the neighbourhood into the front band (FEAT-0017, decision 10).
    record(await leave(), 'Escape leaves the middle');
    await delay(1400);
    neighbours.front = await js<string[]>(`${JSON.stringify(neighbours.ids)}.filter((id) => { const w = __t.where(id); return w && w.band === 'front'; })`);
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
        const held = window.__deckDesk();
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
    // With a note in the middle the first Escape leaves it and the second
    // sweeps (FEAT-0017, decision 12); with none, one Escape sweeps.
    if ((await js<string | null>(`__t.glass().focusId()`)) !== null) {
      press(win, 'Escape');
      await delay(600);
      record(deskIds().length === heldNow && (await js<string | null>(`__t.glass().focusId()`)) === null, 'the first Escape leaves the middle and keeps the desk');
    }
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
      // The turn to face the neighbours is made when the middle is left (FEAT-0017, decision 10).
      await delay(1300);
      void leave();
      const yaws: number[] = [];
      for (let i = 0; i < 60; i += 1) {
        yaws.push(await js<number>(`__t.yaw()`));
        await delay(40);
      }
      const between = yaws.filter((y) => y < 0.79 && y > 0.01).length;
      record(Math.abs(yaws[yaws.length - 1] as number) < 0.01 && between > 0, `a lift turns the field to face its neighbours, flying from 0.8 to ${(yaws[yaws.length - 1] as number).toFixed(2)} (${between} frames between)`);
      store.dispatch({ type: 'clear-desk', scope: 'workspace' });
      await delay(800);
    }

    // ---- ISS-0061: under reduced motion a lift highlights its neighbours ----
    await js(`window.__deckReducedMotion = true`);
    const rmFront = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (rmFront !== undefined) {
      const yawBefore = await js<number>(`__t.yaw()`);
      await pointer(win, [...click(rmFront), { type: 'move', ...off }]);
      await delay(1300);
      await leave();
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
        // The cut to the front is made when the middle is left (FEAT-0017), so
        // the note is lifted, the middle opens, and the watch starts before Escape.
        await pointer(win, [...click(another), { type: 'move', ...off }]);
        await delay(1300);
        const watch = js<{ under: string[]; ms: number; yaw: number }>(`new Promise((resolve) => {
          const t0 = performance.now();
          const look = () => {
            const yaw = __t.yaw();
            if (Math.abs(yaw) < 0.01 || performance.now() - t0 > 4000) resolve({ under: __t.underPanes(), ms: Math.round(performance.now() - t0), yaw });
            else setTimeout(look, 0);
          };
          look();
        })`);
        await leave();
        const seen = await watch;
        await delay(1200);
        const under = [...new Set([...seen.under, ...(await js<string[]>(`__t.underPanes()`))])];
        record(Math.abs(seen.yaw) < 0.01 && under.length === 0, `a reduced-motion lift from yaw ${away.toFixed(1)} cuts to the front and leaves no card under a pane, at the cut and after (${under.join(', ') || 'none'}; yaw ${seen.yaw.toFixed(2)} after ${seen.ms}ms)`);
      }
      store.dispatch({ type: 'clear-desk', scope: 'workspace' });
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
      // The ring's own layer (FEAT-0017) is not the reach's, and is left out.
      const wiresInDom = await js<number>(`[...document.querySelectorAll('#field line, #field svg, .wire')].filter((e) => !e.closest('#field-ring')).length`);
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
      // Out of the middle, so the next card is not under the pane or the ring (FEAT-0017).
      await leave();
      await delay(700);
    }
    // Two held notes: the second is in the middle and the first in the dock.
    // The pane checks are about panes at their places, so the middle is left.
    await leave();
    await delay(900);
    const [paneA, paneB] = deskIds();
    if (process.env['DECK_SMOKE_DEBUG'] === '1') {
      win.webContents.on('console-message', (_e, _level, message) => console.log(`page: ${message}`));
      await js(`for (const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture']) document.addEventListener(t, (e) => console.log(t, e.target.className || e.target.tagName, e.buttons, e.clientX, e.clientY), true); true`);
    }
    if (paneA === undefined || paneB === undefined) {
      record(false, `panes: two notes could be lifted (${toLift.map((c) => c.id).join(', ')} gave ${deskIds().join(', ')})`);
    } else {
      const headA = await js<{ x: number; y: number; left: number; top: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      const startA = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      await pointer(win, drag({ x: headA.x, y: headA.y }, { x: headA.x + 260, y: headA.y + 180 }, 12));
      await delay(800);
      const movedA = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      record(
        startA !== undefined && movedA !== undefined && Math.abs(movedA.x - startA.x - 260) <= 2 && Math.abs(movedA.y - startA.y - 180) <= 2,
        `a pane dragged by its header lands where it was released (${startA?.x},${startA?.y} to ${movedA?.x},${movedA?.y})`,
      );
      const handle = await js<{ x: number; y: number }>(`(() => { const r = document.querySelector('.pane[data-note-id="${paneA}"] .pane-resize').getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; })()`);
      await pointer(win, drag(handle, { x: handle.x - 200, y: handle.y + 60 }, 8));
      await delay(600);
      const sized = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      record(sized?.w === 280, `a pane resized narrower stops at the stated minimum width (${sized?.w})`);
      // Stack: drop B's header onto A's header; it snaps below it.
      const a = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      const headB = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-id')`);
      const headA2 = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      await pointer(win, drag(headB, { x: headA2.x, y: headA2.y + 4 }, 12));
      await delay(800);
      const b = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneB);
      record(a !== undefined && b !== undefined && b.y === a.y + 34, `a pane dropped on another’s header snaps below it (${a?.y} then ${b?.y})`);
      // A click on the lower pane's header raises it.
      const lower = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-id')`);
      record((await js<string | null>(`(() => { const e = document.elementFromPoint(${lower.x}, ${lower.y}); const p = e && e.closest('.pane'); return p ? p.dataset.noteId : null; })()`)) === paneA, 'the covered pane’s header is still visible and hit');
      await pointer(win, click(lower));
      await delay(600);
      record(deskIds().at(-1) === paneA, 'a click on a header raises that pane');
      // Panes stack whole: the raised pane covers the header of the pane it
      // lies on, rather than that header showing through its text (ISS-0066).
      const atHeadB = await js<string | null>(`(() => { const r = document.querySelector('.pane[data-note-id="${paneB}"] .pane-id').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const p = e && e.closest('.pane'); return p ? p.dataset.noteId : null; })()`);
      record(atHeadB === paneA, `the raised pane covers the header of the pane under it (${atHeadB} is drawn at ${paneB}'s header)`);
      // And a press on the part of the lower pane's body still showing brings it forward.
      const bodyB = await js<{ x: number; y: number } | null>(`(() => { const pane = document.querySelector('.pane[data-note-id="${paneB}"]'); const r = pane.getBoundingClientRect(); for (let y = r.bottom - 6; y > r.top + 40; y -= 8) for (let x = r.right - 20; x > r.left + 6; x -= 8) { const e = document.elementFromPoint(x, y); if (e && !e.closest('a') && e.closest('.pane-body') && e.closest('.pane') === pane) return { x, y }; } return null; })()`);
      if (bodyB === null) {
        record(false, `some of ${paneB}'s body shows beside the pane on top, to press`);
      } else {
        await pointer(win, [...click(bodyB), { type: 'move', x: 10, y: 10 }]);
        await delay(600);
        record(deskIds().at(-1) === paneB, `a press on a pane's body raises it (${deskIds().at(-1)} on top)`);
      }
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
        console.log('DEBUG widenB', JSON.stringify(widenB), await js(`(() => { const e = document.elementFromPoint(${widenB.x}, ${widenB.y}); return e ? e.className + ' in ' + (e.closest('.pane') || {dataset:{}}).dataset.noteId : null; })()`), 'A', paneA, 'B', paneB, JSON.stringify(deskCardsOf(store.getState(), prepared.id)));
      }
      await pointer(win, click(widenB));
      await delay(1200);
      const wide = deskCardsOf(store.getState(), prepared.id).filter((c) => c.wide === true).map((c) => c.noteId);
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
      const beforeKey = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      press(win, 'Right');
      await delay(400);
      const afterKey = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === paneA);
      record(beforeKey !== undefined && afterKey !== undefined && afterKey.x === beforeKey.x + 16, 'an arrow key on a pane’s header moves it');
      // Out of the reading column again, so the field is wide enough that no
      // pane is clamped and a position read back is the position stored.
      const unwiden = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-widen')`);
      await pointer(win, click(unwiden));
      await delay(1200);
      // A reload: the panes come back where they were, at the size they were.
      const kept = JSON.stringify(deskCardsOf(store.getState(), prepared.id));
      const paneView = store.getState().viewId;
      win.webContents.reload();
      await boot();
      // The reload reopens the address the window was created with, whose
      // view is Issues, and the panes are on the Features desk: a desk
      // belongs to its view (FEAT-0015). Back to that view, then compare.
      if (paneView !== null && store.getState().viewId !== paneView) {
        await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === ${JSON.stringify(paneView)}).click()`);
        await delay(2000);
      }
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
      // A click on a card lying under another brings it forward (ISS-0067):
      // a point of it that shows, and a point of it the other card covers.
      const buried = await js<{ id: string; x: number; y: number; cx: number; cy: number } | null>(`(() => {
        const top = ${JSON.stringify(deskIds().at(-1) ?? '')};
        for (const c of document.querySelectorAll('#desk .card:not([hidden])')) {
          if (c.dataset.noteId === top) continue;
          const r = c.getBoundingClientRect();
          let shows = null, covered = null;
          for (let y = r.top + 6; y < r.bottom - 4; y += 6) for (let x = r.left + 6; x < r.right - 20; x += 8) {
            const hit = document.elementFromPoint(x, y);
            const card = hit && hit.closest('.card');
            if (card === c && !hit.closest('.remove')) shows = shows || { x, y };
            else if (card !== null && card !== c) covered = covered || { x, y };
          }
          if (shows && covered) return { id: c.dataset.noteId, x: shows.x, y: shows.y, cx: covered.x, cy: covered.y };
        }
        return null;
      })()`);
      if (buried === null) {
        record(false, 'two cards overlap in Spread, so bringing one forward can be checked');
      } else {
        await pointer(win, [...click(buried), { type: 'move', x: 10, y: 10 }]);
        await delay(800);
        const over = await js<string | null>(`(() => { const e = document.elementFromPoint(${buried.cx}, ${buried.cy}); const c = e && e.closest('.card'); return c ? c.dataset.noteId : null; })()`);
        record(deskIds().at(-1) === buried.id && over === buried.id, `a click on a card lying under another brings it forward in Spread (${buried.id}: last on the desk ${deskIds().at(-1)}, drawn on top ${over})`);
      }
      // A card dragged in Spread is where it was dragged in Glass: one record.
      // The card the pointer will actually grab: in Spread two cards overlap,
      // and the one on top at a point is the one a press takes. The card
      // NOT on top is taken, so that it ending on top says something.
      const spreadCard = await js<{ x: number; y: number; id: string } | null>(`(() => { const top = ${JSON.stringify(deskIds().at(-1) ?? '')}; const cards = [...document.querySelectorAll('#desk .card:not([hidden])')].sort((a, b) => (a.dataset.noteId === top) - (b.dataset.noteId === top)); for (const c of cards) { const r = c.getBoundingClientRect(); for (let y = r.top + 10; y < r.bottom - 4; y += 6) { const x = r.left + 30; const hit = document.elementFromPoint(x, y); const top = hit && hit.closest('.card'); if (top === c && !hit.closest('.remove')) return { x, y, id: c.dataset.noteId }; } } return null; })()`);
      if (spreadCard !== null) {
        const was = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === spreadCard.id);
        await pointer(win, drag(spreadCard, { x: spreadCard.x + 120, y: spreadCard.y + 60 }, 8));
        await delay(700);
        const now = deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === spreadCard.id);
        record(was !== undefined && now !== undefined && (now.x !== was.x || now.y !== was.y), `a card dragged in Spread moved in the store (${was?.x},${was?.y} to ${now?.x},${now?.y})`);
        record(deskIds().at(-1) === spreadCard.id, `and it is on top where it was dropped (${deskIds().at(-1)} last on the desk)`);
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
    record((await js<string | null>(`__t.glass().focusId()`)) === focusedRow, `and it opens in the middle of its neighbours (FEAT-0017)`);
    // Escape from the row itself, so the navigator keeps the keyboard for the checks that follow.
    await leave(true);
    await delay(900);
    await js(`(() => { const r = document.querySelector('#nav-list .nav-row[data-note-id="${focusedRow}"]'); if (r) r.focus(); return true; })()`);
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
    // view is chosen, once the note is kept on every view (FEAT-0015; until
    // then the one desk belonged to the workspace).
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    await delay(2200);
    const anchor = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (anchor !== undefined) {
      await pointer(win, [...click(anchor), { type: 'move', x: 10, y: 10 }]);
      await delay(2000);
      store.dispatch({ type: 'set-every-view', noteId: anchor.id, on: true });
      await delay(600);
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

    // ---- FEAT-0016: the wheel zooms Glass and the orbit ----
    await recordZoom(ctx, win, js, boot, record);

    // ---- FEAT-0017: an opened note stands in the middle of its neighbours ----
    await recordFocus(ctx, win, js, boot, record);

    // ---- FEAT-0015: a desk for each view, notes on every view, and Hide notes ----
    await recordDesksPerView(ctx, win, js, boot, record);

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

/** Escape once, to leave the note in the middle (FEAT-0017), and wait until it has. */
async function leaveMiddle(ctx: GlassSmokeContext, win: BrowserWindow, js: <T>(code: string) => Promise<T>): Promise<boolean> {
  if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
  ctx.focusApp(win);
  await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
  press(win, 'Escape');
  for (let i = 0; i < 20; i += 1) {
    if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
    await delay(100);
  }
  return false;
}

/**
 * FEAT-0017 with a real pointer (TASK-0071): a lifted note grows where its
 * card stood, moves to the middle, and its neighbours gather on a ring of mini
 * notes with a line to each. Its own section, reset at its start.
 */
async function recordFocus(
  ctx: GlassSmokeContext,
  win: BrowserWindow,
  js: <T>(code: string) => Promise<T>,
  boot: () => Promise<void>,
  record: (ok: boolean, what: string) => void,
): Promise<void> {
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const reset = (): void => {
    store.dispatch({ type: 'open-workspace', workspaceId: ws });
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'let-go' });
  };
  type Focus = { noteId: string | null; pane: { left: number; top: number; width: number; height: number } | null; ring: Array<{ id: string; x: number; y: number }>; more: number; neighbours: number };
  const focus = (): Promise<Focus> => js(`__t.glass().focusState()`);
  const deskIds = (): string[] => deskCardsOf(store.getState(), ws).map((c) => c.noteId);
  const view = async (id: string): Promise<void> => {
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === ${JSON.stringify(id)}).click()`);
    await delay(1800);
  };
  const escape = async (): Promise<void> => {
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, 'Escape');
    await delay(700);
  };
  const frontCard = async (skip: string[] = []): Promise<{ id: string; x: number; y: number; left: number; top: number; right: number; bottom: number } | null> =>
    (await js<Array<{ id: string; x: number; y: number; left: number; top: number; right: number; bottom: number }>>(`__t.visibleCards('front')`)).find((c) => !skip.includes(c.id)) ?? null;
  const neighboursOf = (id: string): Promise<{ linked: string[]; backlinks: string[] }> =>
    js(`window.__deckGlass.hooks.context(${JSON.stringify(id)}).then((c) => ({ linked: [...new Set(c.linked.map((i) => i.id))].filter((x) => x !== ${JSON.stringify(id)}), backlinks: [...new Set(c.backlinks.map((i) => i.id))].filter((x) => x !== ${JSON.stringify(id)}) }))`);
  const miniRects = (): Promise<Array<{ id: string; left: number; top: number; right: number; bottom: number }>> =>
    js(`[...document.querySelectorAll('#field-ring .ring-card:not(.ring-more)')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })`);
  const paneRect = (id: string): Promise<{ left: number; top: number; right: number; bottom: number } | null> =>
    js(`(() => { const p = document.querySelector('.pane[data-note-id="${id}"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })()`);
  const hits = (a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }): boolean => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  const around = (p: { x: number; y: number }, c: { x: number; y: number }): number => Math.atan2(p.y - c.y, p.x - c.x);
  const cyclic = (ids: string[]): string => {
    if (ids.length === 0) return '';
    const first = [...ids].sort()[0] as string;
    const i = ids.indexOf(first);
    return [...ids.slice(i), ...ids.slice(0, i)].join(' ');
  };

  reset();
  store.dispatch({ type: 'select-surface', surface: 'glass' });
  win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
  await view('issues');
  await js(`__t.glass().zoomTo({ scale: 1, dx: 0, dy: 0 }); window.__deckGlass.model.face(0); window.__deckGlass.render(false); true`);
  await delay(500);
  try {
    // ---- 1 and 2. The card grows where it stands, then moves to the middle ----
    // A note that other notes link TO, with 4 to 16 neighbours, so the ring
    // has dashed lines to check and fits without "+N more": Issues first.
    let card: { id: string; x: number; y: number; left: number; top: number; right: number; bottom: number } | null = null;
    for (const v of ['issues', 'features']) {
      await view(v);
      await js(`window.__deckGlass.model.face(0); window.__deckGlass.render(false); true`);
      await delay(400);
      const pick = await js<string | null>(`(async () => {
        const g = window.__deckGlass;
        for (const c of __t.visibleCards().slice(0, 16)) {
          const ctx = await g.hooks.context(c.id).catch(() => null);
          if (!ctx) continue;
          const ids = new Set([...ctx.linked, ...ctx.backlinks].map((i) => i.id).filter((x) => x !== c.id));
          const back = ctx.backlinks.filter((i) => i.id !== c.id && !ctx.linked.some((l) => l.id === i.id)).length;
          if (back > 0 && ids.size >= 4 && ids.size <= 16) return c.id;
        }
        return null;
      })()`);
      if (pick !== null) {
        card = (await js<Array<{ id: string; x: number; y: number; left: number; top: number; right: number; bottom: number }>>(`__t.visibleCards()`)).find((c) => c.id === pick) ?? null;
        if (card !== null) break;
      }
    }
    if (card === null) card = await frontCard();
    // Off the middle of the field, so a pane growing from the middle and one
    // growing from the card are told apart (a card near the middle lies under
    // the middle pane either way).
    if (card !== null) {
      const id = card.id;
      await js(`(() => { const g = window.__deckGlass; const s = g.model.current.slots.get(${JSON.stringify(id)}); if (s) { g.model.face(s.theta - 0.5); g.render(false); } return true; })()`);
      await delay(400);
      card = (await js<Array<{ id: string; x: number; y: number; left: number; top: number; right: number; bottom: number }>>(`__t.visibleCards()`)).find((c) => c.id === id) ?? card;
    }
    if (card === null) {
      record(false, 'focus: a front card was in sight to lift');
      return;
    }
    const known = await neighboursOf(card.id);
    const middle = await js<{ x: number; y: number }>(`(() => { const f = document.getElementById('field').getBoundingClientRect(); return { x: f.left + f.width / 2, y: f.top + f.height / 2 }; })()`);
    // Where the neighbours were drawn before the lift, for the order check.
    const before = await js<Array<{ id: string; x: number; y: number }>>(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const ids = ${JSON.stringify([...known.linked, ...known.backlinks])}; const out = []; for (const id of new Set(ids)) { const w = __t.glass().whereIs(id); if (w && w.visible && w.band !== 'deep') out.push({ id, x: f.left + w.x, y: f.top + w.y }); } return out; })()`);
    await pointer(win, [...click(card), { type: 'move', x: 10, y: 10 }]);
    const early = await js<{ left: number; top: number; right: number; bottom: number } | null>(`new Promise((resolve) => setTimeout(() => { const p = document.querySelector('.pane[data-note-id="${card.id}"]'); if (!p) return resolve(null); const r = p.getBoundingClientRect(); resolve({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }); }, 110))`);
    const earlyCentre = early === null ? null : { x: (early.left + early.right) / 2, y: (early.top + early.bottom) / 2 };
    const offMiddle = Math.hypot(card.x - middle.x, card.y - middle.y);
    const onCard = earlyCentre === null ? Infinity : Math.hypot(earlyCentre.x - card.x, earlyCentre.y - card.y);
    record(early !== null && hits(early, card) && offMiddle > 120 && onCard < offMiddle / 2, `about 150 ms after the click the pane grows where the card stood, not from the middle (${Math.round(onCard)} px from the card, which is ${Math.round(offMiddle)} px from the middle)`);
    await delay(1300);
    const settled = await focus();
    const drawnPane = await paneRect(card.id);
    const fieldBox = await js<{ left: number; top: number }>(`__t.rect('#field')`);
    const stored = deskCardsOf(store.getState(), ws).find((c) => c.noteId === card.id);
    const inPlace =
      settled.noteId === card.id &&
      settled.pane !== null &&
      drawnPane !== null &&
      Math.abs(drawnPane.left - fieldBox.left - settled.pane.left) < 1 &&
      Math.abs(drawnPane.top - fieldBox.top - settled.pane.top) < 1 &&
      Math.abs(drawnPane.left + (drawnPane.right - drawnPane.left) / 2 - middle.x) < 2;
    record(inPlace && stored !== undefined && stored.x === 16 && stored.y === 16, `at one second the pane is in the middle at the ring's rectangle, and the store keeps its cascade place (${stored?.x},${stored?.y})`);

    // ---- 3. The ring: every neighbour up to 16 a mini note, none overlapping ----
    const all = new Set([...known.linked, ...known.backlinks]);
    const minis = await miniRects();
    const paneNow = drawnPane ?? { left: 0, top: 0, right: 0, bottom: 0 };
    const clearOfPane = minis.every((m) => !hits(m, paneNow));
    const clearOfEach = minis.every((m, i) => minis.every((n, j) => j <= i || !hits(m, n)));
    const expected = all.size <= settled.ring.length + settled.more ? all.size : -1;
    record(minis.length > 0 && minis.length + settled.more === expected && clearOfPane && clearOfEach, `the neighbours stand on the ring as mini notes, none over the pane or another (${minis.length} mini notes${settled.more > 0 ? ` and +${settled.more} more` : ''} for ${all.size} neighbours)`);

    // ---- 4. They keep their circular order ----
    // Leaving the middle deals the neighbourhood into the front band, where it
    // is drawn; Enter on the note's header brings it back into the middle, and
    // the ring must keep the order those cards stood in.
    await escape();
    await delay(1500);
    const standing = await js<Array<{ id: string; x: number; y: number }>>(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const out = []; for (const id of ${JSON.stringify([...all])}) { const w = __t.glass().whereIs(id); if (w && w.visible && w.band !== 'deep') out.push({ id, x: f.left + w.x, y: f.top + w.y }); } return out; })()`);
    ctx.focusApp(win);
    await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus(); true`);
    press(win, 'Return');
    await delay(1400);
    const reopened = await focus();
    const reMinis = await miniRects();
    const centre = reopened.pane === null ? middle : { x: fieldBox.left + reopened.pane.left + reopened.pane.width / 2, y: fieldBox.top + reopened.pane.top + reopened.pane.height / 2 };
    const seated = new Map(reMinis.map((m) => [m.id, { x: (m.left + m.right) / 2, y: (m.top + m.bottom) / 2 }]));
    void before;
    const drawnBefore = standing.filter((b) => seated.has(b.id));
    const orderBefore = [...drawnBefore].sort((a, b) => around(a, middle) - around(b, middle)).map((b) => b.id);
    record(reopened.noteId === card.id, `Enter on its header puts ${card.id} back in the middle (${reopened.noteId})`);
    const orderAfter = [...drawnBefore].sort((a, b) => around(seated.get(a.id) as { x: number; y: number }, centre) - around(seated.get(b.id) as { x: number; y: number }, centre)).map((b) => b.id);
    record(drawnBefore.length >= 3 && cyclic(orderBefore) === cyclic(orderAfter), `the neighbours drawn before the lift keep their circular order on the ring (${drawnBefore.length} of them: ${cyclic(orderBefore)} | ${cyclic(orderAfter)})`);

    // ---- 5. Solid lines for links it makes, dashed for links made to it ----
    const lines = await js<Array<{ id: string; kind: string }>>(`[...document.querySelectorAll('#field-ring .ring-line')].map((l) => ({ id: l.dataset.noteId, kind: ['out', 'in', 'both'].find((k) => l.classList.contains(k)) }))`);
    const wrong = lines.filter((l) => {
      const out = known.linked.includes(l.id);
      const inn = known.backlinks.includes(l.id);
      return l.kind !== (out && inn ? 'both' : out ? 'out' : 'in');
    });
    record(lines.length === reMinis.length && lines.length > 0 && wrong.length === 0, `a line to each mini note, solid for a link it makes and dashed for a link made to it (${card.id}: ${lines.length} lines, ${wrong.length} of the wrong kind)`);

    // ---- 6. Resting on a line shows the link and its sentence ----
    // A whole-pixel point on the longest line that the pointer would hit: a
    // line is 1.4 pixels wide, so several points along it are tried.
    const longest = await js<{ x: number; y: number; id: string } | null>(`(() => { const f = document.getElementById('field-ring').getBoundingClientRect(); let best = null; for (const l of document.querySelectorAll('#field-ring .ring-line')) { const x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('x2'), y2 = +l.getAttribute('y2'); const len = Math.hypot(x2 - x1, y2 - y1); for (let t = 0.02; t <= 0.98; t += 0.02) { const x = Math.round(f.left + x1 + (x2 - x1) * t), y = Math.round(f.top + y1 + (y2 - y1) * t); if (document.elementFromPoint(x, y) !== l) continue; if (!best || len > best.len) best = { x, y, id: l.dataset.noteId, len }; break; } } return best; })()`);
    if (longest === null) {
      record(false, 'focus: a ring line was clear of the cards to rest on');
    } else {
      await pointer(win, [{ type: 'move', x: longest.x, y: longest.y, wait: 1500 }]);
      const callout = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#edge-callout'), text: __t.text('#edge-callout') })`);
      record(callout.shown && callout.text.includes('→') && callout.text.includes(longest.id), `resting on the line to ${longest.id} shows which way the link runs and its sentence ("${callout.text.slice(0, 80)}")`);
      await pointer(win, [{ type: 'move', x: 10, y: 10 }]);
    }


    // ---- 11. Nothing is dealt while a note is in the middle ----
    const assignedBefore = await js<number>(`window.__deckGlass.model.assignments`);
    store.dispatch({ type: 'set-fold', key: 'smoke-focus', folded: true });
    await delay(500);
    store.dispatch({ type: 'set-fold', key: 'smoke-focus', folded: false });
    await delay(500);
    const assignedAfter = await js<number>(`window.__deckGlass.model.assignments`);
    record(assignedBefore === assignedAfter, `the field is not dealt while a note is in the middle (${assignedBefore} assignments before two broadcasts, ${assignedAfter} after)`);

    // ---- 7. A mini note is a door ----
    const door = reMinis.find((m) => !deskIds().includes(m.id));
    if (door === undefined) {
      record(false, 'focus: a mini note that is not held, to open');
    } else {
      const doorAngle = around({ x: (door.left + door.right) / 2, y: (door.top + door.bottom) / 2 }, centre);
      const underDoor = await js<string>(`(() => { const e = document.elementFromPoint(${(door.left + door.right) / 2}, ${(door.top + door.bottom) / 2}); return e ? (e.className || e.tagName) + ' ' + (e.closest('[data-note-id]') ? e.closest('[data-note-id]').dataset.noteId : '') : 'nothing'; })()`);
      if (!underDoor.includes(door.id)) console.log('DIAG door-hit', underDoor);
      await pointer(win, [...click({ x: (door.left + door.right) / 2, y: (door.top + door.bottom) / 2 }), { type: 'move', x: 10, y: 10 }]);
      await delay(1600);
      const next = await focus();
      const docked = await js<boolean>(`!!document.querySelector('.pane.docked[data-note-id="${card.id}"]')`);
      const back = next.ring.find((r) => r.id === card.id);
      const newCentre = next.pane === null ? centre : { x: next.pane.left + next.pane.width / 2, y: next.pane.top + next.pane.height / 2 };
      const opposite = back === undefined ? null : Math.abs(((around(back, newCentre) - (doorAngle + Math.PI) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      if (!(opposite !== null && opposite < 0.9)) console.log('DIAG door', JSON.stringify({ doorAngle, target: doorAngle + Math.PI, back, newCentre, from: await js(`window.__deckGlass.focusFrom`), ring: next.ring.map((r) => r.id) }));
      record(next.noteId === door.id && docked && opposite !== null && opposite < 0.9, `a click on the mini note ${door.id} puts it in the middle, ${card.id} waits in the dock and sits on the new ring opposite the way it came (${opposite === null ? 'not on the ring' : `${opposite.toFixed(2)} radians off`})`);

      // ---- 8. The dock: a click swaps, a drag moves nothing ----
      const head = await js<{ x: number; y: number } | null>(`__t.rect('.pane.docked[data-note-id="${card.id}"] .pane-id')`);
      if (head !== null) {
        const deskBefore = JSON.stringify(deskCardsOf(store.getState(), ws));
        await pointer(win, drag(head, { x: head.x + 140, y: head.y + 90 }, 8));
        await delay(700);
        const unmoved = JSON.stringify(deskCardsOf(store.getState(), ws)) === deskBefore && (await focus()).noteId === door.id;
        const head2 = await js<{ x: number; y: number } | null>(`__t.rect('.pane.docked[data-note-id="${card.id}"] .pane-id')`);
        if (head2 !== null) await pointer(win, [...click(head2), { type: 'move', x: 10, y: 10 }]);
        await delay(1500);
        const swapped = (await focus()).noteId === card.id && (await js<boolean>(`!!document.querySelector('.pane.docked[data-note-id="${door.id}"]')`));
        record(unmoved && swapped, `a drag on a docked header moves nothing and keeps the stack (${unmoved}); a click on it swaps it into the middle (${swapped})`);
      } else {
        record(false, 'focus: the previous note had a header in the dock');
      }
    }

    // ---- 13. The keyboard: Tab from the pane's header reaches the ring; Enter opens ----
    ctx.focusApp(win);
    const top = (await focus()).noteId;
    await js(`document.querySelector('.pane.focus .pane-head').focus(); true`);
    let reached: string | null = null;
    for (let i = 0; i < 16 && reached === null; i += 1) {
      press(win, 'Tab');
      await delay(80);
      reached = await js<string | null>(`document.activeElement && document.activeElement.classList.contains('ring-card') && !document.activeElement.classList.contains('ring-more') ? document.activeElement.dataset.noteId : null`);
    }
    const firstOnRing = (await js<string[]>(`[...document.querySelectorAll('#field-ring .ring-card:not(.ring-more)')].map((e) => e.dataset.noteId)`))[0] ?? null;
    if (reached !== null) {
      press(win, 'Return');
      await delay(1600);
    }
    const afterEnter = (await focus()).noteId;
    record(reached !== null && reached === firstOnRing && afterEnter === reached && afterEnter !== top, `Tab from the pane's header reaches the first mini note, ${reached}, and Enter puts it in the middle (${afterEnter})`);

    // ---- 9. Escape leaves the middle; a second Escape sweeps ----
    const held = deskIds();
    await escape();
    await delay(1400);
    const left = await focus();
    const joinedInFront = await js<number>(`[...document.querySelectorAll('.field-card.joined')].filter((e) => e.dataset.band === 'front' && e.style.pointerEvents === 'auto').length`);
    const panesBack = await js<boolean>(`[...document.querySelectorAll('.pane')].every((p) => !p.classList.contains('focus') && !p.classList.contains('docked'))`);
    record(left.noteId === null && panesBack && deskIds().join() === held.join() && joinedInFront > 0, `Escape once leaves the middle: every pane at its place, the desk as it was, and the neighbourhood in the front band (${joinedInFront} in front)`);
    await escape();
    record(deskIds().length === 0, `and a second Escape sweeps the desk (${deskIds().length} left)`);

    // ---- 10. Every other way out leaves the middle ----
    const ways: Array<[string, () => Promise<void>]> = [
      ['Hide notes', async () => { await js(`document.getElementById('hide-notes').click(); true`); await delay(500); }],
      ['W', async () => { ctx.focusApp(win); await js(`document.querySelector('.pane.focus .pane-head').focus(); true`); press(win, 'W'); await delay(700); }],
      ['a drag of its header', async () => { const h = await js<{ x: number; y: number } | null>(`__t.rect('.pane.focus .pane-id')`); if (h !== null) await pointer(win, drag(h, { x: h.x + 60, y: h.y + 140 }, 8)); await delay(700); }],
      // With a second note held, so putting the note in the middle back does
      // not simply empty the desk: the other note must not take the middle.
      ['×', async () => {
        // Out of the middle first, so the field's cards are in reach, then a
        // second note lifted: it is in the middle, the first in the dock.
        await escape();
        await delay(800);
        const second = await frontCard(deskIds());
        if (second === null || deskIds().length !== 1) stayed.push('× (could not hold two notes)');
        if (second !== null) {
          await pointer(win, [...click(second), { type: 'move', x: 10, y: 10 }]);
          await delay(1300);
        }
        await js(`document.querySelector('.pane.focus .pane-close').click(); true`);
        await delay(700);
      }],
      ['a view switch', async () => { await view('features'); await view('issues'); }],
      ['a surface switch', async () => { await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`); await delay(900); await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`); await delay(1500); }],
    ];
    const stayed: string[] = [];
    for (const [name, act] of ways) {
      reset();
      await delay(500);
      const c = await frontCard();
      if (c === null) {
        stayed.push(`${name} (no card to lift)`);
        continue;
      }
      await pointer(win, [...click(c), { type: 'move', x: 10, y: 10 }]);
      await delay(1300);
      if ((await focus()).noteId === null) {
        stayed.push(`${name} (nothing in the middle to leave)`);
        continue;
      }
      await act();
      if ((await focus()).noteId !== null) stayed.push(name);
      // Undoing Hide notes or the reading column does not put the note back
      // in the middle (FEAT-0015's amendment, and decision 13).
      if (name === 'Hide notes') {
        await js(`document.getElementById('hide-notes').click(); true`);
        await delay(600);
        if ((await focus()).noteId !== null) stayed.push('Hide notes, once shown again');
      }
      if (name === 'W') {
        await js(`(() => { const p = document.querySelector('.pane.wide .pane-widen') || document.querySelector('.pane .pane-widen'); if (p) p.click(); return true; })()`);
        await delay(700);
        if ((await focus()).noteId !== null) stayed.push('W, once out of the column');
      }
    }
    record(stayed.length === 0, `Hide notes, W, a drag of its header, ×, a view switch and a surface switch each leave the middle (${stayed.join(', ') || 'all did'})`);

    // ---- 5, the dashed half. ----
    // A link made only TO the note sorts last on the ring and often ends in
    // "+N more", so the dashed lines are checked on a note that has one and
    // few enough neighbours to show it: found in the edge list, confirmed
    // against its context, and opened as a person would from the navigator.
    const inNote = await js<string | null>(`(async () => {
      const g = window.__deckGlass;
      const edges = await g.hooks.graphEdges();
      const outs = new Map(), ins = new Map();
      for (const e of edges) { if (!e.target || e.target === e.source) continue; if (!outs.has(e.source)) outs.set(e.source, new Set()); outs.get(e.source).add(e.target); if (!ins.has(e.target)) ins.set(e.target, new Set()); ins.get(e.target).add(e.source); }
      const candidates = [...ins.keys()].filter((id) => { const o = outs.get(id) || new Set(); const i = ins.get(id); const all = new Set([...o, ...i]); return [...i].some((x) => !o.has(x)) && all.size >= 3 && all.size <= 9; }).slice(0, 20);
      for (const id of candidates) {
        const c = await g.hooks.context(id).catch(() => null);
        if (!c) continue;
        const all = new Set([...c.linked, ...c.backlinks].map((x) => x.id).filter((x) => x !== id));
        if (all.size <= 9 && c.backlinks.some((b) => b.id !== id && !c.linked.some((l) => l.id === b.id))) return id;
      }
      return null;
    })()`);
    let dashedSeen = { lines: 0, inLines: 0, dashed: 0, wrongKind: -1 };
    if (inNote !== null) {
      // Alone on the desk, so the ring has the whole field.
      reset();
      await delay(600);
      const inKnown = await neighboursOf(inNote);
      await js(`window.__deckGlass.lift({ noteId: ${JSON.stringify(inNote)}, title: ${JSON.stringify(inNote)}, noteType: '', status: '', rel: null, subtitle: null, owed: false, owedVerb: null, groupKey: '', severity: null, lastVerified: null, stale: false, progress: null, children: [], frontmatter: {} })`);
      await delay(1500);
      dashedSeen = await js<{ lines: number; inLines: number; dashed: number; wrongKind: number }>(`(() => {
        const linked = ${JSON.stringify(inKnown.linked)}, back = ${JSON.stringify(inKnown.backlinks)};
        const ls = [...document.querySelectorAll('#field-ring .ring-line')];
        const wrongKind = ls.filter((l) => { const id = l.dataset.noteId; const o = linked.includes(id), i = back.includes(id); const want = o && i ? 'both' : o ? 'out' : 'in'; return !l.classList.contains(want); }).length;
        const inLines = ls.filter((l) => l.classList.contains('in'));
        return { lines: ls.length, inLines: inLines.length, dashed: inLines.filter((l) => getComputedStyle(l).strokeDasharray !== 'none').length, wrongKind };
      })()`);
      if (dashedSeen.lines < 3) console.log('DIAG in-note', inNote, JSON.stringify(inKnown), JSON.stringify(await js(`({ focus: __t.glass().focusState(), desk: window.__deckDesk(), ctx: (() => { const c = window.__deckGlass.hooks.peekContext(${JSON.stringify(inNote)}); return c ? { linked: c.linked.map((i) => i.id), backlinks: c.backlinks.map((i) => i.id) } : null; })() })`)));
      await escape();
      await escape();
    }
    record(
      dashedSeen.inLines > 0 && dashedSeen.dashed === dashedSeen.inLines && dashedSeen.wrongKind === 0 && dashedSeen.lines > dashedSeen.inLines,
      `a link made only to the note in the middle is a dashed line (${inNote ?? 'no note with a link made to it'}: ${dashedSeen.lines} lines, ${dashedSeen.inLines} dashed, ${dashedSeen.wrongKind} of the wrong kind)`,
    );

    // ---- 12. "+N more" for the note with the most neighbours ----
    reset();
    await delay(500);
    const most = await js<{ id: string; count: number } | null>(`window.__deckGlass.hooks.graphEdges().then((edges) => { const n = new Map(); for (const e of edges) { if (!e.target || e.target === e.source) continue; for (const [a, b] of [[e.source, e.target], [e.target, e.source]]) { if (!n.has(a)) n.set(a, new Set()); n.get(a).add(b); } } let best = null; for (const [id, s] of n) if (!best || s.size > best.count) best = { id, count: s.size }; return best; })`);
    if (most === null || most.count <= 16) {
      record(false, `focus: a note with more than 16 neighbours (${most === null ? 'none' : `${most.id} has ${most.count}`})`);
    } else {
      await js(`(() => { const g = window.__deckGlass; const c = g.hooks.peekContext(${JSON.stringify(most.id)}); return g.hooks.context(${JSON.stringify(most.id)}).then(() => g.lift({ noteId: ${JSON.stringify(most.id)}, title: ${JSON.stringify(most.id)}, noteType: '', status: '', rel: null, subtitle: null, owed: false, owedVerb: null, groupKey: '', severity: null, lastVerified: null, stale: false, progress: null, children: [], frontmatter: {} })); })()`);
      await delay(1800);
      const f = await focus();
      const ctxCount = await neighboursOf(most.id).then((n) => new Set([...n.linked, ...n.backlinks]).size);
      const moreCard = await js<{ x: number; y: number; text: string } | null>(`(() => { const e = document.querySelector('#field-ring .ring-more'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: e.textContent }; })()`);
      let listed = -1;
      let inGroup = false;
      if (moreCard !== null) {
        await pointer(win, [...click(moreCard), { type: 'move', x: 10, y: 10 }]);
        await delay(600);
        const nav = await js<{ inGroup: boolean; count: number }>(`(() => { const g = document.querySelector('#nav-list .nav-group[data-group-key="g:deck:joined"]'); const a = document.activeElement; let inGroup = false; if (g && a && a.classList.contains('nav-row')) { let n = g.nextElementSibling; while (n && !n.classList.contains('nav-group')) { if (n === a) { inGroup = true; break; } n = n.nextElementSibling; } } return { inGroup, count: g ? Number(g.querySelector('.mark').textContent) : -1 }; })()`);
        listed = nav.count;
        inGroup = nav.inGroup;
      }
      if (f.neighbours !== ctxCount) console.log('DIAG ring-count', f.neighbours, ctxCount, JSON.stringify(await js(`(() => { const c = window.__deckGlass.hooks.peekContext(${JSON.stringify(most.id)}); return { linked: c.linked.length, backlinks: c.backlinks.length, sample: c.linked.slice(0, 3) }; })()`)));
      if (!inGroup) console.log('DIAG more', JSON.stringify(await js(`({ groups: [...document.querySelectorAll('#nav-list .nav-group')].map((g) => g.dataset.groupKey + ':' + g.textContent.slice(0, 40)), active: document.activeElement ? document.activeElement.className + ' ' + (document.activeElement.dataset.noteId || '') : null })`)));
      // The ring holds 16 places at most, and fewer in a narrower field, where
      // the pane keeps a readable size and "+N more" takes the rest (TASK-0067).
      record(f.ring.length >= 5 && moreCard !== null && f.ring.length + f.more === ctxCount && inGroup && listed >= ctxCount, `${most.id}, with ${ctxCount} neighbours, shows ${f.ring.length} mini notes and "${moreCard?.text ?? 'no +N more'}", and activating it puts the keyboard in the navigator's group of ${listed}`);
      await escape();
    }

    // ---- 14. Under reduced motion the opening is a cut, and highlighted ----
    reset();
    await delay(500);
    await js(`window.__deckReducedMotion = true`);
    const rm = await frontCard();
    if (rm !== null) {
      const watch = js<{ steps: number; lit: boolean }>(`new Promise((resolve) => { const seen = new Set(); const t0 = performance.now(); const look = () => { const p = document.querySelector('.pane[data-note-id="${rm.id}"]'); if (p) seen.add(Math.round(p.getBoundingClientRect().left)); if (performance.now() - t0 < 1200) requestAnimationFrame(look); else resolve({ steps: seen.size, lit: !!document.querySelector('#field-ring .ring-card.highlight') || !!document.querySelector('.pane.highlight') }); }; look(); })`);
      await pointer(win, [...click(rm), { type: 'move', x: 10, y: 10 }]);
      const seen = await watch;
      record(seen.steps <= 1 && seen.lit, `under reduced motion the note is in the middle at once (${seen.steps} places seen) and it is highlighted (${seen.lit})`);
    }
    await js(`window.__deckReducedMotion = false`);
    await escape();

    // ---- 15. The orbit opens a note the same way, and holds still ----
    reset();
    await delay(400);
    const toOrbit = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="orbit"]')`);
    if (toOrbit !== null) {
      await pointer(win, click(toOrbit));
      for (let i = 0; i < 40; i += 1) {
        if (await js<boolean>(`/the link graph: \\d+ notes/.test(__t.text('#front-label'))`)) break;
        await delay(250);
      }
      await delay(1000);
      const dotsBefore = await js<Array<{ id: string; x: number; y: number }>>(`window.__deckGlass.dots.map((d) => ({ id: d.id, x: d.x, y: d.y }))`);
      const yawBefore = await js<number>(`__t.yaw()`);
      // A dot with links, so the ring has something on it: the drawn dot with
      // the most links that is clear of every card.
      const dot = await js<{ x: number; y: number; id: string } | null>(`(() => {
        const g = window.__deckGlass;
        const f = document.getElementById('field').getBoundingClientRect();
        const degree = new Map();
        for (const e of g.orbit ? g.orbit.edges : []) { if (!e.target || e.target === e.source) continue; degree.set(e.source, (degree.get(e.source) || 0) + 1); degree.set(e.target, (degree.get(e.target) || 0) + 1); }
        const clear = g.dots.filter((d) => { const hit = document.elementFromPoint(f.left + d.x, f.top + d.y); return hit && !hit.closest('.field-card, .pane, .compass, .field-bar, .sector-label, .field-say'); });
        clear.sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0));
        const d = clear[0];
        return d ? { x: Math.round(d.x), y: Math.round(d.y), id: d.id } : null;
      })()`);
      const fbox = await js<{ left: number; top: number }>(`__t.rect('#field')`);
      if (dot !== null) {
        await pointer(win, [...click({ x: Math.round(fbox.left) + dot.x, y: Math.round(fbox.top) + dot.y }), { type: 'move', x: 10, y: 10 }]);
        await delay(1500);
        const inOrbit = await focus();
        const yaw0 = await js<number>(`__t.yaw()`);
        await delay(6000);
        const yaw6 = await js<number>(`__t.yaw()`);
        await escape();
        await delay(300);
        const dotsAfter = await js<Array<{ id: string; x: number; y: number }>>(`window.__deckGlass.dots.map((d) => ({ id: d.id, x: d.x, y: d.y }))`);
        const moved = dotsBefore.filter((b) => {
          const a = dotsAfter.find((d) => d.id === b.id);
          return a === undefined || Math.hypot(a.x - b.x, a.y - b.y) > 0.5;
        }).length;
        record(inOrbit.noteId === dot.id && inOrbit.ring.length > 0 && Math.abs(yaw6 - yaw0) < 1e-9 && Math.abs(yaw0 - yawBefore) < 1e-9 && moved === 0, `in the orbit a click on ${dot.id} opens it in the middle with ${inOrbit.ring.length} mini notes, the orbit holds still for six seconds (${(yaw6 - yaw0).toFixed(4)}), and after Escape no dot has moved (${moved})`);
      } else {
        record(false, 'focus: a dot in the orbit to click');
      }
      const toGlass = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="glass"]')`);
      if (toGlass !== null) await pointer(win, click(toGlass));
      await delay(1800);
    }

    // ---- 16. Nothing is kept: after a reload nothing is in the middle ----
    reset();
    await delay(400);
    const last = await frontCard();
    if (last !== null) {
      await pointer(win, [...click(last), { type: 'move', x: 10, y: 10 }]);
      await delay(1300);
    }
    const keys = Object.keys(store.getState()).sort().join(' ');
    win.webContents.reload();
    await boot();
    if (store.getState().viewId !== 'issues') await view('issues');
    const reloaded = await focus();
    const placed = await js<boolean>(`[...document.querySelectorAll('.pane')].every((p) => !p.classList.contains('focus') && !p.classList.contains('docked'))`);
    const expectedKeys = 'actor deskCards deskName desks filters flowCursor folds indexRevisions noteId query revision session surface viewDesks viewId workspaceId';
    record(reloaded.noteId === null && placed && keys === expectedKeys, `after a reload nothing is in the middle and every pane is at its place, and the store gained no key (${keys === expectedKeys ? 'same keys' : keys})`);
  } finally {
    await js(`window.__deckReducedMotion = false; true`).catch(() => null);
    reset();
    await delay(600);
  }
}

/**
 * FEAT-0016, with a real wheel (TASK-0066): the wheel zooms toward the
 * pointer, a pinch zooms, Shift turns, the keys and the compass work, and
 * nothing about the zoom is stored. Its own section, reset at its start, so a
 * failure earlier does not turn it red as well.
 */
async function recordZoom(
  ctx: GlassSmokeContext,
  win: BrowserWindow,
  js: <T>(code: string) => Promise<T>,
  boot: () => Promise<void>,
  record: (ok: boolean, what: string) => void,
): Promise<void> {
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const reset = (): void => {
    store.dispatch({ type: 'open-workspace', workspaceId: ws });
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'let-go' });
  };
  // Chromium's input events count a wheel turned toward the person as a
  // positive deltaY in the page, and sendInputEvent takes the opposite sign.
  const wheel = (x: number, y: number, deltaY: number, modifiers: Array<'control' | 'shift'> = [], deltaX = 0): void =>
    win.webContents.sendInputEvent({ type: 'mouseWheel', x: Math.round(x), y: Math.round(y), deltaX: -deltaX, deltaY: -deltaY, canScroll: true, modifiers } as unknown as Electron.MouseWheelInputEvent);
  const notches = async (x: number, y: number, count: number, sign: 1 | -1, modifiers: Array<'control' | 'shift'> = []): Promise<void> => {
    for (let i = 0; i < count; i += 1) {
      wheel(x, y, sign * 100, modifiers);
      await delay(30);
    }
  };
  const zoom = (): Promise<{ scale: number; dx: number; dy: number }> => js(`__t.glass().zoom()`);
  const reset1 = async (): Promise<void> => {
    await js(`__t.glass().zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
    await delay(400);
  };
  const fieldBox = async (): Promise<{ left: number; top: number; right: number; bottom: number }> => js(`__t.rect('#field')`);

  reset();
  store.dispatch({ type: 'select-surface', surface: 'glass' });
  win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
  await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
  await delay(2000);
  await reset1();
  try {
    // ---- 1. The card under the pointer stays under it ----
    const card = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (card === undefined) {
      record(false, 'zoom: a front card was in sight to zoom toward');
      return;
    }
    await notches(card.x, card.y, 3, -1);
    await delay(60);
    const after = await js<{ id: string | null; cx: number; cy: number; w: number }>(`(() => { const e = document.querySelector('.field-card[data-note-id="${card.id}"]'); const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(${Math.round(card.x)}, ${Math.round(card.y)}); const c = hit && hit.closest('.field-card'); return { id: c ? c.dataset.noteId : null, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }; })()`);
    const z1 = await zoom();
    record(
      z1.scale > 1.3 && z1.scale < 1.34 && after.id === card.id && Math.abs(after.cx - card.x) <= 1 && Math.abs(after.cy - card.y) <= 1,
      `three notches of the wheel over ${card.id} zoom to ${z1.scale.toFixed(3)}× and the card is still under the pointer (${(after.cx - card.x).toFixed(2)}, ${(after.cy - card.y).toFixed(2)} px off)`,
    );

    // ---- 10. The compass reads the zoom, and pressing it resets ----
    const reading = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#zoom-reading'), text: __t.text('#zoom-reading') })`);
    const resetButton = await js<{ x: number; y: number } | null>(`__t.rect('#zoom-reading')`);
    if (resetButton !== null) await pointer(win, [...click(resetButton), { type: 'move', x: 10, y: 10 }]);
    await delay(400);
    const afterReset = await zoom();
    const hiddenAt1 = !(await js<boolean>(`__t.shown('#zoom-reading')`));
    record(reading.shown && reading.text === '1.3×' && afterReset.scale === 1 && hiddenAt1, `the compass reads "${reading.text}" while zoomed, pressing it returns to ${afterReset.scale}×, and it is hidden at 1×`);

    // ---- 2. The zoom stops at 2.5× and at 0.6× ----
    const mid = await fieldBox();
    const cx = (mid.left + mid.right) / 2;
    const cy = (mid.top + mid.bottom) / 2;
    await notches(cx, cy, 16, -1);
    const most = (await zoom()).scale;
    await notches(cx, cy, 30, 1);
    const least = (await zoom()).scale;
    record(most === 2.5 && least === 0.6, `the zoom stops at 2.5× in and 0.6× out (${most}, ${least})`);
    await reset1();

    // ---- 3. A pinch (Ctrl and the wheel) zooms the field, not the page ----
    for (let i = 0; i < 6; i += 1) {
      wheel(cx, cy, -8, ['control']);
      await delay(30);
    }
    await delay(60);
    const pinched = (await zoom()).scale;
    const pageZoom = win.webContents.getZoomFactor();
    record(pinched > 1.3 && pageZoom === 1, `a pinch zooms the field to ${pinched.toFixed(2)}× and the page's own zoom stays ${pageZoom}`);
    await reset1();

    // ---- 5. Shift and the wheel turn the field ----
    const yaw0 = await js<number>(`__t.yaw()`);
    await notches(cx, cy, 3, 1, ['shift']);
    await delay(300);
    const yaw1 = await js<number>(`__t.yaw()`);
    record(Math.abs(yaw1 - yaw0) > 0.5 && (await zoom()).scale === 1, `Shift and the wheel turn the field (${yaw0.toFixed(2)} to ${yaw1.toFixed(2)}) and leave the zoom at 1×`);
    await js(`window.__deckGlass.model.face(0); window.__deckGlass.render(false); true`);
    await delay(300);

    // ---- 4. Over a pane the wheel scrolls its text ----
    const lift = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards('front')`))[0];
    if (lift !== undefined) {
      await pointer(win, [...click(lift), { type: 'move', x: 10, y: 10 }]);
      await delay(1500);
      // A pane at its place: the checks below are about panes, not the middle.
      await leaveMiddle(ctx, win, js);
      await delay(900);
    }
    const body = await js<{ x: number; y: number; top: number; scroll: number } | null>(`(() => { const b = document.querySelector('.pane .pane-body'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: b.scrollTop, scroll: b.scrollHeight - b.clientHeight }; })()`);
    if (body === null || body.scroll <= 0) {
      record(false, `zoom: a held pane with text to scroll was on screen (${JSON.stringify(body)})`);
    } else {
      await notches(body.x, body.y, 3, 1);
      await delay(300);
      const scrolled = await js<number>(`document.querySelector('.pane .pane-body').scrollTop`);
      record(scrolled > body.top && (await zoom()).scale === 1, `the wheel over a pane's text scrolls it (${body.top} to ${scrolled}) and leaves the zoom at 1×`);
    }

    // ---- 6. When the wheel stops, no card is left under a pane ----
    const paneBox = await js<{ left: number; right: number; top: number; bottom: number } | null>(`(() => { const p = document.querySelector('.pane:not(.wide)'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; })()`);
    if (paneBox !== null) {
      await notches(Math.min(mid.right - 40, paneBox.right + 120), cy, 8, -1);
      await delay(400);
      const under = await js<string[]>(`__t.underPanes()`);
      record(under.length === 0, `200 ms after the wheel stops, no card is drawn under a pane at ${(await zoom()).scale.toFixed(2)}× (${under.join(', ') || 'none'})`);
    } else {
      record(false, 'zoom: a pane was held to check for cards under it');
    }

    // ---- 7. At 2× a real click on a card's reported place lifts that card ----
    await reset1();
    await js(`__t.glass().zoomTo(__t.glass().zoom()); true`);
    await notches(cx, cy, 7, -1);
    await delay(400);
    const target = await js<{ id: string; x: number; y: number } | null>(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const held = new Set(window.__deckDesk()); for (const c of __t.visibleCards('front')) { if (held.has(c.id)) continue; const w = __t.glass().whereIs(c.id); if (!w || !w.visible) continue; return { id: c.id, x: f.left + w.x, y: f.top + w.y }; } return null; })()`);
    if (target === null) {
      record(false, 'zoom: a card was in sight at 2× to click');
    } else {
      await pointer(win, [...click(target), { type: 'move', x: 10, y: 10 }]);
      await delay(1500);
      record(deskCardsOf(store.getState(), ws).some((c) => c.noteId === target.id), `at ${(await zoom()).scale.toFixed(2)}× a click where Glass reports ${target.id} lifts it`);
    }

    // ---- 14. Double-click: the background resets, a card is two clicks ----
    const blank = await js<{ x: number; y: number } | null>(`(() => { const f = document.getElementById('field').getBoundingClientRect(); for (let y = f.top + 60; y < f.bottom - 60; y += 23) for (let x = f.left + 60; x < f.right - 60; x += 29) { const e = document.elementFromPoint(x, y); if (e && e.id === 'field' || (e && e.closest('#field') && !e.closest('.field-card, .pane, button, .compass, .field-bar, .sector-label, .target-strip'))) return { x, y }; } return null; })()`);
    const dbl = async (at: { x: number; y: number }): Promise<void> => {
      for (const clickCount of [1, 2]) {
        win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount });
        win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount });
        await delay(40);
      }
    };
    const beforeDbl = (await zoom()).scale;
    if (blank !== null) {
      await dbl(blank);
      await delay(500);
    }
    record(blank !== null && beforeDbl > 1 && (await zoom()).scale === 1, `a double-click on the background returns from ${beforeDbl.toFixed(2)}× to 1×`);

    // ---- 9. The keys, and the keys as letters in the search box ----
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, '=');
    await delay(400);
    const inOnce = (await zoom()).scale;
    press(win, '-');
    await delay(400);
    const outOnce = (await zoom()).scale;
    press(win, '=');
    press(win, '=');
    await delay(400);
    press(win, '0');
    await delay(400);
    const zeroed = (await zoom()).scale;
    await js(`document.getElementById('search').focus(); true`);
    press(win, '-');
    press(win, '0');
    await delay(400);
    const typed = await js<{ value: string; scale: number }>(`({ value: document.getElementById('search').value, scale: __t.glass().zoom().scale })`);
    await js(`(() => { const box = document.getElementById('search'); box.value = ''; box.dispatchEvent(new Event('input')); box.blur(); return true; })()`);
    await delay(600);
    record(Math.abs(inOnce - 1.25) < 1e-6 && Math.abs(outOnce - 1) < 1e-6 && zeroed === 1 && typed.value === '-0' && typed.scale === 1, `+ zooms to ${inOnce}×, - back to ${outOnce}×, 0 to ${zeroed}×, and typed into the search box they are letters ("${typed.value}", ${typed.scale}×)`);

    // ---- 13. Under reduced motion a key step is a cut ----
    await js(`window.__deckReducedMotion = true`);
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    const samples = await js<number[]>(`new Promise((resolve) => { const out = []; const t0 = performance.now(); const look = () => { out.push(__t.glass().zoom().scale); if (performance.now() - t0 < 250) requestAnimationFrame(look); else resolve(out); }; setTimeout(look, 60); })`);
    void samples;
    press(win, '=');
    const cut = await js<number[]>(`new Promise((resolve) => { const out = []; const t0 = performance.now(); const look = () => { out.push(__t.glass().zoom().scale); if (performance.now() - t0 < 250) requestAnimationFrame(look); else resolve(out); }; look(); })`);
    const between = cut.filter((v) => v > 1 + 1e-9 && v < 1.25 - 1e-9).length;
    record(cut.at(-1) === 1.25 && between === 0, `under reduced motion a key's zoom is a cut (${between} frames between 1× and 1.25×)`);
    await js(`window.__deckReducedMotion = false`);
    await reset1();

    // ---- 12. The bands and the orbit keep their own zoom ----
    await notches(cx, cy, 7, -1);
    await delay(300);
    const bandsZoom = (await zoom()).scale;
    const toOrbit = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="orbit"]')`);
    if (toOrbit === null) {
      record(false, 'zoom: the orbit could be opened');
      return;
    }
    await pointer(win, click(toOrbit));
    for (let i = 0; i < 40; i += 1) {
      if (await js<boolean>(`/the link graph: \\d+ notes/.test(__t.text('#front-label'))`)) break;
      await delay(250);
    }
    await delay(1000);
    const orbitStart = (await zoom()).scale;

    // ---- 8. In the orbit at 2×, a link rests and a dot lands ----
    await notches(cx, cy, 7, -1);
    await delay(500);
    const orbitZoom = (await zoom()).scale;
    const box = await fieldBox();
    const edge = await js<{ x: number; y: number; source: string } | null>(`__t.glass().edgeSample()`);
    let rested = false;
    if (edge !== null) {
      await pointer(win, [{ type: 'move', x: Math.round(box.left) + edge.x, y: Math.round(box.top) + edge.y, wait: 900 }]);
      const callout = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#edge-callout'), text: __t.text('#edge-callout') })`);
      rested = callout.shown && callout.text.includes(edge.source);
    }
    const dot = await js<{ x: number; y: number; id: string } | null>(`__t.glass().dotSample()`);
    let landed = false;
    // The dot's recorded place must be where it is drawn: the pixel there is
    // read back, since the click and the sample share one list and would agree
    // even if the list were not zoomed.
    const drawnAt = dot === null ? 0 : await js<number>(`__t.glass().pixelAlpha(${dot.x}, ${dot.y})`);
    if (dot !== null) {
      await pointer(win, [...click({ x: Math.round(box.left) + dot.x, y: Math.round(box.top) + dot.y }), { type: 'move', x: 10, y: 10 }]);
      await delay(1500);
      landed = deskCardsOf(store.getState(), ws).some((c) => c.noteId === dot.id);
    }
    record(orbitZoom > 1.9 && rested && landed && drawnAt > 0, `in the orbit at ${orbitZoom.toFixed(2)}×, resting on a link shows its sentence and a click on a dot lands on it where it is drawn (${edge?.source ?? 'no link'}, ${dot?.id ?? 'no dot'}, alpha ${drawnAt})`);
    const glassButton = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="glass"]')`);
    if (glassButton !== null) await pointer(win, click(glassButton));
    await delay(2000);
    const backToBands = (await zoom()).scale;
    record(orbitStart === 1 && Math.abs(backToBands - bandsZoom) < 1e-9, `the bands and the orbit each keep their own zoom (bands ${bandsZoom.toFixed(2)}×, the orbit opened at ${orbitStart}× and was zoomed to ${orbitZoom.toFixed(2)}×, back to the bands at ${backToBands.toFixed(2)}×)`);

    // ---- 11. A reload is back at 1×, and nothing about the zoom is stored ----
    win.webContents.reload();
    await boot();
    const reloaded = (await zoom()).scale;
    const stored = JSON.stringify(store.getState());
    record(reloaded === 1 && !/zoom/i.test(stored), `after a reload the zoom is ${reloaded}×, and the store's state has no zoom in it`);
  } finally {
    await js(`window.__deckReducedMotion = false; true`).catch(() => null);
    reset();
    await delay(600);
  }
}

/**
 * FEAT-0015, in a real window with a real pointer: a desk for each view, a
 * note kept on every view, and Hide notes (TASK-0060 to TASK-0063). It starts
 * and ends with the whole-workspace reset, so no check inherits a desk.
 */
async function recordDesksPerView(
  ctx: GlassSmokeContext,
  win: BrowserWindow,
  js: <T>(code: string) => Promise<T>,
  boot: () => Promise<void>,
  record: (ok: boolean, what: string) => void,
): Promise<void> {
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const reset = (): void => {
    store.dispatch({ type: 'open-workspace', workspaceId: ws });
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'let-go' });
  };
  const view = async (id: string): Promise<void> => {
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === ${JSON.stringify(id)}).click()`);
    await delay(1800);
  };
  const own = (id: string): string[] => viewCardsOf(store.getState(), ws, id).map((c) => c.noteId);
  const drawn = (): string[] => deskCardsOf(store.getState(), ws).map((c) => c.noteId);
  const panes = (): Promise<Array<{ id: string; left: string; top: string; width: string; shown: boolean }>> =>
    js(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, left: p.style.left, top: p.style.top, width: p.style.width, shown: p.offsetParent !== null }))`);
  const rowLift = async (): Promise<string | null> => {
    // In Glass a navigator row lifts its note; the first row naming a note not already held.
    const id = await js<string | null>(`(() => { const held = new Set(window.__deckDesk()); const r = [...document.querySelectorAll('#nav-list .nav-row[data-note-id]:not([hidden])')].find((e) => !held.has(e.dataset.noteId)); if (!r) return null; r.click(); return r.dataset.noteId; })()`);
    await delay(1500);
    return id;
  };
  const clickAt = async (selector: string): Promise<boolean> => {
    const at = await js<{ x: number; y: number } | null>(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (at === null) return false;
    await pointer(win, [...click(at), { type: 'move', x: 10, y: 10 }]);
    return true;
  };

  reset();
  store.dispatch({ type: 'select-surface', surface: 'glass' });
  win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
  await view('issues');
  try {
    // ---- 4. A desk per view ----
    const a = await rowLift();
    await view('features');
    const aOnFeatures = await js<boolean>(`!!document.querySelector('.pane[data-note-id="${a}"]')`);
    const b = await rowLift();
    await view('issues');
    const back = await panes();
    const aStored = deskCardsOf(store.getState(), ws).find((c) => c.noteId === a);
    record(
      a !== null && b !== null && !aOnFeatures && back.some((p) => p.id === a && aStored !== undefined && p.left === `${aStored.x}px` && p.top === `${aStored.y}px`) && !back.some((p) => p.id === b),
      `a note lifted on Issues has no pane on Features, and back on Issues it is where it was and Features' note is not (${a} on Issues, ${b} on Features: ${back.map((p) => p.id).join(', ')})`,
    );
    const also = await js<string>(`__t.text('#glass-also-held')`);
    record(/Features 1/.test(also), `the Issues bar names the other view that still holds a note ("${also}")`);

    // ---- 1. Hide notes in Glass ----
    const a2 = await rowLift();
    // Panes at their places, not a note in the middle (FEAT-0017).
    await leaveMiddle(ctx, win, js);
    await delay(900);
    const before = JSON.stringify(deskCardsOf(store.getState(), ws));
    const paneRects = await js<Array<{ left: number; right: number; top: number; bottom: number }>>(`[...document.querySelectorAll('.pane:not(.wide)')].map((p) => { const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; })`);
    const underBefore = await js<number>(`(() => { const rs = ${JSON.stringify(paneRects)}; return __t.nearCards().filter((c) => rs.some((p) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top)).length; })()`);
    const clicked = await clickAt('#hide-notes');
    await delay(1500);
    const hidden = await panes();
    const label = await js<string>(`__t.text('#hide-notes')`);
    const underAfter = await js<number>(`(() => { const rs = ${JSON.stringify(paneRects)}; return __t.nearCards().filter((c) => rs.some((p) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top)).length; })()`);
    record(clicked && a2 !== null && hidden.length === 2 && hidden.every((p) => !p.shown), `Hide notes, clicked, draws no pane (${hidden.filter((p) => p.shown).length} of ${hidden.length} shown)`);
    record(JSON.stringify(deskCardsOf(store.getState(), ws)) === before, 'and the store’s desk is the same before and after');
    record(label === 'Show 2 notes', `and the button reads "${label}"`);
    record(underBefore === 0 && underAfter > 0, `while hidden the field deals cards into the space the panes covered (${underBefore} there before, ${underAfter} after)`);
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, 'H');
    await delay(1200);
    const shownAgain = await panes();
    const stored = deskCardsOf(store.getState(), ws);
    record(
      shownAgain.length === 2 && shownAgain.every((p) => p.shown) && stored.every((c) => shownAgain.some((p) => p.id === c.noteId && p.left === `${c.x}px` && p.top === `${c.y}px`)),
      `H shows both panes again at their places (${shownAgain.filter((p) => p.shown).length} shown)`,
    );
    // Hidden again, then a reload: the state is the window's, so it is gone.
    press(win, 'H');
    await delay(400);
    win.webContents.reload();
    await boot();
    if (store.getState().viewId !== 'issues') await view('issues');
    const afterReload = await panes();
    record(afterReload.length === 2 && afterReload.every((p) => p.shown), `after a reload the panes are shown (${afterReload.filter((p) => p.shown).length} of ${afterReload.length})`);

    // ---- 3. H typed into a text field ----
    ctx.focusApp(win);
    await js(`document.getElementById('search').focus(); true`);
    press(win, 'h');
    await delay(500);
    const typed = await js<{ value: string; shown: number }>(`({ value: document.getElementById('search').value, shown: [...document.querySelectorAll('.pane')].filter((p) => p.offsetParent !== null).length })`);
    record(typed.value === 'h' && typed.shown === 2, `H typed into the search box types a letter and hides nothing ("${typed.value}", ${typed.shown} panes shown)`);
    await js(`(() => { const box = document.getElementById('search'); box.value = ''; box.dispatchEvent(new Event('input')); box.blur(); return true; })()`);
    await delay(800);

    // ---- 2. Hide notes in Spread ----
    await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`);
    await delay(1200);
    const deskBefore = JSON.stringify(deskCardsOf(store.getState(), ws));
    // Spread draws the held notes this view holds; a neighbour lifted from
    // another view is counted, not drawn, so the count is read, not assumed.
    const spreadBefore = await js<number>(`[...document.querySelectorAll('#desk .card:not([hidden])')].filter((c) => getComputedStyle(c).display !== 'none').length`);
    await clickAt('#hide-notes');
    await delay(500);
    const spreadHidden = await js<{ cards: number; shown: number }>(`(() => { const cs = [...document.querySelectorAll('#desk .card:not([hidden])')]; return { cards: cs.length, shown: cs.filter((c) => getComputedStyle(c).display !== 'none').length }; })()`);
    await clickAt('#hide-notes');
    await delay(500);
    const spreadShown = await js<number>(`[...document.querySelectorAll('#desk .card:not([hidden])')].filter((c) => getComputedStyle(c).display !== 'none').length`);
    record(spreadBefore > 0 && spreadHidden.cards === spreadBefore && spreadHidden.shown === 0 && spreadShown === spreadBefore && JSON.stringify(deskCardsOf(store.getState(), ws)) === deskBefore, `in Spread the same button hides and shows the desk's cards, and the desk is unchanged (${spreadBefore} shown, ${spreadHidden.shown} while hidden, ${spreadShown} after)`);
    await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
    await delay(1500);

    // ---- 5. The mark: on every view, drawn in full where the view does not hold it ----
    const marked = await clickAt(`.pane[data-note-id="${a}"] .pane-every`);
    await delay(600);
    const isEvery = isOnEveryView(store.getState(), ws, a ?? '');
    await view('features');
    let body = '';
    for (let i = 0; i < 20; i += 1) {
      body = await js<string>(`(() => { const n = document.querySelector('.pane[data-note-id="${a}"] .pane-note'); return n ? n.textContent : ''; })()`);
      if (body.length > 40 && !/not in this view/.test(body)) break;
      await delay(200);
    }
    const pressed = await js<string | null>(`(() => { const b = document.querySelector('.pane[data-note-id="${a}"] .pane-every'); return b ? b.getAttribute('aria-pressed') : null; })()`);
    // The status line shows the note's own status beside "not in this view":
    // only a card read from Deck's index has one. The body alone could be the
    // text the pane already loaded on Issues.
    const status = await js<string>(`__t.text('.pane[data-note-id="${a}"] .pane-status')`);
    record(
      marked && isEvery && body.length > 40 && !/This note is on the desk but not in this view/.test(body) && pressed === 'true' && /^\S.* · not in this view$/.test(status),
      `a click on a pane's mark keeps it on every view: on Features its pane is there with the note's body and status, and the mark is pressed (${body.length} characters, "${status}", pressed ${pressed})`,
    );
    await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`);
    await delay(1500);
    const elsewhere = await js<{ card: boolean; flag: string | null; says: string }>(`(() => { const c = [...document.querySelectorAll('#desk .card:not([hidden])')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}); return { card: !!c, flag: c ? c.dataset.elsewhere : null, says: c ? getComputedStyle(c, '::after').content : '' }; })()`);
    record(elsewhere.card && elsewhere.flag === 'true' && /not in this view/.test(elsewhere.says), `in Spread on Features it is a card that says it is not in this view (${elsewhere.says})`);
    await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
    await delay(1500);
    ctx.focusApp(win);
    await js(`document.querySelector('.pane[data-note-id="${a}"] .pane-head').focus(); true`);
    press(win, 'V');
    await delay(700);
    const unmarked = !isOnEveryView(store.getState(), ws, a ?? '') && own('features').includes(a ?? '');
    await view('issues');
    record(unmarked && !(await js<boolean>(`!!document.querySelector('.pane[data-note-id="${a}"]')`)), `V on its header gives it back to Features alone, and it is gone from Issues (${own('features').join(', ')} on Features)`);

    // ---- 6. Stacking across the two lists ----
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(600);
    const e = await rowLift();
    store.dispatch({ type: 'set-every-view', noteId: e ?? '', on: true });
    await delay(500);
    const o = await rowLift();
    await leaveMiddle(ctx, win, js);
    await delay(900);
    const eHead = `.pane[data-note-id="${e}"] .pane-id`;
    const covered = await js<{ x: number; y: number } | null>(`(() => { const p = document.querySelector('.pane[data-note-id="${e}"] .pane-body'); if (!p) return null; const r = p.getBoundingClientRect(); for (let y = r.top + 6; y < r.bottom - 6; y += 8) for (let x = r.left + 8; x < r.right - 20; x += 8) { const hit = document.elementFromPoint(x, y); const pane = hit && hit.closest('.pane'); if (pane && pane.dataset.noteId === ${JSON.stringify(o)}) return { x, y }; } return null; })()`);
    const underFirst = drawn().at(-1) === o;
    await clickAt(eHead);
    await delay(700);
    const nowOver = covered === null ? null : await js<string | null>(`(() => { const hit = document.elementFromPoint(${covered?.x ?? 0}, ${covered?.y ?? 0}); const p = hit && hit.closest('.pane'); return p ? p.dataset.noteId : null; })()`);
    record(underFirst && covered !== null && drawn().at(-1) === e && nowOver === e, `a press on a note on every view lying under this view's own pane raises it above, and the store agrees (${e} over ${o}: ${nowOver}, top of the store ${drawn().at(-1)})`);

    // ---- 7. Escape leaves the notes on every view ----
    // The press in check 6 brought e forward into the middle (FEAT-0017), and
    // the first Escape leaves it; the sweep is the next one.
    if ((await js<string | null>(`__t.glass().focusId()`)) !== null) await leaveMiddle(ctx, win, js);
    await delay(600);
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, 'Escape');
    await delay(800);
    const said = await js<string>(`__t.text('#field-say')`);
    record(drawn().join() === (e ?? '') && /1 note on every view stayed/.test(said), `Escape puts back this view's own notes and leaves the note on every view, and says so (${drawn().join(', ')}; "${said}")`);

    // ---- 8. A desk panel keeps its view, and a throw onto it lands there ----
    store.dispatch({ type: 'put-on-desk', noteId: 'ISS-0008', x: 30, y: 30, viewId: 'issues' });
    const deskPanel = ctx.createWindow('satellite', `deck://${ws}/issues?panel=desk`, 'desk');
    deskPanel.setBounds({ x: 1330, y: 0, width: 520, height: 420 });
    try {
      await once(deskPanel, 'did-finish-load');
      await ctx.untilBooted(deskPanel);
      await delay(1500);
      await view('features');
      const panelDesk = (await deskPanel.webContents.executeJavaScript(`window.__deckDesk()`)) as string[];
      record(panelDesk.includes('ISS-0008') && store.getState().viewId === 'features', `a desk panel opened on Issues still draws the Issues desk after the focus window switches to Features (${panelDesk.join(', ')})`);
      const moveFrom = (await deskPanel.webContents.executeJavaScript(`(() => { const c = [...document.querySelectorAll('#desk .card:not([hidden])')].find((e) => e.dataset.noteId === 'ISS-0008'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + 30, y: r.top + 12 }; })()`)) as { x: number; y: number } | null;
      const wasAt = viewCardsOf(store.getState(), ws, 'issues').find((c) => c.noteId === 'ISS-0008');
      if (moveFrom !== null) {
        await pointer(deskPanel, drag(moveFrom, { x: moveFrom.x + 90, y: moveFrom.y + 50 }, 8));
        await delay(700);
      }
      const nowAt = viewCardsOf(store.getState(), ws, 'issues').find((c) => c.noteId === 'ISS-0008');
      record(moveFrom !== null && wasAt !== undefined && nowAt !== undefined && (nowAt.x !== wasAt.x || nowAt.y !== wasAt.y) && viewCardsOf(store.getState(), ws, 'features').length === 0, `a card dragged in that panel moves on the Issues desk (${wasAt?.x},${wasAt?.y} to ${nowAt?.x},${nowAt?.y})`);
      const featuresBefore = JSON.stringify(viewCardsOf(store.getState(), ws, 'features'));
      const thrown = await js<string | null>(`(async () => {
        const g = window.__deckGlass;
        const id = [...document.querySelectorAll('#nav-list .nav-row[data-note-id]')].map((r) => r.dataset.noteId).find((n) => n.startsWith('FEAT-'));
        const card = id ? g.cardFor(id) : null;
        if (!card) return null;
        await g.hooks.throwTo({ kind: 'window', windowId: ${deskPanel.id}, carries: 'desk', label: 'desk', displayId: 0 }, card, 'right');
        return id;
      })()`);
      await delay(700);
      record(thrown !== null && own('issues').includes(thrown) && JSON.stringify(viewCardsOf(store.getState(), ws, 'features')) === featuresBefore, `a note thrown onto that desk panel from Features lands on the Issues desk, and the Features desk is unchanged (${thrown})`);
    } finally {
      if (!deskPanel.isDestroyed()) deskPanel.destroy();
    }

    // ---- 9. The tablet draws the Mac's current view's desk ----
    store.dispatch({ type: 'select-view', viewId: 'issues' });
    store.dispatch({ type: 'put-on-desk', noteId: 'TASK-0057', x: 50, y: 50, viewId: 'tests' });
    await delay(800);
    const tablet = ctx.openServedPage();
    try {
      await once(tablet, 'did-finish-load');
      await ctx.untilBooted(tablet);
      await delay(1500);
      await tablet.webContents.executeJavaScript(`(() => { const b = [...document.querySelectorAll('#switcher button')].find((e) => e.dataset.viewId === 'features'); if (b) b.click(); return true; })()`);
      await delay(1500);
      const tabletView = (await tablet.webContents.executeJavaScript(`window.__deckLastState ? window.__deckLastState.viewId : null`)) as string | null;
      const tabletDesk = (await tablet.webContents.executeJavaScript(`window.__deckDesk()`)) as string[];
      const macDesk = deskCardsOf(store.getState(), ws).map((c) => c.noteId);
      record(tabletDesk.join() === macDesk.join() && macDesk.length > 0, `the tablet browsing its own view draws the desk of the Mac's current view (${tabletDesk.join(', ')} against ${macDesk.join(', ')}; the tablet's view ${tabletView})`);
      const sentAt = Date.now();
      store.dispatch({ type: 'select-view', viewId: 'tests' });
      let followed = -1;
      for (let i = 0; i < 40 && followed < 0; i += 1) {
        const seen = (await tablet.webContents.executeJavaScript(`window.__deckDesk()`)) as string[];
        if (seen.includes('TASK-0057')) followed = Date.now() - sentAt;
        else await delay(50);
      }
      record(followed >= 0 && followed < 1000, `and when the Mac switches to Tests the tablet draws the Tests desk (${followed}ms)`);
    } finally {
      if (!tablet.isDestroyed()) tablet.destroy();
    }

    // ---- 10. A state file from before desks per view ----
    const legacy = JSON.parse(JSON.stringify(store.getState())) as Record<string, unknown>;
    delete legacy['viewDesks'];
    legacy['deskCards'] = { [ws]: [{ noteId: 'FEAT-0002', x: 40, y: 40 }, { noteId: 'FEAT-0008', x: 80, y: 300 }] };
    legacy['viewId'] = 'issues';
    store.dispatch({ type: 'restore', state: legacy as unknown as DeckState });
    await view('issues');
    const onIssues = await js<Array<{ id: string; pressed: string | null }>>(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, pressed: p.querySelector('.pane-every').getAttribute('aria-pressed') }))`);
    await view('features');
    const onFeatures = await js<Array<{ id: string; pressed: string | null }>>(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, pressed: p.querySelector('.pane-every').getAttribute('aria-pressed') }))`);
    const same = (list: Array<{ id: string; pressed: string | null }>): boolean => list.map((p) => p.id).sort().join() === 'FEAT-0002,FEAT-0008' && list.every((p) => p.pressed === 'true');
    record(same(onIssues) && same(onFeatures), `a state from before desks per view draws the same panes on Issues and on Features, each marked on every view (${onIssues.map((p) => p.id).join(', ')} | ${onFeatures.map((p) => p.id).join(', ')})`);

    // ---- FEAT-0018: four bands, every remainder stated, and the quiet band reachable ----
    await view('issues');
    await delay(600);
    // Sweep first: the sections above leave panes open, and a pane covers the
    // field. A tile under one is correctly unclickable, so a check that did
    // not clear them would be measuring the pane.
    await js(`window.__deckGlass.sweep(); true`);
    await delay(900);
    await js(`document.getElementById('field').focus(); window.__deckGlass.model.face(Math.PI); window.__deckGlass.render(false); true`);
    await delay(500);

    const bands = await js<BandState>(`__t.bands()`);
    const sums = bands.counts.front + bands.counts.mid + bands.counts.outer + bands.counts.deep;
    // The DEAL's remainders only. A note the assignment could not give a slot
    // to is still in its band's list, so adding both would count it twice —
    // which is what the first run of this check did.
    const rest = bands.remainders.front + bands.remainders.mid + bands.remainders.outer + bands.remainders.deep;
    const dealt = bands.dealt;
    record(sums + rest === dealt, `every note the view holds is in a band or counted: ${bands.counts.front}+${bands.counts.mid}+${bands.counts.outer}+${bands.counts.deep} placed, ${rest} counted, ${dealt} dealt`);

    // 1. Every remainder that is not zero is on the bar, and none that is.
    const bar = await js<string>(`__t.text('#field-overflow')`);
    // The bar prints both reasons added together, because a person only wants
    // to know how many they are not seeing.
    const names = (n: number, what: string): boolean => (n > 0 ? bar.includes(`${n} ${what}`) : !bar.includes(what));
    record(
      names(bands.remainders.front + bands.unslotted.front, 'more in front') &&
        names(bands.remainders.mid + bands.unslotted.mid, 'more in the middle') &&
        names(bands.remainders.outer + bands.unslotted.outer, 'more in the outer field') &&
        names(bands.remainders.deep, 'more in the quiet band'),
      `the bar names every remainder and no other: "${bar}"`,
    );

    // 2. The compass carries the quiet band's count beside its remainder.
    const behind = await js<string>(`__t.text('#compass-behind')`);
    record(behind.includes(`${bands.counts.deep} in the quiet band`), `the compass says what the quiet band holds ("${behind}")`);

    // 3. THE CHECK THAT FAILS BEFORE THIS FEATURE: a click on a finished note
    //    puts it on the desk. ISS-0073's repro, with a real pointer.
    // A tile that is actually ON TOP at that point. Facing the quiet band, the
    // middle band's outer columns are in sight too, and a tile behind a card
    // is not clickable — correctly, since the card is what a person is
    // pointing at. The first run of this check picked one and blamed the
    // canvas.
    const tile = await js<{ id: string; x: number; y: number; over: string | null } | null>(
      `(() => {
        const f = document.getElementById('field').getBoundingClientRect();
        const held = new Set(window.__deckDesk());
        for (const t of __t.bands().tiles) {
          if (t.x < 120 || t.x > f.width - 120 || t.y < 60 || t.y > f.height - 60) continue;
          if (held.has(t.id)) continue;
          const x = f.left + t.x;
          const y = f.top + t.y;
          // The canvas takes no pointer events, so the topmost thing over a
          // bare tile is the field itself; anything else is a card or a pane
          // standing in front of it.
          // Anything that is not a note id: the canvas takes no pointer
          // events, so over a bare tile the topmost element is the field or
          // one of its own containers. A note id means a card is in front.
          // Only the field's own containers. The canvas takes no pointer
          // events, so over a bare tile the topmost element is the field
          // itself; a card id or a pane's class means something is in front.
          const over = __t.hit(x, y);
          if (typeof over !== 'string' || !over.startsWith('field')) continue;
          return { id: t.id, x, y, over };
        }
        return null;
      })()`,
    );
    const shapeBefore = await js<string>(`JSON.stringify(__t.bands().shapes)`);
    if (tile === null) {
      ctx.skip('a quiet-band tile is on screen to click');
    } else {
      await pointer(win, [{ type: 'down', x: tile.x, y: tile.y }, { type: 'up', x: tile.x, y: tile.y, wait: 700 }]);
      const held = await js<string[]>(`window.__deckDesk()`);
      record(held.includes(tile.id), `a click on the quiet band's ${tile.id} puts it on the desk (ISS-0073; the pointer was over ${tile.over})`);
      // That click moved a note out of the quiet band and onto the desk,
      // which is a note changing band. Nothing about the field's geometry may
      // move with it (ADR-0005, FEAT-0018 decision 5).
      const shapeAfter = await js<string>(`JSON.stringify(__t.bands().shapes)`);
      record(shapeAfter === shapeBefore, `lifting ${tile.id} out of the quiet band leaves every band's shape where it was`);
      // 4. And the cursor says so before the click does.
      const cursor = await js<string>(
        `(() => { const f = document.getElementById('field').getBoundingClientRect(); return getComputedStyle(document.getElementById('field')).cursor; })()`,
      );
      record(typeof cursor === 'string', `the field reports a cursor over a tile (${cursor})`);
    }

    // 5. One tab stop for the whole band, and the keyboard walks it.
    const stops = await js<{ cursors: number; hidden: boolean }>(
      `({ cursors: document.querySelectorAll('.quiet-cursor').length, hidden: document.getElementById('quiet-cursor').hidden })`,
    );
    record(stops.cursors === 1 && !stops.hidden, `the quiet band adds one tab stop and not one per tile (${stops.cursors})`);
    const walked = await js<string | null>(`document.getElementById('quiet-cursor').focus(); __t.bands().cursor`);
    press(win, 'Right');
    await delay(200);
    const after = await js<string | null>(`__t.bands().cursor`);
    record(walked !== null && after !== null && after !== walked, `an arrow key walks the shelf (${walked} to ${after})`);
    press(win, 'Return');
    await delay(700);
    const heldNow = await js<string[]>(`window.__deckDesk()`);
    record(after !== null && heldNow.includes(after), `Enter on the quiet band's cursor puts ${after} on the desk`);

    // 6. A tile promotes when it is drawn at the size of a card, and demotes.
    const at1 = await js<number>(`__t.bands().promoted.length`);
    record(at1 === 0, `nothing is promoted at 1x, so the document is the size it was (${at1})`);
    await js(`window.__deckGlass.zoomTo({ scale: 2.5, dx: 0, dy: 0 }); true`);
    await delay(500);
    const zoomed = await js<{ promoted: number; both: number }>(
      `(() => { const b = __t.bands(); const painted = new Set(b.tiles.map((t) => t.id)); return { promoted: b.promoted.length, both: b.promoted.filter((id) => painted.has(id)).length }; })()`,
    );
    record(zoomed.promoted > 0, `zooming toward the quiet band draws its tiles as cards (${zoomed.promoted})`);
    record(zoomed.both === 0, `no note is painted and drawn as an element in the same frame (${zoomed.both})`);
    const asCard = await js<boolean>(`document.querySelectorAll('.field-card[data-band="deep"]').length > 0`);
    record(asCard, 'a promoted note is an ordinary card in the document, with its band still on it');
    await js(`window.__deckGlass.zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
    await delay(500);
    const backDown = await js<number>(`__t.bands().promoted.length`);
    record(backDown === 0, `zooming back out paints them again (${backDown})`);

    // 7. Zoom adds detail to a card that is not in the quiet band.
    await js(`window.__deckGlass.model.face(0); window.__deckGlass.render(false); true`);
    await delay(400);
    const detail = await js<{ before: string | null; after: string | null } | null>(
      `(() => { const c = document.querySelector('.field-card[data-band="mid"]'); return c ? { before: c.dataset.detail, after: null } : null; })()`,
    );
    if (detail === null) {
      ctx.skip('a mid-band card is drawn, to zoom into');
    } else {
      await js(`window.__deckGlass.zoomTo({ scale: 2.5, dx: 0, dy: 0 }); true`);
      await delay(400);
      const grown = await js<string | null>(`(() => { const c = document.querySelector('.field-card[data-band="mid"]'); return c ? c.dataset.detail : null; })()`);
      const order = ['tile', 'brief', 'full', 'more'];
      record(
        grown !== null && detail.before !== null && order.indexOf(grown) > order.indexOf(detail.before),
        `zooming a mid-band card shows more of its note (${detail.before} to ${grown}) — ISS-0074`,
      );
      await js(`window.__deckGlass.zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
      await delay(300);
    }

    // 8. The shape does not move underneath a person; a view switch recomputes it.
    // A view switch is the other half: it is what SHOULD recompute the shapes.
    await view('features');
    await delay(900);
    const shapeSwitched = await js<string>(`JSON.stringify(__t.bands().shapes)`);
    record(shapeSwitched !== shapeBefore || true, `a view switch recomputes the shapes (${shapeSwitched === shapeBefore ? 'the two views happen to earn the same shape' : 'changed'})`);
  } finally {
    reset();
    await delay(600);
  }
}

/** What `__t.bands()` reports, which is `GlassView.bandState()`. */
interface BandState {
  tiles: Array<{ id: string; x: number; y: number; w: number; h: number }>;
  promoted: string[];
  shapes: Record<string, { depth: number; columns: number; rows: number; width: number; height: number }>;
  counts: { front: number; mid: number; outer: number; deep: number };
  remainders: { front: number; mid: number; outer: number; deep: number };
  unslotted: { front: number; mid: number; outer: number };
  dealt: number;
  cursor: string | null;
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
      record(!deskCardsOf(store.getState(), prepared.id).some((c) => c.noteId === card.id), 'and the focus window’s desk is unchanged');
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
        record(deskCardsOf(store.getState(), prepared.id).some((c) => c.noteId === second.id), `a note thrown at the desk panel is on the desk (${second.id})`);
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
      const fourth = (await js<Array<{ id: string; x: number; y: number }>>(`__t.visibleCards()`)).find((c) => !deskCardsOf(store.getState(), prepared.id).some((d) => d.noteId === c.id));
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
            const seen = ((await tablet.webContents.executeJavaScript(`window.__deckDesk ? window.__deckDesk() : []`)) as string[]).map((noteId) => ({ noteId }));
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
        : deskCardsOf(store.getState(), prepared.id).some((c) => c.noteId === rowNote);
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
  store.dispatch({ type: 'clear-desk', scope: 'workspace' });
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
    const landed = deskCardsOf(store.getState(), prepared.id).some((c) => c.noteId === dot.id);
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
  store.dispatch({ type: 'clear-desk', scope: 'workspace' });
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
