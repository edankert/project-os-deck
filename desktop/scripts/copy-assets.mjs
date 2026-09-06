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
for (const file of ['index.html', 'deck.css']) {
  await cp(path.join(src, file), path.join(out, file));
}
console.log(`copy-assets: index.html and deck.css -> ${path.relative(process.cwd(), out)}`);
