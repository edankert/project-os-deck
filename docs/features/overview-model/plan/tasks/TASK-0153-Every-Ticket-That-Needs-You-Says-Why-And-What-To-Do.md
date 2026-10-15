---
type: "[[task]]"
id: TASK-0153
title: "Every ticket that needs you says why, what to do and where to do it, in the overview model"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Also when selecting an item which needs you, the user needs to be told what he needs to do???'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0158]]", "[[TASK-0160]]", "[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0144]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
tests: ["[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]", "[[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]"]
---

# Every ticket that needs you says why and what to do

**Today a ticket with the red "needs you" dot does not say what the person should do about it.** Edwin opened such a ticket on 2026-10-15 and found no instruction. The model knows only `needsYou: true`. This task makes the model carry the reason and the next step, so every screen can say them in the same words.

The reasons are the cockpit's own, from `_needs_human` in `../project-os-cockpit/src/project_os_cockpit/cockpit.py` (about line 1675). Deck already ports the yes-or-no answer into `desktop/src/shared/overview-status.ts` (`cockpitMarks`, TASK-0144). This task keeps which branch of that rule fired.

| Why it needs you | What to do (the words on screen) | Where the action is |
| --- | --- | --- |
| The ticket is at `triage` | "Decide: take it into the backlog, or decline it" | The sidecar's own verbs for that note, as buttons (TASK-0160) |
| The ticket is at `review` | "Review it, then accept it or send it back" | S7 for a feature, S5 for a design, the ticket itself (S3) for anything else |
| A test is `ready` | "Run this test: it has never been run" | S6, at that test |
| The ticket is `failing` or `reopened` | "It failed: fix it, or run it again" | The ticket itself (S3) |
| A `depends:` entry is unfinished | "Waiting on <ID>: finish that first" | The ticket it waits on |

## Definition of Done
- [x] A contract change to `Ticket` in `desktop/src/shared/overview-types.ts` is proposed under FEAT-0026's "Questions between the lanes" and agreed by both lanes before either codes against it. (Claude agreed with an amendment; Codex could not answer because it stopped running, and Edwin then asked for Claude only, so the contract stands as amended.) The proposal to start from: `needs?: { reason: 'triage' | 'review' | 'ready' | 'failed' | 'waiting'; say: string; action: { address: string } | { verbs: true }; waitingOn?: string }`, present exactly when `needsYou` is true.
- [x] The rule that sets `needsYou` also sets `needs`, so the two can never disagree. When several branches fire, the order is the cockpit's: triage or review, then failed, then ready, then waiting.
- [x] Every ticket with `needsYou: true` on both fixtures has a `needs` entry, and no other ticket has one. TST-0080 checks one ticket of each reason; TST-0082 checks the counts on both fixtures.
- [x] A "waiting" reason names the first unfinished ticket in `depends:`. A "review" reason on a feature points at S7, on a design at S5.
- [x] The words are fixed strings in one place, so S2, S3 and the callouts cannot drift apart.
- [x] `cd desktop && npm test` passes. Two independent Claude reviewers, each in a clean context, review it in two rounds at most (Codex stopped running on 2026-10-15, and Edwin asked for Claude only).

## Steps
- [x] Write the proposal under FEAT-0026's "Questions between the lanes" and wait for Claude's answer.
- [x] Extend `cockpitMarks` to return the reason beside the flag.
- [x] Add the five sentences and their target addresses.
- [x] Rebuild both fixtures and extend TST-0080 and TST-0082.

## Verification

Built by Claude after Codex stopped running (Edwin, 2026-10-15: "only use claude from now on"). `Ticket.needs` is in `desktop/src/shared/overview-types.ts`; `desktop/src/shared/overview-status.ts` computes it beside the cockpit's own needs-you rule, in the cockpit's order (triage and review, then the blocked band, then a test never run, then an unfinished `depends:`), and `overview-model.ts` sends a wait on a note the overview does not draw to that note in the view. Both fixtures were recaptured: Deck from a clean checkout of `65c6397` (`dirty: false`, 395 tickets, 12 that need you: 5 review, 6 waiting, 1 ready); your-trainer from its working tree (`dirty: true`, 2,747 tickets, 75 that need you: 61 waiting, 9 ready, 5 triage). The model suite (TST-0080) tests every reason, the order when two apply, that `needs` is present exactly when `needsYou` is, and on both fixtures that a waiting ticket names an unfinished blocker; parity with the live cockpit is still exact (367 and 2,706 items, no mismatch). 785 tests pass.

Reviewed in two rounds by two independent Claude reviewers (FEAT-0025 to FEAT-0029, "Review of the second revision").

## Notes

Codex lane. Starts at once. Claude's TASK-0158 (the banner on S3, the reasons in S2's rows and the callouts) and Codex's TASK-0160 (the triage buttons) both wait on it.

The words for triage say "take it into the backlog", as Edwin's approved plan has it. The sidecar's verbs for an issue at triage are Accept (to `open`), Defer and Decline (`note_writes.py`, the `issue` row). The buttons use the sidecar's labels; the sentence above them stays as approved.

Assumption: a task, requirement or issue at `review` has no acceptance screen of its own, so its action opens the ticket (S3), and the banner says the same sentence. If Edwin wants such a ticket to open somewhere else, that is a change to this task.
