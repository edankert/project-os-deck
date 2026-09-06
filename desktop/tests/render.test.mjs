// TST-0014 — a card the pool has hidden is not on the screen (ISS-0001).
//
// The pool marks a spare card with the `hidden` attribute. An author rule that
// sets `display` beats the browser's own `[hidden] { display: none }`, so the
// stylesheet can un-hide every card without the renderer being wrong about
// anything. That is what happened: switching to a shorter view repainted its
// cards over the top of the previous view's, which stayed put.
//
// This suite guards the stylesheet's half. The behavioural half is the smoke
// run, which counts what the browser actually displays.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';

const cssPath = path.join(desktopRoot, 'dist', 'web', 'deck.css');

function rules(css) {
  // Comments first: they talk about `display` and about `[hidden]`, and a test
  // that reads them is reading prose rather than rules.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let match = re.exec(withoutComments);
  while (match !== null) {
    out.push({ selector: (match[1] ?? '').trim(), body: (match[2] ?? '').trim() });
    match = re.exec(withoutComments);
  }
  return out;
}

test('the stylesheet was built', () => {
  assert.ok(fs.existsSync(cssPath), `no stylesheet at ${cssPath}`);
});

test('a hidden element is displayed by nothing', () => {
  const parsed = rules(fs.readFileSync(cssPath, 'utf8'));
  const hiddenRules = parsed.filter((r) => r.selector.includes('[hidden]'));
  assert.ok(hiddenRules.length > 0, 'no rule in the stylesheet mentions [hidden]');
  const closes = hiddenRules.some(
    (r) => /display\s*:\s*none/.test(r.body) && /!important/.test(r.body),
  );
  assert.ok(
    closes,
    'the [hidden] rule must set display:none !important, or any rule that sets display un-hides it',
  );
});

test('nothing else claims display with !important, which would outrank the hidden rule', () => {
  const parsed = rules(fs.readFileSync(cssPath, 'utf8'));
  const offenders = parsed
    .filter((r) => !r.selector.includes('[hidden]'))
    .filter((r) => /display\s*:[^;]*!important/.test(r.body))
    .map((r) => r.selector);
  assert.deepEqual(offenders, [], 'these rules could beat [hidden] and put a hidden card back on screen');
});

test('the card rule still sets display, which is why the guard is needed', () => {
  // Not a style preference: this documents the collision. If `.card` ever
  // stops setting `display`, the guard above is still correct and this test
  // is the place that says why it was added.
  const parsed = rules(fs.readFileSync(cssPath, 'utf8'));
  const card = parsed.find((r) => r.selector === '.card');
  assert.ok(card, 'no .card rule in the stylesheet');
  assert.match(card.body, /display\s*:/, 'the .card rule no longer sets display; the collision may be gone');
});
