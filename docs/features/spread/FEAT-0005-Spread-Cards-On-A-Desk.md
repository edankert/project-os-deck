---
type: "[[feature]]"
id: FEAT-0005
aliases: ["FEAT-0005"]
title: "Spread: notes as cards on a desk, and a desk you can save and come back to"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left."
requirements: []
tasks: ["[[TASK-0015-Notes-Become-Cards]]", "[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]", "[[TASK-0028-A-Card-Face-Per-Type]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
---

# Spread

## Goal

Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left.

## Scope

**In scope.** Cards built from the list the sidecar already returns, so a card shows what the cockpit's row shows: id, title, type and status band. Several cards visible at once. A desk that records which cards are on it and where, saved by name into Deck's store and restored on demand.

**Added 2026-09-07, after the review Edwin accepted ([[REFERENCE-PHASE-0001-REVIEW]]).** The groups the sidecar already sends are drawn rather than flattened away, so Needs you comes first, phases hold their features and tasks, severity bands and test tiers are headings, and finished work folds away. The navigator list and the desk become two different surfaces: the desk starts empty and holds what a person put on it. Cards are dragged with the pointer and removed. The renderer owns search and filtering, because the pooled DOM means the browser's own find cannot see an undrawn note. A card's face depends on its type: progress for phases and features, severity for issues, staleness for tests.

**Out of scope.** The three depth bands, the console as furniture and the neighbourhood ring. Those are Glass, and they are [[PHASE-0002-Glass]].

**Out of scope.** Editing a note from a card. Deck reads.

## Acceptance

- A view lists its notes in the navigator, grouped as the sidecar grouped them, with what is owed at the top and finished work folded away.
- A card's status band matches what the sidecar reports for that note, checked against the same note in the cockpit.
- The desk starts empty; a note reaches it because a person put it there, and leaves it because a person took it off.
- A card is moved with the pointer and stays where it was released.
- A desk saved by name reopens with the same cards in the same places, across a restart.
- A desk that names a note the workspace no longer has opens without that card and without failing.
- Typing in the search box narrows the navigator to matching notes, including notes the pool had not drawn.
- A phase or feature card shows its progress, an issue card its severity, and a test card how stale its last walk is.

**2026-09-07:** the first criterion changed. It used to say a view shows its notes as cards on the desk. The desk is now a chosen subset, so the view's notes are listed in the navigator instead.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0015-Notes-Become-Cards]], [[TASK-0016-A-Desk-Is-Saved-And-Reopened]], [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]], [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], [[TASK-0025-Cards-Are-Dragged-And-Removed]], [[TASK-0027-Search-And-Filter-In-The-Renderer]], [[TASK-0028-A-Card-Face-Per-Type]]
- Plan: `docs/features/spread/plan/PLAN.md`

## Where this stands

**2026-09-07, review: changes requested, and made.** An independent review found six defects, three of them in this feature: a card jumped when it was dragged on a desk that had scrolled ([[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]), and three smaller ones, of which the worst is that a restored position was never clamped although this note claimed it was ([[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]). All are fixed. The review's structural finding stands and is worth repeating: no automated suite loads anything under `desktop/src/renderer/`, so four of the six tasks make claims that only the Electron smoke run touches, and every one of these defects sat in that gap.

**2026-09-07, later: the five tasks are done and the status is back at `review`.** Spread now has two halves. The navigator lists what a view holds, in the groups the sidecar sent, with what needs a person at the top and finished work folded away. The desk beside it starts empty and holds what a person put there, where they put it, and saving a desk records that list. Search narrows the navigator over the whole model, so a note the pool never drew is still findable, and a card's face is chosen by what the note is. The automated checks are [[TST-0016-The-Groups-The-Sidecar-Sends-Are-Drawn]], [[TST-0017-Search-And-Filter-Narrow-The-Navigator]], [[TST-0018-A-Card-Shows-What-Its-Note-Is]] and [[TST-0019-The-Desk-Is-Chosen-And-Arranged]]; the Electron smoke run drives the real application, clicks a row onto the desk, drags the card and reloads to find it where it was left. What is owed is the walk a person makes, which is [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]].

**2026-09-07, earlier: the status went back to `doing`, because five new tasks were in backlog.** A feature at `review` is waiting on a walk and nothing else. This one is waiting on work again, so `review` would be a false reading of it, and `STATUSES.md` puts `doing` before `review` for exactly this. It returns to `review` when TASK-0023, TASK-0024, TASK-0025, TASK-0027 and TASK-0028 are done and only the walks are owed.

**Why the tasks were added.** A review on 2026-09-07 found that what Spread shows is a flat grid of identical cards with a reader beside it, and that nothing on the desk can be arranged, grouped or searched ([[REFERENCE-PHASE-0001-REVIEW]]). Deck's own state file held zero saved desks after a day of use, because a desk saved wherever the flow layout had put the cards. Edwin accepted the finding the same day.

**2026-09-06: built and tested; the acceptance walk is owed.** One criterion here can only be settled by a person doing something a machine cannot: opening this repository in the cockpit and in Deck side by side and comparing the ids, the order and the statuses. That walk is [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]], and its Procedure needs rewording once TASK-0024 lands, because it tells a person to open a view and watch the desk fill.


**How the close-out pass's findings were discharged, 2026-09-09.** Recorded here because the third review found this section still describing the state before the fixes.

| finding | note | where it stands |
| --- | --- | --- |
| a card jumps when the desk has scrolled | [[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]] | `fixed` |
| four smaller defects in the renderer | [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] | `fixed` |
| the remove control does nothing | [[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]] | `fixed` |
| nothing in CI exercises the renderer | [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] | **still `triage`**, and it is the phase's largest open question. The smoke run reaches the renderer and CI does not run it |

## Independent review — 2026-09-07

**Verdict: changes-requested.** Clean context, separate session, working from the notes and the diff of `7a001e8` (re-read at `9a68eac`, which is one commit further on). Same model family as the author, recorded in `reviewed_by`. Four findings, the first two of them defects in the drag and the restore.

- **Dragging a card on a scrolled desk teleports it.** `desktop/src/renderer/renderer.ts:506-510` builds the pointer position in the desk's *content* coordinates, by adding `el.desk.scrollLeft` and `el.desk.scrollTop`, and then clamps that number against `el.desk.clientWidth` and `el.desk.clientHeight`, which are the *viewport* of the desk. `.desk` is `overflow: auto` (`deck.css:180`) and `nextSlot` lays cards out downwards without bound, so a desk with more cards than fit does scroll. Reproduced arithmetically with the real `clampToSurface`: a desk 900×400 scrolled down 500px, holding a card stored at y=824, computes a raw drag position of 825 and clamps it to 352 — the card jumps 473px up the moment the pointer moves. This contradicts the first acceptance criterion, "Dragging a card with the pointer moves it, and it stays where it is released".
- **A restored position is never clamped, which the notes say it is.** `clampToSurface` is called in exactly one place in the product, the drag handler at `renderer.ts:510`. `drawDesk` (`renderer.ts:392-402`) places every restored card at its raw stored `x`/`y`. So the Impact bullet in [[CHG-20260907-Spread-Becomes-Two-Surfaces]] — "pulled back on screen when a desk saved on a large monitor is opened on a laptop" — and the same sentence in TASK-0025's "Where this stands" describe behaviour the code does not have. The check that was supposed to guard it, `desktop/tests/desk-model.test.mjs:153`, calls `clampToSurface` directly, so it passes whether or not the restore path ever calls it.
- **The navigator's counter compares two different countings.** `renderer.ts:342` computes `shown` as the sum of each group's top-level cards; `renderer.ts:349` prints it against `currentCards.length`, which is the flattened, de-duplicated count including every child. On the Features view, where a feature can hold 136 child tasks, the counter reads something like "230 of 1400" when nothing is narrowed at all. `countCards` in `shared/search.ts:92` counts children and is exercised by `search.test.mjs:129` but is called by no production code.
- **The remove control is live on a Needs-you card.** `CardPool` wires `.remove` to `take-off-desk` for every pooled element (`cards.ts:102-106`), and the Needs-you panel renders through the same pool (`renderer.ts:382`). Dragging is blocked there (`renderer.ts:493`) but removing is not, and nothing in `deck.css` hides `.card .remove` for that panel. Clicking × on a Needs-you card silently takes that note off the main window's desk while the strip keeps showing it.

Not defects, checked and cleared: the identity claim in `move-card` holds (`store-state.ts:174-179` returns untouched cards by reference, and the check asserts by identity); a pooled card element cannot show one note's data with another note's handler, because every handler resolves its model from the element's current `data-note-id` (`cards.ts:81-84`); and `hidden` really removes an element, because `deck.css:27` sets `[hidden] { display: none !important; }`, which `render.test.mjs` guards including against a future `!important` that would outrank it.

Two smaller observations, not blocking. `NavigatorList.paintRow` recovers the row index with `this.rows.indexOf(row)` (`navigator.ts:88`) when the caller already has it, which is quadratic in the row count. And a navigator row hands the click handler `this.cards.get(row.card.noteId)` rather than `row.card` (`navigator.ts:81`); when the same note appears in two groups — which `groups.test.mjs:82` establishes it does, in Needs-you and again under its phase — the handler gets whichever model was painted last, not the one that row drew. Nothing visible depends on the difference today, because only `noteId` and `rel` are used downstream.

## Independent review — 2026-09-07 (close-out pass)

**Verdict: changes-requested.** Clean context, separate session ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]). One defect, one measurement and one lead.

- **A filter set on one view still narrows the next one, and the dropdowns then say nothing is filtered** ([[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]]). The reducer clears the search box on a workspace change and never clears the filters; a view change clears neither.
- **The clamp fix from [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] is guarded by nothing.** Replacing the clamp call in the built renderer with a plain assignment left all 153 checks green. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] with a number on it, and [[TST-0019-The-Desk-Is-Chosen-And-Arranged]]'s `adequacy` field, which claimed the opposite, is corrected.
- **A lead**: `deskBounds` measures `scrollHeight` before the pool renders, so it reads the previous paint. A card restored below the desk's height would then creep down by about 56 pixels on every repaint until it is off-screen again. Read from the arithmetic, not run.

## Independent review — 2026-09-09 (third pass)

**Verdict: approved.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

The close-out pass left one defect, one measurement and one lead. The defect is [[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]], `fixed`. The lead — a restored card creeping down the desk because `deskBounds` reads the previous paint — was turned into [[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]] and is `fixed`; the renderer now calls `placementBounds` on content that already exists (`desktop/src/renderer/renderer.ts:608`).

**The measurement stands unanswered and it is not this feature's to answer.** "Replacing the clamp call in the built renderer with a plain assignment left all checks green" is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]], still at `triage`. I confirmed the shape is unchanged: no check in `desktop/tests/` loads the renderer, and `grep -rn "applyVerb\|askText" desktop/tests/` returns nothing.

**This note records no discharge either.** Nothing after the close-out review says its three points were answered. A reader has to go to `docs/issues/` to find out.
