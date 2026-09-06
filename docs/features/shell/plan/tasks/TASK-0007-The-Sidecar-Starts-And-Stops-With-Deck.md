---
type: "[[task]]"
id: TASK-0007
aliases: ["TASK-0007"]
title: "The sidecar starts and stops with Deck — one per workspace, on a free loopback port, waited for before it is used"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
parent: "FEAT-0002"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]"]
tests: []
---

# The sidecar starts and stops with Deck

## Objective

Opening a workspace starts one sidecar process for it and hands the renderer the base URL to read from. Quitting Deck stops every sidecar it started.

## Definition of Done

- [x] A sidecar already running for that workspace is reused: Deck reads the repository's `.cockpit/url`, asks `/api/cockpit/identity`, and accepts it only when the root it reports is the workspace being opened.
- [x] Deck starts its own sidecar only when no live one answers, on a port that was free when Deck asked, and stops only the sidecars it started.
- [x] The renderer is given the base URL only after the sidecar answers a request.
- [x] Opening the same workspace twice reuses the running sidecar rather than starting a second.
- [x] Quitting Deck, including by closing the last window, leaves no sidecar process behind.
- [x] A sidecar that fails to start is reported to the renderer as an error with its output, not as an empty workspace.
- [x] A borrowed sidecar that exits while Deck is using it is re-resolved rather than left as an empty workspace.

## Steps

- [x] Read the discovery file and verify the identity before spawning anything.
- [x] Find a free loopback port, then spawn the sidecar with the workspace root and that port.
- [x] Poll a read endpoint until it answers or a timeout expires.
- [x] Keep a map of workspace root to running process and port.
- [x] Kill every child on `will-quit`, and on the main process exiting for any reason.

## Notes

Reuse before spawn, because of [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]: the sidecar writes `.cockpit/url` into the repository and the `cockpit` command follows it, so a second sidecar on one repository silently captures that routing. Loopback only. Deck never binds the sidecar to a routable address; the network surface Deck offers is its own host in [[FEAT-0008-One-Renderer-Two-Hosts]], which proxies reads.
