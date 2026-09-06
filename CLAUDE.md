# Project: project-os-deck

Read SNAPSHOT.yaml at session start to understand current project state and focus.
Read CONTEXT.md for the full project-os contract, edit policy, and invariants.

## What this repo is

`project-os-deck` is **Deck**: the second application over project-os notes and any Obsidian-style vault. Notes as cards arranged across windows and screens (the **Spread** view) and a spatial field where depth is priority (the **Glass** view). Nothing is built yet; the repository holds the two designs with their HTML prototypes (DES-0001, DES-0002), one feature (FEAT-0001, the read-only field over the real link graph), the architecture options note and the cockpit adoption table.

**Deck shares project-os-cockpit's sidecar and adds no write path.** The sidecar lives in `../project-os-cockpit/src/project_os_cockpit/` and is not vendored here. Every verb Deck offers goes through that sidecar's guards (loopback-only writes, human-only verbs, the verb registry).

**The cockpit stays the primary place for new functionality; Deck keeps an eye on it and must be able to support it.** Edwin, 2026-09-06: too early to say that new cockpit functionality should land in Deck instead. The cockpit keeps a capability register (`../project-os-cockpit/docs/reference/cockpit-capability-register.md`) with a stable key per capability, and every change note there that adds, changes or retires capability updates it. Deck's side is `docs/reference/cockpit-adoption.md`: when a new row appears in the register, add it here as `not yet` with the date, and let grooming decide. Before adopting a capability, check its key exists there; file an issue in the cockpit repository if the register does not describe it well enough.

**Three rules the architecture note settled** (`docs/reference/cockpit-surface-architecture-options-2026-09-06.md`, Part 8): Deck is one renderer with two hosts (the Electron shell, and the sidecar serving it read-only for a tablet); every reachable Deck state has an address (a view, a desk, a focused note); Deck owns its list of views and the renderer holds no fixed set of view buttons: a view provider chosen by workspace kind supplies the list, the built-in provider for a project-os repository offers the same views the cockpit does, and the Vault phase adds a provider that reads a vault's `.base` files. The sidecar is not asked to change for this (Edwin, 2026-09-06, revising the note's proposal that the sidecar answer the question).

**Phases, in order, none opened yet:** Deck (the store, the windows, Spread), Glass (on FEAT-0001's measurements), Vault (the workspace profile, bases as views, canvases as boards). The cockpit's ISS-0279 (a list-valued `type:` is dropped by the indexer) joins the Vault phase when it opens.

**Links to the cockpit's notes use the cross-repo form** `[[project-os-cockpit#ID]]`, which the cockpit resolves by switching workspace. Do not put a cross-repo reference in a relationship field the validator checks (`parent`, `phase`, `implements`, `tasks`, ...); `related:` and prose are fine. Notes moved here on 2026-09-06 carry a Provenance section naming their old id in the cockpit; the cockpit's counters were not reused.

## project-os documentation system (core rules -- always active)

@tools/instructions/LIFECYCLE.md

## Reference instructions (read when relevant)

These files contain detailed rules. Read them when performing the related operation:
- Status taxonomies and transitions: tools/instructions/STATUSES.md
- Quality, close-out, and verification gating: tools/instructions/QUALITY.md
- Snapshot structure and update rules: tools/instructions/SNAPSHOT.md
- Allowed taxonomy values: tools/instructions/TAXONOMY.md
- Required link graphs: tools/instructions/TRACEABILITY.md
- ADR conventions: tools/instructions/DECISIONS.md
- Ownership rules: tools/instructions/OWNERSHIP.md
- Obsidian conventions: tools/instructions/OBSIDIAN.md
- Writing clearly (prose, commit messages, replies): tools/instructions/WRITING.md
- Markdown authoring: tools/instructions/MARKDOWN.md
- Handoff/recovery: tools/instructions/HANDOFF.md
- Importing from existing projects: tools/instructions/IMPORTING.md
- Acceptance test sections and lifecycle: tools/instructions/TESTING.md
- Hook contracts: tools/instructions/HOOKS.md
- Syncing template updates: tools/instructions/SYNCING.md

## Skill playbooks (read before performing these operations)

- Issue intake: tools/skills/issue-intake/SKILL.md
- Phase planning: tools/skills/phase-planning/SKILL.md
- Feature scaffold: tools/skills/feature-scaffold/SKILL.md
- Task breakdown: tools/skills/task-breakdown/SKILL.md
- Close-out: tools/skills/close-out/SKILL.md
- Change note: tools/skills/change-note/SKILL.md
- Status transition: tools/skills/status-transition/SKILL.md
- Snapshot sync: tools/skills/snapshot-sync/SKILL.md
- Test authoring: tools/skills/test-authoring/SKILL.md
- ADR authoring: tools/skills/adr-authoring/SKILL.md
- Risk scan: tools/skills/risk-scan/SKILL.md
- Independent review: tools/skills/independent-review/SKILL.md
- Docs audit: tools/skills/docs-audit/SKILL.md
- Ad-hoc intake: tools/skills/ad-hoc-intake/SKILL.md
- Inbox triage: tools/skills/inbox-triage/SKILL.md
- Workflow authoring: tools/skills/workflow-authoring/SKILL.md
- Backlog grooming: tools/skills/backlog-grooming/SKILL.md
- Risk mitigation: tools/skills/risk-mitigation-planning/SKILL.md
- Impact analysis: tools/skills/impact-analysis/SKILL.md
- Release preparation: tools/skills/release-prep/SKILL.md
- Release verification: tools/skills/release-verification/SKILL.md
- Adapter sync: tools/skills/adapter-sync/SKILL.md
- Project init: tools/skills/project-init/SKILL.md
- Project derive: tools/skills/project-derive/SKILL.md
- Design authoring: tools/skills/design-authoring/SKILL.md

## Model routing

Preflight and planning are delegated to the `planner` subagent (`.claude/agents/planner.md`); close-out review and ad-hoc review requests to `independent-reviewer` (`.claude/agents/independent-reviewer.md`). Both files are emitted by upstream project-os's generator; edit them upstream (`../project-os`), not here. The `UserPromptSubmit` hook injects a routing hint from the SNAPSHOT focus item's status; follow it unless the prompt clearly says otherwise.

## Project-specific notes

Stack: none yet. When the Deck phase opens, the shell is Electron with a vanilla TypeScript renderer (no framework), and the sidecar is consumed from the sibling checkout. Upstream relationship: this repo is downstream of `../project-os` (the canonical template). Run `tools/scripts/sync-project-os.sh ../project-os` to pull template-owned files when the upstream changes.
