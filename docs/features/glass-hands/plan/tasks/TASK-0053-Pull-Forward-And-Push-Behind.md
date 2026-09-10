---
type: "[[task]]"
id: TASK-0053
aliases: ["TASK-0053"]
title: "Pull forward and push behind: a card is placed in the front band or behind you by hand for the session, an owed note cannot be pushed out, and the front plane says how many notes a hand placed"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[FEAT-0014-The-Hands]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
parent: "FEAT-0014"
effort: ""
due: ""
depends: ["TASK-0029", "TASK-0031"]
blocks: ["TASK-0055"]
related: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[TASK-0029-The-Band-Function]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: ["[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]", "[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Pull forward and push behind

## Objective

A person drags a card toward themselves and it joins the front band; they drag it away and it goes behind them. Both last for the session, both are shared by every window, neither survives a restart, neither enters the address, and neither writes anything. The front plane says how many of the notes in front were placed by hand, and the compass says how many behind were pushed there. One verb lets everything go.

## Detail

**DES-0002 had this and the plan dropped it.** The design's first consequence offered "put behind me" on an open card as the direct-manipulation form of the suppressed group, per session and never a write. The plan of 2026-09-07 kept the compass and the count and left the gesture out, so a person could only watch the band the record computed. This task restores the gesture and adds its opposite.

**The gesture is a short drag with a threshold.** A card dragged toward the viewer, which on the cylinder means down and larger, past a stated distance is pulled; dragged up and smaller past the same distance, it is pushed. The threshold is an input to the recogniser and is written in this note when chosen, because the walk may move it. On touch the same drags apply. On the keyboard, the navigator row gains two verbs, pull and push, so the arrangement is reachable without a pointer.

**Where the state lives, and why it is the store.** The pulled and pushed sets are held in the store beside the flow cursor slot [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] reserved, not in the renderer, because the navigator and the field must agree about what is in the front band and both read the store, and because a popped-out Needs-you strip on another screen should show what was pulled. They are the first state that is shared between windows and must not be kept: the store's persister drops a named session part of the state, and a restart starts with both sets empty. Neither set is in the address, by the rule the DES-0002 review proposed and [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] applies to the yaw: what a person reopens tomorrow is the view, the desk and the note, not where their hands were today.

**The band function reads two more inputs.** [[TASK-0029-The-Band-Function]] reserved columns for held and joined-to-desk; this task adds `pulled` and `pushed` in the `band` section of every description and in the function. Pulled wins the front band over the subject. Pushed wins the quiet band over the subject. Neither beats owed: an owed note is the record's opinion that a person is needed, and a hand does not overrule it. Pushing an owed note is refused, the card springs back, and the front plane says in words why it stayed.

**The instrument says what a hand did.** A pulled card carries a hand mark, and the front label reads the count of hand-placed notes beside the owed count that [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]] pins in place. The compass reads the count behind you and, beside it, how many were pushed by hand, so the quiet band cannot quietly become a place a person hid things. A **let go** verb on the label clears both sets; esc keeps its meaning of sweeping the desk and does not touch them.

## Acceptance

- A card dragged toward the person past the threshold is in the front band with a hand mark, and stays there across a view switch that keeps the note in view; a card dragged away past the threshold is in the quiet band.
- Both sets are empty after a restart, absent from the address, and the same in every window of the workspace.
- Pushing an owed note is refused: the card returns to its slot and the front plane says why.
- The front label counts the hand-placed notes in the front band; the compass counts the pushed notes among those behind; let go clears both and the counts read zero.
- The band function is pure and tested over the two new inputs, including the rule that owed beats pushed and pulled beats subject.
- A pull, a push and a let go are each a store transition tested without Electron, and the persister test shows the session part is dropped on save.
- The navigator offers pull and push on a row, and a keyboard-only pull lands the note in the front band.
- `git status` in the workspace is unchanged after the smoke step that pulls, pushes and lets go.

## Steps

- [x] Add the session part to the store state with the pulled and pushed sets, the three actions, and the persister rule that drops it; test both.
- [x] Add `pulled` and `pushed` to the band section and the band function, with the owed-beats-pushed rule; extend the fixtures.
- [x] Add the drag recogniser to the field with the threshold as an input; write the chosen number here.
- [x] Draw the hand mark, the hand-placed count on the front label, the pushed count on the compass, and the let go verb.
- [x] Add pull and push to the navigator row for the keyboard.
- [x] Extend the smoke run: a real pointer drag that pulls, a drag that pushes, a refused push on an owed note, let go, and a `git status` check.
- [x] Write the automated test notes and link them from `tests:`.

## Notes

The DES-0002 review's literature says to expect a "behind you" band to become a forgetting machine, and pushing by hand makes that easier, not harder. The pushed count on the compass is the mitigation, and [[PHASE-0002-Glass]]'s exit criterion about looking behind after a week is where the answer is recorded.

## Outcome

**Done 2026-09-10.** A card dragged down past **56 pixels** (`PULL_THRESHOLD_PX`) is pulled into the front band; dragged up past the same distance, it is pushed behind. The sets live in the store's `session` part, keyed by workspace, shared by every window; the persister writes the state without it and a restart reads none. Pushing an owed note is refused: the card shakes back and the front plane says "ISS-0056 stays in front: it is owed a decision, and a hand does not overrule the record". A pulled card carries ✋, the bar counts the notes a hand placed in front, and the compass counts the notes pushed there. **Let go** on the bar clears both and is offered whenever a hand has placed anything in the workspace, not only in the view on screen.

**Evidence.** [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]] for owed beats pushed and pulled beats the subject; [[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]] for the store and the persister; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] for the drags, the refusal, the counts, the pull surviving a view switch and let go, with `git status` unchanged.
