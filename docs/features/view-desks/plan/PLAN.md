---
type: "[[plan]]"
title: "Plan — each view keeps its own desk, and held notes can be hidden"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
implements: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Plan — each view keeps its own desk, and held notes can be hidden

## Delivery sequence

The store comes first and is tested in node, because every surface reads the desk through it. The surfaces follow, then the smoke checks that drive them with a real pointer.

1. **[[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]** — `DeckState` gains `viewDesks`; `deskCards` keeps its shape and now holds the notes on every view. `deskCardsOf` returns the two lists together, every desk action names the view it is for, and a state file written before this reads unchanged. Writes `desktop/tests/view-desks.test.mjs`, turns [[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]] into an executable test, and amends the notes whose rule this reverses. Touches `desktop/src/shared/types.ts`, `desktop/src/shared/store-state.ts` and `desktop/src/shared/served-state.ts`.
2. **[[TASK-0059-A-Note-Is-Kept-On-Every-View]]** — The store action that marks and unmarks a note, stacking across the two lists, the reading-column rule, and what saving and opening a named desk do. Same files, same suite.
3. **[[TASK-0060-Hide-Notes-And-Show-Them-Again]]** — The Hide notes button, the `H` key, and the field dealing into the space the panes covered. Renderer only (`glass.ts`, `renderer.ts`, `index.html`, `deck.css`), and independent of 1 and 2, so it can run beside them.
4. **[[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]]** — The focus window draws the current view's desk. The mark sits on the pane header and on the Spread card with the `V` key. A note on every view is drawn in full on a view that does not hold it. The desk bar names other views holding notes, and Escape, ⌥× and Clear leave the notes on every view. Needs 1 and 2.
5. **[[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]** — A desk panel draws the view in its own address, a throw onto it lands there, and the tablet draws the Mac's current view's desk. Needs 1; touches `main.ts`, `renderer.ts`, `host-bridge.ts` and `served-state.ts`.
6. **[[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]** — New checks in `desktop/src/main/smoke-glass.ts`, each shown to fail with its fix removed, recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]. Last, because it drives what 3 to 5 draw.

## Dependencies

- **Hard:** TASK-0059 needs TASK-0058's two lists. TASK-0061 needs both. TASK-0062 needs TASK-0058's view-carrying actions. TASK-0063 needs TASK-0060 to TASK-0062.
- **None outside this repository.** The sidecar is not asked for anything. Deck's own index already gives the renderer every note's path and title, and TASK-0061 uses it to draw a note on every view that the current view does not hold.
- **From PHASE-0001 and FEAT-0014, all built:** the store and its file, the desk record with places and sizes, the pane, the throw, the served state and the window book.

## Open questions

- **Whether a saved desk remembers its view.** Edwin's question, stated in [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]. The plan builds "no" and changes nothing else if the answer is "yes": `Desk` would gain a view id and opening it would select that view first.
- **How stacking is stored.** The feature fixes the behaviour (a press raises a note above both lists; an old file keeps its order). TASK-0059 proposes an optional stacking number on each card and records what it chose.
- **The exact form of the whole-workspace reset** used by the smoke run and the measurement. TASK-0058 chooses it and writes it into the task.
