---
type: "[[adr]]"
id: ADR-0001
aliases: ["ADR-0001"]
title: "Deck serves its own renderer over HTTP and proxies the sidecar read-only"
status: accepted
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["Edwin 2026-09-06: the cockpit is not changed for Deck"]
decision: "Deck runs a small HTTP host in its own main process. That host serves the renderer and proxies read requests to the workspace sidecar, allowing GET and HEAD and refusing every other method. The Electron window loads the renderer from that host too, so both hosts serve identical bytes over one origin."
context: "The architecture note proposed that the cockpit sidecar serve Deck at /_static/. Edwin decided the cockpit is not changed for Deck, and the sidecar cannot serve an arbitrary bundle without a change."
alternatives: ["The sidecar serves Deck from /_static/", "The Electron window loads the renderer from file:// and the page calls the sidecar directly"]
consequences: ["Deck owns the only network surface it exposes, and the read-only rule is enforced at that boundary by method", "The shell window and the tablet load the same bytes over the same origin, so there is no second code path to keep honest", "Deck must pick and manage a second port beside the sidecar port", "Binding beyond loopback is opt-in, and writes stay impossible through the host regardless"]
supersedes: ""
superseded: ""
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Deck serves its own renderer over HTTP and proxies the sidecar read-only

## Context

Part 8 of the architecture options note proposed that the cockpit's sidecar serve Deck's renderer over the local network at `/_static/`, the way it already serves `cockpit.js`. Edwin decided on 2026-09-06 that the cockpit is not changed for Deck, which puts that proposal out of reach. Two facts in the sidecar's code make it out of reach anyway. The static directory is fixed at import time to the Python package's own `static/` folder, with no flag, environment variable or constructor argument that moves it. The one path that does accept an outside directory, `--shell-assets`, serves a single allow-listed file, `renderer.css`, and answers 404 for everything else, so it can carry no HTML and no JavaScript.

A second problem pushes the same way. A renderer loaded from `file://` has the origin `null`, and the sidecar returns no cross-origin headers on any JSON response. A page loaded that way cannot read the sidecar without either a content-security-policy exception, a header rewrite in the shell, or a detour through the main process, and none of those exist in the served host. That would leave Deck with two different data paths, one per host, which is the thing "one renderer with two hosts" exists to prevent.

## Options

1. **The sidecar serves Deck.** Cheapest to describe and closed by Edwin's decision, since it needs a change in the cockpit repository.
2. **File protocol in the shell, direct calls to the sidecar.** No new server, but the shell and the tablet then reach data by different routes, and the shell's route needs a cross-origin exemption to work at all.
3. **Deck serves itself, and the shell window loads that host.** One origin, one data path, and the read-only rule lands on a boundary Deck owns.

## Decision

Option 3. Deck's main process runs an HTTP host. It serves the built renderer, and it proxies requests under the API prefix to the workspace's sidecar. It allows `GET` and `HEAD` and answers 405 to every other method, so no request that could change a note reaches the sidecar through it. The Electron window loads its page from that host rather than from a file, which makes the shell and the tablet the same page over the same origin, differing only in whether the preload bridge is present.

The host binds loopback by default. Serving a tablet is opting in to a wider bind, and it changes nothing about what the host will pass through.

## Alternatives

- Serving Deck from the sidecar's `/_static/`, which needs a cockpit change.
- Loading the renderer from `file://` and calling the sidecar directly from the page.

## Consequences

- Deck owns the one network surface it exposes, and the read-only guarantee is enforced by method at that surface rather than trusted to the page.
- The shell and the served host run identical bytes, so a difference between them can only come from the capability set, which is [[TASK-0022-Capability-Is-Detected-Not-Assumed]].
- Deck manages a second port beside the sidecar's, and stops the host when it quits.
- The sidecar keeps its own loopback-only guard on writes. Deck's refusal is a second lock on a door that is already locked, which is the right number of locks for a door facing the local network.
