/**
 * Agents on the towers and in the Agents list (FEAT-0033, TASK-0199; DES-0006).
 *
 * Every session a workspace has, Deck's own and the cockpit's, as one short summary: its
 * agent, its state, the ticket it stands over and the tickets it moved. A session Deck
 * started stands over its exact start ticket. The cockpit records no start ticket, so one
 * of its sessions stands over the first ticket whose status it changed, in the order the
 * cockpit first saw each change (Edwin, 2026-10-22: "The ones they started on").
 *
 * Where a marker stands comes from the towers' own layout, so it follows the grouping.
 */
import type { AgentKind, SessionRecord, SessionState } from './agent-types.js';
import { cubesOf, type TowerLink, type TowerSelection, type TowersLayout } from './overview-towers.js';
import type { OverviewModel } from './overview-types.js';
import type { ListRow, PanelAgents, PanelNode, ScreenContext } from './overview-scene.js';
import { EFFORTS, MODELS, STATE_WORD } from './agent-pane.js';

export interface AgentSummary {
  id: string;
  agent: AgentKind;
  state: SessionState;
  /** The ticket it stands over; null when it moved no ticket the workspace holds. */
  start: string | null;
  /** Every ticket it worked on, the start first. */
  tickets: string[];
  last: string;
  /** Deck's own session, or one the cockpit recorded (read only: Deck cannot send to it). */
  source: 'deck' | 'cockpit';
}

/** The ticket a session was started on: the first whose status it changed, else the first it touched (DES-0006's `startOf`). */
export function startOf(session: { changed?: ReadonlyArray<readonly [string, ...unknown[]]>; tickets?: readonly string[] }): string | null {
  return session.changed?.[0]?.[0] ?? session.tickets?.[0] ?? null;
}

/** Deck's own sessions as summaries: each over the ticket it was started for. */
export function deckSummaries(sessions: readonly SessionRecord[], workspaceId: string): AgentSummary[] {
  return sessions.filter((s) => s.workspaceId === workspaceId).map((s) => ({
    id: s.id, agent: s.agent, state: s.state, start: s.ticket, tickets: s.ticket === null ? [] : [s.ticket], last: s.lastActive, source: 'deck' as const,
  }));
}

const STATES: Readonly<Record<string, SessionState>> = { busy: 'working', working: 'working', 'needs-input': 'waiting', waiting: 'waiting', idle: 'idle' };

/**
 * The cockpit's sessions from its sidecar's `/api/cockpit/sessions`, as summaries, leaving out
 * those Deck reported itself (the same id). Only tickets the model holds count.
 */
export function cockpitSummaries(payload: unknown, model: Pick<OverviewModel, 'tickets'>, deckIds: ReadonlySet<string>, keep = 10): AgentSummary[] {
  const sessions = ((payload ?? {}) as { sessions?: unknown[] }).sessions ?? [];
  const out: AgentSummary[] = [];
  for (const raw of sessions as Array<Record<string, unknown>>) {
    const id = String(raw['session_id'] ?? '');
    if (id === '' || deckIds.has(id)) continue;
    // In the order the cockpit first saw each change, so the first is the ticket it started on.
    const touched = Object.values((raw['status_touched'] ?? {}) as Record<string, { id?: unknown; ts?: unknown }>)
      .map((c) => ({ id: String(c?.id ?? ''), ts: String(c?.ts ?? '') }))
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .map((c) => c.id).filter((t) => model.tickets[t] !== undefined);
    const tickets = [...new Set(touched)];
    const ended = raw['ended'] !== null && raw['ended'] !== undefined && raw['live'] !== true;
    out.push({
      id, agent: raw['agent'] === 'codex' ? 'codex' : 'claude', state: ended ? 'idle' : STATES[String(raw['state'] ?? 'idle')] ?? 'idle',
      start: startOf({ tickets }), tickets, last: String(raw['ended'] ?? raw['started'] ?? ''), source: 'cockpit',
    });
  }
  return out.sort((a, b) => b.last.localeCompare(a.last)).slice(0, keep);
}

export interface AgentMarker {
  id: string;
  agent: AgentKind;
  state: SessionState;
  ticket: string;
  /** Over the tower's top or the tile, spread a little when several stand over one place. */
  at: [number, number, number];
  /** The segment it stands in, or null on the shelf and in the core. */
  segment: string | null;
  label: string;
  target: string;
}

/** Each session's marker over its start ticket; a session whose ticket is not on the ring has none (it is in the Agents list). */
export function agentMarkers(layout: TowersLayout, summaries: readonly AgentSummary[], target: (id: string) => string): AgentMarker[] {
  const over = new Map<string, { at: [number, number, number]; key: string; segment: string | null }>();
  for (const p of layout.phases) {
    for (const tw of p.towers) for (const c of tw.cubes) over.set(c.id, { at: [tw.x, tw.top + 8, tw.z], key: `t:${tw.feature}`, segment: p.id });
    for (const c of p.tiles) over.set(c.id, { at: [c.x, c.y + 6, c.z], key: `c:${c.id}`, segment: p.id });
  }
  for (const c of cubesOf(layout)) if (!over.has(c.id)) over.set(c.id, { at: [c.x, c.y + 6, c.z], key: `c:${c.id}`, segment: null });
  const crowd = new Map<string, number>();
  const out: AgentMarker[] = [];
  for (const s of summaries) {
    if (s.start === null) continue;
    const place = over.get(s.start);
    if (place === undefined) continue;
    const n = crowd.get(place.key) ?? 0;
    crowd.set(place.key, n + 1);
    const word = s.agent === 'codex' ? 'Codex' : 'Claude';
    out.push({
      id: s.id, agent: s.agent, state: s.state, ticket: s.start, segment: place.segment,
      at: [place.at[0], place.at[1] + n * 2.6, place.at[2]],
      label: `${word} ${s.id.slice(0, 8)}, ${s.state === 'waiting' ? 'waiting for you' : s.state}, on ${s.start}${s.tickets.length > 1 ? ` and ${s.tickets.length - 1} more` : ''}${s.source === 'cockpit' ? ' (a cockpit session)' : ''}. Press to open it.`,
      target: target(s.id),
    });
  }
  return out;
}

/** An open session drawn as a selection is: curves from its marker to each ticket it worked on (TASK-0199). */
export function sessionSelection(layout: TowersLayout, marker: AgentMarker, tickets: readonly string[], model: Pick<OverviewModel, 'tickets'>): TowerSelection {
  const at = new Map([...cubesOf(layout)].map((c) => [c.id, [c.x, c.y, c.z] as [number, number, number]]));
  const links: TowerLink[] = tickets.filter((t) => at.has(t) && model.tickets[t] !== undefined).map((t) => ({ id: t, type: model.tickets[t]!.type, from: marker.at, to: at.get(t)!, out: true, in: false }));
  return { id: `session:${marker.id}`, at: marker.at, links, total: links.length, labelled: links.length <= 40 };
}

/** Deck's sessions and the cockpit's, one list: those waiting for you first, then the most recently active. */
export function allSummaries(deck: readonly AgentSummary[], cockpit: readonly AgentSummary[]): AgentSummary[] {
  const rank = (s: AgentSummary): number => (s.state === 'waiting' ? 0 : s.state === 'working' ? 1 : 2);
  return [...deck, ...cockpit].sort((a, b) => rank(a) - rank(b) || b.last.localeCompare(a.last));
}

/** The address that opens a session in the pane, on the wheel. */
export const sessionTarget = (ctx: ScreenContext, id: string): string => ctx.address({ page: 'wheel', session: id });

/** The Agents list, on the wheel's left (TASK-0199): every session, a row each, at most `keep` drawn. */
export function agentsPanel(summaries: readonly AgentSummary[], ctx: ScreenContext, open: string | null, place: { x: number; y: number; w: number; h: number }, keep = 5): { node: PanelNode; rows: ListRow[] } {
  const rows: PanelAgents['rows'] = summaries.map((s) => {
    const word = s.agent === 'codex' ? 'Codex' : 'Claude';
    const more = Math.max(0, s.tickets.length - 1);
    return {
      id: s.id, agent: s.agent, state: s.state, word: STATE_WORD[s.state], start: s.start, more, last: s.last, source: s.source, open: s.id === open,
      target: sessionTarget(ctx, s.id),
      label: `${word} ${s.id.slice(0, 8)}, ${STATE_WORD[s.state]}${s.start === null ? ', on no ticket' : `, on ${s.start}${more > 0 ? ` and ${more} more` : ''}`}${s.source === 'cockpit' ? ', a cockpit session' : ''}: open it`,
    };
  });
  const waiting = summaries.filter((s) => s.state === 'waiting').length;
  return {
    node: { kind: 'panel', key: 'agents', ...place, label: `${summaries.length} agent session${summaries.length === 1 ? '' : 's'}${waiting > 0 ? `, ${waiting} waiting for you` : ''}`, body: { kind: 'agents', rows: rows.slice(0, keep) } },
    rows: rows.map((r) => ({ id: `agent-${r.id}`, label: r.label, group: 'Agents', target: r.target })),
  };
}

/**
 * The first prompt Work on this fills in (TASK-0200, DES-0006): the ticket's own words. What it
 * asks of you when it needs you, else "Work on" with its id and title. The person can change it.
 */
export function firstPrompt(t: { id: string; title: string; needsYou?: boolean; needs?: { say: string } }): string {
  return t.needsYou === true && t.needs !== undefined && t.needs.say.trim() !== '' ? `${t.id} ${t.title}: ${t.needs.say}` : `Work on ${t.id}: ${t.title}`;
}

/** What Work on this's dialog starts with: Claude, its first model and effort, Ask before acting, this checkout. */
export function startDefaults(t: Parameters<typeof firstPrompt>[0]): { agent: 'claude'; model: string; effort: string; access: 'ask'; place: 'checkout'; prompt: string } {
  return { agent: 'claude', model: MODELS.claude[0]!.id, effort: EFFORTS.claude[0]!, access: 'ask', place: 'checkout', prompt: firstPrompt(t) };
}
