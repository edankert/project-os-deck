---
type: "[[issue]]"
id: ISS-0043
aliases: ["ISS-0043"]
title: "Three counts in the section added to TST-0027 do not reproduce, written on the day the issue about counts that do not reproduce was closed"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The third independent review of PHASE-0001, 2026-09-09, finding 8"]
severity: low
component: docs
parent: ""
related: ["[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]]", "[[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]"]
tests: []
---

# The same mistake, in the note written to close it

## Problem

Three counts in TST-0027's new section are wrong.

- "21 base files" is 19. `find ~/Notes -name '*.base' -not -path '*/.*' | wc -l` gives 19; the extra two are in `.trash`, which the script skips and the sentence counted.
- "`Novel Base - Side Bar.base` has four views ... four empty lists, four explanations" — it has six.
- "there are nine of them", of views that draw a list with nothing said. There are 17. The nine silently dropped the eight `01 Inbox/Untitled*.base` views, which are exactly the case a person should look at.

## Cause

The same as [[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]], closed hours earlier: numbers read off a screen while writing prose, rather than printed by the thing being described. ISS-0036's answer was "the script prints the number that goes in the note, and it is re-run rather than remembered", and the next note written did not follow it.

## Fix

Correct the three, and make the script print each one it is quoted for — the file count, the view count per file, and the count of views that drew a list with nothing said — so the sentence can be copied rather than counted.

## Acceptance

- [x] The three numbers in TST-0027 match what the script prints — evidence: 19 files, 46 views, 6 sidebar views, 14 silent lists (user:edwin, 2026-09-09)
- [x] The script prints every number the note quotes — evidence: its last three lines (user:edwin, 2026-09-09)

## Corrected, 2026-09-09

**The three numbers are corrected and the script now prints all of them**: 19 base files, 46 views, 6 views in the sidebar base, 14 views that draw a list and report nothing. The last three lines of `check-bases-live.mjs` are the numbers the note quotes, so the sentence is copied rather than counted.

The causes, one per number. "21 base files" counted the two in `.trash`, which the script skips. "Four views" in the sidebar base came from reading the output through `head -8`, which cut two off. "Nine" silently dropped the eight `01 Inbox/Untitled*.base` views — which are exactly the ones a person should look at, since they select every note in the vault and say nothing.

**[[ISS-0036-Six-Numbers-In-The-Close-Out-Notes-Do-Not-Reproduce]] closed hours before this was written**, with the rule "the script prints the number that goes in the note, and it is re-run rather than remembered". The next note written did not follow it. The rule was right; what was missing was the script printing the numbers, so following it took no discipline.
