// TST-0001 — the sidecar client reads what Deck needs and has no way to write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load, fakeSidecar, HEALTH, navPayload, item } from './helpers.mjs';

const { SidecarClient, SidecarError, cardsFromNav } = load('shared/sidecar-client.js');
const { describeWorkspace, detectKind, workspaceIdFor, WorkspaceBook } = load('main/workspaces.js');

const ROUTES = {
  '/healthz': HEALTH,
  '/api/cockpit/identity': { root: '/repo', docs_root: '/repo/docs', pid: 42 },
  '/api/cockpit/nav': navPayload([item('FEAT-0002', 'The shell', 'doing', 'feature')]),
  '/api/render': { schema_version: 4, rel_path: 'features/a.md', title: 'The shell', html: '<h1>The shell</h1>', frontmatter: { id: 'FEAT-0002' } },
  '/api/cockpit/stats': { schema_version: 4, scope: null, hero: { features: 7 } },
};

test('every read returns the shape Deck depends on', async () => {
  const sidecar = await fakeSidecar(ROUTES);
  try {
    const client = new SidecarClient(sidecar.base);
    const health = await client.health();
    assert.equal(health.service, 'project-os-cockpit');
    assert.equal(health.ok, true);

    const identity = await client.identity();
    assert.equal(identity.root, '/repo');

    const nav = await client.nav('features');
    assert.equal(nav.groups.length, 2);
    assert.equal(nav.groups[0].needsHuman, true);
    assert.equal(nav.groups[0].items[0].owed, true);

    const note = await client.note('features/a.md');
    assert.equal(note.title, 'The shell');
    assert.match(note.html, /<h1>/);

    const stats = await client.stats();
    assert.deepEqual(stats.hero, { features: 7 });
  } finally {
    await sidecar.close();
  }
});

test('the sidecar only ever sees GET', async () => {
  const sidecar = await fakeSidecar(ROUTES);
  try {
    const client = new SidecarClient(sidecar.base);
    await client.health();
    await client.identity();
    await client.nav('features');
    await client.note('features/a.md');
    await client.stats();
    assert.deepEqual([...new Set(sidecar.received.map((r) => r.method))], ['GET']);
  } finally {
    await sidecar.close();
  }
});

test('the client exposes no method that could write', () => {
  const names = Object.getOwnPropertyNames(SidecarClient.prototype);
  const writeish = names.filter((n) => /post|put|patch|delete|write|create|update|transition|tick|dispatch/i.test(n));
  assert.deepEqual(writeish, []);
  const client = new SidecarClient('http://127.0.0.1:1');
  for (const name of names) {
    if (name === 'constructor') continue;
    assert.equal(typeof client[name], 'function');
  }
});

test('a response missing a field Deck needs is an error that names the field', async () => {
  const sidecar = await fakeSidecar({ ...ROUTES, '/api/render': { rel_path: 'a.md', title: 'x' } });
  try {
    const client = new SidecarClient(sidecar.base);
    await assert.rejects(() => client.note('a.md'), (err) => {
      assert.ok(err instanceof SidecarError);
      assert.match(err.message, /"html"/);
      return true;
    });
  } finally {
    await sidecar.close();
  }
});

test('a nav payload with no groups is refused rather than shown as an empty view', async () => {
  const sidecar = await fakeSidecar({ ...ROUTES, '/api/cockpit/nav': { schema_version: 4, mode: 'features' } });
  try {
    await assert.rejects(() => new SidecarClient(sidecar.base).nav('features'), /groups/);
  } finally {
    await sidecar.close();
  }
});

test('the sidecar refusing a note is reported with its own reason', async () => {
  const sidecar = await fakeSidecar({ ...ROUTES, '/api/render': { ok: false, error: 'not under the docs root' } });
  try {
    await assert.rejects(() => new SidecarClient(sidecar.base).note('../etc/passwd'), /not under the docs root/);
  } finally {
    await sidecar.close();
  }
});

test('an answer that is not JSON, and a status that is not 200, are both described', async () => {
  const sidecar = await fakeSidecar({ '/healthz': 'this is not json', '/api/cockpit/stats': null });
  try {
    const client = new SidecarClient(sidecar.base);
    await assert.rejects(() => client.health(), /not JSON/);
    await assert.rejects(() => client.stats(), /answered 500/);
    await assert.rejects(() => client.identity(), /answered 404/);
  } finally {
    await sidecar.close();
  }
});

test('a sidecar that is not there produces an error, not a crash', async () => {
  const client = new SidecarClient('http://127.0.0.1:9', { timeoutMs: 500 });
  await assert.rejects(() => client.health(), (err) => {
    assert.ok(err instanceof SidecarError);
    assert.match(err.message, /did not answer/);
    return true;
  });
});

test('a sidecar that never answers gives up rather than hanging', async () => {
  const { createServer } = await import('node:http');
  const server = createServer((req, res) => {
    // Deliberately never responds. The handlers are here because the client
    // aborts this request, and an unhandled 'error' on either side would take
    // the whole run down rather than fail a test.
    req.on('error', () => {});
    res.on('error', () => {});
  });
  server.on('clientError', () => {});
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const client = new SidecarClient(`http://127.0.0.1:${server.address().port}`, { timeoutMs: 250 });
    await assert.rejects(() => client.health(), /did not answer/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

test('cardsFromNav shows each note once, even when several groups carry it', () => {
  const payload = navPayload([item('FEAT-0002', 'a', 'doing', 'feature'), item('FEAT-0003', 'b', 'planned', 'feature')]);
  const client = new SidecarClient('http://127.0.0.1:1');
  assert.equal(typeof client.nav, 'function');
  const cards = cardsFromNav({
    mode: 'features',
    groups: payload.groups.map((g) => ({
      key: g.key,
      label: g.label,
      status: null,
      needsHuman: g.needs_human === true,
      suppressed: false,
      items: g.items.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        url: i.url,
        subtitle: null,
        noteType: i.type,
        owed: i.owed === true,
        children: [],
      })),
    })),
  });
  assert.deepEqual(cards.map((c) => c.noteId), ['FEAT-0002', 'FEAT-0003']);
});

// --- workspace discovery -----------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deck-ws-'));
}

test('a directory carrying SNAPSHOT.yaml is a project-os workspace', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.yaml'), 'project:\n  name: "a repo"\n  id: repo\n');
  const workspace = describeWorkspace(dir);
  assert.equal(workspace.kind, 'project-os');
  assert.equal(workspace.name, 'a repo');
  assert.equal(workspace.id, workspaceIdFor(dir));
});

test('a directory carrying .obsidian is a vault', () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, '.obsidian'));
  assert.equal(detectKind(dir), 'vault');
  assert.equal(describeWorkspace(dir).name, path.basename(dir));
});

test('a directory carrying neither marker is refused, with the reason', () => {
  const dir = tmpDir();
  assert.equal(detectKind(dir), null);
  assert.equal(describeWorkspace(dir), null);
  const book = new WorkspaceBook(path.join(tmpDir(), 'book.json'));
  const result = book.add(dir);
  assert.equal(result.ok, false);
  assert.match(result.reason, /SNAPSHOT\.yaml/);
});

test('added workspaces are remembered between runs, and re-read from disk', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.yaml'), 'project:\n  name: "first name"\n');
  const file = path.join(tmpDir(), 'book.json');
  const first = new WorkspaceBook(file);
  assert.equal(first.add(dir).ok, true);
  assert.equal(first.list().length, 1);

  // A name changed on disk is picked up, because the book stores roots only.
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.yaml'), 'project:\n  name: "second name"\n');
  const second = new WorkspaceBook(file);
  assert.equal(second.list()[0].name, 'second name');

  // A workspace whose marker is gone drops out rather than being listed dead.
  fs.rmSync(path.join(dir, 'SNAPSHOT.yaml'));
  assert.deepEqual(new WorkspaceBook(file).list(), []);
});

// --- reusing a sidecar rather than starting a second one (RISK-0001) ----

const { SidecarSupervisor, freePort, defaultPython, discoveryUrl } = load('main/sidecar.js');

/**
 * An interpreter that certainly exists and certainly exits: node, handed the
 * sidecar's Python arguments, refuses them and stops. Pointing these tests at
 * a path that does not exist made them depend on how each platform reports a
 * failed spawn, which is not what they are about.
 */
const FAILING_INTERPRETER = process.execPath;

function workspaceAt(dir, name = 'a repo') {
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.yaml'), `project:\n  name: "${name}"\n`);
  return describeWorkspace(dir);
}

test('a sidecar already running for this workspace is reused, not duplicated', async () => {
  const dir = tmpDir();
  const workspace = workspaceAt(dir);
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/cockpit/identity': { root: dir, docs_root: path.join(dir, 'docs'), pid: 1 },
  });
  try {
    fs.mkdirSync(path.join(dir, '.cockpit'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.cockpit', 'url'), `${sidecar.base}\n`);

    // If it tried to spawn, this interpreter would fail immediately.
    const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
    const handle = await supervisor.resolve(workspace);
    assert.equal(handle.base, sidecar.base);
    assert.equal(handle.ownedByDeck, false, 'a borrowed sidecar must not be marked as ours');

    // And stopping does not kill a sidecar Deck did not start.
    supervisor.stopAll();
    const stillAlive = await fetch(`${sidecar.base}/healthz`);
    assert.equal(stillAlive.status, 200);
  } finally {
    await sidecar.close();
  }
});

test('a sidecar serving a different repository is not borrowed', async () => {
  const dir = tmpDir();
  const workspace = workspaceAt(dir);
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/cockpit/identity': { root: '/some/other/repo', docs_root: '/some/other/repo/docs', pid: 1 },
  });
  try {
    fs.mkdirSync(path.join(dir, '.cockpit'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.cockpit', 'url'), `${sidecar.base}\n`);
    const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
    // Refusing to borrow it, it tries to start one, and that fails loudly.
    await assert.rejects(() => supervisor.resolve(workspace));
    assert.equal(supervisor.handle(workspace.id), null);
  } finally {
    await sidecar.close();
  }
});

test('the discovery file is read, and nothing unusable is taken from it', () => {
  const dir = tmpDir();
  assert.equal(discoveryUrl(dir), null, 'no file at all');

  fs.mkdirSync(path.join(dir, '.cockpit'), { recursive: true });
  const write = (text) => fs.writeFileSync(path.join(dir, '.cockpit', 'url'), text);

  write('');
  assert.equal(discoveryUrl(dir), null, 'an empty file');
  write('not a url at all\n');
  assert.equal(discoveryUrl(dir), null, 'prose');
  write('ftp://127.0.0.1:8765\n');
  assert.equal(discoveryUrl(dir), null, 'a scheme Deck does not speak');
  write('  \n');
  assert.equal(discoveryUrl(dir), null, 'whitespace');
  write('http://127.0.0.1:8765\n');
  assert.equal(discoveryUrl(dir), 'http://127.0.0.1:8765', 'a plain address');
  write('http://127.0.0.1:8765/\n');
  assert.equal(discoveryUrl(dir), 'http://127.0.0.1:8765', 'a trailing slash is dropped');
});

test('a stale discovery file is ignored rather than trusted', async () => {
  const dir = tmpDir();
  const workspace = workspaceAt(dir);
  const port = await freePort(8990, 8999);
  fs.mkdirSync(path.join(dir, '.cockpit'), { recursive: true });
  // Nothing is listening on that port: the file outlived its sidecar.
  fs.writeFileSync(path.join(dir, '.cockpit', 'url'), `http://127.0.0.1:${port}\n`);
  const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
  await assert.rejects(() => supervisor.resolve(workspace));
});

test('a discovery file with rubbish in it is ignored', async () => {
  const dir = tmpDir();
  const workspace = workspaceAt(dir);
  fs.mkdirSync(path.join(dir, '.cockpit'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cockpit', 'url'), 'not a url at all\n');
  const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
  await assert.rejects(() => supervisor.resolve(workspace));
});

test('a port held on every interface is not offered for every interface', async () => {
  // ISS-0002. A probe that binds loopback says a port is free while another
  // process holds it on 0.0.0.0, and the caller then fails with EADDRINUSE at
  // the moment it tries to serve. The interface has to be part of the question.
  const { createServer } = await import('node:http');
  const port = await freePort(8900, 8999, '0.0.0.0');
  const blocker = createServer(() => {});
  await new Promise((r) => blocker.listen(port, '0.0.0.0', r));
  try {
    const forAll = await freePort(port, port + 5, '0.0.0.0');
    assert.notEqual(forAll, port, 'a port already held on 0.0.0.0 was offered for 0.0.0.0');

    // And the port really is unusable there, which is the thing the caller hits.
    await assert.rejects(
      () => new Promise((resolve, reject) => {
        const s = createServer(() => {});
        s.once('error', reject);
        s.listen(port, '0.0.0.0', () => s.close(resolve));
      }),
      /EADDRINUSE/,
    );
  } finally {
    await new Promise((r) => blocker.close(r));
  }
});

test('a free port is one nothing is listening on', async () => {
  const port = await freePort(8900, 8999);
  assert.ok(port >= 8900 && port <= 8999);
  const { createServer } = await import('node:http');
  const blocker = createServer(() => {});
  await new Promise((r) => blocker.listen(port, '127.0.0.1', r));
  try {
    const next = await freePort(port, port + 5);
    assert.notEqual(next, port, 'a port in use was handed out as free');
  } finally {
    await new Promise((r) => blocker.close(r));
  }
});

test('the interpreter defaults to something, and honours DECK_PYTHON', () => {
  const before = process.env.DECK_PYTHON;
  try {
    process.env.DECK_PYTHON = '/opt/python/bin/python3';
    assert.equal(defaultPython(), '/opt/python/bin/python3');
    delete process.env.DECK_PYTHON;
    assert.ok(defaultPython().length > 0);
  } finally {
    if (before === undefined) delete process.env.DECK_PYTHON;
    else process.env.DECK_PYTHON = before;
  }
});


test('a sidecar Deck started is stopped when it is forgotten, never orphaned', () => {
  // `forget` runs when a sidecar stops answering. Dropping the handle for one
  // Deck started would leave the process running with nothing holding it: the
  // shutdown at quit iterates this map.
  const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
  const signals = [];
  supervisor.records.set('ours', {
    workspaceId: 'ours',
    base: 'http://127.0.0.1:1',
    ownedByDeck: true,
    process: { kill: (sig) => signals.push(sig), once: () => {} },
    stderrTail: [],
  });
  supervisor.forget('ours');
  assert.deepEqual(signals, ['SIGTERM'], 'a sidecar Deck started was dropped without being stopped');
  assert.equal(supervisor.handle('ours'), null);

  const borrowedSignals = [];
  supervisor.records.set('theirs', {
    workspaceId: 'theirs',
    base: 'http://127.0.0.1:2',
    ownedByDeck: false,
    process: { kill: (sig) => borrowedSignals.push(sig), once: () => {} },
    stderrTail: [],
  });
  supervisor.forget('theirs');
  assert.deepEqual(borrowedSignals, [], 'a sidecar Deck borrowed was killed');
  assert.equal(supervisor.handle('theirs'), null);
});

test('stopping everything reaches a sidecar Deck started', () => {
  const supervisor = new SidecarSupervisor(FAILING_INTERPRETER);
  const signals = [];
  supervisor.records.set('ours', {
    workspaceId: 'ours',
    base: 'http://127.0.0.1:1',
    ownedByDeck: true,
    process: { kill: (sig) => signals.push(sig), once: () => {} },
    stderrTail: [],
  });
  supervisor.stopAll();
  assert.deepEqual(signals, ['SIGTERM']);
});
