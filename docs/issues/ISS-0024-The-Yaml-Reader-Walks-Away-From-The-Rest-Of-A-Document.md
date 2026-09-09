---
type: "[[issue]]"
id: ISS-0024
aliases: ["ISS-0024"]
title: "A key whose value is followed by an indented list makes Deck's YAML reader abandon everything after it, so twenty-two notes lose their relationship fields"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: high
component: shared
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[TASK-0038-Records-From-The-Workspaces-Markdown]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The reader stops at a dangling list and never comes back

## Problem

**Twenty-two notes in Your Trainer lose every frontmatter key after a certain line, and Deck's own note claims it loses none.** `desktop/src/shared/records.ts` says "Every key the file declares is here under its own name", and [[TASK-0038-Records-From-The-Workspaces-Markdown]] says the same thing twice. It is false for a file shaped like this:

```yaml
updated: 2026-05-07
  - "[[FEAT-0066-LocalizedWorkoutContent]]"
  - "[[REQ-0157-RuntimeTranslateOnDemand]]"
effort: "high"
depends:
  - "[[TASK-0447-WorkoutSchemaMigration]]"
```

Deck reads ten keys and stops at `updated`. PyYAML reads fifteen: it FOLDS the dangling `- ` lines into the plain scalar — `updated` becomes `'2026-05-07 - "[[FEAT-0066…]]" - "[[REQ-0157…]]"` — and carries on to `effort`, `depends`, `blocks`, `related` and `tests`.

**The cause is one ordering.** `mapping()` in `desktop/src/shared/yaml.ts` breaks on any line beginning `- ` BEFORE it checks whether that line is more indented than the mapping it is reading. So a sequence item that belongs to nothing ends the mapping instead of being absorbed into the scalar above it, and every key after it is left unread.

**Nothing is silent**, and that is the one thing this has going for it: the abandoned lines are reported by `reportLeftovers`, which is why the twenty-two files show up in the walk's problem list. But a report saying "these lines had no place" is not the same as a record that is missing `depends`, `blocks`, `related` and `tests` — a view filtering on any of those quietly holds the wrong notes.

## Repro

```
node -e "
const {recordFrom}=require('./desktop/dist/shared/records.js');
const fs=require('fs'), os=require('os');
const f=os.homedir()+'/Dev/repos/your-trainer/docs/tasks/TASK-0453-RuntimeTranslateOnDemand.md';
console.log(Object.keys(recordFrom('x.md',fs.readFileSync(f,'utf-8'),0).record.frontmatter).join(','));
"
```

Deck: `type,id,aliases,title,status,phase,platform,owner,created,updated`. PyYAML, through `frontmatter.load`, adds `effort,depends,blocks,related,tests`.

## Expected

What YAML says and what PyYAML does: a key that already has a scalar value cannot then have a sequence, so the more-indented `- ` lines are a CONTINUATION of that plain scalar. The eight `REQ-019x` notes the type-count fixture already names lose `related`, `tests` and `implements` the same way.

## Why the suite did not catch it

The type-count comparison in `desktop/tests/index.test.mjs` compares TYPE only, and `type:` comes before the dangling list in every one of these files. [[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]] is the other half of that gap.

## Next Actions
- [ ] Absorb a more-indented `- ` line into the plain scalar above it, as YAML says and PyYAML does
- [ ] Compare more than the type against the sidecar, so a lost key fails a check

## Fixed, 2026-09-09

**A more-indented `- ` line now continues the plain scalar above it, which is what YAML says and what PyYAML does.** `folded()` in `desktop/src/shared/yaml.ts` no longer breaks on one: a key that already has a scalar value cannot also have a sequence, so those lines are part of the value.

**The measurement that matters is no longer about problems reported; it is about agreeing with the other reader.** Deck's frontmatter keys are now identical to PyYAML's for every note in both corpora — 207 here and 2717 in Your Trainer, with no note indexed by one and not the other, and no key set differing anywhere. That comparison was written as part of [[ISS-0026-The-Sidecar-Comparison-Cannot-See-A-Note-Deck-Never-Indexed]] and is what would catch this class of failure again.

**Evidence.** `bash tools/scripts/run-desktop-tests.sh index`. Reverting the fix — putting the `- ` break back — fails two checks.
