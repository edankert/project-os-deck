---
type: "[[feature]]"
id: FEAT-0008
aliases: ["FEAT-0008"]
title: "One renderer, two hosts: the Electron shell locally, and Deck's own read-only host for a tablet"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "The same renderer runs in two places. The shell hosts it locally through the preload bridge. Deck's own small HTTP host serves it over the local network for a tablet, reading only. Capability that only the shell can offer is detected rather than assumed, and is simply absent when Deck is served."
requirements: []
tasks: ["[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TASK-0022-Capability-Is-Detected-Not-Assumed]]"]
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: changes-requested
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
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

## Independent review — 2026-09-07 (first pass, at the close-out)

**Verdict: changes-requested.** Clean context, separate session ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]). This feature had never been reviewed, so it got the closest reading of the seven.

- **A read from the served page kills a sidecar that is still indexing** ([[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]). Deck's own host is half of this: `proxy` treats a connection refusal as a dead sidecar and calls `onSidecarUnreachable`, which stops it. The served page is the only surface that can reach it, because it issues reads without waiting for a sidecar the way the shell does.
- **The forwarding allow-list reads the path and never the query** ([[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]), so `/api/render?path=...` is forwarded as written and the sidecar's own guard is the only lock. Not exploitable today; [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]'s claim that the sidecar never sees a refused target is corrected.

**What the review found strong.** [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] is the best suite in the repository: seventeen checks over real HTTP, methods `fetch` will not send pushed down a raw socket, and the double- and triple-encoded traversals from the earlier security finding. Nothing the reviewer tried got past it except the query.

**One guard that is missing rather than wrong.** The reader assigns the sidecar's HTML with `innerHTML` in a page holding the preload bridge, and Python-Markdown passes raw HTML straight through. The Content-Security-Policy meta tag in `index.html` is what stops that, and nothing asserts the tag exists, so deleting it would reopen the hole with every check green. Filed with [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]; it matters most in [[PHASE-0003-Vault]].
