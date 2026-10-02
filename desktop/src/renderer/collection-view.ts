/**
 * The collection on the Glass desk: the view's derived list as an object a
 * person can move, resize and collapse, standing on the same surface as the
 * field and the documents (FEAT-0020, TASK-0096; ADR-0006).
 *
 * Until now the list was a fixed 264-pixel column beside the field. The list
 * itself is unchanged: the same `#navigator` element, with its search, its
 * filters, its groups, its rows and its keyboard, is MOVED into this object
 * while Glass is on screen and moved back for Spread and List. So nothing
 * about what a row is or does was written twice. What this file adds is the
 * object round it: a header that names the query and its exact count, a place
 * and a size the store keeps per view, and a collapse to the header alone.
 *
 * The collection is a desk object like a document. It is drawn at its stored
 * place plus the desk's own movement, which the field hands it every frame,
 * and it takes its own wheel, drag and keys: a wheel over the list scrolls the
 * list and never the field (DES-0003's input contract).
 */
import {
  COLLECTION_HEAD_HEIGHT,
  COLLECTION_MIN_HEIGHT,
  COLLECTION_MIN_WIDTH,
  type AnchorRow,
  type CollectionLayout,
  type CollectionSummary,
  type OwnFold,
  type ScrollAnchor,
  type CardGrid,
  type Presentation,
  anchorAt,
  anchorsFrom,
  cardGrid,
  countText,
  defaultCollectionLayout,
  fitCollection,
  foldShown,
  gridText,
  headKeysText,
  rowOfMember,
  scrollTopFor,
  scrollTopForFirst,
} from '../shared/collection.js';
import { type Point, type Rect, SEAT } from '../shared/focus-ring.js';
import type { CardModel } from '../shared/types.js';
import { NARROW_BAR_HEIGHT } from '../shared/panes.js';

export interface CollectionHooks {
  /** Only the shell arranges the desk; a served page draws the collection where the Mac put it. */
  canArrange(): boolean;
  /** What the store holds for the view on screen, or null for the default. */
  stored(): CollectionLayout | null;
  /** Tell the store where the collection stands now. */
  store(layout: CollectionLayout): void;
  /** The collection was pressed: it comes above the documents until one of them is. */
  raised(): void;
  /** The announced change was accepted. */
  applyChange(): void;
  /** Every filter and the search text are cleared. */
  clearFilters(): void;
  /** The view is read again after it failed to load. */
  retry(): void;
  /** The cards the collection shows have changed: the field draws again. */
  seatsChanged(): void;
  /** A member that is open or gathered elsewhere was asked for from its reference: bring it into view. */
  locate(noteId: string): void;
}

/** What the collection says about itself. Everything here is derived; none of it is kept. */
export interface CollectionModel {
  /** The query's name: the view's label. */
  name: string;
  summary: CollectionSummary;
  /** What narrows the list, in words, or ''. */
  filter: string;
  /** A refreshed result waiting to be applied, in words, or ''. */
  change: string;
  /** The selected note left the result: what to say about it, or null. */
  removed: string | null;
  state: 'loading' | 'ready' | 'error';
  /** What went wrong, when the view could not be read. */
  error: string;
  /**
   * The notes the list shows, each once, in the list's order: the same ids
   * the count counts. The Cards presentation draws these and no others.
   */
  members: readonly string[];
  /** A member's card. */
  cardOf(noteId: string): CardModel | null;
}

export interface CollectionElements {
  root: HTMLElement;
  head: HTMLElement;
  name: HTMLElement;
  count: HTMLElement;
  filter: HTMLElement;
  fold: HTMLButtonElement;
  asTable: HTMLButtonElement;
  asCards: HTMLButtonElement;
  /** Where the members stand as cards, in the Cards presentation. */
  grid: HTMLElement;
  note: HTMLElement;
  places: HTMLElement;
  body: HTMLElement;
  resize: HTMLElement;
  /** The list itself, which lives beside the field outside Glass. */
  navigator: HTMLElement;
  /** Where the navigator stands outside Glass: the element it is put back before. */
  home: { parent: HTMLElement; before: Element | null };
  list: HTMLElement;
  state: HTMLElement;
}

/** How far a pointer moves before a press on the header is a drag. */
const SLOP_PX = 5;
/** The collection stands under every document unless it was the last thing pressed. */
/** The space after the list's last row (deck.css, `.nav-list`). */
const LIST_END_SPACE = 12;
/** The gap between two of the collection's cards, and between a card and the collection's edge. */
const GRID_GAP = 10;
/** How far the wheel turns for the cards to move by one row. */
const GRID_WHEEL_ROW = 50;
/** How long after the pointer leaves the list it still counts as resting there. */
const POINTER_GRACE_MS = 800;
const Z_UNDER = 2990;
const Z_OVER = 3990;

export class CollectionView {
  private readonly el: CollectionElements;
  private readonly hooks: CollectionHooks;
  private active = false;
  private field = { width: 800, height: 600 };
  private shift = { x: 0, y: 0, opacity: 1, visible: true };
  /** A drag or a resize in progress, drawn before the store hears of it. */
  private live: CollectionLayout | null = null;
  /** The fold a person chose on a page that cannot arrange: that page's own, and the store is not told. */
  private ownFold: OwnFold | null = null;
  private onTop = false;
  /** The pointer's height on screen while it is over the list, else null. */
  private pointerY: number | null = null;
  /** When the pointer left the list, while `pointerY` is still kept for the grace. */
  private leftAt: number | null = null;
  /** The row the list was scrolled to when it was collapsed, by the note it is for. */
  private anchor: ScrollAnchor | null = null;
  /** In a narrow field: whether the collection is the one object in front, or out of the way. */
  private narrow: 'front' | 'back' | null = null;
  private model: CollectionModel | null = null;
  /** The row of cards at the top of the Cards presentation. Session state: where a person scrolled to. */
  private firstRow = 0;
  /** The note whose card the grid opens at, once it is laid out: the row the table was on. */
  private openAt: string | null = null;
  private wheelLeft = 0;
  /** Where the collection is drawn in the field, from the last `place`. */
  private drawnAt = { x: 0, y: 0 };
  /** The grid's area inside the collection, measured when its size changes and not on every frame. */
  private gridArea: { key: string; left: number; top: number; width: number; height: number } | null = null;
  private lastGrid: CardGrid | null = null;
  private refs = '';
  private placesText = '';

  constructor(el: CollectionElements, hooks: CollectionHooks) {
    this.el = el;
    this.hooks = hooks;
    this.wire();
  }

  /** Glass is on screen, or it is not: the list moves into the collection, or back beside the desk. */
  setActive(on: boolean): void {
    if (this.active === on) return;
    this.active = on;
    this.el.root.hidden = !on;
    if (on) this.el.body.appendChild(this.el.navigator);
    else this.el.home.parent.insertBefore(this.el.navigator, this.el.home.before);
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * The layout the collection is drawn with: a drag in progress, else the
   * store's, else the default; fitted to the field. Folded or open as this
   * page chose, on a page that keeps its own fold.
   */
  layout(): CollectionLayout {
    const base = this.live ?? this.hooks.stored() ?? defaultCollectionLayout(this.field);
    return fitCollection(this.ownFold === null ? base : { ...base, collapsed: this.folded(base.collapsed) }, this.field);
  }

  /** Whether the collection is drawn collapsed, given the store's fold: as this page chose, while its choice stands. */
  private folded(stored: boolean): boolean {
    // The Mac folded or opened the list since this page chose. Its fold is
    // followed again, and the page's choice is over: it does not come back
    // when the Mac's fold returns to what it was.
    if (this.ownFold !== null && this.ownFold.stored !== stored) this.ownFold = null;
    return foldShown(stored, this.ownFold);
  }

  /**
   * Where the collection stands ON THE DESK, for whatever else is laid out
   * round it: a document is opened beside it and no card is seated under it.
   * Null when it is not on screen.
   */
  rect(): Rect | null {
    if (!this.active || this.narrow === 'back') return null;
    const l = this.layout();
    return { left: l.x, top: l.y, width: l.w, height: l.collapsed ? COLLECTION_HEAD_HEIGHT : l.h };
  }

  /**
   * Draw the collection where it stands now. Called on every frame of a turn,
   * so it sets a position and nothing else.
   */
  place(field: { width: number; height: number }, shift: { x: number; y: number; opacity: number; visible: boolean }, narrow: 'front' | 'back' | null): void {
    this.field = field;
    this.shift = shift;
    this.narrow = narrow;
    if (!this.active) return;
    const root = this.el.root;
    root.classList.toggle('out-of-sight', !shift.visible || narrow === 'back');
    root.classList.toggle('narrow', narrow !== null);
    if (narrow !== null) {
      // One object in front, filling the field: a narrow window does not
      // shrink the list to share the space (DES-0003). Nothing is stored.
      this.drawnAt = { x: 0, y: NARROW_BAR_HEIGHT };
      root.style.left = '0px';
      root.style.top = `${NARROW_BAR_HEIGHT}px`;
      root.style.width = `${field.width}px`;
      root.style.height = `${Math.max(0, field.height - NARROW_BAR_HEIGHT)}px`;
      root.style.setProperty('--veil', '0');
      root.style.zIndex = String(Z_OVER);
      root.classList.remove('collapsed');
      return;
    }
    const l = this.layout();
    this.drawnAt = { x: l.x + shift.x, y: l.y + shift.y };
    root.style.left = `${l.x + shift.x}px`;
    root.style.top = `${l.y + shift.y}px`;
    root.style.width = `${l.w}px`;
    root.style.height = `${l.collapsed ? COLLECTION_HEAD_HEIGHT : l.h}px`;
    // Dimmed toward the edge of sight by a veil, never see-through (glass.ts, placePanes).
    root.style.setProperty('--veil', String(1 - shift.opacity));
    root.style.zIndex = String(this.onTop ? Z_OVER : Z_UNDER);
    root.classList.toggle('collapsed', l.collapsed);
  }

  /** A document was pressed or opened: it is above the collection again. */
  lower(): void {
    if (!this.onTop) return;
    this.onTop = false;
    this.el.root.style.zIndex = String(Z_UNDER);
    this.hooks.raised();
  }

  /** What the header and the lines under it say. */
  paint(model: CollectionModel): void {
    this.model = model;
    const { el } = this;
    const l = this.layout();
    el.name.textContent = model.name;
    el.count.textContent = countText(model.summary);
    el.filter.textContent = model.filter === '' ? '' : `narrowed: ${model.filter}`;
    el.filter.hidden = model.filter === '';
    el.root.setAttribute('aria-label', `${model.name}: ${countText(model.summary)}${model.filter === '' ? '' : `, narrowed to ${model.filter}`}`);
    // The label names the keys that work here and no others: a served page
    // said "arrow keys move it" of a collection it cannot move.
    const keys = headKeysText({ canArrange: this.hooks.canArrange(), narrow: this.narrow !== null, collapsed: l.collapsed });
    el.head.setAttribute(
      'aria-label',
      `${model.name}, ${countText(model.summary)}${model.filter === '' ? '' : `, narrowed to ${model.filter}`}${keys === '' ? '' : `: ${keys}`}`,
    );
    const collapsed = l.collapsed && this.narrow === null;
    el.fold.setAttribute('aria-expanded', String(!collapsed));
    el.fold.textContent = collapsed ? '▸' : '▾';
    el.fold.title = collapsed ? 'Open the list again (Enter)' : 'Collapse to the header (Enter)';
    el.fold.setAttribute('aria-label', collapsed ? `Open ${model.name} again` : `Collapse ${model.name} to its header`);
    el.fold.hidden = this.narrow !== null;
    // The same members three ways. Which one is on is said by the buttons,
    // and the count beside the name is the same in all three.
    const cards = this.showsCards();
    el.root.classList.toggle('cards', cards);
    el.grid.hidden = !cards;
    el.asTable.setAttribute('aria-pressed', String(!collapsed && l.presentation === 'table'));
    el.asCards.setAttribute('aria-pressed', String(!collapsed && l.presentation === 'cards'));
    el.asTable.setAttribute('aria-label', `Show ${model.name} as the list of all ${model.summary.shown} notes`);
    el.asCards.setAttribute('aria-label', `Show ${model.name} as cards`);
    el.asTable.hidden = !this.hooks.canArrange();
    el.asCards.hidden = !this.hooks.canArrange();
    el.grid.setAttribute('aria-label', `${model.name} as cards: Page Down and Page Up show more, Home and End go to the first and the last`);
    this.gridArea = null;
    // What is waiting to be applied, and what happened to the selection.
    const lines: Array<{ text: string; action?: { label: string; run: () => void } }> = [];
    if (model.change !== '') lines.push({ text: model.change, action: { label: 'apply', run: () => this.hooks.applyChange() } });
    if (model.removed !== null) lines.push({ text: model.removed });
    this.paintLines(el.note, lines);
    // Where the members are: the list reaches every one, the field only some.
    const s = model.summary;
    this.placesText = model.state !== 'ready' || s.shown === 0
      ? ''
      : s.listOnly === 0
        ? `all ${s.shown} have a place in the field`
        : `${s.inField} have a place in the field · ${s.listOnly} are in this list only`;
    // As cards, the line says which members are drawn and how to reach the rest (`seats`).
    if (!cards) {
      el.places.textContent = this.placesText;
      el.places.hidden = this.placesText === '';
    }
    // Waiting, failed and empty are three different things, and each says which.
    const state: Array<{ text: string; action?: { label: string; run: () => void } }> = [];
    if (model.state === 'loading') state.push({ text: `Reading ${model.name}…` });
    else if (model.state === 'error') state.push({ text: `${model.name} could not be read: ${model.error}`, action: { label: 'retry', run: () => this.hooks.retry() } });
    else if (s.shown === 0 && s.narrowed) state.push({ text: `No note in ${model.name} matches ${model.filter}. It holds ${s.total}.`, action: { label: 'clear filters', run: () => this.hooks.clearFilters() } });
    else if (s.total === 0) state.push({ text: `${model.name} holds no notes.` });
    this.paintLines(el.state, state);
    el.state.dataset['state'] = model.state === 'ready' ? (s.shown === 0 ? 'empty' : 'ready') : model.state;
    el.list.setAttribute('aria-busy', String(model.state === 'loading'));
    this.place(this.field, this.shift, this.narrow);
  }

  private paintLines(into: HTMLElement, lines: Array<{ text: string; action?: { label: string; run: () => void } }>): void {
    const signature = lines.map((l) => `${l.text}|${l.action?.label ?? ''}`).join('\n');
    into.hidden = lines.length === 0;
    if (into.dataset['signature'] === signature) return;
    into.dataset['signature'] = signature;
    into.replaceChildren(
      ...lines.map((line) => {
        const row = document.createElement('p');
        row.className = 'collection-line';
        const said = document.createElement('span');
        said.textContent = line.text;
        row.appendChild(said);
        if (line.action !== undefined) {
          const { label, run } = line.action;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'action';
          button.textContent = label;
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            run();
          });
          row.appendChild(button);
        }
        return row;
      }),
    );
  }

  // ---- the row a person was on ----

  private rows(): AnchorRow[] {
    let group: string | null = null;
    // Measured from the list itself, in its own scroll coordinates. A row's
    // `offsetTop` is measured from the collection, so it moved whenever a
    // line above the list appeared or went, and the list was then scrolled
    // to the wrong row by the height of that line.
    const list = this.el.list;
    const origin = list.getBoundingClientRect().top - list.scrollTop;
    return Array.from(list.children)
      .filter((e): e is HTMLElement => e instanceof HTMLElement && !e.hidden)
      .map((e) => {
        if (e.dataset['groupKey'] !== undefined) group = e.dataset['groupKey'];
        return { id: e.dataset['noteId'] ?? null, top: e.getBoundingClientRect().top - origin, group };
      });
  }

  /**
   * Redraw the list without moving it: the row at the top of what is in view
   * is at the same place afterwards, whatever arrived or left above it. A
   * neighbourhood that is read a moment after a note is opened adds a whole
   * heading of rows at the top, and without this the row under the pointer
   * became another row. Not while it is collapsed: nothing is laid out then,
   * and the row kept for opening it again is left alone.
   */
  steady(redraw: () => void): void {
    const list = this.el.list;
    const laidOut = this.active && list.offsetParent !== null;
    let at: ScrollAnchor[] = [];
    if (laidOut) {
      const rows = this.rows();
      const box = list.getBoundingClientRect();
      // The row a person is on is the one that stays put: the row under a
      // resting pointer, else the row the keyboard is on, else the top row.
      const focused = document.activeElement instanceof HTMLElement && list.contains(document.activeElement) ? document.activeElement.getBoundingClientRect() : null;
      const y = this.restingY() ?? (focused !== null && focused.bottom > box.top && focused.top < box.bottom ? focused.top + focused.height / 2 : null);
      at = y === null ? [] : anchorsFrom(rows, list.scrollTop, list.scrollTop + y - box.top);
      const top = anchorAt(rows, list.scrollTop);
      if (at.length === 0 && top !== null) at = [top];
    }
    redraw();
    // Room made by an earlier redraw is given back first, and made again
    // below if it is still needed.
    list.style.removeProperty('padding-bottom');
    if (at.length === 0) return;
    const top = scrollTopForFirst(at, this.rows());
    if (top === null) return;
    // A short list cannot be scrolled far enough to keep the row in place: a
    // list that fits has no scroll range at all, and a row arriving above
    // then pushed every row down however this was asked. So the list is given
    // the room, as empty space after its last row.
    const short = top - (list.scrollHeight - list.clientHeight);
    if (short > 0) list.style.paddingBottom = `${LIST_END_SPACE + Math.ceil(short)}px`;
    if (Math.abs(top - list.scrollTop) >= 1) list.scrollTop = top;
  }

  /** Whether the pointer is resting on the list: what is derived from the desk keeps its order then. */
  pointerOnList(): boolean {
    return this.active && this.restingY() !== null;
  }

  /**
   * Where the pointer rests on the list, or null. It counts as resting for a
   * moment after it leaves: something drawn over the list for an instant, or
   * a hand on its way back, is not a person who has gone elsewhere.
   */
  private restingY(): number | null {
    if (this.pointerY === null) return null;
    if (this.leftAt !== null && performance.now() - this.leftAt > POINTER_GRACE_MS) {
      this.pointerY = null;
      this.leftAt = null;
    }
    return this.pointerY;
  }

  /** Whether the members are drawn as cards now: the Cards presentation, open, with something to draw. */
  private showsCards(): boolean {
    const l = this.layout();
    return this.active && l.presentation === 'cards' && (this.narrow !== null || !l.collapsed) && this.narrow !== 'back';
  }

  /**
   * Change how the members are shown: the list, or cards. The members, the
   * count, the filters and the selected note are what they were; only the
   * drawing changes. The list comes back to the row it was on, and the cards
   * open at that note.
   */
  setPresentation(presentation: Presentation): void {
    if (!this.hooks.canArrange()) return;
    const l = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    if (l.presentation === presentation && !l.collapsed) return;
    if (l.presentation === 'table' && !l.collapsed) this.keepAnchor();
    if (presentation === 'cards') this.openAt = this.anchor?.id ?? null;
    this.commit({ ...l, presentation, collapsed: false });
    if (this.model !== null) this.paint(this.model);
    if (presentation === 'table') requestAnimationFrame(() => this.restoreWhenLaidOut());
    this.hooks.seatsChanged();
  }

  /**
   * The members as cards (glass.ts, `DeskFurniture.seats`): where each one
   * drawn stands in the field. Only the rows in view are placed, and a member
   * that is an open document or is gathered round one is not given a second
   * card: a reference stands in its cell and brings the real one into view.
   */
  seats(taken: ReadonlySet<string>, held: ReadonlySet<string>): { at: Map<string, Point>; z: number; card(noteId: string): CardModel | null } | null {
    const model = this.model;
    if (model === null || !this.showsCards() || model.state !== 'ready') {
      if (this.refs !== '') this.paintRefs([], '');
      return null;
    }
    const { grid: element, root } = this.el;
    // Measured from the page only when the collection's size or its lines change.
    const key = `${this.narrow}|${root.style.width}|${root.style.height}|${this.el.note.hidden}|${this.el.state.hidden}`;
    if (this.gridArea === null || this.gridArea.key !== key) {
      this.gridArea = { key, left: element.offsetLeft + GRID_GAP, top: element.offsetTop + GRID_GAP, width: element.clientWidth - 2 * GRID_GAP, height: element.clientHeight - 2 * GRID_GAP };
    }
    const area = this.gridArea;
    const card = { width: SEAT.width, height: SEAT.height };
    const members = model.members;
    let grid = cardGrid({ area, card, gap: GRID_GAP, count: members.length, firstRow: this.firstRow });
    if (this.openAt !== null) {
      grid = cardGrid({ area, card, gap: GRID_GAP, count: members.length, firstRow: rowOfMember(members.indexOf(this.openAt), grid.columns) });
      this.openAt = null;
    }
    this.firstRow = grid.firstRow;
    this.lastGrid = grid;
    const at = new Map<string, Point>();
    const refs: Array<{ id: string; why: string; x: number; y: number }> = [];
    for (let i = 0; i < grid.drawn; i += 1) {
      const id = members[grid.first + i] as string;
      const c = grid.centres[i] as Point;
      if (held.has(id)) refs.push({ id, why: 'open', x: c.x, y: c.y });
      else if (taken.has(id)) refs.push({ id, why: 'gathered', x: c.x, y: c.y });
      else at.set(id, { x: this.drawnAt.x + c.x, y: this.drawnAt.y + c.y });
    }
    const said = gridText(grid, members.length, refs.length);
    this.paintRefs(refs, `${grid.first}|${refs.map((r) => `${r.id}${r.why}${Math.round(r.x)},${Math.round(r.y)}`).join(';')}|${said}`, said);
    return { at, z: (this.onTop ? Z_OVER : Z_UNDER) + 1, card: (noteId) => model.cardOf(noteId) };
  }

  /** The references in the grid, and the line under it. Drawn only when they change. */
  private paintRefs(refs: ReadonlyArray<{ id: string; why: string; x: number; y: number }>, signature: string, said = ''): void {
    if (this.refs === signature) return;
    this.refs = signature;
    const { grid, places } = this.el;
    grid.replaceChildren(
      ...refs.map((ref) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'grid-ref';
        button.dataset['noteId'] = ref.id;
        button.style.left = `${ref.x - grid.offsetLeft - SEAT.width / 2}px`;
        button.style.top = `${ref.y - grid.offsetTop - SEAT.height / 2}px`;
        button.style.width = `${SEAT.width}px`;
        button.style.height = `${SEAT.height}px`;
        const id = document.createElement('span');
        id.className = 'grid-ref-id';
        id.textContent = ref.id;
        const why = document.createElement('span');
        why.textContent = ref.why === 'open' ? 'open as a document' : 'gathered round the open note';
        button.append(id, why);
        button.setAttribute('aria-label', `${ref.id} is ${ref.why === 'open' ? 'open as a document' : 'gathered round the open note'}: show it`);
        button.addEventListener('click', () => this.hooks.locate(ref.id));
        return button;
      }),
    );
    if (signature !== '') {
      places.textContent = said;
      places.hidden = said === '';
    }
  }

  /** Move through the cards by rows. */
  private scrollGrid(rows: number): void {
    const before = this.firstRow;
    const most = this.lastGrid === null ? 0 : Math.max(0, this.lastGrid.totalRows - this.lastGrid.rows);
    this.firstRow = Math.max(0, Math.min(most, this.firstRow + rows));
    if (this.firstRow !== before) this.hooks.seatsChanged();
  }

  /** The wheel turned over the cards: a row for every so much of a turn, and never the field's zoom. */
  wheel(deltaY: number): void {
    if (!this.showsCards()) return;
    this.wheelLeft += deltaY;
    const rows = Math.trunc(this.wheelLeft / GRID_WHEEL_ROW);
    if (rows === 0) return;
    this.wheelLeft -= rows * GRID_WHEEL_ROW;
    this.scrollGrid(rows);
  }

  /** What the Cards presentation is showing, for a check: the first member drawn, how many, and of how many. */
  gridState(): { first: number; drawn: number; count: number; columns: number; rows: number; firstRow: number } | null {
    if (!this.showsCards() || this.lastGrid === null || this.model === null) return null;
    const g = this.lastGrid;
    return { first: g.first, drawn: g.drawn, count: this.model.members.length, columns: g.columns, rows: g.rows, firstRow: g.firstRow };
  }

  /** Remember which note's row the list is scrolled to. */
  keepAnchor(): void {
    this.anchor = anchorAt(this.rows(), this.el.list.scrollTop);
  }

  /** Scroll back to the remembered row, wherever it is now. False when its note has no row any more. */
  restoreAnchor(): boolean {
    const top = scrollTopFor(this.anchor, this.rows());
    if (top === null) return false;
    this.el.list.scrollTop = top;
    return true;
  }

  /**
   * Scroll back to the remembered row once the list is on screen again and
   * that row is there under its own heading.
   *
   * Opening the collection again laid the list out a frame or more after the
   * press, and the rows under "Joined to what you are holding" arrive after
   * that. Restored at once, the remembered row was measured before it had a
   * place, or was not there yet, and the list went to the same note's row
   * under another heading: a few hundred pixels from where it was. So it
   * waits for the row itself, and takes the same note elsewhere only when the
   * row has not come back after half a second.
   */
  private restoreWhenLaidOut(frames = 30): void {
    const anchor = this.anchor;
    if (anchor === null) return;
    const list = this.el.list;
    const laidOut = list.offsetParent !== null && list.clientHeight > 0;
    const there = laidOut && this.rows().some((r) => r.id === anchor.id && (anchor.group === undefined || r.group === anchor.group));
    if (there || (laidOut && frames <= 0)) {
      this.restoreAnchor();
      return;
    }
    if (frames > 0) requestAnimationFrame(() => this.restoreWhenLaidOut(frames - 1));
  }

  /** The remembered row's note, for a check and for saying it is gone. */
  anchorId(): string | null {
    return this.anchor?.id ?? null;
  }

  /**
   * Put the keyboard on the collection's header: where focus goes when the
   * row it would return to is gone or is not on screen. False when the header
   * did not take it, which is when the collection itself is out of sight.
   */
  focusHead(): boolean {
    this.raise();
    this.el.head.focus({ preventScroll: true });
    return document.activeElement === this.el.head;
  }

  /** Bring it above the documents, as a press on it does. */
  raise(): void {
    if (this.onTop) return;
    this.onTop = true;
    this.el.root.style.zIndex = String(Z_OVER);
    this.hooks.raised();
  }

  /** Whether it is above the documents: false once a document has been pressed or opened since. */
  isOnTop(): boolean {
    return this.onTop;
  }

  // ---- the hands ----

  private commit(layout: CollectionLayout): void {
    this.live = null;
    this.hooks.store(layout);
    this.place(this.field, this.shift, this.narrow);
  }

  /** Collapse to the header, or open again at the size and the row it had. */
  toggleCollapsed(): void {
    if (this.narrow !== null) return;
    const stored = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    const l = { ...stored, collapsed: this.folded(stored.collapsed) };
    // The list's row is kept only when it is the list that is on screen: as
    // cards the list is not laid out, and has no row to measure.
    if (!l.collapsed && l.presentation === 'table') this.keepAnchor();
    if (this.hooks.canArrange()) this.commit({ ...l, collapsed: !l.collapsed });
    else {
      // A served page arranges nothing on the Mac's desk, and the list is
      // still its only way to a note with no card: the fold is this page's
      // own. It changes what this page shows and the store is told nothing.
      this.ownFold = { stored: stored.collapsed, collapsed: !l.collapsed };
      this.place(this.field, this.shift, this.narrow);
    }
    if (l.collapsed && l.presentation === 'table') {
      // The list was not laid out while it was collapsed; scroll once it is.
      requestAnimationFrame(() => this.restoreWhenLaidOut());
    }
    if (this.model !== null) this.paint(this.model);
    this.hooks.seatsChanged();
  }

  private wire(): void {
    const { root, head, fold, resize } = this.el;
    // Where the pointer rests over the list, for `steady`.
    // A press counts as well as a move: a touch, and a pointer that was
    // already there when the list was drawn, press without having moved.
    for (const type of ['pointermove', 'pointerdown', 'pointerenter'] as const) {
      this.el.list.addEventListener(type, (event) => {
        this.pointerY = event.clientY;
        this.leftAt = null;
      });
    }
    this.el.list.addEventListener('pointerleave', () => {
      this.leftAt = performance.now();
    });
    // A press anywhere on the collection brings it above the documents.
    root.addEventListener('pointerdown', () => this.raise());
    // The keyboard arriving in it does the same: a row or a control that has
    // the keyboard is never left under a document (DES-0003).
    // Only when it ARRIVES from outside. The list redraws its rows and puts
    // the keyboard back on the one it was on, and that is not an arrival: it
    // lifted the list over a document that had just been opened from it.
    root.addEventListener('focusin', (event) => {
      const from = event.relatedTarget;
      if (this.onTop || !(from instanceof Node) || root.contains(from)) return;
      this.raise();
    });
    fold.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleCollapsed();
    });
    this.el.asTable.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setPresentation('table');
    });
    this.el.asCards.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setPresentation('cards');
    });
    const { grid } = this.el;
    grid.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.wheel(event.deltaY);
      },
      { passive: false },
    );
    grid.addEventListener('keydown', (event) => {
      if (event.target !== grid) return;
      const page = Math.max(1, (this.lastGrid?.rows ?? 1) - 1);
      const by: Record<string, number> = { PageDown: page, PageUp: -page, ArrowDown: 1, ArrowUp: -1, Home: -1e6, End: 1e6 };
      const rows = by[event.key];
      if (rows === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      this.scrollGrid(rows);
    });
    head.addEventListener('pointerdown', (event) => this.grab(event));
    head.addEventListener('dblclick', (event) => {
      if ((event.target as HTMLElement).closest('button') !== null) return;
      this.toggleCollapsed();
    });
    head.addEventListener('keydown', (event) => this.key(event));
    resize.addEventListener('pointerdown', (event) => this.resizeBy(event));
  }

  /** A drag on the header moves the collection. Its rows, its search box and its filters keep their own behaviour. */
  private grab(event: PointerEvent): void {
    if (event.button !== 0 || !this.hooks.canArrange() || this.narrow !== null) return;
    if ((event.target as HTMLElement).closest('button') !== null) return;
    const head = this.el.head;
    const start = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    const drawn = fitCollection(start, this.field);
    const x0 = event.clientX;
    const y0 = event.clientY;
    let moved = false;
    head.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent): void => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (!moved && Math.hypot(dx, dy) <= SLOP_PX) return;
      moved = true;
      this.el.root.classList.add('dragging');
      this.live = { ...start, x: Math.max(0, drawn.x + dx), y: Math.max(0, drawn.y + dy) };
      this.place(this.field, this.shift, this.narrow);
    };
    const finish = (): void => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', end);
      head.removeEventListener('pointercancel', end);
      document.removeEventListener('keydown', cancel, true);
      this.el.root.classList.remove('dragging');
    };
    const end = (e: PointerEvent): void => {
      finish();
      const live = this.live;
      if (!moved || live === null || e.type === 'pointercancel') {
        this.live = null;
        this.place(this.field, this.shift, this.narrow);
        return;
      }
      this.commit(live);
    };
    // Escape during the drag ends the drag, as it does for a document's
    // header (glass.ts, `grabPane`): the collection is back where it was, and
    // whatever the pointer does until it is let go moves nothing and stores
    // nothing. Left listening, the next move of a hand still on the button
    // began the drag again and the release stored it. The key goes no
    // further: it must not also leave the focus or sweep the desk.
    const cancel = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || !moved) return;
      e.preventDefault();
      e.stopPropagation();
      finish();
      this.live = null;
      this.place(this.field, this.shift, this.narrow);
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
    document.addEventListener('keydown', cancel, true);
  }

  private resizeBy(event: PointerEvent): void {
    if (event.button !== 0 || !this.hooks.canArrange() || this.narrow !== null) return;
    event.stopPropagation();
    const handle = this.el.resize;
    const start = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    const drawn = fitCollection(start, this.field);
    const x0 = event.clientX;
    const y0 = event.clientY;
    handle.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent): void => {
      this.live = {
        ...start,
        x: drawn.x,
        y: drawn.y,
        w: Math.max(COLLECTION_MIN_WIDTH, drawn.w + e.clientX - x0),
        h: Math.max(COLLECTION_MIN_HEIGHT, drawn.h + e.clientY - y0),
      };
      this.place(this.field, this.shift, this.narrow);
    };
    const finish = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      document.removeEventListener('keydown', cancel, true);
    };
    const end = (e: PointerEvent): void => {
      finish();
      const live = this.live;
      if (live === null || e.type === 'pointercancel') {
        this.live = null;
        this.place(this.field, this.shift, this.narrow);
        return;
      }
      this.commit(live);
    };
    // Escape while the corner is held cancels the resize: the size goes back
    // and the corner is let go of, as a drag of the header is. The key goes
    // no further. Unhandled, it reached Glass's own Escape, which left the
    // focus or closed every note while the collection stayed half resized.
    const cancel = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish();
      this.live = null;
      this.place(this.field, this.shift, this.narrow);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    document.addEventListener('keydown', cancel, true);
  }

  /** The keyboard's way to do what the pointer does on the header: move, resize and collapse. */
  private key(event: KeyboardEvent): void {
    if (event.target !== this.el.head) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleCollapsed();
      return;
    }
    if (!this.hooks.canArrange() || this.narrow !== null) return;
    const step = event.shiftKey ? 64 : 16;
    const by: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = by[event.key];
    if (d === undefined) return;
    event.preventDefault();
    const start = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    const drawn = fitCollection(start, this.field);
    if (event.altKey) this.commit({ ...start, x: drawn.x, y: drawn.y, w: Math.max(COLLECTION_MIN_WIDTH, drawn.w + d[0]), h: Math.max(COLLECTION_MIN_HEIGHT, drawn.h + d[1]) });
    else this.commit({ ...start, x: Math.max(0, drawn.x + d[0]), y: Math.max(0, drawn.y + d[1]) });
  }
}
