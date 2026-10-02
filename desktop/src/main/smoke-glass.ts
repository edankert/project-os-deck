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
import { bandShapeFor } from '../shared/slots.js';
import { detailFor, holdsDetail } from '../shared/detail.js';

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
  /** The notes of this workspace whose source still holds an unticked criterion, read from the files. */
  notesWithAnUntickedCriterion(): string[];
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
    // clipped behind the navigator, or standing behind a document, is on the
    // page and cannot be pressed. A card gathered round the focused document
    // says so ('seated'), because it is not standing in its band.
    visibleCards: (band) => { const f = document.getElementById('field').getBoundingClientRect(); return [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto' && (!band || e.dataset.band === band)).map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, band: e.dataset.band, x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top, bottom: r.bottom, owed: e.classList.contains('owed'), seated: e.classList.contains('seated') }; }).filter((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 30 && c.y < f.bottom - 30 && window.__t.hit(c.x, c.y) === c.id); },
    // Every near card drawn in the field, with no hit test: a card behind a
    // document fails the hit test, so visibleCards() cannot see the very
    // cards a check about documents is looking for (ISS-0065).
    nearCards: () => { const f = document.getElementById('field').getBoundingClientRect(); return [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top, bottom: r.bottom, transform: e.style.transform }; }).filter((c) => c.right > f.left && c.left < f.right && c.bottom > f.top && c.top < f.bottom); },
    hit: (x, y) => { const e = document.elementFromPoint(x, y); const card = e && e.closest('.field-card'); return card ? card.dataset.noteId : (e ? e.className || e.tagName : null); },
    text: (sel) => (document.querySelector(sel) || {}).textContent || '',
    shown: (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; },
    yaw: () => window.__deckGlass.model.yaw,
    assignments: () => window.__deckGlass.model.assignments,
    requests: () => window.__deckContexts.requests,
    where: (id) => window.__deckGlass.whereIs(id),
    bands: () => window.__deckGlass.bandState(),
    // The deal as the model holds it: every note's band and slot, as one
    // string. Two readings that are equal are the same deal, whatever ran in
    // between; the field is dealt again on every broadcast, so the COUNT of
    // deals says nothing about whether a card moved (TASK-0104).
    slots: () => [...window.__deckGlass.model.current.slots].map(([id, s]) => id + ':' + s.band + ':' + s.theta.toFixed(4) + ':' + s.depth.toFixed(1) + ':' + s.y.toFixed(1)).sort().join(' '),
    frontIds: () => [...window.__deckGlass.model.current.slots].filter(([, s]) => s.band === 'front').map(([id]) => id).sort(),
    // Where each card that stands in its own slot is drawn. A card gathered
    // round the focused document is left out: it is drawn at its seat.
    cardsAt: () => Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving):not(.seated)')].map((e) => [e.dataset.noteId, e.style.transform])),
    // How many cards the field draws for one note. A held note has none.
    drawn: (id) => [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.dataset.noteId === id).length,
    // Every note the field draws more than one card for: there must be none.
    twice: () => { const n = new Map(); for (const e of document.querySelectorAll('.field-card:not(.leaving)')) n.set(e.dataset.noteId, (n.get(e.dataset.noteId) || 0) + 1); return [...n].filter(([, c]) => c > 1).map(([id]) => id); },
    // The cards gathered round the focused document, as the page draws them.
    seated: () => [...document.querySelectorAll('.field-card.seated:not(.leaving)')].map((e) => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return { id: e.dataset.noteId, x, y, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, inSight: e.style.pointerEvents === 'auto', hit: e.style.pointerEvents === 'auto' && window.__t.hit(x, y) === e.dataset.noteId, lit: e.classList.contains('highlight'), shared: e.classList.contains('shared') }; }),
    // A document as it is drawn. Toward the edge of sight it is dimmed by a
    // veil and never made see-through (FEAT-0020): 'sight' is the 0..1 value
    // Glass gives it, 'veil' is what the stylesheet draws over it, and
    // 'opaque' is whether the element itself is still at full strength.
    pane: (id) => { const p = document.querySelector('.pane[data-note-id="' + id + '"]'); if (!p) return null; const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, focus: p.classList.contains('focus'), docked: p.classList.contains('docked'), outOfSight: p.classList.contains('out-of-sight'), drawn: cs.visibility !== 'hidden', sight: Number(p.dataset.sight), veil: Number(p.style.getPropertyValue('--veil')), opaque: p.style.opacity === '' && cs.opacity === '1', lit: p.classList.contains('highlight'), wide: p.classList.contains('wide'), narrow: p.classList.contains('narrow'), state: p.dataset.state || '', chars: p.querySelector('.pane-note').textContent.length }; },
    // A point of the field with nothing over it but the field: no card, no
    // document, no control, no line, and no painted tile, which a click lifts.
    // The collection stands on the field since FEAT-0020 and is not the
    // field: a press on it is a press on the list, and a wheel scrolls it.
    // 'room' leaves that many pixels of window to its left, for a drag that way.
    blank: (room) => { const f = document.getElementById('field').getBoundingClientRect(); const g = window.__deckGlass; for (let y = f.bottom - 24; y > f.top + 40; y -= 17) for (let x = Math.max(f.left + 24, (room || 0) + 8); x < f.right - 24; x += 23) { const e = document.elementFromPoint(x, y); if (!e || !e.closest('#field')) continue; if (e.closest('.field-card, .pane, .collection, .narrow-bar, button, .compass, .field-bar, .sector-label, .target-strip, .link-line, .field-say')) continue; if (g.tileAt && g.tileAt(x - f.left, y - f.top) !== null) continue; return { x, y }; } return null; },
    // The collection as it is drawn: where it stands in the field, what its
    // header says, and whether the list is inside it.
    collection: () => { const c = document.getElementById('collection'); const f = document.getElementById('field'); const r = c.getBoundingClientRect(); const fb = f.getBoundingClientRect(); const cs = getComputedStyle(c); const list = document.getElementById('nav-list'); return { inField: f.contains(c), listInside: c.contains(list) && c.contains(document.getElementById('search')), shown: !c.hidden && cs.display !== 'none' && cs.visibility !== 'hidden', x: r.left - fb.left, y: r.top - fb.top, w: r.width, h: r.height, left: r.left, top: r.top, right: r.right, bottom: r.bottom, name: __t.text('#collection-name'), count: __t.text('#collection-count'), filter: __t.shown('#collection-filter') ? __t.text('#collection-filter') : '', note: __t.shown('#collection-note') ? __t.text('#collection-note') : '', places: __t.text('#collection-places'), collapsed: c.classList.contains('collapsed'), narrow: c.classList.contains('narrow'), outOfSight: c.classList.contains('out-of-sight'), veil: Number(c.style.getPropertyValue('--veil')), opaque: c.style.opacity === '' && cs.opacity === '1', z: Number(c.style.zIndex), listShown: list.offsetParent !== null, expanded: document.getElementById('collection-fold').getAttribute('aria-expanded') }; },
    // A row of the list that a pointer can press: in view, and first under the
    // pointer at the point given, so not behind a heading stuck to the top of
    // the list. Not a note that is already a document, and none of 'skip'.
    rows: (skip) => { const held = new Set([...(window.__deckDesk ? window.__deckDesk() : []), ...[...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId), ...(skip || [])]); const out = []; for (const r of document.querySelectorAll('#nav-list .nav-row')) { if (r.hidden || held.has(r.dataset.noteId)) continue; const b = r.getBoundingClientRect(); if (b.height === 0) continue; const x = b.left + Math.min(140, b.width / 2); const y = b.top + b.height / 2; const hit = document.elementFromPoint(x, y); if (hit && hit.closest('.nav-row') === r) out.push({ id: r.dataset.noteId, x, y, top: b.top, bottom: b.bottom, index: Number(r.dataset.index) }); } return out; },
    // What the keyboard is on: the kind of thing, and the note it is for.
    active: () => { const a = document.activeElement; if (!a) return { on: 'nothing', id: null }; const pane = a.closest('.pane'); const on = a.classList.contains('nav-row') ? 'row' : a.classList.contains('pane-head') ? 'header' : a.id === 'collection-head' ? 'collection' : a.id === 'search' ? 'search' : pane ? 'in-document:' + a.className : (a.id || a.className || a.tagName); return { on, id: a.dataset.noteId || (pane ? pane.dataset.noteId : null), top: a.getBoundingClientRect().top }; },
    // A point of a document's header that moves it: on the header, and not on one of its buttons.
    head: (id) => { const p = document.querySelector('.pane[data-note-id="' + id + '"]'); if (!p) return null; const h = p.querySelector('.pane-head').getBoundingClientRect(); for (const dx of [24, 12, 40, 64]) { const x = h.left + dx, y = h.top + h.height / 2; const e = document.elementFromPoint(x, y); if (e && e.closest('.pane') === p && e.closest('.pane-head') && !e.closest('button')) return { x, y }; } return null; },
  };
  true;
`;

/**
 * The page's own copy of the Issues view's navigation payload, with some open
 * issues marked owed.
 *
 * The front band holds what is owed a decision, and a workspace that owes
 * nothing has an empty one: true, checked on the real data first, and no use
 * to the checks that press a front card or push an owed one. So the answer the
 * sidecar gives THIS PAGE is changed on its way in, the way the "change
 * arriving under the field" check already does it. Nothing is written to the
 * workspace, no other window sees it, and the patch says exactly what the
 * sidecar says for an owed note: a "Needs you" group ahead of the others,
 * holding each owed note with its verb, and the note still under its own
 * heading. It stays for the page's life, so every later read of the view
 * agrees with the first; a reload loses it, and `boot` puts it back.
 */
function owedPatch(ids: string[]): string {
  return `(() => {
    if (window.__deckSmokeOwed) return true;
    const ids = ${JSON.stringify(ids)};
    window.__deckSmokeOwed = ids;
    const real = window.fetch;
    window.fetch = async (input, init) => {
      const response = await real(input, init);
      if (!String(input).includes('cockpit/nav?mode=issues')) return response;
      const payload = await response.clone().json();
      const owed = [];
      const walk = (items) => { for (const item of items) { if (ids.includes(item.id) && !owed.some((o) => o.id === item.id)) owed.push({ ...item, owed: true, owed_verb: 'Triage' }); walk(item.children || []); } };
      for (const group of payload.groups || []) walk(group.items || []);
      payload.groups = [{ key: 'needs-you', label: 'Needs you', url: null, status: null, item_layout: 'stacked', needs_human: true, items: owed }, ...(payload.groups || [])];
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    return true;
  })()`;
}

/** How many open issues are marked owed when the workspace owes none. Fewer than the open issues there are, so the middle band keeps some. */
const OWED_TO_INJECT = 4;

/**
 * The Glass section's parts, in the order they run. `DECK_SMOKE_GLASS_ONLY`
 * names the ones to run, separated by commas; `base` is the first five. A run
 * that leaves any out says which in its verdict, as a skip.
 */
const SECTIONS = ['lift', 'hands', 'panes', 'keys', 'switch', 'collection', 'document', 'served', 'arrange', 'throw', 'orbit', 'zoom', 'focus', 'desks', 'address'] as const;
type Section = (typeof SECTIONS)[number];
const BASE: readonly Section[] = ['lift', 'hands', 'panes', 'keys', 'switch'];

export function glassSections(only: string | undefined): { run: Set<Section>; left: Section[]; unknown: string[] } {
  const names = (only ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  if (names.length === 0) return { run: new Set(SECTIONS), left: [], unknown: [] };
  const run = new Set<Section>();
  const unknown: string[] = [];
  for (const name of names) {
    if (name === 'base') for (const s of BASE) run.add(s);
    else if ((SECTIONS as readonly string[]).includes(name)) run.add(name as Section);
    else unknown.push(name);
  }
  return { run, left: SECTIONS.filter((s) => !run.has(s)), unknown };
}

/** Where the pointer is parked between checks: over the title bar, outside the field, so it rests on no card and reaches for none. */
const PARK = { x: 10, y: 10 };

type Js = <T>(code: string) => Promise<T>;
type Box = { left: number; top: number; right: number; bottom: number };
type Seen = { id: string; x: number; y: number; left: number; top: number; right: number; bottom: number; owed: boolean; seated: boolean; band: string };
type Seated = { id: string; x: number; y: number; left: number; top: number; right: number; bottom: number; width: number; height: number; inSight: boolean; hit: boolean; lit: boolean; shared: boolean };
type PaneSeen = { left: number; top: number; right: number; bottom: number; width: number; height: number; focus: boolean; docked: boolean; outOfSight: boolean; drawn: boolean; sight: number; veil: number; opaque: boolean; lit: boolean; wide: boolean; narrow: boolean; state: string; chars: number };
type CollectionSeen = { inField: boolean; listInside: boolean; shown: boolean; x: number; y: number; w: number; h: number; left: number; top: number; right: number; bottom: number; name: string; count: string; filter: string; note: string; places: string; collapsed: boolean; narrow: boolean; outOfSight: boolean; veil: number; opaque: boolean; z: number; listShown: boolean; expanded: string | null };
type RowSeen = { id: string; x: number; y: number; top: number; bottom: number; index: number };
type Active = { on: string; id: string | null; top: number };

/** What every part of the Glass section is handed. */
interface Kit {
  ctx: GlassSmokeContext;
  win: BrowserWindow;
  js: Js;
  /** Wait for a page that was loaded or reloaded, and put the helpers and the owed notes back. */
  boot: () => Promise<void>;
  record: (ok: boolean, what: string) => void;
  /** Choose a view from the switcher, as a person does, and wait for its deal. */
  view: (id: string) => Promise<void>;
  /** An empty desk on this view in Glass, facing the front at 1×, with motion on, and the collection where a new desk has it. */
  fresh: (viewId: string) => Promise<void>;
  /**
   * Face this way, with the desk in front. The desk stands at a bearing, and
   * the collection is on it: turned to by hand, the list is left behind, and
   * left where an earlier check's document was opened it stands across the
   * middle of the field, over the cards the next check presses.
   */
  face: (yaw: number) => Promise<void>;
  /** The collection as it is drawn. */
  collection: () => Promise<CollectionSeen>;
  /**
   * Nothing stored for a view's collection again, so the parts after find it
   * where a new desk has it. The store has no action that forgets a layout,
   * so its state is put back without that one entry.
   */
  forgetCollection: (viewId: string) => void;
  deskIds: () => string[];
  /** Escape once, to leave the focus; with no focus it does nothing, because Escape would sweep. */
  leave: (keepKeyboard?: boolean) => Promise<boolean>;
}

export async function recordGlass(ctx: GlassSmokeContext): Promise<void> {
  const { store, skip, notHere, prepared } = ctx;
  // Each check is printed by the run's own `record` under DECK_SMOKE_DEBUG=1,
  // in every section, so the lines can be counted for the whole run.
  const record = (ok: boolean, what: string): void => ctx.record(ok, what);
  const only = process.env['DECK_SMOKE_GLASS_ONLY'];
  const wanted = glassSections(only);
  if (wanted.unknown.length > 0) throw new Error(`DECK_SMOKE_GLASS_ONLY names no part of the Glass section: ${wanted.unknown.join(', ')} (the parts are ${SECTIONS.join(', ')}, and base)`);
  // A partial run says so, by name, so it can never be read as a whole one.
  if (wanted.left.length > 0) skip(`these parts of Glass: ${wanted.left.join(', ')}: DECK_SMOKE_GLASS_ONLY=${only ?? ''}`);
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
  const view = async (id: string): Promise<void> => {
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === ${JSON.stringify(id)}).click()`);
    await delay(1800);
  };
  /** The open issues marked owed in this page, when the workspace owes none; empty when it owes some. */
  let owedIds: string[] = [];
  const boot = async (): Promise<void> => {
    await once(win, 'did-finish-load');
    await ctx.untilBooted(win);
    await delay(1800);
    await js(PAGE_HELPERS);
    if (process.env['DECK_SMOKE_TRACE'] === '1') await js(`window.__deckTrace = true`);
    if (owedIds.length > 0) {
      // A new page read the view before the patch could be there: read it again.
      await js(owedPatch(owedIds));
      if (store.getState().viewId === 'issues') await view('issues');
    }
  };
  const deskIds = (): string[] => deskCardsOf(store.getState(), prepared.id).map((c) => c.noteId);
  const leave = (keepKeyboard = false): Promise<boolean> => leaveFocus(ctx, win, js, keepKeyboard);
  const face = async (yaw: number): Promise<void> => {
    // Out of the focus first, which also puts back a desk that was moved
    // aside. Then the field is faced, and the desk is brought round to it by
    // the application's own "collection" route, which puts the keyboard in
    // the list: it is taken off again, so a key pressed next goes where the
    // check sends it.
    await js(`(() => { const g = __t.glass(); g.leaveFocus(); g.model.face(${yaw}); g.render(false); g.showCollection(); return true; })()`);
    await delay(350);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
  };
  const collection = (): Promise<CollectionSeen> => js(`__t.collection()`);
  const fresh = async (viewId: string): Promise<void> => {
    reset();
    store.dispatch({ type: 'select-surface', surface: 'glass' });
    win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
    await delay(500);
    await view(viewId);
    await js(`window.__deckReducedMotion = false; __t.glass().zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
    await face(0);
    await pointer(win, [{ type: 'move', ...PARK }]);
    await delay(500);
  };
  const forgetCollection = (viewId: string): void => {
    const state = JSON.parse(JSON.stringify(store.getState())) as DeckState;
    if (state.collections[prepared.id]?.[viewId] === undefined) return;
    delete state.collections[prepared.id]?.[viewId];
    store.dispatch({ type: 'restore', state });
  };
  const kit: Kit = { ctx, win, js, boot, record, view, fresh, face, collection, forgetCollection, deskIds, leave };
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
    // becomes one (TASK-0077). The zoomed case is checked with the desks.
    record(opened.deep === 0, 'at 1x the quiet band is painted, and holds no element of its own');
    record(opened.canvas, 'the quiet band is drawn on one canvas');
    const toggle = await js<string[]>(`[...document.querySelectorAll('#surface-toggle button')].map((b) => b.dataset.surface)`);
    record(toggle.join(',') === 'glass,spread,list,orbit', `the switcher offers the surface toggle for the view (${toggle.join(',')})`);
    fs.writeFileSync(path.join(ctx.tempDir, 'deck-glass-issues.png'), (await win.webContents.capturePage()).toPNG());

    // ---- The front band on the real data, and owed notes for what needs them ----
    // The front band holds what is owed a decision. Whether this workspace
    // owes anything is a fact about the day the run is made on, so the run
    // says what it found before it does anything about it.
    type Front = { owedText: string; front: number; frontCards: number; empty: boolean; emptyText: string };
    const frontNow = (): Promise<Front> =>
      js(`({ owedText: __t.text('#owed-count'), front: __t.bands().counts.front, frontCards: document.querySelectorAll('.field-card[data-band="front"]:not(.leaving)').length, empty: __t.shown('#field-empty'), emptyText: __t.text('#field-empty') })`);
    const real = await frontNow();
    const realOwed = Number(/^(\d+) owed$/.exec(real.owedText)?.[1] ?? NaN);
    record(Number.isFinite(realOwed), `the owed count is on the field's bar (${real.owedText})`);
    if (realOwed === 0) {
      record(
        real.front === 0 && real.frontCards === 0 && real.empty && /owed/.test(real.emptyText),
        `the Issues view owes nothing today, and Glass says so: the bar reads "${real.owedText}", the front band holds ${real.front} notes and ${real.frontCards} cards, and the field says "${real.emptyText.slice(0, 48)}…"`,
      );
      // The open issues, in the order the sidecar lists them: every note in a
      // group that is not finished work.
      const open = await js<string[]>(`fetch('/deck/sidecar/${prepared.id}/api/cockpit/nav?mode=issues').then((r) => r.json()).then((p) => { const out = []; for (const g of p.groups || []) { if (g.suppressed === true || String(g.key).endsWith(':done')) continue; for (const i of g.items || []) if (i.id && i.owed !== true && !out.includes(i.id)) out.push(i.id); } return out; })`);
      owedIds = open.slice(0, OWED_TO_INJECT);
      if (owedIds.length < 2) {
        record(false, `the Issues view has at least two open issues to mark owed for the checks that need a front card (${open.length} open: ${open.join(', ') || 'none'})`);
      } else {
        await js(owedPatch(owedIds));
        await view('issues');
        const made = await frontNow();
        record(
          made.owedText === `${owedIds.length} owed` && made.front === owedIds.length && made.frontCards === owedIds.length && !made.empty,
          `INJECTED: ${owedIds.length} of the ${open.length} open issues (${owedIds.join(', ')}) are marked owed in this page's copy of the navigation payload only, because the workspace owes nothing; no file is written. The bar now reads "${made.owedText}", ${made.frontCards} cards stand in front, and the empty statement is gone`,
        );
      }
    } else {
      record(real.front > 0 && real.frontCards > 0 && !real.empty, `the Issues view owes ${realOwed} today, so the front band holds cards (${real.frontCards}) and no owed note is injected`);
    }

    const parts: Array<[Section, () => Promise<void>]> = [
      ['lift', () => recordLift(kit)],
      ['hands', () => recordHands(kit)],
      ['panes', () => recordPanes(kit)],
      ['keys', () => recordKeys(kit)],
      ['switch', () => recordSwitch(kit)],
      // ---- FEAT-0020: the list is an object on the field, and a note is read in its document ----
      ['collection', () => recordCollection(kit)],
      ['document', () => recordDocument(kit)],
      ['served', () => recordServed(kit)],
      // ---- FEAT-0022: the collection as cards, and an arrangement shown before it is applied ----
      ['arrange', () => recordArrange(kit)],
      // ---- TASK-0055: the throw ----
      ['throw', () => recordThrow(kit)],
      // ---- FEAT-0001: the orbit arrangement ----
      ['orbit', () => recordOrbit(kit)],
      // ---- FEAT-0016: the wheel zooms Glass and the orbit ----
      ['zoom', () => recordZoom(kit)],
      // ---- FEAT-0017: an opened note keeps its size and its neighbourhood ----
      ['focus', () => recordFocus(kit)],
      // ---- FEAT-0015: a desk for each view, notes on every view, and Hide notes ----
      ['desks', () => recordDesksPerView(kit)],
      // ---- TASK-0033: an address that names Spread opens on the desk ----
      ['address', () => recordAddress(kit)],
    ];
    for (const [name, part] of parts) {
      if (!wanted.run.has(name)) continue;
      if (process.env['DECK_SMOKE_DEBUG'] === '1') console.log(`---- ${name} ----`);
      try {
        await part();
      } catch (err) {
        // A part that stops is a failure by name, and the parts after it
        // still run: each starts from an empty desk of its own.
        const stack = err instanceof Error ? (err.stack ?? '').split('\n').slice(0, 3).join(' | ') : '';
        record(false, `the ${name} part of Glass ran to its end (it stopped: ${err instanceof Error ? err.message : String(err)}${stack === '' ? '' : `; ${stack}`})`);
        await js(`window.__deckReducedMotion = false; true`).catch(() => null);
      }
    }
    store.dispatch({ type: 'select-surface', surface: 'glass' });
  } finally {
    const after = gitStatus(prepared.root);
    // Where git cannot be run, both readings are null and comparing them
    // would pass whatever the run did. The box's image has no git, so there
    // the check says it could not be made.
    if (before === null || after === null) skip('git status in the workspace before and after the Glass checks: git could not be run here, so this run cannot say the workspace is unchanged');
    else record(before === after, 'git status in the workspace is unchanged after every Glass check');
    if (!win.isDestroyed()) win.destroy();
    reset();
  }
  void notHere;
}

/** Escape once, to leave the focus (FEAT-0017), and wait until it is left. With no focus it does nothing: Escape would sweep the desk. */
async function leaveFocus(ctx: GlassSmokeContext, win: BrowserWindow, js: Js, keepKeyboard = false): Promise<boolean> {
  if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
  ctx.focusApp(win);
  if (!keepKeyboard) await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
  press(win, 'Escape');
  for (let i = 0; i < 20; i += 1) {
    if ((await js<string | null>(`__t.glass().focusId()`)) === null) return true;
    await delay(100);
  }
  return false;
}

/**
 * A note is lifted with a real click (TASK-0031, TASK-0035), a second is
 * opened from a card gathered round the first (TASK-0037), and the three
 * closing verbs put them back.
 *
 * Until TASK-0104 a lifted note left a dashed ghost in its slot and dealt its
 * neighbourhood into the front band, and leaving the focus turned the field to
 * face it. All three are gone: a held note is its document and nothing else,
 * the field keeps its deal, and the field turns only when a person turns it.
 */
async function recordLift(kit: Kit): Promise<void> {
  const { ctx, win, js, record, deskIds, leave } = kit;
  const { store, prepared } = ctx;
  await kit.fresh('issues');

  // ---- TASK-0031: a real pointer reaches a front card, not a container ----
  const front = await js<Seen[]>(`__t.visibleCards('front')`);
  record(front.length > 0, `the Issues view has cards in the front band (${front.length})`);
  const target = front[0];
  if (target === undefined) throw new Error('no front card to lift');
  const hit = await js<string | null>(`__t.hit(${target.x}, ${target.y})`);
  record(hit === target.id, `the browser's own hit test at a front card's centre finds that card (${hit})`);
  const owedBefore = await js<{ left: number; top: number } | null>(`__t.rect('#owed-count')`);
  const requestsBefore = await js<number>(`__t.requests()`);
  const dealBefore = await js<{ slots: string; front: string[]; label: string }>(`({ slots: __t.slots(), front: __t.frontIds(), label: __t.text('#front-label') })`);

  // ---- TASK-0035: lift. One note is one object (ISS-0070) ----
  // Clicked, then the pointer moves off the field, so a card that arrives
  // under it is not reached for and counted as the lift's request.
  await pointer(win, [...click(target), { type: 'move', ...PARK }]);
  await delay(1600);
  record(deskIds().includes(target.id), `a real click on ${target.id} put it on the desk the store holds`);
  const lifted = await js<{ cards: number; ghosts: number; slot: boolean; pane: boolean; label: string; owed: { left: number; top: number } | null; requests: number }>(`({
    cards: __t.drawn(${JSON.stringify(target.id)}), ghosts: document.querySelectorAll('.ghost').length, slot: !!__t.where(${JSON.stringify(target.id)}),
    pane: !!document.querySelector('.pane[data-note-id="${target.id}"]'),
    label: __t.text('#front-label'), owed: __t.rect('#owed-count'), requests: __t.requests() })`);
  record(lifted.cards === 0 && lifted.ghosts === 0 && lifted.slot, `the lifted note is drawn once, as its document: the field draws no card for it (${lifted.cards}) and no ghost (${lifted.ghosts}), and still holds its slot`);
  record(lifted.pane, 'the lifted note is a pane on the front plane');
  // Until FEAT-0020 a lifted note's text was read in a column beside the
  // field. There is no such column in Glass now: the note is read in its
  // document, which holds the text itself, and the verbs' strip that stood
  // above the column is not drawn either.
  let read = { state: '', chars: 0, article: false, reader: true, actuators: true, reading: true, face: 1 };
  for (let i = 0; i < 20 && read.state !== 'ready'; i += 1) {
    if (i > 0) await delay(150);
    read = await js<typeof read>(`(() => { const p = document.querySelector('.pane[data-note-id="${target.id}"]'); const n = p && p.querySelector('.pane-body article.pane-note'); return { state: p ? p.dataset.state || '' : '', chars: n ? n.textContent.trim().length : 0, article: !!n, reader: __t.shown('#reader'), actuators: __t.shown('#actuators'), reading: document.body.classList.contains('reading'), face: p ? p.querySelectorAll('.pane-face').length : 1 }; })()`);
  }
  record(
    read.state === 'ready' && read.article && read.chars > 20 && !read.reader && !read.actuators && !read.reading && read.face === 0,
    `the note is read in its document, which holds its text (${read.chars} characters, ${read.state}); Glass draws no reader column (${read.reader}), no strip of verbs beside it (${read.actuators}) and never sets the reading layout (${read.reading})`,
  );
  record(lifted.label === 'in front: what needs you' && lifted.label === dealBefore.label, `the front label says the same thing while a note is held as before ("${lifted.label}")`);
  record(
    owedBefore !== null && lifted.owed !== null && Math.abs(owedBefore.left - lifted.owed.left) < 1 && Math.abs(owedBefore.top - lifted.owed.top) < 1,
    'the owed count is drawn in the same place before and during the hold',
  );
  record(lifted.requests - requestsBefore === 1, `lifting made one context request (${lifted.requests - requestsBefore})`);
  const neighbours = await js<string[]>(`(() => {
    const c = window.__deckContexts.peek(${JSON.stringify(prepared.id)}, ${JSON.stringify(target.id)}, window.__deckLastState.indexRevisions[${JSON.stringify(prepared.id)}] || 0);
    return c ? [...new Set([...c.linked, ...c.backlinks].map((i) => i.id))].filter((id) => id !== ${JSON.stringify(target.id)}) : [];
  })()`);
  record(neighbours.length > 0, `${target.id} has a neighbourhood (${neighbours.length} notes)`);
  // Until TASK-0104 the neighbourhood took the front band. Holding a note now
  // moves no card: the front band holds what it held, and every note keeps
  // the slot it had before the lift.
  const dealHeld = await js<{ slots: string; front: string[] }>(`({ slots: __t.slots(), front: __t.frontIds() })`);
  record(
    dealHeld.slots === dealBefore.slots && dealHeld.front.join() === dealBefore.front.join(),
    `holding a note deals nothing forward: the front band holds the notes it held before the lift (${dealHeld.front.join(', ')}) and every note keeps its slot`,
  );
  // What it is joined to is still marked on the field and listed in the navigator.
  const marks = await js<{ should: string[]; joined: string[]; listed: number }>(`(() => {
    const ids = ${JSON.stringify(neighbours)};
    const drawn = [...document.querySelectorAll('.field-card:not(.leaving)')];
    const group = document.querySelector('#nav-list .nav-group[data-group-key="g:deck:joined"]');
    return { should: drawn.map((e) => e.dataset.noteId).filter((id) => ids.includes(id)).sort(), joined: drawn.filter((e) => e.classList.contains('joined')).map((e) => e.dataset.noteId).sort(),
      listed: group && /Joined to what you are holding/.test(group.textContent) ? Number(group.querySelector('.mark').textContent) : -1 };
  })()`);
  record(marks.should.length > 0 && marks.joined.join() === marks.should.join(), `every drawn card joined to the held note carries the joined mark, and no other does (${marks.joined.length} marked, ${marks.should.length} joined)`);
  record(marks.listed === neighbours.length, `the navigator lists what the held note is joined to (${marks.listed} of ${neighbours.length})`);

  // ---- TASK-0037: a second note, and what the two share ----
  // The second note is opened from a card gathered round the first: the
  // cards a person can press while a document is the focus. One that the view
  // holds is taken first, because it is the likeliest to share neighbours.
  const openFromSeat = async (): Promise<Seated | null> => {
    const seats = await js<Array<Seated & { inView: boolean }>>(`__t.seated().filter((s) => s.hit).map((s) => ({ ...s, inView: !!__t.glass().entryFor(s.id) }))`);
    const held = deskIds();
    const seat = seats.filter((s) => !held.includes(s.id)).sort((a, b) => Number(b.inView) - Number(a.inView))[0];
    if (seat === undefined) return null;
    await pointer(win, [...click(seat), { type: 'move', ...PARK }]);
    await delay(1600);
    return seat;
  };
  const second = await openFromSeat();
  if (second === null) {
    record(false, `a card gathered round ${target.id} was in sight to open as a second note`);
  } else {
    const two = await js<{ count: string; shared: string[]; drawn: string[]; marked: string[]; navGroup: number; focus: string | null; sharedLines: string[]; toFirst: number; firstCards: number; twice: string[] }>(`(() => {
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
      const drawn = [...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => e.dataset.noteId);
      const marked = [...document.querySelectorAll('.field-card.shared:not(.leaving)')].map((e) => e.dataset.noteId);
      const group = [...document.querySelectorAll('#nav-list .nav-group')].find((g) => /more than one held note/.test(g.textContent));
      const lines = [...document.querySelectorAll('#field-lines .link-line')];
      return { count: __t.text('#glass-desk-count'), shared, drawn, marked, navGroup: group ? Number(group.querySelector('.mark').textContent) : 0, focus: __t.glass().focusId(),
        sharedLines: lines.filter((l) => l.classList.contains('shared') && l.dataset.from === ${JSON.stringify(target.id)}).map((l) => l.dataset.noteId),
        toFirst: lines.filter((l) => !l.classList.contains('shared') && l.dataset.noteId === ${JSON.stringify(target.id)} && l.dataset.from === ${JSON.stringify(second.id)}).length,
        firstCards: __t.drawn(${JSON.stringify(target.id)}), twice: __t.twice() };
    })()`);
    record(deskIds().length === 2 && two.focus === second.id, `a click on a card gathered round the first note opens a second, no modifier needed, and it is the focus (${deskIds().join(', ')}; focus ${two.focus})`);
    const said = /(\d+) joined to more than one/.exec(two.count);
    record(said !== null && Number(said[1]) === two.shared.length, `the desk bar counts what the held notes share, and says what it counts ("${two.count}")`);
    const shouldMark = two.drawn.filter((id) => two.shared.includes(id)).sort();
    record(two.shared.length > 0 && JSON.stringify(two.marked.slice().sort()) === JSON.stringify(shouldMark), `every drawn card joined to both carries the mark, and no other does (${two.marked.length} marked of ${two.shared.length} shared)`);
    record(two.navGroup === two.shared.length, `the navigator lists what they share (${two.navGroup})`);
    // Until TASK-0104 "every shared note is dealt into the front band first".
    // Nothing is dealt forward now. A note joined to both documents is ONE
    // card beside the focus with a line from each document, and a neighbour
    // that is already a document gets a line to that document and no card.
    const firstIsNeighbour = (await js<boolean>(`(() => { const c = __t.glass().hooks.peekContext(${JSON.stringify(second.id)}); return !!c && [...c.linked, ...c.backlinks].some((i) => i.id === ${JSON.stringify(target.id)}); })()`));
    record(
      two.sharedLines.slice().sort().join() === two.shared.slice().sort().join() && two.twice.length === 0 && two.firstCards === 0 && two.toFirst === (firstIsNeighbour ? 1 : 0),
      `a note joined to both documents is one card with a second line from ${target.id} (${two.sharedLines.length} second lines for ${two.shared.length} shared notes, ${two.twice.length} notes drawn twice), and ${target.id}, already a document, has ${two.toFirst} line to its document and ${two.firstCards} cards`,
    );
  }

  // ---- the three closing verbs, and the background ----
  const closeFirst = await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${target.id}"] .pane-close')`);
  if (closeFirst === null) {
    record(false, `${target.id}'s document has a put-back control to press`);
  } else {
    const askedBefore = await js<number>(`__t.requests()`);
    await pointer(win, [...click(closeFirst), { type: 'move', ...PARK }]);
    await delay(700);
    record((await js<number>(`__t.requests()`)) === askedBefore, 'putting a note back asks the sidecar nothing');
    await delay(700);
    record(!deskIds().includes(target.id), '× on a pane puts that note back');
    const back = await js<{ cards: number; band: string | null }>(`({ cards: __t.drawn(${JSON.stringify(target.id)}), band: (__t.where(${JSON.stringify(target.id)}) || {}).band || null })`);
    record(back.cards === 1 && back.band !== null, `the note returned to the field: it is one card again, in the ${back.band} band (${back.cards} cards)`);
  }
  // A second note again, so there is another to put back.
  if (deskIds().length < 2) await openFromSeat();
  const held = deskIds();
  const keep = held[held.length - 1];
  const closeOthers = keep === undefined ? null : await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${keep}"] .pane-close')`);
  if (closeOthers === null || held.length < 2) {
    record(false, `two notes were held, to put every other one back (${held.join(', ') || 'none held'})`);
  } else {
    await pointer(win, [...click(closeOthers, true), { type: 'move', ...PARK }]);
    await delay(700);
    record(deskIds().join() === keep, `⌥× puts back every other note (${deskIds().join(', ')})`);
  }
  const heldNow = deskIds().length;
  const blank = await js<{ x: number; y: number } | null>(`__t.blank()`);
  if (blank === null) {
    record(false, 'a point of the field with nothing on it, to click');
  } else {
    await pointer(win, [...click(blank), { type: 'move', ...PARK }]);
    await delay(400);
    record(deskIds().length === heldNow && heldNow > 0, `a click on the field’s background changes nothing (${deskIds().length} held before and after)`);
  }
  await js(`document.getElementById('field').focus()`);
  // One Escape ends one thing (FEAT-0017, decision 10): with a focus, the
  // first Escape leaves it and keeps every document; the next one sweeps.
  const focusBefore = await js<string | null>(`__t.glass().focusId()`);
  press(win, 'Escape');
  await delay(600);
  record(focusBefore !== null && deskIds().length === heldNow && (await js<string | null>(`__t.glass().focusId()`)) === null, `the first Escape leaves the focus and keeps the desk (${deskIds().length} held, focus was ${focusBefore})`);
  press(win, 'Escape');
  await delay(600);
  record(deskIds().length === 0, 'esc sweeps the desk');

  // ---- A lift does not turn the field, and neither does leaving the focus ----
  // Until TASK-0104 leaving the focus dealt the neighbourhood into the front
  // band and flew the field round to face it. The document now opens in
  // front of the person whichever way they face, and the field stays put.
  await js(`window.__deckGlass.model.face(0.8); window.__deckGlass.render(false); true`);
  await delay(300);
  const offFront = (await js<Seen[]>(`__t.visibleCards('front')`))[0];
  if (offFront === undefined) {
    record(false, 'a front card was in sight at yaw 0.8 to lift');
  } else {
    const yaws: number[] = [];
    const sample = async (count: number): Promise<void> => {
      for (let i = 0; i < count; i += 1) {
        yaws.push(await js<number>(`__t.yaw()`));
        await delay(40);
      }
    };
    await pointer(win, [...click(offFront), { type: 'move', ...PARK }]);
    await sample(30);
    const opened = await js<{ pane: PaneSeen | null; field: Box }>(`({ pane: __t.pane(${JSON.stringify(offFront.id)}), field: __t.rect('#field') })`);
    const left = leave();
    await sample(30);
    const leftFocus = await left;
    // In front means in full sight: until FEAT-0020 that was read as the
    // element's opacity, which is no longer set. A document is dimmed by a
    // veil, so full sight is sight 1 with no veil, the element itself opaque.
    const inFront = opened.pane !== null && !opened.pane.outOfSight && opened.pane.sight === 1 && opened.pane.veil === 0 && opened.pane.opaque && opened.pane.left >= opened.field.left - 1 && opened.pane.right <= opened.field.right + 1;
    const turned = yaws.filter((y) => Math.abs(y - 0.8) > 1e-9).length;
    // The collection is on the same desk, so it came round with the document.
    const listCame = await kit.collection();
    record(
      deskIds().includes(offFront.id) && inFront && leftFocus && turned === 0 && listCame.shown && !listCame.outOfSight && listCame.veil === 0 && Math.abs(listCame.x - 12) < 1,
      `a lift at yaw 0.8 opens the document in front of the person (${opened.pane === null ? 'no pane' : `${Math.round(opened.pane.left - opened.field.left)} px into the field, in sight ${opened.pane.sight}, veil ${opened.pane.veil}`}), brings the collection round with it (${Math.round(listCame.x)} px into the field, veil ${listCame.veil}), and neither the lift nor leaving the focus turns the field (${turned} of ${yaws.length} frames off 0.80)`,
    );
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(800);
  }
  // Back to the front, with the desk: the lift above left it at 0.8.
  await kit.face(0);
  await delay(300);

  // ---- ISS-0061: under reduced motion a lift is marked, and nothing flies ----
  // Until TASK-0104 this highlighted the neighbours "brought forward" into
  // the front band, and a second check (ISS-0064) cut the field to the front
  // and looked for cards under the pane. Nothing is brought forward and
  // nothing is an obstacle now. What reduced motion still owes is the same
  // arrangement with no travel and a mark on what arrived: the document and
  // every card gathered round it.
  await js(`window.__deckReducedMotion = true`);
  const rmFront = (await js<Seen[]>(`__t.visibleCards('front')`))[0];
  if (rmFront === undefined) {
    record(false, 'a front card was in sight to lift under reduced motion');
  } else {
    const yawBefore = await js<number>(`__t.yaw()`);
    // What the note is joined to is forgotten first, so it is read after the
    // document opens, as it is for a note nobody has reached for. The cards
    // then take their seats a moment after the document is marked, and that
    // is the case that arrived unmarked; the focus part opens a note whose
    // neighbourhood is already known.
    await js(`(() => { const c = window.__deckContexts; for (const k of [...c.answers.keys()]) if (k.endsWith(' ' + ${JSON.stringify(rmFront.id)})) c.answers.delete(k); return true; })()`);
    await pointer(win, [...click(rmFront), { type: 'move', ...PARK }]);
    let lit = { pane: false, seated: 0, lit: 0, gather: false, opening: false, animate: false };
    let most = lit;
    for (let i = 0; i < 20; i += 1) {
      await delay(100);
      lit = await js<typeof lit>(`(() => { const s = __t.seated(); const p = __t.pane(${JSON.stringify(rmFront.id)}); const f = document.getElementById('field'); return { pane: !!p && p.lit, seated: s.length, lit: s.filter((c) => c.lit).length, gather: f.classList.contains('gather'), opening: __t.glass().isOpening(), animate: f.classList.contains('animate') }; })()`);
      most = { pane: most.pane || lit.pane, seated: Math.max(most.seated, lit.seated), lit: Math.max(most.lit, lit.lit), gather: most.gather || lit.gather, opening: most.opening || lit.opening, animate: most.animate || lit.animate };
      if (most.pane && most.seated > 0 && most.lit === most.seated) break;
    }
    const turned = await js<boolean>(`document.getElementById('field').classList.contains('turning')`);
    const yawAfter = await js<number>(`__t.yaw()`);
    record(
      most.pane && most.seated > 0 && most.lit === most.seated && !most.gather && !most.opening && !turned && Math.abs(yawAfter - yawBefore) < 1e-9,
      `under reduced motion a lift marks the document (${most.pane}) and every card gathered round it (${most.lit} of ${most.seated}), with no opening animation (${most.opening}), no gathering movement (${most.gather}) and no turn (yaw ${yawBefore.toFixed(2)} to ${yawAfter.toFixed(2)})`,
    );
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(600);
  }
  await js(`window.__deckReducedMotion = false`);
}

/** Turning by drag and by key, the compass, pull and push, let go, and reach (TASK-0031, TASK-0053, TASK-0056). */
async function recordHands(kit: Kit): Promise<void> {
  const { ctx, win, js, record, view } = kit;
  const { store, prepared, skip } = ctx;
  await kit.fresh('issues');
  const field = await js<Box>(`__t.rect('#field')`);
  const empty = { x: field.left + 30, y: field.bottom - 30 };

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
  // In the Features view, whose middle band is full: the Issues view's holds
  // only the few open issues that are not owed.
  await view('features');
  await delay(400);
  const mid = await js<Seen[]>(`__t.visibleCards('mid')`);
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
    await view('issues');
    await view('features');
    await delay(400);
    record((await js<{ band: string } | null>(`__t.where(${JSON.stringify(pullee.id)})`))?.band === 'front', 'the pulled note is still in front after a view switch');
    record(!(await js<string>(`document.getElementById('copy-address').title + JSON.stringify(window.__deckLastState.viewId)`)).includes(pullee.id), 'the pull is nowhere near the address');
  }
  const pushable = (await js<Seen[]>(`__t.visibleCards('mid')`))[0];
  if (pushable !== undefined) {
    await pointer(win, drag(pushable, { x: pushable.x, y: pushable.y - 90 }, 10));
    await delay(1300);
    record((store.getState().session.pushed[prepared.id] ?? []).includes(pushable.id), `dragging ${pushable.id} away pushed it`);
    record((await js<{ band: string } | null>(`__t.where(${JSON.stringify(pushable.id)})`))?.band === 'deep', 'the pushed note is in the quiet band');
    record((await js<string>(`document.getElementById('compass').dataset.pushed`)) === '1', 'the compass counts the pushed note');
  } else {
    skip('the push: no mid card was in sight to push away');
  }
  // The refused push is in the Issues view, where the owed notes are.
  await view('issues');
  await delay(400);
  const owedCard = (await js<Seen[]>(`__t.visibleCards('front')`)).find((c) => c.owed);
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
  await view('features');
  await delay(400);
  const reachable = await js<Seen[]>(`__t.visibleCards('mid').filter((c) => __t.hit(c.x, c.y) === c.id)`);
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
    // The layer for the focused document's lines (FEAT-0017) is not the
    // reach's: it is always in the page, empty and hidden with no focus, and
    // is left out. It was `#field-ring` until TASK-0104.
    const wiresInDom = await js<number>(`[...document.querySelectorAll('#field line, #field svg, .wire')].filter((e) => !e.closest('#field-lines')).length`);
    const focusLines = await js<number>(`document.querySelectorAll('#field-lines .link-line').length`);
    record(wiresInDom === 0 && focusLines === 0, `a reach adds no element to the document; the wires are on the canvas (${wiresInDom} elements, ${focusLines} focus lines)`);
  }
  await pointer(win, [{ type: 'move', ...PARK }]);
}

/**
 * Held notes as documents on the front plane (TASK-0054): dragged, resized,
 * stacked, raised, made to fill the field and put back, moved by keyboard,
 * and still there after a reload and in Spread.
 *
 * Until FEAT-0020 "widen" moved a note's text to a reading column beside the
 * field, and three checks here asserted that column. The text is in the
 * document now, so the same control makes the document as large as the field
 * and the checks assert that instead.
 *
 * Until TASK-0104 a document was an obstacle and this part ended two of its
 * steps with "no field card is dealt under a pane". Nothing on the desk is an
 * obstacle now: the field passes behind the desk and keeps its slots. So the
 * same steps end with the opposite claim, which is the one a person notices:
 * opening and moving documents moved no card.
 */
async function recordPanes(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record, view, deskIds, leave } = kit;
  const { store, prepared } = ctx;
  await kit.fresh('features');
  const deskCard = (id: string): { noteId: string; x: number; y: number; w?: number; h?: number; wide?: boolean } | undefined => deskCardsOf(store.getState(), prepared.id).find((c) => c.noteId === id);
  const cardsBefore = await js<Record<string, string>>(`__t.cardsAt()`);
  const slotsBefore = await js<string>(`__t.slots()`);
  // One at a time, reading the field again after each: the first document
  // stands across the middle, so the second is a card beside it.
  const toLift: Seen[] = [];
  for (let i = 0; i < 2; i += 1) {
    const next = (await js<Seen[]>(`__t.visibleCards()`)).find((c) => !deskIds().includes(c.id));
    if (next === undefined) break;
    toLift.push(next);
    await pointer(win, [...click(next), { type: 'move', ...PARK }]);
    await delay(1300);
    // Out of the focus, so the next card stands in its slot and not at a seat (FEAT-0017).
    await leave();
    await delay(700);
  }
  const [paneA, paneB] = deskIds();
  if (process.env['DECK_SMOKE_TRACE'] === '1') {
    win.webContents.on('console-message', (_e, _level, message) => console.log(`page: ${message}`));
    await js(`for (const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture']) document.addEventListener(t, (e) => console.log(t, e.target.className || e.target.tagName, e.buttons, e.clientX, e.clientY), true); true`);
  }
  if (paneA === undefined || paneB === undefined) {
    record(false, `panes: two notes could be lifted (${toLift.map((c) => c.id).join(', ')} gave ${deskIds().join(', ')})`);
    return;
  }
  // The drag is short enough that the document's corner stays inside the
  // field: a document is 520 tall, and the corner is what is dragged next.
  // A header is pressed at the same distance from its document's left edge
  // every time. Until FEAT-0020 the id was the first thing in a header and
  // its middle served; the title comes first now and the id stands after it,
  // at a place that depends on how long the title is.
  const headOf = async (id: string): Promise<{ x: number; y: number }> => {
    const at = await js<{ x: number; y: number } | null>(`__t.head(${JSON.stringify(id)})`);
    if (at === null) throw new Error(`the header of ${id}'s document is not in reach`);
    return at;
  };
  const headA = await headOf(paneA);
  const startA = deskCard(paneA);
  await pointer(win, drag({ x: headA.x, y: headA.y }, { x: headA.x + 40, y: headA.y + 100 }, 12));
  await delay(800);
  const movedA = deskCard(paneA);
  record(
    startA !== undefined && movedA !== undefined && Math.abs(movedA.x - startA.x - 40) <= 2 && Math.abs(movedA.y - startA.y - 100) <= 2,
    `a pane dragged by its header lands where it was released (${startA?.x},${startA?.y} to ${movedA?.x},${movedA?.y})`,
  );
  // Dragged further left than its width allows, so it stops at the minimum.
  const handle = await js<{ x: number; y: number; width: number }>(`(() => { const p = document.querySelector('.pane[data-note-id="${paneA}"]'); const r = p.querySelector('.pane-resize').getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5, width: p.getBoundingClientRect().width }; })()`);
  await pointer(win, drag(handle, { x: handle.x - (handle.width - 280) - 60, y: handle.y + 20 }, 8));
  await delay(600);
  const sized = deskCard(paneA);
  record(sized?.w === 280, `a pane resized narrower stops at the stated minimum width (${handle.width} to ${sized?.w})`);
  // Stack: drop B's header onto A's header; it snaps below it.
  const a = deskCard(paneA);
  const headB = await headOf(paneB);
  const headA2 = await headOf(paneA);
  await pointer(win, drag(headB, { x: headA2.x, y: headA2.y + 4 }, 12));
  await delay(800);
  const b = deskCard(paneB);
  record(a !== undefined && b !== undefined && b.y === a.y + 34 && b.x === a.x, `a pane dropped on another’s header snaps below it (${a?.x},${a?.y} then ${b?.x},${b?.y})`);
  // A click on the lower pane's header raises it.
  const lower = await headOf(paneA);
  record((await js<string | null>(`(() => { const e = document.elementFromPoint(${lower.x}, ${lower.y}); const p = e && e.closest('.pane'); return p ? p.dataset.noteId : null; })()`)) === paneA, 'the covered pane’s header is still visible and hit');
  await pointer(win, click(lower));
  await delay(600);
  record(deskIds().at(-1) === paneA, 'a click on a header raises that pane');
  // Panes stack whole: the raised pane covers the header of the pane it
  // lies on, rather than that header showing through its text (ISS-0066).
  const atHeadB = await js<string | null>(`(() => { const r = document.querySelector('.pane[data-note-id="${paneB}"] .pane-head').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 24, r.top + r.height / 2); const p = e && e.closest('.pane'); return p ? p.dataset.noteId : null; })()`);
  record(atHeadB === paneA, `the raised pane covers the header of the pane under it (${atHeadB} is drawn at ${paneB}'s header)`);
  // And a press on the part of the lower pane's body still showing brings it forward.
  const bodyB = await js<{ x: number; y: number } | null>(`(() => { const pane = document.querySelector('.pane[data-note-id="${paneB}"]'); const r = pane.getBoundingClientRect(); const f = document.getElementById('field').getBoundingClientRect(); for (let y = Math.min(r.bottom, f.bottom) - 6; y > r.top + 40; y -= 8) for (let x = Math.min(r.right, f.right) - 20; x > r.left + 6; x -= 8) { const e = document.elementFromPoint(x, y); if (e && !e.closest('a') && e.closest('.pane-body') && e.closest('.pane') === pane) return { x, y }; } return null; })()`);
  if (bodyB === null) {
    record(false, `some of ${paneB}'s body shows beside the pane on top, to press`);
  } else {
    await pointer(win, [...click(bodyB), { type: 'move', ...PARK }]);
    await delay(600);
    record(deskIds().at(-1) === paneB, `a press on a pane's body raises it (${deskIds().at(-1)} on top)`);
  }
  // Nothing on the desk is an obstacle (TASK-0104). Two notes were opened,
  // and their documents dragged, resized, stacked and raised: every card the
  // field drew before is drawn where it was, and some of them stand behind a
  // document. Until TASK-0104 this read "no field card is dealt under a pane".
  const fieldNow = await js<{ cards: Record<string, string>; slots: string; behind: string[] }>(`(() => {
    const panes = [...document.querySelectorAll('.pane:not(.wide)')].map((p) => p.getBoundingClientRect());
    return { cards: __t.cardsAt(), slots: __t.slots(), behind: __t.nearCards().filter((c) => panes.some((p) => c.left < p.right && c.right > p.left && c.top < p.bottom && c.bottom > p.top)).map((c) => c.id) };
  })()`);
  const stayed = Object.keys(cardsBefore).filter((id) => !deskIds().includes(id));
  const movedCards = stayed.filter((id) => fieldNow.cards[id] !== cardsBefore[id]);
  record(
    stayed.length > 0 && movedCards.length === 0 && fieldNow.slots === slotsBefore,
    `opening two notes and moving their documents moved no card: ${stayed.length} cards are drawn where they were (${movedCards.join(', ') || 'none moved'}), ${fieldNow.behind.length} of them behind a document, and every note keeps its slot`,
  );
  // ---- W, or ⤢: the document fills the field, and is put back at its size ----
  // Until FEAT-0020 this read "widen takes the pane to the reading column":
  // the page's layout changed, the field narrowed and the text was read
  // beside it. The document now fills the field where it stands. What the
  // store holds for it does not change, apart from saying that it is filled.
  const fieldBox = await js<Box & { width: number; height: number }>(`__t.rect('#field')`);
  type Filled = { pane: PaneSeen | null; reading: boolean; reader: boolean; pressed: string | null; corner: boolean; focus: string | null };
  const filledNow = (id: string): Promise<Filled> =>
    js(`(() => { const p = document.querySelector('.pane[data-note-id="${id}"]'); return { pane: __t.pane(${JSON.stringify(id)}), reading: document.body.classList.contains('reading'), reader: __t.shown('#reader'), pressed: p ? p.querySelector('.pane-widen').getAttribute('aria-pressed') : null, corner: !!p && getComputedStyle(p.querySelector('.pane-resize')).display !== 'none', focus: __t.glass().focusId() }; })()`);
  const fills = (p: PaneSeen | null): boolean =>
    p !== null && p.wide && Math.abs(p.left - fieldBox.left - 8) < 1 && Math.abs(p.top - fieldBox.top - 8) < 1 && Math.abs(p.width - (fieldBox.width - 16)) < 1 && Math.abs(p.height - (fieldBox.height - 16)) < 1;
  const atOwnSize = (p: PaneSeen | null, c: ReturnType<typeof deskCard>): boolean =>
    p !== null && c !== undefined && !p.wide && Math.abs(p.left - fieldBox.left - c.x) < 1 && Math.abs(p.top - fieldBox.top - c.y) < 1 && p.width === c.w && p.height === c.h;
  const placeOf = (id: string): string => { const c = deskCard(id); return c === undefined ? 'not held' : `${c.x},${c.y} ${c.w}x${c.h}`; };
  const placeA = placeOf(paneA);
  const placeB = placeOf(paneB);
  const widen = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneA}"] .pane-widen')`);
  await pointer(win, [...click(widen), { type: 'move', ...PARK }]);
  await delay(1200);
  const filledA = await filledNow(paneA);
  record(
    fills(filledA.pane) && deskCard(paneA)?.wide === true && placeOf(paneA) === placeA && deskIds().at(-1) === paneA && filledA.pressed === 'true' && !filledA.corner && filledA.focus === null &&
      !filledA.reading && !filledA.reader && filledA.pane !== null && filledA.pane.chars > 20,
    `⤢ fills the field with the document (${filledA.pane === null ? 'no pane' : `${Math.round(filledA.pane.width)} by ${Math.round(filledA.pane.height)} in a field of ${Math.round(fieldBox.width)} by ${Math.round(fieldBox.height)}`}), on top, with its text in it (${filledA.pane?.chars ?? 0} characters) and nothing gathered round it; the store marks it filled and keeps the place and size it had (${placeOf(paneA)}); no reading column opens (${filledA.reading || filledA.reader})`,
  );
  // The filled document covers the other one, so its ⤢ cannot be pressed:
  // the keyboard on that document's header is the way to it.
  ctx.focusApp(win);
  await js(`document.querySelector('.pane[data-note-id="${paneB}"] .pane-head').focus(); true`);
  press(win, 'W');
  await delay(1200);
  const wide = deskCardsOf(store.getState(), prepared.id).filter((c) => c.wide === true).map((c) => c.noteId);
  const filledB = await filledNow(paneB);
  const backA = await filledNow(paneA);
  record(
    wide.join() === paneB && fills(filledB.pane) && deskIds().at(-1) === paneB && atOwnSize(backA.pane, deskCard(paneA)) && placeOf(paneA) === placeA && placeOf(paneB) === placeB,
    `W on another document's header fills the field with that one instead, and the first is back at its own place and size (filled: ${wide.join(', ') || 'none'}; ${paneA} drawn ${backA.pane === null ? 'nowhere' : `${Math.round(backA.pane.width)} by ${Math.round(backA.pane.height)}`}, stored ${placeOf(paneA)})`,
  );
  // And ⤢ again puts it back.
  const unwiden = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${paneB}"] .pane-widen')`);
  await pointer(win, [...click(unwiden), { type: 'move', ...PARK }]);
  await delay(1200);
  const putBackB = await filledNow(paneB);
  record(
    deskCardsOf(store.getState(), prepared.id).every((c) => c.wide !== true) && atOwnSize(putBackB.pane, deskCard(paneB)) && putBackB.pressed === 'false' && putBackB.corner && placeOf(paneB) === placeB && (await js<number>(`document.querySelectorAll('.pane.wide').length`)) === 0,
    `⤢ on the filled document puts it back at the place and size the store kept for it (${placeOf(paneB)}, drawn ${putBackB.pane === null ? 'nowhere' : `${Math.round(putBackB.pane.width)} by ${Math.round(putBackB.pane.height)}`})`,
  );
  // A pane stored past the field's edge is drawn inside it (ISS-0058).
  // Drawing it there is for the screen only: the store keeps the place and
  // the size it was given. Until TASK-0104 the second half read "and no card
  // is drawn under it"; until FEAT-0020 the field was narrowed first, by the
  // reading column.
  const sizeBefore = deskCard(paneA);
  store.dispatch({ type: 'move-card', noteId: paneA, x: 3000, y: 120 });
  await delay(1500);
  const clamped = await js<{ left: string; right: number; fieldRight: number }>(`(() => {
    const pane = document.querySelector('.pane[data-note-id="${paneA}"]');
    return { left: pane.style.left, right: pane.getBoundingClientRect().right, fieldRight: document.getElementById('field').getBoundingClientRect().right };
  })()`);
  record(clamped.left !== '3000px' && clamped.right <= clamped.fieldRight + 1, `a pane stored past the field's edge is drawn inside it (at ${clamped.left})`);
  const sizeHeld = deskCard(paneA);
  record(
    sizeHeld !== undefined && sizeBefore !== undefined && sizeHeld.x === 3000 && sizeHeld.w === sizeBefore.w && sizeHeld.h === sizeBefore.h,
    `and the store still holds the place and the size it was given (${sizeHeld?.x}, ${sizeHeld?.w} by ${sizeHeld?.h})`,
  );
  store.dispatch({ type: 'move-card', noteId: paneA, x: movedA?.x ?? 16, y: movedA?.y ?? 16 });
  await delay(800);
  // The keyboard on a header moves the pane: sixteen pixels from where it is
  // DRAWN, so a document drawn inside a narrow field moves from where the
  // person sees it (TASK-0104; until then, from where it was stored).
  await js(`document.querySelector('.pane[data-note-id="${paneA}"] .pane-head').focus()`);
  const drawnLeft = await js<number>(`parseFloat(document.querySelector('.pane[data-note-id="${paneA}"]').style.left)`);
  press(win, 'Right');
  await delay(400);
  const afterKey = deskCard(paneA);
  record(afterKey !== undefined && afterKey.x === Math.round(drawnLeft) + 16, `an arrow key on a pane’s header moves it 16 px from where it is drawn (drawn at ${drawnLeft}, now stored at ${afterKey?.x})`);
  // A reload: the panes come back where they were, at the size they were.
  const kept = JSON.stringify(deskCardsOf(store.getState(), prepared.id));
  const paneView = store.getState().viewId;
  win.webContents.reload();
  await boot();
  // The reload reopens the address the window was created with, whose
  // view is Issues, and the panes are on the Features desk: a desk
  // belongs to its view (FEAT-0015). Back to that view, then compare.
  if (paneView !== null && store.getState().viewId !== paneView) await view(paneView);
  const restored = await js<Array<{ id: string; left: string; top: string; width: string; height: string }>>(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, left: p.style.left, top: p.style.top, width: p.style.width, height: p.style.height }))`);
  const stored = JSON.parse(kept) as Array<{ noteId: string; x: number; y: number; w?: number; h?: number }>;
  const matches = stored.every((c) => restored.some((r) => r.id === c.noteId && r.left === `${c.x}px` && r.top === `${c.y}px` && c.w !== undefined && r.width === `${c.w}px` && c.h !== undefined && r.height === `${c.h}px`));
  record(stored.length === 2 && matches, `after a reload every pane is where it was and the size it was (${restored.map((r) => `${r.id} ${r.left},${r.top} ${r.width} by ${r.height}`).join('; ')})`);
  // Spread shows the same notes at the same positions, in the view that holds them.
  await view('features');
  await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`);
  await delay(1200);
  const spread = await js<Array<{ id: string; left: string; top: string }>>(`[...document.querySelectorAll('#desk .card:not([hidden])')].map((c) => ({ id: c.dataset.noteId, left: c.style.left, top: c.style.top })) `);
  record(
    stored.every((c) => spread.some((s) => s.id === c.noteId && s.left === `${c.x}px` && s.top === `${c.y}px`)),
    `Spread shows the same desk at the same positions (${spread.map((s) => s.id).join(', ')})`,
  );
  // A click on a card lying under another brings it forward (ISS-0067):
  // a point of it that shows, and a point of it the other card covers.
  // The desk is scrolled to the cards first. A note opened in Glass stands
  // beside the collection since FEAT-0020, 368 px or more into the field, and
  // Spread's desk is narrower than that at this window's width: the cards are
  // on the desk and past its right edge until it is scrolled.
  const scrolled = await js<{ by: number; desk: number; cards: number[] }>(`(() => { const desk = document.getElementById('desk'); const cards = [...document.querySelectorAll('#desk .card:not([hidden])')]; const lefts = cards.map((c) => parseFloat(c.style.left) || 0); desk.scrollLeft = Math.max(0, Math.min(...lefts) - 24); desk.scrollTop = 0; return { by: desk.scrollLeft, desk: Math.round(desk.clientWidth), cards: lefts }; })()`);
  await delay(300);
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
    record(false, `two cards overlap in Spread, so bringing one forward can be checked (cards at ${scrolled.cards.join(' and ')} px on a desk ${scrolled.desk} px wide, scrolled ${scrolled.by} px)`);
  } else {
    await pointer(win, [...click(buried), { type: 'move', ...PARK }]);
    await delay(800);
    const over = await js<string | null>(`(() => { const e = document.elementFromPoint(${buried.cx}, ${buried.cy}); const c = e && e.closest('.card'); return c ? c.dataset.noteId : null; })()`);
    record(deskIds().at(-1) === buried.id && over === buried.id, `a click on a card lying under another brings it forward in Spread (${buried.id}: last on the desk ${deskIds().at(-1)}, drawn on top ${over}; the desk, ${scrolled.desk} px wide, was scrolled ${scrolled.by} px to the cards at ${scrolled.cards.join(' and ')} px)`);
  }
  // A card dragged in Spread is where it was dragged in Glass: one record.
  // The card the pointer will actually grab: in Spread two cards overlap,
  // and the one on top at a point is the one a press takes. The card
  // NOT on top is taken, so that it ending on top says something.
  const spreadCard = await js<{ x: number; y: number; id: string } | null>(`(() => { const top = ${JSON.stringify(deskIds().at(-1) ?? '')}; const cards = [...document.querySelectorAll('#desk .card:not([hidden])')].sort((a, b) => (a.dataset.noteId === top) - (b.dataset.noteId === top)); for (const c of cards) { const r = c.getBoundingClientRect(); for (let y = r.top + 10; y < r.bottom - 4; y += 6) { const x = r.left + 30; const hit = document.elementFromPoint(x, y); const top = hit && hit.closest('.card'); if (top === c && !hit.closest('.remove')) return { x, y, id: c.dataset.noteId }; } } return null; })()`);
  if (spreadCard !== null) {
    const was = deskCard(spreadCard.id);
    // A short drag, so the document it becomes in Glass is still inside the
    // field and is drawn at the place stored, not clamped to the edge.
    await pointer(win, drag(spreadCard, { x: spreadCard.x + 40, y: spreadCard.y + 60 }, 8));
    await delay(700);
    const now = deskCard(spreadCard.id);
    record(was !== undefined && now !== undefined && (now.x !== was.x || now.y !== was.y), `a card dragged in Spread moved in the store (${was?.x},${was?.y} to ${now?.x},${now?.y})`);
    record(deskIds().at(-1) === spreadCard.id, `and it is on top where it was dropped (${deskIds().at(-1)} last on the desk)`);
    await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
    await delay(1500);
    const pane = await js<{ left: string; top: string } | null>(`(() => { const p = document.querySelector('.pane[data-note-id="${spreadCard.id}"]'); return p ? { left: p.style.left, top: p.style.top } : null; })()`);
    record(now !== undefined && pane !== null && pane.left === `${now.x}px` && pane.top === `${now.y}px`, `and Glass holds it as a pane at that same place (${pane?.left}, ${pane?.top})`);
  } else {
    record(false, 'a card in Spread could be pressed, to drag it');
    await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`);
    await delay(1500);
  }
  record((await js<number>(`document.querySelectorAll('.pane').length`)) === stored.length, 'and switching back shows them held in Glass');
  // The corner dragged above is also the size the next note opened on this
  // view takes (ISS-0071, checked with the focus). Put back to the first-use
  // size, so the parts after this one open their notes at the size they expect.
  store.dispatch({ type: 'resize-card', noteId: paneA, w: 560, h: 520 });
  await delay(300);
}

/**
 * The keyboard route through the list, where the keyboard goes when a note is
 * opened and closed (FEAT-0020), and arriving at a note under reduced motion
 * (TASK-0033).
 */
async function recordKeys(kit: Kit): Promise<void> {
  const { ctx, win, js, record, deskIds, leave } = kit;
  const { store } = ctx;
  const active = (): Promise<Active> => js(`__t.active()`);
  await kit.fresh('issues');
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
  const rowBefore = await active();
  press(win, 'Return');
  await delay(1500);
  record(focusedRow !== null && deskIds().includes(focusedRow), `Tab, the arrow keys and Enter lift a note from the navigator (${focusedRow})`);
  record((await js<string | null>(`__t.glass().focusId()`)) === focusedRow, `and it is the focus, with what it is joined to gathered round it (FEAT-0017)`);

  // ---- FEAT-0020: where the keyboard is after a note is opened, and after it is closed ----
  // Until FEAT-0020 the keyboard stayed on the row and the text was read
  // beside the field. The text is in the document now, so a note opened with
  // the keyboard takes the keyboard to its document; L goes back to its row
  // and leaves it open; Delete closes it and goes back to the row.
  const onOpen = await active();
  record(onOpen.on === 'header' && onOpen.id === focusedRow, `Enter on a row puts the keyboard on the header of that note's document (it is on ${onOpen.on} of ${onOpen.id})`);
  press(win, 'l');
  await delay(600);
  const onL = await active();
  record(onL.on === 'row' && onL.id === focusedRow && deskIds().includes(focusedRow ?? ''), `L on the header goes back to its row and closes nothing (the keyboard is on ${onL.on} of ${onL.id}; held ${deskIds().join(', ') || 'nothing'})`);
  // The same row again: the open document is found, not opened twice, and takes the keyboard back.
  press(win, 'Return');
  await delay(900);
  const onAgain = await active();
  const panesFor = await js<number>(`document.querySelectorAll('.pane[data-note-id="${focusedRow}"]').length`);
  record(onAgain.on === 'header' && onAgain.id === focusedRow && panesFor === 1 && deskIds().length === 1, `Enter on the row of a note that is already open goes to its document and opens no second one (${panesFor} document, the keyboard on ${onAgain.on} of ${onAgain.id})`);
  press(win, 'Delete');
  await delay(900);
  const onClose = await active();
  record(
    !deskIds().includes(focusedRow ?? '') && rowBefore.on === 'row' && onClose.on === 'row' && onClose.id === focusedRow && Math.abs(onClose.top - rowBefore.top) <= 1,
    `Delete on the header closes the document and returns the keyboard to the row it was opened from, where that row stood before it was opened (held ${deskIds().join(', ') || 'nothing'}; the keyboard is on ${onClose.on} of ${onClose.id}, ${Math.round(onClose.top - rowBefore.top)} px from where it was)`,
  );
  // A pointer is not a keyboard: a row pressed with the pointer keeps the
  // keyboard, so the arrow keys go on down the list.
  const pressed = (await js<RowSeen[]>(`__t.rows()`)).find((r) => r.id !== focusedRow);
  if (pressed === undefined) {
    record(false, 'a row was in reach of the pointer, to press');
  } else {
    await pointer(win, [...click(pressed), { type: 'move', ...PARK }]);
    await delay(1300);
    const onPress = await active();
    record(deskIds().includes(pressed.id) && onPress.on === 'row' && onPress.id === pressed.id, `a row pressed with the pointer opens its note and leaves the keyboard on the row (held ${deskIds().join(', ') || 'nothing'}; the keyboard is on ${onPress.on} of ${onPress.id})`);
  }
  // The desk is swept for what follows, and the keyboard goes back to the first row opened.
  await leave(true);
  store.dispatch({ type: 'clear-desk', scope: 'workspace' });
  await delay(900);
  // The list stands in the field since FEAT-0020, and its keys are its own.
  // Left and Right on a row, and End and Home, which go to the last row and
  // the first, are not also the field's keys for turning by a step and for
  // facing behind and ahead. Arriving on a row may turn the field to show
  // that row's card, and it does so from the desk, so the list stays where
  // the person is working. So what is read is where the collection stands:
  // a key that was also the field's turns the field out from under the desk,
  // and the list slides aside or goes out of sight.
  await js(`(() => { const r = document.querySelector('#nav-list .nav-row[data-note-id="${focusedRow}"]'); if (r) r.focus(); return true; })()`);
  await delay(1300);
  const listWas = await kit.collection();
  const movedBy: string[] = [];
  let endRow: Active | null = null;
  for (const key of ['Right', 'Left', 'End', 'Home']) {
    press(win, key);
    await delay(1400);
    const now = await kit.collection();
    if (!now.shown || now.outOfSight || now.veil !== 0 || Math.abs(now.x - listWas.x) > 1) movedBy.push(`${key} (${now.shown ? `${Math.round(now.x - listWas.x)} px, veil ${now.veil.toFixed(2)}` : 'out of sight'})`);
    if (key === 'End') endRow = await active();
  }
  const homeRow = await active();
  const inList = (a: Active | null): boolean => a !== null && (a.on === 'row' || /nav-group/.test(a.on));
  record(
    movedBy.length === 0 && Math.abs(listWas.x - 12) < 1 && inList(endRow) && inList(homeRow) && (endRow?.top ?? 0) > homeRow.top,
    `Left, Right, End and Home pressed on a row are the list's keys and not also the field's: the collection stays in front where it stood after each (${movedBy.join(', ') || 'none moved it'}), End having gone to the end of the list and Home to its start (${endRow === null ? 'no row' : `${Math.round(endRow.top)} then ${Math.round(homeRow.top)} px down the window`})`,
  );
  await kit.face(0);
  await delay(300);
  await js(`(() => { const r = document.querySelector('#nav-list .nav-row[data-note-id="${focusedRow}"]'); if (r) r.focus(); return true; })()`);
  // Reduced motion: arriving is a highlight, not a flight. Let the field
  // settle first: a turn still going made the cut check below fail once (ISS-0065).
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
  // No flight: the yaw is already where it ends up, and stays there.
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
}

/** A view switch keeps each note's element, a change arriving is held until the person acts, and reduced motion cuts (TASK-0032, ISS-0061). */
async function recordSwitch(kit: Kit): Promise<void> {
  const { ctx, win, js, record, view } = kit;
  const { store, prepared, skip } = ctx;
  await kit.fresh('issues');

  // ---- TASK-0032: a view switch keeps each note's element ----
  // No two of this repository's views hold the same note, and until TASK-0104
  // this check leaned on a held note's neighbourhood being dealt into the
  // front band of both. Nothing is dealt forward now. What IS drawn on both
  // sides of a switch is a card gathered round the focused document that the
  // other view holds: an issue's neighbours include features, so with an
  // issue in focus on Issues, those features are cards at their seats, and
  // on Features they are the same elements in their own slots.
  // The issue is kept on every view, so it is still held when the store's
  // view changes, which Glass hears before the new view's notes arrive.
  // Without that the desk is empty for a moment, the focus is dropped, and
  // the cards round it are removed and made again for the new view.
  const anchor = (await js<Seen[]>(`__t.visibleCards('front')`))[0];
  if (anchor !== undefined) {
    await pointer(win, [...click(anchor), { type: 'move', ...PARK }]);
    await delay(2000);
    store.dispatch({ type: 'set-every-view', noteId: anchor.id, on: true });
    await delay(600);
  }
  await js(`document.querySelectorAll('.field-card').forEach((e) => { e.__deckMark = e.dataset.noteId; e.__deckAt = e.style.transform; })`);
  const marked = await js<Array<{ id: string; seated: boolean }>>(`[...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => ({ id: e.dataset.noteId, seated: e.classList.contains('seated') }))`);
  // The switch is watched from the click until its movement is over, so the
  // click is made here and not through `view`, which waits for the deal to
  // finish. Until FEAT-0020's smoke this was one reading 400 ms after the
  // click, which is before the new view's notes have arrived when the
  // machine is slow, and read as a cut on a switch that then animated.
  const watching = js<{ delays: string[]; frames: number; first: number }>(`new Promise((resolve) => { const f = document.getElementById('field'); const t0 = performance.now(); const out = { delays: [], frames: 0, first: -1 }; const look = () => { if (f.classList.contains('animate')) { if (out.frames === 0) { out.first = Math.round(performance.now() - t0); out.delays = [...new Set([...document.querySelectorAll('.field-card')].map((e) => getComputedStyle(e).transitionDelay))]; } out.frames += 1; } if (performance.now() - t0 < 1900) requestAnimationFrame(look); else resolve(out); }; look(); })`);
  await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
  const during = await watching;
  record(during.frames > 0 && during.delays.every((d) => d.split(',').every((x) => parseFloat(x) === 0)), `the cards move together, with no per-card delay (${during.delays.join(' ') || 'no moving frame was seen'})`);
  record(during.frames > 1 && during.first >= 0, `the switch is a transition, not a cut (the field was animating for ${during.frames} frames, from ${during.first} ms after the click)`);
  const kept = await js<{ same: string[]; other: number; moved: number }>(`(() => {
    const same = []; let other = 0, moved = 0;
    for (const e of document.querySelectorAll('.field-card:not(.leaving)')) {
      if (e.__deckMark === undefined) continue;
      if (e.__deckMark === e.dataset.noteId) same.push(e.dataset.noteId); else other += 1;
      if (e.__deckAt !== e.style.transform) moved += 1;
    }
    return { same, other, moved };
  })()`);
  record(kept.other === 0, `no element was reused for a different note (${kept.other})`);
  if (marked.filter((m) => m.seated).length === 0) {
    record(false, `a note was in focus on Issues with cards gathered round it, so something is drawn in both views (${anchor?.id ?? 'no front card to lift'})`);
  } else if (kept.same.length === 0) {
    // Not a failure of the renderer: with nothing drawn in both views there is nothing to keep.
    skip(`the notes in both views keep their elements: none of the ${marked.length} cards drawn on Issues round ${anchor?.id} is a note the Features view holds`);
  } else {
    record(kept.same.length > 0, `the notes drawn in both views kept their elements across the switch (${kept.same.length} of ${marked.length}: the cards gathered round ${anchor?.id} that Features also holds, ${kept.same.slice(0, 4).join(', ')})`);
    record(kept.moved === kept.same.length, `and moved from their seats to their own places (${kept.moved})`);
  }
  await kit.fresh('issues');
  await delay(400);
  // The real path of a change arriving mid-view (ISS-0063): Deck's index
  // moves on, the renderer reads the view again, and the one read it makes
  // is answered with one note changed. Nothing is written to the workspace.
  const stay = (await js<Seen[]>(`__t.visibleCards()`))[0];
  if (stay === undefined) {
    record(false, 'a card was in sight on Issues, for a change to arrive under');
  } else {
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
    // The collection says the same thing in its own words, with the same
    // offer (FEAT-0020): what changed, and "apply". Its count is still the
    // count of what is on screen, which has not changed yet.
    const waiting = await js<{ note: string; apply: number; count: string }>(`({ note: __t.shown('#collection-note') ? __t.text('#collection-note') : '', apply: [...document.querySelectorAll('#collection-note button')].filter((b) => b.textContent === 'apply').length, count: __t.text('#collection-count') })`);
    record(/^1 note changed: 1 changed/.test(waiting.note) && waiting.apply === 1, `and the collection says what is waiting and offers to apply it ("${waiting.note}", ${waiting.apply} apply button)`);
    if (chip.where !== null) {
      await pointer(win, click(chip.where));
      await delay(1500);
      const applied = await js<{ chip: boolean; status: string | null; note: boolean }>(`({ chip: __t.shown('#pending-chip'), status: (__t.glass().entryFor(${JSON.stringify(stay.id)}) || { card: {} }).card.status || null, note: __t.shown('#collection-note') })`);
      record(!applied.chip && !applied.note, `the chip went when the person clicked it, and so did the collection's line (${applied.note ? 'still shown' : 'gone'})`);
      record(applied.status === 'smoke-changed', `and the change was dealt: ${stay.id} now has the status that arrived (${applied.status})`);
    }
  }

  // ---- ISS-0061: under reduced motion a view switch highlights the note a person was on ----
  await js(`window.__deckReducedMotion = true`);
  const focusRow = await js<string | null>(`(() => { const r = document.querySelector('#nav-list .nav-row:not([hidden])'); if (!r) return null; return r.dataset.noteId; })()`);
  if (focusRow === null) {
    record(false, 'the navigator had a row, to be on across a view switch');
  } else {
    store.dispatch({ type: 'focus-note', noteId: focusRow });
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
    await delay(1500);
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'issues').click()`);
    let lit = { card: false, row: false, animate: true };
    for (let i = 0; i < 20 && !(lit.card || lit.row); i += 1) {
      await delay(100);
      lit = await js<typeof lit>(`({ card: !!document.querySelector('.field-card.highlight[data-note-id="${focusRow}"]'), row: !!document.querySelector('.nav-row.highlight[data-note-id="${focusRow}"]'), animate: document.getElementById('field').classList.contains('animate') })`);
    }
    record(lit.row && lit.card && !lit.animate, `under reduced motion a view switch is a cut and highlights the note a person was on, its row and its card (${focusRow}: row ${lit.row}, card ${lit.card})`);
  }
  await js(`window.__deckReducedMotion = false`);
  await delay(1200);
}

/** An address copied in Glass restores the view, the surface and the note; one that names Spread opens on the desk (TASK-0033). */
async function recordAddress(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record } = kit;
  const { store, prepared } = ctx;
  await kit.fresh('issues');
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
}

/**
 * FEAT-0017 with a real pointer, as TASK-0104 left it: an opened note is ONE
 * object, a document at the size a person chose, and the notes it is joined
 * to are the field's own cards moved to seats round it.
 *
 * Until TASK-0104 this part asserted the opposite on five counts, and each is
 * replaced here by the rule that took its place (ISS-0070, ISS-0071, ISS-0072):
 *
 * - a dashed ghost in the lifted note's slot      → no element at all for a held note
 * - up to 16 copies, 168 by 44, then "+N more"    → every neighbour's own card, at browsing size
 * - the pane sized by the ring                    → the document at its stored place and size
 * - other held notes waiting in a dock            → every document drawn whole where it is stored
 * - a drag of the header leaves and re-deals      → a drag carries the neighbourhood, and deals nothing
 *
 * Its own part, reset at its start.
 */
async function recordFocus(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record, view, deskIds } = kit;
  const { store, prepared, skip } = ctx;
  const ws = prepared.id;
  type Focus = { noteId: string | null; pane: { left: number; top: number; width: number; height: number } | null; seated: Array<{ id: string; x: number; y: number; inSight: boolean }>; neighbours: number; lines: number; pan: { x: number; y: number }; bearing: number };
  type Rect = { left: number; top: number; right: number; bottom: number };
  const focus = (): Promise<Focus> => js(`__t.glass().focusState()`);
  const stored = (id: string): { noteId: string; x: number; y: number; w?: number; h?: number } | undefined => deskCardsOf(store.getState(), ws).find((c) => c.noteId === id);
  const pane = (id: string): Promise<PaneSeen | null> => js(`__t.pane(${JSON.stringify(id)})`);
  const seatedNow = (): Promise<Seated[]> => js(`__t.seated()`);
  const fieldBox = (): Promise<Rect & { width: number; height: number }> => js(`__t.rect('#field')`);
  /** The size the view's next note opens at: what a corner last chose here, else the first-use size. */
  const readingSize = (viewId: string): { w: number; h: number } => store.getState().readingSizes[ws]?.[viewId] ?? { w: 560, h: 520 };
  const escape = async (): Promise<void> => {
    ctx.focusApp(win);
    await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
    press(win, 'Escape');
    await delay(700);
  };
  const frontCard = async (not: string[] = []): Promise<Seen | null> => (await js<Seen[]>(`__t.visibleCards('front')`)).find((c) => !not.includes(c.id)) ?? null;
  const neighboursOf = (id: string): Promise<{ linked: string[]; backlinks: string[] }> =>
    js(`window.__deckGlass.hooks.context(${JSON.stringify(id)}).then((c) => ({ linked: [...new Set(c.linked.map((i) => i.id))].filter((x) => x !== ${JSON.stringify(id)}), backlinks: [...new Set(c.backlinks.map((i) => i.id))].filter((x) => x !== ${JSON.stringify(id)}) }))`);
  const hits = (a: Rect, b: Rect): boolean => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  /** Each seated card's place measured from the document's corner: what a drag must not change. */
  const offsetsOf = (f: Focus): Map<string, { x: number; y: number }> => new Map(f.pane === null ? [] : f.seated.map((s) => [s.id, { x: s.x - (f.pane as { left: number }).left, y: s.y - (f.pane as { top: number }).top }]));
  const sameOffsets = (a: Focus, b: Focus): { same: boolean; moved: string[] } => {
    const before = offsetsOf(a);
    const after = offsetsOf(b);
    const moved = [...before].filter(([id, o]) => { const n = after.get(id); return n === undefined || Math.abs(n.x - o.x) > 0.5 || Math.abs(n.y - o.y) > 0.5; }).map(([id]) => id);
    return { same: before.size > 0 && before.size === after.size && moved.length === 0, moved };
  };
  /** A point of a document that the pointer reaches: its header if that shows, else any part of it that does. */
  const pointOn = (id: string): Promise<{ x: number; y: number; part: string } | null> =>
    js(`(() => { const p = document.querySelector('.pane[data-note-id="${id}"]'); if (!p) return null; const f = document.getElementById('field').getBoundingClientRect();
      const own = (x, y) => { if (x < f.left + 2 || x > f.right - 2 || y < f.top + 2 || y > f.bottom - 2) return false; const e = document.elementFromPoint(x, y); return !!e && e.closest('.pane') === p && !e.closest('button, a'); };
      const h = p.querySelector('.pane-id').getBoundingClientRect(); if (own(h.left + h.width / 2, h.top + h.height / 2)) return { x: h.left + h.width / 2, y: h.top + h.height / 2, part: 'header' };
      const r = p.getBoundingClientRect(); for (let y = r.top + 44; y < r.bottom - 8; y += 12) for (let x = r.right - 10; x > r.left + 8; x -= 12) if (own(x, y)) return { x, y, part: 'body' }; return null; })()`);
  /** The middle of a control, scrolled into view inside its list first. */
  const control = (selector: string): Promise<{ x: number; y: number } | null> =>
    js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return at && (at === e || e.contains(at)) ? { x, y } : null; })()`);
  const around = (p: { x: number; y: number }, c: { x: number; y: number }): number => { const a = Math.atan2(p.y - c.y, p.x - c.x); return a < 0 ? a + 2 * Math.PI : a; };
  const cyclic = (ids: string[]): string => {
    if (ids.length === 0) return '';
    const first = [...ids].sort()[0] as string;
    const i = ids.indexOf(first);
    return [...ids.slice(i), ...ids.slice(0, i)].join(' ');
  };
  const px = (n: number): string => String(Math.round(n * 10) / 10);

  await kit.fresh('issues');
  try {
    // The size a card is browsed at: the front-band card straight ahead, the
    // narrowest one drawn, before anything is opened.
    const browse = await js<{ width: number; height: number } | null>(`(() => { const cs = [...document.querySelectorAll('.field-card[data-band="front"]:not(.leaving)')].map((e) => e.getBoundingClientRect()).sort((a, b) => a.width - b.width); return cs[0] ? { width: cs[0].width, height: cs[0].height } : null; })()`);
    // A note with links both ways, so there is a solid line and a dashed one
    // to check, and few enough neighbours that most seats are in the field.
    const pick = await js<string | null>(`(async () => {
      const g = window.__deckGlass;
      for (const c of __t.visibleCards().slice(0, 16)) {
        const ctx = await g.hooks.context(c.id).catch(() => null);
        if (!ctx) continue;
        const out = new Set(ctx.linked.map((i) => i.id).filter((x) => x !== c.id));
        const inn = new Set(ctx.backlinks.map((i) => i.id).filter((x) => x !== c.id));
        const all = new Set([...out, ...inn]);
        if ([...inn].some((x) => !out.has(x)) && [...out].some((x) => !inn.has(x)) && all.size >= 6 && all.size <= 24) return c.id;
      }
      return null;
    })()`);
    const card = (await js<Seen[]>(`__t.visibleCards()`)).find((c) => c.id === pick) ?? (await frontCard());
    if (card === null) {
      record(false, 'focus: a card was in sight to open');
      return;
    }
    const known = await neighboursOf(card.id);
    const all = new Set([...known.linked, ...known.backlinks]);
    const box = await fieldBox();
    // The field before anything is opened: where every card is drawn, the
    // deal, and which way the person faces. Leaving the focus must give all
    // three back.
    const fieldBefore = await js<{ cards: Record<string, string>; slots: string; front: string[]; yaw: number }>(`({ cards: __t.cardsAt(), slots: __t.slots(), front: __t.frontIds(), yaw: __t.yaw() })`);
    const expected = readingSize('issues');

    // ---- 1. The document opens from the card that was pressed, in 300 ms ----
    // The opening is the browser's own animation of the document, so what it
    // starts from and how long it runs are read from the animation itself
    // rather than guessed from one frame: a frame taken 110 ms in says more
    // about the box's software rendering than about the renderer.
    const watch = js<{ anim: { from: string; duration: number } | null; opening: boolean; gather: boolean; frames: number }>(`new Promise((resolve) => {
      const t0 = performance.now(); const out = { anim: null, opening: false, gather: false, frames: 0 };
      const look = () => {
        out.frames += 1;
        const p = document.querySelector('.pane[data-note-id="${card.id}"]');
        if (document.getElementById('field').classList.contains('gather')) out.gather = true;
        if (window.__deckGlass.isOpening()) out.opening = true;
        if (p && !out.anim) for (const a of p.getAnimations()) { const k = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []; if (k[0] && /^translate/.test(k[0].transform || '')) out.anim = { from: k[0].transform, duration: a.effect.getTiming().duration }; }
        if (performance.now() - t0 < 1900) requestAnimationFrame(look); else resolve(out);
      };
      look();
    })`);
    await pointer(win, [...click(card), { type: 'move', ...PARK }]);
    const seen = await watch;
    await delay(300);
    const settled = await focus();
    const drawn = await pane(card.id);
    const from = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\((-?[\d.]+), (-?[\d.]+)\)/.exec(seen.anim?.from ?? '');
    const start = from === null || drawn === null ? null : { left: drawn.left + Number(from[1]), top: drawn.top + Number(from[2]), width: drawn.width * Number(from[3]), height: drawn.height * Number(from[4]) };
    const fromCard = start !== null && Math.abs(start.left - card.left) <= 2 && Math.abs(start.top - card.top) <= 2 && Math.abs(start.width - (card.right - card.left)) <= 2 && Math.abs(start.height - (card.bottom - card.top)) <= 2;
    const after = await js<{ opening: boolean; gather: boolean }>(`({ opening: __t.glass().isOpening(), gather: document.getElementById('field').classList.contains('gather') })`);
    record(
      fromCard && seen.anim?.duration === 300 && seen.opening && seen.gather && !after.opening && !after.gather,
      `the document opens from the card that was pressed, over ${seen.anim?.duration ?? 'no'} ms, and the cards gather while it does: it starts ${start === null ? 'nowhere' : `${px(start.left - card.left)}, ${px(start.top - card.top)} px from the card at ${px(start.width)} by ${px(start.height)}`} (the card is ${px(card.right - card.left)} by ${px(card.bottom - card.top)}), and two seconds on nothing is still moving (opening ${after.opening}, gathering ${after.gather})`,
    );

    // ---- 2. It stands at its stored place, at the size the person chose ----
    const kept = stored(card.id);
    const atStored =
      settled.noteId === card.id && drawn !== null && kept !== undefined && drawn.focus &&
      Math.abs(drawn.left - box.left - kept.x) < 0.5 && Math.abs(drawn.top - box.top - kept.y) < 0.5 && drawn.width === kept.w && drawn.height === kept.h;
    // Until FEAT-0020 it stood across the middle of the field. The collection
    // stands down the left of the field now, so a new document is centred in
    // the room beside it: 16 px clear of the collection and of the field's
    // right edge, and so never over the list it was opened from.
    const list = await kit.collection();
    const room = { left: list.right + 16, right: box.right - 16 };
    const across = drawn === null ? Infinity : Math.abs(drawn.left + drawn.width / 2 - (room.left + room.right) / 2);
    const clearOfList = drawn !== null && drawn.left >= list.right + 15;
    record(
      atStored && kept?.w === expected.w && kept?.h === expected.h && across <= 1 && clearOfList && Math.abs(list.x - 12) < 1 && list.w === 340,
      `the document is the focus and is drawn where the store holds it, at the size stamped when it opened: ${px(drawn?.width ?? 0)} by ${px(drawn?.height ?? 0)} on screen, ${kept?.w} by ${kept?.h} stored at ${kept?.x},${kept?.y}, the view's reading size being ${expected.w} by ${expected.h}; it stands across the middle of the room the collection leaves (${px(across)} px off), ${px((drawn?.left ?? 0) - list.right)} px clear of the list`,
    );

    // ---- 3. One object per note: its own cards, every one, at browsing size ----
    const seats = await seatedNow();
    const paneBox = drawn ?? { left: 0, top: 0, right: 0, bottom: 0 };
    const old = await js<{ ghosts: number; ringCards: number; ringMore: number; ring: boolean; docked: number; held: number; twice: string[] }>(`({ ghosts: document.querySelectorAll('.ghost').length, ringCards: document.querySelectorAll('.ring-card').length, ringMore: document.querySelectorAll('.ring-more').length, ring: !!document.getElementById('field-ring'), docked: document.querySelectorAll('.pane.docked').length, held: __t.drawn(${JSON.stringify(card.id)}), twice: __t.twice() })`);
    record(
      old.held === 0 && old.twice.length === 0 && old.ghosts === 0 && old.ringCards === 0 && old.ringMore === 0 && !old.ring && old.docked === 0,
      `one note is one object: no card is drawn for the open note (${old.held}), no note is drawn twice (${old.twice.join(', ') || 'none'}), and there is no ghost (${old.ghosts}), no copy on a ring (${old.ringCards}) and no "+N more" (${old.ringMore})`,
    );
    const seatedIds = seats.map((s) => s.id).sort();
    const missing = [...all].filter((id) => !seatedIds.includes(id));
    const extra = seatedIds.filter((id) => !all.has(id));
    const overPane = seats.filter((s) => hits(s, paneBox)).map((s) => s.id);
    const overEach = seats.filter((s, i) => seats.some((n, j) => j > i && hits(s, n))).map((s) => s.id);
    record(
      seats.length > 0 && missing.length === 0 && extra.length === 0 && settled.neighbours === all.size && settled.seated.length === all.size && overPane.length === 0 && overEach.length === 0,
      `every neighbour is seated round the document, each once, none over the document or another card (${seats.length} seated of ${all.size} neighbours; missing ${missing.join(', ') || 'none'}; over the document ${overPane.join(', ') || 'none'}; over another ${overEach.join(', ') || 'none'})`,
    );
    const widths = seats.map((s) => s.width);
    const offSize = seats.filter((s) => browse === null || Math.abs(s.width - browse.width) > 0.6 || Math.abs(s.height - browse.height) > 0.6).map((s) => s.id);
    record(
      browse !== null && seats.length > 0 && offSize.length === 0,
      `a seated card is the size a card is browsed at: ${px(Math.min(...widths))} to ${px(Math.max(...widths))} px wide against ${px(browse?.width ?? 0)} by ${px(browse?.height ?? 0)} for the front-band card straight ahead, not the 168 by 44 of a copy (${offSize.length} of another size)`,
    );
    const inSight = seats.filter((s) => s.inSight);
    const reported = settled.seated.filter((s) => s.inSight).length;
    record(inSight.length > 0 && reported === inSight.length && inSight.every((s) => s.right > box.left && s.left < box.right && s.bottom > box.top && s.top < box.bottom), `the seated cards in the field take the pointer and the rest do not (${inSight.length} in sight of ${seats.length}; Glass reports ${reported})`);

    // ---- 5. A line to each: solid for a link it makes, dashed for a link made to it ----
    type Line = { id: string; from: string; kind: string | undefined; shared: boolean; dashed: boolean };
    const linesNow = (): Promise<Line[]> => js(`[...document.querySelectorAll('#field-lines .link-line')].map((l) => ({ id: l.dataset.noteId, from: l.dataset.from, kind: ['out', 'in', 'both'].find((k) => l.classList.contains(k)), shared: l.classList.contains('shared'), dashed: getComputedStyle(l).strokeDasharray !== 'none' }))`);
    const lines = await linesNow();
    const wrong = lines.filter((l) => {
      const out = known.linked.includes(l.id);
      const inn = known.backlinks.includes(l.id);
      const want = out && inn ? 'both' : out ? 'out' : 'in';
      return l.kind !== want || l.dashed !== (want === 'in') || l.from !== card.id;
    });
    const dashed = lines.filter((l) => l.dashed).length;
    record(
      lines.length === seats.length && lines.length === settled.lines && new Set(lines.map((l) => l.id)).size === lines.length && wrong.length === 0 && dashed > 0 && dashed < lines.length,
      `a line runs from the document to each seated card, solid for a link it makes and dashed for a link made to it (${card.id}: ${lines.length} lines for ${seats.length} cards, ${dashed} dashed, ${wrong.length} of the wrong kind)`,
    );

    // ---- 6. Resting on a line shows the link and its sentence ----
    // A whole-pixel point on the longest line that the pointer would hit: a
    // line is 1.4 pixels wide and passes under the cards, so several points
    // along it are tried.
    // The lines are kept in the desk's own coordinates and the drawing is
    // moved by the desk's shift (TASK-0099), so a line's ends are measured
    // from the drawing, which carries that shift, not from its layer.
    const longest = await js<{ x: number; y: number; id: string } | null>(`(() => { const f = document.querySelector('#field-lines .link-lines').getBoundingClientRect(); const field = document.getElementById('field').getBoundingClientRect(); let best = null; for (const l of document.querySelectorAll('#field-lines .link-line')) { const x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('x2'), y2 = +l.getAttribute('y2'); const len = Math.hypot(x2 - x1, y2 - y1); for (let t = 0.02; t <= 0.98; t += 0.02) { const x = Math.round(f.left + x1 + (x2 - x1) * t), y = Math.round(f.top + y1 + (y2 - y1) * t); if (x < field.left + 2 || x > field.right - 2 || y < field.top + 2 || y > field.bottom - 2) continue; if (document.elementFromPoint(x, y) !== l) continue; if (!best || len > best.len) best = { x, y, id: l.dataset.noteId, len }; break; } } return best; })()`);
    if (longest === null) {
      record(false, 'focus: a line was clear of the cards to rest on');
    } else {
      await pointer(win, [{ type: 'move', x: longest.x, y: longest.y, wait: 1500 }]);
      const callout = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#edge-callout'), text: __t.text('#edge-callout') })`);
      record(callout.shown && callout.text.includes('→') && callout.text.includes(longest.id) && callout.text.includes(card.id) && callout.text.length > longest.id.length + card.id.length + 8, `resting on the line to ${longest.id} shows which way the link runs and its sentence ("${callout.text.slice(0, 90)}")`);
      await pointer(win, [{ type: 'move', ...PARK }]);
      await delay(200);
    }

    // ---- 11. A broadcast while a note is the focus moves nothing ----
    // The field is dealt again on every broadcast, the same deal each time.
    // What a person would notice is a card moving, so that is what is read:
    // the deal, where each card in its slot is drawn, and each card's seat.
    // Until TASK-0104 this read the count of deals, which now rises by one
    // per broadcast and says nothing either way.
    const steady = await js<{ cards: Record<string, string>; slots: string; assignments: number }>(`({ cards: __t.cardsAt(), slots: __t.slots(), assignments: __t.assignments() })`);
    const focusBefore = await focus();
    store.dispatch({ type: 'set-fold', key: 'smoke-focus', folded: true });
    await delay(500);
    store.dispatch({ type: 'set-fold', key: 'smoke-focus', folded: false });
    await delay(500);
    const steadyAfter = await js<{ cards: Record<string, string>; slots: string; assignments: number }>(`({ cards: __t.cardsAt(), slots: __t.slots(), assignments: __t.assignments() })`);
    const focusAfter = await focus();
    const drifted = Object.keys(steady.cards).filter((id) => steady.cards[id] !== steadyAfter.cards[id]);
    record(
      steadyAfter.slots === steady.slots && drifted.length === 0 && Object.keys(steady.cards).length === Object.keys(steadyAfter.cards).length && sameOffsets(focusBefore, focusAfter).same && focusAfter.noteId === card.id,
      `two broadcasts while a note is the focus move nothing: the same deal, ${Object.keys(steady.cards).length} cards where they were (${drifted.join(', ') || 'none moved'}), and every seat where it was (the field was dealt ${steadyAfter.assignments - steady.assignments} times, each time the same)`,
    );

    // ---- 7. A drag of the header moves the document and carries its neighbourhood ----
    const head = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${card.id}"] .pane-id')`);
    const before = await focus();
    const paneBefore = await pane(card.id);
    const storedBefore = JSON.stringify(stored(card.id));
    const dealtBefore = await js<number>(`__t.assignments()`);
    // Pressed and moved, and not let go: the drag is read while it is held.
    await pointer(win, [{ type: 'move', ...head }, { type: 'down', ...head }, ...[1, 2, 3, 4, 5, 6].map((i) => ({ type: 'move' as const, x: head.x + 15 * i, y: head.y + 10 * i, wait: 30 }))]);
    await delay(150);
    const mid = await focus();
    const paneMid = await pane(card.id);
    const midState = await js<{ dragging: boolean; assignments: number; cards: Record<string, string> }>(`({ dragging: document.querySelector('.pane[data-note-id="${card.id}"]').classList.contains('dragging'), assignments: __t.assignments(), cards: __t.cardsAt() })`);
    const midMoved = Object.keys(steadyAfter.cards).filter((id) => steadyAfter.cards[id] !== midState.cards[id]);
    record(
      mid.noteId === card.id && midState.dragging && paneMid !== null && paneBefore !== null && Math.abs(paneMid.left - paneBefore.left - 90) < 1 && Math.abs(paneMid.top - paneBefore.top - 60) < 1 &&
        paneMid.width === paneBefore.width && paneMid.height === paneBefore.height && sameOffsets(before, mid).same && midState.assignments === dealtBefore && midMoved.length === 0 && JSON.stringify(stored(card.id)) === storedBefore,
      `while the header is dragged 90 by 60 the document follows the pointer at the same size (${px((paneMid?.left ?? 0) - (paneBefore?.left ?? 0))}, ${px((paneMid?.top ?? 0) - (paneBefore?.top ?? 0))}; ${px(paneMid?.width ?? 0)} by ${px(paneMid?.height ?? 0)}), it is still the focus (${mid.noteId}), every seated card keeps its place beside it (${sameOffsets(before, mid).moved.join(', ') || 'none shifted'}), no other card moves (${midMoved.join(', ') || 'none'}) and nothing is dealt (${midState.assignments - dealtBefore})`,
    );
    // Escape during the drag puts the document back, and does nothing else:
    // it does not leave the focus and it does not sweep (decision 10).
    ctx.focusApp(win);
    press(win, 'Escape');
    await delay(300);
    await pointer(win, [{ type: 'up', x: head.x + 90, y: head.y + 60 }, { type: 'move', ...PARK }]);
    await delay(500);
    const back = await focus();
    const paneBack = await pane(card.id);
    record(
      back.noteId === card.id && deskIds().includes(card.id) && paneBack !== null && paneBefore !== null && Math.abs(paneBack.left - paneBefore.left) < 0.5 && Math.abs(paneBack.top - paneBefore.top) < 0.5 && JSON.stringify(stored(card.id)) === storedBefore && sameOffsets(before, back).same,
      `Escape during a drag puts the document back where it was (${px((paneBack?.left ?? 0) - (paneBefore?.left ?? 0))}, ${px((paneBack?.top ?? 0) - (paneBefore?.top ?? 0))} px off), keeps the focus (${back.noteId}) and the desk (${deskIds().join(', ')}), and the store's place is untouched`,
    );
    // And a drag that is let go: the store has the new place, the size is the
    // size, the focus is the focus, and the neighbourhood went with it.
    const head2 = await js<{ x: number; y: number }>(`__t.rect('.pane[data-note-id="${card.id}"] .pane-id')`);
    await pointer(win, [...drag(head2, { x: head2.x + 90, y: head2.y + 50 }, 10), { type: 'move', ...PARK }]);
    await delay(700);
    const moved = await focus();
    const paneMoved = await pane(card.id);
    const storedMoved = stored(card.id);
    const movedState = await js<{ cards: Record<string, string>; slots: string }>(`({ cards: __t.cardsAt(), slots: __t.slots() })`);
    const unrelated = Object.keys(steadyAfter.cards);
    const movedCards = unrelated.filter((id) => steadyAfter.cards[id] !== movedState.cards[id]);
    record(
      moved.noteId === card.id && kept !== undefined && storedMoved !== undefined && storedMoved.x === kept.x + 90 && storedMoved.y === kept.y + 50 && storedMoved.w === kept.w && storedMoved.h === kept.h &&
        paneMoved !== null && paneBefore !== null && Math.abs(paneMoved.left - paneBefore.left - 90) < 0.5 && Math.abs(paneMoved.top - paneBefore.top - 50) < 0.5 && paneMoved.width === paneBefore.width && paneMoved.height === paneBefore.height,
      `a drag of its header moves the document 90 by 50 in the store (${kept?.x},${kept?.y} to ${storedMoved?.x},${storedMoved?.y}) and on screen, keeps the focus (${moved.noteId}: until TASK-0104 a drag left it) and changes no size (${px(paneMoved?.width ?? 0)} by ${px(paneMoved?.height ?? 0)}, stored ${storedMoved?.w} by ${storedMoved?.h})`,
    );
    record(
      sameOffsets(before, moved).same && moved.seated.length === all.size,
      `every seated card keeps its place beside the document through the drag (${moved.seated.length} cards; ${sameOffsets(before, moved).moved.join(', ') || 'none shifted'})`,
    );
    record(
      unrelated.length > 0 && movedCards.length === 0 && movedState.slots === steady.slots,
      `no card outside the neighbourhood moves because the document did: ${unrelated.length} cards are drawn exactly where they were (${movedCards.join(', ') || 'none moved'}) and the deal is the same deal`,
    );

    // ---- 9. Escape leaves the focus: the cards go back, the documents stay ----
    await escape();
    await delay(600);
    const left = await focus();
    const paneLeft = await pane(card.id);
    const fieldLeft = await js<{ cards: Record<string, string>; slots: string; front: string[]; yaw: number; seated: number; lines: number; focusing: boolean }>(`({ cards: __t.cardsAt(), slots: __t.slots(), front: __t.frontIds(), yaw: __t.yaw(), seated: document.querySelectorAll('.field-card.seated:not(.leaving)').length, lines: document.querySelectorAll('#field-lines .link-line').length, focusing: document.getElementById('field').classList.contains('focusing') })`);
    const wasDrawn = Object.keys(fieldBefore.cards).filter((id) => id !== card.id);
    const notBack = wasDrawn.filter((id) => fieldLeft.cards[id] !== fieldBefore.cards[id]);
    const strays = Object.keys(fieldLeft.cards).filter((id) => !(id in fieldBefore.cards));
    record(
      left.noteId === null && paneLeft !== null && !paneLeft.focus && deskIds().join() === card.id && fieldLeft.seated === 0 && fieldLeft.lines === 0 && !fieldLeft.focusing,
      `Escape leaves the focus and keeps the document: ${card.id} is still held and drawn, no card is at a seat (${fieldLeft.seated}) and no line is drawn (${fieldLeft.lines})`,
    );
    record(
      wasDrawn.length > 0 && notBack.length === 0 && strays.length === 0 && fieldLeft.slots === fieldBefore.slots && fieldLeft.front.join() === fieldBefore.front.join() && Math.abs(fieldLeft.yaw - fieldBefore.yaw) < 1e-9,
      `leaving the focus deals nothing and turns nothing: all ${wasDrawn.length} cards drawn before the note was opened are back exactly where they stood (${notBack.join(', ') || 'none out of place'}), no card was added (${strays.join(', ') || 'none'}), the front band holds what it held (${fieldLeft.front.join(', ')}), and the field faces where it faced`,
    );

    // ---- 8. The size is the size: open, drag, Escape, Enter ----
    ctx.focusApp(win);
    await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus(); true`);
    press(win, 'Return');
    await delay(1300);
    const again = await focus();
    const paneAgain = await pane(card.id);
    const sizes = [drawn, paneMid, paneMoved, paneLeft, paneAgain].map((p) => (p === null ? 'none' : `${p.width}x${p.height}`));
    record(
      again.noteId === card.id && again.seated.length === all.size && new Set(sizes).size === 1 && sizes[0] === `${expected.w}x${expected.h}`,
      `Enter on its header makes ${card.id} the focus again with its ${again.seated.length} neighbours, and the document is ${expected.w} by ${expected.h} to the pixel when opened, while dragged, after the drag, out of focus and in focus again (${sizes.join(', ')})`,
    );

    // ---- 13. The keyboard's route to every neighbour is the document's own list ----
    // Until TASK-0104 Tab from the header went to the first of at most
    // sixteen copies. The cards are the field's own now, and the route that
    // reaches every one of them, on or off the screen, is the list on the
    // document: R on its header, or the "N related" button.
    await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus(); true`);
    press(win, 'r');
    await delay(500);
    type Listed = { open: boolean; expanded: string | null; button: string; rows: string[]; active: string; dirs: Record<string, string> };
    const listOf = (id: string): Promise<Listed> =>
      js(`(() => { const p = document.querySelector('.pane[data-note-id="${id}"]'); const panel = p.querySelector('.pane-links'); const b = p.querySelector('.pane-related'); const a = document.activeElement; const rows = [...panel.querySelectorAll('.link-row')];
        return { open: !panel.hidden, expanded: b.getAttribute('aria-expanded'), button: b.textContent, rows: rows.map((r) => r.dataset.noteId), dirs: Object.fromEntries(rows.map((r) => [r.dataset.noteId, r.dataset.direction])), active: a && p.contains(a) ? a.className : (a ? 'outside: ' + a.className : 'nothing') }; })()`);
    const listed = await listOf(card.id);
    const wrongWay = listed.rows.filter((id) => listed.dirs[id] !== (known.linked.includes(id) && known.backlinks.includes(id) ? 'both' : known.linked.includes(id) ? 'out' : 'in'));
    record(
      listed.open && listed.expanded === 'true' && listed.button === `${all.size} related` && listed.rows.length === all.size && new Set(listed.rows).size === all.size && listed.rows.every((id) => all.has(id)) && wrongWay.length === 0 && /link-go/.test(listed.active),
      `R on the header opens the document's list of related notes with the keyboard on its first row: "${listed.button}", ${listed.rows.length} rows for ${all.size} neighbours, each once, each saying which way its link runs (${wrongWay.length} wrong; the keyboard is on "${listed.active}")`,
    );
    // Escape in the list closes the list and nothing else (decision 10).
    press(win, 'Escape');
    await delay(500);
    const closed = await listOf(card.id);
    const stillFocus = await focus();
    record(
      !closed.open && closed.expanded === 'false' && stillFocus.noteId === card.id && stillFocus.seated.length === all.size && deskIds().join() === card.id && /pane-related/.test(closed.active),
      `Escape in the list closes the list and nothing else: the focus is still ${stillFocus.noteId} with ${stillFocus.seated.length} cards round it, the desk still holds ${deskIds().join(', ') || 'nothing'}, and the keyboard is back on the button ("${closed.active}")`,
    );

    // ---- 7b. A card round the document opens as a second document; no dock ----
    // Until TASK-0104 the note left behind waited in a dock as a header, and
    // a click swapped it back in. Every document is drawn whole where it is
    // stored now, and the one on top is the focus.
    const door = (await seatedNow()).find((s) => s.hit && !deskIds().includes(s.id));
    if (door === undefined) {
      record(false, 'focus: a seated card in sight that is not held, to open');
    } else {
      const firstBefore = await pane(card.id);
      await pointer(win, [...click(door), { type: 'move', ...PARK }]);
      await delay(1600);
      const next = await focus();
      const firstNow = await pane(card.id);
      const doorPane = await pane(door.id);
      const doorStored = stored(door.id);
      const doorKnown = await neighboursOf(door.id);
      const doorAll = new Set([...doorKnown.linked, ...doorKnown.backlinks]);
      const doorState = await js<{ cards: number; firstCards: number; toFirst: number; twice: string[]; docked: number }>(`({ cards: __t.drawn(${JSON.stringify(door.id)}), firstCards: __t.drawn(${JSON.stringify(card.id)}), toFirst: [...document.querySelectorAll('#field-lines .link-line:not(.shared)')].filter((l) => l.dataset.noteId === ${JSON.stringify(card.id)} && l.dataset.from === ${JSON.stringify(door.id)}).length, twice: __t.twice(), docked: document.querySelectorAll('.pane.docked').length })`);
      const heldNeighbours = deskIds().filter((id) => doorAll.has(id)).length;
      record(
        next.noteId === door.id && deskIds().join() === `${card.id},${door.id}` && doorPane !== null && doorPane.focus && doorStored?.w === expected.w && doorStored?.h === expected.h && doorPane.width === expected.w && doorPane.height === expected.h &&
          doorState.cards === 0 && doorState.twice.length === 0 && next.seated.length === doorAll.size - heldNeighbours,
        `a click on the seated card ${door.id} opens it as a second document at ${px(doorPane?.width ?? 0)} by ${px(doorPane?.height ?? 0)}, and it is the focus with its own ${next.seated.length} neighbours seated (${doorAll.size} in all, ${heldNeighbours} of them a document already); it has no card any more (${doorState.cards})`,
      );
      record(
        firstNow !== null && firstBefore !== null && !firstNow.focus && doorState.docked === 0 && firstNow.left === firstBefore.left && firstNow.top === firstBefore.top && firstNow.width === firstBefore.width && firstNow.height === firstBefore.height &&
          doorState.firstCards === 0 && doorState.toFirst === (doorAll.has(card.id) ? 1 : 0),
        `${card.id} stays a whole document where it was and the size it was (${px(firstNow?.width ?? 0)} by ${px(firstNow?.height ?? 0)}; ${doorState.docked} docked headers), and as a neighbour that is already a document it gets a line to its document (${doorState.toFirst}) and no card (${doorState.firstCards})`,
      );
      // A press on the document underneath raises it, and it is the focus.
      const under = await pointOn(card.id);
      if (under === null) {
        record(false, `focus: some of ${card.id}'s document shows beside ${door.id}'s, to press`);
      } else {
        await pointer(win, [...click(under), { type: 'move', ...PARK }]);
        await delay(1200);
        const raised = await focus();
        const firstRaised = await pane(card.id);
        const doorUnder = await pane(door.id);
        record(
          raised.noteId === card.id && deskIds().at(-1) === card.id && firstRaised !== null && firstRaised.focus && firstRaised.width === expected.w && firstRaised.height === expected.h && doorUnder !== null && !doorUnder.focus && doorUnder.width === expected.w && doorUnder.height === expected.h,
          `a press on the ${under.part} of ${card.id}'s document raises it and it is the focus again (${raised.noteId}), both documents still whole and ${expected.w} by ${expected.h} (${px(firstRaised?.width ?? 0)} by ${px(firstRaised?.height ?? 0)} and ${px(doorUnder?.width ?? 0)} by ${px(doorUnder?.height ?? 0)})`,
        );
      }
    }

    // ---- 10. The corner is the one way a size changes, and the view remembers it ----
    const corner = await js<{ x: number; y: number } | null>(`(() => { const h = document.querySelector('.pane[data-note-id="${card.id}"] .pane-resize'); if (!h) return null; const r = h.getBoundingClientRect(); const x = r.left + 5, y = r.top + 5; const e = document.elementFromPoint(x, y); return e === h ? { x, y } : null; })()`);
    const other = deskIds().find((id) => id !== card.id);
    if (corner === null) {
      record(false, `focus: the corner of ${card.id}'s document is in the field, to drag`);
    } else {
      const sizeWas = stored(card.id);
      const otherWas = other === undefined ? undefined : stored(other);
      await pointer(win, [...drag(corner, { x: corner.x + 40, y: corner.y + 30 }, 8), { type: 'move', ...PARK }]);
      await delay(900);
      const sizeNow = stored(card.id);
      const paneSized = await pane(card.id);
      const pref = store.getState().readingSizes[ws]?.['issues'];
      const resized = await focus();
      const reSeats = await seatedNow();
      const overSized = paneSized === null ? ['no pane'] : reSeats.filter((s) => hits(s, paneSized)).map((s) => s.id);
      record(
        sizeWas !== undefined && sizeNow !== undefined && sizeNow.w === (sizeWas.w ?? 0) + 40 && sizeNow.h === (sizeWas.h ?? 0) + 30 && sizeNow.x === sizeWas.x && sizeNow.y === sizeWas.y && paneSized !== null && paneSized.width === sizeNow.w && paneSized.height === sizeNow.h &&
          pref !== undefined && pref.w === sizeNow.w && pref.h === sizeNow.h,
        `dragging the corner 40 by 30 resizes the document in the store and on screen (${sizeWas?.w} by ${sizeWas?.h} to ${sizeNow?.w} by ${sizeNow?.h}, drawn ${px(paneSized?.width ?? 0)} by ${px(paneSized?.height ?? 0)}), leaves it where it was, and the view remembers that size (${pref?.w} by ${pref?.h})`,
      );
      const otherNow = other === undefined ? undefined : stored(other);
      record(
        resized.noteId === card.id && overSized.length === 0 && reSeats.length === resized.seated.length && reSeats.length > 0 && (other === undefined || (otherNow?.w === otherWas?.w && otherNow?.h === otherWas?.h)),
        `the resized document is still the focus and its cards make room for it (${reSeats.length} seated, ${overSized.join(', ') || 'none'} over it), and the other document keeps its own size (${otherNow?.w} by ${otherNow?.h})`,
      );
      // The keyboard's corner: Alt and an arrow, on the header.
      await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus(); true`);
      press(win, 'Right', ['alt']);
      await delay(700);
      const keyed = stored(card.id);
      const keyedPref = store.getState().readingSizes[ws]?.['issues'];
      record(keyed !== undefined && sizeNow !== undefined && keyed.w === (sizeNow.w ?? 0) + 16 && keyed.h === sizeNow.h && keyedPref?.w === keyed.w && keyedPref?.h === keyed.h, `Alt and an arrow on the header resizes it by keyboard, and the view remembers that too (${sizeNow?.w} to ${keyed?.w} wide; the view's size ${keyedPref?.w} by ${keyedPref?.h})`);
    }

    // ---- 12. The note with the most neighbours: every one seated, none dropped ----
    // Until TASK-0104 the ring held 16 at most and "+N more" stood for the
    // rest. Every neighbour has a seat now, and the seats run past the
    // field's edge; a counter at that edge, the list and "find" reach them.
    // The note is opened from the first document's own list where that names
    // it, which is also the check that a note opened next takes the size the
    // corner last chose here.
    const most = await js<{ id: string; count: number } | null>(`window.__deckGlass.hooks.graphEdges().then((edges) => { const n = new Map(); for (const e of edges) { if (!e.target || e.target === e.source) continue; for (const [a, b] of [[e.source, e.target], [e.target, e.source]]) { if (!n.has(a)) n.set(a, new Set()); n.get(a).add(b); } } let best = null; for (const [id, s] of n) if (!best || s.size > best.count) best = { id, count: s.size }; return best; })`);
    if (most === null || most.count <= 16) {
      record(false, `focus: a note with more than 16 neighbours (${most === null ? 'none' : `${most.id} has ${most.count}`})`);
    } else {
      const wantSize = readingSize('issues');
      const firstSize = stored(card.id);
      const otherSize = other === undefined ? undefined : stored(other);
      let via = 'its row in the list';
      if ((await js<string | null>(`__t.glass().focusId()`)) !== card.id) {
        await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus(); true`);
        press(win, 'Return');
        await delay(1200);
      }
      const relatedButton = (await listOf(card.id)).open ? null : await control(`.pane[data-note-id="${card.id}"] .pane-related`);
      if (relatedButton !== null) {
        await pointer(win, [...click(relatedButton), { type: 'move', ...PARK }]);
        await delay(500);
      }
      const openRow = await control(`.pane[data-note-id="${card.id}"] .link-row[data-note-id="${most.id}"] .link-open`);
      if (openRow !== null) {
        await pointer(win, [...click(openRow), { type: 'move', ...PARK }]);
      } else {
        // The first document does not link to it: opened by name instead.
        via = 'its name (the first document does not list it)';
        await js(`(() => { const g = window.__deckGlass; return g.hooks.context(${JSON.stringify(most.id)}).then(() => g.lift({ noteId: ${JSON.stringify(most.id)}, title: ${JSON.stringify(most.id)}, noteType: '', status: '', rel: null, subtitle: null, owed: false, owedVerb: null, groupKey: '', severity: null, lastVerified: null, stale: false, progress: null, children: [], frontmatter: {} })); })()`);
      }
      await delay(2200);
      const f = await focus();
      const mostKnown = await neighboursOf(most.id);
      const mostAll = new Set([...mostKnown.linked, ...mostKnown.backlinks]);
      const mostStored = stored(most.id);
      const mostPane = await pane(most.id);
      record(
        f.noteId === most.id && mostStored?.w === wantSize.w && mostStored?.h === wantSize.h && mostPane !== null && mostPane.width === wantSize.w && mostPane.height === wantSize.h &&
          JSON.stringify([stored(card.id)?.w, stored(card.id)?.h]) === JSON.stringify([firstSize?.w, firstSize?.h]) && (other === undefined || (stored(other)?.w === otherSize?.w && stored(other)?.h === otherSize?.h)),
        `${most.id}, opened from ${via}, takes the size the corner last chose on this view (${mostStored?.w} by ${mostStored?.h}, drawn ${px(mostPane?.width ?? 0)} by ${px(mostPane?.height ?? 0)}, the view's ${wantSize.w} by ${wantSize.h}), while ${card.id} keeps ${stored(card.id)?.w} by ${stored(card.id)?.h}${other === undefined ? '' : ` and ${other} keeps ${stored(other)?.w} by ${stored(other)?.h}`}`,
      );
      const manySeats = await seatedNow();
      const heldNow = deskIds();
      const seatedSet = new Set(manySeats.map((s) => s.id));
      const unplaced = [...mostAll].filter((id) => !seatedSet.has(id) && !heldNow.includes(id));
      const overDoc = mostPane === null ? ['no pane'] : manySeats.filter((s) => hits(s, mostPane)).map((s) => s.id);
      const overlapping = manySeats.filter((s, i) => manySeats.some((n, j) => j > i && hits(s, n))).length;
      const many = await js<{ more: number; twice: string[]; lines: number }>(`({ more: document.querySelectorAll('.ring-more').length, twice: __t.twice(), lines: document.querySelectorAll('#field-lines .link-line:not(.shared)').length })`);
      const side = (s: Seated): 'left' | 'right' | 'up' | 'down' | null => (s.right <= box.left ? 'left' : s.left >= box.right ? 'right' : s.bottom <= box.top ? 'up' : s.top >= box.bottom ? 'down' : null);
      const beyond = { left: 0, right: 0, up: 0, down: 0 };
      for (const s of manySeats) { const where = side(s); if (where !== null) beyond[where] += 1; }
      record(
        f.neighbours === mostAll.size && mostAll.size > 16 && unplaced.length === 0 && manySeats.length === mostAll.size - heldNow.filter((id) => mostAll.has(id)).length && overDoc.length === 0 && overlapping === 0 && many.more === 0 && many.twice.length === 0 && many.lines === mostAll.size,
        `${most.id} has ${mostAll.size} neighbours and every one has a place: ${manySeats.length} seated cards and ${heldNow.filter((id) => mostAll.has(id)).length} documents, none left out (${unplaced.slice(0, 4).join(', ') || 'none'}), none over the document (${overDoc.length}) or another card (${overlapping}), no "+N more" (${many.more}), and a line to each (${many.lines})`,
      );
      // The seats run past the field's edges, and each edge says how many.
      const counters = await js<Array<{ side: string; text: string; x: number; y: number }>>(`[...document.querySelectorAll('#desk-beyond .beyond')].filter((b) => !b.hidden).map((b) => { const r = b.getBoundingClientRect(); return { side: b.dataset.side, text: b.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
      const said = Object.fromEntries(counters.map((c) => [c.side, Number(/(\d+) related/.exec(c.text)?.[1] ?? '-1')]));
      const sides = ['left', 'right', 'up', 'down'] as const;
      record(
        beyond.left + beyond.right > 0 && sides.every((s) => (beyond[s] === 0 ? !(s in said) : said[s] === beyond[s])),
        `seats run past the field's edges, and a counter at each edge says how many cards stand wholly beyond it (${sides.map((s) => `${s} ${beyond[s]}`).join(', ')}; the counters read ${counters.map((c) => `"${c.text}"`).join(', ') || 'nothing'})`,
      );
      // Pressing a counter brings the nearest card beyond that edge into view.
      const counter = counters.find((c) => c.side === 'right') ?? counters.find((c) => c.side === 'left');
      if (counter === undefined) {
        record(false, 'focus: an edge counter to press');
      } else {
        const beforeLook = await focus();
        const paneLook = await pane(most.id);
        await pointer(win, [...click(counter), { type: 'move', ...PARK }]);
        await delay(900);
        const looked = await focus();
        const paneLooked = await pane(most.id);
        const shownNow = await js<{ id: string | null; seated: boolean; left: number; right: number; top: number; bottom: number; lit: boolean } | null>(`(() => { const a = document.activeElement; if (!a || !a.classList.contains('field-card')) return null; const r = a.getBoundingClientRect(); return { id: a.dataset.noteId, seated: a.classList.contains('seated'), left: r.left, right: r.right, top: r.top, bottom: r.bottom, lit: a.classList.contains('highlight') }; })()`);
        const wasBeyond = shownNow === null ? null : manySeats.find((s) => s.id === shownNow.id);
        const find = await js<{ shown: boolean; text: string }>(`({ shown: __t.shown('#find-open'), text: __t.text('#find-open') })`);
        record(
          shownNow !== null && shownNow.seated && wasBeyond !== undefined && wasBeyond !== null && side(wasBeyond) === counter.side && shownNow.left >= box.left && shownNow.right <= box.right && shownNow.top >= box.top && shownNow.bottom <= box.bottom &&
            Math.abs(looked.pan.x) > 1 && sameOffsets(beforeLook, looked).same && paneLooked !== null && paneLook !== null && paneLooked.width === paneLook.width && paneLooked.height === paneLook.height && looked.noteId === most.id && find.shown && find.text === `find ${most.id}`,
          `pressing "${counter.text}" moves the desk ${px(looked.pan.x)} px so that ${shownNow?.id ?? 'no card'}, which stood beyond the ${counter.side} edge, is wholly in the field with the keyboard on it; no card changed seat, the document kept its size, and "${find.text}" is offered to bring the desk back`,
        );
        // "find" brings the desk back in front of the person.
        const findAt = await control('#find-open');
        if (findAt !== null) await pointer(win, [...click(findAt), { type: 'move', ...PARK }]);
        await delay(900);
        const found = await focus();
        const foundPane = await pane(most.id);
        const onHead = await js<boolean>(`!!document.activeElement && document.activeElement.classList.contains('pane-head') && document.activeElement.closest('.pane').dataset.noteId === ${JSON.stringify(most.id)}`);
        record(
          findAt !== null && Math.abs(found.pan.x) < 0.5 && Math.abs(found.pan.y) < 0.5 && foundPane !== null && paneLook !== null && Math.abs(foundPane.left - paneLook.left) < 0.5 && Math.abs(foundPane.top - paneLook.top) < 0.5 && onHead && !(await js<boolean>(`__t.shown('#find-open')`)),
          `"find" brings the desk back: the document is where it was before the look aside (${px((foundPane?.left ?? 0) - (paneLook?.left ?? 0))} px off), the keyboard is on its header (${onHead}), and "find" is gone`,
        );
      }
      // The list has one row per neighbour, and a row shows where its card is.
      const manyButton = await control(`.pane[data-note-id="${most.id}"] .pane-related`);
      if (manyButton !== null) await pointer(win, [...click(manyButton), { type: 'move', ...PARK }]);
      await delay(600);
      const manyList = await listOf(most.id);
      const rowsWhere = await js<Array<{ id: string; where: string }>>(`[...document.querySelectorAll('.pane[data-note-id="${most.id}"] .link-row')].map((r) => ({ id: r.dataset.noteId, where: r.querySelector('.link-where').textContent }))`);
      const seatsNow = await seatedNow();
      const offRows = rowsWhere.filter((r) => /beyond the (left|right) edge/.test(r.where));
      const offSeats = seatsNow.filter((s) => side(s) === 'left' || side(s) === 'right');
      const heldRows = rowsWhere.filter((r) => r.where === 'open on the desk').map((r) => r.id).sort();
      record(
        manyButton !== null && manyList.open && manyList.button === `${mostAll.size} related` && manyList.rows.length === mostAll.size && new Set(manyList.rows).size === mostAll.size && manyList.rows.every((id) => mostAll.has(id)) &&
          offRows.length === offSeats.length && offRows.every((r) => offSeats.some((s) => s.id === r.id && r.where === `beyond the ${side(s)} edge`)) && heldRows.join() === deskIds().filter((id) => mostAll.has(id)).sort().join(),
        `the document's list has one row for each of its ${mostAll.size} neighbours ("${manyList.button}", ${manyList.rows.length} rows), and each row says where its note is: ${offRows.length} beyond an edge for ${offSeats.length} cards that are, ${heldRows.length} open on the desk (${heldRows.join(', ') || 'none'})`,
      );
      // A row's "show where it is" brings an off-screen card into view.
      const far = offRows[offRows.length - 1];
      const farGo = far === undefined ? null : await control(`.pane[data-note-id="${most.id}"] .link-row[data-note-id="${far.id}"] .link-go`);
      if (far === undefined || farGo === null) {
        record(false, `focus: a row for a card beyond the edge, to show (${offRows.length} such rows)`);
      } else {
        const beforeGo = await focus();
        await pointer(win, [...click(farGo), { type: 'move', ...PARK }]);
        await delay(900);
        const went = await focus();
        const farCard = (await seatedNow()).find((s) => s.id === far.id);
        const active = await js<string | null>(`document.activeElement && document.activeElement.classList.contains('field-card') ? document.activeElement.dataset.noteId : null`);
        record(
          farCard !== undefined && farCard.inSight && farCard.left >= box.left && farCard.right <= box.right && farCard.top >= box.top && farCard.bottom <= box.bottom && active === far.id && sameOffsets(beforeGo, went).same && went.noteId === most.id,
          `a row's "show where it is" brings ${far.id}, which was ${far.where}, wholly into the field (${farCard === undefined ? 'no card' : `${px(farCard.left - box.left)} px from the left edge`}) and puts the keyboard on its card (${active}); the desk moved ${px(went.pan.x - beforeGo.pan.x)} px and no card changed seat`,
        );
      }
      // Back in front, for the turn.
      await js(`__t.glass().findOpen(${JSON.stringify(most.id)}); true`);
      await delay(700);

      // ---- 13b. Turning carries the document and its neighbourhood, and fades them ----
      const turnFrom = await js<{ x: number; y: number } | null>(`__t.blank()`);
      if (turnFrom === null) {
        record(false, 'focus: a point of the field with nothing on it, to turn from');
      } else {
        const beforeTurn = await focus();
        const paneTurn = await pane(most.id);
        const turnState = await js<{ assignments: number; slots: string; yaw: number }>(`({ assignments: __t.assignments(), slots: __t.slots(), yaw: __t.yaw() })`);
        // 290 px is about 70 degrees: still in sight, and well into the fade.
        await pointer(win, [...drag(turnFrom, { x: turnFrom.x - 290, y: turnFrom.y }, 16), { type: 'move', ...PARK }]);
        await delay(400);
        const turned = await focus();
        const paneTurned = await pane(most.id);
        const turnedState = await js<{ assignments: number; slots: string; yaw: number; find: boolean; findText: string; lines: number }>(`({ assignments: __t.assignments(), slots: __t.slots(), yaw: __t.yaw(), find: __t.shown('#find-open'), findText: __t.text('#find-open'), lines: document.querySelectorAll('#field-lines .link-line').length })`);
        const slid = paneTurned === null || paneTurn === null ? 0 : paneTurned.left - paneTurn.left;
        // Until FEAT-0020 the document faded: its opacity fell, and two faded
        // documents lying over each other showed each other's text. It is
        // dimmed by a veil of the ground's colour now and stays opaque. How
        // far it is in sight is the same number as before, and the veil is
        // what is left of it. The collection is on the same desk and is
        // carried and dimmed the same way.
        const listTurned = await kit.collection();
        record(
          Math.abs(turnedState.yaw - turnState.yaw) > 1 && Math.abs(slid) > 150 && paneTurned !== null && paneTurn !== null && !paneTurned.outOfSight && paneTurned.sight < 0.6 && paneTurned.sight > 0 && Math.abs(paneTurned.veil - (1 - paneTurned.sight)) < 1e-9 && paneTurned.opaque &&
            paneTurned.width === paneTurn.width && paneTurned.height === paneTurn.height &&
            sameOffsets(beforeTurn, turned).same && turned.noteId === most.id && turnedState.assignments === turnState.assignments && turnedState.slots === turnState.slots,
          `turning the field ${(turnedState.yaw - turnState.yaw).toFixed(2)} radians carries the document ${px(slid)} px with it and dims it to ${paneTurned?.sight.toFixed(2)} of full sight under a veil of ${paneTurned?.veil.toFixed(2)}, still opaque (${paneTurned?.opaque}), at the same size, with every card still beside it and still the focus; the turn dealt nothing (${turnedState.assignments - turnState.assignments} deals)`,
        );
        record(
          paneTurned !== null && Math.abs(listTurned.veil - paneTurned.veil) < 1e-9 && listTurned.opaque && Math.abs(listTurned.x - 12 - slid) < 1 && (await js<boolean>(`__t.shown('#to-collection')`)),
          `the collection is carried and dimmed with it (${px(listTurned.x - 12)} px, veil ${listTurned.veil.toFixed(2)}, opaque ${listTurned.opaque}), and "collection" is offered to bring it back`,
        );
        record(turnedState.find && turnedState.findText === `find ${most.id}`, `and "find" is offered for the note turned away from ("${turnedState.findText}")`);
        // Past the edge of sight the document is not drawn and takes no pointer.
        const yawThere = turnedState.yaw;
        await js(`window.__deckGlass.model.face(${yawThere} + 0.4); window.__deckGlass.render(false); true`);
        await delay(300);
        const gone = await pane(most.id);
        const goneState = await js<{ lines: number; counters: number; find: boolean; seatedInSight: number }>(`({ lines: document.querySelectorAll('#field-lines .link-line').length, counters: [...document.querySelectorAll('#desk-beyond .beyond')].filter((b) => !b.hidden).length, find: __t.shown('#find-open'), seatedInSight: __t.seated().filter((s) => s.inSight).length })`);
        const listGone = await kit.collection();
        record(
          gone !== null && gone.outOfSight && !gone.drawn && gone.sight === 0 && goneState.lines === 0 && goneState.seatedInSight === 0 && goneState.find && listGone.outOfSight && !listGone.shown,
          `past the edge of sight the document is not drawn (in sight ${gone?.sight}, drawn ${gone?.drawn}) and neither is the collection (${listGone.shown}), its lines are gone (${goneState.lines}), none of its cards takes the pointer (${goneState.seatedInSight}), and "find" is still offered`,
        );
        const findAgain = await control('#find-open');
        if (findAgain !== null) await pointer(win, [...click(findAgain), { type: 'move', ...PARK }]);
        await delay(900);
        const home = await focus();
        const paneHome = await pane(most.id);
        const yawHome = await js<number>(`__t.yaw()`);
        record(
          findAgain !== null && paneHome !== null && paneTurn !== null && !paneHome.outOfSight && paneHome.sight === 1 && paneHome.veil === 0 && paneHome.opaque && Math.abs(paneHome.left - paneTurn.left) < 0.5 && Math.abs(paneHome.top - paneTurn.top) < 0.5 && paneHome.width === paneTurn.width && paneHome.height === paneTurn.height &&
            Math.abs(yawHome - (yawThere + 0.4)) < 1e-9 && home.noteId === most.id && sameOffsets(beforeTurn, home).same,
          `"find" brings the desk round to where the person now faces without turning the field (yaw still ${yawHome.toFixed(2)}): the document is drawn where it is stored, at full strength and the same size, with its cards beside it`,
        );
      }
    }

    // ---- 9b. Escape leaves the focus and keeps every document; the next one sweeps ----
    // Back to the front, and the desk with it: "find" above left it where the field was turned to.
    await js(`window.__deckGlass.model.face(0); window.__deckGlass.render(false); __t.glass().findOpen(); true`);
    await delay(600);
    if ((await js<string | null>(`__t.glass().focusId()`)) === null) {
      const top = deskIds().at(-1);
      if (top !== undefined) {
        ctx.focusApp(win);
        await js(`document.querySelector('.pane[data-note-id="${top}"] .pane-head').focus(); true`);
        press(win, 'Return');
        await delay(1200);
      }
    }
    const heldAll = deskIds();
    const placesBefore = JSON.stringify(deskCardsOf(store.getState(), ws));
    const hadFocus = await js<string | null>(`__t.glass().focusId()`);
    await escape();
    await delay(600);
    const out = await focus();
    const outState = await js<{ panes: number; focusPanes: number; docked: number; seated: number; front: string[] }>(`({ panes: [...document.querySelectorAll('.pane')].filter((p) => p.offsetParent !== null).length, focusPanes: document.querySelectorAll('.pane.focus').length, docked: document.querySelectorAll('.pane.docked').length, seated: document.querySelectorAll('.field-card.seated:not(.leaving)').length, front: __t.frontIds() })`);
    record(
      hadFocus !== null && heldAll.length >= 2 && out.noteId === null && deskIds().join() === heldAll.join() && JSON.stringify(deskCardsOf(store.getState(), ws)) === placesBefore && outState.panes === heldAll.length && outState.focusPanes === 0 && outState.docked === 0 && outState.seated === 0 && outState.front.join() === fieldBefore.front.join(),
      `Escape once leaves the focus (${hadFocus}) and keeps every document: ${outState.panes} of ${heldAll.length} still drawn, each at its place and size in the store, no card at a seat (${outState.seated}), and the front band holding what it held before any note was opened (${outState.front.join(', ')})`,
    );
    await escape();
    record(deskIds().length === 0, `and a second Escape sweeps the desk (${deskIds().length} left)`);

    // ---- 10. What leaves the focus, and what does not ----
    // Until TASK-0104 a drag of the header was on this list (decision 13). It
    // is the one way out that is gone: a drag moves the document and keeps
    // the focus, which is checked above and once more here, from a fresh lift.
    const openSecond = async (): Promise<boolean> => {
      const seat = (await seatedNow()).find((s) => s.hit && !deskIds().includes(s.id));
      if (seat === undefined) return false;
      await pointer(win, [...click(seat), { type: 'move', ...PARK }]);
      await delay(1300);
      return deskIds().length === 2;
    };
    const stayed: string[] = [];
    const ways: Array<[string, () => Promise<void>]> = [
      ['Hide notes', async () => { await js(`document.getElementById('hide-notes').click(); true`); await delay(500); }],
      ['W', async () => { ctx.focusApp(win); await js(`document.querySelector('.pane.focus .pane-head').focus(); true`); press(win, 'W'); await delay(700); }],
      // With a second note held, so putting the focused note back does not
      // simply empty the desk: the other document must not become the focus.
      ['×', async () => {
        if (!(await openSecond())) stayed.push('× (could not hold two notes)');
        await js(`document.querySelector('.pane.focus .pane-close').click(); true`);
        await delay(700);
        if (deskIds().length !== 1) stayed.push(`× (the desk holds ${deskIds().length} notes after it)`);
      }],
      ['a view switch', async () => { await view('features'); await view('issues'); }],
      ['a surface switch', async () => { await js(`document.querySelector('#surface-toggle button[data-surface="spread"]').click()`); await delay(900); await js(`document.querySelector('#surface-toggle button[data-surface="glass"]').click()`); await delay(1500); }],
    ];
    let dragKept = 'not tried';
    for (const [name, act] of [['a drag of its header', async () => undefined] as [string, () => Promise<void>], ...ways]) {
      store.dispatch({ type: 'clear-desk', scope: 'workspace' });
      await delay(700);
      const c = await frontCard();
      if (c === null) {
        stayed.push(`${name} (no card to lift)`);
        continue;
      }
      await pointer(win, [...click(c), { type: 'move', ...PARK }]);
      await delay(1300);
      if ((await focus()).noteId !== c.id) {
        stayed.push(`${name} (the lifted note was not the focus)`);
        continue;
      }
      if (name === 'a drag of its header') {
        const h = await js<{ x: number; y: number } | null>(`__t.rect('.pane.focus .pane-id')`);
        if (h !== null) await pointer(win, [...drag(h, { x: h.x + 60, y: h.y + 90 }, 8), { type: 'move', ...PARK }]);
        await delay(700);
        const f = await focus();
        dragKept = f.noteId === c.id && h !== null && f.seated.length > 0 ? 'kept' : `lost (focus ${f.noteId}, ${f.seated.length} seated)`;
        continue;
      }
      await act();
      if ((await focus()).noteId !== null) stayed.push(name);
      // Undoing Hide notes, or putting a filled document back at its size, does not bring the focus back.
      if (name === 'Hide notes') {
        await js(`document.getElementById('hide-notes').click(); true`);
        await delay(600);
        if ((await focus()).noteId !== null) stayed.push('Hide notes, once shown again');
      }
      if (name === 'W') {
        await js(`(() => { const p = document.querySelector('.pane.wide .pane-widen') || document.querySelector('.pane .pane-widen'); if (p) p.click(); return true; })()`);
        await delay(700);
        if ((await focus()).noteId !== null) stayed.push('W, once back at its own size');
      }
    }
    record(stayed.length === 0, `Hide notes, W, ×, a view switch and a surface switch each leave the focus (${stayed.join(', ') || 'all did'})`);
    record(dragKept === 'kept', `and a drag of the header does not: the dragged document is still the focus with its cards round it (${dragKept})`);

    // ---- 4. The cards keep the order they stood in round the document ----
    // On Features, where a feature's neighbours include other features the
    // field is drawing: the Issues view draws too few of an issue's
    // neighbours for an order to mean anything.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await view('features');
    await delay(500);
    const ordered = await js<{ id: string; x: number; y: number; left: number; top: number; right: number; bottom: number; near: Array<{ id: string; x: number; y: number }> } | null>(`(async () => {
      const g = window.__deckGlass; const f = document.getElementById('field').getBoundingClientRect(); let best = null;
      for (const c of __t.visibleCards().slice(0, 24)) {
        const ctx = await g.hooks.context(c.id).catch(() => null);
        if (!ctx) continue;
        const ids = new Set([...ctx.linked, ...ctx.backlinks].map((i) => i.id).filter((x) => x !== c.id));
        const near = [];
        for (const id of ids) { const w = g.whereIs(id); if (w && w.visible && w.band !== 'deep') near.push({ id, x: f.left + w.x, y: f.top + w.y }); }
        if (!best || near.length > best.near.length) best = { ...c, near };
      }
      return best;
    })()`);
    if (ordered === null || ordered.near.length < 3) {
      skip(`the cards keep their order round the document: no card in sight on Features has three neighbours the field is drawing (${ordered === null ? 'no card' : `${ordered.id} has ${ordered.near.length}`})`);
    } else {
      await pointer(win, [...click(ordered), { type: 'move', ...PARK }]);
      await delay(1700);
      const of = await focus();
      const seatedThere = new Map((await seatedNow()).map((s) => [s.id, { x: s.x, y: s.y }]));
      const docPane = await pane(ordered.id);
      const centre = docPane === null ? { x: 0, y: 0 } : { x: docPane.left + docPane.width / 2, y: docPane.top + docPane.height / 2 };
      const stood = ordered.near.filter((n) => seatedThere.has(n.id));
      const orderBefore = [...stood].sort((a, b) => around(a, centre) - around(b, centre)).map((n) => n.id);
      const far = (id: string): number => { const p = seatedThere.get(id) as { x: number; y: number }; return Math.hypot(p.x - centre.x, p.y - centre.y); };
      const orderAfter = [...stood].sort((a, b) => { const d = around(seatedThere.get(a.id) as { x: number; y: number }, centre) - around(seatedThere.get(b.id) as { x: number; y: number }, centre); return Math.abs(d) > 1e-6 ? d : far(a.id) - far(b.id); }).map((n) => n.id);
      record(
        of.noteId === ordered.id && stood.length === ordered.near.length && stood.length >= 3 && cyclic(orderBefore) === cyclic(orderAfter),
        `the neighbours the field was drawing keep their order round the document when they take their seats (${ordered.id}, ${stood.length} of them: ${cyclic(orderBefore)} | ${cyclic(orderAfter)})`,
      );
    }
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await view('issues');
    await delay(500);

    // ---- 14. Under reduced motion nothing travels, and what arrived is marked ----
    await js(`window.__deckReducedMotion = true`);
    const rm = await frontCard();
    if (rm === null) {
      record(false, 'focus: a front card to open under reduced motion');
    } else {
      const still = js<{ places: number; opening: boolean; gather: boolean; animate: boolean; paneLit: boolean; seated: number; lit: number; seatPlaces: number }>(`new Promise((resolve) => {
        const places = new Set(); const seatPlaces = new Map(); const t0 = performance.now(); const out = { opening: false, gather: false, animate: false, paneLit: false, seated: 0, lit: 0 };
        const look = () => {
          const p = document.querySelector('.pane[data-note-id="${rm.id}"]'); const f = document.getElementById('field');
          if (p) { const r = p.getBoundingClientRect(); places.add(Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + ',' + Math.round(r.height)); if (p.classList.contains('highlight')) out.paneLit = true; }
          if (window.__deckGlass.isOpening()) out.opening = true;
          if (f.classList.contains('gather')) out.gather = true;
          if (f.classList.contains('animate')) out.animate = true;
          const seats = [...document.querySelectorAll('.field-card.seated:not(.leaving)')];
          for (const s of seats) { const r = s.getBoundingClientRect(); const at = Math.round(r.left) + ',' + Math.round(r.top); if (!seatPlaces.has(s.dataset.noteId)) seatPlaces.set(s.dataset.noteId, new Set()); seatPlaces.get(s.dataset.noteId).add(at); }
          out.seated = Math.max(out.seated, seats.length); out.lit = Math.max(out.lit, seats.filter((s) => s.classList.contains('highlight')).length);
          if (performance.now() - t0 < 1500) requestAnimationFrame(look); else resolve({ ...out, places: places.size, seatPlaces: Math.max(0, ...[...seatPlaces.values()].map((s) => s.size)) });
        };
        look();
      })`);
      await pointer(win, [...click(rm), { type: 'move', ...PARK }]);
      const seenStill = await still;
      record(
        seenStill.places === 1 && seenStill.seatPlaces === 1 && !seenStill.opening && !seenStill.gather && !seenStill.animate && seenStill.paneLit && seenStill.seated > 0 && seenStill.lit === seenStill.seated,
        `under reduced motion the document is in place at once (${seenStill.places} place seen, no opening animation: ${!seenStill.opening}) and so is each card at its seat (${seenStill.seatPlaces} place each, no gathering: ${!seenStill.gather}), and both are marked instead: the document (${seenStill.paneLit}) and ${seenStill.lit} of ${seenStill.seated} cards`,
      );
    }
    await js(`window.__deckReducedMotion = false`);
    await escape();

    // ---- 15. The orbit opens a note the same way, and holds still ----
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(400);
    const toOrbit = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="orbit"]')`);
    if (toOrbit === null) {
      record(false, 'focus: the orbit could be opened');
    } else {
      await pointer(win, click(toOrbit));
      for (let i = 0; i < 40; i += 1) {
        if (await js<boolean>(`/the link graph: \\d+ notes/.test(__t.text('#front-label'))`)) break;
        await delay(250);
      }
      await delay(1000);
      const dotsBefore = await js<Array<{ id: string; x: number; y: number }>>(`window.__deckGlass.dots.map((d) => ({ id: d.id, x: d.x, y: d.y }))`);
      const yawBefore = await js<number>(`__t.yaw()`);
      // A dot with links, so there is something to seat: the drawn dot with
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
      if (dot === null) {
        record(false, 'focus: a dot in the orbit to click');
      } else {
        await pointer(win, [...click({ x: Math.round(fbox.left) + dot.x, y: Math.round(fbox.top) + dot.y }), { type: 'move', ...PARK }]);
        await delay(1500);
        const inOrbit = await focus();
        const orbitSeats = await seatedNow();
        const orbitKnown = await neighboursOf(dot.id);
        const orbitAll = new Set([...orbitKnown.linked, ...orbitKnown.backlinks]);
        // A painted dot has a radius. The orbit also keeps a place with no
        // radius for each note drawn as a card, so the pointer finds it; that
        // is the card's own place and not a second drawing of the note.
        const orbitState = await js<{ cards: number; dot: boolean; twice: string[]; seatedDots: string[]; pane: boolean }>(`(() => { const g = window.__deckGlass; const seats = new Set(__t.seated().map((s) => s.id)); return { cards: __t.drawn(${JSON.stringify(dot.id)}), dot: g.dots.some((d) => d.id === ${JSON.stringify(dot.id)}), twice: __t.twice(), seatedDots: g.dots.filter((d) => d.r > 0 && seats.has(d.id)).map((d) => d.id), pane: !!document.querySelector('.pane.focus[data-note-id="${dot.id}"]') }; })()`);
        const yaw0 = await js<number>(`__t.yaw()`);
        await delay(6000);
        const yaw6 = await js<number>(`__t.yaw()`);
        record(
          inOrbit.noteId === dot.id && orbitState.pane && orbitState.cards === 0 && !orbitState.dot && orbitState.twice.length === 0 && orbitState.seatedDots.length === 0 && orbitSeats.length > 0 && orbitSeats.length === orbitAll.size && orbitSeats.every((s) => orbitAll.has(s.id)),
          `in the orbit a click on the dot for ${dot.id} opens it as the focused document, and it is one object there too: no card (${orbitState.cards}) and no dot (${orbitState.dot}) for it, and its ${orbitAll.size} neighbours are ${orbitSeats.length} seated cards, none of them also a dot (${orbitState.seatedDots.length}) or drawn twice (${orbitState.twice.length})`,
        );
        await escape();
        await delay(600);
        const dotsAfter = await js<Array<{ id: string; x: number; y: number }>>(`window.__deckGlass.dots.map((d) => ({ id: d.id, x: d.x, y: d.y }))`);
        const others = dotsBefore.filter((b) => b.id !== dot.id);
        const movedDots = others.filter((b) => {
          const a = dotsAfter.find((d) => d.id === b.id);
          return a === undefined || Math.hypot(a.x - b.x, a.y - b.y) > 0.5;
        }).length;
        record(
          Math.abs(yaw6 - yaw0) < 1e-9 && Math.abs(yaw0 - yawBefore) < 1e-9 && others.length > 0 && movedDots === 0 && !dotsAfter.some((d) => d.id === dot.id) && (await focus()).noteId === null,
          `the orbit holds still for six seconds while a note is the focus (${(yaw6 - yaw0).toFixed(4)} radians), and after Escape every other dot is where it was (${movedDots} of ${others.length} moved) and the held note is still a document and not a dot`,
        );
      }
      const toGlass = await js<{ x: number; y: number } | null>(`__t.rect('#surface-toggle button[data-surface="glass"]')`);
      if (toGlass !== null) await pointer(win, click(toGlass));
      await delay(1800);
    }

    // ---- 16. The focus, the turn and the look aside are the window's; places and sizes are the store's ----
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await view('issues');
    await delay(400);
    const last = await frontCard();
    if (last === null) {
      record(false, 'focus: a front card to open before the reload');
    } else {
      await pointer(win, [...click(last), { type: 'move', ...PARK }]);
      await delay(1300);
      // Looked aside and turned, so there is something to forget.
      const aside = (await seatedNow())[0];
      if (aside !== undefined) await js(`__t.glass().locate(${JSON.stringify(aside.id)}); true`);
      await js(`window.__deckGlass.model.face(0.3); window.__deckGlass.render(false); true`);
      await delay(600);
      const beforeReload = await focus();
      const state = store.getState();
      const keys = Object.keys(state).sort().join(' ');
      const text = JSON.stringify(state);
      const heldCards = JSON.stringify(deskCardsOf(state, ws));
      win.webContents.reload();
      await boot();
      if (store.getState().viewId !== 'issues') await view('issues');
      const reloaded = await focus();
      const drawnAfter = await js<Array<{ id: string; left: string; top: string; width: string; height: string; focus: boolean; sight: string; opacity: string }>>(`[...document.querySelectorAll('.pane')].map((p) => ({ id: p.dataset.noteId, left: p.style.left, top: p.style.top, width: p.style.width, height: p.style.height, focus: p.classList.contains('focus'), sight: p.dataset.sight, opacity: p.style.opacity }))`);
      const cardsHeld = JSON.parse(heldCards) as Array<{ noteId: string; x: number; y: number; w?: number; h?: number }>;
      // In full sight: sight 1, and no opacity written on the element (FEAT-0020).
      const inPlace = cardsHeld.length > 0 && cardsHeld.every((c) => drawnAfter.some((p) => p.id === c.noteId && p.left === `${c.x}px` && p.top === `${c.y}px` && p.width === `${c.w}px` && p.height === `${c.h}px` && !p.focus && p.sight === '1' && p.opacity === ''));
      // The store's keys before TASK-0104, the one it added (the size a corner
      // last chose on each view) and the one FEAT-0020 added: where each
      // view's collection stands. Nothing about the focus is in it.
      const expectedKeys = 'actor collections deskCards deskName desks filters flowCursor folds indexRevisions noteId query readingSizes revision session surface viewDesks viewId workspaceId';
      const leaked = /focusOn|bearing|deskPan|"pan"|seating|seated|onTop|narrowFront|localHeld/i.exec(text);
      record(
        beforeReload.noteId === last.id && reloaded.noteId === null && reloaded.seated.length === 0 && Math.abs(reloaded.bearing) < 1e-9 && reloaded.pan.x === 0 && reloaded.pan.y === 0 && (await js<number>(`__t.yaw()`)) === 0 && inPlace &&
          JSON.stringify(deskCardsOf(store.getState(), ws)) === heldCards && (await js<number>(`document.querySelectorAll('.field-card.seated').length`)) === 0,
        `after a reload nothing is the focus (${reloaded.noteId}), the field faces the front and the desk is in front of it, and ${last.id}'s document is drawn where the store holds it, at its stored size (${drawnAfter.map((p) => `${p.id} at ${p.left},${p.top}, ${p.width} by ${p.height}`).join('; ') || 'no pane'})`,
      );
      record(keys === expectedKeys && leaked === null, `the store holds nothing about the focus, the turn or the look aside: its keys are the ones it had plus readingSizes and collections (${keys === expectedKeys ? 'as expected' : keys}${leaked === null ? '' : `; it mentions "${leaked[0]}"`})`);
    }
  } finally {
    await js(`window.__deckReducedMotion = false; true`).catch(() => null);
    // The corner dragged here is the size the next note opened on Issues
    // takes. Put back to the first-use size, so the parts after this one
    // open their notes at the size they were written for.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'put-on-desk', noteId: 'ISS-0008', x: 16, y: 16, viewId: 'issues' });
    store.dispatch({ type: 'resize-card', noteId: 'ISS-0008', w: 560, h: 520, viewId: 'issues' });
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'let-go' });
    await delay(600);
  }
}

/**
 * FEAT-0016, with a real wheel (TASK-0066): the wheel zooms toward the
 * pointer, a pinch zooms, Shift turns, the keys and the compass work, and
 * nothing about the zoom is stored. Its own section, reset at its start, so a
 * failure earlier does not turn it red as well.
 */
async function recordZoom(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record } = kit;
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

  await kit.fresh('issues');
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
      // Out of the focus: the checks below are about a document on the desk
      // and the field behind it, not about the cards gathered round it.
      await leaveFocus(ctx, win, js);
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

    // ---- 6. The zoom is the field's: it does not reach a document, and deals nothing ----
    // Until TASK-0104 a document was an obstacle and the field was dealt
    // again 200 ms after the wheel stopped, so that "no card is drawn under a
    // pane". Nothing on the desk is an obstacle now. What a person holding a
    // document notices when they zoom is that the document stays the size
    // they read at, where it was, while the cards behind it grow.
    const paneBox = await js<{ left: number; right: number; top: number; bottom: number } | null>(`(() => { const p = document.querySelector('.pane:not(.wide)'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; })()`);
    const beside = await js<{ x: number; y: number } | null>(`__t.blank()`);
    if (paneBox !== null && beside !== null) {
      const fieldWas = await js<{ assignments: number; slots: string; widths: Record<string, number> }>(`({ assignments: __t.assignments(), slots: __t.slots(), widths: Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.getBoundingClientRect().width])) })`);
      await notches(beside.x, beside.y, 8, -1);
      await delay(400);
      const paneNow = await js<{ left: number; right: number; top: number; bottom: number } | null>(`(() => { const p = document.querySelector('.pane:not(.wide)'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; })()`);
      const fieldIs = await js<{ assignments: number; slots: string; widths: Record<string, number> }>(`({ assignments: __t.assignments(), slots: __t.slots(), widths: Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.getBoundingClientRect().width])) })`);
      const scale = (await zoom()).scale;
      const grew = Object.keys(fieldWas.widths).filter((id) => (fieldIs.widths[id] ?? 0) > (fieldWas.widths[id] as number) * 1.5).length;
      record(
        scale > 1.8 && paneNow !== null && JSON.stringify(paneNow) === JSON.stringify(paneBox) && fieldIs.assignments === fieldWas.assignments && fieldIs.slots === fieldWas.slots && grew > 0 && grew === Object.keys(fieldWas.widths).length,
        `zooming to ${scale.toFixed(2)}× with a document held leaves the document where it was and the size it was (${paneNow === null ? 'no pane' : `${paneNow.right - paneNow.left} by ${paneNow.bottom - paneNow.top}`}) while all ${grew} cards behind it grow, and deals nothing (${fieldIs.assignments - fieldWas.assignments} deals, the same slots)`,
      );
    } else {
      record(false, `zoom: a document was held, with field beside it to zoom over (${paneBox === null ? 'no pane' : 'no clear point'})`);
    }

    // ---- 7. At 2× a real click on a card's reported place lifts that card ----
    // The desk is swept first: the document stands across the middle of the
    // field, where the front band is, and this check is about the zoom and
    // the click agreeing, not about what a document covers.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(600);
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
    // A point of the field itself. Until FEAT-0020 this scanned from the
    // field's left edge, where the collection now stands: a double-click
    // there is two clicks on the list, and the zoom stays.
    const blank = await js<{ x: number; y: number } | null>(`__t.blank()`);
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
    // The collection is not the background (FEAT-0020): a wheel over the list
    // scrolls the list, and a double-click on it leaves the zoom alone.
    await js(`__t.glass().zoomTo({ scale: 1.5, dx: 0, dy: 0 }); true`);
    await delay(500);
    const overList = await js<{ x: number; y: number; top: number; room: number } | null>(`(() => { const l = document.getElementById('nav-list'); l.scrollTop = 0; const r = l.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); return e && l.contains(e) ? { x, y, top: l.scrollTop, room: l.scrollHeight - l.clientHeight } : null; })()`);
    if (overList === null || overList.room <= 0) {
      record(false, `zoom: the list was in reach with rows to scroll (${JSON.stringify(overList)})`);
    } else {
      await notches(overList.x, overList.y, 3, 1);
      await delay(300);
      const listNow = await js<{ top: number; scale: number }>(`({ top: document.getElementById('nav-list').scrollTop, scale: __t.glass().zoom().scale })`);
      const headAt = await js<{ x: number; y: number } | null>(`__t.rect('#collection-count')`);
      const layoutWas = JSON.stringify(await kit.collection().then((c) => [c.x, c.y, c.w, c.h, c.collapsed]));
      if (headAt !== null) await dbl({ x: headAt.x, y: headAt.y });
      await delay(500);
      const afterDbl = (await zoom()).scale;
      // A double-click on the header collapses the collection, as its Enter does; opened again for what follows.
      const collapsedBy = (await kit.collection()).collapsed;
      if (collapsedBy && headAt !== null) await dbl({ x: headAt.x, y: headAt.y });
      await delay(400);
      record(
        listNow.top > overList.top && Math.abs(listNow.scale - 1.5) < 1e-9 && Math.abs(afterDbl - 1.5) < 1e-9,
        `the wheel over the collection scrolls its list (${overList.top} to ${listNow.top}) and a double-click on its header is not one on the background: the zoom stays ${afterDbl.toFixed(2)}× (the header's double-click collapsed it: ${collapsedBy}; it stood at ${layoutWas})`,
      );
      await js(`document.getElementById('nav-list').scrollTop = 0; true`);
    }
    await js(`__t.glass().zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
    await delay(500);

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
    // With the desk swept: the note lifted above is a document across the
    // middle of the field, and a wheel over a document scrolls its text. The
    // wheel was turned there, zoomed neither arrangement, and "each keeps its
    // own zoom" then compared 1× with 1×.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(700);
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
    record(bandsZoom > 1.9 && orbitStart === 1 && Math.abs(backToBands - bandsZoom) < 1e-9, `the bands and the orbit each keep their own zoom (bands ${bandsZoom.toFixed(2)}×, the orbit opened at ${orbitStart}× and was zoomed to ${orbitZoom.toFixed(2)}×, back to the bands at ${backToBands.toFixed(2)}×)`);

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
async function recordDesksPerView(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record, view } = kit;
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const reset = (): void => {
    store.dispatch({ type: 'open-workspace', workspaceId: ws });
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    store.dispatch({ type: 'let-go' });
  };
  const own =(id: string): string[] => viewCardsOf(store.getState(), ws, id).map((c) => c.noteId);
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

  await kit.fresh('issues');
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
    // Documents on the desk and no focus, so every card stands in its slot (FEAT-0017).
    await leaveFocus(ctx, win, js);
    await delay(900);
    const before = JSON.stringify(deskCardsOf(store.getState(), ws));
    // The cards that stand behind a document: drawn, and not reachable while
    // the document is. Until TASK-0104 there were none, because a document
    // was an obstacle the field dealt round, and hiding the notes "dealt
    // cards into the space the panes covered". Nothing is dealt for a
    // document now, so hiding the notes moves no card: it uncovers them.
    type Behind = { id: string; x: number; y: number; transform: string; reached: boolean };
    const behindPanes = (): Promise<Behind[]> =>
      js(`(() => { const panes = [...document.querySelectorAll('.pane:not(.wide)')].filter((p) => p.offsetParent !== null).map((p) => p.getBoundingClientRect()); const f = document.getElementById('field').getBoundingClientRect();
        return __t.nearCards().filter((c) => c.x > f.left + 4 && c.x < f.right - 4 && c.y > f.top + 4 && c.y < f.bottom - 4 && panes.some((p) => c.x > p.left && c.x < p.right && c.y > p.top && c.y < p.bottom)).map((c) => ({ id: c.id, x: c.x, y: c.y, transform: c.transform, reached: __t.hit(c.x, c.y) === c.id })); })()`);
    const stoodBehind = await behindPanes();
    const fieldState = (): Promise<{ cards: Record<string, string>; slots: string; height: number }> => js(`({ cards: __t.cardsAt(), slots: __t.slots(), height: document.getElementById('field').getBoundingClientRect().height })`);
    const shown = await fieldState();
    const clicked = await clickAt('#hide-notes');
    await delay(1500);
    const hidden = await panes();
    const label = await js<string>(`__t.text('#hide-notes')`);
    const uncovered = await js<Array<{ id: string; reached: boolean }>>(`(() => { const ids = ${JSON.stringify(stoodBehind.map((c) => c.id))}; return __t.nearCards().filter((c) => ids.includes(c.id)).map((c) => ({ id: c.id, reached: __t.hit(c.x, c.y) === c.id })); })()`);
    const gone = await fieldState();
    record(clicked && a2 !== null && hidden.length === 2 && hidden.every((p) => !p.shown), `Hide notes, clicked, draws no pane (${hidden.filter((p) => p.shown).length} of ${hidden.length} shown)`);
    record(JSON.stringify(deskCardsOf(store.getState(), ws)) === before, 'and the store’s desk is the same before and after');
    record(label === 'Show 2 notes', `and the button reads "${label}"`);
    // Where a card is drawn is read as its translation. Hiding the notes adds
    // a word to the field's bar, and at this width the bar then takes a
    // second line: the field is that much shorter and its horizon that much
    // higher, so every card rises by the same amount. That is the bar's
    // doing and is said in the check's line; what is asserted is that no
    // card moved against another, and none at all when the field kept its height.
    const placeOf = (t: string | undefined): { x: number; y: number } | null => { const m = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(t ?? ''); return m === null ? null : { x: Number(m[1]), y: Number(m[2]) }; };
    const moves = Object.keys(shown.cards).map((id) => { const was = placeOf(shown.cards[id]); const is = placeOf(gone.cards[id]); return was === null || is === null ? null : { id, dx: is.x - was.x, dy: is.y - was.y }; });
    const rise = moves[0]?.dy ?? 0;
    const against = moves.filter((m) => m === null || Math.abs(m.dx) > 0.11 || Math.abs(m.dy - rise) > 0.11).length;
    const shorter = shown.height - gone.height;
    record(
      stoodBehind.length > 0 && stoodBehind.every((c) => !c.reached) && uncovered.length === stoodBehind.length && uncovered.every((c) => c.reached) &&
        moves.length > 0 && against === 0 && gone.slots === shown.slots && Object.keys(gone.cards).length === moves.length && (Math.abs(shorter) > 0.5 || Math.abs(rise) < 0.11),
      `while hidden, the ${stoodBehind.length} cards that stood behind a document can be pressed (${uncovered.filter((c) => c.reached).length} of ${uncovered.length}; ${stoodBehind.filter((c) => c.reached).length} could before), and hiding dealt nothing: every note keeps its slot and no card moved against another (${against} of ${moves.length})${Math.abs(rise) < 0.11 ? '' : `; the bar took a second line, so the field is ${Math.round(shorter)} px shorter and every card stands ${Math.abs(rise).toFixed(1)} px ${rise < 0 ? 'higher' : 'lower'}`}`,
    );
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
    await leaveFocus(ctx, win, js);
    await delay(900);
    const eHead = `.pane[data-note-id="${e}"] .pane-id`;
    const covered = await js<{ x: number; y: number } | null>(`(() => { const p = document.querySelector('.pane[data-note-id="${e}"] .pane-body'); if (!p) return null; const r = p.getBoundingClientRect(); for (let y = r.top + 6; y < r.bottom - 6; y += 8) for (let x = r.left + 8; x < r.right - 20; x += 8) { const hit = document.elementFromPoint(x, y); const pane = hit && hit.closest('.pane'); if (pane && pane.dataset.noteId === ${JSON.stringify(o)}) return { x, y }; } return null; })()`);
    const underFirst = drawn().at(-1) === o;
    await clickAt(eHead);
    await delay(700);
    const nowOver = covered === null ? null : await js<string | null>(`(() => { const hit = document.elementFromPoint(${covered?.x ?? 0}, ${covered?.y ?? 0}); const p = hit && hit.closest('.pane'); return p ? p.dataset.noteId : null; })()`);
    record(underFirst && covered !== null && drawn().at(-1) === e && nowOver === e, `a press on a note on every view lying under this view's own pane raises it above, and the store agrees (${e} over ${o}: ${nowOver}, top of the store ${drawn().at(-1)})`);

    // ---- 7. Escape leaves the notes on every view ----
    // With a focus the first Escape leaves it and the sweep is the next one
    // (FEAT-0017, decision 10). A press on a header only raises, so there is
    // none here; the guard is for a run where that changes.
    if ((await js<string | null>(`__t.glass().focusId()`)) !== null) await leaveFocus(ctx, win, js);
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
      // A desk drawn as cards shows only the notes its view lists. A feature handed to the Issues desk would
      // be in the store and on no screen, so since FEAT-0023 the handoff is refused: the panel answers that it
      // cannot show it, and nothing is put anywhere.
      const featuresBefore = JSON.stringify(viewCardsOf(store.getState(), ws, 'features'));
      const issuesBefore = JSON.stringify(own('issues'));
      const thrown = await js<string | null>(`(async () => {
        const g = window.__deckGlass;
        const id = [...document.querySelectorAll('#nav-list .nav-row[data-note-id]')].map((r) => r.dataset.noteId).find((n) => n.startsWith('FEAT-'));
        const card = id ? g.cardFor(id) : null;
        if (!card) return null;
        await g.hooks.throwTo({ kind: 'window', windowId: ${deskPanel.id}, carries: 'desk', label: 'desk on the main display', displayId: 0, view: 'issues' }, card, 'right');
        return id;
      })()`);
      await delay(700);
      const throwSaid = await js<string>(`__t.text('#status')`);
      record(
        thrown !== null && JSON.stringify(own('issues')) === issuesBefore && JSON.stringify(viewCardsOf(store.getState(), ws, 'features')) === featuresBefore && throwSaid.includes(`${thrown} stays here`) && throwSaid.includes(`does not list ${thrown}`),
        `a feature handed to a desk panel on Issues, which does not list it, is refused with the reason, and neither desk changes (${thrown}; the window said "${throwSaid.trim().slice(0, 240)}")`,
      );
    } finally {
      if (!deskPanel.isDestroyed()) deskPanel.destroy();
    }

    // ---- 8b. A note moved to a desk panel whose view lists it lands there, is drawn, and only then leaves this desk ----
    // Overview lists the features too. The note is held on the Features desk first, so there is a desk for it to leave.
    await view('features');
    const mover = await js<string | null>(`[...document.querySelectorAll('#nav-list .nav-row[data-note-id]')].map((r) => r.dataset.noteId).find((n) => n.startsWith('FEAT-')) || null`);
    store.dispatch({ type: 'put-on-desk', noteId: mover ?? '', x: 40, y: 40, viewId: 'features' });
    const overviewPanel = ctx.createWindow('satellite', `deck://${ws}/overview?panel=desk`, 'desk');
    overviewPanel.setBounds({ x: 1330, y: 0, width: 520, height: 420 });
    try {
      await once(overviewPanel, 'did-finish-load');
      await ctx.untilBooted(overviewPanel);
      await delay(1500);
      const heldBefore = viewCardsOf(store.getState(), ws, 'features').some((c) => c.noteId === mover);
      // What the panel had drawn when the note left the Features desk: the order is the rule being checked.
      let drawnWhenLeft: boolean | null = null;
      // The store here has no subscription, so it is watched: at the first look that finds the note gone
      // from the Features desk, the panel is asked whether it has drawn it.
      const watch = setInterval(() => {
        if (drawnWhenLeft !== null || viewCardsOf(store.getState(), ws, 'features').some((c) => c.noteId === mover)) return;
        drawnWhenLeft = false;
        void overviewPanel.webContents
          .executeJavaScript(`[...document.querySelectorAll('#desk .card:not([hidden])')].some((e) => e.dataset.noteId === ${JSON.stringify(mover)})`)
          .then((v) => { drawnWhenLeft = v === true; });
      }, 15);
      const stop = (): void => clearInterval(watch);
      await js(`(async () => {
        const g = window.__deckGlass;
        const card = g.cardFor(${JSON.stringify(mover)});
        if (!card) return null;
        await g.hooks.throwTo({ kind: 'window', windowId: ${overviewPanel.id}, carries: 'desk', label: 'desk on the main display', displayId: 0, view: 'overview', mode: 'move' }, card, 'right');
        return true;
      })()`);
      await delay(900);
      stop();
      const moveSaid = await js<string>(`__t.text('#status')`);
      const drawnThere = (await overviewPanel.webContents.executeJavaScript(`[...document.querySelectorAll('#desk .card:not([hidden])')].some((e) => e.dataset.noteId === ${JSON.stringify(mover)})`)) as boolean;
      record(
        mover !== null && heldBefore && own('overview').includes(mover) && drawnThere && drawnWhenLeft === true && !viewCardsOf(store.getState(), ws, 'features').some((c) => c.noteId === mover) && moveSaid.includes(`${mover} moved to the desk on the main display`),
        `a note moved to a desk panel on Overview, which lists it, is on that desk and drawn there, and it left the Features desk only after the panel had drawn it (${mover}; drawn there when it left: ${drawnWhenLeft}; the window said "${moveSaid.trim().slice(0, 160)}")`,
      );
      store.dispatch({ type: 'take-off-desk', noteId: mover ?? '', viewId: 'overview' });
    } finally {
      if (!overviewPanel.isDestroyed()) overviewPanel.destroy();
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
    // With the desk brought round. A note opened from a tile brings the desk
    // to where the person faces, and the collection is on the desk: left at
    // the front, it arrived over the very tile that had just been pressed,
    // and the pointer then rested on the list and not on the tile.
    await kit.face(Math.PI);
    await js(`document.getElementById('field').focus(); true`);
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
      // The note is put back before the pointer rests on its tile. A held
      // note is its document and has no tile (ISS-0070), and the document
      // opens across the middle of the field, over the place that was
      // clicked; back in its slot, the same tile is painted in the same place.
      store.dispatch({ type: 'clear-desk', scope: 'workspace' });
      await pointer(win, [{ type: 'move', x: 4, y: 4 }]);
      await delay(900);
      // 4. And the pointer says so before the click does: the cursor turns to
      // a pointer over a tile, and a callout names the note under it.
      //
      // This used to read `record(typeof cursor === 'string', ...)`, which
      // passes whatever the renderer does. It was the only cover for the
      // acceptance line "shows the pointer cursor", and it passed through a
      // release in which the handler that sets the cursor could not run at all
      // (ISS-0081, ISS-0083). A hover is a real pointer move, not a click.
      // The callout is `#edge-callout`, the one element both the orbit's links
      // and the field's tiles speak through; this read `#callout`, which no
      // page has ever had, and so would have stopped the run here.
      await pointer(win, [{ type: 'move', x: tile.x, y: tile.y, wait: 350 }]);
      const resting = await js<{ cursor: string; callout: string | null }>(
        `(() => { const c = document.getElementById('edge-callout'); return { cursor: getComputedStyle(document.getElementById('field')).cursor, callout: c.hidden ? null : c.textContent }; })()`,
      );
      record(resting.cursor === 'pointer', `resting on a tile shows the pointer cursor (${resting.cursor})`);
      record(
        resting.callout !== null && resting.callout.includes(tile.id),
        `resting on a tile names the note under it (${resting.callout ?? 'no callout'})`,
      );
      // And moving off it takes both away again.
      await pointer(win, [{ type: 'move', x: 4, y: 4, wait: 350 }]);
      const away = await js<{ cursor: string; hidden: boolean }>(
        `({ cursor: getComputedStyle(document.getElementById('field')).cursor, hidden: document.getElementById('edge-callout').hidden })`,
      );
      record(away.cursor !== 'pointer' && away.hidden, `moving off the tile takes the cursor and the callout away (${away.cursor})`);
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
    // Put back, so the shelf below is the whole shelf: the document it became
    // stands across the middle of the field, over the tiles the next checks press.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(900);

    // 5b. TASK-0083: and `p` on the shelf pulls that note to the FRONT band,
    // which is Edwin's "allow cards to be brought up to the active front
    // band". Before this the only route to a pull was to zoom a tile past the
    // promotion threshold, which a crowded shelf never reaches (ISS-0082), so
    // on a large workspace a finished note could not be pulled forward at all.
    // This is the keyboard route; the drag route is checked below it.
    const onShelf = await js<string | null>(`document.getElementById('quiet-cursor').focus(); __t.bands().cursor`);
    if (onShelf === null) {
      ctx.skip('pulling from the shelf: the quiet band has no cursor');
    } else {
      press(win, 'p');
      await delay(1000);
      const pulledSet = store.getState().session.pulled[prepared.id] ?? [];
      record(pulledSet.includes(onShelf), `p on the shelf pulls the finished note ${onShelf} forward (store: ${pulledSet.join(', ')})`);
      record(
        (await js<{ band: string } | null>(`__t.where(${JSON.stringify(onShelf)})`))?.band === 'front',
        `the finished note ${onShelf} stands in the front band, not on the desk`,
      );
      // Away and back, as the pull of a card is checked: the Features view
      // does not hold an issue, so "still in front" can only be read on the
      // view that does. This looked on Features, where the note has no place
      // at all; no run had got this far to say so, because the `#callout`
      // read above stopped it.
      await view('features');
      await delay(400);
      await view('issues');
      await delay(900);
      record(
        (await js<{ band: string } | null>(`__t.where(${JSON.stringify(onShelf)})`))?.band === 'front',
        `the pulled finished note is still in front after a view switch away and back`,
      );
      // Everything below — the drag, promotion, and the shape comparison
      // against `shapeBefore`, which was taken on Issues — reads the Issues
      // view facing the quiet band.
      await kit.face(Math.PI);
      await js(`document.getElementById('field').focus(); true`);
      await delay(600);
    }

    // 5c. TASK-0083: and a downward drag that BEGINS on a painted tile does
    // the same, while a drag that begins anywhere else still turns the field.
    // `__t.bands().tiles` reports each tile's CENTRE in the FIELD's own
    // coordinates, so a press needs the field's offset added and nothing else.
    // The first version of this check wrote `t.x + t.w / 2` and no offset,
    // which pressed a point that was neither the tile's centre nor, on a field
    // that is not at the window's origin, anywhere near the tile. The click
    // check above gets this right, and its "is anything in front of it" test
    // is reused here rather than restated.
    const dragTile = await js<{ id: string; x: number; y: number } | null>(
      `(() => {
        const f = document.getElementById('field').getBoundingClientRect();
        const held = new Set(window.__deckDesk());
        for (const t of __t.bands().tiles) {
          if (t.w <= 8 || t.h <= 6) continue;
          if (t.x < 120 || t.x > f.width - 120 || t.y < 120 || t.y > f.height - 160) continue;
          if (held.has(t.id)) continue;
          const x = Math.round(f.left + t.x);
          const y = Math.round(f.top + t.y);
          const over = __t.hit(x, y);
          if (typeof over !== 'string' || !over.startsWith('field')) continue;
          return { id: t.id, x, y };
        }
        return null;
      })()`,
    );
    if (dragTile === null) {
      ctx.skip('dragging from the shelf: no tile is painted clear of everything else');
    } else {
      await pointer(win, drag(dragTile, { x: dragTile.x, y: dragTile.y + 90 }, 10));
      await delay(1200);
      const draggedSet = store.getState().session.pulled[prepared.id] ?? [];
      record(draggedSet.includes(dragTile.id), `dragging the tile ${dragTile.id} downward pulls it forward (store: ${draggedSet.join(', ')})`);
      // And the turn still works from a tile. A DOWNWARD drag cannot tell us
      // that: `drag` interpolates in a straight line, so a drag that only goes
      // down has no horizontal travel and could never have turned the field
      // whatever the code does — the first version of this check asserted the
      // yaw had not moved, which was true by construction. A sideways drag
      // from the same kind of place is the one that can fail, and the one that
      // would catch a press on a tile swallowing the turn.
      const turnFrom = await js<{ x: number; y: number } | null>(
        `(() => {
          const f = document.getElementById('field').getBoundingClientRect();
          for (const t of __t.bands().tiles) {
            if (t.w <= 8 || t.x < 200 || t.x > f.width - 200) continue;
            const x = Math.round(f.left + t.x);
            const y = Math.round(f.top + t.y);
            const over = __t.hit(x, y);
            if (typeof over !== 'string' || !over.startsWith('field')) continue;
            return { x, y };
          }
          return null;
        })()`,
      );
      if (turnFrom === null) {
        ctx.skip('turning from a tile: no tile is painted clear of everything else');
      } else {
        const yawBefore = await js<number>(`window.__deckGlass.model.yaw`);
        await pointer(win, drag(turnFrom, { x: turnFrom.x - 220, y: turnFrom.y }, 12));
        await delay(900);
        const yawAfter = await js<number>(`window.__deckGlass.model.yaw`);
        record(
          Math.abs(yawAfter - yawBefore) > 0.05,
          `a sideways drag that begins on a tile still turns the field (yaw ${yawBefore.toFixed(3)} to ${yawAfter.toFixed(3)})`,
        );
      }
    }

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
    // TASK-0084: and it is laid out large enough to DRAW what its detail level
    // says it shows. It used to keep the tile's box and be magnified, so on a
    // large shelf a 58 by 16 element was asked for `full` and clipped by
    // `overflow: hidden` (ISS-0084). `scrollHeight` past `clientHeight` is the
    // browser saying the content did not fit.
    const fit = await js<Array<{ id: string; detail: string; w: number; h: number; over: number }>>(
      `[...document.querySelectorAll('.field-card[data-band="deep"]')].map((c) => ({
         id: c.dataset.noteId, detail: c.dataset.detail,
         w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height),
         over: c.scrollHeight - c.clientHeight,
       }))`,
    );
    const clipped = fit.filter((c) => c.over > 1);
    record(fit.length > 0 && clipped.length === 0, `every promoted card draws its ${fit[0]?.detail ?? '?'} without clipping it (${fit.length} promoted, ${clipped.length} clipped${clipped[0] === undefined ? '' : `, e.g. ${clipped[0].id} overflows by ${clipped[0].over}px in ${clipped[0].w}x${clipped[0].h}`})`);
    // And the box it was given is the one the shared rule says that level
    // needs, which is the same rule `detail.test.mjs` asserts.
    const wrong = fit.filter((c) => !holdsDetail({ width: c.w, height: c.h }, detailFor(c.w)));
    record(wrong.length === 0, `every promoted card's box holds the level its width earns (${wrong.length} short${wrong[0] === undefined ? '' : `, e.g. ${wrong[0].id} at ${wrong[0].w}x${wrong[0].h} for ${detailFor(wrong[0].w)}`})`);
    await js(`window.__deckGlass.zoomTo({ scale: 1, dx: 0, dy: 0 }); true`);
    await delay(500);
    const backDown = await js<number>(`__t.bands().promoted.length`);
    record(backDown === 0, `zooming back out paints them again (${backDown})`);

    // 7. Zoom adds detail to a card that is not in the quiet band.
    await kit.face(0);
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
    // This used to read `record(a !== b || true, ...)`, which passes whatever
    // the renderer does (ISS-0083). Two views can legitimately earn the same
    // shape, so comparing before and after is the wrong question. The right
    // one is whether the shapes the renderer holds are the shapes this deal's
    // own counts earn: `bandShapeFor` is the pure rule and it is shared, so
    // the run can compute what the answer should be and check it.
    const switched = await js<BandState>(`__t.bands()`);
    const owed = bandShapeFor('deep', switched.counts.deep);
    const held = switched.shapes['deep'];
    record(
      held !== undefined && held.columns === owed.columns && held.rows === owed.rows && held.width === owed.box.width && held.height === owed.box.height,
      `after a view switch the quiet band's shape is the one its ${switched.counts.deep} notes earn (${held?.columns}x${held?.rows} at ${held?.width}, owed ${owed.columns}x${owed.rows} at ${owed.box.width}; the two views ${shapeSwitched === shapeBefore ? 'earn the same shape here' : 'earn different shapes'})`,
    );
    // Whether the two views happen to earn the SAME shape is not asserted
    // either way: it depends on the workspace, and a run where they match is
    // not a failure. It is printed above as part of the owed-shape check's
    // message, which is the one that carries the claim.
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

// ---------------------------------------------------------------------------
// FEAT-0020: the list is an object on the field, and a note is read in its
// document. What the three parts below share.
// ---------------------------------------------------------------------------

/** One row of the sidecar's answer to "what may a person do to this note". */
export interface OfferedAction {
  verb: string;
  to: string;
  confirm: boolean;
  disabled: boolean;
  reason: string;
  endpoint: string;
}

/** A note the sidecar offers a person verbs on, with the answer it gave. */
export interface OfferedNote {
  id: string;
  rel: string;
  type: string;
  status: string;
  actions: OfferedAction[];
}

/** Every note Deck's own index holds, with the path it is stored at. Waits for the index to be built. */
export async function indexedNotes(origin: string, workspaceId: string): Promise<Array<{ id: string; rel: string }>> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const payload = (await (await fetch(`${origin}/deck/records/${workspaceId}`)).json()) as { building?: boolean; records?: Array<{ id?: unknown; relPath?: unknown }> };
    if (payload.building !== true) {
      return (payload.records ?? []).flatMap((r) => (typeof r.id === 'string' && typeof r.relPath === 'string' && !r.relPath.startsWith('__templates__/') ? [{ id: r.id, rel: r.relPath }] : []));
    }
    await delay(250);
  }
  return [];
}

/**
 * The notes the sidecar offers verbs on TODAY, found by asking it about each
 * note Deck's index holds, through the same proxied read a page makes.
 *
 * Asked rather than known. Which notes carry a verb is a fact about the day:
 * the checks that named ISS-0008 went red when that issue left `triage`, with
 * nothing wrong in Deck. And asked of the sidecar rather than worked out from
 * a note's type and status, because that table is the sidecar's and Deck
 * restates none of it (TST-0033), in a check as much as in the renderer.
 */
export async function notesOfferedVerbs(origin: string, workspaceId: string, most = Infinity): Promise<{ asked: number; found: OfferedNote[] }> {
  const found: OfferedNote[] = [];
  let asked = 0;
  for (const note of await indexedNotes(origin, workspaceId)) {
    asked += 1;
    let payload: { type?: unknown; status?: unknown; actions?: unknown };
    try {
      payload = (await (await fetch(`${origin}/deck/sidecar/${workspaceId}/api/notes/actions?id=${encodeURIComponent(note.id)}`)).json()) as typeof payload;
    } catch {
      continue;
    }
    const actions: OfferedAction[] = (Array.isArray(payload.actions) ? payload.actions : []).flatMap((entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) return [];
      const row = entry as Record<string, unknown>;
      if (typeof row['verb'] !== 'string' || row['verb'] === '') return [];
      return [{ verb: row['verb'], to: typeof row['to'] === 'string' ? row['to'] : '', confirm: row['confirm'] === true, disabled: row['disabled'] === true, reason: typeof row['reason'] === 'string' ? row['reason'] : '', endpoint: typeof row['endpoint'] === 'string' ? row['endpoint'] : '' }];
    });
    if (actions.length === 0) continue;
    found.push({ id: note.id, rel: note.rel, type: String(payload.type ?? ''), status: String(payload.status ?? ''), actions });
    if (found.length >= most) break;
  }
  return { asked, found };
}

/** What a document holds, read in its page. */
type DocumentRead = {
  state: string;
  chars: number;
  /** Its text is, character for character, what the sidecar renders for the note's path. */
  same: boolean;
  article: boolean;
  title: string;
  id: string;
  status: string;
  head: string;
  label: string;
  faces: number;
  verbs: Array<{ verb: string; disabled: boolean; confirm: string | null }>;
  whys: string[];
  actionsShown: boolean;
  actionsInside: boolean;
  ticks: number;
  ticksAfterTheirBox: number;
  boxes: number;
  stripVerbs: number;
  readerTicks: number;
};

/**
 * Page code that reads one document: its state, its heading, the verbs and
 * ticks inside it, and whether its text is the note's. The text is compared
 * with what the sidecar renders for the same path, read again by the page,
 * with the tick controls Deck adds taken out of the copy that is compared.
 */
function readDocument(workspaceId: string, id: string, rel: string | null): string {
  return `(async () => {
    const p = document.querySelector('.pane[data-note-id="${id}"]');
    if (!p) return null;
    const note = p.querySelector('.pane-body article.pane-note');
    const actions = p.querySelector('.pane-body .pane-actions');
    const rel = ${JSON.stringify(rel)};
    let same = false;
    if (note && rel !== null) {
      const payload = await fetch('/deck/sidecar/${workspaceId}/api/render?path=' + encodeURIComponent(rel)).then((r) => r.json()).catch(() => null);
      if (payload && typeof payload.html === 'string') {
        const want = document.createElement('div');
        want.innerHTML = payload.html;
        const got = note.cloneNode(true);
        got.querySelectorAll('.tick, .no-tick').forEach((e) => e.remove());
        same = want.textContent.trim().length > 0 && got.textContent === want.textContent;
      }
    }
    const ticks = note ? [...note.querySelectorAll('button.tick')] : [];
    const boxes = note ? [...note.querySelectorAll('input[type="checkbox"]')].filter((b) => b.dataset.raw !== undefined && !b.checked) : [];
    const verbs = actions ? [...actions.querySelectorAll('button.verb')] : [];
    const head = p.querySelector('.pane-head');
    return {
      state: p.dataset.state || '', chars: note ? note.textContent.trim().length : 0, same, article: !!note,
      title: p.querySelector('.pane-title').textContent, id: p.querySelector('.pane-id').textContent, status: p.querySelector('.pane-status').textContent,
      head: head.textContent, label: head.getAttribute('aria-label') || '', faces: p.querySelectorAll('.pane-face').length,
      verbs: verbs.map((b) => ({ verb: b.textContent, disabled: b.disabled, confirm: b.dataset.confirm === undefined ? null : b.dataset.confirm })),
      whys: actions ? [...actions.querySelectorAll('.why')].map((e) => e.textContent) : [],
      actionsShown: !!actions && !actions.hidden && getComputedStyle(actions).display !== 'none', actionsInside: !!actions && p.contains(actions),
      ticks: ticks.length, ticksAfterTheirBox: ticks.filter((t) => boxes.includes(t.previousElementSibling)).length, boxes: boxes.length,
      stripVerbs: document.querySelectorAll('#actuators button.verb').length, readerTicks: document.querySelectorAll('#reader button.tick').length,
    };
  })()`;
}

/** Page code that opens the note stored at a path as a document, by name: resolves to its id, or null when Deck has no note there. */
function openByPath(rel: string): string {
  return `window.__deckGlass.hooks.cardByRel(${JSON.stringify(rel)}).then((c) => (c ? window.__deckGlass.lift(c).then(() => c.noteId) : null))`;
}

/**
 * Wait until a document has been read, or has said it cannot be: its state,
 * or '' when there is no such document. `missing` is waited through, because
 * a note the view does not hold says that until Deck's index has answered for
 * it; a document still saying it after six seconds is returned as missing.
 */
async function untilRead(js: Js, id: string, tries = 40): Promise<string> {
  let state = '';
  for (let i = 0; i < tries; i += 1) {
    state = await js<string>(`(document.querySelector('.pane[data-note-id="${id}"]') || { dataset: {} }).dataset.state || ''`);
    if (state === 'ready' || state === 'error' || state === 'stale') return state;
    await delay(150);
  }
  return state;
}

/** Every note the sidecar returns for a view, each once: the collection's members. */
async function viewMembers(origin: string, workspaceId: string, mode: string): Promise<Set<string>> {
  const nav = (await (await fetch(`${origin}/deck/sidecar/${workspaceId}/api/cockpit/nav?mode=${encodeURIComponent(mode)}`)).json()) as { groups?: Array<{ items?: unknown[] }> };
  const members = new Set<string>();
  const walk = (items: unknown[]): void => {
    for (const raw of items) {
      const item = raw as { id?: unknown; children?: unknown[]; items?: unknown[] };
      if (typeof item.id === 'string' && item.id !== '') members.add(item.id);
      walk(item.children ?? item.items ?? []);
    }
  };
  for (const group of nav.groups ?? []) walk(group.items ?? []);
  return members;
}

/**
 * Page code that finds, in an open document, a link to another note that can
 * be pressed: in view inside the document after scrolling to it, and first
 * under the pointer. `only`, when given, is the paths the link may name.
 */
function linkIn(id: string, only: string[] | null): string {
  return `(() => {
    const body = document.querySelector('.pane[data-note-id="${id}"] .pane-body');
    if (!body) return null;
    const only = ${only === null ? 'null' : `new Set(${JSON.stringify(only)})`};
    const held = new Set([...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId));
    const b = body.getBoundingClientRect();
    for (const a of body.querySelectorAll('.pane-note a[href^="/docs/"]')) {
      let rel = '';
      try { rel = decodeURIComponent(a.getAttribute('href').slice(6).split('#')[0]); } catch (e) { continue; }
      if (only !== null && !only.has(rel)) continue;
      if (held.has((a.textContent || '').trim())) continue;
      body.scrollTop += a.getBoundingClientRect().top - b.top - 80;
      const r = a.getClientRects()[0];
      if (!r || r.width === 0 || r.top <= b.top || r.bottom >= b.bottom) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest('a') === a) return { href: a.getAttribute('href'), rel, x, y };
    }
    return null;
  })()`;
}

/** Page code that records every state each document passes through, from now until `ms` have gone. */
function statesFor(ms: number): string {
  return `new Promise((resolve) => { const seen = {}; const t0 = performance.now(); const look = () => { for (const p of document.querySelectorAll('.pane')) { const id = p.dataset.noteId; const st = p.dataset.state || ''; if (!seen[id]) seen[id] = []; if (seen[id][seen[id].length - 1] !== st) seen[id].push(st); } if (performance.now() - t0 < ${ms}) requestAnimationFrame(look); else resolve(seen); }; look(); })`;
}

/** The notes the document and served parts read verbs and ticks on, found once per run. */
let offeredOnce: Promise<{ asked: number; found: OfferedNote[] }> | null = null;

/**
 * FEAT-0020: the view's list is an object on the field (TASK-0095, TASK-0096).
 *
 * Until FEAT-0020 the list was a fixed column beside the field and nothing
 * here existed. What is checked is what a person can do to the object and
 * what the store keeps of it: where it stands, how large it is and whether it
 * is collapsed, for each view, and never one of its rows. Its count is the
 * exact number of notes the view's source returns.
 */
async function recordCollection(kit: Kit): Promise<void> {
  const { ctx, win, js, record, deskIds } = kit;
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const origin = new URL(win.webContents.getURL()).origin;
  const VIEW = 'features';
  type Layout = { x: number; y: number; w: number; h: number; collapsed: boolean; presentation: string };
  const stored = (): Layout | undefined => store.getState().collections[ws]?.[VIEW] as Layout | undefined;
  const near = (a: number, b: number, by = 1): boolean => Math.abs(a - b) <= by;
  const said = (c: CollectionSeen): string => `${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)} by ${Math.round(c.h)}`;
  const kept = (): string => { const l = stored(); return l === undefined ? 'nothing' : `${l.x},${l.y} ${l.w} by ${l.h}${l.collapsed ? ', collapsed' : ''}`; };
  const yawNow = (): Promise<number> => js(`__t.yaw()`);
  await kit.fresh(VIEW);
  ctx.focusApp(win);
  try {
    // ---- 1. It stands in the field, with the list inside it ----
    const field = await js<Box & { width: number; height: number }>(`__t.rect('#field')`);
    const c0 = await kit.collection();
    const beside = await js<{ column: boolean; reader: boolean }>(`({ column: [...document.querySelectorAll('.body > .navigator')].some((e) => getComputedStyle(e).display !== 'none'), reader: __t.shown('#reader') })`);
    const stored0 = stored();
    record(
      c0.inField && c0.listInside && c0.shown && !beside.column && !beside.reader && stored0 === undefined && near(c0.x, 12) && near(c0.y, 12) && c0.w === 340 && near(c0.h, field.height - 24),
      `the list is an object in the field and not a column beside it: with nothing stored for the view (${kept()}) it stands at ${said(c0)} in a field of ${Math.round(field.width)} by ${Math.round(field.height)}, with the search box and the rows inside it (in the field ${c0.inField}, the list inside ${c0.listInside}, a column beside the field ${beside.column})`,
    );

    // ---- 2. Its count is exact: the notes the view's source returns ----
    const members = await viewMembers(origin, ws, VIEW);
    const label = await js<string>(`(document.querySelector('#switcher button[aria-selected="true"]') || {}).textContent || ''`);
    record(
      members.size > 0 && c0.name === label && label !== '' && c0.count === `${members.size} notes`,
      `its header names the view and counts exactly the notes the sidecar returns for it: "${c0.name}", "${c0.count}" for ${members.size} notes in the source`,
    );
    // And it says where its members are: how many the field has a place for,
    // and how many can be reached only through the list. Counted here from
    // the field's own deal, for the view on screen.
    const inField = await js<number>(`(() => { const placed = __t.glass().placedIds(); return window.__deckCollection.members().filter((id) => placed.has(id)).length; })()`);
    const wanted = inField === members.size ? `all ${members.size} have a place in the field` : `${inField} have a place in the field · ${members.size - inField} are in this list only`;
    record(
      inField > 0 && c0.places === wanted,
      `it says where its members are, as the field has dealt them: "${c0.places}", and the field has a place for ${inField} of the ${members.size}`,
    );

    // ---- 3. Typing in its search box narrows it, and the header says by how much ----
    const search = await js<{ x: number; y: number } | null>(`__t.rect('#search')`);
    if (search === null) {
      record(false, 'collection: the search box is in reach');
    } else {
      await pointer(win, click(search));
      for (const letter of 'gla') {
        press(win, letter);
        await delay(60);
      }
      await delay(900);
      const narrowed = await kit.collection();
      const zoomed = await js<number>(`__t.glass().zoom().scale`);
      const of = /^(\d+) of (\d+) notes$/.exec(narrowed.count);
      for (let i = 0; i < 3; i += 1) {
        press(win, 'Backspace');
        await delay(60);
      }
      await delay(900);
      const cleared = await kit.collection();
      await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
      record(
        of !== null && Number(of[2]) === members.size && Number(of[1]) > 0 && Number(of[1]) < members.size && narrowed.filter.includes('gla') && zoomed === 1 && cleared.count === `${members.size} notes` && cleared.filter === '',
        `three letters typed into its search box narrow it and the header says how many of how many, and by what ("${narrowed.count}", "${narrowed.filter}"), without zooming the field (${zoomed}×); deleted again, it is whole ("${cleared.count}")`,
      );
    }

    // ---- 4. Dragged by its corner it is resized, and the store keeps the size ----
    // Made shorter first: a collection as tall as the field is drawn wholly
    // inside it, so one moved down would be drawn higher than it is stored.
    const corner = await js<{ x: number; y: number } | null>(`__t.rect('#collection-resize')`);
    if (corner === null) throw new Error('the collection has no corner to drag');
    await pointer(win, [...drag(corner, { x: corner.x + 60, y: corner.y - 100 }, 8), { type: 'move', ...PARK }]);
    await delay(500);
    const sized = await kit.collection();
    const sizedTo = stored();
    record(
      near(sized.w, c0.w + 60) && near(sized.h, c0.h - 100) && near(sized.x, c0.x) && near(sized.y, c0.y) && sizedTo !== undefined && sizedTo.w === 400 && near(sizedTo.h, c0.h - 100) && sizedTo.x === 12 && sizedTo.y === 12 && sizedTo.collapsed === false,
      `dragged 60 by -100 by its corner it is resized by that much and stays where it was (${said(c0)} to ${said(sized)}), and the store holds the size for this view (${kept()})`,
    );

    // ---- 5. Dragged by its header it moves ----
    const name = await js<{ x: number; y: number } | null>(`__t.rect('#collection-name')`);
    if (name === null) throw new Error('the collection has no header to drag');
    await pointer(win, [...drag(name, { x: name.x + 30, y: name.y + 40 }, 8), { type: 'move', ...PARK }]);
    await delay(500);
    const moved = await kit.collection();
    const movedTo = stored();
    record(
      near(moved.x, sized.x + 30) && near(moved.y, sized.y + 40) && near(moved.w, sized.w) && near(moved.h, sized.h) && movedTo !== undefined && sizedTo !== undefined && movedTo.x === 42 && movedTo.y === 52 && movedTo.w === sizedTo.w && movedTo.h === sizedTo.h,
      `dragged 30 by 40 by its header it moves that far and keeps its size (${said(sized)} to ${said(moved)}; stored ${kept()})`,
    );
    const everything = JSON.stringify(store.getState().collections);
    const namesARow = [...members].filter((id) => everything.includes(id));
    record(
      movedTo !== undefined && Object.keys(movedTo).sort().join(' ') === 'collapsed h presentation w x y' && namesARow.length === 0,
      `what the store keeps of a collection is where it stands and how it is presented, and none of its rows: its keys are "${movedTo === undefined ? 'nothing' : Object.keys(movedTo).sort().join(' ')}", and no note of the view is named in it (${namesARow.slice(0, 3).join(', ') || 'none'})`,
    );

    // ---- 6. The keyboard on its header moves it, resizes it and collapses it, and the field is not turned ----
    const yawBefore = await yawNow();
    await js(`document.getElementById('collection-head').focus(); true`);
    press(win, 'Right');
    await delay(400);
    press(win, 'Down', ['alt']);
    await delay(400);
    const keyed = await kit.collection();
    const keyedTo = stored();
    const yawAfter = await yawNow();
    record(
      keyedTo !== undefined && movedTo !== undefined && keyedTo.x === movedTo.x + 16 && keyedTo.y === movedTo.y && keyedTo.w === movedTo.w && keyedTo.h === movedTo.h + 16 && near(keyed.x, moved.x + 16) && near(keyed.h, moved.h + 16),
      `an arrow key on its header moves it 16 px and Alt with an arrow resizes it by 16 (${said(moved)} to ${said(keyed)}; stored ${kept()})`,
    );
    record(Math.abs(yawAfter - yawBefore) < 1e-9, `and those keys are the collection's own: the field is not turned by them (${yawBefore.toFixed(3)} to ${yawAfter.toFixed(3)})`);
    press(win, 'Return');
    await delay(600);
    const shut = await kit.collection();
    const shutTo = stored();
    press(win, 'Return');
    await delay(700);
    const open = await kit.collection();
    const openTo = stored();
    record(
      shutTo?.collapsed === true && shut.collapsed && near(shut.h, 34) && !shut.listShown && shut.expanded === 'false' && shut.count === `${members.size} notes` && shut.name === label &&
        shutTo.w === keyedTo?.w && shutTo.h === keyedTo?.h && openTo?.collapsed === false && !open.collapsed && open.listShown && open.expanded === 'true' && near(open.w, keyed.w) && near(open.h, keyed.h),
      `Enter on its header collapses it to the header alone, which still names the view and its exact count (${Math.round(shut.h)} px tall, "${shut.name}", "${shut.count}", the list drawn: ${shut.listShown}), and the store says so and keeps the size (${shutTo?.w} by ${shutTo?.h}, collapsed ${shutTo?.collapsed}); Enter again opens it at that size (${said(open)})`,
    );
    const fold = await js<{ x: number; y: number } | null>(`__t.rect('#collection-fold')`);
    if (fold !== null) {
      await pointer(win, [...click(fold), { type: 'move', ...PARK }]);
      await delay(600);
    }
    const byButton = stored()?.collapsed;
    if (fold !== null) {
      await pointer(win, [...click(fold), { type: 'move', ...PARK }]);
      await delay(600);
    }
    record(fold !== null && byButton === true && stored()?.collapsed === false, `its ▾ button, pressed, does the same (collapsed ${byButton}, then ${stored()?.collapsed})`);

    // ---- 7. Turned away from, it is dimmed by a veil, and "collection" brings it back ----
    const turnFrom = await js<{ x: number; y: number } | null>(`__t.blank(320)`);
    if (turnFrom === null) {
      record(false, 'collection: a point of the field with nothing on it, to turn from');
    } else {
      const before = await kit.collection();
      const offeredBefore = await js<boolean>(`__t.shown('#to-collection')`);
      // 290 px is about 70 degrees: still in sight, and dimmed.
      await pointer(win, [...drag(turnFrom, { x: turnFrom.x - 290, y: turnFrom.y }, 16), { type: 'move', ...PARK }]);
      await delay(500);
      const away = await kit.collection();
      const yawAway = await yawNow();
      const offered = await js<{ x: number; y: number } | null>(`__t.shown('#to-collection') ? __t.rect('#to-collection') : null`);
      record(
        !offeredBefore && Math.abs(yawAway) > 1 && Math.abs(away.x - before.x) > 150 && away.veil > 0.4 && away.veil < 1 && away.opaque && !away.outOfSight && offered !== null,
        `turning the field ${yawAway.toFixed(2)} radians carries the collection ${Math.round(away.x - before.x)} px with the desk and dims it under a veil of ${away.veil.toFixed(2)} while it stays opaque (${away.opaque}); "collection" is offered then (${offered !== null}) and was not before (${offeredBefore})`,
      );
      if (offered !== null) await pointer(win, [...click(offered), { type: 'move', ...PARK }]);
      await delay(700);
      const back = await kit.collection();
      const on = await js<Active>(`__t.active()`);
      record(
        offered !== null && near(back.x, before.x) && near(back.y, before.y) && back.veil === 0 && !back.outOfSight && Math.abs((await yawNow()) - yawAway) < 1e-9 && !(await js<boolean>(`__t.shown('#to-collection')`)) && (on.on === 'search' || on.on === 'row'),
        `"collection", pressed, brings it back in front where it stood (${said(back)}, veil ${back.veil}) without turning the field (yaw still ${yawAway.toFixed(2)}), puts the keyboard in it (on ${on.on}), and is no longer offered`,
      );
      await kit.face(0);
    }

    // ---- 8. A document lies over it until it is pressed, and "collection" is the way to it then ----
    const row = (await js<RowSeen[]>(`__t.rows()`))[0];
    if (row === undefined) {
      record(false, 'collection: a row was in reach, to open a note from');
    } else {
      await pointer(win, [...click(row), { type: 'move', ...PARK }]);
      await delay(1500);
      const list = await kit.collection();
      // Moved over the list, as a person drags it there.
      store.dispatch({ type: 'move-card', noteId: row.id, x: Math.round(list.x) + 30, y: Math.round(list.y) + 60 });
      await delay(700);
      const at = await js<{ x: number; y: number }>(`(() => { const r = document.getElementById('nav-list').getBoundingClientRect(); return { x: r.left + 150, y: r.top + r.height / 2 }; })()`);
      const over = (): Promise<string> => js(`(() => { const e = document.elementFromPoint(${at.x}, ${at.y}); return e ? (e.closest('.pane') ? 'document' : e.closest('.collection') ? 'collection' : 'other') : 'nothing'; })()`);
      const covered = { over: await over(), offered: await js<{ x: number; y: number } | null>(`__t.shown('#to-collection') ? __t.rect('#to-collection') : null`), z: (await kit.collection()).z };
      if (covered.offered !== null) await pointer(win, [...click(covered.offered), { type: 'move', ...PARK }]);
      await delay(600);
      const raised = { over: await over(), offered: await js<boolean>(`__t.shown('#to-collection')`), z: (await kit.collection()).z };
      // A press on the document puts it over the list again.
      const body = await js<{ x: number; y: number } | null>(`(() => { const p = document.querySelector('.pane[data-note-id="${row.id}"]'); if (!p) return null; const r = p.getBoundingClientRect(); for (let y = r.bottom - 12; y > r.top + 60; y -= 14) for (let x = r.right - 16; x > r.left + 8; x -= 14) { const e = document.elementFromPoint(x, y); if (e && e.closest('.pane') === p && !e.closest('a, button')) return { x, y }; } return null; })()`);
      if (body !== null) await pointer(win, [...click(body), { type: 'move', ...PARK }]);
      await delay(600);
      const lowered = { over: await over(), offered: await js<boolean>(`__t.shown('#to-collection')`) };
      record(
        deskIds().includes(row.id) && covered.over === 'document' && covered.offered !== null && raised.over === 'collection' && !raised.offered && raised.z > covered.z && body !== null && lowered.over === 'document' && lowered.offered,
        `a document moved over the list lies on top of it (${covered.over} at a point of the list) and "collection" is offered (${covered.offered !== null}); pressed, it puts the list over the document (${raised.over}) and goes (${!raised.offered}); and a press on the document puts the document over the list again (${lowered.over}, "collection" offered again: ${lowered.offered})`,
      );

      // ---- 9. A field narrower than 720 px shows one object in front, and stores nothing ----
      const layoutWas = JSON.stringify(stored());
      const deskWas = JSON.stringify(deskCardsOf(store.getState(), ws));
      win.setBounds({ x: 0, y: 0, width: 780, height: 860 });
      await delay(1200);
      type Narrow = { field: number; bar: string[] | null; shown: string[]; pane: { left: number; top: number; width: number } | null; compass: boolean; overflow: boolean };
      const narrowNow = (): Promise<Narrow> =>
        js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const bar = document.getElementById('narrow-bar'); const shown = [...document.querySelectorAll('.pane')].filter((p) => getComputedStyle(p).visibility !== 'hidden'); const r = shown[0] ? shown[0].getBoundingClientRect() : null; return { field: f.width, bar: bar.hidden ? null : [...bar.querySelectorAll('button')].map((b) => b.dataset.object + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), shown: shown.map((p) => p.dataset.noteId + (p.classList.contains('narrow') ? '' : ' (not narrow)')), pane: r ? { left: r.left - f.left, top: r.top - f.top, width: r.width } : null, compass: __t.shown('#compass'), overflow: document.documentElement.scrollWidth > window.innerWidth }; })()`);
      const arrived = await narrowNow();
      // Which object is in front when the window narrows depends on what was
      // pressed last; each is asked for by name on the bar.
      const toNote = await js<{ x: number; y: number } | null>(`__t.rect('#narrow-bar button[data-object="${row.id}"]')`);
      if (toNote !== null) await pointer(win, [...click(toNote), { type: 'move', ...PARK }]);
      await delay(800);
      const narrow = await narrowNow();
      const listBehind = await kit.collection();
      const toList = await js<{ x: number; y: number } | null>(`__t.rect('#narrow-bar button[data-object="collection"]')`);
      if (toList !== null) await pointer(win, [...click(toList), { type: 'move', ...PARK }]);
      await delay(800);
      const narrowList = await narrowNow();
      const listFront = await kit.collection();
      record(
        arrived.bar !== null && arrived.bar.filter((b) => b.endsWith('*')).length === 1 && toNote !== null && narrow.field < 720 && narrow.bar !== null && narrow.bar.join(' ') === `collection ${row.id}*` && narrow.shown.join() === row.id && narrow.pane !== null && near(narrow.pane.left, 0) && near(narrow.pane.top, 36) && near(narrow.pane.width, narrow.field) && !listBehind.shown && !narrow.compass && !narrow.overflow,
        `in a field ${Math.round(narrow.field)} px wide one object is in front, and a bar names the collection and each open note (${arrived.bar === null ? 'no bar' : arrived.bar.join(', ')}); the note's button puts its document in front, filling the field under the bar (${narrow.bar === null ? 'no bar' : narrow.bar.join(', ')}; drawn: ${narrow.shown.join(', ') || 'no document'}, ${narrow.pane === null ? 'nowhere' : `${Math.round(narrow.pane.width)} px wide at ${Math.round(narrow.pane.left)},${Math.round(narrow.pane.top)}`}), with the list not drawn behind it (${listBehind.shown}), the compass hidden (${narrow.compass}) and nothing wider than the window (${narrow.overflow})`,
      );
      record(
        toList !== null && narrowList.bar !== null && narrowList.bar.join(' ') === `collection* ${row.id}` && narrowList.shown.length === 0 && listFront.shown && listFront.narrow && near(listFront.x, 0) && near(listFront.w, narrow.field) && listFront.count === `${members.size} notes` &&
          JSON.stringify(stored()) === layoutWas && JSON.stringify(deskCardsOf(store.getState(), ws)) === deskWas,
        `"Collection" on that bar puts the list in front at the field's width with the same exact count (${Math.round(listFront.w)} px, "${listFront.count}", ${narrowList.shown.length} documents drawn), and the narrow window stored nothing: the collection's place and the document's are what they were`,
      );
      win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
      await delay(1200);
      const wideAgain = await kit.collection();
      const docAgain = await js<PaneSeen | null>(`__t.pane(${JSON.stringify(row.id)})`);
      const cardNow = deskCardsOf(store.getState(), ws).find((c) => c.noteId === row.id);
      record(
        !(await js<boolean>(`__t.shown('#narrow-bar')`)) && !wideAgain.narrow && near(wideAgain.x, open.x) && near(wideAgain.w, open.w) && near(wideAgain.h, open.h) && docAgain !== null && !docAgain.narrow && cardNow !== undefined && docAgain.width === cardNow.w && docAgain.height === cardNow.h,
        `made wide again, the bar goes and each object is at the place and size the store kept (the collection ${said(wideAgain)}, the document ${docAgain === null ? 'not drawn' : `${Math.round(docAgain.width)} by ${Math.round(docAgain.height)}`})`,
      );
    }
  } finally {
    win.setBounds({ x: 0, y: 0, width: 1320, height: 860 });
    kit.forgetCollection(VIEW);
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(700);
  }
}

/**
 * FEAT-0020: a note is read in its document (TASK-0097, TASK-0098).
 *
 * Opening a note is reading it: the document holds the whole authored text,
 * the verbs the sidecar allows and a tick for each open criterion, where the
 * reader column and its strip of verbs used to hold them. What is checked is
 * that the text is the note's own, that a failed read says so and can be
 * tried again, that a second press made while a document is still growing
 * lands on the row it was aimed at, and the order Escape ends things in.
 *
 * On a page of its own: the part starts with a reload, so no note has been
 * read yet and a read that is made to fail is really made.
 */
async function recordDocument(kit: Kit): Promise<void> {
  const { ctx, win, js, boot, record, deskIds } = kit;
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const origin = new URL(win.webContents.getURL()).origin;
  const VIEW = 'features';
  const sweep = async (): Promise<void> => {
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(800);
    await pointer(win, [{ type: 'move', ...PARK }]);
  };
  const rows = (skip: string[] = []): Promise<RowSeen[]> => js(`__t.rows(${JSON.stringify(skip)})`);
  const rels = new Map((await indexedNotes(origin, ws)).map((n) => [n.id, n.rel]));
  const read = (id: string): Promise<DocumentRead | null> => js(readDocument(ws, id, rels.get(id) ?? null));
  let blocking = false;
  win.webContents.reload();
  await boot();
  await kit.fresh(VIEW);
  ctx.focusApp(win);
  try {
    // ---- 1. A read that fails says so, and retry reads the note ----
    // Every request for a note's text is refused on its way out of the page,
    // which is what a sidecar that has stopped answering looks like to it.
    win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: blocking && /\/api\/render\?/.test(details.url) }));
    const victim = (await rows())[0];
    if (victim === undefined) {
      record(false, 'document: a row was in reach, to open a note from');
      return;
    }
    blocking = true;
    await pointer(win, [...click(victim), { type: 'move', ...PARK }]);
    await delay(600);
    const failedState = await untilRead(js, victim.id);
    type Failed = { state: string; said: string; shown: boolean; buttons: string[]; chars: number; title: string; busy: string | null };
    const failedNow = (): Promise<Failed | null> =>
      js(`(() => { const p = document.querySelector('.pane[data-note-id="${victim.id}"]'); if (!p) return null; const s = p.querySelector('.pane-state'); return { state: p.dataset.state || '', said: s.querySelector('p') ? s.querySelector('p').textContent : '', shown: !s.hidden && getComputedStyle(s).display !== 'none', buttons: [...s.querySelectorAll('button')].map((b) => b.textContent), chars: p.querySelector('.pane-note').textContent.length, title: p.querySelector('.pane-title').textContent, busy: p.querySelector('.pane-body').getAttribute('aria-busy') }; })()`);
    const failed = await failedNow();
    record(
      failedState === 'error' && failed !== null && failed.shown && failed.said.startsWith(`${victim.id} could not be read: `) && failed.buttons.join() === 'retry,close' && failed.chars === 0 && failed.title.length > 0 && failed.busy === 'false' && deskIds().includes(victim.id),
      `when a note's text cannot be read its document still opens, named ("${failed?.title ?? ''}"), says so in place of the text ("${failed?.said.slice(0, 70) ?? ''}") and offers ${failed?.buttons.join(' and ') || 'nothing'}; it shows no text and no "reading" line (${failed?.state ?? 'no document'}, ${failed?.chars ?? -1} characters)`,
    );
    blocking = false;
    const retry = await js<{ x: number; y: number } | null>(`(() => { const b = document.querySelector('.pane[data-note-id="${victim.id}"] .pane-state button[data-act="retry"]'); if (!b) return null; b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (retry !== null) await pointer(win, [...click(retry), { type: 'move', ...PARK }]);
    await delay(300);
    const retriedState = await untilRead(js, victim.id);
    await delay(500);
    const retried = await read(victim.id);
    const stateGone = await js<boolean>(`!__t.shown('.pane[data-note-id="${victim.id}"] .pane-state')`);
    record(
      retry !== null && retriedState === 'ready' && retried !== null && retried.same && retried.chars > 20 && stateGone,
      `"retry", pressed, reads the note, and its text takes the place of the message (${retriedState}, ${retried?.chars ?? 0} characters, the note's own: ${retried?.same ?? false})`,
    );
    await sweep();

    // ---- 2. A row opens a document that holds the note's own text, under its title ----
    const first = (await rows([victim.id]))[0];
    if (first === undefined) {
      record(false, 'document: a second row was in reach, to open a note from');
      return;
    }
    const rowTitle = await js<string>(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((e) => !e.hidden && e.dataset.noteId === ${JSON.stringify(first.id)}); return r ? r.querySelector('.label').textContent : ''; })()`);
    await pointer(win, [...click(first), { type: 'move', ...PARK }]);
    await delay(400);
    const firstState = await untilRead(js, first.id);
    await delay(700);
    const doc = await read(first.id);
    const beside = await js<{ reader: boolean; strip: boolean; reading: boolean }>(`({ reader: __t.shown('#reader'), strip: __t.shown('#actuators'), reading: document.body.classList.contains('reading') })`);
    const rel = rels.get(first.id) ?? '';
    record(
      firstState === 'ready' && doc !== null && doc.article && doc.same && doc.chars > 20 && rel !== '' && !beside.reader && !beside.strip && !beside.reading,
      `a row pressed with the pointer opens ${first.id} as a document whose text is, character for character, what the sidecar renders for ${rel} (${doc?.chars ?? 0} characters, the same: ${doc?.same ?? false}); nothing is read beside the field (a reader ${beside.reader}, its strip of verbs ${beside.strip})`,
    );
    record(
      doc !== null && doc.title === rowTitle && rowTitle !== '' && doc.id === first.id && doc.status !== '' && doc.faces === 0 && !doc.head.includes(rel) && !/\.md\b/.test(doc.head) && doc.label.includes(`stored at ${rel}`),
      `its heading is the note's title, then its id and its status ("${doc?.title ?? ''}", "${doc?.id ?? ''}", "${doc?.status ?? ''}"); the path it is stored at is not in the heading, and is in the name a screen reader is given`,
    );
    const info = await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${first.id}"] .pane-info')`);
    if (info !== null) await pointer(win, [...click(info), { type: 'move', ...PARK }]);
    await delay(500);
    const details = await js<{ shown: boolean; text: string; expanded: string | null }>(`(() => { const p = document.querySelector('.pane[data-note-id="${first.id}"]'); const d = p.querySelector('.pane-details'); return { shown: !d.hidden, text: d.textContent, expanded: p.querySelector('.pane-info').getAttribute('aria-expanded') }; })()`);
    record(info !== null && details.shown && details.expanded === 'true' && details.text.includes('stored at') && details.text.includes(rel), `"details", pressed, is where the path is ("${details.text.slice(0, 80)}")`);

    // ---- 3. Escape ends one thing at a time: the open list or details, then the focus, then the desk ----
    // With the details open, the related list is opened too, and the keyboard
    // is put on the document's header: in the document, and in neither panel.
    const related = await js<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${first.id}"] .pane-related')`);
    if (related !== null) await pointer(win, [...click(related), { type: 'move', ...PARK }]);
    await delay(700);
    type Ended = { list: boolean; details: boolean; focus: string | null; held: number; seated: number; on: Active };
    const ended = (): Promise<Ended> =>
      js(`(() => { const p = document.querySelector('.pane[data-note-id="${first.id}"]'); return { list: !!p && !p.querySelector('.pane-links').hidden, details: !!p && !p.querySelector('.pane-details').hidden, focus: __t.glass().focusId(), held: window.__deckDesk().length, seated: document.querySelectorAll('.field-card.seated:not(.leaving)').length, on: __t.active() }; })()`);
    await js(`document.querySelector('.pane[data-note-id="${first.id}"] .pane-head').focus(); true`);
    const e0 = await ended();
    const steps: Ended[] = [];
    for (let i = 0; i < 4; i += 1) {
      press(win, 'Escape');
      await delay(700);
      steps.push(await ended());
    }
    const [e1, e2, e3, e4] = steps as [Ended, Ended, Ended, Ended];
    record(
      related !== null && e0.list && e0.details && e0.focus === first.id && e0.held === 1 &&
        !e1.list && e1.details && e1.focus === first.id && e1.held === 1 && /pane-related/.test(e1.on.on) &&
        !e2.list && !e2.details && e2.focus === first.id && e2.held === 1 && /pane-info/.test(e2.on.on) &&
        e3.focus === null && e3.held === 1 && e3.seated === 0 &&
        e4.held === 0,
      `with a document's related list and details both open and the keyboard on its header, Escape ends one thing each time: the list (the keyboard then on ${e1.on.on}), then the details (${e2.on.on}), then the focus, with the cards put back and the document still open (${e3.held} held, focus ${e3.focus}), then the desk (${e4.held} held); before each press: list ${e0.list}/${e1.list}/${e2.list}, details ${e0.details}/${e1.details}/${e2.details}, focus ${e0.focus}/${e1.focus}/${e2.focus}/${e3.focus}`,
    );

    // ---- 4. The two named controls do what the last two Escapes do ----
    await pointer(win, [{ type: 'move', ...PARK }]);
    const one = (await rows([victim.id]))[0];
    if (one !== undefined) await pointer(win, [...click(one), { type: 'move', ...PARK }]);
    await delay(1300);
    const two = (await rows([victim.id]))[0];
    if (two !== undefined) await pointer(win, [...click(two), { type: 'move', ...PARK }]);
    await delay(1300);
    if (one === undefined || two === undefined || deskIds().length !== 2) {
      record(false, `document: two rows were in reach, to hold two notes (${deskIds().join(', ') || 'none held'})`);
    } else {
      const named = (): Promise<{ leave: boolean; sweep: boolean; focus: string | null; panes: number }> => js(`({ leave: __t.shown('#leave-focus'), sweep: __t.shown('#sweep-desk'), focus: __t.glass().focusId(), panes: document.querySelectorAll('.pane').length })`);
      const n0 = await named();
      const leaveAt = await js<{ x: number; y: number } | null>(`__t.rect('#leave-focus')`);
      if (leaveAt !== null) await pointer(win, [...click(leaveAt), { type: 'move', ...PARK }]);
      await delay(700);
      const n1 = await named();
      const heldAfterLeave = deskIds().length;
      const sweepAt = await js<{ x: number; y: number } | null>(`__t.rect('#sweep-desk')`);
      if (sweepAt !== null) await pointer(win, [...click(sweepAt), { type: 'move', ...PARK }]);
      await delay(900);
      const n2 = await named();
      record(
        n0.leave && n0.sweep && n0.focus === two.id && n0.panes === 2 && n1.focus === null && !n1.leave && n1.sweep && n1.panes === 2 && heldAfterLeave === 2 && n2.panes === 0 && deskIds().length === 0 && !n2.sweep,
        `"put cards back" leaves the focus and closes nothing (${n1.panes} documents, focus ${n1.focus}), and is then gone while "close all" stays; "close all" closes every document (${n2.panes} left, ${deskIds().length} held)`,
      );
    }

    // ---- 5. A second press made soon after the first lands on the row it was aimed at ----
    // Two things could take it somewhere else. The list gains rows above the
    // pointer as the desk fills, and unless it holds still the row aimed at
    // has moved. And the document grows out of the row that was pressed, so
    // for its first moments it lies over the rows beside that one. Each is
    // measured by where a second press went.
    type Press = { at: number; opening: boolean; covered: boolean; row: string | null; on: string };
    type Pair = { a: RowSeen; b: RowSeen & { px: number } };
    await js(`window.__deckPresses = []; if (!window.__deckPressWatch) { window.__deckPressWatch = true; document.addEventListener('pointerdown', (e) => { const t = e.target instanceof Element ? e.target : null; const row = t ? t.closest('.nav-row') : null; const p = document.querySelector('.pane.opening'); const r = p ? p.getBoundingClientRect() : null; window.__deckPresses.push({ at: performance.now(), opening: window.__deckGlass.isOpening(), covered: !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom, row: row ? row.dataset.noteId : null, on: t ? (t.closest('.pane') ? 'a document' : row ? 'a row' : String(t.className)) : 'nothing' }); }, true); } true`);
    /** Two rows, one straight under the other, with a point toward the right end of the lower one. */
    const pairOf = (skip: string[]): Promise<Pair | null> =>
      js(`(() => { const rows = __t.rows(${JSON.stringify(skip)}); for (let i = 0; i + 1 < rows.length; i += 1) { const a = rows[i], b = rows[i + 1]; if (b.index !== a.index + 1) continue; const el = [...document.querySelectorAll('#nav-list .nav-row')].find((e) => !e.hidden && Number(e.dataset.index) === b.index); const r = el.getBoundingClientRect(); const px = r.right - 36; const hit = document.elementFromPoint(px, b.y); if (!hit || hit.closest('.nav-row') !== el) continue; return { a, b: { ...b, px } }; } return null; })()`);
    /** Press the first row, and the second `between` ms after the first is let go, at `x`. What each press landed on. */
    const twoPresses = async (pair: Pair, x: number, between: number): Promise<Press[]> => {
      await js(`window.__deckPresses = []; true`);
      await pointer(win, [
        { type: 'move', x: pair.a.x, y: pair.a.y },
        { type: 'down', x: pair.a.x, y: pair.a.y, wait: 10 },
        { type: 'up', x: pair.a.x, y: pair.a.y, wait: between },
        { type: 'move', x, y: pair.b.y, wait: 6 },
        { type: 'down', x, y: pair.b.y, wait: 10 },
        { type: 'up', x, y: pair.b.y, wait: 60 },
      ]);
      await delay(1600);
      await pointer(win, [{ type: 'move', ...PARK }]);
      return js<Press[]>(`window.__deckPresses`);
    };
    const used = [victim.id, first.id];
    await sweep();
    const pair = await pairOf(used);
    if (pair === null) {
      record(false, 'document: two rows, one under the other, were in reach to press one after the other');
    } else {
      used.push(pair.a.id, pair.b.id);
      // 90 ms apart, the second where a row is usually pressed.
      const presses = await twoPresses(pair, pair.b.x, 74);
      const p2 = presses[1];
      const growing = await js<{ cls: boolean; opening: boolean }>(`({ cls: document.querySelectorAll('.pane.opening').length > 0, opening: __t.glass().isOpening() })`);
      record(
        presses.length === 2 && presses[0]?.row === pair.a.id && p2 !== undefined && p2.row === pair.b.id && deskIds().join() === `${pair.a.id},${pair.b.id}` && !growing.cls && !growing.opening,
        `a second press ${p2 === undefined ? 'never made' : `${Math.round(p2.at - (presses[0]?.at ?? p2.at))} ms after the first`} landed on the row it was aimed at (${p2?.row ?? p2?.on ?? 'no press'} for ${pair.b.id}): the list held still under the pointer while the first note's rows arrived above it, and both notes are open (${deskIds().join(', ') || 'nothing'}), with nothing still growing afterwards (${growing.cls || growing.opening})`,
      );
    }
    // Sooner, and toward the row's right end: where the growing document lies
    // over the row. Whether it did is read at the press, from the document's
    // own box, so a press that came too late to meet it is made again.
    let through: { pair: Pair; presses: Press[] } | null = null;
    const gaps: string[] = [];
    for (let attempt = 0; attempt < 4 && through === null; attempt += 1) {
      await sweep();
      const next = await pairOf(used);
      if (next === null) break;
      used.push(next.a.id, next.b.id);
      const presses = await twoPresses(next, next.b.px, 18 + attempt * 8);
      const second = presses[1];
      gaps.push(second === undefined ? 'no second press' : `${Math.round(second.at - (presses[0]?.at ?? second.at))} ms, ${second.covered ? 'under the document' : second.opening ? 'beside the document' : 'no document growing'}`);
      if (second !== undefined && second.covered) through = { pair: next, presses };
    }
    if (through === null) {
      record(false, `document: a second press met the first note's document while it was growing over the row, so that it can be shown to go through it (${gaps.join('; ') || 'no rows to press'})`);
    } else {
      const second = through.presses[1] as Press;
      record(
        second.opening && second.covered && second.row === through.pair.b.id && deskIds().join() === `${through.pair.a.id},${through.pair.b.id}`,
        `a press made ${Math.round(second.at - (through.presses[0]?.at ?? second.at))} ms into an opening, at a point the growing document lay over, went through it to the row under it (${second.row ?? second.on} for ${through.pair.b.id}) and opened that note: the desk holds ${deskIds().join(', ') || 'nothing'}`,
      );
    }

    // ---- 5c. A press held while the list is drawn again under it still opens its row ----
    // The list holds a row still under the pointer when rows arrive above it,
    // and it does so by handing the row to another of its elements. A press
    // that began on one element and ended on the other is sent by the browser
    // to the list, not to a row. So the redraw is made here while the button
    // is down: another note is put on the desk, which adds rows above.
    await sweep();
    const heldPair = await pairOf(used);
    if (heldPair === null) {
      record(false, 'document: two rows were in reach, to hold one while the other is opened');
    } else {
      used.push(heldPair.a.id, heldPair.b.id);
      const elementAt = (): Promise<{ id: string | null; index: string | null }> =>
        js(`(() => { const e = document.elementFromPoint(${heldPair.b.x}, ${heldPair.b.y}); const r = e ? e.closest('.nav-row') : null; return { id: r ? r.dataset.noteId : null, index: r ? r.dataset.index : null }; })()`);
      await pointer(win, [{ type: 'move', x: heldPair.b.x, y: heldPair.b.y, wait: 60 }, { type: 'down', x: heldPair.b.x, y: heldPair.b.y, wait: 30 }]);
      const atDown = await elementAt();
      store.dispatch({ type: 'put-on-desk', noteId: heldPair.a.id, x: 420, y: 40, viewId: VIEW });
      await delay(700);
      const atUp = await elementAt();
      await pointer(win, [{ type: 'up', x: heldPair.b.x, y: heldPair.b.y, wait: 60 }]);
      await delay(1500);
      await pointer(win, [{ type: 'move', ...PARK }]);
      record(
        atDown.id === heldPair.b.id && atUp.id === heldPair.b.id && atDown.index !== atUp.index && deskIds().includes(heldPair.b.id) && deskIds().length === 2,
        `a press on ${heldPair.b.id}'s row, held while ${heldPair.a.id} was opened and the list drawn again, still opens ${heldPair.b.id}: the row stayed under the pointer (${atUp.id}) and was handed from element ${atDown.index} to element ${atUp.index} in between, and the desk holds ${deskIds().join(', ') || 'nothing'}`,
      );
    }

    // ---- 6. A link inside a note's text opens the note it names, as another document ----
    await sweep();
    // A link to a note the view does not hold is taken first: that is the
    // note whose card Deck has to fetch from its own index before it can read it.
    const members = await viewMembers(origin, ws, VIEW);
    const outside = [...rels].filter(([id]) => !members.has(id)).map(([, rel]) => rel);
    const idAt = new Map([...rels].map(([id, rel]) => [rel, id]));
    let followed: { from: string; href: string; rel: string; x: number; y: number; outside: boolean } | null = null;
    for (const candidate of [first.id, victim.id, ...used.slice(2)]) {
      const candidateRel = rels.get(candidate);
      if (candidateRel === undefined) continue;
      await js(openByPath(candidateRel));
      await untilRead(js, candidate);
      await delay(700);
      await pointer(win, [{ type: 'move', ...PARK }]);
      const beyond = await js<{ href: string; rel: string; x: number; y: number } | null>(linkIn(candidate, outside));
      const link = beyond ?? (await js<{ href: string; rel: string; x: number; y: number } | null>(linkIn(candidate, null)));
      if (link !== null) {
        followed = { from: candidate, ...link, outside: beyond !== null };
        break;
      }
      await sweep();
    }
    if (followed === null) {
      record(false, 'document: one of the notes opened here has a link to another note in its text, to follow');
    } else {
      const address = win.webContents.getURL();
      const before = deskIds();
      // Not waited on for ever: a link that is not followed in the document
      // takes the window somewhere else, and the page that was watching is gone.
      const watched = Promise.race([js<Record<string, string[]>>(statesFor(2600)).catch(() => ({}) as Record<string, string[]>), delay(6000).then(() => ({}) as Record<string, string[]>)]);
      await pointer(win, [...click(followed), { type: 'move', ...PARK }]);
      const states = await watched;
      if (win.webContents.getURL() !== address) {
        record(false, `a link in ${followed.from}'s text, pressed, opens the note it names as another document: the window left Deck's page instead, for ${win.webContents.getURL()}`);
        void win.loadURL(address);
        await boot();
        await kit.fresh(VIEW);
      } else {
      const after = deskIds();
      const opened = after.find((id) => !before.includes(id)) ?? null;
      if (opened !== null) await untilRead(js, opened);
      const linked = opened === null ? null : await read(opened);
      record(
        win.webContents.getURL() === address && after.length === before.length + 1 && after.includes(followed.from) && opened !== null && opened === idAt.get(followed.rel) && linked !== null && linked.state === 'ready' && linked.same && (await js<string | null>(`__t.glass().focusId()`)) === opened,
        `a link in ${followed.from}'s text, pressed, opens the note it names as another document (${followed.href} opened ${opened ?? 'nothing'}, ${followed.outside ? 'a note this view does not hold' : 'a note of this view'}), with that note's own text; the window stays in Deck and ${followed.from} stays open (${after.join(', ')})`,
      );
      // What the new document said while its text was on the way. A document
      // says it is being read, and then holds the text; it does not say first
      // that the note cannot be read here.
      const passed = opened === null ? [] : (states[opened] ?? []);
      record(
        opened !== null && passed.length > 0 && passed.every((st) => st === 'loading' || st === 'ready' || st === '') && passed[passed.length - 1] === 'ready',
        `while its text was being read, ${opened ?? 'the new document'} said only that (${passed.join(' then ') || 'no state seen'})${followed.outside ? '' : '; the link named a note of this view, so the case of a note the view does not hold was not made'}`,
      );
      }
    }

    // ---- 7. The verbs the sidecar allows, and a tick for each open criterion, are inside the document ----
    await sweep();
    offeredOnce ??= notesOfferedVerbs(origin, ws, 1);
    const offered = await offeredOnce;
    const withVerbs = offered.found[0];
    if (withVerbs === undefined) {
      record(false, `the sidecar offers a person verbs on at least one note of this workspace today, so the verbs in a document can be checked (${offered.asked} notes asked about)`);
    } else {
      await js(openByPath(withVerbs.rel));
      const verbState = await untilRead(js, withVerbs.id);
      let seen = await read(withVerbs.id);
      for (let i = 0; i < 20 && (seen === null || seen.verbs.length === 0); i += 1) {
        await delay(150);
        seen = await read(withVerbs.id);
      }
      const asOffered = seen !== null && seen.verbs.length === withVerbs.actions.length && withVerbs.actions.every((a, i) => seen?.verbs[i]?.verb === a.verb && seen?.verbs[i]?.confirm === String(a.confirm) && seen?.verbs[i]?.disabled === (a.disabled || a.endpoint !== ''));
      record(
        verbState === 'ready' && seen !== null && asOffered && seen.actionsShown && seen.actionsInside && seen.stripVerbs === 0,
        `the verbs the sidecar offers on ${withVerbs.id} (a ${withVerbs.type} at ${withVerbs.status}: ${withVerbs.actions.map((a) => `${a.verb}${a.confirm ? ', confirming' : ''}`).join('; ')}) are drawn inside its document, each as the sidecar's row says (${(seen?.verbs ?? []).map((v) => `${v.verb}${v.disabled ? ', disabled' : ''}${v.confirm === 'true' ? ', confirming' : ''}`).join('; ') || 'none drawn'}; shown ${seen?.actionsShown ?? false}, in the document ${seen?.actionsInside ?? false}, the document ${verbState}), and not in a strip beside the field (${seen?.stripVerbs ?? -1} there)`,
      );
    }
    await sweep();
    const unticked = ctx.notesWithAnUntickedCriterion().filter((id) => rels.has(id));
    let ticked: { id: string; doc: DocumentRead } | null = null;
    const tried: string[] = [];
    for (const id of unticked.slice(0, 12)) {
      tried.push(id);
      await js(openByPath(rels.get(id) as string));
      await untilRead(js, id);
      await delay(600);
      const got = await read(id);
      if (got !== null && got.boxes > 0) {
        ticked = { id, doc: got };
        break;
      }
      await sweep();
    }
    if (ticked === null) {
      record(false, `a note with an open criterion the sidecar addressed was found, so the ticks in a document can be checked (tried ${tried.join(', ') || 'none'} of ${unticked.length})`);
    } else {
      record(
        ticked.doc.ticks === ticked.doc.boxes && ticked.doc.ticksAfterTheirBox === ticked.doc.ticks && ticked.doc.readerTicks === 0 && ticked.doc.same,
        `each open criterion of ${ticked.id} that the sidecar addressed has a tick control beside it, inside the document's text (${ticked.doc.ticks} ticks for ${ticked.doc.boxes} open criteria, ${ticked.doc.ticksAfterTheirBox} of them straight after their box), and the text is otherwise the note's own (${ticked.doc.same})`,
      );
    }
  } finally {
    blocking = false;
    win.webContents.session.webRequest.onBeforeRequest(null);
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(600);
  }
}

/**
 * FEAT-0020 on a served page, which is what a tablet loads: a page with no
 * bridge reads a note in a document that belongs to that page alone. The
 * application's desk is not changed by anything done there, and the page is
 * drawn no verb and no tick, because it cannot write (ADR-0003, TASK-0057).
 *
 * The notes are the ones the document part found verbs and ticks on in the
 * application's own window, so "none here" is said about notes that have them.
 */
async function recordServed(kit: Kit): Promise<void> {
  const { ctx, win, js, record } = kit;
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const origin = new URL(win.webContents.getURL()).origin;
  const VIEW = 'features';
  await kit.fresh(VIEW);
  const rels = new Map((await indexedNotes(origin, ws)).map((n) => [n.id, n.rel]));
  const members = await viewMembers(origin, ws, VIEW);
  const outside = [...rels].filter(([id]) => !members.has(id)).map(([, rel]) => rel);
  const idAt = new Map([...rels].map(([id, rel]) => [rel, id]));
  // One note on the application's desk, so there is a desk to leave alone.
  const macNote = (await js<RowSeen[]>(`__t.rows()`))[0];
  if (macNote !== undefined) {
    await pointer(win, [...click(macNote), { type: 'move', ...PARK }]);
    await delay(1400);
  }
  const page = ctx.openServedPage();
  // Shown, as a tablet's page is, and without taking the keyboard: a window
  // that is never shown draws no frames.
  page.showInactive();
  const pj = <T>(code: string): Promise<T> => page.webContents.executeJavaScript(code) as Promise<T>;
  try {
    await once(page, 'did-finish-load');
    await ctx.untilBooted(page);
    await delay(2500);
    await pj(PAGE_HELPERS);
    const desk = (): string => JSON.stringify({ viewDesks: store.getState().viewDesks, deskCards: store.getState().deskCards });
    const deskBefore = desk();
    const revisionBefore = store.getState().revision;
    const opened = await pj<{ bridge: string; surface: string | undefined; view: string | null; count: string; panes: string[] }>(`({ bridge: typeof window.deck, surface: document.body.dataset.surface, view: window.__deckLastState ? window.__deckLastState.viewId : null, count: __t.text('#collection-count'), panes: [...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId) })`);
    const macCount = (await kit.collection()).count;
    record(
      opened.bridge === 'undefined' && opened.surface === 'glass' && opened.view === VIEW && opened.count === macCount && macNote !== undefined && opened.panes.join() === macNote.id,
      `a page with no bridge opens on the same view in Glass, with the same exact count in its collection ("${opened.count}") and the application's open note as a document (${opened.panes.join(', ') || 'none'})`,
    );
    // The application's document may lie over the list on a smaller page.
    const toList = await pj<{ x: number; y: number } | null>(`__t.shown('#narrow-bar') ? __t.rect('#narrow-bar button[data-object="collection"]') : __t.shown('#to-collection') ? __t.rect('#to-collection') : null`);
    if (toList !== null) {
      await pointer(page, click(toList));
      await delay(800);
    }
    // ---- A row pressed there opens a document of that page's own ----
    // The first row in reach whose note links, in its text, to a note this
    // view does not hold: the link is followed below.
    const row = await pj<RowSeen | null>(`(async () => {
      const rows = __t.rows(); const rels = ${JSON.stringify(Object.fromEntries(rels))}; const outside = new Set(${JSON.stringify(outside)});
      for (const row of rows.slice(0, 10)) {
        const rel = rels[row.id]; if (!rel) continue;
        const payload = await fetch('/deck/sidecar/${ws}/api/render?path=' + encodeURIComponent(rel)).then((r) => r.json()).catch(() => null);
        if (!payload || typeof payload.html !== 'string') continue;
        const d = document.createElement('div'); d.innerHTML = payload.html;
        const has = [...d.querySelectorAll('a[href^="/docs/"]')].some((a) => { try { return outside.has(decodeURIComponent(a.getAttribute('href').slice(6).split('#')[0])); } catch (e) { return false; } });
        if (has) return row;
      }
      return rows[0] || null;
    })()`);
    if (row === null) {
      record(false, 'served: a row was in reach on the served page, to open a note from');
    } else {
      await pointer(page, [...click(row), { type: 'move', x: 4, y: 4 }]);
      await delay(600);
      const state = await untilRead(pj, row.id);
      await delay(700);
      const doc = await pj<DocumentRead | null>(readDocument(ws, row.id, rels.get(row.id) ?? null));
      const onMac = await js<boolean>(`!!document.querySelector('.pane[data-note-id="${row.id}"]')`);
      record(
        state === 'ready' && doc !== null && doc.same && doc.chars > 20 && !onMac && !deskCardsOf(store.getState(), ws).some((c) => c.noteId === row.id),
        `a row pressed on the served page opens ${row.id} there as a document with the note's own text (${doc?.chars ?? 0} characters, the same: ${doc?.same ?? false}), and it is that page's alone: the application's window draws no such document (${onMac}) and its desk does not hold it`,
      );
      // ---- A link in it, to a note the view does not hold, opens that note there too ----
      const link = await pj<{ href: string; rel: string; x: number; y: number } | null>(linkIn(row.id, outside));
      if (link === null) {
        record(false, `served: ${row.id}'s text has a link to a note this view does not hold, to follow on the served page`);
      } else {
        const wanted = idAt.get(link.rel) ?? '';
        const watched = pj<Record<string, string[]>>(statesFor(3200));
        await pointer(page, [...click(link), { type: 'move', x: 4, y: 4 }]);
        const states = await watched;
        const linkedState = await untilRead(pj, wanted, 20);
        const linked = await pj<DocumentRead | null>(readDocument(ws, wanted, link.rel));
        record(
          wanted !== '' && linkedState === 'ready' && linked !== null && linked.same && linked.chars > 0 && !deskCardsOf(store.getState(), ws).some((c) => c.noteId === wanted),
          `a link in that document to ${wanted || link.href}, a note the view does not hold, pressed on the served page, opens that note there as another document with its own text (${linked === null ? 'no document' : `${linkedState}, ${linked.chars} characters, the same: ${linked.same}`}; it passed through ${(states[wanted] ?? []).join(' then ') || 'no state'}), and the application's desk does not hold it`,
        );
        const closeLinked = await pj<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${wanted}"] .pane-close')`);
        if (closeLinked !== null) await pointer(page, [...click(closeLinked), { type: 'move', x: 4, y: 4 }]);
        await delay(600);
      }
      // Its own × closes it; the × of the application's document does nothing there.
      const closeOwn = await pj<{ x: number; y: number } | null>(`__t.rect('.pane[data-note-id="${row.id}"] .pane-close')`);
      if (closeOwn !== null) await pointer(page, [...click(closeOwn), { type: 'move', x: 4, y: 4 }]);
      await delay(700);
      const ownGone = !(await pj<boolean>(`!!document.querySelector('.pane[data-note-id="${row.id}"]')`));
      let macStays = false;
      if (macNote !== undefined) {
        const closeMac = await pj<{ x: number; y: number } | null>(`(() => { const b = document.querySelector('.pane[data-note-id="${macNote.id}"] .pane-close'); if (!b) return null; const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); return e === b ? { x, y } : null; })()`);
        if (closeMac !== null) {
          await pointer(page, [...click(closeMac), { type: 'move', x: 4, y: 4 }]);
          await delay(700);
          macStays = (await pj<boolean>(`!!document.querySelector('.pane[data-note-id="${macNote.id}"]')`)) && deskCardsOf(store.getState(), ws).some((c) => c.noteId === macNote.id);
        }
      }
      record(closeOwn !== null && ownGone && macStays, `× on the page's own document closes it (${ownGone}), and × on the application's document, pressed on the served page, closes nothing: it is still drawn there and still on the application's desk (${macStays})`);
    }
    // ---- No verb and no tick, on the notes that have them in the application's window ----
    offeredOnce ??= notesOfferedVerbs(origin, ws, 1);
    const withVerbs = (await offeredOnce).found[0];
    const candidates = ctx.notesWithAnUntickedCriterion().filter((id) => rels.has(id)).slice(0, 12);
    let withBoxes: { id: string; doc: DocumentRead } | null = null;
    for (const id of candidates) {
      await pj(openByPath(rels.get(id) as string));
      await untilRead(pj, id);
      await delay(500);
      const got = await pj<DocumentRead | null>(readDocument(ws, id, rels.get(id) ?? null));
      if (got !== null && got.boxes > 0) {
        withBoxes = { id, doc: got };
        break;
      }
    }
    let verbDoc: DocumentRead | null = null;
    if (withVerbs !== undefined) {
      await pj(openByPath(withVerbs.rel));
      await untilRead(pj, withVerbs.id);
      await delay(900);
      verbDoc = await pj<DocumentRead | null>(readDocument(ws, withVerbs.id, withVerbs.rel));
    }
    const everywhere = await pj<{ verbs: number; ticks: number; noTick: number }>(`({ verbs: document.querySelectorAll('button.verb').length, ticks: document.querySelectorAll('button.tick').length, noTick: document.querySelectorAll('.no-tick').length })`);
    record(
      withVerbs !== undefined && verbDoc !== null && verbDoc.state === 'ready' && verbDoc.same && verbDoc.verbs.length === 0 && !verbDoc.actionsShown && withBoxes !== null && withBoxes.doc.same && withBoxes.doc.ticks === 0 && everywhere.verbs === 0 && everywhere.ticks === 0 && everywhere.noTick === 0,
      `the served page is drawn no verb and no tick, on notes that have them in the application's window: ${withVerbs?.id ?? 'no note with verbs'} is read in full (${verbDoc?.state ?? 'not opened'}, the note's own text: ${verbDoc?.same ?? false}) with ${verbDoc?.verbs.length ?? -1} verbs (their place shown: ${verbDoc?.actionsShown ?? false}), and ${withBoxes?.id ?? 'no note with open criteria'} (the note's own text: ${withBoxes?.doc.same ?? false}) with ${withBoxes?.doc.ticks ?? -1} ticks for its ${withBoxes?.doc.boxes ?? 0} open criteria (${everywhere.verbs} verbs, ${everywhere.ticks} ticks and ${everywhere.noTick} notices about ticks anywhere on the page)`,
    );
    record(
      desk() === deskBefore && store.getState().revision === revisionBefore,
      `nothing done on the served page changed the application's desk: it is byte for byte what it was (${deskBefore.length} characters), and the store was sent no action at all (revision ${revisionBefore} to ${store.getState().revision})`,
    );
  } finally {
    if (!page.isDestroyed()) page.destroy();
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(600);
  }
}

/**
 * FEAT-0022: the collection's members as cards, and an arrangement that is
 * shown before it is applied and can be undone.
 *
 * Three claims, each read from the store or counted in the page. A preview
 * that is withdrawn has moved nothing. An arrangement that is applied and
 * undone leaves the desk as it was, to the byte. And with the collection
 * drawn as cards beside an open note, a note is still one object: no note has
 * two cards. `demos/glass-arrangements.cjs` walks the rest.
 */
async function recordArrange(kit: Kit): Promise<void> {
  const { ctx, win, js, record, deskIds } = kit;
  const { store, prepared } = ctx;
  const ws = prepared.id;
  const VIEW = 'features';
  const desk = (): string => JSON.stringify(deskCardsOf(store.getState(), ws));
  const layout = (): string => JSON.stringify(store.getState().collections[ws]?.[VIEW] ?? null);
  type Arranging = { preview: unknown; undo: string | null; asking: unknown; shown: boolean; undoShown: boolean; focus: string | null; on: string };
  const arranging = (): Promise<Arranging> =>
    js(`(() => { const a = __t.glass().arrangeState(); return { preview: a.preview, undo: a.undo, asking: a.asking, shown: __t.shown('#arrange-preview'), undoShown: __t.shown('#arrange-undo'), focus: __t.glass().focusId(), on: document.activeElement ? document.activeElement.id : '' }; })()`);
  const pressOn = async (selector: string, wait = 600): Promise<boolean> => {
    const at = await js<{ x: number; y: number } | null>(`__t.shown(${JSON.stringify(selector)}) ? __t.rect(${JSON.stringify(selector)}) : null`);
    if (at === null) return false;
    await pointer(win, [...click(at), { type: 'move', ...PARK }]);
    await delay(wait);
    return true;
  };
  await kit.fresh(VIEW);
  ctx.focusApp(win);
  try {
    const row = (await js<RowSeen[]>(`__t.rows()`))[0];
    if (row === undefined) {
      record(false, 'arrange: a row was in reach, to open a note from');
      return;
    }
    await pointer(win, [...click(row), { type: 'move', ...PARK }]);
    await delay(1400);
    // The document and the collection are each moved by hand first, so the
    // arrangement has something to put right and the store holds a place for
    // both that an undo has to give back exactly.
    const head = await js<{ x: number; y: number } | null>(`__t.head(${JSON.stringify(row.id)})`);
    if (head !== null) await pointer(win, [...drag(head, { x: head.x + 60, y: head.y + 90 }, 8), { type: 'move', ...PARK }]);
    await delay(600);
    const name = await js<{ x: number; y: number } | null>(`__t.rect('#collection-name')`);
    if (name !== null) await pointer(win, [...drag(name, { x: name.x + 24, y: name.y }, 6), { type: 'move', ...PARK }]);
    await delay(600);
    const placed = { desk: desk(), layout: layout() };
    const before = await arranging();

    // ---- 1. Read is shown, and Escape withdraws it: nothing has moved ----
    const readShown = await pressOn('#arrange-read');
    const shown = await arranging();
    const whileShown = { desk: desk(), layout: layout() };
    press(win, 'Escape');
    await delay(500);
    const withdrawn = await arranging();
    record(
      head !== null && name !== null && readShown && placed.layout !== 'null' && before.preview === null && shown.preview !== null && shown.shown && whileShown.desk === placed.desk && whileShown.layout === placed.layout &&
        withdrawn.preview === null && !withdrawn.shown && desk() === placed.desk && layout() === placed.layout && deskIds().join() === row.id && withdrawn.focus === before.focus && withdrawn.undo === null,
      `Read, pressed, is shown before anything moves (a preview: ${shown.preview !== null}, drawn: ${shown.shown}), and Escape withdraws it and does nothing else: the store's desk and the collection's place are byte for byte what they were (${placed.desk.length} and ${placed.layout.length} characters), ${row.id} is still open and the focus is what it was (${withdrawn.focus})`,
    );

    // ---- 2. Applied, then undone: the desk is the same bytes again ----
    await pressOn('#arrange-read');
    const applied = await pressOn('#arrange-apply', 1100);
    const after = { desk: desk(), layout: layout(), state: await arranging() };
    const undone = await pressOn('#arrange-undo', 1100);
    const back = { desk: desk(), layout: layout(), state: await arranging() };
    record(
      applied && (after.desk !== placed.desk || after.layout !== placed.layout) && after.state.undo !== null && after.state.undoShown && undone && back.desk === placed.desk && back.layout === placed.layout && back.state.undo === null && back.state.asking === null && !back.state.undoShown && deskIds().join() === row.id,
      `Apply moves what the preview showed (the desk changed: ${after.desk !== placed.desk}, the collection's place changed: ${after.layout !== placed.layout}) and offers "${after.state.undo ?? 'no undo'}"; Undo arrangement, pressed, puts the store's desk and the collection's place back to the same bytes (${back.desk === placed.desk} and ${back.layout === placed.layout}) and asks nothing, because nothing had been moved since`,
    );

    // ---- 3. The collection as cards, with a note open: still one object per note ----
    const asCards = await pressOn('#collection-as-cards', 1000);
    type Counted = { twice: string[]; cardForOpen: number; inCollection: number; both: number; refs: string[]; presentation: string | null; marked: string | null; listShown: boolean };
    const counted = (): Promise<Counted> =>
      js(`(() => { const n = new Map(); const all = [...document.querySelectorAll('.field-card:not(.leaving)')]; for (const e of all) n.set(e.dataset.noteId, (n.get(e.dataset.noteId) || 0) + 1); const l = window.__deckCollection.layout(); return { twice: [...n].filter(([, c]) => c > 1).map(([id]) => id), cardForOpen: n.get(${JSON.stringify(row.id)}) || 0, inCollection: all.filter((e) => e.classList.contains('in-collection')).length, both: all.filter((e) => e.classList.contains('in-collection') && e.classList.contains('seated')).length, refs: [...document.querySelectorAll('.grid-ref')].map((e) => e.dataset.noteId), presentation: l ? l.presentation : null, marked: document.getElementById('field-cards').dataset.inCollection || null, listShown: document.getElementById('nav-list').offsetParent !== null }; })()`);
    const cards = await counted();
    const storedAs = (store.getState().collections[ws]?.[VIEW] as { presentation?: string } | undefined)?.presentation;
    record(
      asCards && storedAs === 'cards' && cards.presentation === 'cards' && cards.inCollection > 0 && cards.marked === String(cards.inCollection) && cards.twice.length === 0 && cards.cardForOpen === 0 && cards.both === 0 && deskIds().join() === row.id,
      `with ${row.id} open and the collection drawn as cards (${cards.inCollection} of them; the store says "${storedAs}"), a note is still one object: no note has two cards (${cards.twice.join(', ') || 'none'}), the open note has none (${cards.cardForOpen}), and no card is both the collection's and gathered round the document (${cards.both})`,
    );
    const asTable = await pressOn('#collection-as-table', 900);
    const table = await counted();
    record(
      asTable && (store.getState().collections[ws]?.[VIEW] as { presentation?: string } | undefined)?.presentation === 'table' && table.inCollection === 0 && table.twice.length === 0 && table.listShown,
      `as a table again, no card is left in the collection (${table.inCollection}) and the list is back (${table.listShown})`,
    );
  } finally {
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    kit.forgetCollection(VIEW);
    await delay(700);
  }
}

async function recordThrow(kit: Kit): Promise<void> {
  const { ctx, win, js, record } = kit;
  // The Issues view, whose front band has cards at any width: the middle
  // band stands at the sides, out of sight in a field this narrow.
  await kit.fresh('issues');
  const { store, prepared } = ctx;
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
    // The note thrown at the desk panel is a document in this window too, and
    // in a field this narrow a document covers every card: it is drawn at the
    // size a person reads at, and nothing is dealt round it (TASK-0104). The
    // desk is swept, so there is a card in sight for the next throw.
    store.dispatch({ type: 'clear-desk', scope: 'workspace' });
    await delay(900);
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
    // Since FEAT-0023 the question names the note and each answer names its act: "Move to the …" or "Also show in the …".
    record(rowNote !== null && asked.asked.trim().startsWith(`${rowNote}:`) && /^(Move to|Also show in) the /.test(asked.focus), `send to names the note and asks where, each answer naming its act, and the keyboard is on the first answer ("${asked.focus}"; the question reads "${asked.asked.trim().slice(0, 90)}")`);
    const focusIsReader = / the reader on /.test(asked.focus);
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
async function recordOrbit(kit: Kit): Promise<void> {
  const { ctx, win, js, record } = kit;
  const { store, prepared } = ctx;
  await kit.fresh('issues');
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
    // Until FEAT-0020 "read by the reader Deck has": the column beside the
    // field. In the orbit too the note is read in its document.
    let orbitDoc: PaneSeen | null = null;
    for (let i = 0; i < 15 && (orbitDoc === null || orbitDoc.state !== 'ready'); i += 1) {
      if (i > 0) await delay(150);
      orbitDoc = await js<PaneSeen | null>(`__t.pane(${JSON.stringify(dot.id)})`);
    }
    const orbitReader = await js<boolean>(`__t.shown('#reader') || __t.shown('#actuators')`);
    record(orbitDoc !== null && orbitDoc.state === 'ready' && orbitDoc.chars > 0 && !orbitReader, `and it is a document that holds the note's text, with no reader column in the orbit either (${orbitDoc === null ? 'no document' : `${orbitDoc.state}, ${orbitDoc.chars} characters`}; a reader shown: ${orbitReader})`);
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
