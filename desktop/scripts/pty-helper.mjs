// After an install (FEAT-0035, TASK-0205): node-pty 1.1.0 ships its macOS `spawn-helper` without the
// execute bit, and every shell then fails with "posix_spawnp failed". This sets it. node-pty is an
// optional dependency: where it did not install, there is nothing to do and Deck says shells are off.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'node-pty');
const helpers = [
  ...['darwin-arm64', 'darwin-x64'].map((d) => path.join(root, 'prebuilds', d, 'spawn-helper')),
  path.join(root, 'build', 'Release', 'spawn-helper'),
];
for (const file of helpers) {
  if (fs.existsSync(file)) fs.chmodSync(file, 0o755);
}
