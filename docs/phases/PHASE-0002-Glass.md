---
type: "[[phase]]"
id: PHASE-0002
aliases: ["PHASE-0002"]
title: "Glass — the main view, where depth carries priority and a held note brings its neighbourhood to the front"
status: active
order: 2
owner: user:edwin
created: 2026-09-06
updated: 2026-09-08
goal: "Deck opens in Glass: a field where a note's distance says how much it needs you, a view switch re-arranges the same cards, and lifting a note brings what it is joined to into the front band. Built now, on the store, the desk and the addresses PHASE-0001 made, with FEAT-0001's three measurements written down as numbers at the end rather than demanded at the start."
features: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
requirements: []
tasks: ["[[TASK-0029-The-Band-Function]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]]"]
issues: ["[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
depends: ["[[PHASE-0001-Deck]]"]
related: ["[[ADR-0002-Glass-Is-The-Main-View]]", "[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]", "[[PHASE-0001-Deck]]", "[[PHASE-0004-Parity]]", "[[PHASE-0003-Vault]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0012-A-View-Is-A-Description]]"]
tags: [phase, glass, field, deck]
---

# Glass

## Goal

**Glass is the view Deck opens, and distance in it means importance.** A note that needs you is at the front, the view's subject is in the middle, and the quiet majority sits behind you, counted so it cannot be lost. Switching view re-arranges the same notes rather than loading a page, so you watch a note change importance instead of finding it somewhere else. Lifting a note brings everything it links to, and everything that links to it, into the front band while you hold it. That last part is what Edwin said he cannot see in Deck today, and it is the reason this phase opens now.

**Opened 2026-09-07, ahead of parity with the cockpit, by Edwin's decision** ([[ADR-0002-Glass-Is-The-Main-View]]): "I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity." Until that day the phase was gated on [[FEAT-0001-The-Corpus-Has-An-Inside]]'s three measurements. The measurements stay, as exit criteria written as numbers; they are no longer a gate.

Three words mean one thing each. The **field** is every note of the current view, arranged in depth by the view's own rule. The **desk** is what you picked up, the same desk Spread already saves by name; a note lifted in Glass is on it in Spread. A **band** is one of three depths: front, mid, deep.

## Scope

- **[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], the field.** The three bands come from the groups the sidecar already sends and the navigator already draws: the Needs-you group is the front band, the view's own groups the mid band, the suppressed group the deep band behind you. A band function decides, per view, and says so when a band overflows rather than dropping a note into the quiet. A slot geometry deals the bands onto a cylinder, gives the quiet band a shape for a thousand tiles, and treats an obstacle as a sector. The renderer is the review's hybrid: the near bands are real cards drawn with the faces Spread already has, focusable and animated; the quiet band is tiles on one canvas; fog and detail-by-distance, never blur, and no `backdrop-filter` over the moving field. A view switch re-arranges with transform transitions, and a change arriving mid-view is announced, never applied silently. Glass has an address and is the surface Deck opens.
- **[[FEAT-0010-Lifting-A-Note]], the desk in Glass.** A click lifts a note out of the field onto the desk and its slot stays ghosted. While you hold it, its neighbourhood takes the front band, the front plane says what it now means, and the owed count keeps its place. With several notes on the desk, the field marks what is joined to more than one of them. The neighbourhood is read from the context endpoint the adoption table already lists, one request per held note; no whole-graph payload is needed for it.
- **[[FEAT-0001-The-Corpus-Has-An-Inside]], the orbit arrangement.** The link graph as a thirteenth arrangement of the same field, where distance is connectedness, drawn by the same renderer. Its edge payload is a change in the cockpit repository, filed as an issue there when the task starts; nothing else in this phase waits for it.
- **The treatment decision.** [[DES-0001-Nine-Ways-To-Read-The-Record]] draws the orbit three ways. The field itself is built with DES-0002's fog-and-detail look, which the review's measurement settled; [[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]] now decides the orbit arrangement's look only, and Edwin picks.
- **The accessible route.** The navigator beside the field is the primary surface for keyboard and screen reader, present in every arrangement, and every near card is reachable from it. Under reduced motion, arriving at a note is a highlight and a scroll, not nothing.
- **Addresses, extended.** A Glass state, the view, the surface and the focused note, is addressable the way every other Deck state is. Yaw is session state and never in the address.
- **Two hosts.** Glass opens served in Safari on the tablet. On touch, a far card is opened by flying to it first.

## Out of Scope

- **The console as furniture and the carousel of consoles and sessions.** That is [[PHASE-0004-Parity]]; the field's obstacle rule is built here so a console can be placed later.
- **Discharging any verb in the field.** An obligation lives with its subject, and the field is not its subject. Glass navigates to the reader; the reader carries the verbs, and Deck offers none until Parity.
- **Replacing the reader.** Landing opens the note in the document pane that already exists.
- **A cross-repository field.** One sidecar serves one workspace, and the desk is per workspace.
- **A headset.** Glass is a desktop surface with mouse and keyboard, and a tablet surface with touch.
- **`backdrop-filter` over a moving field**, ruled out by the DES-0002 review.
- **A light-mode Glass**, which no design has drawn.

## Exit Criteria

- [ ] Deck opens a workspace in Glass, the owed notes are in front, the view's subject is in the middle, and the quiet band is behind you with its count on screen. The walk is [[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]].
- [ ] Switching view re-arranges the same cards, and no note is dropped into the quiet band because a nearer band was full: overflow is stated on screen.
- [ ] Lifting a note brings its neighbourhood into the front band, the front plane says what it now means, and with two or more notes on the desk the field marks what they share. The walk is [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]].
- [ ] A note lifted in Glass is on the same desk in Spread, and a card dragged in Spread is on the desk in Glass.
- [ ] Every card visible in a Glass arrangement can be reached and opened from the navigator using only the keyboard.
- [ ] A Glass address pasted back into Deck restores the same view, the same surface and the same focused note.
- [ ] Glass opens in Safari on the tablet served by Deck's host, with no `backdrop-filter` over the moving field.
- [ ] The frame time while turning is measured on the fleet's largest workspace in a foreground window and written as a number in [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], with the pooled-versus-canvas choice recorded beside it. If the number fails on a laptop, Spread returns to being the default and this note says so.
- [ ] [[FEAT-0001-The-Corpus-Has-An-Inside]]'s two other measurements are written as numbers: the size and time of the one request that returns the whole edge list, and the position drift when a note is added and the layout recomputed. A planted orphan and a single-edge cluster are visible in the orbit arrangement ([[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]). A measurement that fails costs the orbit arrangement, not the field, and is recorded here as an outcome.
- [ ] Edwin has chosen the orbit arrangement's treatment, and [[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]] records the choice and its cost.

## Where this stands

**2026-09-08: Glass starts after the description feature, and [[TASK-0029-The-Band-Function]] is now that feature's table rather than a module of its own.** An architecture review before the build asked whether Deck's vocabulary was large enough to carry Glass ([[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]), and Edwin reopened [[PHASE-0001-Deck]] the same day to widen it. Three things land there first: Deck keeps its own index of the workspace's notes ([[FEAT-0011-Decks-Own-Index]]), a view becomes a description rather than three fields of code ([[FEAT-0012-A-View-Is-A-Description]], [[ADR-0004-A-View-Is-A-Description]]), and Deck writes for the first time ([[FEAT-0013-The-First-Write]], [[ADR-0003-Deck-Writes-Through-The-Shell]]). The address grammar also gains the `surface` key [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] needs, in [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]].

**What this phase gains for the wait.** [[TASK-0029-The-Band-Function]] is amended: its table moves into the `band` section of every view description and the function that applies it is written in [[TASK-0044-Band-And-Face-Come-From-The-Description]], so the navigator's folding, Spread's grouping and Glass's banding are one rule instead of three. Its acceptance criteria are unchanged. The `surfaces` list [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] reads is the description's, so a view no design has drawn in Glass is not offered there. Nothing else in this phase changes: the features, the other tasks and the exit criteria all stand.

**2026-09-07: opened, planned, nothing built.** Three features, fourteen tasks and three acceptance walks. The order inside the phase is the band function and the slot geometry first, because they are pure functions the renderer is written against; the renderer; the view switch and the address; then lifting, the neighbourhood and what-these-share; the orbit arrangement last, behind an issue in the cockpit repository for its payload. The measurement task closes the phase.

**What the DES-0002 review said must change before a build, and where each lands.** The founding count is six views with a Needs-you group, not eleven: the band function says what each of Deck's seven views does. The degree-of-interest function is written down as one table: [[TASK-0029-The-Band-Function]]. The state has an address before a renderer exists: [[TASK-0033-Glass-Is-Addressed-And-Opened-First]], on the grammar PHASE-0001 built. The bench is replaced by a measurement on the real thing in a foreground window: [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]. Blur over the field is out and `will-change` is scoped: [[TASK-0031-The-Field-Renders-And-Turns]]. The list panel is the accessible primary surface: the navigator, already built, in TASK-0033. The geometry model is fixed and overflow is never silent: [[TASK-0030-The-Slot-Geometry]] and TASK-0029.

## Notes

**Depends on [[PHASE-0001-Deck]], and as of 2026-09-08 on more of it.** That phase reopened to add Deck's own index, view descriptions and the first write, and Glass now waits on [[FEAT-0012-A-View-Is-A-Description]] before it starts. Glass is a client of the store, the desk, the navigator and the address grammar that phase built, and it is served to the tablet by the two-host rule that phase established. PHASE-0001's remaining walks were made on 2026-09-07 and it closes through the ordinary close-out; its seventh criterion moved to [[PHASE-0004-Parity]] with [[ADR-0002-Glass-Is-The-Main-View]].

**FEAT-0001 was the gate and is now an arrangement.** Its note was written on 2026-09-05 for the cockpit, rewritten on 2026-09-06 for Deck, and on 2026-09-07 rewritten again as the orbit arrangement of FEAT-0009's field. Its measurements are the last three exit criteria above.

**The sidecar is not changed for Deck.** The field reads the nav payload Deck already reads, and the neighbourhood reads the context endpoint the adoption table already lists. The one new endpoint, the whole edge list, is cockpit work filed there.

**Order.** Deck, Glass, Parity, Vault, decided by Edwin on 2026-09-07 ([[ADR-0002-Glass-Is-The-Main-View]]), revising the order of 2026-09-06 ([[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 8, item 2), which had no parity phase and put Vault third.
