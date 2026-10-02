---
type: "[[feature]]"
id: FEAT-0020
title: "Collections and full notes live on the Glass desktop"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "Edwin 2026-10-01: 'Okay, create the notes (requirements/features/tasks etc) which cover these changes.'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
goal: "The current derived list and any opened note's full text are movable, readable objects on the main Glass desktop. A row, document and field card identify the same note and can be used together."
requirements: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]"]
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]", "[[TASK-0097-Open-The-Full-Note-As-A-Glass-Document]]", "[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]", "[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]", "[[TASK-0100-Document-The-Glass-Interaction-Direction]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0003-Collections-And-Documents-On-Glass]]"
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]", "[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Collections and full notes live on the Glass desktop

## Goal

The person can read and operate the current derived list and an opened note's full text in Glass's main rectangle. The list and document sit on the same desk as the field and can be arranged together.

## Scope

- Move the current view's derived groups, rows, counts, search, filters and keyboard route into a resizable collection on Glass. Keep the current sidecar payload and seven view descriptions.
- Immediately open an identified document and render the full sidecar text as soon as available, with explicit loading and retry states. A compact subject header may show goal, labelled progress, state and next action above the text when the existing data supports them.
- Preserve the person's document size, multiple open notes, selection, per-view desk and window placement. Keep the collection's query identity, filters and layout, not a copied result set.
- On a narrow window or tablet, show one object at a time with an explicit return to the collection. The served tablet stays read-only.
- Reconcile field/card, row and document identity with the outcomes already chosen in ISS-0070, ISS-0071 and ISS-0072. Their fixes belong to FEAT-0017 and remain dependencies here.

The cockpit's proposed Home, four flows, seven levels and new payloads belong to [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]] after their contracts are decided. This feature does not rename or replace Deck's seven views. It does not add a write route or make an open issue count as owed without the sidecar's rule.

[[DES-0002-The-Glass-Cockpit]] remains context for the field and desk, but its list-beside-field placement is superseded for this feature by Edwin's 2026-10-01 instruction. [[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]] records the replacement contract; DES-0003 supplies the detailed proposal.

## Interaction contract

[[DES-0003-Collections-And-Documents-On-Glass]] specifies the proposed input grammar, readable treatment and opening sequence. The title comes first; compact ID and state follow. Full paths belong in details. Text stays flat at the chosen size, document bodies are nearly opaque, and shadows and restrained edges distinguish objects without blur over the moving field.

A field card becomes the document continuously. A row stays a reference and visibly identifies the arriving document. An already open note is located and raised; no duplicate spatial card or permanent ghost is drawn. Available full text and controls are usable while the motion runs; fetching text never adds a summary or animation gate. Trial an interruptible 250–400 ms transition; record the result before choosing a duration. Reduced motion applies the same state change directly.

Wheel input over either object scrolls its content and stops at its boundary. Wheel input over the field retains spatial zoom and turn. Text dragging selects text; a named header moves the object. Local controls consume Escape before the field's existing leave-focus and sweep sequence. Closing restores the initiating row or control; if the row left the refreshed result, explain that change and focus the collection. Return to collection and Find open note bring an off-screen subject back without shrinking it.

Connections name source-backed meanings, such as parent or verified by, only when the underlying relation supplies that meaning. Generic links retain their direction and source context. Every neighbour remains reachable through a matching list. Two held notes sharing a neighbour use one spatial card. This feature reads current linked documents, including a linked test or source note; structured evidence objects remain [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]].

Collection stack/table/cards, Read/Compare/Show related arrangements and relationship emphasis belong to [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]. Named scenes and polished cross-screen return belong to [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]. Existing second-window behavior still receives regression coverage here.

## Decisions

These are the routine details settled while building, under Edwin's instruction of 2026-10-01 to treat DES-0003 as the baseline and record what was decided. DES-0003 itself is still `proposed`. Each line says what was done, and why where a commit says why.

**The collection**

- The list is the same element as before, moved. The navigator's own element is put inside the collection while Glass is on screen and put back for Spread and List, so nothing about what a row is or does was written twice (`desktop/src/renderer/collection-view.ts`).
- The store keeps six values for a collection, per view: its place, its size, whether it is collapsed, and whether it is drawn as a table or as cards. It keeps no row. A stored layout that is missing a number is ignored and the default is used, rather than half of it being guessed.
- With nothing stored, the collection stands down the left of the field, 340 px wide and as tall as the field allows. That is a little wider than the column it replaces.
- The collection is drawn wholly inside the field, whatever is stored. Its resize corner is at its bottom, and a list stored half below the field could neither be read to its end nor made shorter (commit `2d3b77a`).
- "collection" is offered by name while the list is turned away from or lies under a document. On a page smaller than the desk the Mac's documents had covered the list and nothing brought it forward (`2d3b77a`).
- A key pressed in the collection, or in the narrow window's bar, does not reach the field. The field turned on Left and Right and faced ahead and behind on Home and End, and left the collection behind (`2afecf1`).
- After a view is chosen, the line "N have a place in the field" is said again once the field has dealt that view. The list is drawn before the field is dealt, so the line had counted the new view's notes against the view before (`27df2fd`).

**The list holding still**

- A change on disk waits. The collection says how many notes were added, removed and changed and offers "apply", and no row moves before that.
- The rows under "Joined to what you are holding" keep the last neighbourhood read until its replacement arrives, and until a waiting change is applied. They had vanished and come back on every save, so the row under the pointer became another row (`598ecc9`).
- The list is held on one row: the row under the pointer, else the row the keyboard is on, else the top row. When that row leaves, the next row down is held. The pointer counts as resting on the list for 0.8 seconds after it leaves, and a document takes no press while it grows, because the growing document lies over the row that was pressed (`d91fc7e`).
- The place the list is scrolled to is kept as a note and the heading it is under, not as pixels, since one note has a row under several headings (`598ecc9`).
- A press that goes down on a row and comes up on the list itself still acts on that row, if the same row is under the pointer. Rows are drawn by a pool of elements, and a redraw during the press hands the row to another element, so the browser sent the click to the list (`cee5119`).

**The document**

- The heading is the note's title, then its id, then its status. The path is under "details" and in the name a screen reader is given.
- Under the heading stands the note's goal, and then any labelled facts the note supplies: progress, what it needs, severity, when it was last verified. A fact the note does not supply is left out, not guessed.
- The opening lasts 300 ms and the gathering of the neighbours 400 ms, against 300 and 700 before (TASK-0104, `81d4632`). These are trial values. Nobody has compared durations by eye.
- A document is opaque, and one turned away from is dimmed under a veil. A see-through document showed the list's text through its own (`2d3b77a`).
- Enter on a row opens the note and puts the keyboard on its document. L goes back to the row and closes nothing. Delete closes the document and goes back to the row. R opens the related list, D the details, and W fills the field with the document (`762bdfd`, `2d3b77a`).
- Escape ends one thing each time: an open related list, then open details, then the focus, then the desk. The last two are also buttons, "put cards back" and "close all" (`2d3b77a`).
- A link inside a document opens the note it names as another document. Before, it took the window to a page Deck does not serve (`762bdfd`).
- A document keeps the card it was opened with for as long as it is open, and is read from that card when neither the view nor Deck's index has given one. A note outside the view had no card, so on a served page its document said it could not be read, and went on saying it (`f5d6ba9`).
- A document whose note has been deleted, renamed or moved keeps the text that was read, says so, and hides its ticks and verbs, which would write to a note that is not there (`598ecc9`).
- A document that leaves the desk has its related list, details and evidence closed, however it left. Closing every note at once had left the related list open for the next time (`1a71001`).
- A relationship is named by the frontmatter key its author wrote the link under, or "link". The word is never translated or reversed (`desktop/src/shared/relations.ts`).

**Where things are, and are not**

- Glass has no reader column and no column of verbs. The verbs the sidecar allows and the ticks are inside the document. On a served page neither is drawn at all.
- A field narrower than 720 px shows one object at a time, with a bar that names the collection and each open note. Nothing a narrow window does to a size or a place is stored.
- A document opened on the served page is that page's own. The desk the application keeps is not changed by it.

## Acceptance

- In Glass, the derived collection is a large, interactive object on the main surface. It can be moved, resized, collapsed and used beside a document.
- Its count resolves to the exact member rows even when some notes are out of the visible field. Search, filters, grouping, keyboard operation and changed-result announcements retain their current meaning.
- A row or card immediately opens an identified document on the main surface and shows the full authored text as soon as available. Loading and failure states preserve the source and offer retry. The document and compact header coexist; links and checkboxes work there, and any currently available action remains presented with its existing guard.
- Selecting a row highlights its card and opening its document does not discard the collection. Closing the document returns to that row and scroll position.
- Reading size, desk identity and accessible movement survive the same reload, view switch, second display and narrow-window cases the current desk supports. The served host remains read-only.
- [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] repairs ISS-0070/71/72 before integration acceptance. The walk uses full-size real workspaces and reports rendering cost against the Glass phase budget.

- Opening is continuous and interruptible, reduced motion is immediate, and full text never waits for neighbour animation.
- Header dragging, text selection, wheel boundaries, visible keyboard focus, Escape handling and return controls follow the interaction contract.
- Titles and compact metadata remain readable; unsupported relationship meanings are not invented, and shared neighbours are not duplicated.

## Verification

**Where the feature stands, 2026-10-02.** The feature is built and stays `doing`, because three of its six tasks are still `doing`. TASK-0096 and TASK-0097 have boxes that no check shows. TASK-0099 waits on a person's walk and on a measurement on the Mac. TASK-0095, TASK-0098 and TASK-0100 are `done`. No requirement criterion is ticked.

**The node suites.** `npm test` in `desktop/`, 2026-10-02, at commit `9379a0c`: 586 of 586 passed. `9379a0c` is the last commit to change application code before the verification pass. The suites that are this feature's: `collection`, 17 tests ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]); `relations`, 6 tests, with two in `graph` ([[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]). The reading-size suite, 14 tests, is FEAT-0017's and this feature rests on it.

**The verification pass.** 2026-10-02, at commit `4243fc2`, in a Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), from a separate clone. `main` has moved on since by notes and one word in a code comment.

| Run | Command | Result |
| --- | --- | --- |
| The smoke run as CI makes it | `bash tools/scripts/smoke-in-a-box.sh both` | Exit 0 on loopback and on the network, 1131 seconds. The script prints nothing else when every check holds. |
| The loopback half again, with every check printed | the loopback half of that run, with `DECK_SMOKE_DEBUG=1` | 389 passed, 0 failed, 0 skipped, 2 not applicable (a throw to an empty display, and the tablet-shaped checks the network half makes). The Glass section is 291 of them. |
| This feature's parts of the Glass section | | `collection` 17, `document` 14, `served` 6. Also bearing on it: `keys` 12, `switch` 11, `focus` 47, and three checks in the verb and tick section about the verbs and ticks inside a Glass document. |
| The walk `glass-desktop` ([[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]) | `bash tools/scripts/walk-in-a-box.sh glass-desktop` | 54 checks of 54, 23 pictures, workspace unchanged. |
| The walk `collection-refresh` ([[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]]) | `bash tools/scripts/walk-in-a-box.sh collection-refresh --copy` | 10 checks of 10, 4 pictures, on a copy of the notes. |
| The walk `glass-scale` on this repository ([[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]) | `bash tools/scripts/walk-in-a-box.sh glass-scale` | 8 checks of 8. Features view, 144 notes. |
| The walk `glass-scale` on a copy of Your Trainer | the same with `--workspace ../your-trainer --name glass-scale-your-trainer` | 8 checks of 8. Features view, 1393 notes; 217 neighbours round one note. |

A scripted walk sends real pointer and key events to the real application and checks what is on screen. It is not a person's walk.

**What was not done.**

- [[TST-0063-A-Collection-And-Full-Note-Share-Glass]], the acceptance check, has not been walked. The ledger holds no verdict for it.
- Nothing was timed on the Mac. Every time in the notes is the container's, which draws in software. The Mac foreground measurement takes the keyboard for about a minute and waits for Edwin.
- Nothing was tried on a second display, with a display unplugged, on a real tablet, by touch or with a screen reader. The served page was driven in a second Electron window with no preload bridge.
- The independent review this feature owes before `done` has not been run.

**What no check shows, by task.** None of these is a known defect.

- TASK-0096: a status or a type chosen in the list's two filter boxes while the list is in the collection; a group heading pressed with the pointer; the filter named in a collapsed header; the marked row after the collection is opened again; the wheel at the list's first and last row; Escape during a drag of the collection.
- TASK-0097: a disabled verb with its reason inside a Glass document. The smoke run checks that in the reader of Spread and List.
- TASK-0099: the acceptance walk, the Mac measurement, and a person's times and mistakes before and after.
- A document that leaves the desk now has its panels closed however it left (commit `1a71001`). No check asserts it.

## Impact analysis and risk scan

Checked [[FEAT-0010-Lifting-A-Note]], [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], [[ADR-0002-Glass-Is-The-Main-View]] and [[ADR-0004-A-View-Is-A-Description]]. No existing `REQ-*` constrains these features. PHASE-0002 previously put reader replacement out of scope and named the fixed navigator as its accessible route. Edwin's newer instruction changes that scope; the phase note is amended. The plan retains the sidecar as source, the same per-view desk, one note identity and an accessible list, so those existing contracts survive.

The refinements also check REQ-0001/0002, FEAT-0016 and FEAT-0017. FEAT-0017's older one-second opening, mini cards, ghost, drag-exits-focus and dock-only reading conflict with the endorsed direction. TASK-0104 and the amendment to that feature own reconciliation before integration. FEAT-0020 permits several readable documents; FEAT-0022 owns arranging a selected pair through Compare preview, apply and undo. FEAT-0016's wheel remains spatial and excludes object interiors. Exact collection access does not resolve ISS-0086's remaining spatial placement question.

Persisting a collection identity and layout extends the saved desk contract. [[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]] tracks old-state compatibility, current-result resolution and missing objects. TASK-0095 supplies those checks. There is no new external dependency, environment variable, runtime architecture or write authority. Frame time and reachability remain acceptance work within the phase's existing budget.

## Links

- Plan: `docs/features/glass-desktop/plan/PLAN.md`
- Requirements: [[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]], [[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]
- Decision: [[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]] 
- Acceptance: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
