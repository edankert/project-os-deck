---
type: "[[issue]]"
id: ISS-0044
aliases: ["ISS-0044"]
title: "The three guards added to close the third review run only in a command nobody's gate runs, and the notes claiming them name a test that does not cover them"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fourth independent review of PHASE-0001, 2026-09-09, finding 1"]
severity: high
component: tests
parent: ""
related: ["[[ISS-0038-Nothing-Checks-The-Tag-That-Stops-A-Note-Running-Script]]", "[[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]]", "[[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]", "[[FEAT-0013-The-First-Write]]"]
tests: []
---

# Three guards, and nothing that runs them

## Problem

The content policy, the reason box and the refused design verdict are all guarded in `npm run smoke`. **No gate runs `npm run smoke`.** `grep -rn "canPerform\|elsewhere(\|applyVerb\|drawActuators\|Content-Security\|data-confirm" desktop/tests/` returns nothing, no `TST-*` note's `command:` names it, and CI runs `run-tests.py` and `validate-docs.sh` and nothing else. Revert any of the three fixes and CI is green.

**And the verification gate closed on a test that does not cover them.** [[ISS-0038-Nothing-Checks-The-Tag-That-Stops-A-Note-Running-Script]], [[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]] and [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]] all carry `tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]`. TST-0033 runs `run-desktop-tests.sh write-channel`, a node suite that cannot load the renderer and asserts nothing about any of the three. Each note reached `fixed` with the invariant satisfied by a passing test that measures something else.

ISS-0038 says this about itself, in its own close-out. The other two do not, and neither does TST-0033.

## Cause

The guards went where they could run — a real Electron window — and the note-level bookkeeping followed the nearest existing test rather than a new one. `run-desktop-tests.sh` sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1` deliberately, because the node suites never needed the ~100MB binary, so CI has no Electron at all and no display to put a window on.

## Fix

Two parts, and the second is the one that costs something.

**Name the thing.** A `TST-*` note whose `command:` runs the smoke, so `run-tests.py` runs it and the three issues point at a test that measures them.

**Give CI an Electron and a screen.** A project-owned workflow beside the template's `validate-docs.yml` — that file is template-owned and belongs upstream — installing the binary and running the smoke under `xvfb-run`.

This narrows [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] rather than closing it. ISS-0008 wants the renderer exercised generally; this makes CI run the checks that exist today.

## Acceptance

- [x] A `TST-*` note names the smoke run, and `run-tests.py` runs it — evidence: TST-0037, command: bash tools/scripts/run-smoke.sh both — run-tests.py reports it passing (user:edwin, 2026-09-09)
- [x] The three issues cite that note rather than TST-0033 — evidence: ISS-0038, ISS-0039 and ISS-0040 repointed (user:edwin, 2026-09-09)
- [~] CI runs the smoke, on a machine with a display — the workflow is written and the runner it calls is proved locally, but no GitHub Actions run has happened; the first push settles it (user:edwin, 2026-09-09)
- [x] Reverting any of the three fixes turns that CI job red — evidence: five mutations through run-smoke.sh, five killed (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] names the smoke run, and `run-tests.py` runs it.** Its `command:` is `bash tools/scripts/run-smoke.sh both`, so the three guards are a test with an id rather than a command somebody remembers. `ISS-0038`, `ISS-0039` and `ISS-0040` cite it instead of `TST-0033`, which measured none of them.

**The runner reads the verdict, not the exit code.** `run-smoke.sh` parses the final JSON of each configuration and fails on any failure OR any skip — a skipped check is not a pass ([[TST-0036-A-Skipped-Check-Is-Not-A-Pass]]) — and prints the failing checks by name, so the one line CI shows is actionable instead of "Electron exited 1".

**A machine without Electron's binary or a display gets exit 127**, which `run-tests.py` treats as an environment gap locally and a failure in CI. That is the right way round: a check CI cannot run has no verdict.

**And CI gets both.** `.github/workflows/deck-smoke.yml` is project-owned — deliberately beside `validate-docs.yml` rather than inside it, because that file is template-owned and a change there would run on every project the template serves, most of which have no Electron. It installs the binary, clones and installs the sidecar from its sibling, and runs the smoke under `xvfb-run`.

**The CI half is unverified.** I cannot run GitHub Actions from here, so the workflow is reasoned rather than observed, and the first push is what tests it. The two things most likely to break it: cloning `project-os-cockpit` needs `COCKPIT_TOKEN` in this repository's secrets if that repository is private, and the sidecar's own Python dependencies must install cleanly. Everything else in this note is measured locally.

**Evidence.** Five mutations through `run-smoke.sh`, five killed, each naming the check it broke: the content policy deleted (2), the reason returned to the confirmation (2), a verb Deck cannot perform offered anyway (2), the dead verb not disabled (1), every row claiming to confirm (2).
