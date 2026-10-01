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
  type ScrollAnchor,
  anchorAt,
  countText,
  defaultCollectionLayout,
  fitCollection,
  scrollTopFor,
} from '../shared/collection.js';
import type { Rect } from '../shared/focus-ring.js';
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
}

export interface CollectionElements {
  root: HTMLElement;
  head: HTMLElement;
  name: HTMLElement;
  count: HTMLElement;
  filter: HTMLElement;
  fold: HTMLButtonElement;
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
  private onTop = false;
  /** The row the list was scrolled to when it was collapsed, by the note it is for. */
  private anchor: ScrollAnchor | null = null;
  /** In a narrow field: whether the collection is the one object in front, or out of the way. */
  private narrow: 'front' | 'back' | null = null;
  private model: CollectionModel | null = null;

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

  /** The layout the collection is drawn with: a drag in progress, else the store's, else the default; fitted to the field. */
  layout(): CollectionLayout {
    const base = this.live ?? this.hooks.stored() ?? defaultCollectionLayout(this.field);
    return fitCollection(base, this.field);
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
    el.head.setAttribute(
      'aria-label',
      `${model.name}, ${countText(model.summary)}${model.filter === '' ? '' : `, narrowed to ${model.filter}`}: arrow keys move it, Alt and arrows resize it, Enter ${l.collapsed ? 'opens' : 'collapses'} it`,
    );
    const collapsed = l.collapsed && this.narrow === null;
    el.fold.setAttribute('aria-expanded', String(!collapsed));
    el.fold.textContent = collapsed ? '▸' : '▾';
    el.fold.title = collapsed ? 'Open the list again (Enter)' : 'Collapse to the header (Enter)';
    el.fold.setAttribute('aria-label', collapsed ? `Open ${model.name} again` : `Collapse ${model.name} to its header`);
    el.fold.hidden = this.narrow !== null;
    // What is waiting to be applied, and what happened to the selection.
    const lines: Array<{ text: string; action?: { label: string; run: () => void } }> = [];
    if (model.change !== '') lines.push({ text: model.change, action: { label: 'apply', run: () => this.hooks.applyChange() } });
    if (model.removed !== null) lines.push({ text: model.removed });
    this.paintLines(el.note, lines);
    // Where the members are: the list reaches every one, the field only some.
    const s = model.summary;
    el.places.textContent = model.state !== 'ready' || s.shown === 0
      ? ''
      : s.listOnly === 0
        ? `all ${s.shown} have a place in the field`
        : `${s.inField} have a place in the field · ${s.listOnly} are in this list only`;
    el.places.hidden = el.places.textContent === '';
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
    const laidOut = this.active && this.el.list.offsetParent !== null;
    const at = laidOut ? anchorAt(this.rows(), this.el.list.scrollTop) : null;
    redraw();
    if (at === null) return;
    const top = scrollTopFor(at, this.rows());
    if (top !== null && Math.abs(top - this.el.list.scrollTop) >= 1) this.el.list.scrollTop = top;
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

  /** The remembered row's note, for a check and for saying it is gone. */
  anchorId(): string | null {
    return this.anchor?.id ?? null;
  }

  /** Put the keyboard on the collection's header: where focus goes when the row it would return to is gone. */
  focusHead(): void {
    this.raise();
    this.el.head.focus({ preventScroll: true });
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
    if (!this.hooks.canArrange() || this.narrow !== null) return;
    const l = this.hooks.stored() ?? defaultCollectionLayout(this.field);
    if (!l.collapsed) this.keepAnchor();
    this.commit({ ...l, collapsed: !l.collapsed });
    if (l.collapsed) {
      // The list was not laid out while it was collapsed; scroll once it is.
      requestAnimationFrame(() => this.restoreAnchor());
    }
    if (this.model !== null) this.paint(this.model);
  }

  private wire(): void {
    const { root, head, fold, resize } = this.el;
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
    const end = (e: PointerEvent): void => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', end);
      head.removeEventListener('pointercancel', end);
      document.removeEventListener('keydown', cancel, true);
      this.el.root.classList.remove('dragging');
      const live = this.live;
      if (!moved || live === null || e.type === 'pointercancel') {
        this.live = null;
        this.place(this.field, this.shift, this.narrow);
        return;
      }
      this.commit(live);
    };
    // Escape during the drag puts it back, and the key goes no further: it
    // must not also leave the focus or sweep the desk.
    const cancel = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || !moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
      this.live = null;
      this.el.root.classList.remove('dragging');
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
    const end = (e: PointerEvent): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      const live = this.live;
      if (live === null || e.type === 'pointercancel') {
        this.live = null;
        this.place(this.field, this.shift, this.narrow);
        return;
      }
      this.commit(live);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
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
