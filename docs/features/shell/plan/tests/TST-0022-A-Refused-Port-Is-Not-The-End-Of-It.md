---
type: "[[test]]"
id: TST-0022
aliases: ["TST-0022"]
title: "A sidecar refused its port is started on another one, two windows asking at once get one sidecar, and a slow one is waited for"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/sidecar-retry.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh sidecar-retry"
last_verified: ""
covers: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]"]
issues: ["[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]"]
tasks: []
artifacts: []
adequacy: "Removing the coalescing fails the concurrency check, which is how ISS-0010 was found: two resolves arrive, two sidecars start, and one kills the other. Lowering the readiness timeout under a sidecar's indexing time fails the slow-start check. Removing the retry fails the first check, because the workspace never opens. Retrying on every failure fails the third, because a Python that cannot import the sidecar is then tried four times over. Offering a port already tried fails the second, which asserts four different ports. The stand-in interpreter is spawned by the real supervisor with the real arguments, so a change to how Deck spawns a sidecar breaks these checks rather than passing them."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ISS-0004-Two-Decks-Bind-The-Same-Port]]", "[[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
area: "shell"
---

# A refused port is not the end of it

## Purpose

**Deck cannot know that a port is free.** It asks in one process, and the sidecar binds in another, a moment later. Node sets `SO_REUSEADDR` on every socket it binds and the sidecar's Python server does not, so a port whose previous listener has gone but whose socket still lingers looks free to Deck and is refused to the sidecar. Edwin hit exactly that on 2026-09-07: both Deck windows empty, and `OSError: [Errno 48] Address already in use` in the sidecar's own traceback ([[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]).

This suite covers the answer, which is not a better probe. A sidecar that dies saying the address is in use is started again on the next port, and a sidecar that dies for any other reason is reported at once.

Its sibling is [[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]], which covers the probe itself. The probe removes the collisions it can see; this suite covers the ones nothing can see in advance.

## Setup

Nothing to install and nothing to run by hand. The suite spawns a stand-in interpreter it writes itself, so it needs no Python and no cockpit checkout. It runs against the built modules under `desktop/dist`, which is the house rule in `desktop/tests/helpers.mjs`.

## Procedure

`bash tools/scripts/run-desktop-tests.sh sidecar-retry`

## Expected results

- A sidecar that refuses its first port is started on a second one, and the workspace opens. Two ports are tried and they are different.
- A sidecar that refuses every port is reported after four attempts rather than retried forever, and all four attempts use different ports.
- A sidecar that fails for another reason, a Python that cannot import the module being the usual one, is reported after a single attempt.
- What counts as the port being taken is read off what the sidecar printed: `[Errno 48]`, `EADDRINUSE`, or the words in either message.
- A port already offered is never offered again in the same start.
- Two windows opening one workspace at the same time are handed the SAME sidecar, one port is used, and that sidecar is still answering afterwards.
- A sidecar that takes seconds to listen is waited for rather than reported as failed.

## Evidence

**2026-09-07:** seven checks, all passing, in a run of 153 across the desktop suites. The two concurrency checks were written against the defect first: before the fix, the probe showed two ports tried, one child killed, and each window handed its own sidecar. The stand-in interpreter prints the same traceback CPython prints, and the console shows Deck saying which port was taken and that it is trying another.

## Notes

Automated, so this note carries no verdict: the continuous integration run is the verdict (ADR-0025).
