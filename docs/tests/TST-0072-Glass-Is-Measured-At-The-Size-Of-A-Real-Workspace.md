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

Both runs below are from the verification pass of **2026-10-02** at build `4243fc2`. They were taken in the Linux box: the `project-os-deck-smoke` image, Electron under Xvfb, 4 cores, 8 GB, compositing in software (the run records `disabled_software`). The window was 1440 by 873, the field 1260 by 745, the device pixel ratio 1, the window focused and visible, and reduced motion off. Each run recorded 8 checks and 8 held. Each left the workspace it read unchanged. The records are `desktop/dist/walks/glass-scale-your-trainer/drive.json` and `desktop/dist/walks/glass-scale/drive.json` in the clone the pass ran from, with six pictures beside each.

Every figure in this section is the box's. None was taken on the Mac.

### Your Trainer, 1393 notes in the view

A copy of Your Trainer at `90429bd4`, Features view. The walk took 35 seconds.

#### Script work per frame while the field turns

A quarter turn a second for four seconds. The frame is 16.7 ms. Work is what the turn's script costs, apart from the wait for the display.

| What is on the field | Elements | Median | 95th percentile | Frames in 4 s |
| --- | --- | --- | --- | --- |
| The collection, no document | 3083 | 3.0 ms | 6.3 ms | 241 |
| Two documents, one in focus with 217 notes gathered | 6654 | 5.6 ms | 9.0 ms | 212 |
| Four documents | 6863 | 3.7 ms | 10.3 ms | 221 |
| Four documents, the collection as cards | 6957 | 4.0 ms | 8.7 ms | 232 |

Before two savings made on the same day ([[CHG-20261002-Glass-Collections-Documents-And-Arrangements]]) the second row was 8.2 and 16.7 ms and the third 5.1 and 17.1 ms: the 95th percentile was at or over one frame. Those two earlier pairs are from the message of commit `002fc33`, measured in the same box before that commit.

With documents on the field the box drops frames: 212 to 232 arrive in four seconds where 240 would. The 95th-percentile interval is 33.4 ms in the second row and 33.3 ms in the third, two frames, and 16.8 ms in the first and the fourth. The script work is under one frame in every row, so the rest is the box painting in software. Whether the Mac drops frames is what step 4 measures.

#### Opening a note

From the press to the document being on screen, to its text being in, and to nothing moving.

| Opened from | On screen | Text in | Settled |
| --- | --- | --- | --- |
| A row, for a note the field has no place for | 82 ms | 326 ms | 398 ms |
| A row found by typing its id, the note joined to 217 others | 37 ms | 313 ms | 336 ms |
| A row, 90 ms into another note's opening | 56 ms | 240 ms | 333 ms |

The document is named on its first frame in all three. The opening is 300 ms by design, so "settled" is that plus the frame it started on.

#### Reach

- 1393 members; 133 have a place in the field and 1260 are in the list only. A member with no place opens from its row with its full text.
- The most linked-to note opens with all 217 neighbours seated once, 12 of them in the window; the counters at the edges name the rest (90 beyond the left, 115 beyond the right) and its list has 217 rows.
- A note joined to more than one open note is one card: with four documents open, 77 cards were seated and 77 were distinct.
- As cards the collection counts 1393, draws 14 at once, in 100 pages, and End reaches the last member.
- Typing a 9-character id narrowed 1393 notes to 51 and put its row in reach in 455 ms.
- A second row pressed 90 ms after the first is still under the pointer, and both notes end open at full size.

#### Memory

| | Renderer heap | Renderer working set | All processes |
| --- | --- | --- | --- |
| The view open | 12 MB | 211 MB | 652 MB |
| The most linked-to note open | 20 MB | 346 MB | 853 MB |
| Four documents | 14 MB | 380 MB | 911 MB |

### This repository, 144 notes in the view

This repository's notes at `4243fc2`, Features view, in a workspace of 406 notes and 6862 links. The walk took 33 seconds.

| What is on the field | Elements | Median | 95th percentile | Frames in 4 s |
| --- | --- | --- | --- | --- |
| The collection, no document | 608 | 0.4 ms | 0.5 ms | 241 |
| Two documents, one in focus with 63 notes gathered | 1860 | 0.6 ms | 0.8 ms | 241 |
| Four documents | 2440 | 0.5 ms | 0.7 ms | 240 |
| Four documents, the collection as cards | 2523 | 0.5 ms | 0.8 ms | 240 |

The 95th-percentile interval between frames is 16.7 or 16.8 ms in all four rows: at this size the box drops none.

| Opened from | On screen | Text in | Settled |
| --- | --- | --- | --- |
| A row, for a note the field has no place for | 43 ms | 182 ms | 348 ms |
| A row found by typing its id, the note joined to 63 others | 32 ms | 117 ms | 327 ms |
| A row, 90 ms into another note's opening | 41 ms | 109 ms | 340 ms |

- 144 members; 25 have a place in the field and 119 are in the list only.
- The most linked-to note opens with all 63 neighbours seated once, 12 of them in the window (13 beyond the left, 38 beyond the right).
- As cards the collection counts 144, draws 14 at once, in 11 pages, and End reaches the last member.
- Memory, as renderer heap, renderer working set and all processes: 8, 173 and 577 MB with the view open; 9, 250 and 710 MB with the most linked-to note open; 12, 258 and 726 MB with four documents.

## What it does not establish

- The frame time on the Mac in a foreground window. Not run: it takes the keyboard.
- How long a person takes to find, open, compare, follow a link and return, how often they pick the wrong note, or whether the motion helps them. A script has no such numbers, and none is written here.
- The Issues and Tests views of that workspace, and any view of the cockpit's own.
- What a turn costs after Read, Compare or Show related has been applied. The walk turns the field with documents where they opened and with the collection as cards; it applies no arrangement.
- Anything on a second display, a real tablet, with a screen reader or by touch.
