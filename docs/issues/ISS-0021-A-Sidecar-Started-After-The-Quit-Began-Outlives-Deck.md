---
type: "[[issue]]"
id: ISS-0021
aliases: ["ISS-0021"]
title: "A sidecar spawned after the quit began, or any quit that came from a signal, still left a Python process running after Deck was gone"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["The second close-out review, 2026-09-07, against the first attempt at FEAT-0002's fifth criterion"]
severity: medium
component: main
parent: ""
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]"]
tests: ["[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]"]
---

# A sidecar started after the quit began outlives Deck

## Problem

**Deck was made to wait for its sidecars at the quit, and two paths walked round the waiting.** This is the second pass at the doubt Edwin recorded passing [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] on 2026-09-07: "I am not sure if it doesn't leave anything running when I quit???". The first pass held the quit open until the children exited. It was not enough.

**One: a child spawned after `stopAll` was held by nobody.** `stopAll` runs once, from the quit, and stops what is in the map at that instant. There is no second `stopAll`, and a child spawned afterwards is not in the array the quit waits on. The window is real rather than theoretical: the port-collision retry spawns exactly such a child, and that retry exists because [[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]] happens. Between one attempt's child exiting and the next attempt's spawn there is a `console.log` and an `await`.

**Two: a quit from a signal never waited at all.** `process.once('SIGINT'|'SIGTERM', ...)` called `shutdown()` and then `app.exit(1)`, and `app.exit` does not raise `before-quit` — the file's own comment says so. So the wait never ran, and `stopOne`'s escalation to SIGKILL is an `unref`'d timer that cannot fire from a process that has gone. A sidecar slow on SIGTERM outlived Deck on `kill -TERM <deck pid>`, which is how a terminal-launched Deck is stopped. The boot-failure path had the same shape.

**Three: nothing checked that the quit called the waiter at all.** `waitForExit` was tested in isolation with real processes, which is right. But making `stopAll` return an empty array — so the quit waits for nothing and escalates on nothing — passed all 163 checks, and `main.ts` is unimportable by any suite.

## Repro

The reviewer's probe for the first: a stub interpreter that fails the first attempt with `[Errno 48] Address already in use` and lives forever on the second, with `stopAll()` called in the window between them.

```
quit ran stopAll(); children it signalled and will wait for: 0
records the supervisor still holds after the quit: [{"pid":35728,"alive":true}]
pid 35728 is STILL RUNNING after Deck quit
```

## Expected

Nothing Deck started is running after Deck has gone, whichever way it was told to go.

## Actual

A retried sidecar, or any sidecar at all on a signal quit, survived.

## Resolution, 2026-09-07

**The supervisor knows the quit happened.** `stopAll` sets a flag that is never cleared, and `startOnce` refuses to spawn once it is set — checked before the spawn and again immediately after, because the quit can land between the two and that spawn is the only moment anything will ever hold that child.

**Every quit path waits.** The signal handlers and the boot-failure path run the same `waitForExit` the window quit does, before `app.exit`. `process.once('exit')` still cannot wait, and cannot be made to; it stays the last-resort net it always was.

**The seam is guarded.** A check asserts that `stopAll` hands back exactly the children Deck owns and no others, so making it return nothing fails; and that a resolve arriving after the quit is refused rather than served. Together with the existing check that spawns a real process which ignores SIGTERM and asserts it dies of SIGKILL, the three cover both halves.

**What is still not guarded:** the `before-quit` handler in `main.ts` itself, which needs the Electron runtime. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]. [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] is the walk, and it needs re-walking against this build.
