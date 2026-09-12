---
type: "[[feature]]"
id: FEAT-0016
aliases: ["FEAT-0016"]
title: "The mouse wheel zooms Glass and the orbit toward the pointer, and three keys do the same from the keyboard"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin 2026-09-11: 'On glass and orbit views: add zoom (using a mouse wheel)'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
goal: "In Glass and in the orbit a person zooms with the mouse wheel or a trackpad pinch, and whatever is under the pointer stays under it. The zoom runs from 0.6 to 2.5 times; the plus, minus and zero keys do the same from the keyboard, and the zoom belongs to the window, like the turn of the field."
requirements: []
tasks: ["[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]", "[[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The mouse wheel zooms Glass and the orbit

## Goal

**A person can zoom the Glass field and the orbit with the mouse wheel, and today the wheel does nothing in either.** Turning the wheel over the field makes the cards larger or smaller, and the card under the pointer stays under the pointer. A trackpad pinch does the same. The `+`, `-` and `0` keys zoom in, zoom out and return to normal size from the keyboard.

> [!quote] As asked, Edwin, 2026-09-11
> "On glass and orbit views: add zoom (using a mouse wheel)"

The research behind the choices below, and the recommendation this feature builds, is [[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 1. It was written by the main session on 2026-09-11 before this plan.

Four words are used throughout:

- The **field** is the cylinder of cards Glass draws ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]), and the **orbit** is the link-graph arrangement of the same field ([[FEAT-0001-The-Corpus-Has-An-Inside]]).
- The **turn** (the code calls it the yaw) is which way the person faces on the cylinder. It already belongs to one window and is never stored.
- A **pane** is a held note drawn on the front plane ([[TASK-0054-A-Held-Note-Is-A-Pane]]). Panes are fixed to the screen, not to the field.
- The **zoom** is the scale one window draws the field at, with 1× meaning today's picture exactly. The bands and the orbit each have their own (decision 4).

## Scope

**In scope.**

- A pure module that zooms around a point and keeps that point still, with the limits, the wheel's step size and the inverse needed by hit tests ([[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]).
- The wheel, the pinch, three keys, a double-click on the background, and a zoom reading on the compass, in Glass and in the orbit ([[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]).
- Smoke checks that drive a real wheel in a real window ([[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]).

**Out of scope.**

- **More detail at a larger scale** (semantic zoom: a card shows more of its note when drawn larger). The reference calls it a later refinement. **Amended 2026-09-12: the refinement landed, in [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]].** Edwin, running Deck: "zooming should also bring in more of the note's content not just increase the note and its font size" ([[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]). `desktop/src/shared/detail.ts` decides how much of a note is drawn from the width it is actually drawn at, so the zoom this feature built now changes what a card says and not only its size. Nothing here is undone: the zoom is still the pure view transform [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]] made, and the new module reads the width it produces rather than changing it.
- **Pinch on the tablet's touch screen.** Safari reports a finger pinch as gesture events, not as a wheel. The served page zooms with a wheel or the keys when the tablet has them, and nothing else is built.
- **A zoom that survives a reload, reaches another window, or enters an address.**
- **Zooming the panes, the bars, the compass or the note in the middle of the ring** ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]). Those are read, not navigated.

## Decisions

Each was chosen while planning on 2026-09-11, most of them by the reference note. Each is Edwin's to overturn, and the alternative is named where one was considered.

1. **The wheel zooms toward the pointer, from 0.6× to 2.5×** ([[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 1). A trackpad pinch arrives in the browser as a wheel event with Ctrl held, so it is the same gesture with a different step size. A zoom that reaches a limit stops there.
2. **Zoom scales what the field draws, and nothing else.** That is the cards, the quiet band's tiles on the canvas, the orbit's dots and links, the ghost outlines and the reach's wires. Panes, the field's bar, the compass and the target strip are not scaled. **The wheel over a pane scrolls the pane's text, as it does today.** The reference's phrase "the panes' neighbours" is read as the cards around the panes, not the panes.
3. **Zooming changes no slot, but a card a pane now covers is moved out from under it once the wheel stops.** The reference says "It changes no slot, so nothing is dealt again because of it." Slots do not change. But panes are fixed to the screen, so zooming in moves cards under them, and [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]] forbids a field card under a held note. So 150 ms after the last wheel event the field does what it already does at the end of a turn: it moves the covered cards into free slots, once. *Alternative:* accept cards under panes while zoomed. Not chosen, because it would break an acceptance line that two reviews checked.
4. **The zoom belongs to the window, like the turn.** It is not in the store, not in the state file and not in an address, and a reload returns to 1×. The bands and the orbit each keep their own zoom for as long as the window is open, and a view switch keeps it. *Alternative:* one zoom for both arrangements. Not chosen, because the orbit is laid out at a different scale and a zoom that suits one would not suit the other.
5. **The zoomed field cannot be lost off the screen.** At 1× or more the zoomed field always covers the whole field area; below 1× it always sits inside it. A zoom that would push it past those limits is held at them, which is the one case where the point under the pointer moves.
6. **The keyboard route.** `+` (or `=`) zooms in, `-` zooms out and `0` returns to 1×, around the middle of the field. They are ignored with Cmd, Ctrl or Alt held, so Electron's own page zoom (Cmd and plus) is untouched, and ignored in a text field, as `H` is ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]). A double-click on the background, where neither click lands on a card, a dot or a pane, also returns to 1×.
7. **The compass shows the zoom when it is not 1×**, as a small button reading, for example, "1.6×". The button returns to 1×, so the reset is reachable by Tab as well as by `0`. It is hidden at 1× ([[REFERENCE-FOCUS-ZOOM-AND-VERBS]]).
8. **Shift with the wheel, and a trackpad's sideways swipe, turn the field.** Turning is the other thing a wheel is asked to do (the reference). A wheel turn ends like a drag turn: covered cards move out from under panes once.
9. **The page itself never zooms.** The wheel listener takes the event only over the field and stops the browser's default there, so a pinch zooms the field and never the whole Deck window.
10. **Under reduced motion a key's zoom step is a cut.** Otherwise it eases over 150 ms. The wheel is direct manipulation and follows the hand in both cases.
11. **This belongs to PHASE-0002, Glass.** The phase is `active`, both surfaces it touches are Glass's, and nothing here needs PHASE-0004 or PHASE-0003. [[FEAT-0001-The-Corpus-Has-An-Inside]]'s scope already promised "Fly, zoom, and land" for the orbit, and zoom was never built; this feature is where it is built, and [[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]] adds an amendment paragraph to FEAT-0001 saying so.

## Acceptance

- Turning the wheel three notches over a card makes it larger, and it stays under the pointer to within one pixel.
- The zoom stops at 0.6× and at 2.5×.
- A trackpad pinch zooms the field, and Electron's page zoom factor stays at 1.
- The wheel over a pane scrolls the pane's text and leaves the zoom where it was.
- Shift with the wheel turns the field and leaves the zoom where it was.
- After the wheel stops, no field card is drawn under a pane.
- A real click on a zoomed card lifts that card; in the orbit, resting on a zoomed link shows its sentence and a click on a zoomed dot lands on it.
- `+`, `-` and `0` zoom in, zoom out and reset; typed into the navigator's search box they are letters.
- A double-click on the background returns to 1×; a double-click on a card does not reset the zoom.
- The compass reads "N×" when the zoom is not 1× and resets it when pressed; it is hidden at 1×.
- The bands and the orbit each keep their own zoom across a switch between them.
- After a reload the zoom is 1×; a second window was never zoomed; no address and no part of the store's state mentions it.
- Under reduced motion, a key's zoom step is a cut.

## Spec-ambiguity check, 2026-09-11

Run before any ID was allocated (`tools/skills/issue-intake/SKILL.md`, step 1).

- **Every term has one meaning.** "Glass and orbit views" means the two arrangements of the Glass field: the bands and the orbit. Both are surfaces in Deck's vocabulary, not views; Edwin's word "views" is read as surfaces, and the reference reads it the same way.
- **Expected against actual is observable.** Today the wheel does nothing over the field ([[REFERENCE-FOCUS-ZOOM-AND-VERBS]], "What Deck does today", verified in `desktop/src/renderer/glass.ts`, which has no wheel handler).
- **Scope is bounded** by the out-of-scope list above.
- **Success is verifiable.** The suite is [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]], the smoke checks are listed in [[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]], and the walk is [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]].
- **Hidden conflicts: one, resolved above.** The reference's "nothing is dealt again" meets [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]'s "No field card is dealt underneath a held note"; decision 3 keeps TASK-0035's rule.

No sibling issue: this is a feature request, and a search of `docs/issues/` for "zoom", "wheel" and "pinch" found none.

## Impact analysis, 2026-09-11

**What was checked.** [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] with [[TASK-0030-The-Slot-Geometry]] (`project()` and `obstaclesFor()` in `desktop/src/shared/slots.ts`), [[FEAT-0010-Lifting-A-Note]] with [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], [[FEAT-0014-The-Hands]] with [[TASK-0054-A-Held-Note-Is-A-Pane]] and [[TASK-0056-Reach]], [[FEAT-0001-The-Corpus-Has-An-Inside]] with [[TASK-0003-The-Field-Renders-And-Flies]], [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]] (the `H` key and its text-field guard), [[FEAT-0006-Every-State-Has-An-Address]], and [[PHASE-0002-Glass]]'s scope, which says "Yaw is session state and never in the address". This project has no `REQ-*` notes; the acceptance lines of those tasks are the constraints.

**No contradiction.** One tension, settled by decision 3: zooming moves cards under screen-fixed panes, so the end of a zoom reassigns covered cards as the end of a turn does.

**Things that must keep working, and are checked in [[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]].** Every hit test: the browser's own for cards, and Deck's own `dotAt` and `edgeAt` for the orbit's canvas. The positions the page reports to the smoke run (`whereIs`, `dotFor`, `edgeSample`, `wirePixel`) must be where things are drawn, zoomed, or every existing check that clicks a card would miss it at any zoom but 1×. At 1× nothing may move by a pixel, so every existing check keeps passing unchanged.

**The measurement** ([[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]) runs at 1×, where the zoom does no arithmetic that changes a position, so its frame-time numbers stand.

## Risk scan, 2026-09-11

**No trigger applies, so no `RISK-*` note is created.** Nothing here adds a dependency, an environment variable, a configuration surface, a stored field, a path change, a long-running step, or a new exposure. One new file under `desktop/src/shared/` and one new suite under `desktop/tests/`, both in existing directories.

## Links

- Phase: [[PHASE-0002-Glass]]
- Plan: `docs/features/glass-zoom/plan/PLAN.md`
- Tasks: [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]], [[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]], [[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]
- Suite: [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]
- Smoke run: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Acceptance walk: [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]
- Research and recommendation: [[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 1
- Code: `desktop/src/shared/slots.ts`, `desktop/src/renderer/glass.ts`, `desktop/src/renderer/index.html`, `desktop/src/renderer/deck.css`, `desktop/src/main/smoke-glass.ts`; new: `desktop/src/shared/zoom.ts`, `desktop/tests/zoom.test.mjs`

## Where this stands

**2026-09-11: planned, nothing built.** Three tasks, one node suite, smoke checks and a share of one walk. The main session builds it next, starting with [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]], and before [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], which draws the rest of the field smaller with the same transform.

**2026-09-11: built and tested; the walk is Edwin's.** Every task is done. The node suite passes and fails for each of its named breaks, and the Glass section of the smoke run drives every acceptance line with a real pointer, wheel and keyboard; each check was seen to fail with its break, and the task notes say where one was caught another way. `bash tools/scripts/run-smoke.sh both` passed. The feature is at `review`: the walk [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]] is Edwin's.
