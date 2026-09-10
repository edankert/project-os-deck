---
type: "[[change]]"
id: CHG-20260910-Deck-Opens-In-Glass
aliases: ["CHG-20260910-Deck-Opens-In-Glass"]
title: "Deck opens in Glass: a field where what needs you is in front, a lifted note brings its neighbourhood forward, a person's hands arrange the rest, and a tablet follows the Mac's desk"
status: merged
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["Edwin, 2026-09-10: 'Implement and Test Phase 0002 fully'", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
commit: ""
pr: ""
impacts: ["desktop/src/renderer/", "desktop/src/shared/", "desktop/src/main/host.ts", "desktop/src/main/main.ts", "desktop/src/main/smoke-glass.ts", "desktop/src/preload.ts", "desktop/tests/"]
issues: []
features: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]"]
related: ["[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[DES-0002-The-Glass-Cockpit]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---

# Deck opens in Glass

## What changed, for somebody using Deck

**Deck now opens on the field, not on the desk.** The notes of the view stand round the person at three distances. What the record says is owed to a person is in front, the view's own notes are to either side, and finished work is behind, drawn as small tiles on one canvas. Drag the background or press the arrow keys to turn. The compass at the bottom right says which way you face and how many notes are out of sight. Spread is one click away on the new surface toggle beside the views, and an address with `surface=spread` opens there.

**A click lifts a note, and what it is joined to comes forward.** The note becomes a pane on the front plane and its slot stays as a dashed outline. The notes it links to and the notes linking to it take the front band, the label says so, and the owed count keeps its place. With two held, the notes joined to both are marked and counted. × puts one back, ⌥× every other, and Escape all of them.

**A person's hands arrange the rest, for the session.** Drag a card down to pull it into the front band, up to push it behind; an owed note cannot be pushed, and the field says why. Rest the pointer on a card to see wires to its neighbours before lifting it. Drag a pane by its header, resize it by its corner, stack it, or widen it into the reading column. Drag a card to the field's edge and a strip names the other Deck windows that way: release on one and the note lands there, on a reader, a desk, a display with no window yet, or the tablet. Every one of these also has a key.

**A tablet shows the Mac's desk.** A page served by Deck's host now reads the store over two new read routes, `GET /deck/state` and `GET /deck/events`, and a note lifted on the Mac appears on the tablet within a second. The tablet keeps its own view and surface, can follow the Mac's note when asked, and still sends nothing back: both routes answer 405 to every other method.

**Nothing a hand does writes to the record.** `git status` in the workspace is the same before and after every gesture above, and the smoke run checks it.

## What changed underneath

- The store gained a `surface` and a `session` part holding the pulled and pushed sets. The persister drops the session, so a restart starts with nothing pulled; neither the session nor the yaw is ever in an address.
- A desk card gained optional `w`, `h` and `wide`. Spread ignores them and shows the same note at the same place.
- Every view description names `glass` first in its surfaces, and every band table gained rows for the neighbourhood, a pull and a push, with owed still first.
- The shell gained two routes a served page cannot reach: `deck:windows:list` and `deck:window:throw`.
- Six new node suites and a Glass section of the smoke run, which drives everything above with real pointer events: [[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]] to [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].

## Five defects the smoke run found before a person did

Each was in Glass as first written, each made a check fail, and each is fixed with that check still in place.

1. **A view switch cut to the end.** A store broadcast during the second-long move redrew without the transition class, and every card jumped to its new place.
2. **A raised pane hid another pane's header.** Panes were stacked whole, so raising the lower of two covered the upper one's header. Headers and bodies now stack separately, every header above every body.
3. **A pane could disappear behind the reading column.** Opening the column narrowed the field and left a pane's tools under it. Panes are clamped into the field when drawn, never in the store.
4. **The throw's strip vanished as the pointer reached for a name.** The names are wider than the edge zone that summons them. The strip now stays while the pointer is over it.
5. **A reach could be cancelled by a click made earlier.** A press focuses a card, and a focus that arrived late started a reach for that card instead. Only keyboard focus reaches now.

## Hazards

No dependency, environment variable, path or long-running step was added. One contract grew: Deck's host answers two more reads, and the network smoke run asserts that both refuse every write from the machine's own address. Deck's own risk notes are unchanged.
