---
type: "[[task]]"
id: TASK-0005
aliases: ["TASK-0005"]
title: "The treatment is chosen, not assumed — the sky, the instrument and the wooden table are drawn, and a person picks"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-10-14
source: ["Edwin 2026-09-05: 'this feels a little minority report like or did you have something more like (wooden) play blocks in mind'"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: []
blocks: ["TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[project-os-cockpit#DES-0002]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: []
---

# The treatment is chosen, not assumed

## Objective

Decide between the three treatments [[DES-0001]] draws for the orbit, and record why. A design verdict is human-only ([[project-os-cockpit#REQ-0026]]); this task ends in Edwin's decision, not in an implementation.

## Detail

**What this decision covers narrowed on 2026-09-07.** The Glass field itself ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]) is built with [[DES-0002]]'s fog-and-detail treatment, which the review's measurement chose over blur: distance loses contrast and detail rather than going out of focus. This task no longer blocks the field's renderer. It decides how the orbit arrangement looks, and it blocks only [[TASK-0003]], the orbit's edge overlay.

They are not three palettes. They disagree about what the view is claiming:

- **Constellation** — a near-black field of luminous points, edges as filaments so faint they read as texture, depth by haze. It says *this is vast and mostly settled*, which is true: 70% of the corpus is terminal. It is also the look every graph view already has.
- **Glass** — the same field rendered as an instrument: cyan plates, brackets, billboarded panes, a scan sweep. It says *this is a live system you are working*. **It costs a distinction**: washing the bands toward one colour puts four of the six statuses inside 25 degrees of hue, so `blocked` is held out as the only alarm red and `archived` is desaturated to stay readable.
- **Blocks** — opaque painted-wood solids on a lit table, stacked into districts, casting shadows. It says *this is a made thing with weight*. Occlusion becomes information: a block behind another is genuinely hidden, which is honest about a corpus you cannot see all of at once. It costs the edges, which do not survive an opaque scene at 16148 of them — and with them the link callout. In exchange `done` becomes the **bare wood** rather than a colour, which is the only treatment that handles a corpus that is 70% finished without turning into one flat hue.

**The second is the sharper trade and the likelier mistake.** Blocks look better in a screenshot and may navigate worse. That is exactly the kind of judgment this project reserves for a person.

## Acceptance

- All three drawn against the same real data, not a sample, and switchable side by side
- The decision recorded in [[DES-0001]]'s frontmatter, with the reason
- If blocks win, what replaces the edge callout is answered before [[TASK-0003]] starts
- If glass wins, the four collapsed status hues are answered before [[TASK-0003]] starts

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0596` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).

## Preflight

Edwin's request, 2026-10-14:

> Work on TASK-0005. Read docs/features/orbit-view/plan/tasks/TASK-0005-The-Treatment-Is-Chosen-Not-Assumed.md first — the note is the spec — and follow the project-os lifecycle (preflight, implement, close-out).

This is design-decision preparation under the existing task, classified as docs-only. The result enables Edwin to compare the built treatments on one real corpus and record a choice with its cost. Implementation means verifying the existing comparison and supplying current evidence; the objective explicitly reserves the verdict to Edwin.

The scope and acceptance are unambiguous. FEAT-0001 and FEAT-0009 declare no local requirements. Their scope, PHASE-0002, DES-0001, DES-0002 and project-os-cockpit's DES-0002 and REQ-0026 were checked. Preparing evidence changes none of their contracts. TASK-0003 is already done with all three treatments, so its historical dependency on this decision no longer describes the build order.

Risk scan: no new dependency, environment variable, runtime contract or required long-running step is proposed. Evidence uses the existing isolated `--drive` runner. This task stays `doing` until Edwin's choice and reason are recorded.

## Where this stands

**The comparison is ready; Edwin has not chosen a treatment.** [Open the current side-by-side comparison](../../../../designs/DES-0001-orbit-comparison.html), or switch constellation, glass and blocks in the running application's Orbit surface. The comparison uses the built renderer at revision `9948c9d` over this repository's real notes. It offers all three captures together and each at full width.

The original claim that Glass's hue collapse was fully answered was too strong. Red for `blocked` and muted `archived` distinguish those two bands. The remaining bands still share a cyan family. Edwin must accept that cost or request a different status treatment if he chooses Glass.

The original claim about Blocks also needs a narrower description. Hovering a near card draws its neighbourhood, but hovering a painted canvas node does not. The current Blocks renderer draws flat squares with shadows on a tan field, not stacked wooden solids. Its relationship replacement is therefore incomplete for the painted nodes. This is a limitation for the decision, not an acceptance criterion marked satisfied. The canvas pointer handler in `desktop/src/renderer/glass.ts`, `wire()`, does not call `startReach()` for orbit nodes; near cards do.

**Recommendation for Edwin:** choose Constellation to preserve the whole-graph links and clearer status colours. This recommendation is not a verdict. `DES-0001`'s `decided` and review fields remain untouched, and Constellation remains the existing default.

## Verification

Run on 2026-10-14:

- `cd desktop && npm test`: 646 tests passed, zero failed or skipped. This includes the build; no application source was changed.
- The existing `--drive` runner executed [the comparison script](../../../../designs/__attachments__/TASK-0005-orbit-comparison/compare.cjs) in the existing Linux container. [The retained log](../../../../designs/__attachments__/TASK-0005-orbit-comparison/drive.json) records `ok: true` and `workspaceUnchanged: true`.
- The graph contained 412 notes and 7,198 link records; the view reported 6,962 resolved links. Real pointer clicks selected all three treatments. Assertions compared every layout ID and every visible node's ID and coordinates across switches. Each treatment held 122 visible node targets at yaw 0. Constellation and Glass each drew 1,261 links; Blocks drew zero.
- A real pointer over a Constellation link displayed its source text. In Blocks, a pointer over the near card FEAT-0017 produced 40 neighbours. A pointer over the painted node CHANGES-README produced no reach. The comparison includes captures of all three interactions.
- `bash tools/agents/check-docs-first.sh`: passed as a docs-only change set. `python3 tools/scripts/sync-snapshot.py`: already up to date; no derived fields changed. `bash tools/scripts/validate-docs.sh`: passed with warnings about existing review and design state. `git diff --check` and the comparison's local image/evidence link check also passed.

The captures use a 1440 × 900 window and reduced motion to keep the camera fixed. They are evidence of the current implementation, not a person's usability verdict or a performance measurement on the Mac. The whole smoke suite was not rerun for this documentation-only work.

To replay, build in `desktop/` and run `node_modules/.bin/electron . --drive ../docs/designs/__attachments__/TASK-0005-orbit-comparison/compare.cjs --drive-out dist/task-0005/captures`. This opens a window and uses its keyboard focus. The recorded run instead used the repository's existing Docker image with a virtual display and masked `node_modules` and `.cockpit` mounts, following `tools/scripts/walk-in-a-box.sh`.

## Close-out

The evidence preparation is complete. The task stays `doing`: Edwin's treatment and reason are required by the objective and have not been supplied. If Glass is chosen, the decision must address the grouped status colours. If Blocks is chosen, the decision must answer how relationships remain reachable for painted nodes. TASK-0003 already built the switchable overlay, so the old build-order language is historical rather than an instruction to rebuild it.

No behavior, runtime path or contract changed, so no change note is due. No lifecycle verdict, acceptance walk or design approval was recorded on Edwin's behalf. No new risk-scan trigger applies. Snapshot focus names TASK-0005; wider phase work remains in PHASE-0002's handoff.

## Next Actions — handoff

Stopped on 2026-10-14 awaiting Edwin's treatment choice and reason. The comparison and verification above are complete. The uncommitted work consists of this task note, `SNAPSHOT.yaml`, `docs/designs/DES-0001-orbit-comparison.html` and its `__attachments__/TASK-0005-orbit-comparison/` evidence directory. No application source changed, and nothing was committed or pushed.

The question delivered to Edwin was: "Which treatment do you choose, and why?" No answer has arrived. Keep TASK-0005 at `doing` and keep focus here until that decision arrives. Then record his choice and reason in DES-0001's frontmatter, address the chosen treatment's conditional acceptance criterion, and apply the close-out gate before clearing or moving focus. Do not treat the recommendation for Constellation as his decision.

## Notes

Rebuilding the treatments was set aside because the task's objective says "this task ends in Edwin's decision, not in an implementation". The existing renderer supplies the comparison. A first scratch capture used an invalid address; the retained replay script uses the verified `deck://<workspace>/issues?surface=orbit` grammar. The capture used the existing virtual-display container to avoid taking the Mac's keyboard. Neither the capture nor the automated checks substitutes for Edwin's verdict.
