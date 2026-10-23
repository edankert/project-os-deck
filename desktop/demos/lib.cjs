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
  // A control that is hidden when there is nothing for it to do: pressed if it is drawn, left alone if not.
  // Drawn and not pressable is still a failure, which `clickOn` reports.
  const clickIfShown = async (selector, wait = 300) => {
    if ((await rect(selector)) === null) return false;
    await clickOn(selector, wait);
    return true;
  };
  const keys = async (list, wait = 120) => {
    for (const key of list) {
      d.press(win, key);
      await d.delay(wait);
    }
  };
  const summary = () => ({ checks: results.length, failed: results.filter((r) => !r.ok).map((r) => r.what) });
  /** The end of a walk: the count is logged, and a walk with a failed check fails as a whole. */
  const finish = () => {
    const s = summary();
    d.log('summary', s);
    if (s.failed.length > 0) throw new Error(`${s.failed.length} of ${s.checks} checks did not hold: ${s.failed.join(' | ')}`);
  };
  return { js, check, rect, text, state, clickOn, clickIfShown, keys, summary, finish, results };
};
