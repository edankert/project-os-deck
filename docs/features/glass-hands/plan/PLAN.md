---
type: "[[plan]]"
title: "Plan — the hands"
status: done
owner: user:edwin
created: 2026-09-10
updated: 2026-09-11
source: ["[[FEAT-0014-The-Hands]]"]
implements: ["[[FEAT-0014-The-Hands]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
---

# Plan — the hands

## Delivery sequence

1. **[[TASK-0057-The-Served-Page-Follows-The-Store]]** — Deck's host gains two read routes, the served page subscribes to them, and a tablet shows the desk the Mac holds. Touches the host and the served page only, so it can start first and run beside the field.
2. **[[TASK-0053-Pull-Forward-And-Push-Behind]]** — A card is pulled into the front band or pushed behind by a short drag, for the session; the band function reads two new inputs; the label and the compass count what a hand placed; an owed note cannot be pushed out; one verb lets go. The first thing a person arranges.
3. **[[TASK-0054-A-Held-Note-Is-A-Pane]]** — A held note is moved, resized and stacked on the front plane, with its place and size in the desk record Spread already saves.
4. **[[TASK-0056-Reach]]** — Hovering, or press-and-hold on touch, draws wires to a card's neighbours and counts those behind you, on the context read TASK-0036 added.
5. **[[TASK-0055-Throw-To-A-Screen]]** — A drag that leaves the field toward another window lands the note there, with a target strip, a flight, a keyboard verb and the tablet as a target. Last, because it needs panes to throw and a tablet that follows.

## Dependencies

- **Hard:** TASK-0053 needs [[TASK-0031-The-Field-Renders-And-Turns]], because it drags a card the renderer draws, and [[TASK-0029-The-Band-Function]], whose reserved columns it fills. TASK-0054 needs [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], because it moves a held note. TASK-0056 needs [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], whose context read and cache it reuses. TASK-0055 needs TASK-0054 and TASK-0057, and the window book from [[FEAT-0004-Windows-On-Any-Screen]], which is built.
- **Parallel:** TASK-0057 depends on nothing in this phase and extends [[FEAT-0008-One-Renderer-Two-Hosts]]; it is placed here because the throw is what needs it.
- **From outside this phase:** the store, the window book, the per-display placement, the desk record with its positions and the read-only host are all [[PHASE-0001-Deck]]'s and are built.

## Open questions

- **The pull and push thresholds, and the throw's edge and velocity.** Numbers are chosen in the tasks and written into the notes, not invented here. They are inputs to the gesture recogniser, not constants inside it, so the walk can move them.
- **Whether the served page's own view choice stays local.** TASK-0057 decides that a tablet browses on its own and shares the desk, with a follow toggle for the shell's focus. If the walk finds a person expects the tablet to mirror the Mac by default, the toggle's default flips and the note says so.
- **Whether a pane's size belongs in the desk record.** The desk record carries `x` and `y` today. TASK-0054 adds an optional size; Spread ignores it until it wants it. If that turns out to be a change Spread must react to, it is an issue against [[FEAT-0005-Spread-Cards-On-A-Desk]] rather than a widening here.
