---
type: "[[task]]"
id: TASK-0023
aliases: ["TASK-0023"]
title: "The groups the sidecar already sends are drawn, so Needs you comes first, phases hold their features and tasks, and the quiet work folds away"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: ["[[TST-0016-The-Groups-The-Sidecar-Sends-Are-Drawn]]"]
---

# The groups the sidecar sends are drawn

## Objective

Deck draws the structure the sidecar's answer already carries, instead of throwing it away. A view arrives as groups, and items inside a group carry children, a subtitle, and what is owed on them. Deck flattens all of that into one deduplicated list today, so a view with four hundred notes is four hundred identical cards in one grid.

## Detail

`cardsFromNav` in `desktop/src/shared/sidecar-client.ts` is where the structure is dropped: groups, children, subtitle, owed and owed_verb all go in and one flat array comes out. The data is already on the wire, so this is a change in the client's shape and in what the card pool draws, not a new request to the sidecar.

Measured on Your Trainer on 2026-09-07: the features view arrives as a Needs-you group of 3, then 23 phase groups whose features carry between 2 and 136 child tasks, then an Unattached-tasks group of 153, then a Quiet group of 24 marked suppressed. The issues view arrives as Needs-triage (34), then the severity bands, then the same bands again suffixed `:done` holding 309 finished items. The tests view arrives as Needs-you, three tiers with outstanding counts in their labels, and Retired.

This is the adoption table's `shell.nav.needs-you` row and part of its `shell.nav.hide-completed` row.

## Acceptance

- A person opening the Issues view on Your Trainer sees the 34 issues needing triage at the top, under a heading that says so, and not mixed into the other 375.
- Severity bands appear as their own headings, in the sidecar's order, each with its count.
- The finished issues are folded away behind one control rather than drawn as cards, and unfolding them shows them.
- The Features view shows each phase as a heading with its features under it, and a feature's child tasks are reachable from the feature rather than listed separately.
- A card for something that is owed shows the verb the sidecar named for it.
- The counts Deck shows for each group match the counts the cockpit shows for the same repository.

## Steps

- [x] Keep groups, children, subtitle, owed and owed_verb in the client's card model instead of discarding them.
- [x] Give the card pool a group heading element and a fold control, both pooled the way cards are.
- [x] Draw a suppressed group folded by default, and remember whether a person unfolded it.
- [x] Show the owed verb on a card that carries one.
- [x] Add a check that a view with groups draws headings, and that no group's items are lost or duplicated.

## Notes

This is the first of the six tasks added on 2026-09-07 and every other one is easier after it, because the other five all need to know which cards belong together.

## Where this stands

**2026-09-07: built.** `groupsFromNav` in the sidecar client keeps the groups, the children, the subtitle, the owed flag and the owed verb, and `shared/rows.ts` turns them into headings and rows with a fold state. A group the sidecar marks suppressed arrives folded and a note holding other notes arrives closed, so Your Trainer's Issues view opens on the 34 that need triage rather than on 409 identical cards. The severity a card shows is the band it arrived in, because the sidecar bands issues by severity rather than putting it on the item.

**Corrected the same day, from the running application.** Folding read only the sidecar's `suppressed` flag, and the issues view does not use that flag: it repeats each severity band for the finished issues with a `:done` suffix on the key. So Your Trainer's 311 finished issues were still drawn as rows, under headings identical to the live ones. Deck now treats either signal as finished work, and those bands arrive as nine folded rows.

The automated check is [[TST-0016-The-Groups-The-Sidecar-Sends-Are-Drawn]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.
