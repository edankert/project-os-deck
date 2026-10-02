---
type: "[[requirement]]"
id: REQ-0002
title: "Glass opens the full note on its desk"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[DES-0003-Collections-And-Documents-On-Glass]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
priority: high
scope: "A note opened from a Glass card or collection row"
acceptance: ["Opening a row or field card immediately exposes its identified document on Glass and renders the full authored text as soon as available, with explicit loading/retry states, interruptible visual continuity and a direct reduced-motion transition.", "A document presents its title before compact ID and state, keeps full paths in details, and preserves links, checkboxes, guarded actions and the person's chosen reading size.", "The same note has one spatial representation; an already open note is located and raised, and closing restores its initiating row or control without a permanent ghost.", "A document and collection remain usable together; text dragging selects text, header dragging moves without resizing, and object scrolling never turns or zooms the field at its boundary.", "Neighbourhood movement preserves readable size and shared identity; source-backed relationship labels have an exact accessible linked list and off-screen objects have a return route.", "A narrow window or tablet provides explicit navigation between objects, visible keyboard focus and the existing read-only served-host authority."]
implements: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
verifies: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Glass opens the full note on its desk

## Statement

Opening a note in Glass must immediately expose its identified document surface. Render the full authored text as soon as the sidecar makes it available, with an explicit loading state and retry on failure. A subject summary may share that document with the text; neither it nor the opening animation may become a gate before reading.

## Acceptance Criteria

- [ ] Opening a row or field card immediately exposes its identified document on Glass and renders the full authored text as soon as available, with explicit loading/retry states, interruptible visual continuity and a direct reduced-motion transition. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A document presents its title before compact ID and state, keeps full paths in details, and preserves links, checkboxes, guarded actions and the person's chosen reading size. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] The same note has one spatial representation; an already open note is located and raised, and closing restores its initiating row or control without a permanent ghost. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A document and collection remain usable together; text dragging selects text, header dragging moves without resizing, and object scrolling never turns or zooms the field at its boundary. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Neighbourhood movement preserves readable size and shared identity; source-backed relationship labels have an exact accessible linked list and off-screen objects have a return route. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A narrow window or tablet provides explicit navigation between objects, visible keyboard focus and the existing read-only served-host authority. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]

## Evidence collected, 2026-10-02

No criterion above is ticked. Ticking them is a person's act, after [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is walked, and that check has not been walked. This table says what a script or a suite has shown for each criterion and what is still owed.

Everything in the middle column ran on 2026-10-02 at commit `18f5405` in a Linux container that draws in software, after the independent review's fixes: the smoke run (389 checks, none failed) and the scripted walks [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] (two scripts, `glass-desktop` with 55 checks and `glass-collection` with 17), [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]. The node suites passed 645 of 645 the same day at the same commit. A scripted walk sends real pointer and key events; it is not a person's walk. Nothing was tried on the Mac, on a second display, on a real tablet, by touch or with a screen reader.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. A row or card opens its identified document at once, with the full text as soon as available, loading and retry states, an interruptible opening and a direct reduced-motion transition | The walk: the document is on screen and named 55 ms after the press and grows from the card. The smoke run's `document` part, 14 checks: the text is character for character what the sidecar renders; a failed read says so and offers retry and close; retry reads it; a press 85 ms into an opening reaches the row under the growing document. Reduced motion puts the document in place on its first frame (walk and smoke run, `focus`). | Whether the opening reads as continuous, and whether 300 ms is right, are a person's judgement; no other duration was tried. No time was taken on the Mac. The walk, step 3. |
| 2. Title before id and state, paths in details; links, checkboxes, guarded actions and the chosen reading size are preserved | The `document` part: the heading is the title, then the id and the status; the path is under details and in the accessible name; a link opens the note it names; ticks stand beside open criteria; the sidecar's verbs are drawn inside the document. A verb and a tick pressed in a document send what the sidecar's row named, with every write stopped before it reaches a note (three checks in the verb and tick section). A refused verb is drawn inside the document, disabled, with its reason in words, and a press on it sends nothing (the `glass-collection` walk). The reading-size suite, 18 tests, the `focus` checks on the corner, and the `glass-collection` walk's check that the next note opens at the size a person chose, 624 by 552, in the application's window and on the served page. | The refusal was put in the sidecar's answer by the walk, because no note in this workspace has a verb the sidecar refuses; a refusal the sidecar itself made has not been seen in a Glass document. No real write was made from a Glass document. The walk, step 8. |
| 3. One spatial representation; an open note is located and raised; closing restores its row or control, with no permanent ghost | The smoke run's `lift` and `focus` parts: no card and no ghost for an open note, none drawn twice. Enter on the row of an open note goes to its document and opens no second one; Delete returns the keyboard to the row (`keys`). The walk's checks say the same. | The walk, steps 5 and 6. |
| 4. Document and collection usable together; dragging text selects it, dragging the header moves without resizing, scrolling never turns or zooms the field at a boundary | The `glass-desktop` walk: the wheel scrolls a document to its end and to its top and the field does not move; dragging across text selects it; dragging the header moves the document at the same size. The `glass-collection` walk: the same at the list's first and last row. The `collection` part: a document over the list, and each brought over the other by a press. | The walk, steps 4 and 7. |
| 5. Moving the neighbourhood keeps size and shared identity; source-backed relationship labels have an exact accessible list; off-screen objects have a return route | The `focus` part, 47 checks: every seated card keeps its place through a drag; R opens a list with a row for every neighbour; "find" brings the desk back. On a copy of Your Trainer 217 neighbours are each given a place, under a list headed "217 related". A note joined to two open notes is one card (`lift`, and both scale walks). The `relations` suite, 7 tests, and three tests of the `graph` suite ([[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]), one of them for a list written at the margin and a key that holds a space, and the walk's check that no relationship word is invented. | The walk, steps 4 and 5. |
| 6. A narrow window or tablet has explicit navigation between objects, visible keyboard focus and the served host's read-only authority | The `collection` part's three checks in a field 652 px wide, and the walk's five, one of which reads an outline on four controls there. The `served` part, 6 checks: a page with no bridge opens a note in a document of its own, is drawn no verb and no tick, and leaves the application's desk byte for byte as it was. The `glass-collection` walk reads an outline on six controls Tab reaches and on the collection's own controls in a wide window, and on four controls on the served page in a window 760 px wide. On the served page it also opens a collection the Mac collapsed, with the Mac's window and the store unchanged, and reads a header label that names Enter alone. | The served page was driven in a second Electron window with a mouse pointer, and its fold control was pressed by script; no real tablet and no touch. The walk, step 10. |

### After the independent review, 2026-10-02

Two reviewers read FEAT-0020 at `5e66f48`, ran node suites only, and requested changes. The changes were made, and in round two one reviewer approved the refuted claims, again on node suites only. The table above is the pass at `18f5405`, after the fixes. This is what the review found against these criteria and what is built now. The full record is in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] under Review.

- **Criterion 5, source-backed relationship labels: refuted in part by reviewer A, and fixed.** A link in a list written at the margin of the frontmatter, or under a key that holds a space, was shown as a plain "link": a label the source wrote was dropped, and nothing was invented. Both are now shown with their key as written (commit `01f0fc1`, with a test in the `graph` suite; [[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]). Round two took each of the two rules out and that test failed both times.
- **Criterion 3, closing restores the initiating row or control.** Reviewer B read that the keyboard could be left nowhere when the row was not on screen. Built now (commit `fb79f05`): the keyboard goes to the row when the row takes it, otherwise to the collection's header.
- **Criterion 6, the narrow window.** In a field narrower than 720 px one object is in front, and a bar names the collection and each open note. A document closed there while the collection stands behind another document brings the collection in front and puts the keyboard on the row or the header. The walks now read where the keyboard is drawn in the narrow window and on the served page in a window 760 px wide (commit `e3f1460`), and those checks held in the pass above.
- **Criterion 6, the tablet and its read-only authority.** On the served page a collection the Mac had collapsed can now be opened, because the fold there is the page's own (commit `bad5a5c`). It tells the store nothing, so the page still changes nothing the application keeps. Before the fix both reviewers marked the served page's read-only authority *holds* for the collection, and the test added with the fix checks that opening and folding there tell the store nothing. A document on the served page was not checked by either reviewer.
- **Criterion 2, the chosen reading size.** The walk's check on the served page used to assert nothing about size when that page's field had no room. It now opens the page in a window with room and requires the same size (commit `e3f1460`). In the pass above the note opened there at 624 by 552 in a field of 1260 by 739.

Both reviewers marked every part of these criteria that needs a window *not checked*. Nothing here was tried on a real tablet or by touch.

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]
- Verified by: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
