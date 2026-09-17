---
type: "[[issue]]"
id: ISS-0086
aliases: ["ISS-0086"]
title: "On Your Trainer's Features view 186 of 317 notes are counted and drawn nowhere, so the feature's title and goal promise more than the field delivers"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17", "Recorded and not decided when the feature was built, 2026-09-12"]
severity: medium
component: docs
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The outer field leaves 186 notes unplaced

## Problem

**The field now says how many notes it could not place, which is the mechanism [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]] asked for. On the largest view it says 186, and the feature is called "every note has a place".** Both cannot be true for a reader.

On `your-trainer-features.json`, 317 notes are dealt: 3 stand in front, 40 in the middle, 64 in the outer field, 24 behind, and 186 are counted and drawn nowhere. That is 59% of the view.

The acceptance line as written is satisfied — "the four band lists plus the four remainders add up to the number of notes the view holds. No note is dealt and then dropped." Nothing is dropped silently. The title and the Goal are the part that is not satisfied: "every note the view holds has a place in the field", and "every note a Glass view holds is somewhere a person can see and point at" are false for most of that view.

This was recorded rather than decided when the feature was built, and the independent review raised it again as its own judgement: stating the remainder is an adequate mechanism and an inadequate discharge of the goal as stated.

## Expected

One of two things, and which is Edwin's call.

- **The outer field gains layers**, so a large view's active work is drawn rather than counted. This is more work and is the reading the current title claims.
- **The title and the Goal are narrowed** to what the feature actually delivers: no note is dealt and then dropped silently, and every band states what it could not place. This costs nothing and makes the note honest.

Doing neither leaves a later reader holding two sentences that contradict each other.

## Evidence

Reproduced against the fixture.

```
your-trainer-features.json: 317 dealt -> front 3, mid 40, outer 64, deep 24, unplaced 186
```

Conservation holds; the remainder is stated on the bar.

## Risk scan

Adding layers to the outer field would put more elements on screen at once, which is a frame-time question and would need [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]'s measurement retaken. Narrowing the wording has no trigger.

## Next Actions

- [ ] Edwin decides: layers in the outer field, or narrow the title and the Goal.
