---
type: "[[task]]"
id: TASK-0081
aliases: ["TASK-0081"]
title: "A Linux box for the smoke run to open its windows in, so verifying a deliberate break costs two minutes and none of a person's keyboard"
status: done
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
- [x] **Install Colima.** Done 2026-09-12 on Edwin's word: "Install the docker solution suggested and use this to run the tests".
- [x] Run the suite in the box and confirm nothing appears on screen. Done: it runs to a verdict, and nothing of Edwin's was disturbed.
- [ ] Run [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s breaks in it, one per run.

## Outcome

**Done 2026-09-12. The box runs Deck's whole smoke suite to a verdict, on its own screen, while Edwin uses his machine.** Colima 4 CPUs / 8 GB, a native arm64 image, no emulation.

**Five things were wrong before it ran, and none of them was guessable.**

| what broke | why | the fix |
|---|---|---|
| The repository mounted as an empty directory | macOS is case-insensitive and handed back `/Users/Edwin`; the Linux VM shares the home directory as the system spells it, `/Users/edwin`. **Docker does not refuse an unmounted path — it creates an empty one**, so the run started and said "No such file or directory" about a script sitting right there. | normalise the path's case against `$HOME`, and check the mount landed before running |
| `xvfb-run: xauth command not found` | `xvfb` does not depend on `xauth` in slim images | install `xauth` |
| `No module named project_os_cockpit` | Deck reads through the cockpit's sidecar from a sibling checkout and never vendors it, and it has to be IMPORTABLE, not merely present | mount the sibling beside the repository and `pip install -e` it at start |
| The run hung with no child process and no output, twice, for half an hour | `run-smoke.sh` re-execs under `xvfb-run --auto-servernum` when it finds no display — right on a CI runner, and here it started Xvfb, lost its child and sat in `sigsuspend` | the entrypoint owns the display, so the script finds one and never takes that branch |
| The run reached Glass, saturated a core and stopped progressing | a container's `/dev/shm` is 64 MB, and Electron's GPU process fails to initialise so Chromium falls back to software COMPOSITING rather than SwiftShader. Neither crashes; both stall, which reads as a slow machine and is not one | `--shm-size=1g`, and `ELECTRON_EXTRA_LAUNCH_ARGS` naming SwiftShader |

**One check fails in the box and passes on CI**, and it is not this feature's: the ISS-0039 guard that every verb on `DES-0001` is drawn disabled reports both drawn enabled. The same Deck code passed that check on CI 40 minutes earlier, and the one thing that differs is the sidecar — CI clones the cockpit's `main`, the box mounts Edwin's working checkout. Recorded rather than chased: it is a difference between two sidecars, not a defect in Deck.

**What a run costs.** About half an hour for `loopback` alone, against six minutes on CI. Software rasterisation of the Glass field is the whole of it. That is cheap enough for a break a person is waiting on and too slow to run a dozen of them casually, which is worth knowing before planning the rest of [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s breaks.
