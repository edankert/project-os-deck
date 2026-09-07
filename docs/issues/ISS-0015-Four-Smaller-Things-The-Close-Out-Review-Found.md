---
type: "[[issue]]"
id: ISS-0015
aliases: ["ISS-0015"]
title: "Four smaller things the close-out review found: a check asserting on a message the code no longer emits, two satellites sharing one saved rectangle, a quadratic row lookup, and a count that counts a note twice"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review for the PHASE-0001 close-out, 2026-09-07 ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]])"]
severity: low
component: renderer
parent: ""
related: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# Four smaller things the close-out review found

## Problem

Four items too small to file separately, none of which a person would call a bug on sight, and all of which are wrong.

**One: a check asserts on a message the code stopped emitting.** `desktop/tests/sidecar-retry.test.mjs:174` asserts `isPortCollision(new Error('the sidecar did not answer within 15s')) === false`. The readiness timeout is 45 seconds now, so the check passes against a string nothing produces.

**Two: two popped-out windows carrying the same panel share one saved rectangle.** `boundsKey(role, panel)` is keyed on the panel type and not on what the panel holds, so two `panel=desk` windows on different desks stack on top of each other after a restart.

**Three: a row's index is recovered by searching for it.** `NavigatorList.paintRow` calls `this.rows.indexOf(row)` when the caller already has the index, which is quadratic in the number of rows. Carried over from the review of 2026-09-07 and still true.

**Four: the "N of M" count counts a note twice when the sidecar sends it twice.** A note that is both in Needs-you and under its phase is counted in both. Both sides of the ratio count the same way, so the number is consistent — it is simply not a count of distinct notes. Also carried over.

A fifth, from the same list: the navigator's click handler resolves `this.cards.get(row.card.noteId)` rather than using `row.card`, so a note that appears in two groups opens whichever model was painted last.

## Expected

The check asserts on a message the code emits; two desks get two rectangles; the index is passed rather than searched for; the count says what it counts.

## Actual

As described above.

## Evidence

- `desktop/tests/sidecar-retry.test.mjs:174`, and `READY_TIMEOUT_MS` in `desktop/src/main/sidecar.ts`.
- `boundsKey` in `desktop/src/main/window-book.ts`.
- `NavigatorList.paintRow` and `drawNavigator` in `desktop/src/renderer/`.

## Next Actions

- [ ] Groom: these are cheap and independent, and none of them blocks anything.
