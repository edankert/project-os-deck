---
type: "[[task]]"
id: TASK-0057
aliases: ["TASK-0057"]
title: "The served page follows the store: Deck's host gains two read routes, a tablet shows the desk the Mac holds and follows the shell's focus when asked, and still cannot send anything back"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-11
source: ["[[FEAT-0014-The-Hands]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
parent: "FEAT-0014"
effort: ""
due: ""
depends: []
blocks: ["TASK-0055"]
related: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TASK-0022-Capability-Is-Detected-Not-Assumed]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: ["[[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]]"]
---

# The served page follows the store

## Objective

A tablet served by Deck's host shows the desk the Mac holds, sees a note lifted on the Mac within a second, and follows the shell's focused note when a person asks it to. It does this by reading, and it can still send nothing back.

## Detail

**Today the served page never sees the store.** Without the preload bridge, `Host.start()` in `desktop/src/renderer/host-bridge.ts` fetches `/deck/capabilities` and keeps a fresh local state from `initialState()`. Every desk, every focused note and every view choice on the tablet is the tablet's own, and a note lifted on the Mac is invisible there. The review of 2026-09-10 found this by reading the code; no walk had asked the question, because [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] checks that the tablet reads notes and refuses writes, which it does.

**Two read routes fix it, and neither touches [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]].** `GET /deck/state` answers with the store's state, minus the parts only the shell can use, which the capability set already names. `GET /deck/events` is a server-sent event stream that pushes the state, or the changed part of it, whenever the store broadcasts. Both answer `GET` and `HEAD` and answer 405 to everything else, exactly as every other route on Deck's host does, and `npm run smoke:lan` asserts that from the network address. Reading state is a read; the tablet still cannot dispatch, and [[ADR-0003-Deck-Writes-Through-The-Shell]]'s rule that the tablet does not write is untouched.

**What the tablet shares and what stays its own.** The desk is per workspace and is shared: the tablet shows the workspace's desk and every held note. The pulled and pushed sets of [[TASK-0053-Pull-Forward-And-Push-Behind]] are shared too, because they are in the store. The tablet's own view and surface choice stay local, so a person can browse Features on the tablet while the Mac shows Issues. A **follow** toggle on the served page makes the tablet follow the shell's focused note, which is what the cockpit's Following toggle did and the adoption table lists; the toggle is off by default, and the plan records that the default flips if the walk finds people expect a mirror.

**What is on the network.** The state carries workspace ids, desk contents, focused notes and window roles, none of which is more than the notes already served to the same address. The served state is filtered through the same allow-list of workspaces that `/deck/workspaces` uses, so a workspace with no sidecar answering is not described.

## Acceptance

- `GET /deck/state` on Deck's host returns the store's state without the shell-only parts, and `GET /deck/events` streams a change within a second of a store broadcast.
- `POST`, `PUT`, `DELETE`, `PATCH` and `OPTIONS` on both routes are refused 405, asserted over real HTTP from the network address in the smoke run.
- A served page subscribes on start, and a note lifted on the Mac is on the tablet's desk within a second, with no reload.
- The tablet's view and surface choice are local and unchanged by a view switch on the Mac.
- With follow on, the tablet shows the note the shell focuses; with follow off, it does not.
- The capability set of a served page still reads `write: false`, and the page still offers no verb.
- The state a served page receives describes only workspaces with a sidecar answering.

## Steps

- [x] Add the two routes to `desktop/src/main/host.ts` with the state filter and the 405 rule; add them to the host suite and to `smoke:lan`. Evidence: `served-state.test.mjs` 10 of 10; `recordFromTheNetwork` asserts five methods on each route.
- [x] Subscribe in `Host.start()` when there is no bridge, and replace the local state with what arrives. Evidence: the smoke run's served window received a lifted note within a second.
- [x] Add the follow toggle to the served page, off by default. Evidence: `#follow`, hidden in the shell, `aria-pressed` false at start.
- [x] Move the adoption table's `shell.live` and Following rows as this lands, with the date. Evidence: `docs/reference/cockpit-adoption.md`, 2026-09-10.
- [x] Write the automated test notes and link them from `tests:`. Evidence: [[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]].

## Notes

This extends [[FEAT-0008-One-Renderer-Two-Hosts]] and could have reopened it. It is placed here because the throw is what needs it and because it is the first task that can start in this phase before the field is drawn.

## Outcome

**Done 2026-09-10.** The served state is built by `servedState` in `desktop/src/shared/served-state.ts`: the store's state without the writing name, and with every part keyed by workspace kept only for a workspace whose sidecar answers. `GET /deck/state` answers with it and `GET /deck/events` streams it whole on every broadcast, rather than a patch, because a page that missed one event must not stay wrong. A served page merges it with its own choices in `mergeServed`: the workspace, view, surface, search, filters and folds stay the tablet's, and so does the note unless Follow the Mac is on.

**A tablet no longer changes the desk.** A row clicked on a served page opens the note and leaves the desk alone, and the served page applies only the actions in `TABLET_LOCAL_ACTIONS`. Before this task a tablet put cards on a desk of its own that nobody else saw; after it, the desk it shows is the Mac's, so a change made there would be overwritten by the next broadcast, or would be a tablet that steers.

**The store's new shape landed with this task**, because the host has to describe it: `surface`, and a `session` part holding the pulled and pushed sets that the persister drops. Their actions belong to [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] and [[TASK-0053-Pull-Forward-And-Push-Behind]].

**Amended 2026-09-11 ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]).** Edwin asked that day for a desk for each view, with some notes kept on every view. "The desk is per workspace and is shared" now reads: the tablet shows the desk of the Mac's current view, whatever view it is browsing itself, and follows it when the Mac switches view. A note marked "on every view" is what still crosses views, and a state file written before the change reads every held note as on every view, so nothing on screen changed on the day it landed.
