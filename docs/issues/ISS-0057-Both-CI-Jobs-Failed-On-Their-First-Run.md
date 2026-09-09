---
type: "[[issue]]"
id: ISS-0057
aliases: ["ISS-0057"]
title: "The first push turned both CI jobs red: a fixture check that cannot pass on a fresh checkout, and Electron refusing to start without its sandbox configured"
status: open
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The first continuous-integration run of this work, 2026-09-09, runs 34400070031 and 34400070075"]
severity: high
component: tests
parent: ""
related: ["[[ISS-0034-The-Comparison-Reads-Key-Names-And-Never-Values]]", "[[ISS-0056-What-The-Last-Review-Found-And-Nobody-Fixed]]", "[[TST-0029-The-Index-Reads-What-Is-On-Disk]]", "[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# Twenty-nine commits reached CI for the first time and both jobs failed

## Problem

**A check that cannot pass on a fresh checkout.** `TST-0029` reports *"213 of 213 notes in thisRepository have been edited since the fixture was recorded"*. `git clone` stamps every file with the checkout time, so on CI every note looks edited, the key and value comparison skips all of them, and the floor assertion fires. The mtime skip was added today under [[ISS-0034-The-Comparison-Reads-Key-Names-And-Never-Values]] to stop the comparison going red on every commit that touches a note — a real problem with a fix that cannot work where mtimes are not real. **It passed locally every time, because local mtimes are.** This is the mandatory backstop, and `main` is red on it.

**Electron will not start on a CI runner without being told about the sandbox.** `deck-smoke` installed Electron, the sidecar and xvfb and reached the smoke run, where Electron died with `FATAL:setuid_sandbox_host.cc(163)`: the SUID sandbox helper is present but not configured, which is what happens in a container. The runner reported `the run printed no verdict` and exited 1 rather than claiming success, which is the one thing that behaved as designed ([[ISS-0051-Three-Checks-That-Can-No-Longer-Fail]] added that path).

## Why neither was found before

Both scripts were written and reasoned on a machine where neither failure is possible: real modification times, and a desktop with a working sandbox. [[ISS-0056-What-The-Last-Review-Found-And-Nobody-Fixed]] named the largest open item as *"the smoke run is gated by a workflow that has never executed"* and said pushing was what would settle it. It settled it: the answer is that neither gate worked.

## Fix

**Compare content, not timestamps.** The fixture records a digest of each note's bytes, and a note whose bytes match what was recorded is compared strictly — same file, two parsers, which is the question. A note whose bytes differ was edited and is skipped, exactly as intended, and a checkout's timestamps never enter it.

**Tell Electron about the sandbox in CI only.** The workflow sets it; a local run keeps the sandbox it has.

## Acceptance

- [x] `TST-0029` passes on a checkout whose file timestamps are all the checkout time — evidence: every note touched, then 45 of 45 pass (user:edwin, 2026-09-09)
- [x] The staleness skip still skips a note that really was edited — evidence: editing a note passes; corrupting every digest fires the floor (user:edwin, 2026-09-09)
- [ ] `deck-smoke` runs the smoke checks to a verdict
- [ ] Both jobs are green on `main`

## Half fixed, 2026-09-09; the CI half is unproved until it runs

**The fixture records each note's bytes, not its modification time.** A note whose bytes match what was recorded is compared strictly — the same file read by two parsers, which is the question this fixture exists to ask. A note whose bytes differ was edited and is skipped, exactly as intended, and a checkout's timestamps never enter it.

**Driven both ways.** Touching every note in `docs/`, which is the CI condition, leaves 45 of 45 passing where before it was the failure. Editing one note for real still skips that note and passes. Corrupting every recorded digest still fires the floor: *"235 of 235 notes have been edited since the fixture was recorded"*.

**The sandbox is disabled in the workflow and not in the application**, so somebody running the smoke locally keeps the sandbox they have. A CI container is already an isolated machine.

**That half is unproved.** I cannot run GitHub Actions, so whether `ELECTRON_DISABLE_SANDBOX` is enough for this runner is what the next push finds out — which is the same position [[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]] was in, and the reason the first run was worth having.
