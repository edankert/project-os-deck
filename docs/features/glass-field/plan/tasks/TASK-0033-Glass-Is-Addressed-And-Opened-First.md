---
type: "[[task]]"
id: TASK-0033
aliases: ["TASK-0033"]
title: "Glass has an address, is the surface Deck opens, and the navigator beside it is the keyboard route"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0031"]
blocks: []
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[TASK-0017-The-Address-Grammar]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]", "[[FEAT-0004-Windows-On-Any-Screen]]"]
tests: ["[[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]]", "[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Glass is addressed and opened first

## Objective

A Deck state says which **surface** shows it, Spread or Glass, and Glass is what a person sees when the address does not say. The switcher offers both surfaces for any view. The navigator beside the field is the route for the keyboard and the screen reader: every near card is reachable from it, a screen reader hears a row's place in the whole view, and a person who asked for reduced motion arrives at a note by highlight and scroll.

## Detail

The grammar today is `deck://<workspaceId>/<viewId>[?desk=&note=&panel=]` ([[TASK-0017-The-Address-Grammar]]). This task adds one query key for the surface, with two values, and no default written into the address: an address without it means Glass, which is [[ADR-0002-Glass-Is-The-Main-View]]. The yaw is session state and never enters the address, so an address pasted tomorrow restores the view, the desk and the focused note, and the person faces the front band. The parser keeps refusing what it cannot read; a third surface name is an error, not a fallback.

The switcher draws what the provider returned ([[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]) and holds no view names; it gains a surface toggle beside the views, not a view called Glass. Pop-out panels ([[FEAT-0004-Windows-On-Any-Screen]]) are unchanged: a panel carries the Needs-you strip, a note or a desk, none of which is a field.

The navigator already exists with groups, search and filters ([[TASK-0027-Search-And-Filter-In-The-Renderer]]), and it already carries `aria-expanded` and `aria-current`. What it gains here is what the review said the field cannot do without: a focus order that puts the front band first and then the mid band by group, a role on each row and each near card, `aria-setsize` and `aria-posinset` so a windowed DOM still reads as "item 5 of 409", and the same open verb from the keyboard as from the mouse. Arriving at a note from the navigator flies the field to it; with reduced motion it highlights the card and scrolls the row instead, because WCAG 2.3.3 asks that motion from interaction can be disabled unless essential, and an arrival with no cue is worse than a cut.

## Acceptance

- An address with the surface key set to spread or glass round-trips through format and parse, and one with any other value is refused.
- Opening a workspace with no surface in the address shows Glass; the same address with the surface set to spread shows the desk.
- The switcher offers the surface toggle for every view the provider returned, and the renderer still contains no literal view name.
- Every front and mid card can be reached from the navigator with Tab and the arrow keys and opened with Enter, checked in the smoke run.
- A navigator row exposes its position in the whole view, not in the drawn window.
- With reduced motion requested, choosing a row highlights the card and scrolls the row, and no fly is played.

## Steps

- [x] Add the surface to the address grammar and its parser tests, with the refusal of unknown values.
- [x] Route the renderer by surface, Glass by default, and add the toggle to the switcher.
- [x] Give the navigator rows and the near cards roles, a focus order and set-size attributes.
- [x] Wire the keyboard open verb to the fly, with the reduced-motion substitute.
- [x] Extend the smoke run with the keyboard walk and the default-surface check.
- [x] Write the automated test notes and link them from `tests:`.

## Notes

The review asked for the address before the renderer. It is placed after the first draw here only because the grammar and the navigator already exist and the change is small; it can be built beside [[TASK-0031-The-Field-Renders-And-Turns]] rather than after it.

## Outcome

**Done 2026-09-10.** `glass` is registered in the surface vocabulary and named first in all seven descriptions' `surfaces`. The store holds a `surface`, Glass unless a person chose otherwise, and an address carries `surface=` only when it is not Glass; `surface=hologram` is refused. The switcher gained a toggle, Glass · Spread · List, drawn from the view's own `surfaces` with the vocabulary's labels, and the renderer names no surface.

**The navigator is the keyboard's route into the field.** One row is the tab stop and the arrow keys move it; Enter lifts the row's note in Glass; `p` pulls, `b` pushes, `s` sends, Delete puts back. Each row says its place in the whole view, folded groups included, with `aria-posinset` and `aria-setsize`. Arriving on a row flies the field to its card and reaches for it; under reduced motion the row and the card are highlighted and the field cuts.

**Evidence.** [[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]] (`panel-registry.test.mjs`) for the grammar refusing a surface nothing draws, corrected on 2026-09-10 after the review found it cited elsewhere; [[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]] for the surface in the store; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] for the default surface, the address with `surface=spread`, the toggle, the keyboard lift and the reduced-motion arrival.

**Amended 2026-09-10 (ISS-0060).** The surface is no longer kept across a restart or a change of workspace: Deck opens in Glass unless an address names another surface.
