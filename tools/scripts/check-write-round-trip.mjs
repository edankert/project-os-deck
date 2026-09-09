#!/usr/bin/env node
/**
 * Prove that a change Deck makes is a change the cockpit shows.
 *
 * This is the middle of [[TST-0028]] — "the cockpit shows the criterion ticked,
 * with no reload trick and no restart" — made as a measurement rather than as
 * two screens side by side. Deck and the cockpit read the same sidecar, so
 * "what the cockpit shows" is what `/api/render` returns, and asking it is
 * asking the cockpit.
 *
 * **It WRITES to notes in this repository and reverts them with git.** That is
 * why it is a script a person runs rather than a check in the suite or the
 * smoke run: neither of those may touch the repository they are checking. It
 * refuses to start on a dirty working tree, so the revert is always clean.
 *
 *     node tools/scripts/check-write-round-trip.mjs
 *
 * What it does NOT prove, and what the walk is still for: that a person
 * clicking in Deck's reader reaches this path, and that the cockpit's own
 * window redraws without being reloaded.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ACTOR = 'user:write-round-trip-check';

const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf-8' });

if (git('status', '--short', 'docs').trim() !== '') {
  console.error('check-write-round-trip: docs/ has uncommitted changes; this script reverts with git and will not risk them');
  process.exit(2);
}

const base = fs.readFileSync(path.join(REPO, '.cockpit', 'url'), 'utf-8').trim();
const require_ = (await import('node:module')).createRequire(import.meta.url);
const { SidecarWriteClient } = require_(path.join(REPO, 'desktop', 'dist', 'shared', 'write-client.js'));
const { walkNotes } = require_(path.join(REPO, 'desktop', 'dist', 'main', 'note-index.js'));
const client = new SidecarWriteClient(base);

const results = [];
const record = (ok, what, detail = '') => results.push({ ok, what, detail });

/** What the cockpit shows for a note, which is what the sidecar renders. */
async function rendered(rel) {
  const response = await fetch(`${base}/api/render?path=${encodeURIComponent(rel)}`);
  return (await response.json()).html ?? '';
}

const noteFor = (id) => walkNotes(path.join(REPO, 'docs')).records.find((r) => r.id === id);

// ---- a criterion, ticked ----
{
  const rel = 'docs/features/addresses/plan/tasks/TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry.md';
  const criterion = 'A round-trip check that the cockpit shows what Deck wrote';
  const original = fs.readFileSync(path.join(REPO, rel), 'utf-8');
  fs.writeFileSync(path.join(REPO, rel), `${original}\n## A round-trip check\n\n- [ ] ${criterion}\n`);
  try {
    const before = await rendered(rel.slice('docs/'.length));
    record(
      /<input[^>]*type="checkbox"(?![^>]*checked)/.test(before),
      'the cockpit shows the criterion UNticked before Deck writes',
    );

    const fresh = noteFor('TASK-0052');
    await client.tick({
      id: 'TASK-0052',
      criterion,
      evidence: 'the round-trip check',
      actor: ACTOR,
      mtime: fresh.mtimeMs / 1000,
    });

    const line = fs
      .readFileSync(path.join(REPO, rel), 'utf-8')
      .split('\n')
      .find((l) => l.includes(criterion));
    record(
      line?.startsWith('- [x] ') === true && line.includes('evidence: the round-trip check') && line.includes(ACTOR),
      'the FILE gained the tick, with the evidence and the actor Deck sent',
      line ?? '',
    );

    // The cockpit, asked again with nothing reloaded and nothing restarted.
    const after = await rendered(rel.slice('docs/'.length));
    const ticked = /<input[^>]*checked[^>]*>[\s\S]{0,400}?the round-trip check|the round-trip check[\s\S]{0,400}?checked/.test(
      after,
    );
    record(ticked, 'the COCKPIT shows it ticked, with no reload and no restart');
    record(after !== before, 'and what the cockpit renders actually changed');
  } finally {
    git('checkout', '--', rel);
  }
}

// ---- the verbs Deck offers, and one of them driven ----
//
// A note at a state the cockpit offers nothing for would make both of these
// checks pass by comparing two empty lists, so the note is CHOSEN for having
// verbs and the check fails if it turns out to have none. The first version of
// this script asked about a note at `declined` and reported two green lines
// that had measured nothing.
{
  const { actuatorRows } = require_(path.join(REPO, 'desktop', 'dist', 'shared', 'write-client.js'));
  const id = 'ISS-0008';
  const rel = 'docs/issues/ISS-0008-Nothing-In-CI-Exercises-The-Renderer.md';
  const payload = await (await fetch(`${base}/api/notes/actions?id=${encodeURIComponent(id)}`)).json();
  const offered = payload.actions ?? [];
  const deck = actuatorRows(payload);

  record(offered.length > 0, `the cockpit offers verbs on ${id}, so this measures something`, `${payload.status}`);
  // Deck restates no table, so its rows ARE the endpoint's rows. What is
  // checked is that nothing is dropped, reordered or invented on the way.
  record(
    JSON.stringify(deck.map((r) => [r.verb, r.to, r.confirm, r.disabled])) ===
      JSON.stringify(offered.map((a) => [a.verb, a.to, a.confirm === true, a.disabled === true])),
    `Deck's verbs for ${id} are the sidecar's rows, in order`,
    deck.map((r) => `${r.verb}→${r.to}${r.confirm ? ' (asks first)' : ''}`).join(', '),
  );

  const row = offered[0];
  if (row !== undefined) {
    const original = fs.readFileSync(path.join(REPO, rel), 'utf-8');
    try {
      const fresh = noteFor(id);
      const reason = 'Driven by the round-trip check, so the callout has prose to carry.';
      await client.transition({ id, to: row.to, actor: ACTOR, mtime: fresh.mtimeMs / 1000, note: reason, severity: 'high' });
      const after = fs.readFileSync(path.join(REPO, rel), 'utf-8');
      record(new RegExp(`^status: "?${row.to}"?\\s*$`, 'm').test(after), `"${row.verb}" moved the file's status to ${row.to}`);
      // ISS-0037. The sidecar writes this callout only when the request
      // carries prose, and Deck used to drop the prose between the renderer
      // and the shell — so the status moved and the grounds went nowhere.
      record(
        after.includes('## Decision record') && after.includes(reason) && after.includes(ACTOR),
        'the reason Deck sent is IN the file, under the cockpit\'s own `## Decision record` heading',
      );
      record(/^severity: high\s*$/m.test(after), 'and the severity Deck sent was recorded while the issue left triage');
      const shown = await rendered(rel.slice('docs/'.length));
      record(shown.includes(row.to), 'the cockpit shows the new status');
    } finally {
      git('checkout', '--', rel);
    }
  }
}

// ---- a stale mtime is refused, which is the guard the walk cannot see ----
{
  const id = 'ISS-0008';
  let refused = '';
  try {
    await client.transition({ id, to: 'open', actor: ACTOR, mtime: 1 });
  } catch (error) {
    refused = String(error);
  }
  record(refused !== '', 'a write carrying a stale mtime is refused rather than applied', refused.slice(0, 160));
  record(git('status', '--short', 'docs').trim() === '', 'and the refused write changed no file');
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.what}${r.detail === '' ? '' : `\n        ${r.detail}`}`);
}
console.log(`\nworking tree after: ${JSON.stringify(git('status', '--short', 'docs').trim())}`);
console.log(`${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
