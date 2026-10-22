/**
 * The session pane, as data (FEAT-0033, TASK-0197; DES-0006): what the right pane draws
 * for one session, the way T3 Code draws a conversation.
 *
 * A pure function of the session's record and its conversation, so the suite checks it
 * with no window and a larger session window could reuse it later (Edwin chose the side
 * pane and left it open for discussion). The renderer draws it in `agent-pane.ts`.
 *
 * The real words are shown: the pane draws a session on Edwin's own machine. Nothing here
 * is ever a cost (FEAT-0030, RISK-0016).
 */
import { latest, type AccessLevel, type AgentKind, type ConversationRecord, type SessionRecord, type SessionState } from './agent-types.js';

export const AGENT_WORD: Readonly<Record<AgentKind, string>> = { claude: 'Claude', codex: 'Codex' };
export const AGENT_GLYPH: Readonly<Record<AgentKind, string>> = { claude: '✳', codex: '◎' };
export const STATE_WORD: Readonly<Record<SessionState, string>> = { working: 'working', waiting: 'waiting for you', idle: 'idle', stopped: 'stopped', failed: 'failed' };
export const ACCESS_WORD: Readonly<Record<AccessLevel, string>> = { ask: 'Ask before acting', edits: 'Edit files without asking' };

export type PermissionRecord = Extract<ConversationRecord, { kind: 'permission' }>;

/** One thing a turn draws, in the order it happened. */
export type PaneItem =
  | { kind: 'text'; text: string }
  | { kind: 'steps'; chips: Array<{ name: string; count: number; failed: number; running: number }> }
  | { kind: 'edits'; files: Array<{ path: string; added: number; removed: number; diff: string }> }
  | { kind: 'plan'; steps: Array<{ text: string; done: boolean }> }
  | { kind: 'permission'; request: PermissionRecord }
  | { kind: 'note'; text: string };

export interface PaneTurn {
  prompt: string | null;
  at: string | null;
  items: PaneItem[];
}

export interface PaneModel {
  head: {
    agent: AgentKind;
    word: string;
    glyph: string;
    shortId: string;
    state: SessionState;
    stateWord: string;
    ticket: string | null;
    created: string;
    lastActive: string;
    where: string;
    model: string;
    effort: string;
    access: string;
  };
  /** Minutes the session has run, from its first record to its last. No cost, ever. */
  minutes: number;
  turns: PaneTurn[];
  /** "Claude is waiting for you", for a session waiting on a person; else null. */
  waiting: string | null;
  /** The requests still open, oldest first: what Approve and Deny act on. */
  open: PermissionRecord[];
}

/** The turns, with a run of tool calls folded into chips and a run of edits into one list. */
export function paneTurns(records: readonly ConversationRecord[]): PaneTurn[] {
  const turns: PaneTurn[] = [];
  const turn = (): PaneTurn => {
    if (turns.length === 0) turns.push({ prompt: null, at: null, items: [] });
    return turns[turns.length - 1]!;
  };
  for (const r of latest(records)) {
    if (r.kind === 'prompt') {
      turns.push({ prompt: r.text, at: r.at, items: [] });
      continue;
    }
    // A change of state with nothing to say draws nothing, and starts no turn of its own.
    if (r.kind === 'state' && r.state !== 'failed' && r.reason === undefined) continue;
    const items = turn().items;
    const last = items[items.length - 1];
    if (r.kind === 'text') items.push({ kind: 'text', text: r.text });
    else if (r.kind === 'tool') {
      const steps = last?.kind === 'steps' ? last : (items.push({ kind: 'steps', chips: [] }), items[items.length - 1] as Extract<PaneItem, { kind: 'steps' }>);
      let chip = steps.chips.find((c) => c.name === r.name);
      if (chip === undefined) {
        chip = { name: r.name, count: 0, failed: 0, running: 0 };
        steps.chips.push(chip);
      }
      chip.count += 1;
      if (r.outcome === 'failed') chip.failed += 1;
      if (r.outcome === 'running') chip.running += 1;
    } else if (r.kind === 'edit') {
      const edits = last?.kind === 'edits' ? last : (items.push({ kind: 'edits', files: [] }), items[items.length - 1] as Extract<PaneItem, { kind: 'edits' }>);
      const same = edits.files.find((f) => f.path === r.path);
      if (same !== undefined) {
        same.added += r.added;
        same.removed += r.removed;
        same.diff = `${same.diff}\n${r.diff}`;
      } else edits.files.push({ path: r.path, added: r.added, removed: r.removed, diff: r.diff });
    } else if (r.kind === 'plan') {
      // The plan as it stands now: a later plan in the same turn replaces the earlier.
      const at = items.findIndex((i) => i.kind === 'plan');
      if (at >= 0) items.splice(at, 1);
      items.push({ kind: 'plan', steps: r.steps });
    } else if (r.kind === 'permission') items.push({ kind: 'permission', request: r });
    else if (r.kind === 'state' && (r.state === 'failed' || r.reason !== undefined)) {
      items.push({ kind: 'note', text: r.state === 'failed' ? `Failed: ${r.reason ?? 'the agent stopped'}` : `${STATE_WORD[r.state]}: ${r.reason}` });
    }
  }
  return turns;
}

export function paneOf(session: SessionRecord, records: readonly ConversationRecord[]): PaneModel {
  const word = AGENT_WORD[session.agent];
  const open = latest(records).filter((r): r is PermissionRecord => r.kind === 'permission' && r.outcome === 'open');
  const first = records[0]?.at ?? session.created;
  const lastAt = records[records.length - 1]?.at ?? session.lastActive;
  const minutes = Math.max(0, Math.round((Date.parse(lastAt) - Date.parse(first)) / 60000));
  return {
    head: {
      agent: session.agent, word, glyph: AGENT_GLYPH[session.agent], shortId: session.id.slice(0, 8), state: session.state, stateWord: STATE_WORD[session.state],
      ticket: session.ticket, created: session.created, lastActive: session.lastActive,
      where: session.place === 'worktree' ? `worktree ${session.branch ?? ''}`.trim() : 'this checkout',
      model: session.model, effort: session.effort, access: ACCESS_WORD[session.access],
    },
    minutes: Number.isFinite(minutes) ? minutes : 0,
    turns: paneTurns(records),
    waiting: session.state === 'waiting' ? `${word} is waiting for you` : null,
    open,
  };
}

/** What the composer offers for a session in its state (TASK-0198). */
export function composerOf(session: Pick<SessionRecord, 'state'>): { send: boolean; interrupt: boolean; resume: boolean; stop: boolean } {
  const s = session.state;
  return {
    // A prompt goes to a session waiting at the end of its turn or idle; a working one is interrupted first.
    send: s === 'idle' || s === 'waiting',
    interrupt: s === 'working',
    resume: s === 'idle' || s === 'stopped' || s === 'failed',
    stop: s === 'working' || s === 'waiting' || s === 'idle',
  };
}
