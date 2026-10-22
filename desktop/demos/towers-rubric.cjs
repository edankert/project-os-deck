// The towers' Rubric ideas in the real Deck (FEAT-0031): each task of the feature adds
// its part of the route here, and TASK-0187 runs it as the window run's evidence.
// Run it in the box, never on the Mac's own screen:
//   bash tools/scripts/walk-in-a-box.sh towers-rubric
//   bash tools/scripts/walk-in-a-box.sh towers-rubric --workspace ../your-trainer --name towers-rubric-yt
// It reads the notes and changes nothing.
const path = require('node:path');
const lib = require('./lib.cjs');
const { searchTickets } = require(path.join(__dirname, '..', 'dist', 'shared', 'overview-search.js'));

module.exports = async function (d) {
  const ws = d.prepared.id;
  const base = `deck://${ws}/features`;
  const win = await d.open(`${base}?page=wheel`, { width: 1440, height: 960 });
  const t = lib(d, win);
  const { js, check } = t;
  const shownAt = () => js('window.__deckOverview && window.__deckOverview.current() ? window.__deckOverview.current().address : null');
  const go = async (address) => {
    await js(`window.__deckOverview.go(${JSON.stringify(address)})`);
    for (let i = 0; i < 60 && (await shownAt()) !== address; i += 1) await d.delay(250);
    await d.delay(1200);
  };
  const arrives = async (address) => {
    for (let i = 0; i < 60 && (await shownAt()) !== address; i += 1) await d.delay(250);
    await d.delay(900);
    return shownAt();
  };
  for (let i = 0; i < 60 && (await shownAt()) === null; i += 1) await d.delay(250);
  await go(`${base}?page=wheel`);
  const model = await (await fetch(`${d.origin}/deck/overview/${ws}`)).json();
  const joined = (id) => {
    const out = new Set(model.tickets[id].links.filter((x) => x !== id && model.tickets[x] !== undefined));
    for (const x of Object.values(model.tickets)) if (x.id !== id && x.links.includes(id)) out.add(x.id);
    return out;
  };
  d.log('model', { tickets: Object.keys(model.tickets).length, focus: model.focus, next: model.next, pictures: (model.pictures || []).length });

  // ---- TASK-0181: the model carries each ticket's text, owner and date, and the pictures ----
  const tickets = Object.values(model.tickets);
  check(tickets.filter((x) => x.lead).length > tickets.length * 0.8 && tickets.filter((x) => x.updated).length > tickets.length * 0.8, "the host's model carries most tickets' first paragraph and date", { tickets: tickets.length, lead: tickets.filter((x) => x.lead).length, updated: tickets.filter((x) => x.updated).length, owner: tickets.filter((x) => x.owner).length });
  check(Array.isArray(model.pictures) && model.pictures.length > 0 && model.pictures.every((p) => model.tickets[p.ticket] && /^\d{4}-\d{2}-\d{2}$/.test(p.date)), 'and the pictures beside the notes, each with its ticket and a date', { pictures: (model.pictures || []).length, first: (model.pictures || [])[0] });

  // ---- TASK-0182: a selected ticket's links as curves, with its card and pane ----
  // The ticket of the focus feature whose links reach the most places, as on DES-0005's page.
  const candidates = tickets.filter((x) => x.feature === model.focus?.feature || x.id === model.next);
  const chosen = (candidates.length > 0 ? candidates : tickets).sort((a, b) => joined(b.id).size - joined(a.id).size)[0];
  const want = joined(chosen.id);
  // Pressed where it stands: the cube in plain sight is pressed with the real pointer when it can be.
  const at = await js(`(() => { const p = window.__deckOverview.towers(); const s = p && p.screenOf(${JSON.stringify(chosen.id)}); return s && p.hit(s.x, s.y) === ${JSON.stringify(chosen.id)} ? s : null; })()`);
  const selected = `${base}?page=wheel&select=${encodeURIComponent(chosen.id)}`;
  if (at !== null) {
    await d.pointer(win, d.click(at));
    check((await arrives(selected)) === selected, `pressing ${chosen.id} on the ring selects it there`, { at, address: await shownAt() });
  } else {
    d.log('not in plain sight from where the camera starts; selected by its address', { id: chosen.id });
    await go(selected);
  }
  const seen = await js(`(() => {
    const p = window.__deckOverview.towers();
    const card = document.querySelector('#overview-area .ov-panel-card');
    const pane = [...document.querySelectorAll('#overview-area .ov-panel-rows')].pop();
    return { selected: p && p.selected(), card: card && { id: card.querySelector('.ov-row-id').textContent, title: card.querySelector('.ov-card-title').textContent, facts: [...card.querySelectorAll('dt')].map((e) => e.textContent), buttons: [...card.querySelectorAll('button')].map((b) => b.textContent) },
      pane: pane && { lead: (pane.querySelector('.ov-pane-lead') || {}).textContent || '', rows: pane.querySelectorAll('.ov-row').length } };
  })()`);
  check(seen.selected !== null && seen.selected.id === chosen.id && seen.selected.curves === Math.min(240, want.size) && seen.selected.outlined === Math.min(240, want.size), `the 3D view draws one curve to each of the ${want.size} tickets ${chosen.id} is joined to, and outlines each`, seen.selected);
  check(seen.selected !== null && seen.selected.faded && seen.selected.labelled === (want.size <= 40 ? want.size : 0), 'everything else fades, and the linked tickets carry their ids while there are 40 or fewer', seen.selected);
  check(seen.card !== null && seen.card.id === chosen.id && seen.card.title === chosen.title && ['Feature', 'Phase', 'Owner', 'Updated'].every((k) => seen.card.facts.includes(k)), 'its card names it, with its feature, phase, owner and last update', seen.card);
  check(seen.pane !== null && seen.pane.lead === (chosen.lead || '') && seen.pane.rows === want.size, 'its pane gives its first paragraph and a row for every linked ticket', seen.pane);
  await d.shot(win, '01-selected-on-the-ring');
  // Frame turns the camera to the ticket and its links.
  const before = await js('window.__deckOverview.towers().camera()');
  await t.clickOn('#overview-area .ov-panel-card button[data-action="towers-frame"]', 1200);
  const after = await js('window.__deckOverview.towers().camera()');
  check(after.moved && (Math.abs(after.radius - before.radius) > 1 || Math.abs(after.theta - before.theta) > 0.01), 'Frame turns the camera to the ticket and its links', { before, after });
  await d.shot(win, '02-framed');
  // A row of the pane selects its ticket.
  const other = await js(`(() => { const r = [...document.querySelectorAll('#overview-area .ov-panel-rows .ov-row')][0]; return r ? r.dataset.ticket : null; })()`);
  if (other !== null) {
    await t.clickOn(`#overview-area .ov-panel-rows .ov-row[data-ticket="${other}"]`, 300);
    const next = `${base}?page=wheel&select=${encodeURIComponent(other)}`;
    check((await arrives(next)) === next, `a row of the pane selects ${other}`, { address: await shownAt() });
    await d.press(win, 'Escape');
    // Escape first brings a moved camera home, then clears the selection.
    if ((await arrives(`${base}?page=wheel`)) !== `${base}?page=wheel`) await d.press(win, 'Escape');
    check((await arrives(`${base}?page=wheel`)) === `${base}?page=wheel` && (await js('window.__deckOverview.towers().selected()')) === null, 'Escape clears the selection', { address: await shownAt() });
  }
  // With its phase brought close, the pane takes the list's place, and the rest of the ring comes back faded.
  await go(selected);
  const phaseButton = await js(`(() => { const b = document.querySelector('#overview-area .ov-panel-card button[data-target*="page=phase"]'); return b ? b.dataset.target : null; })()`);
  if (phaseButton !== null) {
    await t.clickOn('#overview-area .ov-panel-card button[data-target*="page=phase"]', 300);
    await arrives(phaseButton);
    await d.delay(900);
    const close = await js(`(() => { const p = window.__deckOverview.towers(); return { open: p.open(), selected: p.selected(), list: document.querySelectorAll('#overview-area [data-panel^="tickets-"]').length, back: (document.querySelector('#overview-area .ov-panel-rows .ov-panel-button') || {}).textContent || '' }; })()`);
    check(close.open !== null && close.selected !== null && close.selected.id === chosen.id && close.list === 0 && /list/.test(close.back), "Its phase brings the phase close with the ticket still selected; the pane stands in the list's place, with a way back to it", close);
    await d.shot(win, '03-selected-in-its-phase');
  }

  // ---- TASK-0183: search lights the towers, and the next-up board ----
  await go(`${base}?page=wheel`);
  const query = searchTickets(model, 'wheel').length > 0 ? 'wheel' : 'heart rate';
  const matches = searchTickets(model, query).map((x) => x.id);
  await d.press(win, '/');
  await d.delay(200);
  const focused = await js(`document.activeElement && document.activeElement.closest('.ov-search') !== null`);
  check(focused, '/ puts the cursor in the search box', { focused });
  await win.webContents.insertText(query);
  await d.delay(900);
  const lit = await js(`({ box: window.__deckOverview.search(), found: window.__deckOverview.towers().found(), first: [...document.querySelectorAll('.ov-search-row')].map((r) => r.dataset.ticket) })`);
  check(lit.box.found === matches.length && lit.box.said === `${matches.length} found`, `a search for "${query}" finds ${matches.length} tickets and says so`, lit.box);
  check(lit.found !== null && lit.found.lit === matches.length && lit.found.glows === Math.min(600, matches.length) && lit.found.faded, 'they glow where they stand, and the rest fades', lit.found);
  check(JSON.stringify(lit.first) === JSON.stringify(matches.slice(0, 12)), 'up to twelve are listed under the box, what needs you first', { listed: lit.first, needsYou: lit.first.filter((id) => model.tickets[id].needsYou) });
  await d.shot(win, '04-search');
  // The arrow keys and Enter choose one: it is selected, and the search gives way.
  await d.press(win, 'Down');
  await d.press(win, 'Return');
  const pick = `${base}?page=wheel&select=${encodeURIComponent(matches[0])}`;
  check((await arrives(pick)) === pick, `the arrow keys and Enter select ${matches[0]}`, { address: await shownAt() });
  const chosenNow = await js(`({ box: window.__deckOverview.search(), found: window.__deckOverview.towers().found() })`);
  check(chosenNow.box.query === "" && chosenNow.found === null, "and the search is cleared", chosenNow);
  // Escape clears a search before anything else.
  await d.press(win, 'Escape');
  await d.delay(300);
  await go(`${base}?page=wheel`);
  await js(`(() => { const i = document.querySelector('.ov-search input'); i.focus(); })()`);
  await win.webContents.insertText(query);
  await d.delay(700);
  await js('document.activeElement.blur()');
  await d.press(win, 'Escape');
  await d.delay(400);
  const cleared = await js(`({ box: window.__deckOverview.search(), found: window.__deckOverview.towers().found(), address: window.__deckOverview.current().address })`);
  check(cleared.box.query === '' && cleared.found === null && cleared.address === `${base}?page=wheel`, 'Escape clears the search and stays on the ring', cleared);
  // The next-up board, bottom left.
  const board = await js(`(() => { const b = document.querySelector('#overview-area .ov-panel[data-panel="next-up"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { left: r.left, bottom: r.bottom, head: (b.querySelector('.ov-board-head') || {}).textContent || '', rows: [...b.querySelectorAll('.ov-row')].map((e) => ({ id: e.dataset.ticket, tag: e.dataset.tag, aside: (e.querySelector('.ov-row-aside') || {}).textContent || '' })), foot: (b.querySelector('.ov-board-foot') || {}).textContent || '' }; })()`);
  const nextRow = board && board.rows.find((r) => r.tag === 'next');
  check(board !== null && (model.next ? nextRow && nextRow.id === model.next : board.rows.length === 0), `the next-up board lists the focus feature's tasks with ${model.next || 'nothing'} marked NEXT`, board);
  if (board !== null && board.rows.length > 0) {
    const row = board.rows[board.rows.length - 1].id;
    await t.clickOn(`#overview-area .ov-panel[data-panel="next-up"] .ov-row[data-ticket="${row}"]`, 300);
    const there = `${base}?page=wheel&select=${encodeURIComponent(row)}`;
    check((await arrives(there)) === there, `pressing a row of the board selects ${row}`, { address: await shownAt() });
    await d.shot(win, '05-board-row-selected');
  }

  // ---- TASK-0184: what needs you, ages and the weeks ----
  await go(`${base}?page=wheel`);
  const needing = tickets.filter((x) => x.needsYou);
  const needs = await js(`(() => { const p = document.querySelector('#overview-area .ov-panel[data-panel="needs-you"]'); if (!p) return null; return { big: p.querySelector('.ov-needs-big').textContent, parts: [...p.querySelectorAll('.ov-needs-key')].map((k) => ({ words: k.textContent, ids: k.dataset.light.split(' ').length })), rows: [...p.querySelectorAll('.ov-row')].map((r) => r.dataset.ticket) }; })()`);
  check(needs !== null && Number(needs.big) === needing.length && needs.parts.reduce((n, x) => n + x.ids, 0) === needing.length && needs.rows.length === Math.min(3, needing.length), `the needs-you panel counts the ${needing.length} tickets that need you, split by reason, with the first three as rows`, needs);
  if (needs !== null && needs.parts.length > 0) {
    await t.clickOn('#overview-area .ov-panel[data-panel="needs-you"] .ov-needs-key', 600);
    const lit = await js(`({ box: window.__deckOverview.search(), found: window.__deckOverview.towers().found() })`);
    check(lit.found !== null && lit.found.lit === needs.parts[0].ids && lit.box.said === needs.parts[0].words, `pressing "${needs.parts[0].words}" lights those tickets on the ring and says so in the box`, lit);
    await d.shot(win, '06-needs-lit');
    await d.press(win, 'Escape');
    await d.delay(300);
    check((await js('window.__deckOverview.towers().found()')) === null, 'Escape puts the ring back', null);
  }
  const weeks = await js(`(() => { const p = document.querySelector('#overview-area .ov-panel[data-panel="weeks"]'); if (!p) return null; const w = [...p.querySelectorAll('.ov-week')]; const busiest = w.reduce((b, e, i) => (e.dataset.light.split(' ').filter(Boolean).length > w[b].dataset.light.split(' ').filter(Boolean).length ? i : b), 0); return { squares: w.length, now: w.findIndex((e) => e.classList.contains('is-now')), busiest, n: w[busiest].dataset.light.split(' ').filter(Boolean).length, head: p.querySelector('.ov-board-head').textContent }; })()`);
  check(weeks !== null && weeks.squares === 52 && weeks.now >= 0, 'the year stands as 52 weeks, this week outlined', weeks);
  if (weeks !== null && weeks.n > 0) {
    await t.clickOn(`#overview-area .ov-panel[data-panel="weeks"] .ov-week:nth-of-type(${weeks.busiest + 1})`, 600);
    const lit = await js('window.__deckOverview.towers().found()');
    check(lit !== null && lit.lit === weeks.n, `pressing the busiest week, week ${weeks.busiest + 1}, lights the ${weeks.n} tickets closed in it`, lit);
    await d.press(win, 'Escape');
    await d.delay(300);
  }
  const ages = await js('window.__deckOverview.towers().ages()');
  d.log('age badges', ages);
  check(ages.shown === ages.badges, 'the quiet towers carry their ages', ages);
  await d.shot(win, '07-needs-weeks-ages');
  if (ages.badges > 0) {
    await t.clickOn('.ov-ages-toggle', 300);
    const hidden = await js('window.__deckOverview.towers().ages()');
    await t.clickOn('.ov-ages-toggle', 300);
    const back = await js('window.__deckOverview.towers().ages()');
    check(hidden.shown === 0 && back.shown === back.badges, '◷ hides the badges and shows them again', { hidden, back });
  }

  // ---- TASK-0185: the ring grouped by feature ----
  await go(`${base}?page=wheel`);
  await t.clickOn('.ov-grouping-toggle', 300);
  const byFeatureAt = `${base}?page=wheel&group=feature`;
  check((await arrives(byFeatureAt)) === byFeatureAt, 'the switch groups the ring by feature, and the address says so', { address: await shownAt() });
  const grouped = await js(`(() => { const s = window.__deckOverview.current(); const tw = s.nodes.find((n) => n.kind === 'towers').layout; const p = window.__deckOverview.towers(); return { group: tw.group, segments: tw.phases.length, focus: (tw.phases.find((x) => x.level === 'focus') || {}).id || null, faces: p.phaseAt(${JSON.stringify(model.focus?.feature ?? '')}), word: document.querySelector('.ov-grouping-toggle').textContent }; })()`);
  const unfinished = tickets.filter((x) => x.kind === 'feat' && x.state !== 'closed' && x.state !== 'dropped').length;
  check(grouped.group === 'feature' && grouped.segments === unfinished && grouped.focus === (model.focus?.feature ?? null) && grouped.word === 'By feature', `each of the ${unfinished} unfinished features is a segment, the feature in focus facing you`, grouped);
  await d.shot(win, '08-by-feature');
  // Selection and search work the same.
  if (model.next) {
    await go(`${base}?page=wheel&select=${encodeURIComponent(model.next)}&group=feature`);
    const sel = await js('window.__deckOverview.towers().selected()');
    check(sel !== null && sel.id === model.next && sel.curves === Math.min(240, joined(model.next).size), `by feature, ${model.next} selected draws its ${joined(model.next).size} curves`, sel);
  }
  // Deck remembers the choice: hiding the overview and opening the wheel again opens it by feature.
  await t.clickOn('#overview-toggle', 600);
  await t.clickOn('#overview-toggle', 300);
  check((await arrives(byFeatureAt)) === byFeatureAt, 'opened again, the wheel is still grouped by feature', { address: await shownAt() });
  await t.clickOn('.ov-grouping-toggle', 300);
  check((await arrives(`${base}?page=wheel`)) === `${base}?page=wheel`, 'and the switch puts it back by phase', { address: await shownAt() });
  t.finish();
};
