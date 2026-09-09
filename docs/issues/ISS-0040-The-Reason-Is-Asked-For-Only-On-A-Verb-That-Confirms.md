---
type: "[[issue]]"
id: ISS-0040
aliases: ["ISS-0040"]
title: "Deck asks why only for a verb that stops to confirm, so accepting an issue still records no reason, and the check that proved the fix drives the verb the interface never asks about"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The third independent review of PHASE-0001, 2026-09-09, finding 3"]
severity: high
component: renderer
parent: ""
related: ["[[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]]", "[[FEAT-0013-The-First-Write]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# The fix was proved on the one verb it does not apply to

## Problem

[[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]] was fixed at the shell and half fixed at the screen. `applyVerb` collects a reason only inside `if (row.confirm)`. The sidecar marks `Decline` and `Supersede` as confirm and nothing else, so **Accept, Defer and every forward move still send no reason at all** — which is the same silence ISS-0037 was filed about, on three verbs out of five.

**And the check that proved the fix drives one of those three.** `tools/scripts/check-write-round-trip.mjs` takes `offered[0]`, which for `ISS-0008` is Accept, and passes `note:` and `severity:` itself rather than building the request the way `applyVerb` does. So the green line — "the reason Deck sent is IN the file, under the cockpit's own `## Decision record` heading" — measures the shell's mapping on a verb the interface sends neither field for. Building the request as `applyVerb` builds it for Accept and posting it gives `has ## Decision record: false`.

`grep -rn "applyVerb\|drawActuators\|triaging\|askText" desktop/tests/` returns nothing. The renderer half is covered by no check at all.

## Cause

ISS-0037's own reasoning: "the box belongs in the question that is already being asked rather than in a new one". That put the reason where the interruption was, and left it off every verb that does not interrupt. Deferring an issue is exactly the decision whose grounds somebody wants six months later.

## Fix

Ask on every verb, not only the ones that confirm. The reason stays optional and the question is one line in the status bar, which is where Deck asks everything else. And drive it: the smoke run has a real window and can press the button.

## Acceptance

- [x] Accepting or deferring an issue in Deck offers the same reason box that declining does — evidence: npm run smoke presses a row the sidecar marks confirm:false and reads the label (user:edwin, 2026-09-09)
- [x] A check drives `applyVerb` itself rather than the mapping underneath it — evidence: the smoke run clicks the control in a real window and answers the status bar (user:edwin, 2026-09-09)
- [x] `check-write-round-trip.mjs` builds its request the way the renderer builds it, so it cannot pass on a route the interface does not take — evidence: it now calls transitionRequestFrom, the same function main.ts calls (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**Every verb asks why.** The box moved out of the confirmation and onto the verb, so accepting or deferring an issue records its grounds the same way declining does. It stays optional, and Escape or an empty box means *no reason* rather than *cancel*.

**And the check presses the button.** The smoke run opens a window at a note the sidecar offers verbs on, clicks the row in the navigator the way a person does, presses a verb, answers every box Deck puts in the status bar, and reads what reached the shell. `applyVerb` had no check of any kind before this.

**Three things had to be got right for that check to mean anything, and each was got wrong first:**

- **The write is intercepted in the MAIN process.** `window.deck` comes through `contextBridge`, which freezes it, so replacing the bridge from inside the page is refused in silence. The first version believed it had replaced it and had not — the run pressed Accept for real and moved `ISS-0008` from `triage` to `open` in this repository, with a callout reading "because the smoke run said so". It was reverted with `git checkout`. The check now proves the interception with a probe write before it presses anything, and skips loudly rather than proceeding if the probe does not land.
- **The LABEL is asserted, not the count.** Deck asks twice for an issue leaving `triage` — the reason, then the severity — so "a box appeared" is satisfied by the severity box alone, and the first version survived putting the reason back inside the confirmation.
- **The verb is picked by what the row says, never by its name.** `TST-0033` refuses to let any verb name exist in Deck's source, and it caught `'Accept'` written into the smoke run. The button now carries the row's own `confirm` value, and the check presses a row that does not confirm without knowing what it is called.

**Evidence.** Putting the reason back inside `if (row.confirm)` fails 2 checks; it failed nothing before.
