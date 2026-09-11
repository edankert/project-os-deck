---
type: "[[task]]"
id: TASK-0035
aliases: ["TASK-0035"]
title: "A note is lifted out of the field onto the desk, its slot stays ghosted, and closing is three verbs none of which destroys anything"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-11
source: ["[[FEAT-0010-Lifting-A-Note]]"]
parent: "FEAT-0010"
effort: ""
due: ""
depends: ["TASK-0031", "TASK-0030"]
blocks: ["TASK-0036"]
related: ["[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: ["[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A note is lifted and put back

## Objective

A click on a card in the field puts that note on the desk. The desk is the one Deck already keeps for the workspace, so what is lifted here is what Spread shows. The slot the note left stays ghosted until the note returns. Closing is three verbs, and none of them can lose anything.

## Detail

Deck's store already holds the desk: `deskCards` per workspace, and named desks under `desks` (`desktop/src/shared/types.ts`, built by TASK-0024 and TASK-0025). A lifted note is one more entry in that list, dispatched through the same store action Spread's navigator uses when a row is clicked onto the desk. Nothing new is stored.

What is new is the field's side of it. The field ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]) deals every note into a slot. When a note is lifted, its slot is not re-dealt to another note; it is drawn as a ghost, an empty outline where the card was, so the person can see the hole and put the note back where it came from. A held note is an obstacle for the slot geometry (TASK-0030), so no field card is placed underneath it.

Every click adds. DES-0002 rev 8 settled that, after rev 7 made a second note need a modifier and in practice only one note could be opened. Closing is three verbs: × on a held note puts that one back, ⌥× puts back every other note, and esc sweeps the desk. A click on the field's background does nothing, because a desk swept by accident is unforgivable.

The held note's body is rendered by the reader Deck already has, from the sidecar's HTML. The field is not a second reader.

## Acceptance

- A click on a field card adds that note to the workspace's desk, and the store's desk list is the same one Spread reads.
- The slot a lifted note left is drawn ghosted, and putting the note back fills that slot rather than dealing the note somewhere new.
- No field card is dealt underneath a held note.
- × puts one note back; ⌥× puts back every note but the one clicked; esc puts back every note. Each is a store action and none deletes a saved desk.
- A click on the background of the field changes neither the desk nor the field.
- A held note's body comes from the sidecar's rendered HTML, through the reader Deck already has.
- Switching to Spread shows the same desk with the same notes; switching back shows them held in Glass.

**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** A lift now also puts the note in the middle of the field. While a note is there, one Escape takes it out of the middle and a second Escape puts back every note; with nothing in the middle, one Escape puts back every note as before. 'No field card is dealt underneath a held note' holds whenever nothing is in the middle; while a note is, its pane and the ring around it lie over the dimmed field on purpose.

## Steps

- [x] Wire a field card's click to the store's existing put-on-desk action, with the note id from the card's bound model.
- [x] Keep a lifted note's slot out of the deal and draw it as a ghost; return the note to that slot on put-back.
- [x] Register held notes as obstacles for the slot geometry.
- [x] Add the three closing verbs and confirm a background click is a no-op.
- [x] Render the held note through the existing reader pane.
- [x] Add a check that lift and the three closing verbs are pure store transitions, and a smoke step that lifts a card with a real pointer sequence and finds the ghost.

## Notes

DES-0002 says the desk should survive a workspace switch and hold notes from several repositories. That is not built. Deck's desks are per workspace and each note's content comes from its own sidecar, and the feature note records the decision. The rev 3 lesson of DES-0002 applies to the click: a `preserve-3d` container is an invisible pane in front of its children, so the check must use real pointer events and never `element.click()`.

## Outcome

**Done 2026-09-10.** A click on a field card puts the note on the workspace's desk through the same `put-on-desk` action Spread uses, and every click adds. The note's slot stays in the deal and is drawn as a dashed ghost, so putting it back fills the same slot. × on a pane puts that note back; ⌥× puts back every other note; Escape sweeps the desk; a click on the field's background changes nothing. A held note's body comes from the sidecar's rendered HTML.

**Evidence.** [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: a real click lifts, the ghost and the pane appear, each closing verb does what it says and asks the sidecar nothing, and the same desk is on Spread after a surface switch.
