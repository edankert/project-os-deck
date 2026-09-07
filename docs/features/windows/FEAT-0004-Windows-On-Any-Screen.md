---
type: "[[feature]]"
id: FEAT-0004
aliases: ["FEAT-0004"]
title: "Windows on any screen: a panel pops out, remembers the display it was on, and never steals focus"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in."
requirements: []
tasks: ["[[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]", "[[TASK-0013-A-Window-Reopens-Where-It-Was]]", "[[TASK-0014-Satellites-Do-Not-Steal-Focus]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: changes-requested
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
---

# Windows on any screen

## Goal

A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in.

## Scope

**In scope.** Opening a panel in its own window. Remembering each window's bounds under a stable key and restoring them on the display they were on, falling back to the primary display when that monitor is gone. One focus window that owns navigation, and satellite windows that render state and do not take focus when they open or update.

**Added 2026-09-07, after the review Edwin accepted ([[REFERENCE-PHASE-0001-REVIEW]]).** Popping out asks what to pop out, and the new window carries one panel: the Needs-you strip, a single note, or a desk. The panel type goes into the address, so the window is restorable and its address is shareable the way every other Deck state is.

**Out of scope.** Tearing a panel out by dragging it, which is a gesture rather than a capability and is not measured by any exit criterion. A panel opens in its own window from a command; the drag can come later.

## Acceptance

- Popping out offers a choice of panel: the Needs-you strip, the focused note, or the current desk, and the new window carries only that.
- A panel opened as its own window appears on the display it was last closed on, at the same size and position, across a restart of Deck.
- A popped-out window's address names its panel type, and opening that address again produces the same panel.
- A window whose remembered display is no longer connected opens on the primary display, fully on-screen.
- A satellite window that opens or updates does not take focus from the focus window.
- Closing the focus window does not orphan the satellites: they keep rendering, and a new focus window adopts navigation.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0012-A-Panel-Opens-In-Its-Own-Window]], [[TASK-0013-A-Window-Reopens-Where-It-Was]], [[TASK-0014-Satellites-Do-Not-Steal-Focus]], [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]
- Plan: `docs/features/windows/plan/PLAN.md`

## Where this stands

**2026-09-07, review: changes requested, and made.** An independent review found that a normal quit forgot every popped-out panel while a signal kill preserved them, which is the wrong way round and defeats the criterion this feature's task exists for ([[ISS-0006-A-Clean-Quit-Forgets-Every-Popped-Out-Panel]]). Fixed the same day with the guard the geometry path already had. Nobody had quit Deck and restarted it with a panel open; the walk that would have caught it is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]] and it is still owed.

**2026-09-07, later: the task is done and the status is back at `review`.** Pop out asks what the new window will carry, and it carries one thing: what needs you, the focused note, or the desk. The panel is named in the address, the address is remembered, and a restart reopens the window carrying the same panel on the display it was left on. The automated check is [[TST-0020-A-Popped-Out-Window-Carries-One-Panel]], and the smoke run opens all three panels in the real application and asserts that each carries its own thing and nothing else. What is owed is the walk that needs a second monitor, which is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]].

**2026-09-07, earlier: the status went back to `doing`, because one new task was in backlog.** A feature at `review` is waiting on a walk and nothing else. This one is waiting on work again, so `review` would be a false reading of it, and `STATUSES.md` puts `doing` before `review` for exactly this. It returns to `review` when TASK-0026 is done and only the walk is owed.

**Why the task was added.** A pop-out is currently the same view again with no navigation, which is a duplicate rather than a panel. That is why this phase's second exit criterion was amended on 2026-09-06 to describe what existed instead of what Edwin had asked for. The review of 2026-09-07 put the criterion back ([[REFERENCE-PHASE-0001-REVIEW]]) and [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]] builds what it now asks for.

**2026-09-06: built and tested; the acceptance walk is owed.** One criterion here can only be settled by a person doing something a machine cannot: moving a window onto a second monitor, restarting Deck, and then unplugging that monitor and restarting again. That walk is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]], and its Procedure goes back to naming a status window once TASK-0026 lands.

## Independent review — 2026-09-07

**Verdict: changes-requested.** Clean context, separate session, from the notes and the diff of `7a001e8`. Same model family as the author, recorded in `reviewed_by`. One finding, and it is the criterion the phase's second exit criterion was restored for.

- **A normal quit empties the panel book, so a restart reopens no panels.** `desktop/src/main/main.ts:120-124` removes a satellite's address from `PanelBook` in the window's `closed` handler, with no guard for a quit in progress. `app.quit()` closes every window before `will-quit`, so `closed` fires for each open satellite on an ordinary Cmd-Q, and `deck-panels.json` is empty by the time Deck next starts. The behaviour is inverted: a kill (`app.exit`, which never closes the windows — the reason `shutdown()` saves geometry itself, per commit `df5fc95`) leaves the panels remembered, while a clean quit forgets them. This is TASK-0026's sixth acceptance criterion, "Quitting and restarting Deck reopens the popped-out window on the display it was left on, still carrying the same panel", and the same sentence in [[CHG-20260907-Spread-Becomes-Two-Surfaces]]. Not reproduced by running Deck — the instruction for this pass was to start no processes — so this is a reading of the code against Electron's documented quit sequence, and a person walking [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]] settles it in one attempt. The likely fix is a `if (shutDown) return;` in the `closed` handler.

Checked and cleared. A saved address whose workspace or note has since vanished cannot stop Deck starting: `normaliseAddresses` drops anything that no longer parses (`window-book.ts:93-98`), the address grammar is the only thing consulted at start-up, and a window whose workspace has gone opens and says so from `applyAddress` (`renderer.ts:559-562`) rather than throwing. Panels cannot accumulate from one address, because `add` de-duplicates on the exact string; there is no cap on the number of distinct addresses, which only matters if the removal path above is fixed. The three panel types are genuinely exclusive in the stylesheet (`deck.css:319-333` hides the navigator in all three), and a satellite draws no switcher and no rail.

One observation, not blocking: a window carrying `desk` still draws the desk bar's Save, Clear and desk picker, and the desk it shows is the shared live desk rather than a snapshot, so clearing from the panel clears the main window too. TASK-0026's criterion says "shows that desk's cards where they were placed", which does not settle whether that was intended.

## Independent review — 2026-09-07 (close-out pass)

**Verdict: changes-requested.** Clean context, separate session ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]). One defect and two leads.

- **The remove control is still drawn on a card in the Needs-you strip and now does nothing when clicked** ([[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]). [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] recorded both halves of that fix and only the refusal was built.
- **A lead against the sixth criterion**, "a new focus window adopts navigation": the main process sets the role, but the renderer asks its role once in `boot()` and nothing pushes a change, so a promoted satellite would keep `pinned = true` and draw no view buttons and no workspace rail. Nobody has reproduced it by running Deck, and the smoke run asserts on the main-process map rather than on what the window draws.
- **A lead about the panel in an address**: a satellite's own Copy address produces one carrying `panel=`, and pasting it into the focus window hides the navigator and the reader with no control to bring them back.

[[ISS-0006-A-Clean-Quit-Forgets-Every-Popped-Out-Panel]]'s fix is correct as read but guarded by nothing automated — no suite can import `main/main.js`, `PanelBook` is untested, and the smoke run reloads rather than restarts. That rides with [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]].
