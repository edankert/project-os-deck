---
type: "[[task]]"
id: TASK-0183
title: "Search lights the towers, and the next-up board lists the focus feature's tasks"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0181]]", "[[TASK-0182]]"]
blocks: ["[[TASK-0184]]"]
related: ["[[TASK-0176]]"]
tests: ["[[TST-0102]]"]
---

# Search lights the towers, and the next-up board

**A search box in the overview's header makes the matching tickets glow where they stand, and a board at the bottom left lists what comes next in the feature in focus.** These are TASK-0176's other two ideas.

## Definition of Done

- [ ] `/` puts the cursor in the box. A ticket matches when its id or title has a word starting with each word typed ("rate" finds "Heart Rate", not "generate"). The box says how many matched.
- [ ] A search replaces a selection. Every other ticket fades; with a phase close the rest of the ring comes back faded. Up to twelve matches are listed under the box, what needs you first; the arrow keys and Enter, or a press, select one and fly the camera to it. A match outside the phase that is close goes back to the whole ring first.
- [ ] Escape steps back one thing at a time: the search, then the phase, then home. Bringing a phase close clears the search.
- [ ] The next-up board shows the focus feature's last two finished tasks greyed with their dates, the next ticket lit and marked NEXT, and up to six more (in progress, then at review, then waiting), each with its owner. It counts the feature's tasks done, cancelled ones left out, beside a bar of the same count. Its foot counts the tasks it has no room for. Pressing a row selects that ticket.
- [ ] With no feature in focus, or one not on the ring, the board says which and is empty.
- [ ] The matching rule and the board's rows (`boardOf`, moved into the shared code) are checked by [[TST-0102]] on both fixtures.
