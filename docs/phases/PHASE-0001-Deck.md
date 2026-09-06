---
type: "[[phase]]"
id: PHASE-0001
aliases: ["PHASE-0001"]
title: "Deck — one store, windows on any screen, and Spread as the first view"
status: planned
order: 1
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
goal: "Deck becomes a running application beside the cockpit: one Electron shell whose state lives in the main process, notes shown as cards a person can move onto any screen, and the same renderer served read-only from the sidecar for a tablet."
features: []
requirements: []
tasks: []
issues: []
depends: []
related: ["[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]"]
tags: [phase, deck, spread, shell]
---

# Deck

## Goal

**This phase makes Deck a thing you can open.** Today the repository holds two designs, one feature and an architecture note, and no code. At the end of this phase a person launches Deck, sees this repository's notes as cards, drags a card's window onto a second monitor, and picks the same notes up on a tablet over the LAN.

Three words are used throughout and mean one thing each. **Deck** is the application this repository builds. **Spread** is its first view: notes as cards laid out across windows and screens, named after a comic spread. The **sidecar** is project-os-cockpit's Python service, which indexes the notes and answers questions about them; Deck consumes it from `../project-os-cockpit/` and never vendors a copy.

## Scope

- **The Electron shell.** Deck's own renderer, started fresh, sharing the main process concerns the cockpit already has: workspace discovery, terminals, windows and fleet health. Where Deck needs a piece of the cockpit's renderer it lifts that piece into a shared module without changing how the cockpit behaves.
- **The store.** One record of current workspace, focused note and current view, held in the Electron main process, with every window subscribing to it. Windows read from the store rather than each reading `localStorage` once, which is why two cockpit windows today never see each other change.
- **Windows.** Pop-out windows for the panels that already refresh on their own, window bounds remembered per window and placed by display, one focus window that owns navigation, and satellite windows that show state and never steal focus.
- **Spread.** Cards on a desk, driven by a list, several notes visible at once, several consoles, and a console the person can move. A **desk** is one arrangement of cards, saved and restorable.
- **Addresses.** Every reachable Deck state has one: a view, a desk, a focused note. A layout is then a list of addresses plus geometry, which is what makes it serialisable and drivable from the command line.
- **Views come from a provider, not from a fixed list of buttons.** The renderer asks a view provider which views the current workspace has and draws whatever comes back. The only provider built in this phase is the project-os one, and it offers the same views the cockpit's navigator does. The seam exists so that the Vault phase can add a provider that reads a vault's `.base` files without touching the renderer. The sidecar is not asked to change: Edwin decided on 2026-09-06 that the list of views is Deck's concern, revising the architecture note's proposal that the sidecar answer the question.
- **Two hosts, one renderer.** The shell hosts Deck locally through the preload bridge, and the sidecar can also serve the same renderer over the LAN at `/_static/`. Shell-only capability — terminals, pop-out windows, the fleet roll-up — is detected through the bridge and simply absent when Deck is served.
- **Reads only.** Every verb Deck offers goes through the sidecar's existing guarded endpoints. Deck adds no write path of its own.
- **The adoption table.** `docs/reference/cockpit-adoption.md` is re-read against the cockpit's capability register whenever the cockpit ships a change note, and the rows Spread relies on move from `not yet` to `adopted` as they are built.

## Out of Scope

- **Glass**, the three-dimensional field where depth carries priority. That is [[PHASE-0002-Glass]] and it needs this phase's store and addresses first.
- **Obsidian vaults**: the workspace profile, bases as views, and `.canvas` files as boards. That is [[PHASE-0003-Vault]]. Only the seam is built here, and the seam is the view provider the renderer asks.
- **Rebuilding the cockpit's own renderer.** The cockpit stays the primary place for new functionality and takes its own work; Deck tracks it through the adoption table.
- **Writing JSON Canvas, or writing any file Obsidian owns.** Spread keeps its desks in Deck's own store, in Deck's own format.
- **A full local application on the tablet.** The tablet is served by the Mac's sidecar and reads; packaging the sidecar for iPadOS is a project of its own and is not started here.
- **What needs attention in a world**, deferred to [[PHASE-0003-Vault]]. Deck's front plane renders whatever the sidecar's owed-items answer returns and names no project-os obligation of its own.

## Exit Criteria

- [ ] Spread opens the same notes as the cockpit for a project-os repository: the same list, the same statuses, checked side by side on this repository.
- [ ] A status window moved to a second display reopens on that display after Deck is restarted.
- [ ] Deck served by the sidecar over the LAN opens in Safari on a tablet, reads the notes, and refuses writes as the cockpit's tablet front door does.
- [ ] Every view in Deck's switcher comes from the view provider for the workspace kind, the renderer holds no fixed list of view names, and for a project-os repository the list matches the cockpit's navigator.
- [ ] An address copied out of Deck and pasted back into it restores the same view, the same desk and the same focused note.
- [ ] Every row of the cockpit's capability register that Spread relies on is marked `adopted` in `docs/reference/cockpit-adoption.md`, with the register re-read on the day the phase closes.

## Notes

**Why there is no separate foundations phase.** The Electron shell, the store, the read-only sidecar consumption and the two-host rule are all inside this phase rather than in a phase before it. Splitting them out would produce a first phase whose exit criterion is "a window opens and shows a note", which nobody can judge as a milestone, and it would strand the two rules that must hold from the first line of code — one renderer with two hosts, and views taken from a provider rather than a fixed list of buttons — in a phase that ends before any view exists. The three measurements this phase is judged on already are the foundation: same notes as the cockpit, a window that survives a restart on a second display, and the renderer opening on a tablet. If the phase later proves too large to steer, the split point is the first criterion: everything up to Spread showing the same notes as the cockpit is one phase, and windows plus the tablet host are the next.

**Dependency outside this repository.** Everything here rests on the sidecar in `../project-os-cockpit/`, which is not vendored. This phase asks nothing new of it: Deck reads the sidecar's existing endpoints, and the list of views is Deck's own.

**Sequencing inside the phase.** The store comes first because every window subscribes to it, pop-out windows come next because they are the first visible change, and Spread comes last because it is the first thing a person judges.

**Order.** Deck, then Glass, then Vault, decided by Edwin on 2026-09-06 ([[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 8, item 2).
