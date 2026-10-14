/** DES-0004's state table and five placement rules, over Deck's own records.
 * No filesystem, clock or ledger access lives here: callers supply the text
 * and provenance. Unknown statuses stay open rather than claiming completion.
 */
import { isTemplate, type NoteRecord } from './records.js';
import { linksIn, Resolver, LINK_BEARING_FIELDS } from './graph.js';
import { firstHeading, parseFrontmatter } from './yaml.js';
import { CORE_KINDS, PHASE_KINDS, STATE_ORDER, emptyCounts, type Kind, type State, type Phase, type OverviewModel, type Ticket } from './overview-types.js';

export interface OverviewOptions {
  workspace: string;
  head?: string;
  dirty?: boolean;
  generated?: string;
  /** Full Markdown or body only; called once per phase or ticket. */
  readBody: (relPath: string) => string;
  /** Resolved result on every ledger platform, including not-run and withdrawals. */
  acceptanceResults?: Readonly<Record<string, readonly string[]>>;
  /** Without CI evidence, active/passing are status approximations, not a CI verdict. */
  ciGreen?: boolean;
}

const TYPES: Readonly<Record<string, Kind>> = {
  requirement: 'req', feature: 'feat', task: 'task', test: 'test', issue: 'iss',
  adr: 'dec', decision: 'dec', design: 'dec', risk: 'risk',
};
const CLOSED: Record<Kind, readonly string[]> = {
  req: ['implemented'], feat: ['done'], task: ['done'], test: ['active', 'passing'],
  iss: ['fixed'], dec: ['accepted'], risk: ['closed'],
};
const DROPPED: Record<Kind, readonly string[]> = {
  req: ['retired', 'superseded'], feat: ['cancelled', 'superseded', 'deferred'],
  task: ['cancelled', 'superseded', 'deferred'], test: ['retired'],
  iss: ['declined', 'deferred'], dec: ['superseded', 'declined'], risk: [],
};
const MEMBERS = ['requirements', 'features', 'tasks', 'tests', 'issues'];
const PARENTS = ['parent', 'implements', 'covers'];

function stateFor(record: NoteRecord, kind: Kind, options: OverviewOptions): State {
  const status = record.status ?? '';
  if (DROPPED[kind].includes(status)) return 'dropped';
  if (kind === 'test' && record.frontmatter['level'] === 'acceptance') {
    const results = options.acceptanceResults?.[record.id] ?? [];
    if (results.some((r) => ['fail', 'failed', 'failing'].includes(r))) return 'failed';
    if (results.some((r) => ['invalidated', 'withdrawn', 'owed', 'owed-again'].includes(r))) return 'owed';
    if (results.length > 0 && results.every((r) => ['pass', 'passed', 'passing', 'excused', 'na'].includes(r))) return 'closed';
    return 'open';
  }
  if (kind === 'test' && status === 'failing') return 'failed';
  if (CLOSED[kind].includes(status)) return kind === 'test' && options.ciGreen === false ? 'open' : 'closed';
  if ((kind === 'feat' && ['doing', 'review'].includes(status)) ||
      (kind === 'task' && status === 'doing') || (kind === 'risk' && status === 'mitigating')) return 'progress';
  return 'open';
}

/** Only the Exit Criteria section counts; fenced examples are not criteria. */
export function parseExitCriteria(text: string): Phase['exit'] {
  const lines = parseFrontmatter(text).body.split(/\r?\n/);
  const section: string[] = [];
  let inside = false;
  let fence = '';
  for (const line of lines) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker !== undefined) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = '';
      continue;
    }
    if (fence) continue;
    if (/^##\s+Exit Criteria\s*#*\s*$/i.test(line)) { inside = true; continue; }
    if (inside && /^#{1,2}\s/.test(line)) break;
    if (inside) section.push(line);
  }
  const items: Phase['exit']['items'] = [];
  for (const line of section) {
    const box = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/.exec(line);
    if (box) items.push({ text: box[2]?.trim() ?? '', ticked: box[1]?.toLowerCase() === 'x' });
    else if (/^\s+\S/.test(line) && items.length > 0) items[items.length - 1]!.text += ` ${line.trim()}`;
  }
  return { items, prose: items.length === 0 && section.some((line) => line.trim() !== '') };
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function day(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10);
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : null;
}

export function buildOverview(records: NoteRecord[], options: OverviewOptions): OverviewModel {
  const notes = records.filter((r) => !isTemplate(r.relPath)).slice().sort((a, b) => a.relPath.localeCompare(b.relPath));
  const resolver = new Resolver(notes.map((r) => ({ ...r, hasId: typeof r.frontmatter['id'] === 'string', text: '' })));
  const byPath = new Map(notes.map((r) => [r.relPath, r]));
  const resolve = (raw: string): NoteRecord | undefined => {
    let target = raw.replace(/^\[\[|\]\]$/g, '').split('|')[0]?.trim() ?? '';
    // A local filename or alias wins before interpreting name#heading as a
    // project reference. Never resolve the fragment as a local ticket id.
    target = target.split('#')[0] ?? '';
    target = target.replace(/\.md$/i, '');
    return byPath.get(target) ?? byPath.get(`${target}.md`) ?? byPath.get(resolver.resolve(target) ?? '');
  };
  const references = (value: unknown): NoteRecord[] => strings(value).flatMap((text) => {
    const links = linksIn(text);
    const targets = links.length > 0 ? links.map((l) => l.target) : [text];
    return targets.map(resolve).filter((r): r is NoteRecord => r !== undefined);
  });
  const phaseNotes = notes.filter((r) => r.types.includes('phase')).sort((a, b) => {
    const order = (r: NoteRecord): number => typeof r.frontmatter['order'] === 'number' ? r.frontmatter['order'] : Number(r.id.match(/\d+$/)?.[0] ?? 0);
    return order(a) - order(b) || a.id.localeCompare(b.id);
  });
  const phases = new Map<string, Phase>();
  for (const r of phaseNotes) {
    if (phases.has(r.id)) throw new Error(`Duplicate overview phase id: ${r.id}`);
    const text = options.readBody(r.relPath);
    phases.set(r.id, {
      id: r.id, number: String(Number(r.id.match(/\d+$/)?.[0] ?? 0)).padStart(3, '0'),
      name: firstHeading(parseFrontmatter(text).body) ?? r.title ?? r.id, status: r.status ?? '',
      kind: ['done', 'superseded'].includes(r.status ?? '') ? 'finished' : r.id.endsWith('999') || r.frontmatter['kind'] === 'backlog' ? 'backlog' : 'open',
      exit: parseExitCriteria(text), counts: emptyCounts(), tickets: [],
    });
  }
  const model: OverviewModel = {
    workspace: options.workspace, head: options.head ?? '', ...(options.dirty === undefined ? {} : { dirty: options.dirty }), generated: options.generated ?? '',
    phases: [], shelf: [], backlog: [], core: { tickets: [], counts: emptyCounts() }, tickets: Object.create(null) as Record<string, Ticket>,
  };
  const ticketNotes = new Map<string, NoteRecord>();
  for (const r of notes) {
    const kind = r.types.map((t) => Object.hasOwn(TYPES, t) ? TYPES[t] : undefined).find((k) => k !== undefined);
    if (kind === undefined) continue;
    if (Object.hasOwn(model.tickets, r.id)) throw new Error(`Duplicate overview ticket id: ${r.id}`);
    const links = new Set<string>();
    for (const [key, value] of Object.entries(r.frontmatter)) {
      // Bare ids belong only to relationship fields; wikilinks can occur in any field.
      for (const text of strings(value)) {
        const targets = linksIn(text).map((l) => l.target);
        if (LINK_BEARING_FIELDS.has(key) || MEMBERS.includes(key) || PARENTS.includes(key)) targets.push(text);
        for (const target of targets) { const note = resolve(target); if (note && note.id !== r.id) links.add(note.id); }
      }
    }
    for (const link of linksIn(options.readBody(r.relPath))) {
      const note = resolve(link.target);
      if (note && note.id !== r.id) links.add(note.id);
    }
    model.tickets[r.id] = { id: r.id, kind, state: stateFor(r, kind, options), status: r.status ?? '', title: r.title ?? r.id,
      phase: null, placedBy: kind === 'dec' || kind === 'risk' ? 'project-wide' : 'none', links: [...links].sort() };
    ticketNotes.set(r.id, r);
  }
  const members = new Map<string, string>();
  for (const phase of phaseNotes) for (const field of MEMBERS) for (const member of references(phase.frontmatter[field])) {
    if (!members.has(member.id)) members.set(member.id, phase.id);
  }
  // First assign ALL explicit placements. Parent resolution cannot depend on note order.
  for (const [id, r] of ticketNotes) {
    const ticket = model.tickets[id]!;
    if (ticket.placedBy === 'project-wide') continue;
    const own = references(r.frontmatter['phase']).find((p) => phases.has(p.id));
    const member = members.get(id);
    if (own) { ticket.phase = own.id; ticket.placedBy = 'own'; }
    else if (member) { ticket.phase = member; ticket.placedBy = 'member-list'; }
  }
  const place = (id: string, visiting = new Set<string>()): string | null => {
    const ticket = model.tickets[id];
    if (ticket === undefined) return null;
    if (ticket.phase !== null || ticket.placedBy === 'project-wide') return ticket.phase;
    if (visiting.has(id)) return null;
    visiting.add(id);
    const r = ticketNotes.get(id)!;
    for (const field of PARENTS) for (const parent of references(r.frontmatter[field])) {
      if (model.tickets[parent.id]?.kind !== 'feat') continue;
      const phase = place(parent.id, visiting);
      if (phase !== null) { ticket.phase = phase; ticket.placedBy = 'parent'; visiting.delete(id); return phase; }
    }
    visiting.delete(id);
    return null;
  };
  for (const id of ticketNotes.keys()) place(id);
  for (const ticket of Object.values(model.tickets)) {
    if (ticket.placedBy === 'none') {
      const votes = new Map<string, number>();
      for (const link of ticket.links) {
        const phase = model.tickets[link]?.phase;
        if (phase) votes.set(phase, (votes.get(phase) ?? 0) + 1);
      }
      const ranked = [...votes].sort((a, b) => b[1] - a[1]);
      if (ranked[0] && ranked[0][1] > (ranked[1]?.[1] ?? 0)) ticket.suggestion = { phase: ranked[0][0], by: 'links' };
      else {
        const created = day(ticketNotes.get(ticket.id)!.frontmatter['created']);
        const candidates = phaseNotes.filter((p) => {
          const start = day(p.frontmatter['created']); const end = day(p.frontmatter['updated']);
          return created !== null && start !== null && end !== null && start <= created && created <= end;
        });
        if (candidates.length === 1) ticket.suggestion = { phase: candidates[0]!.id, by: 'dates' };
      }
    }
    const home = ticket.phase === null ? model.core : phases.get(ticket.phase)!;
    home.tickets.push(ticket.id);
    home.counts[ticket.kind][ticket.state] += 1;
  }
  const ordered = (ids: string[], kinds: readonly Kind[]): void => { ids.sort((a, b) => {
    const x = model.tickets[a]!; const y = model.tickets[b]!;
    return kinds.indexOf(x.kind) - kinds.indexOf(y.kind) || STATE_ORDER.indexOf(x.state) - STATE_ORDER.indexOf(y.state) || a.localeCompare(b);
  }); };
  for (const phase of phases.values()) {
    ordered(phase.tickets, PHASE_KINDS);
    (phase.kind === 'open' ? model.phases : phase.kind === 'finished' ? model.shelf : model.backlog).push(phase);
  }
  ordered(model.core.tickets, CORE_KINDS);
  return model;
}
