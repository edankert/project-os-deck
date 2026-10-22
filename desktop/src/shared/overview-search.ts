/**
 * Search on the towers (TASK-0183, TASK-0176 on DES-0005's towers page): which tickets a
 * query finds, in the order the list under the box shows them.
 *
 * A ticket matches when its id or its title has a word starting with each word typed, so
 * "rate" finds "Heart Rate" and not "generate", and "task-01" finds TASK-0154. The ticket
 * whose id is typed whole comes first, then what needs you, then open work before closed,
 * then by id. Only the ids and titles are searched, not the notes' text.
 */
import type { OverviewModel, Ticket } from './overview-types.js';

/** The list under the search box shows this many; the ring lights them all. */
export const SEARCH_LIST = 12;

export function searchTickets(model: OverviewModel, query: string): Ticket[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => new RegExp(`(?:^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  if (words.length === 0) return [];
  const exact = query.trim().toUpperCase();
  const found = Object.values(model.tickets).filter((t) => {
    const hay = `${t.id} ${t.title}`.toLowerCase();
    return words.every((w) => w.test(hay));
  });
  return found.sort((a, b) => Number(b.id === exact) - Number(a.id === exact) || Number(b.needsYou) - Number(a.needsYou)
    || Number(a.state === 'closed') - Number(b.state === 'closed') || a.id.localeCompare(b.id, 'en', { numeric: true }));
}
