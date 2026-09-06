---
type: "[[task]]"
id: TASK-0020
aliases: ["TASK-0020"]
title: "The switcher draws what the provider returned — and the renderer holds no list of view names"
status: backlog
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

# The switcher draws what the provider returned

## Objective

The view switcher renders the provider's list. No view name is written in the renderer.

## Definition of Done

- [ ] The switcher's buttons come from the provider's returned list, in its order.
- [ ] No view id or label appears as a literal anywhere in the renderer, asserted by a test that greps the renderer sources.
- [ ] Selecting a view loads that view's contents through the provider.
- [ ] A view id that the provider did not return cannot be selected, and one asked for by address is reported unknown.

## Steps

- [ ] Render the switcher from the provider's list.
- [ ] Route selection through the provider.
- [ ] Write the test that asserts no literal view names in the renderer sources.

## Notes

A grep test is crude, and it is the only kind that actually catches the failure this rule exists to prevent: someone adding one convenient hard-coded button.
