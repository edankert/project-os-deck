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
 * **One note is one object** (TASK-0104, ISS-0070). A note that is held is its
 * document and nothing else: its field card is not drawn, and the slot it left
 * is kept for it without anything being drawn there. The notes joined to the
 * focused document are the field's own cards, moved to seats round it; no
 * copy of a card is ever made. What stands on the desk does not push the
 * field's cards about: the field keeps its slots and passes behind the desk.
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
import { deskViewOf, pulledIn, pushedIn, readingSizeOf } from '../shared/store-state.js';
import { type FieldDeal, type FieldEntry, JOINED_GROUP, dealField, fieldEntries, frontForSlots, pushRefusal } from '../shared/field.js';
import {
  type Projection,
  type Slot,
  CARD_BOX,
  DEG,
  FRONT,
  FieldModel,
  PERSPECTIVE,
  VISIBLE_HALF_ANGLE,
  cardRect,
  cardTransform,
  norm,
  project,
  shapesFor,
  thetaAtScreenX,
} from '../shared/slots.js';
import { type ContextItem, type NoteContext, cardFromContext, neighboursOf } from '../shared/sidecar-client.js';
import { IDENTITY_ZOOM, KEY_STEP, type Zoom, applyZoom, isIdentity, wheelFactor, zoomAbout } from '../shared/zoom.js';
import { detailFor, promoted, promotedBox } from '../shared/detail.js';
import {
  BROWSE_SCALE,
  GATHER_MS,
  OPEN_MS,
  SEAT,
  type Point,
  type Rect,
  type SeatNeighbour,
  beyondEdges,
  ease,
  revealShift,
  seatNeighbours,
  seatsAround,
  intersects,
} from '../shared/focus-ring.js';
import { type LinkLine, LinkLines } from './link-lines.js';
import { REACH_HOLD_MS, REACH_REST_MS, joinedTo, sharedAmong } from '../shared/neighbourhood.js';
import {
  NARROW_BAR_HEIGHT,
  NARROW_FIELD_WIDTH,
  PANE_HEADER_HEIGHT,
  PANE_MIN_HEIGHT,
  PANE_MIN_WIDTH,
  fitToField,
  readingSizeFor,
  snapBelowHeaders,
} from '../shared/panes.js';
import { relationKinds, relationLabel, relationsBetween, relationsSentence } from '../shared/relations.js';
import { type ArrangeInput, type ArrangeKind, type ArrangePlan, type ArrangeUndo, type UndoCheck, checkUndo, planBasis, planCompare, planRead, planRelated } from '../shared/arrange.js';
import type { CollectionLayout } from '../shared/collection.js';
import {
  type Edge,
  type PointerSample,
  type ThrowTarget,
  THROW_EDGE_PX,
  edgeNear,
  recogniseThrow,
} from '../shared/throw.js';
import { bandFor, faceFor, faceText, fieldsFor, specFor } from '../shared/faces.js';
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

/** How much of its opacity a card keeps while a document is the focus and the card is not gathered round it. */
const FOCUS_DIM = 0.28;
/** A seated card stands above every field card (which reach 2760) and below every document (3000 and up). */
const SEATED_Z = 2950;
/** How long documents and the collection take to travel when an arrangement is applied or put back. */
const ARRANGE_MS = 300;

/** "A", "A and B", "A, B and C". */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
/** How far a seated card is from being in the field before it stops taking the pointer and the Tab key. */
const SEAT_IN_SIGHT_PX = 8;
/** The room left round a document that fills the field. */
const FILL_MARGIN = 8;
/** A link to a note, as the sidecar writes it in rendered text: the note's path under the docs root. */
const NOTE_LINK_PREFIX = '/docs/';
/** How much room is left round a card that "locate" brings into view. */
const LOCATE_MARGIN = 28;
/** Below this much of its opacity, or with less than this much of it in the field, a document is offered a "find". */
const FIND_BELOW_OPACITY = 0.6;
const FIND_GRAB_PX = 48;
const BEYOND_SIDES = ['left', 'right', 'up', 'down'] as const;
const BEYOND_ARROW: Record<(typeof BEYOND_SIDES)[number], string> = { left: '←', right: '→', up: '↑', down: '↓' };
const BEYOND_WORDS: Record<(typeof BEYOND_SIDES)[number], string> = {
  left: 'beyond the left edge',
  right: 'beyond the right edge',
  up: 'above the field',
  down: 'below the field',
};
/** How long the desk takes to come round to where the person is facing, or to bring something into view. */
export const DESK_MOVE_MS = 250;

/** A note as the sidecar renders it: its text, the frontmatter it was written with, and where it is. */
export interface NoteDocument {
  html: string;
  frontmatter: Record<string, unknown>;
  /** Docs-root-relative path, shown under Details and never in the heading. */
  relPath: string;
  title: string;
}

/**
 * Something else that stands on the desk beside the documents: the
 * collection. The field places it with the desk on every frame, lays
 * documents and seats out round it, and puts it under a document that is
 * pressed. What it holds and how it is operated are its own business.
 */
export interface DeskFurniture {
  place(field: { width: number; height: number }, shift: { x: number; y: number; opacity: number; visible: boolean }, narrow: 'front' | 'back' | null): void;
  /** Where it stands on the desk, or null when it is not on screen. */
  rect(): Rect | null;
  /** A document was pressed or opened: this goes under it. */
  lower(): void;
  /** Put the keyboard on it, above the documents. */
  focus(): void;
  /** Whether it is above the documents. */
  onTop(): boolean;
  /**
   * The notes it shows as cards, when it shows any (the collection's Cards
   * presentation, FEAT-0022): where each stands in the field now. The cards
   * are the field's OWN cards, moved there, so a note is never drawn a second
   * time. `taken` are notes gathered round the focused document and `held`
   * are open documents: neither is given a card here, and what stands in
   * their place is the furniture's to draw. Null when it shows none.
   */
  seats?(taken: ReadonlySet<string>, held: ReadonlySet<string>): FurnitureSeats | null;
  /** The wheel turned over one of the cards it placed. */
  wheel?(deltaY: number): void;
  /** Where it stands and how it is presented, as the store will be told: what an arrangement plans from. */
  layout?(): CollectionLayout | null;
}

export interface FurnitureSeats {
  at: ReadonlyMap<string, Point>;
  /** The height the cards are drawn at: just above the furniture's own surface. */
  z: number;
  /** A member's card, for one the field's deal does not hold. */
  card(noteId: string): CardModel | null;
}

/** One note joined to a document: which way the link runs, and what to call it. */
export interface Neighbour {
  id: string;
  title: string;
  status: string;
  /** 'out': the document links to it; 'in': it links to the document; 'both'. */
  direction: 'out' | 'in' | 'both';
  /** It is on the desk as a document of its own. */
  held: boolean;
  /** Joined to another held note as well. */
  shared: boolean;
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
  /** The note as the sidecar renders it, for a document's body. Rejects when it cannot be read. */
  document(card: CardModel): Promise<NoteDocument>;
  /**
   * Make a rendered note live: the tick control beside each checkbox, and the
   * verbs the sidecar allows on the note, drawn into `actions`. Both go
   * through the shell's existing guards; a host that does not write adds
   * neither.
   */
  dress(noteId: string, note: HTMLElement, actions: HTMLElement): Promise<void>;
  /** The card for a note named by its path: where a link inside a document leads. */
  cardByRel(rel: string): Promise<CardModel | null>;
  /** A document was closed: the keyboard goes back to the row it was opened from. */
  closed(noteId: string): void;
  /** Put the keyboard on a note's row in the list, or say why it has none. The document stays open. */
  toRow(noteId: string): void;
  /** A note was opened: its row is shown in the collection. */
  revealed(noteId: string): void;
  /** The places a throw toward this edge could land. Empty where there are no windows. */
  targets(edge: Edge): Promise<ThrowTarget[]>;
  throwTo(target: ThrowTarget, card: CardModel, edge: Edge): Promise<void>;
  /** A change arrived while the field was on screen; applying it is the person's call (TASK-0032). */
  applyPending(): void;
  reducedMotion(): boolean;
  /** The sentence an orbit edge's link sits in (TASK-0003). */
  sentence(edge: GraphEdge): Promise<string>;
  /** The workspace's edge list, read once per index revision, for a line's sentence (FEAT-0017). */
  graphEdges(): Promise<GraphEdge[]>;
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
  quietCursor: HTMLElement;
  sectors: HTMLElement;
  panes: HTMLElement;
  frontLabel: HTMLElement;
  owedCount: HTMLElement;
  handCount: HTMLElement;
  letGo: HTMLButtonElement;
  overflow: HTMLElement;
  pendingChip: HTMLButtonElement;
  deskCount: HTMLElement;
  leaveFocus: HTMLButtonElement;
  sweepDesk: HTMLButtonElement;
  arrange: HTMLElement;
  arrangeRead: HTMLButtonElement;
  arrangeCompare: HTMLButtonElement;
  arrangeRelated: HTMLButtonElement;
  arrangeUndo: HTMLButtonElement;
  arrangePreview: HTMLElement;
  arrangeOutlines: HTMLElement;
  arrangeBar: HTMLElement;
  arrangeTitle: HTMLElement;
  arrangeText: HTMLElement;
  arrangeNotes: HTMLElement;
  arrangeApply: HTMLButtonElement;
  arrangeCancel: HTMLButtonElement;
  compass: HTMLElement;
  lines: HTMLElement;
  findOpen: HTMLButtonElement;
  toCollection: HTMLButtonElement;
  narrowBar: HTMLElement;
  beyond: HTMLElement;
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
    quietCursor: must('quiet-cursor'),
    sectors: must('field-sectors'),
    panes: must('field-panes'),
    frontLabel: must('front-label'),
    owedCount: must('owed-count'),
    handCount: must('hand-count'),
    letGo: must('let-go') as HTMLButtonElement,
    overflow: must('field-overflow'),
    pendingChip: must('pending-chip') as HTMLButtonElement,
    deskCount: must('glass-desk-count'),
    leaveFocus: must('leave-focus') as HTMLButtonElement,
    sweepDesk: must('sweep-desk') as HTMLButtonElement,
    arrange: must('arrange'),
    arrangeRead: must('arrange-read') as HTMLButtonElement,
    arrangeCompare: must('arrange-compare') as HTMLButtonElement,
    arrangeRelated: must('arrange-related') as HTMLButtonElement,
    arrangeUndo: must('arrange-undo') as HTMLButtonElement,
    arrangePreview: must('arrange-preview'),
    arrangeOutlines: must('arrange-outlines'),
    arrangeBar: must('arrange-bar'),
    arrangeTitle: must('arrange-title'),
    arrangeText: must('arrange-text'),
    arrangeNotes: must('arrange-notes'),
    arrangeApply: must('arrange-apply') as HTMLButtonElement,
    arrangeCancel: must('arrange-cancel') as HTMLButtonElement,
    compass: must('compass'),
    lines: must('field-lines'),
    findOpen: must('find-open') as HTMLButtonElement,
    toCollection: must('to-collection') as HTMLButtonElement,
    narrowBar: must('narrow-bar'),
    beyond: must('desk-beyond'),
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
  /** The rendered note for each document, read once per state of the workspace. */
  private readonly docs = new Map<string, NoteDocument>();
  /** Which document's details are open, in this window. */
  private detailsOpen: string | null = null;
  /** An arrangement shown and not yet applied: session state, in this window only. */
  private arranging: { kind: ArrangeKind; subjects: string[]; plan: ArrangePlan; basis: string; refreshed: boolean; from: HTMLElement | null } | null = null;
  /** What the last applied arrangement moved, so it can be put back; and the view it was applied on. */
  private undoRecord: ArrangeUndo | null = null;
  private undoView: string | null = null;
  /** The undo's question, while it is being asked: what changed since, and what would still go back. */
  private undoAsk: UndoCheck | null = null;
  private arrangeTimer: ReturnType<typeof setTimeout> | null = null;
  /** The relationship being emphasised round a document: one of the source's own words. */
  private emphasis: { noteId: string; kind: string } | null = null;
  private emphasisMemo: { kind: string; noteId: string; edges: unknown; context: unknown; ids: Set<string> | null } | null = null;
  /** What the link lines were last built from, so a turn moves them and does not build them again (drawLinks). */
  private linksFrom: { geometry: string; contexts: unknown[] } | null = null;
  /** What each card element was last painted from, so an unchanged card is not painted again (paintCard). */
  private readonly paintedFrom = new WeakMap<HTMLElement, { card: CardModel; faces: unknown; inputs: string }>();
  /** Documents whose text was read before the notes last changed on disk, and is being read again. */
  private readonly rereads = new Set<string>();
  /** The note whose document takes the keyboard as soon as it is drawn: one opened with the keyboard. */
  private keyboardTo: string | null = null;
  /** The workspace's edges, for what a relationship is called. Read when a list is first opened. */
  private edges: GraphEdge[] | null = null;
  private furnitureItems: DeskFurniture[] = [];
  /**
   * Documents a served page opened for itself. A tablet follows the Mac's
   * desk and arranges nothing on it (ADR-0001, TASK-0057), but it can still
   * read: a note opened on the tablet is a document in this list, drawn there
   * and nowhere else, and it is gone when the page is. Empty in the shell.
   */
  private localHeld: DeskCard[] = [];
  /** In a narrow field: which one object is in front. */
  private narrowFront: 'collection' | 'document' | null = null;
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
  private zoomEase: number | null = null;
  /** Hide notes, in this window only: the panes are out of sight and cover nothing (FEAT-0015). */
  private panesHidden = false;
  /**
   * Focus is on (FEAT-0017): the document on top of the desk has the notes it
   * is joined to gathered round it. A switch in the window, like the turn and
   * the zoom: not in the store, not in an address, off after a reload.
   */
  private focusOn = false;
  /**
   * Where the desk stands on the cylinder, in this window. The desk is flat
   * and its objects keep the places the store holds for them; this is the
   * bearing those places are drawn at. Turning away slides the desk aside
   * with the front of the field and fades it at the edge of sight, exactly as
   * a card there fades (ISS-0071: "turning moves the note and the whole
   * ring"). Opening, raising or finding a document brings the desk round to
   * where the person is facing. Not stored: a reload starts it at the front.
   */
  private deskBearing = 0;
  /**
   * How far the desk has been moved to look at something off to the side, in
   * pixels. Set by "locate" and the edge counters, and put back to nothing by
   * "find" and by opening a note. Not stored either.
   */
  private deskPan: Point = { x: 0, y: 0 };
  private deskEase: number | null = null;
  /**
   * Where each neighbour of the focused document is seated, as an offset from
   * the document's top left corner. Worked out when the focus, the document's
   * size or the set of neighbours changes, and NOT when the document moves:
   * that is what makes a drag carry the arrangement whole (ISS-0072).
   */
  private seating: { key: string; docId: string; offsets: Map<string, Point>; order: string[] } | null = null;
  /** Cards for seated notes the view does not hold or the deal did not place. */
  private seatEntries = new Map<string, FieldEntry>();
  /** The seated notes as last drawn: id to the middle of its card, in field pixels. */
  private seatedAt = new Map<string, Point>();
  /** The notes the collection shows as cards, by where each stands in the field (FEAT-0022). */
  private gridAt = new Map<string, Point>();
  /** A card for a collection member the deal does not hold, so it can be drawn in the collection. */
  private readonly gridEntries = new Map<string, FieldEntry>();
  /**
   * The document being dragged and how far, so its neighbourhood is drawn
   * with it before the store hears. `x` and `y` are the place the store held
   * when the drag began: once the store holds another, the drag is over.
   */
  private dragOf: { noteId: string; dx: number; dy: number; x: number; y: number } | null = null;
  /** The document about to open, and the card or row it grows from. */
  private opening: { noteId: string; from: Rect | null } | null = null;
  /**
   * The document whose cards still owe a mark. It opened under reduced motion
   * before the notes it is joined to had been read, so there was no card at a
   * seat to mark, and the cards then arrived with nothing to say they had.
   */
  private seatsOweMark: string | null = null;
  private openAnim: Animation | null = null;
  private gatherTimer: ReturnType<typeof setTimeout> | null = null;
  private links!: LinkLines;
  /** Which document's list of related notes is open, in this window. */
  private relatedOpen: string | null = null;
  private graphEdgesFor: Promise<GraphEdge[]> | null = null;
  /** The reach's wires as last painted, for a check that reads the canvas where they are. */
  private wires: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  constructor(el: Elements, hooks: GlassHooks) {
    this.links = new LinkLines(el.lines, {
      restLine: (id, at) => void this.restOnLine(id, at),
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
      return hit !== null && hit.closest('.field-card, .pane, .collection, .narrow-bar, .compass, .field-say, .field-bar, .sector-label') === null;
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
      if (hit === null || hit.closest('.field-card, .pane, .collection, .narrow-bar, .compass, .field-say, .field-bar') !== null) continue;
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

  /**
   * Every note that has a place in the field now, as a card or a tile, drawn
   * or behind the person. The collection counts its members against this, so
   * it can say how many are reachable only through the list (FEAT-0020).
   */
  placedIds(): Set<string> {
    return new Set(this.model.current.slots.keys());
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

  /**
   * What the four bands are doing right now, for the smoke run and the
   * measurement (TASK-0078, TASK-0079).
   *
   * The quiet band is painted, so where its tiles are is not readable from
   * the document; this is the only way a check can click one.
   */
  bandState(): {
    tiles: Array<{ id: string; x: number; y: number; w: number; h: number }>;
    promoted: string[];
    shapes: Record<string, { depth: number; columns: number; rows: number; width: number; height: number }>;
    counts: { front: number; mid: number; outer: number; deep: number };
    /** What the DEAL could not place: the band was full. These plus the four lists are every note. */
    remainders: { front: number; mid: number; outer: number; deep: number };
    /** What the ASSIGNMENT could not place: a pane took the slot. These notes ARE in the lists above. */
    unslotted: { front: number; mid: number; outer: number };
    dealt: number;
    cursor: string | null;
  } {
    const shapes = this.model.current.shapes;
    return {
      tiles: this.tiles.map((t) => ({ id: t.id, x: t.x, y: t.y, w: t.w, h: t.h })),
      promoted: [...this.promotedIds],
      shapes: Object.fromEntries(
        (['front', 'mid', 'outer', 'deep'] as const).map((b) => [
          b,
          { depth: shapes[b].depth, columns: shapes[b].columns, rows: shapes[b].rows, width: shapes[b].box.width, height: shapes[b].box.height },
        ]),
      ),
      counts: {
        front: this.deal?.front.length ?? 0,
        mid: this.deal?.mid.length ?? 0,
        outer: this.deal?.outer.length ?? 0,
        deep: this.deal?.deep.length ?? 0,
      },
      remainders: {
        front: this.deal?.frontOverflow ?? 0,
        mid: this.deal?.midOverflow ?? 0,
        outer: this.deal?.outerOverflow ?? 0,
        deep: this.deal?.deepOverflow ?? 0,
      },
      unslotted: {
        front: this.model.current.frontOverflow,
        mid: this.model.current.midOverflow,
        outer: this.model.current.outerOverflow,
      },
      dealt: this.entries.size,
      cursor: this.quietAt,
    };
  }

  /** The counts the measurement records: elements in the document and tiles on the canvas. */
  counts(): { elements: number; tiles: number; cards: number; outer: number; promoted: number } {
    // `tiles` is what the canvas PAINTS: a promoted quiet note is an element
    // and is counted as a card, not as a tile. TASK-0079 needs both numbers
    // separately, because the whole cost question is which is which.
    let outer = 0;
    for (const slot of this.model.current.slots.values()) {
      if (slot.band === 'outer' && this.at(slot, this.model.yaw).visible) outer += 1;
    }
    return {
      elements: document.getElementsByTagName('*').length,
      tiles: this.tiles.length,
      cards: this.drawnNotes().length,
      outer,
      promoted: this.promotedIds.size,
    };
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
    raw = false,
  ): Promise<{ frames: number; median: number; p95: number; visible: boolean; focused: boolean; mostTiles: number; mostElements: number; workMedian: number; workP95: number;
    rawFrames?: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }>; focusLost?: boolean; visibilityLost?: boolean }> {
    return new Promise((resolve) => {
      this.frameTimes = [];
      // The work a frame costs, apart from the wait for the display: a 60 Hz
      // display holds every frame to 16.7 ms however little work it took, so
      // the frame time alone cannot show the headroom a slower machine needs.
      const work: number[] = [];
      const rawFrames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }> = [];
      let focusLost = false;
      let visibilityLost = false;
      let last = performance.now();
      const start = last;
      // The worst moment, not the last one: the most tiles and elements on
      // screen at any point of the turn, sampled every tenth frame.
      let mostTiles = 0;
      let mostElements = 0;
      let frame = 0;
      const step = (now: number): void => {
        const intervalMs = now - last;
        const visible = document.visibilityState === 'visible';
        const focused = document.hasFocus();
        if (!focused) focusLost = true;
        if (!visible) visibilityLost = true;
        frame += 1;
        if (frame % 10 === 0) {
          const c = this.counts();
          mostTiles = Math.max(mostTiles, c.tiles, this.arrangement === 'orbit' ? this.dots.length : 0);
          mostElements = Math.max(mostElements, c.elements);
        }
        if (visible && focused) this.frameTimes?.push(intervalMs);
        const dt = now - last;
        last = now;
        const began = performance.now();
        this.model.turn((radiansPerSecond * dt) / 1000);
        this.el.field.classList.add('turning');
        this.render();
        const workMs = performance.now() - began;
        if (visible && focused) work.push(workMs);
        if (raw) rawFrames.push({ atMs: now - start, intervalMs, workMs, focused, visible });
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
          ...(raw ? { rawFrames, focusLost, visibilityLost } : {}),
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

  /** The documents this window draws: the desk's, and on a served page the ones it opened for itself. */
  private heldNow(state: DeckState): DeskCard[] {
    const desk = this.hooks.desk(state);
    if (this.hooks.canArrange() || this.localHeld.length === 0) return desk;
    const onDesk = new Set(desk.map((c) => c.noteId));
    return [...desk, ...this.localHeld.filter((c) => !onDesk.has(c.noteId))];
  }

  /** Bring a document to the top: through the store in the shell, in this page's own list on a served page. */
  private async raise(noteId: string): Promise<void> {
    if (this.hooks.canArrange()) {
      await this.hooks.dispatch({ type: 'raise-card', noteId });
      return;
    }
    const at = this.localHeld.findIndex((c) => c.noteId === noteId);
    if (at === -1 || at === this.localHeld.length - 1) return;
    this.localHeld.push(...this.localHeld.splice(at, 1));
  }

  private redeal(animate: boolean): void {
    if (this.arrangement === 'orbit') {
      this.redealOrbit(animate);
      return;
    }
    const state = this.hooks.state();
    const ws = state.workspaceId;
    this.held = this.heldNow(state);
    const heldIds = this.held.map((c) => c.noteId);
    const contexts = new Map<string, NoteContext>();
    const missing: string[] = [];
    for (const id of heldIds) {
      const context = this.hooks.peekContext(id);
      if (context === undefined) missing.push(id);
      else contexts.set(id, context);
    }
    // What the held notes are joined to is still marked on the field and
    // listed in the navigator. It no longer MOVES anything: until TASK-0104 a
    // held note's neighbourhood took the front band (TASK-0036), so putting a
    // note on the desk, or leaving the focus, dealt every card on screen
    // again. The neighbourhood is now gathered round the document a person
    // focuses, and the field keeps its slots (FEAT-0017, decision 7).
    this.joined = joinedTo(heldIds, contexts);
    this.shared = sharedAmong(heldIds, contexts);
    const hand = {
      held: new Set<string>(),
      joined: new Set<string>(),
      pulled: new Set(pulledIn(state, ws)),
      pushed: new Set(pushedIn(state, ws)),
    };
    const entries = fieldEntries(this.input.groups, hand);
    this.entries = new Map(entries.map((e) => [e.card.noteId, e]));
    if (this.input.view === null) {
      this.deal = null;
      this.shapeKey = '';
      this.model.setShapes(null);
      this.model.deal({ front: [], mid: [], outer: [], deep: [] }, []);
    } else {
      this.deal = dealField(this.input.view.band, entries);
      // The order the front band takes its SLOTS in: what a hand just pulled,
      // then what is owed (ISS-0064).
      const frontOrder = frontForSlots(this.deal.front);
      // The shapes are worked out when the VIEW or the WORKSPACE changes and
      // at no other time (ADR-0005, FEAT-0018 decision 5). Not on a deal that
      // moved one note: marking an issue fixed must move that issue and leave
      // every other tile where it was. `input.groups` changing identity is not
      // enough — the sidecar re-sends them whenever anything changes.
      const shapeKey = `${this.workspaceId() ?? ''}|${this.input.view.id}`;
      if (shapeKey !== this.shapeKey) {
        this.shapeKey = shapeKey;
        this.model.setShapes(
          shapesFor({
            front: this.deal.front.length,
            mid: this.deal.mid.length,
            outer: this.deal.outer.length,
            deep: this.deal.deep.length,
          }),
        );
      }
      // Nothing on the desk is an obstacle: the field passes behind the desk
      // and keeps its slots, so moving a document moves no card (TASK-0104).
      this.model.deal(
        {
          front: frontOrder.map((e) => e.card.noteId),
          mid: this.deal.mid.map((e) => e.card.noteId),
          outer: this.deal.outer.map((e) => e.card.noteId),
          deep: this.deal.deep.map((e) => e.card.noteId),
        },
        [],
      );
    }
    this.seatNeighbourhood();
    this.render(animate);
    this.drawPanes();
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
    this.held = this.heldNow(state);
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
    const missing = this.held.map((c) => c.noteId).filter((id) => this.hooks.peekContext(id) === undefined);
    this.seatNeighbourhood();
    this.render(animate);
    this.drawPanes();
    if (missing.length > 0) {
      void Promise.all(missing.map((id) => this.hooks.context(id).catch(() => null))).then(() => {
        if (this.active && this.arrangement === 'orbit') this.redealOrbit(true);
      });
    }
  }

  /** The size a held note is drawn at: its own, else the view's, else the first-use size. */
  private sizeOf(card: DeskCard): { w: number; h: number } {
    const state = this.hooks.state();
    const size = readingSizeFor(card, readingSizeOf(state, state.workspaceId, deskViewOf(state)));
    // Fitted for PAINTING only: a window made narrow for a moment must not
    // overwrite the size a person chose (DES-0003).
    return fitToField(size, this.viewport);
  }

  /**
   * Where a document stands ON THE DESK: its stored place, clamped so its
   * header is always inside the field, at its reading size. The desk's own
   * movement, `deskShift`, is added where it is drawn.
   */
  private paneRect(card: DeskCard): { left: number; top: number; w: number; h: number } {
    // One object in front in a narrow field, and a document asked to fill the
    // field (W): both are drawn over the whole field, for as long as that
    // lasts, and the place and size the store holds are untouched.
    if (this.narrowMode() !== null) {
      return { left: 0, top: NARROW_BAR_HEIGHT, w: this.viewport.width, h: Math.max(PANE_MIN_HEIGHT, this.viewport.height - NARROW_BAR_HEIGHT) };
    }
    if (card.wide === true) {
      return { left: FILL_MARGIN, top: FILL_MARGIN, w: Math.max(PANE_MIN_WIDTH, this.viewport.width - 2 * FILL_MARGIN), h: Math.max(PANE_MIN_HEIGHT, this.viewport.height - 2 * FILL_MARGIN) };
    }
    const { w, h } = this.sizeOf(card);
    return {
      left: Math.max(0, Math.min(card.x, this.viewport.width - w)),
      top: Math.max(0, Math.min(card.y, this.viewport.height - PANE_HEADER_HEIGHT)),
      w,
      h,
    };
  }

  /**
   * How far the whole desk is drawn from where its objects are stored, and how
   * faded. The desk stands at a bearing; turning away from it moves it as far
   * as a front-band card at that bearing moves, and it fades and stops taking
   * the pointer on the boundary where such a card does.
   */
  private deskShift(): { x: number; y: number; opacity: number; visible: boolean } {
    const phi = norm(this.deskBearing - this.model.yaw);
    const scale = PERSPECTIVE / (PERSPECTIVE + Math.cos(phi) * FRONT.depth);
    const visible = Math.abs(phi) < VISIBLE_HALF_ANGLE;
    const fade = Math.max(0, Math.min(1, (VISIBLE_HALF_ANGLE - Math.abs(phi)) / (26 * DEG)));
    return {
      x: Math.sin(phi) * FRONT.depth * scale + this.deskPan.x,
      y: this.deskPan.y,
      opacity: visible ? 0.3 + 0.7 * fade : 0,
      visible,
    };
  }

  /** A document where it is drawn now, in field pixels: its place on the desk, the desk's movement, and a drag in progress. */
  private drawnRect(card: DeskCard): Rect {
    const r = this.paneRect(card);
    // In a narrow field the object in front is not on the desk at all: it is
    // drawn over the field and stays there whatever way the field is turned.
    if (this.narrowMode() !== null) return { left: r.left, top: r.top, width: r.w, height: r.h };
    const shift = this.deskShift();
    const drag = this.dragOf !== null && this.dragOf.noteId === card.noteId && this.dragOf.x === card.x && this.dragOf.y === card.y ? this.dragOf : null;
    return { left: r.left + shift.x + (drag?.dx ?? 0), top: r.top + shift.y + (drag?.dy ?? 0), width: r.w, height: r.h };
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
    const seats = this.seatPositions();
    const shift = this.deskShift();
    this.seatedAt = seats;
    // What stands on the desk is placed first: the cards the collection shows
    // are placed from where it stands on THIS frame.
    const narrow = this.narrowMode();
    for (const item of this.furnitureItems) item.place(this.viewport, shift, narrow === null ? null : narrow === 'collection' ? 'front' : 'back');
    const grid = new Map<string, Point>();
    let gridZ = SEATED_Z;
    const taken = new Set(seats.keys());
    for (const item of this.furnitureItems) {
      const own = item.seats?.(taken, heldIds) ?? null;
      if (own === null) continue;
      gridZ = own.z;
      for (const [noteId, at] of own.at) {
        grid.set(noteId, at);
        if (this.entries.has(noteId) || this.gridEntries.has(noteId)) continue;
        const model = own.card(noteId);
        if (model === null) continue;
        this.gridEntries.set(noteId, { card: model, groupKey: '', groupLabel: '', inputs: { owed: false, suppressed: false, inSubject: true, held: false, joinedToDesk: false, pulled: false, pushed: false } });
      }
    }
    this.gridAt = grid;
    // In a narrow field the collection is drawn over the field, not on the desk, so the turn does not dim it.
    const gridShift = narrow === null ? shift : { opacity: 1, visible: true };
    const live = new Set<string>();
    let tabStops = 0;
    this.promotedIds = new Set();
    const draw = (noteId: string, entry: FieldEntry): { element: HTMLElement; arriving: boolean } => {
      live.add(noteId);
      let element = this.cardEls.get(noteId);
      const arriving = element === undefined;
      if (element === undefined) {
        element = this.makeCard(noteId);
        this.cardEls.set(noteId, element);
        this.el.cards.appendChild(element);
      }
      element.classList.remove('leaving');
      return { element, arriving };
    };
    for (const [noteId, slot] of this.model.current.slots) {
      // One note is one object (ISS-0070). A held note is its document, so no
      // card is drawn for it and nothing marks the slot it left: the model
      // still holds that slot for it, which is what "reserved" means here.
      if (heldIds.has(noteId)) continue;
      const seat = seats.get(noteId);
      const inCollection = seat === undefined ? grid.get(noteId) : undefined;
      // A quiet tile drawn large enough to read stops being a rectangle on
      // the canvas and becomes an ordinary card (TASK-0077). The threshold is
      // the one that decides every other card's detail, and it is read from
      // the same projection this loop already needs. The orbit's `deep` slots
      // are its own and are dots, so nothing is promoted there. A SEATED note
      // is a card whatever band it came from: it is being read, not shelved.
      if (seat === undefined && inCollection === undefined && slot.band === 'deep') {
        if (this.arrangement === 'orbit') continue;
        const p = this.at(slot, yaw);
        if (!p.visible || !promoted(p.scale * this.model.current.shapes.deep.box.width, this.promotedBefore.has(noteId))) continue;
        this.promotedIds.add(noteId);
      }
      const entry = this.entries.get(noteId);
      if (entry === undefined) continue;
      const { element, arriving } = draw(noteId, entry);
      this.paintCard(element, entry, slot.band, seat !== undefined);
      if (seat !== undefined) {
        if (this.placeSeated(element, seat, shift, arriving && animate && !reduced)) tabStops += 1;
        continue;
      }
      if (inCollection !== undefined) {
        if (this.placeSeated(element, inCollection, gridShift, arriving && animate && !reduced, gridZ, 'in-collection')) tabStops += 1;
        continue;
      }
      const p = this.at(slot, yaw);
      this.place(element, p, slot, arriving && animate && !reduced);
      if (p.visible) tabStops += 1;
    }
    // A seated note the deal gave no slot: one from outside the view, or one a
    // full band counted and did not place. It is drawn here and nowhere else.
    for (const [noteId, seat] of seats) {
      if (live.has(noteId) || heldIds.has(noteId)) continue;
      const entry = this.entries.get(noteId) ?? this.seatEntries.get(noteId);
      if (entry === undefined) continue;
      const { element, arriving } = draw(noteId, entry);
      this.paintCard(element, entry, 'front', true);
      if (this.placeSeated(element, seat, shift, arriving && !reduced)) tabStops += 1;
    }
    // And a collection member the deal gave no slot: most of a large view.
    for (const [noteId, at] of grid) {
      if (live.has(noteId) || heldIds.has(noteId)) continue;
      const entry = this.entries.get(noteId) ?? this.gridEntries.get(noteId);
      if (entry === undefined) continue;
      const { element, arriving } = draw(noteId, entry);
      this.paintCard(element, entry, 'front', false);
      if (this.placeSeated(element, at, gridShift, arriving && !reduced, gridZ, 'in-collection')) tabStops += 1;
    }
    for (const noteId of [...this.gridEntries.keys()]) if (!grid.has(noteId)) this.gridEntries.delete(noteId);
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
    this.el.cards.dataset['seated'] = String(seats.size);
    this.el.cards.dataset['inCollection'] = String(grid.size);
    // Remembered for the next frame's hysteresis: a note already drawn as a
    // card is demoted at a slightly smaller width than it was promoted at, so
    // a zoom drifting across the threshold does not flicker.
    this.promotedBefore = this.promotedIds;
    this.el.cards.dataset['promoted'] = String(this.promotedIds.size);
    this.drawSectors();
    this.drawQuietCursor();
    this.paintCanvas();
    this.drawInstrument();
    // The desk moves with the turn, so its documents are placed every frame;
    // what they hold is painted only when the desk itself changes (drawPanes).
    this.placePanes();
    this.drawNarrowBar(narrow);
    this.drawLinks();
    this.drawDeskFurniture();
  }

  private place(element: HTMLElement, p: Projection, slot: Slot, arriving: boolean): void {
    // A card is drawn in its own band's box (TASK-0073), and shows as much of
    // its note as that box's width on screen earns (TASK-0074). Neither is a
    // rule about which band it is in: an outer-field card is smaller and says
    // less because its box is smaller, and a mid card zoomed in says more.
    const band = this.model.current.shapes[slot.band].box;
    // A promoted quiet tile is the exception, because it is the one card whose
    // band box says how a TILE is painted rather than how a CARD is laid out.
    // It is laid out at the size it is already drawn at, with no scale, so the
    // detail it was promoted to show has room (TASK-0084, ISS-0084).
    const lift = this.promotedIds.has(element.dataset['noteId'] ?? '');
    const box = lift ? promotedBox(p.scale * band.width, CARD_BOX.width / CARD_BOX.height) : band;
    const draw = lift ? { ...p, scale: 1 } : p;
    element.classList.remove('seated', 'in-collection');
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
    element.dataset['detail'] = detailFor(lift ? box.width : p.scale * box.width);
    element.style.transform = cardTransform(draw, box);
    element.style.zIndex = String(p.z);
    const fade = Math.max(0, Math.min(1, (78 * DEG - Math.abs(p.phi)) / (26 * DEG)));
    const target = !p.visible ? 0 : (slot.band === 'mid' ? 0.9 : 1) * (0.3 + 0.7 * fade);
    const dim = this.held.length > 0 && !this.joined.has(element.dataset['noteId'] ?? '') && slot.band !== 'front' ? 0.45 : 1;
    // While a document is the focus, what is not gathered round it steps back.
    const aside = this.focusId() !== null ? FOCUS_DIM : 1;
    if (arriving) {
      element.style.opacity = '0';
      requestAnimationFrame(() => {
        element.style.opacity = String(target * dim * aside);
      });
    } else {
      element.style.opacity = String(target * dim * aside);
    }
    element.style.pointerEvents = p.visible ? 'auto' : 'none';
    element.tabIndex = p.visible ? 0 : -1;
    element.setAttribute('aria-hidden', String(!p.visible));
  }

  /**
   * Draw a card at its seat beside the focused document: flat, at the size a
   * front-band card is browsed at, and moved only by the desk. The zoom and
   * the turn's perspective do not reach it, so the arrangement keeps its shape
   * while the document is dragged or the field is turned (ISS-0072). Returns
   * whether it is in the field, which is whether it takes the pointer and Tab.
   */
  private placeSeated(
    element: HTMLElement,
    at: Point,
    shift: { opacity: number; visible: boolean },
    arriving: boolean,
    z: number = SEATED_Z,
    where: 'seated' | 'in-collection' = 'seated',
  ): boolean {
    // Gathered round a document, or shown by the collection: the same card
    // at the same size, told apart so each can be counted and styled.
    element.classList.toggle('seated', where === 'seated');
    element.classList.toggle('in-collection', where === 'in-collection');
    element.style.width = `${CARD_BOX.width}px`;
    element.style.height = `${CARD_BOX.height}px`;
    element.dataset['detail'] = detailFor(SEAT.width);
    element.style.transform = `translate3d(${(at.x - CARD_BOX.width / 2).toFixed(1)}px, ${(at.y - CARD_BOX.height / 2).toFixed(1)}px, 0) scale(${BROWSE_SCALE.toFixed(3)})`;
    element.style.zIndex = String(z);
    const inSight =
      shift.visible &&
      at.x + SEAT.width / 2 > SEAT_IN_SIGHT_PX &&
      at.x - SEAT.width / 2 < this.viewport.width - SEAT_IN_SIGHT_PX &&
      at.y + SEAT.height / 2 > SEAT_IN_SIGHT_PX &&
      at.y - SEAT.height / 2 < this.viewport.height - SEAT_IN_SIGHT_PX;
    if (arriving) {
      element.style.opacity = '0';
      requestAnimationFrame(() => {
        element.style.opacity = String(shift.opacity);
      });
    } else {
      element.style.opacity = String(shift.opacity);
    }
    element.style.pointerEvents = inSight ? 'auto' : 'none';
    element.tabIndex = inSight ? 0 : -1;
    element.setAttribute('aria-hidden', String(!inSight));
    return inSight;
  }

  private makeCard(noteId: string): HTMLElement {
    const element = document.createElement('article');
    element.className = 'field-card';
    element.dataset['noteId'] = noteId;
    element.setAttribute('role', 'button');
    element.innerHTML =
      '<span class="fc-top"><span class="fc-id"></span><span class="fc-mark"></span></span>' +
      '<span class="fc-title"></span><span class="fc-face"></span><span class="fc-owed"></span><span class="fc-more"></span>';
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

  private paintCard(element: HTMLElement, entry: FieldEntry, band: string, seated: boolean): void {
    const { card } = entry;
    const shared = this.shared.get(card.noteId) ?? 0;
    const focus = seated ? this.focusId() : null;
    // A turn redraws every card on every frame, and nothing a card SHOWS
    // changes during one. Everything this method reads is in this line or is
    // the card and the faces themselves, so a card whose line, card and faces
    // are the ones it was last painted from is left alone. With 217 notes
    // seated round a document this was a quarter of a frame's work.
    const emphasised = seated ? this.emphasisIds() : null;
    const quiet = emphasised !== null && !emphasised.has(card.noteId);
    const inputs = `${quiet}|${band}|${entry.inputs.pulled}|${entry.inputs.owed}|${this.joined.has(card.noteId)}|${this.reach?.neighbours.has(card.noteId) === true}|${this.highlight === card.noteId || this.highlights.has(card.noteId)}|${shared}|${this.hooks.state().noteId === card.noteId}|${focus}|${card.status}|${card.title}|${card.owedVerb}`;
    const painted = this.paintedFrom.get(element);
    if (painted !== undefined && painted.card === card && painted.faces === this.input.faces && painted.inputs === inputs) return;
    this.paintedFrom.set(element, { card, faces: this.input.faces, inputs });
    element.classList.toggle('quiet', quiet);
    element.dataset['band'] = band;
    element.dataset['status'] = bandFor(card.status);
    element.dataset['face'] = faceFor(card, this.input.faces).kind;
    element.classList.toggle('pulled', entry.inputs.pulled && !entry.inputs.owed);
    element.classList.toggle('owed', entry.inputs.owed);
    element.classList.toggle('joined', this.joined.has(card.noteId));
    element.classList.toggle('reached', this.reach?.neighbours.has(card.noteId) === true);
    element.classList.toggle('highlight', this.highlight === card.noteId || this.highlights.has(card.noteId));
    element.classList.toggle('shared', shared >= 2);
    element.setAttribute('aria-current', String(this.hooks.state().noteId === card.noteId));
    const label = `${card.noteId} ${card.title}${entry.inputs.owed ? `, owed ${card.owedVerb ?? 'a decision'}` : ''}${focus === null ? '' : `, joined to ${focus}`}`;
    element.setAttribute('aria-label', label);
    setText(element, '.fc-id', card.noteId);
    setText(element, '.fc-title', card.title);
    const marks: string[] = [];
    if (entry.inputs.pulled && !entry.inputs.owed) marks.push('✋');
    if (shared >= 2) marks.push(`◆${shared}`);
    setText(element, '.fc-mark', marks.join(' '));
    setText(element, '.fc-face', faceText(card, this.input.faces));
    setText(element, '.fc-owed', entry.inputs.owed ? (card.owedVerb ?? 'needs you') : '');
    this.paintMore(element, card);
  }

  /**
   * The `more` level's line: what a card shows once it is drawn large enough
   * to hold it (TASK-0074, DETAIL_SHOWS.more).
   *
   * Status, progress and the properties the view's face names, all of which
   * `CardModel` already carries and none of which the field has ever drawn.
   * No excerpt: the card has no body text, and ISS-0074's step 4 is dropped.
   */
  private paintMore(element: HTMLElement, card: CardModel): void {
    const more = element.querySelector('.fc-more') as HTMLElement;
    const parts: Array<{ label: string | null; value: string }> = [];
    if (card.status !== '') parts.push({ label: null, value: card.status });
    if (card.progress !== null) parts.push({ label: null, value: `${card.progress.done}/${card.progress.total}` });
    if (card.subtitle !== null && card.subtitle !== '') parts.push({ label: null, value: card.subtitle });
    for (const field of fieldsFor(specFor(this.input.faces, card), card.frontmatter)) {
      parts.push({ label: field.property, value: field.value });
    }
    // Built as elements rather than as markup: a note's own text reaches this
    // line, and the field has never put note text through innerHTML.
    const nodes = parts.map((part) => {
      const span = document.createElement('span');
      span.className = 'fc-prop';
      if (part.label !== null) span.append(`${part.label} `);
      const value = document.createElement('b');
      value.textContent = part.value;
      span.append(value);
      return span;
    });
    more.replaceChildren(...nodes);
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
    this.tiles = [];
    ctx.textBaseline = 'middle';
    for (const [noteId, slot] of this.model.current.slots) {
      if (slot.band !== 'deep') continue;
      // Never both: a promoted note is an element this frame, so the canvas
      // leaves it alone. A held note is its document and a seated note is its
      // card beside the document, so neither is also a tile (ISS-0070).
      if (this.promotedIds.has(noteId) || heldIds.has(noteId) || this.seatedAt.has(noteId) || this.gridAt.has(noteId)) continue;
      const p = this.at(slot, yaw);
      if (!p.visible) continue;
      const entry = this.entries.get(noteId);
      // The tile's size comes from the quiet band's shape, so a small
      // workspace's shelf is drawn in tiles a person can read (TASK-0073).
      const box = this.model.current.shapes.deep.box;
      const w = box.width * p.scale;
      const h = box.height * p.scale;
      // Remembered for the pointer, the way the orbit remembers its dots: the
      // projection is already computed here, so the hit test costs a lookup
      // rather than a second pass over the band (TASK-0076).
      this.tiles.push({ x: p.x, y: p.y, w, h, id: noteId, depth: slot.depth });
      const fade = Math.max(0, Math.min(1, (78 * DEG - Math.abs(p.phi)) / (26 * DEG)));
      ctx.globalAlpha = (0.25 + 0.5 * fade) * (slot.layer === 0 ? 1 : 0.7);
      const status = entry === undefined ? 'planned' : bandFor(entry.card.status);
      ctx.fillStyle = '#1b1f2b';
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
    const heldIds = new Set(this.held.map((c) => c.noteId));
    for (const [id, _slot] of drawn) {
      const p = at.get(id);
      const node = nodes.get(id);
      if (p === undefined || node === undefined || !p.visible) continue;
      // A held note is its document, and a seated note is its card beside the
      // document: neither is also a dot (ISS-0070). Their links are still
      // drawn to the place the layout keeps for them.
      if (heldIds.has(id) || this.seatedAt.has(id)) continue;
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
    // The cards are dots too, for the pointer's purposes: where each is drawn.
    for (const [id, slot] of this.model.current.slots) {
      if (slot.band === 'deep' || heldIds.has(id)) continue;
      const seat = this.seatedAt.get(id);
      if (seat !== undefined) {
        this.dots.push({ x: seat.x, y: seat.y, r: 0, id });
        continue;
      }
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

  /**
   * The quiet-band tile under this point, or null.
   *
   * DES-0002's rule is that anything visible is clickable; its first revision
   * hit this exact defect and fixed it, and Deck lost the rule by moving the
   * band onto a canvas. Modelled on `dotAt`, including the ordering: the
   * NEAREST tile wins, so a tile on the first layer is picked over one on the
   * third behind it.
   */
  private tileAt(x: number, y: number): string | null {
    let best: string | null = null;
    let bestDepth = Infinity;
    for (const t of this.tiles) {
      if (x < t.x - t.w / 2 || x > t.x + t.w / 2 || y < t.y - t.h / 2 || y > t.y + t.h / 2) continue;
      if (t.depth < bestDepth) {
        bestDepth = t.depth;
        best = t.id;
      }
    }
    return best;
  }

  /**
   * The quiet band's keyboard cursor: which note it is on, in the band's own
   * order, or null when the keyboard has not entered the band.
   */
  private quietAt: string | null = null;

  /** The quiet band's notes in shelf order: the order `quietSlot` deals them. */
  private quietOrder(): string[] {
    return this.deal === null ? [] : this.deal.deep.map((e) => e.card.noteId);
  }

  /**
   * Put the single tab stop over the tile the cursor is on, or take it out of
   * the tab order when the band is empty.
   *
   * One element, whatever the band holds. A thousand tab stops is not a
   * keyboard route, and leaving the band out of the tab order is exactly as
   * bad by keyboard as by mouse (TASK-0076).
   */
  private drawQuietCursor(): void {
    const el = this.el.quietCursor;
    const order = this.quietOrder();
    if (this.arrangement === 'orbit' || order.length === 0) {
      el.hidden = true;
      this.quietAt = null;
      return;
    }
    const id = this.quietAt !== null && order.includes(this.quietAt) ? this.quietAt : (order[0] as string);
    this.quietAt = id;
    const slot = this.model.current.slots.get(id);
    if (slot === undefined || slot.band !== 'deep') {
      el.hidden = true;
      return;
    }
    const p = this.at(slot, this.model.yaw);
    const box = this.model.current.shapes.deep.box;
    el.hidden = false;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    el.style.transform = cardTransform(p, box);
    el.style.opacity = p.visible ? '1' : '0';
    const entry = this.entries.get(id);
    el.setAttribute('aria-label', `${id} ${entry?.card.title ?? ''}, in the quiet band. Arrow keys move along the shelf, Enter puts it on the desk, p pulls it to the front band, b pushes it behind.`);
  }

  /**
   * Move the keyboard cursor along the shelf and turn to keep it in sight.
   *
   * Left and right step a column; up and down step a row, which is the shape's
   * column count apart in the band's own order.
   */
  private moveQuietCursor(key: string): void {
    const order = this.quietOrder();
    if (order.length === 0) return;
    const columns = this.model.current.shapes.deep.columns;
    const at = this.quietAt === null ? 0 : Math.max(0, order.indexOf(this.quietAt));
    const step = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -columns : columns;
    const next = Math.max(0, Math.min(order.length - 1, at + step));
    this.quietAt = order[next] as string;
    const slot = this.model.current.slots.get(this.quietAt);
    this.drawQuietCursor();
    // Turn to keep the cursor in sight, the way landing on a note does.
    if (slot !== undefined && Math.abs(norm(slot.theta - this.model.yaw)) > 20 * DEG) this.flyTo(slot.theta);
  }

  /** Enter on the quiet band's cursor: the note it is on goes on the desk, as a click does. */
  private liftQuietCursor(): void {
    const id = this.quietAt;
    const entry = id === null ? undefined : this.entries.get(id);
    if (entry !== undefined) void this.tap(entry);
  }

  /**
   * `p` and `b` on the quiet band's cursor, the same two keys a focused card
   * takes: the note under the cursor is pulled to the front band or pushed
   * behind (TASK-0083).
   *
   * This is the keyboard half of the answer to ISS-0082. A tile is paint, so
   * there is no element for `cardKey` to be bound to, and before this the only
   * route to `pull` was to zoom a tile past the promotion threshold -- which a
   * crowded shelf never reaches at any zoom. `pull` and `push` themselves are
   * FEAT-0014's and are not copied: this finds the note and calls them.
   */
  private handQuietCursor(key: string): void {
    const id = this.quietAt;
    const entry = id === null ? undefined : this.entries.get(id);
    if (entry === undefined) return;
    if (key === 'p' || key === 'P') void this.pull(entry);
    else void this.push(entry);
  }

  /** The quiet-band notes drawn as elements this frame, and the ones that were last frame. */
  private promotedIds = new Set<string>();
  private promotedBefore = new Set<string>();

  /** Every quiet tile painted this frame, with where it landed. Rebuilt by `paintCanvas`. */
  private tiles: Array<{ x: number; y: number; w: number; h: number; id: string; depth: number }> = [];

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

  /**
   * Say which note the tile under the pointer is: an id and a title, which is
   * what a card's `brief` level shows (TASK-0076).
   */
  private showTileCallout(noteId: string | null, x: number, y: number): void {
    const callout = this.el.callout;
    const entry = noteId === null ? undefined : this.entries.get(noteId);
    if (entry === undefined) {
      callout.hidden = true;
      return;
    }
    callout.replaceChildren();
    const head = document.createElement('div');
    head.className = 'callout-head';
    head.textContent = `${entry.card.noteId}${entry.card.status === '' ? '' : ` · ${entry.card.status}`}`;
    const body = document.createElement('div');
    body.textContent = entry.card.title;
    callout.append(head, body);
    callout.hidden = false;
    callout.style.left = `${Math.min(this.viewport.width - 370, x + 14)}px`;
    callout.style.top = `${Math.max(8, y - 12)}px`;
  }

  /** Quote the sentence that made the link under the pointer. */
  private showCallout(edge: GraphEdge | null, x: number, y: number, relation = ''): void {
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
      // What joins the two notes, in the source's own words, when it says.
      if (relation !== '') {
        const how = document.createElement('div');
        how.className = 'callout-relation';
        how.textContent = relation;
        callout.appendChild(how);
      }
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
    const origin = this.cardOnScreen(this.reach.noteId);
    if (origin === null || !origin.visible) return;
    ctx.strokeStyle = 'rgba(122,162,247,0.75)';
    ctx.lineWidth = 1.4;
    for (const id of this.reach.neighbours) {
      const p = this.cardOnScreen(id);
      if (p === null || !p.visible) continue;
      // Anchored on the card's edge along the bearing of the neighbour: the
      // rule DES-0002 settled in rev 5.
      const ax = p.x > origin.x ? origin.x + origin.width / 2 : origin.x - origin.width / 2;
      ctx.beginPath();
      ctx.moveTo(ax, origin.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      this.wires.push({ x1: ax, y1: origin.y, x2: p.x, y2: p.y });
    }
  }

  /**
   * Where a note's CARD is drawn now: at its seat beside the focused
   * document, or at its slot in the field. Null for a note with neither, and
   * for a held note, which is a document and has no card.
   */
  private cardOnScreen(noteId: string): { x: number; y: number; width: number; height: number; visible: boolean } | null {
    if (this.held.some((c) => c.noteId === noteId)) return null;
    const seat = this.seatedAt.get(noteId);
    if (seat !== undefined) {
      return { x: seat.x, y: seat.y, width: SEAT.width, height: SEAT.height, visible: this.deskShift().visible };
    }
    const slot = this.model.current.slots.get(noteId);
    if (slot === undefined) return null;
    const p = this.at(slot, this.model.yaw);
    const rect = cardRect(p, this.boxOf(noteId));
    return { x: p.x, y: p.y, width: rect.right - rect.left, height: rect.bottom - rect.top, visible: p.visible };
  }

  /** The box a note is drawn in: its band's, or the front band's when it has no slot. */
  private boxOf(noteId: string): { width: number; height: number } {
    const slot = this.model.current.slots.get(noteId);
    const band = this.model.current.shapes[slot?.band ?? 'front'].box;
    // A promoted tile is laid out at its apparent size and drawn with no
    // scale (TASK-0084), so the rect a wire starts from is that box, not the
    // band's. `cardRect` multiplies by the projection's scale, so the box it
    // is handed here is divided back out to leave the same number.
    if (slot === undefined || !this.promotedIds.has(noteId)) return band;
    const p = this.at(slot, this.model.yaw);
    if (p.scale <= 0) return band;
    const drawn = promotedBox(p.scale * band.width, CARD_BOX.width / CARD_BOX.height);
    return { width: drawn.width / p.scale, height: drawn.height / p.scale };
  }

  private drawInstrument(): void {
    const deal = this.deal;
    const heldCount = this.held.length;
    // The front band is what needs a person, whatever is on the desk: a held
    // note's neighbourhood gathers round its document now, not in this band.
    this.el.frontLabel.textContent = this.arrangement === 'orbit' ? this.orbitLabel() : 'in front: what needs you';
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
    // Every band says how many of its notes it could not place, and a band
    // that placed everything says nothing (ADR-0005). The quiet band is in
    // this sentence for the first time: it used to promise to draw all of it.
    const overflow: string[] = [];
    const remainder: Array<[number, string]> = [
      [(deal?.frontOverflow ?? 0) + this.model.current.frontOverflow, 'more in front'],
      [(deal?.midOverflow ?? 0) + this.model.current.midOverflow, 'more in the middle'],
      [(deal?.outerOverflow ?? 0) + this.model.current.outerOverflow, 'more in the outer field'],
      [deal?.deepOverflow ?? 0, 'more in the quiet band'],
    ];
    for (const [count, what] of remainder) {
      if (count > 0) overflow.push(`${count} ${what}`);
    }
    this.el.overflow.textContent = overflow.length === 0 ? '' : `and ${overflow.join(', ')} — all listed in the navigator`;
    this.el.pendingChip.hidden = this.input.pending === 0;
    this.el.pendingChip.textContent =
      this.input.pending === 1 ? '1 note changed — show it' : `${this.input.pending} notes changed — show them`;
    // What Escape does, as two named controls (DES-0003): each is offered
    // only while it would do something.
    this.el.leaveFocus.hidden = this.focusId() === null;
    this.drawArrangeControls();
    this.el.sweepDesk.hidden = heldCount === 0 || (!this.hooks.canArrange() && this.localHeld.length === 0);
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
    // The quiet band now has a capacity, so what it holds and what it could
    // not place are two numbers and both belong here (PHASE-0002, criterion 1).
    const quietRest = this.arrangement === 'orbit' ? 0 : this.deal?.deepOverflow ?? 0;
    const quietSaid = quietRest > 0 ? `${quiet} in the quiet band, ${quietRest} more counted` : `${quiet} in the quiet band`;
    const parts = [this.arrangement === 'orbit' ? `${behind} out of sight` : `${quietSaid} · ${behind} out of sight`];
    if (pushed > 0) parts.push(`${pushed} pushed there by hand`);
    if (this.reach !== null && reachBehind > 0) parts.push(`${reachBehind} of ${this.reach.noteId}'s neighbours behind you`);
    this.el.behind.textContent = parts.join(' · ');
    this.el.compass.dataset['behind'] = String(behind);
    this.el.compass.dataset['quiet'] = String(quiet);
    this.el.compass.dataset['quietRest'] = String(quietRest);
    this.el.compass.dataset['pushed'] = String(pushed);
  }

  // ---- turning ----

  private wire(): void {
    const field = this.el.field;
    let look: { x: number; y: number; yaw: number; id: number; moved: boolean; tile: string | null; hand: boolean } | null = null;
    field.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.field-card, .pane, .collection, .narrow-bar, button, .target-strip') !== null) return;
      if (event.button !== 0) return;
      this.scheduleIdle();
      this.el.field.classList.remove('turning');
      // A press that lands on a painted quiet tile remembers which note it was,
      // so a downward drag from there can pull that note forward the way a drag
      // on a card does (TASK-0083). A press anywhere else on the field is a
      // turn, which is every press the field saw before this.
      const box = field.getBoundingClientRect();
      const tile = this.arrangement === 'orbit' ? null : this.tileAt(event.clientX - box.left, event.clientY - box.top);
      look = { x: event.clientX, y: event.clientY, yaw: this.model.yaw, id: event.pointerId, moved: false, tile, hand: false };
      field.setPointerCapture(event.pointerId);
    });
    // Resting on something painted says what it is: in the orbit a link is
    // quoted and a dot named, in the field a quiet-band tile is named
    // (TASK-0076). The guard is about whether a person is RESTING -- a turn in
    // progress, or a button held, is not resting. It used to also require the
    // orbit, which made the field's whole half of this listener dead code
    // (ISS-0081); the two branches below are what tell the arrangements apart.
    field.addEventListener('pointermove', (event) => {
      if (look !== null || event.buttons !== 0) return;
      // A pointer over the orbit is a person looking: the drift waits, or the
      // link under the pointer turns away while its sentence is being read.
      if (this.idle.frame !== null) this.el.field.classList.remove('turning');
      this.scheduleIdle();
      if ((event.target as HTMLElement).closest('.field-card, .pane, .collection, .narrow-bar, .compass, .field-bar') !== null) {
        // Over an element the field's own cursor and callout say nothing: the
        // element carries its own, and a stale pointer cursor underneath it
        // would claim the background is clickable when it is not.
        field.style.cursor = '';
        this.showCallout(null, 0, 0);
        return;
      }
      const box = field.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      // In the orbit a dot is a note; in the field a quiet-band tile is
      // (TASK-0076). Both are painted, so neither is reachable by the DOM.
      const hit = this.arrangement === 'orbit' ? this.dotAt(x, y) : this.tileAt(x, y);
      field.style.cursor = hit !== null ? 'pointer' : '';
      if (this.arrangement !== 'orbit') {
        this.showTileCallout(hit, x, y);
        return;
      }
      this.showCallout(hit !== null ? null : this.edgeAt(x, y), x, y);
    });
    field.addEventListener('pointerleave', () => {
      field.style.cursor = '';
      this.showCallout(null, 0, 0);
    });
    // Zoom (FEAT-0016): not passive, so the page and Electron's own page zoom stay put.
    field.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    // A double-click on the background returns to 1×; on a card, a pane, a
    // dot or a button it is two clicks on that thing, and the zoom stays.
    field.addEventListener('dblclick', (event) => {
      if (!this.active) return;
      const target = event.target as HTMLElement;
      if (target.closest('.field-card, .pane, .collection, .narrow-bar, button, .target-strip, .compass, .field-bar') !== null) return;
      const box = field.getBoundingClientRect();
      const dx = event.clientX - box.left;
      const dy = event.clientY - box.top;
      if ((this.arrangement === 'orbit' ? this.dotAt(dx, dy) : this.tileAt(dx, dy)) !== null) return;
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
      // A drag that began on a tile and goes down pulls that note to the front
      // band, on the same threshold and the same mostly-vertical test a card's
      // drag uses (TASK-0083). It fires once: `hand` keeps the rest of the
      // drag from pulling the same note again.
      if (look.tile !== null && !look.hand && !look.moved) {
        const dy = event.clientY - look.y;
        if (dy >= PULL_THRESHOLD_PX && dy > Math.abs(dx)) {
          const entry = this.entries.get(look.tile);
          look.hand = true;
          if (entry !== undefined) void this.pull(entry);
          return;
        }
      }
      if (look.hand) return;
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
      const pulled = look.hand;
      look = null;
      if (pulled) return;
      // A click on the background changes nothing: sweeping a desk by
      // accident is unforgivable (DES-0002 rev 8). In the orbit a click on a
      // dot is a click on a note, and lands on it (TASK-0004).
      if (!this.turning) {
        const box = field.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;
        const id = this.arrangement === 'orbit' ? this.dotAt(x, y) : this.tileAt(x, y);
        const entry = id === null ? undefined : this.entries.get(id);
        if (entry !== undefined) void this.tap(entry);
        return;
      }
      this.turning = false;
      field.classList.remove('turning');
    };
    field.addEventListener('pointerup', end);
    field.addEventListener('pointercancel', end);
    // The quiet band's one tab stop: the arrow keys walk the shelf, Enter
    // lifts, Escape leaves the band (TASK-0076). Handled on the element, so
    // the field's own arrow keys keep turning when the focus is anywhere else.
    this.el.quietCursor.addEventListener('keydown', (event) => {
      this.scheduleIdle();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        this.moveQuietCursor(event.key);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.liftQuietCursor();
        return;
      }
      if (event.key === 'p' || event.key === 'P' || event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        event.stopPropagation();
        this.handQuietCursor(event.key);
        return;
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.el.field.focus();
      }
    });
    this.el.quietCursor.addEventListener('click', (event) => {
      event.preventDefault();
      this.liftQuietCursor();
    });
    field.addEventListener('keydown', (event) => {
      this.scheduleIdle();
      const target = event.target as HTMLElement;
      if (target.closest('.pane') !== null || target.tagName === 'INPUT') return;
      if (target === this.el.quietCursor) return;
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
      // One key press ends one thing (decision 10). A drag in progress is put
      // back; otherwise the focus is left and every document stays; only with
      // neither does Escape sweep the desk. A list or a menu inside a document
      // takes the key before it reaches here.
      if (this.dragCancel !== null) {
        this.dragCancel();
        return;
      }
      // A preview, or the question an undo asks, is a local thing: Escape
      // withdraws it, and does not also leave the focus or close a note.
      if (this.arranging !== null || this.undoAsk !== null) {
        this.cancelArrange();
        return;
      }
      if (this.focusId() !== null) {
        this.leaveFocus();
        return;
      }
      void this.sweep();
    });
    this.el.arrangeRead.addEventListener('click', () => this.startArrange('read', this.el.arrangeRead));
    this.el.arrangeCompare.addEventListener('click', () => this.startArrange('compare', this.el.arrangeCompare));
    this.el.arrangeRelated.addEventListener('click', () => this.startArrange('related', this.el.arrangeRelated));
    this.el.arrangeUndo.addEventListener('click', () => void this.undoArrange(false));
    this.el.arrangeApply.addEventListener('click', () => {
      if (this.undoAsk !== null) void this.undoArrange(true);
      else void this.applyArrange();
    });
    this.el.arrangeCancel.addEventListener('click', () => this.cancelArrange());
    // "Find": the desk comes back in front of the person, wherever it was
    // turned from or moved aside to (TASK-0104, ISS-0072's "way back").
    this.el.findOpen.addEventListener('click', () => this.findOpen(this.el.findOpen.dataset['noteId'] ?? null));
    this.el.toCollection.addEventListener('click', () => this.showCollection());
    this.el.leaveFocus.addEventListener('click', () => this.leaveFocus());
    this.el.sweepDesk.addEventListener('click', () => {
      // Sweeping from a document in focus leaves the focus first, as the key does.
      this.leaveFocus();
      void this.sweep();
    });
    // One counter per edge of the field, for what is gathered round the
    // focused document and stands beyond that edge.
    for (const side of BEYOND_SIDES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action beyond';
      button.dataset['side'] = side;
      button.hidden = true;
      button.addEventListener('click', () => this.lookBeyond(side));
      this.el.beyond.appendChild(button);
    }
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
  }

  faceFront(): void {
    this.flyTo(0);
  }

  /**
   * Turn to face an angle: a flight rather than a cut, so the person keeps
   * their bearings. Under reduced motion it is a cut, and the arrival is
   * shown by a highlight rather than by nothing (TASK-0033).
   */
  flyTo(yaw: number, highlight: string | null = null, carryDesk = false): void {
    this.cancelFlight();
    // A person asked for this direction; the orbit's drift waits again.
    this.scheduleIdle();
    this.highlight = highlight;
    // `carryDesk`: the turn was asked for FROM the desk, by a row of the
    // collection, so the desk stays where the person is working and the field
    // turns under it. A turn made by hand leaves the desk where it stands.
    const offset = norm(this.deskBearing - this.model.yaw);
    const carry = (): void => {
      if (carryDesk) this.deskBearing = norm(this.model.yaw + offset);
    };
    if (this.hooks.reducedMotion()) {
      this.model.face(yaw);
      carry();
      this.render(false);
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
      carry();
      this.render(false);
      if (t < 1) {
        this.flight = requestAnimationFrame(step);
        return;
      }
      this.flight = null;
      this.el.field.classList.remove('turning');
      this.clearHighlightLater();
    };
    this.flight = requestAnimationFrame(step);
  }

  /** Mark these cards for a moment. */
  highlightAll(ids: Iterable<string>): void {
    this.markCards(ids);
    this.render(false);
  }

  /** Mark these cards from the next paint on, and take the mark off after a moment. */
  private markCards(ids: Iterable<string>): void {
    this.highlights = new Set(ids);
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
    this.flyTo(this.yawToShow(slot), noteId, true);
  }

  /**
   * The yaw that draws a slot in the widest part of the field the desk does
   * not cover. A row of the collection names a note, and its card should be
   * seen beside the list and the documents, not flown to the middle of the
   * field where a document is likely to be standing over it (TASK-0098).
   * With no clear span worth the name, the card is brought straight ahead.
   */
  private yawToShow(slot: Slot): number {
    const covered: Array<[number, number]> = [];
    for (const rect of this.furniture()) covered.push([rect.left, rect.left + rect.width]);
    if (!this.panesHidden && this.narrowMode() === null) {
      for (const card of this.held) {
        const r = this.paneRect(card);
        covered.push([r.left, r.left + r.w]);
      }
    }
    covered.sort((a, b) => a[0] - b[0]);
    let best: [number, number] = [0, 0];
    let at = 0;
    for (const [left, right] of [...covered, [this.viewport.width, this.viewport.width] as [number, number]]) {
      if (left - at > best[1] - best[0]) best = [at, left];
      at = Math.max(at, right);
    }
    if (best[1] - best[0] < CARD_BOX.width) return slot.theta;
    const x = (best[0] + best[1]) / 2;
    // The angle from straight ahead at which this depth is drawn at `x`.
    const phi = thetaAtScreenX(x, slot.depth, 0, this.viewport);
    return norm(slot.theta - phi);
  }

  // ---- the hands on a card ----

  private pressCard(noteId: string, element: HTMLElement, event: PointerEvent): void {
    if (event.button !== 0) return;
    this.scheduleIdle();
    const entry = this.entryOf(noteId);
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
      if (slot !== undefined && !this.seatedAt.has(card.noteId) && Math.abs(norm(slot.theta - this.model.yaw)) > 20 * DEG) {
        this.flyTo(slot.theta, card.noteId);
        return;
      }
    }
    await this.lift(card);
  }

  /**
   * Open a note as a document on the desk, or bring its document forward when
   * it is already there. `from` is where the opening is drawn from: the card
   * that was clicked, or the row. With none given it is the note's own card
   * if one is in sight, so a document never flies in from a place the person
   * was not looking at (DES-0003).
   */
  async lift(card: CardModel, from: Rect | null = null, takeKeyboard = false): Promise<void> {
    // The keyboard follows a note opened with the keyboard, as soon as its
    // document is drawn (drawPanes): never left on a row behind it.
    if (takeKeyboard) this.keyboardTo = card.noteId;
    const state = this.hooks.state();
    const onDesk = this.heldNow(state);
    // A person who lifts a note wants to see it (decision 3).
    this.hooks.lifted();
    for (const item of this.furnitureItems) item.lower();
    this.narrowFront = 'document';
    // Read before the reach is let go: the opening grows from the card.
    const source = from ?? this.sourceRect(card.noteId);
    // The note is about to be a document and to have no card, so a reach for
    // its card has nothing left to start from.
    this.endReach(card.noteId);
    this.openFocus(card.noteId, source);
    // The size it opens at is written on its card, so resizing another note
    // afterwards does not change this one (ISS-0071).
    const size = readingSizeFor({}, readingSizeOf(state, state.workspaceId, deskViewOf(state)));
    if (!this.hooks.canArrange()) {
      // A served page reads in a document of its own and sends nothing back:
      // the Mac's desk is exactly as it was (TASK-0057).
      if (!onDesk.some((c) => c.noteId === card.noteId)) {
        const at = this.nextPanePlace(onDesk, size);
        this.localHeld.push({ noteId: card.noteId, x: at.x, y: at.y, w: size.w, h: size.h });
      } else {
        await this.raise(card.noteId);
      }
      if (this.active) this.redeal(false);
    } else if (!onDesk.some((c) => c.noteId === card.noteId)) {
      const at = this.nextPanePlace(onDesk, size);
      await this.hooks.dispatch({ type: 'put-on-desk', noteId: card.noteId, x: at.x, y: at.y, w: size.w, h: size.h });
    } else {
      await this.hooks.dispatch({ type: 'raise-card', noteId: card.noteId });
      // Already on top: no broadcast comes, so draw now.
      if (this.active) this.redeal(false);
    }
    // Asked for at once, so the neighbourhood arrives while the lift is still happening.
    void this.hooks.context(card.noteId).catch(() => null);
    await this.hooks.open(card);
    // Its row is shown in the collection, so the list and the desk agree
    // about which note is open (TASK-0098).
    this.hooks.revealed(card.noteId);
  }

  /** Where a note's card is drawn now, when it is in sight: what its document opens from. */
  private sourceRect(noteId: string): Rect | null {
    const element = this.cardEls.get(noteId);
    const box = this.el.field.getBoundingClientRect();
    if (element !== undefined && !element.classList.contains('leaving') && element.style.pointerEvents === 'auto') {
      const r = element.getBoundingClientRect();
      return { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
    }
    if (this.arrangement === 'orbit') {
      const dot = this.dotFor(noteId);
      if (dot !== null) return { left: dot.x - 6, top: dot.y - 6, width: 12, height: 12 };
    }
    return null;
  }

  /**
   * Where a newly opened document goes: across the middle of the field, each
   * one a header lower and a step to the right of the last, so every header
   * stays readable and there is room either side for what it is joined to.
   */
  private nextPanePlace(onDesk: DeskCard[], size: { w: number; h: number }): { x: number; y: number } {
    const n = onDesk.length;
    const free = this.freeSpan();
    const fitted = fitToField(size, this.viewport);
    const x = Math.max(free.left, Math.round(free.left + (free.right - free.left - fitted.w) / 2)) + (n % 4) * 28;
    return { x: Math.max(0, x), y: 16 + (n % 8) * PANE_HEADER_HEIGHT };
  }

  /** The part of the field's width a new document is centred in: all of it, less what stands at its sides. */
  private freeSpan(): { left: number; right: number } {
    let left = 16;
    let right = this.viewport.width - 16;
    for (const rect of this.furniture()) {
      // Something standing against an edge takes that side; anything else is passed over.
      if (rect.left <= 24 && rect.left + rect.width < this.viewport.width / 2) left = Math.max(left, rect.left + rect.width + 16);
      else if (rect.left + rect.width >= this.viewport.width - 24 && rect.left > this.viewport.width / 2) right = Math.min(right, rect.left - 16);
    }
    return right - left < PANE_MIN_WIDTH ? { left: 16, right: this.viewport.width - 16 } : { left, right };
  }

  /** Put something else on the desk: the collection (FEAT-0020). */
  addFurniture(item: DeskFurniture): void {
    this.furnitureItems.push(item);
  }

  /** What else stands on the desk, as rectangles on it. */
  private furniture(): Rect[] {
    return this.furnitureItems.map((item) => item.rect()).filter((r): r is Rect => r !== null);
  }

  /**
   * A field too narrow for two readable objects side by side shows one in
   * front and offers the way to the others (DES-0003). Nothing is shrunk to
   * fit, and nothing stored changes: a window made narrow for a moment does
   * not rearrange the desk.
   */
  isNarrow(): boolean {
    return this.viewport.width < NARROW_FIELD_WIDTH;
  }

  /** The one object in front in a narrow field, or null when the field is wide enough for the desk. */
  private narrowMode(): 'collection' | 'document' | null {
    if (!this.isNarrow() || this.arrangement === 'orbit') return null;
    // Until something is pressed, an open note is in front: a window that
    // opens narrow shows what was being read, with the list one press away.
    return (this.narrowFront ?? 'document') === 'document' && this.held.length > 0 && !this.panesHidden ? 'document' : 'collection';
  }

  /**
   * Pick out one relationship round a document, or stop (null). The word is
   * one the source wrote: a frontmatter key that joins the document to at
   * least one neighbour. Nothing is removed and no link changes: the cards,
   * lines and rows that are not part of it are dimmed, and all stay.
   */
  setEmphasis(noteId: string, kind: string | null): void {
    this.emphasis = kind === null ? null : { noteId, kind };
    this.emphasisMemo = null;
    if (!this.active) return;
    this.drawPanes();
    this.render(false);
    if (kind !== null) {
      const ids = this.emphasisIds();
      this.tell(`"${kind}": ${ids?.size ?? 0} of the notes joined to ${noteId} are picked out; the rest are dimmed and still listed`);
    } else {
      this.tell(`Every note joined to ${noteId} is shown the same again`);
    }
  }

  /** The neighbours of the focused document that the emphasis picks out, or null when nothing is picked out. */
  private emphasisIds(): Set<string> | null {
    const e = this.emphasis;
    const focus = this.focusId();
    if (e === null || this.edges === null || focus !== e.noteId) return null;
    const context = this.hooks.peekContext(focus);
    const memo = this.emphasisMemo;
    if (memo !== null && memo.kind === e.kind && memo.noteId === e.noteId && memo.edges === this.edges && memo.context === context) return memo.ids;
    const ids = relationKinds(this.edges, focus, this.neighboursOf(focus).map((n) => n.id)).get(e.kind) ?? null;
    this.emphasisMemo = { kind: e.kind, noteId: e.noteId, edges: this.edges, context, ids };
    return ids;
  }

  // ---- arrangements: Read, Compare, Show related (FEAT-0022, TASK-0102) ----

  /** What an arrangement is planned from: the field, the collection and every document on this desk. */
  private arrangeInput(): ArrangeInput {
    const state = this.hooks.state();
    const preference = readingSizeOf(state, state.workspaceId, deskViewOf(state));
    return {
      field: { width: this.viewport.width, height: this.viewport.height },
      collection: this.furnitureItems[0]?.layout?.() ?? null,
      docs: this.held.map((c) => {
        const size = readingSizeFor(c, preference);
        return { noteId: c.noteId, x: c.x, y: c.y, w: size.w, h: size.h };
      }),
    };
  }

  /** The plan for a command on the documents it is about, or the sentence that says why there is none. */
  private planFor(kind: ArrangeKind, subjects: readonly string[], input: ArrangeInput): ArrangePlan | { refused: string } {
    const [first, second] = subjects;
    if (kind === 'compare') return planCompare(input, first ?? '', second ?? '');
    if (kind === 'read') return planRead(input, first ?? '');
    return planRelated(input, first ?? '', first === undefined ? 0 : this.neighboursOf(first).filter((n) => !n.held).length);
  }

  /** Which documents a command is about: the one on top, and for Compare the one under it. */
  private arrangeSubjects(kind: ArrangeKind): string[] {
    const ids = this.held.map((c) => c.noteId);
    if (kind === 'compare') return ids.slice(-2);
    return ids.slice(-1);
  }

  /**
   * Read, Compare or Show related was asked for: work it out and SHOW it.
   * Nothing moves until Apply. A command that cannot be worked out says why.
   */
  startArrange(kind: ArrangeKind, from: HTMLElement | null = null): void {
    if (!this.active || !this.hooks.canArrange()) return;
    this.undoAsk = null;
    const input = this.arrangeInput();
    const subjects = this.arrangeSubjects(kind);
    const plan = this.planFor(kind, subjects, input);
    if ('refused' in plan) {
      this.arranging = null;
      this.drawArrange();
      this.tell(plan.refused, true);
      return;
    }
    const focusNow = this.focusId();
    const nothing = plan.objects.length === 0 && plan.order.length === 0 && plan.focus === focusNow && (plan.list === null || plan.list === this.relatedOpen);
    if (nothing) {
      this.arranging = null;
      this.drawArrange();
      this.tell(`${plan.label}: everything is already where this would put it`);
      return;
    }
    this.arranging = { kind, subjects, plan, basis: planBasis(input, String(this.input.pending)), refreshed: false, from };
    this.drawArrange();
    this.el.arrangeApply.focus({ preventScroll: true });
  }

  /**
   * The desk, the window or the result changed while a preview was shown: the
   * preview is worked out again from what is there now, and says that it was.
   * A preview about a note that has been closed is withdrawn. A stale preview
   * is never the one that gets applied (DES-0003).
   */
  private refreshArrange(): void {
    const shown = this.arranging;
    if (shown === null) return;
    const input = this.arrangeInput();
    const basis = planBasis(input, String(this.input.pending));
    if (basis === shown.basis) return;
    const gone = shown.subjects.filter((id) => !this.held.some((c) => c.noteId === id));
    const plan = gone.length > 0 ? null : this.planFor(shown.kind, shown.subjects, input);
    if (plan === null || 'refused' in plan) {
      this.arranging = null;
      this.drawArrange();
      this.tell(`${shown.plan.label} was withdrawn: ${gone.length > 0 ? `${gone.join(' and ')} ${gone.length === 1 ? 'is' : 'are'} not open any more` : 'it can no longer be worked out'}. Nothing was moved.`, true);
      return;
    }
    this.arranging = { ...shown, plan, basis, refreshed: true };
    this.drawArrange();
  }

  /** Draw the preview: an outline where each object will stand, and what moves, in words. */
  private drawArrange(): void {
    const { arrangePreview, arrangeOutlines, arrangeTitle, arrangeText, arrangeNotes, arrangeApply, arrangeCancel } = this.el;
    const ask = this.undoAsk;
    const shown = this.arranging;
    arrangePreview.hidden = shown === null && ask === null;
    this.el.field.classList.toggle('previewing', shown !== null);
    if (shown === null && ask === null) {
      arrangeOutlines.replaceChildren();
      return;
    }
    const line = (text: string): HTMLElement => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    };
    if (ask !== null && this.undoRecord !== null) {
      // The undo's question: what a person changed since, and what would still go back.
      arrangeOutlines.replaceChildren();
      const back = ask.cards.map((c) => c.noteId);
      if (ask.collection !== null) back.push('the collection');
      arrangeTitle.textContent = `Undo: ${this.undoRecord.label}`;
      arrangeText.textContent =
        back.length === 0
          ? 'Nothing it moved is still where it put it, so there is nothing to put back.'
          : `Since it was applied, something it moved has changed. Undo would put back ${listOf(back)} and leave the rest as it is.`;
      arrangeNotes.replaceChildren(...ask.changed.map((c) => line(c)));
      arrangeApply.textContent = 'Undo the rest';
      arrangeApply.hidden = back.length === 0;
      arrangeCancel.textContent = 'Keep as it is';
      return;
    }
    if (shown === null) return;
    const { plan } = shown;
    const shift = this.deskShift();
    arrangeOutlines.replaceChildren(
      ...plan.objects.map((object) => {
        const box = document.createElement('div');
        box.className = 'arrange-outline';
        box.dataset['object'] = object.id;
        box.style.left = `${object.to.left + shift.x}px`;
        box.style.top = `${object.to.top + shift.y}px`;
        box.style.width = `${object.to.width}px`;
        box.style.height = `${object.to.height}px`;
        const label = document.createElement('span');
        label.textContent = object.kind === 'collection' ? 'the collection' : object.id;
        box.appendChild(label);
        return box;
      }),
    );
    const names = plan.objects.map((o) => (o.kind === 'collection' ? 'the collection' : o.id));
    arrangeTitle.textContent = plan.label;
    arrangeText.textContent =
      (shown.refreshed ? 'The desk changed while this was shown, so it was worked out again. ' : '') +
      (names.length === 0 ? 'Moves nothing.' : `Moves ${names.length} ${names.length === 1 ? 'object' : 'objects'}: ${listOf(names)}. Sizes and text are not changed.`);
    arrangeNotes.replaceChildren(...plan.notes.map((n) => line(n)));
    arrangeApply.textContent = 'Apply';
    arrangeApply.hidden = false;
    arrangeCancel.textContent = 'Cancel';
  }

  /** Apply the arrangement on screen: one change to the desk, kept so it can be put back. */
  private async applyArrange(): Promise<void> {
    const shown = this.arranging;
    if (shown === null || !this.hooks.canArrange()) return;
    // From the desk as it is this instant, never from the preview's copy.
    this.refreshArrange();
    const now = this.arranging;
    if (now === null) return;
    const { plan } = now;
    const input = this.arrangeInput();
    const state = this.hooks.state();
    const preference = readingSizeOf(state, state.workspaceId, deskViewOf(state));
    const record: ArrangeUndo = {
      label: plan.label,
      cards: plan.cards.map((to) => {
        const card = this.held.find((c) => c.noteId === to.noteId) as DeskCard;
        const size = readingSizeFor(card, preference);
        return { noteId: to.noteId, before: { x: card.x, y: card.y }, after: { x: to.x, y: to.y }, size: { w: size.w, h: size.h } };
      }),
      orderBefore: this.held.map((c) => c.noteId),
      collection: plan.collection !== null && input.collection !== null ? { before: input.collection, after: plan.collection } : null,
      focusBefore: this.focusId(),
      listBefore: this.relatedOpen,
      emphasisBefore: this.emphasis,
    };
    this.arranging = null;
    this.drawArrange();
    this.moveTogether();
    // Reading and comparing are not gathering: the cards go back to the field.
    if (plan.focus === null) this.dropFocus();
    else this.openFocus(plan.focus, null);
    if (plan.list !== null) {
      this.relatedOpen = plan.list;
      void this.readEdges().then(() => this.active && this.drawPanes());
    }
    this.narrowFront = 'document';
    await this.hooks.dispatch({ type: 'arrange', cards: plan.cards, order: plan.order, ...(plan.collection === null ? {} : { collection: plan.collection }) });
    this.undoRecord = record;
    this.undoView = deskViewOf(this.hooks.state());
    if (this.active) this.redeal(false);
    this.tell(`${plan.label}: applied. Undo arrangement puts it back.`);
    const top = plan.subjects[plan.subjects.length - 1];
    if (top !== undefined) this.paneEls.get(top)?.querySelector<HTMLElement>('.pane-head')?.focus({ preventScroll: true });
  }

  /** Withdraw the preview, or the undo's question. Nothing has moved, and nothing does. */
  cancelArrange(): void {
    const shown = this.arranging;
    const asked = this.undoAsk !== null;
    if (shown === null && !asked) return;
    this.arranging = null;
    this.undoAsk = null;
    this.drawArrange();
    this.tell(asked ? 'The arrangement was kept as it is' : `${shown?.plan.label ?? 'The arrangement'}: cancelled, nothing was moved`);
    (asked ? this.el.arrangeUndo : (shown?.from ?? null))?.focus({ preventScroll: true });
  }

  /**
   * Put back what the last arrangement moved: places, stacking, the
   * collection's form, the focus, the open list and the emphasis. No note's
   * text and no project action is touched: this undoes a layout.
   *
   * What a person has moved, resized or closed since is not the object the
   * record describes. Those are named first, and put back only on a second,
   * explicit press, which puts back the rest and leaves them alone.
   */
  async undoArrange(confirmed: boolean): Promise<void> {
    const record = this.undoRecord;
    if (record === null || !this.hooks.canArrange() || this.undoView !== deskViewOf(this.hooks.state())) return;
    this.arranging = null;
    const check: UndoCheck = checkUndo(record, this.arrangeInput());
    if (check.changed.length > 0 && !confirmed) {
      this.undoAsk = check;
      this.drawArrange();
      (check.cards.length > 0 || check.collection !== null ? this.el.arrangeApply : this.el.arrangeCancel).focus({ preventScroll: true });
      return;
    }
    this.undoAsk = null;
    this.undoRecord = null;
    this.drawArrange();
    this.moveTogether();
    const open = new Set(this.held.map((c) => c.noteId));
    this.relatedOpen = record.listBefore !== null && open.has(record.listBefore) ? record.listBefore : null;
    this.emphasis = record.emphasisBefore !== null && open.has(record.emphasisBefore.noteId) ? record.emphasisBefore : null;
    // The focus goes back only when its document will be on top again.
    const topAfter = check.order.length > 0 ? check.order[check.order.length - 1] : this.held[this.held.length - 1]?.noteId;
    if (record.focusBefore !== null && record.focusBefore === topAfter) this.openFocus(record.focusBefore, null);
    else this.dropFocus();
    await this.hooks.dispatch({ type: 'arrange', cards: check.cards, order: check.order, ...(check.collection === null ? {} : { collection: check.collection }) });
    if (this.active) this.redeal(false);
    this.tell(check.changed.length === 0 ? `Undone: ${record.label}` : `Undone in part: ${record.label}. Left as they are: ${check.changed.join('; ')}.`);
    this.el.arrangeRead.focus({ preventScroll: true });
  }

  /** Let documents and the collection travel to their new places together; a cut under reduced motion. */
  private moveTogether(): void {
    if (this.hooks.reducedMotion()) return;
    const field = this.el.field;
    field.classList.add('arranging');
    if (this.arrangeTimer !== null) clearTimeout(this.arrangeTimer);
    this.arrangeTimer = setTimeout(() => {
      this.arrangeTimer = null;
      field.classList.remove('arranging');
    }, ARRANGE_MS + 60);
  }

  /** The three commands and the undo: offered where the desk can be arranged, and each says why it cannot run. */
  private drawArrangeControls(): void {
    const { arrange, arrangeRead, arrangeCompare, arrangeRelated, arrangeUndo } = this.el;
    arrange.hidden = !this.hooks.canArrange() || this.panesHidden;
    if (arrange.hidden) return;
    const ids = this.held.map((c) => c.noteId);
    const top = ids[ids.length - 1];
    const under = ids[ids.length - 2];
    const set = (button: HTMLButtonElement, can: boolean, title: string): void => {
      // Not `disabled`: a disabled button cannot be reached to learn why. It says why when pressed.
      button.setAttribute('aria-disabled', String(!can));
      button.title = title;
    };
    set(arrangeRead, top !== undefined, top === undefined ? 'Read needs an open note' : `Read ${top} with the collection beside it. Shown first; nothing moves until Apply.`);
    set(arrangeCompare, under !== undefined, under === undefined ? 'Compare needs two open notes' : `Stand ${under} and ${top} side by side, each at its own size. Shown first; nothing moves until Apply.`);
    set(arrangeRelated, top !== undefined, top === undefined ? 'Show related needs an open note' : `Gather what ${top} is joined to round it and open its complete list. Shown first; nothing moves until Apply.`);
    const record = this.undoRecord !== null && this.undoView === deskViewOf(this.hooks.state()) ? this.undoRecord : null;
    arrangeUndo.hidden = record === null;
    if (record !== null) {
      arrangeUndo.title = `Put back what "${record.label}" moved. It changes the layout only: no note's text and no project action.`;
      arrangeUndo.setAttribute('aria-label', `Undo arrangement: ${record.label}`);
    }
  }

  /** What the arrangement controls are showing, for a check. */
  arrangeState(): { preview: { kind: ArrangeKind; label: string; objects: string[]; refreshed: boolean } | null; undo: string | null; asking: string[] | null; emphasis: { noteId: string; kind: string } | null } {
    return {
      preview: this.arranging === null ? null : { kind: this.arranging.kind, label: this.arranging.plan.label, objects: this.arranging.plan.objects.map((o) => o.id), refreshed: this.arranging.refreshed },
      undo: this.undoRecord?.label ?? null,
      asking: this.undoAsk?.changed ?? null,
      emphasis: this.emphasis,
    };
  }

  /** Something that stands on the desk came above the documents or went under them. */
  furnitureChanged(): void {
    if (this.active) this.drawDeskFurniture();
  }

  /** What stands on the desk shows different cards now: the field is drawn again, and nothing is dealt. */
  furnitureSeatsChanged(): void {
    if (this.active) this.render(false);
  }

  /** Bring the collection in front, in a narrow field; elsewhere bring the desk round and show it. */
  showCollection(): void {
    this.narrowFront = 'collection';
    const item = this.furnitureItems[0];
    const rect = item?.rect() ?? null;
    if (this.isNarrow() || rect === null) {
      this.render(false);
      item?.focus();
      return;
    }
    const shown = { ...rect, left: rect.left + this.deskPan.x, top: rect.top + this.deskPan.y };
    const by = revealShift(shown, this.viewport, 0);
    this.moveDesk(this.model.yaw, { x: this.deskPan.x + by.x, y: this.deskPan.y + by.y }, () => item?.focus());
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
    const entry = this.entryOf(noteId);
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

  /** The entry a drawn card stands for: one the deal holds, or one seated beside the focus from outside it. */
  private entryOf(noteId: string): FieldEntry | undefined {
    return this.entries.get(noteId) ?? this.seatEntries.get(noteId);
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
      this.rereads.delete(noteId);
      if (this.emphasis?.noteId === noteId) this.emphasis = null;
    }
    this.el.panes.dataset['count'] = String(this.held.length);
    this.placePanes();
    // A preview is about the desk as it was when it was shown.
    this.refreshArrange();
    if (this.keyboardTo !== null) {
      const head = this.paneEls.get(this.keyboardTo)?.querySelector<HTMLElement>('.pane-head');
      if (head !== null && head !== undefined) {
        this.keyboardTo = null;
        head.focus({ preventScroll: true });
      }
    }
    // A document that has just been opened grows from the card or the row it
    // came from. It is drawn in place first, so its text is there to read and
    // to scroll from the first frame, and the movement is laid over that.
    const opening = this.opening;
    if (opening !== null) {
      const pane = this.paneEls.get(opening.noteId);
      const card = this.held.find((c) => c.noteId === opening.noteId);
      if (pane !== undefined && card !== undefined) {
        this.opening = null;
        this.playOpening(pane, opening.from, this.drawnRect(card));
      }
    }
    this.drawLinks();
    this.drawDeskFurniture();
  }

  /**
   * Put every document where it is drawn now. Run on every frame of a turn,
   * so it changes positions and nothing else: what a document holds is
   * painted by `paintPane`, when the desk itself changes.
   */
  private placePanes(): void {
    const shift = this.deskShift();
    this.held.forEach((deskCard, index) => {
      const pane = this.paneEls.get(deskCard.noteId);
      if (pane === undefined) return;
      const r = this.drawnRect(deskCard);
      pane.style.left = `${r.left}px`;
      pane.style.top = `${r.top}px`;
      // A corner being dragged is the size on screen until the store answers.
      if (!pane.classList.contains('resizing')) {
        pane.style.width = `${r.width}px`;
        pane.style.height = `${r.height}px`;
      }
      // Stacking is the desk's order: a raised pane is the last one, and it
      // covers everything under it, header included. Headers stay readable
      // because a pane dropped on one snaps below it (snapBelowHeaders), not by
      // drawing every header above every body: that showed a lower pane's
      // header through the text of the pane on top of it (ISS-0066).
      pane.style.zIndex = String(3000 + index);
      const narrow = this.narrowMode();
      // In a narrow field only the object in front is drawn: the top document,
      // or none of them while the collection is in front.
      const hidden = narrow === null ? !shift.visible : narrow === 'collection' || index !== this.held.length - 1;
      // Toward the edge of sight a document dims; it does not go see-through.
      // Two faded objects lying over each other showed each other's text, so
      // the fade is a veil of the ground's colour over an opaque surface.
      const sight = narrow === null ? shift.opacity : 1;
      pane.dataset['sight'] = String(sight);
      pane.style.setProperty('--veil', String(1 - sight));
      // Past the edge of sight a document is not drawn and takes no pointer,
      // the same boundary a card obeys.
      pane.classList.toggle('out-of-sight', hidden);
      pane.classList.toggle('narrow', narrow !== null);
    });
  }

  /**
   * The opening: the document grows from the card or the row a person
   * touched to where it stands, over `OPEN_MS`. It is the browser's own
   * animation of a transform, laid over a document that is already in place,
   * so nothing waits for it: the text scrolls and a link is followed while it
   * runs, and opening another note stops it where it is. Under reduced motion
   * nothing moves and the document is marked for a moment instead.
   */
  private playOpening(pane: HTMLElement, from: Rect | null, to: Rect): void {
    this.openAnim?.cancel();
    this.openAnim = null;
    const mark = (): void => {
      pane.classList.add('highlight');
      setTimeout(() => pane.classList.remove('highlight'), 1600);
    };
    if (this.hooks.reducedMotion()) {
      mark();
      // The cards round it are marked too. A note opened before what it is
      // joined to has been read has no card seated yet, so the mark is owed
      // and `seatNeighbourhood` pays it when the cards take their seats.
      if (this.seatedAt.size > 0) this.highlightAll(this.seatedAt.keys());
      else this.seatsOweMark = pane.dataset['noteId'] ?? null;
      return;
    }
    // Nothing in sight to grow from: a document already on the desk, brought forward.
    if (from === null || typeof pane.animate !== 'function' || to.width <= 0 || to.height <= 0) {
      mark();
      return;
    }
    const animation = pane.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${(from.left - to.left).toFixed(1)}px, ${(from.top - to.top).toFixed(1)}px) scale(${(from.width / to.width).toFixed(4)}, ${(from.height / to.height).toFixed(4)})`,
        },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: OPEN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    this.openAnim = animation;
    // While it grows it takes no pointer (deck.css): it grows from the row or
    // the card that was pressed, so it is under the pointer, and a second
    // press aimed at the next row would land on the document instead.
    pane.classList.add('opening');
    const done = (): void => {
      pane.classList.remove('opening');
      if (this.openAnim === animation) this.openAnim = null;
    };
    animation.onfinish = done;
    animation.oncancel = done;
  }

  /** Whether a document is still being drawn open, for the smoke run. */
  isOpening(): boolean {
    return this.openAnim !== null;
  }

  /**
   * A document: one note's full text on the desk (FEAT-0020, TASK-0097).
   *
   * Its heading is the note's TITLE, then its id and its state; the path it
   * is stored at is under Details and never in the heading (DES-0003). Under
   * the heading, where the note supplies them, its goal and how far along it
   * is. Then the whole authored text, as the sidecar renders it, with its
   * links, its checkboxes and the verbs the sidecar allows. There is no
   * summary to click through: opening a note is reading it.
   */
  private makePane(noteId: string): HTMLElement {
    const pane = document.createElement('section');
    pane.className = 'pane';
    pane.dataset['noteId'] = noteId;
    pane.innerHTML =
      '<header class="pane-head" tabindex="0" role="toolbar">' +
      '<span class="pane-title"></span><span class="pane-id"></span><span class="pane-status"></span>' +
      '<span class="pane-tools">' +
      '<button type="button" class="pane-related" title="The notes this one is joined to (R)" aria-expanded="false"></button>' +
      '<button type="button" class="pane-info" title="Where this note is stored, and its other details (D)" aria-expanded="false">details</button>' +
      '<button type="button" class="pane-every" title="Keep this note on every view (V)" aria-label="Keep this note on every view" aria-pressed="false">⧉</button>' +
      '<button type="button" class="pane-orbit" title="Show this in the link graph (O)" aria-label="Show this in the link graph">◎</button>' +
      '<button type="button" class="pane-send" title="Send to another window (S)" aria-label="Send to another window">↗</button>' +
      '<button type="button" class="pane-widen" title="Fill the field with this note, or put it back at its size (W)" aria-label="Fill the field with this note" aria-pressed="false">⤢</button>' +
      '<button type="button" class="pane-close" title="Close, and go back to its row (⌥ closes every other)" aria-label="Close this note">×</button>' +
      '</span></header>' +
      '<div class="pane-subject" hidden></div>' +
      '<div class="pane-details" hidden></div>' +
      '<div class="pane-links" hidden><div class="link-kinds" hidden></div><ul class="link-list"></ul></div>' +
      '<div class="pane-body">' +
      '<div class="pane-state" role="status" hidden></div>' +
      '<div class="pane-actions" hidden></div>' +
      '<article class="pane-note"></article>' +
      '</div>' +
      '<span class="pane-resize" aria-hidden="true"></span>';
    const head = pane.querySelector('.pane-head') as HTMLElement;
    head.addEventListener('pointerdown', (event) => this.grabPane(noteId, pane, event));
    head.addEventListener('keydown', (event) => this.paneKey(noteId, event));
    const on = (selector: string, run: (event: MouseEvent) => void): void => {
      (pane.querySelector(selector) as HTMLElement).addEventListener('click', (event) => {
        event.stopPropagation();
        run(event);
      });
    };
    on('.pane-close', (event) => {
      if (event.altKey) void this.putBackOthers(noteId);
      else void this.putBack(noteId);
    });
    on('.pane-widen', () => void this.widen(noteId));
    on('.pane-every', () => void this.toggleEveryView(noteId));
    on('.pane-orbit', () => this.showInField(noteId));
    on('.pane-send', () => void this.sendFromPane(noteId));
    on('.pane-related', () => this.toggleRelated(noteId));
    on('.pane-info', () => this.toggleDetails(noteId));
    const links = pane.querySelector('.pane-links') as HTMLElement;
    links.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const chip = target.closest<HTMLElement>('.kind-chip');
      if (chip !== null) {
        event.stopPropagation();
        const kind = chip.dataset['kind'] ?? '';
        this.setEmphasis(noteId, kind === '' || (this.emphasis?.noteId === noteId && this.emphasis.kind === kind) ? null : kind);
        // The chips were redrawn: the keyboard goes back to the one that was pressed.
        (Array.from(links.querySelectorAll<HTMLElement>('.kind-chip')).find((c) => c.dataset['kind'] === kind) ?? links.querySelector<HTMLElement>('.kind-chip'))?.focus({ preventScroll: true });
        return;
      }
      const row = target.closest<HTMLElement>('.link-row');
      const id = row?.dataset['noteId'];
      if (id === undefined) return;
      event.stopPropagation();
      if (target.closest('.link-open') !== null) void this.openNeighbour(noteId, id);
      else void this.showNeighbour(noteId, id);
    });
    // Escape closes the list or the details and nothing else: it is a local
    // control, and the same key must not also leave the focus or sweep the
    // desk (DES-0003). Anywhere in the document, not only inside the panel:
    // R leaves the keyboard on the header's button when the list is empty,
    // and Escape there closed nothing and left the focus instead. With both
    // open, the one the keyboard is in closes first, then the list.
    const details = pane.querySelector('.pane-details') as HTMLElement;
    pane.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const listOpen = this.relatedOpen === noteId;
      const detailsOpen = this.detailsOpen === noteId;
      if (!listOpen && !detailsOpen) return;
      event.preventDefault();
      event.stopPropagation();
      if (detailsOpen && (!listOpen || details.contains(event.target as Node))) {
        this.toggleDetails(noteId, false);
        (pane.querySelector('.pane-info') as HTMLElement).focus();
      } else {
        this.toggleRelated(noteId, false);
        (pane.querySelector('.pane-related') as HTMLElement).focus();
      }
    });
    // A link in the note's text opens the note it names, as a document, from
    // where the link stands. A link out of the workspace is left to the
    // window, which opens it in the person's own browser.
    (pane.querySelector('.pane-note') as HTMLElement).addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest('a');
      if (link === null) return;
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith(NOTE_LINK_PREFIX)) return;
      event.preventDefault();
      void this.followLink(link, href);
    });
    (pane.querySelector('.pane-state') as HTMLElement).addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('button');
      if (button === null) return;
      event.stopPropagation();
      if (button.dataset['act'] === 'retry') {
        delete pane.dataset['asked'];
        this.drawPanes();
      } else if (button.dataset['act'] === 'close') {
        void this.putBack(noteId);
      }
    });
    (pane.querySelector('.pane-resize') as HTMLElement).addEventListener('pointerdown', (event) =>
      this.resizePane(noteId, pane, event),
    );
    // A press anywhere on a pane brings it forward, as a press on a window
    // does: a pane whose header lies under another is still reachable by its
    // body (ISS-0066). The header's own press raises it in grabPane.
    pane.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      for (const item of this.furnitureItems) item.lower();
      if ((event.target as HTMLElement).closest('.pane-head') !== null && this.hooks.canArrange()) return;
      if (this.held[this.held.length - 1]?.noteId === noteId) return;
      void this.raise(noteId).then(() => {
        if (!this.hooks.canArrange() && this.active) this.redeal(false);
      });
    });
    return pane;
  }

  private paintPane(pane: HTMLElement, deskCard: DeskCard, index: number): void {
    const noteId = deskCard.noteId;
    const card = this.cardFor(noteId);
    const doc = this.docs.get(noteId);
    const focus = this.focusId();
    pane.classList.toggle('focus', focus === noteId);
    pane.classList.toggle('wide', deskCard.wide === true);
    pane.classList.toggle('top', index === this.held.length - 1);
    pane.dataset['status'] = card === null ? 'planned' : bandFor(card.status);
    // The title a person knows the note by comes first; the id is beside it.
    const title = card?.title ?? doc?.title ?? noteId;
    setText(pane, '.pane-title', title);
    setText(pane, '.pane-id', noteId);
    const every = this.hooks.isEveryView(noteId);
    (pane.querySelector('.pane-every') as HTMLElement).setAttribute('aria-pressed', String(every));
    pane.classList.toggle('every-view', every);
    const widen = pane.querySelector('.pane-widen') as HTMLElement;
    widen.setAttribute('aria-pressed', String(deskCard.wide === true));
    widen.setAttribute('aria-label', deskCard.wide === true ? 'Put this note back at its own size' : 'Fill the field with this note');
    // A note on every view that this view does not hold says so, beside its status.
    const inView = this.entries.has(noteId) || this.input.groups.some((g) => g.cards.some((c) => c.noteId === noteId || findChild(c, noteId) !== null));
    pane.classList.toggle('elsewhere', card !== null && !inView);
    setText(pane, '.pane-status', card === null ? 'not in this view' : `${card.status || 'no status'}${inView ? '' : ' · not in this view'}`);
    pane.setAttribute('aria-label', `${title}, ${noteId}${card === null ? '' : `, ${card.status || 'no status'}`}`);
    const head = pane.querySelector('.pane-head') as HTMLElement;
    head.setAttribute(
      'aria-label',
      `${title}, ${noteId}${card === null ? '' : `, ${card.status || 'no status'}`}${doc === undefined ? '' : `, stored at ${doc.relPath}`}: arrow keys move it, Alt and arrows resize it, Enter gathers what it is joined to, R lists them, D shows its details, L goes to its row in the list, W fills the field, S sends it, Delete closes it and returns to its row`,
    );
    this.paintSubject(pane, card, doc);
    this.paintDetails(pane, noteId, card, doc);
    this.paintRelated(pane, noteId);
    this.fillDocument(pane, noteId, card);
  }

  /**
   * The compact subject line under a document's heading: what the note is
   * for and how far along it is, where the note itself says. Each part is
   * labelled, and a part the note does not supply is left out rather than
   * guessed (FEAT-0020, "when the existing data supports them").
   */
  private paintSubject(pane: HTMLElement, card: CardModel | null, doc: NoteDocument | undefined): void {
    const subject = pane.querySelector('.pane-subject') as HTMLElement;
    const facts: Array<[string, string]> = [];
    if (card !== null) {
      if (card.progress !== null) facts.push(['progress', `${card.progress.done} of ${card.progress.total} done${card.progress.stale > 0 ? `, ${card.progress.stale} stale` : ''}`]);
      if (card.owed) facts.push(['needs you', card.owedVerb ?? 'a decision']);
      if (card.severity !== null) facts.push(['severity', card.severity]);
      if (card.lastVerified !== null) facts.push(['last verified', `${card.lastVerified}${card.stale ? ' (stale)' : ''}`]);
    }
    const goal = doc === undefined ? null : plainValue(doc.frontmatter['goal']);
    const said = goal ?? (card?.subtitle !== null && card?.subtitle !== undefined && card.subtitle !== '' ? card.subtitle : null);
    const signature = `${facts.map((f) => f.join('=')).join('|')}|${said ?? ''}`;
    subject.hidden = facts.length === 0 && said === null;
    if (subject.dataset['signature'] === signature) return;
    subject.dataset['signature'] = signature;
    const nodes: HTMLElement[] = [];
    if (said !== null) {
      const line = document.createElement('p');
      line.className = 'subject-goal';
      line.textContent = said;
      nodes.push(line);
    }
    if (facts.length > 0) {
      const line = document.createElement('p');
      line.className = 'subject-facts';
      for (const [label, value] of facts) {
        const fact = document.createElement('span');
        fact.className = 'subject-fact';
        fact.dataset['fact'] = label;
        fact.append(`${label} `);
        const b = document.createElement('b');
        b.textContent = value;
        fact.appendChild(b);
        line.appendChild(fact);
      }
      nodes.push(line);
    }
    subject.replaceChildren(...nodes);
  }

  /** Details: where the note is stored and what its frontmatter says about it. Out of the heading, one press away. */
  private paintDetails(pane: HTMLElement, noteId: string, card: CardModel | null, doc: NoteDocument | undefined): void {
    const button = pane.querySelector('.pane-info') as HTMLElement;
    const panel = pane.querySelector('.pane-details') as HTMLElement;
    const open = this.detailsOpen === noteId;
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (!open) return;
    const rows: Array<[string, string]> = [];
    const path = doc?.relPath ?? card?.rel ?? null;
    rows.push(['stored at', path ?? 'this card has no note behind it']);
    if (card !== null && card.noteType !== '') rows.push(['type', card.noteType]);
    for (const key of ['phase', 'parent', 'owner', 'created', 'updated', 'priority', 'effort', 'release']) {
      const value = doc === undefined ? null : plainValue(doc.frontmatter[key]);
      if (value !== null) rows.push([key, value]);
    }
    const signature = rows.map((r) => r.join('=')).join('\n');
    if (panel.dataset['signature'] === signature) return;
    panel.dataset['signature'] = signature;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `Details of ${noteId}`);
    const list = document.createElement('dl');
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }
    panel.replaceChildren(list);
    panel.tabIndex = -1;
  }

  /** Open or close a document's details. */
  private toggleDetails(noteId: string, open: boolean = this.detailsOpen !== noteId): void {
    this.detailsOpen = open ? noteId : this.detailsOpen === noteId ? null : this.detailsOpen;
    this.drawPanes();
  }

  /**
   * Put the note's text in its document.
   *
   * The document's frame is there at once, named, with a line that says the
   * text is being read; the text replaces that line the moment the sidecar
   * answers, whatever the opening is doing. A read that fails says so and
   * offers Retry and Close. Nothing else is ever shown in the text's place:
   * not a summary, and not another note's text (DES-0003).
   */
  private fillDocument(pane: HTMLElement, noteId: string, card: CardModel | null): void {
    const note = pane.querySelector('.pane-note') as HTMLElement;
    const state = pane.querySelector('.pane-state') as HTMLElement;
    const body = pane.querySelector('.pane-body') as HTMLElement;
    const say = (kind: 'loading' | 'error' | 'missing' | 'stale' | 'ready', text: string, buttons: Array<[string, string]> = []): void => {
      pane.dataset['state'] = kind;
      body.setAttribute('aria-busy', String(kind === 'loading'));
      state.hidden = kind === 'ready';
      const signature = `${kind}|${text}`;
      if (state.dataset['signature'] === signature) return;
      state.dataset['signature'] = signature;
      const line = document.createElement('p');
      line.textContent = text;
      const nodes: HTMLElement[] = [line];
      for (const [act, label] of buttons) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'action';
        button.dataset['act'] = act;
        button.textContent = label;
        nodes.push(button);
      }
      state.replaceChildren(...nodes);
    };
    const doc = this.docs.get(noteId);
    if (doc !== undefined) {
      if (note.dataset['filled'] !== 'true') {
        // A note read again after a change on disk keeps the place it was
        // being read at: the text is replaced, the scroll is not.
        const at = body.scrollTop;
        note.innerHTML = doc.html;
        note.dataset['filled'] = 'true';
        body.scrollTop = at;
        const actions = pane.querySelector('.pane-actions') as HTMLElement;
        void this.hooks.dress(noteId, note, actions).catch(() => null);
      }
      if (!this.rereads.has(noteId)) {
        say('ready', '');
        return;
      }
      // The notes changed on disk since this was read: it is read again, and
      // until the answer comes it stays as it is.
    }
    if (card === null) {
      if (doc !== undefined) {
        // It was read, and now neither this view nor Deck's index has the
        // note: what was read stays, labelled, with nothing to write with.
        say('stale', `This is ${noteId} as it was last read. This view does not hold it any more, and Deck cannot find it to read again: it was deleted, renamed or moved.`, [['close', 'close']]);
        return;
      }
      // The desk names a note this view does not hold and Deck's index has no
      // card for: it is said, and nothing stands in for it.
      note.replaceChildren();
      delete note.dataset['filled'];
      say('missing', `${noteId} is on the desk and cannot be read here: this view does not hold it, or it has been deleted or renamed. It can be closed, or the view that holds it can be opened.`, [['close', 'close']]);
      return;
    }
    if (pane.dataset['asked'] === 'true') return;
    pane.dataset['asked'] = 'true';
    if (note.dataset['filled'] !== 'true') say('loading', `Reading ${noteId}…`);
    void this.hooks
      .document(card)
      .then((read) => {
        this.docs.set(noteId, read);
        this.rereads.delete(noteId);
        delete note.dataset['filled'];
        if (this.active && this.paneEls.get(noteId) === pane) this.drawPanes();
      })
      .catch((err: unknown) => {
        if (this.paneEls.get(noteId) !== pane) return;
        const reason = err instanceof Error ? err.message : String(err);
        if (note.dataset['filled'] === 'true') {
          // It was read before and cannot be read again: a note changed on
          // disk, and this one was deleted, renamed, or the sidecar is not
          // answering. The text a person is in the middle of is not taken
          // away; it is labelled as what it now is, and nothing in it can
          // be ticked or acted on (deck.css).
          say('stale', `This is ${noteId} as it was last read. It could not be read again: ${reason}`, [['retry', 'retry'], ['close', 'close']]);
          return;
        }
        note.replaceChildren();
        delete note.dataset['filled'];
        say('error', `${noteId} could not be read: ${reason}`, [['retry', 'retry'], ['close', 'close']]);
      });
  }

  /** A link inside a document was followed: open the note it names, growing from the link. */
  private async followLink(link: HTMLElement, href: string): Promise<void> {
    const rel = decodeSafely(href.slice(NOTE_LINK_PREFIX.length).split('#')[0] ?? '');
    const box = this.el.field.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    const from: Rect = { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
    const card = rel === null ? null : await this.hooks.cardByRel(rel).catch(() => null);
    if (card === null) {
      this.tell(`that link names ${rel ?? 'a path'} which Deck has no note for`, true);
      return;
    }
    // In both hosts: a served page reads the linked note in a document of its
    // own, as it does one opened from a row (lift).
    await this.lift(card, from);
  }

  /**
   * The complete list of what a document is joined to, in the document
   * itself: the count on its header, and the rows when the list is open.
   *
   * Every neighbour has a row, whether its card is in sight, past the edge of
   * the field, or a document of its own. This is what replaces "+N more": the
   * arrangement may be larger than the window, and the list is how each part
   * of it is named and reached, by pointer or by keyboard (TASK-0104).
   *
   * Each row says how the two notes are joined in the source's own word: the
   * frontmatter key the link was written under, or "link" when it was written
   * in the text and the source gives it no name (TASK-0098).
   */
  private paintRelated(pane: HTMLElement, noteId: string): void {
    const button = pane.querySelector('.pane-related') as HTMLElement;
    const panel = pane.querySelector('.pane-links') as HTMLElement;
    const known = this.hooks.peekContext(noteId) !== undefined;
    const neighbours = this.neighboursOf(noteId);
    const open = this.relatedOpen === noteId;
    button.textContent = known ? `${neighbours.length} related` : '… related';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', known ? `${neighbours.length} notes joined to ${noteId}: ${open ? 'hide' : 'show'} the list` : `The notes joined to ${noteId} are still being read`);
    panel.hidden = !open;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `Notes joined to ${noteId}`);
    if (!open) return;
    const list = panel.querySelector('.link-list') as HTMLElement;
    const rows = this.relatedRows(noteId, neighbours);
    // The relationships this document has, in the source's own words, as a
    // way to pick one out (FEAT-0022). Picking one dims the rest; every row
    // stays in the list, and the line under the chips says how many of how
    // many are picked out.
    const kinds = this.edges === null ? new Map<string, Set<string>>() : relationKinds(this.edges, noteId, neighbours.map((n) => n.id));
    const picked = this.emphasis?.noteId === noteId && kinds.has(this.emphasis.kind) ? this.emphasis.kind : null;
    const subset = picked === null ? null : (kinds.get(picked) as Set<string>);
    const kindsEl = panel.querySelector('.link-kinds') as HTMLElement;
    const kindsSignature = `${[...kinds].map(([k, ids]) => `${k}:${ids.size}`).join(',')}|${picked}|${rows.length}`;
    kindsEl.hidden = kinds.size === 0;
    if (kindsEl.dataset['signature'] !== kindsSignature) {
      kindsEl.dataset['signature'] = kindsSignature;
      const label = document.createElement('span');
      label.className = 'kinds-label';
      label.textContent = 'pick out';
      const chips = [...kinds].map(([kind, ids]) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'kind-chip';
        chip.dataset['kind'] = kind;
        chip.textContent = `${kind} ${ids.size}`;
        chip.setAttribute('aria-pressed', String(picked === kind));
        chip.setAttribute('aria-label', `${picked === kind ? 'Stop picking out' : 'Pick out'} the ${ids.size} ${ids.size === 1 ? 'note' : 'notes'} joined to ${noteId} by "${kind}"`);
        return chip;
      });
      const said = document.createElement('span');
      said.className = 'kinds-said';
      said.setAttribute('role', 'status');
      const nodes: HTMLElement[] = [label, ...chips, said];
      if (subset !== null) {
        said.textContent = `"${picked}": ${subset.size} of ${rows.length} picked out. All ${rows.length} are still listed.`;
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'kind-chip kind-clear';
        clear.dataset['kind'] = '';
        clear.textContent = 'clear';
        clear.setAttribute('aria-label', 'Stop picking out: show every related note the same');
        nodes.push(clear);
      }
      kindsEl.replaceChildren(...nodes);
    }
    const signature = rows.map((r) => `${r.id}|${r.direction}|${r.where}|${r.title}|${r.kind}|${subset !== null && !subset.has(r.id)}`).join('\n');
    if (list.dataset['signature'] === signature) return;
    list.dataset['signature'] = signature;
    const kept = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.link-row')?.dataset['noteId'] ?? null;
    const keptOpen = (document.activeElement as HTMLElement | null)?.classList.contains('link-open') === true;
    const inPanel = panel.contains(document.activeElement);
    list.replaceChildren(
      ...rows.map((row) => {
        const item = document.createElement('li');
        item.className = 'link-row';
        item.dataset['noteId'] = row.id;
        item.dataset['direction'] = row.direction;
        item.dataset['kind'] = row.kind;
        item.classList.toggle('quiet', subset !== null && !subset.has(row.id));
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'link-go';
        go.setAttribute('aria-label', `${row.id} ${row.title}: ${row.sentence}${row.where === '' ? '' : `; ${row.where}`}. Show where it is.`);
        go.title = row.sentence;
        for (const [cls, value] of [
          ['link-dir', row.direction === 'out' ? '→' : row.direction === 'in' ? '←' : '⇄'],
          ['link-kind', row.kind],
          ['link-id', row.id],
          ['link-title', row.title],
          ['link-where', row.where],
        ] as const) {
          const span = document.createElement('span');
          span.className = cls;
          span.textContent = value;
          go.appendChild(span);
        }
        const openIt = document.createElement('button');
        openIt.type = 'button';
        openIt.className = 'link-open';
        openIt.textContent = 'open';
        openIt.setAttribute('aria-label', `Open ${row.id} as a document`);
        item.append(go, openIt);
        return item;
      }),
    );
    if (rows.length === 0) {
      const none = document.createElement('li');
      none.className = 'link-none';
      none.textContent = known ? 'This note links to no other note, and no note links to it.' : 'Reading what this note is joined to…';
      list.appendChild(none);
    }
    // A repaint must not take the keyboard off the row it was on.
    if (inPanel && kept !== null) {
      const again = Array.from(list.querySelectorAll<HTMLElement>('.link-row')).find((r) => r.dataset['noteId'] === kept);
      const control = again === undefined ? null : again.querySelector<HTMLElement>(keptOpen ? '.link-open' : '.link-go');
      control?.focus({ preventScroll: true });
    }
  }

  /** The rows of a document's list: every neighbour, in one stable order, with what joins it and where it is. */
  private relatedRows(noteId: string, neighbours: readonly Neighbour[]): Array<Neighbour & { where: string; kind: string; sentence: string }> {
    const rank = (n: Neighbour): number => (n.direction === 'out' ? 0 : n.direction === 'both' ? 1 : 2);
    const focused = this.focusId() === noteId;
    const edges = this.edges;
    return [...neighbours]
      .sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((n) => {
        let where = '';
        if (n.held) where = 'open on the desk';
        else if (focused) {
          const at = this.seatedAt.get(n.id);
          if (at !== undefined) {
            const edge = beyondEdges([{ left: at.x - SEAT.width / 2, top: at.y - SEAT.height / 2, width: SEAT.width, height: SEAT.height }], this.viewport);
            where = edge.left > 0 ? 'beyond the left edge' : edge.right > 0 ? 'beyond the right edge' : edge.up > 0 ? 'above the field' : edge.down > 0 ? 'below the field' : '';
          }
        }
        // Until the workspace's links have been read there is no word for the
        // relationship, only its direction, and no word is made up meanwhile.
        const relations = edges === null ? [] : relationsBetween(edges, noteId, n.id);
        return { ...n, where, kind: edges === null ? '' : relationLabel(relations), sentence: relationsSentence(noteId, n.id, relations, n.direction) };
      });
  }

  /** Open or close a document's list of related notes. One list at a time, in this window. */
  private toggleRelated(noteId: string, open: boolean = this.relatedOpen !== noteId): void {
    this.relatedOpen = open ? noteId : this.relatedOpen === noteId ? null : this.relatedOpen;
    if (open) {
      void this.hooks.context(noteId).then(() => this.active && this.drawPanes()).catch(() => null);
      void this.readEdges().then(() => this.active && this.drawPanes());
    }
    this.drawPanes();
  }

  /**
   * Every note a held note is joined to, and which way each link runs: what
   * it links to, what links to it, each once. The sidecar's answer, complete.
   */
  private neighboursOf(noteId: string): Neighbour[] {
    const context = this.hooks.peekContext(noteId);
    if (context === undefined) return [];
    const heldIds = new Set(this.held.map((c) => c.noteId));
    const by = new Map<string, Neighbour>();
    const add = (item: ContextItem, direction: 'out' | 'in'): void => {
      if (item.id === noteId) return;
      const known = by.get(item.id);
      if (known !== undefined) {
        if (known.direction !== direction) known.direction = 'both';
        return;
      }
      const card = this.cardFor(item.id);
      by.set(item.id, {
        id: item.id,
        title: card?.title ?? item.title,
        status: card?.status ?? item.status,
        direction,
        held: heldIds.has(item.id),
        shared: this.shared.has(item.id),
      });
    };
    for (const item of context.linked) add(item, 'out');
    for (const item of context.backlinks) add(item, 'in');
    return [...by.values()];
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
    // While a document is the focus the rest of the field steps back: drawn
    // at 0.85 of the person's zoom, about the middle (FEAT-0017, decision 7).
    const zoom = this.focusId() !== null ? zoomAbout(this.zoom(), 0.85, this.middle(), this.viewport) : this.zoom();
    return applyZoom(project(slot, yaw, this.viewport), zoom, this.viewport);
  }

  /**
   * Zoom by a factor about a point of the field, now (FEAT-0016). The desk is
   * not zoomed: a document's text stays the size the person reads at, and the
   * field's cards pass behind it.
   */
  zoomBy(factor: number, pivot: { x: number; y: number }): void {
    this.cancelZoomEase();
    this.setZoom(zoomAbout(this.zoom(), factor, pivot, this.viewport));
    this.render(false);
  }

  /** A key's step, or a reset: eased over 150 ms, a cut under reduced motion. */
  zoomTo(target: Zoom): void {
    this.cancelZoomEase();
    const from = this.zoom();
    if (this.hooks.reducedMotion()) {
      this.setZoom(target);
      this.render(false);
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
      }
    };
    this.zoomEase = requestAnimationFrame(step);
  }

  private cancelZoomEase(): void {
    if (this.zoomEase !== null) cancelAnimationFrame(this.zoomEase);
    this.zoomEase = null;
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
    // Over a document, the collection or anything else with its own content
    // the wheel is that object's: it scrolls it, and at its end it does not
    // go on to zoom or turn the field (DES-0003's input contract; the
    // stylesheet's `overscroll-behavior: contain` is the other half).
    if (target.closest('.pane, .collection, .narrow-bar, .field-bar, .compass, .target-strip, .edge-callout') !== null) return;
    event.preventDefault();
    this.scheduleIdle();
    // A card the collection shows is part of the collection: the wheel over
    // it moves through the collection's cards, and does not zoom the field.
    if (target.closest('.field-card.in-collection') !== null) {
      for (const item of this.furnitureItems) item.wheel?.(event.deltaY);
      return;
    }
    const sideways = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (sideways) {
      const delta = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
      this.cancelFlight();
      this.model.face(this.model.yaw + delta * TURN_PER_PX);
      this.render(false);
      return;
    }
    const box = this.el.field.getBoundingClientRect();
    this.zoomBy(wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey, this.viewport.height), { x: event.clientX - box.left, y: event.clientY - box.top });
  }

  // ---- the focused document and what is gathered round it (FEAT-0017) ----

  /**
   * The document in focus: the top of this window's desk, while focus is on.
   * None while notes are hidden or the top document is in the reading column.
   */
  focusId(): string | null {
    if (!this.focusOn || this.panesHidden || !this.active) return null;
    // A narrow field shows one object and has no room round it for cards:
    // what the note is joined to is reached through its list.
    if (this.isNarrow() && this.arrangement !== 'orbit') return null;
    const top = this.held[this.held.length - 1];
    if (top === undefined || top.wide === true) return null;
    return top.noteId;
  }

  /** The focus's neighbours clockwise from the top, for the navigator; null with no focus. */
  neighbourOrder(): string[] | null {
    const id = this.focusId();
    return id === null || this.seating === null || this.seating.docId !== id ? null : [...this.seating.order];
  }

  /**
   * What the focus looks like now, for the smoke run: the document as drawn,
   * each neighbour's card and whether it is in the field, how many neighbours
   * the note has in all, how many lines are drawn, and where the desk is.
   */
  focusState(): {
    noteId: string | null;
    pane: Rect | null;
    seated: Array<{ id: string; x: number; y: number; inSight: boolean }>;
    neighbours: number;
    lines: number;
    pan: Point;
    bearing: number;
  } {
    const id = this.focusId();
    const card = id === null ? undefined : this.held.find((c) => c.noteId === id);
    const seated = [...this.seatedAt].map(([noteId, at]) => ({
      id: noteId,
      x: at.x,
      y: at.y,
      inSight: this.cardEls.get(noteId)?.style.pointerEvents === 'auto',
    }));
    return {
      noteId: id,
      pane: card === undefined ? null : this.drawnRect(card),
      seated,
      neighbours: id === null ? 0 : this.neighboursOf(id).length,
      lines: this.links.count(),
      pan: { ...this.deskPan },
      bearing: this.deskBearing,
    };
  }

  /** The workspace and view the band shapes were worked out for. */
  private shapeKey = '';

  /**
   * Make a note the focus as it is opened or brought forward. `from` is the
   * card or the row its document grows from.
   *
   * The desk comes round to where the person is facing, with nothing looked
   * aside at: a person who reaches for a note gets it in front of them
   * whichever way they had turned.
   */
  private openFocus(noteId: string, from: Rect | null): void {
    this.focusOn = true;
    this.seatsOweMark = null;
    this.opening = { noteId, from };
    this.moveDesk(this.model.yaw, { x: 0, y: 0 });
    this.startGather();
    this.scheduleIdle();
  }

  /** Let the cards move to their seats, or back to their slots, over `GATHER_MS`. A cut under reduced motion. */
  private startGather(): void {
    if (this.gatherTimer !== null) clearTimeout(this.gatherTimer);
    this.gatherTimer = null;
    if (this.hooks.reducedMotion()) {
      this.el.field.classList.remove('gather');
      return;
    }
    this.el.field.classList.add('gather');
    this.gatherTimer = setTimeout(() => {
      this.gatherTimer = null;
      this.el.field.classList.remove('gather');
    }, GATHER_MS + 50);
  }

  /** Leave the focus with nothing drawn: a switch of view or surface, or notes hidden. */
  private dropFocus(): void {
    if (!this.focusOn) return;
    this.focusOn = false;
    this.seating = null;
    this.seatEntries.clear();
    this.seatedAt = new Map();
    this.opening = null;
    this.seatsOweMark = null;
    this.openAnim?.cancel();
    this.dragOf = null;
    this.deskPan = { x: 0, y: 0 };
    this.links.clear();
    this.el.field.classList.remove('focusing');
    this.scheduleIdle();
  }

  /**
   * Leave the focus (Escape, and closing the focused document). The cards
   * gathered round the document go back to the slots they came from, and no
   * other card moves: the field was never dealt for the focus, so there is
   * nothing to deal again (FEAT-0017, decision 7; ISS-0072). Every document
   * stays where it is.
   */
  leaveFocus(): void {
    if (!this.focusOn) return;
    this.dropFocus();
    if (!this.active) return;
    this.startGather();
    this.render(false);
    this.drawPanes();
  }

  /**
   * Seat the focus's neighbours round its document.
   *
   * Worked out when the focus, the document's size, the field's height or the
   * set of neighbours changes, and kept as offsets from the document's corner
   * otherwise: a document that is moved carries the arrangement as it is
   * (ISS-0072). The document's size is read, never set (ISS-0071).
   */
  private seatNeighbourhood(): void {
    const id = this.focusId();
    this.el.field.classList.toggle('focusing', id !== null);
    if (id === null) {
      if (this.focusOn && this.held.length === 0) this.focusOn = false;
      this.seating = null;
      this.seatEntries.clear();
      return;
    }
    const card = this.held.find((c) => c.noteId === id);
    const context = this.hooks.peekContext(id);
    if (card === undefined) return;
    if (context === undefined) {
      // Asked for, and seated when it arrives. Until then nothing is seated:
      // the document is readable at once and does not wait for its neighbours.
      if (this.seating !== null && this.seating.docId !== id) this.seating = null;
      void this.hooks
        .context(id)
        .then(() => {
          if (!this.active || this.focusId() !== id) return;
          this.startGather();
          this.seatNeighbourhood();
          this.render(false);
          this.drawPanes();
        })
        .catch(() => null);
      return;
    }
    const heldIds = new Set(this.held.map((c) => c.noteId));
    // A neighbour that is itself on the desk is a document already, and is
    // not also given a card: the line runs to its document (decision 5).
    const seatable = this.neighboursOf(id).filter((n) => !heldIds.has(n.id));
    const r = this.paneRect(card);
    const key = `${id}|${r.w}x${r.h}|${Math.round(this.viewport.height)}|${seatable.map((n) => n.id).sort().join(' ')}`;
    if (this.seating !== null && this.seating.key === key) return;
    const doc: Rect = { left: r.left, top: r.top, width: r.w, height: r.h };
    const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
    const seats = seatsAround({ doc, field: this.viewport, count: seatable.length, avoid: this.seatAvoid(id) });
    // Where each card is drawn now, as an angle round the document as it is
    // drawn now, so the cards keep the order they had round it.
    const drawn = this.drawnRect(card);
    const drawnCentre = { x: drawn.left + drawn.width / 2, y: drawn.top + drawn.height / 2 };
    const before: SeatNeighbour[] = seatable.map((n) => {
      const at = this.cardOnScreen(n.id);
      const slot = this.model.current.slots.get(n.id);
      return {
        id: n.id,
        angle: at !== null && at.visible ? Math.atan2(at.y - drawnCentre.y, at.x - drawnCentre.x) : null,
        side: slot === undefined ? 0 : Math.sign(norm(slot.theta - this.model.yaw)),
      };
    });
    const seated = seatNeighbours(before, seats, centre);
    const clockwise = (p: Point): number => {
      const a = Math.atan2(p.y - centre.y, p.x - centre.x) + Math.PI / 2;
      return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    };
    this.seating = {
      key,
      docId: id,
      offsets: new Map(seated.map(({ id: nid, seat }) => [nid, { x: seat.x - doc.left, y: seat.y - doc.top }])),
      order: [...seated].sort((a, b) => clockwise(a.seat) - clockwise(b.seat) || a.seat.ring - b.seat.ring).map((x) => x.id),
    };
    // A card for every seated note the deal does not hold: one from outside
    // the view, or one a full band counted and did not place.
    this.seatEntries = new Map();
    const items = new Map([...context.linked, ...context.backlinks].map((item) => [item.id, item]));
    for (const n of seatable) {
      if (this.entries.has(n.id)) continue;
      const item = items.get(n.id);
      const model = this.cardFor(n.id) ?? (item === undefined ? null : cardFromContext(item));
      if (model === null) continue;
      this.seatEntries.set(n.id, {
        card: model,
        groupKey: JOINED_GROUP.key,
        groupLabel: JOINED_GROUP.label,
        inputs: { owed: false, suppressed: false, inSubject: false, held: false, joinedToDesk: true, pulled: false, pushed: false },
      });
    }
    // Under reduced motion no card travels to its seat, so the cards that
    // arrive are marked instead (decision 12). The opening marks the ones
    // seated by then; these were seated after it, when the note's
    // neighbourhood was read. Every caller paints straight after this.
    if (this.seatsOweMark === id) {
      this.seatsOweMark = null;
      if (this.hooks.reducedMotion() && this.seating.offsets.size > 0) this.markCards(this.seating.offsets.keys());
    }
  }

  /** What a seat must not stand under: the compass, the other documents, and whatever else is on the desk. */
  private seatAvoid(focusId: string): Rect[] {
    const out: Rect[] = [];
    const box = this.el.field.getBoundingClientRect();
    const c = this.el.compass.getBoundingClientRect();
    if (c.width > 0) out.push({ left: c.left - box.left - 8, top: c.top - box.top - 8, width: c.width + 16, height: c.height + 16 });
    for (const other of this.held) {
      if (other.noteId === focusId) continue;
      const r = this.paneRect(other);
      out.push({ left: r.left, top: r.top, width: r.w, height: other.wide === true ? PANE_HEADER_HEIGHT : r.h });
    }
    out.push(...this.furniture());
    return out;
  }

  /** Where each seated card is drawn now: the document as drawn, plus the card's offset from its corner. */
  private seatPositions(): Map<string, Point> {
    const out = new Map<string, Point>();
    const id = this.focusId();
    if (id === null || this.seating === null || this.seating.docId !== id) return out;
    const card = this.held.find((c) => c.noteId === id);
    if (card === undefined) return out;
    const r = this.drawnRect(card);
    for (const [noteId, offset] of this.seating.offsets) out.set(noteId, { x: r.left + offset.x, y: r.top + offset.y });
    return out;
  }

  /**
   * The lines from the focused document to what is gathered round it.
   *
   * One line to each seated card, and one to each neighbour that is a
   * document of its own. A card joined to a second open document gets a line
   * to that one too: one card, and a connection for each note it is joined to
   * (decision 5).
   */
  private drawLinks(): void {
    const id = this.focusId();
    const card = id === null ? undefined : this.held.find((c) => c.noteId === id);
    const shift = this.deskShift();
    if (id === null || card === undefined || !shift.visible) {
      this.links.clear();
      this.linksFrom = null;
      return;
    }
    // Which lines there are, and where each runs on the desk, depends on the
    // documents' places and sizes on the desk, on the seats, and on what each
    // document is joined to. A turn changes none of these: it shifts the desk.
    // So when all of them are what the lines were last built from, the lines
    // are moved by the shift and not built again.
    const places = this.held
      .map((c) => {
        const r = this.drawnRect(c);
        return `${c.noteId}:${(r.left - shift.x).toFixed(1)},${(r.top - shift.y).toFixed(1)},${r.width}x${r.height},${c.wide === true}`;
      })
      .join(';');
    const emphasised = this.emphasisIds();
    const geometry = `${id}|${this.seating?.key ?? ''}|${this.seatedAt.size}|${places}|${emphasised === null ? '' : `${this.emphasis?.kind}:${emphasised.size}`}`;
    const contexts = this.held.map((c) => this.hooks.peekContext(c.noteId));
    const built = this.linksFrom;
    if (built !== null && built.geometry === geometry && built.contexts.length === contexts.length && built.contexts.every((c, i) => c === contexts[i]) && this.links.count() > 0) {
      this.links.move({ x: shift.x, y: shift.y }, shift.opacity);
      return;
    }
    this.linksFrom = { geometry, contexts };
    const from = this.drawnRect(card);
    const lines: LinkLine[] = [];
    const neighbours = new Map(this.neighboursOf(id).map((n) => [n.id, n]));
    const others = this.held.filter((c) => c.noteId !== id && c.wide !== true);
    const othersJoin = others.map((other) => ({ other, joined: new Map(this.neighboursOf(other.noteId).map((n) => [n.id, n])) }));
    for (const [noteId, at] of this.seatedAt) {
      const n = neighbours.get(noteId);
      if (n === undefined) continue;
      lines.push({ id: noteId, fromId: id, direction: n.direction, from, to: at, quiet: emphasised !== null && !emphasised.has(noteId) });
      for (const { other, joined } of othersJoin) {
        const also = joined.get(noteId);
        if (also !== undefined) lines.push({ id: noteId, fromId: other.noteId, direction: also.direction, from: this.drawnRect(other), to: at, shared: true });
      }
    }
    for (const other of others) {
      const n = neighbours.get(other.noteId);
      if (n === undefined) continue;
      const r = this.drawnRect(other);
      lines.push({ id: other.noteId, fromId: id, direction: n.direction, from, to: { x: r.left + r.width / 2, y: r.top + Math.min(r.height, PANE_HEADER_HEIGHT) / 2 } });
    }
    // The desk's own shift is handed over apart from the lines: a turn moves
    // the document and its cards together, so the lines move as one and none
    // of them needs redrawing (link-lines.ts).
    this.links.paint(lines, shift.opacity, { x: shift.x, y: shift.y });
  }

  /**
   * Move the desk: bring it round to a bearing, or aside by a number of
   * pixels, over `DESK_MOVE_MS`. A cut under reduced motion, and a cut when
   * the desk is out of sight, where there is nothing to watch move.
   */
  private moveDesk(bearing: number, pan: Point, then: () => void = () => {}): void {
    if (this.deskEase !== null) cancelAnimationFrame(this.deskEase);
    this.deskEase = null;
    const fromBearing = this.deskBearing;
    const turn = norm(bearing - fromBearing);
    const fromPan = { ...this.deskPan };
    const still = Math.abs(turn) < 1e-4 && Math.abs(fromPan.x - pan.x) < 0.5 && Math.abs(fromPan.y - pan.y) < 0.5;
    if (still || this.hooks.reducedMotion() || !this.active || !this.deskShift().visible || this.held.length === 0) {
      this.deskBearing = norm(bearing);
      this.deskPan = { ...pan };
      if (this.active && !still) this.render(false);
      then();
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / DESK_MOVE_MS);
      const e = ease(t);
      this.deskBearing = norm(fromBearing + turn * e);
      this.deskPan = { x: fromPan.x + (pan.x - fromPan.x) * e, y: fromPan.y + (pan.y - fromPan.y) * e };
      this.el.field.classList.add('desk-moving');
      this.render(false);
      if (t < 1) {
        this.deskEase = requestAnimationFrame(step);
        return;
      }
      this.deskEase = null;
      this.el.field.classList.remove('desk-moving');
      then();
    };
    this.deskEase = requestAnimationFrame(step);
  }

  /**
   * Bring a seated neighbour into view and put the keyboard on its card: the
   * named way to a card the arrangement has put past the edge of the field
   * (TASK-0104). The desk moves the least that shows the card; nothing is
   * resized and no card changes seat.
   */
  locate(noteId: string): boolean {
    const id = this.focusId();
    const card = id === null ? undefined : this.held.find((c) => c.noteId === id);
    const offset = this.seating?.offsets.get(noteId);
    if (id === null || card === undefined || offset === undefined) return false;
    const r = this.paneRect(card);
    // Where the card would be with the desk in front of the person, and the
    // desk moved as far aside as it is now.
    const shown: Rect = {
      left: r.left + offset.x - SEAT.width / 2 + this.deskPan.x,
      top: r.top + offset.y - SEAT.height / 2 + this.deskPan.y,
      width: SEAT.width,
      height: SEAT.height,
    };
    const by = revealShift(shown, this.viewport, LOCATE_MARGIN);
    this.moveDesk(this.model.yaw, { x: this.deskPan.x + by.x, y: this.deskPan.y + by.y }, () => {
      this.highlight = noteId;
      this.render(false);
      this.clearHighlightLater();
      this.cardEls.get(noteId)?.focus({ preventScroll: true });
    });
    return true;
  }

  /**
   * "Find open note": bring the desk back in front of the person, with the
   * document in view, however far it was turned from or moved aside. The
   * document keeps its place on the desk and its size.
   */
  findOpen(noteId: string | null = this.focusId() ?? this.held[this.held.length - 1]?.noteId ?? null): boolean {
    const card = noteId === null ? undefined : this.held.find((c) => c.noteId === noteId);
    if (noteId === null || card === undefined) return false;
    const r = this.paneRect(card);
    const by = revealShift({ left: r.left, top: r.top, width: r.w, height: Math.min(r.h, this.viewport.height) }, this.viewport, 0);
    this.moveDesk(this.model.yaw, by, () => {
      const pane = this.paneEls.get(noteId);
      if (pane === undefined) return;
      pane.classList.add('highlight');
      setTimeout(() => pane.classList.remove('highlight'), 1600);
      (pane.querySelector('.pane-head') as HTMLElement | null)?.focus({ preventScroll: true });
    });
    return true;
  }

  /** An edge counter was pressed: bring the nearest card beyond that edge into view. */
  private lookBeyond(side: 'left' | 'right' | 'up' | 'down'): void {
    let best: { id: string; far: number } | null = null;
    for (const [id, at] of this.seatedAt) {
      const rect = { left: at.x - SEAT.width / 2, top: at.y - SEAT.height / 2, width: SEAT.width, height: SEAT.height };
      const edge = beyondEdges([rect], this.viewport);
      if (edge[side] === 0) continue;
      const far = side === 'left' ? -rect.left : side === 'right' ? rect.left - this.viewport.width : side === 'up' ? -rect.top : rect.top - this.viewport.height;
      if (best === null || far < best.far) best = { id, far };
    }
    if (best !== null) this.locate(best.id);
  }

  /**
   * What stands at the field's edges while a document is on the desk: a
   * counter for each edge the arrangement runs past, and "find" when the
   * document a person would look for is not in front of them.
   */
  private drawDeskFurniture(): void {
    const shift = this.deskShift();
    const top = this.focusId() ?? this.held[this.held.length - 1]?.noteId ?? null;
    const card = top === null ? undefined : this.held.find((c) => c.noteId === top);
    let away = false;
    if (card !== undefined && !this.panesHidden) {
      const r = this.drawnRect(card);
      const aside = Math.abs(this.deskPan.x) > 0.5 || Math.abs(this.deskPan.y) > 0.5;
      away =
        !shift.visible ||
        shift.opacity < FIND_BELOW_OPACITY ||
        aside ||
        r.left + r.width < FIND_GRAB_PX ||
        r.left > this.viewport.width - FIND_GRAB_PX ||
        r.top > this.viewport.height - PANE_HEADER_HEIGHT;
    }
    // The same for the collection: offered while the desk is turned away
    // from or moved aside, so the list is always one press away.
    const aside = Math.abs(this.deskPan.x) > 0.5 || Math.abs(this.deskPan.y) > 0.5;
    const item = this.furnitureItems[0];
    const at = item?.rect() ?? null;
    const collection = at !== null;
    // And while a document lies over it: a page smaller than the desk was
    // arranged on shows the documents on top of the list, and its header may
    // not be in reach to press.
    const covered =
      at !== null &&
      item !== undefined &&
      !item.onTop() &&
      !this.panesHidden &&
      this.held.some((c) => {
        const r = this.paneRect(c);
        return intersects(at, { left: r.left, top: r.top, width: r.w, height: r.h });
      });
    this.el.toCollection.hidden = !(collection && this.narrowMode() === null && (!shift.visible || shift.opacity < FIND_BELOW_OPACITY || aside || covered));
    this.el.findOpen.hidden = !away || this.narrowMode() !== null;
    if (away && top !== null) {
      this.el.findOpen.textContent = `find ${top}`;
      this.el.findOpen.dataset['noteId'] = top;
      this.el.findOpen.setAttribute('aria-label', `Find the open note ${top}: bring the desk back in front of you`);
    }
    const rects = shift.visible
      ? [...this.seatedAt.values()].map((at) => ({ left: at.x - SEAT.width / 2, top: at.y - SEAT.height / 2, width: SEAT.width, height: SEAT.height }))
      : [];
    const counts = beyondEdges(rects, this.viewport);
    for (const side of BEYOND_SIDES) {
      const button = this.el.beyond.querySelector<HTMLButtonElement>(`[data-side="${side}"]`);
      if (button === null) continue;
      const n = counts[side];
      button.hidden = n === 0;
      if (n === 0) continue;
      button.textContent = `${BEYOND_ARROW[side]} ${n} related`;
      button.setAttribute('aria-label', `${n} related ${n === 1 ? 'note' : 'notes'} ${BEYOND_WORDS[side]}: bring the nearest into view`);
    }
  }

  /**
   * The bar a narrow field carries: the collection and each open note, by
   * name, with the one in front marked. It is the explicit way between
   * objects that DES-0003 asks for where they cannot be shown side by side.
   */
  private drawNarrowBar(narrow: 'collection' | 'document' | null): void {
    const bar = this.el.narrowBar;
    bar.hidden = narrow === null;
    // One object fills a narrow field, so the compass would lie over its
    // text; the bar is what moves between objects there (deck.css).
    this.el.field.classList.toggle('narrow', narrow !== null);
    if (narrow === null) {
      if (bar.dataset['signature'] !== '') {
        bar.dataset['signature'] = '';
        bar.replaceChildren();
      }
      return;
    }
    const top = this.held[this.held.length - 1]?.noteId ?? null;
    const items: Array<{ key: string; label: string; front: boolean }> = [{ key: 'collection', label: 'Collection', front: narrow === 'collection' }];
    for (const card of this.held) items.push({ key: card.noteId, label: card.noteId, front: narrow === 'document' && card.noteId === top });
    const signature = items.map((i) => `${i.key}|${i.front}`).join(' ');
    if (bar.dataset['signature'] === signature) return;
    bar.dataset['signature'] = signature;
    bar.replaceChildren(
      ...items.map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'action';
        button.dataset['object'] = item.key;
        button.textContent = item.label;
        button.setAttribute('aria-pressed', String(item.front));
        button.setAttribute('aria-label', item.key === 'collection' ? 'Show the collection' : `Show the open note ${item.key}`);
        button.addEventListener('click', () => {
          if (item.key === 'collection') {
            this.showCollection();
            return;
          }
          this.narrowFront = 'document';
          void this.raise(item.key).then(() => {
            if (this.active) this.redeal(false);
          });
        });
        return button;
      }),
    );
  }

  /**
   * A row of a document's list was chosen: show where that note is. A note
   * that is a document is found; any other is seated round this document,
   * which becomes the focus if it was not, and its card is brought into view.
   */
  private async showNeighbour(docId: string, noteId: string): Promise<void> {
    if (this.held.some((c) => c.noteId === noteId)) {
      await this.bringForward(noteId);
      this.findOpen(noteId);
      return;
    }
    if (this.focusId() !== docId) await this.bringForward(docId);
    // The seats follow the context, which the list was built from, so the
    // card is seated by now; a neighbour with no card at all is opened.
    if (!this.locate(noteId)) await this.openNeighbour(docId, noteId);
  }

  /** Open one of a document's neighbours as a document of its own, growing from its card when that is in sight. */
  private async openNeighbour(docId: string, noteId: string): Promise<void> {
    if (this.held.some((c) => c.noteId === noteId)) {
      await this.bringForward(noteId);
      return;
    }
    const context = this.hooks.peekContext(docId);
    const item = context === undefined ? undefined : [...context.linked, ...context.backlinks].find((i) => i.id === noteId);
    const card = this.cardFor(noteId) ?? (item === undefined ? null : cardFromContext(item));
    if (card !== null) await this.lift(card);
  }

  /**
   * Resting on a line shows which way the link runs and the sentence it sits
   * in (decision 6), from the workspace's edge list, read once per index
   * revision the first time a line is rested on.
   */
  private async restOnLine(id: string | null, at: Point): Promise<void> {
    const focus = this.focusId();
    if (id === null || focus === null) {
      this.showCallout(null, 0, 0);
      return;
    }
    const edges = await this.readEdges();
    // A link the source names is shown before one written in a sentence.
    const between = edges.filter((e) => (e.source === focus && e.target === id) || (e.source === id && e.target === focus));
    const edge = between.find((e) => e.field !== null && e.field !== undefined) ?? between[0] ?? null;
    if (this.focusId() === focus) this.showCallout(edge, at.x, at.y, relationsSentence(focus, id, relationsBetween(edges, focus, id), 'both'));
  }

  /** The workspace's links, read once per state of the workspace: what a relationship is called comes from them. */
  private readEdges(): Promise<GraphEdge[]> {
    if (this.arrangement === 'orbit' && this.orbit !== null) {
      this.edges = this.orbit.edges;
      return Promise.resolve(this.edges);
    }
    if (this.graphEdgesFor === null) this.graphEdgesFor = this.hooks.graphEdges().catch(() => []);
    return this.graphEdgesFor.then((edges) => {
      this.edges = edges;
      return edges;
    });
  }

  /** The edge list is read again after the notes change on disk. */
  forgetGraphEdges(): void {
    this.graphEdgesFor = null;
    this.edges = null;
  }

  /**
   * Hide notes, or show them again (FEAT-0015, decisions 1 and 2). The notes
   * stay held and keep shaping the field: their neighbours stay in front and
   * their slots stay ghosted. Only the panes go, and the space they covered
   * is dealt into.
   */
  setHidden(hidden: boolean): void {
    if (this.panesHidden === hidden) return;
    // Hide notes leaves the focus, then hides: with no document in sight there is nothing to gather round.
    if (hidden) this.dropFocus();
    this.panesHidden = hidden;
    this.el.panes.hidden = hidden;
    if (this.active) this.redeal(true);
  }

  /** Forget the pane bodies, because the notes they came from changed on disk. */
  forgetBodies(): void {
    // Each open document asks again the next time it is painted. Until the
    // new text arrives it keeps the text, the title and the details it has:
    // a note being read is not replaced by a "reading…" line because another
    // note changed, and one that cannot be read again is not emptied.
    for (const noteId of [...this.docs.keys()]) {
      if (this.paneEls.has(noteId)) this.rereads.add(noteId);
      else this.docs.delete(noteId);
    }
    for (const pane of this.paneEls.values()) delete pane.dataset['asked'];
  }

  /**
   * A press on a document's header: it is raised, and a drag moves it.
   *
   * Moving is not resizing and is not leaving the focus (ISS-0071, ISS-0072).
   * The document keeps the size it has, and when it is the focus the cards
   * gathered round it are drawn with it at every step, so the arrangement is
   * the same arrangement when the drag ends. No card in the field moves:
   * nothing is dealt. Escape during the drag puts the document back.
   */
  private grabPane(noteId: string, pane: HTMLElement, event: PointerEvent): void {
    this.scheduleIdle();
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button') !== null) return;
    if (!this.hooks.canArrange()) return;
    event.stopPropagation();
    const head = event.currentTarget as HTMLElement;
    // A press on a header raises the pane, drag or not.
    void this.hooks.dispatch({ type: 'raise-card', noteId });
    head.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const held = this.held.find((c) => c.noteId === noteId);
    if (held === undefined) return;
    const base = this.paneRect(held);
    const fieldBox = this.el.field.getBoundingClientRect();
    const samples: PointerSample[] = [];
    let moved = false;
    let edge: Edge | null = null;
    let targets: ThrowTarget[] = [];
    let hovered: ThrowTarget | null = null;
    const finish = (): void => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
      head.removeEventListener('pointercancel', up);
      pane.classList.remove('dragging');
      this.el.field.classList.remove('desk-moving');
      this.showStrip(null, []);
      this.dragCancel = null;
    };
    const move = (e: PointerEvent): void => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= CLICK_SLOP_PX) return;
      moved = true;
      pane.classList.add('dragging');
      this.el.field.classList.add('desk-moving');
      this.dragOf = { noteId, dx, dy, x: held.x, y: held.y };
      this.dragCancel = (): void => {
        finish();
        this.dragOf = null;
        this.render(false);
      };
      this.render(false);
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
      const drag = this.dragOf;
      finish();
      if (!moved || drag === null || e.type === 'pointercancel') {
        this.dragOf = null;
        this.render(false);
        return;
      }
      const card = this.cardFor(noteId);
      if (hovered !== null && card !== null) {
        const target = hovered;
        this.dragOf = null;
        this.render(false);
        this.tell(`${noteId} sent to the ${target.label}`);
        void this.hooks.throwTo(target, card, edge ?? 'right');
        return;
      }
      const others = this.held
        .filter((c) => c.noteId !== noteId)
        .map((c) => {
          const r = this.paneRect(c);
          return { noteId: c.noteId, x: r.left, y: r.top, w: r.w };
        });
      const snapped = snapBelowHeaders({ noteId, x: Math.max(0, base.left + drag.dx), y: Math.max(0, base.top + drag.dy), w: base.w }, others);
      // The drag stays drawn until the store has the new place: `drawnRect`
      // drops it the moment the stored place changes, so the document is
      // never drawn at the old place in between, nor at both offsets at once.
      void this.hooks.dispatch({ type: 'move-card', noteId, x: snapped.x, y: snapped.y }).finally(() => {
        if (this.dragOf === drag) {
          this.dragOf = null;
          this.render(false);
        }
      });
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
    head.addEventListener('pointercancel', up);
  }

  /** Put back the document being dragged, when one is: Escape's first job. */
  private dragCancel: (() => void) | null = null;

  /**
   * The corner: the one way a document's size changes by pointer. The store
   * is told once, when the corner is let go, and what it is told is also the
   * size the next note opened on this view takes (ISS-0071).
   */
  private resizePane(noteId: string, pane: HTMLElement, event: PointerEvent): void {
    if (event.button !== 0 || !this.hooks.canArrange()) return;
    event.stopPropagation();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const w0 = pane.offsetWidth;
    const h0 = pane.offsetHeight;
    pane.classList.add('resizing');
    const move = (e: PointerEvent): void => {
      pane.style.width = `${Math.max(PANE_MIN_WIDTH, w0 + e.clientX - startX)}px`;
      pane.style.height = `${Math.max(PANE_MIN_HEIGHT, h0 + e.clientY - startY)}px`;
    };
    const up = (e: PointerEvent): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      const done = (): void => {
        pane.classList.remove('resizing');
        if (this.active) this.placePanes();
      };
      if (e.type === 'pointercancel') {
        done();
        return;
      }
      // The cards round a resized focus move out to make room, over the same
      // time they took to gather.
      this.startGather();
      void this.hooks.dispatch({ type: 'resize-card', noteId, w: w0 + e.clientX - startX, h: h0 + e.clientY - startY }).finally(done);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  private paneKey(noteId: string, event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const card = this.held.find((c) => c.noteId === noteId);
    if (card === undefined) return;
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      this.toggleRelated(noteId);
      // Into the list when it has a row; else on the button that opened it.
      const pane = this.paneEls.get(noteId);
      if (this.relatedOpen === noteId) (pane?.querySelector<HTMLElement>('.link-go') ?? pane?.querySelector<HTMLElement>('.pane-related'))?.focus();
      return;
    }
    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      this.toggleDetails(noteId);
      if (this.detailsOpen === noteId) this.paneEls.get(noteId)?.querySelector<HTMLElement>('.pane-details')?.focus();
      return;
    }
    if (event.key === 'l' || event.key === 'L') {
      // Back to the list without closing: the collection is brought into
      // reach and the keyboard goes to this note's row.
      event.preventDefault();
      this.showCollection();
      this.hooks.toRow(noteId);
      return;
    }
    if (!this.hooks.canArrange()) {
      // A served page arranges nothing, and closes only what it opened itself.
      if ((event.key === 'Delete' || event.key === 'Backspace') && this.localHeld.some((c) => c.noteId === noteId)) {
        event.preventDefault();
        void this.putBack(noteId);
      }
      return;
    }
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
        // The keyboard's corner: the same act as dragging it, from the size
        // the document has, not the size a narrow window is drawing it at.
        const state = this.hooks.state();
        const size = readingSizeFor(card, readingSizeOf(state, state.workspaceId, deskViewOf(state)));
        this.startGather();
        void this.hooks.dispatch({ type: 'resize-card', noteId, w: size.w + by[0], h: size.h + by[1] });
      } else {
        // From where it is drawn, so a document clamped into a small field
        // moves from where the person sees it. The neighbourhood follows,
        // because its seats are measured from the document.
        const r = this.paneRect(card);
        void this.hooks.dispatch({ type: 'move-card', noteId, x: Math.max(0, r.left + by[0]), y: Math.max(0, r.top + by[1]) });
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      // Enter on a header makes that document the focus and gathers what it is joined to.
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
    if (!this.hooks.canArrange()) {
      // Only a document this page opened for itself: the Mac's are the Mac's.
      const at = this.localHeld.findIndex((c) => c.noteId === noteId);
      if (at === -1) return;
      if (this.focusId() === noteId) this.leaveFocus();
      if (this.relatedOpen === noteId) this.relatedOpen = null;
      if (this.detailsOpen === noteId) this.detailsOpen = null;
      this.localHeld.splice(at, 1);
      if (this.held.filter((c) => c.noteId !== noteId).length === 0) this.narrowFront = 'collection';
      if (this.active) this.redeal(false);
      this.hooks.closed(noteId);
      return;
    }
    // Closing the focused document leaves the focus: its cards go back to
    // their slots, and every other document stays where it is (decision 10).
    if (this.focusId() === noteId) this.leaveFocus();
    if (this.relatedOpen === noteId) this.relatedOpen = null;
    if (this.detailsOpen === noteId) this.detailsOpen = null;
    await this.hooks.dispatch({ type: 'take-off-desk', noteId });
    // With no other document to show, a narrow field goes back to the list.
    if (this.held.filter((c) => c.noteId !== noteId).length === 0) this.narrowFront = 'collection';
    // The keyboard goes back to the row the note was opened from, or the
    // collection says that row is gone (TASK-0098).
    this.hooks.closed(noteId);
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
    if (!this.hooks.canArrange()) {
      // A served page sweeps what it opened for itself, and nothing of the Mac's.
      if (this.localHeld.length === 0) return;
      const n = this.localHeld.length;
      this.localHeld = [];
      this.narrowFront = 'collection';
      if (this.active) this.redeal(false);
      this.tell(`${n} ${n === 1 ? 'note' : 'notes'} opened here ${n === 1 ? 'is' : 'are'} closed; the Mac's desk is as it was`);
      return;
    }
    if (this.held.length === 0) return;
    const stayed = this.held.filter((c) => this.hooks.isEveryView(c.noteId)).length;
    await this.hooks.dispatch({ type: 'clear-desk' });
    this.tell(
      stayed === 0
        ? 'the desk is swept; every note is back in its slot'
        : `the desk is swept; ${stayed} ${stayed === 1 ? 'note' : 'notes'} on every view stayed`,
    );
  }

  /** Make a held note the focus: Enter on its header, or a row of another document's list that names it. */
  private async bringForward(noteId: string): Promise<void> {
    this.openFocus(noteId, null);
    this.narrowFront = 'document';
    await this.raise(noteId);
    // Already on top: no broadcast comes, so draw now.
    if (this.active) this.redeal(false);
  }

  /** ⧉ or V on a pane: keep the note on every view, or give it back to this one (decision 6). */
  async toggleEveryView(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    const on = !this.hooks.isEveryView(noteId);
    await this.hooks.dispatch({ type: 'set-every-view', noteId, on });
    this.tell(on ? `${noteId} is on every view` : `${noteId} is on this view only`);
  }

  /**
   * W, or ⤢ on a document: fill the field with it, or put it back at its own
   * size. Until FEAT-0020 this moved the note's text to a column beside the
   * field; the text is on the desk now, so the same control makes the
   * document as large as the field instead. The size and place the store
   * holds for it are not changed, and at most one document fills the field.
   */
  async widen(noteId: string): Promise<void> {
    if (!this.hooks.canArrange()) return;
    // A document that fills the field has nothing gathered round it.
    if (this.focusId() === noteId) this.leaveFocus();
    const card = this.held.find((c) => c.noteId === noteId);
    const wide = card?.wide !== true;
    await this.hooks.dispatch({ type: 'widen-card', noteId, wide });
    if (wide) await this.hooks.dispatch({ type: 'raise-card', noteId });
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

/** A frontmatter value as a line of text: a string, a number, or a list of them, with `[[...]]` taken off. Null for anything else. */
function plainValue(value: unknown): string | null {
  const one = (v: unknown): string | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v !== 'string') return null;
    const text = v.trim().replace(/^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/, '$1').trim();
    return text === '' ? null : text;
  };
  if (Array.isArray(value)) {
    const parts = value.map(one).filter((x): x is string => x !== null);
    return parts.length === 0 ? null : parts.join(', ');
  }
  return one(value);
}

/** A path from a link, percent-decoded, or null when it is not text. */
function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector(selector);
  if (node !== null && node.textContent !== value) node.textContent = value;
}

export { CARD_BOX };
