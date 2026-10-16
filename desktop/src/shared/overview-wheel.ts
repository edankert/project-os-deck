/**
 * S1, the wheel: the overview Deck opens on (PHASE-0005, FEAT-0027).
 *
 * Since 2026-10-16 the wheel is the towers on the ring of DES-0005's towers page
 * (TASK-0166): each phase still to finish a raised segment, each feature a tower
 * of its tickets, the phase and the feature in focus lit, the exit criteria a
 * collar round each phase's rim. Where everything stands is `towersLayout`; the
 * renderer draws it in 3D (TASK-0167), and this scene draws it flat, as marks,
 * for the screen checks, the list twin, the plates and a window with no WebGL.
 *
 * **Every ticket in the model is drawn exactly once**, as a mark carrying its id,
 * and the list twin holds the same ids. The only words at rest are the
 * workspace's name, each phase's number and short name, the core's "no phase",
 * "Release test", "in focus" and "next"; everything else is on hover.
 */
import { frame } from './overview-chrome.js';
import { markWords } from './overview-marks.js';
import type { ListRow, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import { TOWERS_PLAN, towersLayout, towersPlan } from './overview-towers.js';
import type { OverviewModel, Phase, Ticket } from './overview-types.js';

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

/**
 * The two ways in that are not a phase: the core's middle opens re-phasing, with
 * the number of tickets that have no phase, and a button opens the release test
 * (TASK-0152). Both are in the list twin.
 */
function waysIn(model: OverviewModel, ctx: ScreenContext, centre: { x: number; y: number; r: number }): { nodes: SceneNode[]; rows: ListRow[] } {
  const unplaced = model.core.tickets.filter((id) => model.tickets[id] !== undefined && model.tickets[id]!.placedBy !== 'project-wide').length;
  const rephase = ctx.address({ page: 'rephase' });
  const rephaseLabel = `${unplaced} ticket${unplaced === 1 ? '' : 's'} with no phase: open re-phasing to place them`;
  const release = ctx.address({ flow: 'test-run' });
  const releaseLabel = 'The release test: every acceptance check, on every platform';
  const { x: cx, y: cy, r } = centre;
  const nodes: SceneNode[] = [
    {
      kind: 'group',
      key: 'rephase-button',
      target: rephase,
      label: rephaseLabel,
      children: [
        { kind: 'mark', tag: 'ellipse', attrs: { cx, cy, rx: r, ry: r * 0.56 }, cls: 'ov-control', markId: 'rephase-button', count: unplaced, label: rephaseLabel },
        { kind: 'text', x: cx, y: cy + 2, text: String(unplaced), rest: true, role: 'number', markRef: 'rephase-button', size: 17, anchor: 'middle' },
        { kind: 'text', x: cx, y: cy + 15, text: 'no phase', rest: true, role: 'label', size: 10, anchor: 'middle', cls: 'ov-dim' },
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
  const layout = towersLayout(model, ctx);
  const plan = towersPlan(layout);
  const ways = waysIn(model, ctx, plan.centre);
  return {
    screen: 'wheel',
    address: ctx.address({ page: 'wheel' }),
    width: TOWERS_PLAN.width,
    height: TOWERS_PLAN.height,
    title: `${model.workspace}: the overview`,
    nodes: [
      ...frame(TOWERS_PLAN.width, TOWERS_PLAN.height),
      { kind: 'text', x: 40, y: 56, text: model.workspace, rest: true, role: 'name', size: 22, cls: 'ov-title' },
      ...plan.nodes,
      ...ways.nodes,
      { kind: 'towers', layout },
    ],
    list: [...ways.rows, ...plan.rows],
  };
}
