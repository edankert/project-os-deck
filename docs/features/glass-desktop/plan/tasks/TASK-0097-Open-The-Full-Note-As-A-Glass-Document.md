---
type: "[[task]]"
id: TASK-0097
title: "Open the full note as a Glass document"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: []
blocks: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Open the full note as a Glass document

## Definition of Done

- [ ] A card or row immediately opens its identified document frame on the Glass desk and renders the actual sidecar full text as soon as available, below a compact subject header where supported. Explicit loading, retry and close states remain usable; text never waits for motion or a summary click.
- [ ] The document starts at a readable size, preserves the person's chosen size, and scrolls long text inside the pane.
- [ ] Links, checkboxes, currently available action presentation and disabled reasons remain usable with the document; no full-height action column is required in Glass and no new action is introduced.

- [ ] A visible card becomes the document continuously, a row identifies the arriving note, and input never waits for neighbours to animate.
- [ ] Prototype interruptible 250–400 ms opening and record the chosen result; reduced motion opens directly with the same final state.
- [ ] Promote human title, compact ID and state; move full paths into details and keep document text flat and nearly opaque.
- [ ] Dragging text selects it, scrolling stops inside the document and moving by its header preserves size.

## Steps

- [ ] Reuse the existing rendered HTML and pane identity.
- [ ] If an action is currently offered, place its existing presentation with the document and keep its current capability guard.
- [ ] Exercise multiple documents, a view switch, a reload and the served read-only host.

## Notes

ISS-0071's chosen size rule must be implemented in FEAT-0017 or explicitly reconciled here before acceptance.
