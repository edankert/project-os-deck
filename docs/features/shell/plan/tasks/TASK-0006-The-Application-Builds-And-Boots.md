---
type: "[[task]]"
id: TASK-0006
aliases: ["TASK-0006"]
title: "The application builds and boots — one compile, a main process, a preload bridge and a renderer that draws"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
parent: "FEAT-0002"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
tests: []
---

# The application builds and boots

## Objective

`npm start` in `desktop/` compiles the TypeScript once and opens a Deck window that draws its own markup. Nothing talks to a sidecar yet.

## Definition of Done

- [ ] A single `tsc` compile produces `dist/main.js`, `dist/preload.js` and the renderer modules, and the assets are copied beside them.
- [ ] `npm start` opens one window with Deck's own markup and no framework.
- [ ] `npm run typecheck` passes with `strict` on.
- [ ] `node_modules/` and `dist/` are ignored by git, and `package-lock.json` is committed.

## Steps

- [ ] Write `desktop/package.json` with the build, start, typecheck and test scripts.
- [ ] Write `desktop/tsconfig.json` targeting Node for the main process and the DOM for the renderer, both strict.
- [ ] Write the main process entry that creates the first window, and the preload that exposes the bridge object.
- [ ] Write the renderer entry, its HTML and its stylesheet.
- [ ] Add the asset copy step so the HTML and CSS land in `dist/`.

## Notes

The cockpit's shell is the model for the build: one `tsc`, a small copy script, no bundler. Deck starts its own renderer rather than reusing the cockpit's, which is the rule Part 8 of the architecture note settled.
