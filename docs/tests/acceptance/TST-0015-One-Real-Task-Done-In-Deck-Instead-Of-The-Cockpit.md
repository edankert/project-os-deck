---
type: "[[test]]"
id: TST-0015
aliases: ["TST-0015"]
title: "One real task done in Deck instead of the cockpit, and a record of which Edwin would rather have used"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: ["[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]"]
area: "spread"
---

# One real task done in Deck instead of the cockpit

## Purpose

The seventh exit criterion of [[PHASE-0001-Deck]], added on 2026-09-07. Every other criterion of the phase can be met by a flat grid of cards with a reader beside it, which is what the review found the application to be ([[REFERENCE-PHASE-0001-REVIEW]]). This walk asks the only question that cannot be met that way: whether cards on a desk across screens are better than the cockpit's four fixed panes for a piece of work Edwin actually has to do. The answer is a judgement, and the record is the answer rather than a pass mark.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it here.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. Pick a repository with real work in it that day; Your Trainer has hundreds of issues and is a better test than this repository's thirty notes.
- **A second display**, so that a popped-out panel can sit on it.
- **The cockpit open on the same repository**, so the same task can be done there afterwards for comparison.
- **Not before** the tasks this note lists have landed: without a navigator, a desk you can arrange, a popped-out panel that carries one thing, and search, there is nothing to judge.

## Procedure

- Choose a task you would otherwise do in the cockpit that morning: triaging the issues that arrived, or reading through one phase's open tasks and deciding what comes next.
- Do it in Deck first. Put the notes you are working through on a desk, move the ones you have decided about aside, pop the Needs-you strip or a note out onto the second display, and use search when you need a note the desk does not show.
- Do the same task, or the remainder of it, in the cockpit.
- Write down which of the two you would rather have used for that task, and one sentence on why.

## Expected results

- The task could be done in Deck from start to finish without opening the cockpit for a step Deck could not do.
- Edwin records which application he would rather have used and why. Either answer is a valid result; a preference for the cockpit is a finding about Spread, not a failed walk.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
