---
type: "[[test]]"
id: TST-0065
aliases: ["TST-0065"]
title: "A note opens at the size a person chose: its own size first, then the size last chosen on that view, then a first-use size, and a small window changes what is drawn and never what is stored"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/reading-size.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh reading-size"
covers: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]"]
issues: []
tasks: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
artifacts: []
adequacy: "Measured in part on 2026-10-02. An independent reviewer removed the line that writes the view's size on a newly opened note and two tests failed. Commit 0d39033 says its three new tests fail with the fix taken out. The other rules have not been broken on purpose."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# A note opens at the size a person chose

## Purpose

This suite checks which size a note opens at, what a resize changes, and what a small window may and may not do. ISS-0071 was a note that changed size as soon as it was dragged. The rule that replaces it is in two pure modules, `desktop/src/shared/panes.ts` and `desktop/src/shared/store-state.ts`, and the suite checks it there, with no window.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh reading-size`.

## Expected results

- A note with a size of its own opens at that size, whatever the view prefers.
- A note with no size opens at the size last chosen on that view of that workspace; with none, at 560 by 520.
- Putting a note on the desk writes its size on its card, so resizing another note afterwards does not change it.
- Resizing a note changes that note and the view's preference, and no other note.
- A note with no size of its own is drawn the same before and after another note is resized. That holds for a note put on the desk with no size, for the notes of a state file older than reading sizes, and for a note kept on every view. A card with only a width stored keeps that width.
- A press and release on the resize corner asks for nothing. A drag of the corner starts from the size the note has, not from the smaller size a small field draws it at. The size it asks for is clamped as the store clamps a resize.
- Moving a note changes its place and not its size.
- A field smaller than the note draws it smaller; the stored size is untouched, and a wider field draws it at its stored size again.
- A state file written before reading sizes existed opens, with no preference.
- Each view keeps its own size, and so does each workspace.
- A size asked for when a note is opened wins over the view's. A size below what can be read, or above 4000 pixels a side, is clamped.
- The view's sizes are written to the state file and read back, and junk in the file is no size.
- A tablet is told the reading size of a workspace it can open and of no other.

## Evidence

2026-10-02: the suite ran inside `npm test` in `desktop/`, 589 of 589, at `e86b2e4`. It holds 14 tests. This note has a `command:`, so it records no verdict of its own; CI runs it.

The suite checks the rule in the store. Three runs in a window at `e86b2e4`, in the Linux container, check what a person sees. The `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]) finds the document 560 by 520 "to the pixel when opened, while dragged, after the drag, out of focus and in focus again", and finds the next note opening at the size the corner last chose. The `glass-desktop` walk finds a document back at its size after the window was narrow. The `glass-collection` walk resizes a note to 624 by 552 and finds the next note opened in that window 624 by 552.

Not checked in that pass: that a note opened in a second window on the same view takes the view's size. The `glass-collection` walk opens a note on the served page, which is a second window with no bridge to the application. In that run it compared the two sizes only when the served page's field could hold the chosen size, and it could not: the field there was 772 by 446 and the size chosen was 624 by 552. So no size was compared. The note it opened there was drawn 622 by 427. Since `e3f1460` the walk makes the served window 1440 by 900 and requires the two sizes to be equal. No pass cited here has run that check, and no run has opened a second Deck window on the same view.

The count above is from before the independent review of FEAT-0017. The review's fixes added four tests (`0d39033`, `fb829b0`), and no pass that ran the suite with them is recorded here yet.

**Two defects the review found, 2026-10-02, which this suite now holds.**

- A note with no size of its own changed size when another note was resized. Both reviewers showed it through the built reducer: a note put on the desk with no size was drawn 560 by 520, and after a different note was resized to 820 by 700 it was drawn 820 by 700. The suite's test "resizing one note leaves every other open note the size it was" opened both notes with a size, so it never met such a note. Three tests hold the fix (`0d39033`): "a note with no size of its own is drawn the same before and after another note is resized", "a state file older than reading sizes: its notes hold their size when one of them is resized" and "a note on every view holds the size it is drawn at where the view already has a size".
- A press and release on the resize corner, with no movement, stored the size the document was drawn at. Both reviewers found it by reading the renderer and neither ran it. The rule was moved out of the renderer into `cornerResize` in `desktop/src/shared/panes.ts`, and one test holds it (`fb829b0`): "a press and release on the corner asks for nothing, and a drag of it starts from the size the note has". What the window does with the rule, and Escape during a drag of the corner, are checked by the walk `focus-neighbourhood`, not here.

## Adequacy (who verifies this test?)

Measured in part, on 2026-10-02. One rule was taken out by a reviewer: reviewer A of FEAT-0017 removed the line of the store that writes the view's size on a newly opened note, and two tests failed (`pass 12 fail 2`). Reviewer B broke no rule in this suite. Both named the same gap, a note with no size beside one that is resized, and row 2a of FEAT-0017's "Review" has their evidence. Commit `0d39033` says its three tests fail with the reducer's new step taken out; that run was made by the session that wrote them, not by a reviewer. No break has been run against the rules about a small field, a state file or a tablet.
