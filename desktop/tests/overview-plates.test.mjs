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
        assert.equal(drawn, plate.marks, `${plate.svg}: ${drawn} ticket marks in the SVG, ${plate.marks} in the scene`);
        assert.ok(plate.words <= 60, `${plate.svg}: ${plate.words} words at rest`);
      }
    }
    assert.match(fs.readFileSync(path.join(out, 'page.html'), 'utf-8'), /DES-0005/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
