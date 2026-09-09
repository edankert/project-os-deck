---
type: "[[feature]]"
id: FEAT-0011
aliases: ["FEAT-0011"]
title: "Deck's own index: the main process reads the workspace's Markdown itself, so a view can arrange notes the sidecar does not arrange"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "Deck's main process reads every Markdown file in the open workspace, parses its frontmatter, and keeps one record per note that it updates when the file changes. A view described as a query has something to run over, and Deck stops depending on the cockpit growing an endpoint that returns the notes."
requirements: []
tasks: ["[[TASK-0038-Records-From-The-Workspaces-Markdown]]", "[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]", "[[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ISS-0279]]"]
---

# Deck's own index

## Goal

**Deck reads the notes itself.** Its main process walks the open workspace's Markdown files, parses each one's frontmatter, and keeps a record per note: the id, the path, the title, the type, the status, the dates, the wikilinks it makes, and every other frontmatter field as it was written. When a file changes on disk the record changes and a revision number rises, so the renderer knows its picture is old.

This exists because a view described as a query needs something to evaluate over, and Deck holds no notes today. Edwin decided on 2026-09-08 that the something is Deck's own index rather than a new endpoint in the cockpit: "Decks own index, the Decks application are individual applications/views" ([[ADR-0004-A-View-Is-A-Description]]).

Two words are used throughout. A **record** is what Deck knows about one note: its frontmatter, parsed, plus where the file is. The **index** is every record for the open workspace, held in the main process.

## Scope

**In scope.** Discovery of the workspace's Markdown files, with the same directories ignored that the sidecar ignores. Frontmatter parsing, including the fields whose value is a list and the fields whose value is a wikilink. The normalisation rules the sidecar applies, mirrored rather than reinvented, so that a note Deck calls a `feature` is a note the cockpit calls a `feature`. A file watcher that keeps the index current and raises a revision on every change. A read path from the index to the renderer, through Deck's host, available on both hosts and read-only on both.

**Out of scope.** Writing any file. The index reads and Deck's writes go through the sidecar's guarded endpoints ([[ADR-0003-Deck-Writes-Through-The-Shell]]). Rendering a note's body, which stays the sidecar's `/api/render`. Obligations: whether a note is owed is a judgement the sidecar makes from its own registry, and a query-sourced view still reads owed and suppressed from the navigation payload. The link graph as a whole payload, which is [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] in [[PHASE-0002-Glass]] and still cockpit work.

**Not asked of the cockpit.** The review recommended filing an issue there for a records endpoint. Edwin withdrew it on 2026-09-08 by choosing Deck's own index.

## Acceptance

- For this repository and for Your Trainer, Deck's count of notes per type equals the sidecar's library groups, checked against a fixture read off the sidecar rather than against Deck's own output.
- A note whose `type:` is a list of values is counted under every one of those values. This is the defect [[project-os-cockpit#ISS-0279]] reports in the sidecar's own indexer, and Deck must not reproduce it.
- A note whose frontmatter Deck cannot parse is reported by path with the reason, and the rest of the index is built. One bad file never empties a view.
- Editing a note on disk changes its record and raises the index revision, with no restart and no re-open of the workspace.
- The renderer reads records through Deck's host on both hosts, and the served host answers the records to a tablet and still refuses every method that is not a read.

## Links

- Phase: [[PHASE-0001-Deck]]
- Decision: [[ADR-0004-A-View-Is-A-Description]]
- Tasks: [[TASK-0038-Records-From-The-Workspaces-Markdown]], [[TASK-0039-The-Index-Watches-And-Carries-A-Revision]], [[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]
- Risk: [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]
- Plan: `docs/features/index/plan/PLAN.md`
- Acceptance walk: [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]


## Independent review — 2026-09-09

**Verdict: changes-requested.** Clean context and a separate session; the same model family as the author, recorded in `reviewed_by`. Four findings, all reproduced. The index itself works and the comparison with the sidecar is real — the findings are that two of this feature's written claims are wider than the code, and that the guard has a blind spot.

**Finding 1 (blocking): the reader drops every key after a stray indented sequence item, and the note claims it drops none.** [[TASK-0038-Records-From-The-Workspaces-Markdown]] says "a record holds every frontmatter key under its own name" and `desktop/src/shared/records.ts:11` repeats it. It is false for 22 files in Your Trainer. In `desktop/src/shared/yaml.ts:210-215` the mapping loop breaks on any line starting with `- ` before it checks whether that line is more indented than the mapping, so the reader walks away from the rest of the document. Reproduced on `your-trainer/docs/tasks/TASK-0453-RuntimeTranslateOnDemand.md`, whose `updated:` is followed by four indented `- "[[...]]"` lines: Deck's record carries `type`, `id`, `aliases`, `title`, `status`, `phase`, `platform`, `owner`, `created` and `updated`, and has no `effort`, `depends`, `blocks`, `related` or `tests`. The eight `REQ-019x` notes the fixture already names lose `related`, `tests` and `implements` the same way — the fixture's row says only that Deck "REPORTS the lines it had no place for", which does not tell a reader that three relationship fields are gone. The lines are reported as "a line the document has no place for", so nothing is silent; what is wrong is the claim, and the fact that a filter on `depends` over Your Trainer would select the wrong notes.

**Finding 2 (blocking): "zero unreported problems" is a claim about reports, not about values, and there is at least one silent mis-read on a corpus Deck meets.** [[TASK-0038-Records-From-The-Workspaces-Markdown]] says the reader was "Measured against every file it will meet: 200 notes here, 407 in `~/Notes`, 2715 in Your Trainer and all 13 `.base` files, with zero unreported problems". Parsing all 3326 of those files with Deck's reader and with PyYAML and diffing the values finds divergences the reader says nothing about. A literal block scalar loses its trailing newline, loses every blank line inside it, and — because `scan()` at `desktop/src/shared/yaml.ts:137` drops any line whose trimmed text starts with `#` before the block scalar reader ever sees it — silently loses any line of content that begins with `#`. `body: |` / `  # Heading` / (blank) / `  text` reads as `"text"` where PyYAML gives `"# Heading\n\ntext\n"`, with no problem reported. Seventeen keys across thirteen `~/Notes` files show the trailing-newline half of this today. Two more, latent on the current corpora: `"a\\nb"` reads as backslash-newline rather than backslash-n, because `unquote` applies `\\n` before `\\\\` (`yaml.ts:596-604`); and a nested block sequence (`m:` / `  - - 1` / `    - 2`) reads as `["- 1", 2]` rather than `[[1, 2]]`, again with nothing reported.

**Finding 3 (blocking): the sidecar comparison cannot see a note Deck never indexed.** `desktop/tests/index.test.mjs:189` does `if (record === undefined) continue`, so a path the fixture holds and Deck's walk missed is skipped rather than failed; the only protection is `assert.ok(compared > atLeast)` with `atLeast` at 150 against 199 paths. Reproduced: with `isExcluded` mutated to hide `issues/` and `reference/`, Deck indexed 169 of 200 notes and "Deck calls every note in this repository what the sidecar calls it" still passed. Related: the comparison is about `type` and nothing else, so the note's "Deck agrees with the sidecar about all 199 notes in this repository, path by path" is wider than the check — on Your Trainer the two also disagree about the `updated` value of fourteen notes and about 76 keys, and nothing measures that.

**Finding 4 (non-blocking): the revision rises when no note changed.** `NoteIndex.noticed` treats anything that is not an unexcluded `.md` file as a full rebuild (`desktop/src/main/note-index.ts:236-241`) and `build()` raises unconditionally, so a write inside `.obsidian/` or any non-Markdown file anywhere under the root re-walks the workspace and raises the number. Reproduced on a temporary vault: `noticed('.obsidian/workspace.json')` then `settle()` re-walked and raised the revision with no note changed. For a vault open in Obsidian that is every pane switch, and the visible effect is [[TASK-0051-The-Changed-Under-You-Mark]]'s banner — "These notes changed on disk since this window drew them" — appearing when nothing did.

**What was checked and found sound.** The fixture is genuinely recorded from the cockpit's own `Index` by a script that imports it, and the comparison currently runs over all 199 paths here and 2717 in Your Trainer with no contradictions; I re-ran it. Mutation testing says the suite guards: reintroducing [[project-os-cockpit#ISS-0279]] in `normaliseTypes` fails 2 checks; removing plain-scalar folding fails 1; hiding a whole directory from the walk fails the comparison. The records path answers 405 to every method that is not a read, and allowing POST fails 2 checks. `docsRootFor`, the excluded-directory rule and the status normalisation all mirror `index.py` as the note says.

**Documentation, non-blocking.** Three numbers disagree across the notes for one thing: this repository is "199 notes" at [[TASK-0038-Records-From-The-Workspaces-Markdown]] L82 and "200 notes" at L86; Your Trainer is "2715" here and in [[TST-0029-The-Index-Reads-What-Is-On-Disk]], "2716" in [[PHASE-0001-Deck]], and 2717 in the fixture. This note and TST-0029 say Your Trainer is "compared as per-type counts"; the suite compares it per path, which is stronger.

## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All three tasks are `done`. Deck's main process walks a workspace's Markdown, keeps a record per note with every frontmatter key under its own name, watches for changes, raises one number per workspace when anything moves, and serves the records read-only on both hosts.

**The comparison with the sidecar is real rather than a formality.** `desktop/fixtures/sidecar-types.json` is recorded from the cockpit's own `Index`, by `tools/scripts/record-sidecar-fixture.py`, which imports it. Deck agrees with the sidecar about all 199 notes in this repository, path by path. On Your Trainer's 2715 notes the two agree to within eleven differences the fixture names one by one: one is [[project-os-cockpit#ISS-0279]], the list-valued `type:` Deck must not reproduce, and ten are files whose frontmatter PyYAML refuses outright and whose notes therefore vanish from the cockpit's own views.

**Fixing this repository's own such file was part of the work.** `ISS-0010` carried `don\'t` inside a double-quoted YAML scalar, which is not a valid escape; the cockpit dropped that note's frontmatter and showed 22 issues where there are 23. The note says `do not` now.

**What is owed is [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]**, the live comparison a fixture cannot make: Deck and the cockpit open side by side, and a person reads the counts off both screens.



## The sixth pass's findings, discharged 2026-09-09

The verdict above was recorded before the fixes. All six findings are `fixed` and each was reproduced before being acted on; the verdict itself is stale and a seventh pass has not been run.

| finding | note | how it was settled |
| --- | --- | --- |
| Deck can stop offering a tick control and nothing notices | [[ISS-0053-Deck-Can-Stop-Offering-A-Tick-And-Nothing-Notices]] | the smoke run presses a real tick and a real refusal; deleting `attachTicks` fails 1 check, accepting a tick with no evidence fails 3 |
| the smoke runner cannot start where it must | [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]] | it resolves its own path before changing directory, installs nothing, and TST-0037 declares how it is invoked instead of promising a gate that cannot host it |
| two re-measured numbers still disagree with themselves | [[ISS-0055-Two-Re-Measured-Numbers-Still-Disagree-With-Themselves]] | corrected in the criterion as well as the prose, and an unreadable date is now reported as unconfirmable rather than expired |

**Measured at commit `d0a148e`:** 322 node checks passing, 23 of 23 commanded tests, both smoke configurations `ok` with nothing skipped, `check-write-round-trip.mjs` 18 of 18 with a clean tree, `check-counts-live.py` no disagreements across three corpora, `check-bases-live.mjs` no failures across 46 views, `validate-docs --as-committed` passing the full CI step set.

**What is not settled.** Six review rounds have each found real defects, and each round's fix produced the next round's finding. That is a fact about the process, not a defect in this feature, and whether to run a seventh pass is Edwin's call.

## Independent review, 2026-09-09: changes requested, and made

**The review found the claim above wider than the check underneath it, and it was right.** "Deck agrees with the sidecar about all 199 notes, path by path" described a comparison that read the TYPE only and skipped any note Deck had failed to index. A mutation hiding `issues/` and `reference/` left Deck indexing 169 of 200 and the check still passed ([[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]]).

**Underneath it were two real defects in the reader.** A key whose value is followed by an indented list ended the document, so fourteen of Your Trainer's notes lost `effort`, `depends`, `blocks`, `related` and `tests` ([[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]]). And a `|` block scalar silently lost every blank line and every line beginning with a hash, along with two wrong escapes ([[ISS-0025-A-Block-Scalar-Silently-Loses-Lines-And-Two-Escapes-Are-Wrong]]).

**All three are fixed, and the claim is now bigger AND checked.** Deck's frontmatter keys are identical to PyYAML's for every note in both corpora — 207 here, 2717 in Your Trainer — with no note indexed by one and not the other, and no key set differing anywhere. The fixture records the key set per note, and a note on disk that Deck did not index fails by name.

**One non-blocking finding is fixed too**: a change under a directory the walk does not read no longer rebuilds the index or marks every window ([[ISS-0030-A-Change-To-Any-File-Rebuilds-The-Index-And-Marks-Every-Window]]).

**A correction to this note's own wording.** It described the Your Trainer comparison as "per-type counts". It has been per-path since the first recording went stale within the hour, and it now compares keys as well.


## Independent re-review — 2026-09-09 (second pass, after the seven fixes)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The frontmatter values are unchanged from the first pass because the re-review returns the same three.

**What I re-derived rather than trusted.** The PyYAML comparison, independently and wider than the one in the fixture: Deck's `walkNotes` output against `frontmatter.loads` over **three** corpora — 207 notes here, 2719 in Your Trainer, 407 in `~/Notes` — comparing every frontmatter **value**, not only the key set. Zero key differences and zero value differences, once Deck's documented "dates stay strings" choice and Python's own sub-second zero-padding are set aside. That is a bigger claim than the note makes and it holds. I also fuzzed 3,366 quoted scalars against PyYAML: the one-pass `unquote` has **zero** regressions against the old chain.

**The vault is the corpus that mattered and it is not in the fixture.** `~/Notes` holds the only block scalars anywhere — seventeen, all plain `|` — and neither compared corpus has a single one. So ISS-0025's fix is not exercised by the 2,924-note comparison at all. It is right, though: the new reader matches PyYAML on all seventeen where the old one did not, which I checked directly.

**Finding 1 (medium): the comparison still compares no values.** Replacing every frontmatter value in all 2,926 real notes with the string `MUTANT`, keeping the keys and `type` intact, leaves both "Deck calls every note … what the sidecar calls it" checks passing. Only three unit tests over synthetic notes go red. RISK-0004 is about two indexers drifting, and a value is where they would drift. Mitigating: I verified above that the values agree today, so this is a gap in the guard, not a live defect.

**Finding 2 (medium): [[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]] is `fixed`, but the eight `REQ-019x` notes it names still lose `related`, `tests` and `implements`.** They are a different cause — an `acceptance:` list written twice, the second at column zero — and the fix does not touch them. `requirements/REQ-0194-PerUserFavorites.md` declares sixteen keys at column zero and Deck reads thirteen, with seven "a line the document has no place for" problems. Not silent, which is the one good thing. But PyYAML refuses those files, so `note.unreadable === true` exempts them from the key-set check permanently and no check will ever notice. Nothing tracks this as open.

**Finding 3 (low): two new block-scalar mis-reads, both silent, introduced by ISS-0025's own fix.** (a) `blockScalar` breaks on `line.indent <= ownerIndent` (`desktop/src/shared/yaml.ts:369`) rather than on the block's detected indentation, so a line indented deeper than the owner key but shallower than the block is swallowed as content: `a: |\n    x\n  # c\nb: 1` reads as `'x\n# c\n'` where PyYAML reads `'x\n'`. (b) The chomping and indentation indicators are matched by the regex at `yaml.ts:271` and then ignored, so `|-` and `>-` now gain a trailing newline PyYAML does not produce — the old reader was accidentally right there — `|+` drops trailing blanks, and `|2` loses its explicit indentation. Nothing is reported for any of them, against this module's own rule that what it cannot read, it names. Neither shape occurs in any of the three corpora today.

**Finding 4 (low): a change that does not move `mtime` updates the records and does not raise the revision.** `sameRecords` compares path and modification time, so every open window keeps believing a stale picture is current. Driven with an injected `io` whose `mtimeMs` is constant: the status in the index moved from `triage` to `fixed` and the revision stayed at 1. Reachable only through a timestamp-preserving restore, so low. The first-build case is right: `changed` is computed before `this.built = true`, and the revision is 1 after the first build.

**Finding 5 (low): four "reverting X fails N checks" evidence lines do not reproduce.** ISS-0025's "reverting the scan fails three of them" fails **one** (reverting the whole pre-fix `yaml.js` fails five; no revert I could construct gives three). ISS-0026's "reverting the missing-note check fails four" fails **one** (reverting both new checks fails two). ISS-0030's "reverting the guard fails four checks" fails **one** for each half. ISS-0024's "fails two checks" reproduces exactly. These lines are the sentence a reader uses to judge whether a fix is guarded, so an inflated one costs more than its size.

**Finding 6 (low): "twenty-two of Your Trainer's notes" is fourteen.** Running the pre-fix and post-fix readers over Your Trainer, fourteen notes gain `effort`, `depends`, `blocks`, `related` (and `tests` on eleven, `fixes` on nine). The other eight are the `REQ-019x` class of Finding 2, a different cause. The figure is repeated in the commit message, the CHG note and PHASE-0001.

**Finding 7 (low): the fixture decays and only covers what it names.** `notIndexed` checks fixture paths, and Deck walks 2,719 Your Trainer notes against 2,717 recorded, so two notes today sit outside every check. Expected; worth a re-record cadence rather than a fix.

**What I could not break.** The reader against real data, hardest of all: 3,333 notes, keys and values, three corpora, against PyYAML — clean. The nested-sequence fix and the `folded()` fix are both improvements PyYAML agrees with. Mutations that hide two directories from the walk, that put the `- ` break back, that revert the scan, that revert `unquote`, that drop the last key of every note, that freeze the revision, and that remove the excluded-path early return are each caught. `npm test` 306/0, `run-tests.py` `passing=23 failing=0`, `validate-docs.sh` OK.

**Which build this was measured on.** The review ran against `c57f723`..`b2292df`. Two further commits landed while it was in progress (`883e880`, `8fff003`), both touching `desktop/src/main/main.ts`. Every blocking finding was re-driven against `8fff003`, where the suite is 307 checks: the three navigation-guard mutations and the `pathPrefixFor` mutation each still leave 307 passing and 0 failing.

## Independent review — 2026-09-09 (third pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The reader and the comparison are in good shape; every fix I mutated held. The findings are one defect the second pass reproduced and nobody filed, and one written claim that is wider than the script under it.

**Finding 1 (medium): the second pass's own Finding 4 is reproduced, unfixed, and recorded in no `ISS-*`.** A content change that does not move `mtime` updates the records and does not raise the revision, so every open window keeps believing a stale picture is current. `sameRecords` (`desktop/src/main/note-index.ts:320-327`) compares path and modification time and nothing else. Driven with an injected `io` whose `mtimeMs` is frozen:

```
after first build: revision 1 status triage
after a content change with the SAME mtime: revision 1 status fixed
onChange fired at: [1]
```

`tools/skills/independent-review/SKILL.md` step 5 says a reproduced finding becomes an `ISS-*` at `triage` carrying its command and output. Six issues were filed from the second pass ([[ISS-0031-The-Path-Prefix-Reaches-The-Evaluator-Unguarded]] through [[ISS-0036-Notes-Quote-Measurements-That-Do-Not-Reproduce]]) and this was not among them, so it exists only as a paragraph in a review section nobody re-reads. Either file it or write down why it is declined.

**Finding 2 (medium): `check-counts-live.py` compares per-type totals, not per-note types, and [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]] claims otherwise.** That note says "the sidecar saying `feature` and Deck saying anything else stays a failure with no tolerance". Two notes exchanging their types is exactly that contradiction, twice, and it is invisible:

```
# in walkNotes, make one `feature` record read `task` and one `task` record read `feature`
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
  3 corpus(es) compared, 0 disagreement(s) between the two programs   (exit 0)
```

`desktop/fixtures/` catches it for this repository and for Your Trainer, so the claim survives for those two corpora by a different mechanism than the one the note credits. `~/Notes` is in no fixture, so for the vault a per-note contradiction is caught by nothing at all. The fix is small: `deck_types` is already keyed by path and `index._records` already holds `record.note_type`, so the comparison can be per-path instead of per-total.

**Also inside the same script: `isTemplate` returning `true` for everything makes it compare zero notes and still exit 0.** Both sides drop a note the other calls a template, so the sets empty together, every count is zero and no disagreement is reported. The printed line says `0 notes counted by Deck, 0 by the cockpit`, which a person would notice and an exit code does not. The suite catches this particular mutation (one check red), so it is a note about the script's verdict rather than a live hole.

**Finding 3 (low): [[ISS-0034-The-Sidecar-Comparison-Compares-No-Values]]'s third Next Action is neither done nor withdrawn.** "Record what Deck reads from the eight `REQ-019x` notes, since it is not everything" is unticked, and the issue's Fixed section does not mention it. Those notes stay permanently exempt from the key and value comparison, and what Deck actually reads from them is written down nowhere.

**What I attacked and could not break.**

- Replacing every non-`type` string frontmatter value at index time: eight checks red, including both fixture comparisons. [[ISS-0034-The-Sidecar-Comparison-Compares-No-Values]]'s fix holds.
- Emptying the `problems` array, so an unreadable file is read silently: two checks red, including the Your Trainer fixture. The second half of ISS-0034 holds.
- Ignoring the chomping indicator in `yaml.ts`: one check red, exactly as [[ISS-0035-Two-New-Block-Scalar-Misreads]] claims.
- Rotating every note's types by one position across the whole walk — a permutation, which leaves per-type totals nearly intact — is caught: 18 disagreements across the three corpora, in all three.
- `check-counts-live.py` itself reproduces its written result: 3 corpora, 0 disagreements, 195 + 2,699 + 386 = 3,280 notes, 92 of the vault's 386 with a list-valued `type:`. Every number in TST-0026's new section reproduces.

## Independent review — 2026-09-09 (fourth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. Both of the third pass's findings against this feature are genuinely discharged and every mutation I tried was killed. The findings are that [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]]'s written justification does not survive being run, and that TST-0026's headline numbers were stale within the hour.

**Finding 1 (medium): three of the four things ISS-0041 says the digest fixes are not fixed, and one of them is not a real scenario.**

`sameRecords` and the one-file path both compute `moved = mtime differs || digest differs`. Every save moves the modification time, so the digest can only ever *add* changes, never suppress one. Driven against the built `NoteIndex` on a temporary vault:

```
after build:                                   revision 1
1) identical bytes rewritten (mtime moved):    revision 2   <- the "save that wrote the same bytes"
2) identical bytes, full rebuild:              revision 3
3) touch only, no content change at all:       revision 4
4) BODY-only change, mtime preserved:          revision 4   <- unchanged, on both routes
5) frontmatter change, mtime preserved:        revision 5   <- the fix working
```

So the sentence at `note-index.ts` in `settle()` — "a save that wrote the same bytes, and an editor's atomic write, told every window its picture was old" — describes a benefit the fix does not deliver, and ISS-0041's Fixed section repeats it. Line 3 is worse: `touch` alone still marks every window stale, which is the same complaint [[ISS-0030-A-Non-Markdown-Change-Rebuilds-The-Index]] was filed about.

And the motivating list is half wrong. ISS-0041 says "`git checkout`, `git stash pop`, a restore from a backup and `rsync --times` all put content back under a timestamp that is not now", and both docstrings repeat it. Git does not:

```
git commit; sleep; echo two > f.md; git checkout -- f.md
  mtime after checkout 1788972806 = now 1788972806
```

`rsync --times`, `cp -p`, `tar -p` and a restore do preserve it. Two of the four named examples are the two a reader would recognise, and neither one occurs.

**Finding 2 (medium): the digest covers the frontmatter and the title, and ISS-0041 says it is "exact for everything Deck can show".** Deck shows the note's rendered body in the reader. Line 4 above is a body-only change under a preserved timestamp: the record is updated, no revision rises, and [[TASK-0051-The-Changed-Under-You-Mark]]'s banner — "These notes changed on disk since this window drew them" — does not appear, which is ISS-0041's own problem statement on the half the digest does not reach. Narrow, because only a timestamp-preserving restore gets there; but the claim is written wider than the code, which is the shape three reviews have now found.

**Finding 3 (low): TST-0026's headline numbers do not reproduce, and the commit that closed [[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]] is what broke them.**

```
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
  project-os-deck: 201 notes ...    (the note's table says 195)
  your-trainer:   2704 notes ...    (the note's table says 2,699)
  vault:           386 notes ...    (386, correct)
  3 corpus(es) compared, 0 disagreement(s)
```

201 + 2,704 + 386 = 3,291, not the 3,280 in the heading — on the same day the heading is dated. The six `ISS-004x` notes filed one commit later are most of the difference. This is [[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]] a fourth time, and the answer ISS-0043 already wrote down applies: quote the script's line, or name the commit it was run at, rather than freezing a count of a growing corpus into prose.

**What I attacked and could not break.**

- ISS-0041's four claimed mutations reproduce **exactly**: rebuild comparison dropping the digest (1 red), one-file path assuming a change (1), a constant digest (2), a rebuild that always raises (2). `npm test` 320/0 clean.
- The digest itself is sound. Over 3,351 notes in three corpora — 220 here, 2,724 in Your Trainer, 407 in `~/Notes` — there is **not one collision between different frontmatter-plus-title**, and two walks of the same tree produce identical digests, so nothing depends on map ordering or a clock.
- `check-counts-live.py`'s zero-note guard reproduces its stated number: `isTemplate` returning true for everything gives **3 failures, one per corpus**, exactly as [[ISS-0042-Each-Of-The-Three-New-Scripts-Passes-While-What-It-Measures-Is-Wrong]] claims. A single note's type swapped inside `recordFrom` prints the contradiction with the path and both readings, plus the two type totals.
- [[ISS-0034-The-Sidecar-Comparison-Compares-No-Values]]'s third Next Action is answered with a measurement, not a wave.

## Independent review — 2026-09-09 (fifth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

The index is the strongest of the three features under review and the code survived everything I threw at it. Both of the fourth round's medium findings are properly discharged, and the widened digest is a better answer than the caveat that was on the table. The one remaining defect is the low finding, repeated: the corrected corpus count was stale before the commit that carried it finished.

**Finding 1 (low, but the fourth occurrence): [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]'s corrected numbers do not reproduce on the day they are dated, for exactly the cause [[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]] diagnoses.**

The note now says "A run on 2026-09-09 compared 3,291 notes — 201 here, 2,704 in Your Trainer, 386 in `~/Notes`". Run today, 2026-09-09:

```
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
  project-os-deck: 207 notes counted by Deck, 207 by the cockpit, 19 template(s) dropped by both
  your-trainer:   2705 notes counted by Deck, 2705 by the cockpit, 20 template(s) dropped by both
  vault:           386 notes counted by Deck, 386 by the cockpit, 21 template(s) dropped by both
  3 corpus(es) compared, 0 disagreement(s) between the two programs
```

207 - 201 = 6, which is exactly the six notes the same commit added under `docs/`: TST-0037 and ISS-0044 through ISS-0048. So the replacement number was the *pre-commit* count written into a post-commit note — the identical mistake, one round later, in the note whose whole purpose was to stop it. ISS-0048's ticked criterion "The six statements match what running the thing prints today" therefore does not hold as committed.

The same pattern reached the source this time. `desktop/src/shared/records.ts` says the digest was "measured over 3,351 notes in three corpora"; walking the three corpora at HEAD gives 3,358 (226 here, 2,725 in Your Trainer, 407 in `~/Notes`). The claim it supports is fine — see below — but the number in it is a pre-commit measurement again. The fix ISS-0048 already wrote down is the right one and was applied to only half the sentence: keep the shape, drop the frozen size, or name the commit the count was taken at.

**Finding 2 (high, repository-wide, recorded in full on [[FEAT-0013-The-First-Write]]):** the commit adds a test needing Electron to `run-tests.py`, which the template-owned `validate-docs.yml` runs on a machine with neither Electron nor a display, so that job fails on every push. Not this feature's code; it gates this feature's close-out.

**What I attacked and could not break.**

- **Both corrected timestamp claims are true.** In a scratch repository: `git checkout -- f.md`, `git stash` and `git stash pop` each set the modification time to the second the command ran, from a file whose time had been forced to 2020. The corrected list — `rsync --times`, `cp -p`, a restore — is the right one.
- **The widened digest costs what the note says.** Hashing every one of Your Trainer's 2,726 notes — 9.04 MB — takes 11.1 ms, best of five, against the note's 12 ms. There are no collisions between different files: over all three corpora, 24 digest values are shared by more than one file and in every case the file texts are byte-identical. The appended length makes a collision between files of different sizes impossible, as claimed, because the hash half is always exactly eight hex characters.
- **Nothing makes the digest change without the file changing.** It is computed once per read from the text as `readFileSync(..., 'utf-8')` returns it, so a BOM, a line ending or a clock cannot move it; two walks of the same tree produce identical digests. The widening cannot raise a revision that the old digest would not have raised, because the comparison is an OR with the modification time.
- **The new check guards both routes.** Reverting `digestOf` to the frontmatter and the title fails `a BODY change under an unchanged modification time raises the revision`; with its first assertion removed, the same mutation fails the second one, `the same, on the full-rebuild route`. Both halves are live. In the vocabulary the other notes use, that is one check with two assertions, not "two checks".
- `check-counts-live.py` reports 0 disagreements over three corpora — the per-corpus figures are in finding 1 — and it still names cockpit ISS-0279's 92 list-typed vault notes as the one deliberate difference. `npm test` is 321/321 and `validate-docs.sh --as-committed` exits 0.

## Independent review — 2026-09-09 (sixth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

**This feature's own defect is discharged and I found no new one in it.** Nothing is held against the index; it is held by the repository-wide CI findings recorded on [[FEAT-0013-The-First-Write]], because a feature cannot close while every push turns the mandatory job red.

**The fifth round's finding 1 is fixed, and the new rule works.** [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]] no longer states a size for this repository: it states the shape — no note the two programs read as different types, no type whose totals differ — and points at the script. `desktop/src/shared/records.ts`'s digest comment cites `check-counts-live.py`'s corpora instead of a count. Run today:

```
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
  project-os-deck:  211 notes counted by Deck, 211 by the cockpit, 19 template(s) dropped by both
  your-trainer:    2706 notes counted by Deck, 2706 by the cockpit, 20 template(s) dropped by both
  vault:            386 notes counted by Deck,  386 by the cockpit, 21 template(s) dropped by both
  92 note(s) the cockpit gave no type and Deck did ...
  3 corpus(es) compared, 0 disagreement(s) between the two programs
```

The count here has moved twice during this session alone — 207 earlier today, 211 now — which is the evidence that dropping it was right rather than a dodge.

**Every number the notes still carry reproduces.** TST-0026's "92 of 386 notes" in `~/Notes` with a list-valued `type:` is exactly what the script printed. `records.ts:84`'s "Your Trainer's 2,726 notes and 9MB" measures 2,726 notes and 9.07 MB at HEAD, walked with Deck's own `walkNotes`. Both are counts of other repositories, which is what the rule permits.

**Finding 1 (high, repository-wide, recorded in full on [[FEAT-0013-The-First-Write]]):** `run-smoke.sh` re-execs itself under `xvfb-run` using a relative path from the wrong directory, so it exits 127 on every Linux runner; and the smoke needs the sidecar, which `validate-docs.yml` does not install, so a smoke that gets past the first problem fails rather than skipping. Both CI jobs go red on the first push. Not this feature's code; it gates this feature's close-out.

## Independent review — 2026-09-09 (seventh pass)

**Verdict: approved.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

**The index is sound and I found nothing against its code.** The repository-wide finding that held it at the sixth pass is discharged: `run-smoke.sh` resolves itself before changing directory, and TST-0037 no longer promises a gate that cannot host it. The two remaining points are about this note's own prose.

**The comparison with the sidecar reproduces.**

```
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
  project-os-deck:  214 notes counted by Deck, 214 by the cockpit, 19 template(s) dropped by both
  your-trainer:    2707 notes counted by Deck, 2707 by the cockpit, 20 template(s) dropped by both
  vault:            386 notes counted by Deck,  386 by the cockpit, 21 template(s) dropped by both
  3 corpus(es) compared, 0 disagreement(s) between the two programs
```

**Finding 1 (low, the sixth consecutive round of this): the rule the fifth pass adopted was applied to TST-0026 and not to this note.** "Where this stands" still says "all 199 notes in this repository" and "Your Trainer's 2715 notes"; [[PHASE-0001-Deck]] says 199 and 2716. Measured today: 214 and 2707. The sixth-pass section above quotes 211 and 2706, taken hours ago, in the paragraph arguing that a frozen count is the wrong thing to write down. `desktop/src/shared/records.ts:84` says "Your Trainer's 2,726 notes and 9MB"; walking it today gives 2,727 notes and 9.07 MB, and the digest costs 11.25 ms against the note's 12 ms — so the size and the timing stand and the count was stale before its own commit landed. `note-index.ts:16` and `:352` still say 2715. The claim underneath — that the two programs disagree about nothing — is true and is what matters; the frozen sizes are the thing five reviews have now asked notes to stop stating, and the correction reached the test note and `records.ts` but not the feature note or the phase note.

**Finding 2 (low): the discharge table above is the seventh pass's, not this feature's.** It is the same three rows on all three features, and its first row — a tick control Deck can stop offering — belongs to [[FEAT-0013-The-First-Write]] and has nothing to do with the index. The sixth pass held this feature on one finding only, the repository-wide CI one, which is [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]]. A reader of this note alone would conclude the index had a defect about ticking criteria. Related: the table sits at line 87 with four later review sections below it, so the newest verdict is not where a reader looks first.

**Finding 3 (low): `typeCounts` is the mechanism the first acceptance criterion names, and nothing calls it.** `desktop/src/shared/records.ts:230` is reached from no file in `desktop/src` — only from one synthetic assertion at `index.test.mjs:140`. Deleting its template rule, which the function's own comment says is "what the sidecar's `type_counts` does by default, so the two numbers are about the same set of files", leaves `npm test` at 322 of 322. The criterion is in fact met by `check-counts-live.py`, which asks the cockpit's own `Index` and is the stronger check; the note credits the weaker one.

**Finding 4 (low, latent): the walk's "a file is never excluded by its own name" rule is asserted about `isExcluded` and not about the walk.** Adding `if (entry.name.startsWith('.')) continue;` to `note-index.ts:109` leaves 322 of 322 green. The cockpit indexes such files (`index.py:155-161` excludes on parents only), so this would be a silent divergence. No file matching `.*.md` exists in any of the three corpora today, which is why the fixture comparison stays green either way.

**Finding 5 (low): the fixture has decayed by exactly the notes these reviews wrote.** `desktop/fixtures/sidecar-types.json` records 213 paths for this repository against 233 on disk; the 20 unrecorded are `ISS-0037` through `ISS-0055` and `TST-0037`. Your Trainer: 2,727 on disk, 2,719 recorded. Expected drift rather than a defect — the second pass called it and asked for a re-record cadence — and worth saying that the guard covering the gap, `check-counts-live.py`, is hand-run: it needs the cockpit's virtual environment, so no gate in this repository can host it.

**What I attacked and could not break.**

- **The reader's guarantees are mutation-guarded.** Turning `sameRecords`' OR into an AND fails 2 by name (`a BODY change under an unchanged modification time raises the revision`, `a FULL REBUILD notices a change that left the modification time alone`). Reintroducing cockpit ISS-0279 in `normaliseTypes` fails 2, as the note claims — though only one of those reads a real corpus and it is the one that skips when Your Trainer is absent. Hiding `issues/` and `reference/` from the walk fails 3, so ISS-0026's fix holds.
- `check-bases-live.mjs` reproduces exactly: 19 base files, 46 views, 0 failures. `run-tests.py` reports `passing=23 failing=0 unrunnable=0`. `validate-docs.sh --as-committed` prints "HEAD passes the full CI step set".
- `noticed()` returns early on an excluded path, and `build()` raises only when `sameRecords` reports a difference — so a write under `.obsidian/`, and a non-Markdown write anywhere under `docs/`, produce no revision and no banner. The first review's non-blocking finding is fully discharged, on both routes.
- `npm test` 322 of 322; `validate-docs.sh` OK.
- The repository-wide CI finding is genuinely fixed at the script: the `xvfb-run` re-exec now passes an absolute path, driven from the repository root with stub `uname` and `xvfb-run`. What is *not* fixed is that the job which would run it has never executed — recorded in full on [[FEAT-0013-The-First-Write]], seventh pass, finding 1.
