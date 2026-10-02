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
  const focusSeen = `(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || String(e.className).split(' ')[0], seen: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none' }; })()`;
  const tabTo = async (from, id, max = 16) => {
    await js(`document.querySelector(${JSON.stringify(from)}).focus()`);
    const passed = [];
    for (let i = 0; i < max; i += 1) {
      d.press(win, 'Tab');
      await d.delay(90);
      const at = await js(focusSeen);
      passed.push(at.id);
      if (at.id === id) return { reached: true, presses: i + 1, seen: at.seen, passed };
    }
    return { reached: false, presses: max, seen: false, passed };
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

  // Every file of the copy, by its content. The copy is not a git repository, so the walk compares the files itself.
  const crypto = require('node:crypto');
  const fingerprint = () => {
    const out = new Map();
    const visit = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, e.name); if (e.isDirectory()) visit(full); else if (e.isFile()) out.set(path.relative(root, full), crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex')); } };
    visit(root);
    return out;
  };
  const differ = (x, y) => [...new Set([...x.keys(), ...y.keys()])].filter((f) => x.get(f) !== y.get(f)).sort();
  const filesAtStart = fingerprint();

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
  // A word that narrows this view: "glass" here, and on another workspace the commonest long word of its notes' titles.
  const WORD = await js(`(() => { const titles = [...document.querySelectorAll('#nav-list .nav-row')].map((r) => r.textContent.toLowerCase()); const n = (w) => titles.filter((x) => x.includes(w)).length; if (n('glass') >= 3) return 'glass'; const counts = new Map(); for (const x of titles) for (const w of new Set(x.match(/[a-z]{5,}/g) || [])) counts.set(w, (counts.get(w) || 0) + 1); return ([...counts].filter(([, c]) => c >= 3 && c < titles.length - 2).sort((a, b) => b[1] - a[1])[0] || ['a'])[0]; })()`);
  await type(WORD);
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
  check(saved !== undefined && saved.version === 2 && saved.view === 'features' && saved.query === WORD && saved.collection.presentation === 'cards' && saved.cards.length === 2 && saved.anchors[a].heading === kept.anchorA.heading && /saved/.test(said), 'the scene is saved under its name: its view, search, collection, the two notes and where each is being read', { said, anchors: saved && saved.anchors });
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

  // What the Features view holds now, which the scene is about to replace from the Issues view.
  const featuresNow = async () => { const s = await state(); return JSON.stringify({ desk: (s.viewDesks[ws] || {}).features || [], list: (s.collections[ws] || {}).features || null }); };
  const featuresBefore = await featuresNow();

  // ---- 4. Reopened ----
  // Choosing a name in the list is not opening it: nothing changes until "open" is pressed.
  await js(`document.getElementById('scene-list').focus()`);
  d.press(win, 'Down');
  await d.delay(600);
  const chosenOnly = await js(`({ value: document.getElementById('scene-list').value, view: window.__deckLastState.viewId, held: window.__deckDesk(), open: !document.getElementById('scene-open').hidden })`);
  check(chosenOnly.value === 'Review Glass' && chosenOnly.view === 'issues' && chosenOnly.held.length === 1 && chosenOnly.open, 'choosing the scene\'s name in the list changes nothing on the desk; "open" is then offered', chosenOnly);
  await choose('Review Glass');
  const again = { state: await state(), a: await pane(a), b: await pane(b), anchorA: await anchorOf(a), anchorB: await anchorOf(b), count: await t.text('#collection-count'), cards: await js(`document.querySelectorAll('.field-card.in-collection').length`), search: await js(`document.getElementById('search').value`), status: await t.text('#status'), report: await js(`document.getElementById('scene-report').hidden`) };
  check(again.state.viewId === 'features' && again.search === WORD && again.cards > 0 && again.state.collections[ws].features.presentation === 'cards', 'the scene chosen from the list brings back its view, its search and the collection as cards', { view: again.state.viewId, search: again.search, cards: again.cards });
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
  const featuresAfter = await featuresNow();
  check(featuresAfter === featuresBefore && JSON.parse(featuresBefore).desk.length === 0 && (JSON.parse(featuresBefore).list || {}).presentation === 'table', 'the scene was opened from the Issues view and replaced the desk and the list of the Features view; the same press put those back too: no note open there, and its list a table again', { before: featuresBefore, after: featuresAfter });

  // Saving, opening and going back wrote no file of the workspace.
  check(differ(filesAtStart, fingerprint()).length === 0, `saving a scene, opening it and going back left every one of the copy's ${filesAtStart.size} files as it was`, differ(filesAtStart, fingerprint()));

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
  const toDismiss = await tabTo('#scene-list', 'scene-report-close');
  d.press(win, 'Return');
  await d.delay(300);
  check(toDismiss.reached && toDismiss.seen && (await js(`document.getElementById('scene-report').hidden`)), `the Tab key reaches "dismiss" ${toDismiss.presses} presses after the list of scenes, the keyboard's place is drawn on it, and Enter closes the report`, toDismiss);
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
  // With the scene open, "save scene" offers its own name, and taking it still asks before it replaces what the scene kept.
  const ownBefore = JSON.stringify((await state()).desks[`${ws}:Review Glass`]);
  await t.clickOn('#scene-save', 400);
  const offered = await js(`(document.querySelector('#status input') || {}).value || ''`);
  d.press(win, 'Return');
  await d.delay(700);
  const askedOwn = await js(`[...document.querySelectorAll('#status button')].map((b) => b.textContent)`);
  if (askedOwn.includes('keep it')) {
    await js(`[...document.querySelectorAll('#status button')].find((b) => b.textContent === 'keep it').focus()`);
    d.press(win, 'Return');
    await d.delay(600);
  }
  check((await state()).deskName === 'Review Glass' && offered === 'Review Glass' && askedOwn.includes('replace it') && askedOwn.includes('keep it') && JSON.stringify((await state()).desks[`${ws}:Review Glass`]) === ownBefore, 'with the scene open, "save scene" offers the scene\'s own name; saving under it asks first, and "keep it" leaves what the scene kept as it was', { offered, askedOwn });

  // ---- 7. Rename, delete, restore ----
  const filesBeforeRename = fingerprint();
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
  const toRestore = await tabTo('#scene-list', 'scene-report-act');
  d.press(win, 'Return');
  await d.delay(700);
  const restored = (await state()).desks[`${ws}:Compare designs`];
  check(toRestore.reached && toRestore.seen && restored !== undefined && restored.version === 2 && restored.cards.length === 2 && JSON.stringify(restored.anchors) === JSON.stringify(saved.anchors), `the Tab key reaches "restore" ${toRestore.presses} presses after the list of scenes, with the keyboard's place drawn on it, and Enter puts the scene back as it was saved`, { toRestore, restored: restored && Object.keys(restored) });

  check(differ(filesBeforeRename, fingerprint()).length === 0, 'renaming, deleting and restoring a scene left every file of the copy as it was', differ(filesBeforeRename, fingerprint()));

  // ---- 8. A desk saved before scenes ----
  await js(`window.deck.state.dispatch({ type: 'save-desk', name: 'old desk', viewId: 'features' })`);
  await d.delay(400);
  await t.view('issues');
  const beforeOld = await state();
  await choose('old desk');
  const old = await state();
  check(old.desks[`${ws}:old desk`].version === undefined && old.viewId === 'issues' && old.query === beforeOld.query && (old.viewDesks[ws].issues || []).length === 2, 'a desk saved the old way (no version) opens as it always did: its notes, on the view that is on screen, and it brings no view or search of its own', { view: old.viewId, held: (old.viewDesks[ws].issues || []).map((c) => c.noteId) });

  // ---- 8b. On a desk made for it: what is the session's, both undos, the keyboard, a failed read, a smaller field, the address ----
  const paneEl = (id) => `[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)})`;
  /** Choose a scene in the list with the arrow keys, and stop there: opening is its own press. */
  const selectScene = async (name) => {
    await js(`document.getElementById('scene-list').focus()`);
    for (let i = 0; i < 16; i += 1) {
      const now = await js(`document.getElementById('scene-list').value`);
      if (now === name) return true;
      const order = await js(`[...document.getElementById('scene-list').options].map((o) => o.value)`);
      d.press(win, order.indexOf(now) < order.indexOf(name) ? 'Down' : 'Up');
      await d.delay(220);
    }
    return (await js(`document.getElementById('scene-list').value`)) === name;
  };
  const clearSearch = async () => { await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`); d.press(win, 'Backspace'); await d.delay(700); };
  // "close all" is hidden when the desk holds nothing, and then there is nothing to sweep. Shown and not
  // pressable is a failure, which `clickOn` reports.
  const sweep = async () => { await t.clickIfShown('#sweep-desk', 800); };
  await t.view('features');
  await clearSearch();
  if (await js(`document.getElementById('collection-as-table').getAttribute('aria-pressed') !== 'true'`)) await t.clickOn('#collection-as-table', 600);
  await sweep();
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const x = await openRow();
  const y = await openRow([x]);
  await js(`(() => { const p = ${paneEl(y)}; const body = p.querySelector('.pane-body'); const hs = p.querySelectorAll('.pane-note h2'); const h = hs[Math.min(1, hs.length - 1)]; body.scrollTop += h.getBoundingClientRect().top - body.getBoundingClientRect().top + 40; })()`);
  // x is made the focus, its list is opened and one relationship is picked out: three things that are the session's, not the scene's.
  await js(`${paneEl(x)}.querySelector('.pane-head').focus()`);
  d.press(win, 'Return');
  await d.delay(1600);
  await t.park();
  d.press(win, 'r');
  await d.delay(900);
  const chip = await js(`(() => { const c = ${paneEl(x)}.querySelector('.kind-chip[data-kind]:not([data-kind=""])'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, kind: c.dataset.kind }; })()`);
  if (chip) { await d.pointer(win, d.click(chip)); await d.delay(600); await t.park(); }
  const session = () => js(`({ focus: ${glass}.focusId(), listOpen: !${paneEl(x)}.querySelector('.pane-links').hidden, emphasis: ${glass}.arrangeState().emphasis, held: window.__deckDesk() })`);
  const sessionBefore = await session();
  const anchorY = await anchorOf(y);
  await saveAs('Kept as it is');
  const stored = (await state()).desks[`${ws}:Kept as it is`];
  // Opened again on the same view, timed from the press to both documents being read where they were.
  const listShows = await js(`document.getElementById('scene-list').value`);
  await selectScene('Kept as it is');
  const openAt = await t.rect('#scene-open');
  const pressedAt = Date.now();
  await d.pointer(win, d.click(openAt));
  let reopenMs = null;
  for (let i = 0; i < 200; i += 1) {
    await d.delay(25);
    const ready = await js(`(() => { const ids = ${JSON.stringify([x, y])}; return ids.every((id) => ${glass}.documentState(id) === 'ready') && (${glass}.readingAnchor(${JSON.stringify(y)}) || {}).heading === ${JSON.stringify(anchorY.heading)}; })()`);
    if (ready) { reopenMs = Date.now() - pressedAt; break; }
  }
  await d.delay(900);
  await t.park();
  const sessionAfter = await session();
  check(stored !== undefined && JSON.stringify(Object.keys(stored).sort()) === JSON.stringify(['anchors', 'cards', 'collection', 'field', 'filters', 'name', 'query', 'savedAt', 'version', 'view', 'workspaceId']) && sessionBefore.focus === x && sessionBefore.listOpen && JSON.stringify(sessionAfter) === JSON.stringify(sessionBefore) && listShows === 'Kept as it is', 'after saving, the list shows the scene just saved; which document is the focus, which list is open and which relationship is picked out are not kept in a scene, and opening the scene on the same view leaves all three as they were', { listShows, before: sessionBefore, after: sessionAfter, picked: chip && chip.kind });
  d.log('from pressing "open" to both documents read where they were, in the box', { reopenMs, documents: 2 });

  // Both undos on screen at once, each named for what it puts back.
  await t.clickOn('#arrange-read', 500);
  d.press(win, 'Return');
  await d.delay(1200);
  const undos = await js(`(() => { const bar = document.querySelector('.field-bar').getBoundingClientRect(); const inBar = (e) => { const r = e.getBoundingClientRect(); return !e.hidden && r.width > 0 && r.left >= bar.left - 1 && r.right <= bar.right + 1 && r.top >= bar.top - 1 && r.bottom <= bar.bottom + 1; }; const s = document.getElementById('scene-back'); const u = document.getElementById('arrange-undo'); return { scene: s.textContent, sceneInBar: inBar(s), arrange: u.textContent, arrangeInBar: inBar(u), barHeight: Math.round(bar.height), window: window.innerWidth }; })()`);
  check(undos.sceneInBar && undos.arrangeInBar && undos.scene.startsWith('Undo: back to the desk before') && undos.arrange.startsWith('Undo arrangement') && undos.scene !== undos.arrange, `"Undo: back to the desk before …" and "Undo arrangement" are both on screen, whole, in a window ${undos.window} px wide, and each says what it puts back`, undos);
  await d.shot(win, '08-both-undos');
  await t.clickOn('#arrange-undo', 1000);

  // By keyboard: Tab goes through the scene controls in order, and Escape closes the question and nothing else.
  await js(`document.getElementById('scene-list').focus()`);
  const tabbed = [];
  const seenOn = [];
  for (let i = 0; i < 5; i += 1) { d.press(win, 'Tab'); await d.delay(120); const at = await js(focusSeen); tabbed.push(at.id); seenOn.push(at.seen); }
  const outlined = seenOn.every(Boolean);
  await js(`document.getElementById('scene-save').focus()`);
  const desksBefore = JSON.stringify(Object.keys((await state()).desks).sort());
  const deskAsItWas = JSON.stringify((await state()).viewDesks[ws].features);
  d.press(win, 'Return');
  await d.delay(500);
  const asking = await js(`!!document.querySelector('#status input')`);
  d.press(win, 'Escape');
  await d.delay(500);
  const escaped = await js(`({ asking: !!document.querySelector('#status input'), held: window.__deckDesk().length, listOpen: !${paneEl(x)}.querySelector('.pane-links').hidden, report: document.getElementById('scene-report').hidden })`);
  check(outlined && JSON.stringify(tabbed) === JSON.stringify(['scene-open', 'scene-save', 'scene-rename', 'scene-delete', 'scene-back']) && asking && !escaped.asking && escaped.held === 2 && escaped.listOpen === sessionBefore.listOpen && JSON.stringify(Object.keys((await state()).desks).sort()) === desksBefore && JSON.stringify((await state()).viewDesks[ws].features) === deskAsItWas, 'Tab goes from the list through open, save scene, rename, delete and the undo, in that order, and each shows where the keyboard is; Enter on "save scene" asks for a name and Escape closes that question and nothing else: no scene is saved, no document is closed and the open list stays open', { tabbed, focusVisible: outlined, asking, escaped });

  // With reduced motion asked for, a reopened scene's documents are at their places at once.
  const dbgScenes = win.webContents.debugger;
  dbgScenes.attach('1.3');
  await dbgScenes.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await sweep();
  await d.delay(400);
  await selectScene('Kept as it is');
  await d.pointer(win, d.click(await t.rect('#scene-open')));
  let firstSeen = null;
  for (let i = 0; i < 80 && firstSeen === null; i += 1) { await d.delay(16); firstSeen = await js(`(() => { const ps = ${JSON.stringify([x, y])}.map((id) => ${paneEl('__ID__').replace('"__ID__"', 'id')}); if (ps.some((p) => !p)) return null; return ps.map((p) => { const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), p.getAnimations().length]; }); })()`); }
  await d.delay(900);
  const settled = await js(`${JSON.stringify([x, y])}.map((id) => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === id); const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), p.getAnimations().length]; })`);
  check(firstSeen !== null && JSON.stringify(firstSeen) === JSON.stringify(settled) && settled.every((r) => r[3] === 0) && (await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)), 'with reduced motion asked for, the documents of a reopened scene are at their places the first time they are seen, and nothing is animating', { firstSeen, settled });
  await dbgScenes.sendCommand('Emulation.setEmulatedMedia', { features: [] });
  dbgScenes.detach();

  // A document whose text cannot be read says so, and is read where it was once a retry succeeds.
  const graphNow = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
  const relY = graphNow.nodes.find((n) => n.id === y).rel;
  let refuseY = true;
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: refuseY && /\/api\/render\?/.test(details.url) && decodeURIComponent(details.url).includes(relY) }));
  // Scrolled to its top before it is closed, so this window does not remember a place for it: where it is
  // read after the retry can then only come from the scene.
  await js(`(() => { ${paneEl(y)}.querySelector('.pane-body').scrollTop = 0; return true; })()`);
  await d.delay(200);
  await sweep();
  await d.delay(400);
  await js(`${glass}.forgetBodies && ${glass}.forgetBodies()`);
  await selectScene('Kept as it is');
  await d.pointer(win, d.click(await t.rect('#scene-open')));
  let failedDoc = null;
  for (let i = 0; i < 60; i += 1) { await d.delay(200); failedDoc = await js(`(() => { const p = ${paneEl(y)}; return p ? { state: p.dataset.state, said: p.querySelector('.pane-state').textContent, retry: [...p.querySelectorAll('.pane-state button')].map((b) => b.textContent), title: p.querySelector('.pane-title').textContent } : null; })()`); if (failedDoc && failedDoc.state === 'error') break; }
  // Longer than the wait a reading position is given, so the retry comes after it.
  await d.delay(6500);
  refuseY = false;
  win.webContents.session.webRequest.onBeforeRequest(null);
  // By keyboard: the other document may lie over the button.
  const retryAt = await js(`(() => { const b = [...${paneEl(y)}.querySelectorAll('.pane-state button')].find((q) => q.textContent === 'retry'); if (!b) return null; b.focus(); return document.activeElement === b; })()`);
  if (retryAt) { d.press(win, 'Return'); await d.delay(300); }
  let retriedDoc = null;
  for (let i = 0; i < 60; i += 1) { await d.delay(200); retriedDoc = await js(`({ state: ${glass}.documentState(${JSON.stringify(y)}), anchor: ${glass}.readingAnchor(${JSON.stringify(y)}) })`); if (retriedDoc.state === 'ready' && retriedDoc.anchor && retriedDoc.anchor.heading === anchorY.heading) break; }
  check(failedDoc !== null && failedDoc.state === 'error' && failedDoc.said.length > 0 && failedDoc.retry.length > 0 && retryAt !== null && retriedDoc.state === 'ready' && retriedDoc.anchor !== null && retriedDoc.anchor.heading === anchorY.heading && Math.abs(retriedDoc.anchor.past - anchorY.past) <= 2, `a document of the scene whose text could not be read says so under its title, with a retry; when the retry succeeds, more than six seconds later, it is read at "${anchorY.heading}" where the scene kept it, in a window that had last read it at its top`, { failedDoc, retriedDoc, kept: anchorY });

  // In a window smaller than the one the scene was arranged in, every document's header is inside the field.
  const big = win.getBounds();
  win.setBounds({ x: 0, y: 0, width: 900, height: 640 });
  await d.delay(900);
  await sweep();
  await selectScene('Kept as it is');
  await d.pointer(win, d.click(await t.rect('#scene-open')));
  await d.delay(2500);
  await t.park();
  const small = await js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); return { field: [Math.round(f.width), Math.round(f.height)], heads: [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')).map((p) => { const h = p.querySelector('.pane-head').getBoundingClientRect(); const at = document.elementFromPoint(h.left + 24, h.top + h.height / 2); const x = p.querySelector('.pane-close').getBoundingClientRect(); const atClose = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2); return { id: p.dataset.noteId, inside: h.left >= f.left - 1 && h.right <= f.right + 1 && h.top >= f.top - 1 && h.bottom <= f.bottom + 1, reachable: !!at && at.closest('.pane') !== null, closeReachable: !!atClose && atClose.closest('.pane') !== null }; }), narrow: !document.getElementById('narrow-bar').hidden, bar: [...document.querySelectorAll('#narrow-bar button')].map((b) => b.textContent), cut: [...document.querySelectorAll('.field-bar button, .field-bar select')].filter((b) => b.getClientRects().length > 0).filter((b) => { const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit && (hit === b || b.contains(hit))); }).map((b) => b.id || b.textContent), report: [...document.querySelectorAll('#scene-report-lines li')].map((l) => l.textContent) }; })()`);
  check(small.cut.length === 0 && small.heads.length >= 1 && small.heads.every((h) => h.inside && h.reachable && h.closeReachable) && (small.heads.length === 2 || (small.narrow && small.bar.length >= 2)) && small.report.some((l) => /This window's field is \d+ by \d+; the scene was arranged in/.test(l)), `reopened in a field of ${small.field.join(' by ')}, smaller than the one it was arranged in: every document on screen has its header wholly inside the field, with nothing but another document over either end of it while the scene's message is still shown, a document not on screen is one press away in the bar, every control above the field can be pressed where it is drawn, and the report says the field is smaller`, small);
  await d.shot(win, '09-a-scene-in-a-smaller-window');
  if (!(await js(`document.getElementById('scene-report').hidden`))) await t.clickOn('#scene-report-close', 300);
  win.setBounds(big);
  await d.delay(900);

  // The copied address, opened from another view, opens the scene on its view.
  const { clipboard: clip } = require('electron');
  clip.writeText('');
  await t.clickOn('#copy-address', 600);
  const sceneAddress = clip.readText();
  await sweep();
  await t.view('issues');
  await t.clickOn('#open-address', 500);
  // The address on the clipboard is offered already typed; Enter opens it.
  const offeredAddress = await js(`(document.querySelector('#status input') || {}).value || ''`);
  d.press(win, 'Return');
  await d.delay(3500);
  await t.park();
  const byAddress = await js(`({ view: window.__deckLastState.viewId, desk: window.__deckLastState.deskName, held: window.__deckDesk() })`);
  check(/desk=Kept/.test(sceneAddress) && offeredAddress === sceneAddress && byAddress.view === 'features' && byAddress.desk === 'Kept as it is' && byAddress.held.includes(x) && byAddress.held.includes(y), 'the address copied while the scene is open, opened from the Issues view, opens the scene on its own view with its documents', { sceneAddress, byAddress });

  // A scene this Deck cannot read is listed with its version, cannot be opened or renamed, and is kept as it is.
  const future = { name: 'From a newer Deck', workspaceId: ws, version: 99, view: 'features', cards: [{ noteId: x, x: 10, y: 10 }], somethingNew: { kept: true } };
  d.store.dispatch({ type: 'restore-desk', desk: future });
  await d.delay(700);
  const listedFuture = await js(`(() => { const o = [...document.getElementById('scene-list').options].find((q) => q.value === 'From a newer Deck'); if (!o) return null; const l = document.getElementById('scene-list'); l.value = 'From a newer Deck'; l.dispatchEvent(new Event('change', { bubbles: true })); return { text: o.textContent, disabled: o.disabled }; })()`);
  await d.delay(400);
  const futureActs = await js(`({ chosen: document.getElementById('scene-list').value, open: !document.getElementById('scene-open').hidden, rename: !document.getElementById('scene-rename').hidden, del: !document.getElementById('scene-delete').hidden })`);
  const heldBeforeFuture = JSON.stringify(await js('window.__deckDesk()'));
  clip.writeText(`deck://${ws}/features?desk=${encodeURIComponent('From a newer Deck')}`);
  await t.clickOn('#open-address', 500);
  d.press(win, 'Return');
  await d.delay(1800);
  const refusedSaid = await t.text('#status');
  const keptFuture = (await state()).desks[`${ws}:From a newer Deck`];
  check(listedFuture !== null && /cannot be opened/.test(listedFuture.text) && /saved by a different Deck \(version 99\)/.test(listedFuture.text) && !listedFuture.disabled && futureActs.chosen === 'From a newer Deck' && !futureActs.open && !futureActs.rename && futureActs.del && /saved by a different Deck \(version 99\) and is not opened/.test(refusedSaid) && JSON.stringify(await js('window.__deckDesk()')) === heldBeforeFuture && keptFuture !== undefined && keptFuture.version === 99 && JSON.stringify(keptFuture.somethingNew) === JSON.stringify({ kept: true }), 'a scene of a version this Deck does not know is listed with that version in its own text and can be chosen; "delete" is offered for it and neither "open" nor "rename"; it is refused by address with the reason, and is kept exactly as it was, with the field this Deck does not know', { listedFuture, futureActs, refusedSaid, kept: keptFuture && Object.keys(keptFuture) });
  // Spread's "save desk" is the other way to save under a name. Under the unreadable scene's name it is refused
  // with the reason; under a scene's name it asks first, as "save scene" does.
  const toSurface = async (id) => { await js(`document.querySelector('#surface-toggle button[data-surface="${id}"]').click()`); await d.delay(1500); };
  const saveDeskAs = async (name) => {
    await js(`document.getElementById('save-desk').click()`);
    await d.delay(400);
    await js(`(() => { const i = document.querySelector('#status input'); if (i) i.select(); })()`);
    await type(name);
    d.press(win, 'Return');
    await d.delay(700);
  };
  await toSurface('spread');
  await saveDeskAs('From a newer Deck');
  const spreadRefused = await t.text('#status');
  const sceneBeforeSaveDesk = JSON.stringify((await state()).desks[`${ws}:Kept as it is`]);
  await saveDeskAs('Kept as it is');
  const spreadAsked = await js(`[...document.querySelectorAll('#status button')].map((b) => b.textContent)`);
  if (spreadAsked.includes('keep it')) {
    await js(`[...document.querySelectorAll('#status button')].find((b) => b.textContent === 'keep it').focus()`);
    d.press(win, 'Return');
    await d.delay(600);
  }
  check(/saved by a different Deck \(version 99\) and is not replaced/.test(spreadRefused) && JSON.stringify((await state()).desks[`${ws}:From a newer Deck`]) === JSON.stringify(keptFuture) && spreadAsked.includes('replace it') && spreadAsked.includes('keep it') && JSON.stringify((await state()).desks[`${ws}:Kept as it is`]) === sceneBeforeSaveDesk, 'on the cards surface, "save desk" under the unreadable scene\'s name is refused with the reason and leaves it as it was; under a scene\'s name it asks first, and "keep it" leaves the scene exactly as it was saved', { spreadRefused, spreadAsked });
  await toSurface('glass');
  await d.shot(win, '10-a-scene-this-deck-cannot-read');

  // A note added to the view while the scene was put away is in its list when it is reopened: the list is read, not kept.
  const countBefore = await t.text('#collection-count');
  const template = fs.readdirSync(path.join(root, 'docs', 'features')).map((dir) => path.join(root, 'docs', 'features', dir)).flatMap((dir) => fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => /^FEAT-\d+.*\.md$/.test(f)).map((f) => path.join(dir, f)) : [])[0];
  const added = path.join(path.dirname(template), 'FEAT-9999-A-Note-Added-While-The-Scene-Was-Away.md');
  await sweep();
  await t.view('issues');
  fs.writeFileSync(added, fs.readFileSync(template, 'utf-8').replace(/^id: .*$/m, 'id: FEAT-9999').replace(/^title: .*$/m, 'title: "A note added while the scene was away"').replace(/^aliases: .*$/m, 'aliases: ["FEAT-9999"]'));
  await d.delay(4500);
  await selectScene('Kept as it is');
  await d.pointer(win, d.click(await t.rect('#scene-open')));
  let withAdded = null;
  for (let i = 0; i < 40; i += 1) { await d.delay(400); withAdded = await js(`({ count: document.getElementById('collection-count').textContent, has: window.__deckCollection.members().includes('FEAT-9999'), view: window.__deckLastState.viewId })`); if (withAdded.has) break; }
  const n = (text) => Number((/(\d+) notes/.exec(text) || [])[1]);
  check(withAdded.view === 'features' && withAdded.has && n(withAdded.count) === n(countBefore) + 1 && !JSON.stringify((await state()).desks[`${ws}:Kept as it is`]).includes('FEAT-9999'), `a note added to the Features view while the scene was put away is in the collection when the scene is reopened, and the count is one more (${countBefore} then ${withAdded && withAdded.count}); the saved scene itself names no member`, withAdded);
  const sinceRename = differ(filesBeforeRename, fingerprint());
  check(JSON.stringify(sinceRename) === JSON.stringify([path.relative(root, added)]), 'of the copy\'s files, the only one that differs since before the scenes were renamed, deleted, restored, reopened and refused is the note this walk added itself', sinceRename);
  await sweep();
  await t.view('issues');

  // A scene with no note open has no document to put back where it was read, and still says it reopened.
  await sweep();
  await saveAs('Nothing open');
  await t.clickOn('#scene-open', 300);
  // What it says waits on Deck's index answering which notes exist, so it is looked for rather than timed.
  for (let i = 0; i < 40; i += 1) { await d.delay(250); if (/reopened/.test(await t.text('#status'))) break; }
  const emptyScene = { said: await t.text('#status'), held: await js('window.__deckDesk()'), open: (await state()).deskName, report: await js(`document.getElementById('scene-report').hidden`) };
  check(emptyScene.held.length === 0 && emptyScene.open === 'Nothing open' && /scene "Nothing open" reopened/.test(emptyScene.said) && emptyScene.report, 'a scene saved with no note open reopens and says so in one line: with no document to put back where it was read, the scene is still answered', emptyScene);

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
    'a scene really saved by a newer Deck: no such Deck exists, so the walk put a version-99 entry in the store itself',
    'a second display: the box has one',
  ]);
  t.finish();
};
