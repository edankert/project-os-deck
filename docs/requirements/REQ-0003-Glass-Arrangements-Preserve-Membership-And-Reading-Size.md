---
type: "[[requirement]]"
id: REQ-0003
title: "Glass arrangements preserve membership and reading size"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
priority: high
scope: "One current Glass collection and the documents arranged beside it"
acceptance: ["Changing a collection between stack, table and cards preserves its exact current membership, count, filters, selected note and table scroll anchor.", "Arranged cards, field cards and open documents share one spatial identity per note, including neighbours shared by two subjects.", "Read, Compare and Show related offer a visible keyboard-operable preview, apply and cancel; Compare exposes two full documents at their chosen dimensions and reading positions.", "Apply and Undo arrangement change layout only, preserve readable text and source content, and announce incompatible changed state before applying a stale preview or undo.", "Relationship emphasis uses supported source meanings and retains an exact accessible list of every neighbour.", "All collection members and arranged objects remain reachable at large populations and narrow sizes; visible rendering limits never silently limit membership, and served-host authority stays read-only."]
implements: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
verifies: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Glass arrangements preserve membership and reading size

## Statement

Collection presentations and deliberate arrangements must preserve exact membership, one note identity and the person's reading size. The person can preview, cancel and reverse an arrangement without changing source content.

## Acceptance Criteria

- [ ] Changing a collection between stack, table and cards preserves its exact current membership, count, filters, selected note and table scroll anchor. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Arranged cards, field cards and open documents share one spatial identity per note, including neighbours shared by two subjects. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Read, Compare and Show related offer a visible keyboard-operable preview, apply and cancel; Compare exposes two full documents at their chosen dimensions and reading positions. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Apply and Undo arrangement change layout only, preserve readable text and source content, and announce incompatible changed state before applying a stale preview or undo. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Relationship emphasis uses supported source meanings and retains an exact accessible list of every neighbour. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] All collection members and arranged objects remain reachable at large populations and narrow sizes; visible rendering limits never silently limit membership, and served-host authority stays read-only. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]

## Evidence collected, 2026-10-02

No criterion is ticked. Ticking is a person's act at the feature's close-out, after [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] has been walked, and nobody has walked it. This table says what exists for each criterion and what is still owed. "The walk" is the scripted walk `glass-arrangements` ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]], 59 of 59 checks). "The scale walk" is `glass-scale` on a copy of Your Trainer ([[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]], 8 of 8, 1393 notes in the view). "The suite" is `arrange` ([[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]], 27 tests). The walks and the smoke run were run in a Linux container at commit `18f5405`, and the suites passed 645 of 645 at the same commit. A scripted walk is not a person's walk.

Every figure in the table is from that pass, which was run after the independent review and its fixes. Round one of the review, on 2026-10-02, refuted the fourth criterion for the preview, and two of the feature's claims about the undo that fall under it. Round two, the same day, found each fixed for what a node suite settles, and marked the spoken announcement as not checked (FEAT-0022, Review).

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Stack, table and cards keep membership, count, filters, selected note and scroll anchor | The walk: as a header alone, as cards and back as a table, the count stayed "59 of 144 notes", the members and the filter stayed the same, the cards opened at the note the table was scrolled to, and the table came back to that row. Collapsed while it was cards and opened again from its header, the collection was cards again on the same row. The scale walk: as cards the collection counted all 1393. The selected note is the one last opened, marked on its row and on its card: FEAT-0002 was the one row marked in the table, the one card marked among the cards, and the one row marked again. | A person's walk of TST-0064, step 1. |
| 2. One spatial identity per note, including shared neighbours | The walk: with a note open and the collection as cards, no note id had two cards, and the open note and four gathered notes were references. The smoke run's `arrange` part (4 of 4): the same, read from the store and counted in the page. The scale walk: 217 neighbours seated once each; with four documents open, 25 seated cards and 25 distinct notes. | A person's walk of TST-0064, steps 2 and 6. |
| 3. Read, Compare and Show related have a visible, keyboard-operable preview, apply and cancel; Compare shows two full documents at their own sizes and reading positions | The walk: each command was shown before anything moved and applied with Enter on Apply; Tab went from Apply to Cancel; Escape withdrew Read and nothing else. Tab went from Read to Compare and to Show related, Enter showed each preview, and Escape withdrew it with nothing moved. Compared documents stood at 560 by 520 and 512 by 552, scrolled to 220 and 140. In a window 1060 px wide the preview said the two would overlap by 164 px, and they did, at their own sizes. | A person's walk, steps 3 to 5 and 9. Where the walk applies Compare and Show related it starts them with the pointer; only Read was shown, applied and undone from the keyboard, with the keyboard put on the button by the script. A screen reader. |
| 4. Apply and Undo change layout only, keep text and source content, and announce changed state before applying a stale preview or undo | The suite: a plan holds no size and the store's `arrange` action changes none. The smoke run: a preview withdrawn with Escape left the store's desk byte for byte as it was, and Apply then Undo arrangement returned it to the same bytes. The walk: after a note changed on disk a preview was worked out again and read "While this was shown, notes changed on disk, so it was worked out again from what is there now", the status line held the same sentence, and the preview's text was a polite live region; after a note was opened under it, the preview named that note; Apply then applied the plan on screen, with the two compared notes brought above the note opened since; an undo named a document moved by hand, and one closed, before doing anything; a note opened from a link after Compare was applied was still open and had not moved after the undo; the relationship that was picked out when an arrangement was applied was picked out again after its undo; a criterion ticked through the sidecar was still ticked in the file after an arrangement and its undo. In a window shorter than the collection, with the collection stored 693 px high and drawn 423, Apply stored the height it had and Undo arrangement left what is stored the same bytes. With another note moved while the undo's question was on screen, "Undo the rest" put nothing back and asked again. The suite: a note opened since the arrangement keeps its place in the stack. Built and not driven by any check: an Apply pressed at the instant the plan changes shows the new plan and applies nothing (`972ce73`). | A person's walk, steps 7 and 8. A screen reader, to hear the announcement. Which note changed on disk is not named by the preview: the field holds only how many are waiting. |
| 5. Relationship emphasis uses source meanings and keeps an exact list of every neighbour | The walk: the relationships offered were exactly the frontmatter keys Deck's index finds for the note, each with its count; picking "covers" left 5 of 28 undimmed and all 28 rows listed; a note joined only by a link in the text was dimmed under every pick; clearing changed no link. With "covers" pressed in the list of a document that was not the focus, the status line said "5 of the notes joined to FEAT-0002 are picked out", the number its list picked out. Clearing returns to nothing picked out, not to an earlier pick (FEAT-0022, decision 23). | A person's walk, step 6. |
| 6. Everything stays reachable at large populations and narrow sizes; drawing limits never limit membership; the served host stays read-only | The scale walk: 1393 members, 12 cards drawn at once, End reached the last member, and a member with no place in the field opened from its row. The walk: the wheel went on to the last row of cards; in a narrow window the bar named the collection and both compared notes, and each note was reached by its name, one at a time, with text the same size and stored sizes untouched; the served page offered no arrangement and no change of form. The smoke run's `collection` part: "Collection" on that bar put the list in front with the same exact count. Its `served` part (6 of 6): a page with no bridge is drawn no verb and no tick, and sent the store no action. | A person's walk, steps 10 and 11. The measurement in a foreground window on the Mac. A real tablet: the served page was driven in a second Electron window with no preload bridge. A second display, and touch. |

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]
- Verified by: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
