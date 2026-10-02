// A note handed from one Deck window to another, walked with a real pointer
// and keyboard (FEAT-0023, ADR-0007): "Move to" and "Also show in" named
// before release, the destination answering before the source lets go, the
// size and the reading place arriving with the note, the way back, and what
// happens when the destination does not answer or closes.
//
//   bash tools/scripts/walk-in-a-box.sh glass-handoff
//
// The box has one display, so the windows stand side by side on it. What a
// second display adds (a window landing on it, and unplugging it) is not
// walked here.
const path = require('node:path');
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const { addressFor, formatAddress } = require(path.join(__dirname, '..', 'dist', 'shared', 'address.js'));
  const ws = d.prepared.id;
  const win = await d.open(`deck://${ws}/features`, { width: 1100, height: 860 });
  const t = lib(d, win);
  const { js, check, glass } = t;
  const store = () => d.store.getState();
  const deskOf = (view) => (store().viewDesks[ws] && store().viewDesks[ws][view] ? store().viewDesks[ws][view] : []);
  const status = (w = win) => d.js(w, `document.getElementById('status').textContent`);
  const choices = () => js(`[...document.querySelectorAll('#status button')].map((b) => b.textContent)`);
  const choose = async (label) => {
    const at = await js(`(() => { const b = [...document.querySelectorAll('#status button')].find((x) => x.textContent === ${JSON.stringify(label)}); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!at) throw new Error(`the chooser has no "${label}"`);
    await d.pointer(win, d.click(at));
  };
  /** S on a document's header: the keyboard's way to hand it on. */
  const askWhere = async (noteId) => {
    await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(noteId)}).querySelector('.pane-head').focus()`);
    d.press(win, 's');
    for (let i = 0; i < 20; i += 1) { await d.delay(100); if ((await choices()).length > 1) break; }
    return choices();
  };
  const openPanel = async (address, panel, bounds) => {
    const w = d.createWindow('satellite', address, panel);
    w.setBounds(bounds);
    await new Promise((resolve) => w.webContents.once('did-finish-load', resolve));
    await d.untilBooted(w);
    await d.delay(1200);
    return w;
  };

  // ---- 1. A document worth handing on, a desk to hand it to, and a reader ----
  const first = await js(t.rowInReach());
  await d.pointer(win, d.click(first));
  await d.delay(1400);
  await t.park();
  const a = first.id;
  await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}).querySelector('.pane-head').focus()`);
  for (let i = 0; i < 3; i += 1) { d.press(win, 'Left', ['alt']); await d.delay(150); }
  await d.delay(400);
  await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}); const body = p.querySelector('.pane-body'); const hs = p.querySelectorAll('.pane-note h2'); const h = hs[Math.min(2, hs.length - 1)]; body.scrollTop += h.getBoundingClientRect().top - body.getBoundingClientRect().top + 30; })()`);
  await d.delay(200);
  const reading = { size: await js(`${glass}.readingSize(${JSON.stringify(a)})`), anchor: await js(`${glass}.readingAnchor(${JSON.stringify(a)})`) };
  const desk = await openPanel(formatAddress(addressFor(ws, 'issues', { panel: 'desk' })), 'desk', { x: 1110, y: 0, width: 700, height: 420 });
  const other = (await js(`${glass}.cardFor ? window.__deckCollection.members().find((id) => id !== ${JSON.stringify(a)}) : null`));
  const reader = await openPanel(formatAddress(addressFor(ws, 'features', { note: other, panel: 'note' })), 'note', { x: 1110, y: 440, width: 700, height: 420 });
  d.focusApp(win);
  await d.delay(600);
  const stillReading = await js(`${glass}.readingAnchor(${JSON.stringify(a)})`);
  check(store().viewId === 'features' && stillReading !== null && stillReading.heading === reading.anchor.heading && (await js(`document.querySelectorAll('.pane').length`)) === 1, 'opening a desk window for another view and a reader window changed nothing in the main window: it is on the same view, with its note open and read at the same place', { view: store().viewId, stillReading });
  check(reading.size.w !== 560 && reading.anchor.heading !== null && deskOf('issues').length === 0, `${a} is open in the main window at a size of its own, read part-way down; a desk window for Issues and a reader window stand beside it`, reading);
  await d.shot(win, '01-main-window');

  // ---- 2. The acts are named before anything is released ----
  const offered = await askWhere(a);
  const moveLabel = offered.find((o) => o.startsWith('Move to the desk'));
  const showDesk = offered.find((o) => o.startsWith('Also show in the desk'));
  const showReader = offered.find((o) => o.startsWith('Also show in the reader'));
  check(moveLabel !== undefined && showDesk !== undefined && showReader !== undefined && !offered.some((o) => o.startsWith('Move to the reader')), 'S on the document asks where, and names the act with each place: a desk is offered "Move to" and "Also show in"; a reader, which is not a desk, only "Also show in"', offered);
  await d.shot(win, '02-the-chooser');

  // ---- 3. Move: the destination answers, and only then does this desk let go ----
  // The store is watched from the main process: the note must be on the Issues desk BEFORE it leaves Features.
  const seen = [`${deskOf('features').some((c) => c.noteId === a) ? 'F' : '-'}${deskOf('issues').some((c) => c.noteId === a) ? 'I' : '-'}`];
  const dispatch = d.store.dispatch.bind(d.store);
  d.store.dispatch = (action) => { const next = dispatch(action); seen.push(`${deskOf('features').some((c) => c.noteId === a) ? 'F' : '-'}${deskOf('issues').some((c) => c.noteId === a) ? 'I' : '-'}`); return next; };
  const releasedAt = Date.now();
  await choose(moveLabel);
  let said = '';
  for (let i = 0; i < 400; i += 1) { await d.delay(20); said = await status(); if (/moved to|stays here/.test(said)) break; }
  const moveMs = Date.now() - releasedAt;
  d.store.dispatch = dispatch;
  const order = seen.filter((x, i) => i === 0 || x !== seen[i - 1]);
  const landed = deskOf('issues').find((c) => c.noteId === a);
  check(/moved to the desk on .*, which is showing it/.test(said) && !deskOf('features').some((c) => c.noteId === a) && landed !== undefined, `Move: ${a} is on the Issues desk and off this one, and the main window says the other window is showing it`, { said, order });
  check(JSON.stringify(order) === JSON.stringify(['F-', 'FI', '-I']), 'it was on both desks before it left this one, and never on neither: the source let go after the destination had it', order);
  check(landed !== undefined && landed.w === reading.size.w && landed.h === reading.size.h, 'it arrived at the size it was read at', landed);
  const arrived = await d.js(desk, `({ card: [...document.querySelectorAll('#desk [data-note-id]')].some((c) => c.dataset.noteId === ${JSON.stringify(a)}), status: document.getElementById('status').textContent, back: !!document.getElementById('send-back') })`);
  check(arrived.card && arrived.status.includes(`${a} arrived from the Deck on`) && arrived.back, 'the desk window draws it, says where it came from, and offers "send back"', arrived);
  await d.shot(desk, '03-arrived-on-the-desk-window');

  // ---- 4. Sent back: the same document, read where it was ----
  const backAt = await d.js(desk, `(() => { const r = document.getElementById('send-back').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  d.focusApp(desk);
  await d.pointer(desk, d.click(backAt));
  let home = null;
  for (let i = 0; i < 80; i += 1) { await d.delay(100); home = deskOf('features').find((c) => c.noteId === a); if (home && !deskOf('issues').some((c) => c.noteId === a)) break; }
  d.focusApp(win);
  await d.delay(1500);
  const after = { size: await js(`${glass}.readingSize(${JSON.stringify(a)})`), anchor: await js(`${glass}.readingAnchor(${JSON.stringify(a)})`), mark: await js(`document.getElementById('status').textContent`), deskStatus: await status(desk) };
  check(home !== undefined && !deskOf('issues').some((c) => c.noteId === a) && /moved to the Deck on/.test(after.deskStatus), '"send back" on the desk window moves it back: it is on this desk and off that one', { deskStatus: after.deskStatus });
  check(after.size !== null && after.size.w === reading.size.w && after.size.h === reading.size.h && after.anchor !== null && after.anchor.heading === reading.anchor.heading && Math.abs(after.anchor.past - reading.anchor.past) <= 2 && after.mark.includes(`${a} arrived from the desk on`), 'back in the main window it is the size it was and is read where it was being read, and the main window says it arrived', { before: reading, after });
  await d.shot(win, '04-sent-back');

  // ---- 5. Also show in a reader: this desk keeps it ----
  const readerOffer = (await askWhere(a)).find((o) => o.startsWith('Also show in the reader'));
  const shownAt = Date.now();
  await choose(readerOffer);
  for (let i = 0; i < 750; i += 1) { await d.delay(20); said = await status(); if (/also shown in|stays here/.test(said)) break; }
  const showMs = Date.now() - shownAt;
  await d.delay(600);
  const inReader = await d.js(reader, `(() => { const r = document.getElementById('reader'); const page = document.scrollingElement; const h = [...r.querySelectorAll('h2')].find((x) => x.textContent.trim() === ${JSON.stringify(reading.anchor.heading)}); return { address: new URLSearchParams(location.search).get('address'), text: r.textContent.length, scrollTop: Math.max(r.scrollTop, page.scrollTop), headingTop: h ? Math.round(h.getBoundingClientRect().top - r.getBoundingClientRect().top) : null, sizes: [r.scrollHeight, r.clientHeight, page.scrollHeight, page.clientHeight], status: document.getElementById('status').textContent }; })()`);
  check(/also shown in the reader on .*; this desk keeps it/.test(said) && deskOf('features').some((c) => c.noteId === a) && inReader.address.includes(`note=${encodeURIComponent(a)}`) && inReader.text > 200, `Also show: the reader window now shows ${a}, and this desk still holds it`, { said, reader: inReader });
  check(inReader.scrollTop > 0 && inReader.headingTop !== null && Math.abs(inReader.headingTop + reading.anchor.past) <= 40 && inReader.status.includes('which keeps it too') && inReader.sizes[2] <= inReader.sizes[3] + 1, 'the reader opens it where it was being read, says the other window keeps it too, and scrolls inside itself so that message stays on screen', inReader);
  await d.shot(reader, '05-also-shown-in-the-reader');
  d.log('from release to the answer, in the box', { toADeskWindowMs: moveMs, toAReaderWindowMs: showMs, waitAllowedMs: 4000, readerAllowedMs: 12000 });
  // "send back" from the reader: the main window still holds the note, so it is brought to the front there.
  const b2 = await js(t.rowInReach([a]));
  await d.pointer(win, d.click(b2));
  await d.delay(1400);
  await t.park();
  const readerBack = await d.js(reader, `(() => { const b = document.getElementById('send-back'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  d.focusApp(reader);
  await d.pointer(reader, d.click(readerBack));
  await d.delay(1500);
  d.focusApp(win);
  await d.delay(500);
  const raised = { top: (await js('window.__deckDesk()')).slice(-1)[0], held: await js('window.__deckDesk()'), readerSaid: await status(reader) };
  check(raised.top === a && raised.held.filter((id) => id === a).length === 1 && /also shown in the Deck on/.test(raised.readerSaid), '"send back" from the reader brings the note to the front in the main window, which held it all along: one document for it, not two', raised);
  await t.clickOn(`.pane[data-note-id="${b2.id}"] .pane-close`, 700);

  // ---- 6. The destination does not answer: nothing is moved ----
  d.focusApp(win);
  await d.delay(400);
  const before = JSON.stringify([deskOf('features'), deskOf('issues')]);
  // The desk window is made unresponsive: its page is kept busy for longer than the wait.
  void d.js(desk, `(() => { const end = Date.now() + 9000; while (Date.now() < end) { /* busy */ } return true; })()`).catch(() => null);
  await d.delay(300);
  const startedAt = Date.now();
  await choose((await askWhere(a)).find((o) => o.startsWith('Move to the desk')));
  for (let i = 0; i < 120; i += 1) { await d.delay(100); said = await status(); if (/stays here|moved to/.test(said)) break; }
  const waited = Date.now() - startedAt;
  check(/stays here: the desk on .* did not answer\. Nothing was moved\./.test(said) && JSON.stringify([deskOf('features'), deskOf('issues')]) === before && waited >= 3500, `a desk window that does not answer: after ${Math.round(waited / 100) / 10} s the main window says the note stays here, and both desks are exactly as they were`, { said, waited });
  await d.shot(win, '06-no-answer');
  await d.delay(6000);

  // ---- 7. The destination closes before it answers ----
  void d.js(desk, `(() => { const end = Date.now() + 9000; while (Date.now() < end) { /* busy */ } return true; })()`).catch(() => null);
  await d.delay(300);
  await choose((await askWhere(a)).find((o) => o.startsWith('Move to the desk')));
  await d.delay(600);
  desk.destroy();
  for (let i = 0; i < 80; i += 1) { await d.delay(100); said = await status(); if (/stays here|moved to/.test(said)) break; }
  check(/stays here: the desk on .* closed\. Nothing was moved\./.test(said) && JSON.stringify([deskOf('features'), deskOf('issues')]) === before, 'a desk window closed before it answered: the note stays here, and both desks are as they were', { said });

  // ---- 8. The same desk, and a note kept on every view, are not offered a move ----
  const same = await openPanel(formatAddress(addressFor(ws, 'features', { panel: 'desk' })), 'desk', { x: 1110, y: 0, width: 700, height: 420 });
  d.focusApp(win);
  await d.delay(500);
  const sameDesk = await askWhere(a);
  check(sameDesk.some((o) => o.startsWith('Also show in the desk')) && !sameDesk.some((o) => o.startsWith('Move to the desk')), 'a desk window that draws this same view\'s desk is offered "Also show in" only: a move would take the note off the desk it is on', sameDesk);
  await choose('cancel');
  same.destroy();
  const issues2 = await openPanel(formatAddress(addressFor(ws, 'issues', { panel: 'desk' })), 'desk', { x: 1110, y: 0, width: 700, height: 420 });
  d.focusApp(win);
  await d.delay(500);
  await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}).querySelector('.pane-head').focus()`);
  d.press(win, 'v');
  await d.delay(600);
  const every = await askWhere(a);
  check(!every.some((o) => o.startsWith('Move to')) && every.some((o) => o.startsWith('Also show in')), 'a note kept on every view is offered "Also show in" only: it is on every desk already', every);
  await choose('cancel');
  await js(`[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}).querySelector('.pane-head').focus()`);
  d.press(win, 'v');
  await d.delay(600);

  // ---- 9. By pointer: the header dragged to the edge names the acts where it will be released ----
  const head = await t.rect(`.pane[data-note-id="${a}"] .pane-title`);
  const f = await t.field();
  await d.pointer(win, [{ type: 'move', x: head.x, y: head.y }, { type: 'down', x: head.x, y: head.y }, { type: 'move', x: head.x + 80, y: head.y + 10 }, { type: 'move', x: f.right - 20, y: head.y + 30 }, { type: 'move', x: f.right - 6, y: head.y + 40 }]);
  await d.delay(900);
  const strip = await js(`[...document.querySelectorAll('#target-strip .target')].map((e) => { const r = e.getBoundingClientRect(); return { text: e.textContent, says: e.title, mode: e.dataset.mode || null, x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
  const moveTarget = strip.find((s) => s.mode === 'move');
  check(strip.length >= 2 && moveTarget !== undefined && moveTarget.text.startsWith('Move to the desk') && /leaves this desk once that window shows it/.test(moveTarget.says) && strip.some((s) => s.mode === 'show'), 'dragged to the edge, the strip names each place with its act, and each says what releasing there does', strip.map((s) => [s.text, s.says]));
  await d.shot(win, '07-the-strip-names-the-act');
  await d.pointer(win, [{ type: 'move', x: moveTarget.x, y: moveTarget.y }, { type: 'move', x: moveTarget.x + 1, y: moveTarget.y }, { type: 'up', x: moveTarget.x, y: moveTarget.y }]);
  for (let i = 0; i < 80; i += 1) { await d.delay(100); said = await status(); if (/moved to|stays here/.test(said)) break; }
  check(/moved to the desk on/.test(said) && deskOf('issues').some((c) => c.noteId === a) && !deskOf('features').some((c) => c.noteId === a), 'released on "Move to", it moves, and the main window says so when the desk window has answered', said);

  // ---- 10. Reduced motion: no travel, the same arrival ----
  const dbg = win.webContents.debugger;
  dbg.attach('1.3');
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const back2 = await d.js(issues2, `(() => { const b = document.getElementById('send-back'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  d.focusApp(issues2);
  await d.pointer(issues2, d.click(back2));
  let mark = null;
  for (let i = 0; i < 60; i += 1) { await d.delay(50); mark = await js(`(() => { const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(a)}); return p ? { arrived: p.classList.contains('arrived'), animations: p.getAnimations().length } : null; })()`); if (mark && mark.arrived) break; }
  d.focusApp(win);
  await d.delay(600);
  check(mark !== null && mark.arrived && mark.animations === 0 && (await status()).includes('arrived from the desk on'), 'with reduced motion the returned document does not travel; it is marked as arrived and the message is the same', mark);
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [] });
  dbg.detach();

  // ---- 11. A card from the field: thrown as before, and the field keeps its card ----
  // (The existing throw is checked by the smoke run; here only that it still lands and names no act.)
  const fieldTargets = await js(`${glass}.hooks.targets('right').then((ts) => ts.map((x) => ({ label: x.label, mode: x.mode || null })))`);
  check(fieldTargets.length > 0 && fieldTargets.every((x) => x.mode === null && !/^Move to|^Also show/.test(x.label)), 'a card thrown from the field is on no desk, so its targets carry no act and are named as they were', fieldTargets);

  // ---- 12. The tablet: also show, and said to be unconfirmed ----
  const page = d.openServedPage();
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(4000);
  const withTablet = await askWhere(a);
  const tabletLabel = withTablet.find((o) => /tablet/.test(o));
  if (tabletLabel) {
    check(tabletLabel === 'Also show in the tablet' && !withTablet.some((o) => /^Move to the tablet/.test(o)), 'with a served page following, the tablet is offered "Also show in" only', withTablet);
    const deskBefore = JSON.stringify(deskOf('features'));
    await choose(tabletLabel);
    await d.delay(900);
    said = await status();
    check(/A tablet cannot confirm it arrived; this desk keeps it\./.test(said) && JSON.stringify(deskOf('features').map((c) => c.noteId)) === JSON.stringify(JSON.parse(deskBefore).map((c) => c.noteId)), 'sent to the tablet: said plainly as unconfirmed, and this desk keeps the note', said);
  } else {
    await choose('cancel');
    d.log('NOT RUN: the served page was not counted as following, so the tablet was not offered', withTablet);
  }
  const served = await d.js(page, `({ bridge: typeof window.deck, back: !!document.getElementById('send-back'), arrange: document.getElementById('arrange').hidden })`);
  const refused = await fetch(`${d.origin}/deck/sidecar/${ws}/api/notes/tick`, { method: 'POST', body: '{}' });
  check(served.bridge === 'undefined' && !served.back && refused.status === 405, 'the served page has no bridge: it is never told of an arrival, offers no "send back", and the host still answers 405 to a write', { ...served, write: refused.status });
  page.destroy();

  // ---- 13. Nothing about a handoff is kept ----
  const keys = Object.keys(store());
  check(!JSON.stringify(store()).includes('handoff') && !keys.some((k) => /handoff|arrival/i.test(k)), 'the store holds nothing about a handoff: it is the session\'s, and is gone when Deck closes', keys);
  issues2.destroy();
  reader.destroy();

  d.log('what this walk does not establish', [
    'a second display: a window landing on it, a new reader opened on an empty one, and the display being unplugged mid-handoff. The box has one display; the rule for those is checked without a window in tests/handoff.test.mjs',
    'whether a person finds "Move to" and "Also show in" clear, or the arrival easy to notice: that is TST-0073, walked by a person',
    'a real tablet: the served page was a window on the same machine',
  ]);
  t.finish();
};
