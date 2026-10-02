// What the scripted walks share: reading the page, pointing at things, and
// recording a claim with what was observed. A walk is not the smoke run: it
// keeps pictures and a log of a route through the real application, and each
// `check` it records says what was seen, so a reader can tell a pass from a
// failure without trusting the script's opinion.
module.exports = function lib(d, win) {
  // A script that throws in the page says only that it threw; say which script.
  const js = (code) => d.js(win, code).catch((err) => { throw new Error(`${err.message} In: ${String(code).slice(0, 200)}`); });
  const results = [];
  const check = (ok, what, seen) => {
    results.push({ ok: !!ok, what, seen });
    d.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`, seen);
    return !!ok;
  };
  const rect = (selector) =>
    js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })()`);
  const text = (selector) => js(`(document.querySelector(${JSON.stringify(selector)}) || {}).textContent || ''`);
  const field = () => rect('#field');
  const glass = 'window.__deckGlass';
  const state = () => js('window.__deckLastState');
  const clickOn = async (selector, wait = 300) => {
    const at = await rect(selector);
    if (at === null) throw new Error(`nothing to click at ${selector}`);
    // A press goes to whatever is drawn at the point. Where the thing meant is cut off or covered there, the
    // press would land on something else and the walk would go on as if it had not, so it stops and says so.
    const covered = await js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const hit = document.elementFromPoint(${at.x}, ${at.y}); if (hit && (e === hit || e.contains(hit) || hit.contains(e))) return null; return hit ? (hit.id ? '#' + hit.id : hit.className ? '.' + String(hit.className).split(' ')[0] : hit.tagName.toLowerCase()) : 'nothing'; })()`);
    if (covered !== null) throw new Error(`${selector} cannot be pressed at its middle: ${covered} is drawn there`);
    await d.pointer(win, d.click(at));
    await d.delay(wait);
    return at;
  };
  /**
   * A point of the field's own background, with room to drag from it: not on
   * a card, a document, the collection, the compass or a painted tile.
   */
  const background = (room = 320) =>
    js(`(() => { const f = document.getElementById('field').getBoundingClientRect(); const g = ${glass}; for (let y = f.bottom - 24; y > f.top + 40; y -= 22) for (let x = f.right - 30; x > f.left + ${room} + 20; x -= 26) { let clear = true; for (const dx of [0, -${room}]) { const e = document.elementFromPoint(x + dx, y); if (!e || (e.id !== 'field' && e.id !== 'field-canvas' && !e.classList.contains('field-cards') && !e.classList.contains('field-panes') && !e.classList.contains('field-sectors'))) { clear = false; break; } } if (clear && g.bandState().tiles.every((t) => Math.abs(t.x - (x - f.left)) > t.w / 2 + 2 || Math.abs(t.y - (y - f.top)) > t.h / 2 + 2)) return { x, y }; } return null; })()`);
  /** Park the pointer where it rests on nothing that reacts. */
  // A control that is hidden when there is nothing for it to do: pressed if it is drawn, left alone if not.
  // Drawn and not pressable is still a failure, which `clickOn` reports.
  const clickIfShown = async (selector, wait = 300) => {
    if ((await rect(selector)) === null) return false;
    await clickOn(selector, wait);
    return true;
  };
  const park = async () => {
    const f = await field();
    await d.pointer(win, [{ type: 'move', x: f.right - 6, y: f.top + 6 }]);
  };
  const view = async (id) => {
    await js(`[...document.querySelectorAll('#switcher button')].find((b) => b.dataset.viewId === ${JSON.stringify(id)}).click()`);
    await d.delay(1800);
  };
  const keys = async (list, wait = 120) => {
    for (const key of list) {
      d.press(win, key);
      await d.delay(wait);
    }
  };
  /** Every card drawn for each note id: more than one element for an id is a note drawn twice. */
  const drawnTwice = () =>
    js(`(() => { const n = new Map(); for (const e of document.querySelectorAll('.field-card:not(.leaving)')) n.set(e.dataset.noteId, (n.get(e.dataset.noteId) || 0) + 1); const held = window.__deckDesk(); return { twice: [...n].filter(([, c]) => c > 1).map(([id]) => id), cardForHeld: held.filter((id) => n.has(id)) }; })()`);
  const pane = (id) =>
    js(`(() => { const p = document.querySelector('.pane[data-note-id="${id}"]'); if (!p) return null; const r = p.getBoundingClientRect(); const b = p.querySelector('.pane-body'); return { left: r.left, top: r.top, width: r.width, height: r.height, state: p.dataset.state, focus: p.classList.contains('focus'), hidden: p.classList.contains('out-of-sight'), sight: Number(p.dataset.sight), title: p.querySelector('.pane-title').textContent, status: p.querySelector('.pane-status').textContent, chars: p.querySelector('.pane-note').textContent.length, scrollTop: b.scrollTop, scrollMax: b.scrollHeight - b.clientHeight }; })()`);
  const rows = () =>
    js(`[...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden).map((e) => ({ id: e.dataset.noteId || null, group: e.dataset.groupKey || null, top: e.offsetTop, current: e.getAttribute('aria-current') === 'true', onDesk: e.dataset.onDesk === 'true' }))`);
  /**
   * Code that finds a row a pointer can really press: in view, not one of
   * `skip`, and not under a heading that is stuck to the top of the list.
   * Run it in a page with `js` (or `d.js(otherWindow, ...)`).
   */
  const rowInReach = (skip = []) =>
    `(() => { const skip = new Set([...(window.__deckDesk ? window.__deckDesk() : []), ...[...document.querySelectorAll('.pane')].map((p) => p.dataset.noteId), ...${JSON.stringify(skip)}]); for (const r of document.querySelectorAll('#nav-list .nav-row')) { if (r.hidden || skip.has(r.dataset.noteId)) continue; const b = r.getBoundingClientRect(); if (b.height === 0) continue; const x = b.left + Math.min(140, b.width / 2); const y = b.top + b.height / 2; const hit = document.elementFromPoint(x, y); if (hit && hit.closest('.nav-row') === r) return { id: r.dataset.noteId, x, y }; } return null; })()`;
  const summary = () => ({ checks: results.length, failed: results.filter((r) => !r.ok).map((r) => r.what) });
  /** The end of a walk: the count is logged, and a walk with a failed check fails as a whole. */
  const finish = () => {
    const s = summary();
    d.log('summary', s);
    if (s.failed.length > 0) throw new Error(`${s.failed.length} of ${s.checks} checks did not hold: ${s.failed.join(' | ')}`);
  };
  return { js, check, rect, text, field, glass, state, clickOn, clickIfShown, park, background, view, keys, drawnTwice, pane, rows, rowInReach, summary, finish, results };
};
