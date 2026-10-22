---
type: "[[task]]"
id: TASK-0181
title: "The overview model carries each ticket's first paragraph, owner and last update, and Deck lists the pictures beside the notes with their dates and tickets"
status: doing
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

- [ ] `Ticket` in `desktop/src/shared/overview-types.ts` has `lead` (the first paragraph, as `leadOf` makes it), `owner` and `updated`, filled by `buildOverview` for both workspaces.
- [ ] The model has `pictures`: each one's path under `docs/`, its last commit date and the ticket it belongs to, chosen by `evidenceFrom` and `designFeature` exactly as on the page. A picture changed since its last commit is listed with today's file.
- [ ] `leadOf`, `evidenceFrom`, `designFeature`, `weeksOf` and `lastDates` live in `desktop/src/shared/` as TypeScript. `desktop/scripts/overview-towers-notes.mjs` imports them from the build instead of keeping its own copy, and the page regenerates unchanged.
- [ ] The picture dates come from one `git log` over image files under `docs/`, run once per model build in `desktop/src/main/overview-service.ts`, with its time on your-trainer recorded in Notes ([[RISK-0011]]). A repository with no git history gives pictures with no date, not an error.
- [ ] [[TST-0102]] checks the new fields and the pictures list on both fixtures; TST-0080 still passes.

## Steps

- [ ] Port the helpers and their page tests first, then add the fields to the model, then the git read.
- [ ] Refresh the fixtures only if a field must be pinned; say so in the commit.

## Notes

The cockpit's sidecar already serves files under `docs/` by path, but nothing lists the pictures with their dates and tickets, so Deck builds that list itself (DES-0005, "What building them into Deck would cost").
