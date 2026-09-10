/**
 * The orbit arrangement's layout: the whole link graph on the cylinder, where
 * distance is connectedness (TASK-0002).
 *
 * **Solved once and kept.** A force layout over thousands of links cannot run
 * on every open, and a field that settles differently each time cannot be
 * learned. So the layout is solved, stored, and treated as data: the same
 * notes and links give the same positions, and a note that arrives takes a
 * place near its links without moving anything already there.
 *
 * **What the three coordinates mean.** Round the cylinder is a note's cluster:
 * each phase gets an arc in proportion to its size, and the links pull a note
 * toward what it is joined to. Up and down is spread within the cluster.
 * Distance from the person is how much the corpus points at the note: the
 * most linked-to notes stand nearest.
 *
 * **Two questions the orbit exists to answer get a mark rather than a hope.**
 * A note nothing links to and that links to nothing is an ORPHAN and stands in
 * a band of its own along the top, so it cannot be hidden in the crowd. And a
 * link that is the only thing joining a cluster of three or more notes to the
 * rest is a BRIDGE, found by Tarjan's bridge algorithm and drawn in its own
 * colour: that is "which clusters hang by a single edge", from FEAT-0001.
 *
 * Pure and deterministic: a seeded generator, no clock, no randomness, so the
 * test that two loads give identical positions is a test of this module.
 */
import type { Graph, GraphNode } from './graph.js';

export interface OrbitPlace {
  /** Round the cylinder, 0 to 1. */
  u: number;
  /** Up and down, -1 to 1. */
  v: number;
}

export interface OrbitLayout {
  /** What the layout was solved for, so a stored one is used only for the same corpus. */
  version: number;
  places: Record<string, OrbitPlace>;
  /** Notes with no link in or out. */
  orphans: string[];
}

export const ORBIT_LAYOUT_VERSION = 3;
/** Where the orphan band stands: along the top of the cylinder (negative is up on screen). */
export const ORPHAN_V = -0.96;
/** How much of the corpus may change before a stored layout is solved again from scratch. */
export const MATERIAL_CHANGE = 0.15;
/** Nearest and furthest a node stands. */
export const ORBIT_NEAR = 400;
export const ORBIT_FAR = 1150;

/** A small seeded generator (mulberry32), so a layout is the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The shortest signed distance round the cylinder, -0.5 to 0.5. */
function wrap(d: number): number {
  return d - Math.round(d);
}

function undirected(graph: Graph): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const node of graph.nodes) out.set(node.id, new Set());
  for (const edge of graph.edges) {
    if (edge.target === null || edge.target === edge.source) continue;
    if (!out.has(edge.source) || !out.has(edge.target)) continue;
    out.get(edge.source)?.add(edge.target);
    out.get(edge.target)?.add(edge.source);
  }
  return out;
}

export function orphansOf(graph: Graph): string[] {
  const links = undirected(graph);
  return graph.nodes.filter((n) => (links.get(n.id)?.size ?? 0) === 0).map((n) => n.id);
}

/**
 * Solve the layout, keeping every place in `previous` that is still a node.
 *
 * With a previous layout and a small change, existing notes are PINNED and
 * only the newcomers are placed and relaxed, so the drift of an existing note
 * is zero by construction. Past `MATERIAL_CHANGE` the whole corpus is solved
 * again, and `drift` reports how far existing notes moved.
 */
export function layoutOrbit(
  graph: Graph,
  previous: OrbitLayout | null = null,
  iterations = 160,
): { layout: OrbitLayout; drift: number; solvedAgain: boolean } {
  const ids = graph.nodes.map((n) => n.id);
  const links = undirected(graph);
  const orphans = new Set(orphansOf(graph));
  const kept = previous !== null && previous.version === ORBIT_LAYOUT_VERSION ? previous.places : {};
  const newcomers = ids.filter((id) => kept[id] === undefined);
  const fresh = previous === null || newcomers.length > ids.length * MATERIAL_CHANGE;
  const places: Record<string, OrbitPlace> = {};
  const pinned = new Set<string>();
  if (!fresh) {
    for (const id of ids) {
      const at = kept[id];
      if (at !== undefined) {
        places[id] = { u: at.u, v: at.v };
        pinned.add(id);
      }
    }
  }

  // Seed: each phase an arc in proportion to its size, in phase order.
  const clusterOf = (n: GraphNode): string => n.phase ?? '~none';
  const clusters = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (orphans.has(node.id)) continue;
    const key = clusterOf(node);
    clusters.set(key, [...(clusters.get(key) ?? []), node.id]);
  }
  const keys = [...clusters.keys()].sort();
  const total = [...clusters.values()].reduce((n, c) => n + c.length, 0) || 1;
  const arc = new Map<string, [number, number]>();
  let start = 0;
  for (const key of keys) {
    const width = (clusters.get(key)?.length ?? 0) / total;
    arc.set(key, [start, start + width]);
    start += width;
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const id of ids) {
    if (places[id] !== undefined) continue;
    const random = seeded(hash(id));
    const node = byId.get(id) as GraphNode;
    if (orphans.has(id)) {
      // The orphan band: spread along the top, in id order, so each is apart.
      continue;
    }
    // A newcomer with placed neighbours starts at their circular mean.
    const near = [...(links.get(id) ?? [])].map((n) => places[n]).filter((p): p is OrbitPlace => p !== undefined);
    if (!fresh && near.length > 0) {
      const sx = near.reduce((s, p) => s + Math.cos(p.u * 2 * Math.PI), 0);
      const sy = near.reduce((s, p) => s + Math.sin(p.u * 2 * Math.PI), 0);
      const u = (Math.atan2(sy, sx) / (2 * Math.PI) + 1) % 1;
      const v = near.reduce((s, p) => s + p.v, 0) / near.length;
      places[id] = { u: (u + (random() - 0.5) * 0.01 + 1) % 1, v: clampV(v + (random() - 0.5) * 0.05) };
      continue;
    }
    const [a, b] = arc.get(clusterOf(node)) ?? [0, 1];
    places[id] = { u: (a + random() * (b - a)) % 1, v: clampV((random() * 2 - 1) * 0.8) };
  }
  const orphanList = ids.filter((id) => orphans.has(id)).sort();
  orphanList.forEach((id, i) => {
    if (places[id] !== undefined && pinned.has(id)) return;
    places[id] = { u: (i + 0.5) / Math.max(1, orphanList.length), v: ORPHAN_V };
  });

  // Relax: links pull, nearby notes push, on a cylinder that wraps round.
  const movable = ids.filter((id) => !pinned.has(id) && !orphans.has(id));
  if (movable.length > 0) relax(places, movable, links, iterations, ids.filter((id) => !orphans.has(id)));
  // A fresh solve is spread to fill the cylinder (see `spread`); a newcomer
  // placed among kept notes is already in the spread coordinates.
  if (fresh) spread(places, ids.filter((id) => !orphans.has(id)));

  let drift = 0;
  if (previous !== null) {
    for (const id of ids) {
      const was = previous.places[id];
      const now = places[id];
      if (was === undefined || now === undefined) continue;
      drift = Math.max(drift, Math.hypot(wrap(now.u - was.u), (now.v - was.v) / 2));
    }
  }
  return { layout: { version: ORBIT_LAYOUT_VERSION, places, orphans: orphanList }, drift, solvedAgain: fresh };
}

/** The layout's own height: the orphan band keeps the top to itself. */
function clampV(v: number): number {
  return Math.max(-0.86, Math.min(0.9, v));
}

/**
 * Spread a solved layout so it fills the cylinder, keeping every note's order.
 *
 * A real corpus is dominated by a few notes that most others link to, a
 * phase above all, and their pull draws the whole layout toward one height
 * and one arc: this repository's 234 notes stood in a thin line across a
 * quarter of the turn. So after relaxing, each coordinate is blended with its
 * RANK: the order round the cylinder and up it is kept, clusters stay
 * together, and the notes use the whole surface. Round the cylinder is first
 * cut at its widest empty gap, so a cluster is not split across the seam.
 */
function spread(places: Record<string, OrbitPlace>, ids: string[]): void {
  if (ids.length < 3) return;
  const RAW = 0.35;
  const us = ids.map((id) => (places[id] as OrbitPlace).u).sort((a, b) => a - b);
  let cut = us[0] as number;
  let widest = 1 - (us[us.length - 1] as number) + (us[0] as number);
  for (let i = 1; i < us.length; i += 1) {
    const gap = (us[i] as number) - (us[i - 1] as number);
    if (gap > widest) {
      widest = gap;
      cut = us[i] as number;
    }
  }
  const round = ids.map((id) => ({ id, u: ((((places[id] as OrbitPlace).u - cut) % 1) + 1) % 1 })).sort((a, b) => a.u - b.u || a.id.localeCompare(b.id));
  const span = Math.max(1e-9, (round[round.length - 1] as { u: number }).u);
  round.forEach((entry, rank) => {
    const p = places[entry.id] as OrbitPlace;
    places[entry.id] = { u: RAW * (entry.u / span) * 0.98 + (1 - RAW) * ((rank + 0.5) / round.length), v: p.v };
  });
  const up = ids.map((id) => ({ id, v: (places[id] as OrbitPlace).v })).sort((a, b) => a.v - b.v || a.id.localeCompare(b.id));
  const low = (up[0] as { v: number }).v;
  const high = (up[up.length - 1] as { v: number }).v;
  const range = Math.max(1e-9, high - low);
  const top = -0.82;
  const bottom = 0.88;
  up.forEach((entry, rank) => {
    const p = places[entry.id] as OrbitPlace;
    const t = RAW * ((entry.v - low) / range) + (1 - RAW) * ((rank + 0.5) / up.length);
    places[entry.id] = { u: p.u, v: top + t * (bottom - top) };
  });
}

/**
 * Fruchterman–Reingold on the cylinder's surface.
 *
 * The ideal spacing `k` is set so the notes FILL the cylinder: the surface is
 * one turn round by the height the layout may use, so `k` is the square root
 * of that area over the number of notes. Notes push each other apart by
 * k²/d, within 2k (the grid variant, which keeps a step linear), and a link
 * pulls its two ends together by d²/k. The step is limited by a temperature
 * that cools to nothing, so the layout settles. Round the cylinder wraps;
 * up and down does not.
 *
 * The first version pulled linearly and pushed only at very short range, and
 * a real corpus contracted into one thin line across a few degrees of arc.
 */
function relax(
  places: Record<string, OrbitPlace>,
  movable: string[],
  links: Map<string, Set<string>>,
  iterations: number,
  everyone: string[],
): void {
  const n = everyone.length;
  const HEIGHT = 0.9; // w = v / 2 runs from -0.45 to 0.45
  const k = Math.sqrt(HEIGHT / Math.max(1, n)) * 0.9;
  const reach = 2 * k;
  const columns = Math.max(1, Math.floor(1 / reach));
  const rows = Math.max(1, Math.ceil(HEIGHT / reach));
  for (let step = 0; step < iterations; step += 1) {
    const heat = 0.1 * (1 - step / iterations) + 0.001;
    const grid = new Map<number, string[]>();
    const cellOf = (p: OrbitPlace): [number, number] => [
      Math.floor(p.u * columns) % columns,
      Math.max(0, Math.min(rows - 1, Math.floor((p.v / 2 + HEIGHT / 2) / reach))),
    ];
    for (const id of everyone) {
      const [c, r] = cellOf(places[id] as OrbitPlace);
      const key = r * columns + c;
      const list = grid.get(key);
      if (list === undefined) grid.set(key, [id]);
      else list.push(id);
    }
    const moves = new Map<string, [number, number]>();
    for (const id of movable) {
      const p = places[id] as OrbitPlace;
      let fx = 0;
      let fy = 0;
      const [c, r] = cellOf(p);
      for (let dr = -1; dr <= 1; dr += 1) {
        const rr = r + dr;
        if (rr < 0 || rr >= rows) continue;
        for (let dc = -1; dc <= 1; dc += 1) {
          const cc = (c + dc + columns) % columns;
          for (const other of grid.get(rr * columns + cc) ?? []) {
            if (other === id) continue;
            const q = places[other] as OrbitPlace;
            const dx = wrap(p.u - q.u);
            const dy = (p.v - q.v) / 2;
            const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
            if (d > reach) continue;
            const push = (k * k) / d;
            fx += (dx / d) * push;
            fy += (dy / d) * push;
          }
        }
      }
      for (const other of links.get(id) ?? []) {
        const q = places[other];
        if (q === undefined) continue;
        const dx = wrap(q.u - p.u);
        const dy = (q.v - p.v) / 2;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const pull = (d * d) / k;
        fx += (dx / d) * pull;
        fy += (dy / d) * pull;
      }
      moves.set(id, [fx, fy]);
    }
    for (const id of movable) {
      const [fx, fy] = moves.get(id) as [number, number];
      const length = Math.hypot(fx, fy);
      if (length === 0) continue;
      const limit = Math.min(length, heat);
      const p = places[id] as OrbitPlace;
      places[id] = { u: (((p.u + (fx / length) * limit) % 1) + 1) % 1, v: clampV(p.v + (fy / length) * limit * 2) };
    }
  }
}

/**
 * The links that alone hold a cluster of `minimum` or more notes to the rest.
 *
 * Tarjan's bridge-finding over the undirected link graph, iteratively, so a
 * corpus of thousands of notes does not overflow the stack. A bridge whose
 * smaller side is a single note is just a leaf, and there are hundreds of
 * those; the question FEAT-0001 asks is about clusters.
 */
export function bridgesOf(graph: Graph, minimum = 3): Array<{ a: string; b: string; side: number }> {
  const links = undirected(graph);
  const ids = [...links.keys()];
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const size = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const componentSize = new Map<string, number>();
  const out: Array<{ a: string; b: string; side: number }> = [];
  let counter = 0;
  for (const root of ids) {
    if (index.has(root)) continue;
    const members: string[] = [];
    const stack: Array<{ id: string; neighbours: string[]; at: number }> = [];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    parent.set(root, null);
    size.set(root, 1);
    stack.push({ id: root, neighbours: [...(links.get(root) ?? [])], at: 0 });
    members.push(root);
    const tree: Array<[string, string]> = [];
    while (stack.length > 0) {
      const top = stack[stack.length - 1] as { id: string; neighbours: string[]; at: number };
      if (top.at < top.neighbours.length) {
        const next = top.neighbours[top.at] as string;
        top.at += 1;
        if (!index.has(next)) {
          index.set(next, counter);
          low.set(next, counter);
          counter += 1;
          parent.set(next, top.id);
          size.set(next, 1);
          members.push(next);
          stack.push({ id: next, neighbours: [...(links.get(next) ?? [])], at: 0 });
        } else if (parent.get(top.id) !== next) {
          low.set(top.id, Math.min(low.get(top.id) as number, index.get(next) as number));
        }
        continue;
      }
      stack.pop();
      const up = parent.get(top.id);
      if (up !== null && up !== undefined) {
        low.set(up, Math.min(low.get(up) as number, low.get(top.id) as number));
        size.set(up, (size.get(up) as number) + (size.get(top.id) as number));
        if ((low.get(top.id) as number) > (index.get(up) as number)) tree.push([up, top.id]);
      }
    }
    for (const m of members) componentSize.set(m, members.length);
    for (const [a, b] of tree) {
      const below = size.get(b) as number;
      const side = Math.min(below, members.length - below);
      if (side >= minimum) out.push({ a, b, side });
    }
  }
  return out;
}

/**
 * Where an orbit node stands on the cylinder: round by its place, up by its
 * place, and nearer the more the corpus points at it.
 */
export function orbitSlot(place: OrbitPlace, inbound: number, maxInbound: number): { theta: number; depth: number; y: number } {
  const connected = maxInbound <= 0 ? 0 : Math.log1p(inbound) / Math.log1p(maxInbound);
  const theta = place.u * 2 * Math.PI;
  return {
    theta: theta > Math.PI ? theta - 2 * Math.PI : theta,
    depth: ORBIT_NEAR + (1 - connected) * (ORBIT_FAR - ORBIT_NEAR),
    y: place.v * 420,
  };
}
