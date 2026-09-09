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
import type { CardGroup, CardModel, DeckView, PanelType, Workspace } from '../shared/types.js';
import { AddressError, addressFor, formatAddress, isDeskName, parseAddress, tryParseAddress } from '../shared/address.js';
import { DEFAULT_VIEW_ID, ViewRegistry } from '../shared/views.js';
import { SidecarClient, flattenGroups, groupsFromNav } from '../shared/sidecar-client.js';
import { CARD_WIDTH, clampToSurface, deskBounds, nextSlot, placementBounds, reconcileDesk } from '../shared/desk.js';
import { deskCardsOf } from '../shared/store-state.js';
import { panelKinds, panelLabel, panelOrNull } from '../shared/panels.js';
import { countDistinct, narrowGroups, statusesIn, typesIn } from '../shared/search.js';
import { CardPool, type PlacedCard } from './cards.js';
import { NavigatorList } from './navigator.js';
import { Host } from './host-bridge.js';

const host = new Host();
const registry = new ViewRegistry();

const el = {
  switcher: must('switcher'),
  rail: must('rail'),
  navigator: must('navigator'),
  navList: must('nav-list'),
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
};

let workspaces: Workspace[] = [];
/**
 * A satellite window shows one address and owns no navigation: no switcher, no
 * rail, no pop-out. Its cards are loaded once, from its own address, and a
 * view change in the focus window does not move it, because only a switcher
 * click or an address load calls `selectView`.
 */
let pinned = false;
let currentViews: DeckView[] = [];
/** The view as it arrived, in groups, before anything is narrowed. */
let currentGroups: CardGroup[] = [];
/** Every card in the view, children flattened, for the desk and the address. */
let currentCards: CardModel[] = [];
let panel: PanelType | null = null;
/** A note panel stays on the note its address named, whatever the focus window does. */
let pinnedNoteId: string | null = null;
let queryTimer: ReturnType<typeof setTimeout> | null = null;

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
});

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

  host.onState(() => {
    renderRail();
    paintSwitcher();
    // drawDesk, not just the chrome: it is the only thing that repaints the
    // cards, so leaving it out means a window receives a change from another
    // window and shows nothing.
    drawNavigator();
    drawDesk();
  });
  wireControls();
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
}

async function loadView(workspace: Workspace, view: DeckView): Promise<void> {
  const client = clientFor(workspace.id);
  try {
    if (view.source.kind === 'nav') {
      const payload = await client.nav(view.source.mode);
      currentGroups = groupsFromNav(payload);
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
  drawNavigator();
  drawDesk();
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
    groups,
    folds: state.folds,
    onDesk: new Set(deskCardsOf(state, state.workspaceId).map((c) => c.noteId)),
    currentNoteId: state.noteId,
  });
  el.navCount.textContent = `${shown} of ${held}`;
  if (el.search.value !== state.query) el.search.value = state.query;
  syncFilters();
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

/** A click in the navigator puts a note on the desk, or takes it off again. */
async function toggleOnDesk(card: CardModel): Promise<void> {
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
  } catch (err) {
    el.reader.replaceChildren(text(err instanceof Error ? err.message : String(err)));
  }
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
  await selectWorkspace(workspace.id);
  await selectView(address.viewId);
  if (address.desk !== null) await host.dispatch({ type: 'open-desk', name: address.desk });
  if (address.note !== null) {
    const card = currentCards.find((c) => c.noteId === address.note);
    if (card === undefined) say(`that address names a note this view does not show: ${address.note}`, true);
    else await openCard(card);
  }
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
