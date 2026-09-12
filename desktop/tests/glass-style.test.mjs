// TST-0042 — nothing in Deck's stylesheet blurs a card or puts a backdrop
// filter over the field, and `will-change` is promised on the near-band cards
// only (TASK-0031).
//
// Read off the BUILT stylesheet, the one both hosts serve, with comments
// stripped: the comment that explains the rule names the thing it forbids,
// and a check that matched it would be a check about prose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';

const BUILT = path.join(desktopRoot, 'dist', 'web', 'deck.css');

function rules() {
  const css = fs.readFileSync(BUILT, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  // Flat enough for Deck's stylesheet: at-rules wrap plain rules one level deep.
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

test('no rule blurs anything, and no rule sets a backdrop filter', () => {
  const found = rules().filter((r) => /backdrop-filter\s*:/.test(r.body) || /(^|[;\s])filter\s*:[^;]*blur\(/.test(r.body));
  assert.deepEqual(found.map((r) => r.selector), [], 'the DES-0002 review ruled both out over a moving field');
});

test('will-change is set on the near-band cards and on nothing else', () => {
  const promoted = rules().filter((r) => /will-change\s*:/.test(r.body));
  assert.ok(promoted.length > 0, 'the near-band cards are not promoted at all');
  for (const rule of promoted) {
    assert.equal(rule.selector, '.field-card', `${rule.selector} is promoted to its own layer`);
  }
});

test('the field card is anchored at its centre, as the slot geometry assumes', () => {
  const card = rules().find((r) => r.selector === '.field-card');
  assert.notEqual(card, undefined);
  assert.match(card.body, /transform-origin:\s*50% 50%/);
  assert.match(card.body, /width:\s*186px/, 'the card box in the stylesheet is not CARD_BOX');
  assert.match(card.body, /height:\s*92px/);
});

test('the containers over the field let the pointer through, and a card takes it', () => {
  const byName = (name) => rules().filter((r) => r.selector.split(',').map((s) => s.trim()).includes(name));
  for (const container of ['.field-cards', '.field-canvas', '.field-panes', '.field-sectors']) {
    assert.ok(byName(container).some((r) => /pointer-events:\s*none/.test(r.body)), `${container} would swallow the pointer`);
  }
  assert.ok(byName('.field-card').some((r) => /pointer-events:\s*auto/.test(r.body)));
  assert.ok(byName('.pane > *').some((r) => /pointer-events:\s*auto/.test(r.body)), 'a pane’s header and body take the pointer');
});

// ---- TASK-0075: detail is keyed to apparent size, not to the band ----

test('no rule hides a card’s face line or owed verb by which band it is in', () => {
  // ISS-0074: the one rule that decided how much of a note is drawn was keyed
  // to `data-band`, which the zoom cannot reach. If this comes back, zooming
  // in makes a card bigger and tells a person nothing new again.
  const hiding = rules().filter(
    (r) => /\[data-band=/.test(r.selector) && /\.fc-(face|owed|title|mark)\b/.test(r.selector) && /display\s*:\s*none/.test(r.body),
  );
  assert.deepEqual(hiding.map((r) => r.selector), [], 'detail is decided by band again');
});

test('every level the detail module names has a rule, and they hide progressively less', () => {
  const byDetail = rules().filter((r) => /\[data-detail=/.test(r.selector));
  const named = new Set();
  for (const r of byDetail) for (const m of r.selector.matchAll(/\[data-detail="([a-z]+)"\]/g)) named.add(m[1]);
  assert.deepEqual([...named].sort(), ['brief', 'more', 'tile'], 'a level has no rule, so it draws the same as the one below it');
  const hidden = (level) =>
    byDetail
      .filter((r) => r.selector.includes(`[data-detail="${level}"]`) && /display\s*:\s*none/.test(r.body))
      .flatMap((r) => [...r.selector.matchAll(/\.fc-([a-z]+)/g)].map((m) => m[1]));
  const tile = new Set(hidden('tile'));
  const brief = new Set(hidden('brief'));
  assert.ok(tile.size > brief.size, 'a tile does not hide more than a brief card does');
  for (const part of brief) assert.ok(tile.has(part), `brief hides .fc-${part} and tile does not`);
});

test('the more level draws something, and full draws nothing extra of its own', () => {
  // `more` is the level nothing has ever drawn. If its rule is missing the
  // field silently stops at `full` however far a person zooms.
  const more = rules().filter((r) => r.selector.includes('[data-detail="more"]'));
  assert.ok(more.length > 0, 'the level Edwin asked for has no rule at all');
  assert.ok(more.some((r) => /\.fc-more/.test(r.selector) && /display\s*:\s*(flex|block|grid)/.test(r.body)));
  const always = rules().find((r) => r.selector === '.field-card .fc-more');
  assert.ok(always !== undefined && /display\s*:\s*none/.test(always.body), '.fc-more is drawn at every level');
});

// ---- TASK-0076: the quiet band's one tab stop ----

test('the quiet band adds exactly one tab stop, whatever it holds', () => {
  // The band is painted on a canvas, so it has no elements of its own. A
  // thousand tab stops would not be a keyboard route, and no tab stop at all
  // is exactly as bad by keyboard as by mouse (ISS-0073, DES-0002's rule).
  const html = fs.readFileSync(path.join(desktopRoot, 'dist', 'web', 'index.html'), 'utf-8');
  const cursors = [...html.matchAll(/class="quiet-cursor"/g)];
  assert.equal(cursors.length, 1, 'the quiet band has no single tab stop, or has more than one');
  const el = /<button[^>]*id="quiet-cursor"[^>]*>/.exec(html);
  assert.ok(el !== null, 'the tab stop is not a button, so Enter and Space do not reach it');
  assert.ok(/\bhidden\b/.test(el[0]), 'the tab stop is in the tab order before the band has anything in it');
});

test('the quiet cursor is drawn over the field and does not swallow the canvas', () => {
  const cursor = rules().filter((r) => r.selector.split(',').some((sel) => sel.trim() === '.quiet-cursor'));
  assert.ok(cursor.length > 0, 'the quiet band’s tab stop has no style, so it is invisible and unfindable');
  assert.ok(cursor.some((r) => /position\s*:\s*absolute/.test(r.body)));
  assert.ok(cursor.some((r) => /background\s*:\s*transparent/.test(r.body)), 'the cursor covers the tile it marks');
});
