---
type: "[[task]]"
id: TASK-0179
title: "Designs stand on their own tickets, not on an outer ring: on the towers page a picture stands at its ticket's tower, so the nearer the work it shows, the nearer the work it stands"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'the current design items on the outside of the ring feel wrong to me, the further out should be further away from what I am working on, can we come up with a better solution for the designs?'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0177]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# Designs stand on their own tickets, not on an outer ring

**On the towers page, a picture now stands at the tower or tile of the ticket it belongs to, instead of on a ring outside everything.** Edwin found the outer ring wrong: on the towers, distance from the middle and the front means distance from the work, so pictures of the work in hand stood furthest from it. [[TASK-0177]] put them there.

## What the page draws

- **Each picture stands just above its ticket**: over the tower it is a floor of, over its tile, over its finished phase's block on the shelf, or over the core. Pictures of one ticket stand side by side.
- **Nearer the work, larger.** A picture of the feature in focus is largest, one in the focus phase next, one in another unfinished phase smaller, and one on the shelf smallest and faded. So the rule that further out is further from the work holds for pictures too.
- **Which pictures**: the same as before, the newest eighteen, at most three for one ticket, tied to tickets by the same rule.
- **A selected ticket shows its pictures in the right pane**, up to twelve, newest first, under its first paragraph, whether or not they are among the eighteen.
- The posts and the outer ring go.

## Definition of Done

- [x] The page places each picture at its ticket and sizes it by its nearness to the work, on both workspaces and both groupings.
- [x] The selected ticket's pane lists its pictures; the data holds each ticket's pictures for that.
- [x] TST-0094 checks the nearness each picture is sized by, against where its ticket stands. Where on the screen it is anchored is drawn by the page and checked in hidden-window drives.
- [x] Pictures in DES-0005 replace the evidence ring's.
- [x] `cd desktop && npm test` passes; reviewed in two rounds by two independent Claude reviewers.

## Verification

Each picture's anchor is its ticket's place on the ring: the top of its feature's tower, its tile, its block on the shelf or its tile in the core; pictures of one ticket stand side by side. The data gives each picture its nearness grouped by phase (`near`: feature, phase, ring, shelf, core) and by feature (`nearF`), and each ticket its pictures (`pictures`, up to twelve, newest first) for the pane. Found on the way: the towers read a feature's `designs:`, but every note writes `design:`, so no design ever joined its feature's tower; now `design:` is read, and a design with no parent stands in the lowest-numbered feature its own `implements:` names. On Deck, DES-0005's three pictures now stand over FEAT-0025's tower in Overview (`phase`), DES-0003's over Glass, DES-0004's over the core. TST-0094 checks every picture's nearness both ways, that its ticket's pane lists it, the pane's limit and order, and the `design:` and `implements:` rules on small notes; three breaks were each caught (the focus phase not told apart, `design:` not read, the pane cut to one picture). It passes in a clone without history and without your-trainer.

## Review

Round one, 2026-10-22, two independent Claude reviewers (`model:claude-opus-5-5`) on `708af83`. The data reviewer asked for changes; every tower move the `design:` key made was right (four on each workspace, no other ticket moved), but:

- **The design of the work in hand still did not stand nearest it.** DES-0005 is the design of FEAT-0028, the feature in focus, yet it stood at FEAT-0025, the lowest-numbered feature naming it, and was drawn a size smaller. A design now stands with the feature in focus when that feature names it, else with the lowest-numbered that does; a feature naming it (`design:` or another list) wins over the design's own `implements:`, which is used only when no feature names it. DES-0005 now stands at FEAT-0028, drawn largest; your-trainer's DES-0005 at FEAT-0134, the feature that names it, not FEAT-0078 from its `implements:`.
- **On CI, TST-0094 checked no picture at all**, since a shallow clone has no picture history. Where the fixture's commit is present, the suite now requires Deck to have pictures, and requires DES-0005's to be drawn largest both ways, so the largest size is exercised; on a shallow clone the picture checks have nothing to check, which is now said in the test.
- **Only a design is placed by its own `implements:`**, and the test now says so; the header comment and this note's wording (the pane shows up to twelve, the test checks nearness, not the anchor) were corrected.

The page reviewer of round one also asked for changes. Pictures stood at the right places, and a phase brought close showed only its own, but:

- **On your-trainer, distance from the camera outweighed nearness**, so the shelf's pictures (finished work) came out larger than pictures of work in hand: the same inversion Edwin complained about, in size instead of place. Distance now changes a picture's size only a little. Measured on screen afterwards: shelf 53 to 59 px, unfinished work 66 to 82 px, the core 57 to 67 px, grouped either way and from the side; on Deck the focus feature's design 132 px.
- **Nothing tested where a picture stands.** The data now says what each picture stands on (its feature's tower, its own tile, its shelf block, or the core), and TST-0094 checks that against where its ticket lies. Where on the screen the page anchors it, and the phase-close filter, are drawn by the page and were checked in hidden-window drives; the node suite cannot run the page.
- **The pane said "Pictures · 12" for a ticket with 20.** It now says "the newest 12 of 20". Pictures of one ticket stand a little further apart. That pictures can cover a phase's name, and that the core's pictures are faint over the core's tiles, is left as it is.

Round two, 2026-10-22, two fresh independent Claude reviewers on `dc09b75`. Page: approve; sizes follow nearness in every view on both workspaces and both groupings (shelf at most 59 px against unfinished work from 66 px), DES-0005 stands over FEAT-0028 at 132 px, the pane counts "the newest 12 of 16", and nothing regressed. Its note that the size formula could still invert in a view it could not reach was closed after it: distance now changes a size only between 0.9 and 1.1, so the largest shelf picture stays under the smallest ring one. That pictures of neighbouring tickets can overlap is left as it is. Data: changes requested; the rule held on both corpora, but the new check of DES-0005's tower failed in a shallow clone (CI's case, which reads today's focus), and the lowest-numbered rule and the order of `design:` over `implements:` were untested. Both fixed in `3892418`: the choice is `designFeature`, tested on lists of its own (the lowest-numbered, the focus, naming over implements, a task's feature, a name that is no feature), the check follows whichever focus the run reads, and both suites pass in a shallow clone. A gate runs two rounds at most; the verdicts stay the reviewers'.
