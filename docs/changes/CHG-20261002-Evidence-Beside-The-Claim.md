---
type: "[[change]]"
id: CHG-20261002-Evidence-Beside-The-Claim
title: "A Glass document lists the tests that name its note and what is recorded for each, and Deck's host forwards one more read"
status: merged
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first.'"]
commit: "1a71001"
pr: ""
impacts: ["desktop/src/shared/evidence.ts", "desktop/src/main/host.ts", "desktop/src/shared/sidecar-client.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/deck.css", "desktop/fixtures/acceptance/", "desktop/demos/glass-evidence.cjs", "docs/reference/cockpit-adoption.md"]
issues: []
features: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[PHASE-0002-Glass]]"]
---

# Evidence beside the claim

## Summary

A document on the Glass desk now says how many tests name its note, and opens a panel that lists them with what is recorded for each. A check a person walks shows the verdict in the acceptance ledger, or says nobody has walked it. A test run by a command says its result is recorded nowhere Deck can read. Nothing is inferred from a status. Someone reading a note in Glass sees this; the panel writes nothing.

## Impact

This repository has no survey notes, so each line names the screen in words.

- **Glass, a document's header:** a control reading "evidence · 6", "evidence · no test", or "evidence · this test" on a test note. E opens it.
- **Glass, the evidence panel:** beside the text in a document at least 760 px wide, above it in a narrower one. One row per test, with the frontmatter key it was found under. Each fact is labelled "verdict" or "status of the test note" and names where it comes from. A row opens the test note's Evidence section as an excerpt, opens the test note itself, and opens the history of every verdict. "read again" reads the record again.
- **Glass, a criterion line in a note's text:** a line that links a test note has a control, "evidence named on this line", which lists only that line's tests.
- **The page a tablet loads:** the same control and the same panel.
- **A document's other panels:** a document that leaves the desk now opens next time with its panels closed, however it left.

## What changed underneath

- Deck's host forwards `GET /api/cockpit/acceptance` to the sidecar, and still answers 405 to every method that is not GET or HEAD. Under `--lan` a tablet can now read each verdict's mark, date, reason and author.
- Deck's own records route takes `?type=`, so the page reads every test note's record in one request.
- The rule for what may be said is `desktop/src/shared/evidence.ts`, checked without a window. An answer of another schema, or one that cannot be read, is said to be unreadable and is never shown as "not walked".
- `docs/reference/cockpit-adoption.md` moves `api.read.check-history` to adopted and gains six keys the cockpit's register had added since it was last read.

## What was decided and can be overturned

[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]] is `proposed`, with five threads open for Edwin. The first is whether this belongs in the Glass phase at all: the phase notes placed evidence in Parity, and this delivers the one part that needs no cockpit decision.

## What no source provides

These are external dependencies, named in ADR-0008 with who decides each: an id for a criterion and a criterion-to-test mapping; a result for a test with a command; the ledger's evidence references and any capture; the cockpit's per-subject evidence payload and trace; a trustworthy list of what blocks a note. Deck shows none of them and says so where a reader would look.

## Evidence

In [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]] and [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], which was run on this repository and on `your-trainer`. The host's refusals are in [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]].

Not done: the acceptance check a person walks, [[TST-0077-A-Claims-Evidence-Stands-Beside-It]].

## Documentation Coverage (All Types Considered)

- features: new. FEAT-0024; FEAT-0021 says which of its findings this delivers and stays parked.
- requirements: new. REQ-0006 lists the evidence collected; no criterion is ticked.
- tasks: new. TASK-0111 to TASK-0114.
- issues: not-applicable. A finding about the cockpit's `blocking` list is written up in TASK-0114 as text to file there.
- tests: new and updated. TST-0077 to TST-0079 are new; TST-0007 covers the new path.
- workflows: not-applicable.
- decisions: new. ADR-0008, proposed.
- risks: new. RISK-0008.
- changes: new, this note.
- snapshot: updated.

## Risk scan

Recorded in [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]] and [[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]: one new dependency on a payload the cockpit owns, and one new exposure on the local network.

## Follow-ups

- [ ] Edwin walks TST-0077.
- [ ] Edwin settles ADR-0008's five open threads.
- [ ] The finding in TASK-0114 is filed in project-os-cockpit.
