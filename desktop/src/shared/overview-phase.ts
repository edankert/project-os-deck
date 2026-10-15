/**
 * S2, a phase: what it still owes and what kind of work it is (PHASE-0005,
 * FEAT-0028).
 *
 * Left, the phase's web: one corner per ticket kind, the defined count in
 * amber and the closed count in green, on one square-root scale shared by
 * every phase of the workspace, so a bigger phase draws a bigger web. Around
 * it, the exit criteria as a ring of segments, lit when ticked. Right, the
 * phase's tickets as the cockpit lists them, on a plane tilted away: what
 * needs you in front, what is in progress or open behind it, and what is
 * closed at the back, folded to a strip of marks (TASK-0147).
 */
import { backControl, bezel, frame, heading } from './overview-chrome.js';
import { arc, plainName, polar, polygon, TAU } from './overview-geometry.js';
import { rowWords } from './overview-marks.js';
import type { ListRow, PanelNode, PanelRow, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import {
  allPhases,
  KIND_WORD,
  PHASE_KINDS,
  type Fill,
  type Kind,
  type NoteType,
  type OverviewModel,
  type Phase,
  type State,
  type Ticket,
} from './overview-types.js';
import { closedOf, phaseLabel } from './overview-wheel.js';

export const PHASE_SCREEN = { width: 1440, height: 1000, webX: 380, webY: 520, webR: 230 } as const;

const INITIAL: Record<string, string> = { req: 'Req', feat: 'Feat', task: 'Task', test: 'Test', iss: 'Iss' };

/**
 * Which section of the ticket list a ticket stands in: 0 needs you, at the
 * front; 1 in progress and open; 2 closed, folded at the back (TASK-0147).
 * The cockpit's flags decide it, so a ticket the cockpit dots is in front here.
 */
export function sectionOf(t: Pick<Ticket, 'fill' | 'needsYou'>): 0 | 1 | 2 {
  if (t.needsYou) return 0;
  if (t.fill === 'delivered' || t.fill === 'dropped') return 2;
  return 1;
}

/** @deprecated The depth field's bands became the list's sections; kept for callers that ask by ticket. */
export const bandOf = sectionOf;

export const SECTION_TITLE = ['Needs you', 'In progress and open', 'Closed'] as const;

/** The order rows stand in within a section: by type as the cockpit lists them, then how far along, then id. */
const TYPE_ORDER: readonly NoteType[] = ['feature', 'requirement', 'task', 'test', 'issue', 'risk', 'adr', 'design'];
const FILL_ORDER: readonly Fill[] = ['doing', 'unproven', 'open', 'deferred', 'delivered', 'dropped'];

export function rowOrder(a: Ticket, b: Ticket): number {
  return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || FILL_ORDER.indexOf(a.fill) - FILL_ORDER.indexOf(b.fill) || a.id.localeCompare(b.id, 'en', { numeric: true });
}

/** A ticket as a panel row, the way the cockpit lists it. */
export function panelRow(t: Ticket, ctx: ScreenContext): PanelRow {
  return { id: t.id, type: t.type, fill: t.fill, needsYou: t.needsYou, title: t.title, status: t.status, target: ctx.address({ page: 'ticket', note: t.id }), ...(t.needs ? { note: t.needs.say } : {}) };
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

/**
 * The phase's tickets as cockpit rows on a plane tilted away (TASK-0147).
 *
 * Edwin, 2026-10-15: "the right hand pane should really show the tickets as
 * tickets", in the cockpit's list, and "it would be nice if they could be
 * displayed more 3d". What needs you stands at the front, full size; what is
 * in progress or open behind it; what is closed at the back, folded to a strip
 * of marks with its count until it is pressed open. Deck builds the rows as
 * HTML and tilts them in real depth; a plate draws them flat.
 */
export const TICKET_PANEL = { x: 740, y: 96, w: 670, h: 870 } as const;

function ticketPanel(model: OverviewModel, phase: Phase, ctx: ScreenContext): { node: PanelNode; rows: ListRow[] } {
  const sections: Ticket[][] = [[], [], []];
  for (const id of phase.tickets) {
    const t = model.tickets[id];
    if (t !== undefined) sections[sectionOf(t)]!.push(t);
  }
  const rows: ListRow[] = [];
  const node: PanelNode = {
    kind: 'panel',
    key: `tickets-${phase.id}`,
    ...TICKET_PANEL,
    label: `${phase.id}'s tickets: what needs you in front, closed work folded at the back`,
    body: {
      kind: 'rows',
      tilt: true,
      sections: sections.map((tickets, i) => {
        const sorted = [...tickets].sort(rowOrder);
        for (const t of sorted) rows.push({ id: t.id, label: rowWords(t), group: SECTION_TITLE[i]!, state: t.state, target: ctx.address({ page: 'ticket', note: t.id }) });
        return { key: ['needs-you', 'open', 'closed'][i]!, title: SECTION_TITLE[i]!, rows: sorted.map((t) => panelRow(t, ctx)), folded: i === 2 };
      }),
    },
  };
  return { node, rows };
}

export function phaseScene(model: OverviewModel, phaseId: string, ctx: ScreenContext): Scene {
  const phase = allPhases(model).find((p) => p.id === phaseId);
  if (phase === undefined) throw new Error(`the overview has no phase ${phaseId}`);
  const back = backControl(ctx, { page: 'wheel' }, 'Back to the wheel');
  const nodes: SceneNode[] = [back.node, ...heading(phase.id, plainName(phase.name))];
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
  const f = ticketPanel(model, phase, ctx);
  nodes.push(f.node);

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
