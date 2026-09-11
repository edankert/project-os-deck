---
type: "[[task]]"
id: TASK-0058
aliases: ["TASK-0058"]
title: "The store keeps a desk for each view, and a state file written before this reads unchanged"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
parent: "FEAT-0015"
effort: "M"
due: ""
depends: []
blocks: ["TASK-0059", "TASK-0061", "TASK-0062"]
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: ["[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]", "[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# The store keeps a desk for each view

## Objective

Each view has its own list of held notes in the store, and the notes already held today become notes on every view without any conversion. After this task, a note put on the desk while Issues is chosen is not on the Features desk. A state file written before this task opens with the same notes on screen.

## Detail

**The storage shape is additive** ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decisions 4 and 5). `DeckState.deskCards: Record<workspaceId, DeskCard[]>` keeps its type and now means the notes on every view of that workspace. A new `DeckState.viewDesks: Record<workspaceId, Record<viewId, DeskCard[]>>` holds each view's own notes. `deskCardsOf(state, workspaceId, viewId = state.viewId)` returns the every-view list followed by that view's list. Callers that pass only a workspace keep working, and every surface still reads the desk through this one function.

**Every desk action names the view it is for.** `put-on-desk`, `take-off-desk`, `move-card`, `clear-desk`, `raise-card`, `resize-card`, `widen-card`, `save-desk` and `open-desk` take an optional `viewId`; the reducer uses it and falls back to `state.viewId`. A desk panel draws the view in its own address, not the store's current one ([[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]), so its actions must be able to say so; [[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]] sends them. An action that changes a card finds it in whichever list holds it. `put-on-desk` adds a new note to the view's own list. With no view chosen and no `viewId` given, `put-on-desk` returns the same state.

**`select-view` stops leaving the desk alone, by doing nothing to it.** The desk drawn changes because `deskCardsOf` reads the new view's list; the reducer moves no card. It also clears `deskName`, because the desk now on screen is not the one opened under that name (decision 11). Its comment currently says "The desk is NOT touched. A desk holding notes from more than one view is the point of choosing what goes on it (TASK-0024)". Rewrite that comment to say the rule changed on 2026-09-11 at Edwin's request, that a view's desk is its own, and that the on-every-view mark is what keeps notes across views.

**`clear-desk` takes off the view's own notes only** (decision 9). The smoke run and the measurement (`desktop/src/main/smoke-glass.ts`, `desktop/src/main/measure.ts`) use `clear-desk` to start from an empty desk. Give them a form that empties the whole workspace's desk, every view's list and the every-view list. Write the form chosen into this note's Outcome.

**The file, the broadcast and the tablet.** `persistable` keeps `viewDesks`, because a view's desk is what a person reopens tomorrow. `normaliseState` reads it tolerantly: a missing key, a non-object, or a list of junk becomes empty lists, never a Deck that will not open. `servedState` filters `viewDesks` by workspace id with the same `keep` helper it uses for `deskCards`, so a workspace with no sidecar answering is still never described to the network.

**Three notes record the rule this reverses, and each gets an amendment paragraph, not a rewrite.** [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], whose acceptance says a view switch "leaves the desk alone, so a desk can hold notes from more than one view". [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], whose expected results say the same. [[FEAT-0010-Lifting-A-Note]], whose "One desk model, two surfaces" paragraph read DES-0002's one desk per view as honoured by the address. Each paragraph is dated 2026-09-11 and names Edwin's request and [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]].

## Acceptance

- A state file holding only `deskCards`, as every file written before this does, opens with the same notes at the same places on every view of every workspace, not only the current one.
- A note put on the desk with Issues chosen is on the Issues desk and not on the Features desk. After a switch to Features and back, it is on the Issues desk at the same place.
- An action carrying a `viewId` changes that view's desk and no other, whichever view the store has chosen.
- With no view chosen, `put-on-desk` without a `viewId` changes nothing.
- `select-view` clears the open desk's name and moves no card.
- `clear-desk` empties the view's own list and leaves the every-view list; the whole-workspace form empties both, for every view.
- `persistable` keeps `viewDesks`; `normaliseState` turns a malformed `viewDesks` into empty lists and never throws.
- `servedState` keeps `viewDesks` only for workspaces whose sidecar answers.
- The existing check "changing the view leaves the desk alone" in `desktop/tests/desk-model.test.mjs` is rewritten to the new rule, and every other desktop suite still passes.

## Steps

- [x] Add `viewDesks` to `DeckState` in `desktop/src/shared/types.ts`, and rewrite the doc comment on `deskCards` to say it holds the notes on every view.
- [x] Change `deskCardsOf`, `isOnDesk` and each desk action in `desktop/src/shared/store-state.ts`; add the optional `viewId`; rewrite the `select-view` comment.
- [x] Add the whole-workspace reset and switch `smoke-glass.ts` and `measure.ts` to it.
- [x] Extend `persistable`, `normaliseState` and `initialState`; extend `servedState`.
- [x] Write `desktop/tests/view-desks.test.mjs` with the acceptance lines above. [[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]] already names it in `command:`, so the suite and that note land in one commit, and `python3 tools/scripts/run-tests.py --filter TST-0049` passes before it.
- [x] Rewrite the one check in `desk-model.test.mjs`; run `npm test`.
- [x] Add the three amendment paragraphs.

## Notes

The address does not change. `DeckAddress` names a view, and the view's desk now comes with it; `desk=` still names a saved desk, whose rules are [[TASK-0059-A-Note-Is-Kept-On-Every-View]]'s.

## Outcome

**Done 2026-09-11.** `DeckState.viewDesks` holds each view's own notes, keyed by workspace and then by view; `deskCards` keeps its shape and now holds the notes on every view. `deskCardsOf(state, workspaceId, viewId)` draws both lists, and its view defaults to `deskViewOf(state)`: the chosen view, or on a served page the Mac's. Every desk action takes an optional `viewId` and falls back to the chosen view; `put-on-desk` with no view at all changes nothing. `select-view` moves no card and clears the open desk's name, and its comment now says the rule changed at Edwin's request. **The whole-workspace form is `{ type: 'clear-desk', scope: 'workspace' }`**: it empties every view's list and the every-view list, and `smoke-glass.ts` and `measure.ts` start from it. `persistable` keeps `viewDesks`, `normaliseState` reads a malformed one as empty lists, and `servedState` filters it by workspace like `deskCards`. [[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]: 13 of 13, and each of the four breaks its note names failed a check. `desk-model.test.mjs`'s "changing the view leaves the desk alone" is rewritten to the new rule; `npm test` passes. The three amendment paragraphs are on [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], [[TST-0019-The-Desk-Is-Chosen-And-Arranged]] and [[FEAT-0010-Lifting-A-Note]].
