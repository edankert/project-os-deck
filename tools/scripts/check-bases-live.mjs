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
  // The same cause as the three below, in a different file. Both filter on
  // `date(due) == today()` / `date(scheduled) == today()`, and both were
  // wrongly EXCUSED before this script started asking whether the thing it was
  // told was about the filter (ISS-0042).
  'TaskNotes/Views/tasks-default.base / Today':
    'it filters on due or scheduled being today, and nothing in the vault is dated 2026-09-09',
  'TaskNotes/Views/tasks-default.base / This Week':
    'it filters on the week ahead, and the latest date of either kind anywhere in the vault is 2026-03-17',
  '__bases__/Tasks/Tasks Base.base / Today\'s Tasks':
    'nothing in the vault is scheduled or due on 2026-09-09; the latest date of either kind is 2026-03-17',
  "__bases__/Tasks/Tasks Base.base / This Week's Tasks":
    'the same: no note is scheduled between today and a week from today, so the filter is true of nothing',
  '__bases__/Tasks/Tasks Base.base / Future Tasks':
    'the same: no note is scheduled after today at all',
};

const failures = [];
let views = 0;
let drawnEmpty = 0;
let explainedEmpty = 0;
let knownEmpty = 0;
let silentEmpty = 0;
// A view that draws a list and reports nothing is where a difference from
// Obsidian would be SILENT. This script cannot tell whether such a list is
// right — only Obsidian can — so it counts them and says where to look.
let drewSilently = 0;

const files = baseFiles(VAULT).sort();
for (const rel of files) {
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
    const said = [...named, ...unsupported];
    console.log(`    view "${view.name}": ${selected === null ? 'no description built' : `${selected} note(s)`}`);
    for (const one of said) console.log(`        says: ${one.construct} — ${one.reason}`);
    if (view.description === null && named.length === 0) {
      failures.push(`${rel} / ${view.name}: no description and nothing said about why`);
    }
    if (selected === 0) {
      drawnEmpty += 1;
      // **What excuses an empty view is something said about ITS FILTER**, not
      // about the file. The first version asked whether anything at all had
      // been reported, so "Today" in tasks-default.base was excused by a
      // complaint about a plugin's view type and a `%` in an unrelated
      // formula — while the identical emptiness in Tasks Base.base needed a
      // hand-written exemption. One cause, two views, opposite treatment.
      const aboutTheFilter = said.filter((one) => /filter/i.test(one.where ?? ''));
      const known = KNOWN_EMPTY[`${rel} / ${view.name}`];
      if (aboutTheFilter.length > 0) {
        explainedEmpty += 1;
      } else if (known !== undefined) {
        knownEmpty += 1;
        console.log(`        (empty on purpose: ${known})`);
      } else {
        silentEmpty += 1;
        failures.push(
          `${rel} / ${view.name}: selects NOTHING and names nothing about its own filter — ` +
            `an empty view and a broken view look identical on screen` +
            (said.length === 0 ? '' : ` (it did report ${said.length} thing(s), none about the filter)`),
        );
      }
    } else if (said.length === 0) {
      drewSilently += 1;
    }
  }
  console.log();
}

// Every number the notes quote is printed here, so a sentence can be copied
// rather than counted. Three counts written by hand into TST-0027 on the day
// ISS-0036 closed were wrong (ISS-0043).
console.log(`${files.length} base file(s) read, ${views} view(s) across them`);
console.log(`${drawnEmpty} view(s) selected nothing: ${explainedEmpty} explained by their own filter, ` +
  `${knownEmpty} verified empty by hand, ${silentEmpty} unexplained`);
console.log(`${drewSilently} view(s) drew a list and reported nothing — where a difference from Obsidian would be silent`);
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(`${failures.length} failure(s)`);
process.exit(failures.length === 0 ? 0 : 1);
