---
type: "[[test]]"
id: TST-0007
aliases: ["TST-0007"]
title: "The host serves the renderer, proxies reads, and refuses every method and path that is not one"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
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
- Assert the renderer served over the host reports the reading capability set and no shell-only capability.

## Expected results

- Reads are served and proxied.
- Every write method is refused before the sidecar is reached.
- No path outside the served directory is served.
- The served capability set contains nothing only the shell can do.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh host`, run from the repository root.

## Adequacy (who verifies this test?)

Removing the method allow-list lets a `POST` reach the fake sidecar and fails the assertion that it recorded nothing; removing the containment check serves a file outside the directory and fails the traversal case.
