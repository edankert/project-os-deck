---
type: "[[test]]"
id: TST-0027
aliases: ["TST-0027"]
title: "The seven project-os views look exactly as they did, and a base file from the vault reads as a description whose unsupported constructs are named on screen"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0012-A-View-Is-A-Description]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[PHASE-0003-Vault]]"]
area: "descriptions"
---

# A base file reads as a description, and the seven views are unchanged

## Purpose

A view is now a document rather than three fields of code ([[ADR-0004-A-View-Is-A-Description]]). Two things have to be true at once for that to be worth doing. Nothing a person already uses may change: the seven project-os views must look exactly as they did. And a base file Edwin wrote in Obsidian must read as a Deck description, with whatever Deck cannot understand named on screen rather than silently dropped.

The second half is the one that decides whether the language was seeded correctly. Edwin's point on 2026-09-08 was that the Bases subset "cannot represent everything"; this walk measures how far it does get.

## Setup

- Once, ever: `cd desktop && npm install`. To start Deck: `cd desktop && npm start`.
- **Two workspaces**, both added by hand from the left rail's **+ add a workspace**: `/Users/Edwin/Dev/repos/project-os-deck`, and your `~/Notes` vault.
- **The cockpit open on this repository**, for the first half's comparison.
- **The seven views** are the buttons in Deck's top bar: Overview, Intent, Features, Issues, Tests, Publication, Library.
- **Have a screenshot of Deck's Features and Issues views from before this work landed**, or the cockpit open beside it, so "unchanged" is checkable rather than remembered.

## Procedure

1. Open this repository in Deck. Walk all seven views. Compare the headings, the counts, the order and the folding against the cockpit view by view.
2. Do the same on Your Trainer, whose Issues view is the large one.
3. Open `~/Notes` in Deck.
4. Point Deck at one of the Comic card bases — Characters, Chapters, Locations or Pages — as a view. Read what it draws.
5. Point Deck at the sidebar base, the one whose filters are relative to the note it is embedded in.
6. Point Deck at one of the TaskNotes bases, which use view types and keys that are the plugin's rather than Obsidian's.
7. For each of the three, read whatever Deck says about constructs it could not understand.
8. Open the same base file in Obsidian and compare the list of notes with Deck's.

## Expected results

- All seven project-os views are visually and structurally the same as before: same view names in the same order, same group headings, same counts, same folding, same card faces. Any difference at all is a fail, including one that looks like an improvement.
- A Comic card base draws its notes with the portrait, cover, scene or image the file names as the card's face.
- The sidebar base, whose filters are relative to an embedding note Deck does not have, says so by name. It must not draw an empty list with no explanation.
- The TaskNotes base draws what it can and names the plugin's view types and keys as constructs Deck does not support. A parse failure that draws nothing is a fail.
- Every message about an unsupported construct names the construct. "Could not read this view" is a fail.
- Where Deck's list differs from Obsidian's for the same file, Deck has named an unsupported construct explaining it. A silently different list is the fail this check exists to catch ([[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]).

## Evidence (fill after running)

- The seven views compared, with anything that differs.
- For each of the three base files: what Deck drew, what it named as unsupported, and what Obsidian drew.

## Adequacy (who verifies this test?)

A person, because "looks exactly as it did" and "the message tells me what is wrong" are both judgements. The automated halves are [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] and [[TST-0031-The-Evaluator-Runs-The-Seeded-Language]], plus [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]], which pins the seven views against a fixture read off the cockpit's navigator.
