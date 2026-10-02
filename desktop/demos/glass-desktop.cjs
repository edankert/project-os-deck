// The Glass desktop, walked with a real pointer and keyboard: the collection
// on the field, the full note opening from a row and from a card, reading it,
// what it is joined to, and the way back to the row (FEAT-0020).
//
//   bash tools/scripts/walk-in-a-box.sh glass-desktop
//
// It follows TST-0063's steps as far as a script can. What a script cannot do
// is listed at the end of its log: it is not a person's walk and records no
// acceptance verdict.
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const win = await d.open(`deck://${d.prepared.id}/features`);
  const t = lib(d, win);
  const { js, check, rect, text, glass } = t;
  const ws = d.prepared.id;
  const size = await js('({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio })');
  d.log('window', size);

  // ---- 1. The collection: on the field, exact, searchable, movable ----
  await d.shot(win, '01-collection-on-the-field');
  const nav = await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/nav?mode=features`)).json();
  const sourceIds = new Set();
  const walk = (items) => { for (const item of items || []) { if (item.id) sourceIds.add(item.id); walk(item.children || item.items || []); } };
  for (const group of nav.groups) walk(group.items);
  const col = await js(`({ inField: document.getElementById('field').contains(document.getElementById('collection')), listInside: document.getElementById('collection').contains(document.getElementById('nav-list')), column: getComputedStyle(document.querySelector('.body > .navigator') || document.body).display, name: document.getElementById('collection-name').textContent, count: document.getElementById('collection-count').textContent, places: document.getElementById('collection-places').textContent })`);
  check(col.inField && col.listInside, 'the list is an object on the Glass surface, not a column beside it', col);
  check(col.count === `${sourceIds.size} notes`, `the collection's count is the number of notes the sidecar returns for this view (${sourceIds.size})`, col.count);
  // Every member has a row once every heading and every note that holds others is opened.
  const memberRows = await js(`(async () => {
    const send = (a) => window.deck.state.dispatch(a);
    const before = { ...window.__deckLastState.folds };
    for (let pass = 0; pass < 6; pass += 1) {
      const closed = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden && ((e.classList.contains('nav-group') && e.getAttribute('aria-expanded') === 'false') || (e.classList.contains('nav-row') && !e.querySelector('.twist').hidden && e.querySelector('.twist').textContent === '▸')));
      if (closed.length === 0) break;
      for (const e of closed) (e.classList.contains('nav-group') ? e : e.querySelector('.twist')).click();
      await new Promise((r) => setTimeout(r, 500));
    }
    const ids = new Set([...document.querySelectorAll('#nav-list .nav-row')].filter((e) => !e.hidden).map((e) => e.dataset.noteId));
    // Put the folds back as they were: this was a look, not a rearrangement.
    for (const key of Object.keys(window.__deckLastState.folds)) if (before[key] !== window.__deckLastState.folds[key]) await send({ type: 'set-fold', key, folded: before[key] === undefined ? !window.__deckLastState.folds[key] : before[key] });
    await new Promise((r) => setTimeout(r, 400));
    return [...ids];
  })()`);
  const viewIds = new Set(memberRows.filter((id) => sourceIds.has(id)));
  const missing = [...sourceIds].filter((id) => !viewIds.has(id));
  check(missing.length === 0, 'every counted member has a row in the list, including notes held under another', { rows: viewIds.size, source: sourceIds.size, missing: missing.slice(0, 8) });
  const placed = await js(`(() => { const p = ${glass}.placedIds(); return { size: p.size }; })()`);
  const places = /(\d+) have a place in the field · (\d+) are in this list only|all (\d+) have a place/.exec(col.places);
  check(places !== null, 'the collection says how many members the field has a place for, and how many are in the list only', { said: col.places, slots: placed.size });

  // Search narrows the list and the header says so; nothing is added to the count's meaning.
  const search = await rect('#search');
  await d.pointer(win, d.click(search));
  for (const ch of 'glass') { d.press(win, ch); await d.delay(40); }
  await d.delay(700);
  const narrowed = await js(`({ count: document.getElementById('collection-count').textContent, filter: document.getElementById('collection-filter').textContent, rows: [...document.querySelectorAll('#nav-list .nav-row')].filter((e) => !e.hidden).length, zoom: ${glass}.zoom().scale })`);
  check(/^\d+ of \d+ notes$/.test(narrowed.count) && narrowed.filter.includes('glass') && narrowed.zoom === 1, 'typing in the search narrows the list, the header says how many of how many and by what, and the letters do not zoom the field', narrowed);
  await d.shot(win, '02-collection-narrowed');
  // Nothing matches: the query is named, zero is shown and Clear filters is offered.
  for (const ch of 'zzqx') { d.press(win, ch); await d.delay(40); }
  await d.delay(700);
  const none = await js(`({ count: document.getElementById('collection-count').textContent, state: document.getElementById('nav-state').textContent, hidden: document.getElementById('nav-state').hidden })`);
  check(/^0 of \d+ notes$/.test(none.count) && !none.hidden && /No note in Features matches/.test(none.state) && /clear filters/.test(none.state), 'a search that matches nothing names the query, shows zero and offers Clear filters', none);
  await d.shot(win, '03-collection-nothing-matches');
  await t.clickOn('#nav-state button');
  await d.delay(600);
  check((await text('#collection-count')) === `${sourceIds.size} notes` && (await js(`document.getElementById('search').value`)) === '', 'Clear filters brings the whole collection back', await text('#collection-count'));

  // Resize it by its corner and move it by its header: the store keeps the place, and no row.
  const before = await rect('#collection');
  const corner = await rect('#collection-resize');
  await d.pointer(win, d.drag(corner, { x: corner.x + 70, y: corner.y - 120 }, 8));
  await d.delay(400);
  const resized = await rect('#collection');
  const head = await rect('#collection-name');
  await d.pointer(win, d.drag(head, { x: head.x + 30, y: head.y + 40 }, 8));
  await d.delay(400);
  const moved = await rect('#collection');
  const stored = (await t.state()).collections[ws].features;
  check(Math.abs(resized.width - before.width - 70) <= 1 && Math.abs(resized.height - before.height + 120) <= 1 && Math.abs(moved.left - before.left - 30) <= 1 && Math.abs(moved.top - before.top - 40) <= 1 && Math.abs(moved.width - resized.width) <= 1, 'the collection is resized by its corner and moved by its header, and moving it does not change its size', { before: [before.left, before.top, before.width, before.height], resized: [resized.width, resized.height], moved: [moved.left, moved.top, moved.width, moved.height] });
  check(JSON.stringify(Object.keys(stored).sort()) === JSON.stringify(['collapsed', 'h', 'presentation', 'w', 'x', 'y']), 'the store keeps where it stands and how it is presented, and none of its rows', stored);

  // ---- 2. A row is selected, the list scrolled, collapsed and opened again ----
  const scrolledTo = await js(`(() => { const l = document.getElementById('nav-list'); l.scrollTop = Math.min(180, l.scrollHeight - l.clientHeight); return l.scrollTop; })()`);
  await d.delay(200);
  const anchorBefore = await js(`(() => { const l = document.getElementById('nav-list'); const rows = [...l.children].filter((e) => !e.hidden && e.dataset.noteId && e.offsetTop >= l.scrollTop); return rows[0] ? { id: rows[0].dataset.noteId, offset: rows[0].offsetTop - l.scrollTop } : null; })()`);
  await t.clickOn('#collection-fold', 500);
  const collapsed = await js(`({ h: document.getElementById('collection').getBoundingClientRect().height, listShown: document.getElementById('nav-list').offsetParent !== null, name: document.getElementById('collection-name').textContent, count: document.getElementById('collection-count').textContent, expanded: document.getElementById('collection-fold').getAttribute('aria-expanded') })`);
  check(collapsed.h <= 36 && !collapsed.listShown && collapsed.name === 'Features' && collapsed.count === `${sourceIds.size} notes` && collapsed.expanded === 'false', 'collapsed, the collection is its header: the query, its exact count, and a control that says it is closed', collapsed);
  await d.shot(win, '04-collection-collapsed');
  await t.clickOn('#collection-fold', 700);
  const reopened = await js(`(() => { const l = document.getElementById('nav-list'); const r = document.getElementById('collection').getBoundingClientRect(); const rows = [...l.children].filter((e) => !e.hidden && e.dataset.noteId && e.offsetTop >= l.scrollTop); return { w: r.width, h: r.height, scrollTop: l.scrollTop, id: rows[0] ? rows[0].dataset.noteId : null, offset: rows[0] ? rows[0].offsetTop - l.scrollTop : null }; })()`);
  check(Math.abs(reopened.w - resized.width) <= 1 && Math.abs(reopened.h - resized.height) <= 1 && scrolledTo > 0 && anchorBefore !== null && reopened.id === anchorBefore.id && Math.abs(reopened.offset - anchorBefore.offset) <= 1, 'opened again it has the size it had and is scrolled to the same row', { scrolledTo, anchorBefore, reopened });

  // ---- 3. A document opens from a card in the field, and from a row ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  await t.park();
  const card = await js(`(async () => {
    const g = ${glass}; const f = document.getElementById('field').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, width: r.width, height: r.height }; }).filter((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 30 && c.y < f.bottom - 30 && (document.elementFromPoint(c.x, c.y)?.closest('.field-card')?.dataset.noteId === c.id));
    for (const c of cards) { const ctx = await g.hooks.context(c.id).catch(() => null); const n = ctx ? new Set([...ctx.linked, ...ctx.backlinks].map((i) => i.id)).size : 0; if (n >= 5 && n <= 30) return { ...c, n }; }
    return cards[0] || null;
  })()`);
  if (!card) throw new Error('no card in sight to open');
  d.log('the card to open', card);
  const fieldBefore = await js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);
  // Watch the first frames: the document is there, named, before the opening is over.
  const watch = js(`new Promise((resolve) => { const seen = []; const t0 = performance.now(); const look = () => { const p = document.querySelector('.pane[data-note-id="${card.id}"]'); if (p) { const r = p.getBoundingClientRect(); seen.push({ at: Math.round(performance.now() - t0), left: Math.round(r.left), width: Math.round(r.width), title: p.querySelector('.pane-title').textContent.length > 0, state: p.dataset.state, opening: ${glass}.isOpening() }); } if (performance.now() - t0 < 900) requestAnimationFrame(look); else resolve(seen); }; look(); })`);
  await d.pointer(win, [...d.click(card), { type: 'move', x: card.x + 3, y: card.y + 3 }]);
  const frames = await watch;
  await t.park();
  const first = frames[0];
  const settled = frames[frames.length - 1];
  const fromCard = first && Math.abs(first.left - card.left) < Math.abs(first.left - settled.left) + 1;
  check(first !== undefined && first.title && frames.some((f) => f.opening) && settled.opening === false, 'the document appears at once, named, and its opening ends within the first second', { first, settled, frames: frames.length });
  check(fromCard, 'it grows from the card that was clicked, not from somewhere else', { card: [Math.round(card.left), Math.round(card.width)], first: first && [first.left, first.width], settled: [settled.left, settled.width] });
  const opened = frames.filter((f) => f.opening).map((f) => f.at);
  d.log('the opening lasted', { firstFrameMs: opened[0], lastFrameMs: opened[opened.length - 1], frames: opened.length });
  await d.delay(600);
  await d.shot(win, '05-document-from-a-card');
  const doc = await t.pane(card.id);
  const twice = await t.drawnTwice();
  check(doc !== null && doc.state === 'ready' && doc.chars > 200 && doc.title.length > 0, 'the document holds the full authored text under its title, with no summary to click through', doc);
  check(twice.twice.length === 0 && twice.cardForHeld.length === 0, 'the open note is one object: no card is drawn for it and no neighbour is drawn twice', twice);
  // A note has a row under more than one heading; one of them in view, below any heading stuck to the top, is what is asked.
  const row = await js(`(() => { const rows = [...document.querySelectorAll('#nav-list .nav-row')].filter((e) => !e.hidden && e.dataset.noteId === ${JSON.stringify(card.id)}); if (rows.length === 0) return null; const lb = document.getElementById('nav-list').getBoundingClientRect(); const seen = rows.filter((r) => { const b = r.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + 100, b.top + b.height / 2); return b.top >= lb.top - 1 && b.bottom <= lb.bottom + 1 && hit && hit.closest('.nav-row') === r; }); const r = seen[0] || rows[0]; return { rows: rows.length, current: r.getAttribute('aria-current'), onDesk: r.dataset.onDesk, inView: seen.length > 0 }; })()`);
  check(row !== null && row.current === 'true' && row.onDesk === 'true' && row.inView, 'opening a card shows its row in the collection, marked as the open note', row);

  // The details: the path is there, and not in the heading.
  await t.clickOn(`.pane[data-note-id="${card.id}"] .pane-info`, 400);
  const details = await js(`(() => { const p = document.querySelector('.pane[data-note-id="${card.id}"]'); return { details: p.querySelector('.pane-details').textContent, head: p.querySelector('.pane-head').textContent, label: p.querySelector('.pane-head').getAttribute('aria-label') }; })()`);
  check(/stored at.*\.md/.test(details.details) && !/\.md/.test(details.head) && /stored at .*\.md/.test(details.label), 'the path is under Details and in the accessible name, and not in the heading', details);
  await d.shot(win, '06-details');
  await t.clickOn(`.pane[data-note-id="${card.id}"] .pane-info`, 300);
  // Escape puts the gathered cards back: every card is exactly where it stood, and the document stays.
  await js(`document.getElementById('field').focus()`);
  d.press(win, 'Escape');
  await d.delay(800);
  const fieldAfter = await js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);
  const compared = Object.keys(fieldBefore).filter((id) => id !== card.id);
  const strayed = compared.filter((id) => fieldAfter[id] !== fieldBefore[id]);
  const leftFocus = await js(`({ focus: ${glass}.focusId(), held: window.__deckDesk().length, seated: document.querySelectorAll('.field-card.seated').length, leave: document.getElementById('leave-focus').hidden, sweep: document.getElementById('sweep-desk').hidden })`);
  check(leftFocus.focus === null && leftFocus.held === 1 && leftFocus.seated === 0 && leftFocus.leave && !leftFocus.sweep, 'Escape puts the gathered cards back and closes nothing; "close all" is still offered by name', leftFocus);
  check(strayed.length === 0 && compared.length > 5, 'every card that was in the field before the note was opened is back exactly where it stood', { compared: compared.length, strayed: strayed.slice(0, 6) });
  await d.shot(win, '06b-cards-back-document-stays');
  // Enter on the header gathers them again.
  await js(`document.querySelector('.pane[data-note-id="${card.id}"] .pane-head').focus()`);
  d.press(win, 'Enter');
  await d.delay(900);
  check((await js(`${glass}.focusId()`)) === card.id, 'Enter on the header gathers what it is joined to again', await js(`${glass}.focusState().seated.length`));

  // ---- 4. Reading: scroll to the end, select text, drag, resize, turn away and find ----
  const body = await rect(`.pane[data-note-id="${card.id}"] .pane-body`);
  const zoomBefore = await js(`({ zoom: ${glass}.zoom(), yaw: ${glass}.model.yaw })`);
  for (let i = 0; i < 80; i += 1) { d.wheel(win, body.x, body.y, 240); await d.delay(12); }
  await d.delay(300);
  // And on past the end: the gesture must stop in the document.
  for (let i = 0; i < 12; i += 1) { d.wheel(win, body.x, body.y, 240); await d.delay(20); }
  await d.delay(300);
  const atEnd = await t.pane(card.id);
  const zoomAfter = await js(`({ zoom: ${glass}.zoom(), yaw: ${glass}.model.yaw })`);
  check(atEnd.scrollMax > 0 && Math.abs(atEnd.scrollTop - atEnd.scrollMax) <= 1 && JSON.stringify(zoomBefore) === JSON.stringify(zoomAfter), 'the wheel over the document scrolls it to its end and, there, does not zoom or turn the field', { scrollTop: atEnd.scrollTop, scrollMax: atEnd.scrollMax, zoomBefore, zoomAfter });
  for (let i = 0; i < 100; i += 1) { d.wheel(win, body.x, body.y, -240); await d.delay(10); }
  await d.delay(300);
  const atTop = await t.pane(card.id);
  check(atTop.scrollTop === 0 && JSON.stringify(zoomBefore) === JSON.stringify(await js(`({ zoom: ${glass}.zoom(), yaw: ${glass}.model.yaw })`)), 'and the same at its top', { scrollTop: atTop.scrollTop });
  // Dragging across the text selects it and moves nothing.
  const para = await js(`(() => { const p = [...document.querySelectorAll('.pane[data-note-id="${card.id}"] .pane-note p')].find((e) => e.textContent.length > 80 && e.getBoundingClientRect().top > 0); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left + 4, right: r.right - 8, y: r.top + 9 }; })()`);
  if (para) {
    await d.pointer(win, d.drag({ x: para.left, y: para.y }, { x: para.right, y: para.y }, 10));
    await d.delay(200);
    const selected = await js(`String(window.getSelection())`);
    const after = await t.pane(card.id);
    check(selected.length > 10 && after.left === doc.left && after.top === doc.top && after.width === doc.width, 'dragging across the text selects the text, and the document does not move or change size', { selected: selected.slice(0, 60), left: [doc.left, after.left] });
    await js(`window.getSelection().removeAllRanges()`);
  }
  // Drag the header: the document moves with what is gathered round it, at the same size.
  const focusBefore = await js(`${glass}.focusState()`);
  const headAt = await rect(`.pane[data-note-id="${card.id}"] .pane-title`);
  await d.pointer(win, d.drag(headAt, { x: headAt.x - 90, y: headAt.y + 50 }, 12));
  await d.delay(600);
  const focusAfter = await js(`${glass}.focusState()`);
  const offsets = (s) => JSON.stringify(s.seated.map((c) => [c.id, Math.round(c.x - s.pane.left), Math.round(c.y - s.pane.top)]).sort());
  check(focusAfter.noteId === card.id && focusAfter.pane.width === focusBefore.pane.width && focusAfter.pane.height === focusBefore.pane.height && offsets(focusBefore) === offsets(focusAfter) && focusAfter.seated.length === focusBefore.seated.length, 'dragging the header moves the document with what is gathered round it; its size and the arrangement are unchanged', { before: focusBefore.pane, after: focusAfter.pane, seated: focusAfter.seated.length });
  await d.shot(win, '07-dragged-with-its-neighbourhood');
  // Resize it by the corner: that, and only that, changes its size.
  const cornerAt = await rect(`.pane[data-note-id="${card.id}"] .pane-resize`);
  await d.pointer(win, d.drag({ x: cornerAt.x, y: cornerAt.y }, { x: cornerAt.x + 80, y: cornerAt.y + 40 }, 8));
  await d.delay(900);
  const sizedState = await t.state();
  const sized = (sizedState.viewDesks[ws].features || []).find((c) => c.noteId === card.id);
  const pref = sizedState.readingSizes[ws] && sizedState.readingSizes[ws].features;
  check(sized && sized.w === focusBefore.pane.width + 80 && sized.h === focusBefore.pane.height + 40 && pref && pref.w === sized.w && pref.h === sized.h, 'the corner resizes it, and that size becomes the size the next note opens at on this view', { sized, pref });
  // Turn the field away: the document goes with it; "find" brings the desk back.
  const ground = await t.background(300);
  if (!ground) throw new Error('no clear background to turn the field from');
  await d.pointer(win, d.drag(ground, { x: ground.x - 300, y: ground.y }, 14));
  await d.delay(400);
  const away = await js(`({ yaw: ${glass}.model.yaw, find: document.getElementById('find-open').hidden ? null : document.getElementById('find-open').textContent, collection: document.getElementById('to-collection').hidden ? null : 'offered', pane: (() => { const p = document.querySelector('.pane[data-note-id="${card.id}"]'); return { sight: Number(p.dataset.sight), opaque: getComputedStyle(p).opacity === '1', hidden: p.classList.contains('out-of-sight') }; })() })`);
  check(Math.abs(away.yaw) > 0.5 && away.find === `find ${card.id}` && away.collection === 'offered' && (away.pane.hidden || (away.pane.sight < 0.7 && away.pane.opaque)), 'turning the field away takes the desk with it, dimmed and still opaque, and "find" and "collection" are offered by name', away);
  await d.shot(win, '08-turned-away');
  await t.clickOn('#find-open', 800);
  const back = await t.pane(card.id);
  const backFocus = await js(`${glass}.focusState()`);
  check(back.sight === 1 && !back.hidden && back.width === sized.w && offsets(backFocus) !== '[]' && backFocus.seated.length === focusBefore.seated.length, '"find" brings the document back in front, at its size, with its neighbourhood still attached', { back: [back.left, back.top, back.width, back.height], seated: backFocus.seated.length });
  await d.shot(win, '09-found-again');

  // ---- 5. A link inside the note opens the note it names, here ----
  const first1 = card.id;
  const link = await js(`(() => { const body = document.querySelector('.pane[data-note-id="${first1}"] .pane-body'); const held = new Set(window.__deckDesk()); const b = body.getBoundingClientRect(); for (const a of body.querySelectorAll('.pane-note a[href^="/docs/"]')) { const id = (a.textContent || '').trim(); if (held.has(id)) continue; body.scrollTop += a.getBoundingClientRect().top - b.top - 80; const r = a.getClientRects()[0]; if (r && r.width > 0 && r.top > b.top && r.bottom < b.bottom) return { href: a.getAttribute('href'), text: id, x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top }; } return null; })()`);
  let second = null;
  if (link) {
    const address = await js('location.href');
    await d.pointer(win, d.click(link));
    await d.delay(1500);
    await t.park();
    const held = await js('window.__deckDesk()');
    second = held.length === 2 ? held[1] : null;
    const linked = second === null ? null : await t.pane(second);
    check((await js('location.href')) === address && held.length === 2 && held[0] === first1 && linked !== null && linked.state === 'ready' && linked.chars > 0, 'a link inside the note opens the note it names as a second document; the window does not leave Deck and the first document stays open', { link: link.href, held, linked: linked && { title: linked.title, state: linked.state, chars: linked.chars } });
    check(second !== null && (await js(`${glass}.focusId()`)) === second && (await t.drawnTwice()).twice.length === 0, 'the document just opened is the one whose neighbourhood is gathered, and nothing is drawn twice', await js(`${glass}.focusState().seated.length`));
    await d.shot(win, '10-a-link-followed');
  } else {
    d.log('NOT RUN: the opened note has no link to another note in its text');
  }

  // ---- 6. What it is joined to: the complete list, in the source's own words ----
  const top = second || first1;
  await t.clickOn(`.pane[data-note-id="${top}"] .pane-related`, 900);
  const graph = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
  const related = await js(`(() => { const p = document.querySelector('.pane[data-note-id="${top}"]'); return { button: p.querySelector('.pane-related').textContent, rows: [...p.querySelectorAll('.link-row')].map((r) => ({ id: r.dataset.noteId, kind: r.querySelector('.link-kind').textContent, dir: r.querySelector('.link-dir').textContent, where: (r.querySelector('.link-where') || {}).textContent || '' })) }; })()`);
  const context = await js(`${glass}.hooks.context(${JSON.stringify(top)}).then((c) => [...new Set([...c.linked, ...c.backlinks].map((i) => i.id))])`);
  check(related.rows.length === context.length && related.button === `${context.length} related`, 'the related list has a row for every note the sidecar says it is joined to, and the header says how many', { rows: related.rows.length, context: context.length, button: related.button });
  // Each word is a key the source wrote, or "link": checked against Deck's own index of the files.
  const wrote = new Map();
  for (const e of graph.edges) {
    if (e.target === null) continue;
    for (const [x, y] of [[e.source, e.target], [e.target, e.source]]) { if (x !== top) continue; if (!wrote.has(y)) wrote.set(y, new Set()); wrote.get(y).add(e.field === null ? 'link' : e.field); }
  }
  // A pair Deck's index has no edge for (the sidecar knows of it and Deck's index does not) may only say "link".
  const invented = related.rows.filter((r) => { const words = r.kind.split(' · ').filter(Boolean); const allowed = wrote.get(r.id) || new Set(['link']); return words.length === 0 || words.some((w) => !allowed.has(w)); });
  check(invented.length === 0, 'every relationship word is a frontmatter key the source wrote for that pair, or "link"; none is invented', { rows: related.rows.slice(0, 6), invented: invented.slice(0, 5), named: related.rows.filter((r) => r.kind !== 'link').length });
  check(related.rows.every((r) => ['→', '←', '↔'].includes(r.dir)), 'every row keeps its direction', [...new Set(related.rows.map((r) => r.dir))]);
  await d.shot(win, '11-related-list');
  // Escape in the list closes the list, and only the list.
  await js(`document.querySelector('.pane[data-note-id="${top}"] .link-go').focus()`);
  d.press(win, 'Escape');
  await d.delay(400);
  const afterEsc = await js(`({ open: !document.querySelector('.pane[data-note-id="${top}"] .pane-links').hidden, held: window.__deckDesk().length, focus: ${glass}.focusId(), active: document.activeElement.className })`);
  check(!afterEsc.open && afterEsc.held === (second ? 2 : 1) && afterEsc.focus === top && /pane-related/.test(afterEsc.active), 'Escape in the list closes the list and nothing else: the documents stay, the focus stays, and the keyboard is on the control that opened it', afterEsc);
  // Open a neighbour from its row in the list.
  await t.clickOn(`.pane[data-note-id="${top}"] .pane-related`, 600);
  const target = related.rows.find((r) => !r.where.includes('open'));
  if (target) {
    const before = await js('window.__deckDesk().length');
    await js(`document.querySelector('.pane[data-note-id="${top}"] .link-row[data-note-id="${target.id}"] .link-open').scrollIntoView({ block: 'center' })`);
    await t.clickOn(`.pane[data-note-id="${top}"] .link-row[data-note-id="${target.id}"] .link-open`, 1500);
    await t.park();
    const held = await js('window.__deckDesk()');
    check(held.length === before + 1 && held[held.length - 1] === target.id && (await t.drawnTwice()).cardForHeld.length === 0, 'a row of the list opens that neighbour as a document of its own, and its card is not also drawn', held);
    await d.shot(win, '12-three-documents');
  }

  // ---- 7. Escape, in order, and the two named controls ----
  const heldNow = await js('window.__deckDesk()');
  // The keyboard is in the open list, so the first Escape is the list's own.
  await js(`(document.querySelector('.pane[data-note-id="${top}"] .link-go') || document.body).focus()`);
  d.press(win, 'Escape');
  await d.delay(500);
  const local = await js(`({ listOpen: !document.querySelector('.pane[data-note-id="${top}"] .pane-links').hidden, focus: ${glass}.focusId(), held: window.__deckDesk().length })`);
  check(!local.listOpen && local.focus !== null && local.held === heldNow.length, 'with a list open, one Escape closes that list and does not also leave the focus or close a document', local);
  await js(`document.getElementById('field').focus()`);
  d.press(win, 'Escape');
  await d.delay(700);
  const left = await js(`({ focus: ${glass}.focusId(), held: window.__deckDesk().length, seated: document.querySelectorAll('.field-card.seated').length, leave: document.getElementById('leave-focus').hidden, sweep: document.getElementById('sweep-desk').hidden })`);
  check(left.focus === null && left.held === heldNow.length && left.seated === 0 && left.leave && !left.sweep, 'the next Escape puts the gathered cards back and closes none of the documents', left);

  await d.shot(win, '13-focus-left');
  await t.clickOn('#sweep-desk', 900);
  check((await js('window.__deckDesk().length')) === 0 && (await js(`document.querySelectorAll('.pane').length`)) === 0, '"close all" closes every document on this view', await js('window.__deckDesk()'));

  // ---- 8. The keyboard alone: list, open, read, related, close, back on the row ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  await js(`document.querySelector('#nav-list .nav-row:not([hidden])').focus()`);
  const startRow = await js(`({ id: document.activeElement.dataset.noteId, index: Number(document.activeElement.dataset.index) })`);
  await t.keys(['Down', 'Down']);
  const onRow = await js(`({ id: document.activeElement.dataset.noteId, index: Number(document.activeElement.dataset.index), top: Math.round(document.activeElement.getBoundingClientRect().top), scroll: document.getElementById('nav-list').scrollTop })`);
  d.press(win, 'Enter');
  await d.delay(1500);
  check(onRow.index === startRow.index + 2 && onRow.id !== startRow.id, 'the arrow keys move down the rows of the list', { startRow, onRow });
  const opened2 = await js(`({ held: window.__deckDesk(), active: document.activeElement.className, activeIn: (document.activeElement.closest('.pane') || { dataset: {} }).dataset.noteId || null, label: document.activeElement.getAttribute('aria-label') })`);
  check(opened2.held.length === 1 && opened2.held[0] === onRow.id && opened2.activeIn === onRow.id && /pane-head/.test(opened2.active), 'Enter on a row opens that note and puts the keyboard on its document, whose name says what the keys do', opened2);
  await t.keys(['r'], 600);
  const listOpen = await js(`({ open: !document.querySelector('.pane .pane-links').hidden, active: document.activeElement.className })`);
  await t.keys(['Escape'], 400);
  const listShut = await js(`({ open: !document.querySelector('.pane .pane-links').hidden, held: window.__deckDesk().length, active: document.activeElement.className })`);
  check(listOpen.open && /link-go|pane-related/.test(listOpen.active) && !listShut.open && listShut.held === 1 && /pane-related/.test(listShut.active), 'R opens the list of what it is joined to with the keyboard in it; Escape closes the list and the document stays', { listOpen, listShut });
  await js(`document.querySelector('.pane .pane-head').focus()`);
  const sizeBefore = await t.pane(onRow.id);
  await t.keys(['Right', 'Down'], 300);
  d.press(win, 'Right', ['alt']);
  await d.delay(500);
  const sizeAfter = await t.pane(onRow.id);
  check(sizeAfter.left === sizeBefore.left + 16 && sizeAfter.top === sizeBefore.top + 16 && sizeAfter.width === sizeBefore.width + 16 && sizeAfter.height === sizeBefore.height, 'arrows move the document and Alt with an arrow resizes it, as the header and the corner do', { before: [sizeBefore.left, sizeBefore.top, sizeBefore.width], after: [sizeAfter.left, sizeAfter.top, sizeAfter.width] });
  await js(`document.querySelector('.pane .pane-head').focus()`);
  d.press(win, 'Delete');
  await d.delay(900);
  const returned = await js(`({ held: window.__deckDesk().length, id: document.activeElement.dataset.noteId || null, cls: document.activeElement.className, top: Math.round(document.activeElement.getBoundingClientRect().top), scroll: document.getElementById('nav-list').scrollTop, yaw: ${glass}.model.yaw })`);
  check(returned.held === 0 && returned.id === onRow.id && /nav-row/.test(returned.cls) && Math.abs(returned.top - onRow.top) <= 1, 'Delete closes the document and the keyboard is back on the row it was opened from, at the same place in the list', { onRow, returned });
  await d.shot(win, '14-back-on-the-row');

  // ---- 9. A document whose row is folded away, and one already open ----
  const rowAt = await js(`(() => { const rows = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden); const i = rows.findIndex((e) => e.classList.contains('nav-row') && e.dataset.noteId === ${JSON.stringify(onRow.id)}); let g = i; while (g >= 0 && !rows[g].classList.contains('nav-group')) g -= 1; const r = rows[i].getBoundingClientRect(); const h = rows[g].getBoundingClientRect(); return { row: { x: r.left + 120, y: r.top + r.height / 2 }, group: rows[g].dataset.groupKey, head: { x: h.left + 60, y: h.top + h.height / 2 } }; })()`);
  await d.pointer(win, d.click(rowAt.row));
  await d.delay(1400);
  await t.park();
  // The same row again: the open document is found and raised, not opened twice.
  const again = await t.rect(`#nav-list .nav-row[data-note-id="${onRow.id}"]`);
  await d.pointer(win, d.click({ x: again.left + 120, y: again.y }));
  await d.delay(900);
  await t.park();
  check((await js(`document.querySelectorAll('.pane[data-note-id="${onRow.id}"]').length`)) === 1 && (await js('window.__deckDesk().length')) === 1, 'choosing the row of a note that is already open finds and raises its document; there is still one', await js('window.__deckDesk()'));

  // ---- 10. A read that fails says so, and Retry reads it ----
  // A note this walk has not read yet: one already read is shown from what was read.
  const readAlready = [card.id, second, target && target.id, onRow.id].filter(Boolean);
  const victim = await js(t.rowInReach(readAlready));
  let blocking = true;
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: blocking && /\/api\/render\?/.test(details.url) }));
  await d.pointer(win, d.click(victim));
  await d.delay(1800);
  await t.park();
  const failed = await js(`(() => { const p = document.querySelector('.pane[data-note-id="${victim.id}"]'); return p ? { state: p.dataset.state, text: p.querySelector('.pane-state').textContent, title: p.querySelector('.pane-title').textContent, buttons: [...p.querySelectorAll('.pane-state button')].map((b) => b.textContent), note: p.querySelector('.pane-note').textContent.length } : null; })()`);
  check(failed !== null && failed.state === 'error' && failed.title.length > 0 && failed.buttons.includes('retry') && failed.buttons.includes('close') && failed.note === 0, 'when the note cannot be read the document still opens, named, says that it could not be read, and offers Retry and Close', failed);
  await d.shot(win, '15-could-not-be-read');
  blocking = false;
  await js(`[...document.querySelectorAll('.pane[data-note-id="${victim.id}"] .pane-state button')].find((b) => b.textContent === 'retry').scrollIntoView({ block: 'center' })`);
  const retry = await js(`(() => { const b = [...document.querySelectorAll('.pane[data-note-id="${victim.id}"] .pane-state button')].find((x) => x.textContent === 'retry').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await d.pointer(win, d.click(retry));
  await d.delay(1500);
  const retried = await t.pane(victim.id);
  check(retried.state === 'ready' && retried.chars > 0, 'Retry reads the note and the text takes the place of the message', { state: retried.state, chars: retried.chars });
  win.webContents.session.webRequest.onBeforeRequest(null);

  // ---- 11. Reduced motion: the same end state, with no movement ----
  await t.clickIfShown('#sweep-desk', 900);
  d.press(win, 'Escape'); await d.delay(300); d.press(win, 'Escape'); await d.delay(700);
  const dbg = win.webContents.debugger;
  dbg.attach('1.3');
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await d.delay(300);
  const still = await js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const c = [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).find((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 30 && c.y < f.bottom - 30 && document.elementFromPoint(c.x, c.y)?.closest('.field-card')?.dataset.noteId === c.id); return c || null; })()`);
  if (still) {
    const quiet = js(`new Promise((resolve) => { const seen = []; const t0 = performance.now(); const look = () => { const p = document.querySelector('.pane[data-note-id="${still.id}"]'); if (p) { const r = p.getBoundingClientRect(); seen.push({ left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), opening: ${glass}.isOpening(), animations: p.getAnimations().length, gather: document.getElementById('field').classList.contains('gather') }); } if (performance.now() - t0 < 700) requestAnimationFrame(look); else resolve(seen); }; look(); })`);
    await d.pointer(win, [...d.click(still), { type: 'move', x: still.x + 3, y: still.y + 3 }]);
    const seen = await quiet;
    const lefts = new Set(seen.map((f) => `${f.left},${f.top},${f.width}`));
    check(seen.length > 0 && lefts.size === 1 && seen.every((f) => !f.opening && f.animations === 0 && !f.gather) && (await js('matchMedia("(prefers-reduced-motion: reduce)").matches')), 'with reduced motion the document is at its place and size on its first frame, and neither it nor the cards are animated', { frames: seen.length, places: [...lefts], first: seen[0] });
    await d.delay(500);
    await d.shot(win, '16-reduced-motion');
  }
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [] });
  dbg.detach();

  // ---- 12. Reload: the collection, the documents and their sizes come back ----
  const beforeReload = await js(`({ desk: window.__deckLastState.viewDesks[${JSON.stringify(ws)}].features, collection: window.__deckLastState.collections[${JSON.stringify(ws)}].features, panes: [...document.querySelectorAll('.pane')].map((p) => { const r = p.getBoundingClientRect(); return [p.dataset.noteId, Math.round(r.width), Math.round(r.height)]; }), col: (() => { const r = document.getElementById('collection').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })() })`);
  win.webContents.reload();
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
  await d.untilBooted(win);
  await d.delay(2500);
  const afterReload = await js(`({ panes: [...document.querySelectorAll('.pane')].map((p) => { const r = p.getBoundingClientRect(); return [p.dataset.noteId, Math.round(r.width), Math.round(r.height)]; }), states: [...document.querySelectorAll('.pane')].map((p) => p.dataset.state), col: (() => { const r = document.getElementById('collection').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(), count: document.getElementById('collection-count').textContent })`);
  check(JSON.stringify(afterReload.panes) === JSON.stringify(beforeReload.panes) && JSON.stringify(afterReload.col) === JSON.stringify(beforeReload.col) && afterReload.states.every((s) => s === 'ready') && afterReload.count === `${sourceIds.size} notes`, 'after a reload the collection is where it was, the open documents are open at their sizes with their text, and the count is read again from the source', { before: beforeReload.panes, after: afterReload });
  await d.shot(win, '17-after-reload');

  // ---- 13. A narrow window: one object in front, the same rows ----
  const full = win.getBounds();
  win.setBounds({ x: 0, y: 0, width: 780, height: 820 });
  await d.delay(900);
  const narrow = await js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const bar = document.getElementById('narrow-bar'); const shown = [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')); const p = shown[0] ? shown[0].getBoundingClientRect() : null; return { field: Math.round(f.width), bar: bar.hidden ? null : [...bar.querySelectorAll('button')].map((b) => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), shown: shown.length, pane: p && [Math.round(p.left - f.left), Math.round(p.width)], collectionHidden: document.getElementById('collection').classList.contains('out-of-sight') || document.getElementById('collection').hidden, overflow: document.documentElement.scrollWidth > window.innerWidth }; })()`);
  check(narrow.field < 720 && narrow.bar !== null && narrow.shown === 1 && narrow.pane[0] === 0 && narrow.pane[1] === narrow.field && !narrow.overflow, 'in a field narrower than 720 px one document fills it, a bar names the collection and each open note, and nothing overflows sideways', narrow);
  await d.shot(win, '18-narrow-document');
  await t.clickOn('#narrow-bar button[data-object="collection"]', 700);
  const narrowList = await js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const c = document.getElementById('collection').getBoundingClientRect(); return { col: [Math.round(c.left - f.left), Math.round(c.width)], field: Math.round(f.width), rows: [...document.querySelectorAll('#nav-list .nav-row')].filter((e) => !e.hidden).length, count: document.getElementById('collection-count').textContent, panes: [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')).length }; })()`);
  check(narrowList.col[0] === 0 && narrowList.col[1] === narrowList.field && narrowList.rows > 0 && narrowList.count === `${sourceIds.size} notes` && narrowList.panes === 0, '"Collection" puts the list in front, full width, with the same exact count and rows', narrowList);
  await d.shot(win, '19-narrow-collection');
  const nrow = await js(t.rowInReach());
  await d.pointer(win, d.click(nrow));
  await d.delay(1500);
  const narrowDoc = await js(`(() => { const shown = [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')); return { shown: shown.map((p) => p.dataset.noteId), state: shown[0] && shown[0].dataset.state, stored: window.__deckLastState.viewDesks[${JSON.stringify(ws)}].features.find((c) => c.noteId === ${JSON.stringify('__ID__')}) }; })()`.replace('__ID__', nrow.id));
  d.log('narrow, after the row', await js(`({ row: ${JSON.stringify(nrow)}, held: window.__deckDesk(), bar: [...document.querySelectorAll('#narrow-bar button')].map((b) => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), panes: [...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId + (p.classList.contains('out-of-sight') ? ' hidden' : '')), hit: (() => { const e = document.elementFromPoint(${nrow.x}, ${nrow.y}); return e ? e.className + ' / ' + (e.closest('.nav-row') ? e.closest('.nav-row').dataset.noteId : 'no row') : null; })(), status: document.getElementById('status').textContent })`));
  await d.shot(win, '19b-narrow-after-row');
  check(narrowDoc.shown.length === 1 && narrowDoc.shown[0] === nrow.id && narrowDoc.state === 'ready' && narrowDoc.stored && narrowDoc.stored.w >= 280, 'a row opened there comes to the front as the one document, and the size stored for it is a reading size, not the narrow window', narrowDoc);
  win.setBounds(full);
  await d.delay(900);
  const widened = await js(`[...document.querySelectorAll('.pane')].map((p) => { const r = p.getBoundingClientRect(); return [p.dataset.noteId, Math.round(r.width), Math.round(r.height), p.classList.contains('out-of-sight')]; })`);
  check(beforeReload.panes.every((p) => widened.some((w) => w[0] === p[0] && w[1] === p[1] && w[2] === p[2])) && (await js(`document.getElementById('narrow-bar').hidden`)), 'made wide again, each document is at the size it had before the window was narrow', widened);
  await d.shot(win, '20-wide-again');

  // ---- 14. A second window and a tablet page ----
  const deskBefore = JSON.stringify((await t.state()).viewDesks[ws].features);
  const page = d.openServedPage();
  // Shown, as a tablet's page is: a hidden window draws no frames, and the opening would never run.
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(3500);
  const pj = (code) => d.js(page, code);
  await pj(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === 'features').click()`);
  await d.delay(2500);
  const tablet = await pj(`({ bridge: typeof window.deck, surface: document.body.dataset.surface, collection: !document.getElementById('collection').hidden, count: document.getElementById('collection-count').textContent, panes: [...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId), w: window.innerWidth })`);
  d.log('the served page', tablet);
  if (tablet.surface !== 'glass') { await pj(`document.querySelector('[data-surface-id="glass"], #surface-glass')?.click()`); await d.delay(1500); }
  if (await pj(`!document.getElementById('narrow-bar').hidden`)) {
    const b = await pj(`(() => { const r = document.querySelector('#narrow-bar button[data-object="collection"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await d.pointer(page, d.click(b));
    await d.delay(700);
  }
  // The Mac's documents may lie over the list on a smaller page: "collection" brings it in front.
  const covered = await pj(`!document.getElementById('to-collection').hidden`);
  if (covered) {
    const b = await pj(`(() => { const r = document.getElementById('to-collection').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await d.pointer(page, d.click(b));
    await d.delay(700);
    const onTop = await pj(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((e) => !e.hidden && e.getBoundingClientRect().top > document.getElementById('nav-list').getBoundingClientRect().top); const b = r.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + 120, b.top + b.height / 2); return { hit: hit ? hit.closest('.nav-row') !== null : false, offered: !document.getElementById('to-collection').hidden }; })()`);
    check(onTop.hit && !onTop.offered, 'where documents lie over the list, "collection" is offered by name and brings the list in front of them', onTop);
  }
  const trow = await pj(t.rowInReach());
  if (trow) {
    await d.pointer(page, d.click(trow));
    await d.delay(2000);
    await d.shot(page, '21-served-page');
    const read = await pj(`(() => { const p = document.querySelector('.pane[data-note-id="${trow.id}"]'); return p ? { state: p.dataset.state, chars: p.querySelector('.pane-note').textContent.length, actions: p.querySelector('.pane-actions').children.length, ticks: p.querySelectorAll('.tick').length, verbs: p.querySelectorAll('.verb').length } : null; })()`);
    check(read !== null && read.state === 'ready' && read.chars > 0 && read.verbs === 0 && read.ticks === 0, 'on the served page a row opens the full note in a document, with no tick and no verb to press', read);
    check(JSON.stringify((await t.state()).viewDesks[ws].features) === deskBefore, 'reading on the served page changes nothing on the desk the application keeps', { before: deskBefore.length });
    d.log('the served page after the row', await pj(`({ panes: [...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId + (p.classList.contains('out-of-sight') ? ' (hidden)' : '')), narrow: !document.getElementById('narrow-bar').hidden, field: Math.round(document.getElementById('field').getBoundingClientRect().width), status: (document.getElementById('status') || {}).textContent })`));
  } else {
    d.log('NOT RUN: the served page showed no row to open', tablet);
  }
  page.destroy();

  d.log('what this walk does not establish', [
    'whether a person finds the route obvious or the motion helpful: that is TST-0063, walked by a person',
    'a screen reader: the names are present in the page, nobody has listened to them',
    'a touch screen: the served page was driven with a mouse pointer',
  ]);
  t.finish();
};
