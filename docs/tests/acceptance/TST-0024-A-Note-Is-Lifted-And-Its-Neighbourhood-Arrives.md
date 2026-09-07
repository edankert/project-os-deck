---
type: "[[test]]"
id: TST-0024
aliases: ["TST-0024"]
title: "A note is lifted in Glass, its neighbourhood arrives at the front, two notes show what they share, and the same desk is there in Spread"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0010-Lifting-A-Note]]"]
issues: []
tasks: ["[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]"]
area: "glass"
---

# A note is lifted and its neighbourhood arrives

## Purpose

The walk for [[FEAT-0010-Lifting-A-Note]]. It checks the thing Edwin said he could not see on 2026-09-07: a note's relationships. A person lifts a note in Glass and watches the notes joined to it come to the front, lifts a second and sees what the two share, puts one back and finds its slot, and then finds the same desk waiting in Spread.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens in Glass, which is the surface Deck opens first.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. Use Your Trainer: it has hundreds of issues with features and tests linked to them, and this repository's notes are too few to show a neighbourhood worth looking at.
- **Not before** the three tasks this note lists have landed, and not before [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s field is drawn; without a field there is nothing to lift from.

## Procedure

- Open the Issues view in Glass. Click one issue that you know has a parent feature and at least one test covering it.
- Watch the field turn. The issue's feature, its tests and any note linking to it should now be at the front, at full size, and the label above the front band should say that the front now shows what is joined to what you are holding. Find the owed count and note where it is drawn.
- Click one of those neighbours. It should join the desk, and the held set should grow by one.
- Now click a second issue from the same feature. Look for cards carrying the shared mark, and read the count in the desk bar.
- Press × on the first issue. Its ghosted slot should fill again with the note, where it was.
- Press esc. The desk should empty and every slot should be full again. Click the background once and confirm nothing changes.
- Lift two notes again, then switch to Spread. The same two notes should be on the desk. Switch back to Glass and they should be held.
- Put the pointer down. Using only Tab, the arrow keys and Enter in the navigator, reach one of the neighbours and lift it.

## Expected results

- Lifting an issue brings its feature, its tests and its backlinks to the front band, and the field turns to face them.
- The front band's label changes to say it shows what is joined to the held note, and the owed count is drawn in the same place as before.
- A second issue from the same feature makes the feature carry the shared mark, and the desk bar counts it.
- × returns one note to its ghosted slot; esc returns every note; a background click does nothing.
- The desk holds the same notes in Spread and in Glass.
- A neighbour can be reached and lifted from the navigator by keyboard alone.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
