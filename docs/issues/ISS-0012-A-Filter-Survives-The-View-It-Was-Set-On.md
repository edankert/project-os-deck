---
type: "[[issue]]"
id: ISS-0012
aliases: ["ISS-0012"]
title: "A filter set on one view still narrows the next one, and the dropdowns say nothing is filtered, so the navigator reads empty for no visible reason"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review for the PHASE-0001 close-out, 2026-09-07 ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]])"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]", "[[TST-0017-Search-And-Filter-Narrow-The-Navigator]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# A filter survives the view it was set on

## Problem

**The navigator says "0 of 30" while both dropdowns say "any status" and "any type".** Filter the Issues view down to one type, switch to Features, and the type filter is still applied — but Features has no such type, so nothing is drawn, and the controls show no filter because the select has no option matching the stored value. A person then has no control to clear what is hiding their notes.

**The reducer clears the search box and not the filters.** `reduce` clears `query` on `open-workspace` and leaves `filters` untouched; `select-view` clears neither (`desktop/src/shared/store-state.ts:97-115`). So a filter outlives both a view change and a workspace change.

**The controls cannot show what is applied.** `renderFilters` rebuilds each select from the new view's own values and falls back to an empty value when the stored one is absent (`desktop/src/renderer/renderer.ts:388`); `syncFilters` then assigns a value that has no matching option, which the DOM ignores. The select reads "any type" while the filter is live.

## Repro

```
after select-view    -> query: "ble" filters: {"statuses":[],"types":["issue"]}
after open-workspace -> query: ""    filters: {"statuses":[],"types":["issue"]}
groups drawn on Features with the stale type filter: 0  notes: 0
```

By hand: open Issues, set the type filter to `issue`, switch to Features.

## Expected

Either the filters clear with the view, as the search box does, or they persist and the controls say so. Not one and then the other.

## Actual

The filters persist silently and the controls report no filter.

## Evidence

- `desktop/src/shared/store-state.ts:97-115` — `open-workspace` clears `query`, not `filters`; `select-view` clears neither.
- `desktop/src/renderer/renderer.ts:388` — the fallback to `''` when the stored value is not among the new view's options.
- `desktop/tests/store.test.mjs:33` — the check titled "opening a different workspace clears what belonged to the old one" asserts only `viewId`, `noteId` and `deskName`. The title is wider than the assertions, which is why this was not caught.

## Next Actions

- [ ] Decide which behaviour is wanted: filters are per view, or filters persist and are shown.
- [ ] Widen `desktop/tests/store.test.mjs:33` to assert every field its title claims.
