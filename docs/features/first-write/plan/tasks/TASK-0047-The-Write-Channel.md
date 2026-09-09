---
type: "[[task]]"
id: TASK-0047
aliases: ["TASK-0047"]
title: "The write channel: bridge, IPC and a loopback call, with the write capability false when Deck is served"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0013-The-First-Write]]"]
parent: "FEAT-0013"
effort: ""
due: ""
depends: []
blocks: ["TASK-0048", "TASK-0049", "TASK-0050", "TASK-0051"]
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[TASK-0022-Capability-Is-Detected-Not-Assumed]]", "[[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# The write channel

## Objective

Build the route a write travels: the renderer asks the preload bridge, the bridge sends an IPC message, the main process makes a loopback HTTP request to the sidecar, and the answer comes back. Add `write` to the capability set, false when Deck is served. Nothing is written by a person in this task; the channel is proved against a fake sidecar and by the served page offering nothing.

## Detail

**The route is the decision, and it is [[ADR-0003-Deck-Writes-Through-The-Shell]].** The sidecar authorises a write by one fact: the request arrived from loopback. Deck's main process is on the same machine, so its requests qualify. A tablet's do not, and forwarding one through Deck's HTTP host would put a loopback address on a request that came from the network — the same hole [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] closed for the sidecar's loopback-only reads.

**So Deck's HTTP host does not change.** It still answers 405 to every method that is not `GET` or `HEAD`, and no write is forwarded through it under any condition. The write route is the preload bridge, which does not exist on the served page.

**The client gains write methods, and it gains them deliberately.** [[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]] built a client with, by design, no method that writes, and [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]] asserts that only `GET` ever reaches a fake sidecar. That test's claim is now narrower and its note has to say so: the read client still never writes, and the write methods are a separate, named surface used only from the main process. Whichever shape is chosen, the suite must still be able to prove that no write leaves Deck except through it.

**Absent, not disabled.** [[TASK-0022-Capability-Is-Detected-Not-Assumed]] established that a shell-only ability is missing on the served page rather than greyed out. `write` follows that rule: on the tablet there is no verb, no control and no explanation of a control that is not there.

## Acceptance

- A write made from the renderer in the shell reaches a fake sidecar as a POST from loopback, carrying the body Deck built.
- The capability set carries `write`; it is true in the shell and false on the served page, and the suite asserts both.
- The renderer offers no verb when `write` is false, asserted by a search of what the served page renders rather than by a comment.
- Deck's HTTP host still answers 405 to every method that is not `GET` or `HEAD`, including on any new path, asserted over real HTTP.
- No write leaves Deck except through this channel, asserted the way [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]] asserts it today, with that note updated to say what it now claims.
- A sidecar that refuses a write returns its reason to the renderer intact; Deck does not replace it with a generic failure.

## Steps

- [x] Add the write surface to the sidecar client, separate from the read client — `shared/write-client.ts`
- [x] Add the preload bridge method and the IPC handler — `deck.write.transition`, `deck.write.tick`
- [x] Add `write` to the capability set — true in the shell, false when served
- [x] Update [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]] to state what it now claims
- [x] Extend the suite: every method that is not a read is still 405, on every path, over real HTTP
- [x] Write [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] and link it from `tests:` — written at planning time; its evidence is filled in

## Notes

This task changes what a phase note says. [[PHASE-0001-Deck]]'s scope bullet "Reads only. Deck adds no write path of its own" is marked reversed on 2026-09-08, and `docs/ARCHITECTURE.md`'s "Deck reads and never writes" paragraph is rewritten. Both are done at planning time so no code lands against a note that contradicts it.


## Done, 2026-09-09

**The route, whole: renderer → preload bridge → IPC → main process → loopback POST to the sidecar.** Nothing about it touches Deck's HTTP host, which still answers 405 to every method that is not a read, on every path including the two this feature reads from — asserted over real HTTP against seven paths and four methods.

**A separate module, not a method on the read client.** `shared/sidecar-client.ts` still has no method that writes, and [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]] still asserts only `GET` ever reaches a fake sidecar from it. The new claim beside that one is narrower and checkable: no module outside `shared/write-client.ts` both sends a POST and names an `/api/` path. A POST to Deck's OWN host is not a write — the smoke run sends several, to check they are refused — which is why the search is about the sidecar's paths and not about the word POST.

**`write` is false when served, and the verbs are then ABSENT.** Not greyed out: a disabled control is a promise that it could work, and on a tablet it never can. Both halves are checked — the renderer's controls sit behind `capabilities().write`, and the bridge those controls would use does not exist on a served page at all.

**A refusal comes back as the sidecar worded it.** The sidecar knows what Deck does not: that the criterion matched two lines, that the note changed on disk, that the transition is not offered from this status. Replacing that with a generic failure would throw away the only sentence a person can act on.

## One thing the plan assumed and the sidecar does not do

**`/api/render` carries no modification time.** The plan expected the note payload to bring one. It does not — the only endpoint that returns `mtime` is `/api/cockpit/review`, and only for a test note. So the tick reads the time from DECK'S OWN INDEX, which is the better source anyway: the index is the thing watching the file, and `/deck/records/<workspace>?rel=<path>` answers for one note rather than making a reader fetch 2715 records to find one of them.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh write-channel`: 21 checks, 2026-09-09.
- A live write against the sidecar this repository was already running, reverted with `git checkout` afterwards: `ISS-0016` moved `triage` → `deferred` in the file with the decision callout appended, and a criterion was ticked as `- [x] ... — evidence: ... (user:deck-live-check, 2026-09-09)`.
