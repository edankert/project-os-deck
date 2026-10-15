---
type: "[[task]]"
id: TASK-0151
title: "Gate squares show the evidence they count"
status: done
phase: "[[PHASE-0005]]"
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: fix all seven review findings on f003195..f68d4ee; reviewer A approve, reviewer B changes-requested"]
parent: "[[FEAT-0029]]"
related: ["[[FEAT-0026]]", "[[TASK-0144]]", "[[TASK-0149]]", "[[RISK-0009]]"]
tests: ["[[TST-0083]]", "[[TST-0085]]", "[[TST-0087]]"]
---

# Gate squares show the evidence they count

A gate's squares must agree with its count and show no verdict when evidence is unknown. S3 must be able to read the same feature evidence as S7.

## Scope

Fix the seven findings from the review of TASK-0144 and TASK-0149 in the shared flows, result marks, scene checks, renderer loader and their tests. Record round one under both features: reviewer A `approve`, reviewer B `changes-requested`. Keep the drawing lane's S3 integration with Claude.

- Each item records its own evidence completion; requirement criteria never inherit the requirement ticket's lifecycle fill.
- Unknown chips show neutral outlines without needs-you dots. Evidence marks never declare ticket identity; labels retain it and list twins contain the five evidence rows.
- Unknown and cancelled results carry the cockpit's SVG opacity. Legacy and raw result vocabulary follows the cockpit.
- Panel text is exempt from word and inferred-number checks. A section's count is represented by its rows or folded strip, and tests must check their agreement.
- Export `featureGate` from the renderer for both S3 and S7; keep `gateFromModel` for unavailable reads.

## Preflight

The request names observable failures, exact files and verification commands; no ambiguity needs an owner decision. This repairs the existing features. PHASE-0005 and REQ-0006's distinction between evidence and lifecycle state support the fix; no requirement changes. No new dependency, configuration, path or write authority is introduced. RISK-0009 already covers sidecar payload and result vocabulary drift.

## Verification

2026-10-15: `cd desktop && npm test` passes 769 tests, with zero failures and zero skips. The focused suites pass 60 tests (18 scene checks, 21 flows, 21 actions/loaders). Eight deliberately broken variants each failed their regression; built files were restored and all 60 tests passed again. FEAT-0026 and FEAT-0029 record each finding and both supplied round-one verdicts.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. Both acceptance fixtures reproduce from unchanged raw payloads. No Electron windows, pushes, process stops or human verdicts were used. Local completion follows Edwin's explicit commit-only instruction; Claude owns S3 integration, review verification, merge and push.
