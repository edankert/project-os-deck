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

const WORKSPACES = ['deck', 'your-trainer'];
const model = (name) => JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${name}.json`), 'utf-8'));
const ctx = plainContext('abcd1234', 'features');
const TICKET_ID = /^[A-Z]+-\d+/;

/** How many times each id is drawn as a mark. */
function drawn(scene) {
  const out = new Map();
  for (const node of walkScene(scene.nodes)) {
    if (node.kind === 'mark' && node.ticket !== undefined) out.set(node.ticket, (out.get(node.ticket) ?? 0) + 1);
  }
  return out;
}

/** The look's rules 1, 2 and 5, as far as this lane can check them before FEAT-0026's module lands. */
function holdsTheLook(scene) {
  const words = [];
  const marks = new Map();
  for (const node of walkScene(scene.nodes)) if (node.kind === 'mark' && node.markId !== undefined) marks.set(node.markId, node);
  for (const node of walkScene(scene.nodes)) {
    if (node.kind !== 'text' || !node.rest) continue;
    if (node.role === 'number') {
      const mark = marks.get(node.markRef);
      assert.ok(mark !== undefined, `${scene.screen}: the number "${node.text}" names no mark (${node.markRef})`);
      assert.equal(mark.count, Number(node.text), `${scene.screen}: the number "${node.text}" and its mark disagree`);
      continue;
    }
    if (node.role === 'id') continue;
    // A name's digits are part of the name; it still counts as words.
    words.push(...node.text.split(/\s+/).filter((w) => w !== '' && !TICKET_ID.test(w)));
  }
  assert.ok(words.length <= 60, `${scene.screen}: ${words.length} words at rest: ${words.join(' ')}`);
  const marked = new Set(drawn(scene).keys());
  const listed = new Set(scene.list.map((r) => r.id).filter((id) => TICKET_ID.test(id) && !id.startsWith('PHASE-')));
  assert.deepEqual([...marked].filter((id) => !listed.has(id)), [], `${scene.screen}: drawn but not in the list twin`);
  assert.deepEqual([...listed].filter((id) => !marked.has(id)), [], `${scene.screen}: in the list twin but not drawn`);
  assert.ok(scene.address.startsWith('deck://abcd1234/features?'), scene.address);
  // It must serialise: the renderer and the plates both draw the SVG.
  assert.match(sceneToSvg(scene, { standalone: true }), /^<svg /);
  return words.length;
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
      const front = p.tickets.filter((id) => bandOf(m.tickets[id].state) === 0).sort();
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
      for (const n of neighboursOf(m, t.id)) assert.equal(counts.get(n.id), 1, `${t.id}: neighbour ${n.id}`);
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
