---
type: reference
id: LEDGERS-README
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
tags: [releases, acceptance]
---

# Acceptance ledgers

A verdict on an acceptance walk is an event in here, not a field on the test note. The mechanism is project-os-cockpit's, and its own `docs/releases/ledgers/README.md` is the reference.

## What the platform means in this repository

**Deck is one application, not one per operating system.** There is one codebase, one renderer and one main process. A walk that shows Spread listing the same notes as the cockpit is a fact about Deck, and repeating it on Windows would tell you nothing new.

So the platform here names **the surface a verdict was earned on**, not the operating system it was typed on:

| ledger | what it holds |
| --- | --- |
| `WORKING-app.json` | the acceptance suite: claims about Deck that hold wherever it runs |
| `WORKING-<os>.json` | only the checks that are genuinely about that operating system |
| `WORKING-ipados.json` | the tablet, which is a different surface rather than a different build |

**Nothing is duplicated.** A check is walked once, against the surface it is about.

## The sharp edge

The ledger model has no field that says where a check applies, and it is deliberate: an absent verdict means owed, on every platform that has a ledger (project-os-cockpit REQ-0054). So the day this repository gains a second ledger, every check in the suite reads as owed there too, and the only way to say otherwise is to mark each one `na` by hand.

That is bearable for a handful of operating-system checks and wrong for a suite. It is filed upstream rather than worked around here.
