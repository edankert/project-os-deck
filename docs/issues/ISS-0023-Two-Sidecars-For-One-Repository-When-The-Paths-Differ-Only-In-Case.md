---
type: "[[issue]]"
id: ISS-0023
aliases: ["ISS-0023"]
title: "Deck starts a second sidecar for a repository the cockpit already has open when the two spell the home directory differently, and that sidecar rewrites the repository's discovery file to its own port"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["Observed 2026-09-08 while starting Deck for the reopened walk of [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]"]
severity: high
component: main
parent: ""
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[RISK-0001-Deck-And-The-Cockpit-Compete-For-One-Sidecar]]"]
tests: ["[[TST-0035-One-Directory-Is-One-Workspace-However-Its-Path-Is-Spelled]]"]
---

# Two sidecars for one repository, because one path says `Edwin` and the other says `edwin`

## Problem

**Deck ran a second sidecar on a repository the cockpit was already serving, and then pointed that repository's discovery file at its own port.** The cockpit had `your-trainer` open on 8766. Deck started its own on 8901 for the same directory, and `your-trainer/.cockpit/url` — the file the cockpit and Deck both read to find a running sidecar — was rewritten to `http://127.0.0.1:8901`. When Deck went, the file was left naming a port nobody is listening on, while the cockpit's sidecar was still running on 8766 with nothing pointing at it.

**The cause is a case-sensitive comparison of two spellings of one path.** Deck will only borrow a sidecar whose reported root matches the workspace it wants: `path.resolve(identity.root) === path.resolve(root)` in `alive()`, `desktop/src/main/sidecar.ts`. `path.resolve` normalises separators and `..`, and does nothing about case. macOS's filesystem is case-insensitive, so `/Users/edwin/Dev/repos/your-trainer` and `/Users/Edwin/Dev/repos/your-trainer` are one directory and two strings. The cockpit launched its sidecar with the first spelling and Deck holds the second, so the guard says "not the same repository" about a repository that is the same.

The third expected result of [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] is exactly this claim, and it does not hold for a workspace whose path Deck and the cockpit spell differently.

## Repro

1. Open a repository in the cockpit whose path contains the home directory as `edwin`.
2. Add the same repository to Deck from a path that spells it `Edwin` — which is what a folder chosen through Deck's own dialog can produce.
3. Open it in Deck and read `pgrep -fl project_os_cockpit`, then `cat <repo>/.cockpit/url`.

## Expected

Deck borrows the sidecar the cockpit is running, says so in the status line, and never touches the discovery file.

## Actual

Two sidecars index the same repository. The discovery file names Deck's, and keeps naming it after Deck has gone.

## Evidence

Observed 2026-09-08, 08:37, on this machine:

```
93667 ... -m project_os_cockpit /Users/edwin/Dev/repos/your-trainer/docs --port 8766   (the cockpit's)
47829 ... -m project_os_cockpit /Users/Edwin/Dev/repos/your-trainer/docs --port 8901   (Deck's)

$ curl -s 127.0.0.1:8766/api/cockpit/identity
{"root": "/Users/edwin/Dev/repos/your-trainer", ...}

$ cat /Users/edwin/Dev/repos/your-trainer/.cockpit/url
http://127.0.0.1:8901        # after Deck exited; nothing answers there
```

The same check succeeds for this repository, where both hold `/Users/Edwin/Dev/repos/project-os-deck`, and Deck borrowed the cockpit's sidecar on 8765 as designed. That is why the defect has not been seen before: it appears only when the two spellings differ.

## Two things to decide, not one

1. **The comparison.** Comparing resolved real paths (`fs.realpathSync.native`) answers what is actually being asked — is this the same directory — and is right on a case-sensitive volume too, where lowercasing would be wrong.
2. **The discovery file after a clobber.** A stale `.cockpit/url` naming a dead port is worse than none: the next Deck run reads it, finds nothing alive and starts another sidecar. Whether the file should be left alone by a second sidecar is a question for the cockpit repository, since the sidecar writes it.

## Fixed, 2026-09-09

**Deck now compares directories rather than path strings, in all three places it compares them.** `desktop/src/main/paths.ts` carries one function, `realDirectory`, which asks the file system for the spelling that is on disk (`fs.realpathSync.native` follows every symbolic link and returns the real case). Three callers use it:

- `alive()` in `sidecar.ts` decides whether a running sidecar is serving this repository. This is the defect itself: the cockpit reports `/Users/edwin/...`, Deck holds `/Users/Edwin/...`, and both now canonicalise to the one directory, so Deck borrows the running sidecar and never touches `.cockpit/url`.
- `describeWorkspace` and `workspaceIdFor` in `workspaces.ts`, so one directory has one workspace id whichever spelling reached it. Without this half, a folder picked through Deck's own dialog could sit in the rail twice, with two desks and two sidecars.
- `WorkspaceBook.add` and the roots read back from the settings file, so adding the same directory twice adds it once.

A path that will not resolve — a workspace on an unplugged drive — falls back to `path.resolve`, which is what every one of these comparisons did before, so nothing that worked stops working.

**The guard is not loosened.** A sidecar serving a different repository is refused exactly as before, and [[TST-0035-One-Directory-Is-One-Workspace-However-Its-Path-Is-Spelled]] asserts that alongside the borrow, so a fix of the shape "borrow anything" would fail.

**Evidence.** Six checks in `desktop/tests/workspace-paths.test.mjs`, driving real directories on the real file system because the defect lives in the difference between a string and a directory. Reverting the canonical spelling to `path.resolve` fails four of the six, including the borrow.

## The second decision: the stale discovery file

**Left where it is, and it belongs upstream in the cockpit.** A `.cockpit/url` naming a dead port is written by the sidecar, not by Deck, and Deck already survives one: `borrow()` calls `alive()` first and starts its own sidecar when nothing answers there. What the file costs today is a wasted health check. The change worth making — a second sidecar leaving another sidecar's discovery file alone — is a change to the cockpit's own start-up, and this issue does not make it here.

## Next Actions
- [x] Decide the comparison — real paths, resolved through the file system (`realDirectory`), 2026-09-09
- [x] Decide whether the stale discovery file is Deck's problem — it is the cockpit's, and Deck already survives one, 2026-09-09
