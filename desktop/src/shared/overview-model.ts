/** DES-0004's state table and five placement rules, over Deck's own records.
 * No filesystem, clock or ledger access lives here: callers supply the text
 * and provenance. Unknown statuses stay open rather than claiming completion.
 */
import { cockpitMarks } from './overview-status.js';
import { isTemplate, type NoteRecord } from './records.js';
import { linksIn, Resolver, LINK_BEARING_FIELDS } from './graph.js';
import { firstHeading, parseFrontmatter } from './yaml.js';
import { designFeature, evidenceFrom, leadOf, ownerWord } from './overview-notes.js';
import { CORE_KINDS, PHASE_KINDS, STATE_ORDER, emptyCounts, type Focus, type Kind, type State, type Phase, type OverviewModel, type Ticket } from './overview-types.js';

export interface OverviewOptions {
  workspace: string;
  head?: string;
  dirty?: boolean;
  generated?: string;
  /** Calendar date used by the cockpit's manual-verification clock. */
  today?: string;
  /** SNAPSHOT.yaml verification.staleness_days; the cockpit defaults to 90. */
  stalenessDays?: number;
  /** Full Markdown or body only; called once per phase or ticket. */
  readBody: (relPath: string) => string;
  /** Resolved result on every ledger platform, including not-run and withdrawals. */
  acceptanceResults?: Readonly<Record<string, readonly string[]>>;
  /** Without CI evidence, active/passing are status approximations, not a CI verdict. */
  ciGreen?: boolean;
  /** The workspace's SNAPSHOT focus, from `snapshotFocus` (TASK-0165). */
  focus?: Focus;
  /**
   * The pictures under the docs folder, each with its path there and its date (TASK-0181).
   * Given, the model lists those that belong to a ticket; absent, it lists none.
   */
  images?: ReadonlyArray<{ path: string; date: string }>;
}

/**
 * The `focus:` block of a SNAPSHOT.yaml: its phase, feature and task ids, each null
 * when absent or empty. A workspace with no snapshot has no focus.
 */
export function snapshotFocus(text: string): Focus | undefined {
  const block = /^focus:[ \t]*\r?\n((?:(?:[ \t].*)?\r?\n?)*)/m.exec(text)?.[1];
  if (block === undefined) return undefined;
  const pick = (key: string): string | null => new RegExp(`^[ \\t]+${key}:[ \\t]*["']?([A-Z]+-\\d+)`, 'm').exec(block)?.[1] ?? null;
  return { phase: pick('phase'), feature: pick('feature'), task: pick('task') };
}

/** A feature claims the tickets its lists name, its design among them (TASK-0179); a task claims the tests it names. */
const FEATURE_LISTS = ['tests', 'implements', 'design', 'designs', 'requirements', 'tasks'];

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
  const marksFor = cockpitMarks(notes, options.today ?? options.generated?.slice(0, 10) ?? '', options.stalenessDays);
  const ticketNotes = new Map<string, NoteRecord>();
  const bodies = new Map<string, string>();
  for (const r of notes) {
    const noteType = r.types.find((t) => Object.hasOwn(TYPES, t));
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
    const body = options.readBody(r.relPath);
    for (const link of linksIn(body)) {
      const note = resolve(link.target);
      if (note && note.id !== r.id) links.add(note.id);
    }
    const state = stateFor(r, kind, options);
    // What a selected ticket's card and pane show, and what the board, the ages and the weeks read (TASK-0181).
    const lead = leadOf(body);
    const owner = ownerWord(r.frontmatter['owner']);
    const updated = day(r.frontmatter['updated']);
    model.tickets[r.id] = { id: r.id, kind, state, ...marksFor(r, noteType === 'decision' ? 'adr' : noteType as Ticket['type']), status: r.status ?? '', title: r.title ?? r.id,
      phase: null, placedBy: kind === 'dec' || kind === 'risk' ? 'project-wide' : 'none', links: [...links].sort(),
      ...(lead !== '' ? { lead } : {}), ...(owner !== '' ? { owner } : {}), ...(updated !== null ? { updated } : {}) };
    ticketNotes.set(r.id, r);
    bodies.set(r.id, body);
  }
  // A ticket waiting on a note the overview does not draw (archived, or not a ticket
  // type) is sent to that note in the view, not to a ticket screen that cannot open.
  for (const t of Object.values(model.tickets)) {
    if (t.needs?.waitingOn !== undefined && model.tickets[t.needs.waitingOn] === undefined) t.needs.action = { parts: { note: t.needs.waitingOn } };
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
  assignFeatures(model, ticketNotes, references, options.focus?.feature ?? null);
  if (options.images !== undefined) model.pictures = picturesOf(model, ticketNotes, bodies, options.images);
  if (options.focus !== undefined) {
    const known = (id: string | null, kind: Kind): string | null => (id !== null && model.tickets[id]?.kind === kind ? id : null);
    const focus: Focus = { phase: options.focus.phase !== null && phases.has(options.focus.phase) ? options.focus.phase : null, feature: known(options.focus.feature, 'feat'), task: known(options.focus.task, 'task') };
    model.focus = focus;
    model.next = nextTicket(model, focus);
  }
  return model;
}

/** Numeric order of ids, so FEAT-0009 comes before FEAT-0010. */
const byNumber = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });

/**
 * Which feature's tower each ticket stands in (TASK-0165, the rule of DES-0005's
 * towers page): up its `parent:` to the first feature; else the lowest-numbered
 * feature whose lists name it; else the feature of a task whose `tests:` names it.
 */
function assignFeatures(model: OverviewModel, ticketNotes: Map<string, NoteRecord>, references: (value: unknown) => NoteRecord[], focusFeature: string | null): void {
  const parentOf = new Map<string, string>();
  for (const [id, r] of ticketNotes) {
    const p = references(r.frontmatter['parent'])[0];
    if (p !== undefined && p.id !== id) parentOf.set(id, p.id);
  }
  const namedByFeature = new Map<string, string>();
  const namedByTask = new Map<string, string>();
  // Every feature and every task that names a ticket, for a design (TASK-0179).
  const allByFeature = new Map<string, string[]>();
  const allByTask = new Map<string, string[]>();
  for (const id of [...ticketNotes.keys()].sort(byNumber)) {
    const kind = model.tickets[id]!.kind;
    if (kind !== 'feat' && kind !== 'task') continue;
    const into = kind === 'feat' ? namedByFeature : namedByTask;
    const all = kind === 'feat' ? allByFeature : allByTask;
    for (const key of kind === 'feat' ? FEATURE_LISTS : ['tests']) {
      for (const named of references(ticketNotes.get(id)!.frontmatter[key])) {
        if (named.id === id) continue;
        if (!into.has(named.id)) into.set(named.id, id);
        all.set(named.id, [...(all.get(named.id) ?? []), id]);
      }
    }
  }
  const upToFeature = (id: string): string | undefined => {
    let p = parentOf.get(id);
    for (let i = 0; i < 6 && p !== undefined && model.tickets[p]?.kind !== 'feat'; i += 1) p = parentOf.get(p);
    return p !== undefined && model.tickets[p]?.kind === 'feat' ? p : undefined;
  };
  const isFeature = (id: string): boolean => model.tickets[id]?.kind === 'feat';
  for (const ticket of Object.values(model.tickets)) {
    if (ticket.kind === 'feat') continue;
    // A design stands with a feature that names it, the feature in focus if it is one of them,
    // else the lowest-numbered; then the features of the tasks that name it; then the features
    // its own `implements:` names. So the design of the work in hand stands nearest it (TASK-0179).
    if (ticket.type === 'design' && !parentOf.has(ticket.id)) {
      const viaTasks = (allByTask.get(ticket.id) ?? []).map((t) => upToFeature(t) ?? namedByFeature.get(t)).filter((f): f is string => f !== undefined);
      const implementsList = references(ticketNotes.get(ticket.id)!.frontmatter['implements']).map((r) => r.id);
      const feature = designFeature({ namedBy: allByFeature.get(ticket.id) ?? [], viaTasks, implementsList, focus: focusFeature, isFeature });
      if (feature !== null) {
        ticket.feature = feature;
        continue;
      }
    }
    const task = namedByTask.get(ticket.id);
    const feature = upToFeature(ticket.id) ?? namedByFeature.get(ticket.id) ?? (task !== undefined ? upToFeature(task) ?? namedByFeature.get(task) : undefined);
    if (feature !== undefined) ticket.feature = feature;
  }
}

/** The focus task while it is open; else the focus feature's first task at doing, then at backlog or planned. */
function nextTicket(model: OverviewModel, focus: Focus): string | null {
  const open = (id: string | null): boolean => id !== null && model.tickets[id] !== undefined && !['closed', 'dropped'].includes(model.tickets[id]!.state);
  if (open(focus.task)) return focus.task;
  if (focus.feature === null) return null;
  const tasks = Object.values(model.tickets).filter((t) => t.kind === 'task' && t.feature === focus.feature).sort((a, b) => byNumber(a.id, b.id));
  return tasks.find((t) => t.status === 'doing')?.id ?? tasks.find((t) => t.status === 'backlog' || t.status === 'planned')?.id ?? null;
}

/**
 * The pictures that belong to a ticket, newest first (TASK-0181): `evidenceFrom` over the
 * notes and the pictures beside them, as DES-0005's towers page reads them. Paths are
 * under the docs folder; `evidenceFrom` reads them as `docs/...`, as a repository holds them.
 */
function picturesOf(model: OverviewModel, ticketNotes: Map<string, NoteRecord>, bodies: Map<string, string>, images: ReadonlyArray<{ path: string; date: string }>): NonNullable<OverviewModel['pictures']> {
  const DOCS = 'docs/';
  const notes = [...ticketNotes].map(([id, r]) => ({ path: DOCS + r.relPath, text: noteText(r, bodies.get(id) ?? '') }));
  const found = evidenceFrom(images.map((i) => ({ path: DOCS + i.path, date: i.date })), notes, new Set(Object.keys(model.tickets)), { perTicket: Infinity, limit: Infinity });
  return found.map((e) => ({ ticket: e.id, path: e.path.slice(DOCS.length), date: e.date }));
}

/** A note's text with its frontmatter, as `evidenceFrom` reads the `id:` and `evidence:` fields from it. */
function noteText(record: NoteRecord, body: string): string {
  if (/^---\r?\n/.test(body)) return body;
  const evidence = record.frontmatter['evidence'];
  const values = (Array.isArray(evidence) ? evidence : evidence === undefined ? [] : [evidence]).map((v) => `  - ${JSON.stringify(String(v))}`);
  return `---\nid: ${record.id}\n${values.length > 0 ? `evidence:\n${values.join('\n')}\n` : ''}---\n${body}`;
}
