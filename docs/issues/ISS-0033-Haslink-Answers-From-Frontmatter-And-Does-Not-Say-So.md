---
type: "[[issue]]"
id: ISS-0033
aliases: ["ISS-0033"]
title: "file.hasLink answers from a note's frontmatter alone, so a backlink query misses every link written in the body, and reports nothing"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: medium
component: shared
parent: ""
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]"]
tests: ["[[TST-0031-The-Evaluator-Runs-The-Seeded-Language]]"]
---

# Half of the receiver fix, and the half that is left is silent

## Problem

[[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]] fixed `hasLink` ignoring its receiver. It did not fix the other half: **`file.hasLink(x)` reads only the frontmatter, and a record holds no body.**

The cockpit's own `CONTEXT.base` is `file.hasLink(this.file)` — a backlink query — and the cockpit builds its backlink graph from frontmatter values **and the body**. So Deck answers a strictly smaller question and says nothing about it, which is the rule this whole feature is written against.

**ISS-0027's own text is wrong about this** and is corrected here rather than left: it says `file.hasLink` "walks the whole record — which is what the cockpit's own `CONTEXT.base` wants". It walks the whole frontmatter, which is not the same thing.

**Why the record holds no body is a decision, not an oversight.** [[TASK-0038-Records-From-The-Workspaces-Markdown]] says so: 1537 notes with their bodies is a different memory decision from 1537 records, and no view described so far reads more than the frontmatter. A backlink query is the first thing that does.

## Two ways out, and they are not the same size

Read wikilinks out of the body at index time and keep the targets — not the body — on the record. Or ask the sidecar, which already has the graph, through `/api/cockpit/context`. The second is less work and is the sidecar's own authority; the first is what a vault with no sidecar would need.

**Until one of them, `file.hasLink` must REPORT that it sees frontmatter only.** A smaller answer given silently is the failure; a smaller answer that says so is a limitation.

## Next Actions
- [ ] Report the limitation by name, today
- [ ] Decide which of the two ways out, and when

## Reported, 2026-09-09; the limitation stands and is no longer silent

**`file.hasLink` now says what it cannot see.** It still answers from the frontmatter — that answer is right as far as it goes — and it reports `file.hasLink()` with the sentence that Deck holds no note bodies, so a link written in the prose is not seen. The report reaches the screen above the list, like every other unsupported construct.

**A field's own `hasLink` reports nothing**, because the frontmatter is all there is to a field. Only the `file.` form is incomplete.

**ISS-0027's wording is corrected rather than left.** It said `file.hasLink` "walks the whole record — which is what the cockpit's own `CONTEXT.base` wants". It walks the whole frontmatter, which is not the same thing.

**The real fix is still owed, and this note stays the record of it.** Two ways out: read wikilinks out of the body at index time and keep the targets — not the body — on the record; or ask the sidecar, which already has the graph, through `/api/cockpit/context`. The second is less work and is the sidecar's own authority; the first is what a vault with no sidecar would need. Neither is PHASE-0001's, and [[PHASE-0003-Vault]] is where a vault's backlinks first matter.

**Evidence.** Reverting the report fails 1 check.
