/** Port of project-os-cockpit cockpit.py's stats_payload square/attention rules
 * and statuses.py bands (TASK-0144). No sidecar, filesystem or clock is needed.
 * overview-model.test.mjs compares this port with the real Python stats builder.
 */
import type { NoteRecord } from './records.js';
import type { Fill, NoteType, Ticket } from './overview-types.js';

const DONE: Readonly<Record<string, readonly string[]>> = {
  feature: ['done', 'released', 'merged', 'verified', 'complete', 'superseded', 'cancelled'],
  task: ['done', 'merged', 'verified', 'closed', 'fixed', 'cancelled', 'superseded'],
  requirement: ['implemented', 'verified', 'met', 'fulfilled', 'accepted', 'retired', 'superseded', 'cancelled'],
  issue: ['fixed', 'closed', 'declined', 'resolved', 'cancelled'],
  test: ['passing', 'retired'], risk: ['closed'], change: ['merged'], phase: ['done', 'superseded'],
};
const DONE_ANY = new Set(Object.values(DONE).flat());
const ARCHIVED = new Set(['obsolete', 'retired', 'cancelled', 'superseded', 'declined', 'reverted', 'deprecated', 'abandoned', 'reconciled']);
const BLOCKED = new Set(['blocked', 'failing', 'reopened']);
const DOING = new Set(['doing', 'active', 'in_progress']);
const norm = (value: unknown): string => String(value || '').trim().toLowerCase();

/** The cockpit's per-type terminal rule, also used for dependency targets. */
function isDone(record: NoteRecord): boolean {
  const type = record.types[0] ?? '';
  const statuses = Object.hasOwn(DONE, type) ? DONE[type] : undefined;
  return statuses ? statuses.includes(norm(record.status)) : DONE_ANY.has(norm(record.status));
}

/** Mirrors _staleness_days, including its default and accepted config spelling. */
export function cockpitStalenessDays(snapshot: string): number {
  const section = /^verification:\s*$/m.exec(snapshot);
  if (section) for (const line of snapshot.slice(section.index + section[0].length).split(/\r?\n/)) {
    if (line && !/^\s/.test(line)) break;
    const days = /^\s+staleness_days\s*:\s*(\d+)/.exec(line);
    if (days) return Number(days[1]);
  }
  return 90;
}

function dateDay(value: unknown): number | null {
  const raw = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === raw ? time / 86400000 : null;
}

function isUnproven(record: NoteRecord, today: string, days: number): boolean {
  const fm = record.frontmatter;
  if (String(fm['verification_waiver'] || '').trim()) return true;
  if (record.types[0] !== 'test' || String(fm['command'] || '').trim()) return false;
  const verified = dateDay(fm['last_verified']); const now = dateDay(today);
  return verified !== null && now !== null && now - verified > days;
}

/** The cockpit resolves depends by id, alias, filename, title, then drifted id.
 * Do not use the graph's broader path/heading resolver here: parity includes
 * which references the cockpit considers a dependency, not only its status.
 */
export function cockpitMarks(records: readonly NoteRecord[], today: string, days = 90): (record: NoteRecord, type: NoteType) => Pick<Ticket, 'type' | 'fill' | 'needsYou'> {
  const tables = [new Map<string, NoteRecord>(), new Map<string, NoteRecord>(), new Map<string, NoteRecord>(), new Map<string, NoteRecord>()];
  for (const r of records) {
    const keys = [[typeof r.frontmatter['id'] === 'string' ? r.id : ''], r.aliases, [r.fileName], [r.title ?? '']];
    keys.forEach((values, i) => values.forEach((key) => { if (key && !tables[i]!.has(key)) tables[i]!.set(key, r); }));
  }
  const dependency = (entry: string): NoteRecord | undefined => {
    let target = entry.trim();
    if (target.startsWith('[[') && target.endsWith(']]')) target = target.slice(2, -2);
    target = target.split('|')[0]!.trim();
    for (const table of tables) { const found = table.get(target); if (found) return found; }
    const id = /^([A-Z]{2,6}-\d{3,4})(?:-|$)/.exec(target)?.[1];
    return id ? tables[0]!.get(id) : undefined;
  };
  return (record, type) => {
    const status = norm(record.status);
    let fill: Fill = 'open';
    if (status === 'deferred') fill = 'deferred';
    else if (ARCHIVED.has(status)) fill = 'dropped';
    else if (isDone(record)) fill = isUnproven(record, today, days) ? 'unproven' : 'delivered';
    else if (DOING.has(status)) fill = 'doing';
    const depends = record.frontmatter['depends'];
    const unresolved = !isDone(record) && status !== 'deferred' && Array.isArray(depends) && depends.some((entry) => {
      const blocker = typeof entry === 'string' ? dependency(entry) : undefined;
      return blocker !== undefined && !isDone(blocker);
    });
    const needsYou = ['triage', 'review'].includes(status) || BLOCKED.has(status) || (record.types[0] === 'test' && status === 'ready') || unresolved;
    return { type, fill, needsYou };
  };
}
