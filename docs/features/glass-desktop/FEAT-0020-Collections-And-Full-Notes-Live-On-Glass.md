---
type: "[[feature]]"
id: FEAT-0020
title: "Collections and full notes live on the Glass desktop"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "Edwin 2026-10-01: 'Okay, create the notes (requirements/features/tasks etc) which cover these changes.'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
goal: "The current derived list and any opened note's full text are movable, readable objects on the main Glass desktop. A row, document and field card identify the same note and can be used together."
requirements: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]"]
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]", "[[TASK-0097-Open-The-Full-Note-As-A-Glass-Document]]", "[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]", "[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]", "[[TASK-0100-Document-The-Glass-Interaction-Direction]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0003-Collections-And-Documents-On-Glass]]"
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]", "[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Collections and full notes live on the Glass desktop

## Goal

The person can read and operate the current derived list and an opened note's full text in Glass's main rectangle. The list and document sit on the same desk as the field and can be arranged together.

## Scope

- Move the current view's derived groups, rows, counts, search, filters and keyboard route into a resizable collection on Glass. Keep the current sidecar payload and seven view descriptions.
- Immediately open an identified document and render the full sidecar text as soon as available, with explicit loading and retry states. A compact subject header may show goal, labelled progress, state and next action above the text when the existing data supports them.
- Preserve the person's document size, multiple open notes, selection, per-view desk and window placement. Keep the collection's query identity, filters and layout, not a copied result set.
- On a narrow window or tablet, show one object at a time with an explicit return to the collection. The served tablet stays read-only.
- Reconcile field/card, row and document identity with the outcomes already chosen in ISS-0070, ISS-0071 and ISS-0072. Their fixes belong to FEAT-0017 and remain dependencies here.

The cockpit's proposed Home, four flows, seven levels and new payloads belong to [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]] after their contracts are decided. This feature does not rename or replace Deck's seven views. It does not add a write route or make an open issue count as owed without the sidecar's rule.

[[DES-0002-The-Glass-Cockpit]] remains context for the field and desk, but its list-beside-field placement is superseded for this feature by Edwin's 2026-10-01 instruction. [[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]] records the replacement contract; DES-0003 supplies the detailed proposal.

## Interaction contract

[[DES-0003-Collections-And-Documents-On-Glass]] specifies the proposed input grammar, readable treatment and opening sequence. The title comes first; compact ID and state follow. Full paths belong in details. Text stays flat at the chosen size, document bodies are nearly opaque, and shadows and restrained edges distinguish objects without blur over the moving field.

A field card becomes the document continuously. A row stays a reference and visibly identifies the arriving document. An already open note is located and raised; no duplicate spatial card or permanent ghost is drawn. Available full text and controls are usable while the motion runs; fetching text never adds a summary or animation gate. Trial an interruptible 250–400 ms transition; record the result before choosing a duration. Reduced motion applies the same state change directly.

Wheel input over either object scrolls its content and stops at its boundary. Wheel input over the field retains spatial zoom and turn. Text dragging selects text; a named header moves the object. Local controls consume Escape before the field's existing leave-focus and sweep sequence. Closing restores the initiating row or control; if the row left the refreshed result, explain that change and focus the collection. Return to collection and Find open note bring an off-screen subject back without shrinking it.

Connections name source-backed meanings, such as parent or verified by, only when the underlying relation supplies that meaning. Generic links retain their direction and source context. Every neighbour remains reachable through a matching list. Two held notes sharing a neighbour use one spatial card. This feature reads current linked documents, including a linked test or source note; structured evidence objects remain [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]].

Collection stack/table/cards, Read/Compare/Show related arrangements and relationship emphasis belong to [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]. Named scenes and polished cross-screen return belong to [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]. Existing second-window behavior still receives regression coverage here.

## Acceptance

- In Glass, the derived collection is a large, interactive object on the main surface. It can be moved, resized, collapsed and used beside a document.
- Its count resolves to the exact member rows even when some notes are out of the visible field. Search, filters, grouping, keyboard operation and changed-result announcements retain their current meaning.
- A row or card immediately opens an identified document on the main surface and shows the full authored text as soon as available. Loading and failure states preserve the source and offer retry. The document and compact header coexist; links and checkboxes work there, and any currently available action remains presented with its existing guard.
- Selecting a row highlights its card and opening its document does not discard the collection. Closing the document returns to that row and scroll position.
- Reading size, desk identity and accessible movement survive the same reload, view switch, second display and narrow-window cases the current desk supports. The served host remains read-only.
- [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] repairs ISS-0070/71/72 before integration acceptance. The walk uses full-size real workspaces and reports rendering cost against the Glass phase budget.

- Opening is continuous and interruptible, reduced motion is immediate, and full text never waits for neighbour animation.
- Header dragging, text selection, wheel boundaries, visible keyboard focus, Escape handling and return controls follow the interaction contract.
- Titles and compact metadata remain readable; unsupported relationship meanings are not invented, and shared neighbours are not duplicated.

## Verification

Planned acceptance walk: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]. The implementation tasks add focused automated and real-pointer checks where they catch regressions.

## Impact analysis and risk scan

Checked [[FEAT-0010-Lifting-A-Note]], [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], [[ADR-0002-Glass-Is-The-Main-View]] and [[ADR-0004-A-View-Is-A-Description]]. No existing `REQ-*` constrains these features. PHASE-0002 previously put reader replacement out of scope and named the fixed navigator as its accessible route. Edwin's newer instruction changes that scope; the phase note is amended. The plan retains the sidecar as source, the same per-view desk, one note identity and an accessible list, so those existing contracts survive.

The refinements also check REQ-0001/0002, FEAT-0016 and FEAT-0017. FEAT-0017's older one-second opening, mini cards, ghost, drag-exits-focus and dock-only reading conflict with the endorsed direction. TASK-0104 and the amendment to that feature own reconciliation before integration. FEAT-0020 permits several readable documents; FEAT-0022 owns arranging a selected pair through Compare preview, apply and undo. FEAT-0016's wheel remains spatial and excludes object interiors. Exact collection access does not resolve ISS-0086's remaining spatial placement question.

Persisting a collection identity and layout extends the saved desk contract. [[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]] tracks old-state compatibility, current-result resolution and missing objects. TASK-0095 supplies those checks. There is no new external dependency, environment variable, runtime architecture or write authority. Frame time and reachability remain acceptance work within the phase's existing budget.

## Links

- Plan: `docs/features/glass-desktop/plan/PLAN.md`
- Requirements: [[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]], [[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]
- Decision: [[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]] 
- Acceptance: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
