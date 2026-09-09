---
type: "[[test]]"
id: TST-0037
aliases: ["TST-0037"]
title: "A note cannot run script in the window that writes, every verb asks why, and a verdict Deck cannot record is drawn disabled — all three driven in a real Electron window"
status: active
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["[[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: integration
entrypoint: "desktop/src/main/main.ts"
command: "bash tools/scripts/run-smoke.sh both"
covers: ["[[FEAT-0013-The-First-Write]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
issues: ["[[ISS-0038-Nothing-Checks-The-Tag-That-Stops-A-Note-Running-Script]]", "[[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]]", "[[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]]", "[[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]", "[[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]"]
tasks: []
artifacts: ["tools/scripts/run-smoke.sh"]
adequacy: "Deleting the Content-Security-Policy meta tag fails 2 checks; leaving it in place but permitting inline script fails the driven half, which a check reading the file would not. Putting the reason box back inside the confirmation fails 2. Letting canPerform return true for every row fails 3. Drawing a verb Deck cannot perform without disabling it fails 1. Naming a verb in Deck's own source fails TST-0033 instead, which is where that rule lives."
mutation_score: "5 mutations, 5 killed (2026-09-09)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]", "[[TST-0036-A-Skipped-Check-Is-Not-A-Pass]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]"]
---

# The three guards that only a real window can hold

## Purpose

`node --test` cannot load Deck's renderer, so three guards live in the smoke run and nowhere else. Until this note existed, **no gate ran any of them**: reverting the content policy, the reason box or the refused design verdict left every check green ([[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]). Worse, the three issues that claimed those fixes all cited [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]], a node suite that asserts nothing about any of them, so the verification gate closed on a test measuring something else.

## What it covers

**A note cannot run script in the window that can write.** The reader sets `innerHTML` from the sidecar's rendered Markdown, and Python-Markdown passes raw HTML through, so a `<script>` in a note arrives as a script tag — in the window that since [[ADR-0003-Deck-Writes-Through-The-Shell]] holds `window.deck.write.*`. The run sets `innerHTML` with a script tag and an `<img onerror>`, asks the page afterwards whether either fired, and reads the policy back to check it names `script-src 'self'`.

**Every verb asks why, and the reason reaches the shell.** A row is clicked in the navigator the way a person clicks it, a verb the sidecar marks as not confirming is pressed, every box Deck puts in the status bar is answered, and what arrived at the IPC handler is read.

**A verdict Deck cannot record is drawn disabled and says where it belongs.** Each row on a proposed design is checked for `disabled` and for a title naming the revision requirement and the cockpit.

## How it is safe to run

**It writes to nothing.** The `deck:write:transition` handler is replaced in the main process for the duration, and a probe write proves the replacement took before any control is pressed — if the probe does not land, the run skips loudly rather than proceeding. That guard exists because the first version of this check replaced `window.deck.write` from inside the page, `contextBridge` refused the assignment in silence, and the run moved [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] from `triage` to `open` in this repository for real.

## What it needs, and what happens without it

Electron's binary and a display. `run-desktop-tests.sh` skips that download deliberately; `tools/scripts/run-smoke.sh` exits 127 when either is missing, which `run-tests.py` reports as an environment gap locally and fails on in CI — a check CI cannot run has no verdict.

**It reads this repository's own notes**, so it depends on `ISS-0008` being at `triage` and `DES-0001` at `proposed`. Both dependencies fail loudly rather than passing quietly: a note with no verbs on it is a named failure.

## Verdict

Recorded by running it, not written here ([[project-os-cockpit#ADR-0025]] downstream: a test with a `command:` records no verdict on its note). `bash tools/scripts/run-smoke.sh both` exits 0 only when both configurations report `ok` with nothing failed and nothing skipped.
