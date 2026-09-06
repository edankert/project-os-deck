/**
 * Cards, drawn from a pool.
 *
 * The pool is here from the start rather than added later: a view of a
 * thousand notes would otherwise create a thousand elements, and retrofitting
 * that means rewriting the renderer that assumed one element per note.
 */
import type { CardModel } from '../shared/types.js';

export interface PlacedCard {
  card: CardModel;
  x: number | null;
  y: number | null;
}

const DONE = new Set(['done', 'fixed', 'implemented', 'passing', 'released', 'merged', 'accepted', 'closed', 'retired']);
const DOING = new Set(['doing', 'review', 'active', 'draft', 'proposed', 'ready']);

/** The band a status belongs to. Deck defines no vocabulary of its own here. */
export function bandFor(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === '') return 'none';
  if (DONE.has(value)) return 'done';
  if (DOING.has(value)) return 'doing';
  return 'owed';
}

export class CardPool {
  private readonly container: HTMLElement;
  private readonly pool: HTMLButtonElement[] = [];
  private readonly onOpen: (card: CardModel) => void;

  constructor(container: HTMLElement, onOpen: (card: CardModel) => void) {
    this.container = container;
    this.onOpen = onOpen;
  }

  render(cards: PlacedCard[], currentNoteId: string | null): void {
    const placed = cards.some((c) => c.x !== null);
    this.container.classList.toggle('placed', placed);

    for (let i = 0; i < cards.length; i += 1) {
      const entry = cards[i] as PlacedCard;
      let element = this.pool[i];
      if (element === undefined) {
        element = this.makeElement();
        this.pool.push(element);
        this.container.appendChild(element);
      }
      this.paint(element, entry, currentNoteId);
      element.hidden = false;
    }
    // Extra elements are hidden and kept, not destroyed: the next view reuses them.
    for (let i = cards.length; i < this.pool.length; i += 1) {
      const element = this.pool[i] as HTMLButtonElement;
      element.hidden = true;
      element.removeAttribute('style');
    }
  }

  size(): number {
    return this.pool.length;
  }

  private makeElement(): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'card';
    element.innerHTML = '<span class="id"></span><span class="title"></span><span class="meta"></span>';
    element.addEventListener('click', () => {
      const noteId = element.dataset['noteId'];
      const model = noteId === undefined ? undefined : this.models.get(noteId);
      if (model !== undefined) this.onOpen(model);
    });
    return element;
  }

  private readonly models = new Map<string, CardModel>();

  private paint(element: HTMLButtonElement, entry: PlacedCard, currentNoteId: string | null): void {
    const { card } = entry;
    this.models.set(card.noteId, card);
    element.dataset['noteId'] = card.noteId;
    element.dataset['band'] = bandFor(card.status);
    element.setAttribute('aria-current', String(card.noteId === currentNoteId));
    const id = element.querySelector('.id');
    const title = element.querySelector('.title');
    const meta = element.querySelector('.meta');
    if (id !== null) id.textContent = card.noteId;
    if (title !== null) title.textContent = card.title;
    if (meta !== null) meta.textContent = `${card.noteType || 'note'} · ${card.status || 'no status'}`;
    if (entry.x !== null && entry.y !== null) {
      element.style.left = `${entry.x}px`;
      element.style.top = `${entry.y}px`;
    } else {
      element.removeAttribute('style');
    }
  }
}
