---
type: "[[issue]]"
id: ISS-0041
aliases: ["ISS-0041"]
title: "A change that leaves a note's modification time alone updates Deck's records and raises no revision, so every window keeps a stale picture it believes is current"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The second independent review of PHASE-0001, 2026-09-09, finding 4 — reproduced and still unfixed at the third review, which is why it now has a note"]
severity: medium
component: main
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[ISS-0030-A-Non-Markdown-Change-Rebuilds-The-Index]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The index takes the change and does not tell anybody

## Problem

`sameRecords` in `desktop/src/main/note-index.ts:320` compares two things: the path and the modification time. A rebuild that finds the same paths with the same timestamps concludes nothing changed and raises no revision — while the records it just built, and stored, hold the new content.

The review drove it with an `io` whose timestamps are frozen: a note's `status` moved from `triage` to `fixed`, the index's `revision` stayed at 1, and `onChange` fired once for the file event and never for the content. Every window is then showing the old status and has no reason to ask again.

It is not a hypothetical timestamp: `rsync --times`, `cp -p` and a restore from a backup all put content back under a timestamp that is not now.

## Why it was not fixed the first time

It was finding 4 of the second review. Six issues were filed out of that pass — [[ISS-0031-The-Path-Prefix-Reaches-The-Evaluator-Unguarded]] through [[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]] — and this was not one of them. The third review reproduced it unchanged. A finding with no note is a finding nobody owns.

## Cause

The comparison was written for cost: the docstring says comparing whole records would mean "comparing every frontmatter value of 2715 notes to answer a question the file system already answered". The file system answers a different question — whether the file was written — and Deck needs to know whether what it holds changed.

## Fix

Give each record a digest of what Deck actually holds — its frontmatter and its title — computed once while the note is being parsed, and compare that. It is a string comparison per note on a rebuild, not a deep walk, and it is exact for everything Deck can show.

## Acceptance

- [x] A content change under an unchanged modification time raises the revision — evidence: index.test.mjs, two checks: the one-file route and the full rebuild (user:edwin, 2026-09-09)
- [x] A rebuild that finds nothing changed still raises nothing (ISS-0030 stays fixed) — evidence: two more checks in the same suite, on both routes (user:edwin, 2026-09-09)
- [x] Reverting the digest comparison turns a check red — evidence: four mutations, four killed (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**Each record carries a digest of what Deck holds** — its frontmatter and its title, hashed once while the note is parsed. `sameRecords` compares the path, the modification time and that digest, so a change under a preserved timestamp is a change. It is a string comparison per note, not the walk of every frontmatter value the original comment was written to avoid.

**A second defect came out of fixing this one, on the other route.** The index has two: a full rebuild, and a re-read of the one file a watcher named. The one-file path set `changed = true` for every event it was handed, without comparing anything — so a second event for a file that had not moved since the first told every window its picture was old. That is [[ISS-0030-A-Non-Markdown-Change-Rebuilds-The-Index]]'s complaint on a route ISS-0030's fix never reached. Both paths now compare.

**And the first check written for this was on the wrong route.** `noticed('a.md')` takes the one-file path, so reverting the rebuild path's digest comparison went red nowhere. Four checks now, one per route per direction.

**Evidence.** Four mutations, four killed: the rebuild comparison dropping the digest (1 red), the one-file path assuming a change (1), a constant digest (2), and a rebuild that always raises (2).

## Two corrections and a widening, 2026-09-09

The fourth review drove this rather than reading it, and three sentences above did not survive ([[ISS-0047-The-Digest-Note-Claims-More-Than-The-Digest-Does]]).

**`git checkout` and `git stash` do not preserve a modification time.** Both set it to now, measured. The causes that really preserve one are `rsync --times`, `cp -p` and a restore from a backup, and the list above is corrected. The defect is real and fires less often than this note first claimed.

**The comparison can only add changes, never subtract one.** An earlier version of this close-out said the one-file fix stops "a save that wrote the same bytes" raising a revision. It does not: `moved` is an OR over the time and the digest, and rewriting a file moves the time. What the one-file fix stops is a second event for a file that has not moved since the first — which is what an editor's atomic write produces, and which is why the fix is worth having, but it is a smaller claim.

**And the digest now covers the whole file, not the frontmatter and title.** That was the third correction: Deck shows the rendered body, so a prose edit under a preserved timestamp changed what a person reads and told no window it was stale. Hashing the file instead costs 12 milliseconds across Your Trainer's 2,726 notes and 9MB, on a full rebuild only. Two more checks drive it, one per route.
