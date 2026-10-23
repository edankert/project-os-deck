# Project: project-os-deck

Read SNAPSHOT.yaml at session start to understand current project state and focus.
Read CONTEXT.md for the full project-os contract, edit policy, and invariants.

## What this repo is

`project-os-deck` is **Deck**: a second application over project-os notes. It opens on the **overview** (PHASE-0005): the wheel of phases with each feature a tower of its tickets, a screen per phase and per ticket, and the flows where a person accepts a design, a test result and a ticket. Beside it Deck runs its own Claude and Codex sessions, each tied to a ticket and drawn as a conversation, shows the cockpit's Needs you and overview panels, and has a drawer of plain shells (PHASE-0004, ADR-0009). **The original Deck was parked on 2026-10-23** ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]): Spread (cards on desks across windows), Glass (the field where depth is priority) and the orbit left main and are kept whole under the git tag `original-deck-2026-10-23`. If they are wanted again, a new repository is made from the tag; do not rebuild them here.

**Deck shares project-os-cockpit's sidecar and writes only through it.** The sidecar lives in `../project-os-cockpit/src/project_os_cockpit/` and is not vendored here. Every verb Deck offers goes through that sidecar's guards (loopback-only writes, human-only verbs, the verb registry), sent by the shell and never by the served host (ADR-0003).

**The cockpit stays the primary place for new functionality; Deck keeps an eye on it and must be able to support it.** Edwin, 2026-09-06: too early to say that new cockpit functionality should land in Deck instead. The cockpit keeps a capability register (`../project-os-cockpit/docs/reference/cockpit-capability-register.md`) with a stable key per capability, and every change note there that adds, changes or retires capability updates it. Deck's side is `docs/reference/cockpit-adoption.md`: when a new row appears in the register, add it here as `not yet` with the date, and let grooming decide. Before adopting a capability, check its key exists there; file an issue in the cockpit repository if the register does not describe it well enough.

**Two rules the architecture note settled still hold** (`docs/reference/cockpit-surface-architecture-options-2026-09-06.md`, Part 8): Deck is one renderer with two hosts (the Electron shell, and Deck's own host serving it read-only for a tablet), and every reachable Deck state has an address (an overview screen, with the ticket selected and the session open). The third, a view provider chosen by workspace kind, left main with Spread and Glass; an old address naming a view, a desk or a surface opens the overview and says that part is gone.

**Phases.** PHASE-0004 Parity (agent sessions, Needs you, the overview panels, the shell drawer) and PHASE-0005 Overview are the ones being worked on. PHASE-0001 Deck, PHASE-0002 Glass and PHASE-0003 Vault are `deferred` under ADR-0010; what PHASE-0001 built under Spread (the store, Deck's own index, the sidecar client, the host, the write channel) stays on main because the overview runs on it.

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
- Test runs and CI results you can watch: tools/instructions/TEST-RUNS.md

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
- Release test procedure: tools/skills/release-test-procedure/SKILL.md
- Release test preparation: tools/skills/release-test-prep/SKILL.md
- Adapter sync: tools/skills/adapter-sync/SKILL.md
- Project init: tools/skills/project-init/SKILL.md
- Project derive: tools/skills/project-derive/SKILL.md
- Design authoring: tools/skills/design-authoring/SKILL.md

## Model routing

Preflight and planning are delegated to the `planner` subagent (`.claude/agents/planner.md`); close-out review and ad-hoc review requests to `independent-reviewer` (`.claude/agents/independent-reviewer.md`). Both files are emitted by upstream project-os's generator; edit them upstream (`../project-os`), not here. The `UserPromptSubmit` hook injects a routing hint from the SNAPSHOT focus item's status; follow it unless the prompt clearly says otherwise.

## Project-specific notes

Stack: Electron with a TypeScript renderer, no framework and no bundler, in `desktop/`. `cd desktop && npm install && npm start` runs it; `npm test` builds and runs every suite; `bash tools/scripts/run-desktop-tests.sh <suite>` runs one, which is what each `TST-*` note's `command:` does. The sidecar is consumed from the sibling checkout and is never vendored; Deck reuses one that is already running before starting its own. Upstream relationship: this repo is downstream of `../project-os` (the canonical template). Run `tools/scripts/sync-project-os.sh ../project-os` to pull template-owned files when the upstream changes.

**Never stop a process by pattern, and never by a pid you found with `ps | grep`.** Deck and the cockpit are both launched as `Electron .`; only the repository path in the command line separates them. On 2026-09-07 that killed Edwin's running cockpit twice: first with `pkill -f '...MacOS/Electron \.$'`, then with a pid taken from `ps -ax | grep 'MacOS/Electron \.$' | tail -1`, which was the cockpit's. Start Deck as a background task and stop it with the task id. If a pid is unavoidable, grep for the full repository path (`project-os-deck/desktop/node_modules/electron`), never for the trailing `Electron .`, and print `ps -o command -p <pid>` BEFORE the kill. A port held by a process you did not start is worked around (`npm run start:lan` moves Deck to the next free port) and reported, never freed.
