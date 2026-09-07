---
type: "[[issue]]"
id: ISS-0013
aliases: ["ISS-0013"]
title: "The remove control still appears on a card in the Needs-you strip and now silently does nothing, which is not the behaviour ISS-0007 recorded as fixed"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review for the PHASE-0001 close-out, 2026-09-07 ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]])"]
severity: low
component: renderer
parent: ""
related: ["[[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# The remove control is shown in the Needs-you strip and does nothing

## Problem

**Hovering a card in a popped-out Needs-you window still shows the × , and clicking it now has no effect at all.** [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] recorded this as fixed with two halves: "The remove control is hidden in the strip and refuses there in any case." Only the refusal was built. The control is still drawn, so a person is offered an action that quietly does nothing — a different wrong behaviour from the one filed, not the absence of one.

The comment at `desktop/src/renderer/renderer.ts:76` repeats the claim ("The control is hidden there too"), so the code asserts something the stylesheet does not do.

## Repro

Pop out a Needs-you panel, hover a card, click the ×. Nothing happens and the card stays.

## Expected

The × is not drawn on a card in the strip.

## Actual

It is drawn, it responds to hover, and clicking it does nothing.

## Evidence

- `grep -n "remove" desktop/src/renderer/deck.css` returns three rules — `.card .remove`, `.card:hover .remove { opacity: 1; }` and `.card .remove:hover` — and none of them hides the control. There is no `body[data-panel="needs-you"]` or `.desk.flow` rule for `.card .remove`, in the source or in the built `dist/web/deck.css`.
- `desktop/src/renderer/renderer.ts:76` — the comment claiming the control is hidden.
- [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] — the Resolution section claiming both halves.

## Next Actions

- [ ] Add the hiding rule, and correct the claim in [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] and the comment at `renderer.ts:76`.
