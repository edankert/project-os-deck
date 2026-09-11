---
type: "[[task]]"
id: TASK-0062
aliases: ["TASK-0062"]
title: "Desk panels, throws and the tablet use the right view's desk"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
parent: "FEAT-0015"
effort: "S"
due: ""
depends: ["TASK-0058"]
blocks: ["TASK-0063"]
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]"]
tests: ["[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]]"]
---

# Desk panels, throws and the tablet use the right view's desk

## Objective

Every window other than the focus window draws, and changes, the desk of the right view. A desk panel uses the view in its own address. A throw onto a desk panel lands on that panel's view's desk. The tablet draws the Mac's current view's desk, whatever view it is browsing.

## Detail

**A desk panel keeps its own view** (decision 12). A popped-out window is "pinned": it draws one address and does not follow the focus window's switcher. The comment on `pinned` in `desktop/src/renderer/renderer.ts` says so, and [[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]] fixed the one place that broke it. The store's `viewId` is shared by every Mac window, so it is the focus window's view, not the panel's. A desk panel therefore reads `deskCardsOf(state, workspace, <the view in its address>)`, and every desk action it dispatches carries that `viewId`. Without this, a desk panel opened on Issues would draw the Features desk the moment the focus window switched, against the Issues notes it loaded, and call every card "not in this view".

**A throw onto a desk panel lands on that panel's view.** `deck:window:throw` in `desktop/src/main/main.ts` puts the note on the desk from the main process with the store's current view. For a target whose panel is `desk`, it reads the view from that window's address (`windowInfo`) and sends it with `put-on-desk`. A throw to the focus window or to the tablet uses the store's current view, which is the one both draw. This amends [[TASK-0055-Throw-To-A-Screen]]'s "the note is on the desk everywhere, because the desk is per workspace"; add a dated paragraph there.

**The tablet draws the Mac's current view's desk** (decision 13). `mergeServed` in `desktop/src/shared/served-state.ts` keeps the tablet's own `viewId` unless Follow the Mac is on, so the served page must also keep the Mac's view for the desk. A small helper in `served-state.ts` or a field on the `Host` in `desktop/src/renderer/host-bridge.ts` provides it, and the served page's renderer passes it to `deskCardsOf`. A note on the Mac's desk that the tablet's view does not hold is drawn as [[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]] draws any note not in the view. The tablet still dispatches nothing to the Mac. This amends [[TASK-0057-The-Served-Page-Follows-The-Store]]'s "The desk is per workspace and is shared"; add a dated paragraph there.

## Acceptance

- A desk panel opened on Issues keeps drawing the Issues desk after the focus window switches to Features, and a card dragged in it moves on the Issues desk.
- A throw onto that desk panel puts the note on the Issues desk while the focus window shows Features, and the Features desk is unchanged.
- A throw to the tablet puts the note on the Mac's current view's desk, and the tablet draws it within a second.
- With Follow the Mac off and the tablet browsing Features while the Mac shows Issues, the tablet draws the Issues desk; when the Mac switches to Tests, the tablet draws the Tests desk.
- The served page still applies only `TABLET_LOCAL_ACTIONS`, and every write to `/deck/state` and `/deck/events` is still refused with 405.

## Steps

- [x] Pass the pinned view to `deskCardsOf` and to every desk action in a satellite window.
- [x] Send the target's view from `deck:window:throw` for a desk panel.
- [x] Keep the Mac's view on the served page for the desk; add a check to `desktop/tests/served-state.test.mjs`.
- [x] Add the amendment paragraphs to [[TASK-0055-Throw-To-A-Screen]] and [[TASK-0057-The-Served-Page-Follows-The-Store]].

## Notes

Nothing here adds a route. The throw handler, the served state and the two read routes already exist; this task changes which view they name.

## Outcome

**Done 2026-09-11.** A popped-out window draws and changes the desk of the view in its own address: the renderer's `deskViewHere()` uses that view, and every desk action it sends names it. `deck:window:throw` reads a desk panel's view from its address, so a throw onto it lands on that view's desk. The served page's merged state carries the Mac's current view as `deskView`, so the tablet draws that view's desk whatever it browses, and follows a view switch on the Mac. The store suite has the check ([[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]), and `served-state.test.mjs`'s tablet check now reads the desk through `deskCardsOf`. The served page still applies only `TABLET_LOCAL_ACTIONS`, and both routes still refuse writes. The amendment paragraphs are on [[TASK-0055-Throw-To-A-Screen]] and [[TASK-0057-The-Served-Page-Follows-The-Store]].
