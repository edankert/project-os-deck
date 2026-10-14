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

/** How many times each id is drawn as a mark. */
function drawn(scene) {
  const out = new Map();
  for (const node of walkScene(scene.nodes)) {
    if (node.kind === 'mark' && node.ticket !== undefined) out.set(node.ticket, (out.get(node.ticket) ?? 0) + 1);
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

  test(`${name}: every phase opens as its web, its exit ring and its depth field`, () => {
    const m = model(name);
    for (const p of [...m.phases, ...m.shelf, ...m.backlog]) {
      const scene = phaseScene(m, p.id, ctx);
      const counts = drawn(scene);
      for (const id of p.tickets) assert.equal(counts.get(id), 1, `${p.id}: ${id} drawn ${counts.get(id) ?? 0} times`);
      holdsTheLook(scene);
      // The front band is exactly what needs a person.
      // Computed here from the states, not with the module's own band rule.
      const front = p.tickets.filter((id) => ['failed', 'owed'].includes(m.tickets[id].state)).sort();
      const listedFront = scene.list.filter((r) => r.group === 'Needs you').map((r) => r.id).sort();
      assert.deepEqual(listedFront, front, p.id);
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
  test(`${name}: no two neighbours of a ticket share a place, even for the most linked tickets`, () => {
    const m = model(name);
    // Each ticket's degree, worked out once: sorting by linkedTo() directly scans the
    // whole corpus per comparison and took 17 seconds on your-trainer.
    const degree = new Map(Object.keys(m.tickets).map((id) => [id, new Set(m.tickets[id].links.filter((o) => o !== id && m.tickets[o] !== undefined))]));
    for (const t of Object.values(m.tickets)) for (const o of t.links) if (o !== t.id && degree.has(o)) degree.get(o).add(t.id);
    const busiest = Object.values(m.tickets).sort((a, b) => degree.get(b.id).size - degree.get(a.id).size).slice(0, 25);
    for (const t of busiest) {
      const scene = ticketScene(m, t.id, ctx);
      const marks = [...walkScene(scene.nodes)].filter((n) => n.kind === 'mark' && n.ticket !== undefined && n.ticket !== t.id);
      const places = new Set(marks.map(placeOf));
      assert.equal(places.size, marks.length, `${t.id}: ${marks.length} neighbours on ${places.size} places`);
      for (const n of marks) {
        const y = Number(n.attrs.cy ?? String(n.attrs.points).split(/[ ,]/)[1]);
        assert.ok(y > 340 && y < 990, `${t.id}: ${n.ticket} at y ${y} runs into the track or off the screen`);
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
    for (const t of Object.values(m.tickets)) if (['failed', 'owed'].includes(t.state)) assert.ok(glowing.has(t.id), `${t.id} needs a person and does not glow`);
  });
}
