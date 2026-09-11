---
type: "[[task]]"
id: TASK-0071
aliases: ["TASK-0071"]
title: "The smoke run drives the note in the middle and its ring with a real pointer, and the checks that assumed a lift fills the front band are rewritten, not deleted"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
parent: "FEAT-0017"
effort: "M"
due: ""
depends: ["TASK-0068", "TASK-0069", "TASK-0070"]
blocks: []
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The smoke run drives the middle and the ring

## Objective

The Glass section of the smoke run (`desktop/src/main/smoke-glass.ts`) drives the note in the middle, the dock, the ring, the lines and the orbit's version with real input in a real window. Each new check is seen to fail with its fix removed. The existing checks that this feature changes the meaning of are rewritten so they still check what they were written for.

## Detail

**The new checks, with the break each must catch.**

1. Stage one: about 150 ms after a real click on a front card, the pane's rectangle overlaps the card's (break: the pane appears at its cascade place).
2. Stage two: at 1000 ms the pane is inside the rectangle TASK-0067 gives, and the store's stored place is `nextPanePlace()`'s (break: the middle written into the store).
3. The ring: every neighbour up to 16 is a mini note, and none overlaps the pane or another (break: a circle sized from the pane's width).
4. The order: the drawn neighbours' circular order before the lift is their order on the ring (break: order by id).
5. The lines: solid lines equal the neighbours in `linked`, dashed lines those in `backlinks` (break: every line solid).
6. The callout: resting on a line shows the direction and a non-empty sentence (break: sentence not asked for in the bands).
7. The door: a click on a mini note puts it in the middle, the previous focus is in the dock, and when linked it sits opposite the new focus's direction (break: no note-you-came-from constraint).
8. The dock: a click on a docked header swaps it into the middle; a drag on it moves nothing and leaves the stacking order unchanged (break: raise on press).
9. Escape: once leaves the middle with the neighbourhood then in the front band and the field turned to it; twice sweeps (break: Escape sweeps at once).
10. Hide notes, `W`, a drag of the focus pane's header, × on it, a view switch and a surface switch each leave the middle (break: one of them at a time left out).
11. The field is not dealt while a note is in the middle: the count of slot assignments is unchanged across a store broadcast (break: `redeal()` deals as before).
12. "+N more": on the note in this repository with the most neighbours, 15 mini notes and "+N more", and activating it focuses the navigator's group, which lists all of them (break: "+N more" dropped).
13. The keyboard: Tab from the pane's header reaches the first mini note; Enter on it puts it in the middle (break: mini notes not in the tab order).
14. Reduced motion: no frame between the card and the pane in the middle, and the ring is highlighted (break: the stages run regardless).
15. The orbit: a real click on a dot opens the middle over the orbit; the turn is unchanged over six seconds; after Escape every drawn dot is within 0.5 px of where it was (break: the drift not stopped).
16. Nothing kept: after a reload nothing is in the middle and every pane is at its stored place; the store's state has no new key; `git status` in the workspace is unchanged (break: the switch dispatched to the store).

**The existing checks this changes.** Several Glass checks lift a note and then expect what a lift does today: the front label and the neighbourhood in the front band (the lift section, "11 of 11 neighbours"), the field flying to face the neighbours, the reduced-motion highlight on the neighbours and the reduced-motion lift from a turned field, the shared notes dealt first, the pane at its cascade place before a drag, and "esc sweeps the desk". FEAT-0015's section also presses Escape once. Each such check is rewritten to press Escape once before it looks, or to assert the new behaviour where that is what the original fix was for. **None is deleted.** Each rewritten check is shown to fail again with its original fix removed, as [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] records for it.

**Its own section, reset at its start,** so the throw section's intermittent cascade ([[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]]) cannot also turn these red.

## Acceptance

- The sixteen checks above are in the Glass section and pass in `DECK_SMOKE_ONLY=glass` runs and in `bash tools/scripts/run-smoke.sh both`.
- Each was seen to fail with its break applied, one break per run, and the breaks and failing checks are listed in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]'s Evidence.
- Every rewritten check still fails with its original fix removed, and the note lists them.
- `npm test` passes, with [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]'s suite in it.
- `git status` in the workspace is unchanged after the run.

## Steps

- [x] Add the section, its reset and the sixteen checks, each printing what it measured.
- [x] Rewrite the existing checks listed above; do not delete any.
- [x] Apply each break to the built `desktop/dist` renderer, one per run, and record the result; rebuild afterwards.
- [x] Update [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: add [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]] to `covers:`, its five tasks to `tasks:`, a bullet under "What it covers", a line saying which earlier checks were rewritten and why, and the runs under Evidence.

## Outcome

**Done 2026-09-11.** `recordFocus()` in `desktop/src/main/smoke-glass.ts`: the sixteen checks, plus a dashed-line check on a note that has a link made only to it (such links sort last and often end in "+N more"). The order check lifts a note, leaves the middle so the neighbourhood is drawn in the front band, then brings the note back with Enter and compares. **Each check was seen to fail with its break**, except where noted: the pane grown from the middle (1, once the card was turned off the middle), the middle written to the store (2), a ring too tight (3), order by id (4), every line solid (5), no sentence in the bands (6), no note-you-came-from rule (7), a docked header raised on press (8), one Escape sweeping (9, through the rewritten Escape check), each way out left out in turn (10: Hide notes and `W` once the check also undoes them, since the middle would otherwise come back; × once the check holds two notes; a view switch caught through the view-switch and FEAT-0015 checks), the field dealt in the middle (11), "+N more" dropped (12), the Tab jump removed (13), the stages under reduced motion (14), the drift not stopped (15, with both guards removed), and the middle kept in the store (16, through every Escape check; the reload check itself was masked by the cascade). **The older checks** that assumed a lift fills the front band, one Escape sweeps, or the first pane is at its place were rewritten to press Escape first or twice; each still fails with its original fix removed: the neighbourhood not joined, no reduced-motion highlight, no snap below a header, no sweep, a turn made as a cut, Glass not told to hide, a raise that ignores notes on every view, and Escape clearing every list. None was deleted. Building the checks found three real defects, fixed: the orbit kept drifting under a note in the middle; the ring could place a mini note under the compass; and a narrow field with a dock fell back to two places.
