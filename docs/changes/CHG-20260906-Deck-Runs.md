---
type: "[[change]]"
id: CHG-20260906-Deck-Runs
aliases: ["CHG-20260906-Deck-Runs"]
title: "Deck runs: an Electron shell over the cockpit's sidecar, reading only, with its own host serving the same renderer to a tablet"
status: merged
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
commit: ""
pr: ""
impacts: ["desktop/", "tools/scripts/run-desktop-tests.sh", ".gitignore"]
issues: []
features: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
related: ["[[PHASE-0001-Deck]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]"]
---

# Deck runs

## Summary

**There is now an application in this repository.** `cd desktop && npm start` opens Deck, which lists the project-os repositories it knows, opens one, and draws its notes as cards you can click to read. Until today the repository held designs and notes and no code.

Deck reads and never writes. It shows what project-os-cockpit's sidecar reports, through three locks: a client with no method that writes, a proxy that refuses every method that is not a read, and the sidecar's own loopback guard, which is untouched.

## Impact

- **A new directory, `desktop/`**, holding the application: a main process, a preload bridge, a renderer, and the modules the two share. TypeScript, no framework, no bundler. Two compiles, because the main process needs CommonJS and the renderer needs modules a browser can import.
- **A new command, `bash tools/scripts/run-desktop-tests.sh <suite>`**, which builds and runs one test suite. Each `TST-*` note with a `command:` names one suite, so a red run in continuous integration points at a test note rather than at "the tests". `all` runs everything.
- **Deck opens a second port.** Its own HTTP host serves the renderer and proxies reads to the sidecar; the Electron window loads from that host too, so both hosts run the same bytes over one origin ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]). It binds loopback unless started with `--lan`, and it answers 405 to every method that is not `GET` or `HEAD` whatever it is bound to.
- **Deck reuses a sidecar that is already running** for a workspace, after checking that the sidecar reports the same repository root. It starts one only when none answers, in its own port range, and stops only the ones it started. This is [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]: the sidecar writes `.cockpit/url` into the repository and the `cockpit` command follows that file, so a second sidecar would silently capture the routing.
- **`.cockpit/` is now ignored**, and its four files were removed from tracking. They are a running process's bookkeeping, one of them naming a local port and a process id, and the cockpit's own repository has ignored them all along. They were committed here by mistake when this phase opened.
- **`node_modules/` is now ignored** and `desktop/package-lock.json` is committed.
- **The cockpit is unchanged.** Nothing in this change asks anything new of it.

## Documentation Coverage (All Types Considered)

- features: updated
- requirements: not-applicable
- tasks: updated
- issues: not-applicable
- tests: new
- workflows: not-applicable
- decisions: new
- risks: new
- changes: new
- snapshot: updated

## What the independent review changed

The review gate ran before any feature was set to `done`, from a clean context, and it found six things. All are fixed, and each has a test that fails without the fix.

- **Deck's host forwarded a double-encoded traversal.** The allow-list ran on the once-decoded path; `fetch` decoded again and resolved `/api/render/%252e%252e/api/inbox` to `/api/inbox`. Because everything Deck forwards reaches the sidecar from loopback, that handed a network client the reads the sidecar's own guard withholds. Demonstrated from a non-loopback address against the running sidecar. The allow-list now runs on the resolved URL and refuses a path still carrying a percent sign.
- **A window received a state change and did not repaint.** The subscription redrew the chrome and not the cards, so a note focused in one window changed nothing visible in another. The smoke check that should have caught it was reading the state the window held rather than the cards it drew; it now reads the cards.
- **Desk names the interface accepts, the parser refused.** Formatting validated two of an address's five fields. `Edwin's desk` produced an address Deck itself rejected. Both ends now validate all five, and the grammar admits what a person types.
- **An unresolvable address moved Deck before failing.** The workspace was switched before the view was checked, so a refusal arrived after the move it was meant to prevent. Everything is resolved first now.
- **A sidecar Deck started could be dropped without being stopped.** Forgetting an unreachable sidecar deleted the handle the shutdown iterates, so the child outlived Deck. Forgetting one of ours now stops it; a borrowed one is still left alone.
- **Two acceptance criteria no longer matched the code** and were amended with the reason rather than ticked to fit.

**A second pass approved all four features it gated**, and re-tested the proxy hardest: twenty attacks from a network address against the host bound beyond loopback, with a recorder in front of a live sidecar. None reached it. Two of the reviewer's own mutations survived — the ordering of the allow-list check, and an early return in the state normaliser — and in both cases another guard already covers the behaviour, so they are redundancy rather than holes. They are recorded here rather than fixed.

**The review ran against a moving tree, which is a fault of the process and not of the reviewer.** Files changed under it twice while it worked, and one of its findings was closed by a commit that landed mid-pass. A recorded verdict is supposed to point at particular code; the verdicts here name the commit they were taken at. Next time the tree stops moving for the duration.

## Follow-ups

- [ ] Three acceptance walks are owed, and each needs something a machine has not got: the side-by-side comparison with the cockpit ([[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]), a second monitor ([[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]]) and a tablet ([[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]).
- [ ] Deck has no terminal, no agent instrumentation and no fleet roll-up. Those are main-process concerns the cockpit carries and no exit criterion of [[PHASE-0001-Deck]] measures them; they are named in [[FEAT-0002-Deck-Opens-A-Workspace]]'s scope so their absence is a decision.
- [ ] Deck is not packaged. It runs from the repository with `npm start`.
