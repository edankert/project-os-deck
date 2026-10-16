// Copies the renderer's non-TypeScript assets into the served document root.
//
// The document root is dist/web, and it is what BOTH hosts serve: the Electron
// window loads http://127.0.0.1:<port>/ from it, and so does a tablet
// (ADR-0001). index.html therefore has to sit at the root of dist/web, not
// beside the compiled renderer modules under dist/web/renderer/.
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'src', 'renderer');
const out = path.join(here, '..', 'dist', 'web');

await mkdir(out, { recursive: true });
// three.js, for the overview's towers (TASK-0167, RISK-0010), copied from the pinned
// package into Deck's own document root: the page loads code from its own origin only.
// The page names it in an inline import map, which its content policy allows by hash;
// a map edited without its hash would be refused by the window, so it is refused here,
// before anything is copied.
{
  const { createHash } = await import('node:crypto');
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(path.join(src, 'index.html'), 'utf8');
  const map = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html)?.[1];
  const hash = map === undefined ? null : `'sha256-${createHash('sha256').update(map).digest('base64')}'`;
  if (hash === null || !html.includes(`script-src 'self' ${hash}`)) {
    throw new Error(`copy-assets: index.html's import map and its content policy disagree; the policy needs ${hash}`);
  }
  await mkdir(path.join(out, 'vendor'), { recursive: true });
  await cp(path.join(here, '..', 'node_modules', 'three', 'build', 'three.module.min.js'), path.join(out, 'vendor', 'three.module.min.js'));
}
for (const file of ['index.html', 'deck.css']) {
  await cp(path.join(src, file), path.join(out, file));
}
// The overview's palette and look are written once, in shared/overview-scene.ts,
// for the renderer and for DES-0005's plates. The page's policy allows no inline
// style, so the built module's stylesheet is written out as a file here.
const { writeFile } = await import('node:fs/promises');
const scene = await import(path.join(here, '..', 'dist', 'shared', 'overview-scene.js'));
await writeFile(path.join(out, 'overview.css'), scene.OVERVIEW_CSS ?? scene.default.OVERVIEW_CSS);
console.log(`copy-assets: index.html, deck.css, overview.css and vendor/three.module.min.js -> ${path.relative(process.cwd(), out)}`);
