---
type: "[[issue]]"
id: ISS-0010
aliases: ["ISS-0010"]
title: "Two windows opening one workspace at the same time kill each other's sidecar, so both show nothing and say the sidecar exited before it answered"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Edwin, 2026-09-07: 'They are opened but they don\'t show anything and they show the following status message: the sidecar for Your Trainer exited before it answered'"]
severity: high
component: main
parent: ""
related: ["[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]"]
tests: ["[[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]"]
---

# Two windows opening one workspace kill each other's sidecar

## Problem

**Both Deck windows open empty and say the sidecar for Your Trainer exited before it answered.** Edwin saw this on 2026-09-07, after the port retry of [[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]] had landed. It is a different fault with the same symptom, and this one Deck did to itself.

**Two windows now start at once.** A popped-out panel is reopened at launch beside the focus window ([[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]), and each window opens the workspace its state names. So two calls to resolve a sidecar arrive for the same workspace, moments apart.

**The second call stops the first call's sidecar.** Resolving registers the child process before it waits for it to answer, on purpose, so that a quit mid-wait still kills it. The second call finds that record, asks whether it is answering yet, and gets no for an answer, because the sidecar is still indexing. It then treats it as a sidecar of ours that has stopped answering and stops it. The first call is still waiting on that child, which now exits with no output at all, which is why the message carries no traceback.

**Your Trainer makes it certain rather than likely.** Its sidecar takes about ten seconds to index 2660 notes before it listens, measured by hand on 2026-09-07. Deck waits fifteen seconds for an answer, so the window in which the second call sees a sidecar that is alive but not yet answering is most of the startup.

## What it is not

Not the port, which is [[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]] and is fixed. Not the interpreter: `/Users/Edwin/Dev/repos/project-os-cockpit/.venv/bin/python3` imports the module and serves the same repository correctly when the same command is run by hand.

## Resolution

**Fixed 2026-09-07. One resolve is in flight per workspace, and a second caller waits for the first caller's answer rather than racing it.** Two windows asking at once is the normal case now, not the odd one.

**The readiness wait went from fifteen seconds to forty-five.** Your Trainer's sidecar takes about ten seconds to index before it listens, and a vault in a later phase will be slower. A timeout under that turns a slow start into a failed one, and the failure it produces is this one.

Two checks in [[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]] cover it. Two resolves arriving together get one sidecar, one port is used, and the sidecar they share is still answering afterwards, which is what the old code broke. And a sidecar that takes seconds to listen is waited for rather than reported as failed.

**Both faults were in the same message.** Before the fix, the probe reproduced the defect exactly: two ports tried, one child killed, and each window handed its own sidecar, which is also the duplicate this repository's [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]] warns about.
