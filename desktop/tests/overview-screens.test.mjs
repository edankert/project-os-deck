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
const unplacedTickets = unplaced;
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

// TASK-0148 — every real ticket's screen holds the look, whatever its title (Codex's review,
// round two: forty title words on a feature with a full gate made 62 words at rest).
for (const name of WORKSPACES) {
  test(`${name}: every ticket's screen stays within sixty words, and no title under forty words is cut`, () => {
    const m = model(name);
    const { titleLines } = load('shared/overview-ticket.js');
    for (const t of Object.values(m.tickets)) {
      const words = checkScene(ticketScene(m, t.id, ctx)).find((r) => r.rule === 'words');
      assert.ok(words.ok, `${t.id}: ${words.detail}`);
      const title = t.title.trim().replace(/\s+/g, ' ');
      if (title.split(' ').length <= 40) assert.equal(titleLines(title).join(' '), title, `${t.id}: its title is cut`);
    }
  });
}

// TASK-0145 — every ticket mark on the wheel carries its ticket's cockpit type, fill and dot.
for (const name of WORKSPACES) {
  test(`${name}: every ticket mark on the wheel and in a phase's rows has its ticket's type, fill and needs-you flag`, () => {
    const m = model(name);
    const check = (t, mark, where) => assert.deepEqual([mark.type, mark.fill, mark.needsYou], [t.type, t.fill, t.needsYou], `${where}: ${t.id}`);
    for (const n of walkScene(wheelScene(m, ctx).nodes)) if (n.kind === 'mark' && n.ticket !== undefined) check(m.tickets[n.ticket], n, 'wheel');
    const phase = m.phases[0] ?? m.shelf[0];
    for (const n of walkScene(phaseScene(m, phase.id, ctx).nodes)) {
      if (n.kind === 'panel' && n.body.kind === 'rows') for (const s of n.body.sections) for (const r of s.rows) check(m.tickets[r.id], r, phase.id);
    }
    // In the state colouring the wheel takes DES-0004's state instead.
    const state = plainContext('abcd1234', 'features', 'state');
    for (const n of walkScene(wheelScene(m, state).nodes)) if (n.kind === 'mark' && n.ticket !== undefined) assert.equal(n.state, m.tickets[n.ticket].state);
  });
}

// TASK-0152 — the wheel says where re-phasing and the release test are: a button in the
// middle with the number of tickets that have no phase, and a "Release test" button.
for (const name of WORKSPACES) {
  test(`${name}: the wheel has labelled buttons into re-phasing and the release test`, () => {
    const m = model(name);
    const scene = wheelScene(m, ctx);
    const group = (key) => scene.nodes.find((n) => n.kind === 'group' && n.key === key);
    const rephase = group('rephase-button');
    const release = group('release-test');
    assert.equal(rephase?.target, ctx.address({ page: 'rephase' }));
    assert.equal(release?.target, ctx.address({ flow: 'test-run' }));
    const unplaced = unplacedTickets(m).length;
    const count = [...walkScene(rephase.children)].find((n) => n.kind === 'text' && n.role === 'number');
    assert.equal(count.text, String(unplaced), 'the middle says how many tickets have no phase');
    assert.ok([...walkScene(release.children)].some((n) => n.kind === 'text' && n.text === 'Release test'));
    for (const id of ['rephase-button', 'release-test']) assert.ok(scene.list.some((r) => r.id === id && r.target !== undefined), `${id} is in the list twin`);
    // Nothing else is drawn in the middle: the core's rings start outside the button.
    const { WHEEL } = load('shared/overview-wheel.js');
    assert.ok(WHEEL.coreInner > 42, 'the core rings leave room for the button');
  });
}

// TASK-0154 — the gate is an arch of five segments in a fixed order; each fills with
// its done share; a part Deck cannot read is dashed, unfilled and says "not reported".
test('the gate arch draws five segments that fill with their evidence and say when they are not reported', () => {
  const { gateArch, GATE_ORDER, GATE_MEANING } = load('shared/overview-gate.js');
  const gate = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', 'flows', 'deck-accept.json'), 'utf-8'));
  for (const small of [false, true]) {
    const { nodes, rows } = gateArch(gate, 700, 500, small ? 92 : 220, { small });
    const groups = nodes.filter((n) => n.kind === 'group');
    assert.deepEqual(groups.map((g) => g.key), GATE_ORDER.map((k) => `gate-${gate.id}-${k}`), 'five segments, in order');
    assert.deepEqual(rows.map((r) => r.id), GATE_ORDER.map((k) => `gate-${k}`), 'five evidence rows');
    for (const key of GATE_ORDER) {
      const lamp = gate.lamps.find((l) => l.key === key);
      const group = groups.find((g) => g.key === `gate-${gate.id}-${key}`);
      const marks = [...walkScene(group.children)].filter((n) => n.kind === 'mark');
      const texts = [...walkScene(group.children)].filter((n) => n.kind === 'text').map((n) => n.text);
      assert.ok(group.label.includes(GATE_MEANING[key]), `${key}: the callout says what it counts`);
      assert.ok(!marks.some((m) => m.ticket !== undefined || String(m.cls ?? '').includes('sq-dot')), `${key}: no ticket identity and no needs-you dot`);
      if (lamp.known && lamp.total > 0) {
        const cells = marks.filter((m) => String(m.markId ?? '').includes('-item-'));
        if (lamp.total <= 40) {
          assert.equal(cells.length, lamp.total, `${key}: one cell per item`);
          assert.equal(cells.filter((c) => c.attrs.fill !== 'none').length, lamp.done, `${key}: the filled cells are its done count`);
        }
        assert.equal(marks.find((m) => m.markId === `gate-${gate.id}-${key}-done`).count, lamp.done);
        assert.ok(texts.includes(String(lamp.done)) && texts.includes(String(lamp.total)), `${key}: its count is shown`);
      } else {
        assert.ok(marks.every((m) => m.attrs.fill === undefined || m.attrs.fill === 'none'), `${key}: nothing is filled`);
        assert.ok(texts.includes(lamp.known ? 'nothing to check' : 'not reported'), `${key}: it says why there is no count`);
      }
    }
  }
});

// TASK-0155 — the wheel is a constellation: every ticket of an unfinished phase is one
// particle in its phase's fan, done work at the ring, what needs you in front, no two
// on one place, and a needs-you count on each segment.
for (const name of WORKSPACES) {
  test(`${name}: the wheel draws each phase as a fan of particles, done at the ring and needs-you in front`, () => {
    const m = model(name);
    const scene = wheelScene(m, ctx);
    const { WHEEL } = load('shared/overview-wheel.js');
    const distance = (n) => {
      if (n.attrs.cx !== undefined) return Math.hypot(Number(n.attrs.cx) - WHEEL.cx, Number(n.attrs.cy) - WHEEL.cy);
      const xy = String(n.attrs.points).split(/[ ,]/).map(Number);
      const xs = xy.filter((_, i) => i % 2 === 0), ys = xy.filter((_, i) => i % 2 === 1);
      return Math.hypot(xs.reduce((a, b) => a + b, 0) / xs.length - WHEEL.cx, ys.reduce((a, b) => a + b, 0) / ys.length - WHEEL.cy);
    };
    for (const phase of m.phases) {
      const sector = scene.nodes.find((n) => n.kind === 'group' && n.key === `sector-${phase.id}`);
      assert.ok(sector !== undefined, `${phase.id} is drawn`);
      const marks = [...walkScene(sector.children)].filter((n) => n.kind === 'mark' && n.ticket !== undefined);
      assert.equal(marks.length, phase.tickets.length, `${phase.id}: one particle per ticket`);
      // No two particles overlap: every pair of centres stands at least a glyph apart
      // (the review of TASK-0155 showed comparing attributes missed overlapping rows).
      const centres = marks.map((n) => {
        if (n.attrs.cx !== undefined) return [Number(n.attrs.cx), Number(n.attrs.cy), Number(n.attrs.r)];
        const xy = String(n.attrs.points).split(/[ ,]/).map(Number);
        const xs = xy.filter((_, i) => i % 2 === 0), ys = xy.filter((_, i) => i % 2 === 1);
        const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        return [cx, cy, Math.max(...xs.map((x, i) => Math.hypot(x - cx, ys[i] - cy)))];
      });
      for (let i = 0; i < centres.length; i += 1) {
        for (let j = i + 1; j < centres.length; j += 1) {
          const [x1, y1, r1] = centres[i], [x2, y2, r2] = centres[j];
          assert.ok(Math.hypot(x1 - x2, y1 - y2) >= 0.9 * Math.min(r1, r2), `${phase.id}: particles ${i} and ${j} overlap`);
        }
      }
      const r = (pred) => marks.filter((n) => pred(m.tickets[n.ticket])).map(distance);
      const front = r((t) => t.needsYou), done = r((t) => !t.needsYou && ['delivered', 'dropped'].includes(t.fill)), open = r((t) => !t.needsYou && !['delivered', 'dropped'].includes(t.fill));
      if (front.length && open.length) assert.ok(Math.max(...front) <= Math.min(...open) + 4, `${phase.id}: what needs you stands in front of open work`);
      if (open.length && done.length) assert.ok(Math.max(...open) <= Math.min(...done) + 4, `${phase.id}: open work stands in front of done work`);
      const waiting = phase.tickets.filter((id) => m.tickets[id].needsYou).length;
      const badge = [...walkScene(sector.children)].find((n) => n.kind === 'mark' && n.markId === `needs-${phase.id}`);
      if (waiting === 0) assert.equal(badge, undefined, `${phase.id}: no badge when nothing needs you`);
      else assert.equal(badge?.count, waiting, `${phase.id}: the badge counts what needs you`);
    }
  });
}

// TASK-0156 — the camera: ring screens lean back, text screens start flat; the middle
// button turns and pans, the wheel zooms toward the pointer, and 0 puts it back.
test('the overview camera turns, pans and zooms within its limits, and keeps the pointed spot under the pointer', () => {
  const cam = load('shared/overview-camera.js');
  const wheel = cam.defaultCamera('wheel');
  assert.ok(wheel.tilt > 0, 'the wheel leans back');
  assert.equal(cam.defaultCamera('ticket').tilt, 0, 'a ticket starts flat');
  assert.equal(cam.defaultCamera('accept').tilt, 0, 'a feature gate starts flat');
  const t = cam.turned(wheel, 100, -40);
  // TASK-0162: a drag to the right turns the plane anticlockwise, so its near edge
  // (the bottom of the screen, on a plane leaning back) moves right with the hand.
  assert.equal(t.spin, -30);
  assert.equal(t.tilt, wheel.tilt + 10);
  const nearEdgeX = (spin) => -Math.sin((spin * Math.PI) / 180); // the plane's bottom point after rotateZ, y down
  assert.ok(nearEdgeX(t.spin) > 0, 'the near edge goes the way the pointer went');
  assert.equal(cam.turned(wheel, 0, -10000).tilt, cam.TILT.max, 'tilt stops at its limit');
  assert.equal(cam.turned(wheel, 0, 10000).tilt, cam.TILT.min);
  const p = cam.panned(wheel, 12, -7);
  assert.deepEqual([p.panX, p.panY], [12, -7]);
  // Zooming toward a point keeps that point where it was: (point - pan) scales with the zoom.
  const z = cam.zoomed(wheel, 2, 100, 50);
  assert.equal(z.zoom, 2);
  assert.deepEqual([z.panX, z.panY], [-100, -50]);
  assert.equal(cam.zoomed(wheel, 1000).zoom, cam.ZOOM.max);
  assert.equal(cam.zoomed(wheel, 0.0001).zoom, cam.ZOOM.min);
  assert.ok(cam.wheelFactor(100) < 1 && cam.wheelFactor(-100) > 1, 'a turn toward the person zooms out');
  assert.match(cam.cameraTransform(t), /^translate\(0px, 0px\) rotateX\(36deg\) rotateZ\(-30deg\) scale\(1\)$/);
  assert.ok(cam.isDefault(cam.defaultCamera('wheel'), 'wheel'));
  assert.ok(!cam.isDefault(t, 'wheel'));
  assert.ok(cam.isDefault({ ...wheel, spin: 360 }, 'wheel'), 'a whole turn is back where it started');
  // TASK-0162: the picture cannot be lost. Zoom runs 0.6× to 4×, and a pan stops where
  // the picture's centre would leave the window.
  assert.deepEqual([cam.ZOOM.min, cam.ZOOM.max], [0.6, 4]);
  const half = { w: 400, h: 300 };
  const far = cam.panned(wheel, 5000, -5000, half);
  assert.deepEqual([far.panX, far.panY], [400, -300]);
  const pinched = cam.zoomed(wheel, 4, 10000, 10000, half);
  assert.ok(Math.abs(pinched.panX) <= 400 && Math.abs(pinched.panY) <= 300, 'zooming toward a far point keeps the centre in the window');
  // The three views: flat, leaning as the ring screens start, and nearly edge on.
  assert.deepEqual(cam.VIEWS, ['above', 'leaning', 'side']);
  const moved = { ...cam.zoomed(t, 2), panX: 50, panY: 20 };
  assert.equal(cam.viewed(moved, 'wheel', 'above').tilt, 0);
  assert.equal(cam.viewed(moved, 'wheel', 'leaning').tilt, wheel.tilt);
  assert.ok(cam.viewed(moved, 'ticket', 'leaning').tilt > 0, 'a text screen can lean too');
  assert.ok(cam.viewed(moved, 'wheel', 'side').tilt > 55);
  const side = cam.viewed(moved, 'wheel', 'side');
  assert.deepEqual([side.panX, side.panY, side.zoom, side.spin], [0, 0, 2, -30], 'a view recentres the picture and keeps the turn and the zoom');
});

// TASK-0158, TASK-0160 — a ticket that needs you says what to do, on S3 as a banner with a
// button to where you act (or the sidecar's own verbs at triage), and on S2 under its row.
test('S3 tells you what a ticket needs, with a button to where you act or the sidecar verbs at triage', () => {
  const yt = model('your-trainer');
  const deck = model('deck');
  const verbs = [{ verb: 'Accept', to: 'open', confirm: false, disabled: false, reason: '' }, { verb: 'Defer', to: 'deferred', confirm: false, disabled: false, reason: '' }, { verb: 'Decline', to: 'declined', confirm: true, disabled: false, reason: '' }];
  const pick = (m, reason) => Object.values(m.tickets).find((t) => t.needs?.reason === reason);
  const texts = (scene) => [...walkScene(scene.nodes)].filter((n) => n.kind === 'text').map((n) => n.text);
  const triage = pick(yt, 'triage');
  let scene = ticketScene(yt, triage.id, ctx, { verbs, canWrite: true });
  assert.ok(texts(scene).includes(triage.needs.say), 'the banner says what to do');
  const actions = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && n.action?.startsWith('needs:')).map((n) => n.action);
  assert.deepEqual([...actions].sort(), ['needs:declined', 'needs:deferred', 'needs:open']);
  assert.deepEqual(scene.list.filter((r) => r.action?.startsWith('needs:')).map((r) => r.action).sort(), [...actions].sort());
  holdsTheLook(scene);
  // On a page that cannot write, the verbs are shown off and do nothing.
  scene = ticketScene(yt, triage.id, ctx, { verbs, canWrite: false });
  assert.equal([...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && n.action !== undefined).length, 0);
  for (const [m, reason] of [[deck, 'review'], [deck, 'waiting'], [deck, 'ready'], [yt, 'waiting']]) {
    const t = pick(m, reason);
    const s3 = ticketScene(m, t.id, ctx);
    const go = s3.nodes.find((n) => n.kind === 'group' && n.key === 'needs-go');
    assert.equal(go?.target, ctx.address(t.needs.action.parts), `${t.id} (${reason}): the button goes where the person acts`);
    assert.ok(texts(s3).includes(t.needs.say));
    holdsTheLook(s3);
  }
  // A ticket that needs nothing has no banner.
  const calm = Object.values(deck.tickets).find((t) => !t.needsYou && t.kind === 'task');
  assert.ok(!ticketScene(deck, calm.id, ctx).nodes.some((n) => n.kind === 'mark' && n.markId === 'needs'));
});

test('S2 says under each needs-you row what to do, and the callouts say it too', () => {
  const m = model('deck');
  const { markWords } = load('shared/overview-marks.js');
  for (const p of m.phases) {
    const panel = [...walkScene(phaseScene(m, p.id, ctx).nodes)].find((n) => n.kind === 'panel');
    for (const row of panel.body.sections.find((s) => s.key === 'needs-you')?.rows ?? []) {
      assert.equal(row.note, m.tickets[row.id].needs.say, `${row.id}: what to do is under its title`);
      assert.ok(markWords(m.tickets[row.id]).endsWith(`: ${m.tickets[row.id].needs.say}`), `${row.id}: its callout says what to do`);
    }
  }
});

// The review of TASK-0155: a phase busier than either fixture still draws every ticket,
// each on its own place, rather than an empty fan.
test('a phase with thousands of tickets still draws every one of them, each on its own place', () => {
  const { fanPlaces, WHEEL } = load('shared/overview-wheel.js');
  for (const [count, share] of [[1500, 1 / 30], [5000, 1 / 10], [20000, 1 / 30]]) {
    const places = fanPlaces(count, WHEEL.cx, WHEEL.cy, WHEEL.coreOuter + 16, WHEEL.ringOuter - 10, 0, Math.PI * 2 * share);
    assert.equal(places.length, count, `${count} tickets in ${share.toFixed(3)} of the wheel`);
    assert.equal(new Set(places.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)).size, count, 'no two on one place');
  }
});
