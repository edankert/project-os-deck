/**
 * The cockpit's four overview panels, as Deck draws them at the wheel's top left (FEAT-0034,
 * TASK-0203; DES-0006): since you last looked, with Caught up; the record; the checks; and
 * what waits on a decision.
 *
 * Three are counted from the model, as DES-0006's page counts them. "Since you last looked"
 * reads the cockpit's digest (`/api/cockpit/digest`), which the sidecar gives to any caller.
 * Caught up is a write, offered in the shell only and sent by the main process (ADR-0003).
 */
import { TYPE_COLOUR, TYPE_WORD } from './overview-marks.js';
import type { ListRow, PanelNode, PanelRow, ScreenContext } from './overview-scene.js';
import type { NoteType, OverviewModel, Ticket } from './overview-types.js';

/** What the cockpit's digest says: when you last caught up, and the tickets changed since. */
export interface Digest {
  /** When you last caught up; null when you never have. */
  seenAt: string | null;
  /** The time the digest was worked out: what Caught up marks as seen, so nothing landing meanwhile is lost. */
  at: string;
  changed: Array<{ id: string; type: NoteType }>;
}

/** The digest from the sidecar's payload; null when it says it cannot give one. */
export function digestOf(payload: unknown): Digest | null {
  const p = (payload ?? {}) as { available?: unknown; seen_at?: unknown; computed_at?: unknown; transitions?: unknown };
  if (p.available === false || !Array.isArray(p.transitions)) return null;
  const seen = new Set<string>();
  const changed: Digest['changed'] = [];
  for (const t of p.transitions as Array<Record<string, unknown>>) {
    const id = String(t['id'] ?? '');
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    changed.push({ id, type: String(t['type'] ?? 'task') as NoteType });
  }
  const seenAt = typeof p.seen_at === 'string' && !p.seen_at.startsWith('1970') ? p.seen_at : null;
  return { seenAt, at: String(p.computed_at ?? ''), changed };
}

/** The action Caught up asks for, carrying the digest's time (TASK-0203). */
export const CAUGHT_UP = 'cockpit-caught-up:';

/** The record's types, in the cockpit's order. */
const RECORD: readonly NoteType[] = ['feature', 'task', 'requirement', 'test', 'issue', 'risk'];

export interface PanelCockpit {
  kind: 'cockpit';
  since: { seen: string | null; total: number; byType: Array<{ type: NoteType; n: number }>; caughtUp?: string; known: boolean };
  record: Array<{ type: NoteType; word: string; colour: string; total: number; closed: number; progress: number; open: number; dropped: number }>;
  checks: { total: number; parts: Array<{ word: string; n: number; colour: string }> };
  deciding: { total: number; rows: PanelRow[] };
}

/**
 * The four panels as one, top left on the wheel. `digest` undefined is not read yet; null is
 * a sidecar that gives none. `caughtUp` offers the button, in the shell only.
 */
export function cockpitPanel(model: OverviewModel, ctx: ScreenContext, place: { x: number; y: number; w: number; h: number }, digest: Digest | null | undefined, caughtUp: boolean): { node: PanelNode; rows: ListRow[] } {
  const tickets = Object.values(model.tickets);
  const byType = new Map<NoteType, number>();
  for (const c of digest?.changed ?? []) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  const since: PanelCockpit['since'] = {
    seen: digest?.seenAt ?? null,
    total: digest?.changed.length ?? 0,
    byType: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, n]) => ({ type, n })),
    known: digest != null,
    ...(caughtUp && digest != null ? { caughtUp: `${CAUGHT_UP}${digest.at}` } : {}),
  };
  const record = RECORD.map((type) => {
    const list = tickets.filter((t) => t.type === type);
    const n = (s: Ticket['state']): number => list.filter((t) => t.state === s).length;
    return { type, word: TYPE_WORD[type], colour: TYPE_COLOUR[type], total: list.length, closed: n('closed'), progress: n('progress'), open: n('open'), dropped: n('dropped') };
  }).filter((r) => r.total > 0);
  const tests = tickets.filter((t) => t.type === 'test');
  const checks = {
    total: tests.length,
    parts: ([['passing', 'passing', '#5ad19a'], ['failing', 'failing', '#ff4d4d'], ['ready', 'never run', '#e9c46a'], ['active', 'active', '#5fb3c8']] as const)
      .map(([status, word, colour]) => ({ word, colour, n: tests.filter((t) => t.status === status).length })).filter((p) => p.n > 0),
  };
  const waiting = tickets.filter((t) => (t.type === 'adr' || t.type === 'design') && (t.status === 'proposed' || t.status === 'draft'))
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const rowOf = (t: Ticket): PanelRow => ({ id: t.id, type: t.type, fill: t.fill, needsYou: t.needsYou, title: t.title, status: t.status, target: ctx.address({ page: 'wheel', select: t.id }) });
  // Two rows fit under the other three panels; the count beside the heading says how many wait in all.
  const deciding = { total: waiting.length, rows: waiting.slice(0, 2).map(rowOf) };
  const body: PanelCockpit = { kind: 'cockpit', since, record, checks, deciding };
  const sinceWords = !since.known ? 'since you last looked: not known' : since.total === 0 ? 'nothing changed since you last looked' : `${since.total} changed since you last looked`;
  return {
    node: { kind: 'panel', key: 'cockpit', ...place, label: `The cockpit's overview: ${sinceWords}; ${checks.total} tests; ${waiting.length} waiting on a decision`, body },
    rows: [
      { id: 'cockpit-since', label: since.known ? `${sinceWords}${since.byType.length > 0 ? `: ${since.byType.map((b) => `${b.n} ${TYPE_WORD[b.type]}`).join(', ')}` : ''}` : sinceWords, group: 'Overview', ...(since.total > 0 ? { lights: digest!.changed.map((c) => c.id).filter((id) => model.tickets[id] !== undefined) } : {}) },
      ...(since.caughtUp !== undefined ? [{ id: 'cockpit-caught-up', label: 'Caught up: mark everything changed so far as seen', group: 'Overview', action: since.caughtUp }] : []),
      ...record.map((r) => ({ id: `cockpit-record-${r.type}`, label: `${r.word}: ${r.closed} done of ${r.total}`, group: 'Overview' })),
      { id: 'cockpit-checks', label: `${checks.total} tests: ${checks.parts.map((p) => `${p.n} ${p.word}`).join(', ')}`, group: 'Overview' },
      ...deciding.rows.map((r) => ({ id: r.id, label: `Waiting on a decision: ${r.id} ${r.title} (${r.status})`, group: 'Overview', target: r.target! })),
    ],
  };
}
