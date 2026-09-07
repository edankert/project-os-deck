---
type: "[[issue]]"
id: ISS-0014
aliases: ["ISS-0014"]
title: "Deck's forwarding allow-list constrains the path and never the query, so a request from the LAN can ask the sidecar to render any file and only the sidecar's own guard stops it"
status: fixed
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

## Resolution, 2026-09-07

**Deck now refuses a query value that names a way out, so its host is a lock for this shape too.** `namesAWayOut` in `desktop/src/main/host.ts` checks every query value for a `..` segment, an absolute path, a Windows drive letter or a NUL, and checks it again one decoding further so a doubly-encoded traversal cannot survive one check and be decoded by whoever reads it. It applies to every forwardable path rather than to `/api/render` alone, because `/api/cockpit/locate` and `/api/cockpit/context` already forward and the Glass phase will start sending them arguments.

**A literal per cent in a filename is not refused.** A note called `50% off.md` cannot be decoded a second time, and turning that into a refusal would make the note unreadable over the LAN because of a character in its name. A value that will not decode is checked once, which is all there is to check.

**Six spellings are refused and the sidecar sees none of them**, in `desktop/tests/host.test.mjs`, alongside a check that the read Deck actually makes still goes through — including the per cent sign.

[[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]] is closed with this: the dependency on the cockpit's own guard is no longer the only thing standing there.

## Widened the same day, after a second review got three spellings past it

The first version checked query **values**. Three shapes walked round that, none of them exploitable against today's sidecar and all three now refused:

- **A query with no `=` in it.** `?../../../../etc/passwd` parses as a *key* with an empty value, so a check that read values saw nothing. Keys are checked now.
- **`....//` and `..;/`.** Servers that strip dots, or that read `;` as a path parameter, collapse these into `..`. CPython does neither, so the sidecar was never reachable this way. They are refused rather than reasoned about again the next time something changes behind this proxy: a segment of nothing but dots, with any `;`-parameter cut off first.
- **Overlong UTF-8, `%c0%ae`.** This is the one that matters in principle. `searchParams` decodes it to U+FFFD while `fetch` forwards the original bytes, so the check was inspecting a *different string* from the one being sent — which is precisely what `isForwardable`'s own comment refuses to allow for the path. A value carrying the replacement character is refused.

**Two false positives were removed at the same time.** `a:b.md` was read as a drive letter; a drive letter now needs a separator after it, and a colon in a filename is legal on macOS. `ISS-0001...md` was fine and stays fine: a run of dots inside a name is not a segment of dots.
