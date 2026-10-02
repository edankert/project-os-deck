---
type: "[[feature]]"
id: FEAT-0017
aliases: ["FEAT-0017"]
title: "An opened note stands in the middle of its neighbours: in Glass and in the orbit a lifted note moves to the middle of the field, and the notes it is joined to gather on a ring around it"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-10-02
source: ["Edwin 2026-09-11: 'when selecting something in orbit the main item should open up and all the directly connected items show as mini notes'", "Edwin 2026-09-11: 'when selecting in glass, the opened up item should replace the note (possibly move to the center?? Review and research how this work fully online) and the associated notes should show their connections and should be shown around the opened note.'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]", "Edwin: This sounds great update the documents to support this fully."]
goal: "A selected note opens at the person's chosen reading size with its existing related cards around it. Moving the document preserves that size and carries its neighbourhood. A note has one spatial object, and off-screen neighbours remain reachable."
requirements: []
tasks: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]", "[[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
release: ""
acceptance_exception: ""
design: ["[[DES-0002]]", "[[DES-0003]]"]
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0056-Reach]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]", "[[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]]", "[[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[FEAT-0020]]", "[[DES-0003]]"]
---

# An opened note keeps its size and neighbourhood

## Goal

The selected note opens as one document with its related notes around it. The document keeps the reading size the person chose. Moving it carries the neighbourhood without duplicating cards or re-dealing the whole field.

The first implementation, of 2026-09-11, drew each neighbour twice, sized the note from the number of its neighbours and ended the arrangement on a drag. Edwin rejected all three on 2026-09-12 (ISS-0070, ISS-0071, ISS-0072). TASK-0104 repaired them together, and the repair is built and committed. The rules below describe it. "Current state" says what has been shown and what is still owed.

## Scope and ownership

- Move the actual related cards into the neighbourhood. Each spatial note is represented once; remove the empty field-card ghost.
- Respect the selected document's stored size and the person's preference for newly opened documents. Moving is not resizing.
- Preserve relative neighbourhood order while dragging the document. Permit a workspace larger than the viewport, with a complete linked list and a named route to off-screen work.
- Keep pointer, keyboard, reduced-motion and shared Orbit focus behavior consistent.
- Preserve the field's unrelated slots and restore surviving objects when leaving focus.

FEAT-0020 owns the new on-desk collection, full-document presentation, input handoff and opening calibration. FEAT-0022 owns optional presentations and arrangement commands. Saved scenes belong to FEAT-0023. This feature does not introduce source writes or cockpit information levels.

## Current interaction decisions

1. **One note has one spatial object per desk.** A focused document and its neighbours reuse the existing note objects. A collection reference row or accessible list entry can remain visible. The original slot is reserved without drawing an empty frame.
2. **Chosen size is authoritative.** Opening and focus use the person's reading-size preference. An explicit resize can update it; a drag cannot. Neighbour count never forces the document to shrink.
3. **The neighbourhood uses readable cards in a larger workspace.** Preserve circular order and avoid crossing through the document. The former sixteen-mini-card viewport limit is not the repaired contract. Count and expose all related notes through the linked list, with location controls for off-screen cards.
4. **Movement preserves the group.** Dragging the focused header translates the document and neighbourhood together. It neither leaves focus nor re-deals unrelated cards. The resize control remains available deliberately.
5. **Shared objects are reused.** A held neighbour remains its document rather than gaining another ring card. A neighbour shared by two held subjects has one spatial representation and the appropriate connections.
6. **Connections state their source.** Keep incoming/outgoing direction and the source sentence where available. FEAT-0020 adds clear semantic labels only when supported by the source; FEAT-0022 may emphasize relation types without altering membership.
7. **The rest of the field retains context.** It can dim and step back, but it retains its unrelated slots. A person can select another note without losing already opened documents.
8. **Opening remains continuous and interruptible.** The initial implementation used a 300 ms grow followed by a 700 ms gather. DES-0003 and TASK-0097 now own calibration of a shorter opening for the new Glass desktop. No new timing claim is satisfied by the old measurement.
9. **Glass can retain several readable documents.** FEAT-0020 replaces the forced header-only dock rule for the on-desk collection/document surface. Collapsing a document is deliberate and reversible. Orbit retains its arrangement-specific presentation except for the shared continuity repairs.
10. **Escape consumes one state change.** A local menu, drag or preview consumes Escape first. Otherwise Escape leaves focus and keeps held documents; a subsequent deliberate Escape outside focus retains the existing sweep. Closing one document returns to its initiating reference when it survives.
11. **Input belongs to the object under it.** Scrolling text does not zoom the field, and dragging text selects text. Header drag moves the group. Keyboard users can perform the same movement, resize, locate and return operations.
12. **Reduced motion changes no outcome.** The same state appears directly with a static indication. Orbit drift stops while its note is focused, and its stable background arrangement returns when focus is left.
13. **Session and saved state stay distinct.** Existing desk positions and chosen sizes persist according to their contract. Focus and camera orientation remain session state until FEAT-0023 decides otherwise. The served tablet remains read-only.

## Decisions

Details settled while building TASK-0104. The reasons are the ones the commits and the code give; where they give none, this says what was done.

1. **A gathered card is drawn at the size it is browsed at.** A seat (the place a related card takes beside the document) is the front-band card's box at the scale of a card straight ahead, 138 by 68 pixels. Reason: Edwin, in ISS-0070, asked why the copies were smaller than the cards they had just been browsing.
2. **Seats lie on a grid round the document and run on past the left and right edges.** A seat is 14 pixels clear of the document and of the next seat. No seat stands above or below the field, because a seat there could never be turned to. Seats in sight are filled before any seat beyond an edge, so no card is sent out of sight while a seat in sight is free. No seat stands under the compass or under another document.
3. **Every neighbour has a seat.** More neighbours make the arrangement wider and never the document smaller. The smoke run opens PHASE-0002, which has 217 neighbours, and finds a place for every one. The "+N more" card is gone.
4. **The cards keep their circular order, turned to the seating that moves them least.** The geometry suite checks both. The commit gives no reason beyond the order.
5. **A note opens at 560 by 520 on a view where nobody has chosen a size.** Until this task it was 320 by 240, which holds about forty characters a line. DES-0003 asks for 60 to 80, and 560 holds about 74. It is a trial value; TASK-0097 owns its calibration.
6. **The size is written on the note's card when it is opened.** Resizing another note afterwards therefore does not change it. The view's size is kept per workspace and per view under `readingSizes` in the store, which every window reads. A state file written before that key existed loads as it was.
7. **A field too small for a document draws it smaller and stores nothing.** A window made narrow for a moment cannot overwrite a chosen size (DES-0003).
8. **The opening takes 300 ms and the gathering 400 ms.** The first implementation took 300 and then 700. DES-0003 asks for a trial between 250 and 400, and these are the trial values; TASK-0097 records what a walk decides.
9. **The whole desk stands at one bearing, and a turn moves it as one flat layer.** The desk here is the documents, the cards seated round them and the collection. Turning away moves it as far as a front-band card at that bearing moves, dims it, and past the edge of sight stops drawing it. This is how Edwin's "turning moves the note and the whole ring" was built. ISS-0071 had sketched each seat as a bearing of its own; the seats are places on the desk in pixels, and the desk has the bearing. A drag changes the document's stored place, not a bearing.
10. **A document is drawn within the field's width, with its header in sight, while the desk faces the person.** The store keeps the place a drag gave it, and the drawing stops at the field's edge. In the `focus-neighbourhood` record a drag of 420 pixels moved the document 174. The cards round it are not stopped and do run past the edge. This differs from Edwin's answer in ISS-0072 that nothing is clamped, and it is Edwin's to accept or change.
11. **Three named controls reach what is out of sight.** A counter at the field's left or right edge says how many related cards stand beyond it, and pressing it brings the nearest into view. Each row of the document's "N related" list shows where its card is. A button on the compass, reading "find" and the note's id, is offered when the desk has been turned or moved away, and brings it back.
12. **The keyboard reaches every neighbour through the document's list.** R on the document's header opens it. Until this task Tab went to the first of at most sixteen copies.
13. **Holding a note deals nothing.** The neighbourhood is no longer dealt into the front band, documents no longer push field cards aside, and leaving the focus puts each gathered card back in the slot it came from. A card can therefore stand behind a document; Hide notes uncovers it.
14. **There is no dock.** Every open document is drawn whole where the store holds it, and the one on top is the focus. A click on a seated card opens it as a second document.
15. **Escape during a drag puts the document back** and does nothing else: it does not leave the focus and it does not sweep the desk.
16. **Under reduced motion a card that is seated late is still marked.** A note opened for the first time has no cards to mark until the sidecar answers, so the document remembers that its cards are owed a mark (`b2a99d6`).
17. **The focus, the turn and the look aside belong to the window and are not stored.** The store gained one key for this task, `readingSizes`.

## Acceptance

- A lifted note and each related spatial note are drawn once, at usable size, without a duplicate card or ghost.
- Resizing the document, moving it, opening another note and returning never causes an unexplained size jump. New notes use the chosen preference.
- Moving the document moves its neighbourhood with relative order intact; off-screen members can be located and reached through the complete relationship list.
- Existing unrelated cards do not re-deal because the focused document moved.
- An already held or shared neighbour is reused, with clear link direction and supported source context.
- Local Escape actions do not also sweep the desk. Closing a document preserves other documents and restores focus appropriately.
- Field zoom retains its pointer anchor; document scrolling and text selection do not drive the camera.
- The shared focus repairs work in Glass and Orbit, with keyboard and reduced motion.
- Arranging and navigating leave the source workspace unchanged. Any source write is outside this feature.

## Impact and decision provenance

Edwin's September 12 decisions in ISS-0070/71/72 supersede the original ghost, forced-size and drag-to-exit rules. His October 1 endorsement adds the FEAT-0020 document model and the direction in DES-0003. The earlier feature decisions are preserved in version history and completed task evidence; they are no longer competing instructions for the repair.

Checked FEAT-0010, FEAT-0014, FEAT-0015, FEAT-0016, the existing focus geometry and the current collection/document requirements REQ-0001/0002. The repair preserves their identity, scrolling, desk and write-boundary constraints. FEAT-0020 depends on TASK-0104 before its final walk. TST-0052 states the repaired contract. TASK-0104 rewrote the executable assertions behind TST-0051 and TST-0045; their passes from September do not verify the repaired behavior, and the runs that do are under Verification.

## Risk scan

Repeated at close-out on 2026-10-02. No new external dependency and no new required environment variable. The state file gained one key, `readingSizes`; RISK-0007 covers it, and the `reading-size` suite checks that a file written before it existed loads. Two optional switches for scripted runs arrived with the task: `electron . --drive <script>`, which runs a walk script named on the command line, and `DECK_SMOKE_GLASS_ONLY`, which names the parts of the smoke run's Glass section to run. Neither is needed to use Deck. The larger neighbourhood was timed in the container only; the Mac measurement is the open box in TASK-0104.

## Current state

**2026-10-02: the repair is built, the three issues are fixed, and the feature stays at `review`.** The code is in `81d4632` and `b2a99d6`, and the smoke run's checks for it in `6be167a`. ISS-0070, ISS-0071 and ISS-0072 are `fixed`, each on a named check. TASK-0104 is `doing` with one box open: the rendering cost on the Mac. TST-0052, the walk a person makes, has not been walked, and the acceptance ledger holds no verdict for it. DES-0002 and DES-0003 are `proposed`; accepting them is Edwin's. One built detail differs from an answer Edwin recorded: a dragged document stops at the field's edge (Decisions, item 10).

## Verification

Run on 2026-10-02 at `4243fc2`, in a Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), from a separate clone. `main` has moved on since by notes and one word in a code comment.

- **Node suites.** `npm test` in `desktop/` builds and runs every suite: 586 of 586 on 2026-10-02 at `9379a0c`, the last commit before `4243fc2` that changed application code. This feature's suites are `focus-ring` (15 tests, TST-0051) and `reading-size` (14 tests, TST-0065).
- **The smoke run as CI runs it.** `bash tools/scripts/smoke-in-a-box.sh both` exited 0 after 1131 seconds, on loopback and then on the network.
- **The smoke run with each check printed.** The loopback half was run once more at the same commit: 389 passed, 0 failed, 0 skipped, 2 not applicable (a throw to a display with no window, on a machine with one display; the tablet-shaped checks, which the network half makes). The Glass section passed 291 checks. The parts that bear on this feature: `focus` 47, `lift` 27, `panes` 21, `orbit` 22, `zoom` 15. TST-0045 lists every part.
- **The walk `glass-desktop`.** 54 checks, none failed. Among them: the open note is one object and no neighbour is drawn twice; every card is back where it stood after Escape (24 compared); dragging the header moves the document with the 29 cards round it at 560 by 520; the corner resizes it and the view keeps that size for the next note; "find" brings it back after a turn; a narrow window stores no size.
- **The walks `glass-scale` and `glass-scale-your-trainer`.** 8 checks each, none failed. The most linked-to note opens with every neighbour seated once: 63 on this repository and 217 on Your Trainer. A note joined to more than one open note is one card.
- **The walk `focus-neighbourhood`.** The pass's summary does not list it. A record of it was written in the clone at 03:42 on 2026-10-02. It makes no pass-or-fail checks. It logged 43 neighbours as 43 cards each drawn once, no ghost, and a drag that kept the size and every offset. Its step that turns the field now starts on a row of the collection and opens a second note instead, so that record shows no turn and no "find". The script needs correcting.

A scripted walk sends real pointer and key events to the real application and checks what is on screen. It is not a person's walk.

Not done:

- TST-0052 has not been walked by a person. It rests at `active` and the ledger holds no verdict.
- Nothing was timed on the Mac. Every timing above is the container's, which draws in software.
- Nothing was tried on a second display, with a display unplugged, on a real tablet, with a screen reader or by touch.
- In the orbit, a drag and a resize of the document were not driven. No run opened a note in a second window to watch it take the view's size.
- No check written for the repair was broken on purpose to see it fail. Two were seen to fail on real defects before the renderer was fixed (TST-0045, "2026-10-02").
- The first implementation's evidence is in TASK-0067 to TASK-0071. It was taken under the contract Edwin rejected and verifies none of the above.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Repair: [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]
- Acceptance: [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]
- Geometry, reading size and the smoke run: [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]], [[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]], [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Issues, all fixed on 2026-10-02: [[ISS-0070]], [[ISS-0071]], [[ISS-0072]]
- Interaction specification: [[DES-0003-Collections-And-Documents-On-Glass]]
- Change note: [[CHG-20261002-Glass-Collections-Documents-And-Arrangements]]
