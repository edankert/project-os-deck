---
type: "[[issue]]"
id: ISS-0031
aliases: ["ISS-0031"]
title: "Three different ways of dropping the path prefix each leave every check passing, so the fix that stopped a base file selecting the wrong notes is guarded nowhere along the route it travels"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: high
component: tests
parent: ""
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The value is tested where it is used and nowhere along the way

## Problem

[[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]] fixed a base file's `inFolder` never matching, by carrying a `pathPrefix` — the docs root's own name — from the index, through Deck's host, to the evaluator. **Each of the three hops can be broken on its own and every one of the 307 checks still passes.**

- `pathPrefixFor` returning `''` (`desktop/src/main/note-index.ts`)
- `pathPrefix: ''` in the host's records answer (`desktop/src/main/host.ts`)
- `''` in `readRecords` (`desktop/src/renderer/renderer.ts`)

Each restores exactly the defect that was fixed: the cockpit's own `NAVIGATION.base` selects fourteen features over this repository where the cockpit shows thirteen. Silently.

**The one check that touches it hands the value to `runQuery` as a literal.** It proves the evaluator USES a prefix. It cannot prove one ARRIVES, and arriving is the whole of what was fixed.

## Why this is worth more than another test

A test per hop would work and would rot. The value has to travel three modules and two process boundaries, and a fourth hop will be added the day a vault is opened. **The shape to reach for is one where dropping it is a type error rather than a silent wrong answer** — the records and their prefix travelling as one thing, so a caller cannot take the records and leave the prefix.

## Next Actions
- [ ] Make the prefix impossible to drop rather than checked at each hop
- [ ] Guard what remains: `pathPrefixFor` itself, and the host's answer carrying it

## Fixed, 2026-09-09

**The records and their prefix travel as one value.** `runQuery` takes a `QueryIndex` — `{ records, pathPrefix }` — rather than an array and an option, and `EvalContext.pathPrefix` stopped being optional. A caller that takes the records and leaves the prefix is now a compile error, which is what the issue asked for instead of a test per hop.

**The two hops a type cannot reach are checked.** `pathPrefixFor` is driven over five cases including a vault, where it must be empty, and a docs root outside the workspace. The host's answer carrying the prefix is checked over real HTTP.

**Evidence.** Reverting `pathPrefixFor` fails 2 checks; reverting the host's answer fails 1. Both survived every check before.
