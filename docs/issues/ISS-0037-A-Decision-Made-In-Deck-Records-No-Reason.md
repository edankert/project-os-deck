---
type: "[[issue]]"
id: ISS-0037
aliases: ["ISS-0037"]
title: "A decision made in Deck moves the status and records no reason, because the field carrying the reason is dropped between the renderer and the sidecar"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["A round-trip check written for [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]], 2026-09-09, which drove Accept on ISS-0008 and found no callout"]
severity: high
component: main
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# Decline a note in Deck and the note does not say why

## Problem

**Decline an issue in the cockpit and the file gains a dated, attributed paragraph saying why. Decline the same issue in Deck and the status changes and nothing else does.** The two surfaces write the same note and disagree about what a decision is, which is the one thing [[ADR-0003-Deck-Writes-Through-The-Shell]] set out to prevent.

The reason is that nobody carries the reason. The sidecar's `_append_decision_record` starts `if not text: return body` — no prose, no callout, and it is not an error. Deck's renderer never asks for prose (`applyVerb` in `desktop/src/renderer/renderer.ts` posts `id`, `to` and `mtime`), and the shell would drop it if it did: the `deck:write:transition` handler in `desktop/src/main/main.ts` forwards `id`, `to`, `mtime` and `option`, and `note` and `severity` are not among them. Deck's own `TransitionRequest` has both fields, so the loss is at the one hop in the middle.

`severity` goes the same way. The cockpit offers it when a triaged issue is accepted, and an issue accepted through Deck keeps whatever severity it was filed with.

## What a person sees

A decision with no record of itself. Six months later the note says `status: declined` and the history that would say who declined it, when, and on what grounds is in nobody's file. The cockpit renders a `## Decision record` heading with the callouts under it; a note decided in Deck has the heading absent and the fact unrecoverable.

**It is quiet in the worst way.** The write succeeds, the status moves, the toast says `ISS-0008 is now open`, and nothing anywhere reports that half the decision was discarded. This repository's rule is that a refusal is a result and a silence is a bug.

## Cause

`main.ts` builds the request field by field with an allow-list rather than passing the fields through, and the list was written from the two fields the first write needed. `option` was added when a decision note needed it. `note` and `severity` were never added and nothing failed, because a missing reason is indistinguishable from a decision made without one.

## Fix

Forward `note` and `severity` from the shell, and give the renderer somewhere to type the reason. A verb the row marks `confirm` — `Decline`, `Supersede` — is where a reason matters most, and that verb already stops to ask, so the box belongs in the question that is already being asked rather than in a new one.

**The reason stays optional.** The cockpit does not require one and Deck must not be stricter than the surface it shares a file with; `Accept` on a triaged issue is ordinarily made without prose.

## Acceptance

- [x] A verb driven through the shell with a reason writes the sidecar's callout into the file, and a check drives it rather than reading the handler — evidence: tools/scripts/check-write-round-trip.mjs, 12 of 12 on 2026-09-09 (user:edwin, 2026-09-09)
- [x] `severity` reaches the sidecar the same way — evidence: the same run; ISS-0008 left triage carrying severity: high (user:edwin, 2026-09-09)
- [x] A verb driven with no reason still works, and writes no empty callout — evidence: write-channel.test.mjs, 'a decision made without a reason sends no reason' (user:edwin, 2026-09-09)
- [x] Deleting either field from the handler turns a check red — evidence: three mutations, three killed: note, severity, and a window naming the writer (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**The reason travels with the decision, and a check drives the route rather than reading it.** The mapping from what a window sent to what the sidecar receives is now a function — `transitionRequestFrom` in `desktop/src/shared/write-client.ts` — instead of an object literal buried in the IPC handler. That is the shape [[ISS-0031-The-Path-Prefix-Reaches-The-Evaluator-Unguarded]] asked for and [[ISS-0032-The-Navigation-Guards-Are-Checked-By-Grep]] asked for again: the decision leaves the wiring, so it can be driven without an Electron window.

**A verb that stops to ask now also asks why.** `Decline` and `Supersede` are the verbs the sidecar's row marks `confirm`, they already interrupt, and the reason box goes in the interruption that is already happening. Escape or an empty box means *no reason*, not *cancel* — the decision was confirmed a moment earlier and asking again about a settled thing is not a question.

**Severity is a text box and not a picker, on purpose.** The four values are `critical`, `high`, `medium`, `low`, they live in the sidecar's `SEVERITIES`, and no endpoint serves them. A picker here would be Deck restating a table it does not own, which is exactly how `draft`, `proposed` and `ready` ended up in Deck's status bands within two days of the real vocabulary changing. A value this project does not use comes back refused in the sidecar's own words. Deck asks for it only when the payload says the note is an issue at `triage`, because the sidecar refuses one anywhere else rather than ignoring it.

**Proved end to end against the running sidecar.** `tools/scripts/check-write-round-trip.mjs` drives `Accept` on [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] with prose and a severity, then reads the file: the status moved, the prose is under the cockpit's own `## Decision record` heading, `severity: "high"` is in the frontmatter, and `git checkout` puts it all back. Eighteen of eighteen on 2026-09-09, once the design-verdict case was added.

**Evidence.** Three mutations, three killed. Dropping `note` fails 1 check; dropping `severity` fails 1; letting the request name its own actor instead of the shell fails 1. All three survived every check before this note existed.

## Superseded in part, 2026-09-09

**The rule this note gives for WHERE the reason is asked was reversed the next commit.** It says "the box belongs in the question that is already being asked rather than in a new one", which put the reason inside the confirmation — and the sidecar marks only `Decline` and `Supersede` as confirming, so accepting or deferring an issue went on recording nothing. That is [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]], and every verb asks now.

The rest of this note stands: the field was dropped between the renderer and the shell, and forwarding it is what fixed that.
