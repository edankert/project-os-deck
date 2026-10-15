---
type: "[[change]]"
id: CHG-20261015-Gate-squares-show-the-evidence-they-count
title: "Gate squares show the evidence they count"
status: merged
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin's round-one review findings on f003195..f68d4ee"]
commit: ""
pr: ""
impacts: ["[[TST-0089]]", "[[TST-0100]]"]
platforms: [app]
issues: []
features: ["[[FEAT-0026]]", "[[FEAT-0029]]"]
related: ["[[TASK-0151]]", "[[TASK-0144]]", "[[TASK-0149]]"]
---

# Gate squares show the evidence they count

## Summary

Gate squares now show each item's evidence completion. Unknown chips show neutral outlines, and their item marks no longer duplicate ticket identity. Both feature notes record the seven fixes and the supplied round-one verdicts: reviewer A approve, reviewer B changes-requested.

## Impact

- S7 feature acceptance: filled squares agree with the completed count. Unknown evidence has no fill claim or attention dot. Labels retain source ids and the list twin has five evidence rows.
- S3 ticket: shared chip marks no longer declare tickets already shown in the links panel. The renderer exports S7's evidence loader for Claude to integrate here, with a neutral fallback when reads fail.
- S6 release testing: unrecognised result marks are dimmed to 0.6 opacity; cancelled-class marks use 0.75. Legacy Canceled draws `[-]` separately from Excused `[·]`.
- S2 phase and S3 ticket panels: regression tests require each section count to equal its rows and folded strip marks. The scene-check comment states both panel text exemptions.

Deck has no surface-note registry. These names identify its existing screens. TST-0089 and TST-0100 have no verdict in the working ledger to invalidate. Their procedures now state the corrected marks. Claude owns official plate regeneration and the window run.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0026 and FEAT-0029 each record all seven resolutions, the original verdicts and the S3 handoff.
- requirements: not-applicable — existing evidence and phase rules remain; no acceptance criterion is narrowed.
- tasks: new — TASK-0151 tracks these fixes under FEAT-0029; TASK-0149's current verification is corrected.
- issues: not-applicable — findings in these features are fixed here.
- tests: updated — TST-0083, TST-0085 and TST-0087 document the regression checks; TST-0089 and TST-0100 describe the corrected marks.
- workflows: not-applicable — no command or operational flow changes.
- decisions: not-applicable — evidence stays separate from lifecycle state and the shell write boundary remains.
- risks: not-applicable — RISK-0009 already covers sidecar payload drift; no new dependency, configuration or write authority.
- changes: new — this note.
- snapshot: updated — TASK-0151 state, derived counts and the handoff.

## Verification

`cd desktop && npm test` passes 769 tests, zero failures and zero skips. The 60 focused tests cover 18 scene checks, 21 flows and 21 action/loader checks. Eight deliberately broken variants each fail a regression; restored builds pass all 60 again. Both acceptance fixtures were remapped from unchanged raw payloads and reproduce exactly.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. No Electron window, push, process stop or human verdict was used. Claude verifies these author fixes; no new reviewer approval is claimed.

## Handoff

Claude's S3 can call `featureGate(input: ScreenInput, featureId = input.address.note): Promise<AcceptData>` from `desktop/src/renderer/overview-flows.ts`. Pass that data to `gateChips`, append both arrays, and remove the ticket-stripping loop and row filter. Evidence item marks have a source id in the label and `gate-<feature>-<key>-item-<n>` as `markId`, never `ticket`. Rows are only `gate-<key>`. Required-read failures return the neutral model fallback with the failure reason and no write capability.
