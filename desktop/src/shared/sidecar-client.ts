/**
 * The one route from Deck to a sidecar. Every request Deck makes to
 * project-os-cockpit's Python service goes through here.
 *
 * There is no method that writes. The sidecar's own guard refuses mutations
 * from anywhere but loopback, and Deck's host refuses every method that is not
 * a read (ADR-0001); this module is the third lock, and the cheapest: a write
 * has nowhere to be called from.
 */

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

export interface NavItem {
  id: string;
  title: string;
  status: string;
  url: string | null;
  subtitle: string | null;
  noteType: string;
  owed: boolean;
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
      throw new SidecarError(`the sidecar answered ${response.status}`, url);
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
    const obj = requireObject(await this.getJson(`/api/cockpit/nav?mode=${encodeURIComponent(mode)}`), url);
    const rawGroups = obj['groups'];
    if (!Array.isArray(rawGroups)) {
      throw new SidecarError('the nav payload has no "groups"', url);
    }
    return {
      mode: typeof obj['mode'] === 'string' ? obj['mode'] : mode,
      groups: rawGroups.map((g) => toGroup(g, url)),
    };
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
    };
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

/** The rows a view shows, flattened out of the payload's groups. */
export function cardsFromNav(payload: NavPayload): Array<{
  noteId: string;
  title: string;
  noteType: string;
  status: string;
  rel: string | null;
}> {
  const out: Array<{ noteId: string; title: string; noteType: string; status: string; rel: string | null }> = [];
  const seen = new Set<string>();
  const walk = (items: NavItem[]): void => {
    for (const item of items) {
      if (item.id !== '' && !seen.has(item.id)) {
        seen.add(item.id);
        out.push({
          noteId: item.id,
          title: item.title,
          noteType: item.noteType,
          status: item.status,
          rel: relFromUrl(item.url),
        });
      }
      if (item.children.length > 0) walk(item.children);
    }
  };
  for (const group of payload.groups) walk(group.items);
  return out;
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
  const children = Array.isArray(obj['children']) ? (obj['children'] as unknown[]) : [];
  return {
    id: typeof obj['id'] === 'string' ? obj['id'] : '',
    title: typeof obj['title'] === 'string' ? obj['title'] : '',
    status: typeof obj['status'] === 'string' ? obj['status'] : '',
    url: typeof obj['url'] === 'string' ? obj['url'] : null,
    subtitle: typeof obj['subtitle'] === 'string' ? obj['subtitle'] : null,
    noteType: typeof obj['type'] === 'string' ? obj['type'] : '',
    owed: obj['owed'] === true,
    children: children.map((c) => toItem(c, url)),
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
