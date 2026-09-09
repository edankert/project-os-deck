---
type: "[[issue]]"
id: ISS-0032
aliases: ["ISS-0032"]
title: "The guards that keep the write bridge on Deck's own origin are checked by searching the built file for three strings, so inverting the condition or deleting the refusal leaves every check passing"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The re-review of PHASE-0001, 2026-09-09, whose findings are in the second `## Independent review` section of each feature note"]
severity: high
component: tests
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[ISS-0029-The-Preload-Bridge-Follows-The-Window-Anywhere-It-Navigates]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# A search for `will-navigate` does not know which way round the condition is

## Problem

[[ISS-0029-The-Preload-Bridge-Follows-The-Window-Anywhere-It-Navigates]] added two guards and one check: a search of the built `main.js` for `will-navigate`, `setWindowOpenHandler` and `action: 'deny'`. **All 307 checks pass after any of these:**

- inverting the `will-navigate` condition, so a foreign origin is allowed and Deck's own is blocked
- replacing `event.preventDefault()` with a no-operation
- returning `{ action: 'allow' }` with `action: 'deny'` left behind in a comment

`desktop/tests/helpers.mjs` opens by warning against exactly this shape: "A guard shaped like `assert source.includes("GET")` survives the rename that breaks the behaviour it claims to protect." It survives more than a rename.

## And the refusal is wider than it should be

`shell.openExternal(url)` is called for ANY url that is not Deck's origin, including `file:` — which the comment above it names as something that reaches this code. Handing an arbitrary `file:` URL to the operating system's opener is not what "open a link in the person's browser" means.

## Next Actions
- [ ] Move the decision out of the Electron wiring so it can be driven, and drive the wiring itself in the smoke run
- [ ] Open only what a browser should open, and refuse the rest by name

## Fixed, 2026-09-09

**The decision left the wiring.** `navigationFor(host, url)` in `desktop/src/shared/origin.ts` returns one of three answers, and it can be driven without opening a window. A page Deck serves is `follow`. An ordinary web page is `open-outside`, in the person's own browser, because refusing it silently would make a link in a note look broken. **Everything else is `refuse`** — `file:`, `javascript:`, `data:`, a custom scheme, a string that is not a URL — which is the second half of this issue: handing an arbitrary `file:` URL to the operating system's opener is not what "open a link in the browser" means.

**And the wiring is driven, in the smoke run, against a real page.** A window of its own is opened; a page in it sets `location.href` to an external URL and then to a `file:` URL; the window is asked where it ended up, and the seam that hands a link outward is asked what it received. Then a page Deck *does* serve is followed, so the guard is a rule rather than a wall. A window of its own because a navigation must not disturb the window the rest of the run is using.

**The grep is gone.** It searched the built file for `will-navigate`, `setWindowOpenHandler` and `action: 'deny'`, and survived inverting the condition, replacing `preventDefault` with a no-operation, and returning `allow` with `deny` left in a comment. `desktop/tests/helpers.mjs` opens by warning against exactly that shape, and this is what it was warning about.

**Evidence.** Reverting the condition fails 1 check; handing a `file:` URL outward fails 1. Neither failed anything before.
