/**
 * What Needs you shows beyond the tickets (FEAT-0034, TASK-0202), gathered by the main process
 * for one workspace: the open permission requests of Deck's own sessions, the cockpit's from its
 * sidecar's loopback-only `/api/cockpit/approvals`, the last request answered, and the work not
 * pushed. The window gets this through the shell's bridge; the served host has no route to it.
 */
import { latest, openRequests, type SessionRecord } from '../../shared/agent-types.js';
import type { AgentNeeds, NeedsRequest } from '../../shared/agent-needs.js';
import type { GitRunner } from './sessions.js';

export interface NeedsSources {
  sessions: readonly SessionRecord[];
  conversation(id: string): ReturnType<typeof latest>;
  /** The repository; null for a workspace Deck does not know. */
  root: string | null;
  /** The workspace's sidecar, or null when there is none. */
  base: string | null;
  getJson(url: string): Promise<unknown>;
  git: GitRunner;
  /** Whether Deck can answer the cockpit's requests here: only with the sidecar's shell secret (TASK-0204). */
  cockpitAnswerable: boolean;
}

export async function gatherNeeds(workspaceId: string, s: NeedsSources): Promise<AgentNeeds> {
  const mine = s.sessions.filter((x) => x.workspaceId === workspaceId);
  const deckIds = new Set(s.sessions.map((x) => x.id));
  const requests: NeedsRequest[] = [];
  let answered: AgentNeeds['answered'] = null;
  let answeredAt = '';
  for (const session of mine) {
    const records = s.conversation(session.id);
    // Only a session at work can still be answered; a request left open by a restart cannot.
    if (session.state === 'waiting') {
      for (const r of openRequests(records)) requests.push({ id: r.id, session: session.id, agent: session.agent, tool: r.tool, summary: r.summary, source: 'deck', answerable: true, ticket: session.ticket });
    }
    for (const r of latest(records)) {
      if (r.kind === 'permission' && r.outcome !== 'open' && r.at > answeredAt) {
        answeredAt = r.at;
        answered = { tool: r.tool, summary: r.summary, outcome: r.outcome, source: 'deck' };
      }
    }
  }
  if (s.base !== null) {
    const payload = (await s.getJson(`${s.base}/api/cockpit/approvals`).catch(() => null)) as { approvals?: Array<Record<string, unknown>> } | null;
    for (const a of payload?.approvals ?? []) {
      const session = String(a['session_id'] ?? '');
      // Deck's own requests, which it offered to the cockpit, are listed once, as Deck's.
      if (a['status'] !== 'open' || deckIds.has(session)) continue;
      requests.push({ id: String(a['approval_id'] ?? ''), session, agent: a['agent'] === 'codex' ? 'codex' : 'claude', tool: String(a['tool'] ?? ''), summary: String(a['prompt'] ?? '').slice(0, 200), source: 'cockpit', answerable: s.cockpitAnswerable, ticket: null });
    }
  }
  return { requests, answered, git: s.root === null ? null : await gitState(s.root, s.git) };
}

/** The branch, its upstream, the commits ahead of it and the files changed; null when git cannot say. */
export async function gitState(root: string, git: GitRunner): Promise<AgentNeeds['git']> {
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (!branch.ok) return null;
  const upstream = await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], root);
  const ahead = upstream.ok ? await git(['rev-list', '--count', '@{u}..HEAD'], root) : null;
  const status = await git(['status', '--porcelain'], root);
  return {
    branch: branch.stdout.trim(),
    upstream: upstream.ok ? upstream.stdout.trim() : null,
    ahead: ahead?.ok === true ? Number(ahead.stdout.trim()) || 0 : 0,
    changed: status.ok ? status.stdout.split('\n').filter((l) => l.trim() !== '').length : 0,
  };
}

/**
 * A git runner that answers a repeated command from what it last answered, for `ms` (TASK-0210): Needs
 * you is read every few seconds while a cockpit request may be open, and git's state need not be.
 */
export function cachedGit(git: GitRunner, ms: number, now: () => number = Date.now): GitRunner {
  const seen = new Map<string, { at: number; result: Awaited<ReturnType<GitRunner>> }>();
  return async (args, cwd) => {
    const key = JSON.stringify([cwd, args]);
    const hit = seen.get(key);
    if (hit !== undefined && now() - hit.at < ms) return hit.result;
    const result = await git(args, cwd);
    seen.set(key, { at: now(), result });
    return result;
  };
}
