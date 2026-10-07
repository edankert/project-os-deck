---
type: "[[change]]"
id: CHG-20261007-The-Walk-Is-Called-The-Release-Test
title: "The template sync renames the walk to the release test, and the test runner skips a retired test"
status: merged
owner: user:edwin
created: 2026-10-07
updated: 2026-10-07
source: ["Edwin 2026-10-07: 'sync the template into deck'"]
commit: "the sync of project-os 681675d..e9b7744"
pr: ""
impacts: ["tools/scripts/release-test.py", "tools/scripts/release-test-tags.py", "tools/scripts/run-tests.py", "tools/skills/release-test-procedure/SKILL.md", "tools/skills/release-test-prep/SKILL.md", "docs/__templates__/release-test.md", "docs/__templates__/what-changed.md", "docs/releases/ledgers/WORKING-app.json", "docs/tests/README.md", "CLAUDE.md", ".project-os-sync"]
issues: []
features: []
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0061-The-Visual-Parity-Gate-Rejects-Mismatched-Work]]"]
---

# The walk is called the release test

## Summary

The commands for preparing a release for hand testing have new names in Deck. Deck now carries the project-os template as of `e9b7744`; the last sync was `681675d` on 2026-09-26. In between, the template renamed "the walk" to "the release test" (project-os-dev ADR-0050), and its scripts, templates and skill were renamed with it.

The same sync brings the test runner fix from project-os-dev ISS-0105. The pre-push hook no longer runs the command of a test marked `retired`. Deck hit this on 2026-10-06 with TST-0061, and that note's workaround (no `command:` line) stays valid.

## Impact

- **Commands**: `tools/scripts/walk-sheet.py` is now `tools/scripts/release-test.py`, and `walk-tags.py` is now `release-test-tags.py`. The validator reports an old name as an OLD-NAME error that names the new one.
- **Skills**: `walk-procedure` is now `release-test-procedure`, and `release-test-prep` is new. `CLAUDE.md` lists both. The old generated copies under `.claude/skills/` and `.agents/skills/` were deleted.
- **Templates**: `docs/__templates__/walk.md` is now `release-test.md`, and `what-changed.md` is new.
- **Ledger**: in the open ledger `docs/releases/ledgers/WORKING-app.json`, each entry's `mark` key is now `result`. The values are unchanged. Deck has no sealed ledger, so nothing sealed was rewritten.
- **`docs/tests/README.md`** takes the template's wording: the order file is `docs/tests/acceptance/RELEASE-TEST.md`. Deck has no such file yet, as it had no `WALK.md`.
- **Unchanged**: Deck's own task and test notes with "walk" in their titles keep their names and ids. No desktop code changed.

## Documentation Coverage (All Types Considered)

- features: not-applicable
- requirements: not-applicable
- tasks: not-applicable (a template sync)
- issues: not-applicable
- tests: not-applicable (no test note changed; the runner change is upstream's ISS-0105)
- workflows: not-applicable
- decisions: not-applicable (the rename is upstream's ADR-0050)
- risks: not-applicable (no new dependency, variable, path outside the template, or credential)
- changes: new
- snapshot: not-applicable
