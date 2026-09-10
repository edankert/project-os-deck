/**
 * Deck's renderer. One file of wiring over the shared modules.
 *
 * It holds no list of view names. The switcher draws whatever the view
 * provider returns for the current workspace's kind, which is what lets a
 * vault's own saved views become Deck views in a later phase without touching
 * this file.
 *
 * The window has two halves. The navigator lists what a view holds, in the
 * groups the sidecar sent. The desk holds the notes a person put there, where
 * they put them. A popped-out window carries one panel and nothing else.
 */
import type { CardGroup, CardModel, PanelType, Workspace } from '../shared/types.js';
import type { NoteContext } from '../shared/sidecar-client.js';
import type { Description, Refusal } from '../shared/description.js';
import { AddressError, addressFor, formatAddress, isDeskName, parseAddress, tryParseAddress } from '../shared/address.js';
import { DEFAULT_VIEW_ID, ViewRegistry, marksModeFor, sourceOf } from '../shared/views.js';
import { SidecarClient, flattenGroups, groupsFromNav, isFinishedWork } from '../shared/sidecar-client.js';
import { type QueryIndex, runQuery } from '../shared/query.js';
import type { NoteRecord } from '../shared/records.js';
import { CARD_WIDTH, clampToSurface, deskBounds, nextSlot, placementBounds, reconcileDesk } from '../shared/desk.js';
import { deskCardsOf } from '../shared/store-state.js';
import { panelKinds, panelLabel, panelOrNull } from '../shared/panels.js';
import { countDistinct, narrowGroups, statusesIn, typesIn } from '../shared/search.js';
import { type ActuatorRow, actuatorRows, canPerform, elsewhere, wordRefusal } from '../shared/write-client.js';
import { CardPool, type PlacedCard } from './cards.js';
import { NavigatorList } from './navigator.js';
import { Host } from './host-bridge.js';
import { GlassField, type OrbitData, glassElements } from './glass.js';
import type { GraphEdge } from '../shared/graph.js';
import { ContextCache } from '../shared/neighbourhood.js';
import { type Edge, type ThrowTarget, type WindowInfo, type DisplayInfo, targetsToward } from '../shared/throw.js';
import { DEFAULT_SURFACE } from '../shared/store-state.js';
import { surfaceKinds } from '../shared/vocabularies.js';
import { cardFromContext, neighboursOf } from '../shared/sidecar-client.js';
import { joinedTo, sharedAmong } from '../shared/neighbourhood.js';

const host = new Host();
const registry = new ViewRegistry();

const el = {
  switcher: must('switcher'),
  rail: must('rail'),
  navigator: must('navigator'),
  navList: must('nav-list'),
  refusals: must('refusals'),
  actuators: must('actuators'),
  stale: must('stale'),
  actor: must('actor') as HTMLButtonElement,
  search: must('search') as HTMLInputElement,
  statusFilter: must('status-filter') as HTMLSelectElement,
  typeFilter: must('type-filter') as HTMLSelectElement,
  navCount: must('nav-count'),
  desk: must('desk'),
  deskArea: must('desk-area'),
  deskName: must('desk-name'),
  deskList: must('desk-list') as HTMLSelectElement,
  reader: must('reader'),
  status: must('status'),
  count: must('count'),
  hostMark: must('host-mark'),
  copyAddress: must('copy-address') as HTMLButtonElement,
  openAddress: must('open-address') as HTMLButtonElement,
  popOut: must('pop-out') as HTMLButtonElement,
  saveDesk: must('save-desk') as HTMLButtonElement,
  clearDesk: must('clear-desk') as HTMLButtonElement,
  follow: must('follow') as HTMLButtonElement,
  surfaceToggle: must('surface-toggle'),
};

let workspaces: Workspace[] = [];
/**
 * A satellite window shows one address and owns no navigation: no switcher, no
 * rail, no pop-out. Its cards are loaded once, from its own address, and a
 * view change in the focus window does not move it, because only a switcher
 * click or an address load calls `selectView`.
 */
let pinned = false;
let currentViews: Description[] = [];
/** The view as it arrived, in groups, before anything is narrowed. */
let currentGroups: CardGroup[] = [];
/** The description Deck is drawing: its faces, its bands, its source. */
let currentView: Description | null = null;
/**
 * What the current view's description or its query could not be read.
 *
 * Drawn ABOVE the list rather than swallowed. An empty view and a broken view
 * look identical on screen and only one of them is a bug, which is the rule
 * this whole feature is written against.
 */
let currentRefusals: Refusal[] = [];
/** Every card in the view, children flattened, for the desk and the address. */
let currentCards: CardModel[] = [];
let panel: PanelType | null = null;
/** A note panel stays on the note its address named, whatever the focus window does. */
let pinnedNoteId: string | null = null;
let queryTimer: ReturnType<typeof setTimeout> | null = null;
/** The note the reader is showing, with what a write to it needs. */
let openNote: { id: string; rel: string; mtime: number | null } | null = null;
/**
 * The index revision this window drew from.
 *
 * A window compares what it drew against what the store now says, and shows a
 * MARK rather than redrawing: a page that re-arranges itself while somebody is
 * reading it loses their place (TASK-0051). Null until the first draw, so a
 * window that has drawn nothing is never stale.
 */
let drewFromRevision: number | null = null;
/**
 * The note this window wrote to, if any.
 *
 * The window that made the write expects to see it, not to be told that
 * something changed. So it re-reads and redraws its own note and takes no
 * mark; every other window is marked.
 */
let wroteTo: string | null = null;

const pool = new CardPool(el.desk, {
  open: (card) => {
    void openCard(card);
  },
  remove: (card) => {
    // A card in the Needs-you strip is not on anybody's desk, so there is
    // nothing to take off. The stylesheet hides the control there as well,
    // which ISS-0007 claimed and ISS-0013 actually built.
    if (panel === 'needs-you') return;
    void host.dispatch({ type: 'take-off-desk', noteId: card.noteId });
  },
  grab: (card, element, event) => {
    grabCard(card, element, event);
  },
});

const navigator = new NavigatorList(el.navList, {
  toggle: (card) => {
    void toggleOnDesk(card);
  },
  fold: (key, folded) => {
    void host.dispatch({ type: 'set-fold', key, folded });
  },
  focusRow: (card) => {
    if (!glass.isActive()) return;
    // Arriving from the keyboard flies the field to the card, or highlights
    // it under reduced motion, and reaches for it (TASK-0033, TASK-0056).
    glass.arriveAt(card.noteId);
    glass.reachFor(card.noteId);
    if (reducedMotion()) navigator.highlight(card.noteId);
  },
  key: (card, key) => {
    if (!glass.isActive()) return false;
    const entry = glass.entryFor(card.noteId);
    if ((key === 'p' || key === 'P') && entry !== undefined) {
      void glass.pull(entry);
      return true;
    }
    if ((key === 'b' || key === 'B') && entry !== undefined) {
      void glass.push(entry);
      return true;
    }
    if (key === 's' || key === 'S') {
      void sendTo(card);
      return true;
    }
    if (key === 'Delete' || key === 'Backspace') {
      void glass.putBack(card.noteId);
      return true;
    }
    return false;
  },
});

/**
 * A note's neighbourhood, asked for at most once per note per index revision
 * (TASK-0036, TASK-0056). Shared by the lift and the reach.
 */
const contexts = new ContextCache((workspaceId, noteId) => clientFor(workspaceId).context(noteId));

function reducedMotion(): boolean {
  // The smoke run asks for it by name, because it cannot change the system setting.
  if ((globalThis as unknown as { __deckReducedMotion?: boolean }).__deckReducedMotion === true) return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Notes whose change arrived while the field was on screen, held until the person acts (TASK-0032). */
let pendingGroups: CardGroup[] | null = null;
let pendingCount = 0;

const glass = new GlassField(glassElements(), {
  state: () => host.state(),
  canArrange: () => host.canArrange(),
  dispatch: (action) => host.dispatch(action),
  open: (card) => openCard(card),
  say: (message, isError) => say(message, isError),
  context: (noteId) => {
    const state = host.state();
    if (state.workspaceId === null) return Promise.reject(new Error('no workspace'));
    const known = contexts.peek(state.workspaceId, noteId, indexRevision()) !== undefined;
    const asked = contexts.get(state.workspaceId, noteId, indexRevision());
    // A neighbourhood that arrives changes the navigator's desk groups too.
    if (!known) void asked.then(() => drawNavigator()).catch(() => null);
    return asked;
  },
  peekContext: (noteId) => {
    const state = host.state();
    return state.workspaceId === null ? undefined : contexts.peek(state.workspaceId, noteId, indexRevision());
  },
  noteHtml: async (card) => {
    const state = host.state();
    if (state.workspaceId === null || card.rel === null) return '<p>This card has no note behind it.</p>';
    return (await clientFor(state.workspaceId).note(card.rel)).html;
  },
  targets: (edge) => throwTargets(edge),
  throwTo: (target, card, edge) => throwTo(target, card, edge),
  applyPending: () => applyPending(),
  reducedMotion,
  sentence: async (edge: GraphEdge) => {
    const state = host.state();
    if (state.workspaceId === null) return '';
    const response = await fetch(
      `/deck/graph/${encodeURIComponent(state.workspaceId)}/sentence?source=${encodeURIComponent(edge.source)}&offset=${edge.offset}`,
    );
    if (!response.ok) return '';
    return ((await response.json()) as { sentence?: string }).sentence ?? '';
  },
});
glass.sendTo = (card) => sendTo(card);
glass.showInField = (noteId) => void showInField(noteId);
(globalThis as unknown as { __deckGlass?: GlassField }).__deckGlass = glass;
(globalThis as unknown as { __deckContexts?: ContextCache }).__deckContexts = contexts;

/** What a card wears before a view has been chosen: what every card has. */
const PLAIN_FACES = {
  default: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'none' as const },
  byType: {},
};

function must(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`the page has no #${id}`);
  return found;
}

function say(message: string, isError = false): void {
  el.status.textContent = message;
  el.status.classList.toggle('error', isError);
}

function workspaceById(id: string | null): Workspace | null {
  return workspaces.find((w) => w.id === id) ?? null;
}

function clientFor(workspaceId: string): SidecarClient {
  // Same origin, always: Deck's own host proxies the read to the sidecar.
  return new SidecarClient(`/deck/sidecar/${encodeURIComponent(workspaceId)}`);
}

async function boot(): Promise<void> {
  await host.start();
  const role = await host.windowRole();
  panel = panelOrNull(role.panel);
  pinned = role.role === 'satellite';
  (globalThis as unknown as { __deckRole?: string }).__deckRole = String(role.role);
  document.body.classList.toggle('pinned', pinned);
  document.body.dataset['panel'] = panel ?? '';
  el.hostMark.textContent = host.isShell() ? 'shell' : 'served · read only';
  document.body.dataset['surface'] = surfaceNow();
  el.popOut.hidden = !host.capabilities().popOutWindows;

  workspaces = await host.workspaces();
  renderRail();

  const requested = new URLSearchParams(location.search).get('address');
  if (requested !== null) {
    const parsed = tryParseAddress(requested);
    if (parsed.ok) {
      pinnedNoteId = parsed.address.note;
      await applyAddress(requested);
    } else {
      say(`that address was refused: ${parsed.reason}`, true);
    }
  } else {
    const state = host.state();
    const chosen = workspaceById(state.workspaceId) ?? workspaces[0] ?? null;
    if (chosen !== null) await selectWorkspace(chosen.id);
    else say('no workspace yet — add one from the rail');
  }

  host.onState((state) => {
    if (host.following()) void followTheMac(state);
    renderRail();
    paintSwitcher();
    drawActor();
    drawStale();
    // drawDesk, not just the chrome: it is the only thing that repaints the
    // cards, so leaving it out means a window receives a change from another
    // window and shows nothing.
    drawNavigator();
    drawDesk();
  });
  wireControls();
  drawActor();
  drawFollow();
  if (panel === 'needs-you') startNeedsYouPoll();
}

function renderRail(): void {
  const state = host.state();
  el.rail.replaceChildren();
  for (const workspace of workspaces) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-current', String(workspace.id === state.workspaceId));
    const name = document.createElement('span');
    name.textContent = workspace.name;
    const kind = document.createElement('span');
    kind.className = 'kind';
    // A served page cannot start a sidecar, so a workspace the shell has not
    // opened is shown as unavailable rather than offered and then refused with
    // "the sidecar answered 503" (ISS-0003).
    const unopened = workspace.open === false;
    kind.textContent = unopened ? `${workspace.kind} · open it in the shell first` : workspace.kind;
    button.disabled = unopened;
    button.append(name, kind);
    button.addEventListener('click', () => {
      void selectWorkspace(workspace.id);
    });
    el.rail.appendChild(button);
  }
  if (host.capabilities().manageWorkspaces && !pinned) {
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = '+ add a workspace';
    add.addEventListener('click', () => {
      void (async () => {
        const result = await host.addWorkspace();
        if (!result.ok) {
          say(result.reason ?? 'that folder was not added', true);
          return;
        }
        workspaces = await host.workspaces();
        renderRail();
      })();
    });
    el.rail.appendChild(add);
  }
}

async function selectWorkspace(id: string): Promise<void> {
  const workspace = workspaceById(id);
  if (workspace === null) {
    say(`no workspace with id ${id}`, true);
    return;
  }
  if (workspace.open === false) {
    say(`${workspace.name} has no sidecar running — open it in the Deck shell first, then reload this page`, true);
    return;
  }
  say(`opening ${workspace.name}…`);
  const opened = await host.openWorkspace(id);
  if (!opened.ok) {
    say(opened.error ?? 'that workspace did not open', true);
    return;
  }
  say(opened.borrowed === true ? `${workspace.name} — using the sidecar already running` : `${workspace.name} — ready`);
  renderRail();

  const { views, reason } = registry.viewsFor(workspace);
  currentViews = views;
  renderSwitcher();
  if (views.length === 0) {
    say(reason ?? 'this workspace offers no views', true);
    return;
  }
  const wanted = host.state().viewId;
  const view = views.find((v) => v.id === wanted) ?? views.find((v) => v.id === DEFAULT_VIEW_ID) ?? views[0];
  if (wanted !== null && views.every((v) => v.id !== wanted)) {
    // Said out loud. A view that quietly becomes a different view is the
    // failure the address grammar refuses, and it would be no better here.
    say(`this workspace has no view called "${wanted}", so Deck opened ${view?.label ?? 'nothing'}`, true);
  }
  if (view !== undefined) await selectView(view.id);
  await reopenFocusedNote();
}

function renderSwitcher(): void {
  el.switcher.replaceChildren();
  // One window owns navigation. A satellite draws no switcher at all, so a
  // click in it cannot move the view out from under the window being read.
  if (pinned) return;
  for (const view of currentViews) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.dataset['viewId'] = view.id;
    button.textContent = view.label;
    button.addEventListener('click', () => {
      void selectView(view.id);
    });
    el.switcher.appendChild(button);
  }
  paintSwitcher();
}

function paintSwitcher(): void {
  const current = host.state().viewId;
  for (const button of Array.from(el.switcher.querySelectorAll('button'))) {
    button.setAttribute('aria-selected', String(button.dataset['viewId'] === current));
  }
}

/** The surface this window draws the view with. A popped-out panel is never the field. */
function surfaceNow(): string {
  if (pinned || panel !== null) return 'spread';
  const chosen = host.state().surface || DEFAULT_SURFACE;
  const offered = currentView?.surfaces ?? [];
  // A view that does not offer the chosen surface is drawn on its first one,
  // and the toggle shows which, so nothing changes without being visible.
  if (offered.length > 0 && !offered.includes(chosen)) return offered[0] ?? DEFAULT_SURFACE;
  return chosen;
}

function applySurface(): void {
  const surface = surfaceNow();
  document.body.dataset['surface'] = surface;
  const field = surface === 'glass' || surface === 'orbit';
  glass.setArrangement(surface === 'orbit' ? 'orbit' : 'bands');
  glass.setActive(field);
  if (surface === 'orbit') void loadOrbit();
  paintSurfaceToggle();
}

/** Which workspace and index revision the orbit on screen was read at. */
let orbitFor: { workspaceId: string; revision: number } | null = null;

/**
 * Read the whole link graph and its kept layout from Deck's own host
 * (TASK-0001, TASK-0002), once per index revision.
 */
async function loadOrbit(): Promise<void> {
  const state = host.state();
  const workspaceId = state.workspaceId;
  if (workspaceId === null) return;
  const revision = indexRevision();
  if (orbitFor !== null && orbitFor.workspaceId === workspaceId && orbitFor.revision === revision) return;
  orbitFor = { workspaceId, revision };
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const [graph, orbit] = await Promise.all([
        fetch(`/deck/graph/${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
        fetch(`/deck/orbit/${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      ]);
      if (graph.building === true || orbit.building === true) {
        say('Deck is still reading this workspace for the link graph…');
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      const data: OrbitData = { nodes: graph.nodes, edges: graph.edges, layout: orbit.layout, bridges: orbit.bridges };
      (globalThis as unknown as { __deckOrbit?: unknown }).__deckOrbit = { graphMs: graph.ms, layoutMs: orbit.ms, drift: orbit.drift, nodes: data.nodes.length, edges: data.edges.length };
      if (surfaceNow() === 'orbit') {
        glass.setArrangement('orbit', data);
        drawNavigator();
      }
      return;
    }
  } catch (err) {
    orbitFor = null;
    say(`the link graph could not be read: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

/** "Show this in the field": switch to the orbit and fly to the note (TASK-0004). */
async function showInField(noteId: string): Promise<void> {
  await host.dispatch({ type: 'select-surface', surface: 'orbit' });
  applySurface();
  await loadOrbit();
  drawNavigator();
  drawDesk();
  glass.showInOrbit(noteId);
}

/**
 * The surface toggle: Glass, Spread, List, as the view's description offers
 * them (TASK-0033). A toggle beside the views, never a view called Glass, and
 * the renderer names no surface of its own: the labels are the vocabulary's.
 */
function renderSurfaceToggle(): void {
  el.surfaceToggle.replaceChildren();
  if (pinned) return;
  for (const id of currentView?.surfaces ?? []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset['surface'] = id;
    button.textContent = id.charAt(0).toUpperCase() + id.slice(1);
    button.title = surfaceKinds.label(id) ?? id;
    button.addEventListener('click', () => {
      void (async () => {
        await host.dispatch({ type: 'select-surface', surface: id });
        applySurface();
        drawNavigator();
        drawDesk();
      })();
    });
    el.surfaceToggle.appendChild(button);
  }
  paintSurfaceToggle();
}

function paintSurfaceToggle(): void {
  const surface = surfaceNow();
  for (const button of Array.from(el.surfaceToggle.querySelectorAll('button'))) {
    button.setAttribute('aria-checked', String(button.dataset['surface'] === surface));
  }
}

async function selectView(viewId: string): Promise<void> {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  if (workspace === null) return;
  const view = registry.resolve(workspace, viewId);
  if (view === null) {
    say(`this workspace has no view called "${viewId}"`, true);
    return;
  }
  await host.dispatch({ type: 'select-view', viewId });
  paintSwitcher();
  await loadView(workspace, view);
  // A view switch is the other act that applies a held change: the new view
  // was read just now, so what was pending is in it.
  preparedFor = indexRevision();
}

async function loadView(workspace: Workspace, view: Description): Promise<void> {
  const client = clientFor(workspace.id);
  currentView = view;
  // A mark belongs to what this window drew. Carrying it across a view switch
  // would be a stale message about a view nobody is looking at any more.
  drewFromRevision = indexRevision();
  drawStale();
  currentRefusals = [];
  pendingGroups = null;
  pendingCount = 0;
  pool.useFaces(view.face);
  renderSurfaceToggle();
  const source = sourceOf(view);
  try {
    if (source.kind === 'nav') {
      const payload = await client.nav(source.mode);
      currentGroups = groupsFromNav(payload);
    } else if (source.kind === 'query') {
      const evaluated = await loadQueryView(workspace, view);
      currentGroups = evaluated.groups;
      currentRefusals = evaluated.refusals;
    } else {
      const payload = await client.stats();
      currentGroups = [
        {
          key: 'hero',
          label: 'This repository',
          needsHuman: false,
          suppressed: false,
          cards: Object.entries(payload.hero).map(([key, value]) => blankCard(key, describe(value), 'count')),
        },
      ];
    }
    currentCards = flattenGroups(currentGroups);
    say(`${workspace.name} · ${view.label} · ${currentCards.length} notes`);
  } catch (err) {
    currentGroups = [];
    currentCards = [];
    say(err instanceof Error ? err.message : String(err), true);
  }
  renderFilters();
  applySurface();
  drawNavigator();
  drawDesk();
}

/**
 * A query-sourced view: Deck's own records, filtered, sorted and grouped.
 *
 * The marks — owed, its verb, suppressed — come from the sidecar's navigation
 * payload rather than from the query, because whether a note needs a person is
 * the cockpit's judgement from its own obligations registry. A workspace whose
 * notes the sidecar does not track simply has no marks, and the navigator says
 * so instead of drawing an empty "Needs you" heading.
 */
async function loadQueryView(
  workspace: Workspace,
  view: Description,
): Promise<{ groups: CardGroup[]; refusals: Refusal[] }> {
  // The index and its prefix travel as one value, so this cannot pass the
  // records on and leave the prefix behind (ISS-0031).
  const index = await readRecords(workspace.id);
  const marks = await readMarks(workspace.id, marksModeFor(view));
  const result = runQuery(view, index, { marks });
  return {
    groups: result.groups,
    refusals: [
      ...result.unsupported.map((u) => ({ construct: u.construct, where: u.where, reason: u.reason })),
      ...(result.untracked
        ? [
            {
              construct: 'what is owed',
              where: 'source',
              reason:
                'the sidecar tracks none of the notes this view holds, so it has no obligations to report and this view shows no Needs-you group',
            },
          ]
        : []),
    ],
  };
}

async function readRecords(workspaceId: string): Promise<QueryIndex> {
  const response = await fetch(`/deck/records/${encodeURIComponent(workspaceId)}`);
  if (!response.ok) throw new Error(`Deck's own index answered ${response.status}`);
  const payload = (await response.json()) as { building?: boolean; records?: NoteRecord[]; pathPrefix?: string };
  if (payload.building === true) throw new Error('Deck is still reading this workspace');
  return { records: payload.records ?? [], pathPrefix: payload.pathPrefix ?? '' };
}

/**
 * What the sidecar says about the notes it tracks, by note id.
 *
 * Read from the navigation payload Deck already fetches, in the mode whose
 * obligations cover the whole repository. A workspace with no sidecar opinion
 * comes back empty rather than as a failure: a vault has none.
 */
async function readMarks(
  workspaceId: string,
  mode: string | null,
): Promise<Map<string, { owed: boolean; owedVerb: string | null; suppressed: boolean }>> {
  const marks = new Map<string, { owed: boolean; owedVerb: string | null; suppressed: boolean }>();
  if (mode === null) return marks;
  try {
    const payload = await clientFor(workspaceId).nav(mode);
    for (const group of payload.groups) {
      const suppressed = isFinishedWork(group);
      const walk = (items: typeof group.items): void => {
        for (const item of items) {
          const existing = marks.get(item.id);
          marks.set(item.id, {
            owed: item.owed || (existing?.owed ?? false),
            owedVerb: item.owedVerb ?? existing?.owedVerb ?? null,
            suppressed: suppressed && (existing?.suppressed ?? true),
          });
          if (item.children.length > 0) walk(item.children);
        }
      };
      walk(group.items);
    }
  } catch {
    // No sidecar opinion is a fact about the workspace, not a failure of the
    // view. `untracked` is what says so on screen.
  }
  return marks;
}

function blankCard(noteId: string, title: string, noteType: string): CardModel {
  return {
    noteId,
    title,
    noteType,
    status: '',
    rel: null,
    subtitle: null,
    owed: false,
    owedVerb: null,
    groupKey: 'hero',
    severity: null,
    lastVerified: null,
    stale: false,
    progress: null,
    children: [],
    frontmatter: null,
  };
}

function describe(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(' · ');
  }
  return String(value);
}

/** The groups as they are drawn now: what the view holds, narrowed by the search. */
function narrowed(): CardGroup[] {
  const state = host.state();
  const groups = panel === 'needs-you' ? currentGroups.filter((g) => g.needsHuman) : currentGroups;
  // A satellite is a window onto ONE thing and draws no search box of its own,
  // so it must not be narrowed by the box in another window: typing in the
  // focus window used to empty a popped-out strip on a second monitor, with
  // nothing on that screen to say why (ISS-0018 fixed the same sentence for
  // the view; this is the rest of it).
  if (pinned) return groups;
  return narrowGroups(groups, { query: state.query, filters: state.filters });
}

function drawNavigator(): void {
  const state = host.state();
  const groups = narrowed();
  // Both halves counted the same way, children included. One side counting
  // top-level rows and the other counting flattened notes read as "230 of
  // 1400" with nothing narrowed (ISS-0007). Counted by DISTINCT note since
  // ISS-0015: the sidecar sends a note that needs a person twice, once in
  // Needs-you and once under its phase, and "30 of 30" for a workspace holding
  // 30 notes is what the label promises.
  const shown = countDistinct(groups);
  const held = countDistinct(currentGroups);
  navigator.render({
    groups: glass.isActive() ? [...deskGroups(), ...glass.orbitGroups(), ...groups] : groups,
    faces: currentView?.face ?? PLAIN_FACES,
    folds: state.folds,
    onDesk: new Set(deskCardsOf(state, state.workspaceId).map((c) => c.noteId)),
    currentNoteId: state.noteId,
  });
  el.navCount.textContent = `${shown} of ${held}`;
  drawRefusals();
  if (el.search.value !== state.query) el.search.value = state.query;
  syncFilters();
}

/**
 * The groups Glass adds above the view's own in the navigator: what is held,
 * what it is joined to, and what the held notes share (FEAT-0010).
 *
 * The keyboard's route to every held note and every neighbour. A neighbour
 * from outside the view is in none of the view's groups, so without these the
 * front band would hold cards no key could reach.
 */
function deskGroups(): CardGroup[] {
  const state = host.state();
  const ws = state.workspaceId;
  if (ws === null) return [];
  const heldIds = deskCardsOf(state, ws).map((c) => c.noteId);
  if (heldIds.length === 0) return [];
  const byId = new Map(currentCards.map((c) => [c.noteId, c]));
  const known = new Map<string, NoteContext>();
  for (const id of heldIds) {
    const context = contexts.peek(ws, id, indexRevision());
    if (context !== undefined) known.set(id, context);
    for (const item of context === undefined ? [] : neighboursOf(context)) {
      if (!byId.has(item.id)) byId.set(item.id, cardFromContext(item));
    }
  }
  const card = (id: string): CardModel => byId.get(id) ?? blankCard(id, id, '');
  const out: CardGroup[] = [
    { key: 'deck:held', label: 'On the desk', needsHuman: false, suppressed: false, cards: heldIds.map(card) },
  ];
  const joined = [...joinedTo(heldIds, known)];
  if (joined.length > 0) {
    out.push({ key: 'deck:joined', label: 'Joined to what you are holding', needsHuman: false, suppressed: false, cards: joined.map(card) });
  }
  const shared = [...sharedAmong(heldIds, known).keys()];
  if (shared.length > 0) {
    out.push({ key: 'deck:shared', label: 'Joined to more than one held note', needsHuman: false, suppressed: false, cards: shared.map(card) });
  }
  return out;
}

/**
 * What this view could not be read as, above the list rather than instead of it.
 *
 * An empty view and a broken view look identical on screen and only one of
 * them is a bug. So a construct the parser or the evaluator could not read is
 * NAMED here, above whatever notes the view could still select — never a
 * silent empty list, and never an error page instead of the notes.
 */
function drawRefusals(): void {
  el.refusals.replaceChildren();
  el.refusals.hidden = currentRefusals.length === 0;
  if (currentRefusals.length === 0) return;
  const heading = document.createElement('p');
  heading.className = 'refusal-heading';
  heading.textContent =
    currentRefusals.length === 1
      ? 'One thing in this view could not be read:'
      : `${currentRefusals.length} things in this view could not be read:`;
  el.refusals.appendChild(heading);
  const list = document.createElement('ul');
  for (const refusal of currentRefusals) {
    const item = document.createElement('li');
    const what = document.createElement('code');
    what.textContent = refusal.construct;
    item.append(what, document.createTextNode(` — ${refusal.reason}`));
    if (refusal.where !== '') {
      const where = document.createElement('span');
      where.className = 'refusal-where';
      where.textContent = ` (${refusal.where})`;
      item.appendChild(where);
    }
    list.appendChild(item);
  }
  el.refusals.appendChild(list);
}

function renderFilters(): void {
  const state = host.state();
  fillSelect(el.statusFilter, 'any status', statusesIn(currentGroups), state.filters.statuses[0] ?? '');
  fillSelect(el.typeFilter, 'any type', typesIn(currentGroups), state.filters.types[0] ?? '');
}

/** The selects show what the state says, so a second window narrows with the first. */
function syncFilters(): void {
  const { filters } = host.state();
  const status = filters.statuses[0] ?? '';
  const type = filters.types[0] ?? '';
  if (el.statusFilter.value !== status) el.statusFilter.value = status;
  if (el.typeFilter.value !== type) el.typeFilter.value = type;
}

function fillSelect(select: HTMLSelectElement, anyLabel: string, values: string[], current: string): void {
  select.replaceChildren();
  const any = document.createElement('option');
  any.value = '';
  any.textContent = anyLabel;
  select.appendChild(any);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = values.includes(current) ? current : '';
}

function drawDesk(): void {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);

  if (glass.isActive()) {
    // The reader is the reading column: shown for a widened pane, or on a
    // served page once a note is opened, since a tablet holds no panes.
    const wide = deskCardsOf(state, state.workspaceId).some((c) => c.wide === true);
    document.body.classList.toggle('reading', wide || (!host.canArrange() && state.noteId !== null));
    glass.update({
      groups: currentGroups,
      view: currentView,
      faces: currentView?.face ?? PLAIN_FACES,
      pending: pendingCount,
    });
    return;
  }
  document.body.classList.remove('reading');

  if (panel === 'needs-you') {
    // The strip is what is owed, drawn as cards that flow rather than as an
    // arrangement: this window is a status board, not a desk.
    const owed = narrowed().flatMap((g) => g.cards);
    pool.render(
      owed.map((card) => ({ card, x: 0, y: 0 })),
      state.noteId,
      true,
    );
    el.deskName.textContent = owed.length === 0 ? 'nothing is owed' : 'what needs you';
    el.count.textContent = `${owed.length}`;
    return;
  }

  const onDesk = deskCardsOf(state, state.workspaceId);
  const reconciled = reconcileDesk(onDesk, currentCards);
  // Clamped at PAINT time rather than in the store: a desk saved on a large
  // monitor keeps the positions it was saved with, and opens on a laptop with
  // every card reachable (ISS-0007). The saved desk is not rewritten.
  //
  // Against the desk's OWN EXTENT, computed from the saved positions, not
  // measured off the DOM. The DOM is the previous paint, which for a restored
  // card is where this clamp last put it, so each repaint moved it a little
  // further down (ISS-0017). The drag below is the other case and keeps
  // `deskBounds`, because a card being moved is on content that already exists.
  const bounds = placementBounds(el.desk, reconciled.cards);
  const placed: PlacedCard[] = reconciled.cards.map((c) => {
    const at = clampToSurface({ x: c.x, y: c.y }, bounds);
    return { card: c.card, x: at.x, y: at.y };
  });
  let label = state.deskName ?? (placed.length === 0 ? 'the desk is empty' : 'unsaved desk');
  if (reconciled.dropped > 0) {
    const cards = reconciled.dropped === 1 ? 'card' : 'cards';
    label = `${label} — ${reconciled.dropped} ${cards} not in this view`;
  }
  el.deskName.textContent = workspace === null ? 'no workspace' : label;
  el.count.textContent = `${placed.length} on the desk`;
  pool.render(placed, state.noteId);
  renderDeskList();
}

/**
 * Show the note the state still names, after a restart or a workspace change.
 * Without this the card is marked as current and the reader stays empty.
 */
async function reopenFocusedNote(): Promise<void> {
  const noteId = pinnedNoteId ?? host.state().noteId;
  if (noteId === null) return;
  const card = currentCards.find((c) => c.noteId === noteId);
  if (card !== undefined) await openCard(card);
}

function renderDeskList(): void {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  const names =
    workspace === null
      ? []
      : Object.values(state.desks)
          .filter((d) => d.workspaceId === workspace.id)
          .map((d) => d.name);
  const current = el.deskList.value;
  el.deskList.replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'no desk';
  el.deskList.appendChild(none);
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    el.deskList.appendChild(option);
  }
  el.deskList.value = state.deskName ?? (names.includes(current) ? current : '');
}

/**
 * The follow toggle, on a served page that reads the Mac's store.
 *
 * Off by default, as the task's plan records: a tablet that jumped whenever
 * somebody clicked on the Mac would be a surprising thing to hand a person.
 * The walk decides whether that default flips.
 */
function drawFollow(): void {
  el.follow.hidden = !host.followsTheStore();
  const on = host.following();
  el.follow.setAttribute('aria-pressed', String(on));
  el.follow.textContent = on ? 'Following the Mac' : 'Follow the Mac';
}

/** Where a following tablet last went, so a broadcast that changes nothing moves nothing. */
let followed: { workspaceId: string | null; viewId: string | null; noteId: string | null } = {
  workspaceId: null,
  viewId: null,
  noteId: null,
};

/**
 * Take the Mac's workspace, view and note, on a tablet that is following.
 *
 * Only what changed is followed, so a broadcast about a card moved on the
 * Mac's desk does not reload the tablet's view.
 */
async function followTheMac(state: ReturnType<typeof host.state>): Promise<void> {
  const wanted = { workspaceId: state.workspaceId, viewId: state.viewId, noteId: state.noteId };
  const before = followed;
  followed = wanted;
  const workspace = workspaceById(wanted.workspaceId);
  if (workspace === null) return;
  if (wanted.viewId !== null && (wanted.viewId !== before.viewId || currentView?.id !== wanted.viewId)) {
    const view = registry.resolve(workspace, wanted.viewId);
    if (view !== null && currentView?.id !== view.id) await loadView(workspace, view);
  }
  if (wanted.noteId !== null && wanted.noteId !== before.noteId) {
    const card = currentCards.find((c) => c.noteId === wanted.noteId);
    if (card !== undefined) await openCard(card);
    else say(`the Mac is showing ${wanted.noteId}, which this view does not hold`);
  }
}

/** A click in the navigator puts a note on the desk, or takes it off again. */
async function toggleOnDesk(card: CardModel): Promise<void> {
  // A tablet reads the Mac's desk and does not change it (TASK-0057), so a
  // row on a served page opens the note and leaves the desk as it is.
  if (!host.canArrange() && host.followsTheStore()) {
    if (glass.isActive()) glass.arriveAt(card.noteId);
    await openCard(card);
    return;
  }
  if (glass.isActive()) {
    // In Glass a row lifts the note, as a click on its card does. Putting it
    // back is the pane's ×, or Delete on the row.
    await glass.lift(card);
    return;
  }
  const state = host.state();
  const cards = deskCardsOf(state, state.workspaceId);
  if (cards.some((c) => c.noteId === card.noteId)) {
    await host.dispatch({ type: 'take-off-desk', noteId: card.noteId });
    drawNavigator();
    drawDesk();
    return;
  }
  const slot = nextSlot(cards, Math.max(CARD_WIDTH * 2, el.desk.clientWidth));
  await host.dispatch({ type: 'put-on-desk', noteId: card.noteId, x: slot.x, y: slot.y });
  await openCard(card);
}

async function openCard(card: CardModel): Promise<void> {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  if (workspace === null) return;
  // A note panel stays on its own note; it is what that window is for.
  if (panel !== 'note') await host.dispatch({ type: 'focus-note', noteId: card.noteId });
  drawNavigator();
  drawDesk();
  if (card.rel === null) {
    el.reader.replaceChildren(text('this card has no note behind it'));
    return;
  }
  try {
    const note = await clientFor(workspace.id).note(card.rel);
    const article = document.createElement('article');
    article.innerHTML = note.html;
    el.reader.replaceChildren(article);
    el.reader.scrollTop = 0;
    // The modification time comes from DECK'S OWN INDEX, not from the render
    // payload: `/api/render` does not carry one. That is the better source
    // anyway — the index is the thing that watches the file — and it is what
    // the tick sends as its guard against a note that changed underneath.
    openNote = { id: card.noteId, rel: card.rel, mtime: await readMtime(workspace.id, card.rel) };
    // What this window drew from, so it can tell later that it is old.
    drewFromRevision = indexRevision();
    drawStale();
    attachTicks(article);
    await drawActuators(workspace.id, card.noteId);
  } catch (err) {
    openNote = null;
    el.reader.replaceChildren(text(err instanceof Error ? err.message : String(err)));
    el.actuators.hidden = true;
  }
}

/**
 * One note's modification time, in seconds, from Deck's own index.
 *
 * Null when Deck has no record for it — a workspace still being walked, or a
 * note the index has not seen. A write then travels without the guard rather
 * than with a number Deck made up.
 */
async function readMtime(workspaceId: string, rel: string): Promise<number | null> {
  try {
    const response = await fetch(
      `/deck/records/${encodeURIComponent(workspaceId)}?rel=${encodeURIComponent(rel)}`,
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { records?: Array<{ mtimeMs?: number }> };
    const found = payload.records?.[0]?.mtimeMs;
    // Seconds, because that is what the sidecar compares against `st_mtime`.
    return typeof found === 'number' ? found / 1000 : null;
  } catch {
    return null;
  }
}

/** The index revision this window's workspace is at, or 0 when there is none. */
function indexRevision(): number {
  const state = host.state();
  return state.workspaceId === null ? 0 : (state.indexRevisions[state.workspaceId] ?? 0);
}

/**
 * The verbs the sidecar says this note allows, drawn as rows.
 *
 * Deck restates no verb, no from-state and no transition rule: the table is
 * the sidecar's `HUMAN_TRANSITIONS` and a renderer keeping its own copy is
 * what project-os-cockpit#REQ-0026 forbids. A disabled row is drawn disabled
 * with the reason the row carried — not hidden, and not enabled.
 */
async function drawActuators(workspaceId: string, noteId: string): Promise<void> {
  el.actuators.replaceChildren();
  // ABSENT when Deck is served, not disabled. A greyed-out verb is a promise
  // that it could work, and on a tablet it never can (ADR-0003).
  if (!host.capabilities().write) {
    el.actuators.hidden = true;
    return;
  }
  let rows: ActuatorRow[] = [];
  // The sidecar takes a severity only while an ISSUE leaves `triage`, and
  // refuses one anywhere else rather than ignoring it, so Deck asks in exactly
  // that case and the payload — not Deck — says when that is.
  let triaging = false;
  try {
    const payload = await host.read(workspaceId, `/api/notes/actions?id=${encodeURIComponent(noteId)}`);
    rows = actuatorRows(payload);
    const shape = payload as { type?: unknown; status?: unknown };
    triaging = String(shape.type ?? '') === 'issue' && String(shape.status ?? '') === 'triage';
  } catch {
    // A note the sidecar has no opinion about offers nothing, which is the
    // common case: most notes at most times owe nobody a decision.
  }
  if (rows.length === 0) {
    el.actuators.hidden = true;
    return;
  }
  el.actuators.hidden = false;
  const caption = document.createElement('span');
  caption.className = 'why';
  caption.textContent = 'this note can be:';
  el.actuators.appendChild(caption);
  for (const row of rows) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'verb';
    button.textContent = row.verb;
    // The row's own answer to "does this stop to ask", carried into the page.
    // Deck decides nothing by it; it is what lets a check press a verb that
    // does NOT confirm without naming one, which Deck may not do (TST-0033:
    // no verb name or transition rule exists in Deck).
    button.dataset['confirm'] = String(row.confirm);
    // Shown rather than hidden, and unavailable rather than silent. A design
    // at `proposed` really does owe somebody a decision, so removing the row
    // would say it does not; pressing it says where the decision is recorded
    // (ISS-0039).
    // **Disabled, not merely titled** (ISS-0045). ISS-0039's close-out said a
    // verb Deck cannot perform was "drawn unavailable"; it was drawn with a
    // tooltip and was otherwise a working button — same colour, same cursor,
    // `disabled: false` — so a person found out by pressing it. `deck.css`
    // greys `:disabled`, and this is what makes it apply.
    button.disabled = row.disabled || !canPerform(row);
    const why = canPerform(row) ? row.reason : elsewhere(row);
    if (why !== '') button.title = why;
    button.addEventListener('click', () => {
      void applyVerb(workspaceId, noteId, row, triaging);
    });
    el.actuators.appendChild(button);
    if ((row.disabled || !canPerform(row)) && why !== '') {
      const said = document.createElement('span');
      said.className = 'why';
      said.textContent = why;
      el.actuators.appendChild(said);
    }
  }
}

/**
 * Post one actuator row's verb, confirming first when the ROW asks for it.
 *
 * **A verb that stops to ask also asks why** (ISS-0037). The sidecar writes a
 * dated, attributed paragraph into the note when the request carries prose,
 * and writes nothing when it does not, so a Decline made here used to leave a
 * `status: declined` nobody could account for six months later. The prose is
 * collected where the confirmation already interrupts, and stays OPTIONAL: the
 * cockpit does not require one, and Deck must not be stricter than the surface
 * it shares a file with.
 */
async function applyVerb(
  workspaceId: string,
  noteId: string,
  row: ActuatorRow,
  triaging = false,
): Promise<void> {
  // **A verb Deck cannot perform is shown and refused, not sent** (ISS-0039).
  // The row names its own endpoint when the verdict does not go through the
  // generic transition, and a design's does: `/api/design/verdict` requires
  // the revision the verdict judged, and Deck has no design surface and no
  // revision history, so it has nothing honest to send. Pressing it used to
  // post a transition and collect the sidecar's refusal.
  if (!canPerform(row)) {
    say(elsewhere(row), true);
    return;
  }
  // Deck decides nothing about which verbs are dangerous; the row does.
  if (row.confirm) {
    const chosen = await askChoice(`${row.verb} ${noteId}?`, [{ value: 'yes' as const, label: `Yes, ${row.verb}` }]);
    if (chosen === null) return;
  }
  // **Asked for EVERY verb, not only the ones that stop to confirm**
  // (ISS-0040). ISS-0037 put the box inside the confirmation, which left
  // Accept, Defer and every other forward move recording no grounds — the
  // same silence ISS-0037 was filed about, on three verbs out of five.
  // Deferring an issue is exactly the decision somebody wants the reason for
  // six months later. Escape or an empty box means "no reason", not "cancel":
  // for a confirm verb the decision was settled a moment ago, and for the rest
  // there was nothing to unwind.
  const reason = await askText(`why ${row.verb.toLowerCase()} ${noteId}? (recorded in the note; blank for none)`);
  // **Severity is free text, not a picker, deliberately.** The four values are
  // the cockpit's and the sidecar serves no list of them, so a picker here
  // would be Deck restating a table it does not own — the drift that put
  // `draft`/`proposed`/`ready` in Deck's status bands within two days. A value
  // the project does not use comes back refused, in the sidecar's own words.
  let severity: string | null = null;
  if (triaging) severity = await askText('severity? (blank to leave it as filed)');
  const result = await host.write('transition', {
    workspaceId,
    id: noteId,
    to: row.to,
    ...(openNote?.mtime === null || openNote?.mtime === undefined ? {} : { mtime: openNote.mtime }),
    ...(reason === null ? {} : { note: reason }),
    ...(severity === null ? {} : { severity }),
  });
  if (!result.ok) {
    // The sidecar's refusal, as it worded it.
    say(result.error ?? 'that change was refused', true);
    return;
  }
  say(`${noteId} is now ${row.to}`);
  await afterWrite(workspaceId, noteId);
}

/**
 * Attach a tick control to every checkbox the sidecar addressed.
 *
 * The address arrives WITH the page: the sidecar stamps `data-raw` on each
 * rendered checkbox, carrying the source line's exact prose, and
 * `/api/notes/tick` finds the line by that text. Deck invents no id scheme and
 * tracks no line number.
 */
function attachTicks(article: HTMLElement): void {
  if (!host.capabilities().write) return;
  const boxes = Array.from(article.querySelectorAll('input[type="checkbox"]'));
  if (boxes.length === 0) return;
  const addressed = boxes.filter((box) => (box as HTMLElement).dataset['raw'] !== undefined);
  if (addressed.length === 0) {
    // The sidecar emits NO addresses at all when its rendered checkbox count
    // and its source count disagree, because it cannot then trust any of them.
    // Offering a tick here would tick the wrong line, so Deck offers none and
    // says why rather than leaving a person wondering where the controls went.
    const said = document.createElement('p');
    said.className = 'no-tick';
    said.textContent =
      'No box on this note can be ticked from Deck: the sidecar could not match its rendered checkboxes to the ' +
      'source lines, so it addressed none of them. A task list that opens immediately after a paragraph does this; ' +
      'a blank line before it is the fix.';
    article.prepend(said);
    return;
  }
  for (const box of addressed) {
    const element = box as HTMLInputElement;
    if (element.checked) continue;
    const criterion = element.dataset['raw'] ?? '';
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'tick';
    control.textContent = 'tick';
    control.title = 'Resolve this criterion with evidence';
    control.addEventListener('click', () => {
      void tickCriterion(criterion);
    });
    element.parentElement?.insertBefore(control, element.nextSibling);
  }
}

/** Tick one criterion, collecting the evidence BEFORE the write is sent. */
async function tickCriterion(criterion: string): Promise<void> {
  const state = host.state();
  const workspaceId = state.workspaceId;
  if (workspaceId === null || openNote === null) return;
  // The endpoint wants evidence or a reason, and asking for it after a refusal
  // is worse than asking before: the reader has already done the thinking.
  const evidence = await askText(`evidence for "${short(criterion)}":`);
  if (evidence === null) {
    say('nothing was ticked: a criterion is resolved with evidence');
    return;
  }
  const result = await host.write('tick', {
    workspaceId,
    id: openNote.id,
    criterion,
    evidence,
    // Every time. It is the only guard against ticking a note that changed
    // since this page was rendered.
    ...(openNote.mtime === null ? {} : { mtime: openNote.mtime }),
  });
  if (!result.ok) {
    say(wordRefusal(result.error ?? ''), true);
    if (/changed on disk/i.test(result.error ?? '')) await afterWrite(workspaceId, openNote.id);
    return;
  }
  say('ticked, with the evidence and the name you are writing under');
  await afterWrite(workspaceId, openNote.id);
}

function short(text_: string): string {
  return text_.length <= 60 ? text_ : `${text_.slice(0, 57)}…`;
}

/**
 * After a write: THIS window re-reads its own note, and every other one is
 * marked.
 *
 * The person who ticked a criterion expects to see it ticked, not to be told
 * that something changed. The mark is for the windows that did not ask.
 */
async function afterWrite(workspaceId: string, noteId: string): Promise<void> {
  wroteTo = noteId;
  const card = currentCards.find((c) => c.noteId === noteId);
  if (card !== undefined) await openCard(card);
  const workspace = workspaceById(workspaceId);
  const viewId = host.state().viewId;
  if (workspace !== null && viewId !== null) {
    const view = registry.resolve(workspace, viewId);
    if (view !== null) await loadView(workspace, view);
  }
  drewFromRevision = indexRevision();
  drawStale();
}

/**
 * The changed-under-you mark: a line saying what happened, and a control.
 *
 * Never applied on its own. Deck's index raises a revision on every accepted
 * change — whether Deck wrote it, the cockpit did, or somebody edited the file
 * in Obsidian — and a window drawing from an older one says so. One mark for a
 * burst, because the revision is one number rather than a list of files.
 */
let preparedFor = -1;

function drawStale(): void {
  const current = indexRevision();
  const stale = drewFromRevision !== null && current > drewFromRevision;
  if (stale && glass.isActive()) {
    // In Glass the chip on the field's bar says it, with a count (TASK-0032).
    el.stale.hidden = true;
    if (preparedFor !== current) {
      preparedFor = current;
      contexts.forgetBefore(current);
      void prepareChange();
    }
    return;
  }
  el.stale.hidden = !stale;
  if (!stale) return;
  el.stale.replaceChildren();
  const said = document.createElement('span');
  said.textContent =
    wroteTo === null
      ? 'These notes changed on disk since this window drew them.'
      : `These notes changed since this window drew them, and ${wroteTo} was one of them.`;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'action';
  action.textContent = 'show me';
  action.addEventListener('click', () => {
    void (async () => {
      const state = host.state();
      const workspace = workspaceById(state.workspaceId);
      const view = workspace === null || state.viewId === null ? null : registry.resolve(workspace, state.viewId);
      if (workspace !== null && view !== null) await loadView(workspace, view);
      await reopenFocusedNote();
      drewFromRevision = indexRevision();
      wroteTo = null;
      // Cleared by the redraw, and it does not survive a view switch as a
      // stale message about a view nobody is looking at any more.
      drawStale();
    })();
  });
  el.stale.append(said, action);
}

/**
 * Where a throw toward an edge could land (TASK-0055): the windows that lie
 * that way, a display with no Deck window, and the tablet when one is
 * following. Asked of the main process, which knows every window's bounds.
 */
async function throwTargets(edge: Edge): Promise<ThrowTarget[]> {
  const listed = (await host.windowList()) as {
    self: { bounds: { x: number; y: number; width: number; height: number } } | null;
    windows: WindowInfo[];
    displays: DisplayInfo[];
    followers: number;
  } | null;
  if (listed === null || listed.self === null) return [];
  return targetsToward(edge, listed.self.bounds, listed.windows, listed.displays, listed.followers > 0);
}

async function throwTo(target: ThrowTarget, card: CardModel, edge: Edge): Promise<void> {
  const state = host.state();
  if (state.workspaceId === null || state.viewId === null) return;
  const result = await host.throwNote({ target, noteId: card.noteId, workspaceId: state.workspaceId, viewId: state.viewId, edge });
  if (!result.ok) say(result.error ?? 'that throw did not land', true);
  else say(`${card.noteId} is in the ${target.label}`);
}

/**
 * Send to: the throw from the keyboard (TASK-0055). The same targets the
 * strip would name at any edge, chosen by name.
 */
async function sendTo(card: CardModel): Promise<void> {
  if (!host.canArrange()) {
    say('a tablet follows the Mac and sends nothing back', true);
    return;
  }
  const seen = new Map<string, { target: ThrowTarget; edge: Edge }>();
  for (const edge of ['right', 'left', 'bottom', 'top'] as Edge[]) {
    for (const target of await throwTargets(edge)) {
      if (!seen.has(target.label)) seen.set(target.label, { target, edge });
    }
  }
  if (seen.size === 0) {
    say('there is no other window to send it to; pop one out first', true);
    return;
  }
  const chosen = await askChoice(
    `send ${card.noteId} to:`,
    [...seen.keys()].map((label) => ({ value: label, label })),
  );
  if (chosen === null) return;
  const picked = seen.get(chosen);
  if (picked !== undefined) await throwTo(picked.target, card, picked.edge);
}

/**
 * A change arrived while the field was on screen (TASK-0032).
 *
 * Read in the background and COUNTED, never applied: a field that re-deals
 * under the pointer is the automation surprise the DES-0002 review names. The
 * held notes are the exception and are refreshed at once, because holding a
 * stale note is worse than a moving card.
 */
async function prepareChange(): Promise<void> {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  const view = currentView;
  if (workspace === null || view === null) return;
  glass.forgetBodies();
  glass.update({ groups: currentGroups, view: currentView, faces: currentView?.face ?? PLAIN_FACES, pending: pendingCount });
  let next: CardGroup[];
  try {
    const source = sourceOf(view);
    if (source.kind === 'nav') next = groupsFromNav(await clientFor(workspace.id).nav(source.mode));
    else if (source.kind === 'query') next = (await loadQueryView(workspace, view)).groups;
    else return;
  } catch {
    return;
  }
  if (currentView !== view) return;
  pendingGroups = next;
  pendingCount = changedNotes(currentGroups, next);
  drawDesk();
}

/** How many notes differ between two deals: arrived, left, or moved group or status. */
function changedNotes(before: CardGroup[], after: CardGroup[]): number {
  const describe = (groups: CardGroup[]): Map<string, string> => {
    const out = new Map<string, string>();
    for (const card of flattenGroups(groups)) {
      const group = groups.find((g) => g.cards.includes(card))?.key ?? '';
      out.set(card.noteId, `${out.get(card.noteId) ?? ''}|${group}|${card.status}|${card.owed}`);
    }
    return out;
  };
  const a = describe(before);
  const b = describe(after);
  let changed = 0;
  for (const [id, sig] of b) if (a.get(id) !== sig) changed += 1;
  for (const id of a.keys()) if (!b.has(id)) changed += 1;
  return changed;
}

/** The person acted on the chip: the held change is dealt, with the view switch's transitions. */
function applyPending(): void {
  if (pendingGroups === null) return;
  currentGroups = pendingGroups;
  currentCards = flattenGroups(currentGroups);
  pendingGroups = null;
  pendingCount = 0;
  drewFromRevision = indexRevision();
  wroteTo = null;
  drawStale();
  renderFilters();
  drawNavigator();
  drawDesk();
}

/** The name Deck writes with, shown and changeable. */
function drawActor(): void {
  // Absent where nothing writes: a served page has no name to show.
  el.actor.hidden = !host.capabilities().write;
  if (el.actor.hidden) return;
  const actor = host.state().actor;
  el.actor.textContent = actor === '' ? 'no name set' : `writing as ${actor}`;
}

function text(message: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'reader-empty';
  div.textContent = message;
  return div;
}

/**
 * A card is dragged with the pointer, and where it lands is what the desk
 * saves. The element moves during the drag and the store hears about it once,
 * at the end: a move is one change, not sixty.
 */
function grabCard(card: CardModel, element: HTMLElement, event: PointerEvent): void {
  if (event.button !== 0) return;
  if (panel === 'needs-you') return;
  const surface = el.desk.getBoundingClientRect();
  const box = element.getBoundingClientRect();
  const grabX = event.clientX - box.left;
  const grabY = event.clientY - box.top;
  let latest = { x: box.left - surface.left + el.desk.scrollLeft, y: box.top - surface.top + el.desk.scrollTop };
  let moved = false;

  element.setPointerCapture(event.pointerId);
  element.classList.add('dragging');

  const move = (moveEvent: PointerEvent): void => {
    const raw = {
      x: moveEvent.clientX - surface.left - grabX + el.desk.scrollLeft,
      y: moveEvent.clientY - surface.top - grabY + el.desk.scrollTop,
    };
    if (Math.abs(raw.x - latest.x) > 3 || Math.abs(raw.y - latest.y) > 3) moved = true;
    latest = clampToSurface(raw, deskBounds(el.desk));
    element.style.left = `${latest.x}px`;
    element.style.top = `${latest.y}px`;
  };

  const up = (): void => {
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', up);
    element.classList.remove('dragging');
    try {
      element.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be gone; the drag is over either way.
    }
    if (!moved) return;
    // Marked so the click this pointer release also fires does not open the note.
    element.dataset['dragged'] = 'true';
    void host.dispatch({ type: 'move-card', noteId: card.noteId, x: latest.x, y: latest.y });
  };

  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', up);
}

function currentAddress(): string | null {
  const state = host.state();
  if (state.workspaceId === null || state.viewId === null) return null;
  try {
    return formatAddress(
      addressFor(state.workspaceId, state.viewId, {
        desk: state.deskName,
        note: panel === 'note' ? pinnedNoteId : state.noteId,
        panel,
        // Written only when it is not Glass: an address without a surface
        // means Glass (ADR-0002, TASK-0033).
        surface: panel === null && surfaceNow() !== DEFAULT_SURFACE ? surfaceNow() : null,
      }),
    );
  } catch (err) {
    say(err instanceof AddressError ? err.message : String(err), true);
    return null;
  }
}

async function applyAddress(raw: string): Promise<void> {
  const address = parseAddress(raw);

  // Everything is resolved BEFORE anything moves. An address that cannot be
  // followed leaves Deck exactly where it was, which is the whole point of
  // refusing rather than defaulting.
  const workspace = workspaceById(address.workspaceId);
  if (workspace === null) {
    say(`that address names a workspace Deck does not know: ${address.workspaceId}`, true);
    return;
  }
  if (registry.resolve(workspace, address.viewId) === null) {
    say(`that address names a view this workspace does not have: ${address.viewId}`, true);
    return;
  }
  if (address.desk !== null && host.state().desks[`${workspace.id}:${address.desk}`] === undefined) {
    say(`that address names a desk this workspace does not have: ${address.desk}`, true);
    return;
  }

  // A panel belongs to a satellite. A satellite's own Copy address carries one,
  // and pasting that into the focus window used to hide the navigator and the
  // reader with no control left to bring them back: recovery meant typing
  // another address with the panel stripped by hand (ISS-0019). The rest of
  // the address is followed either way, and the drop is said out loud.
  if (pinned) {
    panel = address.panel;
    document.body.dataset['panel'] = panel ?? '';
  } else if (address.panel !== null) {
    say(`that address carries the ${address.panel} panel, which belongs to a popped-out window; opening the rest of it here`);
  }
  // The surface before the view, so the view is drawn once, on the right one.
  // No surface in the address means Glass.
  await host.dispatch({ type: 'select-surface', surface: address.surface ?? DEFAULT_SURFACE });
  await selectWorkspace(workspace.id);
  await selectView(address.viewId);
  if (address.desk !== null) await host.dispatch({ type: 'open-desk', name: address.desk });
  if (address.note !== null) {
    const card = currentCards.find((c) => c.noteId === address.note);
    if (card === undefined) say(`that address names a note this view does not show: ${address.note}`, true);
    else {
      await openCard(card);
      if (glass.isActive()) glass.arriveAt(card.noteId);
    }
  }
  applySurface();
  drawNavigator();
  drawDesk();
}

/** Electron has no window.prompt, so Deck asks in its own status bar. */
function askText(label: string, initial = ''): Promise<string | null> {
  return new Promise((resolve) => {
    el.status.classList.remove('error');
    el.status.replaceChildren();
    const form = document.createElement('form');
    const caption = document.createElement('label');
    caption.textContent = `${label} `;
    const input = document.createElement('input');
    input.value = initial;
    input.size = 40;
    caption.appendChild(input);
    form.appendChild(caption);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      say('');
      resolve(value === '' ? null : value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        say('');
        resolve(null);
      }
    });
    el.status.appendChild(form);
    input.focus();
  });
}

/** The same asking place, for a choice between named things. */
function askChoice<T extends string>(label: string, options: Array<{ value: T; label: string }>): Promise<T | null> {
  return new Promise((resolve) => {
    el.status.classList.remove('error');
    el.status.replaceChildren();
    const caption = document.createElement('span');
    caption.textContent = `${label} `;
    el.status.appendChild(caption);
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action';
      button.textContent = option.label;
      button.addEventListener('click', () => {
        say('');
        resolve(option.value);
      });
      el.status.appendChild(button);
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'action';
    cancel.textContent = 'cancel';
    cancel.addEventListener('click', () => {
      say('');
      resolve(null);
    });
    el.status.appendChild(cancel);
    // The keyboard lands on the first answer, so a choice asked from a key
    // press can be answered with keys alone (TASK-0055's send to).
    (el.status.querySelector('button') as HTMLButtonElement | null)?.focus();
  });
}

function wireControls(): void {
  el.copyAddress.addEventListener('click', () => {
    void (async () => {
      const address = currentAddress();
      if (address === null) {
        say('there is nothing addressable open yet', true);
        return;
      }
      const written = await host.writeClipboard(address);
      say(written ? `copied ${address}` : address);
    })();
  });

  el.openAddress.addEventListener('click', () => {
    void (async () => {
      const fromClipboard = (await host.readClipboard()) ?? '';
      const raw = await askText('address:', fromClipboard);
      if (raw === null) return;
      try {
        await applyAddress(raw);
      } catch (err) {
        say(err instanceof Error ? err.message : String(err), true);
      }
    })();
  });

  el.popOut.addEventListener('click', () => {
    void (async () => {
      const state = host.state();
      if (state.workspaceId === null || state.viewId === null) {
        say('open a view before popping one out', true);
        return;
      }
      // Popping out asks what the new window will carry. A window that carries
      // one thing is a status window; a window that carries the view again is
      // a duplicate, which is what this used to be (TASK-0026).
      const chosen = await askChoice(
        'what should the new window carry?',
        panelKinds.all().map((kind) => ({ value: kind.id, label: kind.label })),
      );
      if (chosen === null) return;
      if (chosen === 'note' && state.noteId === null) {
        say('open a note before popping one out', true);
        return;
      }
      if (chosen === 'desk' && deskCardsOf(state, state.workspaceId).length === 0) {
        say('put something on the desk before popping it out', true);
        return;
      }
      const address = formatAddress(
        addressFor(state.workspaceId, state.viewId, {
          desk: state.deskName,
          note: state.noteId,
          panel: chosen,
        }),
      );
      const result = await host.openPanel(address);
      if (!result.ok) say(result.error ?? 'that window did not open', true);
      else say(`opened a window carrying ${panelLabel(chosen).toLowerCase()}`);
    })();
  });

  el.saveDesk.addEventListener('click', () => {
    void (async () => {
      const state = host.state();
      const workspace = workspaceById(state.workspaceId);
      if (workspace === null) return;
      const cards = deskCardsOf(state, workspace.id);
      if (cards.length === 0) {
        say('there is nothing on the desk to save', true);
        return;
      }
      const name = await askText('desk name:', state.deskName ?? '');
      if (name === null) return;
      if (!isDeskName(name)) {
        // Refused here, where the person can retype it, rather than later when
        // they copy the address and Deck rejects its own string.
        say('that name cannot go in an address: up to 64 characters, and no control characters', true);
        return;
      }
      await host.dispatch({ type: 'save-desk', name });
      drawDesk();
      say(`saved the desk "${name}" with ${cards.length} cards`);
    })();
  });

  el.clearDesk.addEventListener('click', () => {
    void (async () => {
      await host.dispatch({ type: 'clear-desk' });
      drawNavigator();
      drawDesk();
    })();
  });

  el.deskList.addEventListener('change', () => {
    void (async () => {
      const value = el.deskList.value;
      await host.dispatch({ type: 'open-desk', name: value === '' ? null : value });
      drawNavigator();
      drawDesk();
    })();
  });

  el.follow.addEventListener('click', () => {
    host.setFollowing(!host.following());
    followed = { workspaceId: null, viewId: null, noteId: null };
    drawFollow();
    if (host.following()) void followTheMac(host.state());
  });

  el.actor.addEventListener('click', () => {
    void (async () => {
      // A minimal control, and the decision is recorded in TASK-0048: a store
      // field with no way to edit it is enough for one feature and a poor
      // answer for a working day, and a person should be able to see and
      // change the name their writes carry before they make one.
      const name = await askText('write as:', host.state().actor);
      if (name === null) return;
      await host.dispatch({ type: 'set-actor', actor: name });
      drawActor();
      say(`writing as ${name}`);
    })();
  });

  el.search.addEventListener('input', () => {
    // Typed a letter at a time, dispatched once the typing pauses: every
    // window shares this state, and a keystroke is not a state change worth
    // broadcasting.
    if (queryTimer !== null) clearTimeout(queryTimer);
    const text_ = el.search.value;
    queryTimer = setTimeout(() => {
      void host.dispatch({ type: 'set-query', text: text_ });
    }, 120);
  });

  const applyFilters = (): void => {
    void host.dispatch({
      type: 'set-filters',
      filters: {
        statuses: el.statusFilter.value === '' ? [] : [el.statusFilter.value],
        types: el.typeFilter.value === '' ? [] : [el.typeFilter.value],
      },
    });
  };
  el.statusFilter.addEventListener('change', applyFilters);
  el.typeFilter.addEventListener('change', applyFilters);
}

/**
 * A status window has to notice when the record changes underneath it.
 *
 * Nothing pushes from the sidecar, so the panel asks again on a slow beat. It
 * is the only window that polls, and it polls one endpoint.
 */
function startNeedsYouPoll(): void {
  const beat = 30_000;
  // The workspace and view this window was opened on, read once. Taking them
  // from the shared state on every beat made the strip follow the focus
  // window's view, silently, thirty seconds later — the opposite of what the
  // comment on `pinned` promises (ISS-0018).
  const opened = host.state();
  const workspaceId = opened.workspaceId;
  const viewId = opened.viewId;
  setInterval(() => {
    void (async () => {
      const workspace = workspaceById(workspaceId);
      if (workspace === null || viewId === null) return;
      const view = registry.resolve(workspace, viewId);
      if (view === null) return;
      await loadView(workspace, view);
    })();
  }, beat);
}

/**
 * Hold a change to one note's status as though it had arrived from disk.
 *
 * The smoke run's route to TASK-0032's chip: it must never write to the
 * repository it checks, so it cannot make a real change arrive. What it
 * drives is everything after the arrival — the count, the chip, the field
 * not moving, and the deal on the person's click.
 */
(globalThis as unknown as { __deckHoldChange?: (noteId: string, status: string) => number }).__deckHoldChange = (
  noteId,
  status,
) => {
  const clone = JSON.parse(JSON.stringify(currentGroups)) as CardGroup[];
  const walk = (cards: CardModel[]): void => {
    for (const card of cards) {
      if (card.noteId === noteId) card.status = status;
      walk(card.children);
    }
  };
  for (const group of clone) walk(group.cards);
  pendingGroups = clone;
  pendingCount = changedNotes(currentGroups, clone);
  drawDesk();
  return pendingCount;
};

// The smoke run reads this to check that a satellite saw the state change.
host.onState((state) => {
  (globalThis as unknown as { __deckLastState?: unknown }).__deckLastState = state;
});

boot()
  .then(() => {
    // A window that has finished loading has not necessarily finished booting:
    // the capability set, the workspaces and the first view all arrive after.
    // Anything driving Deck from outside waits for this rather than for load.
    (globalThis as unknown as { __deckReady?: boolean }).__deckReady = true;
  })
  .catch((err: unknown) => {
    say(err instanceof Error ? err.message : String(err), true);
    (globalThis as unknown as { __deckReady?: boolean }).__deckReady = true;
  });
