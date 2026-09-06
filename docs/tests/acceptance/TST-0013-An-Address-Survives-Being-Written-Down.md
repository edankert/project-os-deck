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

## Procedure

- Open a workspace, pick a view, open a card, and save a desk with a name containing a space and an apostrophe.
- Press Copy address and paste the result somewhere you can read it.
- Quit Deck and start it again.
- Press Open address, paste the address back and confirm.
- Now edit the pasted address so it names a view that does not exist, and try again.
- Edit it again into something that is not an address at all, and try again.

## Expected results

- The copied address names the workspace, the view, the desk and the note in a form you can read.
- Pasting it back lands on the same view, the same desk and the same note.
- An address naming a view that does not exist is refused, says which view it could not find, and leaves Deck where it was.
- Something that is not an address is refused with a reason, and never opens a default view.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
