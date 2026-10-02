// Collection forms and arrangements, walked with a real pointer and keyboard
// (FEAT-0022): the same members as a table, as cards and as a header alone;
// Read, Compare and Show related, each shown before it is applied; undo;
// picking out one relationship; and what happens when the desk or the notes
// change under a preview or an undo.
//
// It follows TST-0064's steps as far as a script can. It CHANGES NOTES ON
// DISK (a status, and one criterion ticked through the sidecar's own guarded
// route), so it runs only on a throwaway copy:
//   bash tools/scripts/walk-in-a-box.sh glass-arrangements --copy
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
  const coll = 'window.__deckCollection';
  const desk = () => js(`JSON.stringify(window.__deckLastState.viewDesks[${JSON.stringify(ws)}].features || [])`);
  const layout = () => js(`JSON.stringify(window.__deckLastState.collections[${JSON.stringify(ws)}] ? window.__deckLastState.collections[${JSON.stringify(ws)}].features : null)`);
  const arrange = () => js(`${glass}.arrangeState()`);
  const paneRect = (id) => js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)}); if (!p) return null; const r = p.getBoundingClientRect(); const f = document.getElementById('field').getBoundingClientRect(); return { left: Math.round(r.left - f.left), top: Math.round(r.top - f.top), width: Math.round(r.width), height: Math.round(r.height), scrollTop: p.querySelector('.pane-body').scrollTop, fontSize: getComputedStyle(p.querySelector('.pane-note')).fontSize }; })()`);
  const openRow = async (skip = []) => { const r = await js(t.rowInReach(skip)); await d.pointer(win, d.click(r)); await d.delay(1400); await t.park(); return r.id; };
  const press = async (id) => { await t.clickOn(`#${id}`, 500); };

  // ---- 1. The same members three ways ----
  const search = await t.rect('#search');
  await d.pointer(win, d.click(search));
  for (const ch of 'glass') { d.press(win, ch); await d.delay(40); }
  await d.delay(800);
  await t.park();
  const members = await js(`${coll}.members()`);
  const header = await t.text('#collection-count');
  check(members.length > 20 && header.startsWith(`${members.length} of `), 'as a table, narrowed by a search: the header counts the members the list holds', { members: members.length, header });
  await js(`(() => { const l = document.getElementById('nav-list'); l.scrollTop = Math.min(160, l.scrollHeight - l.clientHeight); })()`);
  await d.delay(200);
  const anchor = await js(`(() => { const l = document.getElementById('nav-list'); const lt = l.getBoundingClientRect().top; const r = [...l.children].find((e) => !e.hidden && e.dataset.noteId && e.getBoundingClientRect().top >= lt + 28); return { id: r.dataset.noteId, offset: Math.round(r.getBoundingClientRect().top - lt) }; })()`);
  // Stack.
  await press('collection-fold');
  const stack = await js(`({ count: document.getElementById('collection-count').textContent, filter: document.getElementById('collection-filter').textContent, members: ${coll}.members().length, h: Math.round(document.getElementById('collection').getBoundingClientRect().height), search: document.getElementById('search').value })`);
  check(stack.count === header && stack.members === members.length && /glass/.test(stack.filter) && stack.h <= 36 && stack.search === 'glass', 'as a stack: the header alone, with the same count, the same members and the filter named', stack);
  await d.shot(win, '01-stack');
  // Cards.
  await press('collection-as-cards');
  await d.delay(600);
  await t.park();
  const grid = await js(`${coll}.grid()`);
  const firstCards = await js(`[...document.querySelectorAll('.field-card.in-collection')].map((e) => e.dataset.noteId)`);
  check(grid !== null && grid.count === members.length && (await t.text('#collection-count')) === header, 'as cards: the same count and the same number of members', { grid, header });
  check(firstCards.includes(anchor.id), 'the cards open at the note the table was scrolled to', { anchor: anchor.id, first: members[grid.first], drawn: firstCards.length });
  await d.shot(win, '02-cards');
  // Every member is reached: walk the cards from the first to the last and collect what is drawn or referred to.
  const seen = new Set();
  const gridBox = await t.rect('#collection-grid');
  await js(`document.getElementById('collection-grid').focus()`);
  d.press(win, 'Home');
  await d.delay(300);
  let most = 0;
  for (let i = 0; i < 400; i += 1) {
    const page = await js(`({ cards: [...document.querySelectorAll('.field-card.in-collection')].map((e) => e.dataset.noteId), refs: [...document.querySelectorAll('.grid-ref')].map((e) => e.dataset.noteId), grid: ${coll}.grid() })`);
    most = Math.max(most, page.cards.length + page.refs.length);
    for (const id of [...page.cards, ...page.refs]) seen.add(id);
    if (page.grid.first + page.grid.drawn >= page.grid.count) break;
    d.press(win, 'PageDown');
    await d.delay(180);
  }
  const missing = members.filter((id) => !seen.has(id));
  const extra = [...seen].filter((id) => !members.includes(id));
  check(missing.length === 0 && extra.length === 0, `every member is drawn as a card on some page of the cards, and nothing else is: ${members.length} members, at most ${most} drawn at once`, { seen: seen.size, missing: missing.slice(0, 5), extra: extra.slice(0, 5), most });
  // The wheel over a card moves the cards and does not zoom the field.
  d.press(win, 'Home');
  await d.delay(300);
  const overCard = await js(`(() => { const e = document.querySelector('.field-card.in-collection'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (let i = 0; i < 3; i += 1) { d.wheel(win, overCard.x, overCard.y, 100); await d.delay(60); }
  await d.delay(400);
  const wheeled = await js(`({ grid: ${coll}.grid(), zoom: ${glass}.zoom().scale, yaw: ${glass}.model.yaw })`);
  check(wheeled.grid.firstRow > 0 && wheeled.zoom === 1 && wheeled.yaw === 0, 'the wheel over a card of the collection moves through the cards, and the field neither zooms nor turns', wheeled);
  // The wheel on to the last row: the last member is drawn, and the field still neither zooms nor turns.
  let wheelEnd = wheeled.grid;
  for (let i = 0; i < 300 && wheelEnd.first + wheelEnd.drawn < wheelEnd.count; i += 1) { d.wheel(win, overCard.x, overCard.y, 100); await d.delay(25); if (i % 5 === 4) wheelEnd = await js(`${coll}.grid()`); }
  await d.delay(300);
  for (let i = 0; i < 6; i += 1) { d.wheel(win, overCard.x, overCard.y, 100); await d.delay(25); }
  await d.delay(300);
  const atLast = await js(`({ grid: ${coll}.grid(), drawn: [...document.querySelectorAll('.field-card.in-collection')].map((e) => e.dataset.noteId).concat([...document.querySelectorAll('.grid-ref')].map((e) => e.dataset.noteId)), zoom: ${glass}.zoom().scale, yaw: ${glass}.model.yaw })`);
  check(atLast.grid.first + atLast.grid.drawn === atLast.grid.count && atLast.drawn.includes(members[members.length - 1]) && atLast.zoom === 1 && atLast.yaw === 0, 'the wheel goes on to the last row of cards and stops there: the last member is drawn, and turning it further neither zooms nor turns the field', { grid: atLast.grid, last: members[members.length - 1], zoom: atLast.zoom, yaw: atLast.yaw });
  // Folded while it is cards, and opened again: it is cards again, on the row of cards it was on.
  const beforeFold = await js(`({ grid: ${coll}.grid(), pressed: document.getElementById('collection-as-cards').getAttribute('aria-pressed'), cards: document.querySelectorAll('.field-card.in-collection').length })`);
  await press('collection-fold');
  await d.delay(500);
  const foldedCards = await js(`({ h: Math.round(document.getElementById('collection').getBoundingClientRect().height), cards: document.querySelectorAll('.field-card.in-collection').length, count: document.getElementById('collection-count').textContent, expanded: document.getElementById('collection-fold').getAttribute('aria-expanded') })`);
  await press('collection-fold');
  await d.delay(600);
  await t.park();
  const reopened = await js(`({ grid: ${coll}.grid(), pressed: document.getElementById('collection-as-cards').getAttribute('aria-pressed'), cards: document.querySelectorAll('.field-card.in-collection').length, count: document.getElementById('collection-count').textContent, expanded: document.getElementById('collection-fold').getAttribute('aria-expanded') })`);
  check(foldedCards.h <= 36 && foldedCards.cards === 0 && foldedCards.count === header && foldedCards.expanded === 'false' && reopened.expanded === 'true' && reopened.pressed === 'true' && reopened.grid !== null && reopened.grid.count === members.length && reopened.grid.firstRow === beforeFold.grid.firstRow && reopened.cards === beforeFold.cards && reopened.count === header, 'folded while it is cards it is the header alone with the same count and no card drawn; opened again it is cards again, on the row of cards it was on', { beforeFold, foldedCards, reopened });
  // Back to the table: the same row is where it was.
  await press('collection-as-table');
  await d.delay(600);
  const back = await js(`(() => { const l = document.getElementById('nav-list'); const lt = l.getBoundingClientRect().top; const r = [...l.children].find((e) => !e.hidden && e.dataset.noteId === ${JSON.stringify(anchor.id)} && e.getBoundingClientRect().top >= lt); return { offset: r ? Math.round(r.getBoundingClientRect().top - lt) : null, count: document.getElementById('collection-count').textContent, members: ${coll}.members().length, search: document.getElementById('search').value, inCollection: document.querySelectorAll('.field-card.in-collection').length }; })()`);
  check(back.offset !== null && Math.abs(back.offset - anchor.offset) <= 1 && back.count === header && back.members === members.length && back.search === 'glass' && back.inCollection === 0, 'back as a table: the list is on the row it was on, with the same count, members and filter, and no card is left in the collection', { anchor, back });
  // Clear the search for what follows.
  await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`);
  d.press(win, 'Backspace');
  await d.delay(900);

  // ---- 1b. A view that could not be read says so in the collection ----
  let refuseNav = true;
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: refuseNav && /\/api\/cockpit\/nav\?mode=issues/.test(details.url) }));
  await js(`[...document.querySelectorAll('#switcher button')].find((x) => x.dataset.viewId === 'issues').click()`);
  let unread = null;
  for (let i = 0; i < 40; i += 1) { await d.delay(250); unread = await js(`(() => { const st = document.getElementById('nav-state'); return { state: st.dataset.state, text: st.textContent, shown: !st.hidden, button: (st.querySelector('button') || {}).textContent || null, rows: [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden).length, name: document.getElementById('collection-name').textContent }; })()`); if (unread.state === 'error') break; }
  check(unread.state === 'error' && unread.shown && /^Issues could not be read: .+/.test(unread.text) && unread.button === 'retry' && unread.rows === 0, 'a view whose list could not be read says so in the collection, by the view\'s name and with the reason, and offers to try again; it is not shown as an empty view', unread);
  await d.shot(win, '03b-a-view-that-could-not-be-read');
  refuseNav = false;
  win.webContents.session.webRequest.onBeforeRequest(null);
  await t.clickOn('#nav-state button', 300);
  let retried = null;
  for (let i = 0; i < 40; i += 1) { await d.delay(250); retried = await js(`({ state: document.getElementById('nav-state').dataset.state, rows: [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden).length, count: document.getElementById('collection-count').textContent })`); if (retried.state === 'ready' && retried.rows > 0) break; }
  check(retried.state === 'ready' && retried.rows > 0, '"retry" reads it again, and the list is there', retried);
  await t.view('features');

  // ---- 2. One object per note, in cards as in the table ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const a = await openRow();
  await press('collection-as-cards');
  await d.delay(900);
  await t.park();
  await js(`document.getElementById('collection-grid').focus()`);
  d.press(win, 'Home');
  await d.delay(500);
  const one = await js(`(() => { const n = {}; for (const e of document.querySelectorAll('.field-card:not(.leaving)')) n[e.dataset.noteId] = (n[e.dataset.noteId] || 0) + 1; const refs = [...document.querySelectorAll('.grid-ref')].map((e) => [e.dataset.noteId, e.textContent]); return { twice: Object.keys(n).filter((k) => n[k] > 1), cardForOpen: n[${JSON.stringify(a)}] || 0, refs, seated: document.querySelectorAll('.field-card.seated').length, inCollection: document.querySelectorAll('.field-card.in-collection').length, said: document.getElementById('collection-places').textContent }; })()`);
  const refFor = one.refs.find((r) => r[0] === a);
  const gathered = one.refs.filter((r) => /gathered/.test(r[1])).length;
  check(one.twice.length === 0 && one.cardForOpen === 0 && refFor !== undefined && /open as a document/.test(refFor[1]), `with ${a} open and the collection as cards, no note is drawn twice: the open note is a reference in the cards, not a second card`, { refs: one.refs.slice(0, 5), gathered, seated: one.seated, inCollection: one.inCollection });
  check(/not drawn twice/.test(one.said) || one.refs.length === 0, 'the collection says how many of its members are open or gathered elsewhere', one.said);
  await d.shot(win, '03-cards-with-an-open-note');
  // The reference brings the real one into view.
  await t.clickOn(`.grid-ref[data-note-id="${a}"]`, 700);
  check((await js(`document.activeElement.closest('.pane') ? document.activeElement.closest('.pane').dataset.noteId : null`)) === a, 'pressing the reference finds the open document', await js('document.activeElement.className'));
  await press('collection-as-table');
  await d.delay(500);

  // ---- 3. Read: shown, cancelled, shown again, applied ----
  const before = { desk: await desk(), layout: await layout() };
  await js(`(() => { const b = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}).querySelector('.pane-body'); b.scrollTop = 220; })()`);
  // Move it somewhere a person might have left it, so Read has something to do.
  const headA = await t.rect(`.pane[data-note-id="${a}"] .pane-title`);
  await d.pointer(win, d.drag(headA, { x: headA.x + 60, y: headA.y + 90 }, 8));
  await d.delay(500);
  const placed = { desk: await desk(), layout: await layout(), pane: await paneRect(a) };
  await press('arrange-read');
  const shown = await js(`({ state: ${glass}.arrangeState(), title: document.getElementById('arrange-title').textContent, text: document.getElementById('arrange-text').textContent, outlines: [...document.querySelectorAll('.arrange-outline')].map((o) => o.dataset.object), active: document.activeElement.id })`);
  check(shown.state.preview !== null && shown.title === `Read ${a}` && shown.outlines.includes(a) && shown.text.includes(a) && shown.active === 'arrange-apply', 'Read is shown before it is applied: an outline where the document will stand, the objects that move named, and the keyboard on Apply', shown);
  check((await desk()) === placed.desk && (await layout()) === placed.layout, 'while it is shown nothing has moved', null);
  await d.shot(win, '04-read-shown');
  d.press(win, 'Escape');
  await d.delay(400);
  const cancelled = await js(`({ preview: ${glass}.arrangeState().preview, held: window.__deckDesk().length, focus: ${glass}.focusId(), active: document.activeElement.id })`);
  check(cancelled.preview === null && (await desk()) === placed.desk && (await layout()) === placed.layout && cancelled.held === 1 && cancelled.focus === a && cancelled.active === 'arrange-read', 'Escape withdraws the preview and nothing else: nothing moved, the note is still open and still the focus, and the keyboard is back on Read', cancelled);
  await press('arrange-read');
  d.press(win, 'Return');
  await d.delay(1000);
  const read = { pane: await paneRect(a), desk: JSON.parse(await desk()), layout: JSON.parse(await layout()), state: await arrange(), focus: await js(`${glass}.focusId()`) };
  const cardA = read.desk.find((c) => c.noteId === a);
  check(read.pane.width === placed.pane.width && read.pane.height === placed.pane.height && read.pane.scrollTop === 220 && read.pane.fontSize === placed.pane.fontSize, 'applied, the document is the size it was, scrolled where it was, with text the size it was', { before: placed.pane, after: read.pane });
  check(read.layout.collapsed === false && read.layout.x === 12 && cardA.x === read.layout.x + read.layout.w + 16 && cardA.y === 12 && read.focus === null, 'the list is down the left and the document stands beside it; the gathered cards went back to the field', { layout: read.layout, card: cardA, focus: read.focus });
  check(read.state.undo === `Read ${a}` && !(await js(`document.getElementById('arrange-undo').hidden`)), 'an Undo arrangement is offered, named for what it puts back', read.state.undo);
  await d.shot(win, '05-read-applied');

  // ---- 4. Compare: two documents at their own sizes ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const b = await openRow([a]);
  // Give the second one a size of its own and a reading position of its own.
  await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(b)}).querySelector('.pane-head').focus()`);
  for (let i = 0; i < 3; i += 1) { d.press(win, 'Left', ['alt']); await d.delay(150); }
  for (let i = 0; i < 2; i += 1) { d.press(win, 'Down', ['alt']); await d.delay(150); }
  await d.delay(500);
  await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(b)}).querySelector('.pane-body'); p.scrollTop = 140; })()`);
  const preCompare = { desk: await desk(), layout: await layout(), a: await paneRect(a), b: await paneRect(b), focus: await js(`${glass}.focusId()`) };
  await press('arrange-compare');
  const cmp = await js(`({ title: document.getElementById('arrange-title').textContent, text: document.getElementById('arrange-text').textContent, notes: [...document.querySelectorAll('#arrange-notes li')].map((l) => l.textContent) })`);
  check(cmp.title === `Compare ${a} and ${b}` && cmp.text.includes(a) && cmp.text.includes(b), 'Compare names the two notes it is about and what it moves', cmp);
  await d.shot(win, '06-compare-shown');
  d.press(win, 'Return');
  await d.delay(1000);
  const compared = { a: await paneRect(a), b: await paneRect(b), desk: JSON.parse(await desk()) };
  const overlap = compared.a.left + compared.a.width > compared.b.left && compared.b.left + compared.b.width > compared.a.left;
  check(compared.a.width === preCompare.a.width && compared.a.height === preCompare.a.height && compared.b.width === preCompare.b.width && compared.b.height === preCompare.b.height && compared.b.width !== compared.a.width, 'both documents keep their own, different sizes', { a: [compared.a.width, compared.a.height], b: [compared.b.width, compared.b.height] });
  check(compared.a.scrollTop === 220 && compared.b.scrollTop === 140 && compared.a.fontSize === preCompare.a.fontSize, 'and their own reading positions and text size', { a: compared.a.scrollTop, b: compared.b.scrollTop });
  check(compared.a.top === compared.b.top && (!overlap || cmp.notes.some((n) => /overlap by/.test(n))), 'they stand side by side at one height; where the window is too narrow for both, the preview said by how much they overlap', { a: compared.a, b: compared.b, notes: cmp.notes });
  await d.shot(win, '07-compare-applied');
  // A link in one of them still opens the note it names. Looked for in both documents: a link to a note not on the desk, in view after scrolling to it.
  const linkIn = (id) => js(`(() => { const body = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)}).querySelector('.pane-body'); const held = new Set(window.__deckDesk()); const bb = body.getBoundingClientRect(); for (const l of body.querySelectorAll('.pane-note a[href^="/docs/"]')) { const name = decodeURIComponent((l.getAttribute('href') || '').split('/').pop() || ''); if ([...held].some((h) => name.startsWith(h + '-') || name === h + '.md')) continue; body.scrollTop += l.getBoundingClientRect().top - bb.top - 80; const r = l.getClientRects()[0]; if (r && r.width > 0 && r.top > bb.top && r.bottom < bb.bottom && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === l) return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: l.getAttribute('href') }; } return null; })()`);
  const link = (await linkIn(b)) || (await linkIn(a));
  let third = null;
  if (link) {
    await d.pointer(win, d.click(link));
    await d.delay(1500);
    await t.park();
    const held = await js('window.__deckDesk()');
    third = held.length === 3 ? held[2] : null;
    check(third !== null, 'a link inside a compared document opens the note it names as a third document', { held, link: link.href });
  } else {
    d.log('NOT RUN: neither compared document has a link to a note that is not already on the desk');
  }
  // Undo: the two go back where they were, at the sizes they have, and the third is not touched.
  const thirdBefore = third ? await paneRect(third) : null;
  await press('arrange-undo');
  await d.delay(1000);
  const undone = { a: await paneRect(a), b: await paneRect(b), third: third ? await paneRect(third) : null, state: await arrange(), layout: await layout(), held: await js('window.__deckDesk()') };
  check(undone.a.left === preCompare.a.left && undone.a.top === preCompare.a.top && undone.b.left === preCompare.b.left && undone.b.top === preCompare.b.top && undone.a.width === preCompare.a.width && undone.b.width === preCompare.b.width && undone.layout === preCompare.layout, 'Undo arrangement puts both documents and the collection back where they were, at the sizes they had', { before: [preCompare.a, preCompare.b], after: [undone.a, undone.b] });
  check(undone.state.undo === null && undone.state.asking === null && undone.held.length === (third ? 3 : 2) && (third === null || (undone.third.left === thirdBefore.left && undone.third.top === thirdBefore.top)), 'it asks nothing, because nothing it moved had changed; the note opened since is still open and was not moved', { held: undone.held });

  // ---- 5. Compare needs two ----
  if (third) { await t.clickOn(`.pane[data-note-id="${third}"] .pane-close`, 700); }
  await t.clickOn(`.pane[data-note-id="${b}"] .pane-close`, 700);
  const lone = await desk();
  await press('arrange-compare');
  const refused = await js(`({ preview: ${glass}.arrangeState().preview, said: document.getElementById('field-say').textContent, title: document.getElementById('arrange-compare').title, disabled: document.getElementById('arrange-compare').getAttribute('aria-disabled') })`);
  check(refused.preview === null && /two open notes/.test(refused.said) && /two open notes/.test(refused.title) && refused.disabled === 'true' && (await desk()) === lone, 'with one note open, Compare says it needs two open notes, shows no preview and moves nothing', refused);

  // ---- 6. Show related, and picking out one relationship ----
  await press('arrange-related');
  const rel = await js(`({ title: document.getElementById('arrange-title').textContent, notes: [...document.querySelectorAll('#arrange-notes li')].map((l) => l.textContent) })`);
  d.press(win, 'Return');
  await d.delay(1800);
  await t.park();
  const context = await js(`${glass}.hooks.context(${JSON.stringify(a)}).then((c) => [...new Set([...c.linked, ...c.backlinks].map((i) => i.id))])`);
  const related = await js(`(() => { const p = document.querySelector('.pane.focus'); return { focus: ${glass}.focusId(), listOpen: !p.querySelector('.pane-links').hidden, rows: [...p.querySelectorAll('.link-row')].map((r) => ({ id: r.dataset.noteId, kind: r.querySelector('.link-kind').textContent })), chips: [...p.querySelectorAll('.kind-chip')].map((c) => ({ kind: c.dataset.kind, text: c.textContent })), seated: document.querySelectorAll('.field-card.seated').length, twice: (() => { const n = {}; for (const e of document.querySelectorAll('.field-card:not(.leaving)')) n[e.dataset.noteId] = (n[e.dataset.noteId] || 0) + 1; return Object.keys(n).filter((k) => n[k] > 1); })() }; })()`);
  check(related.focus === a && related.listOpen && related.rows.length === context.length && rel.notes.some((n) => n.includes(`${context.length} note`)), `Show related gathers what ${a} is joined to and opens its list: a row for each of the ${context.length} notes the sidecar reports, the number the preview named`, { rows: related.rows.length, context: context.length, seated: related.seated, notes: rel.notes });
  check(related.twice.length === 0, 'a note joined to it is one card, however many ways it is joined', related.twice);
  await d.shot(win, '08-related-applied');
  // The words offered are frontmatter keys from the files; "link" is never one of them.
  const graph = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
  const byKind = new Map();
  for (const e of graph.edges) {
    if (e.field === null || e.target === null) continue;
    const other = e.source === a ? e.target : e.target === a ? e.source : null;
    if (other === null || !context.includes(other)) continue;
    if (!byKind.has(e.field)) byKind.set(e.field, new Set());
    byKind.get(e.field).add(other);
  }
  const offered = related.chips.filter((c) => c.kind !== '');
  check(offered.length === byKind.size && offered.every((c) => byKind.has(c.kind) && c.text === `${c.kind} ${byKind.get(c.kind).size}`) && !offered.some((c) => c.kind === 'link'), 'the relationships offered are exactly the frontmatter keys the files join it by, each with its count; a plain link in the text is not offered as a meaning', { offered: offered.map((c) => c.text), fromFiles: [...byKind].map(([k, s]) => `${k} ${s.size}`) });
  if (offered.length > 0) {
    const pick = offered[0];
    await t.clickOn(`.pane.focus .kind-chip[data-kind="${pick.kind}"]`, 700);
    await t.park();
    const picked = await js(`(() => { const p = document.querySelector('.pane.focus'); return { said: p.querySelector('.kinds-said').textContent, rows: p.querySelectorAll('.link-row').length, quietRows: p.querySelectorAll('.link-row.quiet').length, loud: [...p.querySelectorAll('.link-row:not(.quiet)')].map((r) => r.dataset.noteId), quietCards: document.querySelectorAll('.field-card.seated.quiet').length, seated: document.querySelectorAll('.field-card.seated').length, quietLines: document.querySelectorAll('.link-line.quiet').length, pressed: p.querySelector('.kind-chip[aria-pressed="true"]')?.dataset.kind, active: document.activeElement.className }; })()`);
    const want = [...byKind.get(pick.kind)].sort();
    check(JSON.stringify(picked.loud.sort()) === JSON.stringify(want) && picked.rows === context.length && picked.said.includes(`${want.length} of ${context.length}`) && picked.pressed === pick.kind, `picking out "${pick.kind}" leaves exactly the ${want.length} notes the files join by that key undimmed, says "${want.length} of ${context.length}", and every row is still in the list`, picked);
    const open = new Set(await js('window.__deckDesk()'));
    check(picked.quietCards === picked.seated - want.filter((id) => !open.has(id)).length, 'the cards round it that are not part of it are dimmed, and none is removed', { quietCards: picked.quietCards, seated: picked.seated });
    await d.shot(win, '09-one-relationship-picked-out');
    const generic = related.rows.find((r) => r.kind === 'link');
    if (generic) check((await js(`document.querySelector('.pane.focus .link-row[data-note-id="${generic.id}"]').classList.contains('quiet')`)) === true, 'a note joined only by a link in the text is given no meaning: it is dimmed under every pick', generic);
    await t.clickOn('.pane.focus .kind-clear', 600);
    const cleared = await js(`({ quietRows: document.querySelectorAll('.pane.focus .link-row.quiet').length, quietCards: document.querySelectorAll('.field-card.seated.quiet').length, emphasis: ${glass}.arrangeState().emphasis, edges: ${JSON.stringify(graph.edges.length)} })`);
    const graphAfter = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
    check(cleared.quietRows === 0 && cleared.quietCards === 0 && cleared.emphasis === null && graphAfter.edges.length === graph.edges.length, 'clear shows every related note the same again, and no link was added or removed', cleared);

    // An undo puts back the relationship that was picked out when the arrangement was applied.
    await t.clickOn(`.pane.focus .kind-chip[data-kind="${pick.kind}"]`, 700);
    await t.park();
    const pickedBefore = await js(`${glass}.arrangeState().emphasis`);
    await press('arrange-read');
    d.press(win, 'Return');
    await d.delay(1300);
    // While it is arranged for reading, the pick is cleared with the list's own control.
    const paneA = `[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)})`;
    if ((await js(`${glass}.arrangeState().emphasis`)) !== null) {
      if (await js(`${paneA}.querySelector('.pane-links').hidden`)) { await js(`${paneA}.querySelector('.pane-head').focus()`); d.press(win, 'r'); await d.delay(800); }
      const clearAt = await js(`(() => { const c = ${paneA}.querySelector('.kind-clear'); if (!c) return null; c.scrollIntoView({ block: 'nearest' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (clearAt) { await d.pointer(win, d.click(clearAt)); await d.delay(600); }
    }
    const pickedDuring = await js(`${glass}.arrangeState().emphasis`);
    await press('arrange-undo');
    await d.delay(1300);
    await t.park();
    const pickedAfter = await js(`(() => { const p = ${paneA}; return { emphasis: ${glass}.arrangeState().emphasis, asking: ${glass}.arrangeState().asking, listOpen: !p.querySelector('.pane-links').hidden, loud: [...p.querySelectorAll('.link-row:not(.quiet)')].map((r) => r.dataset.noteId).sort(), said: (p.querySelector('.kinds-said') || {}).textContent || '' }; })()`);
    check(pickedBefore !== null && pickedBefore.kind === pick.kind && pickedDuring === null && pickedAfter.emphasis !== null && pickedAfter.emphasis.noteId === a && pickedAfter.emphasis.kind === pick.kind && (!pickedAfter.listOpen || JSON.stringify(pickedAfter.loud) === JSON.stringify(want)), `Undo arrangement puts back the relationship that was picked out when the arrangement was applied: "${pick.kind}" is picked out again after it had been cleared`, { pickedBefore, pickedDuring, pickedAfter });
    if (pickedAfter.listOpen) await t.clickOn('.pane.focus .kind-clear', 600).catch(() => null);
    else await js(`${glass}.setEmphasis(${JSON.stringify(a)}, null)`);
  }

  // ---- 7. The desk and the notes change under a preview and under an undo ----
  d.press(win, 'Escape'); await d.delay(500);
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const c = await openRow([a]);
  await press('arrange-compare');
  const stale = await arrange();
  // A note changes on disk while the preview is shown.
  const tasks = path.join(root, 'docs', 'features');
  const victim = (() => { const stack = [tasks]; while (stack.length) { const dir = stack.pop(); for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) stack.push(p); else if (/^TASK-\d+.*\.md$/.test(f.name) && /^status: done$/m.test(fs.readFileSync(p, 'utf-8'))) return p; } } return null; })();
  fs.writeFileSync(victim, fs.readFileSync(victim, 'utf-8').replace(/^status: done$/m, 'status: doing'));
  let refreshed = await arrange();
  for (let i = 0; i < 40 && !(refreshed.preview && refreshed.preview.refreshed); i += 1) { await d.delay(500); refreshed = await arrange(); }
  const said = await t.text('#arrange-text');
  check(stale.preview !== null && refreshed.preview !== null && refreshed.preview.refreshed === true && /worked out again/.test(said), 'a note changed on disk while Compare was shown: the preview was worked out again from what is there now, and says so', { changed: path.basename(victim), said });
  await d.shot(win, '10-preview-worked-out-again');
  d.press(win, 'Return');
  await d.delay(1000);
  const applied = { a: await paneRect(a), c: await paneRect(c), undo: (await arrange()).undo };
  check(applied.undo === `Compare ${a} and ${c}` && applied.a.top === applied.c.top, 'Apply then applies the plan on screen, not the one it replaced', applied);
  // A person moves one of the two by hand; the undo says so before doing anything.
  const headC = await t.rect(`.pane[data-note-id="${c}"] .pane-title`);
  await d.pointer(win, d.drag(headC, { x: headC.x - 70, y: headC.y + 120 }, 8));
  await d.delay(600);
  const movedC = await paneRect(c);
  const beforeAsk = await desk();
  await press('arrange-undo');
  const asked = await js(`({ asking: ${glass}.arrangeState().asking, title: document.getElementById('arrange-title').textContent, text: document.getElementById('arrange-text').textContent, lines: [...document.querySelectorAll('#arrange-notes li')].map((l) => l.textContent), apply: document.getElementById('arrange-apply').textContent, cancel: document.getElementById('arrange-cancel').textContent })`);
  check(asked.asking !== null && asked.lines.includes(`${c} has been moved since`) && asked.apply === 'Undo the rest' && asked.cancel === 'Keep as it is' && (await desk()) === beforeAsk, `an undo after ${c} was moved by hand names it before doing anything, and offers to put back the rest or keep everything`, asked);
  await d.shot(win, '11-undo-asks');
  d.press(win, 'Return');
  await d.delay(1000);
  const partly = { a: await paneRect(a), c: await paneRect(c) };
  check(partly.c.left === movedC.left && partly.c.top === movedC.top && (partly.a.left !== applied.a.left || partly.a.top !== applied.a.top), 'Undo the rest puts the other document back and leaves the moved one exactly where the person put it', { c: [partly.c.left, partly.c.top], a: [partly.a.left, partly.a.top] });
  // The same after a subject is closed: it is not opened again.
  await press('arrange-compare'); d.press(win, 'Return'); await d.delay(1000);
  await t.clickOn(`.pane[data-note-id="${c}"] .pane-close`, 800);
  await press('arrange-undo');
  const closedAsk = await js(`[...document.querySelectorAll('#arrange-notes li')].map((l) => l.textContent)`);
  d.press(win, 'Return');
  await d.delay(900);
  check(closedAsk.includes(`${c} has been closed since`) && !(await js('window.__deckDesk()')).includes(c), `an undo after ${c} was closed says so, and does not open it again`, { closedAsk, held: await js('window.__deckDesk()') });

  // ---- 8. A source edit survives an arrangement and its undo ----
  const candidates = await js(`(() => { const g = ${glass}; const out = []; for (const id of ${coll}.members()) { if (!/^TASK-/.test(id)) continue; const card = g.cardFor(id); if (card && card.rel !== null) out.push({ id, rel: card.rel }); } return out; })()`);
  // One whose file has an unticked box, standing after a blank line so the sidecar can address it.
  const withBox = candidates.find((x) => { try { return /\n\n- \[ \] /.test(fs.readFileSync(path.join(root, 'docs', x.rel.replace(/^docs\//, '')), 'utf-8')); } catch { return false; } }) || null;
  if (withBox) {
    const s2 = await t.rect('#search');
    await d.pointer(win, d.click(s2));
    for (const ch of withBox.id) { d.press(win, ch); await d.delay(25); }
    await d.delay(900);
    // A task is a row under its feature: open the feature's row if it is folded.
    const twist = await js(`(() => { const all = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden); const from = all.findIndex((e) => e.dataset.groupKey && !e.dataset.groupKey.startsWith('g:deck:')); const r = all.slice(from).find((e) => e.classList.contains('nav-row') && !e.querySelector('.twist').hidden && e.querySelector('.twist').textContent === '▸'); if (!r) return null; r.scrollIntoView({ block: 'center' }); const b = r.querySelector('.twist').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    if (twist) { await d.pointer(win, d.click(twist)); await d.delay(700); }
    const row = await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(withBox.id)}).pop(); if (!r) return null; r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(); const x = b.left + 140; const y = b.top + b.height / 2; return document.elementFromPoint(x, y)?.closest('.nav-row') === r ? { x, y } : null; })()`);
    if (row) {
      await d.pointer(win, d.click(row));
      await d.delay(1600);
      await t.park();
      const file = path.join(root, 'docs', withBox.rel.replace(/^docs\//, ''));
      const boxesBefore = (fs.readFileSync(file, 'utf-8').match(/^- \[x\]/gim) || []).length;
      const tick = await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(withBox.id)}); const b = p.querySelector('.tick'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (tick) {
        await d.pointer(win, d.click(tick));
        await d.delay(500);
        for (const ch of 'walked') { d.press(win, ch); await d.delay(30); }
        d.press(win, 'Return');
        await d.delay(1800);
        const ticked = (fs.readFileSync(file, 'utf-8').match(/^- \[x\]/gim) || []).length;
        check(ticked === boxesBefore + 1, `a criterion of ${withBox.id} ticked in its document, through the sidecar's own route, is ticked in the file`, { before: boxesBefore, after: ticked, status: await t.text('#status') });
        await press('arrange-read'); d.press(win, 'Return'); await d.delay(900);
        await press('arrange-undo'); await d.delay(900);
        const still = (fs.readFileSync(file, 'utf-8').match(/^- \[x\]/gim) || []).length;
        check(still === ticked, 'after an arrangement and its undo the tick is still in the file: the undo put back a layout, and nothing else', { ticked, still });
      } else {
        d.log(`NOT RUN: ${withBox.id} offers no box to tick in its document`, await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(withBox.id)}); return p ? { state: p.dataset.state, boxes: p.querySelectorAll('input[type=checkbox]').length, noTick: (p.querySelector('.no-tick') || {}).textContent || null, actor: document.getElementById('actor') ? document.getElementById('actor').textContent : null } : 'no document'; })()`));
      }
    } else {
      d.log(`NOT RUN: ${withBox.id} has no row in reach after its id was typed`, await js(`({ count: document.getElementById('collection-count').textContent, cls: document.getElementById('collection').className, rows: [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden).map((e) => (e.dataset.noteId || e.dataset.groupKey) + ' ' + (e.querySelector('.twist') ? (e.querySelector('.twist').hidden ? '-' : e.querySelector('.twist').textContent) : '?') + ' ' + e.getAttribute('aria-expanded')) })`));
    }
    await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`);
    d.press(win, 'Backspace');
    await d.delay(900);
  } else {
    d.log('NOT RUN: the view holds no unfinished task to tick a criterion of');
  }

  // ---- 9. Keyboard alone, with reduced motion ----
  const dbg = win.webContents.debugger;
  dbg.attach('1.3');
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await d.delay(300);
  const top = (await js('window.__deckDesk()')).slice(-1)[0];
  const headTop = await t.rect(`.pane[data-note-id="${top}"] .pane-title`);
  await d.pointer(win, d.drag(headTop, { x: headTop.x + 40, y: headTop.y + 70 }, 6));
  await d.delay(500);
  await t.park();
  const kbBefore = await desk();
  await js(`document.getElementById('arrange-read').focus()`);
  d.press(win, 'Return');
  await d.delay(400);
  d.press(win, 'Escape');
  await d.delay(400);
  const kbCancel = await js(`({ preview: ${glass}.arrangeState().preview, active: document.activeElement.id, held: window.__deckDesk().length })`);
  check(kbCancel.preview === null && kbCancel.active === 'arrange-read' && (await desk()) === kbBefore, 'by keyboard: Read shown, Escape withdraws it and the keyboard is back on Read', kbCancel);
  d.press(win, 'Return');
  await d.delay(300);
  const tab = await js('document.activeElement.id');
  d.press(win, 'Tab');
  await d.delay(150);
  const tabbed = await js('document.activeElement.id');
  d.press(win, 'Tab', ['shift']);
  await d.delay(150);
  const watch = js(`new Promise((resolve) => { const seen = new Set(); const t0 = performance.now(); const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(top)}); const look = () => { const r = p.getBoundingClientRect(); seen.add(Math.round(r.left) + ',' + Math.round(r.top)); if (performance.now() - t0 < 600) requestAnimationFrame(look); else resolve({ places: [...seen], arranging: document.getElementById('field').classList.contains('arranging') }); }; look(); })`);
  d.press(win, 'Return');
  const moved = await watch;
  check(tab === 'arrange-apply' && tabbed === 'arrange-cancel' && moved.places.length <= 2 && !moved.arranging && (await desk()) !== kbBefore, 'Tab goes from Apply to Cancel; Enter on Apply applies it; with reduced motion the document is at its new place at once, with no travel', { tab, tabbed, moved });
  await js(`document.getElementById('arrange-undo').focus()`);
  d.press(win, 'Return');
  await d.delay(700);
  check((await desk()) === kbBefore, 'Enter on Undo arrangement puts it back', null);
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [] });
  dbg.detach();

  // ---- 9b. Two documents wider together than the window: the preview says by how much they overlap, and they do ----
  {
    const here = await js('window.__deckDesk()');
    if (here.length < 2) await openRow(here);
    const wide = win.getBounds();
    win.setBounds({ x: 0, y: 0, width: 1060, height: wide.height });
    await d.delay(900);
    const narrowMode = await js(`!!document.querySelector('#narrow-bar') && !document.getElementById('narrow-bar').hidden`);
    await press('arrange-compare');
    const shown = await js(`({ title: document.getElementById('arrange-title').textContent, notes: [...document.querySelectorAll('#arrange-notes li')].map((l) => l.textContent) })`);
    const names = /^Compare (\S+) and (\S+)$/.exec(shown.title) || [];
    const saidOver = shown.notes.map((n) => /overlap by (\d+) px/.exec(n)).find((m) => m);
    d.press(win, 'Return');
    await d.delay(1100);
    const ra = names[1] ? await paneRect(names[1]) : null;
    const rb = names[2] ? await paneRect(names[2]) : null;
    const actual = ra && rb ? Math.round(Math.min(ra.left + ra.width, rb.left + rb.width) - Math.max(ra.left, rb.left)) : null;
    // Pressing the one behind brings it to the front.
    let front = null;
    if (ra && rb && actual > 0) {
      const topNow = (await js('window.__deckDesk()')).slice(-1)[0];
      const behind = topNow === names[1] ? names[2] : names[1];
      // A point of its header's title that the other document does not cover, found on screen.
      const at = await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(behind)}); const h = p.querySelector('.pane-head').getBoundingClientRect(); for (let x = h.left + 12; x < h.right - 12; x += 8) { const hit = document.elementFromPoint(x, h.top + h.height / 2); if (hit && hit.closest('.pane') === p && !hit.closest('button')) return { x, y: h.top + h.height / 2 }; } return null; })()`);
      if (at === null) throw new Error(`no uncovered point on ${behind}'s header`);
      await d.pointer(win, d.click(at));
      await d.delay(600);
      await t.park();
      front = { behind, topAfter: (await js('window.__deckDesk()')).slice(-1)[0] };
    }
    check(!narrowMode && saidOver !== undefined && actual !== null && Math.abs(actual - Number(saidOver[1])) <= 2 && ra.top === rb.top && front !== null && front.topAfter === front.behind, 'in a window too narrow for two documents side by side, the preview says by how many pixels they will overlap, they overlap by that much at their own sizes, and pressing the one behind brings it to the front', { window: 1060, said: saidOver && saidOver[0], actual, a: ra && [ra.left, ra.width], b: rb && [rb.left, rb.width], front, notes: shown.notes });
    await d.shot(win, '10b-two-documents-that-overlap');
    await press('arrange-undo');
    await d.delay(900);
    // A document was raised since, which is not a move: the undo may ask, and is told to put back the rest.
    if ((await arrange()).asking !== null) { await press('arrange-apply'); await d.delay(900); }
    win.setBounds(wide);
    await d.delay(900);
  }

  // ---- 10. A narrow window, a reload, and the served page ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const held = await js('window.__deckDesk()');
  if (held.length < 2) await openRow(held);
  await press('arrange-compare'); d.press(win, 'Return'); await d.delay(1000);
  const pair = (await js('window.__deckDesk()')).slice(-2);
  const sizes = JSON.parse(await desk()).filter((x) => pair.includes(x.noteId)).map((x) => [x.noteId, x.w, x.h]);
  const fontWide = (await paneRect(pair[1])).fontSize;
  const full = win.getBounds();
  win.setBounds({ x: 0, y: 0, width: 780, height: 820 });
  await d.delay(900);
  const narrowA = await js(`({ bar: [...document.querySelectorAll('#narrow-bar button')].map((x) => x.textContent), shown: [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')).map((p) => p.dataset.noteId) })`);
  const barButton = await t.rect(`#narrow-bar button[data-object="${pair[0]}"]`);
  const underPointer = await js(`(() => { const e = document.elementFromPoint(${barButton.x}, ${barButton.y}); return e ? (e.id || e.className) + ' / ' + (e.dataset.object || '') : null; })()`);
  await d.pointer(win, d.click(barButton));
  await d.delay(900);
  const narrowB = await js(`({ shown: [...document.querySelectorAll('.pane')].filter((p) => !p.classList.contains('out-of-sight')).map((p) => p.dataset.noteId), font: getComputedStyle([...document.querySelectorAll('.pane')].find((p) => !p.classList.contains('out-of-sight')).querySelector('.pane-note')).fontSize })`);
  const sizesNarrow = JSON.parse(await desk()).filter((x) => pair.includes(x.noteId)).map((x) => [x.noteId, x.w, x.h]);
  check(pair.every((id) => narrowA.bar.includes(id)) && narrowA.bar.includes('Collection') && narrowA.shown.length === 1 && narrowB.shown[0] === pair[0] && narrowB.font === fontWide && JSON.stringify(sizesNarrow) === JSON.stringify(sizes), 'in a narrow window each of the two compared notes is reached by name, one at a time, with text the same size, and the sizes kept for them are untouched', { narrowA, narrowB, sizes, underPointer, barButton, held: await js('window.__deckDesk()'), z: JSON.parse(await desk()).map((x) => [x.noteId, x.z]) });
  await d.shot(win, '12-narrow');
  win.setBounds(full);
  await d.delay(900);
  await press('collection-as-cards');
  await d.delay(600);
  const beforeReload = { desk: await desk(), layout: await layout() };
  win.webContents.reload();
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
  await d.untilBooted(win);
  await d.delay(2500);
  const reloaded = { desk: await desk(), layout: await layout(), cards: await js(`document.querySelectorAll('.field-card.in-collection').length`), count: await t.text('#collection-count'), members: (await js(`${coll}.members()`)).length, undo: (await arrange()).undo };
  check(reloaded.desk === beforeReload.desk && reloaded.layout === beforeReload.layout && reloaded.cards > 0 && reloaded.count === `${reloaded.members} notes` && reloaded.undo === null, 'after a reload the documents and the collection are where they were, the collection is still cards, the members are read again from the source, and the undo, which was this window\'s, is gone', reloaded);
  const stored = JSON.parse(reloaded.layout);
  check(JSON.stringify(Object.keys(stored).sort()) === JSON.stringify(['collapsed', 'h', 'presentation', 'w', 'x', 'y']), 'what is kept for the collection is its place, size and form: no member, no count and no arrangement', stored);
  await press('collection-as-table');
  const page = d.openServedPage();
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(3500);
  await d.js(page, `[...document.querySelectorAll('#switcher button')].find((x) => x.dataset.viewId === 'features').click()`);
  await d.delay(2500);
  const served = await d.js(page, `({ arrange: document.getElementById('arrange').hidden, asTable: document.getElementById('collection-as-table').hidden, asCards: document.getElementById('collection-as-cards').hidden, bridge: typeof window.deck })`);
  check(served.bridge === 'undefined' && served.arrange && served.asTable && served.asCards, 'the served page offers no arrangement and no change of form: it draws the desk the application keeps and cannot change it', served);
  page.destroy();

  d.log('what this walk does not establish', [
    'whether a person finds Read, Compare and Show related useful, or how long comparing two notes takes them: that is TST-0064, walked by a person',
    'three notes "selected" for Compare: there is no selection apart from which notes are open, so Compare is always about the top two, and the preview says the others stay',
    'a screen reader, and touch',
  ]);
  t.finish();
};
