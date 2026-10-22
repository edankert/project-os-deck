---
type: "[[plan]]"
title: "Plan for FEAT-0031: the seven Rubric ideas built into Deck's towers"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
implements: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
---

# Plan for FEAT-0031

Seven tasks, one commit each. Each task adds its own checks to the `overview-towers` suite ([[TST-0102]]) in the same commit, so the suite grows with the build. The last task extends the screen checks, repeats the window run and redraws DES-0005 from a real Deck window.

## Delivery sequence

1. [[TASK-0181]] The model carries each ticket's first paragraph, owner and last update; the main process lists the pictures beside the notes with their dates and tickets. Read-only. The page's helpers move from `desktop/scripts/overview-towers-notes.mjs` into `desktop/src/shared/`, and the page imports them from the build, so there is one copy.
2. [[TASK-0182]] A ticket selected on the ring draws its links as curves, in 3D and in the flat plan, with the card and the ticket pane.
3. [[TASK-0183]] Search lights the towers, and the next-up board lists the focus feature's tasks.
4. [[TASK-0184]] The needs-you panel, age badges and the weeks panel.
5. [[TASK-0185]] The ring can be grouped by feature; it opens by phase, the switch is remembered and the address can name it.
6. [[TASK-0186]] Pictures stand at their own tickets, sized by nearness, served through Deck's host ([[RISK-0011]]).
7. [[TASK-0187]] The screen checks extended to the new panels, the window run TST-0093 repeated on both workspaces, DES-0005 revised with pictures from a real Deck window, and Edwin's acceptance test [[TST-0103]] set `active`.

## Dependencies

- **Hard:** TASK-0181 comes first: the pane, the card, the board, the ages, the weeks and the pictures all read what it adds. TASK-0182's selection comes before search (a search replaces a selection) and before the pictures (they show in the pane). TASK-0185 comes before TASK-0186, because a picture stands over a different tower when the ring is grouped by feature.
- **Soft:** TASK-0184 after TASK-0183, so a part of the needs-you bar can light its tickets the way a search does.
- **Window runs.** Edwin wants window-opening runs held until he says, and run in the Colima container first (`run-smoke.sh`). Node suites run freely. TASK-0187 is the one window run for the whole feature.

## Open questions

- None block the build. DES-0005's other open questions (Level 2, S5's plates, the shelf's badge, the opening colouring, two greens, a failed release check) are untouched by this feature.
