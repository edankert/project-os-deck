---
type: "[[risk]]"
id: RISK-0004
aliases: ["RISK-0004"]
title: "Deck's index and the sidecar's index read the same notes and can disagree about them, so two applications show different counts of the same corpus"
status: closed
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
phase: "[[PHASE-0001-Deck]]"
likelihood: high
impact: medium
mitigation:
  - "Deck mirrors the sidecar's normalisation rules and names, in the task, which upstream rule each mirror came from"
  - "A fixture recorded from the sidecar asserts that Deck's typed counts equal the sidecar's library groups, so a drift fails a suite"
  - "Every deliberate difference is a named row in that fixture with the reason, never a loosened assertion"
  - "The sidecar stays the authority on obligations, rendering, context and every write; Deck's index answers only which notes a query selects"
related: ["[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0011-Decks-Own-Index]]", "[[TASK-0038-Records-From-The-Workspaces-Markdown]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ISS-0279]]"]
---

# Deck's index duplicates the sidecar's indexer

## Description

**Two programs now read the same Markdown files and each decides for itself what a note is.** The sidecar has indexed project-os notes since before Deck existed, and its rules for what counts as a note, what a note's type is, and which directories are ignored live in `index.py` in another repository. Deck's index, decided on 2026-09-08 ([[ADR-0004-A-View-Is-A-Description]]), makes the same decisions again in TypeScript.

**The visible failure is two applications disagreeing about a number in front of the same person.** The cockpit says 34 issues need triage and Deck says 31. Nothing crashes and nothing is lost; the person simply stops trusting both.

Three ways they drift.

**They disagree from the start, because a rule was mirrored wrongly.** The type spelling is the obvious one: `type: "[[feature]]"`, `type: Chapter`, and a list of several are three shapes, and the sidecar has one answer for each.

**They diverge later, because the sidecar changed.** The cockpit is the primary place where new functionality is built. A change to its indexer — a new ignored directory, a new type rule — reaches Deck only if somebody notices. Nothing in Deck watches `index.py`.

**They disagree deliberately, and the disagreement is not written down.** [[project-os-cockpit#ISS-0279]] says the sidecar drops a note whose `type:` is a list. Deck must not reproduce that bug, so Deck's count will be right and the sidecar's will be wrong, and a test that asserts they are equal will fail for a good reason. If that is not recorded as an expected difference, somebody will loosen the assertion instead.

This is the same shape as [[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]: Deck depends on behaviour in another repository and nothing in Deck watches it. Impact is medium because no record is harmed. Likelihood is high because two independent implementations of one rule always drift; that is what the mitigation exists for.

## Mitigation

- **Mirror rather than invent, and say where each rule came from.** [[TASK-0038-Records-From-The-Workspaces-Markdown]] requires reading `index.py` and writing down, in the task, which upstream rule each Deck rule mirrors. A mirror with a citation can be re-checked; a mirror without one cannot.
- **Pin the result, not the implementation.** A fixture recorded from the running sidecar carries its library groups for this repository and for Your Trainer, with the date and the sidecar commit. Deck's typed counts are asserted equal to it. This is the technique [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] already uses for the view list, and it turns a drift into a failing build rather than a confused person.
- **Record every deliberate difference as a named row** in that fixture, with the reason and the cockpit issue. The list-valued `type:` case is the first one. Never widen an assertion to accommodate a difference nobody wrote down.
- **Keep the division of authority narrow.** Deck's index answers one question: which notes a query selects. Whether a note is owed, what its body renders as, what it is linked to, and every write remain the sidecar's. The smaller Deck's index claims to be, the less surface there is to drift.
- **Re-read the sidecar's indexer when the cockpit ships a change note.** The adoption table already has that habit and a dated Maintenance line; the indexer joins what is re-read.

## Triggers

- The typed-count fixture fails, and the first question is which side is right.
- A cockpit change note touches `index.py`, the ignored directories, or the type rules.
- A person reports that Deck and the cockpit show different counts for the same view.
- [[PHASE-0003-Vault]] opens: a vault's type rules are the vault's, not project-os's, and both indexers meet them for the first time.
- [[project-os-cockpit#ISS-0279]] is fixed, at which point one named difference in the fixture stops being expected.


## Closed, 2026-09-09

**Every mitigation above is in shipped code, and the pin is stronger than the one this note asked for.**

The rules are mirrored with citations: `desktop/src/shared/records.ts` names the four it takes from `index.py` — the excluded directories, `_normalise_type`, `_normalise_status` and `_extract_h1` — at the line that mirrors each.

The result is pinned by `desktop/fixtures/sidecar-types.json`, recorded by `tools/scripts/record-sidecar-fixture.py`, which IMPORTS the cockpit's own `Index` rather than re-reading its rules. It carries the date and the cockpit commit.

**What it pins is more than this note asked for, because the first version was not enough.** The note asked for typed counts. Counts went stale within the hour — Your Trainer gained a task while the fixture was being written — so it became per note path. Then the independent review showed that a per-path TYPE comparison skipped any note Deck had failed to index, and that hiding a sixth of this repository still passed it ([[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]]). It now compares the frontmatter KEY SET as well, and a fixture path that is on disk with no record fails by name.

**The claim it supports today:** Deck's frontmatter keys are identical to the sidecar's for every one of the 2924 notes across both corpora, with no note indexed by one and not the other, and no contradiction about any note's type.

**The deliberate differences are RULES, not a list of paths**, because a list goes stale on a repository somebody is working in. Two: a list-valued `type:`, which is [[project-os-cockpit#ISS-0279]] and which Deck must not reproduce; and a file whose frontmatter PyYAML refuses outright, where Deck reads what it can and reports the rest. Both are checked live on the Deck side, so a file nobody has seen yet is covered.

**The triggers stand unchanged**, and two of them fired during the work that closed this: the fixture failed and the first question was which side was right (it was Deck's, twice), and the reader was found to be losing keys on twenty-two notes. That is the mitigation doing its job rather than an argument against it.

**What would reopen it.** Any of the triggers above. The likeliest is [[PHASE-0003-Vault]] opening, where a vault's type rules are the vault's and both indexers meet them for the first time.
