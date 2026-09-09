---
type: "[[issue]]"
id: ISS-0039
aliases: ["ISS-0039"]
title: "Deck draws Accept and Decline on every proposed design and both are dead, because it ignores the field saying that verb posts somewhere else"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The third independent review of PHASE-0001, 2026-09-09, finding 2"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]"]
tests: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]"]
---

# Two buttons on a design note, and pressing either one fails

## Problem

`ActuatorRow` carries an `endpoint` field, and `desktop/src/shared/write-client.ts:48-55` says what it is for: "the path this verb posts to, when it is not the generic transition". `applyVerb` in `desktop/src/renderer/renderer.ts` never reads it. Every verb goes to `/api/notes/transition`.

A design at `proposed` is the case where that matters, and this repository has two of them. `curl 'http://127.0.0.1:8765/api/notes/actions?id=DES-0001'` returns Accept and Decline, both with `"endpoint": "/api/design/verdict"`. Posting either as a transition comes back:

```
WriteRefused: a design verdict must name the revision it judged; use /api/design/verdict rather than a status transition (ISS-0056)
```

## Why every check missed it

Both the suite's check and `tools/scripts/check-write-round-trip.mjs` assert that the rows Deck draws are exactly the rows the sidecar returned — and both ask about `ISS-0008`, whose rows carry an empty `endpoint`. **Drawing the row right and acting on it wrong is invisible to a check that only compares the rows.**

## What the fix is not

Deck cannot post the design verdict. `/api/design/verdict` requires the revision the verdict judged, and the sidecar refuses a revision the artifact's history does not have — that is the cockpit's ISS-0056, and it is right: a verdict given to v3 says nothing about v6. Deck has no design surface and no revision history, so it has nothing honest to send.

## Fix

Draw the row and refuse to pretend. A verb whose `endpoint` Deck does not implement is shown, because a design at `proposed` really does owe somebody a decision and hiding the row would say it does not — and it is shown as unavailable, with the sentence that this verdict is recorded through the cockpit's design surface. Deck states where the decision belongs instead of failing when somebody presses it.

## Acceptance

- [x] A verb naming an endpoint Deck does not implement is drawn unavailable, with a sentence naming where the decision is recorded — evidence: npm run smoke drives DES-0001's rows in a real window (user:edwin, 2026-09-09)
- [x] Pressing it sends nothing — evidence: the same run: the intercepted write path received nothing (user:edwin, 2026-09-09)
- [x] A check drives a row that HAS an endpoint, so the case is not invisible again — evidence: check-write-round-trip.mjs asks about DES-0001, not only ISS-0008 (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**A verb Deck cannot perform is drawn, refused, and explained.** `canPerform` and `elsewhere` in `desktop/src/shared/write-client.ts` answer from the row's `endpoint`, and `applyVerb` asks before it does anything else. Pressing Accept on a design now says: *"Accept is a design verdict, and a verdict has to name the revision it judged. Deck holds no design revisions, so this decision is recorded in the cockpit."*

**Drawn rather than hidden**, deliberately. A design at `proposed` really does owe somebody a decision, and removing the row would say it does not. This is not the tablet case — there, ADR-0003 says absent rather than disabled, because on a tablet no verb can ever work. Here the verb works, in the other application, and the person needs to be told which one.

**Deck does not restate the design rule.** `IMPLEMENTED_ENDPOINTS` is a list of what Deck can post to, which is Deck's own fact about Deck. The reason a verdict needs a revision is the sidecar's, quoted.

**The check now asks about a note that HAS an endpoint.** Every check before this asked about `ISS-0008`, whose rows carry an empty one, so drawing the row right and acting on it wrong was invisible to all of them. `check-write-round-trip.mjs` asks about `DES-0001` as well, and the smoke run presses the control in a real window.

**Evidence.** Making `canPerform` return true for everything fails 5 checks in the smoke run, re-measured at commit `a729559`.
