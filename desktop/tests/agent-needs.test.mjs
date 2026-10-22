// TST-0106 — Needs you and the cockpit's overview panels (FEAT-0034): everything waiting on
// Edwin in one panel, gathered from Deck's own sessions, the cockpit's sidecar and git, and
// the served page's narrower panel. Every session and request here is invented (RISK-0016).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { desktopRoot, load } from './helpers.mjs';

const { needsPanel, ANSWER } = load('shared/overview-needs.js');
const { waitingAgents, gitWords, unpushed } = load('shared/agent-needs.js');
const { gatherNeeds, gitState } = load('main/agents/needs.js');
const { runGit } = load('main/agents/sessions.js');
const { wheelScene } = load('shared/overview-wheel.js');
const { plainContext, walkScene } = load('shared/overview-scene.js');
const { checkScene } = load('shared/overview-checks.js');

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf8'));
const ctx = plainContext('abcd1234', 'overview');
const place = { x: 0, y: 0, w: 320, h: 330 };
const summary = (id, state, over = {}) => ({ id, agent: 'claude', state, start: null, tickets: [], last: '2026-10-22T13:00:00.000Z', source: 'deck', ...over });
const request = (id, session, over = {}) => ({ id, session, agent: 'claude', tool: 'Bash', summary: 'npm test', source: 'deck', answerable: true, ticket: null, ...over });

// --- TASK-0202: Needs you, permission requests first ---

for (const name of ['deck', 'your-trainer']) {
  test(`${name}: the count adds the open requests and the waiting agents to the tickets, and the sections come in Edwin's order`, () => {
    const model = fixture(name);
    const plain = needsPanel(model, ctx, place);
    const tickets = plain.node.body.total;
    const needs = { requests: [request('r1', 'aaaaaaaa-1'), request('ap-9', 'cockpit-7', { source: 'cockpit', answerable: false, agent: 'codex', tool: 'Edit', summary: 'src/a.ts' })], answered: { tool: 'Bash', summary: 'ls', outcome: 'approved', source: 'deck' }, git: { branch: 'main', upstream: 'origin/main', ahead: 3, changed: 2 } };
    // aaaaaaaa-1 waits because of its request, so it is counted once; cockpit-8 waits for its next prompt.
    const agents = [summary('aaaaaaaa-1', 'waiting'), summary('cockpit-8', 'waiting', { source: 'cockpit', start: 'TASK-0001' }), summary('bbbbbbbb-2', 'working')];
    const { node, rows } = needsPanel(model, ctx, place, { needs, agents });
    const b = node.body;
    assert.equal(b.total, tickets + 2 + 1);
    assert.deepEqual(b.requests.map((r) => [r.id, r.source, r.approve !== undefined]), [['r1', 'deck', true], ['ap-9', 'cockpit', false]]);
    assert.match(b.requests[1].label, /Answer in the cockpit$/, 'a request Deck cannot answer says where it can be');
    assert.deepEqual(b.agents.map((a) => a.id), ['cockpit-8']);
    assert.equal(b.git, '3 commits not pushed to origin/main · 2 files changed');
    assert.equal(b.answered, 'Last answered: Bash ls, approved');
    const groups = rows.map((r) => r.id.replace(/-.*/, ''));
    const first = (p) => groups.indexOf(p);
    assert.ok(first('request') < first('waiting') && first('waiting') < first('needs') && first('needs') < groups.lastIndexOf('needs') + 1, 'requests, then waiting agents, then tickets');
    assert.equal(rows.at(-1).id, 'needs-git', 'what is not pushed comes last');
    assert.equal(rows.find((r) => r.id === 'request-r1-approve').action, `${ANSWER}deck:allow:aaaaaaaa-1:r1`);
    assert.ok(!rows.some((r) => r.id.startsWith('request-ap-9-')), 'no Approve or Deny for a request Deck cannot answer');
    const scene = wheelScene(model, ctx, { agents, needs });
    for (const r of checkScene(scene)) assert.ok(r.ok, `${r.rule}: ${r.detail}`);
  });
}

test('the served page\'s Needs you is the tickets by reason alone: no request, agent or git line (RISK-0015)', () => {
  const model = fixture('deck');
  const scene = wheelScene(model, ctx, {});
  const panel = [...walkScene(scene.nodes)].find((n) => n.kind === 'panel' && n.key === 'needs-you');
  assert.equal(panel.body.requests, undefined);
  assert.equal(panel.body.agents, undefined);
  assert.equal(panel.body.git, undefined);
  assert.equal(panel.body.total, panel.body.parts.reduce((n, p) => n + p.ids.length, 0));
  assert.ok(!scene.list.some((r) => /^(request|waiting)-|^needs-git$/.test(r.id)));
});

test('the count check catches a panel whose number is not what it draws', () => {
  const model = fixture('deck');
  const scene = wheelScene(model, ctx, { agents: [], needs: { requests: [request('r1', 's1')], answered: null, git: null } });
  const panel = [...walkScene(scene.nodes)].find((n) => n.kind === 'panel' && n.key === 'needs-you');
  panel.body.total += 1;
  assert.ok(!checkScene(scene).find((r) => r.rule === 'numbers').ok);
});

test('what is not pushed is said plainly, for a branch ahead, one with no upstream, and one with nothing to push', () => {
  assert.equal(gitWords({ branch: 'main', upstream: 'origin/main', ahead: 1, changed: 1 }), '1 commit not pushed to origin/main · 1 file changed');
  assert.equal(gitWords({ branch: 'wip', upstream: null, ahead: 0, changed: 0 }), 'wip has no upstream, so nothing on it is pushed · no file changed');
  assert.equal(gitWords({ branch: 'main', upstream: 'origin/main', ahead: 0, changed: 0 }), 'main is pushed to origin/main · no file changed');
  assert.equal(gitWords(null), null);
  assert.deepEqual([unpushed({ branch: 'main', upstream: 'origin/main', ahead: 0, changed: 0 }), unpushed({ branch: 'w', upstream: null, ahead: 0, changed: 0 })], [false, true]);
  assert.deepEqual(waitingAgents([summary('a', 'waiting'), summary('b', 'idle')], []).map((s) => s.id), ['a']);
});

test('the main process gathers Deck\'s open requests from sessions at work, the cockpit\'s open ones but not Deck\'s twice, and the last answer', async () => {
  const sessions = [
    { id: 'deck-1', agent: 'claude', workspaceId: 'w', ticket: 'TASK-0001', state: 'waiting' },
    { id: 'deck-2', agent: 'codex', workspaceId: 'w', ticket: null, state: 'idle' },
    { id: 'deck-3', agent: 'claude', workspaceId: 'other', ticket: null, state: 'waiting' },
  ];
  const conversations = {
    'deck-1': [{ kind: 'permission', at: '2026-10-22T13:00:01Z', id: 'p1', tool: 'Edit', summary: 'src/a.ts', outcome: 'open' }, { kind: 'permission', at: '2026-10-22T13:00:00Z', id: 'p0', tool: 'Bash', summary: 'ls', outcome: 'open' }, { kind: 'permission', at: '2026-10-22T13:00:02Z', id: 'p0', tool: 'Bash', summary: 'ls', outcome: 'denied' }],
    // A request a restart left open is not offered: the session is no longer at work.
    'deck-2': [{ kind: 'permission', at: '2026-10-22T12:00:00Z', id: 'q1', tool: 'Bash', summary: 'rm -rf build', outcome: 'open' }],
    'deck-3': [{ kind: 'permission', at: '2026-10-22T13:00:00Z', id: 'x', tool: 'Bash', summary: 'x', outcome: 'open' }],
  };
  const got = await gatherNeeds('w', {
    sessions, conversation: (id) => conversations[id] ?? [], root: null, base: 'http://127.0.0.1:9', git: runGit, cockpitAnswerable: false,
    getJson: async (url) => {
      assert.equal(url, 'http://127.0.0.1:9/api/cockpit/approvals');
      return { approvals: [
        { approval_id: 'ap1', session_id: 'cock-1', agent: 'claude', tool: 'Bash', prompt: 'npm run build', status: 'open' },
        { approval_id: 'ap2', session_id: 'cock-2', agent: 'claude', tool: 'Bash', prompt: 'x', status: 'handed-to-terminal' },
        { approval_id: 'ap3', session_id: 'deck-1', agent: 'claude', tool: 'Edit', prompt: 'src/a.ts', status: 'open' },
      ] };
    },
  });
  assert.deepEqual(got.requests.map((r) => [r.source, r.id, r.session, r.answerable]), [['deck', 'p1', 'deck-1', true], ['cockpit', 'ap1', 'cock-1', false]]);
  assert.deepEqual(got.answered, { tool: 'Bash', summary: 'ls', outcome: 'denied', source: 'deck' });
  assert.equal(got.git, null);
  const down = await gatherNeeds('w', { sessions: [], conversation: () => [], root: null, base: 'http://127.0.0.1:9', git: runGit, cockpitAnswerable: true, getJson: async () => { throw new Error('connect ECONNREFUSED'); } });
  assert.deepEqual(down.requests, [], 'a sidecar that is down gives no requests, and no error');
});

test('git says the branch, its upstream, the commits ahead and the files changed, and that a branch was never pushed', async () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-needs-git-')));
  const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { stdio: 'pipe' }).toString();
  const origin = path.join(base, 'origin.git');
  git(base, 'init', '-q', '--bare', origin);
  const repo = path.join(base, 'repo');
  git(base, 'clone', '-q', origin, repo);
  git(repo, 'config', 'user.email', 't@example.com');
  git(repo, 'config', 'user.name', 'T');
  git(repo, 'checkout', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'one');
  assert.deepEqual(await gitState(repo, runGit), { branch: 'main', upstream: null, ahead: 0, changed: 0 });
  git(repo, 'push', '-q', '-u', 'origin', 'main');
  fs.writeFileSync(path.join(repo, 'b.txt'), 'b\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'two');
  fs.writeFileSync(path.join(repo, 'c.txt'), 'c\n');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'changed\n');
  assert.deepEqual(await gitState(repo, runGit), { branch: 'main', upstream: 'origin/main', ahead: 1, changed: 2 });
  assert.equal(await gitState(path.join(base, 'not-a-repo-' + Date.now()), runGit), null);
});

// --- TASK-0204: a cockpit request answered from Deck, only with the shell secret ---

const { registerAgentCalls } = load('main/agents/ipc.js');
const { SessionManager } = load('main/agents/sessions.js');

function calls(cockpit, base = 'http://127.0.0.1:9') {
  const handlers = new Map();
  const manager = new SessionManager(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-needs-')), {});
  registerAgentCalls((ch, fn) => handlers.set(ch, fn), manager, (id) => (id === 'w' ? '/repo' : null), () => base, cockpit);
  return handlers;
}

test('with a sidecar Deck started, a cockpit request is answered with the secret in its header and nowhere else', async () => {
  const sent = [];
  const secret = 'f'.repeat(48);
  const h = calls({ secretFor: () => secret, actor: () => 'user:edwin', answer: async (base, s, body) => { sent.push({ base, s, body }); return { ok: true, status: 200, json: { ok: true } }; } });
  assert.deepEqual(await h.get('deck:agents:cockpit-answer')({}, 'w', 'ap1', true), { ok: true });
  assert.deepEqual(await h.get('deck:agents:cockpit-answer')({}, 'w', 'ap2', false), { ok: true });
  assert.deepEqual(sent.map((x) => [x.base, x.s === secret, x.body]), [['http://127.0.0.1:9', true, { approval_id: 'ap1', decision: 'granted', actor: 'user:edwin' }], ['http://127.0.0.1:9', true, { approval_id: 'ap2', decision: 'denied', actor: 'user:edwin' }]]);
  for (const x of sent) assert.ok(!JSON.stringify(x.body).includes(secret));
  assert.match((await h.get('deck:agents:cockpit-answer')({}, 'w', 'ap1', 'yes')).error, /allows or denies/);
  assert.match((await h.get('deck:agents:cockpit-answer')({}, 'w', '../x', true)).error, /names a request/);
});

test('with a borrowed sidecar there is no secret: no answer is sent, and Needs you offers no buttons for the cockpit\'s requests', async () => {
  const sent = [];
  const h = calls({ secretFor: () => null, actor: () => 'user:edwin', answer: async (...a) => { sent.push(a); return { ok: true, status: 200, json: {} }; } });
  assert.match((await h.get('deck:agents:cockpit-answer')({}, 'w', 'ap1', true)).error, /answer in the cockpit/);
  assert.equal(sent.length, 0);
});

test('the secret reaches no payload a window is sent: not the needs, the sessions or the cockpit\'s sessions', async () => {
  const secret = 'a1b2'.repeat(12);
  const h = calls({ secretFor: () => secret, actor: () => 'u' }, null);
  const payloads = [await h.get('deck:agents:needs')({}, 'w'), await h.get('deck:agents:list')({}), await h.get('deck:agents:cockpit')({}, 'w')];
  for (const p of payloads) assert.ok(!JSON.stringify(p ?? null).includes(secret));
});

test('Deck\'s own sidecar is started with --secret-stdin and a fresh secret of at least 32 characters, and a borrowed one gives none', () => {
  const src = fs.readFileSync(path.join(desktopRoot, 'src', 'main', 'sidecar.ts'), 'utf8');
  assert.match(src, /'--secret-stdin'/);
  assert.match(src, /randomBytes\(24\)\.toString\('hex'\)/, '48 hex characters, made at each start');
  assert.match(src, /record\.ownedByDeck \? this\.secrets\.get/, 'only a sidecar Deck owns gives its secret');
  assert.ok(!/console\.(log|warn|error)\([^)]*secret/.test(src), 'never logged');
});

test('an answer needs somebody to answer as: with no actor name, nothing is sent', async () => {
  const sent = [];
  const h = calls({ secretFor: () => 'b'.repeat(48), actor: () => '', answer: async (...a) => { sent.push(a); return { ok: true, status: 200, json: {} }; } });
  assert.match((await h.get('deck:agents:cockpit-answer')({}, 'w', 'ap1', true)).error, /no name to answer as/);
  assert.equal(sent.length, 0);
});
