---
type: "[[test]]"
id: TST-0052
aliases: ["TST-0052"]
title: "A note opened in Glass or the orbit stands in the middle of its neighbours and Escape puts the field back, and the mouse wheel zooms toward the pointer"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-10-01
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: "Glass and Orbit in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: ["[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]"]
tasks: ["[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]", "[[TASK-0104]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]]"]
area: "glass"
---

# A focused document keeps its size and neighbourhood

## Purpose

Walk the existing spatial zoom and the repaired focus behavior. This procedure now reflects Edwin's decisions in ISS-0070/71/72. Its earlier ghost, mini-card and drag-to-exit expectations are replaced; no new pass is recorded.

## Setup

Start Deck with `npm start` in `desktop/` after TASK-0104 is implemented. Use a disposable copy of a real workspace containing a linked note with a long body, a second note sharing a neighbour, and a high-degree subject whose readable neighbourhood exceeds one viewport. Record the workspace's initial file state; it need not have started clean.

Use a mouse or trackpad, keyboard, and the operating system's reduced-motion control. Open Glass in a view with a visible selectable card. Do not require an owed/front card: the source may legitimately report zero owed notes. Record the IDs used, display/window dimensions and build.

## Steps

1. Put the pointer over a visible card and zoom in and out to the limits. Use the zoom-reset control, pinch, Shift-wheel and `+`, `-`, `0`. Type `0` in a search field and double-click the empty field.
2. Open the linked note. Inspect its former slot and each visible neighbour for duplicate cards or empty outlines. Read its full text and scroll to both ends; select a paragraph by dragging.
3. Resize the document, then drag its header while watching its size and the neighbourhood. Drag far enough to put a neighbour outside the viewport, then recover it with the named locate/list route.
4. Open the second note and follow the shared neighbour. Verify that an already held note is raised rather than duplicated. Close a document and recover the initiating row or reference.
5. Open the high-degree subject. Use the complete relationship list and keyboard to reach a neighbour outside the visible area. Inspect a connection's source direction/context.
6. Open a local control, then press Escape once. With no local control open, leave focus using Escape. Exercise the existing second-Escape sweep deliberately and verify that the first local Escape did not also sweep.
7. Repeat the open, drag, resize and return routes using keyboard and reduced motion. Use Hide notes and switch away from the view and back.
8. Switch to Orbit, open a linked dot and repeat the shared identity/size/movement checks. Leave it untouched for ten seconds, then leave focus and compare the background with its prior arrangement.
9. Reload Deck and inspect saved pane dimensions and positions. Open a never-sized note in another window on the same view, then a note with its own saved size. Shrink and restore the viewport; verify that temporary presentation does not overwrite either saved size. Load a desk from before the reading preference existed and check the documented default. Compare source file state with the initial record.

## Expect

- Field zoom preserves its pointer anchor and limits; reset restores the default. Shift-wheel turns the field, and text-field typing does not invoke camera shortcuts.
- A focused note and each neighbour have one spatial representation. The source slot has no drawn ghost. A collection/list reference to a note is not an extra spatial card.
- The document retains the person's chosen size while moving. A note uses its saved size when present; otherwise it uses the persisted per-view reading preference, then the calibrated first-use default. Another window on that view reads the preference, and temporary narrow layouts do not overwrite it. Text drag selects text and text scrolling never drives the camera at either boundary.
- Dragging the document translates its neighbourhood with relative order intact. Unrelated cards are not re-dealt. Off-screen neighbours remain reachable without shrinking the reader.
- Shared/held notes are reused. Connections state supported direction or meaning, and their list offers the same information to keyboard users.
- Escape dismisses one local state, or leaves focus when no local state exists. It cannot dismiss a local control and sweep in one event. Closing one document retains the others and returns focus appropriately.
- Reduced motion preserves the same final state without travel. Orbit stops drifting while focused and restores its stable background on leaving.
- Existing persisted positions and chosen sizes survive reload. Focus and camera orientation remain session state.
- Navigation and arranging do not change source notes. All findings name the IDs and build examined.

## Not this check

This check does not verify new collection presentations or arrangement undo (TST-0064), the complete collection/document workflow (TST-0063), saved scenes, structured evidence payloads or native benchmark results. It does not require a fixed count of sixteen tiny neighbour cards.

## Evidence

Not walked against the repaired contract. Record a dated result through the acceptance ledger when implementation is ready; the former implementation's automated passes do not satisfy this procedure.
