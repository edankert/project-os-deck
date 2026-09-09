---
type: "[[issue]]"
id: ISS-0034
aliases: ["ISS-0034"]
title: "The comparison against the sidecar reads key names and never values, so replacing every frontmatter value in all 2926 notes leaves it passing — and a file PyYAML refuses is exempt from it for ever"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]]", "[[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The right keys with the wrong values still passes

## Problem

**[[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]] widened this check from types to key NAMES and stopped there.** Replacing every frontmatter value in all 2,926 notes with the same string, leaving the keys and the `type` intact, leaves both comparison checks passing.

That is the third time this one check has been found too narrow in two days — types, then names — and the pattern is the same each time: it was widened to cover the defect in front of it rather than to the width of the claim it supports. [[FEAT-0011-Decks-Own-Index]] says Deck and the sidecar agree about every note.

**A wider comparison has been made and it passes.** The re-review compared every VALUE across three corpora — 207 here, 2,719 in Your Trainer, 407 in `~/Notes`, 3,333 notes — and found zero key and zero value differences. So the claim is true; what is missing is the check that keeps it true.

## And the exemption is permanent

A note whose frontmatter PyYAML refuses is marked `unreadable` in the fixture and skipped by the key check entirely. That is right — the sidecar has no keys to compare — but it means the eight `REQ-019x` notes are exempt for ever, and they are exactly the notes where Deck's own reading is hardest. `REQ-0194` declares sixteen keys and Deck reads thirteen: a different cause from [[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]], and nothing tracks it.

What can be asserted about those files, and is not: that Deck REPORTS a problem for every one of them. If Deck ever reads such a file silently, nobody finds out.

## Next Actions
- [ ] Compare values, not only names
- [ ] Assert Deck reports a problem for every file the sidecar could not read
- [x] Record what Deck reads from the eight `REQ-019x` notes, since it is not everything — evidence: measured 2026-09-09: ten notes, six PyYAML refuses, and Deck loses only the acceptance list items, named by line (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The fixture carries a digest of every frontmatter VALUE**, beside the key shape. Sixteen characters per note against a full copy of every value, and a failure names the file and prints what Deck read, so a person can open it.

**One deliberate difference is normalised rather than counted as a divergence.** PyYAML builds a date where Deck keeps the text it was written as — `shared/yaml.ts` records that decision, because a record crosses a JSON boundary and a date would be a string on the far side anyway. A fractional second's trailing zeros go with it: PyYAML pads `.202` to `.202000` on the way back out and the file says `.202`.

**A file the sidecar could not read is no longer exempt from everything.** It has no keys and no values to compare, but Deck must have SAID so: the check now fails if Deck reads such a file without reporting a problem. If Deck ever reads one silently, somebody finds out.

**What the wider comparison says.** Every value of every note across three corpora — 213 here, 2,719 in Your Trainer, 407 in `~/Notes`, **3,339 notes** — read identically by Deck and by PyYAML. The vault is the only corpus with block scalars, and it is not in the fixture, which is how [[ISS-0035-Two-New-Block-Scalar-Misreads]] survived; the block-scalar shapes are written out as checks now.

**Evidence.** Reverting the value comparison fails 1 check; reverting the silent-read check fails 1. Both survived everything before.

## The third Next Action, answered 2026-09-09

It said "Record what Deck reads from the eight `REQ-019x` notes, since it is not everything", and it stayed open through two reviews while those notes sat permanently exempt from the key and value comparison. Measured today, so the exemption is a known quantity rather than a blank.

**Ten `REQ-019x` notes exist in Your Trainer. Four read cleanly; six do not** — `REQ-0194` through `REQ-0199`. PyYAML refuses all six outright, so the sidecar indexes them with empty frontmatter and they appear in the cockpit under no type at all.

**What Deck reads from the six, and it is nearly everything.** Every one gives up `type`, `id`, `aliases`, `title`, `status`, `phase`, `platform`, `owner`, `created`, `updated`, `tags` and `priority`, correctly: all six come out as `requirement` at `implemented`, which is what the file says.

**What it loses is the items of one list.** Each note has an `acceptance:` whose entries are unquoted prose containing a colon — `- "Each rider/user can favorite ...` — which is not a YAML list item. Deck reports each one by line and by text: *"a line the document has no place for"*, between six and nine of them per note. So the loss is bounded, named, and visible on screen; it is not a note read wrong in silence.

**They stay out of the key and value comparison** because there is nothing on the other side to compare against — PyYAML produced no keys and no values for these files. That is the exemption, and this is what it costs.
