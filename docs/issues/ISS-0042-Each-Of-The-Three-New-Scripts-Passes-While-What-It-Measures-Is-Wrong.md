---
type: "[[issue]]"
id: ISS-0042
aliases: ["ISS-0042"]
title: "Each of the three scripts written to settle an acceptance walk reports success while the thing it measures is wrong, in a different way for each script"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The third independent review of PHASE-0001, 2026-09-09, findings 4, 5 and 6"]
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]", "[[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]"]
tests: ["[[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]", "[[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]"]
---

# Three green scripts, three ways of being green for the wrong reason

## Problem

The three scripts written on 2026-09-09 to settle the machine-answerable halves of [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]] and [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] each pass a mutation they should catch. This is the same class of defect the first two reviews found, in the checks written to close them.

**One: the counts are compared as totals, so two notes can swap types.** `tools/scripts/check-counts-live.py` builds a `Counter` per program and compares the numbers. Make exactly two notes exchange `feature` and `task` inside `walkNotes` and the script prints `0 disagreement(s)` and exits 0 — while TST-0026's own text claims "the sidecar saying `feature` and Deck saying anything else stays a failure with no tolerance". The recorded fixture catches it for this repository and Your Trainer; `~/Notes` is in no fixture, so for the vault nothing catches it. The same script compares zero notes in all three corpora, and still exits 0, if `isTemplate` returns true for everything.

**Two: an empty view is excused by a report about something else.** `tools/scripts/check-bases-live.mjs` asks whether anything at all was said. In `TaskNotes/Views/tasks-default.base`, the views "Today" and "This Week" select nothing and are passed because two unrelated things were reported — the `tasknotesTaskList` view type and a `%` in a formula. The identical emptiness in `Tasks Base.base` needed a hand-written exemption. One cause, two views, opposite treatment.

**Three: neither script can see a view selecting the WRONG notes**, which is the failure [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] is about. Mutating `desktop/src/shared/query.ts:99` to `if (filter(context) || true)` makes all 46 views draw all 407 notes, and `check-bases-live.mjs` prints `0 failure(s)` and exits 0.

## Fix

The first two are fixable and the third is a limit to be stated.

- Compare the two indexes **per note**, not per total, so a swap is a contradiction with two paths printed. Fail when the comparison covers no notes.
- Judge an empty view on whether anything explains ITS emptiness — a refusal in its own filter — rather than on whether the file said anything at all.
- Say plainly in TST-0027 that this script cannot see a wrong list, that the suite is what catches that, and that step 8 against Obsidian is the only thing that catches a wrong list Deck is silent about.

## Acceptance

- [x] Two notes exchanging types is a failure naming both paths, in every corpus including the vault — evidence: check-counts-live.py compares per note; the review's own two-note swap gives 2 contradictions (user:edwin, 2026-09-09)
- [x] A comparison covering no notes is a failure, not a pass — evidence: isTemplate returning true for everything now gives 3 failures (user:edwin, 2026-09-09)
- [x] An empty view is excused only by something said about its own filter — evidence: check-bases-live.mjs: 16 explained by their filter, 5 verified by hand, 0 unexplained (user:edwin, 2026-09-09)
- [x] TST-0027 states what the base-file script cannot see — evidence: the step 8 section, with the filter||true mutation written out (user:edwin, 2026-09-09)

## Fixed, 2026-09-09; the third is stated rather than fixed

**The two indexes are compared per note before they are compared per type.** A contradiction prints both paths and what each program read. The review's own mutation — exactly two notes exchanging `feature` and `task` — now gives two named failures where it used to give none, in every corpus including the vault, which is in no fixture.

**A comparison that covers no notes is a failure.** With `isTemplate` returning true for everything the script compared nothing in all three corpora and exited 0; that is three failures now, one per corpus.

**An empty view is excused only by something said about its own filter.** The refusals carry a `where`, so the script can tell a complaint about a plugin's view type from one about the filter that selected nothing. Under the old rule, "Today" and "This Week" in `tasks-default.base` were excused by a `%` in an unrelated formula while the identical emptiness elsewhere needed a hand-written exemption. Both are now verified by hand and named, alongside the three that were.

**The third finding is a limit, and it is written into [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] rather than papered over.** `check-bases-live.mjs` cannot see a view selecting the WRONG notes: make every filter match and all 46 views draw all 407 notes while it reports nothing. The suite catches that mutation in six places. What nothing here can catch is a list Deck and Obsidian disagree about, because Deck's answer is the only one this machine computes — which is [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] and the reason step 8 of that walk exists. The script now prints how many views draw a list and report nothing, so a person knows where to look: 14 of 46.

**Evidence.** Four mutations against the counts script, four caught. The base-file script catches the two views it used to excuse.
