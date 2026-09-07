---
type: "[[issue]]"
id: ISS-0020
aliases: ["ISS-0020"]
title: "Closing the main window promotes a satellite that keeps drawing one panel, so Deck is left with a window it calls the focus window that has no view buttons and no workspace rail"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["A lead in [[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
severity: medium
component: main
parent: ""
related: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[TASK-0014-Satellites-Do-Not-Steal-Focus]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# A promoted satellite draws no navigation

## Problem

**Close the main window while a panel is open on another screen and you are left with a window Deck calls the focus window that cannot navigate anywhere.** [[FEAT-0004-Windows-On-Any-Screen]]'s sixth acceptance criterion says closing the focus window does not orphan the satellites: "they keep rendering, and a new focus window adopts navigation." The first half held. The second did not.

**The promotion happened in the main process and nothing told the window.** `main.ts` set `info.role = 'focus'` and moved `focusWindowId`, both in a map the renderer never reads again: the renderer asks its role exactly once, inside `boot()`. So the promoted window kept `pinned = true`, `renderSwitcher` still returned early, and the stylesheet still hid the rail and whatever its panel does not carry.

**The smoke run asserted the wrong half.** It checked `promoted === 'focus'` and `focusWindowId === satellite.id`, both read back out of the main-process map — the transport, not the behaviour. That is the pattern [[FEAT-0003-One-Store-In-The-Main-Process]]'s own earlier review named.

## Expected

The promoted window draws the workspace rail, the view switcher and the whole page.

## Actual

It drew one panel and no navigation, under the title of the focus window.

## Evidence

- `desktop/src/main/main.ts` — the `closed` handler set the role in `windowInfo` and sent nothing.
- `desktop/src/renderer/renderer.ts` — `boot()` calls `host.windowRole()` once; nothing pushes a later change.

**Established by reading the code, not by running Deck** ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]).

## Resolution, 2026-09-07

**The promoted window is reloaded as a focus window.** Its panel is cleared in the main process and it is sent to `/?role=focus`, so `boot()` asks again and gets the new answer.

**What survives is the SHARED state** — the workspace, the view, the desk and the focused note — because that lives in the main process and the reload reads it back. **What does not survive is what the panel had pinned.** A `note` satellite holds its own note in renderer-local state, set from its address at boot; the reload drops the address, so the promoted window shows whatever note the shared state names, which can be a different one. An earlier draft of this note claimed the pinned note survived, and it does not.

The promotion also carries the `!shutDown` guard its sibling line already had, added 2026-09-07 after the second close-out review: without it every quit with a panel open promoted that panel and then loaded a URL into a window being destroyed, against a host `shutdown()` had already closed. That is the same pattern [[ISS-0006-A-Clean-Quit-Forgets-Every-Popped-Out-Panel]] was filed for, two lines apart.

**Unguarded by anything automated** — no suite can import `main/main.js`, which needs the Electron runtime ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]). The smoke run should also stop asserting on the main-process map and check what the promoted window draws; that is worth doing when the renderer gains coverage.
