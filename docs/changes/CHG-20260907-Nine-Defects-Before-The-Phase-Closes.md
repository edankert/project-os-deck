---
type: "[[change]]"
id: CHG-20260907-Nine-Defects-Before-The-Phase-Closes
aliases: ["CHG-20260907-Nine-Defects-Before-The-Phase-Closes"]
title: "Nine defects fixed at PHASE-0001's close-out, of which the worst killed a sidecar a tablet was waiting for and the quietest let a filter hide a whole view with no control to say so"
status: merged
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]", "Edwin, 2026-09-07: 'fix them now and re-review the four features'"]
commit: ""
pr: ""
impacts: ["desktop/src/main/", "desktop/src/renderer/", "desktop/src/shared/", "desktop/tests/"]
issues: ["[[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]", "[[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]]", "[[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]", "[[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]", "[[ISS-0015-Four-Smaller-Things-The-Close-Out-Review-Found]]", "[[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[ISS-0019-Pasting-A-Panel-Address-Collapses-The-Focus-Window]]", "[[ISS-0020-A-Promoted-Satellite-Draws-No-Navigation]]"]
features: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]", "[[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---

# Nine defects before the phase closes

## Summary

**Deck no longer kills the sidecar it is waiting for, quitting actually waits for the sidecars to go, and a filter can no longer hide a whole view without saying so.** A clean-context review at PHASE-0001's close-out found five defects and four leads. Edwin asked for all of them fixed rather than carried into the next phase, and this is that work.

Nothing here is new capability. Every change is something Deck already claimed to do and did not.

## Impact

- **A tablet can open a big workspace.** Deck registers a sidecar's record before waiting for it to answer, on purpose, so that a quit mid-wait still kills the child. The cost was that a read arriving during that wait — up to forty-five seconds while a large workspace indexes — was refused by a port nobody was listening on, and Deck read that refusal as a death and stopped the sidecar. The shell could not reach it, because it waits before reading; a page Deck serves has no such gate, and that is the tablet. A record now carries whether it is ready, `forget` leaves a starting sidecar alone, and a read during the wait is answered `503 the sidecar for that workspace is still starting` instead of killing it ([[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]).
- **Quitting Deck waits for the sidecars Deck started, and kills what will not go — on every path that can wait.** Edwin passed [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] on 2026-09-07 with the remark "I am not sure if it doesn't leave anything running when I quit???", and he was right to doubt it: the escalation from SIGTERM to SIGKILL was a three-second timer that could not fire once the main process had gone. The quit is now held open until every child has exited or the grace runs out. The check spawns real processes, one that takes SIGTERM and one that ignores it, and asserts the second one dies of SIGKILL.

  That took two attempts. The first held the window quit open and left two ways round it: a child spawned by the port-collision retry *after* the quit had already stopped everything was held by nobody, and a quit that came from a signal called `app.exit`, which never raises `before-quit`, so it never waited at all — `kill -TERM` on a terminal-launched Deck still left a sidecar. Both are fixed and both are in [[ISS-0021-A-Sidecar-Started-After-The-Quit-Began-Outlives-Deck]]. `process.once('exit')` still cannot wait and never will; it stays the last-resort net.
- **A tablet is told why it is waiting.** Deck's host answered `503 the sidecar for that workspace is still starting` and the client threw away the sentence, showing `the sidecar answered 503`. A short body is carried into the error now.
- **A filter belongs to the view it was set on.** Filter Issues down to one type, switch to Features, and the filter used to still be applied while both dropdowns said "any" — because the new view's select has no option matching the stored value, so the DOM ignores the assignment. The navigator read "0 of 30" with nothing on screen to explain it. Filters now clear with the view and with the workspace. The search box does not, which is deliberate: it is text a person typed and can see ([[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]]).
- **Deck's host refuses a traversal in a query.** `/api/render` takes the file it renders as a query argument, and the allow-list only read the path — so an allowed path carrying any target at all was forwarded verbatim from the local network, and what refused it was a function in the cockpit repository. Not exploitable, because that function does refuse it, but Deck's second lock did not cover the shape. Every query value is now checked for a way out, once as decoded and once a decoding further. A note called `50% off.md` is still readable ([[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]], closing [[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]).
- **A restored card stays where the desk put it.** A card saved far down a large monitor's desk was pulled onto a laptop screen and then moved about 56 pixels further down on every repaint — every fold, every search keystroke, every change from another window — until it was off the bottom again. The clamp was measuring its own last output. Two jobs now have two bounds: a dragged card is clamped against the desk's content, a restored one against the desk's own extent, which is the window unioned with every saved position ([[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]]).

  **The first answer to this was wrong and never shipped.** Clamping every card to the window is stable and squeezes the desk flat: forty cards on a 900x600 desk drew 24 distinct positions, sixteen of them on top of another card. A review caught it before the change landed. Both wrong answers are now pinned by checks.
- **A popped-out panel is not narrowed by another window's search box.** Typing in the main window emptied a strip on a second monitor, which draws no search box of its own to explain it. Part of [[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]].
- **The remove control is gone from the Needs-you strip**, which [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] said was done and was not: the click was refused and the × was still drawn, so a person was offered an action that did nothing ([[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]).
- **A popped-out panel stays on what it was opened on.** Its thirty-second refresh took the view from the shared store, so the strip followed the main window's view change half a minute later with no visible cause ([[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]).
- **Pasting a satellite's address into the main window no longer collapses it.** A panel belongs to a popped-out window; the main window follows the rest of the address and says it left the panel behind ([[ISS-0019-Pasting-A-Panel-Address-Collapses-The-Focus-Window]]).
- **Closing the main window promotes a satellite that can actually navigate.** It was being called the focus window while still drawing one panel, no view buttons and no workspace rail, because the renderer asks its role once at boot and nothing pushed the change. It is reloaded now; the state lives in the main process, so only the pinning is dropped ([[ISS-0020-A-Promoted-Satellite-Draws-No-Navigation]]).
- **Four smaller things**, in [[ISS-0015-Four-Smaller-Things-The-Close-Out-Review-Found]]: a check that asserted on a message the code no longer emits, two windows carrying the same kind of panel sharing one saved rectangle, a quadratic row lookup, and a count that counted a note twice when the sidecar deliberately sent it twice.

## What is NOT guarded, said plainly

**Five of these fixes are in the renderer or the main process and no automated check can see them**: the hidden remove control, the panel that no longer follows the view or the search box, the address that no longer collapses the window, the promoted satellite, **and the one line in `drawDesk` that chooses which bound the restore clamp uses.** Reverting any of them leaves every check green.

That last one was listed as guarded in an earlier draft of this note and of [[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]], and it is not: what the checks guard is the arithmetic of the two bounds, not which one the renderer calls. It is the same overclaim the reviews of this phase have now caught three times, which is the strongest argument [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] has. That issue moved to [[PHASE-0002-Glass]], where the gap widens.

**The smoke run was not executed for this change.** It is the only thing that drives the renderer, it needs Electron's binary and a real sidecar, and it could not be launched in the session that made these edits. `npm run smoke` from `desktop/` is the command.

## Verification

The desktop suites run 165 checks, all passing, up from 153. Twelve are new and each guards something here: the sidecar's ready flag and the host's 503 while starting; the quit's real process exits, and separately that the quit hands its children to the waiter and starts nothing afterwards; the query lock, in ten spellings plus three legitimate filenames that must still go through; the restore clamp's drift and the desk that must be allowed to grow taller than its window; the drag clamp that must not be; the widened workspace-clearing check; the filter-versus-query rule; the distinct count; and the window keys.

Three of them assert the DEFECT as well as the fix, so none can pass by accident if the fix is reverted: the restore-clamp check drives the old bound and fails if the drift is not there, the desk-growth check fails if any two of forty cards land in the same place, and the sidecar check asserts that a record which HAS answered is still stopped.

**Every new check was mutation-tested** by an independent review: each fix was reverted in the built output and the check that claims to guard it did fail. The five listed above as unguarded were reverted too, and all 165 checks stayed green — which is how they came to be listed.

**The smoke run was not executed for this change.** It is the only thing that drives the renderer, it needs Electron's binary and a real sidecar, and it could not be launched in the session that made these edits. `npm run smoke` from `desktop/` is the command.
