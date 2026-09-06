---
type: "[[design]]"
id: DES-0002
aliases: ["DES-0002"]
title: "The glass cockpit — depth is priority, every view is a re-arrangement rather than a page, and the console is furniture that floats over the notes"
role: proposal
decided: ""
status: "proposed"
phase: ""
owner: user:edwin
created: 2026-09-05
updated: "2026-09-06"
source: ["Edwin 2026-09-05, rev 2: 'That new design though would provide us with some huge new options ... multiple consoles for instance which would otherwise be hidden behind tabs and also we could still decide to have lists available ... we could now easily allow for multiple cards to be visible at once'", "Edwin 2026-09-05, rev 2: 'I was not able to open up feat-0143 and try out the selection/opening up functionality'", "Edwin 2026-09-05, rev 2: 'we could show different information on the closed cards, like progress bars for the phases (I didn't see phases in overview and other places even though we group by phase in lots of places?)'", "Edwin 2026-09-05, rev 2: 'nice to have the orbit glass view integrated in this, and the pulse view for the consoles/agents ... if we can make this a multi monitor application ... the library one, should probably turn into a file browser ... also consider the actual implementation and if this would be performant enough?'", "Edwin 2026-09-05: 'I assume this view allows for 360 degree turn around, allowing to see and store less important items out of sight?'", "Edwin 2026-09-05: 'The minority report view could work ... I do not consider this to be a vr view ... instead I would like you to design each of the current sets of views for this, these views should be selectable and each view should concentrate on the same details and notes currently in that view, making some note-types and states more important then others (directly in view)'", "Edwin 2026-09-05: 'The console is a view which sits at the bottom middle but can be moved anywhere and can be made smaller/bigger if needed and all the notes can be arranged around the console ... maybe the console should be slightly transparent'", "Edwin 2026-09-05: 'the console and usage view in the left pane need a different approach, possibly for the console statuses show some carousel where the current active ones or selected ones can be moved to the front? Also the repo/project selection could be handled similarly'", "Edwin 2026-09-05: 'When selecting a note it opens up more fully and also somehow brings the associated notes into view'"]
asset: "DES-0002-the-glass-cockpit.html"
implements: []
supersedes: ""
superseded_by: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[PHASE-028-Borrowed-Capability]]", "[[DES-0002-Cockpit-Design-System]]", "[[project-os-cockpit#ADR-0025]]", "[[project-os-cockpit#ADR-0020]]", "[[project-os-cockpit#FEAT-0003]]", "[[DESIGN]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
tags: [design, glass, views]
---

# The glass cockpit

> **This is [[DES-0001]]'s GLASS treatment taken seriously as an application**, at Edwin's direction and with the headset dropped: a desktop surface, mouse and keyboard, one window. It is a whole cockpit — all eleven views, the console, the agent sessions, the workspace picker — not a decoration over the existing one.

## Problem

**The current cockpit sorts by position; a glass surface can sort by depth, and depth is the axis this record actually needs.**

The left pane is a list. A list has one dimension, so everything in it competes for the same scarce thing: vertical position. That is why [[project-os-cockpit#ADR-0025]] had to be written — *what needs a person goes first, in every view* — and why `nav_payload` prepends `_needs_you_group` to all eleven modes and appends `suppressed_group` to most of them. The rule exists because a list cannot say *"this matters more"* except by putting it above something else.

Measured in `cockpit.py`: **every view is already three bands** — what needs you, the view's own subject, and what the in-flight rule quieted. The list flattens that into a scroll.

## Approach

**Depth is priority. One field, eleven arrangements.**

Notes are cards in a perspective field. A card's **z** is how much it wants you, and that is not decoration — it is the same predicate `obligations.owed_items` already computes:

- **Front plane** — what needs a person. Large, sharp, unavoidable, exactly the band [[project-os-cockpit#ADR-0025]] forces to the top of every list today.
- **Mid field** — the view's own subject, arranged by the view's own rule.
- **Deep field** — the quiet: terminal work, suppressed items, the 70% of this corpus that is finished. Small, dim, blurred, still there.

Five consequences follow, and each answers one of Edwin's questions.

**0. The field is a cylinder, and you turn in it.** Edwin's question — *"I assume this view allows for 360 degree turn around, allowing to see and store less important items out of sight?"* — settled the shape. It does, and it changes what the quiet band **is**. Rendered small and dim in front of you, 70% of this corpus is still a thousand rectangles between you and the nine things that matter. Placed **behind** you it costs nothing, stays one gesture away, and is counted on screen so it cannot be quietly lost. An open card also offers *put behind me* — the direct-manipulation form of `suppressed_group`, per session, and never a write.

**1. A view is a re-arrangement, not a page.** Switching from Features to Issues does not navigate; the same cards fly to new positions under a new rule. You *watch* a note change importance, which is a thing the current cockpit cannot show at all. Eleven arrangements are specified: `overview`, `intent`, `features`, `tasks`, `issues`, `tests`, `publication`, `review`, `active`, `library`, `recent`.

**2. The console is furniture, not a pane.** It defaults to bottom-centre, drags anywhere, resizes, and is translucent — so the field reads through it. The layout treats it as an **obstacle**: cards flow around its footprint rather than under it, except the deep field, which is allowed to sit beneath the glass because that is what the transparency is for.

**3. Consoles and sessions are one carousel, not a left-pane list.** Every running thing — a workspace shell, an agent session — is a card on an arc at the lower left. The front card is the one the console slab is showing. Bringing another forward switches what the slab is attached to, which is the operation the current agents panel makes you do in two places.

**4. The workspace picker is the same mechanic at a different radius.** Twelve repos on a slow ring at the upper left, edge-on, the current one facing you and carrying its owed count. One gesture, one metaphor, learned once.

**5. Selecting a note pulls its neighbourhood with it.** The card comes to the front plane and opens; every note it links to, and every note linking to it, flies into a ring around it; everything else recedes and dims. This is the corpus's 16148 wikilinks doing work in the reading surface rather than in a graph view nobody opens.

## What the shape buys, which rev 1 undersold

Rev 1 argued that depth shows the same things better. That was too small a claim. **A field with room in it makes several things possible that the cockpit cannot do at all** — not for want of a feature, but because one stacked pane has nowhere to put a second thing.

- **Many consoles at once.** One terminal panel means a second shell is a tab, and a tab means the first is *gone*. You cannot watch two agents work. Here each console is a slab that drags, resizes and fades on its own, and the carousel deals a new one on ⇧click.
- **Lists, where a list is better.** This is the answer to my own objection below. The pane *is* the list today, so a spatial view can only replace it. Here **as list** opens the current view as a dense table beside the field, and clicking a row flies the field to that note. Triage, which is a counting job, gets the surface that is good at counting.
- **Several notes open at once.** ⇧click, or **pin beside**. They tile at the front plane and each keeps its own ring of links.
- **A file browser rather than a metaphor.** The Library view listed *note types*; the actual directory tree was visible nowhere. It becomes **Files**, with a hand-off to the system browser.
- **[[DES-0001]]'s ORBIT and PULSE fold in** as a view and a panel rather than separate applications — the link field becomes a thirteenth arrangement where distance is connectedness, and the agent lanes float over the field instead of replacing the nav pane.

**And the tension that creates immediately.** Open four panels in the prototype and the field empties: the obstacle rule works, and there is nowhere left to deal a card. Panels and the field compete for the same pixels, and on one monitor that competition has no good answer. That is the argument for many monitors, not a bug to tune away.

## Closed cards carry different things

A closed card had one job in rev 1 — id, title, status — which wastes the one thing a card has that a list row does not: **area**.

- **A phase carries a progress bar**, because a phase's whole meaning is *how far through are we*. Measured: `PHASE-041` is 21/23, `PHASE-028` is 0/11, `PHASE-999` is 0/27 and that is the parking lot showing its size.
- **An issue or risk carries its severity chip**, because severity decides whether you read it now.
- **A test carries how many notes it covers**, because a test covering nothing is a failure mode this repo has hit, and zero should be visible.
- Everything else carries its phase and its outbound link count.

**Edwin was right that phases were missing.** Rev 1 grouped by phase in four views and never rendered a phase: the sector labels were bare IDs with no note behind them, which is exactly the *"a number says what it counts"* rule this project already wrote down. The phase note now leads its own sector in Features and Tasks, and appears as a card in Overview and Active.

## Many monitors

The four surfaces have genuinely different refresh rates and attention costs, so each wants a screen.

- **Screen 1 — the field.** The record, the rail, the compass, the ring. Nothing that scrolls, nothing that updates on its own. Freed of panels it gets its full angular budget back.
- **Screen 2 — the consoles.** Every shell and session tiled rather than carouselled; PULSE is this screen at rest. This is the screen that *moves*, and keeping it off the reading screen is the point.
- **Screen 3 — the reader and the lists.** Where a list beats a field, it gets a whole display.

**What it costs to build:** one state, several windows. Extra `BrowserWindow`s are cheap; the work is that yaw, view, open set and pushed set stop belonging to any window. The shell already solves this for workspaces — main process holds state, renderers subscribe — so it extends a pattern rather than inventing one.

**The genuinely new question is what "in front of you" means when there are three fronts.** My answer: only screen 1 has a front plane. The others are surfaces, not fields, and get no depth axis. Two screens both claiming to show what needs you is how someone ends up trusting neither.

## Would it run — measured, and it changed the design

Rev 2 asserted blur was the expensive part. Rev 4 measured it, in both renderers, **turned to face the quiet band** — the worst case, because that is when the most cards are on screen.

| facing the quiet | blur | fog + detail |
| --- | --- | --- |
| cards on screen | 55 | 55 |
| cards running a blur pass | **52** | **0** |
| blurred area | **288,726 px²** | **0** |
| glyphs rasterised | 4,299 | **1,819** |
| cards still showing progress / severity | 55 | **55** |

*(The blurred-area figure was reported as 821,408 px² in rev 4. That reading was taken while transitions were frozen, so the rects were unscaled. 288,726 px² is the corrected number.)*

**The measurement changed the look, not just the cost.** I expected to trade appearance for speed. The cheap version reads *better*: a blurred card is unreadable and still pays for a full title, so the quiet band was 52 smeared rectangles of text nobody can use. Dropping the title turns each into a small ID tile and lets one gradient do the receding. That is aerial perspective — distance loses contrast and detail, it does not go out of focus. **Blur was simulating a camera, and there is no camera here.**

**And one thing reasoning would not have found:** the blur cost is near zero while you face the front, because the quiet band is *behind you*. The expensive band is off-screen most of the time, and the cost arrives exactly when you turn — the moment the interface most needs to stay smooth.

**Rev 5 had the detail level backwards.** Distance was dropping the *face* — the progress bar and the severity chip — and keeping the title. Exactly wrong: a bar is a rectangle and a chip is one word, both of which survive being small; a sentence does not. The far field now reads as identifier, status and progress, which is *more* information than the blurred version carried and less work than either.

## The desk, and the two surfaces

Edwin: *"I think I want to be able to open as many notes as required and arrange them on top of each other ... I am not sure how that works with the associated notes and how that works with closing them."*

He had not thought it out, and neither had I — rev 1's "opening re-arranges the field around the note" does not survive a second note and collapses at three. **The fix is to stop treating it as one surface.**

- **The field** is every note, arranged by the view's rule. It re-arranges when the view changes, because the arrangement is the *view's* opinion.
- **The desk** is what you picked up — **one per view**, surviving workspace switches.

**The desk belongs to the job; the view is the job.** Rev 7 kept one desk across every view, which turns switching into clutter you have to clear. Edwin: *"each view should allow for its own selected notes."* He is right, and the reason is that the two boundaries are different kinds of thing. Triaging issues, closing a phase and preparing a release are different work with different notes. **A workspace is not a job** — it is which repo you are looking at — so a job spanning repos is ordinary, and the desk survives that boundary while not surviving the other. The desk bar names any other view still holding notes, so nothing is silently left behind.

**So opening is lifting.** A note comes out of the field onto the desk and its slot stays behind, ghosted, so you can see the hole and put it back. Nothing is recorded: a note on the desk has no status and owes nothing.

Three rules answer his three doubts.

1. **Overlap anywhere except a header, and the field flows around the desk.** Drag a note where you like; if it would cover another's header it snaps below. Note windows also count as obstacles when slots are dealt, so a promoted neighbour is never placed underneath one — the same rule the console panels already use. Every note in a stack of any depth still shows its id, status and face — always readable, always clickable, and clicking a header brings it to the top. A stack of eight is eight headers and one body.
2. **The front band becomes the neighbourhood.** While you hold a note, its neighbours take the front band at full size and full detail, and picking the note up turns you to face them. This is not a special case: the front plane means *what wants you*, and while you are holding something, what wants you is what is joined to it. They stay **field** cards — click one and it joins the desk — so five notes never drag sixty onto it, and only the focused note claims the band.
3. **Closing is three verbs and none of them destructive, and adding needs no modifier.** Every click adds; `×` puts one back, `⌥×` closes the others, `esc` sweeps. A background click does nothing, because sweeping a desk by accident is unforgivable.

**And one capability that only exists because of the split.** With more than one note on the desk, the field marks what is joined to *more than one of them*, and the desk bar counts it. Put three issues down and the field answers **what do these have in common** — a question asked constantly at triage and close-out, and one the current cockpit cannot answer at all. It works only because the neighbours stayed in the field.

**Use cases, from this repo:** answering a review (the design, the verdict, the notes the findings cite); closing a phase (the phase and every unresolved child — `PHASE-041` closed on 5 of 6 criteria and that needed both visible); tracing a regression (the change note, the test that missed it, the task that caused it); writing a change note (synthesising three notes into a fourth); comparing two proposals.

**The desk survives a workspace switch** — Edwin's call, and right. What you picked up is yours, not the workspace's, and "this issue in `your-trainer` against the ADR in `project-os`" is a job the current cockpit cannot serve at all. It does not violate [[project-os-cockpit#FEAT-0093]], and the distinction matters: the desk holds notes from several repos, but **each note's content still comes from its own sidecar**. Nothing queries across repos — the desk is a place to put things, not a joined index. Each card carries its repo tag.

**What I would still argue about.** Whether a stack should be nameable, since "the notes for answering this review" is a real object with a lifetime — but a saved desk is one step from a saved query, which is a different feature wearing this one's clothes. Deliberately not built.

## Keeping it alive while pooling

Pooling costs animation, and a field that snaps is a dead field. The two only conflict if you pool the wrong band — and **the animation budget is bounded by the visible arc, not by the corpus.** Fifty cards moving is nothing; there are never fifteen hundred on screen.

- **Pool only the far band.** The front (~12) and mid (~40) are bound to their notes and never recycled, so they animate freely between views. The quiet band holds the thousand, and nobody follows an individual card there. Full motion where it is watched, pooling where the count is.
- **Recycle only off-screen.** A card about to animate is on screen by definition, so it is never a recycling candidate. That is what makes the rule above safe rather than hopeful.
- **Cross-fade, never cross-morph.** Sliding one element from one note's position to another's is a lie about a note that never moved. Fade out as A, in as B — 120ms, opacity only.
- **FLIP for view switches.** Measure first and last, invert, play. Works with a pool as long as identity is stable within the frame, which the recycling rule guarantees.
- **Stagger, do not synchronise.** Cards settle in a wave from where you are facing. This is in the prototype now and costs nothing — it is a `transition-delay`, not extra work. Everything arriving at once reads as a jump; the same motion staggered reads as a field settling.

**Why this is not a compromise:** transform and opacity transitions run on the compositor and touch neither layout nor paint. The cost is per animating element *on screen*, and the arc caps that near 55. What pooling genuinely removes is the continuity of a card that leaves and returns — imperceptible, but it is why opened and pinned cards live outside the pool.

The rest of the budget:

- **The visible arc holds about 55 cards at the widest.** 1537 elements is 28× more than can ever be seen, so the build is **a virtualised list in polar coordinates**: pool roughly 120 card elements and rebind them as the yaw changes. The artifact carries a bench with this as a switch; it is the single most important decision in the implementation.
- **`filter: blur()` is gone**, replaced by one gradient painted once plus a detail level that *removes* work rather than adding a pass over it.
- **`translate3d` is GPU-composited** and a few hundred layers is ordinary. Never animate `width`, `top` or `filter`.
- **Slot assignment runs on view change and panel move, never on yaw** — which is why turning stays smooth while the card set stays stable. It is O(notes) and must not enter the frame loop.
- **The wire overlay** becomes a single canvas past ~200 edges, and any cap must be stated on screen rather than silently applied.
- **A layout that survives restarts is [[TASK-0002]]'s problem**, already written for [[FEAT-0001]]. The same work serves both designs.

**What I cannot tell you: frame times.** The bench measures them live, but the tab I built this in was in the background and browsers suspend `requestAnimationFrame` there — every number would have been zero or invented. The counts above are structural and I stand behind them; the milliseconds are on the page for the reader's own machine.

**The bound I will commit to:** with pooling and no blur this is an ordinary compositing workload — a few hundred GPU-composited layers, which browsers do comfortably. Without pooling it is 1537 elements with 52 of every 55 on screen running a blur pass. **Pooling is not an optimisation to add later, it is the architecture** — and this prototype, which still skips it, proves the interaction and nothing about the cost.

## The bug that made this untestable twice

Edwin could not open a note in rev 1 or rev 2. Two different causes, and the second is worth recording because it is a property of the technique rather than a slip.

**Rev 1:** quiet cards carried `pointer-events: none`. `FEAT-0143` is `done`, therefore always in the quiet band, therefore unclickable in every view. Fixed by making anything visible clickable.

**Rev 2:** the fix did not work, and my own test said it did. **`.field-inner` is a flat box at z = 0 with `inset: 0`, and every card sits at negative z — so the parent's own plane is in front of all of them and swallows every click.** Nothing in the field was ever reachable by a mouse.

It survived because I verified with `element.click()`, which **dispatches a click event directly and never hit-tests**. The check passed, the interface did not work, and the difference between those two is the whole reason the check was worthless. Reproducing with a real pointer sequence showed `pointerdown` landing on `field-inner` at the exact centre of a card.

The fix is one line — `pointer-events: none` on the perspective container and its inner plane, `auto` on the cards — and the lesson is a build rule:

> **A `preserve-3d` container is an invisible pane in front of everything it contains.** Any depth interface must make its containers pointer-transparent, and must verify input with real pointer events, because synthetic `.click()` bypasses exactly the layer that breaks.

## What pooling costs, since it is the architecture

**A fixed set of DOM elements recycled across a much larger set of notes** — 120 elements for 1537 notes, the way a scrolling list reuses rows. It buys constant cost regardless of corpus size. It takes four things away, and each forces a rule:

- **Animation between states.** A recycled element cannot animate from one note to another. *Only recycle an element after it leaves the visible arc.* The "watch a note change importance across views" effect survives only for cards that stay bound.
- **Browser find-in-page.** `⌘F` searches the DOM, so it would find 120 cards of 1537 and silently miss the rest. *The application owns search*, and must never let the browser's own find look like it worked.
- **The accessibility tree.** A screen reader sees the pool, not the corpus. *The list panel becomes the accessible view* rather than a convenience.
- **Per-element state.** An open editor, a text selection, a scroll position all die on reuse. *Opened, pinned and neighbour cards live outside the pool*; the pool holds only closed cards in the field.

One consequence worth stating on its own: **placement must precede focus.** A note that is not materialised has no element to focus, so "fly to it, then open it" is a requirement rather than a flourish.

The short version: pooling buys unbounded corpus size and costs the browser's built-in affordances. A design that skips replacing them works beautifully for a sighted user with 80 notes and fails everyone else at 1537.

## Stop mocking, and build the narrow slice

Edwin, on the defects he found: *"I can probably come up with lots of issues."* He is right, and that is the most useful signal in this whole exercise.

**The triage rule:** a defect is a *design question* if the answer changes what you would build; it is *polish* if a real implementation fixes it for free. Both of his were design questions, and both are answered — a wire anchors at the card's **edge** on the bearing of its neighbour, and an open card **owns an exclusion zone**, with neighbours flanking in columns rather than ringing it, which clears it by construction rather than by nudging.

**The stopping rule: stop when the next defect is polish.** That is roughly now. Three of the last four fixes were fights with the prototype's own scaffolding rather than with the design — hand-rolled projection, a measurement environment that lies about frozen transitions, synthetic clicks that skip hit-testing. Those are the cost of simulating a renderer instead of using one, and they teach nothing about the interface.

**What to build instead is not "the glass cockpit".** It is the narrow slice every version needs and only real data can validate: a **read-only field view inside the cockpit that exists** — pooled, no writes, no console, no panels — over the real 1537 notes. That is [[FEAT-0001]] as already written: [[TASK-0001]] for the edge payload, [[TASK-0002]] for a layout that stays put while the corpus adds 634 notes a month, and a renderer.

It answers three things this mock structurally cannot, each a go/no-go for the whole idea: **does the field stay legible at real scale, does a stable layout survive real growth, and what does pooling actually cost.** None can be answered with 80 fake cards.

**What the mock is still cheap for** is the arrangement rule per view — whether Issues should sector by severity or by age needs no renderer, no real data and no performance budget. That part is worth continuing here.

## What this does not change

The **write path**, the **verbs** and the **guards** are the cockpit's, unchanged. A human-only verdict is still refused server-side to an agent ([[project-os-cockpit#REQ-0026]]); the registry still owns the verb ([[project-os-cockpit#ISS-0153]]); obligations still live with their subject ([[project-os-cockpit#ADR-0020]]) — the front plane is *where the subject is*, not a central queue.

The **reader** is also the cockpit's. An opened card renders the note with the existing renderer. A second Markdown parser is the mistake [[project-os-cockpit#ISS-0151]] names, and a glass surface is not a reason to make it.

## Regions

- `masthead` — what this is, and that it is one window rather than a mode
- `stage` — the live prototype: the field, the view rail, the console, the carousel, the ring
- `depth-rule` — the three bands and what decides a card's distance
- `views` — the eleven arrangements, each with its own rule and what it brings forward
- `console` — the slab: default position, drag, resize, transparency, and the obstacle rule
- `carousel` — consoles and sessions on one arc
- `ring` — the workspace picker
- `focus` — selecting a note, and the neighbourhood that arrives with it
- `chrome` — search, tabs, back/forward, the validator, the inbox: where the rest of the cockpit went
- `unlocks` — what the shape makes possible that the current cockpit cannot do at all
- `faces` — what a closed card carries, per note type
- `monitors` — the three screens, and what one state across several windows costs
- `performance` — the pooling argument, with the numbers it rests on
- `objections` — what is wrong with this, including the two things depth is bad at
- `chrome` is listed above; `views` carries the eleven arrangements as a table

## Tokens

**Status and severity are the implementation's, verbatim** from `src/project_os_cockpit/static/base.css`, declared light-first so `design_tokens.read_tokens` compares like with like.

The glass chrome — the cyan instrument palette, the depth fog, the slab tint — is this artifact's own and specifies nothing beyond itself. **It carries a known cost, recorded in [[DES-0001]] and unchanged here:** washing the status bands toward one instrument colour collapses four of the six into 25 degrees of hue. This design's answer is that **depth, not hue, carries priority** — hue is left to say only what the note *is*, and the alarm red is held out for `blocked`.

## The strongest version of this is smaller than the pitch

The document opens by calling this a replacement, and the prototype earns most of that. But **depth is bad at counting and bad at comparing**: "how many issues are open" is answered instantly by a list and badly by a field, and two cards at different depths are different sizes, so they cannot be compared. A list is uniform on purpose.

So the version I would defend is not the whole cockpit. It is **a twelfth view inside the cockpit that exists**, sharing its reader, its verbs and its guards — good at *what wants me* and *what is this connected to*, and honest that a list is better at the rest.

## Out of scope

- **VR and hand tracking.** Explicitly dropped at Edwin's direction. Mouse, keyboard, one window.
- **Building it.** No feature, task or phase is allocated.
- **The nine other designs.** [[DES-0001]] holds those; this is one of them taken further because it was the one worth taking further.

## Revisions

- 2026-09-05 — written; the eleven arrangements, the console slab, the carousel, the ring, the focus ring
- 2026-09-05 — **rev 9.** Reverses rev 7 on Edwin's correction: **one desk per view**, not one desk across all of them. The reason is that the two boundaries differ in kind — the view is the job, and a workspace is only which repo you are looking at, so the desk survives a workspace switch and not a view switch. Also made note windows count as obstacles when slots are dealt, so a promoted neighbour is never placed underneath one.
- 2026-09-05 — **rev 8.** Two regressions Edwin caught, both mine. Opening required a modifier, so in practice only one note could be opened — **every click now adds**, and a background click no longer sweeps. And I had talked myself into "neighbours should not move", when what he valued was that they became *readable*: they now take the **front band** at full size, which is not a special case but the axis already meaning what it meant — the front plane is what wants you, and while you hold a note, that is what is joined to it. Picking a note up turns you to face them. The desk also survives a workspace switch now, on his call: it does not cross [[project-os-cockpit#FEAT-0093]] because each note's content still comes from its own sidecar, and each card carries its repo tag.
- 2026-09-05 — **rev 7.** The desk, after Edwin asked for many notes stacked and flagged that he had not thought through the neighbours or the closing. Split the one surface into two: the field re-arranges with the view, the desk holds what you picked up and survives view switches. Overlap allowed anywhere except a header, so a stack of any depth stays addressable; neighbours light up in the field rather than being pulled onto the desk; closing is three non-destructive verbs. The split produced a capability neither of us was looking for — with several notes down, the field marks what is joined to more than one of them, which answers *what do these share* and the current cockpit cannot.
- 2026-09-05 — **rev 6.** Two things Edwin caught. The detail level was backwards: distance dropped the progress bar and kept the title, when a bar survives being small and a sentence does not — the far field now carries id, status and progress, which is more signal than the blurred version had. And the field had gone lifeless, so cards settle in a wave from where you are facing (a `transition-delay`, free), with the rules for keeping animation while pooling written down: pool only the far band, recycle only off-screen, cross-fade rather than cross-morph, FLIP on view switches. Corrected the blurred-area figure from 821,408 px² to 288,726 px² — the first was measured while transitions were frozen.
- 2026-09-05 — **rev 5.** Fixed the two defects Edwin found, both design questions rather than polish: wires anchor at a card's edge on its neighbour's bearing, and neighbours flank the open card in columns that clear it by construction instead of ringing it. Replaced CSS `perspective` with an explicit `scale()` so the geometry is knowable rather than inferred. Added what pooling costs — animation between states, find-in-page, the accessibility tree, per-element state — and the recommendation to stop mocking and build the narrow read-only slice.
  **A correction:** I first concluded that `getBoundingClientRect` ignores perspective. It does not. Chrome freezes CSS transitions in a background tab, so every rect and computed style I read was the frozen start value. The explicit-scale change still stands on its own merits, but the reason I reached for it was wrong, and it is the same mistake as the `element.click()` one: measuring a browser UI in an environment that quietly lies.
- 2026-09-05 — **rev 4.** Measured the blur claim instead of repeating it, and it changed the design: facing the quiet band, blur runs on 52 of 55 visible cards over 821,408 px² and pays for 4,299 glyphs against 1,109. The cockpit now draws depth with fog and detail-by-distance, which is cheaper *and* more legible — a blurred card is unreadable and still costs a full title. Added a live A/B bench with the three techniques as switches, and a renderer toggle in the stage itself. Frame times are left for the reader's machine, and the artifact says why.
- 2026-09-05 — **rev 3.** The click still did not work: `.field-inner` is a flat plane at z=0 in front of every card, and it ate every pointer event. Containers are now pointer-transparent. Recorded as a build rule, because `element.click()` passed while the interface was unusable.
- 2026-09-05 — **rev 2.** Fixed the first half of that bug: quiet cards carried `pointer-events: none`, so `FEAT-0143` — which is `done`, therefore always quiet — could not be opened at all. Every card you can see is now clickable, and the search box works: type an ID and the field flies to it. Added per-type card faces with real phase progress bars, phases as cards leading their own sectors, multiple consoles, list panels, files, pulse, the Orbit arrangement, multi-card open, and the sector ordering that stops finished work occupying the visible columns. New sections on many monitors and on whether it would run.
- 2026-09-05 — the field became a cylinder you turn in, after Edwin asked whether it would. The quiet band moved from *far and dimmed* to *behind you*, which is a different claim and a better one; a compass keeps the count on screen so nothing is silently lost.

## Review

- **(document)** · 2026-09-06 · model:claude-fable-5-1 — Edwin answered the review on 2026-09-06: the read-only point, the wish for a flexible desktop with the lists kept as the selector, status surfaces as separate windows, the three-pane cockpit kept as the default with the 2D desk and this field as views over one architecture, and an Obsidian vault as a workspace. The options, the layered architecture and the questions back are in [[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]] (docs/reference/cockpit-surface-architecture-options-2026-09-06.md). Still no verdict written; the decision is his.
- **(document)** · 2026-09-05 · model:claude-fable-5-1 — Full review, with the measurements and the literature, is [[REFERENCE-DES-0002-REVIEW]] (docs/reference/des-0002-glass-cockpit-review-2026-09-05.md). Verdict left to Edwin; nothing in the frontmatter was written by this pass.
- **depth-rule** · 2026-09-05 · model:claude-fable-5-1 — The founding count is overstated: the server serves nine navigator modes, the shell shows seven buttons, and the Needs-you group is prepended to six views (skipped for issues, tests and publication, which already gather). The three-band structure is real for those six; say six.
- **views** · 2026-09-05 · model:claude-fable-5-1 — Four of the twelve arrangements revive modes the shell retired with a stated reason (tasks: TASK-0368; active and recent: TASK-0204; review: TASK-0378 under ADR-0020). Review re-creates the central verdict queue ADR-0020 dissolved while the note cites ADR-0020 as unchanged; drop it or argue the reversal openly. Overview loses the digest band, the watermark and the unpushed commits, which appear nowhere in the design.
- **bench** · 2026-09-05 · model:claude-fable-5-1 — The bench does not test the design: it spreads 1537 cards evenly round one cylinder and shows about 670 at once (pooled DOM read 670 to 690 here), while the stage has 122 slots and wraps the quiet band past 70. No artifact shows a banded 1537-note field, so "about 55 on screen" and "pool about 120" are the 80-note stage’s numbers. The meter was frozen at 37.6 ms in this session too: background tab, the rev 4 trap.
- **performance** · 2026-09-05 · model:claude-fable-5-1 — The blur pass came back as backdrop-filter: it sits on the console slab, every note window, the rail and the HUD, and blurs the moving field behind them every frame you turn (the console alone covers 372 by 176 px). Either translucent without blur, or paused while turning. Also scope will-change to the near bands rather than every card, and replace the FLIP reference: the cards are transform-positioned already, so a transition on transform (or the same-document View Transitions API) is what is being described.
- **pooling** · 2026-09-05 · model:claude-fable-5-1 — Consider the hybrid before the pool: the quiet band already carries only id, status and bar, and wires already move to a canvas past 200 edges, so drawing the far tiles on that canvas leaves at most 52 real DOM cards in the near bands plus the desk, and the four costs listed here apply only to the band that had already given them up.
- **console** · 2026-09-05 · model:claude-fable-5-1 — Measured at rest: four near cards sit under the console by 1 to 15 px (ISS-0277, ISS-0269, TASK-0004, TST-0079); the slot test treats the projected y as the card’s centre and the renderer as its top. After turning 70 degrees three cards are under it and after 126 degrees two: slots are tested for obstacles at the yaw of the last assignment. Re-assign on turn end or make the obstacle a sector of the cylinder.
- **focus** · 2026-09-05 · model:claude-fable-5-1 — Front band overflow is silent: 23 of the 80 notes carry an owed status and Overview shows 10 at the front, the other 13 in the mid band unmarked; past 40 mid slots a subject note falls into "the quiet", which then means both finished and did not fit. Both need a stated rule (a more-stack, paging, or the list panel opening past the slot count). A test card’s "covers N" is its outbound link count, not covers:.
- **desk** · 2026-09-05 · model:claude-fable-5-1 — Strongest part of the design and independent of depth: it would fit the three-pane cockpit with a tiled reader today, together with "what do these share". Two things to settle: holding a note moves the owed band out of the front plane (measured: ten owed notes went to mid and the HUD relabelled to "2 joined to what you are holding"), so "unavoidable" is only true while nothing is open; and the note window is 300 by 176 px, so the reader needs a minimum size or a reading column on one monitor.
- **chrome** · 2026-09-05 · model:claude-fable-5-1 — Nothing here has an address. ISS-0203 put filters in the address so a view can be linked, restored by back and driven by cockpit focus; a view plus a desk plus a focused note needs a grammar (say ~glass/<view>/<id>,<id>) before a renderer, and the design should say what cockpit focus and cockpit state mean here. Tabs and the desk are two mechanisms for open documents; "pin" already names the navigator’s pinned notes. Missing from the table: the platform picker, the per-view badges, capture, SSE live changes (announce, never re-deal silently, per ISS-0140), and nine virtual pages (~history, ~checks with filters, ~release, ~accept, ~tests/<TST>/run, ~session, ~agents, ~inbox, ~overview/<PHASE>).
- **carousel** · 2026-09-05 · model:claude-fable-5-1 — Several consoles is new capability, not re-arrangement: ipc/terminal.ts keeps one PTY per workspace, and each xterm with the WebGL renderer holds one of roughly sixteen WebGL contexts a page may have (xterm.js issue 4379). State the fallback past N terminals. The carousel merges shells and sessions that PHASE-040 is separating; say it presents PHASE-040’s control plane.
- **monitors** · 2026-09-05 · model:claude-fable-5-1 — Half true today: main.ts has New Window and broadcasts fleet health to every window, but nav mode, pane widths, theme and pins live in renderer localStorage and are read once, so two windows do not see each other. The pattern is right and Electron supports it (main-process store plus webContents.send, or BroadcastChannel); it is one to build. Pane widths are stored globally, not per workspace.
- **objections** · 2026-09-05 · model:claude-fable-5-1 — The literature agrees with this section and goes further: Cockburn and McKenzie (CHI 2001, 2002) found the third dimension added no retrieval benefit over 2D Data Mountain and cost time in denser conditions, while users rated 3D higher; Task Gallery and Flip 3D closed on the same pattern. Depth as a degree-of-interest display (Furnas 1986) is defensible; depth as a place to store things ("behind you") is where the evidence is against it, so the "does anyone press look behind after a week" test should be an acceptance criterion. Chevalier et al. (InfoVis 2014) measured staggered transitions as negligible or negative for tracking, so the 170 ms wave has no evidence behind it. Zero focusable elements in the field and no role on a card: the list panel must be the primary keyboard and screen-reader surface, not furniture. Classify the view under ADR-0010 (mode 3, reading); the tablet keeps the three-pane surface.
- **(document)** · 2026-09-05 · model:claude-fable-5-1 — Artifact hygiene: ring and carousel are each declared twice as data-design-region (the skill requires unique ids), eight declared regions are unnamed in the note (bench, measured, desk, desk-rules, desk-cases, alive, pooling, build-or-design), the stage caption still says "⇧click to pin a second one" after rev 8, .card.deep keeps pointer-events: none and works only because an inline style overrides it, and the counts disagree (eleven views, twelve rail entries, "the thirteen"; twelve repos against ten in the glossary). Token parity: all eleven status and severity tokens agree with base.css.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `DES-0014` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
