---
type: "[[issue]]"
id: ISS-0075
aliases: ["ISS-0075"]
title: "The smoke run takes the keyboard away from whatever the person is doing more than twenty times, because every keyboard check calls app.focus with steal and there is no way to run the checks that do not need it on their own"
status: "open"
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: "2026-09-12"
source: ["Edwin 2026-09-12: 'One other thing is can we change the testing so the deck is not constantly requesting focus?'"]
severity: medium
component: tests
parent: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The smoke run takes the keyboard away more than twenty times

## Problem

**A smoke run on a Mac interrupts whatever the person is doing, over and over, for several minutes.** `focusApp` calls `app.focus({ steal: true })` and it is called 19 times in the Glass suite and 4 more in the frame measurement, plus once when the first window is shown. Each call pulls the keyboard out of the editor or the terminal the person was typing in. Edwin cannot work while the checks run, which is why running them has had to be held until he says so.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "One other thing is can we change the testing so the deck is not constantly requesting focus?"

## Cause

Deck's keyboard checks measure something real that needs the application to be frontmost. `focusApp` says so in its own comment: on macOS `win.focus()` does not take focus from another application, a run started from a terminal is not the active one, and Chromium then holds back the renderer's focus events, so a keyboard check measures nothing. The fix at the time was to call it before every keyboard check, and there are now 23 of them.

The checks that do **not** need it are the majority. `pointer()` and `press()` both go through `webContents.sendInputEvent`, which delivers to a window whether or not the application is frontmost, and most steps then read the DOM. Nothing separates the two kinds, so a run that only wanted to check a drag pays the full price.

Linux already has the right answer and macOS has none: `tools/scripts/run-smoke.sh` re-executes itself under `xvfb-run` when there is no display, so on CI the windows open on a virtual screen and steal nothing. macOS has no equivalent, and the script says as much.

## Repro

1. Start typing in any other application.
2. `bash tools/scripts/run-smoke.sh loopback`.
3. Deck comes to the front roughly every ten seconds for the length of the run.

## Expected

An ordinary smoke run does not touch the keyboard. The checks that genuinely need Deck to be frontmost are a named subset that a person asks for, and when they do run they take focus once rather than twenty-three times.

## Four things to do, in the order that pays

1. **Split the checks by whether they need focus, and default to the half that does not.** Give `run-smoke.sh` a mode — `--no-keyboard`, the default when a terminal is attached, with the full run behind a flag and unconditional in CI. Every step that only sends pointer events and reads the DOM runs in a background window. This is the change that answers the report, and it costs a tag on each step plus a branch in the runner.
2. **Take focus once.** Even in the full run, one activation at the start of a suite is the honest amount. Whether that is enough needs a check: the repeats were added because something drifted, and the note in `focusApp` does not say what. Measure it before deleting nineteen calls.
3. **Say so at the start of the run.** `run-smoke.sh` should print one line before it begins, naming which mode it is in and whether it will take the keyboard. Today the first sign is the window arriving.
4. **Spike offscreen rendering** for the suites that do not measure frames. A `webPreferences: { offscreen: true }` window is never on screen, so it can steal nothing, and `sendInputEvent` still reaches it. Two reasons it may not work and both must be tested before it is planned: `requestAnimationFrame` and CSS transitions run on a different cadence offscreen, and the frame-rate measurement in `desktop/src/main/measure.ts` needs a real visible focused window by its own reasoning — a background window's animation frames are suspended. That measurement is [[PHASE-0002-Glass]]'s third exit criterion, so it stays a run a person schedules.

## Evidence

- `desktop/src/main/main.ts`, `focusApp`: `if (process.platform === 'darwin') app.focus({ steal: true }); win.show(); win.focus(); win.webContents.focus();`.
- Call counts on 2026-09-12: 19 in `desktop/src/main/smoke-glass.ts`, 4 in `desktop/src/main/measure.ts`, 1 in `desktop/src/main/main.ts`.
- `desktop/src/main/smoke-glass.ts`, `press()`: `win.webContents.sendInputEvent(...)` only — no focus needed to deliver the event.
- `desktop/src/main/main.ts`, window creation: `show: false` then `win.show()` for the focus window and `win.showInactive()` for the rest, so the satellites already do the right thing.
- `tools/scripts/run-smoke.sh`: the `xvfb-run` re-exec on Linux, and "no display and no xvfb-run" as the only other branch.

## Sibling search

No sibling found (searched `docs/issues/` for "focus", "steal", "smoke", "keyboard"). [[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]] is about a flaky step inside the run, not about what the run does to the machine.

## Risk scan

One trigger applies: the runner gains a mode, which is a change to a front-door command. CI must keep running the full set, so the default has to differ between a terminal and CI, and that difference is the thing most likely to let a keyboard check quietly stop running. The check on it is that CI's invocation names the full mode explicitly rather than relying on a default.

## Next Actions

- [x] **Edwin confirmed the default, 2026-09-12: "default the run to no-focus".** Recorded below.
- [ ] A task: tag the steps that need a frontmost application, default `tools/scripts/run-smoke.sh` to the half that does not, put the full run behind a named flag, make CI pass that flag explicitly, and print the mode before the first window opens.

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> default the run to no-focus

## Evidence from four runs, 2026-09-12

Edwin said to run the window suites and, four runs later, stopped them: "I am using the computer keyboard at the same time! This is not working for me!"

**This is no longer only an irritation; it makes the smoke run unable to answer a question.** Four consecutive runs of the same code gave four different failure sets, and the failures clustered on checks that need the window to hold the keyboard — one reported "the window had lost the keyboard" in its own message, another measured a flight as a cut because no frames were recorded, another found Enter had reached nothing. A run whose result depends on whether a person is typing cannot verify anything, which is a stronger reason to fix this than the interruption was.

**It also blocks [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]**, which cannot be closed until its checks can be run repeatably, and [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]], whose numbers are meaningless taken while another application is stealing the display.

## The offscreen spike, answered 2026-09-12

Step 4 of the plan above asked for a spike on offscreen rendering, and named two reasons it might not work. It was run, against Electron 32 on macOS, as a 40-line probe rather than against the real harness. **It works, and better than expected.**

| what was tested | result |
|---|---|
| a real click through `sendInputEvent` | delivered — the handler ran |
| real keys through `sendInputEvent`, into an element the page focused itself | delivered — `a`, `ArrowRight` and `Enter` all arrived |
| `element.focus()` | worked; `document.activeElement` was the input |
| `requestAnimationFrame` | **60 frames a second**, not throttled |
| layout (`getBoundingClientRect`) | correct |
| `capturePage` | returned a PNG |
| `win.isVisible()` | **false** — nothing appeared on screen |
| `document.hasFocus()` | **false** |

**So the first of the two doubts was wrong and the second stands.** The rAF cadence is not degraded offscreen, which was the reason to believe a frame measurement could not be taken there. What is false is `document.hasFocus()`, which `measure.ts` checks before it records a frame and which a handful of checks assert directly.

**What this changes.** A run that opens no window and takes no keyboard is reachable without a container, and most of the suite would work in it unaltered. It does not remove the need for the tagging this issue describes — the checks that assert `document.hasFocus()` have to be tagged either way — but it removes the argument that offscreen is only good for the non-measuring half.

**It is not built.** [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]] took the container route, which was Edwin's choice on the day. This is recorded so the spike does not have to be run again.
