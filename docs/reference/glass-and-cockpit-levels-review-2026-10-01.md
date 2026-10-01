---
type: "[[reference]]"
id: REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW
aliases: ["REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW"]
title: "Glass should show derived collections and full notes on the main desktop surface"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
scope: "project"
source:
  - "Edwin 2026-10-01: 'Review the current electron glass functionality and suggest how to make it more like a real minority report style UX, also consider the suggested layering and abstractions that have been defined as part of the ../project-os-cockpit project.'"
  - "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'"
  - "Desktop renderer and Glass smoke run, read and run on 2026-10-01 against the current working tree; project-os-cockpit DES-0015 and DES-0016 read on the same day"
related:
  - "[[PHASE-0002-Glass]]"
  - "[[DES-0002-The-Glass-Cockpit]]"
  - "[[REFERENCE-GLASS-PHASE-REVIEW]]"
  - "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]"
  - "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]"
  - "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]"
  - "[[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]]"
  - "[[project-os-cockpit#DES-0015]]"
  - "[[project-os-cockpit#DES-0016]]"
tags: [reference, review, glass, interaction, levels]
---

# Glass, full notes and derived collections, reviewed on 2026-10-01

## Recommendation

The subsequent comparative review is [[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]. Edwin endorsed its direction on 2026-10-01. [[DES-0003-Collections-And-Documents-On-Glass]], FEAT-0020 and FEAT-0022 now carry the concrete interaction plan; FEAT-0023 and FEAT-0021 retain later scene and evidence decisions. The observations below remain evidence from the original review, not a report that those changes have shipped.

**Make the main desktop surface hold both an interactive collection of notes and the full text of any note a person opens.** The current Electron surface already turns, zooms, lifts, pulls, pushes, reaches, arranges panes, and throws a note to another window. Its derived list stays in a fixed left navigator, and its wider reader lives in a separate right column. Edwin wants the list and the document to be things he can see and work with on the surface itself. A project summary opens a flow collection on that surface. Opening a row lifts the full note there, with its summary and next action above the authored text. The collection remains available beside or under that note as an object the person arranged, rather than as permanent window chrome.

The cockpit's [[project-os-cockpit#DES-0015]] and [[project-os-cockpit#DES-0016]] are proposals, not adopted contracts. DES-0015 proposes a small Home screen and four flows: design and review, implementation, verification, and issues. DES-0016 defines seven levels by the reader's question, from portfolio to machine trace, and proposes that every count opens the exact rows it counted. This review recommends an application of those proposals in Deck; it does not choose their open decisions for Edwin.

## What Electron Glass does now

`desktop/src/shared/views.ts` gives a project-os workspace seven view descriptions: Overview, Intent, Features, Issues, Tests, Publication, and Library. A description selects a sidecar mode, gives cards faces, sets four bands and their capacities, and lists the allowed surfaces. `desktop/src/shared/field.ts` deals the view's notes once by id. Owed notes take the front, the view's subject takes the middle and outer field, and quiet notes stand behind. `desktop/src/renderer/glass.ts` draws near cards as elements and the quiet band on a canvas, with a compass and stated remainders. The field's wheel zoom changes apparent size and card detail; a sideways wheel or drag turns it. A card can be lifted into a pane, pulled forward, pushed behind, reached for to show links, or thrown to another window. The served tablet follows the Mac's store but does not arrange it.

The central interaction has real strengths. Motion preserves where a card came from on a view switch and lift. Hand placement is marked and can be released. Owed work cannot be pushed out of the front by hand. Keyboard routes exist for turning, zooming, the quiet band's tiles, pulling and pushing. The renderer keeps one state and one address model across surfaces and windows. These are parts of the desired spatial interaction, not merely a colour treatment.

The current screen also exposes the information problem. In a focused smoke capture of this repository's Issues view, the bar read **0 owed** and the centre said nothing was owed. Six open issues stood as small cards near the left and right edges. The compass counted **83 in the quiet band and 83 out of sight**. That is an honest answer to the current owed predicate, but a weak first answer to someone opening the app to manage issues. The navigator still held all 89 issue rows. A person can find them, but the field starts with an apparently empty centre and asks the person to turn or read a narrow list.

The current full note is present in code but not treated as the main desktop document. `desktop/src/renderer/glass.ts` fetches the sidecar's rendered HTML into every held pane. A pane without a stored size starts at 320 by 240 pixels, and the note opened in the middle gets a size chosen by the ring layout rather than by the person. The separate right reading column appears when a pane is widened. The card face can show title, status, progress or severity, and selected properties, but the full note is cramped until moved to that column. There is also no subject header with the goal, labelled progress, recent events and next registry verb directly above the authored text. The existing `#actuators` container sits beside the reader in the window's row of columns; [[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]] records the resulting layout defect.

The derived list has the same placement problem. `desktop/src/renderer/index.html` puts `#navigator` before the field as a separate child of the window's flex row, and `desktop/src/renderer/deck.css` fixes it at 264 pixels wide. `desktop/src/renderer/renderer.ts` sends the sidecar's groups, search and filters to `NavigatorList`, which already supports folding, keyboard movement and lifting a row. These are useful interactions; their fixed position is the limitation. The first review recommended a dense list beside the field. Edwin's correction changes that recommendation: a list must be a first-class object inside the main surface, where it can be enlarged, moved, stacked and used with the note it opened.

Some spatial promises are still broken in known ways. [[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]] records duplicated neighbours and the empty ghost left by an open note. [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]] records that the centred pane ignores the person's size. [[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]] records that dragging it discards the ring and re-deals the field. Edwin already chose the direction in those issues: move the notes themselves, retain the chosen pane size, and move the opened note with its neighbours. The new level model should use those decisions, not reopen them. [[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]] records a further limit: on Your Trainer's Features view, 186 of 317 notes are counted but not drawn.

## How the cockpit's levels could work in Deck

| Level proposed by DES-0016 | What the person asks | Glass interaction to design |
| --- | --- | --- |
| A0 Portfolio | Which project needs me? | A fleet surface of project summaries, with exact counts and a direct route to the chosen project. No field of thousands of raw notes. |
| A1 Project | What needs me here, what is moving, and can it ship? | Three large, readable objects for Needs you, In flight and Shipping. Selecting a count opens the exact flow and rows it counts. The field remains present as context, not as the only way to read the answer. |
| A2 Flow | What is queued, in what order, and what is blocked? | A full, interactive collection on the main surface. Its rows, filters, grouping and counts are the derived list; the field remains behind it and can be brought forward. |
| A3 Subject | What is this and what should I do next? | Lifting one row opens a document on the main surface. Its compact header shows the goal, labelled progress, state, next registry action and recent events; related notes remain reachable. |
| A4 Ticket | What exactly was asked and what counts as done? | The full authored note is already visible below that header when the document opens. Respect the size the person chose. Keep its related notes in the same arrangement while it moves. |
| A5 Evidence | What proves the claim? | Open the linked verdicts, captures, commits and test results from the subject, with a clear path back. |
| A6 Trace | What produced the screen or result? | Open an agent session or raw payload deliberately from its evidence, folded by default. |

The levels and the field's geometry are different controls. Today the wheel scales the field between its zoom limits, and apparent card size changes how many properties fit. Keep that direct spatial zoom. An explicit, labelled level control can change the question being answered while preserving the selected project or note. This follows DES-0016's recommended order: make the pages real first, then add an altitude control across them, then save a preferred starting level. The address should name a level and subject when they can be reopened. Session hand placement and yaw should remain session state as the current design specifies.

The levels describe what information answers a question; they need not force a separate click between the subject summary and the full note. For Deck, A3's header and A4's text should coexist in one document by default. The person can fold the header to give the text more room, or open A5 evidence from it. The note body should continue to come from the sidecar's existing renderer, so links, checkboxes and note-specific markup keep their current meaning.

## A desktop arrangement for the collection and the note

**Treat a derived collection and an opened note as two kinds of object on one desk.** A collection is the current view's query result with its heading, exact count, grouping, search, filters and rows. A document is one note's rendered text, with a small subject header and the sidecar's legal actions. Both occupy the field's main rectangle. Neither needs a permanent navigator or reader column in Glass. The existing rail can still select a workspace; its purpose is different from the collection of notes.

1. A flow opens its collection large enough to scan and operate. Rows show the needed status or severity and labelled progress. The person can search, filter, sort, fold groups and use the keyboard in the collection itself. The field's cards remain a spatial overview behind it, with a named control to bring them forward.
2. Clicking a row lifts its note onto the same desk as a readable document, with the full text visible immediately. The collection stays open and marks the selected row. It can be moved, resized, collapsed to a named header, or tiled with the document when there is room. It is never an unrelated sidebar that consumes width in every state. Each additional row can lift another note, preserving Deck's existing multiple-note behavior.
3. The document opens at a comfortable reading size that the person can change. The chosen size persists according to [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]], and moving it does not resize it. A long note scrolls inside its pane. Its action strip belongs at the top of the document, close to the text and available to keyboard and touch, with disabled reasons visible. A second document can be stacked or tiled without replacing the first.
4. The collection and document share selection. A row can locate its card in the field; a card can reveal and highlight its row. Closing a document returns attention to the same row and scroll position. Refreshes announce changed results rather than reordering a collection under the pointer, following the field's existing pending-change rule.
5. On a narrow window or tablet, the same objects occupy the stage one at a time with an explicit way back to the collection. On a second display, a person can place the collection on one screen and the note on another without changing their identities or query. The served tablet retains its current read-only authority unless a separate write decision changes it.

The collection stores a query or view identity, filters, selection, scroll anchor and layout in the desk state; it does not store a copied result set. The sidecar remains the authority for membership, owed marks and legal actions. Deck's view description can say how the result is drawn as field cards or an on-stage collection. The existing `rowsFor` and `NavigatorList` behavior is a starting point for the collection's keyboard and grouping logic, while the rendered note HTML remains the document body. A collection's count must still open or identify its exact member rows, as DES-0016 proposes.

This arrangement uses the field where depth helps a person find and move work, and uses flat, readable surfaces for dense rows and long text. It also avoids filling one monitor with several permanent columns before a person has opened anything. The collection and document may be tiled by choice; their presence and size follow the work the person is doing.

## Suggested order

1. **Restore object continuity before adding more motion.** Implement the already chosen outcomes of ISS-0070 to ISS-0072. One note should have one visible card, a person's reading size should stand, and moving an open note should move its neighbourhood. Those failures are more damaging to a direct manipulation surface than another effect would repair.
2. **Make the first answer useful.** Draw an A1 Home from the sidecar's existing obligations, focus and release facts. Use three readable objects, with counts that drill into exact rows. The current Overview is a `deck:stats` exception in `views.ts`, because a statistics page does not fit a description that selects notes; a proper page contract would remove that exception. Do not infer an owed issue from `status: open`: the sidecar owns the obligation rule.
3. **Bring the current derived list into the stage first.** Reuse its current groups, rows, folds and keyboard route in an on-stage collection. Make it resizable and usable without the fixed left navigator. Then let the cockpit define four flow payloads and verbs, and let Deck's versioned view descriptions choose their source, banding and faces. Preserve the seven existing views until the cockpit proposal becomes a contract, so a visual change does not silently redefine what a view contains.
4. **Make a lifted note a full document on the stage.** Show its actual text at once below a compact subject header. Put the main registry action with the document rather than in a separate full-height column. Show progress with named numerators and denominators, and a health word when the data supports it. Preserve the person's chosen reading size and allow the collection and multiple documents to be arranged together.
5. **Add evidence and trace only through a subject.** A5 should let a person check a claim. A6 should help debug a machine result. Keep both folded until chosen. Do not fill the field with logs or agent activity that do not answer the current level's question.
6. **Measure with the full corpus.** Keep every summary count traceable to the next level's exact rows, resolve the 186 unplaced notes decision, and measure frame time and reachability with the same real workspaces already used for the native comparison. Treat the existing native experiment as performance evidence, not a reason to postpone these interaction fixes or to claim a speed win it has not shown.

## Verification and limits of this review

`DECK_SMOKE_ONLY=glass npm run smoke` built the current Electron sources and opened the Issues view, but stopped at its first lift check. It expected an owed front card; the current sidecar supplied zero owed notes in Issues, and the screen showed six open issues in the middle band. The failure is evidence that this smoke precondition no longer matches the live record. It does not prove that clicking or lifting an available middle card is broken. The code and existing issue notes support the other findings; this review did not complete a full manual walk or a week of daily use.

This review changes no behavior. It records a proposed direction for [[PHASE-0002-Glass]] and for later work that would depend on the cockpit's still-proposed level and flow contracts.

## Maintenance

Recheck the current-state findings after ISS-0070 to ISS-0072, ISS-0086, or the Glass smoke precondition changes. Revisit the mapping and suggested order if the cockpit decides DES-0015 or DES-0016 differently.
