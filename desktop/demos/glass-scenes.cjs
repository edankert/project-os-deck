// Named scenes, walked with a real pointer and keyboard (FEAT-0023): a desk
// saved under a name and reopened with everything it holds read afresh; what
// a reopened scene says when notes have gone, the window is smaller or the
// text has changed; and taking it back.
//
// It CHANGES NOTES ON DISK (it deletes one note and renames a heading in
// another, to see what a scene says about them), so it runs only on a
// throwaway copy:
//   bash tools/scripts/walk-in-a-box.sh glass-scenes --copy
const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const root = d.prepared.root;
  if (!/^\/tmp\/|^\/private\/tmp\//.test(root) || fs.existsSync(path.join(root, '.git'))) throw new Error(`this walk edits notes and runs only on a throwaway copy under /tmp, not on ${root}`);
  const ws = d.prepared.id;
  const win = await d.open(`deck://${ws}/features`);
  const t = lib(d, win);
  const { js, check, glass } = t;
  const state = () => js('window.__deckLastState');
  const type = async (text) => { for (const ch of text) { d.press(win, ch); await d.delay(30); } };
  const openRow = async (skip = []) => { const r = await js(t.rowInReach(skip)); await d.pointer(win, d.click(r)); await d.delay(1400); await t.park(); return r.id; };
  const pane = (id) => js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)}); if (!p) return null; const r = p.getBoundingClientRect(); const f = document.getElementById('field').getBoundingClientRect(); const b = p.querySelector('.pane-body'); return { left: Math.round(r.left - f.left), top: Math.round(r.top - f.top), width: Math.round(r.width), height: Math.round(r.height), scrollTop: Math.round(b.scrollTop), state: p.dataset.state, title: p.querySelector('.pane-title').textContent, chars: p.querySelector('.pane-note').textContent.length }; })()`);
  const anchorOf = (id) => js(`${glass}.readingAnchor(${JSON.stringify(id)})`);
  /** Choose a scene in the list with the keyboard, then open it with its own button. */
  const choose = async (name) => {
    await js(`document.getElementById('scene-list').focus()`);
    for (let i = 0; i < 12; i += 1) {
      const now = await js(`document.getElementById('scene-list').value`);
      if (now === name) break;
      d.press(win, now === '' || now < name ? 'Down' : 'Up');
      await d.delay(250);
    }
    await t.clickOn('#scene-open', 2500);
    await d.delay(1500);
    await t.park();
  };
  const saveAs = async (name) => {
    await t.clickOn('#scene-save', 400);
    // The name is asked for in the status bar, with what is there now already typed.
    await js(`(() => { const i = document.querySelector('#status input'); if (i) i.select(); })()`);
    await type(name);
    d.press(win, 'Return');
    await d.delay(700);
    // A name that is taken is asked about.
    const replace = await js(`[...document.querySelectorAll('#status button')].find((b) => b.textContent === 'replace it') ? true : false`);
    if (replace) { await js(`[...document.querySelectorAll('#status button')].find((b) => b.textContent === 'replace it').focus()`); d.press(win, 'Return'); await d.delay(700); }
  };

  // ---- 1. A desk worth keeping ----
  const a = await openRow();
  const b = await openRow([a]);
  // The second gets a size of its own; both are read somewhere other than their top.
  await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(b)}).querySelector('.pane-head').focus()`);
  for (let i = 0; i < 3; i += 1) { d.press(win, 'Right', ['alt']); await d.delay(150); }
  await d.delay(400);
  for (const [id, to] of [[a, 2], [b, 1]]) {
    await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)}); const body = p.querySelector('.pane-body'); const hs = p.querySelectorAll('.pane-note h2'); const h = hs[Math.min(${to}, hs.length - 1)]; body.scrollTop += h.getBoundingClientRect().top - body.getBoundingClientRect().top + 46; })()`);
  }
  await d.delay(200);
  const search = await t.rect('#search');
  await d.pointer(win, d.click(search));
  await type('glass');
  await d.delay(800);
  await t.clickOn('#collection-as-cards', 800);
  await t.park();
  const kept = { a: await pane(a), b: await pane(b), anchorA: await anchorOf(a), anchorB: await anchorOf(b), count: await t.text('#collection-count'), layout: (await state()).collections[ws].features };
  check(kept.anchorA.heading !== null && kept.anchorB.heading !== null && kept.a.scrollTop > 0 && kept.b.width !== kept.a.width, 'two notes are open at different sizes, each read part-way down under a heading; the collection is narrowed and shown as cards', { a: kept.a, b: kept.b, anchorA: kept.anchorA, anchorB: kept.anchorB, count: kept.count });
  await d.shot(win, '01-a-desk-worth-keeping');

  // ---- 2. Saved under a name ----
  await saveAs('Review Glass');
  const saved = (await state()).desks[`${ws}:Review Glass`];
  const said = await t.text('#status');
  check(saved !== undefined && saved.version === 2 && saved.view === 'features' && saved.query === 'glass' && saved.collection.presentation === 'cards' && saved.cards.length === 2 && saved.anchors[a].heading === kept.anchorA.heading && /saved/.test(said), 'the scene is saved under its name: its view, search, collection, the two notes and where each is being read', { said, anchors: saved && saved.anchors });
  check(saved !== undefined && JSON.stringify(Object.keys(saved).sort()) === JSON.stringify(['anchors', 'cards', 'collection', 'field', 'filters', 'name', 'query', 'savedAt', 'version', 'view', 'workspaceId']) && saved.cards.every((c) => JSON.stringify(Object.keys(c).sort()) === JSON.stringify(['h', 'noteId', 'w', 'x', 'y'])), 'it holds no row, no member id, no count, no text, and nothing of how the field was turned or zoomed', saved && Object.keys(saved));
  const listed = await js(`({ value: document.getElementById('scene-list').value, options: [...document.getElementById('scene-list').options].map((o) => o.textContent), rename: !document.getElementById('scene-rename').hidden, del: !document.getElementById('scene-delete').hidden })`);
  check(listed.value === 'Review Glass' && listed.options.some((o) => o.startsWith('Review Glass · features · 2 notes')) && listed.rename && listed.del, 'the list names it with its view and how many notes it holds, and rename and delete are offered for it', listed);

  // ---- 3. The person moves on ----
  await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`);
  d.press(win, 'Backspace');
  await d.delay(700);
  await t.clickOn('#collection-as-table', 500);
  await t.clickOn('#sweep-desk', 800);
  await t.view('issues');
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const other = await openRow();
  const elsewhere = { view: (await state()).viewId, held: await js('window.__deckDesk()'), query: (await state()).query, other: await pane(other) };
  check(elsewhere.view === 'issues' && elsewhere.held.length === 1 && elsewhere.query === '', 'elsewhere now: the Issues view, one other note open, no search', elsewhere);

  // ---- 4. Reopened ----
  // Choosing a name in the list is not opening it: nothing changes until "open" is pressed.
  await js(`document.getElementById('scene-list').focus()`);
  d.press(win, 'Down');
  await d.delay(600);
  const chosenOnly = await js(`({ value: document.getElementById('scene-list').value, view: window.__deckLastState.viewId, held: window.__deckDesk(), open: !document.getElementById('scene-open').hidden })`);
  check(chosenOnly.value === 'Review Glass' && chosenOnly.view === 'issues' && chosenOnly.held.length === 1 && chosenOnly.open, 'choosing the scene\'s name in the list changes nothing on the desk; "open" is then offered', chosenOnly);
  await choose('Review Glass');
  const again = { state: await state(), a: await pane(a), b: await pane(b), anchorA: await anchorOf(a), anchorB: await anchorOf(b), count: await t.text('#collection-count'), cards: await js(`document.querySelectorAll('.field-card.in-collection').length`), search: await js(`document.getElementById('search').value`), status: await t.text('#status'), report: await js(`document.getElementById('scene-report').hidden`) };
  check(again.state.viewId === 'features' && again.search === 'glass' && again.cards > 0 && again.state.collections[ws].features.presentation === 'cards', 'the scene chosen from the list brings back its view, its search and the collection as cards', { view: again.state.viewId, search: again.search, cards: again.cards });
  check(again.a !== null && again.b !== null && again.a.left === kept.a.left && again.a.top === kept.a.top && again.b.left === kept.b.left && again.a.width === kept.a.width && again.b.width === kept.b.width && again.b.height === kept.b.height, 'both notes are open where they stood, at the sizes they had', { a: again.a, b: again.b });
  check(again.a.state === 'ready' && again.b.state === 'ready' && again.anchorA.heading === kept.anchorA.heading && Math.abs(again.anchorA.past - kept.anchorA.past) <= 2 && again.anchorB.heading === kept.anchorB.heading && Math.abs(again.b.scrollTop - kept.b.scrollTop) <= 2, 'each is read where it was being read: under the same heading, the same distance past it', { a: [kept.anchorA, again.anchorA], b: [kept.b.scrollTop, again.b.scrollTop] });
  const nav = await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/nav?mode=features`)).json();
  const ids = new Set();
  const walk = (items) => { for (const item of items || []) { if (item.id) ids.add(item.id); walk(item.children || item.items || []); } };
  for (const group of nav.groups) walk(group.items);
  check(again.count.endsWith(`of ${ids.size} notes`) && again.report && /read as it is now/.test(again.status), 'the count is the one the sidecar gives now, and with nothing changed the scene says so in one line and raises no report', { count: again.count, now: ids.size, status: again.status });
  await d.shot(win, '02-reopened');

  // ---- 5. Taken back ----
  const backLabel = await t.text('#scene-back');
  await t.clickOn('#scene-back', 2500);
  await t.park();
  const back = { view: (await state()).viewId, held: await js('window.__deckDesk()'), query: (await state()).query, other: await pane(other), offered: !(await js(`document.getElementById('scene-back').hidden`)), scenes: Object.keys((await state()).desks).length };
  check(backLabel === 'Undo: back to the desk before "Review Glass"' && back.view === 'issues' && JSON.stringify(back.held) === JSON.stringify(elsewhere.held) && back.query === '' && back.other.left === elsewhere.other.left && back.other.top === elsewhere.other.top && !back.offered && back.scenes === 1, 'one press, named for what it does, puts back the Issues view with the note that was open there, where it stood; the scene is still saved', { backLabel, back });

  // ---- 6. Notes change on disk; the window is smaller ----
  const relOf = async (id) => js(`${glass}.hooks.cardByRel ? (${glass}.cardFor(${JSON.stringify(id)}) || {}).rel : null`);
  await t.view('features');
  const relA = await relOf(a);
  const relB = await relOf(b);
  const fileA = path.join(root, 'docs', String(relA).replace(/^docs\//, ''));
  const fileB = path.join(root, 'docs', String(relB).replace(/^docs\//, ''));
  // The heading B was being read under is renamed; A is deleted.
  const textB = fs.readFileSync(fileB, 'utf-8');
  const heading = kept.anchorB.heading;
  const renamed = textB.replace(new RegExp(`^(#+) ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'), `$1 ${heading} (renamed by the walk)`);
  check(renamed !== textB, `the heading "${heading}" was found in ${path.basename(fileB)} to rename`, null);
  fs.writeFileSync(fileB, renamed);
  fs.unlinkSync(fileA);
  await d.delay(3000);
  const full = win.getBounds();
  win.setBounds({ x: 0, y: 0, width: 1180, height: 760 });
  await d.delay(900);
  // The field is turned and zoomed first: neither is part of a scene, so reopening one changes neither.
  const cameraBefore = await js(`({ yaw: ${glass}.model.yaw, zoom: ${glass}.zoom().scale })`);
  await js(`document.getElementById('field').focus()`);
  await t.keys(['Right', 'Right', '+'], 400);
  const camera = await js(`({ yaw: ${glass}.model.yaw, zoom: ${glass}.zoom().scale })`);
  await choose('Review Glass');
  await d.delay(2500);
  const cameraAfter = await js(`({ yaw: ${glass}.model.yaw, zoom: ${glass}.zoom().scale })`);
  check(camera.yaw !== cameraBefore.yaw && camera.zoom !== cameraBefore.zoom && Math.abs(cameraAfter.yaw - camera.yaw) < 1e-6 && cameraAfter.zoom === camera.zoom, 'the field was turned and zoomed before the scene was reopened on its own view, and is turned and zoomed the same after: a scene keeps neither and changes neither', { cameraBefore, camera, cameraAfter });
  d.press(win, '0');
  await d.delay(400);
  const report = await js(`({ hidden: document.getElementById('scene-report').hidden, title: document.getElementById('scene-report-title').textContent, lines: [...document.querySelectorAll('#scene-report-lines li')].map((l) => l.textContent) })`);
  check(!report.hidden && /Since it was saved/.test(report.title) && report.lines.some((l) => l.startsWith(`${a} is no longer in this workspace`)) && report.lines.some((l) => /This window's field is \d+ by \d+; the scene was arranged in/.test(l)) && report.lines.some((l) => l.includes(`The passage being read in ${b} is not under the heading it was`)), `reopened after ${a} was deleted, a heading in ${b} was renamed and the window was made smaller: the scene says all three, and stays until dismissed`, report);
  const gone = await pane(a);
  const moved = await pane(b);
  const label = await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}).querySelector('.pane-state').textContent`);
  check(gone !== null && gone.state !== 'ready' && gone.title === kept.a.title && label.includes(a) && /deleted, renamed or moved|cannot be read/.test(label) && (gone.chars === 0 || /as it was last read/.test(label)), `${a}'s document is there under its own title, labelled: the text this window read earlier, said to be as last read, and no other note stands in for it`, { state: gone.state, chars: gone.chars, label });
  check(moved.state === 'ready' && moved.width === kept.b.width && moved.scrollTop > 0, `${b} is open at its size, as far down as before`, moved);
  const storedPlaces = (await state()).viewDesks[ws].features.map((c) => [c.noteId, c.x, c.y, c.w, c.h]);
  check(JSON.stringify(storedPlaces) === JSON.stringify(saved.cards.map((c) => [c.noteId, c.x, c.y, c.w, c.h])), 'the places and sizes the scene holds were not changed by being drawn in a smaller window', storedPlaces);
  await d.shot(win, '03-reopened-after-changes');
  await t.clickOn('#scene-report-close', 300);
  check(await js(`document.getElementById('scene-report').hidden`), 'dismiss closes the report', null);
  win.setBounds(full);
  await d.delay(700);

  // ---- 6b. Saving over a name asks first; the address names the scene ----
  await js(`window.deck.state.dispatch({ type: 'open-desk', name: null })`);
  await d.delay(300);
  const savedBefore = JSON.stringify((await state()).desks[`${ws}:Review Glass`]);
  await t.clickOn('#scene-save', 400);
  await js(`(() => { const i = document.querySelector('#status input'); if (i) i.select(); })()`);
  await type('Review Glass');
  d.press(win, 'Return');
  await d.delay(700);
  const asked = await js(`[...document.querySelectorAll('#status button')].map((b) => b.textContent)`);
  await js(`[...document.querySelectorAll('#status button')].find((b) => b.textContent === 'keep it').focus()`);
  d.press(win, 'Return');
  await d.delay(600);
  check(asked.includes('replace it') && asked.includes('keep it') && JSON.stringify((await state()).desks[`${ws}:Review Glass`]) === savedBefore, 'saving under a name that is taken asks first, and "keep it" leaves the saved scene exactly as it was', asked);
  await choose('Review Glass');
  const { clipboard } = require('electron');
  clipboard.writeText('');
  await t.clickOn('#copy-address', 600);
  const address = clipboard.readText();
  check(/desk=Review(%20|\+| )Glass/.test(address) && address.includes('/features'), 'the copied address names the scene and its view, so the scene is a state Deck can be sent to', address);

  // ---- 7. Rename, delete, restore ----
  await t.clickOn('#scene-rename', 400);
  await js(`(() => { const i = document.querySelector('#status input'); if (i) i.select(); })()`);
  await type('Compare designs');
  d.press(win, 'Return');
  await d.delay(700);
  const renamedTo = await js(`({ keys: Object.keys(window.__deckLastState.desks), open: window.__deckLastState.deskName, list: document.getElementById('scene-list').value, status: document.getElementById('status').textContent })`);
  check(JSON.stringify(renamedTo.keys) === JSON.stringify([`${ws}:Compare designs`]) && renamedTo.open === 'Compare designs' && renamedTo.list === 'Compare designs', 'rename keeps the scene under its new name, and it is still the one that is open', renamedTo);
  const deskBefore = JSON.stringify((await state()).viewDesks[ws].features);
  await t.clickOn('#scene-delete', 600);
  const deleted = await js(`({ keys: Object.keys(window.__deckLastState.desks), title: document.getElementById('scene-report-title').textContent, act: document.getElementById('scene-report-act').hidden ? null : document.getElementById('scene-report-act').textContent })`);
  check(deleted.keys.length === 0 && /deleted/.test(deleted.title) && deleted.act === 'restore' && JSON.stringify((await state()).viewDesks[ws].features) === deskBefore, 'delete removes the scene from the list, leaves the desk on screen as it is, and offers restore', deleted);
  await d.shot(win, '04-deleted-with-restore');
  await t.clickOn('#scene-report-act', 700);
  const restored = (await state()).desks[`${ws}:Compare designs`];
  check(restored !== undefined && restored.version === 2 && restored.cards.length === 2 && JSON.stringify(restored.anchors) === JSON.stringify(saved.anchors), 'restore puts it back as it was saved', restored && Object.keys(restored));

  // ---- 8. A desk saved before scenes ----
  await js(`window.deck.state.dispatch({ type: 'save-desk', name: 'old desk', viewId: 'features' })`);
  await d.delay(400);
  await t.view('issues');
  const beforeOld = await state();
  await choose('old desk');
  const old = await state();
  check(old.desks[`${ws}:old desk`].version === undefined && old.viewId === 'issues' && old.query === beforeOld.query && (old.viewDesks[ws].issues || []).length === 2, 'a desk saved the old way (no version) opens as it always did: its notes, on the view that is on screen, and it brings no view or search of its own', { view: old.viewId, held: (old.viewDesks[ws].issues || []).map((c) => c.noteId) });

  // ---- 9. Reload, and the served page ----
  win.webContents.reload();
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
  await d.untilBooted(win);
  await d.delay(2500);
  const afterReload = await js(`({ options: [...document.getElementById('scene-list').options].map((o) => o.value), back: document.getElementById('scene-back').hidden })`);
  check(afterReload.options.includes('Compare designs') && afterReload.options.includes('old desk') && afterReload.back, 'after a reload the scenes are still listed; the way back to "the desk before" was this window\'s and is gone', afterReload);
  const page = d.openServedPage();
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(3500);
  const served = await d.js(page, `({ scenes: document.getElementById('scenes').hidden, bridge: typeof window.deck })`);
  check(served.bridge === 'undefined' && served.scenes, 'the served page offers no scenes: it shows the desk the application has', served);
  page.destroy();

  d.log('what this walk does not establish', [
    'whether a person finds a scene worth naming, or finds their place again faster with one: that is the acceptance check, walked by a person',
    'a scene saved by a newer Deck: no such Deck exists to save one; the rule is checked without a window in tests/scenes.test.mjs',
    'a second display: the box has one',
  ]);
  t.finish();
};
