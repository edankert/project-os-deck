---
type: "[[test]]"
id: TST-0012
aliases: ["TST-0012"]
title: "Two windows show the same state, and Deck reopens where you left it"
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
covers: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "store"
---

# Two windows show the same state

## Purpose

The claim a person settles for [[FEAT-0003-One-Store-In-The-Main-Process]]. The cockpit fails this: two of its windows never see each other change.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **One workspace open**, so there are cards to click.

## Procedure

- Start Deck, open a workspace, and click a card so the reader fills.
- Press **Pop out** in the top bar. A second window opens on the same view, with no view buttons and no rail.
- Put the two windows side by side.
- In the first window, click a different card. Watch the second window without touching it.
- In the first window, press **Save desk…**, type a name and press Enter. Look at the desk list in the second window.
- Quit Deck completely and start it again.

## Expected results

- The card you open in one window is marked as current in the other, immediately, with no reload and no click.
- A desk saved in one window appears in the other's list.
- After a restart Deck reopens the same workspace, the same view and the same note, with that note showing in the reader.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
