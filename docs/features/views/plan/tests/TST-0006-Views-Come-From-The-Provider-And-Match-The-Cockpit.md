---
type: "[[test]]"
id: TST-0006
aliases: ["TST-0006"]
title: "Views come from the provider, match the cockpit's list, and appear nowhere as literals in the renderer"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/views.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh views"
covers: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Hard-coding one button in the renderer fails the source search; the fixture assertion fails when the cockpit adds or renames a view, which is the signal that the adoption table needs a row."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# Views come from the provider

## Purpose

Deck's views are the provider's answer, not a list in the renderer. This suite pins the project-os provider's list against the cockpit's and checks the renderer holds no view names of its own.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0006` reproduces it locally without writing anything.

## Procedure

- Assert the project-os provider returns exactly the views recorded in the cockpit fixture, in order.
- Swap in a second provider and assert the returned list changes with no renderer change.
- Assert an unknown workspace kind yields no views and says so.
- Search the built renderer sources for each view id and assert none appears as a literal.

## Expected results

- The provider's list matches the cockpit's navigator, name for name.
- The switcher's content is a function of the provider alone.
- No view id is written into the renderer.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh views`: 7 checks, all passing on 2026-09-06.
- The fixture `desktop/fixtures/cockpit-views.json` was read off the cockpit's own navigator markup on 2026-09-06 and matches its seven buttons in order.
- In the running application the switcher drew: Overview, Intent, Features, Issues, Tests, Publication, Library.

## Adequacy (who verifies this test?)

Verified by mutation on 2026-09-06. Adding one hard-coded view name to the renderer makes "no view id is written into the renderer" fail. The source search is crude by design: it is the only kind of check that catches someone adding a convenient literal button, which a behavioural test would not notice while the provider still returns the same list.
