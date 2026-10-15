// TST-0094 — DES-0005's plates are drawn by the screen code for every screen on
// both workspaces, and each plate draws every ticket mark its scene holds
// (FEAT-0025, TASK-0130). A screen dropped from the plate script, or marks lost
// in serialising, fails here rather than in a picture nobody counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { desktopRoot } from './helpers.mjs';

test('the plate script draws all seven screens on both workspaces, every mark included', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-plates-'));
  try {
    const run = spawnSync(process.execPath, [path.join(desktopRoot, 'scripts', 'overview-plates.mjs'), '--out', out, '--page', path.join(out, 'page.html'), '--no-raster'], { encoding: 'utf-8' });
    assert.equal(run.status, 0, run.stderr);
    const plates = JSON.parse(fs.readFileSync(path.join(out, 'plates.json'), 'utf-8'));
    const screens = ['wheel', 'phase', 'ticket', 'rephase', 'design', 'test-run', 'accept'];
    for (const ws of ['deck', 'your-trainer']) {
      for (const screen of screens) {
        const plate = plates.find((p) => p.ws === ws && p.key === screen);
        assert.ok(plate !== undefined, `no ${screen} plate for ${ws}`);
        const svg = fs.readFileSync(path.join(out, plate.svg), 'utf-8');
        const drawn = (svg.match(/ data-ticket="/g) ?? []).length;
        // The manifest says what the plate draws. A panel drawn flat may run out of room and
        // say "more in Deck"; every other mark is drawn.
        assert.equal(drawn, plate.marks, `${plate.svg}: the manifest says ${plate.marks}, the SVG draws ${drawn}`);
        if (plate.panelRows === 0) assert.equal(drawn, plate.tickets, `${plate.svg}: ${drawn} of ${plate.tickets} tickets drawn`);
        else assert.ok(drawn >= plate.tickets - plate.panelRows && drawn <= plate.tickets, `${plate.svg}: ${drawn} of ${plate.tickets}`);
        assert.ok(plate.words <= 60, `${plate.svg}: ${plate.words} words at rest`);
      }
    }
    // No section of a flat panel is lost to a long one before it: each draws at least one ticket.
    for (const ws of ['deck', 'your-trainer']) {
      for (const key of ['phase', 'ticket']) {
        const plate = plates.find((p) => p.ws === ws && p.key === key);
        const svg = fs.readFileSync(path.join(out, plate.svg), 'utf-8');
        const ids = new Set([...svg.matchAll(/ data-ticket="([^"]+)"/g)].map((m) => m[1]));
        for (const section of plate.sections ?? []) {
          if (section.rows.length > 0) assert.ok(section.rows.some((id) => ids.has(id)), `${plate.svg}: the ${section.title} section draws none of its ${section.rows.length} tickets`);
        }
        assert.ok((plate.sections ?? []).length > 0, `${plate.svg}: the manifest names its sections`);
      }
    }
    // The wheel is drawn in both colourings on both workspaces, for Edwin to compare (TASK-0145, TASK-0150).
    for (const ws of ['deck', 'your-trainer']) {
      const typed = fs.readFileSync(path.join(out, plates.find((p) => p.ws === ws && p.key === 'wheel').svg), 'utf-8');
      const stated = fs.readFileSync(path.join(out, plates.find((p) => p.ws === ws && p.key === 'wheel-state').svg), 'utf-8');
      assert.match(typed, / class="ty-[a-z]+ fl-[a-z]+/, `${ws}: the wheel in the cockpit's colours`);
      assert.match(stated, / class="st-[a-z]+/, `${ws}: the wheel in the state colours`);
      assert.doesNotMatch(stated, / class="ty-[a-z]+ fl-[a-z]+[^"]*" data-ticket=/, `${ws}: the state wheel paints no ticket by type`);
    }
    const page = fs.readFileSync(path.join(out, 'page.html'), 'utf-8');
    assert.match(page, /DES-0005/);
    // The page has back and forward, as Deck does (TASK-0146), and its script runs.
    assert.match(page, /id="back"/);
    assert.match(page, /id="forward"/);
    const script = /<script>([\s\S]*)<\/script>/.exec(page)[1];
    const els = {};
    const element = (id) => (els[id] ??= { id, data: '', textContent: '', disabled: false, dataset: {}, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, setAttribute() {} });
    const doc = { getElementById: element, querySelectorAll: () => [], addEventListener() {} };
    new Function('document', script)(doc);
    assert.equal(els.back.disabled, true, 'nothing to go back to at first');
    els.screen.listeners.click({ target: { dataset: { screen: 'phase' } } });
    assert.equal(els.back.disabled, false, 'after opening a screen, back is live');
    els.back.listeners.click();
    assert.match(els.plate.data, /wheel-deck\.svg$/, 'back shows the wheel again');
    assert.equal(els.forward.disabled, false);
    els.forward.listeners.click();
    assert.match(els.plate.data, /phase-deck\.svg$/, 'forward shows the phase again');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
