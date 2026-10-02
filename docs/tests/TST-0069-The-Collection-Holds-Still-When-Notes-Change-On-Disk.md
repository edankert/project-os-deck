---
type: "[[test]]"
id: TST-0069
aliases: ["TST-0069"]
title: "The collection holds still when notes change on disk: the change is announced and applied only when asked, the list stays on its row, and a deleted note's open document keeps its text and offers nothing that writes"
status: passing
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/collection-refresh.cjs"
command: ""
last_verified: 2026-10-02
automation: "one command, run by hand: bash tools/scripts/walk-in-a-box.sh collection-refresh --copy. Not run by run-tests.py or by CI, which have no Docker."
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]"]
issues: []
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]"]
---

# The collection holds still when notes change on disk

## Purpose

REQ-0001 says a changed result is announced before it re-orders anything under a pointer, and that a document whose note left the result stays usable. Neither can be shown without changing notes, and no check may change the workspace it reads. So this walk runs on a throwaway copy of the notes, made inside the box, and changes three files there while the Issues list is open: it deletes the note that is open as a document, changes another note's status, and adds a note.

**The rule the walk stands on, as settled on 2026-10-02.** A refreshed result is a change when it differs in its order or in anything a row shows. It is announced and offered with "apply", and no row moves until the person presses it. "What a row shows" is everything the note's card carries, the note's own frontmatter included when the card came from Deck's index, so an edit to a property that no face draws is announced too. The announcement counts four kinds of note: added, removed, moved in the list (under another heading, or held under another note) and changed what it shows. It also says when the order of the headings, the order of the rows, or a heading itself changed. Before commit `3fdc530` the comparison looked at heading, status, owed mark and title only. A result that changed nothing else was announced as nothing, and the list kept the old rows with nothing to press. The independent review of FEAT-0020 found that; the decisions are numbered 1 to 5 in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]], under "Settled while fixing what the review found".

This walk shows three of those kinds in a window: a note added, a note removed and a note whose status changed. The rest of the rule is held without a window by [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]].

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh collection-refresh --copy`.
3. Read the `drive:` lines and look at the four pictures in `desktop/dist/walks/collection-refresh/`.

The walk refuses to run on anything that is not a copy under `/tmp`, and on any directory that is a git repository.

## Expected results

- The collection says that three notes changed, one of them added and one removed, and offers apply. The third is the note whose status changed. Since commit `3fdc530` it is said as "1 changed what it shows", or as "1 moved in the list" when its new status puts it under another heading. Before that commit the sentence ended "1 changed". The walk's check asks for the words "changed" and "apply" and for "added" and "removed"; it does not hold the sentence to one wording.
- Until apply is pressed no row has moved, arrived or left, including the rows under "Joined to what you are holding", and the count is still the count of the list on screen.
- The open document of the deleted note keeps the text that was read. It says the text is as it was last read and that the note was deleted, renamed or moved, and offers retry and close. Its ticks and verbs are hidden.
- After apply the new note has a row, the deleted one has none under any heading of the view, and the count is the new exact count.
- The list is scrolled to the same note, under the same heading, at the same place.
- The collection says the open note is no longer in the list and that its document stays open.
- The document still has its title and its text, and can be closed.
- Closed, the keyboard goes to the collection's header and the status line says the note is not in the list any more.

## What it does not cover

- A rename or a move. The document's message names all three, "deleted, renamed or moved", and the walk only deletes.
- A result that differs only in its order, in a note's progress, severity or title, in the note another is held under, in a heading, or in a property no face draws. The walk changes a status, adds a note and deletes one. Those other cases are held by the `collection` suite, which compares two results and draws the collection's line on a stand-in page. The lines of `desktop/src/renderer/renderer.ts` that make the comparison when a change arrives are loaded by no node suite, so in a window they are shown for this walk's three kinds only.
- The chip in the bar above the field for a list that changed only its order. It reads "the list changed its order — show it" since commit `972ce73`. No check reads it, here or anywhere.
- Any view but Issues.
- A person's pointer. The walk rests a scripted pointer on a row; whether a person notices the announcement is TST-0063.
- The Mac. The box renders in software.

## Evidence

**2026-10-02**, in the Linux box (`project-os-deck-smoke` image, Electron under Xvfb), at commit `e86b2e4`, on a copy of this repository's notes made inside the box: 10 checks recorded, 10 held, 4 pictures, 8 seconds. No part of the walk was left out. The walk deleted ISS-0008 while it was open as a document, changed ISS-0069 from `open` to `fixed`, and added ISS-9999. The Issues view held 91 notes before and 91 after, one in and one out, and 88 rows held their order until apply was pressed. The walk chooses the notes it changes from the list on screen, so they are not the same notes as in the run on 2026-10-01.

That run is from before the rule above was settled, and it read the sentence "3 notes changed: 1 added, 1 removed, 1 changed". The walk's script has not changed since. No run after commit `3fdc530` is recorded here yet, so this note does not yet say which words the collection now uses for the note whose status changed.

The walk first held all 10 on 2026-10-01. Its first run that day failed five. All five were defects in the application and are fixed:

1. The collection did not say a change was waiting. Only the chip in the field's bar did.
2. The "Joined to what you are holding" rows vanished and came back on every save, so the row under the pointer became another row.
3. The deleted note's document lost its text and showed "the sidecar answered 404" and a line of JSON.
4. After apply the document lost its title and its text again, because the view no longer held the note.
5. After apply the list was scrolled to the wrong row, by the height of the line that had appeared above it.

The smoke run makes a smaller version of the same check on the workspace itself, without writing a file: its `switch` part shows a change arriving, the collection saying "1 note changed: 1 changed" with one apply button, and no card moving until the person acts. That sentence is the one read at `e86b2e4`; the check asks only that the line begins with those words.

**Found by the independent review of FEAT-0020 on 2026-10-02.** Reviewer A compared results in node and found four that were announced as nothing: rows in another order, headings in another order, a note's progress and severity changed, and a note held under another note than before. In each the collection drew no "apply" line and the chip stayed hidden, while the new result was held back, so the list kept the old rows until some other change arrived or the view was switched. This walk could not have found it: it adds a note and deletes one, and both were always counted. Neither reviewer ran this walk; both ran node suites only. The fix is commit `3fdc530`, and the tests that hold it are named in [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]].
