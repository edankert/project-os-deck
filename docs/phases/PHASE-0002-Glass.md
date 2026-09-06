---
type: "[[phase]]"
id: PHASE-0002
aliases: ["PHASE-0002"]
title: "Glass — depth carries priority, built on what FEAT-0001 measures"
status: planned
order: 2
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
goal: "Deck gains a spatial view where how close a note is says how much it needs you, built only after FEAT-0001 has measured that the whole link graph can be delivered, laid out stably, and drawn at a usable frame rate."
features: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
requirements: []
tasks: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]]"]
issues: []
depends: ["[[PHASE-0001-Deck]]"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[PHASE-0001-Deck]]", "[[PHASE-0003-Vault]]"]
tags: [phase, glass, field, deck]
---

# Glass

## Goal

**Glass is the view where distance means importance.** A note that needs you is at the front, the view's subject is in the middle, and the quiet majority sits in a deep field behind. Switching view re-arranges the same notes rather than loading a page, so you watch a note change importance instead of finding it somewhere else.

The phase is gated on measurement, not on taste. [[FEAT-0001-The-Corpus-Has-An-Inside]] builds the read-only field over the real link graph — 16148 links across 1537 notes — and produces three numbers: whether the whole edge list can arrive in one request, whether a layout stays put when the corpus grows, and what frame rate the field holds on a laptop. [[DES-0002-The-Glass-Cockpit]]'s arrangements are built after those numbers, and only if they pass.

## Scope

- **FEAT-0001, the read-only field.** The edge payload, the layout that survives new notes, the treatment decision, the renderer, and landing on a node opening the note in Deck's reader.
- **The treatment decision.** [[DES-0001-Nine-Ways-To-Read-The-Record]] draws the same view three ways — a near-black sky of luminous points, a cyan instrument with brackets, and painted-wood solids on a lit table — and each costs something real. Edwin picks; [[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]] records the choice and the cost accepted with it.
- **DES-0002's arrangements**, if the measurements pass: the three depth bands per view, the console as furniture that cards flow around, the neighbourhood ring around a selected note, and the sector ordering that stops finished work occupying the visible columns.
- **The accessible route.** A list panel beside the field is the primary surface for keyboard and screen reader, present in every Glass arrangement, and every card visible in the field is reachable from it.
- **Pooling.** The visible arc holds roughly forty cards of 1537, so cards are drawn from a pool rather than one element per note. This is architecture, not an optimisation to add later.
- **Addresses, extended.** A Glass state — the view, the arrangement, the focused note — is addressable the way every other Deck state is.

## Out of Scope

- **Discharging any verb in the field.** An obligation lives with its subject, and the field is not its subject. Glass navigates to the reader; the reader carries the verbs.
- **Replacing the reader.** Landing opens the note in the document pane that already exists, so the field never becomes a second, worse reader.
- **A cross-repository field.** One sidecar serves one workspace; a field over the whole fleet is a separate question and is not answered here.
- **A headset.** Glass is a desktop surface with mouse and keyboard, and a tablet surface with touch. It is not a virtual-reality view.
- **`backdrop-filter` over a moving field.** Ruled out by the DES-0002 review, and harder still on a tablet GPU.
- **A light-mode Glass**, which no design has drawn yet. If it is wanted it is scoped here explicitly rather than assumed.

## Exit Criteria

- [ ] [[FEAT-0001-The-Corpus-Has-An-Inside]] is `done` and its five tasks are resolved.
- [ ] The three measurements are written down as numbers in the feature's notes: the size and time of the one request that returns the whole edge list; the position drift when a new note is added to the corpus and the layout is recomputed; the frame rate the field holds at 1537 nodes and 16148 edges on a laptop.
- [ ] Edwin has chosen the treatment, and [[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]] records both the choice and what it costs.
- [ ] Every card visible in a Glass arrangement can be reached and opened from the list panel using only the keyboard.
- [ ] Landing on a node opens the note in Deck's reader, and no verb can be discharged from the field.
- [ ] A Glass address pasted back into Deck restores the same arrangement and the same focused note.
- [ ] Glass opens in Safari on the tablet served by the sidecar, with no `backdrop-filter` over the moving field.

## Notes

**Depends on [[PHASE-0001-Deck]].** Glass is a client of the store and the address grammar that phase builds, and it is served to the tablet by the two-host rule that phase establishes. Building Glass first would mean building those twice.

**FEAT-0001 was written for the cockpit and now sits here.** Its note describes a route at `~orbit` inside the cockpit, because it was written on 2026-09-05 before Deck existed. Placing it in this phase says the field is built in Deck. Whether the cockpit also gets an orbit route is a separate decision and nobody has taken it; the feature's own text has not been rewritten, so read the venue from this phase rather than from the feature's Scope section.

**The measurements can fail.** If the edge list cannot arrive in one request, or the layout moves neighbours whenever a note is added, or the frame rate is not there, then DES-0002's arrangements are not built and this phase closes with the field alone. That is a real outcome, not a failure of the phase, and Spread is unaffected by it.

**Order.** Deck, then Glass, then Vault, decided by Edwin on 2026-09-06 ([[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 8, item 2).
