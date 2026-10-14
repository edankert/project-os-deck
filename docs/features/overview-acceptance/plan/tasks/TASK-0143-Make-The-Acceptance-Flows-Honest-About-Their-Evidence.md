---
type: "[[task]]"
id: TASK-0143
title: "Make the acceptance flows honest about their evidence"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's round-one repair request, 2026-10-14", "[[FEAT-0029]]"]
parent: "[[FEAT-0029]]"
depends: []
blocks: []
related: ["[[RISK-0009]]"]
tests: ["[[TST-0085]]", "[[TST-0087]]"]
---

# Make the acceptance flows honest about their evidence

## Definition of Done

- [x] S7 reads advertised actions before offering or sending feature transitions. The opted-in stamp says that status does not change.
- [x] FEAT-0029 states Deck's actual identity guard and the narrower S7 scope, preserves the old criteria and assigns the scope decision to Edwin.
- [x] Missing command results and every unknown lamp have an explanation. Known empty lamps are hollow; at least one known item is required for readiness.
- [x] Reviews accept both string and list provenance. S6 results survive unrelated commits, separate workspaces, releases, platforms and check content, and persist stale-result deletion.
- [x] Acceptance-run totals match the cockpit's skipped meaning. S5 keeps other plates behind the selected plate as outlines.
- [x] Focused checks, the full desktop suite and documentation validation pass. Updated S5 and S7 plates are committed; Claude receives round two with FEAT-0029 still at review.

## Preflight

The eight findings are defects in this feature, so no issue is filed. The request names the screens, contracts, tests and boundaries; no ambiguous term changes the work. Existing TST-0085 and TST-0087 cover these repairs without another test note.

The impact check covers FEAT-0026's scene checks, FEAT-0028's shared S3 lamps, ADR-0003's advertised verbs and shell-only writes, and REQ-0006's missing-evidence rule. The requested narrowing differs from PHASE-0005's eventual sidecar-guard and feature-transition goals. Edwin explicitly requested that narrowing for review; no phase criterion is marked satisfied. RISK-0009 records the remaining cockpit dependency and direct-agent-write hazard.

## Gate rule

A known zero-item lamp is neutral and hollow, labelled “nothing to check”. It neither supplies evidence nor blocks a gate supported by other lamps. Every nonempty lamp must be known and complete, every unknown or missing item blocks, and at least one known item must exist across the five lamps. An explicitly empty requirement or task list is known empty. Absent automated or acceptance evidence stays unknown because no complete inventory proves that nothing is owed. A review still needs one person or two recorded model reviewers, an approved verdict, date and round.

## Evidence

2026-10-14: `a6fb6c7` repairs the S7 actions, lamps and criteria; `388d11e` repairs saved S6 progress; `a7d450a` repairs S5 and commits the regenerated plates. `cd desktop && npm test` passed 745 tests with zero failures and zero skips. The headless plate command regenerated all 14 plates, and the changed S5/S7 SVG/JPEGs were inspected. Documentation validation and whitespace checks pass. Integration and Claude’s formal round-two review remain pending. No Electron, push, merge or sibling-repository write ran.

An independent implementation check in a fresh context passed all 35 focused scene/action tests. Removing the transition guard, the positive lamp total guard, or persisted stale-result deletion was detected by a targeted test. The check left Claude’s formal round-two verdict untouched and confirmed the documented external limits.
