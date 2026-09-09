---
type: "[[issue]]"
id: ISS-0037
aliases: ["ISS-0037"]
title: "A decision made in Deck moves the status and records no reason, because the field carrying the reason is dropped between the renderer and the sidecar"
status: open
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

- [ ] A verb driven through the shell with a reason writes the sidecar's callout into the file, and a check drives it rather than reading the handler
- [ ] `severity` reaches the sidecar the same way
- [ ] A verb driven with no reason still works, and writes no empty callout
- [ ] Deleting either field from the handler turns a check red
