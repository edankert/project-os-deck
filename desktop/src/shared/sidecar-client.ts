/**
 * The one route from Deck to a sidecar. Every request Deck makes to
 * project-os-cockpit's Python service goes through here.
 *
 * There is no method that writes. The sidecar's own guard refuses mutations
 * from anywhere but loopback, and Deck's host refuses every method that is not
 * a read (ADR-0001); this module is the third lock, and the cheapest: a write
 * has nowhere to be called from.
 */
import type { CardGroup, CardModel } from './types.js';

export class SidecarError extends Error {
  readonly url: string;
  constructor(message: string, url: string) {
    super(message);
    this.name = 'SidecarError';
    this.url = url;
  }
}

export interface HealthPayload {
  ok: boolean;
  service: string;
  schema: number;
  docsRoot: string;
}

export interface IdentityPayload {
  root: string;
  docsRoot: string;
  pid: number;
}

export interface NavProgress {
  done: number;
  total: number;
  stale: number;
}

export interface NavItem {
  id: string;
  title: string;
  status: string;
  url: string | null;
  subtitle: string | null;
  noteType: string;
  owed: boolean;
  /** The verb the sidecar names for what is owed, such as "Approve". */
  owedVerb: string | null;
  /** A test's mark and whether its last walk has gone stale. */
  mark: string | null;
  stale: boolean;
  lastVerified: string | null;
  /** Finished out of total, which the tests view sends per surface. */
  progress: NavProgress | null;
  children: NavItem[];
}

export interface NavGroup {
  key: string;
  label: string;
  status: string | null;
  needsHuman: boolean;
  suppressed: boolean;
  items: NavItem[];
}

export interface NavPayload {
  mode: string;
  groups: NavGroup[];
}

export interface NotePayload {
  relPath: string;
  title: string;
  html: string;
  frontmatter: Record<string, unknown>;
  /**
   * The file's modification time in seconds, as the sidecar read it.
   *
   * Carried because it is the only guard against writing to a note that
   * changed since this page was rendered, and the write endpoints accept it.
   * Null when the sidecar did not send one, and a write then travels without
   * the guard rather than with a number Deck made up.
   */
  mtime: number | null;
}

export interface StatsPayload {
  scope: string | null;
  hero: Record<string, unknown>;
}

type Fetcher = (input: string, init?: { method?: string; signal?: AbortSignal }) => Promise<Response>;

export interface ClientOptions {
  /** Injected in tests; defaults to the runtime's own fetch. */
  fetcher?: Fetcher;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class SidecarClient {
  private readonly base: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMs: number;

  constructor(base: string, options: ClientOptions = {}) {
    this.base = base.replace(/\/+$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Only ever GET. Nothing in this class takes a method. */
  private async getJson(path: string): Promise<unknown> {
    const url = `${this.base}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(url, { method: 'GET', signal: controller.signal });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new SidecarError(`the sidecar did not answer: ${reason}`, url);
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      // The body, when there is a short one. Deck's own host answers a plain
      // sentence — "the sidecar for that workspace is still starting" — and
      // discarding it left the person with a bare number to act on, which on
      // a tablet is all they get (ISS-0011, and the reason ISS-0003 was filed
      // about a 503 in the first place).
      let said = '';
      try {
        said = (await response.text()).trim();
      } catch {
        // A body that will not read is not worth failing differently for.
      }
      const detail = said !== '' && said.length <= 200 ? `: ${said}` : '';
      throw new SidecarError(`the sidecar answered ${response.status}${detail}`, url);
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new SidecarError('the sidecar answered something that is not JSON', url);
    }
  }

  async health(): Promise<HealthPayload> {
    const raw = await this.getJson('/healthz');
    const obj = requireObject(raw, `${this.base}/healthz`);
    return {
      ok: obj['ok'] === true,
      service: requireString(obj, 'service', `${this.base}/healthz`),
      schema: typeof obj['schema'] === 'number' ? obj['schema'] : 0,
      docsRoot: typeof obj['docs_root'] === 'string' ? obj['docs_root'] : '',
    };
  }

  async identity(): Promise<IdentityPayload> {
    const url = `${this.base}/api/cockpit/identity`;
    const obj = requireObject(await this.getJson('/api/cockpit/identity'), url);
    return {
      root: requireString(obj, 'root', url),
      docsRoot: requireString(obj, 'docs_root', url),
      pid: typeof obj['pid'] === 'number' ? obj['pid'] : 0,
    };
  }

  async nav(mode: string): Promise<NavPayload> {
    const url = `${this.base}/api/cockpit/nav?mode=${encodeURIComponent(mode)}`;
    return navFromPayload(await this.getJson(`/api/cockpit/nav?mode=${encodeURIComponent(mode)}`), mode, url);
  }

  async note(relPath: string): Promise<NotePayload> {
    const url = `${this.base}/api/render?path=${encodeURIComponent(relPath)}`;
    const obj = requireObject(await this.getJson(`/api/render?path=${encodeURIComponent(relPath)}`), url);
    if (typeof obj['error'] === 'string') {
      throw new SidecarError(`the sidecar refused the note: ${obj['error']}`, url);
    }
    return {
      relPath: typeof obj['rel_path'] === 'string' ? obj['rel_path'] : relPath,
      title: typeof obj['title'] === 'string' ? obj['title'] : relPath,
      html: requireString(obj, 'html', url),
      frontmatter:
        typeof obj['frontmatter'] === 'object' && obj['frontmatter'] !== null
          ? (obj['frontmatter'] as Record<string, unknown>)
          : {},
      mtime: typeof obj['mtime'] === 'number' ? obj['mtime'] : null,
    };
  }

  /**
   * The verbs this note allows, as the sidecar decides them.
   *
   * A READ, so it belongs on this client. What comes back is drawn as rows
   * and nothing about it is restated in Deck: the table lives in the sidecar's
   * `HUMAN_TRANSITIONS`, and a renderer that kept its own copy is what
   * project-os-cockpit#REQ-0026 forbids.
   */
  async actions(noteId: string): Promise<unknown> {
    return this.getJson(`/api/notes/actions?id=${encodeURIComponent(noteId)}`);
  }

  async stats(scope?: string): Promise<StatsPayload> {
    const query = scope === undefined ? '' : `?scope=${encodeURIComponent(scope)}`;
    const url = `${this.base}/api/cockpit/stats${query}`;
    const obj = requireObject(await this.getJson(`/api/cockpit/stats${query}`), url);
    return {
      scope: typeof obj['scope'] === 'string' ? obj['scope'] : null,
      hero: typeof obj['hero'] === 'object' && obj['hero'] !== null ? (obj['hero'] as Record<string, unknown>) : {},
    };
  }
}

/**
 * Read a navigation payload into the shape Deck uses.
 *
 * Separate from the fetch so a recorded payload can be read the same way a
 * live one is: the band function is measured over the sidecar's own answers
 * for this repository and for Your Trainer, and a fixture that went through a
 * different reader would be measuring the fixture.
 */
export function navFromPayload(raw: unknown, mode: string, url = 'a recorded payload'): NavPayload {
  const obj = requireObject(raw, url);
  const rawGroups = obj['groups'];
  if (!Array.isArray(rawGroups)) {
    throw new SidecarError('the nav payload has no "groups"', url);
  }
  return {
    mode: typeof obj['mode'] === 'string' ? obj['mode'] : mode,
    groups: rawGroups.map((g) => toGroup(g, url)),
  };
}

/**
 * The groups a view shows, with the structure the payload carried.
 *
 * Deck used to flatten every group, every child and every mark into one list
 * of four hundred identical cards (TASK-0023). The sidecar already says which
 * notes need a person, which are finished, what is owed on each and what each
 * one holds; all of that is kept here and drawn by the navigator.
 *
 * Ids repeat ACROSS groups on purpose: the sidecar puts an owed note in
 * "Needs you" and again under its phase, and dropping the second one would
 * empty the phase. Inside one group an id appears once.
 */
export function groupsFromNav(payload: NavPayload): CardGroup[] {
  return payload.groups.map((group) => ({
    key: group.key,
    label: group.label,
    needsHuman: group.needsHuman,
    suppressed: isFinishedWork(group),
    cards: cardsFromItems(group.items, group.key, new Set<string>()),
  }));
}

/**
 * Whether a group holds work that is over, and should arrive folded.
 *
 * The sidecar says so in two different ways. The features view sends one group
 * marked `suppressed`, labelled "Quiet". The issues view does not use that
 * flag at all: it repeats each severity band for the finished issues and
 * suffixes the key with ":done". Reading only the flag left 309 finished
 * issues drawn as rows in Your Trainer, under headings identical to the live
 * ones, which is the pile this was meant to remove (TASK-0023).
 */
export function isFinishedWork(group: { key: string; suppressed: boolean }): boolean {
  return group.suppressed || group.key.endsWith(':done');
}

function cardsFromItems(items: NavItem[], groupKey: string, seen: Set<string>): CardModel[] {
  const out: CardModel[] = [];
  for (const item of items) {
    if (item.id === '' || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({
      noteId: item.id,
      title: item.title,
      noteType: item.noteType,
      status: item.status,
      rel: relFromUrl(item.url),
      subtitle: item.subtitle,
      owed: item.owed,
      owedVerb: item.owedVerb,
      groupKey,
      severity: severityFromGroup(groupKey),
      lastVerified: item.lastVerified,
      stale: item.stale,
      progress: item.progress,
      // Children carry their own seen-set: a task under one feature is not the
      // same row as the same task under another, and a parent that repeats a
      // child of its own is what the dedup is for.
      children: cardsFromItems(item.children, groupKey, new Set<string>()),
      // The navigation payload carries the fields the cockpit chose, not the
      // note's own frontmatter. A card built from Deck's index carries that.
      frontmatter: null,
    });
  }
  return out;
}

/**
 * An issue's severity is the group it arrived in, not a field on the item.
 *
 * The sidecar bands issues by severity and repeats the bands for finished
 * ones with a ":done" suffix, so "high:done" is still a high issue.
 */
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'major', 'minor', 'cosmetic', 'enhancement', 'unset']);

export function severityFromGroup(groupKey: string): string | null {
  const head = groupKey.split(':')[0] ?? '';
  return SEVERITIES.has(head) ? head : null;
}

/** Every card in a view, groups and children flattened, each id once. */
export function flattenGroups(groups: CardGroup[]): CardModel[] {
  const out: CardModel[] = [];
  const seen = new Set<string>();
  const walk = (cards: CardModel[]): void => {
    for (const card of cards) {
      if (!seen.has(card.noteId)) {
        seen.add(card.noteId);
        out.push(card);
      }
      if (card.children.length > 0) walk(card.children);
    }
  };
  walk(groups.flatMap((g) => g.cards));
  return out;
}

/** The rows a view shows, with the groups flattened away. */
export function cardsFromNav(payload: NavPayload): CardModel[] {
  return flattenGroups(groupsFromNav(payload));
}

/** The sidecar's item urls are docs-root-relative paths, sometimes with a fragment. */
function relFromUrl(url: string | null): string | null {
  if (url === null || url === '') return null;
  const withoutHash = url.split('#')[0] ?? '';
  const cleaned = withoutHash.replace(/^\/+/, '');
  return cleaned === '' ? null : cleaned;
}

function toGroup(value: unknown, url: string): NavGroup {
  const obj = requireObject(value, url);
  const items = Array.isArray(obj['items']) ? (obj['items'] as unknown[]) : [];
  return {
    key: typeof obj['key'] === 'string' ? obj['key'] : '',
    label: typeof obj['label'] === 'string' ? obj['label'] : '',
    status: typeof obj['status'] === 'string' ? obj['status'] : null,
    needsHuman: obj['needs_human'] === true,
    suppressed: obj['suppressed'] === true,
    items: items.map((i) => toItem(i, url)),
  };
}

function toItem(value: unknown, url: string): NavItem {
  const obj = requireObject(value, url);
  // A feature holds its tasks under "children"; a test surface holds its tests
  // under "items". Both are the same thing to Deck: the notes this note holds.
  const nested = Array.isArray(obj['children'])
    ? (obj['children'] as unknown[])
    : Array.isArray(obj['items'])
      ? (obj['items'] as unknown[])
      : [];
  return {
    id: typeof obj['id'] === 'string' ? obj['id'] : '',
    title: typeof obj['title'] === 'string' ? obj['title'] : '',
    // A test carries a mark ("todo", "pass") where other notes carry a status.
    status: typeof obj['status'] === 'string' ? obj['status'] : typeof obj['mark'] === 'string' ? obj['mark'] : '',
    url: typeof obj['url'] === 'string' ? obj['url'] : null,
    subtitle: typeof obj['subtitle'] === 'string' ? obj['subtitle'] : null,
    noteType: typeof obj['type'] === 'string' ? obj['type'] : '',
    owed: obj['owed'] === true,
    owedVerb: typeof obj['owed_verb'] === 'string' ? obj['owed_verb'] : null,
    mark: typeof obj['mark'] === 'string' ? obj['mark'] : null,
    stale: obj['stale'] === true,
    lastVerified: typeof obj['last_verified'] === 'string' && obj['last_verified'] !== '' ? obj['last_verified'] : null,
    progress: toProgress(obj['progress']),
    children: nested.map((c) => toItem(c, url)),
  };
}

function toProgress(value: unknown): NavProgress | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const total = typeof raw['total'] === 'number' ? raw['total'] : null;
  if (total === null) return null;
  return {
    done: typeof raw['done'] === 'number' ? raw['done'] : 0,
    total,
    stale: typeof raw['stale'] === 'number' ? raw['stale'] : 0,
  };
}

function requireObject(value: unknown, url: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SidecarError('the sidecar answered something that is not an object', url);
  }
  return value as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, key: string, url: string): string {
  const value = obj[key];
  if (typeof value !== 'string') {
    throw new SidecarError(`the payload has no "${key}"`, url);
  }
  return value;
}
