---
type: "[[task]]"
id: TASK-0048
aliases: ["TASK-0048"]
title: "The actor is a setting in Deck's store, because the cockpit's hard-coded name cannot be copied into a second application"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0013-The-First-Write]]"]
parent: "FEAT-0013"
effort: ""
due: ""
depends: ["TASK-0047"]
blocks: ["TASK-0049", "TASK-0050"]
related: ["[[FEAT-0013-The-First-Write]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# The actor is a setting

## Objective

Every write Deck makes says who made it. That name is a field in Deck's store, set once and visible to the person, not a literal in the code.

## Detail

**The cockpit writes `user:edwin` in four places in its renderer.** The sidecar accepts whatever `actor` a request body carries — it is free text, and no check anywhere reads it. Copying the cockpit's literal into Deck would mean two applications each asserting a name neither can justify, and it would make Deck unusable by anybody else on the day someone else opens it.

**A store field is the right size for this feature.** [[FEAT-0003-One-Store-In-The-Main-Process]] already holds the state every window subscribes to and already survives a restart. The actor goes there, defaulted from something the machine actually knows rather than from a name in a source file, and every write reads it from the store rather than taking it as an argument.

**Where a person changes it is the open question this task closes.** Deck has no settings surface. A store field with no way to edit it is enough for one feature and is a poor answer for [[PHASE-0004-Parity]], where a working day includes several verbs. This task decides how far to go — a minimal control, or none yet with the reason written down — and records the decision here rather than leaving it to the next reader.

**The actor is never sent from the served page**, because the served page makes no write at all ([[ADR-0003-Deck-Writes-Through-The-Shell]]).

## Acceptance

- The actor is a field in Deck's store, survives a restart, and is the only source of the name any write carries.
- The default is derived from the machine or the workspace rather than written in the source; the derivation is named in this note.
- No source file in Deck contains a person's name as a literal, asserted by a search of the built output.
- Every write in this feature reads the actor from the store, asserted in the suite by changing it and observing the request body.
- Whether a person can edit it, and where, is decided and recorded in this note's Notes.

## Steps

- [ ] Add the actor to the store's state and its reducer, with the default derivation.
- [ ] Read it in the write channel rather than passing it per call.
- [ ] Decide the editing surface, or decide there is none yet, and write the reason down.
- [ ] Add the literal-name search to the suite.
- [ ] Extend [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] with the actor cases.

## Notes

The sidecar does not verify the actor, so this field is a record of intent, not an identity. Saying that plainly matters: a person reading a decision callout in a note should know it says who claimed to act, not who was proven to.
