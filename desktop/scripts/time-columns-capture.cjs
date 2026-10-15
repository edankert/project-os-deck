// TASK-0157 — pictures of the Level 2 design page (DES-0005, "height is time"), so the
// plate can be judged without a network connection. Run from desktop/:
//   npx electron scripts/time-columns-capture.cjs <page.html> <out dir>
// It loads the page in a hidden window, shows each workspace from each angle, and saves
// `time-<workspace>-<angle>.jpg`. The page loads three.js from cdnjs, so this needs the network.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const [page, out] = process.argv.slice(-2);
const VIEWS = [['angle-1', 0], ['angle-2', 1], ['above', 2]];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 1000, show: false, webPreferences: { offscreen: false, backgroundThrottling: false } });
  win.webContents.setBackgroundThrottling(false);
  await win.loadFile(path.resolve(page));
  for (let i = 0; i < 80 && !(await win.webContents.executeJavaScript('Boolean(window.__timeColumns)')); i += 1) await new Promise((r) => setTimeout(r, 250));
  const workspaces = await win.webContents.executeJavaScript('Object.keys(JSON.parse(document.getElementById("data").textContent))');
  fs.mkdirSync(out, { recursive: true });
  for (const ws of workspaces) {
    for (const [name, view] of VIEWS) {
      await win.webContents.executeJavaScript(`window.__showTime(${JSON.stringify(ws)}, ${view})`);
      await new Promise((r) => setTimeout(r, 900));
      const image = await win.webContents.capturePage();
      const file = path.join(out, `time-${ws}-${name}.jpg`);
      fs.writeFileSync(file, image.toJPEG(84));
      const info = await win.webContents.executeJavaScript('window.__timeColumns');
      console.log(`${file}: ${info.tickets} tickets, ${info.undated} with no created date`);
    }
  }
  app.quit();
});
