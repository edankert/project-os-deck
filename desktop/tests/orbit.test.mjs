// TST-0047 — the orbit's layout is solved once and kept, a new note moves
// nothing already placed, an orphan and a cluster hanging by one link are
// marked, and nearer means more linked-to (TASK-0002, TST-0025's automated half).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { layoutOrbit, bridgesOf, orphansOf, orbitSlot, ORPHAN_V, ORBIT_NEAR, ORBIT_FAR } = load('shared/orbit.js');

function node(id, phase = 'P1', inbound = 0) {
  return { id, rel: `${id}.md`, title: id, type: 'note', status: 'open', band: 'active', phase, inbound };
}
function edge(source, target) {
  return { source, target, wrote: target, offset: 0, resolved: true, crossRepo: false };
}

/** A main cluster of 30, a planted cluster of 4 joined to it by one link, and a planted orphan. */
function planted() {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < 30; i += 1) nodes.push(node(`M${i}`, 'P1'));
  for (let i = 0; i < 30; i += 1) {
    edges.push(edge(`M${i}`, `M${(i + 1) % 30}`));
    edges.push(edge(`M${i}`, `M${(i + 7) % 30}`));
  }
  for (let i = 0; i < 4; i += 1) nodes.push(node(`C${i}`, 'P2'));
  edges.push(edge('C0', 'C1'), edge('C1', 'C2'), edge('C2', 'C3'), edge('C3', 'C0'), edge('C0', 'C2'));
  edges.push(edge('C0', 'M0'));
  nodes.push(node('ORPHAN', 'P1'));
  return { nodes, edges };
}

test('a corpus fills the cylinder rather than contracting into a line', () => {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < 240; i += 1) nodes.push(node(`N${i}`, `P${i % 6}`));
  for (let i = 0; i < 2400; i += 1) edges.push(edge(`N${(i * 7919) % 240}`, `N${(i * 104729 + 13) % 240}`));
  const { layout } = layoutOrbit({ nodes, edges });
  const ps = Object.values(layout.places);
  const vs = ps.map((p) => p.v).sort((a, b) => a - b);
  const spreadV = vs[Math.floor(vs.length * 0.9)] - vs[Math.floor(vs.length * 0.1)];
  // How much of the way round the notes cover: the largest empty gap, taken away.
  const us = ps.map((p) => p.u).sort((a, b) => a - b);
  let gap = 1 - us[us.length - 1] + us[0];
  for (let i = 1; i < us.length; i += 1) gap = Math.max(gap, us[i] - us[i - 1]);
  assert.ok(spreadV > 0.8, `the notes use ${spreadV.toFixed(2)} of the height`);
  assert.ok(1 - gap > 0.7, `the notes cover ${(1 - gap).toFixed(2)} of the way round`);
});

test('two solves of the same corpus give identical positions', () => {
  const a = layoutOrbit(planted()).layout;
  const b = layoutOrbit(planted()).layout;
  assert.deepEqual(a, b);
});

test('a planted orphan stands in the orphan band, apart from the crowd', () => {
  const graph = planted();
  assert.deepEqual(orphansOf(graph), ['ORPHAN']);
  const { layout } = layoutOrbit(graph);
  assert.deepEqual(layout.orphans, ['ORPHAN']);
  assert.equal(layout.places.ORPHAN.v, ORPHAN_V);
  const others = Object.entries(layout.places).filter(([id]) => id !== 'ORPHAN');
  assert.ok(others.every(([, p]) => p.v > ORPHAN_V + 0.05), 'another note stands in the orphan band');
});

test('a cluster joined by one link is found, and a leaf is not', () => {
  const graph = planted();
  graph.nodes.push(node('LEAF', 'P1'));
  graph.edges.push(edge('LEAF', 'M5'));
  const bridges = bridgesOf(graph);
  assert.equal(bridges.length, 1, JSON.stringify(bridges));
  assert.deepEqual([bridges[0].a, bridges[0].b].sort(), ['C0', 'M0']);
  assert.equal(bridges[0].side, 4);
  assert.equal(bridgesOf(graph, 1).some((b) => [b.a, b.b].includes('LEAF')), true, 'with no minimum, a leaf is a bridge too');
});

test('the planted cluster stands apart from the main one', () => {
  const { layout } = layoutOrbit(planted());
  const wrap = (d) => d - Math.round(d);
  const centre = (prefix) => {
    const ps = Object.entries(layout.places).filter(([id]) => id.startsWith(prefix)).map(([, p]) => p);
    const x = ps.reduce((s, p) => s + Math.cos(p.u * 2 * Math.PI), 0);
    const y = ps.reduce((s, p) => s + Math.sin(p.u * 2 * Math.PI), 0);
    return { u: (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1, v: ps.reduce((s, p) => s + p.v, 0) / ps.length, ps };
  };
  const c = centre('C');
  const m = centre('M');
  const spread = Math.max(...c.ps.map((p) => Math.hypot(wrap(p.u - c.u), (p.v - c.v) / 2)));
  const apart = Math.hypot(wrap(c.u - m.u), (c.v - m.v) / 2);
  assert.ok(apart > spread, `the cluster (spread ${spread.toFixed(3)}) sits inside the crowd (apart ${apart.toFixed(3)})`);
});

test('a note added and linked moves no note already placed, and lands near its links', () => {
  const graph = planted();
  const first = layoutOrbit(graph).layout;
  graph.nodes.push(node('NEW', 'P1'));
  graph.edges.push(edge('NEW', 'M3'), edge('NEW', 'M4'), edge('M5', 'NEW'));
  const { layout, drift, solvedAgain } = layoutOrbit(graph, first);
  assert.equal(solvedAgain, false);
  assert.equal(drift, 0, 'an existing note moved');
  for (const [id, p] of Object.entries(first.places)) assert.deepEqual(layout.places[id], p, `${id} moved`);
  const wrap = (d) => d - Math.round(d);
  const near = ['M3', 'M4', 'M5'].map((id) => Math.hypot(wrap(layout.places.NEW.u - layout.places[id].u), (layout.places.NEW.v - layout.places[id].v) / 2));
  assert.ok(Math.min(...near) < 0.2, `the new note landed far from its links (${near.map((d) => d.toFixed(2)).join(', ')})`);
});

test('a material change solves again from scratch, and says so', () => {
  const graph = planted();
  const first = layoutOrbit(graph).layout;
  for (let i = 0; i < 20; i += 1) graph.nodes.push(node(`X${i}`, 'P3'));
  for (let i = 0; i < 20; i += 1) graph.edges.push(edge(`X${i}`, `X${(i + 1) % 20}`));
  const { solvedAgain } = layoutOrbit(graph, first);
  assert.equal(solvedAgain, true);
});

test('nearer means more linked-to, and round the cylinder is the note’s place', () => {
  const most = orbitSlot({ u: 0.25, v: 0 }, 50, 50);
  const none = orbitSlot({ u: 0.25, v: 0 }, 0, 50);
  assert.equal(most.depth, ORBIT_NEAR);
  assert.equal(none.depth, ORBIT_FAR);
  assert.ok(Math.abs(most.theta - Math.PI / 2) < 1e-9);
  assert.ok(orbitSlot({ u: 0.75, v: 0 }, 0, 1).theta < 0, 'past half-way round is to the left');
});

test('a corpus the size of the cockpit’s is solved in a bounded time', () => {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < 1600; i += 1) nodes.push(node(`N${i}`, `P${i % 12}`));
  for (let i = 0; i < 16000; i += 1) edges.push(edge(`N${(i * 7919) % 1600}`, `N${(i * 104729 + 13) % 1600}`));
  const started = Date.now();
  const { layout } = layoutOrbit({ nodes, edges });
  const ms = Date.now() - started;
  assert.equal(Object.keys(layout.places).length, 1600);
  assert.ok(ms < 20000, `the solve took ${ms}ms`);
  console.log(`# a 1600-note, 16000-link corpus was laid out in ${ms}ms`);
});
