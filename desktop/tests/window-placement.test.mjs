// TST-0003 — a window is placed on the display it was on, and on the primary
// display when that monitor is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { placeWindow, clampInto, boundsKey, DEFAULT_SIZE } = load('main/window-placement.js');

const LAPTOP = { id: 1, workArea: { x: 0, y: 25, width: 1440, height: 875 }, primary: true };
const SECOND = { id: 2, workArea: { x: 1440, y: 0, width: 1920, height: 1080 }, primary: false };

test('bounds are kept when the display they were on is still connected', () => {
  const saved = { x: 1600, y: 200, width: 700, height: 500, displayId: 2 };
  assert.deepEqual(placeWindow(saved, [LAPTOP, SECOND]), { x: 1600, y: 200, width: 700, height: 500 });
});

test('a window whose display was unplugged opens on the primary display', () => {
  const saved = { x: 1600, y: 200, width: 700, height: 500, displayId: 2 };
  const placed = placeWindow(saved, [LAPTOP]);
  assert.ok(placed.x >= LAPTOP.workArea.x, 'placed left of the laptop screen');
  assert.ok(placed.x + placed.width <= LAPTOP.workArea.x + LAPTOP.workArea.width, 'placed off the right edge');
  assert.ok(placed.y >= LAPTOP.workArea.y, 'placed above the laptop work area');
  assert.equal(placed.width, 700, 'the size the person chose was thrown away');
});

test('bounds that lie off every display are corrected onto one', () => {
  const saved = { x: 9000, y: 9000, width: 600, height: 400, displayId: 1 };
  const placed = placeWindow(saved, [LAPTOP]);
  assert.ok(placed.x + placed.width <= LAPTOP.workArea.x + LAPTOP.workArea.width);
  assert.ok(placed.y + placed.height <= LAPTOP.workArea.y + LAPTOP.workArea.height);
});

test('a window larger than its display is clamped to it', () => {
  const saved = { x: 0, y: 25, width: 4000, height: 3000, displayId: 1 };
  const placed = placeWindow(saved, [LAPTOP]);
  assert.equal(placed.width, LAPTOP.workArea.width);
  assert.equal(placed.height, LAPTOP.workArea.height);
});

test('no saved bounds means centred on the primary display, at the default size', () => {
  const placed = placeWindow(null, [LAPTOP, SECOND]);
  assert.equal(placed.width, DEFAULT_SIZE.width);
  assert.equal(placed.height, DEFAULT_SIZE.height);
  const centreX = placed.x + placed.width / 2;
  assert.ok(Math.abs(centreX - (LAPTOP.workArea.x + LAPTOP.workArea.width / 2)) <= 1);
});

test('no display at all still yields a rectangle rather than a throw', () => {
  const placed = placeWindow(null, []);
  assert.equal(placed.width, DEFAULT_SIZE.width);
});

test('clamping never moves a window off the top-left of its work area', () => {
  const placed = clampInto({ x: -500, y: -500, width: 400, height: 300 }, LAPTOP.workArea);
  assert.equal(placed.x, LAPTOP.workArea.x);
  assert.equal(placed.y, LAPTOP.workArea.y);
});

test('two panels keep separate saved rectangles', () => {
  assert.notEqual(boundsKey('satellite', 'status'), boundsKey('satellite', 'reader'));
  assert.notEqual(boundsKey('focus', null), boundsKey('satellite', 'status'));
  assert.equal(boundsKey('focus', null), 'focus');
});
