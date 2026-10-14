---
type: "[[design]]"
id: DES-0005
aliases: ["DES-0005"]
title: "The overview is drawn, not written: the wheel of phases and the six screens behind it, including where a design, an acceptance test and a ticket are accepted, as diagrams and images"
status: draft
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'I still don't like the glass solution, it is too text heavy and does not look cool or minority report like. Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
asset: ""
implements: ["[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]", "[[PHASE-0005-Overview]]"]
supersedes: ""
superseded_by: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0002-The-Glass-Cockpit]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
tags: [design, overview, glass, acceptance]
---

# The overview is drawn, not written

**Status: a brief, not yet a design.** This note says what each screen must show. The design lane ([[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]) adds the prototype and one plate per screen, then moves it to `proposed` for Edwin.

## Problem

**The Glass screens in DES-0004 show tickets as cards with titles, so reading them means reading text.** Plate 6 shows 13 cards with truncated titles and an exit-criteria card of eight sentences. Plate 7 is a document, a list of features and a table of tests. Edwin's verdict on 2026-10-14: too text heavy, and nothing like Minority Report.

DES-0004's wheel works the other way. A glance at it says which phase is green, which has violet retests and where the amber is, and it carries no sentence at all. This design extends that way of drawing to every screen, including three screens nobody has drawn yet: accepting a design, running an acceptance test, and accepting a ticket.

## The look

The six rules are in [[PHASE-0005-Overview]], "The look", and every plate is checked against them. In short: at most 60 words at rest; every number is also a mark; state is colour and place; a dark field with depth, glowing marks, translucent panels and animated transitions; every screen has an address and a list twin; checked on Deck and on your-trainer.

**Colours.** The six state colours are DES-0004's tokens (closed, in progress, failed, owed again, open, dropped), tuned for a dark field. A mark that needs a person glows. A finished mark is drawn dimmer and smaller, never removed.

**Text that remains.** Phase numbers and short names on the wheel; a ticket id inside its callout; the two words on a verdict control. Everything else is on hover, on focus, or in the list twin.

## The screens

Each screen below lists what is drawn, what moves, the data it reads, and the empty and busy cases. Data named with `model.` comes from the overview model ([[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]); `/api/...` is the cockpit's sidecar.

### S1 Wheel

- **Drawn.** DES-0004's RINGS: a sector per phase still to finish, clockwise from the top in phase order; a ring per ticket type, fewest in the middle; one wedge per ticket, closed first. The core holds decisions, designs, risks and tickets with no phase. Finished phases are discs on a shelf arc below the wheel, each with a violet badge for its owed-again tests. The backlog is a tray arc above it.
- **Each sector's label** is the phase number and short name, and a progress arc drawn outside the sector (closed over defined). The fraction appears on hover.
- **Moves.** Hovering a sector lifts it toward the viewer and dims the rest. Clicking flies into S2 with the sector's wedges becoming S2's glyphs.
- **Reads.** `model.phases`, `model.shelf`, `model.backlog`, `model.core`.
- **Empty.** A phase with only exit criteria is an empty track (Vault today). **Busy.** your-trainer: 10 sectors, 16 discs, 968 tickets in the core.

### S2 Phase

- **Drawn.** The phase's web at the centre: one corner per ticket type, the defined count in amber and the closed count in green on one square-root scale. Around it, the exit criteria as a ring of segments, lit when ticked. Behind it, the open tickets as glyphs in three depth bands: failed and owed again in front and glowing, in progress and open in the middle, closed far back as dust.
- **Glyph shape is the ticket type** (for example a diamond for a requirement, a hexagon for a feature, a dot for a task, a square for a test, a triangle for an issue). The design lane fixes the set.
- **Moves.** Hovering a glyph shows its id and title in a callout. Clicking one opens S3. Hovering an exit-criterion segment shows its sentence.
- **Reads.** `model.phase(id)`; exit criteria from the phase note.

### S3 Ticket

- **Drawn.** A lifecycle track for the ticket's type (for a feature: backlog, planned, doing, review, done) with a marker on its current status and dimmed stops for statuses it skipped. Around it, its neighbours as a radial graph: parent above, children below, covering tests and linked notes to the sides, each node coloured by state.
- **For a feature, the gate of S7 is drawn small under the track**, so whether it is ready is visible before anyone opens S7.
- **Moves.** Clicking a neighbour re-centres on it. The note's text opens in the reader only on request.
- **Reads.** Deck's index for links and status.

### S4 Re-phase

- **Drawn.** The core's tickets as particles. A suggested ticket has a faint line to the sector it would join, coloured by how the suggestion was made (from links, from dates). Tickets nobody can place stay in the core and pulse slowly.
- **Moves.** Accepting a group sends its particles along their lines into the sector. In this phase that move is on screen only; writing `phase:` needs a sidecar action the cockpit has not built.
- **Reads.** `model.suggestions`.

### S5 Design acceptance

- **Drawn.** The design's plates as large images, one in front and the others as a fan behind it. Under them, a strip of revisions as dots on a line. Review comments as pins on the plate they name, coloured by whether they were answered. The design's status as a lamp.
- **Accept and Decline** are two large controls, offered only to a person and only while the design is `proposed`. Decline asks for a reason.
- **Reads.** The design note and the images in its `__attachments__/`. **Writes.** `/api/notes/decide`.
- **Empty.** A design with no pictures shows an empty frame and the words "nothing to look at", which is the validator's DESIGN-ASSET rule made visible.

### S6 Acceptance test

- **Drawn.** One ring per platform. Each ring has an arc per section of the release test, and a bead per check coloured by result (passed, failed, not run, one of the other five results). The centre shows the release and a progress arc per platform.
- **A check opens as a before-and-after image pair** when the release test has captures for its screen (your-trainer's gallery has them), with the expected result as one line under the pictures. Pass and Fail are one click each; the other results are behind More and need a reason, as in the cockpit.
- **Reads.** `/api/cockpit/release-test`, `/api/cockpit/acceptance`. **Writes.** `/api/notes/mark-check`.
- **Busy.** your-trainer REL-0017 on 2026-10-14: 12 sections; 440 printed checks on Android with 29 passed, 964 on iOS with none.
- **Empty.** Deck has no release yet, so S6 shows the platforms with empty rings.

### S7 Ticket acceptance

- **Drawn.** A gate of five lamps in a row, each a small diagram of its own count: requirements met (ticked criteria over all), tasks done (a ring of task dots), automated tests passing, acceptance tests passed (a bead per check), independent reviews recorded (one lamp per round, two reviewers each). A lamp lights only when its count is complete.
- **Accept** is offered to a person when every lamp is lit. **Send back** is always offered and asks for a reason.
- **Reads.** `/api/cockpit/acceptance`, `/api/cockpit/obligations`, Deck's index. **Writes.** `/api/notes/transition`, and `/api/notes/acceptance-run` for a feature that opted into the acceptance gate.

## What the design lane delivers

1. An interactive prototype, `DES-0005-the-overview.html`, beside this note. It needs no network, draws every screen from the real tickets DES-0004 measured, refreshed for Deck on the day it is made, and switches between Deck and your-trainer.
2. One plate per screen in `__attachments__/`, captured from the prototype on both workspaces, each with a caption.
3. An answer proposed for each of DES-0004's open questions, for Edwin to accept or change.
4. A word count per plate at rest, measured, against the limit of 60.

## Verification

- The prototype and the plates are checked against the six rules of the look, and the measured word counts are written next to each plate.
- Edwin accepts or declines the design. That verdict is his, recorded through the cockpit's Accept on this note.

## Out of scope

- The card field, bands, desks and scenes of PHASE-0002.
- The tablet layout beyond a read-only wheel.

## Revisions

- 2026-10-14 — written as the brief for PHASE-0005, from Edwin's request the same day.

## Review

<Comments land here, each naming what it is about in its own words. Verdicts go in the frontmatter, transcribed from a review that actually happened — never anticipated.>
