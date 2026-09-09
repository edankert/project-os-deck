---
type: "[[issue]]"
id: ISS-0036
aliases: ["ISS-0036"]
title: "Six numbers written into the close-out notes do not reproduce when the reader re-runs them, in a repository whose whole argument is that a measurement beats a claim"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: low
component: docs
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[CHG-20260909-Deck-Reads-Describes-And-Writes]]"]
tests: []
---

# The wrong number in a note that exists to carry the right one

## Problem

The close-out notes of 2026-09-09 quote measurements a reader can re-run, and six of them do not come back.

**Four mutation counts.** ISS-0025 says reverting it "fails three checks"; it fails one. ISS-0026 says four; it is one. ISS-0027 says "one, two and four" for its three fixes; each is one. ISS-0030 says four; it is one. The cause is a misread: the mutation script printed a whole-file failure line and the counts were taken from the wrong column. Only ISS-0024's "two" is exact.

**Two counts of things.** "Twenty-two of Your Trainer's notes" lose their relationship fields; the measured number is fourteen. TASK-0044 says the vault has "143 notes carrying a status"; it is 126.

**Why this matters more here than it would elsewhere.** Every one of these sits in a sentence arguing that a measurement is better than a claim — and a wrong measurement is worse than a claim, because it invites a reader to stop checking. The same notes carry numbers that are exact and load-bearing, and a reader has no way to tell which is which.

## Two more things a note should carry and does not

**The case-sensitivity change has a consequence nobody wrote down.** Making `==` case-sensitive was right, and it silently empties every TaskNotes view over a project-os repository: `note.type == "[[Task]]"` selected fifty-three notes here before and none after, because project-os writes `type: "[[task]]"`. That is correct behaviour and a surprising one.

**And the premise carries no citation.** "Obsidian's `==` is case-sensitive" is asserted in the code and in three notes, and nothing says how it was established.

## Next Actions
- [ ] Re-measure the six and correct them, or stop quoting numbers that are not re-run
- [ ] Record the case-sensitivity consequence where somebody will meet it
- [ ] Cite the premise, or say it is an assumption

## Corrected, 2026-09-09

**Every mutation count in the close-out notes is now measured by a script rather than typed**, and the six wrong numbers are corrected in the notes that carried them. The cause was reading a whole-file failure line as a per-check count; the script prints the number that goes in the note, and it is re-run rather than remembered.

The measured counts, over the whole suite:

| reverting | checks that go red |
| --- | --- |
| ISS-0024, the reader breaking on a dash | 2 |
| ISS-0025, the scan stripping block-scalar lines | 2 |
| ISS-0025, escapes read by a chain | 2 |
| ISS-0027, `contains` as equality | 1 |
| ISS-0027, `hasLink` ignoring its receiver | 2 |
| ISS-0027, equality lower-casing | 1 |
| ISS-0027, `file.path` dropping the prefix | 3 |
| ISS-0030, a no-op rebuild raising | 1 |
| ISS-0031, `pathPrefixFor` returning nothing | 2 |
| ISS-0031, the host's answer dropping it | 1 |
| ISS-0032, the navigation condition inverted | 1 |
| ISS-0032, a `file:` URL handed outward | 1 |
| ISS-0033, `hasLink` not reporting | 1 |
| ISS-0034, values not compared | 1 |
| ISS-0034, a silent unreadable read | 1 |
| ISS-0035, stopping on the owner's indent | 1 |
| ISS-0035, the chomping indicator ignored | 1 |

**Seventeen mutations, seventeen killed.** Two of them survived the first run of this and are the reason [[ISS-0035-Two-New-Block-Scalar-Misreads]] has checks at all.

**The two counts of things are corrected where they were written.** "Twenty-two of Your Trainer's notes" is fourteen. "143 notes carrying a status" in the vault is 126.

**The case-sensitivity consequence is recorded** in [[TASK-0043-The-Evaluator-Over-The-Index]], where somebody changing that rule will meet it: making `==` case-sensitive silently empties every TaskNotes view over a project-os repository, because those files filter on `note.type == "[[Task]]"` and project-os writes `type: "[[task]]"`. That is correct behaviour and a surprising one.

**And the premise is cited.** `desktop/src/shared/expression.ts` now says how "Obsidian's `==` is case-sensitive" was established — by measurement against the vault's own files rather than from documentation, which is a weaker footing than a citation and is said to be.
