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

export type BandName = 'front' | 'mid' | 'deep';

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

/** Every front slot, nearest the centre first. More than the band's capacity, so an obstacle eats a spare. */
export function frontSlots(): Slot[] {
  const out: Slot[] = [];
  const half = (FRONT.columns - 1) / 2;
  for (let column = 0; column < FRONT.columns; column += 1) {
    for (let row = 0; row < FRONT.rows; row += 1) {
      out.push({
        band: 'front',
        theta: (column - half) * FRONT.columnStep,
        depth: FRONT.depth,
        y: (row - (FRONT.rows - 1) / 2) * FRONT.rowStep,
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
export function midSlots(): Slot[] {
  const out: Slot[] = [];
  for (let step = 0; step < MID.columnsPerSide; step += 1) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < MID.rows; row += 1) {
        out.push({
          band: 'mid',
          theta: side * (MID.firstColumn + step * MID.columnStep),
          depth: MID.depth,
          y: (row - (MID.rows - 1) / 2) * MID.rowStep,
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
export function quietSlot(index: number): Slot {
  const perLayer = QUIET.columns * QUIET.rows;
  const layer = Math.floor(index / perLayer);
  const within = index % perLayer;
  const row = Math.floor(within / QUIET.columns);
  const column = within % QUIET.columns;
  const step = QUIET.span / (QUIET.columns - 1);
  return {
    band: 'deep',
    theta: norm(Math.PI + (column - (QUIET.columns - 1) / 2) * step),
    depth: QUIET.depth + layer * QUIET.layerStep,
    y: (row - (QUIET.rows - 1) / 2) * QUIET.rowStep,
    row,
    column,
    layer,
  };
}

export interface Bands<T> {
  front: T[];
  mid: T[];
  deep: T[];
}

export interface Assignment<T> {
  slots: Map<T, Slot>;
  /** Front notes with no free slot, because an obstacle took it. Counted, never demoted. */
  frontOverflow: number;
  /** Mid notes with no free slot. Counted, never sent behind. */
  midOverflow: number;
  /** Where each heading's first slot is, so the renderer can label a sector. */
  sectors: Array<{ key: string; slot: Slot; count: number }>;
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
): Assignment<T> {
  const slots = new Map<T, Slot>();
  const front = frontSlots().filter((s) => !blocked(s, obstacles));
  let frontOverflow = 0;
  bands.front.forEach((item, i) => {
    const slot = front[i];
    if (slot === undefined) frontOverflow += 1;
    else slots.set(item, slot);
  });

  const mid = midSlots().filter((s) => !blocked(s, obstacles));
  const sectors: Array<{ key: string; slot: Slot; count: number }> = [];
  let midOverflow = 0;
  let at = 0;
  let index = 0;
  while (index < bands.mid.length) {
    const heading = headingOf(bands.mid[index] as T);
    let end = index;
    while (end < bands.mid.length && headingOf(bands.mid[end] as T) === heading) end += 1;
    const size = end - index;
    if (size >= 3 && at % MID.rows !== 0) at += MID.rows - (at % MID.rows);
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

  bands.deep.forEach((item, i) => slots.set(item, quietSlot(i)));
  return { slots, frontOverflow, midOverflow, sectors };
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
 * The obstacles a rectangle on the front plane makes, at this yaw.
 *
 * One sector per band depth, widened by half a card so a card is not dealt
 * with its edge under the pane. Recomputed when the pane moves and when a
 * turn ends, which is when assignment runs again.
 */
export function obstaclesFor(rect: { left: number; right: number }, yaw: number, viewport: Viewport): Obstacle[] {
  const out: Obstacle[] = [];
  for (const depth of [FRONT.depth, MID.depth]) {
    const scale = PERSPECTIVE / (PERSPECTIVE + depth);
    const pad = (CARD_BOX.width / 2) * scale;
    const from = thetaAtScreenX(rect.left - pad, depth, yaw, viewport);
    const to = thetaAtScreenX(rect.right + pad, depth, yaw, viewport);
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
  private bands: Bands<T> = { front: [], mid: [], deep: [] };
  private obstacles: Obstacle[] = [];
  private headingOf: (item: T) => string;
  current: Assignment<T> = { slots: new Map(), frontOverflow: 0, midOverflow: 0, sectors: [] };

  constructor(headingOf: (item: T) => string = () => '') {
    this.headingOf = headingOf;
  }

  /** A new deal: the view changed, a note was lifted, a hand moved a card. */
  deal(bands: Bands<T>, obstacles: Obstacle[] = this.obstacles): Assignment<T> {
    this.bands = bands;
    this.obstacles = obstacles;
    return this.assign();
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
    this.current = assignSlots(this.bands, this.obstacles, this.headingOf);
    return this.current;
  }
}

/** How many dealt notes are out of sight at this yaw: the compass's behind-count. */
export function behindCount<T>(slots: Map<T, Slot>, yaw: number, viewport: Viewport): number {
  let behind = 0;
  for (const slot of slots.values()) {
    if (!project(slot, yaw, viewport).visible) behind += 1;
  }
  return behind;
}
