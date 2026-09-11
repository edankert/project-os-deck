---
type: "[[change]]"
id: CHG-20260911-Each-View-Keeps-Its-Own-Desk
aliases: ["CHG-20260911-Each-View-Keeps-Its-Own-Desk"]
title: "Each view keeps its own desk, a held note can be kept on every view, and Hide notes puts every held note out of sight in one click"
status: merged
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin, 2026-09-11: 'I need a button to hide everything (all the open items) on the desk. Also, we probably need to have different open items on different views, maybe some can be marked to be open on all views?'"]
commit: ""
pr: ""
impacts: ["desktop/src/shared/store-state.ts", "desktop/src/shared/types.ts", "desktop/src/shared/served-state.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/cards.ts", "desktop/src/renderer/index.html", "desktop/src/renderer/deck.css", "desktop/src/main/main.ts", "desktop/src/main/measure.ts", "desktop/src/main/smoke-glass.ts", "desktop/tests/"]
issues: ["[[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]]"]
features: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
related: ["[[PHASE-0002-Glass]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]"]
---

# Each view keeps its own desk

## What changed, for somebody using Deck

**Each view now has its own open notes.** A note lifted on Issues stays on Issues: switch to Features and it is not there, switch back and it is where you left it. The bar says which other views still hold notes, for example "also held: Features 2".

**A note can be kept on every view.** ⧉ on a pane's header or on a Spread card, or `V` on either, keeps that note open on every view of the workspace at one place. On a view that does not hold the note it is still drawn in full: its text and status in Glass, a dashed card saying "not in this view" in Spread. Pressing ⧉ again gives it back to the view you are on. Escape, ⌥× and Clear leave notes on every view where they are and say how many stayed; × on one takes it off every view.

**Hide notes puts every open note out of sight at once.** The button in the top bar, or `H`, hides every pane in Glass and every card in Spread; the field fills the space the panes covered. The button then reads "Show N notes" and brings them back where they were. Nothing is put back or changed: hiding belongs to the window, and a reload shows the notes again.

**On the day this lands, nothing on screen changes.** Every note you were holding shows as kept on every view, which is what the one shared desk did. Unmark any of them to give it back to one view.

## For other windows and the tablet

A popped-out desk window keeps the desk of the view in its own address, and a note thrown onto it lands on that view's desk. The tablet shows the desk of the Mac's current view, whatever view it is browsing itself, and follows when the Mac switches.

## What changed underneath

The store gained `viewDesks`, each view's own notes; `deskCards` keeps its shape and now holds the notes on every view, so a state file written before reads unchanged. Every desk action can name the view it is for. A card may carry a stacking number, `z`, so a press can raise a note from either list. The tablet is sent `viewDesks` under the same workspace filter as the rest of the desk. No address changes, no environment variable and no dependency was added.

## Evidence

[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]], 13 of 13, and each of its four named breaks fails it. [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: 21 new checks with a real pointer, each of the ten behaviours shown to fail with its fix removed. `npm test`, 410 of 410. The walk is [[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]], Edwin's.
