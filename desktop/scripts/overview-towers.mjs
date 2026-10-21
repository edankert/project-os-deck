// TASK-0163 — the towers design page: the wheel as towers standing on a ring.
//
// Edwin, 2026-10-16: "go with towers, group by phase, draw it in three.js first".
// Each unfinished phase is a raised segment of the ring. Each feature in it
// stands as a tower, one floor per ticket: the feature at the foot, then its
// tasks, tests, requirements and designs, done at the bottom and open at the
// top. Tickets with no feature lie flat at the front of their segment. The
// focus phase, the focus feature and the next ticket are lit, from the
// workspace's SNAPSHOT at the commit the fixture was taken from.
//
// The tickets come from the same fixtures as every other plate. Which feature a
// ticket belongs to is read from the notes: its `parent:` (followed through a
// task's parent), a feature's `tests:`, `implements:`, `designs:`,
// `requirements:` and `tasks:` lists, or the `tests:` of a task that belongs to one.
// A ticket that several features name stands in the lowest-numbered one's tower.
// The notes and the focus are both read at the commit the fixture was taken from. Without the notes (a checkout with no
// your-trainer beside it) every ticket lies flat, and the page still holds them all.
//
// three.js 0.160.0 is loaded on that page only, from cdnjs; nothing in Deck
// imports it. The page's own code is `overview-towers-page.js`, inlined.
//
// Run by overview-plates.mjs, or alone from desktop/ after `npm run build`:
//   node scripts/overview-towers.mjs [--towers-page ../docs/designs/DES-0005-towers.html] [--your-trainer <root>]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { relationsFrom, ownerWord, boardOf, evidenceFrom } from './overview-towers-notes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, '..');
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(desktop, 'dist', rel));

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const pageDir = path.dirname(path.resolve(option('--page', path.join(desktop, '..', 'docs', 'designs', 'DES-0005-the-overview.html'))));
const towersPagePath = path.resolve(option('--towers-page', path.join(pageDir, 'DES-0005-towers.html')));

const CHOICES = {
  deck: { label: 'Deck', root: path.join(desktop, '..') },
  'your-trainer': { label: 'your-trainer', root: path.resolve(option('--your-trainer', path.join(desktop, '..', '..', 'your-trainer'))) },
};

/**
 * The workspace's notes as they were at a commit (the fixture's), so which feature a
 * ticket belongs to agrees with the fixture and with the focus read at the same commit.
 * Without that commit (a shallow clone), today's files, and the page says so.
 */
function notesAt(root, head, dirty) {
  const docs = path.join(root, 'docs');
  // Each note as { path, text }, its path relative to the workspace (TASK-0177 ties a
  // picture to the note that links to it).
  const today = () => {
    const notes = [];
    if (!fs.existsSync(docs)) return notes;
    const stack = [docs];
    while (stack.length > 0) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__templates__') stack.push(path.join(dir, entry.name));
        else if (entry.isFile() && entry.name.endsWith('.md')) notes.push({ path: path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'), text: fs.readFileSync(path.join(dir, entry.name), 'utf-8') });
      }
    }
    return notes;
  };
  if (head && spawnSync('git', ['-C', root, 'cat-file', '-e', `${head}^{commit}`]).status === 0) {
    const listed = spawnSync('git', ['-C', root, 'ls-tree', '-r', '--name-only', head, 'docs'], { encoding: 'utf-8', maxBuffer: 1 << 26 });
    const files = listed.stdout.split('\n').filter((p) => p.endsWith('.md') && !p.includes('/__templates__/') && !p.split('/').some((s) => s.startsWith('.')));
    const batch = spawnSync('git', ['-C', root, 'cat-file', '--batch'], { input: files.map((p) => `${head}:${p}`).join('\n') + '\n', maxBuffer: 1 << 28 });
    const out = batch.stdout;
    const notes = [];
    let at = 0;
    while (at < out.length) {
      const nl = out.indexOf(10, at);
      if (nl < 0) break;
      const size = Number(/ (\d+)$/.exec(out.subarray(at, nl).toString('utf-8'))?.[1] ?? NaN);
      if (!Number.isFinite(size)) break;
      notes.push({ path: files[notes.length], text: out.subarray(nl + 1, nl + 1 + size).toString('utf-8') });
      at = nl + 1 + size + 1;
    }
    // A fixture taken from a tree with uncommitted notes holds tickets the commit lacks;
    // their notes come from today's files, after every note the commit has (relations()
    // keeps the first it sees).
    return { notes: dirty ? [...notes, ...today()] : notes, from: 'commit' };
  }
  const notes = today();
  return { notes, from: notes.length > 0 ? 'working tree' : 'none' };
}

/**
 * The pictures under `docs/` at a commit, each with the date of its last commit before it
 * (TASK-0177's ring of recent evidence). Only pictures still in the working tree count,
 * since the page shows the files themselves. Without the commit, none.
 */
function imagesAt(root, head) {
  if (!head || spawnSync('git', ['-C', root, 'cat-file', '-e', `${head}^{commit}`]).status !== 0) return [];
  const log = spawnSync('git', ['-C', root, 'log', '--format=%x00%cs', '--name-only', head, '--', 'docs'], { encoding: 'utf-8', maxBuffer: 1 << 28 });
  const dated = new Map();
  let date = '';
  for (const line of log.stdout.split('\n')) {
    if (line.startsWith('\0')) date = line.slice(1);
    else if (line !== '' && /\.(?:png|jpe?g|webp|gif)$/i.test(line) && !dated.has(line)) dated.set(line, date);
  }
  const listed = spawnSync('git', ['-C', root, 'ls-tree', '-r', '--name-only', head, 'docs'], { encoding: 'utf-8', maxBuffer: 1 << 26 });
  return listed.stdout.split('\n').filter((p) => dated.has(p) && !p.includes('/__templates__/') && fs.existsSync(path.join(root, p))).map((p) => ({ path: p, date: dated.get(p) }));
}

/** Each note's `parent:`, the ticket lists a feature (or a task's `tests:`) names, and its facts, by id. */
function relations(root, head, dirty) {
  const { notes, from } = notesAt(root, head, dirty);
  return { ...relationsFrom(notes.map((n) => n.text)), notes, from };
}

/** The snapshot's focus at a commit (the fixture's), else in the working tree, and which it was. */
function focusOf(root, head) {
  let text = '';
  let from = 'none';
  const shown = head ? spawnSync('git', ['-C', root, 'show', `${head}:SNAPSHOT.yaml`], { encoding: 'utf-8' }) : null;
  if (shown?.status === 0) {
    text = shown.stdout;
    from = 'commit';
  } else if (fs.existsSync(path.join(root, 'SNAPSHOT.yaml'))) {
    text = fs.readFileSync(path.join(root, 'SNAPSHOT.yaml'), 'utf-8');
    from = 'working tree';
  }
  const block = /^focus:\r?\n((?:(?:[ \t].*)?\r?\n)*)/m.exec(text)?.[1] ?? '';
  const pick = (key) => new RegExp(`^  ${key}:\\s*"?([A-Z]+-\\d+)`, 'm').exec(block)?.[1] ?? null;
  return { phase: pick('phase'), feature: pick('feature'), task: pick('task'), from };
}

/** A criterion's text, plain and short enough for a callout. */
function plain(text, max = 220) {
  const s = text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias ?? /^[A-Z]+-\d+/.exec(target)?.[0] ?? target)
    // The evidence a criterion carries is for its note, not for a callout.
    .replace(/\s*\*?\(?\*?Evidence[:,][\s\S]*$/i, '')
    .replace(/\*\*|`|\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Floors from the bottom: done, resolved, in progress, owed, failed, open; what needs you on top. */
const STATE_RANK = { closed: 0, dropped: 1, progress: 2, owed: 3, failed: 4, open: 5 };
const floorRank = (t) => (t.needsYou ? 6 : STATE_RANK[t.state] ?? 5);

const towersData = {};
for (const [ws, choice] of Object.entries(CHOICES)) {
  const model = JSON.parse(fs.readFileSync(path.join(desktop, 'fixtures', 'overview', `${ws}.json`), 'utf-8'));
  const { parent, named, facts, notes: noteFiles, from: notesFrom } = relations(choice.root, model.head, model.dirty === true);
  const focus = focusOf(choice.root, model.head);
  // Said out loud, never quietly: a page drawn from today's notes, or from none, is not the fixture's.
  if (notesFrom !== 'commit') console.warn(`overview-towers: ${ws}'s notes read from ${notesFrom === 'none' ? 'nowhere (no docs at ' + choice.root + ')' : 'the working tree'}, not at the fixture's commit ${String(model.head).slice(0, 7)}`);
  if (focus.from !== 'commit') console.warn(`overview-towers: ${ws}'s focus read from ${focus.from}, not at the fixture's commit`);
  const tickets = model.tickets;
  // A ticket as the page draws it; the ninth column is why it needs you (TASK-0177's panel).
  const row = (t) => [t.id, t.type, t.fill, t.needsYou ? 1 : 0, t.status, t.title, t.needs?.say ?? '', t.state, t.needsYou ? t.needs?.reason ?? '' : ''];

  // Where each ticket is listed: a phase of the ring, a finished phase on the shelf, or the core.
  const ring = [...model.phases, ...model.backlog];
  const home = new Map();
  for (const p of ring) for (const id of p.tickets) home.set(id, { kind: 'ring', id: p.id });
  for (const p of model.shelf) for (const id of p.tickets) home.set(id, { kind: 'shelf', id: p.id });
  for (const id of Object.keys(tickets)) if (!home.has(id)) home.set(id, { kind: 'core' });

  // A ticket's feature: up its parents to the first feature, else the first feature that names it.
  const namedBy = new Map();
  const namedByTask = new Map();
  for (const [owner, ids] of [...named.entries()].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) {
    const into = owner.startsWith('FEAT-') ? namedBy : namedByTask;
    for (const id of ids) if (!into.has(id)) into.set(id, owner);
  }
  const upToFeature = (id) => {
    let p = parent.get(id);
    for (let i = 0; i < 6 && p !== undefined && !p.startsWith('FEAT-'); i += 1) p = parent.get(p);
    return p?.startsWith('FEAT-') ? p : undefined;
  };
  const featureOf = (id) => {
    const task = namedByTask.get(id);
    const f = upToFeature(id) ?? namedBy.get(id) ?? (task !== undefined ? upToFeature(task) ?? namedBy.get(task) : undefined);
    return f !== undefined && f !== id && tickets[f]?.type === 'feature' ? f : null;
  };

  const phases = new Map(ring.map((p) => [p.id, { id: p.id, number: p.number, name: p.name, status: p.status, kind: p.kind, exit: (p.exit?.items ?? []).map((c) => [plain(c.text), c.ticked ? 1 : 0]), exitProse: p.exit?.prose === true, towers: new Map(), tiles: [] }]));
  const shelf = new Map(model.shelf.map((p) => [p.id, { id: p.id, number: p.number, name: p.name, tickets: [] }]));
  const core = [];
  const ids = Object.keys(tickets).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  // A feature in a phase of the ring is a tower; every one of its tickets joins it,
  // wherever the ticket itself is listed, so a ticket is drawn once.
  for (const id of ids) {
    const t = tickets[id];
    const h = home.get(id);
    if (t.type === 'feature' && h.kind === 'ring') phases.get(h.id).towers.set(id, { f: row(t), floors: [] });
  }
  const towerOf = (f) => {
    const h = f === null ? undefined : home.get(f);
    return h?.kind === 'ring' ? phases.get(h.id).towers.get(f) : undefined;
  };
  for (const id of ids) {
    const t = tickets[id];
    const h = home.get(id);
    if (t.type === 'feature' && h.kind === 'ring') continue;
    const tower = towerOf(featureOf(id));
    if (tower !== undefined) tower.floors.push(t);
    else if (h.kind === 'ring') phases.get(h.id).tiles.push(row(t));
    else if (h.kind === 'shelf') shelf.get(h.id).tickets.push(row(t));
    else core.push(row(t));
  }
  for (const p of phases.values()) for (const tower of p.towers.values()) tower.floors = tower.floors.sort((a, b) => floorRank(a) - floorRank(b) || a.id.localeCompare(b.id, 'en', { numeric: true })).map(row);

  // The next ticket: the focus task, else (when the snapshot names none) the focus
  // feature's first task at doing, then its first at backlog.
  const focusTower = towerOf(focus.feature);
  const open = (id) => id !== null && tickets[id] !== undefined && tickets[id].state !== 'closed' && tickets[id].state !== 'dropped';
  let next = open(focus.task) ? focus.task : null;
  if (next === null && focusTower !== undefined) {
    const tasks = focusTower.floors.filter((r) => r[1] === 'task');
    next = tasks.find((r) => r[4] === 'doing')?.[0] ?? tasks.find((r) => r[4] === 'backlog' || r[4] === 'planned')?.[0] ?? null;
  }
  // A ticket's links (TASK-0176): the tickets its note names and the tickets whose notes
  // name it, as the fixture records them. Phases and references are not drawn as tickets.
  const links = {};
  const link = (a, b) => {
    if (a === b || tickets[a] === undefined || tickets[b] === undefined) return;
    (links[a] ??= new Set()).add(b);
    (links[b] ??= new Set()).add(a);
  };
  for (const id of ids) for (const other of tickets[id].links ?? []) link(id, other);
  for (const id of Object.keys(links)) links[id] = [...links[id]].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  // What the page shows of a selected ticket: its first paragraph, who has it, when it last changed.
  const notes = {};
  for (const id of ids) {
    const f = facts.get(id);
    if (f !== undefined) notes[id] = [f.lead, ownerWord(f.owner), f.updated];
  }

  // The next-up board (TASK-0176), in the style of Rubric's routines: the focus feature's
  // tasks, the last two finished greyed, the next one lit, then those in progress, at
  // review, and waiting. A cancelled task is not counted. Its foot says how many more of
  // each kind there are, and names the commit the data was read from.
  let queue = null;
  if (focusTower !== undefined) {
    const board = boardOf(focusTower.floors.filter((r) => r[1] === 'task'), next, (id) => notes[id]?.[2]);
    queue = { feature: focusTower.f[0], ...board, head: String(model.head).slice(0, 7), generated: String(model.generated ?? '').slice(0, 10) };
  }

  // Grouped by feature (TASK-0177): each unfinished feature a segment of the ring with its
  // tickets as one tower, finished features on the shelf, tickets of no feature in the core.
  // Only ids: the page takes each ticket's row from the phase grouping.
  const members = new Map();
  const loose = [];
  for (const id of ids) {
    if (tickets[id].type === 'feature') continue;
    const f = featureOf(id);
    if (f === null) loose.push(id);
    else (members.get(f) ?? members.set(f, []).get(f)).push(id);
  }
  const floorsOf = (f) => (members.get(f) ?? []).map((id) => tickets[id]).sort((a, b) => floorRank(a) - floorRank(b) || a.id.localeCompare(b.id, 'en', { numeric: true })).map((t) => t.id);
  const features = ids.filter((id) => tickets[id].type === 'feature');
  const finished = (id) => tickets[id].state === 'closed' || tickets[id].state === 'dropped';
  const byFeature = {
    ring: features.filter((f) => !finished(f)).map((f) => ({ id: f, status: tickets[f].state === 'progress' ? 'active' : 'planned', floors: floorsOf(f) })),
    shelf: features.filter(finished).map((f) => ({ id: f, tickets: [f, ...floorsOf(f)] })),
    core: loose,
  };

  // The ring of recent evidence (TASK-0177): pictures beside the notes, newest first, each
  // with its path from the page, so the page shows the file itself.
  const evidence = evidenceFrom(imagesAt(choice.root, model.head), noteFiles, new Set(ids)).map((e) => ({ ...e, src: path.relative(path.dirname(towersPagePath), path.join(choice.root, e.path)).split(path.sep).join('/') }));

  towersData[ws] = {
    label: choice.label,
    head: model.head,
    dataDate: String(model.generated ?? '').slice(0, 10),
    byFeature,
    evidence,
    notesFrom,
    focus,
    next,
    links,
    notes,
    queue,
    ring: [...phases.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })).map((p) => ({ ...p, towers: [...p.towers.values()] })),
    shelf: [...shelf.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
    core,
  };
}

const { TYPE_COLOUR, TYPE_WORD, NEEDS_YOU } = load('shared/overview-marks.js');
const { FILL_WORD } = load('shared/overview-types.js');
const { GATE_COLOUR } = load('shared/overview-gate.js');
const marks = { type: TYPE_COLOUR, typeWord: TYPE_WORD, needs: NEEDS_YOU, fillWord: FILL_WORD, exit: GATE_COLOUR.acceptance };
const script = fs.readFileSync(path.join(here, 'overview-towers-page.js'), 'utf-8');
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const towersPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DES-0005 Towers</title>
<style>
:root { color-scheme: dark; --ink: hsl(195 60% 88%); --dim: hsl(205 25% 62%); --line: hsla(190, 90%, 65%, 0.45); --panel: hsla(210, 50%, 8%, 0.92); --needs: ${NEEDS_YOU}; --exit: ${GATE_COLOUR.acceptance}; }
html, body { margin: 0; height: 100%; background: #02040a; color: var(--ink); font: 14px/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; overflow: hidden; }
header { position: fixed; top: 0; left: 0; right: 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; z-index: 4; pointer-events: none; }
header > * { pointer-events: auto; }
h1 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin: 0 10px 0 0; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; background: hsla(210, 50%, 8%, 0.6); }
.seg button { background: transparent; color: inherit; border: 0; padding: 5px 12px; font: inherit; cursor: pointer; }
.seg button[aria-pressed="true"] { background: hsla(190,90%,55%,.22); }
.seg button[hidden] { display: none; }
#home { background: hsla(190,90%,55%,.22); }
#back-ring[hidden] { display: none; }
#tip { position: fixed; pointer-events: none; max-width: 420px; padding: 8px 11px; border-radius: 8px; background: hsla(205,60%,12%,.95); border: 1px solid var(--line); display: none; z-index: 6; }
#tip .needs { color: var(--needs); margin-top: 4px; }
#tip .sub { color: var(--dim); font-size: 12px; }
#help { position: fixed; bottom: 12px; left: 16px; right: 16px; color: var(--dim); font-size: 12px; z-index: 2; pointer-events: none; }
#legend { position: fixed; left: 16px; top: 60px; padding: 10px 12px; border-radius: 10px; background: hsla(210, 50%, 8%, 0.94); border: 1px solid hsla(190, 90%, 65%, 0.25); font-size: 12px; z-index: 2; }
#legend div { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
#panel { position: fixed; right: 0; top: 0; bottom: 0; width: 380px; max-width: 92vw; overflow: auto; padding: 60px 14px 40px; background: var(--panel); border-left: 1px solid var(--line); z-index: 3; box-sizing: border-box; }
#panel[hidden] { display: none; }
#panel h2 { font-size: 15px; margin: 0 0 2px; }
#panel .sub { color: var(--dim); font-size: 12px; margin-bottom: 10px; }
#panel h3 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); margin: 14px 0 4px; display: flex; gap: 8px; align-items: center; }
#panel h3.focus { color: hsl(190 90% 75%); }
.row { display: flex; align-items: center; gap: 7px; padding: 3px 4px; border-radius: 5px; cursor: pointer; white-space: nowrap; }
.row:hover, .row.sel { background: hsla(190,90%,55%,.14); }
.row .id { color: var(--dim); font-size: 12px; flex: none; }
.row .t { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.row .st { color: var(--dim); font-size: 11px; flex: none; }
.row.dropped .t { text-decoration: line-through; opacity: .7; }
.row .say { display: block; }
.say { color: var(--needs); font-size: 12px; padding: 0 4px 4px 25px; white-space: normal; }
.next-tag { color: #fff; background: hsla(190,90%,55%,.35); border-radius: 4px; padding: 0 5px; font-size: 11px; flex: none; }
.sq { width: 11px; height: 11px; flex: none; box-sizing: border-box; border: 1.5px solid currentColor; border-radius: 2px; position: relative; }
.sq.delivered { background: currentColor; }
.sq.doing { background: linear-gradient(to top, currentColor 50%, transparent 50%); }
.sq.unproven { background: color-mix(in srgb, currentColor 45%, transparent); }
.sq.dropped { border-style: dashed; background: color-mix(in srgb, currentColor 22%, transparent); }
.sq.deferred { border-style: dotted; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--needs); box-shadow: 0 0 6px var(--needs); flex: none; }
.beam { width: 11px; height: 14px; background: linear-gradient(to top, hsla(190,100%,80%,.9), transparent); flex: none; }
canvas { display: block; }
/* TASK-0176: search, the selected ticket's card and the next-up board. */
#find { position: relative; display: inline-flex; align-items: center; gap: 8px; }
#q { width: 230px; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); background: hsla(210, 50%, 8%, 0.75); color: inherit; font: inherit; }
#q:focus { outline: none; border-color: hsl(190 90% 70%); box-shadow: 0 0 0 3px hsla(190,90%,55%,.2); }
#count { color: hsl(190 90% 78%); font-size: 12px; min-width: 70px; }
#results { position: absolute; top: 34px; left: 0; width: 420px; max-width: 92vw; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 4px; z-index: 5; }
#results[hidden] { display: none; }
#results .row.hot { background: hsla(190,90%,55%,.2); }
#card { position: fixed; left: 16px; top: 60px; width: 340px; max-width: calc(100vw - 32px); padding: 12px 14px; border-radius: 10px; background: hsla(210, 50%, 8%, 0.9); border: 1px solid var(--line); z-index: 3; box-sizing: border-box; }
#card[hidden] { display: none; }
#card .head { display: flex; gap: 8px; align-items: flex-start; }
#card .head .sq { margin-top: 4px; }
#card b { font-size: 14px; }
#card .title { font-size: 14px; margin: 2px 0 6px; }
#card .facts { color: var(--dim); font-size: 12px; display: grid; grid-template-columns: auto 1fr; gap: 1px 10px; }
#card .needs { color: var(--needs); font-size: 12px; margin-top: 6px; }
#card .kinds { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 8px; font-size: 12px; }
#card .kinds span { display: inline-flex; gap: 4px; align-items: center; }
#card .acts { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
#card .acts button, #panel .back { background: hsla(190,90%,55%,.16); border: 1px solid var(--line); color: inherit; border-radius: 6px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; }
#card .x { margin-left: auto; background: none; border: 0; color: var(--dim); font-size: 16px; cursor: pointer; padding: 0 2px; }
#panel .lead { font-size: 13px; line-height: 1.5; margin: 6px 0 4px; }
#panel .back { margin-bottom: 10px; }
#queue { position: fixed; left: 16px; bottom: 36px; width: 380px; max-width: calc(100vw - 32px); padding: 10px 12px 8px; border-radius: 10px; background: hsla(210, 50%, 8%, 0.94); border: 1px solid hsla(190, 90%, 65%, 0.3); z-index: 2; box-sizing: border-box; }
#queue h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; display: flex; justify-content: space-between; color: hsl(190 90% 78%); }
#queue h4 span { color: var(--dim); letter-spacing: .04em; text-transform: none; }
#queue .q { display: grid; grid-template-columns: 74px 1fr auto 56px; gap: 8px; align-items: center; padding: 3px 4px; border-radius: 5px; cursor: pointer; font-size: 12px; }
#queue .q:hover { background: hsla(190,90%,55%,.14); }
#queue .q .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#queue .q .who { color: var(--dim); font-size: 11px; }
#queue .q .k { text-align: right; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); }
#queue .q .id { font-variant-numeric: tabular-nums; padding: 1px 6px; border-radius: 4px; border: 1px solid hsla(190,60%,60%,.3); text-align: center; color: var(--dim); }
#queue .q.done { opacity: .5; }
#queue .q.done .t { text-decoration: line-through; }
#queue .q.next .id { background: hsl(190 90% 55%); color: #02141c; border-color: transparent; font-weight: 700; }
#queue .q.next .t { color: #fff; font-weight: 600; }
#queue .q.next .k { color: hsl(190 90% 75%); font-weight: 700; }
#queue .q.doing .k, #queue .q.review .k { color: hsl(190 70% 70%); }
#queue .foot { display: flex; justify-content: space-between; color: var(--dim); font-size: 11px; margin-top: 6px; border-top: 1px solid hsla(190,90%,65%,.15); padding-top: 5px; }
/* TASK-0177: the needs-you panel, the year as weeks, and the ring of recent evidence. */
.hud { position: fixed; right: 16px; width: 300px; max-width: calc(100vw - 32px); padding: 10px 12px; border-radius: 10px; background: hsla(210, 50%, 8%, 0.94); border: 1px solid hsla(190, 90%, 65%, 0.3); z-index: 2; box-sizing: border-box; }
.hud[hidden] { display: none; }
.hud h4 { margin: 0 0 4px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; display: flex; justify-content: space-between; color: hsl(190 90% 78%); }
.hud h4 span { color: var(--dim); letter-spacing: .04em; text-transform: none; }
#needs { top: 60px; }
#needs h4 { color: var(--needs); }
#needs .big { font-size: 40px; font-weight: 800; line-height: 1; color: var(--needs); font-variant-numeric: tabular-nums; text-shadow: 0 0 14px color-mix(in srgb, var(--needs) 45%, transparent); }
#needs .bar { display: flex; gap: 2px; height: 10px; margin: 8px 0 6px; border-radius: 3px; overflow: hidden; }
#needs .bar button { border: 0; padding: 0; cursor: pointer; min-width: 4px; }
#needs .keys { display: flex; flex-wrap: wrap; gap: 2px 10px; margin-bottom: 6px; }
#needs .keys button { background: none; border: 0; color: inherit; font: inherit; font-size: 12px; padding: 1px 0; cursor: pointer; display: inline-flex; gap: 5px; align-items: center; }
#needs .keys button:hover { color: #fff; }
#needs .keys i { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
#weeks { bottom: 36px; }
#weeks .grid { display: grid; grid-template-columns: 20px repeat(13, 1fr); gap: 3px; align-items: center; }
#weeks .q { color: var(--dim); font-size: 10px; }
#weeks .wk { aspect-ratio: 1; border: 1px solid hsla(170, 60%, 60%, 0.25); border-radius: 2px; padding: 0; cursor: pointer; background: color-mix(in srgb, var(--exit) calc(var(--f) * 100%), hsla(210, 40%, 14%, 0.9)); }
#weeks .wk.later { opacity: .35; }
#weeks .wk.now { outline: 2px solid #fff; outline-offset: 0; }
#weeks .wk:hover { border-color: #fff; }
#evidence { position: fixed; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
#evidence[hidden] { display: none; }
#evidence figure { position: absolute; left: 0; top: 0; margin: 0; width: 112px; transform-origin: 50% 100%; pointer-events: auto; cursor: pointer; background: hsla(210, 50%, 8%, 0.9); border: 1px solid hsla(190, 90%, 65%, 0.45); border-radius: 6px; padding: 3px; }
#evidence figure:hover { border-color: #fff; }
#evidence img { display: block; width: 104px; height: 66px; object-fit: cover; border-radius: 3px; background: #0b1a24; }
#evidence figure.missing img { visibility: hidden; }
#evidence figcaption { font-size: 10px; color: var(--dim); padding: 2px 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#evidence figcaption b { color: var(--ink); font-weight: 600; }
@media (max-width: 760px) { #queue, #legend, .hud { display: none; } #q { width: 150px; } }
</style>
<script type="importmap">{ "imports": { "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js" } }</script>
</head><body>
<header><h1>DES-0005 · towers on the ring</h1>
<div class="seg" id="ws">${Object.entries(CHOICES).map(([k, c], i) => `<button data-ws="${k}" aria-pressed="${i === 0}">${c.label}</button>`).join('')}</div>
<div class="seg" id="cam"><button id="home" title="Back to where the page starts (Home, 0)" hidden>⌂ Home</button><button data-view="above" title="From above">◉ Above</button><button data-view="leaning" title="Leaning, as the page starts">◒ Leaning</button><button data-view="side" title="From the side, so the heights show">▬ Side</button></div>
<div class="seg" id="group" title="Group the ring by phase or by feature"><button data-group="phase" aria-pressed="true">By phase</button><button data-group="feature" aria-pressed="false">By feature</button></div>
<div class="seg"><button id="ages" aria-pressed="true" title="Show how long each quiet tower has gone without a change">◷ Ages</button></div>
<div class="seg"><button id="back-ring" hidden title="Back to the whole ring (Escape)">‹ The ring</button></div>
<div id="find"><input id="q" type="search" placeholder="Find a ticket ( / )" aria-label="Find a ticket by id or title" autocomplete="off" spellcheck="false"><span id="count" role="status"></span><div id="results" hidden role="listbox" aria-label="Matching tickets"></div></div>
</header>
<div id="legend" aria-label="What the marks mean"></div>
<section id="card" hidden aria-label="The selected ticket"></section>
<section id="queue" aria-label="Next up"></section>
<section id="needs" class="hud" aria-label="What needs you"></section>
<section id="weeks" class="hud" aria-label="The year, week by week"></section>
<div id="evidence" aria-label="Recent evidence"></div>
<aside id="panel" hidden aria-label="The phase's tickets"></aside>
<div id="tip" role="status"></div>
<div id="help">Drag (left or middle button) to turn · Shift-drag or right-drag to pan · scroll to zoom · press a ticket to see its links · press a phase to bring it close · / to find · Escape steps back. Generated by desktop/scripts/overview-towers.mjs; do not edit by hand.</div>
<script type="application/json" id="data">${json(towersData)}</script>
<script type="application/json" id="marks">${json(marks)}</script>
<script type="module">
${script}
</script></body></html>
`;
fs.writeFileSync(towersPagePath, towersPage);
const count = (w) => w.ring.reduce((n, p) => n + p.tiles.length + p.towers.reduce((m, t) => m + 1 + t.floors.length, 0), 0) + w.shelf.reduce((n, p) => n + p.tickets.length, 0) + w.core.length;
console.log(`wrote the towers page ${path.relative(process.cwd(), towersPagePath)} (${Object.entries(towersData).map(([k, w]) => `${k}: ${count(w)} tickets, ${w.ring.reduce((n, p) => n + p.towers.length, 0)} towers, focus ${w.focus.phase ?? '-'} ${w.focus.feature ?? '-'}, next ${w.next ?? '-'}`).join('; ')})`);
