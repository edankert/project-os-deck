---
type: "[[plan]]"
title: "Plan — lifting a note"
status: done
owner: user:edwin
created: 2026-09-07
updated: 2026-09-11
source: ["[[FEAT-0010-Lifting-A-Note]]"]
implements: ["[[FEAT-0010-Lifting-A-Note]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Plan — lifting a note

## Delivery sequence

1. **[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]** — A click lifts a note out of the field onto the desk Deck already has. The slot stays ghosted. Closing is three verbs, none destructive, and a background click does nothing.
2. **[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]** — While a note is held, its linked notes and backlinks take the front band, the person is turned to face them, the front plane's label says what it now means, and the owed count keeps its place.
3. **[[TASK-0037-What-These-Share]]** — With several notes on the desk, the field marks what is joined to more than one of them and the desk bar counts it.

## Dependencies

- **Hard:** [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s TASK-0031 comes first, because there has to be a field to lift a note out of. Its TASK-0030 comes before TASK-0035 too, because a held note is an obstacle the slot geometry has to know about.
- **Hard:** the three tasks run in the order listed. TASK-0036 needs a held note to have a neighbourhood for, and TASK-0037 needs more than one held note's neighbourhood.
- **Soft:** the desk model from [[FEAT-0005-Spread-Cards-On-A-Desk]] is reused as it is. If TASK-0035 finds it needs to change, that change is an issue against Spread, not a widening of this feature.
- **Not a dependency:** [[FEAT-0001-The-Corpus-Has-An-Inside]]'s whole-graph payload. The neighbourhood is one request per held note to `/api/cockpit/context`.

## Open questions

- **The reader's minimum width on one monitor.** [[REFERENCE-DES-0002-REVIEW]] measured DES-0002's note window at 300 by 176 pixels and said a reader needs a minimum size or a reading column. That is a design question for [[DES-0002-The-Glass-Cockpit]] to answer, not a task here. Until it is answered, a held note opens in the reader at the width the reader has today.
