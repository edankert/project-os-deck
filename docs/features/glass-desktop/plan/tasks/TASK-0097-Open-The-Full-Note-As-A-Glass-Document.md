---
type: "[[task]]"
id: TASK-0097
title: "Open the full note as a Glass document"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: []
blocks: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Open the full note as a Glass document

## Definition of Done

- [x] A card or row immediately opens its identified document frame on the Glass desk and renders the actual sidecar full text as soon as available, below a compact subject header where supported. Explicit loading, retry and close states remain usable; text never waits for motion or a summary click. Shown by the `glass-desktop` walk: the document is on screen and named 67 ms after the press, in state "loading", and "ready" when it settles; its text is the full note under its title "with no summary to click through"; picture `05-document-from-a-card.png` shows the note's goal as one line under the heading. The smoke run's `document` part shows that a row opens a document whose text is, character for character, what the sidecar renders for that path (4121 characters), that a read that fails opens the document named, with "could not be read", retry and close, and that retry reads it. In the `glass-scale-your-trainer` walk the text is in 268 to 347 ms after the press and the opening is at rest at 344 to 391 ms; on this repository the text is in at 127 to 191 ms and the opening at rest at 326 to 349 ms. In none of the six openings does the text arrive after the opening has ended.
- [x] The document starts at a readable size, preserves the person's chosen size, and scrolls long text inside the pane. Shown by the walk (a first document 560 by 520 with 3964 px of text to scroll; the corner resizes it to 640 by 560 "and that size becomes the size the next note opens at on this view"), by the `glass-collection` walk's check that a note resized to 624 by 552 with the keyboard is followed by a note that opens at 624 by 552, by the smoke run's `focus` checks on the corner, Alt with an arrow and the next note opened, and by the reading-size suite, 14 tests ([[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]]).
- [x] Links, checkboxes, currently available action presentation and disabled reasons remain usable with the document; no full-height action column is required in Glass and no new action is introduced. Shown by the smoke run's `document` part: a link in the text opens the note it names as another document and the window stays in Deck; each open criterion has a tick control beside it inside the text; the verbs the sidecar offers are drawn inside the document, each as the sidecar's row says, "and not in a strip beside the field (0 there)". A verb pressed in a document asks why and sends one transition, and a tick asks for evidence and sends it (three checks in the smoke run's verb and tick section, with every write stopped in the main process). A disabled reason is shown by the `glass-collection` walk: "Accept" on ADR-0005 is drawn inside the document as refused, with the reason in words beside it, and pressing it asks nothing and sends nothing. That refusal was put there by the walk. No note in this workspace has a verb the sidecar refuses, so the walk replaced the sidecar's answer for ADR-0005, through the debugger, with one whose first verb is disabled with a reason. This shows how Deck draws a refusal inside a document. It does not show a refusal the sidecar itself made.

- [x] A visible card becomes the document continuously, a row identifies the arriving note, and input never waits for neighbours to animate. Shown by the walk's check "it grows from the card that was clicked, not from somewhere else" (first frame at the card's place and width, 1090 and 137 px) and its check that the open note's row is shown and marked in the collection. Shown by the smoke run's `document` checks that a second press 92 ms after the first lands on the row aimed at and that a press 65 ms into an opening goes through the growing document to the row under it (since commit `e86b2e4` the check sends that press when it sees the document lying over the row, where before it sent it a fixed time after the first), and by both scale walks' check "a second note opened 90 ms into the first one's opening".
- [x] The opening lasts 300 ms, inside the 250 to 400 ms the design asked to try, and can be interrupted; reduced motion opens directly with the same final state. The value is `OPEN_MS` in `desktop/src/shared/focus-ring.ts`. The smoke run's `focus` part reads "over 300 ms", and the walk records the opening's frames from 67 to 388 ms after the press. Interrupting is shown by the checks in the box above. Reduced motion is shown by the walk's check "the document is at its place and size on its first frame, and neither it nor the cards are animated" and by the `focus` check that marks the document and 38 of 38 cards instead. One duration was built and measured. No other duration in the range was tried, and nobody has judged it by eye.
- [x] Promote human title, compact ID and state; move full paths into details and keep document text flat and opaque. Shown by the smoke run's `document` checks: the heading is the note's title, then its id and its status; the path is not in the heading and is in the name a screen reader is given; "details", pressed, is where the path is. A document turned away from is dimmed under a veil and stays opaque (`focus` part), and no rule blurs anything (`glass-style` suite). The design asked for nearly opaque; a document is fully opaque, because a see-through one showed the list's text through its own (commit `2d3b77a`).
- [x] Dragging text selects it, scrolling stops inside the document and moving by its header preserves size. Shown by four checks of the `glass-desktop` walk: the wheel scrolls the document to its end "and, there, does not zoom or turn the field", "and the same at its top", dragging across the text selects it and moves nothing, and dragging the header moves the document with its size unchanged.

## Steps

- [x] Reuse the existing rendered HTML and pane identity. The document's text is the sidecar's rendered note, compared character for character by the smoke run's `document` part.
- [x] If an action is currently offered, place its existing presentation with the document and keep its current capability guard. The verbs are drawn by the same function as in the reader, into the document, and are absent on a served page (the `served` check "the served page is drawn no verb and no tick").
- [x] Exercise multiple documents, a view switch, a reload and the served read-only host. The walk opens three documents, reloads with one open, and reads a note on the served page; the smoke run's `desks` part switches views with documents open; the `served` part holds 6 checks.

## Notes

ISS-0071's rule for the chosen size was built under FEAT-0017 in [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] (commit `81d4632`) and is what the second box cites.

**Every box is ticked on a scripted check.** One box was open after the first close-out: no check drew a disabled verb with its reason inside a Glass document. The `glass-collection` walk now does, on a refusal the walk itself put in the sidecar's answer, as the box says.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `e86b2e4`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb). The smoke run's `document` part held 14 checks of 14 and its `served` part 6 of 6. [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] held 54 of 54 in its first script, `glass-desktop`, and 11 of 11 in its second, `glass-collection`. Every time above is the container's, which draws in software. Nothing here says how fast a note opens on the Mac.

**Since the independent review, 2026-10-02.** The review refuted nothing in this task's boxes; what it could not settle without a window it marked *not checked*. One check the second box cites has changed. On the served page the `glass-collection` walk used to hold a note to the chosen size only when that page's field had room, and in the pass at `e86b2e4` it had none, so nothing about size was asserted there. Since commit `e3f1460` the walk opens the served page in a larger window, measures the document once its opening has ended, and requires the two sizes to be equal. No run of that check is recorded in this note yet.

**Two later fixes belong here.**

- A note the view does not hold is read from the card it was opened with (commit `f5d6ba9`). On a served page, a link to such a note opened a document that said the note "is on the desk and cannot be read here", and went on saying it. The `served` check on a link to RISK-0001 reads "ready, 5187 characters ... it passed through loading then ready", and would read "missing" if the defect came back.
- A document that leaves the desk has its panels closed however it left (commit `1a71001`). Closing every note with Escape used to leave a note's related list open the next time that note was opened. The change is made where a document is removed from the page (`desktop/src/renderer/glass.ts`). The `glass-collection` walk's check "a document whose related list and details were open comes back with every panel closed, whether it left when the desk was swept or when it was closed by itself" asserts it, and would find the related list open after "close all" if the defect came back.

Where the verbs stand in Glass is recorded in [[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]], which stays open for Spread and List.

The acceptance check [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is a person's walk and has not been walked.
