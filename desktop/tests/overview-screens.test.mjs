// TST-0090 — the wheel, a phase, a ticket and re-phasing are drawn from the
// overview model as scenes, and each is held to PHASE-0005's look on two real
// workspaces (FEAT-0027, FEAT-0028; TASK-0125, TASK-0127 to TASK-0129).
//
// A scene is data, so these checks need no window: every ticket the screen is
// about is drawn exactly once as a mark carrying its id, the list twin holds
// the same ids, at most 60 words stand on screen at rest, and every number on
// screen names the mark that draws the same count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { plainContext, walkScene, sceneToSvg } = load('shared/overview-scene.js');
const { wheelScene } = load('shared/overview-wheel.js');
const { phaseScene, bandOf } = load('shared/overview-phase.js');
const { ticketScene, neighboursOf, LIFECYCLE } = load('shared/overview-ticket.js');
const { rephaseScene, unplaced } = load('shared/overview-rephase.js');
const { checkScene } = load('shared/overview-checks.js');
const { pageKinds } = load('shared/vocabularies.js');

const WORKSPACES = ['deck', 'your-trainer'];
const model = (name) => JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf-8'));
const ctx = plainContext('abcd1234', 'features');
const TICKET_ID = /^[A-Z]+-\d+/;

/** What a ticket is joined to, worked out here from the links rather than with the module's own rule. */
function linkedTo(m, id) {
  const out = new Set();
  for (const other of m.tickets[id].links) if (m.tickets[other] !== undefined && other !== id) out.add(other);
  for (const t of Object.values(m.tickets)) if (t.id !== id && t.links.includes(id)) out.add(t.id);
  return out;
}

/** Where a mark stands, as a string: two marks with the same one cover each other. */
const placeOf = (n) => JSON.stringify([n.tag, n.attrs]);

/** How many times each id is drawn: as a mark, or as a row of a panel (TASK-0147, TASK-0148). */
function drawn(scene) {
  const out = new Map();
  const add = (id) => out.set(id, (out.get(id) ?? 0) + 1);
  for (const node of walkScene(scene.nodes)) {
    if (node.kind === 'mark' && node.ticket !== undefined) add(node.ticket);
    if (node.kind === 'panel' && node.body.kind === 'rows') for (const section of node.body.sections) for (const row of section.rows) add(row.id);
  }
  return out;
}

/** The rows of a scene's panels, by section key. */
function panelSections(scene) {
  const out = new Map();
  for (const node of walkScene(scene.nodes)) {
    if (node.kind === 'panel' && node.body.kind === 'rows') for (const section of node.body.sections) out.set(section.key, section.rows.map((r) => r.id));
  }
  return out;
}

/** The look's rules 1, 2 and 5, as FEAT-0026's screen checks state them. */
function holdsTheLook(scene) {
  for (const result of checkScene(scene)) assert.ok(result.ok, `${scene.screen} ${scene.address}: ${result.rule}: ${result.detail}`);
  // It must serialise: the renderer and the plates both draw the SVG.
  assert.match(sceneToSvg(scene, { standalone: true }), /^<svg /);
}

for (const name of WORKSPACES) {
  test(`${name}: the wheel draws every ticket exactly once, and every phase`, () => {
    const m = model(name);
    const scene = wheelScene(m, ctx);
    const counts = drawn(scene);
    for (const id of Object.keys(m.tickets)) assert.equal(counts.get(id), 1, `${id} drawn ${counts.get(id) ?? 0} times`);
    assert.equal(counts.size, Object.keys(m.tickets).length);
    // Every phase is drawn once too, by the mark that carries its id.
    const phaseMarks = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && String(n.markId ?? '').startsWith('phase-'));
    assert.deepEqual(phaseMarks.map((n) => n.markId).sort(), [...m.phases, ...m.shelf, ...m.backlog].map((p) => `phase-${p.id}`).sort());
    holdsTheLook(scene);
    assert.equal(scene.address, 'deck://abcd1234/features?page=wheel');
  });

  test(`${name}: every phase opens as its web, its exit ring and its tickets as cockpit rows`, () => {
    const m = model(name);
    for (const p of [...m.phases, ...m.shelf, ...m.backlog]) {
      const scene = phaseScene(m, p.id, ctx);
      const counts = drawn(scene);
      for (const id of p.tickets) assert.equal(counts.get(id), 1, `${p.id}: ${id} drawn ${counts.get(id) ?? 0} times`);
      holdsTheLook(scene);
      // The front section is exactly what the cockpit dots; the back is what it fills, folded.
      // Computed here from the flags, not with the module's own section rule.
      const front = p.tickets.filter((id) => m.tickets[id].needsYou === true).sort();
      const back = p.tickets.filter((id) => m.tickets[id].needsYou !== true && ['delivered', 'dropped'].includes(m.tickets[id].fill)).sort();
      const sections = panelSections(scene);
      assert.deepEqual([...(sections.get('needs-you') ?? [])].sort(), front, p.id);
      assert.deepEqual([...(sections.get('closed') ?? [])].sort(), back, p.id);
      assert.deepEqual(scene.list.filter((r) => r.group === 'Needs you').map((r) => r.id).sort(), front, p.id);
      const panel = [...walkScene(scene.nodes)].find((n) => n.kind === 'panel');
      assert.equal(panel.body.tilt, true, `${p.id}: the rows stand on a tilted plane`);
      assert.equal(panel.body.sections.find((s) => s.key === 'closed').folded, true, `${p.id}: closed work starts folded`);
      // One segment per exit criterion.
      const segments = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && String(n.markId ?? '').startsWith(`exit-${p.id}-`));
      assert.equal(segments.length, p.exit.items.length, p.id);
    }
  });

  test(`${name}: a ticket of every kind opens on its lifecycle and its neighbours`, () => {
    const m = model(name);
    const sample = new Map();
    for (const t of Object.values(m.tickets)) if (!sample.has(`${t.kind}:${t.state}`)) sample.set(`${t.kind}:${t.state}`, t);
    assert.ok(sample.size >= 5, 'the fixture holds several kinds');
    for (const t of sample.values()) {
      const scene = ticketScene(m, t.id, ctx);
      holdsTheLook(scene);
      const counts = drawn(scene);
      assert.equal(counts.get(t.id), 1);
      for (const id of linkedTo(m, t.id)) assert.equal(counts.get(id), 1, `${t.id}: neighbour ${id}`);
      assert.equal(counts.size, linkedTo(m, t.id).size + 1, `${t.id}: draws exactly itself and what it is joined to`);
      // Its text has a panel of its own, and the joined tickets are rows split by direction.
      const panels = [...walkScene(scene.nodes)].filter((n) => n.kind === 'panel');
      assert.ok(panels.some((n) => n.body.kind === 'note' && n.body.id === t.id), `${t.id}: no text panel`);
      const sections = panelSections(scene);
      const to = new Set(m.tickets[t.id].links.filter((o) => o !== t.id && m.tickets[o] !== undefined));
      assert.deepEqual(new Set(sections.get('to')), to, `${t.id}: links to`);
      for (const id of sections.get('from') ?? []) assert.ok(m.tickets[id].links.includes(t.id) && !to.has(id), `${t.id}: ${id} is not linked from`);
      // Its status is a stop on the track, or a branch off it.
      const stops = LIFECYCLE[t.kind];
      const texts = [...walkScene(scene.nodes)].filter((n) => n.kind === 'text').map((n) => n.text);
      assert.ok(texts.includes(t.status) || stops.includes(t.status), `${t.id}: ${t.status} is not drawn`);
    }
  });

  test(`${name}: re-phasing draws every unplaced ticket once, and accepting a group moves it on screen only`, () => {
    const m = model(name);
    const scene = rephaseScene(m, ctx);
    const counts = drawn(scene);
    const candidates = unplaced(m);
    for (const t of candidates) assert.equal(counts.get(t.id), 1, t.id);
    holdsTheLook(scene);
    const controls = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && n.action !== undefined);
    const groups = new Set(candidates.filter((t) => t.suggestion !== undefined).map((t) => t.suggestion.phase));
    assert.equal(controls.length, groups.size);
    for (const c of controls) assert.ok(scene.list.some((r) => r.action === c.action), `${c.action} has no row`);
    if (groups.size > 0) {
      const first = [...groups][0];
      const after = rephaseScene(m, ctx, new Set([first]));
      assert.equal([...walkScene(after.nodes)].filter((n) => n.kind === 'mark' && n.action === `rephase:${first}`).length, 0);
      assert.equal(drawn(after).size, counts.size, 'accepting moves tickets; it draws none more and none fewer');
    }
  });
}

for (const name of WORKSPACES) {
  test(`${name}: the most linked tickets list every neighbour once, as a row with its id, title and status`, () => {
    const m = model(name);
    // Each ticket's degree, worked out once: sorting by linkedTo() directly scans the
    // whole corpus per comparison and took 17 seconds on your-trainer.
    const degree = new Map(Object.keys(m.tickets).map((id) => [id, new Set(m.tickets[id].links.filter((o) => o !== id && m.tickets[o] !== undefined))]));
    for (const t of Object.values(m.tickets)) for (const o of t.links) if (o !== t.id && degree.has(o)) degree.get(o).add(t.id);
    const busiest = Object.values(m.tickets).sort((a, b) => degree.get(b.id).size - degree.get(a.id).size).slice(0, 25);
    for (const t of busiest) {
      const scene = ticketScene(m, t.id, ctx);
      const rows = [...walkScene(scene.nodes)].filter((n) => n.kind === 'panel' && n.body.kind === 'rows').flatMap((n) => n.body.sections.flatMap((s) => s.rows));
      assert.equal(new Set(rows.map((r) => r.id)).size, rows.length, `${t.id}: a neighbour is listed twice`);
      assert.deepEqual(new Set(rows.map((r) => r.id)), degree.get(t.id), `${t.id}: the rows are not exactly its neighbours`);
      for (const r of rows) {
        const n = m.tickets[r.id];
        assert.deepEqual([r.title, r.status], [n.title, n.status], `${t.id}: ${r.id}'s row`);
        assert.ok(r.target.includes(`note=${encodeURIComponent(r.id)}`), `${t.id}: ${r.id}'s row opens nothing`);
      }
    }
  });

  test(`${name}: accepting a re-phase group moves its tickets into the sector, and only them`, () => {
    const m = model(name);
    const groups = new Map();
    for (const t of unplaced(m)) if (t.suggestion !== undefined) groups.set(t.suggestion.phase, [...(groups.get(t.suggestion.phase) ?? []), t.id]);
    if (groups.size === 0) return;
    const [phase, members] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    // Where a glyph's centre is, and nothing else: a glyph that only shrinks has not moved.
    const centreOf = (n) => {
      if (n.attrs.cx !== undefined) return `${Math.round(Number(n.attrs.cx))},${Math.round(Number(n.attrs.cy))}`;
      const xy = String(n.attrs.points).split(/[ ,]/).map(Number);
      const xs = xy.filter((_, i) => i % 2 === 0);
      const ys = xy.filter((_, i) => i % 2 === 1);
      return `${Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)},${Math.round(ys.reduce((a, b) => a + b, 0) / ys.length)}`;
    };
    const placesIn = (scene) => new Map([...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && n.ticket !== undefined).map((n) => [n.ticket, centreOf(n)]));
    const before = placesIn(rephaseScene(m, ctx));
    const after = placesIn(rephaseScene(m, ctx, new Set([phase])));
    for (const id of members) assert.notEqual(after.get(id), before.get(id), `${id} did not move into ${phase}`);
    for (const [id, place] of before) if (!members.includes(id)) assert.equal(after.get(id), place, `${id} moved although its group was not accepted`);
  });

  test(`${name}: every ticket on the wheel can take keyboard focus, and what needs a person glows`, () => {
    const m = model(name);
    const scene = wheelScene(m, ctx);
    const svg = sceneToSvg(scene);
    const marks = svg.match(/<[a-z]+ [^>]*data-ticket="[^"]+"[^>]*>/g) ?? [];
    assert.equal(marks.length, Object.keys(m.tickets).length);
    for (const tag of marks) assert.match(tag, /tabindex="-?[01]"/, `not focusable: ${tag.slice(0, 80)}`);
    const glowing = new Set();
    const walk = (nodes, lit) => { for (const n of nodes) { if (n.kind === 'group') walk(n.children, lit || String(n.cls ?? '').includes('glow')); else if (n.kind === 'mark' && n.ticket !== undefined && (lit || n.glow)) glowing.add(n.ticket); } };
    walk(scene.nodes, false);
    // What glows is the cockpit's "needs you" (TASK-0144, TASK-0145), not DES-0004's failed or owed.
    // Every ticket carries the flag, so this cannot pass on a fixture that lacks it.
    for (const t of Object.values(m.tickets)) assert.equal(typeof t.needsYou, 'boolean', `${t.id} has no needs-you flag`);
    assert.ok(Object.values(m.tickets).some((t) => t.needsYou), `${name}: some ticket needs a person`);
    for (const t of Object.values(m.tickets)) if (t.needsYou === true) assert.ok(glowing.has(t.id), `${t.id} needs a person and does not glow`);
  });
}

// TASK-0146 — back and forward retrace the screens a person visited, as a
// browser's history does. The trail is pure, so it is checked here with no window.
const trailModule = load('shared/overview-trail.js');

test('back and forward retrace the visited screens, and opening a screen after going back drops what was ahead', () => {
  const { emptyTrail, opened, stepped, current, canGoBack, canGoForward, TRAIL_LIMIT } = trailModule;
  const wheel = ctx.address({ page: 'wheel' });
  const phase = ctx.address({ page: 'phase', note: 'PHASE-0002' });
  const ticket = ctx.address({ page: 'ticket', note: 'FEAT-0024' });
  const other = ctx.address({ page: 'ticket', note: 'TASK-0104' });
  let t = emptyTrail();
  assert.equal(current(t), null);
  assert.equal(canGoBack(t), false);
  assert.equal(canGoForward(t), false);
  t = opened(opened(opened(t, wheel), phase), ticket);
  assert.equal(current(t), ticket);
  assert.deepEqual([canGoBack(t), canGoForward(t)], [true, false]);
  // Opening the screen already shown adds nothing.
  assert.equal(opened(t, ticket), t);
  t = stepped(stepped(t, -1), -1);
  assert.equal(current(t), wheel);
  assert.deepEqual([canGoBack(t), canGoForward(t)], [false, true]);
  // Nowhere further back: unchanged.
  assert.equal(stepped(t, -1), t);
  t = stepped(t, 1);
  assert.equal(current(t), phase);
  assert.deepEqual([canGoBack(t), canGoForward(t)], [true, true]);
  // A new screen after going back drops the ticket that was ahead.
  t = opened(t, other);
  assert.deepEqual(t.entries, [wheel, phase, other]);
  assert.deepEqual([canGoBack(t), canGoForward(t)], [true, false]);
  // The trail forgets its oldest screens past the limit, and still points at the newest.
  let long = emptyTrail();
  for (let i = 0; i < TRAIL_LIMIT + 5; i += 1) long = opened(long, ctx.address({ page: 'ticket', note: `TASK-${i}` }));
  assert.equal(long.entries.length, TRAIL_LIMIT);
  assert.equal(current(long), ctx.address({ page: 'ticket', note: `TASK-${TRAIL_LIMIT + 4}` }));
});

test('a step back that a click overtakes leaves the trail on the clicked screen, and a refused step moves nothing', () => {
  const { emptyTrail, opened, stepped, current, afterDraw } = trailModule;
  const wheel = ctx.address({ page: 'wheel' });
  const phase = ctx.address({ page: 'phase', note: 'PHASE-0002' });
  const ticket = ctx.address({ page: 'ticket', note: 'FEAT-0024' });
  const start = opened(opened(emptyTrail(), wheel), phase);
  // ← asks for the wheel; before it draws, a click on a ticket draws first.
  const intent = { address: wheel, next: stepped(start, -1) };
  let t = afterDraw(start, ticket, intent);
  assert.equal(current(t), ticket, 'the trail is on the screen shown');
  assert.deepEqual(t.entries, [wheel, phase, ticket]);
  // The step's own draw arrives late and is dropped by the renderer; had it been drawn, it completes the step.
  assert.equal(current(afterDraw(start, wheel, intent)), wheel);
  assert.deepEqual(afterDraw(start, wheel, intent).entries, [wheel, phase], 'a completed step keeps what was ahead');
  // A refused or failed step draws nothing: the trail is untouched.
  assert.equal(current(start), phase);
  // The same screen in the other colouring replaces its entry rather than adding one.
  const recoloured = `${phase}&colour=state`;
  t = afterDraw(start, recoloured, null, true);
  assert.deepEqual(t.entries, [wheel, recoloured]);
  assert.equal(t.at, 1);
});

// TASK-0145 — the cockpit's square, mark by mark: each state has its own shapes, and
// "needs you" is a dot whatever the fill (Codex's review: removing the dot broke no test).
test('the cockpit square draws each state with its own shapes, and the needs-you dot on any of them', () => {
  const { cockpitSquare, marksCss } = load('shared/overview-marks.js');
  const shapes = (fill, needsYou = false) => {
    const g = cockpitSquare({ id: 'T-1', type: 'task', fill, needsYou }, 50, 50, 20);
    return [...walkScene([g])].filter((n) => n.kind === 'mark').map((n) => `${n.tag}:${String(n.cls).split(' ').filter((c) => c.startsWith('sq')).join('.')}`).sort();
  };
  assert.deepEqual(shapes('open'), ['rect:sq']);
  assert.deepEqual(shapes('delivered'), ['rect:sq.sq-solid']);
  assert.deepEqual(shapes('unproven'), ['rect:sq-cut', 'rect:sq.sq-solid']);
  assert.deepEqual(shapes('doing'), ['rect:sq-cut', 'rect:sq-ring', 'rect:sq.sq-solid']);
  assert.deepEqual(shapes('dropped'), ['line:sq-cut', 'rect:sq.sq-solid']);
  assert.deepEqual(shapes('deferred'), ['line:sq-strike', 'rect:sq']);
  for (const fill of ['open', 'doing', 'delivered', 'unproven', 'dropped', 'deferred']) {
    assert.deepEqual(shapes(fill, true), [...shapes(fill), 'circle:sq-dot'].sort(), `${fill} with needs you`);
  }
  // In progress pulses, and keeps a static outline for a person who asked for less motion.
  const g = cockpitSquare({ id: 'T-1', type: 'task', fill: 'doing', needsYou: false }, 50, 50, 20);
  assert.equal(g.cls, 'ov-doing');
  assert.match(marksCss(), /prefers-reduced-motion: reduce\) \{.*\.sq-ring \{ display: inline; \}/);
});

// TASK-0145 — the colouring is part of the address, so a copied address shows the same picture.
test('an overview address keeps its colouring, and the grammar refuses a colouring where it colours nothing', () => {
  const { parseAddress, formatAddress } = load('shared/address.js');
  const state = plainContext('abcd1234', 'features', 'state');
  const wheel = state.address({ page: 'wheel' });
  assert.equal(wheel, 'deck://abcd1234/features?page=wheel&colour=state');
  assert.equal(parseAddress(wheel).colour, 'state');
  assert.equal(formatAddress(parseAddress(wheel)), wheel, 'it round-trips through the grammar');
  // Every address the state-coloured wheel writes keeps the colouring.
  const scene = wheelScene(model('deck'), state);
  assert.equal(scene.address, wheel);
  for (const row of scene.list) if (row.target !== undefined) assert.match(row.target, /&colour=state$/, row.id);
  // The default writes nothing, and a colouring outside the overview, or an unknown one, is refused.
  assert.equal(ctx.address({ page: 'wheel' }), 'deck://abcd1234/features?page=wheel');
  assert.throws(() => parseAddress('deck://abcd1234/features?note=FEAT-0024&colour=state'), /needs a "page" or a "flow"/);
  assert.throws(() => parseAddress('deck://abcd1234/features?page=wheel&colour=type'), /not a colouring/);
});

// TASK-0148 — S3 shows a feature's gate with the counts S7 reads from the sidecar, not five
// "not reported" chips (Codex's review), and its squares are evidence, not ticket drawings.
test('a feature on S3 shows its gate with the evidence counts S7 reads, and draws each ticket once', () => {
  const m = model('deck');
  const gate = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', 'flows', 'deck-accept.json'), 'utf-8'));
  const scene = ticketScene(m, gate.id, ctx, { gate });
  const group = scene.nodes.find((n) => n.kind === 'group' && n.key === `gate-${gate.id}`);
  assert.ok(group !== undefined, 'the gate is drawn');
  const numbers = [...walkScene(group.children)].filter((n) => n.kind === 'text' && n.role === 'number');
  const known = gate.lamps.filter((l) => l.known && l.total > 0).length;
  assert.equal(numbers.length, known * 2, 'each chip with known evidence shows done and total');
  assert.ok(numbers.length > 0, 'the recorded evidence has counts');
  assert.ok(![...walkScene(group.children)].some((n) => n.kind === 'mark' && n.ticket !== undefined), 'gate squares carry no ticket identity');
  holdsTheLook(scene);
  const counts = drawn(scene);
  for (const [id, n] of counts) assert.equal(n, 1, `${id} is drawn ${n} times`);
});
