# LLM Brief

## Project Identity
- Name: project-os-deck (the application is called Deck)
- Purpose: the second application over project-os notes and any Obsidian-style vault. Notes as cards arranged across windows and screens (Spread), and a spatial field where depth is priority (Glass). Built beside project-os-cockpit, sharing its Python sidecar; the cockpit stays the primary place for new functionality; Deck tracks its capability register and must be able to support what arrives there.
- Canonical runtime state: `SNAPSHOT.yaml`

## Read Order
1. `CONTEXT.md`
2. `docs/INDEX.md`
3. `SNAPSHOT.yaml`
4. `docs/reference/cockpit-surface-architecture-options-2026-09-06.md` (why this repository exists, and what was decided)
5. `docs/reference/cockpit-adoption.md` (what Deck has and has not adopted from the cockpit)
6. `docs/ARCHITECTURE.md`

## High-Value Paths
- Core implementation entrypoints: none yet. No code has been written; the designs, one feature and the architecture notes are the whole repository.
- The sidecar Deck will consume: `../project-os-cockpit/src/project_os_cockpit/` (not vendored; the shared dependency)
- The cockpit's capability register Deck tracks: `../project-os-cockpit/docs/reference/cockpit-capability-register.md`
- Designs with live prototypes: `docs/designs/DES-0001-*.html`, `docs/designs/DES-0002-*.html`
- Operational tooling: `tools/`
- Documentation templates: `docs/__templates__/`

## Invariants
- `SNAPSHOT.yaml` is canonical for active work state.
- Deck shares the cockpit's sidecar and adds no write path of its own; every verb goes through the sidecar's guards.
- The classic cockpit is not refactored, and it stays the primary place for new functionality; Deck tracks the cockpit's capability register and keeps its adoption table current.
- Every Deck state a person can reach has an address (a view, a desk, a focused note), per the cockpit's ISS-0203 rule.
- Deck asks the sidecar which views a workspace has; it hard-codes none.
- Keep traceability links coherent between features, tasks, issues, tests, workflows, and changes.
- Prefer repo-relative paths in docs and logs.

## Typical Commands
- Bootstrap context: `bash tools/agents/bootstrap.sh`
- Scaffold a change note, due at close-out when behaviour changes: `bash tools/agents/start-change.sh "<short title>"`
- Validate docs invariants: `bash tools/scripts/validate-docs.sh`
- Browse the docs locally with the cockpit: `bash tools/cockpit/run.sh docs --bind 127.0.0.1 --port 8765`

## External Dependencies (Common)
- project-os-cockpit's sidecar (Python 3.11+), consumed as a sibling checkout for now.
- Electron, for the shell, once the Deck phase opens.

## Fast Failure Checks
- Run `bash tools/agents/bootstrap.sh` and inspect alerts.
- Keep `SNAPSHOT.yaml` and notes aligned after every functional change.
- Before adopting a cockpit capability, check its key exists in the cockpit's register; file an issue there if it does not.
