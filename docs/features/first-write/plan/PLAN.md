---
type: "[[plan]]"
title: "Plan — the first write"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0013-The-First-Write]]"]
implements: ["[[FEAT-0013-The-First-Write]]"]
related: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]"]
---

# Plan — the first write

## Delivery sequence

1. **[[TASK-0047-The-Write-Channel]]** — Bridge, IPC, loopback call, and the `write` capability that is false when served. Nothing is written yet; the channel is proved by a fake sidecar and by the served page offering nothing.
2. **[[TASK-0048-The-Actor-Is-A-Setting]]** — Who the write says it is, held in the store and visible to the person.
3. **[[TASK-0049-The-Actuator-Row-And-One-Transition]]** — Read the legal verbs from the sidecar, draw them, and wire one transition end to end.
4. **[[TASK-0050-Ticking-A-Criterion-With-Evidence]]** — The tick in the reader, with evidence required, the modification time sent, and a refusal when the checkbox carries no address.
5. **[[TASK-0051-The-Changed-Under-You-Mark]]** — The record changed; say so, and apply on the person's action.

## Dependencies

- **Hard:** TASK-0047 is first; nothing can be written before there is a channel. TASK-0048 lands before either verb, because a write with no actor is a write nobody can attribute.
- **Hard:** TASK-0051 needs [[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]'s revision, or the sidecar's own change signal, to know that something moved.
- **Soft:** TASK-0049 and TASK-0050 are independent of each other and can be built in either order. The transition is the simpler of the two and is the better proof of the channel; the tick is the one Edwin named.
- **Soft:** this feature is independent of [[FEAT-0012-A-View-Is-A-Description]] and can run beside it.

## Open questions

- **Where the actor setting is edited.** Deck has no settings surface. A store field with no interface is enough for this feature and is a poor answer for [[PHASE-0004-Parity]]; TASK-0048 decides how far to go and says why.
- **Whether a refused write is an error or a state.** A tick the sidecar refuses because the line matched twice is not a fault in Deck, and it should read as an instruction to the person. TASK-0050 chooses the wording rather than surfacing an HTTP status.
