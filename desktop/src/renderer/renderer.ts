/**
 * Deck's renderer. One file of wiring over the shared modules.
 *
 * It holds no list of view names. The switcher draws whatever the view
 * provider returns for the current workspace's kind, which is what lets a
 * vault's own saved views become Deck views in a later phase without touching
 * this file.
 */
import type { CardModel, DeckView, Workspace } from '../shared/types.js';
import { AddressError, formatAddress, isDeskName, parseAddress, tryParseAddress } from '../shared/address.js';
import { DEFAULT_VIEW_ID, ViewRegistry } from '../shared/views.js';
import { SidecarClient, cardsFromNav } from '../shared/sidecar-client.js';
import { deskFrom, reconcileDesk } from '../shared/desk.js';
import { deskKey } from '../shared/store-state.js';
import { CardPool, type PlacedCard } from './cards.js';
import { Host } from './host-bridge.js';

const host = new Host();
const registry = new ViewRegistry();

const el = {
  switcher: must('switcher'),
  rail: must('rail'),
  desk: must('desk'),
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
let currentCards: CardModel[] = [];
let panel: string | null = null;

const pool = new CardPool(el.desk, (card) => {
  void openCard(card);
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
  panel = role.panel;
  pinned = role.role === 'satellite';
  (globalThis as unknown as { __deckRole?: string }).__deckRole = String(role.role);
  document.body.classList.toggle('pinned', pinned);
  el.hostMark.textContent = host.isShell() ? 'shell' : 'served · read only';
  el.popOut.hidden = !host.capabilities().popOutWindows;
  el.saveDesk.disabled = false;

  workspaces = await host.workspaces();
  renderRail();

  const requested = new URLSearchParams(location.search).get('address');
  if (requested !== null) {
    const parsed = tryParseAddress(requested);
    if (parsed.ok) {
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
    drawDesk();
  });
  wireControls();
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
    kind.textContent = workspace.kind;
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
      currentCards = cardsFromNav(payload).map((c) => ({
        noteId: c.noteId,
        title: c.title,
        noteType: c.noteType,
        status: c.status,
        rel: c.rel,
      }));
    } else {
      const payload = await client.stats();
      currentCards = Object.entries(payload.hero).map(([key, value]) => ({
        noteId: key,
        title: describe(value),
        noteType: 'count',
        status: '',
        rel: null,
      }));
    }
    say(`${workspace.name} · ${view.label} · ${currentCards.length} cards`);
  } catch (err) {
    currentCards = [];
    say(err instanceof Error ? err.message : String(err), true);
  }
  drawDesk();
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

function drawDesk(): void {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  let placed: PlacedCard[] = currentCards.map((card) => ({ card, x: null, y: null }));
  let label = 'no desk';

  if (workspace !== null && state.deskName !== null) {
    const desk = state.desks[deskKey(workspace.id, state.deskName)];
    if (desk !== undefined) {
      const reconciled = reconcileDesk(desk, currentCards);
      placed = reconciled.cards.map((c) => ({ card: c.card, x: c.x, y: c.y }));
      label =
        reconciled.dropped === 0
          ? state.deskName
          : `${state.deskName} — ${reconciled.dropped} card${reconciled.dropped === 1 ? '' : 's'} dropped, their notes are gone`;
    }
  }
  el.deskName.textContent = label;
  el.count.textContent = `${placed.length} of ${currentCards.length}`;
  pool.render(placed, state.noteId);
  renderDeskList();
}

/**
 * Show the note the state still names, after a restart or a workspace change.
 * Without this the card is marked as current and the reader stays empty.
 */
async function reopenFocusedNote(): Promise<void> {
  const noteId = host.state().noteId;
  if (noteId === null) return;
  const card = currentCards.find((c) => c.noteId === noteId);
  if (card !== undefined) await openCard(card);
}

function renderDeskList(): void {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  const names = workspace === null ? [] : Object.values(state.desks).filter((d) => d.workspaceId === workspace.id).map((d) => d.name);
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

async function openCard(card: CardModel): Promise<void> {
  const state = host.state();
  const workspace = workspaceById(state.workspaceId);
  if (workspace === null) return;
  await host.dispatch({ type: 'focus-note', noteId: card.noteId });
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

function currentAddress(): string | null {
  const state = host.state();
  if (state.workspaceId === null || state.viewId === null) return null;
  try {
    return formatAddress({
      workspaceId: state.workspaceId,
      viewId: state.viewId,
      desk: state.deskName,
      note: state.noteId,
      panel,
    });
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
  if (address.desk !== null && host.state().desks[deskKey(workspace.id, address.desk)] === undefined) {
    say(`that address names a desk this workspace does not have: ${address.desk}`, true);
    return;
  }

  panel = address.panel;
  await selectWorkspace(workspace.id);
  await selectView(address.viewId);
  await host.dispatch({ type: 'open-desk', name: address.desk });
  if (address.note !== null) {
    const card = currentCards.find((c) => c.noteId === address.note);
    if (card === undefined) say(`that address names a note this view does not show: ${address.note}`, true);
    else await openCard(card);
  }
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
      const address = formatAddress({
        workspaceId: state.workspaceId,
        viewId: state.viewId,
        desk: state.deskName,
        note: state.noteId,
        panel: 'status',
      });
      const result = await host.openPanel(address);
      if (!result.ok) say(result.error ?? 'that window did not open', true);
    })();
  });

  el.saveDesk.addEventListener('click', () => {
    void (async () => {
      const state = host.state();
      const workspace = workspaceById(state.workspaceId);
      if (workspace === null) return;
      const name = await askText('desk name:', state.deskName ?? '');
      if (name === null) return;
      if (!isDeskName(name)) {
        // Refused here, where the person can retype it, rather than later when
        // they copy the address and Deck rejects its own string.
        say(`that name cannot go in an address: up to 64 characters, and no control characters`, true);
        return;
      }
      const origin = el.desk.getBoundingClientRect();
      const cards = Array.from(el.desk.querySelectorAll<HTMLElement>('.card'))
        .filter((element) => !element.hidden)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            noteId: element.dataset['noteId'] ?? '',
            x: Math.round(box.left - origin.left + el.desk.scrollLeft),
            y: Math.round(box.top - origin.top + el.desk.scrollTop),
          };
        })
        .filter((c) => c.noteId !== '');
      await host.dispatch({ type: 'save-desk', desk: deskFrom(name, workspace.id, cards) });
      drawDesk();
      say(`saved the desk "${name}" with ${cards.length} cards`);
    })();
  });

  el.deskList.addEventListener('change', () => {
    void (async () => {
      const value = el.deskList.value;
      await host.dispatch({ type: 'open-desk', name: value === '' ? null : value });
      drawDesk();
    })();
  });
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
