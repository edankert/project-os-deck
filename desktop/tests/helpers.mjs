// Shared scaffolding for the Deck suites.
//
// The tests run against the BUILT modules in dist/, not against the TypeScript
// sources, and against real HTTP servers rather than string-matched source.
// A guard shaped like `assert source.includes("GET")` survives the rename that
// breaks the behaviour it claims to protect.
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const desktopRoot = path.join(here, '..');
export const require = createRequire(import.meta.url);

export function load(relative) {
  return require(path.join(desktopRoot, 'dist', relative));
}

/**
 * A stand-in for the cockpit's sidecar that records every request it receives,
 * so a test can assert that something never arrived.
 */
export async function fakeSidecar(routes = {}) {
  const received = [];
  const server = http.createServer((req, res) => {
    received.push({ method: req.method, url: req.url });
    const url = new URL(req.url, 'http://fake.invalid');
    const route = routes[url.pathname];
    if (route === undefined) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'no such route' }));
      return;
    }
    const body = typeof route === 'function' ? route(url) : route;
    if (body === null) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('boom');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    received,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export const HEALTH = { ok: true, service: 'project-os-cockpit', schema: 4, docs_root: '/repo/docs' };

export function navPayload(items) {
  return {
    schema_version: 4,
    mode: 'features',
    groups: [
      {
        key: 'needs-you',
        label: 'Needs you',
        status: null,
        needs_human: true,
        items: items.slice(0, 1).map((i) => ({ ...i, owed: true })),
      },
      { key: 'main', label: 'Everything', status: null, items },
    ],
  };
}

export function item(id, title, status, type, url) {
  return { id, title, status, type, url: url ?? `docs/${id}.md`, subtitle: null };
}
