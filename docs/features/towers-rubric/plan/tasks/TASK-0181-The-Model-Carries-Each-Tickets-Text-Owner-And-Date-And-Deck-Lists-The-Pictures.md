---
type: "[[task]]"
id: TASK-0181
title: "The overview model carries each ticket's first paragraph, owner and last update, and Deck lists the pictures beside the notes with their dates and tickets"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0182]]", "[[TASK-0183]]", "[[TASK-0184]]", "[[TASK-0186]]"]
related: ["[[TASK-0176]]", "[[TASK-0177]]", "[[TASK-0179]]", "[[RISK-0011]]", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
tests: ["[[TST-0102]]", "[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]"]
---

# The model carries each ticket's text, owner and date, and Deck lists the pictures

**Every ticket in Deck's overview model gains its note's first paragraph, its `owner:` and its `updated:` date, and the model gains a list of the pictures kept beside the notes.** The towers page reads these from the notes itself; in Deck they come from the main process, read-only, like the index of notes.

## Definition of Done

- [x] `Ticket` in `desktop/src/shared/overview-types.ts` has `lead` (the first paragraph, as `leadOf` makes it), `owner` and `updated`, filled by `buildOverview` for both workspaces.
- [x] The model has `pictures`: each one's path under `docs/`, its last commit date and the ticket it belongs to, chosen by `evidenceFrom` and `designFeature` exactly as on the page. A picture changed since its last commit is listed with today's file.
- [x] `leadOf`, `evidenceFrom`, `designFeature`, `weeksOf` and `lastDates` live in `desktop/src/shared/` as TypeScript. `desktop/scripts/overview-towers-notes.mjs` imports them from the build instead of keeping its own copy, and the page regenerates unchanged.
- [x] The picture dates come from one `git log` over image files under `docs/`, run once per model build in `desktop/src/main/overview-service.ts`, with its time on your-trainer recorded in Notes ([[RISK-0011]]). A repository with no git history gives pictures with no date, not an error.
- [x] [[TST-0102]] checks the new fields and the pictures list on both fixtures; TST-0080 still passes.

## Steps

- [x] Port the helpers and their page tests first, then add the fields to the model, then the git read.
- [x] Refresh the fixtures only if a field must be pinned; say so in the commit.

## Notes

The cockpit's sidecar already serves files under `docs/` by path, but nothing lists the pictures with their dates and tickets, so Deck builds that list itself (DES-0005, "What building them into Deck would cost").

## What was built (2026-10-22)

- **Each ticket in the model now has `lead`, `owner` and `updated`.** `buildOverview` reads them from the note it already reads for links (`desktop/src/shared/overview-model.ts`). The owner is kept as the word the board shows ("Edwin", "Claude"), and a field the note does not give is left out rather than empty.
- **The model lists `pictures`**: every picture under the docs folder that belongs to a ticket, newest first, each with its ticket, its path under `docs/` and its date. The towers' limits (eighteen on the ring, three per ticket) are TASK-0186's to apply; the model keeps them all, so a ticket's pane can show its own.
- **Designs now stand with a feature**, by the page's rule (`designFeature`, from TASK-0179). Before this, the model gave no design a feature, so no design stood in any tower. `FEATURE_LISTS` gains `design`.
- **One copy of the helpers.** They are in `desktop/src/shared/overview-notes.ts`; `desktop/scripts/overview-towers-notes.mjs` now loads them from the build. Both design pages, DES-0005's towers and DES-0006's agent sessions, regenerate byte for byte.
- **The main process lists the pictures** (`docsImages` in `desktop/src/main/overview-service.ts`). It walks the docs folder for pictures, skipping hidden folders and templates, and dates each from one `git log`, kept per commit. A picture never committed, or in a folder with no git history, takes its file's own date. Timings are in [[RISK-0011]]: 362 ms the first time on your-trainer, 9 ms after.
- **The fixtures were given the new fields, not rebuilt**, by `desktop/scripts/overview-fixture-notes.mjs`, from the notes at each fixture's commit. The fixture README says what changed: only the new fields, and four designs per workspace that now stand with a feature.
- [[TST-0102]] is `desktop/tests/overview-towers.test.mjs`, eleven checks so far. The whole node run passes: 810 checks. One count had to change: Deck now has thirty-one features (`desktop/tests/evaluator.test.mjs`).

The model is still rebuilt only when a note changes. A picture added on its own appears at the next note change or when Deck restarts.
