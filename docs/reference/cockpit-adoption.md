---
type: "[[reference]]"
id: REFERENCE-COCKPIT-ADOPTION
aliases: ["REFERENCE-COCKPIT-ADOPTION"]
title: "Cockpit adoption table: which of project-os-cockpit's capabilities Deck has adopted, keyed to the cockpit's capability register"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
scope: "project"
source:
  - "project-os-cockpit, docs/reference/cockpit-capability-register.md at baseline 570da22 ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]])"
related:
  - "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]"
  - "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"
  - "[[REFERENCE-PHASE-0001-REVIEW]]"
tags: [reference, register, adoption, cockpit]
---

# Cockpit adoption table

## Purpose

Deck is built beside project-os-cockpit and shares its sidecar. The cockpit stays the primary place where new functionality is built, so capability keeps arriving there, and this table is how Deck sees it and commits to supporting it. The cockpit keeps a capability register with a stable key per capability ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]); this note lists every key from that register with Deck's position on it.

The cockpit's rule, mirrored here: a change note there that adds, changes or retires capability updates its register in the same commit. Deck's rule: when a new row appears there, it appears here as `not yet` with the date, and grooming decides.

**Read against:** cockpit register at baseline `570da22`, 2026-09-06.

**Positions last moved 2026-09-06**, when [[PHASE-0001-Deck]]'s implementation landed: twelve rows changed, and the register was re-read on the same day. The rows Spread relies on are `surface.shell`, `shell.workspaces.rail`, `shell.workspaces.discovery`, `shell.nav.modes`, `shell.reader.render`, `shell.windows`, `api.read.nav`, `api.read.note` and `api.read.record`; all nine are `adopted`.

## Positions

`adopted` means Deck does it. `not yet` means Deck will need it and has not built it. `not applicable` means Deck does not need it, with the reason. `replaced by` names what Deck does instead.

### Surfaces

| key | position | note |
| --- | --- | --- |
| `surface.shell` | adopted | 2026-09-06: an Electron shell, and Deck's own HTTP host serving the same renderer for a tablet ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]) |
| `surface.sidecar-html` | not applicable | the sidecar's own HTML stays the cockpit's; Deck served from the sidecar is a different page |
| `surface.cli` | not yet | `cockpit focus` and `cockpit state` need a Deck meaning (an address for a view, a desk and a focused note) |

### Shell

| key | position | note |
| --- | --- | --- |
| `shell.workspaces.rail` | adopted | 2026-09-06: the rail lists the workspaces Deck knows and opens one |
| `shell.workspaces.discovery` | adopted | 2026-09-06: the `SNAPSHOT.yaml` marker, with `.obsidian` already recognised as the vault kind so [[PHASE-0003-Vault]] adds a branch rather than a concept |
| `shell.fleet.rollup` | not yet | |
| `shell.nav.modes` | adopted | 2026-09-06: Deck's project-os view provider offers the same seven views, pinned to a fixture read off the cockpit's navigator; the renderer takes the list from the provider and holds no view names (Edwin, 2026-09-06) |
| `shell.nav.needs-you` | not yet | the front plane in Glass; the owed band kept in fixed chrome in every layout. 2026-09-07: [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]] draws the Needs-you group the sidecar already sends, and [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]] lets it be a window of its own on a second display |
| `shell.nav.platform` | not yet | |
| `shell.nav.hide-completed` | not yet | 2026-09-07: [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]] folds the suppressed group away, which is the half of this row the sidecar already answers; a person-controlled hide-completed toggle is still owed |
| `shell.nav.pins` | not yet | |
| `shell.nav.library` | not yet | Files, with a hand-off to the system browser (DES-0002) |
| `shell.stage.tabs` | replaced by | the desk: the reader group is the desk and tabs are its handles (options note, Part 2) |
| `shell.stage.find` | not yet | the application owns search when the DOM is pooled (DES-0002). 2026-09-07: [[TASK-0027-Search-And-Filter-In-The-Renderer]] builds it, after the review measured 409 cards in one grid with no search box |
| `shell.stage.quick-switch` | not yet | |
| `shell.stage.capture` | not yet | |
| `shell.reader.render` | adopted | 2026-09-06: Deck shows the HTML the sidecar rendered and parses no Markdown of its own |
| `shell.reader.actuators` | not yet | same verbs, same guards |
| `shell.reader.design` | not yet | |
| `shell.context.pane` | replaced by | the neighbourhood in Glass; a context panel in Spread |
| `shell.pages.overview` | not yet | the digest, the watermark and the unpushed commits have no home in DES-0002 yet (review, Part 2) |
| `shell.pages.history` | not yet | |
| `shell.pages.checks` | not yet | |
| `shell.pages.release` | not yet | |
| `shell.pages.accept` | not yet | stepwise, not a list |
| `shell.pages.test-run` | not yet | |
| `shell.pages.session` | not yet | |
| `shell.pages.agents` | not yet | |
| `shell.pages.inbox` | not yet | |
| `shell.agents.strip` | not yet | |
| `shell.agents.attention` | not yet | |
| `shell.agents.approvals` | not yet | |
| `shell.agents.follow` | not yet | one focus window; satellites draw no switcher at all as of 2026-09-06, so there is nothing to follow yet |
| `shell.terminal` | not yet | several consoles; PHASE-040's control plane as the source; a context budget past sixteen |
| `shell.live` | not yet | a change arriving mid-view is announced, never applied silently |
| `shell.validation` | not yet | |
| `shell.theme` | not yet | Glass has no light-mode form yet (review, Part 2) |
| `shell.settings` | not yet | |
| `shell.windows` | adopted | 2026-09-06: a panel opens in its own window at its own address, its bounds are remembered per window WITH the display they were on, and a satellite neither takes focus nor offers navigation |
| `shell.state.local` | replaced by | 2026-09-06: one store in the main process; every window subscribes and sees a change without a reload |

### Sidecar API

| key | position | note |
| --- | --- | --- |
| `api.read.nav` | adopted | 2026-09-06: read as is, through Deck's own host, which proxies GET and HEAD and refuses everything else. The list of views is Deck's own and the sidecar is not asked for it (Edwin, 2026-09-06) |
| `api.read.note` | adopted | 2026-09-06: `/api/render`, read through the same proxy; its HTML goes straight into the reader |
| `api.read.record` | adopted | 2026-09-06: the stats payload only, which is what the overview view draws |
| `api.read.obligations` | not yet | |
| `api.read.agents` | not yet | |
| `api.read.validation` | not yet | |
| `api.read.state` | not yet | needs a Deck address grammar first |
| `api.write.notes` | not applicable | 2026-09-06: Deck adds no write path at all. The client has no method that writes, and Deck's host answers 405 to every method that is not a read |
| `api.write.design` | not yet | |
| `api.write.agents` | not yet | |
| `api.write.inbox` | not yet | |
| `api.infra` | not yet | Deck is served from `/_static/` as a second page when it runs on a tablet |
| `api.guards` | adopted | by construction: Deck calls the same endpoints and adds no write path of its own |

## Maintenance

- Re-read the cockpit register whenever `git log --since=<last read> -- docs/changes` in project-os-cockpit returns anything, and add a dated line here saying what was read and which rows changed.
- 2026-09-06 — written against baseline `570da22`; every row `not yet` except `api.guards`, and three `replaced by`.
- 2026-09-07 — the register was not re-read. Three rows gained a line naming the task that will build them, after the PHASE-0001 review ([[REFERENCE-PHASE-0001-REVIEW]]): `shell.nav.needs-you`, `shell.nav.hide-completed` and `shell.stage.find`. No position moved; a row moves to `adopted` when the task is done.
