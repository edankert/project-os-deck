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
    const run = spawnSync(process.execPath, [path.join(desktopRoot, 'scripts', 'overview-plates.mjs'), '--out', out, '--page', path.join(out, 'page.html'), '--time-page', path.join(out, 'DES-0005-time-columns.html'), '--no-raster'], { encoding: 'utf-8' });
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
    // The Level 2 page (TASK-0157): written beside the plates, holding every ticket of both
    // fixtures, with three.js from cdnjs at a pinned version and nothing else from outside.
    const time = fs.readFileSync(path.join(out, 'DES-0005-time-columns.html'), 'utf-8');
    const data = JSON.parse(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(time)[1]);
    for (const ws of ['deck', 'your-trainer']) {
      const fixtureModel = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${ws}.json`), 'utf-8'));
      const ids = [...data[ws].phases.flatMap((p) => p.tickets), ...data[ws].core].map((t) => t[0]);
      assert.equal(new Set(ids).size, ids.length, `${ws}: no ticket twice on the time page`);
      assert.deepEqual(new Set(ids), new Set(Object.keys(fixtureModel.tickets)), `${ws}: the time page holds every ticket`);
    }
    assert.match(time, /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/\d+\.\d+\.\d+\/three\.module\.min\.js/);
    assert.deepEqual([...time.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/')), [], 'nothing else is loaded from outside');
    // The towers page (TASK-0163): written beside the plates, every ticket of both fixtures
    // exactly once, as a tower's foot, a floor, a flat tile, a block on the shelf or a tile
    // of the core; three.js from cdnjs at a pinned version and nothing else from outside.
    const towers = fs.readFileSync(path.join(out, 'DES-0005-towers.html'), 'utf-8');
    const towerData = JSON.parse(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(towers)[1]);
    for (const ws of ['deck', 'your-trainer']) {
      const fixtureModel = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', `${ws}.json`), 'utf-8'));
      const w = towerData[ws];
      const ids = [
        ...w.ring.flatMap((p) => [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])]),
        ...w.shelf.flatMap((p) => p.tickets),
        ...w.core,
      ].map((t) => t[0]);
      assert.equal(new Set(ids).size, ids.length, `${ws}: no ticket twice on the towers page`);
      assert.deepEqual(new Set(ids), new Set(Object.keys(fixtureModel.tickets)), `${ws}: the towers page holds every ticket`);
      // A tower is a feature of that phase; its floors are never features.
      for (const p of w.ring) {
        for (const t of p.towers) {
          assert.equal(t.f[1], 'feature', `${ws}: ${t.f[0]} stands as a tower but is a ${t.f[1]}`);
          assert.ok(fixtureModel.tickets[t.f[0]] !== undefined, `${ws}: ${t.f[0]} is a ticket of the fixture`);
          assert.ok(t.floors.every((r) => r[1] !== 'feature'), `${ws}: a feature is a floor of ${t.f[0]}`);
        }
      }
      // The ring is the fixture's unfinished phases and its backlog; the shelf its finished ones.
      assert.deepEqual(w.ring.map((p) => p.id).sort(), [...fixtureModel.phases, ...fixtureModel.backlog].map((p) => p.id).sort(), `${ws}: the ring holds the unfinished phases`);
      assert.deepEqual(w.shelf.map((p) => p.id).sort(), fixtureModel.shelf.map((p) => p.id).sort(), `${ws}: the shelf holds the finished phases`);
      if (w.next !== null) assert.ok(fixtureModel.tickets[w.next] !== undefined, `${ws}: the next ticket ${w.next} is a ticket`);
    }
    // Which tower a ticket stands in, on Deck, whose notes are always here (review of TASK-0163).
    const deckTowers = new Map(towerData.deck.ring.flatMap((p) => p.towers.map((t) => [t.f[0], t.floors.map((r) => r[0])])));
    const towerOf = (id) => [...deckTowers.entries()].find(([, floors]) => floors.includes(id))?.[0] ?? null;
    assert.ok([...deckTowers.values()].reduce((n, f) => n + f.length, 0) >= 150, 'Deck\'s towers hold their tickets, not only their features');
    assert.equal(towerOf('TASK-0156'), 'FEAT-0027', 'a task stands in its parent feature\'s tower');
    assert.equal(towerOf('TST-0086'), 'FEAT-0029', 'a test named by a task, in a dash list at column 0, stands in that task\'s feature');
    assert.equal(towerOf('DES-0005'), null, 'an id inside a link\'s file name ([[TST-0094-DES-0005s-...]]) names nothing');
    // The focus is the snapshot's at the fixture's commit, when this clone has that commit.
    const deckModel = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'overview', 'deck.json'), 'utf-8'));
    const shown = spawnSync('git', ['-C', path.join(desktopRoot, '..'), 'show', `${deckModel.head}:SNAPSHOT.yaml`], { encoding: 'utf-8' });
    const focus = towerData.deck.focus;
    assert.ok(focus.phase !== null && focus.feature !== null, 'Deck\'s page has a focus phase and feature');
    if (shown.status === 0) {
      const block = /^focus:\r?\n((?:(?:[ \t].*)?\r?\n)*)/m.exec(shown.stdout)[1];
      const pick = (key) => new RegExp(`^  ${key}:\\s*"?([A-Z]+-\\d+)`, 'm').exec(block)?.[1] ?? null;
      assert.equal(focus.from, 'commit');
      assert.deepEqual([focus.phase, focus.feature, focus.task], [pick('phase'), pick('feature'), pick('task')], 'Deck\'s focus is its snapshot\'s at the fixture\'s commit');
      assert.equal(towerData.deck.notesFrom, 'commit', 'Deck\'s notes are read at the fixture\'s commit');
      if (focus.task !== null) assert.equal(towerData.deck.next, focus.task, 'the next ticket is the focus task when the snapshot names one');
    }
    assert.match(towers, /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/0\.160\.0\/three\.module\.min\.js/);
    assert.deepEqual([...towers.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/')), [], 'the towers page loads nothing else from outside');
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

// TASK-0163, review round one: the towers page reads which feature a ticket belongs to from
// frontmatter written in every way the corpus writes it. Checked on small notes of its own,
// because in the corpus a feature's own lists name the same tickets and would hide a miss.
test('the towers page reads parents and lists however the frontmatter writes them', async () => {
  const { relationsFrom, idsIn } = await import(path.join(desktopRoot, 'scripts', 'overview-towers-notes.mjs'));
  const note = (lines) => `---\n${lines.join('\n')}\n---\n\n# A note\n`;
  const { parent, named } = relationsFrom([
    note(['id: TASK-0001', `parent: '[[FEAT-0001-Single-Quoted]]'`]),
    note(['id: TASK-0002', 'parent: "[[FEAT-0002-Double-Quoted]]"']),
    note(['id: TASK-0003', 'parent: "FEAT-0003"']),
    note(['id: TASK-0004', 'parent: [[FEAT-0004]]', 'tests:', "- '[[TST-0004-At-Column-Zero]]'", 'related: ["[[TST-0099]]"]']),
    note(['id: FEAT-0005', 'tests:', '  - "[[TST-0005-Indented]]"', 'implements: ["[[REQ-0005-Inline]]", "REQ-0006"]', 'designs: []']),
    note(['id: FEAT-0006', 'tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn]]"]']),
    note(['id: TASK-0001', 'parent: "[[FEAT-0099]]"']),
  ]);
  assert.equal(parent.get('TASK-0001'), 'FEAT-0001', 'a parent in single quotes');
  assert.equal(parent.get('TASK-0002'), 'FEAT-0002', 'a parent in double quotes');
  assert.equal(parent.get('TASK-0003'), 'FEAT-0003', 'a parent written bare');
  assert.equal(parent.get('TASK-0004'), 'FEAT-0004', 'a parent with no quotes');
  assert.deepEqual(named.get('TASK-0004'), ['TST-0004'], 'a dash list at column 0, and only up to the next key');
  assert.deepEqual(named.get('FEAT-0005'), ['TST-0005', 'REQ-0005', 'REQ-0006'], 'an indented dash list, an inline list, a bare id');
  assert.deepEqual(named.get('FEAT-0006'), ['TST-0094'], 'an id inside a link\'s file name names nothing');
  assert.deepEqual(idsIn('[[FEAT-0001|the alias FEAT-0002]] "TASK-0003" TASK-0004-x'), ['FEAT-0001', 'TASK-0003'], 'a link counts by its target; an id joined to more words is a name, not an id');
  assert.equal(parent.size, 4, 'the first note with an id wins');
});
