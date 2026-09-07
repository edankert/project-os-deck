---
type: "[[issue]]"
id: ISS-0016
aliases: ["ISS-0016"]
title: "The validator's acceptance gate reads a mark: field on the test note and never the release ledger, so it can never be satisfied here, and on 2026-11-20 it turns this repository red"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Close-out of [[PHASE-0001-Deck]], 2026-09-07: three features reached done and each raised a VERIFY-ACCEPTANCE warning naming a walk Edwin had already passed"]
severity: medium
component: tools
parent: ""
related: ["[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[PHASE-0001-Deck]]"]
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

## Next Actions

- [ ] The fix belongs upstream: `tools/scripts/` is template-owned and is pulled from `../project-os` by `tools/scripts/sync-project-os.sh`. File it there rather than patching the copy here, which the next sync would overwrite.
- [ ] Until then, the three IDs can go in `tools/GRANDFATHERED.yaml` if the November promotion arrives before the upstream fix.
