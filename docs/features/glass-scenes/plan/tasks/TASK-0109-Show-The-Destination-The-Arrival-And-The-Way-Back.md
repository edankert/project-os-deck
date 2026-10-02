---
type: "[[task]]"
id: TASK-0109
title: "Show the destination, the arrival and the way back"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: M
due: ""
depends: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
blocks: ["[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
related: ["[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0014-The-Hands]]"]
tests: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]"]
---

# Show the destination, the arrival and the way back

The window's half of the handoff. A person sees where a note is going and which act it is before they let go, sees it arrive in the other window, and can send it back. TASK-0108 supplies the states; this task draws them.

## Definition of Done

- [ ] While a document is dragged toward an edge, the target strip names each destination's window, its display and the act. A desk destination has two entries, "Move to …" and "Also show in …". A reader window, an empty display and the tablet have "Also show in …" only.
- [ ] A "Move to" entry says, before release, that the note will leave this desk.
- [ ] `S` on a document opens a chooser with the same entries and the same words as the strip. Arrow keys and Enter choose, and Escape closes the chooser and changes nothing.
- [ ] Between release and the acknowledgement the source document stays where it is and is marked as being sent. The person can still read and scroll it.
- [ ] After an acknowledged move the source document is gone and the source says, by name, which window has the note. After an acknowledged "Also show in" the source document is unchanged.
- [ ] After a handoff that was undone, the source document is where it was, at its size and reading position, and a message says why in a sentence: the window did not answer, the window closed, or the display was disconnected. The message stays until dismissed.
- [ ] The destination draws the document at the size it had at the source and scrolls it to the carried reading anchor once its text is in. It reports drawn, or failed with a label, exactly once.
- [ ] The arrived document carries a visible mark and the destination shows a message naming the window it came from. Both remain until the person dismisses the message or acts on the document.
- [ ] The message offers "send back". It returns the note by the same acknowledged handoff: a moved note moves back, and for a note that was also shown the source's document is found and raised. When the source window no longer exists, "send back" is not offered and the message says the window is closed.
- [ ] "Send back" is reachable from the keyboard on the arrived document.
- [ ] Under `prefers-reduced-motion: reduce` no document travels across the screen at either end. The arrival mark and the message are the same.
- [ ] A send to the tablet is listed as "Also show in the tablet" and, after release, the source says the note was put on the desk the tablet follows and that the tablet's arrival is not confirmed.
- [ ] The served page offers no strip entry, no chooser and no "send back"; `S` there gives today's sentence that a tablet follows the Mac and sends nothing back.
- [ ] No handoff changes `git status` in the workspace.

## Steps

- [ ] Read REQ-0005, ADR-0007 part B and DES-0003's input contract, including Escape and reduced motion.
- [ ] Extend the target strip in `desktop/src/renderer/glass.ts` and `sendTo` and `throwTo` in `desktop/src/renderer/renderer.ts` to carry the act, the size and the reading anchor.
- [ ] Draw the pending state, the outcome messages, the arrival mark and message, and "send back".
- [ ] Answer the arrival message from the destination window when the document is drawn.
- [ ] Add the handoff steps to `desktop/demos/glass-scenes.cjs`, with a second window opened by the walk.

## Acceptance checks reopened

- [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]: the target strip's entries change from one per destination to one per destination and act, and the message after a throw changes.

## Notes

Nothing is built by this note. What "send back" does after "Also show in" is a reading: the source already has the document, so there is nothing to move, and finding and raising it is the nearest useful meaning. It is flagged to Edwin with the other readings in ADR-0007.

A throw is recognised today by the card's speed at the edge (`recogniseThrow`). With two acts per desk destination, a fast release can no longer pick the act by direction alone. How the act is chosen in the strip during a drag is a routine design detail for this task, decided on DES-0003's principle that the preview identifies what will happen before release. Record the choice here when it is made.
