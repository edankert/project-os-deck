---
type: "[[change]]"
id: CHG-20260910-Deck-Opens-In-Glass
aliases: ["CHG-20260910-Deck-Opens-In-Glass"]
title: "Deck opens in Glass: a field where what needs you is in front, a lifted note brings its neighbourhood forward, a person's hands arrange the rest, a tablet follows the Mac's desk, and the whole link graph is one more arrangement"
status: merged
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["Edwin, 2026-09-10: 'Implement and Test Phase 0002 fully'", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
commit: ""
pr: ""
impacts: ["desktop/src/renderer/", "desktop/src/shared/", "desktop/src/main/host.ts", "desktop/src/main/store.ts", "desktop/src/main/main.ts", "desktop/src/main/smoke-glass.ts", "desktop/src/main/graph-service.ts", "desktop/src/main/orbit-worker.ts", "desktop/src/main/measure.ts", "desktop/src/preload.ts", "desktop/tests/"]
issues: ["[[ISS-0058-A-Card-Can-Be-Drawn-Under-A-Pane]]", "[[ISS-0059-The-Front-Band-Hides-What-A-Hand-Or-A-Lift-Asked-For]]", "[[ISS-0060-Deck-Can-Reopen-In-Spread-With-No-Address-Asking]]", "[[ISS-0061-Reduced-Motion-Is-Missing-From-A-Lift-And-A-View-Switch]]", "[[ISS-0062-A-Display-With-Only-A-Strip-Cannot-Receive-A-Throw]]", "[[ISS-0063-Checks-And-Notes-Claim-More-Than-They-Measure]]"]
features: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
related: ["[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[DES-0002-The-Glass-Cockpit]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---

# Deck opens in Glass

## What changed, for somebody using Deck

**Deck now opens on the field, not on the desk.** The notes of the view stand round the person at three distances. What the record says is owed to a person is in front, the view's own notes are to either side, and finished work is behind, drawn as small tiles on one canvas. Drag the background or press the arrow keys to turn. The compass at the bottom right says which way you face and how many notes are out of sight. Spread is one click away on the new surface toggle beside the views, and an address with `surface=spread` opens there.

**A click lifts a note, and what it is joined to comes forward.** The note becomes a pane on the front plane and its slot stays as a dashed outline. The notes it links to and the notes linking to it take the front band, the label says so, and the owed count keeps its place. With two held, the notes joined to both are marked and counted. × puts one back, ⌥× every other, and Escape all of them.

**A person's hands arrange the rest, for the session.** Drag a card down to pull it into the front band, up to push it behind; an owed note cannot be pushed, and the field says why. Rest the pointer on a card to see wires to its neighbours before lifting it. Drag a pane by its header, resize it by its corner, stack it, or widen it into the reading column. Drag a card to the field's edge and a strip names the other Deck windows that way: release on one and the note lands there, on a reader, a desk, a display with no window yet, or the tablet. Every one of these also has a key.

**A tablet shows the Mac's desk.** A page served by Deck's host now reads the store over two new read routes, `GET /deck/state` and `GET /deck/events`, and a note lifted on the Mac appears on the tablet within a second. The tablet keeps its own view and surface, can follow the Mac's note when asked, and still sends nothing back: both routes answer 405 to every other method.

**The whole link graph is one more arrangement of the field.** Choose Orbit on the surface toggle and every note in the workspace stands round the person, nearer the more the corpus points at it, clustered by phase, with its links as filaments. Rest the pointer on a link to read the sentence that made it; click a note to land on it; press ◎ on a pane to fly the orbit to that note. Notes with no link stand in a band along the top, and a link that alone holds a cluster on is drawn in its own colour. The three treatments DES-0001 drew, constellation, glass and blocks, are all there to compare; which one stays is Edwin's.

**Nothing a hand does writes to the record.** `git status` in the workspace is the same before and after every gesture above, and the smoke run checks it.

## What changed underneath

- The store gained a `surface` and a `session` part holding the pulled and pushed sets. The persister in `desktop/src/main/store.ts` drops the session, so a restart starts with nothing pulled; neither the session nor the yaw is ever in an address. The surface is not read back either, so Deck opens in Glass (ISS-0060).
- A desk card gained optional `w`, `h` and `wide`. Spread ignores them and shows the same note at the same place.
- Every view description names `glass` first in its surfaces, and every band table gained rows for the neighbourhood, a pull and a push, with owed still first.
- The shell gained two routes a served page cannot reach: `deck:windows:list` and `deck:window:throw`.
- Deck's host gained three more reads over Deck's own index: `/deck/graph/<workspace>`, its `/sentence`, and `/deck/orbit/<workspace>`. The orbit's layout is kept in Deck's user data directory as `deck-orbit-<workspace>.json`.
- `electron . --measure` takes the phase's numbers; they are in [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] and [[FEAT-0001-The-Corpus-Has-An-Inside]].
- Eight new node suites and a Glass section of the smoke run, which drives everything above with real pointer events: [[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]] to [[TST-0047-The-Orbit-Layout-Is-Solved-Once-And-Kept]].

## Five defects the smoke run found before a person did

Each was in Glass as first written, each made a check fail, and each is fixed with that check still in place.

1. **A view switch cut to the end.** A store broadcast during the second-long move redrew without the transition class, and every card jumped to its new place.
2. **A raised pane hid another pane's header.** Panes were stacked whole, so raising the lower of two covered the upper one's header. Headers and bodies now stack separately, every header above every body.
3. **A pane could disappear behind the reading column.** Opening the column narrowed the field and left a pane's tools under it. Panes are clamped into the field when drawn, never in the store.
4. **The throw's strip vanished as the pointer reached for a name.** The names are wider than the edge zone that summons them. The strip now stays while the pointer is over it.
5. **A reach could be cancelled by a click made earlier.** A press focuses a card, and a focus that arrived late started a reach for that card instead. Only keyboard focus reaches now.

## Two defects in the orbit, found the same way

6. **A dozen plans were one node.** Every `PLAN.md` without an `id` took `PLAN` as its id. An id two notes share now falls back to each note's path.
7. **The first layouts drew the corpus as a thin line.** A few notes that most others link to pulled the whole layout to one height and one arc. The layout is now Fruchterman–Reingold, spread to fill the cylinder by blending each coordinate with its rank.

## Hazards

No dependency was added, and nothing a person running Deck sets. Three environment variables and one flag are new, all for a developer: `DECK_SMOKE_ONLY=glass` runs the smoke run's Glass section alone and says so in its verdict, `DECK_SMOKE_DEBUG=1` prints each Glass check, `DECK_SMOKE_TRACE=1` records the field's reach and focus events for a failing check, and `--measure` takes the phase's numbers. One file is new on disk: the orbit's kept layout, one per workspace in Deck's user data directory, which Deck solves again if it is missing or unreadable. One long step is new: solving the layout the first time a workspace's orbit is opened takes about a second for 1,500 notes and two and a half for 2,700, once, on a worker thread so that no window waits for it. The first build solved it in the main process, which would have held every window's store traffic for those seconds. Deck's host answers five more reads, and the network smoke run asserts that the two a tablet follows refuse every write from the machine's own address; the graph path refuses a POST too. Deck's own risk notes are unchanged.

## What the independent review found, and what was done

The review of 2026-09-10 requested changes on the three features and on TST-0045. Its reproduced findings are six issues, each fixed with its check in place: a card could be drawn under a pane ([[ISS-0058-A-Card-Can-Be-Drawn-Under-A-Pane]]); the front band hid a pull into a full band, a push on a neighbour and most shared notes ([[ISS-0059-The-Front-Band-Hides-What-A-Hand-Or-A-Lift-Asked-For]]); Deck could reopen in Spread ([[ISS-0060-Deck-Can-Reopen-In-Spread-With-No-Address-Asking]]); reduced motion was missing from a lift and a view switch ([[ISS-0061-Reduced-Motion-Is-Missing-From-A-Lift-And-A-View-Switch]]); a display holding only a strip could not receive a throw ([[ISS-0062-A-Display-With-Only-A-Strip-Cannot-Receive-A-Throw]]); and several checks and notes claimed more than they measured, this note among them ([[ISS-0063-Checks-And-Notes-Claim-More-Than-They-Measure]]). Fixing them turned up one more: the orbit kept drifting under a pointer that was reading a link's sentence; a pointer over the orbit now pauses the drift.
