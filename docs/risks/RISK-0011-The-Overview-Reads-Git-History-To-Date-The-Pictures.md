---
type: "[[risk]]"
id: RISK-0011
title: "The overview reads git history to date the pictures beside the notes, which could make it slow to open on a large repository"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
likelihood: medium
impact: low
mitigation: ["One git log over docs/, kept per commit and run again only when HEAD moves", "Measured in TASK-0181: 362 ms the first time on your-trainer's 631 pictures, 9 ms after", "No git history gives each picture its file's own date, not an error"]
related: ["[[TASK-0181]]", "[[TASK-0186]]", "[[RISK-0010]]"]
---

# The overview reads git history to date the pictures

## Description

FEAT-0031 stands pictures at their tickets on the towers ring, newest first. A picture's date is its last commit, so Deck's main process starts running `git log` when it builds the overview model. Today it runs only `git rev-parse` and `git status` there (`desktop/src/main/overview-service.ts`). On your-trainer, with years of history and hundreds of pictures, a log over every commit at every overview build could make the overview slow to open, or slow to follow a change on disk.

Serving the pictures adds nothing new: Deck's host already serves images under a workspace's `docs/` at `/deck/file/<workspace>/<path>`, refuses a way out and sandboxes SVG (`workspaceImage` in `desktop/src/main/host.ts`). TASK-0186 reuses that route. Under `npm run start:lan` the same images reach a tablet, as they already do for notes.

## Mitigation

- One `git log` limited to image files under `docs/`, run once per model build.
- TASK-0181 records how long it takes on your-trainer. If it is more than a second, the result is kept per commit and read again only when HEAD moves.
- A workspace with no git history gives pictures with no date, not an error.

**Measured in TASK-0181 (2026-10-22).** The whole list, git read included, takes 362 ms the first time on your-trainer (631 pictures, about 2,900 commits) and 94 ms on Deck (108 pictures). The dates are kept per commit anyway, since they only change when HEAD moves, so a later build reads the folder only: 9 ms and 4 ms. A picture that has never been committed takes its file's own date, and so does every picture of a folder with no git history: an undated picture would sort behind every dated one and never stand on the ring. The overview's model is still rebuilt only when a note changes, so a picture added on its own appears with the next note change or when Deck restarts.

## Triggers

- The overview takes visibly longer to open on your-trainer after TASK-0181.
- The smoke run's overview check times out.
