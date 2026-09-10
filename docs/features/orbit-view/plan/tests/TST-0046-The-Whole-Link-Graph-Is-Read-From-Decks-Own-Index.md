---
type: "[[test]]"
id: TST-0046
aliases: ["TST-0046"]
title: "The whole link graph is read from Deck’s own index: every link with its offset, resolved the way the cockpit resolves it, one node per note, and each node’s band the reader’s"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/graph.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh graph"
covers: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
issues: []
tasks: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0003-The-Field-Renders-And-Flies]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, seven mutations and seven killed. Counting an embed as a link fails 1. Reading bare ids in every frontmatter key fails 1. Putting the alias table before the id table fails 1. Losing the drifted-slug rule fails 1. Keeping self-links fails 1. Dropping a dangling link fails 1. Keying nodes by an id two notes share fails 2."
mutation_score: "7 mutations, 7 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---
# The whole link graph is read from Deck's own index

## Purpose

The orbit draws every link in the workspace, and each link's callout quotes the sentence that made it. [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] was planned as an endpoint in the cockpit; since Deck keeps its own index, the graph is built there, and this suite checks that it follows the cockpit's rules for what a link is and what it points at. The smoke run adds the live comparison: twelve notes' links against the sidecar's own context, and every node's band against the sidecar's status.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh graph`.

## Expected results

- A link is `[[target]]` or `[[target|shown]]`, its offset points at its `[[`, and an embed is not a link.
- A bare project-os id is a link only in a frontmatter key meant to point at notes.
- A target resolves by id, then alias, then file name, then title, then the id at the front of a drifted slug; an id outranks another note's alias.
- A self-link and a template are no edge; a dangling link is kept as a finding; a cross-repository link says so; inbound counts distinct notes.
- An id two notes share keys each of them by its path, so a dozen `PLAN.md` files are a dozen nodes.
- A note's phase is the note its phase link resolves to.
- The sentence a link sits in comes from its paragraph, its list item, or its frontmatter line.
- Over this repository, every note is a node, no two share one, and every node's band is its status's band.

## Evidence

2026-09-10: 9 of 9 pass.

## Adequacy (who verifies this test?)

See `adequacy:` above.
