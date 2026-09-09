---
type: "[[task]]"
id: TASK-0049
aliases: ["TASK-0049"]
title: "The actuator rows come from the sidecar, and one transition is wired end to end"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0013-The-First-Write]]"]
parent: "FEAT-0013"
effort: ""
due: ""
depends: ["TASK-0047", "TASK-0048"]
blocks: []
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[project-os-cockpit#REQ-0026]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# The actuator row and one transition

## Objective

Deck asks the sidecar which verbs a note allows and draws the rows it gets back. One of them, a status transition, is wired through the write channel so that picking it moves the note's status on disk.

## Detail

**The verb table is the sidecar's and Deck must not restate it.** `HUMAN_TRANSITIONS` in the cockpit's `note_writes.py` names five note types, one or two from-states each, and two or three verbs each. `GET /api/notes/actions` serves the legal rows for a given note, with `confirm`, `disabled`, `reason` and `endpoint` on each. [[project-os-cockpit#REQ-0026]] requires that no renderer restate that table, and Deck is a renderer. So Deck draws rows: the label the row carries, disabled when the row says disabled, showing the row's own reason when it does, and posting to the row's own endpoint.

**A transition is not a frontmatter edit.** The sidecar appends a decision callout to the note's body as well as changing the status. Deck neither knows nor needs to know that; it posts to the endpoint the row named and re-reads the note.

**Confirmation is the row's decision too.** A row that says `confirm` gets a confirmation step; a row that does not, does not. Deck decides nothing about which verbs are dangerous.

**Adopting this row costs an adoption-table change.** `shell.reader.actuators` is `not yet` with the note "same verbs, same guards". It gains a reference to this feature when the work starts, and moves to `adopted` when the transition is walked.

## Acceptance

- The verbs shown on a note are exactly the rows `GET /api/notes/actions` returned for it, in the order returned.
- A disabled row is shown disabled with the reason the row carried, not hidden and not enabled.
- A row that asks for confirmation gets one; a row that does not is applied directly.
- No verb name, from-state or transition rule exists in Deck's code, asserted by a search of the built renderer against the cockpit's own table.
- Picking a transition moves the note's status in the file, and the change is visible in the cockpit.
- The rows are absent entirely on the served page, because `write` is false there.
- The sidecar's refusal of a transition is shown to the person as the sidecar worded it.

## Steps

- [ ] Read the actuator rows for the focused note through the existing read path.
- [ ] Draw the rows in the reader, honouring `disabled`, `reason` and `confirm`.
- [ ] Post the chosen row's endpoint through the write channel, with the actor from the store.
- [ ] Re-read the note after the write and redraw.
- [ ] Add the search that proves no verb table is in Deck.
- [ ] Extend [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]], and update the adoption table row.

## Notes

This is the smaller of the feature's two verbs and the better proof of the channel, because everything about it is decided by the sidecar. If a transition works, the channel works; the tick then tests the harder half, which is addressing a line inside a file.
