/**
 * Deck's own HTTP host: the second of the two hosts, and the only network
 * surface Deck exposes.
 *
 * It serves the renderer and proxies reads to a workspace's sidecar. The
 * Electron window loads from it too, so both hosts run identical bytes over
 * one origin and there is no second data path to keep honest (ADR-0001).
 *
 * It allows GET and HEAD. Every other method is refused with 405 before
 * anything reaches the sidecar. That is a second lock on a door the sidecar
 * already locks — the right number for a door facing the local network.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { Capabilities, DeckState, Workspace } from '../shared/types.js';
import type { IndexSnapshot } from './note-index.js';
import { servedState } from '../shared/served-state.js';

const READ_METHODS = new Set(['GET', 'HEAD']);

/**
 * The only sidecar paths Deck will forward.
 *
 * An allow-list rather than "anything under /api", because this proxy changes
 * where a request appears to come from. The sidecar refuses some reads from
 * anywhere but loopback — the inbox among them — and every request Deck
 * forwards arrives at the sidecar from loopback, whoever sent it. Without this
 * list, binding Deck's host to the network would hand a tablet exactly the
 * reads the sidecar's own guard exists to withhold.
 *
 * A path matches when it equals an entry or begins with an entry plus "/".
 */
const FORWARDABLE = [
  '/healthz',
  '/api/cockpit/identity',
  '/api/cockpit/nav',
  '/api/cockpit/stats',
  '/api/cockpit/locate',
  '/api/cockpit/context',
  '/api/render',
  // A READ that says which verbs a note allows. Forwardable because it is one:
  // a tablet may see that a note could be approved, and the capability set is
  // what stops it being offered the verb (ADR-0003). No write path is
  // forwardable, and this host still answers 405 to every method that is not
  // GET or HEAD.
  '/api/notes/actions',
];

export function isForwardable(sidecarPath: string): boolean {
  // Checked AFTER the URL parser has done its normalisation, never before.
  // Deciding on the path as written lets a second decoding step turn an
  // allowed path into a forbidden one: `/api/render/%252e%252e/api/inbox`
  // decodes once to `%2e%2e`, passes a check on that string, and is then
  // resolved by `fetch` to `/api/inbox`. Two decodings, one check, no lock.
  // Refusing every percent sign is blunt, and it is what Deck needs: the paths
  // it reads carry their arguments in the query, never in a path segment. A
  // future sidecar route with an encoded segment would be unforwardable until
  // this is loosened, which is the right way round for a rule facing a network.
  if (sidecarPath.includes('%')) return false;
  if (sidecarPath.split('/').some((segment) => segment === '..' || segment === '.')) return false;
  return FORWARDABLE.some((allowed) => sidecarPath === allowed || sidecarPath.startsWith(`${allowed}/`));
}

/**
 * The URL this request would actually reach, or null if it cannot be one.
 *
 * The path is resolved against the sidecar's base FIRST, so that whatever
 * normalisation the URL parser performs has already happened by the time the
 * allow-list sees the path. What is checked is what is fetched.
 */
/**
 * Whether a query value could name a file outside the workspace.
 *
 * The allow-list above reads the path, and `/api/render` takes the file it
 * renders as a query argument — so an allowed path carrying any target at all
 * used to be forwarded verbatim from the local network, and what refused it
 * was a function in the cockpit repository that nothing here watches
 * (ISS-0014, RISK-0002). This is the lock on Deck's side of that door.
 *
 * A literal per cent in a filename is NOT refused. `50% off.md` cannot be
 * decoded a second time, and refusing it on that ground would make a note
 * unreadable over the LAN because of a character in its name. A value that
 * will not decode is checked once, which is all there is to check.
 *
 * A DRIVE LETTER needs a separator after it: `C:/Windows` is a way out and
 * `a:b.md` is a filename with a colon in it, which macOS allows.
 */
export function namesAWayOut(value: string): boolean {
  const suspects = [value];
  try {
    const again = decodeURIComponent(value);
    if (again !== value) suspects.push(again);
  } catch {
    // Not decodable, so there is no second form to check.
  }
  return suspects.some(
    (s) =>
      s.includes('\0') ||
      // The replacement character means the bytes were not valid UTF-8, so
      // what this function inspected is not what `fetch` will send. An
      // overlong `%c0%ae` arrives here as U+FFFD and leaves as the original
      // bytes. Deck's reads never contain one; anything that does is refused
      // rather than guessed at.
      s.includes('\uFFFD') ||
      s.startsWith('/') ||
      s.startsWith('\\') ||
      /^[A-Za-z]:[/\\]/.test(s) ||
      // A segment of nothing but dots, with any `;`-parameter cut off first.
      // `..` is the one that matters; `....//` and `..;/` are the spellings
      // that servers which strip dots or path parameters collapse INTO it.
      // Neither is a way out of the sidecar Deck talks to today, and neither
      // is a note filename either, so they are refused rather than reasoned
      // about every time somebody changes what is behind this proxy.
      s.split(/[/\\]/).some((segment) => /^\.+$/.test(segment.split(';')[0] ?? '')),
  );
}

export function resolveSidecarTarget(base: string, rawPathAndQuery: string): URL | null {
  let target: URL;
  try {
    target = new URL(rawPathAndQuery, `${base}/`);
  } catch {
    return null;
  }
  if (target.origin !== new URL(base).origin) return null;
  if (!isForwardable(target.pathname)) return null;
  // Keys AND values, not just the ones Deck itself sends: `/api/cockpit/locate`
  // and `/api/cockpit/context` are already forwardable and take arguments the
  // Glass phase will start using — and a query with no `=` in it, such as
  // `?../../etc/passwd`, is parsed as a KEY with an empty value, so checking
  // values alone let the whole traversal through.
  for (const [key, value] of target.searchParams) {
    if (namesAWayOut(key) || namesAWayOut(value)) return null;
  }
  return target;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

export interface HostOptions {
  /** The document root, which is the built renderer. */
  webRoot: string;
  /** What a page served by this host may do. Reading, and nothing else. */
  capabilities: Capabilities;
  listWorkspaces: () => Workspace[];
  /** The sidecar base for a workspace, or null when none is running. */
  sidecarBaseFor: (workspaceId: string) => string | null;
  /**
   * Called when a sidecar stopped answering. Deck may have borrowed one that
   * has since exited, and the next attempt to open the workspace has to look
   * for it again rather than keep addressing a port nobody is listening on.
   */
  onSidecarUnreachable?: (workspaceId: string) => void;
  /**
   * Whether a sidecar for this workspace has been started and has not answered
   * yet.
   *
   * A read that arrives during that wait is refused by a port nobody is
   * listening on, which looks exactly like a sidecar that has died. Treating it
   * as one killed the sidecar the shell was still waiting for (ISS-0011), and
   * it was reachable only from a page this host serves, because that page
   * issues reads without waiting for a sidecar the way the shell does.
   */
  isSidecarStarting?: (workspaceId: string) => boolean;
  /**
   * Deck's own index for a workspace, or null when Deck has none open for it.
   *
   * These records are DECK'S, not the sidecar's, so this path is not a forward
   * and the allow-list ISS-0014 hardened has nothing to do with it. It has its
   * own surface and its own refusals, and the suite says so rather than
   * assuming the forwarding tests cover it (TASK-0040).
   */
  indexFor?: (workspaceId: string) => IndexSnapshot | null;
  /**
   * The store's state, for `/deck/state` and `/deck/events` (TASK-0057).
   *
   * Both are READS. A tablet follows the Mac's desk by reading it and sends
   * nothing back, because this host answers 405 to every method that is not a
   * read (ADR-0001). Absent, both routes answer 404: a host with no store to
   * describe is not one that should pretend to have an empty one.
   */
  state?: () => DeckState;
  /** Called with every state the store broadcasts. Returns its own unsubscribe. */
  subscribeState?: (fn: (state: DeckState) => void) => () => void;
  /**
   * Anything else this host serves, as `{ path: answer }`, checked before the
   * files. How the graph a Glass arrangement reads reaches a page without the
   * host knowing what a graph is (TASK-0001).
   */
  extraReads?: (pathname: string, search: URLSearchParams) => unknown | undefined;
}

export interface Listening {
  port: number;
  address: string;
}

export const SIDECAR_PREFIX = '/deck/sidecar/';
/** How often an idle event stream says it is still there, so nothing between closes it. */
export const EVENTS_HEARTBEAT_MS = 20_000;
export const RECORDS_PREFIX = '/deck/records/';

export class DeckHost {
  private readonly options: HostOptions;
  private server: http.Server | null = null;
  /** The pages following the store right now: one open event stream each. */
  private readonly streams = new Set<http.ServerResponse>();

  constructor(options: HostOptions) {
    this.options = options;
  }

  /**
   * How many served pages are following the store.
   *
   * A throw can land on the tablet only when one is listening, so the target
   * strip names it only then (TASK-0055).
   */
  followers(): number {
    return this.streams.size;
  }

  listen(port: number, bind = '127.0.0.1'): Promise<Listening> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handle(req, res).catch(() => {
          plain(res, 500, 'Deck could not answer that');
        });
      });
      server.once('error', reject);
      server.listen(port, bind, () => {
        this.server = server;
        const addr = server.address();
        const actual = typeof addr === 'object' && addr !== null ? addr.port : port;
        resolve({ port: actual, address: bind });
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      // An event stream is a request that never finishes on its own, so a
      // close that waited for it would wait for the tablet to put itself down.
      for (const stream of this.streams) stream.end();
      this.streams.clear();
      if (this.server === null) {
        resolve();
        return;
      }
      this.server.close(() => resolve());
      this.server.closeAllConnections?.();
      this.server = null;
    });
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const method = (req.method ?? 'GET').toUpperCase();
    if (!READ_METHODS.has(method)) {
      // Refused here, so nothing that could change a note reaches the sidecar.
      res.setHeader('Allow', 'GET, HEAD');
      plain(res, 405, 'Deck serves reads only');
      return;
    }

    const url = new URL(req.url ?? '/', 'http://deck.invalid');
    const rawPathname = url.pathname;
    const pathname = decodeSafely(rawPathname);
    if (pathname === null) {
      plain(res, 400, 'that path is not readable as text');
      return;
    }

    if (pathname === '/deck/capabilities') {
      json(res, 200, this.options.capabilities);
      return;
    }
    if (pathname === '/deck/workspaces') {
      // Each workspace says whether a sidecar is answering for it. A page this
      // host serves cannot start one, so without this the rail offers a
      // workspace that cannot open and the reason arrives as a 503 from a
      // read the person did not know they were making (ISS-0003).
      json(res, 200, {
        workspaces: this.options
          .listWorkspaces()
          .map((workspace) => ({ ...workspace, open: this.options.sidecarBaseFor(workspace.id) !== null })),
      });
      return;
    }
    if (pathname === '/deck/state') {
      if (this.options.state === undefined) {
        plain(res, 404, 'this host has no store to describe');
        return;
      }
      json(res, 200, servedState(this.options.state(), this.openWorkspaceIds()));
      return;
    }
    if (pathname === '/deck/events') {
      this.events(res, method);
      return;
    }
    if (this.options.extraReads !== undefined) {
      const answer = this.options.extraReads(pathname, url.searchParams);
      if (answer !== undefined) {
        if (answer === null) plain(res, 404, 'nothing there');
        else json(res, 200, answer);
        return;
      }
    }
    if (pathname.startsWith(RECORDS_PREFIX)) {
      this.records(pathname.slice(RECORDS_PREFIX.length), url.searchParams.get('rel'), res);
      return;
    }
    if (rawPathname.startsWith(SIDECAR_PREFIX)) {
      await this.proxy(rawPathname, url.search, method, res);
      return;
    }
    this.serveFile(pathname, method, res);
  }

  /** The workspaces whose sidecar is answering, which is what the network may be told about. */
  private openWorkspaceIds(): Set<string> {
    return new Set(
      this.options
        .listWorkspaces()
        .filter((w) => this.options.sidecarBaseFor(w.id) !== null)
        .map((w) => w.id),
    );
  }

  /**
   * The store's state as a server-sent event stream (TASK-0057).
   *
   * The whole served state on every broadcast, rather than a patch: the state
   * is a few kilobytes, a patch format would be a second thing to keep
   * honest, and a page that missed one event must not be left wrong until the
   * next restart. The first event is sent at once, so a page that subscribes
   * never draws a default it then has to replace.
   */
  private events(res: http.ServerResponse, method: string): void {
    if (this.options.state === undefined || this.options.subscribeState === undefined) {
      plain(res, 404, 'this host has no store to follow');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    if (method === 'HEAD') {
      res.end();
      return;
    }
    const send = (state: DeckState): void => {
      if (res.writableEnded) return;
      res.write(`event: state\ndata: ${JSON.stringify(servedState(state, this.openWorkspaceIds()))}\n\n`);
    };
    this.streams.add(res);
    const unsubscribe = this.options.subscribeState(send);
    const beat = setInterval(() => {
      if (!res.writableEnded) res.write(': still here\n\n');
    }, EVENTS_HEARTBEAT_MS);
    beat.unref?.();
    const stop = (): void => {
      clearInterval(beat);
      unsubscribe();
      this.streams.delete(res);
    };
    res.on('close', stop);
    res.on('error', stop);
  }

  /**
   * Deck's own records for one workspace, on both hosts.
   *
   * The answer always carries the revision it was built from, so a caller
   * knows which state of the index it holds without a second round trip —
   * which is what makes the changed-under-you mark possible (TASK-0051).
   *
   * A read that arrives while the index is still building is answered, not
   * refused and not treated as a failure. ISS-0011 is exactly this shape one
   * layer down: a read during a long start-up was read as a death and the
   * thing being read was torn down.
   */
  private records(workspaceId: string, rel: string | null, res: http.ServerResponse): void {
    if (workspaceId === '' || workspaceId.includes('/')) {
      plain(res, 404, 'that request names no workspace');
      return;
    }
    const index = this.options.indexFor?.(workspaceId) ?? null;
    if (index === null) {
      // By name, never as an empty list: an empty index and a workspace Deck
      // does not have open look identical on screen, and only one is a
      // mistake the person can do something about.
      plain(res, 404, `Deck has no index for the workspace ${workspaceId}`);
      return;
    }
    // `?rel=` asks for ONE record. A reader opening a note needs that note's
    // modification time — the only guard against writing to a note that
    // changed since the page was drawn — and fetching 2715 records to find one
    // of them would be a strange way to ask.
    const records = index.building ? [] : index.records;
    json(res, 200, {
      workspaceId: index.workspaceId,
      revision: index.revision,
      building: index.building,
      // What sits between the workspace root and a record's path, usually
      // `docs`. A base file's `inFolder` is written against the vault, whose
      // root is the repository, so an evaluator that does not know this never
      // matches one (ISS-0027).
      pathPrefix: index.pathPrefix,
      // Nothing while the walk is still running, rather than half a workspace
      // that a view would quietly draw as though it were all of it.
      records: rel === null ? records : records.filter((record) => record.relPath === rel),
      problems: index.problems,
    });
  }

  private async proxy(rawPathname: string, search: string, method: string, res: http.ServerResponse): Promise<void> {
    // The RAW path, not the decoded one: what reaches the sidecar has to be
    // decided on the same text the URL parser will resolve.
    const rest = rawPathname.slice(SIDECAR_PREFIX.length);
    const slash = rest.indexOf('/');
    const workspaceId = decodeSafely(slash === -1 ? rest : rest.slice(0, slash)) ?? '';
    const sidecarPath = slash === -1 ? '/' : rest.slice(slash);
    if (workspaceId === '') {
      plain(res, 404, 'that request names no workspace');
      return;
    }
    const base = this.options.sidecarBaseFor(workspaceId);
    if (base === null) {
      plain(res, 503, 'no sidecar is running for that workspace');
      return;
    }
    const target = resolveSidecarTarget(base, `${sidecarPath}${search}`);
    if (target === null) {
      plain(res, 403, 'Deck does not forward that path');
      return;
    }
    let upstream: Response;
    try {
      upstream = await fetch(target, { method });
    } catch {
      // Still starting is not the same as gone. Say so, and leave it alone.
      if (this.options.isSidecarStarting?.(workspaceId) === true) {
        plain(res, 503, 'the sidecar for that workspace is still starting');
        return;
      }
      this.options.onSidecarUnreachable?.(workspaceId);
      plain(res, 502, 'the sidecar did not answer');
      return;
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    const type = upstream.headers.get('content-type');
    res.writeHead(upstream.status, {
      'Content-Type': type ?? 'application/octet-stream',
      'Content-Length': String(body.length),
      'Cache-Control': 'no-cache',
    });
    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
  }

  private serveFile(pathname: string, method: string, res: http.ServerResponse): void {
    const resolved = resolveWithin(this.options.webRoot, pathname === '/' ? '/index.html' : pathname);
    if (resolved === null) {
      // A path that walks out of the document root is refused, not corrected.
      plain(res, 403, 'that path is outside what Deck serves');
      return;
    }
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolved);
    } catch {
      plain(res, 404, 'no such file');
      return;
    }
    if (!stat.isFile()) {
      plain(res, 404, 'no such file');
      return;
    }
    const type = CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': String(stat.size),
      'Cache-Control': 'no-cache',
    });
    if (method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(resolved).pipe(res);
  }
}

/**
 * Join a request path onto the document root, or refuse it.
 *
 * Refuses anything that resolves outside the root, however it was written:
 * `..` segments, an absolute path, a percent-encoded traversal, or a symbolic
 * link pointing away. Exported so the containment rule can be tested directly.
 */
export function resolveWithin(root: string, pathname: string): string | null {
  const rootReal = fs.realpathSync.native(path.resolve(root));
  // Refuse a traversal rather than normalising it away. `path.posix.normalize`
  // turns "/../x" into "/x", which is safe but silent, and a request that was
  // trying to leave should be answered with a refusal it can read.
  if (pathname.split('/').some((segment) => segment === '..')) return null;
  const candidate = path.resolve(rootReal, `.${path.posix.normalize(pathname)}`);
  const inside = (p: string): boolean => p === rootReal || p.startsWith(rootReal + path.sep);
  if (!inside(candidate)) return null;
  try {
    const real = fs.realpathSync.native(candidate);
    return inside(real) ? real : null;
  } catch {
    // Does not exist: the containment check above already passed, so let the
    // caller answer 404 rather than 403.
    return candidate;
  }
}

function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function plain(res: http.ServerResponse, status: number, message: string): void {
  const body = Buffer.from(`${message}\n`, 'utf-8');
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': String(body.length) });
  res.end(body);
}

function json(res: http.ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf-8');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(body.length) });
  res.end(body);
}
