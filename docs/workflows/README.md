---
type: reference
id: WORKFLOWS-README
status: active
owner: team:docs
created: 2026-01-26
updated: 2026-01-29
tags: [workflows]
---

# `docs/workflows/`

Workflow notes describe the **canonical entrypoints** for common activities in this repo (what to run, what inputs are needed, what artifacts/logs to expect).

## What goes here
- `WF-####-*.md` notes, one per workflow, kept short and command-oriented.

## When to add a workflow note
- A developer needs a repeatable “front door” to accomplish something (build, test, run, deploy, troubleshoot).
- There is more than one valid path and you want to standardize on the recommended one.

## How workflows relate to other docs
- `../issues/`: file an issue when a workflow is broken or unclear.
- `../changes/`: add a change note when a workflow materially changes (scripts, paths, required env vars).

## What does NOT belong here

**project-os's own machinery.** Initialising a project, syncing the template, recovering a session — those are described where they are implemented, under `tools/`, and a note here restating them is an index of another directory filed as though this project had authored it.

The template used to ship three such notes (`WF-0001` Existing Project Init, `WF-0002` Template Sync, `WF-0003` Recovery Resume). Measured 2026-08-11: **24 copies across 8 repos, every one `status: draft`, every one `updated: 2026-01-29`, byte-identical to the template's — six and a half months without a single edit in any repo.** Each named its real home in its own frontmatter: `tools/skills/project-derive/SKILL.md`, `tools/scripts/sync-project-os.sh`, `tools/instructions/HANDOFF.md`. They were removed on 2026-08-14.

Read those instead:

| what you wanted | where it lives |
|---|---|
| initialise / import an existing project | `tools/skills/project-derive/SKILL.md` |
| sync template updates into a repo | `tools/scripts/sync-project-os.sh`, `tools/instructions/SYNCING.md` |
| resume after a failure or hand off | `tools/instructions/HANDOFF.md` |

**Project-authored workflows are different and are welcome.** *"How you build and run this app"* is a fact about the project, and `tools/` is template-owned — `sync-project-os.sh` overwrites it — so a project workflow filed there would be destroyed by the next sync. Eight such notes exist across three fleet repos and none of them was touched by this change.

## Index
- None yet. The Deck phase adds the shell's build and run workflow here.
