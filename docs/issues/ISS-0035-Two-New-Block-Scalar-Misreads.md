---
type: "[[issue]]"
id: ISS-0035
aliases: ["ISS-0035"]
title: "The fix that stopped a block scalar losing its blank lines introduced two new silent mis-reads: it swallows the lines after the scalar, and it ignores the indicator that says whether the last newline is kept"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: medium
component: shared
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[ISS-0025-A-Block-Scalar-Silently-Loses-Lines-And-Two-Escapes-Are-Wrong]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# A fix for a silent mis-read that is itself two silent mis-reads

## Problem

**The scalar swallows lines that are not in it.** `blockScalar` stops on the OWNER's indentation, not on the block's own detected indentation, so a line indented less than the block but more than the key is taken as content.

```yaml
a: |
    x
  # c
```

Deck reads `'x\n# c\n'`. PyYAML reads `'x\n'`.

**The chomping indicator is matched and then ignored.** `|-`, `>-` and `|+` are recognised by the regexp that decides a block scalar has begun, and nothing afterwards reads which one it was. `a: |-\n  x` reads `'x\n'` where PyYAML gives `'x'` — the whole point of `-` being that the final newline is dropped.

**Both are silent**, which is what makes them worth the same urgency as the defect they came from. The old reader got the second one right by accident, having no trailing newline at all.

## Where they came from

Neither existed before [[ISS-0025-A-Block-Scalar-Silently-Loses-Lines-And-Two-Escapes-Are-Wrong]]. Its fix added a trailing newline — correctly, that is YAML's clip behaviour — and did not add the indicator that turns it off. And it changed which lines the reader walks without changing where it stops.

**Nothing in the three corpora exercises either**, which is why they were not caught: `~/Notes` holds the only seventeen block scalars anywhere and all seventeen are plain `|`. The vault is not in the fixture.

## Next Actions
- [ ] Stop on the block's own indentation
- [ ] Read the chomping indicator
- [ ] Put the vault's block scalars where a check can see them

## Fixed, 2026-09-09

**The scalar stops on its own indentation.** Before the block's indent is known a content line must be more indented than the KEY; after it is known, a line AT that indentation is content and only a shallower one ends the block.

**The chomping indicator is read.** `|` clips to one trailing newline, `|-` strips it, `|+` keeps every one — and clip keeps one **only if the source had one**, which a document whose last line carries no break does not.

**Two more things came out of measuring rather than reasoning.** A folded scalar's blank line is ONE newline, not two: folding turns a line break into a space and a blank line into the break, and `\n\n` was a paragraph rule this language does not have. And splitting a source on newlines leaves a phantom empty element after the last line — the line BREAK, not a blank line — which gave a `|+` block a trailing newline the file did not have.

**All sixteen shapes now read what PyYAML reads**, and the expectations were taken by running PyYAML rather than from memory. They are written out as a check because nothing in the three corpora exercises them: `~/Notes` holds the only seventeen block scalars anywhere and all seventeen are plain `|`.

**Evidence.** Reverting either fix fails 1 check. Both survived every check before this note existed.
