// TST-0102 — the towers' new parts (FEAT-0031), laid out from the overview model on both
// workspaces, without a window. Each task of FEAT-0031 adds its checks here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { desktopRoot, load } from './helpers.mjs';

const { buildOverview } = load('shared/overview-model.js');
const { recordFrom } = load('shared/records.js');
const notes = load('shared/overview-notes.js');
const { OverviewService, docsImages } = load('main/overview-service.js');

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf8'));
const WORKSPACES = ['deck', 'your-trainer'];

/** Records made from whole note texts, as Deck's index reads them; `readBody` gives each its text. */
function workspace(files) {
  const records = Object.entries(files).filter(([p]) => p.endsWith('.md')).map(([p, text]) => recordFrom(p, text, 0).record);
  return { records, readBody: (rel) => files[rel] ?? '' };
}
const md = (fields, body = '') => `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v)}`).join('\n')}\n---\n${body}`;

// --- TASK-0181: the model carries each ticket's text, owner and date, and the pictures ---

test('a ticket carries its first paragraph, its owner as a word and its updated date', () => {
  const { records, readBody } = workspace({
    'phases/PHASE-0001-One.md': md({ id: 'PHASE-0001', type: 'phase', status: 'active' }, '# One\n'),
    'features/f/FEAT-0001-F.md': md({ id: 'FEAT-0001', type: 'feature', status: 'doing', phase: '[[PHASE-0001-One]]', owner: 'user:edwin', updated: '2026-10-20' },
      '# The feature\n\n> [!note] A stamp\n> not prose\n\n**Deck draws it.** Reproducible by:\n\n1. open it\n2. [x] look\n\nLater text.\n'),
    'features/f/plan/tasks/TASK-0001-T.md': md({ id: 'TASK-0001', type: 'task', status: 'doing', parent: '[[FEAT-0001-F]]', owner: 'unassigned', updated: 'soon' }, '# T\n'),
  });
  const model = buildOverview(records, { workspace: 'W', readBody });
  const f = model.tickets['FEAT-0001'];
  assert.equal(f.lead, 'Deck draws it. Reproducible by: open it; look');
  assert.equal(f.owner, 'Edwin');
  assert.equal(f.updated, '2026-10-20');
  const t = model.tickets['TASK-0001'];
  assert.equal(t.lead, undefined, 'a note with no prose has no lead');
  assert.equal(t.owner, undefined, 'unassigned is no owner');
  assert.equal(t.updated, undefined, 'a date that is not a date is none');
  assert.equal(model.pictures, undefined, 'no pictures are listed when the builder is given none');
});

test('a design stands with the feature in focus that names it, else the lowest-numbered, else its own implements', () => {
  const files = {
    'phases/PHASE-0001-One.md': md({ id: 'PHASE-0001', type: 'phase', status: 'active' }),
    'features/a/FEAT-0002-A.md': md({ id: 'FEAT-0002', type: 'feature', status: 'doing', phase: '[[PHASE-0001-One]]', design: '[[DES-0001-D]]' }),
    'features/b/FEAT-0003-B.md': md({ id: 'FEAT-0003', type: 'feature', status: 'doing', phase: '[[PHASE-0001-One]]', designs: ['[[DES-0001-D]]'] }),
    'features/c/FEAT-0004-C.md': md({ id: 'FEAT-0004', type: 'feature', status: 'doing', phase: '[[PHASE-0001-One]]' }),
    'designs/DES-0001-D.md': md({ id: 'DES-0001', type: 'design', status: 'proposed', implements: ['[[FEAT-0004-C]]'] }),
    'designs/DES-0002-E.md': md({ id: 'DES-0002', type: 'design', status: 'proposed', implements: ['[[FEAT-0004-C]]'] }),
  };
  const { records, readBody } = workspace(files);
  const by = (focus) => buildOverview(records, { workspace: 'W', readBody, focus: { phase: null, feature: focus, task: null } }).tickets;
  assert.equal(by(null)['DES-0001'].feature, 'FEAT-0002', 'the lowest-numbered of the features that name it, `design:` included');
  assert.equal(by('FEAT-0003')['DES-0001'].feature, 'FEAT-0003', 'the feature in focus wins among them');
  assert.equal(by('FEAT-0004')['DES-0001'].feature, 'FEAT-0002', 'its own implements: only when no feature names it');
  assert.equal(by(null)['DES-0002'].feature, 'FEAT-0004', 'named by no feature, it stands with what it implements');
});

test('pictures belong to the note that names them, else to a ticket their name names, else to the feature folder', () => {
  const files = {
    'phases/PHASE-0001-One.md': md({ id: 'PHASE-0001', type: 'phase', status: 'active' }),
    'features/towers/FEAT-0001-F.md': md({ id: 'FEAT-0001', type: 'feature', status: 'doing', phase: '[[PHASE-0001-One]]' }, '![a](plates/linked.png)\n'),
    'features/towers/plan/tests/TST-0001-T.md': md({ id: 'TST-0001', type: 'test', status: 'active', parent: '[[FEAT-0001-F]]', evidence: ['../../shots/run.jpg'] }),
    'issues/ISS-0001-I.md': md({ id: 'ISS-0001', type: 'issue', status: 'open' }, 'See [[crash.webp]] and ```\n![x](example.png)\n```\n'),
  };
  const { records, readBody } = workspace(files);
  const images = [
    { path: 'features/towers/plates/linked.png', date: '2026-10-01' },
    { path: 'features/towers/shots/run.jpg', date: '2026-10-03' },
    { path: 'attachments/crash.webp', date: '2026-09-01' },
    { path: 'attachments/ISS-0001-before.png', date: '2026-09-02' },
    { path: 'features/towers/loose.gif', date: '2026-08-01' },
    { path: 'elsewhere/example.png', date: '2026-10-09' },
    { path: 'elsewhere/nobody.png', date: '2026-10-09' },
  ];
  const model = buildOverview(records, { workspace: 'W', readBody, images });
  assert.deepEqual(model.pictures, [
    { ticket: 'TST-0001', path: 'features/towers/shots/run.jpg', date: '2026-10-03' },
    { ticket: 'FEAT-0001', path: 'features/towers/plates/linked.png', date: '2026-10-01' },
    { ticket: 'ISS-0001', path: 'attachments/ISS-0001-before.png', date: '2026-09-02' },
    { ticket: 'ISS-0001', path: 'attachments/crash.webp', date: '2026-09-01' },
    { ticket: 'FEAT-0001', path: 'features/towers/loose.gif', date: '2026-08-01' },
  ], 'newest first; an example in a code block and a picture nobody names are left out');
});

test('the builder reads a body given without its frontmatter as well as a whole note', () => {
  const text = md({ id: 'TST-0001', type: 'test', status: 'active', evidence: ['shot.png'] }, 'The test.\n');
  const { records } = workspace({ 'tests/TST-0001-T.md': text });
  const body = text.replace(/^---[\s\S]*?---\n/, '');
  const model = buildOverview(records, { workspace: 'W', readBody: () => body, images: [{ path: 'tests/shot.png', date: '2026-10-01' }] });
  assert.equal(model.tickets['TST-0001'].lead, 'The test.');
  assert.deepEqual(model.pictures, [{ ticket: 'TST-0001', path: 'tests/shot.png', date: '2026-10-01' }], 'the evidence: field still counts');
});

for (const name of WORKSPACES) {
  test(`${name}: every ticket the notes give one has its lead, owner and date, and the pictures belong to tickets, newest first`, () => {
    const m = fixture(name);
    const tickets = Object.values(m.tickets);
    // Deck's notes all have prose, an owner and a date; your-trainer's mostly do (TASK-0181's capture counts).
    const share = (key) => tickets.filter((t) => typeof t[key] === 'string' && t[key] !== '').length / tickets.length;
    for (const key of ['lead', 'owner', 'updated']) assert.ok(share(key) > 0.85, `${key}: ${share(key)}`);
    for (const t of tickets) {
      if (t.lead !== undefined) assert.ok(t.lead.length <= 280 && !/https?:\/\//.test(t.lead), t.id);
      if (t.updated !== undefined) assert.match(t.updated, /^\d{4}-\d{2}-\d{2}$/, t.id);
    }
    assert.ok(Array.isArray(m.pictures) && m.pictures.length > 0);
    for (const p of m.pictures) {
      assert.ok(m.tickets[p.ticket] !== undefined, p.ticket);
      assert.match(p.path, /\.(png|jpe?g|webp|gif)$/i);
      assert.ok(!p.path.startsWith('docs/') && !p.path.startsWith('/') && !p.path.includes('..'), p.path);
    }
    const dates = m.pictures.map((p) => p.date);
    assert.deepEqual(dates, [...dates].sort().reverse(), 'newest first');
    assert.equal(new Set(m.pictures.map((p) => p.path)).size, m.pictures.length, 'each picture once');
    // Every design a feature names stands with a feature (TASK-0179's rule, now the model's).
    for (const t of tickets) if (t.type === 'design' && t.feature !== undefined) assert.equal(m.tickets[t.feature]?.kind, 'feat', t.id);
  });
}

test("Deck's fixture: the design of the feature in focus stands with it", () => {
  const m = fixture('deck');
  assert.equal(m.focus.feature, 'FEAT-0028');
  assert.equal(m.tickets['DES-0005'].feature, 'FEAT-0028');
});

test('the page and Deck use one copy of the note helpers', async () => {
  const page = await import(path.join(desktopRoot, 'scripts', 'overview-towers-notes.mjs'));
  for (const name of ['leadOf', 'relationsFrom', 'ownerWord', 'boardOf', 'evidenceFrom', 'lastDates', 'weeksOf', 'designFeature', 'idsIn', 'plainMarkdown']) {
    assert.equal(page[name], notes[name], name);
  }
});

// The pictures beside the notes, read in the main process (RISK-0011).
function gitRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-pictures-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: '2026-03-04T10:00:00Z', GIT_COMMITTER_DATE: '2026-03-04T10:00:00Z' } });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return { root, git };
}
const put = (file, text = 'x') => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

test('a committed picture takes its last commit date; one never committed, its own; templates and hidden folders are skipped', () => {
  const { root, git } = gitRepo();
  const docs = path.join(root, 'docs');
  put(path.join(docs, 'designs', 'a.png'));
  put(path.join(docs, '__templates__', 'skip.png'));
  put(path.join(docs, '.hidden', 'skip.png'));
  put(path.join(docs, 'designs', 'notes.md'), '# not a picture');
  git('add', '-A');
  git('commit', '-q', '-m', 'one');
  put(path.join(docs, 'designs', 'b.JPG'));
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual(docsImages(root, docs, head), [{ path: 'designs/a.png', date: '2026-03-04' }, { path: 'designs/b.JPG', date: today }]);
});

test('pictures in a folder with no Git history are listed with their own dates, not an error', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-vault-'));
  put(path.join(root, 'Attachments', 'map.webp'));
  assert.deepEqual(docsImages(root, root, ''), [{ path: 'Attachments/map.webp', date: new Date().toISOString().slice(0, 10) }]);
});

test("the overview service hands the builder the workspace's pictures", () => {
  const seen = [];
  const service = new OverviewService({
    readFile: () => { throw new Error('no file'); },
    head: () => 'abc',
    now: () => '2026-10-22T12:00:00Z',
    images: (root, docsRoot, head) => { seen.push([root, docsRoot, head]); return [{ path: 'designs/TASK-0001-shot.png', date: '2026-10-21' }]; },
  });
  const records = [recordFrom('tasks/TASK-0001-T.md', md({ id: 'TASK-0001', type: 'task', status: 'doing' }), 0).record];
  const reply = service.read({ building: false, revision: 1, records, docsRoot: '/w/docs' }, { id: 'w1', root: '/w', name: 'W' });
  assert.deepEqual(seen, [['/w', '/w/docs', 'abc']]);
  assert.deepEqual(reply.pictures, [{ ticket: 'TASK-0001', path: 'designs/TASK-0001-shot.png', date: '2026-10-21' }]);
});
