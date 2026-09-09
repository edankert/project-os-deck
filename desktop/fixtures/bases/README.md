# Base-file fixtures

Copies of every `.base` file Deck's description reader was measured against,
taken on 2026-09-09. They are here so the suite does not depend on `~/Notes`
being present, and so a change to one of Edwin's live files cannot quietly
change what a test asserts.

**They are read and never written.** [[PHASE-0001-Deck]] puts writing any file
Obsidian owns out of scope, and `desktop/tests/descriptions.test.mjs` asserts
the modification times do not move.

| fixture | copied from |
| --- | --- |
| `comic-novel.base` | `/Users/edwin/Notes/__bases__/Comic/Novel Base.base` |
| `comic-sidebar.base` | `/Users/edwin/Notes/__bases__/Comic/Novel Base - Side Bar.base` |
| `tasks.base` | `/Users/edwin/Notes/__bases__/Tasks/Tasks Base.base` |
| `tasks-daily.base` | `/Users/edwin/Notes/__bases__/Tasks/Daily Tasks Base.base` |
| `galway-cartoon-festival.base` | `/Users/edwin/Notes/03 Projects/Galway Cartoon Festival/Galway Cartoon Festival.base` |
| `tasknotes-agenda-default.base` | `/Users/edwin/Notes/TaskNotes/Views/agenda-default.base` |
| `tasknotes-calendar-default.base` | `/Users/edwin/Notes/TaskNotes/Views/calendar-default.base` |
| `tasknotes-kanban-default.base` | `/Users/edwin/Notes/TaskNotes/Views/kanban-default.base` |
| `tasknotes-mini-calendar-default.base` | `/Users/edwin/Notes/TaskNotes/Views/mini-calendar-default.base` |
| `tasknotes-relationships.base` | `/Users/edwin/Notes/TaskNotes/Views/relationships.base` |
| `tasknotes-tasks-default.base` | `/Users/edwin/Notes/TaskNotes/Views/tasks-default.base` |
| `cockpit-context.base` | `../../project-os-cockpit/docs/__bases__/CONTEXT.base` |
| `cockpit-navigation.base` | `../../project-os-cockpit/docs/__bases__/NAVIGATION.base` |
