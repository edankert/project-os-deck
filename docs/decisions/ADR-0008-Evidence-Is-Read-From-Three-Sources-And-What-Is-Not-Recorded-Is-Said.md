---
type: "[[adr]]"
id: ADR-0008
aliases: ["ADR-0008"]
title: "Evidence is read from Deck's index, the acceptance ledger's payload and the rendered note, and what none of them records is said in words"
status: proposed
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source:
  - "Edwin 2026-10-02: 'Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first. Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.'"
  - "Edwin 2026-10-02: 'Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.'"
  - "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]], its evidence-beside-claim findings and its open questions about evidence sources"
decision: "The evidence shown beside a claim in Glass is read from three places and no other: Deck's own index, the sidecar's acceptance payload, and the rendered note. Each row names its source, its date and the way to the full original. What none of the three records is said in fixed words and is never inferred from a status. Nothing in the panel writes, and the served page reads the same panel through the same GET."
context: "FEAT-0021 asks for a test verdict, capture or excerpt beside an acceptance statement and leaves open which sources Deck can read without changing the tablet's authority. Most of FEAT-0021 waits on cockpit decisions that are not made. A survey on 2026-10-02 found that the tests naming a note, each test's own facts and the acceptance ledger's verdicts are readable today, and that five things FEAT-0021 mentions are recorded nowhere Deck can read."
alternatives:
  - "Also read `/api/notes/acceptance` for a feature's criteria as data: it answers for features only, a criterion there is its line's text with no id, and it carries no link from a criterion to a test"
  - "Also read `/api/cockpit/scope-tests` and `/api/cockpit/release-item` for what blocks a note: in this workspace both compare a bare id against link slugs and return an empty blocking list, which would read as nothing blocking"
  - "Infer a verdict from a status: show a test at `active`, or a feature at `done`, as passed. FEAT-0021 forbids it and a test with a command records no verdict at all"
  - "Wait for the cockpit's per-subject evidence payload (A5 in its DES-0016): that design is proposed, the decision it depends on is open, and the ledger's verdicts are readable now"
  - "Use the sidecar's own `stale` flag for a manual test: that flag is set by an invalidation on the note or a day threshold for tests with a command, which is not the documented 90-day rule"
consequences:
  - "Deck's host forwards one more read, `/api/cockpit/acceptance`, for GET and HEAD only; every other method is still answered 405"
  - "The adoption row `api.read.check-history` moves from `not yet` to adopted, in Glass and not in Parity"
  - "Deck depends on a payload shape the cockpit owns; RISK-0008 tracks it"
  - "A walker's reasons and name in the ledger become readable by anyone who can reach Deck's host when it is started with `--lan`"
  - "A test with a `command:` shows no result, in this feature and until some source records one"
  - "FEAT-0021's levels, flows, level control, level address and A1 counts stay parked in PHASE-0004"
supersedes: ""
superseded: ""
amends: ""
related: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[project-os-cockpit#DES-0016]]", "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]"]
---

# Evidence is read from three sources, and what is not recorded is said

**This decision is proposed, not accepted.** The implementing session made it on 2026-10-02 so that FEAT-0024 could be built, under Edwin's instruction to deliver the evidence experience "establishing its required source contracts first" and to "resolve routine design details using its principles and record your decisions". Accepting it is Edwin's. FEAT-0024 and REQ-0006 are built against the proposal as written here. Five threads it leaves open are listed under Acceptance.

## Context

[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]] is a Parity feature and is parked. Most of it depends on two cockpit designs that are `proposed` ([[project-os-cockpit#DES-0015]] and [[project-os-cockpit#DES-0016]]) and on the cockpit's open decision D9 in its PHASE-045, which is how far down the cockpit's own levels go.

One part of its findings depends on none of that. FEAT-0021 says: "Selecting an acceptance statement should bring its source-backed test verdict, capture or excerpt beside the claim. Each evidence object identifies its source, date and route to the full original. A stale, missing or inaccessible result must be labelled." It also says: "Existing linked notes can open through FEAT-0020 before structured evidence is adopted." And it asks: "Which evidence and trace sources are readable in Deck without changing the served tablet's authority?"

The implementing session surveyed the sources on 2026-10-02 by reading Deck's host (`desktop/src/main/host.ts`), Deck's index (`desktop/src/shared/records.ts`, `desktop/src/shared/graph.ts`) and the sidecar (`../project-os-cockpit/src/project_os_cockpit/`). Three things are readable today:

- **Deck's own index already knows which tests name a note.** Every link in a note's frontmatter is an edge carrying the key it was written under (`field` in `/deck/graph`). Every record carries the note's whole frontmatter as written (`/deck/records`). It carries no body.
- **The sidecar already returns the acceptance ledger's verdicts.** `GET /api/cockpit/acceptance` answers with a row per acceptance check and the history of every verdict. Deck's host does not forward that path today.
- **The sidecar already renders a note's text.** `/api/render` is forwarded, and its HTML carries each checkbox line's raw text in `data-raw`.

The same survey found five things FEAT-0021 mentions that no source records. They are listed under "What no source provides".

## Decision

### A. The three sources

Evidence is read from these three places and from nowhere else.

1. **Deck's own index** (`/deck/records/<workspace>` and `/deck/graph/<workspace>`). It answers two questions. Which test notes name this note, or are named by it, and under which frontmatter key? And what does each test note say about itself in its frontmatter?
   - The keys that count are four: `covers` on a test naming the note; `tests` or `verifies` on the note naming a test; `tasks` on a test naming a task. No other key makes a test a note's evidence, and a link in a note's text does not.
   - The key is shown as written. A row says "its `covers:` names this note" or "named in this note's `tests:`". Deck gives the link no other meaning.
   - A bare id under one of these keys counts the same as a wikilink. The model reads the record's frontmatter as well as the graph's edges, so a test is not missed because of how its author spelled the link.
   - Deck's records route takes `?type=test`, added for this. The page reads every test note's record in one request and no other note's. It is Deck's own host route (`/deck/records/<workspace>`), not the sidecar's.
   - The facts read from a test note's frontmatter are six: `status`, `level`, `command`, `last_verified`, `artifacts` and `review_verdict`.
2. **The sidecar's acceptance payload**, `GET /api/cockpit/acceptance?platform=<p>`. It is read only for a test at `level: acceptance`. From a row (`view.tiers[].areas[].items[]`) Deck reads `id`, `mark`, `verdict_date`, `verdict_reason` and `verdict_method`. From the history (`view.history[<check id>][]`, newest first) it reads `platform`, `release`, `date`, `mark`, `reason`, `by`, `method` and `invalidated_by`. From the top level it reads `schema_version` and `ledger_platforms`.
   - Deck always names the platform in the request, one request per entry in `ledger_platforms`. The sidecar treats a missing platform as "whatever the open release ships" and `all` as the union in which every platform must clear a check. Neither is one platform's verdict, so Deck reads a verdict from neither. The list of platforms is learned from a first request sent with `platform=all`, and nothing but `ledger_platforms` is read from that answer.
   - **A row's `invalidated_by` is not read. Changed during the build, 2026-10-02.** The first draft read it as the ledger's invalidation. It is the test note's own frontmatter field, kept from before a repository had a ledger. The walk on `your-trainer` showed a check carrying an undated one from long ago (`TASK-0385`) beside three dated invalidations in its ledger, and the panel named the old one as the ledger's. An invalidation is read from the history: a check with no standing verdict whose newest event is an invalidation is invalidated, by that event's change and on its date. An invalidation written only on a note is not shown as the ledger's.
   - Deck's host does not pass the sidecar's `X-Cockpit-Schema` header through. The page reads `schema_version` from the body. The value is 4 on 2026-10-02.
3. **The rendered note** (`/api/render`, already forwarded). It supplies the claim itself as its author wrote it, the links the author wrote on a criterion's own line, and the text under a test note's Evidence heading.

### B. What is shown for each kind of test

Which rule applies is decided by the test note's own `level` and `command`, in this order.

1. **A test at `level: acceptance`.** The row shows the ledger's standing verdict: the mark, its date, who recorded it and by which method, and the platform. The source is named as the acceptance ledger. The reason the walker wrote is shown as theirs.
   - With no entry in the ledger the row reads **"not walked: no verdict is recorded"**.
   - When the verdict was invalidated, the row says so, with the change that invalidated it and the date, and shows the verdict before it from the history. An invalidated check has no standing verdict, and the row does not present the earlier one as current.
   - The history of every verdict opens from the row on request.
   - The note's own `status` is shown separately and labelled as the note's status. An acceptance check rests at `active` (`tools/instructions/STATUSES.md`, `[[test]]`), which says nothing about whether it was walked.
2. **A test with a `command:` that is not at acceptance level.** The row reads **"run by a command; its result is not recorded anywhere Deck can read"**. No verdict is shown or implied, and no date. `STATUSES.md` says a test with a command records no verdict. The command itself is shown, because it is what a person would run.
3. **A manual test that is not at acceptance level.** The row shows the note's own `status` and `last_verified`, labelled as coming from the test note. When `last_verified` is more than 90 days before today, the row is labelled stale and names the rule: "A manual verification goes stale after 90 days" (`tools/instructions/STATUSES.md`, "Two things that are not statuses"). Deck computes this from `last_verified`. A manual test with no `last_verified` reads "no date of verification is recorded on the test note".
4. **An acceptance check that also has a `command:`** gets rule 1 and the sentence from rule 2.
5. **A retired test** is still listed, because its frontmatter still names the note. Its row reads "retired: it is no longer performed", from the test note, and shows nothing else. Added during the build, 2026-10-02: `your-trainer` has features whose tests are mostly retired, and a row that read "not walked" for a check nobody is meant to walk would mislead.

The sidecar's own `stale` flag is not used anywhere. It means something else: an invalidation written on the note, or a day threshold for a test with a command.

### C. The words for what is not there

These sentences are fixed, so the suite can check them and a reader meets the same words everywhere.

| What is the case | What the panel says |
| --- | --- |
| No test names the note, under any of the four keys | "no test names this note" |
| An acceptance check with no ledger entry | "not walked: no verdict is recorded" |
| A test with a `command:` | "run by a command; its result is not recorded anywhere Deck can read" |
| A manual test with no `last_verified` | "no date of verification is recorded on the test note" |
| A manual test past 90 days | "stale: a manual verification goes stale after 90 days" |
| The acceptance payload did not arrive, was refused, or is not the shape Deck reads | "the acceptance record could not be read", with the reason |
| The workspace has no ledger (`ledger_platforms` is empty) | "this workspace keeps no acceptance ledger" |
| A test note has no Evidence heading | "this test note has no Evidence section" |
| A criterion line that links a test note | "named on this line" |

Three rules sit behind the table.

- **Nothing is inferred.** A note with no test naming it reads "no test names this note". Its own status, its feature's status and its tasks' statuses do not stand in for a test.
- **A verdict and a status are different words.** A recorded verdict is never called a status. A note's status is never shown as a verdict. Where the panel has both, it shows both under separate labels.
- **An unreadable record is not an empty one.** When the acceptance payload cannot be read, no acceptance row reads "not walked". "Not walked" is a statement about the ledger, and Deck makes it only after reading the ledger.

### D. The excerpt and the way to the original

- Each row names its source (the acceptance ledger, or the test note) and its date, and opens the full original. The original is the test note, opened as a document on the Glass desk by the route FEAT-0020 built, scrolled to its Evidence section when it has one.
- An excerpt is the test note's own text under its heading that begins with "Evidence", read from the rendered note when the row is opened. Nothing is quoted from anywhere else.
- Nothing about an excerpt is stored. It is found by its heading each time it is shown, so there is no saved passage that could move. FEAT-0021 asks that an excerpt "explicitly report that the quoted passage moved"; with nothing saved, the only case left is a note with no such heading, and the row says so.
- `artifacts` is shown as the paths the test note lists. They are not links, because nothing serves them (see "What no source provides").

### E. A criterion in a note's text

- A criterion line gets an evidence control only when the line itself carries a link to a test note, written by its author. Deck checks that the link's target is a test by looking the target up in its own index.
- That link is the only mapping from a criterion to a test that exists. The control reads "evidence named on this line", and opens the same rows as the note's panel, limited to the tests that line names. It stands at the end of the criterion's own words, where its author wrote the link, and before any list nested under the line. It does not wrap or change the line's checkbox.
- A criterion line with no such link gets no control. Deck does not guess a test for it from the note's frontmatter.
- A ticked line's own words ("— evidence: … (who, date)", which is what the cockpit's tick writes) stay in the line where the author's text is. The panel does not parse them into fields.

### F. Authority

- Nothing here writes. Deck records no verdict, changes none and implies none. Marking a check stays in the cockpit.
- The panel offers no control that could be mistaken for a mark.
- The served page reads the same panel through the same GET. Deck's host forwards `/api/cockpit/acceptance` for GET and HEAD and still answers 405 to every other method ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]], [[ADR-0003-Deck-Writes-Through-The-Shell]]).
- Evidence appears on request. The panel is closed until a person opens it, and the acceptance payload is not requested before then.

### G. The assessment FEAT-0021 asks for, source by source

FEAT-0021 says: "Read-only tablet access must be assessed for each adopted source."

| Source | Already reachable by the tablet? | What changes |
| --- | --- | --- |
| Deck's index and graph | Yes, both are Deck's own reads | Nothing |
| `/api/render` | Yes, forwarded since PHASE-0001 | Nothing |
| `/api/cockpit/acceptance` | No | One path is added to the host's allow-list. The sidecar puts no loopback guard on this GET, so forwarding it does not hand the tablet a read the sidecar withholds. The route takes one query argument, `platform`, which the host's existing query check already inspects. It returns this workspace's own acceptance record and nothing from outside it. |

What the tablet newly sees is the ledger's content: each verdict's mark, date, reason, method and author. The tablet can already read every note's text. It could not read the ledger, which is a JSON file and not a note. That is the one new exposure, and it is listed under Acceptance.

### H. What the build measured, 2026-10-02

- **The cost of the read.** Opening a panel that lists an acceptance check makes one request for the list of platforms and one per platform. On this repository that is two answers of about 448 KB each (21 checks, one platform), and the panel was filled 158 ms after the key press. On `your-trainer` it is three answers, 3.3 MB and 4.0 MB for the two platforms (442 checks each), and the panel was filled in 463 to 608 ms across three runs. Both were taken in the Linux box, which says nothing about the Mac's drawing but does include the sidecar's work. The answer is kept until the notes change or a person presses "read again".
- **Every answer carries `ledger_platforms`,** whatever platform was asked. The first request could therefore be dropped if Deck knew one platform's name beforehand. It does not, and A2's rule stands: the first request names `all` and only the list is read from it.

## What no source provides

FEAT-0024 does not show any of these. Each is an external dependency, named with who decides it.

1. **A stable id for a criterion, and a criterion-to-test mapping as data.** In the cockpit a criterion is its line's text; no route returns an id for it or a test for it. The only mapping is a link an author typed on the line. Decided by: the cockpit.
2. **A result or a date for a test with a `command:`.** No sidecar route returns a CI result, and the test note records none by rule. Decided by: project-os upstream (where a run's result would be recorded) and the cockpit (a route for it).
3. **The ledger's evidence references, and any capture over HTTP.** The ledger file has an `evidence` list. No GET route emits it, and Deck's host does not forward `/docs/`, so a picture or a file a test lists has no address a page can load. Decided by: the cockpit for the route; Edwin for whether Deck's host should serve files from a workspace.
4. **A per-subject evidence payload and a machine trace.** These are A5 and A6 in [[project-os-cockpit#DES-0016]]. Both are `proposed`, and the cockpit's PHASE-045 decision D9 is open. Decided by: Edwin, in the cockpit.
5. **A trustworthy list of what blocks a note.** `/api/cockpit/scope-tests` and `/api/cockpit/release-item` return a `blocking` list. In this workspace both compare a bare id against link slugs and come back empty, which would read as "nothing blocking". Deck does not use them. This is a finding to report to the cockpit, and Deck does not work around it.

## Alternatives

- **Also read `/api/notes/acceptance`.** Rejected. It answers for a feature only and returns an error object for any other note. Each criterion there has an index, its text and a state, and no id and no test. It would add a second forwarded path and give the panel nothing the rendered note does not already show.
- **Also read `/api/cockpit/scope-tests`.** Rejected. It finds tests by more frontmatter keys than Deck's four, including `related` and `phase`. A test that only mentions a note under `related:` would then be listed as that note's evidence, and every test in a phase would be listed as the phase note's. It does not read `tasks:`. Its `blocking` list is the unreliable one described above.
- **Infer a verdict from a status.** Rejected. A test with a command rests at `active` whether its last run passed or failed. A feature at `done` says a gate was passed on some day, and does not say which check holds today. FEAT-0021: "A missing payload must not be filled by inferred success."
- **Wait for the cockpit's A5 payload.** Rejected for this part. The ledger's verdicts and the tests' own facts are readable today, and Edwin asked for the independent work to continue. Everything that does need A5 stays parked in FEAT-0021.
- **Use the sidecar's `stale` flag.** Rejected. It would label a manual test stale, or not, by a rule different from the one `STATUSES.md` states and the validator applies.

## Consequences

- `FORWARDABLE` in `desktop/src/main/host.ts` gains one entry. The host's method check, its path check and its query check are unchanged.
- `docs/reference/cockpit-adoption.md` moves `api.read.check-history` from `not yet` to adopted. `CLAUDE.md` says to check the key exists in the cockpit's register before adopting it; it does, as "every verdict ever recorded against each check … in the acceptance payload's `view.history`".
- Deck now depends on a payload the cockpit may reshape. [[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]] tracks it, and the model refuses a payload it does not recognise.
- The panel will show "run by a command; its result is not recorded anywhere Deck can read" for most tests in a project-os workspace. In this one, 42 of the live tests have a command. That is the true state of the record and is the reason dependency 2 is named.
- Out of scope, and not decided here: the levels A0 to A6, the four flows, a level control, a level address and the A1 counts (all FEAT-0021); recording or changing a verdict; running a test; captures; a trace.

## Acceptance

Five threads are open. Each is Edwin's to settle, and the decision can be accepted with any of them still open. The default the build takes is stated with each.

- [ ] **A cockpit capability is adopted in Glass, not in Parity.** [[PHASE-0002-Glass]] says under Out of Scope: "New cockpit capabilities remain Parity work." [[PHASE-0004-Parity]] says of FEAT-0021: "new structured evidence and traces stay in this phase." Edwin's instruction of 2026-10-02 lists this work under "the documented later Glass enhancements" and also says "Respect the documented phase and authority boundaries." The implementing session read the first as placing this part in Glass. Confirm, or move FEAT-0024 to PHASE-0004. Until decided, FEAT-0024 is in PHASE-0002 and adopts one read.
- [ ] **The walker's reasons and name are readable on the local network.** Under `--lan`, anyone who can reach Deck's host can read each verdict's reason and author. Confirm that is acceptable, or ask for the reason and author to be left out of what the served page shows. Until decided, the served page shows the same panel as the shell.
- [ ] **A workspace's own staleness override is not read.** `STATUSES.md` lets a repository change the 90 days with `verification.staleness_days` in `SNAPSHOT.yaml`. That file is not one of the three sources. No workspace on this machine sets it on 2026-10-02. Until decided, Deck applies 90 and the label states the number, so a reader can see which rule was applied.
- [ ] **The cockpit's register lists the route under two keys.** `/api/cockpit/acceptance` appears under `api.read.check-history` (the history) and under `api.read.obligations` (seven routes, of which it is one). The standing verdict on a row belongs to the second. Until decided, `api.read.check-history` is marked adopted, and `api.read.obligations` stays `not yet` with a sentence saying one of its routes is read for the standing verdict.
- [ ] **A workspace with no ledger shows no verdict.** In a repository that has not moved to a ledger, a check's mark may still be written on the note, and the payload's rows carry it. Deck cannot tell that mark from a ledger's and would name the wrong source. Until decided, when `ledger_platforms` is empty the panel reads "this workspace keeps no acceptance ledger" and shows no verdict.
