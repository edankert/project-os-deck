---
type: "[[issue]]"
id: ISS-0048
aliases: ["ISS-0048"]
title: "Six statements across the close-out notes do not reproduce: a count invalidated by its own commit, a rule reversed the next day and still stated as current, and four smaller ones"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fourth independent review of PHASE-0001, 2026-09-09, findings 7 and 8 to 12"]
severity: low
component: docs
parent: ""
related: ["[[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]]", "[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]]"]
tests: []
---

# The third round of this, and the cause has changed

## Problem

- **TST-0026's headline is stale, on its own date.** It says 195 + 2,699 + 386 = 3,280 notes. Today the script says 201 + 2,704 + 386 = **3,291**. Most of the gap is the six `ISS-004x` notes filed one commit later — the number was invalidated by the commit series that recorded it.
- **[[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]] still states the rule its successor reversed.** "The box belongs in the question that is already being asked" was the reasoning [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]] overturned one commit later, and ISS-0037 is `fixed`, unmarked, and linked from FEAT-0013 and TST-0028.
- **"Twelve of twelve" is 18 of 18**, in ISS-0037 and in TST-0028 — and TST-0028's step table lists none of the six DES-0001 checks that ISS-0039 credits it for.
- **ISS-0040's evidence understates**: reverting it fails two checks, not one.
- **The DES-0001 block in `check-write-round-trip.mjs` posts a real transition with no revert**, unlike every other write in that script. It is safe only because the sidecar refuses it, which is the behaviour the block exists to observe.
- **TST-0028's Adequacy section carries two overlapping paragraphs**, the new one-liner and the one it was meant to replace.

## The cause is not the same as last time

[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]] was numbers read off a screen. [[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]] was numbers counted by hand. This is different: a corpus count written into a note **inside the commit that changes the corpus**, and a rule restated as current after it was reversed. A number about this repository is a measurement of a moving thing.

## Fix

Correct all six. For the corpus count, say what it is a count of and when, rather than presenting it as a standing fact — and prefer the shape of the claim ("no type where the two disagree") over the size of the corpus, because the shape is what survives a commit.

## Acceptance

- [x] The six statements match what running the thing prints today — evidence: each corrected against its own command (user:edwin, 2026-09-09)
- [x] TST-0026's count says what it counted and when, and the claim that carries weight is the one that does not move — evidence: it leads with the shape, not the size (user:edwin, 2026-09-09)
- [x] ISS-0037 says its rule was superseded, and by what — evidence: a Superseded in part section naming ISS-0040 (user:edwin, 2026-09-09)
- [x] The DES-0001 block reverts like every other write in that script — evidence: a finally with git checkout (user:edwin, 2026-09-09)

## Corrected, 2026-09-09

All six.

- **TST-0026 no longer leads with a corpus size.** It leads with the shape — no note read as different types, no type whose totals differ — and says the size moves, giving today's figure with the date and the reason an earlier one differed. A count of this repository written into this repository is a measurement of a moving thing, which is a different failure from the two before it and needs a different answer: state the claim that does not move.
- **[[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]] says which of its rules was reversed**, by what, and that the rest stands.
- **"Twelve of twelve" is eighteen of eighteen**, in both places, and TST-0028's step table now lists the design-verdict row it was missing.
- **ISS-0040's evidence says two checks**, which is what reverting it fails.
- **The `DES-0001` block reverts with `git checkout` like every other write in that script.** It was safe only because the sidecar refuses the request — which is the behaviour the block exists to observe, so relying on it was circular.
- **TST-0028's Adequacy section is one paragraph**, and it names both automated halves rather than only the older one.
