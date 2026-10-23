---
type: "[[task]]"
id: TASK-0210
aliases: ["TASK-0210"]
title: "A cockpit request waits long enough to be answered from Deck, and the tests check the secret and the answerable flag by behaviour"
status: doing
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

- [ ] Deck's sidecar is started with the longest wait the cockpit allows, 30 seconds.
- [ ] Needs you reads the requests every 3 seconds while the overview is open, and the git state at most every 15 seconds.
- [ ] A test runs `secretFor` on a sidecar Deck started and on a borrowed one.
- [ ] A test runs the needs call with a sidecar, borrowed and owned, and checks which requests get buttons.
- [ ] A stopped sidecar's secret is forgotten.
