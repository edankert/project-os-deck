// TST-0051 — the seats round an opened note clear the document, keep the
// cards' order, and run on past the window's edge (FEAT-0017, TASK-0104).
//
// While a note is the focus it is a document at the size the person chose,
// and the notes it is joined to are the field's own cards, moved to seats
// round it. The geometry is pure, so every promise about it is checked here
// without a window.
//
// Until 2026-10-01 this suite checked the opposite contract: a pane sized
// from the number of neighbours, sixteen 168 by 44 copies kept inside the
// window, and "+N more" for the rest. Edwin reversed all three on 2026-09-12
// (ISS-0070, ISS-0071, ISS-0072).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { SEAT, SEAT_GAP, EDGE_MARGIN, BROWSE_SCALE, OPEN_MS, GATHER_MS, seatsAround, seatNeighbours, revealShift, beyondEdges, edgeAnchor, ease } = load('shared/focus-ring.js');
const { CARD_BOX, FRONT, project } = load('shared/slots.js');

const rectOf = (p) => ({ left: p.x - SEAT.width / 2, right: p.x + SEAT.width / 2, top: p.y - SEAT.height / 2, bottom: p.y + SEAT.height / 2 });
const edges = (r) => ({ left: r.left, right: r.left + r.width, top: r.top, bottom: r.top + r.height });
const hits = (a, b) => a.left < b.right - 1e-6 && a.right > b.left + 1e-6 && a.top < b.bottom - 1e-6 && a.bottom > b.top + 1e-6;
const centred = (field, width, height) => ({ left: (field.width - width) / 2, top: (field.height - height) / 2, width, height });
const neighbour = (id, extra = {}) => ({ id, angle: null, side: 0, ...extra });
// How far a seat is from the document, edge to edge.
const gapTo = (r, pane) => Math.hypot(Math.max(0, pane.left - r.right, r.left - pane.right), Math.max(0, pane.top - r.bottom, r.top - pane.bottom));
const TAU = 2 * Math.PI;
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const turnBetween = (a, b) => Math.min(Math.abs(wrap(a) - wrap(b)), TAU - Math.abs(wrap(a) - wrap(b)));

// The same numbers on every run: a failure names a layout that can be made
// again. The generated layouts are documents of any size anywhere in a field,
// partly beyond its edges too, which the hand-written ones below are not.
function generator(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const whole = (low, high) => Math.floor(low + next() * (high - low + 1));
  const layout = (most) => {
    const field = { width: whole(320, 2200), height: whole(240, 1400) };
    const doc = { width: whole(280, 1200), height: whole(200, 1000) };
    doc.left = whole(-200, field.width - 80);
    doc.top = whole(-100, field.height - 60);
    return { field, doc, count: whole(1, most) };
  };
  return { next, whole, layout };
}

const FIELDS = [
  { width: 700, height: 480 },
  { width: 1000, height: 700 },
  { width: 1320, height: 860 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1300 },
];
const DOCS = [
  [280, 160],
  [560, 520],
  [640, 480],
  [900, 700],
];

test('a seated card is the size a front-band card is browsed at, not a smaller copy', () => {
  // ISS-0070: "why not the same size view as when browsing?" The seat is the
  // front band's box at the scale `project` gives a card straight ahead.
  const ahead = project({ theta: 0, depth: FRONT.depth, y: 0 }, 0, { width: 1440, height: 900 });
  assert.equal(BROWSE_SCALE, ahead.scale);
  assert.equal(SEAT.width, CARD_BOX.width * ahead.scale);
  assert.equal(SEAT.height, CARD_BOX.height * ahead.scale);
  // The copies this replaces were 168 by 44: a third less tall than a card.
  assert.ok(SEAT.height > 44 * 1.4, `a seat is ${SEAT.height} tall`);
});

test('every neighbour gets a seat, whatever the document size: the document is never asked to shrink', () => {
  for (const field of FIELDS) {
    for (const [w, h] of DOCS) {
      if (w > field.width || h > field.height) continue;
      const doc = centred(field, w, h);
      for (const count of [1, 6, 16, 17, 40, 150]) {
        const seats = seatsAround({ doc, field, count });
        assert.equal(seats.length, count, `${field.width}x${field.height}, a ${w}x${h} document, ${count} neighbours`);
      }
    }
  }
});

test('no seat lies over the document or another seat, and none is above or below the field', () => {
  for (const field of FIELDS) {
    for (const [w, h] of DOCS) {
      if (w > field.width || h > field.height) continue;
      const doc = centred(field, w, h);
      const pane = edges(doc);
      for (const count of [1, 5, 16, 40, 150]) {
        const seats = seatsAround({ doc, field, count });
        const where = `${field.width}x${field.height}, a ${w}x${h} document, ${count} neighbours`;
        seats.forEach((p, i) => {
          const r = rectOf(p);
          assert.ok(!hits(r, pane), `${where}: seat ${i} lies over the document`);
          // The gap is kept on at least one axis: a seat never touches the document.
          const clearX = r.right <= pane.left - SEAT_GAP + 1e-6 || r.left >= pane.right + SEAT_GAP - 1e-6;
          const clearY = r.bottom <= pane.top - SEAT_GAP + 1e-6 || r.top >= pane.bottom + SEAT_GAP - 1e-6;
          assert.ok(clearX || clearY, `${where}: seat ${i} is closer to the document than the gap`);
          // A seat above or below the field could never be turned to.
          assert.ok(r.top >= EDGE_MARGIN - 1e-6 && r.bottom <= field.height - EDGE_MARGIN + 1e-6, `${where}: seat ${i} is above or below the field`);
          seats.forEach((q, j) => {
            if (j > i) assert.ok(!hits(r, rectOf(q)), `${where}: seats ${i} and ${j} overlap`);
          });
        });
      }
    }
  }
});

test('no seat is closer than the gap to a document of any size, wherever it stands in the field', () => {
  // The test above tries four document sizes, each in the middle of the
  // field, and at those four heights the rows above and below happen to
  // clear the document by more than the gap without being told to: the review
  // of 2026-10-02 took the gap out of the rule and nothing failed. These
  // documents have any size and stand anywhere, partly out of the field too.
  // With the gap taken out, about one of these layouts in seven seats a card
  // closer than it.
  const random = generator(51);
  for (let i = 0; i < 400; i += 1) {
    const { field, doc, count } = random.layout(120);
    const pane = edges(doc);
    const seats = seatsAround({ doc, field, count });
    assert.equal(seats.length, count);
    const closest = Math.min(...seats.map((p) => gapTo(rectOf(p), pane)));
    assert.ok(closest >= SEAT_GAP - 1e-6, `layout ${i}: a seat is ${closest.toFixed(2)} px from the document, in ${JSON.stringify({ doc, field, count })}`);
  }
});

test('seats in sight are filled before any seat beyond the field, and past the edges the seats go on', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 560, 520);
  let before = 0;
  let firstBeyond = null;
  for (let count = 1; count <= 200; count += 1) {
    const seats = seatsAround({ doc, field, count });
    const inSight = seats.filter((s) => s.onScreen).length;
    // Asking for one more never takes a seat in sight away.
    assert.ok(inSight >= before, `${count} neighbours hold ${inSight} seats in sight, fewer than ${before}`);
    if (firstBeyond === null && inSight < count) firstBeyond = { count, inSight };
    // Once any seat is beyond the edge, every seat in sight is taken.
    if (firstBeyond !== null) assert.equal(inSight, firstBeyond.inSight, `${count} neighbours: a seat in sight was left empty`);
    before = inSight;
  }
  assert.ok(firstBeyond !== null && firstBeyond.inSight >= 16, `the field holds ${firstBeyond?.inSight} seats in sight before any goes beyond it`);
  // `onScreen` says what it means: the whole card is inside the field.
  for (const seat of seatsAround({ doc, field, count: 200 })) {
    const r = rectOf(seat);
    assert.equal(seat.onScreen, r.left >= 0 && r.right <= field.width && r.top >= 0 && r.bottom <= field.height);
  }
});

test('a document against the left edge seats its neighbours to its right before sending any off to the left', () => {
  const field = { width: 1440, height: 860 };
  const doc = { left: 0, top: 170, width: 560, height: 520 };
  const seats = seatsAround({ doc, field, count: 12 });
  assert.ok(seats.every((s) => s.onScreen), 'twelve neighbours fit in sight beside, above and below the document');
  assert.ok(seats.every((s) => s.x > doc.left), 'a seat was placed off to the left while seats in sight were free');
  // Twelve are seated before the second column to the right is needed. The
  // review of 2026-10-02 stopped offering columns once there were seats
  // enough, in sight or not, and twelve still passed: twenty then sent five
  // cards off to the left, and forty sent sixteen. The field holds fifty-one.
  for (const count of [20, 40, 51]) {
    const more = seatsAround({ doc, field, count });
    const beyond = more.filter((s) => !s.onScreen).length;
    assert.equal(beyond, 0, `${count} neighbours: ${beyond} sent out of sight while seats in sight were free`);
    assert.ok(more.every((s) => s.x > doc.left), `${count} neighbours: a seat stands to the left of a document against the left edge`);
  }
  // From there on every seat in sight is taken, and only the rest go beyond.
  for (const count of [52, 60, 120]) {
    const more = seatsAround({ doc, field, count });
    assert.equal(more.filter((s) => s.onScreen).length, 51, `${count} neighbours: a seat in sight was left empty`);
  }
});

test('wherever the document stands, no card is sent out of sight while a seat in sight is free', () => {
  // The seats in sight are counted by asking for far more seats than there
  // are neighbours: that request is offered every column in sight.
  const random = generator(17);
  let beyond = 0;
  for (let i = 0; i < 250; i += 1) {
    const { field, doc, count } = random.layout(80);
    const seats = seatsAround({ doc, field, count });
    const inSight = seats.filter((s) => s.onScreen).length;
    const room = seatsAround({ doc, field, count: count + 300 }).filter((s) => s.onScreen).length;
    assert.equal(inSight, Math.min(count, room), `layout ${i}: ${inSight} of ${count} cards in sight where ${room} seats are, in ${JSON.stringify({ doc, field })}`);
    if (inSight < count) beyond += 1;
  }
  assert.ok(beyond >= 50, `only ${beyond} of 250 layouts had more neighbours than seats in sight`);
});

test('no seat stands under what is drawn over the field, such as the compass or another document', () => {
  const field = { width: 1320, height: 860 };
  const doc = centred(field, 560, 520);
  const compass = { left: 940, top: 780, width: 372, height: 72 };
  const other = { left: 20, top: 20, width: 320, height: 400 };
  for (const count of [8, 30, 90]) {
    for (const seat of seatsAround({ doc, field, count, avoid: [compass, other] })) {
      assert.ok(!hits(rectOf(seat), edges(compass)), `${count} neighbours: a seat stands under the compass`);
      assert.ok(!hits(rectOf(seat), edges(other)), `${count} neighbours: a seat stands under another document`);
    }
    assert.equal(seatsAround({ doc, field, count, avoid: [compass, other] }).length, count);
  }
});

test('a field too short for one whole seat still seats every neighbour, in one row', () => {
  const field = { width: 900, height: 40 };
  const doc = { left: 300, top: 0, width: 300, height: 40 };
  const seats = seatsAround({ doc, field, count: 7 });
  assert.equal(seats.length, 7);
  assert.equal(new Set(seats.map((s) => s.y)).size, 1, 'the seats are not in one row');
  seats.forEach((p, i) => seats.forEach((q, j) => j > i && assert.ok(!hits(rectOf(p), rectOf(q)))));
});

test('the same request always returns the same seats, nearest the document first', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 560, 520);
  const a = seatsAround({ doc, field, count: 30 });
  const b = seatsAround({ doc, field, count: 30 });
  assert.deepEqual(a, b);
  // Fewer neighbours take a prefix of the same seats: adding one neighbour
  // adds one seat and moves no seat already taken.
  assert.deepEqual(seatsAround({ doc, field, count: 12 }), a.slice(0, 12));
  assert.deepEqual(seatsAround({ doc, field, count: 0 }), []);
});

test('the cards keep the circular order they had round the document, and are seated the same way every time', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 560, 520);
  const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
  const ids = ['G', 'C', 'A', 'F', 'D', 'B', 'E', 'H'];
  // Evenly round the document, in an order that is not the order of their ids.
  const neighbours = ids.map((id, i) => neighbour(id, { angle: -Math.PI + (i * 2 * Math.PI) / ids.length }));
  const seats = seatsAround({ doc, field, count: ids.length });
  const seated = seatNeighbours(neighbours, seats, centre);
  assert.equal(seated.length, ids.length);
  assert.equal(new Set(seated.map((s) => `${s.seat.x},${s.seat.y}`)).size, ids.length, 'two cards share a seat');
  const angle = (p) => (Math.atan2(p.y - centre.y, p.x - centre.x) + 2 * Math.PI) % (2 * Math.PI);
  const byAngle = [...seated].sort((a, b) => angle(a.seat) - angle(b.seat)).map((s) => s.id);
  const before = [...neighbours].sort((a, b) => ((a.angle + 2 * Math.PI) % (2 * Math.PI)) - ((b.angle + 2 * Math.PI) % (2 * Math.PI))).map((n) => n.id);
  // The same cycle: one is a rotation of the other.
  const at = byAngle.indexOf(before[0]);
  assert.deepEqual([...byAngle.slice(at), ...byAngle.slice(0, at)], before);
  // Deterministic, and independent of the order the neighbours were given in.
  assert.deepEqual(seatNeighbours([...neighbours].reverse(), seats, centre), seated);
});

test('the arrangement is turned to the seating that moves the cards least', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 560, 520);
  const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
  const seats = seatsAround({ doc, field, count: 6 });
  // Each neighbour stood exactly where a seat is: it should be given that seat.
  const neighbours = seats.map((seat, i) => neighbour(`N${i}`, { angle: Math.atan2(seat.y - centre.y, seat.x - centre.x) }));
  const seated = new Map(seatNeighbours(neighbours, seats, centre).map((s) => [s.id, s.seat]));
  seats.forEach((seat, i) => assert.deepEqual(seated.get(`N${i}`), seat, `N${i} was moved to another seat`));
});

test('whatever stood where, no other turn of the seating moves the cards less than the one chosen', () => {
  // The test above puts every neighbour exactly on a seat, where the first
  // seating tried is already the best: the review of 2026-10-02 stopped the
  // seating from being turned at all and it passed. Here the cards stand at
  // angles of their own, so most neighbourhoods need a turn.
  const random = generator(104);
  let turned = 0;
  for (let i = 0; i < 300; i += 1) {
    const { field, doc, count } = random.layout(24);
    const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
    const seats = seatsAround({ doc, field, count });
    const neighbours = seats.map((_, k) => neighbour(`N-${String(k).padStart(2, '0')}`, { angle: random.next() * TAU - Math.PI }));
    const seated = new Map(seatNeighbours(neighbours, seats, centre).map((s) => [s.id, s.seat]));
    assert.equal(seated.size, count);
    // The neighbours in the order they stood round the document, and the
    // seat each was given. Turning the seating by `r` hands each the seat
    // of the neighbour `r` places on.
    const round = [...neighbours].sort((a, b) => wrap(a.angle) - wrap(b.angle));
    const given = round.map((n) => wrap(Math.atan2(seated.get(n.id).y - centre.y, seated.get(n.id).x - centre.x)));
    const cost = (r) => round.reduce((sum, n, j) => sum + turnBetween(given[(j + r) % count], n.angle), 0);
    const chosen = cost(0);
    for (let r = 1; r < count; r += 1) {
      assert.ok(chosen <= cost(r) + 1e-9, `layout ${i}: turning the seating by ${r} moves the cards ${cost(r).toFixed(4)}, less than the ${chosen.toFixed(4)} chosen`);
    }
    // Not turned at all: the first card round takes the first seat round.
    if (given[0] > Math.min(...given) + 1e-9) turned += 1;
  }
  assert.ok(turned >= 100, `only ${turned} of 300 neighbourhoods needed the seating turned`);
});

test('two neighbours with an equal claim are seated by id, whichever was named first', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 480, 300);
  const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
  // The two nearest seats: beside the document, to the right and to the left.
  const seats = seatsAround({ doc, field, count: 2 });
  const [right, left] = seats;
  assert.ok(right.x > centre.x && left.x < centre.x && right.y === centre.y && left.y === centre.y);
  // No place, the same side, the same angle: each pair is a tie. The lower
  // id takes the first seat round from the right, and the other the next.
  for (const same of [{}, { side: -1 }, { side: 1 }, { angle: -Math.PI / 2 }, { angle: 2.5 }]) {
    const pair = [neighbour('TIE-B', same), neighbour('TIE-A', same)];
    for (const given of [pair, [...pair].reverse()]) {
      const seated = new Map(seatNeighbours(given, seats, centre).map((s) => [s.id, s.seat]));
      const said = `${JSON.stringify(same)}, named ${given.map((n) => n.id).join(' then ')}`;
      assert.deepEqual(seated.get('TIE-A'), right, `${said}: TIE-A is not on the first seat`);
      assert.deepEqual(seated.get('TIE-B'), left, `${said}: TIE-B is not on the second seat`);
    }
  }
  // Six with no place among them, named in no order: seated in the order of
  // their ids, going round.
  const ids = ['N-4', 'N-1', 'N-6', 'N-3', 'N-2', 'N-5'];
  const six = seatsAround({ doc, field, count: ids.length });
  const seated = new Map(seatNeighbours(ids.map((id) => neighbour(id)), six, centre).map((s) => [s.id, s.seat]));
  const angles = [...ids].sort().map((id) => wrap(Math.atan2(seated.get(id).y - centre.y, seated.get(id).x - centre.x)));
  angles.forEach((a, i) => i > 0 && assert.ok(a >= angles[i - 1], `N-${i + 1} is seated before N-${i}, going round`));
});

test('a neighbour known only by its side goes to that side, and one with no place goes below, by id', () => {
  const field = { width: 1440, height: 860 };
  const doc = centred(field, 480, 300);
  const centre = { x: doc.left + doc.width / 2, y: doc.top + doc.height / 2 };
  const neighbours = [
    neighbour('LEFT', { side: -1 }),
    neighbour('RIGHT', { side: 1 }),
    neighbour('NOWHERE-B'),
    neighbour('NOWHERE-A'),
    neighbour('ABOVE', { angle: -Math.PI / 2 }),
  ];
  const seats = seatsAround({ doc, field, count: neighbours.length });
  const seated = new Map(seatNeighbours(neighbours, seats, centre).map((s) => [s.id, s.seat]));
  assert.ok(seated.get('LEFT').x < centre.x, 'the neighbour off to the left is seated on the right');
  assert.ok(seated.get('RIGHT').x > centre.x, 'the neighbour off to the right is seated on the left');
  assert.ok(seated.get('ABOVE').y <= seated.get('NOWHERE-A').y, 'a neighbour with no place is seated above one that stood above');
});

test('the least movement brings a card into the field, and a card already there moves nothing', () => {
  const field = { width: 1000, height: 600 };
  const size = { width: SEAT.width, height: SEAT.height };
  assert.deepEqual(revealShift({ left: 300, top: 200, ...size }, field, 20), { x: 0, y: 0 });
  // Past the right edge: moved left until it is a margin inside.
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);
  const right = revealShift({ left: 1400, top: 200, ...size }, field, 20);
  close(1400 + right.x + SEAT.width, field.width - 20);
  assert.equal(right.y, 0);
  // Past the left edge and below the bottom at once.
  const corner = revealShift({ left: -500, top: 900, ...size }, field, 20);
  close(-500 + corner.x, 20);
  close(900 + corner.y + SEAT.height, field.height - 20);
  // Larger than the field: its top left is brought to the field's.
  assert.deepEqual(revealShift({ left: 240, top: -80, width: 1400, height: 900 }, field, 0), { x: -240, y: 80 });
});

test('the edge counters count what is wholly beyond each edge, and nothing that is partly in the field', () => {
  const field = { width: 1000, height: 600 };
  const r = (left, top) => ({ left, top, width: 100, height: 50 });
  assert.deepEqual(beyondEdges([r(-300, 100), r(-100, 100), r(-99, 100), r(1000, 100), r(999, 100), r(400, -50), r(400, 600), r(400, 300)], field), {
    left: 2,
    right: 1,
    up: 1,
    down: 1,
  });
  assert.deepEqual(beyondEdges([], field), { left: 0, right: 0, up: 0, down: 0 });
});

test('a line leaves the document at its edge, toward the card it runs to', () => {
  const pane = { left: 100, top: 100, width: 400, height: 200 };
  assert.deepEqual(edgeAnchor(pane, { x: 900, y: 200 }), { x: 500, y: 200 });
  assert.deepEqual(edgeAnchor(pane, { x: 300, y: -500 }), { x: 300, y: 100 });
  const corner = edgeAnchor(pane, { x: 700, y: 400 });
  assert.ok(Math.abs(corner.x - 500) < 1e-9 && Math.abs(corner.y - 300) < 1e-9);
  // A card standing on the document's own middle has no direction to leave by.
  assert.deepEqual(edgeAnchor(pane, { x: 300, y: 200 }), { x: 300, y: 200 });
});

test('the easing is slow at both ends and symmetric, and the opening is inside the range DES-0003 asks to be tried', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-12);
  assert.ok(Math.abs(ease(0.2) + ease(0.8) - 1) < 1e-12);
  assert.ok(ease(0.1) < 0.1 && ease(0.9) > 0.9);
  // DES-0003: "Prototype 250–400 ms against the current one-second movement."
  assert.ok(OPEN_MS >= 250 && OPEN_MS <= 400, `the opening takes ${OPEN_MS} ms`);
  assert.ok(GATHER_MS >= 250 && GATHER_MS <= 400, `the gathering takes ${GATHER_MS} ms`);
});
