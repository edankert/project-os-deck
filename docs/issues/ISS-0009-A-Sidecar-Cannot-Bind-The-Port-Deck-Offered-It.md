---
type: "[[issue]]"
id: ISS-0009
aliases: ["ISS-0009"]
title: "A sidecar Deck starts can be refused the port Deck offered it, because Deck's probe sets a socket option the sidecar's Python server does not, and the workspace then will not open"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Edwin, 2026-09-07, walking the panel restart: 'Both windows don't show anything and I see the following issue: the sidecar for Your Trainer exited before it answered ... OSError: [Errno 48] Address already in use'"]
severity: high
component: main
parent: ""
related: ["[[ISS-0004-Two-Decks-Bind-The-Same-Port]]", "[[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
tests: ["[[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]"]
---

# A sidecar cannot bind the port Deck offered it

## Problem

**A workspace will not open, and both Deck windows are empty.** Edwin hit this on 2026-09-07, restarting Deck to check that a popped-out window comes back. Deck said the sidecar for Your Trainer exited before it answered, and the sidecar's own traceback said why: `OSError: [Errno 48] Address already in use`.

**Deck offered a port that Python could not take.** Deck asks two questions before it offers a port: does anything answer a connection there, and can this process bind it. Both said the port was free. Python then failed to bind the same port a moment later.

The two binds are not the same bind. Node sets `SO_REUSEADDR` on every socket it listens on; CPython's `socketserver` sets it only when `allow_reuse_address` is on, and the cockpit's server does not turn it on. So a port whose previous listener has gone but whose socket is still lingering is bindable by Deck's probe and refused to the sidecar. The state was there to be hit: a your-trainer sidecar on 8901 had just been stopped when Deck stopped, and the restart came seconds later.

**A better probe cannot fix this.** Whatever Deck asks, it asks in a different process from the one that will bind, at a different moment. The same shape of failure follows from any race with any other process on the machine.

## Resolution

**Fixed 2026-09-07 by retrying rather than by probing harder.** A sidecar that dies saying the address is in use is started again on the next free port, up to four ports, and each port Deck has already offered is excluded from the next choice. A sidecar that dies for any other reason, a Python that cannot import the module being the usual one, is reported at once and not retried.

**The port was only half of it.** Edwin hit the same empty windows again after the retry landed, and the second cause is in [[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]: two windows now boot at once, both open the same workspace, and the second one stops the sidecar the first is still waiting for.

The check is [[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]. It spawns a stand-in interpreter exactly as the real one is spawned, and that stand-in refuses its first port with the same traceback CPython prints.
