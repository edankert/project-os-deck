---
type: "[[risk]]"
id: RISK-0007
title: "Glass restoration loses identity or layout"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
likelihood: medium
impact: high
mitigation: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]", "[[TASK-0106-Keep-A-Scene-In-The-Store]]", "[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]"]
---

# Glass restoration loses identity or layout

## Description

Collection query and layout fields and a remembered reading size extend the saved desk contract. Old state may omit those fields. A copied result set may reopen with stale membership, or a removed note may leave an unreachable pane. Switching presentation may accidentally create a second spatial object for a note that is already open.

**Widened on 2026-10-02 for FEAT-0023.** Two more ways to lose identity or layout arrive with scenes and handoff.

- **A saved desk gains a version.** A scene is a saved desk marked `version: 2` with more fields (ADR-0007, proposed). A desk with no version must still open as it did. A Deck that meets a version it does not write could drop the fields it does not know when it next saves the state file, and a newer Deck's scene would come back as a bare list of cards.
- **A move between windows could lose or double a document.** If the source lets go before the destination has drawn the note, a closed window or a disconnected display leaves the note on no desk. If an undone landing is not fully undone, one desk holds the note twice.

**Two ways this happened, found by the independent review on 2026-10-02 and closed.** A note sent to another window twice, where the first send got no answer and the second was acknowledged, ended on no desk at all: the first send's failure took off what the second had put down. A note with a handoff waiting cannot be sent again until that one is answered (`5d5b38f`). And opening a scene that belongs to another view, then pressing "Undo: back to the desk before", left that view's earlier desk and list gone for good; the undo now puts both back (`093c198`). Each is held by a test in the `handoff` and `scenes` suites.

## Mitigation

- TASK-0095 resolves query identities against current data, supplies defaults for old state and reports missing queries or notes without silently changing the collection.
- TASK-0101 uses one note identity across all presentations, retains exact membership and restores saved presentation with current rows. It covers an old desk and a removed member.
- TASK-0104 reads missing size preferences safely and gives explicit stored note size precedence over the default. **In place since `81d4632`, and checked on 2026-10-02.** The state file gained one key, `readingSizes`. A file written before it existed loads with every note at its place and size. A note's own size wins over the view's, and the view's over the first-use size of 560 by 520. A drag stores no size, and neither does a window made narrow. The `reading-size` suite (TST-0065, 18 tests) checks each of those in the store. In a window, the smoke run's `focus` part (TST-0045, 47 checks at `18f5405`) finds the document the same size through a drag, Escape and Enter, finds an open note drawn once with no second object, and finds after a reload that a document is where the store holds it at its stored size. A second window on the same view takes the view's size, as far as the served page shows it: at `18f5405` the walk `glass-collection` resized a note to 624 by 552 and found a note opened on the served page 624 by 552 (ISS-0071, "Next Actions"). No run has opened a second Deck window. TASK-0104 is still `doing`, with one box open for the rendering cost on the Mac. **The independent review of FEAT-0017 on 2026-10-02 found two ways a chosen size was still lost, and both are fixed.** A note with no size of its own, which includes every note in a state file older than TASK-0104, changed size when another note was resized; the store now gives it the size it is drawn at first (`0d39033`, three tests in the `reading-size` suite, which round two's reviewer saw fail with the fix taken out). A press on the resize corner in a window too small for the document stored the fitted size; a press that does not move now stores nothing (`fb829b0`, one test in the suite and three checks in the walk `focus-neighbourhood`, which held at `18f5405` in a window that drew the document at full size). The third trigger below names the first of these. **One narrower case is left, and it is Edwin's to judge.** A note kept on every view, with no size of its own, changes size once on a view the person is not looking at, when a note is resized on another view (FEAT-0017, decision 19). Such a card comes from Spread or from an old state file.
- TASK-0106 keeps a desk with no version reading exactly as before, returns a scene of an unknown version byte for byte as it was found, lists it as unreadable and refuses to open it. TST-0074 checks all three without a window.
- TASK-0108 removes a move's source document only in the step that records the destination's acknowledgement, and undoes exactly what a landing added when no acknowledgement comes, the window closes or the display is removed. TST-0075 walks every path and asserts no desk holds a note twice.
- TST-0063 and TST-0064 walk restore, changed membership and narrow-window reachability with source-file state recorded before and after.

## Triggers

- Reopening a collection shows the old count after the live source changed.
- Switching form duplicates an open note or changes a source note's status.
- An old saved desk fails to load, silently loses notes, or changes their chosen reading size.
- A scene reopens with the count or the text it had when it was saved.
- A scene saved by a newer Deck is a plain desk, or gone, after an older Deck has run.
- After a send to another window the note is on neither desk, or twice on one.

## Closure evidence

Close only after the linked mitigation tasks supply compatibility and restore evidence and the corresponding walks record their outcomes. **On 2026-10-02 this risk stays `open` by that rule.** TASK-0104 has supplied its compatibility evidence and is not done. The walks TST-0052, TST-0063, TST-0064 and TST-0073 are a person's; none has been walked and the acceptance ledger holds no verdict for any of them. What the other four tasks have supplied is recorded in their own notes. The scenes feature repeated the scan on 2026-10-02 (FEAT-0023, "Risk scan"). It adds no camera persistence and saves nothing about a handoff, so neither of those is a hazard yet. A later change that saves yaw, zoom or a handoff's records repeats the scan. TST-0074, TST-0075, the walk TST-0076 and the acceptance check TST-0073 supply the scene and handoff evidence.
