---
type: "[[change]]"
id: CHG-20260911-Notes-Stack-Whole-And-Come-Forward
aliases: ["CHG-20260911-Notes-Stack-Whole-And-Come-Forward"]
title: "Notes stack whole and come forward when chosen: in Glass the pane on top covers the header under it, and in Spread a clicked or dragged card rises to the top"
status: merged
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin, evaluating Deck, 2026-09-11"]
commit: ""
pr: ""
impacts: ["desktop/src/renderer/glass.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/deck.css", "desktop/src/main/smoke-glass.ts"]
issues: ["[[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]]", "[[ISS-0067-Spread-Never-Brings-A-Card-Forward]]"]
features: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
related: ["[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Notes stack whole and come forward when chosen

## What changed, for somebody using Deck

**In Glass, the note on top now hides what is under it, title bar included.** Before, every pane's title bar was drawn above every pane's text, so a lower note's title floated over the note lying on it ([[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]]). A press anywhere on a note brings it forward, not only a press on its title bar, so a note whose title is covered can still be reached. Dropping a note on another's title bar still snaps it just below, so a stack is laid down with its titles showing.

**In Spread, a card you click or drag comes to the top** ([[ISS-0067-Spread-Never-Brings-A-Card-Forward]]). Before, cards kept the order they were put on the desk. The order is the desk's, shared with Glass: a card brought forward in Spread is the pane on top in Glass.

## What did not change

The desk record, its positions and sizes, and the snap rule. Nothing new is stored: `raise-card` has moved a card to the end of the desk since [[TASK-0054-A-Held-Note-Is-A-Pane]]; Spread now sends it too.

## Evidence

[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: four new checks with a real pointer, each shown to fail with its fix removed.
