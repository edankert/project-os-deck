---
type: "[[issue]]"
id: ISS-0008
aliases: ["ISS-0008"]
title: "Nothing in continuous integration exercises the renderer, so four of Spread's tasks make claims that only a run on Edwin's machine can check"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["Independent review of the PHASE-0001 Spread work, 2026-09-07"]
severity: medium
component: tests
parent: ""
related: ["[[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]", "[[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]", "[[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]"]
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

## The premise changed on 2026-09-09, noted 2026-09-10

**The smoke run is in continuous integration now.** `.github/workflows/deck-smoke.yml` installs Electron, a virtual display and the sidecar from its sibling checkout, runs `npm run smoke`, and went green on `main` on 2026-09-09 after its first run found two things a developer's machine cannot ([[ISS-0057-Both-CI-Jobs-Failed-On-Their-First-Run]]). So the sentence above, "the smoke run is not in continuous integration", is no longer true. What is still true is that the smoke is the renderer's only gate, that it drives the renderer through a real window rather than through unit checks, and that a check it does not make is a check nothing makes. [[REFERENCE-GLASS-PHASE-REVIEW]] asked grooming to re-read this note against that: the three ways out listed above are now a choice about whether the smoke alone is enough for a phase whose every task is renderer work, not about getting the renderer into CI at all.

## Measured, 2026-09-07: reverting a shipped fix is invisible to every check

The close-out review put a number on this note ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]). It replaced the clamp call in the built renderer with a plain assignment — undoing one of the fixes [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] recorded — and ran the suites without rebuilding:

```
ℹ tests 153
ℹ pass 153
ℹ fail 0
```

The same holds for [[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]'s drag fix, and for [[ISS-0006-A-Clean-Quit-Forgets-Every-Popped-Out-Panel]]'s `!shutDown` guard, which no suite can even import because `main/main.js` needs the Electron runtime.

**Two more gaps of the same kind, found the same day.** `PanelBook` has no checks at all, and the smoke run never restarts the application — it calls `webContents.reload()` — so the phase's second exit criterion rests on Edwin's walk and on nothing automated. And the reader assigns the sidecar's HTML with `innerHTML` in a page holding the preload bridge; the Content-Security-Policy meta tag in `index.html` is what stops that being exploitable, and nothing asserts the tag is there, so deleting it would reopen the hole with every check green. That last one matters most in [[PHASE-0003-Vault]], where the note content is not necessarily the reader's own.

**A guard that does hold**, checked the same way: removing the resolve coalescing makes `desktop/tests/sidecar-retry.test.mjs:142` fail with the right message. One caveat — the mutated run then hung for sixteen minutes against a normal seven seconds, so in continuous integration that mutation would show up as a job timeout rather than as the named failure.

## Why this note now says PHASE-0002 rather than PHASE-0001

**It moved on 2026-09-07, when [[PHASE-0001-Deck]] closed, and the move changes nothing about the finding.** A phase cannot reach `done` while a note naming it in `phase:` is still unresolved (`tools/instructions/STATUSES.md`, `[[phase]]`), and this one is at `triage` on purpose: the three ways out cost different amounts and choosing between them is Edwin's. Leaving it pointed at a closed phase is the exact failure that rule exists to catch.

[[PHASE-0002-Glass]] is where it goes because Glass is a new renderer view — a field, a band function, a turn, a lifted note — and every line of that lives in the layer no automated suite loads. The gap this note describes gets wider there, not narrower. It stays at `triage` and grooming decides.

**If it belongs somewhere else, it moves again.** [[PHASE-0004-Parity]] is the other candidate, on the argument that spending on test machinery is a parity concern rather than a Glass one.
