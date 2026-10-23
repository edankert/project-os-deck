---
type: "[[test]]"
id: TST-0109
aliases: ["TST-0109"]
title: "Deck opens only on the overview, a state file from before opens cleanly, and the tag still holds the original Deck"
status: draft
owner: user:edwin
created: 2026-10-23
updated: 2026-10-23
source: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "Deck desktop, the wheel of phases"
command: ""
last_verified: ""
covers: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"]
issues: []
tasks: ["[[TASK-0216]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[TST-0108]]"]
area: "overview"
after: []
---

# Deck opens only on the overview

## Purpose

**Edwin checks that Deck now opens on the overview and nothing else, that the Deck he already ran opens without losing anything, and that the original Deck can still be had from its tag.** It stays `draft` until [[TASK-0216]] is done, because nothing is built yet.

## Setup

Keep a copy of Deck's state file from before the removal. Deck and the cockpit can both be open on Deck's own repository.

## Steps

1. Start Deck. It opens on the wheel of phases. Look for a view switcher, a Glass or Spread button, or a surface toggle: there is none.
2. Open a phase, a ticket and the towers. Open the agent pane, Needs you and the shell drawer. Each works as it did before.
3. Quit Deck, put the old state file back, and start Deck again. It opens on the overview with the same workspaces, and shows no error.
4. Paste an address copied from the original Deck, for example one naming Glass or a desk. Deck opens the overview and says that view is not in this Deck.
5. Open the served page on the tablet. It shows the overview and offers no verb.
6. In a scratch directory run `git clone --branch original-deck-2026-10-23 <repository> original-deck`, then `cd original-deck/desktop && npm install && npm start`. The original Deck opens, and Glass and Spread are offered beside the overview.

## Expected

Every step behaves as written. A step that does not is recorded with what was seen instead.
