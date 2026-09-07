---
type: "[[phase]]"
id: PHASE-0003
aliases: ["PHASE-0003"]
title: "Vault — Deck opens an Obsidian vault and shows what the vault already declares"
status: planned
order: 4
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
goal: "Deck opens an Obsidian vault as a workspace and shows what that vault already carries — its note types, its saved views, its boards and its statuses — reading everything and writing none of Obsidian's files."
features: []
requirements: []
tasks: []
issues: []
depends: ["[[PHASE-0001-Deck]]"]
related: ["[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[ADR-0002-Glass-Is-The-Main-View]]"]
tags: [phase, vault, obsidian, profile]
---

# Vault

## Goal

**Point Deck at an Obsidian vault and the vault's own structure appears.** The test case is Edwin's `~/Notes`, and inside it the Comics worldbuilding project: 407 notes, 137 of them under `03 Projects/Comics`, with characters, pages, panels and locations that the vault already declares in its templates, its property definitions, its saved views and four canvas files.

Two terms are used throughout. A **profile** is what Deck needs to know to serve a workspace that is not a project-os repository: which note types exist, how notes nest, which statuses apply and how they map to bands, which views to offer, and what a card's face shows. A **base** is an Obsidian `.base` file — the vault's own definition of a filtered, sorted, card-shaped view.

## Scope

- **The profile, detected before selected.** The vault says what it is: `__templates__/Novel/*.md` declare each type's fields, `Properties.md` declares field order and which field is the parent, and `__bases__/Comic/*.base` declare the views. A profile derived from those stays true when the vault changes; a profile a person selects from a menu is a second copy that drifts. Selection is the fallback when detection finds nothing.
- **Discovery.** The shell finds a workspace by `SNAPSHOT.yaml` today. A vault is found by its `.obsidian` directory instead, added as a second marker.
- **The workspace is the vault, and the project is a folder inside it.** Obsidian's links resolve vault-wide, so the rail shows `Notes` and Comics is chosen inside it.
- **Bases as views.** Each base view becomes a Deck view, with the vault's own filter, sort, property order and card image. The supported subset of the Bases language is named in a note in this repository, and it starts as the union of what the vault's own base files use.
- **Canvases as boards.** The four `.canvas` files under the Comics characters open as Spread boards, read-only.
- **The saved Obsidian layout as a starting Spread.** `.obsidian/workspace.json` holds the open notes, the last-opened files and which sidebars were shown; Deck reads it once to lay out the first desk and never writes it.
- **Statuses banded.** The vault's `draft`, `review`, `final` and `cancelled` map to the status bands. Three of the four already do; `final` is not in the vocabulary yet.
- **What needs attention in a world.** Deferred to this phase on purpose. Candidates already visible in the index: a character a story links to that has no note, a page with no number under a chapter that orders by number, a chapter whose pages are all final while the chapter is still draft. Until this is decided, a vault's front plane is empty and Deck is Obsidian with a terminal.
- **Verbs from the profile.** A vault profile supplies its own verb table — draft to review to final for the Novel types — behind the sidecar's existing guards, which do not change.

## Out of Scope

- **Writing any file Obsidian owns.** Deck reads `.base`, `.canvas` and `workspace.json` and writes none of them. Writing JSON Canvas waits for a use case that asks for it.
- **A second Markdown renderer.** Deck renders notes the way the sidecar already renders them.
- **Reproducing Deck's views inside Obsidian.** The goal is a separate view on top of a vault, not a round trip.
- **The whole Bases language.** It is Obsidian's and still moving. A view using anything outside the named subset says so; it never shows an empty list and calls that an answer.
- **Fixing the cockpit's indexer here.** The list-valued `type:` bug is the cockpit's and is fixed there.

## Exit Criteria

- [ ] `~/Notes` opens in Deck as a workspace, discovered by its `.obsidian` directory.
- [ ] The Comics notes arrive typed: characters, pages, panels, locations and chapters appear under their own types, and the count matches the 43 typed Comics notes measured on 2026-09-06.
- [ ] The four Comic base views — Characters, Chapters, Locations, Pages — appear as Deck views, each with the base's own filter, sort and card image.
- [ ] A base using anything outside the supported subset renders as "not supported" and names the expression it could not read.
- [ ] The supported Bases subset is named in a note in this repository.
- [ ] The four Comics `.canvas` files open as Spread boards, and a session of browsing the vault leaves `git status` in `~/Notes` unchanged.
- [ ] What needs attention in a world is decided and written down, and the vault's front plane shows it.

## Notes

**One cockpit bug blocks the second criterion.** The sidecar's indexer accepts a `type:` written as a string and drops one written as a YAML list. Obsidian writes list-valued properties as YAML lists, and nearly every real Comics note does, so 99 of the vault's notes reach Deck untyped. That is `ISS-0279` in project-os-cockpit ([[project-os-cockpit#ISS-0279]]), where it sits at triage, and it joins this phase when the phase opens. It is one function; it is not filed here because Deck does not own the indexer. The cross-repository reference is deliberately in prose and in `related:` only, never in a relationship field the validator checks.

**Depends on [[PHASE-0001-Deck]], not on [[PHASE-0002-Glass]].** The seam this phase needs is the view provider the Deck phase builds into the renderer; this phase adds the provider that reads a vault's `.base` files. Vault support is Deck's, not the cockpit's, so the question of what Deck reads itself and what it still takes from the sidecar's index is settled when this phase opens. Nothing here requires the field. The stated order put Vault third on 2026-09-06 and fourth on 2026-09-07, when Edwin decided Glass is the main view and a parity phase, [[PHASE-0004-Parity]], comes before this one ([[ADR-0002-Glass-Is-The-Main-View]]). The place is Edwin's decision, not a technical constraint; grooming can bring it forward if a vault becomes the more valuable demonstration.

**Measurements this phase is judged against** were taken on 2026-09-06 and are recorded in [[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 5: 407 notes in the vault, 90 typed as a string, 99 typed as a list, 218 untyped, and four Library groups returned for the whole vault.
