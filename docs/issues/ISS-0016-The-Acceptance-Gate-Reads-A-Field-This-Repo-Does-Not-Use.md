---
type: "[[issue]]"
id: ISS-0016
aliases: ["ISS-0016"]
title: "The validator's acceptance gate reads a mark: field on the test note and never the release ledger, so it can never be satisfied here, and on 2026-11-20 it turns this repository red"
status: declined
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-09
source: ["Close-out of [[PHASE-0001-Deck]], 2026-09-07: three features reached done and each raised a VERIFY-ACCEPTANCE warning naming a walk Edwin had already passed"]
severity: medium
component: tools
parent: ""
related: ["[[project-os-dev#ISS-0060]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[PHASE-0001-Deck]]"]
tests: []
---

# The acceptance gate reads a field this repository does not use

## Problem

**Three features reached `done` on 2026-09-07 and each one produced a warning saying its acceptance walk is unsettled, when Edwin had walked all three and marked them `pass`.** The gate is looking in the wrong place. `tools/scripts/validate-docs.py`, `_acceptance_is_settled`, reads a `mark:` field in the test note's frontmatter. This repository does not put verdicts there: an acceptance test rests at `status: active` and its verdict is an event in `docs/releases/ledgers/WORKING-app.json` (ADR-0037, and `tools/instructions/STATUSES.md`, `[[test]]`). The word `ledger` does not appear anywhere in the validator.

**The vocabulary is also a generation behind.** The message asks for a mark that is "done/incomplete/canceled", which `tools/instructions/TAXONOMY.md` lists under "Legacy values, read forever and never written". The current words are `pass`, `partial`, `na`, `excused`, `blocked`, `question`, `fail`, and the ledger holds `pass`.

**It is a warning today and an error on 2026-11-20.** `PROMOTIONS` in the same file carries `"VERIFY-ACCEPTANCE": "2026-11-20"`. On that date every feature this repository closes fails the build for a rule its notes are designed not to satisfy.

## Repro

```
$ bash tools/scripts/validate-docs.sh
WARN  [VERIFY-ACCEPTANCE] FEAT-0003 is done but the acceptance test TST-0012 covering it is not settled -- its mark is not done/incomplete/canceled
WARN  [VERIFY-ACCEPTANCE] FEAT-0006 is done but the acceptance test TST-0013 covering it is not settled -- its mark is not done/incomplete/canceled
WARN  [VERIFY-ACCEPTANCE] FEAT-0007 is done but the acceptance test TST-0008 covering it is not settled -- its mark is not done/incomplete/canceled
validate-docs: OK
```

All three walks are `pass` in `docs/releases/ledgers/WORKING-app.json`: TST-0012 and TST-0008 on 2026-09-07, TST-0013 on 2026-09-06.

## Expected

The gate reads the ledger, or it says which repositories it applies to.

## Actual

It reads a note field the ledger model replaced, using a vocabulary the taxonomy retired.

## Evidence

- `tools/scripts/validate-docs.py:288` — `_acceptance_is_settled` reads `fm.get("mark")`.
- `tools/scripts/validate-docs.py:779` — `"VERIFY-ACCEPTANCE": "2026-11-20"`.
- `grep -n "ledger" tools/scripts/validate-docs.py` returns only comments about `tools/GRANDFATHERED.yaml`.
- `tools/instructions/TAXONOMY.md`, "Acceptance outcomes (the ledger's vocabulary)".

## Filed upstream, 2026-09-09

**[[project-os-dev#ISS-0060]]**, at `triage`, carrying the same evidence and the two things a fix has to decide: where the verdict lives (read the ledger where a repository has one, and keep reading `mark:` where it does not, since both models are live across the fleet), and which vocabulary settles it (the message names words `TAXONOMY.md` retired, so it sends a reader looking for a field they were told never to write).

`project-os-dev` rather than `project-os` because that is where the template's own work is tracked; `project-os` holds no issues of its own.

**Nothing was patched here**, deliberately. `tools/scripts/` is template-owned and `sync-project-os.sh` overwrites a local patch, so a fix in this repository would last until the next sync.

## What this costs PHASE-0001

**A phase may not be `done` while a note naming it in `phase:` is unresolved** (`STATUSES.md`, validator PHASE-CHILDREN), and this note names it. So [[PHASE-0001-Deck]] cannot close while this sits at `triage`, and the fix is not Deck's to make.

**Two ways out, and the choice is Edwin's.** Either this becomes `declined` here — a deliberate no-action, with the reason being that the fix is upstream and is filed — or the phase waits for [[project-os-dev#ISS-0060]]. Nothing is gained by guessing; the phase owes four acceptance walks anyway, and this can be settled alongside them.

## Declined here, 2026-09-09

**`declined` means a deliberate no-action, and that is exactly the state.** `tools/scripts/` is template-owned and `sync-project-os.sh` overwrites a local patch, so there is no version of this where Deck fixes it. Leaving the note open would not have been a decision, only the absence of one — and it would have held [[PHASE-0001-Deck]] open against another repository's schedule, since a phase may not close while a note naming it is unresolved.

**What was actually done, so the decline is not just a status change.**

The fix is filed where the code lives, as [[project-os-dev#ISS-0060]], carrying the same evidence and the two things a fix has to decide.

`tools/GRANDFATHERED.yaml` now names the ten features this gate will hit, with the reason on each row. Without it, every feature this repository closes would fail the build from 2026-11-20 for a rule its notes are designed not to satisfy. The file says to delete the whole block when the upstream issue lands, and says that a list needing extension is the argument for fixing it rather than extending the list.

**This is a judgement, and it is reversible in one line.** If Deck should instead wait for the upstream fix, set this note back to `open`, delete the grandfather block, and the phase waits with it.

## Next Actions

- [x] The fix belongs upstream — filed as [[project-os-dev#ISS-0060]], 2026-09-09
- [x] Decide whether this is `declined` here or waits for upstream — declined, 2026-09-09, with the reasoning above
- [x] Grandfather the affected ids so the November promotion does not turn this repository red — `tools/GRANDFATHERED.yaml`, 2026-09-09
