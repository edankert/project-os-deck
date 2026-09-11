---
type: "[[task]]"
id: TASK-0063
aliases: ["TASK-0063"]
title: "The smoke run drives desks per view, the every-view mark and hide with a real pointer, and git status stays unchanged"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
parent: "FEAT-0015"
effort: "M"
due: ""
depends: ["TASK-0060", "TASK-0061", "TASK-0062"]
blocks: []
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The smoke run drives desks per view and hide

## Objective

Everything this feature draws is checked in a real Electron window over this repository, with pointer events that the browser hit-tests, and read back from the store as well as from the page. `node --test` cannot load the renderer, so this is the only gate on TASK-0060 to TASK-0062.

## Detail

New checks go into the Glass section of `desktop/src/main/smoke-glass.ts`, which [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] records. Each is shown to fail with its fix removed, and the note lists which break each one caught, as its `adequacy:` does for the checks already there. The section starts and ends with the whole-workspace reset [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]] adds, so no check inherits a desk from another.

**The checks.**

1. **Hide in Glass.** With two panes held, a real click on Hide notes: no pane is displayed, the store's desk is unchanged, and the button reads "Show 2 notes". A field card now lies where a pane was, judged over every near card, not by one hit test. `H` shows both panes at their stored places and sizes. After a reload the panes are shown.
2. **Hide in Spread.** The same button hides and shows the desk's cards; the desk is unchanged.
3. **`H` in a text field.** Typing `h` into the navigator's search box leaves the notes shown.
4. **A desk per view.** Lift a note on Issues and switch to Features: no pane for it. Lift another there and switch back: the first is at its place and the second is gone. The Issues bar names Features and its count.
5. **The mark.** A real click on the mark of a pane on Issues, then a switch to Features: the pane is there with the note's body, not the "not in this view" sentence. In Spread on Features, it is a card saying "not in this view". `V` on its header unmarks it, and after a switch to Issues it is gone from there.
6. **Stacking across the lists.** A press on a note on every view lying under a view's own pane raises it above; the store's drawn order agrees.
7. **Putting back.** Escape leaves the notes on every view and the front plane says how many stayed.
8. **A desk panel keeps its view.** A desk panel opened on Issues still shows the Issues desk after the focus window switches to Features. A throw onto it lands on the Issues desk, and the Features desk is unchanged.
9. **The tablet.** The served page, with Follow the Mac off and browsing another view, draws the Mac's current view's desk, and follows a view switch on the Mac within a second.
10. **An old state file.** The store restored from a state holding only `deskCards` draws the same panes on two different views, each marked on every view.
11. **Nothing is written.** The section's existing `git status` check stays last and still passes.

## Acceptance

- The eleven checks above are in the Glass section and pass in `DECK_SMOKE_ONLY=glass electron . --smoke` and in `bash tools/scripts/run-smoke.sh both`.
- Each of checks 1 to 10 was seen to fail with its fix removed, and [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]'s note says which break each caught.
- [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] gains [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]] in `covers:`, TASK-0060 to TASK-0062 in `tasks:`, a "desks per view and hide" line under "What it covers", and a dated Evidence paragraph.
- The `deck-smoke` continuous-integration job is green on the commit that lands them.

## Steps

- [x] Write checks 1 to 11 in `desktop/src/main/smoke-glass.ts`, using the helpers the section already has for real pointer events and store reads.
- [x] Break each fix in turn and record which check failed.
- [x] Update [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].

## Notes

Check 8 needs a second window, as the throw checks already do, and runs on one display. A desk panel on a second display is walked in [[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]], not claimed here.

## Outcome

**Done 2026-09-11.** `recordDesksPerView()` in `desktop/src/main/smoke-glass.ts` runs the ten checks after the orbit section, starting and ending with the whole-workspace reset; the section's `git status` check stays last. Three existing checks were rewritten for the new rule: the reload check returns to the view the panes are on, the view-switch check marks its held note on every view, and every read of the desk goes through `deskCardsOf` or the page's `__deckDesk()`. Each of checks 1 to 10 failed with its fix removed; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] lists the break each caught. One break needed a second try: making the renderer draw one fixed view stopped the run in the earlier pane section, before check 4, so check 4 was proved with the old rule instead, every new note on one shared desk. The Glass half of check 5 at first passed without the index lookup, because the pane reused the text it had loaded on Issues; it now also requires the note's own status beside "not in this view". **The `deck-smoke` job's verdict is not seen yet:** nothing is pushed, and pushing is Edwin's call. One full loopback run in three failed in a cascade that starts in the throw section, before these checks; it is [[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]].
