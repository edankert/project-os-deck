---
type: "[[test]]"
id: TST-0084
title: "Localhost checks skip only when listeners are forbidden"
status: retired
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: integration
entrypoint: "desktop/tests/socket-test.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh socket-test"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0119-Report-When-Localhost-Tests-Cannot-Run]]"]
artifacts: []
adequacy: "Injected permission failures skip the body. Successful probes run it. Other errors and failed assertions remain failures."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]"]
---

# Localhost checks skip only when listeners are forbidden

## Procedure

Run `bash tools/scripts/run-desktop-tests.sh socket-test`. The injected listener probe checks success, EPERM, EACCES and unexpected failures. The test wrapper checks that an unavailable listener skips its body and that an available listener runs it.

## Expected Result

Only missing listener permission is a skip. Unexpected failures and assertion errors remain failures.

## Evidence

2026-10-14: `bash tools/scripts/run-desktop-tests.sh socket-test` passed 4 tests, failed none and skipped 0. The command builds the modules and opens no window.

## Retired

2026-10-14: retired with TASK-0119, whose skip helper was reverted before the merge. The suite it ran no longer exists.

