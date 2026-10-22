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

// --- TASK-0182: a selected ticket's links as curves, with its card and pane ---

const { plainContext, walkScene, sceneToSvg } = load('shared/overview-scene.js');
const { towersLayout, cubesOf, LINK_CAP, LINK_LABELS } = load('shared/overview-towers.js');
const { wheelScene } = load('shared/overview-wheel.js');
const { phaseScene } = load('shared/overview-phase.js');
const { checkScene } = load('shared/overview-checks.js');
const { parseAddress, formatAddress } = load('shared/address.js');
const { FRAME_ACTION } = load('shared/overview-select.js');
const ctx = plainContext('abcd1234', 'features');
const passes = (scene) => { for (const r of checkScene(scene)) assert.ok(r.ok, `${scene.address}: ${r.rule}: ${r.detail}`); };
const nodesOf = (scene) => [...walkScene(scene.nodes)];
const panelsOf = (scene) => nodesOf(scene).filter((n) => n.kind === 'panel');

/** Every ticket a ticket is joined to, both ways round, from the model's own links. */
function joined(m, id) {
  const out = new Set(m.tickets[id].links.filter((x) => x !== id && m.tickets[x] !== undefined));
  for (const t of Object.values(m.tickets)) if (t.id !== id && t.links.includes(id)) out.add(t.id);
  return [...out].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

for (const name of WORKSPACES) {
  test(`${name}: a selected ticket is joined to every ticket it links to or that links to it, each once, at both cubes`, () => {
    const m = fixture(name);
    const ids = Object.keys(m.tickets);
    const sample = [...ids.filter((_, i) => i % Math.ceil(ids.length / 40) === 0), m.next].filter(Boolean);
    const plain = towersLayout(m, ctx);
    const at = new Map([...cubesOf(plain)].map((c) => [c.id, [c.x, c.y, c.z]]));
    for (const id of sample) {
      const sel = towersLayout(m, ctx, null, { select: id }).selection;
      const want = joined(m, id);
      assert.equal(sel.total, want.length, id);
      assert.deepEqual(sel.links.map((l) => l.id), want.slice(0, LINK_CAP), id);
      assert.deepEqual(sel.at, at.get(id), id);
      for (const l of sel.links) {
        assert.deepEqual(l.to, at.get(l.id), `${id} → ${l.id}`);
        assert.equal(l.type, m.tickets[l.id].type);
        assert.equal(l.out, m.tickets[id].links.includes(l.id));
        assert.equal(l.in, m.tickets[l.id].links.includes(id));
      }
      assert.equal(sel.labelled, want.length <= LINK_LABELS, id);
    }
    assert.equal(towersLayout(m, ctx, null, { select: 'TASK-9999' }).selection, null, 'a ticket the model lacks selects nothing');
    assert.equal(towersLayout(m, ctx).selection, null);
  });
}

test("your-trainer's FEAT-0051, the busiest ticket, draws all 202 of its links, outlined without their ids", () => {
  const m = fixture('your-trainer');
  const sel = towersLayout(m, ctx, null, { select: 'FEAT-0051' }).selection;
  assert.equal(sel.total, 202);
  assert.equal(sel.links.length, 202);
  assert.equal(sel.labelled, false);
});

test('past 240 links, the first 240 by id are drawn and the rest are counted', () => {
  const m = structuredClone(fixture('deck'));
  const ids = Object.keys(m.tickets).filter((x) => x !== 'TASK-0154');
  m.tickets['TASK-0154'].links = ids;
  const sel = towersLayout(m, ctx, null, { select: 'TASK-0154' }).selection;
  assert.equal(sel.total, ids.length);
  assert.equal(sel.links.length, LINK_CAP);
  const s = wheelScene(m, ctx, { select: 'TASK-0154' });
  assert.match(s.list.find((r) => r.id === 'selected-TASK-0154').label, new RegExp(`${ids.length - LINK_CAP} more not drawn`));
});

for (const name of WORKSPACES) {
  test(`${name}: the wheel with a ticket selected draws a curve to each link, fades the rest, and keeps the look`, () => {
    const m = fixture(name);
    const id = name === 'deck' ? 'TASK-0156' : 'FEAT-0124';
    const scene = wheelScene(m, ctx, { select: id });
    passes(scene);
    assert.equal(scene.address, `deck://abcd1234/features?page=wheel&select=${id}`);
    assert.equal(formatAddress(parseAddress(scene.address)), scene.address, 'the selection round-trips through the grammar');
    const want = joined(m, id);
    const curves = nodesOf(scene).filter((n) => n.kind === 'mark' && /\bov-curve\b/.test(n.cls ?? ''));
    assert.equal(curves.length, want.length);
    for (const l of towersLayout(m, ctx, null, { select: id }).selection.links) assert.ok(curves.some((c) => c.cls.includes(`ty-${l.type}`) && c.label.endsWith(l.id)), l.id);
    // Every ticket but the selected one and its links stands in a faded group.
    const faded = new Set();
    const walk = (nodes, under) => { for (const n of nodes) { if (n.kind === 'mark' && n.ticket && under) faded.add(n.ticket); if (n.kind === 'group') walk(n.children, under || n.cls === 'ov-faint'); } };
    walk(scene.nodes, false);
    assert.equal(faded.size, Object.keys(m.tickets).length - 1 - want.length);
    assert.ok(!faded.has(id) && want.every((x) => !faded.has(x)));
    // The ids stand beside the linked tickets only while there are 40 or fewer.
    const ids = nodesOf(scene).filter((n) => n.kind === 'text' && n.cls === 'ov-link-id');
    assert.equal(ids.length, want.length <= 40 ? want.length : 0);
    // Escape clears it: the twin's way back is the wheel with nothing selected.
    assert.equal(scene.list.find((r) => r.id === 'back').target, 'deck://abcd1234/features?page=wheel');
  });

  test(`${name}: the card says what the ticket is and its buttons go where they say; the pane lists its links by type, each selecting its ticket`, () => {
    const m = fixture(name);
    const id = m.next;
    const t = m.tickets[id];
    const scene = wheelScene(m, ctx, { select: id });
    const card = panelsOf(scene).find((p) => p.body.kind === 'card');
    const pane = panelsOf(scene).find((p) => p.key.startsWith('pane-'));
    assert.equal(card.body.kind, 'card');
    assert.equal(card.body.row.id, id);
    assert.equal(card.body.row.title, t.title);
    const fact = (k) => card.body.facts.find((f) => f.key === k)?.value;
    assert.equal(fact('Owner'), t.owner ?? 'nobody');
    assert.equal(fact('Updated'), t.updated ?? 'no date');
    assert.ok(fact('Feature').startsWith(t.feature), fact('Feature'));
    assert.ok(fact('Phase').startsWith(m.phases.concat(m.backlog, m.shelf).find((p) => p.id === t.phase).number));
    const want = joined(m, id);
    assert.equal(card.body.counts.reduce((n, c) => n + c.n, 0), want.length);
    const button = (k) => card.body.buttons.find((b) => b.key === k);
    assert.equal(button('open').target, `deck://abcd1234/features?note=${id}&page=ticket`);
    assert.equal(button('frame').action, FRAME_ACTION);
    assert.match(button('phase').target, new RegExp(`note=PHASE-[^&]+&page=phase&select=${id}$`));
    assert.equal(button('clear').target, 'deck://abcd1234/features?page=wheel');
    // The twin holds every button, so a keyboard reaches them too.
    for (const b of card.body.buttons) assert.ok(scene.list.some((r) => r.id === `card-${b.key}` && (r.target === b.target || r.action === b.action)), b.key);
    assert.equal(pane.body.kind, 'rows');
    assert.equal(pane.body.lead, t.lead);
    const rows = pane.body.sections.flatMap((s) => s.rows);
    assert.deepEqual(rows.map((r) => r.id).sort(), [...want].sort());
    for (const r of rows) assert.equal(r.target, `deck://abcd1234/features?page=wheel&select=${encodeURIComponent(r.id)}`);
    for (const s of pane.body.sections) for (const r of s.rows) assert.equal(`linked-${m.tickets[r.id].type}`, s.key, r.id);
  });

  test(`${name}: with a phase brought close, a selected ticket's pane takes the list's place, the curves stay in the phase, and Escape goes back to the list`, () => {
    const m = fixture(name);
    const id = m.next;
    const layout = towersLayout(m, ctx);
    const phase = layout.phases.find((p) => p.towers.some((tw) => tw.cubes.some((c) => c.id === id)) || p.tiles.some((c) => c.id === id)).id;
    const scene = phaseScene(m, phase, ctx, { select: id });
    passes(scene);
    assert.equal(scene.address, `deck://abcd1234/features?note=${phase}&page=phase&select=${id}`);
    const panels = panelsOf(scene);
    assert.deepEqual(panels.map((p) => p.body.kind), ['card', 'rows'], 'no board with a phase close: the card stands where it would');
    assert.ok(!panels.some((p) => p.key.startsWith('tickets-')), "the phase's list gives way to the pane");
    assert.equal(panels[1].body.buttons[0].target, `deck://abcd1234/features?note=${phase}&page=phase`);
    assert.ok(!panels[0].body.buttons.some((b) => b.key === 'phase'), 'its phase is already close');
    assert.equal(scene.list.find((r) => r.id === 'back').target, `deck://abcd1234/features?note=${phase}&page=phase`);
    const inPhase = new Set(layout.phases.find((p) => p.id === phase).towers.flatMap((tw) => tw.cubes.map((c) => c.id)).concat(layout.phases.find((p) => p.id === phase).tiles.map((c) => c.id)));
    const curves = nodesOf(scene).filter((n) => n.kind === 'mark' && /\bov-curve\b/.test(n.cls ?? ''));
    assert.equal(curves.length, joined(m, id).filter((x) => inPhase.has(x)).length);
    // The layout still carries every link, for the 3D view, which draws the rest faded.
    assert.equal(towersLayout(m, ctx, phase, { select: id }).selection.links.length, joined(m, id).length);
  });

  test(`${name}: pressing a ticket on the ring or on a phase brought close selects it there`, () => {
    const m = fixture(name);
    for (const c of cubesOf(towersLayout(m, ctx))) assert.equal(c.target, `deck://abcd1234/features?page=wheel&select=${encodeURIComponent(c.id)}`);
    const p = m.phases[0].id;
    for (const c of cubesOf(towersLayout(m, ctx, p))) assert.equal(c.target, `deck://abcd1234/features?note=${p}&page=phase&select=${encodeURIComponent(c.id)}`);
  });
}

test('the grammar names a selection only on the wheel or a phase', () => {
  assert.equal(parseAddress('deck://abcd1234/features?page=wheel&select=TASK-0001').select, 'TASK-0001');
  assert.throws(() => parseAddress('deck://abcd1234/features?note=TASK-0001&page=ticket&select=TASK-0001'), /"select" needs "page=wheel" or "page=phase"/);
  assert.throws(() => parseAddress('deck://abcd1234/features?select=TASK-0001'), /"select" needs/);
  assert.equal(wheelScene(fixture('deck'), ctx, { select: 'TASK-9999' }).address, 'deck://abcd1234/features?page=wheel', 'a ticket the model lacks is dropped from the address');
});

test('a plate draws the card and the pane flat, with the selected ticket and its first paragraph', () => {
  const m = fixture('deck');
  const svg = sceneToSvg(wheelScene(m, ctx, { select: 'TASK-0156' }), { panels: 'flat' });
  assert.match(svg, /data-panel="card-TASK-0156"/);
  assert.match(svg, /Open {3}Frame {3}Its phase {3}Clear/);
  const { escapeXml } = load('shared/overview-scene.js');
  assert.ok(svg.includes(escapeXml(m.tickets['TASK-0156'].lead.split(' ').slice(0, 4).join(' '))));
});

// --- TASK-0183: search lights the towers, and the next-up board ---

const { searchTickets, SEARCH_LIST } = load('shared/overview-search.js');
const { nextUpPanel } = load('shared/overview-board.js');

test('a search finds the tickets whose id or title has a word starting with each word typed', () => {
  const m = { tickets: {} };
  const add = (id, title, extra = {}) => { m.tickets[id] = { id, title, state: 'open', needsYou: false, ...extra }; };
  add('TASK-0001', 'Heart Rate zones');
  add('TASK-0002', 'Generate the plan');
  add('TASK-0003', 'rate limits', { state: 'closed' });
  add('ISS-0004', 'The heart-rate strap drops', { needsYou: true });
  add('TASK-0010', 'Heart rate graph');
  const ids = (q) => searchTickets(m, q).map((t) => t.id);
  assert.deepEqual(ids('rate'), ['ISS-0004', 'TASK-0001', 'TASK-0010', 'TASK-0003'], 'what needs you first, closed last; "generate" is not a match');
  assert.deepEqual(ids('heart rate'), ['ISS-0004', 'TASK-0001', 'TASK-0010'], 'every word must start a word');
  assert.deepEqual(ids('task-0010'), ['TASK-0010'], 'an id typed whole');
  assert.deepEqual(ids('TASK-001'), ['TASK-0010'], 'an id typed in part');
  assert.deepEqual(ids('task-0001')[0], 'TASK-0001', 'the id typed whole comes first');
  assert.deepEqual(ids('   '), []);
  assert.deepEqual(ids('a(b'), [], 'what a person types is never read as a pattern');
});

test("the fixtures' searches find what DES-0005's page found: 16 for \"wheel\" on Deck, 29 for \"heart rate\" on your-trainer", () => {
  assert.equal(searchTickets(fixture('deck'), 'wheel').length, 16);
  assert.equal(searchTickets(fixture('your-trainer'), 'heart rate').length, 29);
  assert.equal(SEARCH_LIST, 12);
});

test("the board on Deck: FEAT-0028's last two finished, TASK-0154 next, then the rest in order, each with who has it", () => {
  const m = fixture('deck');
  const { node, rows } = nextUpPanel(m, towersLayout(m, ctx), ctx, { x: 0, y: 0, w: 400, h: 280 });
  const board = node.body.sections[0].rows;
  assert.equal(node.body.heading.text, 'Next up · FEAT-0028');
  assert.deepEqual(board.slice(0, 3).map((r) => r.tag), ['done', 'done', 'next']);
  assert.equal(board[2].id, 'TASK-0154');
  assert.equal(board[2].status, 'NEXT');
  assert.ok(board.some((r) => r.id === 'TASK-0158'));
  const tasks = Object.values(m.tickets).filter((t) => t.type === 'task' && t.feature === 'FEAT-0028' && t.state !== 'dropped');
  assert.equal(node.body.heading.of, tasks.length);
  assert.equal(node.body.heading.done, tasks.filter((t) => t.state === 'closed').length);
  for (const r of board) {
    assert.equal(r.aside, r.tag === 'done' ? m.tickets[r.id].updated : m.tickets[r.id].owner, r.id);
    assert.equal(r.target, `deck://abcd1234/features?page=wheel&select=${r.id}`);
  }
  // The two finished are the latest by date, shown oldest first.
  const done = tasks.filter((t) => t.state === 'closed').sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? '') || b.id.localeCompare(a.id, 'en', { numeric: true }));
  assert.deepEqual(board.slice(0, 2).map((r) => r.id), done.slice(0, 2).reverse().map((t) => t.id));
  assert.deepEqual(rows.map((r) => r.id), board.map((r) => r.id), 'every row is in the list twin');
  assert.match(node.body.foot, /read at 65c6397/);
});

test("the board on your-trainer: none of FEAT-0136's sixteen tasks done, TASK-1057 next, six in progress after it, the rest counted", () => {
  const m = fixture('your-trainer');
  const { node } = nextUpPanel(m, towersLayout(m, ctx), ctx, { x: 0, y: 0, w: 400, h: 280 });
  const board = node.body.sections[0].rows;
  assert.equal(node.body.heading.done, 0);
  assert.equal(node.body.heading.of, 16);
  assert.equal(board[0].id, 'TASK-1057');
  assert.equal(board[0].tag, 'next');
  assert.deepEqual(board.slice(1).map((r) => r.tag), Array(6).fill('doing'));
  assert.ok(board.every((r) => r.aside === 'Edwin'));
  assert.match(node.body.foot, /^\+ 7 in progress, 2 waiting · read at /);
});

test('with no feature in focus, or one not on the ring, the board says which and lists nothing', () => {
  const m = structuredClone(fixture('deck'));
  m.focus = { phase: null, feature: null, task: null };
  let panel = nextUpPanel(m, towersLayout(m, ctx), ctx, { x: 0, y: 0, w: 400, h: 280 });
  assert.deepEqual(panel.node.body.sections, []);
  assert.match(panel.node.body.foot, /names no feature in focus/);
  // A finished feature stands on the shelf, not as a tower on the ring (Deck has no finished phase yet).
  const y = structuredClone(fixture('your-trainer'));
  const shelved = Object.values(y.tickets).find((t) => t.kind === 'feat' && y.shelf.some((p) => p.id === t.phase));
  y.focus.feature = shelved.id;
  panel = nextUpPanel(y, towersLayout(y, ctx), ctx, { x: 0, y: 0, w: 400, h: 280 });
  assert.deepEqual(panel.node.body.sections, []);
  assert.match(panel.node.body.foot, new RegExp(`${shelved.id}, does not stand on the ring`));
});

for (const name of WORKSPACES) {
  test(`${name}: the wheel carries the board at the bottom left and still holds the look`, () => {
    const m = fixture(name);
    const scene = wheelScene(m, ctx);
    passes(scene);
    passes(wheelScene(m, ctx, { select: m.next }));
    const board = panelsOf(scene).find((p) => p.key === 'next-up');
    assert.ok(board !== undefined && board.x < 100 && board.y > 600);
  });
}
