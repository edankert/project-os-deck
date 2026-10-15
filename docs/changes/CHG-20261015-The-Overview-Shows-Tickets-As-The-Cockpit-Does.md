---
type: "[[change]]"
id: CHG-20261015-The-Overview-Shows-Tickets-As-The-Cockpit-Does
title: "The overview shows tickets as the cockpit does: its colours and marks, rows on a tilted plane, a ticket's text, and back and forward"
status: merged
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15, after running the overview: the right-hand pane should show tickets as tickets, in the cockpit's list; the cockpit's colours and status marks throughout; a phase's tickets more 3D; a ticket with its id, title and text and its linked tickets; what the 'solar systems' are; a back and forward button."]
commit: "f003195, 1ba2ff8, 6f2cee3, c23ee07, 1476b06, 74ba02f, a2e2f91"
pr: ""
impacts: []
platforms: []
issues: []
features: ["[[FEAT-0025]]", "[[FEAT-0027]]", "[[FEAT-0028]]"]
reviewed_by: "system:codex"
review_date: "2026-10-15"
review_verdict: "changes-requested"
review_response: "Two rounds. Round one found ten findings, round two two more and two partly fixed; every one is fixed and recorded in FEAT-0025, FEAT-0027 and FEAT-0028, with Codex's reproducers passing against main."
related: ["[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0150]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[CHG-20261015-Use-cockpit-fills-and-attention-flags-in-the-overview]]", "[[CHG-20261015-Show-labelled-gate-chips-and-cockpit-result-marks]]"]
---

# The overview shows tickets as the cockpit does

## Summary

**Every overview screen now draws a ticket the way the cockpit's overview page does.** Its colour is its type, in the cockpit's own colours. How full its mark is says its state: filled is done, hollow not started, inverted and pulsing in progress, inverted and still "complete, not proven", a slit "resolved, nothing delivered", a strike "parked", and a red corner dot "needs you". The fill and the dot come from the cockpit's own rules, which Codex ported into the model ([[CHG-20261015-Use-cockpit-fills-and-attention-flags-in-the-overview]]).

- **A phase (S2)** lists its tickets as the cockpit's rows on a plane tilted away in real depth: what needs you in front, in progress and open behind it, closed work folded at the back to a strip with its count.
- **A ticket (S3)** shows its square, id and whole title, its stages, its full text as the reader renders it, and every ticket it links to or that links to it as rows. A feature's gate is five labelled chips with the same evidence S7 reads ([[CHG-20261015-Show-labelled-gate-chips-and-cockpit-result-marks]]). The five round lamps Edwin called "solar systems" are gone.
- **Back and forward**: ← and → beside the Deck name, ⌘[ and ⌘], and the mouse's own buttons retrace the screens visited. Escape still goes up a level.
- **The state colours are kept to compare**: on the wheel and the re-phase screen, ◐ or C redraws them in DES-0004's state colours, and the address keeps the choice as `colour=state`.

## What changed for other code

- **The address grammar has a new optional key, `colour`.** Its only value is `state`, and it is refused on an address that names no overview page or flow. Every existing address reads and writes as before.
- **Deck's records route answers `?id=`**, so the ticket screen can find a note's path to ask the sidecar for its text. It narrows the existing answer; it reads nothing new.
- **A scene can hold a `panel`**: rows of tickets or a note's text, built as HTML in Deck and drawn flat as SVG for a plate. Its text is not counted toward the sixty words at rest, and every ticket it lists must be in the list twin.
- **When Deck follows an address that names an overview screen in another workspace, it no longer draws that workspace's wheel first.**

## Verification

The node suites pass (775 or more tests). The window run, [[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]], passed on Deck and on your-trainer on 2026-10-15: the plane is tilted with no row outside it on each workspace's largest phase, the ticket's text arrives from the sidecar, and back and forward land where the history says. Edwin's acceptance tests TST-0091 and TST-0092 are not yet run.
