---
type: "[[adr]]"
id: ADR-0002
aliases: ["ADR-0002"]
title: "Glass is Deck's main view, built before parity with the cockpit; Spread stays a view beside it and the two share one desk"
status: accepted
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Edwin 2026-09-07: 'I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity'", "Edwin 2026-09-07, release ledger on TST-0015: 'This is a little of an open ended question and can only really be answered if all functionality is implemented ... one of the thing around relationships / dependencies I think is a little bit of an issue that I don't see this at the moment but that simply requires more functionality.'"]
decision: "Glass, the field where depth carries priority, is the surface Deck opens by default, and it is built now, in PHASE-0002, before Deck reaches parity with the cockpit. Spread stays as a second surface over the same views. The desk is one object shared by both surfaces. FEAT-0001's three measurements become exit criteria of the Glass phase rather than a gate in front of it. Parity with the cockpit is its own phase after Glass, and the walk that judges Deck against the cockpit moves there."
context: "PHASE-0001 built Spread first and gated Glass on FEAT-0001's measurements. Edwin walked PHASE-0001's checks on 2026-09-07 and marked the one that compares Deck with the cockpit as a question rather than a verdict: it cannot be answered until more is built, and what he misses is relationships between notes. Glass is the surface designed to show exactly that."
decided_option: 2
alternatives: ["Keep the order: finish Spread, reach parity, then build Glass gated on the measurements", "Build Glass now as the main view, with the measurements as exit criteria", "Build Glass only and retire Spread"]
consequences: ["The surface Deck opens for a workspace is Glass; Spread is reached by switching", "The address grammar gains a surface, with glass the default when the address does not say", "Views stay the provider's; Glass arranges the groups the sidecar already sends, and asks nothing new of the sidecar", "The desk is one store object shown by both surfaces, so a note lifted in Glass is on the desk in Spread", "FEAT-0001's measurements are written down as numbers when the phase closes, and a failed number costs the orbit arrangement, not the field", "If the field cannot hold its frame rate on a laptop, Spread returns to being the default and the phase note records it", "TST-0015 moves to the Parity phase, PHASE-0004, and PHASE-0001 loses that criterion"]
supersedes: ""
superseded: ""
related: ["[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[PHASE-0001-Deck]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Glass is Deck's main view

## Context

**Deck opens in Spread today, and Glass was planned as a later phase gated on measurements.** The architecture note of 2026-09-06 put the order as Deck (the shell, the store, Spread), then Glass, then Vault, and [[PHASE-0002-Glass]] was written so that [[FEAT-0001-The-Corpus-Has-An-Inside]] would produce three numbers before any of [[DES-0002-The-Glass-Cockpit]]'s arrangements were built.

**Edwin walked PHASE-0001's checks on 2026-09-07 and the order stopped fitting.** Five walks passed. The seventh criterion, one real task done in Deck instead of the cockpit ([[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]), came back as a question rather than a verdict. His words in the ledger: it can only be answered once the functionality is there, and what he cannot see at the moment is relationships and dependencies between notes. That is the thing Glass is designed to show: a note's neighbourhood comes to the front while you hold it, and what several notes share is marked in the field. The same day he said he still thinks Glass should be the main view, and asked for it to be built first, its issues ironed out, and parity with the cockpit worked on after that.

**Two things Spread already settled are kept.** The views come from a provider and the renderer holds no fixed list of them ([[FEAT-0007-Views-Come-From-A-Provider]]); Glass is a surface over those views, not a new list of them. And the desk, a chosen subset of notes with positions saved by name, is built and tested ([[FEAT-0005-Spread-Cards-On-A-Desk]]); Glass lifts notes onto that desk rather than inventing a second one.

## Options

1. **Keep the order.** Finish Spread, reach parity with the cockpit, then build Glass behind FEAT-0001's measurements. Costs the least surprise and delays the one surface that shows what Edwin says he misses. The parity walk would keep being answered "not yet".
2. **Build Glass now as the main view.** Open PHASE-0002 today with the field and the desk in Glass, keep FEAT-0001 as the orbit arrangement of that field, and turn its measurements into exit criteria written as numbers rather than a gate. Parity becomes its own phase afterwards and takes the walk with it. Costs a renderer built before the full-scale numbers exist, which the DES-0002 review's hybrid (near bands as DOM, the quiet band on a canvas) bounds.
3. **Build Glass only and retire Spread.** Removes a surface that is built, walked and passing, before Glass has been used for a day. The review of DES-0002 says depth is bad at counting and comparing, which is what Spread's navigator and desk are for.

## Decision

Option 2. Glass is the surface Deck opens by default, built now in [[PHASE-0002-Glass]]. Spread stays a second surface over the same views and is reached by switching. The desk is one store object that both surfaces show. [[FEAT-0001-The-Corpus-Has-An-Inside]] stays in the phase as the orbit arrangement of the field, and its three measurements are the phase's exit criteria, written as numbers. Parity with the cockpit is [[PHASE-0004-Parity]], after Glass, and [[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]] moves there. Vault follows parity.

## Alternatives

- Keep the order: Spread, parity, then Glass gated on the measurements.
- Build Glass only and retire Spread.

## Consequences

- Opening a workspace shows Glass. The address grammar gains a surface, and `glass` is what an address means when it does not say.
- The views are still the provider's. Glass arranges the groups the sidecar already sends, the same groups the navigator draws, and asks nothing new of the sidecar.
- One desk, two surfaces. A note lifted in Glass is on the desk in Spread, and a card dragged in Spread is on the desk in Glass.
- The measurements are still owed, as numbers, when the phase closes. A number that fails costs the orbit arrangement and nothing else.
- If the field cannot hold its frame rate on a laptop after the hybrid renderer, Spread returns to being the default, and [[PHASE-0002-Glass]] records that as an outcome rather than hiding it.
- PHASE-0001 loses its seventh criterion, which moves to PHASE-0004 with the walk. The phase's remaining criteria were all walked on 2026-09-07 and it can close through the ordinary close-out.

## Decision record

> [!note] Accept — 2026-09-07 (user:edwin)
> "I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity."
