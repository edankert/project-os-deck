// TST-0055 — how much of a note is drawn follows how large it is drawn, not
// which band it stands in (TASK-0074, ISS-0074).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { detailFor, promoted, DETAIL_AT, PROMOTE_AT, DETAIL_LEVELS, DETAIL_SHOWS } = load('shared/detail.js');
const { project, CARD_BOX, TILE_BOX, FRONT, MID, QUIET, bandShapeFor } = load('shared/slots.js');
const { applyZoom, IDENTITY_ZOOM, zoomAbout } = load('shared/zoom.js');

const VIEWPORT = { width: 1600, height: 900 };

/** How wide a note in this band is actually drawn, straight ahead, at this zoom. */
function widthOf(depth, box, factor = 1) {
  const slot = { theta: 0, depth, y: 0 };
  const yaw = 0;
  const zoom = factor === 1 ? IDENTITY_ZOOM : zoomAbout(IDENTITY_ZOOM, factor, { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 }, VIEWPORT);
  const p = applyZoom(project(slot, yaw, VIEWPORT), zoom, VIEWPORT);
  return p.scale * box.width;
}

test('the level is decided by width alone, and the thresholds are in order', () => {
  assert.ok(DETAIL_AT.brief < DETAIL_AT.full, 'brief is not below full');
  assert.ok(DETAIL_AT.full < DETAIL_AT.more, 'full is not below more');
  assert.deepEqual(DETAIL_LEVELS, ['tile', 'brief', 'full', 'more']);
});

test('detailFor is monotonic: a wider card never shows less', () => {
  let last = 0;
  for (let w = 0; w <= 600; w += 1) {
    const at = DETAIL_LEVELS.indexOf(detailFor(w));
    assert.ok(at >= last, `a card ${w} wide showed less than one ${w - 1} wide`);
    last = at;
  }
});

test('a width of zero, a negative width and an absurd width each return a level', () => {
  // It runs once per card per frame, and a card behind the person has no
  // useful width; throwing there would stop the field mid-turn.
  for (const w of [0, -1, -10_000, 10_000, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.ok(DETAIL_LEVELS.includes(detailFor(w)), `${w} returned ${detailFor(w)}`);
  }
  assert.equal(detailFor(Number.NaN), 'tile');
  assert.equal(detailFor(10_000), 'more');
});

test('at 1x the unzoomed field shows exactly what it shows today', () => {
  // The check that this change is invisible until a person zooms: a front
  // card keeps its face line and owed verb, a mid card keeps neither.
  const front = widthOf(FRONT.depth, CARD_BOX);
  const mid = widthOf(MID.depth, CARD_BOX);
  assert.equal(detailFor(front), 'full', `a front card is drawn ${front.toFixed(0)} wide`);
  assert.equal(detailFor(mid), 'brief', `a mid card is drawn ${mid.toFixed(0)} wide`);
  assert.ok(DETAIL_SHOWS.full.includes('face') && DETAIL_SHOWS.full.includes('owed'));
  assert.ok(!DETAIL_SHOWS.brief.includes('face') && !DETAIL_SHOWS.brief.includes('owed'));
});

test('a mid-band card zoomed in shows its face line and its owed verb', () => {
  // ISS-0074: zooming used to make the card bigger and tell a person nothing.
  const at1 = widthOf(MID.depth, CARD_BOX, 1);
  const at25 = widthOf(MID.depth, CARD_BOX, 2.5);
  assert.equal(detailFor(at1), 'brief');
  assert.ok(DETAIL_LEVELS.indexOf(detailFor(at25)) > DETAIL_LEVELS.indexOf('brief'), `2.5x gave ${detailFor(at25)} at ${at25.toFixed(0)} wide`);
  assert.ok(DETAIL_SHOWS[detailFor(at25)].includes('face'));
});

test('a card wide enough reaches more, which names status, progress and the face’s properties', () => {
  // The level Edwin asked for, which nothing draws at any band or any zoom
  // today. No excerpt: ISS-0074 step 4 is dropped, and `more` is built from
  // fields the card already carries.
  assert.equal(detailFor(DETAIL_AT.more), 'more');
  for (const part of ['status', 'progress', 'properties']) {
    assert.ok(DETAIL_SHOWS.more.includes(part), `more does not name ${part}`);
  }
  assert.ok(!DETAIL_SHOWS.more.includes('excerpt'), 'an excerpt would need a field CardModel does not carry');
  const front = widthOf(FRONT.depth, CARD_BOX, 1.6);
  assert.equal(detailFor(front), 'more', `a front card at 1.6x is drawn ${front.toFixed(0)} wide`);
});

test('a quiet tile is promoted exactly when it first has something to say', () => {
  assert.ok(PROMOTE_AT <= DETAIL_AT.brief, 'a tile would be promoted while it still showed only an id');
  assert.equal(promoted(PROMOTE_AT), true);
  assert.equal(promoted(PROMOTE_AT - 1), false);
  assert.equal(promoted(Number.NaN), false);
});

test('a large workspace keeps its tiles and a small one gets cards, at the same zoom', () => {
  // This is the threshold ISS-0073's cost question turns on. Your Trainer
  // paints 58-wide tiles; this repository's quiet band draws 140-wide ones
  // (TASK-0073), and only the second is worth an element.
  const big = widthOf(QUIET.depth, bandShapeFor('deep', 2700).box);
  const small = widthOf(QUIET.depth, bandShapeFor('deep', 35).box);
  assert.equal(promoted(big), false, `Your Trainer's tile is drawn ${big.toFixed(0)} wide and would be promoted`);
  assert.equal(promoted(small), true, `a small workspace's tile is drawn ${small.toFixed(0)} wide and stays painted`);
  assert.equal(detailFor(big), 'tile', 'the large workspace should still be showing an id on a canvas');
  assert.equal(detailFor(small), 'brief');
  assert.deepEqual(bandShapeFor('deep', 2700).box, { width: TILE_BOX.width, height: TILE_BOX.height });
});

test('a zoomed-in quiet tile on a large workspace is promoted too', () => {
  const big = bandShapeFor('deep', 2700).box;
  assert.equal(promoted(widthOf(QUIET.depth, big, 1)), false);
  assert.equal(promoted(widthOf(QUIET.depth, big, 2.5)), true, 'zooming right in on the quiet band still gave a canvas rectangle');
});
