---
type: "[[issue]]"
id: ISS-0007
aliases: ["ISS-0007"]
title: "Four smaller defects in the renderer: an unclamped restored position, a count of two different things, a live remove control on a status card, and filters that do not follow a second window"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review of the PHASE-0001 Spread work, 2026-09-07"]
severity: medium
component: renderer
parent: ""
related: ["[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# Four smaller defects the review found in the renderer

## Problem

The independent review of 2026-09-07 found four defects too small for a note each, and one thing they share: every one of them lives in the renderer, which no automated suite loads.

**A restored position was never clamped, and two notes said it was.** The clamp ran during a drag and nowhere else, so a desk saved on a large monitor opened on a laptop with its cards off the edge. [[TASK-0025-Cards-Are-Dragged-And-Removed]] and the change note both claimed the opposite. The check that was supposed to guard it called the clamp directly, so it passed whether or not the application ever called it.

**The navigator counted two different things and printed them as a ratio.** The left number counted the rows at the top level of each group; the right number counted every note in the view, children included and repeats removed. On the Features view it read "230 of 1400" with nothing narrowed.

**The remove control worked on a card in the Needs-you strip.** That strip is a status board and has no desk behind it, so the × silently took the note off the main window's desk instead.

**The status and type filters did not follow a second window.** The search box did. A change made in one window narrowed the other window's list while its dropdowns still showed the old value.

## Resolution

**All four fixed 2026-09-07.** A restored position is clamped when it is drawn, not when it is stored, so the saved desk keeps the positions it was saved with. Both halves of the navigator's ratio are counted the same way, children included. The remove control refuses in the strip. The filters are set from the state on every repaint, the way the search box already was.

## Correction, 2026-09-07: half of the third fix was never built

**The remove control is still drawn on a card in the Needs-you strip.** The sentence above said "hidden in the strip and refuses there in any case", and only the refusal was built. The close-out review of the same day looked for the hiding rule and found none: `grep -n "remove" desktop/src/renderer/deck.css` returns three rules and not one of them hides the control, in the source or in the built stylesheet ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]).

So a person hovering a card in a popped-out strip is still offered a ×, and clicking it now does nothing at all. That is a different wrong behaviour from the one this note filed, not the absence of one, and it is [[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]. The claim here is corrected rather than deleted, because what the note asserted is part of the record.

**The first fix, the clamp, is real but guarded by nothing.** The same review replaced the clamp call in the built renderer with a plain assignment and all 153 checks passed. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] measured, not a new defect here.
