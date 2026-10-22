/**
 * Deck's own agent sessions, as data (FEAT-0032, TASK-0191; DES-0006, ADR-0009).
 *
 * A session is a Claude or a Codex agent that Deck's main process started for a
 * ticket. What happens in it is a list of conversation records, the same for both
 * agents, which the session pane draws turn by turn (FEAT-0033). The main process
 * fills them; the renderer only reads them, through the preload bridge.
 *
 * Shared code, so the pane and the engine agree on the shapes. Pure: no clock, no files.
 */

export type AgentKind = 'claude' | 'codex';

/**
 * Where a session stands: at work, waiting for you (a permission request or the end
 * of a turn), idle between turns, stopped by a person, or failed.
 */
export type SessionState = 'working' | 'waiting' | 'idle' | 'stopped' | 'failed';

/**
 * How much an agent may do without asking. Nothing Deck offers skips permissions
 * (RISK-0013): "ask" asks before every tool that changes anything. "edits" lets Claude
 * edit files without asking and asks for everything else. Codex has no level that
 * matches exactly: with "edits" it runs on-request, so it also runs commands without
 * asking, but only inside the workspace-write sandbox (its folder, no network), and asks
 * before going outside it.
 */
export type AccessLevel = 'ask' | 'edits';

export const ACCESS_LEVELS: readonly AccessLevel[] = ['ask', 'edits'];

/** A session's record in Deck's store: who, for which ticket, where, and how it stands. */
export interface SessionRecord {
  /** Deck's own id for the session. */
  id: string;
  agent: AgentKind;
  /** The agent's own session id (Claude) or thread id (Codex), once it has one; what Resume needs. */
  providerId: string | null;
  workspaceId: string;
  /** The ticket it was started on; null for a session started on no ticket. */
  ticket: string | null;
  /** The folder it runs in: the checkout, or the worktree made for it. */
  folder: string;
  /** The workspace's repository: the folder the cockpit's sidecar knows, when the session runs in a worktree beside it. */
  root?: string;
  place: 'checkout' | 'worktree';
  /** The branch of its worktree, when it has one. */
  branch?: string;
  model: string;
  effort: string;
  access: AccessLevel;
  /** ISO times. */
  created: string;
  lastActive: string;
  state: SessionState;
}

/** A permission request's outcome: open until Deck answers it. */
export type PermissionOutcome = 'open' | 'approved' | 'denied';

/** A tool call's outcome. */
export type ToolOutcome = 'running' | 'done' | 'failed';

/**
 * One thing that happened in a session. A record with an `id` (a tool call, a
 * permission request) may come again with a later outcome; the later one replaces
 * the earlier where the pane draws it (`latest`).
 */
export type ConversationRecord =
  | { kind: 'prompt'; at: string; text: string }
  | { kind: 'text'; at: string; text: string }
  | { kind: 'tool'; at: string; id: string; name: string; summary: string; outcome: ToolOutcome }
  | { kind: 'edit'; at: string; path: string; added: number; removed: number; diff: string }
  | { kind: 'plan'; at: string; steps: Array<{ text: string; done: boolean }> }
  | { kind: 'permission'; at: string; id: string; toolUse?: string; tool: string; summary: string; outcome: PermissionOutcome; message?: string }
  | { kind: 'state'; at: string; state: SessionState; reason?: string };

export type RecordKind = ConversationRecord['kind'];

/** What a person answers to a permission request. */
export type PermissionAnswer = { allow: true } | { allow: false; message?: string };

/**
 * The records with each tool call and permission request at its latest outcome,
 * standing where it first appeared, so a turn reads in the order things happened.
 */
export function latest(records: readonly ConversationRecord[]): ConversationRecord[] {
  const out: ConversationRecord[] = [];
  const at = new Map<string, number>();
  for (const r of records) {
    const key = r.kind === 'tool' || r.kind === 'permission' ? `${r.kind}:${r.id}` : null;
    if (key !== null && at.has(key)) {
      out[at.get(key)!] = r;
      continue;
    }
    if (key !== null) at.set(key, out.length);
    out.push(r);
  }
  return out;
}

/** A turn: a prompt and everything the agent did after it, until the next prompt. */
export interface Turn {
  prompt: string | null;
  at: string | null;
  records: ConversationRecord[];
}

/** The conversation as turns, each record at its latest outcome. Records before the first prompt make a turn of their own. */
export function turnsOf(records: readonly ConversationRecord[]): Turn[] {
  const turns: Turn[] = [];
  for (const r of latest(records)) {
    if (r.kind === 'prompt') {
      turns.push({ prompt: r.text, at: r.at, records: [] });
      continue;
    }
    if (turns.length === 0) turns.push({ prompt: null, at: null, records: [] });
    turns[turns.length - 1]!.records.push(r);
  }
  return turns;
}

/** The permission requests still waiting for an answer, oldest first. */
export function openRequests(records: readonly ConversationRecord[]): Array<Extract<ConversationRecord, { kind: 'permission' }>> {
  return latest(records).filter((r): r is Extract<ConversationRecord, { kind: 'permission' }> => r.kind === 'permission' && r.outcome === 'open');
}
