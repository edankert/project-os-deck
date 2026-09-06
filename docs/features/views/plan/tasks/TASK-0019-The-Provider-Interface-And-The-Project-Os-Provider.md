---
type: "[[task]]"
id: TASK-0019
aliases: ["TASK-0019"]
title: "The provider interface, and the project-os provider whose views match the cockpit's"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
parent: "FEAT-0007"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
tests: []
---

# The provider interface, and the project-os provider whose views match the cockpit's

## Objective

A provider answers which views a workspace has. The project-os provider returns the same views the cockpit's navigator shows.

## Definition of Done

- [x] The interface takes a workspace and returns views, each with an id, a label and how its contents are fetched.
- [x] The project-os provider's view list matches the cockpit's navigator modes, name for name, asserted by a test against the list recorded from the cockpit.
- [x] The provider is chosen by workspace kind, and an unknown kind yields no views and says so.
- [x] Adding a provider requires no change to the renderer.

## Steps

- [x] Declare the interface.
- [x] Implement the project-os provider over the sidecar client.
- [x] Record the cockpit's mode list as a fixture and assert against it.
- [x] Write the selection by workspace kind.

## Notes

The fixture is what keeps the claim honest: if the cockpit adds a view, the test fails and the adoption table gets a row, which is exactly the tracking obligation `CLAUDE.md` states.
