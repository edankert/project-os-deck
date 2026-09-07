---
type: "[[issue]]"
id: ISS-0006
aliases: ["ISS-0006"]
title: "A clean quit forgets every popped-out panel, and only a kill preserves them, because the window's own close handler removes it from the book"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review of the PHASE-0001 Spread work, 2026-09-07"]
severity: high
component: main
parent: ""
related: ["[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: []
---

# A clean quit forgets every popped-out panel

## Problem

**Pop out a status window, quit Deck the normal way, start it again, and the window is gone.** Kill Deck with a signal instead and the window comes back. The two paths are the wrong way round.

Deck remembers a popped-out window by its address, and forgets it when the window is closed, because a window closed on purpose should not come back. But `app.quit()` closes every window before it leaves, so a normal quit ran that same forgetting for every panel. A signal kill calls `app.exit`, which never closes the windows, so nothing was forgotten and the panels survived.

This is exactly the criterion [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]] exists for, and the one this phase's second exit criterion was restored to ask for. It is also why the same task's own geometry saving is done by the shutdown path rather than left to the windows.

Found by the independent review of 2026-09-07 by reading the two paths against each other. Nobody had quit Deck and restarted it with a panel open.

## Resolution

**Fixed 2026-09-07** with the guard the geometry path already had: a window closed while Deck is shutting down is not forgotten. A window closed by a person still is.
