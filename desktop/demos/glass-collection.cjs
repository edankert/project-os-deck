// What the collection's and the document's tasks ask for and no other walk
// drives (FEAT-0020, TASK-0096 and TASK-0097): the status and type filters and
// a group heading in the Glass collection, what its collapsed header says, the
// wheel at both ends of the list, Escape during a drag and during a resize,
// keyboard focus that can be seen, a verb the sidecar refuses with its reason
// inside a document, a document's panels after it has left the desk, where the
// keyboard goes when a document is closed, and the served page's own fold.
//
// Real pointer and keyboard throughout. It changes no note:
//   bash tools/scripts/walk-in-a-box.sh glass-collection
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const ws = d.prepared.id;
  const win = await d.open(`deck://${ws}/features`);
  const t = lib(d, win);
  const { js, check, glass } = t;
  const coll = 'window.__deckCollection';
  const fieldNow = () => js(`({ zoom: ${glass}.zoom().scale, yaw: ${glass}.model.yaw })`);
  const paneEl = (id) => `[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)})`;
  const openRow = async (skip = []) => { const r = await js(t.rowInReach(skip)); await d.pointer(win, d.click(r)); await d.delay(1400); await t.park(); return r.id; };
  const header = () => js(`({ name: document.getElementById('collection-name').textContent, count: document.getElementById('collection-count').textContent, filter: document.getElementById('collection-filter').hidden ? '' : document.getElementById('collection-filter').textContent })`);

  // What the sidecar lists for this view, read by the walk itself: each note's status and type.
  const nav = await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/nav?mode=features`)).json();
  const listed = new Map();
  const isNote = (x) => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string' && /^[A-Z]+-\d+/.test(x.id) && typeof x.status === 'string';
  /** The notes directly inside a value, each with the notes it holds: the list's own nesting. */
  const notesIn = (x) => {
    if (Array.isArray(x)) return x.flatMap(notesIn);
    if (!x || typeof x !== 'object') return [];
    if (isNote(x)) {
      listed.set(x.id, { status: x.status, type: x.type || '' });
      return [{ id: x.id, status: x.status, type: x.type || '', children: Object.entries(x).filter(([k]) => k !== 'id').flatMap(([, v]) => notesIn(v)) }];
    }
    return Object.values(x).flatMap(notesIn);
  };
  const tree = notesIn(nav);
  /**
   * What a filter leaves, by the list's own rule (desktop/src/shared/search.ts): a note is kept when it
   * matches, with everything it holds; and a note that does not match is kept when something it holds does,
   * so that the match has somewhere to stand.
   */
  const leaves = (matches) => {
    const out = new Set();
    const all = (n) => { out.add(n.id); n.children.forEach(all); };
    const keep = (n) => { if (matches(n)) { all(n); return true; } const any = n.children.map(keep).some(Boolean); if (any) out.add(n.id); return any; };
    tree.forEach(keep);
    return [...out].sort();
  };
  const total = await js(`${coll}.members().length`);
  d.log('the view as the sidecar lists it', { notes: listed.size, inTheCollection: total });

  // ---- 1. The status filter and the type filter, chosen with the keyboard ----
  const choose = async (selectId, value) => {
    await js(`document.getElementById(${JSON.stringify(selectId)}).focus()`);
    for (let i = 0; i < 40; i += 1) {
      const now = await js(`document.getElementById(${JSON.stringify(selectId)}).value`);
      if (now === value) return true;
      const order = await js(`[...document.getElementById(${JSON.stringify(selectId)}).options].map((o) => o.value)`);
      d.press(win, order.indexOf(now) < order.indexOf(value) ? 'Down' : 'Up');
      await d.delay(200);
    }
    return false;
  };
  const statuses = await js(`[...document.getElementById('status-filter').options].map((o) => o.value).filter((v) => v !== '')`);
  const types = await js(`[...document.getElementById('type-filter').options].map((o) => o.value).filter((v) => v !== '')`);
  const status = statuses.find((s) => [...listed.values()].filter((n) => n.status === s).length >= 3) || statuses[0];
  await choose('status-filter', status);
  await d.delay(700);
  const byStatus = { members: await js(`${coll}.members()`), header: await header() };
  const atStatus = [...listed].filter(([, n]) => n.status === status).length;
  const wantStatus = leaves((n) => n.status === status);
  check(JSON.stringify(byStatus.members.slice().sort()) === JSON.stringify(wantStatus) && wantStatus.length < total && byStatus.header.count === `${wantStatus.length} of ${total} notes` && byStatus.header.filter.includes(status), `the status filter, chosen with the arrow keys, leaves the ${atStatus} notes the sidecar lists at "${status}", what each holds, and the notes that hold them so that each has a place: ${wantStatus.length} rows, which is what the header counts against the ${total}, and the header names the filter`, { header: byStatus.header, members: byStatus.members.length, want: wantStatus.length, atStatus });
  await choose('status-filter', '');
  // A type whose notes hold nothing, where the list has one, so that the filter is seen to leave some rows out.
  const type = types.find((x) => { const n = leaves((q) => q.type === x).length; return n >= 3 && n < total - 5; }) || types.find((x) => [...listed.values()].filter((n) => n.type === x).length >= 3) || types[0];
  await choose('type-filter', type);
  await d.delay(700);
  const byType = { members: await js(`${coll}.members()`), header: await header() };
  const ofType = [...listed].filter(([, n]) => n.type === type).length;
  const wantType = leaves((n) => n.type === type);
  check(JSON.stringify(byType.members.slice().sort()) === JSON.stringify(wantType) && byType.header.count === `${wantType.length} of ${total} notes` && byType.header.filter.includes(type), `the type filter leaves the ${ofType} notes of type "${type}" with what each holds (${wantType.length} rows by the same rule), counted and named the same way`, { header: byType.header, members: byType.members.length, want: wantType.length, ofType });
  await d.shot(win, '01-filtered-by-type');

  // ---- 2. Collapsed, the header names the search, the count and the filters; opened, it is as it was ----
  await choose('status-filter', status);
  const search = await t.rect('#search');
  await d.pointer(win, d.click(search));
  for (const ch of 'a') { d.press(win, ch); await d.delay(40); }
  await d.delay(800);
  await t.park();
  const narrowed = { members: await js(`${coll}.members()`), header: await header() };
  let opened = null;
  if (narrowed.members.length > 0) opened = await openRow();
  await js(`(() => { const l = document.getElementById('nav-list'); l.scrollTop = Math.min(60, l.scrollHeight - l.clientHeight); })()`);
  await d.delay(200);
  const shape = () => js(`(() => { const c = document.getElementById('collection').getBoundingClientRect(); const l = document.getElementById('nav-list'); const lt = l.getBoundingClientRect().top; const first = [...l.children].find((e) => !e.hidden && e.getBoundingClientRect().bottom > lt + 2); const cur = [...l.querySelectorAll('.nav-row')].find((r) => r.getAttribute('aria-current') === 'true'); return { w: Math.round(c.width), h: Math.round(c.height), scrollTop: l.scrollTop, first: first ? first.dataset.noteId || first.dataset.groupKey : null, current: cur ? cur.dataset.noteId : null }; })()`);
  const beforeFold = await shape();
  await t.clickOn('#collection-fold', 500);
  const folded = { header: await header(), h: await js(`Math.round(document.getElementById('collection').getBoundingClientRect().height)`) };
  await t.clickOn('#collection-fold', 600);
  await t.park();
  const afterFold = await shape();
  check(folded.h <= 36 && folded.header.count === narrowed.header.count && folded.header.filter.includes('a') && folded.header.filter.includes(status) && folded.header.filter.includes(type) && JSON.stringify(afterFold) === JSON.stringify(beforeFold) && (opened === null || beforeFold.current !== null), 'collapsed, the header alone says the search, the count against the whole view and both filters; opened again the collection has its size, the row that was marked is marked, and the list is scrolled to the same row', { folded, beforeFold, afterFold, opened });
  await d.shot(win, '02-collapsed-header-says-what-is-narrowed');
  if (opened !== null) await t.clickOn(`.pane[data-note-id="${opened}"] .pane-close`, 1200);
  // Clear what was narrowed. Closing a note puts the keyboard on its row a moment later, so the search box is given the keyboard after that.
  for (let i = 0; i < 5; i += 1) {
    await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`);
    await d.delay(150);
    if ((await js(`document.activeElement.id`)) !== 'search') continue;
    d.press(win, 'Backspace');
    await d.delay(500);
    if ((await js(`document.getElementById('search').value`)) === '') break;
  }
  await choose('status-filter', '');
  await choose('type-filter', '');
  await d.delay(700);
  check((await js(`${coll}.members().length`)) === total && (await header()).filter === '', 'with the search and both filters cleared the collection lists the whole view again and names no filter', await header());

  // ---- 3. A group heading folds and unfolds its rows, by pointer and by keyboard ----
  const group = await js(`(() => { const all = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden); const i = all.findIndex((e) => e.classList.contains('nav-group') && e.getAttribute('aria-expanded') === 'true' && !String(e.dataset.groupKey || '').startsWith('g:deck:')); if (i < 0) return null; const g = all[i]; let rows = 0; for (let j = i + 1; j < all.length && !all[j].classList.contains('nav-group'); j += 1) rows += 1; g.scrollIntoView({ block: 'center' }); const r = g.getBoundingClientRect(); return { key: g.dataset.groupKey, label: g.textContent.trim().slice(0, 60), rows, x: r.left + 60, y: r.top + r.height / 2 }; })()`);
  if (group && group.rows > 0) {
    const rowsUnder = () => js(`(() => { const all = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden); const i = all.findIndex((e) => e.dataset.groupKey === ${JSON.stringify(group.key)}); if (i < 0) return null; let rows = 0; for (let j = i + 1; j < all.length && !all[j].classList.contains('nav-group'); j += 1) rows += 1; return { rows, expanded: all[i].getAttribute('aria-expanded') }; })()`);
    const countBefore = (await header()).count;
    await d.pointer(win, d.click(group));
    await d.delay(500);
    const closed = await rowsUnder();
    await js(`[...document.querySelectorAll('#nav-list .nav-group')].find((e) => e.dataset.groupKey === ${JSON.stringify(group.key)}).focus()`);
    d.press(win, 'Return');
    await d.delay(500);
    const reopened = await rowsUnder();
    check(closed.rows === 0 && closed.expanded === 'false' && reopened.rows === group.rows && reopened.expanded === 'true' && (await header()).count === countBefore, `a press on the heading "${group.label}" folds its ${group.rows} rows away and says so to a screen reader; Enter on it opens them again; the count of the view does not change`, { group, closed, reopened });
  } else {
    d.log('NOT RUN: this view has no open group heading with rows under it');
  }

  // ---- 4. The wheel at the list's first row and at its last ----
  const listBox = await t.rect('#nav-list');
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  const f0 = await fieldNow();
  for (let i = 0; i < 10; i += 1) { d.wheel(win, listBox.x, listBox.y, -120); await d.delay(20); }
  await d.delay(300);
  const atTop = { top: await js(`document.getElementById('nav-list').scrollTop`), field: await fieldNow() };
  for (let i = 0; i < 400; i += 1) { d.wheel(win, listBox.x, listBox.y, 240); if (i % 20 === 19) { await d.delay(20); const s = await js(`(() => { const l = document.getElementById('nav-list'); return l.scrollHeight - l.clientHeight - l.scrollTop; })()`); if (s < 1) break; } }
  await d.delay(300);
  for (let i = 0; i < 12; i += 1) { d.wheel(win, listBox.x, listBox.y, 240); await d.delay(20); }
  await d.delay(300);
  const atEnd = await js(`(() => { const l = document.getElementById('nav-list'); return { top: l.scrollTop, max: l.scrollHeight - l.clientHeight }; })()`);
  check(atTop.top === 0 && JSON.stringify(atTop.field) === JSON.stringify(f0) && atEnd.max > 0 && Math.abs(atEnd.top - atEnd.max) <= 1 && JSON.stringify(await fieldNow()) === JSON.stringify(f0), 'the wheel over the list at its first row, turned up, and at its last row, turned down, stays in the list: the field neither zooms nor turns', { atTop, atEnd, field: await fieldNow() });
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  await d.delay(900);
  await t.park();

  // ---- 5. Escape during a drag ends the drag: the collection is back, what the hand does next moves and stores nothing, and nothing closes ----
  let note = await openRow();
  for (let i = 0; i < 3 && !(await js('window.__deckDesk()')).includes(note); i += 1) { await d.delay(500); note = await openRow(); }
  if (!(await js('window.__deckDesk()')).includes(note)) throw new Error(`${note} did not open from its row`);
  const head = await t.rect('#collection-name');
  const boxNow = () => js(`(() => { const r = document.getElementById('collection').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })()`);
  const placeNow = async () => (await boxNow()).slice(0, 2);
  // What the store holds for the collection on this view, as this window last heard it: null when nothing was ever stored.
  const storedNow = () => js(`JSON.stringify(((window.__deckLastState.collections || {})[${JSON.stringify(ws)}] || {}).features || null)`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const placeBefore = await placeNow();
  const storedBefore = await storedNow();
  await d.pointer(win, [{ type: 'move', x: head.x, y: head.y }, { type: 'down', x: head.x, y: head.y }]);
  await d.delay(120);
  for (const step of [[20, 15], [60, 40], [100, 65], [140, 90]]) { await d.pointer(win, [{ type: 'move', x: head.x + step[0], y: head.y + step[1] }]); await d.delay(60); }
  await d.delay(200);
  const during = await placeNow();
  const heldDuring = await js('window.__deckDesk()');
  d.press(win, 'Escape');
  await d.delay(300);
  const heldAfterKey = await js('window.__deckDesk()');
  const placeAfterKey = await placeNow();
  // The hand is still on the button. It moves on, by a pixel and then further, before it lets go: a drag that
  // Escape only paused began again at the first of these moves, and the release stored it.
  for (const step of [[141, 90], [170, 110], [200, 130]]) { await d.pointer(win, [{ type: 'move', x: head.x + step[0], y: head.y + step[1] }]); await d.delay(60); }
  await d.delay(200);
  const placeAfterMoves = await placeNow();
  await d.pointer(win, [{ type: 'up', x: head.x + 200, y: head.y + 130 }]);
  await d.delay(500);
  await t.park();
  const afterEscape = { place: await placeNow(), held: await js('window.__deckDesk()'), stored: await storedNow() };
  check((during[0] !== placeBefore[0] || during[1] !== placeBefore[1]) && same(placeAfterKey, placeBefore) && same(placeAfterMoves, placeBefore) && same(afterEscape.place, placeBefore) && afterEscape.stored === storedBefore && afterEscape.held.includes(note), 'Escape while the collection is being dragged ends the drag: it is back where it was, it stays there while the pointer moves on with the button still down and when the button is let go, the store is told nothing, and the key goes no further: the open note is still open', { placeBefore, during, placeAfterKey, placeAfterMoves, heldDuring, heldAfterKey, afterEscape, storedBefore, note });

  // ---- 5b. Escape while the corner is held cancels the resize, and the key goes no further ----
  const corner = await t.rect('#collection-resize');
  const cornerFree = corner !== null && (await js(`(() => { const e = document.getElementById('collection-resize'); const hit = document.elementFromPoint(${corner === null ? 0 : corner.x}, ${corner === null ? 0 : corner.y}); return !!hit && (hit === e || e.contains(hit)); })()`));
  if (cornerFree) {
    const boxBefore = await boxNow();
    const storedBeforeResize = await storedNow();
    const focusBefore = await js(`${glass}.focusId()`);
    await d.pointer(win, [{ type: 'move', x: corner.x, y: corner.y }, { type: 'down', x: corner.x, y: corner.y }]);
    await d.delay(120);
    for (const step of [[20, 15], [50, 35], [80, 60]]) { await d.pointer(win, [{ type: 'move', x: corner.x + step[0], y: corner.y + step[1] }]); await d.delay(60); }
    await d.delay(200);
    const boxDuring = await boxNow();
    d.press(win, 'Escape');
    await d.delay(300);
    const boxAfterKey = await boxNow();
    for (const step of [[81, 60], [110, 80]]) { await d.pointer(win, [{ type: 'move', x: corner.x + step[0], y: corner.y + step[1] }]); await d.delay(60); }
    await d.delay(200);
    const boxAfterMoves = await boxNow();
    await d.pointer(win, [{ type: 'up', x: corner.x + 110, y: corner.y + 80 }]);
    await d.delay(500);
    await t.park();
    const afterResize = { box: await boxNow(), held: await js('window.__deckDesk()'), focus: await js(`${glass}.focusId()`), stored: await storedNow() };
    check((boxDuring[2] !== boxBefore[2] || boxDuring[3] !== boxBefore[3]) && same(boxAfterKey, boxBefore) && same(boxAfterMoves, boxBefore) && same(afterResize.box, boxBefore) && afterResize.stored === storedBeforeResize && same(afterResize.held, heldAfterKey) && afterResize.focus === focusBefore, 'Escape while the collection is being resized by its corner puts its size back, a hand still on the button resizes nothing more, the store is told nothing, and the key goes no further: every open note is still open and the focus is where it was', { boxBefore, boxDuring, boxAfterKey, boxAfterMoves, afterResize, focusBefore });
  } else {
    d.log('NOT RUN: the collection\'s resize corner is not drawn, or something is drawn over its middle', { corner });
  }

  // ---- 6. Keyboard focus that can be seen, and the names a screen reader is given ----
  await js(`document.getElementById('search').focus()`);
  const seen = [];
  for (let i = 0; i < 6; i += 1) {
    d.press(win, 'Tab');
    await d.delay(120);
    seen.push(await js(`(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || e.className.split(' ')[0], outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, ring: s.boxShadow !== 'none', border: s.borderTopColor }; })()`));
  }
  // The collection's header and its three controls, backwards from the fold control, then forwards to the search box.
  await js(`document.getElementById('collection-fold').focus()`);
  const headSeen = [];
  for (let i = 0; i < 3; i += 1) { d.press(win, 'Tab', ['shift']); await d.delay(120); headSeen.push(await js(`(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase(), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, ring: s.boxShadow !== 'none' }; })()`)); }
  for (let i = 0; i < 4; i += 1) { d.press(win, 'Tab'); await d.delay(120); headSeen.push(await js(`(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase(), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, ring: s.boxShadow !== 'none' }; })()`)); }
  const reached = new Set(headSeen.map((h) => h.id));
  check(['collection-head', 'collection-as-table', 'collection-as-cards', 'collection-fold', 'search'].every((id) => reached.has(id)) && headSeen.every((h) => h.outline || h.ring), 'the collection\'s header, its "table", "cards" and fold controls and the search box each show where the keyboard is when the Tab key arrives on them', headSeen);
  const named = await js(`({ collection: document.getElementById('collection').getAttribute('aria-label') || document.getElementById('collection').getAttribute('aria-labelledby'), head: document.getElementById('collection-head').getAttribute('role'), list: document.getElementById('nav-list').getAttribute('role'), status: document.getElementById('status-filter').getAttribute('aria-label'), type: document.getElementById('type-filter').getAttribute('aria-label'), fold: document.getElementById('collection-fold').getAttribute('aria-expanded'), row: (() => { const r = document.querySelector('#nav-list .nav-row'); return r ? { role: r.getAttribute('role'), text: r.textContent.trim().length > 0 } : null; })() })`);
  check(seen.every((s) => s.outline || s.ring) && named.status === 'Filter by status' && named.type === 'Filter by type' && named.list === 'list' && named.fold !== null && named.row !== null && named.row.text, 'each control the Tab key reaches in the collection shows where the keyboard is, with an outline or a ring; the filters, the list, the fold control and the rows carry the names and roles a screen reader is given (nobody has listened to them)', { seen, named });

  // ---- 7. A verb the sidecar refuses is drawn refused, with the reason in words, inside the document ----
  // No note in this workspace has such a verb today. The sidecar's answer for one note is replaced by this
  // walk, through the debugger, with one whose first verb is disabled with a reason.
  await t.clickIfShown('#sweep-desk', 700);
  await t.view('intent');
  const withVerb = await js(`[...document.querySelectorAll('#nav-list .nav-row[data-note-id]')].filter((r) => !r.hidden).map((r) => r.dataset.noteId).find((id) => /^(ADR|DES)-/.test(id)) || null`);
  const offered = withVerb === null ? null : await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/notes/actions?id=${encodeURIComponent(withVerb)}`)).json();
  if (offered !== null && Array.isArray(offered.actions) && offered.actions.length > 0) {
    const REASON = 'its design has not been accepted (this reason was put in the answer by the walk)';
    const dbg = win.webContents.debugger;
    dbg.attach('1.3');
    await dbg.sendCommand('Fetch.enable', { patterns: [{ urlPattern: '*api/notes/actions*', requestStage: 'Request' }] });
    const sent = [];
    dbg.on('message', (_event, method, params) => {
      if (method !== 'Fetch.requestPaused') return;
      const answer = { ...offered, actions: offered.actions.map((a, i) => (i === 0 ? { ...a, disabled: true, reason: REASON } : a)) };
      sent.push(params.request.url);
      void dbg.sendCommand('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    });
    await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((x) => x.dataset.noteId === ${JSON.stringify(withVerb)}); r.scrollIntoView({ block: 'center' }); })()`);
    const row = await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((x) => x.dataset.noteId === ${JSON.stringify(withVerb)}); const b = r.getBoundingClientRect(); return { x: b.left + 140, y: b.top + b.height / 2 }; })()`);
    await d.pointer(win, d.click(row));
    await d.delay(2200);
    await t.park();
    const drawn = await js(`(() => { const p = ${paneEl(withVerb)}; if (!p) return null; const a = p.querySelector('.pane-actions'); const verbs = [...a.querySelectorAll('button.verb')].map((b) => ({ verb: b.textContent, disabled: b.disabled, title: b.title, cursor: getComputedStyle(b).cursor, opacity: getComputedStyle(b).opacity })); return { inDocument: !a.hidden && p.contains(a), verbs, whys: [...a.querySelectorAll('.why')].map((w) => w.textContent), beside: document.querySelectorAll('#actuators button.verb').length }; })()`);
    // Pressing it sends nothing.
    const posts = [];
    const first = drawn && drawn.verbs[0];
    if (first) {
      const at = await js(`(() => { const b = ${paneEl(withVerb)}.querySelector('.pane-actions button.verb'); b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => { if (details.method !== 'GET') posts.push(`${details.method} ${details.url}`); done({}); });
      await d.pointer(win, d.click(at));
      await d.delay(700);
      win.webContents.session.webRequest.onBeforeRequest(null);
    }
    const asked = await js(`!!document.querySelector('#status input')`);
    check(drawn !== null && drawn.inDocument && drawn.beside === 0 && first.verb === offered.actions[0].verb && first.disabled && first.title === REASON && drawn.whys.includes(REASON) && drawn.verbs.slice(1).every((v, i) => v.disabled === (offered.actions[i + 1].disabled === true)) && posts.length === 0 && !asked && sent.length > 0, `a verb the sidecar refuses ("${offered.actions[0].verb}" on ${withVerb}, refused by an answer this walk put in the sidecar's place) is drawn inside the document as refused, with the reason in words beside it; pressing it asks nothing and sends nothing; the other verbs are as the sidecar gave them`, { drawn, posts, asked });
    await d.shot(win, '03-a-refused-verb-with-its-reason');
    await dbg.sendCommand('Fetch.disable');
    dbg.detach();
    await t.clickOn(`.pane[data-note-id="${withVerb}"] .pane-close`, 600);
  } else {
    d.log('NOT RUN: the Intent view lists no decision or design with a verb to refuse', { withVerb, offered });
  }

  // ---- 8. A document's panels are closed when it comes back, however it left ----
  await t.view('features');
  const p = await openRow();
  const panels = () => js(`(() => { const e = ${paneEl(p)}; return e ? { list: !e.querySelector('.pane-links').hidden, details: !e.querySelector('.pane-details').hidden, evidence: !e.querySelector('.pane-evidence').hidden } : null; })()`);
  const openPanels = async () => {
    await js(`${paneEl(p)}.querySelector('.pane-head').focus()`);
    d.press(win, 'r'); await d.delay(500);
    await js(`${paneEl(p)}.querySelector('.pane-head').focus()`);
    d.press(win, 'd'); await d.delay(400);
  };
  const reopen = async () => { const r = await js(`(() => { const x = [...document.querySelectorAll('#nav-list .nav-row')].find((q) => !q.hidden && q.dataset.noteId === ${JSON.stringify(p)}); if (!x) return null; x.scrollIntoView({ block: 'center' }); const b = x.getBoundingClientRect(); return { x: b.left + 140, y: b.top + b.height / 2 }; })()`); await d.pointer(win, d.click(r)); await d.delay(1400); await t.park(); };
  await openPanels();
  const wereOpen = await panels();
  await t.clickOn('#sweep-desk', 700);
  await reopen();
  const afterSweep = await panels();
  await openPanels();
  await js(`${paneEl(p)}.querySelector('.pane-head').focus()`);
  d.press(win, 'Delete');
  await d.delay(700);
  await reopen();
  const afterClose = await panels();
  check(wereOpen.list && wereOpen.details && afterSweep !== null && !afterSweep.list && !afterSweep.details && !afterSweep.evidence && afterClose !== null && !afterClose.list && !afterClose.details && !afterClose.evidence, 'a document whose related list and details were open comes back with every panel closed, whether it left when the desk was swept or when it was closed by itself', { wereOpen, afterSweep, afterClose });

  // ---- 8b. Closing a document puts the keyboard on its row when the row is on screen, and on the collection's header when it is not ----
  const keyboardOn = () => js(`(() => { const e = document.activeElement; return { id: e && e.id ? e.id : null, row: e && e.classList.contains('nav-row') ? e.dataset.noteId : null, tag: e ? e.tagName.toLowerCase() : null }; })()`);
  const closeByKey = async () => { await js(`${paneEl(p)}.querySelector('.pane-head').focus()`); d.press(win, 'Delete'); await d.delay(700); };
  await closeByKey();
  const backOnRow = { keyboard: await keyboardOn(), held: await js('window.__deckDesk()') };
  await reopen();
  await t.clickOn('#collection-fold', 500);
  const foldedForClose = await js(`document.getElementById('collection').classList.contains('collapsed')`);
  await closeByKey();
  const backOnHead = { keyboard: await keyboardOn(), held: await js('window.__deckDesk()') };
  await t.clickOn('#collection-fold', 600);
  await t.park();
  check(backOnRow.keyboard.row === p && !backOnRow.held.includes(p) && foldedForClose && backOnHead.keyboard.id === 'collection-head' && !backOnHead.held.includes(p), `closing ${p} with the list on screen puts the keyboard on its row; closing it with the collection collapsed, where that row is not on screen, puts the keyboard on the collection's header and not nowhere`, { backOnRow, foldedForClose, backOnHead });
  await reopen();

  // ---- 9. The size a person gave a note is the size the next note opens at, in this window and on the served page ----
  await js(`${paneEl(p)}.querySelector('.pane-head').focus()`);
  for (let i = 0; i < 4; i += 1) { d.press(win, 'Right', ['alt']); await d.delay(120); }
  for (let i = 0; i < 2; i += 1) { d.press(win, 'Down', ['alt']); await d.delay(120); }
  await d.delay(500);
  const chosen = await js(`${glass}.readingSize(${JSON.stringify(p)})`);
  const q = await openRow([p]);
  const next = await js(`${glass}.readingSize(${JSON.stringify(q)})`);
  const page = d.openServedPage();
  // Large enough for the chosen size: in the size the served window opens at, its field was too low to hold
  // it, and nothing could be compared.
  page.setBounds({ x: 0, y: 0, width: 1440, height: 900 });
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(4000);
  await d.js(page, `[...document.querySelectorAll('#switcher button')].find((x) => x.dataset.viewId === 'features').click()`);
  await d.delay(2500);
  const servedOpened = await d.js(page, `(() => { const open = new Set([...document.querySelectorAll('.pane')].map((e) => e.dataset.noteId)); const r = [...document.querySelectorAll('#nav-list .nav-row[data-note-id]')].find((x) => !x.hidden && !open.has(x.dataset.noteId)); if (!r) return null; const id = r.dataset.noteId; r.scrollIntoView({ block: 'center' }); r.click(); return id; })()`);
  for (let i = 0; i < 30 && servedOpened !== null; i += 1) { await d.delay(250); if (await d.js(page, `(() => { const e = [...document.querySelectorAll('.pane')].find((x) => x.dataset.noteId === ${JSON.stringify(servedOpened)}); return !!e && e.dataset.state === 'ready' && e.getAnimations().length === 0; })()`)) break; }
  const servedSize = servedOpened === null ? null : await d.js(page, `(() => { const e = [...document.querySelectorAll('.pane')].find((x) => x.dataset.noteId === ${JSON.stringify(servedOpened)}); if (!e) return null; const f = document.getElementById('field').getBoundingClientRect(); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), field: [Math.round(f.width), Math.round(f.height)], narrow: !document.getElementById('narrow-bar').hidden }; })()`);
  const fits = servedSize !== null && !servedSize.narrow && servedSize.field[0] >= chosen.w && servedSize.field[1] >= chosen.h;
  check(chosen.w !== 560 && next.w === chosen.w && next.h === chosen.h && servedSize !== null && fits && servedSize.w === chosen.w && servedSize.h === chosen.h, `a note resized to ${chosen.w} by ${chosen.h} sets the size the next note opens at on this view: in this window, and in a second window on the same view (the served page, in a field of ${servedSize === null ? '?' : servedSize.field.join(' by ')}), where a note opened there is ${servedSize === null ? '?' : `${servedSize.w} by ${servedSize.h}`}`, { chosen, next, served: servedSize, servedOpened });
  // The Mac collapses the collection. The served page draws it collapsed, and opens it for itself: the list is
  // that page's only way to a note with no card. Its fold is its own, and the Mac's store hears nothing of it.
  await t.clickOn('#collection-fold', 500);
  await t.park();
  const servedFold = () => d.js(page, `(() => { const c = document.getElementById('collection'); const f = document.getElementById('collection-fold'); return { collapsed: c.classList.contains('collapsed'), h: Math.round(c.getBoundingClientRect().height), expanded: f.getAttribute('aria-expanded'), rows: [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden && r.getBoundingClientRect().height > 0).length, label: document.getElementById('collection-head').getAttribute('aria-label') }; })()`);
  const macFold = async () => ({ stored: (((await t.state()).collections || {})[ws] || {}).features || null, collapsed: await js(`document.getElementById('collection').classList.contains('collapsed')`) });
  let servedFolded = await servedFold();
  for (let i = 0; i < 20 && !servedFolded.collapsed; i += 1) { await d.delay(250); servedFolded = await servedFold(); }
  const macFolded = await macFold();
  await d.js(page, `document.getElementById('collection-fold').click()`);
  await d.delay(600);
  const servedOpenedList = await servedFold();
  const macAfterOpen = await macFold();
  await d.js(page, `document.getElementById('collection-fold').click()`);
  await d.delay(600);
  const servedFoldedAgain = await servedFold();
  await d.js(page, `document.getElementById('collection-fold').click()`);
  await d.delay(600);
  const macAfterAll = await macFold();
  check(macFolded.collapsed && macFolded.stored !== null && macFolded.stored.collapsed === true && servedFolded.collapsed && servedFolded.rows === 0 && !servedOpenedList.collapsed && servedOpenedList.rows > 0 && servedOpenedList.expanded === 'true' && servedFoldedAgain.collapsed && JSON.stringify(macAfterOpen) === JSON.stringify(macFolded) && JSON.stringify(macAfterAll) === JSON.stringify(macFolded), `on the served page a collection the Mac collapsed is drawn collapsed, and its fold control opens it there (${servedOpenedList.rows} rows on screen), folds it and opens it again; in the Mac's window it is collapsed throughout and what the store holds for it has not changed`, { servedFolded, servedOpenedList, servedFoldedAgain, macFolded, macAfterOpen, macAfterAll });
  check(typeof servedFolded.label === 'string' && /Enter opens it$/.test(servedFolded.label) && /Enter collapses it$/.test(servedOpenedList.label) && !/arrow keys|resize/.test(`${servedFolded.label} ${servedOpenedList.label}`), 'on the served page the collection header\'s label names the one key that works there, Enter, and says nothing of moving or resizing it', { collapsed: servedFolded.label, open: servedOpenedList.label });
  // The Mac opens it again, for what follows.
  await t.clickOn('#collection-fold', 600);
  await t.park();
  // The served page in a narrow window, as a tablet held upright has it: the bar between the collection and
  // the open note, and the document's header, show where the keyboard is.
  page.setBounds({ x: 0, y: 0, width: 760, height: 900 });
  await d.delay(1200);
  d.focusApp(page);
  const servedNarrow = await d.js(page, `(() => { const bar = document.getElementById('narrow-bar'); const b = bar.hidden ? null : bar.querySelector('button'); if (b) b.focus(); return { narrow: !bar.hidden, buttons: bar.querySelectorAll('button').length, field: Math.round(document.getElementById('field').getBoundingClientRect().width), focused: document.hasFocus() }; })()`);
  const servedSeen = [];
  for (let i = 0; i < 3; i += 1) { d.press(page, 'Tab'); await d.delay(150); servedSeen.push(await d.js(page, `(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase(), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, ring: s.boxShadow !== 'none' }; })()`)); }
  d.press(page, 'Tab', ['shift']); await d.delay(150);
  servedSeen.push(await d.js(page, `(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase(), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, ring: s.boxShadow !== 'none' }; })()`));
  check(servedNarrow.narrow && servedNarrow.buttons >= 2 && servedSeen.length === 4 && servedSeen.every((x) => x.outline || x.ring), `on the served page in a window 760 px wide, the bar between the collection and the open note is shown, and each of the four controls the Tab key was moved to shows where the keyboard is`, { servedNarrow, servedSeen });
  page.destroy();

  d.log('what this walk does not establish', [
    'a screen reader: the names and roles are in the page, and nobody has listened to them',
    'a verb the sidecar itself refuses: no note in this workspace has one today, so the refusal was put in its answer by the walk',
    'touch',
  ]);
  t.finish();
};
