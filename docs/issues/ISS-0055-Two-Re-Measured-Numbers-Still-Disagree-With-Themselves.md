---
type: "[[issue]]"
id: ISS-0055
aliases: ["ISS-0055"]
title: "A ticked criterion says two where the evidence four lines below it says four, and one date nobody can read would expire five exemptions for good"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The sixth independent review of PHASE-0001, 2026-09-09, findings 5 and 6"]
severity: low
component: docs
parent: ""
related: ["[[ISS-0052-A-Fourth-Round-Of-Numbers-That-Do-Not-Reproduce]]", "[[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]", "[[ISS-0051-Three-Checks-That-Can-No-Longer-Fail]]"]
tests: []
---

# The correction reached the prose and not the box above it

## Problem

**A note contradicts itself four lines apart.** [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]'s Evidence section says hard-wiring every row to confirm fails 4 checks, which is what a re-run gives. Its ticked acceptance criterion, immediately above, still says 2. The re-measurement of [[ISS-0052-A-Fourth-Round-Of-Numbers-That-Do-Not-Reproduce]] corrected the prose and not the evidence string stamped on the checkbox — and the checkbox is the half a reader trusts, because it is the one the validator gates on.

**And a number in [[ISS-0051-Three-Checks-That-Can-No-Longer-Fail]] is impossible rather than merely wrong.** It says `scheduled: 2026-12-01T09:00:00` "expires two" exemptions. It expires three, and two could never have been right: all five rows share one memoised condition object, so they expire together or not at all.

**Separately, one date nobody can read would expire everything for good.** `DATED_AHEAD.stillTrue` treats an unparseable date as grounds to withdraw the exemption, which is the right default — but a single `due: TBD` anywhere in the vault turns five views into failures that no edit to a base file can clear, and the summary line calls them "expired", which reads as *somebody scheduled something*. Latent: across the vault's 407 notes there are 67 `due:` and `scheduled:` values in 29 shapes and none of them fails the pattern.

## Fix

Correct the two numbers, in the criterion as well as the prose. And separate *the exemption expired because the data moved* from *the exemption cannot be confirmed because a date is unreadable* in what the script prints, so the second sends a person to the note rather than to the view.

## Acceptance

- [x] The evidence stamped on ISS-0045's criteria matches its Evidence section and a re-run — evidence: 4 checks, naming commit a729559 (user:edwin, 2026-09-09)
- [x] ISS-0051's date figure matches what the script prints — evidence: three, and the note says why two was impossible (user:edwin, 2026-09-09)
- [x] An unreadable date is reported as unconfirmable, not as expired, and names the note it is in — evidence: driven: due TBD gives 3 unconfirmable where a real date gives 3 expired (user:edwin, 2026-09-09)

## Corrected, 2026-09-09

**The evidence stamped on the criterion now matches the Evidence section and a re-run** — four checks, not two, and it names the commit the sweep was run at. [[ISS-0052-A-Fourth-Round-Of-Numbers-That-Do-Not-Reproduce]] corrected the prose and left the checkbox, which is the half a reader trusts because it is the half the validator gates on. A correction that stops at the prose is not a correction.

**ISS-0051's figure is three**, and the note now says why two was impossible rather than merely wrong: all five rows share one memoised condition, so they expire together or not at all. A number that could not have been produced by the code is worth more than a number that is merely off — it says the sentence was written from memory.

**An unreadable date is reported as unconfirmable, not as expired.** One `due: TBD` withdraws every exemption, which is the right default; calling it "expired" sent a person to the views when the fault is in a note. The message now says *fix the note, not the view*, names the value, and the summary counts the two states separately.

**Evidence.** Driven against a temporary vault: a real future date gives "3 whose exemption has expired"; `due: TBD` gives "3 whose exemption cannot be confirmed because a date will not read", each with its own sentence.
