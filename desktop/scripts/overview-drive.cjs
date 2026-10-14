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

  const phase = model.phases[0]?.id ?? model.shelf[0]?.id;
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
      const walk = (ns, out) => { for (const n of ns) { if (n.kind === 'group') walk(n.children, out); else if (n.kind === 'mark' && n.ticket) out.push(n.ticket); } return out; };
      return { screen: scene.screen, address: scene.address, sceneMarks: walk(scene.nodes, []).length,
        domMarks: document.querySelectorAll('#overview-area [data-ticket]').length,
        rows: scene.list.length, shown: !document.getElementById('overview-area').hidden, overview: document.body.dataset.overviewScreen };
    })()`);
    assert.equal(seen.shown, true, `${screen}: the overview layer is shown`);
    assert.equal(seen.screen, screen, `${screen}: the scene drawn is the one asked for`);
    assert.equal(seen.domMarks, seen.sceneMarks, `${screen}: every mark in the scene is in the window`);
    await d.shot(win, `${screen}`);
    d.log(`opened ${screen}`, seen);
    results.push(seen);
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
