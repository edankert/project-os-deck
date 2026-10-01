---
type: "[[test]]"
id: "TST-0060"
title: "The native Glass fixtures reconcile and regenerate"
status: "retired"
owner: "user:edwin"
created: "2026-09-29"
updated: "2026-10-01"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
scope: "feature"
level: "system"
kind: "manual"
entrypoint: "prototypes/native-glass/tools/audit-fixture.mjs"
last_verified: "2026-09-29"
covers: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
issues: []
tasks: ["[[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]]"]
artifacts: []
adequacy: "Four focused mutation checks reject a removed selected record, a merged canonical key despite duplicate displayed IDs, and a changed body after its content digest is updated. Independent regeneration and a second live export check reproducibility beyond the auditor's own assertions."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: []
---

# The native Glass fixtures reconcile and regenerate

## Purpose

Check that exported and generated fixtures preserve every selected identity and reader body, that the exporter does not change its source workspace, and that the inputs needed to regenerate scored fixtures are retained.

## Procedure

1. From the repository root, build Deck's compiled index with `npm run build --prefix desktop`, then run `node --test prototypes/native-glass/tools/test-audit-fixture.mjs`.
2. Run `node prototypes/native-glass/tools/audit-fixture.mjs prototypes/native-glass/local/exports/20260929T1049Z/your-trainer-all-notes.json prototypes/native-glass/local/frozen/your-trainer-20260929T1049Z` and repeat for its Features and Issues exports. Save the all-notes output under the ignored export directory.
3. Audit the committed 200-note fixture and the `generated-10000-frozen-r2.json` and `generated-50000-frozen-r2.json` files. For the latter two, supply `-` for the source root and the retained frozen Your Trainer all-notes export as `GENERATOR_PROFILE`.
4. Regenerate the 200-, 10,000- and 50,000-note files at new paths with the commands in the prototype README. Compare each regenerated file's SHA-256 with its source fixture; do not overwrite the retained fixture.
5. Export the live cockpit workspace twice to new ignored directories using `tools/export.mjs`. The exporter checks source Git status, dirty diff and every indexed note's content before and after each export. Audit both outputs against the same source root, then compare each view's note-content, navigation, source-tree and source-revision hashes across the two exports.
6. Inspect the auditor's source report for unresolved local links, cross-repository links, embed markers and HTML markers. Treat these as source findings and reader-support limits, not as silently resolved links or fully rendered Markdown.

## Expected results

- Selected count, unique canonical keys, body bytes, selected links and band distribution reconcile with each manifest. Duplicate displayed IDs retain separate canonical paths.
- The frozen all-notes export equals the non-template indexed source set, and every selected real reader body matches its source file. A changed source tree or body fails the audit.
- Regenerated synthetic files have byte-identical hashes when seed, generator version and retained profile are the same.
- Both live exports leave the source workspace unchanged and yield identical selected content and resolved-navigation hashes. Unreadable source records or selected records without indexed bodies fail rather than being omitted.
- Unsupported or unresolved source content is reported as such; this check does not claim native Markdown rendering parity.

## Evidence

Verified on the Mac Studio on 2026-09-29. The four `test-audit-fixture.mjs` checks passed. The frozen Your Trainer audit reconciled 3,174 selected bodies against 3,196 indexed Markdown files, with four duplicate displayed IDs retaining unique keys; its Features and Issues audits verified 319 and 519 bodies. The generated `r2` fixtures reconciled 10,000 and 50,000 notes and both named retained profile hash `485370efadbddd6e64278914cf69b5672f4512d3b6c1ff364871fd251b19816d`. Independent regeneration matched full-file SHA-256 hashes `ccb0bcf747694c3df07b64cd09c8a66a233cf8ad9b61bcf3464506cdcb3482b3` for the committed 200-note fixture, `2c21afea0d3fa58e53c2991990bf88d68af06d2585b72a17e0becf7448f6a6e3` for 10,000 and `0664599301b4d69ff1ac10d820465476712d757c20592e8cc66bac5363cc51a5` for 50,000.

Two fresh cockpit exports each selected 1,727 all-notes, 159 Features and 315 Issues records. Their corresponding content, navigation, source-tree and revision hashes matched. The source-tree hash stayed `3e57857a5e292184dcf8fb8a3a0ef1ba13065d4b7f7e5cebb4e7313ac4ca3cd4`, and all selected reader bodies matched their source files. The exporter completed its before/after status, diff and per-file content checks without detecting a change. Ignored audit outputs are `prototypes/native-glass/local/exports/20260929T1049Z/your-trainer-all-notes-audit.json` and `prototypes/native-glass/local/exports/20260929T1405Z-cockpit-immutability/cockpit-all-notes-audit.json`. The former reports 148 unresolved local and two cross-repository links, four embed markers and 1,328 HTML tag markers across the source; the latter reports 250, 321, ten and 1,286 respectively. Marker counts are syntax scans, not a full Markdown support verdict.

## Adequacy

The auditor's mutation checks fail for a removed selected record, a duplicate canonical key, and a changed body even when its note-array digest has been recomputed. Repeating the generator and live exporter independently guards against a self-consistent but non-reproducible manifest. The reader's visual handling of embeds, HTML and all other Markdown belongs to [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]; timing and matched-work integrity belong to [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]].

## Retired, 2026-10-01

The subject is gone. Edwin dropped the native Rust evaluation on 2026-10-01 and [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]] removed the prototype this test exercised, so it can no longer be run. Any result recorded above describes the prototype as it stood and says nothing about Deck.
