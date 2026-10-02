---
type: "[[test]]"
id: TST-0075
aliases: ["TST-0075"]
title: "A move is never half done: the source keeps its document until the destination has drawn the note, an unanswered or interrupted handoff is undone, and no desk ever holds a note twice"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/handoff.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh handoff"
covers: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]"]
issues: []
tasks: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
artifacts: []
adequacy: "Each of twenty rules in handoff.ts was broken once on 2026-10-02 and the suite run. Nineteen failed a test at the first try. A note that arrived from a reader window having a way back to it failed nothing, so commit 69301dd added the assertion, and all twenty now fail a test. Letting a show take the note off the source desk fails four tests. The Adequacy section names the test each break fails."
mutation_score: "20 rules broken by hand, 20 caught (2026-10-02); 19 of 20 before commit 69301dd. Not a mutation tool's run."
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A move is never half done

## Purpose

REQ-0005 says a move's source document is removed only after the destination has drawn the note, and that a handoff which fails leaves the source usable and no desk holding the note twice. Those are rules about states and their order, so they are checked in a pure module, `desktop/src/shared/handoff.ts`, with the answers fed in by the test: the destination says it is showing the note, says it could not, does not answer, closes, or loses its display. No window and no timer is involved.

The suite is `desktop/tests/handoff.test.mjs`. It was committed with twelve tests in `9b7a062` on 2026-10-02, had sixteen from `f80339f`, and has eighteen since `9d94fa0`.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh handoff`.

## Expected results

These are what the eighteen tests assert, reconciled with the suite on 2026-10-02. The module names the two acts `move` and `show`, and a handoff's states `awaiting`, `done`, `unconfirmed` and `failed`.

- A desk panel and the main window take both acts. A reader window, a new reader on an empty display and the tablet take `show` only. The tablet cannot acknowledge. The wait is between two and ten seconds.
- What is said before release names the act, the note, the place and what happens at the source: "Move FEAT-0002 to the desk on Display 2: it leaves this desk once that window shows it", and "Also show FEAT-0002 in the reader on Display 2: this desk keeps it". The sentence for the tablet says a tablet cannot confirm it arrived.
- An empty display is offered `show` only, and its entry reads "Also show in a new reader on Display 3". A place is named as it stands in a sentence: "the desk on Display 2", and "a new reader on Display 3" with no second article. No label, no sentence said before release and no sentence said after an answer holds "the a", "the an" or "the the", for any act, any kind of place and any answer.
- What an act does to this desk is said in a few words: "it leaves this desk" for a move, "this desk keeps it" for a show, and for the tablet that this desk keeps it and a tablet cannot confirm.
- Landing on a desk puts the note there once. A note already on that desk is not put there again. A reader is re-addressed, a new reader is opened, and the tablet's landing is not waited on.
- A move to something that is not a desk is refused with a sentence and is not turned into a show.
- A move onto the desk the note is already on is refused, because source and destination are one desk. A show there puts nothing twice.
- For a move, the step that marks the handoff `done` is the step that yields "take the note off the source desk", and no other step yields it. For a show, no step touches the source.
- With no answer, with the window closed, and with an answer that the note could not be shown, the handoff ends `failed`, the note the landing put on the destination's desk is taken off again, and the sentence begins "FEAT-0002 stays here" and ends "Nothing was moved."
- When the destination desk already held the note, a failed handoff takes nothing off it.
- A second answer, and an answer after the handoff failed, change nothing.
- A card thrown from the field is on no desk, so a move takes nothing off.
- A send to the tablet ends `unconfirmed` at once, with a sentence saying a tablet cannot confirm it arrived and this desk keeps the note.
- The way back is the same handoff in reverse. It carries the size and the reading anchor the document has at the destination when they are known, and the ones it left with when they are not. From a desk it is a move. From a reader it is a show. There is no way back from the tablet, for a card that came from the field, for a handoff that failed, or for a note that was shown here from a reader window.
- A destination drawing the same view's desk as the source, and a note kept on every view, are offered `show` only.
- A failed handoff to a reader names the address the reader showed before. A failed handoff to a new reader says the window is to be closed. A window that has itself closed is left alone. A display removed ends the handoff `failed` with a sentence saying the display was disconnected: "the display a new reader on Display 3 is on was disconnected".
- With the store driven by the rule as the main process drives it: on every path that does not end `done`, the source desk still holds the note and the destination desk does not. After a move that ends `done`, the note is on the destination desk at the size it had and off the source desk.
- After forty runs of twelve handoffs each, chosen by a fixed seed among two notes, both acts, six destinations and four answers, no desk holds a note twice and no note is on no desk. What the store would write to disk holds no field named for a handoff.

## What the suite does not assert

- **A request with no act is refused.** That refusal is in the main process's handler, `deck:window:throw` in `desktop/src/main/main.ts`, and not in the module. No test sends such a request.
- **A Needs-you strip is offered neither act.** The same handler refuses it with the sentence it gave before this feature. The module has no such destination.
- **"Send back" is withheld once the source window has closed.** The module's `returnOf` does not know which windows exist. The main process drops its record of where a note came from when that window closes, and tells the window holding the note (`failHandoffsFor` in `main.ts`). No test of this suite covers that. Two checks of the handoff walk do, in a window; see [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]].
- **That the main process's listener hears a display being removed.** The suite feeds the rule the answer `display-removed`. The handoff walk sends the main process the event itself. No display has been unplugged.

## Evidence

- **2026-10-02, commit `e86b2e4`.** `npm test` in `desktop/` ran every suite, this one among them: 589 of 589 passed. The session that built the feature ran it and reported the count. This close-out did not run the suite. It read the eighteen tests against the lists above.
- **2026-10-02, commit `69301dd`** added the assertion that a note shown here from a reader has no way back.
- **2026-10-02, commit `9d94fa0`** brought the suite to eighteen tests.
- **2026-10-02, commit `f80339f`,** the commit that brought the suite to sixteen tests: 566 of 566, by that commit's message.

## Adequacy (who verifies this test?)

Each rule of `handoff.ts` was broken once on 2026-10-02 and the suite run, to see whether a test fails. Twenty rules were broken and each fails at least one test. The session that built the feature broke them and recorded which tests failed. This close-out copied its list and did not repeat the run.

At the first try nineteen of the twenty failed a test. The one marked "since `69301dd`" failed nothing until that commit added the assertion it now fails.

One break this note asked for beforehand is not in the list: taking a move's note off the source desk at landing, before the destination answers. The test "a move takes the note off the source desk only when the destination says it is showing it" asserts that rule, and nobody has broken the rule to see that test fail. The nearest breaks in the list are a show taking the note off the source desk and a failed handoff reported as done.

| The rule as broken | The tests that then fail |
| --- | --- |
| A reader can have a note moved onto it | "a destination on the same desk, and a note kept on every view, are offered "also show" only"; "a move a destination cannot take is refused, never turned into something else"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost"; "an empty display is offered "Also show in" only, and its entry reads as a sentence"; "only something that is a desk can have a note moved onto it" |
| A note kept on every view is offered a move | "a destination on the same desk, and a note kept on every view, are offered "also show" only" |
| A window showing the same desk is offered a move | the same test |
| A tablet is waited on for an answer it cannot give | "landing on a desk puts the note there once, and never twice"; "only something that is a desk can have a note moved onto it" |
| A move a destination cannot take is carried out as something else | "a move a destination cannot take is refused, never turned into something else"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost" |
| A move onto the desk the note is already on is carried out | "a move onto the desk the note is already on is refused: it would take the note off its only desk"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost" |
| A note already on the destination desk is put there again | "a move onto the desk the note is already on is refused: it would take the note off its only desk"; "landing on a desk puts the note there once, and never twice" |
| A show takes the note off the source desk | "a show leaves the source as it was"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost"; "an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it" |
| A second answer overrides the first | "a second answer changes nothing: the first one stands" |
| A failed handoff leaves the note on the destination desk | "no answer, a refusal or a closed window undoes the landing and leaves the source untouched"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it" |
| A failed handoff takes off a note the destination already held | "no answer, a refusal or a closed window undoes the landing and leaves the source untouched" |
| A reader that closed is re-addressed | "an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone" |
| A handoff that did not arrive has a way back | "the way back is the same handoff in reverse, carrying where it was read last" |
| A card from the field has a way back to a desk it was never on | the same test |
| A note that arrived from a reader has a way back to it (since `69301dd`) | the same test |
| The way back from a reader is a move | the same test |
| A handoff to a tablet is recorded as confirmed | "the tablet is done at once, and said to be unconfirmed" |
| A place already named with its article gets a second one | "an empty display is offered "Also show in" only, and its entry reads as a sentence"; "an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone" |
| A failed handoff is reported as done | "no answer, a refusal or a closed window undoes the landing and leaves the source untouched"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it" |
| The short consequence of a move says the desk keeps the note | "what an act does to this desk is said in a few words beside each place" |

What this does not show: the breaks were chosen by the session that wrote the code, one per rule it could name. A rule nobody named was not broken. The main process's own code, which carries the rule out, has no break here: it is checked in a window by the handoff walk.
