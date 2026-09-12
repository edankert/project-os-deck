/**
 * The slot geometry: where each banded note stands on the cylinder (TASK-0030).
 *
 * The person stands inside a cylinder. A slot is an angle round it (`theta`,
 * radians, 0 straight ahead), a distance from the person (`depth`), and a
 * height (`y`). Twelve slots stand close in front, forty further off on both
 * sides, and the quiet band is rows of small tiles behind the person, with a
 * stated shape so two thousand of them have somewhere to be.
 *
 * Two defects in DES-0002's prototype are rules here, both found by the
 * review. The slot test anchored a card at its centre while the renderer
 * anchored it at its top, so four cards sat under the console at rest: here
 * one function, `cardTransform`, is what both the tests and the renderer use.
 * And obstacles were tested at the yaw of the last deal, so a turn rotated
 * cards underneath them: here an obstacle is a SECTOR of the cylinder, which
 * does not move when the person turns.
 *
 * Assignment runs on a view change, a pane move and a turn's end. It never
 * runs inside the frame loop, which is why turning stays smooth: `FieldModel`
 * below is the one place a turn is handled, and it only changes the yaw.
 */

export const DEG = Math.PI / 180;

/** How far the eye is from the screen, in the same units as a slot's depth. */
export const PERSPECTIVE = 1100;

/**
 * The size of a near card before perspective, and where it is anchored.
 *
 * The anchor is the card's CENTRE. `project` returns the centre, and
 * `cardTransform` places the box by it; nothing else in Deck converts one to
 * the other, so the slot test and the renderer cannot disagree again.
 */
export const CARD_BOX = Object.freeze({ width: 186, height: 92, anchor: 'centre' as const });

/** A quiet tile before perspective: an id, a status colour and, where there is one, a bar. */
export const TILE_BOX = Object.freeze({ width: 58, height: 16 });

/** Past this angle either side, a slot is out of sight. */
export const VISIBLE_HALF_ANGLE = 78 * DEG;

/** The front band: rows of four, columns spreading from straight ahead. */
export const FRONT = Object.freeze({ depth: 380, rows: 4, rowStep: 104, columnStep: 34 * DEG, columns: 5 });
/** The mid band: columns on both sides of the front band. */
export const MID = Object.freeze({ depth: 620, rows: 4, rowStep: 118, firstColumn: 50 * DEG, columnStep: 22 * DEG, columnsPerSide: 8 });
/**
 * The outer field: the middle again, one step further out (ADR-0005).
 *
 * It holds the view's own active work the middle had no room for, so it keeps
 * the middle's columns and takes a depth between the middle and the quiet
 * band. Its notes are cards, not tiles: a person has to be able to read what
 * a piece of unfinished work is. TASK-0073 replaces these numbers with a
 * shape derived from how many notes the band actually holds.
 */
export const OUTER = Object.freeze({ depth: 690, rows: 4, rowStep: 108, firstColumn: 50 * DEG, columnStep: 22 * DEG, columnsPerSide: 8 });

/**
 * The quiet band's shape, stated so a thousand tiles have one.
 *
 * Forty tiles to a row across 156 degrees centred behind the person, and
 * twenty-five rows to a layer: a thousand tiles a layer. A larger quiet band
 * steps back a layer at a time, so 2660 notes are three layers deep. Rows
 * rather than a spiral, because a row reads like a shelf and a spiral reads
 * like a pattern, and a person looking for one note scans a shelf.
 */
export const QUIET = Object.freeze({
  depth: 760,
  layerStep: 150,
  columns: 40,
  rows: 25,
  span: 156 * DEG,
  rowStep: 22,
});

export type BandName = 'front' | 'mid' | 'outer' | 'deep';

export interface Slot {
  band: BandName;
  theta: number;
  depth: number;
  y: number;
  /** For the quiet band, where the tile sits in its shape; for the others, the slot's grid place. */
  row: number;
  column: number;
  layer: number;
}

/**
 * Something the field must flow around: a pane, the reading column, one day
 * a console (PHASE-0004).
 *
 * An angular sector of the cylinder, `from` to `to` in world radians, that
 * applies to slots at depths from `nearest` to `farthest`. A pane on the
 * front plane covers the front band and the mid band behind it in the angles
 * it spans, so it is two sectors, one per depth, because the same screen
 * width spans more angle at a nearer depth.
 */
export interface Obstacle {
  from: number;
  to: number;
  nearest: number;
  farthest: number;
}

/** An angle in (-pi, pi]. */
export function norm(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Whether a world angle falls inside a sector, across the wrap at pi. */
export function inSector(theta: number, from: number, to: number): boolean {
  const width = norm(to - from);
  const offset = norm(theta - from);
  if (width >= 0) return offset >= 0 && offset <= width;
  return offset <= 0 && offset >= width;
}

export function blocked(slot: { theta: number; depth: number }, obstacles: readonly Obstacle[]): boolean {
  return obstacles.some(
    (o) => slot.depth >= o.nearest && slot.depth <= o.farthest && inSector(slot.theta, o.from, o.to),
  );
}

/**
 * A band's shape: everything its slot generator needs, and the box a note in
 * it is drawn in (ADR-0005, TASK-0073).
 *
 * Which fields matter depends on the band. `span` and `layerStep` are the
 * quiet band's; `firstColumn` is the middle's and the outer field's, where
 * columns run outward from straight ahead on both sides; the front band uses
 * `columns` as a total and the others as a count per side or per row.
 */
export interface BandShape {
  band: BandName;
  depth: number;
  rows: number;
  rowStep: number;
  columns: number;
  columnStep: number;
  firstColumn: number;
  span: number;
  layerStep: number;
  box: { width: number; height: number };
}

/**
 * How far a tile of a given box reaches round the cylinder, as the fraction
 * of its own width that the quiet band's stated shape leaves between columns.
 *
 * Read off today's numbers rather than chosen: 40 columns across 156 degrees
 * at depth 760 put their centres 53.0 units apart and the tile is 58 wide, so
 * the tiles just touch. Every smaller shape keeps that relation, which is why
 * a band of forty notes gets bigger tiles rather than a sparser shelf.
 */
const TILE_FILL = TILE_BOX.width / ((QUIET.span / (QUIET.columns - 1)) * QUIET.depth);

/**
 * The largest a quiet tile may be drawn.
 *
 * A front card is 186 wide at depth 380 and lands 138 pixels across; a box of
 * 140 at depth 760 lands 83. So the biggest tile a small quiet band can get
 * is comfortably readable and still plainly smaller than the work in front of
 * a person, which is the point: depth carries priority, and finished work
 * must not start reading as urgent (ISS-0076, Edwin's steer).
 */
const MAX_TILE_WIDTH = 140;

/**
 * The quiet band's five shapes, smallest first, each holding one layer.
 *
 * The shape is QUANTISED rather than continuous, and that is deliberate: a
 * band whose geometry moved with every note would re-lay the field when one
 * issue was marked fixed. Five steps mean a note crossing between bands
 * changes nothing unless it crosses a step boundary, and the renderer
 * computes the shape on a view or workspace change only (TASK-0075), so it
 * cannot reshape the field under a person's hands even then.
 *
 * The last is today's `QUIET` exactly, so a workspace at Your Trainer's size
 * draws what it drew before this function existed.
 */
const QUIET_STEPS: ReadonlyArray<{ columns: number; rows: number }> = Object.freeze([
  { columns: 8, rows: 6 },
  { columns: 14, rows: 11 },
  { columns: 22, rows: 19 },
  { columns: 32, rows: 25 },
  { columns: QUIET.columns, rows: QUIET.rows },
]);

/** The outer field's four shapes: columns a side, so the fewer it holds the nearer the front they stand. */
const OUTER_STEPS: ReadonlyArray<{ columnsPerSide: number }> = Object.freeze([
  { columnsPerSide: 2 },
  { columnsPerSide: 4 },
  { columnsPerSide: 6 },
  { columnsPerSide: OUTER.columnsPerSide },
]);

function quietShape(count: number): BandShape {
  const step = QUIET_STEPS.find((s) => count <= s.columns * s.rows) ?? (QUIET_STEPS[QUIET_STEPS.length - 1] as { columns: number; rows: number });
  const spacing = (QUIET.span / (step.columns - 1)) * QUIET.depth;
  const width = Math.min(MAX_TILE_WIDTH, Math.round(spacing * TILE_FILL));
  const height = Math.round(width * (TILE_BOX.height / TILE_BOX.width));
  return {
    band: 'deep',
    // FIXED. Depth carries priority, so a small quiet band grows its tiles
    // where it stands rather than walking toward the person.
    depth: QUIET.depth,
    rows: step.rows,
    rowStep: Math.round(height * (QUIET.rowStep / TILE_BOX.height)),
    columns: step.columns,
    columnStep: QUIET.span / (step.columns - 1),
    firstColumn: 0,
    span: QUIET.span,
    layerStep: QUIET.layerStep,
    box: { width, height },
  };
}

function outerShape(count: number): BandShape {
  const step = OUTER_STEPS.find((s) => count <= s.columnsPerSide * 2 * OUTER.rows) ?? (OUTER_STEPS[OUTER_STEPS.length - 1] as { columnsPerSide: number });
  return {
    band: 'outer',
    // FIXED, and between the middle's 620 and the quiet band's 760: the outer
    // field is the middle one step further out, whatever it holds.
    depth: OUTER.depth,
    rows: OUTER.rows,
    rowStep: OUTER.rowStep,
    columns: step.columnsPerSide,
    columnStep: OUTER.columnStep,
    firstColumn: OUTER.firstColumn,
    span: 0,
    layerStep: 0,
    box: { width: Math.round(CARD_BOX.width * 0.8), height: Math.round(CARD_BOX.height * 0.8) },
  };
}

/**
 * The shape a band takes for the number of notes it holds in this deal.
 *
 * **The front band and the middle do not adapt, and that is a decision.**
 * ISS-0076 asked for all four in one pass, and the answer for these two is
 * that they are already the size of what they hold: the front band has 20
 * slots for a capacity of 12 and deals from the centre column outward, so
 * three owed notes stand in the middle of the field at full size already.
 * Shrinking a card because few are owed would make urgent work LESS
 * prominent, which is backwards. The two bands that were wrong are the quiet
 * band, sized for a corpus ten times most projects, and the outer field,
 * which is new.
 */
export function bandShapeFor(band: BandName, count: number): BandShape {
  const n = Math.max(0, Math.floor(count));
  if (band === 'front') {
    return { band, depth: FRONT.depth, rows: FRONT.rows, rowStep: FRONT.rowStep, columns: FRONT.columns, columnStep: FRONT.columnStep, firstColumn: 0, span: 0, layerStep: 0, box: { ...CARD_BOX } };
  }
  if (band === 'mid') {
    return { band, depth: MID.depth, rows: MID.rows, rowStep: MID.rowStep, columns: MID.columnsPerSide, columnStep: MID.columnStep, firstColumn: MID.firstColumn, span: 0, layerStep: 0, box: { ...CARD_BOX } };
  }
  return band === 'outer' ? outerShape(n) : quietShape(n);
}

/** The shape of every band for one deal, which is what a generator set needs. */
export interface BandShapes {
  front: BandShape;
  mid: BandShape;
  outer: BandShape;
  deep: BandShape;
}

/** The four shapes for the four band sizes of one deal. */
export function shapesFor(counts: { front: number; mid: number; outer: number; deep: number }): BandShapes {
  return {
    front: bandShapeFor('front', counts.front),
    mid: bandShapeFor('mid', counts.mid),
    outer: bandShapeFor('outer', counts.outer),
    deep: bandShapeFor('deep', counts.deep),
  };
}

/** Every front slot, nearest the centre first. More than the band's capacity, so an obstacle eats a spare. */
export function frontSlots(shape: BandShape = bandShapeFor('front', 0)): Slot[] {
  const out: Slot[] = [];
  const half = (shape.columns - 1) / 2;
  for (let column = 0; column < shape.columns; column += 1) {
    for (let row = 0; row < shape.rows; row += 1) {
      out.push({
        band: 'front',
        theta: (column - half) * shape.columnStep,
        depth: shape.depth,
        y: (row - (shape.rows - 1) / 2) * shape.rowStep,
        row,
        column,
        layer: 0,
      });
    }
  }
  // Centre column first, then the two either side, top to bottom in each.
  return out.sort((a, b) => Math.abs(a.column - half) - Math.abs(b.column - half) || a.theta - b.theta || a.row - b.row);
}

/**
 * Every mid slot, in the order a heading is dealt into them: the nearest
 * column on the left, the nearest on the right, then outwards.
 */
export function midSlots(shape: BandShape = bandShapeFor('mid', 0)): Slot[] {
  const out: Slot[] = [];
  for (let step = 0; step < shape.columns; step += 1) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < shape.rows; row += 1) {
        out.push({
          band: 'mid',
          theta: side * (shape.firstColumn + step * shape.columnStep),
          depth: shape.depth,
          y: (row - (shape.rows - 1) / 2) * shape.rowStep,
          row,
          column: side * (step + 1),
          layer: 0,
        });
      }
    }
  }
  return out;
}

/**
 * Every outer-field slot, in the same order the middle takes its columns.
 *
 * The middle and the outer field are dealt from one continuous sequence of
 * headings, so the outer field repeats the middle's angles at its own depth
 * and a sector that runs past the middle continues straight into it.
 */
export function outerSlots(shape: BandShape = bandShapeFor('outer', Number.MAX_SAFE_INTEGER)): Slot[] {
  const out: Slot[] = [];
  for (let step = 0; step < shape.columns; step += 1) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < shape.rows; row += 1) {
        out.push({
          band: 'outer',
          theta: side * (shape.firstColumn + step * shape.columnStep),
          depth: shape.depth,
          y: (row - (shape.rows - 1) / 2) * shape.rowStep,
          row,
          column: side * (step + 1),
          layer: 0,
        });
      }
    }
  }
  return out;
}

/** The quiet tile at this index in the band, by the stated shape. */
export function quietSlot(index: number, shape: BandShape = bandShapeFor('deep', Number.MAX_SAFE_INTEGER)): Slot {
  const perLayer = shape.columns * shape.rows;
  const layer = Math.floor(index / perLayer);
  const within = index % perLayer;
  const row = Math.floor(within / shape.columns);
  const column = within % shape.columns;
  const step = shape.columnStep;
  return {
    band: 'deep',
    theta: norm(Math.PI + (column - (shape.columns - 1) / 2) * step),
    depth: shape.depth + layer * shape.layerStep,
    y: (row - (shape.rows - 1) / 2) * shape.rowStep,
    row,
    column,
    layer,
  };
}

export interface Bands<T> {
  front: T[];
  mid: T[];
  outer: T[];
  deep: T[];
}

export interface Assignment<T> {
  slots: Map<T, Slot>;
  /** Front notes with no free slot, because an obstacle took it. Counted, never demoted. */
  frontOverflow: number;
  /** Mid notes with no free slot, because an obstacle took it. Counted, never sent behind. */
  midOverflow: number;
  /** Outer-field notes with no free slot. Counted the same way. */
  outerOverflow: number;
  /** Where each heading's first slot is, so the renderer can label a sector. */
  sectors: Array<{ key: string; slot: Slot; count: number }>;
  /** The shapes this deal used, so the renderer draws each note in its band's own box. */
  shapes: BandShapes;
}

/**
 * Deal the banded notes into slots.
 *
 * The mid band is dealt heading by heading. A heading of three or more
 * starts a new column, so a sector is one heading and a person reads it as
 * one; a smaller heading takes the next slots, or eight small headings would
 * use every visible column and show a handful of cards.
 */
export function assignSlots<T>(
  bands: Bands<T>,
  obstacles: readonly Obstacle[] = [],
  headingOf: (item: T) => string = () => '',
  shapes: BandShapes = shapesFor({ front: bands.front.length, mid: bands.mid.length, outer: bands.outer.length, deep: bands.deep.length }),
): Assignment<T> {
  const slots = new Map<T, Slot>();
  const front = frontSlots(shapes.front).filter((s) => !blocked(s, obstacles));
  let frontOverflow = 0;
  bands.front.forEach((item, i) => {
    const slot = front[i];
    if (slot === undefined) frontOverflow += 1;
    else slots.set(item, slot);
  });

  const mid = midSlots(shapes.mid).filter((s) => !blocked(s, obstacles));
  const sectors: Array<{ key: string; slot: Slot; count: number }> = [];
  let midOverflow = 0;
  let at = 0;
  let index = 0;
  while (index < bands.mid.length) {
    const heading = headingOf(bands.mid[index] as T);
    let end = index;
    while (end < bands.mid.length && headingOf(bands.mid[end] as T) === heading) end += 1;
    const size = end - index;
    if (size >= 3 && at % shapes.mid.rows !== 0) at += shapes.mid.rows - (at % shapes.mid.rows);
    const first = mid[at];
    if (first !== undefined) sectors.push({ key: heading, slot: first, count: size });
    for (let i = index; i < end; i += 1) {
      const slot = mid[at];
      if (slot === undefined) midOverflow += 1;
      else slots.set(bands.mid[i] as T, slot);
      at += 1;
    }
    index = end;
  }

  // The outer field is dealt straight, not heading by heading: it is already
  // the middle's remainder, and its headings are whatever ran past the
  // middle's slots. Breaking it into sectors again would start a new column
  // for a heading whose first cards are in the band in front of it.
  const outer = outerSlots(shapes.outer).filter((s) => !blocked(s, obstacles));
  let outerOverflow = 0;
  bands.outer.forEach((item, i) => {
    const slot = outer[i];
    if (slot === undefined) outerOverflow += 1;
    else slots.set(item, slot);
  });

  bands.deep.forEach((item, i) => slots.set(item, quietSlot(i, shapes.deep)));
  return { slots, frontOverflow, midOverflow, outerOverflow, sectors, shapes };
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Projection {
  /** The card's CENTRE on screen, in pixels from the field's top left. */
  x: number;
  y: number;
  scale: number;
  /** The slot's angle from where the person faces. */
  phi: number;
  /** In front of the person, inside the visible arc, and on the field. */
  visible: boolean;
  /** Nearer slots stack above further ones. */
  z: number;
}

/** Where the horizon sits: a little above the middle, so the front band's rows read downward. */
export const HORIZON = 0.46;

/** A slot on the screen at this yaw. */
export function project(slot: { theta: number; depth: number; y: number }, yaw: number, viewport: Viewport): Projection {
  const phi = norm(slot.theta - yaw);
  const scale = PERSPECTIVE / (PERSPECTIVE + Math.cos(phi) * slot.depth);
  const x = viewport.width / 2 + Math.sin(phi) * slot.depth * scale;
  const y = viewport.height * HORIZON + slot.y * scale;
  const half = (CARD_BOX.width / 2) * scale;
  const visible = Math.abs(phi) < VISIBLE_HALF_ANGLE && x + half > 0 && x - half < viewport.width;
  return { x, y, scale, phi, visible, z: Math.round(2000 - Math.cos(phi) * slot.depth) };
}

/**
 * The CSS transform that puts a card's box on its projected centre.
 *
 * The one place the anchor is applied. The card is positioned at the field's
 * top left and moved by this, with its transform origin at its own centre.
 */
export function cardTransform(p: Projection, box: { width: number; height: number } = CARD_BOX): string {
  return `translate3d(${(p.x - box.width / 2).toFixed(1)}px, ${(p.y - box.height / 2).toFixed(1)}px, 0) scale(${p.scale.toFixed(3)})`;
}

/** The card's box on screen as it is drawn, from the same numbers `cardTransform` uses. */
export function cardRect(p: Projection, box: { width: number; height: number } = CARD_BOX): { left: number; top: number; right: number; bottom: number } {
  const w = box.width * p.scale;
  const h = box.height * p.scale;
  return { left: p.x - w / 2, top: p.y - h / 2, right: p.x + w / 2, bottom: p.y + h / 2 };
}

/**
 * The world angle a screen x falls at, for slots at this depth and yaw.
 *
 * The inverse of `project`'s x, found by halving: the forward function is
 * monotonic across the visible arc, and a closed form is not worth a second
 * copy of the perspective formula to keep in step.
 */
export function thetaAtScreenX(x: number, depth: number, yaw: number, viewport: Viewport): number {
  let lo = -VISIBLE_HALF_ANGLE - 10 * DEG;
  let hi = VISIBLE_HALF_ANGLE + 10 * DEG;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const px = project({ theta: yaw + mid, depth, y: 0 }, yaw, viewport).x;
    if (px < x) lo = mid;
    else hi = mid;
  }
  return norm(yaw + (lo + hi) / 2);
}

/**
 * The world angle where `edgeAt(theta)` crosses `x`, for a function that
 * rises across the visible arc. Found by halving.
 */
function crossing(x: number, yaw: number, edgeAt: (theta: number) => number): number {
  let lo = -VISIBLE_HALF_ANGLE - 10 * DEG;
  let hi = VISIBLE_HALF_ANGLE + 10 * DEG;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (edgeAt(yaw + mid) < x) lo = mid;
    else hi = mid;
  }
  return norm(yaw + (lo + hi) / 2);
}

/**
 * The obstacles a rectangle on the front plane makes, at this yaw.
 *
 * One sector per band depth, covering every angle at which a card's BOX
 * would touch the rectangle: from where a card's right edge reaches the
 * rectangle's left, to where its left edge reaches the rectangle's right,
 * each edge at the scale that card would be drawn at. The first version
 * widened the sector by half a card straight ahead, and a card off to the
 * side is drawn larger, so 8% of random placements left one up to 22 px
 * under the pane (ISS-0058).
 */
export function obstaclesFor(
  rect: { left: number; right: number },
  yaw: number,
  viewport: Viewport,
  shapes: BandShapes = shapesFor({ front: 0, mid: 0, outer: 0, deep: 0 }),
): Obstacle[] {
  const out: Obstacle[] = [];
  // The OUTER field is here too: TASK-0035 forbids a field card under a held
  // note, and an outer-field card is a field card. Leaving it out put cards
  // under panes at one depth and not the others, which is the defect ISS-0058
  // reported for the two bands that were here.
  for (const shape of [shapes.front, shapes.mid, shapes.outer]) {
    const depth = shape.depth;
    const half = shape.box.width / 2;
    const at = (theta: number): Projection => project({ theta, depth, y: 0 }, yaw, viewport);
    const from = crossing(rect.left, yaw, (theta) => {
      const p = at(theta);
      return p.x + half * p.scale;
    });
    const to = crossing(rect.right, yaw, (theta) => {
      const p = at(theta);
      return p.x - half * p.scale;
    });
    out.push({ from, to, nearest: depth, farthest: depth });
  }
  return out;
}

/**
 * The field's state between frames: the yaw, and how often it was dealt.
 *
 * The turn handler lives here so the rule "assignment never runs on a turn"
 * is a property of one small class that a test can drive, rather than of
 * whichever event listener the renderer happens to have.
 */
export class FieldModel<T> {
  yaw = 0;
  assignments = 0;
  private bands: Bands<T> = { front: [], mid: [], outer: [], deep: [] };
  private obstacles: Obstacle[] = [];
  private headingOf: (item: T) => string;
  current: Assignment<T> = { slots: new Map(), frontOverflow: 0, midOverflow: 0, outerOverflow: 0, sectors: [], shapes: shapesFor({ front: 0, mid: 0, outer: 0, deep: 0 }) };

  constructor(headingOf: (item: T) => string = () => '') {
    this.headingOf = headingOf;
  }

  /** A new deal: the view changed, a note was lifted, a hand moved a card. */
  deal(bands: Bands<T>, obstacles: Obstacle[] = this.obstacles): Assignment<T> {
    this.bands = bands;
    this.obstacles = obstacles;
    return this.assign();
  }

  /**
   * Positions decided elsewhere: the orbit's kept layout (TASK-0002). Counted
   * as a deal, because it is one, and still never run by a turn.
   */
  place(slots: Map<T, Slot>): Assignment<T> {
    this.assignments += 1;
    // Placed positions replace the bands: a later turnEnd must not deal an
    // old set of bands over them.
    this.bands = { front: [], mid: [], outer: [], deep: [] };
    this.current = { slots, frontOverflow: 0, midOverflow: 0, outerOverflow: 0, sectors: [], shapes: this.current.shapes };
    return this.current;
  }

  /** A pane moved, or the reading column opened. */
  setObstacles(obstacles: Obstacle[]): Assignment<T> {
    this.obstacles = obstacles;
    return this.assign();
  }

  /** Called for every pointer move of a turn. Changes the yaw and nothing else. */
  turn(by: number): void {
    this.yaw = norm(this.yaw + by);
  }

  face(yaw: number): void {
    this.yaw = norm(yaw);
  }

  /**
   * A turn is over. Obstacles are sectors of the cylinder and did not move,
   * but a pane is fixed to the SCREEN, so the sectors it covers did; the
   * caller passes the new ones and the field is dealt once.
   */
  turnEnd(obstacles: Obstacle[] | null = null): Assignment<T> | null {
    if (obstacles === null) return null;
    this.obstacles = obstacles;
    return this.assign();
  }

  private assign(): Assignment<T> {
    this.assignments += 1;
    this.current = assignSlots(this.bands, this.obstacles, this.headingOf, this.shapes ?? undefined);
    return this.current;
  }

  /**
   * The shapes every deal from here on uses, or null to derive them from what
   * each band holds.
   *
   * Held by the model rather than worked out per deal, because a shape that
   * moved with the count would re-lay the field when one note changed band
   * (ADR-0005, FEAT-0018 decision 5). The renderer sets this when the view or
   * the workspace changes and at no other time.
   */
  setShapes(shapes: BandShapes | null): void {
    this.shapes = shapes;
  }

  private shapes: BandShapes | null = null;
}

/** How many dealt notes are out of sight at this yaw: the compass's behind-count. */
export function behindCount<T>(slots: Map<T, Slot>, yaw: number, viewport: Viewport): number {
  let behind = 0;
  for (const slot of slots.values()) {
    if (!project(slot, yaw, viewport).visible) behind += 1;
  }
  return behind;
}
