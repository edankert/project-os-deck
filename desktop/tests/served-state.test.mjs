// TST-0039 — the served page follows the store by reading it, and every write
// to the two new routes is refused (TASK-0057).
//
// Until TASK-0057 a page served by Deck's host kept a fresh local state, so a
// tablet showed its own desk and never saw a note lifted on the Mac. Found by
// reading the code in the phase review of 2026-09-10; no walk had asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import { load, desktopRoot, fakeSidecar, HEALTH } from './helpers.mjs';

const { DeckHost } = load('main/host.js');
const { SERVED_CAPABILITIES } = load('shared/capability.js');
const { servedState, mergeServed, TABLET_LOCAL_ACTIONS } = load('shared/served-state.js');
const { initialState, reduce, deskCardsOf } = load('shared/store-state.js');

const WEB_ROOT = path.join(desktopRoot, 'dist', 'web');
const OPEN = { id: 'aaaa1111', root: '/repo', name: 'open', kind: 'project-os' };
const CLOSED = { id: 'bbbb2222', root: '/other', name: 'closed', kind: 'project-os' };

function macState() {
  let state = initialState();
  state = reduce(state, { type: 'set-actor', actor: 'user:someone' });
  state = reduce(state, { type: 'open-workspace', workspaceId: CLOSED.id });
  state = reduce(state, { type: 'select-view', viewId: 'issues' });
  state = reduce(state, { type: 'put-on-desk', noteId: 'ISS-0009', x: 10, y: 10 });
  // One note on every view in the closed workspace too, so both desk maps
  // have something the filter must leave out (FEAT-0015).
  state = reduce(state, { type: 'set-every-view', noteId: 'ISS-0009', on: true });
  state = reduce(state, { type: 'save-desk', name: 'secret' });
  state = reduce(state, { type: 'pull', noteId: 'ISS-0009' });
  state = reduce(state, { type: 'open-workspace', workspaceId: OPEN.id });
  state = reduce(state, { type: 'select-view', viewId: 'issues' });
  state = reduce(state, { type: 'put-on-desk', noteId: 'FEAT-0002', x: 20, y: 30 });
  state = reduce(state, { type: 'focus-note', noteId: 'FEAT-0002' });
  state = reduce(state, { type: 'push', noteId: 'TASK-0001' });
  return state;
}

test('the served state leaves out the name Deck writes with and every workspace with no sidecar', () => {
  const served = servedState(macState(), new Set([OPEN.id]));
  assert.equal(served.actor, '', 'the actor belongs to the shell, the only host that writes');
  assert.deepEqual(Object.keys(served.deskCards), [], 'the closed workspace’s notes on every view are not described');
  assert.deepEqual(Object.keys(served.viewDesks), [OPEN.id], 'nor are its views’ desks');
  assert.deepEqual(Object.values(served.desks), [], 'a desk saved in a closed workspace is not described');
  assert.equal(CLOSED.id in served.session.pulled, false, 'the pull was made in the closed workspace');
  assert.deepEqual(served.session.pushed[OPEN.id], ['TASK-0001']);
  assert.equal(served.workspaceId, OPEN.id);
  assert.equal(served.noteId, 'FEAT-0002');
});

test('a Mac whose current workspace has no sidecar tells the network nothing about where it is', () => {
  let state = macState();
  state = reduce(state, { type: 'open-workspace', workspaceId: CLOSED.id });
  const served = servedState(state, new Set([OPEN.id]));
  assert.equal(served.workspaceId, null);
  assert.equal(served.viewId, null);
  assert.equal(served.noteId, null);
});

test("a tablet keeps its own view and surface, and takes the Mac's desk", () => {
  const remote = servedState(macState(), new Set([OPEN.id]));
  let own = initialState();
  own = reduce(own, { type: 'open-workspace', workspaceId: OPEN.id });
  own = reduce(own, { type: 'select-view', viewId: 'features' });
  own = reduce(own, { type: 'select-surface', surface: 'spread' });
  const drawn = mergeServed(remote, own, false);
  assert.equal(drawn.viewId, 'features', "a view switch on the Mac does not move the tablet's view");
  assert.equal(drawn.surface, 'spread');
  assert.equal(drawn.noteId, null, 'with follow off, the Mac focusing a note does not move the tablet');
  // The desk of the Mac's CURRENT view, Issues, though the tablet browses
  // Features: a throw to the tablet lands there (FEAT-0015, decision 13).
  assert.deepEqual(
    deskCardsOf(drawn, OPEN.id).map((c) => c.noteId),
    ['FEAT-0002'],
    'the desk is the Mac’s',
  );
});

test("with follow on, the tablet takes the Mac's workspace, view and note", () => {
  const remote = servedState(macState(), new Set([OPEN.id]));
  let own = reduce(initialState(), { type: 'select-view', viewId: 'features' });
  const drawn = mergeServed(remote, own, true);
  assert.equal(drawn.viewId, 'issues');
  assert.equal(drawn.noteId, 'FEAT-0002');
  assert.equal(drawn.workspaceId, OPEN.id);
});

test('a tablet applies only the actions that change what it keeps for itself', () => {
  for (const type of ['put-on-desk', 'take-off-desk', 'move-card', 'clear-desk', 'save-desk', 'pull', 'push', 'let-go', 'resize-card', 'raise-card', 'widen-card', 'set-actor']) {
    assert.equal(TABLET_LOCAL_ACTIONS.has(type), false, `${type} would change the Mac's state`);
  }
  for (const type of ['select-view', 'select-surface', 'focus-note', 'set-query']) {
    assert.equal(TABLET_LOCAL_ACTIONS.has(type), true);
  }
});

async function standUp(state) {
  const sidecar = await fakeSidecar({ '/healthz': HEALTH });
  const subscribers = new Set();
  let current = state;
  const host = new DeckHost({
    webRoot: WEB_ROOT,
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [OPEN, CLOSED],
    sidecarBaseFor: (id) => (id === OPEN.id ? sidecar.base : null),
    state: () => current,
    subscribeState: (fn) => {
      subscribers.add(fn);
      fn(current);
      return () => subscribers.delete(fn);
    },
  });
  const { port } = await host.listen(0);
  const broadcast = (next) => {
    current = next;
    for (const fn of [...subscribers]) fn(next);
  };
  return { host, sidecar, origin: `http://127.0.0.1:${port}`, broadcast, subscribers };
}

test('GET /deck/state answers with the served state', async () => {
  const { host, sidecar, origin } = await standUp(macState());
  try {
    const response = await fetch(`${origin}/deck/state`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.actor, '');
    assert.deepEqual(Object.keys(body.viewDesks), [OPEN.id]);
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('every method that is not a read is refused on both routes, and HEAD is answered', async () => {
  const { host, sidecar, origin } = await standUp(macState());
  try {
    for (const route of ['/deck/state', '/deck/events']) {
      for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
        const response = await fetch(`${origin}${route}`, { method, body: method === 'OPTIONS' ? undefined : '{}' });
        assert.equal(response.status, 405, `${method} ${route} answered ${response.status}`);
        assert.equal(response.headers.get('allow'), 'GET, HEAD');
      }
      const head = await fetch(`${origin}${route}`, { method: 'HEAD' });
      assert.equal(head.status, 200, `HEAD ${route}`);
    }
  } finally {
    await host.close();
    await sidecar.close();
  }
});

/** Read server-sent events until `until` says stop, with a deadline. */
function readEvents(url, until, deadlineMs = 2000) {
  return new Promise((resolve, reject) => {
    const events = [];
    const request = http.get(url, (response) => {
      let buffer = '';
      response.setEncoding('utf-8');
      response.on('data', (chunk) => {
        buffer += chunk;
        let at;
        while ((at = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, at);
          buffer = buffer.slice(at + 2);
          const data = block.split('\n').find((line) => line.startsWith('data: '));
          if (data !== undefined) events.push({ at: Date.now(), state: JSON.parse(data.slice(6)) });
          if (until(events)) {
            request.destroy();
            resolve(events);
            return;
          }
        }
      });
    });
    request.on('error', () => {});
    setTimeout(() => {
      request.destroy();
      reject(new Error(`only ${events.length} events arrived`));
    }, deadlineMs);
  });
}

test('the event stream sends the state at once, and a change within a second of the broadcast', async () => {
  const start = macState();
  const { host, sidecar, origin, broadcast } = await standUp(start);
  try {
    let sentAt = 0;
    const events = await readEvents(`${origin}/deck/events`, (list) => {
      if (list.length === 1) {
        sentAt = Date.now();
        broadcast(reduce(start, { type: 'put-on-desk', noteId: 'TASK-0057', x: 1, y: 1 }));
      }
      return list.length >= 2;
    });
    assert.deepEqual(deskCardsOf(events[0].state, OPEN.id).map((c) => c.noteId), ['FEAT-0002']);
    assert.deepEqual(deskCardsOf(events[1].state, OPEN.id).map((c) => c.noteId), ['FEAT-0002', 'TASK-0057']);
    assert.ok(events[1].at - sentAt < 1000, `the change took ${events[1].at - sentAt}ms`);
    assert.equal(events[1].state.actor, '', 'the stream is filtered the same way as the read');
  } finally {
    await host.close();
    await sidecar.close();
  }
});

test('the host counts the pages following it, and closing it does not wait for them', async () => {
  const { host, sidecar, origin, subscribers } = await standUp(macState());
  const request = http.get(`${origin}/deck/events`);
  request.on('error', () => {});
  try {
    for (let i = 0; i < 40 && host.followers() === 0; i += 1) await new Promise((r) => setTimeout(r, 25));
    assert.equal(host.followers(), 1);
    assert.equal(subscribers.size, 1);
    const closed = host.close().then(() => 'closed');
    const timeout = new Promise((r) => setTimeout(() => r('hung'), 1500));
    assert.equal(await Promise.race([closed, timeout]), 'closed', 'an open event stream held the host open');
    assert.equal(host.followers(), 0);
  } finally {
    request.destroy();
    await sidecar.close();
  }
});

test('a host with no store answers both routes 404 rather than an empty state', async () => {
  const sidecar = await fakeSidecar({ '/healthz': HEALTH });
  const host = new DeckHost({
    webRoot: WEB_ROOT,
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [OPEN],
    sidecarBaseFor: () => sidecar.base,
  });
  const { port } = await host.listen(0);
  try {
    assert.equal((await fetch(`http://127.0.0.1:${port}/deck/state`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${port}/deck/events`)).status, 404);
  } finally {
    await host.close();
    await sidecar.close();
  }
});
