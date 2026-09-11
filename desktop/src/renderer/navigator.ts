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

export interface NavigatorHandlers {
  /** Put this note on the desk, or take it off if it is already there. */
  toggle: (card: CardModel) => void;
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
  /** The note whose row is marked, and until when, so a repaint keeps the mark. */
  private marked: { noteId: string; until: number } | null = null;

  constructor(container: HTMLElement, handlers: NavigatorHandlers) {
    this.container = container;
    this.handlers = handlers;
    container.addEventListener('keydown', (event) => this.onKey(event));
  }

  /** Put the keyboard on the row drawing this note, if one does. */
  focusNote(noteId: string): boolean {
    const index = this.rows.findIndex((r) => r.kind === 'card' && r.card.noteId === noteId);
    if (index === -1) return false;
    this.moveStop(index, true);
    return true;
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
      element.focus({ preventScroll: false });
      element.scrollIntoView({ block: 'nearest' });
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
      this.handlers.toggle(row.card);
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
        try {
          this.focusNote(focusedNote);
        } finally {
          this.restoring = false;
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
      const row = this.rows[Number(element.dataset['index'])];
      if (row === undefined) return;
      if (row.kind === 'group') {
        this.handlers.fold(row.key, !row.folded);
        return;
      }
      if ((event.target as HTMLElement).closest('.twist') !== null && row.expandable) {
        // Folding an item uses the same map as folding a group, and an item
        // defaults to closed, so `false` is the value that opens it.
        this.handlers.fold(row.key, row.expanded);
        return;
      }
      // The row's own card, not a lookup by id: the sidecar deliberately
      // repeats a note in more than one group (Needs-you and its phase), and
      // the map then holds whichever of them painted last (ISS-0015).
      this.handlers.toggle(row.card);
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
