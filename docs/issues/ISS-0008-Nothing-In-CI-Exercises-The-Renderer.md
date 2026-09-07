---
type: "[[issue]]"
id: ISS-0008
aliases: ["ISS-0008"]
title: "Nothing in continuous integration exercises the renderer, so four of Spread's tasks make claims that only a run on Edwin's machine can check"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review of the PHASE-0001 Spread work, 2026-09-07"]
severity: medium
component: tests
parent: ""
related: ["[[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]", "[[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: []
---

# Nothing in continuous integration exercises the renderer

## Problem

**No automated suite loads anything under `desktop/src/renderer/`.** Every suite imports from `shared/` or `main/`, and the one suite that mentions the renderer reads the built stylesheet as text. The renderer is where the drag, the desk painting, the counts, the panels and the controls live, and four of the six tasks added on 2026-09-07 make claims about it.

The only thing that drives it is the Electron smoke run, and that is not in continuous integration: the workflow runs each `TST-*` command, and the smoke run is not one of them, because it needs Electron's binary and CI skips that download on purpose.

**This is not theoretical.** Three of the six defects the independent review found on 2026-09-07 lived in exactly that gap, and one of them, an unclamped restored position, had a check that passed while the application never called the function it was checking ([[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]).

## Why it is at triage rather than fixed

There are three ways out and they are not the same size. A document stand-in such as jsdom is a new dependency for a project that has none. A headless Electron job in continuous integration downloads a hundred megabytes on every run. Moving more logic out of the renderer into `shared/` is what was already done for the rows, the search, the faces and the desk, and it has a floor: the drag, the pool and the painting cannot leave.

Which of those is worth it is a decision about how much this project spends on its own machinery, and that is Edwin's. What is not in question is the finding itself.

## What is true today

The smoke run does now drive the renderer hard, on a real Electron window against a real sidecar: it clicks a row onto the desk, drags a card and finds it where it was left after a reload, empties the list with a search and restores it, checks the fold, the counts and the headings, and opens all three panels. It is one command, `npm run smoke`, and a person has to run it.
