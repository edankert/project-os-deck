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
import { type NavigatorPaint, type Row, rowsFor } from '../shared/rows.js';

export type { NavigatorPaint, Row };
export { rowsFor };

export interface NavigatorHandlers {
  /** Put this note on the desk, or take it off if it is already there. */
  toggle: (card: CardModel) => void;
  /** Fold a group away, or open one that was folded. */
  fold: (key: string, folded: boolean) => void;
}

export class NavigatorList {
  private readonly container: HTMLElement;
  private readonly handlers: NavigatorHandlers;
  private readonly pool: HTMLElement[] = [];
  private readonly cards = new Map<string, CardModel>();
  private rows: Row[] = [];

  constructor(container: HTMLElement, handlers: NavigatorHandlers) {
    this.container = container;
    this.handlers = handlers;
  }

  render(paint: NavigatorPaint): void {
    this.rows = rowsFor(paint);
    for (let i = 0; i < this.rows.length; i += 1) {
      const row = this.rows[i] as Row;
      let element = this.pool[i];
      if (element === undefined) {
        element = this.makeElement(i);
        this.pool.push(element);
        this.container.appendChild(element);
      }
      this.paintRow(element, row, paint);
      element.hidden = false;
    }
    for (let i = this.rows.length; i < this.pool.length; i += 1) {
      (this.pool[i] as HTMLElement).hidden = true;
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
      const card = this.cards.get(row.card.noteId);
      if (card !== undefined) this.handlers.toggle(card);
    });
    return element;
  }

  private paintRow(element: HTMLElement, row: Row, paint: NavigatorPaint): void {
    element.dataset['index'] = String(this.rows.indexOf(row));
    const twist = element.querySelector('.twist') as HTMLElement | null;
    if (row.kind === 'group') {
      element.className = 'nav-group';
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
    this.cards.set(card.noteId, card);
    element.className = 'nav-row';
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
    element.title = `${card.noteId} — ${card.title}\n${faceText(card)}`;
    const mark = card.owed ? (card.owedVerb ?? 'needs you') : paint.onDesk.has(card.noteId) ? 'on desk' : '';
    setText(element, '.mark', mark);
  }
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector(selector);
  if (node !== null) node.textContent = value;
}
