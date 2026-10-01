// Glass at the size of a real workspace, with the collection and full
// documents on the field (FEAT-0020, TASK-0099): what a turn costs with them
// present, how long a note takes to open from a row, a link and a card, and
// the cases a small workspace does not have: a note the field has no place
// for, a note joined to very many others, an opening that is interrupted.
//
//   bash tools/scripts/walk-in-a-box.sh glass-scale --workspace ../your-trainer
//
// In the box the display is software-rendered, so the time BETWEEN frames
// says nothing about the Mac. The script work per frame, the counts and the
// behaviour are what this run establishes. The same file runs on the Mac in a
// foreground window, which takes the keyboard for about a minute:
//   cd desktop && npm run build && npx electron . --drive demos/glass-scale.cjs --drive-out dist/walks/glass-scale-mac --workspace <path>
const os = require('node:os');
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const { app } = require('electron');
  const view = process.env.DECK_SCALE_VIEW || 'features';
  const win = await d.open(`deck://${d.prepared.id}/${view}`);
  const t = lib(d, win);
  const { js, check, glass } = t;
  const ws = d.prepared.id;
  const build = process.env.DECK_BUILD || 'unknown';
  // The view may still be reading a large workspace.
  for (let i = 0; i < 60 && !/\d+ notes/.test(await t.text('#collection-count')); i += 1) await d.delay(500);
  await d.delay(1500);
  const setting = await js(`({ window: [window.innerWidth, window.innerHeight], dpr: window.devicePixelRatio, field: (() => { const r = document.getElementById('field').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(), focused: document.hasFocus(), visible: document.visibilityState, count: document.getElementById('collection-count').textContent, places: document.getElementById('collection-places').textContent, counts: ${glass}.counts(), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })`);
  d.log('setting', { build, workspace: d.prepared.name, view, machine: { cpu: os.cpus()[0] ? os.cpus()[0].model : 'unknown', cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 1e9), platform: `${os.platform()} ${os.release()}` }, gpu: app.getGPUFeatureStatus().gpu_compositing, ...setting });
  await d.shot(win, '01-the-view');

  const memory = async (label) => {
    const heap = await js(`performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null`);
    const metrics = app.getAppMetrics();
    const renderer = metrics.filter((m) => m.type === 'Tab').reduce((sum, m) => sum + m.memory.workingSetSize, 0);
    d.log(`memory: ${label}`, { rendererHeapMb: heap, rendererWorkingSetMb: Math.round(renderer / 1024), allProcessesMb: Math.round(metrics.reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024) });
  };
  const turn = async (label) => {
    // A quarter turn a second for four seconds, as the phase's measurement does.
    const yaw = await js(`${glass}.model.yaw`);
    const m = await js(`${glass}.measureTurn(4000, Math.PI / 2)`);
    const round = (n) => Math.round(n * 100) / 100;
    const out = { frames: m.frames, frameMedianMs: round(m.median), frameP95Ms: round(m.p95), workMedianMs: round(m.workMedian), workP95Ms: round(m.workP95), mostTiles: m.mostTiles, mostElements: m.mostElements, focused: m.focused, visible: m.visible, documents: await js('window.__deckDesk().length') };
    d.log(`turn: ${label}`, out);
    // Back to where the field was facing, so the desk is in front again and what follows starts from the same place.
    await js(`(${glass}.model.yaw = ${yaw}, ${glass}.render(false), true)`);
    await d.delay(400);
    return out;
  };
  /**
   * Time an opening in the page, from the press that asks for it. `watch` is
   * awaited BEFORE the press, so the page is listening when it arrives;
   * `opened` then waits until the note's text is in and nothing is moving.
   */
  const watch = (id) =>
    js(`(() => { const out = { done: false }; window.__opening = out; let t0 = null; const down = () => { t0 = performance.now(); }; document.addEventListener('pointerdown', down, true); const began = performance.now(); const look = () => { const now = performance.now(); const p = [...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)}); if (t0 !== null && p) { if (out.frameMs === undefined) { out.frameMs = Math.round(now - t0); out.namedAtFirstFrame = p.querySelector('.pane-title').textContent.length > 0; } if (out.textMs === undefined && p.dataset.state === 'ready') out.textMs = Math.round(now - t0); if (out.textMs !== undefined && !${glass}.isOpening() && p.getAnimations().length === 0) out.settledMs = Math.round(now - t0); } if (out.settledMs !== undefined || now - began > 15000) { if (out.settledMs === undefined) out.timedOut = true; document.removeEventListener('pointerdown', down, true); out.done = true; return; } requestAnimationFrame(look); }; look(); return true; })()`);
  const opened = async () => {
    for (let i = 0; i < 170; i += 1) {
      const out = await js('window.__opening');
      if (out.done) { delete out.done; return out; }
      await d.delay(100);
    }
    return { timedOut: true };
  };

  await memory('the view open, nothing lifted');
  const bare = await turn('the collection on the field, no document');

  // ---- A note the field has no place for, reached through the list ----
  // Most of them are held under another note: open the first few rows that hold others.
  await js(`(async () => { for (let pass = 0; pass < 3; pass += 1) { const closed = [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden && !r.querySelector('.twist').hidden && r.querySelector('.twist').textContent === '▸').slice(0, 4); for (const r of closed) r.querySelector('.twist').click(); await new Promise((r) => setTimeout(r, 400)); } })()`);
  const unplaced = await js(`(() => { const placed = ${glass}.placedIds(); const rows = [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden && !placed.has(r.dataset.noteId)); return { rowsWithoutAPlace: rows.length, id: rows[0] ? rows[0].dataset.noteId : null }; })()`);
  d.log('members with a row and no place in the field', unplaced);
  let first = null;
  if (unplaced.id) {
    await js(`[...document.querySelectorAll('#nav-list .nav-row')].find((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(unplaced.id)}).scrollIntoView({ block: 'center' })`);
    await d.delay(300);
    const at = await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(unplaced.id)}); const b = r.getBoundingClientRect(); const x = b.left + Math.min(140, b.width / 2); const y = b.top + b.height / 2; return { x, y, ok: document.elementFromPoint(x, y)?.closest('.nav-row') === r }; })()`);
    if (at.ok) {
      await watch(unplaced.id);
      await d.pointer(win, d.click(at));
      const took = await opened();
      await t.park();
      const pane = await t.pane(unplaced.id);
      check(pane !== null && pane.state === 'ready' && pane.chars > 0 && !took.timedOut, 'a note the field has no place for opens from its row in the collection, with its full text', { id: unplaced.id, ...took, chars: pane && pane.chars });
      first = unplaced.id;
      await d.shot(win, '02-an-unplaced-note-opened-from-the-list');
    }
  } else {
    d.log('NOT RUN: every row in view has a place in the field, so there is no unplaced note to open');
  }

  // ---- The note joined to the most others ----
  const graph = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
  const nav = await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/nav?mode=${view}`)).json();
  const members = new Set();
  const walk = (items) => { for (const item of items || []) { if (item.id) members.add(item.id); walk(item.children || item.items || []); } };
  for (const group of nav.groups) walk(group.items);
  const placed = new Set(await js(`[...${glass}.placedIds()]`));
  // Of the notes this view lists: the one the most other notes link to.
  const hub = [...graph.nodes].sort((a, b) => b.inbound - a.inbound).find((n) => n.id !== first && members.has(n.id));
  d.log('the most linked-to note in this view', { id: hub.id, inbound: hub.inbound, hasAPlaceInTheField: placed.has(hub.id), viewMembers: members.size, workspaceNotes: graph.nodes.length, workspaceLinks: graph.edges.length });
  // Found the way a person finds it: its id typed into the collection's search.
  const search = await t.rect('#search');
  await d.pointer(win, d.click(search));
  const typedAt = Date.now();
  for (const ch of hub.id) { d.press(win, ch); await d.delay(25); }
  let hubRow = null;
  for (let i = 0; i < 40 && hubRow === null; i += 1) {
    await d.delay(100);
    hubRow = await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].find((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(hub.id)}); if (!r) return null; const b = r.getBoundingClientRect(); const x = b.left + Math.min(140, b.width / 2); const y = b.top + b.height / 2; return document.elementFromPoint(x, y)?.closest('.nav-row') === r ? { x, y } : null; })()`);
  }
  if (hubRow) {
    d.log('find: the id typed, its row in reach', { ms: Date.now() - typedAt, keys: hub.id.length, shown: await t.text('#collection-count') });
    await watch(hub.id);
    await d.pointer(win, d.click(hubRow));
    const took = await opened();
    await t.park();
    await d.delay(1500);
    const focus = await js(`(() => { const s = ${glass}.focusState(); return { noteId: s.noteId, neighbours: s.neighbours, seated: s.seated.length, inSight: s.seated.filter((c) => c.inSight).length, lines: s.lines }; })()`);
    const twice = await t.drawnTwice();
    const related = await js(`document.querySelector('.pane[data-note-id="${hub.id}"] .pane-related').textContent`);
    check(focus.noteId === hub.id && focus.seated === focus.neighbours && twice.twice.length === 0 && twice.cardForHeld.length === 0 && !took.timedOut, 'the note joined to the most others opens with every neighbour seated once, none dropped and none drawn twice', { ...took, ...focus, related });
    await d.shot(win, '03-the-most-linked-note');
    await memory('the most linked-to note open');
    await turn(`one more document in focus, ${focus.seated} neighbours seated`);
    // Reaching a neighbour that stands beyond the edge of the window.
    const beyond = await js(`(() => { const b = [...document.querySelectorAll('#desk-beyond .beyond')].filter((e) => !e.hidden).map((e) => ({ side: e.dataset.side, text: e.textContent })); return b; })()`);
    d.log('neighbours beyond the edges, by counter', beyond);
  } else {
    d.log('NOT RUN: the most linked-to note has no row in this view', { id: hub.id });
  }
  // Clear the search by its own control.
  await js(`(() => { const s = document.getElementById('search'); s.focus(); s.select(); })()`);
  d.press(win, 'Backspace');
  await d.delay(900);

  // ---- An opening that is interrupted by another ----
  await js(`document.getElementById('nav-list').scrollTop = 0`);
  await d.delay(200);
  const a = await js(t.rowInReach());
  const b = a ? await js(t.rowInReach([a.id])) : null;
  if (a && b) {
    const rowAt = (p) => js(`(() => { const e = document.elementFromPoint(${p.x}, ${p.y}); const r = e ? e.closest('.nav-row') : null; return r ? r.dataset.noteId : (e ? e.className : null); })()`);
    await d.pointer(win, d.click(a));
    await d.delay(90);
    const under = await rowAt(b);
    await watch(b.id);
    await d.pointer(win, d.click(b));
    const took = await opened();
    d.log('the two presses', { first: a, second: b, underTheSecondPress: under, afterwards: await rowAt(b), scrollTop: await js(`document.getElementById('nav-list').scrollTop`) });
    await t.park();
    await d.delay(1200);
    const end = await js(`({ held: window.__deckDesk(), focus: ${glass}.focusId(), opening: ${glass}.isOpening(), moving: [...document.querySelectorAll('.pane')].filter((p) => p.getAnimations().length > 0).length, states: [...document.querySelectorAll('.pane')].map((p) => p.dataset.state), offDesk: [...document.querySelectorAll('.pane')].filter((p) => { const r = p.getBoundingClientRect(); return r.width < 200 || r.height < 100; }).length })`);
    const twice = await t.drawnTwice();
    check(under === b.id, 'the row aimed at is still under the pointer 90 ms after the first press: the list did not move under it', { aimedAt: b.id, under });
    check(end.held.includes(a.id) && end.held.includes(b.id) && end.focus === b.id && !end.opening && end.moving === 0 && end.offDesk === 0 && end.states.every((s) => s === 'ready') && twice.twice.length === 0 && twice.cardForHeld.length === 0, 'a second note opened 90 ms into the first one\'s opening: both are open at full size with their text, the second is the focus, nothing is still moving and nothing is drawn twice', { ...took, ...end, twice });
    await d.shot(win, '04-two-openings-interleaved');
  }

  // ---- Neighbours two open notes share ----
  const shared = await js(`(() => { const s = ${glass}.focusState(); const all = [...document.querySelectorAll('.field-card.seated')].map((e) => e.dataset.noteId); return { seated: all.length, distinct: new Set(all).size, sharedLines: document.querySelectorAll('.link-line.shared').length, bar: document.getElementById('glass-desk-count').textContent }; })()`);
  check(shared.seated === shared.distinct, 'a note joined to more than one open note is one card, not one per document', shared);

  await memory(`${await js('window.__deckDesk().length')} documents open`);
  const full = await turn('every document opened above still open');
  await d.shot(win, '05-turned-with-documents-open');

  // ---- Close, and the way back ----
  const top = await js(`window.__deckDesk().slice(-1)[0]`);
  await js(`document.querySelector('.pane[data-note-id="${top}"] .pane-head').focus()`);
  const closeAt = Date.now();
  d.press(win, 'Delete');
  let back = null;
  for (let i = 0; i < 40; i += 1) {
    await d.delay(50);
    back = await js(`({ id: document.activeElement.dataset.noteId || null, cls: document.activeElement.className, held: window.__deckDesk().length })`);
    if (back.id === top || /collection-head/.test(back.cls)) break;
  }
  check(back !== null && (back.id === top || /collection-head/.test(back.cls)), 'closing the top document returns the keyboard to its row, or to the collection when it has no row in view', { ms: Date.now() - closeAt, ...back });

  d.log('script work per frame while turning, against a 16.7 ms frame', { noDocument: [bare.workMedianMs, bare.workP95Ms], withDocuments: [full.workMedianMs, full.workP95Ms], documents: full.documents });
  d.log('what this run does not establish', [
    'the time between frames on the Mac: the box renders in software, and the frame interval here is the box\'s',
    'how long a person takes to find, open, follow a link and return, or how often they pick the wrong note: a script has no such numbers',
  ]);
  t.finish();
};
