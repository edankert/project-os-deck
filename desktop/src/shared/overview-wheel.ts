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
import { nextUpPanel } from './overview-board.js';
import { needsPanel, todayOf, weeksPanel } from './overview-needs.js';
import { selectionPanels } from './overview-select.js';
import { agentsPanel } from './agent-marks.js';
import { cockpitPanel } from './overview-cockpit.js';
import { TOWERS_PLAN, towersLayout, towersPlan, type TowersOptions } from './overview-towers.js';
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

/** Where a selected ticket's card and pane stand on the wheel (TASK-0182): the card under the name, the pane at the right. */
export const WHEEL_SELECTION = { card: { x: 40, y: 128, w: 400, h: 290 }, pane: { x: 1010, y: 96, w: 400, h: 870 } } as const;
/** What needs you, top right, and the year as weeks, bottom right (TASK-0184); a selected ticket's pane takes their place. */
export const WHEEL_NEEDS = { x: 1090, y: 96, w: 320, h: 330 } as const;
export const WHEEL_WEEKS = { x: 1090, y: 730, w: 320, h: 170 } as const;
/** The Agents list, left middle (FEAT-0033, TASK-0199): between a selected ticket's card and the board. */
export const WHEEL_AGENTS = { x: 40, y: 430, w: 420, h: 196 } as const;
/** The cockpit's overview panels, top left (TASK-0203); hidden, the Agents list moves up into their place. */
export const WHEEL_COCKPIT = { x: 40, y: 150, w: 420, h: 270 } as const;
export const WHEEL_AGENTS_UP = { x: 40, y: 150, w: 420, h: 196 } as const;
/** The next-up board, bottom left (TASK-0183). */
export const WHEEL_BOARD = { x: 40, y: 640, w: 420, h: 330 } as const;

export function wheelScene(model: OverviewModel, ctx: ScreenContext, options: TowersOptions = {}): Scene {
  const layout = towersLayout(model, ctx, null, options);
  const plan = towersPlan(layout);
  const ways = waysIn(model, ctx, plan.centre);
  const selected = selectionPanels(model, layout, ctx, WHEEL_SELECTION, { workOn: options.agents !== undefined });
  const board = nextUpPanel(model, layout, ctx, WHEEL_BOARD);
  // The session pane stands at the right as a selected ticket's pane does; the panels there make way for either.
  // The open session comes from the address, not from its marker: a session on no ticket, or on one off the ring,
  // has no marker and is still open (review, round one). A page with no sessions to show opens none.
  const session = options.agents !== undefined ? options.session ?? null : null;
  const right = layout.selection !== null || session !== null ? [] : [needsPanel(model, ctx, WHEEL_NEEDS, options.agents !== undefined && options.needs !== undefined ? { needs: options.needs, agents: options.agents } : undefined), weeksPanel(model, options.today ?? todayOf(model), WHEEL_WEEKS)];
  // Every agent session, in the shell only: a page given no sessions to show has no list (RISK-0015). While a
  // session is open the ring moves left of its pane, so the panels on the left make way too, and its marker and
  // curves stand clear; closing the pane brings them back (TASK-0201's walk).
  // The cockpit's four panels stand top left unless hidden, or a selected ticket's card or an open session needs the room.
  const showCockpit = options.overviewPanels !== false && session === null && layout.selection === null;
  const cockpit = showCockpit ? cockpitPanel(model, ctx, WHEEL_COCKPIT, options.digest, options.caughtUp === true) : null;
  const agents = options.agents === undefined || session !== null ? null : agentsPanel(options.agents, ctx, session, options.overviewPanels === false && layout.selection === null ? WHEEL_AGENTS_UP : WHEEL_AGENTS);
  const left = session === null ? [...(cockpit === null ? [] : [cockpit]), board] : [];
  const sel = layout.selection;
  // Escape clears the selection: the overview goes to the screen a row with id `back` names.
  const back: ListRow[] = sel === null ? [] : [{ id: 'back', label: `Clear the selection of ${sel.id}`, group: 'Go to', target: ctx.address({ page: 'wheel' }) }];
  return {
    screen: 'wheel',
    address: ctx.address({ page: 'wheel', select: sel?.id ?? null, session }),
    width: TOWERS_PLAN.width,
    height: TOWERS_PLAN.height,
    title: sel === null ? `${model.workspace}: the overview` : `${model.workspace}: the overview, ${sel.id} selected`,
    nodes: [
      ...frame(TOWERS_PLAN.width, TOWERS_PLAN.height),
      { kind: 'text', x: 40, y: 56, text: model.workspace, rest: true, role: 'name', size: 22, cls: 'ov-title' },
      ...plan.nodes,
      ...ways.nodes,
      ...left.map((p) => p.node),
      ...right.map((p) => p.node),
      ...(agents === null ? [] : [agents.node]),
      ...selected.nodes,
      { kind: 'towers', layout },
    ],
    list: [...back, ...(session !== null && sel === null ? [{ id: 'back', label: 'Close the session', group: 'Go to', target: ctx.address({ page: 'wheel' }) }] : []), ...selected.rows, ...right.flatMap((p) => p.rows), ...(agents?.rows ?? []), ...left.flatMap((p) => p.rows), ...ways.rows, ...plan.rows],
  };
}
