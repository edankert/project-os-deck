---
type: "[[test]]"
id: TST-0020
aliases: ["TST-0020"]
title: "A popped-out window carries one named panel, and an address naming a panel Deck cannot draw is refused"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/panels.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh panels"
covers: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
issues: []
tasks: ["[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]"]
artifacts: []
adequacy: "Putting `status` back in the panel list fails the refusal check at both ends. Letting the formatter write a panel the parser rejects fails the agreement check. Returning the raw value from panelOrNull fails the untrusted-input check."
mutation_score: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[TST-0005-Every-State-Round-Trips-Through-Its-Address]]"]
---

# A popped-out window carries one panel

## Purpose

Popping out used to open the same view again with no navigation, which is a duplicate rather than a second window worth having. A popped-out window now carries exactly one panel, and the address it opens at says which. This suite checks the list of panels and the address grammar that carries them.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0020` reproduces it locally without writing anything.

## Procedure

- Assert the panel list is exactly `needs-you`, `note` and `desk`, and that each carries a label a person reads.
- Write each panel into an address alongside a desk and a note, parse the address back, and assert all three came back.
- Parse addresses naming panels Deck cannot draw, the old `status` value among them, and assert each is refused rather than opened as something else.
- Ask the formatter to write a panel the parser would refuse, and assert it throws instead.
- Feed `panelOrNull` a panel name, an unknown name, null and a number, and assert only the panel name survives.
- Format and parse a window with no panel, and assert it is the whole application at an address of its own.

## Expected results

- A window carries one of exactly three things, each with a name a person reads on the menu that opens it.
- A panel survives being written into an address and read back, alongside the desk and the note the address also carries.
- The two ends of the grammar agree: what the formatter refuses to write, the parser refuses to read. A disagreement would let Deck save an address it cannot reopen.
- A panel read from somewhere untrusted is a panel or nothing. The old `status` value is refused now, not silently mapped.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh panels`: 6 checks, all passing on 2026-09-07.
- The desktop suites run 143 checks in total on that date, this one included.
- The address grammar itself is checked separately by `[[TST-0005-Every-State-Round-Trips-Through-Its-Address]]`; this suite checks the panel it carries.

## Adequacy (who verifies this test?)

Putting `status` back in the panel list fails the refusal check and the formatter check together, which is the point of asserting both ends. Letting the formatter write a panel the parser rejects fails the agreement check, and that is the failure that would produce an address Deck writes down and then cannot open. Returning the raw value from `panelOrNull` fails the untrusted-input check on the number and on the unknown name.

## Notes

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. The suite is a real guard on the grammar: putting `status` back in `PANEL_TYPES` fails the refusal check at both ends, and the formatter and the parser are asserted to agree, which is the failure this grammar exists to prevent. `address.test.mjs` was also corrected so the desk-with-a-space check finds its state by content rather than by index, which is the right repair.

What this suite cannot reach is the window: it tests the address, not what happens when Deck restarts. The persistence half of TASK-0026 has a defect recorded on [[FEAT-0004-Windows-On-Any-Screen]], and nothing here or in the smoke run would have caught it.
