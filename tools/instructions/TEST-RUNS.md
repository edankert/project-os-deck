# Test runs and CI results you can watch

`run-tests.py` writes a progress file while it runs, and `ci-status.py` saves CI's latest runs. Both files sit in `.project-os/` at the repo root, and four readers show them: `test-status.py` in a terminal, `test-status.py --segment` on a status line, the project-os mod's line above the Claude Code prompt, and the cockpit's Tests page. This file defines both formats, once (project-os-dev FEAT-0042, REQ-0038, REQ-0039).

Neither file is a verdict. A test note's verdict is unchanged (ADR-0025): CI's exit code, or a manual test's `last_verified:`. The runner never writes to a note, and nothing reads these files to decide a status.

## Where the files are

```
.project-os/
  .gitignore              "*": nothing in this folder is ever committed
  runs/
    latest.json           the newest run, rewritten as it goes
    <run id>/run.json     the same content, kept for the five newest runs
    <run id>/logs/001.log one command's whole output, stdout and stderr together
    <run id>/progress/001.jsonl  the file PROJECT_OS_TEST_PROGRESS names for command 1
  ci/
    latest.json           the latest run of each workflow on the branch
```

The first script that creates `.project-os/` writes its `.gitignore`. The repo's own `.gitignore` is project-owned and the sync never touches it, so the folder ignores itself. Every write is atomic: the content goes to a temporary file in the same folder, then is renamed over the old one, so a reader never sees half a file. Paths inside both files are relative to the repo root, so a file downloaded from CI still reads correctly.

## The run file, format version 1

```json
{
  "format": "project-os/test-run",
  "version": 1,
  "id": "20261022T101500Z-48213",
  "repo": "your-trainer",
  "source": "pre-push",
  "commit": "8bf1562c0d…",
  "branch": "main",
  "host": "edwins-mac",
  "pid": 48213,
  "started": "2026-10-22T10:15:00Z",
  "updated": "2026-10-22T11:25:03Z",
  "finished": null,
  "state": "running",
  "commands": [
    {
      "index": 1,
      "tests": ["TST-0022", "TST-0023"],
      "command": "./gradlew :app:connectedAndroidTest",
      "state": "failing",
      "started": "2026-10-22T10:15:01Z",
      "seconds": 212.4,
      "exit": 1,
      "reason": "iOS app killed before the test runner connected",
      "log": ".project-os/runs/20261022T101500Z-48213/logs/001.log",
      "progress": {"done": 60, "total": 60, "failed": 1}
    }
  ]
}
```

- `source` is `pre-push`, `local` or `ci`. `run-tests.py --source` sets it; without the flag it is `ci` when the `CI` variable is set, else `local`.
- The run's `state` is `running` until it ends, then `passing` or `failing` (the runner's exit code: 0 or 1), or `interrupted` when the runner was stopped by a signal. A reader that finds `running` on the same `host` with a `pid` that is no longer alive shows the run as stopped.
- `commands` lists every command once, in the order it runs. Notes that share a command share one entry, and `tests` names them all. The `--ci` suite run is one entry naming every test note it covers.
- A command's `state` is `waiting`, `running`, `passing`, `failing`, `unrunnable` or `timed_out`, or `interrupted` for the command that was running when the runner was stopped. A timed-out command still counts as unrunnable for the runner's exit code and printed summary, as before.
- `started` and `seconds` are empty until the command starts and ends. `exit` is its exit code, or empty when it timed out or could not start.
- `reason` is one short line: the last line of output, "timed out after 600 s", or "command not found".
- `progress` is the newest line the command reported (below), or empty.
- The runner rewrites the file when each command starts and ends, and when a command's progress line changes, at most about once a second.

A reader must ignore keys it does not know. A change that would break a reader raises `version`; a reader shows a version it does not know as unreadable rather than guessing.

## Progress lines from a command

The runner sets `PROJECT_OS_TEST_PROGRESS` to a file path for each command. A command may append lines to it, one JSON object per line:

```
{"done": 12, "total": 60, "now": "AddRiderFlowTest"}
{"done": 13, "total": 60, "failed": 1, "now": "EditRiderFlowTest"}
```

Every key is optional: `done` and `total` are counts of whatever the command runs (test classes, test cases, steps), `failed` is how many have failed so far, and `now` names what runs now, in a few words. The runner copies the newest line that parses into the command's `progress`. A command that ignores the variable still runs and shows as one block. The test-authoring skill shows how a Gradle build or an `xcodebuild` run reports these lines (`../skills/test-authoring/SKILL.md`, "Reporting progress from a long command").

## The CI file, format version 1

```json
{
  "format": "project-os/ci-status",
  "version": 1,
  "repo": "your-trainer",
  "branch": "main",
  "fetched": "2026-10-22T11:30:00Z",
  "error": "",
  "workflows": [
    {
      "name": "android-tests",
      "latest": {
        "id": 18734412, "url": "https://github.com/…/actions/runs/18734412",
        "commit": "8bf1562c0d…", "event": "push",
        "status": "completed", "conclusion": "failure",
        "created": "2026-10-22T10:40:00Z", "updated": "2026-10-22T11:02:00Z",
        "failing_tests": ["TST-0022"], "failing_jobs": ["android"], "details": "artifact"
      },
      "last_finished": { "…": "the newest completed run, the same shape; equal to latest when latest has finished" }
    }
  ]
}
```

- `ci-status.py` writes it from `gh run list` on the current branch: for each workflow, the newest run and the newest completed one.
- A workflow is **red** when `last_finished.conclusion` is `failure`, `timed_out` or `startup_failure`, and stays red until a later run of it succeeds. It is **running** when `latest.status` is not `completed`.
- `failing_tests` comes from the run's `project-os-test-run-*` artifacts, the run file above uploaded by the workflow (`details: "artifact"`). Without the artifact, `failing_jobs` names the failed jobs from `gh run view` (`details: "jobs"`). Both stay empty for a run that passed.
- `error` is empty, or one sentence saying why the fetch did not happen: no `gh`, not logged in, no network, or an `origin` that is not on GitHub. The previous `workflows` are kept beside it.

## Uploading the run file from a workflow

The template's `validate-docs.yml` uploads `.project-os/runs/` after the test step, whether it passed or not. A project's own workflow that runs `run-tests.py`, such as an `android-tests.yml`, adds the same step after its test step:

```yaml
      - name: Upload the test run's progress file, so ci-status.py can name the failing tests
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: project-os-test-run-${{ github.job }}
          path: .project-os/runs/
          include-hidden-files: true
          if-no-files-found: ignore
          retention-days: 14
```

`include-hidden-files` is needed because the folder's name starts with a dot. The job's name in the artifact's name keeps two jobs of one run from colliding; a matrix job adds `-${{ strategy.job-index }}`. `ci-status.py` downloads every artifact whose name starts with `project-os-test-run` and reads each one's `latest.json`. A workflow that runs its tests without `run-tests.py`, such as a plain `./gradlew test`, writes no run file; `ci-status.py` then names its failed jobs instead of its tests.
