// The towers' Rubric ideas in the real Deck (FEAT-0031): each task of the feature adds
// its part of the route here, and TASK-0187 runs it as the window run's evidence.
// Run it in the box, never on the Mac's own screen:
//   bash tools/scripts/walk-in-a-box.sh towers-rubric
//   bash tools/scripts/walk-in-a-box.sh towers-rubric --workspace ../your-trainer --name towers-rubric-yt
// It reads the notes and changes nothing.
const lib = require('./lib.cjs');

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
  t.finish();
};
