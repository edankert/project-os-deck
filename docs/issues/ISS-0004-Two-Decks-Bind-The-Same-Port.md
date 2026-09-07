---
type: "[[issue]]"
id: ISS-0004
aliases: ["ISS-0004"]
title: "Two Decks bind the same port, because the free-port probe passes on loopback while another Deck already holds the wildcard address"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Found during the PHASE-0001 review, 2026-09-07: two Deck processes were listening on port 7300 at the same time."]
severity: medium
component: main
parent: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: ["[[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]]"]
---

# Two Decks bind the same port

## Problem

**Two Decks can listen on the same port at the same time, and which one answers a browser is undetermined.** A Deck started with `--lan` holds `*:7300`. A Deck started without `--lan` probes loopback, finds 7300 free there, and binds `127.0.0.1:7300` beside it. Both binds succeed. Anyone who opens `http://127.0.0.1:7300` gets whichever process the operating system routes them to.

This is the mirror image of [[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]. That issue's fix made the probe bind the same interface the host will bind, which stopped a wildcard host from claiming a port a loopback process held. It did not stop a loopback host from claiming a port a wildcard process holds.

## Repro

- Start Deck with `--lan`. It binds `0.0.0.0:7300`.
- Leave it running and start a second Deck without `--lan`.
- The second Deck's probe binds `127.0.0.1:7300`, succeeds, and the host binds the same address.

## Expected

The second Deck moves to the next port, as it does when both are started with `--lan`.

## Actual

Both processes hold port 7300 and `lsof` shows two LISTEN rows.

## Evidence

- A Deck started with `--lan` on 2026-09-06 at 18:11 still held `*:7300` on 2026-09-07.
- A Deck started without `--lan` on 2026-09-07 bound `127.0.0.1:7300` beside it; `lsof` showed both LISTEN rows.
- Starting that same fresh Deck with `--lan` made the probe bind `0.0.0.0`, which failed, and it moved to 7301.
- `desktop/src/main/sidecar.ts`, `freePort`; `desktop/src/main.ts` around line 212, where the interface is passed.

## Next Actions
- [ ] Triage: decide whether a loopback probe should also test the wildcard address, or whether Deck should hold a lock file naming the port it took.

## Resolution

**Fixed 2026-09-07. The probe asks whether anything answers on a port before it tries to bind it.** Binding alone cannot see the problem: a bind on loopback succeeds while another process holds the same port on every interface, which is how two Decks came to listen on 7300. A connection to the port does see it. So a port is offered only when nothing accepts a connection there and this process can bind it.

That makes one probe answer both faults. [[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]] was the mirror case, a port free on loopback that `0.0.0.0` could not take, and the interface argument added then is still what answers it.

The check is [[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]], which holds a real port on `0.0.0.0` and asserts the probe walks past it.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. The reported repro is closed and the check is a real one. I verified the premise independently rather than reading it off the comment: on this machine a bind of `127.0.0.1:P` succeeds alongside a listener already holding `0.0.0.0:P`, so the old bind-only probe would have offered that port and [[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]] would fail. The connect probe sees the listener the bind cannot.

Two residual gaps, recorded as leads rather than filed as issues, because neither is the fault reported here. The probe still checks and then binds later, so two Decks launched at the same moment both find the port unanswered, both bind and release it, and both hand the same number to their host — the lock file this note's Next Actions raised is what would close that, and the Resolution does not say the race remains. And `answersOn` treats its 250ms timeout as "nothing is there", so a process that accepts a connection and then stalls, or whose backlog is full, is still offered as free.
