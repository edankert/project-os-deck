---
type: "[[issue]]"
id: ISS-0054
aliases: ["ISS-0054"]
title: "The smoke runner re-execs itself by a path that no longer resolves, the gate that must run it cannot give it a sidecar, and a failed install now empties a working checkout"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The sixth independent review of PHASE-0001, 2026-09-09, findings 1, 2 and 4"]
severity: high
component: tests
parent: ""
related: ["[[ISS-0049-The-Smoke-Test-Turns-The-Mandatory-CI-Job-Red]]", "[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# Three faults in the script written to make the smoke run anywhere

## Problem

**It cannot start on a Linux machine with no display, which is every machine it was changed for.** `run-smoke.sh` does `cd "$DESKTOP"` and then re-execs with `bash "${BASH_SOURCE[0]}"`. TST-0037's command is the relative string `bash tools/scripts/run-smoke.sh both`, run from the repository root, so after the `cd` that path resolves against `desktop/` and does not exist. Both CI jobs would die at exit 127 on the branch that is taken whenever `DISPLAY` is unset — which is the case on GitHub's runners, and the reason `deck-smoke.yml` installs xvfb at all.

**The gate that must run it cannot give it a sidecar.** [[ISS-0049-The-Smoke-Test-Turns-The-Mandatory-CI-Job-Red]] made the script fetch Electron and find a screen. The smoke also needs the sidecar, and `validate-docs.yml` — template-owned, five steps, none of them a checkout of `../project-os-cockpit` — cannot provide one. A smoke run with no sidecar **fails** rather than being unrunnable, so `run-tests.py`'s unrunnable allowance cannot excuse it either.

So ISS-0049's first conclusion was right and its second was wrong. A test whose `command:` needs three things the shared gate provides none of does not belong in that gate; provisioning two of the three did not change that.

**And a failed install now empties a working checkout.** `npm ci` removes `node_modules` before fetching. The retry added for an unwritable cache does not cover an unreachable registry, and the trigger is ordinary: any tree installed by `run-desktop-tests.sh` has no Electron binary, so the next smoke run wipes it and re-downloads.

## Fix

Stop trying to make one command work in two environments.

- **The script does not install anything.** Electron's binary missing is exit 127 with a sentence saying what to run. Nothing that a test invokes should be able to empty a working tree.
- **It resolves its own path before changing directory**, so the re-exec works from anywhere.
- **TST-0037 declares how it is invoked** rather than carrying a `command:` for a gate that cannot honour it. `.github/workflows/deck-smoke.yml` is the CI job that has Electron, a screen and the sidecar, and it stays.

## Acceptance

- [x] The re-exec works when the script is invoked by a relative path from the repository root — evidence: driven with a stub xvfb-run; it reaches the build with the right working directory (user:edwin, 2026-09-09)
- [x] A failed install cannot leave `node_modules` emptied — evidence: the npm ci path is gone; a missing binary is exit 127 with the command to run (user:edwin, 2026-09-09)
- [x] `run-tests.py` passes in a checkout with no Electron, no display and no sidecar, with `CI` set — evidence: measured: exit 0 (user:edwin, 2026-09-09)
- [x] TST-0037 says who invokes it and when it was last performed — evidence: automation: and last_verified: 2026-09-09 (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The script resolves itself before changing directory.** `SELF` is an absolute path taken from `BASH_SOURCE` at the top, so the re-exec under `xvfb-run` works when the script is invoked by a relative path from the repository root — which is how every caller invokes it. Driven with a stub `xvfb-run` and the platform test forced: the re-exec lands, and the process reaches the build with the working directory correct.

**It installs nothing.** Electron's binary missing is exit 127 with the command to run. `npm ci` empties `node_modules` before fetching, and the retry added for an unwritable cache did not cover an unreachable registry — so a test could destroy a working checkout, and the trigger was ordinary.

**[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] carries no `command:`, and this is the second time that answer has been reached.** [[ISS-0049-The-Smoke-Test-Turns-The-Mandatory-CI-Job-Red]] reached it first, then replaced it with a script that fetched Electron and found a screen. That solved two of the three things the smoke needs. The third is the **sidecar**: the smoke opens a workspace, which starts one, and the template-owned `validate-docs.yml` has five steps and no checkout of `../project-os-cockpit`. A smoke run with no sidecar *fails* rather than being unrunnable, so `run-tests.py`'s environment-gap allowance cannot cover it either.

The note declares `automation:` and carries `last_verified:`, which is how this system records a check a shared runner cannot re-derive; it goes stale, which is the right nudge. `.github/workflows/deck-smoke.yml` is the CI job with Electron, a screen and the sidecar.

**What I got wrong the first time, plainly.** I treated "the gate cannot run this" as a property of the script and made the script more capable. It was a property of the gate. Two of three is not a fix, and the round trip cost a review.

**Evidence.** `run-tests.py` exits 0 in a checkout with no Electron and `CI` set. The re-exec is driven from the repository root. The install path is gone, so it cannot empty anything.
