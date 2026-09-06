---
type: "[[reference]]"
id: REFERENCE-SURFACE-ARCHITECTURE-OPTIONS
aliases: ["REFERENCE-SURFACE-ARCHITECTURE-OPTIONS"]
title: "Surface architecture options: how the three-pane cockpit, a 2D desk with pop-out windows, and the glass field can be views over one architecture, and what it takes to open an Obsidian vault"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
scope: "project"
source:
  - "Edwin 2026-09-06: 'On the downsides reported around the new cockpit design, I agree but I also think it will provide options we don't have using the current very limited cockpit ... the notes are providing state in this case and do require attention at times but the tool does not currently edit them ... it is not the intention to totally do away with the current lists, these can easily be enabled by this solution and drive the selection but it allows us to have a more flexible desktop not as rigid as the 4 different panes and tabs ... on the multiple screens, we keep one screen as the focus screen and maybe we can simply move some of the status screens of the main screen and make them available as separate windows?'"
  - "Edwin 2026-09-06: 'I would like to keep my options open if we start implementing something, so I would like to consider the new architecture but only if it can support both frameworks ... until one of the other frameworks is mature enough to move over, I want to keep this framework + architecture as the default architecture. Do you think we can architect it so that the two solutions multi-window 2d and the 3d minority report type of application can be views on-top of the architecture ... it would be nice to architect this in such a way that it could also support my worldbuilding application I started in obsidian ... Maybe it could simply support any obsidian vault at first and world-building becomes a project type to be selected?'"
  - "docs/reference/des-0002-glass-cockpit-review-2026-09-05.md, the review this note answers"
  - "desktop/src/main.ts, desktop/src/window-state.ts, desktop/src/ipc/terminal.ts, desktop/src/renderer/renderer.ts; src/project_os_cockpit/cockpit.py, index.py, statuses.py, server.py"
  - "~/Notes, Edwin's Obsidian vault, read on 2026-09-06: 03 Projects/Comics, __templates__/Novel, __bases__/Comic, Properties.md, Vault Structure.md; and the sidecar run against it"
related:
  - "[[DES-0002-The-Glass-Cockpit]]"
  - "[[REFERENCE-DES-0002-REVIEW]]"
  - "[[DES-0001-Nine-Ways-To-Read-The-Record]]"
  - "[[FEAT-0001-The-Corpus-Has-An-Inside]]"
  - "[[project-os-cockpit#ADR-0010]]"
  - "[[project-os-cockpit#ADR-0020]]"
  - "[[project-os-cockpit#FEAT-0093]]"
  - "[[project-os-cockpit#ISS-0203]]"
  - "[[project-os-cockpit#ISS-0279]]"
  - "[[PHASE-040-An-Agent-Session-Is-Not-A-Terminal]]"
tags: [reference, architecture, design, glass, vault]
---

# Surface architecture options

## Purpose

This note answers two prompts from Edwin on 2026-09-06 about what to build after the DES-0002 review. The first asked whether the downsides in [[REFERENCE-DES-0002-REVIEW]] still apply when the tool only reads the notes, which other solutions would remove the rigidity of the four fixed panes, and whether the status surfaces could move to separate windows. The second asked whether one architecture could keep the current three-pane cockpit as the default while the 2D desk with pop-out windows and the 3D glass field become views on top of it, and whether the same architecture could open an Obsidian vault, starting with his worldbuilding project.

Nothing here is decided and nothing is allocated. The note is written so that a decision can be taken from it, and Part 7 lists the notes that decision would create. Read it with the DES-0002 review beside it; this note does not repeat that review's findings on the glass field itself.

## The short version

1. **The read-only point is half right.** The cockpit writes frontmatter through guarded verbs and never edits body text, so mode confusion in a spatial view costs a misread rather than a miswrite. The concerns that survive are all about reading: a thing that needs attention placed out of sight, state with no address, no keyboard route, and cards moving under the pointer on a live change. A read-mostly tool whose job is to surface what needs attention feels those more, not less.
2. **The rigidity has a standard 2D answer.** Turn each pane into a panel that can exist more than once, dock the panels inside a window, pop them out into OS windows across monitors, and hold the state in one store in the main process. That is how VS Code, JupyterLab and Obsidian solved the same problem. It gives every capability DES-0002 promised except depth: lists that drive selection, several notes visible, several consoles, a movable console, and multi-monitor.
3. **Yes, all three can be views over one architecture, on one condition.** The three-pane cockpit must become a locked default layout of the same panels, not a second renderer kept beside a new one. The desk is one panel type. The glass field is one panel type (or one layout) built later on [[FEAT-0001]]'s measurements. Part 4 draws the layers and the order that keeps the three-pane cockpit the default at every step.
4. **The vault is closer than it looks, and one bug hides most of it.** The sidecar already runs on `~/Notes` and already auto-discovers vault note types with parent fields named `world`, `story`, `chapter` and `page`. But a `type:` written as a YAML list is dropped by the indexer, and the Comics notes write it that way, so every character, page, panel and location arrives untyped ([[project-os-cockpit#ISS-0279]]). Part 5 measures this and proposes a workspace profile that is detected from the vault's own templates and bases before anyone selects a project type.
5. **Do not do the three things at once.** The panel refactor, the window store and the vault profile are independent. The profile is sidecar-side Python and can serve the Comics vault within days. The panel refactor touches a renderer of nineteen thousand lines. Part 6 asks which comes first, because that is Edwin's call, and lists six other questions the design needs answered.

## Part 1: the downsides, when the tool only reads

Edwin's argument is that the notes carry state and need attention at times, the tool does not edit them, and so the concerns are smaller than the review suggests.

**What the cockpit writes.** It writes frontmatter, never body text: status transitions, criterion ticks, verdicts, release gates and test runs, each through a registry verb ([[project-os-cockpit#ISS-0153]]) behind the loopback and human-only guards ([[project-os-cockpit#REQ-0026]], [[project-os-cockpit#REQ-0027]]). DES-0002 keeps those verbs on the opened card unchanged. So the write path was never the risk, and Edwin is right that a mode confusion in a spatial view (Sarter and Woods, in the review) costs a misread rather than a miswrite.

**What survives regardless of writes.** Four of the review's findings are about reading, and none of them depends on whether anything is written:

- **Out of sight is out of mind.** The "behind you" band is a place to store what does not need you now. The case Edwin names, a note whose state requires attention at times, is exactly the note that band hides between the times. The evidence in the review is that people rate 3D higher and retrieve no faster, and that the counter meant to prevent forgetting gets ignored.
- **No address.** A view, a desk, a yaw and a focused note that cannot be linked, restored by back, or driven by `cockpit focus` ([[project-os-cockpit#ISS-0203]]).
- **No keyboard route.** Zero focusable elements in the field, and the list panel offered as furniture rather than as the primary surface.
- **Live changes.** Cards re-dealt under the pointer when a note changes over SSE, which [[project-os-cockpit#ISS-0140]] already ruled out for the shell.

**The restatement.** The risk is not "the field might corrupt state". It is "the field might hide the thing that needs you". Every option below therefore keeps the owed count and the per-view badges in fixed chrome that no layout can remove, and treats the list as the accessible primary surface.

## Part 2: what removes the rigidity

**The rigidity, precisely.** The shell is one CSS grid: a workspace rail, a navigator, a stage with tabs, a context pane, a terminal below the stage and an agent strip. Each region exists once and is found by element id. So there is one navigator, one reader, one context pane, one terminal and one agent detail. Two consoles, a list beside two notes, or the terminal on another screen are not possible today, and not because any one feature is missing.

Any option that fixes this needs the same first step: each pane becomes a factory that can be instantiated more than once, with its state held outside the DOM. Measured on 2026-09-06:

| what | count |
| --- | --- |
| lines in `desktop/src/renderer/renderer.ts` | 19,290 |
| `getElementById` and `querySelector` sites in it | 75 |
| virtual routes that are already separable as panels (`~overview`, `~checks`, `~history`, `~agents`, `~inbox`, `~session`, `~release`, `~accept`, `~tests`, ...) | 15 |
| settings read once from `localStorage` at start (nav mode, pane widths, theme, hide-completed, pins, follow, terminal height) | 12 keys |

Given that step is shared, the options are shapes it can take.

### Option 1: a docking layout manager

Every pane becomes a panel you can split, tab, float or pop out: a navigator in any mode, a reader per note, the context pane, a terminal per PTY, agents, checks, history. This is VS Code's editor groups, JupyterLab's dock panel and Theia's shell.

The best current library is Dockview: MIT, zero dependencies, a vanilla TypeScript build that suits a renderer with no framework, floating groups, popout windows and JSON serialisation of the whole layout. Serialisation gives "a layout that survives restart" for free, and a saved layout of open notes is the desk per job. Golden Layout is the older equivalent and less maintained; Lumino is proven in JupyterLab but has no popouts; FlexLayout, rc-dock and react-mosaic need React.

Two costs beyond the factory refactor. Dockview's own popouts need a same-origin `http(s)` page, and the shell loads its renderer from a file, so popouts should go through the main process in any case (Option 3). And the console as translucent furniture is a floating group with a CSS opacity, which is fine, because nothing moves behind it.

### Option 2: a flat desk, with the lists as the selector

This is DES-0002's desk with depth removed. Notes are cards on a flat surface that pans and zooms. The existing navigators sit in a dock beside it and drive selection. A card zoomed out shows its face (id, status, progress bar, or a portrait for a character); zoomed in it renders the note with the existing reader. That is semantic zoom, the Pad++ idea, and it does what depth was doing without the retrieval cost the literature measured. Neighbour wires and "what do these share" work unchanged because the link graph is already served.

Precedents are Obsidian Canvas, Heptabase, Scrintal and Muse. Obsidian's JSON Canvas is the right file format for a desk: one small JSON file per desk, diffable, addressable, and readable by Obsidian itself. The Comics vault already holds four `.canvas` files made this way, so a desk written in that format would open in both tools.

Library choice: tldraw is the strongest canvas SDK but is React-only and requires a licence key to remove its watermark in production. For cards that do not need drawing tools, a hand-rolled CSS-transform surface of a few hundred lines is the better fit.

### Option 3: tear-off panels into OS windows

Any pane gets "open in new window". This is Obsidian's pop-out window and VS Code's floating editor window. It answers the multi-screen question on its own and gives "many consoles" without touching the main grid. It is a subset of Option 1's plumbing and should be built first regardless. Part 3 details it.

### Option 4: the glass field as one panel type

DES-0002's field, built on FEAT-0001's read-only slice over real data, hosted inside whichever shell the options above produce. The review's three go/no-go measurements (legible at real scale, a stable layout under growth, the real cost of pooling) become the criteria for taking it further. The field stops being the whole cockpit and becomes a view you can open beside a list.

### Recommendation

Options 1 and 3 together are one architecture: a panel registry with factories, docking inside a window, pop-out across windows, one state store in the main process. Option 2 is a panel type inside it. Option 4 is another, later. This keeps everything Edwin asked for and does not bet the cockpit on depth.

One rule settles the review's "tabs and the desk are two mechanisms" finding: a single click in a list previews into the reader group's reusable tab, and a double click or a pin keeps it. That is VS Code's preview editor. The reader group then is the desk, and tabs are its handles.

## Part 3: multiple screens

Edwin's rule is the right one and matches what the DES-0002 review concluded: one focus window owns navigation; satellite windows show status and never steal focus; a click in a satellite navigates the focus window. That is how Obsidian's pop-outs behave, and it is the review's "only screen 1 has a front plane" rule in plainer words.

**What exists in the shell today** (read in `main.ts`, `window-state.ts`, `ipc/terminal.ts`, `ipc/fleet-health.ts`):

- A New Window menu item that opens a second full copy of the app. Each copy reads its settings from `localStorage` once, so two windows do not see each other change.
- Fleet health broadcast from the main process to every window. This is the pattern to extend.
- PTYs keyed per workspace in the main process, so a terminal window on another screen can attach to the same shell without a second process.
- One window-state record, so a second window overwrites the first's saved position.

**What is missing, in build order:**

1. A renderer that can boot as one panel (`?panel=terminal&ws=<id>`) rather than the whole app.
2. A main-process store for current workspace, focused note and nav mode, with every window subscribing. Electron supports this plainly (a store in main, `webContents.send` to every window, or `BroadcastChannel` between same-origin renderers). Small libraries exist; a hand-written one is a few hundred lines.
3. Window bounds saved per window role and placed by display (`screen.getAllDisplays()`), so the console window reopens on the screen it was on.
4. The focus rule above, and the existing Following toggle deciding which window an agent's navigation lands in.

**Which panels to move first**, because each is already a separate route and refreshes on its own: the terminal (several at once on one screen is DES-0001's PULSE), the agents panel with the dispatch queue, the validator report, history, and the fleet roll-up. The reader and the navigators stay on the focus screen.

**One limit to state.** Several xterm terminals with the WebGL renderer are capped at roughly sixteen contexts per window. A console screen needs the canvas renderer past that count. Separate windows have separate limits, which is one more point for pop-outs over a carousel.

## Part 4: one architecture, three surfaces

Edwin's condition: the current three-pane cockpit stays the default until another surface is mature, and the 2D desk with windows and the 3D glass field must both be possible as views on top. This part says what has to be true for that to hold.

### The layers

| layer | what it holds | exists today | changes |
| --- | --- | --- | --- |
| 0. Record | notes on disk: a project-os repo, or an Obsidian vault | yes | none |
| 1. Sidecar (Python) | index, render, link graph, obligations, nav payload, SSE, guarded verbs | yes, UI-agnostic already | gains a workspace profile (Part 5); nothing UI-specific |
| 2. Shell state (Electron main) | workspaces, PTYs, windows, fleet health, and the store | partly: PTYs and fleet health, no store | one store, subscribed by every window |
| 3. Panels | navigator(mode), reader(note), context, terminal(pty), agents, overview, checks, history, inbox, desk, field | as singletons by element id | factories, multi-instance, each with an address |
| 4. Layouts | classic (three-pane, locked), dock (free), pop-out windows, glass | classic only, hard-coded as the grid | classic becomes a locked preset of the same panels |

The 2D desk is a panel at layer 3. The glass field is a panel at layer 3, or a layout at layer 4 if its console and carousel are its own furniture. Either way it is a client of the same store and the same sidecar, which is what "a view on top of the architecture" means concretely.

### The one condition

**The classic layout must be the same panels in a locked arrangement, not the old renderer kept beside a new one.** Two renderers over one store rot at different rates, and the one nobody is building becomes the one nobody trusts. The default stays the default by being a preset, with docking and pop-outs as opt-in gestures on the same panels. The acceptance for the refactor is therefore parity: the classic layout looks and behaves as it does today, and the acceptance walk venue that already exists is the place to prove it.

### What must also be true

- **Every panel has an address.** The [[project-os-cockpit#ISS-0203]] rule extends from filters to panels: `~glass/<view>/<id>` was the review's suggestion for the field, and a docked layout needs the same for a navigator in a given mode, a reader on a given note, and a terminal on a given PTY. A layout file is then a list of addresses plus geometry, which is what makes it serialisable, restorable and driveable from `cockpit focus`.
- **State lives in the store, not in the DOM and not in `localStorage` read once.** The twelve keys measured above move to the store, keyed per workspace where they should be (pane widths today are global, which the review noted).
- **The sidecar API stays surface-agnostic.** Nothing in the sidecar should know whether a navigator is docked, floating or popped out. Today this is already true and it is the layer most worth protecting.
- **Mode 1 keeps its own three-pane HTML.** The sidecar's own front door for the tablet ([[project-os-cockpit#ADR-0010]]) does not take the panel system. ADR-0010 says parity is the goal; a panel architecture on the shell widens the gap for a while, and that should be said rather than discovered. The tablet reads; the shell arranges.
- **The glass field's conditions from the review are unchanged**: an address grammar, the list panel as primary for keyboard and screen reader, no `backdrop-filter` over a moving field, FEAT-0001's three measurements first, and an ADR-0010 classification as a mode-3 reading view.

### The order that keeps classic the default at every step

1. **The store.** Main-process state, every window subscribes, the classic renderer reads from it instead of from `localStorage`. No visible change.
2. **Panel factories behind the classic layout.** Each region becomes a factory; the classic grid instantiates each once. Acceptance is parity. No visible change.
3. **Pop-out windows.** "Open in new window" on the terminal, agents, checks, history and the fleet roll-up. First visible change, and it is additive.
4. **The dock layout, opt-in.** Dockview over the same factories; a setting switches a window between classic and dock; classic stays default.
5. **The desk panel.** A 2D surface reading and writing JSON Canvas, with the navigator as selector.
6. **The field.** FEAT-0001's read-only slice, then DES-0002's arrangements if the measurements pass.

Each step ships with classic still default, and steps 3 to 6 are each optional. If the desk turns out to be enough, the field is never built and nothing was wasted on it.

## Part 5: any Obsidian vault, and worldbuilding as a project type

### What already works, measured on 2026-09-06

The sidecar was started against the vault root with `python -m project_os_cockpit ~/Notes` and answered. Two things were already there:

- `cockpit.py` auto-discovers vault note types for the Library view and names the parent fields it tries, and that list already contains `world`, `story`, `series`, `chapter`, `volume`, `book`, `page`, `comic`. The comment names `Panel`, `Character` and `Daily` as the personal-vault types it was written for. The features view returned the vault's `todo` tasks as "Unattached tasks".
- Three of the vault's four statuses already sit in a band in `statuses.py`: `draft` is pending, `review` is active, `cancelled` is archived. `final` is not in the vocabulary.

### What does not work, and why

| measurement (`~/Notes`, `.obsidian`, `.trash` and attachments excluded) | count |
| --- | --- |
| Markdown notes in the vault | 407 |
| notes whose `type:` is a string | 90 |
| notes whose `type:` is a YAML list | 99 |
| notes with no `type:` | 218 |
| notes under `03 Projects/Comics` | 137 |
| of those, typed as a list | 37 |
| of those, typed as a string | 9 |
| Comics types seen: Page 11, Panel 11, @Character 10, Location 8, Chapter 2, Story 1 | 43 |
| Library groups the sidecar returned for the whole vault | Docs tree, Daily, Default Note, Panel |

The indexer's `_normalise_type` accepts a string and returns `None` for anything else. Obsidian writes a list-valued property as a YAML list, and every real Comics note does (`type:` then `- "[[@Character]]"`), while the templates mostly use the string form. So the vault's 99 list-typed notes, including nearly every character, page, panel, location and story, reach the cockpit untyped, and the Library shows a Panel group of zero. This is one function and is filed as [[project-os-cockpit#ISS-0279]]. The vault's own `CLAUDE.md` already warns that properties come in both forms.

Three more gaps, each a design question rather than a bug:

- **Discovery.** The shell finds a workspace by `SNAPSHOT.yaml` at its root. A vault has `.obsidian` instead. The "+" on the rail already means add or rescan; a vault needs that, or a second marker.
- **The unit.** Obsidian's unit is the vault and links resolve vault-wide: the Slides story links locations by full vault path. So the workspace must be the vault root, and the Comics folder is a project inside it. That maps to Edwin's phrase exactly: worldbuilding is a project type, and a project is a folder in a vault with a profile.
- **Bases.** The cockpit serves `.base` files as raw YAML and otherwise ignores them. The Comic base defines four card views (Characters, Chapters, Locations, Pages) with filters such as `type.contains(link("@Character"))`, a sort, an ordered property list and a portrait or cover image per card. That is a navigator definition in the vault's own words.

### The proposal: a workspace profile, detected before selected

A profile is what the sidecar needs to know to serve a workspace that is not a project-os repo: which note types exist and what fields they carry, how notes nest (world, story, chapter, page, panel), which status vocabulary applies and how it maps to the six bands, which views to offer, what a card's face shows, and which verbs exist.

Three profiles cover the cases named so far:

| profile | detected by | types and views | needs-you |
| --- | --- | --- | --- |
| `project-os` | `SNAPSHOT.yaml` | the fixed nav modes and the obligation registry, unchanged | obligations, as today |
| `obsidian-vault` | `.obsidian` | types discovered from `type:` and from `__templates__`; every `.base` file is a navigator view; the file tree | none until defined |
| `worldbuilding` | a vault profile scoped to a folder | the Novel types from the templates; parents world, story, chapter, page, panel; statuses draft, review, final, cancelled; the Comic bases as views; portrait or cover as the card face | to be decided (Part 6) |

**Detection first, selection as the fallback.** The vault already says what it is: `__templates__/Novel/*.md` declare each type's fields, `Properties.md` declares field order and which field is the parent, and `__bases__/Comic/*.base` declare the views. A profile derived from those with a small override file needs no selection, and a folder with none of them gets the generic vault profile. Selecting a project type is what to offer when detection has nothing to go on.

**Bases as views is the bridge worth building.** It gives the cockpit navigators for any vault without inventing a second query language, and it makes the vault's own views appear in the cockpit unchanged. The cost is a parser for the subset the vault uses: `and`, `contains`, `link()`, `file.name`, `this.file.name`, `order`, `sort`, `image`. The Bases language is Obsidian's and still moving, so the subset must be named in the note and anything outside it shown as "view not supported" rather than as an empty list.

**The desk and the vault share a format.** JSON Canvas is already in the vault, so the desk panel (Part 2, Option 2) reads and writes files Obsidian also opens. Writing a canvas file into a project-os repo is a write into the record, and Part 6 asks whether that is wanted.

**Verbs.** A vault profile supplies its own verb table to the registry: draft to review to final for the Novel types. The guards do not change. Nothing in a vault is human-only unless the profile says so.

### What the cockpit adds to a vault that Obsidian does not have

Obsidian already renders the notes, resolves the links, shows the bases and draws the canvases. So the honest question is what the cockpit is for in a vault. The answer today is the agent side: a terminal and agent sessions beside the notes, `cockpit focus` driving the view from any terminal, capture, and a front plane of what needs you. The last of those is empty until a worldbuilding profile says what needs attention in a world. Part 6 asks.

## Part 6: questions and push-backs for Edwin

1. **"Both frameworks."** This note reads it as the two user-interface paradigms: the current three-pane cockpit, and the new one (2D desk with windows, and later the 3D field). If it meant project-os and Obsidian, Part 5 answers that instead, and the two readings do not conflict. Confirm which.
2. **Which first: the vault or the flexibility?** They are independent. The profile is Python in the sidecar and can serve Comics within days, starting with [[project-os-cockpit#ISS-0279]]. The panel refactor is the renderer. Doing both at once doubles the risk on a nineteen-thousand-line file. The recommendation is the profile first, because it delivers something to a second project without touching the shell, and the store and factories second.
3. **What needs attention in a world?** Candidates from the vault: a character referenced by a story but with no note (the index already knows dangling links), a page without a number under a chapter that orders by number, a page in draft older than some age, a chapter whose pages are all final while it is still draft. Without an answer the front plane is empty and the cockpit is Obsidian with a terminal.
4. **Is the workspace the vault or the Comics folder?** The recommendation is the vault, with the profile scoped to the folder, because links resolve vault-wide. This means the rail shows `Notes`, not `Comics`, and the Comics project is chosen inside it.
5. **May the desk write canvas files into the record?** In a vault, yes without question, because Obsidian does the same. In a project-os repo a canvas file is a new artifact type beside the notes, and the validator would need to know it. The alternative is desks kept in the shell's own storage, which keeps the record clean and loses the Obsidian round-trip.
6. **Does the tablet need the panels?** The recommendation is no: mode 1 keeps the sidecar's three-pane HTML, and the panel architecture is mode 3 only. This widens the parity gap [[project-os-cockpit#ADR-0010]] wants closed, for as long as the dock layout is shell-only, and that should be recorded as accepted rather than found later.
7. **Bases: implement the subset, or treat them as opaque?** The subset is small and the Comic bases use nothing outside it. The risk is Obsidian changing the language under the parser. The recommendation is the subset, named in the note, with an explicit "not supported" state.

Two push-backs, stated plainly:

- **Do not keep two renderers.** A plan that adds a new panel-based shell beside the existing renderer and migrates "later" produces two half-maintained surfaces. The classic layout has to be built from the factories, and its parity is the gate.
- **Do not select a project type that could be detected.** The vault carries its schema in templates, properties and bases. A profile derived from those is one that stays true when the vault changes; a selected one is a second copy that drifts.

## Part 7: the notes a decision would create

In dependency order. Working titles. None exists.

| type | working title | settles | depends on |
| --- | --- | --- | --- |
| ADR | The cockpit's surfaces are panels over one store; the classic layout is a locked preset of them | the one condition in Part 4, as a citable rule with a conformance check (no singleton pane by element id) | acceptance of this note |
| ADR | A workspace has a profile, detected before selected | the profile concept, its detection order, and that the sidecar API stays surface-agnostic | none |
| REQ | Every panel has an address | the ISS-0203 rule extended to panels; layouts as lists of addresses; `cockpit focus` and `cockpit state` defined for a docked window | ISS-0203 |
| REQ | One focus window; satellites never take navigation | the multi-window rule from Part 3 | the store |
| ISS | A list-valued `type:` loses its type ([[project-os-cockpit#ISS-0279]], filed with this note) | the vault's 99 untyped notes | none |
| ISS | The shell discovers workspaces by SNAPSHOT.yaml only | a vault cannot be added | none |
| FEAT | The shell holds one store and every window subscribes | step 1 of Part 4 | none |
| FEAT | Panel factories behind the classic layout, at parity | step 2 | the store |
| FEAT | Pop-out windows for the status surfaces | step 3 | factories |
| FEAT | The dock layout, opt-in | step 4 | factories |
| FEAT | The desk panel, in JSON Canvas | step 5 | factories; question 5 |
| FEAT | Bases as navigator views | the parser for the named subset | the profile ADR |
| FEAT | The worldbuilding profile | Novel types, parents, statuses, faces, verbs | the profile ADR; question 3 |
| TST | The classic layout is unchanged after the factory refactor | the parity gate, walked in the acceptance venue | factories |
| TST | A panel popped out on a second display reopens there and follows the focus window | Part 3, items 3 and 4 | pop-outs |

One phase would be warranted for the shell work, and its goal can be stated without listing its parts: the cockpit's surfaces become panels over one store, so a person can arrange them and put them on any screen. Its exit criteria are measurements rather than a task list: the classic layout passes the parity walk, one status panel lives on a second display across a restart, and the dock layout opens the same notes as classic. The vault work is a second, independent phase: the Comics vault opens in the shell with its notes typed, its bases as views and its statuses banded.

## Part 8: Edwin's answers, and what they change

Edwin answered the seven questions of Part 6 on 2026-09-06, the same day. This part records the answers and what each one changes above. Parts 1 to 7 are left as written; where an answer reverses a recommendation, this part says so.

### 1. Three things, one of them frozen, and their names

> "we have the current application, the 2d multi-window view and the 3d minority report view (can we give these some catchy names?) The current application should not change for now, the current application might be replaced by the new application in the future ... the input can be project-os or/and obsidian vaults."

**This reverses Part 4's one condition.** Part 4 said the current three-pane layout must be rebuilt from panel factories so there is never a second renderer. Edwin's decision is different: the current application is frozen, a new application is built beside it, and the new one may replace the old one later. That is acceptable, and the push-back in Part 6 does not apply to it, because the failure it warned about is two renderers both taking new work. The amended condition is:

- **The current application takes fixes only.** Every new capability lands in the new application. A note that adds capability to the current application after the new one exists must say why.
- **Both share everything below the renderer**: the sidecar entirely, and the shell's main process (workspace discovery, PTYs, windows, fleet health, the store once it exists).
- **The new application starts its own renderer.** Where it needs a piece of the old one (the xterm wiring, the health marks, the reader's markup), it copies or lifts it into a shared module without changing the old application's behaviour.
- **The new application is one renderer with two hosts.** The shell hosts it locally with the preload bridge; the sidecar can also serve it over the LAN at `/_static/`, the way it serves `cockpit.js` today. Shell-only capability (terminal, pop-out windows, the fleet) is detected through the bridge and absent when served. This is what makes the tablet answer in item 6 cheap, and it is the one-view-set-two-front-doors rule of [[project-os-cockpit#ADR-0010]] applied to the new application from the start.

**Corrected later the same day.** Edwin: *"At the moment I think it is too early to say that any new cockpit functionality should land in the deck instead. I think for now cockpit should be the primary place for new functionality needed to support the different projects, the deck needs to however keep an eye on this functionality and needs to ensure it can support it going forward."* So the first bullet above is withdrawn: the cockpit is not frozen and stays the primary place for new functionality. Deck's obligation is the adoption table against the cockpit's register, kept current, and an architecture that can carry what arrives. The sharing, own-renderer and two-hosts bullets stand.

**Names.** Checked against the record on 2026-09-06 so that a name does not already mean something here:

| name | for | in the record today |
| --- | --- | --- |
| **Cockpit** | the current application, unchanged | its name |
| **Canopy** | the new application: the glass over a cockpit, the thing you look through, and it covers both views | unused |
| **Spread** | the 2D multi-window view: a comic spread is two pages side by side, and the notes spread across screens | 5 notes, as an ordinary word |
| **Glass** | the 3D field: [[DES-0001]]'s treatment and [[DES-0002]]'s title | 8 notes, already this meaning |

Rejected: Bench (project-os-bench, 67 notes), Board (the claims board of [[project-os-cockpit#DES-0003]], 32 notes), Bridge (41 notes), Desk (the pile of open notes inside DES-0002, which Spread contains). So the sentence to test is: *Canopy has two views, Spread and Glass, over project-os repos and Obsidian vaults; Cockpit stays as it is.*

### 2. Vault support is its own phase, and not the first

> "Can we make the vault support an extra phase instead?"

Yes. Part 7's single phase becomes three, in this order: **Canopy** (the store, the windows, Spread), **Glass** (on [[FEAT-0001]]'s measurements), **Vault** (the profile, bases as views, canvases as boards). [[project-os-cockpit#ISS-0279]] stays at triage and joins the Vault phase when it opens.

One constraint from the Vault phase reaches back into the Canopy phase and must be honoured there: **Canopy asks the sidecar which views a workspace has, and never hard-codes them.** Today the nav modes are a fixed tuple in `cockpit.py`; the sidecar gains a "views for this workspace" answer that lists the project-os modes for a repo and the bases for a vault, and Canopy renders whatever comes back. That is cheap to build first and expensive to retrofit, and it is the whole of what "considered for the architecture" costs.

### 3. What needs attention in a world: deferred, with the seam kept

> "Let's work through that when we start that support, I just want to make sure this is considered for the architecture but I don't want to start with it."

Deferred to the Vault phase. The seam is the same as item 2: Canopy's front plane renders whatever the sidecar's owed-items answer returns, and nothing in Canopy names a project-os obligation. A profile that supplies obligations later needs no change in Canopy.

### 4. The workspace is the vault

Decided. Consequences: shell discovery gains a second marker (`.obsidian`) beside `SNAPSHOT.yaml`, or the existing add action on the rail; the profile is scoped to a folder inside the vault; the rail shows the vault, and the project (Comics) is chosen inside it.

### 5. JSON Canvas is not agreed, and the goal is narrower than round-tripping

> "Not sure depends on the use-case, did we agree on using json-canvas at this stage? Note: I don't think it needs to be possible to replicate the cockpit views in obsidian, the goal is to create a separate view on-top of obsidian."

Not agreed, and Part 2's suggestion is withdrawn as a default. Spread keeps its layouts in the shell's own store, addressable, in its own format. It **reads** `.canvas` files as boards, because the Comics project has four and the parser is small, and it does not write them. Writing JSON Canvas waits for a use case that asks for it. Canopy is a view over Obsidian's files, never a second editor of them.

### 6. The tablet: three options, one recommended

> "I think having the 3d minority report solution would work really nicely on a tablet for instance but not sure how feasible this is (suggest options). Happy to go with a read-only remote vs full local application?"

| option | what it is | feasibility | cost |
| --- | --- | --- | --- |
| **T1. Read-only remote** (recommended) | Canopy served by the Mac's sidecar over the LAN, opened in Safari and installed as a web app; Glass as the default view on the tablet; writes refused as today | high: Glass is DOM and CSS transforms and runs in Safari; item 1 already makes Canopy servable | Safari testing; `backdrop-filter` is dearer on tablet GPUs, so the review's "no blur over a moving field" is a hard rule there; pooling matters more |
| **T2. Full local application** | the sidecar and Canopy both on the tablet | possible but a project of its own: Electron does not run on iPadOS; Python on iOS is official since 3.13 and Briefcase packages it, so the sidecar could run there inside a web view; Tauri 2 targets iOS but would mean porting the sidecar | large; not before T1 has shown Glass works on touch |
| **T3. Hybrid** | T1 with the renderer cached on the tablet for instant start, data still from the Mac | T1 plus a service worker | small; only worth it if T1's load time bites |

T1 is the answer to "read-only remote versus full local": read-only remote now, and full local only if the tablet must work away from the Mac. Two things carry over from the review: touch makes small far targets harder to hit, so on a tablet "fly first, then open" is the only way to open a far card; and the list panel remains the accessible primary surface. Multi-window is not part of the tablet story; Spread on a tablet is one window, and Glass is the view that fits the device. Writes on the tablet remain behind [[project-os-cockpit#ADR-0010]]'s authentication precondition.

### 7. Any vault, showing what is already there

> "It would be nice if we could point the new cockpit at any vault and show case as much of the functionality already there, it would be great if this could include show casing/interpreting the bases and layout already created."

What a vault already declares, and what Canopy can read from it, measured in `~/Notes` on 2026-09-06:

| the vault declares | where | what Canopy makes of it |
| --- | --- | --- |
| note types and their fields | `__templates__/*/*.md` (the Novel types), `Properties.md` (field order, which field is the parent) | the profile: types, faces, nesting |
| views | `.base` files: 2 under `__bases__/Comic`, 2 under `__bases__/Tasks`, 6 under `TaskNotes/Views`, 8 untitled in the Inbox | navigator views, one per base view; the Comic base gives Characters, Chapters, Locations and Pages as card views with a portrait or cover |
| boards | 4 `.canvas` files under the Comics characters | Spread boards, read-only |
| the saved layout | `.obsidian/workspace.json`: a main split with five open notes in tabs, a left sidebar (file explorer, search, bookmarks), a right sidebar (backlinks, outgoing links, tags, properties, outline, calendar, git, bases), and 50 last-open files | the first Spread when a vault opens: the open notes as cards, the last-open list as a recent strip, the sidebars as hints for which panels to show; read-only, Obsidian owns the file |
| bookmarks | `.obsidian/bookmarks.json`, if present | pins |
| card images | `portrait`, `cover`, `image`, `scene` fields, already named as `image:` in the bases | the card face |
| inline queries | Dataview `= this.summary` in the templates | render the `this.<field>` form; show anything else as source |

The ceiling, stated so it is not discovered later: Canopy reads what Obsidian wrote and writes none of Obsidian's files; the Bases language is Obsidian's and still moving, so the supported subset is the union of what the vault's own base files use, named in the Vault phase, and a view outside it says "not supported" rather than showing an empty list.

### What this changes in Part 7

- The first ADR ("surfaces are panels over one store; the classic layout is a locked preset") is replaced by **"Canopy beside Cockpit"**: the current application is frozen, new capability lands in Canopy, both share the sidecar and the main process, and Canopy is one renderer with two hosts.
- The parity test for the classic layout is dropped; there is no refactor to gate.
- A REQ is added: **the sidecar tells a client which views a workspace has**; Canopy hard-codes none.
- The phase list becomes three: Canopy, Glass, Vault. The Canopy phase's exit criteria are measurements: Spread opens the same notes as Cockpit for a project-os repo, one status panel lives on a second display across a restart, and Canopy served from the sidecar opens read-only on a tablet.

Still open: the names, which are proposals until Edwin says so.

## Sources

Docking and windows:

- Dockview: https://dockview.dev/ and popout groups: https://dockview.dev/docs/core/groups/popoutGroups
- Dockview popouts inside Electron, one team's write-up: https://github.com/ok-very/autoart/issues/62
- Docking library comparison: https://portalzine.de/docker-layouts-with-goldenlayout/
- Lumino (JupyterLab): https://github.com/jupyterlab/lumino
- Obsidian pop-out windows: https://help.obsidian.md/pop-out-windows
- VS Code floating editor windows: https://devclass.com/2023/12/11/visual-studio-code-gets-floating-editor-windows-but-there-are-oddities/
- Electron, opening windows from the renderer: https://www.electronjs.org/docs/latest/api/window-open/
- Syncing state between Electron contexts: https://brunoscheufler.com/blog/2023-10-29-syncing-state-between-electron-contexts

Canvases and zooming:

- tldraw SDK: https://tldraw.dev/
- JSON Canvas: https://jsoncanvas.org
- Zooming user interfaces and Pad++: https://en.wikipedia.org/wiki/Zooming_user_interface
- Muse on the infinite canvas: https://museapp.com/memos/2020-12-infinite-canvas/
- Kinopio: https://kinopio.club/about
- Heptabase and Scrintal compared: https://storyflow.so/blog/best-heptabase-alternatives-2026

Obsidian:

- Bases: https://help.obsidian.md/bases
- Properties: https://help.obsidian.md/properties

## Maintenance

This note describes the shell, the sidecar and the vault on 2026-09-06. A decision on any part of it, or a note from Part 7 being created, makes the corresponding section historical. Do not edit the findings; add a dated line under this heading saying what changed.

- 2026-09-06 — the three phases of Part 8 item 2 were created as notes: [[PHASE-0001-Deck]], [[PHASE-0002-Glass]] and [[PHASE-0003-Vault]], with the registry in `docs/PHASES.md`. Two things resolved on the way. The first phase is named **Deck**, not Canopy: the application was named Deck when this repository was created, so every "Canopy" in Part 8 reads as Deck. There is no separate foundations phase before it — the Electron shell, the store, the read-only sidecar consumption and the two-host rule sit inside the Deck phase, and PHASE-0001 states why. [[FEAT-0001]] and its five tasks now carry `phase: [[PHASE-0002-Glass]]`.
- 2026-09-06 — Edwin answered the seven questions of Part 6 the same day; Part 8 records the answers. Part 4's one condition (rebuild the classic layout from panel factories) is reversed: the current application is frozen and a new one, Canopy, is built beside it. Part 2's JSON Canvas suggestion is withdrawn as a default. Part 7's phase becomes three. Later the same day Edwin withdrew the frozen-cockpit rule in Part 8 item 1: the cockpit stays the primary place for new functionality and Deck tracks it.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `docs/reference/cockpit-surface-architecture-options-2026-09-06.md` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
