---
type: "[[test]]"
id: TST-0066
aliases: ["TST-0066"]
title: "A relationship between two notes is named only in the words the source wrote: the frontmatter key a link stands under, or 'link', and never a meaning Deck made up"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/relations.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh relations"
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
issues: []
tasks: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]"]
---

# A relationship is named only in the words the source wrote

## Purpose

DES-0003 allows a link to say "parent" or "implements" only when the source reports that relationship. Deck's index records, for each link, the frontmatter key it was written under (`GraphEdge.field` in `desktop/src/shared/graph.ts`), and `desktop/src/shared/relations.ts` turns that into the word a row and a hover show. This suite checks that nothing else can become a word.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh relations`.
2. Two tests in `desktop/tests/graph.test.mjs` check that the index records the key: "a link carries the frontmatter key it was written under, and a link in the text carries none" and "an edge keeps the field of the link that made it". They run with `bash tools/scripts/run-desktop-tests.sh graph`.

## Expected results

- A link written in a note's text has no key, and is called "link".
- A link written under `parent:` is called "parent"; one written under two keys carries both, in the order the file has them.
- Two notes joined in both directions keep each direction's own words.
- A key is shown as the author wrote it. It is not translated, reversed ("parent" does not become "child") or grouped under a heading Deck chose.
- The sentence for a row or a hover says which note wrote the link and under which key.

## Evidence

This test has a `command:`, so it records no verdict here; CI is the verdict.

**2026-10-02**, commit `e86b2e4`: `npm test` in `desktop/` ran every suite and passed 589 of 589. Six of those tests are this suite's, and ten are the `graph` suite's, which holds the two tests named in step 2.

The same rule is checked on real notes by the `glass-desktop` walk ([[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]). At `e86b2e4` its check "every relationship word is a frontmatter key the source wrote for that pair, or 'link'; none is invented" held for the 16 rows of one note's related list: 11 rows named a key and none was invented.

Step 2 of the Procedure named two tests by a title that no test has. It was corrected on 2026-10-02 to the titles in the file.
