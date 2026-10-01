---
type: "[[task]]"
id: TASK-0096
title: "Draw and operate the collection in Glass"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
blocks: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Draw and operate the collection in Glass

## Definition of Done

- [ ] The derived collection is readable in Glass's main rectangle and can be moved, resized and collapsed without a permanent navigator column.
- [ ] Group folds, search, filters, counts, row opening and keyboard movement work in the object, including screen-reader names and reduced motion.
- [ ] A narrow window and served tablet keep a usable route to the same rows.

- [ ] The collapsed header names the query, exact count and active filters; expanding restores its size, selection and scroll anchor.
- [ ] Wheel input stays inside collection scrolling at both boundaries; dragging a header moves it while row text and controls keep their own behavior.
- [ ] Visible keyboard focus and Return to collection reveal a covered or off-screen object; local Escape is consumed once.
- [ ] Apply the design's title hierarchy, flat readable text, quiet materials and absence of blur over the moving field.

## Steps

- [ ] Reuse the current navigator's row and keyboard behavior on the stage.
- [ ] Integrate collection placement with the Glass field and desk geometry.
- [ ] Add focused checks for pointer, keyboard and narrow-window operation.

## Notes

The fixed navigator is replaced as the Glass list placement, not as the source of list behavior.
