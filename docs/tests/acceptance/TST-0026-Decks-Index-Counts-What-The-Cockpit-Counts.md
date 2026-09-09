---
type: "[[test]]"
id: TST-0026
aliases: ["TST-0026"]
title: "Deck's own index counts what the cockpit counts, on a project-os repository and on the vault, and a note edited on disk changes without a restart"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0011-Decks-Own-Index]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0011-Decks-Own-Index]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[project-os-cockpit#ISS-0279]]"]
area: "index"
---

# Deck's index counts what the cockpit counts

## Purpose

Deck now reads the notes itself instead of asking the sidecar for them ([[ADR-0004-A-View-Is-A-Description]]). The thing that can go wrong is not a crash: it is two applications showing the same person different numbers for the same corpus ([[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]). A suite pins the counts against a recorded fixture. This walk checks the live pair, side by side, on a day the fixture was not recorded.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start Deck: `cd desktop && npm start`. A window opens.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **You need the cockpit open too**, on the same workspace, because this check is a comparison. Start it the way you normally do.
- **A workspace is added once, by hand.** In Deck's window, the left rail carries **+ add a workspace**. Add `/Users/Edwin/Dev/repos/project-os-deck` and, for the second half, your `~/Notes` vault.
- **The Library view is the one to look at** in both applications. It lists every typed note grouped by type, with a count per group.

## Procedure

1. Open this repository in Deck and in the cockpit. Go to the Library view in both.
2. Write down the count beside every type heading, in both applications.
3. Do the same for Your Trainer.
4. Open `~/Notes` in Deck. Note the type counts it shows.
5. In Obsidian or a text editor, change one note's `status:` in this repository and save it. Do not restart Deck.
6. Look at Deck again within a few seconds.
7. Add a new note to the repository, then delete it again. Look at Deck after each.
8. Put a file with deliberately broken frontmatter into the repository — an unclosed quote will do — and look at Deck. Remove it afterwards.

## Expected results

- Every type count in Deck's Library equals the cockpit's, for this repository and for Your Trainer. A difference is a fail unless Deck names it as an expected one.
- For `~/Notes`, Deck shows the vault's types with counts. The cockpit may show fewer, because its indexer drops a note whose `type:` is a list ([[project-os-cockpit#ISS-0279]]); Deck showing more, here, is the expected result and not a fail.
- The edited note's new status is in Deck within a few seconds, with no restart and no re-opening of the workspace.
- The added note appears; the deleted note disappears.
- The broken file is reported by path with a reason, and every other note is still listed. An empty or partial view is a fail.

## Evidence (fill after running)

- The two count lists, per repository, side by side.
- What Deck said about the broken file, quoted.

## Adequacy (who verifies this test?)

A person, because the claim is that two applications agree in front of somebody looking at both. The automated half is [[TST-0029-The-Index-Reads-What-Is-On-Disk]], which pins Deck against a fixture recorded from the sidecar; a fixture cannot notice that the sidecar itself moved.
