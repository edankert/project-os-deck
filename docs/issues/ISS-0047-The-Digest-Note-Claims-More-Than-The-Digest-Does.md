---
type: "[[issue]]"
id: ISS-0047
aliases: ["ISS-0047"]
title: "The note explaining why records carry a digest names two causes that do not happen, claims a benefit the code does not deliver, and says the digest covers everything Deck shows when it does not cover the body"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fourth independent review of PHASE-0001, 2026-09-09, finding 5"]
severity: medium
component: docs
parent: ""
related: ["[[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]]", "[[FEAT-0011-Decks-Own-Index]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The digest is right; three sentences about it are not

## Problem

The code is sound — the review drove it and every mutation still dies. What does not survive being run is the reasoning written around it.

**Two of the four causes named do not preserve a timestamp.** [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]] lists `git checkout`, `git stash pop`, a restore and `rsync --times`. Measured: `git checkout -- f.md` sets the modification time to now, and so does `git stash`. Only `rsync --times`, `cp -p` and a restore preserve one. The defect is real and the list overstates how often it fires.

**A benefit is claimed that the code does not deliver.** ISS-0041's close-out says the one-file path's fix stops "a save that wrote the same bytes" telling every window its picture was old. Driven: rewriting a file with identical bytes still raises the revision, because `moved` is an OR over the modification time and the digest, and rewriting moves the time. The digest can only add changes, never subtract one the timestamp already reported.

**And "exact for everything Deck can show" is wrong.** The digest covers the frontmatter and the title. Deck shows the rendered body, which it fetches from the sidecar. A body edit under a preserved modification time changes what a person reads and raises no revision, so a second window showing that note is never told it is stale.

## Fix

Correct the two sentences. Decide the third: either widen the digest to the whole file text, or state the boundary — the index tracks what it holds, the reader fetches the body fresh on open, and a stale reader is only possible for a body edit under a preserved timestamp.

## Acceptance

- [x] ISS-0041 names only causes that preserve a modification time — evidence: git checkout and git stash both set mtime to now, measured; removed (user:edwin, 2026-09-09)
- [x] It no longer claims a benefit the code does not deliver — evidence: the OR can only add changes; the smaller true claim is stated (user:edwin, 2026-09-09)
- [x] What the digest does and does not cover is stated where somebody changing it will read it — evidence: records.ts and note-index.ts, and the digest is now over the whole file (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

Two sentences corrected and the third answered by widening the code rather than narrowing the claim.

**The causes.** `git checkout` and `git stash` both set the modification time to now — measured, not assumed. [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]] now names only `rsync --times`, `cp -p` and a restore from a backup. The defect is real and fires less often than that note first said.

**The claim.** The comparison is an OR over the time and the digest, so it can only ADD changes, never subtract one: rewriting a file with identical bytes still raises the revision, because rewriting moves the time. What the one-file fix actually stops is a second event for a file that has not moved since the first, which is what an editor's atomic write produces. Both the note and the comment in `note-index.ts` say the smaller, true thing now.

**The body.** Rather than write down a caveat, the digest is over the whole file text. Hashing it costs 12 milliseconds across Your Trainer's 2,726 notes and 9MB, on a full rebuild only, which is not worth a hole a person would meet as "the other window never told me". Two checks drive it, one per route: a prose edit under a frozen timestamp, with the frontmatter and the first heading unchanged, now raises the revision.

**Evidence.** The code always survived; this note is about the prose, and the widening is guarded by the two new checks. Reverting the digest to the frontmatter and title fails both.
