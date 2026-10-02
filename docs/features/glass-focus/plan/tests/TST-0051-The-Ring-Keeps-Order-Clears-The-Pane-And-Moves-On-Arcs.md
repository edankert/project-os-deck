---
type: "[[test]]"
id: TST-0051
aliases: ["TST-0051"]
title: "The seats round an opened note hold every neighbour at browsing size, never overlap the document or each other, keep the cards' circular order, and run on past the field's left and right edges"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-10-02
source: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/focus-ring.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh focus-ring"
covers: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]"]
issues: []
tasks: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[DES-0002-The-Glass-Cockpit]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# The seats keep order, clear the document and run past the edge

## Purpose

While a note is open in Glass, the notes it is joined to are the field's own cards, moved to seats round its document. A seat is the place one card takes. Where the seats are is worked out by a pure module, `desktop/src/shared/focus-ring.ts`, so this suite checks every promise about them in node, over many field and document sizes, with no window.

TASK-0104 rewrote this suite on 2026-10-01. Until then it checked the contract Edwin rejected on 2026-09-12 (ISS-0070, ISS-0071, ISS-0072): a document sized from the number of its neighbours, sixteen 168 by 44 copies kept inside the window, "+N more" for the rest, and paths on arcs. None of those is checked any more, because none is built. The file name of this note still says ring and arcs.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh focus-ring`.

## Expected results

- A seat is the size a front-band card straight ahead is drawn at, and taller than the 44 pixels of the copies it replaces.
- Every neighbour gets a seat: 1, 6, 16, 17, 40 and 150 neighbours, on fields from 700 by 480 to 2560 by 1300, round documents from 280 by 160 to 900 by 700. The document's size is an input, and the layout returns seats only.
- No seat lies over the document or over another seat, each keeps the gap from the document on at least one axis, and none is above or below the field.
- Seats in sight are filled before any seat beyond the field, and adding a neighbour never takes a seat in sight away. On a 1440 by 860 field a 560 by 520 document has at least 16 seats in sight.
- A document against the left edge seats twelve neighbours in sight, none off to the left.
- No seat stands under the compass or under another document.
- A field too short for one whole seat still seats every neighbour, in one row.
- The same request returns the same seats, nearest first, and fewer neighbours take the first of the same seats.
- The cards keep the circular order they had round the document, whatever order they are given in, and the arrangement is turned to the seating that moves them least.
- A neighbour known only by its side goes to that side; one with no place goes below.
- The least movement brings a card into the field, and a card already there moves nothing.
- The edge counters count what is wholly beyond each edge and nothing that is partly in the field.
- A line leaves the document at its edge, toward the card it runs to.
- The easing is symmetric and slow at both ends, and the opening and the gathering each take between 250 and 400 ms.

## Evidence

2026-10-02: the suite ran inside `npm test` in `desktop/`, 586 of 586, at `9379a0c`. It holds 15 tests. The application code has changed since by one word in a comment. This note has a `command:`, so it records no verdict of its own; CI runs it.

The suite checks where seats are. That the cards on screen stand at those seats, once each, is checked in a window by the `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]).

## Adequacy (who verifies this test?)

Not measured for the suite as it stands. The four breaks recorded here on 2026-09-11 were made against the suite TASK-0104 replaced, and each of the checks they failed is gone. No break has been run against the rewritten suite.
