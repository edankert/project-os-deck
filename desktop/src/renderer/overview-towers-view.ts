/**
 * The towers on the ring, drawn in 3D with three.js (TASK-0167).
 *
 * The scene's `towers` node carries a layout worked out by the pure function in
 * `shared/overview-towers.ts`; this draws it, as DES-0005's towers page does, and
 * reports what a person points at and presses. The camera orbits a target: a drag
 * across turns the ring so its near edge follows the hand (TASK-0162's rule), up
 * and down tilts, Shift or the right button pans, the wheel zooms. Home and the
 * three views glide. A phase brought close (S2) flies the camera to its segment
 * and fades the others; going back flies home. The view outlives a screen: the
 * renderer hands it the next layout, and when the ring is the same it only moves
 * the camera.
 *
 * three.js comes from Deck's own build (`vendor/`, RISK-0010). Where WebGL cannot
 * start, `createTowersView` returns null and the scene's flat plan stays visible.
 */
import * as THREE from 'three';
import { GATE_COLOUR } from '../shared/overview-gate.js';
import { NEEDS_YOU, TYPE_COLOUR } from '../shared/overview-marks.js';
import { PALETTE } from '../shared/overview-scene.js';
import { DISTANCE_RANGE, type Cube, type RingPhase, type TowerSelection, type TowersLayout } from '../shared/overview-towers.js';
import { shortName } from '../shared/overview-geometry.js';

export type TowersViewName = 'above' | 'leaning' | 'side';

export interface TowersViewOptions {
  reduced: () => boolean;
  /** What is pointed at, or null; at the pointer's place on screen. */
  onHover: (label: string | null, x: number, y: number) => void;
  /** Where a press goes: an overview address. */
  onPress: (target: string) => void;
  /** The pixels at the right of the view a phase's list covers, to keep the segment clear of it. */
  clearRight: () => number;
  /** The tickets a ticket is joined to, for the wires drawn while it is pointed at. */
  linksOf?: (id: string) => string[];
  /** Told whenever the camera has moved or come home, for the Home button. */
  onCamera?: () => void;
}

export interface TowersView {
  canvas: HTMLCanvasElement;
  /** The pictures standing at their tickets, laid over the canvas (TASK-0186). */
  overlay: HTMLElement;
  show(layout: TowersLayout): void;
  home(): void;
  view(name: TowersViewName): void;
  isMoved(): boolean;
  orbit(dx: number, dy: number): void;
  pan(dx: number, dy: number): void;
  zoom(factor: number): void;
  select(id: string | null): void;
  /** Turn the camera to the selected ticket and the tickets it is joined to (TASK-0182). */
  frame(): void;
  /** Light these tickets where they stand and fade the rest, or put the ring back with null (TASK-0183's search). */
  light(ids: readonly string[] | null): void;
  /** Turn the camera to one ticket. */
  flyTo(id: string): void;
  /** Show or hide the badges on quiet towers (TASK-0184). */
  showAges(on: boolean): void;
  resize(): void;
  /** For the window run: where things are on screen, and what is open. */
  probe: {
    screenOf(id: string): { x: number; y: number } | null;
    capOf(feature: string): { x: number; y: number } | null;
    phaseAt(id: string): { x: number; y: number } | null;
    coreAt(): { x: number; y: number } | null;
    open(): string | null;
    /** The selected ticket and how many curves the view draws for it (TASK-0182). */
    selected(): { id: string; curves: number; outlined: number; labelled: number; faded: boolean } | null;
    /** How many tickets a search lights, and how many glows the view draws for them (TASK-0183). */
    found(): { lit: number; glows: number; faded: boolean } | null;
    /** The quiet towers' badges: how many, how many shown, and each one's words. */
    ages(): { badges: number; shown: number; words: string[] };
    /** The agents over their start tickets (TASK-0199): each one's session, ticket, state, whether it is shown and where. */
    agents(): Array<{ id: string; ticket: string; state: string; shown: boolean; x: number; y: number }>;
    /** The pictures standing at their tickets: each one's ticket, whether it is shown, its drawn width, and whether it loaded. */
    pictures(): Array<{ ticket: string; near: string; shown: boolean; width: number; loaded: boolean; x: number; y: number }>;
    camera(): { radius: number; theta: number; phi: number; moved: boolean; reach: number; limit: number };
    hit(x: number, y: number): string | null;
  };
}

/** Whether a WebGL context can be had here at all. */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

const colourOf = (hsl: string | undefined): THREE.Color => new THREE.Color((hsl ?? 'hsl(0 0% 60%)').replace(/hsl\((\d+) (\d+)% (\d+)%\)/, 'hsl($1, $2%, $3%)'));
const NEEDS = colourOf(NEEDS_YOU);
const EXIT = colourOf(GATE_COLOUR.acceptance);
const FOCUS = new THREE.Color('hsl(190, 100%, 72%)');
const LEVEL = {
  planned: { plinth: '#0a1722', rim: '#24485c', name: '#6f93a8' },
  active: { plinth: '#0d3348', rim: '#3fb6e0', name: '#e6f8ff' },
  focus: { plinth: '#125a78', rim: '#9ff0ff', name: '#9ff0ff' },
} as const;
const VIEW_PHI: Readonly<Record<TowersViewName, number>> = { above: 0.05, leaning: 0.98, side: 1.42 };

type Hit =
  | { kind: 'cube'; cube: Cube; phase: number | null }
  | { kind: 'cap'; label: string; target: string }
  | { kind: 'exit'; label: string }
  | { kind: 'phase'; index: number }
  | { kind: 'shelf'; label: string; target: string }
  | { kind: 'core' };

interface PhaseGroup {
  phase: RingPhase;
  group: THREE.Group;
  content: THREE.Group;
  tags: THREE.Group;
  near: THREE.Group;
  materials: THREE.Material[];
}

interface Orbit {
  radius: number;
  theta: number;
  phi: number;
  target: THREE.Vector3;
}

const UNIT_EDGES: Array<[THREE.Vector3, THREE.Vector3]> = (() => {
  const c = [-0.5, 0.5];
  const v: THREE.Vector3[] = [];
  for (const x of c) for (const y of c) for (const z of c) v.push(new THREE.Vector3(x, y, z));
  const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let i = 0; i < 8; i += 1) for (let j = i + 1; j < 8; j += 1) if (Math.abs(v[i]!.distanceTo(v[j]!) - 1) < 1e-6) pairs.push([v[i]!, v[j]!]);
  return pairs;
})();
const BOX = new THREE.BoxGeometry(1, 1, 1);
const DOT = new THREE.SphereGeometry(0.2, 10, 8);

export function createTowersView(options: TowersViewOptions): TowersView | null {
  if (!webglAvailable()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'ov-towers';
  // The pictures stand over the canvas as images, placed each frame where their tickets are (TASK-0186).
  const overlay = document.createElement('div');
  overlay.className = 'ov-pictures';
  // The pictures and the agents' marks each in a box of their own, so drawing one leaves the other.
  const pictureBox = document.createElement('div');
  const agentBox = document.createElement('div');
  agentBox.className = 'ov-agent-marks';
  overlay.append(pictureBox, agentBox);
  let agentMarks: Array<{ el: HTMLElement; marker: TowersLayout['agents'][number]; at: THREE.Vector3 }> = [];
  let agentsSignature = '';
  /** What is drawn as chosen: a selected ticket, or else the open session (TASK-0199). */
  const chosenOf = (): TowerSelection | null => layout?.selection ?? layout?.session ?? null;
  let figures: Array<{ el: HTMLElement; img: HTMLImageElement; pic: TowersLayout['pictures'][number]; at: THREE.Vector3 }> = [];
  let picturesSignature = '';
  const PICTURE_AT = new THREE.Vector3();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#030712', 260, 620);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
  scene.add(new THREE.AmbientLight(0xbfdfff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(80, 160, 60);
  scene.add(sun);

  let world = new THREE.Group();
  scene.add(world);
  let layout: TowersLayout | null = null;
  let signature = '';
  let phases: PhaseGroup[] = [];
  let pickables: THREE.Object3D[] = [];
  let pulses: THREE.Material[] = [];
  let beams: THREE.MeshBasicMaterial[] = [];
  let shelfGroup = new THREE.Group();
  let coreGroup = new THREE.Group();
  let shelfMaterials: THREE.Material[] = [];
  let coreMaterials: THREE.Material[] = [];
  // The selected ticket's curves, their running lights, outlines and ids (TASK-0182).
  let chosen = new THREE.Group();
  let runners: Array<{ mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3 }> = [];
  let chosenSignature = '';
  // What a search lights (TASK-0183): a glow over each match, the rest faded.
  let found: string[] | null = null;
  let glows = new THREE.Group();
  /** A ring of thousands of glows is a fog, not an answer; past this many, the first are lit. */
  const GLOW_CAP = 600;
  // The badges on towers quiet for 14 days or more (TASK-0184).
  let ageBadges: THREE.Sprite[] = [];
  let agesOn = true;
  let nextMark = new THREE.Group();
  let wires: THREE.LineSegments | null = null;
  const where = new Map<string, { at: THREE.Vector3; phase: number | null }>();
  const labels: THREE.Sprite[] = [];
  const selection = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.7, 1.7)), new THREE.LineBasicMaterial({ color: 0xfff3a0 }));
  selection.visible = false;

  const view: Orbit = { radius: 200, theta: 0, phi: 0.98, target: new THREE.Vector3(0, 4, 0) };
  let glide: { from: Orbit; goal: Orbit; t0: number; ms: number } | null = null;
  let offset = 0;

  // -------------------------------------------------------------------------
  // Building blocks.
  const sprite = (lines: Array<{ text: string; size: number; colour: string; weight?: number }>, onTop = false): THREE.Sprite => {
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    const px = 56;
    const fonts = lines.map((l) => `${l.weight ?? 600} ${Math.round((px * l.size) / lines[0]!.size)}px -apple-system, "Helvetica Neue", Arial, sans-serif`);
    const heights = lines.map((l) => Math.round((px * l.size) / lines[0]!.size) + 10);
    let w = 0;
    lines.forEach((l, i) => {
      g.font = fonts[i]!;
      w = Math.max(w, Math.ceil(g.measureText(l.text).width) + 20);
    });
    c.width = w;
    c.height = heights.reduce((a, b) => a + b, 0) + 10;
    let y = 5;
    lines.forEach((l, i) => {
      g.font = fonts[i]!;
      g.fillStyle = l.colour;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.9)';
      g.shadowBlur = 8;
      g.fillText(l.text, w / 2, y + heights[i]! / 2);
      y += heights[i]!;
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: !onTop }));
    const size = (lines[0]!.size * c.height) / (heights[0]! + 5);
    s.userData['size'] = [(size * w) / c.height, size];
    s.scale.set((size * w) / c.height, size, 1);
    s.renderOrder = onTop ? 11 : 10;
    labels.push(s);
    return s;
  };
  const label = (text: string, size: number, colour: string, weight = 600, onTop = false): THREE.Sprite => sprite([{ text, size, colour, weight }], onTop);

  const sectorShape = (r0: number, r1: number, a0: number, a1: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
    s.absarc(0, 0, r1, a0, a1, false);
    s.lineTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
    s.absarc(0, 0, r0, a1, a0, true);
    s.closePath();
    return s;
  };
  const slab = (shape: THREE.Shape, height: number, material: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 48 }), material);
    // Shape (x, y) becomes world (x, z) once turned flat; the extrusion becomes height.
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = height;
    return mesh;
  };
  const arcLine = (r: number, a0: number, a1: number, y: number, material: THREE.LineBasicMaterial | THREE.LineDashedMaterial): THREE.Line => {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * 40));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += 1) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
  };

  /** Cubes collected per group, then drawn as a few instanced meshes and two line sets. */
  interface Buckets { solid: Array<[THREE.Matrix4, THREE.Color]>; g12: Array<[THREE.Matrix4, THREE.Color]>; g22: Array<[THREE.Matrix4, THREE.Color]>; g45: Array<[THREE.Matrix4, THREE.Color]>; edges: Array<[THREE.Matrix4, THREE.Color]>; dashed: Array<[THREE.Matrix4, THREE.Color]>; dots: THREE.Vector3[]; pick: Array<[THREE.Matrix4, Cube]>; pulse: THREE.Matrix4[] }
  const buckets = (): Buckets => ({ solid: [], g12: [], g22: [], g45: [], edges: [], dashed: [], dots: [], pick: [], pulse: [] });
  const paint = (c: Cube): THREE.Color => {
    const base = layout?.colouring === 'state' ? colourOf(PALETTE[c.state]) : colourOf(TYPE_COLOUR[c.type]);
    return c.dim === true ? base.multiplyScalar(0.55) : base;
  };
  const addCube = (b: Buckets, c: Cube, phase: number | null): void => {
    const at = new THREE.Vector3(c.x, c.y, c.z);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -c.angle);
    const colour = paint(c);
    const full = new THREE.Matrix4().compose(at, q, new THREE.Vector3(c.sx, c.sy, c.sz));
    // DES-0004's fills: solid done, half in progress, outline not started, dashed resolved or parked.
    if (layout?.colouring === 'state' || c.fill === 'delivered') b.solid.push([full, colour]);
    else if (c.fill === 'doing') {
      b.solid.push([new THREE.Matrix4().compose(at.clone().add(new THREE.Vector3(0, -c.sy / 4, 0)), q, new THREE.Vector3(c.sx, c.sy / 2, c.sz)), colour]);
      b.g12.push([full, colour]);
      b.edges.push([full, colour]);
    } else if (c.fill === 'unproven') {
      b.g45.push([full, colour]);
      b.edges.push([full, colour]);
    } else if (c.fill === 'dropped') {
      b.g22.push([full, colour.clone().lerp(new THREE.Color('#556070'), 0.5)]);
      b.dashed.push([full, colour]);
    } else if (c.fill === 'deferred') b.dashed.push([full, colour]);
    else {
      b.g12.push([full, colour]);
      b.edges.push([full, colour]);
    }
    if (c.needsYou) {
      const out = new THREE.Vector3(Math.cos(c.angle), 0, Math.sin(c.angle)).multiplyScalar(c.sx / 2);
      b.dots.push(at.clone().add(out).add(new THREE.Vector3(0, c.sy / 2 + 0.12, 0)));
    }
    b.pick.push([full, c]);
    if (c.pulse === true) b.pulse.push(full);
    where.set(c.id, { at, phase });
  };
  const keep = (list: THREE.Material[], m: THREE.Material): THREE.Material => {
    m.userData['base'] = m.opacity;
    list.push(m);
    return m;
  };
  const instanced = (material: THREE.Material, items: Array<[THREE.Matrix4, THREE.Color]>): THREE.InstancedMesh | null => {
    if (items.length === 0) return null;
    const mesh = new THREE.InstancedMesh(BOX, material, items.length);
    items.forEach(([m, c], i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    return mesh;
  };
  const edgeLines = (items: Array<[THREE.Matrix4, THREE.Color]>, material: THREE.LineBasicMaterial | THREE.LineDashedMaterial): THREE.LineSegments | null => {
    if (items.length === 0) return null;
    const pos = new Float32Array(items.length * UNIT_EDGES.length * 6);
    const col = new Float32Array(items.length * UNIT_EDGES.length * 6);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let k = 0;
    for (const [m, colour] of items) {
      for (const [p, q] of UNIT_EDGES) {
        a.copy(p).applyMatrix4(m);
        b.copy(q).applyMatrix4(m);
        pos.set([a.x, a.y, a.z, b.x, b.y, b.z], k);
        col.set([colour.r, colour.g, colour.b, colour.r, colour.g, colour.b], k);
        k += 6;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(g, material);
    if (material instanceof THREE.LineDashedMaterial) lines.computeLineDistances();
    return lines;
  };
  const drawBuckets = (b: Buckets, into: THREE.Group, materials: THREE.Material[]): void => {
    const add = (o: THREE.Object3D | null): void => { if (o !== null) into.add(o); };
    add(instanced(keep(materials, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.08, transparent: true, opacity: 1 })), b.solid));
    add(instanced(keep(materials, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.4 })), b.g12));
    add(instanced(keep(materials, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.4 })), b.g22));
    add(instanced(keep(materials, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.4 })), b.g45));
    add(edgeLines(b.edges, keep(materials, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 })) as THREE.LineBasicMaterial));
    add(edgeLines(b.dashed, keep(materials, new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.9 })) as THREE.LineDashedMaterial));
    if (b.dots.length > 0) {
      const dots = new THREE.InstancedMesh(DOT, keep(materials, new THREE.MeshBasicMaterial({ color: NEEDS, transparent: true, opacity: 1 })), b.dots.length);
      b.dots.forEach((p, i) => dots.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
      into.add(dots);
    }
    if (b.pick.length > 0) {
      const pick = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ visible: false }), b.pick.length);
      b.pick.forEach(([m], i) => pick.setMatrixAt(i, m));
      pick.userData['cubes'] = b.pick.map(([, c]) => c);
      into.add(pick);
      pickables.push(pick);
    }
    if (b.pulse.length > 0) {
      const m = new THREE.MeshBasicMaterial({ color: FOCUS, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
      m.userData['base'] = 0.3;
      materials.push(m);
      const pulse = new THREE.InstancedMesh(BOX, m, b.pulse.length);
      b.pulse.forEach((mat, i) => pulse.setMatrixAt(i, mat.clone().multiply(new THREE.Matrix4().makeScale(1.25, 1.25, 1.25))));
      into.add(pulse);
      pulses.push(m);
    }
  };
  const fade = ((): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#000');
    grad.addColorStop(1, '#fff');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  })();

  // -------------------------------------------------------------------------
  function build(next: TowersLayout): void {
    scene.remove(world);
    world = new THREE.Group();
    scene.add(world);
    labels.length = 0;
    where.clear();
    phases = [];
    pickables = [];
    pulses = [];
    beams = [];
    ageBadges = [];
    layout = next;
    const { R0, R1, collar } = next;
    next.phases.forEach((p, i) => {
      const group = new THREE.Group();
      const base = new THREE.Group();
      const content = new THREE.Group();
      const tags = new THREE.Group();
      const near = new THREE.Group();
      near.visible = false;
      group.add(base, content, tags, near);
      world.add(group);
      const materials: THREE.Material[] = [];
      const colours = LEVEL[p.level];
      const plinth = slab(sectorShape(R0, R1, p.a0, p.a1), p.h, keep(materials, new THREE.MeshStandardMaterial({ color: colours.plinth, roughness: 0.85, transparent: true, opacity: p.level === 'planned' ? 0.75 : 0.95, emissive: p.level === 'focus' ? new THREE.Color('#0a3550') : new THREE.Color('#000000') })));
      plinth.userData['hit'] = { kind: 'phase', index: i } satisfies Hit;
      base.add(plinth);
      pickables.push(plinth);
      const rim = keep(materials, new THREE.LineBasicMaterial({ color: colours.rim, transparent: true, opacity: p.level === 'planned' ? 0.5 : 1 })) as THREE.LineBasicMaterial;
      base.add(arcLine(R1, p.a0, p.a1, p.h + 0.02, rim), arcLine(R0, p.a0, p.a1, p.h + 0.02, rim));
      if (p.level === 'focus') {
        const glow = new THREE.Mesh(new THREE.RingGeometry(R1 + 0.2, R1 + 0.45, 96, 1, p.a0, p.a1 - p.a0), keep(materials, new THREE.MeshBasicMaterial({ color: FOCUS, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
        glow.rotation.x = -Math.PI / 2;
        glow.scale.y = -1; // RingGeometry turned flat runs the other way round
        glow.position.y = p.h + 0.05;
        base.add(glow);
        pulses.push(glow.material as THREE.Material);
      }
      // The exit criteria: a collar of cells round the rim, lit when met (TASK-0164).
      p.exit.cells.forEach((cell, k) => {
        const material = keep(materials, cell.ticked
          ? new THREE.MeshStandardMaterial({ color: EXIT, emissive: EXIT.clone().multiplyScalar(0.45), roughness: 0.4, transparent: true, opacity: 1 })
          : new THREE.MeshStandardMaterial({ color: '#0b2a33', roughness: 0.9, transparent: true, opacity: 0.9 }));
        const mesh = slab(sectorShape(collar[0], collar[1], cell.a0, cell.a1), p.h + (cell.ticked ? 0.45 : 0.15), material);
        mesh.userData['hit'] = { kind: 'exit', label: `${p.id} exit criterion ${k + 1} of ${p.exit.cells.length}, ${cell.ticked ? 'met' : 'not yet met'}: ${cell.text}` } satisfies Hit;
        base.add(mesh);
        pickables.push(mesh);
        if (!cell.ticked) {
          const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), keep(materials, new THREE.LineBasicMaterial({ color: EXIT, transparent: true, opacity: 0.8 })));
          edge.rotation.copy(mesh.rotation);
          edge.position.copy(mesh.position);
          base.add(edge);
        }
      });
      if (p.exit.cells.length === 0 && p.exit.prose) {
        const dashed = new THREE.LineDashedMaterial({ color: EXIT, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.8 });
        keep(materials, dashed);
        const line = arcLine((collar[0] + collar[1]) / 2, p.a0, p.a1, p.h + 0.1, dashed);
        line.computeLineDistances();
        base.add(line);
      }
      // Its number and name outside the rim, and the red count of what needs you.
      const nameAt = new THREE.Vector3((collar[1] + 6) * Math.cos(p.mid), p.h + 3.4, (collar[1] + 6) * Math.sin(p.mid));
      // By feature a segment is named by its id and a few words of its title, smaller than a phase's name (TASK-0185).
      const byFeature = next.group === 'feature';
      const nameText = byFeature ? `${p.level === 'focus' ? '▶ ' : ''}${p.id} ${shortName(p.short, p.level === 'focus' ? 5 : 2)}` : `${p.level === 'focus' ? '▶ ' : ''}${p.number} ${p.level === 'focus' ? p.short : shortName(p.short, 3)}`;
      const lines: Array<{ text: string; size: number; colour: string; weight?: number }> = [{ text: nameText, size: (p.level === 'focus' ? 3.4 : p.level === 'active' ? 2.8 : 2.2) * (byFeature ? 0.6 : 1), colour: colours.name, weight: p.level === 'focus' ? 800 : 600 }];
      if (p.needs > 0) lines.push({ text: `● ${p.needs}`, size: 2.1, colour: NEEDS_YOU.replace(/hsl\((\d+) (\d+)% (\d+)%\)/, 'hsl($1, $2%, $3%)'), weight: 700 });
      const name = sprite(lines, p.level === 'focus');
      name.position.copy(nameAt);
      tags.add(name);
      const b = buckets();
      for (const c of p.tiles) addCube(b, c, i);
      for (const tower of p.towers) {
        for (const c of tower.cubes) addCube(b, c, i);
        const idTag = label(tower.feature, 1.1, tower.focus ? '#c9f6ff' : '#cfe3ee', 700);
        idTag.position.set(tower.x + Math.cos(tower.angle) * 2.0, p.h + 0.5, tower.z + Math.sin(tower.angle) * 2.0);
        near.add(idTag);
        if (tower.cap !== null) {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.3, 3.0), keep(materials, new THREE.MeshBasicMaterial({ color: NEEDS, transparent: true, opacity: 0.95 })));
          cap.position.set(tower.x, tower.top + 0.3, tower.z);
          cap.rotation.y = -tower.angle;
          cap.userData['hit'] = { kind: 'cap', label: tower.cap.label, target: tower.cap.target } satisfies Hit;
          content.add(cap);
          pickables.push(cap);
        }
        if (tower.age !== null) {
          const badge = label(`◷ ${tower.age} d`, 1.25, '#f0c987', 700);
          badge.position.set(tower.x, tower.top + (tower.cap !== null ? 1.6 : 1.1), tower.z);
          badge.visible = agesOn;
          badge.userData['words'] = `◷ ${tower.age} d`;
          content.add(badge);
          ageBadges.push(badge);
        }
        if (tower.focus) {
          const height = 26;
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.6, height, 32, 1, true), new THREE.MeshBasicMaterial({ color: FOCUS, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: fade }));
          beam.position.set(tower.x, tower.top + height / 2, tower.z);
          content.add(beam);
          beams.push(beam.material as THREE.MeshBasicMaterial);
          const tag = label(`${tower.feature} · in focus`, 2.1, '#c9f6ff', 700, true);
          tag.position.set(tower.x, tower.top + 3.2, tower.z);
          tags.add(tag);
        }
      }
      drawBuckets(b, content, materials);
      if (p.exit.cells.length > 0) {
        const met = p.exit.cells.filter((c) => c.ticked).length;
        const words = label(`exit criteria · ${met} of ${p.exit.cells.length} met`, 1.3, '#bff3e6', 700);
        words.position.set((collar[1] + 3.2) * Math.cos(p.mid), p.h + 0.8, (collar[1] + 3.2) * Math.sin(p.mid));
        near.add(words);
      }
      phases.push({ phase: p, group, content, tags, near, materials });
    });

    // Finished phases outside the ring, as blocks.
    shelfGroup = new THREE.Group();
    world.add(shelfGroup);
    shelfMaterials = [];
    const sb = buckets();
    next.shelf.forEach((s) => {
      for (const c of s.cubes) addCube(sb, c, null);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.2, 32), keep(shelfMaterials, new THREE.MeshStandardMaterial({ color: '#0a1a26', roughness: 0.9, transparent: true, opacity: 1 })));
      pad.position.set(s.x, 0.05, s.z);
      pad.userData['hit'] = { kind: 'shelf', label: s.label, target: s.target } satisfies Hit;
      shelfGroup.add(pad);
      pickables.push(pad);
      const tag = label(s.number, 1.6, '#6f93a8', 500);
      tag.position.set(s.x, 0.62 * Math.ceil(s.cubes.length / 25) + 2.2, s.z);
      shelfGroup.add(tag);
    });
    drawBuckets(sb, shelfGroup, shelfMaterials);

    // The core: the tickets with no phase, round the way into re-phasing.
    coreGroup = new THREE.Group();
    world.add(coreGroup);
    coreMaterials = [];
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(next.coreR, next.coreR, 0.6, 64), keep(coreMaterials, new THREE.MeshStandardMaterial({ color: '#0b2232', roughness: 0.9, transparent: true, opacity: 1 })));
    disc.position.y = 0.3;
    disc.userData['hit'] = { kind: 'core' } satisfies Hit;
    coreGroup.add(disc);
    pickables.push(disc);
    const cb = buckets();
    for (const c of next.core) addCube(cb, c, null);
    drawBuckets(cb, coreGroup, coreMaterials);
    const coreTag = sprite([{ text: String(next.unplaced), size: 2.8, colour: '#e6f8ff', weight: 700 }, { text: 'no phase', size: 1.6, colour: '#9cc4d6' }]);
    coreTag.position.set(0, 3.4, 0);
    coreGroup.add(coreTag);

    nextMark = new THREE.Group();
    const n = next.next !== null ? where.get(next.next) : undefined;
    if (n !== undefined) {
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.5, 1.5)), new THREE.LineBasicMaterial({ color: 0xffffff }));
      box.position.copy(n.at);
      nextMark.add(box);
      const ph = n.phase !== null ? next.phases[n.phase] : undefined;
      const out = ph !== undefined ? new THREE.Vector3(Math.cos(ph.mid), 0, Math.sin(ph.mid)) : new THREE.Vector3(1, 0, 0);
      const tag = label(`next ▸ ${next.next}`, 1.8, '#ffffff', 800, true);
      tag.position.copy(n.at).addScaledVector(out, 2.6).add(new THREE.Vector3(0, 3.4, 0));
      nextMark.add(tag);
    }
    world.add(nextMark, selection);
    chosen = new THREE.Group();
    world.add(chosen);
    runners = [];
    chosenSignature = '';
    glows = new THREE.Group();
    world.add(glows);
    drawFound();
    drawPictures();
    drawAgents();
  }

  /** The pictures of the layout, as figures over the canvas; made again only when the pictures change. */
  function drawPictures(): void {
    const pics = layout?.pictures ?? [];
    const sig = JSON.stringify(pics.map((p) => [p.href, p.at, p.slot, p.near]));
    if (sig === picturesSignature) return;
    picturesSignature = sig;
    pictureBox.replaceChildren();
    figures = pics.map((pic) => {
      const el = document.createElement('figure');
      el.className = `ov-picture near-${pic.near}`;
      el.title = pic.label;
      el.dataset['picture'] = pic.ticket;
      const img = document.createElement('img');
      img.alt = pic.label;
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = pic.href;
      img.draggable = false;
      el.appendChild(img);
      // The pointer passes through to the canvas, so a drag that starts on a picture still turns
      // the ring; the canvas sees when a press or a hover lands on one (`pictureAt`).
      pictureBox.appendChild(el);
      return { el, img, pic, at: new THREE.Vector3(...pic.at) };
    });
  }

  /**
   * The agents over the tickets they were started on (FEAT-0033, TASK-0199), laid over the canvas as
   * small marks a press opens: the fill their state, the ring their agent, a working one breathing.
   * Made again only when the agents change.
   */
  function drawAgents(): void {
    const marks = layout?.agents ?? [];
    const sig = JSON.stringify(marks.map((m) => [m.id, m.state, m.at, layout?.session?.id === `session:${m.id}`]));
    if (sig === agentsSignature) return;
    agentsSignature = sig;
    agentBox.replaceChildren();
    agentMarks = marks.map((marker) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `ov-agent-mark ag-${marker.agent} st-${marker.state}${layout?.session?.id === `session:${marker.id}` ? ' is-open' : ''}`;
      el.dataset['agent'] = marker.id;
      el.setAttribute('aria-label', marker.label);
      el.addEventListener('click', (e) => { e.stopPropagation(); options.onPress(marker.target); });
      el.addEventListener('pointerenter', (e) => options.onHover(marker.label, e.clientX, e.clientY));
      el.addEventListener('pointerleave', () => options.onHover(null, 0, 0));
      agentBox.appendChild(el);
      return { el, marker, at: new THREE.Vector3(...marker.at) };
    });
  }

  /** Each frame: every agent's mark over its ticket; with a phase brought close, only that phase's. */
  function placeAgents(): void {
    const box = canvas.getBoundingClientRect();
    const open = layout?.open ?? null;
    for (const a of agentMarks) {
      PICTURE_AT.copy(a.at).project(camera);
      if ((open !== null && a.marker.segment !== open) || PICTURE_AT.z > 1) {
        a.el.style.display = 'none';
        continue;
      }
      a.el.style.display = '';
      a.el.style.transform = `translate(${(((PICTURE_AT.x + 1) / 2) * box.width).toFixed(1)}px, ${(((1 - PICTURE_AT.y) / 2) * box.height).toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  /** The picture under the pointer, the nearest when they overlap, or null. */
  function pictureAt(x: number, y: number): (typeof figures)[number] | null {
    let best: (typeof figures)[number] | null = null;
    let depth = -Infinity;
    for (const f of figures) {
      if (f.el.style.display === 'none') continue;
      const r = f.el.getBoundingClientRect();
      const z = Number(f.el.style.zIndex || 0);
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && z > depth) {
        best = f;
        depth = z;
      }
    }
    return best;
  }

  /** Each frame: every picture over its ticket, scaled by nearness and only a little by distance. */
  function placePictures(): void {
    const box = canvas.getBoundingClientRect();
    const open = layout?.open ?? null;
    const hush = chosenOf() !== null || found !== null;
    for (const f of figures) {
      // With a phase brought close, only its pictures stand.
      if (open !== null && f.pic.segment !== open) {
        f.el.style.display = 'none';
        continue;
      }
      PICTURE_AT.copy(f.at).project(camera);
      if (PICTURE_AT.z > 1) {
        f.el.style.display = 'none';
        continue;
      }
      const dist = camera.position.distanceTo(f.at);
      // Distance changes the size only a little, so how near the ticket is to the work decides which is larger.
      const k = f.pic.size * Math.min(DISTANCE_RANGE[1], Math.max(DISTANCE_RANGE[0], Math.pow(150 / dist, 0.3)));
      const x = ((PICTURE_AT.x + 1) / 2) * box.width + f.pic.slot * 124 * k;
      const y = ((1 - PICTURE_AT.y) / 2) * box.height;
      f.el.style.display = '';
      f.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`;
      f.el.style.opacity = String((hush ? 0.35 : 1) * f.pic.alpha);
      f.el.style.zIndex = String(1000 - Math.round(dist));
    }
  }

  /** A glow over every ticket a search found, where it stands (TASK-0183). */
  function drawFound(): void {
    for (const o of [...glows.children]) {
      glows.remove(o);
      const m = o as THREE.Mesh;
      (m.material as THREE.Material).dispose();
      const at = pulses.indexOf(m.material as THREE.Material);
      if (at >= 0) pulses.splice(at, 1);
    }
    if (found === null) return;
    const at = found.map((id) => where.get(id)).filter((w): w is { at: THREE.Vector3; phase: number | null } => w !== undefined).slice(0, GLOW_CAP);
    if (at.length === 0) return;
    const material = new THREE.MeshBasicMaterial({ color: FOCUS, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    material.userData['base'] = 0.55;
    const mesh = new THREE.InstancedMesh(BOX, material, at.length);
    at.forEach((w, i) => mesh.setMatrixAt(i, new THREE.Matrix4().compose(w.at, new THREE.Quaternion(), new THREE.Vector3(1.7, 1.7, 1.7))));
    mesh.renderOrder = 12;
    glows.add(mesh);
    pulses.push(material);
  }

  /**
   * The selected ticket (TASK-0182): a curve rising from it to every ticket it is joined
   * to, in that ticket's type colour, with a light running along it from the selected
   * ticket; each linked ticket outlined, with its id while there are few enough.
   */
  function drawChosen(): void {
    const sel = chosenOf();
    const sig = sel === null ? '' : JSON.stringify([sel.id, sel.at, sel.links.length, sel.links[0]?.to ?? null]);
    if (sig === chosenSignature) return;
    chosenSignature = sig;
    for (const o of [...chosen.children]) {
      chosen.remove(o);
      if (o instanceof THREE.Sprite && labels.includes(o)) labels.splice(labels.indexOf(o), 1);
      o.traverse((x) => {
        const m = x as THREE.Mesh;
        if (m.geometry !== undefined && m.geometry !== BOX && m.geometry !== DOT) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        if (mat !== undefined) { (mat as THREE.SpriteMaterial).map?.dispose(); mat.dispose(); }
      });
    }
    runners = [];
    if (sel === null || layout === null) return;
    const from = new THREE.Vector3(...sel.at);
    const outline = (at: THREE.Vector3, size: number, colour: THREE.Color): THREE.LineSegments => {
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 1, depthTest: false }));
      box.position.copy(at);
      box.renderOrder = 12;
      return box;
    };
    for (const link of sel.links) {
      const to = new THREE.Vector3(...link.to);
      const colour = colourOf(TYPE_COLOUR[link.type]);
      const span = from.distanceTo(to);
      const mid = from.clone().add(to).multiplyScalar(0.5).add(new THREE.Vector3(0, Math.min(60, 4 + span * 0.32), 0));
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.9, depthWrite: false }));
      line.renderOrder = 11;
      chosen.add(line, outline(to, 1.6, colour));
      const runner = new THREE.Mesh(DOT, new THREE.MeshBasicMaterial({ color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: 0.95, depthTest: false }));
      runner.renderOrder = 13;
      runner.position.copy(curve.getPoint(0.5));
      chosen.add(runner);
      runners.push({ mesh: runner, curve });
      if (sel.labelled) {
        const tag = label(link.id, 0.9, '#e6f8ff', 700, true);
        tag.position.copy(to).add(new THREE.Vector3(0, 1.4, 0));
        chosen.add(tag);
      }
    }
    chosen.add(outline(from, 2.0, new THREE.Color('#fff3a0')));
  }

  /** Who is shown and how faded: the phase brought close, and the rest faded while something is selected. */
  function applyLook(): void {
    const open = layout?.open ?? null;
    const hush = chosenOf() !== null || found !== null;
    const set = (materials: THREE.Material[], k: number): void => {
      for (const m of materials) {
        m.transparent = true;
        m.userData['dim'] = k;
        m.opacity = (m.userData['base'] ?? 1) * k;
      }
    };
    for (const g of phases) {
      const mine = open === null || g.phase.id === open;
      // With a phase close the others are plinths only, unless something is selected: then they
      // come back faded, so a curve that leaves the phase lands on its ticket.
      g.content.visible = mine || hush;
      g.tags.visible = open === null;
      g.near.visible = open !== null && g.phase.id === open;
      set(g.materials, hush ? (mine ? 0.3 : 0.16) : mine ? 1 : 0.25);
    }
    shelfGroup.visible = open === null || hush;
    coreGroup.visible = open === null || hush;
    set(shelfMaterials, hush ? 0.3 : 1);
    set(coreMaterials, hush ? 0.3 : 1);
    drawChosen();
    // The pane a selection opens stands at the right; the ring moves left of it, as for a phase's list.
    const want = open === null && !hush ? 0 : Math.round(options.clearRight() / 2);
    if (want !== offset) {
      offset = want;
      resize();
    }
  }

  const signatureOf = (l: TowersLayout): string => JSON.stringify([l.workspace, l.colouring, l.R1.toFixed(3), l.phases.map((p) => [p.id, p.level, p.tiles.length, p.towers.length, p.needs, p.towers.map((t) => t.age)]), l.shelf.length, l.core.length, l.next, l.focus]);

  // -------------------------------------------------------------------------
  // The camera.
  const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const openPhase = (): PhaseGroup | undefined => (layout?.open ? phases.find((g) => g.phase.id === layout!.open) : undefined);
  const homeOrbit = (): Orbit => {
    const l = layout;
    if (l === null) return { ...view, target: view.target.clone() };
    const open = openPhase();
    if (open !== undefined) {
      const p = open.phase;
      const rMid = (l.R0 + l.R1) / 2;
      const span = Math.min((p.a1 - p.a0) * rMid, 2 * rMid);
      return { radius: Math.max(38, span * 1.05 + p.tallest * 1.35 + 18), theta: p.mid, phi: 1.08, target: new THREE.Vector3(rMid * Math.cos(p.mid), p.h + p.tallest / 2 + 2, rMid * Math.sin(p.mid)) };
    }
    const focus = l.phases.find((p) => p.level === 'focus') ?? l.phases[0];
    return { radius: l.R1 * 2.7 + 30, theta: focus?.mid ?? 0, phi: 0.98, target: new THREE.Vector3(0, 4, 0) };
  };
  const clampOrbit = (v: Orbit): void => {
    v.phi = Math.min(1.47, Math.max(0.04, v.phi));
    const reach = layout === null ? 900 : (layout.shelfR + 40) * 4;
    v.radius = Math.min(reach, Math.max(18, v.radius));
    if (layout !== null) {
      const flat = new THREE.Vector2(v.target.x, v.target.z);
      if (flat.length() > layout.shelfR + 10) flat.setLength(layout.shelfR + 10);
      v.target.set(flat.x, Math.min(60, Math.max(0, v.target.y)), flat.y);
    }
  };
  const place = (): void => {
    clampOrbit(view);
    camera.position.set(view.target.x + view.radius * Math.sin(view.phi) * Math.cos(view.theta), view.target.y + view.radius * Math.cos(view.phi), view.target.z + view.radius * Math.sin(view.phi) * Math.sin(view.theta));
    camera.lookAt(view.target);
    options.onCamera?.();
  };
  const moved = (): boolean => {
    const h = homeOrbit();
    return Math.abs(view.radius - h.radius) > 0.5 || Math.abs(angleDiff(view.theta, h.theta)) > 0.01 || Math.abs(view.phi - h.phi) > 0.01 || view.target.distanceTo(h.target) > 0.5;
  };
  const glideTo = (goal: Orbit, ms = 520): void => {
    if (options.reduced()) {
      view.radius = goal.radius;
      view.theta = goal.theta;
      view.phi = goal.phi;
      view.target.copy(goal.target);
      glide = null;
      place();
      return;
    }
    glide = { from: { ...view, target: view.target.clone() }, goal, t0: performance.now(), ms };
  };
  const stepGlide = (now: number): void => {
    if (glide === null) return;
    const k = Math.min(1, (now - glide.t0) / glide.ms);
    const e = 1 - Math.pow(1 - k, 3);
    view.radius = glide.from.radius + (glide.goal.radius - glide.from.radius) * e;
    view.theta = glide.from.theta + angleDiff(glide.goal.theta, glide.from.theta) * e;
    view.phi = glide.from.phi + (glide.goal.phi - glide.from.phi) * e;
    view.target.lerpVectors(glide.from.target, glide.goal.target, e);
    place();
    if (k >= 1) glide = null;
  };

  /** Bring the layout's open phase close, or the whole ring back: fade, show, fly. */
  const applyOpen = (animate: boolean): void => {
    const open = layout?.open ?? null;
    applyLook();
    const n = layout?.next ? where.get(layout.next) : undefined;
    nextMark.visible = open === null || (n !== undefined && layout?.phases[n.phase ?? -1]?.id === open);
    resize();
    if (animate) glideTo(homeOrbit());
    else {
      const h = homeOrbit();
      Object.assign(view, { radius: h.radius, theta: h.theta, phi: h.phi });
      view.target.copy(h.target);
      place();
    }
  };

  // -------------------------------------------------------------------------
  // Pointing and pressing.
  const ray = new THREE.Raycaster();
  const hitAt = (x: number, y: number): Hit | null => {
    if (layout === null) return null;
    const box = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1), camera);
    const visible = pickables.filter((o) => {
      for (let p: THREE.Object3D | null = o; p !== null; p = p.parent) if (!p.visible) return false;
      return true;
    });
    for (const h of ray.intersectObjects(visible, false)) {
      const cubes = h.object.userData['cubes'] as Cube[] | undefined;
      if (cubes !== undefined && h.instanceId !== undefined) {
        const cube = cubes[h.instanceId]!;
        return { kind: 'cube', cube, phase: where.get(cube.id)?.phase ?? null };
      }
      const hit = h.object.userData['hit'] as Hit | undefined;
      if (hit !== undefined) return hit;
    }
    return null;
  };
  const labelOf = (hit: Hit): string => {
    switch (hit.kind) {
      case 'cube': return hit.cube.label;
      case 'cap': return `${hit.label}. Press to open ${hit.target.includes('page=ticket') ? 'it' : 'the phase, with these first'}.`;
      case 'exit': return hit.label;
      case 'phase': return `${layout!.phases[hit.index]!.label}${layout!.open === layout!.phases[hit.index]!.id ? '' : '. Press to bring it close.'}`;
      case 'shelf': return hit.label;
      case 'core': return layout!.coreLabel;
    }
  };
  const targetOf = (hit: Hit): string | null => {
    switch (hit.kind) {
      case 'cube': return hit.cube.target;
      case 'cap': return hit.target;
      case 'exit': return null;
      case 'phase': return layout!.open === layout!.phases[hit.index]!.id ? null : layout!.phases[hit.index]!.target;
      case 'shelf': return hit.target;
      case 'core': return layout!.coreTarget;
    }
  };
  const drawWires = (hit: Hit | null): void => {
    if (wires !== null) {
      world.remove(wires);
      wires.geometry.dispose();
      wires = null;
    }
    // A selected ticket's curves stand for the links; pointing draws none over them (TASK-0182).
    if (hit?.kind !== 'cube' || options.linksOf === undefined || chosenOf() !== null) return;
    const from = where.get(hit.cube.id)?.at;
    if (from === undefined) return;
    const pts: THREE.Vector3[] = [];
    for (const id of options.linksOf(hit.cube.id)) {
      const to = where.get(id);
      if (to === undefined || id === hit.cube.id) continue;
      if (layout?.open && to.phase !== null && layout.phases[to.phase]?.id !== layout.open) continue;
      pts.push(from, to.at);
    }
    if (pts.length === 0) return;
    wires = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.6 }));
    world.add(wires);
  };

  let drag: { x: number; y: number; x0: number; y0: number; pan: boolean; button: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, pan: e.shiftKey || e.button === 2, button: e.button };
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 1) e.preventDefault();
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerup', (e) => {
    const was = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (was === null || was.button !== 0 || Math.hypot(e.clientX - was.x0, e.clientY - was.y0) > 4) return;
    // A press on a picture selects its ticket (TASK-0186), except at the core's middle, which is
    // the way into re-phasing and wins over a picture standing in front of it.
    const middle = screenAt(new THREE.Vector3(0, 0.6, 0));
    const picture = Math.hypot(e.clientX - middle.x, e.clientY - middle.y) < 48 ? null : pictureAt(e.clientX, e.clientY);
    if (picture !== null) {
      options.onPress(picture.pic.target);
      return;
    }
    const hit = hitAt(e.clientX, e.clientY);
    const target = hit === null ? null : targetOf(hit);
    if (target !== null) options.onPress(target);
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (drag !== null) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) <= 4) return;
      if (drag.pan || e.shiftKey) api.pan(dx, dy);
      else api.orbit(dx, dy);
      options.onHover(null, 0, 0);
      return;
    }
    const picture = pictureAt(e.clientX, e.clientY);
    for (const f of figures) f.el.classList.toggle('is-pointed', f === picture);
    if (picture !== null) {
      canvas.style.cursor = 'pointer';
      drawWires(null);
      options.onHover(picture.pic.label, e.clientX, e.clientY);
      return;
    }
    const hit = hitAt(e.clientX, e.clientY);
    canvas.style.cursor = hit !== null && targetOf(hit) !== null ? 'pointer' : 'default';
    drawWires(hit);
    options.onHover(hit === null ? null : labelOf(hit), e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    drawWires(null);
    options.onHover(null, 0, 0);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    api.zoom(Math.exp(-Math.max(-240, Math.min(240, e.ctrlKey ? e.deltaY * 4 : e.deltaY)) * 0.0018));
  }, { passive: false });
  canvas.addEventListener('dblclick', (e) => { if (hitAt(e.clientX, e.clientY) === null) api.home(); });

  const resize = (): void => {
    const parent = canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    const h = Math.max(1, parent?.clientHeight ?? window.innerHeight);
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    if (offset > 0) camera.setViewOffset(w, h, offset, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const screenAt = (p: THREE.Vector3): { x: number; y: number } => {
    const v = p.clone().project(camera);
    const box = canvas.getBoundingClientRect();
    return { x: box.left + ((v.x + 1) / 2) * box.width, y: box.top + ((1 - v.y) / 2) * box.height };
  };

  const api: TowersView = {
    canvas,
    overlay,
    show(next) {
      const sig = signatureOf(next);
      const wasOpen = layout?.open ?? null;
      if (sig !== signature || layout === null) {
        const first = layout === null;
        signature = sig;
        build(next);
        applyOpen(!first && wasOpen !== next.open);
      } else {
        layout = next;
        drawPictures();
        // The agents change without the ring changing: a session starts, waits, stops (TASK-0201's walk).
        drawAgents();
        if (wasOpen !== next.open) applyOpen(true);
        else applyLook();
      }
      selection.visible = false;
    },
    home() { glideTo(homeOrbit()); },
    view(name) {
      const h = homeOrbit();
      glideTo({ radius: name === 'side' ? Math.min(view.radius, h.radius * 0.72) : name === 'above' ? Math.max(view.radius, h.radius * 1.12) : view.radius, theta: view.theta, phi: VIEW_PHI[name], target: name === 'side' ? view.target.clone().setY(8) : view.target.clone() });
    },
    isMoved: () => moved(),
    orbit(dx, dy) {
      glide = null;
      // The near edge follows the hand: dragging right moves the camera round so the front goes right.
      view.theta += dx * 0.004;
      view.phi -= dy * 0.005;
      place();
    },
    pan(dx, dy) {
      glide = null;
      const right = new THREE.Vector3().subVectors(camera.position, view.target).cross(camera.up).normalize();
      const forward = new THREE.Vector3().subVectors(view.target, camera.position).setY(0).normalize();
      const k = view.radius * 0.0016;
      view.target.addScaledVector(right, dx * k).addScaledVector(forward, dy * k);
      place();
    },
    zoom(factor) {
      glide = null;
      view.radius /= factor;
      place();
    },
    select(id) {
      const w = id === null ? undefined : where.get(id);
      selection.visible = w !== undefined;
      if (w !== undefined) selection.position.copy(w.at);
    },
    showAges(on) {
      agesOn = on;
      for (const b of ageBadges) b.visible = on;
    },
    light(ids) {
      found = ids === null ? null : [...ids];
      drawFound();
      applyLook();
    },
    flyTo(id) {
      const w = where.get(id);
      if (w === undefined) return;
      glideTo({ radius: Math.min(view.radius, 70), theta: Math.atan2(w.at.z, w.at.x) || view.theta, phi: 0.95, target: w.at.clone() });
    },
    frame() {
      const sel = chosenOf();
      if (sel === null) return;
      const box = new THREE.Box3().setFromPoints([new THREE.Vector3(...sel.at), ...sel.links.map((l) => new THREE.Vector3(...l.to))]);
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      glideTo({ radius: Math.max(30, Math.max(size.x, size.z) * 1.25 + size.y + 24), theta: Math.atan2(centre.z, centre.x) || view.theta, phi: 0.9, target: centre });
    },
    resize,
    probe: {
      screenOf: (id) => { const w = where.get(id); return w === undefined ? null : screenAt(w.at); },
      capOf: (feature) => {
        for (const g of phases) for (const t of g.phase.towers) if (t.feature === feature && t.cap !== null) return screenAt(new THREE.Vector3(t.x, t.top + 0.3, t.z));
        return null;
      },
      phaseAt: (id) => {
        const p = layout?.phases.find((x) => x.id === id);
        if (p === undefined || layout === null) return null;
        const r = layout.R0 + 1.2;
        return screenAt(new THREE.Vector3(r * Math.cos(p.mid), p.h, r * Math.sin(p.mid)));
      },
      coreAt: () => screenAt(new THREE.Vector3(0, 0.6, 0)),
      open: () => layout?.open ?? null,
      selected: () => {
        const sel = chosenOf();
        if (sel === null) return null;
        const lines = chosen.children.filter((o) => o instanceof THREE.Line && !(o instanceof THREE.LineSegments)).length;
        const boxes = chosen.children.filter((o) => o instanceof THREE.LineSegments).length;
        const labelled = chosen.children.filter((o) => o instanceof THREE.Sprite).length;
        const faded = phases.every((g) => g.materials.every((m) => (m.userData['dim'] ?? 1) < 0.5));
        return { id: sel.id, curves: lines, outlined: boxes - 1, labelled, faded };
      },
      agents: () => agentMarks.map((a) => { const r = a.el.getBoundingClientRect(); return { id: a.marker.id, ticket: a.marker.ticket, state: a.marker.state, shown: a.el.style.display !== 'none' && r.width > 0, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }),
      pictures: () => figures.map((f) => { const r = f.el.getBoundingClientRect(); return { ticket: f.pic.ticket, near: f.pic.near, shown: f.el.style.display !== 'none' && r.width > 0, width: Math.round(r.width), loaded: f.img.complete && f.img.naturalWidth > 0, x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom) }; }),
      ages: () => ({ badges: ageBadges.length, shown: ageBadges.filter((b) => b.visible).length, words: ageBadges.map((b) => String(b.userData['words'])) }),
      found: () => (found === null ? null : { lit: found.length, glows: glows.children.reduce((n, o) => n + ((o as THREE.InstancedMesh).count ?? 0), 0), faded: phases.every((g) => g.materials.every((m) => (m.userData['dim'] ?? 1) < 0.5)) }),
      camera: () => ({ radius: view.radius, theta: view.theta, phi: view.phi, moved: moved(), reach: Math.hypot(view.target.x, view.target.z), limit: layout === null ? 0 : layout.shelfR + 10 }),
      // A picture in front of a ticket is what a press there reaches (TASK-0186).
      hit: (x, y) => { const p = pictureAt(x, y); if (p !== null) return `picture:${p.pic.ticket}`; const h = hitAt(x, y); return h === null ? null : h.kind === 'cube' ? h.cube.id : h.kind; },
    },
  };

  const pick = new THREE.Vector3();
  renderer.setAnimationLoop((now) => {
    // Nothing is drawn while the canvas cannot be seen: off the page, or under a hidden
    // overview, so the field and everything else keep the machine to themselves.
    if (!canvas.isConnected || canvas.offsetParent === null || document.hidden) return;
    stepGlide(now);
    placePictures();
    placeAgents();
    for (const s of labels) {
      const k = Math.sqrt(Math.max(1, camera.position.distanceTo(s.getWorldPosition(pick))) / 120);
      const [w, h] = s.userData['size'] as [number, number];
      s.scale.set(w * k, h * k, 1);
    }
    // The lights run along the curves from the selected ticket; still, for less motion, they sit halfway.
    const reduced = options.reduced();
    if (!reduced) runners.forEach((r, i) => r.mesh.position.copy(r.curve.getPoint(((now / 1800) + i * 0.137) % 1)));
    if (!reduced) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 420);
      for (const m of pulses) m.opacity = (m.userData['base'] ?? 0.4) * (m.userData['dim'] ?? 1) * (0.45 + 0.55 * pulse);
      for (const m of beams) m.opacity = 0.14 + 0.12 * pulse;
    }
    renderer.render(scene, camera);
  });
  return api;
}
