---
type: "[[issue]]"
id: ISS-0053
aliases: ["ISS-0053"]
title: "Deck can stop offering a tick control on every note in the application and every check stays green, which is the one thing the feature is named after"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The sixth independent review of PHASE-0001, 2026-09-09, finding 3"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]", "[[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# Six rounds hardened the verbs and nobody pressed a tick

## Problem

Make `attachTicks` return immediately. Deck then offers no tick control on any note, anywhere — which is [[FEAT-0013-The-First-Write]]'s title and TST-0028's first line. `npm test` stays at 321 of 321, `run-smoke.sh loopback` exits 0, and `check-write-round-trip.mjs` reports 18 of 18.

**The round-trip script ticks through `client.tick`**, which is the route with no interface on it. That is exactly the gap [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]] was filed about for verbs: a check that proves the channel works and never proves a person can reach it.

**And there is no walk either.** [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]] carries `last_verified: ""`, so the acceptance criterion at the top of this feature has never been recorded as performed by anybody.

## Why six rounds missed it

Every round chased the finding it was given. ISS-0038, ISS-0039, ISS-0040, ISS-0045 and ISS-0050 are all about the actuator row, because the third review happened to look there — and each fix was checked in the place the finding pointed at. Nothing asked the question one level up: **which controls does this feature offer, and is each of them pressed by something?**

## Fix

Press a tick in the smoke run, the way `recordEveryVerbAsksWhy` presses a verb: find a checkbox the sidecar addressed, press the control beside it, answer the evidence box, and read what reached the shell. The write is already intercepted in the main process for the duration, so no note is touched.

And walk TST-0028, or record honestly that it has not been walked.

## Acceptance

- [x] Deleting `attachTicks` turns a check red — evidence: 1 check red by name; before, 321/321, smoke exit 0 and round-trip 18/18 all stayed green (user:edwin, 2026-09-09)
- [x] The tick a person presses is driven, not only the client method underneath it — evidence: the smoke run walks the navigator to a note with a tick control and presses it (user:edwin, 2026-09-09)
- [x] A tick offered with no evidence is refused, and that is driven too — evidence: an empty box is submitted; accepting it fails 3 checks (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The smoke run presses a tick.** It walks the navigator until a row yields a tick control — found rather than named, so the check does not depend on one particular note keeping one particular unticked box — presses it, answers the evidence box, and reads what reached the shell: the criterion the sidecar addressed, the evidence a person typed, and the note that was open. Then it presses another and submits an EMPTY box, which is the refusal a person meets most often, and asserts that nothing more was sent and that Deck said why.

**Both write channels are intercepted now**, in the main process. `deck:write:tick` was not, which is part of how this went unnoticed: there was nothing to catch a tick even if one had been pressed.

**What this says about six rounds of review.** Every round chased the finding it was given, and five of the six findings about controls were about the actuator row — because the third review happened to look there. The question nobody asked was one level up: *which controls does this feature offer, and is each of them pressed by something?* The verbs were hardened five times while the control the feature is named after had no check at all.

**Evidence.** Making `attachTicks` return immediately fails 1 check by name; before this it left `npm test` at 321 of 321, `run-smoke.sh` at exit 0 and `check-write-round-trip.mjs` at 18 of 18. Accepting a tick with no evidence fails 3.

**Still owed and not fixed here:** [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]] has never been walked by a person, and its `last_verified:` is empty. The tablet half of it needs one.
