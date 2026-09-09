#!/usr/bin/env python3
"""Record `desktop/fixtures/sidecar-types.json` from the sidecar's own index.

Deck keeps its own index of a workspace's Markdown (FEAT-0011), so two
programs now decide independently what a note is. They will drift, and
RISK-0004 is the question of whether the drift is a failing test or a person
noticing that two applications disagree about how many issues are open.

This script is the "failing test" half. It imports the cockpit's
`project_os_cockpit.index` and writes down THAT index's answers, so the fixture
Deck is measured against is the other program's output rather than a second
reading of Deck's own rules.

    ../project-os-cockpit/.venv/bin/python3 tools/scripts/record-sidecar-fixture.py

Re-record it when the cockpit's indexer changes, or when Your Trainer's notes
change enough that the count half stops matching. A difference that is
DELIBERATE belongs in `EXPECTED_DIFFERENCES` below, with its reason, and never
in a loosened assertion on the Deck side.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve()
DECK = HERE.parents[2]
REPOS = DECK.parent
COCKPIT = REPOS / "project-os-cockpit"
TRAINER = REPOS / "your-trainer"
OUT = DECK / "desktop" / "fixtures" / "sidecar-types.json"
STATUS_OUT = DECK / "desktop" / "fixtures" / "cockpit-statuses.json"

sys.path.insert(0, str(COCKPIT / "src"))

try:
    from project_os_cockpit.index import Index
    from project_os_cockpit import statuses as cockpit_statuses
    from project_os_cockpit.cockpit import nav_payload
except ImportError:  # pragma: no cover - a setup problem, not a test failure
    sys.exit(
        "record-sidecar-fixture: cannot import the cockpit's index.\n"
        f"Run this with the cockpit's interpreter: {COCKPIT}/.venv/bin/python3"
    )

#: The two RULES under which Deck may know something the sidecar does not.
#:
#: Rules rather than a list of paths, because a list of paths goes stale: Your
#: Trainer is worked on daily and produced a twelfth such file within an hour
#: of the first recording. Both rules are checkable live, on the Deck side, so
#: the suite can apply them to a file nobody has seen yet.
#:
#: What no rule permits is a CONTRADICTION — the sidecar saying a note is a
#: feature and Deck saying it is anything else. That is the correctness claim,
#: it cannot go stale, and it is asserted with no tolerance at all.
DIFFERENCE_RULES = [
    {
        "id": "list-valued-type",
        "when": "the sidecar assigned no type and the note's `type:` is a list",
        "reason": (
            "The sidecar's `_normalise_type` returns nothing for a value that is not a string, so "
            "the note is counted under no type at all and disappears from the cockpit's Library. "
            "That is project-os-cockpit#ISS-0279, already waiting for PHASE-0003 because it hides "
            "the vault's own types, and Deck must not reproduce it."
        ),
    },
    {
        "id": "frontmatter-deck-reports",
        "when": "the sidecar assigned no type and Deck reported a problem for that file",
        "reason": (
            "The file's frontmatter is not valid YAML. PyYAML refuses the whole document, so the "
            "sidecar indexes the note with EMPTY frontmatter and it vanishes from the cockpit's own "
            "views. Deck reads what it can and names the lines it could not, by path and line "
            "number — one broken file costs one record, never the view."
        ),
    },
]

#: Where Deck's answer differs from the sidecar's ON PURPOSE.
#:
#: These are the INSTANCES as they stood when the fixture was recorded, kept
#: because a rule with no worked example is hard to read. The suite applies the
#: rules above; it also asserts that every row here still reproduces, so a row
#: cannot quietly become an excuse for something that has changed.
EXPECTED_DIFFERENCES = [
    {
        "workspace": "yourTrainer",
        "relPath": "requirements/PRD-Original.md",
        "sidecar": None,
        "deck": ["project"],
        "reason": (
            "Its `type:` is a LIST. The sidecar's `_normalise_type` returns nothing for a "
            "value that is not a string, so the note is counted under no type at all and "
            "disappears from the cockpit's Library. That is project-os-cockpit#ISS-0279, "
            "already waiting for PHASE-0003 because it hides the vault's own types, and "
            "Deck must not reproduce it: a note is counted under each of its types."
        ),
    },
    {
        "workspace": "yourTrainer",
        "relPath": "features/ride-by-hand-cockpit/FEAT-0108-RideByHandCockpit.md",
        "sidecar": None,
        "deck": ["feature"],
        "reason": (
            "A flow sequence spanning several lines whose closing bracket sits back at the "
            "key's own column. PyYAML refuses the whole document, so the sidecar indexes the "
            "note with empty frontmatter and it vanishes from the Features view. Deck reads "
            "it. Being more forgiving than the other indexer is still a difference, which is "
            "why it is written down here."
        ),
    },
    {
        "workspace": "yourTrainer",
        "relPath": "issues/ISS-0241-FtmsSpecCompliancePolish.md",
        "sidecar": None,
        "deck": ["issue"],
        "reason": "The same multi-line flow sequence PyYAML refuses. Deck reads it.",
    },
] + [
    {
        "workspace": "yourTrainer",
        "relPath": f"requirements/REQ-{n}",
        "sidecar": None,
        "deck": ["requirement"],
        "reason": (
            "Its `acceptance:` list is written twice, once indented and once at column zero, "
            "which PyYAML refuses. Deck reads what it can, REPORTS the lines it had no place "
            "for by path and line number, and still yields a record — one broken file costs "
            "one record, never the view."
        ),
    }
    for n in (
        "0194-PerUserFavorites.md",
        "0195-PerUserStravaAuth.md",
        "0196-StravaUploadStatusDisplay.md",
        "0197-FitSpeedDistance.md",
        "0198-PaywallFamilyFeaturesDisplay.md",
        "0199-HrmConnectionUx.md",
        "0200-DebugTestWorkouts.md",
        "0201-PaywallComparisonLayout.md",
    )
]


def commit_of(repo: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True, check=False,
    )
    return result.stdout.strip() or "unknown"


def main() -> int:
    deck_index = Index.build(DECK / "docs")
    deck_types = {r.rel_path: r.note_type for r in deck_index._records.values()}

    trainer: dict[str, object] | None = None
    trainer_paths: set[str] = set()
    if (TRAINER / "docs").is_dir():
        trainer_index = Index.build(TRAINER / "docs")
        trainer_paths = {r.rel_path for r in trainer_index._records.values()}
        trainer = {
            "docsRoot": str(TRAINER / "docs"),
            "shape": "per note path, the single type the sidecar assigned; null means it assigned none",
            "why": (
                "Per path, for the same reason this repository is: Your Trainer is worked on daily "
                "and a count recorded this morning is wrong this afternoon. The first version of "
                "this held counts and went stale within the hour, on a task somebody added while "
                "the fixture was being written. Paths cost more bytes and no maintenance."
            ),
            "notes": len(trainer_index._records),
            "types": {r.rel_path: r.note_type for r in sorted(trainer_index._records.values(), key=lambda r: r.rel_path)},
        }
    else:
        print(f"record-sidecar-fixture: {TRAINER}/docs is not here; recording this repository only",
              file=sys.stderr)

    stale = [
        row["relPath"] for row in EXPECTED_DIFFERENCES
        if row["workspace"] == "yourTrainer" and trainer is not None and row["relPath"] not in trainer_paths
    ]
    if stale:
        print("record-sidecar-fixture: these named differences name files that are gone:", file=sys.stderr)
        for path in stale:
            print(f"  {path}", file=sys.stderr)
        return 2

    fixture = {
        "recordedFrom": "project-os-cockpit/src/project_os_cockpit/index.py",
        "recordedOn": date.today().isoformat(),
        "sidecarCommit": commit_of(COCKPIT),
        "why": (
            "Recorded from the sidecar's own index, never from Deck's. Two indexers over one "
            "corpus drift (RISK-0004), and the whole value of this file is that it holds the "
            "other one's answer."
        ),
        "thisRepository": {
            "docsRoot": "docs",
            "shape": "per note path, the single type the sidecar assigned; null means it assigned none",
            "why": (
                "Per path rather than per count: this repository gains notes daily, so a count "
                "recorded today is wrong tomorrow, while what the sidecar called one file stays "
                "true. The suite compares the paths that are still there and refuses to pass on "
                "a fixture that has lost its content."
            ),
            "notes": len(deck_types),
            "types": dict(sorted(deck_types.items())),
        },
        "yourTrainer": trainer,
        "differenceRules": DIFFERENCE_RULES,
        "expectedDifferences": EXPECTED_DIFFERENCES,
    }
    # The status vocabulary, read off statuses.py the same way (TASK-0044).
    # The sidecar serves none of this as data, so Deck keeps a copy, and a copy
    # Deck cannot ask for is a copy a test has to check: `faces.ts`'s drifted
    # from the cockpit's within two days of being written and nothing caught it.
    statuses = {
        "recordedFrom": "project-os-cockpit/src/project_os_cockpit/statuses.py",
        "recordedOn": date.today().isoformat(),
        "cockpitCommit": commit_of(COCKPIT),
        "why": (
            "Deck colours a status and folds finished work away, and the vocabulary that "
            "decides both is the cockpit's. Until the sidecar serves it as data (the issue "
            "filed for that is named in TASK-0044), this fixture is what stops the copy drifting."
        ),
        "bands": {band: sorted(members) for band, members in sorted(cockpit_statuses.BANDS.items())},
        "completed": sorted(cockpit_statuses.COMPLETED_STATUSES),
        "legacy": dict(sorted(cockpit_statuses.LEGACY_STATUS_BAND.items())),
    }
    STATUS_OUT.parent.mkdir(parents=True, exist_ok=True)
    STATUS_OUT.write_text(json.dumps(statuses, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"record-sidecar-fixture: wrote {STATUS_OUT.relative_to(DECK)}")

    # The real navigation payloads the band function is measured over
    # (TASK-0029): this repository, and Your Trainer's two biggest views, where
    # the front band overflows in the normal case rather than the rare one.
    nav_dir = DECK / "desktop" / "fixtures" / "nav"
    nav_dir.mkdir(parents=True, exist_ok=True)
    wanted = [("deck", deck_index, "features")]
    if (TRAINER / "docs").is_dir():
        wanted += [("your-trainer", trainer_index, "features"), ("your-trainer", trainer_index, "issues")]
    for name, index, mode in wanted:
        payload = nav_payload(index, mode=mode, project_root=None)
        (nav_dir / f"{name}-{mode}.json").write_text(
            json.dumps(payload, indent=1, ensure_ascii=False, default=str) + "\n", encoding="utf-8"
        )
        print(f"record-sidecar-fixture: wrote fixtures/nav/{name}-{mode}.json")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"record-sidecar-fixture: wrote {OUT.relative_to(DECK)}")
    print(f"  this repository: {len(deck_types)} notes")
    if trainer is not None:
        print(f"  your-trainer:    {trainer['notes']} notes")
    print(f"  named differences: {len(EXPECTED_DIFFERENCES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
