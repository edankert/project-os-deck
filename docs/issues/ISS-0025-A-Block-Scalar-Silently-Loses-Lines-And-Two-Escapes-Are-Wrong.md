---
type: "[[issue]]"
id: ISS-0025
aliases: ["ISS-0025"]
title: "A literal block scalar silently loses every blank line and every line beginning with a hash, and two string escapes produce the wrong characters"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: high
component: shared
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[TASK-0038-Records-From-The-Workspaces-Markdown]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The scan strips comments before the block scalar can see them

## Problem

**A `|` block scalar comes back with lines missing, and nothing is reported.** This is worse than [[ISS-0024-The-Yaml-Reader-Walks-Away-From-The-Rest-Of-A-Document]], which at least says what it dropped. `scan()` in `desktop/src/shared/yaml.ts` removes blank lines and whole-line comments from the whole document before any reader runs, so by the time `blockScalar()` walks the lines, the ones inside the scalar are already gone.

```yaml
body: |
  # Heading

  text
```

Deck reads `"text"`. PyYAML reads `"# Heading\n\ntext\n"`. Inside a block scalar there are no comments and no blank-line elision: every line is content, including the trailing newline.

**This refutes a claim in [[TASK-0038-Records-From-The-Workspaces-Markdown]]** — "Measured against every file it will meet … with zero unreported problems". Zero problems were reported because this failure reports nothing.

## Two more, latent today and wrong in the same way

**`"a\\nb"` reads as backslash-newline where it should be backslash-n-b.** `unquote` applies its escape replacements in sequence, so `\\n` is matched by the `\n` rule before the `\\` rule ever sees it. A single pass over escape sequences is the fix; a chain of `replace` calls cannot be right.

**A nested block sequence flattens.** `m:` / `  - - 1` / `    - 2` reads as `["- 1", 2]` rather than `[[1, 2]]`, because `sequence()` handles a mapping after the dash but not another dash.

Neither appears in the 3,300 files measured, which is why they are latent rather than live. They are still wrong answers produced silently, which is the class of failure this module's own comment says it exists to avoid.

## Repro

```
node -e "
const {parseYaml}=require('./desktop/dist/shared/yaml.js');
console.log(JSON.stringify(parseYaml('body: |\n  # Heading\n\n  text\n')));
console.log(JSON.stringify(parseYaml('s: \"a\\\\nb\"')));
console.log(JSON.stringify(parseYaml('m:\n  - - 1\n    - 2')));
"
```

## Expected

A block scalar keeps every line it contains, blank and hash-leading alike, and its trailing newline. An escape sequence is read once. A nested sequence nests.

## Next Actions
- [ ] Keep every line in the scan and skip the uninteresting ones at the point of reading, so a block scalar can see what is inside it
- [ ] Read escapes in one pass
- [ ] Handle a dash after a dash

## Fixed, 2026-09-09

**The scan keeps every line and the readers skip the dull ones.** A line that is blank or a whole-line comment is marked `skip` rather than dropped, `peek()` walks past them, and `blockScalar()` walks the raw array instead — because inside a block scalar there are no comments and no blank-line elision. A literal scalar keeps its line breaks and its trailing newline; a folded one joins its lines and keeps its paragraph breaks.

**Escapes are read in one pass.** A chain of `replace` calls cannot be right: whichever rule runs first eats the other's input, which is why `"a\\nb"` came out as a backslash and a newline. `\n`, `\t`, `\r`, `\0`, `\uXXXX` and the literal forms are now read character by character.

**A dash after a dash nests.** `- - 1` opens a sequence inside a sequence, by the same trick that already handled `- key: value`: the line is rewritten as though its content started at its own column and a block is read there.

**Evidence.** Four checks in `desktop/tests/index.test.mjs`, one per fault. Reverting the scan fails two of them, and reverting the escape chain another two — measured by `mutate` rather than counted by hand, which is ISS-0036. And the claim [[TASK-0038-Records-From-The-Workspaces-Markdown]] made — every file measured with no unreported problem — is now true in the stronger form: Deck's key sets are identical to PyYAML's across 2924 notes.
