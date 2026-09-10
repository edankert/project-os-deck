---
type: "[[feature]]"
id: FEAT-0010
aliases: ["FEAT-0010"]
title: "Lifting a note: the desk in Glass, and the neighbourhood that takes the front band while you hold it"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["Edwin 2026-09-07: 'I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity'", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "Edwin, ledger 2026-09-07 on TST-0015: 'one of the thing around relationships / dependencies I think is a little bit of an issue that I don't see this at the moment'"]
goal: "In Glass a click lifts a note out of the field onto the desk Deck already has, and while it is held the notes joined to it take the front band, so the relationships a person cannot see today are the first thing they see."
requirements: []
tasks: ["[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
reviewed_by: model:claude-opus-5
review_date: 2026-09-10
review_verdict: changes-requested
---

# Lifting a note

## Goal

**Edwin cannot see a note's relationships in Deck today, and this feature is what shows them.** When he walked [[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]] on 2026-09-07 he wrote that "relationships / dependencies" are the thing he does not see. In Glass, a click lifts a note out of the field onto the desk. While it is held, every note it links to and every note that links to it comes to the front band at full size, and the person is turned to face them. Put two notes on the desk and the field marks what is joined to both, which is a question the cockpit cannot answer at all.

Three words are used throughout. The **field** is the cylinder of cards that [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] draws, arranged by the view's rule. The **desk** is the chosen subset of notes Deck already keeps for a workspace, the same desk Spread shows ([[FEAT-0005-Spread-Cards-On-A-Desk]]). A note's **neighbourhood** is the notes it links to plus the notes that link to it, as the sidecar reports them.

## Scope

**In scope.** Lifting: every click on a field card adds that note to the desk. The slot the note left stays ghosted, so the hole is visible and the note can be put back. Closing is three verbs and none of them destroys anything: × puts one note back, ⌥× puts back every other note, and esc sweeps the desk. A click on the background does nothing, because sweeping a desk by accident is unforgivable. A held note is an obstacle for the slot geometry, so a promoted neighbour is never dealt underneath it. The neighbourhood: while a note is held, its linked notes and backlinks take the front band at full size and the person is turned to face them. They stay field cards, so clicking one lifts it too. The front plane's label says what it now means, in the same place every time, and the count of what is owed keeps a fixed place in the display while a note is held. What these share: with more than one note on the desk, the field marks every note joined to more than one of them and the desk bar counts them. A lifted note opens in the reader Deck already has.

**One desk model, two surfaces. Decided 2026-09-07.** The desk Glass lifts onto is the desk Deck already holds for the workspace, and a saved desk is the same named record Spread saves. A note lifted in Glass is on the desk in Spread, and a card put on the desk in Spread is held in Glass. [[DES-0002-The-Glass-Cockpit]] asked for one desk per view; a desk belongs to an address, and an address names a view, so that is honoured by the address rather than by a second store.

**The desk does not cross a workspace. Decided 2026-09-07.** DES-0002 rev 8 let the desk survive a workspace switch and carry notes from several repositories. That is not adopted. Deck's desks are per workspace, and each note's content comes from its own sidecar, so a desk holding notes from two sidecars would be a joined index Deck does not have.

**The sidecar is not changed.** The neighbourhood is read from `/api/cockpit/context`, which the cockpit's register already lists under `api.read.note` and which returns a note's linked notes and backlinks grouped by type. Deck's typed client gains one read method for it. Deck's host already forwards that path. One request per held note. The whole-graph payload of [[FEAT-0001-The-Corpus-Has-An-Inside]] is not needed here and is not a dependency.

**Nothing is written.** A note on the desk has no status and owes nothing. Lifting, holding and putting back leave the record exactly as it was.

**Out of scope.** Discharging any verb from the field or the desk; the reader carries the verbs when they arrive. A desk that names notes across repositories. Naming a stack of notes as a saved query, which DES-0002 deliberately did not build. The reader's minimum width on one monitor, which is an open design question recorded in the plan rather than a task here.

## Acceptance

- A click on a field card puts that note on the desk, and the slot it left is drawn ghosted until the note returns.
- × on a held note puts it back into its slot; ⌥× puts back every other note; esc empties the desk; a click on the background changes nothing.
- While a note is held, every note it links to and every note linking to it is in the front band at full size, and no field card is dealt underneath a held note.
- The front plane's label reads "what is joined to what you are holding" while a note is held, and the owed count is still shown in the same place it was before.
- With two or more notes on the desk, every field card joined to more than one of them carries a mark, and the desk bar shows how many there are.
- The same desk, with the same notes, is what Spread shows after switching surface, and what Glass shows after switching back.
- Every held note and every neighbour can be reached and lifted from the navigator using only the keyboard.
- A held note's body is rendered by the reader Deck already has, and no second Markdown renderer exists.

## Links

- Phase: [[PHASE-0002-Glass]]
- Tasks: [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], [[TASK-0037-What-These-Share]]
- Acceptance walk: [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]
- Plan: `docs/features/glass-desk/plan/PLAN.md`
- Design: [[DES-0002-The-Glass-Cockpit]], reviewed in [[REFERENCE-DES-0002-REVIEW]]

## Where this stands

**2026-09-10: built.** A click lifts a note into a pane and ghosts its slot; its neighbourhood takes the front band from inside and outside the view, the label says so and the owed count keeps its place; two held notes mark and count what they share; ×, ⌥× and Escape put back; the desk is Spread's. All three tasks are done. What is left is Edwin's walk, [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]].

**2026-09-10: a held note becomes a pane, in the feature beside this one.** [[REFERENCE-GLASS-PHASE-REVIEW]] found that this feature lifts a note and puts it back and never says the held note can be moved, and that the plan's open question about the reader's width had been left to the design. [[TASK-0054-A-Held-Note-Is-A-Pane]] under [[FEAT-0014-The-Hands]] answers both: a held note is dragged, resized and stacked with DES-0002's header rule, has a stated minimum width and a verb that widens it to a reading column, and keeps its place and size in the desk record Spread already saves. Reaching for a card before lifting it, which shows the neighbourhood as wires without a lift, is [[TASK-0056-Reach]] and reuses [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]'s context read. This feature's three tasks and their acceptance are unchanged.

**2026-09-07: planned.** Written the day Edwin decided that Glass is Deck's main view and is built first ([[ADR-0002-Glass-Is-The-Main-View]]). Nothing here can start before [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] has a field to lift from, which is its TASK-0031, and a slot geometry that treats a held note as an obstacle, which is its TASK-0030.

## Independent review, 2026-09-10

**Verdict: changes requested.** Reviewed by model:claude-opus-5 in a fresh context that started from the notes and the diff (3045a42..c283128). It ran as a subagent launched from the authoring session (the commits' `Claude-Session` trailer names the session this reviewer runs under), so what is independent is the context, not the session tree or the model family. What the reviewer ran: `npm test`, 391 of 391; the six Glass suites, 50 of 50; `DECK_SMOKE_ONLY=glass electron . --smoke`, 113 checks and none failed, on a Mac with four displays; `bash tools/scripts/run-smoke.sh lan`, exit 0; `git status` unchanged in this repository and the cockpit's after every run. Mutants were run against `desktop/dist`, which was rebuilt afterwards. R marks a finding reproduced by a command; N marks one not reproduced.

1. R — "No field card is dealt underneath a held note" (TASK-0035) fails whenever the pane is clamped into the field. `paneObstacles()` uses the stored `x` and `paintPane()` draws the clamped one; in a real window three field cards were drawn under a pane. The detail is in FEAT-0009's review, finding 1.
2. R — What two held notes share is mostly not in the field. In the smoke run the bar read "2 held · 8 joined to more than one of them" and only 2 cards carried the mark. The other 6 are joined notes the 12-card front band had no room for, because `frontRank` gives every joined note the same rank and gives shared notes no priority. TASK-0037's acceptance, "every field card ... carries the mark", is met literally, but the question the feature answers is visible for 2 of 8.
3. R — The smoke check for "its neighbours take the front band" passes with a single neighbour. Its predicate is `front.length === Math.min(ids.length, 12) || front.length >= 1`. With the built field keeping only the first joined note, it passed as "2 of 11". TASK-0036's evidence, "11 of 11", is what one run printed, not what the check requires.
4. R — TASK-0036's line "every note in its linked and backlink groups is in the front band at full size" cannot hold for a note with more than twelve neighbours, because the rest are counted as overflow. The line has not been amended to say so.
5. N — Under reduced motion the lift's turn is a cut with no highlight: `faceFront()` calls `flyTo(0)` without one, and TASK-0036 asks for "a highlight on the neighbours". The `joined` card styling may be meant as that highlight. The smoke run does not check that a lift turns the field to face the neighbourhood.
