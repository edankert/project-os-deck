---
type: "[[change]]"
id: CHG-20260911-Zoom-And-A-Note-In-The-Middle
aliases: ["CHG-20260911-Zoom-And-A-Note-In-The-Middle"]
title: "The wheel zooms Glass and the orbit, and an opened note stands in the middle of its neighbours, which gather round it as mini notes with a line to each"
status: merged
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin, 2026-09-11: 'On glass and orbit views: add zoom (using a mouse wheel); when selecting something in orbit the main item should open up and all the directly connected items show as mini notes; when selecting in glass, the opened up item should replace the note (possibly move to the center??) and the associated notes should show their connections and should be shown around the opened note.'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
commit: ""
pr: ""
impacts: ["desktop/src/shared/zoom.ts", "desktop/src/shared/focus-ring.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/ring-view.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/navigator.ts", "desktop/src/renderer/index.html", "desktop/src/renderer/deck.css", "desktop/src/main/smoke-glass.ts", "desktop/tests/"]
issues: ["[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]"]
features: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
related: ["[[PHASE-0002-Glass]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]", "[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]"]
---

# The wheel zooms, and an opened note stands in the middle

## What changed, for somebody using Deck

**The mouse wheel zooms Glass and the orbit toward the pointer**, from 0.6× to 2.5×. A pinch on a trackpad does the same; Shift with the wheel turns the field. `+`, `-` and `0` zoom in, out and back to 1×, and a double-click on the background, or the reading on the compass, returns to 1×. The wheel over a note's text still scrolls it. The zoom belongs to the window and is gone after a reload.

**Opening a note puts it in the middle of the notes it is joined to.** The card grows into a pane where it stood, then moves to the middle, while the notes it links to and the notes linking to it gather round it on a ring as mini notes, each with a line to it: solid for a link it makes, dashed for a link made to it. The rest of the field dims and steps back. Resting on a line shows the sentence the link sits in. Clicking a mini note puts that note in the middle, and the note you came from sits on the new ring opposite the way you came. Other open notes wait as headers down the left; click one to bring it to the middle. Escape takes the note out of the middle and puts the field back; a second Escape clears the desk. In the orbit, landing on a dot does the same over the dimmed orbit, which stops drifting.

## What changed underneath

Two pure modules: `zoom.ts` (the zoom as a scale and an offset applied after the perspective) and `focus-ring.ts` (the pane's rectangle, the ring's places on a rounded rectangle that cannot overlap the pane, who gets a place, the order they keep and the arcs they move on). `glass.ts` passes every position it draws through the zoom and holds the middle as a switch in the window; `ring-view.ts` draws the ring. The store, the state file and the address are unchanged. No dependency, setting or path was added.

## What was decided and can be overturned

The research and the choices are in [[REFERENCE-FOCUS-ZOOM-AND-VERBS]] and in the two features' decisions. DES-0002 once dropped "opening re-arranges the field around the note" because it did not survive a second note; the answer here is that only the note on top stands in the middle ([[DES-0002-The-Glass-Cockpit]], amended). Where the approve and decline buttons should go is [[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]], waiting on Edwin.

## Evidence

[[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]] (7), [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]] (11), each failing for its named breaks; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]], 185 Glass checks, each new one seen to fail with its break; `npm test` 428 of 428; `run-smoke.sh both` exit 0. The walk is [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]], Edwin's.
