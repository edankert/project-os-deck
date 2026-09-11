/**
 * What a tablet is told about the Mac's state, and how it keeps its own.
 *
 * Until TASK-0057 a page served by Deck's host kept a fresh state of its own
 * from `initialState()`, so the tablet showed its own desk and never saw a
 * note lifted on the Mac. Deck's host now answers two reads, `/deck/state`
 * and `/deck/events`, and both are built from the two functions here.
 *
 * **The tablet follows and never steers** (ADR-0001). It reads the store and
 * sends nothing back: the host answers 405 to every method that is not a
 * read, and a served page has no bridge to dispatch through. What the tablet
 * chooses for itself — which workspace and view it is looking at, which
 * surface draws it, what the navigator is narrowed to — stays on the tablet,
 * so a person can browse Features there while the Mac shows Issues.
 */
import type { DeckState } from './types.js';
import { initialState } from './store-state.js';

/**
 * The parts of the state a tablet keeps for itself.
 *
 * The note is among them unless the person asked the tablet to follow the
 * Mac, which is the cockpit's Following toggle carried over.
 */
export const TABLET_OWN_FIELDS = ['workspaceId', 'viewId', 'surface', 'query', 'filters', 'folds', 'noteId'] as const;

/**
 * The store's state as the network may see it.
 *
 * Two things are removed. The name Deck writes with belongs to the shell,
 * which is the only host that writes (ADR-0003), and a tablet has no use for
 * it. And every part keyed by workspace is kept only for a workspace whose
 * sidecar is answering, the same rule `/deck/workspaces` follows, so the
 * network is never told about a workspace a served page could not open.
 */
export function servedState(state: DeckState, openWorkspaceIds: ReadonlySet<string>): DeckState {
  const keep = <T>(record: Record<string, T>): Record<string, T> => {
    const out: Record<string, T> = {};
    for (const [key, value] of Object.entries(record)) {
      if (openWorkspaceIds.has(key)) out[key] = value;
    }
    return out;
  };
  const desks: DeckState['desks'] = {};
  for (const [key, desk] of Object.entries(state.desks)) {
    if (openWorkspaceIds.has(desk.workspaceId)) desks[key] = desk;
  }
  const workspaceOpen = state.workspaceId !== null && openWorkspaceIds.has(state.workspaceId);
  return {
    ...state,
    workspaceId: workspaceOpen ? state.workspaceId : null,
    viewId: workspaceOpen ? state.viewId : null,
    deskName: workspaceOpen ? state.deskName : null,
    noteId: workspaceOpen ? state.noteId : null,
    desks,
    deskCards: keep(state.deskCards),
    viewDesks: keep(state.viewDesks),
    indexRevisions: keep(state.indexRevisions),
    session: { pulled: keep(state.session.pulled), pushed: keep(state.session.pushed) },
    actor: '',
    flowCursor: null,
  };
}

/**
 * The state a served page draws: the Mac's, with the tablet's own choices on top.
 *
 * With `follow` on, the tablet takes the Mac's workspace, view and note as
 * well, so it shows what the shell is showing. With it off, those stay the
 * tablet's and only the shared parts — the desk, the saved desks, the hand's
 * pulled and pushed sets, the index revisions — come from the Mac.
 */
export function mergeServed(remote: DeckState, local: DeckState, follow: boolean): DeckState {
  const merged: DeckState = { ...remote };
  for (const field of TABLET_OWN_FIELDS) {
    if (follow && (field === 'noteId' || field === 'workspaceId' || field === 'viewId')) continue;
    (merged as unknown as Record<string, unknown>)[field] = (local as unknown as Record<string, unknown>)[field];
  }
  // A tablet that has not chosen a workspace yet starts where the Mac is,
  // which is what a person picking it up expects.
  if (merged.workspaceId === null && remote.workspaceId !== null) merged.workspaceId = remote.workspaceId;
  // The desk drawn is the one the Mac's current view holds, whatever view the
  // tablet is browsing: a throw to the tablet lands on that desk, and the
  // tablet sends nothing back that would say which view it shows (FEAT-0015,
  // decision 13).
  merged.deskView = remote.viewId;
  // One revision a subscriber can compare: the larger of the two, so a local
  // change on the tablet and a broadcast from the Mac never look older than
  // what was already drawn.
  merged.revision = Math.max(remote.revision, local.revision);
  return merged;
}

/**
 * The actions a served page applies to its own copy.
 *
 * Only the ones that change a field the tablet keeps for itself. Everything
 * else — a card put on the desk, a pull, a pane moved — would change the
 * Mac's desk, and the tablet does not steer.
 */
export const TABLET_LOCAL_ACTIONS: ReadonlySet<string> = new Set([
  'open-workspace',
  'select-view',
  'select-surface',
  'focus-note',
  'set-query',
  'set-filters',
  'set-fold',
]);

/** A state to start from before the first answer arrives. */
export function emptyServedState(): DeckState {
  return initialState();
}
