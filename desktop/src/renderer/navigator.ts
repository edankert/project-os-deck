/**
 * The navigator: the view's notes, in the groups the sidecar sent.
 *
 * This is the half of Spread that lists, and the desk beside it is the half
 * that arranges. Before they were separated the grid was the list, every note
 * in the view was a card, and a saved desk was whatever the flow layout had
 * done that morning (TASK-0024).
 *
 * Rows and headings are pooled in one array so their order is the pool's
 * order. Four hundred issues cost four hundred rows once, and the rows are
 * repainted rather than rebuilt when a person folds a group away.
 */
import type { CardModel } from '../shared/types.js';
import { bandFor, faceText } from '../shared/faces.js';
import { type NavigatorPaint, type Row, rowsFor, totalRows } from '../shared/rows.js';

export type { NavigatorPaint, Row };
export { rowsFor };

/** The height of a heading stuck to the top of the list: a row behind it is not in view. */
const STUCK_HEADING = 28;

export interface NavigatorHandlers {
  /** Put this note on the desk, or take it off if it is already there. */
  /** A row was chosen. `byKey` says the keyboard chose it, so the keyboard goes where the note opens. */
  toggle: (card: CardModel, byKey: boolean) => void;
  /** Fold a group away, or open one that was folded. */
  fold: (key: string, folded: boolean) => void;
  /**
   * The keyboard arrived on a row (TASK-0033). Glass flies the field to the
   * card, or highlights it under reduced motion, and reaches for it
   * (TASK-0056), so a keyboard user sees what a pointer user sees.
   */
  focusRow?: (card: CardModel) => void;
  /** A letter pressed on a row: `p` pulls, `b` pushes, `s` sends, Delete puts back. Returns whether it was used. */
  key?: (card: CardModel, key: string) => boolean;
}

export class NavigatorList {
  private readonly container: HTMLElement;
  private readonly handlers: NavigatorHandlers;
  private readonly pool: HTMLElement[] = [];
  private rows: Row[] = [];
  /** The groups last painted, for finding which heading holds a note whose row is folded away. */
  private groups: NavigatorPaint['groups'] = [];
  /** The one row the Tab key lands on: a roving tab stop, so 409 rows are one stop. */
  private stop = 0;
  private total = 0;
  /**
   * True while a repaint puts the keyboard back on the row it was on. A
   * repaint is not an arrival: without this, a neighbourhood arriving in the
   * background flew the field to whatever row had focus and took the reach
   * away from the card under the pointer.
   */
  private restoring = false;
  /** True while a repaint puts the keyboard back: the list is not scrolled to the row. */
  private still = false;
  /** The note whose row is marked, and until when, so a repaint keeps the mark. */
  private marked: { noteId: string; until: number } | null = null;

  /** What the pointer was pressed on, by what it names: a row's key, and whether it was its twist. */
  private pressed: string | null = null;

  constructor(container: HTMLElement, handlers: NavigatorHandlers) {
    this.container = container;
    this.handlers = handlers;
    container.addEventListener('keydown', (event) => this.onKey(event));
    // A press that the list was drawn again under. Rows are drawn by a pool
    // of elements in order, so when rows arrive above the pointer the row
    // that is held still under it is handed to another element. A press that
    // began on the one and ended on the other is not a click on either: the
    // browser sends it to what they share, which is the list, and it was
    // lost. Opening a note adds rows above, so the press lost was the one
    // made on the next row a moment after. It is taken here, when the row
    // under the release is the row that was pressed.
    container.addEventListener('pointerdown', (event) => {
      this.pressed = this.named(event.target);
    });
    container.addEventListener('click', (event) => {
      if (event.target !== container || this.pressed === null) return;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const element = under instanceof HTMLElement ? (under.closest('[data-index]') as HTMLElement | null) : null;
      if (element === null || !container.contains(element) || this.named(under) !== this.pressed) return;
      this.pressed = null;
      this.choose(element, under instanceof HTMLElement && under.closest('.twist') !== null);
    });
  }

  /** What a point of the list names: the row drawn there, and whether it is that row's twist. Null off the rows. */
  private named(target: EventTarget | null): string | null {
    if (!(target instanceof HTMLElement)) return null;
    const element = target.closest('[data-index]') as HTMLElement | null;
    const row = element === null ? undefined : this.rows[Number(element.dataset['index'])];
    if (row === undefined) return null;
    return `${row.kind} ${row.key} ${target.closest('.twist') !== null}`;
  }

  /** A row was chosen with the pointer: a heading folds, a twist opens what a note holds, a note is opened. */
  private choose(element: HTMLElement, onTwist: boolean): void {
    const row = this.rows[Number(element.dataset['index'])];
    if (row === undefined) return;
    if (row.kind === 'group') {
      this.handlers.fold(row.key, !row.folded);
      return;
    }
    if (onTwist && row.expandable) {
      // Folding an item uses the same map as folding a group, and an item
      // defaults to closed, so `false` is the value that opens it.
      this.handlers.fold(row.key, row.expanded);
      return;
    }
    // The row's own card, not a lookup by id: the sidecar deliberately
    // repeats a note in more than one group (Needs-you and its phase), and
    // the map then holds whichever of them painted last (ISS-0015).
    this.handlers.toggle(row.card, false);
  }

  /**
   * Put the keyboard on the row drawing this note, if one does. `quiet` is
   * for coming BACK to a row, when a document is closed: the keyboard returns
   * to where the note was opened from, and that is not a fresh arrival, so the
   * field is not flown anywhere (FEAT-0020, TASK-0098).
   *
   * The answer is whether the keyboard is on that row now, not whether the
   * note has a row. A row in a list that is not on screen (the collection
   * collapsed, shown as cards, or behind a document in a narrow field) cannot
   * take the keyboard, and the caller then puts it somewhere that can.
   */
  focusNote(noteId: string, quiet = false): boolean {
    const index = this.rowFor(noteId);
    if (index === -1) return false;
    const was = this.restoring;
    this.restoring = quiet || was;
    try {
      this.moveStop(index, true);
    } finally {
      this.restoring = was;
    }
    return document.activeElement === this.pool[index];
  }

  /**
   * Show the row for a note without moving the keyboard: the note was opened
   * from a card in the field, and the list should show which row is its.
   *
   * A row in a group that is folded away is not drawn, and unfolding a group
   * of hundreds because one of its notes was opened would be the list
   * rearranging itself. So the group's heading is shown and marked instead,
   * and the answer says which of the two happened.
   */
  reveal(noteId: string): 'row' | 'group' | 'absent' {
    for (const element of this.pool) element.classList.remove('holds-open');
    const index = this.rowFor(noteId);
    if (index !== -1) {
      // Not scrolled when one of its rows is already in view: the list was
      // being scrolled back to the top, to the note's row under "On the
      // desk", every time a note was opened from a row further down.
      if (!this.inView(index)) this.pool[index]?.scrollIntoView({ block: 'nearest' });
      return 'row';
    }
    const holds = (cards: CardModel[]): boolean => cards.some((c) => c.noteId === noteId || holds(c.children));
    const group = this.groups.find((g) => holds(g.cards));
    if (group === undefined) return 'absent';
    const at = this.rows.findIndex((r) => r.kind === 'group' && r.key === `g:${group.key}`);
    const element = this.pool[at];
    if (element === undefined) return 'absent';
    element.classList.add('holds-open');
    element.scrollIntoView({ block: 'nearest' });
    return 'group';
  }

  /** Whether a row is wholly in the part of the list that is on screen, below a heading stuck to its top. */
  private inView(index: number): boolean {
    const element = this.pool[index];
    if (element === undefined || element.hidden) return false;
    const box = this.container.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    return r.height > 0 && r.top >= box.top + STUCK_HEADING && r.bottom <= box.bottom;
  }

  /**
   * The row to use for a note the list shows more than once: on the desk,
   * joined to a held note, needing a person, and under its own heading. One
   * that is already in view, so nothing has to move; else the last, which is
   * the row under the view's own heading, the one that stays when the note
   * is closed. -1 when the note has no row.
   */
  private rowFor(noteId: string): number {
    let last = -1;
    for (let i = 0; i < this.rows.length; i += 1) {
      const row = this.rows[i] as Row;
      if (row.kind !== 'card' || row.card.noteId !== noteId) continue;
      if (this.inView(i)) return i;
      last = i;
    }
    return last;
  }

  /** Mark a row for a moment, the reduced-motion arrival (TASK-0033). */
  highlight(noteId: string): void {
    const g = globalThis as unknown as { __deckTrace?: boolean; __deckTraceLog?: string[] };
    if (g.__deckTrace === true) (g.__deckTraceLog ??= []).push(`${Math.round(performance.now())} nav highlight ${noteId}`);
    const index = this.rows.findIndex((r) => r.kind === 'card' && r.card.noteId === noteId);
    const element = this.pool[index];
    if (element === undefined) return;
    this.marked = { noteId, until: Date.now() + 1600 };
    element.classList.add('highlight');
    element.scrollIntoView({ block: 'nearest' });
    setTimeout(() => {
      if (this.marked?.noteId === noteId && Date.now() >= this.marked.until) this.marked = null;
      for (const e of this.pool) if (e.dataset['noteId'] === noteId) e.classList.remove('highlight');
    }, 1600);
  }

  private moveStop(index: number, focus: boolean): void {
    const clamped = Math.max(0, Math.min(this.rows.length - 1, index));
    const before = this.pool[this.stop];
    if (before !== undefined) before.tabIndex = -1;
    this.stop = clamped;
    const element = this.pool[clamped];
    if (element === undefined) return;
    element.tabIndex = 0;
    if (focus) {
      // A repaint puts the keyboard back and scrolls nothing: where the list
      // stands across a repaint is decided once, by whoever asked for the
      // repaint (collection-view.ts, `steady`). Scrolling here took the list
      // to the note's row under "On the desk" and moved every row a pointer
      // was near.
      element.focus({ preventScroll: this.still });
      if (!this.still) element.scrollIntoView({ block: 'nearest' });
    }
  }

  private onKey(event: KeyboardEvent): void {
    const element = (event.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
    if (element === null) return;
    const index = Number(element.dataset['index']);
    const row = this.rows[index];
    if (row === undefined) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveStop(index + (event.key === 'ArrowDown' ? 1 : -1), true);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.moveStop(event.key === 'Home' ? 0 : this.rows.length - 1, true);
      return;
    }
    if (row.kind === 'group') {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const open = event.key === 'ArrowRight' ? true : event.key === 'ArrowLeft' ? false : row.folded;
        this.handlers.fold(row.key, !open);
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handlers.toggle(row.card, true);
      return;
    }
    if (row.expandable && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      this.handlers.fold(row.key, event.key === 'ArrowLeft');
      return;
    }
    if (this.handlers.key !== undefined && !event.metaKey && !event.ctrlKey) {
      if (this.handlers.key(row.card, event.key)) event.preventDefault();
    }
  }

  render(paint: NavigatorPaint): void {
    const focusedNote = (() => {
      const active = document.activeElement as HTMLElement | null;
      if (active === null || !this.container.contains(active)) return null;
      return active.dataset['noteId'] ?? null;
    })();
    this.rows = rowsFor(paint);
    this.groups = paint.groups;
    this.total = totalRows(paint.groups);
    if (this.stop >= this.rows.length) this.stop = 0;
    for (let i = 0; i < this.rows.length; i += 1) {
      const row = this.rows[i] as Row;
      let element = this.pool[i];
      if (element === undefined) {
        element = this.makeElement(i);
        this.pool.push(element);
        this.container.appendChild(element);
      }
      this.paintRow(element, i, row, paint);
      element.hidden = false;
    }
    for (let i = this.rows.length; i < this.pool.length; i += 1) {
      (this.pool[i] as HTMLElement).hidden = true;
      (this.pool[i] as HTMLElement).tabIndex = -1;
    }
    // The keyboard stays on the note it was on, across a repaint, and the
    // repaint does not count as arriving there.
    if (focusedNote !== null) {
      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset['noteId'] !== focusedNote) {
        this.restoring = true;
        this.still = true;
        try {
          this.focusNote(focusedNote);
        } finally {
          this.restoring = false;
          this.still = false;
        }
      }
    }
  }

  size(): number {
    return this.pool.length;
  }

  private makeElement(index: number): HTMLElement {
    const element = document.createElement('div');
    element.dataset['index'] = String(index);
    element.innerHTML =
      '<button type="button" class="twist" tabindex="-1" aria-label="Show what this holds"></button>' +
      '<span class="id"></span><span class="label"></span><span class="mark"></span>';

    element.tabIndex = -1;
    element.addEventListener('focus', () => {
      const row = this.rows[Number(element.dataset['index'])];
      if (row === undefined) return;
      const at = Number(element.dataset['index']);
      if (this.stop !== at) {
        const before = this.pool[this.stop];
        if (before !== undefined && before !== element) before.tabIndex = -1;
        this.stop = at;
        element.tabIndex = 0;
      }
      const g = globalThis as unknown as { __deckTrace?: boolean; __deckTraceLog?: string[] };
      if (g.__deckTrace === true) (g.__deckTraceLog ??= []).push(`${Math.round(performance.now())} nav focus ${row.kind === 'card' ? row.card.noteId : row.key} restoring=${this.restoring}`);
      if (row.kind === 'card' && !this.restoring) this.handlers.focusRow?.(row.card);
    });
    element.addEventListener('click', (event) => {
      this.pressed = null;
      this.choose(element, (event.target as HTMLElement).closest('.twist') !== null);
    });
    return element;
  }

  private paintRow(element: HTMLElement, index: number, row: Row, paint: NavigatorPaint): void {
    // The caller already has the index. Searching for the row instead made
    // painting quadratic in the number of rows, which Your Trainer's Issues
    // view has 409 of (ISS-0015).
    element.dataset['index'] = String(index);
    element.tabIndex = index === this.stop ? 0 : -1;
    element.setAttribute('role', 'listitem');
    const twist = element.querySelector('.twist') as HTMLElement | null;
    if (row.kind === 'group') {
      element.className = 'nav-group';
      // Named, so a control elsewhere can send the keyboard to a group (FEAT-0017's "+N more").
      element.dataset['groupKey'] = row.key;
      element.removeAttribute('aria-posinset');
      element.removeAttribute('aria-setsize');
      element.dataset['needsHuman'] = String(row.needsHuman);
      element.setAttribute('aria-expanded', String(!row.folded));
      delete element.dataset['noteId'];
      delete element.dataset['band'];
      element.style.removeProperty('padding-left');
      if (twist !== null) {
        twist.hidden = false;
        twist.textContent = row.folded ? '▸' : '▾';
      }
      setText(element, '.id', '');
      setText(element, '.label', row.label);
      setText(element, '.mark', String(row.count));
      return;
    }

    const { card } = row;
    element.className = 'nav-row';
    delete element.dataset['groupKey'];
    if (this.marked !== null && this.marked.noteId === card.noteId && Date.now() < this.marked.until) {
      element.classList.add('highlight');
    }
    // Its place in the whole view, not in what is drawn (TASK-0033).
    element.setAttribute('aria-posinset', String(row.position));
    element.setAttribute('aria-setsize', String(this.total));
    element.setAttribute('aria-label', `${card.noteId} ${card.title}${card.owed ? `, owed ${card.owedVerb ?? 'a decision'}` : ''}`);
    element.dataset['noteId'] = card.noteId;
    element.dataset['band'] = bandFor(card.status);
    element.dataset['onDesk'] = String(paint.onDesk.has(card.noteId));
    element.setAttribute('aria-current', String(card.noteId === paint.currentNoteId));
    element.style.paddingLeft = `${8 + row.depth * 14}px`;
    if (twist !== null) {
      twist.hidden = !row.expandable;
      twist.textContent = row.expanded ? '▾' : '▸';
    }
    setText(element, '.id', card.noteId);
    setText(element, '.label', card.title);
    element.title = `${card.noteId} — ${card.title}\n${faceText(card, paint.faces)}`;
    const mark = card.owed ? (card.owedVerb ?? 'needs you') : paint.onDesk.has(card.noteId) ? 'on desk' : '';
    setText(element, '.mark', mark);
  }
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector(selector);
  if (node !== null) node.textContent = value;
}
