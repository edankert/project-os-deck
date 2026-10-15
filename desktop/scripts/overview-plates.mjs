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
    ['ticket', 'S3 Ticket', () => ticketScene(model, choice.ticket, ctx, { text: noteText(choice.root, choice.ticket) })],
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
      if (data !== null && typeof flows[fn] === 'function') screens.push([key, title, () => flows[fn](model, data, ctx)]);
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
    // A ticket is drawn by a mark, or by a row of a panel (TASK-0147, TASK-0148).
    const marks = [...walkScene(scene.nodes)].reduce((n, node) => n + (node.kind === 'mark' && node.ticket !== undefined ? 1 : node.kind === 'panel' && node.body.kind === 'rows' ? node.body.sections.reduce((k, sec) => k + sec.rows.length, 0) : 0), 0);
    const panelRows = [...walkScene(scene.nodes)].reduce((n, node) => n + (node.kind === 'panel' && node.body.kind === 'rows' ? node.body.sections.reduce((k, sec) => k + sec.rows.length, 0) : 0), 0);
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
