---
type: "[[task]]"
id: TASK-0096
title: "Draw and operate the collection in Glass"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
blocks: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Draw and operate the collection in Glass

## Definition of Done

- [x] The derived collection is readable in Glass's main rectangle and can be moved, resized and collapsed without a permanent navigator column. Shown by the smoke run's `collection` part: "the list is an object in the field and not a column beside it" (in the field true, a column beside the field false), the resize by its corner, the move by its header, and the collapse by Enter and by its ▾ button, each with the store read back. The `glass-desktop` walk shows the same three by pointer, and its picture `01-collection-on-the-field.png` shows the list with its rows readable.
- [ ] Group folds, search, filters, counts, row opening and keyboard movement work in the object, including screen-reader names and reduced motion.
  - Shown: search (the smoke run's `collection` check where three letters narrow 144 notes to "59 of 144 notes", and the walk's check for a search with no match and Clear filters), the exact count, a row opened by pointer and by Enter, and the arrow keys, Home and End (the smoke run's `keys` part, 12 checks). Under reduced motion "choosing a row highlights it" and the field cuts to it.
  - Missing: no check chooses a status or a type in the two filter boxes while the list is in the collection. No check presses a group heading with the pointer there; the walks open headings through the store or with a scripted click. The names a screen reader is given are read from the page by several checks, and nobody has listened to them.
- [x] A narrow window and the served page, which is what a tablet loads, keep a usable route to the same rows. Shown by the smoke run's `collection` checks in a field 652 px wide (a bar names the collection and each open note, "Collection" puts the list in front with the same count "144 notes", and the narrow window stores nothing), by the `served` part's check that a page with no bridge opens with the same exact count and that a row pressed there opens the note, and by the `glass-desktop` walk's four checks in a narrow field and three on the served page. The served page was driven in a second Electron window with a mouse pointer. No real tablet and no touch was tried.

- [ ] The collapsed header names the query, exact count and active filters; expanding restores its size, selection and scroll anchor.
  - Shown: collapsed, the header is 34 px tall and reads "Features" and "144 notes"; opened again the collection has the size it had and is scrolled to the same row (the smoke run's `collection` check on Enter, the walk's checks "collapsed, the collection is its header" and "opened again it has the size it had and is scrolled to the same row").
  - Missing: no check collapses a narrowed list, so the filter in the collapsed header is not read. No check reads which row is marked after the collection is opened again.
- [ ] Wheel input stays inside collection scrolling at both boundaries; dragging a header moves it while row text and controls keep their own behavior.
  - Shown: the wheel over the collection scrolls its list from 0 to 200 and leaves the zoom where it was, and a double-click on its header collapses it and does not reset the zoom (the smoke run's `zoom` part). The header drag moves it and keeps its size, and letters typed in its search box are letters (`collection` and `zoom` parts).
  - Missing: no check turns the wheel with the list already at its first or its last row. The same boundary is checked for a document, not for the list.
- [ ] Visible keyboard focus and the "collection" control reveal a covered or off-screen object; local Escape is consumed once.
  - Shown: "collection" is offered when the field is turned away and when a document lies over the list, brings the list back in front without turning the field, and puts the keyboard in it (three `collection` checks, and the walk's check on the served page). Choosing a row turns the field to that row's card (the `keys` checks under reduced motion, "choosing a row highlights it" and "the field cut to it rather than flying"), and Left, Right, End and Home on a row leave the collection in front where it stood.
  - Missing: the one local use of Escape in the collection, putting it back during a drag of its header (`collection-view.ts`), is not pressed by any check. The checks read which element has the keyboard; none reads whether the focus outline is drawn.
- [x] Apply the design's title hierarchy, flat readable text, quiet materials and absence of blur over the moving field. Shown by the `glass-style` suite's test "no rule blurs anything, and no rule sets a backdrop filter", by the smoke run's check that a collection turned away from is dimmed under a veil of 0.48 "while it stays opaque", and by the header order in the walk's pictures: the view's name, then its count. Whether the result reads well is a person's judgement and belongs to [[TST-0063-A-Collection-And-Full-Note-Share-Glass]].

## Steps

- [x] Reuse the current navigator's row and keyboard behavior on the stage. The same `#navigator` element is moved into the collection (`desktop/src/renderer/collection-view.ts`), and the smoke run's `keys` part drives its rows there.
- [x] Integrate collection placement with the Glass field and desk geometry. The collection is carried and dimmed with the desk when the field turns (the smoke run's `focus` check "the collection is carried and dimmed with it"), and it is drawn wholly inside the field (the `collection` suite's test "a field smaller than the collection draws it inside the field and changes nothing stored").
- [x] Add focused checks for pointer, keyboard and narrow-window operation. The smoke run's `collection` part holds 17 checks, added in commit `2bda283`.

## Notes

The fixed navigator is replaced as the Glass list placement, not as the source of list behavior.

**This task stays `doing`.** Four boxes are open, and each says under it what no check shows. None is a known defect. Each needs either a check added to the smoke run or a person's look in [[TST-0063-A-Collection-And-Full-Note-Share-Glass]], which has not been walked.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `4243fc2`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb). The smoke run's `collection` part held 17 checks of 17 and the `glass-desktop` walk 54 of 54 ([[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]). The node suites passed 586 of 586 the same day at `9379a0c`.

**Three fixes made after the first build belong here.**

- A key pressed in the collection no longer also turns the field (commit `2afecf1`). Right on a row slid the list 69 px, and End put it out of sight. The `keys` check on Left, Right, End and Home and the `collection` check "the field is not turned by them" would show the list moved, or the field's bearing changed, if it came back.
- Rows hold still under the pointer when a note is opened from the list (commit `d91fc7e`). A second press landed on the wrong row because the first note's rows arrived above it. The smoke run's `document` check "a second press 92 ms after the first landed on the row it was aimed at" covers it.
- A press on a row is not lost when the list is drawn again under it (commit `cee5119`). The row was handed to another element between the button going down and coming up, so the click went to the list and nothing opened. The `document` check "a press on FEAT-0013's row, held while FEAT-0012 was opened and the list drawn again, still opens FEAT-0013" asserts that the row was handed from one element to another in between, so it cannot pass without the redraw having happened.
