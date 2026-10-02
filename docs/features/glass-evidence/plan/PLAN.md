---
type: "[[plan]]"
title: "Show a note's recorded evidence beside it on Glass"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
implements: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
related: ["[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]"]
---

# Show a note's recorded evidence beside it on Glass

## Delivery sequence

1. **[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]: the evidence model, without a window.** A pure module, `desktop/src/shared/evidence.ts`, answers four questions from data it is handed. Which tests name a note, and under which key? What is recorded for each kind of test? Is a manual verification stale? What words stand for what is absent? It also reads the acceptance payload and refuses one it does not recognise. Checked by `desktop/tests/evidence.test.mjs`.
2. **[[TASK-0112-Forward-The-Acceptance-Record-As-A-Read]]: the source.** `/api/cockpit/acceptance` joins the host's read allow-list in `desktop/src/main/host.ts`. The host suite shows GET and HEAD are forwarded and every other method is still refused. The adoption table moves `api.read.check-history` to adopted. A dated fixture of the real payload is kept for the model's tests.
3. **[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]: the panel.** The Glass document gains the evidence control and the panel, the control on a criterion line that links a test, the excerpt and the way to the original, the keyboard route, the reduced-motion form and the same panel on the served page.
4. **[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]: the walk.** The scripted walk `desktop/demos/glass-evidence.cjs` drives the panel with a real pointer and keyboard and keeps pictures, on this workspace and on a second real one. [[TST-0077-A-Claims-Evidence-Stands-Beside-It]] is a person's and is not walked by a script.

Tasks 1 and 2 do not depend on each other and can be built in either order. Task 3 needs both. Task 4 needs 3.

## Dependencies

- **Hard:** FEAT-0020's document on the Glass desk, where the panel lives and through which the original opens. It is at `doing` on 2026-10-02 with its code in the tree.
- **Hard, in another repository, and already met:** the sidecar's `GET /api/cockpit/acceptance`, which exists and is not changed. The sidecar is not asked for anything new.
- **Not dependencies, by decision:** the five things no source provides, listed in FEAT-0024 under "External dependencies". The build does not wait for any of them and shows none of them.
- **Soft:** [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] and the smoke run's check that the host answers 405. TASK-0112 extends the first and must leave the second passing.

## Recovery rules

- The panel states only what one of the three sources returned. A value that did not arrive is said to be missing, by the sentence ADR-0008 C gives for it.
- "not walked: no verdict is recorded" is said only after the ledger was read. A request that failed, a refusal or a payload of another shape reads "the acceptance record could not be read".
- A payload whose `schema_version` is not the one the model was written for is refused whole. No field is read from it.
- Nothing about evidence is saved. No verdict, excerpt or count is written to the state file, and a scene keeps none.
- The panel has no control that records, changes or re-runs anything.

## Open questions

These are Edwin's and none of them blocks the build. Each is recorded under ADR-0008's Acceptance section with the default the build takes.

- Does adopting one cockpit read belong in Glass, or does this feature move to PHASE-0004? Default: Glass, on his instruction of 2026-10-02.
- May the served page show the walker's reason and name? Default: yes, the same panel as the shell.
- Should Deck read a workspace's own `verification.staleness_days`? Default: no, it applies 90 and the label states the number.
- Is marking `api.read.check-history` adopted enough, given the register also lists the route under `api.read.obligations`? Default: yes, with a sentence on the second row.
- What does a workspace with no ledger show? Default: "this workspace keeps no acceptance ledger" and no verdict.

One value is left to the build and recorded when it is chosen: how the panel shows several platforms' verdicts for one check. TASK-0113 chooses the layout, and TASK-0114 records how it read on a workspace with two ledgers.
