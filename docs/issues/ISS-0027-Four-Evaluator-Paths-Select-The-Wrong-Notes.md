---
type: "[[issue]]"
id: ISS-0027
aliases: ["ISS-0027"]
title: "Four paths in the evaluator select the wrong notes and report nothing, which is the failure the description feature says it exists to prevent"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: high
component: shared
parent: ""
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[TASK-0043-The-Evaluator-Over-The-Index]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[ADR-0004-A-View-Is-A-Description]]"]
tests: ["[[TST-0031-The-Evaluator-Runs-The-Seeded-Language]]"]
---

# Wrong notes, quietly, in the module written against exactly that

## Problem

[[FEAT-0012-A-View-Is-A-Description]] and [[ADR-0004-A-View-Is-A-Description]] both say the evaluator's rule is that anything it cannot do is REPORTED rather than silently producing a different answer. Four paths break that rule by producing a different answer confidently.

**`contains` on a string tests equality, not substring** (`desktop/src/shared/expression.ts`, `apply`). `title.contains("Draft")` over `title: "Draft One"` is `false`. In Bases, `contains` on a string is a substring test and on a list is membership; Deck treats every receiver as a list, so a string becomes a one-element list and only an exact match succeeds. `containsAny` and `containsAll` have it too.

**`hasLink` ignores its receiver.** It searches the whole record's frontmatter for the target, so `owner.hasLink(link("Zed"))` is `true` when `owner` is `[[Ann]]` and some other field holds `[[Zed]]`. The cockpit's own `CONTEXT.base` uses `file.hasLink(this.file)`, so the receiver is the thing being asked about.

**`==` on strings is case-insensitive; Obsidian's is not.** `status == "Done"` matches `status: done`. `same()` lower-cases both sides, which was written to make the three type spellings agree — but those agree because a wikilink is reduced to its target, not because of case, so the lower-casing buys nothing and costs correctness.

**`file.path` is docs-root-relative and a base file's `inFolder` is not.** Obsidian's vault root is the repository root, so the cockpit's own checked-in `NAVIGATION.base` says `file.inFolder("docs/__templates__")` — and Deck's paths start `__templates__/`, so the exclusion never matches. Its "Features (All)" view over this repository selects **fourteen** notes: the thirteen features plus `__templates__/feature.md`.

## Repro

`desktop/fixtures/bases/cockpit-navigation.base`, evaluated over this repository's index, returns fourteen where the cockpit shows thirteen.

## Expected

`contains` on a string is a substring test. `hasLink` asks about its receiver. `==` compares as written. `file.path` is what Obsidian would say it is, so a filter a person wrote against their vault means the same thing here.

## Next Actions
- [ ] Fix the four, and add a check per path that fails on the wrong answer rather than on the absence of a report

## Fixed, 2026-09-09

**`contains` on a string is a substring test.** On a list it is membership, as before, and a link still compares as its target so the type filters are unmoved.

**`hasLink` asks about its receiver.** `file.hasLink(x)` walks the whole record — which is what the cockpit's own `CONTEXT.base` wants — and `field.hasLink(x)` walks that field.

**Equality is case-sensitive, as Obsidian's is.** The lower-casing bought nothing: the three type spellings agree because a wikilink is reduced to its target, and the suite asserts they still do.

**`file.path` is what Obsidian would call it.** The index carries a `pathPrefix` — the docs root's own name under the workspace root, `docs` here and empty for a vault — and it travels with the records through Deck's host to the evaluator. The cockpit's own `NAVIGATION.base` now selects thirteen features over this repository where it selected fourteen, and its `docs/__templates__` exclusion works because Deck's paths finally mean what the file says.

**Two smaller things fixed alongside.** A `groupBy` written as a map rather than a string was silently ignored, which dropped the grouping from four of the cockpit's own views. And a formula with an empty body was reported with an empty `construct`, which told a person nothing.

**Evidence.** Six checks in `desktop/tests/evaluator.test.mjs`, including one that runs all six of the cockpit's own views over this repository's real index and asserts the counts. Reverting the three evaluator fixes fails one, two and four checks respectively.
