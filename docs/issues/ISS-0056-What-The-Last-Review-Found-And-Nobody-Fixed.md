---
type: "[[issue]]"
id: ISS-0056
aliases: ["ISS-0056"]
title: "The seventh review approved all three features and found eight things nobody fixed, the largest being that the smoke run is gated by a workflow that has never executed"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The seventh independent review of PHASE-0001, 2026-09-09"]
severity: medium
component: tests
parent: ""
related: ["[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]", "[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]", "[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0013-The-First-Write]]"]
tests: []
---

# Eight findings, filed rather than fixed, by decision

## Why this note exists instead of eight fixes

Edwin decided on 2026-09-09 that the seventh review would be the last, and that whatever it found would be reported rather than fixed. Six rounds had each found real defects, and each round's fix had produced the next round's finding. This note is what that decision preserves; grooming decides what happens to it.

**Nothing here is a behaviour a person using Deck can reach.** The reviewer said so explicitly, and it is the reason all three features were approved.

## The one that matters

**The smoke run is gated by nothing that has ever executed.** Four guards — the content policy, the reason box, the refused design verdict and the tick control — live only in `npm run smoke`. [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] carries no `command:`, and `run-tests.py` skips a note with an empty one *outright*: it is not listed, counted, or reported as a gap. `.github/workflows/deck-smoke.yml` does not exist on the remote — `gh run list --workflow deck-smoke.yml` answers `HTTP 404: not found on the default branch`, because 26 commits are unpushed and the last CI run of any kind was 2026-09-07.

So those four guards rest on `last_verified: 2026-09-09` and somebody's memory. That is an honest record under `STATUSES.md` and the reviewer re-ran the command at exit 0 the same day — but TST-0037 is the only note in this repository that is `passing` on a person's word.

**Pushing is what settles it**, and it is the first thing to do next.

## The rest, in order

- **`loadQueryView` can be emptied with every gate green.** Dead code until the Vault phase makes it live, which is why it is not higher.
- **The tick's no-address refusal can be deleted** with 322 of 322 and the smoke at exit 0. It is the message a person sees when the sidecar could not match a note's checkboxes to its source lines.
- **`typeCounts` is called from nowhere**, and it is the mechanism [[FEAT-0011-Decks-Own-Index]]'s first criterion names.
- **`deck-smoke.yml`'s header describes the world before [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]]** in three statements — in the file that is now the only gate.
- **`window.__deckOpenNote` is dead code** whose comment says the smoke run uses it. It does not; the tick check clicks a navigator row instead.
- **The comment saying "unfold the groups first" folds them.** `.twist` toggles, and instrumenting it showed the expanded set going from three folded to three unfolded and two unfolded to folded. The check passes because enough rows end up rendered, not because the line does what it says.
- **The fixture has decayed by 20 notes**, all of them written by these reviews.
- **Stale numbers again**: `199/2715` in FEAT-0011's "Where this stands"; six-should-be-seven and ten-should-be-twelve in FEAT-0012's.

## What the reviewer said about the pattern, kept because it is the argument for stopping

Rounds three through six found defects in shipped code. This one found gaps in gates and errors in prose. That is what a converged review looks like.

## Next Actions
- [ ] Push, and see `deck-smoke.yml` run for the first time
- [ ] Decide whether the four smoke-only guards need a gate that runs without a person
- [ ] Groom the seven smaller findings, or close this note saying they are accepted

## Four of these were my own code describing itself wrongly, and are corrected, 2026-09-09

Not a review round — an inaccuracy in a comment is the same class of fault as an inaccuracy in a note, and three of these were written by the commits that closed the sixth pass.

- **The comment saying "unfold the groups first" now says what `.twist` does**, which is toggle: it also folds any group that was already open. The check works because enough rows end up rendered, and it says so.
- **`window.__deckOpenNote` is gone.** It was a renderer seam added while trying five routes to open a note; the route that worked clicks a navigator row instead, and the seam was left behind with a comment claiming the smoke run used it. Dead code in the renderer with a false comment on it is worse than no seam.
- **`.github/workflows/deck-smoke.yml`'s header describes the world it is in.** It said `run-smoke.sh` was TST-0037's `command:`, that the script fetches Electron, and that Electron downloads twice per push — all three untrue since [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]]. It now says the thing that matters: this is the only gate these checks have, and it has never run.
- **The two stale counts are gone rather than refreshed.** FEAT-0011 said 199 notes here and 2715 in Your Trainer; FEAT-0012 counted the vault's base files. Both now name the script that prints today's figure, which is the rule [[ISS-0052-A-Fourth-Round-Of-Numbers-That-Do-Not-Reproduce]] settled on after four rounds of correcting numbers into new wrong numbers.

**Still open and deliberately not fixed:** `loadQueryView` can be emptied with every gate green (dead until [[PHASE-0003-Vault]] makes it live), the tick's no-address refusal can be deleted, `typeCounts` is called from nowhere, the fixture has decayed by 20 notes, and the largest one — the smoke run is gated by a workflow that has never executed.

**Verified after:** 322 node checks, both smoke configurations at exit 0.
