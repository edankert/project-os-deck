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

import hashlib
import json
import re
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
    import frontmatter
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


def canon(value):
    """The shape Deck would produce, so the digest is of a comparable thing.

    PyYAML builds a `date` or `datetime` where Deck keeps the text it was
    written as — a deliberate difference, recorded in `shared/yaml.ts`, because
    a record crosses a JSON boundary and a date would be a string on the far
    side anyway. Normalised here rather than treated as a divergence, and a
    fractional second's trailing zeros go with it: PyYAML pads `.202` to
    `.202000` on the way back out and the file says `.202`.
    """
    import datetime
    if isinstance(value, (datetime.date, datetime.datetime)):
        value = value.isoformat()
    if isinstance(value, str):
        return re.sub(r"(\.\d*?)0+(?=[+Z-]|$)", lambda m: m.group(1).rstrip("."), value)
    if isinstance(value, list):
        return [canon(v) for v in value]
    if isinstance(value, dict):
        return {str(k): canon(v) for k, v in sorted(value.items())}
    return value


def value_digest(metadata: dict) -> str:
    """A short, stable digest of every frontmatter VALUE."""
    payload = json.dumps(canon(metadata), sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def notes_of(index) -> dict:
    """Per note path, what the sidecar's own reading of it produced.

    The TYPE is `Index`'s answer. The KEY SHAPE is PyYAML's, read the same way
    the index reads it, because comparing the type alone let Deck lose five
    relationship fields on twenty-two notes without a single check noticing
    (ISS-0024, ISS-0026). Shapes are stored once and referenced by number: 2924
    notes share 361 of them, so the whole key set costs about what a list of
    paths costs.
    """
    shapes: list[str] = []
    by_shape: dict[str, int] = {}
    notes: dict[str, dict] = {}
    for record in sorted(index._records.values(), key=lambda r: r.rel_path):
        try:
            post = frontmatter.loads(record.path.read_text(encoding="utf-8"))
            metadata = dict(post.metadata or {})
            keys = ",".join(sorted(metadata.keys()))
            digest = value_digest(metadata)
            readable = True
        except Exception:
            # PyYAML refuses the document outright, so the sidecar indexed this
            # note with EMPTY frontmatter. Recorded as such rather than skipped:
            # it is a difference Deck's rules have to explain.
            keys = ""
            digest = ""
            readable = False
        if keys not in by_shape:
            by_shape[keys] = len(shapes)
            shapes.append(keys)
        notes[record.rel_path] = {
            "type": record.note_type,
            "shape": by_shape[keys],
            # **The note's BYTES, which is how the suite tells an edited note
            # from an unchanged one.** It recorded the modification time until
            # 2026-09-09, and that check could not pass on a fresh checkout at
            # all: `git clone` stamps every file with the checkout time, so on
            # CI all 213 notes looked edited, nothing was compared, and the
            # floor assertion fired (ISS-0057). It passed on a developer's
            # machine every time, because local timestamps are real.
            #
            # A digest of the content answers the same question — has this note
            # changed since the fixture was recorded — and answers it the same
            # way everywhere. When it matches, the same file is being read by
            # two parsers, which is the comparison this fixture exists for.
            "source": hashlib.sha256(record.path.read_bytes()).hexdigest()[:16],
            # The VALUES, as a digest. Comparing key names alone left a check
            # that passed after every frontmatter value in 2,926 notes was
            # replaced with the same string (ISS-0034). A digest is sixteen
            # characters against a full copy of every value, and the failure
            # names the file so a person can look.
            "values": digest,
            **({} if readable else {"unreadable": True}),
        }
    return {"shapes": shapes, "notes": notes}


def commit_of(repo: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True, check=False,
    )
    return result.stdout.strip() or "unknown"


def main() -> int:
    deck_index = Index.build(DECK / "docs")
    deck_notes = notes_of(deck_index)

    trainer: dict[str, object] | None = None
    trainer_paths: set[str] = set()
    if (TRAINER / "docs").is_dir():
        trainer_index = Index.build(TRAINER / "docs")
        trainer_paths = {r.rel_path for r in trainer_index._records.values()}
        trainer = {
            "docsRoot": str(TRAINER / "docs"),
            "shape": (
                "per note path: the type the sidecar assigned (null means none), an index into "
                "`shapes` (the sorted frontmatter key list PyYAML read), and `values`, a digest of "
                "every frontmatter VALUE. `unreadable` marks a note whose frontmatter PyYAML "
                "refused outright, which has neither keys nor values to compare."
            ),
            "why": (
                "Per path, for the same reason this repository is: Your Trainer is worked on daily "
                "and a count recorded this morning is wrong this afternoon. The first version of "
                "this held counts and went stale within the hour, on a task somebody added while "
                "the fixture was being written. Paths cost more bytes and no maintenance."
            ),
            "noteCount": len(trainer_index._records),
            **notes_of(trainer_index),
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
            "shape": (
                "per note path: the type the sidecar assigned (null means none), an index into "
                "`shapes` (the sorted frontmatter key list PyYAML read), and `values`, a digest of "
                "every frontmatter VALUE."
            ),
            "why": (
                "Per path rather than per count: this repository gains notes daily, so a count "
                "recorded today is wrong tomorrow, while what the sidecar called one file stays "
                "true. The suite compares the paths that are still there and refuses to pass on "
                "a fixture that has lost its content."
            ),
            "noteCount": len(deck_notes["notes"]),
            **deck_notes,
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
    print(f"  this repository: {len(deck_notes['notes'])} notes")
    if trainer is not None:
        print(f"  your-trainer:    {trainer['noteCount']} notes")
    print(f"  named differences: {len(EXPECTED_DIFFERENCES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
