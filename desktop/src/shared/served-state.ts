/**
 * What a tablet is told about the Mac's state, and how it keeps its own.
 *
 * Deck's host answers two reads, `/deck/state` and `/deck/events`, and both are
 * built from the two functions here (TASK-0057). **The tablet follows and never
 * steers** (ADR-0001). It reads the store and sends nothing back: the host
 * answers 405 to every method that is not a read, and a served page has no
 * bridge to dispatch through. The workspace it is looking at stays the
 * tablet's own, so a person can look at one workspace there while the Mac
 * shows another.
 *
 * Until 2026-10-23 the tablet also followed the Mac's desk, its view and the
 * note it showed. Those left with Spread and Glass (ADR-0010).
 */
import type { DeckState } from './types.js';
import { initialState } from './store-state.js';

/** The parts of the state a tablet keeps for itself. */
export const TABLET_OWN_FIELDS = ['workspaceId'] as const;

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
  const indexRevisions: Record<string, number> = {};
  for (const [key, value] of Object.entries(state.indexRevisions)) {
    if (openWorkspaceIds.has(key)) indexRevisions[key] = value;
  }
  const workspaceOpen = state.workspaceId !== null && openWorkspaceIds.has(state.workspaceId);
  return { ...state, workspaceId: workspaceOpen ? state.workspaceId : null, actor: '', indexRevisions };
}

/** The state a served page draws: the Mac's, with the tablet's own workspace on top. */
export function mergeServed(remote: DeckState, local: DeckState): DeckState {
  const merged: DeckState = { ...remote };
  for (const field of TABLET_OWN_FIELDS) {
    (merged as unknown as Record<string, unknown>)[field] = (local as unknown as Record<string, unknown>)[field];
  }
  // A tablet that has not chosen a workspace yet starts where the Mac is,
  // which is what a person picking it up expects.
  if (merged.workspaceId === null && remote.workspaceId !== null) merged.workspaceId = remote.workspaceId;
  // One revision a subscriber can compare: the larger of the two, so a local
  // change on the tablet and a broadcast from the Mac never look older than
  // what was already drawn.
  merged.revision = Math.max(remote.revision, local.revision);
  return merged;
}

/** The actions a served page applies to its own copy: only the ones that change what it keeps for itself. */
export const TABLET_LOCAL_ACTIONS: ReadonlySet<string> = new Set(['open-workspace']);

/** A state to start from before the first answer arrives. */
export function emptyServedState(): DeckState {
  return initialState();
}
