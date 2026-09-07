---
type: "[[risk]]"
id: RISK-0001
aliases: ["RISK-0001"]
title: "A second sidecar on the same repository takes over the cockpit's focus routing"
status: closed
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: high
impact: medium
mitigation: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[PHASE-0001-Deck]]", "[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]", "[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]"]
---

# A second sidecar on the same repository takes over the cockpit's focus routing

## Description

The sidecar writes a discovery file, `.cockpit/url`, into the repository when it starts, and removes it when it exits. The `cockpit` command-line tool reads that file to decide which running server to talk to. Two sidecars on one repository means the last one to start owns the file, so opening a workspace in Deck while the cockpit has it open would quietly point `cockpit focus` at Deck's sidecar. Nothing reports this. The person sees commands that appear to work and a cockpit that never moves.

## What makes it likely

Deck and the cockpit are meant to be open at once during this phase, on this repository, because the first exit criterion is a side-by-side comparison of what each shows.

## Mitigation

[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]] reuses a sidecar that is already running rather than starting a second one. Deck reads `.cockpit/url`, asks `/api/cockpit/identity`, and accepts the answer only when the root it reports is the workspace Deck is opening. Deck starts its own sidecar only when no live one answers, and it stops only the sidecars it started.

## Triggers

`cockpit focus` moves a window that is not the cockpit's. A sidecar Deck did not start exits while Deck is using it, and Deck shows an empty workspace instead of re-resolving; that re-resolution is part of the same task's definition of done.

## Closed, 2026-09-07

**Deck never starts a second sidecar on a repository that already has one, so the routing file has one owner.** The risk is closed with [[PHASE-0001-Deck]], the phase that carried it, and the mitigation is in the shipped code rather than in a plan.

`desktop/src/main/sidecar.ts` reads the repository's `.cockpit/url`, calls `/api/cockpit/health` and then `/api/cockpit/identity`, and borrows that sidecar only when the root it reports resolves to the workspace Deck is opening. A borrowed handle is marked `ownedByDeck: false`, and `stopOne` sends no signal to a sidecar Deck did not start. Deck starts its own only when nothing answers.

Two checks in `desktop/tests/sidecar-client.test.mjs` guard it, under the heading that names this risk: one asserts a running sidecar for the workspace is reused and the handle is not marked as Deck's, and one asserts a sidecar reporting a different root is refused rather than borrowed. A third asserts that stopping sends no signal to a borrowed process. They are part of [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]].

**Two faults found later were about starting a sidecar, not about capturing the cockpit's routing**, and both are fixed: a port Deck offered that Python could not bind ([[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]), and two Deck windows opening one workspace at the same moment and killing each other's sidecar ([[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]). Neither was a case of Deck taking over a sidecar the cockpit owned.

**What would reopen it.** The trigger stated above still holds: if `cockpit focus` ever moves a window that is not the cockpit's while Deck is running, this note comes back to `open`.
