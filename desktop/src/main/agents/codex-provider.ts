/**
 * The Codex provider (FEAT-0032, TASK-0193): a session through `codex app-server`,
 * JSON-RPC over the child's standard input and output, one message per line
 * (codex-cli 0.162.1, RISK-0012; the protocol's types come from `codex app-server
 * generate-ts`).
 *
 * One app-server process holds one thread: `thread/start` (or `thread/resume` by the
 * thread's id), then a `turn/start` for each prompt. What Codex does arrives as
 * notifications (an item started or completed, the plan updated, the turn completed),
 * and **every approval arrives as a request from the server that waits for Deck's
 * answer**: a command, a file change, or the older forms of both.
 *
 * **A session never skips permissions** (RISK-0013). "Ask before acting" runs with the
 * `untrusted` approval policy, which asks before any command Codex does not already
 * know to be safe; "edit files without asking" runs with `on-request`, where Codex edits
 * inside its folder freely and asks to go further. Both keep the `workspace-write`
 * sandbox. Deck never passes the `never` policy or `danger-full-access`.
 *
 * The child process can be injected, so the suite drives the provider with a fake
 * app-server script and never reaches a model (RISK-0017).
 */
import crypto from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AccessLevel, ConversationRecord } from '../../shared/agent-types.js';
import type { AgentProvider, ProviderHooks, ProviderSession, StartOptions } from './provider.js';
import { cleanEnvironment } from './claude-provider.js';

/** The approval policy and sandbox for an access level. There is no level that skips permissions. */
export function codexPolicy(access: AccessLevel): { approvalPolicy: 'untrusted' | 'on-request'; sandbox: 'workspace-write'; approvalsReviewer: 'user' } {
  // The reviewer is pinned to the person: left out, `~/.codex/config.toml` decides, and `auto_review` would hand
  // Deck's approvals to a model (review, round one).
  return { approvalPolicy: access === 'edits' ? 'on-request' : 'untrusted', sandbox: 'workspace-write', approvalsReviewer: 'user' };
}

/** How the app-server child is started: `codex app-server` on the PATH, unless the suite gives its own. */
export type SpawnAppServer = (folder: string) => ChildProcessWithoutNullStreams;

export const spawnCodex: SpawnAppServer = (folder) => spawn('codex', ['app-server'], { cwd: folder, env: cleanEnvironment(process.env), stdio: ['pipe', 'pipe', 'pipe'] });

type Json = Record<string, unknown>;

/** Lines added and removed in a unified diff, ignoring its headers. */
export function diffCounts(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

const clip = (s: string): string => {
  const one = s.split('\n')[0] ?? '';
  return one.length > 160 ? `${one.slice(0, 159)}…` : one;
};

export class CodexProvider implements AgentProvider {
  readonly agent = 'codex' as const;
  constructor(private readonly spawnServer: SpawnAppServer = spawnCodex, private readonly now: () => string = () => new Date().toISOString(), private readonly version = '0.1.0') {}

  async start(options: StartOptions, hooks: ProviderHooks): Promise<ProviderSession> {
    const child = this.spawnServer(options.folder);
    let nextId = 1;
    const pending = new Map<number, { resolve: (v: Json) => void; reject: (e: Error) => void }>();
    let ended = false;
    const end = (reason?: string): void => {
      if (ended) return;
      ended = true;
      for (const p of pending.values()) p.reject(new Error(reason ?? 'the app-server ended'));
      pending.clear();
      hooks.ended(reason);
    };
    const write = (message: Json): void => {
      if (!ended) child.stdin.write(`${JSON.stringify(message)}\n`);
    };
    const request = (method: string, params: Json): Promise<Json> => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      write({ id, method, params });
    });
    let threadId = '';
    let turnId = '';
    // What a file change touches, from when it started, for its approval's summary.
    const changePaths = new Map<string, string>();

    // A request is known by the item it approves, unique across every resume of the thread; the JSON-RPC
    // request ids start again with each app-server, so they cannot be (review, round one).
    const ask = async (tool: string, summary: string, params: Json): Promise<boolean> => {
      const item = String(params['itemId'] ?? params['callId'] ?? '');
      const answer = await hooks.ask({ id: `codex-ask-${item !== '' ? item : crypto.randomUUID()}`, ...(item !== '' ? { toolUse: item } : {}), tool, summary });
      return answer.allow;
    };
    const onServerRequest = async (id: number | string, method: string, params: Json): Promise<void> => {
      try {
        if (method === 'item/commandExecution/requestApproval') {
          const ok = await ask('Bash', clip(String(params['command'] ?? params['reason'] ?? 'a command')), params);
          write({ id, result: { decision: ok ? 'accept' : 'decline' } });
        } else if (method === 'item/fileChange/requestApproval') {
          const ok = await ask('Edit', clip(changePaths.get(String(params['itemId'] ?? '')) ?? String(params['reason'] ?? 'a file change')), params);
          write({ id, result: { decision: ok ? 'accept' : 'decline' } });
        } else if (method === 'execCommandApproval') {
          const command = Array.isArray(params['command']) ? (params['command'] as unknown[]).join(' ') : String(params['command'] ?? '');
          const ok = await ask('Bash', clip(command), params);
          write({ id, result: { decision: ok ? 'approved' : 'denied' } });
        } else if (method === 'applyPatchApproval') {
          const files = params['fileChanges'] !== null && typeof params['fileChanges'] === 'object' ? Object.keys(params['fileChanges'] as Json).join(', ') : 'a file change';
          const ok = await ask('Edit', clip(files), params);
          write({ id, result: { decision: ok ? 'approved' : 'denied' } });
        } else {
          // Anything else Deck does not answer is refused, never granted by default.
          write({ id, error: { code: -32601, message: `Deck does not answer ${method}` } });
        }
      } catch (err) {
        write({ id, error: { code: -32000, message: err instanceof Error ? err.message : String(err) } });
      }
    };
    const onNotification = (method: string, params: Json): void => {
      const at = this.now();
      const item = (params['item'] ?? {}) as Json;
      const type = String(item['type'] ?? '');
      const itemId = String(item['id'] ?? '');
      if (method === 'item/started') {
        if (type === 'commandExecution') hooks.record({ kind: 'tool', at, id: itemId, name: 'Bash', summary: clip(String(item['command'] ?? '')), outcome: 'running' });
        if (type === 'fileChange') {
          const paths = ((item['changes'] ?? []) as Json[]).map((c) => String(c['path'] ?? '')).join(', ');
          changePaths.set(itemId, paths);
          hooks.record({ kind: 'tool', at, id: itemId, name: 'Edit', summary: clip(paths), outcome: 'running' });
        }
        if (type === 'mcpToolCall') hooks.record({ kind: 'tool', at, id: itemId, name: `${String(item['server'] ?? '')}.${String(item['tool'] ?? '')}`, summary: '', outcome: 'running' });
      } else if (method === 'item/completed') {
        if (type === 'agentMessage' && typeof item['text'] === 'string' && item['text'].trim() !== '') hooks.record({ kind: 'text', at, text: item['text'] });
        if (type === 'commandExecution') {
          const status = String(item['status'] ?? '');
          hooks.record({ kind: 'tool', at, id: itemId, name: 'Bash', summary: clip(String(item['command'] ?? '')), outcome: status === 'completed' ? 'done' : 'failed' });
        }
        if (type === 'mcpToolCall') hooks.record({ kind: 'tool', at, id: itemId, name: `${String(item['server'] ?? '')}.${String(item['tool'] ?? '')}`, summary: '', outcome: String(item['status'] ?? '') === 'completed' ? 'done' : 'failed' });
        if (type === 'fileChange') {
          const applied = String(item['status'] ?? '') === 'completed';
          const changes = (item['changes'] ?? []) as Json[];
          hooks.record({ kind: 'tool', at, id: itemId, name: 'Edit', summary: clip(changePaths.get(itemId) ?? changes.map((c) => String(c['path'] ?? '')).join(', ')), outcome: applied ? 'done' : 'failed' });
          // An edit counts once it is made, not when it is proposed.
          if (applied) for (const c of changes) hooks.record({ kind: 'edit', at, path: String(c['path'] ?? ''), ...diffCounts(String(c['diff'] ?? '')), diff: String(c['diff'] ?? '').slice(0, 20000) });
        }
      } else if (method === 'turn/plan/updated') {
        const steps = ((params['plan'] ?? []) as Json[]).map((s) => ({ text: String(s['step'] ?? ''), done: s['status'] === 'completed' }));
        if (steps.length > 0) hooks.record({ kind: 'plan', at, steps });
      } else if (method === 'turn/started') {
        turnId = String(((params['turn'] ?? {}) as Json)['id'] ?? turnId);
      } else if (method === 'turn/completed') {
        const turn = (params['turn'] ?? {}) as Json;
        if (turn['status'] === 'failed') hooks.record({ kind: 'text', at, text: `The turn failed${turn['error'] ? `: ${String((turn['error'] as Json)['message'] ?? '')}` : ''}.` });
        turnId = '';
        hooks.turnEnded();
      } else if (method === 'error') {
        hooks.record({ kind: 'text', at, text: `Codex reported an error: ${clip(String(((params['error'] ?? {}) as Json)['message'] ?? params['message'] ?? ''))}` });
      }
    };

    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => {
      let m: Json;
      try { m = JSON.parse(line) as Json; } catch { return; } // a line that is not JSON is the server's own logging
      const id = m['id'] as number | string | undefined;
      if (id !== undefined && typeof m['method'] === 'string') void onServerRequest(id, m['method'], (m['params'] ?? {}) as Json);
      else if (id !== undefined && pending.has(Number(id))) {
        const p = pending.get(Number(id))!;
        pending.delete(Number(id));
        if (m['error'] !== undefined) p.reject(new Error(String(((m['error'] as Json)['message']) ?? 'the app-server refused')));
        else p.resolve((m['result'] ?? {}) as Json);
      } else if (typeof m['method'] === 'string') onNotification(m['method'], (m['params'] ?? {}) as Json);
    });
    child.on('exit', (code) => end(code === 0 || code === null ? undefined : `codex app-server exited with ${code}`));
    child.on('error', (err) => end(err.message));

    const policy = codexPolicy(options.access);
    await request('initialize', { clientInfo: { name: 'deck', title: 'Deck', version: this.version }, capabilities: null });
    write({ method: 'initialized', params: {} });
    const opened = options.resume !== undefined
      ? await request('thread/resume', { threadId: options.resume, cwd: options.folder, ...policy, ...(options.model !== '' ? { model: options.model } : {}) })
      : await request('thread/start', { cwd: options.folder, ...policy, ...(options.model !== '' ? { model: options.model } : {}) });
    threadId = String(((opened['thread'] ?? {}) as Json)['id'] ?? options.resume ?? '');
    if (threadId === '') throw new Error('codex app-server opened no thread');
    hooks.identified(threadId);
    const turn = async (text: string): Promise<void> => {
      const started = await request('turn/start', { threadId, input: [{ type: 'text', text }], ...(options.effort !== '' ? { effort: options.effort } : {}) });
      turnId = String(((started['turn'] ?? {}) as Json)['id'] ?? turnId);
    };
    await turn(options.prompt);
    return {
      send: (text) => turn(text),
      interrupt: async () => {
        if (turnId !== '') await request('turn/interrupt', { threadId, turnId });
      },
      stop: async () => {
        child.stdin.end();
        child.kill();
        end();
      },
    };
  }
}

export type { ConversationRecord };
