---
type: "[[feature]]"
id: FEAT-0013
aliases: ["FEAT-0013"]
title: "The first write: Deck ticks a criterion and makes one transition, through the shell to the loopback sidecar, and the tablet is offered no verb"
status: review
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
review_verdict: changes-requested
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
