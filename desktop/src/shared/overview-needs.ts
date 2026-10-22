/**
 * Three of TASK-0177's ideas from DES-0005's towers page, as Deck draws them (TASK-0184):
 * what needs you split by the cockpit's reasons, how long each tower has been quiet, and
 * the year as weeks of closed tickets.
 *
 * Ages and weeks are dates, which PHASE-0005 once left out ("state, not time"). Edwin's yes
 * to TASK-0177 asked for both; forecasts stay out. "Today" is passed in, so a check gives
 * the same answer on any day.
 */
import { weeksOf } from './overview-notes.js';
import type { ListRow, PanelNode, PanelRow, ScreenContext } from './overview-scene.js';
import type { NeedReason, OverviewModel, Ticket } from './overview-types.js';

/** The cockpit's reasons, the most urgent first, with the words and colours the panel draws. */
export const REASONS: ReadonlyArray<{ reason: NeedReason; word: string; colour: string }> = [
  { reason: 'failed', word: 'failed', colour: '#ff4d4d' },
  { reason: 'review', word: 'to review', colour: '#e8655a' },
  { reason: 'triage', word: 'to decide', colour: '#f0a35b' },
  { reason: 'ready', word: 'to run', colour: '#e9c46a' },
  { reason: 'waiting', word: 'waiting', colour: '#8f6f78' },
];

/** A tower quiet this many days or more carries its age. */
export const QUIET_DAYS = 14;

const DAY = 86400000;

/** Days from the newest `updated:` among these tickets to `today`, or null when none gives a date. Never below zero. */
export function quietDays(tickets: ReadonlyArray<Pick<Ticket, 'updated'>>, today: string): number | null {
  let newest = '';
  for (const t of tickets) if ((t.updated ?? '') > newest) newest = t.updated!;
  if (newest === '' || today === '') return null;
  return Math.max(0, Math.round((Date.parse(today.slice(0, 10)) - Date.parse(newest)) / DAY));
}

/** The day the overview counts ages to: the date it was built, which is today for a live model. */
export const todayOf = (model: Pick<OverviewModel, 'generated'>): string => model.generated.slice(0, 10);

/** What needs you, by reason: every ticket the cockpit's rule flags, each under its reason, in id order. */
export function needsByReason(model: OverviewModel): Map<NeedReason, Ticket[]> {
  const by = new Map<NeedReason, Ticket[]>(REASONS.map((r) => [r.reason, []]));
  const all = Object.values(model.tickets).filter((t) => t.needsYou).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  for (const t of all) (by.get(t.needs?.reason ?? 'waiting') ?? by.get('waiting')!).push(t);
  return by;
}

function row(t: Ticket, ctx: ScreenContext): PanelRow {
  return { id: t.id, type: t.type, fill: t.fill, needsYou: t.needsYou, title: t.title, status: t.status, target: ctx.address({ page: 'wheel', select: t.id }), ...(t.needs ? { note: t.needs.say } : {}) };
}

/** The needs-you panel, top right on the wheel. */
export function needsPanel(model: OverviewModel, ctx: ScreenContext, place: { x: number; y: number; w: number; h: number }): { node: PanelNode; rows: ListRow[] } {
  const by = needsByReason(model);
  const parts = REASONS.filter((r) => by.get(r.reason)!.length > 0).map((r) => ({ reason: r.reason, word: r.word, colour: r.colour, ids: by.get(r.reason)!.map((t) => t.id) }));
  const first = REASONS.flatMap((r) => by.get(r.reason)!).slice(0, 3);
  const total = parts.reduce((n, p) => n + p.ids.length, 0);
  return {
    node: { kind: 'panel', key: 'needs-you', ...place, label: `${total} tickets need you`, body: { kind: 'needs', total, parts, rows: first.map((t) => row(t, ctx)) } },
    rows: [
      ...parts.map((p) => ({ id: `needs-${p.reason}`, label: `${p.ids.length} ${p.word}: light them on the towers`, group: 'Needs you', lights: p.ids })),
      ...first.map((t) => ({ id: t.id, label: `${t.id} ${t.title}: ${t.needs?.say ?? 'needs you'}`, group: 'Needs you', state: t.state, target: ctx.address({ page: 'wheel', select: t.id }) })),
    ],
  };
}

/** The year as weeks, bottom right on the wheel: each closed ticket in the week of its last update. */
export function weeksPanel(model: OverviewModel, today: string, place: { x: number; y: number; w: number; h: number }): { node: PanelNode; rows: ListRow[] } {
  const closed = Object.values(model.tickets).filter((t) => t.state === 'closed').sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const w = weeksOf(closed.map((t) => [t.id, t.updated ?? '']), today);
  const undated = closed.filter((t) => (t.updated ?? '') === '').map((t) => t.id);
  const total = w.closed.reduce((n, ids) => n + ids.length, 0);
  return {
    node: { kind: 'panel', key: 'weeks', ...place, label: `${w.year}: ${total} tickets closed, by week`, body: { kind: 'weeks', year: w.year, now: w.now, weeks: w.closed, undated } },
    rows: [
      ...w.closed.map((ids, i) => ({ id: `week-${i + 1}`, label: `Week ${i + 1} of ${w.year}: ${ids.length} closed${i === w.now ? ' (this week)' : ''}`, group: `${w.year} by week`, lights: ids })),
      ...(undated.length > 0 ? [{ id: 'weeks-undated', label: `${undated.length} closed with no date`, group: `${w.year} by week`, lights: undated }] : []),
    ],
  };
}
