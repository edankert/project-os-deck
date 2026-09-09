---
type: "[[issue]]"
id: ISS-0028
aliases: ["ISS-0028"]
title: "TST-0033's command and entrypoint name a suite file that was never created, so the repository's own test runner reports one failing test"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
tests: []
---

# The note names `writes`; the file is `write-channel`

## Problem

[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] carries `command: bash tools/scripts/run-desktop-tests.sh writes` and `entrypoint: desktop/tests/writes.test.mjs`. The suite is `desktop/tests/write-channel.test.mjs`. The note was written at planning time and the file was named differently when it was built, and nobody re-read the note.

**The repository's own runner says so**, and it was not run:

```
$ python3 tools/scripts/run-tests.py
passing=22 failing=1
```

`QUALITY.md`'s verification gate blocks a terminal status on its required `[[test]]` notes being `passing`, so this alone holds [[FEAT-0013-The-First-Write]] out of `done`.

**The lesson is not the name.** `npm test` runs every file in `desktop/tests/` and was green throughout, so the discrepancy was invisible to the command that was being run. `run-tests.py` reads each `TST-*` note's own `command:`, which is the only thing that checks a note against the suite it claims. It should have been run before the close-out and was not.

## Expected

The note names the suite that exists, and `run-tests.py` is part of what "the tests pass" means.

## Next Actions
- [ ] Correct the `command:` and `entrypoint:`
- [ ] Run `run-tests.py` at close-out, not only `npm test`

## Fixed, 2026-09-09

**The note names the suite that exists.** `command:` and `entrypoint:` say `write-channel`.

**And the lesson was acted on, which matters more than the rename.** `python3 tools/scripts/run-tests.py` now reports `passing=23 failing=0 unrunnable=0`, and it is what "the tests pass" means from here: `npm test` runs every file in `desktop/tests/` and can never see a note pointing at a file that is not there. It should have been run at the close-out and was not.
