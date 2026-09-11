// TST-0051 — the ring keeps order, clears the pane and moves on arcs
// (FEAT-0017, TASK-0067).
//
// While a note is the focus it stands as a pane in the middle of the field,
// and its neighbours stand around it as mini notes. The geometry is pure, so
// every promise about it is checked here without a window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { MINI, FOCUS_MIN, RING_GAP, DOCK_WIDTH, GROW_MS, GATHER_MS, focusLayout, chooseForRing, seatRing, arcPoint, ease } = load('shared/focus-ring.js');

const rectOf = (p) => ({ left: p.x - MINI.width / 2, right: p.x + MINI.width / 2, top: p.y - MINI.height / 2, bottom: p.y + MINI.height / 2 });
const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const neighbour = (id, extra = {}) => ({ id, direction: 'out', angle: null, bearing: null, ...extra });

test('no mini note overlaps the pane or another mini note, and every one is inside the field and outside the dock', () => {
  const fields = [
    { width: 700, height: 480 },
    { width: 1000, height: 700 },
    { width: 1320, height: 860 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1300 },
  ];
  for (const field of fields) {
    for (const dock of [0, DOCK_WIDTH]) {
      for (let n = 1; n <= 16; n += 1) {
        const layout = focusLayout(field, dock, n);
        const pane = { left: layout.pane.left, right: layout.pane.left + layout.pane.width, top: layout.pane.top, bottom: layout.pane.top + layout.pane.height };
        assert.ok(layout.pane.width >= FOCUS_MIN.width && layout.pane.height >= FOCUS_MIN.height, `${field.width}x${field.height}: the pane is below the minimum`);
        const where = `${field.width}x${field.height}, dock ${dock}, ${n} neighbours`;
        assert.ok(layout.places.length <= n, where);
        layout.places.forEach((p, i) => {
          const r = rectOf(p);
          assert.ok(!hits(r, pane), `${where}: place ${i} overlaps the pane`);
          assert.ok(r.left >= dock && r.right <= field.width && r.top >= 0 && r.bottom <= field.height, `${where}: place ${i} is off the field or in the dock`);
          layout.places.forEach((q, j) => {
            if (j > i) assert.ok(!hits(r, rectOf(q)), `${where}: places ${i} and ${j} overlap`);
          });
        });
      }
    }
  }
});

test('16 neighbours get 16 places; 17 get 15 and "+2 more"; 40 get 15 and "+25 more"; a small field gets fewer, and nobody is lost', () => {
  const field = { width: 1920, height: 1080 };
  const many = (count) => Array.from({ length: count }, (_, i) => neighbour(`N-${String(i).padStart(3, '0')}`));
  const sixteen = focusLayout(field, 0, 16);
  assert.equal(sixteen.places.length, 16);
  assert.deepEqual([chooseForRing(many(16), 16).chosen.length, chooseForRing(many(16), 16).more], [16, 0]);
  const seventeen = chooseForRing(many(17), focusLayout(field, 0, 17).places.length);
  assert.deepEqual([seventeen.chosen.length, seventeen.more], [15, 2]);
  const forty = chooseForRing(many(40), focusLayout(field, 0, 40).places.length);
  assert.deepEqual([forty.chosen.length, forty.more], [15, 25]);
  const small = focusLayout({ width: 700, height: 480 }, DOCK_WIDTH, 16);
  assert.ok(small.places.length < 16, `a small field held all ${small.places.length}`);
  const smallChoice = chooseForRing(many(16), small.places.length);
  assert.equal(smallChoice.chosen.length + smallChoice.more + (smallChoice.more > 0 ? 0 : 0), 16);
});

test('a field too narrow for a whole ring still holds as many places as fit on its top and bottom arcs', () => {
  // The case the smoke run found: a dock beside the field, eight neighbours.
  const layout = focusLayout({ width: 960, height: 780 }, DOCK_WIDTH, 8);
  assert.ok(layout.places.length >= 4, `only ${layout.places.length} places`);
});

test('no place stands under what is drawn over the field, such as the compass', () => {
  const compass = { left: 1000, top: 700, width: 300, height: 120 };
  const layout = focusLayout({ width: 1320, height: 860 }, 0, 16, -Math.PI / 2, [compass]);
  assert.ok(layout.places.length > 0);
  for (const p of layout.places) {
    const r = rectOf(p);
    assert.ok(!hits(r, { left: compass.left, right: compass.left + compass.width, top: compass.top, bottom: compass.top + compass.height }), 'a place stood under the compass');
  }
});

test('who is left out follows the priority: came from, held, shared, owed, linked from, linking to, then id', () => {
  const list = [
    neighbour('Z-IN', { direction: 'in' }),
    neighbour('Y-OUT', { direction: 'out' }),
    neighbour('X-OWED', { owed: true, direction: 'in' }),
    neighbour('W-SHARED', { shared: true, direction: 'in' }),
    neighbour('V-HELD', { held: true, direction: 'in' }),
    neighbour('U-FROM', { cameFrom: true, direction: 'in' }),
    neighbour('A-OUT', { direction: 'out' }),
  ];
  const { chosen, more } = chooseForRing(list, 6);
  assert.deepEqual(chosen.map((n) => n.id), ['U-FROM', 'V-HELD', 'W-SHARED', 'X-OWED', 'A-OUT'], 'the wrong notes kept a place');
  assert.equal(more, 2, 'Y-OUT and Z-IN are the two left out');
});

test('the neighbours keep their circular order, and the same input always seats them the same way', () => {
  const layout = focusLayout({ width: 1600, height: 1000 }, 0, 8);
  const angles = [2.9, -0.4, 1.2, -2.2, 0.3, 2.0, -1.3, 0.8];
  const list = angles.map((angle, i) => neighbour(`N${i}`, { angle }));
  const { seats } = seatRing(list, layout, 0);
  const around = (p) => Math.atan2(p.y - layout.centre.y, p.x - layout.centre.x);
  const cyclic = (ids) => {
    const i = ids.indexOf('N0');
    return [...ids.slice(i), ...ids.slice(0, i)].join(' ');
  };
  const before = [...list].sort((a, b) => ((a.angle + 2 * Math.PI) % (2 * Math.PI)) - ((b.angle + 2 * Math.PI) % (2 * Math.PI))).map((n) => n.id);
  const after = [...seats].sort((a, b) => ((around(a.place) + 2 * Math.PI) % (2 * Math.PI)) - ((around(b.place) + 2 * Math.PI) % (2 * Math.PI))).map((s) => s.id);
  assert.equal(cyclic(after), cyclic(before));
  assert.deepEqual(seatRing(list, layout, 0), seats && seatRing(list, layout, 0));
  // Each is seated near where it was: the turn that moves them least.
  for (const s of seats) {
    const n = list.find((x) => x.id === s.id);
    const d = Math.abs(((around(s.place) - n.angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    assert.ok(d < Math.PI / 2, `${s.id} was seated ${d.toFixed(2)} radians from where it was`);
  }
});

test('the note the person came from sits opposite the direction the new focus came from', () => {
  const layout = focusLayout({ width: 1600, height: 1000 }, 0, 10);
  // The places are spaced evenly along a rounded rectangle, not by angle, so
  // "half a place's spacing" is half the widest angular gap between two places.
  const angles = layout.places.map((p) => Math.atan2(p.y - layout.centre.y, p.x - layout.centre.x)).sort((a, b) => a - b);
  const spacing = Math.max(...angles.map((a, i) => (i === 0 ? a + 2 * Math.PI - angles[angles.length - 1] : a - angles[i - 1])));
  for (const target of [0, 1, 2.5, -2, -0.7]) {
    const list = [neighbour('FROM', { cameFrom: true, angle: 0.1 }), ...Array.from({ length: 9 }, (_, i) => neighbour(`N${i}`, { angle: i * 0.6 }))];
    const { seats } = seatRing(list, layout, 0, target);
    const from = seats.find((s) => s.id === 'FROM');
    const a = Math.atan2(from.place.y - layout.centre.y, from.place.x - layout.centre.x);
    const d = Math.abs(((a - target + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    assert.ok(d <= spacing / 2 + 1e-9, `aimed at ${target}, seated at ${a.toFixed(2)}`);
  }
});

test('a ring started at an angle puts its first place there, so one neighbour lands opposite the way the person came', () => {
  for (const target of [0.3, 2.4, -1.9]) {
    const layout = focusLayout({ width: 1600, height: 1000 }, 0, 1, target);
    const { seats } = seatRing([neighbour('FROM', { cameFrom: true })], layout, 0, target);
    const p = seats[0].place;
    const a = Math.atan2(p.y - layout.centre.y, p.x - layout.centre.x);
    const d = Math.abs(((a - target + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    assert.ok(d < 0.05, `aimed at ${target}, the only place stood at ${a.toFixed(2)}`);
  }
});

test('a neighbour known only by its bearing goes on its side, and notes from outside the view sit at the bottom by id', () => {
  const layout = focusLayout({ width: 1600, height: 1000 }, 0, 6);
  const list = [
    neighbour('LEFT', { bearing: -2.4 }),
    neighbour('RIGHT', { bearing: 2.1 }),
    neighbour('OUT-B'),
    neighbour('OUT-A'),
  ];
  const { seats } = seatRing(list, layout, 0);
  const at = (id) => seats.find((s) => s.id === id).place;
  assert.ok(at('LEFT').x < layout.centre.x, 'the left neighbour was seated on the right');
  assert.ok(at('RIGHT').x > layout.centre.x, 'the right neighbour was seated on the left');
  assert.ok(at('OUT-A').y > layout.centre.y && at('OUT-B').y > layout.centre.y, 'a note from outside the view was not at the bottom');
  assert.deepEqual(seatRing(list, layout, 0), seatRing([...list].reverse(), layout, 0), 'the input order changed the seating');
});

test('the path starts and ends exactly, goes the short way round, and never comes nearer the middle than its ends', () => {
  const centre = { x: 500, y: 400 };
  const start = { x: 900, y: 380 };
  const end = { x: 520, y: 90 };
  assert.deepEqual(arcPoint(start, end, centre, 0), start);
  assert.deepEqual(arcPoint(start, end, centre, 1), end);
  const r0 = Math.hypot(start.x - centre.x, start.y - centre.y);
  const r1 = Math.hypot(end.x - centre.x, end.y - centre.y);
  for (let i = 1; i < 20; i += 1) {
    const p = arcPoint(start, end, centre, i / 20);
    assert.ok(Math.hypot(p.x - centre.x, p.y - centre.y) >= Math.min(r0, r1) - 1e-9, 'the path cut across the middle');
    assert.ok(p.y <= start.y + 1e-9, 'the path went the long way round, below the middle');
  }
});

test('the easing is slow at both ends, symmetric, and the two stages make one second', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(ease(0.1) < 0.1 && ease(0.9) > 0.9);
  for (const t of [0.2, 0.35, 0.5, 0.77]) assert.ok(Math.abs(ease(t) + ease(1 - t) - 1) < 1e-12, `not symmetric at ${t}`);
  assert.equal(GROW_MS + GATHER_MS, 1000);
  assert.ok(RING_GAP > 0);
});
