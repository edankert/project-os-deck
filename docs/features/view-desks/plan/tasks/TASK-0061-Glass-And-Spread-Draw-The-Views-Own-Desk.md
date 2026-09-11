---
type: "[[task]]"
id: TASK-0061
aliases: ["TASK-0061"]
title: "Glass and Spread draw the view's own desk and the notes kept on every view, with the mark on the pane and the card"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "Edwin 2026-09-11: 'we probably need to have different open items on different views, maybe some can be marked to be open on all views?'"]
parent: "FEAT-0015"
effort: "M"
due: ""
depends: ["TASK-0058", "TASK-0059"]
blocks: ["TASK-0063"]
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[FEAT-0011-Decks-Own-Index]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Glass and Spread draw the view's own desk

## Objective

In the focus window, Glass and Spread draw the current view's own notes and the notes on every view. A person marks a note "on every view" from its pane header or its Spread card, by pointer or by the `V` key. A note on every view reads in full on a view that does not hold it.

## Detail

**What each surface draws.** Both already read the desk through `deskCardsOf`, so after [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]] they draw the right desk with no change to how they read it. What changes is how a note is drawn when the view does not hold it, and the controls below.

**The mark** (decision 6). A toggle on the Glass pane header, beside widen and send, and a matching one on the Spread card, beside remove. Its label is "on every view", with `aria-pressed` and a title that says what it does. `V` on a focused pane header or a focused Spread card does the same. `V` is unused on both today: a pane header answers Enter, W, S, O, Delete and the arrows, and a Spread card answers Enter and Space. A note on every view carries a visible mark on its header or card, so a person can tell the two kinds apart. The pane header's `aria-label`, which lists the keys, gains "V keeps it on every view". The front plane says what happened: "ISS-0056 is on every view" or "ISS-0056 is on Issues only".

**A note on every view that this view does not hold** (decision 7). Today Glass draws such a pane with the sentence "This note is on the desk but not in this view. Put it back, or switch to a view that holds it." and no body, because the body is fetched through the view's card for the note (`noteHtml` needs the card's `rel`). Spread goes further: `reconcileDesk` in `desktop/src/shared/desk.ts` drops the card and counts it in "N cards not in this view". For a note on every view, the pane shows its body, read by the note's path from Deck's own index (`/deck/records/<workspace>`). The Spread card is drawn with its id, and with its title and status from the same index, and says "not in this view". A view's own note that has left the view keeps today's behaviour in both surfaces. A note the workspace no longer has is still dropped and counted.

**The desk bar names other views that still hold notes** (decision 14). Glass's field bar and Spread's desk bar gain a short line such as "also held: Features 2, Tests 1", counting only each view's own notes, and only for views the provider offers. It is absent when no other view holds anything.

**Putting back** (decision 9). × on a note on every view takes it off every view, and the front plane says so. Escape and ⌥× in Glass (`sweep` and `putBackOthers` in `desktop/src/renderer/glass.ts`) and Clear in Spread take off only the view's own notes. When notes on every view stay, the message says how many, for example "the desk is swept; 2 notes on every view stay (× puts one back)".

**Stacking.** A press on a pane or a card raises it through `raise-card`, as [[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]] and [[ISS-0067-Spread-Never-Brings-A-Card-Forward]] built. With [[TASK-0059-A-Note-Is-Kept-On-Every-View]]'s stacking, that works for a note on every view as well; nothing new is needed here beyond checking it.

## Acceptance

- Lifting a note on Issues and switching to Features in Glass shows no pane for it; switching back shows it at its place and size. Spread shows the same.
- Clicking the mark on a pane, or pressing `V` on its header, keeps the note on every view: after a switch to Features the pane is there, with its body, and the mark shows it pressed.
- In Spread on a view that does not hold the note, a note on every view is a card with its id, title and "not in this view", and it opens in the reader when clicked.
- Unmarking on Features leaves the note on Features only, and it is gone from Issues.
- With notes held on Features, the Issues desk bar names Features and its count.
- Escape leaves the notes on every view and says how many stayed; × on one of them takes it off every view.
- A press on a note on every view that lies under a view's own pane raises it above.
- Nothing here writes to the record: `git status` in the workspace is unchanged.

## Steps

- [x] Add the mark to the pane header in `glass.ts` and to the card in `desktop/src/renderer/cards.ts`, with `V` on both.
- [x] Read a note that is not in the view from Deck's index for its body in Glass and its card in Spread; leave `reconcileDesk`'s count for notes the workspace no longer has.
- [x] Add the "also held" line to both bars.
- [x] Change the messages of ×, ⌥×, Escape and Clear.
- [x] Leave the smoke checks to [[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]].

## Notes

The two surfaces still show one desk for a given view. A note lifted in Glass on Issues is a card on Spread's Issues desk, which is [[PHASE-0002-Glass]]'s ticked exit criterion and must stay true.

## Outcome

**Done 2026-09-11.** The mark is ⧉ on the pane header and on the Spread card (◎ was taken by "show this in the link graph"), with `V` on either and `aria-pressed` saying which way it is. A held note the view does not hold is read from Deck's own index (`/deck/records/<workspace>`, once per index revision): in Glass the pane shows its body and its status, "· not in this view"; in Spread it is a dashed card saying "not in this view". A note the workspace no longer has is still dropped and counted. Both bars say "also held: Features 2" for other views that hold notes. Escape and ⌥× take off only the view's own notes and the front plane says how many notes on every view stayed; Spread's Clear says the same in the status bar; × on a note on every view takes it off every view.
