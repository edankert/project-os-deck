/**
 * Deck's shared state, as a pure reducer.
 *
 * The main process holds the store (`main/store.ts`) and broadcasts every change
 * to each window; a served page reads it and keeps its own workspace on top
 * (`served-state.ts`). Since 2026-10-23 Deck is the overview (ADR-0010), and the
 * state is what the overview needs: the workspace open, the name Deck writes
 * with, and how often each workspace's notes have changed.
 *
 * What Spread and Glass kept here (desks, scenes, views, surfaces, the hands'
 * pulled and pushed notes, reading sizes, collections) left with them. A state
 * file a Deck from before wrote still opens: `normaliseState` reads the fields
 * that stay and passes over the rest.
 */
import type { DeckState } from './types.js';

export type DeckAction =
  | { type: 'open-workspace'; workspaceId: string }
  | { type: 'set-actor'; actor: string }
  /** Deck's own index of a workspace changed: the main process says so, never a window (TASK-0039). */
  | { type: 'index-changed'; workspaceId: string; revision: number }
  | { type: 'restore'; state: DeckState };

/**
 * The actions a window may dispatch.
 *
 * `restore` is not among them: it replaces the whole state and belongs to the
 * main process reading its own file. Nor is `index-changed`: a window that
 * could raise a revision could tell every other window its picture is stale.
 * The channel a window dispatches on is reachable from any page the window
 * loads, so what it may say is a short list rather than everything the
 * reducer understands.
 */
const RENDERER_ACTIONS: ReadonlySet<string> = new Set(['open-workspace', 'set-actor']);

export function isRendererAction(value: unknown): value is DeckAction {
  if (value === null || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && RENDERER_ACTIONS.has(type);
}

export function initialState(): DeckState {
  return { workspaceId: null, actor: '', revision: 0, indexRevisions: {} };
}

/**
 * What is written to disk. The index revisions are not: the index is rebuilt
 * from the files at every start, so a number carried over would claim a change
 * nobody made.
 */
export function persistable(state: DeckState): Omit<DeckState, 'indexRevisions'> {
  return { workspaceId: state.workspaceId, actor: state.actor, revision: state.revision };
}

function bump(state: DeckState): DeckState {
  return { ...state, revision: state.revision + 1 };
}

export function reduce(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'open-workspace':
      return state.workspaceId === action.workspaceId ? state : bump({ ...state, workspaceId: action.workspaceId });
    case 'set-actor': {
      // Trimmed, and an empty name never replaces a real one.
      const actor = typeof action.actor === 'string' ? action.actor.trim() : '';
      return actor === '' || actor === state.actor ? state : bump({ ...state, actor });
    }
    case 'index-changed': {
      const current = state.indexRevisions[action.workspaceId] ?? 0;
      // Never backwards. A late broadcast from an index that has already been
      // replaced would otherwise tell a window its picture is newer than it is.
      if (action.revision <= current) return state;
      return bump({ ...state, indexRevisions: { ...state.indexRevisions, [action.workspaceId]: action.revision } });
    }
    case 'restore':
      return normaliseState(action.state);
    default:
      // An action this build does not know, from a newer window or an older
      // file, is ignored rather than fatal.
      return state;
  }
}

/**
 * A state read from somewhere that cannot be trusted to have the right shape:
 * the state file, which an older or a newer Deck may have written, or a damaged
 * one. Each field is taken only when it has its type, and nothing else is kept.
 */
export function normaliseState(value: unknown): DeckState {
  const source = (value !== null && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const state = initialState();
  if (typeof source['workspaceId'] === 'string' && source['workspaceId'] !== '') state.workspaceId = source['workspaceId'];
  if (typeof source['actor'] === 'string') state.actor = source['actor'];
  if (typeof source['revision'] === 'number' && Number.isFinite(source['revision']) && source['revision'] >= 0) state.revision = Math.floor(source['revision']);
  return state;
}
