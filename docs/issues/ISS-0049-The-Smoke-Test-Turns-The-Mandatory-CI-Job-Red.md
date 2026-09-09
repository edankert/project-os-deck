---
type: "[[issue]]"
id: ISS-0049
aliases: ["ISS-0049"]
title: "Naming the smoke run as a test put it in the gate that has no Electron, so the non-bypassable CI job now fails on every push"
status: fixed
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

- [x] `run-tests.py` passes on a machine with no Electron and no display, with `CI` set — evidence: measured with path.txt hidden: exit 0 (user:edwin, 2026-09-09)
- [x] TST-0037 states where its verdict comes from, and the CI job that produces it — evidence: its Where this verdict comes from section (user:edwin, 2026-09-09)
- [x] A failing smoke check still turns a CI job red — evidence: six mutations, six killed through run-smoke.sh (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The script provisions what it needs instead of refusing.** `run-smoke.sh` now installs Electron's binary when only the package is there — which is exactly what `run-desktop-tests.sh` leaves behind, since it sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1` for the node suites — and re-execs itself under `xvfb-run` on a Linux machine with no display. So [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] keeps its `command:` and the shared gate can run it.

**Taking the `command:` away was the first attempt and it was wrong.** The validator refused it: a test note must either carry a `command:` or say `kind: manual`, and this one is run by a script, not a person. Saying otherwise would have been a note misrepresenting how it is run — a worse fault than the one being fixed. The framework was right and the environment was what needed changing.

**One assumption is left and it is written down.** `xvfb-run` has to be on the machine. It is on GitHub's ubuntu images and on most desktop Linux; where it is not, the script exits 127 saying which, `run-tests.py` calls that an environment gap locally and a failure in CI, and the fix is one `apt-get install xvfb`. `.github/workflows/deck-smoke.yml` does that explicitly, so the dedicated job does not rest on the assumption.

**A second thing came out of testing the first.** The initial `npm ci` had already removed `node_modules` before failing on a shared npm cache this user cannot write, leaving the checkout worse than it found it. The retry with a cache of its own is `run-desktop-tests.sh`'s, for the same reason.

**Two CI jobs now run the same script, and that is deliberate.** Electron is downloaded twice per push, which is waste; the alternative is betting the non-bypassable job on `xvfb-run` being present on GitHub's image, where a change would turn that job red with the fix only available upstream in `../project-os`. The dedicated job installs xvfb itself, so it fails first and is fixable here.

**Evidence.** With `node_modules/electron/path.txt` hidden the script refetches and passes. With Electron absent and `CI=true`, `run-tests.py` exits 0 rather than 1. `run-tests.py --filter TST-0037` reports it passing.
