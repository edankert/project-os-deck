---
type: "[[task]]"
id: TASK-0081
aliases: ["TASK-0081"]
title: "A Linux box for the smoke run to open its windows in, so verifying a deliberate break costs two minutes and none of a person's keyboard"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12: 'I am using the computer keyboard at the same time! This is not working for me!'", "Edwin 2026-09-12: 'We cannot depend on CI, it is too expensive to run all the time. Can we create a local vm or something similar?'"]
parent: "FEAT-0018"
effort: "S"
due: ""
depends: []
blocks: ["TASK-0078"]
related: ["[[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]", "[[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]]"]
tests: []
---

# A box for the smoke run to open windows in

## Objective

**The smoke run cannot verify anything on a machine somebody is working at.** It opens real windows and takes the system's focus 23 times, and a person typing takes it back. Four consecutive runs of the same code on 2026-09-12 gave four different failure sets, clustered on the checks that need a focused window — one said so in its own message, "the window had lost the keyboard". [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]] owes about a dozen deliberate breaks, one run each, and none of them can be trusted this way.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "I am using the computer keyboard at the same time! This is not working for me!"
> "We cannot depend on CI, it is too expensive to run all the time. Can we create a local vm or something similar?"

## Detail

**Nothing in the run needs changing, which is the point.** `tools/scripts/run-smoke.sh` already re-execs itself under `xvfb-run` when it finds no display — the branch written for CI. A Linux container has no display, so it takes that branch and opens its windows on a virtual screen that no person can be typing into.

**`tools/docker/smoke.Dockerfile`** is `node:20-bookworm-slim` plus the libraries Electron names and `xvfb`. The dependency install is its own layer, so editing source does not refetch Electron's binary.

**`tools/scripts/smoke-in-a-box.sh [loopback|lan|both]`** builds the image and runs the suite with the repository **mounted**, so a deliberate break is one edit on the host and one command. `desktop/node_modules` is masked by an anonymous volume, because the host's holds a macOS Electron binary a Linux container cannot run — the box keeps its own.

**It refuses helpfully rather than guessing.** With no `docker` command it prints the two lines that install one (`brew install colima docker`, `colima start`) and exits 127, the same "environment gap" code `run-smoke.sh` already uses for a missing binary. With docker installed and no daemon it says to start Colima.

**Colima, not Docker Desktop.** Colima is a Linux VM with no licence question, and the Docker CLI talks to it. About 3.5 GB once.

## What it is not for

**The frame-rate measurement stays on the real machine** ([[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]). Electron in a container renders through software GL, so a number taken in the box answers a different question from the one [[PHASE-0002-Glass]]'s criterion asks, which is whether Glass holds a usable frame rate on the machine Edwin actually uses. The box is for behaviour; the Mac is for speed.

**It does not close [[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]].** That issue is about the run a person starts on their own machine and watches, which should still not take their keyboard 23 times. The box means they rarely have to.

## Acceptance

- `bash tools/scripts/smoke-in-a-box.sh both` passes, with nothing appearing on the host's screen and no interruption to whatever is being typed.
- The same command on a machine with no docker prints how to get one and exits 127.
- The image builds once; a second run does not refetch Electron.
- A source edit on the host is picked up by the next run with no rebuild.
- `run-smoke.sh` is unchanged.

## Steps

- [x] Write `tools/docker/smoke.Dockerfile`.
- [x] Write `tools/scripts/smoke-in-a-box.sh`, with the missing-docker and no-daemon messages.
- [x] Check the refusal path on a machine with no docker.
- [ ] **Install Colima. This needs Edwin's word: it puts software on his machine.**
- [ ] Run `both` in the box and confirm it passes and that nothing appeared on screen.
- [ ] Run [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s breaks in it, one per run.

## Where this stands

**2026-09-12: written and unproven.** The image and the runner are in the tree and the refusal path is checked — on this machine, which has no docker, it prints the install lines and exits 127. Everything past that waits on Edwin, because installing Colima is a change to his machine and not mine to make.
