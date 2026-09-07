---
type: "[[issue]]"
id: ISS-0019
aliases: ["ISS-0019"]
title: "Pasting an address copied from a popped-out window hides the main window's navigator and reader, and no control left on screen brings them back"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["A lead in [[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# Pasting a panel address collapses the focus window

## Problem

**Copy an address from a popped-out window, paste it into the main window, and the main window becomes that panel — with no way back.** A satellite's own Copy address produces something ending `?panel=desk`, because the panel is part of the address grammar and that is how a restart reopens the window carrying the same thing. `applyAddress` then stamped the panel on whatever window followed the address, and the stylesheet hides the navigator and the reader for a window carrying a desk panel. The controls that would let a person undo it are among the things hidden.

Recovery meant opening the address dialog again and typing an address with the `panel=` part removed by hand, which nobody would guess.

## Expected

Following an address in the main window takes you to the workspace, the view, the desk and the note it names. The main window is not a panel.

## Actual

It became one, permanently.

## Evidence

- `desktop/src/renderer/renderer.ts` — `applyAddress` assigned `panel = address.panel` and stamped `document.body.dataset['panel']` for every window.
- `desktop/src/renderer/deck.css` — the `body[data-panel="desk"]` rules hide the navigator and the reader.

**Established by reading the code, not by running Deck** ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]).

## Resolution, 2026-09-07

**A panel belongs to a satellite, so only a satellite adopts one from an address.** The focus window follows the rest of the address — workspace, view, desk, note — and says out loud that it left the panel behind, rather than dropping it silently. A satellite is unaffected, including the one that reads its own address at boot, because its role is settled before the address is applied.

**Unguarded by anything automated**, which is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]].
