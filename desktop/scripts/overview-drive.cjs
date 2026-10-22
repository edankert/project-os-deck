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
  // Every error the page logs, for TASK-0187's check that the towers' new parts raise none.
  const pageErrors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) pageErrors.push(String(message).slice(0, 300)); });
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
      const walk = (ns, out) => { for (const n of ns) { if (n.kind === 'group') walk(n.children, out); else if (n.kind === 'mark' && n.ticket) out.push(n.ticket); else if (n.kind === 'panel' && n.body.kind === 'rows') for (const s of n.body.sections) for (const r of s.rows) out.push(r.id); else if (n.kind === 'panel' && n.body.kind === 'needs') for (const r of n.body.rows) out.push(r.id); } return out; };
      return { screen: scene.screen, address: scene.address, sceneMarks: walk(scene.nodes, []).length,
        domMarks: document.querySelectorAll('#overview-area [data-ticket]').length,
        rows: scene.list.length, shown: !document.getElementById('overview-area').hidden, overview: document.body.dataset.overviewScreen };
    })()`);
    assert.equal(seen.shown, true, `${screen}: the overview layer is shown`);
    assert.equal(seen.screen, screen, `${screen}: the scene drawn is the one asked for`);
    assert.equal(seen.domMarks, seen.sceneMarks, `${screen}: every mark in the scene is in the window`);
    if (screen === 'wheel' || screen === 'phase') {
      // The towers are drawn in 3D (TASK-0167): the canvas is up, the flat plan hidden.
      const three = await js(`({ on: document.querySelector('#overview-area .ov-stage').classList.contains('ov-3d'), canvas: Boolean(document.querySelector('#overview-area canvas.ov-towers')), open: window.__deckOverview.towers()?.open() ?? null })`);
      d.log(`${screen} in 3D`, three);
      assert.equal(three.on, true, `${screen}: drawn in 3D`);
      assert.equal(three.canvas, true, `${screen}: the 3D canvas is in the window`);
      if (screen === 'phase') assert.equal(three.open, model.phases.concat(model.backlog).some((p) => p.id === phase) ? phase : null, 'S2 brings its phase close');
    }
    if (screen === 'phase') {
      // What needs you first, open; the feature in focus open; the other towers folded (TASK-0168).
      const list = await js(`(() => {
        const secs = [...document.querySelectorAll('#overview-area .ov-sec')];
        return secs.map((s) => ({ key: s.dataset.section, folded: s.classList.contains('is-folded') }));
      })()`);
      d.log('the phase list', list);
      assert.ok(list.length > 0, 'S2 lists its tickets');
      const needs = list.findIndex((s) => s.key === 'needs-you');
      if (needs >= 0) assert.equal(needs, 0, 'S2: what needs you comes first');
      assert.ok(list.filter((s) => String(s.key).startsWith('tower-')).every((s) => s.folded || list.indexOf(s) <= 1), 'S2: only the feature in focus is open among the towers');
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

  // The camera on the towers (TASK-0156, TASK-0162, TASK-0167): a middle-button drag to the
  // right turns the ring so its near edge follows the hand, the scroll wheel zooms, Home and
  // the views move it, 0 and Escape bring it home, and a ticket can still be pressed.
  {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const t3 = (code) => js(`window.__deckOverview.towers().${code}`);
    const cam = () => t3('camera()');
    const homeShown = () => js(`(() => { const b = document.querySelector('#overview-area .ov-camera-home'); return b !== null && !b.hidden && b.getBoundingClientRect().width > 0; })()`);
    const centre = await js(`(() => { const r = document.querySelector('#overview-area .ov-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; })()`);
    const start = await cam();
    assert.ok(!start.moved && !(await homeShown()), 'the wheel opens home, with Home hidden');
    await d.pointer(win, d.drag(centre, { x: centre.x + 120, y: centre.y - 40 }, 8, 16, { button: 'middle' }));
    const turnedTo = await cam();
    assert.ok(turnedTo.theta > start.theta + 0.2, `a middle-button drag to the right turns the ring so its near edge goes right (${JSON.stringify(turnedTo)})`);
    assert.ok(await homeShown(), 'Home shows once the camera has moved');
    d.wheel(win, centre.x, centre.y, -300);
    await d.delay(300);
    assert.ok((await cam()).radius < turnedTo.radius, 'the scroll wheel zooms in');
    await d.shot(win, 'wheel-turned');
    d.press(win, '0');
    await d.delay(900);
    assert.equal((await cam()).moved, false, '0 puts the camera back');
    assert.ok(!(await homeShown()), 'Home hides once the camera is back');
    // The three views, and the Home key.
    const pressAt = async (selector) => {
      const at = await js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      assert.ok(at !== null, `${selector} is drawn`);
      await d.pointer(win, d.click(at));
      await d.delay(800);
    };
    await pressAt('#overview-area .ov-camera-bar [data-view="above"]');
    assert.ok((await cam()).phi < 0.1, 'From above looks straight down');
    await pressAt('#overview-area .ov-camera-bar [data-view="side"]');
    assert.ok((await cam()).phi > 1.3, 'From the side is nearly edge on');
    await d.shot(win, 'wheel-side');
    d.press(win, 'Home');
    await d.delay(900);
    assert.equal((await cam()).moved, false, 'the Home key puts the camera back');
    // A pan stops before the picture is lost.
    for (let i = 0; i < 4; i += 1) await d.pointer(win, d.drag(centre, { x: centre.x + centre.w * 0.45, y: centre.y + centre.h * 0.45 }, 6, 12, { button: 'middle', shift: true }));
    const far = await cam();
    assert.ok(far.reach <= far.limit + 0.01, `the pan stops at the ring's edge (${JSON.stringify(far)})`);
    // Escape on a moved camera brings it home and stays on the wheel.
    d.press(win, 'Escape');
    await d.delay(900);
    assert.equal(await js('document.body.dataset.overviewScreen'), 'wheel', 'Escape on a moved camera stays on the wheel');
    assert.equal((await cam()).moved, false, 'Escape on a moved camera brings it home');
    // A press on a ticket selects it where it stands (TASK-0182), and its card's Open opens it:
    // the next ticket when nothing stands in front of it from where the camera starts, else the
    // first ticket of the ring that is in plain sight.
    const layout = await js(`window.__deckOverview.current().nodes.find((n) => n.kind === 'towers').layout`);
    const standing = layout.phases.flatMap((p) => [...p.towers.flatMap((tw) => tw.cubes), ...p.tiles]).map((c) => c.id);
    let next = null;
    let at = null;
    for (const id of [model.next, ...standing].filter(Boolean).slice(0, 400)) {
      const p = await t3(`screenOf(${JSON.stringify(id)})`);
      if (p !== null && (await t3(`hit(${p.x}, ${p.y})`)) === id) { next = id; at = p; break; }
    }
    assert.ok(next !== null, 'some ticket on the ring is in plain sight from where the camera starts');
    await d.pointer(win, d.click(at));
    for (let i = 0; i < 40 && !(await js('window.__deckOverview.current().address')).includes(`select=${encodeURIComponent(next)}`); i += 1) await d.delay(250);
    const selected = await js('window.__deckOverview.current().address');
    assert.ok(selected.includes(`page=wheel`) && selected.includes(`select=${encodeURIComponent(next)}`), `a press on ${next} selects it on the ring, not ${selected}`);
    await d.delay(600);
    await js(`document.querySelector('#overview-area .ov-panel-card button[data-target*="page=ticket"]').click()`);
    for (let i = 0; i < 40 && (await js('document.body.dataset.overviewScreen')) !== 'ticket'; i += 1) await d.delay(250);
    const opened = await js('window.__deckOverview.current().address');
    d.log('the camera', { start, turnedTo, far, pressed: next, selected, opened });
    assert.ok(opened.includes(`note=${encodeURIComponent(next)}`) && opened.includes('page=ticket'), `its card's Open opens ${next}, not ${opened}`);
  }

  // A red cap opens what needs you in its tower (TASK-0164): one ticket, or the phase.
  {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const layout = await js(`window.__deckOverview.current().nodes.find((n) => n.kind === 'towers').layout`);
    let pressed = null;
    for (const p of layout.phases) for (const tower of p.towers) {
      if (pressed !== null || tower.cap === null) continue;
      const at = await js(`window.__deckOverview.towers().capOf(${JSON.stringify(tower.feature)})`);
      if (at === null || (await js(`window.__deckOverview.towers().hit(${at.x}, ${at.y})`)) !== 'cap') continue;
      await d.pointer(win, d.click(at));
      pressed = { feature: tower.feature, target: tower.cap.target };
    }
    assert.ok(pressed !== null, 'some red cap can be pressed from where the wheel starts');
    for (let i = 0; i < 40 && (await js('window.__deckOverview.current().address')) !== pressed.target; i += 1) await d.delay(250);
    assert.equal(await js('window.__deckOverview.current().address'), pressed.target, `the cap of ${pressed.feature} opens ${pressed.target}`);
    d.log('pressed a cap', pressed);
  }

  // The wheel's two labelled ways in open re-phasing and the release test (TASK-0152).
  for (const [key, screen] of [['rephase-button', 'rephase'], ['release-test', 'test-run']]) {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    // The core's middle is drawn by the 3D view; the release test stays a button of the scene.
    const at = key === 'rephase-button'
      ? await js('window.__deckOverview.towers().coreAt()')
      : await js(`(() => { const e = document.querySelector('#overview-area [data-key="${key}"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    assert.ok(at !== null, `the wheel draws its ${key} button`);
    await d.pointer(win, d.click(at));
    for (let i = 0; i < 60 && (await js('document.body.dataset.overviewScreen')) !== screen; i += 1) await d.delay(250);
    const now = await js('document.body.dataset.overviewScreen');
    d.log(`pressed ${key}`, { at, now });
    assert.equal(now, screen, `the ${key} button opens ${screen}`);
  }

  // A press on a phase's plinth brings it close, Escape returns to the ring, L opens the twin.
  await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
  await settle();
  {
    const ring = model.phases.concat(model.backlog);
    let target = null;
    for (const p of ring) {
      const at = await js(`window.__deckOverview.towers().phaseAt(${JSON.stringify(p.id)})`);
      if (at !== null && (await js(`window.__deckOverview.towers().hit(${at.x}, ${at.y})`)) === 'phase') { target = { id: p.id, at }; break; }
    }
    assert.ok(target !== null, 'some phase can be pressed on its plinth');
    await d.pointer(win, d.click(target.at));
    await settle();
    const after = await js('document.body.dataset.overviewScreen');
    d.log('pressed a plinth', { phase: target.id, now: after, open: await js('window.__deckOverview.towers()?.open() ?? null') });
    assert.equal(after, 'phase', `a press on ${target.id}'s plinth opens it`);
    assert.equal(await js('window.__deckOverview.towers().open()'), target.id, `${target.id} is brought close`);
    await d.shot(win, 'phase-close');
    d.press(win, 'Escape');
    await settle();
    assert.equal(await js('document.body.dataset.overviewScreen'), 'wheel', 'Escape from the phase goes back to the ring');
    assert.equal(await js('window.__deckOverview.towers().open()'), null, 'and the ring is whole again');
  }
  d.press(win, 'L');
  await d.delay(400);
  const twin = await js(`({ open: !document.querySelector('.ov-list').hidden, rows: document.querySelectorAll('.ov-list li').length, scene: window.__deckOverview.current().list.length })`);
  d.log('the list twin', twin);
  assert.equal(twin.open, true, 'L opens the list twin');
  assert.equal(twin.rows, twin.scene, 'the list twin holds every row of the scene');
  d.log('summary', results);

  // FEAT-0031 (TASK-0187): the towers' Rubric ideas in the same window. A ticket selected
  // draws its curves and its card; a search lights its matches; the ring groups by feature
  // and back; a picture loads through the host; and the page logged no error throughout.
  {
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    const pick = Object.values(model.tickets).sort((a, b) => b.links.length - a.links.length)[0].id;
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel&select=${encodeURIComponent(pick)}`)})`);
    await settle();
    const sel = await js('({ selected: window.__deckOverview.towers().selected(), card: Boolean(document.querySelector("#overview-area .ov-panel-card")), pane: document.querySelectorAll("#overview-area .ov-panel-rows .ov-row").length })');
    d.log('a ticket selected', { pick, ...sel });
    assert.ok(sel.selected !== null && sel.selected.id === pick && sel.selected.curves > 0 && sel.card && sel.pane > 0, `${pick} selected draws its curves, its card and its pane`);
    await d.shot(win, 'towers-selected');
    await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel`)})`);
    await settle();
    d.press(win, '/');
    await d.delay(200);
    const word = Object.values(model.tickets).map((x) => x.title.split(/\s+/).find((w) => /^[A-Za-z]{5,}$/.test(w))).find(Boolean) ?? 'the';
    await win.webContents.insertText(word);
    await d.delay(900);
    const lit = await js('({ box: window.__deckOverview.search(), found: window.__deckOverview.towers().found() })');
    d.log('a search', { word, ...lit });
    assert.ok(lit.box.found > 0 && lit.found !== null && lit.found.lit === lit.box.found, `a search for "${word}" lights what it finds`);
    await d.shot(win, 'towers-search');
    d.press(win, 'Escape');
    await d.delay(300);
    await js(`document.querySelector('.ov-grouping-toggle').click()`);
    for (let i = 0; i < 40 && !(await js('window.__deckOverview.current().address')).endsWith('group=feature'); i += 1) await d.delay(250);
    assert.ok((await js('window.__deckOverview.current().address')).endsWith('&group=feature'), 'the switch groups the ring by feature');
    await d.delay(900);
    await d.shot(win, 'towers-by-feature');
    await js(`document.querySelector('.ov-grouping-toggle').click()`);
    for (let i = 0; i < 40 && (await js('window.__deckOverview.current().address')).endsWith('group=feature'); i += 1) await d.delay(250);
    assert.ok(!(await js('window.__deckOverview.current().address')).includes('group='), 'and back by phase');
    await d.delay(1200);
    let pictures = await js('window.__deckOverview.towers().pictures()');
    for (let i = 0; i < 20 && pictures.some((p) => !p.loaded); i += 1) { await d.delay(250); pictures = await js('window.__deckOverview.towers().pictures()'); }
    d.log('the pictures', { standing: pictures.length, loaded: pictures.filter((p) => p.loaded).length });
    if ((model.pictures ?? []).length > 0) assert.ok(pictures.length > 0 && pictures.every((p) => p.loaded), 'the pictures stand at their tickets and load through the host');
    await d.shot(win, 'towers-pictures');
    d.log('page errors', pageErrors);
    assert.deepEqual(pageErrors, [], 'the page logged no error');
  }

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
  // The 3D view's module loads after the wheel is first drawn; on your-trainer that takes a moment.
  const look = () => d.js(served, `({ screen: document.body.dataset.overviewScreen, marks: document.querySelectorAll('#overview-area [data-ticket]').length, write: document.querySelectorAll('#overview-area [data-action]:not(.ov-off)').length, drawn: document.querySelector('#overview-area .ov-stage').classList.contains('ov-3d') ? '3d' : document.querySelector('#overview-area .ov-stage').classList.contains('ov-flat') ? 'flat' : 'none' })`);
  let tablet = await look();
  for (let i = 0; i < 60 && tablet.drawn === 'none'; i += 1) { await d.delay(250); tablet = await look(); }
  d.log('the served page', tablet);
  assert.equal(tablet.screen, 'wheel', 'the served page opens on the wheel');
  assert.ok(tablet.marks > 0, 'the served wheel draws its tickets');
  assert.notEqual(tablet.drawn, 'none', 'the served wheel draws the towers, in 3D or as the flat plan');
  assert.equal(tablet.write, 0, 'the served page offers no enabled control');
  await d.shot(served, 'served-wheel');
  served.close();
};
