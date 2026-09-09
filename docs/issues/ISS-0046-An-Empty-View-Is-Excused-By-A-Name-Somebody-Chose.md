---
type: "[[issue]]"
id: ISS-0046
aliases: ["ISS-0046"]
title: "An empty view is excused when the word filter appears anywhere in a location, so naming a formula filterHelper silences the check, and the five hand-written exemptions never expire"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fourth independent review of PHASE-0001, 2026-09-09, findings 4 and 6"]
severity: medium
component: tests
parent: ""
related: ["[[ISS-0042-Each-Of-The-Three-New-Scripts-Passes-While-What-It-Measures-Is-Wrong]]", "[[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]", "[[FEAT-0012-A-View-Is-A-Description]]"]
tests: []
---

# The fix for excusing an empty view can be defeated by a formula's name

## Problem

**The rule matches a substring, and the string is author-chosen.** [[ISS-0042-Each-Of-The-Three-New-Scripts-Passes-While-What-It-Measures-Is-Wrong]] changed `check-bases-live.mjs` to excuse an empty view only when something was said about its own filter, tested as `/filter/i.test(one.where)`. A refusal's `where` is a path into the document, and a formula's name is part of that path. Two base files identical but for a formula's name: with `filterHelper` the script reports *"1 explained by their own filter, 0 failure(s)"*; with `plainHelper`, *"1 unexplained, 1 failure(s)"*. Same emptiness, same complaint, opposite verdict.

Latent rather than live: instrumented over `~/Notes`, all sixteen of today's excuses come from real `source.filter...` locations. It is a rule that happens to be right, which is what the last three reviews kept finding.

**And the exemptions never expire.** `KNOWN_EMPTY` grew from three rows to five, each saying an empty view is correct because nothing in the vault is dated at or after today. That sentence stops being true the day somebody schedules a task, and nothing checks it — the row would go on excusing a view that had become genuinely broken. It was the third review's finding 4 and was filed in no issue, which is the omission [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]] exists to punish.

## Fix

Match the prefix `source.filter` rather than the substring `filter`. And make each exemption state a condition the script can check — the latest date in the corpus — so a row that has stopped being true fails instead of excusing.

## Acceptance

- [x] A formula named `filterHelper` no longer excuses an empty view — evidence: driven against two synthetic base files; both now fail identically (user:edwin, 2026-09-09)
- [x] Each `KNOWN_EMPTY` row carries a condition the script tests, and a row whose condition no longer holds is a failure — evidence: a note scheduled for 2027 expires two exemptions by name (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The rule matches the prefix `source.filter`, not the substring `filter`.** Two synthetic base files identical but for a formula's name now get the same verdict; before, `filterHelper` silenced the check and `plainHelper` did not.

**Each exemption is a condition the script tests, not a sentence in a comment.** All five rows say the same thing — the view filters on a date at or after today, and the vault holds no date that late — so they share one condition, which walks the records and compares the latest `due:` or `scheduled:` against today. A row whose condition has stopped holding is a **failure**, naming the date that broke it and asking for the view to be looked at again. That is the right answer: a view exempted for being correctly empty stops being correctly empty the moment the data moves.

**Evidence.** Driven against a temporary vault holding the same base file: with nothing dated ahead, three exemptions hold; add one note scheduled for 2027 and two of them expire with *"exempted because ..., and that is no longer true (latest due or scheduled anywhere: 2027-01-01)"*. The substring escape is closed in both directions.

**It was the third review's finding 4 and no issue carried it**, which is the omission [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]] was created to punish. Two rounds in a row a finding survived by not being written down.
