---
type: "[[reference]]"
id: REFERENCE-DES-0002-REVIEW
aliases: ["REFERENCE-DES-0002-REVIEW"]
title: "DES-0002 review: the glass cockpit — what holds, what the prototype does not yet show, and the notes a build would need"
status: active
owner: user:edwin
created: 2026-09-05
updated: 2026-09-05
scope: "project"
source:
  - "docs/designs/DES-0002-The-Glass-Cockpit.md, rev 9, and its artifact DES-0002-the-glass-cockpit.html"
  - "The prototype run live in Chrome 151 on 2026-09-05, driven with real pointer input"
  - "src/project_os_cockpit/cockpit.py, obligations.py; desktop/src/renderer/renderer.ts, desktop/src/main.ts, desktop/src/ipc/terminal.ts"
related:
  - "[[DES-0002-The-Glass-Cockpit]]"
  - "[[DES-0001-Nine-Ways-To-Read-The-Record]]"
  - "[[FEAT-0001-The-Corpus-Has-An-Inside]]"
  - "[[project-os-cockpit#ADR-0010]]"
  - "[[project-os-cockpit#ADR-0020]]"
  - "[[project-os-cockpit#ADR-0025]]"
  - "[[PHASE-040-An-Agent-Session-Is-Not-A-Terminal]]"
  - "[[project-os-cockpit#ISS-0203]]"
tags: [reference, review, design, glass]
---

# DES-0002 review: the glass cockpit

## Purpose

This note records a review of [[DES-0002]] at rev 9: whether the architecture it proposes would work, whether it carries everything the cockpit does today, what the prototype gets wrong in ways that change the design, and which notes a build would need. It was asked for by Edwin on 2026-09-05. The verdict is his, not this note's: design approval is human-only ([[project-os-cockpit#REQ-0026]]), so the frontmatter of DES-0002 is untouched and the region comments under its `## Review` heading point here.

Read it before deciding whether to accept DES-0002, and again before opening any feature that builds on it.

## The short version

The design's central idea is sound and its own recommendation is right: build the small read-only field first, not the whole cockpit. Five things need to change before that build starts.

1. **The rule the design rests on is real but smaller than the note says.** The note says the server prepends a "Needs you" group to all eleven views. The server has nine navigator modes, the shell shows buttons for seven, and the Needs-you group is prepended to six. Four of the twelve arrangements in the prototype rebuild views the cockpit retired on purpose, and one of them (Review) re-creates the central verdict queue that [[project-os-cockpit#ADR-0020]] dissolved.
2. **The performance argument has not been tested against the design.** The bench arranges 1537 cards evenly round a cylinder and shows about 670 at once. The stage's own geometry holds 122 slots. Neither models a 1537-note field with three bands, so "about 55 cards on screen" and "pool about 120 elements" are the stage's numbers at 80 notes, not measurements at scale. The frame meter froze in this session too, for the reason the note records.
3. **The blur that was removed came back as `backdrop-filter`.** Every panel, note window and HUD box blurs whatever moves behind it. The console alone covers 372 by 176 pixels of a moving field. That is the per-frame blur pass rev 4 measured out, on a larger area.
4. **Glass state has no address.** The current cockpit puts filters in the address so a view can be linked, restored and driven from a terminal ([[project-os-cockpit#ISS-0203]]). A desk, a yaw, a pushed set and a view have none of that. Nothing about the glass cockpit could be reached by back, by a link, or by `cockpit focus`.
5. **The field is unreachable without a mouse.** The prototype has zero focusable elements in the field and no role on a card. The note says the list panel becomes the accessible view, but the list panel is optional furniture. It has to be the primary surface for keyboard and screen-reader users, built first, not offered later.

Two things in the design are worth building even if depth is never built. The desk (several notes open at once, one desk per job, "what do these share") does not depend on a 3D field at all and would fit the three-pane cockpit today. The per-type card faces (a phase carries its progress bar, a test carries what it covers) would improve the current navigator rows the same afternoon.

## What was checked, and how

- The note (rev 9) and the artifact, section by section, against the code they cite.
- The prototype, served locally and driven in Chrome with real pointer input: view switching, hit-testing, the desk, the console obstacle rule, turning, the bench.
- The current cockpit's function inventory, read from `renderer.ts` (routes, nav modes, retired modes, persisted state), `cockpit.py` (nav payload, the two bands), `obligations.py` (which views owe what), `main.ts` and `ipc/terminal.ts` (windows, PTYs).
- The design-bench detectors: token parity and region declarations.
- The literature on spatial memory, focus+context displays, animated transitions, mode awareness, and the browser platform facts the rendering plan depends on. Sources are listed at the end.

The frame-time numbers could not be read. The bench ran in a background tab, `document.visibilityState` was `hidden`, and the meter sat at 37.6 ms for every setting. That is the same trap the note describes in rev 4 and rev 5. Anyone measuring this must have the tab in front.

## Part 1: does the architecture hold?

### 1.1 The mechanic is real, and the note overstates how far it reaches

The note's founding claim: `nav_payload` prepends `_needs_you_group` to all eleven modes and appends `suppressed_group` to most, so every view is already three bands.

Measured in the code on 2026-09-05:

| what | count | where |
| --- | --- | --- |
| navigator modes the server serves | 9 | `NAV_MODES` in `cockpit.py`: intent, features, tasks, issues, tests, publication, active, recent, library |
| modes with a button in the shell | 7 | `index.html`: overview, intent, features, issues, tests, publication, library |
| modes retired from the shell with a stated reason | 6 | `RETIRED_NAV_MODES`: active, recent, tasks, review, inbox, design |
| views that receive a Needs-you group | 6 | `owed_items` keys: features, intent, issues, overview, publication, tests |
| views where the group is skipped because the view already gathers | 3 | `_VIEWS_THAT_ALREADY_GATHER`: issues, tests, publication |
| arrangements in the prototype's rail | 12 | overview, intent, features, tasks, issues, tests, publication, review, active, orbit, files, recent |

So the three-band structure exists, and it is the right thing to build on. But it exists for six views, not eleven, and three of the six do not receive the group at all because the whole view is the obligation list. The design should say six, and should say which arrangements are new rather than "the eleven the cockpit has today".

Four of the twelve arrangements were retired deliberately, and the note does not mention it:

- **Tasks** lost its button in TASK-0368 because tasks now hang under their feature and a flat status list showed nothing Features did not.
- **Active** and **Recent** lost theirs in TASK-0204; in-flight work became ambient on the overview and "what changed" became the commits panel.
- **Review** dissolved in TASK-0378 under [[project-os-cockpit#ADR-0020]]: every queue re-homed to the view that owns its subject and the "am I done" count became the badges on the view buttons.

The design cites ADR-0020 as unchanged and then defines a Review arrangement whose subject is "anything that can carry a verdict", brought to the front when "owed a verdict". That is the central queue ADR-0020 removed. Either the arrangement goes, or the design argues explicitly for reversing the decision. It cannot do both.

The **Overview** arrangement also loses what the overview page is for. Today's overview leads with the digest band (what changed since you last said "Caught up", [[project-os-cockpit#FEAT-0071]]), the unpushed commits, the phase squares and the validator report. The arrangement is "everything sorted by how much it wants you", which is a different and smaller answer to "where is this project now". The digest and the watermark appear nowhere in DES-0002.

### 1.2 Depth as priority: what the evidence supports and what it does not

The design uses the z-axis for two different things and the literature treats them differently.

**Depth as a degree-of-interest display is well founded.** The design's bands are a degree-of-interest function in the sense of Furnas's generalized fisheye views: each item gets a number saying how much the user wants to see it now, from its a-priori importance (owed, in flight, finished) and its distance from the focus (joined to what you are holding), and the display shows the most interesting items largest. Naming the function explicitly would make the twelve arrangement rules one table instead of twelve code paths, and it would make "what breaks the rule" (the Recent view, and holding a note) visible as a change of function rather than a special case. The aviation "dark cockpit" principle points the same way: nothing is lit unless it needs attention, which is [[project-os-cockpit#ADR-0025]] and "absent, never zero" in one sentence, and it is what the front plane implements.

**Depth as a place to store things is where the evidence is against the design.** The "behind you" band is a spatial-memory store, and that has been measured. Data Mountain (Robertson et al., 1998) showed spatial arrangement beats a flat list for retrieval. Cockburn and McKenzie then tested whether the third dimension was doing the work (CHI 2001, CHI 2002, and a 2004 revisit): the 3D versions were no faster and in the physical and denser conditions slower, while participants rated 3D higher. The pattern is exactly the risk the note names in its own words: "this design has just built a machine for putting things out of sight." A subjective preference for 3D combined with no retrieval benefit is the finding that closed Task Gallery (2000) and Windows Flip 3D as products. The design's mitigation is a counter and a compass. The literature says to expect the counter to be ignored; the test the note proposes ("after a week, does anyone press look behind?") is the right one and should be a stated acceptance criterion, not a remark.

**A view that re-arranges is a mode change, and mode changes need salient indication.** Sarter and Woods's work on glass-cockpit aircraft ("How in the world did we ever get into that mode?", 1995) found mode errors come from an interface that does not make its current mode and its behaviour salient. DES-0002 has three mode changes of its main axis: switching view, holding a note (the front plane stops meaning "what needs you" and starts meaning "what is joined to this"), and the Recent view (distance means age). The prototype relabels the HUD line in the second case, and the note says Recent "says so, in the panel". Those are the right instincts. They should be one rule: whenever the meaning of the front plane changes, the surface says what it now means, in the same place, every time.

**Two scaling facts the design should state.** Far cards are small, and Fitts's law says small targets take longer to hit; Gutwin (CHI 2002) measured that magnification-by-distance makes focus targeting harder because targets move as you approach. The design's "fly first, then open" is the correct answer and should be the only way to open a far card. And Chevalier, Dragicevic and Franconeri (InfoVis 2014) measured staggered animated transitions and found staggering has a negligible or negative effect on tracking. The note's "stagger, do not synchronise" rests on taste; the evidence says it does not help, so the 170 ms wave is a cost with no measured benefit. Heer and Robertson (2007) found what does help: animated transitions with object constancy, about one second long, and never reusing a mark for a different datum, which is the design's own "cross-fade, never cross-morph" rule.

### 1.3 The rendering plan: pooling is right, the bench does not test it, and the blur came back

**Pooling is the standard answer and the design is right to call it the architecture.** A fixed set of elements rebound as the viewport moves is how every large list is rendered.

**The bench measures a different design.** The bench places every card at a random angle and depth on one cylinder and shows everything within 78 degrees of the heading. At 1537 cards that is about 670 elements on screen and the pooled DOM count read 670 to 690 in this session, not the "roughly 120" the note commits to. The stage models the bands but has 122 slots (12 front, 40 mid, 70 quiet) and wraps the quiet band modulo 70 once it is full. So no artifact shows a 1537-note field with three bands, and the claim "the visible arc holds about 55 cards" is the stage's slot count at 80 notes. If the bench runs acceptably it is an over-estimate of the design's load, which is comforting, but "over-estimate" is not "measured". The bench should be rebuilt on the stage's slot model: a front band of 12, a mid band of 40, and a quiet band whose geometry is specified for a thousand notes.

**The quiet band has no geometry past 70 notes.** The stage deals quiet cards into 70 slots and then stacks them. The design's whole argument about the far field being "a texture of identifiers" needs a rule for how a thousand tiles are arranged: rows, rings, or a spiral, and how many are drawn. This is a design question, not polish, because it decides whether the quiet band is a texture or a stack.

**`backdrop-filter` is the blur pass, returned.** The stylesheet puts `backdrop-filter: blur()` on the console slab, the note windows, the rail, the HUD boxes and the desk bar. A backdrop filter reads back and blurs whatever is behind the element every frame that content changes, and the content behind these elements is the field, which moves every frame you turn. Chrome's own guidance and reported bugs say the cost scales with area and with motion behind the filter, and the console is 372 by 176 pixels at the default size and resizable. Rev 4 removed 288,726 square pixels of blur on cards; the console alone is 65,472 square pixels of blur over a moving field, and a second console doubles it. Either the slabs are translucent without blur, or the blur is paused while turning.

**`will-change: transform` on every card is a layer per card.** The stylesheet applies it to `.card` unconditionally, and the text around it says "keep will-change: transform". Chrome's guidance is the opposite: a promoted layer costs GPU memory and management, and it should be applied to elements about to animate and removed after. With pooling the count is bounded, so this is a build rule rather than a blocker: promote the near bands, never the quiet band.

**FLIP is the wrong name for what the prototype does.** FLIP inverts a layout-driven move into a transform. The cards are already positioned by transform, so a CSS transition on `transform` animates them with no measurement step. The design should say "transform transitions, staggered or not" and drop the FLIP reference, or adopt the same-document View Transitions API, which is the platform's version of FLIP and needs a unique `view-transition-name` per card, which pooling provides for free.

**A hybrid renderer would remove most of the pooling costs.** The design already concedes the quiet band carries only an id, a status and a bar, and that wires move to a canvas past 200 edges. Drawing the quiet band on the same canvas removes the pool entirely: the DOM holds the front and mid bands (at most 52 real elements bound to real notes, focusable and animatable) plus the desk, and the canvas holds the thousand tiles. The four costs the note lists for pooling (no animation between states, find-in-page, the accessibility tree, per-element state) then apply only to the band that had already given them up.

### 1.4 State, address, and more than one window

**Nothing in the glass cockpit has an address.** [[project-os-cockpit#ISS-0203]] set the rule that a filter which lives only in a click cannot be linked to, cannot be reopened by back or forward, and does not survive a navigation, so the tier and area filters moved into the address (`~checks/tier/2`). The current cockpit also has `cockpit focus <id>` and `cockpit state`, which drive and read the user's view from any terminal, and a Following toggle per tab. DES-0002 defines a view, a desk per view, a yaw, a pushed set and a focused note, and gives none of it an address. The note's chrome table says back/forward becomes "history of focus, not of pages", which describes the stack but not what a stack entry is. A build needs a grammar before it needs a renderer. A reasonable one: `~glass/<view>` for the arrangement, `~glass/<view>/<id>[,<id>]` for the desk with the last id focused, and yaw and the pushed set as session state that is never in the address. `cockpit focus <id>` then means "fly to it and add it to the desk", and `cockpit state` can report a glass address.

**Tabs and the desk are two mechanisms for the same thing.** The centre tabs hold open documents. The desk holds open documents. The note keeps tabs "unchanged" beside the desk. One of them should go, or a desk note should be a tab.

**"Pin" already means something.** The navigator has pinned notes per workspace (`pinnedStorageKey`). The design's "pin beside" means open a second note. The word should change.

**The multi-window claim is half true.** `main.ts` has a New Window menu item and an `allWindows` set, and fleet health is broadcast to every window. But the navigator mode, pane widths, theme, hide-completed and the per-workspace pins live in renderer `localStorage` and are read once at start; two windows do not see each other's changes live. The design's "main process holds the state and each renderer subscribes" is the right pattern and Electron supports it plainly (a main-process store with `webContents.send` to every window, or `BroadcastChannel` between same-origin renderers), but it is a pattern to build, not one that exists. Also, "both are remembered per workspace, like every other pane position the shell already stores": the pane widths are stored globally, not per workspace. Per-display placement is a solved problem (`screen.getAllDisplays()` and window bounds), so the three-screen proposal is buildable; the unsolved part is the one the note names, one state for several windows.

**Live changes will move cards under the pointer.** The sidecar pushes changes over SSE and the navigator re-renders. A field that re-deals when a note changes status is the automation surprise Sarter and Woods describe, and it is the reason [[project-os-cockpit#ISS-0140]] made the shell report staleness rather than reload. The rule should be that a change arriving while you look is announced (a chip: "3 notes changed") and applied on your action, never silently.

### 1.5 Input and accessibility

Measured in the prototype: zero focusable elements inside the field, no `role` on a card, arrow keys turn the cylinder, and the only keyboard route to a note is the search box. Reduced motion is honoured by cancelling every transition, which also cancels "fly, do not cut", the one motion the note calls essential for bearings. So a reader who asks for stillness gets cuts with no substitute cue.

What a build needs, and what the design should state now:

- The list panel is the primary surface for keyboard and assistive technology, always available, never furniture. It carries the whole set with `aria-setsize` and `aria-posinset` on rows so a screen reader says "item 5 of 1537" over a windowed DOM, which is the documented pattern for virtualised lists.
- Every near-band card is focusable in a stated order (front band first, then mid by sector), with the same open verb the mouse has.
- Under reduced motion, arriving at a note is shown by a highlight and a scroll, not by nothing.
- WCAG 2.3.3 is the criterion to cite: motion triggered by interaction can be disabled unless essential. The design should decide which motion is essential (the fly on search) and provide the non-motion cue for it.

The rev 3 finding is real and general. Firefox has an open bug where a `preserve-3d` parent swallows clicks meant for children, and hit-testing follows transformed painted geometry in every engine. The build rule the note states, pointer-transparent containers and verification with real pointer events, should become a test note, because the prototype's own `.card.deep { pointer-events: none }` rule is still in the stylesheet and only works because an inline style overrides it.

### 1.6 The console, the sessions and the fleet

**Several consoles at once is new capability, not re-arrangement.** `ipc/terminal.ts` keeps one PTY per workspace by design, inside tmux. The carousel's "⇧click deals a second slab" needs several PTYs per workspace or several tmux windows, and each xterm instance with the WebGL renderer holds a WebGL context. Browsers cap active WebGL contexts per page at about sixteen and drop the oldest; xterm.js issue 4379 records that a page with many terminals exceeds it. Five consoles on screen 2 is within the limit; a carousel that never disposes contexts is not. The design should say the canvas renderer is the fallback past N terminals, or that off-screen terminals release their context.

**The carousel merges what [[PHASE-040]] is separating.** PHASE-040's goal is to move session ownership off the terminal multiplexer onto a control plane the cockpit reads. DES-0002 makes "a workspace shell, an agent session, a session waiting for approval" one card type on one arc. That is fine as presentation, but the design should say it presents PHASE-040's control plane rather than the PTY list, or the carousel will be built twice.

**The ring's owed count is the fleet view's existing job.** The workspace rail already carries health marks per repo (validator verdict, agent state, git state). The design's "honest limit" about a slow or down sidecar is right and is already the rule in [[project-os-cockpit#FEAT-0086]]: "no suite" and "nothing blocking" are different sentences.

### 1.7 Where the writes and the guards go, and which front door this is

The note is right that verbs, guards and the write path do not change. Two things it does not say:

- **The glass cockpit is mode 3 only** (the shell: mouse, keyboard, one window, Electron windows). [[project-os-cockpit#ADR-0010]] decided that the view set is declared once, both front doors consume it, and every view is marked reading or actuating and says what it waits on. A new view must be classified to exist. DES-0002 should classify itself: a reading view, mode 3, not served by the sidecar's own HTML, with the tablet keeping the three-pane surface.
- **The reader has no stated size.** The note window in the prototype is 300 by 176 pixels. The design says the body renders with the cockpit's own renderer, which is right, and [[DES-0001]] said a graph is a bad place to read 1500 words of Markdown. On one monitor the reader is a floating window over a field; the design needs a rule for its minimum width and whether opening a note may claim a reading column. On three monitors the reader has its own screen and the problem disappears, which is another reason the multi-monitor section is load-bearing rather than optional.

## Part 2: does it carry what the cockpit does today?

DES-0001 listed twelve capabilities a replacement must carry. DES-0002 is now "a twelfth view" by its own conclusion, so the bar is lower: it must not lose anything the reader can reach today, and where it does not carry something it must say where that thing lives. This table is what the shell does today against where DES-0002 puts it.

| today | where DES-0002 puts it | state |
| --- | --- | --- |
| Overview page: digest band since "Caught up", unpushed commits, phase squares, validator report, contribution grid | an arrangement "sorted by how much it wants you" | gap: the digest, the watermark and the commits are absent |
| Intent, Features, Issues, Tests, Publication navigators with Needs-you first | six arrangements | covered |
| Library (file tree, pinned notes) | Files, with a hand-off to the system browser | covered; pins are not mentioned |
| Retired modes: Tasks, Active, Recent, Review | four arrangements | conflict: rebuilt without stating why they were retired; Review contradicts ADR-0020 |
| Virtual pages: `~history`, `~checks` with tier and area filters, `~release/<id>` and per-item pages, `~accept/<FEAT>` runner, `~tests/<TST>/run`, `~session/<id>`, `~agents`, `~inbox`, `~overview/<PHASE>` | not placed; "as list" opens the current view as a table | gap: nine page surfaces with no home; the acceptance runner and the test runner are stepwise, not lists |
| Badge on every view button (what each view owes) | the front-plane count for the current view | gap: the other views' counts are invisible from inside one arrangement |
| Platform picker (filters the navigator by platform) | absent | gap |
| Quick switch (⌘P), find bar (⌘F), capture (file an issue at triage) | search in the top strip; find-in-page declared owned by the application; capture absent | partial |
| Centre tabs, back and forward, scroll restore | tabs "unchanged"; history "of focus" | conflict: tabs and desk overlap; no address grammar |
| `cockpit focus`, `cockpit state`, the Following toggle | absent | gap |
| Live reload over SSE | absent | gap: no rule for changes arriving mid-view |
| Right pane: linked and backlinks grouped by type | the neighbourhood ring | covered; note that the neighbourhood already exists as a list |
| Actuator row, tick prompt with evidence, release gate, test-run button | "unchanged, behind the same guards" | covered in principle; where the controls appear on an opened card is not drawn |
| Agent strip: cost, context, cache temperature, touched notes; dispatch queue; approvals | carousel and the pulse panel | partial: cost and context are shown on a mock slab; dispatch and approval verbs are not placed |
| Terminal (one PTY per workspace, tmux) | the console slab, several at once | new capability; needs PHASE-040 alignment and a context budget |
| Workspace rail with health marks; fleet roll-up with the push action | the ring with an owed count | partial: health marks and the push action are not drawn |
| Inbox tray | a chip; items arrive as unplaced cards | covered |
| Validator report | a chip; failing notes come to the front | covered |
| Light and dark theme ([[DES-0002]]) | dark cyan only | gap: the fog is a dark-field technique and has no light-mode form |
| Mode 1, the tablet's read-only front door | out of scope by "one window" | must be stated under ADR-0010's classification |

### 2.1 The desk

The desk is the strongest part of the design and it does not need depth. Several notes open, one desk per job, closing that records nothing, and "what do these share" computed from the link graph would all work in the three-pane cockpit with a tiled reader. The pile literature backs the instinct: Mander, Salomon and Wong (CHI 1992) found people keep piles for work in progress beside a filing system for the record, and BumpTop (CHI 2006) showed piles survive a physics desktop. The desk is a pile of notes beside the record, and the record's rule, notes are the source of state, is untouched because nothing is written.

Four things to fix in it:

- **Holding a note takes the front plane away from the obligations.** Measured: opening one note relabelled the band "2 joined to what you are holding" and moved the ten owed notes to the mid band. The note says the axis keeps its meaning. It does not; "unavoidable" becomes avoidable the moment anything is open, and with one persistent desk per view most views will usually have something open. Either the owed band keeps a reserved row while a note is held, or the HUD carries the owed count in a fixed place regardless.
- **One desk per view, surviving workspaces, is a lot of hidden state.** Twelve views times N workspaces of remembered windows, none addressable. The desk bar names other desks, which helps. An address (Part 1.4) helps more.
- **The reader size** (Part 1.7).
- **Naming a desk** is deferred in the note as "a saved query wearing this feature's clothes". Agreed, and the deferral should be written as an explicit out-of-scope line so a build does not drift into it.

### 2.2 Prototype defects that change the design

The note's triage rule is right: a defect is a design question if the answer changes what you would build. These do.

| defect | evidence (2026-09-05, Chrome 151, stage 1558 by 740) | why it changes the build |
| --- | --- | --- |
| Front band overflow is silent | 23 of the 80 notes carry an owed status; Overview shows 10 at the front (12 slots, 2 removed by the console). 13 owed notes sit in the mid band with no mark | The front plane is defined as "unavoidable". At 1537 notes the overflow is the normal case. Needs a rule: a "more" stack, paging, or the list panel opened automatically past the slot count |
| Subject notes fall into "the quiet" when the mid band is full | code path `else quiet.push(n)` after 40 mid slots; 0 triggered at 80 notes; unavoidable at 144 features | "Behind you" then means both "finished" and "did not fit", which is a false statement about a note. Needs a separate overflow band or a count |
| The quiet band has 70 slots and stacks past that | `qi % S.quiet.length` | No geometry exists for a thousand tiles (Part 1.3) |
| The console obstacle rule leaks at rest and breaks after a turn | at rest 4 near cards under the console by 1 to 15 px (ISS-0277, ISS-0269, TASK-0004, TST-0079); after 70 degrees 3, after 126 degrees 2 | The slot model treats the projected y as the card's centre; the renderer uses it as the top. And slots are tested for obstacles at the yaw of the last assignment, so cards rotate under panels. Re-assign on turn end, or make the obstacle a sector of the cylinder |
| A test's face shows its outbound link count, labelled "covers" | `face()` uses `n.l.length` for tests | The claim "a test covering nothing shows zero" must read `covers:`; the real build must not inherit the proxy |
| Recent has no dates | `owed:(n,i)=>i<8`, array order | The one view whose axis is age has no age in the data; the payload needs `updated` |
| Two meanings of open | the stage caption still says "⇧click to pin a second one"; `openOn(n, true)` passes an argument the function ignores | Rev 8 made every click add; the artifact should say one thing |
| Dead rule | `.card.deep { pointer-events: none }` remains in the stylesheet, overridden by inline style | The rev 2 lesson is in the note and not in the code; a test note should pin it |
| Duplicate region ids | `ring` and `carousel` are each declared twice; 22 unique regions in the artifact against 14 named in the note (`bench`, `measured`, `desk`, `desk-rules`, `desk-cases`, `alive`, `pooling`, `build-or-design` are unnamed) | The design skill requires unique ids and a note that names every region; a comment on `ring` is ambiguous today |
| Counts disagree | "eleven views" in the masthead, 12 rail entries, "the smallest field of the thirteen" in Active's caption; "twelve repos" against ten in the glossary and architecture note and eleven sidecars running | Measure and state once |

Token parity passed: all eleven status and severity tokens agree with `base.css`. The validator reports nothing against DES-0002.

## Part 3: what to change in the prototype and the approach

In priority order.

1. **Re-state the founding claim with the measured counts** (six views receive Needs-you; seven buttons; nine server modes) and mark each arrangement as existing, retired-and-revived, or new. Drop Review or argue against ADR-0020 in the open.
2. **Write the degree-of-interest function down** as one table: inputs (owed, in subject, terminal, joined-to-desk, pushed, age) and the band each combination lands in, per view. Every "the one that breaks the rule" becomes a row.
3. **Give the state an address** before anything else is built (Part 1.4), and decide tabs versus desk.
4. **Rebuild the bench on the stage's slot model** and measure in a foreground tab: front 12, mid 40, quiet with a specified geometry, at 1537 and at your-trainer's size. Publish the median frame time while turning for blur, fog, pooled, and hybrid canvas.
5. **Remove `backdrop-filter` from anything that sits over the field**, or pause it during a turn, and scope `will-change` to the near bands.
6. **Make the list panel the accessible primary surface** and give near cards focus and a role. Decide the reduced-motion substitute for the fly.
7. **Fix the geometry model**: card box anchored consistently in the slot test and the renderer; re-assign on turn end; overflow rules for the front and mid bands; a geometry for the quiet band.
8. **Classify the view under ADR-0010** (mode 3, reading) and state the reader's minimum size on one monitor.
9. **Align the carousel with PHASE-040** and state the terminal context budget.
10. **Repair the artifact**: unique region ids, name the eight missing regions in the note, correct the counts, delete the dead rule and the stale caption.

And keep the note's own recommendation: build [[FEAT-0001]]'s read-only slice on real data first. Its three go/no-go questions (legible at real scale, a stable layout under growth, the real cost of pooling) should become the exit criteria of whatever phase eventually owns this work, so that the decision to continue is a measurement.

## Part 4: the notes a build would need

None of these exist. The design's out-of-scope says nothing is allocated, and that is right while the status is `proposed`. This is what acceptance would have to create, in dependency order. Feature slugs are working titles.

| type | working title | what it settles | depends on |
| --- | --- | --- | --- |
| ADR | Depth carries priority: the field's z-axis is the obligation predicate, and the front plane says what it means whenever that changes | The rule DES-0002 rests on, so it can be cited, argued with and conformance-checked; records the mode-indication rule | acceptance of DES-0002 |
| ADR | The glass view is a mode-3 reading view | The ADR-0010 classification; the tablet keeps the three-pane surface | ADR-0010 |
| ADR | A desk is per job; a view is the job | Edwin's rev 9 decision as a citable decision, with the workspace-crossing rule and the no-write rule | none |
| REQ | Every reachable glass state has an address | View, desk and focused note in the address; yaw and the pushed set as session state; `cockpit focus` and `cockpit state` defined for it | ISS-0203's rule |
| REQ | The field is operable without a pointer | Focus order, roles, the list panel as primary, `aria-setsize` over the windowed DOM, the reduced-motion substitute | WCAG 2.3.3 |
| REQ | A change arriving mid-view is announced, never applied silently | Extends ISS-0140's stale-is-stated rule to live re-arrangement | SSE channel |
| REQ | The frame budget is stated and met on the fleet's largest repo | Median frame time while turning, at your-trainer's size, in a foreground tab, in the note | TASK-0003 already says "frame budget stated in the note" |
| RISK | Out of sight is out of mind | The quiet band as a forgetting machine; mitigation is the counter, the compass and a measured "look behind" rate after a week of use | none |
| RISK | Compositing budget | `backdrop-filter`, layer count, WebGL context cap for consoles; low-end and Intel Macs | none |
| FEAT | The desk: several notes open, one desk per job (in the three-pane cockpit) | Independent of depth; ships "what do these share"; reuses the reader and the context pane | ADR "a desk is per job" |
| FEAT | Card faces: a phase row carries its progress, a test row carries what it covers | Ships to the navigator today; the real `covers:` field, not a link count | none |
| FEAT | The field view (`~glass`) | Hosts the arrangements as a view beside the reader; built on FEAT-0001's renderer, pooled or hybrid | FEAT-0001, the two ADRs, the three REQs |
| FEAT | Furniture: floating, several consoles | Several PTYs per workspace, context budget, PHASE-040's control plane as the source | PHASE-040 |
| FEAT | Several windows, one state | Main-process store, per-display placement, the "only screen 1 has a front plane" rule | the field view |
| TST | A near card is reachable by a real pointer and by the keyboard | Pins the rev 3 lesson: real pointer events, not `element.click()`; focus order | none |
| TST | Overflow is stated, never truncated | Front and mid overflow produce a count or a stack, never a silent demotion into the quiet band | the field view |
| TST | The status band on a card equals the reader's | Same assertion as TASK-0001's, applied to the field | TASK-0001 |
| ISS | DES-0002 artifact defects | The rows of Part 2.2 that are polish once a real implementation exists: duplicate regions, stale caption, dead rule, counts | none |
| ISS | The digest and the watermark have no home in DES-0002 | Filed so the gap is tracked rather than remembered | none |

A phase is warranted only on acceptance, and only one: its goal can be stated without listing its parts ("the cockpit gains a second reading surface where depth carries priority") and its exit criteria are the three go/no-go measurements rather than "the tasks are done", which is the `CLAUDE.md` test. Until then FEAT-0001 stays where it is and DES-0002 stays in PHASE-028 as a proposal.

## Sources

Spatial memory and 3D:

- Robertson et al., Data Mountain (UIST 1998): https://www.microsoft.com/en-us/research/publication/data-mountain-using-spatial-memory-for-document-management/
- Cockburn and McKenzie, 3D or not 3D? (CHI 2001): https://www.csse.canterbury.ac.nz/andrew.cockburn/papers/chi01DM.pdf
- Cockburn and McKenzie, spatial memory in 2D and 3D physical and virtual environments (CHI 2002): https://www.csse.canterbury.ac.nz/andrew.cockburn/papers/chi02DM.pdf
- Cockburn, Revisiting 2D vs 3D implications on spatial memory (2004): https://www.csse.canterbury.ac.nz/andrew.cockburn/papers/auic-2d3d.pdf
- Robertson et al., The Task Gallery (CHI 2000): https://www.microsoft.com/en-us/research/publication/the-task-gallery-a-3d-window-manager/

Focus+context, piles, animation:

- Furnas, Generalized fisheye views (1986): https://cspages.ucalgary.ca/~saul/581/exer.eps/4furnas86.pdf and the 2006 follow-up: http://vis-ucb-maneesh.stanford.edu/files/chi06/Furnas_p999.pdf
- Gutwin, Improving focus targeting in interactive fisheye views (CHI 2002): https://dl.acm.org/doi/10.1145/503376.503424
- Mander, Salomon and Wong, A pile metaphor (CHI 1992): http://www.cs.columbia.edu/~feiner/courses/csw4170/resources/p627-mander.pdf
- Agarawala and Balakrishnan, BumpTop (CHI 2006): https://www.dgp.toronto.edu/~ravin/papers/chi2006_bumptop.pdf
- Heer and Robertson, Animated transitions in statistical data graphics (InfoVis 2007): https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf
- Chevalier, Dragicevic and Franconeri, The not-so-staggering effect of staggered animated transitions (InfoVis 2014): http://www.cs.toronto.edu/~fchevali/fannydotnet/resources_pub/pdf/notsostaggering-infovis14.pdf

Mode awareness and the cockpit analogy:

- Sarter and Woods, How in the world did we ever get into that mode? (Human Factors 1995): https://www.semanticscholar.org/paper/How-in-the-World-Did-We-Ever-Get-into-That-Mode-and-Sarter-Woods/4ee9a6e53060f4aeab08c455555bc9a2c1a0d7f0
- The dark cockpit philosophy: https://www.airflow.blog/2025/01/16/the-dark-cockpit-philosophy-enhancing-efficiency-and-safety-in-modern-aviation/

Accessibility:

- WCAG 2.1 Understanding 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- MDN, aria-setsize: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-setsize and react-window issue 808: https://github.com/bvaughn/react-window/issues/808

Browser platform:

- web.dev, Stick to compositor-only properties and manage layer count: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- Smashing Magazine, CSS GPU animation, doing it right: https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/
- backdrop-filter cost in Chrome, a reported case: https://github.com/nextcloud/spreed/issues/7896 and a practitioner note: https://www.devslovecoffee.com/blog/making-apple-progressive-blur-on-web
- MDN, transform-style: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style and Firefox bug 1233978 on preserve-3d hit testing: https://bugzilla.mozilla.org/show_bug.cgi?id=1233978
- Chrome for Developers, same-document view transitions: https://developer.chrome.com/docs/web-platform/view-transitions/same-document and MDN: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using
- xterm.js, support dozens of terminals on a single page (issue 4379): https://github.com/xtermjs/xterm.js/issues/4379 and the WebGL addon README: https://github.com/xtermjs/xterm.js/blob/master/addons/addon-webgl/README.md

Electron:

- Inter-process communication: https://www.electronjs.org/docs/latest/tutorial/ipc
- screen API: https://www.electronjs.org/docs/latest/api/screen
- Syncing state between Electron contexts: https://brunoscheufler.com/blog/2023-10-29-syncing-state-between-electron-contexts

## Maintenance

This note describes DES-0002 at rev 9 and the code on 2026-09-05. A later revision of the design or a decision in its frontmatter makes the corresponding section here historical; do not edit the findings, add a dated line under this heading saying what changed.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `REFERENCE-DES-0014-REVIEW` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
