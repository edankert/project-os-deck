/**
 * The state Deck keeps, and the pure reducer over it.
 *
 * The state lives once, in the main process, and every window subscribes.
 * The cockpit keeps the same kind of state in `localStorage`, read once when a
 * window starts and never re-read, which is why two cockpit windows never see
 * each other change. Keeping the reducer pure is what lets this be tested
 * without opening a window: the Electron part is transport.
 */
import type { Desk, DeckState } from './types.js';

export type DeckAction =
  | { type: 'open-workspace'; workspaceId: string }
  | { type: 'select-view'; viewId: string }
  | { type: 'focus-note'; noteId: string | null }
  | { type: 'open-desk'; name: string | null }
  | { type: 'save-desk'; desk: Desk }
  | { type: 'delete-desk'; workspaceId: string; name: string }
  | { type: 'restore'; state: DeckState };

export function initialState(): DeckState {
  return { workspaceId: null, viewId: null, deskName: null, noteId: null, desks: {}, revision: 0 };
}

export function deskKey(workspaceId: string, name: string): string {
  return `${workspaceId}:${name}`;
}

/**
 * Returns the SAME object when nothing changed, so a caller can skip a
 * broadcast by identity rather than by deep comparison.
 */
export function reduce(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'open-workspace': {
      if (state.workspaceId === action.workspaceId) return state;
      // A view, desk and note belong to the workspace they were chosen in.
      return bump({ ...state, workspaceId: action.workspaceId, viewId: null, deskName: null, noteId: null });
    }
    case 'select-view': {
      if (state.viewId === action.viewId) return state;
      return bump({ ...state, viewId: action.viewId });
    }
    case 'focus-note': {
      if (state.noteId === action.noteId) return state;
      return bump({ ...state, noteId: action.noteId });
    }
    case 'open-desk': {
      if (state.deskName === action.name) return state;
      return bump({ ...state, deskName: action.name });
    }
    case 'save-desk': {
      const key = deskKey(action.desk.workspaceId, action.desk.name);
      const desks = { ...state.desks, [key]: cloneDesk(action.desk) };
      return bump({ ...state, desks, deskName: action.desk.name });
    }
    case 'delete-desk': {
      const key = deskKey(action.workspaceId, action.name);
      if (!(key in state.desks)) return state;
      const desks = { ...state.desks };
      delete desks[key];
      const deskName = state.deskName === action.name ? null : state.deskName;
      return bump({ ...state, desks, deskName });
    }
    case 'restore': {
      return { ...normaliseState(action.state), revision: state.revision + 1 };
    }
    default: {
      // An action this build does not know is ignored rather than fatal.
      return state;
    }
  }
}

function bump(state: DeckState): DeckState {
  return { ...state, revision: state.revision + 1 };
}

function cloneDesk(desk: Desk): Desk {
  return {
    name: desk.name,
    workspaceId: desk.workspaceId,
    cards: desk.cards.map((c) => ({ noteId: c.noteId, x: c.x, y: c.y })),
  };
}

/**
 * Accept a state read from disk. Anything of the wrong shape becomes the
 * default for that field: a person whose Deck will not open because of its own
 * state file has no way back in.
 */
export function normaliseState(value: unknown): DeckState {
  const base = initialState();
  if (typeof value !== 'object' || value === null) return base;
  const raw = value as Record<string, unknown>;
  const desks: Record<string, Desk> = {};
  const rawDesks = raw['desks'];
  if (typeof rawDesks === 'object' && rawDesks !== null) {
    for (const [key, desk] of Object.entries(rawDesks as Record<string, unknown>)) {
      const normalised = normaliseDesk(desk);
      if (normalised !== null) desks[key] = normalised;
    }
  }
  return {
    workspaceId: str(raw['workspaceId']),
    viewId: str(raw['viewId']),
    deskName: str(raw['deskName']),
    noteId: str(raw['noteId']),
    desks,
    revision: typeof raw['revision'] === 'number' && Number.isFinite(raw['revision']) ? raw['revision'] : 0,
  };
}

function normaliseDesk(value: unknown): Desk | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const name = str(raw['name']);
  const workspaceId = str(raw['workspaceId']);
  if (name === null || workspaceId === null) return null;
  const cards = Array.isArray(raw['cards'])
    ? (raw['cards'] as unknown[]).flatMap((c) => {
        if (typeof c !== 'object' || c === null) return [];
        const card = c as Record<string, unknown>;
        const noteId = str(card['noteId']);
        if (noteId === null) return [];
        return [{ noteId, x: num(card['x']), y: num(card['y']) }];
      })
    : [];
  return { name, workspaceId, cards };
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
