/**
 * S3, a ticket: what it is, what it says, where it is in its life, and what it
 * is joined to (PHASE-0005, FEAT-0028; TASK-0148).
 *
 * Edwin, 2026-10-15: "Selecting an item I think should show them with more
 * details ... should show the item id and title, maybe some text or all of the
 * text even and should show the other items id and title as well". So the
 * screen shows the ticket's square, id and title at the top with the stages it
 * passes through; its full text on the left, as the reader shows it; and every
 * ticket it links to or that links to it on the right, as the cockpit's rows.
 * A feature also shows its gate: the five checks that must pass before it is
 * accepted, as labelled chips.
 */
import { backControl, frame, heading, words } from './overview-chrome.js';
import { cockpitSquare, rowWords } from './overview-marks.js';
import type { AddressParts, ListRow, PanelNode, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import { panelRow, rowOrder } from './overview-phase.js';
import { type Kind, type OverviewModel, type Ticket } from './overview-types.js';
import { ticketLabel } from './overview-wheel.js';
import { gateFromModel, gateNodes } from './overview-flows.js';

export const TICKET_SCREEN = { width: 1440, height: 1000 } as const;

/** Where the text and the linked tickets stand. */
export const TICKET_LAYOUT = {
  text: { x: 40, y: 220, w: 800, h: 750 },
  links: { x: 870, y: 220, w: 540, h: 750 },
  track: { x0: 230, x1: 760, y: 150 },
  gate: { x: 830, y: 100, w: 580 },
} as const;

/** The statuses each kind passes through on its way to finished (tools/instructions/STATUSES.md). */
export const LIFECYCLE: Readonly<Record<Kind, readonly string[]>> = {
  feat: ['backlog', 'planned', 'doing', 'review', 'done'],
  task: ['backlog', 'doing', 'done'],
  req: ['draft', 'approved', 'implemented'],
  test: ['draft', 'ready', 'active', 'passing'],
  iss: ['triage', 'open', 'fixed'],
  dec: ['draft', 'proposed', 'accepted'],
  risk: ['open', 'mitigating', 'closed'],
};

/** The tickets this one links to, and the tickets that link to it, each once. */
export function neighboursOf(model: OverviewModel, id: string): Ticket[] {
  const { to, from } = joinedTo(model, id);
  return [...to, ...from];
}

/**
 * What a ticket is joined to, split by direction: the tickets it links to, and
 * the ones that link to it and are not already among those. Each in the order
 * the cockpit lists tickets.
 */
export function joinedTo(model: OverviewModel, id: string): { to: Ticket[]; from: Ticket[] } {
  const self = model.tickets[id];
  const seen = new Set<string>([id]);
  const to: Ticket[] = [];
  for (const other of self?.links ?? []) {
    const t = model.tickets[other];
    if (t !== undefined && !seen.has(other)) {
      seen.add(other);
      to.push(t);
    }
  }
  const from: Ticket[] = [];
  for (const t of Object.values(model.tickets)) {
    if (!seen.has(t.id) && t.links.includes(id)) {
      seen.add(t.id);
      from.push(t);
    }
  }
  return { to: to.sort(rowOrder), from: from.sort(rowOrder) };
}

function track(t: Ticket): SceneNode[] {
  const stops = LIFECYCLE[t.kind];
  const nodes: SceneNode[] = [];
  const { x0, x1, y } = TICKET_LAYOUT.track;
  const at = stops.indexOf(t.status);
  const step = (x1 - x0) / Math.max(1, stops.length - 1);
  nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: x0, y1: y, x2: x1, y2: y, 'stroke-width': 2 }, cls: 'ov-wire' });
  if (at > 0) {
    nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: x0, y1: y, x2: x0 + at * step, y2: y, 'stroke-width': 3 }, cls: 'ov-wire', type: t.type, fill: 'delivered' });
  }
  stops.forEach((status, i) => {
    const x = x0 + i * step;
    const here = i === at;
    const past = at >= 0 && i < at;
    nodes.push({
      kind: 'mark',
      tag: 'circle',
      attrs: { cx: x, cy: y, r: here ? 12 : 7 },
      ...(here || past ? { type: t.type, fill: here ? t.fill : 'delivered' } : {}),
      cls: here ? 'glow' : past ? 'ov-faint' : 'ov-glass',
      label: here ? `Now: ${status}` : past ? `Passed: ${status}` : `Ahead: ${status}`,
    });
    nodes.push({ kind: 'text', x, y: y + 30, text: status, rest: true, role: 'label', size: here ? 14 : 12, anchor: 'middle', cls: here ? 'ov-title' : 'ov-dim' });
  });
  if (at < 0) {
    // Off the track: a branch from the last stop it could have left from.
    const x = x0 + step * 0.5;
    nodes.push({ kind: 'mark', tag: 'path', attrs: { d: `M${x0} ${y} Q${x} ${y} ${x} ${y + 34}`, 'stroke-width': 2 }, cls: 'ov-wire', type: t.type, fill: t.fill });
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y + 40, r: 10 }, type: t.type, fill: t.fill, cls: 'glow', label: `Now: ${t.status}` });
    nodes.push({ kind: 'text', x: x + 20, y: y + 45, text: t.status, rest: true, role: 'label', size: 14, cls: 'ov-title' });
  }
  return nodes;
}

/** Where a ticket of this kind is accepted, if anywhere: S5, S6 or S7. */
export function flowFor(t: Ticket): { parts: AddressParts; label: string } | null {
  if (t.id.startsWith('DES-')) return { parts: { flow: 'design', note: t.id }, label: `Open ${t.id}'s plates to accept or decline it` };
  if (t.kind === 'feat') return { parts: { flow: 'accept', note: t.id }, label: `Open ${t.id}'s gate to accept it` };
  if (t.kind === 'test') return { parts: { flow: 'test-run' }, label: 'Open the release test' };
  return null;
}

export interface TicketExtras {
  /** The note's Markdown body, for a plate; Deck reads the rendered text itself. */
  text?: string;
}

export function ticketScene(model: OverviewModel, ticketId: string, ctx: ScreenContext, extras: TicketExtras = {}): Scene {
  const t = model.tickets[ticketId];
  if (t === undefined) throw new Error(`the overview has no ticket ${ticketId}`);
  const back = t.phase !== null
    ? backControl(ctx, { page: 'phase', note: t.phase }, `Back to ${t.phase}`)
    : backControl(ctx, { page: 'wheel' }, 'Back to the wheel');
  const nodes: SceneNode[] = [back.node, ...heading(t.id, words(t.title, 14), 128)];
  const list: ListRow[] = [back.row, { id: t.id, label: rowWords(t), group: 'This ticket', state: t.state }];
  nodes.push(...frame(TICKET_SCREEN.width, TICKET_SCREEN.height));

  // The ticket itself, as the cockpit marks it, beside its name. Pressing it opens
  // where this kind of ticket is accepted: a design's plates, a feature's gate, the
  // release test for a test.
  const flow = flowFor(t);
  const self = cockpitSquare(t, 104, 62, 26, { label: flow?.label ?? ticketLabel(t), key: `ticket-${t.id}` });
  if (flow !== null) {
    const target = ctx.address(flow.parts);
    nodes.push({ ...self, target });
    list.push({ id: `flow-of-${t.id}`, label: flow.label, group: 'Go to', target });
  } else nodes.push(self);

  nodes.push(...track(t));

  // A feature shows its gate beside its track: the five checks before it is accepted.
  if (t.kind === 'feat') {
    const { x, y, w } = TICKET_LAYOUT.gate;
    const gate = gateNodes(gateFromModel(model, t.id), x + 40, y + 50, w / 1100).filter((n) => n.kind !== 'text');
    nodes.push({ kind: 'group', key: `gate-${t.id}`, target: ctx.address({ flow: 'accept', note: t.id }), label: `${t.id}'s gate: open it to accept the feature`, children: gate });
  }

  // Its text, as the reader shows it.
  nodes.push({ kind: 'panel', key: `text-${t.id}`, ...TICKET_LAYOUT.text, label: `${t.id}'s text`, body: { kind: 'note', id: t.id, title: t.title, text: extras.text ?? '' } });

  // What it is joined to, as the cockpit lists tickets.
  const { to, from } = joinedTo(model, t.id);
  const links: PanelNode = {
    kind: 'panel',
    key: `links-${t.id}`,
    ...TICKET_LAYOUT.links,
    label: `What ${t.id} is joined to`,
    body: {
      kind: 'rows',
      sections: [
        { key: 'to', title: 'Links to', rows: to.map((n) => panelRow(n, ctx)) },
        { key: 'from', title: 'Linked from', rows: from.map((n) => panelRow(n, ctx)) },
      ],
    },
  };
  nodes.push(links);
  for (const [group, tickets] of [['Links to', to], ['Linked from', from]] as const) {
    for (const n of tickets) list.push({ id: n.id, label: rowWords(n), group, state: n.state, target: ctx.address({ page: 'ticket', note: n.id }) });
  }
  if (to.length + from.length === 0) {
    nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: TICKET_LAYOUT.links.x, y: TICKET_LAYOUT.links.y, width: TICKET_LAYOUT.links.w, height: 60, rx: 10, 'stroke-dasharray': '3 9' }, cls: 'ov-wire ov-faint', label: 'Nothing links to it, and it links to nothing' });
  }

  // Its phase, to follow from the list.
  if (t.phase !== null) {
    list.push({ id: `phase-of-${t.id}`, label: `In ${t.phase}`, group: 'Go to', target: ctx.address({ page: 'phase', note: t.phase }) });
  }

  return {
    screen: 'ticket',
    address: ctx.address({ page: 'ticket', note: t.id }),
    width: TICKET_SCREEN.width,
    height: TICKET_SCREEN.height,
    title: `${t.id}: ${t.title}`,
    nodes,
    list,
  };
}
