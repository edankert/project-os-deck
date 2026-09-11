---
type: "[[issue]]"
id: ISS-0066
aliases: ["ISS-0066"]
title: "A pane’s header shows through the pane lying on top of it in Glass, because every header is drawn above every body"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin, evaluating Deck, 2026-09-11"]
severity: medium
component: renderer
parent: ""
related: ["[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[FEAT-0014-The-Hands]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A pane's header shows through the pane lying on top of it

## Problem

**In Glass, a note's title bar is never hidden by the note lying on top of it.** Edwin, evaluating Deck on 2026-09-11: "The title areas of the notes in the glass view are never hidden under the body of another note." Two overlapping panes look wrong: the lower pane's header floats over the upper pane's text.

The cause is in `paintPane()` in `desktop/src/renderer/glass.ts`. It stacks each pane's header and body separately, every header at `z-index` 3500 and up and every body at 3000 and up, so any header is above any body. That was built for [[TASK-0054-A-Held-Note-Is-A-Pane]]'s line "in a stack of any depth every header is visible and clickable", read as a rule about drawing order. DES-0002's rule was narrower: a pane dropped over another's header snaps below it, so a stack is laid down with its headers showing.

## Fix

Stack whole panes: a pane's `z-index` is its place in the desk's order, and the pane on top covers everything under it, header included. The snap on drop still keeps a stack's headers readable as it is laid down. A press anywhere on a pane, not only on its header, raises it, so a pane whose header is covered can still be brought forward. Amend TASK-0054's line.

## Acceptance

- [x] Where one pane lies over another's header, the header is hidden under the upper pane's body.
- [x] A press on a pane's body raises it.
- [x] A pane dropped on another's header still snaps below it.

## Fixed, 2026-09-11

`paintPane()` now gives each whole pane a `z-index` from its place in the desk's order, so the pane on top covers the panes under it, header included. A press anywhere on a pane's body brings it forward, as a press on its header already did. The stylesheet's comment on `.pane` says the new rule. [[TASK-0054-A-Held-Note-Is-A-Pane]]'s acceptance line is amended.

**Checked** in the Glass section of the smoke run, with a real pointer: after the lower of two stacked panes is raised, the point at the other pane's header shows the raised pane ("FEAT-0002 is drawn at FEAT-0008's header"); a press on the part of that other pane's body still showing raises it; and a pane dropped on a header still snaps below it. With the old layering put back, the first check failed ("FEAT-0008 is drawn at FEAT-0008's header"); with the body's press handler removed, the second failed.
