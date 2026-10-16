---
type: "[[task]]"
id: TASK-0171
title: "The smoke run reads this repository's notes as they stood at a pinned commit, so a new note cannot change what its checks pick"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'go with option 1, pin the smoke corpus'", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0170]]"]
tests: []
---

# The smoke run reads its notes at a pinned commit

## Problem

**The window smoke run reads this repository's live notes, so a new note can turn it red.** Filing ISS-0092 at triage put a new note first in the Issues view, and fourteen Glass checks failed on a commit that changed only notes ([[TASK-0170]] made two of the choices robust; ten checks still failed). Each check starts from whatever note the corpus puts in a given place, and the corpus grows every day.

## What changes

- **`npm run smoke` with no `--workspace` reads a pinned copy.** It clones this repository locally (`git clone --shared`, which copies no objects) into a temporary directory, checks out the pinned commit there, opens that as its workspace, and removes it when it quits. The pin is `SMOKE_CORPUS` in `desktop/src/main/smoke-support.ts`: `d296ebe`, the last commit whose smoke run passed before ISS-0092 was filed. The smoke's own writes land in the copy, never in the working tree.
- **`--workspace <path>` still names a workspace to read live,** and `--live-corpus` runs the default workspace live.
- **The window run (`--drive`, TST-0093) is unchanged:** it measures the workspace as it is.
- **CI fetches the full history** (`fetch-depth: 0` in `.github/workflows/deck-smoke.yml`), so the pinned commit is there. A clone without it fails at once and says how to fetch it.

## Definition of Done

- [x] `pinnedCorpus` clones at the pin and refuses, naming the fix, when the commit is missing; a node check in `smoke-support.test.mjs` covers both, and skips loudly in a shallow clone.
- [x] The smoke run says which commit its notes come from, and removes the copy when it quits.
- [x] CI's `deck-smoke` no longer fails the checks that depended on the corpus; whatever it still fails is named.

## Verification

`pinnedCorpus` and `SMOKE_CORPUS` are in `desktop/src/main/smoke-support.ts`; `prepareWorkspace` in `desktop/src/main/main.ts` uses them for a smoke run with no `--workspace` and without `--live-corpus`, logs the pin, and removes the copy on quit. `smoke-support.test.mjs` checks the copy stands at the pin, holds no note filed after it, leaves the repository alone, and that a missing commit is refused with the way to fetch it; 792 node tests pass. CI's `deck-smoke` on `1fd54a4`, the first run on the pinned notes: none of the checks that depended on the corpus failed. Three still did, none naming a note filed after the pin: the document-growth timing check this issue was filed for (with "two rows were in reach", loopback), "V on its header gives it back to Features alone" (loopback only), and "a surface switch each leave the focus" (network only). The last two pass on one host and fail on the other, which points at timing; ISS-0092 carries them.
