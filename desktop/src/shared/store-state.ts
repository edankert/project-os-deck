/**
 * The state Deck keeps, and the pure reducer over it.
 *
 * The state lives once, in the main process, and every window subscribes.
 * The cockpit keeps the same kind of state in `localStorage`, read once when a
 * window starts and never re-read, which is why two cockpit windows never see
 * each other change. Keeping the reducer pure is what lets this be tested
 * without opening a window: the Electron part is transport.
 *
 * The desk lives here too. What is on it, and where each card sits, is state
 * rather than something to read back off the DOM when a person saves
 * (TASK-0024, TASK-0025).
 */
import type { Desk, DeskCard, DeckState, Filters } from './types.js';

export type DeckAction =
  | { type: 'open-workspace'; workspaceId: string }
  | { type: 'select-view'; viewId: string }
  | { type: 'focus-note'; noteId: string | null }
  | { type: 'open-desk'; name: string | null }
  | { type: 'save-desk'; name: string }
  | { type: 'delete-desk'; workspaceId: string; name: string }
  | { type: 'put-on-desk'; noteId: string; x: number; y: number }
  | { type: 'take-off-desk'; noteId: string }
  | { type: 'move-card'; noteId: string; x: number; y: number }
  | { type: 'clear-desk' }
  | { type: 'set-query'; text: string }
  | { type: 'set-filters'; filters: Filters }
  | { type: 'set-fold'; key: string; folded: boolean }
  | { type: 'restore'; state: DeckState };

/**
 * The actions a window may dispatch.
 *
 * `restore` is not among them: it replaces the whole state, saved desks
 * included, and belongs to the main process reading its own file. The channel
 * a window dispatches on is reachable from any page the window loads, so what
 * crosses it is named rather than assumed.
 */
const RENDERER_ACTIONS = new Set([
  'open-workspace',
  'select-view',
  'focus-note',
  'open-desk',
  'save-desk',
  'delete-desk',
  'put-on-desk',
  'take-off-desk',
  'move-card',
  'clear-desk',
  'set-query',
  'set-filters',
  'set-fold',
]);

export function isRendererAction(value: unknown): value is DeckAction {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && RENDERER_ACTIONS.has(type);
}

export function initialState(): DeckState {
  return {
    workspaceId: null,
    viewId: null,
    deskName: null,
    noteId: null,
    desks: {},
    deskCards: {},
    query: '',
    filters: { statuses: [], types: [] },
    folds: {},
    revision: 0,
    flowCursor: null,
  };
}

export function deskKey(workspaceId: string, name: string): string {
  return `${workspaceId}:${name}`;
}

/** What is on the desk for a workspace right now. */
export function deskCardsOf(state: DeckState, workspaceId: string | null): DeskCard[] {
  if (workspaceId === null) return [];
  return state.deskCards[workspaceId] ?? [];
}

export function isOnDesk(state: DeckState, workspaceId: string | null, noteId: string): boolean {
  return deskCardsOf(state, workspaceId).some((c) => c.noteId === noteId);
}

/**
 * Returns the SAME object when nothing changed, so a caller can skip a
 * broadcast by identity rather than by deep comparison.
 */
export function reduce(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'open-workspace': {
      if (state.workspaceId === action.workspaceId) return state;
      // A view, desk and note belong to the workspace they were chosen in. The
      // cards on the other workspace's desk stay where they are: they are
      // keyed by workspace and come back when that workspace does.
      return bump({
        ...state,
        workspaceId: action.workspaceId,
        viewId: null,
        deskName: null,
        noteId: null,
        query: '',
        filters: { statuses: [], types: [] },
      });
    }
    case 'select-view': {
      if (state.viewId === action.viewId) return state;
      // The desk is NOT touched. A desk holding notes from more than one view
      // is the point of choosing what goes on it (TASK-0024).
      //
      // The FILTERS are, and the query is not, which is a real distinction
      // rather than an oversight (ISS-0012). A search string is text a person
      // typed and can see in the box, so carrying it to the next view is
      // useful and never invisible. A filter's value comes from the view it
      // was set on: the Issues view offers `issue` and the Features view does
      // not, so the select for the new view has no option matching the stored
      // value, the DOM ignores the assignment, and the control reads "any
      // type" while the filter is still narrowing. The navigator then says
      // "0 of 30" with no control that explains it.
      return bump({ ...state, viewId: action.viewId, filters: { statuses: [], types: [] } });
    }
    case 'focus-note': {
      if (state.noteId === action.noteId) return state;
      return bump({ ...state, noteId: action.noteId });
    }
    case 'open-desk': {
      if (action.name === null) {
        if (state.deskName === null) return state;
        return bump({ ...state, deskName: null });
      }
      if (state.workspaceId === null) return state;
      const saved = state.desks[deskKey(state.workspaceId, action.name)];
      if (saved === undefined) return state;
      // Opening a desk brings back exactly what was saved under that name.
      return bump({
        ...state,
        deskName: action.name,
        deskCards: { ...state.deskCards, [state.workspaceId]: saved.cards.map(copyCard) },
      });
    }
    case 'save-desk': {
      if (state.workspaceId === null) return state;
      const desk: Desk = {
        name: action.name,
        workspaceId: state.workspaceId,
        cards: deskCardsOf(state, state.workspaceId).map(copyCard),
      };
      const desks = { ...state.desks, [deskKey(state.workspaceId, action.name)]: desk };
      return bump({ ...state, desks, deskName: action.name });
    }
    case 'delete-desk': {
      const key = deskKey(action.workspaceId, action.name);
      if (!(key in state.desks)) return state;
      const desks = { ...state.desks };
      delete desks[key];
      const deskName = state.deskName === action.name ? null : state.deskName;
      return bump({ ...state, desks, deskName });
    }
    case 'put-on-desk': {
      if (state.workspaceId === null) return state;
      const cards = deskCardsOf(state, state.workspaceId);
      if (cards.some((c) => c.noteId === action.noteId)) return state;
      const next = [...cards, { noteId: action.noteId, x: round(action.x), y: round(action.y) }];
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
    }
    case 'take-off-desk': {
      if (state.workspaceId === null) return state;
      const cards = deskCardsOf(state, state.workspaceId);
      const next = cards.filter((c) => c.noteId !== action.noteId);
      if (next.length === cards.length) return state;
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
    }
    case 'move-card': {
      if (state.workspaceId === null) return state;
      const cards = deskCardsOf(state, state.workspaceId);
      let moved = false;
      // One card moves. Every other card is the object it already was, which
      // is what makes "dragging one card moves no other" checkable.
      const next = cards.map((c) => {
        if (c.noteId !== action.noteId) return c;
        if (c.x === round(action.x) && c.y === round(action.y)) return c;
        moved = true;
        return { noteId: c.noteId, x: round(action.x), y: round(action.y) };
      });
      if (!moved) return state;
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
    }
    case 'clear-desk': {
      if (state.workspaceId === null) return state;
      if (deskCardsOf(state, state.workspaceId).length === 0) return state;
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: [] } });
    }
    case 'set-query': {
      const text = typeof action.text === 'string' ? action.text : '';
      if (state.query === text) return state;
      return bump({ ...state, query: text });
    }
    case 'set-filters': {
      const filters = normaliseFilters(action.filters);
      if (sameFilters(state.filters, filters)) return state;
      return bump({ ...state, filters });
    }
    case 'set-fold': {
      if (state.folds[action.key] === action.folded) return state;
      return bump({ ...state, folds: { ...state.folds, [action.key]: action.folded === true } });
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

function copyCard(card: DeskCard): DeskCard {
  return { noteId: card.noteId, x: card.x, y: card.y };
}

function round(value: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function sameFilters(a: Filters, b: Filters): boolean {
  return a.statuses.join(' ') === b.statuses.join(' ') && a.types.join(' ') === b.types.join(' ');
}

function normaliseFilters(value: unknown): Filters {
  const raw = (value ?? {}) as Record<string, unknown>;
  return { statuses: stringList(raw['statuses']), types: stringList(raw['types']) };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v !== '');
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
  const deskCards: Record<string, DeskCard[]> = {};
  const rawOpen = raw['deskCards'];
  if (typeof rawOpen === 'object' && rawOpen !== null) {
    for (const [key, cards] of Object.entries(rawOpen as Record<string, unknown>)) {
      deskCards[key] = normaliseCards(cards);
    }
  }
  const folds: Record<string, boolean> = {};
  const rawFolds = raw['folds'];
  if (typeof rawFolds === 'object' && rawFolds !== null) {
    for (const [key, folded] of Object.entries(rawFolds as Record<string, unknown>)) {
      if (typeof folded === 'boolean') folds[key] = folded;
    }
  }
  return {
    workspaceId: str(raw['workspaceId']),
    viewId: str(raw['viewId']),
    deskName: str(raw['deskName']),
    noteId: str(raw['noteId']),
    desks,
    deskCards,
    query: typeof raw['query'] === 'string' ? raw['query'] : '',
    filters: normaliseFilters(raw['filters']),
    folds,
    revision: typeof raw['revision'] === 'number' && Number.isFinite(raw['revision']) ? raw['revision'] : 0,
    // Always null, and deliberately not read back from the file: nothing
    // writes it, so there is nothing on disk that could be there honestly.
    // The slot exists so that a flow, when one is built, has somewhere to put
    // the one piece of state that is not in the record (TASK-0052).
    flowCursor: null,
  };
}

function normaliseCards(value: unknown): DeskCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) => {
    if (typeof c !== 'object' || c === null) return [];
    const card = c as Record<string, unknown>;
    const noteId = str(card['noteId']);
    if (noteId === null) return [];
    return [{ noteId, x: num(card['x']), y: num(card['y']) }];
  });
}

function normaliseDesk(value: unknown): Desk | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const name = str(raw['name']);
  const workspaceId = str(raw['workspaceId']);
  if (name === null || workspaceId === null) return null;
  return { name, workspaceId, cards: normaliseCards(raw['cards']) };
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
