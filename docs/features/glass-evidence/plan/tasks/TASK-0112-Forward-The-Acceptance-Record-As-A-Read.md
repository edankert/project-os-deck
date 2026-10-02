---
type: "[[task]]"
id: TASK-0112
title: "Forward the acceptance record as a read"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
parent: "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"
effort: S
due: ""
depends: []
blocks: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]"]
related: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]"]
tests: ["[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]"]
---

# Forward the acceptance record as a read

Deck's host starts forwarding one more sidecar path, `GET /api/cockpit/acceptance`, so a page can read the acceptance ledger's verdicts. Nothing else about the host changes. The assessment that this adds a read and no write is ADR-0008, part G.

## Definition of Done

- [x] `FORWARDABLE` in `desktop/src/main/host.ts` gains `/api/cockpit/acceptance`, with a comment saying why it may be forwarded: it is a read, the sidecar puts no loopback guard on it, and it returns this workspace's own acceptance record.
- [x] No other entry is added. `/api/cockpit/acceptance-debt`, `/api/notes/acceptance`, `/api/cockpit/scope-tests`, `/api/cockpit/release-item` and `/docs/` are still answered 403. The matching rule is "equals an entry or begins with an entry plus `/`", so `acceptance-debt` is not let through by the new entry, and the suite asserts that by name.
- [x] The host suite (`desktop/tests/host.test.mjs`) shows that GET and HEAD on `/deck/sidecar/<workspace>/api/cockpit/acceptance?platform=app` reach the fake sidecar with the query intact, and that POST, PUT, PATCH and DELETE on the same path are answered 405 with the fake sidecar recording nothing.
- [x] The suite shows the host's query check still applies to the new path: a `platform` value that names a way out (`../x`, an absolute path) is answered 403.
- [x] The same assertions hold when the host is bound beyond loopback, which is how the tablet reaches it.
- [x] The page-side client (`desktop/src/shared/sidecar-client.ts`) gains one read for the acceptance payload that always sends `platform`. It has no write method, as today. It hands back the body, or the reason no body arrived: no sidecar (503), refused (403), not answering (502), or a body that is not JSON.
- [x] The client reads `schema_version` from the body. The host passes on only the content type and length, so the sidecar's `X-Cockpit-Schema` header does not reach a page.
- [x] A fixture of the real payload is recorded from this workspace's sidecar and kept under `desktop/fixtures/`, with the date and the cockpit commit it came from written in or beside it. TASK-0111's suite reads it, so a change in the payload's shape is seen when the fixture is re-recorded (RISK-0008).
- [x] `docs/reference/cockpit-adoption.md` is updated: `api.read.check-history` moves from `not yet` to adopted, dated, naming the route, FEAT-0024 and ADR-0008. `api.read.obligations` stays `not yet` and gains one sentence: one of its seven routes, `/api/cockpit/acceptance`, is read for a check's standing verdict. The "Read against" baseline line is brought up to the cockpit commit the register was read at.
- [x] [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] gains FEAT-0024 and REQ-0006 in `covers:` and a line in its expected results for the new path.
- [x] `bash tools/scripts/run-desktop-tests.sh host` passes, `npm test` in `desktop/` passes, and the smoke run's check that the host answers 405 to a write is unchanged.

## Steps

- [x] Read ADR-0001's last consequence (why the host forwards an allow-list), ADR-0008 part G and RISK-0002.
- [x] Confirm in the sidecar (`../project-os-cockpit/src/project_os_cockpit/server.py`, the `/api/cockpit/acceptance` branch) that the route reads only `platform` and has no loopback guard. Record the cockpit commit read.
- [x] Confirm the key `api.read.check-history` in `../project-os-cockpit/docs/reference/cockpit-capability-register.md` still names this route, as `CLAUDE.md` asks before a capability is adopted.
- [x] Add the entry, the client read and the host tests.
- [x] Record the fixture and update the adoption table and TST-0007.

## Notes

Built on 2026-10-02 in `1a71001`. The host's boxes are shown by the host suite ([[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]], `bash tools/scripts/run-desktop-tests.sh host`), which drives GET, HEAD and four write methods at the new path bound to loopback and bound beyond it, with a fake sidecar recording what reached it. The client's boxes are shown by the walk counting the requests the page made ([[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]): none until a panel that lists an acceptance check is opened, then one naming `all` and one naming each platform. The fixture is `desktop/fixtures/acceptance/app.json` with a README beside it saying when and from which cockpit commit it was recorded. The last box is shown by the pass at `18f5405`: `npm test` passes 645 of 645 and `bash tools/scripts/smoke-in-a-box.sh both` exits 0.

One thing was added that this note did not ask for. Deck's own records route takes `?type=`, so the page reads every test note's record in one request (`desktop/src/main/host.ts`, checked in `desktop/tests/index.test.mjs`). It is Deck's route and not the sidecar's.

The adoption table gained six keys as well as the one row this task moves. The cockpit's register had added them since the table was last read, and the rule in `CLAUDE.md` is that each arrives here as `not yet`.

The sidecar treats a request with no `platform` as "what the open release ships", and `all` as the union in which every platform must clear a check. Neither is one platform's verdict. That is why the client always names the platform. It learns the names from a first request sent with `platform=all`, reads only `ledger_platforms` from that answer, and then asks once for each platform named there (ADR-0008, A2).

Under `--lan` this path lets anyone who can reach Deck's host read each verdict's reason and author. ADR-0008's second open thread asks Edwin whether the served page should leave those out. Until he answers, the host forwards the payload unchanged, as it does every other read.
