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
  | { type: 'open-desk'; name: string | null; viewId?: string }
  | { type: 'save-desk'; name: string; viewId?: string }
  | { type: 'delete-desk'; workspaceId: string; name: string }
  | { type: 'put-on-desk'; noteId: string; x: number; y: number; viewId?: string }
  | { type: 'take-off-desk'; noteId: string; viewId?: string }
  | { type: 'move-card'; noteId: string; x: number; y: number; viewId?: string }
  /**
   * Take the view's own notes off its desk. The notes on every view stay
   * (FEAT-0015, decision 9). `scope: 'workspace'` empties every view's desk
   * and the notes on every view too: the smoke run and the measurement start
   * from it, and no window sends it.
   */
  | { type: 'clear-desk'; viewId?: string; scope?: 'view' | 'workspace' }
  /** Keep a held note on every view of its workspace, or give it back to one (TASK-0059). */
  | { type: 'set-every-view'; noteId: string; on: boolean; viewId?: string }
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
  | { type: 'resize-card'; noteId: string; w: number; h: number; viewId?: string }
  /** A pane brought to the top of its stack, which is the end of the desk's list. */
  | { type: 'raise-card'; noteId: string; viewId?: string }
  /** A pane moved to the reading column, or back out of it when `wide` is false. */
  | { type: 'widen-card'; noteId: string; wide: boolean; viewId?: string }
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
  'set-every-view',
]);

/**
 * The actions that change a desk, and so name the view whose desk they
 * change (FEAT-0015). A window adds the view it draws before it dispatches.
 */
export const DESK_ACTIONS: ReadonlySet<string> = new Set([
  'open-desk',
  'save-desk',
  'put-on-desk',
  'take-off-desk',
  'move-card',
  'clear-desk',
  'resize-card',
  'raise-card',
  'widen-card',
  'set-every-view',
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
    viewDesks: {},
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

/** The notes held on every view of a workspace (FEAT-0015). */
export function everyViewCardsOf(state: DeckState, workspaceId: string | null): DeskCard[] {
  if (workspaceId === null) return [];
  return state.deskCards[workspaceId] ?? [];
}

/** One view's own held notes, without the notes on every view. */
export function viewCardsOf(state: DeckState, workspaceId: string | null, viewId: string | null): DeskCard[] {
  if (workspaceId === null || viewId === null) return [];
  return state.viewDesks[workspaceId]?.[viewId] ?? [];
}

/** Whether a held note is on every view of its workspace. */
export function isOnEveryView(state: DeckState, workspaceId: string | null, noteId: string): boolean {
  return everyViewCardsOf(state, workspaceId).some((c) => c.noteId === noteId);
}

/** The view whose desk a state draws: the Mac's on a served page, else the chosen one. */
export function deskViewOf(state: DeckState): string | null {
  return state.deskView !== undefined && state.deskView !== null ? state.deskView : state.viewId;
}

/**
 * The desk drawn for a view: the notes on every view, then the view's own,
 * in stacking order, top last (FEAT-0015). A card with no stacking number
 * counts as 0 and ties keep list order, so a desk written before this draws
 * exactly as it did.
 */
export function deskCardsOf(state: DeckState, workspaceId: string | null, viewId: string | null = deskViewOf(state)): DeskCard[] {
  if (workspaceId === null) return [];
  const every = everyViewCardsOf(state, workspaceId);
  const own = viewCardsOf(state, workspaceId, viewId);
  if (own.length === 0 && !every.some((c) => c.z !== undefined)) return every;
  const all = [...every, ...own];
  if (!all.some((c) => c.z !== undefined)) return all;
  return all
    .map((card, i) => ({ card, i }))
    .sort((a, b) => (a.card.z ?? 0) - (b.card.z ?? 0) || a.i - b.i)
    .map((x) => x.card);
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
        // A workspace opens in Glass (ADR-0002); an address that names a
        // surface is followed after the workspace is open (ISS-0060).
        surface: DEFAULT_SURFACE,
      });
    }
    case 'select-view': {
      if (state.viewId === action.viewId) return state;
      // No card moves, and yet the desk on screen changes: each view has its
      // own desk, and `deskCardsOf` reads the new view's (FEAT-0015). Until
      // 2026-09-11 a view switch left one shared desk alone, because "a desk
      // holding notes from more than one view is the point" (TASK-0024).
      // Edwin asked for a desk per view that day; a note marked "on every
      // view" is what still crosses views. The open desk's NAME is cleared,
      // because the desk now on screen is not the one opened under it.
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
      return bump({ ...state, viewId: action.viewId, deskName: null, filters: { statuses: [], types: [] } });
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
      const ws = state.workspaceId;
      const view = viewOf(state, action);
      if (view === null) return state;
      const saved = state.desks[deskKey(ws, action.name)];
      if (saved === undefined) return state;
      // Opening a desk brings back what was saved under that name, as the
      // view's own notes, in the saved stacking order. A note on every view
      // stays where it is, and so do the notes on every view the saved desk
      // did not hold (FEAT-0015, decision 11).
      const every = everyViewCardsOf(state, ws);
      const base = topZ(every) + 1;
      const own = saved.cards
        .filter((c) => !every.some((e) => e.noteId === c.noteId))
        .map((c, i) => ({ ...plainCard(c), z: base + i }));
      return withDesk({ ...state, deskName: action.name }, ws, view, null, own);
    }
    case 'save-desk': {
      if (state.workspaceId === null) return state;
      // What the view draws, both lists, flat and in stacking order: the
      // `Desk` shape is unchanged, so every saved desk still reads.
      const desk: Desk = {
        name: action.name,
        workspaceId: state.workspaceId,
        cards: deskCardsOf(state, state.workspaceId, viewOf(state, action)).map(plainCard),
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
      const ws = state.workspaceId;
      // With no view chosen there is no desk to put it on, and guessing one
      // would hide the note on a view nobody is looking at (decision 12).
      const view = viewOf(state, action);
      if (view === null) return state;
      const drawn = deskCardsOf(state, ws, view);
      if (drawn.some((c) => c.noteId === action.noteId)) return state;
      const card: DeskCard = { noteId: action.noteId, x: round(action.x), y: round(action.y), z: topZ(drawn) + 1 };
      return withDesk(state, ws, view, null, [...viewCardsOf(state, ws, view), card]);
    }
    case 'take-off-desk': {
      if (state.workspaceId === null) return state;
      const ws = state.workspaceId;
      // A note on every view is one note: taking it off takes it off every view.
      const every = everyViewCardsOf(state, ws);
      if (every.some((c) => c.noteId === action.noteId)) {
        return withDesk(state, ws, null, every.filter((c) => c.noteId !== action.noteId), null);
      }
      const view = viewOf(state, action);
      const own = viewCardsOf(state, ws, view);
      const next = own.filter((c) => c.noteId !== action.noteId);
      if (next.length === own.length) return state;
      return withDesk(state, ws, view, null, next);
    }
    case 'move-card': {
      // One card moves. Every other card is the object it already was, which
      // is what makes "dragging one card moves no other" checkable.
      return updateCard(state, viewOf(state, action), action.noteId, (c) =>
        c.x === round(action.x) && c.y === round(action.y) ? c : { ...c, x: round(action.x), y: round(action.y) },
      );
    }
    case 'clear-desk': {
      if (state.workspaceId === null) return state;
      const ws = state.workspaceId;
      if (action.scope === 'workspace') {
        const views = state.viewDesks[ws] ?? {};
        const any = everyViewCardsOf(state, ws).length > 0 || Object.values(views).some((cards) => cards.length > 0);
        if (!any) return state;
        return bump({ ...state, deskCards: { ...state.deskCards, [ws]: [] }, viewDesks: { ...state.viewDesks, [ws]: {} } });
      }
      const view = viewOf(state, action);
      if (viewCardsOf(state, ws, view).length === 0) return state;
      return withDesk(state, ws, view, null, []);
    }
    case 'set-every-view': {
      if (state.workspaceId === null || typeof action.noteId !== 'string') return state;
      const ws = state.workspaceId;
      const view = viewOf(state, action);
      const every = everyViewCardsOf(state, ws);
      const already = every.find((c) => c.noteId === action.noteId);
      if (action.on === true) {
        if (already !== undefined) return state;
        const card = viewCardsOf(state, ws, view).find((c) => c.noteId === action.noteId);
        if (card === undefined) return state;
        // Moved to the workspace's list at the same place, size and height in
        // the stack, and taken out of every view's own list, so no view draws
        // it twice (decision 6). In the reading column it takes every other
        // card in the workspace out of it, as widening it there would.
        const unwide = card.wide === true;
        const views: Record<string, DeskCard[]> = {};
        for (const [id, cards] of Object.entries(state.viewDesks[ws] ?? {})) {
          const kept = cards.filter((c) => c.noteId !== action.noteId);
          views[id] = unwide ? kept.map(narrow) : kept;
        }
        const nextEvery = [...(unwide ? every.map(narrow) : every), card];
        return bump({ ...state, deskCards: { ...state.deskCards, [ws]: nextEvery }, viewDesks: { ...state.viewDesks, [ws]: views } });
      }
      if (already === undefined || view === null) return state;
      // Given back to the view it was unmarked on, and gone from the others.
      return withDesk(
        state,
        ws,
        view,
        every.filter((c) => c.noteId !== action.noteId),
        [...viewCardsOf(state, ws, view), already],
      );
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
      const w = clampSide(action.w, PANE_MIN_WIDTH);
      const h = clampSide(action.h, PANE_MIN_HEIGHT);
      return updateCard(state, viewOf(state, action), action.noteId, (c) => (c.w === w && c.h === h ? c : { ...c, w, h }));
    }
    case 'raise-card': {
      if (state.workspaceId === null) return state;
      const view = viewOf(state, action);
      const drawn = deskCardsOf(state, state.workspaceId, view);
      const at = drawn.findIndex((c) => c.noteId === action.noteId);
      // Already on top, or not on the desk: nothing to raise. Otherwise it is
      // given the highest place in the stack of the desk drawn, whichever of
      // the two lists holds it (decision 8).
      if (at === -1 || at === drawn.length - 1) return state;
      const z = topZ(drawn) + 1;
      return updateCard(state, view, action.noteId, (c) => ({ ...c, z }));
    }
    case 'widen-card': {
      if (state.workspaceId === null) return state;
      const ws = state.workspaceId;
      const view = viewOf(state, action);
      if (!deskCardsOf(state, ws, view).some((c) => c.noteId === action.noteId)) return state;
      if (action.wide !== true) return updateCard(state, view, action.noteId, narrow);
      // One reading column per drawn desk (decision 10). Widening a note on
      // every view takes every other card in the workspace out of it, on every
      // view; widening a view's own note takes out that view's others and the
      // notes on every view.
      const widen = (c: DeskCard): DeskCard => (c.noteId === action.noteId ? (c.wide === true ? c : { ...c, wide: true }) : narrow(c));
      const every = everyViewCardsOf(state, ws);
      const nextEvery = every.map(widen);
      if (every.some((c) => c.noteId === action.noteId)) {
        const views: Record<string, DeskCard[]> = {};
        for (const [id, cards] of Object.entries(state.viewDesks[ws] ?? {})) views[id] = cards.map(narrow);
        if (sameCards(every, nextEvery) && Object.entries(views).every(([id, cards]) => sameCards(state.viewDesks[ws]?.[id] ?? [], cards))) return state;
        return bump({ ...state, deskCards: { ...state.deskCards, [ws]: nextEvery }, viewDesks: { ...state.viewDesks, [ws]: views } });
      }
      const own = viewCardsOf(state, ws, view);
      const nextOwn = own.map(widen);
      if (sameCards(every, nextEvery) && sameCards(own, nextOwn)) return state;
      return withDesk(state, ws, view, nextEvery, nextOwn);
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

/** A card as a saved desk keeps it: place, size and column, not its height in a stack. */
function plainCard(card: DeskCard): DeskCard {
  const copy: DeskCard = { noteId: card.noteId, x: card.x, y: card.y };
  if (card.w !== undefined) copy.w = card.w;
  if (card.h !== undefined) copy.h = card.h;
  if (card.wide === true) copy.wide = true;
  return copy;
}

/** The view a desk action is for: the one it names, or the store's current one. */
function viewOf(state: DeckState, action: { viewId?: string }): string | null {
  return typeof action.viewId === 'string' && action.viewId !== '' ? action.viewId : state.viewId;
}

/** The highest stacking number on a desk, a card without one counting as 0. */
function topZ(cards: readonly DeskCard[]): number {
  return cards.reduce((top, c) => Math.max(top, c.z ?? 0), 0);
}

/** A card taken out of the reading column, or the same card if it was not in it. */
function narrow(card: DeskCard): DeskCard {
  if (card.wide !== true) return card;
  const copy: DeskCard = { ...card };
  delete copy.wide;
  return copy;
}

function sameCards(a: readonly DeskCard[], b: readonly DeskCard[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

/** A workspace's two lists written back; a null list is left as it was. */
function withDesk(state: DeckState, ws: string, view: string | null, every: DeskCard[] | null, own: DeskCard[] | null): DeckState {
  const next: DeckState = { ...state };
  if (every !== null) next.deskCards = { ...state.deskCards, [ws]: every };
  if (own !== null && view !== null) next.viewDesks = { ...state.viewDesks, [ws]: { ...(state.viewDesks[ws] ?? {}), [view]: own } };
  return bump(next);
}

/**
 * One card on the drawn desk changed, and nothing else did: found in the
 * notes on every view or in the view's own, and written back where it was.
 */
function updateCard(state: DeckState, view: string | null, noteId: string, change: (card: DeskCard) => DeskCard): DeckState {
  if (state.workspaceId === null) return state;
  const ws = state.workspaceId;
  const apply = (cards: DeskCard[]): DeskCard[] | null => {
    let changed = false;
    const next = cards.map((c) => {
      if (c.noteId !== noteId) return c;
      const updated = change(c);
      if (updated !== c) changed = true;
      return updated;
    });
    return changed ? next : null;
  };
  const every = everyViewCardsOf(state, ws);
  if (every.some((c) => c.noteId === noteId)) {
    const next = apply(every);
    return next === null ? state : withDesk(state, ws, null, next, null);
  }
  const next = apply(viewCardsOf(state, ws, view));
  return next === null ? state : withDesk(state, ws, view, null, next);
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
  // Each view's own notes (FEAT-0015). Read tolerantly: a missing key, a
  // non-object or a list of junk is an empty desk, never a Deck that will not
  // open. A file written before desks per view has none, and every note it
  // held is in `deskCards`, on every view, as it was.
  const viewDesks: Record<string, Record<string, DeskCard[]>> = {};
  const rawViews = raw['viewDesks'];
  if (typeof rawViews === 'object' && rawViews !== null) {
    for (const [ws, views] of Object.entries(rawViews as Record<string, unknown>)) {
      if (typeof views !== 'object' || views === null || Array.isArray(views)) continue;
      const out: Record<string, DeskCard[]> = {};
      for (const [view, cards] of Object.entries(views as Record<string, unknown>)) out[view] = normaliseCards(cards);
      viewDesks[ws] = out;
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
    viewDesks,
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
    // Not read back from the file: the surface is where a person was looking,
    // like the yaw, and Deck opens in Glass unless an address asks otherwise
    // (ADR-0002). Carrying it over reopened Deck in Spread with no address
    // asking for it (ISS-0060).
    surface: DEFAULT_SURFACE,
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
    if (typeof card['z'] === 'number' && Number.isFinite(card['z'])) out.z = Math.round(card['z']);
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
