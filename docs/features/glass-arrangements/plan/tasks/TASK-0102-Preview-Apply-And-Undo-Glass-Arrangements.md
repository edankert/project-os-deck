---
type: "[[task]]"
id: TASK-0102
title: "Preview, apply and undo Glass arrangements"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
parent: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
effort: medium
due: ""
depends: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
blocks: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Preview, apply and undo Glass arrangements

## Definition of Done

Each ticked box ends with what shows it. "The walk" is the scripted walk `glass-arrangements` ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]), which held 44 of 44 checks in the Linux box on 2026-10-02 at `4243fc2`. "The suite" is `arrange` ([[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]]), 15 tests, part of the 586 of 586 that `npm test` passed at `9379a0c`. "The smoke run" is the `arrange` part of the smoke run's Glass section: 4 checks, all passed, in the pass's loopback run at `4243fc2` with each check printed (389 passed, 0 failed in the whole run).

- [x] Read, Compare and Show related each show a preview that names the objects that will move, with Apply and Cancel the keyboard reaches. Shown by the walk's checks "Read is shown before it is applied: an outline where the document will stand, the objects that move named, and the keyboard on Apply", "Compare names the two notes it is about and what it moves", "Tab goes from Apply to Cancel; Enter on Apply applies it" and "by keyboard: Read shown, Escape withdraws it and the keyboard is back on Read". All three commands were applied with Enter on Apply. Read alone was started and withdrawn from the keyboard; Compare and Show related were started with the pointer.
- [x] Compare keeps two full documents readable, preserves dimensions and reading positions, and has an explicit route back to the previous arrangement. Shown by the walk's checks "both documents keep their own, different sizes" (560 by 520 and 512 by 552), "and their own reading positions and text size" (scrolled to 220 and 140, text 14 px) and "Undo arrangement puts both documents and the collection back where they were, at the sizes they had".
- [x] Apply never shrinks chosen text or pane size; narrow windows use navigation or the wider workspace and keep the collection reachable. Shown by the suite (a plan holds a place for each document and no size; the store's `arrange` action changes no size and no reading-size preference; in a window too narrow for both, Compare keeps both sizes and says by how many pixels they overlap) and by the walk's checks "applied, the document is the size it was, scrolled where it was, with text the size it was" and "in a narrow window each of the two compared notes is reached by name, one at a time, with text the same size, and the sizes kept for them are untouched". The bar in the narrow window offered Collection, FEAT-0002 and TASK-0104.
- [x] Undo arrangement puts back the layout and nothing else, leaves a note edit intact, and names what a person has moved, resized or closed since before it does anything. This box first asked for the undo to be "invalidated with explanation" after a manual move. The build does not throw the undo away: it names each changed object, offers "Undo the rest" and "Keep as it is", and puts back the others only on that second press (commit `b017807`). Shown by the smoke run's check "Apply moves what the preview showed … Undo arrangement, pressed, puts the store's desk and the collection's place back to the same bytes … and asks nothing, because nothing had been moved since", by the suite's tests 'an undo puts back exactly what the arrangement moved when nothing has changed since' and 'an undo names what a person changed since and leaves those objects alone', and by the walk's checks "an undo after TASK-0006 was moved by hand names it before doing anything, and offers to put back the rest or keep everything", "Undo the rest puts the other document back and leaves the moved one exactly where the person put it", "an undo after TASK-0006 was closed says so, and does not open it again" and "after an arrangement and its undo the tick is still in the file: the undo put back a layout, and nothing else".
- [ ] Undo arrangement puts back the relationship that was picked out before the arrangement. This was part of the box above ("restores only layout and emphasis") and is split off because nothing shows it.
  - Missing: a check that picks out a relationship, applies an arrangement, undoes it and reads the picked-out relationship. `undoArrange` in `desktop/src/renderer/glass.ts` puts it back; no suite, smoke check or walk reads it.
- [x] A note that changes on disk while a preview is shown makes the application work the preview out again and say so before Apply, and Apply applies the plan on screen. This box first asked for the preview to be invalidated and recomputed "from the accepted current result rather than a copied member list". The build works it out again without being asked, which DES-0003, "Arrangement commands", allows ("invalidates or refreshes that preview visibly before Apply"). A plan holds the places of documents and of the collection and no list of members, so it has no copied member list. Shown by the suite's test 'the basis of a plan changes when anything it was worked out from changes', which includes a changed result waiting, and by the walk's checks "a note changed on disk while Compare was shown: the preview was worked out again from what is there now, and says so" and "Apply then applies the plan on screen, not the one it replaced".
- [x] Relation emphasis uses supported types, reports the emphasized subset and retains the complete accessible neighbour list with one card per shared identity. Shown by the walk's checks "the relationships offered are exactly the frontmatter keys the files join it by, each with its count; a plain link in the text is not offered as a meaning" (seven keys for FEAT-0002), "picking out "covers" leaves exactly the 5 notes the files join by that key undimmed, says "5 of 27", and every row is still in the list", "the cards round it that are not part of it are dimmed, and none is removed", "a note joined only by a link in the text is given no meaning: it is dimmed under every pick", "clear shows every related note the same again, and no link was added or removed" and "a note joined to it is one card, however many ways it is joined".
- [x] Reduced motion applies directly, local Escape cancels preview without sweeping the desk, and pure geometry/state plus real-pointer checks exercise these transitions. Shown by the walk's checks "Tab goes from Apply to Cancel; Enter on Apply applies it; with reduced motion the document is at its new place at once, with no travel" (with `prefers-reduced-motion: reduce` emulated) and "Escape withdraws the preview and nothing else: nothing moved, the note is still open and still the focus, and the keyboard is back on Read", by the smoke run's check "Read, pressed, is shown before anything moves …, and Escape withdraws it and does nothing else: the store's desk and the collection's place are byte for byte what they were", and by the suite, which checks the plans and the undo without a window.

## Steps

- [x] Read the feature, requirement and design, including state ownership and recovery rules. `desktop/src/shared/arrange.ts` cites DES-0003, "Arrangement commands", for what a plan may and may not touch.
- [x] Implement this task's behavior and meaningful checks against its definition of done. Commit `b017807`, with the smoke run's `arrange` part in `2bda283`.
- [ ] Record evidence and reconcile affected documentation before closing. The evidence is recorded above; the task is not closed.

## Notes

The task stays `doing` on one open box: nothing shows that an undo puts back the relationship that was picked out. The code is written. A check for it belongs in the walk `glass-arrangements`, after "clear shows every related note the same again".

Two boxes were reworded on 2026-10-02 to say what was built, and each says what it first asked for. The preview is worked out again when something changes under it, where the box asked for it to be invalidated. The undo is kept for what has not changed, where the box asked for it to be invalidated.

Nothing here was walked by a person, tried on a second display, a real tablet, with a screen reader or by touch. The acceptance check [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] has not been walked.
