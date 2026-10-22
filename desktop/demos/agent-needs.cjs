// Needs you and the cockpit's overview panels in the real Deck (FEAT-0034, TASK-0203's window run).
// The agent is the suite's fake, playing `agent-needs.agents.json`, every word invented (RISK-0016).
// Run it in the box, never on the Mac's own screen:
//   bash tools/scripts/walk-in-a-box.sh agent-needs
// It runs on Deck itself, for the cockpit's digest, which needs the repository's history. Caught up
// moves the watermark in the box's own `.cockpit/` folder, a volume of its own, not the Mac's.
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const ws = d.prepared.id;
  const base = `deck://${ws}/features`;
  const win = await d.open(`${base}?page=wheel`, { width: 1440, height: 960 });
  const t = lib(d, win);
  const { js, check, clickOn } = t;
  const shownAt = () => js('window.__deckOverview && window.__deckOverview.current() ? window.__deckOverview.current().address : null');
  const until = async (code, tries = 80, every = 250) => {
    for (let i = 0; i < tries; i += 1) {
      const v = await js(code);
      if (v) return v;
      await d.delay(every);
    }
    return js(code);
  };
  const go = async (address) => {
    await js(`window.__deckOverview.go(${JSON.stringify(address)})`);
    for (let i = 0; i < 60 && (await shownAt()) !== address; i += 1) await d.delay(250);
    await d.delay(1200);
  };
  for (let i = 0; i < 60 && (await shownAt()) === null; i += 1) await d.delay(250);
  await js(`localStorage.removeItem('deck.overview.panels')`);
  await go(`${base}?page=wheel`);
  const model = await (await fetch(`${d.origin}/deck/overview/${ws}`)).json();
  const tickets = Object.values(model.tickets);

  // ---- The cockpit's four panels, top left, counted from the model and the digest ----
  const panel = await until(`(() => { const p = document.querySelector('#overview-area .ov-panel-cockpit'); return p && !/not known/.test(p.textContent) ? p.textContent : null; })()`);
  check(typeof panel === 'string' && /Since you last looked/.test(panel) && /The record/.test(panel) && /Checks/.test(panel) && /Waiting on a decision/.test(panel), 'the cockpit\'s four panels stand top left, the digest read', { text: panel && panel.slice(0, 200) });
  const tests = tickets.filter((x) => x.type === 'test').length;
  check(typeof panel === 'string' && panel.includes(`${tests} tests`), 'the checks count every test the model holds', { tests });
  await d.shot(win, '01-overview-panels');

  // ---- Caught up empties since you last looked ----
  if ((await t.rect('#overview-area .ov-ck-caught')) !== null) {
    await clickOn('#overview-area .ov-ck-caught', 900);
    const after = await until(`(() => { const p = document.querySelector('#overview-area .ov-panel-cockpit'); return p && /Nothing changed/.test(p.textContent) ? p.textContent : null; })()`, 40);
    check(typeof after === 'string', 'Caught up empties since you last looked', {});
    const digest = await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/digest`)).json();
    check(Array.isArray(digest.transitions) && digest.transitions.length === 0, 'and the cockpit\'s own digest is empty after it', { transitions: (digest.transitions || []).length });
  } else check(false, 'Caught up is offered in the shell');

  // ---- ◫ Overview hides the panels, the Agents list moves up, and the choice is kept ----
  const listAt = () => js(`(() => { const p = document.querySelector('#overview-area .ov-panel-agents'); return p ? Math.round(p.getBoundingClientRect().top) : null; })()`);
  const before = await listAt();
  await clickOn('#overview-area .ov-panels-toggle', 1200);
  const hiddenNow = await until(`!document.querySelector('#overview-area .ov-panel-cockpit')`, 20);
  const upAt = await listAt();
  check(hiddenNow === true && upAt !== null && before !== null && upAt < before, '◫ Overview hides the panels, and the Agents list moves up into their place', { before, upAt });
  await d.shot(win, '02-panels-hidden');
  await win.webContents.reload();
  for (let i = 0; i < 60 && (await shownAt().catch(() => null)) === null; i += 1) await d.delay(250);
  await d.delay(1500);
  check((await js(`!document.querySelector('#overview-area .ov-panel-cockpit')`)) === true, 'the choice is kept after a reload');
  await clickOn('#overview-area .ov-panels-toggle', 1200);
  check((await until(`!!document.querySelector('#overview-area .ov-panel-cockpit')`, 20)) === true, 'and pressing it again brings them back');

  // ---- A Deck request answered from Needs you ----
  const ticket = model.tickets[model.next] ?? tickets.find((x) => x.state !== 'closed');
  await go(`${base}?page=wheel&select=${encodeURIComponent(ticket.id)}`);
  await clickOn('#overview-area [data-action^="agent-work-on:"]', 600);
  await until(`document.querySelector('.ag-dialog') ? true : null`);
  await clickOn('.ag-dialog .ag-send', 800);
  const opened = await until(`/[?&]session=/.test(window.__deckOverview.current().address) ? window.__deckOverview.current().address : null`);
  const id = opened && new URL(opened.replace('deck://', 'http://x/')).searchParams.get('session');
  await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().waiting`, 80);
  await clickOn('.ag-pane .ag-close', 1200);
  const ask = await until(`(() => { const a = document.querySelector('#overview-area .ov-panel-needs .ov-needs-ask.is-deck'); return a ? a.textContent : null; })()`, 60);
  const order = await js(`(() => { const p = document.querySelector('#overview-area .ov-panel-needs'); if (!p) return null; const kids = [...p.children].map((e) => e.className.split(' ')[0]); return kids; })()`);
  check(typeof ask === 'string' && /npm run an-invented-script/.test(ask) && /Approve/.test(ask), 'Needs you lists the session\'s request first, with Approve and Deny', { ask, order });
  const count = await js(`Number((document.querySelector('#overview-area .ov-needs-big') || {}).textContent)`);
  const ticketsNeed = tickets.filter((x) => x.needsYou).length;
  check(count === ticketsNeed + 1, 'its count is the tickets that need you plus the request', { count, ticketsNeed });
  await d.shot(win, '03-needs-you-request');
  await clickOn('#overview-area .ov-panel-needs .ov-needs-ask.is-deck .ov-needs-approve', 900);
  const idle = await until(`window.deck.agents.list().then((l) => (l.find((s) => s.id === ${JSON.stringify(id)}) || {}).state === 'idle')`, 60);
  check(idle === true, 'Approve in Needs you reaches the agent, which goes on and ends its turn');
  const gone = await until(`!document.querySelector('#overview-area .ov-panel-needs .ov-needs-ask.is-deck')`, 40);
  check(gone === true, 'and the request leaves Needs you');
  const git = await js(`(document.querySelector('#overview-area .ov-needs-git') || {}).textContent || null`);
  check(typeof git === 'string' && /pushed|upstream|changed/.test(git), 'what is not pushed comes last', { git });
  await d.shot(win, '04-needs-you-answered');
  t.finish();
};
