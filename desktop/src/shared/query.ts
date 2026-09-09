/**
 * Running a query-sourced view over Deck's index.
 *
 * A description whose source is a `query` selects notes with a filter tree,
 * orders them, and groups them — and comes out as the SAME group model the
 * navigator already draws for a mode-sourced view (TASK-0043, TASK-0045).
 * There is one drawing path and it takes groups; what changed is that a group
 * can now be produced by `groupBy` as well as by the sidecar.
 *
 * **Whether a note needs a person stays the sidecar's judgement.** A query
 * decides which notes a view HOLDS; whether one is owed comes from the
 * cockpit's obligations registry and arrives on the navigation payload. So a
 * query-sourced view reads owed and suppressed for the notes it selected and
 * puts what is owed at the top exactly as a mode-sourced view does. Where the
 * sidecar has no opinion about a note — a vault note it does not track — the
 * view has no owed group and SAYS so rather than drawing an empty heading.
 */
import type { Description, SortSpec } from './description.js';
import {
  type EvalContext,
  type Node,
  type Unsupported,
  ExpressionError,
  UNSUPPORTED,
  evaluate,
  matches,
  parseExpression,
} from './expression.js';
import { type NoteRecord } from './records.js';
import type { CardGroup, CardModel } from './types.js';

/** A filter is an expression, or a tree of them. */
export type FilterNode =
  | string
  | { and: FilterNode[] }
  | { or: FilterNode[] }
  | { not: FilterNode[] }
  | boolean
  | null;

export interface QueryOptions {
  /** What the sidecar says about each note, by note id. */
  marks?: Map<string, { owed: boolean; owedVerb: string | null; suppressed: boolean }>;
  /** Injectable, so a suite is not a clock. */
  today?: Date;
}

export interface QueryResult {
  groups: CardGroup[];
  unsupported: Unsupported[];
  /**
   * True when the sidecar has no opinion about any of the selected notes.
   *
   * The navigator says so rather than drawing an empty "Needs you" heading: a
   * view of a vault's chapters owes nothing because project-os does not track
   * chapters, which is a different thing from a view that owes nothing today.
   */
  untracked: boolean;
}

/** Run a description's query over an index. Never throws. */
export function runQuery(description: Description, records: NoteRecord[], options: QueryOptions = {}): QueryResult {
  const unsupported: Unsupported[] = [];
  if (description.source.kind !== 'query') {
    return { groups: [], unsupported, untracked: true };
  }
  const source = description.source;
  const formulas = parseFormulas(source.formulas, unsupported);
  const filter = compileFilter(source.filter as FilterNode, 'source.filter', unsupported);

  const selected: NoteRecord[] = [];
  for (const record of records) {
    const context = contextFor(record, formulas, unsupported, options, 'source.filter');
    if (filter(context)) selected.push(record);
  }

  sortRecords(selected, source.sort, formulas, unsupported, options);

  const marks = options.marks ?? new Map();
  const untracked = marks.size === 0 || !selected.some((r) => marks.has(r.id));
  // The card and the record it came from travel together: a card is what the
  // navigator draws, and the record is what `groupBy` evaluates over.
  const pairs = selected.map((record) => ({ record, card: toCard(record, marks) }));

  const groups: CardGroup[] = [];
  // What is owed goes to the top, read from the sidecar rather than computed.
  const owed = pairs.filter((p) => p.card.owed);
  if (owed.length > 0) {
    groups.push({
      key: 'needs-you',
      label: 'Needs you',
      needsHuman: true,
      suppressed: false,
      cards: owed.map((p) => p.card),
    });
  }
  const rest = pairs.filter((p) => !p.card.owed && marks.get(p.card.noteId)?.suppressed !== true);
  const quiet = pairs.filter((p) => !p.card.owed && marks.get(p.card.noteId)?.suppressed === true);
  groups.push(...groupRest(rest, source.groupBy, description.label, formulas, unsupported, options));
  if (quiet.length > 0) {
    groups.push({
      key: 'quiet',
      label: 'Quiet',
      needsHuman: false,
      suppressed: true,
      cards: quiet.map((p) => p.card),
    });
  }
  return { groups, unsupported, untracked };
}

interface Pair {
  record: NoteRecord;
  card: CardModel;
}

function groupRest(
  pairs: Pair[],
  groupBy: string | null,
  label: string,
  formulas: Record<string, Node>,
  unsupported: Unsupported[],
  options: QueryOptions,
): CardGroup[] {
  if (groupBy === null) {
    if (pairs.length === 0) return [];
    return [{ key: 'all', label, needsHuman: false, suppressed: false, cards: pairs.map((p) => p.card) }];
  }
  const expression = compileOne(groupBy, 'source.groupBy', unsupported);
  const buckets = new Map<string, CardModel[]>();
  for (const pair of pairs) {
    const value =
      expression === null
        ? null
        : evaluate(expression, contextFor(pair.record, formulas, unsupported, options, 'source.groupBy'));
    const key = value === UNSUPPORTED || value === null || value === '' ? '(none)' : String(labelOf(value));
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [pair.card]);
    else bucket.push(pair.card);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, group]) => ({ key: `by:${key}`, label: key, needsHuman: false, suppressed: false, cards: group }));
}

function labelOf(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => labelOf(v)).join(', ');
  if (value !== null && typeof value === 'object') {
    const link = (value as Record<string, unknown>)['link'];
    if (typeof link === 'string') return link;
  }
  return String(value);
}

function sortRecords(
  records: NoteRecord[],
  sort: SortSpec[],
  formulas: Record<string, Node>,
  unsupported: Unsupported[],
  options: QueryOptions,
): void {
  if (sort.length === 0) return;
  const compiled = sort.map((spec) => ({
    spec,
    node: compileOne(spec.property, `source.sort.${spec.property}`, unsupported),
  }));
  records.sort((a, b) => {
    for (const { spec, node } of compiled) {
      if (node === null) continue;
      const left = evaluate(node, contextFor(a, formulas, unsupported, options, `source.sort.${spec.property}`));
      const right = evaluate(node, contextFor(b, formulas, unsupported, options, `source.sort.${spec.property}`));
      // Nothing sorts LAST, whichever way round the sort was asked for: a
      // note with no due date is not the most urgent one, and reversing the
      // order should not make it so. So presence is decided outside the flip.
      const leftMissing = missing(left);
      const rightMissing = missing(right);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing) continue;
      const order = compareValues(left, right);
      if (order !== 0) return spec.direction === 'asc' ? order : -order;
    }
    return 0;
  });
}

export function missing(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === UNSUPPORTED;
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  const left = String(labelOf(a)).toLowerCase();
  const right = String(labelOf(b)).toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseFormulas(source: Record<string, string>, unsupported: Unsupported[]): Record<string, Node> {
  const out: Record<string, Node> = {};
  for (const [name, body] of Object.entries(source)) {
    const node = compileOne(body, `source.formulas.${name}`, unsupported);
    if (node !== null) out[name] = node;
  }
  return out;
}

function compileOne(source: string, where: string, unsupported: Unsupported[]): Node | null {
  try {
    return parseExpression(source);
  } catch (err) {
    unsupported.push({
      construct: source,
      where,
      reason: err instanceof ExpressionError ? `${err.message} (at character ${err.at})` : String(err),
    });
    return null;
  }
}

type Predicate = (context: EvalContext) => boolean;

/**
 * Turn a filter tree into one predicate.
 *
 * `and`, `or` and `not` nest freely, including the `or`-of-`and` the vault's
 * sidebar base uses. An expression that will not parse is reported and treated
 * as selecting nothing — reported is the operative word: the alternative is a
 * view that silently holds every note or none.
 */
export function compileFilter(filter: FilterNode, where: string, unsupported: Unsupported[]): Predicate {
  if (filter === null || filter === undefined) return () => true;
  if (filter === true) return () => true;
  if (filter === false) return () => false;
  if (typeof filter === 'string') {
    const node = compileOne(filter, where, unsupported);
    if (node === null) return () => false;
    return (context) => matches(node, { ...context, where });
  }
  if (typeof filter !== 'object') {
    unsupported.push({ construct: String(filter), where, reason: 'a filter is an expression or a tree of them' });
    return () => false;
  }
  const entries = Object.entries(filter as Record<string, unknown>);
  if (entries.length !== 1) {
    unsupported.push({
      construct: entries.map(([k]) => k).join(', '),
      where,
      reason: 'a filter node is one of and, or, not',
    });
    return () => false;
  }
  const [key, value] = entries[0] as [string, unknown];
  const children = Array.isArray(value) ? value : [value];
  const compiled = children.map((child, i) => compileFilter(child as FilterNode, `${where}.${key}[${i}]`, unsupported));
  if (key === 'and') return (context) => compiled.every((p) => p(context));
  if (key === 'or') return (context) => compiled.some((p) => p(context));
  // Obsidian's `not` excludes a note matching ANY of its children, which is
  // how the cockpit's own base files use it to leave templates out.
  if (key === 'not') return (context) => !compiled.some((p) => p(context));
  unsupported.push({ construct: key, where, reason: `"${key}" is not a filter; a filter node is and, or, not` });
  return () => false;
}

function contextFor(
  record: NoteRecord,
  formulas: Record<string, Node>,
  unsupported: Unsupported[],
  options: QueryOptions,
  where: string,
): EvalContext {
  const context: EvalContext = { record, formulas, this: null, unsupported, where };
  if (options.today !== undefined) context.today = options.today;
  return context;
}

/**
 * A record as a card the navigator can draw.
 *
 * The card carries its record, so a face can read a property by name: a
 * vault's character shows its role and its archetype without anything in the
 * renderer knowing what a character is.
 */
export function toCard(
  record: NoteRecord,
  marks: Map<string, { owed: boolean; owedVerb: string | null; suppressed: boolean }>,
): CardModel {
  const mark = marks.get(record.id);
  return {
    noteId: record.id,
    title: record.title ?? record.fileName,
    noteType: record.types[0] ?? '',
    status: record.status ?? '',
    rel: record.relPath,
    subtitle: typeof record.frontmatter['subtitle'] === 'string' ? record.frontmatter['subtitle'] : null,
    owed: mark?.owed ?? false,
    owedVerb: mark?.owedVerb ?? null,
    groupKey: '',
    severity: typeof record.frontmatter['severity'] === 'string' ? record.frontmatter['severity'] : null,
    lastVerified: typeof record.frontmatter['last_verified'] === 'string' ? record.frontmatter['last_verified'] : null,
    stale: false,
    progress: null,
    children: [],
    frontmatter: record.frontmatter,
  };
}
