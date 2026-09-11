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
import { pulledIn, pushedIn } from '../shared/store-state.js';
import { type FieldDeal, type FieldEntry, dealField, fieldEntries, frontForSlots, pushRefusal } from '../shared/field.js';
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
import { IDENTITY_ZOOM, KEY_STEP, type Zoom, applyZoom, isIdentity, unzoomPoint, wheelFactor, zoomAbout } from '../shared/zoom.js';
import { DOCK_WIDTH, GATHER_MS, GROW_MS, type FocusLayout, type Point, type Rect, type RingNeighbour, chooseForRing, ease, focusLayout, seatRing } from '../shared/focus-ring.js';
import { type RingItem, RingView } from './ring-view.js';
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

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { left: a.left + (b.left - a.left) * t, top: a.top + (b.top - a.top) * t, width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t };
}

export interface GlassHooks {
  state(): DeckState;
  /** Only the shell changes the desk; a served page follows it (TASK-0057). */
  canArrange(): boolean;
  dispatch(action: DeckAction): Promise<void>;
  /** The desk this window draws: the notes on every view and this view's own (FEAT-0015). */
  desk(state: DeckState): DeskCard[];
  /** A card for a held note this view does not hold, from Deck's own index, once it has arrived. */
  stranger(noteId: string): CardModel | null;
  /** Whether a held note is kept on every view of the workspace. */
  isEveryView(noteId: string): boolean;
  /** A lift in this window: hidden notes are shown again (FEAT-0015, decision 3). */
  lifted(): void;
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
  /** The workspace's edge list, read once per index revision, for a ring line's sentence (FEAT-0017). */
  graphEdges(): Promise<GraphEdge[]>;
  /** "+N more" on the ring: keyboard focus to the navigator's group of joined notes. */
  focusJoined(): void;
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
  ring: HTMLElement;
  zoomReading: HTMLButtonElement;
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
    ring: must('field-ring'),
    zoomReading: must('zoom-reading') as HTMLButtonElement,
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
  /** Several cards marked at once, for a moment: a lift's neighbours under reduced motion. */
  private highlights = new Set<string>();
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
  /** Hides the strip a reduced-motion landing left up, with its name highlighted. */
  private landedTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * The zoom, one for the bands and one for the orbit (FEAT-0016). Window
   * state like the turn: not in the store, not in an address, gone on reload.
   */
  private zoomBands: Zoom = { ...IDENTITY_ZOOM };
  private zoomOrbit: Zoom = { ...IDENTITY_ZOOM };
  private zoomSettle: ReturnType<typeof setTimeout> | null = null;
  private zoomEase: number | null = null;
  private wheelTurnEnd: ReturnType<typeof setTimeout> | null = null;
  /** Hide notes, in this window only: the panes are out of sight and cover nothing (FEAT-0015). */
  private panesHidden = false;
  /**
   * The middle is in use (FEAT-0017): the note on top of the desk stands in
   * the middle of its neighbours. A switch in the window, like the turn and
   * the zoom: not in the store, not in an address, off after a reload
   * (decision 2).
   */
  private focusOn = false;
  /** The mini note clicked to get here: the note it came from, and the angle it stood at. */
  private focusFrom: { noteId: string; angle: number } | null = null;
  /** The opening in progress: when it began, and the card's rectangle it grows from. */
  private focusAnim: { noteId: string; start: number; from: Rect | null; frame: number | null } | null = null;
  /** The pane in the middle as it is drawn now, for `paintPane`. */
  private focusRect: Rect | null = null;
  private ringView!: RingView;
  private ringReachTimer: ReturnType<typeof setTimeout> | null = null;
  private graphEdgesFor: Promise<GraphEdge[]> | null = null;
  /** The reach's wires as last painted, for a check that reads the canvas where they are. */
  private wires: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  constructor(el: Elements, hooks: GlassHooks) {
    this.ringView = new RingView(el.ring, {
      open: (id) => void this.openFromRing(id),
      rest: (id) => this.restOnMini(id),
      restLine: (id, at) => void this.restOnLine(id, at),
      more: () => this.hooks.focusJoined(),
    });
    this.el = el;
    this.hooks = hooks;
    this.wire();
  }

  /** Whether Glass is the surface on screen. Nothing is drawn or measured while it is not. */
  setActive(on: boolean): void {
    // Spread or List in place of Glass leaves the middle (FEAT-0017, decision 2).
    if (!on) this.dropFocus();
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
    // A switch of surface leaves the middle (FEAT-0017, decision 2).
    if (arrangement !== this.arrangement) this.dropFocus();
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
      // Whole pixels, and the same link from every pixel around it, so a
      // pointer that lands a pixel off still rests on this link.
      const px = Math.round(x);
      const py = Math.round(y);
      let steady = true;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (this.edgeAt(px + dx, py + dy) !== seg.edge) steady = false;
      }
      if (!steady) continue;
      if (px < 40 || py < 40 || px > this.viewport.width - 260 || py > this.viewport.height - 80) continue;
      if (!clear(px, py)) continue;
      return { x: px, y: py, source: seg.edge.source, target: seg.edge.target };
    }
    return null;
  }

  /**
   * Whether the canvas really has a wire at the middle of the first one the
   * reach drew: the pixel there, read back, not the renderer's own state.
   */
  wirePixel(): { x: number; y: number; alpha: number } | null {
    const wire = this.wires[0];
    if (wire === undefined) return null;
    const x = (wire.x1 + wire.x2) / 2;
    const y = (wire.y1 + wire.y2) / 2;
    const ratio = this.el.canvas.width / this.viewport.width;
    const data = this.el.canvas.getContext('2d')?.getImageData(Math.round(x * ratio) - 2, Math.round(y * ratio) - 2, 5, 5).data;
    let alpha = 0;
    for (let i = 3; i < (data?.length ?? 0); i += 4) alpha = Math.max(alpha, data?.[i] ?? 0);
    return { x, y, alpha };
  }

  /** The alpha of the canvas at a point, in field coordinates. */
  pixelAlpha(x: number, y: number): number {
    const ratio = this.el.canvas.width / this.viewport.width;
    const data = this.el.canvas.getContext('2d')?.getImageData(Math.round(x * ratio) - 2, Math.round(y * ratio) - 2, 5, 5).data;
    let alpha = 0;
    for (let i = 3; i < (data?.length ?? 0); i += 4) alpha = Math.max(alpha, data?.[i] ?? 0);
    return alpha;
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

  /**
   * The navigator's groups for the orbit: the cards it draws, and the notes
   * with no link. The keyboard's route to every card the orbit shows, and to
   * the orphans TST-0025 asks a person to find.
   */
  orbitGroups(): CardGroup[] {
    if (this.arrangement !== 'orbit' || this.orbit === null) return [];
    const cards: CardModel[] = [];
    for (const [id, slot] of this.model.current.slots) {
      if (slot.band === 'deep') continue;
      const entry = this.entries.get(id);
      if (entry !== undefined) cards.push(entry.card);
    }
    const orphans = this.orbit.layout.orphans.map((id) => this.entries.get(id)?.card).filter((c): c is CardModel => c !== undefined);
    const out: CardGroup[] = [{ key: 'deck:orbit-near', label: 'Nearest in the link graph', needsHuman: false, suppressed: false, cards }];
    if (orphans.length > 0) out.push({ key: 'deck:orbit-orphans', label: 'With no link in or out', needsHuman: false, suppressed: false, cards: orphans });
    return out;
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
    // A view switch leaves the middle (decision 2).
    if (input.view?.id !== this.input.view?.id) this.dropFocus();
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
    const p = this.at(slot, this.model.yaw);
    return { band: slot.band, visible: p.visible, x: p.x, y: p.y };
  }

  /** The counts the measurement records: elements in the document and tiles on the canvas. */
  counts(): { elements: number; tiles: number; cards: number } {
    let tiles = 0;
    for (const slot of this.model.current.slots.values()) {
      if (slot.band === 'deep' && this.at(slot, this.model.yaw).visible) tiles += 1;
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
  measureTurn(
    ms: number,
    radiansPerSecond = Math.PI / 2,
  ): Promise<{ frames: number; median: number; p95: number; visible: boolean; focused: boolean; mostTiles: number; mostElements: number; workMedian: number; workP95: number }> {
    return new Promise((resolve) => {
      this.frameTimes = [];
      // The work a frame costs, apart from the wait for the display: a 60 Hz
      // display holds every frame to 16.7 ms however little work it took, so
      // the frame time alone cannot show the headroom a slower machine needs.
      const work: number[] = [];
      let last = performance.now();
      const start = last;
      // The worst moment, not the last one: the most tiles and elements on
      // screen at any point of the turn, sampled every tenth frame.
      let mostTiles = 0;
      let mostElements = 0;
      let frame = 0;
      const step = (now: number): void => {
        frame += 1;
        if (frame % 10 === 0) {
          const c = this.counts();
          mostTiles = Math.max(mostTiles, c.tiles, this.arrangement === 'orbit' ? this.dots.length : 0);
          mostElements = Math.max(mostElements, c.elements);
        }
        if (document.visibilityState === 'visible' && document.hasFocus()) this.frameTimes?.push(now - last);
        const dt = now - last;
        last = now;
        const began = performance.now();
        this.model.turn((radiansPerSecond * dt) / 1000);
        this.el.field.classList.add('turning');
        this.render();
        if (document.visibilityState === 'visible' && document.hasFocus()) work.push(performance.now() - began);
        if (now - start < ms) {
          requestAnimationFrame(step);
          return;
        }
        this.el.field.classList.remove('turning');
        const times = (this.frameTimes ?? []).slice(1).sort((a, b) => a - b);
        this.frameTimes = null;
        const at = (q: number): number => (times.length === 0 ? 0 : (times[Math.min(times.length - 1, Math.floor(q * times.length))] as number));
        const costs = work.slice(1).sort((a, b) => a - b);
        const cost = (q: number): number => (costs.length === 0 ? 0 : (costs[Math.min(costs.length - 1, Math.floor(q * costs.length))] as number));
        resolve({
          frames: times.length,
          median: at(0.5),
          p95: at(0.95),
          visible: document.visibilityState === 'visible',
          focused: document.hasFocus(),
          mostTiles,
          mostElements,
          workMedian: cost(0.5),
          workP95: cost(0.95),
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
    this.held = this.hooks.desk(state);
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
    // While a note is in the middle the field keeps its slots: the
    // neighbourhood stands on the ring instead of taking the front band, and
    // leaving deals it once (FEAT-0017, decisions 9 and 10).
    if (this.focusId() !== null) {
      this.lastHeldKey = heldIds.join(' ');
      this.render(false);
      this.drawPanes();
      this.drawFocus();
      if (missing.length > 0) {
        void Promise.all(missing.map((id) => this.hooks.context(id).catch(() => null))).then(() => {
          if (this.active) this.redeal(true);
        });
      }
      return;
    }
    if (this.input.view === null) {
      this.deal = null;
      this.model.deal({ front: [], mid: [], deep: [] }, []);
    } else {
      this.deal = dealField(this.input.view.band, entries, { first: new Set(this.shared.keys()) });
      // The order the front band takes its SLOTS in: the neighbourhood, then
      // what a hand just pulled, then what is owed. When panes leave fewer
      // slots than the band holds, the pulled note a person is watching stays
      // in view and an owed note is counted instead; the owed count on the bar
      // and the navigator still show every owed note (ISS-0064).
      const frontOrder = frontForSlots(this.deal.front);
      this.model.deal(
        {
          front: frontOrder.map((e) => e.card.noteId),
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
    this.drawFocus();
    // Once every held note's neighbourhood is here, turn to face it.
    if (this.faceOnArrival && missing.length === 0) {
      this.faceOnArrival = false;
      if (this.hooks.reducedMotion()) {
        // Under reduced motion the turn is replaced by a highlight on the
        // neighbours it would have turned to (TASK-0036, ISS-0061).
        this.model.face(0);
        // The cut is a turn, so the panes' sectors are dealt again for the new
        // angle; without it cards stood under a pane (ISS-0064).
        this.turnEnd();
        this.highlightAll(this.joined);
      } else {
        this.faceFront();
      }
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
    this.held = this.hooks.desk(state);
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
    this.drawFocus();
  }

  /**
   * Where a pane is DRAWN: its stored place, clamped into the field. One
   * function, used by the painter and by the obstacles, so the field keeps
   * cards clear of the pane a person sees (ISS-0058).
   */
  private paneRect(card: DeskCard): { left: number; top: number; w: number; h: number } {
    const w = card.w ?? PANE_DEFAULT_WIDTH;
    const h = card.h ?? PANE_DEFAULT_HEIGHT;
    return {
      left: Math.max(0, Math.min(card.x, this.viewport.width - w)),
      top: Math.max(0, Math.min(card.y, this.viewport.height - PANE_HEADER_HEIGHT)),
      w,
      h,
    };
  }

  private paneObstacles(): Obstacle[] {
    // A hidden pane covers nothing, so the field deals into its space (decision 2).
    if (this.arrangement === 'orbit' || this.panesHidden || this.focusId() !== null) return [];
    const out: Obstacle[] = [];
    for (const card of this.held) {
      if (card.wide === true) continue;
      const r = this.paneRect(card);
      // A pane is on the screen and the zoom is not applied to it, so its
      // edges are taken back to the unzoomed field before they become a
      // sector: the part of the cylinder the pane really covers (FEAT-0016).
      const zoom = this.zoom();
      const left = unzoomPoint({ x: r.left, y: 0 }, zoom).x;
      const right = unzoomPoint({ x: r.left + r.w, y: 0 }, zoom).x;
      out.push(...obstaclesFor({ left, right }, this.model.yaw, this.viewport));
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
      const p = this.at(slot, yaw);
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
    element.classList.toggle('highlight', this.highlight === card.noteId || this.highlights.has(card.noteId));
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
      const p = this.at({ ...sector.slot, y: sector.slot.y - 70 }, this.model.yaw);
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
      const p = this.at(slot, yaw);
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
    for (const [id, slot] of this.model.current.slots) at.set(id, this.at(slot, yaw));
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
    // The orbit holds still while a note is in the middle (decision 18).
    if (this.arrangement !== 'orbit' || !this.active || this.hooks.reducedMotion() || this.focusOn) return;
    this.idle.timer = setTimeout(() => {
      this.idle.last = performance.now();
      const step = (now: number): void => {
        if (this.arrangement !== 'orbit' || !this.active || this.hooks.reducedMotion() || document.visibilityState !== 'visible' || this.focusOn) {
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
    this.wires = [];
    if (this.reach === null) return;
    const from = this.model.current.slots.get(this.reach.noteId);
    const origin = from === undefined ? null : this.at(from, this.model.yaw);
    if (origin === null || !origin.visible) return;
    ctx.strokeStyle = 'rgba(122,162,247,0.75)';
    ctx.lineWidth = 1.4;
    for (const id of this.reach.neighbours) {
      const slot = this.model.current.slots.get(id);
      if (slot === undefined) continue;
      const p = this.at(slot, this.model.yaw);
      if (!p.visible) continue;
      // Anchored on the card's edge along the bearing of the neighbour: the
      // rule DES-0002 settled in rev 5.
      const rect = cardRect(origin);
      const ax = p.x > origin.x ? rect.right : rect.left;
      ctx.beginPath();
      ctx.moveTo(ax, origin.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      this.wires.push({ x1: ax, y1: origin.y, x2: p.x, y2: p.y });
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
    // Counted from the slots dealt, not from the band: a pull that found no
    // free slot beside a pane is not in front, and the label must agree with
    // what the front plane says about it (ISS-0064).
    const hand = deal === null ? 0 : deal.front.filter((e) => e.inputs.pulled && !e.inputs.owed && !e.inputs.joinedToDesk && this.model.current.slots.has(e.card.noteId)).length;
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
        : `${heldCount} held${heldCount >= 2 ? ` · ${sharedCount} joined to more than one of them` : ''}${this.panesHidden ? ' · hidden' : ''}`;
    // The compass: which way the person faces, and what is out of sight.
    const deg = ((this.model.yaw / DEG) % 360 + 360) % 360;
    this.el.compass.style.setProperty('--turn', `${-deg}deg`);
    // The zoom, when it is not 1×; pressing it goes back (FEAT-0016).
    const zoom = this.zoom();
    this.el.zoomReading.hidden = isIdentity(zoom);
    this.el.zoomReading.textContent = `${zoom.scale.toFixed(1)}×`;
    this.el.zoomReading.setAttribute('aria-label', `Zoom ${zoom.scale.toFixed(1)} times; press to reset`);
    let behind = 0;
    let reachBehind = 0;
    for (const [id, slot] of this.model.current.slots) {
      if (this.at(slot, this.model.yaw).visible) continue;
      behind += 1;
      if (this.reach?.neighbours.has(id) === true) reachBehind += 1;
    }
    this.el.heading.textContent =
      deg < 45 || deg > 315 ? 'facing the front' : deg > 135 && deg < 225 ? 'facing the quiet band' : 'facing the middle';
    // The quiet band's own count, on screen at all times (FEAT-0009), beside
    // everything out of sight, which is a different number (ISS-0063).
    const quiet = this.arrangement === 'orbit' ? 0 : [...this.model.current.slots.values()].filter((slot) => slot.band === 'deep').length;
    const parts = [this.arrangement === 'orbit' ? `${behind} out of sight` : `${quiet} in the quiet band · ${behind} out of sight`];
    if (pushed > 0) parts.push(`${pushed} pushed there by hand`);
    if (this.reach !== null && reachBehind > 0) parts.push(`${reachBehind} of ${this.reach.noteId}'s neighbours behind you`);
    this.el.behind.textContent = parts.join(' · ');
    this.el.compass.dataset['behind'] = String(behind);
    this.el.compass.dataset['quiet'] = String(quiet);
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
      // A pointer over the orbit is a person looking: the drift waits, or the
      // link under the pointer turns away while its sentence is being read.
      if (this.idle.frame !== null) this.el.field.classList.remove('turning');
      this.scheduleIdle();
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
    // Zoom (FEAT-0016): not passive, so the page and Electron's own page zoom stay put.
    field.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    // A double-click on the background returns to 1×; on a card, a pane, a
    // dot or a button it is two clicks on that thing, and the zoom stays.
    field.addEventListener('dblclick', (event) => {
      if (!this.active) return;
      const target = event.target as HTMLElement;
      if (target.closest('.field-card, .pane, button, .ring-card, .target-strip, .compass, .field-bar') !== null) return;
      const box = field.getBoundingClientRect();
      if (this.arrangement === 'orbit' && this.dotAt(event.clientX - box.left, event.clientY - box.top) !== null) return;
      if (!isIdentity(this.zoom())) this.zoomTo({ ...IDENTITY_ZOOM });
    });
    this.el.zoomReading.addEventListener('click', () => this.zoomTo({ ...IDENTITY_ZOOM }));
    // + (or =), - and 0 zoom in, out and back to 1× about the middle of the
    // field, from anywhere a letter is not being typed.
    document.addEventListener('keydown', (event) => {
      if (!this.active || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!['+', '=', '-', '0'].includes(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target !== null && target.closest('input, textarea, select, [contenteditable="true"], form, #status') !== null) return;
      event.preventDefault();
      if (event.key === '0') {
        this.zoomTo({ ...IDENTITY_ZOOM });
        return;
      }
      const factor = event.key === '-' ? 1 / KEY_STEP : KEY_STEP;
      this.zoomTo(zoomAbout(this.zoom(), factor, this.middle(), this.viewport));
    });
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
      // Escape leaves the middle first; a second Escape sweeps (FEAT-0017, decision 12).
      if (this.focusId() !== null) {
        this.leaveFocus();
        return;
      }
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
    // The field keeps its slots while a note is in the middle (decision 9).
    if (this.focusId() !== null) return;
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

  /** Mark these cards for a moment. */
  highlightAll(ids: Iterable<string>): void {
    this.highlights = new Set(ids);
    this.render(false);
    const marked = this.highlights;
    setTimeout(() => {
      if (this.highlights === marked) {
        this.highlights = new Set();
        this.render(false);
      }
    }, 1600);
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

  async lift(card: CardModel, from: Rect | null = null): Promise<void> {
    const state = this.hooks.state();
    const onDesk = this.hooks.desk(state);
    // A person who lifts a note wants to see it (decision 3).
    this.hooks.lifted();
    // The note opens in the middle of its neighbours, growing from where its
    // card stands, or from the middle when it is not in sight (FEAT-0017).
    if (!this.hooks.canArrange()) {
      // A served page follows the Mac's desk and opens nothing of its own.
    } else {
      if (from === null) {
        const element = this.cardEls.get(card.noteId);
        const box = this.el.field.getBoundingClientRect();
        if (element !== undefined && !element.classList.contains('leaving') && element.style.pointerEvents === 'auto') {
          const r = element.getBoundingClientRect();
          from = { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
        } else if (this.arrangement === 'orbit') {
          const dot = this.dotFor(card.noteId);
          if (dot !== null) from = { left: dot.x - 6, top: dot.y - 6, width: 12, height: 12 };
        }
      }
      if (this.focusFrom !== null && this.focusFrom.noteId === card.noteId) this.focusFrom = null;
      this.openFocus(card.noteId, from);
    }
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
    // Said after the deal, by what the deal did: a pull the spare slots
    // could not take is counted, and the front plane says so (ISS-0059).
    setTimeout(() => {
      const where = this.model.current.slots.get(entry.card.noteId);
      this.tell(
        where?.band === 'front'
          ? `${entry.card.noteId} pulled into the front band, for this session`
          : `${entry.card.noteId} is pulled, but the front band and its spare slots are full; it is counted in "more in front"`,
      );
    }, 60);
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
    // A strip shown now is not the one a reduced-motion landing left up, so
    // that landing's timer must not hide it.
    if (this.landedTimer !== null) clearTimeout(this.landedTimer);
    this.landedTimer = null;
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
    if (reduced) {
      // The cut is shown by the target's name, highlighted for a moment,
      // since there is no flight to follow (TASK-0055, ISS-0064).
      this.showStrip(edge, [target]);
      this.el.strip.querySelector('.target')?.classList.add('landed');
      this.landedTimer = setTimeout(() => this.showStrip(null, []), 1200);
    }
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
    // A note on every view that this view does not hold: drawn in full from
    // Deck's own index (decision 7).
    return this.hooks.stranger(noteId);
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
      '<button type="button" class="pane-every" title="Keep this note on every view (V)" aria-label="Keep this note on every view" aria-pressed="false">⧉</button>' +
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
    (pane.querySelector('.pane-every') as HTMLElement).addEventListener('click', (event) => {
      event.stopPropagation();
      void this.toggleEveryView(noteId);
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
    // A press anywhere on a pane brings it forward, as a press on a window
    // does: a pane whose header lies under another is still reachable by its
    // body (ISS-0066). The header's own press raises it in grabPane.
    pane.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.hooks.canArrange()) return;
      if ((event.target as HTMLElement).closest('.pane-head') !== null) return;
      if (this.held[this.held.length - 1]?.noteId === noteId) return;
      void this.hooks.dispatch({ type: 'raise-card', noteId });
    });
    return pane;
  }

  private paintPane(pane: HTMLElement, deskCard: DeskCard, index: number): void {
    const card = this.cardFor(deskCard.noteId);
    // Clamped at PAINT time, as Spread clamps a card, and never in the store:
    // a desk arranged on a wide screen keeps its positions, and a pane the
    // reading column or a smaller window would hide stays whole on screen.
    // While a note is in the middle (FEAT-0017): it is drawn at the focus
    // size there, and every other held note waits in the dock as its header,
    // down the field's left edge. Stored places and sizes are untouched
    // (decisions 11 and 13). A pane being dragged keeps where the hand put it.
    const focus = this.focusId();
    const isFocus = focus === deskCard.noteId && this.focusRect !== null;
    const docked = focus !== null && !isFocus && deskCard.wide !== true;
    pane.classList.toggle('focus', isFocus);
    pane.classList.toggle('docked', docked);
    if (!pane.classList.contains('dragging')) {
      if (isFocus && this.focusRect !== null) {
        pane.style.left = `${this.focusRect.left}px`;
        pane.style.top = `${this.focusRect.top}px`;
        pane.style.width = `${this.focusRect.width}px`;
        pane.style.height = `${this.focusRect.height}px`;
      } else if (docked) {
        const dockIndex = this.held.filter((c) => c.noteId !== focus && c.wide !== true).findIndex((c) => c.noteId === deskCard.noteId);
        pane.style.left = '8px';
        pane.style.top = `${8 + dockIndex * (PANE_HEADER_HEIGHT + 4)}px`;
        pane.style.width = `${DOCK_WIDTH - 16}px`;
        pane.style.height = `${PANE_HEADER_HEIGHT}px`;
      } else {
        const { left, top, w, h } = this.paneRect(deskCard);
        pane.style.left = `${left}px`;
        pane.style.top = `${top}px`;
        pane.style.width = `${w}px`;
        pane.style.height = `${h}px`;
      }
    }
    // Stacking is the desk's order: a raised pane is the last one, and it
    // covers everything under it, header included. Headers stay readable
    // because a pane dropped on one snaps below it (snapBelowHeaders), not by
    // drawing every header above every body: that showed a lower pane's
    // header through the text of the pane on top of it (ISS-0066).
    pane.style.zIndex = String(isFocus ? 3900 : 3000 + index);
    pane.classList.toggle('wide', deskCard.wide === true);
    pane.classList.toggle('top', index === this.held.length - 1);
    pane.dataset['status'] = card === null ? 'planned' : bandFor(card.status);
    setText(pane, '.pane-id', deskCard.noteId);
    const every = this.hooks.isEveryView(deskCard.noteId);
    (pane.querySelector('.pane-every') as HTMLElement).setAttribute('aria-pressed', String(every));
    pane.classList.toggle('every-view', every);
    // A note on every view that this view does not hold says so, beside its status.
    const inView = this.entries.has(deskCard.noteId) || this.input.groups.some((g) => g.cards.some((c) => c.noteId === deskCard.noteId || findChild(c, deskCard.noteId) !== null));
    pane.classList.toggle('elsewhere', card !== null && !inView);
    setText(pane, '.pane-status', card === null ? 'not in this view' : `${card.status || 'no status'}${inView ? '' : ' · not in this view'}`);
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

  /** The zoom of the arrangement on screen. */
  zoom(): Zoom {
    return this.arrangement === 'orbit' ? this.zoomOrbit : this.zoomBands;
  }

  private setZoom(zoom: Zoom): void {
    if (this.arrangement === 'orbit') this.zoomOrbit = zoom;
    else this.zoomBands = zoom;
  }

  /**
   * A slot where it is drawn: projected on the cylinder, then zoomed. Every
   * position Glass draws or reports goes through here, so the hit tests, the
   * reach and the smoke run all read what is on the screen.
   */
  private at(slot: { theta: number; depth: number; y: number }, yaw: number): Projection {
    // While a note is in the middle the rest steps back: drawn at 0.85 of the
    // person's zoom, about the middle (FEAT-0017, decision 9).
    const zoom = this.focusId() !== null ? zoomAbout(this.zoom(), 0.85, this.middle(), this.viewport) : this.zoom();
    return applyZoom(project(slot, yaw, this.viewport), zoom, this.viewport);
  }

  /** A slot where it is drawn with no note in the middle: the angle a neighbour had before the lift. */
  private atPlain(slot: { theta: number; depth: number; y: number }): Projection {
    return applyZoom(project(slot, this.model.yaw, this.viewport), this.zoom(), this.viewport);
  }

  /**
   * Zoom by a factor about a point of the field, now (FEAT-0016). When the
   * wheel has been still for 150 ms the field moves covered cards out from
   * under the panes once, as after a turn: panes are fixed to the screen, so a
   * zoom slides cards under them (decision 3).
   */
  zoomBy(factor: number, pivot: { x: number; y: number }): void {
    this.cancelZoomEase();
    this.setZoom(zoomAbout(this.zoom(), factor, pivot, this.viewport));
    this.render(false);
    this.settleZoom();
  }

  /** A key's step, or a reset: eased over 150 ms, a cut under reduced motion. */
  zoomTo(target: Zoom): void {
    this.cancelZoomEase();
    const from = this.zoom();
    if (this.hooks.reducedMotion()) {
      this.setZoom(target);
      this.render(false);
      this.settleZoom();
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / 150);
      const e = t * t * (3 - 2 * t);
      this.setZoom({ scale: from.scale + (target.scale - from.scale) * e, dx: from.dx + (target.dx - from.dx) * e, dy: from.dy + (target.dy - from.dy) * e });
      this.render(false);
      if (t < 1) this.zoomEase = requestAnimationFrame(step);
      else {
        this.zoomEase = null;
        this.setZoom(target);
        this.render(false);
        this.settleZoom();
      }
    };
    this.zoomEase = requestAnimationFrame(step);
  }

  private cancelZoomEase(): void {
    if (this.zoomEase !== null) cancelAnimationFrame(this.zoomEase);
    this.zoomEase = null;
  }

  private settleZoom(): void {
    if (this.zoomSettle !== null) clearTimeout(this.zoomSettle);
    this.zoomSettle = setTimeout(() => {
      this.zoomSettle = null;
      this.turnEnd();
    }, 150);
  }

  /** The middle of the field, where a key's zoom is centred. */
  private middle(): { x: number; y: number } {
    return { x: this.viewport.width / 2, y: this.viewport.height / 2 };
  }

  /**
   * The wheel (FEAT-0016, TASK-0065). A vertical wheel, or a pinch (Ctrl),
   * zooms about the pointer; a sideways wheel, or Shift, turns the field. Over
   * a pane, the bar, the compass or the strip it does its ordinary job.
   */
  private onWheel(event: WheelEvent): void {
    if (!this.active) return;
    const target = event.target as HTMLElement;
    if (target.closest('.pane, .field-bar, .compass, .target-strip, .edge-callout') !== null) return;
    event.preventDefault();
    this.scheduleIdle();
    const sideways = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (sideways) {
      const delta = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
      this.cancelFlight();
      this.model.face(this.model.yaw + delta * TURN_PER_PX);
      this.render(false);
      if (this.wheelTurnEnd !== null) clearTimeout(this.wheelTurnEnd);
      this.wheelTurnEnd = setTimeout(() => {
        this.wheelTurnEnd = null;
        this.turnEnd();
      }, 150);
      return;
    }
    const box = this.el.field.getBoundingClientRect();
    this.zoomBy(wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey, this.viewport.height), { x: event.clientX - box.left, y: event.clientY - box.top });
  }

  // ---- the note in the middle (FEAT-0017) ----

  /**
   * The note in the middle: the top of this window's desk, while the middle
   * is in use (decision 2). None while notes are hidden or the top pane is in
   * the reading column.
   */
  focusId(): string | null {
    if (!this.focusOn || this.panesHidden || !this.active) return null;
    const top = this.held[this.held.length - 1];
    if (top === undefined || top.wide === true) return null;
    return top.noteId;
  }

  /** The ring's notes in ring order, for the navigator; null with no note in the middle. */
  ringOrder(): string[] | null {
    return this.focusId() === null ? null : this.ringView.order();
  }

  /** Where the middle is in use, and the pane's rectangle there: for the smoke run. */
  focusState(): { noteId: string | null; pane: Rect | null; ring: Array<{ id: string; x: number; y: number }>; more: number; neighbours: number } {
    const id = this.focusId();
    const ring = [...this.ringView.positions()].map(([noteId, p]) => ({ id: noteId, x: p.x, y: p.y }));
    return { noteId: id, pane: id === null ? null : this.focusRect, ring, more: this.ringMore, neighbours: this.ringCount };
  }
  private ringMore = 0;
  private ringCount = 0;
  private layoutCache: { key: string; layout: FocusLayout } | null = null;

  /**
   * Open the middle for the note just lifted or brought forward, growing
   * from where its card stands (decision 3). `from` is that card's rectangle
   * in field coordinates, or null to grow from the middle.
   */
  private openFocus(noteId: string, from: Rect | null): void {
    this.focusOn = true;
    this.cancelFocusAnim();
    this.focusAnim = { noteId, start: performance.now(), from, frame: null };
    this.scheduleIdle();
  }

  private cancelFocusAnim(): void {
    if (this.focusAnim?.frame != null) cancelAnimationFrame(this.focusAnim.frame);
    this.focusAnim = null;
  }

  /** Leave the middle with no deal and no turn: a switch of view or surface, or a note put back. */
  private dropFocus(): void {
    if (!this.focusOn) return;
    this.focusOn = false;
    this.focusFrom = null;
    this.cancelFocusAnim();
    this.focusRect = null;
    this.ringView.clear();
    this.el.field.classList.remove('focusing');
    this.scheduleIdle();
  }

  /**
   * Leave the middle (Escape, and every other way out): the panes go back to
   * their places, and the field is dealt once for the notes still held, by
   * FEAT-0010's rule, and turns to face their neighbourhood (decision 10).
   */
  leaveFocus(): void {
    if (this.focusId() === null) {
      this.dropFocus();
      return;
    }
    this.dropFocus();
    this.faceOnArrival = this.held.length > 0;
    this.redeal(true);
  }

  /**
   * Draw the middle: the pane at its place, the dock, the dimmed field and
   * the ring, at the stage the opening has reached.
   */
  private drawFocus(): void {
    const id = this.focusId();
    this.el.field.classList.toggle('focusing', id !== null);
    if (id === null) {
      if (this.focusOn && this.held.length === 0) this.focusOn = false;
      this.focusRect = null;
      this.ringView.clear();
      return;
    }
    const context = this.hooks.peekContext(id);
    if (context === undefined) void this.hooks.context(id).then(() => this.active && this.drawFocus()).catch(() => null);
    const dock = this.held.length > 1 ? DOCK_WIDTH : 0;
    const neighbours = this.ringNeighbours(id, context);
    this.ringCount = neighbours.length;
    // With a note the person came from, the ring starts opposite the way they
    // came, so that note sits there and the line between the two keeps its
    // direction (decision 5).
    const cameFromAngle = this.focusFrom !== null && neighbours.some((n) => n.cameFrom === true) ? this.focusFrom.angle + Math.PI : null;
    // Worked out once per field size, dock, count and starting angle, not on
    // every frame of the opening.
    // The compass is drawn over the field's corner; no mini note stands under it.
    const box = this.el.field.getBoundingClientRect();
    const c = this.el.compass.getBoundingClientRect();
    const avoid: Rect[] = c.width > 0 ? [{ left: c.left - box.left - 8, top: c.top - box.top - 8, width: c.width + 16, height: c.height + 16 }] : [];
    const layoutKey = `${this.viewport.width}x${this.viewport.height}|${dock}|${neighbours.length}|${(cameFromAngle ?? -Math.PI / 2).toFixed(4)}|${avoid.map((r) => `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`).join(';')}`;
    if (this.layoutCache === null || this.layoutCache.key !== layoutKey) this.layoutCache = { key: layoutKey, layout: focusLayout(this.viewport, dock, neighbours.length, cameFromAngle ?? -Math.PI / 2, avoid) };
    const layout = this.layoutCache.layout;
    const { chosen, more } = chooseForRing(neighbours, layout.places.length);
    this.ringMore = more;
    const { seats, morePlace } = seatRing(chosen, layout, more, cameFromAngle);
    // The opening's stages: the card grows where it stands, then everything
    // gathers (decision 3). Under reduced motion both are a cut (decision 16).
    const reduced = this.hooks.reducedMotion();
    const anim = this.focusAnim !== null && this.focusAnim.noteId === id ? this.focusAnim : null;
    const elapsed = anim === null || reduced ? GROW_MS + GATHER_MS : performance.now() - anim.start;
    const grown = this.grownRect(anim?.from ?? null, layout);
    let pane: Rect;
    if (elapsed < GROW_MS) {
      const from = anim?.from ?? grown;
      pane = lerpRect(from, grown, ease(elapsed / GROW_MS));
    } else {
      pane = lerpRect(grown, layout.pane, ease(Math.min(1, (elapsed - GROW_MS) / GATHER_MS)));
    }
    this.focusRect = pane;
    const gather = Math.max(0, Math.min(1, (elapsed - GROW_MS) / GATHER_MS));
    const byId = new Map(neighbours.map((n) => [n.id, n]));
    const items: RingItem[] = seats.map((seat) => {
      const n = byId.get(seat.id) as RingNeighbour & { title: string; start: Point };
      return { id: seat.id, title: n.title, direction: n.direction, held: n.held === true, shared: n.shared === true, start: n.start, seat: seat.place };
    });
    this.ringView.paint({ centre: layout.centre, pane, items, t: gather, more: more > 0 && morePlace !== null ? { count: more, place: morePlace } : null, focusId: id });
    this.drawPanes();
    if (anim !== null && !reduced && elapsed < GROW_MS + GATHER_MS) {
      if (anim.frame != null) cancelAnimationFrame(anim.frame);
      anim.frame = requestAnimationFrame(() => {
        if (this.focusAnim === anim) {
          anim.frame = null;
          this.drawFocus();
        }
      });
    } else if (anim !== null) {
      this.focusAnim = null;
      if (reduced) {
        this.ringView.highlight();
        this.paneEls.get(id)?.classList.add('highlight');
        setTimeout(() => this.paneEls.get(id)?.classList.remove('highlight'), 1600);
      }
    }
  }

  /** The pane at the end of the first stage: the focus size, standing where the card was. */
  private grownRect(from: Rect | null, layout: FocusLayout): Rect {
    if (from === null) return layout.pane;
    const w = layout.pane.width;
    const h = layout.pane.height;
    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;
    return {
      left: Math.max(0, Math.min(this.viewport.width - w, cx - w / 2)),
      top: Math.max(0, Math.min(this.viewport.height - h, cy - h / 2)),
      width: w,
      height: h,
    };
  }

  /**
   * The note's neighbours as the ring needs them: which way each link runs,
   * whether it is held, shared or owed, where it stood before the lift, and
   * where it starts its move from (decisions 4 and 5).
   */
  private ringNeighbours(id: string, context: NoteContext | undefined): Array<RingNeighbour & { title: string; start: Point }> {
    if (context === undefined) return [];
    const out = new Map<string, 'out' | 'in' | 'both'>();
    const titles = new Map<string, string>();
    for (const item of context.linked) {
      if (item.id === id) continue;
      out.set(item.id, 'out');
      titles.set(item.id, item.title);
    }
    for (const item of context.backlinks) {
      if (item.id === id) continue;
      out.set(item.id, out.get(item.id) === 'out' ? 'both' : 'in');
      if (!titles.has(item.id)) titles.set(item.id, item.title);
    }
    const heldIds = new Set(this.held.map((c) => c.noteId));
    const middle = this.middle();
    const result: Array<RingNeighbour & { title: string; start: Point }> = [];
    for (const [nid, direction] of out) {
      const slot = this.model.current.slots.get(nid);
      const p = slot === undefined ? null : this.atPlain(slot);
      const drawn = p !== null && p.visible;
      const bearing = slot === undefined ? null : norm(slot.theta - this.model.yaw);
      const angle = drawn && p !== null ? Math.atan2(p.y - middle.y, p.x - middle.x) : null;
      const start = drawn && p !== null
        ? { x: p.x, y: p.y }
        : bearing !== null
          ? { x: bearing < 0 ? 0 : this.viewport.width, y: middle.y }
          : { x: middle.x, y: this.viewport.height };
      const card = this.cardFor(nid);
      result.push({
        id: nid,
        title: card?.title ?? titles.get(nid) ?? nid,
        direction,
        held: heldIds.has(nid),
        shared: this.shared.has(nid),
        owed: card?.owed === true,
        cameFrom: this.focusFrom?.noteId === nid,
        angle,
        bearing,
        start,
      });
    }
    return result;
  }

  /**
   * A mini note is a door (decision 7): clicking it opens that note in the
   * middle. A held note's mini note brings its pane forward instead.
   */
  private async openFromRing(id: string): Promise<void> {
    const from = this.focusId();
    const at = this.ringView.positions().get(id);
    const centre = this.focusRect === null ? this.middle() : { x: this.focusRect.left + this.focusRect.width / 2, y: this.focusRect.top + this.focusRect.height / 2 };
    this.focusFrom = from === null || at === undefined ? null : { noteId: from, angle: Math.atan2(at.y - centre.y, at.x - centre.x) };
    const fromRect = at === undefined ? null : { left: at.x - 84, top: at.y - 22, width: 168, height: 44 };
    if (this.held.some((c) => c.noteId === id)) {
      this.openFocus(id, fromRect);
      await this.hooks.dispatch({ type: 'raise-card', noteId: id });
      return;
    }
    const context = from === null ? undefined : this.hooks.peekContext(from);
    const item = context === undefined ? undefined : [...context.linked, ...context.backlinks].find((i) => i.id === id);
    const card = this.cardFor(id) ?? (item === undefined ? null : cardFromContext(item));
    if (card === null) return;
    await this.lift(card, fromRect);
  }

  /** Resting on a mini note reaches for it: wires to those of its neighbours on screen (decision 20). */
  private restOnMini(id: string | null): void {
    if (this.ringReachTimer !== null) clearTimeout(this.ringReachTimer);
    this.ringReachTimer = null;
    if (id === null) {
      this.ringView.wires(null, []);
      return;
    }
    this.ringReachTimer = setTimeout(() => {
      void this.hooks.context(id).then((context) => {
        const from = this.ringView.positions().get(id);
        if (from === undefined || this.focusId() === null) return;
        const ring = this.ringView.positions();
        const focus = this.focusId();
        const to: Point[] = [];
        for (const item of neighboursOf(context)) {
          const onRing = ring.get(item.id);
          if (onRing !== undefined && item.id !== id) to.push(onRing);
          else if (item.id === focus && this.focusRect !== null) to.push({ x: this.focusRect.left + this.focusRect.width / 2, y: this.focusRect.top + this.focusRect.height / 2 });
        }
        this.ringView.wires(from, to);
      }).catch(() => null);
    }, REACH_REST_MS);
  }

  /**
   * Resting on a ring line shows which way the link runs and the sentence it
   * sits in (decision 8), from the workspace's edge list, read once per index
   * revision the first time a line is rested on.
   */
  private async restOnLine(id: string | null, at: Point): Promise<void> {
    const focus = this.focusId();
    if (id === null || focus === null) {
      this.showCallout(null, 0, 0);
      return;
    }
    let edges: GraphEdge[] = this.arrangement === 'orbit' && this.orbit !== null ? this.orbit.edges : [];
    if (edges.length === 0) {
      if (this.graphEdgesFor === null) this.graphEdgesFor = this.hooks.graphEdges().catch(() => []);
      edges = await this.graphEdgesFor;
    }
    const edge = edges.find((e) => e.source === focus && e.target === id) ?? edges.find((e) => e.source === id && e.target === focus) ?? null;
    if (this.focusId() === focus) this.showCallout(edge, at.x, at.y);
  }

  /** The edge list is read again after the notes change on disk. */
  forgetGraphEdges(): void {
    this.graphEdgesFor = null;
  }

  /**
   * Hide notes, or show them again (FEAT-0015, decisions 1 and 2). The notes
   * stay held and keep shaping the field: their neighbours stay in front and
   * their slots stay ghosted. Only the panes go, and the space they covered
   * is dealt into.
   */
  setHidden(hidden: boolean): void {
    if (this.panesHidden === hidden) return;
    // Hide notes leaves the middle, then hides (FEAT-0017, decision 15).
    if (hidden) this.dropFocus();
    this.panesHidden = hidden;
    this.el.panes.hidden = hidden;
    if (this.active) this.redeal(true);
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
    const head = event.currentTarget as HTMLElement;
    // A docked header is brought forward when it is released without moving,
    // and a drag on it moves nothing (FEAT-0017, decision 11).
    if (pane.classList.contains('docked')) {
      const x0 = event.clientX;
      const y0 = event.clientY;
      const release = (e: PointerEvent): void => {
        head.removeEventListener('pointerup', release);
        if (Math.hypot(e.clientX - x0, e.clientY - y0) > CLICK_SLOP_PX) return;
        void this.bringForward(noteId);
      };
      head.addEventListener('pointerup', release);
      return;
    }
    // A press on a header raises the pane, drag or not.
    void this.hooks.dispatch({ type: 'raise-card', noteId });
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
      // Dragging the note in the middle leaves the middle, and the pane lands
      // where it is dropped (decision 13).
      if (this.focusId() === noteId) this.leaveFocus();
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
    // Tab from the header of the note in the middle goes to its ring, clockwise
    // from the top, rather than through every link in its text (decision 17).
    if (event.key === 'Tab' && !event.shiftKey && this.focusId() === noteId && event.target === event.currentTarget) {
      const first = this.el.ring.querySelector<HTMLElement>('.ring-card:not(.ring-more)');
      if (first !== null) {
        event.preventDefault();
        first.focus();
        return;
      }
    }
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
      // Enter on a header puts that note in the middle (decisions 2 and 11).
      void this.bringForward(noteId);
    } else if (event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      void this.widen(noteId);
    } else if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      void this.sendFromPane(noteId);
    } else if (event.key === 'o' || event.key === 'O') {
      event.preventDefault();
      this.showInField(noteId);
    } else if (event.key === 'v' || event.key === 'V') {
      event.preventDefault();
      void this.toggleEveryView(noteId);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      void this.putBack(noteId);
    }
  }

  /** × on a pane: the note goes back into the slot it left. */
  async putBack(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    // × on the note in the middle puts it back and leaves the middle (decision 13).
    if (this.focusId() === noteId) this.dropFocus();
    await this.hooks.dispatch({ type: 'take-off-desk', noteId });
  }

  /**
   * ⌥× on a pane: every OTHER note of this view goes back. A note kept on
   * every view stays, as it does for Escape (decision 9).
   */
  async putBackOthers(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    let stayed = 0;
    for (const card of [...this.held]) {
      if (card.noteId === noteId) continue;
      if (this.hooks.isEveryView(card.noteId)) stayed += 1;
      else await this.hooks.dispatch({ type: 'take-off-desk', noteId: card.noteId });
    }
    if (stayed > 0) this.tell(`${stayed} ${stayed === 1 ? 'note' : 'notes'} on every view stayed`);
  }

  /** esc: sweep this view's desk. A note on every view stays, and the front plane says how many. */
  async sweep(): Promise<void> {
    if (!this.hooks.canArrange() || this.held.length === 0) return;
    const stayed = this.held.filter((c) => this.hooks.isEveryView(c.noteId)).length;
    await this.hooks.dispatch({ type: 'clear-desk' });
    this.tell(
      stayed === 0
        ? 'the desk is swept; every note is back in its slot'
        : `the desk is swept; ${stayed} ${stayed === 1 ? 'note' : 'notes'} on every view stayed`,
    );
  }

  /** Bring a held note forward into the middle: a docked header clicked, or Enter on a header. */
  private async bringForward(noteId: string): Promise<void> {
    const pane = this.paneEls.get(noteId);
    const box = this.el.field.getBoundingClientRect();
    const r = pane?.getBoundingClientRect();
    this.focusFrom = null;
    this.openFocus(noteId, r === undefined ? null : { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height });
    await this.hooks.dispatch({ type: 'raise-card', noteId });
    // Already on top: no broadcast comes, so draw now.
    this.drawPanes();
    this.drawFocus();
  }

  /** ⧉ or V on a pane: keep the note on every view, or give it back to this one (decision 6). */
  async toggleEveryView(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    const on = !this.hooks.isEveryView(noteId);
    await this.hooks.dispatch({ type: 'set-every-view', noteId, on });
    this.tell(on ? `${noteId} is on every view` : `${noteId} is on this view only`);
  }

  async widen(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    // W on the note in the middle reads it in the column and leaves the middle.
    if (this.focusId() === noteId) this.dropFocus();
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
