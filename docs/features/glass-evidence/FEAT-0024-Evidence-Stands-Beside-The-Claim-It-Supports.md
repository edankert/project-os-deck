---
type: "[[feature]]"
id: FEAT-0024
title: "Evidence stands beside the claim it supports"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-02: 'Complete the documented later Glass enhancements: […] Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first. Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.'", "Edwin 2026-10-02: 'Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.'", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]"]
goal: "A person reading a note on the Glass desk can ask what supports it and see, beside the claim, the tests that name it and what is recorded for each, with the source, the date and the way to the original, and with plain words where nothing is recorded."
requirements: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]"]
tasks: ["[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]", "[[TASK-0112-Forward-The-Acceptance-Record-As-A-Read]]", "[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]", "[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
release: ""
acceptance_exception: ""
related: ["[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[project-os-cockpit#DES-0016]]", "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]"]
---

# Evidence stands beside the claim it supports

> [!quote] As asked — Edwin, 2026-10-02
> 4. Complete the documented later Glass enhancements: […] Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first. Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.

## Goal

A person reading a note on the Glass desk asks what supports it. A panel on that document lists the tests that name the note. For each test it shows what the record holds: a verdict from the acceptance ledger, or the test note's own status and date. Each row names where it came from and when, and opens the full original.

Where the record holds nothing, the panel says so in plain words. A test run by a command shows no result, because none is recorded where Deck can read it. A note no test names says exactly that. Nothing is filled in from a status.

## Scope

This feature delivers one part of [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]] and leaves the rest of it parked.

**Why this part and not the rest.** FEAT-0021 is a Parity feature, and [[PHASE-0004-Parity]] is not open. Most of it depends on the cockpit's DES-0015 and DES-0016, which are `proposed`, and on the cockpit's open decision D9 in its PHASE-045. That part stays exactly as it is: the levels A0 to A6, the four flows, a level control, a level address and the A1 counts. FEAT-0024 builds none of it.

One part of FEAT-0021's findings needs none of those decisions. It reads: "Selecting an acceptance statement should bring its source-backed test verdict, capture or excerpt beside the claim. Each evidence object identifies its source, date and route to the full original. A stale, missing or inaccessible result must be labelled." And: "Existing linked notes can open through FEAT-0020 before structured evidence is adopted." The sources for a verdict and an excerpt exist today. FEAT-0024 delivers that part, in PHASE-0002, on the Glass document FEAT-0020 built. The implementing session made this scope decision on 2026-10-02 on Edwin's instruction quoted above; a capture is not delivered, because no source serves one.

**What is built.**

- **The evidence panel of a note.** A document on the Glass desk gains an evidence control in its header. Opening it shows a panel inside that document, listing every test note that names the note under `covers` or `tasks`, or that the note names under `tests` or `verifies`. Each row shows the key the link was written under.
- **What each row shows.** For an acceptance check: the ledger's standing verdict with its date, who recorded it, how and on which platform, or "not walked: no verdict is recorded", or the invalidation with the verdict before it. For a manual test below acceptance level: its own status and last-verified date, labelled as the test note's, and labelled stale after 90 days with the rule's name. For a test with a command: "run by a command; its result is not recorded anywhere Deck can read".
- **The excerpt and the original.** A row opens the test note's text under its Evidence heading, and opens the test note itself as a document on the desk at that section. A test note with no Evidence heading says so.
- **A criterion's own control.** A criterion line in the note's text gets an evidence control only when the line itself links a test note. The control reads "named on this line".
- **One new read.** Deck's host forwards `GET /api/cockpit/acceptance`. The served page shows the same panel.

**Out of scope.** The levels, the flows, the level control and the level address (FEAT-0021). Recording or changing a verdict. Running a test. Captures and any file a test lists under `artifacts`. A machine trace. A result for a test with a command. A mapping from a criterion to a test beyond a link on the criterion's line. A new sidecar route, a new write route, a new package.

## Decisions

The source contract and the words the panel uses are decided in [[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]. That decision is at `proposed`. The implementing session made it on 2026-10-02 and accepting it is Edwin's. This feature is built against the proposal.

| Question, from FEAT-0021's open questions | Where it is answered |
| --- | --- |
| Which evidence and trace sources are readable in Deck without changing the served tablet's authority? | ADR-0008 A and G. Three sources. One new forwarded GET, assessed there. No trace source is readable. |
| Which payload identifies a claim or criterion and links its verdict, timestamp, capture and source revision? | None does. ADR-0008 "What no source provides", items 1, 3 and 4. A verdict is linked to a test, and a test to a note, never to a criterion's id. |
| Which freshness rule marks evidence as stale? | ADR-0008 B3. The documented 90-day rule for a manual test, computed in Deck. An acceptance verdict is not aged; the ledger invalidates it. |
| How are source excerpts anchored and checked after edits? | ADR-0008 D. By the Evidence heading, found each time, with nothing stored. |
| How do inaccessible sources appear without leaking their content? | ADR-0008 C. "the acceptance record could not be read", with the reason and no row reading "not walked". |

Four details are not in ADR-0008 because they are placement on the document and follow from [[DES-0003-Collections-And-Documents-On-Glass]]. They are recorded here.

1. **The panel is part of the note's document, not a second object.** DES-0003: "One subject has one spatial object on a desk." The panel opens inside the document, beside its text when the document is wide enough and above it when it is not. It moves and closes with the document.
2. **The text never waits for the panel.** DES-0003: "A summary must never require another click before the text." The header shows the evidence control with the count of tests naming the note, which comes from Deck's index and costs no request. The panel is closed when a document opens.
3. **Opening the original uses the document route that exists.** The test note opens as its own document. When it is already on the desk it is found and raised (REQ-0002). The return is to the row that opened it.
4. **A test note's own document has the panel too.** It shows that test's own row, so its verdict can be read where its procedure is.

Six more were settled while building, 2026-10-02, each from what the walks showed.

5. **The header's control says the count in words that cannot read as a result.** "evidence · 6" for six tests, "evidence · no test" for none, and "evidence · this test" on a test note's own document. Its tooltip and its accessible name say the whole sentence: "6 tests name this note".
6. **A criterion's control stands at the end of the criterion's own words.** That is where its author wrote the link to the test. The planner's draft put it beside the checkbox; at the start of the line it pushed the text and sat beside the tick control Deck already draws there. It reads "evidence named on this line".
7. **In a document too narrow for the panel to stand beside the text, the evidence takes the related list's place.** Under 760 px the panel is above the text. With the related list open as well, the first walk's picture showed the text squeezed to a few lines. Opening one now closes the other in a narrow document. In a wide one both stay.
8. **One document's evidence is open at a time,** as with the related list. Opening another document's panel closes this one.
9. **"read again" stands at the top of the panel.** At the bottom it was under the compass when the document filled the field, and the pointer could not reach it.
10. **A document that leaves the desk opens next time with its panels closed.** Closing with the × did this already for the related list and the details. Sweeping the desk did not, so a note reopened after a sweep came back with its list open. All three panels now close however the document left.

Five threads are open under ADR-0008's Acceptance section, and each is Edwin's. The first is the phase: whether adopting a cockpit capability belongs in Glass.

## Acceptance

- The panel of a note lists exactly the tests that name it or that it names, each with the key the link was written under. A note with none reads "no test names this note", whatever its status.
- An acceptance check that was walked shows the ledger's mark, date, author, method and platform. One never walked reads "not walked: no verdict is recorded". One whose verdict was invalidated says so, with the change and the date, and shows the verdict before it without presenting it as current.
- A manual test below acceptance level shows its status and last-verified date as the test note's own. Past 90 days it is labelled stale with the rule's name.
- A test with a command reads "run by a command; its result is not recorded anywhere Deck can read". It shows no verdict, no date and no colour that suggests one.
- No row calls a verdict a status or shows a status as a verdict.
- With the sidecar stopped, or the acceptance payload in a shape Deck does not read, the panel reads "the acceptance record could not be read" and no row reads "not walked".
- Each row names its source and date and opens the test note as a document at its Evidence section. The excerpt is that section's text. A note without the heading says so.
- A criterion line that links a test note has a control reading "named on this line". A line that links none has no control.
- The panel opens and closes by pointer and by keyboard, returns focus to its control, and appears without travel under reduced motion.
- The served page shows the same panel. Deck's host forwards the acceptance path for GET and HEAD and answers 405 to every other method. No control in the panel records a verdict. `git status` in the workspace is unchanged.

## Verification

Built on 2026-10-02 and checked at `4243fc2`.

- **`npm test` in `desktop/`: 586 tests, all passing** (run at `0169d7f`, which differs from `4243fc2` by notes and one word in a comment). The evidence model is [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]] (`bash tools/scripts/run-desktop-tests.sh evidence`, 18 tests). Each of its rules was broken once in the module and a test failed; the list is in that note. The host's refusals on the new path are in [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] (`bash tools/scripts/run-desktop-tests.sh host`).
- **The scripted walk, [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], in the Linux box.** On a copy of this repository: 36 checks, all holding, none not run. On a copy of `your-trainer`, which keeps ledgers for two platforms: 28 checks, all holding, 3 parts not run. That note lists what was seen, the measurements and seven defects the walks found, each fixed here.
- **The earlier walks were run again in the same pass,** after the document's structure changed to hold the panel beside the text, and all held: the Glass desktop, arrangements, scenes, handoff, the collection's refresh and the neighbourhood.
- **Not done: a person's walk.** [[TST-0077-A-Claims-Evidence-Stands-Beside-It]] has not been walked and the ledger holds no verdict for it. Its steps were checked against the built application and two were rewritten to routes that exist.
- **The full smoke run, on loopback and on the network, with this feature in the build:** `bash tools/scripts/smoke-in-a-box.sh both` exits 0 at `4243fc2`. The loopback half, run once more with each check printed, shows 389 checks passing, none failing and none skipped, 291 of them in the Glass section. The run's comparison of a document's text with the note's own leaves out the evidence control, as it does the tick control.

The feature rests at `review`. It is built and its automated checks pass. `done` needs REQ-0006's criteria ticked with evidence, and two of them name the walk a person takes.

## Impact analysis

Checked on 2026-10-02 against ADR-0001, ADR-0003, ADR-0006, REQ-0001, REQ-0002, FEAT-0013, FEAT-0020, FEAT-0021, DES-0003, PHASE-0002, PHASE-0004, `docs/PHASES.md`, `docs/reference/cockpit-adoption.md` and the adoption contract in `CLAUDE.md`.

**No conflict found with:**

- **ADR-0001.** It says Deck "forwards an allow-list of the paths it actually reads and refuses everything else". One path is added, because Deck now reads it. The reason for the allow-list is that forwarding makes a request arrive from loopback, which would hand the network the reads the sidecar keeps to loopback. `/api/cockpit/acceptance` has no loopback guard in the sidecar, so it is not one of those reads. Under `--lan` anyone who can reach Deck's host can now read it. The method check is untouched.
- **ADR-0003.** No write is added. The panel offers no verb. The capability set is unchanged, and the served page is still offered no verb at all.
- **REQ-0002 and FEAT-0020.** The panel is inside the note's one document, so "the same note has one spatial representation" holds. The original opens through the existing document route. Checkboxes and guarded actions keep their behaviour: the criterion control sits beside a line and does not replace or wrap its checkbox. The panel scrolls as part of the document, so REQ-0002's rule that object scrolling never turns or zooms the field applies to it. On a narrow window the panel stacks above the text and stays reachable.
- **FEAT-0013 (the first write).** A tick with evidence is still made from the checkbox through the shell. The evidence control is a different control with a different name and writes nothing.
- **REQ-0001 and ADR-0006.** The collection and its membership are not touched.
- **The adoption contract in `CLAUDE.md`.** It says: "Before adopting a capability, check its key exists there; file an issue in the cockpit repository if the register does not describe it well enough." The key `api.read.check-history` exists in the cockpit's register and names this route. TASK-0112 moves the row.

**Four tensions, none resolved here. Each is listed for Edwin under ADR-0008's Acceptance or below.**

1. **The phase notes place evidence in Parity, and this feature is in Glass.** PHASE-0002, Out of Scope: "New cockpit capabilities remain Parity work." PHASE-0004, on FEAT-0021: "Existing linked notes already use FEAT-0020; new structured evidence and traces stay in this phase." `docs/PHASES.md` read "Structured evidence and information levels remain Parity work" until this note was written. Edwin's instruction of 2026-10-02 lists this work under "the documented later Glass enhancements" and also says "Respect the documented phase and authority boundaries." This feature takes the first as placing the part that needs no cockpit decision in Glass, adopts one existing read, and leaves every "new" payload and the trace in Parity. Whether that reading is right is Edwin's (ADR-0008, first thread).
2. **DES-0003 expects later cockpit contracts to supply verdicts.** Its delivery table says of structured evidence: "Later cockpit contracts supply reliable verdicts and traces. Existing linked notes can already use the document model." And: "New evidence payloads and information-level addresses remain FEAT-0021 dependencies." This feature uses no new payload. It reads the acceptance ledger's verdicts through a route the cockpit has had since 2026-09-06. DES-0003 draws no evidence panel, so this note carries no `design:` link, and DES-0003 is not edited.
3. **The cockpit's register lists the route under two keys.** `api.read.check-history` names `/api/cockpit/acceptance` for its `view.history`. `api.read.obligations` lists the same route among seven. The standing verdict on a row is the second key's. Marking `api.read.check-history` adopted is accurate for the history and understates what is read. ADR-0008's fourth thread carries the default.
4. **FEAT-0021 mentions a capture, and none is delivered.** Its finding reads "test verdict, capture or excerpt". A capture has no source: the ledger's `evidence` list is not returned by any GET route, this workspace's ledger holds an empty one, and Deck's host does not forward `/docs/`. This feature delivers the verdict and the excerpt and names the capture as external dependency 3.

## Risk scan

Scanned on 2026-10-02 against the five triggers in `tools/instructions/LIFECYCLE.md`.

- **A new external dependency or version constraint: yes.** Deck starts reading a payload the cockpit owns. Its shape may change, and its `schema_version` is 4 today. A changed field would not fail loudly. It would make a check a person passed read "not walked", which is the one false statement this feature exists to avoid. [[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]] is opened for it, with TASK-0111 and TASK-0112 as mitigation.
- **A new required environment variable or configuration surface: none.**
- **A directory layout or artifact path change: none.** The walk writes to `desktop/dist/walks/glass-evidence/`, which is build output and is not committed.
- **A runtime increase or new long-running step: a small one, measured.** Opening the panel on a note with an acceptance check makes one request to learn the ledger's platforms and one more per platform. The payload covers every acceptance check in the workspace. In the box, on this repository the panel was filled 152 ms after the key press (448 KB per answer); on `your-trainer` in 466 ms (3.3 MB and 4.0 MB). Nothing is requested until a panel that lists an acceptance check is opened, and the answers are kept until the notes change.
- **A security, credential or licence exposure: one, named.** Under `--lan`, the ledger's content becomes readable on the local network through Deck's host: each verdict's mark, date, reason and author. The tablet could already read every note's text and could not read the ledger. RISK-0008 records it, and ADR-0008's second thread asks Edwin whether the reason and author should be left off the served page.

## External dependencies

Each of these is recorded nowhere Deck can read on 2026-10-02. FEAT-0024 shows none of them and says so on screen where a reader would look for it. None blocks the build.

| What is missing | What it blocks | Who decides it |
| --- | --- | --- |
| A stable id for a criterion, and a criterion-to-test mapping as data. In the cockpit a criterion is its line's text. | Evidence per criterion, beyond a test linked on the criterion's own line. Selecting any acceptance statement and getting its verdict, as FEAT-0021 words it. | The cockpit. |
| A result or a date for a test with a `command:`. No sidecar route returns a CI result, and the test note records none by rule. | A verdict for 42 of this workspace's tests: its 41 unit suites and one integration suite. | project-os upstream for where a run's result is recorded; the cockpit for a route. |
| The ledger's evidence references, and any capture over HTTP. The ledger's `evidence` list is not returned by any GET route, and Deck's host does not forward `/docs/`. | The "capture" in FEAT-0021's finding, and a working link for a path a test lists under `artifacts`. | The cockpit for the route; Edwin for whether Deck's host serves workspace files. |
| A per-subject evidence payload (A5) and a machine trace (A6), from the cockpit's DES-0016. Both are `proposed`, and the cockpit's PHASE-045 decision D9 is open. | The rest of FEAT-0021's evidence view: one gathered answer per subject, commits, validator and runs, and the trace. | Edwin, in the cockpit. |
| A trustworthy `blocking` list. `/api/cockpit/scope-tests` and `/api/cockpit/release-item` compare a bare id against link slugs in this workspace and return an empty list. | Saying what blocks a note. Deck does not use either route. | The cockpit. This is a finding to report there, and TASK-0114 writes the report's text. Deck does not work around it. |

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Decision: [[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]] (proposed)
- Requirement: [[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]
- Tasks: [[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]], [[TASK-0112-Forward-The-Acceptance-Record-As-A-Read]], [[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]], [[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]
- Acceptance: [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]
- Risk: [[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]
- Draws from: [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]], which stays at `backlog` in PHASE-0004 with everything this feature does not build.
- Baseline: [[DES-0003-Collections-And-Documents-On-Glass]] states the principles this is built on and draws no evidence panel, so this note carries no `design:` link.
