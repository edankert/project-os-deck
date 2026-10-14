---
type: "[[change]]"
id: CHG-20261014-Acceptance-From-Evidence
title: "Accept designs, checks and features from their evidence"
status: merged
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: []
commit: "a50ffcb"
pr: ""
impacts: []
# The platforms this change altered, such as [android] or [android, ios]. A release test lists
# its Impact lines only on these. Required once the Impact list names a screen and the project
# keeps ledgers for more than one platform (SCHEMAS.md, change.md).
platforms: []
issues: []
features: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]]"]
---

# Accept designs, checks and features from their evidence

## Summary

A person sees design plates, release-test captures and the feature's five evidence lamps before acting. S5 to S7 are implemented in FEAT-0029 and await Claude's review and Edwin's acceptance. Shared scenes and six fixtures are in `602e9bb`, the guarded image route is in `9ad200d`, and the registered flows and shell verbs are in `a50ffcb`.

The flows read the existing sidecar through Deck's host. Their writes leave through the shell's main process. `decide` accepts a proposed design, `mark-check` records a test note after all its printed steps have results, and `acceptance-run` stamps an opted-in feature. The existing `transition` verb carries design declines and feature send-back reasons. The configured actor must be a `user:` identity; renderer-supplied identities are ignored.

The image route `/deck/file/<workspaceId>/<docs-relative path>` permits GET and HEAD for png, jpg, jpeg, gif, webp and svg images under the resolved docs root. It rejects traversal and escaping symlinks. SVG responses carry a restrictive sandbox policy. The HTTP host forwards no writes.

## Impact

- S5 design acceptance: design plates, revision dots and review pins lead to Accept and Decline controls.
- S6 release testing: each platform has a check ring, and an open check shows captures and result controls.
- S7 feature acceptance: five count diagrams expose the evidence still missing before Accept, with Send back and a reason.

Deck has no surface-note registry, so these screen names are used rather than invented SUR ids.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0029 records scope, external limits and the review handoff.
- requirements: not-applicable — PHASE-0005 and DES-0005 already state the flow criteria.
- tasks: new — TASK-0120 to TASK-0123 cover scenes, images, writes and verification.
- issues: not-applicable — defects in this implementation are fixed within its tasks.
- tests: new — TST-0085 to TST-0089 and TST-0100 cover automated checks and Edwin’s three walks.
- workflows: not-applicable — no new command or release workflow is introduced.
- decisions: not-applicable — ADR-0003’s main-process write boundary remains in force.
- risks: new — RISK-0009 names the changing sidecar payloads and missing guards or transitions.
- changes: new — this note records the flows, verbs and image route.
- snapshot: updated — focus and item membership were curated before implementation, then synced from notes.

## External limits

The current cockpit’s decision endpoint has no reason field; design transitions carry a reason. Its human transition table has no feature review-to-done or review-to-doing action. An acceptance run stamps an opted-in feature without changing its status. The inspected source does not establish a universal refusal of an agent verdict. Deck must show the existing sidecar’s refusal and must not invent success or bypass its endpoint.

Your Trainer has no feature at review in its current 135 feature notes. Its fixture uses a real doing feature and preserves its status.

## Follow-ups

- [x] Record implementation evidence and exact endpoint mapping. On 2026-10-14, `npm test` in `desktop/` passed 718 tests, with no failures or skips; 30 tests cover the three new suites.
- [x] Keep six flow fixtures, nine recorded payloads and 25 image copies. Images total 1,604,537 bytes and are at most 900 pixels wide.
- [x] Date the six precisely adopted capability rows in the adoption register, and amend the already-adopted acceptance read row.
- [x] Hand Claude the feature at review and leave Edwin's three acceptance verdicts unrecorded.
- [ ] Claude integrates the small S3 gate and flow entry controls, regenerates S5–S7 plates and reviews the feature.
- [ ] Edwin runs TST-0088, TST-0089 and TST-0100, including the agent-session refusal steps.
