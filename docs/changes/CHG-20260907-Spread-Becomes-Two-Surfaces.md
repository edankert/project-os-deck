---
type: "[[change]]"
id: CHG-20260907-Spread-Becomes-Two-Surfaces
aliases: ["CHG-20260907-Spread-Becomes-Two-Surfaces"]
title: "Spread becomes two surfaces: a navigator that keeps the sidecar's groups, and a desk holding the notes a person chose and arranged"
status: merged
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[PHASE-0001-Deck]]"]
commit: ""
pr: ""
impacts: ["desktop/src/renderer/", "desktop/src/shared/", "desktop/src/main/", "desktop/tests/"]
issues: ["[[ISS-0003-A-Served-Page-Cannot-Open-A-Workspace-The-Shell-Has-Not]]", "[[ISS-0004-Two-Decks-Bind-The-Same-Port]]"]
features: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]", "[[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]"]
---

# Spread becomes two surfaces

## Summary

**Deck's window now has a list and a desk, and they are different things.** The navigator down the left lists what the current view holds, in the groups project-os-cockpit's sidecar already sends: what needs a person first, then phases holding their features and tasks, or severity bands, or test tiers, with finished work folded away behind one row. The desk in the middle starts empty. A note reaches it because somebody clicked it, and it sits where somebody dragged it.

Before today every note in a view was a card, and the cards sat wherever the flow layout put them. Your Trainer's Issues view was 409 identical cards in one grid, where the cockpit shows the 34 that need triage on top and folds 309 finished ones away. Nothing could be moved, so "save this desk" saved whatever the layout had done that morning, and Deck's own state file held no saved desks after a day of use. That is what [[REFERENCE-PHASE-0001-REVIEW]] found on 2026-09-07 and what Edwin asked to have fixed.

## Impact

- **A view is drawn as groups, not as a list.** The sidecar's answer already carries them, along with what each note holds, what is owed on it and the verb for that. All of it is kept now. A group of finished work arrives folded; a note holding a hundred tasks arrives closed and opens on its own control. What a person unfolds is remembered.
- **Clicking a note in the navigator puts a card on the desk and opens the note in the reader.** Clicking it again, or the control on the card, takes it off. Changing view repaints the navigator and leaves the desk alone, so one desk can hold notes from several views.
- **Cards are dragged with the pointer** and stay where they are released. A position belongs to the note, travels with the desk, and is pulled back on screen when a desk saved on a large monitor is opened on a laptop.
- **The renderer owns search.** A box above the navigator narrows it as you type, matching on note id and title, with filters for status and type beside it. Matching runs over the whole model rather than over the drawn elements, which is why a note the card pool never drew is still found. The query lives in the store, so a second window narrows with the first.
- **A card shows what its note is.** A phase or a feature shows how much of its work is finished, an issue shows its severity, a test shows its last walk and whether that has gone stale, and a type Deck has never heard of still draws with its id, title, type and status band. One pooled element draws every face.
- **Popping out asks what the window should carry.** The answer is one of three panels: what needs you, the focused note, or the desk. The panel is part of the address, so the window is addressable, and it is remembered, so a restart reopens it carrying the same thing on the display it was left on. A window carrying what needs you asks the sidecar again every thirty seconds; it is the only window that polls.

## Breaking changes

- **`panel=` in an address now takes one of three values**, `needs-you`, `note` or `desk`. Any other value is refused. An address written before today with `panel=status` will not open, which is deliberate: a window carrying something other than what its address names is the silent fallback this grammar exists to prevent.
- **The `save-desk` action names a desk rather than carrying one.** What is on the desk is state now, so saving reads it from the store. Anything dispatching `save-desk` with a `desk` object saves nothing.
- **`cardsFromNav` returns the full card model**, with the group, the children, the owed verb, the severity and the rest. `groupsFromNav` is the one to call for a view, and `flattenGroups` is for a lookup by id.
- **The desk state is new and unwritten in older state files.** A file written by yesterday's Deck opens with an empty desk rather than an error, and saved desks written yesterday still open.

## Two defects fixed

- **[[ISS-0003-A-Served-Page-Cannot-Open-A-Workspace-The-Shell-Has-Not]].** Deck's own host now says, for each workspace it lists, whether a sidecar is answering for it. A page served to a tablet draws the others disabled and says to open them in the shell first, instead of offering them and then reporting that the sidecar answered 503.
- **[[ISS-0004-Two-Decks-Bind-The-Same-Port]].** The free-port probe asks whether anything answers a connection on a port before it tries to bind it. A bind on loopback succeeds while another process holds the same port on every interface, which is how two Decks came to listen on 7300 at once.

## Verification

- **Six new automated suites**, and 143 checks across the desktop suites in total: [[TST-0016-The-Groups-The-Sidecar-Sends-Are-Drawn]], [[TST-0017-Search-And-Filter-Narrow-The-Navigator]], [[TST-0018-A-Card-Shows-What-Its-Note-Is]], [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], [[TST-0020-A-Popped-Out-Window-Carries-One-Panel]] and [[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]].
- **The smoke run drives the real application**, against this repository through the sidecar the cockpit already had running. It checks that the navigator drew the sidecar's groups, that the desk starts empty, that a click puts one card on it, that a drag moves the card and a reload finds it where it was left, that a search matching nothing empties the list and clearing it restores the list, and that each of the three panels carries its own thing and nothing else.
- **Two acceptance walks were reworded**, because they described the interface that existed rather than the one that was wanted. [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]] compares group headings and their notes in the navigator instead of watching the desk fill. [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]] names a status window again, which is what its exit criterion asked for before it was amended down on 2026-09-06.
- **What no machine can settle is [[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]**, the phase's seventh exit criterion: Edwin does one real task in Deck instead of the cockpit and records which he would rather have used.

## Adoption

Three rows of [[REFERENCE-COCKPIT-ADOPTION]] moved to `adopted`: `shell.nav.needs-you`, `shell.nav.hide-completed` and `shell.stage.find`. The cockpit's own register was not re-read today, so no new capability was looked for; that re-read is owed on the day this phase closes, which its sixth exit criterion asks for.
