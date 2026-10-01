---
type: "[[feature]]"
id: FEAT-0022
title: "Collections and documents can be arranged and restored"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
goal: "A person changes one exact collection between a stack, table and cards, then previews and reverses useful arrangements without losing note identity or reading size."
requirements: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]"]
tasks: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]", "[[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0003-Collections-And-Documents-On-Glass]]"
related: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Collections and documents can be arranged and restored

## Goal

A person can turn a live collection into a compact stack, a readable table or an arrangement of its cards. Read, Compare and Show related make an occupied desk useful without manually moving every object.

## Scope

The feature follows FEAT-0020's collection and full-document interaction. It operates on the current view's collection and current desk. It adds presentation changes, deliberate arrangement commands, a preview, a labelled undo, and relationship emphasis over the existing source-backed connections.

- **Stack** shows the query name, exact count and filters. Opening it restores the table or cards presentation that the person selected.
- **Table** supplies the complete accessible rows and preserves the selected note and scroll anchor.
- **Cards** arranges those same member identities in the wider workspace. It does not promise every card fits on screen. A count and the exact table remain available; drawing or animation may be limited to visible objects, membership may not.
- **Read** places one selected full document with the collection accessible. **Compare** keeps two selected full documents readable together. **Show related** places the selected subject with its connected notes and an exact linked list.
- A preview names the affected objects and intended positions. Apply commits that layout. Cancel leaves it unchanged. A labelled Undo arrangement restores the previous layout independently of text editing and project actions.
- A relation emphasis control can highlight known requirements, tests or other supplied relationship types. It reports the emphasized subset and keeps the full neighbour list accessible. Unsupported semantics use generic direction; an emphasis does not change the graph.

Multiple independent collections, persistent arrangement presets, named scenes and camera persistence are outside this feature. Existing per-view desk storage holds the applied layout; preview and the last undo are per-window session state. FEAT-0023 owns named restoration and richer handoffs. Structured evidence objects belong to FEAT-0021 in Parity.

## Acceptance

- Stack, table and cards identify exactly the same current member set and count. Presentation changes preserve filters, selected identity and the table's scroll anchor.
- A note shared by a collection, an open document and multiple relationships has one spatial object on the desk. A table reference can remain without becoming a duplicate card.
- Read, Compare and Show related have keyboard-operable previews, apply and cancel. Compare displays two full documents at their chosen reading size.
- Applying an arrangement preserves text size, current reading position and chosen document dimensions. A narrow viewport keeps objects reachable through navigation or the wider workspace; it never shrinks text to fit.
- Undo restores the previous arrangement without undoing note edits or project actions. Stale previews or undo records announce incompatible changed objects before applying anything.
- Relationship emphasis names its subset while the exact full neighbour list remains available. Clearing it restores the previous emphasis without changing edges or membership.
- High populations remain entirely reachable with bounded visible drawing and motion. Reduced motion, scroll boundaries, visible keyboard focus and read-only tablet behavior match FEAT-0020.

## Verification

[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] walks the collection forms, arrangements, recovery and current-result restoration. TASK-0103 records foreground measurements and before/after user observations. No application run or acceptance result is claimed by this plan.

## Impact analysis

Checked REQ-0001/0002 and FEAT-0020 for exact counts, chosen size, immediate reading and input. REQ-0003 adds forms and arrangements without relaxing those constraints. FEAT-0015 keeps one desk per view and FEAT-0016 keeps wheel input spatial outside objects. FEAT-0017's old single-focus dock rule is superseded for Glass by FEAT-0020's multiple readable documents. Compare builds on that capability. TASK-0102 owns the arrangement preview, application and undo; TASK-0104 supplies the identity and geometry prerequisite.

Applying layout is explicit. It does not reclassify a note's priority, modify its status or change the band's source rules in FEAT-0018. Exact list access remains distinct from ISS-0086's placement issue. No native migration, cockpit contract or new write authority is required. Camera persistence remains outside scope, so the current session-state contract stands.

## Risk scan

RISK-0007 covers saved presentation compatibility and duplicate identities after restoration. TASK-0101 supplies the mitigation. Animated expanded collections can consume the phase's frame budget; TASK-0103 measures full population reachability and foreground cost without hiding missing members. No external dependency, new required environment variable or security exposure is introduced.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Requirement: [[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]
- Tasks: [[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]], [[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]], [[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]
- Acceptance: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
