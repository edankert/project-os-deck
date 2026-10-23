/**
 * Deck's renderer: the workspace rail, the overview, the agent pane and the shell drawer.
 *
 * Since 2026-10-23 Deck is the overview and nothing else (ADR-0010). Spread, Glass and
 * the orbit, which this file used to wire, are kept under the git tag
 * `original-deck-2026-10-23`. The overview is always shown: the wheel of the current
 * workspace when Deck opens, and whichever screen an address names after that.
 *
 * An address carries a view, because addresses written before the overview carried
 * one (`deck://<workspace>/<view>?page=wheel`). The overview reads none; every
 * address Deck writes names `features`, and an old one naming a desk, a note, a panel
 * or a surface opens the overview and says that part is not in this Deck.
 */
import type { Workspace } from '../shared/types.js';
import type { NoteRecord } from '../shared/records.js';
import { addressFor, tryParseAddress } from '../shared/address.js';
import { SidecarClient } from '../shared/sidecar-client.js';
import { Host } from './host-bridge.js';
import { initOverview, isOverviewAddress, overviewAddress, preferredColour, preferredGrouping, showOverview } from './overview.js';
// The overview's screens register themselves with it.
import './overview-pages.js';
import './overview-flows.js';
import { initShellDrawer } from './shell-drawer.js';

/** The view every address Deck writes names. The overview reads none (see above). */
const VIEW = 'features';

const host = new Host();

const el = {
  rail: must('rail'),
  status: must('status'),
  hostMark: must('host-mark'),
  home: must('overview-toggle') as HTMLButtonElement,
  copyAddress: must('copy-address') as HTMLButtonElement,
  openAddress: must('open-address') as HTMLButtonElement,
  actor: must('actor') as HTMLButtonElement,
};

let workspaces: Workspace[] = [];
/** ⌘ Shells, made in Deck's own window only (FEAT-0035); a served page has none. */
let shellsButton: HTMLButtonElement | null = null;
/** The workspaces this window has opened, so going home to the wheel does not open one again. */
const opened = new Set<string>();

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
  el.hostMark.textContent = host.isShell() ? 'shell' : 'served · read only';

  workspaces = await host.workspaces();
  // The shell drawer, in the shell only (FEAT-0035): no bridge on a served page, so no drawer and no button.
  const shellBridge = host.shells();
  if (shellBridge !== null) {
    shellsButton = document.createElement('button');
    shellsButton.type = 'button';
    shellsButton.id = 'shells-toggle';
    shellsButton.className = 'rail-shells';
    shellsButton.hidden = true;
    shellsButton.setAttribute('aria-pressed', 'false');
    shellsButton.title = 'Plain shells, in a drawer at the bottom';
    shellsButton.textContent = '⌘ Shells';
    initShellDrawer({ shells: shellBridge, workspaceId: () => host.state().workspaceId, say }, shellsButton);
  }
  renderRail();

  initOverview({
    workspaceId: () => host.state().workspaceId,
    viewId: () => VIEW,
    canWrite: () => host.isShell(),
    say,
    // The overview's flows write through the shell's bridge (ADR-0003).
    write: (verb, request) => host.write(verb as Parameters<Host['write']>[0], request),
    ask: (label) => askText(label),
    read: (workspaceId, sidecarPath) => host.read(workspaceId, sidecarPath),
    // The ticket screen's text: the note's HTML, from the sidecar (TASK-0148).
    noteHtml: async (workspaceId, noteId) => {
      const response = await fetch(`/deck/records/${encodeURIComponent(workspaceId)}?id=${encodeURIComponent(noteId)}`);
      if (!response.ok) throw new Error(`Deck's own index answered ${response.status}`);
      const record = ((await response.json()) as { records?: NoteRecord[] }).records?.[0];
      if (record === undefined) throw new Error(`Deck's index has no note ${noteId}`);
      return (await clientFor(workspaceId).note(record.relPath)).html;
    },
    // Back or forward to another workspace's screen, or an address that is not an overview screen.
    leaveTo: (raw) => applyAddress(raw),
    // Deck's own agent sessions: the shell's bridge, null on a served page (FEAT-0033, RISK-0015).
    agents: () => host.agents(),
  });

  const requested = new URLSearchParams(location.search).get('address');
  if (requested !== null) await applyAddress(requested);
  else {
    const chosen = workspaceById(host.state().workspaceId) ?? workspaces[0] ?? null;
    if (chosen !== null) await openWheel(chosen.id);
    else say('no workspace yet: add one from the rail');
  }

  host.onState(() => {
    renderRail();
    drawActor();
  });
  wireControls();
  drawActor();
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
    button.addEventListener('click', () => void openWheel(workspace.id));
    el.rail.appendChild(button);
  }
  if (host.capabilities().manageWorkspaces) {
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
  // The shell drawer's button stands at the rail's foot, where it does not widen the header (TASK-0212).
  if (shellsButton !== null) el.rail.appendChild(shellsButton);
}

/** Open a workspace: its sidecar is started, or one already running is used. False when it did not open. */
async function openWorkspace(id: string): Promise<boolean> {
  const workspace = workspaceById(id);
  if (workspace === null) {
    say(`no workspace with id ${id}`, true);
    return false;
  }
  if (workspace.open === false) {
    say(`${workspace.name} has no sidecar running: open it in the Deck shell first, then reload this page`, true);
    return false;
  }
  if (opened.has(id) && host.state().workspaceId === id) return true;
  say(`opening ${workspace.name}…`);
  const answer = await host.openWorkspace(id);
  if (!answer.ok) {
    say(answer.error ?? 'that workspace did not open', true);
    return false;
  }
  opened.add(id);
  say(answer.borrowed === true ? `${workspace.name}: using the sidecar already running` : `${workspace.name}: ready`);
  renderRail();
  return true;
}

/** The wheel of a workspace, in the colouring and grouping chosen last on this machine. */
async function openWheel(id: string): Promise<void> {
  if (!(await openWorkspace(id))) return;
  try {
    await showOverview(addressFor(id, VIEW, { page: 'wheel', colour: preferredColour(), group: preferredGrouping() }));
  } catch (err) {
    say(err instanceof Error ? err.message : String(err), true);
  }
}

/**
 * Follow an address. Everything is checked before anything moves: an address that
 * cannot be followed leaves Deck where it was. One that names what left Deck with
 * Spread and Glass opens that workspace's wheel and says so.
 */
async function applyAddress(raw: string): Promise<void> {
  const parsed = tryParseAddress(raw);
  if (!parsed.ok) {
    say(`that address was refused: ${parsed.reason}`, true);
    return;
  }
  const address = parsed.address;
  if (workspaceById(address.workspaceId) === null) {
    say(`that address names a workspace Deck does not know: ${address.workspaceId}`, true);
    return;
  }
  if (isOverviewAddress(address)) {
    if (!(await openWorkspace(address.workspaceId))) return;
    await showOverview(address);
    return;
  }
  await openWheel(address.workspaceId);
  const gone = [address.desk !== null ? 'a desk' : null, address.note !== null ? 'a note in a view' : null, address.panel !== null ? 'a popped-out panel' : null, address.surface !== null ? `the ${address.surface} surface` : null].filter((part) => part !== null);
  say(`that address names ${gone.length > 0 ? gone.join(' and ') : `the ${address.viewId} view`}, which is not in this Deck since Spread and Glass were parked; this is the overview`);
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

/** The name Deck writes with; absent where nothing writes, as on a served page. */
function drawActor(): void {
  el.actor.hidden = !host.capabilities().write;
  if (el.actor.hidden) return;
  const actor = host.state().actor;
  el.actor.textContent = actor === '' ? 'no name set' : `writing as ${actor}`;
}

function wireControls(): void {
  // The name in the header is the way home: the current workspace's wheel.
  el.home.addEventListener('click', () => {
    const id = host.state().workspaceId;
    if (id !== null) void openWheel(id);
  });
  el.copyAddress.addEventListener('click', () => {
    void (async () => {
      const address = overviewAddress();
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
      const raw = await askText('address:', (await host.readClipboard()) ?? '');
      if (raw === null) return;
      try {
        await applyAddress(raw);
      } catch (err) {
        say(err instanceof Error ? err.message : String(err), true);
      }
    })();
  });
  el.actor.addEventListener('click', () => {
    void (async () => {
      // The name a write carries, seen and changed before one is made (TASK-0048).
      const name = await askText('write as:', host.state().actor);
      if (name === null) return;
      await host.dispatch({ type: 'set-actor', actor: name });
      drawActor();
      say(`writing as ${name}`);
    })();
  });
}

// The smoke run reads this to check that the state reached the window.
host.onState((state) => {
  (globalThis as unknown as { __deckLastState?: unknown }).__deckLastState = state;
});

boot()
  .then(() => {
    // A window that has finished loading has not necessarily finished booting:
    // the capabilities, the workspaces and the first screen all arrive after.
    // Anything driving Deck from outside waits for this rather than for load.
    (globalThis as unknown as { __deckReady?: boolean }).__deckReady = true;
  })
  .catch((err: unknown) => {
    say(err instanceof Error ? err.message : String(err), true);
    (globalThis as unknown as { __deckReady?: boolean }).__deckReady = true;
  });
