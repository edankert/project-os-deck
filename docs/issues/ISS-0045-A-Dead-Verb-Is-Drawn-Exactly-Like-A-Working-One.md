---
type: "[[issue]]"
id: ISS-0045
aliases: ["ISS-0045"]
title: "A verb Deck cannot perform is drawn identical to one it can — same colour, same cursor, not disabled — and the check that was supposed to prove otherwise reads a different element"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fourth independent review of PHASE-0001, 2026-09-09, findings 2 and 3"]
severity: high
component: renderer
parent: ""
related: ["[[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]]", "[[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]]", "[[FEAT-0013-The-First-Write]]"]
tests: []
---

# "Drawn unavailable" is not what is drawn

## Problem

**The button is not disabled.** [[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]]'s close-out says a verb Deck cannot perform is "drawn unavailable". `drawActuators` sets its `title` and appends a sentence beside it, and leaves `button.disabled = row.disabled` — which the sidecar returns as `false`. Probed in a live window, DES-0001's rows come back `{"disabled": false, "opacity": "1", "cursor": "pointer"}`: identical to a verb that works. `deck.css` greys only `:disabled`. A person sees two ordinary buttons and finds out by pressing one.

**And nothing catches it.** Reverting `drawActuators` to what it was leaves 320 checks passing and the smoke run `ok: true`, because the three smoke checks read `#status` — a sibling of `#actuators` — and never look at the button.

**The other half is the same shape.** `recordEveryVerbAsksWhy` picks a verb with `verbs.find((b) => b.dataset.confirm === 'false') ?? verbs[0]` and never says which branch it took. Hard-wire `data-confirm` to `'true'` so the selector can never match, and the smoke run still reports `ok: true` — the check *"pressing a verb that does NOT stop to confirm still asks why"* passes with the fact unmeasured. It is right today only because `verbs[0]` for ISS-0008 happens to be Accept.

## Cause

Both are the same mistake: asserting on a consequence that other things also produce. The status bar carries a sentence for many reasons; the fallback `?? verbs[0]` is invisible in the result. This is the class the last three reviews each found once.

## Fix

Disable the button, and assert on the button. Return what was actually pressed — its verb and its `confirm` — and fail when the pressed verb is not the one the check claims to be about.

## Acceptance

- [x] A verb Deck cannot perform is `disabled` in the page, not merely titled — evidence: the smoke run reads disabled per row on DES-0001 (user:edwin, 2026-09-09)
- [x] Reverting the drawn half turns a check red — evidence: 1 check red, naming both rows and their state (user:edwin, 2026-09-09)
- [x] The verb check reports which verb it pressed and its `confirm`, and fails when it did not press a non-confirming one — evidence: 2 checks red when every row claims to confirm; the first reports pressed: null (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The button is disabled.** `drawActuators` sets `button.disabled = row.disabled || !canPerform(row)`, which is what makes `deck.css`'s `:disabled` rule apply. A verb Deck cannot perform is now grey and unclickable with the reason beside it, instead of an ordinary button that fails when pressed. `applyVerb`'s guard stays as well: two layers, because the drawn state is what a person reads and the guard is what stops a request.

**And the check reads the button.** The three smoke checks used to read `#status`, a sibling of `#actuators`, so reverting the drawn half left them green with every row still looking like a working verb. They now assert on `disabled` and on the title, per row, and print what they saw.

**The verb check says what it pressed.** The `?? verbs[0]` fallback is gone and the result carries the pressed verb, its `confirm` and its `disabled`. A run that cannot find a non-confirming verb fails saying so rather than pressing whatever is first — it was landing correctly only by luck of ordering.

**Evidence.** Two mutations, two killed. Leaving the button enabled fails 1 check naming both rows and their state; hard-wiring every row to `confirm: true` fails 2, the first of them reporting `pressed: null`.
