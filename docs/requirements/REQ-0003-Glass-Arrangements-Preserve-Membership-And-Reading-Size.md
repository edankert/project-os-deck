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

No criterion is ticked. Ticking is a person's act at the feature's close-out, after [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] has been walked, and nobody has walked it. This table says what exists for each criterion and what is still owed. "The walk" is the scripted walk `glass-arrangements` ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]], 44 of 44 checks). "The scale walk" is `glass-scale` on a copy of Your Trainer ([[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]], 8 of 8, 1393 notes in the view). "The suite" is `arrange` ([[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]], 15 tests). The walks and the smoke run were run in a Linux container at commit `4243fc2`; the suites passed 586 of 586 at `9379a0c`. A scripted walk is not a person's walk.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Stack, table and cards keep membership, count, filters, selected note and scroll anchor | The walk: as a header alone, as cards and back as a table, the count stayed "59 of 144 notes", the members and the filter stayed the same, the cards opened at the note the table was scrolled to, and the table came back to that row. The scale walk: as cards the collection counted all 1393. | A person's walk of TST-0064, step 1. The build has no selected row, so "selected note" has nothing to be checked against: what is kept is the open note and the scrolled-to row. Rewording the criterion is Edwin's. No check opens a collapsed collection of cards from its header (TASK-0101). |
| 2. One spatial identity per note, including shared neighbours | The walk: with a note open and the collection as cards, no note id had two cards, and the open note and four gathered notes were references. The smoke run's `arrange` part (4 of 4): the same, read from the store and counted in the page. The scale walk: 217 neighbours seated once each; with four documents open, 77 seated cards and 77 distinct notes. | A person's walk of TST-0064, steps 2 and 6. |
| 3. Read, Compare and Show related have a visible, keyboard-operable preview, apply and cancel; Compare shows two full documents at their own sizes and reading positions | The walk: each command was shown before anything moved and applied with Enter on Apply; Tab went from Apply to Cancel; Escape withdrew Read and nothing else. Compared documents stood at 560 by 520 and 512 by 552, scrolled to 220 and 140. | A person's walk, steps 3 to 5 and 9. Compare and Show related were started with the pointer; only Read was started from the keyboard. A screen reader. |
| 4. Apply and Undo change layout only, keep text and source content, and announce changed state before applying a stale preview or undo | The suite: a plan holds no size and the store's `arrange` action changes none. The smoke run: a preview withdrawn with Escape left the store's desk byte for byte as it was, and Apply then Undo arrangement returned it to the same bytes. The walk: a preview was worked out again, and said so, after a note changed on disk; an undo named a document moved by hand, and one closed, before doing anything; a criterion ticked through the sidecar was still ticked in the file after an arrangement and its undo. | A person's walk, steps 7 and 8. No check shows an undo putting back the picked-out relationship (TASK-0102). The walk's check that an undo leaves alone a note opened since did not run in this pass. |
| 5. Relationship emphasis uses source meanings and keeps an exact list of every neighbour | The walk: the relationships offered were exactly the frontmatter keys Deck's index finds for the note, each with its count; picking "covers" left 5 of 27 undimmed and all 27 rows listed; a note joined only by a link in the text was dimmed under every pick; clearing changed no link. | A person's walk, step 6. |
| 6. Everything stays reachable at large populations and narrow sizes; drawing limits never limit membership; the served host stays read-only | The scale walk: 1393 members, 14 cards drawn at once, End reached the last member, and a member with no place in the field opened from its row. The walk: in a narrow window the collection and each compared note were reached by name, with text the same size and stored sizes untouched; the served page offered no arrangement and no change of form. The smoke run's `served` part (6 of 6): a page with no bridge is drawn no verb and no tick, and sent the store no action. | A person's walk, steps 10 and 11. The measurement in a foreground window on the Mac. A real tablet: the served page was driven in a second Electron window with no preload bridge. A second display, and touch. |

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]
- Verified by: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
