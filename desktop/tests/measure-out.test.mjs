// TST-0057 — the measurement is kept in a file, not only printed (ISS-0080).
//
// A measurement takes a person's screen for several minutes and needs the
// window in front. On 2026-09-12 the run's output went through a `tail` that
// kept seventy lines, two of the three workspaces were lost, and the numbers
// had to be taken again. The write lives in `measure.ts` rather than in
// `main.ts` so it can be driven here, without Electron.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from './helpers.mjs';

const { measurementName, saveMeasurement } = load('main/measure.js');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deck-measure-'));
}

test('the numbers are written to a file, and the file holds what was printed', () => {
  const dir = path.join(tempDir(), 'measurements');
  const results = [{ workspace: 'a repo', glass: { medianMs: 8.1 } }];
  const file = saveMeasurement(dir, results, new Date('2026-09-20T14:03:05.123Z'));

  assert.equal(fs.existsSync(file), true, 'the measurement was printed and kept nowhere');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), { measurements: results });
});

test('the directory is made if it is not there, because the first run is the one that matters', () => {
  // The default directory is `measurements/` under the repository, which no
  // clone carries: a run that refused because the folder was missing would
  // lose exactly the run this check exists for.
  const dir = path.join(tempDir(), 'not', 'made', 'yet');
  const file = saveMeasurement(dir, [], new Date('2026-09-20T14:03:05.000Z'));
  assert.equal(path.dirname(file), dir);
  assert.equal(fs.readFileSync(file, 'utf-8').endsWith('\n'), true, 'a file a shell can cat ends in a newline');
});

test('two runs on one day are two files, named by the second they were taken at', () => {
  const dir = tempDir();
  const first = saveMeasurement(dir, ['one'], new Date('2026-09-20T14:03:05.000Z'));
  const second = saveMeasurement(dir, ['two'], new Date('2026-09-20T14:07:41.000Z'));
  assert.notEqual(first, second, 'the second run overwrote the first');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['2026-09-20T14-03-05Z.json', '2026-09-20T14-07-41Z.json']);
});

test('the name carries no colon, so it is one word to a shell', () => {
  const name = measurementName(new Date('2026-09-20T14:03:05.123Z'));
  assert.equal(name, '2026-09-20T14-03-05Z.json');
  assert.equal(name.includes(':'), false);
});
