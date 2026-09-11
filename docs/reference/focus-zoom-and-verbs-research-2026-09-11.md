---
type: "[[reference]]"
id: REFERENCE-FOCUS-ZOOM-AND-VERBS
aliases: ["REFERENCE-FOCUS-ZOOM-AND-VERBS"]
title: "Opening a note in the middle of its connections, zooming the field with the wheel, and where the verbs go: research and recommendations"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
scope: "project"
source:
  - "Edwin 2026-09-11: 'On glass and orbit views: add zoom (using a mouse wheel); when selecting something in orbit the main item should open up and all the directly connected items show as mini notes; when selecting in glass, the opened up item should replace the note (possibly move to the center?? Review and research how this work fully online) and the associated notes should show their connections and should be shown around the opened note. On spread an list when selecting an item which needs to be approved or declined it opens a huge vertical area on the right, this should probably be handled differently and shown as just a strip somewhere??? Review and suggest.'"
  - "desktop/src/renderer/glass.ts, renderer.ts, index.html and deck.css, read on 2026-09-11"
  - "docs/designs/DES-0002-The-Glass-Cockpit.md, 'The desk, and the two surfaces'"
  - "Yee, Fisher, Dhamija and Hearst, Animated Exploration of Dynamic Graphs with Radial Layout, InfoVis 2001"
  - "Heer and Robertson, Animated Transitions in Statistical Data Graphics, IEEE TVCG 2007"
  - "TheBrain help and user guides; Obsidian's local graph; Heptabase's focus mode; Jankun-Kelly and Ma, MoireGraphs, InfoVis 2003"
related:
  - "[[DES-0002-The-Glass-Cockpit]]"
  - "[[FEAT-0010-Lifting-A-Note]]"
  - "[[FEAT-0001-The-Corpus-Has-An-Inside]]"
  - "[[FEAT-0014-The-Hands]]"
  - "[[PHASE-0002-Glass]]"
---

# Opening a note in the middle of its connections, zooming, and where the verbs go

**Recommendation in one paragraph.** Make one "focus" arrangement that Glass and the orbit share. When a note is opened, its card grows into a pane where it stands, then moves to the middle of the screen. The notes it links to, and the notes that link to it, fly to a ring around it as small cards (mini notes), with a line from the pane to each. The rest of the field dims and steps back. Only the note on top is the focus: other open notes stay as panes at the side, and bringing one forward swaps it into the middle. The mouse wheel zooms Glass and the orbit toward the pointer. The approve and decline buttons move into one line at the top of the reader, because today they take a full-height column of their own by mistake.

## What Deck does today

- **Selecting in Glass** lifts the note. Its card leaves a dashed outline, and a pane appears in a cascade down the left of the field, not where the card was. The notes joined to it take the front band, spread across the cylinder in its ordinary slots. Lines from the note to its neighbours are drawn only while the pointer rests on a card (the reach), and the field turns to face the band.
- **Selecting in the orbit** does the same lift: a pane in the left cascade, and the note in the reader. The orbit does not rearrange around it, and its direct links are not singled out.
- **The mouse wheel** does nothing in either. There is no zoom.
- **Approve and decline in Spread and List.** The verb buttons live in a `<div class="actuators">` that sits directly in the window's main row of columns (`.body`, a flex row: rail, navigator, desk, verbs, reader). When a note offers verbs the div becomes a column of its own, as tall as the window, between the desk and the reader. Its style (padding, a bottom border) shows it was meant to be a strip above the reader. **This is a layout defect, not a design.**

## What the research says

1. **The focus goes in the middle, and what is one step away sits on a ring around it.** Radial layouts put "the focus node at the center" with nodes "arranged on concentric rings", each ring one link further out (Yee et al.). Obsidian's local graph shows "only the notes connected to the active note", with a depth control for how many steps. TheBrain keeps the active thought centred and puts its relations in fixed zones: parents above, children below, jumps to the left, siblings to the right.
2. **Move things on arcs, not straight lines, and keep their order.** Straight-line movement makes nodes "crowd into an unreadable clump in the center" and then separate. Moving by angle and distance instead lets "groups of nodes rotate about the center … together". Two rules keep the new picture close to the old one: keep the direction of the line to the note you came from, and keep the neighbours in the angular order they already had (Yee et al.).
3. **About one second, slow at both ends.** Heer and Robertson recommend transitions "around 1 second". Yee et al. use slow-in, slow-out timing, so most of the movement happens in the middle third.
4. **Stage a complex change.** "Break up the transition into a set of simple subtransitions" (Heer and Robertson). For opening a note that means two stages: first the card grows into a pane where it is, then it moves to the middle while the neighbours gather. A note that jumps straight to the middle loses the link to where it was.
5. **Keep the rest, dimmed.** Focus plus context: the focus is drawn large and the rest stays visible but quieter. MoireGraphs makes the strength of that fade a control. Heptabase's focus mode hides non-essential cards with one click.
6. **The wheel zooms toward the pointer.** Zoomable interfaces scale around the point under the cursor, so what the person points at stays under the pointer. The mouse wheel, or pinch on a trackpad (which the browser reports as a wheel with Ctrl held), is the usual control. At a larger scale a card can show more of its note (semantic zoom); that is a later refinement, not needed now.

## Recommendations

### 1. Zoom, in Glass and in the orbit

- The wheel zooms toward the pointer; pinch on a trackpad does the same. The range is 0.6× to 2.5×. Double-clicking the background, or `0`, returns to 1×.
- Zoom scales what is drawn: the cards, the canvas, the wires and the panes' neighbours. It changes no slot, so nothing is dealt again because of it, and the hit test and the reach use the zoomed positions.
- The compass shows the zoom when it is not 1×. Zoom belongs to the window, like the turn (the yaw): not in the store, not in an address.
- Shift and the wheel, and a trackpad's sideways swipe, turn the field, because turning is the other thing a wheel is asked to do.

### 2. Opening a note: one focus arrangement for Glass and the orbit

- **Stage one, about 300 ms.** The card grows into a pane where it stands. Its slot keeps the dashed outline, as today.
- **Stage two, about 700 ms, slow at both ends.** The pane moves to the middle of the screen at a readable size. The notes it links to and the notes that link to it move on arcs to a ring around it, as mini notes: small cards with the id and the title. They keep the angular order they had, so a neighbour that was on the left stays on the left.
- **Lines.** A line runs from the pane's edge to each mini note, solid for a link the note makes and dashed for a link made to it. Resting on a line names the field it came from, as the orbit already does for its links.
- **The rest steps back.** Every other card dims and draws smaller, and stays where it is, so leaving the focus puts the field back exactly.
- **A ring holds up to 16.** Beyond that a "+N more" card sits on the ring, and the navigator lists every neighbour, as it does now.
- **A mini note is a door.** Clicking one makes it the focus: it moves to the middle, its own neighbours gather, and the note that was the focus becomes a pane at the side. This is TheBrain's move from one thought to the next.
- **More than one open note.** This is where DES-0002's first revision failed ("does not survive a second note and collapses at three"). Only the note on top is the focus. The other open notes stay as panes docked at the side, in today's cascade. Bringing one forward makes it the focus, with the same animation. Notes joined to more than one open note stay marked, as now.
- **Leaving.** Escape leaves the focus and puts the field back; a second Escape sweeps the desk as it does today. The reading column (widening a pane) is unchanged.
- **Under reduced motion** every stage is a cut, and the focus and its ring are highlighted instead.
- **In the orbit** the same arrangement opens over the orbit: the note in the middle, its direct links around it, the orbit dimmed behind. Leaving puts the orbit back where it was.

### 3. The approve and decline buttons

Three ways to show them, recommended first:

1. **One line at the top of the reader** (recommended). The buttons sit in a single row above the note's text, sticky while the note scrolls, with the reason for a disabled verb in its tooltip rather than as a paragraph. It is where a person is already looking, and it takes one line instead of a column. It fixes the defect above with one move of the element.
2. **On the pane's header in Glass.** The focused pane's toolbar carries the verbs as buttons beside ↗, ⇥ and ×. Right for Glass, but Spread and List have no pane.
3. **A decision bar across the bottom of the window**, like the status line: "ISS-0012 is owed: approve · decline". Always visible, but it is far from the note and competes with the status messages.

The first fixes Spread and List now; the second can follow in Glass once the focus arrangement exists.

## Sources

- [Animated Exploration of Dynamic Graphs with Radial Layout](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/yee01animated.pdf), Yee, Fisher, Dhamija and Hearst.
- [Animated Transitions in Statistical Data Graphics](https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf), Heer and Robertson.
- [MoireGraphs: radial focus+context visualization](https://ieeexplore.ieee.org/document/1249009/), Jankun-Kelly and Ma.
- [TheBrain help](https://help.thebrain.com/ipad/index.html) and [Thought relationships](http://help.thebrain.com/androidphone/thoughtrelationships.html).
- [Obsidian graph view](https://mintlify.wiki/obsidianmd/obsidian-help/plugins/graph-view) and [local graph depth](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view).
- [Heptabase user interface logic](https://wiki.heptabase.com/user-interface-logic) and [Heptabase 1.0](https://wiki.heptabase.com/version-one).
- [Zooming user interface](https://en.wikipedia.org/wiki/Zooming_user_interface) and [Microsoft's guidelines for semantic zoom](https://learn.microsoft.com/en-us/previous-versions/windows/jj883708(v=win.10)).
