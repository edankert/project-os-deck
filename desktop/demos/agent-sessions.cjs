// Deck's own agent sessions on the towers (FEAT-0033, TASK-0201): Work on this, the session
// pane and its composer, the marker over the ticket and the Agents list, in the real Deck.
// The agent is the suite's fake, playing `agent-sessions.agents.json`, whose words are all
// invented: no model is reached and nothing real is in a picture (RISK-0016).
// Run it in the box, never on the Mac's own screen:
//   bash tools/scripts/walk-in-a-box.sh agent-sessions
//   bash tools/scripts/walk-in-a-box.sh agent-sessions --workspace ../your-trainer --name agent-sessions-yt
// It writes no note. The sessions it starts are kept in a temporary folder.
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
  const pane = () => js(`(() => { const m = window.__deckOverview.agents.model(); return m && { state: m.head.state, waiting: m.waiting, open: m.open.map((r) => r.tool + ' ' + r.summary), turns: m.turns.length, kinds: m.turns.map((t) => t.items.map((i) => i.kind).join(',')) }; })()`);
  const sessionOf = (address) => new URL(address.replace('deck://', 'http://x/')).searchParams.get('session');
  for (let i = 0; i < 60 && (await shownAt()) === null; i += 1) await d.delay(250);
  await go(`${base}?page=wheel`);
  const model = await (await fetch(`${d.origin}/deck/overview/${ws}`)).json();

  // ---- TASK-0199: the Agents list is on the wheel, empty to begin with ----
  const empty = await until(`(() => { const p = document.querySelector('#overview-area .ov-panel-agents'); return p && p.textContent; })()`);
  check(typeof empty === 'string' && /No agent sessions/.test(empty), 'the wheel has the Agents list, saying there are no sessions yet', { text: empty });
  await d.shot(win, '01-wheel-agents-list');

  // ---- TASK-0200: Work on this on a selected ticket's card ----
  const ticket = model.tickets[model.next] ?? Object.values(model.tickets).find((x) => x.state !== 'closed');
  await go(`${base}?page=wheel&select=${encodeURIComponent(ticket.id)}`);
  const button = '#overview-area [data-action^="agent-work-on:"]';
  check((await t.rect(button)) !== null, `${ticket.id}'s card has Work on this`, { text: await t.text(button) });
  await clickOn(button, 600);
  const dialog = await until(`(() => { const f = document.querySelector('.ag-dialog'); if (!f) return null; const v = (n) => f.querySelector('[name="' + n + '"]').value; return { agent: v('agent'), model: v('model'), effort: v('effort'), access: v('access'), place: v('place'), prompt: v('prompt') }; })()`);
  const expected = ticket.needsYou && ticket.needs && ticket.needs.say.trim() !== '' ? `${ticket.id} ${ticket.title}: ${ticket.needs.say}` : `Work on ${ticket.id}: ${ticket.title}`;
  check(dialog !== null && dialog.prompt === expected, 'the dialog fills the first prompt with the ticket\'s own words', { dialog, expected });
  check(dialog !== null && dialog.agent === 'claude' && dialog.access === 'ask' && dialog.place === 'checkout', 'and starts on Claude, Ask before acting, in this checkout', { dialog });
  await d.shot(win, '02-work-on-this');
  await clickOn('.ag-dialog .ag-send', 800);
  const opened = await until(`(() => { const a = window.__deckOverview.current().address; return /[?&]session=/.test(a) && window.__deckOverview.agents.openId() ? a : null; })()`);
  check(opened !== null, 'Start opens the wheel on the new session, in the pane', { address: await shownAt() });
  const id = opened === null ? null : sessionOf(opened);

  // ---- TASK-0197: the pane draws the turn; the request waits at its turn ----
  const waiting = await until(`(() => { const m = window.__deckOverview.agents.model(); return m && m.waiting; })()`, 120);
  const p1 = await pane();
  check(waiting === 'Claude is waiting for you' && p1.open.join() === 'Edit src/example.ts', 'the request to edit waits for an answer, and the pane says Claude is waiting for you', p1);
  check((await t.rect('.ag-pane .ag-ask-open .ag-approve')) !== null && (await t.rect('.ag-pane .ag-ask-open .ag-deny')) !== null, 'with Approve and Deny at its turn');
  // ---- TASK-0199: the marker over the ticket, and the row in the Agents list ----
  const marker = await until(`(() => { const p = window.__deckOverview.towers(); const a = p && p.agents().find((x) => x.id === ${JSON.stringify(id)}); return a && a.shown && a.state === 'waiting' ? a : null; })()`);
  check(marker !== null && marker.ticket === ticket.id && marker.state === 'waiting', `a marker stands over ${ticket.id}, in the waiting colour`, { marker });
  // While a session is open the left side makes way, so the ring and its marker stand clear of the panels.
  check((await t.rect('#overview-area .ov-panel-agents')) === null && (await t.rect('#overview-area [data-panel="next-up"].ov-panel')) === null, 'and the panels on the left make way while the session is open');
  await d.shot(win, '03-session-waiting');

  await clickOn('.ag-pane .ag-ask-open .ag-approve', 600);
  await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().head.state === 'idle'`, 120);
  const chips = await js(`[...document.querySelectorAll('.ag-pane .ag-chip')].map((c) => c.textContent)`);
  const edits = await js(`[...document.querySelectorAll('.ag-pane .ag-edit summary')].map((s) => s.textContent)`);
  const plan = await js(`[...document.querySelectorAll('.ag-pane .ag-plan li')].map((li) => (li.classList.contains('is-done') ? '✓ ' : '· ') + li.textContent)`);
  check(chips.includes('Read 1') && chips.includes('Bash 2'), 'once approved the turn runs on: its steps as chips with counts', { chips });
  check(edits.length === 1 && /src\/example\.ts\+6−2/.test(edits[0]), 'its edit with the lines added and removed', { edits });
  check(plan.join('|') === '✓ Read the ticket|✓ Change the example|· Run the checks', 'and its plan as it stands', { plan });
  check(!(await js(`/[$]|usd|cost/i.test(document.querySelector('.ag-pane').textContent)`)), 'and the pane draws no cost');
  await d.shot(win, '04-session-turn');

  // ---- TASK-0198: the composer sends, a denial reaches the agent, Interrupt and Stop ----
  const send = async (text) => {
    await js(`(() => { const a = document.querySelector('.ag-pane .ag-input'); a.value = ${JSON.stringify(text)}; a.dispatchEvent(new Event('input')); })()`);
    await clickOn('.ag-pane .ag-send', 600);
  };
  await send('Run the checks, an invented prompt.');
  await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().open.length === 1`, 120);
  check((await pane()).open.join() === 'Bash npm test', 'a prompt from the composer starts the next turn, which asks to run a command');
  await clickOn('.ag-pane .ag-ask-open .ag-deny', 600);
  const idleAgain = await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().head.state === 'idle'`, 120);
  // What the pane and the session's own records say, so a turn that does not end can be read afterwards.
  d.log('after Deny', { idle: idleAgain, pane: await pane(), records: await js(`window.deck.agents.conversation(${JSON.stringify(id)}).then((rs) => rs.slice(-6))`), list: await js(`window.deck.agents.list()`) });
  check(idleAgain === true, 'and the turn ends: the session is idle again');
  const denied = await js(`[...document.querySelectorAll('.ag-pane .ag-ask-denied')].length`);
  const notAllowed = await js(`[...document.querySelectorAll('.ag-pane .ag-text')].some((e) => /^Not allowed/.test(e.textContent))`);
  check(denied === 1 && notAllowed, 'Deny reaches the agent: the request shows denied and the agent says it was not allowed', { denied, notAllowed });
  await send('Read everything, an invented prompt.');
  const interrupt = await until(`document.querySelector('.ag-pane .ag-interrupt') ? true : null`, 40, 100);
  check(interrupt === true && (await t.rect('.ag-pane .ag-send')) === null, 'while it works, Interrupt stands where Send was');
  await clickOn('.ag-pane .ag-interrupt', 900);
  const after = await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().head.state === 'idle' ? [...document.querySelectorAll('.ag-pane .ag-note')].map((e) => e.textContent) : null`, 60);
  check(Array.isArray(after) && after.some((x) => /interrupted/.test(x)), 'Interrupt stops the turn, and the pane says so', { notes: after });
  await clickOn('.ag-pane .ag-stop', 300);
  check(/Press again/.test(await t.text('.ag-pane .ag-stop')), 'Stop asks once more before it ends the session');
  await clickOn('.ag-pane .ag-stop', 900);
  const stopped = await until(`window.__deckOverview.agents.model() && window.__deckOverview.agents.model().head.state === 'stopped'`, 60);
  check(stopped === true && (await t.rect('.ag-pane .ag-resume')) !== null, 'and then the session is stopped, with Resume offered', {});
  await d.shot(win, '05-session-stopped');

  // ---- TASK-0199: the address opens the session again; closing the pane forgets it ----
  await clickOn('.ag-pane .ag-close', 900);
  const closed = await shownAt();
  check(sessionOf(closed) === null && (await js(`window.__deckOverview.agents.openId()`)) === null, 'closing the pane goes to the wheel without the session', { address: closed });
  const listed = await until(`(() => { const r = document.querySelector('#overview-area .ov-panel-agents [data-agent=${JSON.stringify(id)}]'); return r && /stopped/.test(r.textContent) ? r.textContent : null; })()`, 40);
  check(typeof listed === 'string' && listed.includes(ticket.id), 'and the Agents list is back, its row saying the session stopped', { row: listed });
  await go(`${base}?page=wheel&session=${encodeURIComponent(id)}`);
  const again = await until(`(() => { const m = window.__deckOverview.agents.model(); return m && m.turns.length; })()`);
  check(again === 3, 'its address opens the same session again, every turn drawn', { turns: again });
  await go(`${base}?page=wheel`);
  await clickOn(`#overview-area .ov-panel-agents [data-agent=${JSON.stringify(id)}]`, 1200);
  check(sessionOf(await shownAt()) === id, 'and so does its row in the Agents list', { address: await shownAt() });
  await d.shot(win, '06-opened-from-the-list');
  t.finish();
};
