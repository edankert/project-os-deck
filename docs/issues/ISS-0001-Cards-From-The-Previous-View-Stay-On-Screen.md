---
type: "[[issue]]"
id: ISS-0001
aliases: ["ISS-0001"]
title: "Cards from the previous view stay on screen — the pool hides a spare card with the `hidden` attribute, and the stylesheet's own `display: flex` overrides it, so switching to a shorter view repaints its cards over the top of the old ones"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["Edwin, 2026-09-06, walking TST-0008: 'In general it looks like only the first couple of items cards get overwritten when switching views for instance test overwrites the first 13, publication, issues and library overwrite nothing, intent 15, overview 7 ...'"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]", "[[TASK-0015-Notes-Become-Cards]]"]
tests: ["[[TST-0014-A-Hidden-Card-Leaves-The-Screen]]"]
---

# Cards from the previous view stay on screen

## Problem

**Switching view repaints as many cards as the new view has and leaves the rest of the old view showing.** Deck then displays a mixture of two views at once, with no sign that half of what you are reading belongs to somewhere else.

Edwin's report names the counts, and they are an exact fingerprint of the cause. Measured against this repository on 2026-09-06, through Deck's own proxy:

| view | cards it has | what happens on arriving from Features, which has 30 |
| --- | --- | --- |
| Tests | 13 | the first 13 are replaced, 17 stale cards remain |
| Intent | 15 | the first 15 are replaced, 15 remain |
| Overview | 7 | the first 7 are replaced, 23 remain |
| Issues, Publication, Library | 0 | nothing changes at all |

## Cause

`CardPool.render` paints one element per card and hides the spares:

```
element.hidden = true;
```

`desktop/src/renderer/deck.css` then says, for every card:

```
.card { ... display: flex; ... }
```

An author rule beats the browser's own `[hidden] { display: none }`, so the attribute is set, the element is correctly marked hidden for anything reading the DOM, and it stays on screen. Nothing in the renderer is wrong: the pool's bookkeeping is right and only the paint is.

## Why no test caught it

Every check in the seven suites runs without a browser. They test the card model, the desk reconciliation and the pool's arithmetic, and not one of them renders anything, so a rule that makes an element visible when it should not be is outside all of them. The smoke run does open the real application, and its card counts were read with `querySelectorAll('.card:not([hidden])')` — which returns the right number while the wrong number is on the screen.

A test for this has to ask what is *displayed*, not what is marked.

## Fix

`[hidden] { display: none !important; }`, once, near the top of the stylesheet. The `!important` is the point rather than a shortcut: it survives the next rule somebody adds without thinking about this one.

## What now guards it

[[TST-0014-A-Hidden-Card-Leaves-The-Screen]] reads the built stylesheet and refuses a rule that could outrank the guard. The smoke run was also changed, because its old count was part of the reason this survived: it asked how many cards were *marked* visible, and now it asks how many the browser actually *displays*, and compares that with the number the view claims.

Both were checked by removing the fix on 2026-09-06. The suite fails on its first assertion; the smoke run reports `1 marked, 30 shown`, which is the defect as reported.
