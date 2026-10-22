/**
 * One running session (FEAT-0032, TASK-0191): a provider's session, its record and
 * its conversation, and the permission requests waiting for an answer.
 *
 * The session is where Deck's rules hold, whatever the provider. A permission
 * request blocks the agent until a person answers it through `answer`; while one is
 * open the session is waiting for you. Every change is told to the listeners, which
 * the store (TASK-0194), the sidecar's reports (TASK-0195) and the windows (TASK-0196)
 * are.
 */
import type { ConversationRecord, PermissionAnswer, SessionRecord, SessionState } from '../../shared/agent-types.js';
import type { AgentProvider, PermissionAsk, ProviderSession, StartOptions } from './provider.js';

export type SessionChange =
  | { kind: 'record'; record: ConversationRecord }
  | { kind: 'session'; session: SessionRecord };

export class AgentSession {
  readonly records: ConversationRecord[] = [];
  private running: ProviderSession | null = null;
  private readonly waiting = new Map<string, (answer: PermissionAnswer) => void>();
  private readonly listeners = new Set<(change: SessionChange) => void>();

  constructor(
    public record: SessionRecord,
    private readonly provider: AgentProvider,
    private readonly now: () => string = () => new Date().toISOString(),
    history: readonly ConversationRecord[] = [],
  ) {
    this.records.push(...history);
  }

  onChange(fn: (change: SessionChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Start, or resume when the record holds the agent's own id, with this prompt. */
  async start(prompt: string): Promise<void> {
    if (this.running !== null) throw new Error(`session ${this.record.id} is already running`);
    const options: StartOptions = {
      folder: this.record.folder, prompt, model: this.record.model, effort: this.record.effort, access: this.record.access,
      ...(this.record.providerId !== null ? { resume: this.record.providerId } : {}),
    };
    this.add({ kind: 'prompt', at: this.now(), text: prompt });
    this.setState('working');
    try {
      this.running = await this.provider.start(options, {
        record: (r) => this.add(r),
        identified: (id) => this.update({ providerId: id }),
        ask: (request) => this.ask(request),
        turnEnded: () => this.setState(this.waiting.size > 0 ? 'waiting' : 'idle'),
        ended: (reason) => {
          this.running = null;
          this.denyAll('the session ended');
          this.setState(reason === undefined ? 'idle' : 'failed', reason);
        },
      });
    } catch (err) {
      this.running = null;
      this.setState('failed', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  /** A further prompt: to the running session, or starting it again from the agent's own id. */
  async send(text: string): Promise<void> {
    if (this.running === null) {
      await this.start(text);
      return;
    }
    this.add({ kind: 'prompt', at: this.now(), text });
    this.setState('working');
    await this.running.send(text);
  }

  /** A person's answer to a permission request. False when nothing waits under that id. */
  answer(id: string, answer: PermissionAnswer): boolean {
    const resolve = this.waiting.get(id);
    if (resolve === undefined) return false;
    this.waiting.delete(id);
    const open = this.latestPermission(id);
    if (open !== undefined) {
      this.add({ ...open, at: this.now(), outcome: answer.allow ? 'approved' : 'denied', ...(!answer.allow && answer.message ? { message: answer.message } : {}) });
    }
    resolve(answer);
    if (this.waiting.size === 0 && this.record.state === 'waiting') this.setState('working');
    return true;
  }

  async interrupt(): Promise<void> {
    this.denyAll('interrupted');
    await this.running?.interrupt();
    this.setState('idle', 'interrupted');
  }

  async stop(): Promise<void> {
    this.denyAll('stopped');
    const running = this.running;
    this.running = null;
    await running?.stop();
    this.setState('stopped');
  }

  get isRunning(): boolean {
    return this.running !== null;
  }

  private ask(request: PermissionAsk): Promise<PermissionAnswer> {
    this.add({ kind: 'permission', at: this.now(), id: request.id, tool: request.tool, summary: request.summary, outcome: 'open' });
    this.setState('waiting');
    return new Promise((resolve) => this.waiting.set(request.id, resolve));
  }

  /** Every open request denied: the agent must not wait on a person who can no longer answer. */
  private denyAll(message: string): void {
    for (const id of [...this.waiting.keys()]) this.answer(id, { allow: false, message });
  }

  private latestPermission(id: string): Extract<ConversationRecord, { kind: 'permission' }> | undefined {
    for (let i = this.records.length - 1; i >= 0; i -= 1) {
      const r = this.records[i]!;
      if (r.kind === 'permission' && r.id === id) return r;
    }
    return undefined;
  }

  private add(record: ConversationRecord): void {
    this.records.push(record);
    this.record = { ...this.record, lastActive: record.at };
    this.tell({ kind: 'record', record });
  }

  private setState(state: SessionState, reason?: string): void {
    if (this.record.state === state && reason === undefined) return;
    this.add({ kind: 'state', at: this.now(), state, ...(reason !== undefined ? { reason } : {}) });
    this.update({ state });
  }

  private update(part: Partial<SessionRecord>): void {
    this.record = { ...this.record, ...part };
    this.tell({ kind: 'session', session: this.record });
  }

  private tell(change: SessionChange): void {
    for (const fn of this.listeners) fn(change);
  }
}

export type { PermissionAsk };
