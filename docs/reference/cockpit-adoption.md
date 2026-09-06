---
type: "[[reference]]"
id: REFERENCE-COCKPIT-ADOPTION
aliases: ["REFERENCE-COCKPIT-ADOPTION"]
title: "Cockpit adoption table: which of project-os-cockpit's capabilities Deck has adopted, keyed to the cockpit's capability register"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
scope: "project"
source:
  - "project-os-cockpit, docs/reference/cockpit-capability-register.md at baseline 570da22 ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]])"
related:
  - "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]"
  - "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"
tags: [reference, register, adoption, cockpit]
---

# Cockpit adoption table

## Purpose

Deck is built beside project-os-cockpit and shares its sidecar. The cockpit is frozen except for fixes, but new capability will still arrive there, and this table is how Deck sees it. The cockpit keeps a capability register with a stable key per capability ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]); this note lists every key from that register with Deck's position on it.

The cockpit's rule, mirrored here: a change note there that adds, changes or retires capability updates its register in the same commit. Deck's rule: when a new row appears there, it appears here as `not yet` with the date, and grooming decides.

**Read against:** cockpit register at baseline `570da22`, 2026-09-06.

## Positions

`adopted` means Deck does it. `not yet` means Deck will need it and has not built it. `not applicable` means Deck does not need it, with the reason. `replaced by` names what Deck does instead.

### Surfaces

| key | position | note |
| --- | --- | --- |
| `surface.shell` | not yet | Deck's shell; one renderer with two hosts (Part 8 of [[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]) |
| `surface.sidecar-html` | not applicable | the sidecar's own HTML stays the cockpit's; Deck served from the sidecar is a different page |
| `surface.cli` | not yet | `cockpit focus` and `cockpit state` need a Deck meaning (an address for a view, a desk and a focused note) |

### Shell

| key | position | note |
| --- | --- | --- |
| `shell.workspaces.rail` | not yet | |
| `shell.workspaces.discovery` | not yet | Deck adds a second marker for vaults (`.obsidian`) in its Vault phase |
| `shell.fleet.rollup` | not yet | |
| `shell.nav.modes` | not yet | Deck asks the sidecar which views a workspace has; it does not hard-code the modes |
| `shell.nav.needs-you` | not yet | the front plane in Glass; the owed band kept in fixed chrome in every layout |
| `shell.nav.platform` | not yet | |
| `shell.nav.hide-completed` | not yet | |
| `shell.nav.pins` | not yet | |
| `shell.nav.library` | not yet | Files, with a hand-off to the system browser (DES-0002) |
| `shell.stage.tabs` | replaced by | the desk: the reader group is the desk and tabs are its handles (options note, Part 2) |
| `shell.stage.find` | not yet | the application owns search when the DOM is pooled (DES-0002) |
| `shell.stage.quick-switch` | not yet | |
| `shell.stage.capture` | not yet | |
| `shell.reader.render` | not yet | the cockpit's renderer, unchanged; never a second Markdown parser |
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
| `shell.agents.follow` | not yet | one focus window; satellites never take navigation |
| `shell.terminal` | not yet | several consoles; PHASE-040's control plane as the source; a context budget past sixteen |
| `shell.live` | not yet | a change arriving mid-view is announced, never applied silently |
| `shell.validation` | not yet | |
| `shell.theme` | not yet | Glass has no light-mode form yet (review, Part 2) |
| `shell.settings` | not yet | |
| `shell.windows` | not yet | pop-out windows are Deck's first visible capability |
| `shell.state.local` | replaced by | one store in the main process, every window subscribes |

### Sidecar API

| key | position | note |
| --- | --- | --- |
| `api.read.nav` | not yet | plus a "views for this workspace" answer Deck needs and the cockpit does not have |
| `api.read.note` | not yet | |
| `api.read.record` | not yet | |
| `api.read.obligations` | not yet | |
| `api.read.agents` | not yet | |
| `api.read.validation` | not yet | |
| `api.read.state` | not yet | needs a Deck address grammar first |
| `api.write.notes` | not yet | unchanged, behind the same guards |
| `api.write.design` | not yet | |
| `api.write.agents` | not yet | |
| `api.write.inbox` | not yet | |
| `api.infra` | not yet | Deck is served from `/_static/` as a second page when it runs on a tablet |
| `api.guards` | adopted | by construction: Deck calls the same endpoints and adds no write path of its own |

## Maintenance

- Re-read the cockpit register whenever `git log --since=<last read> -- docs/changes` in project-os-cockpit returns anything, and add a dated line here saying what was read and which rows changed.
- 2026-09-06 — written against baseline `570da22`; every row `not yet` except `api.guards`, and three `replaced by`.
