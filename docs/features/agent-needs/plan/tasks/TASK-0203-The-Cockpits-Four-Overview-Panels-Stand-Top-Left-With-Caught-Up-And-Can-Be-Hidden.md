---
type: "[[task]]"
id: TASK-0203
aliases: ["TASK-0203"]
title: "The cockpit's four overview panels stand top left on Deck's ring, Caught up writes through the shell, and Overview hides them and is remembered"
status: done
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

- [x] Since you last looked: the tickets changed since the last catch-up, by type, from `/api/cockpit/digest` and `/api/cockpit/watermark`, with Caught up.
- [x] Caught up posts `/api/cockpit/caught-up` with the digest's `at` from the main process over loopback ([[ADR-0003-Deck-Writes-Through-The-Shell]]); it is absent on the served page.
- [x] The record: each type's count with a bar of how far along it is, from `/api/cockpit/stats`.
- [x] The checks: tests passing, never run and active.
- [x] Waiting on a decision: designs and decisions still proposed or draft.
- [x] Overview in the header hides and shows the panels at any width; the choice is kept, and the Agents list takes their place when they are hidden. Deck's wheel draws no legend, so there is no "? Marks" to bring one back.
- [x] The read routes Deck needs are added to the host's forwardable list only where the sidecar serves them to any caller; loopback-only routes are read by the main process and never forwarded.
- [x] The suite checks each panel's numbers on both fixtures and the hidden layout.

## Notes

DES-0006 said Caught up was a write ADR-0003 did not cover yet. Read again on 2026-10-22, ADR-0003's decision covers it: a write from the main process to an existing guarded sidecar endpoint over loopback, never through the served host. Its verb registry clause is about note verbs, which Caught up is not. If Edwin reads it otherwise, a line in ADR-0003's decision record settles it.

## What was built (2026-10-22)

- `desktop/src/shared/overview-cockpit.ts` lays the four panels out as one box, top left on the wheel. "Since you last looked" counts the tickets the cockpit's digest lists as changed, each once, by type, with Caught up. The record shows each type's count with a bar of how far along it is. The checks show tests passing, failing, never run (`ready`) and active. "Waiting on a decision" lists designs and decisions still proposed or draft: the count, and the first two. The record, the checks and the decisions are counted from the model, as DES-0006's page counts them.
- The digest is read through Deck's host. `/api/cockpit/digest` is now forwardable, since the sidecar gives it to any caller. It is read again every minute and after Caught up.
- Caught up is offered in the shell only. The main process posts `/api/cockpit/caught-up` with the digest's own time, through `postCaughtUp` in the write client; the window's text must look like a time.
- ◫ Overview, beside By phase, hides and shows the panels. When they are hidden the Agents list moves up into their place. A selected ticket's card or an open session also takes their place. **A reading recorded:** the choice is kept the way the grouping is, in the window's own storage, which outlives a restart; DES-0006 said the browser keeps it.
- [[TST-0106]] checks each panel's numbers on both fixtures, the digest, the hidden layout and Caught up; three guards were each broken in turn, and each break failed a check.
- **The window run for FEAT-0034**, moved here from [[TASK-0204]]: `bash tools/scripts/walk-in-a-box.sh agent-needs` runs on Deck itself in the container, with the suite's scripted agent. Its 12 checks all held: the four panels; Caught up emptying the cockpit's own digest; ◫ Overview hiding them, the list moving up, the choice surviving a reload; a Deck request first in Needs you with the count one higher, answered there with Approve, so that the agent went on; and the git line last. Caught up wrote only to the container's own `.cockpit/` folder. The pictures showed tile words running together and a cut-off row, both fixed after the run.
