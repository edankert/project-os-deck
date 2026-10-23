---
type: "[[change]]"
id: CHG-20261023-Deck-Is-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag
title: "Deck is the overview: Spread, Glass and the orbit leave main and are kept under the tag original-deck-2026-10-23"
status: merged
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'Can we first of all remove or park the original deck, possibly create its own separate application to be worked on at another time or maybe never? (suggest approach)'", "Edwin 2026-10-23: 'tag and remove; park Vault too'"]
commit: ""
pr: ""
impacts: []
platforms: []
issues: []
features: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[TASK-0213]]", "[[TASK-0214]]", "[[TASK-0215]]", "[[TASK-0216]]", "[[TASK-0217]]", "[[RISK-0018]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]"]
---

# Deck is the overview, and the original Deck is kept under a tag

## Summary

**Deck now opens on the overview and shows nothing else.** There is no view switcher, no surface toggle, no Spread or Glass under the overview, no desks or scenes, and no popped-out windows. The agent pane, Needs you, the cockpit's overview panels and the shell drawer are unchanged. A tablet still gets the overview read-only.

**The original Deck is kept whole under the git tag `original-deck-2026-10-23`**, which names commit `b1bc30b`. The branch `parked/original-deck` starts at the tag and adds the orbit comparison TASK-0005 was making, which was never committed. If the original Deck is wanted again, make a new repository from the tag:

```sh
git clone --branch original-deck-2026-10-23 https://github.com/edankert/project-os-deck.git project-os-deck-original
```

Then re-adopt the parked notes there. Nothing in this repository is restored for it.

**An address from before today still opens.** An address naming a desk, a note in a view, a popped-out panel or a surface (`?surface=spread`) opens that workspace's wheel, and the status line says that part is not in this Deck.

## What changed for other code

- **The page.** `renderer.ts` went from 3,269 lines to about 280 and boots the rail, the overview, the agent pane and the shell drawer. `index.html` keeps the header, the rail, the overview's area and the status line, and `deck.css` keeps 340 of its 1,744 lines.
- **The main process.** `main.ts` went from 2,725 lines to 1,131. Deck has one kind of window. Gone: satellite windows, pop-out panels, handing a note between windows and its six IPC channels, the orbit's graph service and worker, the measuring run (`npm run measure`) and the host's extra reads.
- **The store.** It holds the workspace, the name Deck writes with, the revision and the index revisions. A state file an older Deck wrote opens with its workspace and its name, and the rest of it is passed over and not written back.
- **Removed modules.** Five renderer modules, four main-process modules and 24 shared modules. The walk driver's pointer and keyboard helpers moved to `desktop/src/main/input.ts`.
- **Tests.** Twenty-eight node suites of removed code are removed, and 46 test notes are retired, each naming ADR-0010 and the tag. Seven walks that were passing stay `passing`, marked parked, because finished tasks rest on them. The smoke run checks the overview in a real window and fails when an old address is not answered.
- **The phases.** PHASE-0001 Deck, PHASE-0002 Glass and PHASE-0003 Vault are `deferred`, with their unfinished features, tasks, issues and requirements. ADR-0010 supersedes ADR-0002, ADR-0005, ADR-0006, ADR-0007 and ADR-0008, and amends ADR-0004.

## Verification

- `npm test`: 542 checks, all passing, and `npm run typecheck` is clean.
- The container smoke passes on loopback and on the network. The loopback half makes 30 checks, and its old-address check was shown to fail when the sentence it reads is broken.
- The overview's five walks pass in the container: the overview drive, the towers, agent sessions, Needs you and the shell drawer.
- `git ls-remote --tags origin original-deck-2026-10-23` names the tag, which points at `b1bc30b`.

## Documentation Coverage (All Types Considered)

- features: new (FEAT-0036); updated (nine parked)
- requirements: updated (REQ-0001 to REQ-0006 parked)
- tasks: new (TASK-0213 to TASK-0217); updated (eight parked)
- issues: updated (four parked)
- tests: updated (46 retired, seven parked, nine updated); new (TST-0109)
- workflows: not-applicable
- decisions: new (ADR-0010); updated (five superseded, one amended)
- risks: new (RISK-0018); updated (RISK-0007 and RISK-0008 closed)
- changes: new
- snapshot: updated

## Follow-ups

- [ ] Edwin runs TST-0109: Deck opens on the overview on his own state file, and the tag runs the original Deck.
