---
type: "[[change]]"
id: CHG-20261015-The-Overview-Becomes-A-Constellation-In-3D
title: "The overview becomes a constellation in 3D: tickets as particles, a camera that turns and zooms, the gate as an arch, S7 with its text, and needs-you that says what to do"
status: merged
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'I actually like the re-phasing better than the normal wheel ... can we make the wheels (and the other lists/trapeziums) a little more 3d, and allow to move them using the middle mouse button and zoom in / out? ... the accept / send back option for a feature should show the feature text ... when selecting an item which needs you, the user needs to be told what he needs to do???'", "Edwin 2026-10-15: 'go ahead with all the recommendations as suggested but do not add the extra text for the feature boxes instead redesign the feature boxes'", "Edwin 2026-10-15: 'codex is no longer working, only use claude from now on.'"]
commit: "13187f7, 3bb20e1, a4f2499, eb93a0d, b13835b, d218cab, 65e3952, 20c4f35"
pr: ""
impacts: []
platforms: []
issues: []
features: ["[[FEAT-0025]]", "[[FEAT-0026]]", "[[FEAT-0027]]", "[[FEAT-0028]]", "[[FEAT-0029]]"]
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: "2026-10-15"
review_verdict: "changes-requested"
review_response: "Two rounds by two independent Claude reviewers in Codex's place. Round one asked for changes on both sides; every finding was fixed in 20c4f35. Round two: reviewer B approved; reviewer A's two small points were fixed after the round. The record is in FEAT-0025 to FEAT-0029, 'Review of the second revision'."
related: ["[[TASK-0153]]", "[[TASK-0154]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0157]]", "[[TASK-0158]]", "[[TASK-0159]]", "[[TASK-0160]]", "[[TASK-0161]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[CHG-20261015-The-Overview-Shows-Tickets-As-The-Cockpit-Does]]"]
---

# The overview becomes a constellation in 3D

## Summary

**The wheel is now drawn the way re-phasing is, every screen stands in 3D, and a ticket that needs you says what to do.** Edwin liked the re-phase screen better than the ring wheel, asked for more depth with the middle mouse button and zoom, found the gate's five boxes wrong, and wanted the feature's text where he accepts it.

- **The constellation.** Each unfinished phase is a segment of the ring with its tickets fanned inward as particles in the cockpit's marks: done at the ring, open in front, what needs you glowing at the front, with a red count on the segment. Pointing at a ticket draws wires to every ticket it links to. The core is a cloud of the project-wide and unplaced tickets round the no-phase button.
- **3D, turn, pan and zoom.** The ring screens lean back, a phase a little, the screens of text start flat. Middle-button drag turns and tilts, Shift pans, the scroll wheel or a pinch zooms toward the pointer, double-click or 0 resets, + and − zoom.
- **The gate as an arch.** Requirements, tasks, reviews, automated tests and acceptance tests, left to right, each a gauge of cells filled from its evidence, its count outside and its name beyond. What each part counts is in its callout. A part Deck cannot read is dashed and says "not reported".
- **S7 shows the feature's text** on the left, with the arch and Accept and Send back on the right.
- **Needs you says what to do.** A ticket carries the cockpit's reason and one sentence: decide at triage, review, run a test never run, fix a failure, or finish what it waits on. S3 shows it as a red banner with a button to where you act, or at triage the sidecar's own Accept, Defer and Decline; S2's rows and every callout say it too.
- **A real 3D design to judge**, `docs/designs/DES-0005-time-columns.html`: each phase a column of tickets rising by creation date, in three.js on that page only. DES-0005 asks Edwin whether to build it into Deck.

## What changed for other code

- **`Ticket.needs`** is new in the overview model: the reason, the sentence, and where to act as address parts or the sidecar's verbs. Both fixtures are recaptured, Deck from a clean checkout of `65c6397`.
- **Writes from S3 and S5 send the note's modification time as the screen was drawn**, read from Deck's index, and refuse when Deck cannot read it. S5's decide had never sent one: the sidecar's note payload carries no time.
- **`gateChips` is gone**; the gate is `gateArch` in `desktop/src/shared/overview-gate.ts`.
- **The overview layer has a camera** (`desktop/src/shared/overview-camera.ts`); the wheel event over the overview no longer reaches Glass.
- **Codex stopped running on 2026-10-15** and Edwin asked for Claude only; its three tasks were built by Claude, and two independent Claude reviewers replaced its review.

## Verification

789 node tests pass. The window run, [[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]], passed on Deck and your-trainer at `20c4f35`: the constellation's particles and segments open their screens, the camera turns, pans, zooms and resets with a ticket still pressable on the tilt, the needs-you banner and its button are there, and S7 shows the feature's text and the five parts of the arch. Edwin's acceptance tests TST-0091, TST-0092 and TST-0100 are not yet run.
