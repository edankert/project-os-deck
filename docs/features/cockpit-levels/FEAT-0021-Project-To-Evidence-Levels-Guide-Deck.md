---
type: "[[feature]]"
id: FEAT-0021
title: "Project-to-evidence levels guide Deck after cockpit contracts are decided"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'Review the current electron glass functionality and suggest how to make it more like a real minority report style UX, also consider the suggested layering and abstractions that have been defined as part of the ../project-os-cockpit project.'", "Edwin 2026-10-01: 'Okay, create the notes (requirements/features/tasks etc) which cover these changes.'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]", "Edwin: This sounds great update the documents to support this fully.", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
goal: "Deck can move from an exact project summary to flows, subjects, full notes and evidence while preserving the selected project or note."
requirements: []
tasks: []
release: ""
acceptance_exception: ""
related: ["[[PHASE-0004-Parity]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[project-os-cockpit#DES-0015]]", "[[project-os-cockpit#DES-0016]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[DES-0003]]", "[[FEAT-0022]]", "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
---

# Project-to-evidence levels guide Deck after cockpit contracts are decided

## Goal

Deck should let a person follow an exact count from a project answer to its member rows, one subject, its full note and supporting evidence. This is parked for Parity because the cockpit's proposed flows and level contracts have not been accepted.

## Findings

- [[project-os-cockpit#DES-0015]] proposes Home plus four flows: design and review, implementation, verification, and issues. [[project-os-cockpit#DES-0016]] proposes levels A0 portfolio, A1 project, A2 flow, A3 subject, A4 ticket, A5 evidence and A6 trace. Both remain proposals.
- A1 should answer Needs you, In flight and Shipping with counts that open exactly their member rows. A2 uses the on-stage collection from FEAT-0020. A3's compact subject header and A4's full authored text should coexist in one document. A5 evidence and A6 machine trace open deliberately from the subject.
- The current wheel remains spatial zoom. A labelled level control and reopenable address may later change the question answered while preserving the selected project or note.
- Deck's seven view descriptions and the sidecar's authority remain in force until a cockpit contract and a Deck adoption decision replace them.

Edwin endorsed the Glass interaction review with “This sounds great update the documents to support this fully.” This adds the evidence-beside-claim direction to this backlog feature. [[DES-0003-Collections-And-Documents-On-Glass]] and [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] provide the document objects; [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]] provides comparison and relationship emphasis.

Selecting an acceptance statement should bring its source-backed test verdict, capture or excerpt beside the claim. Each evidence object identifies its source, date and route to the full original. A stale, missing or inaccessible result must be labelled. Excerpt anchors must survive ordinary note changes or explicitly report that the quoted passage moved. Existing linked notes can open through FEAT-0020 before structured evidence is adopted.

The structured evidence view must distinguish a recorded verdict from a feature status and a machine trace from a human acceptance outcome. A missing payload must not be filled by inferred success. Evidence and trace appear on deliberate request. Read-only tablet access must be assessed for each adopted source.

**2026-10-02: one part of these findings is delivered by [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]], in PHASE-0002.** That feature shows, beside a note on the Glass desk, the tests that name it and what is recorded for each: a verdict from the acceptance ledger, or the test note's own status and date, with the source, the date, the way to the full original and an excerpt from the test note's Evidence section. It labels a stale manual test, a check never walked and a record that could not be read, and it never fills a gap from a status. It carries the tablet assessment for the one source it adopts ([[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]], proposed). Everything else here is still parked on the cockpit's decisions about DES-0015, DES-0016 and D9 in its PHASE-045: the levels A0 to A6, the four flows, the level control, the level address, the A1 counts, a capture, a per-subject evidence payload and the trace. This feature's status and phase are unchanged.

## Open questions

- Which four flow payloads, counts and legal verbs will the cockpit accept, and which will Deck adopt or replace?
- Does Deck need a fleet A0 or only one workspace at A1? What address shape reopens a level and its subject?
- Which evidence and trace sources are readable in Deck without changing the served tablet's authority?
- Which payload identifies a claim or criterion and links its verdict, timestamp, capture and source revision? Which freshness rule marks evidence as stale?
- How are source excerpts anchored and checked after edits, and how do inaccessible sources appear without leaking their content?

When PHASE-0004 opens, rerun feature scaffold, impact analysis and risk scan; then write requirements, plan, tasks and one acceptance walk against the accepted contracts. No current Glass task depends on this feature.
