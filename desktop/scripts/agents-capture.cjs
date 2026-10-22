// TASK-0178 — pictures of DES-0006's page, so the design can be judged without a network
// connection. Run from desktop/:
//   npx electron scripts/agents-capture.cjs <page.html> <out dir>
// For each workspace it saves `agents-<workspace>-ring.jpg` (the agents at their towers and
// the panels), `-session.jpg` (the session with the most tickets opened), `-work.jpg`
// ("Work on this" on the next ticket) and `-drawer.jpg` (the shell drawer open), in a hidden
// window, grouped by phase. Errors the page logs fail the run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const [page, out] = process.argv.slice(-2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 1000, show: false, webPreferences: { backgroundThrottling: false } });
  win.webContents.setBackgroundThrottling(false);
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2 && !message.includes('Electron Security Warning')) errors.push(message);
  });
  await win.loadFile(path.resolve(page));
  for (let i = 0; i < 80 && !(await win.webContents.executeJavaScript('Boolean(window.__towers && window.__agents)')); i += 1) await wait(250);
  const js = (s) => win.webContents.executeJavaScript(s);
  const shot = async (name) => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toJPEG(84));
  fs.mkdirSync(out, { recursive: true });
  const workspaces = await js('Object.keys(JSON.parse(document.getElementById("data").textContent))');
  for (const ws of workspaces) {
    const info = await js(`window.__showTowers(${JSON.stringify(ws)}, 'home', null, 'phase')`);
    await wait(1400);
    await shot(`agents-${ws}-ring.jpg`);
    const sessions = await js('window.__agents.sessions()');
    const placed = sessions.filter((s) => s.placed).length;
    // A check, not only pictures (review of TASK-0178): every session whose ticket stands on the
    // ring is drawn there, and Needs you counts what the data holds.
    const expected = await js(`(() => { const d = JSON.parse(document.getElementById('data').textContent)[${JSON.stringify(ws)}].agents.sessions; return d.filter((s) => s.tickets.some((t) => window.__towersProbe.ticketAt(t) !== null)).map((s) => s.id); })()`);
    const missing = expected.filter((id) => !sessions.find((s) => s.id === id && s.placed));
    if (missing.length > 0) errors.push(`${ws}: sessions with a ticket on the ring but no marker: ${missing.join(', ')}`);
    // The session that worked on the most tickets and is placed on the ring.
    const busiest = await js(`(() => { const d = JSON.parse(document.getElementById('data').textContent)[${JSON.stringify(ws)}].agents.sessions; const placed = new Set(window.__agents.sessions().filter((s) => s.placed).map((s) => s.id)); return [...d].filter((s) => placed.has(s.id)).sort((a, b) => b.tickets.length - a.tickets.length)[0]?.id ?? d[0]?.id ?? null; })()`);
    if (busiest) {
      const opened = await js(`window.__agents.open(${JSON.stringify(busiest)})`);
      if (opened.session !== busiest || !/Working on/.test(opened.pane) || !/The conversation/.test(opened.pane)) errors.push(`${ws}: the session pane for ${busiest} is not drawn`);
      await wait(1200);
      await shot(`agents-${ws}-session.jpg`);
      await js('window.__agents.close()');
    }
    const next = info.next ?? (await js(`JSON.parse(document.getElementById('data').textContent)[${JSON.stringify(ws)}].focus.feature`));
    if (next) {
      const dialog = await js(`window.__agents.workOn(${JSON.stringify(next)})`);
      if (!dialog.includes('New session') || !dialog.includes(next)) errors.push(`${ws}: Work on this did not open for ${next}`);
      await wait(900);
      await shot(`agents-${ws}-work.jpg`);
      await js('window.__agents.close()');
    }
    await js('window.__agents.drawer(true)');
    await wait(500);
    await shot(`agents-${ws}-drawer.jpg`);
    await js('window.__agents.drawer(false)');
    console.log(`${ws}: ${sessions.length} sessions, ${placed} placed on the ring; opened ${busiest}; Work on this for ${next}`);
  }
  if (errors.length > 0) {
    console.error(`the page logged ${errors.length} error(s):\n${errors.join('\n')}`);
    process.exitCode = 1;
  }
  app.quit();
});
