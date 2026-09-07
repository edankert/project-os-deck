---
type: "[[risk]]"
id: RISK-0002
aliases: ["RISK-0002"]
title: "Deck's read-only guarantee rests on the sidecar's own path checks for anything carried in a query string, and Deck does not know when those change"
status: closed
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Risk scan at the close-out of [[PHASE-0001-Deck]], 2026-09-07", "[[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: low
impact: high
mitigation: ["[[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]"]
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]", "[[PHASE-0003-Vault]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
---

# Deck's read-only guarantee rests on the sidecar's own checks

## Description

**Deck tells a person that its own host is a lock, and for one shape of request it is not.** Deck's forwarding allow-list is matched against the request path. `/api/render` takes the file it renders as a query argument, so an allowed path carrying any target at all is forwarded verbatim from the local network to the sidecar. What refuses it is the cockpit's `_serve_render`, in another repository, which checks for `..` parts and then that the target is under the docs root.

Nothing in Deck watches those two checks. They are not in Deck's tests, not named in [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]], and not on the adoption table as a capability Deck depends on. If the cockpit ever reorganises that function — and the cockpit is where new functionality lands, by design — Deck's LAN-facing host becomes a file reader and no check in this repository goes red.

## What makes it low likelihood and high impact

Low, because the sidecar's guard is old, tested upstream, and there is no reason to remove it. High, because Deck's whole claim on this surface is "reads only, and Deck's host is a second lock", and the surface is a host bound beyond loopback for a tablet. A person who trusts that sentence would put Deck on a network where they would not put a file server.

**It gets worse in [[PHASE-0003-Vault]].** Today the docs root holds Edwin's own project notes. A vault is a different proposition: `~/Notes` is a personal corpus, and the phase's whole point is pointing Deck at it.

## Mitigation

[[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] is the work. Two shapes are open and the issue does not pick between them: Deck constrains the query for the paths that take a file argument, or Deck accepts the sidecar as the only lock, says so in [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] and in [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]], and adds a row to `docs/reference/cockpit-adoption.md` so the dependency is tracked like every other one.

**The second shape is not the cheap way out.** It is arguably the right answer — one lock that is tested where it lives beats two that drift — but only if the dependency is written down where somebody re-reading the register will see it.

## Triggers

A cockpit change note touching `_serve_render`, its traversal check or its docs-root check. Deck's host being bound beyond loopback on a network Edwin does not control. [[PHASE-0003-Vault]] opening with this still unresolved.

## Closed, 2026-09-07

**Deck refuses the shape itself now, so its host is a second lock here as it is everywhere else.** [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] is fixed: `namesAWayOut` in `desktop/src/main/host.ts` checks every query value on every forwardable path, once as the URL parser decoded it and once a decoding further, for a `..` segment, an absolute path, a drive letter or a NUL. Six spellings are refused in `desktop/tests/host.test.mjs` and the fake sidecar records none of them.

**The hazard was that Deck's claim rested on a function in another repository that nothing here watched.** It no longer rests there alone. The cockpit's `_serve_render` still refuses these too, which is the right number of locks for a door facing the local network, and neither one is now load-bearing by itself.

**What would reopen it.** A forwardable path added to Deck that takes its argument somewhere this check does not read — a header, or a path segment. The path rule already refuses an encoded segment, so that would have to be a deliberate loosening.
