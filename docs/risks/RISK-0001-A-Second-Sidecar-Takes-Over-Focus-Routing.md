---
type: "[[risk]]"
id: RISK-0001
aliases: ["RISK-0001"]
title: "A second sidecar on the same repository takes over the cockpit's focus routing"
status: open
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: high
impact: medium
mitigation: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[PHASE-0001-Deck]]"]
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
