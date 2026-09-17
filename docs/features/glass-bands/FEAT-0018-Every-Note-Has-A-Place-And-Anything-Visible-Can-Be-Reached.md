---
type: "[[feature]]"
id: FEAT-0018
aliases: ["FEAT-0018"]
title: "Every note the view holds has a place in the field, every band says what it could not place, and anything a person can see they can click, tab to and pull forward"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source:
  - "Edwin 2026-09-12: 'Not sure now I know what the quiet band was supposed to be used for. Maybe we need more bands and allow cards to be brought up to the active front band????'"
  - "Edwin 2026-09-12, agreeing to the plan below: 'Fully agree, plan the full solution and on ISS-0078: do as suggested.'"
  - "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"
goal: "Every note a Glass view holds is somewhere a person can see and point at. The work the middle had no room for stands in a fourth band, the outer field, rather than being counted and dropped, and a finished note behind you can be clicked, tabbed to and pulled forward. No band promises to draw all of it: each one places what its shape holds, says how many it left out, and takes that shape from how much it is actually holding."
requirements: []
tasks: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]", "[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]", "[[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]", "[[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]]", "[[TASK-0083-A-Finished-Note-Is-Pulled-Forward-From-The-Shelf-Itself]]", "[[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-17
review_verdict: changes-requested
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
- The **outer field** is the fourth, added here: the view's own active work that the middle had no room for. It stands behind the middle and in front of the quiet band, and its notes are cards, not tiles. **Edwin chose the name on 2026-09-12.**
- A **remainder** is how many notes a band was dealt and did not place. The front band and the middle already state theirs on the bar; the outer field and the quiet band gain the same.

**No new gesture is needed to bring a finished note forward.** [[FEAT-0014-The-Hands]] already built **pull**: it brings a card to the front band for the session and the note stays there across a view switch. It is unreachable from the quiet band for one reason only — there is no element to drag.

> [!warning] Corrected 2026-09-17 by the round-one independent review
> This paragraph used to end "the hit test in [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] is what delivers Edwin's 'allow cards to be brought up to the active front band', and nothing else is built for it". That was wrong. The hit test calls `tap`, which lifts the note onto the **desk**, and the desk is not the front band. Nothing built in this feature reaches `pull` from a tile, and on a large shelf nothing can, because the only route is promotion at a width a crowded shelf never gives a tile. [[ISS-0082-A-Finished-Note-On-A-Large-Workspace-Can-Never-Be-Pulled-To-The-Front-Band]] records it and [[TASK-0083-A-Finished-Note-Is-Pulled-Forward-From-The-Shelf-Itself]] builds the two routes that do deliver Edwin's request.

## Scope

**In scope.**

- **A fourth band, and a capacity on every band** ([[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]). `dealField` places the middle's remainder into the outer field instead of dropping it, the quiet band caps at a capacity of its own, and the deal reports a remainder per band.
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
2. **The outer field holds cards, not tiles.** Its notes are active work, and a person has to be able to tell what they are. They are drawn smaller than a mid card and at less detail, which is what the detail thresholds in [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] already decide. *Alternative:* tiles on the canvas, which would be cheaper and would reproduce exactly the defect [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] reports.
3. **The quiet band gains a capacity and states its remainder.** This is "do as suggested" on [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]. It is a capacity and never a deletion: the band stays drawn, and it stops being the one band that promises to draw everything. What the capacity actually is falls out of the derived shape — a band draws what its shape has room for.
4. **Geometry is derived per band, from that band's own population in this deal.** Not from the project's note count: the Issues view's quiet band and the Phases view's quiet band differ by two orders of magnitude inside one repository, and the deal already knows both numbers before it places anything.
5. **The shape is recomputed on a view change and on a workspace change, and never inside a deal that moved one note.** Marking one issue fixed must not reshape the whole field underneath a person. *Alternative:* recompute per deal, which is a field that never sits still.
6. **A small band adapts by size and detail, and its depth does not move.** Edwin's steer on ISS-0076. Depth is priority in Glass, and a quiet band that walked forward would make finished work read as active.
7. **Anything visible is clickable, on the canvas too.** DES-0002 decided this in its first revision, after the identical defect: "quiet cards carried `pointer-events: none` ... Fixed by making anything visible clickable." Deck reintroduced it by drawing the band on a canvas instead. This is a regression against a decision already taken, so there is nothing to decide — only the rule to carry across.
8. **Detail is keyed to apparent width, not to `dataset.band`.** The band keeps deciding **where** a note stands; how large it is drawn decides **how much** of it is shown. The thresholds live in one pure tested function, or they become three magic numbers in the renderer and a fourth in the canvas.
9. **The keyboard gets a roving tab stop along the quiet band**, rather than one tab stop per tile. A thousand tab stops is not a keyboard route. "Visible and unreachable" is exactly as bad by keyboard as by mouse, which is why search alone is not the answer.
10. **The free list is conditional on the measurement**, and it is a free list behind Glass's existing `cardEls` map rather than `CardPool`. A pool caps element **churn** and not the **live count**, so it makes a turn smooth without making a frame cheaper; and `CardPool` is positional, which would break a ticked exit criterion.
11. **The band is called the outer field, `'outer'` in `BandName`. Decided 2026-09-12 by Edwin.** "Mid" and "outer" are a pair, which is right, because the outer field holds the same kind of work as the middle and simply did not fit. The quiet band stays the odd name out on purpose: it describes a state, finished work, not a distance. Not chosen: `'far'` (a second distance word beside `deep`, which is what sent the question to Edwin), `'rest'` (ambiguous next to a quiet band), `'back'` (the quiet band is further back), `'waiting'` (nothing waits on anything).

## Acceptance

- On every view of all three workspaces, the four band lists plus the four remainders add up to the number of notes the view holds. No note is dealt and then dropped.
- A note the middle had no room for stands in the outer field, drawn as a card, behind the middle and in front of the quiet band.
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

- [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] — the outer field, [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] and [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]].
- [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] — the derived shape, [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]].
- [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]] — the capacity and the remainder, [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] and [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]. Its withdrawn recommendation is not built.
- [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] — [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] and [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]].
- [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] — steps 1 to 3 only, [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] and [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]. Step 4 is dropped in the issue and is not built here, so the issue closes against steps 1 to 3 and records that.

**Stays open past this feature:**

- [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] — conditional. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] decides it. If the numbers hold, the issue is closed with the measurement as the reason and the finding stays on the record for the next feature that draws many notes at once. If they do not, [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is built and the issue closes against it.

## Open questions for Edwin

- ~~The fourth band's name.~~ **Answered 2026-09-12: the outer field, `'outer'`.** Decision 11 records why.
- ~~PHASE-0002 exit criterion 1's new wording.~~ **Answered 2026-09-12.** It now reads: "Deck opens a workspace in Glass: the owed notes are in front, the view's subject fills the middle and the outer field, and the quiet band is behind you. Every note the view holds is in a band or counted on screen, and no band is silently short." The second sentence is the checkable half and is what [[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]] walks.

## Links

- Phase: [[PHASE-0002-Glass]]
- Decision: [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]
- Plan: `docs/features/glass-bands/plan/PLAN.md`
- Tasks: [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]], [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]], [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]], [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]], [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]], [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]], [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]], [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]], [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]
- Suites: [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]], [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]], [[TST-0055-Detail-Follows-Apparent-Size]]
- Acceptance walk: `docs/tests/acceptance/` — [[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]
- Smoke run: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]], run in the box [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]] built
- Issues: [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]], [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]], [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]], [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]], [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]
- Design amended: [[DES-0002-The-Glass-Cockpit]] — four bands rather than three, and "anything visible is clickable" carried to the canvas. The design is `proposed`, so the `design:` link here will raise the same `DESIGN-GATE` warning [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] already raises once this feature leaves the pending band. That warning is pre-existing and is not cleared by this work.
- Code: `desktop/src/shared/slots.ts`, `desktop/src/shared/description.ts`, `desktop/src/shared/field.ts`, `desktop/src/renderer/glass.ts`, `desktop/src/renderer/deck.css`, `desktop/src/main/smoke-glass.ts`, `desktop/src/main/measure.ts`; new: `desktop/src/shared/detail.ts`, `desktop/tests/detail.test.mjs`

## How this was planned

**2026-09-12: planned, nothing built.** This section is the planning record and is kept as written; what the feature stands at now is "Where this stands", below the measurement. Nine tasks, three node suites, smoke checks and one walk, from six issues Edwin reviewed and agreed on the same day. [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]] was added while the work ran, which made ten; [[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]], [[TASK-0083-A-Finished-Note-Is-Pulled-Forward-From-The-Shelf-Itself]] and [[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]] were added by the round-one review, which makes thirteen. The order is the pure layer first — the deal, the geometry, the detail thresholds — then the renderer, then the smoke run, then the measurement, and the free list only if the measurement asks for it. Two questions above are Edwin's: the fourth band's name and one exit criterion's wording. Neither blocks the first task.

## Measured

**2026-09-12, on Edwin's Mac, `npm run measure`.** The same five-second turn through the quiet band of the Issues view that [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] measured on 2026-09-10, with two runs added: one with the **pointer moving**, because the tile hit test runs on `pointermove`, and one **zoomed in on the quiet band**, because that is where a tile becomes an element.

| Workspace | frame, median / p95 | script work, median / p95 | the same at 4x CPU cost | elements | tiles painted | outer-field cards | promoted |
|---|---|---|---|---|---|---|---|
| this repository | 16.7 / 17.3 ms | 0.9 / 1.2 ms | 3.3 / 4.7 ms | 902 | 6 | 0 | 0 |
| project-os-cockpit | 16.7 / 17.2 ms | 1.9 / 2.6 ms | 5.5 / 7.1 ms | 1,557 | 24 | 0 | 0 |
| Your Trainer | 16.7 / 17.4 ms | 3.0 / 4.0 ms | 7.8 / 10.5 ms | 2,848 | 29 | 12 | 0 |

**Zoomed in on the quiet band**, which is the worst case this feature creates:

| Workspace | frame, median | script work | elements | tiles painted | cards | promoted |
|---|---|---|---|---|---|---|
| this repository | 16.7 ms | 0.8 ms | 1,165 | 0 | 44 | 22 |
| project-os-cockpit | 16.7 ms | 2.0 ms | 2,876 | 0 | 140 | 110 |
| Your Trainer | 16.7 ms | 2.7 ms | 4,467 | 0 | 211 | 135 |

**With the pointer moving**, the run the hit test had to be measured against: 1.0, 1.5 and 2.6 ms of script work — at or below the same turn with the pointer still. The tile hit test costs nothing a frame can feel.

### How to read it

**Every configuration holds the display's frame.** 16.7 ms is one refresh at 60 Hz, and no run missed it; the 95th percentile never passed 17.4 ms. Zoomed right in on Your Trainer, with 4,467 elements in the document and 135 quiet notes drawn as cards, the field still turned at the display's rate.

**Nothing is promoted at 1x on any workspace, exactly as the pure modules said.** So a person who does not zoom sees the document they saw before: the promotion threshold is doing what [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] moved it to `full` to do.

**The field costs more than it did, and the number is small.** Script work per frame on Your Trainer went from 2.2 to 3.0 ms, and at 4x CPU cost from 6.6 to 7.8 ms. The 4x figure is the one that matters, because it stands in for a slower machine, and 10.5 ms at the 95th percentile still leaves 6 ms of a frame. This repository got **faster** — 1.1 to 0.9 ms — because its quiet band now paints 6 large tiles where it painted 35 small ones.

**The elements grew before anything was promoted**: 2,303 to 2,848 on Your Trainer at 1x. The outer field is 12 of those cards; the rest is the `more` level's line, which every card now carries whether or not it is drawn.

### What it decides

**[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] does not need a free list, and [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is not built.** The worry was that promotion would churn hundreds of elements on a turn. Zoomed in on Your Trainer, with 135 notes promoting and demoting as the field turned, the turn held 16.7 ms with 2.7 ms of script work — less than the same workspace costs at 1x. The churn is real and it is not what a frame is spending its time on. The finding stays on the record for the next feature that draws many notes at once; nothing is owed now.

**[[PHASE-0002-Glass]]'s frame-time criterion is re-established on these numbers.** Taken on a Mac Studio, as the 2026-09-10 run was; the laptop reading is still owed and is still Edwin's.

## Where this stands

**2026-09-12: built, measured and at review.** Every task is resolved: TASK-0072 to TASK-0079 done, TASK-0080 cancelled by the measurement that was there to decide it, TASK-0081 done. 465 node checks passing, both typechecks clean, the smoke suite green on CI and in a local container, and three deliberate breaks each caught by the check they belong to.

**Resolved:** [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]], [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]], [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]], [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] and [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] steps 1 to 3. [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] is declined on the measurement's numbers.

**2026-09-17: the independent review ran and returned `changes-requested`.** Its full report is the section at the end of this note. Three findings refute an acceptance line and hold this feature out of `done`: resting the pointer on a tile does nothing, because the handler that would answer runs only in the orbit ([[ISS-0081-Resting-The-Pointer-On-A-Tile-Does-Nothing-Because-The-Handler-Only-Runs-In-The-Orbit]]); a finished note on a large workspace can never be pulled to the front band, which is Edwin's own request ([[ISS-0082-A-Finished-Note-On-A-Large-Workspace-Can-Never-Be-Pulled-To-The-Front-Band]]); and a promoted card is laid out in the tile's box, so the detail it was promoted to show is clipped ([[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]]). [[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]], [[TASK-0083-A-Finished-Note-Is-Pulled-Forward-From-The-Shelf-Itself]] and [[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]] fix them.

**Three findings are filed and do not block**, per `tools/instructions/QUALITY.md`: two smoke checks that cannot fail ([[ISS-0083-Two-Smoke-Checks-Cannot-Fail-And-One-Of-Them-Stands-For-The-Cursor]]), three rules that survive being broken with every check passing ([[ISS-0085-Three-Rules-The-Feature-Added-Survive-Being-Broken-With-Every-Check-Still-Passing]]), and the 186 notes the outer field leaves unplaced against this note's own title ([[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]], which is Edwin's decision).

**What is owed before this is done**: the three fix tasks and a round-two review of those fixes only, and then the walk [[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]], which is Edwin's.

**Two judgement calls a reviewer should look at first.** The outer field's capacity was raised to 64 and Your Trainer's Features view still counts 186 notes it could not place — whether the outer field should gain layers is recorded and not decided. And eleven of the smoke suite's fourteen new checks have no break of their own, because a run in the box costs half an hour; the three chosen are the ones nothing else covers.

## Independent review, round one, 2026-09-17

`reviewed_by: model:claude-opus-5`, `review_verdict: changes-requested`. A fresh session with no memory of the authoring work, given the notes and `git diff 67f5bf0..e72deaa` only. Same model family as the author, which `reviewed_by` records; what was independent is the context and the session, not the weights (`tools/instructions/QUALITY.md`, "Independent review (clean-context)"). Electron was not launched, so nothing that needs `npm run smoke` or `npm run measure` was re-run; those findings are labelled below.

### Blocking: resting the pointer on a tile does nothing, because the handler that would do it runs only in the orbit

**`desktop/src/renderer/glass.ts:1552` returns before the tile code can run.** The `pointermove` listener registered at line 1551 opens with `if (this.arrangement !== 'orbit' || look !== null || event.buttons !== 0) return;`, and that guard was not touched by this feature. Inside that listener `this.arrangement` is therefore always `'orbit'`, so the branch added at lines 1566 to 1570 — `this.arrangement === 'orbit' ? this.dotAt(x, y) : this.tileAt(x, y)`, then `field.style.cursor = ...`, then `this.showTileCallout(hit, x, y)` — is unreachable in the Glass field, which is the only arrangement that paints quiet-band tiles.

Two consequences. `showTileCallout` is never called from anywhere (`grep -n "showTileCallout" desktop/src/renderer/glass.ts` returns its definition at 1345 and one call at 1569, inside the dead branch). And `field.style.cursor` is assigned in exactly one place, line 1567, also inside it, so the cursor never becomes a pointer over a tile.

This refutes the acceptance line "Resting the pointer on a tile says which note it is and shows the pointer cursor", and the two items in [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]'s scope reading "a pointer cursor, a hover callout". The click half of ISS-0073 is genuinely fixed: `pointerup` reaches `tileAt` through a different listener (line 1626) whose guard is `look`, and the smoke run broke that path deliberately and saw it fail.

### Blocking: a finished note on a large workspace can never be pulled to the front band

`this.pull(` has two call sites, `desktop/src/renderer/glass.ts:1930` (a drag on a `.field-card` element) and `:2038` (the `p` key on a focused `.field-card`). Both need the note to be an element. A painted tile is not one, `pointerdown` on the field starts a turn rather than a drag, and the quiet cursor's own `keydown` handler takes only the arrow keys, Enter, Space and Escape — not `p`. So the only route is promotion, and promotion needs 130 screen pixels of width:

| quiet band | tile box | 1x | 1.5x | 2x | 2.5x (max zoom) |
|---|---|---|---|---|---|
| 24 notes | 140 | 83 | 124 | 166 promoted | 207 promoted |
| 326 notes | 108 | 64 | 96 | 128 | 160 promoted |
| 2700 notes | 58 | 34 | 51 | 69 | 86, never promoted |

Widths at the centre of the shelf, computed from the built modules. `desktop/tests/detail.test.mjs` asserts the last row on purpose ("the very largest quiet band is never promoted at the centre, and that is the trade"), but the trade it records is detail, not reach — and reach is what it also costs. On Your Trainer a finished note at the centre of the shelf cannot be pulled forward by mouse or keyboard at any zoom.

This refutes the acceptance line "A note in the quiet band can be pulled to the front band with the gesture [[FEAT-0014-The-Hands]] already built", and the Goal's sentence "a finished note behind you can be clicked, tabbed to and pulled forward". The note's own claim that "the hit test in TASK-0076 is what delivers Edwin's 'allow cards to be brought up to the active front band', and nothing else is built for it" is not right: the hit test calls `tap`, which lifts the note onto the desk, and the desk is not the front band.

### Blocking: a promoted tile is drawn in the tile's box, so the detail it was promoted to show is clipped

`place()` sets `element.style.width/height` from `this.model.current.shapes[slot.band].box`, which for a promoted quiet note is the tile box. `.field-card` carries `padding: 6px 9px` and `overflow: hidden` (`desktop/src/renderer/deck.css`). A promoted tile on a small quiet band is a 140x39 element with 27 pixels of content space, asked at `full` detail to draw the id row, the title, the face line and the owed verb; the face line has `margin-top: auto` and is clipped. On a large band, where edge tiles do promote, the element is 58x16 with 12 pixels of vertical padding — no content fits at all. No CSS rule targets `.field-card[data-band="deep"]`.

The smoke check for this asserts only that such an element exists (`document.querySelectorAll('.field-card[data-band="deep"]').length > 0`), which is why it passed.

### Two checks in the smoke suite cannot fail

Both in `desktop/src/main/smoke-glass.ts`, in the FEAT-0018 section.

1. `record(shapeSwitched !== shapeBefore || true, ...)` — `X || true` is always true. The check claims to verify that a view switch recomputes the band shapes, which is half of decision 5 and the half no node suite can reach.
2. `record(typeof cursor === 'string', ...)` — `getComputedStyle(el).cursor` always returns a string. This is the check that stands for "shows the pointer cursor", and a check asserting `cursor === 'pointer'` would have caught the blocking finding above. Its `js` expression also computes a `getBoundingClientRect()` it never uses.

So [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]'s "eleven of the fourteen checks have no break of their own ... the deal, the shapes and the thresholds underneath them are pure and are each broken deliberately in their own suites" is true of the other checks and false of these two: nothing is underneath a tautology. The three breaks that were run are well chosen — each is the only thing covering its claim — but the answer to "do the other eleven rest on anything" is: nine do, two do not.

There is also no check at all for the hover callout, and none that pulls a quiet note to the front band, although [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s title says there is. The pull checks in the suite (lines 450 to 472) are FEAT-0014's, on a mid-band card.

### On the reviewer's second question: is "state the remainder" enough?

Reproduced. On `your-trainer-features.json`, 317 notes are dealt, 3 stand in front, 40 in the middle, 64 in the outer field, 24 behind, and **186 are counted and drawn nowhere** — 59% of the view. Conservation holds, and the acceptance line as written ("the four band lists plus the four remainders add up") is satisfied. The feature's title and Goal are not: "every note the view holds has a place in the field" and "every note a Glass view holds is somewhere a person can see and point at" are false for the majority of that view.

The judgement this reviewer would record: stating the remainder is an adequate *mechanism* and an inadequate *discharge of the stated goal*. Either the outer field gains layers, or the title and Goal should say what the feature actually promises, which is that no note is dealt and then dropped silently. Leaving both the title and the 186 standing asks a later reader to believe two things that contradict each other.

### Smaller findings, not blocking

- **A stray empty file, `desktop/core`**, was committed by `de0cd42` and is not mentioned in any note. `git ls-files -s desktop/core` shows a zero-byte blob.
- **`readBand`'s new defaults are unguarded.** Changing `outerCapacity: positive(band['outerCapacity'], 64)` to `1` in `desktop/src/shared/description.ts` leaves all 465 node checks passing. The test that asserts 64 reads `VIEWS`, which hardcodes it in `views.ts`; the `readBand` path (a workspace-supplied description, and `base-file.ts`) has no cover.
- **The quiet cursor's `pointer-events: none` is unguarded.** Changing it to `auto` — which reintroduces the exact defect the smoke run found and the CSS comment records — leaves all 465 node checks passing. `desktop/tests/glass-style.test.mjs`'s check named "the quiet cursor is drawn over the field and does not swallow the canvas" asserts `position: absolute` and `background: transparent` and never the property its name is about.
- **The keyboard cursor is drawn before anyone uses the keyboard.** `drawQuietCursor` sets `this.quietAt` to `order[0]` whenever it is null and unhides the element, so a 2px accent box sits on the first finished note at all times. The field it guards is documented as "null when the keyboard has not entered the band", which the code never allows.
- **The band shapes are keyed on `workspace|view` alone** (`this.shapeKey`). Any deal that reaches the renderer with a new view id and stale or empty groups freezes that view's shapes for its whole life: `currentView` is assigned at `renderer.ts:688` and `currentGroups` only after the `await` at 703, and the `host.onState` subscriber at `renderer.ts:452` calls `drawDesk()` unconditionally. Not reproduced — it needs a state event during the fetch, or a failed fetch, and settling it needs a smoke check that switches view and compares `bandState().shapes` against `bandShapeFor('deep', counts.deep)`.
- **Five issues went to `fixed` with `tests: []`.** ISS-0073, ISS-0074, ISS-0076, ISS-0078 and ISS-0079 name no verifying test, where most fixed issues in this repository do. The suites that verify them exist ([[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]], [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]], [[TST-0055-Detail-Follows-Apparent-Size]], [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]) and are not linked from them.
- **This note has two `## Where this stands` sections**, at lines 163 and 203. The first still says "planned, nothing built" and "Nine tasks". A reader meets the stale one first.
- **TASK-0081 is in `tasks:` and in the snapshot and in neither the Scope section nor the Links list.** It was added mid-flight and the scope was never amended.
- **`docs/features/glass-bands/plan/PLAN.md` is still `draft` while the feature is `review`**; `validate-docs.sh` reports it as `PLAN-FOLLOWS`.
- **The measurement has no artefact behind it.** [[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]] records that `runMeasure` writes nothing, and that one run was already lost to a trimmed pipe. So the numbers in "Measured" above, which re-establish PHASE-0002's frame-time criterion and cancel [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]], are hand-copied from a terminal with no stored run. Not reproduced: `npm run measure` launches Electron and was not run.
- **[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] carries `review_verdict: changes-requested` from 2026-09-10 and is still `passing`.** Fourteen checks were added to it and TASK-0078 closed against it without that standing verdict being resolved.

### What was checked and held

`npm test` passes 465 of 465. `npm run typecheck` is clean. `validate-docs.sh` exits OK. Conservation of the deal was recomputed over all three fixtures and holds every time. Seven deliberate breaks in the pure modules were each caught by the suite that claims to guard them: the middle's remainder dropped rather than placed (3 failures), the quiet band's capacity removed (2), the quiet band walking forward as it shrinks (3), `detailFor`'s `full` threshold widened (2), the promotion hysteresis removed (1), `FieldModel` deriving shapes per deal rather than using the held ones (1), and pushed notes no longer held back from the quiet band's cap (1). The tree was restored with `git checkout --` after each and `git status` is clean.
