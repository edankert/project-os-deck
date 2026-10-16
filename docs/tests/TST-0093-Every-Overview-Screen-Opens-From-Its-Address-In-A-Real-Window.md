---
type: "[[test]]"
id: TST-0093
aliases: ["TST-0093"]
title: "Every overview screen opens from its address in a real Deck window on Deck and on your-trainer, draws as many ticket marks as its scene, follows a click and Escape, and leaves the workspace unchanged"
status: passing
owner: system:claude
created: 2026-10-14
updated: 2026-10-16
source: ["[[TASK-0131-Run-The-Overview-Screens-In-A-Window-Once]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: e2e
entrypoint: "desktop/scripts/overview-drive.cjs"
command: ""
last_verified: 2026-10-16
covers: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
issues: []
tasks: ["[[TASK-0131-Run-The-Overview-Screens-In-A-Window-Once]]", "[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0148]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0158]]", "[[TASK-0159]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0005-Overview]]", "[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
area: "overview"
---

# Every overview screen opens from its address in a real window

## Purpose

The node suites check each scene as data. This run checks that a real Deck window draws them: the address parses, the layer shows over the field, every mark is on screen, a click goes where the scene says, Escape goes back, L opens the list twin, the served page shows the wheel without writes, and nothing in the workspace changes. It opens windows, so it is not a `command:` the pre-push hook runs; it is run on request, once per feature, and its result is recorded here.

## Procedure

From `desktop/`, after `npm run build`:

1. `npx electron . --drive scripts/overview-drive.cjs --drive-out dist/overview-drive-deck`
2. `npx electron . --drive scripts/overview-drive.cjs --drive-out dist/overview-drive-yt --workspace <path to your-trainer>`

## Expected results

- Each of S1 to S7 opens from its address, and the number of ticket marks in the window equals the number in its scene.
- A click on the wheel opens a phase or a ticket, Escape goes back one screen, and L opens the list twin with as many rows as the scene's list.
- The served page follows the Mac's view rather than opening on the wheel; pressing its Deck name opens the wheel, which draws its tickets and offers no enabled control.
- The workspace's `git status` is the same before and after.
- Added 2026-10-15 (second revision), not yet run: the wheel draws as many particles as its scene and a press on a particle and on a segment opens the ticket and the phase; on S1, S2, S4 and S6 a middle-button drag turns the plane, the scroll wheel zooms, double-click resets, and a press afterwards still opens the screen the scene says; a needs-you ticket's banner button opens its target; S7 shows the feature's text panel and a five-segment arch.
- Added 2026-10-15, not yet run: after a phase, a ticket and a linked ticket are opened, back returns through them in order and forward returns once; the wheel opens in each of its two colourings from its address.

## Results

**2026-10-16, fourth run, passing on both workspaces**, on the towers, at `eb3b7ed` with the driver's ticket choice fixed (below), at Edwin's word ("go ahead and run the window run TST-0093"). Every screen opened from its address with as many marks in the window as in its scene (Deck's wheel 406, your-trainer's 2,761). The wheel and the phase were drawn in 3D, the phase brought close (PHASE-0002, PHASE-021), and its list began with what needs you, the other towers folded. A middle-button drag to the right turned the ring the hand's way; the scroll wheel zoomed; From above and From the side moved the camera; Home, 0 and Escape brought it back, and Home hid; a Shift-drag stopped at the ring's edge. A press on a ticket in plain sight opened it; a red cap opened its ticket (FEAT-0016's on Deck, FEAT-0077's on your-trainer); the core opened re-phasing; a plinth brought its phase close and Escape returned to the ring. L opened the list twin with every row. The served page, as a tablet loads it, drew the towers in 3D with no enabled control. Both workspaces' `git status` was the same before and after. The first run on your-trainer stopped at the driver's own choice: it aimed at the next ticket, TASK-0750, which another cube stands in front of from where the camera starts; the driver now aims at the next ticket only when it is in plain sight, else at the first ticket that is. Pictures are in `desktop/dist/overview-drive-deck/` and `-yt/`; three are in DES-0005.


**2026-10-14, third run, passing on both workspaces** at commit `9db237e`, after Codex's review made the run assert where Escape lands, that the served page offers no enabled control, and that every screen is registered. Every screen's marks matched again (Deck's wheel now 377, your-trainer's 2,747; your-trainer's FEAT-0051 draws its 202 neighbours on the new rings). Escape from a ticket returned to its phase, L opened the list twin with every row, the served page showed every ticket with no enabled control, and neither workspace changed.

**2026-10-14, passing on both workspaces**, after commit `99eeeab`.

| Screen | Deck: marks in scene = in window | your-trainer: marks in scene = in window |
| --- | --- | --- |
| S1 wheel | 374 = 374 | 2,747 = 2,747 |
| S2 phase | 139 = 139 (PHASE-0001) | 9 = 9 (PHASE-015) |
| S3 ticket | 83 = 83 (TST-0045) | 203 = 203 (FEAT-0051) |
| S4 re-phase | 1 = 1 | 987 = 987 |
| S5 design | 1 = 1 (DES-0001) | 1 = 1 (DES-0006) |
| S6 acceptance test | 0 = 0 (no release) | 1,388 = 1,388 (REL-0017) |
| S7 ticket acceptance | 1 = 1 (FEAT-0018) | 1 = 1 (FEAT-0118) |

A click on the wheel opened a ticket and Escape returned to its phase on both. L opened the list twin with every row of the scene (152 and 11). The served page opened on the wheel with every ticket drawn (374 and 2,747) and no enabled control. `drive.json` records `workspaceUnchanged: true` for both runs, which took 15 and 21 seconds.

**The first run, earlier the same day, failed**, and it found two defects the node suites could not see. Glass's collection panel, cards and compass were drawn over the wheel, and Escape and L did nothing after a click on the picture, because the keyboard was on the body. Both were fixed in `99eeeab` before the passing run.
