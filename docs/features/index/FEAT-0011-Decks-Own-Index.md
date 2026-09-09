---
type: "[[feature]]"
id: FEAT-0011
aliases: ["FEAT-0011"]
title: "Deck's own index: the main process reads the workspace's Markdown itself, so a view can arrange notes the sidecar does not arrange"
status: review
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
review_verdict: changes-requested
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


## Independent review, 2026-09-09: changes requested, and made

**The review found the claim above wider than the check underneath it, and it was right.** "Deck agrees with the sidecar about all 199 notes, path by path" described a comparison that read the TYPE only and skipped any note Deck had failed to index. A mutation hiding `issues/` and `reference/` left Deck indexing 169 of 200 and the check still passed ([[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]]).

**Underneath it were two real defects in the reader.** A key whose value is followed by an indented list ended the document, so twenty-two of Your Trainer's notes lost `effort`, `depends`, `blocks`, `related` and `tests` ([[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]]). And a `|` block scalar silently lost every blank line and every line beginning with a hash, along with two wrong escapes ([[ISS-0025-A-Block-Scalar-Silently-Loses-Lines-And-Two-Escapes-Are-Wrong]]).

**All three are fixed, and the claim is now bigger AND checked.** Deck's frontmatter keys are identical to PyYAML's for every note in both corpora — 207 here, 2717 in Your Trainer — with no note indexed by one and not the other, and no key set differing anywhere. The fixture records the key set per note, and a note on disk that Deck did not index fails by name.

**One non-blocking finding is fixed too**: a change under a directory the walk does not read no longer rebuilds the index or marks every window ([[ISS-0030-A-Change-To-Any-File-Rebuilds-The-Index-And-Marks-Every-Window]]).

**A correction to this note's own wording.** It described the Your Trainer comparison as "per-type counts". It has been per-path since the first recording went stale within the hour, and it now compares keys as well.
