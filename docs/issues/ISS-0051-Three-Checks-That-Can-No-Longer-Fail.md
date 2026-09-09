---
type: "[[issue]]"
id: ISS-0051
aliases: ["ISS-0051"]
title: "Three checks cannot fail any more: one reads the working tree after reverting it, one takes the last verdict when an earlier one failed, and one asks a date question that a list-valued date answers wrongly"
status: open
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The fifth independent review of PHASE-0001, 2026-09-09, findings 3, 4 and 5"]
severity: medium
component: tests
parent: ""
related: ["[[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]]", "[[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]", "[[ISS-0046-An-Empty-View-Is-Excused-By-A-Name-Somebody-Chose]]"]
tests: []
---

# Each of the last three fixes left a check that always passes

## Problem

**The revert happens before the assertion reads the tree.** [[ISS-0048-Six-More-Statements-In-The-Notes-Do-Not-Reproduce]] added `finally { git checkout -- rel }` to the design-verdict block of `check-write-round-trip.mjs`, and the line *"and that refusal changed no file"* runs after it. Replacing the transition with a real `fs.appendFileSync` to DES-0001 still gives `ok` on that line and `18 of 18 passed`.

**The runner takes the last verdict, not the worst.** `run-smoke.sh` matches every `{"ok": ...}` block in the output and reads the final one. A run that prints a failing verdict and then any later object beginning `ok` exits 0 with nothing said. Only the exit code saves it today, and the whole point of parsing the JSON was that the exit code was not enough.

**The date condition misses the shapes it most needs to catch.** `DATED_AHEAD.stillTrue` reads `frontmatter.due` and `frontmatter.scheduled`, keeps them only when they are strings, and slices ten characters. Driven against a temporary vault: `due: 2026-12-01` and `2026-12-01T09:00:00` correctly expire three exemptions; `due: [2026-12-01]`, the same as a block list, and `01/12/2026` expire **none** — the condition reports "still true" when it is false. A list-valued frontmatter field is the exact shape of project-os-cockpit#ISS-0279, which is the difference Deck exists to preserve.

## Fix

Read the tree inside the `try`, before reverting. Fail on any verdict block that is not `ok`, not merely the last. And make the date condition collect every date-ish value including list members, and treat a value it cannot read as a reason to **expire** the exemption rather than to keep it — an exemption that cannot prove itself should not hold.

## Acceptance

- [ ] Appending to DES-0001 inside that block turns "changed no file" red
- [ ] A failing verdict followed by a passing one fails the runner
- [ ] A list-valued or unreadable `due:` expires the exemption instead of preserving it
