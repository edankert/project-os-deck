---
type: "[[plan]]"
title: "Plan — the Glass field"
status: draft
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
implements: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
---

# Plan — the Glass field

## Delivery sequence

1. **[[TASK-0029-The-Band-Function]]** — One table decides which band a note lands in, per view, from the groups the sidecar already sends. Overflow produces a count, never a silent demotion. A pure function, tested without Electron.
2. **[[TASK-0030-The-Slot-Geometry]]** — The bands become slots on a cylinder: twelve in front, forty in the middle, and a shape for a thousand quiet tiles behind. An obstacle is a sector of the cylinder. A pure function, tested without Electron.
3. **[[TASK-0031-The-Field-Renders-And-Turns]]** — The near bands are real elements bound to their notes, the quiet band is one canvas, distance is fog and less detail, and a real pointer can hit a card. This is the first task a person can look at.
4. **[[TASK-0032-A-View-Switch-Re-Arranges]]** — Switching view moves the same cards. A change that arrives mid-view is announced and applied on the person's action.
5. **[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]** — The surface enters the address, Glass is what opens by default, and the navigator beside the field is the keyboard route.
6. **[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]** — The frame time while turning on Your Trainer, in a foreground window, written into the feature note as numbers, with the pooled-versus-canvas choice recorded beside them.

## Dependencies

- **Hard:** TASK-0029 comes first, because everything else needs to know which band a note is in. TASK-0030 comes next. TASK-0031 depends on both, because it draws what they decide. TASK-0032 depends on TASK-0031, because it animates elements that must already exist. TASK-0034 comes last, because it measures the finished renderer.
- **Parallel:** TASK-0033 needs only the address grammar and the navigator, both of which exist, so it can be built beside TASK-0031.
- **Soft:** [[FEAT-0010-Lifting-A-Note]] lifts a note out of this field onto the desk, so its first task waits for TASK-0031. [[FEAT-0001-The-Corpus-Has-An-Inside]] draws its orbit as an arrangement of this field, so its renderer task waits for TASK-0031 too.
- **From outside this phase:** the store, the address grammar, the navigator, the card faces and the read-only host are all [[PHASE-0001-Deck]]'s and are built.

## Open questions

- **Whether the quiet band is a texture or a stack past a thousand tiles** was an open design question in [[REFERENCE-DES-0002-REVIEW]]. It is settled by TASK-0030's geometry, which must give a thousand tiles a shape before TASK-0031 draws them; it is not left to the renderer.
- **Whether the near bands are pooled or bound** is settled by the hybrid the review proposed: near cards are bound to their notes and never recycled, and the quiet band, which is the only band with a count worth pooling, is drawn on a canvas instead. TASK-0034 records whether the numbers bear that out.
