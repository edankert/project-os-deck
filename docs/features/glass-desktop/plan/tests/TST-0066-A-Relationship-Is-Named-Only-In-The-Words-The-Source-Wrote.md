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
2. Two tests in `desktop/tests/graph.test.mjs` check that the index records the key: "a link carries the frontmatter key it was written under, and a link in the text carries none" and "an edge keeps the field of the link that made it". A third, added on 2026-10-02 after the review, checks two ways of writing a key: "a list written at the margin, and a key with a space, give their links the key". They run with `bash tools/scripts/run-desktop-tests.sh graph`.

## Expected results

- A link written in a note's text has no key, and is called "link".
- A link in a list whose items start at the margin, with no indent, carries the key above the list. A key that holds a space, such as `verified by:`, is a key and is shown as written. A list item that follows no key has none.
- A link written under `parent:` is called "parent"; one written under two keys carries both, in the order the file has them.
- Two notes joined in both directions keep each direction's own words.
- A key is shown as the author wrote it. It is not translated, reversed ("parent" does not become "child") or grouped under a heading Deck chose.
- The sentence for a row or a hover says which note wrote the link and under which key.

## Evidence

This test has a `command:`, so it records no verdict here; CI is the verdict.

**2026-10-02**, commit `18f5405`: `npm test` in `desktop/` ran every suite and passed 645 of 645. Seven of those tests are this suite's, and eleven are the `graph` suite's, which holds the three tests named in step 2. One of the seven came with FEAT-0022's fix in `fdb7e3e` and is about picking out a key, which is that feature's.

The same rule is checked on real notes by the `glass-desktop` walk ([[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]). At `18f5405` its check "every relationship word is a frontmatter key the source wrote for that pair, or 'link'; none is invented" held for the 16 rows of one note's related list: 11 rows named a key and none was invented.

Step 2 of the Procedure named two tests by a title that no test has. It was corrected on 2026-10-02 to the titles in the file.

**Found by the independent review, 2026-10-02, and fixed.** Reviewer A probed `linksIn` in `desktop/src/shared/graph.ts` and found two shapes of valid YAML where a label the source wrote was dropped. A list written at the margin (`tasks:` and then `- "[[TASK-0001]]"` on the next line with no indent) gave `["TASK-0001", null]`, and so did a link under a key that holds a space. Each was then shown as a plain "link". Nothing was invented. Reviewer B found the first shape too. Commit `01f0fc1` reads a list item at the margin as belonging to the key above it and lets a key hold spaces. The third test in step 2 holds both, and the commit says it fails when either rule is taken out. One consequence in the same function: a bare id on a `verified by:` line was read under the key above that line, and is now read under `verified by`, which is not one of the keys meant to point at notes, so it is no link.

One thing found while fixing it is kept as it is: a bare id on a comment line at the margin of the frontmatter is still read under the key above that line. Nobody has decided it.

Both reviewers broke this suite's guards and a test failed each time: listing a relation once, never inventing a word such as "child" for an incoming `parent`, and a link or a bare id in the frontmatter carrying its key. In round two the reviewer took each of the two new rules out of the built module and the `graph` suite gave `pass 10, fail 1` both times, the failing test being the third in step 2.

**The reviewers also noted that this note is `active` and not `passing`.** That is kept. This test has a `command:`, and by `tools/instructions/STATUSES.md` such a test records no verdict on its note; CI is the verdict.
