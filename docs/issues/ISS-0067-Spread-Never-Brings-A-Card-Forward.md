---
type: "[[issue]]"
id: ISS-0067
aliases: ["ISS-0067"]
title: "Spread never brings a card forward: selecting or dragging a card leaves it under the cards drawn after it"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin, evaluating Deck, 2026-09-11"]
severity: medium
component: renderer
parent: ""
related: ["[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Spread never brings a card forward

## Problem

**In Spread, a card that is clicked or dragged stays under the cards it overlaps.** Edwin, evaluating Deck on 2026-09-11: "Notes in the spread view cannot be brought forward, they seem to keep their hierarchy, even after selection."

Spread draws the desk in the desk's order, so the last card is on top, and the store has had a `raise-card` action since [[TASK-0054-A-Held-Note-Is-A-Pane]] that moves a card to the end. Glass sends it when a pane's header is pressed. Spread never sends it: `grabCard()` in `desktop/src/renderer/renderer.ts` dispatches only `move-card`, and opening a card dispatches `focus-note`.

## Fix

Raise the card when a press on it ends, dragged or not, and when a card is opened from the keyboard. Not at the press itself: Spread's card pool is positional, element *n* draws the desk's *n*-th card, so raising at the press would repaint the element under the pointer with another card mid-drag. The raise is the same store action Glass uses, so a card brought forward in Spread is on top in Glass as well.

## Acceptance

- [x] A click on a card that lies under another brings it to the top.
- [x] A dragged card is on top where it is dropped.
- [x] The order is the desk's, so Glass shows the same pane on top.

## Fixed, 2026-09-11

Opening a card in Spread, by a click or by Enter, now dispatches `raise-card` before it opens the note, and a drag dispatches `raise-card` after its `move-card`. The Needs-you strip is left alone: its cards are not on a desk.

**Checked** in the smoke run's pane section, which already switches to Spread with two overlapping cards: a click on a point of the lower card that shows brings it forward, read back both from the store (last on the desk) and from the page (the card drawn at a point the other card had covered); and the card a drag takes, chosen as the one not on top, is on top where it lands. With the raise on opening removed, the first check failed; with the raise after a drag removed, the second failed. The raise is the store's own, so Glass shows the same pane on top.
