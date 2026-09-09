---
type: "[[issue]]"
id: ISS-0052
aliases: ["ISS-0052"]
title: "A fourth consecutive round of numbers that do not reproduce, including the count written to replace the last one, so the rule changes from re-run it to do not write it"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fifth independent review of PHASE-0001, 2026-09-09, finding 6"]
severity: low
component: docs
parent: ""
related: ["[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]]", "[[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]]", "[[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]]"]
tests: []
---

# Four rounds, four sets of wrong numbers, and the answer is to stop writing them

## Problem

- **TST-0026's corrected count is wrong the same way the one it replaced was.** It says 201 / 2,704 / 386; today the script says 207 / 2,705 / 386. The difference is six, which is exactly the six notes that commit added — a pre-commit count written into a post-commit note, for the second time in a row. [[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]]'s ticked criterion does not hold.
- **`desktop/src/shared/records.ts` says "3,351 notes in three corpora"**; HEAD gives 3,358.
- **Three mutation counts understate.** "A verb Deck cannot perform offered anyway (2)" is 4; TST-0037's `adequacy` says "fails 3" where it is 4; "every row claiming to confirm (2)" is 4. Three others reproduce exactly.
- **TST-0028's step table has two rows numbered 7.**

## The rule that has not worked

[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]] said: read numbers from a script, not a screen. [[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]] said: make the script print every number the note quotes. [[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]] said: lead with the shape, not the size. Each was right and each was followed, and the numbers were wrong again — because a count of this repository, printed before a commit and read after it, is stale by the length of the commit.

## Fix

**Do not write a corpus count into a note in this repository.** Name the script and what it asserts; a reader who wants the size runs it. Numbers that do not move — how many checks a mutation kills, how many views a base file has — stay, and are re-measured at the moment of writing rather than recalled.

## Acceptance

- [x] No note in this repository states a count of this repository's notes as a standing fact — evidence: TST-0026 and records.ts now cite the script (user:edwin, 2026-09-09)
- [x] The three mutation counts match a re-run — evidence: one sweep at a729559; three of six differed and were rewritten (user:edwin, 2026-09-09)
- [x] `records.ts` cites the script rather than a number — evidence: it names check-counts-live.py's corpora (user:edwin, 2026-09-09)
- [x] TST-0028's step table numbers each row once — evidence: the design row reads 7, again (user:edwin, 2026-09-09)

## Corrected, 2026-09-09

**No note in this repository states a count of this repository's notes as a standing fact.** TST-0026 says what the script asserts — no note read as different types, no type whose totals differ — and points at the script for figures. `records.ts` cites the corpora rather than a number. The counts that stay are ones that do not move: how many views a base file has, how many checks a mutation kills.

**Why the rule changed rather than being repeated.** Three rules were written and each was followed: read the number from a script, make the script print every number quoted, lead with the shape not the size. The numbers were wrong all three times, because a count of a growing corpus measured before a commit and read after it is stale by the length of that commit — and twice the stale number was the one written to replace the last stale number. The rule that works is not to write it.

**The mutation counts are re-measured**, in one sweep at commit `a729559`, and TST-0037's `adequacy` names the commit so a later reader can tell whether the checks have changed shape underneath the numbers. Six mutations, six killed: the content policy deleted (2 red), `canPerform` true for every row (5), `applyVerb`'s refusal deleted (2), the dead verb left enabled (1), every row claiming to confirm (4), the reason box back inside the confirmation (2). Three of those six differ from what the close-outs said before this, which is why they were re-run rather than copied. **TST-0028's step table numbers each row once.**
