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
mitigation: ["One git log limited to image files under docs/, once per model build", "Its time measured on your-trainer in TASK-0181, and kept per commit if over a second", "No git history gives undated pictures, not an error"]
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

## Triggers

- The overview takes visibly longer to open on your-trainer after TASK-0181.
- The smoke run's overview check times out.
