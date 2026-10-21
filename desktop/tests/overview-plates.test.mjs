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
      // The towers' flat plan draws the cockpit's square in its type colour (TASK-0166).
      assert.match(typed, / class="ty-[a-z]+ sq[^"]*" data-ticket=/, `${ws}: the wheel in the cockpit's colours`);
      assert.match(stated, / class="st-[a-z]+/, `${ws}: the wheel in the state colours`);
      assert.doesNotMatch(stated, / class="ty-[a-z]+ (?:fl-[a-z]+|sq)[^"]*" data-ticket=/, `${ws}: the state wheel paints no ticket by type`);
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
      // TASK-0176: every link the fixture records between two tickets is on the page, both ways round.
      for (const [id, t] of Object.entries(fixtureModel.tickets)) {
        for (const other of t.links ?? []) {
          if (other === id || fixtureModel.tickets[other] === undefined) continue;
          assert.ok(w.links[id]?.includes(other), `${ws}: ${id} links to ${other} on the page`);
          assert.ok(w.links[other]?.includes(id), `${ws}: ${other} links back to ${id} on the page`);
        }
      }
      for (const [id, others] of Object.entries(w.links)) {
        assert.ok(!others.includes(id), `${ws}: ${id} does not link to itself`);
        for (const other of others) assert.ok(fixtureModel.tickets[id].links?.includes(other) || fixtureModel.tickets[other].links?.includes(id), `${ws}: the page's link ${id}–${other} is in the fixture`);
      }
      // TASK-0177: each ticket's ninth column is why it needs you, as the fixture says.
      const rowsById = new Map([...w.ring.flatMap((p) => [...p.tiles, ...p.towers.flatMap((t) => [t.f, ...t.floors])]), ...w.shelf.flatMap((p) => p.tickets), ...w.core].map((r) => [r[0], r]));
      for (const [id, t] of Object.entries(fixtureModel.tickets)) assert.equal(rowsById.get(id)[8], t.needsYou ? t.needs?.reason ?? '' : '', `${ws}: ${id}'s reason on the page`);
      assert.equal(w.dataDate, String(fixtureModel.generated).slice(0, 10), `${ws}: the data's date is the fixture's`);
      // Grouped by feature: every ticket once; the ring is the unfinished features, the shelf the finished ones.
      const bf = w.byFeature;
      const grouped = [...bf.ring.flatMap((f) => [f.id, ...f.floors]), ...bf.shelf.flatMap((f) => f.tickets), ...bf.core];
      assert.equal(new Set(grouped).size, grouped.length, `${ws}: no ticket twice grouped by feature`);
      assert.deepEqual(new Set(grouped), new Set(Object.keys(fixtureModel.tickets)), `${ws}: grouped by feature, every ticket is there`);
      const features = Object.entries(fixtureModel.tickets).filter(([, t]) => t.type === 'feature');
      assert.deepEqual(bf.ring.map((f) => f.id).sort(), features.filter(([, t]) => t.state !== 'closed' && t.state !== 'dropped').map(([id]) => id).sort(), `${ws}: the ring is the unfinished features`);
      assert.ok(bf.ring.every((f) => f.floors.every((id) => fixtureModel.tickets[id].type !== 'feature')) && bf.shelf.every((f) => f.tickets.slice(1).every((id) => fixtureModel.tickets[id].type !== 'feature')), `${ws}: a feature is never a floor of another`);
      // A feature's tower on the phase ring holds the same tickets as its segment grouped by feature.
      const segment = new Map(bf.ring.map((f) => [f.id, new Set(f.floors)]));
      for (const t of w.ring.flatMap((p) => p.towers)) {
        if (segment.has(t.f[0])) for (const r of t.floors) assert.ok(segment.get(t.f[0]).has(r[0]), `${ws}: ${r[0]} stands in ${t.f[0]}'s tower and in its segment`);
      }
      // What needs you, by reason: the fixture's tickets that need you, each under its reason, by id.
      const reasons = ['failed', 'review', 'triage', 'ready', 'waiting'];
      assert.deepEqual(Object.keys(w.needs), reasons, `${ws}: the reasons, the most urgent first`);
      const byId = (a, b) => a.localeCompare(b, 'en', { numeric: true });
      for (const k of reasons) assert.deepEqual(w.needs[k], Object.entries(fixtureModel.tickets).filter(([, t]) => t.needsYou && (reasons.includes(t.needs?.reason) ? t.needs.reason : 'waiting') === k).map(([id]) => id).sort(byId), `${ws}: the tickets ${k}`);
      // The rest needs the notes' dates.
      if (w.notesFrom !== 'none') {
        const DAY = 86400000;
        const updated = (id) => w.notes[id]?.[2] ?? '';
        const members = new Map([...bf.ring.map((f) => [f.id, f.floors]), ...bf.shelf.map((f) => [f.id, f.tickets.slice(1)])]);
        for (const [f, list] of members) {
          const newest = [f, ...list].map(updated).reduce((a, b) => (b > a ? b : a), '');
          assert.equal(w.ages[f], newest === '' ? undefined : Math.round((Date.parse(w.dataDate) - Date.parse(newest)) / DAY), `${ws}: ${f} quiet for the days since its newest change`);
        }
        assert.deepEqual(w.badged, bf.ring.map((f) => f.id).filter((f) => w.ages[f] >= 14), `${ws}: an unfinished feature quiet for 14 days or more, and only those, carries a badge`);
        const closed = Object.entries(fixtureModel.tickets).filter(([, t]) => t.state === 'closed').map(([id]) => id);
        const inYear = closed.filter((id) => updated(id).startsWith(w.weeks.year));
        assert.equal(w.weeks.closed.flat().length, inYear.length, `${ws}: every ticket closed in the year is in a week`);
        assert.equal(w.weeks.undated, closed.filter((id) => updated(id) === '').length, `${ws}: closed tickets with no date are counted apart`);
        for (const id of inYear.slice(0, 50)) {
          const week = Math.min(51, Math.floor((Date.parse(updated(id)) - Date.parse(`${w.weeks.year}-01-01`)) / DAY / 7));
          assert.ok(w.weeks.closed[week].includes(id), `${ws}: ${id}, updated ${updated(id)}, is in week ${week + 1}`);
        }
        // Each picture's date is its last commit at the fixture's commit, where this clone has it.
        // Deck's pictures each have one commit, so first and last agree there; your-trainer's
        // tell a first-commit date from a last one, when its checkout is beside this one.
        const root = ws === 'deck' ? path.join(desktopRoot, '..') : path.join(desktopRoot, '..', '..', 'your-trainer');
        if (root !== null && spawnSync('git', ['-C', root, 'cat-file', '-e', `${fixtureModel.head}^{commit}`]).status === 0) {
          for (const e of w.evidence) assert.equal(e.date, spawnSync('git', ['-C', root, 'log', '-1', '--format=%cs', fixtureModel.head, '--', e.path], { encoding: 'utf-8' }).stdout.trim(), `${ws}: ${e.path} is dated by its last commit`);
        }
      }
      // The ring of recent evidence: tickets of the fixture, newest first, at most three each and eighteen in all, each file there.
      assert.ok(w.evidence.length <= 18, `${ws}: at most eighteen pictures`);
      assert.ok(w.evidence.every((e) => fixtureModel.tickets[e.id] !== undefined), `${ws}: each picture belongs to a ticket`);
      assert.ok(w.evidence.every((e, i) => i === 0 || w.evidence[i - 1].date >= e.date), `${ws}: newest first`);
      const per = new Map();
      for (const e of w.evidence) per.set(e.id, (per.get(e.id) ?? 0) + 1);
      assert.ok([...per.values()].every((n) => n <= 3), `${ws}: at most three pictures for one ticket`);
      assert.ok(w.evidence.every((e) => fs.existsSync(path.join(out, e.src))), `${ws}: each picture's file is where the page looks`);
      // The notes are read from the workspace's checkout; CI has only Deck's, and without
      // your-trainer beside it every ticket lies flat and the page has no notes or board for it.
      if (w.notesFrom === 'none') {
        assert.deepEqual(w.notes, {}, `${ws}: no notes, so no paragraphs`);
        assert.deepEqual(w.evidence, [], `${ws}: no commit to read, so no pictures`);
        assert.equal(w.queue, null, `${ws}: no towers, so no board`);
        continue;
      }
      // Each ticket's note facts: a first paragraph for nearly all, an owner in a word, a date.
      const facts = Object.values(w.notes);
      assert.ok(facts.length >= Object.keys(fixtureModel.tickets).length * 0.98, `${ws}: the page has the notes of its tickets`);
      assert.ok(facts.filter(([lead]) => lead !== '').length >= facts.length * 0.95, `${ws}: nearly every note has a first paragraph on the page`);
      assert.ok(facts.every(([, , updated]) => updated === '' || /^\d{4}-\d{2}-\d{2}$/.test(updated)), `${ws}: dates are days`);
      assert.ok(facts.every(([, owner]) => !owner.includes(':')), `${ws}: an owner is shown as a name, not as user:edwin`);
      if (ws === 'deck') assert.ok(['Claude', 'Codex', 'Edwin'].every((who) => facts.some(([, owner]) => owner === who)), 'Deck\'s notes are owned by Claude, Codex and Edwin');
      // The next-up board: the focus feature's tasks, the next one lit, done ones closed, the rest open.
      if (w.queue !== null) {
        const tower = w.ring.flatMap((p) => p.towers).find((t) => t.f[0] === w.queue.feature);
        assert.ok(tower !== undefined && w.queue.feature === focusOfPage(w), `${ws}: the board is the focus feature's`);
        // A cancelled task is not counted; the rest are, done or not.
        const tasks = new Map(tower.floors.filter((r) => r[1] === 'task' && r[7] !== 'dropped').map((r) => [r[0], r]));
        assert.equal(w.queue.of, tasks.size, `${ws}: the board counts the feature's tasks, cancelled ones left out`);
        const closed = [...tasks.values()].filter((r) => r[7] === 'closed');
        assert.equal(w.queue.done, closed.length, `${ws}: the board counts the done ones`);
        // The lit row is the next ticket: one of the feature's tasks, or the task the snapshot names.
        assert.deepEqual(w.queue.rows.filter((r) => r.kind === 'next').map((r) => r.id), w.next === null ? [] : [w.next], `${ws}: the lit row is the next ticket`);
        if (w.next !== null) assert.ok(tasks.has(w.next) || w.next === w.focus.task, `${ws}: the next ticket ${w.next} is the feature's or the snapshot's`);
        // The two done rows are the two finished last, oldest first.
        const latest = closed.sort((a, b) => w.notes[b[0]][2].localeCompare(w.notes[a[0]][2]) || b[0].localeCompare(a[0], 'en', { numeric: true })).slice(0, 2).reverse().map((r) => r[0]);
        assert.deepEqual(w.queue.rows.filter((r) => r.kind === 'done').map((r) => r.id), latest, `${ws}: the done rows are the two finished last`);
        // The rest: each row's word is its status, in progress first, then at review, then waiting.
        const kindOf = (r) => (r[4] === 'doing' ? 'doing' : r[4] === 'review' ? 'review' : 'queued');
        const rest = w.queue.rows.filter((r) => r.kind !== 'done' && r.kind !== 'next');
        for (const r of rest) {
          assert.ok(tasks.has(r.id) && tasks.get(r.id)[7] !== 'closed', `${ws}: ${r.id} on the board is one of the feature's open tasks`);
          assert.equal(r.kind, kindOf(tasks.get(r.id)), `${ws}: ${r.id} is ${r.kind} on the board and ${tasks.get(r.id)[4]} in the fixture`);
        }
        const order = { doing: 0, review: 1, queued: 2 };
        assert.ok(rest.every((r, i) => i === 0 || order[rest[i - 1].kind] <= order[r.kind]), `${ws}: in progress first, then at review, then waiting`);
        // What is not shown is counted by kind, and nothing open is lost.
        const open = [...tasks.values()].filter((r) => r[7] !== 'closed' && r[0] !== w.next);
        for (const kind of ['doing', 'review', 'queued']) {
          assert.equal(rest.filter((r) => r.kind === kind).length + w.queue.more[kind], open.filter((r) => kindOf(r) === kind).length, `${ws}: every task ${kind} is on the board or counted under it`);
        }
        assert.equal(w.queue.head, String(fixtureModel.head).slice(0, 7), `${ws}: the board names the fixture's commit`);
      }
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

/** The focus feature the page names, which the next-up board must follow. */
const focusOfPage = (w) => w.focus.feature;

// TASK-0176: a selected ticket's pane shows its note's first paragraph, owner and date,
// read past what is not the note's own prose. Checked on small notes of its own.
test('the towers page reads a note\'s first paragraph, owner and date', async () => {
  const { relationsFrom, leadOf } = await import(path.join(desktopRoot, 'scripts', 'overview-towers-notes.mjs'));
  const note = (fm, body) => `---\n${fm.join('\n')}\n---\n${body}`;
  const { facts } = relationsFrom([
    note(['id: TASK-0001', 'owner: system:claude', 'updated: 2026-10-21'], '\n# Title\n\n> [!note] Accepted, 2026-10-11\n> "yes"\n\n**The point first.** A [[FEAT-0002-Some-Feature|feature]] and [[TASK-0003]] in `code`.\nIt goes on.\n\nA second paragraph.\n'),
    note(['id: TASK-0004', 'owner: "user:edwin"', 'updated: "2026-10-01T10:00Z"'], '\n# Only headings\n\n## And more\n'),
    note(['id: TASK-0005'], '\n<!-- a comment -->\n![a picture](x.png)\n\n```\ncode that is not prose\n```\n\nThe prose after the code, at [the site](https://example.com/a) and https://example.org/b.\n'),
  ]);
  assert.deepEqual(facts.get('TASK-0001'), { lead: 'The point first. A feature and TASK-0003 in code. It goes on.', owner: 'system:claude', updated: '2026-10-21' }, 'the callout is skipped, links read as their alias or id, the paragraph ends at the blank line');
  assert.deepEqual(facts.get('TASK-0004'), { lead: '', owner: 'user:edwin', updated: '2026-10-01' }, 'a note of headings only has no first paragraph; a quoted owner and a timestamp are read');
  assert.equal(facts.get('TASK-0005').lead, 'The prose after the code, at the site and example.org/b.', 'comments, pictures and code are not prose; an address loses its scheme');
  assert.equal(leadOf(`---\nid: X-1\n---\n${'word '.repeat(100)}`, 40).length, 40, 'a long paragraph is cut to the length asked');
  const lead = (body) => leadOf(`---\nid: X-1\n---\n${body}`);
  assert.equal(lead('\n- [x] GET the overview\n- [ ] Draw it\n'), 'GET the overview; Draw it', 'a checklist loses its boxes, its items joined');
  assert.equal(lead('\n1. Open Workouts.\n2) Pick one.\n'), 'Open Workouts. Pick one.', 'numbered steps lose their numbers; a full stop needs no semicolon');
  assert.equal(lead('\nReproducible by:\n\n1. Open it\n2. Close it\n\nNot this.\n'), 'Reproducible by: Open it; Close it', 'a paragraph ending in a colon takes the block after it, and no more');
  assert.equal(lead('\n> The rider sees their **zone**.\n'), 'The rider sees their zone.', 'a plain quote is prose');
  assert.equal(lead('\n> [!warning] Old\n> stamp\n\nThe prose.\n'), 'The prose.', 'a callout is not');
  assert.equal(lead('\n~~~\nnot prose\n~~~\nThe prose.\n'), 'The prose.', 'a tilde fence is code too');
});

// TASK-0177: which ticket a picture belongs to, on small notes and files of its own.
test('the ring of recent evidence ties each picture to a ticket and keeps the newest', async () => {
  const { evidenceFrom, lastDates } = await import(path.join(desktopRoot, 'scripts', 'overview-towers-notes.mjs'));
  // A picture's date is its last commit: git log lists the newest first.
  assert.deepEqual([...lastDates('\0' + '2026-10-15\ndocs/a.png\ndocs/n.md\n\n\0' + '2026-10-14\ndocs/a.png\ndocs/b.jpg\n')], [['docs/a.png', '2026-10-15'], ['docs/b.jpg', '2026-10-14']], 'the newest commit dates a picture; a note is not a picture');
  const note = (p, id, body = '') => ({ path: p, text: `---\nid: ${id}\n---\n${body}` });
  const notes = [
    note('docs/designs/DES-0001-A.md', 'DES-0001', '![a](__attachments__/plate.png) and [b](../tests/run%20one.jpg)'),
    note('docs/features/glass/FEAT-0002-Glass.md', 'FEAT-0002'),
    note('docs/issues/ISS-0003-x.md', 'ISS-0003', '![[shot.webp]]'),
  ];
  const tickets = new Set(['DES-0001', 'FEAT-0002', 'ISS-0003', 'TST-0004']);
  const img = (p, date) => ({ path: p, date });
  const got = evidenceFrom([
    img('docs/designs/__attachments__/plate.png', '2026-10-01'),
    img('docs/tests/run one.jpg', '2026-10-02'),
    img('docs/issues/evidence/shot.webp', '2026-10-03'),
    img('docs/tests/acceptance/gallery/tst-4-before.png', '2026-10-04'),
    img('docs/features/glass/evidence/a.png', '2026-10-05'),
    img('docs/features/glass/evidence/b.png', '2026-10-06'),
    img('docs/marketing/poster.png', '2026-10-07'),
    img('docs/designs/__attachments__/notes.txt', '2026-10-08'),
  ], notes, tickets, { perTicket: 1, limit: 10 });
  assert.deepEqual(got.map((e) => [e.id, e.path.split('/').pop()]), [
    ['FEAT-0002', 'b.png'], ['TST-0004', 'tst-4-before.png'], ['ISS-0003', 'shot.webp'], ['DES-0001', 'run one.jpg'],
  ], 'newest first; by the folder, by the name, by a wiki link and by a relative link; one per ticket; a picture of no ticket and a file that is not a picture left out');
  assert.equal(evidenceFrom([img('docs/designs/__attachments__/plate.png', '2026-10-01')], notes, tickets)[0].id, 'DES-0001', 'the linking note wins');
  // Review of TASK-0177: the note that names a picture wins over a ticket its file name
  // names and over a feature's folder; the evidence: field counts, written from the
  // workspace or from the note; a wiki link by name only when the name is unique; a lone %
  // in a link does not stop the run.
  const more = [
    note('docs/tests/TST-0004-t.md', 'TST-0004', ''),
    { path: 'docs/tests/TST-0005-u.md', text: '---\nid: TST-0005\nevidence:\n  - "../features/glass/evidence/run.png"\n  - docs/issues/evidence/iss-3-shot.png\n---\n![bad](100%.png) [s](<shots/my shot.png>)' },
    note('docs/designs/DES-0001-A.md', 'DES-0001', '![[dup.png]] ![[__attachments__/deep.png]]'),
    note('docs/features/glass/FEAT-0002-Glass.md', 'FEAT-0002'),
  ];
  const owners = evidenceFrom([
    img('docs/features/glass/evidence/run.png', '2026-10-09'),
    img('docs/issues/evidence/iss-3-shot.png', '2026-10-08'),
    img('docs/tests/shots/my shot.png', '2026-10-07'),
    img('docs/designs/a/dup.png', '2026-10-06'),
    img('docs/designs/b/dup.png', '2026-10-05'),
    img('docs/designs/__attachments__/deep.png', '2026-10-04'),
    img('docs/issues/evidence/deep.png', '2026-10-03'),
  ], more, new Set(['TST-0004', 'TST-0005', 'DES-0001', 'FEAT-0002', 'ISS-0003']), { perTicket: 9 });
  assert.deepEqual(owners.map((e) => [e.path.split('/').slice(-2).join('/'), e.id]), [
    ['evidence/run.png', 'TST-0005'], ['evidence/iss-3-shot.png', 'TST-0005'], ['shots/my shot.png', 'TST-0005'], ['__attachments__/deep.png', 'DES-0001'],
  ], 'the evidence: field and links win over the folder and the name; a name two pictures share claims neither; a wiki path claims only its own file');
});

// TASK-0176, review round two: the board's rules on rows of its own, because neither
// fixture's focus feature has a task at review, and CI has only Deck's, whose board has
// nothing in progress, nothing cancelled and nothing without room.
test('the next-up board orders, names and counts a feature\'s tasks', async () => {
  const { boardOf, ownerWord } = await import(path.join(desktopRoot, 'scripts', 'overview-towers-notes.mjs'));
  const t = (id, status, state) => [id, 'task', 'open', 0, status, id, '', state];
  const tasks = [
    t('TASK-0001', 'done', 'closed'), t('TASK-0002', 'done', 'closed'), t('TASK-0003', 'done', 'closed'),
    t('TASK-0004', 'cancelled', 'dropped'),
    t('TASK-0005', 'backlog', 'open'), t('TASK-0006', 'review', 'progress'), t('TASK-0007', 'doing', 'progress'),
    t('TASK-0008', 'doing', 'progress'), t('TASK-0009', 'backlog', 'open'), t('TASK-0010', 'planned', 'open'),
  ];
  const updated = { 'TASK-0001': '2026-10-20', 'TASK-0002': '2026-10-01', 'TASK-0003': '2026-10-21' };
  const board = boardOf(tasks, 'TASK-0008', (id) => updated[id], 3);
  assert.deepEqual(board.rows, [
    { id: 'TASK-0001', kind: 'done' }, { id: 'TASK-0003', kind: 'done' },
    { id: 'TASK-0008', kind: 'next' },
    { id: 'TASK-0007', kind: 'doing' }, { id: 'TASK-0006', kind: 'review' }, { id: 'TASK-0005', kind: 'queued' },
  ], 'the two finished last, oldest first; the next; then in progress, at review, waiting');
  assert.deepEqual(board.more, { doing: 0, review: 0, queued: 2 }, 'what has no room is counted by kind');
  assert.deepEqual([board.done, board.of], [3, 9], 'a cancelled task is not counted');
  assert.deepEqual(boardOf(tasks, null, () => '', 1).more, { doing: 1, review: 1, queued: 3 }, 'without a next ticket, it waits with the rest');
  assert.deepEqual(['system:claude', 'user:edwin', 'agent', 'team:ios', 'group:maintainers', 'unassigned', ''].map(ownerWord), ['Claude', 'Edwin', 'Agent', 'ios team', 'maintainers group', '', ''], 'owners in words');
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
