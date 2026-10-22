/**
 * The shell's door to Deck's sessions (FEAT-0032, TASK-0196): the IPC calls a window of
 * the shell makes through the preload bridge, each argument checked here, and the
 * changes sent back to every window. A page served to the tablet has no bridge, so it
 * reaches none of this (RISK-0015), and Deck's host forwards none of the sidecar's
 * agent, session or approval routes.
 *
 * A workspace's folder always comes from Deck's own list of workspaces, never from the
 * window: a window names a workspace by its id, and Deck decides where that is.
 */
import { ACCESS_LEVELS, type AccessLevel, type AgentKind, type PermissionAnswer } from '../../shared/agent-types.js';
import type { SessionManager, StartRequest } from './sessions.js';
import { gatherNeeds } from './needs.js';
import { answerCockpitApproval, postCaughtUp } from '../../shared/write-client.js';
import { runGit } from './sessions.js';

type Handle = (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void;

const AGENTS: readonly AgentKind[] = ['claude', 'codex'];
const TICKET = /^[A-Z][A-Z0-9]*-\d+$/;
const SESSION = /^[\w-]{1,80}$/;
const WORD = /^[\w.:-]{0,64}$/;

/** A request to start a session, checked; or the reason it is refused. */
export function parseStart(raw: unknown, rootOf: (workspaceId: string) => string | null): StartRequest | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const workspaceId = typeof r['workspaceId'] === 'string' ? r['workspaceId'] : '';
  const root = rootOf(workspaceId);
  if (root === null) return 'no such workspace';
  const ticket = r['ticket'] === null || r['ticket'] === undefined ? null : String(r['ticket']);
  if (ticket !== null && !TICKET.test(ticket)) return 'not a ticket id';
  const agent = r['agent'] as AgentKind;
  if (!AGENTS.includes(agent)) return 'not an agent Deck runs';
  const access = (r['access'] ?? 'ask') as AccessLevel;
  if (!ACCESS_LEVELS.includes(access)) return 'not an access level Deck offers';
  const place = r['place'] === 'worktree' ? 'worktree' : r['place'] === 'checkout' || r['place'] === undefined ? 'checkout' : null;
  if (place === null) return 'not a place a session runs';
  const model = typeof r['model'] === 'string' ? r['model'] : '';
  const effort = typeof r['effort'] === 'string' ? r['effort'] : '';
  if (!WORD.test(model) || !WORD.test(effort)) return 'not a model or an effort';
  const prompt = typeof r['prompt'] === 'string' ? r['prompt'] : '';
  if (prompt.trim() === '' || prompt.length > 100_000) return 'a session starts with a prompt';
  return { workspaceId, root, ticket, agent, model, effort, access, place, prompt };
}

const sessionId = (v: unknown): string => {
  if (typeof v !== 'string' || !SESSION.test(v)) throw new Error('not a session id');
  return v;
};

/**
 * The cockpit's sessions, as the Agents list and the markers need them (TASK-0199): who, how it
 * stands, when, and which tickets it changed. Prompts, files and costs are left in the sidecar.
 */
export function cockpitSessionsOf(payload: unknown): { sessions: Array<Record<string, unknown>> } {
  const raw = ((payload ?? {}) as { sessions?: unknown }).sessions;
  const sessions = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  return {
    sessions: sessions.slice(0, 200).map((s) => ({
      session_id: String(s['session_id'] ?? ''), agent: s['agent'] === 'codex' ? 'codex' : 'claude', state: String(s['state'] ?? ''),
      started: s['started'] ?? null, ended: s['ended'] ?? null, live: s['live'] === true,
      status_touched: Object.fromEntries(Object.entries((s['status_touched'] ?? {}) as Record<string, { id?: unknown; ts?: unknown }>)
        .map(([k, v], i) => [String(i), { id: String(v?.id ?? ''), ts: String(v?.ts ?? '') }]).filter(([, v]) => (v as { id: string }).id !== '')),
    })),
  };
}

export interface CockpitAnswering {
  /** The secret of a sidecar Deck started for the workspace; null for a borrowed one or none. */
  secretFor(workspaceId: string): string | null;
  actor(): string;
  answer?: typeof answerCockpitApproval;
  caughtUp?: typeof postCaughtUp;
}

export function registerAgentCalls(handle: Handle, manager: SessionManager, rootOf: (workspaceId: string) => string | null, cockpitBase: (workspaceId: string) => string | null = () => null, cockpit: CockpitAnswering = { secretFor: () => null, actor: () => '' }): void {
  const cockpitAnswerable = (workspaceId: string): boolean => cockpitBase(workspaceId) !== null && cockpit.secretFor(workspaceId) !== null;
  handle('deck:agents:list', () => manager.list());
  // Caught up (TASK-0203): the digest's own time, written by the main process to the workspace's sidecar.
  handle('deck:cockpit:caught-up', async (_e, workspaceId, at) => {
    if (typeof workspaceId !== 'string' || typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}T[\d:.+\-Z]{0,40}$/.test(at)) return { ok: false, error: 'Caught up names a workspace and the digest\'s time' };
    const base = cockpitBase(workspaceId);
    if (base === null) return { ok: false, error: 'no sidecar for that workspace' };
    try {
      const res = await (cockpit.caughtUp ?? postCaughtUp)(base, at);
      return res.ok ? { ok: true } : { ok: false, error: `the sidecar answered ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  // One of the cockpit's requests, answered from Deck (TASK-0204): only with a sidecar Deck started, whose
  // secret the main process alone holds. The window sends the approval's id and the answer, nothing more.
  handle('deck:agents:cockpit-answer', async (_e, workspaceId, approvalId, allow) => {
    if (typeof workspaceId !== 'string' || typeof approvalId !== 'string' || !/^[\w-]{1,64}$/.test(approvalId) || typeof allow !== 'boolean') return { ok: false, error: 'an answer names a request and allows or denies' };
    const base = cockpitBase(workspaceId);
    const secret = cockpit.secretFor(workspaceId);
    if (base === null || secret === null) return { ok: false, error: 'Deck did not start this sidecar, so answer in the cockpit' };
    // A permission decision is somebody's: the sidecar refuses one with no actor, and so does Deck.
    const actor = cockpit.actor();
    if (actor === '') return { ok: false, error: 'Deck has no name to answer as; set one first' };
    try {
      const res = await (cockpit.answer ?? answerCockpitApproval)(base, secret, { approval_id: approvalId, decision: allow ? 'granted' : 'denied', actor });
      const said = (res.json as { error?: unknown } | null)?.error;
      return res.ok ? { ok: true } : { ok: false, error: typeof said === 'string' ? said : `the sidecar answered ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  // What Needs you shows beyond the tickets (TASK-0202): the open requests, Deck's and the cockpit's, and git.
  handle('deck:agents:needs', async (_e, workspaceId) => {
    if (typeof workspaceId !== 'string' || rootOf(workspaceId) === null) return { ok: false, error: 'no such workspace' };
    const needs = await gatherNeeds(workspaceId, {
      sessions: manager.list(), conversation: (id) => manager.conversation(id), root: rootOf(workspaceId), base: cockpitBase(workspaceId),
      getJson: async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`the sidecar answered ${res.status}`);
        return res.json();
      },
      git: runGit, cockpitAnswerable: cockpitAnswerable(workspaceId),
    });
    return { ok: true, needs };
  });
  // The cockpit's own sessions, read by the main process: Deck's served host forwards no session route (TASK-0196).
  handle('deck:agents:cockpit', async (_e, workspaceId) => {
    const base = typeof workspaceId === 'string' ? cockpitBase(workspaceId) : null;
    if (base === null) return { ok: false, error: 'no sidecar for that workspace' };
    try {
      const res = await fetch(`${base}/api/cockpit/sessions`);
      if (!res.ok) return { ok: false, error: `the sidecar answered ${res.status}` };
      return { ok: true, ...cockpitSessionsOf(await res.json()) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  handle('deck:agents:conversation', (_e, id) => manager.conversation(sessionId(id)));
  handle('deck:agents:start', async (_e, raw) => {
    const req = parseStart(raw, rootOf);
    if (typeof req === 'string') return { ok: false, error: req };
    return { ok: true, session: await manager.start(req) };
  });
  handle('deck:agents:send', async (_e, id, text) => {
    if (typeof text !== 'string' || text.trim() === '' || text.length > 100_000) return { ok: false, error: 'a prompt is text' };
    await manager.send(sessionId(id), text);
    return { ok: true };
  });
  handle('deck:agents:answer', (_e, id, permission, answer) => {
    const a = (answer ?? {}) as Record<string, unknown>;
    if (typeof permission !== 'string' || typeof a['allow'] !== 'boolean') return { ok: false, error: 'an answer allows or denies' };
    const reply: PermissionAnswer = a['allow'] ? { allow: true } : { allow: false, ...(typeof a['message'] === 'string' ? { message: a['message'].slice(0, 500) } : {}) };
    return { ok: manager.answer(sessionId(id), permission, reply) };
  });
  handle('deck:agents:interrupt', async (_e, id) => {
    await manager.interrupt(sessionId(id));
    return { ok: true };
  });
  handle('deck:agents:stop', async (_e, id) => {
    await manager.stop(sessionId(id));
    return { ok: true };
  });
}
