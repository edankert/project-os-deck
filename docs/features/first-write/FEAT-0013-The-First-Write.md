---
type: "[[feature]]"
id: FEAT-0013
aliases: ["FEAT-0013"]
title: "The first write: Deck ticks a criterion and makes one transition, through the shell to the loopback sidecar, and the tablet is offered no verb"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "One verb goes end to end. In the shell, a person ticks an acceptance criterion with evidence and makes one status transition, and the change is in the note on disk and visible in the cockpit. The served page offers no verb at all. This proves the write path ADR-0003 decided, and it is the smallest thing that can."
requirements: []
tasks: ["[[TASK-0047-The-Write-Channel]]", "[[TASK-0048-The-Actor-Is-A-Setting]]", "[[TASK-0049-The-Actuator-Row-And-One-Transition]]", "[[TASK-0050-Ticking-A-Criterion-With-Evidence]]", "[[TASK-0051-The-Changed-Under-You-Mark]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0004-Parity]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ADR-0010]]", "[[project-os-cockpit#REQ-0026]]", "[[project-os-cockpit#REQ-0027]]"]
---

# The first write

## Goal

**Deck changes a note, for the first time.** In the shell, a person ticks an acceptance criterion in the reader, types the evidence, and the file on disk gains `- [x] text — evidence: ... (actor, date)`. They open a note whose state can move, see the verbs the sidecar says are legal, pick one, and the note's status changes. Both are then visible in the cockpit, because both went through the cockpit's own endpoints.

**On the tablet, none of that is there.** Not greyed out — absent, the way pop-out windows are absent when Deck is served. That is [[ADR-0003-Deck-Writes-Through-The-Shell]], and it is a rule with no condition attached: Edwin, 2026-09-08, "the tablet does not write".

Two verbs is the whole scope. This feature is not parity with the cockpit's thirty endpoints; it is the proof that the path exists and behaves, so [[PHASE-0004-Parity]] can adopt the rest a row at a time.

## Scope

**In scope.**

- **The write channel.** Renderer, preload bridge, IPC into the main process, loopback HTTP to the sidecar's existing endpoint. The capability set gains `write`, true in the shell and false when served. Deck's HTTP host is unchanged and still answers 405 to every method that is not a read.
- **The actor.** A setting in Deck's store, sent with every write, visible and changeable by a person. The cockpit hard-codes `user:edwin` in four places and that literal cannot be copied into a second application.
- **The actuator row.** `GET /api/notes/actions` returns the legal verbs for a note with `confirm`, `disabled`, `reason` and `endpoint` per row. Deck draws those rows and restates no verb table, which is the cockpit's [[project-os-cockpit#REQ-0026]]. One transition is wired end to end.
- **Ticking a criterion with evidence.** Through `/api/notes/tick`, which finds the line by its exact prose, refuses when it matches nothing or more than one line, and requires evidence or a reason. The address arrives with the page: the sidecar stamps `data-raw` on each rendered checkbox. The note's modification time is sent with the write.
- **The changed-under-you mark.** A write re-indexes the record, so every other window is stale. The change is announced and applied on the person's action, never silently.

**Out of scope.**

- **Every other verb the cockpit has.** Verdicts, reviews, test runs, release fields, design and inbox writes, note creation. Those are [[PHASE-0004-Parity]], adopted a register row at a time.
- **Writing from the served page, under any condition.** Not deferred — decided against ([[ADR-0003-Deck-Writes-Through-The-Shell]]).
- **The ordinal checkbox toggle** through `/api/notes/check-toggle`. It bypasses the modification-time check, which the cockpit's [[project-os-cockpit#REQ-0027]] records as reconciled, and Deck should not offer it on a note two windows show until that is settled upstream.
- **Setting an arbitrary frontmatter property.** No such endpoint exists in the sidecar; `ALLOWED_FIELDS` is an allow-list per endpoint. A generated editor for a character's age or an issue's severity outside triage is cockpit work.
- **Generated editors and forms.** A description says what a card shows, not what a form edits ([[FEAT-0012-A-View-Is-A-Description]]).

**A cockpit issue is owed.** A guarded property write — set one allow-listed frontmatter field, with the note type's template fields as the allow-list, behind the same loopback and modification-time guards. It is filed the day the first Deck task that needs it starts, following the pattern [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] set. No task in this feature needs it.

## Acceptance

- A criterion ticked in Deck is ticked in the file, carries the evidence and the actor Deck sent, and shows as ticked in the cockpit.
- One status transition made in Deck moves the note's status in the file and appends the decision callout the sidecar writes.
- The verbs Deck offers on a note are exactly the rows `GET /api/notes/actions` returned; no verb table exists in Deck's code, asserted by a search of the built renderer.
- The served page offers no verb at all, asserted in the smoke run against the served host as well as in the suite.
- A tick is refused with a stated reason when the rendered checkbox carries no `data-raw`, which is what the sidecar emits when its rendered count and its source count disagree.
- A tick sends the note's modification time, and a note that changed underneath is reported in words rather than overwritten.
- A record that changed under an open window is marked, and the new state is applied on the person's action.

## Links

- Phase: [[PHASE-0001-Deck]]
- Decision: [[ADR-0003-Deck-Writes-Through-The-Shell]]
- Tasks: [[TASK-0047-The-Write-Channel]], [[TASK-0048-The-Actor-Is-A-Setting]], [[TASK-0049-The-Actuator-Row-And-One-Transition]], [[TASK-0050-Ticking-A-Criterion-With-Evidence]], [[TASK-0051-The-Changed-Under-You-Mark]]
- Plan: `docs/features/first-write/plan/PLAN.md`
- Acceptance walk: [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]


## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All five tasks are `done`. A write travels renderer → preload bridge → IPC → main process → loopback POST to the sidecar's existing guarded endpoint, and nothing about it touches Deck's HTTP host, which still answers 405 to every method that is not a read on every path.

**It was proved against the real sidecar, not only against a fake one.** `ISS-0016` moved `triage` → `deferred` in the file with the decision callout appended; a criterion was ticked as `- [x] ... — evidence: ... (user:deck-live-check, 2026-09-09)`, which is the sidecar's own template exactly; a tick whose modification time had gone stale was refused; and a criterion matching nothing was refused. Everything was reverted with `git checkout` and the working tree left clean.

**Three things this found rather than assumed.**

`/api/render` carries no modification time — the plan expected one. The tick reads it from Deck's own index instead, which is the better source: the index is the thing watching the file.

The three refusal sentences were first written from memory of what such a message might say, and matched none of the sidecar's actual ones. They are now read from `note_writes.py` and confirmed live.

Both branches of the no-address rule happen on real notes here: `TASK-0052` renders five checkboxes with five `data-raw` attributes, and `PHASE-0001` renders eleven with none, because the sidecar's rendered count and source count disagree. Deck offers no tick there and says why.

**The actor is a store field with one control**, defaulted from the machine's user name and never from a literal — a search of the built output proves no source file names a person. The decision to build a control rather than defer it is in [[TASK-0048-The-Actor-Is-A-Setting]].

**What is owed is [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]**, walked with `git diff` beside it so the claim is about the file and not about two screens — and on a real tablet, for the half that says the served page offers no verb at all. `shell.reader.actuators` moves to `adopted` on that walk, which is what its own row in the adoption table says.
