// The towers page's note helpers (TASK-0163 to TASK-0179). Since TASK-0181 they live in
// Deck's shared code, `src/shared/overview-notes.ts`, so Deck's overview model and the page
// use one copy; this file loads them from the build (`npm run build` first).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const notes = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'shared', 'overview-notes.js'));

export const { LIST_KEYS, idsIn, plainMarkdown, leadOf, relationsFrom, ownerWord, boardOf, evidenceFrom, lastDates, weeksOf, designFeature } = notes;
