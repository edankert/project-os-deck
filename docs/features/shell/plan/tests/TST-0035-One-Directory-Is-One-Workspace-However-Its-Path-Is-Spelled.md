---
type: "[[test]]"
id: TST-0035
aliases: ["TST-0035"]
title: "One directory is one workspace and one sidecar, however its path is spelled"
status: active
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/workspace-paths.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh workspace-paths"
covers: ["[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]"]
issues: ["[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]"]
tasks: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
artifacts: []
adequacy: "Reverting the fix — making the canonical spelling `path.resolve` again rather than the file system's own answer — fails four of the six checks, including the borrow. The two that still pass are the ones that must keep passing after the fix: a path that does not exist compares by its text, and a sidecar serving a different repository is still refused."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]"]
---

# One directory is one workspace, however its path is spelled

## Purpose

Deck decides three things by comparing two paths: whether it already knows this workspace, which id the workspace has, and whether a sidecar that is already running is serving this repository. Each comparison used to be made on the path as TEXT. macOS reaches one directory through more than one spelling, so on 2026-09-08 Deck started a second sidecar on a repository the cockpit was already serving and left that repository's `.cockpit/url` naming a port nobody was listening on ([[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]).

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0035` reproduces it locally without writing anything.

## Procedure

- Make a real temporary workspace, and reach it through a second spelling of its own directory name. On a case-sensitive file system that second spelling names nothing, and each check that needs it returns without asserting.
- Assert the canonical spelling of a directory is the one on disk rather than the one that was typed.
- Assert a path that does not exist still compares, by its text, without throwing.
- Assert both spellings give one workspace id, and that the workspace carries the spelling on disk.
- Add the workspace under both spellings and assert the rail holds one row.
- Run a fake sidecar that reports the OTHER spelling as its root, point the repository's `.cockpit/url` at it, and assert Deck borrows it rather than starting one of its own.
- Run a fake sidecar reporting a DIFFERENT repository and assert Deck still refuses to borrow it.

## Expected results

- Deck holds one workspace, one id and one sidecar per directory, whatever spelling reached it.
- The guard that stops Deck borrowing another repository's sidecar is unchanged.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh workspace-paths`: 6 checks pass, 2026-09-09.
- Mutation: with the canonical spelling reverted to `path.resolve`, 4 of the 6 fail, 2026-09-09.

## Adequacy (who verifies this test?)

The borrow check is the load-bearing one, because it is the defect itself rather than a property near it: it fails when Deck starts a second sidecar and passes only when Deck reuses the running one. The refusal check beside it is what stops the fix from being "borrow anything": a suite that only proved Deck borrows more would pass with the guard deleted.
