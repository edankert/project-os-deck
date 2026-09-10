// TST-0044 — the neighbourhood is read once per note per index revision and
// shared by the lift and the reach; what several held notes share is their
// intersection; and a throw is recognised from pointer samples and window
// bounds (TASK-0036, TASK-0037, TASK-0055, TASK-0056).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { ContextCache, joinedTo, sharedAmong, REACH_REST_MS, REACH_HOLD_MS } = load('shared/neighbourhood.js');
const { contextFromPayload, neighboursOf, cardFromContext } = load('shared/sidecar-client.js');
const { recogniseThrow, edgeNear, speedOf, targetsToward, landingBounds, THROW_EDGE_PX, THROW_MIN_SPEED } = load('shared/throw.js');

function context(id, linked, backlinks = []) {
  const item = (n) => ({ id: n, title: n, status: 'open', type: 'issue', url: `/docs/issues/${n}.md` });
  return contextFromPayload({
    active: { id, title: id },
    linked: [{ type: 'issue', items: linked.map(item) }],
    backlinks: [{ type: 'feature', items: backlinks.map(item) }],
  });
}

test('the context payload is read the way the sidecar sends it, groups flattened and the path kept', () => {
  const ctx = context('ISS-1', ['FEAT-1', 'TASK-2'], ['PHASE-1', 'FEAT-1']);
  assert.deepEqual(neighboursOf(ctx).map((i) => i.id), ['FEAT-1', 'TASK-2', 'PHASE-1']);
  assert.equal(ctx.linked[0].rel, 'issues/FEAT-1.md');
  const card = cardFromContext(ctx.linked[0]);
  assert.equal(card.noteId, 'FEAT-1');
  assert.equal(card.rel, 'issues/FEAT-1.md', 'a neighbour from outside the view can be opened');
  assert.deepEqual(contextFromPayload({ active: null, linked: [], backlinks: [] }), { active: null, linked: [], backlinks: [] });
});

test('one request per note per index revision, however many times it is asked', async () => {
  const asked = [];
  const cache = new ContextCache(async (ws, id) => {
    asked.push(`${ws}:${id}`);
    await new Promise((r) => setTimeout(r, 5));
    return context(id, ['X']);
  });
  // A reach and a lift at the same moment share one request.
  await Promise.all([cache.get('w', 'ISS-1', 3), cache.get('w', 'ISS-1', 3)]);
  await cache.get('w', 'ISS-1', 3);
  assert.equal(cache.requests, 1);
  assert.notEqual(cache.peek('w', 'ISS-1', 3), undefined);
  // A changed workspace asks again.
  await cache.get('w', 'ISS-1', 4);
  assert.equal(cache.requests, 2);
  cache.forgetBefore(4);
  assert.equal(cache.peek('w', 'ISS-1', 3), undefined);
  assert.notEqual(cache.peek('w', 'ISS-1', 4), undefined);
  assert.deepEqual(asked, ['w:ISS-1', 'w:ISS-1']);
});

test('a failed request is not cached, so the next reach asks again', async () => {
  let fail = true;
  const cache = new ContextCache(async (ws, id) => {
    if (fail) throw new Error('the sidecar is starting');
    return context(id, []);
  });
  await assert.rejects(cache.get('w', 'A', 1));
  fail = false;
  await cache.get('w', 'A', 1);
  assert.equal(cache.requests, 2);
});

test('the reach waits long enough that a pointer passing over a band asks nothing', () => {
  assert.ok(REACH_REST_MS >= 300 && REACH_REST_MS <= 700, `${REACH_REST_MS}ms`);
  assert.ok(REACH_HOLD_MS >= 400, 'a press-and-hold shorter than a tap');
});

test('what the held notes share: zero, one, two and three held', () => {
  const contexts = new Map([
    ['A', context('A', ['F1', 'F2', 'B'])],
    ['B', context('B', ['F1', 'F3'], ['A'])],
    ['C', context('C', ['F1', 'F2'])],
  ]);
  assert.deepEqual([...sharedAmong([], contexts)], []);
  assert.deepEqual([...sharedAmong(['A'], contexts)], [], 'one note shares nothing with itself');
  assert.deepEqual([...sharedAmong(['A', 'B'], contexts)], [['F1', 2]], 'a held note is not marked as shared');
  assert.deepEqual([...sharedAmong(['A', 'B', 'C'], contexts)].sort(), [['F1', 3], ['F2', 2]]);
  assert.deepEqual([...joinedTo(['A', 'B'], contexts)].sort(), ['F1', 'F2', 'F3']);
  // Putting a note back recomputes from what is still held.
  assert.deepEqual([...sharedAmong(['A', 'C'], contexts)].sort(), [['F1', 2], ['F2', 2]]);
});

const FIELD = { width: 1000, height: 700 };

test('a quick drag off the right edge is a throw toward the right; a slow one is not', () => {
  const quick = [
    { t: 0, x: 600, y: 300 },
    { t: 40, x: 800, y: 300 },
    { t: 80, x: 990, y: 305 },
  ];
  assert.equal(recogniseThrow(quick, FIELD), 'right');
  const slow = [
    { t: 0, x: 950, y: 300 },
    { t: 400, x: 975, y: 300 },
    { t: 800, x: 990, y: 300 },
  ];
  assert.equal(recogniseThrow(slow, FIELD), null, 'a hesitation at the edge was taken as a throw');
  const middle = [
    { t: 0, x: 100, y: 350 },
    { t: 40, x: 700, y: 350 },
  ];
  assert.equal(recogniseThrow(middle, FIELD), null, 'a fast drag inside the field was taken as a throw');
  assert.equal(edgeNear({ x: 500, y: 10 }, FIELD), 'top');
  assert.equal(edgeNear({ x: 500, y: 300 }, FIELD), null);
  assert.ok(speedOf(quick) > THROW_MIN_SPEED);
  assert.ok(THROW_EDGE_PX > 0);
  // The thresholds are inputs, not constants inside the function.
  assert.equal(recogniseThrow(slow, FIELD, { minSpeed: 0.01 }), 'right');
  assert.equal(recogniseThrow(middle, FIELD, { edgeDistance: 320 }), 'right');
});

const SELF = { x: 0, y: 0, width: 1400, height: 900 };
const DISPLAYS = [
  { id: 1, label: 'Built-in', workArea: { x: 0, y: 0, width: 1512, height: 944 } },
  { id: 2, label: 'Display 2', workArea: { x: 1512, y: 0, width: 2560, height: 1415 } },
  { id: 3, label: 'Display 3', workArea: { x: -1920, y: 0, width: 1920, height: 1080 } },
];

test('the strip names the windows that way, an empty display that way, and the tablet last', () => {
  const windows = [
    { id: 7, carries: 'note', bounds: { x: 1600, y: 100, width: 600, height: 800 }, displayId: 2, displayLabel: 'Display 2' },
    { id: 8, carries: 'desk', bounds: { x: 2300, y: 100, width: 600, height: 800 }, displayId: 2, displayLabel: 'Display 2' },
    { id: 9, carries: 'needs-you', bounds: { x: 1600, y: 1000, width: 400, height: 300 }, displayId: 2, displayLabel: 'Display 2' },
  ];
  const right = targetsToward('right', SELF, windows, DISPLAYS, true);
  assert.deepEqual(right.map((t) => t.label), ['reader on Display 2', 'desk on Display 2', 'tablet']);
  const left = targetsToward('left', SELF, windows, DISPLAYS, false);
  assert.deepEqual(left.map((t) => t.label), ['a new reader on Display 3'], 'an empty display to the left is a target');
  assert.deepEqual(targetsToward('top', SELF, windows, DISPLAYS, false), [], 'nothing lies above');
});

test('a new reader lands at the near edge of the display it was thrown to', () => {
  const area = DISPLAYS[1].workArea;
  const right = landingBounds('right', area);
  assert.equal(right.x, area.x, 'thrown right, it appears on the display’s left edge');
  const left = landingBounds('left', DISPLAYS[2].workArea);
  assert.equal(left.x + left.width, DISPLAYS[2].workArea.x + DISPLAYS[2].workArea.width);
});
