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
import type { TowersView } from './overview-towers-view.js';
import { FRAME_ACTION, standsIn } from '../shared/overview-select.js';
import { SEARCH_LIST, searchTickets } from '../shared/overview-search.js';
import { square } from './overview-panels.js';
import type { TowersNode } from '../shared/overview-scene.js';
import { cameraTransform, defaultCamera, isDefault, panned, turned, viewed, VIEW_WORD, VIEWS, wheelFactor, withinView, zoomed, type Camera, type View } from '../shared/overview-camera.js';
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

/**
 * When a note last changed, in seconds, from Deck's own index: the guard a write sends
 * so the sidecar refuses a note that changed after the screen was drawn (ADR-0003).
 * Undefined when Deck cannot tell; a caller that writes then refuses rather than
 * writing unguarded (the review of TASK-0160).
 */
export async function noteMtime(workspaceId: string, id: string): Promise<number | undefined> {
  try {
    const response = await fetch(`/deck/records/${encodeURIComponent(workspaceId)}?id=${encodeURIComponent(id)}`);
    if (!response.ok) return undefined;
    const ms = ((await response.json()) as { records?: Array<{ mtimeMs?: number }> }).records?.[0]?.mtimeMs;
    return typeof ms === 'number' ? ms / 1000 : undefined;
  } catch {
    return undefined;
  }
}

/** The modification time a screen saw when it was drawn, kept for its writes. */
export const drawnMtimeKey = (id: string): string => `drawn-mtime:${id}`;

/** The time kept when the screen was drawn, or a refusal: never a write without the guard. */
export function drawnMtime(memory: Map<string, unknown>, id: string): number {
  const mtime = memory.get(drawnMtimeKey(id));
  if (typeof mtime !== 'number') throw new Error(`Deck could not tell when ${id} last changed, so it will not write over it; open it again`);
  return mtime;
}

/** What a page or a flow registered: for the node tests, which drive a screen's actions with no window. */
export function registeredScreen(kind: 'page' | 'flow', id: string): ScreenDefinition | undefined {
  return (kind === 'page' ? pages : flows).get(id);
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

/**
 * The 3D view of the towers (TASK-0167): made once, the first time a screen carries a
 * towers node, and handed each next layout. Null when WebGL cannot start, and the
 * scene's flat plan is shown instead.
 */
let towersView: TowersView | null | undefined;

/** Whether the current screen is drawn by the 3D view, so the camera and pointing are its. */
function towersActive(): boolean {
  return towersView !== null && towersView !== undefined && stage?.classList.contains('ov-3d') === true;
}

function towersOf(scene: Scene): TowersNode | undefined {
  return scene.nodes.find((n): n is TowersNode => n.kind === 'towers');
}

/** The pixels at the right of the stage a phase's list covers, so the segment stands clear of it. */
function panelCover(): number {
  if (stage === null || current === null) return 0;
  // The panel standing against the right edge: a phase's list, or a selected ticket's pane (TASK-0182).
  const width = current.scene.width;
  const right = current.scene.nodes.filter((n) => n.kind === 'panel' && n.x + n.w >= width - 60 && n.x > width / 3);
  if (right.length === 0) return 0;
  const x = Math.min(...right.map((n) => (n.kind === 'panel' ? n.x : width)));
  const box = stage.getBoundingClientRect();
  const scale = Math.min(box.width / width, box.height / current.scene.height);
  const left = (box.width - width * scale) / 2 + x * scale;
  return Math.max(0, box.width - left);
}

/**
 * The 3D view's module, loaded the first time a screen needs it: three.js comes with it,
 * so a page that cannot load three.js still draws everything else, and the towers flat.
 */
let towersLoading: Promise<void> | null = null;

function ensureTowersView(): TowersView | null {
  if (towersView !== undefined) return towersView;
  if (towersLoading === null) {
    towersLoading = import('./overview-towers-view.js').then(
      (module) => { makeTowersView(module.createTowersView); },
      () => { towersView = null; },
    ).then(() => {
      // Draw the screen again now the view is there (or is known not to be).
      if (current !== null && towersOf(current.scene) !== undefined) {
        paint(current.scene, current.address.workspaceId);
        showTowers(current.scene);
        drawCameraBar();
      }
    });
  }
  return null;
}

function makeTowersView(create: typeof import('./overview-towers-view.js').createTowersView): void {
  towersView = create({
    reduced: () => reducedMotion(),
    onHover: (label, x, y) => (label === null ? hideCallout() : showCallout(label, x, y)),
    onPress: (target) => void go(target),
    clearRight: () => panelCover(),
    linksOf: (id) => {
      const model = current === null ? undefined : models.get(current.address.workspaceId)?.model;
      return model === undefined ? [] : [...(model.tickets[id]?.links ?? []), ...(linksInto(model).get(id) ?? [])];
    },
    onCamera: () => drawCameraBar(),
  });
}

function cameraNow(): Camera | null {
  if (current === null) return null;
  return cameras.get(current.scene.screen) ?? defaultCamera(current.scene.screen);
}

/** Half the stage's size: the pan stops where the picture's centre would leave it (TASK-0162). */
function halfView(): { w: number; h: number } | undefined {
  if (stage === null) return undefined;
  const box = stage.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? { w: box.width / 2, h: box.height / 2 } : undefined;
}

let glideTimer: number | null = null;

function setCamera(camera: Camera, options: { glide?: boolean } = {}): void {
  if (current === null || board === null) return;
  const held = withinView(camera, halfView());
  cameras.set(current.scene.screen, held);
  // Home and the three views glide there; a drag or a zoom follows the hand at once.
  // A second glide within the first's time takes over its timer, so the first does not cut it short.
  if (glideTimer !== null) window.clearTimeout(glideTimer);
  glideTimer = null;
  if (options.glide === true && !reducedMotion()) {
    const moving = board;
    moving.style.transition = 'transform 320ms ease-out';
    glideTimer = window.setTimeout(() => {
      moving.style.transition = '';
      glideTimer = null;
    }, 360);
  } else board.style.transition = '';
  board.style.transform = cameraTransform(held);
  drawCameraBar();
}

/**
 * The Home key moves the camera only when focus is on the page itself or on the
 * overview's picture. In the navigator's list it goes to the first row, as the
 * navigator's own handler does; in the list twin it is left to the browser,
 * which scrolls the list to its top.
 */
function homeIsTheCamera(event: KeyboardEvent): boolean {
  const element = event.target as Element | null;
  if (element === null || element === document.body || element === document.documentElement) return true;
  return area !== null && area.contains(element) && element.closest('.ov-list') === null;
}

/** Back to how the screen stands before anyone moves it. */
function resetCamera(): void {
  if (towersActive()) towersView!.home();
  else if (current !== null) setCamera(defaultCamera(current.scene.screen), { glide: true });
}

/** Whether the current screen's camera has been moved, so Home has somewhere to go. */
function cameraMoved(): boolean {
  if (towersActive()) return towersView!.isMoved();
  const camera = cameraNow();
  return current !== null && camera !== null && !isDefault(camera, current.scene.screen);
}

/**
 * Home and the three views (TASK-0162). Edwin, 2026-10-16: "when rotating in 3d
 * and zooming, it is difficult to get the screen back to its original
 * position." Home shows only once the camera has moved.
 */
let cameraBar: HTMLElement | null = null;
let homeButton: HTMLButtonElement | null = null;
const viewButtons = new Map<View, HTMLButtonElement>();
const VIEW_GLYPH: Readonly<Record<View, string>> = { above: '◉', leaning: '◒', side: '▬' };

function buildCameraBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'ov-camera-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Camera');
  homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.className = 'ov-camera-home';
  homeButton.textContent = '⌂';
  homeButton.title = 'Back to where this screen starts (Home, 0)';
  homeButton.setAttribute('aria-label', 'Back to where this screen starts');
  homeButton.addEventListener('click', () => resetCamera());
  bar.append(homeButton);
  for (const view of VIEWS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.view = view;
    button.textContent = VIEW_GLYPH[view];
    button.title = `${VIEW_WORD[view]}: the picture seen ${view === 'above' ? 'flat, from straight above' : view === 'side' ? 'nearly edge on, so its depth shows' : 'leaning back, as the ring screens start'}`;
    button.setAttribute('aria-label', VIEW_WORD[view]);
    button.addEventListener('click', () => {
      if (towersActive()) {
        towersView!.view(view);
        return;
      }
      const camera = cameraNow();
      if (camera !== null && current !== null) setCamera(viewed(camera, current.scene.screen, view), { glide: true });
    });
    viewButtons.set(view, button);
    bar.append(button);
  }
  return bar;
}

function drawCameraBar(): void {
  if (cameraBar === null || homeButton === null) return;
  cameraBar.hidden = current === null;
  homeButton.hidden = !cameraMoved();
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
    // The 3D view turns its own camera from its canvas.
    if (event.button !== 1 || current === null || towersActive()) return;
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
    setCamera(dragging.pan || event.shiftKey ? panned(camera, dx, dy, halfView()) : turned(camera, dx, dy));
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
      if (towersActive()) {
        towersView!.zoom(event.ctrlKey ? wheelFactor(event.deltaY * 4) : wheelFactor(event.deltaY));
        return;
      }
      const box = target.getBoundingClientRect();
      const px = event.clientX - box.left - box.width / 2;
      const py = event.clientY - box.top - box.height / 2;
      const factor = event.ctrlKey ? wheelFactor(event.deltaY * 4) : wheelFactor(event.deltaY);
      setCamera(zoomed(camera, factor, px, py, halfView()));
    },
    { passive: false },
  );
  target.addEventListener('dblclick', (event) => {
    const element = event.target as Element | null;
    if (element?.closest('[data-target], [data-ticket], [data-action], button, .ov-panel, .ov-towers') != null) return;
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
  cameraBar = buildCameraBar();
  searchBox = buildSearch();
  // "◷ Ages" hides and shows the badges on quiet towers (TASK-0184), for this window.
  agesToggle = document.createElement('button');
  agesToggle.type = 'button';
  agesToggle.className = 'ov-list-toggle ov-ages-toggle';
  agesToggle.textContent = '◷';
  agesToggle.setAttribute('aria-pressed', 'true');
  agesToggle.title = 'Ages: hide the badges on towers quiet for 14 days or more';
  agesToggle.setAttribute('aria-label', 'Show or hide how long each quiet tower has been quiet');
  agesToggle.hidden = true;
  agesToggle.addEventListener('click', () => {
    showAges = !showAges;
    agesToggle!.setAttribute('aria-pressed', String(showAges));
    agesToggle!.title = showAges ? 'Ages: hide the badges on towers quiet for 14 days or more' : 'Ages: show how long each quiet tower has been quiet';
    if (towersActive()) towersView!.showAges(showAges);
  });
  groupingToggle = document.createElement('button');
  groupingToggle.type = 'button';
  groupingToggle.className = 'ov-grouping-toggle';
  groupingToggle.hidden = true;
  groupingToggle.addEventListener('click', () => void switchGrouping());
  area.append(stage, callout, listPanel, listToggle, colouringToggle, agesToggle, groupingToggle, cameraBar, searchBox);

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
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { panels?.place(); if (towersActive()) towersView!.resize(); }).observe(stage);
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
      // Home belongs to the navigator's list and the list twin when focus is in them (review of TASK-0162).
      if (event.key === 'Home' && !homeIsTheCamera(event)) return;
      if (['Escape', 'l', 'L', 'h', 'H', 'c', 'C', '+', '=', '-', '0', 'Home', '/'].includes(event.key)) {
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
    // The 3D view of the towers, for the window run to press through (TASK-0169).
    towers: () => (towersActive() ? towersView!.probe : null),
    // What the search box holds and lights (TASK-0183).
    search: () => ({ shown: searchBox !== null && !searchBox.hidden, query: searchInput?.value ?? '', found: searching?.ids.length ?? null, listed: searchList?.children.length ?? 0, said: searchCount?.textContent ?? '' }),
  };
}

// ---------------------------------------------------------------------------
// Search on the towers (TASK-0183): the box in the overview's corner finds tickets by
// the words starting their ids and titles, lights them where they stand and fades the
// rest; up to twelve are listed under it, what needs you first. Choosing one selects it
// and flies the camera to it. Escape clears the search before anything else.

let searchBox: HTMLElement | null = null;
let searchInput: HTMLInputElement | null = null;
let searchCount: HTMLElement | null = null;
let searchList: HTMLElement | null = null;
let searching: { query: string; ids: string[]; active: number } | null = null;
/** Set while the search itself redraws the screen (to drop a selection), so that draw keeps it. */
let searchRedraw = false;

function buildSearch(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'ov ov-search';
  box.hidden = true;
  searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Find a ticket  /';
  searchInput.setAttribute('aria-label', 'Find tickets on the towers by the words of their ids and titles');
  searchInput.spellcheck = false;
  searchCount = document.createElement('span');
  searchCount.className = 'ov-search-count';
  searchList = document.createElement('ul');
  searchList.className = 'ov-search-list';
  searchList.setAttribute('role', 'listbox');
  box.append(searchInput, searchCount, searchList);
  searchInput.addEventListener('input', () => void runSearch());
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (searchInput!.value !== '') clearSearch();
      else searchInput!.blur();
      return;
    }
    if (searching === null || searching.ids.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const shown = Math.min(SEARCH_LIST, searching.ids.length);
      searching.active = (searching.active + (event.key === 'ArrowDown' ? 1 : -1) + shown) % shown;
      drawSearchList();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void chooseMatch(searching.ids[Math.max(0, searching.active)]!);
    }
  });
  return box;
}

/** The box is there only where the towers are: the wheel and a phase brought close. So is ◷. */
function drawSearchBox(): void {
  const off = current === null || towersOf(current.scene) === undefined;
  if (searchBox !== null) searchBox.hidden = off;
  if (agesToggle !== null) agesToggle.hidden = off || !towersActive();
}

let agesToggle: HTMLButtonElement | null = null;
let showAges = true;

async function runSearch(): Promise<void> {
  if (current === null || searchInput === null) return;
  const query = searchInput.value;
  if (query.trim() === '') {
    clearSearch(false);
    return;
  }
  const model = models.get(current.address.workspaceId)?.model;
  if (model === undefined) return;
  // A search replaces a selection: the screen is drawn again with nothing selected.
  if (current.address.select !== null) {
    searchRedraw = true;
    try {
      await showOverview({ ...current.address, select: null }, { replace: true });
    } finally {
      searchRedraw = false;
    }
  }
  const ids = searchTickets(model, query).map((t) => t.id);
  searching = { query, ids, active: -1 };
  lightFound(ids);
  if (searchCount !== null) searchCount.textContent = ids.length === 0 ? 'none found' : `${ids.length} found`;
  drawSearchList();
}

function drawSearchList(): void {
  if (searchList === null || current === null) return;
  searchList.replaceChildren();
  const model = models.get(current.address.workspaceId)?.model;
  if (searching === null || model === undefined) return;
  searching.ids.slice(0, SEARCH_LIST).forEach((id, i) => {
    const t = model.tickets[id]!;
    const li = document.createElement('li');
    li.className = `ov-search-row${i === searching!.active ? ' is-active' : ''}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === searching!.active));
    li.dataset['ticket'] = id;
    const idEl = document.createElement('span');
    idEl.className = 'ov-row-id';
    idEl.textContent = id;
    const title = document.createElement('span');
    title.className = 'ov-row-title';
    title.textContent = t.title;
    li.append(square(t), idEl, title);
    li.addEventListener('mousedown', (event) => event.preventDefault());
    li.addEventListener('click', () => void chooseMatch(id));
    searchList!.appendChild(li);
  });
}

/** Light the tickets a search found: in 3D, glows over them; flat, the rest fade. */
function lightFound(ids: readonly string[] | null): void {
  if (towersActive()) towersView!.light(ids);
  if (stage === null) return;
  const set = new Set(ids ?? []);
  stage.classList.toggle('ov-searching', ids !== null);
  for (const element of Array.from(stage.querySelectorAll<SVGElement>('.ov-plan [data-ticket]'))) element.classList.toggle('is-found', set.has(element.dataset['ticket'] ?? ''));
}

function clearSearch(andText = true): void {
  if (searching !== null) lightFound(null);
  searching = null;
  if (andText && searchInput !== null) searchInput.value = '';
  if (searchCount !== null) searchCount.textContent = '';
  searchList?.replaceChildren();
}

/**
 * Light a set of tickets the way a search does, with words in the box instead of a query
 * (TASK-0184: a reason of the needs-you bar, a week). Escape clears it as it clears a search.
 */
function lightTickets(ids: readonly string[], words: string): void {
  if (current === null) return;
  clearSearch();
  searching = { query: '', ids: [...ids], active: -1 };
  lightFound(ids);
  if (searchCount !== null) searchCount.textContent = words.replace(/: light them on the towers$/, '');
  drawSearchList();
}

/** A match chosen: selected where it stands, on the phase brought close when it stands in it, else on the whole ring. */
async function chooseMatch(id: string): Promise<void> {
  if (current === null || api === null) return;
  const towers = towersOf(current.scene);
  const open = current.address.page === 'phase' ? current.address.note : null;
  const inOpen = open !== null && towers !== undefined && standsIn(towers.layout, id) === open;
  const ctx = contextFor(current.address.workspaceId, current.address.viewId);
  clearSearch();
  searchInput?.blur();
  await go(inOpen ? ctx.address({ page: 'phase', note: open, select: id }) : ctx.address({ page: 'wheel', select: id }));
  if (towersActive()) towersView!.flyTo(id);
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
    grouping,
    // Every overview address a screen writes keeps the colouring it was drawn in, so
    // copying an address and opening it shows the same picture (TASK-0145); every wheel
    // address keeps the grouping (TASK-0185).
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
          select: parts.select ?? null,
          group: grouping === 'feature' && page === 'wheel' ? 'feature' : null,
        }),
      );
    },
  };
}

/** The colouring Deck opens the wheel in when no address names one: the person's last choice. */
export function preferredColour(): 'state' | null {
  return readColouring() === 'state' ? 'state' : null;
}

/**
 * How the wheel's ring is grouped (TASK-0185): by phase, as it opens, or by feature. A wheel's
 * address says which; Deck remembers the last choice on this machine only for opening the wheel.
 */
let grouping: 'phase' | 'feature' = 'phase';
let groupingToggle: HTMLButtonElement | null = null;

function readGrouping(): 'phase' | 'feature' {
  try {
    return localStorage.getItem('deck.overview.grouping') === 'feature' ? 'feature' : 'phase';
  } catch {
    return 'phase';
  }
}

/** The grouping Deck opens the wheel in when no address names one: the person's last choice. */
export function preferredGrouping(): 'feature' | null {
  return readGrouping() === 'feature' ? 'feature' : null;
}

async function switchGrouping(): Promise<void> {
  if (current === null || current.scene.screen !== 'wheel') return;
  const next = grouping === 'phase' ? 'feature' : 'phase';
  try {
    localStorage.setItem('deck.overview.grouping', next);
  } catch {
    // A page that cannot store it still switches for this window.
  }
  await showOverview({ ...current.address, select: null, group: next === 'feature' ? 'feature' : null });
}

function drawGroupingToggle(): void {
  if (groupingToggle === null) return;
  groupingToggle.hidden = current === null || current.scene.screen !== 'wheel';
  groupingToggle.textContent = grouping === 'feature' ? 'By feature' : 'By phase';
  groupingToggle.setAttribute('aria-pressed', String(grouping === 'feature'));
  groupingToggle.title = grouping === 'feature' ? 'The ring is grouped by feature. Press to group it by phase' : 'The ring is grouped by phase. Press to group it by feature';
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
  // Any other move clears the search: bringing a phase close, a selection, back and forward (TASK-0183).
  if (!searchRedraw) clearSearch();
  // The address says how to colour the screen; it wins over the remembered preference.
  colouring = address.colour === 'state' ? 'state' : 'type';
  // The wheel's address says how its ring is grouped; another screen keeps the wheel's grouping for its way back.
  if (address.page === 'wheel') grouping = address.group === 'feature' ? 'feature' : 'phase';
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
  drawGroupingToggle();
  drawSearchBox();
  // After `current` is the new screen and laid out: the 3D view flies to it.
  showTowers(scene);
  // After `current` is the new screen: Home is shown for the screen being opened, not the
  // one being left (review of TASK-0162).
  drawCameraBar();
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
  // The towers are drawn in 3D under the scene's controls; the flat plan stays for a
  // window with no WebGL (TASK-0167).
  const towers = towersOf(scene);
  const view = towers === undefined ? null : ensureTowersView();
  stage.classList.toggle('ov-3d', towers !== undefined && view !== null);
  // Flat because WebGL could not start; while the module is still loading it is flat without a word.
  stage.classList.toggle('ov-flat', towers !== undefined && view === null && towersView === null);
  if (towers !== undefined && view !== null && board !== null) {
    board.style.transform = 'none';
    board.prepend(view.canvas);
  }
  panels = buildPanels(scene, board ?? stage, {
    reduced: reducedMotion(),
    loader: host?.noteHtml === undefined ? null : (id) => host.noteHtml!(workspaceId, id),
    follow: (rel) => followNoteLink(workspaceId, rel),
  });
  animateFrom(before);
  drawList(scene);
}

/** After a screen with towers is current and laid out: hand the 3D view its layout. */
function showTowers(scene: Scene): void {
  const towers = towersOf(scene);
  if (towers === undefined || !towersActive()) return;
  towersView!.resize();
  towersView!.show(towers.layout);
  towersView!.showAges(showAges);
  drawSearchBox();
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
    else if (row.lights !== undefined) button.addEventListener('click', () => lightTickets(row.lights!, row.label));
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
  // The selected ticket's Frame button moves the 3D camera; no screen answers it (TASK-0182).
  if (action === FRAME_ACTION) {
    if (towersActive()) towersView!.frame();
    else api.say('Frame turns the 3D view, which this window could not start');
    return;
  }
  const { definition, address } = current;
  if (definition.onAction === undefined) return;
  try {
    const input = inputFor(await modelFor(address.workspaceId), address);
    const redraw = await definition.onAction(action, input);
    // A write changes the notes: the screen is drawn again from a model read afresh.
    if (redraw) {
      models.delete(address.workspaceId);
      await showOverview(address, { replace: true });
    }
  } catch (err) {
    api.say(err instanceof Error ? err.message : String(err), true);
  }
}

async function onClick(event: MouseEvent): Promise<void> {
  const target = event.target as Element | null;
  if (target === null || current === null) return;
  // A part of the needs-you bar, a reason, a week: lights its tickets as a search does (TASK-0184).
  const lights = target.closest('[data-light]');
  if (lights !== null) {
    lightTickets((lights.getAttribute('data-light') ?? '').split(' ').filter(Boolean), lights.getAttribute('data-light-label') ?? '');
    return;
  }
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

/** Which tickets link to each ticket, built once per model rather than on every pointer move. */
let linkedFrom: { model: OverviewModel; from: Map<string, string[]> } | null = null;

function linksInto(model: OverviewModel): Map<string, string[]> {
  if (linkedFrom?.model === model) return linkedFrom.from;
  const from = new Map<string, string[]>();
  for (const t of Object.values(model.tickets)) for (const target of t.links) from.set(target, [...(from.get(target) ?? []), t.id]);
  linkedFrom = { model, from };
  return from;
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
  const linked = new Set([...model.tickets[id]!.links, ...(linksInto(model).get(id) ?? [])]);
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
  // On the towers, the 3D view points for itself; a row of the phase's list outlines its floor.
  if (towersActive()) {
    const element = event.target as Element | null;
    if (element?.closest('.ov-towers') != null) return;
    towersView!.select(element?.closest('[data-ticket]')?.getAttribute('data-ticket') ?? null);
  } else drawWires(event.target as Element | null);
  const label = labelOf(event.target as Element | null);
  if (label === null) {
    hideCallout();
    return;
  }
  showCallout(label, event.clientX, event.clientY);
}

function onFocus(event: FocusEvent): void {
  const element = event.target as Element | null;
  // On the towers, the keyboard moves through the invisible flat plan; the 3D view outlines the floor.
  if (towersActive()) towersView!.select(element?.closest('[data-ticket]')?.getAttribute('data-ticket') ?? null);
  else drawWires(element);
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
    // Escape steps back one thing at a time: the search first (TASK-0183).
    if (searching !== null || (searchInput?.value ?? '') !== '') {
      event.preventDefault();
      clearSearch();
      return;
    }
    if (listPanel !== null && !listPanel.hidden) {
      toggleList(false);
      return;
    }
    // A moved camera comes home first; Escape on a screen as it started goes back (TASK-0162).
    if (cameraMoved()) {
      event.preventDefault();
      resetCamera();
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
  if (event.key === '/' && searchBox !== null && !searchBox.hidden && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    searchInput?.focus();
    searchInput?.select();
  }
  // + and − zoom, 0 puts the camera back (TASK-0156): for a trackpad with no middle button.
  if ((event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0' || (event.key === 'Home' && homeIsTheCamera(event))) && !event.metaKey && !event.ctrlKey) {
    const camera = cameraNow();
    if (camera === null) return;
    event.preventDefault();
    if (event.key === '0' || event.key === 'Home') resetCamera();
    else if (towersActive()) towersView!.zoom(event.key === '-' ? 1 / 1.25 : 1.25);
    else setCamera(zoomed(camera, event.key === '-' ? 1 / 1.25 : 1.25, 0, 0, halfView()));
  }
  if ((event.key === 'c' || event.key === 'C') && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    await switchColouring();
  }
}
