---
type: "[[issue]]"
id: ISS-0071
aliases: ["ISS-0071"]
title: "The note open in the middle of Glass ignores the size the person gave it, and changes size as soon as it is dragged"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-10-02
source: ["Edwin 2026-09-12, running Deck: 'Then when moving the note out of the middle the main note size changes (this should never happen, move should not change the size)'; 'The main thing is that note is selected so this means that this is the user's main note, the user makes a decision on how big the note should be and this should be respected (note: new notes opened should open in that size)'"]
reported_by: user:edwin
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[PHASE-0002-Glass]]", "[[TASK-0104]]", "[[DES-0003]]"]
tests: ["[[TST-0052]]", "[[TST-0045]]", "[[TST-0065]]", "[[TST-0051]]"]
---

# The opened note ignores the size the person gave it

## Problem

**The note open in the middle of Glass is drawn at whatever size leaves room for its neighbours, not at the size the person dragged it to.** [[TASK-0054-A-Held-Note-Is-A-Pane]] built resizing and stores the width and height on the desk record, and the middle ignores that record. Worse, the two sizes swap visibly: drag the note in the middle and it snaps from as much as 640 by 480 down to its stored size, or to 320 by 240 when it has none. Edwin's rule is that the opened note is the person's main note, its size is their decision, and a move is not a resize.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "Then when moving the note out of the middle the main note size changes (this should never happen, move should not change the size)"
> "The main thing is that note is selected so this means that this is the user's main note, the user makes a decision on how big the note should be and this should be respected (note: new notes opened should open in that size)"

## Fixed, 2026-10-02

**The note open in Glass is now drawn at the size the person gave it, and dragging it changes only where it is.** A note with a size of its own opens at that size. A note with none opens at the size last chosen on that view, and where nobody has chosen one, at 560 by 520. The corner, or Alt with an arrow on the header, is the only way a size changes. More neighbours make the arrangement round the note wider and never the note smaller. Built in `81d4632` (TASK-0104).

**The check that shows the defect gone** is in the `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]), which drags the document's header with a real pointer in a real window. In the pass of 2026-10-02 at `e86b2e4` it read: "Enter on its header makes ISS-0069 the focus again with its 14 neighbours, and the document is 560 by 520 to the pixel when opened, while dragged, after the drag, out of focus and in focus again (560x520, 560x520, 560x520, 560x520, 560x520)". It reads the drawn width and height at those five moments and requires all five to equal the view's size. If the defect came back, the size while dragged or out of focus would differ from the size in focus, by the snap to the stored size that this issue reports, and the check would print the five sizes and fail. An earlier check in the same part holds the pointer down mid-drag and requires the same width and height as before the press.

The second repro step, a resized note coming back at another size, is covered by three more checks in the same part, all passed:

- "dragging the corner 40 by 30 resizes the document in the store and on screen (560 by 520 to 600 by 550, drawn 600 by 550), leaves it where it was, and the view remembers that size".
- "the resized document is still the focus and its cards make room for it (13 seated, none over it), and the other document keeps its own size (560 by 520)".
- "PHASE-0002, opened from its row in the list, takes the size the corner last chose on this view (616 by 550…), while ISS-0069 keeps 616 by 550 and PHASE-0001 keeps 560 by 520". This is Edwin's "new notes opened should open in that size".

Two scripted walks checked the same in that pass. `focus-neighbourhood` found "dragged by its header the document moves and stays the focus, at the size it had" (560 by 520). `glass-collection` resized a note to 624 by 552 and found the next note opened in that window 624 by 552.

The rule itself is checked without a window by the `reading-size` suite ([[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]], 14 tests): which size wins, that a move changes no size, that a state file written before the view's size existed still loads, and that a small window changes what is drawn and never what is stored. The `focus-ring` suite checks that every neighbour gets a seat whatever size the document is, so the layout never needs the document smaller. Both ran inside `npm test`, 589 of 589, at `e86b2e4`.

The smoke run opens ISS-0069 where it used to open ISS-0070. Until this pass it had marked ISS-0070, this issue and ISS-0072 as notes that need somebody; all three are `fixed` now, and this pass was made with them fixed.

**Where the remembered size lives.** In the store, under `readingSizes`, one size for each view of each workspace. Every window reads that store.

**How the frame was built, where it differs from the sketch below.** Edwin chose "turning moves the note and the whole ring", and that is what happens: a turn carries the document and its cards together, dims them, and past the edge of sight stops drawing them. The smoke run checks each of those. The sketch under "The frame the ring is laid out in" made every seat a bearing of its own and a drag a turn plus a height change. What was built is one desk at one bearing: the document and the cards round it have places on that desk in pixels, and a drag changes the document's stored left and top.

What is not shown:

- Nobody has walked [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]], and the ledger holds no verdict for it.
- No check has compared the size of a note opened in a second window with the size chosen on that view. The last box under "Next Actions" says what the one check that looks at a second window saw.
- No check and neither suite was broken on purpose to see it fail.

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

- **A pane larger than the field leaves no ring at all.** A person who sizes a note to most of the window gets the note and "+N more" and nothing else. That is the correct reading of "the user's decision should be respected", and it should be said out loud rather than discovered. **Answered 2026-09-12, and answered differently:** Edwin accepted the consequence and then removed its cause — the ring is no longer laid out inside the visible window, so a large note pushes its neighbours off-screen instead of pushing them out of the ring. See below.
- **Where the remembered reading size lives.** The 2026-10-01 design proposes a persisted per-view desk preference in the existing store. A note's saved size wins, followed by that preference and then the calibrated first-use default. Explicit resize updates the note and preference; movement and temporary narrow layouts do not. TASK-0104 owns implementation and compatibility checks; camera persistence is unchanged.

## Evidence

- `desktop/src/shared/focus-ring.ts`: `focusLayout(field, dock, wanted, startAngle, avoid)` — no pane size in the signature; `FOCUS_MAX` 640 by 480, `FOCUS_MIN` 280 by 160, `ENOUGH = 6`, and the twenty-step search.
- `desktop/src/renderer/glass.ts`, `paintPane`: `focusRect` for the focus, `paneRect(deskCard)` for every other pane; `paneRect` reads `card.w ?? PANE_DEFAULT_WIDTH`.
- `desktop/src/shared/panes.ts`: `PANE_DEFAULT_WIDTH = 320`, `PANE_DEFAULT_HEIGHT = 240`.
- `desktop/src/renderer/glass.ts`, the pane header drag: `if (this.focusId() === noteId) this.leaveFocus();` on the first move past the click slop.

## Sibling search

No sibling found (searched `docs/issues/` for "pane", "size", "resize", "focus"). [[TASK-0054-A-Held-Note-Is-A-Pane]] built the resize this issue says is ignored; it is a task, not an issue.

## Risk scan

No trigger applies for the layout change. The remembered reading size, if it goes in the store, adds a field to the persisted state: it must read as absent from every state file written before it, the way `deskCards` did for [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]].

## Implementation ownership

[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] built the repair under FEAT-0017, together with ISS-0070 and ISS-0072. "Fixed, 2026-10-02" above says what shows it.

## Next Actions

- [x] **Edwin accepted the consequences, 2026-09-12, and changed the frame the ring is laid out in.** Recorded below.
- [x] **Settled 2026-09-12, Edwin: "turning moves the note and the whole ring" — option 1.** The pane is anchored to a bearing on the cylinder and drawn flat, at the person's size, with no perspective.
- [x] Then tasks under [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]: the layout takes the document's size and lays out beyond the viewport (pure, with its suite), the renderer passes the stored size, and a smoke check drags the note and fails if its width or height changes by a pixel. Done as TASK-0104. `seatsAround` in `desktop/src/shared/focus-ring.ts` replaced `focusLayout`; its suite is `focus-ring`; the smoke check is quoted under "Fixed, 2026-10-02" and passed at `e86b2e4`.
- [x] Implement DES-0003's proposed persisted per-view reading-size preference in TASK-0104, and verify it for older state and narrow-window restoration. Shown by the `reading-size` suite, by the `glass-desktop` walk's check "made wide again, each document is at the size it had before the window was narrow", and by the smoke run's corner checks. This box also named another window; that part is the next box.
- [ ] Verify the view's size in another window on the same view.
  Missing: a check that compares the two sizes. The walk `glass-collection` has a check for this, and in the pass at `e86b2e4` it passed without making the comparison. It resized a note to 624 by 552 in the application's window, and the next note opened there was 624 by 552. It then opened a note on the served page, which is a second window on the same view with no bridge to the application. The check compares that note's size with the chosen size only when the served page's field can hold the chosen size. The field there was 772 by 446, shorter than 552, so nothing was compared, and the check's own wording says "as far as its smaller field allows". The note on the served page was drawn 622 by 427: not the 560 a view with no chosen size gives, and 2 pixels narrower than the 624 chosen, which the record does not explain. No run has opened a second Deck window on the same view. To show this box, the walk needs a served window tall enough for the chosen size, or a chosen size that fits it, and the comparison made. Until then the `reading-size` suite checks that the store keeps one size for a view and writes it on a newly opened note's card, and step 9 of TST-0052 asks a person to look.

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> I accept the consequences although there should always be space to the left and right of the note off-screen, so place the associated items there, do not use the current visible view as the constraint to layout the objects..

## The frame the ring is laid out in

Edwin's answer changes more than the pane's size. `focusLayout` today takes `field: Size`, the visible window, and refuses every place that falls outside it (`inside()`); his rule is that the window is not the constraint and there is space to the left and right of the note that a person turns to reach.

Glass already has that space and it is the **cylinder**: a note stands at an angle (`theta`) around the person, turning changes the yaw, and anything past 78 degrees either side is out of sight. So the honest reading of "do not use the current visible view as the constraint" is that the ring's places are **bearings on the cylinder**, not pixels in the window, and the existing turn is how a person reaches a neighbour that is off to the side.

One thing that does not follow, and has to be decided rather than assumed: **the note in the middle is a pane, and a pane is flat.** It is scrollable HTML at the size the person chose, and putting it on the cylinder would scale and skew it with perspective, which is exactly what makes a pane readable and a card not. Two ways, and they are a FEAT-0017 decision:

1. **Anchor the pane to a bearing, draw it flat. CHOSEN 2026-09-12 by Edwin: "turning moves the note and the whole ring".** The pane keeps the person's size and no perspective, and its position follows the projection of its bearing. Turning moves the pane and its whole ring together, both can leave the screen, and the ring keeps its shape around the note.

   Three things this decision makes concrete, and each is a FEAT-0017 task step rather than another question:
   - **A flat pane at a bearing needs a rule for the edges of sight.** Past 78 degrees a slot is out of sight; a pane is a rectangle that does not shrink with distance, so it has to fade and stop taking the pointer on the same boundary rather than hanging at the screen's edge at full size.
   - **The ring's places are bearings and heights, not pixels.** `focusLayout` returns points in a flat field today. It returns angles and heights around the focus's bearing instead, and `project` turns them into pixels the way every other slot is drawn — which is also what lets a neighbour stand off-screen, as [[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]] requires.
   - **A drag on the pane becomes a turn plus a height change**, not a change of left and top. That is the same arithmetic the field's own drag already uses, so it is a reuse rather than a new mechanism.
2. **Leave the pane fixed on screen and put only the ring on the cylinder.** Simpler, and wrong the first time somebody turns: the ring slides away from the note it belongs to. **Not chosen.**

> [!note] Accept — 2026-09-12 (user:edwin)
> 1. turning moves the note and the whole ring

## Checked against the code, 2026-09-19: still true, kept

This is the record of that day's check. The defect it confirms was fixed on 2026-10-02; see "Fixed, 2026-10-02" above.

**What a user notices:** A person resizes the opened note, opens another note, comes back, and finds the first note at a different size. Dragging the opened note by a few pixels also makes it jump to another size.

Evidence: `desktop/src/shared/focus-ring.ts:144` still has `focusLayout(field, dock, wanted, startAngle, avoid)`, with no pane size, and still searches from `FOCUS_MAX` down to `FOCUS_MIN` (`:39-40`, `:175-191`). `desktop/src/renderer/glass.ts:2367-2384` still draws the focused pane from `focusRect` and every other pane from `paneRect`, so the size changes when the focus ends.

**Belongs to:** FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours (PHASE-0002-Glass). Bigger: the ring moves onto the cylinder and Edwin will want to see it. **Next:** A FEAT-0017 task: `focusLayout` takes the pane size and returns bearings, with a smoke check that drags the opened note and fails if its size changes. At that check the reading-size store remained open. The 2026-10-01 proposal and implementation owner are now recorded above; this historical code check is not evidence of their implementation.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
