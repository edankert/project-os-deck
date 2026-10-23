---
type: "[[task]]"
id: TASK-0217
aliases: ["TASK-0217"]
title: "The README files, CLAUDE.md and the adoption table describe Deck as the overview"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'tag and remove; park Vault too'"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: S
due: ""
depends: ["[[TASK-0216]]"]
blocks: []
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]"]
tests: []
---

# The written description says Deck is the overview

**After this task a newcomer reading the repository learns that Deck is the overview, and where the original Deck went.**

## Definition of Done
- [x] `CLAUDE.md`: "What this repo is" and the phases paragraph describe the overview, agent sessions and the shell drawer, and name the tag. The "three rules" paragraph drops the view provider.
- [x] `README.md` and `desktop/README.md` describe what runs today, with no `npm run measure`.
- [x] `docs/reference/cockpit-adoption.md`: rows that name Spread or Glass say where the capability now stands.
- [x] `docs/PHASES.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md` and `SNAPSHOT.yaml`'s `project.summary` agree with ADR-0010.
- [x] A change note `docs/changes/CHG-YYYYMMDD-...` records the removal, the tag and how to revive it.

## Steps
- [x] `rg -l 'Spread|Glass|orbit' README.md CLAUDE.md desktop/README.md docs/*.md docs/reference` and rewrite each hit that describes main.

## Notes
CLAUDE.md is the project's own file, not template-owned, so it is edited here.

## Verification

- 2026-10-23: `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, `docs/INDEX.md`, `docs/PHASES.md` and `SNAPSHOT.yaml`'s summary describe Deck as the overview and name the tag. `desktop/README.md` already named nothing removed. In `docs/reference/cockpit-adoption.md` fourteen rows that named Spread or Glass now say where the capability stands, and `shell.terminal` is partly adopted by the shell drawer.
- The change note is [[CHG-20261023-Deck-Is-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]], with the command that revives the original Deck.
