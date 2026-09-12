/**
 * An Obsidian `.base` file, read as Deck descriptions.
 *
 * This is the parser half and nothing else (TASK-0046). Finding a vault's base
 * files, deciding which of them become views, and offering them in the
 * switcher is the Vault provider, and that stays in PHASE-0003. What this buys
 * now is the answer to whether the seeded language was MEASURED or guessed:
 * running it over all thirteen live files says how far Deck gets on a real
 * vault and names, construct by construct, where it stops.
 *
 * **A `.base` file is read and never written.** PHASE-0001 already puts writing
 * any file Obsidian owns out of scope, and this does not change it.
 *
 * **A construct Deck does not know is a finding, not a failure.** The TaskNotes
 * plugin's four view types and its forty-formula block are somebody else's
 * keys, exactly as Deck's own extension keys are somebody else's to Obsidian.
 * They come back NAMED, and the rest of the file still parses — which is what
 * says the namespace idea works.
 */
import {
  DESCRIPTION_VERSION,
  type Description,
  type FaceSection,
  type Refusal,
  type SortSpec,
} from './description.js';
import type { FilterNode } from './query.js';
import { parseYaml } from './yaml.js';

/** The Obsidian view types Deck can draw, and what each becomes. */
const KNOWN_VIEW_TYPES: Record<string, 'list' | 'spread'> = {
  table: 'list',
  list: 'list',
  cards: 'spread',
};

export interface BaseView {
  name: string;
  description: Description | null;
  refusals: Refusal[];
}

export interface BaseFile {
  views: BaseView[];
  /** Problems with the file as a whole, rather than with one of its views. */
  refusals: Refusal[];
}

/**
 * Read a base file's text into one description per view.
 *
 * `fileId` names the file, so the descriptions it yields have ids a person can
 * recognise and an address can carry.
 */
export function fromBaseFile(text: string, fileId: string): BaseFile {
  const refusals: Refusal[] = [];
  const parsed = parseYaml(text);
  for (const problem of parsed.problems) {
    refusals.push({
      construct: problem.construct,
      where: `line ${problem.line}`,
      reason: `${problem.construct} is not part of the YAML subset Deck reads: ${problem.text}`,
    });
  }
  if (typeof parsed.value !== 'object' || parsed.value === null || Array.isArray(parsed.value)) {
    refusals.push({ construct: 'the file', where: '', reason: 'a base file is a set of keys' });
    return { views: [], refusals };
  }
  const doc = parsed.value as Record<string, unknown>;
  const formulas = readFormulas(doc['formulas'], refusals);
  const fileFilter = doc['filters'] as FilterNode | undefined;
  const properties = doc['properties'];
  if (properties !== undefined && (typeof properties !== 'object' || properties === null)) {
    refusals.push({ construct: 'properties', where: 'properties', reason: 'properties is a set of keys' });
  }
  for (const key of Object.keys(doc)) {
    if (['formulas', 'filters', 'properties', 'views', 'summaries'].includes(key)) continue;
    refusals.push({
      construct: key,
      where: key,
      reason: `"${key}" is a top-level key Deck's reader does not know; it is kept unread`,
    });
  }

  const rawViews = doc['views'];
  if (!Array.isArray(rawViews)) {
    refusals.push({ construct: 'views', where: 'views', reason: 'a base file lists its views under "views"' });
    return { views: [], refusals };
  }

  const views: BaseView[] = [];
  for (let i = 0; i < rawViews.length; i += 1) {
    views.push(readView(rawViews[i], i, fileId, formulas, fileFilter, refusals));
  }
  return { views, refusals };
}

function readView(
  raw: unknown,
  index: number,
  fileId: string,
  formulas: Record<string, string>,
  fileFilter: FilterNode | undefined,
  fileRefusals: Refusal[],
): BaseView {
  const where = `views[${index}]`;
  const refusals: Refusal[] = [];
  if (typeof raw !== 'object' || raw === null) {
    fileRefusals.push({ construct: 'a view', where, reason: 'a view is a set of keys' });
    return { name: `view ${index}`, description: null, refusals };
  }
  const view = raw as Record<string, unknown>;
  const name = typeof view['name'] === 'string' && view['name'] !== '' ? view['name'] : `view ${index}`;
  const type = String(view['type'] ?? '');
  const surface = KNOWN_VIEW_TYPES[type];
  if (surface === undefined) {
    // The TaskNotes plugin adds `kanban`, `agenda`, `calendar` and
    // `miniCalendar`. Named rather than refused: the view still becomes a
    // description Deck can draw as a list, and what is lost is said out loud.
    refusals.push({
      construct: `the view type "${type}"`,
      where: `${where}.type`,
      reason: `Deck draws the view types ${Object.keys(KNOWN_VIEW_TYPES).join(', ')}; "${type}" is a plugin's own and this view is drawn as a list instead`,
    });
  }

  const filter = combine(fileFilter, view['filters'] as FilterNode | undefined);
  const sort = readSort(view['order'] === undefined ? view['sort'] : view['sort'], `${where}.sort`, refusals);
  const order = Array.isArray(view['order'])
    ? view['order'].filter((f): f is string => typeof f === 'string')
    : [];

  for (const key of Object.keys(view)) {
    if (
      [
        'type', 'name', 'filters', 'order', 'sort', 'image', 'imageFit', 'imageAspectRatio',
        'cardSize', 'rowHeight', 'columnSize', 'limit', 'groupBy', 'summaries',
      ].includes(key)
    ) {
      continue;
    }
    refusals.push({
      construct: key,
      where: `${where}.${key}`,
      reason: `"${key}" is a view key Deck's reader does not know; it is kept unread`,
    });
  }

  const image = typeof view['image'] === 'string' && view['image'] !== '' ? view['image'] : null;
  const face: FaceSection = {
    default: {
      title: order[0] ?? 'file.name',
      subtitle: order[1] ?? null,
      image,
      // The remaining columns the file listed, in the order it listed them.
      fields: order.slice(2),
      measure: 'none',
    },
    byType: {},
  };

  const description: Description = {
    version: DESCRIPTION_VERSION,
    id: `${fileId}:${slug(name)}`,
    label: name,
    source: {
      kind: 'query',
      filter,
      sort,
      groupBy: readGroupBy(view['groupBy']),
      formulas,
    },
    // A vault note is not tracked by project-os, so nothing is owed and
    // nothing is suppressed: everything the view holds stands in the middle.
    band: {
      rows: [{ when: {}, band: 'mid', note: 'A vault note carries no project-os obligation, so nothing is in front.' }],
      frontCapacity: 12,
      midCapacity: 40,
      outerCapacity: 40,
      deepCapacity: 3000,
      gathersOwed: false,
    },
    face,
    surfaces: surface === undefined ? ['list'] : [surface],
    verbs: 'registry',
    extensions: {},
  };
  return { name, description, refusals };
}

/**
 * What a view groups by, in either form Obsidian writes.
 *
 * A bare property name, or a map carrying the property and a direction — the
 * cockpit's own `NAVIGATION.base` uses the second, and reading only the first
 * dropped its grouping silently.
 */
function readGroupBy(raw: unknown): string | null {
  if (typeof raw === 'string' && raw !== '') return raw;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const property = (raw as Record<string, unknown>)['property'];
    if (typeof property === 'string' && property !== '') return property;
  }
  return null;
}

/** A file-wide filter and a view's own one both apply, which is an `and`. */
function combine(file: FilterNode | undefined, view: FilterNode | undefined): FilterNode {
  if (file === undefined || file === null) return view ?? null;
  if (view === undefined || view === null) return file;
  return { and: [file, view] };
}

function readSort(raw: unknown, where: string, refusals: Refusal[]): SortSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: SortSpec[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i] as Record<string, unknown> | undefined;
    const property = typeof entry?.['property'] === 'string' ? entry['property'] : '';
    if (property === '') {
      refusals.push({ construct: 'a sort', where: `${where}[${i}]`, reason: 'a sort names a property' });
      continue;
    }
    const direction = String(entry?.['direction'] ?? 'ASC').toLowerCase() === 'desc' ? 'desc' : 'asc';
    out.push({ property, direction });
  }
  return out;
}

function readFormulas(raw: unknown, refusals: Refusal[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw === undefined) return out;
  if (typeof raw !== 'object' || raw === null) {
    refusals.push({ construct: 'formulas', where: 'formulas', reason: 'formulas is a set of named expressions' });
    return out;
  }
  for (const [name, body] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof body === 'string') out[name] = body;
    else {
      refusals.push({
        construct: `the formula "${name}"`,
        where: `formulas.${name}`,
        reason: 'a formula is an expression written as text',
      });
    }
  }
  return out;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'view'
  );
}
