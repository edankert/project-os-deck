/**
 * The towers on the ring: where everything on the wheel (S1) and a phase brought
 * close (S2) stands, as one pure function of the model (TASK-0166).
 *
 * Edwin chose this on 2026-10-16 from DES-0005's towers page ("go with towers,
 * group by phase") and asked for it to be built as suggested. Each phase still
 * to finish is a raised segment of a ring; each feature in it stands as a tower,
 * one floor per two of its tickets, done at the bottom and what needs you on top;
 * tickets with no feature lie flat at the front of their segment; finished
 * phases stand outside the ring as blocks; the core holds the tickets with no
 * phase. The phase's exit criteria are a collar of cells round its rim, lit when
 * met (TASK-0164). The phase in focus is highest and brightest, the feature in
 * focus sends up a beam, and the next ticket is marked.
 *
 * World units, y up. The renderer draws this in 3D with three.js (TASK-0167);
 * `towersPlan` draws the same layout flat, as the scene's SVG, so the screen
 * checks, the list twin and the plates read exactly what the 3D view draws.
 */
import { shortName } from './overview-geometry.js';
import { cockpitSquare, markWords } from './overview-marks.js';
import type { ListRow, MarkNode, SceneNode, ScreenContext } from './overview-scene.js';
import type { Fill, Focus, NoteType, OverviewModel, Phase, State, Ticket } from './overview-types.js';

/** Sizes, in world units. A floor holds two tickets side by side, facing out. */
export const TOWER_SIZE = {
  cube: 1.25,
  gap: 0.2,
  perFloor: 2,
  floor: 1.39,
  tileStep: 1.2,
  segGap: 0.035,
  plinth: { planned: 0.5, active: 1.6, focus: 2.6 },
} as const;
const { cube: CUBE, gap: GAP, perFloor: PER_FLOOR, floor: FLOOR, tileStep: TILE_STEP } = TOWER_SIZE;
const TOWER = PER_FLOOR * CUBE + GAP; // a tower's width along the ring
const TOWER_DEPTH = CUBE; // and its depth across it
const TOWER_STEP = TOWER + 1.4;
const TOWER_ROW = TOWER_DEPTH + 2.4;

export type Level = 'planned' | 'active' | 'focus';

/** One ticket's cube: where it stands, how big, which way it faces, and how it is painted. */
export interface Cube {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Size along the radius, up, and along the ring. */
  sx: number;
  sy: number;
  sz: number;
  /** The direction from the middle, in radians; the cube faces along it. */
  angle: number;
  type: NoteType;
  fill: Fill;
  state: State;
  needsYou: boolean;
  /** The callout: the cockpit's words, and what to do when it needs you. */
  label: string;
  target: string;
  /** A task of the feature in focus at `doing`: it pulses. */
  pulse?: boolean;
  /** On the shelf of finished phases: drawn dimmer. */
  dim?: boolean;
}

export interface Tower {
  feature: string;
  x: number;
  z: number;
  angle: number;
  /** The height of the top floor's roof above the ground. */
  top: number;
  /** The feature's foot first, then its floors from the bottom. */
  cubes: Cube[];
  /** A red cap when something in the tower needs you: what, where pressing it goes, and its callout. */
  cap: { ids: string[]; target: string; label: string } | null;
  focus: boolean;
  label: string;
}

export interface ExitCell {
  text: string;
  ticked: boolean;
  a0: number;
  a1: number;
}

export interface RingPhase {
  id: string;
  number: string;
  name: string;
  /** Its name without the "Phase 25:" its number already says. */
  short: string;
  status: string;
  level: Level;
  a0: number;
  a1: number;
  mid: number;
  /** The plinth's height. */
  h: number;
  tallest: number;
  done: number;
  total: number;
  needs: number;
  label: string;
  target: string;
  exit: { cells: ExitCell[]; prose: boolean };
  towers: Tower[];
  tiles: Cube[];
}

export interface ShelfPhase {
  id: string;
  number: string;
  name: string;
  x: number;
  z: number;
  angle: number;
  cubes: Cube[];
  label: string;
  target: string;
}

export interface TowersLayout {
  workspace: string;
  /** The ring runs from R0 to R1; the collar from collar[0] to collar[1]; the shelf at shelfR. */
  R0: number;
  R1: number;
  collar: [number, number];
  coreR: number;
  shelfR: number;
  phases: RingPhase[];
  shelf: ShelfPhase[];
  core: Cube[];
  /** The core's middle opens re-phasing, with how many tickets have no phase (TASK-0152). */
  coreTarget: string;
  coreLabel: string;
  unplaced: number;
  focus: Focus | null;
  next: string | null;
  /** The phase brought close (S2), or null for the whole ring (S1). */
  open: string | null;
  colouring: 'type' | 'state';
}

const byNumber = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });

/** A phase's name without the "Phase 25:" its number already says. */
export function shortPhaseName(name: string): string {
  return name.replace(/^phase\s*\d+\s*[:\-–]\s*/i, '').trim() || name;
}

/** Floors from the bottom: done, resolved, in progress, owed, failed, open; what needs you on top. */
const RANK: Readonly<Record<State, number>> = { closed: 0, dropped: 1, progress: 2, owed: 3, failed: 4, open: 5 };
const floorRank = (t: Ticket): number => (t.needsYou ? 6 : RANK[t.state]);

/** Where a phase's flat tiles and towers stand in its segment, or null when they do not fit. */
function layoutSegment(tiles: number, towerHeights: number[], a0: number, a1: number, R0: number, R1: number, force: boolean): { tiles: Array<{ r: number; a: number }>; towers: Array<{ r: number; a: number }> } | null {
  const out: Array<{ r: number; a: number }> = [];
  const mid = (a0 + a1) / 2;
  let r = R1 - 1.1;
  while (out.length < tiles) {
    const count = Math.floor(((a1 - a0) * r - 1.2) / TILE_STEP);
    if ((count < 1 || r < R0 + 2) && !force) return null;
    const take = Math.max(1, Math.min(count, tiles - out.length));
    for (let j = 0; j < take; j += 1) out.push({ r, a: mid + ((j - (take - 1) / 2) * TILE_STEP) / r });
    r -= TILE_STEP;
  }
  // The shortest towers in front, so the tall ones behind are not hidden.
  const order = towerHeights.map((h, i) => ({ h, i })).sort((x, y) => x.h - y.h || x.i - y.i);
  const towers: Array<{ r: number; a: number }> = new Array(towerHeights.length);
  let rr = (tiles > 0 ? r + TILE_STEP / 2 : R1) - TOWER_DEPTH / 2 - 1.6;
  let k = 0;
  while (k < order.length) {
    const count = Math.floor(((a1 - a0) * rr - 1.0) / TOWER_STEP);
    if ((count < 1 || rr - TOWER_DEPTH / 2 < R0 + 0.8) && !force) return null;
    const take = Math.max(1, Math.min(count, order.length - k));
    for (let j = 0; j < take; j += 1) towers[order[k + j]!.i] = { r: rr, a: mid + ((j - (take - 1) / 2) * TOWER_STEP) / rr };
    k += take;
    rr -= TOWER_ROW;
  }
  return { tiles: out, towers };
}

const polar = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];

export function towersLayout(model: OverviewModel, ctx: ScreenContext, open: string | null = null): TowersLayout {
  const tickets = model.tickets;
  const focus = model.focus ?? null;
  const ring: Phase[] = [...model.phases, ...model.backlog];
  const ringIds = new Set(ring.map((p) => p.id));
  const shelfIds = new Set(model.shelf.map((p) => p.id));
  const ticketTarget = (id: string): string => ctx.address({ page: 'ticket', note: id });
  const phaseTarget = (id: string): string => ctx.address({ page: 'phase', note: id });
  const paint = (t: Ticket): Pick<Cube, 'type' | 'fill' | 'state' | 'needsYou'> => ({ type: t.type, fill: t.fill, state: t.state, needsYou: t.needsYou });

  // Who stands where: a feature of a ring phase is a tower; every ticket of that
  // feature joins it wherever it is filed, so each ticket is drawn exactly once.
  const towerOf = new Map<string, { foot: Ticket; floors: Ticket[] }>();
  const tilesOf = new Map<string, Ticket[]>(ring.map((p) => [p.id, []]));
  const shelfOf = new Map<string, Ticket[]>(model.shelf.map((p) => [p.id, []]));
  const coreTickets: Ticket[] = [];
  const all = Object.values(tickets).sort((a, b) => byNumber(a.id, b.id));
  for (const t of all) if (t.kind === 'feat' && t.phase !== null && ringIds.has(t.phase)) towerOf.set(t.id, { foot: t, floors: [] });
  for (const t of all) {
    if (towerOf.has(t.id)) continue;
    const tower = t.feature !== undefined ? towerOf.get(t.feature) : undefined;
    if (tower !== undefined) tower.floors.push(t);
    else if (t.phase !== null && ringIds.has(t.phase)) tilesOf.get(t.phase)!.push(t);
    else if (t.phase !== null && shelfIds.has(t.phase)) shelfOf.get(t.phase)!.push(t);
    else coreTickets.push(t);
  }
  for (const tower of towerOf.values()) tower.floors.sort((a, b) => floorRank(a) - floorRank(b) || byNumber(a.id, b.id));
  const towersIn = (phaseId: string): Array<{ foot: Ticket; floors: Ticket[] }> => [...towerOf.values()].filter((t) => t.foot.phase === phaseId);
  // Flat tiles: what needs you at the front edge, then open work, done work behind.
  for (const tiles of tilesOf.values()) tiles.sort((a, b) => floorRank(b) - floorRank(a) || byNumber(a.id, b.id));

  // The ring's size: each phase's share grows with what it holds; the rim moves out until all fit.
  const coreR = Math.max(10, Math.sqrt(coreTickets.length) * 0.75 * TILE_STEP + 4);
  const R0 = coreR + 5;
  const n = ring.length;
  const weight = ring.map((p) => 3 + Math.sqrt(tilesOf.get(p.id)!.length + towersIn(p.id).reduce((m, t) => m + 4 + t.floors.length, 0)));
  const total = weight.reduce((a, b) => a + b, 0);
  const angles: Array<[number, number]> = [];
  let at = -Math.PI / 2;
  for (const w of weight) {
    const s = total > 0 ? (w / total) * (Math.PI * 2 - TOWER_SIZE.segGap * n) : 0;
    angles.push([at, at + s]);
    at += s + TOWER_SIZE.segGap;
  }
  const heights = (p: Phase): number[] => towersIn(p.id).map((t) => Math.ceil(t.floors.length / PER_FLOOR));
  // The rim moves out, two units at a time, until every segment fits; a ring that never fits
  // draws its crowded segments past their inner edge rather than not at all (the `force` below).
  const fits = (r1: number): boolean => ring.every((p, i) => layoutSegment(tilesOf.get(p.id)!.length, heights(p), angles[i]![0], angles[i]![1], R0, r1, false) !== null);
  let R1 = R0 + 14;
  while (R1 < R0 + 260 && !fits(R1)) R1 += 2;
  const collar: [number, number] = [R1 + 0.5, R1 + 2.7];

  const cube = (t: Ticket, x: number, y: number, z: number, size: [number, number, number], angle: number, extra: Partial<Cube> = {}): Cube => ({
    id: t.id, x, y, z, sx: size[0], sy: size[1], sz: size[2], angle, ...paint(t), label: markWords(t), target: ticketTarget(t.id), ...extra,
  });

  const phases: RingPhase[] = ring.map((p, i) => {
    const [a0, a1] = angles[i]!;
    const mid = (a0 + a1) / 2;
    const isFocus = focus?.phase === p.id;
    const level: Level = isFocus ? 'focus' : ['active', 'doing'].includes(p.status) ? 'active' : 'planned';
    const h = TOWER_SIZE.plinth[level];
    const layout = layoutSegment(tilesOf.get(p.id)!.length, heights(p), a0, a1, R0, R1, true)!;
    const tiles = tilesOf.get(p.id)!.map((t, k) => {
      const { r, a } = layout.tiles[k]!;
      const [x, z] = polar(r, a);
      return cube(t, x, h + 0.17, z, [0.95, 0.3, 0.95], a);
    });
    let tallest = 0;
    const towers: Tower[] = towersIn(p.id).map((tw, k) => {
      const { r, a } = layout.towers[k]!;
      const [x, z] = polar(r, a);
      const tangent: [number, number] = [-Math.sin(a), Math.cos(a)];
      const isFocusFeature = focus?.feature === tw.foot.id;
      const cubes: Cube[] = [cube(tw.foot, x, h + 0.3, z, [TOWER_DEPTH + 0.6, 0.6, TOWER + 0.6], a)];
      tw.floors.forEach((t, j) => {
        const v = ((j % PER_FLOOR) - (PER_FLOOR - 1) / 2) * (CUBE + GAP);
        const y = h + 0.6 + FLOOR * Math.floor(j / PER_FLOOR) + CUBE / 2 + 0.07;
        cubes.push(cube(t, x + tangent[0] * v, y, z + tangent[1] * v, [CUBE, CUBE, CUBE], a, isFocusFeature && t.status === 'doing' ? { pulse: true } : {}));
      });
      const top = h + 0.6 + FLOOR * Math.ceil(tw.floors.length / PER_FLOOR);
      tallest = Math.max(tallest, top - h);
      const asking = [tw.foot, ...tw.floors].filter((t) => t.needsYou);
      const cap = asking.length === 0 ? null : {
        ids: asking.map((t) => t.id),
        // One ticket: its own screen, where the banner says what to do. Several: the phase,
        // whose list puts what needs you first.
        target: asking.length === 1 ? ticketTarget(asking[0]!.id) : phaseTarget(p.id),
        label: `${asking.length} ${asking.length === 1 ? 'ticket needs' : 'tickets need'} you in ${tw.foot.id}: ${asking.map((t) => `${t.id}, ${t.needs?.say ?? 'needs you'}`).join('; ')}`,
      };
      const closed = [tw.foot, ...tw.floors].filter((t) => t.state === 'closed').length;
      return { feature: tw.foot.id, x, z, angle: a, top, cubes, cap, focus: isFocusFeature, label: `${tw.foot.id} ${tw.foot.title}: ${closed} of ${tw.floors.length + 1} done${isFocusFeature ? ', in focus' : ''}` };
    });
    const everyone = [...tilesOf.get(p.id)!, ...towersIn(p.id).flatMap((t) => [t.foot, ...t.floors])];
    const done = everyone.filter((t) => t.state === 'closed').length;
    const needs = everyone.filter((t) => t.needsYou).length;
    const items = p.exit.items;
    const gap = items.length > 0 ? Math.min(0.02, ((a1 - a0) / items.length) * 0.12) : 0;
    const span = items.length > 0 ? ((a1 - a0) - gap * (items.length + 1)) / items.length : 0;
    const cells: ExitCell[] = items.map((c, k) => ({ text: c.text, ticked: c.ticked, a0: a0 + gap + k * (span + gap), a1: a0 + gap + k * (span + gap) + span }));
    const met = items.filter((c) => c.ticked).length;
    const short = shortPhaseName(p.name);
    return {
      id: p.id, number: p.number, name: p.name, short, status: p.status, level, a0, a1, mid, h, tallest, done, total: everyone.length, needs,
      label: `${p.number} ${short} (${p.status}${isFocus ? ', in focus' : ''}): ${done} of ${everyone.length} done${needs > 0 ? `, ${needs} need you` : ''}; ${towers.length} features${items.length > 0 ? `; exit criteria ${met} of ${items.length} met` : ''}`,
      target: phaseTarget(p.id),
      exit: { cells, prose: p.exit.prose },
      towers,
      tiles,
    };
  });

  // Finished phases stand outside the ring as solid blocks of their tickets, five by five a layer.
  const shelfR = R1 + 26;
  const shelf: ShelfPhase[] = model.shelf.map((p, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / Math.max(1, model.shelf.length)) * Math.PI * 2;
    const [x, z] = polar(shelfR, a);
    const radial: [number, number] = [Math.cos(a), Math.sin(a)];
    const tangent: [number, number] = [-Math.sin(a), Math.cos(a)];
    const cubes = shelfOf.get(p.id)!.map((t, j) => {
      const cell = j % 25;
      const u = ((cell % 5) - 2) * 0.62;
      const v = (Math.floor(cell / 5) - 2) * 0.62;
      return cube(t, x + radial[0] * u + tangent[0] * v, 0.3 + Math.floor(j / 25) * 0.62, z + radial[1] * u + tangent[1] * v, [0.55, 0.55, 0.55], a, { dim: true });
    });
    return { id: p.id, number: p.number, name: p.name, x, z, angle: a, cubes, label: `${p.number} ${shortPhaseName(p.name)} (finished): ${cubes.length} tickets`, target: phaseTarget(p.id) };
  });

  // The core: the tickets with no phase, as tiles round its middle.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const core = coreTickets.map((t, k) => {
    const r = TILE_STEP * 0.75 * Math.sqrt(k + 0.5) + 3.2;
    const a = k * golden;
    const [x, z] = polar(r, a);
    return cube(t, x, 0.75, z, [0.95, 0.3, 0.95], a);
  });

  const unplaced = coreTickets.filter((t) => t.placedBy !== 'project-wide').length;
  return {
    workspace: model.workspace, R0, R1, collar, coreR, shelfR, phases, shelf, core,
    coreTarget: ctx.address({ page: 'rephase' }), coreLabel: `${unplaced} ticket${unplaced === 1 ? '' : 's'} with no phase: open re-phasing to place them`, unplaced,
    focus, next: model.next ?? null, open: open !== null && ringIds.has(open) ? open : null,
    colouring: ctx.colouring === 'state' ? 'state' : 'type',
  };
}

/** Every cube of a layout, wherever it stands. */
export function* cubesOf(layout: TowersLayout): Generator<Cube> {
  for (const p of layout.phases) {
    yield* p.tiles;
    for (const t of p.towers) yield* t.cubes;
  }
  for (const s of layout.shelf) yield* s.cubes;
  yield* layout.core;
}

/** The flat picture's frame: where the plan is drawn, in the scene's pixels. */
export const TOWERS_PLAN = { width: 1440, height: 1000 } as const;

/**
 * The layout drawn flat, as seen from where the 3D camera starts: the phase in
 * focus at the front, the ground foreshortened, the towers standing up, back to
 * front so nearer marks cover farther ones (TASK-0166). It is the scene's SVG:
 * what the screen checks, the list twin and the plates read, and what Deck shows
 * when WebGL cannot start. Every ticket is one mark carrying its id.
 */
export interface PlanOptions {
  /** Draw only this phase's segment, brought close and fitted into `box` (S2). */
  only?: string;
  box?: { x: number; y: number; w: number; h: number };
  /**
   * Whether ticket marks carry their ids. False on S2, where the tickets are the
   * panel's rows: a ticket is one thing a screen draws, so the cubes there are pictures.
   */
  tickets?: boolean;
}

export function towersPlan(layout: TowersLayout, options: PlanOptions = {}): { nodes: SceneNode[]; rows: ListRow[]; centre: { x: number; y: number; r: number } } {
  const only = options.only !== undefined ? layout.phases.find((p) => p.id === options.only) : undefined;
  const withTickets = options.tickets !== false;
  const focusPhase = only ?? layout.phases.find((p) => p.level === 'focus') ?? layout.phases[0];
  const rot = Math.PI / 2 - (focusPhase?.mid ?? -Math.PI / 2);
  const ground = 0.56;
  const up = 0.83;
  const turn = (x: number, z: number): [number, number] => [x * Math.cos(rot) - z * Math.sin(rot), x * Math.sin(rot) + z * Math.cos(rot)];
  let k: number;
  let cx: number;
  let cy: number;
  if (only !== undefined) {
    // Fit the segment, its collar and its tallest tower into the box.
    const box = options.box ?? { x: 40, y: 150, w: 680, h: 800 };
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 16; i += 1) {
      const a = only.a0 + ((only.a1 - only.a0) * i) / 16;
      for (const r of [layout.R0, layout.collar[1]]) { const [tx, tz] = turn(r * Math.cos(a), r * Math.sin(a)); pts.push([tx, tz, 0]); }
    }
    for (const tw of only.towers) { const [tx, tz] = turn(tw.x, tw.z); pts.push([tx, tz, tw.top + 4]); }
    const xs = pts.map((p) => p[0]);
    const ys0 = pts.map((p) => p[1] * ground - p[2] * up);
    const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const h = Math.max(1, Math.max(...ys0) - Math.min(...ys0));
    k = Math.min(box.w / w, box.h / h) * 0.94;
    cx = box.x + box.w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * k;
    cy = box.y + box.h / 2 - ((Math.max(...ys0) + Math.min(...ys0)) / 2) * k;
  } else {
    const maxR = layout.shelf.length > 0 ? layout.shelfR + 4 : layout.collar[1] + 10;
    const maxTop = Math.max(4, ...layout.phases.flatMap((p) => p.towers.map((t) => t.top)));
    k = Math.min(1360 / (2 * maxR), 820 / (2 * maxR * ground + maxTop * up));
    cx = TOWERS_PLAN.width / 2;
    cy = 110 + maxTop * k * up + maxR * k * ground;
  }
  const at = (x: number, y: number, z: number): [number, number, number] => {
    const [tx, tz] = turn(x, z);
    return [cx + tx * k, cy + tz * k * ground - y * k * up, tz];
  };
  const ring = (r0: number, r1: number, a0: number, a1: number, y: number): string => {
    const steps = Math.max(4, Math.ceil((a1 - a0) * 24));
    const pts: string[] = [];
    for (let i = 0; i <= steps; i += 1) { const a = a0 + ((a1 - a0) * i) / steps; const [px, py] = at(r1 * Math.cos(a), y, r1 * Math.sin(a)); pts.push(`${px.toFixed(1)},${py.toFixed(1)}`); }
    for (let i = steps; i >= 0; i -= 1) { const a = a0 + ((a1 - a0) * i) / steps; const [px, py] = at(r0 * Math.cos(a), y, r0 * Math.sin(a)); pts.push(`${px.toFixed(1)},${py.toFixed(1)}`); }
    return pts.join(' ');
  };
  const depthOf = (x: number, z: number): number => turn(x, z)[1];
  const items: Array<{ depth: number; y: number; node: SceneNode }> = [];
  const rows: ListRow[] = [];
  const square = (c: Cube): SceneNode => {
    const [px, py] = at(c.x, c.y, c.z);
    const size = Math.max(2.2, Math.min(c.sz, c.sx) * k * 0.9);
    if (layout.colouring === 'state') {
      return { kind: 'mark', tag: 'rect', attrs: { x: px - size / 2, y: py - size / 2, width: size, height: size, rx: size * 0.2 }, state: c.state, ...(withTickets ? { ticket: c.id } : {}), label: c.label, ...(c.needsYou ? { glow: true } : {}) } satisfies MarkNode;
    }
    const sq = cockpitSquare({ id: c.id, type: c.type, fill: c.fill, needsYou: c.needsYou }, px, py, size, { label: c.label, ticket: withTickets });
    return c.needsYou ? { kind: 'group', cls: 'glow', children: [sq] } : sq;
  };
  const addCube = (c: Cube, group: string): void => {
    items.push({ depth: depthOf(c.x, c.z), y: c.y, node: square(c) });
    if (withTickets) rows.push({ id: c.id, label: c.label, group, state: c.state, target: c.target });
  };

  for (const p of only !== undefined ? [only] : layout.phases) {
    const where = `${p.number} ${p.short}`;
    items.push({ depth: -1e6, y: 0, node: { kind: 'mark', tag: 'polygon', attrs: { points: ring(layout.R0, layout.R1, p.a0, p.a1, p.h) }, cls: `ov-plinth lv-${p.level}`, markId: `phase-${p.id}`, target: p.target, label: p.label } });
    p.exit.cells.forEach((cell, i) => items.push({ depth: -1e6 + 1, y: 0, node: { kind: 'mark', tag: 'polygon', attrs: { points: ring(layout.collar[0], layout.collar[1], cell.a0, cell.a1, p.h + (cell.ticked ? 0.45 : 0.15)) }, cls: cell.ticked ? 'ov-exit ov-exit-met' : 'ov-exit', markId: `exit-${p.id}-${i}`, label: `${p.id} exit criterion ${i + 1} of ${p.exit.cells.length}, ${cell.ticked ? 'met' : 'not yet met'}: ${cell.text}` } }));
    rows.push({ id: p.id, label: p.label, group: 'Phases', target: p.target });
    for (const c of p.tiles) addCube(c, where);
    for (const tower of p.towers) {
      for (const c of tower.cubes) addCube(c, where);
      if (tower.cap !== null) {
        const [px, py] = at(tower.x, tower.top + 0.3, tower.z);
        const w = TOWER * k * 0.9;
        items.push({ depth: depthOf(tower.x, tower.z), y: tower.top + 1, node: { kind: 'mark', tag: 'rect', attrs: { x: px - w / 2, y: py - 2, width: w, height: 4, rx: 1 }, cls: 'ov-cap', markId: `cap-${tower.feature}`, target: tower.cap.target, label: tower.cap.label } });
        rows.push({ id: `cap-${tower.feature}`, label: tower.cap.label, group: 'Needs you', target: tower.cap.target });
      }
      if (tower.focus) {
        const [px, py] = at(tower.x, tower.top + 3.2, tower.z);
        items.push({ depth: 1e6, y: 0, node: { kind: 'text', x: px, y: py, text: 'in focus', rest: true, role: 'label', size: 12, anchor: 'middle', cls: 'ov-focus-tag' } });
      }
    }
    // Its number and name outside the rim, and a red count of what needs you; brought
    // close, the screen's heading names it instead.
    if (only !== undefined) continue;
    const [nx, ny] = at((layout.collar[1] + 6) * Math.cos(p.mid), p.h + 3, (layout.collar[1] + 6) * Math.sin(p.mid));
    items.push({ depth: 1e6, y: 0, node: { kind: 'text', x: nx, y: ny, text: `${p.level === 'focus' ? '▶ ' : ''}${p.number} ${p.level === 'focus' ? p.short : shortName(p.short, 3)}`, rest: true, role: 'name', size: p.level === 'focus' ? 20 : p.level === 'active' ? 16 : 13, anchor: 'middle', cls: `ov-phase-name lv-${p.level}` } });
    if (p.needs > 0) {
      items.push({ depth: 1e6, y: 0, node: { kind: 'group', cls: 'glow', children: [
        { kind: 'mark', tag: 'circle', attrs: { cx: nx - 10, cy: ny + 14, r: 5 }, cls: 'sq-dot', markId: `needs-${p.id}`, count: p.needs, label: `${p.needs} need you in ${p.id}` },
        { kind: 'text', x: nx, y: ny + 19, text: String(p.needs), rest: true, role: 'number', markRef: `needs-${p.id}`, size: 13, anchor: 'start', cls: 'ov-needs-count' },
      ] } });
    }
  }
  for (const s of only !== undefined ? [] : layout.shelf) {
    const [px, py] = at(s.x, 0, s.z);
    items.push({ depth: depthOf(s.x, s.z) - 0.5, y: 0, node: { kind: 'mark', tag: 'ellipse', attrs: { cx: px, cy: py, rx: 3.4 * k, ry: 3.4 * k * ground }, cls: 'ov-shelf', markId: `phase-${s.id}`, target: s.target, label: s.label } });
    items.push({ depth: 1e6, y: 0, node: { kind: 'text', x: px, y: py + 3.4 * k * ground + 12, text: s.number, rest: true, role: 'id', size: 10, anchor: 'middle', cls: 'ov-dim' } });
    rows.push({ id: s.id, label: s.label, group: 'Phases', target: s.target });
    for (const c of s.cubes) addCube(c, `${s.number} ${shortPhaseName(s.name)} (finished)`);
  }
  if (only === undefined) for (const c of layout.core) addCube(c, 'No phase');
  if (layout.next !== null) {
    const c = [...cubesOf(layout)].find((x) => x.id === layout.next);
    const shown = c !== undefined && (only === undefined || only.towers.some((t) => t.cubes.includes(c)) || only.tiles.includes(c));
    if (c !== undefined && shown) {
      const [px, py] = at(c.x, c.y + 3.4, c.z);
      items.push({ depth: 1e6, y: 0, node: { kind: 'text', x: px, y: py, text: `next ${c.id}`, rest: true, role: 'label', size: 12, anchor: 'middle', cls: 'ov-next-tag' } });
    }
  }
  items.sort((a, b) => a.depth - b.depth || a.y - b.y);
  // Where the core's middle is drawn, for the way into re-phasing that stands on it.
  const [ox, oy] = at(0, 0.8, 0);
  return { nodes: [{ kind: 'group', key: 'plan', cls: 'ov-plan', children: items.map((i) => i.node) }], rows, centre: { x: ox, y: oy, r: Math.max(26, Math.min(48, (layout.coreR - 6) * k)) } };
}
