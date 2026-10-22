/**
 * Needs you, with the agents in it (FEAT-0034, TASK-0202; DES-0006): everything waiting on
 * Edwin in one panel, in the order he chose on 2026-10-22: permission requests first, then
 * the agents waiting for him, then the tickets by reason, then the work not pushed.
 *
 * What the model does not hold, the shell gives: the open requests (Deck's own and the
 * cockpit's), and the repository's git state, both read by the main process. A served page
 * gives none of it, and its panel is the tickets by reason alone (RISK-0015).
 */
import type { AgentKind } from './agent-types.js';
import type { AgentSummary } from './agent-marks.js';

/** One permission request waiting for an answer. */
export interface NeedsRequest {
  /** Deck's request id, or the cockpit's approval id. */
  id: string;
  session: string;
  agent: AgentKind;
  tool: string;
  /** What it asks to do, short: a command, a path. */
  summary: string;
  /** Deck's own session, answered in place; or one the cockpit's plugin offered. */
  source: 'deck' | 'cockpit';
  /** Whether Deck can answer it: always for its own; for the cockpit's, only with the sidecar's shell secret (TASK-0204). */
  answerable: boolean;
  ticket: string | null;
}

/** What the shell knows that the model does not. */
export interface AgentNeeds {
  requests: NeedsRequest[];
  /** The last request answered, with its outcome, so an answer is seen to have landed. */
  answered: { tool: string; summary: string; outcome: 'approved' | 'denied'; source: 'deck' | 'cockpit' } | null;
  /** The repository's work not pushed; null when git could not say. */
  git: { branch: string; upstream: string | null; ahead: number; changed: number } | null;
}

/**
 * The agents waiting for you that no listed request accounts for: a Deck session waits because
 * of a request, so it is counted once, as its request; a cockpit session waiting for its next
 * prompt is counted here.
 */
export function waitingAgents(summaries: readonly AgentSummary[], requests: readonly NeedsRequest[]): AgentSummary[] {
  const asking = new Set(requests.map((r) => r.session));
  return summaries.filter((s) => s.state === 'waiting' && !asking.has(s.id));
}

/** What is not pushed, in words: the commits ahead of the upstream and the files changed. */
export function gitWords(git: AgentNeeds['git']): string | null {
  if (git === null) return null;
  const files = git.changed === 0 ? 'no file changed' : `${git.changed} file${git.changed === 1 ? '' : 's'} changed`;
  if (git.upstream === null) return `${git.branch} has no upstream, so nothing on it is pushed · ${files}`;
  const ahead = git.ahead === 0 ? `${git.branch} is pushed to ${git.upstream}` : `${git.ahead} commit${git.ahead === 1 ? '' : 's'} not pushed to ${git.upstream}`;
  return `${ahead} · ${files}`;
}

/** Whether anything is not pushed: commits ahead, a branch never pushed, or files changed. */
export const unpushed = (git: AgentNeeds['git']): boolean => git !== null && (git.ahead > 0 || git.upstream === null || git.changed > 0);
