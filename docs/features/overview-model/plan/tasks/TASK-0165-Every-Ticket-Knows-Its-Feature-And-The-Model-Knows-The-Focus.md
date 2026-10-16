---
type: "[[task]]"
id: TASK-0165
title: "Every ticket in the overview model knows the feature it belongs to, and the model carries the workspace's focus and the ticket that is next"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0166]]"]
related: ["[[TASK-0163]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# Every ticket knows its feature, and the model knows the focus

**Deck's overview model now says which feature each ticket belongs to, and what the workspace is working on.** The towers need both, and until now only the design page worked them out, by reading the notes itself.

- **`Ticket.feature`**: the id of the feature the ticket stands in, or none. The rule is the design page's: the ticket's `parent:` followed up to the first feature, else the first feature, lowest number first, whose `tests:`, `implements:`, `designs:`, `requirements:` or `tasks:` names it, else the feature of a task whose `tests:` names it. A feature has none.
- **`OverviewModel.focus`**: the SNAPSHOT's `focus.phase`, `focus.feature` and `focus.task`, each a ticket or phase id or null. A workspace with no SNAPSHOT has none.
- **`OverviewModel.next`**: the focus task when it is open, else the focus feature's first task at `doing`, then its first at `backlog` or `planned`, else null.

## Definition of Done

- [x] `buildOverview` sets `feature` from the records it already holds, and `OverviewService` passes the focus read from the workspace's SNAPSHOT.
- [x] Both fixtures are rebuilt with the new fields, and every ticket's feature agrees with the one on DES-0005's towers page for the same fixture commit, apart from differences the note names.
- [x] A node check covers each way a membership is written: a parent in single quotes, double quotes or bare; a dash list at column 0 or indented; an inline list; a link whose file name contains another id; a ticket that two features name; a test named only by a task.
- [x] `cd desktop && npm test` passes.

## Verification

`buildOverview` sets `Ticket.feature` (`assignFeatures` in `desktop/src/shared/overview-model.ts`) and, given a focus, `model.focus` and `model.next`; `overviewVerification` reads the focus from the workspace's SNAPSHOT with `snapshotFocus` and passes it, so a changed focus is part of the cache key. Deck's fixture was rebuilt at `65c6397` and is identical apart from the new fields; Your Trainer's fixture had the new fields added, as `desktop/fixtures/overview/README.md` says. On both, every tower floor of DES-0005's towers page has the same feature in the model (219 and 605 floors, no difference). TST-0090's model suite has a new check of every way a membership is written, the focus block and the next ticket. `cd desktop && npm test`: 791 tests, 791 passed.
