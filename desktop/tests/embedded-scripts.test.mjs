// TST-0037's page scripts are strings, and a backtick in one closes it.
//
// Twice now a Markdown-style `code span` written in a comment inside one of
// `main.ts`'s `executeJavaScript` template literals ended the literal, and the
// error TypeScript reported pointed at a line twenty further down (ISS-0053).
// Both times it cost a build-and-run cycle to find. This finds it in 3ms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot } from './helpers.mjs';

test('no comment inside an embedded page script carries a backtick', () => {
  const source = fs.readFileSync(path.join(desktopRoot, 'src/main/main.ts'), 'utf-8');
  const lines = source.split('\n');
  // The literals are opened by a line ending in a bare backtick and closed by
  // one whose only content is a backtick. Crude, and it is the shape this file
  // actually uses.
  // The invariant, stated as the thing that makes it checkable: a page script
  // contains NO backtick. So from the line that opens one, the first line
  // carrying a backtick is where it ends — and if that line is a comment, the
  // literal ended in the wrong place.
  const offenders = [];
  lines.forEach((line, i) => {
    if (!/executeJavaScript\(`$/.test(line.trim())) return;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!lines[j].includes('`')) continue;
      if (lines[j].trim().startsWith('//')) {
        offenders.push(`main.ts:${j + 1}: ${lines[j].trim().slice(0, 80)}`);
      }
      return;
    }
  });
  assert.deepEqual(offenders, [], `a backtick in a comment inside a page script closes the string:\n${offenders.join('\n')}`);
});
