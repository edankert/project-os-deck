---
type: "[[test]]"
id: TST-0052
aliases: ["TST-0052"]
title: "A note opened in Glass or the orbit stands in the middle of its neighbours and Escape puts the field back, and the mouse wheel zooms toward the pointer"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-10-02
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

A person walks the wheel's zoom and the opened note with its neighbourhood, as TASK-0104 repaired it. The procedure follows Edwin's decisions in ISS-0070, ISS-0071 and ISS-0072. It has not been walked, and the acceptance ledger holds no verdict for it.

## Setup

Start Deck with `npm start` in `desktop/`, on a build that includes TASK-0104's repair (commit `81d4632` or later). Use a disposable copy of a real workspace containing a linked note with a long body, a second note sharing a neighbour, and a high-degree subject whose readable neighbourhood exceeds one viewport. Record the workspace's initial file state; it need not have started clean.

Use a mouse or trackpad, keyboard, and the operating system's reduced-motion control. Open Glass in a view with a visible selectable card. Do not require an owed/front card: the source may legitimately report zero owed notes. Record the IDs used, display/window dimensions and build.

## Steps

1. Put the pointer over a visible card and zoom in and out to the limits. Press the zoom reading on the compass, which returns to 1×. Use pinch, Shift-wheel and `+`, `-`, `0`. Type `0` in a search field and double-click the empty field.
2. Open the linked note. Inspect its former slot and each visible neighbour for duplicate cards or empty outlines. Read its full text and scroll to both ends; select a paragraph by dragging.
3. Resize the document by its corner, then drag its header while watching its size and the neighbourhood. Drag far enough to put a neighbour outside the field. Recover it three ways: press the counter at that edge (it reads, for example, "→ 12 related"); open the document's "N related" list and press the neighbour's row; and, after turning the field away with a drag on empty field, press the button on the compass that reads "find" and the note's id.
4. Open the second note and follow the shared neighbour. Verify that an already held note is raised rather than duplicated. Close a document and recover the initiating row or reference.
5. Open the high-degree subject. With the keyboard on the document's header press R, which opens the "N related" list, and use Tab and Enter to reach a neighbour outside the visible area: Enter on a row shows where its card is. Rest the pointer on a line to a neighbour and read which way the link runs and the sentence it came from.
6. Open the "N related" list, then press Escape once. With no list open, leave focus using Escape. Start a drag of the header and press Escape before letting go. Exercise the existing second-Escape sweep deliberately and verify that the first local Escape did not also sweep.
7. Repeat the open, drag, resize and return routes using the keyboard and reduced motion. On the document's header, Enter gathers what it is joined to, the arrow keys move it, Alt with an arrow resizes it, and Delete closes it. Use Hide notes and switch away from the view and back.
8. Switch to Orbit, open a linked dot and repeat the shared identity/size/movement checks. Leave it untouched for ten seconds, then leave focus and compare the background with its prior arrangement.
9. Reload Deck and inspect saved pane dimensions and positions. Open a never-sized note in another window on the same view, then a note with its own saved size. Shrink and restore the viewport; verify that temporary presentation does not overwrite either saved size. Load a desk from before the reading preference existed and check that a note with no size opens at 560 by 520. Compare source file state with the initial record.

## Expect

- Field zoom preserves its pointer anchor and limits; reset restores the default. Shift-wheel turns the field, and text-field typing does not invoke camera shortcuts.
- A focused note and each neighbour have one spatial representation. The source slot has no drawn ghost. A collection/list reference to a note is not an extra spatial card.
- The document retains the person's chosen size while moving. A note uses its saved size when present; otherwise it uses the size last chosen on that view, then the first-use size of 560 by 520. Another window on that view reads the preference, and temporary narrow layouts do not overwrite it. Text drag selects text and text scrolling never drives the camera at either boundary.
- Dragging the document translates its neighbourhood with relative order intact. Unrelated cards are not re-dealt. Off-screen neighbours remain reachable without shrinking the reader. The document itself stops at the field's edge while the desk faces you; the cards round it run past the edge.
- Shared/held notes are reused. Connections state supported direction or meaning, and their list offers the same information to keyboard users.
- Escape dismisses one local state, or leaves focus when no local state exists. Escape during a drag puts the document back and keeps the focus. It cannot dismiss a local control and sweep in one event. Closing one document retains the others and returns focus appropriately.
- Reduced motion preserves the same final state without travel. Orbit stops drifting while focused and restores its stable background on leaving.
- Existing persisted positions and chosen sizes survive reload. Focus and camera orientation remain session state.
- Navigation and arranging do not change source notes. All findings name the IDs and build examined.

## Not this check

This check does not verify new collection presentations or arrangement undo (TST-0064), the complete collection/document workflow (TST-0063), saved scenes, structured evidence payloads or native benchmark results. It does not require a fixed count of sixteen tiny neighbour cards.

## Evidence

**Not walked.** No person has walked this check, and the acceptance ledger holds no verdict for it on any platform. A walk records its result there, not on this note.

**Corrected on 2026-10-02, against the application as built.** Setup no longer waits for TASK-0104, which is built. Steps 1, 3, 5, 6 and 7 name the controls the application has: the zoom reading on the compass, the edge counter, the "N related" list, "find", and the keys on a document's header. Step 9 and the third Expect line say 560 by 520 where they said "documented" and "calibrated" default; that size is a trial value and TASK-0097 owns its calibration. One Expect line was added because the build stops a dragged document at the field's edge, where Edwin's answer in ISS-0072 was that nothing is clamped. ISS-0072 sets the two side by side, and the choice is Edwin's. A walker who finds the stop wrong should record it.

**What a script has shown, which is not a walk.** On 2026-10-02 at `e86b2e4`, in a Linux container, the `focus`, `zoom`, `lift`, `panes` and `orbit` parts of the smoke run passed ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]). So did the scripted walks `focus-neighbourhood` (8 checks), which opens a note, drags it, turns the field from a point of its background, presses "find" and leaves with Escape, and `glass-desktop` (54 checks). They send real pointer and key events and read the page. They do not say whether a person finds the route obvious, nothing in them was timed on the Mac, and nothing was tried on a second display, a tablet, a screen reader or by touch. In the orbit a drag and a resize of the document were not driven (step 8). For step 9, the walk `glass-collection` opened a note on the served page, but it compared no size there, because that page's field was shorter than the size chosen; ISS-0071 has the detail. No run opened a second Deck window.
