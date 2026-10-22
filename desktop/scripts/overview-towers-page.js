// TASK-0163 — the towers page's own code, inlined into DES-0005-towers.html by
// overview-towers.mjs. A browser module: three.js comes from the page's import map.
//
// The ring holds the unfinished phases. Each is a raised segment; its features
// stand on it as towers, one floor per ticket, and its tickets with no feature
// lie flat at the front. Finished phases stand outside the ring as solid blocks;
// the core holds the tickets with no phase. Marks are the cockpit's: the type
// colour, DES-0004's fill (solid done, half in progress, outline not started,
// dashed resolved or parked), and the red needs-you dot.
import * as THREE from 'three';

const DATA = JSON.parse(document.getElementById('data').textContent);
const MARK = JSON.parse(document.getElementById('marks').textContent);
const [ID, TYPE, FILL, NEEDS, STATUS, TITLE, SAY, STATE, REASON] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const colourOf = (h) => new THREE.Color((h ?? 'hsl(0 0% 60%)').replace(/hsl\((\d+) (\d+)% (\d+)%\)/, 'hsl($1, $2%, $3%)'));
const NEEDS_COLOUR = colourOf(MARK.needs);
const EXIT_COLOUR = colourOf(MARK.exit);
const FOCUS_COLOUR = new THREE.Color('hsl(190, 100%, 72%)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#030712');
scene.fog = new THREE.Fog('#030712', 260, 620);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
scene.add(new THREE.AmbientLight(0xbfdfff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(80, 160, 60);
scene.add(sun);

// ---------------------------------------------------------------------------
// Sizes, in world units. A floor holds two tickets side by side, facing out.
const CUBE = 1.25;
const GAP = 0.2;
const PER_FLOOR = 2;
const FLOOR = CUBE + 0.14;
const TOWER = PER_FLOOR * CUBE + GAP; // a tower's width along the ring
const TOWER_DEPTH = CUBE; // and its depth across it
const TOWER_STEP = TOWER + 1.4;
const TOWER_ROW = TOWER_DEPTH + 2.4;
const TILE_STEP = 1.2;
const PLINTH = { planned: 0.5, active: 1.6, focus: 2.6 };
const SEG_GAP = 0.035;

const polar = (r, a) => new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a));

/** Every label, so each frame can size it: near ones less huge, far ones less small. */
const labels = [];
function label(text, size = 3, colour = '#bfe9ff', weight = 600, onTop = false) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const px = 56;
  const font = weight + ' ' + px + 'px -apple-system, Helvetica, Arial, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 20;
  c.width = w;
  c.height = px + 20;
  g.font = font;
  g.fillStyle = colour;
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 8;
  g.fillText(text, 10, c.height / 2);
  // A label hides behind what stands in front of it, except the few that say what is next.
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: !onTop }));
  s.scale.set((size * w) / c.height, size, 1);
  s.userData.size = [(size * w) / c.height, size];
  s.renderOrder = onTop ? 11 : 10;
  labels.push(s);
  return s;
}

/** Lines stacked in one label, so a name and its counts never part, from any side. */
function stacked(lines, onTop = false) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const px = 56;
  const fonts = lines.map((l) => (l.weight ?? 600) + ' ' + Math.round(px * l.size / lines[0].size) + 'px -apple-system, Helvetica, Arial, sans-serif');
  const heights = lines.map((l) => Math.round(px * l.size / lines[0].size) + 10);
  let w = 0;
  lines.forEach((l, i) => {
    g.font = fonts[i];
    w = Math.max(w, Math.ceil(g.measureText(l.text).width) + 20);
  });
  c.width = w;
  c.height = heights.reduce((a, b) => a + b, 0) + 10;
  let y = 5;
  lines.forEach((l, i) => {
    g.font = fonts[i];
    g.fillStyle = l.colour;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 8;
    g.fillText(l.text, w / 2, y + heights[i] / 2);
    y += heights[i];
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: !onTop }));
  const size = (lines[0].size * c.height) / (heights[0] + 5);
  s.scale.set((size * w) / c.height, size, 1);
  s.userData.size = [(size * w) / c.height, size];
  s.renderOrder = onTop ? 11 : 10;
  labels.push(s);
  return s;
}

function sectorShape(r0, r1, a0, a1) {
  // Shape coordinates (x, y) become world (x, z) once the mesh is turned flat.
  const s = new THREE.Shape();
  s.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
  s.absarc(0, 0, r1, a0, a1, false);
  s.lineTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

function slab(shape, height, material) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 48 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = height;
  return mesh;
}

function arcLine(r, a0, a1, y, material) {
  const points = [];
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * 40));
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    points.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

// ---------------------------------------------------------------------------
// The marks. Every cube is collected into one phase's buckets, then drawn as a
// few instanced meshes and two line sets, so thousands of tickets stay cheap.
const UNIT_EDGES = (() => {
  const c = [-0.5, 0.5];
  const v = [];
  for (const x of c) for (const y of c) for (const z of c) v.push(new THREE.Vector3(x, y, z));
  const pairs = [];
  for (let i = 0; i < 8; i += 1) for (let j = i + 1; j < 8; j += 1) {
    const d = v[i].clone().sub(v[j]);
    if (Math.abs(d.length() - 1) < 1e-6) pairs.push([v[i], v[j]]);
  }
  return pairs;
})();

function newBuckets() {
  return { solid: [], glass12: [], glass22: [], glass45: [], edges: [], dashed: [], dots: [], pick: [], pulse: [] };
}

/**
 * One ticket's cube: at `at`, size (sx, sy, sz) with sx along the radius, turned
 * to face the middle. Its fill decides which buckets it joins (DES-0004).
 */
function addCube(b, r, at, size, angle, options = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
  const colour = colourOf(MARK.type[r[TYPE]]);
  if (options.dim) colour.multiplyScalar(0.55);
  const full = new THREE.Matrix4().compose(at, q, size);
  const fill = r[FILL];
  if (fill === 'delivered') b.solid.push([full, colour]);
  else if (fill === 'doing') {
    const lower = new THREE.Matrix4().compose(at.clone().add(new THREE.Vector3(0, -size.y / 4, 0)), q, new THREE.Vector3(size.x, size.y / 2, size.z));
    b.solid.push([lower, colour]);
    b.glass12.push([full, colour]);
    b.edges.push([full, colour]);
  } else if (fill === 'unproven') {
    b.glass45.push([full, colour]);
    b.edges.push([full, colour]);
  } else if (fill === 'dropped') {
    b.glass22.push([full, colour.clone().lerp(new THREE.Color('#556070'), 0.5)]);
    b.dashed.push([full, colour]);
  } else if (fill === 'deferred') b.dashed.push([full, colour]);
  else {
    b.glass12.push([full, colour]);
    b.edges.push([full, colour]);
  }
  if (r[NEEDS]) {
    // The cockpit's red needs-you dot, on the cube's outer top corner.
    const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(size.x / 2);
    b.dots.push(at.clone().add(out).add(new THREE.Vector3(0, size.y / 2 + 0.12, 0)));
  }
  b.pick.push([full, r, options.where]);
  if (options.pulse) b.pulse.push(full);
}

function instanced(geometry, material, items) {
  if (items.length === 0) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  items.forEach(([m, c], i) => {
    mesh.setMatrixAt(i, m);
    if (c) mesh.setColorAt(i, c);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function edgeLines(items, dashed) {
  if (items.length === 0) return null;
  const pos = new Float32Array(items.length * UNIT_EDGES.length * 6);
  const col = new Float32Array(items.length * UNIT_EDGES.length * 6);
  let k = 0;
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const [m, colour] of items) {
    for (const [p, q] of UNIT_EDGES) {
      a.copy(p).applyMatrix4(m);
      c.copy(q).applyMatrix4(m);
      pos.set([a.x, a.y, a.z, c.x, c.y, c.z], k);
      col.set([colour.r, colour.g, colour.b, colour.r, colour.g, colour.b], k);
      k += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const material = dashed ? new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.9 }) : new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
  const lines = new THREE.LineSegments(g, material);
  if (dashed) lines.computeLineDistances();
  return lines;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
/** A beam's fade: bright at its foot, gone at its top. */
const FADE = (() => {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#000');
  grad.addColorStop(1, '#fff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
})();
const DOT = new THREE.SphereGeometry(0.2, 10, 8);

/** A phase's buckets drawn into `group`; returns its materials, for dimming, and its pick mesh. */
function drawBuckets(b, group) {
  const materials = [];
  const keep = (m) => {
    m.userData.base = m.opacity;
    materials.push(m);
    return m;
  };
  const add = (o) => {
    if (o !== null) group.add(o);
    return o;
  };
  add(instanced(BOX, keep(new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.08, transparent: true, opacity: 1 })), b.solid));
  for (const [key, opacity] of [['glass12', 0.12], ['glass22', 0.22], ['glass45', 0.45]]) {
    add(instanced(BOX, keep(new THREE.MeshStandardMaterial({ transparent: true, opacity, depthWrite: false, roughness: 0.4 })), b[key]));
  }
  const edges = add(edgeLines(b.edges, false));
  if (edges) keep(edges.material);
  const dashed = add(edgeLines(b.dashed, true));
  if (dashed) keep(dashed.material);
  if (b.dots.length > 0) {
    const dots = new THREE.InstancedMesh(DOT, keep(new THREE.MeshBasicMaterial({ color: NEEDS_COLOUR, transparent: true, opacity: 1 })), b.dots.length);
    b.dots.forEach((p, i) => dots.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    group.add(dots);
  }
  let pick = null;
  if (b.pick.length > 0) {
    pick = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ visible: false }), b.pick.length);
    b.pick.forEach(([m], i) => pick.setMatrixAt(i, m));
    pick.userData.rows = b.pick.map(([, r, where]) => ({ r, where }));
    group.add(pick);
  }
  let pulse = null;
  if (b.pulse.length > 0) {
    const m = new THREE.MeshBasicMaterial({ color: FOCUS_COLOUR, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
    m.userData.base = 0.3;
    pulse = new THREE.InstancedMesh(BOX, m, b.pulse.length);
    b.pulse.forEach((mat, i) => pulse.setMatrixAt(i, mat.clone().multiply(new THREE.Matrix4().makeScale(1.25, 1.25, 1.25))));
    group.add(pulse);
  }
  return { materials, pick, pulse };
}

// ---------------------------------------------------------------------------
// The layout of one segment: tiles in rows from the rim inward, then towers in
// rows behind them, the shortest in front so the tall ones are not hidden.
function layoutSegment(p, a0, a1, R0, R1, force = false) {
  const tiles = [];
  let r = R1 - 1.1;
  while (tiles.length < p.tiles.length) {
    const width = (a1 - a0) * r - 1.2;
    const count = Math.floor(width / TILE_STEP);
    if (count < 1 || r < R0 + 2) {
      if (!force) return null;
    }
    const take = Math.max(1, Math.min(count, p.tiles.length - tiles.length));
    const mid = (a0 + a1) / 2;
    for (let j = 0; j < take; j += 1) tiles.push({ r, a: mid + ((j - (take - 1) / 2) * TILE_STEP) / r });
    r -= TILE_STEP;
  }
  const towers = [];
  const order = p.towers.map((t, i) => ({ t, i, h: Math.ceil(t.floors.length / PER_FLOOR) })).sort((x, y) => x.h - y.h || x.i - y.i);
  let rr = (p.tiles.length > 0 ? r + TILE_STEP / 2 : R1) - TOWER_DEPTH / 2 - 1.6;
  let k = 0;
  while (k < order.length) {
    const width = (a1 - a0) * rr - 1.0;
    const count = Math.floor(width / TOWER_STEP);
    if ((count < 1 || rr - TOWER_DEPTH / 2 < R0 + 0.8) && !force) return null;
    const take = Math.max(1, Math.min(count, order.length - k));
    const mid = (a0 + a1) / 2;
    for (let j = 0; j < take; j += 1) towers[order[k + j].i] = { r: rr, a: mid + ((j - (take - 1) / 2) * TOWER_STEP) / rr };
    k += take;
    rr -= TOWER_ROW;
  }
  return { tiles, towers };
}

// ---------------------------------------------------------------------------
let world = new THREE.Group();
scene.add(world);
let state = null; // what is drawn: the workspace, its phases' groups, the sizes

/** Frees what a scene holds on the graphics card: rebuilding for a regroup must not pile it up (review of TASK-0177). */
function dispose(root) {
  root.traverse((o) => {
    // An instanced mesh keeps its per-instance buffers until it is disposed itself.
    if (o.isInstancedMesh) o.dispose();
    o.geometry?.dispose?.();
    for (const m of [o.material].flat()) {
      if (!m) continue;
      m.map?.dispose?.();
      m.alphaMap?.dispose?.();
      m.dispose?.();
    }
  });
}

function build(ws) {
  scene.remove(world);
  dispose(world);
  world = new THREE.Group();
  scene.add(world);
  labels.length = 0;
  // A new workspace starts with nothing selected and nothing searched (TASK-0176).
  document.getElementById('card').hidden = true;
  document.getElementById('q').value = '';
  document.getElementById('count').textContent = '';
  document.getElementById('results').hidden = true;
  dataNow = DATA[ws];
  const d = viewOf(DATA[ws]);
  const n = d.ring.length;
  const coreR = Math.max(10, Math.sqrt(d.core.length) * 0.75 * TILE_STEP + 4);
  const R0 = coreR + 5;
  // Each phase's share of the ring grows with what it holds, so a busy phase has room.
  const weight = d.ring.map((p) => 3 + Math.sqrt(p.tiles.length + p.towers.reduce((m, t) => m + 4 + t.floors.length, 0)));
  const total = weight.reduce((a, b) => a + b, 0);
  const spans = weight.map((w) => (w / total) * (Math.PI * 2 - SEG_GAP * n));
  const angles = [];
  let at = -Math.PI / 2;
  spans.forEach((s) => {
    angles.push([at, at + s]);
    at += s + SEG_GAP;
  });
  let R1 = R0 + 14;
  let layouts = null;
  for (; R1 < R0 + 260; R1 += 2) {
    layouts = d.ring.map((p, i) => layoutSegment(p, angles[i][0], angles[i][1], R0, R1));
    if (layouts.every(Boolean)) break;
  }
  // A ring that never fits draws its crowded segments past their inner edge rather than not at all.
  if (!layouts.every(Boolean)) layouts = d.ring.map((p, i) => layoutSegment(p, angles[i][0], angles[i][1], R0, R1, true));
  const phases = [];
  ageTags.length = 0;
  const towerTops = new Map();
  const where = new Map(); // ticket id -> { phase index, position }
  const ticketRow = new Map([...d.ring.flatMap((p) => [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])]), ...d.shelf.flatMap((p) => p.tickets), ...d.core].map((r) => [r[ID], r]));
  const pickables = [];
  const plinths = [];
  const exitPick = [];
  const capPick = [];
  const pulses = [];
  const beams = [];
  d.ring.forEach((p, i) => {
    const [a0, a1] = angles[i];
    const mid = (a0 + a1) / 2;
    const isFocus = p.id === d.focus.phase;
    const active = p.status === 'active' || p.status === 'doing';
    const level = isFocus ? 'focus' : active ? 'active' : 'planned';
    const h = PLINTH[level];
    const group = new THREE.Group();
    const base = new THREE.Group();
    const content = new THREE.Group();
    const tags = new THREE.Group();
    // The towers' feature ids, shown when the phase is brought close.
    const near = new THREE.Group();
    near.visible = false;
    group.add(base, content, tags, near);
    world.add(group);
    const baseMaterials = [];
    const keep = (m) => {
      m.userData.base = m.opacity;
      baseMaterials.push(m);
      return m;
    };
    // The plinth: planned phases low and dim, active ones raised and lit, the focus phase highest.
    const plinthColour = { planned: '#0a1722', active: '#0d3348', focus: '#125a78' }[level];
    const plinth = slab(sectorShape(R0, R1, a0, a1), h, keep(new THREE.MeshStandardMaterial({ color: plinthColour, roughness: 0.85, transparent: true, opacity: level === 'planned' ? 0.75 : 0.95, emissive: isFocus ? new THREE.Color('#0a3550') : new THREE.Color('#000000') })));
    plinth.userData.phase = i;
    base.add(plinth);
    plinths.push(plinth);
    const rimColour = { planned: '#24485c', active: '#3fb6e0', focus: '#9ff0ff' }[level];
    const rim = keep(new THREE.LineBasicMaterial({ color: rimColour, transparent: true, opacity: level === 'planned' ? 0.5 : 1 }));
    base.add(arcLine(R1, a0, a1, h + 0.02, rim), arcLine(R0, a0, a1, h + 0.02, rim));
    if (isFocus) {
      // The focus phase's rim glows, and a ring of light stands just outside it.
      const glow = new THREE.Mesh(new THREE.RingGeometry(R1 + 0.4, R1 + 1.6, 96, 1, a0, a1 - a0), keep(new THREE.MeshBasicMaterial({ color: FOCUS_COLOUR, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
      glow.rotation.x = -Math.PI / 2;
      // RingGeometry turned flat runs its angle the other way round; mirror it back.
      glow.scale.y = -1;
      glow.position.y = h + 0.05;
      base.add(glow);
      pulses.push(glow.material);
    }
    // The phase's name outside its rim, its counts under it, what needs you in red.
    const all = [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])];
    const done = all.filter((r) => r[STATE] === 'closed').length;
    const needs = all.filter((r) => r[NEEDS]).length;
    // A phase's name without the "Phase 25:" its number already says.
    const short = String(p.name).replace(/^phase\s*\d+\s*[:\-–]\s*/i, '');
    const nameAt = polar(R1 + 8, mid);
    // A feature's segment is narrow, so its name is smaller than a phase's (TASK-0177).
    const k = p.kind === 'feature' ? 0.55 : 1;
    const lines = [{ text: (isFocus ? '▶ ' : '') + (p.number ? p.number + ' ' : '') + short, size: (isFocus ? 3.4 : level === 'active' ? 2.8 : 2.2) * k, colour: isFocus ? '#9ff0ff' : level === 'planned' ? '#6f93a8' : '#e6f8ff', weight: isFocus ? 800 : 600 }];
    if (level !== 'planned') lines.push({ text: done + ' of ' + all.length + ' done' + (needs > 0 ? '  ● ' + needs + ' need you' : ''), size: 1.9 * k, colour: needs > 0 ? '#f0b4ad' : '#8fb9cc' });
    else if (needs > 0) lines.push({ text: '● ' + needs + ' need you', size: 1.8 * k, colour: MARK.needs, weight: 700 });
    const name = stacked(lines, isFocus);
    name.position.set(nameAt.x, h + 3.4, nameAt.z);
    tags.add(name);
    // The tickets.
    const layout = layouts[i];
    const b = newBuckets();
    layout.tiles.forEach(({ r, a }, k) => {
      const row = p.tiles[k];
      const at = polar(r, a).add(new THREE.Vector3(0, h + 0.17, 0));
      addCube(b, row, at, new THREE.Vector3(0.95, 0.3, 0.95), a, { where: { phase: i } });
      where.set(row[ID], { phase: i, at });
    });
    let tallest = 0;
    p.towers.forEach((tower, k) => {
      const { r, a } = layout.towers[k];
      const centre = polar(r, a);
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const isFocusFeature = tower.f[ID] === d.focus.feature;
      const idTag = label(tower.f[ID], 1.1, isFocusFeature ? '#c9f6ff' : '#cfe3ee', 700);
      idTag.position.copy(centre).addScaledVector(radial, TOWER_DEPTH / 2 + 1.3).add(new THREE.Vector3(0, h + 0.5, 0));
      near.add(idTag);
      // The feature itself is the tower's foot: a wide slab in its own marks.
      const footAt = centre.clone().add(new THREE.Vector3(0, h + 0.3, 0));
      addCube(b, tower.f, footAt, new THREE.Vector3(TOWER_DEPTH + 0.6, 0.6, TOWER + 0.6), a, { where: { phase: i, tower: k } });
      where.set(tower.f[ID], { phase: i, at: footAt, tower: k });
      tower.floors.forEach((row, j) => {
        const level = Math.floor(j / PER_FLOOR);
        const v = ((j % PER_FLOOR) - (PER_FLOOR - 1) / 2) * (CUBE + GAP);
        const at = centre.clone().addScaledVector(tangent, v).add(new THREE.Vector3(0, h + 0.6 + FLOOR * level + CUBE / 2 + 0.07, 0));
        addCube(b, row, at, new THREE.Vector3(CUBE, CUBE, CUBE), a, { where: { phase: i, tower: k }, pulse: isFocusFeature && row[STATUS] === 'doing' });
        where.set(row[ID], { phase: i, at, tower: k });
      });
      const top = h + 0.6 + FLOOR * Math.ceil(tower.floors.length / PER_FLOOR);
      tallest = Math.max(tallest, top - h);
      towerTops.set(i + ':' + k, new THREE.Vector3(centre.x, top, centre.z));
      // An age badge when the tower's tickets have not changed for 14 days (TASK-0177),
      // counted to the date the data was read.
      const quiet = d.ages[tower.f[ID]] ?? null;
      if (d.badged.includes(tower.f[ID])) {
        const badge = label('◷ ' + quiet + ' d', 1.2, '#f2c879', 700);
        badge.position.set(centre.x, top + 2.6, centre.z);
        badge.visible = showAges;
        content.add(badge);
        ageTags.push(badge);
      }
      // A red cap when one of the tower's tickets needs you.
      const asking = [tower.f, ...tower.floors].filter((r) => r[NEEDS]).length;
      if (asking > 0) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(TOWER_DEPTH + 0.3, 0.3, TOWER + 0.3), keep(new THREE.MeshBasicMaterial({ color: NEEDS_COLOUR, transparent: true, opacity: 0.95 })));
        cap.position.set(centre.x, top + 0.3, centre.z);
        cap.rotation.y = -a;
        // The cap is pressable: it opens what needs you in this tower (TASK-0164).
        cap.userData.cap = { phase: i, tower: k, ids: [tower.f, ...tower.floors].filter((r) => r[NEEDS]).map((r) => r[ID]) };
        content.add(cap);
        capPick.push(cap);
      }
      if (isFocusFeature) {
        // The focus feature sends a beam of light up from its tower, and names itself.
        const height = 26;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.6, height, 32, 1, true), new THREE.MeshBasicMaterial({ color: FOCUS_COLOUR, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: FADE }));
        beam.material.userData.base = 0.3;
        beam.position.set(centre.x, top + height / 2, centre.z);
        content.add(beam);
        beams.push(beam.material);
        const tag = label(tower.f[ID] + ' · in focus', 2.1, '#c9f6ff', 700, true);
        tag.position.set(centre.x, top + 3.2, centre.z);
        tags.add(tag);
      }
    });
    const drawn = drawBuckets(b, content);
    if (drawn.pick) pickables.push(drawn.pick);
    if (drawn.pulse) pulses.push(drawn.pulse.material);
    // The exit criteria as a collar of cells just outside the segment's rim, one per
    // criterion, lit when met (TASK-0164). It stands on the ring itself, so every phase
    // shows at rest how close it is to closing; a fully lit collar is ready to close.
    const exits = p.exit;
    const collarIn = R1 + 0.5;
    const collarOut = R1 + 2.7;
    if (exits.length > 0) {
      const gap = Math.min(0.02, ((a1 - a0) / exits.length) * 0.12);
      const cell = ((a1 - a0) - gap * (exits.length + 1)) / exits.length;
      exits.forEach(([text, ticked], k) => {
        const c0 = a0 + gap + k * (cell + gap);
        const material = keep(ticked
          ? new THREE.MeshStandardMaterial({ color: EXIT_COLOUR, emissive: EXIT_COLOUR.clone().multiplyScalar(0.45), roughness: 0.4, transparent: true, opacity: 1 })
          : new THREE.MeshStandardMaterial({ color: '#0b2a33', roughness: 0.9, transparent: true, opacity: 0.9 }));
        const mesh = slab(sectorShape(collarIn, collarOut, c0, c0 + cell), h + (ticked ? 0.45 : 0.15), material);
        mesh.userData.exit = { text, ticked, k, of: exits.length, phase: i };
        base.add(mesh);
        exitPick.push(mesh);
        if (!ticked) {
          const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), keep(new THREE.LineBasicMaterial({ color: EXIT_COLOUR, transparent: true, opacity: 0.8 })));
          edge.rotation.copy(mesh.rotation);
          edge.position.copy(mesh.position);
          base.add(edge);
        }
      });
    } else if (p.exitProse) {
      // Criteria written as prose cannot be counted: the collar is a dashed line, not cells.
      const line = arcLine((collarIn + collarOut) / 2, a0, a1, h + 0.1, keep(new THREE.LineDashedMaterial({ color: EXIT_COLOUR, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.8 })));
      line.computeLineDistances();
      base.add(line);
    }
    if (exits.length > 0) {
      // Brought close, the collar says what it counts, in front of the segment.
      const met = exits.filter(([, ticked]) => ticked).length;
      const at = polar(collarOut + 3.2, mid);
      const words = label('exit criteria · ' + met + ' of ' + exits.length + ' met', 1.3, '#bff3e6', 700);
      words.position.set(at.x, h + 0.8, at.z);
      near.add(words);
    }
    const arch = new THREE.Group();
    phases.push({ p, group, base, content, tags, near, arch, materials: [...baseMaterials, ...drawn.materials], mid, a0, a1, h, tallest });
  });

  // Finished phases stand outside the ring as solid blocks of their tickets, five by five a layer.
  const shelfR = R1 + 26;
  const shelfGroup = new THREE.Group();
  world.add(shelfGroup);
  const sb = newBuckets();
  d.shelf.forEach((p, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / Math.max(1, d.shelf.length)) * Math.PI * 2;
    const centre = polar(shelfR, a);
    const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    p.tickets.forEach((row, j) => {
      const layer = Math.floor(j / 25);
      const cell = j % 25;
      const at = centre.clone().addScaledVector(radial, ((cell % 5) - 2) * 0.62).addScaledVector(tangent, (Math.floor(cell / 5) - 2) * 0.62).add(new THREE.Vector3(0, 0.3 + layer * 0.62, 0));
      addCube(sb, row, at, new THREE.Vector3(0.55, 0.55, 0.55), a, { dim: true, where: { shelf: i } });
      where.set(row[ID], { shelf: i, at });
    });
    const tag = label(p.number || p.id, 1.6, '#6f93a8', 500);
    tag.position.copy(centre).add(new THREE.Vector3(0, 0.62 * Math.ceil(p.tickets.length / 25) + 2.2, 0));
    shelfGroup.add(tag);
  });
  const shelfDrawn = drawBuckets(sb, shelfGroup);
  if (shelfDrawn.pick) pickables.push(shelfDrawn.pick);
  if (d.shelf.length > 0) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(shelfR - 5, shelfR + 5, 160), new THREE.MeshBasicMaterial({ color: 0x0a1a26, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    shelfGroup.add(ring);
  }

  // Evidence pictures stand at their tickets (TASK-0179); their anchors are found once
  // everything is placed, below.
  const evidenceGroup = new THREE.Group();
  world.add(evidenceGroup);

  // The core: the tickets with no phase, as tiles round a disc.
  const coreGroup = new THREE.Group();
  world.add(coreGroup);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, 0.6, 64), new THREE.MeshStandardMaterial({ color: '#0b2232', roughness: 0.9 }));
  disc.position.y = 0.3;
  coreGroup.add(disc);
  const cb = newBuckets();
  const golden = Math.PI * (3 - Math.sqrt(5));
  d.core.forEach((row, k) => {
    const r = TILE_STEP * 0.75 * Math.sqrt(k + 0.5) + 3.2;
    const a = k * golden;
    const at = polar(r, a).add(new THREE.Vector3(0, 0.75, 0));
    addCube(cb, row, at, new THREE.Vector3(0.95, 0.3, 0.95), a, { where: { core: true } });
    where.set(row[ID], { core: true, at });
  });
  const coreDrawn = drawBuckets(cb, coreGroup);
  if (coreDrawn.pick) pickables.push(coreDrawn.pick);
  const coreTag = label((grouping === 'feature' ? 'no feature · ' : 'no phase · ') + d.core.length, 2.4, '#9cc4d6', 600);
  coreTag.position.set(0, 3.2, 0);
  coreGroup.add(coreTag);

  // The next ticket: an outlined box round its floor and a tag with an arrow.
  const nextMark = new THREE.Group();
  if (d.next && where.has(d.next)) {
    const w = where.get(d.next);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.5, 1.5)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    box.position.copy(w.at);
    nextMark.add(box);
    const tag = label('next ▸ ' + d.next, 1.8, '#ffffff', 800, true);
    // In front of its floor, toward the person looking at the phase, a little above it.
    const ph = w.phase !== undefined ? phases[w.phase] : null;
    const out = ph ? new THREE.Vector3(Math.cos(ph.mid), 0, Math.sin(ph.mid)) : new THREE.Vector3(1, 0, 0);
    tag.position.copy(w.at).addScaledVector(out, 2.6).add(new THREE.Vector3(0, 3.4, 0));
    nextMark.add(tag);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([tag.position.clone().add(new THREE.Vector3(0, -0.9, 0)), w.at.clone()]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    nextMark.add(line);
    world.add(nextMark);
  }

  // The selection: a box round the ticket a person chose from the list or the field.
  const selection = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.7, 1.7)), new THREE.LineBasicMaterial({ color: 0xfff3a0 }));
  selection.visible = false;
  world.add(selection);

  // Each picture's anchor: over its ticket's tower top, its tile, its block on the shelf or its
  // tile in the core; pictures of one ticket stand side by side (TASK-0179).
  const anchors = d.evidence.map((e) => {
    const w = where.get(e.id);
    if (!w) return null;
    const base = w.tower !== undefined ? towerTops.get(w.phase + ':' + w.tower).clone().add(new THREE.Vector3(0, 3.2, 0)) : w.at.clone().add(new THREE.Vector3(0, 2.6, 0));
    return { at: base, phase: w.phase };
  });
  const sameSpot = new Map();
  anchors.forEach((a, i) => {
    if (!a) return;
    const key = a.at.toArray().map((v) => v.toFixed(1)).join(',');
    (sameSpot.get(key) ?? sameSpot.set(key, []).get(key)).push(i);
  });
  for (const list of sameSpot.values()) list.forEach((i, k) => {
    anchors[i].slot = k - (list.length - 1) / 2;
  });

  // What a selection or a search draws over everything else (TASK-0176): rebuilt each time.
  const marks = new THREE.Group();
  world.add(marks);

  const focusIndex = Math.max(0, d.ring.findIndex((p) => p.id === d.focus.phase));
  // Every material that fades when a selection or a search hushes the rest of the ring.
  const allMaterials = [...phases.flatMap((ph) => ph.materials), ...shelfDrawn.materials, ...coreDrawn.materials];
  for (const m of allMaterials) m.transparent = true;
  state = { ws, d, phases, where, pickables, plinths, pulses, beams, R0, R1, shelfR, focusIndex, selection, open: null, shelfGroup, coreGroup, nextMark, exitPick, capPick, ticketRow, marks, allMaterials, hush: 1, sel: null, found: null, flows: [], evidenceGroup, anchors };
  const placed = d.ring.reduce((m, p) => m + p.tiles.length + p.towers.reduce((x, t) => x + 1 + t.floors.length, 0), 0) + d.shelf.reduce((m, p) => m + p.tickets.length, 0) + d.core.length;
  window.__towers = { ws, tickets: placed, drawn: where.size, towers: d.ring.reduce((m, p) => m + p.towers.length, 0), R1, focus: d.focus, next: d.next };
  drawLegend();
  drawEvidence();
  closePhase(false);
  drawQueue();
  drawNeeds();
  drawWeeks();
  for (const b of document.querySelectorAll('#group button')) b.setAttribute('aria-pressed', String(b.dataset.group === grouping));
  window.__towers.grouping = grouping;
  window.__towers.ring = d.ring.map((p) => p.id);
}

// ---------------------------------------------------------------------------
// The camera: it orbits a target. A drag across turns the ring so its near edge
// follows the hand (TASK-0162's rule); up and down tilts; Shift or the right
// button pans; the scroll wheel zooms. Home and three views glide.
const view = { radius: 200, theta: 0, phi: 1.0, target: new THREE.Vector3() };
let glide = null;
const LIMIT = { phiMin: 0.04, phiMax: 1.47, rMin: 18 };

function homeView() {
  if (state === null) return { ...view };
  const mid = state.phases[state.focusIndex]?.mid ?? 0;
  return { radius: state.R1 * 2.7 + 30, theta: mid, phi: 0.98, target: new THREE.Vector3(0, 4, 0) };
}

function clampView(v) {
  v.phi = Math.min(LIMIT.phiMax, Math.max(LIMIT.phiMin, v.phi));
  const rMax = state ? (state.shelfR + 40) * 4 : 900;
  v.radius = Math.min(rMax, Math.max(LIMIT.rMin, v.radius));
  if (state) {
    const flat = new THREE.Vector2(v.target.x, v.target.z);
    const limit = state.shelfR + 10;
    if (flat.length() > limit) flat.setLength(limit);
    v.target.set(flat.x, Math.min(60, Math.max(0, v.target.y)), flat.y);
  }
}

function place() {
  clampView(view);
  camera.position.set(view.target.x + view.radius * Math.sin(view.phi) * Math.cos(view.theta), view.target.y + view.radius * Math.cos(view.phi), view.target.z + view.radius * Math.sin(view.phi) * Math.sin(view.theta));
  camera.lookAt(view.target);
  const home = homeView();
  const moved = Math.abs(view.radius - home.radius) > 0.5 || Math.abs(angleDiff(view.theta, home.theta)) > 0.01 || Math.abs(view.phi - home.phi) > 0.01 || view.target.distanceTo(home.target) > 0.5;
  document.getElementById('home').hidden = !(moved || (state && state.open !== null));
}

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function glideTo(goal, ms = 520) {
  if (reduced) {
    Object.assign(view, { radius: goal.radius, theta: goal.theta, phi: goal.phi });
    view.target.copy(goal.target);
    place();
    return;
  }
  glide = { from: { radius: view.radius, theta: view.theta, phi: view.phi, target: view.target.clone() }, goal, t0: performance.now(), ms };
}

function stepGlide(now) {
  if (glide === null) return;
  const k = Math.min(1, (now - glide.t0) / glide.ms);
  const e = 1 - Math.pow(1 - k, 3);
  const { from, goal } = glide;
  view.radius = from.radius + (goal.radius - from.radius) * e;
  view.theta = from.theta + angleDiff(goal.theta, from.theta) * e;
  view.phi = from.phi + (goal.phi - from.phi) * e;
  view.target.lerpVectors(from.target, goal.target, e);
  place();
  if (k >= 1) glide = null;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  syncOffset();
}

// ---------------------------------------------------------------------------
// Bringing a phase close: the camera flies to its segment, the other phases fade
// to their plinths, its exit criteria stand over its towers, its tickets are listed.
function openPhase(i, selectId = null) {
  if (state === null || !state.phases[i]) return;
  // A phase brought close shows that phase, not another ticket's links or an old search.
  clearFound();
  clearSelection();
  state.open = i;
  state.phases.forEach((ph, k) => {
    const mine = k === i;
    ph.content.visible = mine;
    ph.tags.visible = false;
    ph.near.visible = mine;
    ph.arch.visible = mine;
    for (const m of ph.materials) {
      m.transparent = true;
      m.userData.dim = mine ? 1 : 0.25;
      applyOpacity(m);
    }
  });
  state.shelfGroup.visible = false;
  state.coreGroup.visible = false;
  // The phase's own pictures still stand at their tickets; the others are hidden in placeEvidence.
  state.nextMark.visible = state.where.get(state.d.next)?.phase === i;
  const ph = state.phases[i];
  const rMid = (state.R0 + state.R1) / 2;
  const span = Math.min((ph.a1 - ph.a0) * rMid, 2 * rMid);
  const target = polar(rMid, ph.mid).add(new THREE.Vector3(0, ph.h + ph.tallest / 2 + 2, 0));
  glideTo({ radius: Math.max(38, span * 1.05 + ph.tallest * 1.35 + 18), theta: ph.mid, phi: 1.08, target });
  document.getElementById('back-ring').hidden = false;
  document.getElementById('legend').hidden = true;
  drawPanel(i, selectId);
  syncOffset();
}

function closePhase(animate = true) {
  if (state === null) return;
  clearSelection();
  state.open = null;
  camera.clearViewOffset();
  state.shelfGroup.visible = true;
  state.coreGroup.visible = true;
  state.evidenceGroup.visible = true;
  state.nextMark.visible = true;
  state.phases.forEach((ph) => {
    ph.content.visible = true;
    ph.tags.visible = true;
    ph.near.visible = false;
    ph.arch.visible = false;
    for (const m of ph.materials) {
      m.userData.dim = 1;
      applyOpacity(m);
    }
  });
  document.getElementById('back-ring').hidden = true;
  document.getElementById('legend').hidden = false;
  document.getElementById('panel').hidden = true;
  state.selection.visible = false;
  syncOffset();
  if (animate) glideTo(homeView());
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function rowHtml(r, next) {
  const word = r[FILL] === 'open' || r[FILL] === 'delivered' ? r[STATUS] : r[STATUS] + ' · ' + (MARK.fillWord[r[FILL]] ?? r[FILL]);
  return '<div class="row ' + esc(r[FILL]) + '" data-id="' + esc(r[ID]) + '" title="' + esc(r[ID] + ' ' + r[TITLE]) + '">' +
    '<span class="sq ' + esc(r[FILL]) + '" style="color:' + esc(MARK.type[r[TYPE]] ?? '#999') + '"></span>' +
    '<span class="id">' + esc(r[ID]) + '</span><span class="t">' + esc(r[TITLE]) + '</span>' +
    (next ? '<span class="next-tag">next</span>' : '') + (r[NEEDS] ? '<span class="dot" title="needs you"></span>' : '') +
    '<span class="st">' + esc(word) + '</span></div>' + (r[NEEDS] && r[SAY] ? '<div class="say">' + esc(r[SAY]) + '</div>' : '');
}

function drawPanel(i, selectId) {
  const panel = document.getElementById('panel');
  const { p } = state.phases[i];
  const d = state.d;
  const all = [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])];
  const needs = all.filter((r) => r[NEEDS]).length;
  let html = '<h2>' + esc((p.number ? p.number + ' ' : '') + p.name) + '</h2><div class="sub">' + esc(p.id) + ' · ' + esc(p.status) + (p.id === d.focus.phase ? ' · in focus' : '') + ' · ' + all.filter((r) => r[STATE] === 'closed').length + ' of ' + all.length + ' done' + (needs ? ' · <span style="color:var(--needs)">' + needs + ' need you</span>' : '') + '</div>';
  if (p.exit.length > 0) html += '<h3>Exit criteria · ' + p.exit.filter(([, t]) => t).length + ' of ' + p.exit.length + ' met</h3>' + p.exit.map(([text, ticked]) => '<div class="row" style="white-space:normal;align-items:flex-start" title="' + esc(text) + '"><span class="sq ' + (ticked ? 'delivered' : 'open') + '" style="color:' + esc(MARK.exit) + ';margin-top:3px"></span><span class="t" style="white-space:normal">' + esc(text.length > 120 ? text.slice(0, 119) + '…' : text) + '</span></div>').join('');
  // The focus feature first, then the towers left to right as the camera sees them, then the flat tiles.
  const towers = p.towers.map((t, k) => ({ t, k })).sort((x, y) => (y.t.f[ID] === d.focus.feature) - (x.t.f[ID] === d.focus.feature) || x.t.f[ID].localeCompare(y.t.f[ID], 'en', { numeric: true }));
  for (const { t } of towers) {
    const rows = [t.f, ...t.floors];
    const closed = rows.filter((r) => r[STATE] === 'closed').length;
    const focus = t.f[ID] === d.focus.feature;
    // What needs you first, then the floors from the bottom, so a pressed cap's tickets are at the top.
    const listed = [...rows.filter((r) => r[NEEDS]), ...rows.filter((r) => !r[NEEDS])];
    html += '<h3 class="' + (focus ? 'focus' : '') + '">' + (focus ? '<span class="beam"></span>' : '') + esc(t.f[ID]) + ' · ' + closed + ' of ' + rows.length + ' done' + (focus ? ' · in focus' : '') + '</h3>' + listed.map((r) => rowHtml(r, r[ID] === d.next)).join('');
  }
  if (p.tiles.length > 0) html += '<h3>No feature · ' + p.tiles.length + '</h3>' + [...p.tiles].sort((a, b) => b[NEEDS] - a[NEEDS] || (a[STATE] === 'closed') - (b[STATE] === 'closed')).map((r) => rowHtml(r, r[ID] === d.next)).join('');
  panel.innerHTML = html;
  panel.hidden = false;
  panel.scrollTop = 0;
  for (const el of panel.querySelectorAll('.row[data-id]')) el.addEventListener('click', () => select(el.dataset.id));
  if (selectId) select(selectId, { pane: false });
}

function drawLegend() {
  const sq = (fill, colour) => '<span class="sq ' + fill + '" style="color:' + colour + '"></span>';
  const c = MARK.type.task;
  const types = Object.keys(MARK.type).map((t) => '<span style="display:inline-flex;gap:4px;align-items:center;margin-right:8px">' + sq('delivered', MARK.type[t]) + esc(MARK.typeWord[t]) + '</span>').join('');
  document.getElementById('legend').innerHTML =
    '<div>' + sq('delivered', c) + 'done</div><div>' + sq('doing', c) + 'in progress</div><div>' + sq('open', c) + 'not started</div>' +
    '<div>' + sq('dropped', c) + 'resolved, nothing delivered</div><div>' + sq('deferred', c) + 'parked</div>' +
    '<div><span class="dot"></span>needs you · red cap: a tower asks (press it)</div><div><span class="sq delivered" style="color:' + MARK.exit + '"></span>exit criterion met · <span class="sq open" style="color:' + MARK.exit + '"></span>not yet, on the rim</div><div><span class="beam"></span>the feature in focus</div>' +
    '<div><span style="color:#9ff0ff;font-weight:800">▶</span> the phase in focus · <b>next</b> what is next</div>' +
    '<div style="flex-wrap:wrap;max-width:300px;margin-top:6px">' + types + '</div>';
}

// ---------------------------------------------------------------------------
// TASK-0176, three ideas from Rubric (REFERENCE-RUBRIC-AGENTIC-OS-REVIEW): a selected
// ticket's links drawn as curves with its card and its text, search that lights the
// towers, and a next-up board.

/** A material's opacity: its own, times its phase's dimming, times the hush of a selection or search. */
function applyOpacity(m) {
  m.opacity = (m.userData.base ?? 1) * (m.userData.dim ?? 1) * (state?.hush ?? 1);
}

/**
 * Everything but the marks fades while a ticket is selected or a search is lit. With a
 * phase brought close, the rest of the ring, the shelf and the core come back, faded, so
 * a curve or a match that lands there lands on something (review of TASK-0176).
 */
function setHush(on) {
  state.hush = on ? 0.16 : 1;
  for (const m of new Set([...state.allMaterials, ...state.pulses, ...state.beams])) applyOpacity(m);
  for (const s of labels) s.material.opacity = on && !s.userData.keep ? 0.22 : 1;
  if (state.open !== null) {
    state.phases.forEach((ph, k) => {
      ph.content.visible = on || k === state.open;
    });
    state.shelfGroup.visible = on;
    state.coreGroup.visible = on;
  }
}

/** The camera leaves room for the right pane whenever it is open. */
function syncOffset() {
  const open = !document.getElementById('panel').hidden;
  // The panels on the right give way to the pane (TASK-0177).
  document.getElementById('needs').hidden = open;
  document.getElementById('weeks').hidden = open;
  if (open) camera.setViewOffset(innerWidth, innerHeight, Math.min(190, innerWidth * 0.12), 0, innerWidth, innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

const TYPE_ORDER = ['feature', 'task', 'test', 'requirement', 'design', 'issue', 'risk', 'adr', 'change', 'release'];
const typeRank = (t) => (TYPE_ORDER.indexOf(t) + 1 || 99);
const statusWord = (r) => (r[FILL] === 'open' || r[FILL] === 'delivered' ? r[STATUS] : r[STATUS] + ' · ' + (MARK.fillWord[r[FILL]] ?? r[FILL]));
const linksOf = (id) => (state.d.links[id] ?? []).filter((x) => state.where.has(x));

/** Where a ticket stands, in words: its feature's tower, its phase, the shelf or the core. */
function placeOf(id) {
  const w = state.where.get(id);
  if (!w) return { feature: null, phase: 'not drawn' };
  if (grouping === 'feature') {
    // Grouped by feature the segment is the feature; the phase is the ticket's own.
    const f = w.phase !== undefined ? state.phases[w.phase].p.towers[w.tower ?? 0]?.f[ID] : w.shelf !== undefined ? state.d.shelf[w.shelf].id : null;
    return { feature: f === id ? null : f, phase: state.d.phaseOf[id] ?? 'no phase', phaseIndex: w.phase };
  }
  if (w.phase !== undefined) {
    const p = state.phases[w.phase].p;
    const f = w.tower !== undefined ? p.towers[w.tower].f[ID] : null;
    return { feature: f === id ? null : f, phase: p.id + ' ' + String(p.name).replace(/^phase\s*\d+\s*[:\-–]\s*/i, ''), phaseIndex: w.phase };
  }
  if (w.shelf !== undefined) return { feature: null, phase: state.d.shelf[w.shelf].id + ', finished' };
  return { feature: null, phase: 'no phase' };
}

/** A ring of light round a ticket, and its id over it, in the ticket's type colour. */
function outline(at, colour, size, text) {
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.95, depthTest: false }));
  box.position.copy(at);
  box.renderOrder = 12;
  state.marks.add(box);
  if (text) {
    const tag = label(text, 0.95, '#' + colour.getHexString(), 700, true);
    tag.position.copy(at).add(new THREE.Vector3(0, size * 0.5 + 0.9, 0));
    tag.userData.keep = true;
    state.marks.add(tag);
  }
}

function clearMarks() {
  for (const o of [...state.marks.children]) {
    state.marks.remove(o);
    o.geometry?.dispose?.();
    if (o.material) {
      o.material.map?.dispose?.();
      o.material.dispose?.();
    }
    const at = labels.indexOf(o);
    if (at >= 0) labels.splice(at, 1);
  }
  state.flows = [];
}

// Every link is drawn up to this many; the busiest ticket of either fixture has 202
// (your-trainer's FEAT-0051). Past 40 the linked tickets are outlined without their ids.
const MAX_CURVES = 240;
const MAX_TAGS = 40;
/** The selected ticket's links: a curve to each, rising with the distance it spans, and a light that runs along it. */
function drawLinks(id) {
  const from = state.where.get(id).at;
  const linked = linksOf(id);
  linked.slice(0, MAX_CURVES).forEach((other, k) => {
    const to = state.where.get(other).at;
    const r = state.ticketRow.get(other);
    const colour = colourOf(MARK.type[r[TYPE]]);
    const span = from.distanceTo(to);
    const lift = 3 + span * 0.26;
    const curve = new THREE.CubicBezierCurve3(from.clone(), from.clone().add(new THREE.Vector3(0, lift, 0)), to.clone().add(new THREE.Vector3(0, lift, 0)), to.clone());
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(16, Math.ceil(span)), 0.09 + Math.min(0.12, span * 0.002), 6, false), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.85, depthTest: false, blending: THREE.AdditiveBlending }));
    tube.renderOrder = 12;
    state.marks.add(tube);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false }));
    spark.renderOrder = 13;
    state.marks.add(spark);
    state.flows.push({ curve, spark, phase: k * 0.137 });
    outline(to, colour, 1.75, linked.length <= MAX_TAGS ? other : null);
  });
  const own = state.ticketRow.get(id);
  outline(from, new THREE.Color('#fff3a0'), 2.2, id);
  return { linked: linked.length, drawn: Math.min(linked.length, MAX_CURVES), type: own[TYPE] };
}

/** Select a ticket: its links as curves, the rest hushed, its card, and (unless asked not to) its text in the pane. */
function select(id, { pane = true, fly = false } = {}) {
  if (state === null || !state.where.has(id)) return;
  clearFound();
  search.blur();
  clearMarks();
  state.sel = id;
  state.selection.position.copy(state.where.get(id).at);
  state.selection.visible = true;
  drawLinks(id);
  setHush(true);
  drawCard(id);
  if (pane) drawTicketPane(id);
  else for (const el of document.querySelectorAll('#panel .row')) el.classList.toggle('sel', el.dataset.id === id);
  document.querySelector('#panel .row.sel')?.scrollIntoView({ block: 'nearest' });
  if (fly) flyTo(id);
  window.__towers.selected = { id, links: linksOf(id).length };
}

function clearSelection() {
  if (state === null || state.sel === null) return false;
  state.sel = null;
  clearMarks();
  setHush(false);
  state.selection.visible = false;
  document.getElementById('card').hidden = true;
  document.getElementById('legend').hidden = state.open !== null;
  if (state.open !== null) drawPanel(state.open);
  else document.getElementById('panel').hidden = true;
  syncOffset();
  window.__towers.selected = null;
  return true;
}

/** The camera flies to frame a ticket and everything it links to. */
function flyTo(id) {
  const pts = [id, ...linksOf(id)].map((x) => state.where.get(x).at);
  const centre = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const spread = Math.max(...pts.map((p) => p.distanceTo(centre)));
  const flat = Math.hypot(centre.x, centre.z);
  glideTo({ radius: Math.max(26, spread * 2.3 + 18), theta: flat > 4 ? Math.atan2(centre.z, centre.x) : view.theta, phi: 0.92, target: centre.clone().setY(Math.max(2, centre.y)) }, 700);
}

function drawCard(id) {
  const r = state.ticketRow.get(id);
  const [, owner, updated] = state.d.notes[id] ?? ['', '', ''];
  const where = placeOf(id);
  const linked = linksOf(id).map((x) => state.ticketRow.get(x));
  const kinds = new Map();
  for (const l of linked) kinds.set(l[TYPE], (kinds.get(l[TYPE]) ?? 0) + 1);
  const sq = (fill, type) => '<span class="sq ' + esc(fill) + '" style="color:' + esc(MARK.type[type] ?? '#999') + '"></span>';
  const fact = (k, v) => (v ? '<span>' + k + '</span><span>' + v + '</span>' : '');
  const card = document.getElementById('card');
  card.innerHTML = '<div class="head">' + sq(r[FILL], r[TYPE]) + '<div><b>' + esc(r[ID]) + '</b> <span class="sub">' + esc(MARK.typeWord[r[TYPE]] ?? r[TYPE]) + (r[ID] === state.d.next ? ' · <b>next</b>' : '') + '</span></div><button class="x" data-act="clear" title="Clear the selection (Escape)">×</button></div>' +
    '<div class="title">' + esc(r[TITLE]) + '</div>' +
    '<div class="facts">' + fact('Status', esc(statusWord(r))) + fact('Feature', where.feature ? esc(where.feature) : '') + fact('Phase', esc(where.phase)) + fact('Owner', esc(owner)) + fact('Updated', esc(updated) + (quietDays([id]) ? ' · ' + quietDays([id]) + ' d before the data' : '')) + '</div>' +
    (r[NEEDS] ? '<div class="needs">● ' + esc(r[SAY] || 'needs you') + '</div>' : '') +
    '<div class="kinds">' + (linked.length === 0 ? '<span class="sub">No links to other tickets</span>' : [...kinds.entries()].sort(([a], [b]) => typeRank(a) - typeRank(b)).map(([t, n]) => '<span>' + sq('delivered', t) + n + ' ' + esc(MARK.typeWord[t] ?? t) + (n === 1 ? '' : 's') + '</span>').join('')) +
    (linked.length > MAX_CURVES ? '<span class="sub">the first ' + MAX_CURVES + ' are drawn</span>' : '') + '</div>' +
    '<div class="acts"><button data-act="fly">Fly to</button>' + (where.phaseIndex !== undefined && state.open !== where.phaseIndex ? '<button data-act="phase">Bring its phase close</button>' : '') + '<button data-act="clear">Clear</button></div>';
  card.hidden = false;
  document.getElementById('legend').hidden = true;
}

document.getElementById('card').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act;
  if (!act || state.sel === null) return;
  const id = state.sel;
  if (act === 'fly') flyTo(id);
  else if (act === 'clear') clearSelection();
  else if (act === 'phase') {
    const w = state.where.get(id);
    openPhase(w.phase);
    select(id);
  }
});

/** The right pane for a ticket: its first paragraph, then its links as cockpit rows grouped by type. */
function drawTicketPane(id) {
  const r = state.ticketRow.get(id);
  const note = state.d.notes[id];
  const lead = note?.[0] ?? '';
  const linked = linksOf(id).map((x) => state.ticketRow.get(x));
  const groups = new Map();
  for (const l of linked.sort((a, b) => typeRank(a[TYPE]) - typeRank(b[TYPE]) || a[ID].localeCompare(b[ID], 'en', { numeric: true }))) {
    if (!groups.has(l[TYPE])) groups.set(l[TYPE], []);
    groups.get(l[TYPE]).push(l);
  }
  let html = state.open !== null ? '<button class="back" data-back="1">‹ ' + esc(state.phases[state.open].p.id) + "'s tickets</button>" : '';
  html += '<h2>' + esc(r[ID]) + ' · ' + esc(r[TITLE]) + '</h2><div class="sub">' + esc(MARK.typeWord[r[TYPE]] ?? r[TYPE]) + ' · ' + esc(statusWord(r)) + '</div>';
  if (r[NEEDS]) html += '<div class="say" style="padding-left:0">● ' + esc(r[SAY] || 'needs you') + '</div>';
  html += lead ? '<div class="lead">' + esc(lead) + '</div>' : '<div class="sub">' + (note === undefined ? 'Its note was not found at the fixture\'s commit.' : 'Its note has no paragraph of its own before its first heading.') + '</div>';
  const pics = state.d.pictures[id] ?? [];
  if (pics.length > 0) html += '<h3>Pictures · ' + pics.length + '</h3><div class="pics">' + pics.map(([src, date, name]) => '<a href="' + esc(src) + '" target="_blank" rel="noopener" title="' + esc(name + ' · ' + date) + '"><img alt="" loading="lazy" src="' + esc(src) + '"><span>' + esc(date) + '</span></a>').join('') + '</div>';
  if (linked.length === 0) html += '<h3>Linked tickets · none</h3>';
  for (const [type, rows] of groups) html += '<h3>' + esc(MARK.typeWord[type] ?? type) + (rows.length === 1 ? '' : 's') + ' · ' + rows.length + '</h3>' + rows.map((l) => rowHtml(l, l[ID] === state.d.next)).join('');
  const panel = document.getElementById('panel');
  panel.innerHTML = html;
  panel.hidden = false;
  panel.scrollTop = 0;
  panel.querySelector('[data-back]')?.addEventListener('click', () => {
    drawPanel(state.open);
    for (const el of panel.querySelectorAll('.row')) el.classList.toggle('sel', el.dataset.id === state.sel);
  });
  for (const el of panel.querySelectorAll('.row[data-id]')) el.addEventListener('click', () => select(el.dataset.id));
  syncOffset();
}

// Search: every ticket whose id or title has a word starting with each word of the query
// lights where it stands ("rate" finds "Heart Rate", not "generate").
const search = document.getElementById('q');
const results = document.getElementById('results');
let hot = 0;
function matches(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map((w) => new RegExp('(?:^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  if (words.length === 0) return [];
  const exact = q.trim().toUpperCase();
  const found = [];
  for (const [id, r] of state.ticketRow) {
    if (!state.where.has(id)) continue;
    const hay = (id + ' ' + r[TITLE]).toLowerCase();
    if (words.every((w) => w.test(hay))) found.push(r);
  }
  return found.sort((a, b) => (b[ID] === exact) - (a[ID] === exact) || b[NEEDS] - a[NEEDS] || (a[STATE] === 'closed') - (b[STATE] === 'closed') || a[ID].localeCompare(b[ID], 'en', { numeric: true }));
}

function clearFound(andBox = true) {
  if (state === null || state.found === null) return false;
  state.found = null;
  if (state.sel === null) {
    clearMarks();
    setHush(false);
  }
  if (andBox) search.value = '';
  results.hidden = true;
  document.getElementById('count').textContent = '';
  window.__towers.found = null;
  return true;
}

function runSearch() {
  const q = search.value;
  if (q.trim() === '') {
    clearFound();
    return;
  }
  const found = matches(q);
  light(found, found.length === 0 ? 'no match' : found.length + (found.length === 1 ? ' match' : ' matches'));
}

/**
 * Light these tickets where they stand, the rest faded, and list them under the search
 * box: what a search does, and what a part of the needs-you bar or a week does (TASK-0177).
 */
function light(found, caption, list = true) {
  if (state.sel !== null) clearSelection();
  clearMarks();
  state.found = found.map((r) => r[ID]);
  setHush(found.length > 0);
  const glow = new THREE.MeshBasicMaterial({ color: FOCUS_COLOUR, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  if (found.length > 0) {
    const mesh = new THREE.InstancedMesh(BOX, glow, found.length);
    found.forEach((r, i) => {
      const at = state.where.get(r[ID]).at;
      mesh.setMatrixAt(i, new THREE.Matrix4().compose(at, new THREE.Quaternion(), new THREE.Vector3(1.7, 1.7, 1.7)));
    });
    mesh.renderOrder = 12;
    state.marks.add(mesh);
    for (const r of found.slice(0, 40)) outline(state.where.get(r[ID]).at, colourOf(MARK.type[r[TYPE]]), 1.9, found.length <= 40 ? r[ID] : null);
  } else glow.dispose();
  document.getElementById('count').textContent = caption;
  hot = 0;
  // A typed search lists its matches; a press on a panel lights them without a list over the panel.
  if (list) drawResults(found);
  else results.hidden = true;
  window.__towers.found = state.found.length;
}

function drawResults(found) {
  if (found.length === 0) {
    results.hidden = true;
    return;
  }
  // The list stops short of the needs-you panel, so a press meant for the panel lands on it.
  const from = document.getElementById('find').getBoundingClientRect().left;
  const needs = document.getElementById('needs');
  const room = needs.hidden ? innerWidth - from - 16 : needs.getBoundingClientRect().left - from - 12;
  results.style.width = Math.max(240, Math.min(420, room)) + 'px';
  results.innerHTML = found.slice(0, 12).map((r, i) => rowHtml(r, r[ID] === state.d.next).replace('class="row ', 'class="row ' + (i === hot ? 'hot ' : ''))).join('') + (found.length > 12 ? '<div class="sub" style="padding:4px 6px">' + (found.length - 12) + ' more lit on the ring</div>' : '');
  results.hidden = false;
  for (const el of results.querySelectorAll('.row[data-id]')) el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    pick(el.dataset.id);
  });
}

/**
 * Choosing a match selects it and flies to it; the search gives way to the selection. A
 * match outside the phase brought close is shown on the whole ring, not in a phase faded
 * behind the one that was close (review of TASK-0176, round two).
 */
function pick(id) {
  clearFound();
  search.blur();
  const w = state.where.get(id);
  if (state.open !== null && w?.phase !== state.open) closePhase(false);
  select(id, { fly: true });
}

search.addEventListener('input', runSearch);
search.addEventListener('focus', () => {
  if (state.found !== null && state.found.length > 0) results.hidden = false;
});
search.addEventListener('blur', () => {
  results.hidden = true;
});
search.addEventListener('keydown', (e) => {
  const rows = [...results.querySelectorAll('.row[data-id]')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (rows.length === 0) return;
    hot = (hot + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
    rows.forEach((el, i) => el.classList.toggle('hot', i === hot));
  } else if (e.key === 'Enter') {
    const el = rows[hot] ?? rows[0];
    if (el) pick(el.dataset.id);
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    if (!clearFound()) search.blur();
  }
});

/** The next-up board: the focus feature's tasks, finished greyed, the next lit, the rest queued. */
function drawQueue() {
  const el = document.getElementById('queue');
  const q = state.d.queue;
  if (q === null) {
    const f = state.d.focus.feature;
    el.innerHTML = '<h4>Next up</h4><div class="sub">' + (f ? 'The feature in focus, ' + esc(f) + ', does not stand on the ring, so it has no tasks to list here.' : 'This workspace\'s snapshot names no feature in focus.') + '</div>';
    return;
  }
  const words = { done: 'done', next: 'next', doing: 'doing', review: 'review', queued: 'queued' };
  const more = Object.entries(q.more).filter(([, n]) => n > 0).map(([k, n]) => n + ' ' + (k === 'doing' ? 'in progress' : k === 'review' ? 'at review' : 'waiting'));
  el.innerHTML = '<h4>Next up · ' + esc(q.feature) + '<span>' + q.done + ' of ' + q.of + ' tasks done</span></h4>' +
    q.rows.map(({ id, kind }) => {
      const r = state.ticketRow.get(id);
      const [, owner, updated] = state.d.notes[id] ?? ['', '', ''];
      return '<div class="q ' + kind + '" data-id="' + esc(id) + '" title="' + esc(id + ' ' + (r?.[TITLE] ?? '')) + '"><span class="id">' + esc(id.replace(/^[A-Z]+-0*/, '#')) + '</span><span class="t">' + esc(r?.[TITLE] ?? id) + '</span><span class="who">' + esc(kind === 'done' && updated ? updated.slice(5) : owner) + '</span><span class="k">' + words[kind] + '</span></div>';
    }).join('') +
    '<div class="foot"><span>' + (more.length > 0 ? '+ ' + more.join(', ') : '') + '</span><span>data from ' + esc(q.head) + (q.generated ? ' · ' + esc(q.generated) : '') + '</span></div>';
  for (const row of el.querySelectorAll('.q[data-id]')) row.addEventListener('click', () => select(row.dataset.id, { fly: true }));
}

// ---------------------------------------------------------------------------
// TASK-0177, the other four of Rubric's ideas: grouping by feature, age badges, a ring of
// recent evidence, a needs-you panel and the year as weeks.

/** Which grouping the ring is drawn in, kept for this viewer when the browser allows it. */
let grouping = (() => {
  try {
    return localStorage.getItem('des5-towers-group') === 'feature' ? 'feature' : 'phase';
  } catch {
    return 'phase';
  }
})();
let showAges = true;
const ageTags = [];
let dataNow = null;

/** The workspace's data in the chosen grouping: by feature, each unfinished feature a segment holding one tower. */
function viewOf(d0) {
  if (grouping !== 'feature') return d0;
  const rows = new Map([...d0.ring.flatMap((p) => [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])]), ...d0.shelf.flatMap((p) => p.tickets), ...d0.core].map((r) => [r[ID], r]));
  const short = (t) => (t.length > 22 ? t.slice(0, 21).trimEnd() + '…' : t);
  const bf = d0.byFeature;
  // Each ticket's own phase, for the card, since the segments are features.
  const phaseOf = {};
  for (const p of d0.ring) for (const r of [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])]) phaseOf[r[ID]] = p.id + ' ' + String(p.name).replace(/^phase\s*\d+\s*[:\-–]\s*/i, '');
  for (const p of d0.shelf) for (const r of p.tickets) phaseOf[r[ID]] = p.id + ', finished';
  return {
    ...d0,
    phaseOf,
    ring: bf.ring.map((f) => ({ id: f.id, number: '', name: f.id + ' ' + short(rows.get(f.id)[TITLE]), status: f.status, kind: 'feature', exit: [], exitProse: false, towers: [{ f: rows.get(f.id), floors: f.floors.map((id) => rows.get(id)) }], tiles: [] })),
    shelf: bf.shelf.map((f) => ({ id: f.id, number: '', name: rows.get(f.id)[TITLE], tickets: f.tickets.map((id) => rows.get(id)) })),
    core: bf.core.map((id) => rows.get(id)),
    focus: { ...d0.focus, phase: d0.focus.feature },
  };
}

const DAY = 86400000;
/** Days from the newest change among these tickets to the date the data was read, or null when none is dated. */
function quietDays(ids) {
  const d = dataNow ?? state?.d;
  if (!d?.dataDate) return null;
  let newest = '';
  for (const id of ids) {
    const u = d.notes[id]?.[2] ?? '';
    if (u > newest) newest = u;
  }
  return newest === '' ? null : Math.max(0, Math.round((Date.parse(d.dataDate) - Date.parse(newest)) / DAY));
}

/** The evidence pictures, drawn over the canvas and placed each frame at their tickets. */
function drawEvidence() {
  const el = document.getElementById('evidence');
  el.innerHTML = state.d.evidence.map((e, i) => {
    const r = state.ticketRow.get(e.id);
    return '<figure data-i="' + i + '" data-id="' + esc(e.id) + '" title="' + esc(e.id + ' ' + (r?.[TITLE] ?? '') + ' · ' + e.path.split('/').pop()) + '"><img alt="" loading="lazy" src="' + esc(e.src) + '"><figcaption><b>' + esc(e.id) + '</b> ' + esc(e.date.slice(5)) + '</figcaption></figure>';
  }).join('');
  for (const fig of el.querySelectorAll('figure')) {
    fig.querySelector('img').addEventListener('error', () => fig.classList.add('missing'));
    fig.addEventListener('click', () => select(fig.dataset.id, { fly: true }));
    // A wheel turn over a picture zooms the view, as it does anywhere else.
    fig.addEventListener('wheel', (e) => {
      e.preventDefault();
      renderer.domElement.dispatchEvent(new WheelEvent('wheel', e));
    }, { passive: false });
  }
}

const EV_AT = new THREE.Vector3();
/** How large a picture stands for how near its ticket is to the work (TASK-0179). */
const NEAR = { feature: [1, 1], phase: [0.82, 1], ring: [0.62, 0.9], core: [0.55, 0.75], shelf: [0.45, 0.55] };
function placeEvidence() {
  const el = document.getElementById('evidence');
  const show = state !== null && state.evidenceGroup.visible;
  el.hidden = !show;
  if (!show) return;
  el.querySelectorAll('figure').forEach((fig, i) => {
    const a = state.anchors[i];
    const e = state.d.evidence[i];
    // With a phase brought close, only that phase's pictures stand.
    if (!a || (state.open !== null && a.phase !== state.open)) {
      fig.style.display = 'none';
      return;
    }
    EV_AT.copy(a.at).project(camera);
    const behind = EV_AT.z > 1;
    const dist = camera.position.distanceTo(a.at);
    const [size, alpha] = NEAR[grouping === 'feature' ? e.nearF : e.near] ?? NEAR.ring;
    const k = size * Math.min(1.1, Math.max(0.3, 150 / dist));
    fig.style.display = behind ? 'none' : '';
    fig.style.transform = 'translate(' + (((EV_AT.x + 1) / 2) * innerWidth + a.slot * 118 * k) + 'px,' + (((1 - EV_AT.y) / 2) * innerHeight) + 'px) translate(-50%,-100%) scale(' + k.toFixed(3) + ')';
    fig.style.opacity = String((state.hush < 1 ? 0.35 : 1) * alpha);
    fig.style.zIndex = String(1000 - Math.round(dist));
  });
}

/** The cockpit's reasons a ticket needs you, the most urgent first, and how the panel names them. */
const REASONS = [['failed', 'failed', '#ff4d4d'], ['review', 'to review', '#e8655a'], ['triage', 'to decide', '#f0a35b'], ['ready', 'to run', '#e9c46a'], ['waiting', 'waiting', '#8f6f78']];

function drawNeeds() {
  const el = document.getElementById('needs');
  // The lists by reason come from the data, where TST-0094 checks them against the fixture.
  const by = new Map(REASONS.map(([k]) => [k, (state.d.needs[k] ?? []).map((id) => state.ticketRow.get(id)).filter(Boolean)]));
  const rows = [...by.values()].flat();
  const first = REASONS.flatMap(([k]) => by.get(k)).slice(0, 3);
  el.innerHTML = '<h4>Needs you</h4><div class="big">' + rows.length + '</div>' +
    (rows.length === 0 ? '<div class="sub">Nothing is waiting on you.</div>' :
      '<div class="bar">' + REASONS.filter(([k]) => by.get(k).length > 0).map(([k, word, c]) => '<button data-reason="' + k + '" style="flex:' + by.get(k).length + ';background:' + c + '" title="' + by.get(k).length + ' ' + word + '"></button>').join('') + '</div>' +
      '<div class="keys">' + REASONS.filter(([k]) => by.get(k).length > 0).map(([k, word, c]) => '<button data-reason="' + k + '"><i style="background:' + c + '"></i>' + by.get(k).length + ' ' + word + '</button>').join('') + '</div>' +
      first.map((r) => rowHtml(r, r[ID] === state.d.next)).join(''));
  for (const b of el.querySelectorAll('[data-reason]')) b.addEventListener('click', () => {
    const list = by.get(b.dataset.reason);
    light(list, list.length + ' ' + REASONS.find(([k]) => k === b.dataset.reason)[1], false);
  });
  for (const row of el.querySelectorAll('.row[data-id]')) row.addEventListener('click', () => select(row.dataset.id, { fly: true }));
}

/** The data's year as four rows of thirteen weeks, each filled by the tickets closed that week. */
function drawWeeks() {
  const el = document.getElementById('weeks');
  const w = state.d.weeks;
  if (!w || w.year === '') {
    el.innerHTML = '';
    return;
  }
  const weeks = w.closed.map((list) => list.map((id) => state.ticketRow.get(id)).filter(Boolean));
  const most = Math.max(1, ...weeks.map((x) => x.length));
  const total = weeks.reduce((n, x) => n + x.length, 0);
  const busiest = weeks.reduce((b, x, i) => (x.length > weeks[b].length ? i : b), 0);
  const day = (i) => new Date(Date.parse(w.year + '-01-01') + i * 7 * DAY).toISOString().slice(5, 10);
  let html = '<h4>' + w.year + '<span>' + total + ' closed · busiest week ' + (busiest + 1) + '</span></h4><div class="grid">';
  for (let q = 0; q < 4; q += 1) {
    html += '<span class="q">Q' + (q + 1) + '</span>';
    for (let k = 0; k < 13; k += 1) {
      const i = q * 13 + k;
      const n = weeks[i].length;
      const fill = n === 0 ? 0 : 0.25 + 0.75 * (n / most);
      html += '<button class="wk' + (i === w.now ? ' now' : '') + (i > w.now ? ' later' : '') + '" data-week="' + i + '" style="--f:' + fill.toFixed(2) + '" title="Week ' + (i + 1) + ', from ' + day(i) + ': ' + n + ' closed"></button>';
    }
  }
  html += '</div>' + (w.undated > 0 ? '<div class="sub" style="margin-top:4px">' + w.undated + ' closed with no date are not drawn</div>' : '');
  el.innerHTML = html;
  for (const b of el.querySelectorAll('[data-week]')) b.addEventListener('click', () => {
    const i = Number(b.dataset.week);
    light(weeks[i], 'week ' + (i + 1) + ' · ' + weeks[i].length + ' closed', false);
  });
  state.weeks = weeks.map((x) => x.length);
}

document.getElementById('group').addEventListener('click', (e) => {
  const g = e.target.closest('button')?.dataset.group;
  if (!g || g === grouping) return;
  grouping = g;
  try {
    localStorage.setItem('des5-towers-group', g);
  } catch {
    // A viewer convenience only; the page works without it.
  }
  showWorkspace(ws);
});
document.getElementById('ages').addEventListener('click', (e) => {
  showAges = !showAges;
  e.currentTarget.setAttribute('aria-pressed', String(showAges));
  for (const t of ageTags) t.visible = showAges;
});

// ---------------------------------------------------------------------------
// Pointing and pressing.
const ray = new THREE.Raycaster();
const LABEL_AT = new THREE.Vector3();
function hitAt(x, y) {
  if (state === null) return null;
  ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const open = state.open;
  const visiblePick = state.pickables.filter((m) => m.parent.visible);
  const caps = state.capPick.filter((m) => m.parent.visible);
  const hits = ray.intersectObjects([...caps, ...visiblePick, ...state.exitPick, ...state.plinths], false);
  for (const h of hits) {
    if (h.object.userData.cap) return { cap: h.object.userData.cap };
    if (h.object.userData.rows) return { ticket: h.object.userData.rows[h.instanceId] };
    if (h.object.userData.exit) return { exit: h.object.userData.exit };
    if (h.object.userData.phase !== undefined) return { phase: h.object.userData.phase };
  }
  return null;
}

function tipFor(hit) {
  const d = state.d;
  if (hit.ticket) {
    const { r, where } = hit.ticket;
    const phase = where?.phase !== undefined ? state.phases[where.phase].p : null;
    const tower = phase && where.tower !== undefined ? phase.towers[where.tower].f : null;
    const word = r[FILL] === 'open' || r[FILL] === 'delivered' ? r[STATUS] : r[STATUS] + ', ' + (MARK.fillWord[r[FILL]] ?? r[FILL]);
    return '<b>' + esc(r[ID]) + '</b> ' + esc(r[TITLE]) + '<div class="sub">' + esc(MARK.typeWord[r[TYPE]] ?? r[TYPE]) + ' · ' + esc(word) +
      (tower && tower[ID] !== r[ID] ? ' · in ' + esc(tower[ID]) : '') + (phase ? ' · ' + esc(phase.id) : where?.shelf !== undefined ? ' · finished phase ' + esc(d.shelf[where.shelf].id) : ' · no phase') +
      (r[ID] === d.next ? ' · <b>next</b>' : '') + '</div>' + (r[NEEDS] ? '<div class="needs">● ' + esc(r[SAY] || 'needs you') + '</div>' : '');
  }
  if (hit.exit) return '<b>' + esc(state.phases[hit.exit.phase].p.id) + ' exit criterion ' + (hit.exit.k + 1) + ' of ' + hit.exit.of + '</b> · ' + (hit.exit.ticked ? 'met' : 'not yet met') + '<div class="sub">' + esc(hit.exit.text) + '</div>';
  if (hit.cap) {
    const rows = hit.cap.ids.map((id) => state.ticketRow.get(id)).filter(Boolean);
    return '<b>' + rows.length + (rows.length === 1 ? ' ticket needs' : ' tickets need') + ' you</b> in ' + esc(state.phases[hit.cap.phase].p.towers[hit.cap.tower].f[ID]) + rows.map((r) => '<div class="needs">● ' + esc(r[ID]) + ' · ' + esc(r[SAY] || 'needs you') + '</div>').join('') + '<div class="sub">Press to ' + (rows.length === 1 ? 'open it' : 'open the first') + '.</div>';
  }
  const p = state.phases[hit.phase].p;
  const counted = p.kind === 'feature' ? p.towers[0].floors.length + ' tickets' : p.towers.length + ' features, ' + p.tiles.length + ' tickets with no feature';
  return '<b>' + esc(p.kind === 'feature' ? p.name : p.id + ' ' + p.name) + '</b> · ' + esc(p.status) + (p.id === d.focus.phase ? ' · in focus' : '') + '<div class="sub">' + counted + '. Press to bring it close.</div>';
}

let drag = null;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, pan: e.shiftKey || e.button === 2, button: e.button };
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1) e.preventDefault();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerup', (e) => {
  const was = drag;
  drag = null;
  if (!was || was.button !== 0 || Math.hypot(e.clientX - was.x0, e.clientY - was.y0) > 4) return;
  const hit = hitAt(e.clientX, e.clientY);
  if (hit === null) return;
  document.getElementById('tip').style.display = 'none';
  if (hit.cap) {
    openPhase(hit.cap.phase, hit.cap.ids[0]);
    return;
  }
  // A ticket is selected where it stands, its links drawn across the ring (TASK-0176);
  // its card brings its phase close when that is wanted.
  if (hit.ticket) select(hit.ticket.r[ID]);
  else if (hit.phase !== undefined && state.open !== hit.phase) openPhase(hit.phase);
});
canvas.addEventListener('pointermove', (e) => {
  const tip = document.getElementById('tip');
  if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    glide = null;
    if (drag.pan || e.shiftKey) {
      const right = new THREE.Vector3().subVectors(camera.position, view.target).cross(camera.up).normalize();
      const forward = new THREE.Vector3().subVectors(view.target, camera.position).setY(0).normalize();
      const k = view.radius * 0.0016;
      view.target.addScaledVector(right, dx * k).addScaledVector(forward, dy * k);
    } else {
      // The near edge follows the hand: dragging right moves the camera round so the
      // front of the ring goes right (TASK-0162).
      view.theta += dx * 0.004;
      view.phi -= dy * 0.005;
    }
    place();
    tip.style.display = 'none';
    return;
  }
  const hit = hitAt(e.clientX, e.clientY);
  canvas.style.cursor = hit ? 'pointer' : 'default';
  if (hit === null) {
    tip.style.display = 'none';
    return;
  }
  tip.innerHTML = tipFor(hit);
  tip.style.display = 'block';
  tip.style.left = Math.min(innerWidth - 440, e.clientX + 14) + 'px';
  tip.style.top = Math.min(innerHeight - 120, e.clientY + 14) + 'px';
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  glide = null;
  view.radius *= Math.exp(Math.max(-240, Math.min(240, e.deltaY)) * 0.0012);
  place();
}, { passive: false });
// A double-click on empty space goes back: to the ring from a phase, else home.
canvas.addEventListener('dblclick', (e) => {
  if (hitAt(e.clientX, e.clientY) !== null) return;
  if (state && state.open !== null) closePhase();
  else glideTo(homeView());
});

/** The three views keep the turn; from the side comes closer, so the heights fill the window. */
function setView(name) {
  const home = homeView();
  const goal = { radius: name === 'side' ? Math.min(view.radius, home.radius * 0.72) : name === 'above' ? Math.max(view.radius, home.radius * 1.12) : view.radius, theta: view.theta, phi: { above: 0.05, leaning: 0.98, side: 1.42 }[name], target: name === 'side' ? view.target.clone().setY(8) : view.target.clone() };
  glideTo(goal);
}

document.getElementById('cam').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'home') {
    closePhase(false);
    glideTo(homeView());
  } else if (b.dataset.view) setView(b.dataset.view);
});
document.getElementById('back-ring').addEventListener('click', () => closePhase());
let ws = Object.keys(DATA)[0];
function showWorkspace(w) {
  ws = w;
  build(w);
  Object.assign(view, homeView());
  view.target = homeView().target;
  place();
  for (const b of document.querySelectorAll('#ws button')) b.setAttribute('aria-pressed', String(b.dataset.ws === ws));
}
document.getElementById('ws').addEventListener('click', (e) => {
  if (e.target.dataset.ws) showWorkspace(e.target.dataset.ws);
});
addEventListener('keydown', (e) => {
  if (e.target === search) return;
  if (e.key === '/') {
    e.preventDefault();
    search.focus();
    search.select();
  } else if (e.key === 'Escape') {
    // One step back at a time: the search, then the selection, then the phase, then home.
    if (clearFound()) return;
    if (clearSelection()) return;
    if (state && state.open !== null) closePhase();
    else glideTo(homeView());
  } else if (e.key === 'Home' || e.key === '0') {
    closePhase(false);
    glideTo(homeView());
  }
});

/** For the capture script and a test: show a workspace from a view, a phase brought close or not. */
window.__showTowers = (w, name = 'home', phaseId = null, group = null) => {
  if (group === 'phase' || group === 'feature') grouping = group;
  showWorkspace(w);
  if (name !== 'home') {
    const home = homeView();
    const goal = { ...home, phi: { above: 0.05, leaning: 0.98, side: 1.42 }[name] ?? 0.98, radius: name === 'side' ? home.radius * 0.72 : name === 'above' ? home.radius * 1.12 : home.radius, target: name === 'side' ? home.target.clone().setY(8) : home.target };
    Object.assign(view, goal);
    view.target = goal.target.clone();
  }
  if (phaseId) {
    const i = state.d.ring.findIndex((p) => p.id === phaseId);
    if (i >= 0) openPhase(i);
  }
  place();
  return window.__towers;
};

/** For a check: where a point of the world is on screen, and what the page has open. */
window.__towersProbe = {
  screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  },
  nearEdge() {
    const ph = state.phases[state.focusIndex];
    const at = polar(state.R1, ph.mid);
    return this.screenOf(at.x, ph.h, at.z);
  },
  ticketAt(id) {
    const w = state.where.get(id);
    return w ? this.screenOf(w.at.x, w.at.y, w.at.z) : null;
  },
  capAt(phaseId) {
    const cap = state.capPick.find((m) => state.d.ring[m.userData.cap.phase].id === phaseId);
    if (!cap) return null;
    const p = cap.getWorldPosition(new THREE.Vector3());
    return { ...this.screenOf(p.x, p.y, p.z), ids: cap.userData.cap.ids };
  },
  exitAt(phaseId) {
    const cell = state.exitPick.find((m) => state.d.ring[m.userData.exit.phase].id === phaseId);
    if (!cell) return null;
    cell.geometry.computeBoundingBox();
    const c = cell.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(cell.matrixWorld);
    return this.screenOf(c.x, c.y, c.z);
  },
  open: () => (state.open === null ? null : state.d.ring[state.open].id),
  // TASK-0176: select a ticket or search, as a person would, and read back what is drawn.
  select(id, fly = true) {
    select(id, { fly });
    if (glide) stepGlide(glide.t0 + glide.ms);
    return { selected: state.sel, links: linksOf(id), curves: state.flows.length, card: document.getElementById('card').hidden ? null : document.getElementById('card').textContent, pane: document.getElementById('panel').hidden ? null : document.getElementById('panel').textContent };
  },
  search(q) {
    search.value = q;
    runSearch();
    return { found: state.found, count: document.getElementById('count').textContent, listed: [...results.querySelectorAll('.row[data-id]')].map((el) => el.dataset.id) };
  },
  clear() {
    clearFound();
    clearSelection();
  },
  queue: () => [...document.querySelectorAll('#queue .q[data-id]')].map((el) => [el.dataset.id, el.className.replace(/^q /, '')]),
  // TASK-0177: what the new panels and marks show.
  needs: () => ({ count: Number(document.querySelector('#needs .big')?.textContent ?? 0), keys: [...document.querySelectorAll('#needs .keys button')].map((b) => b.textContent), rows: [...document.querySelectorAll('#needs .row[data-id]')].map((el) => el.dataset.id) }),
  weeks: () => state.weeks,
  memory: () => ({ ...renderer.info.memory }),
  ages: () => ageTags.map((t) => t.visible),
  evidence: () => [...document.querySelectorAll('#evidence figure')].map((f, i) => ({ id: f.dataset.id, near: state.d.evidence[i][grouping === 'feature' ? 'nearF' : 'near'], at: state.anchors[i] ? state.anchors[i].at.toArray() : null, shown: f.style.display !== 'none' && !document.getElementById('evidence').hidden, missing: f.classList.contains('missing'), loaded: f.querySelector('img').complete && f.querySelector('img').naturalWidth > 0 })),
  pressReason(k) {
    document.querySelector('#needs .keys [data-reason="' + k + '"]')?.click();
    return window.__towers.found;
  },
  pressWeek(i) {
    document.querySelector('#weeks [data-week="' + i + '"]')?.click();
    return window.__towers.found;
  },
  /** The ticket of the focus phase whose links reach the most other phases, for a picture. */
  widest() {
    let best = null;
    for (const [id, w] of state.where) {
      if (w.phase !== state.focusIndex) continue;
      const reach = new Set(linksOf(id).map((x) => state.where.get(x).phase ?? (state.where.get(x).shelf !== undefined ? 's' + state.where.get(x).shelf : 'core')));
      const score = reach.size * 100 + linksOf(id).length;
      if (linksOf(id).length <= MAX_CURVES && (best === null || score > best.score)) best = { id, score };
    }
    return best?.id ?? null;
  },
  homeShown: () => !document.getElementById('home').hidden,
  tip: () => (document.getElementById('tip').style.display === 'block' ? document.getElementById('tip').textContent : null),
};

addEventListener('resize', resize);
// The header wraps on a narrow window, and grows when Home or ‹ The ring appears; the panels
// under it start where it ends, whatever made it change (review of TASK-0177, round two).
new ResizeObserver(() => document.documentElement.style.setProperty('--top', document.querySelector('header').offsetHeight + 6 + 'px')).observe(document.querySelector('header'));
resize();
showWorkspace(ws);
renderer.setAnimationLoop((now) => {
  stepGlide(now);
  // A label's size grows with the square root of its distance, so the near ones are not
  // huge and the far ones can still be read.
  for (const s of labels) {
    const k = Math.sqrt(Math.max(1, camera.position.distanceTo(s.getWorldPosition(LABEL_AT))) / 120);
    s.scale.set(s.userData.size[0] * k, s.userData.size[1] * k, 1);
  }
  if (state && !reduced) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 420);
    for (const m of state.pulses) m.opacity = (m.userData.base ?? 0.4) * (m.userData.dim ?? 1) * state.hush * (0.45 + 0.55 * pulse);
    for (const m of state.beams) m.opacity = (0.14 + 0.12 * pulse) * state.hush;
  }
  // A light runs along each of the selected ticket's links, from it to the linked ticket.
  if (state) {
    for (const f of state.flows) {
      const t = reduced ? 0.5 : (now / 1700 + f.phase) % 1;
      f.spark.position.copy(f.curve.getPoint(t));
    }
  }
  placeEvidence();
  renderer.render(scene, camera);
});
