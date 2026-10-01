/**
 * The lines between an opened note and the cards gathered round it
 * (FEAT-0017, TASK-0104).
 *
 * Until TASK-0104 this file also drew the neighbours, as small copies of
 * cards the field was already drawing. The copies are gone: the field's own
 * cards are moved to their seats (ISS-0070), and what is left here is the
 * line from the document's edge to each of them. The lines are SVG, so
 * resting on one is a pointer over an element rather than a hit test against
 * a canvas: solid for a link the document makes, dashed for a link made to
 * it, heavier when the link runs both ways.
 */
import { type Point, type Rect, edgeAnchor } from '../shared/focus-ring.js';

export interface LinkLine {
  /** The note at the far end. */
  id: string;
  /** The document the line starts from. */
  fromId: string;
  /** 'out': the document links to it; 'in': it links to the document; 'both'. */
  direction: 'out' | 'in' | 'both';
  /** The document the line starts from, as it is drawn now. */
  from: Rect;
  /** The middle of the card or document at the far end. */
  to: Point;
  /** A second line to a note shared with another open document: drawn thinner. */
  shared?: boolean;
  /** Dimmed because an emphasis is on and this link is not part of it. */
  quiet?: boolean;
}

export interface LinkLineHandlers {
  /** The pointer rests on a line, or leaves it (null), at this point of the field. */
  restLine(id: string | null, at: Point): void;
}

const SVG = 'http://www.w3.org/2000/svg';
/** How long the pointer rests on a line before its sentence is asked for. */
export const LINE_REST_MS = 450;

export class LinkLines {
  private readonly layer: HTMLElement;
  private readonly handlers: LinkLineHandlers;
  private readonly svg: SVGSVGElement;
  private readonly lines = new Map<string, SVGLineElement>();
  /** What each line was last drawn as, so a line that has not changed is not written again. */
  private readonly drawn = new Map<string, string>();
  private size = '';
  private restTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(layer: HTMLElement, handlers: LinkLineHandlers) {
    this.layer = layer;
    this.handlers = handlers;
    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('link-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    this.layer.appendChild(this.svg);
  }

  /** How many lines are drawn now, for the smoke run. */
  count(): number {
    return this.lines.size;
  }

  /**
   * Draw these lines. `origin` is how far the whole desk is shifted from
   * where it rests: the lines are kept in the desk's own coordinates and the
   * drawing is moved by that much, so when the field turns and the desk
   * shifts as one, one transform changes and no line is rewritten. With two
   * hundred lines, rewriting each on every frame was a twelfth of a frame.
   */
  paint(lines: readonly LinkLine[], opacity: number, origin: Point = { x: 0, y: 0 }): void {
    this.layer.hidden = lines.length === 0;
    if (lines.length === 0) {
      this.clear();
      return;
    }
    const size = `${this.layer.clientWidth}x${this.layer.clientHeight}`;
    if (size !== this.size) {
      this.size = size;
      this.svg.setAttribute('width', String(this.layer.clientWidth));
      this.svg.setAttribute('height', String(this.layer.clientHeight));
    }
    this.svg.style.opacity = String(opacity);
    this.svg.style.transform = `translate(${origin.x.toFixed(1)}px, ${origin.y.toFixed(1)}px)`;
    const live = new Set<string>();
    for (const item of lines) {
      // One element per pair of ends, so a document being dragged moves its
      // lines rather than making new ones every frame.
      const name = `${item.fromId}>${item.id}`;
      live.add(name);
      let line = this.lines.get(name);
      if (line === undefined) {
        line = this.makeLine(item.id);
        this.lines.set(name, line);
      }
      const from = edgeAnchor(item.from, item.to);
      const x1 = (from.x - origin.x).toFixed(1);
      const y1 = (from.y - origin.y).toFixed(1);
      const x2 = (item.to.x - origin.x).toFixed(1);
      const y2 = (item.to.y - origin.y).toFixed(1);
      const kind = `link-line ${item.direction}${item.shared === true ? ' shared' : ''}${item.quiet === true ? ' quiet' : ''}`;
      const now = `${x1} ${y1} ${x2} ${y2} ${kind}`;
      if (this.drawn.get(name) === now) continue;
      this.drawn.set(name, now);
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('class', kind);
      line.dataset['from'] = item.fromId;
    }
    for (const [name, line] of this.lines) {
      if (live.has(name)) continue;
      line.remove();
      this.lines.delete(name);
      this.drawn.delete(name);
    }
  }

  /** The desk shifted and nothing else changed: move the drawing, rewrite no line. */
  move(origin: Point, opacity: number): void {
    this.svg.style.opacity = String(opacity);
    this.svg.style.transform = `translate(${origin.x.toFixed(1)}px, ${origin.y.toFixed(1)}px)`;
  }

  clear(): void {
    this.layer.hidden = true;
    for (const line of this.lines.values()) line.remove();
    this.lines.clear();
    this.drawn.clear();
    if (this.restTimer !== null) clearTimeout(this.restTimer);
    this.restTimer = null;
  }

  private makeLine(id: string): SVGLineElement {
    const line = document.createElementNS(SVG, 'line');
    line.dataset['noteId'] = id;
    const box = (): DOMRect => this.layer.getBoundingClientRect();
    line.addEventListener('pointerenter', (event) => {
      if (this.restTimer !== null) clearTimeout(this.restTimer);
      const at = { x: event.clientX - box().left, y: event.clientY - box().top };
      this.restTimer = setTimeout(() => this.handlers.restLine(id, at), LINE_REST_MS);
    });
    line.addEventListener('pointerleave', () => {
      if (this.restTimer !== null) clearTimeout(this.restTimer);
      this.restTimer = null;
      this.handlers.restLine(null, { x: 0, y: 0 });
    });
    this.svg.appendChild(line);
    return line;
  }
}
