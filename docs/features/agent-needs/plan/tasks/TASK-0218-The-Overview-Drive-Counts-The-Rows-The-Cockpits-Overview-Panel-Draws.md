---
type: "[[task]]"
id: TASK-0218
aliases: ["TASK-0218"]
title: "The overview drive counts the rows the cockpit's overview panel draws, so its first screen passes again"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["The overview drive in the container on 2026-10-23, run for FEAT-0036: 'wheel: every mark in the scene is in the window, 489 !== 487'"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0203]]", "[[TST-0093]]", "[[TASK-0216]]"]
tests: ["[[TST-0093]]"]
---

# The overview drive counts the cockpit panel's rows

**The overview drive (TST-0093's window run) stopped on its first screen: the window showed 489 ticket marks and the scene, as the drive counts it, 487.** The two it missed are the "waiting on a decision" rows of the cockpit's overview panel.

## Cause

[[TASK-0203]] added the cockpit's four overview panels to the wheel on 2026-10-22. Their last panel draws up to two tickets waiting on a decision as rows, each a `data-ticket` element. The drive counts a scene's tickets by walking its nodes, and it knows the marks, the rows panels and Needs you, but not this panel. So the count in the window was right and the drive's own count was short. Found when the drive was run for [[TASK-0216]]; Deck's code did not change.

## Definition of Done
- [x] The drive counts a cockpit panel's waiting rows, and the overview drive passes in the container.

## Verification

- 2026-10-23, in the container on a copy of the notes: the wheel showed 491 marks and the drive counted 491, and every screen after it matched too (the phase 187, and so on). The drive then stopped at the served page, on an expectation [[TASK-0216]] changes, and passed once that was changed.
