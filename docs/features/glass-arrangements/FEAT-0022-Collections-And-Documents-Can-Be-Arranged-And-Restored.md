---
type: "[[feature]]"
id: FEAT-0022
title: "Collections and documents can be arranged and restored"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
goal: "A person changes one exact collection between a stack, table and cards, then previews and reverses useful arrangements without losing note identity or reading size."
requirements: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]"]
tasks: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]", "[[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0003-Collections-And-Documents-On-Glass]]"
related: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Collections and documents can be arranged and restored

## Goal

A person can turn a live collection into a compact stack, a readable table or an arrangement of its cards. Read, Compare and Show related make an occupied desk useful without manually moving every object.

## Scope

The feature follows FEAT-0020's collection and full-document interaction. It operates on the current view's collection and current desk. It adds presentation changes, deliberate arrangement commands, a preview, a labelled undo, and relationship emphasis over the existing source-backed connections.

- **Stack** is the collection collapsed to its header: the query's name, its exact count and what narrows it. Opening it shows the table or the cards, whichever it was.
- **Table** supplies the complete accessible rows and comes back to the row it was scrolled to.
- **Cards** draws those same members as cards inside the collection. It does not promise every card fits on screen: only the rows in view are drawn, a line under them says which of how many, and the table stays available. Drawing is limited to what is in view; membership is not.
- **Read** stands the document on top beside the list. **Compare** stands the two documents on top side by side, each at its own size. **Show related** gathers what the document on top is joined to and opens its complete list. There is no selection apart from which notes are open.
- A preview names the objects that will move and outlines where each will stand. Apply commits that layout. Cancel leaves it unchanged. A labelled Undo arrangement puts back what the last one moved, independently of text editing and project actions.
- "Pick out", in a document's list of related notes, offers the frontmatter keys the files join the note by, each with its count. Picking one dims the cards, lines and rows that are not part of it, says how many of how many are picked out, and keeps every row. A plain link in the text is offered no meaning, and picking out changes no link.

Multiple independent collections, persistent arrangement presets, named scenes and camera persistence are outside this feature. Existing per-view desk storage holds the applied layout; preview and the last undo are per-window session state. FEAT-0023 owns named restoration and richer handoffs. Structured evidence objects belong to FEAT-0021 in Parity.

## Acceptance

- Stack, table and cards identify exactly the same current member set and count. Presentation changes preserve filters, selected identity and the table's scroll anchor.
- A note shared by a collection, an open document and multiple relationships has one spatial object on the desk. A table reference can remain without becoming a duplicate card.
- Read, Compare and Show related have keyboard-operable previews, apply and cancel. Compare displays two full documents at their chosen reading size.
- Applying an arrangement preserves text size, current reading position and chosen document dimensions. A narrow viewport keeps objects reachable through navigation or the wider workspace; it never shrinks text to fit.
- Undo restores the previous arrangement without undoing note edits or project actions. Stale previews or undo records announce incompatible changed objects before applying anything.
- Relationship emphasis names its subset while the exact full neighbour list remains available. Clearing it restores the previous emphasis without changing edges or membership.
- High populations remain entirely reachable with bounded visible drawing and motion. Reduced motion, scroll boundaries, visible keyboard focus and read-only tablet behavior match FEAT-0020.

## Verification

Everything below was run on 2026-10-02. The walks and the smoke run were run in a Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900) from a clone at commit `4243fc2`. `main` has moved on since only by notes and one word in a code comment.

**The node suites.** `cd desktop && npm test`, which builds and then runs `node --test --test-timeout 30000 tests/*.test.mjs`, at `9379a0c`: 586 of 586 passed. `9379a0c` is the last commit that changed application code before `4243fc2`. This feature's suite is `arrange` ([[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]]), 15 tests; it and `desktop/src/shared/arrange.ts` are unchanged since `b017807`.

**The smoke run.** `bash tools/scripts/smoke-in-a-box.sh both`, on loopback and then on the network: exit 0 for both, in 1131 seconds. That script prints nothing but its exit code when every check holds. The loopback half was run once more at the same commit with each check printed: 389 passed, 0 failed, 0 skipped, 2 not applicable (the throw to an empty display, on a machine with one display; and the tablet-shaped checks, which the network half makes). The Glass section has 291 of those checks. Its `arrange` part has 4, and they are this feature's: a preview withdrawn with Escape leaves the store's desk and the collection's place byte for byte as they were; Apply then Undo arrangement returns both to the same bytes; with a note open and the collection as cards no note has two cards; and as a table again no card is left in the collection. The `collection` part has 17 checks and the `served` part 6. The checks are written in `desktop/src/main/smoke-glass.ts`.

**The scripted walks.** Each sends real pointer and key events to the real application and checks what is on screen.

- `bash tools/scripts/walk-in-a-box.sh glass-arrangements --copy`: 44 checks recorded, 44 held, 12 pictures ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]). The script has 45 checks. The one that did not run follows a link inside a compared document; the script found no link it could press and writes no line when that happens.
- `bash tools/scripts/walk-in-a-box.sh glass-scale --workspace ../your-trainer --name glass-scale-your-trainer`: 8 of 8, on a copy of Your Trainer at `90429bd4`, 1393 notes in the Features view ([[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]).
- `bash tools/scripts/walk-in-a-box.sh glass-scale`: 8 of 8, on this repository's notes, 144 in the Features view.
- `bash tools/scripts/walk-in-a-box.sh collection-refresh --copy`: 10 of 10. It is FEAT-0020's walk, and TASK-0101 rests one box on its check that the collection says when the open note has left the result.

**What was not done.**

- Nobody has walked the acceptance check [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]. The ledger holds no verdict for it. A scripted walk is not a person's walk.
- Nothing was measured on the Mac. Every time and every frame count in TST-0072 is the container's, which draws in software. The measurement in a foreground window on the Mac has not been run, because a window there takes the keyboard from the person working.
- Nothing was tried on a second display, with a display unplugged, on a real tablet, with a screen reader or by touch. The served page was driven in a second Electron window with no preload bridge.
- Three behaviours are written and no check drives them: an undo putting back the relationship that was picked out before the arrangement; a collapsed collection of cards opened again from its header; and the message a collection shows when its view cannot be read.
- Compare and Show related were started with the pointer and applied with Enter. Only Read was driven from the keyboard alone.
- Two compared documents never overlapped on screen. The sentence that says by how much is checked in the suite only.

**Where the feature stands, 2026-10-02.** It is `doing`. TASK-0101 has two open boxes and TASK-0102 one, each for one of the three unchecked behaviours above. TASK-0103 is open on everything it asks of a person and of the Mac. REQ-0003 is `approved` with no criterion ticked; its note has a table of what exists for each.

## Decisions

Routine details settled while building, under DES-0003 as the baseline (REQ-0003, Approval). The reason is given where a commit or the code states one.

- **The stack is the collection collapsed to its header, not a third form.** The store keeps two values, `collapsed` and a form that is `table` or `cards`, so a collapsed collection still knows which form it opens as (`desktop/src/shared/collection.ts`).
- **As cards, the members are the field's own cards moved into the collection.** No note is drawn twice. A member that is open as a document, or gathered round one, is a reference in its cell that finds the real one when pressed (commit `b017807`).
- **Only the rows of cards in view are drawn.** The wheel, Page Down and End reach the rest, and a line under the cards says which are drawn of how many. Every member has an index, so all are reached by moving the first row, and that is what bounds the drawing (`cardGrid` in `collection.ts`).
- **The cards open at the note the table was scrolled to, and the table comes back to that row.** The row is remembered by the note it is for, not by a number of pixels.
- **There is no selection.** DES-0003 speaks of the "selected" document. In the build Read and Show related are about the document on top and Compare about the top two; pressing a document brings it to the top. With more than two open, the preview says the others stay where they are. The commit does not say why.
- **A plan holds places and never a size.** It names a place for each document it moves, so nothing in a plan could change a size (`desktop/src/shared/arrange.ts`).
- **What does not fit is said, and nothing is shrunk.** When the list and a document do not fit side by side, the plan collapses the collection to its header and says so. When two compared documents are wider than the field, they stand at its two sides and overlap, and the preview says by how many pixels.
- **A document the plan does not name stays where a person put it.** DES-0003, "Arrangement commands", asks for this.
- **Read and Compare send gathered cards back to the field.** Reading and comparing are not gathering (a comment in `applyArrange`, `desktop/src/renderer/glass.ts`). Show related makes its document the focus and opens its list.
- **Show related stands the document one row of cards down from the top, centred in the room beside the list.** The reason given in `arrange.ts` is that cards then have room on every side.
- **A preview that goes stale is worked out again, not refused.** When the desk, the window or the notes change while it is shown, the bar says "The desk changed while this was shown, so it was worked out again." Apply works it out once more from the desk at that instant. A preview about a note that has been closed is withdrawn. DES-0003 allows either invalidating or refreshing; the plan of 2026-10-01 said invalidate.
- **An undo is kept for what has not changed.** When a person has moved, resized or closed something since, the undo names it and offers "Undo the rest" and "Keep as it is". The plan of 2026-10-01 said such a change invalidates the undo. The commit does not say why this was chosen.
- **An undo puts back places, stacking, the collection's form, the focus, the open list and the picked-out relationship.** It does not put back a size, because no arrangement changes one; a document resized since is named and left alone.
- **One undo, kept by the window.** It is gone after a reload, and it is dropped when a scene replaces the desk as a whole (`forgetArrangement`, FEAT-0023).
- **Plans are in whole pixels.** The store keeps whole pixels. A field 744.5 px high once gave a planned height of 720.5, the store kept 721, and the undo took the collection for one a person had resized.
- **The store applies an arrangement as one change.** The action is `arrange`, and it makes one revision for the documents, the stacking and the collection together.
- **A command that cannot run is not a disabled button.** It is marked `aria-disabled` and says why when pressed, because a disabled button cannot be reached to learn why (a comment in `drawArrangeControls`).
- **The relationships offered are frontmatter keys from Deck's own index of the files.** Each is offered with its count. "link" is never offered, so a plain link in the text is given no meaning.
- **Under reduced motion an arrangement is a cut.** The documents and the collection are at their new places at once.
- **The served page offers no arrangement and no change of form.** It draws the collection where the application put it.
- **The field's bar no longer sets the width of the field area.** Once the bar gained the arrangement buttons, its width had pushed the area under the rail in a narrow window (commit `b017807`).

## Impact analysis

Checked REQ-0001/0002 and FEAT-0020 for exact counts, chosen size, immediate reading and input. REQ-0003 adds forms and arrangements without relaxing those constraints. FEAT-0015 keeps one desk per view and FEAT-0016 keeps wheel input spatial outside objects. FEAT-0017's old single-focus dock rule is superseded for Glass by FEAT-0020's multiple readable documents. Compare builds on that capability. TASK-0102 owns the arrangement preview, application and undo; TASK-0104 supplies the identity and geometry prerequisite.

Applying layout is explicit. It does not reclassify a note's priority, modify its status or change the band's source rules in FEAT-0018. Exact list access remains distinct from ISS-0086's placement issue. No native migration, cockpit contract or new write authority is required. Camera persistence remains outside scope, so the current session-state contract stands.

## Risk scan

RISK-0007 covers saved presentation compatibility and duplicate identities after restoration. TASK-0101 supplies the mitigation. Animated expanded collections can consume the phase's frame budget; TASK-0103 measures full population reachability and foreground cost without hiding missing members. No external dependency, new required environment variable or security exposure is introduced.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Requirement: [[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]
- Tasks: [[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]], [[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]], [[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]
- Acceptance: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- Tests: [[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]], [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]], [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]
