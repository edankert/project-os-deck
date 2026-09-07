---
type: "[[issue]]"
id: ISS-0011
aliases: ["ISS-0011"]
title: "A read from the served page kills the sidecar Deck is still waiting for, so a tablet opening a large workspace gets an empty screen and 'the sidecar exited before it answered'"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review for the PHASE-0001 close-out, 2026-09-07 ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]])"]
severity: high
component: main
parent: ""
related: ["[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# A read from the served page kills a sidecar that is still indexing

## Problem

**A tablet opening a big workspace sees an empty screen and the message "the sidecar for X exited before it answered".** It is the symptom of [[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]], reached down a different path that the ISS-0010 fix does not cover. Deck kills its own sidecar while it is still starting, then reports that the sidecar died on its own.

**Deck coalesces concurrent starts; it does not coalesce a read against a start.** `SidecarSupervisor.startOnce` puts the record in the map before it waits for the sidecar to answer, on purpose, so that a quit mid-wait still kills the child (`desktop/src/main/sidecar.ts:178`). The consequence is that `sidecarBaseFor` answers with a live-looking address for the whole indexing window, which for Your Trainer's 2660 notes is about ten seconds and can be forty-five. A read arriving in that window gets a connection refusal, and `DeckHost.proxy` treats a refusal as a dead sidecar: it calls `onSidecarUnreachable` (`desktop/src/main/host.ts:211`), which `desktop/src/main/main.ts:50` wires to `sidecars.forget(id)`, which for a record Deck owns calls `stopOne` and sends the child SIGTERM (`desktop/src/main/sidecar.ts:225-236`).

**The Electron window cannot hit it; the served page can.** In the shell, `boot` awaits `openWorkspace`, which awaits `resolve`, so no read is issued until the sidecar answers. A page Deck serves over the LAN has no such gate: its `openWorkspace` only dispatches locally and returns success (`desktop/src/renderer/host-bridge.ts:106-111`), and `loadView` reads straight away. That is exactly the configuration this phase's third exit criterion ships and [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] walks.

## Repro

The reviewer's probe: a stub sidecar that starts listening after three seconds, with one proxied navigator read issued at 500ms.

```
proxied read answered 502
resolve settled as {"ok":false,"e":"Error: the sidecar for a repo exited before it answered (using .../python-stub.mjs)"}
```

By hand: open a workspace big enough to take several seconds to index (Your Trainer) from Safari on the tablet, on a Deck that has no sidecar running for it yet.

## Expected

A read that arrives while Deck is still starting a sidecar waits for that start, or is refused with "still starting", and the sidecar lives.

## Actual

The read is answered 502, the sidecar is killed, and the resolve that was waiting on it fails with a message that blames the sidecar.

## Evidence

- `desktop/src/main/sidecar.ts:178` — the record is registered before `waitForHealth`, with the comment stating the intent.
- `desktop/src/main/sidecar.ts:220-236` — `forget` calls `stopOne` for an owned record.
- `desktop/src/main/host.ts:211` — a `fetch` rejection calls `onSidecarUnreachable`.
- `desktop/src/main/main.ts:50` — `onSidecarUnreachable: (id) => sidecars.forget(id)`.
- `desktop/src/renderer/host-bridge.ts:106-111` — the served page's `openWorkspace` does not await a sidecar.

## Next Actions

- [ ] Decide the shape of the fix: a record is not offered by `sidecarBaseFor` until it is ready, or `forget` refuses to stop a record whose readiness wait has not finished, or the proxy distinguishes "starting" from "gone".
- [ ] Guard it with a check in `desktop/tests/sidecar-retry.test.mjs`, where the ISS-0010 coalescing check already lives.
