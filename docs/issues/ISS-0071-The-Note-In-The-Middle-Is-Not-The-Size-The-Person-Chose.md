---
type: "[[issue]]"
id: ISS-0071
aliases: ["ISS-0071"]
title: "The note in the middle is sized by whatever leaves room for the ring rather than by the person, and it jumps to 320 by 240 the moment it is dragged, because focusLayout searches for a pane size and ignores the one the desk record holds"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12, running Deck: 'Then when moving the note out of the middle the main note size changes (this should never happen, move should not change the size)'; 'The main thing is that note is selected so this means that this is the user's main note, the user makes a decision on how big the note should be and this should be respected (note: new notes opened should open in that size)'"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The note in the middle is not the size the person chose

## Problem

**The pane in the middle takes whatever size leaves room for the ring, and the size a person set by dragging its corner is not read at all.** [[TASK-0054-A-Held-Note-Is-A-Pane]] built resizing and stores the width and height on the desk record, and the middle ignores that record. Worse, the two sizes swap visibly: drag the note in the middle and it snaps from as much as 640 by 480 down to its stored size, or to 320 by 240 when it has none. Edwin's rule is that the opened note is the person's main note, its size is their decision, and a move is not a resize.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "Then when moving the note out of the middle the main note size changes (this should never happen, move should not change the size)"
> "The main thing is that note is selected so this means that this is the user's main note, the user makes a decision on how big the note should be and this should be respected (note: new notes opened should open in that size)"

## Cause

`focusLayout` in `desktop/src/shared/focus-ring.ts` takes the field size, the dock width and how many neighbours there are, and takes **no pane size at all**. It searches downward from `FOCUS_MAX` (640 by 480) in twenty steps toward `FOCUS_MIN` (280 by 160), stopping at the first size whose ring holds `ENOUGH` (six) places. The comment states the trade openly — "A readable note matters more than a full ring" — but the size it lands on is a function of the neighbour count, not of anything a person did.

`paintPane` in `desktop/src/renderer/glass.ts` then writes `focusRect` onto the pane while it is the focus, and `paneRect(deskCard)` otherwise, and `paneRect` reads `card.w ?? PANE_DEFAULT_WIDTH` (320) and `card.h ?? PANE_DEFAULT_HEIGHT` (240). So the two paths use different sizes for the same pane and the change shows the instant the focus ends. The drag handler ends it on the first pointer move (`if (this.focusId() === noteId) this.leaveFocus();`), which is why the size changes as soon as the note is moved.

There is also no such thing as a remembered reading size. Every pane opens at 320 by 240 unless that particular note was resized before, so "new notes opened should open in that size" has nothing to read.

## Repro

1. `cd desktop && npm start`, Glass surface, click a note with several neighbours. It settles in the middle at 640 by 480 or a step below.
2. Drag the corner to make it smaller, say 400 wide. Click another note, then click the first one again: it is back at the ring's size.
3. With a note in the middle, drag its header a few pixels. It snaps to its stored size, or to 320 by 240.

## Expected

The person's size wins. The note in the middle is drawn at the size the desk record holds for it; a note with no stored size opens at a remembered reading size, which is whatever size the person last gave an opened note; the ring is laid out **around** that size rather than choosing it; and dragging changes only where the pane is.

## Actual

The size is a result of the ring's search, the stored size is unread, and a move is a resize.

## What has to change, and the one real trade

`focusLayout` gains the pane size as an argument and stops searching for it. The search it does today is not wasted work, though: it is what guarantees the places fit. Turned around, the same loop should widen the ring's curve (the `grow` parameter, already there and already capped at 2) and then, when even that is not enough, cut the number of places and raise "+N more". So the order of sacrifice inverts: today the note shrinks to keep six neighbours, and afterwards the ring shows fewer neighbours to keep the note the size it was asked to be.

Two consequences to decide on, both Edwin's:

- **A pane larger than the field leaves no ring at all.** A person who sizes a note to most of the window gets the note and "+N more" and nothing else. That is the correct reading of "the user's decision should be respected", and it should be said out loud rather than discovered.
- **Where the remembered reading size lives.** It is a per-window preference, like the yaw and the zoom, not part of the address, and there is an argument for putting it in the store so a second window opens notes the same way. The cheap version is a field on the Glass surface object, lost on restart; the honest one is a store setting. Recommend the store setting, written when a person resizes the note in the middle.

## Evidence

- `desktop/src/shared/focus-ring.ts`: `focusLayout(field, dock, wanted, startAngle, avoid)` — no pane size in the signature; `FOCUS_MAX` 640 by 480, `FOCUS_MIN` 280 by 160, `ENOUGH = 6`, and the twenty-step search.
- `desktop/src/renderer/glass.ts`, `paintPane`: `focusRect` for the focus, `paneRect(deskCard)` for every other pane; `paneRect` reads `card.w ?? PANE_DEFAULT_WIDTH`.
- `desktop/src/shared/panes.ts`: `PANE_DEFAULT_WIDTH = 320`, `PANE_DEFAULT_HEIGHT = 240`.
- `desktop/src/renderer/glass.ts`, the pane header drag: `if (this.focusId() === noteId) this.leaveFocus();` on the first move past the click slop.

## Sibling search

No sibling found (searched `docs/issues/` for "pane", "size", "resize", "focus"). [[TASK-0054-A-Held-Note-Is-A-Pane]] built the resize this issue says is ignored; it is a task, not an issue.

## Risk scan

No trigger applies for the layout change. The remembered reading size, if it goes in the store, adds a field to the persisted state: it must read as absent from every state file written before it, the way `deskCards` did for [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]].

## Next Actions

- [ ] **Edwin confirms that a large note may leave no room for the ring, and says whether the remembered reading size belongs in the store.** This waits on him.
- [ ] Then tasks under [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]: `focusLayout` takes the pane size (pure, with its suite), the renderer passes the stored size, and a smoke check drags the note in the middle and fails if its width or height changes by a pixel.
