---
type: "[[feature]]"
id: FEAT-0017
aliases: ["FEAT-0017"]
title: "An opened note stands in the middle of its neighbours: in Glass and in the orbit a lifted note moves to the middle of the field, and the notes it is joined to gather on a ring around it"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin 2026-09-11: 'when selecting something in orbit the main item should open up and all the directly connected items show as mini notes'", "Edwin 2026-09-11: 'when selecting in glass, the opened up item should replace the note (possibly move to the center?? Review and research how this work fully online) and the associated notes should show their connections and should be shown around the opened note.'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]"]
goal: "Lifting a note in Glass or the orbit grows its card into a pane where the card stood, then moves the pane to the middle of the field. The notes it links to and the notes that link to it gather on a ring around it as small cards, each with a line to the pane, and the rest of the field dims and steps back. Only the note on top of the desk stands in the middle; the other held notes wait as headers at the side. Escape leaves the middle, and a second Escape sweeps the desk as it does today."
requirements: []
tasks: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]", "[[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0056-Reach]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]", "[[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# An opened note stands in the middle of its neighbours

## Goal

**When a person lifts a note in Glass or the orbit, the note moves to the middle of the field and the notes it is joined to gather around it.** Today a lifted note becomes a pane in a cascade down the left of the field, not where its card was. Its neighbours spread across the front band's slots, and the lines to them are drawn only while the pointer rests on a card. In the orbit a lift makes the same pane and the orbit does not rearrange at all.

> [!quote] As asked, Edwin, 2026-09-11
> "when selecting something in orbit the main item should open up and all the directly connected items show as mini notes"
>
> "when selecting in glass, the opened up item should replace the note (possibly move to the center?? Review and research how this work fully online) and the associated notes should show their connections and should be shown around the opened note."

The research Edwin asked for, and the recommendation this feature builds, is [[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 2, written by the main session on 2026-09-11 before this plan. Radial layouts put the note being looked at in the middle and what is one link away on a ring around it (Yee, Fisher, Dhamija and Hearst, 2001), and TheBrain and Obsidian's local graph work the same way.

Six words are used throughout, and each means one thing:

- The **focus** is the held note drawn large in the middle of the field with its neighbours around it. It is not the focus window (the window that owns navigation, [[FEAT-0004-Windows-On-Any-Screen]]) and not keyboard focus.
- A note's **neighbours** are the notes it links to and the notes that link to it, as the sidecar's context read reports them ([[FEAT-0010-Lifting-A-Note]]).
- The **ring** is the set of places around the focus where its neighbours are drawn.
- A **mini note** is a small card on the ring showing a note's id and title.
- The **dock** is the column of headers down the field's left edge where the other held notes wait while one note is the focus.
- **Leaving the focus** puts the field back into today's arrangement for held notes. It takes no note off the desk.

## Scope

**In scope.**

- The ring's geometry, the order neighbours take on it, and the path they move along, as a pure module tested in node ([[TASK-0067-The-Ring-Is-A-Pure-Layout]]).
- The focus itself: the two-stage opening, the dock, the dimmed field, leaving, and the second Escape ([[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]).
- The mini notes, the lines to them, the "+N more" card, and the keyboard route through them ([[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]).
- The same focus in the orbit ([[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]).
- Smoke checks for all of it, and the rewrite of the existing checks this changes ([[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]).

**Out of scope.**

- **A second ring** of the neighbours' own neighbours (Obsidian's depth control). See the open question.
- **The focus on the tablet.** The served page cannot put a note on the desk ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]), so it cannot open a focus, and it keeps today's behaviour.
- **The approve and decline buttons.** The reference's third recommendation is Edwin's to choose; it is filed as [[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]] at `triage` and is not planned here.
- **A focus that survives a reload, reaches another window, or enters an address.**
- **Anything written to the record.** `git status` in the workspace is the check.

## Decisions

Each was chosen while planning on 2026-09-11, most of them by [[REFERENCE-FOCUS-ZOOM-AND-VERBS]]. Each is Edwin's to overturn, and the alternative is named where one was considered.

1. **This revisits [[DES-0002-The-Glass-Cockpit]], by Edwin's request of 2026-09-11.** DES-0002's first revision had "opening re-arranges the field around the note". Rev 7 dropped it because it "does not survive a second note and collapses at three", and split the screen into a field and a desk. The answer here is that only the note on top of the desk is the focus; every other held note waits in the dock, and bringing one forward swaps it into the middle. The field is not re-arranged either: it dims and steps back and keeps its slots. DES-0002 rev 5 also moved neighbours from a ring to "columns that clear it by construction instead of ringing it", after a ring overlapped the open card. The ring here is sized from the pane so that no mini note can overlap it, and [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]] checks that. [[TASK-0068-An-Opened-Note-Moves-To-The-Middle]] appends an amendment paragraph to DES-0002 and does not rewrite it.
2. **The focus is the note on top of this window's desk, and nothing new is stored.** The desk's order is already the stacking order: the last card the store's `deskCardsOf` returns, which `raise-card` puts there. Whether the middle is in use is a switch in the window, like the turn, the zoom and Hide notes: not in the store, not in the state file, not in an address, and off after a reload. A lift, a click on a mini note, and bringing a pane forward turn it on. Escape, Hide notes, widening the focus, dragging it, putting it back with ×, and switching view or surface turn it off. Two consequences are accepted. A note that arrives on top from elsewhere while the middle is in use, such as a throw to this window, becomes the focus. And an address never opens with a note in the middle; Enter on the note's pane header puts it there. *Alternatives considered:* the window keeps its own note id for the focus, so a note arriving from elsewhere never takes the middle; or an address whose note is held opens it in the middle. Neither needs a store change, and either is a small change if Edwin prefers it.
3. **Opening is two stages, about one second in all, slow at both ends** (the reference, after Heer and Robertson, 2007). First, for 300 ms, the card grows into a pane where it stands; in the orbit it grows from the dot. A note lifted from the navigator whose card is not in sight grows from the middle. Then, for 700 ms, the pane moves to the middle at a readable size while the neighbours move to the ring. The slot keeps its dashed outline, as today ([[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]).
4. **A ring holds at most 16 places.** With more than 16 neighbours it shows 15 mini notes and one "+N more" card, and the navigator lists every neighbour, as it does now. A field too small for 16 places holds fewer and counts the rest in "+N more". Which neighbours get a place, in order: the note the person came from, held notes, notes joined to another held note, notes that are owed, the notes this note links to before the notes linking to it, then by id. The places lie on an ellipse sized from the pane, so no mini note overlaps the pane or another mini note, and every one is inside the field.
5. **Neighbours keep the order they had** (Yee et al.). Each neighbour's angle around the middle of the field is taken from where it was drawn before the lift, and the ring keeps that circular order, so a neighbour on the left stays on the left. A neighbour that was not drawn, because it was behind the person or in the quiet band, takes its side from its bearing on the cylinder. A neighbour from outside the view goes at the bottom, in a fixed order. When a mini note becomes the focus, the note that was the focus sits on the new ring on the opposite side, so the line between the two keeps its direction.
6. **Neighbours move by angle and distance around the middle, never in straight lines** (Yee et al.). A straight line would crowd them through the middle, under the pane.
7. **A mini note is a door.** Clicking one, or pressing Enter on it, lifts that note, which becomes the focus: it moves to the middle, its own neighbours gather, and the old focus joins the dock. A held note that is a neighbour is on the ring too, marked as held, and clicking it brings its pane forward instead of adding a card to the desk.
8. **A line runs from the pane's edge to each mini note:** solid for a link the focus makes, dashed for a link made to it, solid and marked "both ways" for a note that does both. Resting on a line, or reaching a mini note by keyboard, shows which way the link runs and the sentence it sits in, which is what the orbit already shows for its links. The reference says the line "names the field it came from"; the orbit in fact shows the sentence, and for a link in a note's properties that sentence is the property's line, so it does name the field. In the bands, Glass reads the orbit's edge list for this, once per index revision, the first time a line is rested on.
9. **The rest of the field dims and steps back, and keeps its slots.** It is drawn at 0.85 of the person's zoom, using [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]'s transform, and at lower opacity. It is not dealt again while the middle is in use. A click on a dimmed card still lifts that note, and it becomes the focus.
10. **While a note is the focus, its neighbourhood does not take the front band.** It forms the ring instead. This changes [[FEAT-0010-Lifting-A-Note]]'s rule and [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]'s. **Leaving the focus deals the field once for the notes still held, by FEAT-0010's rule, and turns to face their neighbourhood:** the turn a lift makes today moves to the moment the focus is left. The reference says leaving "puts the field back exactly". That holds for the orbit, whose places never change, and for every card FEAT-0010's rule leaves where it was; cards the neighbourhood displaces from the front band move, as they do after a lift today.
11. **The other held notes wait in the dock, as headers only.** While a note is the focus, every other held note is drawn as its header, 34 px high, stacked down the field's left edge. The ring and the pane are laid out in what is left of the field. Each note's stored place and size are untouched and come back when the focus is left. A press on a docked header brings that note forward when released without moving, and Enter on it does the same. Dragging a docked header moves nothing. Its tools (every view, orbit, send, widen, put back) work as they do on a pane. The reference says the other notes "stay as panes docked at the side, in today's cascade". Today's cascade is only where a new pane starts, and a person may have dragged one to the middle, where it would lie under the ring. *Alternative:* whole panes at their stored places, under the focus and the ring.
12. **Escape leaves the focus first, and a second Escape sweeps the desk.** Today one Escape sweeps (`sweep()` in `desktop/src/renderer/glass.ts`). Escape with no focus open sweeps, as today. This changes [[FEAT-0010-Lifting-A-Note]], [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]] and DES-0002's rule 3.
13. **The pane in the middle is read, not arranged.** It is drawn at the focus size in the middle; its stored place and size stay as they were. Its resize handle is hidden. Dragging its header leaves the focus and the pane lands where it is dropped. `W` widens it into the reading column and leaves the focus; the reading column is otherwise unchanged. × puts the note back and leaves the focus.
14. **"No field card under a held note" holds whenever no note is the focus.** While one is, the pane and the ring lie over the dimmed field on purpose. This amends [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]'s acceptance line.
15. **Hide notes leaves the focus, then hides** ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]).
16. **Under reduced motion every stage is a cut.** The focus and its ring appear at once and are highlighted for a moment, with the highlight Glass already uses for arrivals.
17. **The keyboard route.** Enter on a navigator row lifts the note, which becomes the focus. Tab moves from the pane to the mini notes in ring order, clockwise from the top. Enter on a mini note makes it the focus. The navigator's group of joined notes lists the focus's neighbours in ring order while a note is the focus, and "+N more" moves keyboard focus to that group. Escape leaves. For a screen reader the ring is a list named "Notes joined to" and the note's id.
18. **In the orbit the same focus opens over the orbit** (the reference). The orbit dims behind, its slow drift stops while a note is the focus, and leaving puts every dot and card back at the same pixel with the same turn and zoom. Both surfaces take the ring from the same context read, so one note shows the same ring in each. *Alternative:* the orbit takes neighbours from the edge list it already holds. Not chosen, because the two surfaces could then disagree.
19. **The focus is not zoomed.** The wheel over the pane in the middle scrolls its text. Anywhere else it zooms the dimmed field behind.
20. **Resting on a mini note reaches for it,** as resting on a card does today ([[TASK-0056-Reach]]): wires run from the mini note to those of its own neighbours that are on screen. Dimmed field cards do not reach while a note is the focus.
21. **This belongs to PHASE-0002, Glass.** Every surface it touches is Glass's: the field, the pane, the orbit. PHASE-0002 is `active`, and nothing here needs PHASE-0004 or PHASE-0003. The one verb-related question (where approve and decline go) is kept out of this feature, because PHASE-0002 states that "the reader carries the verbs".

## Open question for Edwin

**What should "the associated notes should show their connections" show?** As planned, each neighbour shows its connection to the opened note, as a line (decision 8), and resting on a mini note draws wires to its own neighbours that are on screen (decision 20). Two other readings would be more work. Lines between neighbours on the ring that link to each other would be a small addition to [[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]. A second ring of the neighbours' own neighbours would be a new task. Nothing else here waits on the answer.

## Acceptance

- A click on a front card puts a pane over the card's place within 300 ms, and by one second the pane is in the middle of the field at the focus size, with the slot drawn as a dashed outline.
- The store's desk after a lift is exactly what it is today, and the pane's stored place and size never change while it is in the middle.
- Every neighbour, up to 16, is a mini note with its id and title on the ring, with none overlapping the pane or another mini note. With more than 16, there are 15 and a "+N more" card, and the navigator lists them all.
- The neighbours that were drawn before the lift are in the same circular order on the ring.
- A solid line runs to each note the focus links to and a dashed line to each note linking to it; resting on a line shows the direction and the sentence.
- Clicking a mini note makes it the focus, its neighbours gather, and the previous focus joins the dock and sits on the opposite side of the new ring when the two are linked.
- With two notes held, the one on top is in the middle and the other is a header in the dock; a click or Enter on that header swaps them.
- The rest of the field is dimmer and smaller while a note is the focus, and no card changed slot.
- Escape once: nothing is in the middle, every pane is at its stored place and size, the neighbourhood of the held notes takes the front band and the field turns to face it. Escape again sweeps the desk.
- Hide notes, widening the focus, dragging it, × on it, and switching view or surface each leave the focus.
- In the orbit, a click on a dot opens the same focus over the dimmed orbit, with the same ring as in Glass; the orbit does not drift while it is open, and leaving puts every dot back at the same pixel.
- Under reduced motion nothing moves: the pane and ring appear at once and are highlighted.
- Tab reaches the mini notes in ring order from the pane, Enter on one makes it the focus, and the navigator lists them in the same order.
- After a reload nothing is in the middle and the panes are at their stored places; the store's state, the state file and every address are as they were before this feature.
- After a walk of all of the above, `git status` in the workspace is unchanged.

## Spec-ambiguity check, 2026-09-11

Run before any ID was allocated (`tools/skills/issue-intake/SKILL.md`, step 1).

- **Every term has one meaning.** "Selecting" means lifting, the one thing a click on a card does in Glass. "Open up" and "the opened up item" mean the held note's pane. "Mini notes" means small cards with id and title. "Glass and orbit" means the two arrangements of the field. "Focus" is a new term here and is glossed above against the two meanings it already has.
- **Expected against actual is observable.** Today a lift puts a pane in the left cascade and spreads the neighbours across the front band ([[REFERENCE-FOCUS-ZOOM-AND-VERBS]], "What Deck does today", checked against `lift()` and `nextPanePlace()` in `desktop/src/renderer/glass.ts`).
- **Scope is bounded** by the out-of-scope list above.
- **Success is verifiable.** The suite is [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]], the smoke checks are listed in [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]], and the walk is [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]].
- **Ambiguous: "the associated notes should show their connections".** The readings lead to different amounts of work, so the reading the reference chose is built and the others are the open question above.
- **"Possibly move to the center??"** was a question to research, and the reference answers it: yes, in two stages, so the note is first seen where it was.
- **Hidden conflicts: several, each settled by Edwin's request and amended in place by a task.** See the impact analysis.

No sibling issue: this is a feature request, and a search of `docs/issues/` for "centre", "center", "ring", "mini" and "focus" found no issue asking for it.

## Impact analysis, 2026-09-11

**What was checked.** [[DES-0002-The-Glass-Cockpit]] ("The desk, and the two surfaces", its three rules and revisions 1, 5, 7 and 9), [[FEAT-0010-Lifting-A-Note]] with [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]] and [[TASK-0037-What-These-Share]], [[FEAT-0014-The-Hands]] with [[TASK-0054-A-Held-Note-Is-A-Pane]], [[TASK-0055-Throw-To-A-Screen]] and [[TASK-0056-Reach]], [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]] (Hide notes, the desk per view, stacking across the two lists), [[FEAT-0001-The-Corpus-Has-An-Inside]] with [[TASK-0004-Landing-Opens-The-Note]], [[FEAT-0006-Every-State-Has-An-Address]], [[PHASE-0002-Glass]]'s scope and exit criteria, the walk [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]], and the smoke run [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]. This project has no `REQ-*` notes; the acceptance lines of those notes are the constraints.

**Contradictions, each resolved by Edwin's request, and each amended in place by a task rather than rewritten:**

- [[DES-0002-The-Glass-Cockpit]], rev 7: opening re-arranging the field "does not survive a second note and collapses at three"; rev 5: neighbours in columns rather than a ring; rule 3: "`esc` sweeps". Revisited by decisions 1, 4 and 12. [[TASK-0068-An-Opened-Note-Moves-To-The-Middle]] appends an amendment paragraph at the end of "The desk, and the two surfaces".
- [[FEAT-0010-Lifting-A-Note]], acceptance: "While a note is held, every note it links to and every note linking to it is in the front band at full size", and "esc empties the desk". Now true only while no note is the focus (decisions 10 and 12). Amended by TASK-0068 (Escape) and [[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]] (the front band).
- [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], acceptance: "esc puts back every note" and "No field card is dealt underneath a held note". Amended by TASK-0068 (decisions 12 and 14).
- [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], acceptance: the neighbours in the front band "and the field has turned to face them" after a lift. Now after leaving the focus (decision 10). Amended by TASK-0069.
- [[TASK-0054-A-Held-Note-Is-A-Pane]]: a lifted note is placed by `nextPanePlace()` in the left cascade and drawn there, and "a press anywhere on a pane raises it" (ISS-0066). While a note is the focus, the other panes are docked headers and a press brings one forward only when released without moving (decisions 11 and 13). Amended by TASK-0068.
- [[FEAT-0001-The-Corpus-Has-An-Inside]] and [[TASK-0004-Landing-Opens-The-Note]]: "Landing on a node lifts it onto the desk and opens it in Deck's reader". Landing now also opens the focus over the orbit. The rule that no note content is drawn in the field beyond id, title, status and a link's sentence still holds: a mini note shows id and title. Amended by [[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]].
- [[PHASE-0002-Glass]], exit criterion 3: "Lifting a note brings its neighbourhood into the front band". Amended by TASK-0069 to say the ring, then the front band after leaving.
- [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]], the walk for FEAT-0010: "Watch the field turn" and "Press esc. The desk should empty". Amended by TASK-0069 so the walk still describes what Deck does.

**Tensions that are not contradictions.**

- **The existing smoke checks.** About a dozen Glass checks lift a note and then expect the neighbourhood in the front band, the field turned to face it, a pane at its cascade place, or one Escape to sweep. [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]] rewrites each to leave the focus first or to assert the new behaviour, and shows each still fails with its original fix removed. None is deleted.
- **The measurement** ([[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]) puts notes on the desk by dispatching to the store, not by a lift, so no focus opens and its numbers stand.
- **The address.** Nothing changes: the focus is not addressed (decision 2). The architecture rule that every reachable state has an address is met the way it is for the turn and the zoom: the address names the view, the desk and the note, and the focus is how one window is looking at them.
- **What these share** ([[TASK-0037-What-These-Share]]). Mini notes joined to more than one held note carry the same mark as field cards, and the desk bar's count is unchanged.
- **Stacking across the two lists** ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decision 8). The focus is the top of the drawn desk, which already crosses both lists.
- **Phase.** No conflict: PHASE-0002 is active.

## Risk scan, 2026-09-11

**No trigger applies, so no `RISK-*` note is created.** Nothing here adds a dependency, an environment variable, a configuration surface, a stored field, a path change or a new exposure. New files go in existing directories: `desktop/src/shared/focus-ring.ts` and `desktop/tests/focus-ring.test.mjs`.

**Two small costs are accepted and written down rather than tracked.** In the bands, the first line rested on reads the orbit's edge list once per index revision; [[FEAT-0001-The-Corpus-Has-An-Inside]] measured that request at 39 to 117 ms cold and 0.59 to 2.39 MB. That is one request, not a long-running step. The smoke run grows by about twenty checks.

## Links

- Phase: [[PHASE-0002-Glass]]
- Plan: `docs/features/glass-focus/plan/PLAN.md`
- Tasks: [[TASK-0067-The-Ring-Is-A-Pure-Layout]], [[TASK-0068-An-Opened-Note-Moves-To-The-Middle]], [[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]], [[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]], [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]
- Suite: [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]
- Smoke run: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Acceptance walk: [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]
- Research and recommendation: [[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 2
- Design revisited: [[DES-0002-The-Glass-Cockpit]], "The desk, and the two surfaces"
- Code: `desktop/src/renderer/glass.ts`, `desktop/src/renderer/renderer.ts`, `desktop/src/renderer/navigator.ts`, `desktop/src/renderer/index.html`, `desktop/src/renderer/deck.css`, `desktop/src/shared/slots.ts`, `desktop/src/shared/neighbourhood.ts`, `desktop/src/main/smoke-glass.ts`; new: `desktop/src/shared/focus-ring.ts`, `desktop/tests/focus-ring.test.mjs`

## Where this stands

**2026-09-11: planned, nothing built.** Five tasks, one node suite, smoke checks and a share of one walk. It is built after [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]'s first task, whose transform draws the dimmed field smaller. The first task here, [[TASK-0067-The-Ring-Is-A-Pure-Layout]], needs nothing and can start at any time.

**2026-09-11: built and tested; the walk is Edwin's.** Every task is done. The node suite passes and fails for each of its named breaks, and the Glass section of the smoke run drives every acceptance line with a real pointer, wheel and keyboard; each check was seen to fail with its break, and the task notes say where one was caught another way. `bash tools/scripts/run-smoke.sh both` passed. The feature is at `review`: the walk [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]] is Edwin's.
