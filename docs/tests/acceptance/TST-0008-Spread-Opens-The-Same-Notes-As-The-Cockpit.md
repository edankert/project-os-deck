---
type: "[[test]]"
id: TST-0008
aliases: ["TST-0008"]
title: "Spread opens the same views and the same notes as the cockpit, for this repository, checked side by side"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0007-Views-Come-From-A-Provider]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "spread"
---

# Spread opens the same notes as the cockpit

## Purpose

The first exit criterion of [[PHASE-0001-Deck]]. Deck is not a second opinion about the record: for a project-os repository it shows what the cockpit shows.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **The cockpit open on the same repository**, so the two can be read side by side.

## Procedure

- Start Deck and open `project-os-deck` from the rail. The desk fills with cards.
- Open the cockpit on the same repository.
- Compare the row of view buttons across the top of each: the same names, in the same order. A difference means Deck's view provider and the cockpit's navigator have drifted, and the adoption table owes a row.
- Click **Features** in both. Compare the note ids listed, in order, and the status shown against each.
- Click **Tests** in both, then **Issues**, and compare again.
- Watch what happens to the desk as you move between views: every card on it should belong to the view you are now in.

## Expected results

- The same view names appear in both, in the same order.
- The same note ids appear in both, in the same order, with the same statuses.
- After a view change, no card from the previous view is left on the desk. The count in the status line matches what you can see.
- A difference is a defect in Deck, and is filed rather than explained.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
