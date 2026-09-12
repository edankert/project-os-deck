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

test('a tile is promoted when it is drawn at the size of a card that carries detail', () => {
  // Promotion is about DETAIL, not about reach: TASK-0076 gave the painted
  // band its own hit test and tab stop, so a tile is clickable and reachable
  // whether or not it is an element. At the `brief` threshold every visible
  // tile on the largest workspace promoted at 1x, which is the document
  // doubling ISS-0073 warned about, taken without a person asking.
  assert.equal(PROMOTE_AT, DETAIL_AT.full);
  assert.ok(PROMOTE_AT > DETAIL_AT.brief, 'a tile is promoted while it still shows only an id and a title');
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
  assert.equal(detailFor(big), 'tile', 'the large workspace should still be showing an id on a canvas');
  assert.equal(detailFor(small), 'brief', 'a small workspace should be showing a title too');
  assert.ok(small > big * 2, `a small workspace's tile (${small.toFixed(0)}) is not much bigger than a large one's (${big.toFixed(0)})`);
  // Neither is promoted at 1x: an element is for detail a card carries, and
  // both of these are still reachable through the canvas hit test.
  assert.equal(promoted(big), false);
  assert.equal(promoted(small), false);
  assert.deepEqual(bandShapeFor('deep', 2700).box, { width: TILE_BOX.width, height: TILE_BOX.height });
});

test('zooming toward the quiet band is what promotes its tiles', () => {
  const small = bandShapeFor('deep', 35).box;
  const mid = bandShapeFor('deep', 326).box;
  assert.equal(promoted(widthOf(QUIET.depth, small, 1)), false, 'a small workspace promoted its whole band before anybody asked');
  assert.equal(promoted(widthOf(QUIET.depth, small, 1.6)), true);
  // A 326-note band's tile is 108 wide, drawn 64 across at the centre of the
  // shelf at 1x. The tiles at its edges are drawn about half again as large
  // and promote sooner; this is the hardest case, the centre.
  assert.equal(promoted(widthOf(QUIET.depth, mid, 1)), false);
  assert.equal(promoted(widthOf(QUIET.depth, mid, 2.5)), true);
});

test('the very largest quiet band is never promoted at the centre, and that is the trade', () => {
  // A band past 800 notes gets the 58-pixel tile, which is drawn 34 across at
  // 1x and 86 at the maximum zoom of 2.5 — under the threshold. Its tiles
  // stay painted however far a person zooms at the centre of the shelf; the
  // ones at its edges are drawn about half again as large and do promote.
  //
  // This costs nothing a person can do: TASK-0076's hit test and tab stop
  // reach a painted tile. What it costs is detail, on the one band where
  // promoting everything would double the document — which is the trade
  // ISS-0073 asked about, taken deliberately.
  const huge = bandShapeFor('deep', 2700).box;
  assert.equal(promoted(widthOf(QUIET.depth, huge, 2.5)), false);
  assert.ok(widthOf(QUIET.depth, huge, 2.5) > widthOf(QUIET.depth, huge, 1), 'the zoom does nothing at all');
  assert.equal(detailFor(widthOf(QUIET.depth, huge, 2.5)), 'brief', 'a zoomed tile should at least be readable');
});

test('a tile at the threshold does not flicker between a card and a rectangle', () => {
  // Without hysteresis a tile sitting on the threshold is created and
  // destroyed on alternate frames as the zoom drifts a fraction, which reads
  // as a flicker and allocates an element every frame.
  const { DEMOTE_AT } = load('shared/detail.js');
  assert.ok(DEMOTE_AT < PROMOTE_AT, 'a promoted tile is demoted at the same width it was promoted at');
  // Just below the threshold: painted if it was painted, kept if it was a card.
  const drift = PROMOTE_AT - 1;
  assert.equal(promoted(drift, false), false, 'a painted tile was promoted below the threshold');
  assert.equal(promoted(drift, true), true, 'a promoted card was demoted by a pixel of drift');
  // Far enough below and it goes back, whatever it was.
  assert.equal(promoted(DEMOTE_AT - 1, true), false, 'a card zoomed well out never went back to being a tile');
  assert.equal(promoted(PROMOTE_AT, false), true);
});
