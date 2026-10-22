/**
 * Deck's sessions, kept (FEAT-0032, TASK-0194): every session Deck starts, the ticket
 * it was started for and the folder it runs in, outliving the window and the app.
 *
 * The manager owns every live provider session. Its records are one file in Deck's
 * own data folder (`<userData>/agents/sessions.json`), and each conversation is a file
 * of its own beside it (`<id>.jsonl`, one record a line). Neither is ever written
 * inside a repository: a conversation holds the prompts and replies, and Deck's
 * repository is public (RISK-0016).
 *
 * A session runs in the workspace's checkout or in a new git worktree made for it,
 * `<repo>-worktrees/<ticket>-<id>` beside the repository on a new branch
 * `deck/<ticket>-<id>`. Deck never removes a worktree. After a restart, a session that
 * was working or waiting comes back idle, and Resume continues it through its provider
 * by the agent's own id.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { readJsonFile, writeJsonFileAtomic } from '../atomic-json.js';
import type { AccessLevel, AgentKind, ConversationRecord, PermissionAnswer, SessionRecord } from '../../shared/agent-types.js';
import { AgentSession, type SessionChange } from './session.js';
import type { AgentProvider } from './provider.js';

export interface StartRequest {
  workspaceId: string;
  /** The workspace's repository. */
  root: string;
  ticket: string | null;
  agent: AgentKind;
  model: string;
  effort: string;
  access: AccessLevel;
  place: 'checkout' | 'worktree';
  prompt: string;
}

export type GitRunner = (args: string[], cwd: string) => Promise<{ ok: boolean; stdout: string; stderr: string }>;

export const runGit: GitRunner = (args, cwd) => new Promise((resolve) => {
  execFile('git', args, { cwd, encoding: 'utf8' }, (err, stdout, stderr) => resolve({ ok: err === null, stdout, stderr: stderr || (err?.message ?? '') }));
});

/** Where a session's worktree goes and its branch: beside the repository, named after the ticket and the session. */
export function worktreeFor(root: string, ticket: string | null, id: string): { folder: string; branch: string } {
  const name = `${(ticket ?? 'session').toLowerCase()}-${id.slice(0, 8)}`;
  return { folder: path.join(path.dirname(root), `${path.basename(root)}-worktrees`, name), branch: `deck/${name}` };
}

export interface ManagerChange {
  sessionId: string;
  change: SessionChange;
}

export class SessionManager {
  private readonly records = new Map<string, SessionRecord>();
  private readonly live = new Map<string, AgentSession>();
  private readonly listeners = new Set<(c: ManagerChange) => void>();

  constructor(
    private readonly dir: string,
    private readonly providers: Partial<Record<AgentKind, AgentProvider>>,
    private readonly options: { now?: () => string; git?: GitRunner; newId?: () => string } = {},
  ) {
    fs.mkdirSync(dir, { recursive: true });
    const kept = readJsonFile(this.indexFile()) as { sessions?: SessionRecord[] } | null;
    for (const r of kept?.sessions ?? []) {
      // A session that was at work when Deck closed is idle now; Resume continues it.
      const back = r.state === 'working' || r.state === 'waiting' ? { ...r, state: 'idle' as const } : r;
      this.records.set(r.id, back);
      if (back !== r) this.append(r.id, { kind: 'state', at: this.now(), state: 'idle', reason: 'Deck restarted' });
    }
    this.save();
  }

  onChange(fn: (c: ManagerChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Every session, the most recently active first. */
  list(): SessionRecord[] {
    return [...this.records.values()].sort((a, b) => b.lastActive.localeCompare(a.lastActive));
  }

  get(id: string): SessionRecord | undefined {
    return this.records.get(id);
  }

  /** A session's conversation, from its file. */
  conversation(id: string): ConversationRecord[] {
    const file = this.conversationFile(id);
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
      try { return [JSON.parse(l) as ConversationRecord]; } catch { return []; }
    });
  }

  /** Start a session for a ticket: in the checkout, or in a new worktree made for it. */
  async start(req: StartRequest): Promise<SessionRecord> {
    const provider = this.providers[req.agent];
    if (provider === undefined) throw new Error(`Deck has no ${req.agent} provider`);
    const id = this.options.newId?.() ?? crypto.randomUUID();
    const at = this.now();
    let folder = req.root;
    let branch: string | undefined;
    if (req.place === 'worktree') {
      const w = worktreeFor(req.root, req.ticket, id);
      fs.mkdirSync(path.dirname(w.folder), { recursive: true });
      const made = await (this.options.git ?? runGit)(['worktree', 'add', '-b', w.branch, w.folder, 'HEAD'], req.root);
      folder = w.folder;
      branch = w.branch;
      if (!made.ok) {
        const failed: SessionRecord = { id, agent: req.agent, providerId: null, workspaceId: req.workspaceId, ticket: req.ticket, folder, root: req.root, place: 'worktree', branch, model: req.model, effort: req.effort, access: req.access, created: at, lastActive: at, state: 'failed' };
        this.records.set(id, failed);
        this.append(id, { kind: 'state', at, state: 'failed', reason: `git worktree add failed: ${made.stderr.trim()}` });
        this.save();
        this.tell(id, { kind: 'session', session: failed });
        return failed;
      }
    }
    const record: SessionRecord = { id, agent: req.agent, providerId: null, workspaceId: req.workspaceId, ticket: req.ticket, folder, root: req.root, place: req.place, ...(branch !== undefined ? { branch } : {}), model: req.model, effort: req.effort, access: req.access, created: at, lastActive: at, state: 'idle' };
    this.records.set(id, record);
    this.save();
    const session = this.attach(record);
    await session.start(req.prompt).catch(() => undefined); // a failure is the session's state, said in its records
    return this.records.get(id)!;
  }

  /** A further prompt: to a running session, or resuming a kept one through its provider. */
  async send(id: string, text: string): Promise<void> {
    const session = this.live.get(id) ?? this.attach(this.must(id));
    await session.send(text);
  }

  answer(id: string, permission: string, answer: PermissionAnswer): boolean {
    return this.live.get(id)?.answer(permission, answer) ?? false;
  }

  async interrupt(id: string): Promise<void> {
    await this.live.get(id)?.interrupt();
  }

  async stop(id: string): Promise<void> {
    const live = this.live.get(id);
    if (live !== undefined) await live.stop();
    else {
      const r = this.must(id);
      if (r.state === 'stopped') return;
      // Recorded as a live session's stop is, so the cockpit hears that it ended (review, round one).
      const record: ConversationRecord = { kind: 'state', at: this.now(), state: 'stopped' };
      this.append(id, record);
      this.change(id, { ...r, state: 'stopped', lastActive: record.at });
      this.tell(id, { kind: 'record', record });
    }
  }

  /** Stop every live session: Deck is quitting, and an agent must not run on with nobody to answer it. */
  async stopAll(): Promise<void> {
    await Promise.all([...this.live.keys()].map((id) => this.stop(id)));
  }

  private attach(record: SessionRecord): AgentSession {
    const provider = this.providers[record.agent];
    if (provider === undefined) throw new Error(`Deck has no ${record.agent} provider`);
    const session = new AgentSession(record, provider, () => this.now(), this.conversation(record.id));
    session.onChange((change) => {
      if (change.kind === 'record') {
        this.append(record.id, change.record);
        // Its last activity moves with every record; the file is saved at the next change of state.
        this.records.set(record.id, session.record);
      }
      else this.change(record.id, change.session, false);
      this.tell(record.id, change);
    });
    this.live.set(record.id, session);
    return session;
  }

  private change(id: string, record: SessionRecord, tell = true): void {
    this.records.set(id, record);
    this.save();
    if (tell) this.tell(id, { kind: 'session', session: record });
  }

  private must(id: string): SessionRecord {
    const r = this.records.get(id);
    if (r === undefined) throw new Error(`no session ${id}`);
    return r;
  }

  private tell(sessionId: string, change: SessionChange): void {
    for (const fn of this.listeners) fn({ sessionId, change });
  }

  private append(id: string, record: ConversationRecord): void {
    fs.appendFileSync(this.conversationFile(id), `${JSON.stringify(record)}\n`);
  }

  private save(): void {
    writeJsonFileAtomic(this.indexFile(), { sessions: [...this.records.values()] });
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }

  private indexFile(): string {
    return path.join(this.dir, 'sessions.json');
  }

  private conversationFile(id: string): string {
    if (!/^[\w-]+$/.test(id)) throw new Error(`not a session id: ${id}`);
    return path.join(this.dir, `${id}.jsonl`);
  }
}
