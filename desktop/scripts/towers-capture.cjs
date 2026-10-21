// TASK-0163 — pictures of the towers design page (DES-0005, towers on the ring), so
// the plate can be judged without a network connection. Run from desktop/:
//   npx electron scripts/towers-capture.cjs <page.html> <out dir>
// It loads the page in a hidden window and saves `towers-<workspace>-<view>.jpg` for
// the opening view, from above, from the side, and the focus phase brought close; and
// (TASK-0176) `-linked` with a ticket's links drawn and `-search` with a search lit; and
// (TASK-0177) `-byfeature` with the ring grouped by feature.
// The page loads three.js from cdnjs, so this needs the network. Errors the page
// logs are printed, and fail the run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const [page, out] = process.argv.slice(-2);
const VIEWS = [['home', 'home', false], ['above', 'above', false], ['side', 'side', false], ['phase', 'home', true]];
// Words that light a handful of each workspace's tickets, for the search picture (TASK-0176).
const SEARCH = { deck: 'wheel', 'your-trainer': 'heart rate' };
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 1000, show: false, webPreferences: { offscreen: false, backgroundThrottling: false } });
  win.webContents.setBackgroundThrottling(false);
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    // Electron's own warning about a page with no content security policy is not the page's error.
    if (level >= 2 && !message.includes('Electron Security Warning')) errors.push(message);
  });
  await win.loadFile(path.resolve(page));
  for (let i = 0; i < 80 && !(await win.webContents.executeJavaScript('Boolean(window.__towers)')); i += 1) await new Promise((r) => setTimeout(r, 250));
  const workspaces = await win.webContents.executeJavaScript('Object.keys(JSON.parse(document.getElementById("data").textContent))');
  fs.mkdirSync(out, { recursive: true });
  for (const ws of workspaces) {
    for (const [name, view, phase] of VIEWS) {
      const info = await win.webContents.executeJavaScript(`window.__showTowers(${JSON.stringify(ws)}, ${JSON.stringify(view)}, ${phase ? 'window.__towers.focus.phase' : 'null'})`);
      await new Promise((r) => setTimeout(r, 1300));
      const image = await win.webContents.capturePage();
      const file = path.join(out, `towers-${ws}-${name}.jpg`);
      fs.writeFileSync(file, image.toJPEG(84));
      console.log(`${file}: ${info.tickets} tickets (${info.drawn} drawn), ${info.towers} towers, focus ${info.focus.phase} ${info.focus.feature}, next ${info.next}`);
    }
    // TASK-0177: the ring grouped by feature, and what the needs-you panel, the weeks, the
    // age badges and the evidence ring show.
    const grouped = await win.webContents.executeJavaScript(`window.__showTowers(${JSON.stringify(ws)}, 'home', null, 'feature')`);
    await new Promise((r) => setTimeout(r, 1500));
    fs.writeFileSync(path.join(out, `towers-${ws}-byfeature.jpg`), (await win.webContents.capturePage()).toJPEG(84));
    const panels = await win.webContents.executeJavaScript('({ needs: window.__towersProbe.needs(), weeks: window.__towersProbe.weeks(), ages: window.__towersProbe.ages().length, evidence: window.__towersProbe.evidence() })');
    console.log(`towers-${ws}-byfeature.jpg: ${grouped.ring.length} features on the ring, ${grouped.drawn} tickets drawn; needs you ${panels.needs.count} (${panels.needs.keys.join(', ')}); ${panels.weeks.reduce((a, b) => a + b, 0)} closed this year; ${panels.ages} age badges; evidence ${panels.evidence.filter((e) => e.loaded).length} of ${panels.evidence.length} pictures loaded`);
    await win.webContents.executeJavaScript(`window.__showTowers(${JSON.stringify(ws)}, 'home', null, 'phase')`);
    // TASK-0176: a ticket selected with its links drawn, a search lit, and the next-up board.
    await win.webContents.executeJavaScript(`window.__showTowers(${JSON.stringify(ws)}, 'home', null)`);
    const chosen = await win.webContents.executeJavaScript('window.__towersProbe.widest()');
    const picked = await win.webContents.executeJavaScript(`window.__towersProbe.select(${JSON.stringify(chosen)})`);
    await new Promise((r) => setTimeout(r, 1500));
    fs.writeFileSync(path.join(out, `towers-${ws}-linked.jpg`), (await win.webContents.capturePage()).toJPEG(84));
    console.log(`towers-${ws}-linked.jpg: ${chosen} with ${picked.links.length} links, ${picked.curves} curves; card "${String(picked.card).slice(0, 120)}"`);
    await win.webContents.executeJavaScript(`window.__showTowers(${JSON.stringify(ws)}, 'home', null)`);
    const query = SEARCH[ws] ?? 'test';
    const found = await win.webContents.executeJavaScript(`window.__towersProbe.search(${JSON.stringify(query)})`);
    await new Promise((r) => setTimeout(r, 1300));
    fs.writeFileSync(path.join(out, `towers-${ws}-search.jpg`), (await win.webContents.capturePage()).toJPEG(84));
    console.log(`towers-${ws}-search.jpg: "${query}" lit ${found.found.length} (${found.count}), listed ${found.listed.length}`);
    const queue = await win.webContents.executeJavaScript('window.__towersProbe.queue()');
    console.log(`next up on ${ws}: ${queue.map(([id, kind]) => `${id} ${kind}`).join(', ')}`);
    await win.webContents.executeJavaScript('window.__towersProbe.clear()');
  }
  if (errors.length > 0) {
    console.error(`the page logged ${errors.length} error(s):\n${errors.join('\n')}`);
    process.exitCode = 1;
  }
  app.quit();
});
