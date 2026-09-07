---
type: "[[test]]"
id: TST-0017
aliases: ["TST-0017"]
title: "Search and filter narrow the navigator, and find a note no card on screen holds"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/search.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh search"
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: ["[[TASK-0027-Search-And-Filter-In-The-Renderer]]"]
artifacts: []
adequacy: "Returning a fresh array when nothing is typed fails the same-object check. Matching on the title alone fails the id query. Dropping a parent whose own text does not match fails the collapsed-child search."
mutation_score: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]"]
---

# Search and filter narrow the navigator

## Purpose

The card pool draws only what is on screen, so the browser's own find command cannot see a note that is not currently drawn. Deck matches over the model instead. This suite is over that matching, and over what the narrowed model leaves for the navigator to draw.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0017` reproduces it locally without writing anything.

## Procedure

- Assert an unnarrowed view returns the same object rather than a copy, so typing nothing costs nothing.
- Query by note id and by a word from the title, and assert each finds the one note.
- Assert matching is case-insensitive and word by word, so `RIDE mode` matches and `ride absent` does not.
- Narrow to a query only one group can satisfy, and assert the emptied group is gone rather than drawn empty.
- Query for a task held by a collapsed feature, and assert the task is found and its parent is kept.
- Assert a note kept for its own sake keeps everything it holds.
- Query for nothing that matches, then clear the query, and assert the whole list comes back.
- Filter by status, then by type, and assert each shows only the notes at that status or of that type.
- Give a query and a filter together, and assert both have to be satisfied.
- Assert each heading's count comes from what survived the narrowing, and that counting a group counts what its notes hold.
- Assert the filter lists offer the statuses and types the view actually holds.

## Expected results

- A note is findable whether or not a card for it exists on screen, which is the point: the pool draws only the visible ones.
- A parent is kept when a child matches, so the matching child has somewhere to appear.
- Narrowing never changes the note the sidecar sent, only which notes are drawn.
- The filter menus never offer a status or a type the view cannot show.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh search`: 13 checks, all passing on 2026-09-07.
- The desktop suites run 165 checks in total on that date, this one included.

## Adequacy (who verifies this test?)

Returning a fresh array when nothing is typed fails the first check, which is worth guarding because a copy per keystroke repaints the whole navigator. Matching on the title alone fails the id query. Dropping a parent whose own text does not match fails the collapsed-child case, and that is the case the card pool makes necessary: without the parent the match has no row to appear in.

## Notes

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. `narrowGroups` is tested where it matters: a child of a collapsed parent is found, the parent is kept so the child has somewhere to appear, an emptied group is dropped rather than drawn empty, and clearing restores the same groups. Reverting matching from the model to the drawn rows is not expressible here, but the check that a collapsed feature's task is still found is the closest a pure test can get, and it would fail if `narrowCards` stopped recursing.

Two limits, neither blocking. A card kept because it matches keeps all of its children, including children that do not match, so with a status filter applied an expanded parent shows notes at other statuses — narrower than TASK-0027's fourth criterion reads, and deliberate per the module's own comment. And `countCards` is asserted at line 129 but is called by no production code; the counter the renderer actually prints is built differently, which is a finding on [[FEAT-0005-Spread-Cards-On-A-Desk]] rather than on this suite.
