---
type: "[[feature]]"
id: FEAT-0018
aliases: ["FEAT-0018"]
title: "Every note the view holds has a place in the field, every band says what it could not place, and anything a person can see they can click, tab to and pull forward"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source:
  - "Edwin 2026-09-12: 'Not sure now I know what the quiet band was supposed to be used for. Maybe we need more bands and allow cards to be brought up to the active front band????'"
  - "Edwin 2026-09-12, agreeing to the plan below: 'Fully agree, plan the full solution and on ISS-0078: do as suggested.'"
  - "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"
goal: "A person can see and reach every note the Glass field holds. Active work past the middle's capacity stops vanishing: it stands in a fourth band of its own, in front of the quiet band. A finished note can be clicked, tabbed to and pulled forward, because what is painted on the canvas is hit-tested the way an element is. Each band's shape follows how much that band actually holds, instead of one constant sized for the largest workspace on the fleet, and every band states how many of its notes it could not place."
requirements: []
tasks: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]", "[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Every note has a place, and anything visible can be reached

## Goal

**Today the Glass field draws neither all of the active work nor any of the finished work in a way a person can use.** A note the view sends to the middle, past the middle's 64 slots, is counted and then dropped: on Your Trainer's Issues view that is hundreds of active notes standing nowhere at all. A note in the quiet band is painted on a canvas, so it cannot be clicked, hovered, tabbed to or pulled forward. This feature closes both holes and makes the field's shape follow the workspace instead of the fleet's largest one.

> [!quote] As asked, Edwin, 2026-09-12
> "Not sure now I know what the quiet band was supposed to be used for. Maybe we need more bands and allow cards to be brought up to the active front band????"

> [!quote] As agreed, Edwin, 2026-09-12
> "Fully agree, plan the full solution and on ISS-0078: do as suggested."

Three words are used throughout, and two of them are new.

- A **band** is one ring of the field at one depth. Today there are three: the **front band** (what is owed), the **middle** (the view's own subject) and the **quiet band** (finished and suppressed work, behind the person).
- The **far band** is the fourth, added here: the view's own active work that the middle had no room for. It stands behind the middle and in front of the quiet band, and its notes are cards, not tiles. The name is provisional and Edwin's to overturn; see the open questions.
- A **remainder** is how many notes a band was dealt and did not place. The front band and the middle already state theirs on the bar; the far band and the quiet band gain the same.

**No new gesture is needed to bring a finished note forward.** [[FEAT-0014-The-Hands]] already built **pull**: it brings a card to the front band for the session and the note stays there across a view switch. It is unreachable from the quiet band for one reason only — there is no element to drag. The hit test in [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] is what delivers Edwin's "allow cards to be brought up to the active front band", and nothing else is built for it.

## Scope

**In scope.**

- **A fourth band, and a capacity on every band** ([[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]). `dealField` places the middle's remainder into the far band instead of dropping it, the quiet band caps at a capacity of its own, and the deal reports a remainder per band.
- **A shape per band, derived from what that band holds** ([[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]). One pure function, driven by the deal's population per band, recomputed on a view or workspace change only.
- **Detail keyed to apparent size rather than to the band** ([[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]). Zooming in on a card shows more of the note, because the thresholds read the width the card is drawn at.
- **The renderer drawing four bands and stating every remainder** ([[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]).
- **Anything visible is clickable, on the canvas as well as in the document** ([[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]): a hit test for the quiet band's tiles, a pointer cursor, a hover callout, and a keyboard route into the shelf.
- **A tile large enough becomes a real card** ([[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]), so a zoomed or flown-to quiet note is an element with every behaviour an element has.
- **Smoke checks driven with a real pointer and keyboard** ([[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]).
- **The measurement, retaken** ([[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]), on all three workspaces, throttled as well as not.
- **A free list behind Glass's note-to-element map** ([[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]), **only if the measurement asks for it.**

**Out of scope.**

- **An excerpt of the note on the card.** [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] step 4, dropped in that note on 2026-09-12 with the argument written out. A card grown large shows the subtitle, the status, the progress and the face's properties, and none of those are shown today.
- **Spread's `CardPool`.** It is positional (`pool[i]` to `cards[i]`), so it would change which element a note holds across a view switch and break a PHASE-0002 exit criterion that is already ticked. If pooling is built here it is a free list behind the existing map, and `CardPool` stays Spread's.
- **Walking the quiet band forward.** Edwin's recorded steer on [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] is that a small band adapts by size and detail, not by depth. Done work must not read as active.
- **Paging the middle, and overflowing the middle into the quiet band.** Both rejected in [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]].
- **The orbit arrangement.** It assigns its own slots and paints through `paintOrbit`, so it never reads the band geometry or the deal. Nothing here may change what it draws, and [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]] checks that.
- **Anything the sidecar would have to serve.** This feature reads the payload Deck already reads.

## Decisions

Each was taken while planning on 2026-09-12, from the six issue notes and Edwin's answers in them. Each is his to overturn, and the alternative is named where one was considered.

1. **A fourth band, not an overflow into the quiet band and not paging** ([[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]], option 1). Overflowing into the quiet band makes it mean both "finished" and "did not fit"; paging adds a control and a piece of state and still leaves notes with no place.
2. **The far band holds cards, not tiles.** Its notes are active work, and a person has to be able to tell what they are. They are drawn smaller than a mid card and at less detail, which is what the detail thresholds in [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] already decide. *Alternative:* tiles on the canvas, which would be cheaper and would reproduce exactly the defect [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] reports.
3. **The quiet band gains a capacity and states its remainder.** This is "do as suggested" on [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]. It is a capacity and never a deletion: the band stays drawn, and it stops being the one band that promises to draw everything. What the capacity actually is falls out of the derived shape — a band draws what its shape has room for.
4. **Geometry is derived per band, from that band's own population in this deal.** Not from the project's note count: the Issues view's quiet band and the Phases view's quiet band differ by two orders of magnitude inside one repository, and the deal already knows both numbers before it places anything.
5. **The shape is recomputed on a view change and on a workspace change, and never inside a deal that moved one note.** Marking one issue fixed must not reshape the whole field underneath a person. *Alternative:* recompute per deal, which is a field that never sits still.
6. **A small band adapts by size and detail, and its depth does not move.** Edwin's steer on ISS-0076. Depth is priority in Glass, and a quiet band that walked forward would make finished work read as active.
7. **Anything visible is clickable, on the canvas too.** DES-0002 decided this in its first revision, after the identical defect: "quiet cards carried `pointer-events: none` ... Fixed by making anything visible clickable." Deck reintroduced it by drawing the band on a canvas instead. This is a regression against a decision already taken, so there is nothing to decide — only the rule to carry across.
8. **Detail is keyed to apparent width, not to `dataset.band`.** The band keeps deciding **where** a note stands; how large it is drawn decides **how much** of it is shown. The thresholds live in one pure tested function, or they become three magic numbers in the renderer and a fourth in the canvas.
9. **The keyboard gets a roving tab stop along the quiet band**, rather than one tab stop per tile. A thousand tab stops is not a keyboard route. "Visible and unreachable" is exactly as bad by keyboard as by mouse, which is why search alone is not the answer.
10. **The free list is conditional on the measurement**, and it is a free list behind Glass's existing `cardEls` map rather than `CardPool`. A pool caps element **churn** and not the **live count**, so it makes a turn smooth without making a frame cheaper; and `CardPool` is positional, which would break a ticked exit criterion.
11. **The name "far band" is provisional.** It has to be one word in `BandName`, it has to read in prose, and it has to sit between "mid" and "deep" without fighting "quiet". See the open questions.

## Acceptance

- On every view of all three workspaces, the four band lists plus the four remainders add up to the number of notes the view holds. No note is dealt and then dropped.
- A note the middle had no room for stands in the far band, drawn as a card, behind the middle and in front of the quiet band.
- The bar states each band's remainder in the sentence it already uses, including the quiet band's.
- Clicking a tile in the quiet band lifts that note, exactly as clicking a card does, and the note is then on the desk.
- Resting the pointer on a tile says which note it is and shows the pointer cursor.
- The quiet band is reachable from the keyboard: Tab reaches the shelf, the arrow keys move along it, and Enter lifts the note under the cursor.
- A note in the quiet band can be pulled to the front band with the gesture [[FEAT-0014-The-Hands]] already built, and it is still in front after a view switch.
- Zooming in on a mid-band card shows its face line and its owed verb; zooming further shows its status, its progress and the properties its face names.
- A quiet tile zoomed past the promotion threshold becomes a real card, and it is clickable and tabbable without any code that is specific to the quiet band.
- On this repository, whose deep band is small, the quiet band's tiles are drawn larger than today, and the band's depth is unchanged.
- A note marked fixed while a person watches does not reshape the field: the shape changes on a view or workspace change only.
- A card keeps its element across a view switch, as [[PHASE-0002-Glass]] exit criterion 2 requires.
- The orbit draws exactly what it draws today, at every zoom.
- The frame time is measured again on all three workspaces, throttled and not, and written into this note beside the 2026-09-10 numbers.

## Spec-ambiguity check, 2026-09-12

Run before any ID was allocated (`tools/skills/issue-intake/SKILL.md`, step 1).

- **Every term has one meaning.** "Band" is the field's ring at a depth, stated in `BandName`. "More bands" in Edwin's message is read as one more band, for the remainder that has no place, which is what [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] found and what he agreed to. "Brought up to the active front band" is read as the existing pull, because FEAT-0014 built exactly that and the only thing missing is something to grab.
- **Expected against actual is observable.** Today `dealField` increments `midOverflow` and drops the entry, and `drawCards()` skips every `deep` slot so no element exists for one. Both read from the code on 2026-09-12 and quoted in the issues.
- **Scope is bounded** by the out-of-scope list above, and by two things dropped in their own notes: ISS-0074 step 4 (an excerpt) and ISS-0078's "stop drawing the shelf".
- **Success is verifiable.** Three suites ([[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]], [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]], [[TST-0055-Detail-Follows-Apparent-Size]]), smoke checks in [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]], and the walk [[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]].
- **Hidden conflicts: two, both named under Impact analysis below.** One is [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]'s out-of-scope line, which this feature reverses. The other is PHASE-0002 exit criterion 2, which constrains how pooling may be built and is not contradicted.

**No sibling search is owed for the feature**, and the six issues each carried one. All six are already filed; nothing is refiled here.

## Impact analysis, 2026-09-12

**What was checked.** [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] with [[TASK-0029-The-Band-Function]] and [[TASK-0030-The-Slot-Geometry]]; [[FEAT-0010-Lifting-A-Note]] with [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]; [[FEAT-0014-The-Hands]] with [[TASK-0053-Pull-Forward-And-Push-Behind]] and [[TASK-0054-A-Held-Note-Is-A-Pane]]; [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]] and its decisions 2 and 3; [[FEAT-0001-The-Corpus-Has-An-Inside]] for the orbit; [[FEAT-0012-A-View-Is-A-Description]] and [[ADR-0004-A-View-Is-A-Description]] for the band table; [[PHASE-0002-Glass]]'s exit criteria. This project has no `REQ-*` notes, so the constraints are those features' acceptance lines.

**Four findings. Two need Edwin, and both are questions of wording rather than of direction.**

1. **[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]] put this work out of scope by name.** Its scope says: "**More detail at a larger scale** (semantic zoom: a card shows more of its note when drawn larger). The reference calls it a later refinement." [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] builds it. That is not a contradiction, it is the later refinement arriving, but FEAT-0016 is at `review` and its scope should say where the work went. The task writes the amendment paragraph. **No decision needed.**
2. **[[PHASE-0002-Glass]] exit criterion 1 needs rewording.** It reads "the quiet band is behind you with its count on screen". After this feature the count sits beside a remainder, because the quiet band has a capacity. The criterion is still true and is now incomplete. **Edwin's wording**, and the feature does not tick or amend it on its own.
3. **PHASE-0002 exit criterion 2 is a hard constraint, not a conflict.** Its evidence reads "11 of 12 cards kept their elements across a switch and moved, none reused". Any pooling built here must preserve a note's element across a view switch, which is why the free list sits behind the existing note-to-element map and why `CardPool` is out of scope. [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] carries the constraint and the check.
4. **PHASE-0002's frame-time criterion is re-opened, deliberately.** It is ticked on numbers taken on 2026-09-10, before a fourth band and before any promotion. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] retakes it. If the number fails on a laptop, the phase's own rule applies: Spread returns to being the default and the note says so.

**No contradiction found** between this feature and any other feature's acceptance line. The band table stays the description's ([[ADR-0004-A-View-Is-A-Description]]); this feature adds a fourth `Band` value and a capacity per band, and changes no rule about which notes a view sends where.

## Risk scan, 2026-09-12

**No trigger applies, so no `RISK-*` note is created.** Nothing here adds a dependency, an environment variable, a configuration surface, a stored field, a path change, a long-running step, or a security exposure. The payload Deck reads is unchanged — which is precisely why ISS-0074 step 4, the one part that would have grown it, is dropped.

**One hazard that is not a risk-scan trigger, and is handled by a task.** More on screen costs frame time, and the headroom measured on 2026-09-10 was thin where it matters: 2.2 ms of script per frame on a Mac Studio, an estimated 6.6 ms at 4× CPU cost, and the laptop reading still owed. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] is a planned step in the sequence and not an afterthought, and [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is built only on its result.

## Which issues this resolves

**Resolved by this feature when its tasks are done:**

- [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] — the far band, [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] and [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]].
- [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] — the derived shape, [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]].
- [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]] — the capacity and the remainder, [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] and [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]. Its withdrawn recommendation is not built.
- [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] — [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] and [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]].
- [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] — steps 1 to 3 only, [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] and [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]. Step 4 is dropped in the issue and is not built here, so the issue closes against steps 1 to 3 and records that.

**Stays open past this feature:**

- [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] — conditional. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] decides it. If the numbers hold, the issue is closed with the measurement as the reason and the finding stays on the record for the next feature that draws many notes at once. If they do not, [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is built and the issue closes against it.

## Open questions for Edwin

- **The fourth band's name.** The plan calls it the **far band** (`'far'` in `BandName`), giving front, mid, far, deep, and in prose "front, middle, far, quiet". "Far" and "quiet" name different things — a distance and a state — which reads a little oddly next to each other. Alternatives considered and not chosen: `'rest'` (ambiguous next to a quiet band), `'back'` (the quiet band is further back), `'waiting'` (nothing is waiting on anything).
- **PHASE-0002 exit criterion 1's new wording.** It says "the quiet band is behind you with its count on screen". The count now sits beside a remainder. The criterion is Edwin's to reword, and nothing here edits it.

## Links

- Phase: [[PHASE-0002-Glass]]
- Decision: [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]
- Plan: `docs/features/glass-bands/plan/PLAN.md`
- Tasks: [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]], [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]], [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]], [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]], [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]], [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]], [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]], [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]], [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]
- Suites: [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]], [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]], [[TST-0055-Detail-Follows-Apparent-Size]]
- Acceptance walk: `docs/tests/acceptance/` — [[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]
- Smoke run: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Issues: [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]], [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]], [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]], [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]], [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]
- Design amended: [[DES-0002-The-Glass-Cockpit]] — four bands rather than three, and "anything visible is clickable" carried to the canvas. The design is `proposed`, so the `design:` link here will raise the same `DESIGN-GATE` warning [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] already raises once this feature leaves the pending band. That warning is pre-existing and is not cleared by this work.
- Code: `desktop/src/shared/slots.ts`, `desktop/src/shared/description.ts`, `desktop/src/shared/field.ts`, `desktop/src/renderer/glass.ts`, `desktop/src/renderer/deck.css`, `desktop/src/main/smoke-glass.ts`, `desktop/src/main/measure.ts`; new: `desktop/src/shared/detail.ts`, `desktop/tests/detail.test.mjs`

## Where this stands

**2026-09-12: planned, nothing built.** Nine tasks, three node suites, smoke checks and one walk, from six issues Edwin reviewed and agreed on the same day. The order is the pure layer first — the deal, the geometry, the detail thresholds — then the renderer, then the smoke run, then the measurement, and the free list only if the measurement asks for it. Two questions above are Edwin's: the fourth band's name and one exit criterion's wording. Neither blocks the first task.
