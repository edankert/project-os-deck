// TST-0050 — zoom keeps the point under the pointer (FEAT-0016, TASK-0064).
//
// The wheel scales Glass and the orbit toward the pointer. A zoom is a scale
// and an offset applied after the perspective, so these checks need no window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { IDENTITY_ZOOM, ZOOM_MIN, ZOOM_MAX, zoomAbout, zoomPoint, unzoomPoint, applyZoom, keepOnScreen, wheelFactor, isIdentity } = load('shared/zoom.js');
const { project, FRONT } = load('shared/slots.js');

const FIELD = { width: 1000, height: 700 };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

// A point well inside the field, so keeping it on screen never has to move it.
function pivots() {
  const out = [];
  for (let i = 1; i < 10; i += 1) out.push({ x: (FIELD.width * i) / 10, y: (FIELD.height * ((i * 3) % 10 || 5)) / 10 });
  return out;
}

test('zooming about a point keeps the field point under it, in and out, while the field stays on screen', () => {
  for (const pivot of pivots()) {
    let zoom = { ...IDENTITY_ZOOM };
    for (const factor of [1.1, 1.1, 1.3, 1.5, 1 / 1.2]) {
      const before = unzoomPoint(pivot, zoom);
      const next = zoomAbout(zoom, factor, pivot, FIELD);
      // Where the pivot rule alone puts the field, and whether keeping the
      // field on screen would move it from there: only then may the pivot give.
      const k = next.scale / zoom.scale;
      const ideal = { scale: next.scale, dx: pivot.x - (pivot.x - zoom.dx) * k, dy: pivot.y - (pivot.y - zoom.dy) * k };
      const kept = keepOnScreen(ideal, FIELD);
      const clamped = Math.abs(kept.dx - ideal.dx) > 1e-9 || Math.abs(kept.dy - ideal.dy) > 1e-9;
      if (!clamped) {
        const after = zoomPoint(before, next);
        assert.ok(near(after.x, pivot.x, 0.5) && near(after.y, pivot.y, 0.5), `pivot ${pivot.x},${pivot.y} moved to ${after.x},${after.y}`);
      }
      zoom = next;
    }
  }
});

test('the scale stops at 0.6 and at 2.5, and the pivot still holds at a limit when the field stays on screen', () => {
  let zoom = { ...IDENTITY_ZOOM };
  for (let i = 0; i < 50; i += 1) zoom = zoomAbout(zoom, 1.3, { x: 500, y: 350 }, FIELD);
  assert.equal(zoom.scale, ZOOM_MAX);
  const centre = unzoomPoint({ x: 500, y: 350 }, zoom);
  assert.ok(near(centre.x, 500, 1e-6) && near(centre.y, 350, 1e-6), 'zooming about the middle kept the middle');
  for (let i = 0; i < 80; i += 1) zoom = zoomAbout(zoom, 1 / 1.3, { x: 200, y: 100 }, FIELD);
  assert.equal(zoom.scale, ZOOM_MIN);
});

test('a factor and its inverse at the same point return the starting zoom', () => {
  const start = zoomAbout({ ...IDENTITY_ZOOM }, 1.7, { x: 420, y: 300 }, FIELD);
  const back = zoomAbout(zoomAbout(start, 1.21, { x: 610, y: 330 }, FIELD), 1 / 1.21, { x: 610, y: 330 }, FIELD);
  assert.ok(near(back.scale, start.scale, 1e-9) && near(back.dx, start.dx, 1e-9) && near(back.dy, start.dy, 1e-9), JSON.stringify({ start, back }));
});

test('at 1× or more the zoomed field covers the field area; below 1× it lies inside it', () => {
  for (const scale of [0.6, 0.8, 1, 1.4, 2.5]) {
    for (const [dx, dy] of [[-5000, -5000], [5000, 5000], [0, 0], [-300, 200]]) {
      const z = keepOnScreen({ scale, dx, dy }, FIELD);
      const left = z.dx;
      const right = z.dx + FIELD.width * scale;
      const top = z.dy;
      const bottom = z.dy + FIELD.height * scale;
      if (scale >= 1) assert.ok(left <= 1e-9 && right >= FIELD.width - 1e-9 && top <= 1e-9 && bottom >= FIELD.height - 1e-9, `${scale}: ${left}..${right}`);
      else assert.ok(left >= -1e-9 && right <= FIELD.width + 1e-9 && top >= -1e-9 && bottom <= FIELD.height + 1e-9, `${scale}: ${left}..${right}`);
    }
  }
  assert.equal(isIdentity(keepOnScreen({ scale: 1, dx: 40, dy: -30 }, FIELD)), true, 'at 1× the only place is the field itself');
});

test('the inverse returns the original point', () => {
  const zoom = { scale: 1.83, dx: -412.5, dy: -97.25 };
  for (const p of [{ x: 0, y: 0 }, { x: 333.3, y: 12.7 }, { x: 999, y: 699 }]) {
    const back = unzoomPoint(zoomPoint(p, zoom), zoom);
    assert.ok(near(back.x, p.x, 1e-9) && near(back.y, p.y, 1e-9));
  }
});

test('the identity zoom draws every projection unchanged, and a card zoomed past the edge is not visible', () => {
  const slot = { theta: 0.3, depth: FRONT.depth, y: -40 };
  const p = project(slot, 0, FIELD);
  assert.equal(applyZoom(p, IDENTITY_ZOOM, FIELD), p, 'the identity rebuilt the projection');
  assert.equal(p.visible, true);
  const zoomedAway = applyZoom(p, { scale: 2.5, dx: -2400, dy: 0 }, FIELD);
  assert.equal(zoomedAway.visible, false, 'a card drawn past the left edge was reported visible');
  const zoomed = applyZoom(p, { scale: 2, dx: -500, dy: -350 }, FIELD);
  assert.ok(near(zoomed.x, p.x * 2 - 500, 1e-9) && near(zoomed.scale, p.scale * 2, 1e-12));
});

test('the wheel zooms in for a negative delta, symmetrically, and the same for lines as for pixels', () => {
  assert.ok(wheelFactor(-100, 0, false) > 1);
  assert.ok(near(wheelFactor(-100, 0, false), 1.1, 1e-9), 'one mouse notch is 1.1×');
  assert.ok(near(wheelFactor(-100, 0, false) * wheelFactor(100, 0, false), 1, 1e-12));
  assert.ok(near(wheelFactor(-3, 1, false), wheelFactor(-48, 0, false), 1e-12), 'three lines are 48 pixels');
  assert.ok(wheelFactor(-10, 0, true) > wheelFactor(-10, 0, false), 'a pinch takes a larger step per pixel');
});
