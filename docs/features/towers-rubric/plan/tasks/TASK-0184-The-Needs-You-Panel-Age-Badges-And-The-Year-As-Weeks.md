---
type: "[[task]]"
id: TASK-0184
title: "The needs-you panel, age badges on quiet towers and the year as weeks"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0181]]", "[[TASK-0183]]"]
blocks: []
related: ["[[TASK-0177]]"]
tests: ["[[TST-0102]]"]
---

# The needs-you panel, age badges and the weeks

**Three panels from TASK-0177 join the towers: a count of what needs you split by reason, a badge on each tower that has gone quiet, and the year drawn as weeks of closed tickets.**

## Definition of Done

- [ ] The needs-you panel, top right: a large count of the tickets that need you, one bar split by the cockpit's reasons (failed, to review, to decide, to run, waiting), and the first three tickets as cockpit rows, the most urgent reason first. Pressing a part of the bar, or its word, lights those tickets as a search does; pressing a row selects it.
- [ ] A tower whose tickets have not changed for 14 days or more carries "◷ N d", counted from its newest `updated:` to today. The card gives the same count for one ticket. "◷ Ages" in the header hides and shows the badges.
- [ ] The weeks panel, bottom right: four rows of thirteen squares filled by the tickets closed that week, this week outlined and the weeks after it faint; the year's last days fold into week 52; closed tickets with no date are counted under the squares beside a mark of their own. Pressing a week lights the tickets closed in it.
- [ ] The two right-hand panels give way to the ticket pane when it opens.
- [ ] The reason split, the ages and `weeksOf` are checked by [[TST-0102]] on both fixtures, with "today" passed in so the check does not change with the date.

## Notes

PHASE-0005's Out of scope says the overview shows state, not time. Edwin's yes to TASK-0177 asks for these two dates, so that bullet is amended to keep only forecasts out (FEAT-0031, "Decisions taken in planning").
