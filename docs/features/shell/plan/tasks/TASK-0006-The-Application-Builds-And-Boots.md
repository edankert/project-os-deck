---
type: "[[task]]"
id: TASK-0006
aliases: ["TASK-0006"]
title: "The application builds and boots — one compile, a main process, a preload bridge and a renderer that draws"
status: done
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

- [x] **Amended 2026-09-06:** two compiles, not one. The main process needs CommonJS and the renderer needs ES modules the browser can import, and one `tsc` cannot emit both. `npm run build` runs `tsconfig.main.json`, then `tsconfig.web.json`, then copies the assets. The point of the original wording — no bundler, one command — holds.
- [x] `npm start` opens one window with Deck's own markup and no framework.
- [x] `npm run typecheck` passes with `strict` on, for both compiles.
- [x] `node_modules/` and `dist/` are ignored by git, and `package-lock.json` is committed.

## Steps

- [x] Write `desktop/package.json` with the build, start, typecheck and test scripts.
- [x] Write `desktop/tsconfig.json` targeting Node for the main process and the DOM for the renderer, both strict.
- [x] Write the main process entry that creates the first window, and the preload that exposes the bridge object.
- [x] Write the renderer entry, its HTML and its stylesheet.
- [x] Add the asset copy step so the HTML and CSS land in `dist/`.

## Notes

The cockpit's shell is the model for the build: one `tsc`, a small copy script, no bundler. Deck starts its own renderer rather than reusing the cockpit's, which is the rule Part 8 of the architecture note settled.
