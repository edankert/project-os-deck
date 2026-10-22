---
type: "[[task]]"
id: TASK-0203
aliases: ["TASK-0203"]
title: "The cockpit's four overview panels stand top left on Deck's ring, Caught up writes through the shell, and Overview hides them and is remembered"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: M
due: ""
depends: ["[[TASK-0202]]"]
blocks: []
related: ["[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
tests: ["[[TST-0106]]"]
---

# The cockpit's overview panels, with Caught up and the Overview toggle

**Top left, in place of the legend, stand the cockpit's four overview panels as pictures; Overview in the header hides them, and the Agents list moves up into their place.**

## Definition of Done

- [ ] Since you last looked: the tickets changed since the last catch-up, by type, from `/api/cockpit/digest` and `/api/cockpit/watermark`, with Caught up.
- [ ] Caught up posts `/api/cockpit/caught-up` with the digest's `at` from the main process over loopback ([[ADR-0003-Deck-Writes-Through-The-Shell]]); it is absent on the served page.
- [ ] The record: each type's count with a bar of how far along it is, from `/api/cockpit/stats`.
- [ ] The checks: tests passing, never run and active.
- [ ] Waiting on a decision: designs and decisions still proposed or draft.
- [ ] Overview in the header hides and shows the panels at any width; the choice is kept in Deck's store, and the Agents list takes their place when they are hidden. "? Marks" brings the legend back.
- [ ] The read routes Deck needs are added to the host's forwardable list only where the sidecar serves them to any caller; loopback-only routes are read by the main process and never forwarded.
- [ ] The suite checks each panel's numbers on both fixtures and the hidden layout.

## Notes

DES-0006 said Caught up was a write ADR-0003 did not cover yet. Read again on 2026-10-22, ADR-0003's decision covers it: a write from the main process to an existing guarded sidecar endpoint over loopback, never through the served host. Its verb registry clause is about note verbs, which Caught up is not. If Edwin reads it otherwise, a line in ADR-0003's decision record settles it.
