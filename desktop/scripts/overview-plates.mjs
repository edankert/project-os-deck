// DES-0005's plates and prototype page, drawn by the screen code itself (TASK-0130).
//
// Every overview screen is a pure function from the model (and, for S5 to S7,
// from what the sidecar returns) to a scene. This script draws each screen
// for Deck and for your-trainer from the fixtures, writes each as an SVG and,
// when `rsvg-convert` is installed, as a PNG, and writes the prototype page
// that switches between them. So the design and the build cannot disagree:
// they are the same functions.
//
// Usage, from desktop/ after `npm run build`:
//   node scripts/overview-plates.mjs [--out ../docs/designs/__attachments__/DES-0005] [--page ../docs/designs/DES-0005-the-overview.html]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, '..');
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(desktop, 'dist', rel));
const optional = (rel) => (fs.existsSync(path.join(desktop, 'dist', rel)) ? load(rel) : null);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const out = path.resolve(option('--out', path.join(desktop, '..', 'docs', 'designs', '__attachments__', 'DES-0005')));
const pagePath = path.resolve(option('--page', path.join(desktop, '..', 'docs', 'designs', 'DES-0005-the-overview.html')));

const { plainContext, sceneToSvg, walkScene } = load('shared/overview-scene.js');
const { wheelScene } = load('shared/overview-wheel.js');
const { phaseScene } = load('shared/overview-phase.js');
const { ticketScene } = load('shared/overview-ticket.js');
const { rephaseScene } = load('shared/overview-rephase.js');
const checks = optional('shared/overview-checks.js');
const flows = optional('shared/overview-flows.js');

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(desktop, 'fixtures', 'overview', name), 'utf-8'));
const flowFixture = (name) => {
  const file = path.join(desktop, 'fixtures', 'overview', 'flows', name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
};

/** Which phase and which ticket each workspace's plates show: the ones with the most to say. */
const CHOICES = {
  deck: { label: 'Deck', phase: 'PHASE-0002', ticket: 'FEAT-0024', root: path.join(desktop, '..') },
  'your-trainer': { label: 'your-trainer', phase: 'PHASE-021', ticket: 'TST-0656', root: path.resolve(option('--your-trainer', path.join(desktop, '..', '..', 'your-trainer'))) },
};

/**
 * A note's Markdown body, for S3's text panel (TASK-0148): found by its id in the
 * workspace's docs, without its frontmatter. Deck shows the sidecar's rendered text;
 * a plate has no sidecar, so it draws these lines flat. Empty when the file is absent.
 */
function noteText(root, id) {
  const docs = path.join(root, 'docs');
  if (!fs.existsSync(docs)) return '';
  const stack = [docs];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.')) stack.push(path.join(dir, entry.name));
      else if (entry.isFile() && entry.name.startsWith(`${id}-`) && entry.name.endsWith('.md')) {
        const text = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
        const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
        return m ? text.slice(m[0].length) : text;
      }
    }
  }
  return '';
}

/** Words at rest, counted the way FEAT-0026's check counts them when it is built, else the plain way. */
function wordsAtRest(scene) {
  if (checks?.checkScene) {
    const result = checks.checkScene(scene).find((r) => r.rule === 'words');
    const m = /(\d+) words?/.exec(result?.detail ?? '');
    if (m) return Number(m[1]);
  }
  let n = 0;
  for (const node of walkScene(scene.nodes)) {
    if (node.kind === 'text' && node.rest && node.role !== 'id' && node.role !== 'number') {
      n += node.text.split(/\s+/).filter((w) => w !== '' && !/^[A-Z]+-\d+/.test(w)).length;
    }
  }
  return n;
}

fs.mkdirSync(out, { recursive: true });
// --no-raster writes the SVG plates and the page only: what a test needs, without rsvg-convert.
const raster = !args.includes('--no-raster');
const rsvg = raster && spawnSync('rsvg-convert', ['--version']).status === 0;
const sips = raster && process.platform === 'darwin' && spawnSync('sips', ['--help']).status === 0;
const plates = [];

for (const [ws, choice] of Object.entries(CHOICES)) {
  const model = fixture(`${ws}.json`);
  const ctx = plainContext('abcd1234', 'features');
  const screens = [
    ['wheel', 'S1 Wheel', () => wheelScene(model, ctx)],
    // The same wheel in DES-0004's state colours, for Edwin to compare (TASK-0145).
    ['wheel-state', 'S1 Wheel, state colours', () => wheelScene(model, plainContext('abcd1234', 'features', 'state'))],
    ['phase', 'S2 Phase', () => phaseScene(model, choice.phase, ctx)],
    // S3 shows a feature's gate from the same recorded sidecar evidence as S7, when that is the feature recorded.
    ['ticket', 'S3 Ticket', () => {
      const accept = flowFixture(`${ws}-accept.json`);
      return ticketScene(model, choice.ticket, ctx, { text: noteText(choice.root, choice.ticket), ...(accept?.id === choice.ticket ? { gate: accept } : {}) });
    }],
    ['rephase', 'S4 Re-phase', () => rephaseScene(model, ctx)],
  ];
  // S5 to S7 are FEAT-0029's, drawn from recorded sidecar payloads.
  if (flows !== null) {
    for (const [key, title, fn] of [
      ['design', 'S5 Design acceptance', 'designScene'],
      ['test-run', 'S6 Acceptance test', 'testRunScene'],
      ['accept', 'S7 Ticket acceptance', 'acceptScene'],
    ]) {
      const data = flowFixture(`${ws}-${key}.json`);
      // S7 shows the feature's text beside its gate (TASK-0159); a plate reads it from the note.
      if (data !== null && typeof flows[fn] === 'function') screens.push([key, title, () => (key === 'accept' ? flows[fn](model, data, ctx, { text: noteText(choice.root, data.id) }) : flows[fn](model, data, ctx))]);
    }
  }
  for (const [key, title, make] of screens) {
    const scene = make();
    const svg = sceneToSvg(scene, { standalone: true });
    const base = `${key}-${ws}`;
    fs.writeFileSync(path.join(out, `${base}.svg`), svg);
    let png = null;
    if (rsvg) {
      const result = spawnSync('rsvg-convert', ['-w', '1440', '-o', path.join(out, `${base}.png`), path.join(out, `${base}.svg`)]);
      if (result.status === 0) png = `${base}.png`;
      // A dark field compresses to half as a JPEG, and these are pictures to look at, not to measure.
      if (png !== null && sips) {
        const jpeg = spawnSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', path.join(out, png), '--out', path.join(out, `${base}.jpg`)]);
        if (jpeg.status === 0) {
          fs.rmSync(path.join(out, png));
          png = `${base}.jpg`;
        }
      }
    }
    // A ticket is drawn by a mark, or by a row of a panel (TASK-0147, TASK-0148): a list's rows,
    // or the first rows of the needs-you panel (TASK-0184).
    const rowsOf = (node) => (node.kind !== 'panel' ? 0 : node.body.kind === 'rows' ? node.body.sections.reduce((k, sec) => k + sec.rows.length, 0) : node.body.kind === 'needs' ? node.body.rows.length : 0);
    const marks = [...walkScene(scene.nodes)].reduce((n, node) => n + (node.kind === 'mark' && node.ticket !== undefined ? 1 : rowsOf(node)), 0);
    const panelRows = [...walkScene(scene.nodes)].reduce((n, node) => n + rowsOf(node), 0);
    // What the plate really draws: a flat panel can run out of room, so the count is read
    // from the SVG, beside how many the screen holds (Codex's review of TASK-0150).
    const drawnInPlate = (svg.match(/ data-ticket="/g) ?? []).length;
    const sections = [...walkScene(scene.nodes)].flatMap((node) => (node.kind === 'panel' && node.body.kind === 'rows' ? node.body.sections.map((sec) => ({ title: sec.title, rows: sec.rows.map((r) => r.id) })) : []));
    plates.push({ key, title, ws, label: choice.label, svg: `${base}.svg`, png, words: wordsAtRest(scene), marks: drawnInPlate, tickets: marks, panelRows, sections, rows: scene.list.length, address: scene.address, ...(key === 'ticket' ? { ticket: choice.ticket } : {}) });
    console.log(`${base}: ${wordsAtRest(scene)} words at rest, ${drawnInPlate} of ${marks} tickets drawn, ${scene.list.length} list rows${png ? '' : ' (no PNG: rsvg-convert is not installed)'}`);
  }
}
fs.writeFileSync(path.join(out, 'plates.json'), `${JSON.stringify(plates, null, 2)}\n`);

// The prototype page: a dark field, a workspace switch and a screen switch, each
// screen an <object> so pointing at a mark shows its words, as the app's callout does.
const rel = path.relative(path.dirname(pagePath), out).split(path.sep).join('/');
const screens = [...new Map(plates.map((p) => [p.key, p.title])).entries()];
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DES-0005 Overview Screens</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; background: #02040a; color: hsl(195 60% 88%); font: 15px/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; }
header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid hsla(190,90%,65%,.25); }
h1 { font-size: 15px; letter-spacing: .08em; text-transform: uppercase; margin: 0 12px 0 0; }
.seg { display: inline-flex; border: 1px solid hsla(190,90%,65%,.5); border-radius: 999px; overflow: hidden; }
.seg button { background: transparent; color: inherit; border: 0; padding: 6px 12px; font: inherit; cursor: pointer; }
.seg button[aria-pressed="true"] { background: hsla(190,90%,55%,.22); }
.seg button:disabled { opacity: .35; cursor: default; }
main { padding: 12px 16px 24px; }
object { width: 100%; aspect-ratio: 1440 / 1000; display: block; border-radius: 10px; }
p.note { color: hsl(205 25% 62%); max-width: 80ch; }
</style></head>
<body>
<header><h1>DES-0005 · the overview</h1>
<div class="seg" id="history"><button id="back" title="Back (⌘[)" aria-label="Back" disabled>←</button><button id="forward" title="Forward (⌘])" aria-label="Forward" disabled>→</button></div>
<div class="seg" id="ws">${Object.entries(CHOICES).map(([k, c], i) => `<button data-ws="${k}" aria-pressed="${i === 0}">${c.label}</button>`).join('')}</div>
<div class="seg" id="screen">${screens.map(([k, t], i) => `<button data-screen="${k}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>
</header>
<main><object id="plate" type="image/svg+xml" data="${rel}/wheel-deck.svg"></object>
<p class="note" id="caption"></p>
<p class="note">Point at any mark to read what it is; press a sector, a ticket or a gate to open its screen. Every screen is drawn by the same functions Deck uses, from tickets measured on Deck and on your-trainer. Generated by desktop/scripts/overview-plates.mjs; do not edit by hand.</p></main>
<script>
const plates = ${JSON.stringify(plates)};
let ws = 'deck', screen = 'wheel';
// Back and forward, as in Deck (TASK-0146): opening a screen after going back drops what was ahead.
let trail = [], at = -1;
function visit() {
  const here = trail[at];
  if (here && here.ws === ws && here.screen === screen) return;
  trail = trail.slice(0, at + 1).concat([{ ws, screen }]);
  at = trail.length - 1;
}
function step(by) {
  const next = at + by;
  if (next < 0 || next >= trail.length) return;
  at = next; ws = trail[at].ws; screen = trail[at].screen;
  render();
}
function show() { visit(); render(); }
function render() {
  const p = plates.find((x) => x.ws === ws && x.key === screen) || plates.find((x) => x.ws === ws);
  document.getElementById('plate').data = '${rel}/' + p.svg;
  document.getElementById('caption').textContent = p.title + ' on ' + p.label + ': ' + p.words + ' words at rest, ' + p.marks + ' of ' + p.tickets + ' tickets drawn (Deck lists the rest), ' + p.rows + ' rows in the list twin. Address: ' + p.address;
  for (const b of document.querySelectorAll('#ws button')) b.setAttribute('aria-pressed', String(b.dataset.ws === ws));
  for (const b of document.querySelectorAll('#screen button')) b.setAttribute('aria-pressed', String(b.dataset.screen === screen));
  document.getElementById('back').disabled = at <= 0;
  document.getElementById('forward').disabled = at >= trail.length - 1;
}
document.getElementById('back').addEventListener('click', () => step(-1));
document.getElementById('forward').addEventListener('click', () => step(1));
document.addEventListener('keydown', (e) => { if (e.metaKey && (e.key === '[' || e.key === ']')) { e.preventDefault(); step(e.key === '[' ? -1 : 1); } });
// A click on a mark that leads somewhere opens that screen, as it does in Deck. This needs
// the plate's document, which a browser gives only when the page is served (the cockpit's
// viewer serves it); opened from a file, the switches above still reach every screen.
const SCREEN_OF = { wheel: 'wheel', phase: 'phase', ticket: 'ticket', rephase: 'rephase', design: 'design', 'test-run': 'test-run', accept: 'accept' };
document.getElementById('plate').addEventListener('load', () => {
  let doc = null;
  try { doc = document.getElementById('plate').contentDocument; } catch (e) { doc = null; }
  if (!doc) return;
  doc.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-target], [data-ticket]');
    if (!el) return;
    let next = null;
    if (el.hasAttribute('data-target')) {
      const q = new URLSearchParams(el.getAttribute('data-target').split('?')[1] || '');
      next = SCREEN_OF[q.get('page') || q.get('flow') || ''];
    } else {
      // A ticket. Deck opens its own screen, and from there where it is accepted. The page
      // has one ticket plate per workspace, so another ticket shows where Deck takes it next.
      const id = el.getAttribute('data-ticket');
      const plate = plates.find((p) => p.ws === ws && p.key === 'ticket');
      next = plate && plate.ticket === id ? 'ticket' : id.startsWith('DES-') ? 'design' : id.startsWith('TST-') ? 'test-run' : id.startsWith('FEAT-') ? 'accept' : 'ticket';
    }
    if (next && plates.some((p) => p.ws === ws && p.key === next)) { screen = next; show(); }
  });
});
document.getElementById('ws').addEventListener('click', (e) => { if (e.target.dataset.ws) { ws = e.target.dataset.ws; show(); } });
document.getElementById('screen').addEventListener('click', (e) => { if (e.target.dataset.screen) { screen = e.target.dataset.screen; show(); } });
show();
</script></body></html>
`;
fs.writeFileSync(pagePath, page);
console.log(`wrote ${plates.length} plates to ${path.relative(process.cwd(), out)} and the page ${path.relative(process.cwd(), pagePath)}`);

// ---------------------------------------------------------------------------
// TASK-0157 — the Level 2 design page: a real 3D wheel where height is time.
//
// Each phase is a column standing on the ring; its tickets rise up the column by
// the date the note was created, like tree rings, so the picture says when the
// work happened as well as where it stands. Drawn with three.js, loaded on this
// page only from cdnjs at a pinned version; nothing in Deck imports it. The
// tickets come from the same fixtures as every other plate, and each ticket's
// date from its own note's `created:`.
const timePagePath = path.resolve(option('--time-page', path.join(path.dirname(pagePath), 'DES-0005-time-columns.html')));

/** Every note's `created:` date in a workspace's docs, by id. */
function createdDates(root) {
  const docs = path.join(root, 'docs');
  const out = new Map();
  if (!fs.existsSync(docs)) return out;
  const stack = [docs];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__templates__') stack.push(path.join(dir, entry.name));
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        const head = fs.readFileSync(path.join(dir, entry.name), 'utf-8').slice(0, 1500);
        const id = /^id:\s*"?([A-Z]+-\d+)"?\s*$/m.exec(head)?.[1];
        const created = /^created:\s*"?(\d{4}-\d{2}-\d{2})/m.exec(head)?.[1];
        if (id && created && !out.has(id)) out.set(id, created);
      }
    }
  }
  return out;
}

const timeData = {};
for (const [ws, choice] of Object.entries(CHOICES)) {
  const model = fixture(`${ws}.json`);
  const dates = createdDates(choice.root);
  const row = (id) => {
    const t = model.tickets[id];
    return t === undefined ? null : [t.id, t.type, t.fill, t.needsYou ? 1 : 0, dates.get(t.id) ?? '', t.title, t.status];
  };
  const phases = [...model.phases, ...model.shelf, ...model.backlog]
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    .map((p) => ({ id: p.id, number: p.number, name: p.name, kind: p.kind, tickets: p.tickets.map(row).filter(Boolean) }));
  timeData[ws] = { label: choice.label, phases, core: model.core.tickets.map(row).filter(Boolean) };
}
const { TYPE_COLOUR, NEEDS_YOU } = load('shared/overview-marks.js');
const timePage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DES-0005 Time Columns</title>
<style>
:root { color-scheme: dark; }
html, body { margin: 0; height: 100%; background: #02040a; color: hsl(195 60% 88%); font: 14px/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; overflow: hidden; }
header { position: fixed; top: 0; left: 0; right: 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; z-index: 2; }
h1 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin: 0 10px 0 0; }
.seg { display: inline-flex; border: 1px solid hsla(190,90%,65%,.5); border-radius: 999px; overflow: hidden; }
.seg button { background: transparent; color: inherit; border: 0; padding: 5px 12px; font: inherit; cursor: pointer; }
.seg button[aria-pressed="true"] { background: hsla(190,90%,55%,.22); }
#tip { position: fixed; pointer-events: none; max-width: 380px; padding: 7px 10px; border-radius: 8px; background: hsla(205,60%,12%,.92); border: 1px solid hsla(190,90%,65%,.55); display: none; z-index: 3; }
#help { position: fixed; top: 52px; left: 16px; right: 16px; color: hsl(205 25% 62%); font-size: 12px; z-index: 2; }
canvas { display: block; }
</style>
<script type="importmap">{ "imports": { "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js" } }</script>
</head><body>
<header><h1>DES-0005 · height is time</h1>
<div class="seg" id="ws">${Object.entries(CHOICES).map(([k, c], i) => `<button data-ws="${k}" aria-pressed="${i === 0}">${c.label}</button>`).join('')}</div>
<div class="seg" id="views"><button data-view="0" aria-pressed="true">Angle 1</button><button data-view="1">Angle 2</button><button data-view="2">From above</button></div>
</header>
<div id="tip"></div>
<div id="help">Drag (left or middle button) to turn · Shift-drag or right-drag to pan · scroll to zoom · each column is a phase; up is the date a ticket was created; the column in the middle has no phase. Generated by desktop/scripts/overview-plates.mjs; do not edit by hand.</div>
<script type="application/json" id="data">${JSON.stringify(timeData).replace(/</g, '\\u003c')}</script>
<script type="module">
import * as THREE from 'three';
const DATA = JSON.parse(document.getElementById('data').textContent);
const TYPE = ${JSON.stringify(TYPE_COLOUR)};
const NEEDS = ${JSON.stringify(NEEDS_YOU)};
const css = (h) => new THREE.Color(h.replace(/hsl\\((\\d+) (\\d+)% (\\d+)%\\)/, 'hsl($1, $2%, $3%)'));
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#030712');
scene.fog = new THREE.Fog('#030712', 140, 320);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1000);
scene.add(new THREE.AmbientLight(0xbfdfff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(60, 120, 40); scene.add(sun);
let world = new THREE.Group(); scene.add(world);
const R = 46, H = 60, COL = 7.5, GOLD = Math.PI * (3 - Math.sqrt(5));
const pickables = [];
function label(text, size = 3, colour = '#bfe9ff') {
  const c = document.createElement('canvas'); const g = c.getContext('2d'); const px = 48;
  g.font = '600 ' + px + 'px -apple-system, Helvetica, Arial'; const w = Math.ceil(g.measureText(text).width) + 16;
  c.width = w; c.height = px + 16; g.font = '600 ' + px + 'px -apple-system, Helvetica, Arial'; g.fillStyle = colour; g.textBaseline = 'middle'; g.fillText(text, 8, c.height / 2);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(size * w / c.height, size, 1); return s;
}
function build(ws) {
  scene.remove(world); world = new THREE.Group(); scene.add(world); pickables.length = 0;
  const d = DATA[ws];
  const all = [...d.phases.flatMap((p) => p.tickets), ...d.core].map((t) => t[4]).filter(Boolean).sort();
  const t0 = all.length ? Date.parse(all[0]) : 0, t1 = all.length ? Date.parse(all[all.length - 1]) : 1;
  const yOf = (date) => (date ? ((Date.parse(date) - t0) / Math.max(1, t1 - t0)) * H : -3);
  // The ring the columns stand on, and the months as faint rings up the height.
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - COL - 2, R + COL + 2, 128), new THREE.MeshBasicMaterial({ color: 0x0b2a3d, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  ring.rotation.x = -Math.PI / 2; world.add(ring);
  if (all.length) {
    const start = new Date(all[0]); start.setDate(1);
    for (let m = new Date(start); m.getTime() <= t1; m.setMonth(m.getMonth() + 1)) {
      const y = yOf(m.toISOString().slice(0, 10));
      if (y < 0) continue;
      const circle = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * (R + COL + 4), y, Math.sin(i / 128 * Math.PI * 2) * (R + COL + 4)))), new THREE.LineBasicMaterial({ color: 0x1f6f8b, transparent: true, opacity: 0.22 }));
      world.add(circle);
      const l = label(m.toISOString().slice(0, 7), 2.2, '#6aa9c4'); l.position.set(R + COL + 10, y, 0); world.add(l);
    }
  }
  const columns = [...d.phases.map((p, i) => ({ p, angle: (i / d.phases.length) * Math.PI * 2, centre: R })), { p: { id: 'no phase', number: '', name: 'no phase', kind: 'core', tickets: d.core }, angle: 0, centre: 0 }];
  const box = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const solid = [], hollow = [], needs = [];
  for (const { p, angle, centre } of columns) {
    const cx = Math.cos(angle) * centre, cz = Math.sin(angle) * centre;
    const n = p.tickets.length;
    p.tickets.forEach((t, k) => {
      const r = COL * Math.sqrt((k + 0.5) / Math.max(1, n)), a = k * GOLD;
      const at = new THREE.Vector3(cx + Math.cos(a) * r, yOf(t[4]), cz + Math.sin(a) * r);
      (t[3] ? needs : ['open', 'deferred'].includes(t[2]) ? hollow : solid).push({ t, at, phase: p });
    });
    if (centre > 0) {
      const top = label((p.number ? p.number + ' ' : '') + p.name, 2.6, p.kind === 'finished' ? '#6aa9c4' : '#d8f3ff');
      top.position.set(Math.cos(angle) * (R + COL + 8), -6, Math.sin(angle) * (R + COL + 8)); world.add(top);
    }
  }
  const mesh = (items, material, scale = 1) => {
    if (!items.length) return;
    const m = new THREE.InstancedMesh(box, material, items.length); const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.copy(it.at); o.scale.setScalar(scale); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, css(TYPE[it.t[1]] ?? 'hsl(0 0% 60%)')); });
    m.instanceColor.needsUpdate = true; m.userData.items = items; world.add(m); pickables.push(m);
  };
  mesh(solid, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }));
  mesh(hollow, new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.75 }));
  mesh(needs, new THREE.MeshStandardMaterial({ emissive: css(NEEDS), emissiveIntensity: 0.9, roughness: 0.3 }), 1.6);
  // What needs you sends a beam up, visible from any angle.
  for (const it of needs) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, H + 12 - it.at.y, 6), new THREE.MeshBasicMaterial({ color: css(NEEDS), transparent: true, opacity: 0.35 }));
    beam.position.set(it.at.x, it.at.y + (H + 12 - it.at.y) / 2, it.at.z); world.add(beam);
  }
  window.__timeColumns = { ws, tickets: columns.reduce((n, c) => n + c.p.tickets.length, 0), undated: [...d.phases.flatMap((p) => p.tickets), ...d.core].filter((t) => !t[4]).length };
}
// The camera: turn, pan and zoom about a target, as Deck's overview does.
const view = { radius: 190, theta: 0.9, phi: 1.05, target: new THREE.Vector3(0, H * 0.42, 0) };
const VIEWS = [{ radius: 190, theta: 0.9, phi: 1.05 }, { radius: 150, theta: 2.6, phi: 1.32 }, { radius: 170, theta: 0.0001, phi: 0.06 }];
function place() {
  view.phi = Math.min(Math.PI - 0.05, Math.max(0.02, view.phi));
  camera.position.set(view.target.x + view.radius * Math.sin(view.phi) * Math.cos(view.theta), view.target.y + view.radius * Math.cos(view.phi), view.target.z + view.radius * Math.sin(view.phi) * Math.sin(view.theta));
  camera.lookAt(view.target);
}
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; renderer.domElement.setPointerCapture(e.pointerId); if (e.button === 1) e.preventDefault(); });
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('pointerup', () => { drag = null; });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const right = new THREE.Vector3().subVectors(camera.position, view.target).cross(camera.up).normalize(); view.target.addScaledVector(right, dx * view.radius * 0.0015); view.target.y += dy * view.radius * 0.0015; }
    else { view.theta += dx * 0.006; view.phi -= dy * 0.006; }
    place(); return;
  }
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObjects(pickables)[0]; const tip = document.getElementById('tip');
  if (!hit) { tip.style.display = 'none'; return; }
  const it = hit.object.userData.items[hit.instanceId]; const t = it.t;
  tip.textContent = t[0] + ' ' + t[5] + ' (' + t[6] + ') · ' + (it.phase.number ? it.phase.id : 'no phase') + ' · created ' + (t[4] || 'unknown') + (t[3] ? ' · needs you' : '');
  tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 400, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
});
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); view.radius = Math.min(500, Math.max(30, view.radius * Math.exp(e.deltaY * 0.0012))); place(); }, { passive: false });
let ws = Object.keys(DATA)[0];
function setView(i) { Object.assign(view, VIEWS[i]); view.target.set(0, H * 0.42, 0); place(); for (const b of document.querySelectorAll('#views button')) b.setAttribute('aria-pressed', String(b.dataset.view === String(i))); }
document.getElementById('ws').addEventListener('click', (e) => { if (!e.target.dataset.ws) return; ws = e.target.dataset.ws; build(ws); for (const b of document.querySelectorAll('#ws button')) b.setAttribute('aria-pressed', String(b.dataset.ws === ws)); });
document.getElementById('views').addEventListener('click', (e) => { if (e.target.dataset.view) setView(Number(e.target.dataset.view)); });
window.__showTime = (w, v) => { ws = w; build(w); setView(v); for (const b of document.querySelectorAll('#ws button')) b.setAttribute('aria-pressed', String(b.dataset.ws === ws)); };
addEventListener('resize', resize);
resize(); build(ws); setView(0);
renderer.setAnimationLoop(() => renderer.render(scene, camera));
</script></body></html>
`;
fs.writeFileSync(timePagePath, timePage);
console.log(`wrote the time-columns page ${path.relative(process.cwd(), timePagePath)} (${Object.values(timeData).map((w) => w.phases.reduce((n, p) => n + p.tickets.length, 0) + w.core.length).join(' and ')} tickets)`);

// TASK-0163 — the towers page, beside the time-columns page: the wheel as towers on a ring.
// It reads the same arguments (--page, --towers-page, --your-trainer).
await import('./overview-towers.mjs');
