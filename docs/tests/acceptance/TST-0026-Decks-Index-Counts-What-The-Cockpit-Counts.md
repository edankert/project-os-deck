---
type: "[[test]]"
id: TST-0026
aliases: ["TST-0026"]
title: "Deck's own index counts what the cockpit counts, on a project-os repository and on the vault, and a note edited on disk changes without a restart"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0011-Decks-Own-Index]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0011-Decks-Own-Index]]"]
issues: []
tasks: []
artifacts: ["tools/scripts/check-counts-live.py"]
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[project-os-cockpit#ISS-0279]]"]
area: "index"
---

# Deck's index counts what the cockpit counts

## Purpose

Deck now reads the notes itself instead of asking the sidecar for them ([[ADR-0004-A-View-Is-A-Description]]). The thing that can go wrong is not a crash: it is two applications showing the same person different numbers for the same corpus ([[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]). A suite pins the counts against a recorded fixture. This walk checks the live pair, side by side, on a day the fixture was not recorded.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start Deck: `cd desktop && npm start`. A window opens.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **You need the cockpit open too**, on the same workspace, because this check is a comparison. Start it the way you normally do.
- **A workspace is added once, by hand.** In Deck's window, the left rail carries **+ add a workspace**. Add `/Users/Edwin/Dev/repos/project-os-deck` and, for the second half, your `~/Notes` vault.
- **The Library view is the one to look at** in both applications. It lists every typed note grouped by type, with a count per group.

## Procedure

1. Open this repository in Deck and in the cockpit. Go to the Library view in both.
2. Write down the count beside every type heading, in both applications.
3. Do the same for Your Trainer.
4. Open `~/Notes` in Deck. Note the type counts it shows.
5. In Obsidian or a text editor, change one note's `status:` in this repository and save it. Do not restart Deck.
6. Look at Deck again within a few seconds.
7. Add a new note to the repository, then delete it again. Look at Deck after each.
8. Put a file with deliberately broken frontmatter into the repository — an unclosed quote will do — and look at Deck. Remove it afterwards.

## Expected results

- Every type count in Deck's Library equals the cockpit's, for this repository and for Your Trainer. A difference is a fail unless Deck names it as an expected one.
- For `~/Notes`, Deck shows the vault's types with counts. The cockpit may show fewer, because its indexer drops a note whose `type:` is a list ([[project-os-cockpit#ISS-0279]]); Deck showing more, here, is the expected result and not a fail.
- The edited note's new status is in Deck within a few seconds, with no restart and no re-opening of the workspace.
- The added note appears; the deleted note disappears.
- The broken file is reported by path with a reason, and every other note is still listed. An empty or partial view is a fail.

## Evidence (fill after running)

- The two count lists, per repository, side by side.
- What Deck said about the broken file, quoted.

## Steps 1 to 4 are now measured against the cockpit's live code

**Run `../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py` before walking this.** It counts every note twice — once with the cockpit's own `Index`, imported and run today, and once with Deck's — and prints the two columns side by side. It reads only: no sidecar, no server, no file written.

It closes the exact gap this note's Adequacy section names. `TST-0029` measures Deck against a fixture recorded from the sidecar, and a recording cannot notice that the sidecar itself moved. This imports the cockpit's indexer as it stands this minute, so a change over there shows up here the same day.

**On 2026-09-09: 3,280 notes across three corpora, and not one type where the two programs disagree.**

| corpus | notes | result |
| --- | --- | --- |
| project-os-deck | 195 | every type equal |
| your-trainer | 2,699 | every type equal |
| `~/Notes` | 386 | every type equal |

Three things it had to get right before the comparison meant anything, each found by the comparison failing:

- **A template is a note in one program and not in the other.** The cockpit's `Index` holds `docs/__templates__/`; Deck's `typeCounts` skips it, because a blank feature template counted as a feature makes every count one too high. Comparing the raw indexes made every type in this repository differ by exactly one, which was that and nothing else. Both sides drop templates here and the number dropped is printed.
- **A note the cockpit gave no type is left out by PATH, never by loosening the comparison.** The two rules are the ones `tools/scripts/record-sidecar-fixture.py` states: a list-valued `type:`, and frontmatter PyYAML refuses outright. Both turn on the sidecar assigning *no* type, so neither can excuse a contradiction — the sidecar saying `feature` and Deck saying anything else stays a failure with no tolerance.
- **Every licensed difference is printed with its path, its reason and what Deck read instead**, so the exemption cannot quietly widen.

**The comparison is per note before it is per type**, because a total can be right while the notes under it are wrong. The third review made exactly two notes exchange `feature` and `task`: the totals still balanced and the script reported no disagreement. It now prints a contradiction per path — *"the cockpit reads it as feature, Deck reads it as task"* — and the type totals are a summary underneath. **And a comparison that covers no notes is a failure**, not a pass: with `isTemplate` returning true for everything the script used to compare nothing in all three corpora and exit 0.

Four mutations, four caught: two notes exchanging types (2 contradictions, both paths named), every note treated as a template (3 failures, one per corpus), a whole-corpus rotation of types (1,095 contradictions), and the two `pathPrefix` reverts the suite already covered.

**A number worth carrying to the Vault phase.** In `~/Notes`, **92 of 386 notes** — most of the Daily Notes — have a list-valued `type:` and so appear in the cockpit's Library under no type at all. That is project-os-cockpit#ISS-0279 measured rather than described, and it is close to a quarter of the vault.

**What still needs a person:**

- **Steps 5 to 8** — edit a note and see it within seconds, add one, delete one, drop in a file with broken frontmatter. `TST-0029` proves the watcher and the reporting mechanically, but the walk's claim is that a person sees it happen without restarting anything, and that is a claim about the screen.
- **The Library view itself.** This script compares what the two INDEXES hold. Whether Deck's Library draws those counts where a person can read them is a different question, and it is the one the walk asks.

## Adequacy (who verifies this test?)

A person, because the claim is that two applications agree in front of somebody looking at both. The automated half is [[TST-0029-The-Index-Reads-What-Is-On-Disk]], which pins Deck against a fixture recorded from the sidecar; a fixture cannot notice that the sidecar itself moved.
