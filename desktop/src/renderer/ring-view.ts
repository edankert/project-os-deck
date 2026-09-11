/**
 * The ring on the screen: the mini notes around the note in the middle, and
 * a line from the pane's edge to each (FEAT-0017, TASK-0069).
 *
 * Geometry comes from `shared/focus-ring.ts`; this draws it. The mini notes
 * are buttons, so Tab reaches them in ring order and Enter opens one. The
 * lines are SVG, so resting on one is a pointer over an element rather than a
 * hit test against a canvas: solid for a link the note in the middle makes,
 * dashed for a link made to it.
 */
import { MINI, type Point, type Rect, arcPoint, ease } from '../shared/focus-ring.js';

export interface RingItem {
  id: string;
  title: string;
  /** 'out': the note in the middle links to it; 'in': it links to that note; 'both'. */
  direction: 'out' | 'in' | 'both';
  held: boolean;
  shared: boolean;
  /** Where it comes from: where its card was drawn, or the edge on its side. */
  start: Point;
  /** Its place on the ring. */
  seat: Point;
}

export interface RingPaint {
  centre: Point;
  /** The pane in the middle, where it is drawn now. */
  pane: Rect;
  items: RingItem[];
  /** How far through the gathering: 0 at the start, 1 settled. */
  t: number;
  more: { count: number; place: Point } | null;
  /** The note in the middle, for the ring's name. */
  focusId: string;
}

export interface RingHandlers {
  /** A mini note was clicked, or Enter was pressed on it. */
  open(id: string): void;
  /** The pointer rests on a mini note, or leaves it (null). */
  rest(id: string | null): void;
  /** The pointer rests on a line, or leaves it (null), at this point of the field. */
  restLine(id: string | null, at: Point): void;
  /** "+N more" was activated. */
  more(): void;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Where the line from the pane's centre toward `to` leaves the pane's edge. */
export function edgeAnchor(pane: Rect, to: Point): Point {
  const cx = pane.left + pane.width / 2;
  const cy = pane.top + pane.height / 2;
  const dx = to.x - cx;
  const dy = to.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx === 0 ? Infinity : pane.width / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : pane.height / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

export class RingView {
  private readonly layer: HTMLElement;
  private readonly handlers: RingHandlers;
  private readonly svg: SVGSVGElement;
  private readonly wiresGroup: SVGGElement;
  private readonly cards = new Map<string, HTMLButtonElement>();
  private readonly lines = new Map<string, SVGLineElement>();
  private moreCard: HTMLButtonElement | null = null;
  private drawn = new Map<string, Point>();
  private restTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(layer: HTMLElement, handlers: RingHandlers) {
    this.layer = layer;
    this.handlers = handlers;
    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('ring-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    this.wiresGroup = document.createElementNS(SVG, 'g');
    this.wiresGroup.classList.add('ring-wires');
    this.svg.appendChild(this.wiresGroup);
    this.layer.appendChild(this.svg);
    this.layer.setAttribute('role', 'list');
  }

  /** Whether anything is on the ring now. */
  isShown(): boolean {
    return !this.layer.hidden;
  }

  /** The ids on the ring in ring order: clockwise from the top. */
  order(): string[] {
    return [...this.cards.keys()];
  }

  /** Where each mini note is drawn now, in field coordinates. */
  positions(): Map<string, Point> {
    return new Map(this.drawn);
  }

  paint(p: RingPaint): void {
    this.layer.hidden = false;
    this.layer.setAttribute('aria-label', `Notes joined to ${p.focusId}`);
    const box = this.layer.getBoundingClientRect();
    this.svg.setAttribute('width', String(Math.round(box.width)));
    this.svg.setAttribute('height', String(Math.round(box.height)));
    const live = new Set<string>();
    const e = ease(p.t);
    this.drawn = new Map();
    for (const item of p.items) {
      live.add(item.id);
      const at = arcPoint(item.start, item.seat, p.centre, e);
      this.drawn.set(item.id, at);
      let card = this.cards.get(item.id);
      if (card === undefined) {
        card = this.makeCard(item.id);
        this.cards.set(item.id, card);
      }
      // Appended in ring order every paint, so Tab walks the ring clockwise.
      this.layer.appendChild(card);
      card.dataset['direction'] = item.direction;
      card.classList.toggle('held', item.held);
      card.classList.toggle('shared', item.shared);
      (card.querySelector('.ring-id') as HTMLElement).textContent = item.id;
      (card.querySelector('.ring-title') as HTMLElement).textContent = item.title;
      (card.querySelector('.ring-mark') as HTMLElement).textContent = item.direction === 'both' ? '⇄ both ways' : item.held ? 'held' : '';
      card.setAttribute('aria-label', `${item.id} ${item.title}, ${item.direction === 'out' ? 'linked from' : item.direction === 'in' ? 'links to' : 'linked both ways with'} ${p.focusId}${item.held ? ', held' : ''}`);
      card.style.transform = `translate3d(${(at.x - MINI.width / 2).toFixed(1)}px, ${(at.y - MINI.height / 2).toFixed(1)}px, 0)`;
      let line = this.lines.get(item.id);
      if (line === undefined) {
        line = this.makeLine(item.id);
        this.lines.set(item.id, line);
      }
      const from = edgeAnchor(p.pane, at);
      line.setAttribute('x1', from.x.toFixed(1));
      line.setAttribute('y1', from.y.toFixed(1));
      line.setAttribute('x2', at.x.toFixed(1));
      line.setAttribute('y2', at.y.toFixed(1));
      line.setAttribute('class', `ring-line ${item.direction}`);
    }
    for (const [id, card] of this.cards) {
      if (live.has(id)) continue;
      card.remove();
      this.cards.delete(id);
    }
    for (const [id, line] of this.lines) {
      if (live.has(id)) continue;
      line.remove();
      this.lines.delete(id);
    }
    if (p.more !== null) {
      if (this.moreCard === null) {
        this.moreCard = document.createElement('button');
        this.moreCard.type = 'button';
        this.moreCard.className = 'ring-card ring-more';
        this.moreCard.addEventListener('click', (event) => {
          event.stopPropagation();
          this.handlers.more();
        });
      }
      this.layer.appendChild(this.moreCard);
      this.moreCard.textContent = `+${p.more.count} more`;
      this.moreCard.setAttribute('aria-label', `${p.more.count} more notes joined to ${p.focusId}, listed in the navigator`);
      this.moreCard.style.transform = `translate3d(${(p.more.place.x - MINI.width / 2).toFixed(1)}px, ${(p.more.place.y - MINI.height / 2).toFixed(1)}px, 0)`;
      this.moreCard.style.opacity = String(e);
    } else if (this.moreCard !== null) {
      this.moreCard.remove();
      this.moreCard = null;
    }
  }

  /** Wires from a mini note to the points of its own neighbours on screen (the reach, TASK-0056). */
  wires(from: Point | null, to: Point[]): void {
    this.wiresGroup.replaceChildren();
    if (from === null) return;
    for (const p of to) {
      const w = document.createElementNS(SVG, 'line');
      w.setAttribute('class', 'ring-wire');
      w.setAttribute('x1', from.x.toFixed(1));
      w.setAttribute('y1', from.y.toFixed(1));
      w.setAttribute('x2', p.x.toFixed(1));
      w.setAttribute('y2', p.y.toFixed(1));
      this.wiresGroup.appendChild(w);
    }
  }

  /** A moment's highlight on every mini note: the reduced-motion arrival. */
  highlight(): void {
    for (const card of this.cards.values()) card.classList.add('highlight');
    setTimeout(() => {
      for (const card of this.cards.values()) card.classList.remove('highlight');
    }, 1600);
  }

  clear(): void {
    this.layer.hidden = true;
    for (const card of this.cards.values()) card.remove();
    for (const line of this.lines.values()) line.remove();
    this.cards.clear();
    this.lines.clear();
    this.moreCard?.remove();
    this.moreCard = null;
    this.drawn = new Map();
    this.wiresGroup.replaceChildren();
  }

  private makeCard(id: string): HTMLButtonElement {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ring-card';
    card.dataset['noteId'] = id;
    card.setAttribute('role', 'listitem');
    card.innerHTML = '<span class="ring-id"></span><span class="ring-mark"></span><span class="ring-title"></span>';
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      this.handlers.open(id);
    });
    card.addEventListener('pointerenter', () => this.handlers.rest(id));
    card.addEventListener('pointerleave', () => this.handlers.rest(null));
    card.addEventListener('focus', () => this.handlers.rest(id));
    card.addEventListener('blur', () => this.handlers.rest(null));
    return card;
  }

  private makeLine(id: string): SVGLineElement {
    const line = document.createElementNS(SVG, 'line');
    line.dataset['noteId'] = id;
    const box = (): DOMRect => this.layer.getBoundingClientRect();
    line.addEventListener('pointerenter', (event) => {
      if (this.restTimer !== null) clearTimeout(this.restTimer);
      const at = { x: event.clientX - box().left, y: event.clientY - box().top };
      this.restTimer = setTimeout(() => this.handlers.restLine(id, at), 450);
    });
    line.addEventListener('pointerleave', () => {
      if (this.restTimer !== null) clearTimeout(this.restTimer);
      this.restTimer = null;
      this.handlers.restLine(null, { x: 0, y: 0 });
    });
    this.svg.insertBefore(line, this.wiresGroup);
    return line;
  }
}
