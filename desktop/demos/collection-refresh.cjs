// What the collection does when the notes change on disk under it: the
// change is announced and the list is not re-ordered until the person says
// so; applied, the list is still on the row it was on; and a note that left
// the list keeps its open document (FEAT-0020, TASK-0095).
//
// It CHANGES NOTES ON DISK, so it runs only on a throwaway copy of a
// workspace and refuses anything else:
//   electron . --drive demos/collection-refresh.cjs --drive-out <dir> --workspace /tmp/deck-copy
const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const root = d.prepared.root;
  if (!/^\/tmp\/|^\/private\/tmp\//.test(root) || fs.existsSync(path.join(root, '.git'))) throw new Error(`this walk edits notes and runs only on a throwaway copy under /tmp, not on ${root}`);
  const ws = d.prepared.id;
  const win = await d.open(`deck://${ws}/issues`);
  const t = lib(d, win);
  const { js, check, glass } = t;
  const issues = path.join(root, 'docs', 'issues');
  const fileOf = (id) => path.join(issues, fs.readdirSync(issues).find((f) => f.startsWith(`${id}-`)));
  const order = () => js(`[...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden).map((e) => e.dataset.noteId || 'group:' + e.dataset.groupKey)`);
  const note = () => js(`({ shown: !document.getElementById('collection-note').hidden, text: document.getElementById('collection-note').textContent, count: document.getElementById('collection-count').textContent })`);

  const before = await note();
  const total = Number(/(\d+) notes/.exec(before.count)[1]);
  // Three notes this view lists: one to open and then delete, one to change, one to keep the list scrolled to.
  const picked = await js(`(() => { const rows = [...document.querySelectorAll('#nav-list .nav-row')].filter((e) => !e.hidden && /^ISS-/.test(e.dataset.noteId)).map((e) => ({ id: e.dataset.noteId, status: (e.querySelector('.nav-status') || {}).textContent || '' })); const ids = [...new Set(rows.map((r) => r.id))]; return { open: ids[0], change: ids[1], rows: rows.length }; })()`);
  d.log('picked', picked);
  // Open one as a document, from its row.
  const row = await t.rect(`#nav-list .nav-row[data-note-id="${picked.open}"]`);
  await d.pointer(win, d.click({ x: row.left + 120, y: row.y }));
  await d.delay(1500);
  await t.park();
  const opened = await t.pane(picked.open);
  check(opened !== null && opened.state === 'ready' && opened.chars > 0, `${picked.open} is open as a document, with its text`, opened && { state: opened.state, chars: opened.chars });
  // Scroll the list so a known row is at its top, and rest the pointer on a row.
  // Open the largest folded heading, so the list is long, and scroll to a row well inside it.
  await js(`(() => { const folded = [...document.querySelectorAll('#nav-list .nav-group')].filter((e) => !e.hidden && e.getAttribute('aria-expanded') === 'false'); folded.sort((a, b) => Number(b.querySelector('.mark').textContent) - Number(a.querySelector('.mark').textContent)); folded[0].click(); })()`);
  await d.delay(900);
  await js(`(() => { const l = document.getElementById('nav-list'); const rows = [...l.querySelectorAll('.nav-row')].filter((e) => !e.hidden); const r = rows[Math.min(rows.length - 12, 34)]; l.scrollTop += r.getBoundingClientRect().top - l.getBoundingClientRect().top - 12; })()`);
  await d.delay(300);
  const anchor = await js(`(() => { const l = document.getElementById('nav-list'); const lt = l.getBoundingClientRect().top; const rows = [...l.children].filter((e) => !e.hidden && e.dataset.noteId && e.getBoundingClientRect().top >= lt); let g = rows[0]; while (g && !g.dataset.groupKey) g = g.previousElementSibling; return { id: rows[0].dataset.noteId, group: g ? g.dataset.groupKey : null, offset: Math.round(rows[0].getBoundingClientRect().top - lt), scrollTop: l.scrollTop }; })()`);
  const under = await js(t.rowInReach([picked.open, picked.change]));
  await d.pointer(win, [{ type: 'move', x: under.x, y: under.y }]);
  const orderBefore = await order();
  await d.shot(win, '01-before-the-change');

  // ---- The notes change on disk: one is deleted, one changes state, one is new ----
  const gone = fileOf(picked.open);
  const changed = fileOf(picked.change);
  const text = fs.readFileSync(changed, 'utf-8');
  const was = /^status:\s*(.+)$/m.exec(text)[1].trim();
  const next = was === 'fixed' ? 'open' : 'fixed';
  fs.writeFileSync(changed, text.replace(/^status:\s*.+$/m, `status: ${next}`));
  fs.writeFileSync(path.join(issues, 'ISS-9999-A-Note-That-Arrived-While-The-List-Was-Open.md'), ['---', 'type: "[[issue]]"', 'id: ISS-9999', 'aliases: [ISS-9999]', 'title: "A note that arrived while the list was open"', 'status: open', 'severity: low', 'created: 2026-10-01', 'updated: 2026-10-01', '---', '', '# A note that arrived while the list was open', '', 'Written by the collection-refresh walk into a throwaway copy.', ''].join('\n'));
  fs.unlinkSync(gone);
  d.log('changed on disk', { deleted: path.basename(gone), status: `${picked.change}: ${was} -> ${next}`, added: 'ISS-9999' });
  let said = await note();
  // Three files changed, and the sidecar may tell of them one at a time: wait until all three are counted.
  for (let i = 0; i < 40 && !(said.shown && /added/.test(said.text) && /removed/.test(said.text)); i += 1) { await d.delay(500); said = await note(); }
  const orderHeld = await order();
  check(said.shown && /changed/.test(said.text) && /apply/.test(said.text), 'the collection announces that notes changed, how many of each kind, and offers to apply it', said);
  check(JSON.stringify(orderHeld) === JSON.stringify(orderBefore) && said.count === before.count, 'until then no row has moved, arrived or left under the pointer, and the count is still the list on screen', { rows: orderHeld.length, count: said.count });
  const stays = await js(`(() => { const p = document.querySelector('.pane[data-note-id="${picked.open}"]'); return { state: p.dataset.state, chars: p.querySelector('.pane-note').textContent.length, said: p.querySelector('.pane-state').textContent, buttons: [...p.querySelectorAll('.pane-state button')].map((b) => b.textContent), actionsShown: getComputedStyle(p.querySelector('.pane-actions')).display !== 'none', ticksShown: [...p.querySelectorAll('.tick')].some((b) => getComputedStyle(b).display !== 'none') }; })()`);
  check(stays.chars === opened.chars && stays.state === 'stale' && /as it was last read/.test(stays.said) && /deleted, renamed or moved/.test(stays.said) && stays.buttons.includes('retry') && stays.buttons.includes('close') && !stays.actionsShown && !stays.ticksShown, 'the open document of the note that was deleted keeps the text that was read, says it is the text as last read and why, and offers nothing that would write', stays);
  check(JSON.stringify(orderHeld) === JSON.stringify(orderBefore), 'including the rows for what the open note is joined to', { before: orderBefore.length, held: orderHeld.length, firstDifference: orderBefore.find((id, i) => orderHeld[i] !== id) || null });
  await d.shot(win, '02-change-announced');

  // ---- Apply ----
  await js(`document.querySelector('#collection-note button').scrollIntoView({ block: 'nearest' })`);
  await t.clickOn('#collection-note button', 1500);
  const after = await note();
  const orderAfter = await order();
  const anchorAfter = await js(`(() => { const l = document.getElementById('nav-list'); const lt = l.getBoundingClientRect().top; const group = ${JSON.stringify(anchor.group)}; const row = [...l.children].filter((e) => { if (e.hidden || e.dataset.noteId !== ${JSON.stringify(anchor.id)}) return false; let g = e; while (g && !g.dataset.groupKey) g = g.previousElementSibling; return (g ? g.dataset.groupKey : null) === group; })[0]; return row ? { id: row.dataset.noteId, offset: Math.round(row.getBoundingClientRect().top - lt), scrollTop: l.scrollTop } : null; })()`);
  const listed = (list, id) => list.slice(list.findIndex((x) => x.startsWith('group:') && !x.startsWith('group:g:deck:'))).filter((x) => x === id).length;
  d.log('where the deleted note is listed after applying', orderAfter.map((x, i) => (x === picked.open ? orderAfter.slice(0, i).reverse().find((g) => g.startsWith('group:')) : null)).filter(Boolean));
  check(listed(orderAfter, 'ISS-9999') === 1 && listed(orderBefore, picked.open) >= 1 && listed(orderAfter, picked.open) === 0 && Number(/(\d+) notes/.exec(after.count)[1]) === total, 'applied, the new note has a row, the deleted one has none under any heading of the view, and the count is the new exact count (one in, one out)', { count: after.count, new: listed(orderAfter, 'ISS-9999'), deletedBefore: listed(orderBefore, picked.open), deletedAfter: listed(orderAfter, picked.open) });
  check(anchorAfter !== null && Math.abs(anchorAfter.offset - anchor.offset) <= 1, 'the list is still scrolled to the same note, at the same place', { anchor, anchorAfter });
  check(new RegExp(`${picked.open} is no longer in this list; its document stays open`).test(after.text), 'the collection says the open note is no longer in the list and that its document stays open', after.text);
  const kept = await js(`(() => { const p = document.querySelector('.pane[data-note-id="${picked.open}"]'); return p ? { state: p.dataset.state, text: p.querySelector('.pane-state').textContent, chars: p.querySelector('.pane-note').textContent.length, title: p.querySelector('.pane-title').textContent, buttons: [...p.querySelectorAll('.pane-state button')].map((b) => b.textContent) } : null; })()`);
  check(kept !== null && kept.title === opened.title && kept.chars === opened.chars && kept.state === 'stale' && kept.buttons.includes('close'), 'its document still has its title and the text that was read, labelled as last read, and can be closed', kept);
  await d.shot(win, '03-applied');
  // Closing it: there is no row to return to, so the collection says so and takes the keyboard.
  await t.clickOn(`.pane[data-note-id="${picked.open}"] .pane-close`, 900);
  const closed = await js(`({ held: window.__deckDesk().length, active: document.activeElement.id || document.activeElement.className, status: document.getElementById('status').textContent })`);
  check(closed.held === 0 && /collection-head/.test(closed.active) && /not in this list any more/.test(closed.status), 'closed, the keyboard goes to the collection and the status line says the note is not in the list any more', closed);
  await d.shot(win, '04-closed-with-no-row');
  d.log('summary', t.summary());
};
