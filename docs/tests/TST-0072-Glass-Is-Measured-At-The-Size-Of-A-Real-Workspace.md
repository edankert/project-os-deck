---
type: "[[test]]"
id: TST-0072
aliases: ["TST-0072"]
title: "Glass is measured at the size of a real workspace, with the collection and full documents on the field: script work per frame while turning, how long a note takes to open, and the cases a small workspace does not have"
status: passing
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/glass-scale.cjs"
command: ""
last_verified: 2026-10-02
automation: "one command, run by hand: bash tools/scripts/walk-in-a-box.sh glass-scale --workspace ../your-trainer. Not run by run-tests.py or by CI, which have no Docker."
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: []
tasks: ["[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]", "[[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0057-The-Measurement-Is-Kept-In-A-File]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]", "[[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]", "[[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]]"]
---

# Glass is measured at the size of a real workspace

## Purpose

This repository's Features view holds 144 notes. Your Trainer's holds 1393, in a workspace of 3247 notes and 20277 links, and its most linked-to feature is joined to 217 others. What Glass costs and whether everything stays reachable has to be seen there. This walk opens a copy of that workspace, measures a turn of the field with the collection and with documents on it, times an opening, and drives the cases a small workspace cannot show.

**What these numbers are, and are not.** The walk runs in the Linux box, where the display is rendered in software. So the time between frames is the box's and says nothing about the Mac. What carries over is the script work per frame, the counts, and the behaviour. PHASE-0002's criterion is a frame time in a foreground window on the Mac, and this does not replace it: the same file runs there, and takes the keyboard for about a minute, so it waits for Edwin to run it or to say when.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-scale --workspace ../your-trainer --name glass-scale-your-trainer`. The workspace is mounted read-only and copied inside the box; `git status` there is empty before and after.
3. `bash tools/scripts/walk-in-a-box.sh glass-scale` runs the same walk on this repository's notes, for a small workspace to set beside the large one.
4. On the Mac, when it may take the keyboard: `cd desktop && npm run build && npx electron . --drive demos/glass-scale.cjs --drive-out dist/walks/glass-scale-mac --workspace ../../your-trainer`.

## Evidence

Both runs below are from the verification pass of **2026-10-02** at build `18f5405`. They were taken in the Linux box: the `project-os-deck-smoke` image, Electron under Xvfb, 4 cores, 8 GB, compositing in software (the run records `disabled_software`). The window was 1440 by 873, the field 1260 by 717, the device pixel ratio 1, the window focused and visible, and reduced motion off. The window is under 1500 px wide, so the bar above the field is two rows high. Each run recorded 8 checks and 8 held, and no step was skipped. The records are `desktop/dist/walks/glass-scale-your-trainer/drive.json` and `desktop/dist/walks/glass-scale/drive.json` in the clone the pass ran from, with six pictures beside each.

The run on this repository records that `git status` in the workspace was the same before and after. The run on Your Trainer reads a copy made in the box from a read-only mount. A copy is not a git repository, and its record holds no answer for that check. `git status` in Your Trainer itself was empty after the pass.

Every figure in this section is the box's, and the box draws in software. None was taken on the Mac. The figures differ a little from run to run: the pass before the review, at `e86b2e4`, gave 8.8 ms where this one gives 10.7 in the second row of the first table.

### Your Trainer, 1393 notes in the view

A copy of Your Trainer at `90429bd4`, Features view. The walk took 59 seconds.

#### Script work per frame while the field turns

A quarter turn a second for four seconds. The frame is 16.7 ms. Work is what the turn's script costs, apart from the wait for the display. Elements is the most the page held during the turn.

| What is on the field | Elements | Median work | 95th-percentile work | Frames in 4 s | 95th-percentile time between frames |
| --- | --- | --- | --- | --- | --- |
| The collection, no document | 3086 | 2.5 ms | 6.5 ms | 241 | 16.8 ms |
| Two documents, one in focus with 217 notes gathered | 6657 | 5.9 ms | 10.7 ms | 211 | 33.3 ms |
| Four documents | 6776 | 2.9 ms | 8.7 ms | 224 | 33.3 ms |
| Four documents, the collection as cards | 6845 | 3.0 ms | 5.9 ms | 236 | 16.8 ms |
| Four documents, after Read was applied | 6518 | 3.1 ms | 8.2 ms | 227 | 33.3 ms |
| Four documents, after Compare was applied | 6519 | 3.0 ms | 6.1 ms | 240 | 16.7 ms |
| Four documents, after Show related was applied | 7002 | 3.0 ms | 8.8 ms | 224 | 33.3 ms |

The last three rows are the turns after an arrangement, which the walk has made since commit `c5af79f`. Each command was pressed with the four documents open and the list as a table, and applied with Enter. The field was then turned with the documents where the arrangement put them, and the arrangement was undone before the next command.

The script work is under one frame in every row: the largest 95th percentile is 10.7 ms. With documents on the field the box still drops frames. Between 211 and 240 arrive in four seconds where 240 would, and in four rows the 95th-percentile time between frames is two frames. The rest is the box painting in software. Whether the Mac drops frames is what step 4 of the Procedure measures.

Before two savings made on the same day ([[CHG-20261002-Glass-Collections-Documents-And-Arrangements]]) the second row was 8.2 and 16.7 ms and the third 5.1 and 17.1 ms: the 95th percentile was at or over one frame. Those two earlier pairs are from the message of commit `002fc33`, measured in the same box before that commit.

#### Opening a note

From the press to the document being on screen, to its text being in, and to nothing moving.

| Opened from | On screen | Text in | Settled |
| --- | --- | --- | --- |
| A row, for a note the field has no place for | 93 ms | 367 ms | 436 ms |
| A row found by typing its id, the note joined to 217 others | 99 ms | 307 ms | 349 ms |
| A row, 90 ms into another note's opening | 78 ms | 334 ms | 334 ms |

The document is named on its first frame in all three. The opening is 300 ms by design.

#### Reach

- 1393 members; 133 have a place in the field and 1260 are in the list only. A member with no place opens from its row with its full text.
- The most linked-to note opens with all 217 neighbours seated once, 9 of them in the window. The counters at the edges name the rest (91 beyond the left, 117 beyond the right), and the document says "217 related".
- A note joined to more than one open note is one card: with four documents open, 25 cards were seated and 25 were distinct.
- As cards the collection counts 1393, draws 12 at once, in 117 pages, and End reaches the last member.
- Typing a 9-character id narrowed 1393 notes to 51 and put its row in reach in 461 ms.
- A second row pressed 90 ms after the first is still under the pointer, and both notes end open at full size.

#### Memory

| | Renderer heap | Renderer working set | All processes |
| --- | --- | --- | --- |
| The view open | 13 MB | 211 MB | 650 MB |
| The most linked-to note open | 17 MB | 351 MB | 853 MB |
| Four documents | 20 MB | 383 MB | 911 MB |

### This repository, 144 notes in the view

This repository's notes at `18f5405`, Features view, in a workspace of 409 notes and 7161 links. The walk took 57 seconds.

| What is on the field | Elements | Median work | 95th-percentile work | Frames in 4 s | 95th-percentile time between frames |
| --- | --- | --- | --- | --- | --- |
| The collection, no document | 611 | 0.3 ms | 0.5 ms | 241 | 16.7 ms |
| Two documents, one in focus with 63 notes gathered | 1863 | 0.7 ms | 0.9 ms | 241 | 16.7 ms |
| Four documents | 5085 | 1.1 ms | 1.3 ms | 218 | 33.4 ms |
| Four documents, the collection as cards | 5121 | 1.1 ms | 1.4 ms | 231 | 16.8 ms |
| Four documents, after Read was applied | 3349 | 0.4 ms | 0.6 ms | 239 | 16.8 ms |
| Four documents, after Compare was applied | 3350 | 0.4 ms | 0.5 ms | 240 | 16.7 ms |
| Four documents, after Show related was applied | 6431 | 1.1 ms | 1.5 ms | 209 | 33.4 ms |

The script work is 1.5 ms or less at the 95th percentile in every row. The box drops frames here too: 218 frames arrive with four documents, 231 with the collection as cards and 209 after Show related, and in the first and the last of those the 95th-percentile time between frames is two frames. With four documents open 165 cards were seated round them here, against 25 on Your Trainer.

| Opened from | On screen | Text in | Settled |
| --- | --- | --- | --- |
| A row, for a note the field has no place for | 43 ms | 198 ms | 372 ms |
| A row found by typing its id, the note joined to 63 others | 43 ms | 114 ms | 320 ms |
| A row, 90 ms into another note's opening | 31 ms | 258 ms | 328 ms |

- 144 members; 25 have a place in the field and 119 are in the list only.
- The most linked-to note opens with all 63 neighbours seated once, 9 of them in the window (15 beyond the left, 39 beyond the right).
- With four documents open, 165 cards were seated and 165 were distinct.
- As cards the collection counts 144, draws 12 at once, in 12 pages, and End reaches the last member.
- Typing a 9-character id narrowed 144 notes to 7 and put its row in reach in 354 ms.
- Memory, as renderer heap, renderer working set and all processes: 8, 172 and 580 MB with the view open; 10, 242 and 695 MB with the most linked-to note open; 14, 299 and 778 MB with four documents.

## What it does not establish

- The frame time on the Mac in a foreground window. Not run: it takes the keyboard.
- How long a person takes to find, open, compare, follow a link and return, how often they pick the wrong note, or whether the motion helps them. A script has no such numbers, and none is written here.
- The Issues and Tests views of that workspace, and any view of the cockpit's own.
- A turn after an arrangement with the collection as cards, or with more than four documents open. The three turns after an arrangement were measured with four documents open and the list as a table.
- Anything on a second display, a real tablet, with a screen reader or by touch.
