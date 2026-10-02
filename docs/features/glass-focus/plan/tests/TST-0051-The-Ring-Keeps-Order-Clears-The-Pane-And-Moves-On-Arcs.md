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
adequacy: "Measured on 2026-10-02. In round one two independent reviewers took seven seating rules out of the built module: the suite failed for three and passed for four. Commit 0fc2c46 added a test for each of the four. In round two an independent reviewer took those four out again and the suite failed each time. The Adequacy section lists them."
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
- No seat is closer than the 14 pixel gap to a document of any size, wherever the document stands in the field. Checked over 400 layouts made from a fixed seed.
- Seats in sight are filled before any seat beyond the field, and adding a neighbour never takes a seat in sight away. On a 1440 by 860 field a 560 by 520 document has at least 16 seats in sight.
- A document against the left edge seats 12, 20, 40 and 51 neighbours in sight, none off to the left. Asked for 52 or more, it seats 51 in sight.
- Wherever the document stands, no card is sent out of sight while a seat in sight is free. Checked over 250 layouts made from a fixed seed.
- No seat stands under the compass or under another document.
- A field too short for one whole seat still seats every neighbour, in one row.
- The same request returns the same seats, nearest first, and fewer neighbours take the first of the same seats.
- The cards keep the circular order they had round the document, whatever order they are given in, and the arrangement is turned to the seating that moves them least.
- Whatever stood where, no other turn of the seating moves the cards less than the one chosen. Checked over 300 neighbourhoods made from a fixed seed, 198 of which need a turn.
- Two neighbours with an equal claim to a seat are seated by id, whichever was named first.
- A neighbour no card can be drawn for is given no seat, and neither is one that is already a document on the desk.
- A neighbour known only by its side goes to that side; one with no place goes below.
- The least movement brings a card into the field, and a card already there moves nothing.
- The edge counters count what is wholly beyond each edge and nothing that is partly in the field.
- A line leaves the document at its edge, toward the card it runs to.
- The easing is symmetric and slow at both ends, and the opening and the gathering each take between 250 and 400 ms.

## Evidence

2026-10-02: the suite ran inside `npm test` in `desktop/`, 645 of 645, at `18f5405`. It holds 20 tests: 15 before the independent review of FEAT-0017, and five added by the review's fixes, which also extended one (`0fc2c46`, `b3646d0`). This note has a `command:`, so it records no verdict of its own; CI runs it.

The suite checks where seats are. That the cards on screen stand at those seats, once each, is checked in a window by the `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]).

**What the review found in this suite, 2026-10-02.** The suite passed with four seating rules taken out of the module. It now holds a test for each (`0fc2c46`). That commit changed no line of the module: the tests were what was missing.

- The seating was never turned. The one test for the turn placed each neighbour exactly on a seat, where no turn is needed.
- Columns of seats stopped being offered once there were seats enough, in sight or not. The left-edge test asked for twelve seats; with twenty neighbours the broken module sent five cards out of sight.
- A tie between two neighbours was not broken by id. The test's title said "by id" and it compared no ids.
- The 14 pixels between a seat and the document were not kept. The four document heights the test tried happen to clear the gap anyway.

**One defect in the module, found by a reviewer reading the renderer.** A neighbour for which no card could be made still took a seat, which stood empty. Who takes a seat is now a function in this module, `neighboursToSeat`, with its own test (`b3646d0`).

## Adequacy (who verifies this test?)

Measured on 2026-10-02 by the two independent reviewers of FEAT-0017 in round one, and again by the reviewer of round two after the tests were added. The reviewers took eight rules out of the built code, seven of them in `focus-ring.ts`, and ran this suite each time.

| Rule taken out | By | The suite |
| --- | --- | --- |
| The seating is turned to the one that moves the cards least | reviewer B | passed, 15 of 15 |
| Columns of seats go on being offered until the seats in sight are filled | reviewer B | passed, 15 of 15 |
| A tie between two neighbours is broken by id | reviewer B | passed, 15 of 15 |
| A neighbour with no place is sorted to the bottom | reviewer B | 1 test failed |
| A seat keeps 14 pixels from the document | reviewer A | passed, 15 of 15 |
| No seat lies over the document | reviewer A | 3 tests failed |
| Seats in sight come first in the order | reviewer A | 1 test failed |

Four of the seven were not caught. Commit `0fc2c46` added a test for each of the four and says each rule was then broken again in the built module, and every break failed at least one test. That run was made by the session that wrote the tests.

Round two's reviewer then took the same four rules out again, in a clean context and a clone of its own at `cbae0d3`, and the suite failed each time.

| Rule taken out in round two | The suite |
| --- | --- |
| The seating is turned to the one that moves the cards least | 1 test failed (`pass 19, fail 1`) |
| No card is sent out of sight while a seat in sight is free | 3 tests failed (`pass 17, fail 3`) |
| A tie between two neighbours is broken by id | 1 test failed (`pass 19, fail 1`) |
| A seat keeps 14 pixels from the document | 1 test failed (`pass 19, fail 1`) |

Not broken on purpose by anyone: the rule that a neighbour no card can be drawn for gets no seat, and the rules about the edge counters, the lines, the least movement and the easing. FEAT-0017's "Review" has the commands and what they printed.

The four breaks recorded here on 2026-09-11 were made against the suite TASK-0104 replaced, and each of the checks they failed is gone.
