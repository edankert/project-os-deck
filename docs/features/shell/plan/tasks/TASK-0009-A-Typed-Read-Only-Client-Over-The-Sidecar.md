---
type: "[[task]]"
id: TASK-0009
aliases: ["TASK-0009"]
title: "A typed read-only client over the sidecar — one method per endpoint Deck reads, and no method that writes"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
parent: "FEAT-0002"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
tests: []
---

# A typed read-only client over the sidecar

## Objective

One module holds every request Deck makes to the sidecar, typed, with the payload shapes Deck depends on written down.

## Definition of Done

- [ ] Every sidecar request Deck makes goes through this client.
- [ ] The client sends `GET` and has no method that sends anything else.
- [ ] The payload shapes Deck depends on are declared as types, and a response missing a field Deck needs is reported as an error naming the field.
- [ ] A sidecar that is unreachable produces an error the renderer can show, not an exception that stops the view.

## Steps

- [ ] Declare the types for the nav payload, the note payload and the workspace stats Deck reads.
- [ ] Write one function per endpoint, each taking the base URL.
- [ ] Write the narrow validation each response passes through.
- [ ] Cover the parsing and the failure paths with tests against recorded payloads.

## Notes

The client is the only place that knows the sidecar's route names, so a change there is one file to fix. Recorded payloads live beside the tests as fixtures rather than being fetched during a test run.
