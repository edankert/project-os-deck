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
import type { Capabilities, Workspace } from '../shared/types.js';

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
export function resolveSidecarTarget(base: string, rawPathAndQuery: string): URL | null {
  let target: URL;
  try {
    target = new URL(rawPathAndQuery, `${base}/`);
  } catch {
    return null;
  }
  if (target.origin !== new URL(base).origin) return null;
  return isForwardable(target.pathname) ? target : null;
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
}

export interface Listening {
  port: number;
  address: string;
}

export const SIDECAR_PREFIX = '/deck/sidecar/';

export class DeckHost {
  private readonly options: HostOptions;
  private server: http.Server | null = null;

  constructor(options: HostOptions) {
    this.options = options;
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
      if (this.server === null) {
        resolve();
        return;
      }
      this.server.close(() => resolve());
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
      json(res, 200, { workspaces: this.options.listWorkspaces() });
      return;
    }
    if (rawPathname.startsWith(SIDECAR_PREFIX)) {
      await this.proxy(rawPathname, url.search, method, res);
      return;
    }
    this.serveFile(pathname, method, res);
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
