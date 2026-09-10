/**
 * Glass: the field where depth carries priority (FEAT-0009), the desk lifted
 * out of it (FEAT-0010), and the hands that arrange it (FEAT-0014).
 *
 * The renderer is the DES-0002 review's hybrid. The front and mid bands are
 * real elements, one per note and never recycled for a different note, drawn
 * with the faces Spread already has. The quiet band is one canvas of small
 * tiles, and the same canvas carries the wires a reach draws. Distance is fog
 * and less detail, never blur, and nothing over the moving field carries a
 * backdrop filter.
 *
 * What stands where is decided by two pure modules: `shared/field.ts` deals
 * the notes into bands by the view's description, and `shared/slots.ts`
 * turns the bands into positions on a cylinder. This file draws what they
 * decided and turns the person's hands into store actions.
 *
 * **The containers are pointer-transparent and the cards are not.** DES-0002
 * lost two revisions to a click that never landed, because a `preserve-3d`
 * container is an invisible pane in front of everything it contains. Nothing
 * here uses `preserve-3d`: each card is placed by a 2D transform computed from
 * its slot, and the smoke run drives a real pointer at a card's centre.
 */
import type { CardGroup, CardModel, DeckState, DeskCard } from '../shared/types.js';
import type { Description, FaceSection } from '../shared/description.js';
import type { DeckAction } from '../shared/store-state.js';
import { deskCardsOf, pulledIn, pushedIn } from '../shared/store-state.js';
import { type FieldDeal, type FieldEntry, dealField, fieldEntries, pushRefusal } from '../shared/field.js';
import {
  type Obstacle,
  type Projection,
  type Slot,
  CARD_BOX,
  DEG,
  FieldModel,
  TILE_BOX,
  cardRect,
  cardTransform,
  norm,
  obstaclesFor,
  project,
} from '../shared/slots.js';
import { type NoteContext, cardFromContext, neighboursOf } from '../shared/sidecar-client.js';
import { REACH_HOLD_MS, REACH_REST_MS, joinedTo, sharedAmong } from '../shared/neighbourhood.js';
import {
  PANE_DEFAULT_HEIGHT,
  PANE_DEFAULT_WIDTH,
  PANE_HEADER_HEIGHT,
  PANE_MIN_HEIGHT,
  PANE_MIN_WIDTH,
  snapBelowHeaders,
} from '../shared/panes.js';
import {
  type Edge,
  type PointerSample,
  type ThrowTarget,
  THROW_EDGE_PX,
  edgeNear,
  recogniseThrow,
} from '../shared/throw.js';
import { bandFor, faceFor, faceText } from '../shared/faces.js';
import type { GraphEdge, GraphNode } from '../shared/graph.js';
import { type OrbitLayout, orbitSlot } from '../shared/orbit.js';

/** What the orbit arrangement draws: the whole link graph and its kept layout (FEAT-0001). */
export interface OrbitData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: OrbitLayout;
  bridges: Array<{ a: string; b: string; side: number }>;
}

/**
 * The three treatments DES-0001 draws for the orbit (TASK-0005). They are all
 * drawn, over the same real data, and switchable; which one is kept is
 * Edwin's decision, recorded in DES-0001, and nothing else depends on it.
 */
export type Treatment = 'constellation' | 'glass' | 'blocks';
export const TREATMENTS: readonly Treatment[] = ['constellation', 'glass', 'blocks'];

/** How many of the orbit's most linked-to notes are drawn as cards; the rest are dots. */
export const ORBIT_CARDS = 24;
/** How long the orbit waits, untouched, before it drifts; and how fast it drifts. */
export const IDLE_AFTER_MS = 4000;
export const IDLE_DEGREES_PER_SECOND = 1.5;

/**
 * How far a card is dragged toward or away from the person before it counts
 * as a pull or a push, in pixels (TASK-0053). Down and larger is toward;
 * up and smaller is away. Short enough to be a flick, long enough that a
 * click with a trembling hand is still a click.
 */
export const PULL_THRESHOLD_PX = 56;
/** How far a pointer moves before a press is a drag rather than a click. */
export const CLICK_SLOP_PX = 5;
/** How much one arrow key turns the field. */
export const TURN_STEP = 14 * DEG;
/** Radians of turn per pixel of drag. */
export const TURN_PER_PX = 0.0042;
/** How long a view switch, a lift's turn and a throw's flight take. */
export const MOVE_MS = 1000;

export interface GlassHooks {
  state(): DeckState;
  /** Only the shell changes the desk; a served page follows it (TASK-0057). */
  canArrange(): boolean;
  dispatch(action: DeckAction): Promise<void>;
  /** Focus a note and show it in the reader, which carries the verbs. */
  open(card: CardModel): Promise<void>;
  say(message: string, isError?: boolean): void;
  /** A note's neighbourhood, at most one request per note per index revision. */
  context(noteId: string): Promise<NoteContext>;
  peekContext(noteId: string): NoteContext | undefined;
  /** The sidecar's rendered HTML for a note, for a pane's body. */
  noteHtml(card: CardModel): Promise<string>;
  /** The places a throw toward this edge could land. Empty where there are no windows. */
  targets(edge: Edge): Promise<ThrowTarget[]>;
  throwTo(target: ThrowTarget, card: CardModel, edge: Edge): Promise<void>;
  /** A change arrived while the field was on screen; applying it is the person's call (TASK-0032). */
  applyPending(): void;
  reducedMotion(): boolean;
  /** The sentence an orbit edge's link sits in (TASK-0003). */
  sentence(edge: GraphEdge): Promise<string>;
}

export interface GlassInput {
  groups: CardGroup[];
  view: Description | null;
  faces: FaceSection;
  /** How many notes changed under the field since it was dealt. */
  pending: number;
}

interface Elements {
  area: HTMLElement;
  field: HTMLElement;
  canvas: HTMLCanvasElement;
  cards: HTMLElement;
  sectors: HTMLElement;
  panes: HTMLElement;
  frontLabel: HTMLElement;
  owedCount: HTMLElement;
  handCount: HTMLElement;
  letGo: HTMLButtonElement;
  overflow: HTMLElement;
  pendingChip: HTMLButtonElement;
  deskCount: HTMLElement;
  compass: HTMLElement;
  heading: HTMLElement;
  behind: HTMLElement;
  lookAhead: HTMLButtonElement;
  lookBehind: HTMLButtonElement;
  fieldSay: HTMLElement;
  strip: HTMLElement;
  empty: HTMLElement;
  callout: HTMLElement;
  treatments: HTMLElement;
}

function must(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`the page has no #${id}`);
  return found;
}

export function glassElements(): Elements {
  return {
    area: must('field-area'),
    field: must('field'),
    canvas: must('field-canvas') as HTMLCanvasElement,
    cards: must('field-cards'),
    sectors: must('field-sectors'),
    panes: must('field-panes'),
    frontLabel: must('front-label'),
    owedCount: must('owed-count'),
    handCount: must('hand-count'),
    letGo: must('let-go') as HTMLButtonElement,
    overflow: must('field-overflow'),
    pendingChip: must('pending-chip') as HTMLButtonElement,
    deskCount: must('glass-desk-count'),
    compass: must('compass'),
    heading: must('compass-heading'),
    behind: must('compass-behind'),
    lookAhead: must('look-ahead') as HTMLButtonElement,
    lookBehind: must('look-behind') as HTMLButtonElement,
    fieldSay: must('field-say'),
    strip: must('target-strip'),
    empty: must('field-empty'),
    callout: must('edge-callout'),
    treatments: must('treatments'),
  };
}

/** The status colours the stylesheet uses, for the canvas, which cannot read CSS variables cheaply. */
const TILE_COLOURS: Record<string, string> = {
  done: '#4d8f55',
  archived: '#3f6a45',
  active: '#5b7fc4',
  pending: '#b8904f',
  blocked: '#c9656f',
  planned: '#6b7390',
};

export class GlassField {
  private readonly el: Elements;
  private readonly hooks: GlassHooks;
  readonly model = new FieldModel<string>((id) => this.entries.get(id)?.groupKey ?? '');
  private input: GlassInput = { groups: [], view: null, faces: { default: { title: 'title', subtitle: null, image: null, fields: [], measure: 'none' }, byType: {} }, pending: 0 };
  private entries = new Map<string, FieldEntry>();
  private deal: FieldDeal | null = null;
  /** One element per note, keyed by note id and never repainted as another note. */
  private readonly cardEls = new Map<string, HTMLElement>();
  private readonly paneEls = new Map<string, HTMLElement>();
  private readonly paneBodies = new Map<string, string>();
  private shared = new Map<string, number>();
  private joined = new Set<string>();
  private held: DeskCard[] = [];
  private active = false;
  private turning = false;
  private flight: number | null = null;
  /** The note being reached for, and the wires its neighbours get. */
  private reach: { noteId: string; neighbours: Set<string> } | null = null;
  private reachTimer: ReturnType<typeof setTimeout> | null = null;
  private highlight: string | null = null;
  private viewport = { width: 800, height: 600 };
  private lastHeldKey = '';
  /** A note was lifted and the field has not yet turned to face its neighbourhood. */
  private faceOnArrival = false;
  private frameTimes: number[] | null = null;
  private animateTimer: ReturnType<typeof setTimeout> | null = null;
  /** Which arrangement the field is in: the view's bands, or the orbit of the whole graph. */
  private arrangement: 'bands' | 'orbit' = 'bands';
  private orbit: OrbitData | null = null;
  private treatment: Treatment = 'constellation';
  /** What the last paint drew on the canvas, for the pointer to find. */
  private dots: Array<{ x: number; y: number; r: number; id: string }> = [];
  private segments: Array<{ x1: number; y1: number; x2: number; y2: number; edge: GraphEdge }> = [];
  private readonly sentences = new Map<string, string>();
  private idle: { timer: ReturnType<typeof setTimeout> | null; frame: number | null; last: number } = { timer: null, frame: null, last: 0 };
  private bridgeKeys = new Set<string>();

  constructor(el: Elements, hooks: GlassHooks) {
    this.el = el;
    this.hooks = hooks;
    this.wire();
  }

  /** Whether Glass is the surface on screen. Nothing is drawn or measured while it is not. */
  setActive(on: boolean): void {
    this.active = on;
    this.el.area.hidden = !on;
    if (on) {
      this.measure();
      this.redeal(false);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Arrange the field by the whole link graph, or by the view's bands.
   *
   * The orbit is one arrangement of the same field: the same cards, the same
   * canvas, the same compass, panes and hands. What changes is where a note
   * stands, which is the kept layout rather than the band function.
   */
  setArrangement(arrangement: 'bands' | 'orbit', data: OrbitData | null = this.orbit): void {
    const changed = arrangement !== this.arrangement || data !== this.orbit;
    this.arrangement = arrangement;
    this.orbit = data;
    this.bridgeKeys = new Set((data?.bridges ?? []).flatMap((b) => [`${b.a} ${b.b}`, `${b.b} ${b.a}`]));
    this.el.field.dataset['arrangement'] = arrangement;
    this.el.field.dataset['treatment'] = arrangement === 'orbit' ? this.treatment : '';
    this.el.treatments.hidden = arrangement !== 'orbit';
    this.paintTreatments();
    if (changed && this.active) this.redeal(true);
    this.scheduleIdle();
  }

  getArrangement(): 'bands' | 'orbit' {
    return this.arrangement;
  }

  setTreatment(treatment: Treatment): void {
    this.treatment = treatment;
    this.el.field.dataset['treatment'] = this.arrangement === 'orbit' ? treatment : '';
    this.paintTreatments();
    this.render(false);
  }

  getTreatment(): Treatment {
    return this.treatment;
  }

  private paintTreatments(): void {
    for (const button of Array.from(this.el.treatments.querySelectorAll('button'))) {
      button.setAttribute('aria-pressed', String(button.dataset['treatment'] === this.treatment));
    }
  }

  /** The dots and the edges the last paint drew, for the smoke run and the measurement. */
  canvasCounts(): { dots: number; edges: number } {
    return { dots: this.dots.length, edges: this.segments.length };
  }

  /** The middle of a link drawn now and far from any dot, for the smoke run to rest on. */
  edgeSample(): { x: number; y: number; source: string; target: string | null } | null {
    const box = this.el.field.getBoundingClientRect();
    const clear = (x: number, y: number): boolean => {
      const hit = document.elementFromPoint(box.left + x, box.top + y) as HTMLElement | null;
      return hit !== null && hit.closest('.field-card, .pane, .compass, .field-say, .field-bar, .sector-label') === null;
    };
    for (const seg of this.segments) {
      const x = (seg.x1 + seg.x2) / 2;
      const y = (seg.y1 + seg.y2) / 2;
      if (Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) < 60) continue;
      if (this.dotAt(x, y) !== null) continue;
      if (this.edgeAt(x, y) !== seg.edge) continue;
      if (x < 40 || y < 40 || x > this.viewport.width - 260 || y > this.viewport.height - 80) continue;
      if (!clear(x, y)) continue;
      return { x, y, source: seg.edge.source, target: seg.edge.target };
    }
    return null;
  }

  /** A dot drawn now, not under a card, for the smoke run to click. */
  dotSample(): { x: number; y: number; id: string } | null {
    const box = this.el.field.getBoundingClientRect();
    for (const d of this.dots) {
      if (d.r === 0 || d.x < 40 || d.y < 40 || d.x > this.viewport.width - 260 || d.y > this.viewport.height - 80) continue;
      if (this.dotAt(d.x, d.y) !== d.id) continue;
      const hit = document.elementFromPoint(box.left + d.x, box.top + d.y) as HTMLElement | null;
      if (hit === null || hit.closest('.field-card, .pane, .compass, .field-say, .field-bar') !== null) continue;
      return { x: d.x, y: d.y, id: d.id };
    }
    return null;
  }

  /** Where a node or a card is on screen, in the field's own coordinates. */
  dotFor(noteId: string): { x: number; y: number } | null {
    const dot = this.dots.find((d) => d.id === noteId);
    if (dot !== undefined) return { x: dot.x, y: dot.y };
    return null;
  }

  /** "Show this in the field": fly the orbit to a note (TASK-0004). */
  showInOrbit(noteId: string): void {
    const slot = this.model.current.slots.get(noteId);
    if (slot === undefined) return;
    this.flyTo(slot.theta, noteId);
  }

  /** New groups, a new view, a state change: deal again and draw. */
  update(input: GlassInput): void {
    const viewChanged = input.view?.id !== this.input.view?.id || input.groups !== this.input.groups;
    this.input = input;
    if (!this.active) return;
    this.measure();
    this.redeal(viewChanged);
  }

  /** The note ids the field draws as elements now, for the smoke run and the measurement. */
  drawnNotes(): string[] {
    return [...this.cardEls.entries()].filter(([, e]) => !e.classList.contains('leaving')).map(([id]) => id);
  }

  /** Where a note is on the field now: its band, and whether it is in sight. */
  whereIs(noteId: string): { band: string; visible: boolean; x: number; y: number } | null {
    const slot = this.model.current.slots.get(noteId);
    if (slot === undefined) return null;
    const p = project(slot, this.model.yaw, this.viewport);
    return { band: slot.band, visible: p.visible, x: p.x, y: p.y };
  }

  /** The counts the measurement records: elements in the document and tiles on the canvas. */
  counts(): { elements: number; tiles: number; cards: number } {
    let tiles = 0;
    for (const slot of this.model.current.slots.values()) {
      if (slot.band === 'deep' && project(slot, this.model.yaw, this.viewport).visible) tiles += 1;
    }
    return { elements: document.getElementsByTagName('*').length, tiles, cards: this.drawnNotes().length };
  }

  /**
   * Turn the field for `ms` and report the frame times, for TASK-0034.
   *
   * Frames are recorded only while the document is visible and has focus,
   * because a background window's animation frames are suspended and every
   * number DES-0002 carried was taken in one.
   */
  measureTurn(ms: number, radiansPerSecond = Math.PI / 2): Promise<{ frames: number; median: number; p95: number; visible: boolean; focused: boolean }> {
    return new Promise((resolve) => {
      this.frameTimes = [];
      let last = performance.now();
      const start = last;
      const step = (now: number): void => {
        if (document.visibilityState === 'visible' && document.hasFocus()) this.frameTimes?.push(now - last);
        const dt = now - last;
        last = now;
        this.model.turn((radiansPerSecond * dt) / 1000);
        this.el.field.classList.add('turning');
        this.render();
        if (now - start < ms) {
          requestAnimationFrame(step);
          return;
        }
        this.el.field.classList.remove('turning');
        const times = (this.frameTimes ?? []).slice(1).sort((a, b) => a - b);
        this.frameTimes = null;
        const at = (q: number): number => (times.length === 0 ? 0 : (times[Math.min(times.length - 1, Math.floor(q * times.length))] as number));
        resolve({
          frames: times.length,
          median: at(0.5),
          p95: at(0.95),
          visible: document.visibilityState === 'visible',
          focused: document.hasFocus(),
        });
      };
      requestAnimationFrame(step);
    });
  }

  // ---- the deal ----

  private measure(): void {
    const box = this.el.field.getBoundingClientRect();
    this.viewport = { width: Math.max(320, box.width), height: Math.max(240, box.height) };
    const ratio = window.devicePixelRatio || 1;
    this.el.canvas.width = Math.round(this.viewport.width * ratio);
    this.el.canvas.height = Math.round(this.viewport.height * ratio);
    this.el.canvas.style.width = `${this.viewport.width}px`;
    this.el.canvas.style.height = `${this.viewport.height}px`;
  }

  private workspaceId(): string | null {
    return this.hooks.state().workspaceId;
  }

  private redeal(animate: boolean): void {
    if (this.arrangement === 'orbit') {
      this.redealOrbit(animate);
      return;
    }
    const state = this.hooks.state();
    const ws = state.workspaceId;
    this.held = deskCardsOf(state, ws);
    const heldIds = this.held.map((c) => c.noteId);
    const contexts = new Map<string, NoteContext>();
    const missing: string[] = [];
    for (const id of heldIds) {
      const context = this.hooks.peekContext(id);
      if (context === undefined) missing.push(id);
      else contexts.set(id, context);
    }
    this.joined = joinedTo(heldIds, contexts);
    this.shared = sharedAmong(heldIds, contexts);
    const known = new Set<string>();
    for (const group of this.input.groups) for (const card of group.cards) known.add(card.noteId);
    const extra: CardModel[] = [];
    for (const context of contexts.values()) {
      for (const item of neighboursOf(context)) {
        if (!known.has(item.id) && !heldIds.includes(item.id)) extra.push(cardFromContext(item));
      }
    }
    const hand = {
      held: new Set(heldIds),
      joined: this.joined,
      pulled: new Set(pulledIn(state, ws)),
      pushed: new Set(pushedIn(state, ws)),
    };
    const entries = fieldEntries(this.input.groups, hand, extra);
    this.entries = new Map(entries.map((e) => [e.card.noteId, e]));
    if (this.input.view === null) {
      this.deal = null;
      this.model.deal({ front: [], mid: [], deep: [] }, []);
    } else {
      this.deal = dealField(this.input.view.band, entries);
      this.model.deal(
        {
          front: this.deal.front.map((e) => e.card.noteId),
          mid: this.deal.mid.map((e) => e.card.noteId),
          deep: this.deal.deep.map((e) => e.card.noteId),
        },
        this.paneObstacles(),
      );
    }
    // A lift turns the field to face what the note is joined to (TASK-0036).
    const heldKey = heldIds.join(' ');
    const before = this.lastHeldKey.split(' ').filter(Boolean).length;
    if (heldIds.length > 0 && heldKey !== this.lastHeldKey && heldIds.length > before) this.faceOnArrival = true;
    if (heldIds.length === 0) this.faceOnArrival = false;
    this.lastHeldKey = heldKey;
    this.render(animate);
    this.drawPanes();
    // Once every held note's neighbourhood is here, turn to face it.
    if (this.faceOnArrival && missing.length === 0) {
      this.faceOnArrival = false;
      this.faceFront();
    }
    if (missing.length > 0) {
      void Promise.all(missing.map((id) => this.hooks.context(id).catch(() => null))).then(() => {
        if (this.active) this.redeal(true);
      });
    }
  }

  /**
   * The orbit's deal: every node at the place the kept layout gives it.
   *
   * The most linked-to notes are cards, bound to their notes like any near
   * card; the rest are dots on the canvas. No band function runs, and no
   * obstacle moves a node: in the orbit a position means something about the
   * corpus, which is why it is the one arrangement that is kept.
   */
  private redealOrbit(animate: boolean): void {
    const state = this.hooks.state();
    this.held = deskCardsOf(state, state.workspaceId);
    this.joined = new Set();
    this.shared = new Map();
    this.deal = null;
    const data = this.orbit;
    const slots = new Map<string, Slot>();
    this.entries = new Map();
    if (data !== null) {
      const maxInbound = data.nodes.reduce((m, n) => Math.max(m, n.inbound), 0);
      const nearest = [...data.nodes].sort((a, b) => b.inbound - a.inbound || a.id.localeCompare(b.id)).slice(0, ORBIT_CARDS);
      const near = new Set(nearest.map((n) => n.id));
      for (const node of data.nodes) {
        const place = data.layout.places[node.id];
        if (place === undefined) continue;
        const at = orbitSlot(place, node.inbound, maxInbound);
        slots.set(node.id, { band: near.has(node.id) ? 'front' : 'deep', theta: at.theta, depth: at.depth, y: at.y, row: 0, column: 0, layer: 0 });
        this.entries.set(node.id, {
          card: cardFromNode(node),
          groupKey: node.phase ?? '',
          groupLabel: node.phase ?? 'no phase',
          inputs: { owed: false, suppressed: false, inSubject: true, held: false, joinedToDesk: false, pulled: false, pushed: false },
        });
      }
    }
    this.model.place(slots);
    this.render(animate);
    this.drawPanes();
  }

  private paneObstacles(): Obstacle[] {
    if (this.arrangement === 'orbit') return [];
    const out: Obstacle[] = [];
    for (const card of this.held) {
      if (card.wide === true) continue;
      const w = card.w ?? PANE_DEFAULT_WIDTH;
      out.push(...obstaclesFor({ left: card.x, right: card.x + w }, this.model.yaw, this.viewport));
    }
    return out;
  }

  // ---- drawing ----

  render(animate = false): void {
    if (!this.active) return;
    const yaw = this.model.yaw;
    const reduced = this.hooks.reducedMotion();
    // A move, once started, runs its whole second. A broadcast that arrives
    // during it redraws without animating, and taking the class away then
    // would make every card jump to where it was going.
    if (animate && !reduced) {
      this.el.field.classList.add('animate');
      if (this.animateTimer !== null) clearTimeout(this.animateTimer);
      this.animateTimer = setTimeout(() => {
        this.animateTimer = null;
        this.el.field.classList.remove('animate');
      }, MOVE_MS + 50);
    } else if (reduced) {
      this.el.field.classList.remove('animate');
    }
    const heldIds = new Set(this.held.map((c) => c.noteId));
    const live = new Set<string>();
    let tabStops = 0;
    for (const [noteId, slot] of this.model.current.slots) {
      if (slot.band === 'deep') continue;
      const entry = this.entries.get(noteId);
      if (entry === undefined) continue;
      live.add(noteId);
      let element = this.cardEls.get(noteId);
      const arriving = element === undefined;
      if (element === undefined) {
        element = this.makeCard(noteId);
        this.cardEls.set(noteId, element);
        this.el.cards.appendChild(element);
      }
      element.classList.remove('leaving');
      this.paintCard(element, entry, slot, heldIds.has(noteId));
      const p = project(slot, yaw, this.viewport);
      this.place(element, p, slot, arriving && animate && !reduced);
      if (p.visible) tabStops += 1;
    }
    for (const [noteId, element] of this.cardEls) {
      if (live.has(noteId)) continue;
      if (element.classList.contains('leaving')) continue;
      // A card that leaves fades where it stands; it never slides into another note's place.
      element.classList.add('leaving');
      element.tabIndex = -1;
      element.style.pointerEvents = 'none';
      const gone = (): void => {
        if (element.classList.contains('leaving')) {
          element.remove();
          this.cardEls.delete(noteId);
        }
      };
      if (animate && !reduced) setTimeout(gone, MOVE_MS);
      else gone();
    }
    this.el.cards.dataset['visible'] = String(tabStops);
    this.drawSectors();
    this.paintCanvas();
    this.drawInstrument();
  }

  private place(element: HTMLElement, p: Projection, slot: Slot, arriving: boolean): void {
    element.style.transform = cardTransform(p);
    element.style.zIndex = String(p.z);
    const fade = Math.max(0, Math.min(1, (78 * DEG - Math.abs(p.phi)) / (26 * DEG)));
    const target = !p.visible ? 0 : (slot.band === 'mid' ? 0.9 : 1) * (0.3 + 0.7 * fade);
    const dim = this.held.length > 0 && !this.joined.has(element.dataset['noteId'] ?? '') && slot.band !== 'front' ? 0.45 : 1;
    if (arriving) {
      element.style.opacity = '0';
      requestAnimationFrame(() => {
        element.style.opacity = String(target * dim);
      });
    } else {
      element.style.opacity = String(target * dim);
    }
    element.style.pointerEvents = p.visible ? 'auto' : 'none';
    element.tabIndex = p.visible ? 0 : -1;
    element.setAttribute('aria-hidden', String(!p.visible));
  }

  private makeCard(noteId: string): HTMLElement {
    const element = document.createElement('article');
    element.className = 'field-card';
    element.dataset['noteId'] = noteId;
    element.setAttribute('role', 'button');
    element.innerHTML =
      '<span class="fc-top"><span class="fc-id"></span><span class="fc-mark"></span></span>' +
      '<span class="fc-title"></span><span class="fc-face"></span><span class="fc-owed"></span>';
    element.addEventListener('pointerdown', (event) => this.pressCard(noteId, element, event));
    // A pointer that can hover reaches by resting: a mouse or a pen. Touch
    // cannot hover, so it reaches by press-and-hold instead (pressCard).
    element.addEventListener('pointerenter', (event) => {
      this.trace('enter', noteId, event.pointerType, event.buttons);
      if (event.pointerType !== 'touch') this.startReach(noteId, REACH_REST_MS);
    });
    element.addEventListener('pointerleave', () => this.endReach(noteId));
    // The KEYBOARD reaches for a focused card; a mouse press that focuses it
    // does not. A press is a lift or a drag, not a request to see wires, and
    // a focus from a press can arrive late, when the window gets the system's
    // focus back, and cancel the reach under the pointer.
    element.addEventListener('focus', () => {
      if (element.matches(':focus-visible')) this.startReach(noteId, 0);
    });
    element.addEventListener('blur', () => this.endReach(noteId));
    element.addEventListener('keydown', (event) => this.cardKey(noteId, event));
    return element;
  }

  private paintCard(element: HTMLElement, entry: FieldEntry, slot: Slot, held: boolean): void {
    const { card } = entry;
    element.dataset['band'] = slot.band;
    element.dataset['status'] = bandFor(card.status);
    element.dataset['face'] = faceFor(card, this.input.faces).kind;
    element.classList.toggle('ghost', held);
    element.classList.toggle('pulled', entry.inputs.pulled && !entry.inputs.owed);
    element.classList.toggle('owed', entry.inputs.owed);
    element.classList.toggle('joined', this.joined.has(card.noteId));
    element.classList.toggle('reached', this.reach?.neighbours.has(card.noteId) === true);
    element.classList.toggle('highlight', this.highlight === card.noteId);
    const shared = this.shared.get(card.noteId) ?? 0;
    element.classList.toggle('shared', shared >= 2);
    element.setAttribute('aria-current', String(this.hooks.state().noteId === card.noteId));
    const label = `${card.noteId} ${card.title}${entry.inputs.owed ? `, owed ${card.owedVerb ?? 'a decision'}` : ''}${held ? ', on the desk' : ''}`;
    element.setAttribute('aria-label', label);
    setText(element, '.fc-id', card.noteId);
    setText(element, '.fc-title', card.title);
    const marks: string[] = [];
    if (entry.inputs.pulled && !entry.inputs.owed) marks.push('✋');
    if (shared >= 2) marks.push(`◆${shared}`);
    setText(element, '.fc-mark', marks.join(' '));
    setText(element, '.fc-face', faceText(card, this.input.faces));
    setText(element, '.fc-owed', entry.inputs.owed ? (card.owedVerb ?? 'needs you') : '');
  }

  private drawSectors(): void {
    const labels: HTMLElement[] = [];
    for (const sector of this.model.current.sectors) {
      const p = project({ ...sector.slot, y: sector.slot.y - 70 }, this.model.yaw, this.viewport);
      if (!p.visible) continue;
      const entry = [...this.entries.values()].find((e) => e.groupKey === sector.key);
      const label = document.createElement('span');
      label.className = 'sector-label';
      label.textContent = `${entry?.groupLabel ?? sector.key} · ${sector.count}`;
      label.style.transform = `translate(${(p.x - 80).toFixed(0)}px, ${(p.y - 12).toFixed(0)}px) scale(${p.scale.toFixed(2)})`;
      labels.push(label);
    }
    this.el.sectors.replaceChildren(...labels);
  }

  /** The quiet band's tiles and a reach's wires, on the one canvas. Fog is the field's own background, painted once. */
  private paintCanvas(): void {
    const canvas = this.el.canvas;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    const ratio = canvas.width / this.viewport.width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    if (this.arrangement === 'orbit') {
      this.paintOrbit(ctx);
      return;
    }
    const yaw = this.model.yaw;
    const heldIds = new Set(this.held.map((c) => c.noteId));
    ctx.textBaseline = 'middle';
    for (const [noteId, slot] of this.model.current.slots) {
      if (slot.band !== 'deep') continue;
      const p = project(slot, yaw, this.viewport);
      if (!p.visible) continue;
      const entry = this.entries.get(noteId);
      const w = TILE_BOX.width * p.scale;
      const h = TILE_BOX.height * p.scale;
      const fade = Math.max(0, Math.min(1, (78 * DEG - Math.abs(p.phi)) / (26 * DEG)));
      ctx.globalAlpha = (0.25 + 0.5 * fade) * (slot.layer === 0 ? 1 : 0.7);
      const status = entry === undefined ? 'planned' : bandFor(entry.card.status);
      ctx.fillStyle = heldIds.has(noteId) ? 'rgba(122,162,247,0.15)' : '#1b1f2b';
      ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
      ctx.fillStyle = TILE_COLOURS[status] ?? '#6b7390';
      ctx.fillRect(p.x - w / 2, p.y - h / 2, Math.max(1.5, 2.5 * p.scale), h);
      if (entry?.inputs.pushed === true) {
        ctx.strokeStyle = '#e0af68';
        ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
      }
      // Detail by distance: an id only where it can be read.
      if (w >= 26 && entry !== undefined) {
        ctx.fillStyle = '#c3c8d6';
        ctx.font = `${Math.max(6, 9 * p.scale).toFixed(1)}px -apple-system, sans-serif`;
        ctx.fillText(entry.card.noteId, p.x - w / 2 + 4 * p.scale, p.y, w - 5 * p.scale);
      }
    }
    ctx.globalAlpha = 1;
    this.paintWires(ctx);
  }

  /**
   * The orbit on the canvas: links as filaments, a bridge in its own colour,
   * and every node that is not a card as a dot sized by what points at it.
   *
   * Only links with both ends in front of the person are drawn, and each is
   * remembered for the pointer, so resting on one can quote its sentence.
   */
  private paintOrbit(ctx: CanvasRenderingContext2D): void {
    const data = this.orbit;
    this.dots = [];
    this.segments = [];
    if (data === null) return;
    const yaw = this.model.yaw;
    const at = new Map<string, Projection>();
    for (const [id, slot] of this.model.current.slots) at.set(id, project(slot, yaw, this.viewport));
    const palette = TREATMENT_PALETTES[this.treatment];
    const reached = this.reach;
    if (this.treatment !== 'blocks') {
      ctx.lineWidth = 1;
      for (const edge of data.edges) {
        if (edge.target === null) continue;
        const a = at.get(edge.source);
        const b = at.get(edge.target);
        if (a === undefined || b === undefined) continue;
        if (Math.abs(a.phi) > Math.PI / 2 || Math.abs(b.phi) > Math.PI / 2) continue;
        if (!a.visible && !b.visible) continue;
        const bridge = this.bridgeKeys.has(`${edge.source} ${edge.target}`);
        ctx.strokeStyle = bridge ? palette.bridge : palette.edge;
        ctx.lineWidth = bridge ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        this.segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, edge });
      }
    }
    // Blocks draw no links: an opaque scene cannot carry thousands of them.
    // A reach still draws the links of the ONE block the pointer rests on,
    // which is what replaces the edge callout in that treatment.
    if (reached !== null) {
      const from = at.get(reached.noteId);
      if (from !== undefined && from.visible) {
        ctx.strokeStyle = palette.reach;
        ctx.lineWidth = 1.5;
        for (const id of reached.neighbours) {
          const to = at.get(id);
          if (to === undefined || !to.visible) continue;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    }
    const nodes = new Map(data.nodes.map((n) => [n.id, n]));
    const orphans = new Set(data.layout.orphans);
    const maxInbound = data.nodes.reduce((m, n) => Math.max(m, n.inbound), 1);
    const drawn = [...this.model.current.slots].filter(([, slot]) => slot.band === 'deep');
    // Far first, so a near dot is drawn over a far one.
    drawn.sort((p, q) => q[1].depth - p[1].depth);
    for (const [id, _slot] of drawn) {
      const p = at.get(id);
      const node = nodes.get(id);
      if (p === undefined || node === undefined || !p.visible) continue;
      const r = (2 + 5 * Math.sqrt(node.inbound / maxInbound)) * p.scale * 1.4;
      const colour = palette.band[node.band] ?? palette.band['planned'] ?? '#888';
      if (this.treatment === 'blocks') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(p.x - r + 2, p.y - r + 3, r * 2, r * 2);
        ctx.fillStyle = colour;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      } else if (this.treatment === 'glass') {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.fillStyle = colour;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // An orphan carries a ring, so it is found without being told where to look.
      if (orphans.has(id)) {
        ctx.strokeStyle = palette.orphan;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.dots.push({ x: p.x, y: p.y, r: Math.max(r, 5), id });
    }
    // The cards are dots too, for the pointer's purposes.
    for (const [id, slot] of this.model.current.slots) {
      if (slot.band === 'deep') continue;
      const p = at.get(id);
      if (p !== undefined && p.visible) this.dots.push({ x: p.x, y: p.y, r: 0, id });
    }
  }

  /** The link under the pointer, if one is within a few pixels of it. */
  private edgeAt(x: number, y: number): GraphEdge | null {
    let best: GraphEdge | null = null;
    let bestD = 5;
    for (const s of this.segments) {
      const dx = s.x2 - s.x1;
      const dy = s.y2 - s.y1;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / len2));
      const d = Math.hypot(x - (s.x1 + t * dx), y - (s.y1 + t * dy));
      if (d < bestD) {
        bestD = d;
        best = s.edge;
      }
    }
    return best;
  }

  private dotAt(x: number, y: number): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const d of this.dots) {
      if (d.r === 0) continue;
      const dist = Math.hypot(x - d.x, y - d.y);
      if (dist <= d.r + 3 && dist < bestD) {
        bestD = dist;
        best = d.id;
      }
    }
    return best;
  }

  /** Quote the sentence that made the link under the pointer. */
  private showCallout(edge: GraphEdge | null, x: number, y: number): void {
    const callout = this.el.callout;
    if (edge === null) {
      callout.hidden = true;
      return;
    }
    const key = `${edge.source} ${edge.offset}`;
    const place = (): void => {
      callout.style.left = `${Math.min(this.viewport.width - 370, x + 14)}px`;
      callout.style.top = `${Math.max(8, y - 12)}px`;
    };
    const fill = (sentence: string): void => {
      callout.replaceChildren();
      const head = document.createElement('div');
      head.className = 'callout-head';
      head.textContent = `${edge.source} → ${edge.target ?? edge.wrote}${this.bridgeKeys.has(`${edge.source} ${edge.target}`) ? ' · holds a cluster on' : ''}`;
      const body = document.createElement('div');
      body.textContent = sentence === '' ? '(the link sits in no sentence)' : sentence;
      callout.append(head, body);
      callout.hidden = false;
      place();
    };
    const known = this.sentences.get(key);
    if (known !== undefined) {
      fill(known);
      return;
    }
    callout.dataset['for'] = key;
    void this.hooks.sentence(edge).then((sentence) => {
      this.sentences.set(key, sentence);
      if (callout.dataset['for'] === key) fill(sentence);
    });
  }

  /** The orbit drifts slowly when nobody touches it; reduced motion stops that and nothing else. */
  private scheduleIdle(): void {
    if (this.idle.timer !== null) clearTimeout(this.idle.timer);
    if (this.idle.frame !== null) cancelAnimationFrame(this.idle.frame);
    this.idle.timer = null;
    this.idle.frame = null;
    if (this.arrangement !== 'orbit' || !this.active || this.hooks.reducedMotion()) return;
    this.idle.timer = setTimeout(() => {
      this.idle.last = performance.now();
      const step = (now: number): void => {
        if (this.arrangement !== 'orbit' || !this.active || this.hooks.reducedMotion() || document.visibilityState !== 'visible') {
          this.idle.frame = null;
          return;
        }
        const dt = now - this.idle.last;
        this.idle.last = now;
        this.model.turn(((IDLE_DEGREES_PER_SECOND * dt) / 1000) * DEG);
        this.el.field.classList.add('turning');
        this.render(false);
        this.idle.frame = requestAnimationFrame(step);
      };
      this.idle.frame = requestAnimationFrame(step);
    }, IDLE_AFTER_MS);
  }

  private paintWires(ctx: CanvasRenderingContext2D): void {
    if (this.reach === null) return;
    const from = this.model.current.slots.get(this.reach.noteId);
    const origin = from === undefined ? null : project(from, this.model.yaw, this.viewport);
    if (origin === null || !origin.visible) return;
    ctx.strokeStyle = 'rgba(122,162,247,0.75)';
    ctx.lineWidth = 1.4;
    for (const id of this.reach.neighbours) {
      const slot = this.model.current.slots.get(id);
      if (slot === undefined) continue;
      const p = project(slot, this.model.yaw, this.viewport);
      if (!p.visible) continue;
      // Anchored on the card's edge along the bearing of the neighbour: the
      // rule DES-0002 settled in rev 5.
      const rect = cardRect(origin);
      const ax = p.x > origin.x ? rect.right : rect.left;
      ctx.beginPath();
      ctx.moveTo(ax, origin.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  private drawInstrument(): void {
    const deal = this.deal;
    const heldCount = this.held.length;
    this.el.frontLabel.textContent =
      this.arrangement === 'orbit'
        ? this.orbitLabel()
        : heldCount > 0
          ? 'in front: what is joined to what you are holding'
          : 'in front: what needs you';
    this.el.field.classList.toggle('holding', heldCount > 0);
    this.el.empty.hidden = this.arrangement === 'orbit' || !(deal !== null && deal.front.length === 0 && heldCount === 0 && Math.abs(norm(this.model.yaw)) < 30 * DEG);
    this.el.owedCount.hidden = this.arrangement === 'orbit';
    // The owed count keeps its place whatever the front band means right now.
    this.el.owedCount.textContent = deal === null ? '' : `${deal.owed} owed`;
    const hand = deal?.handPlaced ?? 0;
    const pushed = deal?.pushedBehind ?? 0;
    this.el.handCount.textContent = hand > 0 ? `${hand} placed by hand` : '';
    // Offered whenever a hand has placed anything in this workspace, not only
    // in this view: a pull made in Features is still there while Issues shows.
    const state = this.hooks.state();
    this.el.letGo.hidden = pulledIn(state, state.workspaceId).length === 0 && pushedIn(state, state.workspaceId).length === 0;
    const overflow: string[] = [];
    if ((deal?.frontOverflow ?? 0) + this.model.current.frontOverflow > 0) {
      overflow.push(`${(deal?.frontOverflow ?? 0) + this.model.current.frontOverflow} more in front`);
    }
    if ((deal?.midOverflow ?? 0) + this.model.current.midOverflow > 0) {
      overflow.push(`${(deal?.midOverflow ?? 0) + this.model.current.midOverflow} more in the middle`);
    }
    this.el.overflow.textContent = overflow.length === 0 ? '' : `and ${overflow.join(', ')} — all listed in the navigator`;
    this.el.pendingChip.hidden = this.input.pending === 0;
    this.el.pendingChip.textContent =
      this.input.pending === 1 ? '1 note changed — show it' : `${this.input.pending} notes changed — show them`;
    const sharedCount = this.shared.size;
    this.el.deskCount.textContent =
      heldCount === 0
        ? ''
        : `${heldCount} held${heldCount >= 2 ? ` · ${sharedCount} joined to more than one of them` : ''}`;
    // The compass: which way the person faces, and what is out of sight.
    const deg = ((this.model.yaw / DEG) % 360 + 360) % 360;
    this.el.compass.style.setProperty('--turn', `${-deg}deg`);
    let behind = 0;
    let reachBehind = 0;
    for (const [id, slot] of this.model.current.slots) {
      if (project(slot, this.model.yaw, this.viewport).visible) continue;
      behind += 1;
      if (this.reach?.neighbours.has(id) === true) reachBehind += 1;
    }
    this.el.heading.textContent =
      deg < 45 || deg > 315 ? 'facing the front' : deg > 135 && deg < 225 ? 'facing the quiet band' : 'facing the middle';
    const parts = [`${behind} out of sight`];
    if (pushed > 0) parts.push(`${pushed} pushed there by hand`);
    if (this.reach !== null && reachBehind > 0) parts.push(`${reachBehind} of ${this.reach.noteId}'s neighbours behind you`);
    this.el.behind.textContent = parts.join(' · ');
    this.el.compass.dataset['behind'] = String(behind);
    this.el.compass.dataset['pushed'] = String(pushed);
  }

  // ---- turning ----

  private wire(): void {
    const field = this.el.field;
    let look: { x: number; yaw: number; id: number; moved: boolean } | null = null;
    field.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.field-card, .pane, button, .target-strip') !== null) return;
      if (event.button !== 0) return;
      this.scheduleIdle();
      this.el.field.classList.remove('turning');
      look = { x: event.clientX, yaw: this.model.yaw, id: event.pointerId, moved: false };
      field.setPointerCapture(event.pointerId);
    });
    // In the orbit: resting on a link quotes it; a dot is a note to lift.
    field.addEventListener('pointermove', (event) => {
      if (this.arrangement !== 'orbit' || look !== null || event.buttons !== 0) return;
      if ((event.target as HTMLElement).closest('.field-card, .pane, .compass, .field-bar') !== null) {
        this.showCallout(null, 0, 0);
        return;
      }
      const box = field.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const dot = this.dotAt(x, y);
      field.style.cursor = dot !== null ? 'pointer' : '';
      this.showCallout(dot !== null ? null : this.edgeAt(x, y), x, y);
    });
    field.addEventListener('pointerleave', () => this.showCallout(null, 0, 0));
    field.addEventListener('pointermove', (event) => {
      if (look === null || event.pointerId !== look.id) return;
      const dx = event.clientX - look.x;
      if (Math.abs(dx) > CLICK_SLOP_PX) look.moved = true;
      if (!look.moved) return;
      this.cancelFlight();
      this.turning = true;
      field.classList.add('turning');
      this.model.face(look.yaw - dx * TURN_PER_PX);
      this.render(false);
    });
    const end = (event: PointerEvent): void => {
      if (look === null || event.pointerId !== look.id) return;
      look = null;
      // A click on the background changes nothing: sweeping a desk by
      // accident is unforgivable (DES-0002 rev 8). In the orbit a click on a
      // dot is a click on a note, and lands on it (TASK-0004).
      if (!this.turning) {
        if (this.arrangement === 'orbit') {
          const box = field.getBoundingClientRect();
          const id = this.dotAt(event.clientX - box.left, event.clientY - box.top);
          const entry = id === null ? undefined : this.entries.get(id);
          if (entry !== undefined) void this.tap(entry);
        }
        return;
      }
      this.turning = false;
      field.classList.remove('turning');
      this.turnEnd();
    };
    field.addEventListener('pointerup', end);
    field.addEventListener('pointercancel', end);
    field.addEventListener('keydown', (event) => {
      this.scheduleIdle();
      const target = event.target as HTMLElement;
      if (target.closest('.pane') !== null || target.tagName === 'INPUT') return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.turnBy(event.key === 'ArrowLeft' ? -TURN_STEP : TURN_STEP);
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.faceFront();
      } else if (event.key === 'End') {
        event.preventDefault();
        this.flyTo(Math.PI);
      }
    });
    // Escape sweeps the desk from anywhere in Glass, as DES-0002's prototype
    // did, except while a person is typing: the search box and the status
    // bar's questions use Escape to mean "never mind".
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.active || event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, select, textarea, form, #status') !== null) return;
      event.preventDefault();
      void this.sweep();
    });
    this.el.lookAhead.addEventListener('click', () => this.faceFront());
    this.el.lookBehind.addEventListener('click', () => this.flyTo(Math.PI));
    this.el.letGo.addEventListener('click', () => {
      void this.hooks.dispatch({ type: 'let-go' });
      this.tell('let go: every note is back where the record puts it');
    });
    this.el.pendingChip.addEventListener('click', () => this.hooks.applyPending());
    for (const treatment of TREATMENTS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset['treatment'] = treatment;
      button.textContent = treatment;
      button.addEventListener('click', () => this.setTreatment(treatment));
      this.el.treatments.appendChild(button);
    }
    // The field's own size, not the window's: opening the reading column
    // narrows the field without resizing the window.
    const resized = (): void => {
      if (!this.active) return;
      const box = this.el.field.getBoundingClientRect();
      if (Math.abs(box.width - this.viewport.width) < 1 && Math.abs(box.height - this.viewport.height) < 1) return;
      this.measure();
      this.redeal(false);
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(resized).observe(this.el.field);
    else window.addEventListener('resize', resized);
  }

  turnBy(by: number): void {
    this.cancelFlight();
    this.scheduleIdle();
    this.model.turn(by);
    this.render(!this.hooks.reducedMotion());
    this.turnEnd();
  }

  private turnEnd(): void {
    // In the orbit a position is the kept layout's and no pane moves it, so
    // there is nothing to deal again; dealing the bands here replaced the
    // orbit with the view's last deal the first time a pane was on screen.
    if (this.arrangement === 'orbit') return;
    // Panes are fixed to the SCREEN, so after a turn the sectors they cover
    // have moved round the cylinder: deal once, now the turn is over.
    if (this.held.some((c) => c.wide !== true)) {
      this.model.turnEnd(this.paneObstacles());
      this.render(true);
    }
  }

  faceFront(): void {
    this.flyTo(0);
  }

  /**
   * Turn to face an angle: a flight rather than a cut, so the person keeps
   * their bearings. Under reduced motion it is a cut, and the arrival is
   * shown by a highlight rather than by nothing (TASK-0033).
   */
  flyTo(yaw: number, highlight: string | null = null): void {
    this.cancelFlight();
    // A person asked for this direction; the orbit's drift waits again.
    this.scheduleIdle();
    this.highlight = highlight;
    if (this.hooks.reducedMotion()) {
      this.model.face(yaw);
      this.render(false);
      this.turnEnd();
      this.clearHighlightLater();
      return;
    }
    const from = this.model.yaw;
    const delta = norm(yaw - from);
    const start = performance.now();
    const duration = Math.min(MOVE_MS, 250 + Math.abs(delta) * 300);
    this.el.field.classList.add('turning');
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.model.face(from + delta * eased);
      this.render(false);
      if (t < 1) {
        this.flight = requestAnimationFrame(step);
        return;
      }
      this.flight = null;
      this.el.field.classList.remove('turning');
      this.turnEnd();
      this.clearHighlightLater();
    };
    this.flight = requestAnimationFrame(step);
  }

  private clearHighlightLater(): void {
    if (this.highlight === null) return;
    const was = this.highlight;
    setTimeout(() => {
      if (this.highlight === was) {
        this.highlight = null;
        this.render(false);
      }
    }, 1600);
  }

  private cancelFlight(): void {
    if (this.flight !== null) cancelAnimationFrame(this.flight);
    this.flight = null;
    this.el.field.classList.remove('turning');
  }

  private orbitLabel(): string {
    const data = this.orbit;
    if (data === null) return 'the link graph: reading it…';
    const links = data.edges.filter((e) => e.resolved).length;
    const dangling = data.edges.filter((e) => !e.resolved && !e.crossRepo).length;
    return `the link graph: ${data.nodes.length} notes, ${links} links, nearer is more linked-to · ${data.layout.orphans.length} with no link · ${data.bridges.length} holding a cluster on · ${dangling} pointing at nothing`;
  }

  /** Arrive at a note from the navigator: fly to it, or highlight it under reduced motion. */
  arriveAt(noteId: string): void {
    this.trace('arriveAt', noteId);
    const slot = this.model.current.slots.get(noteId);
    if (slot === undefined) return;
    this.flyTo(slot.theta, noteId);
  }

  // ---- the hands on a card ----

  private pressCard(noteId: string, element: HTMLElement, event: PointerEvent): void {
    if (event.button !== 0) return;
    this.scheduleIdle();
    const entry = this.entries.get(noteId);
    if (entry === undefined) return;
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const fieldBox = this.el.field.getBoundingClientRect();
    const samples: PointerSample[] = [{ t: event.timeStamp, x: startX - fieldBox.left, y: startY - fieldBox.top }];
    let moved = false;
    let edge: Edge | null = null;
    let targets: ThrowTarget[] = [];
    let hovered: ThrowTarget | null = null;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let reachedByHold = false;
    if (event.pointerType === 'touch') {
      // A press-and-hold on touch reaches for the card (TASK-0056).
      holdTimer = setTimeout(() => {
        reachedByHold = true;
        this.startReach(noteId, 0);
      }, REACH_HOLD_MS);
    }
    element.setPointerCapture(event.pointerId);
    const base = element.style.transform;
    const move = (e: PointerEvent): void => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > CLICK_SLOP_PX) {
        moved = true;
        if (holdTimer !== null) clearTimeout(holdTimer);
        this.endReach(noteId);
        element.classList.add('grabbed');
      }
      if (!moved) return;
      samples.push({ t: e.timeStamp, x: e.clientX - fieldBox.left, y: e.clientY - fieldBox.top });
      element.style.transform = `translate(${dx}px, ${dy}px) ${base}`;
      const point = samples[samples.length - 1] as PointerSample;
      // Over the strip itself, the strip stays: its names are wider than the
      // edge zone, and reaching for one must not make them all disappear.
      const near = !this.hooks.canArrange() ? null : this.overStrip(e.clientX, e.clientY) ? edge : edgeNear(point, this.viewport, THROW_EDGE_PX);
      if (near !== edge) {
        edge = near;
        targets = [];
        this.showStrip(null, []);
        if (near !== null) {
          const asked = near;
          void this.hooks.targets(near).then((found) => {
            if (edge !== asked) return;
            targets = found;
            this.showStrip(asked, found);
          });
        }
      }
      hovered = this.stripTargetAt(e.clientX, e.clientY, targets);
      this.trace('card move', noteId, Math.round(e.clientX), Math.round(e.clientY), 'edge', edge, 'targets', targets.length, 'hovered', hovered?.label ?? null);
    };
    const up = (e: PointerEvent): void => {
      this.trace('card up', noteId, e.type, 'moved', moved, 'edge', edge, 'hovered', hovered?.label ?? null);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      if (holdTimer !== null) clearTimeout(holdTimer);
      try {
        element.releasePointerCapture(e.pointerId);
      } catch {
        // Already released; the gesture is over either way.
      }
      element.classList.remove('grabbed');
      const strip = edge;
      this.showStrip(null, []);
      if (e.type === 'pointercancel') {
        element.style.transform = base;
        return;
      }
      if (!moved) {
        if (reachedByHold) {
          // Releasing a press-and-hold clears the reach; it does not open.
          this.endReach(noteId);
          return;
        }
        void this.tap(entry);
        return;
      }
      samples.push({ t: e.timeStamp, x: e.clientX - fieldBox.left, y: e.clientY - fieldBox.top });
      const thrown = this.hooks.canArrange() ? recogniseThrow(samples, this.viewport) : null;
      const chosen = hovered ?? (thrown !== null && strip === thrown ? (targets[0] ?? null) : null);
      if (chosen !== null) {
        void this.fly(element, strip ?? thrown ?? 'right', chosen, entry);
        return;
      }
      element.style.transform = base;
      const dy = e.clientY - startY;
      if (Math.abs(dy) >= PULL_THRESHOLD_PX && Math.abs(dy) > Math.abs(e.clientX - startX)) {
        if (dy > 0) void this.pull(entry);
        else void this.push(entry);
      }
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
  }

  /**
   * A click on a card. In the shell it lifts the note onto the desk, every
   * time; a second note does not need a modifier (DES-0002 rev 8). On a
   * served page a far card is flown to first and opened on the second tap,
   * because a tablet has no hover to show what is there.
   */
  private async tap(entry: FieldEntry): Promise<void> {
    const { card } = entry;
    if (!this.hooks.canArrange()) {
      const slot = this.model.current.slots.get(card.noteId);
      if (slot !== undefined && Math.abs(norm(slot.theta - this.model.yaw)) > 20 * DEG) {
        this.flyTo(slot.theta, card.noteId);
        return;
      }
      await this.hooks.open(card);
      return;
    }
    await this.lift(card);
  }

  async lift(card: CardModel): Promise<void> {
    const state = this.hooks.state();
    const onDesk = deskCardsOf(state, state.workspaceId);
    if (!onDesk.some((c) => c.noteId === card.noteId)) {
      const at = this.nextPanePlace(onDesk);
      await this.hooks.dispatch({ type: 'put-on-desk', noteId: card.noteId, x: at.x, y: at.y });
    } else {
      await this.hooks.dispatch({ type: 'raise-card', noteId: card.noteId });
    }
    // Asked for at once, so the neighbourhood arrives while the lift is still happening.
    void this.hooks.context(card.noteId).catch(() => null);
    await this.hooks.open(card);
  }

  /** Where a newly lifted pane goes: cascaded down the left, so every header stays readable. */
  private nextPanePlace(onDesk: DeskCard[]): { x: number; y: number } {
    const n = onDesk.length;
    return { x: 16 + (n % 3) * 28, y: 16 + n * PANE_HEADER_HEIGHT };
  }

  async pull(entry: FieldEntry): Promise<void> {
    if (!this.hooks.canArrange()) return;
    await this.hooks.dispatch({ type: 'pull', noteId: entry.card.noteId });
    this.tell(`${entry.card.noteId} pulled into the front band, for this session`);
  }

  async push(entry: FieldEntry): Promise<void> {
    if (!this.hooks.canArrange()) return;
    const refusal = pushRefusal(entry);
    if (refusal !== null) {
      // The card springs back, and the front plane says why in words.
      this.tell(refusal, true);
      const element = this.cardEls.get(entry.card.noteId);
      element?.classList.add('refused');
      setTimeout(() => element?.classList.remove('refused'), 700);
      return;
    }
    await this.hooks.dispatch({ type: 'push', noteId: entry.card.noteId });
    this.tell(`${entry.card.noteId} pushed behind you, for this session; the compass counts it`);
  }

  private cardKey(noteId: string, event: KeyboardEvent): void {
    const entry = this.entries.get(noteId);
    if (entry === undefined) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void this.tap(entry);
    } else if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      void this.pull(entry);
    } else if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      void this.push(entry);
    }
  }

  /** Say something on the front plane, where the person is looking. */
  tell(message: string, refusal = false): void {
    this.el.fieldSay.textContent = message;
    this.el.fieldSay.classList.toggle('refusal', refusal);
    this.el.fieldSay.hidden = false;
    const said = message;
    setTimeout(() => {
      if (this.el.fieldSay.textContent === said) this.el.fieldSay.hidden = true;
    }, 4000);
  }

  entryFor(noteId: string): FieldEntry | undefined {
    return this.entries.get(noteId);
  }

  // ---- reach ----

  /** A trace for the smoke run's diagnostics; silent unless the page asks for it. */
  private trace(...parts: unknown[]): void {
    const g = globalThis as unknown as { __deckTrace?: boolean; __deckTraceLog?: string[] };
    if (g.__deckTrace !== true) return;
    (g.__deckTraceLog ??= []).push(`${Math.round(performance.now())} ${parts.map(String).join(' ')}`);
  }

  private startReach(noteId: string, after: number): void {
    this.trace('startReach', noteId, after);
    if (this.reachTimer !== null) clearTimeout(this.reachTimer);
    this.reachTimer = setTimeout(() => {
      this.reachTimer = null;
      void this.hooks
        .context(noteId)
        .then((context) => {
          // Still reaching for it? A pointer that moved on has let go.
          if (this.pendingReach !== noteId) return;
          this.reach = { noteId, neighbours: new Set(neighboursOf(context).map((i) => i.id)) };
          this.render(false);
        })
        .catch(() => null);
    }, after);
    this.pendingReach = noteId;
  }

  private pendingReach: string | null = null;

  private endReach(noteId: string): void {
    this.trace('endReach', noteId, new Error().stack?.split('\n')[2]?.trim());
    if (this.pendingReach === noteId) this.pendingReach = null;
    if (this.reachTimer !== null) {
      clearTimeout(this.reachTimer);
      this.reachTimer = null;
    }
    if (this.reach?.noteId === noteId) {
      this.reach = null;
      this.render(false);
    }
  }

  /** Show the reach for a note the navigator focused, the keyboard's route to the same wires. */
  reachFor(noteId: string | null): void {
    if (noteId === null) {
      if (this.reach !== null) this.endReach(this.reach.noteId);
      return;
    }
    this.startReach(noteId, 0);
  }

  reaching(): { noteId: string; neighbours: string[] } | null {
    return this.reach === null ? null : { noteId: this.reach.noteId, neighbours: [...this.reach.neighbours] };
  }

  // ---- the throw ----

  private showStrip(edge: Edge | null, targets: ThrowTarget[]): void {
    const strip = this.el.strip;
    if (edge === null || targets.length === 0) {
      strip.hidden = true;
      strip.replaceChildren();
      return;
    }
    strip.dataset['edge'] = edge;
    strip.hidden = false;
    strip.replaceChildren(
      ...targets.map((target, i) => {
        const item = document.createElement('span');
        item.className = 'target';
        item.dataset['index'] = String(i);
        item.textContent = target.label;
        return item;
      }),
    );
  }

  /** Whether the pointer is over the target strip, with a margin so its edge is not a cliff. */
  private overStrip(x: number, y: number): boolean {
    if (this.el.strip.hidden) return false;
    const r = this.el.strip.getBoundingClientRect();
    return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  }

  private stripTargetAt(x: number, y: number, targets: ThrowTarget[]): ThrowTarget | null {
    if (this.el.strip.hidden) return null;
    for (const item of Array.from(this.el.strip.querySelectorAll<HTMLElement>('.target'))) {
      const r = item.getBoundingClientRect();
      const over = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      item.classList.toggle('over', over);
      if (over) return targets[Number(item.dataset['index'])] ?? null;
    }
    return null;
  }

  /**
   * The flight: the card goes toward the edge it left and fades, over the
   * same second a view switch takes, so the person sees which way it went.
   * Under reduced motion it is a cut, and the target's name is said instead.
   */
  private async fly(element: HTMLElement, edge: Edge, target: ThrowTarget, entry: FieldEntry): Promise<void> {
    const reduced = this.hooks.reducedMotion();
    if (!reduced) {
      const far = 1400;
      const dx = edge === 'left' ? -far : edge === 'right' ? far : 0;
      const dy = edge === 'top' ? -far : edge === 'bottom' ? far : 0;
      element.classList.add('thrown');
      element.style.transform = `translate(${dx}px, ${dy}px) ${element.style.transform}`;
      element.style.opacity = '0';
    }
    this.tell(`${entry.card.noteId} sent to the ${target.label}`);
    await this.hooks.throwTo(target, entry.card, edge);
    setTimeout(() => {
      element.classList.remove('thrown');
      this.render(false);
    }, reduced ? 0 : MOVE_MS);
  }

  // ---- the desk: panes on the front plane ----

  private cardFor(noteId: string): CardModel | null {
    const entry = this.entries.get(noteId);
    if (entry !== undefined) return entry.card;
    for (const group of this.input.groups) {
      for (const card of group.cards) {
        if (card.noteId === noteId) return card;
        const child = findChild(card, noteId);
        if (child !== null) return child;
      }
    }
    return null;
  }

  private drawPanes(): void {
    const live = new Set<string>();
    this.held.forEach((deskCard, index) => {
      live.add(deskCard.noteId);
      let pane = this.paneEls.get(deskCard.noteId);
      if (pane === undefined) {
        pane = this.makePane(deskCard.noteId);
        this.paneEls.set(deskCard.noteId, pane);
        this.el.panes.appendChild(pane);
      }
      this.paintPane(pane, deskCard, index);
    });
    for (const [noteId, pane] of this.paneEls) {
      if (live.has(noteId)) continue;
      pane.remove();
      this.paneEls.delete(noteId);
    }
    this.el.panes.dataset['count'] = String(this.held.length);
  }

  private makePane(noteId: string): HTMLElement {
    const pane = document.createElement('section');
    pane.className = 'pane';
    pane.dataset['noteId'] = noteId;
    pane.setAttribute('aria-label', `${noteId}, held`);
    pane.innerHTML =
      '<header class="pane-head" tabindex="0" role="toolbar">' +
      '<span class="pane-id"></span><span class="pane-status"></span><span class="pane-face"></span>' +
      '<span class="pane-tools">' +
      '<button type="button" class="pane-orbit" title="Show this in the link graph (O)" aria-label="Show this in the link graph">◎</button>' +
      '<button type="button" class="pane-send" title="Send to another window (S)" aria-label="Send to another window">↗</button>' +
      '<button type="button" class="pane-widen" title="Read it in the column (W)" aria-label="Read in the reading column">⇥</button>' +
      '<button type="button" class="pane-close" title="Put back (⌥ puts back every other)" aria-label="Put back">×</button>' +
      '</span></header>' +
      '<div class="pane-body"><div class="pane-note">…</div></div>' +
      '<span class="pane-resize" aria-hidden="true"></span>';
    const head = pane.querySelector('.pane-head') as HTMLElement;
    head.addEventListener('pointerdown', (event) => this.grabPane(noteId, pane, event));
    head.addEventListener('keydown', (event) => this.paneKey(noteId, event));
    (pane.querySelector('.pane-close') as HTMLElement).addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.altKey) void this.putBackOthers(noteId);
      else void this.putBack(noteId);
    });
    (pane.querySelector('.pane-widen') as HTMLElement).addEventListener('click', (event) => {
      event.stopPropagation();
      void this.widen(noteId);
    });
    (pane.querySelector('.pane-orbit') as HTMLElement).addEventListener('click', (event) => {
      event.stopPropagation();
      this.showInField(noteId);
    });
    (pane.querySelector('.pane-send') as HTMLElement).addEventListener('click', (event) => {
      event.stopPropagation();
      void this.sendFromPane(noteId);
    });
    (pane.querySelector('.pane-resize') as HTMLElement).addEventListener('pointerdown', (event) =>
      this.resizePane(noteId, pane, event),
    );
    return pane;
  }

  private paintPane(pane: HTMLElement, deskCard: DeskCard, index: number): void {
    const card = this.cardFor(deskCard.noteId);
    const w = deskCard.w ?? PANE_DEFAULT_WIDTH;
    const h = deskCard.h ?? PANE_DEFAULT_HEIGHT;
    // Clamped at PAINT time, as Spread clamps a card, and never in the store:
    // a desk arranged on a wide screen keeps its positions, and a pane the
    // reading column or a smaller window would hide stays whole on screen.
    const left = Math.max(0, Math.min(deskCard.x, this.viewport.width - w));
    const top = Math.max(0, Math.min(deskCard.y, this.viewport.height - PANE_HEADER_HEIGHT));
    pane.style.left = `${left}px`;
    pane.style.top = `${top}px`;
    pane.style.width = `${w}px`;
    pane.style.height = `${h}px`;
    // Stacking is the desk's order: a raised pane is the last one. Headers
    // and bodies stack SEPARATELY, every header above every body, which is
    // DES-0002's rule: a pane may cover another's body but never its header,
    // so a stack of eight is eight headers and one body, whichever was raised.
    (pane.querySelector('.pane-body') as HTMLElement).style.zIndex = String(3000 + index);
    (pane.querySelector('.pane-resize') as HTMLElement).style.zIndex = String(3000 + index);
    (pane.querySelector('.pane-head') as HTMLElement).style.zIndex = String(3500 + index);
    pane.classList.toggle('wide', deskCard.wide === true);
    pane.classList.toggle('top', index === this.held.length - 1);
    pane.dataset['status'] = card === null ? 'planned' : bandFor(card.status);
    setText(pane, '.pane-id', deskCard.noteId);
    setText(pane, '.pane-status', card === null ? 'not in this view' : card.status || 'no status');
    setText(pane, '.pane-face', card === null ? '' : faceText(card, this.input.faces));
    const head = pane.querySelector('.pane-head') as HTMLElement;
    head.setAttribute('aria-label', `${deskCard.noteId}${card === null ? '' : ` ${card.title}`}, held: arrow keys move, Alt and arrows resize, Enter raises, W widens, S sends, Delete puts back`);
    const body = pane.querySelector('.pane-note') as HTMLElement;
    const cached = this.paneBodies.get(deskCard.noteId);
    if (cached !== undefined) {
      if (body.dataset['filled'] !== 'true') {
        body.innerHTML = cached;
        body.dataset['filled'] = 'true';
      }
    } else if (card !== null && body.dataset['asked'] !== 'true') {
      body.dataset['asked'] = 'true';
      void this.hooks
        .noteHtml(card)
        .then((html) => {
          this.paneBodies.set(deskCard.noteId, html);
          body.innerHTML = html;
          body.dataset['filled'] = 'true';
        })
        .catch((err: unknown) => {
          body.textContent = err instanceof Error ? err.message : String(err);
        });
    } else if (card === null) {
      body.textContent = 'This note is on the desk but not in this view. Put it back, or switch to a view that holds it.';
    }
  }

  /** Forget the pane bodies, because the notes they came from changed on disk. */
  forgetBodies(): void {
    this.paneBodies.clear();
    for (const pane of this.paneEls.values()) {
      const body = pane.querySelector('.pane-note') as HTMLElement | null;
      if (body !== null) {
        delete body.dataset['asked'];
        delete body.dataset['filled'];
      }
    }
  }

  private grabPane(noteId: string, pane: HTMLElement, event: PointerEvent): void {
    this.scheduleIdle();
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button') !== null) return;
    if (!this.hooks.canArrange()) return;
    event.stopPropagation();
    // A press on a header raises the pane, drag or not.
    void this.hooks.dispatch({ type: 'raise-card', noteId });
    const head = event.currentTarget as HTMLElement;
    head.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const left = pane.offsetLeft;
    const top = pane.offsetTop;
    const fieldBox = this.el.field.getBoundingClientRect();
    const samples: PointerSample[] = [];
    let moved = false;
    let edge: Edge | null = null;
    let targets: ThrowTarget[] = [];
    let hovered: ThrowTarget | null = null;
    const move = (e: PointerEvent): void => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= CLICK_SLOP_PX) return;
      moved = true;
      pane.classList.add('dragging');
      pane.style.left = `${left + dx}px`;
      pane.style.top = `${top + dy}px`;
      const point = { t: e.timeStamp, x: e.clientX - fieldBox.left, y: e.clientY - fieldBox.top };
      samples.push(point);
      const near = this.overStrip(e.clientX, e.clientY) ? edge : edgeNear(point, this.viewport, THROW_EDGE_PX);
      if (near !== edge) {
        edge = near;
        targets = [];
        this.showStrip(null, []);
        if (near !== null) {
          const asked = near;
          void this.hooks.targets(near).then((found) => {
            if (edge !== asked) return;
            targets = found;
            this.showStrip(asked, found);
          });
        }
      }
      hovered = this.stripTargetAt(e.clientX, e.clientY, targets);
    };
    const up = (e: PointerEvent): void => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
      head.removeEventListener('pointercancel', up);
      pane.classList.remove('dragging');
      this.showStrip(null, []);
      if (!moved) return;
      const card = this.cardFor(noteId);
      if (hovered !== null && card !== null) {
        const target = hovered;
        pane.style.left = `${left}px`;
        pane.style.top = `${top}px`;
        this.tell(`${noteId} sent to the ${target.label}`);
        void this.hooks.throwTo(target, card, edge ?? 'right');
        return;
      }
      const w = pane.offsetWidth;
      const others = this.held
        .filter((c) => c.noteId !== noteId)
        .map((c) => ({ noteId: c.noteId, x: c.x, y: c.y, w: c.w ?? PANE_DEFAULT_WIDTH }));
      const snapped = snapBelowHeaders(
        { noteId, x: Math.max(0, left + e.clientX - startX), y: Math.max(0, top + e.clientY - startY), w },
        others,
      );
      void this.hooks.dispatch({ type: 'move-card', noteId, x: snapped.x, y: snapped.y });
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
    head.addEventListener('pointercancel', up);
  }

  private resizePane(noteId: string, pane: HTMLElement, event: PointerEvent): void {
    if (event.button !== 0 || !this.hooks.canArrange()) return;
    event.stopPropagation();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const w0 = pane.offsetWidth;
    const h0 = pane.offsetHeight;
    const move = (e: PointerEvent): void => {
      pane.style.width = `${Math.max(PANE_MIN_WIDTH, w0 + e.clientX - startX)}px`;
      pane.style.height = `${Math.max(PANE_MIN_HEIGHT, h0 + e.clientY - startY)}px`;
    };
    const up = (e: PointerEvent): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      void this.hooks.dispatch({
        type: 'resize-card',
        noteId,
        w: w0 + e.clientX - startX,
        h: h0 + e.clientY - startY,
      });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  }

  private paneKey(noteId: string, event: KeyboardEvent): void {
    const card = this.held.find((c) => c.noteId === noteId);
    if (card === undefined || !this.hooks.canArrange()) return;
    const step = event.shiftKey ? 64 : 16;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const by = arrows[event.key];
    if (by !== undefined) {
      event.preventDefault();
      if (event.altKey) {
        void this.hooks.dispatch({
          type: 'resize-card',
          noteId,
          w: (card.w ?? PANE_DEFAULT_WIDTH) + by[0],
          h: (card.h ?? PANE_DEFAULT_HEIGHT) + by[1],
        });
      } else {
        void this.hooks.dispatch({ type: 'move-card', noteId, x: Math.max(0, card.x + by[0]), y: Math.max(0, card.y + by[1]) });
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.hooks.dispatch({ type: 'raise-card', noteId });
    } else if (event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      void this.widen(noteId);
    } else if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      void this.sendFromPane(noteId);
    } else if (event.key === 'o' || event.key === 'O') {
      event.preventDefault();
      this.showInField(noteId);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      void this.putBack(noteId);
    }
  }

  /** × on a pane: the note goes back into the slot it left. */
  async putBack(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    await this.hooks.dispatch({ type: 'take-off-desk', noteId });
  }

  /** ⌥× on a pane: every OTHER note goes back. */
  async putBackOthers(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    for (const card of [...this.held]) {
      if (card.noteId !== noteId) await this.hooks.dispatch({ type: 'take-off-desk', noteId: card.noteId });
    }
  }

  /** esc: sweep the desk. Every note goes back; no saved desk is touched. */
  async sweep(): Promise<void> {
    if (!this.hooks.canArrange() || this.held.length === 0) return;
    await this.hooks.dispatch({ type: 'clear-desk' });
    this.tell('the desk is swept; every note is back in its slot');
  }

  async widen(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    const card = this.held.find((c) => c.noteId === noteId);
    const wide = card?.wide !== true;
    await this.hooks.dispatch({ type: 'widen-card', noteId, wide });
    const model = this.cardFor(noteId);
    if (wide && model !== null) await this.hooks.open(model);
  }

  private sendFromPane(noteId: string): Promise<void> {
    const card = this.cardFor(noteId);
    if (card === null) return Promise.resolve();
    return this.sendTo(card);
  }

  /** The keyboard's throw: name the window, and the note goes there (TASK-0055). */
  sendTo: (card: CardModel) => Promise<void> = async () => {};
  /** "Show this in the field": the renderer switches to the orbit, then the field flies (TASK-0004). */
  showInField: (noteId: string) => void = () => {};
}

/** An orbit node as a card: id, title, type and status, and nothing of its body. */
function cardFromNode(node: GraphNode): CardModel {
  return {
    noteId: node.id,
    title: node.title,
    noteType: node.type,
    status: node.status,
    rel: node.rel,
    subtitle: null,
    owed: false,
    owedVerb: null,
    groupKey: node.phase ?? '',
    severity: null,
    lastVerified: null,
    stale: false,
    progress: null,
    children: [],
    frontmatter: null,
  };
}

/**
 * The colours each treatment draws with.
 *
 * Glass costs a distinction, as DES-0001 says: four of the six bands sit
 * inside one cyan family, so `blocked` is held out as the only red and
 * `archived` is desaturated to stay readable. Blocks make `done` the bare wood
 * rather than a colour, which is how a corpus that is mostly finished avoids
 * becoming one flat hue.
 */
const TREATMENT_PALETTES: Record<Treatment, { edge: string; bridge: string; reach: string; orphan: string; band: Record<string, string> }> = {
  constellation: {
    edge: 'rgba(170, 190, 255, 0.09)',
    bridge: 'rgba(255, 170, 80, 0.85)',
    reach: 'rgba(122, 162, 247, 0.8)',
    orphan: 'rgba(255, 220, 140, 0.9)',
    band: { done: '#6fbf73', archived: '#4a7a4e', active: '#7aa2f7', pending: '#e0af68', blocked: '#f7768e', planned: '#9aa3b5' },
  },
  glass: {
    edge: 'rgba(127, 228, 255, 0.10)',
    bridge: 'rgba(255, 190, 90, 0.9)',
    reach: 'rgba(127, 228, 255, 0.85)',
    orphan: 'rgba(255, 220, 140, 0.9)',
    band: { done: '#4fc3dc', archived: '#5a7580', active: '#7fe4ff', pending: '#3aa0b8', blocked: '#ff5566', planned: '#2f7f94' },
  },
  blocks: {
    edge: 'rgba(0,0,0,0)',
    bridge: 'rgba(0,0,0,0)',
    reach: 'rgba(40, 30, 20, 0.85)',
    orphan: 'rgba(200, 60, 40, 0.9)',
    band: { done: '#b08a5a', archived: '#8a7a66', active: '#5d7fb8', pending: '#c9a14a', blocked: '#b5484f', planned: '#9aa0aa' },
  },
};

function findChild(card: CardModel, noteId: string): CardModel | null {
  for (const child of card.children) {
    if (child.noteId === noteId) return child;
    const deeper = findChild(child, noteId);
    if (deeper !== null) return deeper;
  }
  return null;
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector(selector);
  if (node !== null && node.textContent !== value) node.textContent = value;
}

export { CARD_BOX };
