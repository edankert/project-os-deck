---
type: "[[task]]"
id: TASK-0059
aliases: ["TASK-0059"]
title: "A note is kept on every view: the mark moves it between the view's own list and the workspace's, stacking crosses both, and saved desks follow"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
parent: "FEAT-0015"
effort: "M"
due: ""
depends: ["TASK-0058"]
blocks: ["TASK-0061"]
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]]", "[[ISS-0067-Spread-Never-Brings-A-Card-Forward]]", "[[FEAT-0006-Every-State-Has-An-Address]]"]
tests: ["[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]", "[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]"]
---

# A note is kept on every view

## Objective

A person can mark a held note "on every view", and the store keeps it on every view's desk of that workspace at one place. Unmarking gives it back to the current view alone. Stacking, the reading column and saved desks behave the same whichever list a note is in.

## Detail

**One action, both directions.** A new renderer action, for example `{ type: 'set-every-view'; noteId; on: boolean; viewId? }`, joins `RENDERER_ACTIONS`. It is not added to `TABLET_LOCAL_ACTIONS`, because the mark changes the Mac's desk and the tablet does not steer. Marking moves the card from the view's own list to the workspace's every-view list, keeping its place, size and stacking. It then removes the same note from every other view's own list, so no view draws it twice (decision 6). Unmarking moves the card into the current view's own list, and the note leaves every other view. Marking a note already on every view, or unmarking one that is not, returns the same state.

**Taking one off.** `take-off-desk` on a note on every view removes it from the every-view list, and so from every view (decision 9). On a view's own note it removes it from that view only.

**Stacking crosses both lists** (decision 8). A note just put on the desk, or raised, is drawn on top whichever list holds it. [[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]] and [[ISS-0067-Spread-Never-Brings-A-Card-Forward]] made a press raise a pane or a card, and a note on every view lying under the view's own notes must rise too. The proposal: `DeskCard` gains an optional stacking number `z`. `put-on-desk` and `raise-card` set it to one more than the highest on the drawn desk. `deskCardsOf` returns the drawn desk ordered by it, with a card that has none counted as 0, and ties kept in list order: every-view list first, then the view's own. A state file with no stacking numbers therefore draws in exactly today's order. `copyCard` and `normaliseCards` carry `z`. If the implementation finds a simpler shape that meets the acceptance lines, write it here instead.

**One reading column per drawn desk** (decision 10). Widening a note on every view takes every other card in the workspace out of the column, on every view's list. Widening a view's own note takes out that view's other notes and the every-view notes. Either way, no view ever draws two cards in the column. Marking a note that is in the column follows the same rule as widening a note on every view.

**Saved desks keep their shape** (decision 11). `save-desk` records the drawn desk of the view it is for, both lists, as one flat list in stacking order. `Desk` does not change, so every saved desk in every state file still reads. `open-desk` replaces that view's own list with the saved cards, less any note that is on every view now; those stay where they are, as do notes on every view that the saved desk did not hold. Stacking follows the saved order. `delete-desk` is unchanged. The address is applied workspace first, then view, then desk (`applyAddress` in `desktop/src/renderer/renderer.ts`). That is the order a desk per view needs, so a check in the store suite pins it: `select-view` followed by `open-desk` puts the saved notes on the new view's desk.

## Acceptance

- Marking a note held on Issues puts it on the Features desk at the same place; unmarking it on Features leaves it on Features only.
- Marking removes the note from every other view's own list: a note held separately on Issues and on Tests, marked on Issues, is drawn once on Tests, at the Issues place.
- `take-off-desk` on a note on every view removes it from every view; on a view's own note, from that view only.
- A raised note on every view is drawn above the view's own notes; a note just put on the desk is drawn on top; a state file with no stacking numbers draws in its list order.
- No view's drawn desk ever has two cards in the reading column, after any sequence of widen and mark actions the suite tries.
- Saving on Issues and opening the saved desk on Features puts the saved notes on the Features desk and leaves the notes on every view where they were. A desk saved before this feature opens the same way.
- The mark crosses the window channel (`isRendererAction`) and is not applied by a served page (`TABLET_LOCAL_ACTIONS`).
- [[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]'s raise check still passes, rewritten if it reads the list rather than `deskCardsOf`.

## Steps

- [x] Add the mark action, the stacking number and the widen rule in `desktop/src/shared/store-state.ts`, and `z` in `desktop/src/shared/types.ts`.
- [x] Change `save-desk` and `open-desk`.
- [x] Add the acceptance lines to `desktop/tests/view-desks.test.mjs`; adjust `hands.test.mjs` if its raise check reads the raw list.
- [x] Record the stacking shape chosen in the Outcome.

## Notes

The label a person reads is "on every view". "Pin" is not used anywhere a person sees, because the cockpit's navigator pins notes and means something else ([[REFERENCE-DES-0002-REVIEW]]). Whether a saved desk should remember its view is Edwin's open question in [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]; this task builds "no".

## Outcome

**Done 2026-09-11.** The mark is `{ type: 'set-every-view', noteId, on, viewId? }`, a renderer action that a served page does not apply. **The stacking shape is the one proposed: an optional `z` on `DeskCard`.** `put-on-desk` and `raise-card` set it one above the highest on the drawn desk, and `deskCardsOf` orders by it with a missing `z` counted as 0 and ties in list order, so a file with no stacking numbers draws as it did. A saved desk keeps no `z`: its list order is its stacking order, and `open-desk` gives the saved cards stacking numbers above the notes on every view. The reading-column rule is checked by a seeded walk of 400 widen, mark, unmark and switch steps over three views. `hands.test.mjs` reads the desk through `deskCardsOf` now, and its raise check still passes.
