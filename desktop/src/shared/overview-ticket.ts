/**
 * S3, a ticket: where it is in its life, and what it is joined to (PHASE-0005,
 * FEAT-0028).
 *
 * Across the top, the statuses the ticket's kind passes through, as stops on
 * a track; the ticket's own stop is lit. A status off the track (cancelled,
 * superseded, failing) is a stop that branches below it. In the middle, the
 * ticket as a large glyph; around it, every note it links to or that links to
 * it, as glyphs coloured by state on wires coloured the same way.
 */
import { backControl, bezel, frame, heading, words } from './overview-chrome.js';
import { glyph, polar, TAU } from './overview-geometry.js';
import type { ListRow, MarkNode, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import { KIND_WORD, STATE_WORD, type Kind, type OverviewModel, type Ticket } from './overview-types.js';
import { needsPerson, ticketLabel } from './overview-wheel.js';

export const TICKET_SCREEN = { width: 1440, height: 1000, cx: 720, cy: 580 } as const;

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
  const self = model.tickets[id];
  const seen = new Set<string>();
  const out: Ticket[] = [];
  for (const other of self?.links ?? []) {
    const t = model.tickets[other];
    if (t !== undefined && other !== id && !seen.has(other)) {
      seen.add(other);
      out.push(t);
    }
  }
  for (const t of Object.values(model.tickets)) {
    if (t.id !== id && !seen.has(t.id) && t.links.includes(id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  const order: Kind[] = ['req', 'feat', 'task', 'test', 'iss', 'dec', 'risk'];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.id.localeCompare(b.id));
}

function track(t: Ticket): SceneNode[] {
  const stops = LIFECYCLE[t.kind];
  const nodes: SceneNode[] = [];
  const x0 = 380;
  const x1 = 1060;
  const y = 190;
  const at = stops.indexOf(t.status);
  const step = (x1 - x0) / Math.max(1, stops.length - 1);
  nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: x0, y1: y, x2: x1, y2: y, 'stroke-width': 2 }, cls: 'ov-wire' });
  if (at > 0) {
    nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: x0, y1: y, x2: x0 + at * step, y2: y, 'stroke-width': 3 }, cls: 'ov-wire', state: t.state });
  }
  stops.forEach((status, i) => {
    const x = x0 + i * step;
    const here = i === at;
    const past = at >= 0 && i < at;
    nodes.push({
      kind: 'mark',
      tag: 'circle',
      attrs: { cx: x, cy: y, r: here ? 13 : 8 },
      state: here || past ? t.state : undefined,
      cls: here ? 'glow' : past ? 'ov-faint' : 'ov-glass',
      label: here ? `Now: ${status}` : past ? `Passed: ${status}` : `Ahead: ${status}`,
    });
    nodes.push({ kind: 'text', x, y: y + 32, text: status, rest: true, role: 'label', size: here ? 14 : 12, anchor: 'middle', cls: here ? 'ov-title' : 'ov-dim' });
  });
  if (at < 0) {
    // Off the track: a branch from the last stop it could have left from.
    const x = x0 + step * 0.5;
    nodes.push({ kind: 'mark', tag: 'path', attrs: { d: `M${x0} ${y} Q${x} ${y} ${x} ${y + 60}`, 'stroke-width': 2 }, cls: 'ov-wire', state: t.state });
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y + 66, r: 12 }, state: t.state, cls: 'glow', label: `Now: ${t.status}` });
    nodes.push({ kind: 'text', x: x + 22, y: y + 71, text: t.status, rest: true, role: 'label', size: 14, cls: 'ov-title' });
  }
  return nodes;
}

export function ticketScene(model: OverviewModel, ticketId: string, ctx: ScreenContext): Scene {
  const t = model.tickets[ticketId];
  if (t === undefined) throw new Error(`the overview has no ticket ${ticketId}`);
  const { cx, cy } = TICKET_SCREEN;
  const back = t.phase !== null
    ? backControl(ctx, { page: 'phase', note: t.phase }, `Back to ${t.phase}`)
    : backControl(ctx, { page: 'wheel' }, 'Back to the wheel');
  const nodes: SceneNode[] = [back.node, ...heading(t.id, words(t.title, 7))];
  const list: ListRow[] = [back.row, { id: t.id, label: `${t.title} — ${STATE_WORD[t.state]} (${KIND_WORD[t.kind]}, ${t.status})`, group: 'This ticket', state: t.state }];

  nodes.push(...track(t));
  nodes.push(...frame(TICKET_SCREEN.width, TICKET_SCREEN.height), ...bezel(cx, cy, 104, 72));


  // The neighbourhood: one ring, or two when it is crowded.
  const near = neighboursOf(model, t.id);
  const perRing = 28;
  const wires: SceneNode[] = [];
  const glyphs: SceneNode[] = [];
  const lit: MarkNode[] = [];
  near.forEach((n, i) => {
    const ring = Math.floor(i / perRing);
    const inRing = Math.min(perRing, near.length - ring * perRing);
    const angle = ((i % perRing) + (ring % 2) * 0.5) * (TAU / inRing);
    const radius = 200 + ring * 90;
    const [x, y] = polar(cx, cy, Math.min(radius, 380), angle);
    wires.push({ kind: 'mark', tag: 'line', attrs: { x1: cx, y1: cy, x2: x, y2: y }, cls: 'ov-wire ov-faint', state: n.state });
    const size = near.length > perRing ? 11 : 15;
    const shape = glyph(n.kind, x, y, size);
    const mark: MarkNode = { kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: n.id, state: n.state, label: ticketLabel(n), target: ctx.address({ page: 'ticket', note: n.id }) };
    (needsPerson(n) ? lit : glyphs).push(mark);
    list.push({ id: n.id, label: `${n.title} — ${STATE_WORD[n.state]} (${KIND_WORD[n.kind]})`, group: 'Joined to it', state: n.state, target: ctx.address({ page: 'ticket', note: n.id }) });
  });
  nodes.push(...wires, ...glyphs);
  if (lit.length > 0) nodes.push({ kind: 'group', cls: 'glow', children: lit });
  if (near.length === 0) {
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r: 200, 'stroke-dasharray': '3 9' }, cls: 'ov-wire ov-faint', label: 'Nothing links to it, and it links to nothing' });
  }

  // The ticket itself, large, in the middle.
  const self = glyph(t.kind, cx, cy, 54);
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r: 84 }, cls: 'ov-glass' });
  nodes.push({ kind: 'mark', tag: self.tag, attrs: self.attrs, ticket: t.id, state: t.state, glow: true, label: ticketLabel(t) });

  // Its phase, as a small sector the person can follow.
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
