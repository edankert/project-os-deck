---
type: "[[issue]]"
id: ISS-0023
aliases: ["ISS-0023"]
title: "Deck starts a second sidecar for a repository the cockpit already has open when the two spell the home directory differently, and that sidecar rewrites the repository's discovery file to its own port"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["Observed 2026-09-08 while starting Deck for the reopened walk of [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]"]
severity: high
component: main
parent: ""
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[RISK-0001-Deck-And-The-Cockpit-Compete-For-One-Sidecar]]"]
tests: []
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

## Next Actions
- [ ] Decide the comparison (real path, or something narrower)
- [ ] Decide whether the stale discovery file is Deck's problem or belongs upstream in the cockpit
