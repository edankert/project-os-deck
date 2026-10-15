---
type: "[[task]]"
id: TASK-0160
title: "An issue at triage is decided from its ticket screen, with the sidecar's own verbs as buttons, through the sidecar's guards"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Also when selecting an item which needs you, the user needs to be told what he needs to do???'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
parent: "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"
effort: M
due: ""
depends: ["[[TASK-0153]]", "[[TASK-0158]]"]
blocks: ["[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0122]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]]"]
tests: ["[[TST-0087-Flow-Actions-Use-The-Shell-And-Preserve-Refusals]]", "[[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]]"]
---

# An issue at triage is decided from its ticket screen

**A ticket at `triage` needs a person to decide whether it is real work. S3's banner (TASK-0158) says so; this task gives the banner the buttons that make the decision.** The buttons are the verbs the sidecar advertises for that note. For an issue at triage they are Accept (it moves to `open`), Defer and Decline (`../project-os-cockpit/src/project_os_cockpit/note_writes.py`, the `issue` row). Each goes through the same shell route and the same guards as S5's and S6's writes (TASK-0122, ADR-0003).

## Definition of Done
- [x] On S3, a ticket whose `needs.reason` is `triage` shows the sidecar's advertised verbs for that note as buttons in the banner, and nothing else. A note type the sidecar offers no verbs for shows the sentence and no buttons, with a hover saying the cockpit offers no decision for it.
- [x] Decline asks once before it writes, as the cockpit does (`CONFIRM_ACTIONS`).
- [x] A press sends the person's write through the shell; Deck refuses an `agent:` identity before sending; a refusal from the sidecar is shown in the sidecar's own words.
- [x] After a successful write, the model is read again and the banner and the dot go away.
- [x] The served (tablet) host shows the buttons unavailable and writes nothing.
- [x] TST-0087 checks the route, the agent refusal and the preserved sidecar refusal for the decide verbs. `cd desktop && npm test` passes. Two independent Claude reviewers, each in a clean context, review it in two rounds at most (Codex stopped running on 2026-10-15, and Edwin asked for Claude only).

## Steps
- [x] Read the advertised verbs for the note from the sidecar, as S5 and S6 do.
- [x] Fill TASK-0158's banner slot with the buttons.
- [x] Extend TST-0087; add the step to TST-0092 for Edwin.

## Verification

At triage the banner's buttons are the sidecar's own Accept, Defer and Decline, read again before writing, sent through the shell as a transition with the note's time as the screen was drawn, Decline asking why; a verb the sidecar now refuses, a page that cannot write, or a time Deck could not read all refuse before anything is sent. The flow-writes suite tests each. Built by Claude after Codex stopped. Reviewed in two rounds by two independent Claude reviewers.

## Notes

Codex lane. Waits on TASK-0153 (the reason) and TASK-0158 (the banner it fills).

Not in scope: severity on Accept. The sidecar can record a severity while triaging an issue; Deck does not offer it in this task. If Edwin wants it, that is a later task.
