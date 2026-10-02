---
type: "[[risk]]"
id: RISK-0008
aliases: ["RISK-0008"]
title: "The evidence panel misreports a verdict when the sidecar's acceptance payload changes"
status: open
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Risk scan for [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]], 2026-10-02", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]"]
phase: "[[PHASE-0002-Glass]]"
likelihood: medium
impact: high
mitigation: ["[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]", "[[TASK-0112-Forward-The-Acceptance-Record-As-A-Read]]", "[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
related: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]"]
---

# The evidence panel misreports a verdict when the acceptance payload changes

## Description

**A check a person passed could read "not walked", and nothing in Deck would fail.** FEAT-0024 makes Deck read `GET /api/cockpit/acceptance`, a payload the cockpit owns. Deck reads a row's `id`, `mark`, `verdict_date`, `verdict_reason`, `verdict_method` and `invalidated_by`, the history under `view.history`, and `ledger_platforms`. The cockpit is where new functionality lands, so this payload will change. If a field Deck reads is renamed or moved, a reader that takes "field absent" for "no verdict" would show "not walked: no verdict is recorded" for every check. That is a false statement about the record, in the one panel whose purpose is to say only what is recorded.

Three things make this likely enough to track.

- **The payload is versioned for the cockpit's own client.** It carries `schema_version`, 4 on 2026-10-02, and the sidecar sends the same number in an `X-Cockpit-Schema` header. Deck's host passes on only the content type and length, so a page served by Deck never sees that header.
- **The route means different things by its `platform` argument.** With none, it answers for whatever the open release ships. With `all`, it answers for the union, in which a check is cleared only when every platform cleared it. A client that asked the wrong way would show a passed check as unchecked on a repository with two ledgers.
- **Nothing in Deck watches the cockpit's code.** This is the shape of RISK-0002 and RISK-0004: Deck depends on behaviour in another repository, and no check here goes red when it changes.

A second, smaller hazard comes with the same read. **Under `--lan`, the ledger's content becomes readable on the local network through Deck's host**: each verdict's mark, date, reason and author. A tablet could already read every note's text. It could not read the ledger, which is a JSON file and not a note. A walker's reason is a sentence written for the record and may say more than a note would.

## Mitigation

- **Refuse what is not recognised, and say so.** TASK-0111: the model reads `schema_version` from the body and refuses a payload that is not version 4 or that lacks `view.tiers` or `view.history`. The panel then reads "the acceptance record could not be read" with the reason. No acceptance row reads "not walked" unless the ledger was read.
- **Pin the result, not the implementation.** TASK-0112 records a fixture of the real payload from this workspace's sidecar, with its date and the cockpit commit, and TASK-0111's suite reads it. Re-recording the fixture after a cockpit change is what turns a changed shape into a failing test.
- **Always name the platform.** TASK-0112: the client sends `platform` on every request and reads a verdict only from a per-platform answer.
- **Compare with the file.** TASK-0114's walk compares each verdict the panel shows with the ledger file on disk, on two workspaces. A disagreement is a failed walk.
- **Keep the adoption table true.** TASK-0112 marks `api.read.check-history` adopted in `docs/reference/cockpit-adoption.md`, so a change to that row in the cockpit's register is something grooming sees.
- **The exposure on the local network is Edwin's to accept or narrow.** ADR-0008 lists it as an open thread. The host stays loopback-only unless Deck is started with `--lan`.

### What is in place, 2026-10-02

- The model refuses an answer that is not schema 4 or lacks `view.tiers` or `view.history`, and the panel then says the record could not be read. TST-0078 breaks each refusal once and a test fails.
- `desktop/fixtures/acceptance/app.json` is the sidecar's answer as recorded on 2026-10-02 at cockpit `d1df13c`, and the suite reads it.
- The client always names the platform. The walk counts the requests.
- The walk compares the panel with the ledger file on disk on two workspaces. It also holds the sidecar's own answer to the file wherever a platform's ledger is one file.
- The adoption table carries the row.

The risk stays `open`. Two things are not mitigated. Nothing runs when the cockpit changes: the fixture catches a change only when someone records it again. And the exposure on the local network is Edwin's to accept or narrow (ADR-0008, second thread).

**One case the build found, of exactly this kind.** The first draft read a row's `invalidated_by` as the ledger's invalidation. It is the test note's own frontmatter. Nothing failed on this repository, where the field is empty. The walk on `your-trainer` showed a check named as invalidated by an undated task from long ago. A second workspace is what caught it.

## Triggers

- The cockpit's `SCHEMA_VERSION` changes from 4, or a change note there touches the acceptance payload, the ledger or `api.read.check-history`.
- The panel reads "the acceptance record could not be read" on a workspace whose sidecar is running.
- The panel reads "not walked" for a check the cockpit shows as passed, or the reverse.
- The re-recorded fixture differs in shape from the committed one.
- Deck is run with `--lan` on a network that people other than Edwin use.
