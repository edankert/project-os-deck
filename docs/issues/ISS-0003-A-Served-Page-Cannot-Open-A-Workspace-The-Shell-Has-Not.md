---
type: "[[issue]]"
id: ISS-0003
aliases: ["ISS-0003"]
title: "A served page cannot open a workspace the shell has not opened, and the only thing it tells you is that the sidecar answered 503"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Found during the PHASE-0001 review, 2026-09-07: Chrome on Deck's served page listed both workspaces in the rail and one of them opened to an empty desk."]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: ["[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]"]
---

# A served page cannot open a workspace the shell has not opened

## Problem

**Deck's served page offers workspaces it cannot open.** The rail lists every workspace Deck knows about, but only the workspace the shell has already opened has a sidecar behind it. Clicking any other one gives an empty desk and a single line saying the sidecar answered 503. A person on a tablet has no way to tell that the fix is to walk over to the Mac and open that workspace in the shell.

## Repro

- Start Deck in the shell and open one workspace, for example Your Trainer.
- Open Deck's served page in a browser on the same machine, `http://127.0.0.1:<port>`.
- The left rail lists both workspaces.
- Click the workspace the shell has not opened, `project-os-deck`.

## Expected

Either the served rail does not offer a workspace it cannot open, or the message says what a person has to do about it.

## Actual

The desk is empty and the page says only that the sidecar answered 503.

## Evidence

- `desktop/src/renderer/host-bridge.ts`, the served `openWorkspace` around line 106: it dispatches `open-workspace` to the store and starts nothing.
- `desktop/src/main/host.ts` around line 191: it answers 503 with `no sidecar is running for that workspace` when `sidecarBaseFor` returns null.
- `desktop/src/main.ts` around line 165, the `deck:workspaces:open` handler: this is what resolves a sidecar, and only the shell reaches it.
- Observed 2026-09-07 in Chrome on Deck's served page at port 7301, with the shell holding only Your Trainer open.

## Options

- The served rail lists only the workspaces the shell has opened, so nothing on the page is unreachable.
- Or the rail keeps listing them and the message names the action: open this workspace in Deck on the Mac first.

Either way [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] gains a Setup line saying to open the workspace in the shell before walking the check.

## Next Actions
- [ ] Triage: pick between hiding the unreachable workspaces and explaining them.

## Resolution

**Fixed 2026-09-07. A workspace with no sidecar is now offered as unavailable rather than offered and then refused.** Deck's own host adds one field to each workspace it lists: whether a sidecar is answering for it. A served page draws those workspaces disabled, with the reason on the row, and says what to do about it. Nothing changes in the shell, where every workspace can be opened.

The check is in [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]: two workspaces, one with a sidecar and one without, and the listing says `true` for the first and `false` for the second.
