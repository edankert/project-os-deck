---
type: "[[task]]"
id: TASK-0113
title: "Show evidence beside the claim in the Glass document"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
parent: "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"
effort: L
due: ""
depends: ["[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]", "[[TASK-0112-Forward-The-Acceptance-Record-As-A-Read]]"]
blocks: ["[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
related: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0013-The-First-Write]]"]
tests: ["[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]", "[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]"]
---

# Show evidence beside the claim in the Glass document

A note opened as a document on the Glass desk gains an evidence control and a panel. The panel draws what TASK-0111's module returns and adds no rule of its own. Where the panel sits follows FEAT-0024's four placement decisions, which come from DES-0003.

## Definition of Done

- [ ] A document's header shows an evidence control with the number of tests that name the note, taken from Deck's index with no request. A note no test names shows the control with "no test names this note" and no count that could read as a result.
- [ ] The panel is closed when a document opens. The note's text is readable without opening it. The acceptance payload is not requested until a panel that needs it is opened, and it is requested only when at least one listed test is at `level: acceptance`.
- [ ] Opening the control shows the panel inside the same document: beside the text when the document is wide enough, above it when it is not. It moves, resizes and closes with the document. No second spatial object is made for the note.
- [ ] Each row shows the test's title before its id, the key it was found under in the words ADR-0008 A1 gives ("its `covers:` names this note", "named in this note's `tests:`"), and what is recorded, using the module's sentence unchanged.
- [ ] A row for an acceptance check shows the mark, date, author, method and platform, labelled "verdict", with its source named as the acceptance ledger. The test note's own status is on a separate line labelled "status of the test note". With several ledger platforms, each platform's verdict is shown with its name.
- [ ] A row for an invalidated check shows the invalidation, the change and the date first, and the verdict before it marked as no longer standing.
- [ ] "History" on an acceptance row opens every recorded event for that check, newest first, with platform, date, mark, author, method and reason.
- [ ] A row for a manual test below acceptance level shows its status and last-verified date, labelled as coming from the test note, and the stale label with the rule's name when the module says it is stale.
- [ ] A row for a test with a command shows the module's sentence and the command. It carries no mark, no date and no colour used elsewhere for a pass or a fail.
- [ ] When the acceptance payload could not be read, the panel shows "the acceptance record could not be read" and the reason once, and every acceptance row shows that in place of a verdict. The rows that need no ledger are still shown.
- [ ] Each row has "Excerpt", which shows the test note's rendered text under its heading that begins with "Evidence", read from `/api/render` when asked. A note with no such heading shows "this test note has no Evidence section". Nothing is quoted from any other part of any note.
- [ ] Each row has "Open the test note", which opens that note as a document by the existing route and scrolls it to its Evidence heading when it has one. A test note already on the desk is found and raised, not opened twice. Closing it returns focus to the row.
- [ ] `artifacts` is shown as the paths the test note lists, as text. They are not links.
- [ ] In the note's text, a criterion line gets an evidence control only when the line itself links a test note. The control reads "evidence named on this line" and opens the panel limited to the tests that line names. A line that links none gets no control. The control stands at the end of the criterion's own words (FEAT-0024, decision 6) and does not wrap, replace or change the line's checkbox, and `data-raw` on the checkbox is untouched.
- [ ] A test note's own document has the control too, and its panel shows that test's own row.
- [ ] Keyboard: the header control and each criterion control are reachable by Tab in document order and operated with Enter and Space. Inside the panel the rows and their controls are reachable in order. Escape closes the panel and returns focus to the control that opened it. Focus is always visible. The panel has an accessible name, and each row's sentence is text a screen reader reads, not colour alone.
- [ ] Under `prefers-reduced-motion: reduce` the panel appears and disappears without travel.
- [ ] Scrolling inside the panel does not turn or zoom the field at its edge, as REQ-0002 requires of the document.
- [ ] The panel holds no control that records, changes or re-runs anything. Ticking a criterion with evidence is still the checkbox's own action in the shell (FEAT-0013) and is unchanged.
- [ ] The served page, with no preload bridge, shows the same control, panel, rows, excerpt and history through the same reads.
- [ ] Nothing about evidence is written to the store or the state file.
- [ ] `npm test` in `desktop/` passes, and the smoke run's existing document checks pass unchanged.

## Steps

- [ ] Read ADR-0008, FEAT-0024's four placement decisions, DES-0003's "Readable document and continuous opening" and "Input and focus contract", and REQ-0002.
- [ ] Add the header control and the panel to the Glass document, fed by `desktop/src/shared/evidence.ts`.
- [ ] Add the criterion control from the rendered note's lines and their links.
- [ ] Add the excerpt, the history and the route to the original.
- [ ] Check the keyboard route, reduced motion, a narrow window and the served page by hand in the box before TASK-0114 scripts them.

## Notes

Nothing is built by this note. How several platforms' verdicts for one check are laid out is left to this task and recorded here when chosen; ADR-0008 fixes only that each is shown with its platform's name.

On 2026-10-02 `desktop/src/renderer/glass.ts`, `renderer.ts` and `deck.css` had uncommitted changes in the working tree from the implementing session. This note was written from the requirement and not from those changes.

Window-opening runs on the Mac take the keyboard from whoever is typing (ISS-0075). Check by hand in the box, and hold a Mac window until Edwin agrees.
