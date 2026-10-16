// TASK-0163 — pictures of the towers design page (DES-0005, towers on the ring), so
// the plate can be judged without a network connection. Run from desktop/:
//   npx electron scripts/towers-capture.cjs <page.html> <out dir>
// It loads the page in a hidden window and saves `towers-<workspace>-<view>.jpg` for
// the opening view, from above, from the side, and the focus phase brought close.
// The page loads three.js from cdnjs, so this needs the network. Errors the page
// logs are printed, and fail the run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const [page, out] = process.argv.slice(-2);
const VIEWS = [['home', 'home', false], ['above', 'above', false], ['side', 'side', false], ['phase', 'home', true]];
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
  }
  if (errors.length > 0) {
    console.error(`the page logged ${errors.length} error(s):\n${errors.join('\n')}`);
    process.exitCode = 1;
  }
  app.quit();
});
