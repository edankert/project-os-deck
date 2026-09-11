/**
 * Cards on the desk, drawn from a pool.
 *
 * The pool is here from the start rather than added later: a view of a
 * thousand notes would otherwise create a thousand elements, and retrofitting
 * that means rewriting the renderer that assumed one element per note.
 *
 * A card carries a face chosen by what the note is (`shared/faces.ts`), and
 * the same pooled element draws every face, so four hundred cards cost what
 * they always did.
 */
import type { FaceSection } from '../shared/description.js';
import type { CardModel } from '../shared/types.js';
import { bandFor, faceFor, faceText, fieldsFor, specFor } from '../shared/faces.js';

export { bandFor };

export interface PlacedCard {
  card: CardModel;
  x: number;
  y: number;
  /** A note on every view, drawn on a view that does not hold it (FEAT-0015). */
  elsewhere?: boolean;
  /** Kept on every view of the workspace rather than on this view's desk alone. */
  everyView?: boolean;
}

export interface CardHandlers {
  open: (card: CardModel) => void;
  remove: (card: CardModel) => void;
  /** Keep this note on every view, or give it back to this one (FEAT-0015). */
  everyView: (card: CardModel) => void;
  /** A drag started on this card. The renderer owns the pointer from here. */
  grab: (card: CardModel, element: HTMLElement, event: PointerEvent) => void;
}

export class CardPool {
  private readonly container: HTMLElement;
  private readonly handlers: CardHandlers;
  private readonly pool: HTMLElement[] = [];
  private readonly models = new Map<string, CardModel>();
  /**
   * The face section of the view being drawn.
   *
   * A card's face is a property of the VIEW, not of this class: the pool paints
   * what the description says. Until a view is chosen there is nothing to say,
   * so a card shows what every card has.
   */
  private faces: FaceSection = PLAIN_FACES;

  constructor(container: HTMLElement, handlers: CardHandlers) {
    this.container = container;
    this.handlers = handlers;
  }

  /** Draw with this view's faces from here on. */
  useFaces(faces: FaceSection): void {
    this.faces = faces;
  }

  /** Absolute positions on a desk, or a flowing strip when `flow` is set. */
  render(cards: PlacedCard[], currentNoteId: string | null, flow = false): void {
    this.container.classList.toggle('flow', flow);
    for (let i = 0; i < cards.length; i += 1) {
      const entry = cards[i] as PlacedCard;
      let element = this.pool[i];
      if (element === undefined) {
        element = this.makeElement();
        this.pool.push(element);
        this.container.appendChild(element);
      }
      this.paint(element, entry, currentNoteId, flow);
      element.hidden = false;
    }
    // Extra elements are hidden and kept, not destroyed: the next view reuses them.
    for (let i = cards.length; i < this.pool.length; i += 1) {
      const element = this.pool[i] as HTMLElement;
      element.hidden = true;
      element.removeAttribute('style');
    }
  }

  size(): number {
    return this.pool.length;
  }

  /** The element drawing a note right now, for a drag that is already in hand. */
  elementFor(noteId: string): HTMLElement | null {
    return this.pool.find((el) => !el.hidden && el.dataset['noteId'] === noteId) ?? null;
  }

  private makeElement(): HTMLElement {
    const element = document.createElement('article');
    element.className = 'card';
    element.setAttribute('role', 'button');
    element.tabIndex = 0;
    element.innerHTML =
      '<span class="id"></span><button type="button" class="every" title="Keep this note on every view (V)" aria-label="Keep this note on every view" aria-pressed="false">⧉</button><button type="button" class="remove" title="Take this card off the desk" aria-label="Take this card off the desk">×</button>' +
      '<span class="title"></span><span class="face"></span><span class="owed"></span>';

    const model = (): CardModel | undefined => {
      const noteId = element.dataset['noteId'];
      return noteId === undefined ? undefined : this.models.get(noteId);
    };

    element.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('.remove, .every') !== null) return;
      // A drag that ended on this card is not a click on it.
      if (element.dataset['dragged'] === 'true') {
        delete element.dataset['dragged'];
        return;
      }
      const card = model();
      if (card !== undefined) this.handlers.open(card);
    });
    element.addEventListener('keydown', (event) => {
      if ((event.key === 'v' || event.key === 'V') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        const card = model();
        if (card !== undefined) this.handlers.everyView(card);
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const card = model();
      if (card !== undefined) this.handlers.open(card);
    });
    element.querySelector('.every')?.addEventListener('click', (event) => {
      event.stopPropagation();
      const card = model();
      if (card !== undefined) this.handlers.everyView(card);
    });
    element.querySelector('.remove')?.addEventListener('click', (event) => {
      event.stopPropagation();
      const card = model();
      if (card !== undefined) this.handlers.remove(card);
    });
    element.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('.remove, .every') !== null) return;
      const card = model();
      if (card !== undefined) this.handlers.grab(card, element, event);
    });
    return element;
  }

  private paint(element: HTMLElement, entry: PlacedCard, currentNoteId: string | null, flow: boolean): void {
    const { card } = entry;
    this.models.set(card.noteId, card);
    element.dataset['noteId'] = card.noteId;
    element.dataset['band'] = bandFor(card.status);
    element.dataset['type'] = card.noteType;
    const spec = specFor(this.faces, card);
    const face = faceFor(card, this.faces);
    element.dataset['face'] = face.kind;
    element.setAttribute('aria-current', String(card.noteId === currentNoteId));
    element.dataset['elsewhere'] = String(entry.elsewhere === true);
    element.dataset['everyView'] = String(entry.everyView === true);
    element.querySelector('.every')?.setAttribute('aria-pressed', String(entry.everyView === true));

    setText(element, '.id', card.noteId);
    setText(element, '.title', card.title);
    // The fields the description asked for, read off the note by name. Empty
    // for every project-os view today; a vault's character shows its role and
    // its archetype here without anything in this file knowing what those are.
    element.dataset['fields'] = fieldsFor(spec, card.frontmatter).map((f) => f.value).join(' · ');
    setText(element, '.owed', card.owed ? (card.owedVerb ?? 'needs you') : '');
    const faceElement = element.querySelector('.face');
    if (faceElement !== null) {
      if (face.kind === 'progress') {
        const pct = face.total === 0 ? 0 : Math.round((face.done / face.total) * 100);
        faceElement.innerHTML = '<span class="bar"><span class="fill"></span></span><span class="count"></span>';
        const fill = faceElement.querySelector('.fill') as HTMLElement | null;
        if (fill !== null) fill.style.width = `${pct}%`;
        setText(faceElement as HTMLElement, '.count', faceText(card, this.faces));
      } else {
        faceElement.textContent = faceText(card, this.faces);
      }
    }

    if (flow) {
      element.removeAttribute('style');
    } else {
      element.style.left = `${entry.x}px`;
      element.style.top = `${entry.y}px`;
    }
  }
}

/** What a card wears before a view has said anything: what every card has. */
const PLAIN_FACES: FaceSection = {
  default: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'none' },
  byType: {},
};

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector(selector);
  if (node !== null) node.textContent = value;
}
