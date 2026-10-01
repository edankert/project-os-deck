// A note is opened in Glass, its neighbourhood gathers, the document is
// dragged, resized and found again (TASK-0104). Run with:
//   electron . --drive demos/focus-neighbourhood.cjs --drive-out <dir>
module.exports = async function (d) {
  const win = await d.open(`deck://${d.prepared.id}/features`);
  const js = (code) => d.js(win, code);
  const glass = 'window.__deckGlass';
  await d.shot(win, '01-features-field');
  const field = await js(`(() => { const r = document.getElementById('field').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })()`);
  // A card in sight with several neighbours: the one with the most among the first twenty drawn.
  const pick = await js(`(async () => {
    const g = ${glass};
    const f = document.getElementById('field').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.field-card:not(.leaving)')].filter((e) => e.style.pointerEvents === 'auto').map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.noteId, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).filter((c) => c.x > f.left + 60 && c.x < f.right - 60 && c.y > f.top + 30 && c.y < f.bottom - 30 && document.elementFromPoint(c.x, c.y)?.closest('.field-card')?.dataset.noteId === c.id).slice(0, 20);
    let best = null;
    for (const c of cards) {
      const ctx = await g.hooks.context(c.id).catch(() => null);
      if (!ctx) continue;
      const n = new Set([...ctx.linked, ...ctx.backlinks].map((i) => i.id).filter((x) => x !== c.id)).size;
      if (!best || n > best.n) best = { ...c, n };
    }
    return best;
  })()`);
  d.log('the card to open', pick);
  if (!pick) throw new Error('no card in sight to open');
  const before = await js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);
  await d.pointer(win, [...d.click(pick), { type: 'move', x: field.left + 20, y: field.bottom - 20 }]);
  await d.delay(120);
  await d.shot(win, '02-opening-at-120ms');
  await d.delay(1200);
  await d.shot(win, '03-document-and-neighbourhood');
  const state = await js(`${glass}.focusState()`);
  const drawnTwice = await js(`(() => { const n = new Map(); for (const e of document.querySelectorAll('.field-card:not(.leaving)')) n.set(e.dataset.noteId, (n.get(e.dataset.noteId) || 0) + 1); return { twice: [...n].filter(([, c]) => c > 1).map(([id]) => id), heldCard: !!document.querySelector('.field-card[data-note-id="${pick.id}"]:not(.leaving)'), ghost: document.querySelectorAll('.ghost').length }; })()`);
  d.log('focus after opening', { noteId: state.noteId, pane: state.pane, seated: state.seated.length, inSight: state.seated.filter((s) => s.inSight).length, neighbours: state.neighbours, lines: state.lines, ...drawnTwice });
  // The complete list.
  const related = await js(`(() => { const b = document.querySelector('.pane.focus .pane-related'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: b.textContent }; })()`);
  await d.pointer(win, d.click(related));
  await d.delay(400);
  await d.shot(win, '04-related-list');
  d.log('the related list', await js(`({ rows: document.querySelectorAll('.pane.focus .link-row').length, button: document.querySelector('.pane.focus .pane-related').textContent })`));
  await d.pointer(win, d.click(related));
  await d.delay(200);
  // Drag the header: the document and its neighbourhood move together, at the same size.
  const head = await js(`(() => { const r = document.querySelector('.pane.focus .pane-id').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await d.pointer(win, d.drag(head, { x: head.x + 420, y: head.y + 60 }, 14));
  await d.delay(500);
  await d.shot(win, '05-dragged-right');
  const moved = await js(`${glass}.focusState()`);
  const offsets = (s) => Object.fromEntries(s.seated.map((c) => [c.id, [Math.round(c.x - s.pane.left), Math.round(c.y - s.pane.top)]]));
  const same = JSON.stringify(offsets(state)) === JSON.stringify(offsets(moved));
  d.log('after the drag', { still: moved.noteId, sizeBefore: [state.pane.width, state.pane.height], sizeAfter: [moved.pane.width, moved.pane.height], movedBy: [moved.pane.left - state.pane.left, moved.pane.top - state.pane.top], neighbourhoodRigid: same, inSight: moved.seated.filter((s) => s.inSight).length, beyond: await js(`[...document.querySelectorAll('#desk-beyond .beyond:not([hidden])')].map((b) => b.textContent)`) });
  // Turn the field away and find the document again.
  await d.pointer(win, d.drag({ x: field.left + 300, y: field.bottom - 40 }, { x: field.left + 20, y: field.bottom - 40 }, 14));
  await d.delay(400);
  await d.shot(win, '06-turned-away');
  d.log('turned away', await js(`({ yaw: ${glass}.model.yaw, find: document.getElementById('find-open').hidden ? null : document.getElementById('find-open').textContent, paneSight: document.querySelector('.pane.focus')?.dataset.sight })`));
  const find = await js(`(() => { const b = document.getElementById('find-open'); if (b.hidden) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (find) {
    await d.pointer(win, d.click(find));
    await d.delay(700);
    await d.shot(win, '07-found-again');
  }
  // Escape: the cards go back where they were.
  d.focusApp(win);
  await js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`);
  d.press(win, 'Escape');
  await d.delay(900);
  await d.shot(win, '08-after-escape');
  const after = await js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);
  const yawBack = await js(`${glass}.model.yaw`);
  d.log('after Escape', { focus: await js(`${glass}.focusId()`), held: await js(`window.__deckDesk()`), yaw: yawBack });
  // Face the front again and compare every card with where it stood before the note was opened.
  await js(`${glass}.model.face(0); ${glass}.render(false); true`);
  await d.delay(300);
  const settled = await js(`Object.fromEntries([...document.querySelectorAll('.field-card:not(.leaving)')].map((e) => [e.dataset.noteId, e.style.transform]))`);
  const changed = Object.keys(before).filter((id) => id !== pick.id && settled[id] !== before[id]);
  d.log('cards that are not where they were before the note was opened', { changed, of: Object.keys(before).length, afterKeys: Object.keys(after).length });
  await d.shot(win, '09-field-as-it-was');
};
