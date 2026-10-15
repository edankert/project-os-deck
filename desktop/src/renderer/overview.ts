/**
 * The overview layer: where Deck draws the seven screens of PHASE-0005.
 *
 * A screen is a page (`?page=wheel`, `phase`, `ticket`, `rephase`) or a flow
 * (`?flow=design`, `test-run`, `accept`) on the current view's address. Each
 * one registers a function that returns a `Scene` (`shared/overview-scene.ts`);
 * this module draws the scene as SVG and owns everything a person does on it:
 *
 * - a click on a mark with an address goes there, and a click on a ticket's
 *   mark opens the ticket screen;
 * - pointing at a mark shows its words in a callout, so the screen carries
 *   almost none at rest;
 * - Tab reaches every control, Enter follows it, Escape goes back, and L opens
 *   the list twin, which holds the same things as rows;
 * - moving from one screen to the next animates every ticket that is on both
 *   from where it was to where it is now, unless the person asked for less
 *   motion.
 *
 * Writes are not made here. A flow's `onAction` asks the shell for them, and
 * the shell sends them through `write-client.ts` (ADR-0003).
 */
import { addressFor, formatAddress } from '../shared/address.js';
import { sceneToSvg, walkScene, type AddressParts, type Scene, type ScreenContext } from '../shared/overview-scene.js';
import { buildPanels, type PanelLayer } from './overview-panels.js';
import { cameraTransform, defaultCamera, panned, turned, wheelFactor, zoomed, type Camera } from '../shared/overview-camera.js';
import { afterDraw, canGoBack, canGoForward, current as trailNow, emptyTrail, stepped, type Trail, type TravelIntent } from '../shared/overview-trail.js';
import type { OverviewModel } from '../shared/overview-types.js';
import type { DeckAddress } from '../shared/types.js';

/** What a screen is given to draw itself. */
export interface ScreenInput {
  model: OverviewModel;
  address: DeckAddress;
  ctx: ScreenContext;
  /** Per-workspace memory a screen may keep for the session (S4's accepted groups). */
  memory: Map<string, unknown>;
  /** Whether this window may ask for a write: false on the served host. */
  canWrite: boolean;
  /** Ask the shell for a write; it goes through `write-client.ts` and the sidecar's guards (ADR-0003). */
  write(verb: string, request: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  /** Ask the person for a line of text (a reason); null when they decline. */
  ask(label: string): Promise<string | null>;
  /** Read through Deck's host from the workspace's sidecar, e.g. `/api/cockpit/release-test?platform=android`. */
  read(sidecarPath: string): Promise<unknown>;
}

export interface ScreenDefinition {
  scene(input: ScreenInput): Scene | Promise<Scene>;
  /** A control was used. Return true to redraw the screen afterwards. */
  onAction?(action: string, input: ScreenInput): Promise<boolean> | boolean;
}

export interface OverviewHostApi {
  workspaceId(): string | null;
  viewId(): string | null;
  canWrite(): boolean;
  say(message: string, error?: boolean): void;
  write(verb: string, request: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  ask(label: string): Promise<string | null>;
  read(workspaceId: string, sidecarPath: string): Promise<unknown>;
  /** A note's rendered text, as the reader shows it, for S3's text panel (TASK-0148). */
  noteHtml?(workspaceId: string, noteId: string): Promise<string>;
  /** Leave the overview for an ordinary address (no page, no flow). */
  leaveTo(address: string): Promise<void>;
}

const pages = new Map<string, ScreenDefinition>();
const flows = new Map<string, ScreenDefinition>();

/** A screen registers itself here, the way a page or a flow registers its name in `vocabularies.ts`. */
export function registerScreen(kind: 'page' | 'flow', id: string, definition: ScreenDefinition): void {
  (kind === 'page' ? pages : flows).set(id, definition);
}

let api: OverviewHostApi | null = null;
let area: HTMLElement | null = null;
let stage: HTMLElement | null = null;
let callout: HTMLElement | null = null;
let listPanel: HTMLElement | null = null;
let current: { address: DeckAddress; scene: Scene; definition: ScreenDefinition } | null = null;
const models = new Map<string, { model: OverviewModel; at: number }>();
const memories = new Map<string, Map<string, unknown>>();
let drawing = 0;
/** The screens visited in this window, for back and forward (TASK-0146). */
let trail: Trail = emptyTrail();
/**
 * A step back or forward that has not yet drawn its screen: the address it asked
 * for and the trail it will leave. The draw that paints exactly that address takes
 * it; any other draw that paints first (a click that overtook it) clears it and is
 * added to the trail as an ordinary visit. So the trail and the screen shown always
 * change together, whichever draw wins (Codex's review of TASK-0146).
 */
let travelIntent: TravelIntent | null = null;
let historyBar: HTMLElement | null = null;
/** The current screen's panels, built as HTML over the picture (TASK-0147). */
let panels: PanelLayer | null = null;
/** What the camera turns, pans and zooms: the picture and its panels together (TASK-0156). */
let board: HTMLElement | null = null;
/** Each screen's camera, kept for the session, so coming back to the wheel finds it as it was left. */
const cameras = new Map<string, Camera>();
/** A middle-button drag in progress. */
let dragging: { x: number; y: number; pan: boolean } | null = null;

function cameraNow(): Camera | null {
  if (current === null) return null;
  return cameras.get(current.scene.screen) ?? defaultCamera(current.scene.screen);
}

function setCamera(camera: Camera): void {
  if (current === null || board === null) return;
  cameras.set(current.scene.screen, camera);
  board.style.transform = cameraTransform(camera);
}

/** Back to how the screen stands before anyone moves it. */
function resetCamera(): void {
  if (current !== null) setCamera(defaultCamera(current.scene.screen));
}

function wireCamera(target: HTMLElement): void {
  // The middle button turns, with Shift it pans; the browser's own middle-button
  // scrolling and link opening are stopped, so the press belongs to the overview.
  target.addEventListener('mousedown', (event) => {
    if (event.button === 1) event.preventDefault();
  });
  target.addEventListener('auxclick', (event) => {
    if (event.button === 1) event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 1 || current === null) return;
    event.preventDefault();
    dragging = { x: event.clientX, y: event.clientY, pan: event.shiftKey };
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (dragging === null) return;
    const camera = cameraNow();
    if (camera === null) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    dragging = { ...dragging, x: event.clientX, y: event.clientY };
    setCamera(dragging.pan || event.shiftKey ? panned(camera, dx, dy) : turned(camera, dx, dy));
  });
  const end = (event: PointerEvent): void => {
    if (dragging === null) return;
    dragging = null;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
  // The scroll wheel, or a pinch (which arrives with ctrl), zooms toward the pointer. It
  // is the overview's: it must not reach Glass's own zoom underneath (FEAT-0016).
  target.addEventListener(
    'wheel',
    (event) => {
      const camera = cameraNow();
      if (camera === null) return;
      event.preventDefault();
      event.stopPropagation();
      const box = target.getBoundingClientRect();
      const px = event.clientX - box.left - box.width / 2;
      const py = event.clientY - box.top - box.height / 2;
      const factor = event.ctrlKey ? wheelFactor(event.deltaY * 4) : wheelFactor(event.deltaY);
      setCamera(zoomed(camera, factor, px, py));
    },
    { passive: false },
  );
  target.addEventListener('dblclick', (event) => {
    const element = event.target as Element | null;
    if (element?.closest('[data-target], [data-ticket], [data-action], button, .ov-panel') != null) return;
    resetCamera();
  });
}
/**
 * How tickets are coloured: the cockpit's type colours with its fills (Edwin,
 * 2026-10-15), or DES-0004's state colours, for comparing the two on the wheel
 * (TASK-0145). Remembered in this browser only; it is a viewing preference.
 */
let colouring: 'type' | 'state' = readColouring();
let colouringToggle: HTMLButtonElement | null = null;

function readColouring(): 'type' | 'state' {
  try {
    return localStorage.getItem('deck.overview.colouring') === 'state' ? 'state' : 'type';
  } catch {
    return 'type';
  }
}

/** The screens the colouring changes: the rest draw tickets as the cockpit's rows and squares in both. */
const COLOURED_SCREENS = new Set(['wheel', 'rephase']);

async function switchColouring(): Promise<void> {
  if (current === null || !COLOURED_SCREENS.has(current.scene.screen)) return;
  colouring = colouring === 'type' ? 'state' : 'type';
  try {
    localStorage.setItem('deck.overview.colouring', colouring);
  } catch {
    // A page that cannot store it still switches for this session.
  }
  drawColouringToggle();
  // The same screen in the other colouring: it replaces the entry rather than adding one.
  if (current !== null) await showOverview({ ...current.address, colour: colouring === 'state' ? 'state' : null }, { replace: true });
}

function drawColouringToggle(): void {
  if (colouringToggle === null) return;
  const byType = colouring === 'type';
  colouringToggle.setAttribute('aria-pressed', String(!byType));
  // Shown only where it changes the picture (Codex's review, round two).
  colouringToggle.hidden = current === null || !COLOURED_SCREENS.has(current.scene.screen);
  colouringToggle.title = byType
    ? 'Tickets coloured by type, as in the cockpit. Press for the state colours (C)'
    : 'Tickets coloured by state. Press for the cockpit\'s type colours (C)';
}
let backButton: HTMLButtonElement | null = null;
let forwardButton: HTMLButtonElement | null = null;

const reducedMotion = (): boolean =>
  (globalThis as { __deckReducedMotion?: boolean }).__deckReducedMotion === true ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

export function initOverview(host: OverviewHostApi): void {
  api = host;
  area = document.getElementById('overview-area');
  if (area === null) throw new Error('the page has no #overview-area');
  area.replaceChildren();
  stage = document.createElement('div');
  stage.className = 'ov-stage';
  callout = document.createElement('div');
  callout.className = 'ov-callout';
  callout.hidden = true;
  callout.setAttribute('role', 'status');
  listPanel = document.createElement('nav');
  listPanel.className = 'ov-list';
  listPanel.hidden = true;
  listPanel.setAttribute('aria-label', 'This screen as a list');
  const listToggle = document.createElement('button');
  listToggle.type = 'button';
  listToggle.className = 'ov-list-toggle';
  listToggle.title = 'This screen as a list (L)';
  listToggle.setAttribute('aria-label', 'This screen as a list');
  listToggle.textContent = '☰';
  listToggle.addEventListener('click', () => toggleList());
  colouringToggle = document.createElement('button');
  colouringToggle.type = 'button';
  colouringToggle.className = 'ov-list-toggle ov-colouring-toggle';
  colouringToggle.setAttribute('aria-label', 'Colour tickets by type or by state');
  colouringToggle.textContent = '◐';
  colouringToggle.addEventListener('click', () => void switchColouring());
  drawColouringToggle();
  area.append(stage, callout, listPanel, listToggle, colouringToggle);

  historyBar = document.getElementById('ov-history');
  backButton = document.getElementById('ov-back') as HTMLButtonElement | null;
  forwardButton = document.getElementById('ov-forward') as HTMLButtonElement | null;
  backButton?.addEventListener('click', () => void travel(-1));
  forwardButton?.addEventListener('click', () => void travel(1));
  // The mouse's own back and forward buttons, over the overview.
  area.addEventListener('mouseup', (event) => {
    if (event.button === 3 || event.button === 4) {
      event.preventDefault();
      void travel(event.button === 3 ? -1 : 1);
    }
  });
  // The stage changes size without the window doing so (the rail folds, the status line
  // grows): the panels laid over the picture follow it.
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => panels?.place()).observe(stage);
  wireCamera(stage);
  stage.addEventListener('click', (event) => void onClick(event));
  window.addEventListener('resize', () => place());
  stage.addEventListener('pointerover', (event) => onPoint(event));
  stage.addEventListener('pointermove', (event) => moveCallout(event));
  stage.addEventListener('pointerleave', () => { hideCallout(); drawWires(null); });
  stage.addEventListener('focusin', (event) => onFocus(event));
  stage.addEventListener('focusout', () => hideCallout());
  // On the document, not the layer: after a click on the picture the keyboard is on the
  // body, and Escape and L must still work. Ignored while the overview is hidden.
  // In the capture phase, so the field's own shortcuts (H, Escape's sweep) do not also
  // act on a field the person cannot see.
  document.addEventListener(
    'keydown',
    (event) => {
      if (!isOverviewShown()) return;
      if (['Escape', 'l', 'L', 'h', 'H', 'c', 'C', '+', '=', '-', '0'].includes(event.key)) {
        const element = event.target as Element | null;
        const typing = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
        if (!typing) event.stopPropagation();
      }
      void onKey(event);
    },
    true,
  );
  // For the window run (TST-0093): what is drawn, and a way to follow an address as a click would.
  (globalThis as { __deckOverview?: unknown }).__deckOverview = {
    current: () => current?.scene ?? null,
    trail: () => ({ ...trail }),
    camera: () => cameraNow(),
    travel: (direction: -1 | 1) => travel(direction),
    screens: () => ({ pages: [...pages.keys()], flows: [...flows.keys()] }),
    go: (raw: string) => go(raw),
  };
}

export function isOverviewShown(): boolean {
  return area !== null && !area.hidden && current !== null;
}

export function hideOverview(): void {
  if (area === null) return;
  area.hidden = true;
  document.body.dataset['overviewScreen'] = '';
  if (historyBar !== null) historyBar.hidden = true;
  current = null;
  hideCallout();
}

/** The address of what the overview shows, for Copy address. */
export function overviewAddress(): string | null {
  return current === null ? null : current.scene.address;
}

/** Whether an address is the overview's: it names a page or a flow this layer draws. */
export function isOverviewAddress(address: DeckAddress): boolean {
  return (address.page !== null && pages.has(address.page)) || (address.flow !== null && flows.has(address.flow));
}

export function contextFor(workspaceId: string, viewId: string): ScreenContext {
  return {
    workspaceId,
    viewId,
    colouring,
    // Every overview address a screen writes keeps the colouring it was drawn in, so
    // copying an address and opening it shows the same picture (TASK-0145).
    address: (parts: AddressParts) => {
      const page = parts.page ?? null;
      const flow = parts.flow ?? null;
      return formatAddress(
        addressFor(workspaceId, viewId, {
          note: parts.note ?? null,
          page,
          flow,
          step: parts.step ?? null,
          colour: colouring === 'state' && (page !== null || flow !== null) ? 'state' : null,
        }),
      );
    },
  };
}

/** The colouring Deck opens the wheel in when no address names one: the person's last choice. */
export function preferredColour(): 'state' | null {
  return readColouring() === 'state' ? 'state' : null;
}

/** How long Deck waits for an index that is still being built before it says so. */
const BUILDING_WAIT_MS = 30000;

/**
 * The workspace's model, from Deck's host, kept for a few seconds.
 *
 * While the index is still being built the host answers `{ building: true }`
 * and no model. That answer is never kept: Deck asks again every half second,
 * and says what it is waiting for, until the model arrives or the wait runs out
 * (FEAT-0027's review, round one).
 */
export async function modelFor(workspaceId: string, fresh = false): Promise<OverviewModel> {
  const cached = models.get(workspaceId);
  if (!fresh && cached !== undefined && Date.now() - cached.at < 5000) return cached.model;
  const started = Date.now();
  for (;;) {
    const response = await fetch(`/deck/overview/${encodeURIComponent(workspaceId)}`);
    if (!response.ok) throw new Error(`the overview could not be read (${response.status})`);
    const body = (await response.json()) as Partial<OverviewModel> & { building?: boolean };
    if (body.building !== true && Array.isArray(body.phases) && body.tickets !== undefined) {
      const model = body as OverviewModel;
      models.set(workspaceId, { model, at: Date.now() });
      return model;
    }
    if (Date.now() - started > BUILDING_WAIT_MS) throw new Error('the notes are still being read; the overview will show when they are');
    api?.say('reading the notes for the overview…');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function memoryFor(workspaceId: string): Map<string, unknown> {
  let memory = memories.get(workspaceId);
  if (memory === undefined) {
    memory = new Map();
    memories.set(workspaceId, memory);
  }
  return memory;
}

function inputFor(model: OverviewModel, address: DeckAddress): ScreenInput {
  const host = api!;
  return {
    model,
    address,
    ctx: contextFor(address.workspaceId, address.viewId),
    memory: memoryFor(address.workspaceId),
    canWrite: host.canWrite(),
    write: (verb, request) => host.write(verb, { workspaceId: address.workspaceId, ...request }),
    ask: (label) => host.ask(label),
    read: (sidecarPath) => host.read(address.workspaceId, sidecarPath),
  };
}

/** Draw the screen an address names. Throws when nothing draws it. */
export async function showOverview(address: DeckAddress, options: { replace?: boolean } = {}): Promise<void> {
  if (api === null || area === null || stage === null) throw new Error('the overview layer is not ready');
  const definition = address.page !== null ? pages.get(address.page) : address.flow !== null ? flows.get(address.flow) : undefined;
  if (definition === undefined) throw new Error(`nothing draws ${address.page ?? address.flow ?? 'that address'}`);
  const ticket = ++drawing;
  // The address says how to colour the screen; it wins over the remembered preference.
  colouring = address.colour === 'state' ? 'state' : 'type';
  drawColouringToggle();
  const model = await modelFor(address.workspaceId);
  const input = inputFor(model, address);
  const scene = await definition.scene(input);
  // A slower draw that a newer one overtook is dropped, not painted over it.
  if (ticket !== drawing) return;
  paint(scene, address.workspaceId);
  current = { address, scene, definition };
  // Shown before it is measured: a hidden layer measures as nothing, and the panels
  // laid over the picture would be scaled to zero (Codex's review of TASK-0147).
  area.hidden = false;
  place();
  document.body.dataset['overviewScreen'] = scene.screen;
  drawColouringToggle();
  trail = afterDraw(trail, scene.address, travelIntent, options.replace === true);
  travelIntent = null;
  drawHistory();
  document.title = `Deck — ${scene.title}`;
}

function drawHistory(): void {
  if (historyBar === null || backButton === null || forwardButton === null) return;
  historyBar.hidden = false;
  backButton.disabled = !canGoBack(trail);
  forwardButton.disabled = !canGoForward(trail);
}

/**
 * One step back or forward through the screens visited. A screen of the same
 * workspace is drawn here; one of another workspace goes through Deck's own
 * address handling, which switches the workspace first.
 */
export async function travel(direction: -1 | 1): Promise<void> {
  if (api === null || !isOverviewShown()) return;
  const next = stepped(trail, direction);
  const raw = trailNow(next);
  if (next === trail || raw === null) return;
  const { parseAddress } = await import('../shared/address.js');
  const address = parseAddress(raw);
  const intent = { address: raw, next };
  travelIntent = intent;
  try {
    hideCallout();
    if (address.workspaceId === api.workspaceId()) await showOverview(address);
    else await api.leaveTo(raw);
  } catch (err) {
    api.say(err instanceof Error ? err.message : String(err), true);
  } finally {
    // Not drawn: refused, failed or overtaken. The trail stays where the screen is.
    if (travelIntent === intent) travelIntent = null;
    drawHistory();
  }
}

/** Under the header and beside the rail, measured, because the layer is fixed to the window. */
function place(): void {
  if (area === null) return;
  const bar = document.querySelector('.bar');
  const rail = document.getElementById('rail');
  const top = bar === null ? 0 : bar.getBoundingClientRect().bottom;
  const railBox = rail === null || document.body.classList.contains('pinned') ? null : rail.getBoundingClientRect();
  area.style.top = `${Math.round(top)}px`;
  area.style.left = `${railBox === null || railBox.width === 0 ? 0 : Math.round(railBox.right)}px`;
  // Above the status line, which is where Deck says what it is doing.
  const status = document.getElementById('status');
  const statusTop = status === null ? window.innerHeight : status.getBoundingClientRect().top;
  area.style.bottom = `${Math.max(0, Math.round(window.innerHeight - statusTop))}px`;
  panels?.place();
}

/** Draw the current screen again, from a model read afresh. */
export async function refreshOverview(): Promise<void> {
  if (current === null) return;
  models.delete(current.address.workspaceId);
  await showOverview(current.address);
}

function paint(scene: Scene, workspaceId: string): void {
  if (stage === null) return;
  const before = positions();
  stage.innerHTML = `<div class="ov-board">${sceneToSvg(scene, { panels: 'html' })}</div>`;
  board = stage.querySelector<HTMLElement>('.ov-board');
  centres = centresOf(scene);
  const svg = stage.querySelector('svg');
  svg?.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const host = api;
  if (board !== null) board.style.transform = cameraTransform(cameras.get(scene.screen) ?? defaultCamera(scene.screen));
  panels = buildPanels(scene, board ?? stage, {
    reduced: reducedMotion(),
    loader: host?.noteHtml === undefined ? null : (id) => host.noteHtml!(workspaceId, id),
    follow: (rel) => followNoteLink(workspaceId, rel),
  });
  animateFrom(before);
  drawList(scene);
}

/** Where each ticket's mark is on screen now, so the next screen can grow out of it. */
function positions(): Map<string, DOMRect> {
  const out = new Map<string, DOMRect>();
  if (stage === null) return out;
  for (const element of Array.from(stage.querySelectorAll<SVGGraphicsElement>('[data-ticket]'))) {
    const id = element.dataset['ticket'];
    if (id !== undefined && !out.has(id)) out.set(id, element.getBoundingClientRect());
  }
  return out;
}

function animateFrom(before: Map<string, DOMRect>): void {
  if (stage === null || before.size === 0 || reducedMotion()) return;
  const marks = Array.from(stage.querySelectorAll<SVGGraphicsElement>('[data-ticket]'));
  // Past a few hundred moving marks a frame costs more than the motion tells.
  let moved = 0;
  for (const element of marks) {
    const id = element.dataset['ticket'];
    const from = id === undefined ? undefined : before.get(id);
    if (from === undefined) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      continue;
    }
    if (moved >= 400) continue;
    const to = element.getBoundingClientRect();
    if (to.width === 0 && to.height === 0) continue;
    const dx = from.x + from.width / 2 - (to.x + to.width / 2);
    const dy = from.y + from.height / 2 - (to.y + to.height / 2);
    element.style.transformBox = 'fill-box';
    element.style.transformOrigin = 'center';
    element.animate(
      [{ transform: `translate(${dx}px, ${dy}px)`, opacity: 0.6 }, { transform: 'translate(0, 0)', opacity: 1 }],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    moved += 1;
  }
}

function drawList(scene: Scene): void {
  if (listPanel === null) return;
  listPanel.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = scene.title;
  listPanel.appendChild(title);
  let group: string | null = null;
  let ul: HTMLUListElement | null = null;
  for (const row of scene.list) {
    if (row.group !== group || ul === null) {
      group = row.group;
      const heading = document.createElement('h3');
      heading.textContent = row.group;
      ul = document.createElement('ul');
      listPanel.append(heading, ul);
    }
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = row.label;
    button.dataset['id'] = row.id;
    if (row.state !== undefined) button.dataset['state'] = row.state;
    if (row.target !== undefined) button.addEventListener('click', () => void go(row.target!));
    else if (row.action !== undefined) button.addEventListener('click', () => void act(row.action!));
    else button.disabled = true;
    li.appendChild(button);
    ul.appendChild(li);
  }
}

function toggleList(force?: boolean): void {
  if (listPanel === null) return;
  listPanel.hidden = force === undefined ? !listPanel.hidden : !force;
  if (!listPanel.hidden) listPanel.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
}

/**
 * A link inside a ticket's text (S3): the note it names opens as its own ticket
 * screen when the overview knows it, and otherwise in the view, as Deck opens
 * any note.
 */
async function followNoteLink(workspaceId: string, rel: string): Promise<void> {
  if (api === null || current === null) return;
  try {
    const response = await fetch(`/deck/records/${encodeURIComponent(workspaceId)}?rel=${encodeURIComponent(rel)}`);
    const record = response.ok ? ((await response.json()) as { records?: Array<{ id?: string }> }).records?.[0] : undefined;
    const id = record?.id;
    if (id === undefined || id === '') {
      api.say(`that link names ${rel}, which Deck has no note for`, true);
      return;
    }
    const model = await modelFor(workspaceId);
    const ctx = contextFor(workspaceId, current.address.viewId);
    await go(model.tickets[id] !== undefined ? ctx.address({ page: 'ticket', note: id }) : ctx.address({ note: id }));
  } catch (err) {
    api.say(err instanceof Error ? err.message : String(err), true);
  }
}

/** Follow an address: another overview screen, or out of the overview. */
export async function go(raw: string): Promise<void> {
  if (api === null) return;
  const { parseAddress } = await import('../shared/address.js');
  const address = parseAddress(raw);
  hideCallout();
  if (isOverviewAddress(address)) await showOverview(address);
  else {
    hideOverview();
    await api.leaveTo(raw);
  }
}

async function act(action: string): Promise<void> {
  if (current === null || api === null) return;
  const { definition, address } = current;
  if (definition.onAction === undefined) return;
  try {
    const input = inputFor(await modelFor(address.workspaceId), address);
    const redraw = await definition.onAction(action, input);
    if (redraw) await showOverview(address);
  } catch (err) {
    api.say(err instanceof Error ? err.message : String(err), true);
  }
}

async function onClick(event: MouseEvent): Promise<void> {
  const target = event.target as Element | null;
  if (target === null || current === null) return;
  const control = target.closest('[data-action]');
  if (control !== null) {
    await act(control.getAttribute('data-action')!);
    return;
  }
  const ticket = target.closest('[data-ticket]');
  const link = target.closest('[data-target]');
  // A ticket's own mark opens the ticket, unless the mark itself carries an address.
  if (ticket !== null && ticket.getAttribute('data-target') === null && !(ticket.classList.contains('ov-hit') && link !== null)) {
    const id = ticket.getAttribute('data-ticket')!;
    if (current.scene.list.some((row) => row.id === id && row.target !== undefined)) {
      const row = current.scene.list.find((r) => r.id === id)!;
      await go(row.target!);
      return;
    }
  }
  if (link !== null) await go(link.getAttribute('data-target')!);
}

function labelOf(element: Element | null): string | null {
  const labelled = element?.closest('[data-label]');
  return labelled?.getAttribute('data-label') ?? null;
}

/** Where each ticket's mark stands in the current scene, by its own geometry, for the wires. */
let centres: Map<string, [number, number]> = new Map();

function centresOf(scene: Scene): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const node of walkScene(scene.nodes)) {
    if (node.kind !== 'mark' || node.ticket === undefined || out.has(node.ticket)) continue;
    if (node.attrs['cx'] !== undefined) out.set(node.ticket, [Number(node.attrs['cx']), Number(node.attrs['cy'])]);
    else if (node.attrs['points'] !== undefined) {
      const xy = String(node.attrs['points']).split(/[ ,]/).map(Number);
      const xs = xy.filter((_, i) => i % 2 === 0);
      const ys = xy.filter((_, i) => i % 2 === 1);
      out.set(node.ticket, [xs.reduce((a, b) => a + b, 0) / xs.length, ys.reduce((a, b) => a + b, 0) / ys.length]);
    }
  }
  return out;
}

/**
 * Pointing at a ticket on the wheel draws a wire to every ticket it links to and every
 * ticket that links to it, where those are on screen (TASK-0155). From the scene's own
 * coordinates, so the wires stay right when the picture is turned in 3D.
 */
function drawWires(element: Element | null): void {
  const svg = stage?.querySelector('svg');
  svg?.querySelector('.ov-links')?.remove();
  if (svg === null || svg === undefined || current === null || current.scene.screen !== 'wheel' || element === null) return;
  const id = element.closest('[data-ticket]')?.getAttribute('data-ticket');
  const model = models.get(current.address.workspaceId)?.model;
  if (id === null || id === undefined || model === undefined || model.tickets[id] === undefined) return;
  const from = centres.get(id);
  if (from === undefined) return;
  const linked = new Set(model.tickets[id]!.links);
  for (const other of Object.values(model.tickets)) if (other.links.includes(id)) linked.add(other.id);
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'ov-links');
  for (const other of linked) {
    const to = centres.get(other);
    if (to === undefined || other === id) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(from[0]));
    line.setAttribute('y1', String(from[1]));
    line.setAttribute('x2', String(to[0]));
    line.setAttribute('y2', String(to[1]));
    g.appendChild(line);
  }
  svg.appendChild(g);
}

function onPoint(event: PointerEvent): void {
  drawWires(event.target as Element | null);
  const label = labelOf(event.target as Element | null);
  if (label === null) {
    hideCallout();
    return;
  }
  showCallout(label, event.clientX, event.clientY);
}

function onFocus(event: FocusEvent): void {
  const element = event.target as Element | null;
  drawWires(element);
  const label = labelOf(element);
  if (label === null || element === null) return;
  const box = element.getBoundingClientRect();
  showCallout(label, box.right, box.top);
}

function showCallout(text: string, x: number, y: number): void {
  if (callout === null || area === null) return;
  callout.textContent = text;
  callout.hidden = false;
  placeCallout(x, y);
}

function moveCallout(event: PointerEvent): void {
  if (callout === null || callout.hidden) return;
  placeCallout(event.clientX, event.clientY);
}

function placeCallout(x: number, y: number): void {
  if (callout === null || area === null) return;
  const box = area.getBoundingClientRect();
  const left = Math.min(x - box.left + 18, box.width - callout.offsetWidth - 12);
  const top = Math.min(y - box.top + 18, box.height - callout.offsetHeight - 12);
  callout.style.left = `${Math.max(8, left)}px`;
  callout.style.top = `${Math.max(8, top)}px`;
}

function hideCallout(): void {
  if (callout !== null) callout.hidden = true;
}

async function onKey(event: KeyboardEvent): Promise<void> {
  if (current === null) return;
  const element = event.target as Element | null;
  // The keyboard reaches every ticket: arrows step from a focused group into its
  // ticket marks and along them, and Enter opens the ticket under focus.
  if (element !== null && stage?.contains(element) && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const isTicket = element.hasAttribute('data-ticket') && element.getAttribute('tabindex') === '-1';
    const scope = isTicket ? element.closest('[data-key]') ?? stage : element;
    // A row in a folded section is not on screen, so the arrows pass over it.
    const marks = Array.from(scope.querySelectorAll<SVGElement>('[data-ticket][tabindex="-1"]')).filter((m) => !(m instanceof HTMLElement) || m.offsetParent !== null);
    if (marks.length > 0) {
      event.preventDefault();
      const at = isTicket ? marks.indexOf(element as SVGElement) : -1;
      const next = marks[(at + step + marks.length) % marks.length] ?? marks[0]!;
      next.focus();
    }
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && element !== null && stage?.contains(element) && element.getAttribute('data-target') === null && element.getAttribute('data-action') === null && element.hasAttribute('data-ticket')) {
    const row = current.scene.list.find((r) => r.id === element.getAttribute('data-ticket') && r.target !== undefined);
    if (row?.target !== undefined) {
      event.preventDefault();
      await go(row.target);
      return;
    }
  }
  if ((event.key === 'Enter' || event.key === ' ') && element !== null && stage?.contains(element)) {
    const action = element.getAttribute('data-action');
    const target = element.getAttribute('data-target');
    if (action !== null || target !== null) {
      event.preventDefault();
      if (action !== null) await act(action);
      else await go(target!);
    }
    return;
  }
  if (event.metaKey && (event.key === '[' || event.key === ']')) {
    event.preventDefault();
    await travel(event.key === '[' ? -1 : 1);
    return;
  }
  if (event.key === 'Escape' && !(element instanceof HTMLInputElement)) {
    if (listPanel !== null && !listPanel.hidden) {
      toggleList(false);
      return;
    }
    const back = current.scene.list.find((row) => row.id === 'back');
    if (back?.target !== undefined) {
      event.preventDefault();
      await go(back.target);
    }
    return;
  }
  // Typing in a field elsewhere (the status bar's question, a search box) is not a shortcut.
  const typing = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
  if (typing) return;
  if (event.key === 'l' || event.key === 'L') {
    event.preventDefault();
    toggleList();
  }
  // + and − zoom, 0 puts the camera back (TASK-0156): for a trackpad with no middle button.
  if ((event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0') && !event.metaKey && !event.ctrlKey) {
    const camera = cameraNow();
    if (camera === null) return;
    event.preventDefault();
    if (event.key === '0') resetCamera();
    else setCamera(zoomed(camera, event.key === '-' ? 1 / 1.25 : 1.25));
  }
  if ((event.key === 'c' || event.key === 'C') && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    await switchColouring();
  }
}
