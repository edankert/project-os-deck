---
type: "[[risk]]"
id: RISK-0003
aliases: ["RISK-0003"]
title: "Obsidian and Deck both evaluate the Bases language over the same base files, and the same file can show two different lists"
status: open
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: high
impact: medium
mitigation:
  - "The seed is the measured subset, named in one place and enumerated by a test, rather than 'the Bases language' as an aspiration"
  - "A construct outside the seed is reported by name, so a divergence shows as a message instead of as a shorter list"
  - "The three type spellings are normalised through one named function, tested against all three"
  - "The twelve real base files are fixtures, so a change to the evaluator is measured against Edwin's actual views"
related: ["[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[TASK-0043-The-Evaluator-Over-The-Index]]", "[[TASK-0046-A-Base-File-Reads-As-A-Description]]", "[[PHASE-0003-Vault]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
---

# Two evaluators of the Bases language

## Description

**Edwin will open the same `.base` file in Obsidian and in Deck and see two different lists of notes.** Obsidian evaluates the file with its own engine, which is closed, undocumented beyond the syntax page, and free to change in any release. Deck evaluates it with the engine [[TASK-0043-The-Evaluator-Over-The-Index]] builds, seeded from a subset measured across ten files on one day.

Three ways they diverge, in order of likelihood.

**Deck does not implement a construct.** The seed is twenty-two functions, six operators, and the filter combinators the ten measured files use. Anything else — a function in a file written next month, a formula shape the TaskNotes plugin adds — is outside it.

**Deck implements a construct differently.** Date arithmetic, the coercion rules between a string and a wikilink, how `contains` treats a list, and what an absent property compares equal to are all decisions with more than one defensible answer, and Obsidian's answer is not written down anywhere Deck can read.

**Obsidian changes.** Bases is young. A release that changes a comparison's behaviour changes what Edwin sees in Obsidian and not what he sees in Deck, with no signal to Deck at all.

The impact is medium rather than high because the failure is a wrong list rather than a lost note: nothing is written, nothing is deleted, and the record is untouched. It is not low because a view is how a person decides what to work on, and a view quietly missing four notes is worse than a view that fails.

## Mitigation

- **The seed is named, not implied.** [[TASK-0043-The-Evaluator-Over-The-Index]] writes the supported grammar down in one place and the suite enumerates it, so a function that was never implemented cannot pass unnoticed.
- **What falls outside the seed is reported by name.** This is the mitigation that matters most. An unsupported construct returns the notes the evaluator could still select plus a report naming what it could not read, and [[TASK-0045-The-Navigator-Draws-Any-Description]] draws that report above the list. A divergence then looks like a message rather than like a shorter list, and the two failure modes stop being indistinguishable.
- **The three type spellings go through one named function**, tested against all three, because that is the divergence already visible in Edwin's own vault.
- **The twelve real base files are fixtures** ([[TASK-0046-A-Base-File-Reads-As-A-Description]]), so any change to the evaluator is measured against the views Edwin actually has rather than against invented ones.
- **The language is Deck's, which is the deeper mitigation.** Deck does not promise to be Obsidian. It promises to read a base file as far as it can and to say where it stopped. [[ADR-0004-A-View-Is-A-Description]] makes that a stated position rather than an apology.

## Triggers

- A base file shows a different number of notes in Obsidian and in Deck, with no unsupported-construct report on Deck's side. That is the serious one: it means the evaluator was confidently wrong.
- An Obsidian release note mentions a change to Bases filters, functions or comparisons.
- A new function or view key appears in a file under `~/Notes/__bases__/` that the fixtures do not carry.
- [[PHASE-0003-Vault]] opens, at which point the number of base files Deck reads goes from a fixture set to whatever the vault holds.
