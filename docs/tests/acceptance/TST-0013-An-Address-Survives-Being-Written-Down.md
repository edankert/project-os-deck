---
type: "[[test]]"
id: TST-0013
aliases: ["TST-0013"]
title: "An address survives being written down: copy it, quit, come back and paste it"
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
covers: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "addresses"
---

# An address survives being written down: copy it

## Purpose

The claim a person settles for [[FEAT-0006-Every-State-Has-An-Address]]: an address is a thing you can put in a message and use tomorrow.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **Somewhere to paste text**, so the address survives the restart in the middle of this check.

## Procedure

- Start Deck, open a workspace, pick a view and click a card.
- Press **Save desk…** and give the desk a name with a space and an apostrophe in it, such as `Edwin's desk`.
- Press **Copy address** and paste the result somewhere you can read it.
- Quit Deck and start it again.
- Press **Open address…**, paste the address back and press Enter.
- Now edit the pasted address so it names a view that does not exist, and open it again.
- Edit it into something that is not an address at all, and open that.

## Expected results

- The copied address names the workspace, the view, the desk and the note, in a form you can read.
- Pasting it back lands on the same view, the same desk and the same note.
- An address naming a view that does not exist is refused, says which view it could not find, and leaves Deck where it was.
- Something that is not an address is refused with a reason, and never opens a default view.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
