---
type: "[[adr]]"
id: ADR-0010
aliases: ["ADR-0010"]
title: "Deck is the overview: Spread, Glass, the orbit and the Vault phase leave main, and the original Deck is kept under the tag original-deck-2026-10-23"
status: accepted
owner: user:edwin
created: 2026-10-23
updated: 2026-10-23
source:
  - "Edwin 2026-10-23: 'Can we first of all remove or park the original deck, possibly create its own separate application to be worked on at another time or maybe never? (suggest approach)'"
  - "Edwin 2026-10-23, answering the proposal: 'tag and remove; park Vault too (as far as I know the other sessions are stopped??? otherwise I think it is save to stop them)'"
decision: "Deck is the overview: the wheel and the towers, agent sessions, Needs you, the cockpit's overview panels and the shell drawer. Spread, Glass and the orbit are removed from main. Today's main is frozen first under the annotated tag original-deck-2026-10-23. PHASE-0001 Deck, PHASE-0002 Glass and PHASE-0003 Vault are deferred, with their unfinished features, tasks, issues and requirements. If the original Deck is ever revived, a new repository is made from the tag."
context: "About half of Deck's code, and about half of every build, test run and review, served views nobody was working on. Edwin set Glass aside on 2026-10-08 to get the overview right first, and its code still cost: on 2026-10-22 the Glass smoke checks failed because a header button for the shell drawer made Glass's window shorter (TASK-0212), and finding that took a bisect in a clone."
alternatives:
  - "Keep the code and hide Spread and Glass behind a setting. Nothing is lost, but every build, test run and review still carries them, which is the cost this decision removes."
  - "Make the original Deck its own application now, in a second repository. That is work for views nobody is working on, and Edwin said it may never be wanted."
  - "Keep the code on a branch only, with no tag. A branch moves when someone commits to it; a tag names one commit for good."
consequences:
  - "Deck opens on the overview and nothing else. There is no view switcher, no Spread or Glass under the overview, no desks, scenes, pop-out panels or windows that follow another."
  - "The main process loses the satellite windows and pop-out panels, throwing and handing a note between windows, the orbit worker and its layout, the measuring run and the Glass smoke checks, and the store state only they used."
  - "Deck's own index of the workspace's notes stays: the overview reads it. Deck's HTTP host stays and still serves a tablet read-only (ADR-0001). Writes still go through the shell (ADR-0003). Agent sessions stay (ADR-0009)."
  - "The view description language and the view provider leave main with Spread and Glass: nothing on the overview reads them, and their next user would have been the Vault phase, which is parked too."
  - "Test notes whose subject is removed become retired when the code goes. The finished notes of the parked phases stay as they are, as the record of what was built."
  - "The local validator reads the newest tag as the last release, so it now hides findings about notes that were already finished at this tag. CI clones without tags and still shows them."
supersedes: ["[[ADR-0002-Glass-Is-The-Main-View]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]"]
superseded: ""
amends: "[[ADR-0004-A-View-Is-A-Description]]"
related: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]", "[[PHASE-0005-Overview]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[PHASE-0004-Parity]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[TASK-0212]]"]
---

# Deck is the overview, and the original Deck is kept under a tag

## Context

**Deck had two applications in one repository, and only one of them was being worked on.** The first was the original Deck: Spread (notes as cards on desks across windows, pop-out panels, scenes, a note handed between windows), Glass (the field where depth carries priority, with bands, hands, zoom, focus, collections and arrangements, and evidence beside a claim) and the orbit. The second is the overview: the wheel of phases and the towers (PHASE-0005), agent sessions, Needs you, the cockpit's overview panels and the shell drawer (PHASE-0004).

Edwin set Glass aside on 2026-10-08 to get the overview right first. Since then every build, test run and review has still compiled, run and read the original Deck's code, which is about half of it. On 2026-10-22 the Glass smoke checks failed because a Shells button in the header made the header wrap, so Glass's window got shorter ([[TASK-0212]]). Nobody was working on Glass, and finding the cause took a bisect in a clone.

## Options

1. **Tag and remove.** Freeze today's main under a tag, then take the original Deck out of main. Nothing is lost, and main carries only the overview. Reviving the original Deck costs a new repository made from the tag.
2. **Hide behind a setting.** Keep the code and switch Spread and Glass off. Nothing is lost, but every build, test and review still pays for them.
3. **A separate application now.** Move the original Deck into its own repository today. That is work spent on views nobody is working on.
4. **A branch with no tag.** Cheaper than a tag by nothing, and a branch moves when someone commits to it.

## Decision

**Option 1.** Edwin chose it on 2026-10-23: "tag and remove; park Vault too".

1. **The tag.** Today's main, commit `b1bc30b`, is frozen under the annotated tag `original-deck-2026-10-23`. The tag is pushed to the public repository. Work that was never committed when the original Deck stopped, TASK-0005's orbit comparison, is committed on the branch `parked/original-deck`, which starts at the tag. Nothing on main depends on that branch.
2. **What stays on main.** The overview, the agent sessions, Needs you, the cockpit's overview panels and the shell drawer. Under them stay the parts they run on: Deck's own index of the notes, the store, the sidecar client, the HTTP host that serves a tablet read-only ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]), writes through the shell ([[ADR-0003-Deck-Writes-Through-The-Shell]]), and addresses for the overview's screens.
3. **What leaves main.** Spread, Glass and the orbit, with everything only they use: the view switcher and the surface toggle, desks and scenes, pop-out panels and satellite windows, throwing and handing notes between windows, the orbit worker, the measuring run and the Glass smoke checks. The view description language and the view provider leave too: nothing on the overview reads them.
4. **The phases.** PHASE-0001 Deck, PHASE-0002 Glass and PHASE-0003 Vault are `deferred`. Their unfinished features, tasks, issues and requirements are `deferred` too, each naming the tag. Their finished notes stay as they are: they are the record of what was built.
5. **Reviving it.** If the original Deck is ever wanted again, a new repository is made from the tag, and the deferred notes there are re-adopted. Nothing in this repository is restored for it.

### What happens to the earlier decisions

| ADR | About | Now |
| --- | --- | --- |
| [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] | Deck's own host, read-only for a tablet | Stands. The overview is served by it. |
| [[ADR-0002-Glass-Is-The-Main-View]] | Glass opens first; Spread beside it | Superseded by this decision: the overview is the only view. |
| [[ADR-0003-Deck-Writes-Through-The-Shell]] | Writes go through the shell, never the served host | Stands. Caught up and the overview's accept flows write this way. |
| [[ADR-0004-A-View-Is-A-Description]] | Views as documents over Deck's own index | Amended. Deck's own index stays. The description language and the view provider leave main with Spread and Glass. |
| [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]] | Glass's four bands | Superseded: about removed code. It was never accepted. |
| [[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]] | Collections and documents on the Glass desk | Superseded: about removed code. |
| [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]] | Scenes and handoff between windows | Superseded: about removed code. It was never accepted. |
| [[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]] | Evidence beside a claim in Glass | Superseded: about removed code. It was never accepted. |
| [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]] | Agent sessions and the shell drawer | Stands. |

"Superseded" here means the decision no longer describes main. Each one still describes the code at the tag, and a repository revived from the tag starts with them as they were.

## Alternatives

- Hide Spread and Glass behind a setting (option 2).
- A separate application now (option 3).
- A branch with no tag (option 4).

## Consequences

- Deck opens on the overview and on nothing else. [[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]] does the removal.
- [[PHASE-0004-Parity]] depended on Glass for the console's place in the field. The shell drawer replaced that console, so the dependency is dropped.
- [[PHASE-0005-Overview]] depended on PHASE-0001 for the store, the index and the host. Those stay on main and are finished, so the dependency is met even though the phase is deferred.
- The local validator reads the newest tag as the last release when no release note exists. It now hides findings about notes already finished at this tag. CI clones without tags and still shows them.
