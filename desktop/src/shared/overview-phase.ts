/**
 * S2, a phase: its segment of the ring brought close (PHASE-0005, FEAT-0028).
 *
 * Since 2026-10-16 (TASK-0168) the phase opens as the towers page draws it: the
 * camera flies from the wheel to the phase's segment, each tower shows its
 * feature's id, the exit criteria are the collar round its rim, lit when met,
 * and its tickets are listed on the right as the cockpit lists them, grouped by
 * tower, the feature in focus first, what needs you at the top of each group and
 * the flat tiles last (Edwin: "I don't think the phase spider web works"). The
 * web is gone. A finished phase, which has no segment, shows the whole ring and
 * lists its tickets by section, what needs you first.
 */
import { backControl, frame, heading } from './overview-chrome.js';
import { plainName } from './overview-geometry.js';
import { towersLayout, towersPlan, type RingPhase } from './overview-towers.js';
import { rowWords } from './overview-marks.js';
import type { ListRow, PanelNode, PanelRow, PanelSection, Scene, SceneNode, ScreenContext } from './overview-scene.js';
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

export const PHASE_SCREEN = { width: 1440, height: 1000 } as const;

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

/**
 * The phase's tickets as cockpit rows (TASK-0147), grouped by what stands where
 * in its segment (TASK-0168). What needs you comes first, in one open group, each
 * row saying what to do, so a pressed cap's tickets are at the top. Then the
 * feature in focus, open. Then every other tower, folded to a strip of its marks
 * with its count, opened by a press; then the flat tiles, folded unless they are
 * few. Each ticket is one row.
 */
export const TICKET_PANEL = { x: 760, y: 96, w: 650, h: 870 } as const;

function towerPanel(model: OverviewModel, ring: RingPhase, ctx: ScreenContext): { node: PanelNode; rows: ListRow[] } {
  const rows: ListRow[] = [];
  const ticketsOf = (ids: string[]): Ticket[] => ids.map((id) => model.tickets[id]).filter((t): t is Ticket => t !== undefined);
  const towers = [...ring.towers].sort((a, b) => Number(b.focus) - Number(a.focus) || a.feature.localeCompare(b.feature, 'en', { numeric: true }));
  const sections: PanelSection[] = [];
  const add = (key: string, title: string, group: string, tickets: Ticket[], folded: boolean): void => {
    if (tickets.length === 0) return;
    for (const t of tickets) rows.push({ id: t.id, label: rowWords(t), group, state: t.state, target: ctx.address({ page: 'ticket', note: t.id }) });
    sections.push({ key, title, rows: tickets.map((t) => panelRow(t, ctx)), folded });
  };
  const everyone = [...towers.flatMap((tw) => ticketsOf(tw.cubes.map((c) => c.id))), ...ticketsOf(ring.tiles.map((c) => c.id))];
  add('needs-you', SECTION_TITLE[0], SECTION_TITLE[0], everyone.filter((t) => t.needsYou), false);
  for (const tower of towers) {
    const all = ticketsOf(tower.cubes.map((c) => c.id));
    const done = all.filter((t) => t.state === 'closed').length;
    add(`tower-${tower.feature}`, `${tower.feature} · ${done} of ${all.length} done${tower.focus ? ' · in focus' : ''}`, tower.feature, all.filter((t) => !t.needsYou), !tower.focus);
  }
  const tiles = ticketsOf(ring.tiles.map((c) => c.id)).filter((t) => !t.needsYou);
  add('tiles', 'No feature', 'No feature', tiles, tiles.length > 8);
  return {
    node: { kind: 'panel', key: `tickets-${ring.id}`, ...TICKET_PANEL, label: `${ring.id}'s tickets: what needs you first, then each tower`, body: { kind: 'rows', sections } },
    rows,
  };
}

/** A finished phase's tickets by section: what needs you, in progress and open, closed and folded. */
function sectionPanel(model: OverviewModel, phase: Phase, ctx: ScreenContext): { node: PanelNode; rows: ListRow[] } {
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
    label: `${phase.id}'s tickets: what needs you first, closed work folded`,
    body: {
      kind: 'rows',
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
  const layout = towersLayout(model, ctx, phase.id);
  const ring = layout.phases.find((p) => p.id === phase.id);
  const nodes: SceneNode[] = [back.node, ...heading(phase.id, plainName(phase.name)), ...frame(PHASE_SCREEN.width, PHASE_SCREEN.height)];
  const list: ListRow[] = [back.row];
  const { closed, live } = closedOf(model, phase);
  list.push({ id: phase.id, label: `${phaseLabel(phase)} — ${closed} of ${live} closed, ${phase.status}`, group: 'This phase' });
  // The exit criteria, in the list twin as the collar draws them.
  phase.exit.items.forEach((item, i) => list.push({ id: `exit-${phase.id}-${i}`, label: `${item.ticked ? 'Met' : 'Not yet met'}: ${item.text}`, group: 'Exit criteria', state: item.ticked ? 'closed' : 'open' }));
  if (ring !== undefined) {
    const plan = towersPlan(layout, { only: phase.id, box: { x: 40, y: 150, w: 700, h: 800 }, tickets: false });
    nodes.push(...plan.nodes);
    list.push(...plan.rows.filter((r) => r.group !== 'Phases'));
    const panel = towerPanel(model, ring, ctx);
    nodes.push(panel.node);
    list.push(...panel.rows);
  } else {
    const plan = towersPlan(layout, { tickets: false });
    nodes.push({ kind: 'group', key: 'ring-small', transform: 'translate(40 150) scale(0.5)', children: plan.nodes });
    const panel = sectionPanel(model, phase, ctx);
    nodes.push(panel.node);
    list.push(...panel.rows);
  }
  // The phase's own id is drawn by a mark beside the heading, so the twin stays exact.
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 86, cy: 140, r: 7 }, state: phase.kind === 'finished' ? 'closed' : phase.status === 'active' ? 'progress' : 'open', glow: true, markId: `phase-${phase.id}`, label: `${phaseLabel(phase)}: ${phase.status} · ${phase.kind}` });
  nodes.push({ kind: 'towers', layout });
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
