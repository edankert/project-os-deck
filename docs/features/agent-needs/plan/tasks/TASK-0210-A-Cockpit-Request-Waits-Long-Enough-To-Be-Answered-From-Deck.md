---
type: "[[task]]"
id: TASK-0210
aliases: ["TASK-0210"]
title: "A cockpit request waits long enough to be answered from Deck, and the tests check the secret and the answerable flag by behaviour"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["FEAT-0034 independent review, round one, 2026-10-22: one reviewer asked for changes, one approved with a finding"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0204]]"]
tests: ["[[TST-0106]]"]
---

# A cockpit request waits long enough to be answered from Deck

**A permission request from a cockpit session would usually be gone before Deck's Needs you showed it.** Deck started its sidecar without an approval wait, so the sidecar held each request for its default of 5 seconds, while Deck read the requests every 15 seconds.

## What the reviewers found

- **The wait and the reading do not meet.** The cockpit's own shell passes the workspace's wait and follows the requests live. Deck passed none and read them every 15 s, so most requests went back to the cockpit's terminal unseen.
- **The check that only Deck's own sidecar gives its secret matched the source text.** Returning the secret for a borrowed sidecar kept the text and passed all 17 checks.
- **Nothing tested the line that decides whether a cockpit request gets buttons.** Setting it to true passed every check.
- The secret stayed in Deck's map after its sidecar stopped. It was harmless only because the record is checked first.

## Definition of Done

- [x] Deck's sidecar is started with the longest wait the cockpit allows, 30 seconds.
- [x] Needs you reads the requests every 3 seconds while the overview is open, and the git state at most every 15 seconds.
- [x] A test runs `secretFor` on a sidecar Deck started and on a borrowed one.
- [x] A test runs the needs call with a sidecar, borrowed and owned, and checks which requests get buttons.
- [x] A stopped sidecar's secret is forgotten.

## What was built (2026-10-23)

- `shellLine` in `desktop/src/main/sidecar.ts` writes `{"secret", "approval_wait_ms": 30000}`. 30 s is the cockpit's `APPROVAL_WAIT_MAX_MS`; the cockpit's own shell lets each workspace choose, and Deck has no such setting yet, so it asks for the longest.
- `agent-state.ts` reads Needs you every 3 s and the cockpit's sessions every 15 s, as before. The main process answers git's commands from `cachedGit` for 15 s.
- The supervisor's `drop` forgets a sidecar's secret with its record, on exit, on a failed start and on stop.
- [[TST-0106]] has 21 checks. The source-text match for "only a sidecar Deck owns gives its secret" is gone; a check runs `secretFor` on an owned and a borrowed record instead. A check runs the needs call against a stand-in sidecar, with and without the secret. Six guards were each broken once on the committed code, and a check failed for each.

Not checked by a test: that the window really reads Needs you every 3 s. That is a timer's constant in the renderer, which no suite runs.

**After round two (2026-10-23).** Both reviewers found that no check failed when the start path wrote the old line without the wait. A check now starts the supervisor with a stand-in interpreter that records its standard input, and finds the secret and `approval_wait_ms: 30000`; with the old line put back, it fails. [[TST-0106]] has 22 checks.
