---
type: "[[test]]"
id: TST-0056
aliases: ["TST-0056"]
title: "Every note the view holds is somewhere in the field, and a finished note can be clicked, read and pulled to the front — the walk Edwin takes on a real workspace"
status: active
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
issues: ["[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]"]
tasks: ["[[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]]", "[[PHASE-0002-Glass]]"]
---

# Every note is somewhere, and a finished note can be pulled forward

## Purpose

The walk that says whether this worked for a person rather than for a suite. Two things are being judged. **Nothing the view holds is missing from the field**: the count on the bar and what is drawn agree, and a person can turn round and find the work that used to be nowhere. **A finished note is one gesture away**, which is what DES-0002 promised the quiet band would be and what it has never been.

## Procedure

1. Open Deck on Your Trainer, Glass, the Issues view — the largest view on the largest workspace, 409 notes with 34 owed.
2. Read the bar. Note what each remainder says.
3. Turn slowly, all the way round. Count the bands you pass through: front, middle, far, quiet.
4. Find a note in the outer field. It should be active work, not finished. Click it, and check it lands on the desk.
5. Keep turning to face the quiet band. Click a tile. The note should lift, exactly as a card does.
6. Rest the pointer on a neighbouring tile. It should say which note it is, and the cursor should change.
7. Pull that note forward to the front band. Switch to another view and back. It should still be in front.
8. Zoom in on a mid-band card until it grows. Its face line and its owed verb should appear; keep going and its status and progress should appear.
9. Zoom into the quiet band until a tile becomes a card. Click it. Zoom out and watch it become a tile again. Nothing should flicker.
10. Press Tab until the quiet band takes the cursor. Walk it with the arrow keys. Press Enter.
11. Open this repository, Glass, the Issues view — 261 notes. The quiet band's tiles should be visibly larger than on Your Trainer, and the band should be at the same distance behind you.
12. Mark one note fixed in the cockpit while Deck is open on the field. The note should move. The bands should not reshape.
13. Switch to the orbit. It should look and behave exactly as it did before this feature, zoomed and not.

## Expected results

- Every band you pass through has notes in it, and the bar's remainders account for the rest.
- No note the view holds is unaccounted for: drawn, or counted in a remainder.
- A outer-field note is readable enough to tell what it is, and is clearly less prominent than the middle.
- A quiet-band tile can be clicked, hovered and pulled forward, and the pulled note stays in front across a view switch.
- Zoom adds information rather than size alone.
- The small workspace's quiet band is larger and no nearer.
- A status change does not reshape the field underneath you.
- The orbit is untouched.

## Evidence (fill after running)

- <what each bar and compass read, per workspace; anything that surprised you>

## Adequacy (who verifies this test?)

This is a walk, so the automated half is [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]], which drives steps 4 to 10 with a real pointer and keyboard and is shown to fail with each fix removed. What this walk adds is the judgement no assertion makes: whether the outer field reads as "still yours to do" and the quiet band as "done, and within reach".
