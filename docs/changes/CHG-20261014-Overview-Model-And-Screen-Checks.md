---
type: "[[change]]"
id: CHG-20261014-Overview-Model-And-Screen-Checks
title: "Overview-Model-And-Screen-Checks"
status: merged
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: []
commit: ""
pr: ""
impacts: []
# The platforms this change altered, such as [android] or [android, ios]. A release test lists
# its Impact lines only on these. Required once the Impact list names a screen and the project
# keeps ledgers for more than one platform (SCHEMAS.md, change.md).
platforms: []
issues: []
features: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: []
---

# Overview-Model-And-Screen-Checks

## Summary

Deck provides one read-only overview model at `GET /deck/overview/<workspaceId>` for its desktop and served hosts. The command `node desktop/scripts/overview.mjs <repo-root> [--json]` prints the same model from the built modules. Screen checks verify words, counts, addresses and matching list rows without opening a window.

Local socket tests now report a skip when the operating system refuses listeners. The helper catches only the prerequisite refusal; assertion failures still fail.

## Impact

- No screen changed: this feature supplies the model and checks that the drawing lane's screens consume.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0026 records the model rules, fixture comparison and review handoff.
- requirements: not-applicable — the existing designs define this feature; no requirement changes.
- tasks: new — TASK-0115 through TASK-0119 cover the model and its verification.
- issues: not-applicable — defects in this feature are fixed within its tasks.
- tests: new — TST-0080 through TST-0084 cover built modules and socket prerequisites.
- workflows: not-applicable — the CLI is a small diagnostic command documented in the feature and its own help.
- decisions: not-applicable — both lane contracts remain unchanged.
- risks: not-applicable — no new dependency, configuration, write path or persistent store; the existing index and host provide the reads.
- changes: new — this note records the route and command.
- snapshot: updated — the feature, tasks, tests and focus follow the notes.

## Follow-ups

Claude reviews FEAT-0026 and merges this branch. Edwin owns acceptance. Neither action is recorded as completed by this lane.
