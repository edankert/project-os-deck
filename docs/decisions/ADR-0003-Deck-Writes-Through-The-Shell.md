---
type: "[[adr]]"
id: ADR-0003
aliases: ["ADR-0003"]
title: "Deck writes through the shell to the loopback sidecar, and the host it serves a tablet never writes"
status: accepted
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source:
  - "Edwin 2026-09-08, answering the architecture review's third question: 'the tablet does not write'"
  - "Edwin 2026-09-08, scoping the review: 'The deck needs to have the same functionality as the cockpit, so it needs to be able to write ... set state/property of a note and check check-boxes in the content of a note'"
  - "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 3"
decision: "A write in Deck travels from the renderer through the preload bridge, into the Electron main process, and out as a loopback HTTP request to one of the sidecar's existing guarded endpoints. Deck's own HTTP host carries no write: it answers 405 to every method that is not GET or HEAD, as it does today. The capability set gains `write`, which is false on the served page, so a tablet is offered no verb at all. The actor sent with a write is a setting in Deck's store, never a literal in the code."
context: "The cockpit's only authorisation for a write is the caller's address being loopback ([[project-os-cockpit#ADR-0010]]). Its out-of-loopback form is a draft requirement with no feature ([[project-os-cockpit#REQ-0034]]). Deck's shell shares a machine with the sidecar and can therefore write today; forwarding a write through Deck's host would launder a tablet's address into loopback."
alternatives:
  - "Deck stays read-only everywhere, and every verb waits for the Parity phase"
  - "Deck's host forwards writes once the cockpit's REQ-0034 defines a proof, so the tablet writes later"
consequences:
  - "PHASE-0001's scope bullet 'Reads only. Deck adds no write path of its own' is reversed on 2026-09-08, and the last paragraph of docs/ARCHITECTURE.md is rewritten with it"
  - "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] is unchanged: its subject is the HTTP host, and that host still refuses every write"
  - "The verbs Deck offers are the rows GET /api/notes/actions returned; Deck restates no verb table, which is the cockpit's REQ-0026"
  - "A served page shows no verb rather than a disabled one, the same way pop-out windows are absent rather than greyed"
  - "A write changes the record under every other window, so Deck must mark a stale view and apply the change on the person's action rather than silently"
  - "The adoption row api.write.notes moves from `not applicable` to `not yet`"
related: ["[[PHASE-0001-Deck]]", "[[FEAT-0013-The-First-Write]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[project-os-cockpit#ADR-0010]]", "[[project-os-cockpit#REQ-0026]]", "[[project-os-cockpit#REQ-0034]]"]
---

# Deck writes through the shell, and the served host never writes

## Context

Deck has never written anything, and the phase note called that a rule rather than a stage: "Deck adds no write path of its own". Edwin asked on 2026-09-08 for the opposite. Deck must be able to set a note's state, tick a checkbox inside a note's body, and generate views that let a person check acceptance criteria. That is a write path, and where it runs has to be decided before three phases are built on the assumption that there is none.

**The cockpit's write path has exactly one lock, and the lock is the caller's address.** About thirty POST endpoints touch files, and each one checks that the request arrived from loopback. The cockpit says so in as many words: the loopback check is not a safety feature on top of an authorisation model, it is the authorisation model ([[project-os-cockpit#ADR-0010]]). There is no header, token, session or signature anywhere in the sidecar, and the `actor` in a request body is free text the cockpit's own renderer hard-codes.

**That single lock is fine for a program on the same machine and useless over a network.** Deck's shell runs beside the sidecar, so a request from its main process arrives from loopback and the sidecar's guards apply as intended. Deck's served page runs in Safari on a tablet, and the only way to make its writes reach the sidecar is to forward them through Deck's host — which would put a loopback address on a request that came from the network. That is the exact hole [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] closed for the sidecar's loopback-only reads, and re-opening it for writes would be worse.

**The cockpit has a plan for network writes and it is a draft.** [[project-os-cockpit#REQ-0034]] asks for proof per request, never a session and never a LAN fallback, with the mechanism undecided and no feature building it. Deck could wait on it. Edwin decided not to wait and not to want it: asked directly whether the tablet ever writes, he answered "the tablet does not write".

## Options

1. **Deck stays read-only everywhere.** Nothing changes today, and every verb waits for [[PHASE-0004-Parity]]. It costs the four things Edwin asked for, and it leaves the write path undecided while Glass, Parity and Vault are built over it.
2. **Deck's host forwards writes once the cockpit defines a proof.** The tablet gets verbs eventually. It makes Deck's first write depend on a draft requirement in another repository, and it puts a write path through the one surface Deck exposes to the network.
3. **The shell writes through its main process; the served host never writes.** Deck gets every verb the sidecar already guards, on the machine where the guard means something, and the network surface keeps refusing writes by method.

## Decision

**Option 3.** A write starts in the renderer, crosses the preload bridge, and is made by the Electron main process as a loopback HTTP request to the sidecar endpoint that already exists for that verb. Nothing about the sidecar changes: the same endpoints, the same guards, the same registry of which verbs a note in a given state allows.

Four things follow, and each is built rather than assumed.

**Deck's HTTP host still refuses every write.** It answers 405 to any method that is not `GET` or `HEAD`, which is what it does today and what [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] decided. No write is forwarded through it, with or without a proof.

**The capability set gains `write`.** It is true in the shell, where the preload bridge exists, and false on the served page. The renderer offers a verb only when the capability says it can, so a tablet shows no verb rather than a disabled one — the rule [[TASK-0022-Capability-Is-Detected-Not-Assumed]] already established for pop-out windows.

**The tablet reads, and no condition is attached.** This is a rule, not a wait. If the cockpit lands [[project-os-cockpit#REQ-0034]] one day, adopting it is a new decision and this one is superseded; nothing in Deck is built expecting it.

**The verbs come from the registry and the actor comes from the store.** Deck asks `GET /api/notes/actions` which verbs a note allows and draws the rows it gets back, so no verb table is restated in Deck ([[project-os-cockpit#REQ-0026]]). The actor is a setting a person can see and change, because the cockpit's hard-coded `user:edwin` is a literal that cannot be copied into a second application.

## Alternatives

- Deck stays read-only everywhere and every verb waits for [[PHASE-0004-Parity]].
- Deck's host forwards writes once [[project-os-cockpit#REQ-0034]] defines a proof, so the tablet writes later.

## Consequences

- **A sentence in [[PHASE-0001-Deck]] is reversed.** Its scope said "Reads only. Deck adds no write path of its own." That is marked reversed on 2026-09-08 with this decision as the reason, and the closing paragraph of `docs/ARCHITECTURE.md` is rewritten from "Deck reads and never writes" to the shell-writes, served-reads rule.
- **[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] is not reversed.** Its subject is the HTTP host and the host's behaviour is unchanged. The two decisions together say: the shell writes, the host does not carry the write.
- **A write makes every other window stale.** The sidecar re-indexes after a write, and Deck's other windows are then showing an old record. [[PHASE-0002-Glass]] and [[PHASE-0004-Parity]] already require that a change arriving mid-view is announced and applied on the person's action. The first write is the first time Deck needs that rule, so the mark is built in [[FEAT-0013-The-First-Write]] rather than deferred.
- **The read-only claim on the network surface is now the only one Deck makes, so it has to be checked rather than described.** The smoke run asserts that the served page offers no verb, beside the existing check that the host answers 405.
- **The adoption table changes position.** `api.write.notes` was `not applicable` with the reason "Deck adds no write path at all". It becomes `not yet`, naming this decision and [[FEAT-0013-The-First-Write]].
- **Two verbs are enough to prove the path, and the rest are Parity's.** [[FEAT-0013-The-First-Write]] builds a tick with evidence and one transition. Everything else the cockpit's register lists as a verb stays `not yet` and is adopted a row at a time.
- **A generic property write still does not exist in the sidecar.** `ALLOWED_FIELDS` in the cockpit's `note_writes.py` is an allow-list per endpoint, and there is no "set this field to this value" verb. An editor that wants one is cockpit work, filed there the day the Deck task that needs it starts.
