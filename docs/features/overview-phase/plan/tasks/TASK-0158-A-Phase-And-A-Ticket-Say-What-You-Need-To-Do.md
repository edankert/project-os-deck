---
type: "[[task]]"
id: TASK-0158
title: "A phase and a ticket tell the person what they need to do: a banner on S3, a short reason in S2's needs-you rows, and the reason in every callout"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Also when selecting an item which needs you, the user needs to be told what he needs to do???'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0153]]"]
blocks: ["[[TASK-0160]]", "[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0147]]", "[[TASK-0148]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]]"]
---

# A phase and a ticket say what you need to do

**When Edwin opened a ticket with the red "needs you" dot, nothing told him what to do.** This task shows the reason and the next step that TASK-0153 adds to the model, in three places:

- **A banner at the top of S3**, above the ticket's text. It says the sentence ("Review it, then accept it or send it back") and has one button that goes where the action is: S7 for a feature, S5 for a design, S6 at a ready test, or the ticket it waits on. For an issue at triage the banner holds the sidecar's decide buttons, which Codex adds in TASK-0160.
- **A short reason in each of S2's needs-you rows**, after the status word: "review", "never run", "failed", "waiting on TASK-0042", "triage".
- **The reason in every callout** for a ticket that needs you, on every screen, because callouts are written by one shared function (`markWords` in `desktop/src/shared/overview-marks.ts`).

## Definition of Done
- [x] S3 shows the banner for every ticket whose model entry has `needs`, and no banner otherwise. Its button opens the screen the model names; Enter on it does the same.
- [x] S2's needs-you rows show the short reason; the rows stay one line on your-trainer's largest phase.
- [x] Every callout for a ticket that needs you ends with the reason's sentence.
- [x] The banner's words count toward S3's 60 words at rest (it is not a list of tickets), and S3 stays within 60 on both workspaces. If a long ticket title pushes it over, the banner keeps its sentence and the title shortens.
- [x] The list twin carries the banner's sentence and its button.
- [x] TST-0090 checks one ticket of each reason on both fixtures: banner present, button address right, S2's row reason present. The window run TST-0093 opens a needs-you ticket on each workspace and presses the banner's button. `cd desktop && npm test` passes. Two independent Claude reviewers, each in a clean context, review it in two rounds at most (Codex stopped running on 2026-10-15, and Edwin asked for Claude only).

## Steps
- [x] Read `needs` from the model in the S3 and S2 scenes.
- [x] Draw the banner in the drawing lane; leave a slot for TASK-0160's buttons.
- [x] Add the reason to `markWords` and `rowWords`.
- [x] Extend TST-0090 and the window run's script.

## Verification

S3 shows a red banner under the stages with what the ticket needs and a button to where you act; S2's needs-you rows carry the sentence under their title; every callout ends with it. TST-0090 checks a ticket of each reason on both fixtures; the window run found the banner and its button on Deck (FEAT-0018, review) and your-trainer (TASK-0987, waiting). Reviewed in two rounds by two independent Claude reviewers.

## Notes

Claude lane. Waits on TASK-0153 (the model's reason). Codex's TASK-0160 waits on this banner to place its buttons.
