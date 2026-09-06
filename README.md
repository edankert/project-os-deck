# project-os-deck

**Deck** is the second application over project-os notes, and over any Obsidian-style vault. It shows notes as cards you arrange across windows and screens, and as a spatial field where depth is priority. It is built beside [project-os-cockpit](https://github.com/edankert/project-os-cockpit), shares that repository's Python sidecar, and is meant to replace the cockpit once it is mature. Until then the cockpit stays the default and takes fixes only.

Two views are designed, neither is built yet:

- **Spread** is the 2D view: a desk of open notes, lists that drive selection, panels that dock, float or pop out into their own window on another screen.
- **Glass** is the 3D view: the field from [DES-0002](docs/designs/DES-0002-The-Glass-Cockpit.md), where what needs you is at the front and the finished work is behind you.

Deck reads project-os repositories first. A vault with no `SNAPSHOT.yaml` gets a profile detected from its own templates and bases, so a worldbuilding vault opens with its characters, chapters and pages as typed notes. That is a later phase; the order is Deck's shell, then Glass, then vaults.

## Where to start

- `SNAPSHOT.yaml` is the current state and focus.
- `docs/reference/cockpit-surface-architecture-options-2026-09-06.md` is the design conversation this repository came out of: the options, the layered architecture, the tablet answer, the vault inventory, and the decisions taken.
- `docs/reference/cockpit-adoption.md` is the adoption table against the cockpit's capability register: what Deck has taken on, what it has not yet, and what it replaces.
- `docs/designs/` holds the two designs, DES-0001 (nine ways to read the record) and DES-0002 (the glass cockpit), with their live prototypes as HTML beside them.
- `docs/features/orbit-view/` is FEAT-0001, the read-only field over the real link graph that every version of Glass needs first.

## The relationship to the cockpit

The cockpit keeps a capability register with a stable key per capability. Every change note there that adds, changes or retires capability updates that register, and Deck's adoption table cites the same keys. When a new row appears there, it appears here as `not yet`, dated, and grooming decides. Notes that moved here from the cockpit on 2026-09-06 carry a Provenance section naming their old id; links to notes that stayed use the `[[project-os-cockpit#ID]]` form.

## Documentation system

This repository follows project-os. Read `AGENTS.md`, then `CONTEXT.md`, then `SNAPSHOT.yaml`. The lifecycle rules are in `tools/instructions/LIFECYCLE.md`; run `bash tools/scripts/validate-docs.sh` before committing.

## Licence

MIT, see `LICENSE`.
