---
type: "[[test]]"
id: TST-0007
aliases: ["TST-0007"]
title: "The host serves the renderer, proxies reads, and refuses every method and path that is not one"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/host.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh host"
covers: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Removing the method allow-list lets a `POST` reach the fake sidecar and fails the assertion that it recorded nothing; removing the containment check serves a file outside the directory and fails the traversal case."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# The host serves the renderer

## Purpose

Deck's own host is the only network surface Deck exposes. This suite drives it over real HTTP with a fake sidecar behind it and asserts that nothing but a read gets through.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0007` reproduces it locally without writing anything.

## Procedure

- Start the host with a fake sidecar behind it that records every request it receives.
- Request the renderer entry and a renderer module, and assert both are served with a sensible content type.
- Request an API path with `GET` and assert the fake sidecar received it and the response came back.
- Request the same path with `POST`, `PUT`, `PATCH`, `DELETE` and `OPTIONS`, and assert each is refused with 405 and that the fake sidecar recorded nothing.
- Request a path that walks out of the served directory, plainly and percent-encoded, and assert each is refused with 403.
- Assert only the paths Deck reads are forwarded, and that a path outside that list never reaches the fake sidecar.
- Assert the same of the **query**: an allowed path whose query names a way out is refused, in every spelling, and the fake sidecar records none of them. A filename that merely looks alarming — a per cent sign, a colon, a run of dots inside a name — still goes through.
- Assert the renderer served over the host reports the reading capability set and no shell-only capability.

## Expected results

- Reads are served and proxied.
- Every write method is refused before the sidecar is reached.
- No path outside the served directory is served, and no **query** names one either. `/api/render` takes the file it renders as a query argument, so a check that read only the path left containment to the sidecar upstream; that was [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] and it is fixed. Deck refuses the query itself now, and [[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]] is closed on that.
- The served capability set contains nothing only the shell can do.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh host`: 20 checks, all passing on 2026-09-07, driven over real HTTP with a fake sidecar behind the host. It was 17 on 2026-09-06; three arrived with the query lock and the starting-sidecar answer.
- Refused with 405: `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` through `fetch`, and `TRACE`, `PROPFIND` and an invented method down a raw socket. The fake sidecar recorded no request at all for any of them.
- Refused: five traversal spellings, plain and percent-encoded. None returned any part of the file they aimed at.
- Refused with 403 and never forwarded: the inbox, the inbox file route, the event stream, the dispatch and state routes, and a traversal inside a path that starts out allowed. The fake sidecar recorded nothing for any of them.
- Refused with 403: seven spellings of an encoded traversal out of an allowed path, including the double-encoded `%252e%252e` and the triple-encoded `%25252e`. Checked again against the real sidecar with the host bound beyond loopback.
- In the running application, a `POST` to Deck's own host answered 405.

## Adequacy (who verifies this test?)

Verified by mutation on 2026-09-06. Removing the method allow-list lets a `POST` reach the fake sidecar and fails the assertion that it recorded nothing. Removing the traversal refusal fails the containment check. Both mutations are of the guard itself, not of a message.

**One hole the first version of this suite did not close.** The path allow-list was applied to the once-decoded path and the still-encoded remainder was then handed to `fetch`, which decoded it again: `/api/render/%252e%252e/api/inbox` passed the check and resolved to `/api/inbox`. An independent review found it and demonstrated it from a non-loopback address against the real sidecar. The allow-list now runs on the resolved URL, refuses any path still carrying a percent sign, and is tested with double and triple encoding.

## What the query lock refuses, and what it does not, 2026-09-07

**Refused, and the fake sidecar records none of them:** a `..` segment plain or percent-encoded, the double-encoded `%252e%252e`, an absolute path, a drive letter with a separator after it, a traversal written as the query's *key* rather than its value (`?../../etc/passwd` parses as a key with an empty value), the dot-stripping spellings `....//` and `..;/`, and overlong UTF-8 such as `%c0%ae`. That last one matters most in principle: the parser hands the check U+FFFD while `fetch` forwards the original bytes, so what was inspected would not be what was sent — the one thing this proxy must never allow.

**Not refused, deliberately:** `50% off.md`, `a:b.md`, `ISS-0001...md`. A per cent sign that cannot be decoded twice is checked once, which is all there is to check; a colon without a separator is a filename on macOS, not a drive; a run of dots inside a name is not a segment of dots.

**What the mutation shows.** Removing the query loop from `resolveSidecarTarget` fails this suite. The check does guard.
