---
type: "[[task]]"
id: TASK-0097
title: "Open the full note as a Glass document"
status: doing
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

- [x] A card or row immediately opens its identified document frame on the Glass desk and renders the actual sidecar full text as soon as available, below a compact subject header where supported. Explicit loading, retry and close states remain usable; text never waits for motion or a summary click. Shown by the `glass-desktop` walk: the document is on screen and named 71 ms after the press, in state "loading", and "ready" when it settles; its text is the full note under its title "with no summary to click through"; picture `05-document-from-a-card.png` shows the note's goal as one line under the heading. The smoke run's `document` part shows that a row opens a document whose text is, character for character, what the sidecar renders for that path (4121 characters), that a read that fails opens the document named, with "could not be read", retry and close, and that retry reads it. In the `glass-scale-your-trainer` walk the text is in at 240 to 326 ms and the opening settles at 333 to 398 ms, so the text does not wait for the motion.
- [x] The document starts at a readable size, preserves the person's chosen size, and scrolls long text inside the pane. Shown by the walk (a first document 560 by 520 with 3964 px of text to scroll; the corner resizes it to 640 by 560 "and that size becomes the size the next note opens at on this view"), by the smoke run's `focus` checks on the corner, Alt with an arrow and the next note opened, and by the reading-size suite, 14 tests ([[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]]).
- [ ] Links, checkboxes, currently available action presentation and disabled reasons remain usable with the document; no full-height action column is required in Glass and no new action is introduced.
  - Shown: a link in the text opens the note it names as another document and the window stays in Deck; each open criterion has a tick control beside it inside the text; the verbs the sidecar offers are drawn inside the document, each as the sidecar's row says, "and not in a strip beside the field (0 there)" (the smoke run's `document` part). A verb pressed in a document asks why and sends one transition, and a tick asks for evidence and sends it (three checks in the smoke run's verb and tick section, with every write stopped in the main process).
  - Missing: no check draws a disabled verb with its reason inside a Glass document. The smoke run checks that in the reader of Spread and List. Both are drawn by one function, `drawActuators` in `desktop/src/renderer/renderer.ts`, which is why it is expected to hold, and that is not the same as having seen it.

- [x] A visible card becomes the document continuously, a row identifies the arriving note, and input never waits for neighbours to animate. Shown by the walk's check "it grows from the card that was clicked, not from somewhere else" (first frame at the card's place and width, 1090 and 137 px) and its check that the open note's row is shown and marked in the collection. Shown by the smoke run's `document` checks that a second press 92 ms after the first lands on the row aimed at and that a press 56 ms into an opening goes through the growing document to the row under it, and by both scale walks' check "a second note opened 90 ms into the first one's opening".
- [x] The opening lasts 300 ms, inside the 250 to 400 ms the design asked to try, and can be interrupted; reduced motion opens directly with the same final state. The value is `OPEN_MS` in `desktop/src/shared/focus-ring.ts`. The smoke run's `focus` part reads "over 300 ms", and the walk records the opening's frames from 71 to 392 ms after the press. Interrupting is shown by the checks in the box above. Reduced motion is shown by the walk's check "the document is at its place and size on its first frame, and neither it nor the cards are animated" and by the `focus` check that marks the document and 16 of 16 cards instead. One duration was built and measured. No other duration in the range was tried, and nobody has judged it by eye.
- [x] Promote human title, compact ID and state; move full paths into details and keep document text flat and opaque. Shown by the smoke run's `document` checks: the heading is the note's title, then its id and its status; the path is not in the heading and is in the name a screen reader is given; "details", pressed, is where the path is. A document turned away from is dimmed under a veil and stays opaque (`focus` part), and no rule blurs anything (`glass-style` suite). The design asked for nearly opaque; a document is fully opaque, because a see-through one showed the list's text through its own (commit `2d3b77a`).
- [x] Dragging text selects it, scrolling stops inside the document and moving by its header preserves size. Shown by four checks of the `glass-desktop` walk: the wheel scrolls the document to its end "and, there, does not zoom or turn the field", "and the same at its top", dragging across the text selects it and moves nothing, and dragging the header moves the document with its size unchanged.

## Steps

- [x] Reuse the existing rendered HTML and pane identity. The document's text is the sidecar's rendered note, compared character for character by the smoke run's `document` part.
- [x] If an action is currently offered, place its existing presentation with the document and keep its current capability guard. The verbs are drawn by the same function as in the reader, into the document, and are absent on a served page (the `served` check "the served page is drawn no verb and no tick").
- [x] Exercise multiple documents, a view switch, a reload and the served read-only host. The walk opens three documents, reloads with one open, and reads a note on the served page; the smoke run's `desks` part switches views with documents open; the `served` part holds 6 checks.

## Notes

ISS-0071's rule for the chosen size was built under FEAT-0017 in [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] (commit `81d4632`) and is what the second box cites.

**This task stays `doing`.** One box is open: no check draws a disabled verb inside a Glass document.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `4243fc2`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb). The smoke run's `document` part held 14 checks of 14 and its `served` part 6 of 6; the `glass-desktop` walk held 54 of 54 ([[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]). Every time above is the container's, which draws in software. Nothing here says how fast a note opens on the Mac.

**Two later fixes belong here.**

- A note the view does not hold is read from the card it was opened with (commit `f5d6ba9`). On a served page, a link to such a note opened a document that said the note "is on the desk and cannot be read here", and went on saying it. The `served` check on a link to RISK-0001 reads "ready, 5187 characters ... it passed through loading then ready", and would read "missing" if the defect came back.
- A document that leaves the desk has its panels closed however it left (commit `1a71001`). Closing every note with Escape used to leave a note's related list open the next time that note was opened. The change is made where a document is removed from the page (`desktop/src/renderer/glass.ts`). No check asserts it.

Where the verbs stand in Glass is recorded in [[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]], which stays open for Spread and List.

The acceptance check [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is a person's walk and has not been walked.
