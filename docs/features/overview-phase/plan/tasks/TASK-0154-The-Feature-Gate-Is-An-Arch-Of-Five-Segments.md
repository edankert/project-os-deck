---
type: "[[task]]"
id: TASK-0154
title: "The feature's gate is an arch of five segments over the feature, drawn by one component that S3 and S7 both use"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'I am not sure what these tasks/requirements/reviews/automated tests and acceptance tests buckets are supposed to be.'", "Edwin 2026-10-15, approving: 'do not add the extra text for the feature boxes instead redesign the feature boxes (boxes look wrong in the current design)'", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0159]]", "[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0149]]", "[[TASK-0151]]", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0085-Flow-Scenes-And-Payloads-Keep-The-Recorded-Evidence]]", "[[TST-0100-Accept-A-Feature-From-Its-Five-Lamps]]"]
---

# The feature's gate is an arch of five segments

**Edwin said the gate's five labelled boxes "look wrong", and declined the idea of a subtitle under each one.** The gate is what a feature must show before it is accepted: its requirements, tasks, reviews, automated tests and acceptance tests. This task redraws it as one shape instead of five boxes.

The new gate is an arch of five segments standing over the feature's own mark. Each segment fills with the share of its items that are done, in that bucket's type colour. Its count sits at the segment, drawn beside a mark as the look requires. Its word runs along the arch. A bucket Deck cannot read stays visibly "not reported": an empty, neutral outline with no fill and no needs-you dot. The same component is drawn small on S3, above the ticket's text.

What each bucket means goes into the callout on its segment, and into DES-0005. It does not go on the screen at rest:

- **Requirements**: the acceptance criteria of the requirements the feature implements, ticked with evidence.
- **Tasks**: the feature's tasks, done.
- **Reviews**: the independent reviews the feature needs (normally two), approved and recorded.
- **Automated tests**: tests with a command, with a result recorded.
- **Acceptance tests**: manual checks a person runs, with a pass in the release ledger.

## Definition of Done
- [x] The gate's drawing moves out of `desktop/src/shared/overview-flows.ts` (`gateChips`) into a drawing-lane module, `desktop/src/shared/overview-gate.ts`. It takes the same `AcceptData` that `featureGate` and `gateFromModel` return; Codex's data functions stay in `overview-flows.ts`. Codex agrees to the move under FEAT-0029's "Questions between the lanes" before the code moves, because that file is in Codex's lane.
- [x] The arch has five segments in a fixed order (requirements, tasks, reviews, automated tests, acceptance tests). Each fills with its done share, carries its count and a mark for that count, and has its word along the arch.
- [x] "Not reported" and "nothing to check" stay distinct and visible, as TASK-0151 made them, and neither draws a needs-you dot.
- [x] Pointing at a segment, or focusing it, shows a callout with the bucket's meaning (the five sentences above), its count and its missing items. The list twin keeps five evidence rows.
- [x] S3 draws the small arch for a feature. The 60-word limit at rest holds on S3 and S7 on both workspaces.
- [x] TST-0090 and TST-0085 check the arch on both fixtures: five segments, the fill share matching the counts, "not reported" drawn without fill. `cd desktop && npm test` passes. Two independent Claude reviewers, each in a clean context, review it in two rounds at most (Codex stopped running on 2026-10-15, and Edwin asked for Claude only).

## Steps
- [x] Propose the module move under FEAT-0029's "Questions between the lanes"; wait for Codex's agreement. (Codex stopped running before it could answer; the arch was drawn in its own module so Codex's file was untouched, and Claude made S7's switch in TASK-0159.)
- [x] Draw the arch as SVG paths from the five counts; keep the gate's existing mark ids (`gate-<feature>-<key>-…`) so the evidence checks keep holding.
- [x] Use it on S3; leave S7's switch to TASK-0159 (done by Claude once Codex stopped).
- [x] Add the five meanings to the callout text and to DES-0005.

## Verification

The arch is `desktop/src/shared/overview-gate.ts` (`gateArch`): five parts in a fixed order, each a gauge of cells filled from its items' evidence, its count outside the arch with a mark for each number, its name beyond it, its meaning in the callout. Unknown parts are dashed, carry no cells and say "not reported"; empty ones say "nothing to check"; neither draws a needs-you mark. S3 draws it small, S7 large; `gateChips` is gone. The flows suite (TST-0085) and the screens suite (TST-0090) check it on both fixtures; the S3 sweep keeps every ticket screen within sixty words. Reviewed in two rounds by two independent Claude reviewers (FEAT-0028).

## Notes

Claude lane. Starts at once. Codex's TASK-0159 (S7 with the arch and the feature's text) waits on it.

Placed under FEAT-0028 because the drawing lane owns it and S3 is its first user. S7 is FEAT-0029's screen and uses the component through TASK-0159.
