---
type: "[[reference]]"
id: REFERENCE-COCKPIT-ADOPTION
aliases: ["REFERENCE-COCKPIT-ADOPTION"]
title: "Cockpit adoption table: which of project-os-cockpit's capabilities Deck has adopted, keyed to the cockpit's capability register"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-10
scope: "project"
source:
  - "project-os-cockpit, docs/reference/cockpit-capability-register.md at baseline 570da22 ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]])"
related:
  - "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]"
  - "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"
  - "[[REFERENCE-PHASE-0001-REVIEW]]"
  - "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"
  - "[[ADR-0003-Deck-Writes-Through-The-Shell]]"
tags: [reference, register, adoption, cockpit]
---

# Cockpit adoption table

## Purpose

Deck is built beside project-os-cockpit and shares its sidecar. The cockpit stays the primary place where new functionality is built, so capability keeps arriving there, and this table is how Deck sees it and commits to supporting it. The cockpit keeps a capability register with a stable key per capability ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]); this note lists every key from that register with Deck's position on it.

The cockpit's rule, mirrored here: a change note there that adds, changes or retires capability updates its register in the same commit. Deck's rule: when a new row appears there, it appears here as `not yet` with the date, and grooming decides.

**Read against:** cockpit register at baseline `c0ed9e3`, 2026-09-07.

**Positions last moved 2026-09-07**, when the six tasks from [[REFERENCE-PHASE-0001-REVIEW]] landed: `shell.nav.needs-you`, `shell.nav.hide-completed` and `shell.stage.find` moved from `not yet` to `adopted`. The register was re-read the same day at `c0ed9e3` and two keys had arrived that this table did not carry: `shell.checks.mark-dialog` and `api.read.check-history`, both from the cockpit's acceptance-checks work of 2026-09-06. Both are `not yet`, and grooming decides.

**Positions moved 2026-09-06**, when [[PHASE-0001-Deck]]'s implementation landed: twelve rows changed, and the register was re-read on the same day. The rows Spread relies on are `surface.shell`, `shell.workspaces.rail`, `shell.workspaces.discovery`, `shell.nav.modes`, `shell.reader.render`, `shell.windows`, `api.read.nav`, `api.read.note` and `api.read.record`; all nine are `adopted`.

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
| `shell.nav.needs-you` | adopted | 2026-09-07: the navigator draws the sidecar's own "Needs you" group first, and the owed verb appears on the row and on the card ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]). A popped-out window can carry that group alone, which is the status window ([[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]). The front plane in Glass is still [[PHASE-0002-Glass]] |
| `shell.nav.platform` | not yet | |
| `shell.nav.hide-completed` | adopted | 2026-09-07: a group the sidecar marks suppressed arrives folded and opens on one click, so Your Trainer's 309 finished issues are one row rather than 309 cards ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]) |
| `shell.nav.pins` | not yet | |
| `shell.nav.library` | not yet | Files, with a hand-off to the system browser (DES-0002) |
| `shell.stage.tabs` | replaced by | the desk: the reader group is the desk and tabs are its handles (options note, Part 2) |
| `shell.stage.find` | adopted | 2026-09-07: a search box narrows the navigator, matching on id and title over the whole card model rather than over the drawn elements, so a note the pool never drew is still found; filters by status and by type sit beside it ([[TASK-0027-Search-And-Filter-In-The-Renderer]]) |
| `shell.stage.quick-switch` | not yet | |
| `shell.stage.capture` | not yet | |
| `shell.reader.render` | adopted | 2026-09-06: Deck shows the HTML the sidecar rendered and parses no Markdown of its own |
| `shell.reader.actuators` | not yet | same verbs, same guards. 2026-09-08: [[FEAT-0013-The-First-Write]] is the feature that adopts this row. It reads the legal verbs from `GET /api/notes/actions` and draws the rows returned, restating no verb table (the cockpit's REQ-0026), and wires one transition end to end. The row moves to `adopted` when that transition is walked in [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]] |
| `shell.reader.design` | not yet | |
| `shell.context.pane` | replaced by | the neighbourhood in Glass; a context panel in Spread |
| `shell.pages.overview` | not yet | the digest, the watermark and the unpushed commits have no home in DES-0002 yet (review, Part 2) |
| `shell.pages.history` | not yet | |
| `shell.pages.checks` | not yet | |
| `shell.checks.mark-dialog` | not yet | new in the cockpit on 2026-09-06, read here 2026-09-07: the mark dialog renders the check's own body through `/api/render` and shows every comment on it above the verdict buttons. Deck has no checks page yet, so this arrives with `shell.pages.checks` |
| `shell.pages.release` | not yet | |
| `shell.pages.release.settle` | not yet | new in the cockpit on 2026-09-08, read here 2026-09-09: the checks a release owes, on one screen, each settled with `na`, `excused` or `blocked` and one ledger event carrying a reason and an author. A release page SETTLES a check and never passes one — `pass`, `partial`, `fail` and `question` are refused by name at the server (the cockpit's ADR-0041). Deck has no release page, so this arrives with `shell.pages.release`. Worth noting when it does: Deck's own write path already follows the same shape, posting to the endpoint the sidecar named and restating no verb |
| `shell.pages.release.coverage` | not yet | new in the cockpit on 2026-09-08, read here 2026-09-09: what a release ships that nothing verifies — features no acceptance check names in `covers:`, and requirements with unticked criteria — computed mechanically, with a verb that dispatches an agent to draft the missing `TST-*` notes for review as a diff. Arrives with `shell.pages.release`. The agent-dispatch half is a bigger question than the page: Deck offers no agent verbs at all and [[ADR-0003-Deck-Writes-Through-The-Shell]] scopes its writes to two |
| `shell.pages.accept` | not yet | stepwise, not a list |
| `shell.pages.test-run` | not yet | |
| `shell.pages.session` | not yet | |
| `shell.pages.agents` | not yet | |
| `shell.pages.inbox` | not yet | |
| `shell.agents.strip` | not yet | |
| `shell.agents.attention` | not yet | |
| `shell.agents.approvals` | not yet | |
| `shell.agents.follow` | not yet | 2026-09-10: half of it. A served page has a Follow the Mac toggle that shows the note the shell has focused (TASK-0057), which is the cockpit's toggle pointed at a different leader. Following an AGENT's navigation, and `cockpit focus` landing in Deck, are not built |
| `shell.terminal` | not yet | several consoles as furniture in the field, [[PHASE-0004-Parity]]. **Edwin, 2026-09-07:** before building, evaluate T3 Code's terminal (a Node server owning the PTYs with node-pty, streamed over a WebSocket to xterm.js in a web client) in place of the cockpit's IPC-only terminal; that shape fits Deck's two hosts. The choice is recorded as an ADR in that phase. Still to honour: PHASE-040's control plane as the source of sessions, and a context budget past sixteen |
| `shell.live` | adopted | 2026-09-10, TASK-0057 and TASK-0032: Deck's own server-sent event stream, `GET /deck/events`, carries the store to a served page, and a change arriving while a person looks is announced with a count and applied only when they act. Deck's stream carries Deck's store, not the sidecar's `/_events` reload signal |
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
| `api.read.check-history` | not yet | new in the cockpit on 2026-09-06, read here 2026-09-07: every verdict ever recorded against a check, with the method that distinguishes a walker's sentence from the migration backfill. Deck reads no acceptance payload yet |
| `api.read.obligations` | not yet | |
| `api.read.agents` | not yet | |
| `api.read.validation` | not yet | |
| `api.read.state` | not yet | needs a Deck address grammar first |
| `api.write.notes` | not yet | **Moved from `not applicable` on 2026-09-08.** The old position said "Deck adds no write path at all". [[ADR-0003-Deck-Writes-Through-The-Shell]] reverses that: Deck's shell writes through its main process to the sidecar on loopback, using these endpoints unchanged. [[FEAT-0013-The-First-Write]] adopts two of them — a tick with evidence and one status transition — and the rest wait for [[PHASE-0004-Parity]]. Deck's host still answers 405 to every method that is not a read, and the served page is offered no verb at all, which is a rule and not a wait |
| `api.write.design` | not yet | |
| `api.write.agents` | not yet | |
| `api.write.inbox` | not yet | |
| `api.infra` | not yet | Deck is served from `/_static/` as a second page when it runs on a tablet |
| `api.guards` | adopted | by construction: Deck calls the same endpoints and adds no write path of its own |

## Maintenance

- 2026-09-09 — **two keys arrived and were added as `not yet`, which is the first time this table has grown because the cockpit grew rather than because a decision changed.** The cockpit is at `11ded07` and has landed one change note since the last read, `CHG-20260908-Preparing-A-Release-Is-One-Workflow`, which added `shell.pages.release.settle` and `shell.pages.release.coverage` (FEAT-0145, ADR-0041). Both are release-page work and Deck has no release page, so both arrive with `shell.pages.release` when that row moves. Compared mechanically rather than by eye: the register lists 57, this table now carries 57, and neither side holds a key the other lacks. No row moved position. `shell.reader.actuators` stays `not yet` although [[FEAT-0013-The-First-Write]] built it — the row's own condition is that the transition is WALKED in [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]], and nobody has walked it. `api.write.notes` stays `not yet` for the same reason.
- 2026-09-08 — **two rows changed position because a decision changed, not because the register did.** The cockpit is still at `c0ed9e3` and no key arrived. `api.write.notes` moved from `not applicable` to `not yet`: Edwin decided on 2026-09-08 that Deck must be able to write, and [[ADR-0003-Deck-Writes-Through-The-Shell]] put that write in the shell's main process over loopback, so the reason the row gave for "not applicable" no longer holds. `shell.reader.actuators` stays `not yet` and now names [[FEAT-0013-The-First-Write]] as the feature that adopts it. Nothing else moved, and the served host still refuses every write, which keeps `api.guards` and `api.infra` as they were.
- 2026-09-07, closing day — the re-read [[PHASE-0001-Deck]]'s last exit criterion asks for, made on the day that phase closed. The cockpit is still at `c0ed9e3` and has landed no change note since the previous read, so no key arrived and no row moved. The keys were compared mechanically rather than by eye: the register lists 55 and this table carries 55, with no key on either side that the other lacks. The nine rows Spread relies on — `surface.shell`, `shell.workspaces.rail`, `shell.workspaces.discovery`, `shell.nav.modes`, `shell.reader.render`, `shell.windows`, `api.read.nav`, `api.read.note` and `api.read.record` — are all `adopted`, as are `shell.nav.needs-you`, `shell.nav.hide-completed`, `shell.stage.find` and `api.guards`.
- 2026-09-07, later — no row moved. The Parity phase, [[PHASE-0004-Parity]], is now the phase that takes the `not yet` rows a working day needs; the `shell.terminal` row records Edwin's wish to evaluate T3 Code's terminal before Deck builds a console.
- Re-read the cockpit register whenever `git log --since=<last read> -- docs/changes` in project-os-cockpit returns anything, and add a dated line here saying what was read and which rows changed.
- 2026-09-06 — written against baseline `570da22`; every row `not yet` except `api.guards`, and three `replaced by`.
- 2026-09-07 — three rows moved to `adopted` (`shell.nav.needs-you`, `shell.nav.hide-completed`, `shell.stage.find`) as the work landed. The register was re-read at `c0ed9e3`: one cockpit change note has landed since `570da22` and it touched no capability, but the 2026-09-06 acceptance-checks work had added two keys this table never carried. `shell.checks.mark-dialog` and `api.read.check-history` are added here as `not yet`. Every one of the register's 55 keys now has a position in this table.
