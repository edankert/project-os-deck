---
type: "[[task]]"
id: TASK-0190
title: "FEAT-0031's review, round one: the weeks count every closed ticket, the 14-day edge is tested, and four smaller findings are fixed"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["FEAT-0031's independent review, round one, two fresh Claude reviewers on 1f6e623"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: S
due: ""
depends: ["[[TASK-0187]]"]
blocks: []
related: ["[[TASK-0184]]", "[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0183]]"]
tests: ["[[TST-0102]]"]
---

# Review round one: what the two reviewers found, fixed

**Both reviewers of FEAT-0031 refuted the same two claims, and each noted smaller faults in code the feature wrote; all are fixed here.** A finding in a feature's own code is fixed in that feature (QUALITY.md).

## Definition of Done

- [x] **The weeks count every closed ticket once.** A ticket closed in another year was in no week and not among the undated, so from 1 January every 2026 closure would have left the panel. Such tickets are now counted apart under the squares, like the undated, and pressing the count lights them.
- [x] **TST-0102 tests the 14-day edge.** Moving the badge's threshold by one day left all 61 checks passing; a check on a tower quiet for exactly 13 and exactly 14 days now fails that change.
- [x] A dropped feature's tower carries no age, as a finished one does not.
- [x] Search reads a letter of any alphabet as part of a word, so "lan" does not find "élan".
- [x] The picture dates are kept per workspace, so switching between two workspaces does not read git history again.
- [x] A selected ticket's count of links not drawn includes any linked ticket the layout has no cube for.
- [x] Round two's packet is written for two fresh reviewers.

## What was done (2026-10-22)

Each fix is listed in FEAT-0031's Review section, round one. Two of them have no new check: the dates kept per workspace (the main process's cache; nothing in a node test reads git twice) and `total` counting a linked ticket with no cube (every ticket stands on the ring, so no fixture has one). [[TST-0102]] has 63 checks, and the reviewers' own break of the 14-day edge now fails one. `npm test` passes 863.
