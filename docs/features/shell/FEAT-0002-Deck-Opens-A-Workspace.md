---
type: "[[feature]]"
id: FEAT-0002
aliases: ["FEAT-0002"]
title: "Deck opens a workspace: an Electron shell that finds a repository, starts the sidecar and shows its notes"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "A person launches Deck, picks a workspace and sees that workspace's notes. This feature is the application itself: the Electron shell, the discovery that finds a project-os repository on disk, the sidecar process started for it, and a typed client that reads the sidecar over HTTP."
requirements: []
tasks: ["[[TASK-0006-The-Application-Builds-And-Boots]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[TASK-0008-Workspaces-Are-Found-And-Remembered]]", "[[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
---

# Deck opens a workspace

## Goal

A person launches Deck, picks a workspace and sees that workspace's notes. This feature is the application itself: the Electron shell, the discovery that finds a project-os repository on disk, the sidecar process started for it, and a typed client that reads the sidecar over HTTP.

## Scope

**In scope.** The Electron application and its build: one TypeScript compile, a main process, a preload bridge and a renderer that runs as plain modules in the page. Workspace discovery by the `SNAPSHOT.yaml` marker, with the list of known workspaces kept in Deck's own settings file. The sidecar started once per workspace on a free loopback port, waited for until it answers, and stopped when Deck quits. A typed read-only client with one method per sidecar endpoint Deck reads.

**Out of scope.** The embedded terminal, the agent instrumentation and the fleet roll-up. Those are main-process concerns the cockpit already carries and Deck does not need to open a workspace; no exit criterion of [[PHASE-0001-Deck]] measures them. They are named here so that their absence is a decision rather than an oversight.

**Out of scope.** Any write. The client sends `GET` and nothing else, which [[FEAT-0008-One-Renderer-Two-Hosts]] then enforces a second time at the network boundary.

## Acceptance

- Deck starts from a single command in the repository and opens a window.
- Deck recognises this repository by its `SNAPSHOT.yaml` and lists it as a workspace. **Amended 2026-09-06:** "finds" overstated it. A person adds a folder and Deck says what kind it is, or refuses it with the reason. Nothing scans the disk looking for repositories, and the cockpit stopped doing that too.
- Opening a workspace resolves one sidecar for it on a loopback port, reusing a running one where there is one. **Amended 2026-09-06:** the renderer never receives that base URL, because [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] replaced the direct call with a same-origin proxy. Both hosts read through `/deck/sidecar/<workspace>`, which is the point of the decision: one data path, not two.
- The renderer lists the workspace's notes, read through the sidecar, with each note's id, title and status.
- Quitting Deck leaves no sidecar process that Deck started. **Amended 2026-09-06:** a sidecar Deck borrowed is not Deck's to stop, and killing one would take down the cockpit's own ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0006-The-Application-Builds-And-Boots]], [[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]], [[TASK-0008-Workspaces-Are-Found-And-Remembered]], [[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]
- Plan: `docs/features/shell/plan/PLAN.md`

## Where this stands

**2026-09-06: built and tested; the acceptance walk is owed.** Every criterion above is checked by the suites and by the smoke run that boots the real application. The status is `review` rather than `done` because the walk that settles it for a person — adding a folder by hand, and looking for a leftover process after quitting — is [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]], and nobody has walked it yet.

**2026-09-07: the sidecar work moved on and this note did not, which is why the feature is still `review`.** Between the approval below and the phase's close-out, the code this feature owns gained four-port retry, per-workspace resolve coalescing and a readiness timeout raised from fifteen seconds to forty-five, with two new test notes ([[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]], [[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]). [[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]] now carries that account. The approval below predates all of it, so it cannot carry this feature to `done`.


**How the close-out pass's findings were discharged, 2026-09-09.** The third review noted that this section predated the fixes, so a reader working from the handoff surface alone could not tell they had happened.

| finding | note | where it stands |
| --- | --- | --- |
| the sidecar Deck started may outlive the quit | [[ISS-0021-The-Quit-May-Leave-A-Sidecar-Running]] | `fixed`. `stopOne`'s escalation is driven from a real quit in the smoke run, against a sidecar Deck started rather than borrowed, in a temporary workspace with no `.cockpit/url` |
| two sidecars on one repository, one path saying `Edwin` and the other `edwin` | [[ISS-0023-One-Directory-Two-Spellings]] | `fixed`. `desktop/src/main/paths.ts` resolves a directory to one spelling, and `sameDirectory` is what `alive()` and every workspace comparison asks |
| a workspace opened by hand was never walked | [[ISS-0022-A-Popped-Out-Desk-Draws-Nothing]] | `fixed`, and the note's own diagnosis was wrong: neither cause it named was real. `npm run smoke` simply never opened a workspace, so three checks reported on a window with nothing in it |

## Independent review — 2026-09-06 (second pass)

**Verdict: approved.** Clean context, separate session; same model family, recorded in `reviewed_by`. The first pass held this feature at changes-requested over two findings. Both are fixed, verified at commit `9b99c36` and re-confirmed at `2539206`.

- **A sidecar Deck started could outlive Deck.** `forget` used to drop the child's handle, and `stopAll` at quit iterates only what the map still holds. It now stops a sidecar Deck owns and leaves a borrowed one alone. Reproduced fixed: `forget` on an owned record emits `SIGTERM`; on a borrowed one it emits nothing. Removing the `ownedByDeck` branch fails the suite (1 failure), so the guard guards.
- **Two criteria the code no longer matched** are amended with rationale. "Finds" became "recognises", and the criterion no longer claims the renderer receives a sidecar base URL — it reads through `/deck/sidecar/<workspace>`, which is what ADR-0001 decided.

Verified live: `electron . --smoke --workspace .` boots, borrows the sidecar the cockpit already had running, draws 30 cards with id, title and status, and exits `ok: true`.

One note, not a defect. `defaultPython()` locates the cockpit's virtual environment by walking four directories up from `__dirname`. Running the built app from anywhere else silently falls back to a bare `python3`, and the failure then surfaces as "the sidecar exited before it answered" — the misdirection the function's own comment warns about. `DECK_PYTHON` is the escape hatch and it works.

## Independent review — 2026-09-07 (close-out pass)

**Verdict: changes-requested.** Clean context, separate session ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]). Three things hold this feature at `review`.

- **A read arriving while Deck is still starting a sidecar kills that sidecar** ([[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]). Reproduced with a stub sidecar and one proxied read. It is [[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]'s failure down a path that fix does not cover, and the served page is where it is reachable.
- **The approval below predates the code it covers**, which is the paragraph above under "Where this stands".
- **The walk that ticked the fifth criterion passed carrying a doubt.** The release ledger records Edwin's `pass` on [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] with the reason "I am not sure if it doesn't leave anything running when I quit???". The automated evidence is `desktop/tests/sidecar-client.test.mjs:380-421`, which asserts that `'SIGTERM'` was pushed onto an array by a stub object's `kill` — not that a process died. And `stopOne`'s SIGKILL escalation is a three-second `unref`'d timer, which cannot fire once the main process has gone, so a sidecar that is slow on SIGTERM does outlive Deck. Ticking that criterion on a walk whose stated reason is "I am not sure" is what `tools/instructions/QUALITY.md` calls ticking to fit.

## Independent review — 2026-09-09 (third pass)

**Verdict: approved.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. I re-derived the close-out pass's three findings rather than reading their close-out prose.

- **The sidecar that could outlive Deck is dealt with.** The close-out pass was right that `stopOne`'s SIGKILL escalation is an `unref`'d three-second timer that cannot fire after the main process has gone (`desktop/src/main/sidecar.ts:286-288`). That is no longer the whole story: `waitForExit` (`sidecar.ts:341`) runs from the quit, waits on the children `stopAll` signalled, and sends SIGKILL to whatever is left. The escalation now happens at a moment that exists.
- **The read that killed a starting sidecar** ([[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]) is `fixed`, and `npm test` reports 316 passing and 0 failing at this commit.
- **This note records no discharge, which is the finding that is left.** Its "Where this stands" and its two review sections all predate the fixes. A reader working from this note alone cannot tell that the close-out pass's three points were answered; only `docs/issues/` says so. Not blocking, and worth a line here.

**What I attacked in this feature's area and could not break.** Removing the `will-navigate` guard from `main.ts` — `void decision; return;` in place of the refusal — is caught by `npm run smoke`, which reports `ok: false` with three failures naming the page that left Deck's origin, the link handed to the browser, and the `file:` URL. That is [[ISS-0032-The-Navigation-Guards-Are-Checked-By-Grep]]'s fix doing its job on real Electron windows.
