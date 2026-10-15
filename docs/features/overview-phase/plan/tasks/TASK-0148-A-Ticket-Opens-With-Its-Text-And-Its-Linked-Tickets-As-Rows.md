---
type: "[[task]]"
id: TASK-0148
title: "A ticket opens with its id, title and full text, its linked tickets as cockpit rows, and its gate as five labelled chips"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Selecting an item I think should show them with more details ... should show the item id and title, maybe some text or all of the text even and should show the other items id and title as well, again use consistent colours and use the same status language as the cockpit overview ...'", "Edwin 2026-10-15: 'also the items above the (the solar systems) are a little strange what are they supposed to represent?'", "Edwin 2026-10-15: 'on item 4, I believe what I saw was the related items that needed me, not the stages, they were above this again but I might be mistaken'", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: L
due: ""
depends: ["[[TASK-0144]]", "[[TASK-0145]]", "[[TASK-0149]]"]
blocks: ["[[TASK-0150]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0147]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]"]
---

# A ticket opens with its text and its linked tickets as rows

**S3 shows the ticket itself: its id and title at the top, the note's full text, and every ticket it is linked to as a cockpit row.** Today S3 is a lifecycle track, a ring of neighbour glyphs and five small round lamps. Edwin asked for more detail, and asked what the round "solar systems" were.

## Definition of Done
- [x] The top shows the ticket's mark, id, title and its lifecycle track.
- [x] The note's full text is in a scrolling panel, using Glass's note reader rather than a new renderer.
- [x] Linked tickets are rows like TASK-0147's, grouped by type, in two lists: "links to" and "linked from". A press on a row opens that ticket (and adds a history entry, TASK-0146).
- [x] The radial star of neighbours shrinks to a small header picture or goes; whichever is chosen is recorded here with the reason.
- [x] The five round gate lamps become five labelled chips, "Requirements 0 / 8" and so on, each with a row of cockpit marks: the same chips as S7's (TASK-0149).
- [x] TST-0090 checks, on both fixtures, that the rows are exactly the model's links split by direction, and that the full text is the note's. `cd desktop && npm test` passes.

## Steps
- [x] Rebuild `desktop/src/shared/overview-ticket.ts` around the header, the text panel and the two row lists.
- [x] Reuse the chip component from TASK-0149 for the gate.
- [x] Rewrite TST-0092's step 2 for the new screen (done at planning; check it still matches when built).

## Verification

S3 shows the ticket's square, id and whole title (wrapped, within the sixty-word rule, checked over all 3,131 tickets), its stages track, its full text as the reader renders it (the sidecar's HTML, found through the records route's new `?id=`), and its neighbours as cockpit rows in "Links to" and "Linked from"; a press on a row opens that ticket and adds a history entry, and a link inside the text opens the note it names. **The radial star of neighbours went** rather than shrinking: the rows carry every neighbour's id, title and status, which is what Edwin asked for, and a small star beside the gate and the track would have crowded the header for no new information. A feature's gate is Codex's five labelled chips, loaded through `featureGate` as S7 does. TST-0090 checks the rows against the model's links by direction and the gate counts; TST-0093 checked on both workspaces that the text arrives. Edwin's TST-0092 is not yet run.

## Notes

Claude lane. The chips come from Codex's TASK-0149, so this task waits on it.

**What the "solar systems" were is not settled.** On S3 the five gate lamps sit under the track, and an unknown lamp has a violet centre, Deck's "owed again" colour, which reads as "needs you". Edwin thinks what he saw was instead the related tickets that needed him, drawn above. Both are replaced by this task: the lamps by labelled chips, the neighbour rings by rows. So the work does not depend on which it was, and the redrawn S3 plate (TASK-0150) is where Edwin confirms the strange marks are gone.
