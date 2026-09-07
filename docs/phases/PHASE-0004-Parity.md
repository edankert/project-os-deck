---
type: "[[phase]]"
id: PHASE-0004
aliases: ["PHASE-0004"]
title: "Parity — Deck carries a working day, so a real task is done in Deck instead of the cockpit"
status: planned
order: 3
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
goal: "Deck carries what the cockpit does for a working day, adopted row by row from the cockpit's capability register, until Edwin does a real task in Deck instead of the cockpit and records which he would rather have used."
features: []
requirements: []
tasks: []
issues: []
depends: ["[[PHASE-0002-Glass]]"]
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
tags: [phase, parity, console, cockpit]
---

# Parity

## Goal

**At the end of this phase Edwin does a day's work in Deck and does not open the cockpit for a step Deck cannot do.** Deck today reads a repository's notes, arranges them in Spread and, after [[PHASE-0002-Glass]], in Glass. It has no console, no pages for checks, history or releases, no agent strip, no verbs behind the sidecar's guards, and no live announcement when a note changes under it. Each of those is a row in the cockpit's capability register that Deck's adoption table marks `not yet` ([[REFERENCE-COCKPIT-ADOPTION]]). This phase moves the rows a working day needs to `adopted`.

Two words are used throughout. **Parity** means Deck does what the cockpit does for the task at hand; it does not mean a copy of the cockpit's layout. The **console** is the terminal a workspace shell or an agent session runs in, which [[DES-0002-The-Glass-Cockpit]] draws as furniture that floats over the field.

## Scope

- **The console, several at once, as furniture.** A console defaults to bottom-centre, drags anywhere, resizes, is translucent without blur, and the field flows around it. Several are open at once, because one terminal panel makes a second shell a tab and a tab means the first is gone. The cockpit's register row is `shell.terminal`: one PTY per workspace inside tmux, drawn with xterm.js over Electron IPC, in `desktop/src/ipc/terminal.ts` of the cockpit.
- **Before the console is built, evaluate T3 Code's terminal instead of the cockpit's.** Edwin, 2026-09-07: "I want to see if we can introduce the t3.codes console solution instead of our current console." T3 Code (github.com/pingdotgg/t3code) is a Node server that owns the PTYs with node-pty and streams them over a WebSocket to an xterm.js client in a web app, with an Electron shell that bundles the server; the terminal lives in `apps/server/src/terminal/` and the client transport in `apps/web/src/wsTransport.ts`. That shape matches Deck's two hosts better than the cockpit's IPC-only terminal, because a console reachable over a WebSocket can be shown to the tablet host too, and it separates the PTY owner from the window that draws it, which is what the DES-0002 review asked for when it said the carousel must present a control plane rather than the PTY list. What has to be checked before choosing: whether its server can run beside the sidecar and be started by Deck's main process; whether sessions survive an app restart the way the cockpit's tmux sessions do; the WebGL context budget past a few consoles, which xterm.js documents at about sixteen per page; and the licence. The evaluation is a task in this phase and its outcome is an ADR, because the choice decides where PTYs live for every later feature.
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
- [ ] The console decision is recorded as an ADR naming what was evaluated (T3 Code's terminal against the cockpit's), what was measured, and what was chosen.
- [ ] Several consoles are open at once in Deck, each a slab that drags, resizes and fades on its own, and a console survives a Deck restart the way the cockpit's tmux session does.
- [ ] Every row of the cockpit's capability register is `adopted`, `replaced by` or `not applicable` in [[REFERENCE-COCKPIT-ADOPTION]], with a reason on every `not applicable`, and the register re-read on the day the phase closes.
- [ ] Every verb Deck offers goes through the sidecar's existing guards, and the served host still refuses every method that is not a read.

## Notes

**Why this phase comes after Glass and before Vault.** Edwin, 2026-09-07: build Glass first, iron out its issues, then work on parity. The walk that judges Deck against the cockpit was PHASE-0001's seventh criterion and could not be answered there; it belongs to the phase whose whole purpose is that Deck can carry a working day. Vault was third in the order of 2026-09-06 and is now fourth; its note says its place was the stated order rather than a technical constraint.

**Depends on [[PHASE-0002-Glass]].** The console is furniture in the field, so the field's obstacle rule and slot geometry exist first. Nothing here depends on the orbit arrangement or on FEAT-0001's measurements.

**The features of this phase are not scaffolded yet.** They are cut from the adoption table when the phase opens, one feature per group of rows above, so that the register and not this note stays the list of what parity means. Two are certain: the console (with the T3 Code evaluation as its first task) and the pages.

**Order.** Deck, Glass, Parity, Vault, decided by Edwin on 2026-09-07 ([[ADR-0002-Glass-Is-The-Main-View]]).
