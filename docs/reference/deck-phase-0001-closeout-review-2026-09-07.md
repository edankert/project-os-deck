---
type: "[[reference]]"
id: REFERENCE-PHASE-0001-CLOSEOUT-REVIEW
aliases: ["REFERENCE-PHASE-0001-CLOSEOUT-REVIEW"]
title: "PHASE-0001 close-out review: four of seven features can close, three cannot, and the record is a step behind the code"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
scope: "project"
source:
  - "Independent review in a clean context, 2026-09-07, at the gate QUALITY.md states for a feature reaching done. Reviewer model:claude-opus-5, a separate session from the authoring one."
  - "desktop/src/main/sidecar.ts, host.ts, main.ts; desktop/src/renderer/renderer.ts, deck.css; desktop/src/shared/store-state.ts, address.ts"
  - "cd desktop && npm test: tests 153 / pass 153 / fail 0. bash tools/scripts/validate-docs.sh: OK"
related:
  - "[[PHASE-0001-Deck]]"
  - "[[REFERENCE-PHASE-0001-REVIEW]]"
  - "[[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]"
  - "[[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]]"
  - "[[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]"
  - "[[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]"
  - "[[ISS-0015-Four-Smaller-Things-The-Close-Out-Review-Found]]"
  - "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"
  - "[[FEAT-0002-Deck-Opens-A-Workspace]]"
  - "[[FEAT-0004-Windows-On-Any-Screen]]"
  - "[[FEAT-0005-Spread-Cards-On-A-Desk]]"
  - "[[FEAT-0008-One-Renderer-Two-Hosts]]"
tags: [reference, review, deck, phase, closeout]
---

# PHASE-0001 close-out review

## Purpose

**PHASE-0001 asked to close on 2026-09-07 and this review says four of its seven features can and three cannot.** The exit criteria themselves are met: the reviewer sampled four of them and found the evidence says what the phase claims. What is not ready is the gate on top — the independent review each feature owes before it reaches `done` (`tools/instructions/QUALITY.md`, "Independent review").

This note is the record of that review. The reproduced findings became issues; the findings the reviewer could not reproduce by running anything are kept here as leads, which is what `tools/skills/independent-review/SKILL.md` step 5 asks for. A lead becomes an issue when somebody reproduces it, not before.

**The reviewer's own caveat on independence:** clean context and a separate session, but the same model as the author (`model:claude-opus-5`). Context is the mechanism the rule is about (ADR-0013), so the review counts; the family is recorded because a later finding about one model's blind spots will want the data.

## Verdicts

| Feature | Verdict | Why |
| --- | --- | --- |
| [[FEAT-0002-Deck-Opens-A-Workspace]] | changes-requested | [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]; the recorded approval predates the sidecar work it covers; the walk that ticked its fifth criterion passed carrying a doubt |
| [[FEAT-0003-One-Store-In-The-Main-Process]] | approved | |
| [[FEAT-0004-Windows-On-Any-Screen]] | changes-requested | [[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]; two leads below |
| [[FEAT-0005-Spread-Cards-On-A-Desk]] | changes-requested | [[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]]; the clamp fix is guarded by nothing; a lead below |
| [[FEAT-0006-Every-State-Has-An-Address]] | approved | all four acceptance criteria hold; one lead below is recorded against FEAT-0004, which introduced the panel |
| [[FEAT-0007-Views-Come-From-A-Provider]] | approved | |
| [[FEAT-0008-One-Renderer-Two-Hosts]] | changes-requested | never reviewed before; [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]] and [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] |

## What was reproduced, and where it went

- **A read kills a sidecar that is still indexing** — [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]. Reproduced with a stub sidecar and one proxied read. The most serious finding: it is [[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]'s failure reaching down a path the ISS-0010 fix does not cover, in the tablet configuration this phase ships.
- **A filter outlives the view it was set on** — [[ISS-0012-A-Filter-Survives-The-View-It-Was-Set-On]].
- **The remove control is not hidden in the strip** — [[ISS-0013-The-Remove-Control-Is-Shown-In-The-Needs-You-Strip-And-Does-Nothing]]. [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] recorded both halves as fixed and only one was.
- **The forwarding allow-list never reads the query** — [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]. Not exploitable today; the sidecar refuses it.
- **Four smaller things** — [[ISS-0015-Four-Smaller-Things-The-Close-Out-Review-Found]].

## The clamp fix is guarded by nothing, and this is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] measured

The reviewer replaced the clamp call in the built renderer with a plain assignment — undoing one of the fixes [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] recorded — and ran the suites without rebuilding:

```
ℹ tests 153
ℹ pass 153
ℹ fail 0
```

Reverting the fix is invisible. The same is true of the drag fix from [[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]] and of the `!shutDown` guard from [[ISS-0006-A-Clean-Quit-Forgets-Every-Popped-Out-Panel]], which no suite can even import. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] with a number on it rather than a new finding.

**One guard that does hold**, checked the same way: removing the resolve coalescing from `sidecar.ts` makes `desktop/tests/sidecar-retry.test.mjs:142` fail with the right message. A caveat worth keeping — the mutated run then hung for sixteen minutes instead of seven seconds, so in continuous integration that mutation surfaces as a job timeout rather than as the named failure.

**One more guard that is missing.** The reader assigns the sidecar's HTML with `innerHTML` (`desktop/src/renderer/renderer.ts:495`) in a page that holds the preload bridge, and Python-Markdown passes raw HTML straight through. The Content-Security-Policy meta tag in `index.html` blocks inline handlers and the reviewer could not get past it. Nothing asserts that the policy is there, so deleting the tag would reopen the hole with all 153 checks green. This matters most in [[PHASE-0003-Vault]], where the note content is not necessarily the reader's own.

## Leads: findings nobody has reproduced by running anything

These are read from the code and the arithmetic, not executed. Each becomes an issue when somebody reproduces it.

- **A restored card creeps down the desk on every repaint.** `deskBounds` measures `scrollHeight` before `pool.render`, so it reads the previous paint. A card stored at y=2000 on a desk 400 tall clamps to 352, then 408 on the next repaint, then 464, about 56px per repaint until it reaches its stored position and is off-screen again. If true, the change note's claim that a card is "pulled back on screen when a desk saved on a large monitor is opened on a laptop" holds for the first paint only.
- **Promoting a satellite adopts the label and not the navigation.** [[FEAT-0004-Windows-On-Any-Screen]]'s sixth criterion says a new focus window adopts navigation. The main process sets `role = 'focus'`, but the renderer asks its role once, in `boot()`, and nothing pushes a change. The promoted window would keep `pinned = true`, so it draws no view buttons and no workspace rail while Deck calls it the focus window. The smoke run asserts on the main-process map, which is the transport rather than the behaviour.
- **Pasting a panel address collapses the focus window.** A satellite's own Copy address produces `...?panel=desk`. `applyAddress` stamps the panel unconditionally, and the stylesheet then hides the navigator and the reader with no control to undo it; recovery needs another Open address with the panel stripped by hand.
- **A popped-out Needs-you panel follows the focus window's view.** The comment at `renderer.ts:53-58` says a view change does not move it. Its thirty-second poll resolves the view from shared state, which the focus window changes.

## What the reviewer checked and found honest

- The adoption table against the cockpit register: 55 keys each side, no key on one side alone, all thirteen named rows `adopted`, cockpit at `c0ed9e3`.
- The views fixture against the cockpit's own navigator markup: overview, intent, features, issues, tests, publication, library.
- The address round-trip: six states through, exactly twelve malformed ones refused.
- The release ledger: `pass` dated 2026-09-07 for TST-0008, TST-0009 and TST-0010.
- [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] is the strongest suite in the repository — seventeen checks over real HTTP, methods `fetch` will not send pushed down a raw socket, and the double- and triple-encoded traversal from the earlier security finding. Nothing got past it except the query, which is [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]].

## Maintenance

This note is the record of one review on one day. It is not updated as the issues it produced are fixed; those notes carry that. It is superseded only if the review itself is redone.
