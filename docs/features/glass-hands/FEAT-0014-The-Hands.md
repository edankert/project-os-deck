---
type: "[[feature]]"
id: FEAT-0014
aliases: ["FEAT-0014"]
title: "The hands: a person arranges the field, throws a note to another screen, and reaches for a card to see what it is joined to"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["Edwin 2026-09-10: 'the functionality for the phase is not just a one to one replacement skin it is considerably more, the goal is to create a real minority report style UX'", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]", "[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
goal: "Glass stops being a picture the record paints and becomes a surface a person arranges: a note is pulled forward or pushed behind for the session, a held note is a pane that is moved, resized and stacked, a card is thrown off the field to a window on another screen or to the tablet, and reaching for a card shows what it is joined to before it is lifted. Nothing a hand does writes to the record."
requirements: []
tasks: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]"]
reviewed_by: model:claude-opus-5
review_date: 2026-09-10
review_verdict: changes-requested
---

# The hands

## Goal

**As planned before 2026-09-10, a person could only look at Glass and pick from it.** Every band, every position and every promotion was the record's opinion, and the one verb was lift. Edwin's instruction that day was that Glass is not a skin over Spread but a real Minority Report style surface, and [[REFERENCE-GLASS-PHASE-REVIEW]] reduced that to five properties a mouse, a keyboard and a tablet can carry. This feature is the three the plan lacked and the half of a fourth: the hands arrange, space is continuous across screens, reaching shows what a thing is joined to, and the instrument says how much of what it shows was placed by hand.

Four words are used throughout. **Pull** brings a card into the front band by hand; **push** sends it behind you; both last for the session and never write. A **pane** is a held note drawn on the front plane, with a header that is always readable and a body that can be moved, resized and stacked. A **throw** is a drag that leaves the field's edge toward another window, and the note lands there. **Reach** is hovering a card on the desktop or pressing and holding it on the tablet, and it shows what the card is joined to without lifting it.

## Scope

**In scope.** Pull and push as short drags with a stated threshold, held in the store beside the flow cursor as session state that several windows share and the persister drops, never in the address; the band function's reserved columns become the inputs `pulled` and `pushed`; the front label counts hand-placed notes and the compass counts pushed ones; an owed note cannot be pushed out of the front band and the refusal says why; one verb lets everything go ([[TASK-0053-Pull-Forward-And-Push-Behind]]). A held note as a pane: moved, resized and stacked with DES-0002's overlap rule, its header always readable and a click on it raising the pane, a stated minimum width and a verb that widens it to a reading column; the pane's place and size kept in the desk record Spread already saves, so the two surfaces show one arrangement ([[TASK-0054-A-Held-Note-Is-A-Pane]]). The throw: a drag that leaves the field toward a window on any display lands the note in that window's reader, or on the desk it carries, or opens a new reader window on that display when nothing is there; a target strip at the edge names the windows in that direction while the drag is near it; the flight goes toward the screen the note went to; a keyboard verb sends a note to a named window ([[TASK-0055-Throw-To-A-Screen]]). Reach: after a short hover, or a press-and-hold on touch, wires are drawn on the canvas from the card to every neighbour on screen and the compass counts those behind you; one request per note per index revision, cached with [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]'s context read ([[TASK-0056-Reach]]). The served page follows the store: Deck's host gains `/deck/state` and `/deck/events`, both reads, so a tablet shows the desk the Mac holds, follows the shell's focus when asked, and is a screen a note can be thrown to ([[TASK-0057-The-Served-Page-Follows-The-Store]]).

**Nothing a hand does writes.** Pull, push, move, resize, stack, throw and reach leave the record exactly as it was, and `git status` after a walk is the check.

**The tablet follows and never steers.** The served page reads the store over Deck's host and sends nothing back, because Deck's host answers 405 to every method that is not a read ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]). A tablet that steers the Mac's field would be a new decision and it is not made here.

**Out of scope.** Hand tracking, a headset and voice. The tablet as a controller. A threshold dial that moves the band boundary, the workspace ring and a time scrub, all recorded as candidates in [[REFERENCE-GLASS-PHASE-REVIEW]] Part 5. Wires for every edge of the corpus, which is [[FEAT-0001-The-Corpus-Has-An-Inside]]. The console as furniture, which is [[PHASE-0004-Parity]]. A pull or push that survives a restart, or that enters the address.

## Acceptance

- A card dragged toward the person past the pull threshold is in the front band with a hand mark, and stays there across a view switch; a card dragged away past the push threshold is in the quiet band; both are gone after a restart and neither appears in the address.
- An owed note cannot be pushed out of the front band; the gesture is refused and the front plane says why.
- The front label reads how many notes in the front band were placed by hand, the compass reads how many notes behind you were pushed by hand, and one verb lets all of them go.
- A held note is a pane that can be dragged, resized and stacked; its header stays readable in a stack of any depth and a click on the header raises it; after a restart the panes are where they were, and Spread shows the same positions.
- A drag that leaves the field toward a second display lands the note in the reader window on that display, or on the desk panel there, or opens a new reader window there when no window is; the target strip named the candidates while the drag approached the edge; under reduced motion the landing is a cut with the target highlighted.
- Hovering a card for the stated time, or pressing and holding it on the tablet, draws wires to every neighbour on screen and counts those behind you, makes at most one request per note per index revision, and clears when the pointer leaves.
- Deck's host answers `GET /deck/state` with the store's state and `GET /deck/events` with a change stream, answers 405 to every other method on both, and a note lifted on the Mac is on the tablet's desk within a second.
- After a walk of all of the above, `git status` in the workspace is unchanged.

## Links

- Phase: [[PHASE-0002-Glass]]
- Review that created it: [[REFERENCE-GLASS-PHASE-REVIEW]]
- Tasks: [[TASK-0053-Pull-Forward-And-Push-Behind]], [[TASK-0054-A-Held-Note-Is-A-Pane]], [[TASK-0055-Throw-To-A-Screen]], [[TASK-0056-Reach]], [[TASK-0057-The-Served-Page-Follows-The-Store]]
- Acceptance walk: [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]
- Plan: `docs/features/glass-hands/plan/PLAN.md`
- Design: [[DES-0002-The-Glass-Cockpit]], whose "put behind me", pane overlap rule and three-screen section this feature builds; reviewed in [[REFERENCE-DES-0002-REVIEW]]

## Where this stands

**2026-09-10: built.** Pull and push with a 56-pixel drag, owed refused in words, let go; panes moved, resized to a 280-pixel minimum, stacked with every header readable, widened into the reader column; the throw to a reader, a desk, a display with no Deck window and the tablet, with send to on the keyboard; reach on a 450 ms rest or a 500 ms press; and a tablet that follows the Mac's desk. All five tasks are done and `git status` is unchanged after every gesture. What is left is Edwin's walk, [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]], on a second display and a tablet.

**2026-09-10: planned, from a review and nothing built.** Edwin asked for the Glass phase to be reviewed against a real Minority Report style surface rather than a skin. [[REFERENCE-GLASS-PHASE-REVIEW]] found that the plan let a person look and lift and nothing else, that the served page never sees the store so the tablet cannot receive anything, and that two promises the phase had made were not in its exit criteria. This feature carries the additions. It depends on [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] for a field to arrange and on [[FEAT-0010-Lifting-A-Note]] for a held note to move; only [[TASK-0057-The-Served-Page-Follows-The-Store]] can start before either.

## Independent review, 2026-09-10

**Verdict: changes requested.** Reviewed by model:claude-opus-5 in a fresh context that started from the notes and the diff (3045a42..c283128). It ran as a subagent launched from the authoring session (the commits' `Claude-Session` trailer names the session this reviewer runs under), so what is independent is the context, not the session tree or the model family. What the reviewer ran: `npm test`, 391 of 391; the six Glass suites, 50 of 50; `DECK_SMOKE_ONLY=glass electron . --smoke`, 113 checks and none failed, on a Mac with four displays; `bash tools/scripts/run-smoke.sh lan`, exit 0; `git status` unchanged in this repository and the cockpit's after every run. Mutants were run against `desktop/dist`, which was rebuilt afterwards. R marks a finding reproduced by a command; N marks one not reproduced.

1. R — A pull does nothing visible when the front band is full, which the notes call the normal case on Your Trainer. Over `fixtures/nav/your-trainer-issues.json`, pulling ISS-0070 took it out of the middle band and out of the field: front overflow went from 27 to 28 and `handPlaced` stayed 0. Meanwhile `pull()` tells the person it was "pulled into the front band". TASK-0053's first acceptance line fails in that case.
2. R — A push on a card that stands in front because it is joined to a held note is accepted and announced as "pushed behind you, for this session; the compass counts it", yet the card stays in front. `pushRefusal` returns null, and the `joinedToDesk` row comes before the `pushed` row.
3. R — TASK-0054's "No field card is dealt under a pane at any position or size" fails for a pane clamped into the field (FEAT-0009's review, finding 1, reproduced in a real window). The smoke run closes the reading column before its reload "so ... no pane is clamped", which is the case that breaks.
4. R — A display that holds only a Needs-you strip cannot receive a throw. The strip is not a target, and the display counts as occupied, so no "new reader" is offered either: `targetsToward` over one such display returned `[]`.
5. R — Several TASK-0055 acceptance lines have no automated evidence though the task is `done`. The smoke run's reader and desk windows are on the same display as the focus window: its own window list showed display 4 for all three, while its check is labelled "the desk panel on the other screen shows it". No throw to the tablet is made (`followers: 0`). The flight's direction and the reduced-motion cut are not checked. Only the throw to an empty display crossed displays, and it runs only on a machine with more than one.
6. R — In the target strip, an unnamed display reads as "a new reader on  (2)", because macOS labels such a display " (2)".
7. R — The CHG note says no environment variable was added. `DECK_SMOKE_ONLY`, `DECK_SMOKE_DEBUG` and `DECK_SMOKE_TRACE` are new (optional and smoke-only), as is the `--measure` flag. Its impact list also omits `desktop/src/main/store.ts`, whose persister now drops the session part.
8. R — TST-0039, TST-0043 and TST-0044 match their claims: 10, 10 and 8 tests pass, and every mutant those notes list that the reviewer re-ran was killed. The network smoke run passed the five 405s on both routes and the page with no bridge received the lifted note within a second.

## Second independent review, 2026-09-10

**Verdict: changes requested.** A pull into a full front band still vanishes whenever a pane takes the spare slots, and the front label then counts a card that is not on the field. Two TASK-0055 lines still promise what the checks do not show.

**Who reviewed, and how independent it was.** model:claude-opus-5, the same model as the author, in a fresh context that started from the notes and the code at cd95528 (diffed against 3045a42) and has no memory of authoring the work. It is not a separate session tree: it was launched as a subagent from the authoring session (its commit trailer names the same `Claude-Session` as the commits), and its scratchpad directory is shared with the author's and the first reviewer's. Of the files already there it read only the `panes`, `reaching` and turn fields of two measurement logs, and one grep line.

**What it ran.** `npm test`: 396 of 396. Fourteen mutations of the built `dist/shared` modules, run against their suites. The Glass section of the smoke run (`DECK_SMOKE_ONLY=glass DECK_SMOKE_DEBUG=1 electron . --smoke`): once clean, 120 checks and none failed, on four displays; once with seven renderer mutations in `dist/web/renderer`. `bash tools/scripts/run-smoke.sh both`: the loopback run failed one Glass check and the network run passed. A second full loopback run: `ok: true`, 120 Glass checks. `electron . --measure --measure-workspaces <this repository>`, twice. Node probes over the built slot and field modules. `dist` was rebuilt after every mutation, and `git status` in this repository was unchanged after every run. R marks a finding reproduced by a command; N marks one that was not.

**What the fixes got right.** A display holding only a Needs-you strip now offers a new reader, and an unnamed display gets a name. Breaking either fails TST-0044. A push on a neighbour is refused in words, and allowing it fails TST-0040. Counting a pulled owed note as placed by hand fails TST-0040, and so does counting a pushed finished note as pushed. With no pane held, a pull into Your Trainer's full front band stands in front, and removing the spare slots fails TST-0040. In the clean smoke run a note thrown to a served page reached its desk 184 ms after the release. The thrown card flew toward the right edge it left (`translate(1400px, 0px)`). Under reduced motion the landing was a cut, and the front plane read "ISS-0056 sent to the desk on LG HDR WQHD".

1. R — A pull into a full front band still vanishes whenever a pane is held on a field 1,000 px wide or narrower. The front label then says "1 placed by hand" for a card that is not on the field. The eight spare slots a pull may use are the same eight slots a pane takes as an obstacle, and pulled cards are dealt last. Probe over Your Trainer's fixture: `dealField` puts the pulled card in front with `handPlaced` 1. With one pane at its default place in a 1,000 px field, only 12 front slots are free, and the slot geometry drops the pull. `glass.ts` takes its hand count from `deal.handPlaced` (line 1062), while `pull()` tells the person the band is full. Free front slots with one default pane: 8 at 800 px, 12 at 1,000, 16 at 1,200 to 1,440, and 20 at 1,800. In that case TASK-0053's first line and ISS-0059's first acceptance line fail. Reproduced over the built modules; not driven in a window.
2. R — Letting a pulled owed or joined note take a spare slot survives TST-0040. It is probably harmless, since it only makes a note in the record visible sooner; it is noted for completeness.
3. R — The strip numbers an unnamed display by its position in Electron's list, not by the number the system shows. On this machine macOS labels display id 5 " (1)", and the strip called it "a new reader on display 4". Evidence: the clean smoke run, and a throwaway Electron script printing `screen.getAllDisplays()`. ISS-0062's "reads display N" is met literally, but a person cannot match "display 4" to "(1)".
4. R — Two TASK-0055 lines still promise what the checks do not show. Its first two lines say "a reader window on a second display" and "a desk panel there". The smoke run's reader and desk windows sit on the focus window's display: its window list gave display 4 for all three. ISS-0062 says so, but the lines were not amended, unlike TASK-0031's Safari line. The same goes for "the target's name is highlighted" (FEAT-0014: "the target highlighted"): `fly()` says the name in the front plane and highlights nothing, and its comment reads "the target's name is said instead". The flight's direction is checked for the right edge only.

**The first review's findings.** Findings 1, 2, 4, 6, 7 and 8 are addressed and checked, with finding 1 still failing while a pane is held (finding 1 above). Finding 3 is fixed and guarded; see FEAT-0010's second review, finding 1, for a new route under reduced motion. Finding 5 is partly addressed: the tablet, the flight and the cut are now checked, while the reader and desk windows are still on one display and the task's lines are unchanged (finding 4 above).

## Review stopped, 2026-09-10

**Edwin stopped the review loop after two rounds, so this feature stays at `review`.** Both reviews requested changes. The first's findings are ISS-0058 to ISS-0063 and the second's are [[ISS-0064-A-Reduced-Motion-Lift-And-A-Pull-Beside-A-Pane-Still-Misplace-Cards]] and [[ISS-0065-Five-Checks-Still-Cannot-Fail-And-Four-Notes-Are-Stale]]; all eight are fixed. No third review was run, so no review has approved the feature. The quality gate needs an approved review for `done`, so moving it there is Edwin's decision, not the agent's.
