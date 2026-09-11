---
type: "[[feature]]"
id: FEAT-0015
aliases: ["FEAT-0015"]
title: "Each view keeps its own desk, a note can be kept on every view, and one button hides every held note in a window"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin 2026-09-11: 'I need a button to hide everything (all the open items) on the desk. Also, we probably need to have different open items on different views, maybe some can be marked to be open on all views?'", "[[DES-0002-The-Glass-Cockpit]]"]
goal: "A person can hide every note they are holding with one button and bring them all back with the same button, without putting any of them back. Each view (Issues, Features and the rest) keeps its own set of held notes, so switching view shows the notes held for that view; a note marked 'on every view' stays on the desk whichever view is chosen."
requirements: []
tasks: ["[[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]", "[[TASK-0059-A-Note-Is-Kept-On-Every-View]]", "[[TASK-0060-Hide-Notes-And-Show-Them-Again]]", "[[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]]", "[[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]", "[[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]]", "[[ISS-0067-Spread-Never-Brings-A-Card-Forward]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]]", "[[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Each view keeps its own desk, and held notes can be hidden

## Goal

**A person gets a Hide notes button, and each view gets its own desk.** The button hides every note held in the window and shows them again, and nothing is put back while they are hidden. Switching from Issues to Features shows the notes held for Features, not the ones held for Issues. A note marked **on every view** stays on the desk whichever view is chosen.

> [!quote] As asked, Edwin, 2026-09-11
> "I need a button to hide everything (all the open items) on the desk. Also, we probably need to have different open items on different views, maybe some can be marked to be open on all views?"

**Today the desk is one list per workspace.** Every note a person lifts in Glass or puts on the desk in Spread stays there across every view switch, so a desk built for triaging issues is still covering the field when the person moves to Features. The only ways to clear it are to put notes back: × for one, ⌥× for all the others, Escape for all of them. Each of those loses the arrangement.

**This restores a rule Edwin set in the Glass design and the build did not follow.** [[DES-0002-The-Glass-Cockpit]] rev 9, 2026-09-05, quoted him: "each view should allow for its own selected notes", because the view is the job a person is doing. On 2026-09-07 [[FEAT-0010-Lifting-A-Note]] kept one desk per workspace instead, reading "one desk per view" as honoured by the address. Edwin's request of 2026-09-11 overrides that reading.

Five words are used throughout, and each means one thing:

- The **desk** is the set of notes a person is holding in a workspace. Glass draws each one as a pane; Spread draws each one as a card.
- A **view** is one of the seven entries in the switcher: Overview, Intent, Features, Issues, Tests, Publication, Library. A **surface** (Glass, Spread, List, Orbit) is how a view is drawn. Each view gets its own desk; the surfaces still share one.
- A note **on every view** is held on every view's desk of that workspace at the same place. The label is "on every view", never "pin", because the cockpit's navigator already pins notes and means something else by it ([[REFERENCE-DES-0002-REVIEW]]).
- **Hide notes** takes every held pane or card off the screen in one window and leaves the desk unchanged.
- A **desk panel** is a popped-out window that carries only a desk.

## Scope

**In scope.**

- **Hide notes** in Glass, in Orbit and in Spread ([[TASK-0060-Hide-Notes-And-Show-Them-Again]]).
- **A desk for each view in the store**, with a state file written before this reading unchanged ([[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]).
- **The on-every-view mark**: its store action, stacking order across the two lists, and the rules for saved desks ([[TASK-0059-A-Note-Is-Kept-On-Every-View]]).
- **Glass and Spread** drawing the view's own desk and the notes on every view, with the mark on the pane header and on the Spread card, and the desk bar naming other views that still hold notes ([[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]]).
- **Desk panels, throws and the tablet**, each using the right view's desk ([[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]).
- **Smoke checks** in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]'s run for all of the above ([[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]).

**Out of scope.**

- A desk that crosses workspaces. [[FEAT-0010-Lifting-A-Note]] declined it on 2026-09-07 and nothing here changes that.
- A different desk per surface. Glass and Spread still show one desk for a given view.
- A hidden state that survives a restart, reaches another window, or enters an address.
- The tablet changing the desk or the mark. The tablet follows and does not steer ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]).
- A saved desk that remembers its view. That is the open question below; until Edwin answers, a saved desk opens on whichever view is current.
- Anything written to the record. Hiding, marking and switching desks change Deck's own state file only, and `git status` in the workspace is the check.

## Decisions

Each of these was chosen while planning, on 2026-09-11. Each is Edwin's to overturn, and the alternative considered is named so the choice can be reversed without rediscovering it.

1. **Hide notes is a toggle that hides; it does not put anything back.** Escape, × and ⌥× already put notes back, so a fourth way to do that would add nothing. One button in the top bar reads "Hide notes" while notes are shown and "Show N notes" while they are hidden. It is in the tab order with `aria-pressed`, and the `H` key toggles it from anywhere outside a text field. It is absent on the List surface and when nothing is held. The hidden state belongs to one window: it is not in the store, not in the state file and not in an address, the same as the field's turn (the yaw). The served tablet page gets its own button, because hiding sends nothing to the Mac.
2. **While notes are hidden, the Glass field deals cards into the space the panes covered.** A pane is an obstacle to the slot geometry (cards are never dealt under one), and a hidden pane stops being one. The held notes still shape the field: their neighbours stay in the front band, notes shared between them stay marked, and each held note's slot stays ghosted. *Alternative considered:* hidden notes stop shaping the field too, so the front band goes back to what needs you. Not chosen, because the request was to hide the items, not to let go of them; it is a small change if Edwin prefers it.
3. **A lift in the same window shows the hidden notes again.** A person who lifts a note wants to see it. A note arriving on the desk from another window, by a throw or by a click in a desk panel, does not show them; the button's count rises instead.
4. **Each view has its own desk, and the storage shape is additive.** `DeckState.deskCards` keeps its shape, one list per workspace, and now means the notes on every view of that workspace. A new `viewDesks` map holds each view's own notes, keyed by workspace and then by view id. The desk drawn for a view is both lists together. This supersedes the rule in [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]] and in the `select-view` reducer's comment that a view switch leaves the desk alone "because a desk holding notes from more than one view is the point". The on-every-view mark is what keeps that behaviour available.
5. **Nothing changes on screen on the day this lands, and no conversion runs.** A state file written before this has only `deskCards`, so every note already held reads as on every view, in every workspace. That is exactly what a person sees today. **A person who upgrades will find every note they were holding marked "on every view"** and can unmark any of them to give it back to one view. *Alternative considered:* move each workspace's existing desk into the desk of the view that is current when the file is read. Not chosen for two reasons. The state records one current view, so only the current workspace's desk could be placed. And the tablet's copy of the state is filtered by workspace id in `servedState` (`desktop/src/shared/served-state.ts`), so a key built from a workspace and a view would have been silently dropped from the tablet.
6. **Marking moves a note between the two lists.** Marking a note on every view moves it from the current view's list to the workspace's list at the same place and size, and removes it from every other view's own list so no view shows it twice. Unmarking moves it into the current view's own list, and it leaves every other view. The toggle is on the Glass pane header and on the Spread card, and `V` does the same from the keyboard on either.
7. **A note on every view is drawn in full on a view that does not hold it.** Today a Glass pane for such a note shows no body, only "This note is on the desk but not in this view", and Spread drops the card and counts it in "N cards not in this view". Either would make the mark useless on exactly the views it exists for. The pane shows the note's body, read by the note's path from Deck's own index; the Spread card is drawn with its id, title and status from the same index and marked "not in this view". A note the workspace no longer has is still dropped and counted.
8. **Stacking crosses the two lists.** A note just put on the desk, or raised by a press, comes on top whichever list holds it. [[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]] and [[ISS-0067-Spread-Never-Brings-A-Card-Forward]] made a press raise a pane or a card on 2026-09-11, and that must keep working. A state file with no stacking information draws in today's order. *Alternative considered:* notes on every view always lie under the view's own notes. Not chosen, because a press on such a pane would then do nothing visible.
9. **Putting back keeps the notes on every view unless the person names one.** × on a note on every view takes it off every view, because it is one note. Escape, ⌥× and Spread's Clear take off only the view's own notes, and the front plane or the desk bar says how many notes on every view stayed. *Alternative considered:* Escape clears both lists. Not chosen, because a mark that the next sweep undoes is not worth making.
10. **One reading column per drawn desk.** Widening a pane moves it into the reading column (the fixed column a widened pane occupies) and takes every other pane out. Widening a note on every view takes every other card in the workspace out of the column. Widening a view's own note takes out that view's other notes and the notes on every view. Either way, no view ever draws two panes in the column.
11. **Saved desks stay per workspace and keep their shape.** Saving records what the current view draws: its own notes and the notes on every view, in stacking order. Opening a saved desk replaces the current view's own notes with the saved ones; notes on every view stay where they are. A desk saved before this opens the same way. Switching view clears the name of the open desk, so a copied address never names a desk the screen is not showing; the `desk=` key itself is unchanged.
12. **A window's desk is the desk of the view it draws.** The focus window draws the store's current view, which every Mac window shares. A desk panel draws the view in its own address and does not follow the focus window's switcher; that is the rule [[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]] set for popped-out windows. So every desk action says which view it is for, and the store falls back to its current view when an action does not. A throw onto a desk panel lands on that panel's view's desk. With no view chosen yet, which happens only between opening a workspace and its first view, putting a note on the desk is refused rather than guessed.
13. **The tablet shows the desk of the Mac's current view,** whatever view the tablet itself is browsing. [[TASK-0057-The-Served-Page-Follows-The-Store]] promised that the tablet "shows the desk the Mac holds", and a throw to the tablet lands on that desk. *Alternative considered:* the tablet shows its own view's desk. Not chosen, because the tablet sends nothing back, so a throw from the Mac cannot know which view the tablet is showing.
14. **The desk bar names the other views that still hold notes,** in Glass's field bar and in Spread's desk bar, for example "also held: Features 2, Tests 1". DES-0002 rev 9 asked for this "so nothing is silently left behind", and a desk per view is exactly how a note gets left behind. A view the provider no longer offers is not named; its notes stay in the file.
15. **This belongs to PHASE-0002, Glass.** The desk per view comes from the Glass design, and every surface this touches except Spread's card is Glass's: the pane, the throw, the tablet that follows the store. PHASE-0002 is `active`. PHASE-0001, which built Spread and the store, owes only walks and one triage ([[PHASE-0001-Deck]]), and adding a feature there would reopen a phase that is otherwise closed. The small changes to Spread and to PHASE-0001's done tasks are recorded here and in amendment paragraphs on those notes; they are not new PHASE-0001 scope.

## Open question for Edwin

**Should a saved desk remember the view it was saved on?** As planned it does not: opening "triage" from the desk list, or from an address with `desk=triage`, puts its notes on whichever view is current. If it should remember, opening it would switch to that view first, and a saved desk would gain a view field. Nothing else in this feature waits on the answer.

## Acceptance

- Hide notes hides every pane in Glass and every desk card in Spread in one click, and the same button, reading "Show N notes", brings them back at the same places and sizes. The store's desk is identical before, during and after.
- While hidden, a Glass card can be dealt where a pane was; the neighbours of the held notes are still in the front band.
- `H` outside a text field toggles the same state, and the button is reachable by Tab with `aria-pressed`.
- The hidden state is gone after a reload, is not shared with a second window, and appears in no address.
- A note lifted on Issues is not on the Features desk, and is still on the Issues desk after a switch to Features and back, at the same place.
- A note marked on every view is on every view's desk at one place, drawn with its body in Glass and as a card in Spread on a view that does not hold it; unmarked, it stays only on the current view.
- A state file written before this feature opens with the same notes, at the same places, on every view of every workspace, each marked on every view.
- A desk panel shows the desk of the view in its own address and does not change when the focus window switches view; a throw onto it lands on that view's desk.
- The tablet shows the desk of the Mac's current view, and follows it when the Mac switches view.
- Escape and Clear leave the notes on every view where they are and say how many stayed; × on one takes it off every view.
- A pane on every view raised by a press covers the view's own panes.
- After a walk of all of the above, `git status` in the workspace is unchanged.

## Spec-ambiguity check, 2026-09-11

Run before any ID was allocated (`tools/skills/issue-intake/SKILL.md`, step 1).

- **Every term has one meaning.** "Open items" means held notes: panes in Glass, cards in Spread. "Views" means the switcher's seven views and not the four surfaces. That is Deck's own vocabulary, and it is what Edwin meant in DES-0002 rev 9 when he asked for "its own selected notes" per view. Assumed and recorded; if he meant surfaces, the store half of this plan would key by surface instead.
- **Expected against actual is observable.** Today a view switch keeps every held note on screen and nothing hides them without putting them back.
- **Scope is bounded** by the out-of-scope list above.
- **Success is verifiable.** The walk is [[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]], the store suite is [[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]], and the smoke checks are listed in [[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]].
- **Hidden conflicts: two found, both settled by the request itself.** The request reverses [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]'s rule and [[FEAT-0010-Lifting-A-Note]]'s reading of one desk per view; see the impact analysis below. "Maybe" in "maybe some can be marked" was read as a proposal to build, because without the mark there is no way to keep the behaviour Deck has today.

No sibling issue: this is a feature request, and a search of `docs/issues/` for "desk", "hide" and "every view" found no issue asking for either part.

## Impact analysis, 2026-09-11

**What was checked.** [[FEAT-0003-One-Store-In-The-Main-Process]] (the state file and the broadcast to every window), [[FEAT-0005-Spread-Cards-On-A-Desk]] with [[TASK-0016-A-Desk-Is-Saved-And-Reopened]] and [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], [[FEAT-0006-Every-State-Has-An-Address]] (the `desk=` key), [[FEAT-0004-Windows-On-Any-Screen]] with [[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]] (popped-out windows keep their own view), [[FEAT-0010-Lifting-A-Note]], [[FEAT-0014-The-Hands]] with [[TASK-0054-A-Held-Note-Is-A-Pane]], [[TASK-0055-Throw-To-A-Screen]] and [[TASK-0057-The-Served-Page-Follows-The-Store]], and ADR-0001 to ADR-0004. This project has no `REQ-*` notes; the acceptance lines of those tasks and features are the constraints.

**Contradictions, each resolved by Edwin's request, and each amended in place by a task rather than rewritten:**

- [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], acceptance: "Switching views changes the navigator and leaves the desk alone, so a desk can hold notes from more than one view." [[TST-0019-The-Desk-Is-Chosen-And-Arranged]] expects the same, and `desk-model.test.mjs` asserts it. Superseded by decision 4; the mark keeps the old behaviour available. [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]] adds an amendment paragraph to both notes, rewrites that one check, and rewrites the reducer's comment.
- [[FEAT-0010-Lifting-A-Note]], "One desk model, two surfaces": "DES-0002 asked for one desk per view; a desk belongs to an address, and an address names a view, so that is honoured by the address rather than by a second store." Superseded in part. Glass and Spread still show one desk model, and it is now kept per view. Amended by TASK-0058.
- [[TASK-0057-The-Served-Page-Follows-The-Store]], "The desk is per workspace and is shared", and [[TASK-0055-Throw-To-A-Screen]], "the note is on the desk everywhere, because the desk is per workspace". Both become per view (decisions 12 and 13). Amended by [[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]].
- [[PHASE-0002-Glass]], out of scope: "One sidecar serves one workspace, and the desk is per workspace." The rule it states, no desk across workspaces, still holds. The phase note says so as of 2026-09-11.

**Tensions that are not contradictions.**

- **The address.** `DeckAddress` does not change. An address names a view, and the view's desk now comes with it; `desk=` still names a saved desk. The address is applied workspace first, then view, then desk (`applyAddress` in `desktop/src/renderer/renderer.ts`), which is the order a desk per view needs, and TASK-0059 keeps a check on it.
- **The served state.** `/deck/state` gains `viewDesks`, filtered by the same workspace rule as every other part. No new kind of data reaches the network: the tablet already receives every held note.
- **The smoke run and the measurement** reset the desk with `clear-desk`. Under decision 9 that would leave notes on every view behind, so they reset the whole workspace's desk instead (TASK-0058).
- **Phase.** No conflict: PHASE-0002 is active, and nothing here needs PHASE-0004 or PHASE-0003.

## Risk scan, 2026-09-11

**No trigger applies, so no `RISK-*` note is created.** Nothing here adds a dependency, an environment variable, a configuration surface, a path change, a long-running step, or a new exposure. The state file and `/deck/state` each gain one key, additively. Both readers of that file ship together from this repository.

**One hazard is accepted and written down rather than tracked.** An older build of Deck reading a newer state file ignores `viewDesks`, and its next save drops them, so notes held per view would be lost on a downgrade. Deck has no releases and one user, so the plan accepts this. A first release would need a `RISK-*` note for it.

## Links

- Phase: [[PHASE-0002-Glass]]
- Plan: `docs/features/view-desks/plan/PLAN.md`
- Tasks: [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]], [[TASK-0059-A-Note-Is-Kept-On-Every-View]], [[TASK-0060-Hide-Notes-And-Show-Them-Again]], [[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]], [[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]], [[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]
- Acceptance walk: [[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]]
- Store suite: [[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]
- Smoke run: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Design: [[DES-0002-The-Glass-Cockpit]], rev 9, "The desk belongs to the job; the view is the job"
- Code: `desktop/src/shared/types.ts`, `desktop/src/shared/store-state.ts`, `desktop/src/shared/served-state.ts`, `desktop/src/renderer/glass.ts`, `desktop/src/renderer/renderer.ts`, `desktop/src/renderer/cards.ts`, `desktop/src/main/main.ts`, `desktop/src/main/smoke-glass.ts`

## Where this stands

**2026-09-11: built and tested; the walk is Edwin's.** All six tasks are done. The store suite ([[TST-0049-A-Desk-For-Each-View-And-A-Note-On-Every-View-In-The-Store]]) passes 13 of 13 and fails for each of the four breaks its note names. The Glass section of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]) drives every acceptance line above with a real pointer, 21 new checks, each shown to fail with its fix removed. The feature is at `review`: the walk [[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]] is a person's, and the open question above is still Edwin's.

**2026-09-11: planned, nothing built.** Six tasks, one store suite and one walk. The main session implements next, starting with [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]].

**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** Hide notes first takes a note out of the middle of the field, if one is there, and then hides every pane. Showing the notes again does not put one back in the middle.
