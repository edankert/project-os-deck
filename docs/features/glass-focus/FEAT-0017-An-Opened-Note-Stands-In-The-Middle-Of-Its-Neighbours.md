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
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-02
review_round: 1
review_verdict: changes-requested
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
4. **The cards keep their circular order, turned to the seating that moves them least, and two neighbours with an equal claim to a seat are seated by id.** The geometry suite checks all three since `0fc2c46`. Until then it checked the order alone: the review took out the turn and the tie-break, and the suite still passed (Review, rows T1a and T1c). The commit that built them gives no reason beyond the order.
5. **A note opens at 560 by 520 on a view where nobody has chosen a size.** Until this task it was 320 by 240, which holds about forty characters a line. DES-0003 asks for 60 to 80, and 560 holds about 74. It is a trial value; TASK-0097 owns its calibration.
6. **The size is written on the note's card when Glass opens it, and resizing one note changes no other note.** The view's size is kept per workspace and per view under `readingSizes` in the store, which every window reads. A state file written before that key existed loads as it was. Some cards hold no size of their own: a note Spread put on the desk, a note another window handed over without a size, and every card in a state file older than TASK-0104. Such a note is drawn at the view's size. Until `0d39033` it therefore changed size when any other note was resized, and the review found it (Review, row 2a). The store now gives each such note the size it is drawn at, just before a resize changes the view's size.
7. **A field too small for a document draws it smaller and stores nothing.** A window made narrow for a moment cannot overwrite a chosen size (DES-0003). The review found one way it could, a press on the resize corner; decision 20 closes it.
8. **The opening takes 300 ms and the gathering 400 ms.** The first implementation took 300 and then 700. DES-0003 asks for a trial between 250 and 400, and these are the trial values; TASK-0097 records what a walk decides.
9. **The whole desk stands at one bearing, and a turn moves it as one flat layer.** The desk here is the documents, the cards seated round them and the collection. Turning away moves it as far as a front-band card at that bearing moves, dims it, and past the edge of sight stops drawing it. This is how Edwin's "turning moves the note and the whole ring" was built. ISS-0071 had sketched each seat as a bearing of its own; the seats are places on the desk in pixels, and the desk has the bearing. A drag changes the document's stored place, not a bearing.
10. **A document is drawn within the field's width, with its header in sight, while the desk faces the person.** The store keeps the place a drag gave it, and the drawing stops at the field's edge. In the `focus-neighbourhood` walk a drag of 220 pixels to the right moved the document 174. The cards round it are not stopped and do run past the edge. This differs from Edwin's answer in ISS-0072 that nothing is clamped, and it is Edwin's to accept or change. ISS-0072 sets what is built beside what he said, under "The document stops at the field's edge, and whether it should is Edwin's choice".
11. **Three named controls reach what is out of sight.** A counter at the field's left or right edge says how many related cards stand beyond it, and pressing it brings the nearest into view. Each row of the document's "N related" list shows where its card is. A button on the compass, reading "find" and the note's id, is offered when the desk has been turned or moved away, and brings it back.
12. **The keyboard reaches every neighbour through the document's list.** R on the document's header opens it. Until this task Tab went to the first of at most sixteen copies.
13. **Holding a note deals nothing.** The neighbourhood is no longer dealt into the front band, documents no longer push field cards aside, and leaving the focus puts each gathered card back in the slot it came from. A card can therefore stand behind a document; Hide notes uncovers it.
14. **There is no dock.** Every open document is drawn whole where the store holds it, and the one on top is the focus. A click on a seated card opens it as a second document.
15. **Escape during a drag puts the document back** and does nothing else: it does not leave the focus and it does not sweep the desk.
16. **Under reduced motion a card that is seated late is still marked.** A note opened for the first time has no cards to mark until the sidecar answers, so the document remembers that its cards are owed a mark (`b2a99d6`).
17. **The focus, the turn and the look aside belong to the window and are not stored.** The store gained one key for this task, `readingSizes`.

Seven more were settled on 2026-10-02, by the fixes for the independent review and by one fix made under FEAT-0024. Where a reviewer's finding left a choice open, the session that fixed it chose, and each choice is written here. The reasons are the ones the commits and the code give.

18. **A note with no size of its own is given one only when a resize is about to change the view's size.** Nothing is rewritten when the state file is loaded: until somebody resizes a note, such a card is the card it always was. A card with one side stored keeps that side and is given the other. However many notes are given a size, the resize is one change to the store (`0d39033`).
19. **A note kept on every view is given the size it has on the view where the resize happened.** That is the view in front of the person. The note then has that size on every view (`0d39033`).
20. **A press on the resize corner becomes a drag once it has moved more than 5 pixels, and a press that stays inside that stores nothing.** Five pixels is the distance a drag of the header allows before it counts as a drag. Until `fb829b0` a press and release on the corner stored the size the document was drawn at, on the note and as the view's size. In a field too small for the document that is the fitted size, so a size nobody chose replaced the one a person chose.
21. **A drag of the corner is measured from the size the note has, and while it lasts the document is drawn fitted to the field.** The keyboard's corner, Alt with an arrow, already started from the stored size. What is drawn during the drag is what will be drawn once the size is stored. The rule is one function with no window in it, `cornerResize` in `desktop/src/shared/panes.ts`, so a node suite can test it (`fb829b0`).
22. **Escape during a drag of the corner puts the size back and does nothing else.** It takes the route Escape during a drag of the header takes (decision 15), so it does not also leave the focus or sweep the desk. Escape pressed before the press has moved 5 pixels cancels nothing, because there is no drag yet (`fb829b0`).
23. **A neighbour no card can be made for is given no seat.** It stays in the document's list of related notes, which is drawn from all the neighbours. Until `b3646d0` such a neighbour took a seat that stood empty, and the next card was sent a place further out. No route through the application produces such a neighbour today.
24. **The field every document stands in is clipped and cannot be scrolled.** Until `2b2a928` it hid its overflow, and a box that hides its overflow can still be scrolled by script: putting the keyboard on a row inside a document scrolled the field and left every document that far up under the bar (found under FEAT-0024).

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

Repeated at close-out on 2026-10-02. No new external dependency and no new required environment variable. The state file gained one key, `readingSizes`; RISK-0007 covers it, and the `reading-size` suite checks that a file written before it existed loads. Two optional switches for scripted runs arrived with the task: `electron . --drive <script>`, which runs a walk script named on the command line, and `DECK_SMOKE_GLASS_ONLY`, which names the parts of the smoke run's Glass section to run. Neither is needed to use Deck. The larger neighbourhood was timed in the container only; the Mac measurement is the open box in TASK-0104. The fixes for the review, merged in `0dc5708`, add no dependency, no environment variable and no key to the state file. One of them changes what a resize writes: the cards of other notes that had no size are given one (decision 18), in fields the state file already had.

## Current state

**2026-10-02: the repair is built, the three issues are fixed, an independent review asked for changes and they are made, and the feature stays at `review`.** The code is in `81d4632` and `b2a99d6`, the smoke run's checks for it in `6be167a`, and the walk `focus-neighbourhood`, rewritten to make checks, in `f7bdd46`. Two reviewers read it at `5e66f48`. They refuted one acceptance criterion in part and both node suites in part, and the fixes are the five commits merged in `0dc5708` (Review). ISS-0070, ISS-0071 and ISS-0072 are `fixed`, each on a named check. Six things are still owed:

- Round two of the review, which reads the fixes. It has not been run, and the verdict in this note's frontmatter is round one's.
- A run of the three checks `fb829b0` added to the walk `focus-neighbourhood`, about the resize corner. No pass this note cites has run them.
- TASK-0104 is `doing` with one box open: the rendering cost on the Mac. Nothing has been timed there.
- TST-0052, the walk a person makes, has not been walked, and the acceptance ledger holds no verdict for it.
- ISS-0071 keeps one box open: a note opened in a second window taking the size chosen on that view. The walk `glass-collection` compares the two sizes since `e3f1460`. The box stays open until a pass cited here has run that check.
- Two things are Edwin's to judge. A dragged document stops at the field's edge, which differs from an answer he recorded (Decisions, item 10). Six cards that all stood to one side of a document are seated on both sides of it (Review, "Other findings").

DES-0002 and DES-0003 are `proposed`; accepting them is Edwin's.

## Verification

Run on 2026-10-02 at `e86b2e4`, in a Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), from a separate clone. This is the pass the reviewers were handed. The fixes for the review came after it, and no pass that ran them is recorded here yet.

- **Node suites.** `npm test` in `desktop/` builds and runs every suite: 589 of 589 on 2026-10-02 at `e86b2e4`. This feature's suites are `focus-ring` (15 tests, TST-0051) and `reading-size` (14 tests, TST-0065).
- **The smoke run as CI runs it.** `bash tools/scripts/smoke-in-a-box.sh both` exited 0 after 1148 seconds, on loopback and then on the network.
- **The smoke run with each check printed.** The loopback half was run once more at the same commit: 389 passed, 0 failed, 0 skipped, 2 not applicable (a throw to a display with no window, on a machine with one display; the tablet-shaped checks, which the network half makes). The Glass section passed 291 checks. The parts that bear on this feature: `focus` 47, `lift` 27, `panes` 21, `orbit` 22, `zoom` 15. TST-0045 lists every part.
- **The walk `focus-neighbourhood`.** 8 checks, none failed. It opens FEAT-0015 from its card and finds one object for each note, a card and a line for each of its 44 neighbours, and a list that names all 44. A drag of the header keeps the document 560 by 520 and every card at its place beside it. A drag from a point of the field's background turns the field, "find FEAT-0015" is offered, and pressing it brings the document back whole without turning the field again. After Escape each of the 24 other cards is where it stood.
- **The walk `glass-desktop`.** 54 checks, none failed. Among them: the open note is one object and no neighbour is drawn twice; every card is back where it stood after Escape (24 compared); dragging the header moves the document with the 29 cards round it at 560 by 520; the corner resizes it and the view keeps that size for the next note; "find" brings it back after a turn; a narrow window stores no size.
- **The walks `glass-scale` and `glass-scale-your-trainer`.** 8 checks each, none failed. The most linked-to note opens with every neighbour seated once: 63 on this repository and 217 on Your Trainer. A note joined to more than one open note is one card.
- **The walk `glass-collection`.** 11 checks, none failed. One bears on this feature: a note was resized to 624 by 552 and the next note opened in the same window was 624 by 552. The same check opens a note on the served page, and ISS-0071 says why that does not show a second window taking the size.

A scripted walk sends real pointer and key events to the real application and checks what is on screen. It is not a person's walk.

Not done:

- TST-0052 has not been walked by a person. It rests at `active` and the ledger holds no verdict.
- Nothing was timed on the Mac. Every timing above is the container's, which draws in software.
- Nothing was tried on a second display, with a display unplugged, on a real tablet, with a screen reader or by touch.
- In the orbit, a drag and a resize of the document were not driven.
- In this pass no check compared the size of a note opened in a second window with the size chosen on that view (ISS-0071, "What is not shown"). The walk `glass-collection` makes that comparison since `e3f1460`, and no pass cited here has run it.
- No check that runs in a window was broken on purpose to see it fail: not the smoke run's `focus` part and not a walk. Two were seen to fail on real defects before the renderer was fixed (TST-0045, "Adequacy of the rewritten `focus` part"). The two node suites were broken on purpose by the reviewers, eight times, and failed four times; Review says which, and TST-0051 and TST-0065 say what was added.
- The first implementation's evidence is in TASK-0067 to TASK-0071. It was taken under the contract Edwin rejected and verifies none of the above.

## Review

**Round one, 2026-10-02: changes requested, by both reviewers.** Two reviewers read the packet at `5e66f48`, each in a clean context and in a clone of its own, and each ran node suites only. Both are `model:claude-opus-5-5`, which is very likely the model that wrote the work; what was independent is the context. Each broke four guards, which means taking a rule out of the built code to see whether a test fails. A test failed for four of the eight: three of reviewer A's and one of reviewer B's. Reviewer B said that four is one more than the review procedure allows. Both refuted one acceptance criterion in part, and between them they refuted both node suites in part. Everything only a window could settle they marked *not checked*.

**Refuted.** Row T1b counts as refuted because reviewer B's break passed the suite, though reviewer A broke the same rule another way and a test failed.

| # | Claim | Verdict | Evidence | What was done |
| --- | --- | --- | --- | --- |
| 2a | Resizing the document never causes an unexplained size jump (acceptance criterion 2, its first part) | refuted (both) | A note that carries no size of its own changed size when a different note was resized. The steps, through the built reducer and `readingSizeFor`: `put-on-desk` A with no size, `put-on-desk` B at 560 by 520, `resize-card` B to 820 by 700. Reviewer A's `fuzz.cjs` printed `A before B is resized: {"w":560,"h":520,"from":"first-use"}` and then `A after  B is resized: {"w":820,"h":700,"from":"view"} card A: {"noteId":"A","x":10,"y":10,"z":1}`. Reviewer B's probe printed `before B is resized: A stored undefinedxundefined, drawn 560x520 (first-use)` and then `after B is resized: A stored undefinedxundefined, drawn 820x700 (view)`. Both named three ways a card has no size: Spread's `toggleOnDesk` (`renderer.ts:1854`), a handoff with `request.size === null` (`main.ts:388`), and a state file saved before TASK-0104. Reviewer A: "I did not confirm in a window that Glass then shows the jump." | Before a resize changes the view's size, the store gives every other note on that desk with no size of its own the size it is drawn at. Three tests in the `reading-size` suite hold it, and the commit says all three fail with the new step taken out: "a note with no size of its own is drawn the same before and after another note is resized", "a state file older than reading sizes: its notes hold their size when one of them is resized" and "a note on every view holds the size it is drawn at where the view already has a size". `0d39033`. Decisions 6, 18 and 19. |
| T2 | TST-0065 fails when "resizing one note leaves every other open note the size it was" is broken | refuted (reviewer A). Reviewer B broke no guard in this suite and named the same gap | Reviewer A: "The other-notes test passes only because it opens both notes with an explicit size; the case in claim 2 is not in it." Reviewer B: "no test resizes one note while another note with no size is open." | The three tests named in row 2a. The first of them puts a note on the desk with no size beside one that is resized. `0d39033`. |
| T1a | TST-0051 fails when the seating is never turned. Decision 4 said "turned to the seating that moves them least. The geometry suite checks both" | refuted (reviewer B). Reviewer A did not check circular order | In `src/shared/focus-ring.ts`, `if (cost < bestCost - 1e-9)` became `if (r === 0)`, and `node --test tests/focus-ring.test.mjs` printed `pass 15, fail 0`. "Over 200 random neighbourhoods the unbroken code never moved the cards more than the best turn (0 of 200) and the broken code did in 134 of 200." The suite's one test for it placed each neighbour exactly on a seat, where no turn is needed. | New test "whatever stood where, no other turn of the seating moves the cards less than the one chosen": 300 neighbourhoods made from a fixed seed, 198 of which need a turn. `0fc2c46`. |
| T1b | TST-0051 fails when a card is sent out of sight while a seat in sight is free (decision 2) | refuted (reviewer B) | `if (!inSight && found.length >= count) break;` became `if (found.length >= count) break;`, and the suite printed `pass 15, fail 0`. With the break, a document against the left edge with 20 neighbours sent 5 off to the left while seats in sight were free, and with 40 sent 16; unbroken, none. The suite's left-edge test asked for 12 seats only. Reviewer A removed the sort key that puts seats in sight first, and one test failed: `pass 14 fail 1`. | The left-edge test also asks for 20, 40 and 51 seats, all in sight, and for 52 and more, of which 51 are in sight. New test "wherever the document stands, no card is sent out of sight while a seat in sight is free": 250 layouts. `0fc2c46`. |
| T1c | TST-0051 fails when two neighbours with an equal claim are not seated by id | refuted (reviewer B) | With the tie-break by id taken out: `pass 15, fail 0`. "the test is titled '... goes below, by id' and asserts nothing about the two ids." | New test "two neighbours with an equal claim are seated by id, whichever was named first": asserted on the two ids, for five kinds of tie and both orders of naming. `0fc2c46`. |
| T1d | TST-0051 fails when a seat is closer than 14 pixels to the document (decision 2) | refuted (reviewer A) | `const keepOut = doc;` in `dist/shared/focus-ring.js` printed `M1 keepOut=doc: suite pass 15 fail 0` and `cases 3000 {"short":0,"overDoc":0,"nearDoc":458, ...}`. So 458 of 3000 generated layouts put a seat closer than 14 px to the document and the suite still passed. "The test only tries centred documents at fixed sizes, where the break changes nothing." | New test "no seat is closer than the gap to a document of any size, wherever it stands in the field": 400 layouts, 54 of which seat a card too close with the gap taken out. `0fc2c46`. |

The commit `0fc2c46` says each of the four seating rules was broken again in the built module once the tests were added, and that every break then failed at least one test. That run was the fixing session's own, not a reviewer's.

**Held.** A seat is the size a card is browsed at, 138.24 by 68.38: the "usable size" in criterion 1 (reviewer A). Moving a document changes no size (2b, both: `move-card` writes only `x` and `y`). A new note takes the size chosen on its view (2d, both, in the reducer: reviewer A took out the line that writes it and two `reading-size` tests failed). Arranging and navigating write nothing to the workspace (9, reviewer B, from the diff alone: the only writes it adds are in the walk harness; reviewer A did not check it). In TST-0051, no seat lies over the document or another seat (reviewer A removed the keep-out and three tests failed), and a neighbour with no place goes below (reviewer B sorted it to the top and one test failed). In TST-0065, the next note takes the view's size. Reviewer A also ran the unbroken layout over 3000 generated layouts: every neighbour was seated, no seat was over or within 14 px of the document or another seat, none was outside the field's height or under a box to be avoided, none was beyond an edge while a seat in sight was free, and no seat was given twice.

**Not checked, because only a window could settle it.** That a note and each of its neighbours is drawn once, with no duplicate and no ghost (1). That opening another note and returning changes no size (2c), and that a second window takes the view's size (part of 2d). That a moved document carries its neighbourhood in order (3a), and that neighbours out of sight are found and reached through the list (3b). That unrelated cards are not dealt again (4). That a held or shared neighbour is reused, with the link's direction and its source sentence (5). That a local Escape does not also sweep the desk (6a), and that closing a document keeps the others and returns focus (6b, which reviewer B did not read either). That zoom keeps its pointer anchor, and that scrolling and selecting text do not drive the camera (7). The focus repairs in Glass and the orbit, with the keyboard and under reduced motion (8): reviewer A noted that the packet itself said a drag and a resize were not driven in the orbit, "so that part has no evidence from anyone". Circular order in TST-0051, which reviewer A did not check. TST-0045, TST-0068 and TST-0072, which open a window, and TST-0052, which is a person's walk. For most of these both reviewers read the code and said what they read. Neither called that a verdict, and it is not one here.

**Other findings.** The first eight are the reviewers'. The last was found by the session that made the fixes.

| Finding | Who | What was done, or why it is kept |
| --- | --- | --- |
| A press and release on a document's resize corner, with no movement, stored the size the document was drawn at. In a field smaller than the document that is the fitted size, against decision 7. The pointer resized from the drawn size and the keyboard from the stored size. Read, not run. | both | Fixed. A press that has gone no further than 5 pixels asks for nothing, and a drag is measured from the size the note has. The `reading-size` suite holds the rule: "a press and release on the corner asks for nothing, and a drag of it starts from the size the note has". In a window it is a new check in the walk `focus-neighbourhood`: "a press and release on the resize corner that does not move stores nothing: the note's size and the size the view opens notes at are what they were". `fb829b0`. Decisions 20 and 21. |
| Escape during a drag of the corner was not treated as a local action. It left the focus, or with no focus it reached the sweep of the desk. Read, not run; reviewer B did not confirm that a resize can be started with no focus. | both | Fixed. Escape puts the size back and goes no further. The rule is in the renderer, which no node suite loads, so two new checks in the walk `focus-neighbourhood` hold it: "Escape during a drag of the corner puts the document back at the size it had, and letting the corner go afterwards stores nothing" and "that Escape goes no further: the note is still the focus and still open". `fb829b0`. Decision 22. |
| `src/shared/store-state.ts` held raw NUL bytes inside string literals. `file` called the source `data`, and `grep` returned no matches in it. The reviewer counted two literals and thought it probably not this feature's change. | A | Fixed. There were four, on the one line that joins a filter's values. Each raw byte is now the escape `\0`, which is the same one-character string. The store suite's test "two filters are the same only when every value is, and the store's source is text" fails on the old file. `6f585e8`. |
| A seated neighbour for which no card can be built kept its seat and got no card. | A | Fixed. Who takes a seat is decided before the seats are counted. The seating suite holds it: "a neighbour no card can be drawn for is given no seat, and neither is one that is a document on the desk". No walk shows it, because no route through the application produces such a neighbour today. `b3646d0`. Decision 23. |
| Seats are not checked again after a move. After a drag a seated card can stand under another document or above the field's top, which the seating rules out when the cards are first seated (decision 2). | B | Kept as it is. The neighbourhood moves with its document. That is the repair ISS-0072 asked for: "Dragging the opened note moves the ring with it, at the same offset". Until it, a drag ended the arrangement and dealt every card again. The seats are kept as places beside the document, and they are worked out again when the document's size, the field's height or the set of neighbours changes, not when the document is dragged. |
| Six cards that all stood to one side of the document are split across both sides. With six neighbours within 0.3 radians of due right, three were seated on the left. | B | Kept as it is. The reviewer's reading is that it follows from seats at fixed places (decision 2). Whether it counts as "relative order intact" the reviewer called the owner's call, and it is Edwin's to judge. |
| TST-0051 and TST-0065 stand at `active`, not `passing`, though both suites pass, and the gate for `done` needs them `passing`. | B | Kept as it is. Each has a `command:`, and a test with a `command:` records no verdict of its own (`STATUSES.md`, `[[test]]`). The run of the command in CI is its verdict. |
| The packet's index lists `desktop/src/renderer/ring-view.ts`, which is not in its "Files changed" list and does not exist at head. | A | Nothing to change in the code. `81d4632` deleted that file (ISS-0070), and the packet's diff carries the deletion. |
| The function that seats the cards, `seatNeighbourhood`, now builds its map of the note's linked items on every call. Before `b3646d0` it built the map only when the seating had changed. | the fixing session | Kept as it is. Since `b3646d0` the map is needed to say who takes a seat, and that comes before the test for an unchanged seating. It changes nothing a person sees. Nobody has measured what it costs. |

**After the fixes.** Not written yet. The fixes are merged in `0dc5708`, and the pass that ran every suite, the smoke run and the walks after them has not been run when this is written. Its counts go here.

**Round two has not been run.** One reviewer will read this section and the fixes and answer, for each row of the Refuted table, whether it is fixed. Until then the verdict in the frontmatter is round one's.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Repair: [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]
- Acceptance: [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]
- Geometry, reading size and the smoke run: [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]], [[TST-0065-A-Note-Opens-At-The-Size-A-Person-Chose]], [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Issues, all fixed on 2026-10-02: [[ISS-0070]], [[ISS-0071]], [[ISS-0072]]
- Interaction specification: [[DES-0003-Collections-And-Documents-On-Glass]]
- Change note: [[CHG-20261002-Glass-Collections-Documents-And-Arrangements]]
