---
type: "[[task]]"
id: TASK-0029
aliases: ["TASK-0029"]
title: "The band section of every description, and the function that applies it: front, mid and deep per view, with overflow stated rather than silent"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0044"]
blocks: ["TASK-0030", "TASK-0031"]
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[TASK-0044-Band-And-Face-Come-From-The-Description]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
tests: ["[[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]]", "[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]"]
---

# The band section of every description, and the function that applies it

## Objective

One function decides which of the three bands a note stands in, for every view, from the groups the sidecar already sends. The table it applies is the `band` section of each view description, not a module of Glass's own. The function lives in `desktop/src/shared/` with the other pure modules, and it says what happens when a band is full instead of quietly putting a note further back.

**Amended 2026-09-08.** This task was "one table from the sidecar's groups to front, mid and deep, per view", in a module Glass owned. [[ADR-0004-A-View-Is-A-Description]] made a view a description, and the band rule is one of its five sections. The acceptance below is unchanged; what changed is where the table lives and who else reads it. **This task now depends on [[FEAT-0012-A-View-Is-A-Description]]**, whose [[TASK-0044-Band-And-Face-Come-From-The-Description]] moves the table into the description and writes the function. What is left here is Glass's use of it: the field bands by the same rule the navigator folds by and Spread groups by.

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
- **Amended 2026-09-10.** The table also has columns for `pulled` and `pushed`, unused until [[TASK-0053-Pull-Forward-And-Push-Behind]] fills them, with the rule stated now so it is not invented later: pulled beats subject for the front band, pushed beats subject for the quiet band, and owed beats both, so an owed note is never moved by a hand.

## Steps

- [x] Write the table as the `band` section of each of the seven descriptions: inputs (owed, in subject, suppressed, held, joined to desk) against the band, per view.
- [x] Implement the function over the card model the navigator already builds, returning the three bands and the two overflow counts.
- [x] Build fixtures from the real payloads for this repository and for Your Trainer's Issues and Features views.
- [x] Add the suite: every view, every band, both overflow counts, and the rule that an owed note never leaves the front band.
- [x] Link [[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]], which covers the table and the function, and add whatever Glass's own use needs on top.

## Notes

The review's phrase for this is a degree-of-interest function, after Furnas: every note gets a number saying how much the person wants to see it now, and the display shows the most interesting largest. Writing it as one table is what makes "the one that breaks the rule" a row rather than a special case. The Recent view, if it ever returns, is a row here where distance means age, and the table says so. The hand's inputs, added on 2026-09-10 by [[FEAT-0014-The-Hands]], are the first that come from a person rather than from the record, and the reason owed beats them is that the front plane's meaning as what the record says needs a person must survive a rearrangement by hand.

## Outcome

**Done 2026-09-10.** The field deals a view's notes into the three bands with the description's own `band` table and the function TASK-0044 wrote. What Glass adds is `desktop/src/shared/field.ts`: `fieldEntries` turns the navigator's groups into one entry per note, and `dealField` orders the front band and counts what the front plane has to say. Every one of the seven views has six rows, in this order: owed, joined to the desk, pulled, pushed, suppressed, and the view's subject. Owed is first, so no hand can move an owed note.

**The sidecar's double listing is dealt once.** A note that needs a person arrives twice, in Needs-you and under its phase. The field deals it once, owed, under its phase heading, so it has a sector if a hand ever lets it into the middle.

**Only a group's own cards are dealt, not their children.** The navigator folds a feature's tasks under it and the field shows them as the feature's progress bar. A child is dealt on its own when the desk or a hand names it.

**Evidence.** [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]], 9 of 9 over the real navigation payloads of this repository and of Your Trainer's Issues and Features views; five mutations of the rule, five killed.
