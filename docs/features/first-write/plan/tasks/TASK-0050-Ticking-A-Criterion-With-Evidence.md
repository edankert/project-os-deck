---
type: "[[task]]"
id: TASK-0050
aliases: ["TASK-0050"]
title: "Ticking a criterion with evidence, addressed by the data-raw the sidecar stamped, with the modification time sent and no tick offered when the address is missing"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0013-The-First-Write]]"]
parent: "FEAT-0013"
effort: ""
due: ""
depends: ["TASK-0047", "TASK-0048"]
blocks: []
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#REQ-0027]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# Ticking a criterion with evidence

## Objective

A person ticks an acceptance criterion or an exit criterion in Deck's reader, types the evidence, and the file on disk gains `- [x] text — evidence: ... (actor, date)`. This is the verb Edwin named on 2026-09-08: "check check-boxes in the content of a note and generate views/editors which allow you to check items like the acceptance tests".

## Detail

**The address arrives with the page, and Deck invents nothing.** The sidecar's renderer stamps each rendered checkbox with `data-raw`, the source line's exact prose, and `/api/notes/tick` finds the line by that text. Deck reads the attribute out of the HTML it already displays and sends it back. There is no id scheme to design and no line number to track.

**The one case the sidecar cannot resolve is a duplicated line, and it must be reported in words.** The endpoint refuses when the text matches nothing or more than one line. That is not an error in Deck and should not read as one: the person needs to be told that two criteria in this note are worded identically and that making them different is the fix. Every tool surveyed that writes into a file it does not own has the same failure and the good ones say so plainly — Obsidian Tasks asks the user to make duplicate lines different when its three strategies all fail.

**When the sidecar stamps nothing, Deck offers nothing.** The sidecar emits no `data-raw` attributes at all when its rendered checkbox count and its source count disagree, because it cannot then trust any of them. Deck must offer no tick in that case rather than a wrong one, and say why the controls are missing.

**Evidence is required by the endpoint and should be required by the interface.** `/api/notes/tick` wants evidence or a reason. Asking for it after a refusal is worse than asking for it before, so the control collects it up front.

**The modification time goes with the write.** It is the only guard against ticking a note that changed since the page was rendered, and the endpoint accepts it. Deck sends it every time.

**The ordinal toggle is not built here.** `/api/notes/check-toggle` flips any checkbox by its position among the file's task lines and bypasses the modification-time check, which the cockpit's [[project-os-cockpit#REQ-0027]] records as reconciled. Offering it on a note two Deck windows show would be a race Deck cannot detect. It waits for the cockpit.

## Acceptance

- Ticking a criterion in the reader writes `- [x]` to the file with the evidence text, the actor from the store and the date, and the cockpit shows it ticked.
- The control collects evidence before sending, and a tick with no evidence is not sent.
- The note's modification time is sent with every tick.
- A note whose rendered checkboxes carry no `data-raw` offers no tick, and the reader says why.
- A tick the sidecar refuses because the line matched nothing or matched twice is reported in a sentence naming the duplicate wording as the cause and the fix; the HTTP status is not shown to the person.
- A tick refused because the note changed underneath says so and re-reads the note rather than retrying.
- No tick control exists on the served page.

## Steps

- [x] Read `data-raw` from the rendered HTML and attach a control to each checkbox that has one
- [x] Detect the no-attributes case and draw the explanation instead of the controls
- [x] Collect evidence in the control, then post with the actor and the modification time
- [x] Word the three refusals, against the sidecar's OWN sentences rather than from memory
- [x] Re-read and redraw the note after a successful tick
- [x] Extend [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] with the tick cases

## Notes

This is the harder half of the feature, because it addresses a line inside a file rather than a note as a whole. The good news is that the address problem is already solved upstream and Deck's job is to carry the attribute back unchanged.


## Done, 2026-09-09

**Deck invents no address.** It reads `data-raw` off the checkbox the sidecar stamped, carries it back unchanged, and the sidecar finds the line by that exact prose. There is no id scheme and no line number.

**Both branches of the no-address rule happen on real notes in this repository.** `TASK-0052` renders five checkboxes with five `data-raw` attributes. `PHASE-0001` renders eleven with NONE: the sidecar emits no addresses at all when its rendered count and its source count disagree, because it cannot then trust any of them. Deck offers no tick there and says why — that a task list opening immediately after a paragraph does this, and that a blank line before it is the fix — rather than leaving a person wondering where the controls went.

**Evidence is collected before the write is sent.** The endpoint requires it, and asking after a refusal is worse than asking before: the reader has already done the thinking.

## The three refusals, and a correction

**The first version of the wording matched none of them**, because all three sentences were written from memory of what such a message might say. They were then read out of `note_writes.py` and confirmed against live refusals from the sidecar this repository runs:

- `no criterion on TASK-0052 reads 'the text'` — the note has changed since the page was drawn, so the line Deck was addressing is not there any more.
- `2 criteria on TASK-0052 read 'the text' — resolving one would be a guess about which` — two criteria in this note are worded the same, and making them different is the fix. This is not a fault in Deck and does not read as one.
- `note changed on disk since it was read — reload and retry` — passed through untouched, because it already tells a person what to do. Deck re-reads the note rather than retrying.

The HTTP status is never shown to a person, in any of the three.

## The modification time, and where it comes from

**`/api/render` does not carry one.** The plan assumed it did. The only endpoint that returns `mtime` is `/api/cockpit/review`, and only for a test note. So the time comes from Deck's own index through `/deck/records/<workspace>?rel=<path>`, which is the better source: the index is the thing watching the file.

**It is sent every time.** Proved live: ticking with a modification time that had gone stale by one write was refused with the sidecar's own sentence, and nothing was written.

## Evidence

- A live tick against the real sidecar wrote `- [x] A live check that Deck can tick a criterion — evidence: ticked through Deck, 2026-09-09 (user:deck-live-check, 2026-09-09)` — the sidecar's `TICK_TEMPLATE` exactly, which is what the validator parses. Reverted with `git checkout`.
- `bash tools/scripts/run-desktop-tests.sh write-channel`: the tick's body carries the criterion, the evidence, the actor and the modification time, and the three refusals are worded from the sidecar's own sentences.
