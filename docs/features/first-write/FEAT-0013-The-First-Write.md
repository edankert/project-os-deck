---
type: "[[feature]]"
id: FEAT-0013
aliases: ["FEAT-0013"]
title: "The first write: Deck ticks a criterion and makes one transition, through the shell to the loopback sidecar, and the tablet is offered no verb"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "One verb goes end to end. In the shell, a person ticks an acceptance criterion with evidence and makes one status transition, and the change is in the note on disk and visible in the cockpit. The served page offers no verb at all. This proves the write path ADR-0003 decided, and it is the smallest thing that can."
requirements: []
tasks: ["[[TASK-0047-The-Write-Channel]]", "[[TASK-0048-The-Actor-Is-A-Setting]]", "[[TASK-0049-The-Actuator-Row-And-One-Transition]]", "[[TASK-0050-Ticking-A-Criterion-With-Evidence]]", "[[TASK-0051-The-Changed-Under-You-Mark]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0004-Parity]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ADR-0010]]", "[[project-os-cockpit#REQ-0026]]", "[[project-os-cockpit#REQ-0027]]"]
---

# The first write

## Goal

**Deck changes a note, for the first time.** In the shell, a person ticks an acceptance criterion in the reader, types the evidence, and the file on disk gains `- [x] text — evidence: ... (actor, date)`. They open a note whose state can move, see the verbs the sidecar says are legal, pick one, and the note's status changes. Both are then visible in the cockpit, because both went through the cockpit's own endpoints.

**On the tablet, none of that is there.** Not greyed out — absent, the way pop-out windows are absent when Deck is served. That is [[ADR-0003-Deck-Writes-Through-The-Shell]], and it is a rule with no condition attached: Edwin, 2026-09-08, "the tablet does not write".

Two verbs is the whole scope. This feature is not parity with the cockpit's thirty endpoints; it is the proof that the path exists and behaves, so [[PHASE-0004-Parity]] can adopt the rest a row at a time.

## Scope

**In scope.**

- **The write channel.** Renderer, preload bridge, IPC into the main process, loopback HTTP to the sidecar's existing endpoint. The capability set gains `write`, true in the shell and false when served. Deck's HTTP host is unchanged and still answers 405 to every method that is not a read.
- **The actor.** A setting in Deck's store, sent with every write, visible and changeable by a person. The cockpit hard-codes `user:edwin` in four places and that literal cannot be copied into a second application.
- **The actuator row.** `GET /api/notes/actions` returns the legal verbs for a note with `confirm`, `disabled`, `reason` and `endpoint` per row. Deck draws those rows and restates no verb table, which is the cockpit's [[project-os-cockpit#REQ-0026]]. One transition is wired end to end.
- **Ticking a criterion with evidence.** Through `/api/notes/tick`, which finds the line by its exact prose, refuses when it matches nothing or more than one line, and requires evidence or a reason. The address arrives with the page: the sidecar stamps `data-raw` on each rendered checkbox. The note's modification time is sent with the write.
- **The changed-under-you mark.** A write re-indexes the record, so every other window is stale. The change is announced and applied on the person's action, never silently.

**Out of scope.**

- **Every other verb the cockpit has.** Verdicts, reviews, test runs, release fields, design and inbox writes, note creation. Those are [[PHASE-0004-Parity]], adopted a register row at a time.
- **Writing from the served page, under any condition.** Not deferred — decided against ([[ADR-0003-Deck-Writes-Through-The-Shell]]).
- **The ordinal checkbox toggle** through `/api/notes/check-toggle`. It bypasses the modification-time check, which the cockpit's [[project-os-cockpit#REQ-0027]] records as reconciled, and Deck should not offer it on a note two windows show until that is settled upstream.
- **Setting an arbitrary frontmatter property.** No such endpoint exists in the sidecar; `ALLOWED_FIELDS` is an allow-list per endpoint. A generated editor for a character's age or an issue's severity outside triage is cockpit work.
- **Generated editors and forms.** A description says what a card shows, not what a form edits ([[FEAT-0012-A-View-Is-A-Description]]).

**A cockpit issue is owed.** A guarded property write — set one allow-listed frontmatter field, with the note type's template fields as the allow-list, behind the same loopback and modification-time guards. It is filed the day the first Deck task that needs it starts, following the pattern [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] set. No task in this feature needs it.

## Acceptance

- A criterion ticked in Deck is ticked in the file, carries the evidence and the actor Deck sent, and shows as ticked in the cockpit.
- One status transition made in Deck moves the note's status in the file and appends the decision callout the sidecar writes.
- The verbs Deck offers on a note are exactly the rows `GET /api/notes/actions` returned; no verb table exists in Deck's code, asserted by a search of the built renderer.
- The served page offers no verb at all, asserted in the smoke run against the served host as well as in the suite.
- A tick is refused with a stated reason when the rendered checkbox carries no `data-raw`, which is what the sidecar emits when its rendered count and its source count disagree.
- A tick sends the note's modification time, and a note that changed underneath is reported in words rather than overwritten.
- A record that changed under an open window is marked, and the new state is applied on the person's action.

## Links

- Phase: [[PHASE-0001-Deck]]
- Decision: [[ADR-0003-Deck-Writes-Through-The-Shell]]
- Tasks: [[TASK-0047-The-Write-Channel]], [[TASK-0048-The-Actor-Is-A-Setting]], [[TASK-0049-The-Actuator-Row-And-One-Transition]], [[TASK-0050-Ticking-A-Criterion-With-Evidence]], [[TASK-0051-The-Changed-Under-You-Mark]]
- Plan: `docs/features/first-write/plan/PLAN.md`
- Acceptance walk: [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]


## Independent review — 2026-09-09

**Verdict: changes-requested.** Clean context and a separate session; the same model family as the author, recorded in `reviewed_by`. The write channel itself is the best-guarded thing in this phase — I tried to find a second route to the sidecar and could not. The findings are that this feature's own test note does not run, and that the door the bridge sits behind is not locked.

**Finding 1 (blocking): [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] names a suite that does not exist, and the repository's own runner reports it failing.** Its `command:` is `bash tools/scripts/run-desktop-tests.sh writes` and its `entrypoint:` is `desktop/tests/writes.test.mjs`. The file is `desktop/tests/write-channel.test.mjs`, which is the name every Evidence line in this feature's tasks uses. Reproduced: `bash tools/scripts/run-desktop-tests.sh writes` exits 2 with "no suite called 'writes'", and `python3 tools/scripts/run-tests.py` reports `passing=22 failing=1` with TST-0033 the one. `QUALITY.md`'s verification gate needs this feature's required `[[test]]` notes passing before it reaches a terminal status, so this alone holds the feature at `review`. The fix is one word in the frontmatter, but the verdict cannot be recorded before it is made.

**Finding 2 (blocking): nothing stops a Deck window navigating away, and the write bridge follows it.** `createWindow` sets `contextIsolation: true` and `nodeIntegration: false` (`desktop/src/main/main.ts:146`) and there is no `will-navigate` handler and no `setWindowOpenHandler` anywhere in `desktop/src/`. The preload runs on every document a `webContents` loads, so `window.deck` — including `write.transition` and `write.tick`, `clipboard.read`, `state.dispatch` and `workspaces.add`/`remove` — is exposed to whatever origin the window ends up on. The reader injects the sidecar's rendered note HTML with `article.innerHTML = note.html` (`desktop/src/renderer/renderer.ts:687`), and the page's CSP (`script-src 'self'`, `form-action 'none'`, `base-uri 'none'`) blocks script and form submission but not a top-level navigation from a clicked link. So a link in a note the person opens is enough to move the window off Deck's origin with the write bridge still attached. Not reproduced end to end — I did not drive a click in Electron, and the notes I rendered from the live sidecar happened to contain no external anchors — so this is recorded as a lead rather than as a demonstrated exploit. What is verified is the absence of the guard and the presence of the injection point. [[ADR-0003-Deck-Writes-Through-The-Shell]]'s reasoning is that a write is authorised by the request coming from loopback and that the bridge is what confines that to the shell; the bridge confines it to a `webContents`, which is not the same thing.

**Finding 3 (non-blocking): the changed-under-you mark fires when nothing changed.** `NoteIndex.noticed` treats any change that is not an unexcluded Markdown file as a full rebuild, and `build()` raises the revision unconditionally (`desktop/src/main/note-index.ts:236-241`). Reproduced on a temporary vault: feeding `.obsidian/workspace.json` re-walked the tree and raised the number with no note touched. `drawStale` (`desktop/src/renderer/renderer.ts:915-925`) then shows "These notes changed on disk since this window drew them." For a vault open in Obsidian beside Deck that is close to continuous. Filed here rather than against [[FEAT-0011-Decks-Own-Index]] as well because this is where a person sees it.

**What was checked and found sound, including what I tried to break.** There is no second route to the sidecar that I could find. `DeckHost` refuses every method that is not GET or HEAD before anything else runs (`desktop/src/main/host.ts:19`, `232`); adding POST to that set fails 2 checks, and adding `/api/notes/transition` to the forward allow-list fails 1. The forward allow-list refuses any path containing a per cent sign before it forwards, and `resolveSidecarTarget` checks query keys as well as values. The actor is read from the store inside `write` (`main.ts:304-310`) rather than taken from the renderer, so a window cannot claim a different name, and a store with no name refuses the write rather than inventing one. Removing the `mtime` guard from both write bodies fails 2 checks. `wordRefusal` matches the sidecar's own sentences and never shows an HTTP status. The card renderer uses `textContent` and `dataset` for everything that comes from a note, so the one `innerHTML` that matters is the reader's, which is what Finding 2 is about. The smoke run boots the real application and reports `ok: true` with nothing skipped, including the served host's `write: false` and a POST refused with 405; I ran it.

## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All five tasks are `done`. A write travels renderer → preload bridge → IPC → main process → loopback POST to the sidecar's existing guarded endpoint, and nothing about it touches Deck's HTTP host, which still answers 405 to every method that is not a read on every path.

**It was proved against the real sidecar, not only against a fake one.** `ISS-0016` moved `triage` → `deferred` in the file with the decision callout appended; a criterion was ticked as `- [x] ... — evidence: ... (user:deck-live-check, 2026-09-09)`, which is the sidecar's own template exactly; a tick whose modification time had gone stale was refused; and a criterion matching nothing was refused. Everything was reverted with `git checkout` and the working tree left clean.

**Three things this found rather than assumed.**

`/api/render` carries no modification time — the plan expected one. The tick reads it from Deck's own index instead, which is the better source: the index is the thing watching the file.

The three refusal sentences were first written from memory of what such a message might say, and matched none of the sidecar's actual ones. They are now read from `note_writes.py` and confirmed live.

Both branches of the no-address rule happen on real notes here: `TASK-0052` renders five checkboxes with five `data-raw` attributes, and `PHASE-0001` renders eleven with none, because the sidecar's rendered count and source count disagree. Deck offers no tick there and says why.

**The actor is a store field with one control**, defaulted from the machine's user name and never from a literal — a search of the built output proves no source file names a person. The decision to build a control rather than defer it is in [[TASK-0048-The-Actor-Is-A-Setting]].

**What is owed is [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]**, walked with `git diff` beside it so the claim is about the file and not about two screens — and on a real tablet, for the half that says the served page offers no verb at all. `shell.reader.actuators` moves to `adopted` on that walk, which is what its own row in the adoption table says.


**The renderer guards have a gate, from 2026-09-09.** Three things this feature relies on live only in a real Electron window — the content policy that stops a note running script in the window that writes, the reason box on every verb, and the design verdict Deck refuses to fake. Until [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] existed, nothing ran them and reverting any of the three left every check green ([[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]). `run-tests.py` now runs `tools/scripts/run-smoke.sh both` as a named test, and a project-owned CI job runs it under a virtual screen.

**One verb Deck deliberately does not offer.** A design's verdict goes to `/api/design/verdict` and must name the revision it judged; Deck has no design surface and no revision history, so the row is drawn disabled and says the decision belongs in the cockpit ([[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]], [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]).


## The sixth pass's findings, discharged 2026-09-09

The verdict above was recorded before the fixes. All six findings are `fixed` and each was reproduced before being acted on; the verdict itself is stale and a seventh pass has not been run.

| finding | note | how it was settled |
| --- | --- | --- |
| Deck can stop offering a tick control and nothing notices | [[ISS-0053-Deck-Can-Stop-Offering-A-Tick-And-Nothing-Notices]] | the smoke run presses a real tick and a real refusal; deleting `attachTicks` fails 1 check, accepting a tick with no evidence fails 3 |
| the smoke runner cannot start where it must | [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]] | it resolves its own path before changing directory, installs nothing, and TST-0037 declares how it is invoked instead of promising a gate that cannot host it |
| two re-measured numbers still disagree with themselves | [[ISS-0055-Two-Re-Measured-Numbers-Still-Disagree-With-Themselves]] | corrected in the criterion as well as the prose, and an unreadable date is now reported as unconfirmable rather than expired |

**Measured at commit `d0a148e`:** 322 node checks passing, 23 of 23 commanded tests, both smoke configurations `ok` with nothing skipped, `check-write-round-trip.mjs` 18 of 18 with a clean tree, `check-counts-live.py` no disagreements across three corpora, `check-bases-live.mjs` no failures across 46 views, `validate-docs --as-committed` passing the full CI step set.

**What is not settled.** Six review rounds have each found real defects, and each round's fix produced the next round's finding. That is a fact about the process, not a defect in this feature, and whether to run a seventh pass is Edwin's call.

## Independent review, 2026-09-09: changes requested, and made

**The verification gate was failing and nobody had run the thing that says so.** [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]] named a suite called `writes`; the file is `write-channel.test.mjs`. `npm test` runs every file in `desktop/tests/` and was green throughout, so only `python3 tools/scripts/run-tests.py` — which reads each note's own `command:` — could see it, and it was not run at close-out ([[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]]). It now reports `passing=23 failing=0`.

**The second finding is about the bridge, and it is a real gap.** Nothing stopped a Deck window navigating away from the origin Deck serves, and a `BrowserWindow`'s preload runs on every document its `webContents` loads — so `window.deck.write.*` followed the window anywhere it went. The reader injects markup the sidecar rendered from a note's own Markdown, and the page's policy stops a script and a form but not a clicked link ([[ISS-0029-The-Preload-Bridge-Follows-The-Window-Anywhere-It-Navigates]]). Both guards are in now, comparing by origin rather than by prefix.

**What the review could not refute is worth recording too.** It attacked the write path hardest and found no second route to the sidecar, and its mutation testing killed every check it tried: allowing a POST on the host, allow-listing a write path, removing the tick's modification time, opening the panel vocabulary, silencing the unsupported report.


## Independent re-review — 2026-09-09 (second pass, after the seven fixes)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The frontmatter values are unchanged from the first pass because the re-review returns the same three.

**Finding 1 (blocking): the two navigation guards are correct and nothing guards them.** `desktop/tests/write-channel.test.mjs` checks the fix by searching the built `main.js` for the strings `will-navigate`, `setWindowOpenHandler` and `action: 'deny'`. Three mutations each leave **all 306 checks passing**:

- inverting the condition at `desktop/src/main/main.ts:166` so `will-navigate` returns early for *foreign* origins and blocks Deck's own;
- replacing the `event.preventDefault()` at `main.ts:168` with a no-op, so nothing is stopped;
- returning `{ action: 'allow' }` from `setWindowOpenHandler` while leaving the words `action: 'deny'` behind in a comment.

The third is the sharpest: the assertion is satisfied by a comment. `desktop/tests/helpers.mjs` opens by warning against exactly this shape — "a guard shaped like `assert source.includes("GET")` survives the rename that breaks the behaviour it claims to protect" — and this is that guard. [[ISS-0029-The-Preload-Bridge-Follows-The-Window-Anywhere-It-Navigates]] is honest that nobody drove a click, and says it "closes on the guards being present"; the check does not establish even that. The smoke run does open real Electron windows and does report `ok: true`, so it is the place a real assertion could live.

**Finding 2 (low): `shell.openExternal` is handed whatever URL arrives.** `main.ts:169` calls it unconditionally for any non-same-origin URL that reaches `will-navigate` — `file:`, `smb:`, `x-apple-*` and any custom scheme a `file:`-registered handler claims. The comment two lines above names `file:` explicitly as a URL that reaches this branch, and then it is passed to the OS. Electron's own guidance is to allow only `http`, `https` and `mailto` here. The injection point the issue is about is the same one: markup the sidecar rendered from a note's Markdown, put into the page with `innerHTML`. Separately, `will-redirect` is not handled, so a redirect off-origin is not covered by `will-navigate`.

**What I could not break, and tried to.** `sameOriginAs` is right on all twelve adversarial inputs I gave it, including `http://127.0.0.1:7300.example.test/` (the prefix trap the note names), a scheme change to `https`, a port change, `javascript:`, `file:`, `about:blank`, a protocol-relative `//evil.test`, an uppercase scheme, `mailto:` and a string that is not a URL. Denying every `setWindowOpenHandler` is the right call and I checked why: there is no `window.open`, no `target="_blank"` and no `_blank` anywhere in `desktop/src/`, the single `new BrowserWindow` is at `main.ts:144`, and a popped-out panel goes through `deck:window:open-panel` (`preload.ts:40` → `main.ts:307`), which never touches the open handler. The verification gate is genuinely closed: `python3 tools/scripts/run-tests.py` reports `passing=23 failing=0 unrunnable=0`, TST-0033 among them, and `bash tools/scripts/validate-docs.sh` is OK. `electron . --smoke` reports `ok: true` with nothing skipped. `npm test` 306/0.

**Which build this was measured on.** The review ran against `c57f723`..`b2292df`. Two further commits landed while it was in progress (`883e880`, `8fff003`), both touching `desktop/src/main/main.ts`. Every blocking finding was re-driven against `8fff003`, where the suite is 307 checks: the three navigation-guard mutations and the `pathPrefixFor` mutation each still leave 307 passing and 0 failing.

## Independent review — 2026-09-09 (third pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The shell hop is now well guarded and [[ISS-0032-The-Navigation-Guards-Are-Checked-By-Grep]]'s fix is real. Two findings, both in the half of the write path no check can reach.

**Finding 1 (high): Deck draws two verbs on every design note that cannot work, because the renderer ignores the endpoint the row carries.** `ActuatorRow.endpoint` is documented in `desktop/src/shared/write-client.ts:48-55` as "the path this verb posts to, when it is not the generic transition", and `actuatorRows` reads it faithfully. `applyVerb` (`desktop/src/renderer/renderer.ts:807-835`) then posts every row to `transition` and never looks at it. Two notes in this repository are at `proposed` today, so this is reachable now:

```
curl -s 'http://127.0.0.1:8765/api/notes/actions?id=DES-0001'
  ... {"verb": "Accept", "to": "accepted", ..., "endpoint": "/api/design/verdict", "verdict": "approved"}

# driving Deck's own write client with that row, the way applyVerb would:
REFUSED: WriteRefused: a design verdict must name the revision it judged;
         use /api/design/verdict rather than a status transition (ISS-0056)
```

Nothing is corrupted — the sidecar refuses and the file is untouched — but a person clicking Accept on DES-0001 in Deck gets a sentence about an endpoint they cannot reach and a cockpit issue id. The check that should have caught it is the one that passes: `desktop/tests/write-channel.test.mjs` asserts "the rows Deck draws are exactly the rows the sidecar returned, in order", and `tools/scripts/check-write-round-trip.mjs` asserts the same thing against the live sidecar on `ISS-0008`, a note whose rows have an empty `endpoint`. Drawing the row correctly and acting on it wrongly is invisible to both. The two honest fixes are to post to the row's endpoint, or to draw no button for a row Deck cannot perform and say why.

**Finding 2 (high): [[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]] is fixed at the shell and only half fixed at the screen, and its own round-trip check drives the half that is still broken.** `applyVerb` collects a reason only inside `if (row.confirm)`. For `ISS-0008` the sidecar marks only `Decline` as `confirm`; `Accept` and `Defer` are not. So an issue accepted or deferred through Deck still moves its status and records no grounds, which is this issue's title.

Reproduced by building the request exactly as `applyVerb` does for a non-confirming row and posting it to the running sidecar, then reverting with git:

```
request applyVerb would send for Accept: {"id":"ISS-0008","to":"open","actor":"...","mtime":...}
status line: status: "open"
has ## Decision record: false
```

`tools/scripts/check-write-round-trip.mjs` takes `offered[0]`, which is `Accept`, and passes `note:` and `severity:` itself. Its green line — *"the reason Deck sent is IN the file, under the cockpit's own `## Decision record` heading"* — therefore measures the shell mapping on a verb whose interface sends neither. The line is true of the script and not of the application, and [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]'s new table repeats it as settled for step 8.

**Nothing at all covers the renderer half of the fix.** `grep -rn "applyVerb\|drawActuators\|triaging\|askText" desktop/tests/` returns nothing. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]], still at `triage`, and it now hides a defect in the fix filed against this feature two commits ago.

**What I attacked and could not break.**

- The `triaging` condition. `drawActuators` asks for a severity when the payload says `type: issue` and `status: triage`, and the sidecar's gate in `note_writes.py:582-589` is `note_type != "issue" or current != "triage"`. They match exactly, and the live payload for `ISS-0008` carries both fields.
- The navigation guards. Replacing the `will-navigate` refusal with a no-op makes `npm run smoke` report `ok: false` with three named failures. ISS-0032's move of the decision into `navigationFor` and its assertion in the smoke run is a real fix, not a relabelled grep.
- The round-trip check's tick assertion is not vacuous: run against the unticked render of the same note, its "ticked" regexp returns `false`, and `/api/render` answers freshly rather than from a cache.
- `check-write-round-trip.mjs` reproduces at 12 of 12 and leaves the working tree clean.

## Independent review — 2026-09-09 (fourth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. Both of the third pass's findings are discharged at the code — I mutated each fix and each went red — and the smoke run's main-process interception is sound. The findings are about what the new checks measure and where they run.

**Finding 1 (high): the three guards this round added run in a command nothing gates, and only one of the three notes says so.**

`grep -rn "canPerform\|elsewhere(\|applyVerb\|drawActuators\|Content-Security\|data-confirm" desktop/tests/` returns **nothing**. No `TST-*` note's `command:` runs the smoke — the only one whose title mentions it, TST-0036, runs `run-desktop-tests.sh smoke-support`, a unit suite over the verdict helper — and `.github/workflows/validate-docs.yml` runs `run-tests.py` and nothing else. So:

```
python3 tools/scripts/run-tests.py     passing=23 failing=0 unrunnable=0   # TST-0033 among them
```

closes `QUALITY.md`'s verification gate for this feature on a suite that contains none of the guards for [[ISS-0038-Nothing-Checks-The-Tag-That-Stops-A-Note-Running-Script]], [[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]] or [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]] — all three of which name TST-0033 in `tests:`. Revert any of the three and CI is green. ISS-0038 states this plainly about itself; ISS-0039, ISS-0040, TST-0033 and this note do not, and a reader of those four would conclude the fixes are gated. It is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] with three more things behind it.

**Finding 2 (high): the check that proves ISS-0040 never verifies it pressed a verb that does not confirm, and passes when the attribute it selects on is wholly wrong.**

`recordEveryVerbAsksWhy` picks `verbs.find((b) => b.dataset.confirm === 'false') ?? verbs[0]` and returns `names`, `asked`, `labels` and `said` — never which button it chose or what that button's `confirm` was. Hard-wire the attribute so the selector can never match:

```
# desktop/src/renderer/renderer.ts
-    button.dataset['confirm'] = String(row.confirm);
+    button.dataset['confirm'] = 'true';
npm run build && npx electron . --smoke
  {"ok": true, "failures": [], "skipped": []}
```

The check *"pressing a verb that does NOT stop to confirm still asks why"* stays green while the fact it names is unmeasured. Today it lands on a correct verb by accident: `/api/notes/actions?id=ISS-0008` returns Accept first and Accept is `confirm: false`, so `verbs[0]` is what the selector would have chosen anyway. The moment the sidecar reorders its rows or marks Accept confirm, the headline claim becomes untrue with nothing red. ISS-0040's third bullet — "the verb is picked by what the row says, never by its name" — is the right rule; what is missing is one `record()` saying the row it pressed said `confirm: false`.

**Finding 3 (medium): the drawn half of ISS-0039 is guarded by nothing, and "drawn unavailable" is not what the code draws.**

Reverting `drawActuators` to the pre-fix shape — `const why = row.reason` and `if (row.disabled && why !== '')`, so an unperformable verb gets no tooltip and no sentence beside it — leaves **320 of 320 checks passing and `npm run smoke` `ok: true`**. The three smoke checks read `#status` after the press, and `#actuators` is a sibling of `#status`, so nothing observes what was drawn. ISS-0039's first acceptance criterion is "drawn unavailable, with a sentence naming where the decision is recorded", evidenced by that run.

And "unavailable" overstates it. `button.disabled = row.disabled`, the sidecar returns `"disabled": false` for both of DES-0001's rows, and `deck.css` greys only `:disabled`. Probed in the real window:

```
[{"verb":"Accept","disabled":false,"opacity":"1","cursor":"pointer","title":"Accept is a design verdict, ..."},
 {"verb":"Decline","disabled":false,"opacity":"1","cursor":"pointer","title":"Decline is a design verdict, ..."}]
```

A design verdict is drawn exactly like a working verb, full opacity and a pointer cursor; the explanation is a tooltip and a `.why` span. That may be the right design, but ISS-0039's Fix section says "it is shown as unavailable", which is not what a person sees.

**Finding 4 (low): [[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]] is `fixed` and documents the rule ISS-0040 reversed one commit later.** Its Fixed section still reads "A verb that stops to ask now also asks why. `Decline` and `Supersede` are the verbs the sidecar's row marks `confirm` ... the reason box goes in the interruption that is already happening." That is exactly the behaviour ISS-0040 was filed against and removed. ISS-0037 is linked from this note and from TST-0028, so a reader arrives at the superseded rule with nothing saying it moved.

**Finding 5 (low): "twelve of twelve" is eighteen of eighteen, in two notes.** `node tools/scripts/check-write-round-trip.mjs` prints `18 of 18 passed` and leaves the tree clean; ISS-0037's Fixed section and TST-0028's new section both say twelve, and TST-0028's step table lists none of the six DES-0001 checks ISS-0039's third acceptance criterion credits it for.

**Finding 6 (low): the DES-0001 block in `check-write-round-trip.mjs` posts a real transition with no `try`/`finally` revert.** Every other write in that script restores the file in a `finally`; this one relies on the sidecar refusing. If that refusal ever stops — which is the upstream behaviour the block exists to observe — the script leaves `DES-0001` modified. The `record(git status === '')` line notices, but the file stays changed.

**Finding 7 (low): TST-0028's Adequacy section carries two overlapping paragraphs**, the new one-liner and the old one it was meant to replace.

**What I attacked and could not break.**

- ISS-0040's fix: putting `askText` back inside `if (row.confirm)` fails **2** checks (its own evidence line says 1).
- ISS-0039's fix at `applyVerb`: `canPerform` returning true for everything fails **3**, exactly as claimed; removing the guard from `applyVerb` alone fails the same 3.
- The interception is real, and the probe that proves it is the right shape. I could find no second write channel the check drives: `applyVerb` is the only caller of `host.write('transition')`, and nothing in the run touches a tick control.
- **Both of the run's dependencies on this repository's own state fail loudly, not quietly.** Setting `ISS-0008` to `open` gives `"failures": ["ISS-0008 opened in the reader with verbs on it, so this measures something"]`; setting `DES-0001` to `accepted` gives the equivalent for the design half. (The first message is slightly wrong — `openTheNote` computes `found` and discards it, so a row that is missing from the navigator reports as "no verbs".) Both reverted with `git checkout`; tree clean.
- `check-write-round-trip.mjs` 18/18 with a clean tree after; `npm run smoke` and `npm run smoke:lan` both `ok: true`, the LAN run with nothing skipped and nothing not-applicable; `npm test` 320/0; `run-tests.py` 23/0; `validate-docs.sh --as-committed` says HEAD passes the full CI step set.

## Independent review — 2026-09-09 (fifth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. What is independent here is the context, not the weights.

The fourth round's twelve findings are, in substance, discharged: I reproduced every corrected statement about the digest and the git timestamps, and five of the eight mutations I drove died naming the right check. Two new defects are worse than anything the fourth round found, and one of them is a direct consequence of the fix for ISS-0045.

**Finding 1 (high): this commit turns the repository's mandatory CI job red on every push, and it has never been pushed.**

`.github/workflows/validate-docs.yml` — the job its own header calls the "non-bypassable backstop" — runs `python3 tools/scripts/run-tests.py`. That job installs no Electron binary and has no display, because `run-desktop-tests.sh` sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1` on purpose. [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] now puts `bash tools/scripts/run-smoke.sh both` into that run, and `run-smoke.sh` exits 127 on a machine with neither. `run-tests.py` fails the whole run on an unrunnable test when `CI` is set — which GitHub always sets. The new `deck-smoke.yml` job gives Electron and a screen to *itself*; it gives nothing to `validate-docs`.

Reproduced by hiding the Electron binary's path file and running the two halves:

```
mv desktop/node_modules/electron/path.txt desktop/node_modules/electron/path.txt.hidden
bash tools/scripts/run-smoke.sh loopback
  run-smoke: Electron's binary is not installed here; the smoke run needs it and a display
  run-smoke EXIT=127
CI=true python3 tools/scripts/run-tests.py --filter TST-0037
  TST-0037     unrunnable bash tools/scripts/run-smoke.sh both
  passing=0 failing=0 unrunnable=1
  run-tests EXIT=1          <- validate-docs goes red
python3 tools/scripts/run-tests.py --filter TST-0037
  run-tests EXIT=0          <- which is why nothing noticed locally
```

`git status -sb` says `main...origin/main [ahead 22]`, so no Actions run has happened and the notes' "the first push settles it" is still true — but what the first push settles is not the question ISS-0044 asked. ISS-0044's `[~]` criterion reconciles *whether the new job passes*. It says nothing about the old job failing, and that is the outcome the code produces. Either `validate-docs.yml` has to skip this one test (it is template-owned, so that decision belongs upstream in `../project-os`), or `run-smoke.sh` has to distinguish "CI that was meant to run me" from "CI that was not", or `PROJECT_OS_ALLOW_UNRUNNABLE` has to be set for that job.

**Finding 2 (high): the fix for ISS-0045 left the guard that stops the request with no gate at all, and the smoke checks that used to measure it are now vacuous.**

ISS-0045's close-out says "`applyVerb`'s guard stays as well: two layers, because the drawn state is what a person reads and the guard is what stops a request." Only the first layer is measured. Deleting the second entirely leaves everything green:

```
# desktop/src/renderer/renderer.ts, applyVerb: delete
#   if (!canPerform(row)) { say(elsewhere(row), true); return; }
bash tools/scripts/run-smoke.sh loopback   -> EXIT=0
cd desktop && npm test                     -> tests 321  pass 321  fail 0
```

The mechanism is the fix itself. Before it, the button was clickable, so `target.click()` reached `applyVerb` and the two checks *"pressing one asks nothing"* and *"and sends nothing"* really did exercise the refusal. Now `button.disabled` is true, a click on a disabled button dispatches nothing, and those two checks pass because the browser swallowed the event. They assert a property of `<button disabled>`, not a property of Deck. This is ISS-0044's own headline — a guard nothing runs — reintroduced by the commit that closed it.

**Finding 3 (medium): `check-write-round-trip.mjs`'s "that refusal changed no file" can no longer fail, because ISS-0048's revert runs first.**

The `finally { git('checkout', '--', rel) }` added to the DES-0001 block restores the note before `record(git('status','--short','docs').trim() === '', 'and that refusal changed no file')` reads the tree. Driven by replacing the transition with a real append to the note:

```
# in the DES-0001 block, instead of client.transition(...):
#   fs.appendFileSync(path.join(REPO, rel), '\nA WRITE THAT SHOULD HAVE BEEN REFUSED\n');
node tools/scripts/check-write-round-trip.mjs
  ok    and posting it as a transition really is refused, in those words
  ok    and that refusal changed no file        <- the file WAS changed
  18 of 18 passed
```

The revert was the right instinct; the ordering is wrong. Read `git status --short docs` inside the `try`, before reverting, and assert on that captured value. The sibling block at `ISS-0008` (the stale-mtime refusal) has no revert and its identical assertion is still live, so the two now disagree about what they measure.

**Finding 4 (medium): `run-smoke.sh` reads the LAST `{"ok": ...}` block in the output, so a second one masks a real failing verdict.**

The extraction is `text.match(/\{\s*"ok":[\s\S]*?\n\}/g)` followed by `blocks[blocks.length - 1]`. Fed a run that prints a true failing verdict and then any later object with `ok` as its first key, and exits 0:

```
# desktop/package.json scripts.smoke replaced with a node one-liner that prints
#   {"ok":false,"failures":["a real failure"],...} then {"ok":true,"failures":[]} and exits 0
bash tools/scripts/run-smoke.sh loopback   -> EXIT=0, no output
```

Today only the exit-code half saves it, and the script's own comment says the exit code is not the verdict. Two other shapes I fed it behave correctly and are worth recording as negative results: a crash with no verdict at all reports `the run printed no verdict` and exits 1 even when the process exited 0, and a verdict written only to stderr is read fine because the runner redirects `2>&1`. Take the FIRST matching block, or refuse when there is more than one.

**Finding 5 (low): three of the six mutation counts in these notes do not reproduce.** Measured, one mutation at a time, each through `bash tools/scripts/run-smoke.sh loopback`:

| mutation | the note's number | measured |
| --- | --- | --- |
| the CSP meta tag deleted | 2 (ISS-0044) | 2 |
| the CSP kept but permitting inline script | "the driven half" (TST-0037) | 1 |
| the reason box back inside the confirmation | 2 (ISS-0044, ISS-0048) | 2 |
| the dead verb not disabled | 1 (ISS-0044, ISS-0045) | 1 |
| a verb Deck cannot perform offered anyway | 2 (ISS-0044) | **4** |
| `canPerform` returning true for every row | 3 (TST-0037 `adequacy`) | **4** |
| every row hard-wired to `data-confirm: true` | 2 (ISS-0044, ISS-0045) | **4** |
| `applyVerb`'s `canPerform` guard deleted | claimed as a live second layer | **0 — survives** |

The last row is finding 2. The three that are merely off are the fourth consecutive round in which a number written into a close-out does not reproduce.

**What I attacked and could not break.**

- The three guards themselves are real and the smoke run names them accurately. Every failure message printed the check by name and the row's drawn state, which is what makes them actionable.
- `run-tests.py` runs 24 of 24, TST-0037 included, so the smoke genuinely runs in that gate locally. `npm test` is 321/321. `check-write-round-trip.mjs` is 18 of 18 and leaves `working tree after: ""`. `validate-docs.sh --as-committed` exits 0.
- The write path is never reached by the smoke: the interception probe fires before any control is pressed, and `git status` was clean after every run I made.
- The Electron-presence test in `run-smoke.sh` reads as a confusing `||`/`&&` chain, and I could not make it wrong: `(require fails || no dist) && the resolved path is missing` is false whenever the binary is genuinely there and true in each of the three ways it can be absent.
- The 127 story holds where the notes claim it: unrunnable locally, red in CI. Finding 1 is that the red lands on the wrong job.

## Independent review — 2026-09-09 (sixth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. What is independent here is the context, not the weights.

Four of the fifth round's six findings are properly discharged and I could not defeat them. The two CI findings are not: `run-smoke.sh` still cannot run in either GitHub job, for two reasons neither ISS-0049 nor `deck-smoke.yml` names. And the write this feature is named after — ticking a criterion — can be deleted from the interface entirely with every gate still green.

**Finding 1 (high): `run-smoke.sh` cannot start on any Linux machine with no display, because the re-exec under `xvfb-run` looks for the script in the wrong directory. Both CI jobs go red at exit 127.**

The script does `cd "$DESKTOP"` at line 24 and then, at the display check, `exec env DECK_SMOKE_UNDER_XVFB=1 xvfb-run --auto-servernum bash "${BASH_SOURCE[0]}" "$WHICH"`. `${BASH_SOURCE[0]}` is the path the script was invoked with. [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]'s `command:` is `bash tools/scripts/run-smoke.sh both`, `run-tests.py` runs it with `cwd` at the repository root, and `.github/workflows/deck-smoke.yml` runs the same relative string from the same place. So `BASH_SOURCE[0]` is `tools/scripts/run-smoke.sh`, and by the time the re-exec happens the working directory is `desktop/`, where no such path exists.

Reproduced with a copy of the script whose only edits are the platform test (forced true, since this machine is macOS) and the build line (replaced by an echo), invoked exactly as CI invokes it, with a stub `xvfb-run` on `PATH`:

```
PATH=<stub>:$PATH bash tools/scripts/zz-run-smoke-probe.sh both
  fake xvfb-run invoked with: --auto-servernum bash tools/scripts/zz-run-smoke-probe.sh both
  bash: tools/scripts/zz-run-smoke-probe.sh: No such file or directory
  EXIT=127
```

Neither edit touches path handling. GitHub's ubuntu runners set no `DISPLAY` and no `WAYLAND_DISPLAY` — which is why `deck-smoke.yml` installs xvfb at all — so this branch is taken on every push. In `deck-smoke.yml` the script is the step, so 127 fails the step. In `validate-docs.yml`, `run-tests.py` calls 127 `unrunnable`, and `CI` is set, so the run returns 1. The fix is one line: resolve the script to an absolute path before the `cd`, and re-exec that.

**Finding 2 (high): the smoke needs the sidecar, `validate-docs.yml` does not provide it, and a smoke that runs without one FAILS rather than skipping. `PROJECT_OS_ALLOW_UNRUNNABLE` cannot excuse it.**

`.github/workflows/deck-smoke.yml` clones `../project-os-cockpit` and `pip install -e`s it, because `sidecar.ts` runs `python -m project_os_cockpit` and the package has to be importable. `.github/workflows/validate-docs.yml` does neither — its steps are checkout, `validate-docs.sh`, `run-tests.py`, `sync-snapshot.py`, `generate-adapters.py`. It runs the same `run-tests.py`, which runs the same TST-0037 `command:`.

Reproduced by giving the smoke a workspace with no `.cockpit/url` and an interpreter that cannot import the package, which is what that job has:

```
git archive HEAD | tar -x -C <tmp>/cirepo          # no .cockpit, as a fresh clone
cd desktop && DECK_PYTHON=/usr/bin/python3 npx electron . --smoke --workspace <tmp>/cirepo
  EXIT=1
  {
    "ok": false,
    "failures": [
      "the workspace opened: the sidecar for project-os-deck exited before it answered (using /usr/bin/python3):
       ... No module named project_os_cockpit",
      "SyntaxError: Unexpected token 'o', \"no sidecar \"... is not valid JSON"
    ],
    "skipped": [],
    "notApplicable": []
  }
```

That is `failing`, not `unrunnable`, so `run-tests.py` returns 1 whether or not `PROJECT_OS_ALLOW_UNRUNNABLE` is set (`tools/scripts/run-tests.py:124-129` gates only the unrunnable count). ISS-0049's fix taught the script to provision Electron and a screen; it never considered the third thing the smoke needs, and [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]'s "What it needs" section names only "Electron's binary and a display".

**This answers the question about the two workflows directly.** `deck-smoke.yml` is not cargo and not a duplicate: it supplies the sidecar and xvfb, and `validate-docs.yml` supplies neither. But the justification written into both files — that the second job exists so the `xvfb-run` assumption does not land on the template-owned one — is wrong about which job can run the smoke at all. The template-owned job cannot, on any push, for a reason no amount of provisioning inside `run-smoke.sh` can fix from inside this repository. TST-0037's `command:` and `validate-docs.yml`'s test loop are incompatible, which is what ISS-0049 concluded before the fix was replaced.

**Finding 3 (high): `attachTicks` can be deleted and nothing anywhere goes red. The write this feature is named after has no automated check on the interface at all.**

`desktop/src/renderer/renderer.ts:884` draws the tick control beside every addressed checkbox, and `tickCriterion` at line 920 collects the evidence and sends it. Making `attachTicks` return immediately — Deck then offers no tick control on any note — leaves every gate green:

```
# desktop/src/renderer/renderer.ts, first line of attachTicks body:
#   return; // Deck offers no tick control at all
cd desktop && npm test                        -> tests 321  pass 321  fail 0
bash tools/scripts/run-smoke.sh loopback      -> EXIT=0
node tools/scripts/check-write-round-trip.mjs -> 18 of 18 passed
```

This is [[ISS-0044-The-Renderer-Guards-Run-In-No-Gate]]'s exact shape, in the half of the feature nobody extended the smoke to cover. Six rounds have hardened the verb controls — ISS-0038, ISS-0039, ISS-0040, ISS-0044, ISS-0045, ISS-0050 — and the smoke run still never presses a tick. `grep -n "tick" desktop/src/main/main.ts` finds the IPC handler and nothing in `runSmoke`. `check-write-round-trip.mjs` does tick a criterion, but through `client.tick` — the sidecar client — so it measures the route without the interface on it, which is the same gap ISS-0040 was filed about for verbs ("a check drives `applyVerb` itself rather than the mapping underneath it").

The human cover is also absent: [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]] carries `last_verified: ""`, so this feature's first acceptance criterion — "A criterion ticked in Deck is ticked in the file, carries the evidence and the actor Deck sent" — has been verified by neither a walk nor a check that touches the control a person presses.

**Finding 4 (medium): a failed `npm ci` inside `run-smoke.sh` destroys the developer's `node_modules` and the retry only rescues one cause.**

The new install block runs `npm ci` whenever `have_electron` is false, and `npm ci` empties `node_modules` before it fetches anything. The retry with a private cache covers a cache this user cannot write, which is the cause ISS-0049 hit; every other cause — no network, a registry outage, a full disk — leaves the checkout stripped and the script at 127. Reproduced in a scratch directory holding Deck's own `package.json` and lockfile:

```
mkdir node_modules/marker && echo hi > node_modules/marker/file.txt
npm ci --no-audit --no-fund --registry http://127.0.0.1:1
  npm ci EXIT=1
  after: node_modules exists? yes; marker? NO
```

The trigger is ordinary: any machine where `run-desktop-tests.sh` installed first sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, so the binary is absent, so the next `run-smoke.sh` wipes and re-downloads a working tree. `run-desktop-tests.sh` guards its own install with `if [ ! -d node_modules ]` and never does this. Install into a temporary prefix, or refuse when `node_modules` is already populated and only the binary is missing.

**Finding 5 (low, the fifth consecutive round): a re-measured number that was not carried into the note the reader checks.** [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]'s Evidence section says hard-wiring every row to `confirm: true` "fails 4 ... the second was written as 2 before the checks around it grew". Its acceptance criterion, four lines above, still reads "evidence: 2 checks red when every row claims to confirm". The note now contradicts itself, and the stale half is in the ticked box. Measured today: 4 red.

**What I attacked and could not break.**

- **ISS-0050's fix is real, and both of its checks are live.** Deleting `applyVerb`'s refusal fails 2 checks by name, as claimed. I then wrote a subtler mutation to test whether "and sends nothing" is merely riding on the box-count check — a guard that refuses in words and posts the transition anyway — and it died alone: `FAILED smoke loopback: and sends nothing — with the button forced back on, so this is about Deck`. Forcing `button.disabled = false` from the page is a fair stand-in here, because the drawn-state checks two lines above measure what a person actually meets and this one measures the layer behind it.
- **All six mutation counts in the a729559 sweep reproduce at HEAD**, driven one at a time through `run-smoke.sh loopback`: the CSP meta tag deleted 2; `canPerform` true for every row 5; `applyVerb`'s refusal deleted 2; the dead verb left enabled 1; every row hard-wired to confirm 4; the reason box back inside the confirmation 2. Four rounds of numbers that did not reproduce, and this sweep does — naming the commit was the right fix.
- **ISS-0051's first two halves hold.** Appending to DES-0001 alongside the transition now fails "and that refusal changed no file" (17 of 18); replacing it outright fails two lines (16 of 18). A planted verdict pair — a failing block then a passing one, exit 0 — now gives `FAILED smoke loopback: a planted failure`, exit 1.
- **`have_electron` detects every way the package can be half-installed**: `path.txt` missing, `path.txt` empty, and `dist/` removed with `path.txt` intact. Present is detected as present.
- **The re-exec cannot loop.** `DECK_SMOKE_UNDER_XVFB` is set on the exec and checked before it, so a second pass with still no display exits 127. The `both` argument is preserved. Wrapping the whole script rather than each command leaves the LAN run's network binding alone.
- **`run-tests.py` runs the tests sequentially** (`tools/scripts/run-tests.py:112`), so two `npm ci` invocations cannot race in `desktop/`.
- Local state: `npm test` 321/321, `run-tests.py` `passing=24 failing=0 unrunnable=0`, `run-smoke.sh both` exit 0, `check-write-round-trip.mjs` 18 of 18 with `working tree after: ""`, `validate-docs.sh --as-committed` "HEAD passes the full CI step set". `git status --short` was empty after every run.

## Independent review — 2026-09-09 (seventh pass)

**Verdict: approved.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. What is independent here is the context, not the weights.

**Nothing I found would hurt a person using Deck.** The five findings below are all about gates and about prose. The write path itself survived everything I aimed at it, and the sixth round's fix — the smoke run pressing a real tick — is real, not a formality.

**The tick check is genuine, and I drove three mutations to prove it.**

```
# desktop/src/renderer/renderer.ts, first line of attachTicks: return;
bash tools/scripts/run-smoke.sh loopback
  FAILED smoke loopback: a note with an unticked criterion offers a tick
  control in this view (tried 18)                                    EXIT=1

# tickCriterion sends `evidence ?? ''` instead of refusing a null answer
bash tools/scripts/run-smoke.sh loopback
  FAILED smoke loopback: and the evidence a person typed reaches the shell;
  a tick with no evidence is refused before it is sent (...); and nothing
  more reached the shell                                             EXIT=1

# notesWithAnUntickedCriterion returns [] — the workspace stops having one
bash tools/scripts/run-smoke.sh loopback
  FAILED smoke loopback: this workspace has notes with unticked criteria, so
  this measures something; a note with an unticked criterion offers a tick
  control in this view (tried 0)                                     EXIT=1
```

That third one answers the question this check most needed answering. When the repository stops holding a note the check can use, the check **fails loudly and names the reason**; it does not pass over.

**Finding 1 (medium, and the only one that changes what anybody should believe): the smoke run is gated by nothing that has ever executed.** `run-tests.py` skips a note with an empty `command:` outright — `if not cmd: continue` at `tools/scripts/run-tests.py:62` — so [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]] is not merely unrun there, it is not listed, not counted, and not reported as an environment gap. The only job that would run it is `.github/workflows/deck-smoke.yml`, and that workflow does not exist on the remote:

```
gh run list --workflow deck-smoke.yml --limit 5
  HTTP 404: workflow deck-smoke.yml not found on the default branch

git rev-list --left-right --count origin/main...HEAD
  0	26
```

Twenty-six commits are unpushed and the last CI run of any kind was 2026-09-07. So four guards — the content policy, the reason box, the refused design verdict and now the tick — rest on `last_verified: 2026-09-09` and on a person remembering one command. That record is *honest* under `STATUSES.md`: a test with no `command:` records its own verdict and goes stale, `automation:` is a declaration the validator recognises (`validate-docs.py:862`), and I re-ran `bash tools/scripts/run-smoke.sh both` today at exit 0, so the date is true. It is honest and it is thin, and TST-0037 is now the only note in this repository that is `passing` on a person's word rather than on a command.

**Finding 2 (low): `deck-smoke.yml`'s own justification describes a world ISS-0054 abolished, in the one file that is now the sole gate.** Its header says "`run-smoke.sh` is TST-0037's `command:`, so `run-tests.py` runs it in both workflows", that the script "fetches Electron ... by itself", and that "the cost is that Electron is downloaded twice per push". None of the three is true any more. A maintainer reading that file could delete it believing the template-owned job still covers the smoke; nothing would go red, because nothing currently runs it.

**Finding 3 (low): `window.__deckOpenNote` is dead code, and its comment says otherwise.** It is defined at `desktop/src/renderer/renderer.ts:1385` and referenced nowhere else in the repository — `grep -rn "__deckOpenNote"` returns exactly that one line. Its comment calls it "a seam for the smoke run"; the smoke reaches the reader by clicking a navigator row instead. The doc comment on `notesWithAnUntickedCriterion` has the matching stale half — "so the run addresses a window straight at it" — where the run in fact unfolds the navigator and clicks. Not a hazard: it is inert for a real user, it is read-only (`openCard`), and the page's `script-src 'self'` is what stops anything calling it. It ships in `dist/web/renderer/renderer.js`, so it is on the served page too, offering a tablet nothing it does not already have.

**Finding 4 (low): the line that says "unfold the groups first" folds them.** `main.ts:1188` clicks every `.twist` in the navigator, and a group's click handler toggles (`navigator.ts:69`). Instrumented at HEAD, the issues view opens with two of five groups already open, and the loop closes one of them:

```
before: {groups:5, expanded:["true","false","false","false","true"], rows:10}
after:  {groups:4, expanded:["false","true","true","true"],          rows:54}
```

It found `ISS-0011` anyway. The risk is a confusing red, not a false green — every downstream assertion compares against the note that was actually open — and the tick block is the last thing in that window, so nothing after it is affected.

**Finding 5 (low): the fifth acceptance criterion is guarded by nothing.** "A tick is refused with a stated reason when the rendered checkbox carries no `data-raw`" is the branch at `renderer.ts:889-901`. No suite mentions `data-raw` or `no-tick` — `grep -rn "no-tick\|data-raw" desktop/tests/` returns one unrelated line about note ids — and the smoke cannot reach it, because `notesWithAnUntickedCriterion` selects for `\n\n- [ ] `, which is the shape that *does* get addressed. Deleting the block leaves Deck silently drawing no controls, with no sentence saying why, and every gate green:

```
# desktop/src/renderer/renderer.ts, the `if (addressed.length === 0)` block removed
cd desktop && npm test               -> tests 322  pass 322  fail 0
bash tools/scripts/run-smoke.sh loopback                          EXIT=0
```

The claim in "Where this stands" that both branches were seen on real notes — `TASK-0052` with five addresses, `PHASE-0001` with none — is true and was made by a person on 2026-09-09. It is a walk, not a gate.

**A related seam, for the record.** No suite imports `main/main` — `grep -rln "from '.*main/main" desktop/tests/` returns nothing — so the four-line bodies of the `deck:write:transition` and `deck:write:tick` IPC handlers are exercised by nothing automated: the smoke replaces them, `check-write-round-trip.mjs` bypasses them through `client.tick`, and node cannot load them. The mapping either side is well covered (`write-channel.test.mjs` for `tickRequestFrom`/`transitionRequestFrom`, the smoke for the interface). This is a two-line strip, it was exercised by hand against the real sidecar on 2026-09-09, and it is the shape a seventh round of fixes would chase. Recorded rather than filed.

**What I attacked and could not break.**

- **`npm test` is 322 of 322**, exactly as claimed, and `validate-docs.sh` exits OK.
- **The re-exec fix is real.** Driven from the repository root with a stub `uname` reporting Linux, `DISPLAY` and `WAYLAND_DISPLAY` unset, and a stub `xvfb-run`: `xvfb-run stub got: bash /Users/Edwin/Dev/repos/project-os-deck/tools/scripts/run-smoke.sh both`. An absolute path, and the `both` argument preserved.
- **The smoke touches no real state.** `app.setPath('userData', ...)` is redirected to a fresh `mkdtemp` whenever `--smoke` is present (`main.ts:37-44`), so the twist loop's fold and desk writes land in a temporary store. `git status --short` was empty after every run of mine.
- **The CI shape of the smoke works here.** On a `git archive HEAD` copy with no `.cockpit/url`, the run started its own sidecar and passed every check including the tick: `"sidecar": "http://127.0.0.1:8901", "borrowedFromTheCockpit": false`, then `{"ok": true, "failures": [], "skipped": []}`. Port 8901 was gone afterwards and the sidecar this repository was already running on 8765 was untouched. What has never been exercised is the GitHub job's own clone-and-`pip install` of the sidecar, because the workflow has never run.
- **The changed-under-you mark no longer fires when nothing changed.** The third finding of the first review is properly discharged twice over: `noticed()` returns early on an excluded path (`note-index.ts:249`), and `build()` raises only when `sameRecords` says the records moved (`note-index.ts:205`), so even a non-Markdown write under `docs/` produces no banner.
- **ISS-0055's corrections all landed.** ISS-0045's ticked criterion now reads "4 checks red ... re-measured at commit `a729559`"; ISS-0051 now says three and explains why two was impossible; and `check-bases-live.mjs:92-97` separates *the exemption expired* from *a date will not read*, with its own counter at line 231.
