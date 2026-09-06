---
type: reference
id: TEMPLATES-SCHEMAS
status: active
owner: team:docs
created: 2026-01-27
updated: 2026-07-21
tags: [templates, schema]
---

# Template schemas (frontmatter fields)

This document defines the intended meaning of the frontmatter fields used by the note templates in `docs/__templates__/`.

Conventions (naming, linking, property rules): `../../tools/instructions/OBSIDIAN.md`.

## Common fields (most templates)

- (required) `type` (link string): Obsidian link identifying the note type, e.g. `type: "[[task]]"`.
  - Used by tools/automation to classify notes; the snapshot references these types.
- (required) `id` (string): Stable identifier (should match the filename prefix).
  - Used for traceability and for `SNAPSHOT.yaml` keys.
- (recommended) `title` (string): Human-friendly title for views and summaries.
  - Keep short; no need to repeat the ID.
  - Keep it consistent with `SNAPSHOT.yaml` where possible.
- (required) `status` (string): Lifecycle state; each note type has its own allowed values.
- (optional) `phase` (link or integer): Development phase for milestone grouping. Prefer `[[PHASE-####]]` links when using first-class phase notes; legacy integer values may be used during migration. See `[[PHASES]]` for definitions.
  - Enables machine-filtering, automated progress tracking, and phase grouping.
  - Leave empty/omit for items not tied to a specific phase.
- (required) `owner` (string): Accountable person/team (can be `unassigned`).
  - Values must be defined in `[[OWNERSHIP]]` (or be `unassigned`).
- (required) `created` (date string): Creation date; keep stable.
- (required) `updated` (date string): Last material edit date; bump when meaningfully changed.
- (optional) `related` (list of links/strings): Cross-links to other notes and/or repo paths.
  - Prefer links (`[[...]]`) when pointing to other notes in this docs set.
- (optional) `source` (list of strings/links): Provenance for imported/derived items.
  - Use for links to external trackers, changelogs, or source documents.
- (optional) `origin` (link): The former parent an item was descoped from when it was `deferred`.
  - Set by the deferral procedure (`tools/instructions/STATUSES.md`, "Deferral and re-adoption"); kept as history after re-adoption.
  - Distinct from `source` (import provenance): `origin` records where work was originally scoped inside this project.

## `adr.md` (`type: [[adr]]`)

Purpose: capture “why we chose X” with alternatives and consequences.

Fields:
- (required) `decision` (string): One-sentence decision statement.
- (required) `context` (string): One-sentence reason/background for the decision.
- (optional) `alternatives` (list): Options considered (strings or links).
- (optional) `consequences` (list): Key impacts/tradeoffs (strings or links).
- (optional) `supersedes` (string/link): Link to the ADR replaced by this one (prefer `[[ADR-....]]`).
- (optional) `superseded` (string/link): Link to the ADR that replaces this one (prefer `[[ADR-....]]`).

Body sections:
- A decision stating a quantified rule carries `## Rule`, `## Domain` and `## Conformance` in its body — the rule-ADR convention, normative in `tools/instructions/DECISIONS.md` ("A decision that states a rule") and enforced by `DECISION-RULE`.

Where used:
- Referenced from `../decisions/README.md` for organization.

## `change.md` (`type: [[change]]`)

Purpose: durable “what shipped and why” note.

Naming:
- Filename should be `CHG-YYYYMMDD-Short-Description.md`.
- `id` should match the filename without `.md` (same `CHG-...-Short-Description` string).

Fields:
- (optional) `commit` (string): Commit hash.
- (optional) `pr` (string): PR/MR identifier or link.
- (recommended) `impacts` (list of strings): Affected areas/paths/flows (keep short).
- (optional) `issues` (list of links): Issues associated with the change.
- (optional) `features` (list of links): Features associated with the change.
- (optional) `reviewed_by` (string): Independent reviewer identity (`model:...` or `user:...`) when a change note was reviewed; it owes none (`tools/instructions/QUALITY.md`, "Independent review (clean-context)").
- (optional) `review_date` (string/date): Date of the independent review.
- (optional) `review_verdict` (string): `approved | changes-requested`.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.changes`) for agent context and linked from change notes.

## `feature.md` (`type: [[feature]]`)

Purpose: a work package describing a capability, with traceability to requirements and tasks.

Fields:
- (required) `goal` (string): Short outcome statement.
- (optional) `requirements` (list of links): `[[REQ-...]]` links implemented by this feature.
- (optional) `tasks` (list of links): `[[TASK-...]]` links that deliver the feature — the feature's **current scope**; its completeness gate is `tools/instructions/STATUSES.md` `[[feature]]`.
- (optional) `deferred` (list of links): `[[TASK-...]]` links descoped out of the feature via the deferral procedure (each keeps `origin` pointing back here). Not part of completeness.
- ~~`tests`~~ — **removed (ADR-0032).** A feature does not list its tests. The verification link has one direction and one encoding: the test's `covers:`. A feature's tests are rendered from a reverse index over that field, so the list is derived and cannot drift — where the field could only ever be as correct as the last person to edit both sides, and a third of the fleet's feature→test edges disagreed when it was measured.

  *The same reverse encoding still exists on `task`, `issue` and `requirement` (330 live edges fleet-wide against the feature's 62). Normalising those is decided in principle and not yet done; until then `VERIFY` ignores any linked test at `level: acceptance` so the merged type cannot trip the gate from those three.*
- (optional) `release` (string): Milestone/release label.
- (optional) `acceptance_exception` (string): Why this feature can never have an acceptance check — an engine with no user-facing surface, a phase of work, a repo that ships prose. **Said once, at scaffold time, when the reason is known.** Non-empty silences `FEATURE-UNCOVERED` for this feature permanently; empty (the template's default) means the feature is expected to be covered by the time it is `done`. This is an escape, not a switch: a reason that is not true is worse than the warning it removes.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.features`) for agent context and linked from feature notes.

## `phase.md` (`type: [[phase]]`)

Purpose: define a delivery milestone with explicit scope, linked work, and exit criteria.

Naming:
- Filename should be `PHASE-####-Short-Name.md`.
- `id` should match the filename prefix.

Fields:
- (required) `order` (integer): Sort order for roadmap sequencing.
- (required) `goal` (string): Short outcome statement for the milestone.
- (optional) `features` (list of links): Features planned for this phase.
- (optional) `requirements` (list of links): Requirements introduced or verified in this phase.
- (optional) `tasks` (list of links): Active or key tasks in this phase.
- (optional) `issues` (list of links): Issues tied to this phase.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.phases`) for agent context and linked from phase-aware items.

## `issue.md` (`type: [[issue]]`)

Purpose: canonical problem report / gap / bug.

Fields:
- (required) `severity` (string): e.g. `low|medium|high|critical` (project-defined).
- (recommended) `component` (string): Subsystem/area label (project-defined).
- (optional) `parent` (string/link): Link to a parent feature/epic note.
- (optional) `tests` (list of links): `[[TST-...]]` links used to reproduce/verify the issue.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.issues`) for agent context and linked from issue notes.

## `requirement.md` (`type: [[requirement]]`)

Purpose: acceptance criteria that features/tasks must satisfy.

Fields:
- (required) `priority` (string): e.g. `low|medium|high` (project-defined).
- (optional) `scope` (string): Short scoping label (area/domain).
- (required) `acceptance` (list): Acceptance criteria statements (strings). This list is the **criteria of record** — the machine-readable contract other notes and tooling refer to.
  - The body `## Acceptance Criteria` checkboxes are the **verification record**: one box per criterion, ticked only with an evidence pointer (path, `path:line`, command, or note ID) at feature close-out.
  - Both surfaces must describe the same criteria; where they diverge, frontmatter wins and the body is corrected. Departures from a criterion are amended/superseded with rationale (an `## Amendments` section), never ticked to fit — see `../../tools/skills/close-out/SKILL.md`, step 3 "Requirement advancement".
- (optional) `implements` (link): The feature implementing this requirement. Direction note: this names the feature that implements *this requirement* (the inverse-named back-reference), and it holds **at most one** feature (`tools/instructions/STATUSES.md` `[[requirement]]`, Ownership).
- (optional) `verifies` (list of links/paths): Proof/verification pointers (workflows/tests/repo paths).
- (optional) `tests` (list of links): `[[TST-...]]` links that verify this requirement.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.requirements`) for agent context and linked from requirement notes.

## `reference.md` (`type: [[reference]]`)

Purpose: durable explanatory, registry, or background material that supports project understanding but is not itself a task, feature, workflow, decision, test, issue, requirement, phase, risk, or change.

Fields:
- (recommended) `scope` (string): Short scope label such as `project`, `docs`, `tooling`, or a domain-specific area.
- (optional) `related` (list of links/strings): Related notes or repo paths.
- (optional) `source` (list of strings/links): Provenance or upstream/source documents.

Where used:
- Surfaced by the cockpit project mode under References and by `/index/references`.
- Not normally tracked in `SNAPSHOT.yaml` unless a downstream project deliberately promotes a reference collection into active state.

## `risk.md` (`type: [[risk]]`)

Purpose: track hazards + mitigations.

Fields:
- (required) `likelihood` (string): e.g. `low|medium|high` (project-defined).
- (required) `impact` (string): e.g. `low|medium|high` (project-defined).
- (recommended) `mitigation` (list): Mitigation actions (strings or links to tasks).

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.risks`) for agent context and linked from risk notes.

## `task.md` (`type: [[task]]`)

Purpose: actionable unit of work with a Definition of Done.

Fields:
- (required) `parent` (link): Link to a feature or issue note this task belongs to.
- (optional) `effort` (string): Size label (e.g. `XS|S|M|L`).
- (optional) `due` (string/date): Due date.
- (optional) `depends` (list of links): Tasks/issues that must complete first.
- (optional) `blocks` (list of links): Tasks/issues blocked by this task.
- (optional) `tests` (list of links): `[[TST-...]]` links used to verify completion.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.tasks`) for agent context and linked from task notes.

## `test.md` (`type: [[test]]`)

Purpose: describe how to verify behavior (manual or automated) and provide durable coverage mapping.

Fields:
- (required) `scope` (string): values in `tools/instructions/TAXONOMY.md`, "`scope` (tests)"; it decides where the note is stored (`tools/instructions/LIFECYCLE.md`, "Test storage").
- ~~`kind`~~ — **removed (ADR-0034 decision 4).** `command:` answers who runs a test: present, the runner owns it; absent, a person does. Two fields answering one question is how the reader and the registry came to disagree about 8 of 788 notes.
- (recommended) `level` (string): values in `tools/instructions/TAXONOMY.md`, "`level` (tests)".
- (optional) `entrypoint` (string): Repo-relative command/script to run (or blank for purely manual tests).
- (optional) `command` (string): A runnable check. **When present the note records no verdict** (project-os-dev ADR-0025; `tools/instructions/STATUSES.md` `[[test]]`): it rests at `active`, CI runs it, and the validator's COMMAND-VERDICT reports a `ready`/`passing`/`failing` or a `last_run`/`exit_code` written on it. The reason ADR-0010 gave still holds, the party seeking a transition must not certify it; this closes it by leaving nothing on the note to certify. A hand-edited `status` on a note carrying a `command` was a validator error.
- (required for manual tests) `last_verified` (date): When a human last performed the procedure. A manual test past the project's staleness window stops satisfying the verification gate — verification that was true a year ago is not evidence about today's system.
- `status`: the values, who writes them and what a `command:` changes are `tools/instructions/STATUSES.md` `[[test]]`.
- (recommended) `requirements` (list of links): Requirements verified by this test (`[[REQ-...]]`).
- (required where the test verifies anything in particular) `covers` (list of links): **the single encoding of what this test verifies** — `[[FEAT-...]]`, `[[ISS-...]]`, `[[REQ-...]]` (ADR-0032). Resolvable through the index. A system-wide test that verifies nothing in particular leaves it empty, deliberately.
- (optional) `issues` (list of links): Related issues (`[[ISS-...]]`) — context, not verification. What the test *verifies* goes in `covers`.
- (optional) `tasks` (list of links): Related tasks (`[[TASK-...]]`).
- (optional) `artifacts` (list): Expected artifacts/logs.
- (optional) `evidence` (list): Evidence from the last run (paths/log excerpts).
- ~~`last_run`~~, ~~`exit_code`~~ — **removed (ADR-0025).** The runner wrote them; it no longer writes to a note.
- (optional) `adequacy` (string): Evidence the test actually guards (see `tools/instructions/TESTING.md`, "Test adequacy").
- (optional) `mutation_score` (string): Mutation-testing score for the code this test guards, when measured.
- (optional) `reviewed_by` (string): Independent reviewer identity (`model:...` or `user:...`), per `tools/skills/independent-review/SKILL.md`.
- (optional) `review_date` (string/date): Date of the independent review.
- (optional) `review_verdict` (string): `approved | changes-requested`.

### Acceptance fields (`level: acceptance` only)

An acceptance test is the thing a person walks. It carries the fields below and rests at `status: active` (`tools/instructions/STATUSES.md` `[[test]]`); every one of them is meaningless on an executable test and the validator does not require them there.

**The note holds intent. The verdict is not on it** (ADR-0037; why is `tools/instructions/TAXONOMY.md`, "Acceptance outcomes (the ledger's vocabulary)"). It lives as a dated, attributed event in `docs/releases/ledgers/`. Only the cockpit writes and reads that directory today; no release skill creates it or defines the file format.

**Seven fields were removed**: `mark`, `verdict_date`, `verdict_reason`, `invalidated_by`, `automation`, `covered_by`, `evidence`. Do not write them on a new note. The refusal is not uniform and you should not rely on it: the cockpit's validator rejects them (and five more) in a repo that keeps ledgers, while `tools/scripts/validate-docs.py` — the entrypoint pre-commit and CI run — rejects none of them and still reads `mark:`. Which way the two converge is an open decision. A repo with no ledger is untouched and keeps reading its scalar marks, because a schema change that broke every repo that had not migrated yet would be a worse failure than the one it fixes.

- ~~`tier`~~ — **removed (ADR-0034).** There is no tier system: a check's section is derived from `covers:` and `command:` (`tools/instructions/TESTING.md`, "The three sections"). Readers still accept the field on legacy notes and ignore it.
- ~~`burden`~~, ~~`migrated_from`~~, ~~`merged_from`~~ — **removed (ISS-0233).** Provenance of migrations that are finished, plus a field empty on every check in the fleet. Git holds the first two, with the shas ADR-0030 and ADR-0031 name; a field is the wrong place for a fact already immutable somewhere better.
- (required) `area` (string): the human grouping — "The navigator", "Agents and sessions". One walk's worth of related checks.
- ~~`section`~~, ~~`ordinal`~~ — **removed (ISS-0224).** They were a check's position in `ACCEPTANCE_TESTS.md`, a document that exists in no migrated repo. Order is `id` and grouping is `area` alone. Measured before the removal, ordering by tier-then-id reproduced the old section order byte-for-byte in every repo, and no area spanned two sections anywhere; ADR-0034 then removed `tier` as well, leaving `id`.

Where NOT used:
- The obligation registry and the independent-review gate: neither engages for an acceptance test, by construction (`tools/instructions/STATUSES.md` `[[test]]`).
- `SNAPSHOT.yaml` `items.tests`: a repo can hold hundreds of acceptance tests and the snapshot is active-and-recent context. Executable tests are tracked as before.


Where used:
- Tracked in `SNAPSHOT.yaml` (`items.tests`) for agent context and linked from test notes.

## `check.md` — removed (ADR-0031)

There is no `check` type and no `check.md` template; an acceptance check is a `[[test]]` at `level: acceptance`, its fields documented under `test.md` above. Why the type was retired is stated once in `tools/instructions/TAXONOMY.md`, "`check` — retired". See `project-os-cockpit` ADR-0031, which supersedes ADR-0030.

## `release.md` (`type: [[release]]`)

Purpose: first-class release record with traceability to shipped features, changes, and verified tests.

Naming:
- Filename should be `REL-####-v<version>.md`; `id` should match the `REL-####` prefix.

Fields:
- (required) `version` (string): Human version string (e.g. `1.4.0`).
- (required) `tag` (string): VCS tag for the release (e.g. `v1.4.0`).
- (required) `date` (date string): Release (or planned release) date.
- (optional) `platform` (string): Target platform/channel when the project ships more than one.
- (recommended) `features` (list of links): `[[FEAT-...]]` shipped in this release.
- (recommended) `changes` (list of links): `[[CHG-...]]` notes included in this release.
- (recommended) `tests_verified` (list of links): `[[TST-...]]` verified for this release (see `../../tools/skills/release-verification/SKILL.md`).
- (recommended) `previous_release` (string/link): The prior `REL-*` for rollback targeting.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.releases`) and summarized in the optional `releases.latest`/`releases.history` block.

## `plan.md` (`type: [[plan]]`)

Purpose: per-feature implementation plan living at `docs/features/<slug>/plan/PLAN.md`; the checklist of tasks that deliver the parent feature.

Fields:
- (required) `parent` (link): The `[[FEAT-...]]` this plan delivers. (Feature-scaffold generated plans may use `parent` only; the template's `id`/`implements` fields are optional for plans.)
- (optional) `implements` (list of links): Requirements the plan addresses.

Where used:
- Not tracked in `SNAPSHOT.yaml`; discovered via its parent feature's directory.

## `workflow.md` (`type: [[workflow]]`)

Purpose: canonical “front door” for a repo activity (what to run, inputs/outputs).

Fields:
- (recommended) `entrypoints` (list): Main scripts/commands (repo-relative).
- (optional) `prereqs` (list): Prerequisite tools/env/licenses (strings or links).
- (optional) `inputs` (list): Required inputs (paths/links).
- (optional) `outputs` (list): Expected outputs/artifacts/log locations.

Where used:
- Tracked in `SNAPSHOT.yaml` (`items.workflows`) for agent context and linked from workflow notes.
