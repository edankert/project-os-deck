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

This repository's Features view holds 131 notes. Your Trainer's holds 1393, in a workspace of 3247 notes and 20277 links, and its most linked-to feature is joined to 217 others. What Glass costs and whether everything stays reachable has to be seen there. This walk opens a copy of that workspace, measures a turn of the field with the collection and with documents on it, times an opening, and drives the cases a small workspace cannot show.

**What these numbers are, and are not.** The walk runs in the Linux box, where the display is rendered in software. So the time between frames is the box's and says nothing about the Mac. What carries over is the script work per frame, the counts, and the behaviour. PHASE-0002's criterion is a frame time in a foreground window on the Mac, and this does not replace it: the same file runs there, and takes the keyboard for about a minute, so it waits for Edwin to run it or to say when.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-scale --workspace ../your-trainer --name glass-scale-your-trainer`. The workspace is mounted read-only and copied inside the box; `git status` there is empty before and after.
3. On the Mac, when it may take the keyboard: `cd desktop && npm run build && npx electron . --drive demos/glass-scale.cjs --drive-out dist/walks/glass-scale-mac --workspace ../../your-trainer`.

## Evidence

**2026-10-02**, Linux box (4 cores, 8 GB, software rendering), window 1440 by 873, field 1260 by 745, device pixel ratio 1, build `74c3911`, a copy of Your Trainer at `90429bd4`, Features view, no other container running. 8 checks recorded, 8 held.

### Script work per frame while the field turns

A quarter turn a second for four seconds. The frame is 16.7 ms. Work is what the turn's script costs, apart from the wait for the display.

| What is on the field | Elements | Median | 95th percentile | Frames in 4 s |
| --- | --- | --- | --- | --- |
| The collection, no document | 3069 | 3.0 ms | 6.8 ms | 241 |
| Two documents, one in focus with 217 notes gathered | 6634 | 5.6 ms | 9.7 ms | 213 |
| Four documents | 6837 | 3.7 ms | 10.1 ms | 220 |
| Four documents, the collection as cards | 6950 | 3.9 ms | 7.8 ms | 234 |

Before two savings made on the same day ([[CHG-20261002-Glass-Collections-Documents-And-Arrangements]]) the second row was 8.2 and 16.7 ms and the third 5.1 and 17.1 ms: the 95th percentile was at or over one frame.

With documents on the field the box drops frames: 213 to 234 arrive in four seconds where 240 would, and the 95th-percentile interval is 33.4 ms, two frames. The script work is under one frame in every row, so the rest is the box painting in software. Whether the Mac drops frames is what step 3 measures.

### Opening a note

From the press to the document being on screen, to its text being in, and to nothing moving. In the box.

| Opened from | On screen | Text in | Settled |
| --- | --- | --- | --- |
| A row, for a note the field has no place for | 74 ms | 199 ms | 383 ms |
| A row found by typing its id, the note joined to 217 others | 82 ms | 285 ms | 325 ms |
| A row, 90 ms into another note's opening | 52 ms | 222 ms | 322 ms |

The document is named on its first frame in all three. The opening is 300 ms by design, so "settled" is that plus the frame it started on.

### Reach

- 1393 members; 133 have a place in the field and 1260 are in the list only. A member with no place opens from its row with its full text.
- The most linked-to note opens with all 217 neighbours seated once, 12 of them in the window; the counters at the edges name the rest (90 beyond the left, 115 beyond the right) and its list has 217 rows.
- A note joined to more than one open note is one card.
- As cards the collection draws 14 at once, in 100 pages, and End reaches the last member.
- Typing a 9-character id narrowed 1393 notes to 51 and put its row in reach in 461 ms.
- A second row pressed 90 ms after the first is still under the pointer, and both notes end open at full size.

### Memory

| | Renderer heap | Renderer working set | All processes |
| --- | --- | --- | --- |
| The view open | 11 MB | 210 MB | 651 MB |
| The most linked-to note open | 11 MB | 347 MB | 849 MB |
| Four documents | 14 MB | 374 MB | 909 MB |

## What it does not establish

- The frame time on the Mac in a foreground window. Not run: it takes the keyboard.
- How long a person takes to find, open, compare, follow a link and return, how often they pick the wrong note, or whether the motion helps them. A script has no such numbers, and none is written here.
- The Issues and Tests views of that workspace, and any view of the cockpit's own.
