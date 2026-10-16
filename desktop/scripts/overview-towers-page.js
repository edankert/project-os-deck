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
const [ID, TYPE, FILL, NEEDS, STATUS, TITLE, SAY, STATE] = [0, 1, 2, 3, 4, 5, 6, 7];
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

function build(ws) {
  scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  labels.length = 0;
  const d = DATA[ws];
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
    const lines = [{ text: (isFocus ? '▶ ' : '') + (p.number ? p.number + ' ' : '') + short, size: isFocus ? 3.4 : level === 'active' ? 2.8 : 2.2, colour: isFocus ? '#9ff0ff' : level === 'planned' ? '#6f93a8' : '#e6f8ff', weight: isFocus ? 800 : 600 }];
    if (level !== 'planned') lines.push({ text: done + ' of ' + all.length + ' done' + (needs > 0 ? '  ● ' + needs + ' need you' : ''), size: 1.9, colour: needs > 0 ? '#f0b4ad' : '#8fb9cc' });
    else if (needs > 0) lines.push({ text: '● ' + needs + ' need you', size: 1.8, colour: MARK.needs, weight: 700 });
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
  const coreTag = label('no phase · ' + d.core.length, 2.4, '#9cc4d6', 600);
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

  const focusIndex = Math.max(0, d.ring.findIndex((p) => p.id === d.focus.phase));
  state = { ws, d, phases, where, pickables, plinths, pulses, beams, R0, R1, shelfR, focusIndex, selection, open: null, shelfGroup, coreGroup, nextMark, exitPick, capPick, ticketRow };
  const placed = d.ring.reduce((m, p) => m + p.tiles.length + p.towers.reduce((x, t) => x + 1 + t.floors.length, 0), 0) + d.shelf.reduce((m, p) => m + p.tickets.length, 0) + d.core.length;
  window.__towers = { ws, tickets: placed, drawn: where.size, towers: d.ring.reduce((m, p) => m + p.towers.length, 0), R1, focus: d.focus, next: d.next };
  drawLegend();
  closePhase(false);
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
  if (state && state.open !== null) camera.setViewOffset(innerWidth, innerHeight, 190, 0, innerWidth, innerHeight);
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------
// Bringing a phase close: the camera flies to its segment, the other phases fade
// to their plinths, its exit criteria stand over its towers, its tickets are listed.
function openPhase(i, selectId = null) {
  if (state === null || !state.phases[i]) return;
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
      m.opacity = (m.userData.base ?? 1) * m.userData.dim;
    }
  });
  state.shelfGroup.visible = false;
  state.coreGroup.visible = false;
  state.nextMark.visible = state.where.get(state.d.next)?.phase === i;
  camera.setViewOffset(innerWidth, innerHeight, 190, 0, innerWidth, innerHeight);
  const ph = state.phases[i];
  const rMid = (state.R0 + state.R1) / 2;
  const span = Math.min((ph.a1 - ph.a0) * rMid, 2 * rMid);
  const target = polar(rMid, ph.mid).add(new THREE.Vector3(0, ph.h + ph.tallest / 2 + 2, 0));
  glideTo({ radius: Math.max(38, span * 1.05 + ph.tallest * 1.35 + 18), theta: ph.mid, phi: 1.08, target });
  document.getElementById('back-ring').hidden = false;
  document.getElementById('legend').hidden = true;
  drawPanel(i, selectId);
}

function closePhase(animate = true) {
  if (state === null) return;
  state.open = null;
  camera.clearViewOffset();
  state.shelfGroup.visible = true;
  state.coreGroup.visible = true;
  state.nextMark.visible = true;
  state.phases.forEach((ph) => {
    ph.content.visible = true;
    ph.tags.visible = true;
    ph.near.visible = false;
    ph.arch.visible = false;
    for (const m of ph.materials) {
      m.userData.dim = 1;
      m.opacity = m.userData.base ?? 1;
    }
  });
  document.getElementById('back-ring').hidden = true;
  document.getElementById('legend').hidden = false;
  document.getElementById('panel').hidden = true;
  state.selection.visible = false;
  if (animate) glideTo(homeView());
}

function select(id) {
  if (state === null || !state.where.has(id)) return;
  const w = state.where.get(id);
  state.selection.position.copy(w.at);
  state.selection.visible = true;
  for (const el of document.querySelectorAll('#panel .row')) el.classList.toggle('sel', el.dataset.id === id);
  document.querySelector('#panel .row.sel')?.scrollIntoView({ block: 'nearest' });
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
  if (selectId) select(selectId);
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
  return '<b>' + esc(p.id) + ' ' + esc(p.name) + '</b> · ' + esc(p.status) + (p.id === d.focus.phase ? ' · in focus' : '') + '<div class="sub">' + p.towers.length + ' features, ' + p.tiles.length + ' tickets with no feature. Press to bring it close.</div>';
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
  if (hit.cap) {
    openPhase(hit.cap.phase, hit.cap.ids[0]);
    return;
  }
  if (hit.ticket) {
    const w = hit.ticket.where;
    if (w?.phase !== undefined) {
      if (state.open !== w.phase) openPhase(w.phase, hit.ticket.r[ID]);
      else select(hit.ticket.r[ID]);
    }
  } else if (hit.phase !== undefined && state.open !== hit.phase) openPhase(hit.phase);
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
  if (e.key === 'Escape') {
    if (state && state.open !== null) closePhase();
    else glideTo(homeView());
  } else if (e.key === 'Home' || e.key === '0') {
    closePhase(false);
    glideTo(homeView());
  }
});

/** For the capture script and a test: show a workspace from a view, a phase brought close or not. */
window.__showTowers = (w, name = 'home', phaseId = null) => {
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
  homeShown: () => !document.getElementById('home').hidden,
  tip: () => (document.getElementById('tip').style.display === 'block' ? document.getElementById('tip').textContent : null),
};

addEventListener('resize', resize);
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
    for (const m of state.pulses) m.opacity = (m.userData.base ?? 0.4) * (m.userData.dim ?? 1) * (0.45 + 0.55 * pulse);
    for (const m of state.beams) m.opacity = 0.14 + 0.12 * pulse;
  }
  renderer.render(scene, camera);
});
