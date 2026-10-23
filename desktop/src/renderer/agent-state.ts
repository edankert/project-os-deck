/**
 * The agent sessions the overview draws (FEAT-0033, TASK-0199): Deck's own, from the main
 * process, and the cockpit's, which the main process reads from the workspace's sidecar.
 *
 * The scenes are drawn synchronously from what this holds; when what a marker or the
 * Agents list shows changes, the overview is asked to draw again. On a served page there
 * is no bridge, `agentsFor` answers undefined, and no scene draws an agent (RISK-0015).
 */
import type { AgentBridge } from './host-bridge.js';
import type { SessionRecord } from '../shared/agent-types.js';
import { allSummaries, cockpitSummaries, deckSummaries, type AgentSummary } from '../shared/agent-marks.js';
import type { OverviewModel } from '../shared/overview-types.js';
import type { AgentNeeds } from '../shared/agent-needs.js';

/** How often the cockpit's sessions are read again while the overview is open. */
const COCKPIT_EVERY_MS = 15_000;

let bridge: AgentBridge | null = null;
let deck: SessionRecord[] = [];
const cockpit = new Map<string, unknown>();
const needs = new Map<string, AgentNeeds | null>();
let redraw: () => void = () => undefined;
let lastShape = '';
let pending: ReturnType<typeof setTimeout> | null = null;

/** Start following the sessions; `onChange` draws the overview again. Once only. */
export function watchAgents(agents: AgentBridge | null, onChange: () => void): void {
  if (bridge !== null || agents === null) return;
  bridge = agents;
  redraw = onChange;
  void reloadDeck();
  // A session's state or start changes its marker; a record within a turn does not.
  agents.subscribe((raw) => {
    const kind = (raw as { change?: { kind?: string } }).change?.kind;
    if (kind === 'session') void reloadDeck();
    // A request opened or answered changes Needs you.
    if (kind === 'session' || (raw as { change?: { record?: { kind?: string } } }).change?.record?.kind === 'permission') for (const workspaceId of needs.keys()) void reloadNeeds(workspaceId);
  });
  setInterval(() => {
    for (const workspaceId of cockpit.keys()) void reloadCockpit(workspaceId);
    for (const workspaceId of needs.keys()) void reloadNeeds(workspaceId);
  }, COCKPIT_EVERY_MS);
}

/** Every session on a workspace, Deck's and the cockpit's; undefined where the host has none to give. */
export function agentsFor(workspaceId: string, model: Pick<OverviewModel, 'tickets'>): AgentSummary[] | undefined {
  if (bridge === null) return undefined;
  if (!cockpit.has(workspaceId)) {
    cockpit.set(workspaceId, null);
    void reloadCockpit(workspaceId);
  }
  const mine = deckSummaries(deck, workspaceId, cockpit.get(workspaceId), model);
  return allSummaries(mine, cockpitSummaries(cockpit.get(workspaceId), model, new Set(mine.map((s) => s.id))));
}

/** The requests and git state Needs you shows; undefined where the host has none to give. */
export function needsFor(workspaceId: string): AgentNeeds | undefined {
  if (bridge === null || bridge.needs === undefined) return undefined;
  if (!needs.has(workspaceId)) {
    needs.set(workspaceId, null);
    void reloadNeeds(workspaceId);
  }
  return needs.get(workspaceId) ?? { requests: [], answered: null, git: null };
}

async function reloadNeeds(workspaceId: string): Promise<void> {
  if (bridge?.needs === undefined) return;
  const res = (await bridge.needs(workspaceId).catch(() => null)) as { ok?: boolean; needs?: AgentNeeds } | null;
  if (res?.ok === true && res.needs !== undefined) needs.set(workspaceId, res.needs);
  changed();
}

/** One summary by session id, for the pane to open a cockpit session. */
export function summaryOf(workspaceId: string, model: Pick<OverviewModel, 'tickets'>, id: string): AgentSummary | undefined {
  return agentsFor(workspaceId, model)?.find((s) => s.id === id);
}

async function reloadDeck(): Promise<void> {
  if (bridge === null) return;
  deck = ((await bridge.list().catch(() => [])) as SessionRecord[]) ?? [];
  changed();
}

async function reloadCockpit(workspaceId: string): Promise<void> {
  if (bridge?.cockpit === undefined) return;
  const res = (await bridge.cockpit(workspaceId).catch(() => null)) as { ok?: boolean } | null;
  // A sidecar that cannot be read leaves what was read before.
  if (res?.ok === true) cockpit.set(workspaceId, res);
  changed();
}

/** Draw again, once, only when what the markers and the list show has changed. */
function changed(): void {
  const shape = JSON.stringify([
    deck.map((s) => [s.id, s.workspaceId, s.state, s.ticket]),
    // The tickets a session moved draw its curves and its count, so a new one draws again.
    [...cockpit.entries()].map(([k, v]) => [k, ((v as { sessions?: Array<{ session_id: string; state: string; ended: unknown; status_touched?: Record<string, unknown> }> } | null)?.sessions ?? []).map((s) => [s.session_id, s.state, s.ended, Object.keys(s.status_touched ?? {}).length])]),
    [...needs.entries()],
  ]);
  if (shape === lastShape) return;
  lastShape = shape;
  if (pending !== null) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    redraw();
  }, 150);
}
