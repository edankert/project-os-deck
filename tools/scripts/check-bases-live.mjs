#!/usr/bin/env node
/**
 * Read every base file in the vault the way Deck reads it, and print what it
 * would draw and what it refuses to guess at.
 *
 * This is steps 4 to 7 of [[TST-0027]] — point Deck at a Comic base, at the
 * sidebar base, at a TaskNotes base, and read what it says about constructs it
 * cannot understand — done as a measurement over EVERY base file at once
 * rather than three of them by hand.
 *
 *     node tools/scripts/check-bases-live.mjs [vault-path]
 *
 * Reads only. Nothing is written and no application is started.
 *
 * **A refusal is the result, not a failure.** The thing this looks for is a
 * base file that draws a list with nothing said about what it could not read —
 * a silently different list is the failure [[RISK-0003]] is about. A file Deck
 * cannot read at all is a failure too. A file Deck reads partly and REPORTS
 * partly is the working case, and most TaskNotes views are that.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VAULT = process.argv[2] ?? path.join(process.env.HOME ?? '', 'Notes');
const require_ = createRequire(path.join(REPO, 'x.js'));
const { fromBaseFile } = require_(path.join(REPO, 'desktop/dist/shared/base-file.js'));
const { runQuery } = require_(path.join(REPO, 'desktop/dist/shared/query.js'));
const { walkNotes, pathPrefixFor, docsRootFor } = require_(path.join(REPO, 'desktop/dist/main/note-index.js'));
const { isExcluded } = require_(path.join(REPO, 'desktop/dist/shared/records.js'));

const docsRoot = docsRootFor(VAULT);
const index = { records: walkNotes(docsRoot).records, pathPrefix: pathPrefixFor(VAULT, docsRoot) };
console.log(`${index.records.length} notes read from ${docsRoot}\n`);

/** Every `.base` a person could actually open — the trash and `__bases__` rules apply. */
function baseFiles(dir, prefix = '') {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      found.push(...baseFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.base')) {
      found.push(rel);
    }
  }
  return found;
}

/**
 * Views that draw nothing, say nothing, and are RIGHT to.
 *
 * A view selecting no notes with no unsupported construct named is the shape
 * this script exists to catch: an empty view and a broken view look identical
 * on screen and only one of them is a bug. But some views really are empty,
 * and softening the rule would throw the check away — so each one is verified
 * once, by hand, and written down here with what made it empty. A view not on
 * this list that draws nothing and says nothing is a failure.
 *
 * Re-check a row when the vault's data moves: these three become non-empty the
 * moment a task is scheduled for a future date.
 */
const KNOWN_EMPTY = {
  '__bases__/Tasks/Tasks Base.base / Today\'s Tasks':
    'nothing in the vault is scheduled or due on 2026-09-09; the latest date of either kind is 2026-03-17',
  "__bases__/Tasks/Tasks Base.base / This Week's Tasks":
    'the same: no note is scheduled between today and a week from today, so the filter is true of nothing',
  '__bases__/Tasks/Tasks Base.base / Future Tasks':
    'the same: no note is scheduled after today at all',
};

const failures = [];
let views = 0;
let drawnEmptyAndSilent = 0;

for (const rel of baseFiles(VAULT).sort()) {
  const text = fs.readFileSync(path.join(VAULT, rel), 'utf-8');
  const file = fromBaseFile(text, rel);
  console.log(`${rel}`);
  if (file.refusals.length > 0) {
    for (const refusal of file.refusals) console.log(`    file: ${refusal.construct} — ${refusal.reason}`);
  }
  if (file.views.length === 0) {
    console.log('    no view at all');
    // A file with no views AND nothing said about why is the failure this
    // looks for. One that named its problem above did its job.
    if (file.refusals.length === 0) failures.push(`${rel}: no views and nothing said about why`);
    console.log();
    continue;
  }
  for (const view of file.views) {
    views += 1;
    const named = [...view.refusals];
    let selected = null;
    let unsupported = [];
    if (view.description !== null) {
      const result = runQuery(view.description, index);
      selected = result.groups.reduce((sum, group) => sum + group.cards.length, 0);
      unsupported = result.unsupported;
    }
    const said = [...named.map((r) => `${r.construct} — ${r.reason}`), ...unsupported.map((u) => `${u.construct} — ${u.reason}`)];
    console.log(`    view "${view.name}": ${selected === null ? 'no description built' : `${selected} note(s)`}`);
    for (const line of said) console.log(`        says: ${line}`);
    if (view.description === null && named.length === 0) {
      failures.push(`${rel} / ${view.name}: no description and nothing said about why`);
    }
    if (selected === 0 && said.length === 0) {
      drawnEmptyAndSilent += 1;
      const known = KNOWN_EMPTY[`${rel} / ${view.name}`];
      if (known === undefined) {
        failures.push(
          `${rel} / ${view.name}: selects NOTHING and names no unsupported construct — an empty view and a broken view look identical on screen`,
        );
      } else {
        console.log(`        (empty on purpose: ${known})`);
      }
    }
  }
  console.log();
}

console.log(`${views} view(s) read across the vault's base files`);
console.log(`${drawnEmptyAndSilent} view(s) drew nothing and said nothing`);
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(`${failures.length} failure(s)`);
process.exit(failures.length === 0 ? 0 : 1);
