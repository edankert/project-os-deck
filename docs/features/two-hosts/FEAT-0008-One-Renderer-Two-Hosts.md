---
type: "[[feature]]"
id: FEAT-0008
aliases: ["FEAT-0008"]
title: "One renderer, two hosts: the Electron shell locally, and Deck's own read-only host for a tablet"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "The same renderer runs in two places. The shell hosts it locally through the preload bridge. Deck's own small HTTP host serves it over the local network for a tablet, reading only. Capability that only the shell can offer is detected rather than assumed, and is simply absent when Deck is served."
requirements: []
tasks: ["[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TASK-0022-Capability-Is-Detected-Not-Assumed]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# One renderer, two hosts

## Goal

The same renderer runs in two places. The shell hosts it locally through the preload bridge. Deck's own small HTTP host serves it over the local network for a tablet, reading only. Capability that only the shell can offer is detected rather than assumed, and is simply absent when Deck is served.

## Scope

**In scope.** A host inside Deck's main process that serves the renderer bundle and proxies reads to the workspace's sidecar. The proxy allows `GET` and `HEAD` and refuses every other method, so a write cannot reach the sidecar through it whatever the page asks. It also forwards only the handful of paths Deck actually reads: the proxy makes every request appear to come from loopback, and the sidecar withholds some reads from everywhere else, so forwarding anything under `/api` would hand a tablet exactly what that guard exists to withhold. Capability detection through the preload bridge, so the renderer asks what this host can do instead of assuming a shell. Shell-only capability, pop-out windows among it, absent and not merely disabled when served.

**Why Deck serves itself.** [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] records the decision and the alternative that was rejected, which was asking the cockpit's sidecar to serve Deck's bundle.

**Out of scope.** Authentication, and therefore any write from the served host under any condition. Writes over the network stay behind the cockpit's authentication precondition, and Deck adds no write path at all.

## Acceptance

- The renderer served over the network draws the same views and the same cards as the renderer in the shell, from the same source files.
- A `POST`, `PUT`, `PATCH` or `DELETE` through the host is refused, and nothing reaches the sidecar.
- A path outside the served bundle is refused, including one that walks up out of the directory.
- A sidecar path Deck does not read is refused, and the sidecar never sees it. The inbox is the case that matters: the sidecar allows it from loopback only, and everything Deck forwards reaches the sidecar from loopback.
- The served renderer offers no pop-out window and no shell-only action, because the capability is reported absent rather than disabled.
- The host binds a port Deck chooses and stops when Deck quits.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0021-Decks-Own-Read-Only-Host]], [[TASK-0022-Capability-Is-Detected-Not-Assumed]]
- Plan: `docs/features/two-hosts/plan/PLAN.md`

## Where this stands

**2026-09-06: built and tested; the acceptance walk is owed.** The status is `review` rather than `done` because one criterion here can only be settled by a person doing something a machine cannot: opening Deck's served address in Safari on a tablet on the same network. That walk is [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]].

**Everything short of the tablet is verified.** Deck's served address was opened in a desktop browser on 2026-09-06: no preload bridge, the same seven views, the same thirty cards with the same ids, no pop-out control and no add-workspace control anywhere in the interface, and the host reporting a capability set that is false throughout. A `POST` to it answered 405. What the tablet adds is Safari, touch, and a second machine.
