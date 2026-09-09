---
type: "[[issue]]"
id: ISS-0049
aliases: ["ISS-0049"]
title: "Naming the smoke run as a test put it in the gate that has no Electron, so the non-bypassable CI job now fails on every push"
status: open
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fifth independent review of PHASE-0001, 2026-09-09, finding 1"]
severity: high
component: tests
parent: ""
related: ["[[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]", "[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# The fix for "nothing runs these" breaks the thing that runs everything

## Problem

[[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]] gave [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] a `command:`, so `run-tests.py` runs the smoke. **`run-tests.py` is also what the template's `validate-docs.yml` runs, and that job has no Electron binary and no display.** The runner exits 127, `run-tests.py` fails the whole run on an unrunnable test when `CI` is set, and the job the header calls a "non-bypassable backstop" goes red on every push.

Reproduced by hiding Electron's `path.txt`:

```
bash tools/scripts/run-smoke.sh loopback                       -> 127
CI=true python3 tools/scripts/run-tests.py --filter TST-0037   -> 1
python3 tools/scripts/run-tests.py --filter TST-0037           -> 0
```

Nothing caught it because nothing has run: this branch is 22 commits ahead of `origin/main` and no Actions run has happened.

## What ISS-0044 got right and what it missed

It recorded the NEW job as unverified and reconciled rather than ticked, which was honest about `deck-smoke.yml`. It said nothing about the OLD job, and that is the one that breaks. A new workflow was added; the consequence for the existing one was never considered.

## Cause

Two gates, one list. `run-tests.py` runs every `TST-*` note's `command:`, and it is invoked by two workflows with different environments. A test that needs more than the lighter one has cannot live in that list. `validate-docs.yml` is template-owned (`tools/sync/MANIFEST.yaml`), so giving it Electron is a change to every project the template serves, most of which have none.

## Fix

The smoke's verdict comes from the job that can produce one. `deck-smoke.yml` already runs `tools/scripts/run-smoke.sh both` directly, so TST-0037 does not need a `command:` — and having one makes a promise to a gate that cannot keep it. The note says where its verdict comes from instead.

The cost is that `run-tests.py` no longer runs the smoke locally. `npm test` in `desktop/` and `bash tools/scripts/run-smoke.sh both` are the two commands, and TST-0037 says so.

## Acceptance

- [ ] `run-tests.py` passes on a machine with no Electron and no display, with `CI` set
- [ ] TST-0037 states where its verdict comes from, and the CI job that produces it
- [ ] A failing smoke check still turns a CI job red
