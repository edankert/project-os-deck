/**
 * The Claude provider (FEAT-0032, TASK-0192): a session through the Agent SDK's
 * `query()` (`@anthropic-ai/claude-agent-sdk`, pinned, RISK-0012).
 *
 * One `query()` holds the whole session: its prompt is a stream Deck writes each
 * prompt into, so a further prompt continues the same conversation. Every tool that
 * needs permission comes through `canUseTool`, which waits for Deck's answer.
 *
 * **A session never skips permissions** (RISK-0013). The permission mode is set
 * explicitly, `default` or `acceptEdits`, never left to settings: Edwin's shell runs
 * `claude` with `--dangerously-skip-permissions` and his user settings skip the
 * prompt that guards it. Only the project's and the checkout's own settings are read,
 * so the repository's CLAUDE.md and rules apply but no user-level hook or plugin does,
 * and the cockpit's variables are taken out of the environment so its plugin cannot
 * also report the session.
 *
 * The SDK is ESM only and the main process is CommonJS, so it is loaded with a real
 * dynamic import, and the query function can be injected, so the suite drives the
 * provider with a fake stream and never reaches a model (RISK-0017).
 */
import crypto from 'node:crypto';
import type { ConversationRecord, AccessLevel } from '../../shared/agent-types.js';
import type { AgentProvider, ProviderHooks, ProviderSession, StartOptions } from './provider.js';

/** The part of an SDK message this provider reads. Kept loose: the SDK's types are its own (RISK-0012). */
export interface SdkMessage {
  type: string;
  subtype?: string;
  session_id?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: unknown; usage?: Record<string, unknown> };
  parent_tool_use_id?: string | null;
  /** On a result: each model's figures. Only `contextWindow` is read; the costs beside it never are (RISK-0016). */
  modelUsage?: Record<string, { contextWindow?: unknown }>;
  /** On a rate_limit_event. */
  rate_limit_info?: { utilization?: unknown; rateLimitType?: unknown };
}

const LIMIT_WINDOW: Readonly<Record<string, string>> = { five_hour: '5-hour', seven_day: 'weekly', seven_day_opus: 'weekly Opus', seven_day_sonnet: 'weekly Sonnet' };

/**
 * Context and limit use from the SDK's messages (TASK-0209). The context is the last main-conversation
 * call's input and output tokens, against the largest window the result names; the limit is the
 * rate-limit event's share used, which the SDK gives as a fraction or a percentage.
 */
export function usageRecord(m: SdkMessage, lastCall: { tokens: number }, at: string): Extract<ConversationRecord, { kind: 'usage' }> | null {
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  if (m.type === 'assistant' && !m.parent_tool_use_id && m.message?.usage !== undefined) {
    const u = m.message.usage;
    const tokens = n(u['input_tokens']) + n(u['cache_creation_input_tokens']) + n(u['cache_read_input_tokens']) + n(u['output_tokens']);
    if (tokens > 0) lastCall.tokens = tokens;
    return null;
  }
  if (m.type === 'result' && m.modelUsage !== undefined) {
    const window = Math.max(0, ...Object.values(m.modelUsage).map((x) => n(x?.contextWindow)));
    return window > 0 && lastCall.tokens > 0 ? { kind: 'usage', at, context: { used: lastCall.tokens, window } } : null;
  }
  if (m.type === 'rate_limit_event' && typeof m.rate_limit_info?.utilization === 'number') {
    const u = m.rate_limit_info.utilization;
    return { kind: 'usage', at, limit: { percent: u <= 1 ? u * 100 : u, window: LIMIT_WINDOW[String(m.rate_limit_info.rateLimitType ?? '')] ?? '' } };
  }
  return null;
}

export type CanUseTool = (toolName: string, input: Record<string, unknown>, options: { signal: AbortSignal; decisionReason?: string; toolUseID?: string }) => Promise<{ behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string; interrupt?: boolean }>;

export interface QueryHandle extends AsyncIterable<SdkMessage> {
  interrupt(): Promise<unknown>;
}

export type QueryFn = (params: { prompt: AsyncIterable<unknown>; options: Record<string, unknown> }) => QueryHandle;

/** The settings a session reads: the repository's and the checkout's, never the user's (RISK-0013). */
export const SETTING_SOURCES = ['project', 'local'] as const;

/** The permission mode for an access level. There is no level that skips permissions. */
export function permissionModeFor(access: AccessLevel): 'default' | 'acceptEdits' {
  return access === 'edits' ? 'acceptEdits' : 'default';
}

/** The child's environment: Deck's own, without the cockpit's variables or its plugin directories. */
export function cleanEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined || k.startsWith('COCKPIT_') || k === 'CLAUDE_CODE_PLUGIN_DIRS') continue;
    out[k] = v;
  }
  return out;
}

/** The options `query()` gets for a session; pure, so the suite can read them. */
export function claudeOptions(start: StartOptions, canUseTool: CanUseTool, abortController: AbortController, env: NodeJS.ProcessEnv = process.env): Record<string, unknown> {
  return {
    cwd: start.folder,
    model: start.model,
    ...(start.effort !== '' ? { effort: start.effort } : {}),
    permissionMode: permissionModeFor(start.access),
    canUseTool,
    abortController,
    settingSources: [...SETTING_SOURCES],
    env: cleanEnvironment(env),
    ...(start.resume !== undefined ? { resume: start.resume } : {}),
  };
}

let sdk: Promise<{ query: QueryFn }> | null = null;
/** The SDK, loaded once, by a dynamic import the CommonJS compiler leaves alone. */
function loadSdk(): Promise<{ query: QueryFn }> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  sdk ??= (new Function('specifier', 'return import(specifier)') as (s: string) => Promise<{ query: QueryFn }>)('@anthropic-ai/claude-agent-sdk');
  return sdk;
}

/** A short line for what a tool is asked to do: its command, its file, its pattern. */
export function toolSummary(name: string, input: Record<string, unknown>): string {
  const s = (v: unknown): string => (typeof v === 'string' ? v : '');
  const line = s(input['command']) || s(input['file_path']) || s(input['path']) || s(input['pattern']) || s(input['url']) || s(input['description']) || s(input['prompt']);
  const one = line.split('\n')[0] ?? '';
  return one.length > 160 ? `${one.slice(0, 159)}…` : one || name;
}

const lines = (text: unknown): number => (typeof text === 'string' && text !== '' ? text.split('\n').length : 0);

/** An Edit, MultiEdit or Write as a file edit: lines added and removed, and a short diff. */
export function editOf(name: string, input: Record<string, unknown>, at: string): Extract<ConversationRecord, { kind: 'edit' }> | null {
  const path = typeof input['file_path'] === 'string' ? input['file_path'] : null;
  if (path === null) return null;
  const pairs: Array<[string, string]> = name === 'Write'
    ? [['', String(input['content'] ?? '')]]
    : name === 'MultiEdit' && Array.isArray(input['edits'])
      ? (input['edits'] as Array<Record<string, unknown>>).map((e) => [String(e['old_string'] ?? ''), String(e['new_string'] ?? '')] as [string, string])
      : name === 'Edit' ? [[String(input['old_string'] ?? ''), String(input['new_string'] ?? '')]] : [];
  if (pairs.length === 0) return null;
  const added = pairs.reduce((n, [, b]) => n + lines(b), 0);
  const removed = pairs.reduce((n, [a]) => n + lines(a), 0);
  const diff = [`--- a/${path}`, `+++ b/${path}`, ...pairs.flatMap(([a, b]) => [...(a === '' ? [] : a.split('\n').map((l) => `-${l}`)), ...(b === '' ? [] : b.split('\n').map((l) => `+${l}`))])].join('\n');
  return { kind: 'edit', at, path, added, removed, diff: diff.length > 20000 ? `${diff.slice(0, 20000)}\n…` : diff };
}

/** A pushable stream of prompts: what `query()` reads its next prompt from. */
class PromptStream implements AsyncIterable<unknown> {
  private readonly queue: string[] = [];
  private wake: (() => void) | null = null;
  private closed = false;
  push(text: string): void {
    this.queue.push(text);
    this.wake?.();
  }
  close(): void {
    this.closed = true;
    this.wake?.();
  }
  async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
    for (;;) {
      while (this.queue.length > 0) yield { type: 'user', message: { role: 'user', content: this.queue.shift()! }, parent_tool_use_id: null };
      if (this.closed) return;
      await new Promise<void>((resolve) => { this.wake = resolve; });
      this.wake = null;
    }
  }
}

export class ClaudeProvider implements AgentProvider {
  readonly agent = 'claude' as const;
  constructor(private readonly query: QueryFn | null = null, private readonly now: () => string = () => new Date().toISOString(), private readonly env: NodeJS.ProcessEnv = process.env) {}

  async start(options: StartOptions, hooks: ProviderHooks): Promise<ProviderSession> {
    const query = this.query ?? (await loadSdk()).query;
    const prompts = new PromptStream();
    const abort = new AbortController();
    const toolNames = new Map<string, string>();
    // A request is known by its tool call's own id, unique across every resume of the session. Numbering them
    // from one on each start let a resumed session's first request be answered by the first turn's (review, round one).
    const canUseTool: CanUseTool = async (toolName, input, opts) => {
      const toolUse = typeof opts?.toolUseID === 'string' && opts.toolUseID !== '' ? opts.toolUseID : undefined;
      const answer = await hooks.ask({ id: `claude-ask-${toolUse ?? crypto.randomUUID()}`, ...(toolUse !== undefined ? { toolUse } : {}), tool: toolName, summary: toolSummary(toolName, input) });
      return answer.allow ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: answer.message ?? 'Denied in Deck.' };
    };
    const handle = query({ prompt: prompts, options: claudeOptions(options, canUseTool, abort, this.env) });
    prompts.push(options.prompt);
    let identified = false;
    const lastCall = { tokens: 0 };
    const read = async (): Promise<void> => {
      try {
        for await (const m of handle) {
          if (!identified && typeof m.session_id === 'string' && m.session_id !== '') {
            identified = true;
            hooks.identified(m.session_id);
          }
          for (const r of this.recordsOf(m, toolNames)) hooks.record(r);
          const usage = usageRecord(m, lastCall, this.now());
          if (usage !== null) hooks.record(usage);
          if (m.type === 'result') {
            if (m.is_error === true && m.subtype !== 'success') hooks.record({ kind: 'text', at: this.now(), text: `The turn ended with an error (${m.subtype ?? 'error'}).` });
            hooks.turnEnded();
          }
        }
        hooks.ended();
      } catch (err) {
        hooks.ended(abort.signal.aborted ? undefined : err instanceof Error ? err.message : String(err));
      }
    };
    void read();
    return {
      send: async (text) => prompts.push(text),
      interrupt: async () => {
        await handle.interrupt();
      },
      stop: async () => {
        prompts.close();
        abort.abort();
      },
    };
  }

  /** One SDK message as conversation records: the agent's text, its tool calls, their results, its edits and its plan. */
  recordsOf(m: SdkMessage, toolNames: Map<string, string>): ConversationRecord[] {
    const at = this.now();
    const blocks = Array.isArray(m.message?.content) ? (m.message!.content as Array<Record<string, unknown>>) : [];
    const out: ConversationRecord[] = [];
    // A subagent's own steps stay inside its Task call; the pane draws the main conversation.
    if (m.parent_tool_use_id) return out;
    if (m.type === 'assistant') {
      for (const b of blocks) {
        if (b['type'] === 'text' && typeof b['text'] === 'string' && b['text'].trim() !== '') out.push({ kind: 'text', at, text: b['text'] });
        if (b['type'] === 'tool_use') {
          const id = String(b['id'] ?? '');
          const name = String(b['name'] ?? 'tool');
          const input = (b['input'] ?? {}) as Record<string, unknown>;
          toolNames.set(id, name);
          if (name === 'TodoWrite' && Array.isArray(input['todos'])) {
            out.push({ kind: 'plan', at, steps: (input['todos'] as Array<Record<string, unknown>>).map((t) => ({ text: String(t['content'] ?? ''), done: t['status'] === 'completed' })) });
            continue;
          }
          const summary = toolSummary(name, input);
          toolNames.set(`${id}:summary`, summary);
          out.push({ kind: 'tool', at, id, name, summary, outcome: 'running' });
          const edit = editOf(name, input, at);
          if (edit !== null) toolNames.set(`${id}:edit`, JSON.stringify(edit));
        }
      }
    }
    if (m.type === 'user') {
      for (const b of blocks) {
        if (b['type'] !== 'tool_result') continue;
        const id = String(b['tool_use_id'] ?? '');
        const name = toolNames.get(id);
        if (name === undefined || name === 'TodoWrite') continue;
        const failed = b['is_error'] === true;
        out.push({ kind: 'tool', at, id, name, summary: toolNames.get(`${id}:summary`) ?? '', outcome: failed ? 'failed' : 'done' });
        // An edit counts once it is made, not when it is asked for.
        const edit = toolNames.get(`${id}:edit`);
        if (!failed && edit !== undefined) out.push({ ...(JSON.parse(edit) as Extract<ConversationRecord, { kind: 'edit' }>), at });
      }
    }
    return out;
  }
}
