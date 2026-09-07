---
type: "[[issue]]"
id: ISS-0014
aliases: ["ISS-0014"]
title: "Deck's forwarding allow-list constrains the path and never the query, so a request from the LAN can ask the sidecar to render any file and only the sidecar's own guard stops it"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review for the PHASE-0001 close-out, 2026-09-07 ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]])"]
severity: medium
component: main
parent: ""
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# The forwarding allow-list reads the path and never the query

## Problem

**Deck forwards an arbitrary file request from the local network to the sidecar, and nothing in Deck refuses it.** `/api/render` takes its target as a query argument, so an allow-list that only checks the path lets the whole request through. Containment rests entirely on the sidecar upstream. **It is not exploitable today** — the sidecar does refuse it — but Deck's own lock does not cover the shape, and [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] claims it does.

That test note's Expected results say "A sidecar path Deck does not read is refused, and the sidecar never sees it." The second half is false for anything carried in the query.

## Repro

Against a recording fake sidecar behind Deck's host:

```
404  traversal in the query  /deck/sidecar/aaaa1111/api/render?path=../../../../etc/passwd
sidecar saw: [{"method":"GET","url":"/api/render?path=../../../../etc/passwd"}]
```

## Expected

Deck refuses a request whose query names a target outside the workspace's docs root, or the test note stops claiming that it does.

## Actual

Deck forwards it. `../project-os-cockpit/src/project_os_cockpit/server.py`, `_serve_render`, is what refuses it: first `any(part == ".." ...)` returning "path traversal blocked", then `_is_under(target, docs_root)`.

## Evidence

- `desktop/src/main/host.ts` — `resolveSidecarTarget` is given `${sidecarPath}${search}` and the allow-list is matched against the path only.
- The probe output above; the sidecar's request log recorded the forwarded query.

## Next Actions

- [ ] Decide whether Deck constrains the query for the paths that take a file argument, or whether the sidecar's guard is accepted as the only lock and [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] is reworded to say so.
- [ ] Two smaller results from the same probe, neither a defect: `/deck/sidecar/<id>//healthz` is refused 403 although it is a legitimate read a hand-typed URL could produce, and `/deck/sidecar/<id>/healthz/../../api/inbox` answers 503 "no sidecar is running for that workspace" rather than 403 — URL normalisation neutralises the traversal before the workspace id is split off, so the message misdescribes what happened.
