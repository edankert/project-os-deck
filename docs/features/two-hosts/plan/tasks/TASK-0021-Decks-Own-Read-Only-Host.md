---
type: "[[task]]"
id: TASK-0021
aliases: ["TASK-0021"]
title: "Deck's own read-only host — it serves the renderer and proxies reads, and refuses every method that is not a read"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
parent: "FEAT-0008"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
tests: []
---

# Deck's own read-only host

## Objective

A small HTTP host inside Deck's main process serves the renderer bundle and proxies reads to the workspace's sidecar. Anything that is not a `GET` or `HEAD` is refused before it reaches the sidecar.

## Definition of Done

- [x] The host serves the same renderer files the shell loads.
- [x] A `GET` under the API prefix is proxied to the workspace's sidecar and its response returned.
- [x] Only the paths Deck reads are forwarded; anything else is refused with 403 and never reaches the sidecar. **Added 2026-09-06**, on finding that the proxy turns a network client into a loopback one, which would defeat the sidecar's own loopback-only reads.
- [x] `POST`, `PUT`, `PATCH`, `DELETE` and every other method are refused with 405, and nothing reaches the sidecar.
- [x] A path that escapes the served directory is refused with 403, including encoded traversal.
- [x] The host binds a port Deck chooses, and closes when Deck quits.

## Steps

- [x] Write the host over Node's HTTP module, with no framework.
- [x] Serve the bundle from the built renderer directory, resolving paths under it and refusing anything outside.
- [x] Proxy the API prefix to the sidecar base URL for reads only.
- [x] Test with a fake sidecar that records what reaches it, asserting nothing arrives for a refused method.

## Notes

Refusing by method at the proxy is a second lock, not the only one: the client in [[FEAT-0002-Deck-Opens-A-Workspace]] has no write method to begin with. Two locks because this one faces the local network.
