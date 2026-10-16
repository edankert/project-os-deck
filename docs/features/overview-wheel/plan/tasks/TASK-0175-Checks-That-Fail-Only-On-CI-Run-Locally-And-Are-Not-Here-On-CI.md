---
type: "[[task]]"
id: TASK-0175
title: "Smoke checks that pass in the container and fail only on CI run locally, and on CI are reported as not here"
status: cancelled
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'Can you not run the tests locally first?'", "Edwin 2026-10-16: 'That means that these tests should be enabled locally and should be turned off for ci'", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: XS
due: ""
depends: []
blocks: []
related: ["[[TASK-0172]]", "[[TASK-0174]]"]
tests: []
---

# Checks that fail only on CI run locally

**Five smoke checks pass in the smoke container and fail only on CI's runners, so they are back, run locally, and reported as not here on CI.** Edwin: "these tests should be enabled locally and should be turned off for ci". They are the four Spread checks [[TASK-0174]] removed (the same desk at the same positions, a buried card brought forward, a card dragged in Spread with the panes still held on switching back, and a card on Features saying it is not in this view) and "a surface switch" as a way out of the focus, which [[TASK-0172]] removed.

- **`ON_CI`** in `desktop/src/main/smoke-glass.ts` is true when `CI=true`, which GitHub sets and the smoke container does not.
- **On CI each is `notHere`, with the reason** "runs locally only (Edwin, 2026-10-16: fails on CI's runners and passes in the smoke container; ISS-0092)". A not-here check is printed and does not count against the run. This stretches `smokeVerdict`'s rule that not-applicable means a different invocation: by Edwin's decision, CI counts as one.
- **The two checks that failed in the container too stay removed:** the orbit turning to face a note, and Spread's hide button.

## Definition of Done

- [ ] The five checks run in the smoke container and pass there.
- [ ] On CI they are reported as not here, and `deck-smoke` passes.

## Verification

Not done: the premise did not hold. With the five checks restored, the smoke container failed them too on 2026-10-16: on its network run "Spread shows the same desk at the same positions", "two cards overlap in Spread" ("a desk 0 px wide") and "a card in Spread could be pressed", and on its loopback run "in Spread on Features it is a card that says it is not in this view", with "V on its header gives it back to Features alone" failing after that Spread visit though it passed without it. The first container run had passed them all, so they fail on and off in both places, not only on CI. The restore was not committed; the smoke stays as it is at `f649ff8`, where both halves pass in the container and on CI. The five remain removed, named in ISS-0092.
