---
type: "[[task]]"
id: TASK-0055
aliases: ["TASK-0055"]
title: "Throw to a screen: a drag that leaves the field toward another window lands the note in that window's reader or on its desk, opens a new reader window on an empty display, and reaches the tablet"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[FEAT-0014-The-Hands]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
parent: "FEAT-0014"
effort: ""
due: ""
depends: ["TASK-0053", "TASK-0054", "TASK-0057"]
blocks: []
related: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]", "[[TASK-0013-A-Window-Reopens-Where-It-Was]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: ["[[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Throw to a screen

## Objective

A person drags a card off the edge of the field toward another window, on the same display or another, and the note lands there: in that window's reader, or on the desk panel it carries. Thrown toward a display with no Deck window on it, the note opens a new reader window there. The flight goes toward the screen the note went to, so the person sees where it landed. The tablet, once it follows the store, is a target like any other. A keyboard verb does the same by naming the window.

## Detail

**This is the gesture the film is remembered for, and Deck already has every piece but the gesture.** One store in the main process ([[FEAT-0003-One-Store-In-The-Main-Process]]), windows placed by display with their bounds remembered ([[TASK-0013-A-Window-Reopens-Where-It-Was]]), a panel address that says what a window carries ([[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]), and a way to open a panel at an address ([[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]). The main process knows every window's bounds and the display it is on. What is missing is a drag that crosses the gap.

**A throw is a drag that leaves the field's edge with a direction.** While a dragged card is within a stated distance of an edge, a target strip appears along that edge naming every Deck window that lies in that direction from the focus window, by what it carries and which display it is on: "reader on Display 2", "desk on Display 2", "tablet". Releasing over a name throws to it; releasing past the edge with no name under the pointer throws to the nearest window in that direction, or, when there is none on that display, opens a new reader window at the near edge of that display carrying the note. The edge distance and the minimum velocity are inputs written here when chosen.

**Landing is a store action the windows already understand.** Throwing to a reader window sets that window's focused note through its panel address, and the note is not lifted onto the desk unless the person threw it at a desk panel. Throwing to a desk panel is the same put-on-desk action a lift is, and the note is on the desk everywhere, because the desk is per workspace; what the throw adds is the flight, which shows the person which screen they sent it to. Throwing to the tablet puts it on the desk too, and the tablet shows it because it follows the store ([[TASK-0057-The-Served-Page-Follows-The-Store]]). No new inter-process route is added: the renderer dispatches the same actions and calls the same open-panel bridge as today.

**The flight.** A thrown card flies toward the edge it left and fades, over about the same second the view switch uses, and the slot it left stays ghosted if it was lifted and re-deals if it was not. Under reduced motion the card is cut and the target's name is highlighted for a moment instead.

**The keyboard.** A navigator row and a pane header offer **send to**, listing the same targets the strip names. That is the route for a person without a pointer and it is required, not optional.

## Acceptance

- With a reader window on a second display, a drag that leaves the field toward it lands the note in that window's reader, and the focus window's desk is unchanged.
- With a desk panel there instead, the same throw puts the note on the desk, and the card's flight goes toward that display.
- With no Deck window on the display in that direction, the throw opens a new reader window at that display's near edge carrying the note, placed by the same function that places every window.
- The target strip names every window in the drag's direction while the card is near the edge, and nothing when it is not.
- With the tablet following the store, a throw to the tablet target puts the note on the desk and the tablet shows it within a second.
- Under reduced motion the landing is a cut and the target's name is highlighted.
- Send to, from a navigator row and from a pane header, reaches every target the strip would name, checked in the smoke run with the keyboard alone.
- The throw recogniser is pure over pointer samples and window bounds, tested without Electron, with the edge distance and velocity as inputs.

## Steps

- [x] Write the recogniser over pointer samples and the window book's bounds, with the thresholds as inputs; write the chosen numbers here.
- [x] Draw the target strip from the windows in the drag's direction, with the tablet as a target when a served page is subscribed.
- [x] Wire a release to the existing focus, put-on-desk and open-panel actions; place a new window with the existing placement function.
- [x] Add the flight and the reduced-motion cut.
- [x] Add send to on the navigator row and the pane header.
- [x] Extend the smoke run with two windows: a throw to a reader, a throw to a desk, a throw to an empty display, and the keyboard route.
- [x] Write the automated test notes and link them from `tests:`.

## Notes

DES-0002's many-monitors section said only screen 1 has a front plane and the other screens are surfaces, not fields. The throw honours that: what lands on another screen is a note in a reader or on a desk, never a second field.

## Outcome

**Done 2026-09-10.** A card or a pane dragged within **44 pixels** of the field's edge (`THROW_EDGE_PX`) shows a strip at that edge naming every place a throw that way could land: the Deck windows that lie that way, nearest first; each display that way with no Deck window, as "a new reader on …"; and the tablet, when a served page is following. Releasing over a name throws there. Releasing past the edge while still moving at **0.35 pixels per millisecond** (`THROW_MIN_SPEED`) throws to the first name. The card flies toward that edge and fades over a second; under reduced motion it is a cut and the front plane names the target. **Send to** does the same from the keyboard: `s` on a navigator row or ↗ on a pane lists the targets.

**Landing.** A reader window is re-addressed at the note. A desk panel and the tablet get it on the desk. The focus window focuses it. A display with no Deck window gets a new reader at the edge nearest the throw, placed by the function that places every window.

**One route was added where the task said none would be.** The renderer cannot list other windows' bounds or re-address an existing window through the bridge it had, so the shell gained `deck:windows:list` and `deck:window:throw`. Both are in the shell only and neither reaches a served page.

**The strip stays while the pointer is over it.** The first build hid it as soon as the pointer left the 44-pixel edge zone, and every name is wider than that, so a person reaching for one lost them all.

**Evidence.** [[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]] for the recogniser and the targets; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: a throw into a reader window, onto a desk panel, onto a display with no Deck window (on a machine with more than one display), and send to by keyboard alone.

**Amended 2026-09-10 (ISS-0062).** A display holding only a Needs-you strip now offers a new reader, an unnamed display is called "display N", and the smoke run now throws to the tablet, checks the flight's direction and the reduced-motion cut.
