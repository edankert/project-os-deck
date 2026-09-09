#!/usr/bin/env python3
"""Count every note twice, today: once with the cockpit's indexer, once with Deck's.

[[TST-0026]] asks a person to read the type counts off two screens and compare
them. This does the comparison instead, and does it against the cockpit's code
as it stands right now rather than against a recorded fixture — which is the
one thing the fixture cannot do. `TST-0029` pins Deck to a recording of the
sidecar's answers; a recording cannot notice that the sidecar itself moved.

    ../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py

Reads only. It opens no sidecar, starts no server and writes no file.

A DIFFERENCE is not automatically a failure: `record-sidecar-fixture.py` holds
the rules under which Deck may legitimately know something the sidecar does
not, and the one that shows up in counts is a list-valued `type:`, which the
cockpit's indexer drops entirely (project-os-cockpit#ISS-0279) and Deck counts
under each value. Those are reported as expected and named. Anything else is a
failure with the note paths printed, so a person can open them.
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve()
DECK = HERE.parents[2]
REPOS = DECK.parent
COCKPIT = REPOS / "project-os-cockpit"

CORPORA = {
    "project-os-deck": DECK / "docs",
    "your-trainer": REPOS / "your-trainer" / "docs",
    "vault": Path.home() / "Notes",
}

sys.path.insert(0, str(COCKPIT / "src"))
try:
    import frontmatter
    from project_os_cockpit.index import Index
except ImportError:
    sys.exit(
        "check-counts-live: cannot import the cockpit's index.\n"
        f"Run this with the cockpit's interpreter: {COCKPIT}/.venv/bin/python3"
    )

DECK_READER = """
const {walkNotes} = require(process.argv[1] + '/desktop/dist/main/note-index.js');
const {isTemplate} = require(process.argv[1] + '/desktop/dist/shared/records.js');
const walked = walkNotes(process.argv[2]);
process.stdout.write(JSON.stringify({
  notes: walked.records.length,
  problems: walked.problems.map((p) => `${p.relPath}: ${p.reason}`),
  brokenPaths: [...new Set(walked.problems.map((p) => p.relPath))],
  types: Object.fromEntries(walked.records.map((r) => [r.relPath, r.types])),
  templates: walked.records.filter((r) => isTemplate(r.relPath)).map((r) => r.relPath),
}));
"""


def deck_reading(root: Path) -> dict:
    out = subprocess.run(
        ["node", "-e", DECK_READER, str(DECK), str(root)],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def listed_type(path: Path) -> bool:
    """Whether this note's `type:` is a LIST, which is the one licensed gap."""
    try:
        value = (frontmatter.loads(path.read_text(encoding="utf-8")).metadata or {}).get("type")
    except Exception:
        return False
    return isinstance(value, list)


def main() -> int:
    failures: list[str] = []
    ran = 0
    for name, root in CORPORA.items():
        if not root.is_dir():
            print(f"{name}: not on this machine, so nothing was compared")
            continue
        ran += 1
        index = Index.build(root)
        mine = deck_reading(root)
        deck_types: dict[str, list[str]] = mine["types"]
        # **A TEMPLATE is a note in one program and not in the other.** The
        # cockpit's `Index` holds `docs/__templates__/`; Deck's `typeCounts`
        # skips it, because a blank feature template counted as a feature makes
        # every count one too high. Comparing raw indexes made every type in
        # this repository differ by exactly one, which is that and nothing
        # else — so both sides drop them here and the number is printed.
        templates = set(mine["templates"])

        broken = set(mine["brokenPaths"])
        theirs = Counter()
        cockpit_paths = set()
        licensed: dict[str, str] = {}
        for record in index._records.values():
            rel = record.rel_path
            if rel in templates or rel.startswith("__templates__/"):
                continue
            cockpit_paths.add(rel)
            if record.note_type:
                theirs[record.note_type] += 1
            # **The two rules under which Deck may know something the sidecar
            # does not**, as `record-sidecar-fixture.py` states them. Both turn
            # on the sidecar having assigned NO type, so neither can excuse a
            # contradiction — the sidecar saying `feature` and Deck saying
            # anything else is a failure with no tolerance.
            elif listed_type(record.path):
                licensed[rel] = "its `type:` is a list, which the cockpit's indexer drops entirely"
            elif rel in broken:
                licensed[rel] = "its frontmatter is not valid YAML, so PyYAML refuses the whole document"

        ours = Counter()
        deck_paths = set()
        for rel, types in deck_types.items():
            if rel in templates:
                continue
            deck_paths.add(rel)
            if rel in licensed:
                continue
            for value in types:
                ours[value] += 1

        print(f"\n{name}: {len(deck_paths)} notes counted by Deck, {len(cockpit_paths)} by the cockpit, "
              f"{len(templates)} template(s) dropped by both")

        # **The comparison is PER NOTE first.** Comparing per-type totals lets
        # two notes exchange `feature` and `task` and still add up, which the
        # third review demonstrated: the script printed "0 disagreements" while
        # two notes were wrong. The recorded fixture catches a swap in this
        # repository and in Your Trainer; the vault is in no fixture, so for
        # the vault nothing else would.
        contradictions: list[str] = []
        for record in index._records.values():
            rel = record.rel_path
            if rel in templates or rel.startswith("__templates__/") or rel in licensed:
                continue
            theirs_type = (record.note_type or "").strip().lower()
            ours_types = [str(v).strip().lower() for v in deck_types.get(rel, [])]
            if theirs_type == "" and ours_types == []:
                continue
            if theirs_type not in ours_types:
                contradictions.append(
                    f"{name}: `{rel}` — the cockpit reads it as "
                    f"{theirs_type or '(no type)'}, Deck reads it as {ours_types or '(no type)'}"
                )
        failures.extend(contradictions)
        print(f"  {len(cockpit_paths) - len(licensed) - len(contradictions)} note(s) read as the same type by both, "
              f"{len(contradictions)} contradiction(s)")

        for rel in sorted(deck_paths - cockpit_paths):
            failures.append(f"{name}: Deck has `{rel}` and the cockpit does not")
        for rel in sorted(cockpit_paths - deck_paths):
            failures.append(f"{name}: the cockpit has `{rel}` and Deck does not")
        if licensed:
            print(f"  {len(licensed)} note(s) the cockpit gave no type and Deck did, left out of the comparison "
                  f"BY PATH and listed here:")
            for rel in sorted(licensed)[:6]:
                print(f"      {rel} — {licensed[rel]}; Deck reads it as {deck_types.get(rel)}")
            if len(licensed) > 6:
                print(f"      ... and {len(licensed) - 6} more")

        # **A comparison that covers no notes is a failure, not a pass.** With
        # `isTemplate` returning true for everything this script compared zero
        # notes in all three corpora and exited 0.
        compared = len(cockpit_paths) - len(licensed)
        if compared <= 0:
            failures.append(f"{name}: the comparison covered NO notes, which is not the same as agreeing")
        elif len(templates) >= len(deck_types):
            failures.append(f"{name}: every note was treated as a template, so nothing was compared")

        keys = sorted(set(theirs) | set(ours))
        width = max((len(k) for k in keys), default=4)
        for key in keys:
            same = theirs[key] == ours[key]
            print(f"  {'  ' if same else '!!'} {key:<{width}}  cockpit {theirs[key]:>5}   deck {ours[key]:>5}")
            if not same:
                failures.append(f"{name}: `{key}` — the cockpit counts {theirs[key]}, Deck counts {ours[key]}")
        if mine["problems"]:
            print(f"  Deck reported {len(mine['problems'])} unreadable note(s), by path:")
            for problem in mine["problems"][:5]:
                print(f"      {problem}")

    if ran == 0:
        print("\nNo corpus was on this machine, so this measured nothing.")
        return 2
    print()
    for failure in failures:
        print("FAIL " + failure)
    print(f"{ran} corpus(es) compared, {len(failures)} disagreement(s) between the two programs")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
