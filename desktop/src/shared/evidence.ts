/**
 * Evidence beside the claim it supports (FEAT-0024, ADR-0008).
 *
 * What is shown about a note's verification is read from three places and no
 * other: Deck's own index of the notes (which tests name a note, and what
 * each test note says about itself), the sidecar's acceptance payload (the
 * ledger's verdicts for the checks a person walks), and the rendered note
 * (the claim, and the links its author wrote on a criterion's own line).
 *
 * This module is the rule for turning those into words, with no window and
 * no request in it. It never infers. A check nobody walked has no verdict,
 * and that is what is said. A test with a command has no result Deck can
 * read, and that is what is said. A record that could not be read is not an
 * empty one. A verdict and a status are different words: nothing here holds
 * both, and neither is ever shown as the other.
 */
import type { GraphEdge } from './graph.js';

/** The sentences ADR-0008 fixes, so a reader meets the same words everywhere and a test can check them. */
export const NO_TEST = 'no test names this note';
export const NOT_WALKED = 'not walked: no verdict is recorded';
export const BY_COMMAND = 'run by a command; its result is not recorded anywhere Deck can read';
export const NO_DATE = 'no date of verification is recorded on the test note';
export const UNREAD = 'the acceptance record could not be read';
export const NO_LEDGER = 'this workspace keeps no acceptance ledger';
export const NO_SECTION = 'this test note has no Evidence section';
export const NAMED_ON_LINE = 'named on this line';

/** A manual verification goes stale after this many days (tools/instructions/STATUSES.md). */
export const STALE_DAYS = 90;
export const STALE = `stale: a manual verification goes stale after ${STALE_DAYS} days`;

/** The acceptance payload's shape this module was written against. */
export const ACCEPTANCE_SCHEMA = 4;

/** What a test note says about itself in its frontmatter: these six facts and nothing else. */
export interface TestFacts {
  id: string;
  title: string;
  /** The note's path, for opening the original. */
  rel: string;
  status: string;
  level: string;
  /** The command that runs it, or '' when a person performs it. */
  command: string;
  /** When a person last performed it; '' when the note records no date. */
  lastVerified: string;
  /** The paths the note lists. Text, not links: nothing serves them. */
  artifacts: string[];
  /** A reviewer's opinion of the test itself. Not a result of running it. */
  reviewVerdict: string;
}

/** A note as Deck's index holds it, as far as this module reads it. */
export interface RecordLike {
  id: string;
  title: string | null;
  relPath: string;
  types: readonly string[];
  status: string | null;
  frontmatter: Readonly<Record<string, unknown>>;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter((v) => v !== '');
  const one = text(value);
  return one === '' ? [] : [one];
}

/** A test's facts from its record, or null when the record is not a test note. */
export function testFacts(record: RecordLike): TestFacts | null {
  if (!record.types.includes('test')) return null;
  const fm = record.frontmatter;
  return {
    id: record.id,
    title: record.title ?? record.id,
    rel: record.relPath,
    status: record.status ?? '',
    level: text(fm['level']),
    command: text(fm['command']),
    lastVerified: text(fm['last_verified']).slice(0, 10),
    artifacts: list(fm['artifacts']),
    reviewVerdict: text(fm['review_verdict']),
  };
}

/** The four keys that make a test a note's evidence, and no other does. */
export type VerifyKey = 'covers' | 'tasks' | 'tests' | 'verifies';
/** Written on the test, naming the note. */
const ON_TEST: readonly VerifyKey[] = ['covers', 'tasks'];
/** Written on the note, naming the test. */
const ON_NOTE: readonly VerifyKey[] = ['tests', 'verifies'];

export interface VerifiedBy {
  testId: string;
  /** The keys it was found under, as their authors wrote them. */
  keys: VerifyKey[];
}

/** The key as the panel says it: whose frontmatter, and which key. Deck gives the link no other meaning. */
export function keyPhrase(key: VerifyKey): string {
  return ON_TEST.includes(key) ? `its ${key}: names this note` : `named in this note's ${key}:`;
}

/** What a frontmatter value names: a wikilink's target without its brackets, alias or heading; or the bare text. */
function target(value: string): string {
  const link = /^\[\[([^\]|#]+)/.exec(value.trim());
  const name = (link === null ? value : (link[1] as string)).trim();
  // A link may be written as a path; the note is its last segment.
  return name.split('/').pop() ?? name;
}

/** Whether a written target names this note: its id exactly, or its file name, which begins with the id. */
function names(written: string, noteId: string): boolean {
  const t = target(written);
  return t === noteId || t.startsWith(`${noteId}-`);
}

/**
 * The test notes that verify a note, and the key each was found under.
 *
 * Read from the graph's edges AND from the records' frontmatter. A wikilink
 * under any key makes an edge; a bare id under `covers:` or `tasks:` does
 * not, and it counts the same. A test found both ways is returned once. A
 * link under any other key, or in a note's text, returns nothing, and so
 * does a target that is not a test note.
 */
export function testsVerifying(noteId: string, edges: readonly GraphEdge[], records: readonly RecordLike[]): VerifiedBy[] {
  const tests = new Map(records.filter((r) => r.types.includes('test')).map((r) => [r.id, r]));
  const found = new Map<string, Set<VerifyKey>>();
  const add = (testId: string, key: VerifyKey): void => {
    if (testId === noteId || !tests.has(testId)) return;
    const set = found.get(testId) ?? new Set<VerifyKey>();
    set.add(key);
    found.set(testId, set);
  };
  for (const edge of edges) {
    if (edge.target === null || edge.field === null || edge.field === undefined) continue;
    if (edge.target === noteId && (ON_TEST as readonly string[]).includes(edge.field)) add(edge.source, edge.field as VerifyKey);
    else if (edge.source === noteId && (ON_NOTE as readonly string[]).includes(edge.field)) add(edge.target, edge.field as VerifyKey);
  }
  for (const test of tests.values()) {
    for (const key of ON_TEST) if (list(test.frontmatter[key]).some((v) => names(v, noteId))) add(test.id, key);
  }
  const own = records.find((r) => r.id === noteId);
  if (own !== undefined) {
    for (const key of ON_NOTE) {
      for (const written of list(own.frontmatter[key])) {
        for (const id of tests.keys()) if (names(written, id)) add(id, key);
      }
    }
  }
  return [...found]
    .map(([testId, keys]) => ({ testId, keys: [...keys].sort() }))
    .sort((a, b) => (a.testId < b.testId ? -1 : a.testId > b.testId ? 1 : 0));
}

/** One event in the ledger's history of a check. */
export interface LedgerEvent {
  platform: string;
  date: string;
  /** The verdict, or '' for an invalidation, which carries none. */
  mark: string;
  reason: string;
  by: string;
  method: string;
  /** The change that invalidated the standing verdict, or ''. */
  invalidatedBy: string;
}

/** The verdict that stands for one check, as the payload's row gives it. */
export interface Standing {
  /** The mark as the payload gives it; 'todo' or '' when no verdict stands. */
  mark: string;
  date: string;
  reason: string;
  method: string;
}

/** One platform's ledger, as one acceptance payload gives it. */
export interface PlatformLedger {
  platform: string;
  rows: Map<string, Standing>;
  /** Every event recorded for each check, newest first. */
  history: Map<string, LedgerEvent[]>;
}

/**
 * What was learned about the acceptance record: a ledger per platform; or no
 * ledger at all in this workspace; or that it could not be read, and why.
 * The three are different, and are never shown as each other.
 */
export type LedgerRead = { ledgers: PlatformLedger[] } | { none: true } | { unread: string };

function schemaProblem(raw: Record<string, unknown>): string | null {
  const version = raw['schema_version'];
  if (version === undefined) return 'the answer carries no schema_version';
  return version === ACCEPTANCE_SCHEMA ? null : `the answer is schema ${text(version)}, and Deck reads schema ${ACCEPTANCE_SCHEMA}`;
}

/**
 * The platforms that have a ledger, from the payload asked with
 * `platform=all`. Nothing else is read from that answer: `all` is the union
 * in which every platform must clear a check, which is no platform's verdict.
 */
export function platformsFrom(payload: unknown): string[] | { unread: string } {
  if (typeof payload !== 'object' || payload === null) return { unread: 'the answer is not the acceptance record' };
  const raw = payload as Record<string, unknown>;
  const problem = schemaProblem(raw);
  if (problem !== null) return { unread: problem };
  const platforms = raw['ledger_platforms'];
  if (!Array.isArray(platforms)) return { unread: 'the answer does not say which platforms have a ledger' };
  return platforms.filter((p): p is string => typeof p === 'string' && p !== '');
}

/**
 * One platform's ledger from its payload. Strict about the shape, because a
 * renamed field would otherwise read as "not walked" with nothing failing
 * (RISK-0008): a payload of another schema, or without `view.tiers` or
 * `view.history`, is not read at all. A malformed event is dropped and the
 * rest are kept.
 *
 * Two fields of a row are deliberately not read. `stale` means something
 * else than a ledger fact. And `invalidated_by` on a row is the TEST NOTE's
 * own frontmatter (the scalar a repository used before it kept a ledger),
 * not the ledger's word: on `your-trainer` a check carries one from long ago
 * with no date, beside three dated invalidations in its ledger. The ledger's
 * invalidation is an event in the history, and that is where it is read.
 */
export function platformLedger(payload: unknown, platform: string): PlatformLedger | { unread: string } {
  if (typeof payload !== 'object' || payload === null) return { unread: 'the answer is not the acceptance record' };
  const raw = payload as Record<string, unknown>;
  const problem = schemaProblem(raw);
  if (problem !== null) return { unread: problem };
  const view = raw['view'];
  if (typeof view !== 'object' || view === null) return { unread: 'the answer has no view' };
  const v = view as Record<string, unknown>;
  if (!Array.isArray(v['tiers'])) return { unread: 'the answer has no view.tiers' };
  const rawHistory = v['history'];
  if (typeof rawHistory !== 'object' || rawHistory === null || Array.isArray(rawHistory)) return { unread: 'the answer has no view.history' };
  const rows = new Map<string, Standing>();
  for (const tier of v['tiers'] as unknown[]) {
    const areas = (tier as Record<string, unknown> | null)?.['areas'];
    if (!Array.isArray(areas)) continue;
    for (const area of areas) {
      const items = (area as Record<string, unknown> | null)?.['items'];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const row = item as Record<string, unknown>;
        const id = text(row['id']);
        if (id === '') continue;
        rows.set(id, { mark: text(row['mark']), date: text(row['verdict_date']), reason: text(row['verdict_reason']), method: text(row['verdict_method']) });
      }
    }
  }
  const history = new Map<string, LedgerEvent[]>();
  for (const [id, events] of Object.entries(rawHistory as Record<string, unknown>)) {
    if (!Array.isArray(events)) continue;
    const out: LedgerEvent[] = [];
    for (const event of events) {
      if (typeof event !== 'object' || event === null) continue;
      const e = event as Record<string, unknown>;
      const date = text(e['date']);
      if (date === '' || (e['mark'] !== undefined && e['mark'] !== null && typeof e['mark'] !== 'string')) continue;
      const of = text(e['platform']);
      // An event the payload says belongs to another platform is not this platform's.
      if (of !== '' && of !== platform) continue;
      out.push({ platform, date, mark: text(e['mark']), reason: text(e['reason']), by: text(e['by']), method: text(e['method']), invalidatedBy: text(e['invalidated_by']) });
    }
    // Newest first, whatever order they came in; the sort is stable, so same-day events keep the payload's order.
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    history.set(id, out);
  }
  return { platform, rows, history };
}

/** A verdict that settles a check, and one that holds it open. The ledger's own vocabulary. */
const CLEARING = new Set(['pass', 'partial', 'na', 'excused']);
const BLOCKING = new Set(['fail', 'blocked', 'question']);

/** Whole days from one ISO date to another, or null when either is not a date. */
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * What is recorded about a test. Each case is something a source says, or
 * the plain statement that no source says it. A case that comes from the
 * ledger carries a mark and never the note's status; a case that comes from
 * the note carries its status and never a mark.
 */
export type Recorded =
  | { kind: 'verdict'; mark: string; settles: 'clears' | 'blocks' | 'other'; date: string; reason: string; by: string; method: string; platform: string; source: 'ledger' }
  | { kind: 'not-walked'; platform: string; source: 'ledger' }
  | { kind: 'invalidated'; change: string; date: string; reason: string; before: { mark: string; date: string } | null; platform: string; source: 'ledger' }
  | { kind: 'unread'; why: string; source: 'ledger' }
  | { kind: 'no-ledger'; source: 'ledger' }
  | { kind: 'performed'; status: string; date: string; stale: boolean; days: number | null; source: 'note' }
  | { kind: 'undated'; status: string; source: 'note' }
  | { kind: 'command'; command: string; source: 'note' }
  | { kind: 'retired'; source: 'note' };

function standingFor(test: TestFacts, ledger: PlatformLedger): Recorded {
  const { platform } = ledger;
  const row = ledger.rows.get(test.id);
  const events = ledger.history.get(test.id) ?? [];
  const latest = events[0];
  if (row === undefined || row.mark === '' || row.mark === 'todo') {
    // No verdict stands. Either the newest event in the ledger is an invalidation, or none was ever recorded.
    if (latest === undefined || !(latest.invalidatedBy !== '' || latest.mark === '')) return { kind: 'not-walked', platform, source: 'ledger' };
    const before = events.find((e) => e.mark !== '' && e.invalidatedBy === '');
    return { kind: 'invalidated', change: latest.invalidatedBy, date: latest.date, reason: latest.reason, before: before === undefined ? null : { mark: before.mark, date: before.date }, platform, source: 'ledger' };
  }
  // The row carries no author: who recorded it is on the newest event that matches the standing verdict.
  const event = events.find((e) => e.mark === row.mark && e.date === row.date) ?? events.find((e) => e.mark === row.mark);
  return {
    kind: 'verdict',
    mark: row.mark,
    settles: CLEARING.has(row.mark) ? 'clears' : BLOCKING.has(row.mark) ? 'blocks' : 'other',
    date: row.date,
    reason: row.reason,
    by: event?.by ?? '',
    method: row.method !== '' ? row.method : (event?.method ?? ''),
    platform,
    source: 'ledger',
  };
}

/**
 * What is recorded for a test: one entry for each thing a source says.
 *
 * Which rule applies is decided by the test note's own `level` and
 * `command`. A check at `level: acceptance` has the ledger's word, one entry
 * per platform, and its note's status is not consulted. A test with a
 * command has no result Deck can read. A manual test has its own note's
 * status and date. An acceptance check that also has a command gets both its
 * ledger entries and the command's sentence.
 */
export function recordedFor(test: TestFacts, ledger: LedgerRead, today: string, staleDays = STALE_DAYS): Recorded[] {
  if (test.status === 'retired') return [{ kind: 'retired', source: 'note' }];
  const command: Recorded[] = test.command === '' ? [] : [{ kind: 'command', command: test.command, source: 'note' }];
  if (test.level === 'acceptance') {
    if ('unread' in ledger) return [{ kind: 'unread', why: ledger.unread, source: 'ledger' }, ...command];
    if ('none' in ledger || ledger.ledgers.length === 0) return [{ kind: 'no-ledger', source: 'ledger' }, ...command];
    return [...ledger.ledgers.map((l) => standingFor(test, l)), ...command];
  }
  if (command.length > 0) return command;
  if (test.lastVerified === '') return [{ kind: 'undated', status: test.status, source: 'note' }];
  const days = daysBetween(test.lastVerified, today);
  // More than ninety days, not ninety: the validator's `>`.
  return [{ kind: 'performed', status: test.status, date: test.lastVerified, stale: days !== null && days > staleDays, days, source: 'note' }];
}

/** How a recorded fact should look: settled, held open, not there, out of date, or neither. */
export type Tone = 'clear' | 'blocking' | 'absent' | 'stale' | 'plain';

export interface Said {
  /** What kind of fact it is: a verdict, or the note's own status. Never both. */
  label: 'verdict' | 'status of the test note' | '';
  text: string;
  /** Where it comes from. */
  from: string;
  tone: Tone;
}

function stop(reason: string): string {
  // A reason is a person's sentence and usually ends in a full stop; one is added after it either way.
  return reason.replace(/[.\s]+$/, '');
}

/** The sentence for one recorded fact, and where it comes from. */
export function recordedSentence(recorded: Recorded): Said {
  const ledger = (platform: string): string => `the acceptance ledger${platform === '' ? '' : ` (${platform})`}`;
  switch (recorded.kind) {
    case 'verdict': {
      const who = recorded.by === '' ? '' : ` by ${recorded.by}`;
      const how = recorded.method === '' ? '' : `, ${recorded.method}`;
      const why = recorded.reason === '' ? '' : `: ${recorded.reason}`;
      return { label: 'verdict', text: `${recorded.mark} on ${recorded.date}${who}${how}${why}`, from: ledger(recorded.platform), tone: recorded.settles === 'clears' ? 'clear' : recorded.settles === 'blocks' ? 'blocking' : 'plain' };
    }
    case 'not-walked':
      return { label: 'verdict', text: NOT_WALKED, from: ledger(recorded.platform), tone: 'absent' };
    case 'invalidated': {
      const by = recorded.change === '' ? '' : ` by ${recorded.change}`;
      const why = recorded.reason === '' ? '' : `: ${stop(recorded.reason)}`;
      const before = recorded.before === null ? '' : ` The verdict before it, ${recorded.before.mark} on ${recorded.before.date}, no longer stands.`;
      return { label: 'verdict', text: `invalidated on ${recorded.date}${by}${why}.${before} Not walked since.`, from: ledger(recorded.platform), tone: 'absent' };
    }
    case 'unread':
      // The reason is said once, by the panel; each check says only that its verdict is not known.
      return { label: 'verdict', text: UNREAD, from: 'the acceptance ledger', tone: 'absent' };
    case 'no-ledger':
      return { label: 'verdict', text: NO_LEDGER, from: 'the acceptance ledger', tone: 'absent' };
    case 'performed': {
      const base = `${recorded.status === '' ? 'no status' : recorded.status}, last verified ${recorded.date}`;
      return {
        label: 'status of the test note',
        text: recorded.stale ? `${base}. ${STALE}; this was ${recorded.days} days ago` : base,
        from: 'the test note',
        tone: recorded.stale ? 'stale' : recorded.status === 'failing' ? 'blocking' : recorded.status === 'passing' ? 'clear' : 'plain',
      };
    }
    case 'undated':
      return { label: 'status of the test note', text: `${recorded.status === '' ? 'no status' : recorded.status}; ${NO_DATE}`, from: 'the test note', tone: 'absent' };
    case 'command':
      return { label: '', text: BY_COMMAND, from: 'the test note', tone: 'plain' };
    case 'retired':
      return { label: 'status of the test note', text: 'retired: it is no longer performed', from: 'the test note', tone: 'plain' };
  }
}

/** One line of a check's history, as the panel lists it: platform, date, mark, author, method, reason. */
export function historyLine(event: LedgerEvent): string {
  const what = event.invalidatedBy !== '' || event.mark === '' ? `invalidated${event.invalidatedBy === '' ? '' : ` by ${event.invalidatedBy}`}` : event.mark;
  return `${event.platform === '' ? '' : `${event.platform}, `}${event.date}: ${what}${event.by === '' ? '' : ` by ${event.by}`}${event.method === '' ? '' : `, ${event.method}`}${event.reason === '' ? '' : `: ${event.reason}`}`;
}

/** How a test is carried out, in a few words. */
export function runnerText(test: TestFacts): string {
  if (test.level === 'acceptance') return 'walked by a person';
  if (test.command !== '') return `run by a command (${test.level === '' ? 'no level' : test.level})`;
  return `performed by hand (${test.level === '' ? 'no level' : test.level})`;
}

/**
 * What the control on a document's header says: how many tests name the
 * note, or that none does. It takes a count and nothing else. It is handed
 * no status, no feature and no task, so it cannot infer from one, and it
 * says nothing that could read as a result.
 */
export function controlText(tests: number): string {
  return tests === 0 ? NO_TEST : `${tests} ${tests === 1 ? 'test names' : 'tests name'} this note`;
}

/** The test ids among the notes a criterion's line links to, in the order written, each once. */
export function testsNamedOnLine(linkedIds: readonly string[], isTest: (id: string) => boolean): string[] {
  const out: string[] = [];
  for (const id of linkedIds) if (id !== '' && isTest(id) && !out.includes(id)) out.push(id);
  return out;
}
