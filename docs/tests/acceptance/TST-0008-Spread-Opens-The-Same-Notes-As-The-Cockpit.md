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
- **The window has four columns.** The workspace rail is on the left. The navigator beside it lists the notes in the current view, with a search box above it. The desk is the large surface in the middle, and it starts empty. The reader is on the right.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out…*. The desk bar above the desk carries *Save desk…*, the desk list and *Clear*.
- **The cockpit open on the same repository**, so the two can be read side by side.

## Procedure

- Start Deck and open `project-os-deck` from the rail. The navigator fills; the desk stays empty until you put something on it.
- Open the cockpit on the same repository.
- Compare the row of view buttons across the top of each: the same names, in the same order. A difference means Deck's view provider and the cockpit's navigator have drifted, and the adoption table owes a row.
- Click **Features** in both. Compare the group headings first, then the note ids under each heading, in order, and the status shown against each.
- Click **Tests** in both, then **Issues**, and compare again. In Issues, check that the notes needing triage are at the top in both, and that the finished ones are folded away in both.
- Open one folded group in Deck and confirm the notes inside it are the ones the cockpit shows under the same heading.
- Click three notes in the navigator. Each one should appear as a card on the desk and open in the reader.
- Change view. The cards you put on the desk stay where they are, which is the point of choosing them; the navigator is what changes.

## Expected results

- The same view names appear in both, in the same order.
- The same group headings appear in both, in the same order, with the same counts.
- The same note ids appear under each heading in both, in the same order, with the same statuses.
- Clicking a note puts one card on the desk and opens that note in the reader, and the navigator marks the row as being on the desk.
- A view change repaints the navigator and leaves the desk alone.
- A difference is a defect in Deck, and is filed rather than explained.

**Reworded 2026-09-07.** This check used to say the desk fills when a view opens, and told a person to watch cards leave the desk on a view change. That is what Deck did before [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]: the grid was the list. The desk is a chosen subset now, so the comparison with the cockpit happens in the navigator.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
