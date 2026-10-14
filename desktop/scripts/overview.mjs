#!/usr/bin/env node
// Read notes only. Uses the same built index and builder as the host; no Electron.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const usage = 'Usage: node desktop/scripts/overview.mjs <repo-root> [--json]\nBuild first: cd desktop && npm run build';
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage);
} else if (args.length < 1 || args.length > 2 || args[0].startsWith('--') || (args[1] && args[1] !== '--json')) {
  console.error(usage); process.exitCode = 2;
} else {
  try {
    const { docsRootFor, walkNotes } = require('../dist/main/note-index.js');
    const { repositoryHead } = require('../dist/main/overview-service.js');
    const { describeWorkspace } = require('../dist/main/workspaces.js');
    const { buildOverview } = require('../dist/shared/overview-model.js');
    const root = path.resolve(args[0]);
    if (!fs.statSync(root).isDirectory()) throw new Error(`Not a directory: ${root}`);
    const docsRoot = docsRootFor(root);
    const { records, problems } = walkNotes(docsRoot);
    if (problems.length) throw new Error(`Cannot build a complete overview: ${problems.map((p) => `${p.relPath}: ${p.reason}`).join('; ')}`);
    const model = buildOverview(records, { workspace: describeWorkspace(root)?.name ?? path.basename(root),
      head: repositoryHead(root), generated: new Date().toISOString(),
      readBody: (rel) => fs.readFileSync(path.join(docsRoot, rel), 'utf8') });
    if (args[1] === '--json') console.log(JSON.stringify(model, null, 2));
    else {
      console.log(`${model.workspace}: ${Object.keys(model.tickets).length} tickets at ${model.head || 'unknown commit'}`);
      for (const p of [...model.phases, ...model.shelf, ...model.backlog]) {
        const counts = Object.values(p.counts);
        const states = ['closed', 'progress', 'failed', 'owed', 'open', 'dropped'].map((s) => `${s}=${counts.reduce((n, c) => n + c[s], 0)}`).join(' ');
        console.log(`${p.id} ${p.name} (${p.kind}): ${p.tickets.length} tickets; ${states}`);
      }
      const unplaced = model.core.tickets.filter((id) => model.tickets[id].placedBy === 'none').length;
      console.log(`Core: ${model.core.tickets.length} tickets; ${unplaced} with no phase, ${model.core.tickets.length - unplaced} project-wide`);
      console.log('Acceptance states use note status; active means open. Automated active/passing are status approximations of CI.');
    }
  } catch (error) {
    console.error(`overview: ${error.message}`); process.exitCode = 1;
  }
}
