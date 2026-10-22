---
type: "[[task]]"
id: TASK-0183
title: "Search lights the towers, and the next-up board lists the focus feature's tasks"
status: done
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

- [x] `/` puts the cursor in the box. A ticket matches when its id or title has a word starting with each word typed ("rate" finds "Heart Rate", not "generate"). The box says how many matched.
- [x] A search replaces a selection. Every other ticket fades; with a phase close the rest of the ring comes back faded. Up to twelve matches are listed under the box, what needs you first; the arrow keys and Enter, or a press, select one and fly the camera to it. A match outside the phase that is close goes back to the whole ring first.
- [x] Escape steps back one thing at a time: the search, then the phase, then home. Bringing a phase close clears the search.
- [x] The next-up board shows the focus feature's last two finished tasks greyed with their dates, the next ticket lit and marked NEXT, and up to six more (in progress, then at review, then waiting), each with its owner. It counts the feature's tasks done, cancelled ones left out, beside a bar of the same count. Its foot counts the tasks it has no room for. Pressing a row selects that ticket.
- [x] With no feature in focus, or one not on the ring, the board says which and is empty.
- [x] The matching rule and the board's rows (`boardOf`, moved into the shared code) are checked by [[TST-0102]] on both fixtures.

## What was built (2026-10-22)

- **A search box in the overview's top right corner**, beside ◐ and ☰, shown on the wheel and with a phase close (`desktop/src/renderer/overview.ts`). `/` puts the cursor in it. The rule is `searchTickets` in `desktop/src/shared/overview-search.ts`: every word typed must start a word of the ticket's id or title. The ticket whose id is typed whole comes first, then what needs you, then open before closed, then by id.
- **The matches glow where they stand** (a glow over each in 3D, at most 600; the rest of the marks fade in the flat plan), and the rest of the ring fades, with a phase close too. The box says how many were found and lists the first twelve. The arrow keys and Enter, or a press, select one: on the phase brought close when it stands there, else on the whole ring, and the camera flies to it.
- **A search replaces a selection, and any other move clears the search**: a selection, bringing a phase close, back and forward. Escape clears a search before anything else, including when the cursor is not in the box.
- **The next-up board, bottom left on the wheel** (`desktop/src/shared/overview-board.ts`), from `boardOf`: the feature in focus, its tasks done as a count and a bar, the last two finished greyed and struck through with their dates, the next one lit and marked NEXT, then up to six more with who has each, and a foot counting the rest and naming the commit. Pressing a row selects that ticket. With no feature in focus, or one that does not stand on the ring, it says which and lists nothing.
- [[TST-0102]] has 32 checks now. They pin the page's own counts: "wheel" finds 16 on Deck's fixture and "heart rate" 29 on your-trainer's. Deck's board shows FEAT-0028's last two finished, TASK-0154 next and TASK-0158 after it. Your-trainer's shows FEAT-0136 at none of sixteen done, TASK-1057 next, six in progress, and a foot of "+ 7 in progress, 2 waiting".
- **Three checks were narrowed to the towers.** The board's rows name some of the wheel's tickets a second time, as any list does, so "the wheel draws every ticket exactly once" (TST-0090, twice) now counts the towers and checks each board row names a ticket they draw. The plate check that the state-coloured wheel paints no ticket by type looks at the towers only, because DES-0005 keeps the cockpit's marks in lists in both colourings.
- **Checked in the real Deck**, in the container, by the towers walk: `/` focused the box; "wheel" found 18 on Deck's live notes, said so, lit 18 and faded the rest, and listed twelve with what needs you first; Down and Enter selected FEAT-0016 and cleared the search; Escape cleared a search and stayed on the ring; the board showed FEAT-0031 with TASK-0183 marked NEXT; a press on its last row selected TASK-0187. 20 of 20 checks held.
