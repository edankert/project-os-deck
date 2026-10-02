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
adequacy: "Each of twenty-two rules in handoff.ts was broken once on 2026-10-02 at commit 972ce73, after the independent review's fixes, and the suite run: all twenty-two fail a test. Twenty were first broken before the second close-out, when a note that arrived from a reader window having a way back to it failed nothing until commit 69301dd added the assertion. Two were added after it: a move letting go of the source without the destination's answer, and a move the destination says it shows leaving the note on the source. The list does not hold the three rules the review's fixes added: the refusal of a note with a handoff waiting, the refusal of a move of a note kept on every view, and when the way back is used up. The Adequacy section names the test each break fails."
mutation_score: "22 rules broken by hand, 22 caught (2026-10-02, commit 972ce73); 20 of 20 before the two were added, and 19 of 20 before commit 69301dd. Not a mutation tool's run."
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A move is never half done

## Purpose

REQ-0005 says a move's source document is removed only after the destination has drawn the note, and that a handoff which fails leaves the source usable and no desk holding the note twice. Those are rules about states and their order, so they are checked in a pure module, `desktop/src/shared/handoff.ts`, with the answers fed in by the test: the destination says it is showing the note, says it could not, does not answer, closes, or loses its display. No window and no timer is involved.

The suite is `desktop/tests/handoff.test.mjs`. It was committed with twelve tests in `9b7a062` on 2026-10-02, had sixteen from `f80339f` and eighteen from `9d94fa0`. The fixes for the independent review added four, and it has twenty-two since `39915fe`.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`). A reviewer noted that the note rests at `active` while the feature reports the suite passing. That is this rule, and it is kept.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh handoff`.

## Expected results

These are what the twenty-two tests assert, reconciled with the suite file on 2026-10-02 at commit `972ce73`. The module names the two acts `move` and `show`, and a handoff's states `awaiting`, `done`, `unconfirmed` and `failed`. A line marked "since the review" is asserted by a test the review's fixes added.

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
- Since the review: the rule that plans a landing itself refuses a move of a note kept on every view, with "FEAT-0002 is kept on every view, so it is on every desk already and cannot be moved to one. It can be shown there as well." Showing it is not refused.
- Since the review: a note with a handoff still waiting is not sent again. The same move sent twice is refused the second time with "FEAT-0002 is already on its way to the desk on Display 2, which has not answered yet. It can be sent again once that is answered." With the first then timing out, the note is on exactly one desk, the one it never left. Once that is answered it can be sent again, and then it moves.
- Since the review: while one handoff waits, no other act on that note is taken, to a desk, a reader, the tablet or a new reader. Another note is not held up. What counts as waiting is this note, in this workspace, not yet answered.
- Since the review: a "send back" uses up its way back only when the note is shown back there. After no answer, a closed window, a removed display, an answer that it could not be shown, a refusal before it ran, or a landing that cannot be confirmed, the way back is kept.
- A failed handoff to a reader names the address the reader showed before. A failed handoff to a new reader says the window is to be closed. A window that has itself closed is left alone. A display removed ends the handoff `failed` with a sentence saying the display was disconnected: "the display a new reader on Display 3 is on was disconnected".
- With the store driven by the rule as the main process drives it: on every path that does not end `done`, the source desk still holds the note and the destination desk does not. After a move that ends `done`, the note is on the destination desk at the size it had and off the source desk.
- After forty runs of twelve handoffs each, chosen by a fixed seed among two notes, both acts, six destinations and four answers, no desk holds a note twice and no note is on no desk. What the store would write to disk holds no field named for a handoff.

## What the suite does not assert

- **Anything the main process does with the rule.** No node suite loads `desktop/src/main/main.ts`. Both reviewers said so: a move that took the note off the source at landing would pass this suite if the fault were in `main.ts`. It is kept as it is, and what the main process does is held by the handoff walk and the smoke run ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). The four lines below are cases of it.
- **A request with no act is refused.** That refusal is in the main process's handler, `deck:window:throw` in `main.ts`, and not in the module. No test sends such a request.
- **A Needs-you strip is offered neither act.** The same handler refuses it with the sentence it gave before this feature. The module has no such destination.
- **"Send back" is withheld once the source window has closed.** The module's `returnOf` does not know which windows exist. The main process drops its record of where a note came from when that window closes, and tells the window holding the note (`failHandoffsFor` in `main.ts`). No test of this suite covers that. Two checks of the handoff walk do, in a window.
- **That the main process hands the rule its two facts, and asks it when the way back is used up.** Whether a handoff of the note is waiting and whether the note is kept on every view are found in `main.ts` and handed to `planLanding`. The handler for "send back" asks `wayBackSpent` once the return has been answered. The suite tests the rules; a step of the handoff walk checks a send back that is not answered. Nothing checks a second send in a window.
- **That the main process's listener hears a display being removed.** The suite feeds the rule the answer `display-removed`. The handoff walk sends the main process the event itself. No display has been unplugged.
- **That a destination which answers too late shows nothing of an arrival.** That is in the renderer (commit `972ce73`), which no node suite loads, and no walk looks for it.

## Evidence

- **2026-10-02, commit `18f5405`.** `npm test` in `desktop/` ran every suite, this one among them: 645 of 645 passed. The session that ran the pass reported the count. This close-out ran the suite by itself on the same day, with `node --test tests/handoff.test.mjs`: 22 of 22 passed. It read the twenty-two tests against the list above. Commits `5d5b38f` and `39915fe` had brought the suite from eighteen tests to twenty-two.
- **2026-10-02, commit `cbae0d3`, by the round-two reviewer.** One reviewer, in a clean context and a clone of its own, ran this suite and the scenes suite: `pass 44, fail 0`. With the refusal of a second send taken out, 2 tests failed. It found `wayBackSpent` true only for `{ok: true, acknowledged: true}`, and read that `main.ts` forgets the way back only then. Its report gives that probe of the rule and names no break of it, and the commit that added the rule does not say it was broken either.
- **2026-10-02, commit `5e66f48`, by the two reviewers.** Each ran this suite and the scenes suite in a clone of its own. Reviewer A reports "both suites pass 28 of 28 after the last restore", and reviewer B "`scenes` plus `handoff` pass 28 of 28 after the restore". Eighteen of the 28 were this suite's.
- **2026-10-02, commit `e86b2e4`,** before the review: 589 of 589 in the full run, eighteen of them these tests, by the report of the session that built the feature.
- **2026-10-02, commit `69301dd`** added the assertion that a note shown here from a reader has no way back.
- **2026-10-02, commit `9d94fa0`** brought the suite to eighteen tests.
- **2026-10-02, commit `f80339f`,** the commit that brought the suite to sixteen tests: 566 of 566, by that commit's message.

## Defects the independent review found, and the test that now holds each

Two reviewers read the feature at `5e66f48` on 2026-10-02. Their verdict on this test was that it holds for the rule, with one gap: nothing covered two handoffs waiting on one note, and nothing loads `main.ts`. Each row is fixed in the commit named, and the test named is in this suite.

| What the reviewer saw | Reviewer | Fixed in | The test that holds it |
| --- | --- | --- | --- |
| The same move sent twice lost the note. Both landings waited at once. The first timed out and took the note off the destination desk, the second was acknowledged and took it off the source desk. The probe printed `features [] issues []`. | A | `5d5b38f` | "a note with a handoff waiting is not sent again until that one is answered, so the same move sent twice leaves it on one desk", which carries the reviewer's sequence, and "while one is waiting, no other act on that note is taken, to any place; another note is not held up". The commit says each fails with its refusal taken out. |
| The rule that plans a landing did not itself refuse a move of a note kept on every view. Only `main.ts` and the list of offers did. | B | `5d5b38f` | "a move of a note kept on every view is refused by the rule itself, and showing it is not". The commit says it fails with the refusal taken out. |
| A "send back" that was refused or not answered could not be pressed again: `main.ts` forgot where the note came from before the return ran, and the next press was told the note "did not arrive here from another window". Read in the code, not run. | both | `39915fe` | "a "send back" that fails keeps its way back: it is used up only when the note is shown back there". The commit names this test and does not say the rule was broken to see it fail. That the handler asks the rule is held by a step of the handoff walk, which held in the pass at `18f5405`. |

One more was found by the session that fixed these. A destination window that answered after the source had stopped waiting still marked and announced the arrival. Commit `972ce73` makes it read the answer to its acknowledgement and do neither. That is in the renderer, and no test or walk check holds it.

One thing a reviewer raised is kept as it is: a second arrival replaces the first one's line above the status line. Each document that arrived keeps its own mark, and `S` on it still offers "Send back". The module's rule for the way back is per note and is not affected.

## Adequacy (who verifies this test?)

Each rule of `handoff.ts` that the building session could name was broken once and the suite run, to see whether a test fails. The list below is the run of 2026-10-02 at commit `972ce73`, after the review's fixes: twenty-two rules were broken and each fails at least one test. This close-out copied the record of that run and did not repeat it. Where the record cuts a line short, the tests that can be read are named and the cut is said.

Twenty of the twenty-two were first broken before the second close-out. At that first try nineteen failed a test; the one marked "since `69301dd`" failed nothing until that commit added the assertion it now fails. The last two rows were added after the second close-out. That close-out had reported that one break this note asked for beforehand was missing: a move letting go of the source without the destination's answer. It was made, with a second one: a move the destination says it shows leaving the note on the source desk. Both fail tests.

| The rule as broken | The tests that then fail |
| --- | --- |
| A reader can have a note moved onto it | "a destination on the same desk, and a note kept on every view, are offered "also show" only"; "a move a destination cannot take is refused, never turned into something else"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost"; "an empty display is offered "Also show in" only, and its entry reads as a sentence"; "only something that is a desk can have a note moved onto it" |
| A note kept on every view is offered a move | "a destination on the same desk, and a note kept on every view, are offered "also show" only" |
| A window showing the same desk is offered a move | the same test |
| A tablet is waited on for an answer it cannot give | "landing on a desk puts the note there once, and never twice"; "only something that is a desk can have a note moved onto it" |
| A move a destination cannot take is carried out as something else | "a move a destination cannot take is refused, never turned into something else"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost" |
| A move onto the desk the note is already on is carried out | "a move onto the desk the note is already on is refused: it would take the note off its only desk"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost" |
| A note already on the destination desk is put there again | "a move of a note kept on every view is refused by the rule itself, and showing it is not"; "a move onto the desk the note is already on is refused: it would take the note off its only desk"; "landing on a desk puts the note there once, and never twice" |
| A show takes the note off the source desk | "a show leaves the source as it was"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost"; "an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it" |
| A second answer overrides the first | "a second answer changes nothing: the first one stands" |
| A failed handoff leaves the note on the destination desk | "a note with a handoff waiting is not sent again until that one is answered, so the same move sent twice leaves it on one desk"; "no answer, a refusal or a closed window undoes the landing and leaves the source untouched"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it"; "while one is waiting, no other act on that note is taken, to any place; another note is not held up". The record is cut off in the fourth. |
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
| A move lets go of the source desk without the destination saying it shows the note (added after the second close-out) | "a note with a handoff waiting is not sent again until that one is answered, so the same move sent twice leaves it on one desk"; "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost"; "no answer, a refusal or a closed window undoes the landing and leaves the source untouched"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it". The record is cut off in the fourth. |
| A move the destination says it shows leaves the note on the source desk (added after the second close-out) | "a move takes the note off the source desk only when the destination says it is showing it"; "a note with a handoff waiting is not sent again until that one is answered, so the same move sent twice leaves it on one desk"; "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it"; "while one is waiting, no other act on that note is taken, to any place; another note is not held up". The record is cut off in the fourth. |

**What the list does not cover.** The breaks were chosen by the session that wrote the code, one per rule it could name, and a rule nobody named was not broken. Three rules the review's fixes added are not in the list. The refusal of a note with a handoff waiting, and the refusal of a move of a note kept on every view by the rule itself, were each broken once by hand by the session that added them; commit `5d5b38f` says each test fails with its refusal taken out. For the third, when the way back is used up (`wayBackSpent`), commit `39915fe` names the test that holds it and does not say the rule was broken to see it fail. The main process's own code, which carries the rule out, has no break here: it is checked in a window by the handoff walk.

The two reviewers each broke a guard of this module on 2026-10-02 at `5e66f48`. With a refusal from the destination treated as shown, two tests failed: "no answer, a refusal or a closed window undoes the landing and leaves the source untouched" and "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it". With a second or late answer taken, one failed: "a second answer changes nothing: the first one stands".
