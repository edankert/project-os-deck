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
import { annularSector, arc, polar, shortName, TAU } from './overview-geometry.js';
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
  coreInner: 30,
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

function sectorNodes(model: OverviewModel, phase: Phase, a0: number, a1: number, ctx: ScreenContext): SceneNode[] {
  const nodes: SceneNode[] = [];
  const { cx, cy } = WHEEL;
  const children: SceneNode[] = [];
  const lit: MarkNode[] = [];
  PHASE_KINDS.forEach((kind, k) => {
    const [r0, r1] = ringBand(k, PHASE_KINDS.length, WHEEL.ringInner, WHEEL.ringOuter, WHEEL.ringGap);
    children.push({ kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, r0, r1, a0, a1) }, cls: 'ov-track' });
    const wedges = ringWedges(model, ctx, idsOfKind(model, phase.tickets, kind), r0, r1, a0, a1, WHEEL.maxShare);
    children.push(...wedges.plain);
    lit.push(...wedges.lit);
  });
  if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });

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

function coreNodes(model: OverviewModel, ctx: ScreenContext): SceneNode {
  const children: SceneNode[] = [];
  const lit: MarkNode[] = [];
  const { cx, cy } = WHEEL;
  CORE_KINDS.forEach((kind, k) => {
    const [r0, r1] = ringBand(k, CORE_KINDS.length, WHEEL.coreInner, WHEEL.coreOuter, 2);
    children.push({ kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, r0, r1, 0, TAU) }, cls: 'ov-track' });
    const wedges = ringWedges(model, ctx, idsOfKind(model, model.core.tickets, kind), r0, r1, 0, TAU, 0.1);
    children.push(...wedges.plain);
    lit.push(...wedges.lit);
  });
  if (lit.length > 0) children.push({ kind: 'group', cls: 'glow', children: lit });
  const suggested = model.core.tickets.filter((id) => model.tickets[id]?.suggestion !== undefined).length;
  return {
    kind: 'group',
    key: 'core',
    cls: 'ov-core',
    target: ctx.address({ page: 'rephase' }),
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

export function wheelScene(model: OverviewModel, ctx: ScreenContext): Scene {
  const nodes: SceneNode[] = [];
  const list: ListRow[] = [];
  const n = model.phases.length;
  const usable = TAU - WHEEL.topGap - Math.max(0, n - 1) * WHEEL.sectorGap;
  const sector = n > 0 ? usable / n : 0;

  nodes.push(...frame(WHEEL.width, WHEEL.height), ...bezel(WHEEL.cx, WHEEL.cy, WHEEL.ringOuter + 40));
  nodes.push({ kind: 'text', x: 40, y: 56, text: model.workspace, rest: true, role: 'name', size: 22, cls: 'ov-title' });
  nodes.push(coreNodes(model, ctx));

  model.phases.forEach((phase, i) => {
    const a0 = WHEEL.topGap / 2 + i * (sector + WHEEL.sectorGap);
    nodes.push(...sectorNodes(model, phase, a0, a0 + sector, ctx));
  });

  // Ring initials, in the gap at twelve o'clock.
  PHASE_KINDS.forEach((kind, k) => {
    const [r0, r1] = ringBand(k, PHASE_KINDS.length, WHEEL.ringInner, WHEEL.ringOuter, WHEEL.ringGap);
    const [x, y] = polar(WHEEL.cx, WHEEL.cy, (r0 + r1) / 2, 0);
    nodes.push({ kind: 'text', x, y: y + 4, text: INITIAL[kind], rest: true, role: 'label', size: 11, anchor: 'middle', cls: 'ov-dim' });
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
