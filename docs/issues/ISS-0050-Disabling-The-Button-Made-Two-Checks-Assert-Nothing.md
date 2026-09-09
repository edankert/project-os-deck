---
type: "[[issue]]"
id: ISS-0050
aliases: ["ISS-0050"]
title: "Disabling the button left the guard that stops the request with no check at all, and turned two smoke checks into assertions about a disabled button rather than about Deck"
status: open
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fifth independent review of PHASE-0001, 2026-09-09, finding 2"]
severity: high
component: tests
parent: ""
related: ["[[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]", "[[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]]", "[[FEAT-0013-The-First-Write]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# Two layers, and the fix for the first removed the check on the second

## Problem

[[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]] put a guard at the top of `applyVerb`: a verb Deck cannot perform says where the decision belongs and sends nothing. [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]] then disabled the button, and called the two "two layers, because the drawn state is what a person reads and the guard is what stops a request".

**Deleting the guard now changes nothing any check can see.** `run-smoke.sh loopback` exits 0 and `npm test` is 321 of 321 with those four lines removed.

**And two checks stopped measuring Deck.** `target.click()` on a disabled button dispatches no event, so *"pressing one asks nothing"* and *"and sends nothing"* are now true of `<button disabled>` and would be true of any page. They pass whatever `applyVerb` does.

This is [[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]'s own headline — a guard nothing runs — reintroduced by the commit that closed it.

## Cause

The check was written against the symptom the fix had just removed. Once the button cannot be clicked, a check that clicks it measures the button.

## Fix

Drive the guard directly. Re-enable the button in the page, click it, and assert that nothing was sent and that Deck said where the decision belongs — which is a statement about `applyVerb`, not about the disabled attribute. Keep the drawn-state checks as they are; they measure the other layer.

## Acceptance

- [ ] Deleting `applyVerb`'s refusal turns a check red
- [ ] The check that says "sends nothing" would fail if `applyVerb` sent something
- [ ] The drawn-state checks still fail when the button is not disabled
