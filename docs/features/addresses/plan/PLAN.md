---
type: "[[plan]]"
title: "Plan — every state has an address"
status: done
owner: user:edwin
created: 2026-09-06
updated: 2026-09-08
source: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
implements: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — every state has an address

## Delivery sequence

1. **[[TASK-0017-The-Address-Grammar]]** — One module formats Deck's state as an address and parses an address back into state, refusing what it cannot read.
2. **[[TASK-0018-Copy-The-Address-And-Open-One]]** — A person copies Deck's current address to the clipboard and pastes one in to go there.
3. **[[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]** — Added 2026-09-08. Four more keys, each refusing what it does not know, and panel kinds from a registry instead of a literal set.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- **What a `page` value names.** The acceptance checks page and the release page are [[PHASE-0004-Parity]]'s, and neither exists yet. TASK-0052 decides whether the key takes a free identifier refused against a registry, the way `panel` will, or something narrower. The answer must not need changing when the first page ships.
- **Nothing else open.** What was open in the original two tasks is recorded in the feature's Scope section as a decision.
