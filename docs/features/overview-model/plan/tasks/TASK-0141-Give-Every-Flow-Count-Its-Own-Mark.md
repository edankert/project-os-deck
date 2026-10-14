---
type: "[[task]]"
id: TASK-0141
title: "Give every flow count its own mark"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's 2026-10-14 integration-fix request"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
depends: []
blocks: []
related: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]", "[[TST-0085-Flow-Scenes-And-Payloads-Keep-The-Recorded-Evidence]]"]
---

# Give every flow count its own mark

S6 and S7 must pass the stricter count rule after the two data-lane features were merged.

## Definition of Done

- [ ] Each ratio count has its own text and matching mark; every recorded flow stays within 60 words at rest.
- [ ] Bare numeric names fail the numbers rule, while names containing digits remain valid, with regression coverage.
- [ ] All desktop tests pass without skips, and documentation validation passes.
- [ ] Small local commits carry the requested co-author trailer; both features remain at review.

## Notes

The request identifies the failing suites, the two affected screens and the required name exception. Its five ambiguity checks expose no missing decision. This is one integration repair under FEAT-0026, linked to FEAT-0029, without a new issue. No sibling found for ratio marks or numeric names (searched the issue notes for count, number, ratio and overview).

The impact check covers FEAT-0026, FEAT-0029 and PHASE-0005's screen rules. Neither feature links a requirement. Splitting each ratio preserves the existing scene shape, addresses and evidence semantics; no requirement conflict exists. The risk scan finds no new dependency, environment setting, path contract, long-running process or credential exposure.

Work is confined to lane/codex. Temporary files stay in this worktree. No window-opening command, push or merge is authorized. Local test evidence closes this repair task; Claude's feature review and Edwin's acceptance remain separate.

## Evidence

2026-10-14: `cd desktop && npm test` passes all 737 tests, with zero failures and zero skips. `bash tools/agents/check-docs-first.sh` and `bash tools/scripts/validate-docs.sh` pass. Temporary files and npm cache stay under `desktop/dist/tmp`; no window opens.
