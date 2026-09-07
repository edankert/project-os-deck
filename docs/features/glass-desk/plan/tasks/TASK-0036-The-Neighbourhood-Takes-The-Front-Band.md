---
type: "[[task]]"
id: TASK-0036
aliases: ["TASK-0036"]
title: "The neighbourhood takes the front band while a note is held, the front plane says what it now means, and the owed count keeps its place"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0010-Lifting-A-Note]]"]
parent: "FEAT-0010"
effort: ""
due: ""
depends: ["TASK-0035"]
blocks: ["TASK-0037"]
related: ["[[FEAT-0010-Lifting-A-Note]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: []
---

# The neighbourhood takes the front band

## Objective

While a note is held, the notes it links to and the notes that link to it come to the front band at full size, and the person is turned to face them. The display says that the front plane now means something different, and the count of what is owed stays where it always is.

## Detail

The data comes from the sidecar as it is. `/api/cockpit/context` returns a note's linked notes and backlinks grouped by type; the cockpit's register lists it under `api.read.note`, and Deck's host already forwards the path. Deck's typed client (`desktop/src/shared/sidecar-client.ts`) gains one read method for it. One request per held note, made when the note is lifted and dropped when it is put back. The whole-graph payload of FEAT-0001 is not needed for this.

The front band is re-dealt while a note is held. The band function (TASK-0029) gets one more input, joined to a held note, and that input wins the front band. The neighbours stay field cards: clicking one lifts it too, so five held notes never drag sixty onto the desk. Lifting a note turns the field to face its neighbours, which is the fly rather than the cut, and under reduced motion arriving is shown by a highlight instead.

Two findings from [[REFERENCE-DES-0002-REVIEW]] are rules here. First, the front plane changes meaning while a note is held, and a mode change needs a salient indication (Sarter and Woods, 1995). The label above the front band therefore reads "what is joined to what you are holding", in the same place every time the meaning changes. Second, the review measured that holding a note pushed ten owed notes into the mid band and made "unavoidable" avoidable. The owed count therefore keeps a fixed place in the display while a note is held, so what needs a person is never silently out of view.

## Acceptance

- Lifting a note makes one request for its context, and putting it back makes none.
- While a note is held, every note in its linked and backlink groups is in the front band at full size, and the field has turned to face them.
- A neighbour is still a field card: clicking it lifts it, and the held set grows by one, not by the neighbour's own neighbourhood.
- The front band's label reads "what is joined to what you are holding" while any note is held, and returns to its view meaning when none is.
- The owed count is drawn in the same place before, during and after a note is held.
- Under reduced motion, the turn is replaced by a highlight on the neighbours and no card is animated.
- Every neighbour is reachable and liftable from the navigator by keyboard.

## Steps

- [ ] Add a `context` read to the typed sidecar client, returning linked notes and backlinks by type; confirm the host's allow-list carries the path.
- [ ] Add "joined to a held note" as an input of the band function and give it the front band.
- [ ] Turn the field to face the neighbours on lift, with the reduced-motion substitute.
- [ ] Draw the mode label and pin the owed count's position.
- [ ] Add a check over a fixture context payload that the right notes land in the front band and the label changes, and a smoke step that lifts a note with a real pointer and reads the label.

## Notes

[[REFERENCE-COCKPIT-ADOPTION]] marks `shell.context.pane` as replaced by the neighbourhood in Glass. This task is what earns that row.
