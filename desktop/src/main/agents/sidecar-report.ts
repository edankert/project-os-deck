/**
 * Deck's sessions, reported to the cockpit's sidecar (FEAT-0032, TASK-0195), so the
 * cockpit sees a session Deck started as it sees its own: in its agents, its sessions
 * and, while one waits, its Needs you.
 *
 * Each session's records become the events the cockpit's Claude plugin and Codex hooks
 * already post to `POST /api/agent-hook` (`agent_hooks.py`): SessionStart, then
 * UserPromptSubmit with the prompt, PreToolUse and PostToolUse with the tool and, for an
 * edit, its file, PermissionRequest, Stop at the end of a turn and SessionEnd. Nothing
 * else is sent: no reply text. Each permission request is also offered with
 * `POST /api/cockpit/approvals/ask`; while it is open Deck reads its record, and if a
 * person answered it in the cockpit first, that answer is the one the agent gets. Once
 * Deck has an answer the offer is withdrawn with `/approvals/handed-back`.
 *
 * Posts go from the main process over loopback with the JSON content type (ADR-0003),
 * to whichever sidecar Deck is attached to for the workspace. A sidecar that is down or
 * refuses never stops a session: the post is dropped and logged once per session.
 */
import type { ConversationRecord, SessionRecord } from '../../shared/agent-types.js';
import type { ManagerChange, SessionManager } from './sessions.js';
import { postAgentReport } from '../../shared/write-client.js';

export interface SidecarClient {
  post(base: string, path: string, body: unknown): Promise<{ ok: boolean; status: number; json: unknown }>;
  get(base: string, path: string): Promise<{ ok: boolean; status: number; json: unknown }>;
}

/** Posts leave through the write client, which sends only to the agent-report paths (ADR-0003). */
export const fetchClient: SidecarClient = {
  post: (base, path, body) => postAgentReport(base, path, body),
  async get(base, path) {
    const res = await fetch(`${base}${path}`);
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
  },
};

interface Open {
  sessionId: string;
  permission: string;
  approvalId: string | null;
  base: string;
}

export class SidecarReporter {
  private readonly started = new Set<string>();
  private readonly told = new Set<string>();
  private readonly open = new Map<string, Open>();
  private poll: ReturnType<typeof setInterval> | null = null;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly manager: SessionManager,
    private readonly baseFor: (workspaceId: string) => string | null,
    private readonly client: SidecarClient = fetchClient,
    private readonly log: (message: string) => void = (m) => console.warn(`deck: ${m}`),
    private readonly pollMs = 2000,
  ) {
    // One session's events go in the order they happened: each waits for the one before it.
    manager.onChange((c) => {
      const before = this.queues.get(c.sessionId) ?? Promise.resolve();
      const next = before.then(() => this.onChange(c)).catch(() => undefined);
      this.queues.set(c.sessionId, next);
    });
  }

  /** Every post queued so far has been made: for Deck's quit, and for the suite. */
  async settled(): Promise<void> {
    await Promise.all([...this.queues.values()]);
  }

  /** Stop reading the cockpit's answers (Deck is quitting). */
  close(): void {
    if (this.poll !== null) clearInterval(this.poll);
    this.poll = null;
  }

  private async onChange({ sessionId, change }: ManagerChange): Promise<void> {
    if (change.kind !== 'record') return;
    const session = this.manager.get(sessionId);
    if (session === undefined) return;
    const base = this.baseFor(session.workspaceId);
    if (base === null) return;
    for (const event of this.eventsFor(session, change.record)) await this.hook(base, session, event);
    const r = change.record;
    if (r.kind === 'permission' && r.outcome === 'open') await this.offer(base, session, r);
    if (r.kind === 'permission' && r.outcome !== 'open') await this.withdraw(sessionId, r.id);
  }

  /** The cockpit's hook events for one record. */
  eventsFor(session: SessionRecord, r: ConversationRecord): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    if (r.kind === 'prompt') {
      if (!this.started.has(session.id)) {
        this.started.add(session.id);
        out.push({ hook_event_name: 'SessionStart', source: 'startup' });
      }
      out.push({ hook_event_name: 'UserPromptSubmit', prompt: r.text });
    } else if (r.kind === 'tool') {
      out.push({ hook_event_name: r.outcome === 'running' ? 'PreToolUse' : 'PostToolUse', tool_name: r.name, tool_use_id: `${session.id}:${r.id}` });
    } else if (r.kind === 'edit') {
      // An edit as the cockpit's hooks report one, so it records the file the session touched. It carries an id
      // of its own: with none, the sidecar closes every live approval in the session (review, round one).
      out.push({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_use_id: `${session.id}:edit:${r.at}:${r.path}`, tool_input: { file_path: r.path } });
    } else if (r.kind === 'permission' && r.outcome === 'open') {
      out.push({ hook_event_name: 'PermissionRequest', tool_name: r.tool, message: `${session.agent === 'codex' ? 'Codex' : 'Claude'} needs your permission to use ${r.tool}` });
    } else if (r.kind === 'state') {
      if (r.state === 'idle' && r.reason === undefined) out.push({ hook_event_name: 'Stop' });
      if (r.state === 'stopped' || r.state === 'failed') out.push({ hook_event_name: 'SessionEnd', reason: r.state === 'failed' ? 'other' : 'prompt_input_exit' });
    }
    return out;
  }

  private async hook(base: string, session: SessionRecord, event: Record<string, unknown>): Promise<void> {
    // The repository, not a worktree beside it: the sidecar refuses a hook from outside its own folder (review, round one).
    await this.send(session.id, () => this.client.post(base, '/api/agent-hook', { ...event, session_id: session.id, agent: session.agent, cwd: session.root ?? session.folder }));
  }

  private async offer(base: string, session: SessionRecord, r: Extract<ConversationRecord, { kind: 'permission' }>): Promise<void> {
    const key = `${session.id}:${r.id}`;
    const entry: Open = { sessionId: session.id, permission: r.id, approvalId: null, base };
    this.open.set(key, entry);
    // The sidecar keeps one record per session and tool use id, whatever its status, and hands it back to a
    // repeated offer. The id is the tool call's own, which its PostToolUse carries too, so the sidecar closes the
    // card when the tool finishes; the session's id is in it because another session's request ids may repeat.
    const res = await this.send(session.id, () => this.client.post(base, '/api/cockpit/approvals/ask', { session_id: session.id, tool: r.tool, input: { summary: r.summary }, tool_use_id: `${session.id}:${r.toolUse ?? r.id}` }));
    const id = (res?.json as { approval_id?: unknown } | null)?.approval_id;
    if (typeof id !== 'string' || id === '') return this.startPolling();
    // A record that is not open when first read was there before this request: its answer is not this request's.
    const first = await this.client.get(base, `/api/cockpit/approvals?approval_id=${encodeURIComponent(id)}`).catch(() => null);
    const status = (first?.json as { approval?: { status?: unknown } } | null)?.approval?.status;
    if (status !== 'open') {
      this.log(`the sidecar answered session ${session.id}'s request with a record that is ${String(status ?? 'missing')}; it is answered in Deck only`);
      return this.startPolling();
    }
    entry.approvalId = id;
    this.startPolling();
  }

  private startPolling(): void {
    if (this.poll === null) this.poll = setInterval(() => void this.readAnswers(), this.pollMs);
  }

  /** A request answered in the cockpit first is answered so in Deck: that answer is the one the agent gets. */
  async readAnswers(): Promise<void> {
    for (const [key, entry] of [...this.open]) {
      if (entry.approvalId === null) continue;
      const res = await this.client.get(entry.base, `/api/cockpit/approvals?approval_id=${encodeURIComponent(entry.approvalId)}`).catch(() => null);
      const status = (res?.json as { approval?: { status?: unknown } } | null)?.approval?.status;
      if (status === 'granted' || status === 'denied') {
        this.open.delete(key);
        this.manager.answer(entry.sessionId, entry.permission, status === 'granted' ? { allow: true } : { allow: false, message: 'Denied in the cockpit.' });
      }
    }
    if (this.open.size === 0 && this.poll !== null) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }

  private async withdraw(sessionId: string, permission: string): Promise<void> {
    const key = `${sessionId}:${permission}`;
    const entry = this.open.get(key);
    this.open.delete(key);
    if (entry?.approvalId) await this.send(sessionId, () => this.client.post(entry.base, '/api/cockpit/approvals/handed-back', { approval_id: entry.approvalId }));
  }

  /** A post that fails is dropped; the first failure for a session is logged, and the session goes on. */
  private async send(sessionId: string, post: () => Promise<{ ok: boolean; status: number; json: unknown }>): Promise<{ ok: boolean; status: number; json: unknown } | null> {
    try {
      const res = await post();
      if (!res.ok) throw new Error(`the sidecar answered ${res.status}`);
      return res;
    } catch (err) {
      if (!this.told.has(sessionId)) {
        this.told.add(sessionId);
        this.log(`reporting session ${sessionId} to the sidecar failed: ${err instanceof Error ? err.message : String(err)}; the session goes on`);
      }
      return null;
    }
  }
}
