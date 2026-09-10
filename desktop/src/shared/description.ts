/**
 * A view, written down.
 *
 * A Deck view used to be three fields — an id, a label, and which sidecar
 * navigation mode fed it — with every other decision about it in code: which
 * notes it selects, how they group, what a card shows, which of Glass's three
 * bands a note stands in, and which surface may draw it at all. This module is
 * the shape those decisions take instead ([[ADR-0004]], FEAT-0012).
 *
 * **Five sections, and each one has an owner.**
 * - `source` decides which notes the view holds: a sidecar navigation `mode`
 *   whose groups are the arrangement, or a `query` over Deck's own index.
 * - `band` says which of front, mid and deep a note stands in.
 * - `face` says what a card shows, by property name rather than by code.
 * - `surfaces` says which surfaces may draw the view.
 * - `verbs` is the single word `registry`. A restated verb list is what the
 *   cockpit's REQ-0026 forbids, and the parser refuses any other value.
 *
 * **The version and the namespace are why this is Deck's language and not
 * Obsidian's.** Edwin, 2026-09-08: the Bases subset "is a subset which we know
 * cannot represent everything ... we will need to be able to extend it probably
 * significantly". So every description declares a version the parser knows how
 * to read, and any key outside the seeded language must sit under Deck's own
 * prefix, which no base file uses. A description written for a later Deck is
 * then recognisably a description rather than a syntax error. Both are cheap
 * now and impossible to retrofit.
 *
 * **Refusal is a result, not a failure.** The parser returns the description it
 * could build AND a list of what it could not read, each entry naming the
 * construct and where it was. It never returns nothing, because an empty view
 * and a broken view look identical on screen and only one of them is a bug.
 */
import type { CardGroup, CardModel } from './types.js';
import { surfaceKinds } from './vocabularies.js';

/** The version of the language this build writes. */
export const DESCRIPTION_VERSION = '1';

/** The versions this build can read. A description outside it is refused by name. */
export const READABLE_VERSIONS: readonly string[] = ['1'];

/**
 * Deck's own namespace for keys the seeded language does not have.
 *
 * `deck:` rather than a bare word, because no `.base` file uses a colon in a
 * top-level key, so a Deck extension can never collide with something Obsidian
 * adds later. A bare key nobody recognises is REFUSED: it is far more likely to
 * be a typo than an extension, and a silently ignored key is how a view comes
 * out subtly wrong with nothing to read.
 */
export const EXTENSION_PREFIX = 'deck:';

/** One thing the parser could not read, named and placed. */
export interface Refusal {
  /** The construct: "a source kind", "an unknown key", "a view type". */
  construct: string;
  /** Where it was, as a path into the document: `views[2].filters.and[1]`. */
  where: string;
  /** What to do about it, in a sentence. */
  reason: string;
}

export type Band = 'front' | 'mid' | 'deep';

/**
 * What the payload says about a note, and what a person did to it, which is
 * all the band rule gets to see.
 *
 * `held` and `joinedToDesk` were reserved by TASK-0029 and are filled by
 * FEAT-0010's desk: a held note is on the desk, and a note joined to one is
 * in its neighbourhood. `pulled` and `pushed` were reserved on 2026-09-10 and
 * are filled by FEAT-0014's hands. They are the first inputs that come from a
 * person rather than from the record.
 */
export interface BandInputs {
  owed: boolean;
  suppressed: boolean;
  /** In one of the view's own groups, rather than in Needs-you or Quiet. */
  inSubject: boolean;
  held: boolean;
  joinedToDesk: boolean;
  /** A hand brought this note into the front band (TASK-0053). */
  pulled: boolean;
  /** A hand sent this note behind the person (TASK-0053). */
  pushed: boolean;
}

/** The inputs a row may match on, in the order a person reads them. */
export const BAND_INPUT_NAMES: readonly (keyof BandInputs)[] = [
  'owed',
  'suppressed',
  'inSubject',
  'held',
  'joinedToDesk',
  'pulled',
  'pushed',
];

export interface BandRow {
  /** The inputs this row matches. An absent key matches either value. */
  when: Partial<BandInputs>;
  band: Band;
  /** Why, for a person reading the description rather than the code. */
  note?: string;
}

export interface BandTable {
  rows: BandRow[];
  /** About twelve cards stand in front, and about forty in the middle. */
  frontCapacity: number;
  midCapacity: number;
  /**
   * Whether this view gathers what is owed itself, so the sidecar sends it no
   * Needs-you group.
   *
   * A ROW rather than a fallback: `issues`, `tests` and `publication` are the
   * whole obligation list, and a table that simply found no Needs-you group
   * and shrugged could not tell that apart from a view whose obligations are
   * missing.
   */
  gathersOwed: boolean;
}

/** What a card shows, as property names. */
export interface FaceSpec {
  /** The property holding the line a person reads first. */
  title: string;
  /** The line under it, when the note has one. */
  subtitle: string | null;
  /** The property naming a picture: a portrait, a cover, a scene. */
  image: string | null;
  /** The properties shown beside the title, in this order. */
  fields: string[];
  /**
   * A face Deck draws specially: a progress bar, a severity, a last walk.
   *
   * Named rather than branched on the note's TYPE, which is what `faces.ts`
   * used to do — so a vault's character with a portrait, a page with a number
   * and a chapter that orders its pages all arrived as plain cards.
   */
  measure: 'progress' | 'severity' | 'verified' | 'none';
}

/**
 * The face section of a description: one face per note type, and a default.
 *
 * Per type, because a project-os view holds several — the Features view draws
 * phases, features and tasks in one list — and because a vault type gets a
 * face by being written here rather than by somebody adding a branch. The
 * default is what an unknown type wears, which is every type on the day a new
 * workspace is opened.
 */
export interface FaceSection {
  default: FaceSpec;
  byType: Record<string, FaceSpec>;
}

export type DescriptionSource =
  | { kind: 'mode'; mode: string }
  | { kind: 'query'; filter: unknown; sort: SortSpec[]; groupBy: string | null; formulas: Record<string, string> };

export interface SortSpec {
  property: string;
  direction: 'asc' | 'desc';
}

export interface Description {
  version: string;
  id: string;
  label: string;
  source: DescriptionSource;
  band: BandTable;
  face: FaceSection;
  surfaces: string[];
  verbs: 'registry';
  /** Keys under Deck's own prefix, kept exactly as they were written. */
  extensions: Record<string, unknown>;
}

export interface ParsedDescription {
  description: Description | null;
  refusals: Refusal[];
}

const REQUIRED_SECTIONS = ['source', 'band', 'face', 'surfaces', 'verbs'] as const;
// `extensions` is here so that a description READ back out of the parser
// parses to itself: the parser gathers Deck's own keys into that object, and a
// round trip that then refused the object would make the shape unstable.
const SEEDED_KEYS = new Set<string>(['version', 'id', 'label', 'extensions', ...REQUIRED_SECTIONS]);

/**
 * Read a description, and say by name what could not be read.
 *
 * Every refusal is collected rather than thrown on the first, because a person
 * fixing a description wants the list, not one item of it at a time.
 */
export function parseDescription(raw: unknown): ParsedDescription {
  const refusals: Refusal[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    refusals.push({
      construct: 'a description',
      where: '',
      reason: 'a description is a set of keys; this is not',
    });
    return { description: null, refusals };
  }
  const doc = raw as Record<string, unknown>;

  const version = typeof doc['version'] === 'string' ? doc['version'] : String(doc['version'] ?? '');
  if (version === '') {
    refusals.push({
      construct: 'the version',
      where: 'version',
      reason: `every description declares a version; this build reads ${READABLE_VERSIONS.join(', ')}`,
    });
  } else if (!READABLE_VERSIONS.includes(version)) {
    refusals.push({
      construct: 'the version',
      where: 'version',
      reason: `this build reads version ${READABLE_VERSIONS.join(', ')}, and this description says ${version}`,
    });
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!(section in doc)) {
      refusals.push({
        construct: `the ${section} section`,
        where: section,
        // Named rather than defaulted: a description missing its `band` that
        // quietly got somebody else's band is the silent fallback this whole
        // feature is written against.
        reason: `a description has five sections — ${REQUIRED_SECTIONS.join(', ')} — and this one has no ${section}`,
      });
    }
  }

  const extensions: Record<string, unknown> = {};
  const gathered = doc['extensions'];
  if (typeof gathered === 'object' && gathered !== null && !Array.isArray(gathered)) {
    for (const [key, value] of Object.entries(gathered as Record<string, unknown>)) {
      if (key.startsWith(EXTENSION_PREFIX)) extensions[key] = value;
      else {
        refusals.push({
          construct: 'an unknown key',
          where: `extensions.${key}`,
          reason: `"${key}" is not in Deck's namespace; a key of Deck's own is written "${EXTENSION_PREFIX}${key}"`,
        });
      }
    }
  } else if (gathered !== undefined) {
    refusals.push({ construct: 'the extensions', where: 'extensions', reason: 'extensions is a set of keys' });
  }
  for (const key of Object.keys(doc)) {
    if (SEEDED_KEYS.has(key)) continue;
    if (key.startsWith(EXTENSION_PREFIX)) {
      extensions[key] = doc[key];
      continue;
    }
    refusals.push({
      construct: 'an unknown key',
      where: key,
      reason: `"${key}" is not part of the language; a key of Deck's own is written "${EXTENSION_PREFIX}${key}"`,
    });
  }

  const source = readSource(doc['source'], refusals);
  const band = readBand(doc['band'], refusals);
  const face = readFace(doc['face'], refusals);
  const surfaces = readSurfaces(doc['surfaces'], refusals);
  const verbs = readVerbs(doc['verbs'], refusals);
  const id = typeof doc['id'] === 'string' && doc['id'] !== '' ? doc['id'] : '';
  const label = typeof doc['label'] === 'string' && doc['label'] !== '' ? doc['label'] : id;
  if (id === '') {
    refusals.push({ construct: 'the id', where: 'id', reason: 'a description needs an id to be addressed by' });
  }

  if (source === null || band === null || face === null || verbs === null || id === '') {
    return { description: null, refusals };
  }
  return {
    description: { version, id, label, source, band, face, surfaces, verbs, extensions },
    refusals,
  };
}

function readSource(raw: unknown, refusals: Refusal[]): DescriptionSource | null {
  if (typeof raw !== 'object' || raw === null) {
    if (raw !== undefined) {
      refusals.push({ construct: 'the source section', where: 'source', reason: 'a source is a set of keys' });
    }
    return null;
  }
  const source = raw as Record<string, unknown>;
  const kind = source['kind'];
  if (kind === 'mode') {
    const mode = source['mode'];
    if (typeof mode !== 'string' || mode === '') {
      refusals.push({
        construct: 'a mode source',
        where: 'source.mode',
        reason: 'a mode source names the sidecar navigation mode whose groups are the arrangement',
      });
      return null;
    }
    return { kind: 'mode', mode };
  }
  if (kind === 'query') {
    const sort: SortSpec[] = [];
    const rawSort = source['sort'];
    if (Array.isArray(rawSort)) {
      for (let i = 0; i < rawSort.length; i += 1) {
        const entry = rawSort[i] as Record<string, unknown> | undefined;
        const property = typeof entry?.['property'] === 'string' ? entry['property'] : '';
        if (property === '') {
          refusals.push({ construct: 'a sort', where: `source.sort[${i}]`, reason: 'a sort names a property' });
          continue;
        }
        const direction = String(entry?.['direction'] ?? 'asc').toLowerCase();
        if (direction !== 'asc' && direction !== 'desc') {
          refusals.push({
            construct: 'a sort direction',
            where: `source.sort[${i}].direction`,
            reason: `a direction is asc or desc, and this says ${direction}`,
          });
          continue;
        }
        sort.push({ property, direction });
      }
    } else if (rawSort !== undefined && rawSort !== null) {
      refusals.push({ construct: 'the sort', where: 'source.sort', reason: 'a sort is a list' });
    }
    const groupBy = typeof source['groupBy'] === 'string' && source['groupBy'] !== '' ? source['groupBy'] : null;
    const formulas: Record<string, string> = {};
    const rawFormulas = source['formulas'];
    if (typeof rawFormulas === 'object' && rawFormulas !== null) {
      for (const [name, body] of Object.entries(rawFormulas as Record<string, unknown>)) {
        if (typeof body === 'string') formulas[name] = body;
        else {
          refusals.push({
            construct: 'a formula',
            where: `source.formulas.${name}`,
            reason: 'a formula is an expression written as text',
          });
        }
      }
    }
    return { kind: 'query', filter: source['filter'] ?? null, sort, groupBy, formulas };
  }
  refusals.push({
    construct: 'a source kind',
    where: 'source.kind',
    reason: `a source is "mode" or "query", and this says ${JSON.stringify(kind)}`,
  });
  return null;
}

function readBand(raw: unknown, refusals: Refusal[]): BandTable | null {
  if (typeof raw !== 'object' || raw === null) {
    if (raw !== undefined) {
      refusals.push({ construct: 'the band section', where: 'band', reason: 'a band section is a set of keys' });
    }
    return null;
  }
  const band = raw as Record<string, unknown>;
  const rows: BandRow[] = [];
  const rawRows = band['rows'];
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    refusals.push({
      construct: 'the band rows',
      where: 'band.rows',
      reason: 'the band section is a table of rows, and a view with none has no rule at all',
    });
    return null;
  }
  for (let i = 0; i < rawRows.length; i += 1) {
    const entry = rawRows[i] as Record<string, unknown> | undefined;
    const where = `band.rows[${i}]`;
    const value = entry?.['band'];
    if (value !== 'front' && value !== 'mid' && value !== 'deep') {
      refusals.push({
        construct: 'a band',
        where: `${where}.band`,
        reason: `a band is front, mid or deep, and this says ${JSON.stringify(value)}`,
      });
      continue;
    }
    const when: Partial<BandInputs> = {};
    const rawWhen = entry?.['when'];
    if (typeof rawWhen === 'object' && rawWhen !== null) {
      for (const [key, on] of Object.entries(rawWhen as Record<string, unknown>)) {
        if (!isBandInput(key)) {
          refusals.push({
            construct: 'a band input',
            where: `${where}.when.${key}`,
            reason: `a row matches on ${BAND_INPUT_NAMES.join(', ')}, and this says ${key}`,
          });
          continue;
        }
        when[key] = on === true;
      }
    }
    const row: BandRow = { when, band: value };
    if (typeof entry?.['note'] === 'string') row.note = entry['note'];
    rows.push(row);
  }
  if (rows.length === 0) return null;
  return {
    rows,
    frontCapacity: positive(band['frontCapacity'], 12),
    midCapacity: positive(band['midCapacity'], 40),
    gathersOwed: band['gathersOwed'] === true,
  };
}

function isBandInput(key: string): key is keyof BandInputs {
  return (BAND_INPUT_NAMES as readonly string[]).includes(key);
}

function positive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readFace(raw: unknown, refusals: Refusal[]): FaceSection | null {
  if (typeof raw !== 'object' || raw === null) {
    if (raw !== undefined) {
      refusals.push({ construct: 'the face section', where: 'face', reason: 'a face is a set of keys' });
    }
    return null;
  }
  const section = raw as Record<string, unknown>;
  const fallback = readFaceSpec(section['default'], 'face.default', refusals);
  if (fallback === null) return null;
  const byType: Record<string, FaceSpec> = {};
  const rawByType = section['byType'];
  if (typeof rawByType === 'object' && rawByType !== null) {
    for (const [type, spec] of Object.entries(rawByType as Record<string, unknown>)) {
      const read = readFaceSpec(spec, `face.byType.${type}`, refusals);
      if (read !== null) byType[type] = read;
    }
  } else if (rawByType !== undefined) {
    refusals.push({
      construct: 'the face byType',
      where: 'face.byType',
      reason: 'byType names a face per note type, as a set of keys',
    });
  }
  return { default: fallback, byType };
}

function readFaceSpec(raw: unknown, where: string, refusals: Refusal[]): FaceSpec | null {
  if (typeof raw !== 'object' || raw === null) {
    refusals.push({ construct: 'a face', where, reason: 'a face is a set of keys' });
    return null;
  }
  const face = raw as Record<string, unknown>;
  const title = typeof face['title'] === 'string' && face['title'] !== '' ? face['title'] : '';
  if (title === '') {
    refusals.push({
      construct: 'a face title',
      where: `${where}.title`,
      reason: 'a face names the property holding the line a person reads first',
    });
    return null;
  }
  const measureRaw = face['measure'] ?? 'none';
  if (measureRaw !== 'progress' && measureRaw !== 'severity' && measureRaw !== 'verified' && measureRaw !== 'none') {
    refusals.push({
      construct: 'a face measure',
      where: `${where}.measure`,
      reason: `a measure is progress, severity, verified or none, and this says ${JSON.stringify(measureRaw)}`,
    });
    return null;
  }
  return {
    title,
    subtitle: typeof face['subtitle'] === 'string' && face['subtitle'] !== '' ? face['subtitle'] : null,
    image: typeof face['image'] === 'string' && face['image'] !== '' ? face['image'] : null,
    fields: Array.isArray(face['fields']) ? face['fields'].filter((f): f is string => typeof f === 'string') : [],
    measure: measureRaw,
  };
}

function readSurfaces(raw: unknown, refusals: Refusal[]): string[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      refusals.push({ construct: 'the surfaces section', where: 'surfaces', reason: 'surfaces is a list of names' });
    }
    return [];
  }
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const value = raw[i];
    // The SAME vocabulary the address grammar reads, registered once. A second
    // list of surface names is the drift TASK-0052 removed for panel kinds.
    if (!surfaceKinds.has(value)) {
      refusals.push({
        construct: 'a surface',
        where: `surfaces[${i}]`,
        reason: surfaceKinds.refusal(String(value)),
      });
      continue;
    }
    out.push(value);
  }
  return out;
}

function readVerbs(raw: unknown, refusals: Refusal[]): 'registry' | null {
  if (raw === 'registry') return 'registry';
  if (raw === undefined) return null;
  refusals.push({
    construct: 'the verbs section',
    where: 'verbs',
    // The reason names the rule rather than restating the refusal, because a
    // person who wrote a verb list here needs to know it is not a Deck
    // preference: the cockpit serves the legal verbs per note, and a client
    // that keeps its own copy is what project-os-cockpit#REQ-0026 forbids.
    reason:
      'verbs is the single word "registry": the sidecar says which verbs a note allows, and a renderer that ' +
      'restates that table is what project-os-cockpit#REQ-0026 forbids',
  });
  return null;
}

// ---- the band function ----

export interface BandedCard<T> {
  card: T;
  band: Band;
}

export interface Banding<T> {
  front: T[];
  mid: T[];
  deep: T[];
  /** Owed notes past the front band's capacity. Counted, never demoted. */
  frontOverflow: number;
  /** Subject notes past the mid band's capacity. Counted, never sent to deep. */
  midOverflow: number;
}

/**
 * What the payload says about one card, as the band table's inputs.
 *
 * One place, so the navigator, Spread and Glass ask the same question. The
 * subtlety it holds is which notes count as owed: a view that gathers its own
 * obligations receives no Needs-you group and marks no item `owed` — the whole
 * GROUP is marked `needs_human` instead. Reading the item alone left Your
 * Trainer's Issues view with nothing in front while forty issues waited for
 * triage.
 */
export function bandInputsFor(group: CardGroup, card: CardModel, hand: HandInputs = NO_HAND): BandInputs {
  const owed = card.owed || group.needsHuman;
  return {
    owed,
    suppressed: group.suppressed,
    inSubject: !owed && !group.suppressed,
    held: hand.held.has(card.noteId),
    joinedToDesk: hand.joined.has(card.noteId),
    pulled: hand.pulled.has(card.noteId),
    pushed: hand.pushed.has(card.noteId),
  };
}

/** What the desk and the hands say about the field, by note id. */
export interface HandInputs {
  held: ReadonlySet<string>;
  joined: ReadonlySet<string>;
  pulled: ReadonlySet<string>;
  pushed: ReadonlySet<string>;
}

/** Nothing held, nothing joined, nothing moved by hand: the navigator's case. */
export const NO_HAND: HandInputs = Object.freeze({
  held: new Set<string>(),
  joined: new Set<string>(),
  pulled: new Set<string>(),
  pushed: new Set<string>(),
});

/**
 * Which band one note stands in, by the description's own table.
 *
 * The first row whose `when` matches wins, so a description reads top to
 * bottom like the rule it is. A note that matches no row is `mid`: it is in
 * the view and it is neither owed nor finished, which is what the middle
 * means.
 */
export function bandOf(table: BandTable, inputs: BandInputs): Band {
  for (const row of table.rows) {
    let matches = true;
    for (const [key, wanted] of Object.entries(row.when)) {
      if (inputs[key as keyof BandInputs] !== wanted) {
        matches = false;
        break;
      }
    }
    if (matches) return row.band;
  }
  return 'mid';
}

/**
 * Deal a view's notes into the three bands, and count what did not fit.
 *
 * **Nothing owed is ever demoted silently.** Your Trainer's Issues view has 34
 * notes needing triage and 409 in all, so the front band overflows in the
 * normal case rather than the rare one. Past its capacity the note is left out
 * of the field and COUNTED, so the renderer can say "and 22 more"; the
 * navigator lists every one of them regardless.
 *
 * **Mid overflow never falls into the quiet band**, because "behind you" has to
 * mean finished, not "did not fit".
 */
export function bandCards<T>(table: BandTable, cards: Array<{ card: T; inputs: BandInputs }>): Banding<T> {
  const out: Banding<T> = { front: [], mid: [], deep: [], frontOverflow: 0, midOverflow: 0 };
  for (const entry of cards) {
    const band = bandOf(table, entry.inputs);
    if (band === 'front') {
      if (out.front.length < table.frontCapacity) out.front.push(entry.card);
      else out.frontOverflow += 1;
      continue;
    }
    if (band === 'mid') {
      if (out.mid.length < table.midCapacity) out.mid.push(entry.card);
      else out.midOverflow += 1;
      continue;
    }
    out.deep.push(entry.card);
  }
  return out;
}
