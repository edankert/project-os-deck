/**
 * What an agent provider must do (FEAT-0032, TASK-0191).
 *
 * A provider runs one kind of agent: Claude through the Agent SDK (TASK-0192) or
 * Codex through `codex app-server` (TASK-0193). It starts a session with a first
 * prompt, takes further prompts, resumes a session by the agent's own id, and can be
 * interrupted or stopped. It reports what happens as conversation records, and when
 * the agent wants to use a tool that needs permission it asks, and waits for Deck's
 * answer. It never decides a permission itself.
 *
 * The main process alone holds providers; the renderer sees only the records.
 */
import type { AccessLevel, AgentKind, ConversationRecord, PermissionAnswer } from '../../shared/agent-types.js';

/** What a session starts with. */
export interface StartOptions {
  /** The folder it runs in: the checkout or its worktree. */
  folder: string;
  prompt: string;
  model: string;
  effort: string;
  access: AccessLevel;
  /** The agent's own session or thread id, to resume one. */
  resume?: string;
}

/** A tool the agent wants to use, asking first. */
export interface PermissionAsk {
  id: string;
  tool: string;
  /** What it asks, short enough for a row: a command, a path. */
  summary: string;
}

/** How a provider tells the session what happens. */
export interface ProviderHooks {
  record(record: ConversationRecord): void;
  /** The agent's own id, once known; Resume needs it. */
  identified(providerId: string): void;
  /** Ask before acting; resolves with the person's answer. */
  ask(request: PermissionAsk): Promise<PermissionAnswer>;
  /** The agent finished its turn and is waiting for the next prompt. */
  turnEnded(): void;
  /** The agent stopped working for good: ended, or failed with a reason. */
  ended(reason?: string): void;
}

/** A running session, as its provider holds it. */
export interface ProviderSession {
  send(text: string): Promise<void>;
  interrupt(): Promise<void>;
  stop(): Promise<void>;
}

export interface AgentProvider {
  readonly agent: AgentKind;
  start(options: StartOptions, hooks: ProviderHooks): Promise<ProviderSession>;
}
