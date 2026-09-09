---
type: "[[issue]]"
id: ISS-0038
aliases: ["ISS-0038"]
title: "One meta tag stops a note's own markup running script in the window that can write to the repository, and deleting it leaves every check green"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The third independent review of PHASE-0001, 2026-09-09, finding 1"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# Delete one line from index.html and 316 checks still pass

## Problem

`desktop/src/renderer/renderer.ts:689` is `article.innerHTML = note.html;`. `note.html` is the sidecar's rendered Markdown, and Python-Markdown passes raw HTML through, so a note containing a `<script>` tag arrives as a script tag. The only thing that stops it running is the `Content-Security-Policy` meta tag at `desktop/src/renderer/index.html:13`.

**Remove that tag and nothing anywhere goes red.** The review deleted it, ran `npm run build && node --test tests/*.test.mjs` and got `pass 316, fail 0`, then ran `npm run smoke` and got `{"ok": true, "failures": []}`.

## What a person would see

Nothing, until somebody put a script in a note. Then it would run in the window that, since [[ADR-0003-Deck-Writes-Through-The-Shell]], holds `window.deck.write.*` — the bridge to the sidecar's write endpoints, with the actor read from Deck's own store. A note is a file anybody can put in a vault.

**The stakes rose after the guard was written.** [[FEAT-0008-One-Renderer-Two-Hosts]]'s first review named this on 2026-09-07, when the window could only read. The write path landed on 2026-09-08 and nothing revisited it.

## Cause

The tag is markup, and Deck's checks are over TypeScript modules. `node --test` cannot load the renderer at all — that is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] — so nothing in the suite has ever had an opinion about `index.html`.

## Fix

Assert the policy where a real window can be asked about it, which is the smoke run: put a script tag in a rendered note and check that it did not run. A check that reads `index.html` looking for the string would be the shape [[ISS-0032-The-Navigation-Guards-Are-Checked-By-Grep]] was filed against.

## Acceptance

- [x] A script in a note's markup does not run in a Deck window, proved by driving a real window rather than by reading the file — evidence: npm run smoke, 2026-09-09: a script tag and an onerror handler both inert (user:edwin, 2026-09-09)
- [x] Deleting the meta tag turns that check red — evidence: the mutation run: 2 checks red (user:edwin, 2026-09-09)

## Fixed, 2026-09-09

**A script in a note is driven, in a real window, and it does not run.** The smoke run opens a window, sets `innerHTML` on an element the way the reader does — with a `<script>` tag and an `<img onerror>`, because the policy has to stop both — and asks the page afterwards whether either fired. Then it reads the policy back out of the document and checks it names `script-src 'self'`, so a policy that is present and wrong is caught as well as one that is absent.

**Driven rather than read**, which is the whole point. Searching `index.html` for the string is the shape [[ISS-0032-The-Navigation-Guards-Are-Checked-By-Grep]] was filed against and it survives a policy that permits everything.

**It is in the smoke run and not the suite** because `node --test` cannot load the renderer — [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]], still open, still the reason this class of defect keeps happening. `npm run smoke` is a command a person runs, not a gate CI holds, and that limitation is the phase's to decide rather than this note's.

**Evidence.** Changing the tag's `http-equiv` so the policy no longer applies fails 2 checks. Both passed before, alongside all 316 in the suite.
