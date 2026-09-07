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

---

# The second pass, later the same day

Edwin's instruction after reading the review above: "fix them now and re-review the four features." Nine defects were fixed and a second clean-context review ran against that work. It returned **changes-requested on all four features again**, and it was right to.

## What it caught that mattered

**The fix for the desk creep was a regression.** Clamping every restored card to the window is stable and squeezes the desk flat: forty cards on a 900x600 desk drew 24 distinct positions, sixteen on top of another card. The review reproduced it before the change shipped. The bound is the desk's own extent now — the window unioned with the saved positions — and both wrong answers are pinned by checks ([[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]]).

**The quit still leaked, twice.** `stopAll` runs once, so a child spawned afterwards by the port-collision retry was held by nobody; and a quit from a signal called `app.exit`, which never raises `before-quit`, so it never waited at all. Both are [[ISS-0021-A-Sidecar-Started-After-The-Quit-Began-Outlives-Deck]].

**Three spellings got past the query lock** — a traversal written as the query's key, the dot-stripping `....//` and `..;/`, and overlong UTF-8 where the check inspects a different string from the one `fetch` sends. None was exploitable against today's sidecar; all three are refused now, and two false positives were removed.

**And three notes claimed more than the code did.** [[ISS-0017-A-Restored-Card-Creeps-Down-The-Desk-On-Every-Repaint]] said two checks guarded a fix they do not reach; the change note said four fixes were unguarded when it was five; and [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]] still described the query hole as open while [[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]] had been closed on the opposite claim. That is the third time a review of this phase has caught the same shape of error, which is the strongest thing anyone has said in favour of [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]].

**One criterion had to be amended rather than ticked.** [[FEAT-0004-Windows-On-Any-Screen]]'s third criterion said opening a panel address again produces the same panel, and [[ISS-0019-Pasting-A-Panel-Address-Collapses-The-Focus-Window]] deliberately made that false for the focus window. It is narrowed, with the reasoning in that feature's `## Amendments`.

## The mutation table, which is the useful part

Every new check failed when its fix was reverted in the built output. Six mutations were invisible to all 165 checks: `stopAll` returning nothing, the one line in `drawDesk` choosing the clamp bound, and the four renderer fixes (the hidden remove control, the poll's captured view, the address panel, the promoted window's reload). Four of those six were declared unguarded in their own notes. Two were not, and both are corrected.

## What still stands in the way of closing

**The walks predate the build.** Every acceptance pass in the ledger is dated before these fixes, the smoke run has not been executed against them, and five fixes are invisible to continuous integration. Closing now would close on evidence gathered from a build that no longer exists. [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] and [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]] are the two the fixes touch most directly, and TST-0011's pass still carries the doubt the quit work was meant to answer.

That is a person's job and no amount of reviewing replaces it.
