/**
 * S1, the wheel: the overview Deck opens on (PHASE-0005, FEAT-0027).
 *
 * DES-0004's RINGS, redrawn for the dark field. One sector per phase still to
 * finish, clockwise from the top in phase order; one ring per ticket kind,
 * fewest tickets in the middle; one wedge per ticket, closed first. The core
 * holds project-wide tickets and tickets with no phase. Finished phases are
 * discs on a shelf under the wheel, and the backlog is a tray beside it.
 *
 * **Every ticket in the model is drawn exactly once**, as a mark carrying its
 * id, and the list twin holds the same ids. The only words at rest are the
 * workspace's name, each sector's number and short name, the ring initials and
 * the two shelf captions; everything else is on hover.
 */
import { bezel, frame } from './overview-chrome.js';
import { annularSector, arc, glyph, polar, shortName, TAU } from './overview-geometry.js';
import { markWords, paintOf, rowWords } from './overview-marks.js';
import type { ListRow, MarkNode, Scene, SceneNode, ScreenContext, TextNode } from './overview-scene.js';
import {
  CORE_KINDS,
  KIND_WORD,
  PHASE_KINDS,
  STATE_WORD,
  type Kind,
  type OverviewModel,
  type Phase,
  type Ticket,
} from './overview-types.js';

export const WHEEL = {
  width: 1440,
  height: 1000,
  cx: 720,
  cy: 440,
  /** The core: project-wide tickets and tickets with no phase. */
  coreInner: 50,
  coreOuter: 122,
  /** The phase rings. */
  ringInner: 142,
  ringOuter: 336,
  ringGap: 4,
  /** The gap at twelve o'clock where the ring initials stand. */
  topGap: 0.2,
  sectorGap: 0.03,
  /** A lone ticket never takes more than this share of its sector (DES-0004). */
  maxShare: 0.1,
} as const;

const INITIAL: Record<Kind, string> = { req: 'Req', feat: 'Feat', task: 'Task', test: 'Test', iss: 'Iss', dec: 'Dec', risk: 'Risk' };

/** What needs a person glows: the cockpit's "needs you" (its sidecar's `_needs_human`, TASK-0144). */
export const needsPerson = (t: Ticket): boolean => t.needsYou;

/** What a ticket's mark says when pointed at, in the cockpit's words (TASK-0145). */
export function ticketLabel(t: Ticket): string {
  return markWords(t);
}

export function closedOf(model: OverviewModel, phase: Phase): { closed: number; live: number } {
  let closed = 0;
  let live = 0;
  for (const id of phase.tickets) {
    const t = model.tickets[id];
    if (t === undefined || t.state === 'dropped') continue;
    live += 1;
    if (t.state === 'closed') closed += 1;
  }
  return { closed, live };
}

export function phaseLabel(phase: Phase): string {
  return `${phase.number} ${phase.name}`;
}

/** The wedges of one ring of one sector, closed first, as the model orders them. */
function ringWedges(
  model: OverviewModel,
  ctx: ScreenContext,
  ids: string[],
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  maxShare: number,
): { plain: MarkNode[]; lit: MarkNode[] } {
  const plain: MarkNode[] = [];
  const lit: MarkNode[] = [];
  if (ids.length === 0) return { plain, lit };
  const span = a1 - a0;
  const width = Math.min(span / ids.length, span * maxShare);
  // A hairline gap between wedges while they are wide enough to show one.
  const gap = width > 0.012 ? Math.min(0.004, width * 0.15) : 0;
  ids.forEach((id, i) => {
    const t = model.tickets[id];
    if (t === undefined) return;
    const start = a0 + i * width;
    const mark: MarkNode = {
      kind: 'mark',
      tag: 'path',
      attrs: { d: annularSector(WHEEL.cx, WHEEL.cy, r0, r1, start + gap / 2, start + width - gap / 2) },
      ticket: id,
      ...paintOf(t, ctx),
      label: ticketLabel(t),
    };
    (needsPerson(t) ? lit : plain).push(mark);
  });
  return { plain, lit };
}

function idsOfKind(model: OverviewModel, ids: string[], kind: Kind): string[] {
  return ids.filter((id) => model.tickets[id]?.kind === kind);
}

function ringBand(index: number, count: number, inner: number, outer: number, gap: number): [number, number] {
  const width = (outer - inner) / count;
  return [inner + index * width + gap / 2, inner + (index + 1) * width - gap / 2];
}

/**
 * Where each of a fan's particles stands: rows across the sector from its ring
 * inward, as re-phasing packs its clusters (TASK-0155). The pitch shrinks until
 * every particle fits between the ring and the core, so no two share a place.
 */
export function fanPlaces(count: number, cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number): Array<{ x: number; y: number; size: number }> {
  if (count === 0) return [];
  const width = (a1 - a0) * 0.9;
  const mid = (a0 + a1) / 2;
  const area = 0.5 * width * (rOut * rOut - rIn * rIn);
  for (let pitch = Math.min(18, Math.max(3, Math.sqrt(area / count) * 0.92)); pitch >= 2.5; pitch -= 0.25) {
    const out: Array<{ x: number; y: number; size: number }> = [];
    for (let r = rOut - pitch / 2; r >= rIn && out.length < count; r -= pitch) {
      const cols = Math.max(1, Math.floor((width * r) / pitch));
      const here = Math.min(cols, count - out.length);
      for (let k = 0; k < here; k += 1) {
        // A short row is centred on the sector's bearing, as re-phasing's clusters are.
        const a = mid + (here > 1 ? (k / (here - 1) - 0.5) * width * (here / cols) : 0);
        const [x, y] = polar(cx, cy, r, a);
        out.push({ x, y, size: Math.min(6, pitch * 0.36) });
      }
    }
    if (out.length === count) return out;
  }
  return [];
}

/** How far into the fan a ticket stands: done work at the ring, open work in front of it, what needs you in front of all. */
function depthOf(t: Ticket): number {
  if (t.needsYou) return 2;
  return t.fill === 'delivered' || t.fill === 'dropped' ? 0 : 1;
}

const KIND_ORDER: readonly Kind[] = ['feat', 'req', 'task', 'test', 'iss', 'dec', 'risk'];

function sectorNodes(model: OverviewModel, phase: Phase, a0: number, a1: number, ctx: ScreenContext): SceneNode[] {
  const nodes: SceneNode[] = [];
  const { cx, cy } = WHEEL;
  const children: SceneNode[] = [];
  const lit: MarkNode[] = [];
  // The phase's segment of the ring, which the fan hangs from.
  children.push({ kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, WHEEL.ringOuter - 4, WHEEL.ringOuter + 8, a0, a1) }, cls: 'ov-track' });
  const tickets = phase.tickets.map((id) => model.tickets[id]).filter((t): t is Ticket => t !== undefined);
  tickets.sort((a, b) => depthOf(a) - depthOf(b) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  const places = fanPlaces(tickets.length, cx, cy, WHEEL.coreOuter + 16, WHEEL.ringOuter - 10, a0, a1);
  tickets.forEach((t, i) => {
    const place = places[i];
    if (place === undefined) return;
    const front = needsPerson(t);
    const shape = glyph(t.kind, place.x, place.y, front ? place.size * 1.35 : place.size);
    const mark: MarkNode = { kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: t.id, ...paintOf(t, ctx), label: ticketLabel(t) };
    (front ? lit : children).push(mark);
  });
  if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });

  // What needs you here, counted on the ring itself.
  const waiting = tickets.filter(needsPerson).length;
  if (waiting > 0) {
    const [bx, by] = polar(cx, cy, WHEEL.ringOuter + 2, (a0 + a1) / 2);
    const badgeId = `needs-${phase.id}`;
    const paint = ctx.colouring === 'state' ? { state: 'failed' as const } : { cls: 'ov-badge' };
    children.push({ kind: 'mark', tag: 'circle', attrs: { cx: bx, cy: by, r: 12 }, ...paint, glow: true, markId: badgeId, count: waiting, label: `${waiting} ticket${waiting === 1 ? '' : 's'} in ${phase.id} need${waiting === 1 ? 's' : ''} you` });
    children.push({ kind: 'text', x: bx, y: by + 4, text: String(waiting), rest: true, role: 'number', markRef: badgeId, size: 11, anchor: 'middle' });
  }

  // Progress: the closed share of what the phase defines, drawn outside it.
  const { closed, live } = closedOf(model, phase);
  const progressR = WHEEL.ringOuter + 14;
  const target = ctx.address({ page: 'phase', note: phase.id });
  children.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, progressR, a0, a1), 'stroke-width': 4 }, cls: 'ov-arc ov-track' });
  if (live > 0 && closed > 0) {
    children.push({
      kind: 'mark',
      tag: 'path',
      attrs: { d: arc(cx, cy, progressR, a0, a0 + ((a1 - a0) * closed) / live), 'stroke-width': 4 },
      cls: 'ov-arc',
      state: 'closed',
      markId: `progress-${phase.id}`,
      count: closed,
      label: `${closed} of ${live} closed`,
    });
  }

  // Exit criteria: a segment each, lit when ticked.
  const items = phase.exit.items;
  if (items.length > 0) {
    const exitR = WHEEL.ringOuter + 24;
    const step = (a1 - a0) / items.length;
    items.forEach((item, i) => {
      children.push({
        kind: 'mark',
        tag: 'path',
        attrs: { d: arc(cx, cy, exitR, a0 + i * step + step * 0.12, a0 + (i + 1) * step - step * 0.12), 'stroke-width': 3 },
        cls: item.ticked ? 'ov-arc' : 'ov-arc ov-track',
        state: item.ticked ? 'closed' : undefined,
        label: `${item.ticked ? 'Met' : 'Not yet met'}: ${item.text}`,
      });
    });
  }

  // The sector's own hit area and the label at its middle.
  const mid = (a0 + a1) / 2;
  const [lx, ly] = polar(cx, cy, WHEEL.ringOuter + 52, mid);
  const anchor = Math.abs(Math.sin(mid)) < 0.25 ? 'middle' : Math.sin(mid) > 0 ? 'start' : 'end';
  const labels: TextNode[] = [
    { kind: 'text', x: lx, y: ly - 4, text: phase.number, rest: true, role: 'id', size: 13, anchor, cls: 'ov-dim' },
    { kind: 'text', x: lx, y: ly + 13, text: shortName(phase.name), rest: true, role: 'name', size: 15, anchor, cls: 'ov-title' },
  ];
  nodes.push({
    kind: 'group',
    key: `sector-${phase.id}`,
    cls: 'ov-sector',
    target,
    label: `${phaseLabel(phase)} · ${phase.status} · ${closed} of ${live} closed · exit ${items.filter((i) => i.ticked).length}/${items.length}`,
    children: [
      {
        kind: 'mark',
        tag: 'path',
        attrs: { d: annularSector(cx, cy, WHEEL.ringInner - 6, WHEEL.ringOuter + 30, a0, a1) },
        cls: 'ov-hit',
        markId: `phase-${phase.id}`,
        label: `${phaseLabel(phase)} · ${phase.status}`,
      },
      ...children,
      ...labels,
    ],
  });
  return nodes;
}

/**
 * The core: decisions, designs, risks and the tickets with no phase, as a slow cloud
 * round the no-phase button, the way re-phasing draws what no phase fits.
 */
function coreNodes(model: OverviewModel, ctx: ScreenContext): SceneNode {
  const children: SceneNode[] = [];
  const lit: MarkNode[] = [];
  const { cx, cy } = WHEEL;
  const tickets = model.core.tickets.map((id) => model.tickets[id]).filter((t): t is Ticket => t !== undefined);
  const inner = 50;
  const outer = WHEEL.coreOuter;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const size = Math.max(1.6, Math.min(5, Math.sqrt((Math.PI * (outer * outer - inner * inner)) / Math.max(1, tickets.length)) * 0.3));
  tickets.forEach((t, i) => {
    // Evenly over the ring between the button and the fans: equal area per ticket.
    const r = Math.sqrt(inner * inner + ((i + 0.5) / tickets.length) * (outer * outer - inner * inner));
    const [x, y] = polar(cx, cy, r, i * golden);
    const shape = glyph(t.kind, x, y, size);
    const mark: MarkNode = { kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: t.id, ...paintOf(t, ctx), label: ticketLabel(t) };
    (needsPerson(t) ? lit : children).push(mark);
  });
  if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });
  const suggested = model.core.tickets.filter((id) => model.tickets[id]?.suggestion !== undefined).length;
  return {
    kind: 'group',
    key: 'core',
    cls: 'ov-core ov-pulse',
    label: `Project-wide and unplaced: ${model.core.tickets.length} tickets, ${suggested} with a suggested phase`,
    children,
  };
}

/** One finished phase as a disc: a ring of its tickets by state, and a badge for the acceptance tests to run again. */
function disc(model: OverviewModel, phase: Phase, x: number, y: number, size: number, ctx: ScreenContext): SceneNode {
  const r1 = Math.min(26, size * 0.38);
  const r0 = r1 * 0.5;
  const children: SceneNode[] = [
    { kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: r1 + 4 }, cls: 'ov-glass', markId: `phase-${phase.id}`, label: phaseLabel(phase) },
  ];
  const ids = phase.tickets;
  const width = ids.length > 0 ? TAU / ids.length : 0;
  const lit: MarkNode[] = [];
  ids.forEach((id, i) => {
    const t = model.tickets[id];
    if (t === undefined) return;
    const mark: MarkNode = {
      kind: 'mark',
      tag: 'path',
      attrs: { d: annularSector(x, y, r0, r1, i * width, (i + 1) * width) },
      ticket: id,
      ...paintOf(t, ctx),
      label: ticketLabel(t),
    };
    (needsPerson(t) ? lit : children).push(mark);
  });
  if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });
  if (phase.status === 'superseded') {
    children.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: r0 - 2 }, cls: 'st-dropped' });
  }
  const owed = ids.filter((id) => model.tickets[id]?.state === 'owed').length;
  if (owed > 0) {
    const badgeId = `owed-${phase.id}`;
    // The badge counts acceptance tests whose pass the release ledger withdrew. In the
    // cockpit's colouring it is the "needs you" red; in DES-0004's, the owed violet.
    const badge = ctx.colouring === 'state' ? { state: 'owed' as const } : { cls: 'ov-badge' };
    children.push({ kind: 'mark', tag: 'circle', attrs: { cx: x + r1 * 0.85, cy: y - r1 * 0.85, r: 10 }, ...badge, glow: true, markId: badgeId, count: owed, label: `${owed} acceptance tests to run again: their pass was withdrawn. Open the release test`, target: ctx.address({ flow: 'test-run' }) });
    children.push({ kind: 'text', x: x + r1 * 0.85, y: y - r1 * 0.85 + 4, text: String(owed), rest: true, role: 'number', markRef: badgeId, size: 11, anchor: 'middle' });
  }
  children.push({ kind: 'text', x, y: y + r1 + 18, text: phase.number, rest: true, role: 'id', size: 10, anchor: 'middle', cls: 'ov-dim' });
  return {
    kind: 'group',
    key: `disc-${phase.id}`,
    target: ctx.address({ page: 'phase', note: phase.id }),
    label: `${phaseLabel(phase)} · ${phase.status} · ${ids.length} tickets${owed > 0 ? ` · ${owed} acceptance tests to run again` : ''}`,
    children,
  };
}

/** The backlog: its tickets as a grid of cells, waiting ones lit, closed ones pale. */
function tray(model: OverviewModel, phases: Phase[], x: number, y: number, w: number, h: number, ctx: ScreenContext): SceneNode[] {
  const out: SceneNode[] = [];
  const pad = 10;
  phases.forEach((phase, p) => {
    const top = y + p * (h + 16);
    const ids = phase.tickets;
    const cells = Math.max(ids.length, 1);
    // The largest square pitch that fits every ticket in the tray.
    let pitch = 14;
    while (pitch > 3 && Math.floor((w - 2 * pad) / pitch) * Math.floor((h - 2 * pad) / pitch) < cells) pitch -= 1;
    const cols = Math.max(1, Math.floor((w - 2 * pad) / pitch));
    const children: SceneNode[] = [
      { kind: 'mark', tag: 'rect', attrs: { x, y: top, width: w, height: h, rx: 10 }, cls: 'ov-glass', markId: `phase-${phase.id}`, label: phaseLabel(phase) },
    ];
    const lit: MarkNode[] = [];
    ids.forEach((id, i) => {
      const t = model.tickets[id];
      if (t === undefined) return;
      (needsPerson(t) ? lit : children).push({
        kind: 'mark',
        tag: 'rect',
        attrs: { x: x + pad + (i % cols) * pitch, y: top + pad + Math.floor(i / cols) * pitch, width: pitch - 2, height: pitch - 2, rx: 1.5 },
        ticket: id,
        ...paintOf(t, ctx),
        cls: t.state === 'closed' || t.state === 'dropped' ? 'ov-faint' : undefined,
        label: ticketLabel(t),
      });
    });
    // What needs a person glows in the tray too, as everywhere else on the wheel.
    if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });
    out.push({
      kind: 'group',
      key: `tray-${phase.id}`,
      target: ctx.address({ page: 'phase', note: phase.id }),
      label: `${phaseLabel(phase)} · backlog · ${ids.filter((id) => model.tickets[id]?.state !== 'closed').length} waiting`,
      children,
    });
  });
  return out;
}

/**
 * The two ways in that the wheel says out loud (TASK-0152). The middle of the wheel
 * is a button for re-phasing, with the number of tickets that have no phase; the
 * core's rings are covered by ticket wedges, which open their tickets, so the core
 * itself could not be the way in. And a "Release test" button under the name, because
 * the shelf's badges exist only for finished phases that owe tests again.
 */
function waysIn(model: OverviewModel, ctx: ScreenContext): { nodes: SceneNode[]; rows: ListRow[] } {
  const { cx, cy } = WHEEL;
  const unplaced = model.core.tickets.filter((id) => model.tickets[id] !== undefined && model.tickets[id]!.placedBy !== 'project-wide').length;
  const rephase = ctx.address({ page: 'rephase' });
  const rephaseLabel = `${unplaced} ticket${unplaced === 1 ? '' : 's'} with no phase: open re-phasing to place them`;
  const release = ctx.address({ flow: 'test-run' });
  const releaseLabel = 'The release test: every acceptance check, on every platform';
  const nodes: SceneNode[] = [
    {
      kind: 'group',
      key: 'rephase-button',
      target: rephase,
      label: rephaseLabel,
      children: [
        { kind: 'mark', tag: 'circle', attrs: { cx, cy, r: 42 }, cls: 'ov-control', markId: 'rephase-button', count: unplaced, label: rephaseLabel },
        { kind: 'text', x: cx, y: cy + 3, text: String(unplaced), rest: true, role: 'number', markRef: 'rephase-button', size: 19, anchor: 'middle' },
        { kind: 'text', x: cx, y: cy + 19, text: 'no phase', rest: true, role: 'label', size: 10, anchor: 'middle', cls: 'ov-dim' },
      ],
    },
    {
      kind: 'group',
      key: 'release-test',
      target: release,
      label: releaseLabel,
      children: [
        { kind: 'mark', tag: 'rect', attrs: { x: 34, y: 78, width: 150, height: 32, rx: 16 }, cls: 'ov-control', markId: 'release-test', label: releaseLabel },
        { kind: 'mark', tag: 'circle', attrs: { cx: 54, cy: 94, r: 9 }, cls: 'ov-wire' },
        { kind: 'mark', tag: 'circle', attrs: { cx: 54, cy: 94, r: 5 }, cls: 'ov-wire' },
        { kind: 'text', x: 72, y: 99, text: 'Release test', rest: true, role: 'control', size: 13 },
      ],
    },
  ];
  const rows: ListRow[] = [
    { id: 'rephase-button', label: rephaseLabel, group: 'Go to', target: rephase },
    { id: 'release-test', label: releaseLabel, group: 'Go to', target: release },
  ];
  return { nodes, rows };
}

export function wheelScene(model: OverviewModel, ctx: ScreenContext): Scene {
  const nodes: SceneNode[] = [];
  const list: ListRow[] = [];
  const n = model.phases.length;
  const usable = TAU - WHEEL.topGap - Math.max(0, n - 1) * WHEEL.sectorGap;
  const sector = n > 0 ? usable / n : 0;

  nodes.push(...frame(WHEEL.width, WHEEL.height), ...bezel(WHEEL.cx, WHEEL.cy, WHEEL.ringOuter + 40));
  nodes.push({ kind: 'text', x: 40, y: 56, text: model.workspace, rest: true, role: 'name', size: 22, cls: 'ov-title' });
  nodes.push(coreNodes(model, ctx));
  const ways = waysIn(model, ctx);
  nodes.push(...ways.nodes);
  list.push(...ways.rows);

  model.phases.forEach((phase, i) => {
    const a0 = WHEEL.topGap / 2 + i * (sector + WHEEL.sectorGap);
    nodes.push(...sectorNodes(model, phase, a0, a0 + sector, ctx));
  });

  // The shelf: finished phases, in order, under the wheel.
  const shelfY = 912;
  if (model.shelf.length > 0) {
    const pitch = Math.min(70, 860 / model.shelf.length);
    const x0 = 60;
    nodes.push({ kind: 'text', x: x0 - 20, y: shelfY - 50, text: 'Finished', rest: true, role: 'label', size: 12, cls: 'ov-dim ov-title' });
    model.shelf.forEach((phase, i) => nodes.push(disc(model, phase, x0 + 10 + i * pitch, shelfY, pitch, ctx)));
  }
  if (model.backlog.length > 0) {
    nodes.push({ kind: 'text', x: 1060, y: shelfY - 50, text: 'Backlog', rest: true, role: 'label', size: 12, cls: 'ov-dim ov-title' });
    nodes.push(...tray(model, model.backlog, 1060, shelfY - 38, 340, 84, ctx));
  }

  // The list twin: every phase, then every ticket under its place.
  const groupOf = (phase: Phase | null): string => (phase === null ? 'Project-wide and unplaced' : phaseLabel(phase));
  for (const phase of [...model.phases, ...model.shelf, ...model.backlog]) {
    const { closed, live } = closedOf(model, phase);
    list.push({ id: phase.id, label: `${phaseLabel(phase)} — ${closed} of ${live} closed, ${phase.status}`, group: 'Phases', target: ctx.address({ page: 'phase', note: phase.id }) });
  }
  const place = (ids: string[], phase: Phase | null): void => {
    for (const id of ids) {
      const t = model.tickets[id];
      if (t === undefined) continue;
      list.push({ id, label: rowWords(t), group: groupOf(phase), state: t.state, target: ctx.address({ page: 'ticket', note: id }) });
    }
  };
  for (const phase of [...model.phases, ...model.shelf, ...model.backlog]) place(phase.tickets, phase);
  place(model.core.tickets, null);

  return {
    screen: 'wheel',
    address: ctx.address({ page: 'wheel' }),
    width: WHEEL.width,
    height: WHEEL.height,
    title: `${model.workspace}: the overview`,
    nodes,
    list,
  };
}
