---
type: "[[task]]"
id: TASK-0002
aliases: ["TASK-0002"]
title: "The layout is computed once and kept — and a new note takes a place without moving its neighbours"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-10
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: ["TASK-0001"]
blocks: ["TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: ["[[TST-0047-The-Orbit-Layout-Is-Solved-Once-And-Kept]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The layout is computed once and kept

## Objective

Positions for the orbit arrangement are solved once, stored, and stable across sessions. Opening the orbit twice shows the same field.

## Detail

A force simulation over 16148 edges cannot run on every open, and a field that re-settles differently each time cannot be learned. Both problems have the same fix: solve, store, and treat the result as data.

**The hard half is growth.** This corpus added 634 notes in one month. A new note must be placed near its links without displacing what is already there — otherwise every remembered position is wrong the next morning, which is worse than never having offered stability. [[DES-0001]]'s ATLAS objection is the same problem stated for a map, and the answer is likely the same: allocate with room, and spill at the edge rather than re-solving the interior.

**This layout serves the orbit arrangement only.** The Glass field's other arrangements ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]) are dealt from the band function and the slot geometry, TASK-0029 and TASK-0030, on every view change. They never read these stored positions. The orbit is the one arrangement where a position means something about the corpus rather than about the view, which is why it is the one that has to be kept.

**The drift is the phase's second number.** How far an existing node moves when one note is added and the layout is recomputed goes into [[FEAT-0001-The-Corpus-Has-An-Inside]] as a number, and it is an exit criterion of [[PHASE-0002-Glass]].

## Acceptance

- Two consecutive loads produce identical positions
- Adding a note moves no existing node by more than a stated tolerance, and the measured drift is written in the feature note
- The stored layout survives a restart and is invalidated only when the edge list changes materially

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0593` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).

## Outcome

**Done 2026-09-10.** `desktop/src/shared/orbit.ts` solves the layout on the cylinder: round is a note's cluster, seeded by phase and pulled by its links; up is spread within it; nearer is more linked-to. The solve is Fruchterman–Reingold with repulsion within twice the ideal spacing, then each coordinate is blended with its rank so the notes fill the cylinder. The first solve, a plain spring layout, drew this repository's 234 notes as a thin line across a quarter of a turn; the second, without the spread, did the same on a corpus dominated by a few hubs. `GraphService` keeps the layout in Deck's user data directory, one file per workspace, and uses it again while the corpus has changed by less than 15% of its notes. The solve runs on a worker thread (`desktop/src/main/orbit-worker.ts`): the first build ran it in the main process, where Your Trainer's 2.6-second solve would have held every window's store traffic.

**A new note moves nothing.** A note that arrives is placed at the circular mean of its placed neighbours and relaxed with every existing note pinned. **The drift is 0 by construction**, measured as 0 on all three workspaces when a note linked to the three most linked-to notes is added. Past the 15% threshold the whole corpus is solved again and the result says so.

**Two marks.** A note with no link in or out stands in an orphan band along the top: 17 in this repository, 32 in the cockpit's, 131 in Your Trainer. A link that alone holds a cluster of three or more notes on is found by Tarjan's algorithm and drawn in its own colour; none of the three corpora has one.

**The numbers.** Solving took 133 ms here, 1.07 s for the cockpit's 1,549 notes and 2.6 s for Your Trainer's 2,714, once; adding one note took 2, 17 and 50 ms. Written in [[FEAT-0001-The-Corpus-Has-An-Inside]].
