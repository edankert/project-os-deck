// A note is opened in Glass from its card, its neighbourhood gathers round
// it, the document is dragged with the neighbourhood, the field is turned away
// and the note found again, and Escape puts every card back (TASK-0104,
// ISS-0070, ISS-0071, ISS-0072). Real pointer and keyboard; it changes no note:
//   bash tools/scripts/walk-in-a-box.sh focus-neighbourhood
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const win = await d.open(`deck://${d.prepared.id}/features`);
  const t = lib(d, win);
  const { js, check, glass } = t;
  await d.shot(win, '01-features-field');
  const places = () => js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);

  // A card in sight with several neighbours: the one with the most among those drawn and clear of the edges.
  const pick = await js(`(async () => {
    const g = ${glass};
    const f = document.getElementById('field').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).filter((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 40 && c.y < f.bottom - 40 && document.elementFromPoint(c.x, c.y) && document.elementFromPoint(c.x, c.y).closest('.field-card') && document.elementFromPoint(c.x, c.y).closest('.field-card').dataset.noteId === c.id).slice(0, 20);
    let best = null;
    for (const c of cards) {
      const ctx = await g.hooks.context(c.id).catch(() => null);
      if (!ctx) continue;
      const n = new Set([...ctx.linked, ...ctx.backlinks].map((i) => i.id).filter((x) => x !== c.id)).size;
      if (!best || n > best.n) best = { ...c, n };
    }
    return best;
  })()`);
  if (!pick) throw new Error('no card in sight to open');
  d.log('the card to open', pick);
  const before = await places();

  // ---- 1. Opened from its card: one object per note, and the neighbours round it ----
  await d.pointer(win, d.click(pick));
  await t.park();
  await d.delay(120);
  await d.shot(win, '02-opening-at-120ms');
  await d.delay(1400);
  await d.shot(win, '03-document-and-neighbourhood');
  const state = await js(`${glass}.focusState()`);
  const twice = await t.drawnTwice();
  const size = await js(`${glass}.readingSize(${JSON.stringify(pick.id)})`);
  check(state.noteId === pick.id && state.pane !== null && twice.twice.length === 0 && twice.cardForHeld.length === 0, `${pick.id} opened from its card is the note in the middle; no note is drawn twice, and the open note has a document and no card`, { focus: state.noteId, twice });
  check(state.neighbours === pick.n && state.seated.length > 0 && state.seated.length <= state.neighbours && state.lines === state.seated.length, `the ${state.neighbours} notes it is joined to are gathered round it, each card once, with a line to each (${state.seated.length} seated)`, { neighbours: state.neighbours, seated: state.seated.length, inSight: state.seated.filter((s) => s.inSight).length, lines: state.lines });

  // ---- 2. The complete list ----
  await t.clickOn('.pane.focus .pane-related', 500);
  await d.shot(win, '04-related-list');
  const listed = await js(`({ rows: document.querySelectorAll('.pane.focus .link-row').length, button: document.querySelector('.pane.focus .pane-related').textContent })`);
  check(listed.rows === state.neighbours && listed.button.includes(String(state.neighbours)), 'its list names every one of them, the ones seated beyond the edge of sight included, and the control says how many', listed);
  await t.clickOn('.pane.focus .pane-related', 300);

  // ---- 2b. The corner: a press that does not move stores nothing, and Escape during a drag of it puts the size back ----
  const ws = d.prepared.id;
  // What the store holds: the note's own size, and the size this view opens notes at.
  const stored = async () => {
    const s = await t.state();
    const held = ((s.viewDesks[ws] || {}).features || []).find((c) => c.noteId === pick.id);
    return { note: held ? [held.w, held.h] : null, view: (s.readingSizes[ws] && s.readingSizes[ws].features) || null };
  };
  const corner = await t.rect('.pane.focus .pane-resize');
  if (corner === null || !(await js(`(() => { const e = document.elementFromPoint(${corner.x}, ${corner.y}); return !!e && e.classList.contains('pane-resize'); })()`))) throw new Error('the open document\'s resize corner cannot be pressed at its middle');
  const storedBefore = await stored();
  const drawnBefore = await t.pane(pick.id);
  await d.pointer(win, d.click({ x: corner.x, y: corner.y }));
  await d.delay(600);
  const storedPressed = await stored();
  const drawnPressed = await t.pane(pick.id);
  check(JSON.stringify(storedPressed) === JSON.stringify(storedBefore) && drawnPressed.width === drawnBefore.width && drawnPressed.height === drawnBefore.height, 'a press and release on the resize corner that does not move stores nothing: the note\'s size and the size the view opens notes at are what they were', { before: storedBefore, after: storedPressed });
  // The corner is dragged and, with the button still down, Escape is pressed.
  d.focusApp(win);
  // Inward, so the drag needs no room in the field to be seen.
  await d.pointer(win, [{ type: 'move', x: corner.x, y: corner.y }, { type: 'down', x: corner.x, y: corner.y }, { type: 'move', x: corner.x - 20, y: corner.y - 12 }, { type: 'move', x: corner.x - 40, y: corner.y - 24 }, { type: 'move', x: corner.x - 60, y: corner.y - 36, wait: 120 }]);
  const drawnDragging = await t.pane(pick.id);
  d.press(win, 'Escape');
  await d.delay(300);
  const drawnCancelled = await t.pane(pick.id);
  const focusCancelled = await js(`({ focus: ${glass}.focusId(), held: window.__deckDesk() })`);
  await d.pointer(win, [{ type: 'up', x: corner.x - 60, y: corner.y - 36, wait: 60 }]);
  await d.delay(600);
  await t.park();
  const storedCancelled = await stored();
  const drawnReleased = await t.pane(pick.id);
  await d.shot(win, '04b-corner-drag-cancelled');
  check(drawnDragging.width < drawnBefore.width && drawnDragging.height < drawnBefore.height && drawnCancelled.width === drawnBefore.width && drawnCancelled.height === drawnBefore.height && drawnReleased.width === drawnBefore.width && drawnReleased.height === drawnBefore.height && JSON.stringify(storedCancelled) === JSON.stringify(storedBefore), 'Escape during a drag of the corner puts the document back at the size it had, and letting the corner go afterwards stores nothing', { before: [drawnBefore.width, drawnBefore.height], dragging: [drawnDragging.width, drawnDragging.height], cancelled: [drawnCancelled.width, drawnCancelled.height], released: [drawnReleased.width, drawnReleased.height], stored: storedCancelled });
  check(focusCancelled.focus === pick.id && focusCancelled.held.includes(pick.id), 'that Escape goes no further: the note is still the focus and still open', focusCancelled);

  // ---- 3. Dragged by its header: the same size, and the neighbourhood with it ----
  const head = await t.rect('.pane.focus .pane-id');
  await d.pointer(win, d.drag(head, { x: head.x + 220, y: head.y + 60 }, 14));
  await d.delay(600);
  await t.park();
  await d.shot(win, '05-dragged');
  const moved = await js(`${glass}.focusState()`);
  const offsets = (s) => Object.fromEntries(s.seated.map((c) => [c.id, [Math.round(c.x - s.pane.left), Math.round(c.y - s.pane.top)]]));
  const sizeAfter = await js(`${glass}.readingSize(${JSON.stringify(pick.id)})`);
  check(moved.noteId === pick.id && moved.pane.left !== state.pane.left && moved.pane.width === state.pane.width && moved.pane.height === state.pane.height && JSON.stringify(sizeAfter) === JSON.stringify(size), 'dragged by its header the document moves and stays the focus, at the size it had', { movedBy: [moved.pane.left - state.pane.left, moved.pane.top - state.pane.top], size: [moved.pane.width, moved.pane.height] });
  check(JSON.stringify(offsets(state)) === JSON.stringify(offsets(moved)) && (await t.drawnTwice()).twice.length === 0, 'every gathered card moved with it and stands where it stood relative to the document; none was dealt again and none is drawn twice', { seated: moved.seated.length, inSight: moved.seated.filter((s) => s.inSight).length });

  // ---- 4. Turned away, and found again ----
  const bg = await t.background();
  if (bg === null) throw new Error('no point of the field background to turn it from');
  const yawBefore = await js(`${glass}.model.yaw`);
  await d.pointer(win, d.drag(bg, { x: bg.x - 300, y: bg.y }, 14));
  await d.delay(500);
  await t.park();
  await d.shot(win, '06-turned-away');
  const away = await js(`({ yaw: ${glass}.model.yaw, find: document.getElementById('find-open').hidden ? null : document.getElementById('find-open').textContent, sight: Number(document.querySelector('.pane.focus').dataset.sight), held: window.__deckDesk() })`);
  check(away.yaw !== yawBefore && away.find !== null && away.find.includes(pick.id) && away.held.includes(pick.id), 'a drag on the field\'s background turns the field away with the note still open, and a control naming the note offers to find it', away);
  await t.clickOn('#find-open', 800);
  await d.shot(win, '07-found-again');
  const found = await js(`(() => { const p = document.querySelector('.pane.focus'); const r = p.querySelector('.pane-head').getBoundingClientRect(); const f = document.getElementById('field').getBoundingClientRect(); return { yaw: ${glass}.model.yaw, headInField: r.left >= f.left - 1 && r.right <= f.right + 1 && r.top >= f.top - 1, sight: Number(p.dataset.sight), find: !document.getElementById('find-open').hidden, focus: ${glass}.focusId() }; })()`);
  check(found.headInField && found.sight >= 0.99 && !found.find && found.focus === pick.id && found.yaw === away.yaw, '"find" brings the document back in front of the person, whole, without turning the field again, and it is still the focus', found);

  // ---- 5. Escape: the cards go back where they were, and the note stays open ----
  d.focusApp(win);
  await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
  d.press(win, 'Escape');
  await d.delay(1000);
  await d.shot(win, '08-after-escape');
  const left = await js(`({ focus: ${glass}.focusId(), held: window.__deckDesk() })`);
  // Face the front again and compare every card with where it stood before the note was opened.
  await js(`${glass}.model.face(0); ${glass}.render(false); true`);
  await d.delay(400);
  const settled = await places();
  const changed = Object.keys(before).filter((id) => id !== pick.id && settled[id] !== undefined && settled[id] !== before[id]);
  check(left.focus === null && left.held.includes(pick.id) && changed.length === 0, `Escape leaves the focus and keeps the note open; facing the front again, every one of the ${Object.keys(before).length - 1} other cards is exactly where it stood before the note was opened`, { ...left, changed: changed.slice(0, 5) });
  await d.shot(win, '09-field-as-it-was');

  d.log('what this walk does not establish', [
    'whether the gathering reads as one neighbourhood to a person: that is TST-0052, walked by a person',
    'a note with more neighbours than the field holds: the scale walk opens one with 217',
  ]);
  t.finish();
};
