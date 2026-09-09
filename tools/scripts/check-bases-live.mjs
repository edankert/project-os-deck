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
 * The one reason an empty view is currently excused, as a CONDITION rather
 * than a sentence.
 *
 * All five exemptions say the same thing: the view filters on a date at or
 * after today, and the vault holds no such date. That stops being true the day
 * somebody schedules a task, and a sentence in a comment would go on excusing
 * a view that had become genuinely broken (ISS-0046). So the script checks it:
 * if any note is dated today or later, the exemption is withdrawn and the
 * empty views under it become failures a person has to look at again.
 */
const DATED_AHEAD = {
  why: 'it filters on a date at or after today, and nothing in the vault is dated that late',
  stillTrue: (records, today) => {
    // **Every date-ish value, list members included, and an unreadable one
    // expires the exemption** (ISS-0051). The first version kept only strings
    // and sliced ten characters, so `due: [2026-12-01]` and `01/12/2026` both
    // reported "still true" when they were false — and a list-valued
    // frontmatter field is exactly the shape of project-os-cockpit#ISS-0279,
    // the difference Deck exists to preserve.
    const dates = [];
    const unreadable = [];
    const take = (value) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) return void value.forEach(take);
      const text = String(value).trim();
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
      if (iso === null) unreadable.push(text);
      else dates.push(iso[0]);
    };
    for (const record of records) {
      take(record.frontmatter?.due);
      take(record.frontmatter?.scheduled);
    }
    // An exemption that cannot prove itself does not hold. A date this cannot
    // read might be next month.
    if (unreadable.length > 0) {
      return {
        holds: false,
        // **Told apart from "expired"** (ISS-0055). One `due: TBD` anywhere in
        // the vault withdraws every exemption, and calling that expired reads
        // as "somebody scheduled something" and sends a person to the views.
        // The fault is in a note, and the message says so.
        unconfirmable: true,
        detail: `${unreadable.length} date(s) this cannot read, so the exemption cannot be confirmed — fix the ` +
          `note, not the view: ${[...new Set(unreadable)].slice(0, 3).join(', ')}`,
      };
    }
    const latest = dates.sort().at(-1);
    return { holds: latest === undefined || latest < today, detail: `latest due or scheduled anywhere: ${latest}` };
  },
};

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
  'TaskNotes/Views/tasks-default.base / Today': DATED_AHEAD,
  'TaskNotes/Views/tasks-default.base / This Week': DATED_AHEAD,
  "__bases__/Tasks/Tasks Base.base / Today's Tasks": DATED_AHEAD,
  "__bases__/Tasks/Tasks Base.base / This Week's Tasks": DATED_AHEAD,
  '__bases__/Tasks/Tasks Base.base / Future Tasks': DATED_AHEAD,
};

const failures = [];
let views = 0;
let drawnEmpty = 0;
let explainedEmpty = 0;
let knownEmpty = 0;
let silentEmpty = 0;
let expiredEmpty = 0;
let unconfirmableEmpty = 0;
const today = new Date().toISOString().slice(0, 10);
const checked = new Map();
/** A row's condition, computed once. */
const exemption = (row) => {
  if (!checked.has(row)) checked.set(row, row.stillTrue(index.records, today));
  return checked.get(row);
};
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
      // **The PREFIX `source.filter`, not the substring `filter`** (ISS-0046).
      // A refusal's `where` is a path into the document and a formula's name is
      // part of it, so a formula called `filterHelper` used to excuse an empty
      // view that a formula called `plainHelper` did not — same emptiness, same
      // complaint, opposite verdict.
      const aboutTheFilter = said.filter((one) => /^source\.filter\b/.test(one.where ?? ''));
      const known = KNOWN_EMPTY[`${rel} / ${view.name}`];
      if (aboutTheFilter.length > 0) {
        explainedEmpty += 1;
      } else if (known !== undefined && exemption(known).holds) {
        knownEmpty += 1;
        console.log(`        (empty on purpose: ${known.why}; ${exemption(known).detail})`);
      } else if (known !== undefined) {
        const state = exemption(known);
        if (state.unconfirmable === true) unconfirmableEmpty += 1;
        else expiredEmpty += 1;
        failures.push(
          state.unconfirmable === true
            ? `${rel} / ${view.name}: exempted because "${known.why}", and that cannot be confirmed ` +
              `(${state.detail})`
            : `${rel} / ${view.name}: exempted because "${known.why}", and that is no longer true ` +
              `(${state.detail}) — look at this view again`,
        );
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
  `${knownEmpty} exempt under a condition that still holds, ${expiredEmpty} whose exemption has expired, ` +
  `${unconfirmableEmpty} whose exemption cannot be confirmed because a date will not read, ${silentEmpty} unexplained`);
console.log(`${drewSilently} view(s) drew a list and reported nothing — where a difference from Obsidian would be silent`);
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(`${failures.length} failure(s)`);
process.exit(failures.length === 0 ? 0 : 1);
