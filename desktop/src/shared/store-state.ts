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
import type { Desk, DeskCard, DeckState, Filters, SessionState } from './types.js';
import { PANE_MAX_SIDE, PANE_MIN_HEIGHT, PANE_MIN_WIDTH } from './panes.js';

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
  | { type: 'set-actor'; actor: string }
  /** Draw the view as the field or as the desk (TASK-0033). */
  | { type: 'select-surface'; surface: string }
  /**
   * A hand brought a note into the front band, or sent it behind (TASK-0053).
   *
   * Neither beats owed: the band function refuses to move an owed note, and
   * the renderer refuses the gesture and says why before it is dispatched.
   * The reducer does not know which notes are owed — that is view data — so
   * it records what the hand did and the band rule decides what it means.
   */
  | { type: 'pull'; noteId: string }
  | { type: 'push'; noteId: string }
  /** Every pulled and pushed note in this workspace goes back where the record puts it. */
  | { type: 'let-go' }
  /** A pane's size, clamped to the minimum a body can be read at (TASK-0054). */
  | { type: 'resize-card'; noteId: string; w: number; h: number }
  /** A pane brought to the top of its stack, which is the end of the desk's list. */
  | { type: 'raise-card'; noteId: string }
  /** A pane moved to the reading column, or back out of it when `wide` is false. */
  | { type: 'widen-card'; noteId: string; wide: boolean }
  /**
   * The notes of a workspace changed on disk. Raised by the main process's
   * index, never by a window: a renderer cannot know what is on disk, and the
   * channel a window dispatches on is reachable from any page it loads.
   */
  | { type: 'index-changed'; workspaceId: string; revision: number }
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
  // A person changes the name their writes carry, so this crosses the window
  // channel. It names nobody but the person typing it.
  'set-actor',
  'select-surface',
  'pull',
  'push',
  'let-go',
  'resize-card',
  'raise-card',
  'widen-card',
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
    actor: '',
    revision: 0,
    indexRevisions: {},
    flowCursor: null,
    surface: DEFAULT_SURFACE,
    session: emptySession(),
  };
}

/** What Deck draws a view with when nobody chose: the field (ADR-0002). */
export const DEFAULT_SURFACE = 'glass';
/** The surfaces the store accepts. The address grammar's vocabulary names the same two. */
export const STORE_SURFACES: readonly string[] = ['glass', 'spread', 'list', 'orbit'];

export function emptySession(): SessionState {
  return { pulled: {}, pushed: {} };
}

/** The notes a hand pulled into the front band in this workspace. */
export function pulledIn(state: DeckState, workspaceId: string | null): string[] {
  if (workspaceId === null) return [];
  return state.session.pulled[workspaceId] ?? [];
}

/** The notes a hand pushed behind the person in this workspace. */
export function pushedIn(state: DeckState, workspaceId: string | null): string[] {
  if (workspaceId === null) return [];
  return state.session.pushed[workspaceId] ?? [];
}

/**
 * The state as it is written to disk: everything but the session part.
 *
 * Where a person's hands were today is not what they reopen tomorrow (the
 * DES-0002 review's rule, applied by TASK-0053). The persister calls this, so
 * the rule lives beside the reducer and is tested without a file.
 */
export function persistable(state: DeckState): Omit<DeckState, 'session'> {
  const { session: _dropped, ...kept } = state;
  return kept;
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
        return { ...copyCard(c), x: round(action.x), y: round(action.y) };
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
    case 'set-actor': {
      const actor = typeof action.actor === 'string' ? action.actor.trim() : '';
      if (actor === '' || state.actor === actor) return state;
      return bump({ ...state, actor });
    }
    case 'select-surface': {
      if (!STORE_SURFACES.includes(action.surface)) return state;
      if (state.surface === action.surface) return state;
      return bump({ ...state, surface: action.surface });
    }
    case 'pull':
    case 'push': {
      if (state.workspaceId === null || typeof action.noteId !== 'string' || action.noteId === '') return state;
      const ws = state.workspaceId;
      const into = action.type === 'pull' ? 'pulled' : 'pushed';
      const outOf = action.type === 'pull' ? 'pushed' : 'pulled';
      const target = state.session[into][ws] ?? [];
      if (target.includes(action.noteId)) return state;
      // A note is pulled or pushed, never both: the later gesture wins.
      const other = (state.session[outOf][ws] ?? []).filter((id) => id !== action.noteId);
      return bump({
        ...state,
        session: {
          ...state.session,
          [into]: { ...state.session[into], [ws]: [...target, action.noteId] },
          [outOf]: { ...state.session[outOf], [ws]: other },
        } as SessionState,
      });
    }
    case 'let-go': {
      if (state.workspaceId === null) return state;
      const ws = state.workspaceId;
      if ((state.session.pulled[ws] ?? []).length === 0 && (state.session.pushed[ws] ?? []).length === 0) return state;
      return bump({
        ...state,
        session: {
          pulled: { ...state.session.pulled, [ws]: [] },
          pushed: { ...state.session.pushed, [ws]: [] },
        },
      });
    }
    case 'resize-card': {
      if (state.workspaceId === null) return state;
      const w = clampSide(action.w, PANE_MIN_WIDTH);
      const h = clampSide(action.h, PANE_MIN_HEIGHT);
      return updateCard(state, action.noteId, (c) => (c.w === w && c.h === h ? c : { ...c, w, h }));
    }
    case 'raise-card': {
      if (state.workspaceId === null) return state;
      const cards = deskCardsOf(state, state.workspaceId);
      const at = cards.findIndex((c) => c.noteId === action.noteId);
      // Already on top, or not on the desk: nothing to raise.
      if (at === -1 || at === cards.length - 1) return state;
      const next = [...cards.slice(0, at), ...cards.slice(at + 1), cards[at] as DeskCard];
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
    }
    case 'widen-card': {
      if (state.workspaceId === null) return state;
      const cards = deskCardsOf(state, state.workspaceId);
      if (!cards.some((c) => c.noteId === action.noteId)) return state;
      let changed = false;
      // One reading column: widening a pane takes it out of every other.
      const next = cards.map((c) => {
        const wide = c.noteId === action.noteId ? action.wide === true : false;
        if ((c.wide === true) === wide) return c;
        changed = true;
        const copy: DeskCard = { ...c };
        if (wide) copy.wide = true;
        else delete copy.wide;
        return copy;
      });
      if (!changed) return state;
      return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
    }
    case 'index-changed': {
      const current = state.indexRevisions[action.workspaceId] ?? 0;
      // Never backwards. A late broadcast from an index that has already been
      // replaced would otherwise tell a window its picture is newer than it is.
      if (action.revision <= current) return state;
      return bump({
        ...state,
        indexRevisions: { ...state.indexRevisions, [action.workspaceId]: action.revision },
      });
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
  const copy: DeskCard = { noteId: card.noteId, x: card.x, y: card.y };
  if (card.w !== undefined) copy.w = card.w;
  if (card.h !== undefined) copy.h = card.h;
  if (card.wide === true) copy.wide = true;
  return copy;
}

/** One card on the current workspace's desk changed, and nothing else did. */
function updateCard(state: DeckState, noteId: string, change: (card: DeskCard) => DeskCard): DeckState {
  if (state.workspaceId === null) return state;
  const cards = deskCardsOf(state, state.workspaceId);
  let changed = false;
  const next = cards.map((c) => {
    if (c.noteId !== noteId) return c;
    const updated = change(c);
    if (updated !== c) changed = true;
    return updated;
  });
  if (!changed) return state;
  return bump({ ...state, deskCards: { ...state.deskCards, [state.workspaceId]: next } });
}

function clampSide(value: number, minimum: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : minimum;
  return Math.min(PANE_MAX_SIDE, Math.max(minimum, n));
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
    actor: typeof raw['actor'] === 'string' ? raw['actor'] : '',
    revision: typeof raw['revision'] === 'number' && Number.isFinite(raw['revision']) ? raw['revision'] : 0,
    // Not read back from the file. The index is rebuilt from disk at every
    // start, so a number carried over from the last run is one this run's
    // index cannot honour, and a window comparing against it would think its
    // picture was old when it was the newest there is.
    indexRevisions: {},
    // Always null, and deliberately not read back from the file: nothing
    // writes it, so there is nothing on disk that could be there honestly.
    // The slot exists so that a flow, when one is built, has somewhere to put
    // the one piece of state that is not in the record (TASK-0052).
    flowCursor: null,
    surface: typeof raw['surface'] === 'string' && STORE_SURFACES.includes(raw['surface']) ? raw['surface'] : DEFAULT_SURFACE,
    // Never read back from the file, and never written to it either
    // (`persistable`). A restart starts with nothing pulled and nothing pushed.
    session: emptySession(),
  };
}

function normaliseCards(value: unknown): DeskCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) => {
    if (typeof c !== 'object' || c === null) return [];
    const card = c as Record<string, unknown>;
    const noteId = str(card['noteId']);
    if (noteId === null) return [];
    const out: DeskCard = { noteId, x: num(card['x']), y: num(card['y']) };
    // A size is kept only when it is a real one; anything else is a pane
    // nobody resized, which is what a desk saved before panes existed holds.
    if (typeof card['w'] === 'number' && Number.isFinite(card['w'])) out.w = clampSide(card['w'], PANE_MIN_WIDTH);
    if (typeof card['h'] === 'number' && Number.isFinite(card['h'])) out.h = clampSide(card['h'], PANE_MIN_HEIGHT);
    if (card['wide'] === true) out.wide = true;
    return [out];
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
