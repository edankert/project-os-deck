---
type: "[[issue]]"
id: ISS-0026
aliases: ["ISS-0026"]
title: "The check that Deck and the sidecar agree about every note skips any note Deck failed to index, so hiding a sixth of the corpus still passes it"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: high
component: tests
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# A comparison that cannot see what is missing

## Problem

**`desktop/tests/index.test.mjs` walks the fixture's paths and skips any that Deck did not index** — `if (record === undefined) continue` — with nothing but a `compared > 150` floor against 199 paths. So a change that stopped Deck indexing a whole directory would pass the check whose entire purpose is [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]].

Demonstrated by the review: with `isExcluded` mutated to hide `issues/` and `reference/`, Deck indexed **169 of 200** notes and "Deck calls every note in this repository what the sidecar calls it" still passed.

**The skip is there for a good reason and needs a companion, not removal.** A note DELETED since the fixture was recorded is not a disagreement, and both repositories gain and lose notes daily. What is missing is the other question: a fixture path that is still on disk and that Deck did not index is a disagreement, and a loud one.

**The comparison is also `type`-only**, so [[FEAT-0011-Decks-Own-Index]]'s claim to agree "about all 199 notes, path by path" is wider than what runs. On Your Trainer the two also disagree about fourteen notes' `updated` and seventy-six keys — which is [[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]] seen from the other side, and this check is why nobody saw it.

## Expected

A fixture path that exists on disk and has no record fails by name. What is compared is more than the type.

## Next Actions
- [ ] Fail on a fixture path that is present on disk and absent from the index
- [ ] Compare the keys as well as the type, with the same rules for a named difference

## Fixed, 2026-09-09

**A fixture path that is still on disk and has no record now fails by name.** The skip stays, because a note DELETED since the fixture was recorded is genuinely not a disagreement and both repositories lose notes; what was missing is the other question, and it is asked now.

**The comparison reads the KEY SET as well as the type.** The fixture records, per note, the sorted frontmatter keys PyYAML read — stored as an index into a shared list of shapes, because 2924 notes share 360 of them, so the whole key set costs about what a list of paths costs. A note whose keys differ fails and the message prints both sides.

**That is what makes [[FEAT-0011-Decks-Own-Index]]'s claim true rather than wide.** Deck and the sidecar now agree about every key of every note in both corpora, with no note indexed by one and not the other — which is a bigger claim than the one the note was making, and it is checked.

**Evidence.** Two new checks drive the failures directly, over temporary workspaces, because what they guard is a note that is ABSENT and an absent thing is what a loop over what is present cannot see. Reverting the missing-note check fails four.
