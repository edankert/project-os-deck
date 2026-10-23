---
type: "[[phase]]"
id: PHASE-0004
aliases: ["PHASE-0004"]
title: "Parity — Deck carries a working day, so a real task is done in Deck instead of the cockpit"
status: active
order: 3
owner: user:edwin
created: 2026-09-07
updated: 2026-10-23
goal: "Deck carries what the cockpit does for a working day, adopted row by row from the cockpit's capability register, until Edwin does a real task in Deck instead of the cockpit and records which he would rather have used."
features: ["[[FEAT-0030]]", "[[FEAT-0032]]", "[[FEAT-0033]]", "[[FEAT-0034]]", "[[FEAT-0035]]"]
requirements: []
tasks: ["[[TASK-0178]]", "[[TASK-0188]]", "[[TASK-0191]]", "[[TASK-0192]]", "[[TASK-0193]]", "[[TASK-0194]]", "[[TASK-0195]]", "[[TASK-0196]]", "[[TASK-0197]]", "[[TASK-0198]]", "[[TASK-0199]]", "[[TASK-0200]]", "[[TASK-0201]]", "[[TASK-0202]]", "[[TASK-0203]]", "[[TASK-0204]]", "[[TASK-0205]]", "[[TASK-0206]]", "[[TASK-0207]]", "[[TASK-0208]]", "[[TASK-0209]]", "[[TASK-0210]]", "[[TASK-0211]]", "[[TASK-0212]]"]
issues: []
depends: []
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
tags: [phase, parity, console, cockpit]
---

# Parity

> [!note] Deck is the overview since 2026-10-23
> Spread, Glass and the orbit left main by [[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]], and are kept under the git tag `original-deck-2026-10-23`. Where this phase says "the field", it describes the plan as it was written. The shell drawer took the console's place ([[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]), and FEAT-0021 moved to PHASE-0002, parked with the Glass documents it builds on.

## Goal

**At the end of this phase Edwin does a day's work in Deck and does not open the cockpit for a step Deck cannot do.** Deck today reads a repository's notes, arranges them in Spread and, after [[PHASE-0002-Glass]], in Glass. It has no console, no pages for checks, history or releases, no agent strip, no verbs behind the sidecar's guards, and no live announcement when a note changes under it. Each of those is a row in the cockpit's capability register that Deck's adoption table marks `not yet` ([[REFERENCE-COCKPIT-ADOPTION]]). This phase moves the rows a working day needs to `adopted`.

Two words are used throughout. **Parity** means Deck does what the cockpit does for the task at hand; it does not mean a copy of the cockpit's layout. The **console** is the terminal a workspace shell or an agent session runs in, which [[DES-0002-The-Glass-Cockpit]] draws as furniture that floats over the field.

## Scope

- **[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]], explicit levels and evidence beside the claim.** After cockpit contracts are decided, an exact count opens its rows and a claim opens its verdicts, captures or source excerpts on Glass. Each evidence object names its source and date and marks missing or stale evidence. Existing linked notes already use FEAT-0020; new structured evidence and traces stay in this phase. Glass's spatial wheel remains separate from information-level navigation.

- **The console, several at once, as furniture.** A console defaults to bottom-centre, drags anywhere, resizes, is translucent without blur, and the field flows around it. Several are open at once, because one terminal panel makes a second shell a tab and a tab means the first is gone. The cockpit's register row is `shell.terminal`: one PTY per workspace inside tmux, drawn with xterm.js over Electron IPC, in `desktop/src/ipc/terminal.ts` of the cockpit.
- **Before the console is built, evaluate T3 Code's terminal instead of the cockpit's.** Edwin, 2026-09-07: "I want to see if we can introduce the t3.codes console solution instead of our current console." T3 Code (github.com/pingdotgg/t3code) is a Node server that owns the PTYs with node-pty and streams them over a WebSocket to an xterm.js client in a web app, with an Electron shell that bundles the server; the terminal lives in `apps/server/src/terminal/` and the client transport in `apps/web/src/wsTransport.ts`. That shape matches Deck's two hosts better than the cockpit's IPC-only terminal, because a console reachable over a WebSocket can be shown to the tablet host too, and it separates the PTY owner from the window that draws it, which is what the DES-0002 review asked for when it said the carousel must present a control plane rather than the PTY list. What has to be checked before choosing: whether its server can run beside the sidecar and be started by Deck's main process; whether sessions survive an app restart the way the cockpit's tmux sessions do; the WebGL context budget past a few consoles, which xterm.js documents at about sixteen per page; and the licence. The evaluation is a task in this phase and its outcome is an ADR, because the choice decides where PTYs live for every later feature.
- **Decided 2026-10-22: Deck runs its own agent sessions, drawn as conversations** ([[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]). The evaluation found T3 Code is no longer a streamed terminal: it runs Codex through `codex app-server` and Claude through Anthropic's Agent SDK and draws each session as a conversation, with plain shells in a separate drawer, and its packages are private. Edwin chose that shape for Deck (option B of three), to be built after [[PHASE-0005-Overview]] and drawn first as [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]] ([[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]). The paragraph above describes T3 Code as it was in September.
- **Opened 2026-10-22: the phase starts with DES-0006's build.** Edwin asked "Can you build the DES-0006 functionality?" on 2026-10-22, evening. ADR-0009 put the build after [[PHASE-0005-Overview]], and nothing is left to build there: FEAT-0025 to FEAT-0031 wait at review only on Edwin's acceptance tests and his verdicts on DES-0005. So this phase opens now, with four features built in this order:
  - [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]: the session engine in Deck's main process, Claude through the Agent SDK and Codex through `codex app-server`, reported to the sidecar.
  - [[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]: the session pane, the agents on the towers, the Agents list and Work on this.
  - [[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]: one Needs you with permission requests first, and the cockpit's overview panels.
  - [[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]: the shell drawer.

  The rest of this scope (the pages, the verbs, live changes, the command line) is still cut from the adoption table, after these.
- **The pages a day needs.** Checks with the mark dialog, history, release, the acceptance runner and the test runner, each as a panel a window can carry. `shell.pages.checks`, `shell.checks.mark-dialog`, `api.read.check-history`, `shell.pages.history`, `shell.pages.release`, `shell.pages.accept`, `shell.pages.test-run`.
- **The verbs, behind the same guards.** The reader's actuator row, the tick prompt with evidence, the release gate: the same endpoints the cockpit calls, with Deck's host forwarding nothing that writes from beyond loopback. `shell.reader.actuators` and the `api.write.*` rows Deck adopts one by one. This is the first write path Deck offers and it is opt-in by row; [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] stays the rule for the served host.
- **Agents.** The strip with cost, context and touched notes, the attention and approval verbs, and the sessions in the same carousel as the consoles. `shell.agents.*`, `api.read.agents`, `api.write.agents`.
- **Live changes, announced.** A change arriving mid-view shows a chip and is applied on the person's action, never silently; `shell.live`, extending the rule [[PHASE-0002-Glass]] sets for the field.
- **The command line.** `cockpit focus` and `cockpit state` given a Deck meaning through the address grammar; `surface.cli` and `api.read.state`.
- **The rest of the register a day touches.** Quick switch, capture, pins, the platform picker, the validator report, the theme, settings. Grooming decides the order from the adoption table, and a row Deck will never need is marked `not applicable` with the reason rather than left `not yet`.

## Out of Scope

- **Obsidian vaults.** [[PHASE-0003-Vault]], which follows this phase.
- **Rebuilding the cockpit's own renderer or changing the sidecar.** The cockpit stays the primary place for new functionality. A capability Deck needs that the sidecar does not expose is an issue filed in the cockpit repository.
- **A full local application on the tablet.** The tablet is served and reads.
- **The overview page's digest and watermark**, unless grooming brings them in: the DES-0002 review found they have no home in the design yet, and the gap is tracked in the adoption table's `shell.pages.overview` row.

## Exit Criteria

- [ ] Edwin does one real task in Deck instead of the cockpit, for example triaging a day's issues across two screens, and records which of the two he would rather have used and why. The walk is [[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]], moved here from [[PHASE-0001-Deck]] on 2026-09-07 because his first attempt came back as a question: it cannot be answered until the functionality is there. Either answer is a valid result.
- [x] The console decision is recorded as an ADR naming what was evaluated (T3 Code's terminal against the cockpit's), what was measured, and what was chosen. ([[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]], 2026-10-22)
- [ ] A Claude session and a Codex session are started from a ticket in Deck, ask before they act, are answered in place, and are seen in the cockpit; a shell opens beside them. The acceptance test is [[TST-0108]].
- [ ] Several consoles are open at once in Deck, each a slab that drags, resizes and fades on its own, and a console survives a Deck restart the way the cockpit's tmux session does.
- [ ] Every row of the cockpit's capability register is `adopted`, `replaced by` or `not applicable` in [[REFERENCE-COCKPIT-ADOPTION]], with a reason on every `not applicable`, and the register re-read on the day the phase closes.
- [ ] Every verb Deck offers goes through the sidecar's existing guards, and the served host still refuses every method that is not a read.

## Notes

**Why this phase comes after Glass and before Vault.** Edwin, 2026-09-07: build Glass first, iron out its issues, then work on parity. The walk that judges Deck against the cockpit was PHASE-0001's seventh criterion and could not be answered there; it belongs to the phase whose whole purpose is that Deck can carry a working day. Vault was third in the order of 2026-09-06 and is now fourth; its note says its place was the stated order rather than a technical constraint.

**Depends on nothing still open.** It was written to depend on [[PHASE-0002-Glass]], because the console was to be furniture in the field. Since 2026-10-23 the field has left main ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]), and the console is the shell drawer, which needs no field.

**Some features of this phase are not scaffolded yet.** FEAT-0032 to FEAT-0035 were scaffolded on 2026-10-22 when the phase opened. [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]] is one backlog note for the proposed project-to-evidence progression. It has no requirements, tasks or acceptance check until the cockpit decides DES-0015 and DES-0016 and this phase opens. Other features are cut from the adoption table when the phase opens, one feature per group of rows above, so the register remains the list of what parity means. Two are certain: the console (with the T3 Code evaluation as its first task) and the pages.

**Order.** Deck, Glass, Parity, Vault, decided by Edwin on 2026-09-07 ([[ADR-0002-Glass-Is-The-Main-View]]).

## Open questions

- **Does a shell still have to survive a Deck restart, and float as a slab over the field?** The third exit criterion asks for both, written on 2026-09-07 before ADR-0009 chose a drawer. [[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]] builds the drawer, several shells at once, and shells that end with Deck. The criterion stays unticked until Edwin keeps it (more work: tmux or a separate process holding the shells) or rewrites it to match the drawer.
- **May Deck answer the cockpit's own permission requests only when it started the sidecar?** ADR-0009 said Deck must start its own sidecar with `--secret-stdin`. That conflicts with [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]'s rule that Deck borrows a running sidecar. The default taken is the narrower one ([[TASK-0204]]): Deck answers its own sessions in its main process, which needs no secret, and the cockpit's only through a sidecar it started.
