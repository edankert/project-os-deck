---
type: "[[task]]"
id: TASK-0029
aliases: ["TASK-0029"]
title: "The band function: one table from the sidecar's groups to front, mid and deep, per view, and overflow is stated rather than silent"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: []
blocks: ["TASK-0030", "TASK-0031"]
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]"]
tests: []
---

# The band function

## Objective

One function decides which of the three bands a note stands in, for every view, from the groups the sidecar already sends. It is written as a table a person can read, it lives in `desktop/src/shared/` with the other pure modules, and it says what happens when a band is full instead of quietly putting a note further back.

## Detail

The navigator already draws the sidecar's groups ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]): the Needs-you group first, then the view's own groups, then the suppressed group folded away. Those three kinds of group are the three bands. What is owed is the **front band**. The view's own subject is the **mid band**. The suppressed group is the **quiet band**, placed behind the person.

The DES-0002 review counted the rule rather than assuming it: six of the seven views receive a Needs-you group, and three of those six (issues, tests, publication) already gather what is owed, so the whole view is the obligation list. The band function carries that as rows in one table rather than as branches in the renderer. The table's inputs are what the payload says about a note: owed, in the view's subject, suppressed. Two more inputs arrive with [[FEAT-0010-Lifting-A-Note]] and are reserved here so the table does not have to be rewritten: held, and joined to a note on the desk.

The front band holds about twelve cards and the mid band about forty. Your Trainer's Issues view has 34 notes needing triage and 409 in all, so the front band overflows in the normal case, not the rare one. The review's rule is that the front plane is "unavoidable", which means nothing owed may be demoted silently. Past the capacity the function returns a count of what did not fit, and the renderer shows it; the navigator lists all of them regardless.

## Acceptance

- The function is pure and tested without Electron, over fixtures built from the real navigation payload of this repository and of Your Trainer.
- For each of the seven views the table says which group lands in which band, and a view with no Needs-you group has a row saying so rather than a fallback.
- A note in the Needs-you group is never assigned to the mid or quiet band; past the front band's capacity it is counted as overflow and the count is returned.
- A note in the view's own groups that does not fit the mid band is counted as mid overflow and is never assigned to the quiet band, because "behind you" must mean finished, not "did not fit".
- The table has columns for held and joined-to-desk that are unused until [[FEAT-0010-Lifting-A-Note]] fills them.

## Steps

- [ ] Write the table: inputs (owed, in subject, suppressed, held, joined to desk) against the band, per view, in one file under `desktop/src/shared/`.
- [ ] Implement the function over the card model the navigator already builds, returning the three bands and the two overflow counts.
- [ ] Build fixtures from the real payloads for this repository and for Your Trainer's Issues and Features views.
- [ ] Add the suite: every view, every band, both overflow counts, and the rule that an owed note never leaves the front band.
- [ ] Write the automated test note and link it from `tests:`.

## Notes

The review's phrase for this is a degree-of-interest function, after Furnas: every note gets a number saying how much the person wants to see it now, and the display shows the most interesting largest. Writing it as one table is what makes "the one that breaks the rule" a row rather than a special case. The Recent view, if it ever returns, is a row here where distance means age, and the table says so.
