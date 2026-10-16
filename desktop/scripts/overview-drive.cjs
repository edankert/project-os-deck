// TST-0093 — every overview screen opens from its address in a real window
// (PHASE-0005, TASK-0131). Run from desktop/ after `npm run build`:
//   npx electron . --drive scripts/overview-drive.cjs --drive-out dist/overview-drive [--workspace <repo>]
// It opens windows, so it is run on request and never by the pre-push hook.
const assert = require('node:assert/strict');

module.exports = async (d) => {
  const ws = d.prepared.id;
  const base = `deck://${ws}/features`;
  const win = await d.open(base, { width: 1440, height: 960 });
  const js = (code) => d.js(win, code);
  const settle = async () => {
    for (let i = 0; i < 40; i += 1) {
      if (await js('Boolean(window.__deckOverview && window.__deckOverview.current())')) break;
      await d.delay(250);
    }
    await d.delay(900);
  };
  // An address with no page goes to the view; Deck opens on the wheel only when no
  // address is given, so the first screen is asked for by its address.
  await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
  await settle();
  const screens = await js('window.__deckOverview.screens()');
  d.log('screens registered', screens);
  const model = await (await fetch(`${d.origin}/deck/overview/${ws}`)).json();
  d.log('model', { tickets: Object.keys(model.tickets).length, phases: model.phases.length, shelf: model.shelf.length, backlog: model.backlog.length, core: model.core.tickets.length });

  // The phase with the most tickets: where rows are most likely to spill off the plane (TASK-0147).
  const phase = [...model.phases, ...model.shelf].sort((a, b) => b.tickets.length - a.tickets.length)[0]?.id;
  const linked = Object.values(model.tickets).sort((a, b) => b.links.length - a.links.length)[0];
  const design = Object.values(model.tickets).find((t) => t.id.startsWith('DES-') && t.status === 'proposed') ?? Object.values(model.tickets).find((t) => t.id.startsWith('DES-'));
  const feature = Object.values(model.tickets).find((t) => t.kind === 'feat' && t.status === 'review') ?? Object.values(model.tickets).find((t) => t.kind === 'feat');
  const wanted = [
    ['wheel', `${base}?page=wheel`],
    ['phase', phase ? `${base}?note=${encodeURIComponent(phase)}&page=phase` : null],
    ['ticket', linked ? `${base}?note=${encodeURIComponent(linked.id)}&page=ticket` : null],
    ['rephase', `${base}?page=rephase`],
    ['design', design ? `${base}?note=${encodeURIComponent(design.id)}&flow=design` : null],
    ['test-run', `${base}?flow=test-run&step=android`],
    ['accept', feature ? `${base}?note=${encodeURIComponent(feature.id)}&flow=accept` : null],
  ];
  const results = [];
  for (const [screen, address] of wanted) {
    const kind = ['design', 'test-run', 'accept'].includes(screen) ? 'flows' : 'pages';
    // Every screen must be registered: a missing one fails the run, it is never skipped.
    assert.ok(screens[kind].includes(screen), `${screen} is not registered as a ${kind === 'flows' ? 'flow' : 'page'}`);
    if (address === null) {
      d.log(`skipped ${screen}`, { reason: 'this workspace has nothing to open it on' });
      results.push({ screen, skipped: true });
      continue;
    }
    await js(`window.__deckOverview.go(${JSON.stringify(address)})`);
    await settle();
    const seen = await js(`(() => {
      const scene = window.__deckOverview.current();
      // A ticket is drawn by a mark, or by a row of a panel built as HTML (TASK-0147, TASK-0148).
      const walk = (ns, out) => { for (const n of ns) { if (n.kind === 'group') walk(n.children, out); else if (n.kind === 'mark' && n.ticket) out.push(n.ticket); else if (n.kind === 'panel' && n.body.kind === 'rows') for (const s of n.body.sections) for (const r of s.rows) out.push(r.id); } return out; };
      return { screen: scene.screen, address: scene.address, sceneMarks: walk(scene.nodes, []).length,
        domMarks: document.querySelectorAll('#overview-area [data-ticket]').length,
        rows: scene.list.length, shown: !document.getElementById('overview-area').hidden, overview: document.body.dataset.overviewScreen };
    })()`);
    assert.equal(seen.shown, true, `${screen}: the overview layer is shown`);
    assert.equal(seen.screen, screen, `${screen}: the scene drawn is the one asked for`);
    assert.equal(seen.domMarks, seen.sceneMarks, `${screen}: every mark in the scene is in the window`);
    if (screen === 'phase') {
      // The tickets stand on a tilted plane, what needs you in front, closed work folded (TASK-0147).
      const plane = await js(`(() => {
        const p = document.querySelector('#overview-area .ov-panel-rows.is-tilted .ov-plane');
        if (!p) return null;
        const closed = p.querySelector('.ov-sec[data-section="closed"]');
        const rows = [...p.querySelectorAll('.ov-row')].filter((r) => r.offsetParent !== null);
        const box = p.getBoundingClientRect();
        return { transform: getComputedStyle(p).transform, closedFolded: closed ? closed.classList.contains('is-folded') : null,
          visibleRows: rows.length, insidePlane: rows.every((r) => { const b = r.getBoundingClientRect(); return b.left >= box.left - 2 && b.right <= box.right + 2; }) };
      })()`);
      d.log('the phase plane', plane);
      assert.ok(plane !== null, 'S2 builds its tickets as a tilted panel');
      assert.notEqual(plane.transform, 'none', 'S2: the plane is tilted in 3D');
      assert.ok(plane.closedFolded !== false, 'S2: closed work starts folded');
      assert.ok(plane.insidePlane, 'S2: no row stands outside the plane');
    }
    if (screen === 'ticket') {
      // The ticket's text arrives from the sidecar, as the reader shows it (TASK-0148).
      let text = '';
      for (let i = 0; i < 40; i += 1) {
        text = await js(`(document.querySelector('#overview-area .ov-note') || {}).textContent || ''`);
        if (text !== '' && !text.startsWith('reading the note')) break;
        await d.delay(250);
      }
      d.log('the ticket text', { length: text.length, start: text.slice(0, 80) });
      assert.ok(text.length > 40 && !text.startsWith('reading the note') && !text.startsWith("the note's text could not"), `S3: the ticket's text is shown, not "${text.slice(0, 60)}"`);
    }
    await d.shot(win, `${screen}`);
    d.log(`opened ${screen}`, seen);
    results.push(seen);
  }

  // Back and forward retrace the screens just visited (TASK-0146): the buttons, then ⌘[ and ⌘].
  const trailBefore = await js('window.__deckOverview.trail()');
  const shownAt = async () => js('window.__deckOverview.current().address');
  // A press is not awaited the way an address is, and a heavy screen (your-trainer's release
  // test draws 1,388 beads after a sidecar read) takes longer than settle's pause: wait for it.
  const arrives = async (address) => {
    for (let i = 0; i < 60 && (await shownAt()) !== address; i += 1) await d.delay(250);
    await d.delay(300);
    return shownAt();
  };
  assert.equal(await shownAt(), trailBefore.entries[trailBefore.at], 'the trail points at the screen shown');
  await js("document.getElementById('ov-back').click()");
  assert.equal(await arrives(trailBefore.entries[trailBefore.at - 1]), trailBefore.entries[trailBefore.at - 1], '← shows the screen before');
  const enabled = await js("({ back: !document.getElementById('ov-back').disabled, forward: !document.getElementById('ov-forward').disabled, shown: !document.getElementById('ov-history').hidden })");
  assert.deepEqual(enabled, { back: true, forward: true, shown: true }, 'after one step back both buttons are live');
  await js("document.getElementById('ov-forward').click()");
  assert.equal(await arrives(trailBefore.entries[trailBefore.at]), trailBefore.entries[trailBefore.at], '→ returns to the screen after');
  d.press(win, '[', ['meta']);
  const keyBack = await arrives(trailBefore.entries[trailBefore.at - 1]);
  d.press(win, ']', ['meta']);
  const keyForward = await arrives(trailBefore.entries[trailBefore.at]);
  d.log('back and forward', { from: trailBefore.entries[trailBefore.at], keyBack, keyForward });
  assert.equal(keyBack, trailBefore.entries[trailBefore.at - 1], '⌘[ goes back');
  assert.equal(keyForward, trailBefore.entries[trailBefore.at], '⌘] goes forward');

  // What needs you says what to do (TASK-0158): a ticket that needs you opens with its
  // banner and a button; and S7 shows the feature's text beside its gate (TASK-0159).
  {
    const needing = Object.values(model.tickets).find((t) => t.needs !== undefined && 'parts' in t.needs.action);
    if (needing !== undefined) {
      await js(`window.__deckOverview.go(${JSON.stringify(`${base}?note=${encodeURIComponent(needing.id)}&page=ticket`)})`);
      await settle();
      const banner = await js(`(() => { const b = document.querySelector('#overview-area [data-mark="needs"]'); const go = document.querySelector('#overview-area [data-key="needs-go"]'); return { banner: b !== null, label: b ? b.getAttribute('data-label') : null, go: go ? go.getAttribute('data-target') : null }; })()`);
      d.log('the needs-you banner', { id: needing.id, ...banner });
      assert.ok(banner.banner && banner.label.includes(needing.needs.say), `${needing.id}: the banner says "${needing.needs.say}"`);
      assert.ok(banner.go !== null, `${needing.id}: the banner has a button to where you act`);
    }
    if (feature !== undefined) {
      await js(`window.__deckOverview.go(${JSON.stringify(`${base}?note=${encodeURIComponent(feature.id)}&flow=accept`)})`);
      await settle();
      let text = '';
      for (let i = 0; i < 40; i += 1) {
        text = await js(`(document.querySelector('#overview-area .ov-note') || {}).textContent || ''`);
        if (text !== '' && !text.startsWith('reading the note')) break;
        await d.delay(250);
      }
      const arch = await js(`document.querySelectorAll('#overview-area [data-key^="gate-${feature.id}-"]').length`);
      d.log('the feature gate', { id: feature.id, text: text.length, arch });
      assert.ok(text.length > 40 && !text.startsWith("the note's text could not"), `S7 shows ${feature.id}'s text`);
      assert.equal(arch, 5, 'S7 draws the gate as the arch of five parts');
      await d.shot(win, 'accept-with-text');
    }
  }

  // The camera (TASK-0156): the wheel leans back; the middle button turns it, Shift pans,
  // the scroll wheel zooms, 0 puts it back, and a ticket can still be pressed on the tilt.
  // TASK-0162: a drag to the right turns it anticlockwise, so the near edge follows the
  // hand, and Home shows only while the camera is moved.
  {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const centre = await js(`(() => { const r = document.querySelector('#overview-area .ov-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    const cam = () => js('window.__deckOverview.camera()');
    const start = await cam();
    assert.ok(start.tilt > 0, 'the wheel opens leaning back');
    await d.pointer(win, d.drag(centre, { x: centre.x + 120, y: centre.y - 60 }, 8, 16, { button: 'middle' }));
    const turnedTo = await cam();
    assert.ok(turnedTo.spin < -10 && turnedTo.tilt > start.tilt, `a middle-button drag to the right turns the wheel's near edge right and tilts it (${JSON.stringify(turnedTo)})`);
    await d.pointer(win, d.drag(centre, { x: centre.x + 40, y: centre.y + 30 }, 6, 16, { button: 'middle', shift: true }));
    const pannedTo = await cam();
    assert.ok(pannedTo.panX > 20 && pannedTo.panY > 10, `Shift with the middle button pans (${JSON.stringify(pannedTo)})`);
    d.wheel(win, centre.x, centre.y, -300);
    await d.delay(300);
    const zoomedTo = await cam();
    assert.ok(zoomedTo.zoom > 1.2, `the scroll wheel zooms in (${JSON.stringify(zoomedTo)})`);
    await d.shot(win, 'wheel-turned');
    const homeShown = () => js(`(() => { const b = document.querySelector('#overview-area .ov-camera-home'); return b !== null && !b.hidden && b.getBoundingClientRect().width > 0; })()`);
    assert.ok(await homeShown(), 'Home shows once the camera has moved');
    d.press(win, '0');
    await d.delay(500);
    const reset = await cam();
    assert.deepEqual([reset.spin, reset.panX, reset.panY, reset.zoom, reset.tilt], [0, 0, 0, 1, start.tilt], '0 puts the camera back');
    assert.ok(!(await homeShown()), 'Home hides once the camera is back');
    // A press on a particle of the tilted wheel still opens its ticket.
    const particle = await js(`(() => { const e = document.querySelector('#overview-area [data-key^="sector-"] [data-ticket]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: e.getAttribute('data-ticket') }; })()`);
    assert.ok(particle !== null, 'the wheel draws particles');
    await d.pointer(win, d.click(particle));
    for (let i = 0; i < 40 && (await js('document.body.dataset.overviewScreen')) !== 'ticket'; i += 1) await d.delay(250);
    const opened = await js('window.__deckOverview.current().address');
    d.log('the camera', { start, turnedTo, pannedTo, zoomedTo, reset, pressed: particle.id, opened });
    // A phase turned too: its plane of rows stands on the turned board (TASK-0161's picture).
    if (phase) {
      await js(`window.__deckOverview.go(${JSON.stringify(`${base}?note=${encodeURIComponent(phase)}&page=phase`)})`);
      await settle();
      await d.pointer(win, d.drag(centre, { x: centre.x - 90, y: centre.y - 50 }, 8, 16, { button: 'middle' }));
      d.wheel(win, centre.x, centre.y, -200);
      await d.delay(400);
      await d.shot(win, 'phase-turned');
      d.press(win, '0');
      await d.delay(200);
    }
    assert.ok(opened.includes(`note=${encodeURIComponent(particle.id)}`), `a press on ${particle.id} on the tilted wheel opens it, not ${opened}`);
  }

  // TASK-0162, after review: the three views, the Home key, Escape on a moved camera and on
  // an unmoved one, the pan limit, and Home following the screen that is open.
  {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const cam = () => js('window.__deckOverview.camera()');
    const homeShown = () => js(`(() => { const b = document.querySelector('#overview-area .ov-camera-home'); return b !== null && !b.hidden && b.getBoundingClientRect().width > 0; })()`);
    const press = async (selector) => {
      const at = await js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      assert.ok(at !== null, `${selector} is drawn`);
      await d.pointer(win, d.click(at));
      await d.delay(500);
    };
    const start = await cam();
    assert.ok(!(await homeShown()), 'Home is hidden on a wheel that has not moved');
    assert.ok(await js(`(() => { const b = document.querySelector('#overview-area .ov-camera-bar'); return b !== null && !b.hidden && b.querySelectorAll('[data-view]').length === 3; })()`), 'the three views are shown on the wheel as it opens');
    await press('#overview-area .ov-camera-bar [data-view="above"]');
    assert.equal((await cam()).tilt, 0, 'From above lays the wheel flat');
    await press('#overview-area .ov-camera-bar [data-view="side"]');
    assert.ok((await cam()).tilt >= 64, `From the side is nearly edge on (${(await cam()).tilt})`);
    assert.ok(await homeShown(), 'Home shows once a view has moved the camera');
    d.press(win, 'Home');
    await d.delay(500);
    assert.deepEqual([(await cam()).tilt, (await cam()).spin], [start.tilt, 0], 'the Home key puts the camera back');
    // The pan stops where the picture's centre would leave the stage.
    const stageBox = await js(`(() => { const r = document.querySelector('#overview-area .ov-stage').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    const mid = { x: stageBox.x + stageBox.w / 2, y: stageBox.y + stageBox.h / 2 };
    for (let i = 0; i < 4; i += 1) await d.pointer(win, d.drag(mid, { x: mid.x + stageBox.w * 0.45, y: mid.y + stageBox.h * 0.45 }, 6, 12, { button: 'middle', shift: true }));
    const far = await cam();
    assert.ok(Math.abs(far.panX) <= stageBox.w / 2 + 1 && Math.abs(far.panY) <= stageBox.h / 2 + 1, `the pan stops at the stage's edge (${JSON.stringify(far)})`);
    // Escape on a moved camera brings it home and stays on the wheel.
    d.press(win, 'Escape');
    await d.delay(500);
    assert.equal(await js('document.body.dataset.overviewScreen'), 'wheel', 'Escape on a moved camera stays on the wheel');
    assert.deepEqual([(await cam()).panX, (await cam()).panY], [0, 0], 'Escape on a moved camera brings it home');
    // Home follows the screen: moved on the wheel, a phase opens unmoved, and back on the wheel it is moved again.
    if (phase) {
      await d.pointer(win, d.drag(mid, { x: mid.x + 80, y: mid.y }, 6, 12, { button: 'middle' }));
      assert.ok(await homeShown(), 'Home shows on the moved wheel');
      await js(`window.__deckOverview.go(${JSON.stringify(`${base}?note=${encodeURIComponent(phase)}&page=phase`)})`);
      await settle();
      assert.ok(!(await homeShown()), 'a phase that has not moved opens with Home hidden, though the wheel was moved');
      // Escape on an unmoved screen still goes back.
      d.press(win, 'Escape');
      for (let i = 0; i < 20 && (await js('document.body.dataset.overviewScreen')) !== 'wheel'; i += 1) await d.delay(250);
      assert.equal(await js('document.body.dataset.overviewScreen'), 'wheel', 'Escape on an unmoved phase goes back to the wheel');
      assert.ok(await homeShown(), 'back on the moved wheel, Home shows again');
      d.press(win, '0');
      await d.delay(400);
    }
    d.log('the camera views and Home', { start, far });
  }

  // The wheel's two labelled ways in open re-phasing and the release test (TASK-0152).
  for (const [key, screen] of [['rephase-button', 'rephase'], ['release-test', 'test-run']]) {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const at = await js(`(() => { const e = document.querySelector('#overview-area [data-key="${key}"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    assert.ok(at !== null, `the wheel draws its ${key} button`);
    await d.pointer(win, d.click(at));
    for (let i = 0; i < 60 && (await js('document.body.dataset.overviewScreen')) !== screen; i += 1) await d.delay(250);
    const now = await js('document.body.dataset.overviewScreen');
    d.log(`pressed ${key}`, { at, now });
    assert.equal(now, screen, `the ${key} button opens ${screen}`);
  }

  // A click on a sector opens its phase, Escape returns, L opens the twin.
  await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
  await settle();
  const sector = await js(`(() => { const e = document.querySelector('#overview-area .ov-sector .ov-hit'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (sector !== null) {
    // The hit area's centre can fall in the wheel's hollow; aim at a wedge of the sector instead.
    const wedge = await js(`(() => { const e = document.querySelector('#overview-area .ov-sector path[data-ticket]:not(.ov-hit)'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    const at = wedge ?? sector;
    await d.pointer(win, d.click(at));
    await settle();
    const after = await js('document.body.dataset.overviewScreen');
    d.log('clicked the wheel', { at, now: after });
    assert.ok(after === 'phase' || after === 'ticket', `a click on the wheel opens a phase or a ticket, not ${after}`);
    // Escape goes back one screen: from a ticket to its phase (or the wheel), from a phase to the wheel.
    d.press(win, 'Escape');
    await settle();
    const back = await js('document.body.dataset.overviewScreen');
    d.log('pressed Escape', { now: back });
    assert.ok(after === 'ticket' ? back === 'phase' || back === 'wheel' : back === 'wheel', `Escape from ${after} went to ${back}`);
  }
  d.press(win, 'L');
  await d.delay(400);
  const twin = await js(`({ open: !document.querySelector('.ov-list').hidden, rows: document.querySelectorAll('.ov-list li').length, scene: window.__deckOverview.current().list.length })`);
  d.log('the list twin', twin);
  assert.equal(twin.open, true, 'L opens the list twin');
  assert.equal(twin.rows, twin.scene, 'the list twin holds every row of the scene');
  d.log('summary', results);

  // The served page, as a tablet loads it: no bridge, no writes. It opens on the
  // wheel too, and a flow's controls are drawn off.
  const served = d.openServedPage();
  await new Promise((resolve) => served.webContents.once('did-finish-load', resolve));
  // The served page follows the Mac's view; its Deck name opens the overview, read only.
  for (let i = 0; i < 60; i += 1) {
    if (await d.js(served, 'window.__deckReady === true')) break;
    await d.delay(250);
  }
  await d.delay(1500);
  assert.equal(await d.js(served, 'document.body.dataset.overviewScreen || ""'), '', 'the served page follows the Mac rather than opening on the wheel');
  await d.js(served, "document.getElementById('overview-toggle').click()");
  for (let i = 0; i < 60; i += 1) {
    if (await d.js(served, 'Boolean(window.__deckOverview && window.__deckOverview.current())')) break;
    await d.delay(250);
  }
  const tablet = await d.js(served, `({ screen: document.body.dataset.overviewScreen, marks: document.querySelectorAll('#overview-area [data-ticket]').length, write: document.querySelectorAll('#overview-area [data-action]:not(.ov-off)').length })`);
  d.log('the served page', tablet);
  assert.equal(tablet.screen, 'wheel', 'the served page opens on the wheel');
  assert.ok(tablet.marks > 0, 'the served wheel draws its tickets');
  assert.equal(tablet.write, 0, 'the served page offers no enabled control');
  await d.shot(served, 'served-wheel');
  served.close();
};
