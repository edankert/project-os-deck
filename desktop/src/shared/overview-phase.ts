/**
 * S2, a phase: what it still owes and what kind of work it is (PHASE-0005,
 * FEAT-0028).
 *
 * Left, the phase's web: one corner per ticket kind, the defined count in
 * amber and the closed count in green, on one square-root scale shared by
 * every phase of the workspace, so a bigger phase draws a bigger web. Around
 * it, the exit criteria as a ring of segments, lit when ticked. Right, the
 * phase's tickets as glyphs in a field with depth: what needs a person in
 * front, large and glowing; what is in progress or open in the middle;
 * what is closed far back as dust. A glyph's shape is its kind.
 */
import { backControl, bezel, frame, heading } from './overview-chrome.js';
import { arc, glyph, gridFit, polar, polygon, TAU } from './overview-geometry.js';
import type { ListRow, MarkNode, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import {
  allPhases,
  KIND_WORD,
  PHASE_KINDS,
  STATE_WORD,
  type Kind,
  type OverviewModel,
  type Phase,
  type State,
  type Ticket,
} from './overview-types.js';
import { closedOf, needsPerson, phaseLabel, ticketLabel } from './overview-wheel.js';

export const PHASE_SCREEN = { width: 1440, height: 1000, webX: 380, webY: 520, webR: 230 } as const;

const INITIAL: Record<string, string> = { req: 'Req', feat: 'Feat', task: 'Task', test: 'Test', iss: 'Iss' };

/** Which band a ticket stands in: 0 front, 1 middle, 2 far. */
export function bandOf(state: State): 0 | 1 | 2 {
  if (state === 'failed' || state === 'owed') return 0;
  if (state === 'progress' || state === 'open') return 1;
  return 2;
}

function kindCounts(model: OverviewModel, phase: Phase): Record<string, { live: number; closed: number }> {
  const out: Record<string, { live: number; closed: number }> = {};
  for (const kind of PHASE_KINDS) out[kind] = { live: 0, closed: 0 };
  for (const id of phase.tickets) {
    const t = model.tickets[id];
    if (t === undefined || t.state === 'dropped' || out[t.kind] === undefined) continue;
    out[t.kind]!.live += 1;
    if (t.state === 'closed') out[t.kind]!.closed += 1;
  }
  return out;
}

/** The largest count of one kind in any phase, so every web shares a scale. */
function webScale(model: OverviewModel): number {
  let max = 1;
  for (const phase of allPhases(model)) {
    for (const c of Object.values(kindCounts(model, phase))) max = Math.max(max, c.live);
  }
  return Math.sqrt(max);
}

function webNodes(model: OverviewModel, phase: Phase): SceneNode[] {
  const { webX: cx, webY: cy, webR: R } = PHASE_SCREEN;
  const counts = kindCounts(model, phase);
  const scale = webScale(model);
  const n = PHASE_KINDS.length;
  const nodes: SceneNode[] = [];
  // Rings of the scale, faint, so a web's size can be read against them.
  for (const f of [0.25, 0.5, 0.75, 1]) {
    nodes.push({ kind: 'mark', tag: 'polygon', attrs: { points: polygon(cx, cy, R * f, n) }, cls: 'ov-track' });
  }
  const point = (i: number, v: number): [number, number] => polar(cx, cy, (R * Math.sqrt(v)) / scale, (i * TAU) / n);
  const pts = (key: 'live' | 'closed'): string =>
    PHASE_KINDS.map((k, i) => point(i, counts[k]![key]).map((v) => Math.round(v * 10) / 10).join(',')).join(' ');
  PHASE_KINDS.forEach((kind, i) => {
    const [x, y] = polar(cx, cy, R, (i * TAU) / n);
    nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: cx, y1: cy, x2: x, y2: y }, cls: 'ov-wire' });
    const [lx, ly] = polar(cx, cy, R + 22, (i * TAU) / n);
    nodes.push({ kind: 'text', x: lx, y: ly + 4, text: INITIAL[kind]!, rest: true, role: 'label', size: 12, anchor: 'middle', cls: 'ov-dim' });
  });
  nodes.push({ kind: 'mark', tag: 'polygon', attrs: { points: pts('live'), 'fill-opacity': 0.28, stroke: 'hsl(38 96% 58%)', 'stroke-width': 1.5 }, state: 'open', label: 'Defined, by kind' });
  nodes.push({ kind: 'mark', tag: 'polygon', attrs: { points: pts('closed'), 'fill-opacity': 0.55, stroke: 'hsl(160 62% 46%)', 'stroke-width': 1.5 }, state: 'closed', cls: 'glow', label: 'Closed, by kind' });
  PHASE_KINDS.forEach((kind, i) => {
    const c = counts[kind]!;
    const [x, y] = point(i, c.live);
    nodes.push({
      kind: 'mark',
      tag: 'circle',
      attrs: { cx: x, cy: y, r: 5 },
      state: c.live > 0 && c.closed === c.live ? 'closed' : 'open',
      markId: `web-${kind}`,
      count: c.live,
      label: `${KIND_WORD[kind]}: ${c.closed} of ${c.live} closed`,
    });
  });
  return nodes;
}

function exitRing(phase: Phase): { nodes: SceneNode[]; rows: ListRow[] } {
  const { webX: cx, webY: cy, webR: R } = PHASE_SCREEN;
  const items = phase.exit.items;
  const nodes: SceneNode[] = [];
  const rows: ListRow[] = [];
  const r = R + 52;
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r: r + 9 }, cls: 'ov-wire ov-ghost' });
  if (items.length === 0) {
    nodes.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, r, 0, TAU), 'stroke-width': 6, 'stroke-dasharray': '2 8' }, cls: 'ov-arc ov-track', label: phase.exit.prose ? 'Exit criteria written as prose' : 'No exit criteria' });
    return { nodes, rows };
  }
  const step = TAU / items.length;
  const pad = Math.min(0.04, step * 0.15);
  items.forEach((item, i) => {
    const id = `exit-${phase.id}-${i + 1}`;
    nodes.push({
      kind: 'mark',
      tag: 'path',
      attrs: { d: arc(cx, cy, r, i * step + pad, (i + 1) * step - pad), 'stroke-width': 9 },
      cls: item.ticked ? 'ov-arc glow' : 'ov-arc ov-faint',
      state: item.ticked ? 'closed' : 'open',
      markId: id,
      label: `${item.ticked ? 'Met' : 'Not yet met'}: ${item.text}`,
    });
    rows.push({ id, label: `${item.ticked ? 'Met' : 'Not yet met'}: ${item.text}`, group: 'Exit criteria', state: item.ticked ? 'closed' : 'open' });
  });
  return { nodes, rows };
}

/** The depth field: three bands, each a perspective strip, nearer is larger. */
function field(model: OverviewModel, phase: Phase, ctx: ScreenContext): { nodes: SceneNode[]; rows: ListRow[] } {
  const bands: Ticket[][] = [[], [], []];
  for (const id of phase.tickets) {
    const t = model.tickets[id];
    if (t !== undefined) bands[bandOf(t.state)]!.push(t);
  }
  // Far to near, so the near band is drawn on top.
  const geometry = [
    { x: 760, y: 640, w: 640, h: 300, size: 15, max: 40 }, // front
    { x: 800, y: 330, w: 560, h: 280, size: 9, max: 26 }, // middle
    { x: 860, y: 150, w: 440, h: 150, size: 3.2, max: 10 }, // far
  ];
  const nodes: SceneNode[] = [];
  const rows: ListRow[] = [];
  // The floor: three lines receding toward a vanishing point.
  nodes.push({ kind: 'mark', tag: 'polygon', attrs: { points: '760,950 1400,950 1300,140 860,140' }, cls: 'ov-track' });
  for (const yLine of [620, 315]) {
    nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: 760 + (950 - yLine) * 0.124, y1: yLine, x2: 1400 - (950 - yLine) * 0.124, y2: yLine }, cls: 'ov-wire ov-faint' });
  }
  for (const b of [2, 1, 0] as const) {
    const g = geometry[b]!;
    const tickets = bands[b]!;
    const { points, pitch } = gridFit(tickets.length, g.x, g.y, g.w, g.h, g.max, 4);
    const size = Math.min(g.size, pitch * 0.42);
    const plain: SceneNode[] = [];
    const lit: MarkNode[] = [];
    tickets.forEach((t, i) => {
      const [x, y] = points[i]!;
      const shape = glyph(t.kind, x, y, size);
      const mark: MarkNode = { kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: t.id, state: t.state, label: ticketLabel(t), cls: b === 2 ? 'ov-faint' : undefined };
      (needsPerson(t) || (b === 0) ? lit : plain).push(mark);
      rows.push({ id: t.id, label: `${t.title} — ${STATE_WORD[t.state]} (${KIND_WORD[t.kind]})`, group: ['Needs you', 'In progress and open', 'Closed'][b]!, state: t.state, target: ctx.address({ page: 'ticket', note: t.id }) });
    });
    nodes.push(...plain);
    if (lit.length > 0) nodes.push({ kind: 'group', cls: 'glow', children: lit });
  }
  return { nodes, rows };
}

export function phaseScene(model: OverviewModel, phaseId: string, ctx: ScreenContext): Scene {
  const phase = allPhases(model).find((p) => p.id === phaseId);
  if (phase === undefined) throw new Error(`the overview has no phase ${phaseId}`);
  const back = backControl(ctx, { page: 'wheel' }, 'Back to the wheel');
  const nodes: SceneNode[] = [back.node, ...heading(phase.id, phase.name)];
  nodes.push(...frame(PHASE_SCREEN.width, PHASE_SCREEN.height), ...bezel(PHASE_SCREEN.webX, PHASE_SCREEN.webY, PHASE_SCREEN.webR + 72, 90));


  // The status lamp, beside the name.
  const { closed, live } = closedOf(model, phase);
  const lampState: State = phase.kind === 'finished' ? 'closed' : phase.status === 'active' ? 'progress' : 'open';
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 86, cy: 140, r: 7 }, state: lampState, glow: true, label: `${phase.status} · ${phase.kind}` });

  // How far: one bar of every live ticket, closed share lit.
  const barX = 108;
  const barW = 520;
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: barX, y: 134, width: barW, height: 12, rx: 6 }, cls: 'ov-track' });
  if (live > 0 && closed > 0) {
    nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: barX, y: 134, width: (barW * closed) / live, height: 12, rx: 6 }, state: 'closed', markId: 'progress', count: closed, label: `${closed} of ${live} closed` });
  }

  nodes.push(...webNodes(model, phase));
  const exit = exitRing(phase);
  nodes.push(...exit.nodes);
  const f = field(model, phase, ctx);
  nodes.push(...f.nodes);

  // Each band's word, at its left edge.
  nodes.push({ kind: 'text', x: 1410, y: 955, text: 'Needs you', rest: true, role: 'label', size: 12, anchor: 'end', cls: 'ov-dim ov-title' });
  nodes.push({ kind: 'text', x: 1370, y: 640, text: 'Open', rest: true, role: 'label', size: 11, anchor: 'end', cls: 'ov-dim ov-title' });
  nodes.push({ kind: 'text', x: 1300, y: 132, text: 'Closed', rest: true, role: 'label', size: 10, anchor: 'end', cls: 'ov-dim ov-title' });

  const list: ListRow[] = [back.row, { id: phase.id, label: `${phaseLabel(phase)} — ${closed} of ${live} closed, ${phase.status}`, group: 'This phase' }, ...exit.rows, ...f.rows];
  // The phase's own id is drawn by the lamp's neighbour: a mark carrying it keeps the twin exact.
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 86, cy: 140, r: 12 }, cls: 'ov-hit', markId: `phase-${phase.id}`, label: phaseLabel(phase) });
  return {
    screen: 'phase',
    address: ctx.address({ page: 'phase', note: phase.id }),
    width: PHASE_SCREEN.width,
    height: PHASE_SCREEN.height,
    title: `${phaseLabel(phase)}: what it owes`,
    nodes,
    list,
  };
}

export type { Kind };
