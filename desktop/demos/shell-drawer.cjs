// The shell drawer in the real Deck (FEAT-0035, TASK-0206's window run): ⌘ Shells, three shells at once,
// typing into one, closing one, and a session's Open its shell. The agent is the suite's fake.
// Run it in the box, never on the Mac's own screen:
//   bash tools/scripts/walk-in-a-box.sh shell-drawer --copy
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const ws = d.prepared.id;
  const base = `deck://${ws}/features`;
  const win = await d.open(`${base}?page=wheel`, { width: 1440, height: 960 });
  const t = lib(d, win);
  const { js, check, clickOn, keys } = t;
  const shownAt = () => js('window.__deckOverview && window.__deckOverview.current() ? window.__deckOverview.current().address : null');
  const until = async (code, tries = 80, every = 250) => {
    for (let i = 0; i < tries; i += 1) {
      const v = await js(code);
      if (v) return v;
      await d.delay(every);
    }
    return js(code);
  };
  for (let i = 0; i < 60 && (await shownAt()) === null; i += 1) await d.delay(250);
  await js(`localStorage.removeItem('deck.shells.open')`);
  const tabs = () => js(`[...document.querySelectorAll('.sh-drawer .sh-tab')].map((t) => ({ id: t.dataset.shell, words: t.textContent, active: t.classList.contains('is-active') }))`);
  const screen = (id) => js(`(() => { const f = document.querySelector('.sh-frame[data-shell="${id}"]'); const r = f && f.contentDocument && f.contentDocument.querySelector('.xterm-rows'); return r ? r.textContent : null; })()`);

  check((await t.rect('#shells-toggle')) !== null, '⌘ Shells stands in the header');
  await clickOn('#shells-toggle', 600);
  check((await t.rect('.sh-drawer')) !== null, 'and opens the drawer', { text: await t.text('.sh-drawer') });
  for (let i = 0; i < 3; i += 1) {
    await clickOn('.sh-drawer .sh-new', 900);
  }
  const three = await until(`document.querySelectorAll('.sh-drawer .sh-tab').length === 3 ? true : null`, 40);
  const list = await tabs();
  check(three === true && list.filter((x) => x.active).length === 1 && list[2].active, 'New shell three times: three tabs, the newest shown', { list });
  const id = list[2].id;
  const prompt = await until(`(() => { const f = document.querySelector('.sh-frame[data-shell="${id}"]'); const r = f && f.contentDocument && f.contentDocument.querySelector('.xterm-rows'); return r && r.textContent.trim().length > 0 ? r.textContent : null; })()`, 60);
  const alive = (await tabs()).find((x) => x.id === id);
  check(typeof prompt === 'string' && alive !== undefined && !/ended/.test(alive.words), 'the shell is running: its prompt is drawn and its tab has not ended', { screen: prompt && prompt.trim().slice(0, 120), tab: alive });
  await clickOn(`.sh-frame[data-shell="${id}"]`, 300);
  await keys(['p', 'w', 'd', 'Return'], 80);
  const answered = await until(`(() => { const f = document.querySelector('.sh-frame[data-shell="${id}"]'); const r = f && f.contentDocument && f.contentDocument.querySelector('.xterm-rows'); const after = r ? r.textContent.split('pwd').slice(1).join('pwd') : ''; return after.includes('/tmp/deck-copy') ? r.textContent : null; })()`, 40);
  check(typeof answered === 'string', 'typing pwd in it answers with the workspace\'s folder', { screen: answered && answered.trim().slice(-160) });
  await d.shot(win, '01-three-shells');
  await clickOn(`.sh-drawer .sh-tab[data-shell="${list[1].id}"] .sh-tab-close`, 900);
  const after = await tabs();
  check(after.length === 2 && after.some((x) => x.id === id && x.active), 'closing one shell leaves the others, the shown one still shown', { after });
  const running = await js(`window.deck.shells.list().then((r) => r.shells.map((s) => s.id))`);
  check(running.length === 2 && !running.includes(list[1].id), 'and its process is gone from Deck\'s list', { running });

  // ---- Open its shell from a session's pane ----
  const model = await (await fetch(`${d.origin}/deck/overview/${ws}`)).json();
  const ticket = model.tickets[model.next] ?? Object.values(model.tickets).find((x) => x.state !== 'closed');
  await js(`window.__deckOverview.go(${JSON.stringify(`${base}?page=wheel&select=${ticket.id}`)})`);
  await d.delay(1500);
  await clickOn('#overview-area [data-action^="agent-work-on:"]', 600);
  await until(`document.querySelector('.ag-dialog') ? true : null`);
  await clickOn('.ag-dialog .ag-send', 1200);
  await until(`document.querySelector('.ag-pane .ag-shell') ? true : null`, 40);
  await clickOn('.ag-pane .ag-shell', 1200);
  const withSession = await until(`(() => { const t = [...document.querySelectorAll('.sh-drawer .sh-tab')].find((x) => x.textContent.includes('·')); return t ? { id: t.dataset.shell, words: t.textContent, active: t.classList.contains('is-active') } : null; })()`, 40);
  check(withSession !== null && withSession.active, 'Open its shell in the session\'s pane opens a tab named for the session, shown', { withSession });
  await d.shot(win, '02-session-shell');
  await clickOn('.sh-drawer .sh-hide', 500);
  check((await t.rect('.sh-drawer')) === null && (await js(`window.deck.shells.list().then((r) => r.shells.length)`)) === 3, 'hiding the drawer leaves the shells running');
  t.finish();
};
