---
type: "[[reference]]"
id: REFERENCE-PHASE-0001-REVIEW
aliases: ["REFERENCE-PHASE-0001-REVIEW"]
title: "PHASE-0001 review: the foundations are sound and the visible application is still a flat grid, so nothing built so far demonstrates Spread"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
scope: "project"
source:
  - "Review session 2026-09-07, asked for by Edwin: 'Review the current/initial Deck application to understand how useful this current application to understand the feasibility of the overall solution and suggest how to make Phase-0001 better ... I personally think we need to add more functionality to make this any way representable.'"
  - "Deck run against project-os-deck and against Your Trainer on 2026-09-07; the served page walked in Chrome on port 7301"
  - "desktop/src/renderer/renderer.ts, desktop/src/renderer/cards.ts, desktop/src/shared/sidecar-client.ts, desktop/src/renderer/host-bridge.ts, desktop/src/main/host.ts, desktop/src/main/sidecar.ts"
  - "docs/phases/PHASE-0001-Deck.md"
related:
  - "[[PHASE-0001-Deck]]"
  - "[[FEAT-0005-Spread-Cards-On-A-Desk]]"
  - "[[FEAT-0004-Windows-On-Any-Screen]]"
  - "[[ISS-0003-A-Served-Page-Cannot-Open-A-Workspace-The-Shell-Has-Not]]"
  - "[[ISS-0004-Two-Decks-Bind-The-Same-Port]]"
  - "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"
tags: [reference, review, deck, spread, phase]
---

# PHASE-0001 review, 2026-09-07

## Purpose

This note records what a review of the running Deck application found on 2026-09-07, and what it proposes PHASE-0001 should add before the phase can be judged. Edwin accepted the finding on the same day and asked for the phase to be reworked around it. The tasks that carry the proposals are listed in [[PHASE-0001-Deck]].

## Verdict

**The foundations are sound, and the visible application does not yet demonstrate Spread at all.** What is built is a flat grid of identical cards with a reader beside it. Nothing in it can be arranged, grouped, searched, or spread across screens in a way that differs from the cockpit. The phase's exit criteria all measure plumbing, so a flat grid passes them.

## Method

Deck was run against this repository and against Your Trainer. The served page was walked in Chrome on port 7301. The renderer, the sidecar client and the phase note were read.

## What Deck does today

- **Shell, store, addresses, provider seam, read-only host: all built, all covered by eight test suites, all sensible.** The store fixes a real cockpit fault, which is that two windows never see each other change. The address parser refuses rather than defaults. The host answers 405 to every write. All of this should be kept.
- **The view is a bag of uniform cards.** Each card shows id, title, type and status band (`desktop/src/renderer/cards.ts`). Your Trainer's Issues view draws 409 cards in one flat grid. The cockpit shows the same payload as 34 needing triage on top, severity bands below, and 309 finished ones folded away.
- **The desk cannot be arranged.** There is no drag or pointer handler anywhere in `desktop/src/renderer/`. "Save desk" snapshots wherever the flow layout happened to put the cards: the save-desk handler in `renderer.ts` reads `getBoundingClientRect` of every card. Deck's state file after a day of use holds zero desks (`desks: {}` in `~/Library/Application Support/project-os-deck/deck-state.json` at revision 209).
- **A pop-out is the same view again with no navigation.** It is not a status window, a note window or a desk window. The phase's second criterion was amended on 2026-09-06 to match this rather than the other way round.
- **No search, no filter, no hierarchy, no owed marker.** `cardsFromNav` in `desktop/src/shared/sidecar-client.ts` flattens the sidecar's groups, children, subtitle, owed and owed_verb into one deduplicated list and drops them.

What the sidecar actually sends, measured on Your Trainer through Deck's own proxy:

- The features view arrives as a Needs-you group of 3 owed items, 23 phase groups whose features carry between 2 and 136 child tasks, an Unattached-tasks group of 153, and a Quiet group of 24 marked suppressed.
- The issues view arrives as Needs-triage (34), then Critical, High, Medium, Low and unset, and then the same bands again suffixed `:done` holding 309 items.
- The tests view arrives as Needs-you, three tiers with outstanding counts in the label, and Retired. Each test item carries adequacy, stale, last_verified, manual and steps.

Deck shows none of that structure.

## Why the exit criteria do not protect the goal

The phase is judged on three walks: the same notes as the cockpit, a window surviving a restart on a second display, and a tablet reading over the LAN. A grid of cards with a reader satisfies all three without ever showing that cards on a desk across screens beat four fixed panes. That was the claim of the options note ([[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 2). No criterion tests the claim.

## What would make PHASE-0001 representable, in build order

1. **Keep the sidecar's structure.** Draw the groups the payload already carries: Needs you first, phases with their features and tasks nested, severity bands, test tiers, the quiet group folded. Show the owed verb on the card. This is a small change in the client and the pool, because the data is already on the wire.
2. **Separate the list from the desk.** The options note's own recommendation was that the lists drive selection. Today the grid is the list. Put a navigator panel beside a desk that starts empty; a click or drag puts a card on the desk. A desk is then a chosen subset with positions, and saving one means something.
3. **Make cards movable and removable.** Pointer drag on the desk, remove from desk, positions saved into the desk.
4. **Give pop-outs a panel type.** A popped-out window carries one thing: the Needs-you strip, a single note, or a desk. That is the status window Edwin originally asked for on a second display, and the phase's second criterion should say so again.
5. **Search and filter in the renderer.** The DOM is pooled, so the application owns search (adoption table row `shell.stage.find`). 409 cards without a search box is not usable at Your Trainer's size.
6. **Card faces by type.** Progress for phases and features, severity for issues, staleness for tests. The tests payload already carries adequacy, stale and last_verified.
7. **Add one exit criterion a person judges.** Edwin does one real task in Deck instead of the cockpit, for example triaging the day's issues across two screens, and records which he would rather use. Every present criterion can be met by a grid.

## Two defects found on the way

- [[ISS-0003-A-Served-Page-Cannot-Open-A-Workspace-The-Shell-Has-Not]]: a served page lists workspaces it cannot open, and says only that the sidecar answered 503.
- [[ISS-0004-Two-Decks-Bind-The-Same-Port]]: the free-port probe passes on loopback while another Deck holds the wildcard address, so two Decks bind the same port.

## Maintenance

- This note records one review on one day. It is not updated as the tasks land; the phase note's "Where this stands" carries that.
- If a later review contradicts a finding here, write a new reference note and link it, rather than editing this one.
