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
