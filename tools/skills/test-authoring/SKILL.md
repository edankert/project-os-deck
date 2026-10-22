---
type: skill
id: SKILL-TEST-AUTHORING
status: active
owner: group:maintainers
created: 2026-01-27
updated: 2026-09-04
tags: [skills, tests]
---

# Skill: Test authoring (manual + automated)

## When to use
- A task/issue/feature changes behavior and needs verification.
- A requirement should be gated on verification.

## Inputs
- What changed and what should be true (links to issue/task/feature/requirement).
- Whether verification is manual or automated.

## Outputs
- `../../../SNAPSHOT.yaml` updated (`items.tests` + links from the affected items).
- A new/updated test note, stored per `../../instructions/LIFECYCLE.md` "Test storage".

## What is being authored
A `TST-*` note is the record of verification: the procedure, the verdict, and the adequacy evidence a reader can re-run. The scratch checks written on the way to that verdict, a one-off script, a grep, a mutated copy of the code, are not kept; record what they showed in `adequacy:` and delete them. Committed code tests follow the repo's existing convention for that kind of change, sit beside the tests they resemble, and are sized to the behaviours the task states, roughly one focused test per behaviour. Reason: the verification gate rewards linking more `TST-*` notes, and nothing else says where the limit is.

## Checklist
1. Allocate the next `TST-####` (use `../../../SNAPSHOT.yaml -> counters.TST`).
2. Update `../../../SNAPSHOT.yaml`:
   - choose `scope: feature|system`
   - add `items.tests.<TST-####>` with `file`, `title`, `status`, `owner`, `scope`, `level`, `entrypoint`
   - link the test from impacted items (requirement/feature/task/issue) and link those IDs back from the test
3. Create/update the test note from `../../../docs/__templates__/test.md`:
   - Store the note per `../../instructions/LIFECYCLE.md` "Test storage".
   - For an **acceptance check** (`level: acceptance`, no `command:`):
     - write it under the four headings in `../../instructions/TESTING.md`, "A check is testable by a stranger" — Setup, Steps, Expect, Not this check. If someone testing it cannot tell what to do or what should happen, the check is wrong, not the tester.
     - leave `status: active`: an acceptance check rests there, and its verdict is an event in the release ledger rather than a field on the note (`../../instructions/STATUSES.md` `[[test]]`)
     - if it can only be tested after another check has passed, name that check in `after:` (`../../instructions/TESTING.md`, "The release test", rule 4). It orders the release test sheet and gates nothing.
   - For any other **manual** test:
     - write an unambiguous procedure and expected results
     - leave `status: ready` (defined, not yet run; `../../instructions/STATUSES.md` `[[test]]`) and `evidence: []`
     - request human feedback (pass/fail + evidence)
   - For a test with a **`command:`**:
     - set `command:` and `entrypoint` (repo path) and the expected artifacts
     - leave `status: active` (`../../instructions/STATUSES.md` `[[test]]` says why); `python3 tools/scripts/run-tests.py --filter TST-####` reproduces the run
4. Apply the gates in `../../instructions/STATUSES.md`, "The contract at a glance", before any terminal status.

## Reporting progress from a long command
A test command that runs for minutes, such as a Gradle build or an `xcodebuild test`, shows as one block while it runs unless it reports progress. `run-tests.py` sets `PROJECT_OS_TEST_PROGRESS` to a file path for each command, and a command may append one JSON object per line to it:

```
{"done": 12, "total": 60, "failed": 1, "now": "AddRiderFlowTest"}
```

Every key is optional: `done` and `total` count whatever the command runs, `failed` counts failures so far, and `now` names what runs now in a few words. The newest line that parses is copied into the command's entry in `.project-os/runs/latest.json`, and the terminal view, the status line and the cockpit show it. A command that ignores the variable still works. The full file format is in `../../instructions/TEST-RUNS.md`.

- **Gradle**: add the template's init script to the command, so the project's build files stay as they are: `./gradlew test --init-script tools/scripts/gradle-test-progress.gradle`. It appends a line after each test with `done`, `failed` and the class now running. Gradle does not know the total in advance, so there is no `total`.
- **xcodebuild**: pipe its output through a filter that counts the lines xcodebuild prints for each finished test, and pass the output on unchanged. A sketch, not yet run on a real project:

  ```sh
  set -o pipefail
  xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | awk -v out="${PROJECT_OS_TEST_PROGRESS:-/dev/null}" '
    /^Test [Cc]ase .*(passed|failed)/ { done++; if ($0 ~ /failed/) failed++; printf "{\"done\": %d, \"failed\": %d}\n", done, failed >> out; fflush(out) }
    { print }'
  ```

  A project that wants a `total` counts its test cases before the run and adds it to each line.
- Don't change a project's tests to report progress; report it from the command line that runs them, as above.
