/**
 * S4, re-phase: which tickets have no phase, and where they would go
 * (PHASE-0005, FEAT-0028; DES-0004 plate 2).
 *
 * The phases are a ring of sectors. Each ticket with no phase is a particle.
 * A ticket with a suggestion waits in a cluster pointing at the sector it
 * would join, with a wire to it: solid when the suggestion came from links,
 * dashed when it came from dates. The ones nobody can place stay in the
 * middle. Accepting a group moves its particles into the sector, on screen
 * only: writing `phase:` into a note needs a sidecar action the cockpit does
 * not have (PHASE-0005, Out of scope).
 */
import { backControl, bezel, frame, heading } from './overview-chrome.js';
import { annularSector, arc, glyph, polar, TAU } from './overview-geometry.js';
import type { ListRow, SceneNode, Scene, ScreenContext } from './overview-scene.js';
import { allPhases, KIND_WORD, STATE_WORD, type OverviewModel, type Phase, type Ticket } from './overview-types.js';
import { phaseLabel, ticketLabel } from './overview-wheel.js';

export const REPHASE_SCREEN = { width: 1440, height: 1000, cx: 720, cy: 540, ringR: 360 } as const;

/** Tickets that could be given a phase: in the core, and not project-wide by rule. */
export function unplaced(model: OverviewModel): Ticket[] {
  return model.core.tickets
    .map((id) => model.tickets[id])
    .filter((t): t is Ticket => t !== undefined && t.placedBy !== 'project-wide');
}

export function rephaseScene(model: OverviewModel, ctx: ScreenContext, accepted: ReadonlySet<string> = new Set()): Scene {
  const { cx, cy, ringR } = REPHASE_SCREEN;
  const tickets = unplaced(model);
  const groups = new Map<string, Ticket[]>();
  const nowhere: Ticket[] = [];
  for (const t of tickets) {
    if (t.suggestion === undefined) nowhere.push(t);
    else groups.set(t.suggestion.phase, [...(groups.get(t.suggestion.phase) ?? []), t]);
  }

  // The ring: phases still to finish, and any other phase a suggestion names.
  const ringPhases: Phase[] = allPhases(model).filter((p) => p.kind === 'open' || groups.has(p.id));
  ringPhases.sort((a, b) => a.id.localeCompare(b.id));
  const gap = 0.03;
  const span = ringPhases.length > 0 ? (TAU - gap * ringPhases.length) / ringPhases.length : 0;
  const angleOf = new Map<string, [number, number]>();
  ringPhases.forEach((p, i) => angleOf.set(p.id, [gap / 2 + i * (span + gap), gap / 2 + i * (span + gap) + span]));

  const back = backControl(ctx, { page: 'wheel' }, 'Back to the wheel');
  const nodes: SceneNode[] = [back.node, ...heading('', 'Tickets with no phase')];
  const list: ListRow[] = [back.row];
  nodes.push(...frame(REPHASE_SCREEN.width, REPHASE_SCREEN.height), ...bezel(cx, cy, ringR + 96));


  for (const p of ringPhases) {
    const [a0, a1] = angleOf.get(p.id)!;
    const finished = p.kind !== 'open';
    nodes.push({
      kind: 'group',
      key: `ring-${p.id}`,
      target: ctx.address({ page: 'phase', note: p.id }),
      label: `${phaseLabel(p)} · ${p.status}`,
      children: [
        { kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, ringR, ringR + 26, a0, a1) }, cls: finished ? 'ov-track ov-faint' : 'ov-track', markId: `phase-${p.id}`, label: phaseLabel(p) },
        { kind: 'text', ...labelAt(cx, cy, ringR + 13, (a0 + a1) / 2, true), text: p.number, rest: true, role: 'id', size: 10, cls: 'ov-dim' },
      ],
    });
    list.push({ id: p.id, label: phaseLabel(p), group: 'Phases', target: ctx.address({ page: 'phase', note: p.id }) });
  }

  // Each suggestion group: a cluster on its sector's bearing, a wire, and a control.
  for (const [phaseId, members] of groups) {
    const range = angleOf.get(phaseId);
    if (range === undefined) continue;
    const [a0, a1] = range;
    const mid = (a0 + a1) / 2;
    const done = accepted.has(phaseId);
    const by = members[0]!.suggestion!.by;
    const children: SceneNode[] = [];
    members.forEach((t, i) => {
      let x: number;
      let y: number;
      if (done) {
        // Inside the sector: the move has happened, on screen.
        const per = Math.max(1, Math.floor(((a1 - a0) * (ringR + 13)) / 7));
        const a = a0 + (((i % per) + 0.5) * (a1 - a0)) / per;
        [x, y] = polar(cx, cy, ringR + 6 + Math.floor(i / per) * 7, a);
      } else {
        // Inside the sector's own bearing, from the cloud's edge outward.
        const inner = 150;
        const outer = ringR - 24;
        const width = (a1 - a0) * 0.86;
        const cols = Math.max(1, Math.floor((width * (inner + outer)) / 2 / 10));
        const rows = Math.ceil(members.length / cols);
        const radial = Math.min(14, (outer - inner) / Math.max(1, rows));
        const col = i % cols;
        const row = Math.floor(i / cols);
        const usedCols = Math.min(cols, members.length);
        const a = mid + (usedCols > 1 ? (col / (usedCols - 1) - 0.5) * width : 0);
        [x, y] = polar(cx, cy, outer - row * radial, a);
      }
      const shape = glyph(t.kind, x, y, done ? 2.6 : 4.2);
      children.push({ kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: t.id, state: t.state, label: ticketLabel(t) });
      list.push({ id: t.id, label: `${t.title} — ${STATE_WORD[t.state]} (${KIND_WORD[t.kind]}), suggested for ${phaseId} from ${t.suggestion!.by}`, group: `Suggested for ${phaseId}`, state: t.state, target: ctx.address({ page: 'ticket', note: t.id }) });
    });
    if (!done) {
      const [wx0, wy0] = polar(cx, cy, 130, mid);
      const [wx1, wy1] = polar(cx, cy, ringR - 4, mid);
      children.unshift({ kind: 'mark', tag: 'line', attrs: { x1: wx0, y1: wy0, x2: wx1, y2: wy1, 'stroke-dasharray': by === 'dates' ? '4 6' : 'none', 'stroke-width': 1.5 }, cls: 'ov-wire' });
      const [bx, by2] = polar(cx, cy, ringR + 62, mid);
      const controlId = `accept-${phaseId}`;
      children.push({
        kind: 'mark',
        tag: 'circle',
        attrs: { cx: bx, cy: by2, r: 17 },
        cls: 'ov-control ov-go',
        action: `rephase:${phaseId}`,
        markId: controlId,
        count: members.length,
        label: `Move ${members.length} into ${phaseId}`,
      });
      children.push({ kind: 'text', x: bx, y: by2 + 4, text: String(members.length), rest: true, role: 'number', markRef: controlId, size: 12, anchor: 'middle' });
      list.push({ id: controlId, label: `Move ${members.length} tickets into ${phaseId} (on screen only)`, group: 'Suggestions', action: `rephase:${phaseId}` });
    } else {
      children.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, ringR + 30, a0, a1), 'stroke-width': 3 }, cls: 'ov-arc glow', state: 'closed', label: `${members.length} moved into ${phaseId}, on screen only` });
    }
    nodes.push({ kind: 'group', key: `suggest-${phaseId}`, children });
  }

  // The ones nobody can place: a slow cloud in the middle.
  const cloud: SceneNode[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  nowhere.forEach((t, i) => {
    const r = 120 * Math.sqrt((i + 0.5) / Math.max(1, nowhere.length));
    const [x, y] = polar(cx, cy, r, i * golden);
    const shape = glyph(t.kind, x, y, 3.2);
    cloud.push({ kind: 'mark', tag: shape.tag, attrs: shape.attrs, ticket: t.id, state: t.state, cls: 'ov-faint', label: `${ticketLabel(t)} · no phase fits` });
    list.push({ id: t.id, label: `${t.title} — ${STATE_WORD[t.state]} (${KIND_WORD[t.kind]}), no phase fits`, group: 'Left for a person', state: t.state, target: ctx.address({ page: 'ticket', note: t.id }) });
  });
  nodes.push({ kind: 'group', key: 'nowhere', cls: 'ov-pulse', label: `${nowhere.length} tickets no phase fits`, children: cloud });

  return {
    screen: 'rephase',
    address: ctx.address({ page: 'rephase' }),
    width: REPHASE_SCREEN.width,
    height: REPHASE_SCREEN.height,
    title: 'Tickets with no phase, and where they would go',
    nodes,
    list,
  };
}

function labelAt(cx: number, cy: number, r: number, angle: number, centred = false): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const [x, y] = polar(cx, cy, r, angle);
  const s = Math.sin(angle);
  return { x, y: y + 4, anchor: centred || Math.abs(s) < 0.25 ? 'middle' : s > 0 ? 'start' : 'end' };
}
