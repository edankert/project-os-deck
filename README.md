# project-os-deck

**Deck** is a second application over project-os notes, beside [project-os-cockpit](https://github.com/edankert/project-os-cockpit). It opens on the overview: a wheel of the project's phases, each feature a tower of its tickets, with a screen for each phase and each ticket and the places where a person accepts a design, a test result and a ticket. Beside the overview it runs Claude and Codex sessions, each tied to the ticket it was started on and drawn as a conversation, and it has a drawer of plain shells. It shares the cockpit's Python sidecar, and every write goes through that sidecar's guards. The cockpit stays the default and the primary place where new functionality is built; Deck tracks the cockpit's capability register so it can support what arrives there.

**The original Deck is kept under a git tag.** Deck began as Spread (notes as cards on desks across windows and screens) and Glass (a field where depth is priority, with the orbit of the whole link graph). Both, and the planned Vault phase for Obsidian vaults, left the main branch on 2026-10-23 ([ADR-0010](docs/decisions/ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag.md)). The tag `original-deck-2026-10-23` holds them whole, and the branch `parked/original-deck` holds one piece of work that was never finished. If they are wanted again, a new repository is made from the tag.

## Where to start

- `SNAPSHOT.yaml` is the current state and focus.
- `docs/reference/cockpit-surface-architecture-options-2026-09-06.md` is the design conversation this repository came out of: the options, the layered architecture, the tablet answer, the vault inventory, and the decisions taken.
- `docs/reference/cockpit-adoption.md` is the adoption table against the cockpit's capability register: what Deck has taken on, what it has not yet, and what it replaces.
- `desktop/README.md` says how to build, run and test the application.
- `docs/designs/` holds the designs with their HTML prototypes: DES-0004 to DES-0006 are the overview's and the agent sessions'. DES-0001 to DES-0003 are the original Deck's.

## The relationship to the cockpit

The cockpit keeps a capability register with a stable key per capability. Every change note there that adds, changes or retires capability updates that register, and Deck's adoption table cites the same keys. When a new row appears there, it appears here as `not yet`, dated, and grooming decides. Notes that moved here from the cockpit on 2026-09-06 carry a Provenance section naming their old id; links to notes that stayed use the `[[project-os-cockpit#ID]]` form.

## Documentation system

This repository follows project-os. Read `AGENTS.md`, then `CONTEXT.md`, then `SNAPSHOT.yaml`. The lifecycle rules are in `tools/instructions/LIFECYCLE.md`; run `bash tools/scripts/validate-docs.sh` before committing.

## Licence

MIT, see `LICENSE`.
