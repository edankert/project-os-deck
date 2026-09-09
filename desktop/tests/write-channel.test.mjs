// TST-0033 — the write channel exists in the shell and not when served
// (FEAT-0013: TASK-0047 to TASK-0051).
//
// The rule with no condition attached: the tablet does not write. Edwin,
// 2026-09-08. A write travels the preload bridge, which a served page does not
// have, so `write: false` there is a statement of fact as well as a decision —
// and Deck's HTTP host still answers 405 to every method that is not a read,
// on every path, so nothing can be forwarded round it (ADR-0003).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { desktopRoot, fakeSidecar, HEALTH, load } from './helpers.mjs';

const { SidecarWriteClient, WriteRefused, actuatorRows, wordRefusal, transitionRequestFrom, tickRequestFrom } =
  load('shared/write-client.js');
const { SHELL_CAPABILITIES, SERVED_CAPABILITIES, normaliseCapabilities, can } = load('shared/capability.js');
const { SidecarClient } = load('shared/sidecar-client.js');
const { DeckHost, isForwardable } = load('main/host.js');
const { initialState, normaliseState, reduce, isRendererAction } = load('shared/store-state.js');

/** A sidecar that records what reached it, and answers what it is told to. */
async function writingSidecar(answers = {}) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('error', () => {});
    req.on('end', () => {
      const url = new URL(req.url, 'http://fake.invalid');
      seen.push({
        method: req.method,
        path: url.pathname,
        remote: req.socket.remoteAddress,
        body: body === '' ? null : JSON.parse(body),
      });
      const answer = answers[url.pathname];
      const value = typeof answer === 'function' ? answer() : answer;
      if (value === undefined) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'no such route' }));
        return;
      }
      res.writeHead(value.status ?? 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value.payload ?? { ok: true, result: {} }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    seen,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// ---- the channel ----

test('a write reaches the sidecar as a POST from loopback, carrying what Deck built', async () => {
  const sidecar = await writingSidecar({ '/api/notes/transition': { payload: { ok: true, result: { to: 'open' } } } });
  try {
    const client = new SidecarWriteClient(sidecar.base);
    const result = await client.transition({ id: 'ISS-0001', to: 'open', actor: 'user:someone', mtime: 1757000000.5 });
    assert.deepEqual(result, { to: 'open' });
    const sent = sidecar.seen.at(-1);
    assert.equal(sent.method, 'POST');
    assert.equal(sent.path, '/api/notes/transition');
    assert.match(sent.remote, /127\.0\.0\.1|::ffff:127\.0\.0\.1/, 'the request did not arrive from loopback');
    assert.deepEqual(sent.body, { id: 'ISS-0001', to: 'open', actor: 'user:someone', mtime: 1757000000.5 });
  } finally {
    await sidecar.close();
  }
});

test('the reason for a decision reaches the sidecar, and so does the severity (ISS-0037)', async () => {
  // **The defect this replaces was silence, not a wrong answer.** The IPC
  // handler built its request field by field from a list, `note` and
  // `severity` were not on it, and the sidecar writes its `## Decision record`
  // callout only when prose arrives — so a Decline made in Deck moved the
  // status and recorded no grounds, and nothing anywhere said so. Driven
  // through the mapping the handler now uses, over a real request, so deleting
  // a field turns this red.
  const sidecar = await writingSidecar({ '/api/notes/transition': { payload: { ok: true, result: {} } } });
  try {
    const client = new SidecarWriteClient(sidecar.base);
    await client.transition(
      transitionRequestFrom(
        {
          workspaceId: 'aaaa1111',
          id: 'ISS-0008',
          to: 'open',
          mtime: 1757000000.5,
          note: 'Real, and now. The renderer has no check at all in CI.',
          severity: 'high',
          // A window may not name the writer; the shell does.
          actor: 'user:somebody-else',
        },
        'user:edwin',
      ),
    );
    assert.deepEqual(sidecar.seen.at(-1).body, {
      id: 'ISS-0008',
      to: 'open',
      actor: 'user:edwin',
      mtime: 1757000000.5,
      severity: 'high',
      note: 'Real, and now. The renderer has no check at all in CI.',
    });
  } finally {
    await sidecar.close();
  }
});

test('a decision made without a reason sends no reason, so the sidecar writes no empty callout', () => {
  // The cockpit does not require prose and Deck must not be stricter than the
  // surface it shares a file with, so the blank box is a real answer.
  const built = transitionRequestFrom({ id: 'ISS-0008', to: 'open', note: '', severity: '' }, 'user:edwin');
  assert.deepEqual(built, { id: 'ISS-0008', to: 'open', actor: 'user:edwin' });
});

test('a tick built from a window carries the criterion and never the window\'s idea of who is writing', () => {
  const built = tickRequestFrom(
    { id: 'FEAT-0013', criterion: 'a criterion', evidence: 'walked', actor: 'user:nobody', mtime: 2 },
    'user:edwin',
  );
  assert.deepEqual(built, {
    id: 'FEAT-0013',
    criterion: 'a criterion',
    evidence: 'walked',
    actor: 'user:edwin',
    mtime: 2,
  });
});

test('a tick carries the criterion, the evidence, the actor and the modification time', async () => {
  const sidecar = await writingSidecar({ '/api/notes/tick': { payload: { ok: true, result: {} } } });
  try {
    await new SidecarWriteClient(sidecar.base).tick({
      id: 'FEAT-0013',
      criterion: 'A criterion ticked in Deck is ticked in the file',
      evidence: 'walked 2026-09-09',
      actor: 'user:someone',
      mtime: 1757000000.5,
    });
    assert.deepEqual(sidecar.seen.at(-1).body, {
      id: 'FEAT-0013',
      criterion: 'A criterion ticked in Deck is ticked in the file',
      evidence: 'walked 2026-09-09',
      actor: 'user:someone',
      // Every time: it is the only guard against ticking a note that changed
      // since the page was rendered.
      mtime: 1757000000.5,
    });
  } finally {
    await sidecar.close();
  }
});

test("a refusal comes back as the sidecar worded it, not as a generic failure", async () => {
  const sidecar = await writingSidecar({
    '/api/notes/tick': {
      status: 409,
      payload: { ok: false, error: 'note changed on disk since it was read — reload and retry' },
    },
  });
  try {
    await assert.rejects(
      new SidecarWriteClient(sidecar.base).tick({ id: 'X', criterion: 'c', evidence: 'e', actor: 'a' }),
      (err) => {
        assert.ok(err instanceof WriteRefused);
        assert.equal(err.message, 'note changed on disk since it was read — reload and retry');
        assert.equal(err.status, 409);
        return true;
      },
    );
  } finally {
    await sidecar.close();
  }
});

test('the READ client still never writes, which is a narrower claim than it was', async () => {
  // TST-0001 asserts only GET ever reaches a fake sidecar from that client.
  // That claim is unchanged and now has a named exception beside it: the write
  // methods are a separate module, used only from the main process.
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/notes/actions': { id: 'ISS-0001', actions: [] },
  });
  try {
    const client = new SidecarClient(sidecar.base);
    await client.health();
    await client.actions('ISS-0001');
    assert.deepEqual([...new Set(sidecar.received.map((r) => r.method))], ['GET']);
    // And it has no method that could write, by name.
    for (const name of ['transition', 'tick', 'post', 'write', 'put', 'delete']) {
      assert.equal(typeof client[name], 'undefined', `the read client has a "${name}" method`);
    }
  } finally {
    await sidecar.close();
  }
});

/**
 * Every built module, with its comments removed.
 *
 * The comments have to go, or a search for a thing finds the paragraph
 * explaining why that thing must not be there — which is exactly what happened
 * to the first version of the name search below.
 */
function builtModules() {
  const dir = path.join(desktopRoot, 'dist');
  const out = [];
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      const source = fs
        .readFileSync(full, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      out.push({ rel: path.relative(dir, full), source });
    }
  };
  walk(dir);
  return out;
}

const IS_WRITE_CLIENT = (rel) =>
  rel === path.join('shared', 'write-client.js') || rel === path.join('web', 'shared', 'write-client.js');

test('no write leaves Deck except through the write client', () => {
  // A POST to Deck's OWN host is not a write — the smoke run sends several, to
  // check that the host refuses them with 405. What would be a write is a POST
  // to the sidecar, and the sidecar's paths all begin `/api/`. So the rule is:
  // a module outside the write client may not both send a POST and name an
  // `/api/` path.
  const offenders = builtModules()
    .filter(({ rel }) => !IS_WRITE_CLIENT(rel))
    .filter(({ source }) => /method:\s*['"]POST['"]/.test(source) && /['"`]\/api\//.test(source))
    .map(({ rel }) => rel);
  assert.deepEqual(offenders, [], 'these modules POST to the sidecar without going through the write client');
});

// ---- the capability ----

test('the capability set carries write: true in the shell, false when served', () => {
  assert.equal(SHELL_CAPABILITIES.write, true);
  assert.equal(SERVED_CAPABILITIES.write, false);
  assert.equal(can(SHELL_CAPABILITIES, 'write'), true);
  assert.equal(can(SERVED_CAPABILITIES, 'write'), false);
  // A host that says nothing about writing is not granting permission.
  assert.equal(normaliseCapabilities({}).write, false);
  assert.equal(normaliseCapabilities({ write: 'yes' }).write, false);
  assert.equal(normaliseCapabilities(null).write, false);
});

test('the served host reports no write capability, over real HTTP', async () => {
  const host = new DeckHost({
    webRoot: path.join(desktopRoot, 'dist', 'web'),
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [],
    sidecarBaseFor: () => null,
  });
  const { port } = await host.listen(0);
  try {
    const caps = await (await fetch(`http://127.0.0.1:${port}/deck/capabilities`)).json();
    assert.equal(caps.write, false);
  } finally {
    await host.close();
  }
});

test('the renderer offers no verb when write is false, and the served page cannot reach one', () => {
  // Two halves of one claim. The renderer's controls are behind
  // `capabilities().write`, and the bridge those controls would use does not
  // exist on a served page at all.
  const renderer = fs.readFileSync(path.join(desktopRoot, 'dist', 'web', 'renderer', 'renderer.js'), 'utf-8');
  assert.match(renderer, /capabilities\(\)\.write/, 'the verbs are not behind the capability');
  const bridge = fs.readFileSync(path.join(desktopRoot, 'dist', 'web', 'renderer', 'host-bridge.js'), 'utf-8');
  assert.match(bridge, /this\.caps\.write/, 'the bridge does not check the capability');
});

test('every method that is not a read is still 405, on every path', async () => {
  const host = new DeckHost({
    webRoot: path.join(desktopRoot, 'dist', 'web'),
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [],
    sidecarBaseFor: () => null,
  });
  const { port } = await host.listen(0);
  const origin = `http://127.0.0.1:${port}`;
  try {
    const paths = [
      '/',
      '/deck/capabilities',
      '/deck/workspaces',
      '/deck/records/aaaa1111',
      '/deck/sidecar/aaaa1111/api/notes/transition',
      '/deck/sidecar/aaaa1111/api/notes/tick',
      '/deck/sidecar/aaaa1111/api/notes/actions',
    ];
    for (const at of paths) {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const response = await fetch(`${origin}${at}`, { method });
        assert.equal(response.status, 405, `${method} ${at} was not refused`);
        assert.equal(response.headers.get('allow'), 'GET, HEAD');
      }
    }
  } finally {
    await host.close();
  }
});

test('the actions READ is forwardable and no write path is', () => {
  // A tablet may SEE that a note could be approved; what stops it acting is
  // the capability set, not a missing read.
  assert.equal(isForwardable('/api/notes/actions'), true);
  for (const at of ['/api/notes/transition', '/api/notes/tick', '/api/notes/check-toggle', '/api/notes/create']) {
    assert.equal(isForwardable(at), false, `${at} is forwardable`);
  }
});

// ---- the actor ----

test('the actor is a store field that survives a restart, and is the only source', () => {
  let state = initialState();
  assert.equal(state.actor, '', 'a name Deck made up is worse than no name');
  state = reduce(state, { type: 'set-actor', actor: 'user:someone' });
  assert.equal(state.actor, 'user:someone');
  // Written to disk and read back, unlike the index revision beside it.
  assert.equal(normaliseState(JSON.parse(JSON.stringify(state))).actor, 'user:someone');
  // Trimmed, and an empty name never replaces a real one.
  assert.equal(reduce(state, { type: 'set-actor', actor: '  ' }).actor, 'user:someone');
  assert.equal(reduce(state, { type: 'set-actor', actor: ' user:other ' }).actor, 'user:other');
  assert.equal(isRendererAction({ type: 'set-actor', actor: 'x' }), true, 'a person cannot change their own name');
});

test("no source file in Deck carries a person's name as a literal", () => {
  // The cockpit hard-codes `user:edwin` in four places in its renderer. That
  // literal cannot be copied into a second application: it would be wrong for
  // anybody else on the day they opened it.
  //
  // `user:` as a PREFIX built at run time is the point, so `user:${name}` is
  // not an offence and neither is `user:unknown`, which is what a machine that
  // will not say who is using it gets.
  const offenders = [];
  for (const { rel, source } of builtModules()) {
    for (const hit of source.match(/user:[a-z]+/g) ?? []) {
      if (hit !== 'user:unknown') offenders.push(`${rel}: ${hit}`);
    }
  }
  assert.deepEqual(offenders, [], 'these modules name a person');
});

test('a write with no name set is refused before it is sent', () => {
  // Not a default, and not the machine's name silently: the main process
  // derives one at start-up and a person can change it, but a store that has
  // somehow lost it does not invent one at the moment of writing.
  assert.equal(initialState().actor, '');
});

// ---- the actuator rows ----

test('the rows Deck draws are exactly the rows the sidecar returned, in order', () => {
  const rows = actuatorRows({
    id: 'ISS-0001',
    actions: [
      { verb: 'Accept', to: 'open', confirm: false, disabled: false, reason: '', endpoint: '' },
      { verb: 'Defer', to: 'deferred', confirm: true, disabled: false, reason: '', endpoint: '' },
      { verb: 'Decline', to: 'declined', confirm: true, disabled: true, reason: 'a policy forbids it', endpoint: '' },
    ],
  });
  assert.deepEqual(rows.map((r) => r.verb), ['Accept', 'Defer', 'Decline']);
  assert.equal(rows[1].confirm, true, 'confirmation is the ROW\'s decision, not Deck\'s');
  assert.equal(rows[2].disabled, true);
  assert.equal(rows[2].reason, 'a policy forbids it', 'a disabled row keeps the reason it carried');
  assert.deepEqual(actuatorRows({ id: 'X', actions: [] }), [], 'most notes at most times owe nobody a decision');
  assert.deepEqual(actuatorRows(null), []);
});

test('no verb name, from-state or transition rule exists in Deck', () => {
  // The whole of the cockpit's own HUMAN_TRANSITIONS table. Deck draws rows;
  // it does not know that a proposed ADR can be accepted (REQ-0026).
  const verbs = ['Approve', 'Decline', 'Accept', 'Supersede', 'Defer'];
  const offenders = [];
  for (const { rel, source } of builtModules()) {
    for (const verb of verbs) {
      if (source.includes(`'${verb}'`) || source.includes(`"${verb}"`)) offenders.push(`${rel}: ${verb}`);
    }
  }
  assert.deepEqual(offenders, [], "these modules restate the sidecar's verb table");
});

// ---- the three refusals a tick can meet ----

test('a duplicated criterion is reported as duplicate WORDING, not as an error', () => {
  // The sidecar's OWN sentence, read from `note_writes.py` and confirmed
  // against a live refusal — not a message written from memory of what such a
  // message might say, which is what the first version of this matched.
  const said = wordRefusal(
    "2 criteria on TASK-0052 read 'a criterion' — resolving one would be a guess about which",
  );
  assert.match(said, /worded the same/);
  assert.match(said, /making them different is the fix/);
  assert.match(said, /resolving one would be a guess/, 'the sidecar\'s own words were thrown away');
  assert.doesNotMatch(said, /\b(409|400|500)\b/, 'the HTTP status was shown to the person');
});

test('a criterion that matched nothing says the note has changed since it was drawn', () => {
  const said = wordRefusal("no criterion on TASK-0052 reads 'a criterion'");
  assert.match(said, /changed since this page was drawn/);
  assert.match(said, /no criterion on TASK-0052 reads/);
});

test('every other refusal is passed through exactly as the sidecar worded it', () => {
  // Including the modification-time guard, whose sentence already tells a
  // person what to do and needs nothing added to it.
  const said = 'note changed on disk since it was read — reload and retry';
  assert.equal(wordRefusal(said), said);
  assert.equal(wordRefusal('writes are loopback-only'), 'writes are loopback-only');
  assert.equal(wordRefusal('a tick needs the criterion text it resolves'), 'a tick needs the criterion text it resolves');
});

// ---- the changed-under-you mark ----

test('a change to a record raises one revision, and every window sees it', () => {
  // The signal is the index revision (TASK-0039), and the store broadcasts it
  // the way it broadcasts everything else, so a second window learns its
  // picture is old without asking anybody.
  const { DeckStore } = load('main/store.js');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-store-')), 'state.json');
  const store = new DeckStore({ file, writeDelayMs: 5 });
  const windowA = [];
  const windowB = [];
  store.subscribe((s) => windowA.push(s.indexRevisions['aaaa1111'] ?? 0));
  store.subscribe((s) => windowB.push(s.indexRevisions['aaaa1111'] ?? 0));

  store.dispatch({ type: 'index-changed', workspaceId: 'aaaa1111', revision: 4 });
  assert.equal(windowA.at(-1), 4);
  assert.equal(windowB.at(-1), 4, 'the second window did not hear about it');

  // A burst is ONE rise, because the revision is a number rather than a list
  // of files: four writes that settle together produce one mark, not four.
  const before = windowA.length;
  store.dispatch({ type: 'index-changed', workspaceId: 'aaaa1111', revision: 5 });
  assert.equal(windowA.length - before, 1);

  // Never backwards. A late broadcast from an index that has already been
  // replaced must not tell a window its picture is newer than it is.
  store.dispatch({ type: 'index-changed', workspaceId: 'aaaa1111', revision: 3 });
  assert.equal(windowA.at(-1), 5);
  // And it is per workspace: another workspace's changes are not this one's.
  store.dispatch({ type: 'index-changed', workspaceId: 'bbbb2222', revision: 9 });
  assert.equal(store.getState().indexRevisions['aaaa1111'], 5);
  assert.equal(store.getState().indexRevisions['bbbb2222'], 9);
  store.close();
});

test('the index revision is NOT carried over a restart', () => {
  // The index is rebuilt from disk at every start and its number begins again,
  // so a number carried over is one this run's index cannot honour: a window
  // comparing against it would think its picture was old when it was the
  // newest there is.
  const restored = normaliseState({ indexRevisions: { aaaa1111: 12 }, actor: 'user:someone' });
  assert.deepEqual(restored.indexRevisions, {});
  assert.equal(restored.actor, 'user:someone', 'the actor IS carried over, because a person chose it');
});

test('a window may not raise an index revision itself', () => {
  // A renderer cannot know what is on disk, and the channel a window
  // dispatches on is reachable from any page the window loads.
  assert.equal(isRendererAction({ type: 'index-changed', workspaceId: 'a', revision: 2 }), false);
});

// ---- the bridge belongs to the origin, not to the window (ISS-0029) ----

test('where a link in a Deck window may lead', () => {
  // The DECISION, driven directly. The previous version of this check searched
  // the built file for `will-navigate`, `setWindowOpenHandler` and
  // `action: 'deny'`, and passed after the condition was inverted, after
  // `preventDefault` became a no-operation, and after `allow` was returned with
  // `deny` left behind in a comment (ISS-0032). The WIRING is driven by the
  // smoke run, which makes a real page try to leave.
  const { navigationFor } = load('shared/origin.js');
  const host = 'http://127.0.0.1:7300';
  // A page Deck serves is followed, or the guard is a wall rather than a rule.
  assert.equal(navigationFor(host, `${host}/`), 'follow');
  assert.equal(navigationFor(host, `${host}/renderer/renderer.js`), 'follow');
  // An ordinary web page goes to the person's own browser, because refusing it
  // silently would make a link in a note look broken.
  assert.equal(navigationFor(host, 'https://example.test/x'), 'open-outside');
  assert.equal(navigationFor(host, 'http://example.test/x'), 'open-outside');
  // Everything else is REFUSED rather than handed to the operating system's
  // opener, which is what "open a link in the browser" does not mean.
  for (const url of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'vscode://file/etc/passwd',
    'not a url at all',
    '',
  ]) {
    assert.equal(navigationFor(host, url), 'refuse', `${url} was not refused`);
  }
  // A near-miss origin is not followed. `127.0.0.1:7300.example.test` is not
  // even a URL — the parser reads `7300.example.test` as a port and gives up —
  // so it is refused; the valid near-miss goes outside like any other page.
  assert.equal(navigationFor(host, 'http://127.0.0.1:7300.example.test/'), 'refuse');
  assert.equal(navigationFor(host, 'http://127.0.0.1.example.test:7300/'), 'open-outside');
});

test('sameOrigin compares origins, not prefixes', () => {
  // `http://127.0.0.1:7300.example.test` STARTS WITH the host origin and is
  // somebody else's machine, which is why this is not a `startsWith`.
  const { sameOriginAs } = load('shared/origin.js');
  const host = 'http://127.0.0.1:7300';
  assert.equal(sameOriginAs(host, 'http://127.0.0.1:7300/'), true);
  assert.equal(sameOriginAs(host, 'http://127.0.0.1:7300/renderer/renderer.js'), true);
  assert.equal(sameOriginAs(host, 'http://127.0.0.1:7300.example.test/'), false);
  assert.equal(sameOriginAs(host, 'http://127.0.0.1:7301/'), false);
  assert.equal(sameOriginAs(host, 'https://127.0.0.1:7300/'), false);
  assert.equal(sameOriginAs(host, 'https://example.test/'), false);
  assert.equal(sameOriginAs(host, 'file:///etc/passwd'), false);
  assert.equal(sameOriginAs(host, 'javascript:alert(1)'), false);
  assert.equal(sameOriginAs(host, 'not a url at all'), false);
  assert.equal(sameOriginAs('', 'http://127.0.0.1:7300/'), false);
});
