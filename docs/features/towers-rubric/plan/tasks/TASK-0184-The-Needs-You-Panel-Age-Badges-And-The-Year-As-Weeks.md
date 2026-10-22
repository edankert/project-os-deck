---
type: "[[task]]"
id: TASK-0184
title: "The needs-you panel, age badges on quiet towers and the year as weeks"
status: done
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

- [x] The needs-you panel, top right: a large count of the tickets that need you, one bar split by the cockpit's reasons (failed, to review, to decide, to run, waiting), and the first three tickets as cockpit rows, the most urgent reason first. Pressing a part of the bar, or its word, lights those tickets as a search does; pressing a row selects it.
- [x] A tower whose tickets have not changed for 14 days or more carries "◷ N d", counted from its newest `updated:` to today. The card gives the same count for one ticket. "◷ Ages" in the header hides and shows the badges.
- [x] The weeks panel, bottom right: four rows of thirteen squares filled by the tickets closed that week, this week outlined and the weeks after it faint; the year's last days fold into week 52; closed tickets with no date are counted under the squares beside a mark of their own. Pressing a week lights the tickets closed in it.
- [x] The two right-hand panels give way to the ticket pane when it opens.
- [x] The reason split, the ages and `weeksOf` are checked by [[TST-0102]] on both fixtures, with "today" passed in so the check does not change with the date.

## Notes

PHASE-0005's Out of scope says the overview shows state, not time. Edwin's yes to TASK-0177 asks for these two dates, so that bullet is amended to keep only forecasts out (FEAT-0031, "Decisions taken in planning").

## What was built (2026-10-22)

- **What needs you, top right on the wheel** (`needsPanel` in `desktop/src/shared/overview-needs.ts`, a new `needs` panel body): the count, one bar split by the cockpit's reasons in order of urgency (failed, to review, to decide, to run, waiting), each reason's count in words, and the first three tickets as cockpit rows. Pressing a part of the bar or its words lights those tickets as a search does, with the words in the box; Escape puts the ring back. Pressing a row selects it.
- **Ages.** Each unfinished tower carries `age` in the layout when none of its tickets has changed for 14 days or more, counted from the newest `updated:` to the day the model was built, which is today for a live model. The 3D view draws it as "◷ 34 d" over the tower, and ◷ in the overview's corner hides and shows the badges. The flat plan puts it in the tower's callout only, since badges at rest would break the 60-word rule on your-trainer. The card gives the selected ticket's own count as "Quiet".
- **The year as weeks, bottom right** (`weeksPanel`, a new `weeks` panel body), from `weeksOf`: four rows of thirteen squares, each filled by the tickets closed that week and lighting them when pressed; this week outlined, later weeks faint; closed tickets with no date counted under the squares, and pressable too. A ticket closed in another year is in no week, as on the page.
- **Both give way to a selected ticket's pane**; the board stays. Every reason, week and undated count is in the list twin, and its button lights the same tickets (`ListRow.lights`).
- [[TST-0102]] has 42 checks now. They pin the page's counts: needs 12 on Deck (5 to review, 1 to run, 6 waiting) and 75 on your-trainer (5 to decide, 9 to run, 61 waiting); one quiet tower on Deck's fixture, FEAT-0016 at 34 days; 298 closed in 2026 on Deck, busiest week 36; 1,478 on your-trainer, busiest week 24, 49 undated.
- The plate script now counts the needs panel's three rows among the tickets a plate draws (`desktop/scripts/overview-plates.mjs`).
- **Checked in the real Deck**, in the container: on Deck's live notes the panel counted 15 (11 to review, 1 to run, 3 waiting); pressing "11 to review" lit 11 and said so; the busiest week, 36, lit its 132 tickets; nine towers carried their ages, and ◷ hid and showed them. The towers walk held 27 of 27.
