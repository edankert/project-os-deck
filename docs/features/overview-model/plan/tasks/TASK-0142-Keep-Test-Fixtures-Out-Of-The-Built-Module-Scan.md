---
type: "[[task]]"
id: TASK-0142
title: "Keep test fixtures out of the built module scan"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["TASK-0141 full test run: write-channel.test.mjs scanned an overview fixture after it was deleted"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
depends: []
blocks: []
related: ["[[TASK-0141-Give-Every-Flow-Count-Its-Own-Mark]]"]
tests: ["[[TST-0081-The-Overview-Route-Is-Read-Only-And-Cached]]", "[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# Keep test fixtures out of the built module scan

The write-channel scan must inspect compiled application modules without racing temporary overview repositories.

## Definition of Done

- [x] Scan every application build module, including the root preload module, while excluding temporary fixture directories.
- [x] The full desktop suite passes with no skipped tests.

## Notes

The first TASK-0141 full run passed 735 tests and failed one: a recursive scan tried to enter an overview fixture after its owning test deleted it. Both tests are correct to run concurrently. The scan's intended subject is compiled application code. Scan root JavaScript files and recurse only into application output directories from the TypeScript configurations and asset copier. Do not catch missing application modules or weaken any write-boundary assertion.

This known test-tooling defect is repaired in its own task and commit under the feature whose fixture exposed it. No product behavior, requirement, dependency or external write changes.

## Evidence

2026-10-14: `cd desktop && npm test` passes all 737 tests, with zero failures and zero skips. `bash tools/agents/check-docs-first.sh` and `bash tools/scripts/validate-docs.sh` pass. Temporary files and npm cache stay under `desktop/dist/tmp`; no window opens.

## Review

The two fresh-context reviewers confirmed the count diagrams and found numeric-name examples and a scan regression gap. Commit `b5f65df` fixes both findings. The bounded second review approved both on 2026-10-14: removing spaced-suffix or radix-literal handling fails the name test, and unrestricted directory recursion fails the new scan test. No feature acceptance verdict is recorded.
