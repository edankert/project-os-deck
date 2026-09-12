// TST-0041 — the slot geometry: the bands become positions on a cylinder, a
// thousand quiet tiles have a stated shape, an obstacle is a sector, and a
// turn deals nothing (TASK-0030).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const {
  assignSlots,
  norm,
  bandShapeFor,
  shapesFor,
  outerSlots,
  OUTER,
  MID,
  FRONT,
  TILE_BOX,
  quietSlot,
  frontSlots,
  midSlots,
  project,
  cardTransform,
  cardRect,
  obstaclesFor,
  blocked,
  inSector,
  FieldModel,
  behindCount,
  CARD_BOX,
  QUIET,
  DEG,
} = load('shared/slots.js');

const VIEWPORT = { width: 1000, height: 700 };

function bands(front, mid, deep, outer = 0) {
  const make = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
  return { front: make('F', front), mid: make('M', mid), outer: make('O', outer), deep: make('D', deep) };
}

test('2660 notes, Your Trainer’s size, all have a position and no two coincide', () => {
  const dealt = bands(12, 40, 2608);
  const { slots, frontOverflow, midOverflow } = assignSlots(dealt);
  assert.equal(frontOverflow, 0);
  assert.equal(midOverflow, 0);
  assert.equal(slots.size, 2660);
  const places = new Set([...slots.values()].map((s) => `${s.theta.toFixed(6)}|${s.depth}|${s.y}`));
  assert.equal(places.size, 2660, 'two notes were given the same place');
});

test('the quiet band has a stated shape: forty to a row, twenty-five rows, a layer per thousand', () => {
  assert.equal(QUIET.columns * QUIET.rows, 1000);
  assert.deepEqual([quietSlot(0).row, quietSlot(0).column, quietSlot(0).layer], [0, 0, 0]);
  assert.deepEqual([quietSlot(39).row, quietSlot(39).column], [0, 39]);
  assert.deepEqual([quietSlot(40).row, quietSlot(40).column], [1, 0]);
  assert.deepEqual([quietSlot(999).row, quietSlot(999).column, quietSlot(999).layer], [24, 39, 0]);
  assert.deepEqual([quietSlot(1000).row, quietSlot(1000).column, quietSlot(1000).layer], [0, 0, 1]);
  assert.ok(quietSlot(1000).depth > quietSlot(999).depth, 'the next layer stands further back');
  // Behind the person: a quiet tile is out of sight while facing the front band.
  for (const i of [0, 20, 39, 500, 999]) {
    assert.equal(project(quietSlot(i), 0, VIEWPORT).visible, false, `quiet tile ${i} is visible from the front`);
  }
  assert.equal(project(quietSlot(539), Math.PI, VIEWPORT).visible, true, 'turning round shows the middle of the quiet band');
});

test('no slot inside an obstacle is dealt to a card, at any yaw', () => {
  for (const yawDeg of [0, 25, 70, 140, 200, 290]) {
    const yaw = yawDeg * DEG;
    // A pane on the left third of the screen, turned into sectors at this yaw.
    const obstacles = obstaclesFor({ left: 0, right: 330 }, yaw, VIEWPORT);
    const { slots } = assignSlots(bands(12, 40, 10), obstacles);
    for (const [id, slot] of slots) {
      assert.equal(blocked(slot, obstacles), false, `${id} was dealt into the obstacle at yaw ${yawDeg}`);
    }
    // And on screen at that yaw, no dealt near card's box crosses the pane.
    for (const [id, slot] of slots) {
      if (slot.band === 'deep') continue;
      const p = project(slot, yaw, VIEWPORT);
      if (!p.visible) continue;
      assert.ok(cardRect(p).left >= 330 - 0.5, `${id} is drawn under the pane at yaw ${yawDeg} (left ${cardRect(p).left.toFixed(1)})`);
    }
  }
});

test('over random panes and yaws, no visible card is drawn under a pane (ISS-0058)', () => {
  // A seeded walk, so a failure names a placement that can be replayed.
  let seed = 12345;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let checked = 0;
  for (let i = 0; i < 3000; i += 1) {
    const width = 700 + Math.floor(random() * 900);
    const viewport = { width, height: 700 };
    const w = 280 + Math.floor(random() * 300);
    const left = Math.floor(random() * Math.max(1, width - w));
    const yaw = (random() * 2 - 1) * Math.PI;
    const obstacles = obstaclesFor({ left, right: left + w }, yaw, viewport);
    const { slots } = assignSlots(bands(12, 40, 0), obstacles);
    for (const [id, slot] of slots) {
      const p = project(slot, yaw, viewport);
      if (!p.visible) continue;
      const r = cardRect(p);
      checked += 1;
      assert.ok(r.right <= left + 0.5 || r.left >= left + w - 0.5, `${id} overlaps a pane at ${left}–${left + w} in a ${width}px field at yaw ${yaw.toFixed(3)} (${r.left.toFixed(1)}–${r.right.toFixed(1)})`);
    }
  }
  assert.ok(checked > 10000, `only ${checked} cards were checked`);
});

test('an obstacle takes spare slots first, and past the spares the band says how many did not fit', () => {
  assert.ok(frontSlots().length > 12, 'the front band has no spares');
  assert.ok(midSlots().length > 40, 'the mid band has no spares');
  // The whole circle, as two half-circles: one sector cannot span it.
  const everything = [
    { from: -Math.PI + 1e-9, to: 0, nearest: 0, farthest: 700 },
    { from: 0, to: Math.PI, nearest: 0, farthest: 700 },
  ];
  const { slots, frontOverflow, midOverflow } = assignSlots(bands(12, 40, 3), everything);
  assert.equal(frontOverflow, 12);
  assert.equal(midOverflow, 40);
  assert.equal(slots.size, 3, 'the quiet band is on the canvas and is not an obstacle’s business');
});

test('a sector is read across the wrap at pi', () => {
  assert.equal(inSector(Math.PI - 0.01, Math.PI - 0.1, -Math.PI + 0.1), true);
  assert.equal(inSector(-Math.PI + 0.01, Math.PI - 0.1, -Math.PI + 0.1), true);
  assert.equal(inSector(0, Math.PI - 0.1, -Math.PI + 0.1), false);
});

test('the card box is anchored once: the transform puts the box centre on the projected point', () => {
  assert.equal(CARD_BOX.anchor, 'centre');
  const p = project(frontSlots()[0], 0, VIEWPORT);
  const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([\d.]+)\)/.exec(cardTransform(p));
  assert.notEqual(m, null);
  // With transform-origin at the box's centre, the scaled box's centre is the
  // translate plus half the unscaled box.
  const cx = Number(m[1]) + CARD_BOX.width / 2;
  const cy = Number(m[2]) + CARD_BOX.height / 2;
  assert.ok(Math.abs(cx - p.x) < 0.1 && Math.abs(cy - p.y) < 0.1, `the transform anchors at (${cx}, ${cy}), not (${p.x}, ${p.y})`);
  const rect = cardRect(p);
  assert.ok(Math.abs((rect.left + rect.right) / 2 - p.x) < 1e-9);
  // The renderer's stylesheet agrees: transform-origin at the centre.
  const css = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'deck.css'), 'utf-8');
  const rule = /\.field-card\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
  assert.match(rule, /transform-origin:\s*50% 50%/, 'the field card rule does not anchor at the centre');
});

test('a turn changes the yaw and deals nothing; the turn’s end deals once', () => {
  const field = new FieldModel();
  field.deal(bands(12, 40, 100));
  assert.equal(field.assignments, 1);
  for (let i = 0; i < 120; i += 1) field.turn(0.02);
  assert.equal(field.assignments, 1, 'a turn re-dealt the field');
  assert.ok(Math.abs(field.yaw - 2.4) < 1e-9);
  field.turnEnd(null);
  assert.equal(field.assignments, 1, 'a turn with no pane on screen has nothing to re-deal');
  field.turnEnd(obstaclesFor({ left: 0, right: 200 }, field.yaw, VIEWPORT));
  assert.equal(field.assignments, 2);
});

test('the compass counts every dealt note that is out of sight', () => {
  const { slots } = assignSlots(bands(12, 40, 500));
  const ahead = behindCount(slots, 0, VIEWPORT);
  const behind = behindCount(slots, Math.PI, VIEWPORT);
  assert.ok(ahead >= 500, `facing the front, only ${ahead} are behind`);
  assert.ok(behind >= 52, `facing the quiet band, the near bands are behind (${behind})`);
  assert.equal(slots.size, 552);
});

test('the mid band is dealt a heading to a column, so a sector reads as one heading', () => {
  const mid = ['a', 'a', 'a', 'a', 'a', 'b', 'c', 'c', 'c'];
  const { slots, sectors } = assignSlots({ front: [], mid: mid.map((h, i) => `${h}${i}`), outer: [], deep: [] }, [], (id) => id[0]);
  assert.deepEqual(sectors.map((s) => [s.key, s.count]), [['a', 5], ['b', 1], ['c', 3]]);
  // `c` has three, so it starts a fresh column: row 0.
  assert.equal(slots.get('c6').row, 0);
});

// ---- ISS-0076 / TASK-0073: each band's shape follows how much it holds ----

test("the quiet band's shape steps with what it holds, and the largest step is today's", () => {
  // ISS-0076: one geometry served three workspaces that differ eightfold in
  // what they draw, and it was sized for the largest. The steps are stated
  // rather than continuous so that marking one issue fixed cannot re-lay the
  // field (FEAT-0018, decision 5).
  const table = [40, 154, 418, 800, 2700].map((n) => {
    const shape = bandShapeFor('deep', n);
    return { n, columns: shape.columns, rows: shape.rows, width: shape.box.width, height: shape.box.height };
  });
  assert.deepEqual(table, [
    { n: 40, columns: 8, rows: 6, width: 140, height: 39 },
    { n: 154, columns: 14, rows: 11, width: 140, height: 39 },
    { n: 418, columns: 22, rows: 19, width: 108, height: 30 },
    { n: 800, columns: 32, rows: 25, width: 73, height: 20 },
    { n: 2700, columns: 40, rows: 25, width: 58, height: 16 },
  ]);
});

test("at the large end the four shapes are today's constants, to the number", () => {
  // A workspace at Your Trainer's size draws exactly what it drew before this
  // function existed, which is what makes the 2026-09-10 measurement still
  // mean something.
  const big = bandShapeFor('deep', 10_000);
  assert.equal(big.columns, QUIET.columns);
  assert.equal(big.rows, QUIET.rows);
  assert.equal(big.depth, QUIET.depth);
  assert.equal(big.rowStep, QUIET.rowStep);
  assert.deepEqual(big.box, { width: TILE_BOX.width, height: TILE_BOX.height });
  const mid = bandShapeFor('mid', 10_000);
  assert.equal(mid.depth, MID.depth);
  assert.equal(mid.columns, MID.columnsPerSide);
  assert.equal(mid.rows, MID.rows);
  const front = bandShapeFor('front', 10_000);
  assert.equal(front.depth, FRONT.depth);
  assert.equal(front.columns, FRONT.columns);
  assert.equal(front.rows, FRONT.rows);
  const outer = bandShapeFor('outer', 10_000);
  assert.equal(outer.columns, OUTER.columnsPerSide);
  assert.equal(outer.depth, OUTER.depth);
});

test('a quiet band of forty notes draws bigger tiles, at the same depth', () => {
  // Edwin's steer on ISS-0076: adapt by size and detail, never by depth. A
  // band that walked forward would make done work read as active.
  const small = bandShapeFor('deep', 40);
  assert.ok(small.box.width > TILE_BOX.width, `${small.box.width} is no bigger than today's ${TILE_BOX.width}`);
  assert.ok(small.box.height > TILE_BOX.height);
  assert.equal(small.depth, QUIET.depth, 'the quiet band moved toward the person');
});

test('no band changes its depth with what it holds', () => {
  for (const band of ['front', 'mid', 'outer', 'deep']) {
    const depths = new Set([0, 1, 40, 300, 1000, 5000].map((n) => bandShapeFor(band, n).depth));
    assert.equal(depths.size, 1, `${band} moved: ${[...depths].join(', ')}`);
  }
});

test('the outer field stands between the middle and the quiet band, whatever it holds', () => {
  for (const n of [0, 1, 16, 48, 64, 500]) {
    const outer = bandShapeFor('outer', n);
    assert.ok(outer.depth > MID.depth, `outer ${outer.depth} is not behind the middle at ${n}`);
    assert.ok(outer.depth < QUIET.depth, `outer ${outer.depth} is not in front of the quiet band at ${n}`);
  }
});

test('a tile never grows past what a front card would read as', () => {
  // The small-end clamp. A front card is 186 wide at depth 380 and lands 138
  // pixels across; the largest tile lands 83 at depth 760. Without the clamp
  // an eight-column band would ask for a box over 300 wide.
  const small = bandShapeFor('deep', 1);
  assert.equal(small.box.width, 140);
  const front = project({ theta: 0, depth: FRONT.depth, y: 0 }, 0, VIEWPORT);
  const quiet = project({ theta: Math.PI, depth: QUIET.depth, y: 0 }, Math.PI, VIEWPORT);
  assert.ok(small.box.width * quiet.scale < CARD_BOX.width * front.scale * 0.7, 'a quiet tile reads as big as work that needs a person');
});

test('every slot a shape produces stays inside the quiet band’s stated span', () => {
  for (const n of [1, 40, 154, 418, 800, 2700]) {
    const shape = bandShapeFor('deep', n);
    for (let i = 0; i < Math.min(n, shape.columns * shape.rows); i += 1) {
      const slot = quietSlot(i, shape);
      const fromBehind = Math.abs(norm(slot.theta - Math.PI));
      assert.ok(fromBehind <= QUIET.span / 2 + 1e-9, `${n} notes: slot ${i} is ${(fromBehind / DEG).toFixed(1)}° from behind, past the band's ${(QUIET.span / 2 / DEG).toFixed(0)}°`);
    }
  }
});

test('a note moving between bands does not re-lay the field', () => {
  // The shape is quantised precisely so this holds: 300 and 301 notes are the
  // same shelf, so marking one issue fixed does not move every other tile.
  for (const n of [40, 300, 500, 900, 2700]) {
    assert.deepEqual(bandShapeFor('deep', n), bandShapeFor('deep', n + 1), `${n} and ${n + 1} gave different shapes`);
    assert.deepEqual(bandShapeFor('deep', n), bandShapeFor('deep', n - 1), `${n} and ${n - 1} gave different shapes`);
  }
  const once = shapesFor({ front: 12, mid: 40, outer: 10, deep: 300 });
  const again = shapesFor({ front: 12, mid: 40, outer: 10, deep: 300 });
  assert.deepEqual(once, again, 'two deals of the same view gave different shapes');
});

test('a deal carries the shapes it used, so the renderer draws each note in its own box', () => {
  const dealt = bands(12, 40, 40, 6);
  const { shapes } = assignSlots(dealt);
  assert.equal(shapes.deep.box.width, 140, 'a small quiet band was drawn with the large shape');
  assert.equal(shapes.front.box.width, CARD_BOX.width);
  const outer = outerSlots(shapes.outer);
  assert.ok(outer.length >= 6, 'the outer field had no room for what it was dealt');
  assert.ok(outer.every((s) => s.band === 'outer' && s.depth === OUTER.depth));
});
