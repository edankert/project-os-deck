---
type: "[[reference]]"
id: REFERENCE-COCKPIT-ADOPTION
aliases: ["REFERENCE-COCKPIT-ADOPTION"]
title: "Cockpit adoption table: which of project-os-cockpit's capabilities Deck has adopted, keyed to the cockpit's capability register"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-10-23
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

**Read against:** cockpit register at `d1df13c`, 2026-10-02; re-read at `541bba6` on 2026-10-21 for the eight keys that arrived since. The six rows adopted for FEAT-0029 were checked again at `032a6f8` on 2026-10-14.

**Positions last moved 2026-10-14.** FEAT-0029 adopts six rows for the exact S5–S7 uses stated below. Code and node tests establish these paths; Edwin's three acceptance walks remain pending. The cockpit still refuses feature status transitions and does not prove every person-only agent guard. RISK-0009 records those limits.

**Positions moved 2026-10-02**, when [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]] was built: `api.read.check-history` moved from `not yet` to `adopted`. The register was re-read the same day and six keys had arrived that this table did not carry. They are added as `not yet`, and grooming decides.

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
| `cli.release-test` | not yet | new in the cockpit on 2026-09-27, read here 2026-10-02: the release test as a Markdown sheet or as JSON, from the template's own script |

### Shell

| key | position | note |
| --- | --- | --- |
| `shell.workspaces.rail` | adopted | 2026-09-06: the rail lists the workspaces Deck knows and opens one |
| `shell.workspaces.discovery` | adopted | 2026-09-06: the `SNAPSHOT.yaml` marker, with `.obsidian` already recognised as the vault kind so [[PHASE-0003-Vault]] adds a branch rather than a concept |
| `shell.fleet.rollup` | not yet | |
| `shell.fleet.needs-elsewhere` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: how many things need the person in each other project, kept per workspace with when it was counted |
| `shell.home-draft` | not yet | registered in the cockpit on 2026-10-13, read here 2026-10-21: a small always-on-top Home window, one row per project with its session's state, what is owed and its phases |
| `shell.nav.modes` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. The overview is organised by phase and offers no list of views. Before: 2026-09-06: Deck's project-os view provider offers the same seven views, pinned to a fixture read off the cockpit's navigator; the renderer takes the list from the provider and holds no view names (Edwin, 2026-09-06) |
| `shell.nav.needs-you` | adopted | 2026-10-23: the navigator left with Spread ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]); Needs you is drawn on the overview's wheel, the cockpit's requests first ([[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]). Before: 2026-09-07: the navigator draws the sidecar's own "Needs you" group first, and the owed verb appears on the row and on the card ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]). A popped-out window can carry that group alone, which is the status window ([[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]). The front plane in Glass is still [[PHASE-0002-Glass]] |
| `shell.nav.platform` | not yet | |
| `shell.nav.hide-completed` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Before: 2026-09-07: a group the sidecar marks suppressed arrives folded and opens on one click, so Your Trainer's 309 finished issues are one row rather than 309 cards ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]) |
| `shell.nav.pins` | not yet | |
| `shell.nav.library` | not yet | Files, with a hand-off to the system browser (DES-0002) |
| `shell.stage.tabs` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Before, replaced by the desk: the reader group is the desk and tabs are its handles (options note, Part 2) |
| `shell.stage.find` | adopted | 2026-10-23: the navigator's search left with Spread ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]); the overview's search on the towers finds a ticket by id or title (TASK-0183). Before: 2026-09-07: a search box narrows the navigator, matching on id and title over the whole card model rather than over the drawn elements, so a note the pool never drew is still found; filters by status and by type sit beside it ([[TASK-0027-Search-And-Filter-In-The-Renderer]]) |
| `shell.stage.quick-switch` | not yet | |
| `shell.stage.capture` | not yet | |
| `shell.reader.render` | adopted | 2026-10-23: the reader left with Spread ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]); a ticket's screen shows the HTML the sidecar rendered (TASK-0148). Before: 2026-09-06: Deck shows the HTML the sidecar rendered and parses no Markdown of its own |
| `shell.reader.actuators` | adopted | 2026-10-14: adopted for S5's design controls only (FEAT-0029). Accept uses `/api/notes/decide`; Decline reads the legal action row and sends its target and reason through `/api/notes/transition`. The generic reader left main with Spread on 2026-10-23 ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]), and TST-0028 is retired with it. |
| `shell.reader.viewer` | not yet | **new 2026-09-12**: the cockpit's `~view/<rel>` frames any HTML page inside a workspace's `docs/`, served by `/framed/<rel>`. Nothing in Deck frames a file yet |
| ~~`shell.reader.design`~~ | **retired upstream 2026-09-12** | the design bench was removed (cockpit [[project-os-cockpit#CHG-20260912-The-Design-Bench-Becomes-One-Viewer]]). Deck never adopted it, so nothing here breaks. A design is now a note with pictures in `__attachments__/`, which `shell.reader.render` already covers |
| `shell.context.pane` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Before, replaced by the neighbourhood in Glass: since 2026-09-10 a held note's linked notes and backlinks take the front band, read from `/api/cockpit/context` (TASK-0036), and reach shows them as wires before a lift (TASK-0056); a context panel in Spread is still not built |
| `shell.pages.overview` | partly adopted | 2026-10-15: the overview's ticket marks are adopted on every screen of Deck's overview (PHASE-0005, TASK-0144, TASK-0145): the type colours (the cockpit's `--type-*`, dark theme), the DES-0004 square with its six fills and the needs-you dot, and the rules behind them (`_square_state`, `_needs_human`), ported into `desktop/src/shared/overview-status.ts` and checked against the sidecar's own answers on both workspaces. The digest, the watermark and the unpushed commits still have no home in DES-0002 (review, Part 2) |
| `shell.pages.history` | not yet | |
| `shell.pages.checks` | not yet | |
| `shell.checks.mark-dialog` | not yet | new in the cockpit on 2026-09-06, read here 2026-09-07: the mark dialog renders the check's own body through `/api/render` and shows every comment on it above the verdict buttons. Deck has no checks page yet, so this arrives with `shell.pages.checks` |
| `shell.pages.release` | not yet | |
| `shell.pages.release.settle` | not yet | new in the cockpit on 2026-09-08, read here 2026-09-09: the checks a release owes, on one screen, each settled with `na`, `excused` or `blocked` and one ledger event carrying a reason and an author. A release page SETTLES a check and never passes one — `pass`, `partial`, `fail` and `question` are refused by name at the server (the cockpit's ADR-0041). Deck has no release page, so this arrives with `shell.pages.release`. Worth noting when it does: Deck's own write path already follows the same shape, posting to the endpoint the sidecar named and restating no verb |
| `shell.pages.release.coverage` | not yet | new in the cockpit on 2026-09-08, read here 2026-09-09: what a release ships that nothing verifies — features no acceptance check names in `covers:`, and requirements with unticked criteria — computed mechanically, with a verb that dispatches an agent to draft the missing `TST-*` notes for review as a diff. Arrives with `shell.pages.release`. The agent-dispatch half is a bigger question than the page: Deck offers no agent verbs at all and [[ADR-0003-Deck-Writes-Through-The-Shell]] scopes its writes to two |
| `shell.pages.release-test` | adopted | 2026-10-14: S6 draws per-platform section rings, printed checks and section captures. Local step results produce one `/api/notes/mark-check` result only after all printed steps for that note have results. Release preparation, sealing and publication are not adopted by this row. Edwin's walk is TST-0089. |
| `shell.pages.accept` | adopted | 2026-10-14: S7 adopts the feature gate and verdict controls, with per-feature criteria and ledger evidence. It records an opted-in acceptance run; feature status transitions are offered only when `/api/notes/actions` advertises them. The stamp records acceptance without changing status. Stepwise criterion editing is not part of this adoption. Edwin's walk is TST-0100. |
| `shell.pages.test-run` | not yet | |
| `shell.pages.session` | not yet | |
| `shell.pages.agents` | not yet | |
| `shell.pages.inbox` | not yet | |
| `shell.agents.strip` | partly adopted | 2026-10-22: every session on the workspace, Deck's own and the cockpit's, is a marker over the ticket it was started on and a row in the Agents list, which opens it in the session pane ([[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]). The cockpit's sessions open read-only, with what its sidecar records. Not adopted: the strip's own place in the sidebar. |
| `shell.agents.usage` | not yet | registered in the cockpit on 2026-09-16, read here 2026-10-02: account usage bars at the sidebar's foot |
| `shell.agents.codex` | not yet | registered in the cockpit on 2026-09-25, read here 2026-10-02: Codex in the embedded terminal reports to the rail dot, the agent strip and Needs you |
| `shell.agents.claude-plugin` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: Claude Code in the embedded terminal reports to the rail dot, the agent strip and Needs you through a plugin loaded from `CLAUDE_CODE_PLUGIN_DIRS`. Matters to the agent sessions proposed for [[PHASE-0004-Parity]] |
| `shell.agents.permission-answer` | partly adopted | 2026-10-22: Deck answers a cockpit permission request from Needs you when it started the sidecar itself, with `--secret-stdin` and a secret held in its main process (TASK-0204); through a borrowed sidecar the request says "Answer in the cockpit". Earlier note: registered in the cockpit on 2026-10-14, read here 2026-10-21: a Claude permission prompt appears at the top of Needs you and is answered from its own card; the answer needs the sidecar's shell secret, which Deck's sidecar does not get today |
| `shell.agents.project-line` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: the line above a cockpit Claude prompt says how many things need the person here and in other projects |
| `shell.agents.open-in-cockpit` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: the project line's Open in cockpit button |
| `shell.agents.prompt-commands` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: `/cockpit-needs` and `/cockpit-release` in a cockpit Claude terminal open a pane without starting a turn |
| `shell.agents.attention` | adopted | 2026-10-22: Needs you counts and lists the agents waiting for you after the permission requests, each opening its session ([[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]], TASK-0202). |
| `shell.agents.approvals` | partly adopted | 2026-10-22: open permission requests stand first in Needs you, Deck's own and the cockpit's, read by the main process from the loopback-only `/api/cockpit/approvals` (TASK-0202). The cockpit's are answered from Deck only with a sidecar Deck started (`shell.agents.permission-answer`). |
| `shell.agents.follow` | not yet | 2026-09-10: half of it. A served page has a Follow the Mac toggle that shows the note the shell has focused (TASK-0057), which is the cockpit's toggle pointed at a different leader. Following an AGENT's navigation, and `cockpit focus` landing in Deck, are not built |
| `shell.terminal` | partly adopted | 2026-10-23: the shell drawer runs plain shells, several at once, through node-pty and xterm.js ([[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]); they end with Deck, and there is no field for them to float over since Glass left main ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]). Before: several consoles as furniture in the field, [[PHASE-0004-Parity]]. **Edwin, 2026-09-07:** before building, evaluate T3 Code's terminal (a Node server owning the PTYs with node-pty, streamed over a WebSocket to xterm.js in a web client) in place of the cockpit's IPC-only terminal; that shape fits Deck's two hosts. The choice is recorded as an ADR in that phase. Still to honour: PHASE-040's control plane as the source of sessions, and a context budget past sixteen |
| `shell.live` | adopted | 2026-09-10, TASK-0057 and TASK-0032: Deck's own server-sent event stream, `GET /deck/events`, carries the store to a served page, and a change arriving while a person looks is announced with a count and applied only when they act. Deck's stream carries Deck's store, not the sidecar's `/_events` reload signal |
| `shell.validation` | not yet | |
| `shell.theme` | not yet | Glass has no light-mode form yet (review, Part 2) |
| `shell.settings` | not yet | |
| `shell.windows` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Deck has one window, whose geometry is kept with its display. Before: 2026-09-06: a panel opens in its own window at its own address, its bounds are remembered per window WITH the display they were on, and a satellite neither takes focus nor offers navigation |
| `shell.state.local` | replaced by | 2026-09-06: one store in the main process; every window subscribes and sees a change without a reload |

### Sidecar API

| key | position | note |
| --- | --- | --- |
| `api.read.nav` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Only the smoke run reads it now, to check the proxy. Before: 2026-09-06: read as is, through Deck's own host, which proxies GET and HEAD and refuses everything else. The list of views is Deck's own and the sidecar is not asked for it (Edwin, 2026-09-06) |
| `api.read.note` | adopted | 2026-10-23: its HTML goes into a ticket's screen; the reader left with Spread ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]). Before: 2026-09-06: `/api/render`, read through the same proxy; its HTML goes straight into the reader |
| `api.read.record` | not yet | 2026-10-23: this was adopted in Spread or Glass, which left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]; the adoption holds at the tag `original-deck-2026-10-23`. Before: 2026-09-06: the stats payload only, which is what the overview view draws |
| `api.read.check-history` | adopted | 2026-10-02: `GET /api/cockpit/acceptance?platform=<p>`, read through Deck's own host, which forwards it for GET and HEAD and refuses every other method. The evidence panel of a Glass document read it too, until Glass left main on 2026-10-23 ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]). 2026-10-14: S7 also reads union standings and dated automated methods; S6 now records results through the separate shell write path. |
| `api.read.obligations` | adopted | 2026-10-14: adopted for two of this row's seven routes: `/api/cockpit/obligations` and `/api/cockpit/acceptance?platform=all` in S7. Per-feature criteria come from the separate note read `/api/notes/acceptance?id=…`. Aggregate badges never certify a feature's evidence. Other obligation routes remain unadopted. |
| `api.read.line` | not yet | registered in the cockpit on 2026-10-14, read here 2026-10-21: the project line's data in one answer (needs-you total, kinds with their verbs, the focus item) |
| `api.read.release-test` | adopted | 2026-10-14: S6 reads `/api/cockpit/release-test?platform=<p>&release=<REL>` through Deck's GET/HEAD host. It preserves printed steps separately from test-note results. Recorded Android and iOS payloads cover REL-0017. |
| `api.read.vocabulary` | not yet | new in the cockpit on 2026-09-20, read here 2026-10-02: the status bands, severities and callout types as data. The cockpit's register says Deck can drop `desktop/src/shared/statuses.ts` and its recorded fixture and read these instead |
| `api.read.agents` | adopted | 2026-10-22: `/api/cockpit/sessions` is read by Deck's main process and reaches the window without prompts, files or costs; the served host forwards no session route ([[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]], TASK-0199). |
| `api.read.validation` | not yet | |
| `api.read.state` | not yet | needs a Deck address grammar first |
| `api.write.notes` | adopted | 2026-10-14: adopted for the existing transition/tick channel and S5–S7's `decide`, `mark-check` and `acceptance-run` verbs only. Identity comes from the shell's store; all requests leave through main-process `write-client.ts`. The HTTP host forwards no write. Unused note verbs remain unadopted. TST-0088, TST-0089 and TST-0100 check Deck’s local person-only guard and real verdicts. Missing agent guards on `decide` and `mark-check` are requested below. |
| ~~`api.write.design`~~ | **retired upstream 2026-09-12** | `/api/design/capture`, `comment`, `offer-review`, `verdict` and `/api/notes/choose-variant` are gone from the shared sidecar. **Deck calls none of them** — checked by grep over `desktop/src` on the day they went — so this is a narrowing of the API Deck shares, not a break. A design's Accept and Decline moved to `api.write.note`, which Deck tracks under `shell.reader.actuators` |
| `api.write.agents` | not yet | |
| `api.write.inbox` | not yet | |
| `api.infra` | not yet | Deck is served from `/_static/` as a second page when it runs on a tablet |
| `api.guards` | adopted | by construction: Deck calls the same endpoints and adds no write path of its own |

## Maintenance

- 2026-10-22 — **five rows moved.** `shell.agents.attention` and `api.read.agents` are adopted, and `shell.agents.strip`, `shell.agents.approvals` and `shell.agents.permission-answer` are partly adopted, by [[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]] and [[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]].
- 2026-10-21 — **no row moved; eight keys arrived.** The register was re-read at `541bba6`: `shell.agents.claude-plugin`, `shell.agents.permission-answer`, `shell.agents.project-line`, `shell.agents.open-in-cockpit`, `shell.agents.prompt-commands`, `shell.fleet.needs-elsewhere`, `shell.home-draft` and `api.read.line` are added as `not yet`. Found while reviewing how Deck could take on the cockpit's agent terminals, Needs you and overview panels, which Edwin asked about on 2026-10-21.
- 2026-10-02 — **one row moved to `adopted` and six keys arrived.** `api.read.check-history` is adopted by [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]], and `api.read.obligations` gains a sentence because the same route sits under both keys in the cockpit's register (ADR-0008, fourth open thread). The register was re-read at `d1df13c` and compared key by key: 62 keys there, 56 here. The six this table did not carry are added as `not yet`: `shell.pages.release-test`, `api.read.release-test` and `cli.release-test` (2026-09-27, the cockpit's release test, which replaced its walk page), `api.read.vocabulary` (2026-09-20), `shell.agents.usage` (2026-09-16) and `shell.agents.codex` (2026-09-25). No key this table carries has left the register. The table had not been re-read since 2026-09-09, which is the drift the maintenance rule below is meant to prevent.

- 2026-09-09 — **two keys arrived and were added as `not yet`, which is the first time this table has grown because the cockpit grew rather than because a decision changed.** The cockpit is at `11ded07` and has landed one change note since the last read, `CHG-20260908-Preparing-A-Release-Is-One-Workflow`, which added `shell.pages.release.settle` and `shell.pages.release.coverage` (FEAT-0145, ADR-0041). Both are release-page work and Deck has no release page, so both arrive with `shell.pages.release` when that row moves. Compared mechanically rather than by eye: the register lists 57, this table now carries 57, and neither side holds a key the other lacks. No row moved position. `shell.reader.actuators` stays `not yet` although [[FEAT-0013-The-First-Write]] built it — the row's own condition is that the transition is WALKED in [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]], and nobody has walked it. `api.write.notes` stays `not yet` for the same reason.
- 2026-09-08 — **two rows changed position because a decision changed, not because the register did.** The cockpit is still at `c0ed9e3` and no key arrived. `api.write.notes` moved from `not applicable` to `not yet`: Edwin decided on 2026-09-08 that Deck must be able to write, and [[ADR-0003-Deck-Writes-Through-The-Shell]] put that write in the shell's main process over loopback, so the reason the row gave for "not applicable" no longer holds. `shell.reader.actuators` stays `not yet` and now names [[FEAT-0013-The-First-Write]] as the feature that adopts it. Nothing else moved, and the served host still refuses every write, which keeps `api.guards` and `api.infra` as they were.
- 2026-09-07, closing day — the re-read [[PHASE-0001-Deck]]'s last exit criterion asks for, made on the day that phase closed. The cockpit is still at `c0ed9e3` and has landed no change note since the previous read, so no key arrived and no row moved. The keys were compared mechanically rather than by eye: the register lists 55 and this table carries 55, with no key on either side that the other lacks. The nine rows Spread relies on — `surface.shell`, `shell.workspaces.rail`, `shell.workspaces.discovery`, `shell.nav.modes`, `shell.reader.render`, `shell.windows`, `api.read.nav`, `api.read.note` and `api.read.record` — are all `adopted`, as are `shell.nav.needs-you`, `shell.nav.hide-completed`, `shell.stage.find` and `api.guards`.
- 2026-09-07, later — no row moved. The Parity phase, [[PHASE-0004-Parity]], is now the phase that takes the `not yet` rows a working day needs; the `shell.terminal` row records Edwin's wish to evaluate T3 Code's terminal before Deck builds a console.
- Re-read the cockpit register whenever `git log --since=<last read> -- docs/changes` in project-os-cockpit returns anything, and add a dated line here saying what was read and which rows changed.
- 2026-09-06 — written against baseline `570da22`; every row `not yet` except `api.guards`, and three `replaced by`.
- 2026-09-07 — three rows moved to `adopted` (`shell.nav.needs-you`, `shell.nav.hide-completed`, `shell.stage.find`) as the work landed. The register was re-read at `c0ed9e3`: one cockpit change note has landed since `570da22` and it touched no capability, but the 2026-09-06 acceptance-checks work had added two keys this table never carried. `shell.checks.mark-dialog` and `api.read.check-history` are added here as `not yet`. Every one of the register's 55 keys now has a position in this table.

## Requests to the cockpit

Capabilities Deck needs that the cockpit's sidecar does not offer. Each is filed as an issue in the cockpit repository. **Filed 2026-10-15, at triage:** [[project-os-cockpit#ISS-0323]] (person-only feature transitions), [[project-os-cockpit#ISS-0324]] (agent refusal on `decide` and `mark-check`) and [[project-os-cockpit#ISS-0325]] (a guarded write that sets `phase:`).

- **A sidecar action that sets a note's `phase:`** (asked 2026-10-14, [[TASK-0129-Unplaced-Tickets-Drift-Toward-Their-Suggested-Phase]]). Deck's re-phase screen suggests a phase for each ticket that names none: 987 such tickets in your-trainer on 2026-10-14. Accepting a suggestion moves the tickets on screen only, because no write sets `phase:`. The request is a guarded, person-only write, `POST /api/notes/set-phase` with `{id, phase, mtime}`, that writes one frontmatter field and refuses a phase the workspace does not have. Filed as [[project-os-cockpit#ISS-0325]] on 2026-10-15, once the cockpit's other session had committed its work.

- **Person-only feature transitions out of review** (asked 2026-10-14, [[TASK-0143]], [[FEAT-0029]]). Add feature `review` to `done` and `review` to `doing` to `HUMAN_TRANSITIONS` in `src/project_os_cockpit/note_writes.py`, with person-only enforcement at the write endpoint. Advertise the available actions through `/api/notes/actions?id=<FEAT>`, including refusal reasons. Deck currently draws unsupported actions as unavailable; an opted-in acceptance stamp does not change feature status. Not filed in the cockpit: this run has read-only access to that repository.
- **Refuse agent verdicts on decide and mark-check** (asked 2026-10-14, [[TASK-0143]], [[RISK-0009]]). Enforce person-only verdicts at `/api/notes/decide` and `/api/notes/mark-check`, including the ledger path. Deck's `requirePerson` guards only requests from Deck; another caller can bypass it. Plain agent witnesses are refused on acceptance-run, but that guard does not cover these endpoints. Return a clear refusal Deck can display unchanged. Not filed in the cockpit: this run has read-only access to that repository.
