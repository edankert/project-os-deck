---
type: "[[risk]]"
id: RISK-0001
aliases: ["RISK-0001"]
title: "A second sidecar on the same repository takes over the cockpit's focus routing"
status: closed
owner: user:edwin
created: 2026-09-06
updated: 2026-09-09
source: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: high
impact: medium
mitigation: ["[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]"]
related: ["[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[PHASE-0001-Deck]]", "[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]", "[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]"]
---

# A second sidecar on the same repository takes over the cockpit's focus routing

## Description

The sidecar writes a discovery file, `.cockpit/url`, into the repository when it starts, and removes it when it exits. The `cockpit` command-line tool reads that file to decide which running server to talk to. Two sidecars on one repository means the last one to start owns the file, so opening a workspace in Deck while the cockpit has it open would quietly point `cockpit focus` at Deck's sidecar. Nothing reports this. The person sees commands that appear to work and a cockpit that never moves.

## What makes it likely

Deck and the cockpit are meant to be open at once during this phase, on this repository, because the first exit criterion is a side-by-side comparison of what each shows.

## Mitigation

[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]] reuses a sidecar that is already running rather than starting a second one. Deck reads `.cockpit/url`, asks `/api/cockpit/identity`, and accepts the answer only when the root it reports is the workspace Deck is opening. Deck starts its own sidecar only when no live one answers, and it stops only the sidecars it started.

## Triggers

`cockpit focus` moves a window that is not the cockpit's. A sidecar Deck did not start exits while Deck is using it, and Deck shows an empty workspace instead of re-resolving; that re-resolution is part of the same task's definition of done.

## Closed, 2026-09-07

**Deck never starts a second sidecar on a repository that already has one, so the routing file has one owner.** The risk is closed with [[PHASE-0001-Deck]], the phase that carried it, and the mitigation is in the shipped code rather than in a plan.

`desktop/src/main/sidecar.ts` reads the repository's `.cockpit/url`, calls `/api/cockpit/health` and then `/api/cockpit/identity`, and borrows that sidecar only when the root it reports resolves to the workspace Deck is opening. A borrowed handle is marked `ownedByDeck: false`, and `stopOne` sends no signal to a sidecar Deck did not start. Deck starts its own only when nothing answers.

Two checks in `desktop/tests/sidecar-client.test.mjs` guard it, under the heading that names this risk: one asserts a running sidecar for the workspace is reused and the handle is not marked as Deck's, and one asserts a sidecar reporting a different root is refused rather than borrowed. A third asserts that stopping sends no signal to a borrowed process. They are part of [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]].

**Two faults found later were about starting a sidecar, not about capturing the cockpit's routing**, and both are fixed: a port Deck offered that Python could not bind ([[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]), and two Deck windows opening one workspace at the same moment and killing each other's sidecar ([[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]). Neither was a case of Deck taking over a sidecar the cockpit owned.

**What would reopen it.** The trigger stated above still holds: if `cockpit focus` ever moves a window that is not the cockpit's while Deck is running, this note comes back to `open`.

## Reopened, 2026-09-08

**It happened.** Deck started a second sidecar on `your-trainer` while the cockpit was serving it, and `your-trainer/.cockpit/url` was rewritten to Deck's port — the routing file with two owners this note is about. Deck then exited and left the file naming a port nobody is listening on, with the cockpit's own sidecar still running and nothing pointing at it.

The mitigation above is real and it has a hole: `alive()` compares `path.resolve(identity.root)` with `path.resolve(root)` as strings, and macOS's filesystem is case-insensitive, so one directory reached as `/Users/edwin/...` and as `/Users/Edwin/...` reads as two. The guard refused a sidecar that was serving exactly the workspace Deck was opening. Both checks in `desktop/tests/sidecar-client.test.mjs` pass, because both spell their paths the same way.

[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]] carries the evidence and the two decisions it needs. This note goes back to `closed` when a check exists that would have caught it.

## Closed again, 2026-09-09

**The check that would have caught it exists, and the hole is filled.** Deck now compares two DIRECTORIES rather than two path strings: `realDirectory` in `desktop/src/main/paths.ts` asks the file system for the spelling that is on disk, so `/Users/edwin/...` and `/Users/Edwin/...` reach one answer. The three places that decide "is this the same repository" — the sidecar reuse guard, the workspace id, and the workspace book — all read it.

`desktop/tests/workspace-paths.test.mjs` is the check this note was waiting on ([[TST-0035-One-Directory-Is-One-Workspace-However-Its-Path-Is-Spelled]]). Its load-bearing case runs a sidecar that reports the other spelling of the workspace's own path and asserts Deck borrows it; reverting the fix fails that case and three others. The refusal case beside it asserts a sidecar on a different repository is still refused, so the fix cannot be "borrow anything".

**The trigger is unchanged.** If `cockpit focus` ever moves a window that is not the cockpit's while Deck is running, this note comes back to `open` a third time.
