---
type: '[[risk]]'
id: RISK-0009
title: Acceptance flows depend on changing sidecar payloads and guards
status: open
owner: system:codex
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
- FEAT-0029 risk scan, 2026-10-14
phase: '[[PHASE-0005-Overview]]'
likelihood: medium
impact: high
mitigation:
- '[[TASK-0120-Draw-The-Acceptance-Flows-From-Recorded-Evidence]]'
- '[[TASK-0121-Serve-Only-Images-Under-The-Workspaces-Docs]]'
- '[[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]'
- '[[TASK-0123-Verify-The-Flows-And-Hand-Them-To-Edwin]]'
- '[[TASK-0143]]'
related:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
- '[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]'
- '[[ADR-0003-Deck-Writes-Through-The-Shell]]'
---

# Acceptance flows depend on changing sidecar payloads and guards

## Description

A changed sidecar payload could show a false pass or light a feature lamp without supporting evidence. S5 to S7 depend on the design note's `/api/render` HTML and image paths, `/api/cockpit/release-test?platform=<p>&release=<REL>`, schema 4 of `/api/cockpit/acceptance?platform=all`, `/api/notes/acceptance?id=<FEAT>` and `/api/cockpit/obligations`. The release-test response includes the template's `release-test.py --json` output and current results. These are external contracts owned by project-os-cockpit and the project-os template.

The write contracts also have limits found by reading the cockpit source on 2026-10-14. `/api/notes/decide` accepts `id`, `reviewer`, `accept` and `mtime`, with no reason field. Design transitions can carry a reason. The human transition table does not offer a feature’s `review` to `done` or `doing` transition. An acceptance run stamps an opted-in feature but does not itself change status. The decision writer checks for a nonblank reviewer; the release ledger records `by` and `method`. The `decide` and `mark-check` endpoints do not refuse an agent identity. A direct caller can record a verdict without passing Deck’s `requirePerson` guard. Plain agent witnesses are refused on acceptance-run, while authorized charter witnesses have a separate delegation path. Deck must not claim that the sidecar enforces a guard that was not observed.

## Mitigation

- TASK-0120 records dated payloads and source commits, maps them with pure functions and keeps absent or malformed evidence unknown. A note status alone never certifies automated test results.
- TASK-0121 confines image reads to the resolved docs root and allowed image types, including symlink and traversal checks.
- TASK-0122 sends the existing endpoint bodies from the main process, preserves the configured actor and displays a refusal unchanged. It does not add a write route through Deck’s host or work around missing sidecar verbs.
- TASK-0123 keeps the adopted capability scope explicit and records the test counts. Edwin’s three acceptance tests check Deck’s local agent refusal and the display of sidecar refusals. They do not claim the missing sidecar guards exist.
- TASK-0143 reads feature action availability before offering or sending a transition, explains absent evidence, and records the two person-only requests in REFERENCE-COCKPIT-ADOPTION.

The real sidecar owns new transitions, reason fields and agent guards. This run does not edit either sibling repository.

## Evidence and remaining exposure

2026-10-14: TASK-0120 to TASK-0123 implemented the mitigations. Nine recorded payloads and their source commits are under `desktop/fixtures/overview/flows/raw/`. The three focused suites pass 30 tests; the full desktop suite passes 718 with no failures or skips. Unknown or malformed evidence cannot make the gate ready. Shell writes require a configured `user:` identity and ignore identity fields supplied by the renderer.

The risk stays open. Recorded payload tests detect drift only when refreshed, and Deck cannot repair the sidecar’s feature transition table or its missing guards on direct agent writes. Edwin decides whether FEAT-0029’s narrowed criteria are acceptable. His three acceptance walks and Claude’s round-two review remain pending.

## Triggers

- A recorded payload changes shape, schema, result vocabulary, release selection or platform meaning.
- The cockpit shows a different result from the same check or a gate lamp contradicts its evidence.
- A non-person verdict succeeds, or a supported person action is refused by the current endpoint.
- A fixture cannot be refreshed without changing the pure mapper.
