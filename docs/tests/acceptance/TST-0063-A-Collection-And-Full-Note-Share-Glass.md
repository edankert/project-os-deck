---
type: "[[test]]"
id: TST-0063
title: "A collection and full note share Glass"
status: active
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
scope: feature
level: acceptance
entrypoint: "Glass in the Deck desktop app"
command: ""
last_verified: ""
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
issues: ["[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]"]
tasks: ["[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]"]
area: glass-desktop
after: []
---

# A collection and full note share Glass

## Purpose

Check that a person can operate a complete derived list and read the full authored note together on the Glass desktop.

## Setup

Use a disposable copy of a real workspace. Choose a long note with a checkbox, two linked subjects with a shared neighbour, a high-degree note, and a view containing a known unplaced field member. Record the expected result IDs and count from the same current source revision. Keep an older saved desk from before collections existed. Record source-file state before the walk. TASK-0104's continuity repair must be present before walking integration behavior.

Use desktop pointer and keyboard, a narrow window, and the served tablet or served browser. Record the actual platforms used and any unavailable platform as unwalked. Use a second display for existing send behavior. Record build, workspace revision, viewport and display settings with captures.

## Steps

1. Open the view's collection on Glass. Compare the count and complete membership with the recorded source. Search, filter, fold groups, move and resize it.
2. Select a row, scroll away from the top, collapse and reopen the collection. Verify its header names the query, exact count and active filters and restores size, selection and scroll anchor.
3. Open a visible field card and then an out-of-sight or unplaced member from the collection. Observe continuity and try scrolling or following a link before the opening motion finishes. Interrupt opening with another selection. Repeat with reduced motion. Delay a document response, force a fetch failure and retry; check the identified loading/error frame and confirm full text appears as soon as available without a summary click or waiting for animation.
4. Read the full long note, select text by dragging, drag the header and resize it. Turn the field and move the neighbourhood off-screen. Use Find open note to return. Confirm the neighbourhood stays attached and the chosen reading size remains unchanged.
5. Inspect a relationship with a supported semantic field and one generic link. Compare labels, direction and every neighbour in the linked list with the source. Open two subjects sharing a neighbour and count its spatial representations.
6. Open an already held note from its row. Close it and inspect focus and scroll restoration. Trigger a result change while the pointer rests on a row; apply the announced update. Repeat with the selected note removed from the results and then close its document.
7. Wheel over the collection and document at the top and bottom. Drag text and then the header. Open a local control and press Escape; verify one local dismissal. Exercise the remaining documented focus and desk exit sequence separately.
8. Toggle the checkbox in the disposable workspace and inspect an available guarded action. Verify the expected file change, then undo that deliberate edit before comparing the final source state.
9. Repeat opening, following a link and return using only keyboard, including an overlapped object. Switch views, reload a current desk, then load the older saved desk. Inspect restored queries, live counts, defaults and chosen document sizes.
10. Exercise a narrow window, the served host and existing second-window send/arrival behavior. Preserve the served host's read-only authority. Record a disconnected second display's fallback without claiming enhanced FEAT-0023 handoff exists.
11. Record a real-data demonstration: collection to issue, full text, connected feature/tests, group movement, close and return to the initiating row. Compare task time, mistaken selections and lost-context incidents with the previous UI. TASK-0099 records foreground frame cost with these objects present.

## Expect

- Every counted member has an exact row, including an unplaced field member. A collection can be used beside a document without losing filters, row selection or the scroll anchor.
- Available full text and controls are usable during interruptible opening. Delayed text has an identified loading frame; failed fetches offer retry and close without presenting a summary as the complete note. Reduced motion reaches the same state directly. The title, compact ID and status dominate the header; a full path is available in details.
- Text stays flat, readable and at its chosen size. There is no blur over the moving field or continuous decorative motion while reading.
- One note has one spatial object. No permanent ghost remains. Shared neighbours have one card with supported connections, and the exact linked list exposes every neighbour.
- Dragging text selects it, header dragging moves the document with its neighbourhood, and interior scrolling never changes the field at a boundary. Hidden controls and off-screen subjects have working keyboard return routes.
- Opening an existing document locates it. Closing restores the initiating row/control. A removed result is explained and returns to the collection rather than focusing an unrelated row.
- Changed results wait for deliberate application without reordering under the pointer. Reload derives current membership rather than trusting a copied result. Older desks load with documented defaults.
- Source writes occur only for the intentional checkbox/action through existing guards. Arranging, opening and restoring do not change source notes. The served host offers no write capability.
- Observations and measurements identify their conditions. A smoother impression or callback timing alone is not a proven latency or usability improvement.

## Not this check

Stack/table/cards and Read/Compare/Show related arrangements have TST-0064. Named scenes, enhanced cross-screen handoff, structured evidence, cockpit levels and native renderer performance belong to their separate work. TST-0052 is reconciled with the continuity repair under TASK-0104; its old ghost and mini-card assertions are not carried into this walk. No acceptance outcome has been recorded by updating this procedure.
