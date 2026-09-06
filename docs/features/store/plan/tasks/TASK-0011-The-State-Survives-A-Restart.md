---
type: "[[task]]"
id: TASK-0011
aliases: ["TASK-0011"]
title: "The state survives a restart — written when it settles, read at launch, and never fatal when the file is bad"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
parent: "FEAT-0003"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: []
---

# The state survives a restart

## Objective

Deck reopens where it was left. The state file is written atomically after changes settle and read once at launch.

## Definition of Done

- [x] Quitting and relaunching restores the workspace, view, desk and focused note.
- [x] The write is atomic: a crash mid-write leaves either the old file or the new one, never a half file.
- [x] An unreadable, empty or malformed file leaves Deck starting from defaults, with the reason logged.
- [x] Writes are debounced, so dragging a card does not write the file on every frame.

## Steps

- [x] Choose the state file path under Electron's per-user data directory.
- [x] Write through a temporary file and rename.
- [x] Debounce the write and flush on quit.
- [x] Validate on read and fall back to defaults.

## Notes

Defaults on a bad file, never a refusal to start. A person whose Deck will not open because of its own state file has no way back in.
