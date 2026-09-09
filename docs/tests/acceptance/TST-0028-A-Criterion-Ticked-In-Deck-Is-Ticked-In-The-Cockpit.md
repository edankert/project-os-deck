---
type: "[[test]]"
id: TST-0028
aliases: ["TST-0028"]
title: "A criterion ticked in Deck is ticked in the file and in the cockpit, one transition moves a status, and the tablet is offered no verb at all"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0013-The-First-Write]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0013-The-First-Write]]"]
issues: ["[[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]]"]
tasks: []
artifacts: ["tools/scripts/check-write-round-trip.mjs"]
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]"]
area: "writes"
---

# A criterion ticked in Deck is ticked in the cockpit

## Purpose

Deck writes for the first time. [[ADR-0003-Deck-Writes-Through-The-Shell]] decided that the write goes from the shell through the main process to the sidecar on loopback, and that the served host never carries a write. Both halves need a person: that the change really reached the file, and that a tablet is offered nothing.

## Setup

- Once, ever: `cd desktop && npm install`. To start Deck in the shell: `cd desktop && npm start`.
- **To serve it to a tablet:** `cd desktop && npm start -- --lan`, then open `http://<the Mac's address>:<port>/` in Safari on the tablet. The port is printed on the console as `deck: serving ... on 0.0.0.0:<port>`.
- **The cockpit open on the same repository**, because half of this check is that the cockpit sees what Deck wrote.
- **A terminal with `git status` and `git diff` in the repository**, so you can see the file change rather than trusting two applications.
- **Pick a real note with an unticked criterion.** Any `FEAT-*` or `TASK-*` in this repository with an unticked box in its Acceptance or Definition of Done section will do. Do not use a note somebody is mid-way through.
- **Know your actor name** — Deck sends one with every write, and this check reads it back out of the file.

## Procedure

1. In Deck's shell window, open the note you picked in the reader.
2. Tick one criterion. Type the evidence when Deck asks for it.
3. Run `git diff` on that file.
4. Look at the same note in the cockpit.
5. Try to tick a criterion without typing any evidence.
6. Open a note whose rendered checkboxes carry no address — one where the sidecar could not stamp them. If you cannot find one, note that and skip this step.
7. Find a note whose status can move. Read the verbs Deck offers. Compare them, one by one, against the verbs the cockpit offers on the same note.
8. Pick one verb and apply it. Run `git diff` again and look at the note in the cockpit.
9. With the note open in a second Deck window, make a change to it in the cockpit. Watch the first window.
10. On the tablet, open the same note in Deck's served page. Look for any verb: a tick control, an actuator row, any control that would change something.
11. On the tablet, look at a note whose criteria are unticked. Try to tick one.

## Expected results

- The file gains `- [x]` on the criterion you ticked, with your evidence text, your actor name and today's date, in the form the cockpit itself writes.
- The cockpit shows the criterion ticked, with no reload trick and no restart.
- A tick with no evidence is not sent, and Deck says why.
- A note whose checkboxes have no address offers no tick, and Deck says why rather than showing a control that fails.
- The verbs Deck offers are the same verbs the cockpit offers on that note, in the same order, with the same ones disabled and the same reasons. A verb Deck offers that the cockpit does not is a fail.
- The transition moves the status in the file and appends the decision callout, and the cockpit shows it.
- The second Deck window says the note changed and offers to take the change. It must not silently redraw.
- **On the tablet there is no verb of any kind.** Not greyed out, not present and failing: absent. A disabled control is a fail.
- Nothing on the tablet can tick anything.

## Evidence (fill after running)

- The `git diff` for the tick and for the transition.
- The two verb lists, Deck's and the cockpit's, for the same note.
- A photograph or screenshot of the tablet showing the note with no verbs on it.

## Steps 1 to 9 are now measured, and steps 10 and 11 are not

**Run `node tools/scripts/check-write-round-trip.mjs` before walking this.** It drives Deck's write channel against the running sidecar and asks the sidecar what the cockpit would show, which settles most of what a person was going to squint at. Twelve checks, twelve passing on 2026-09-09.

It can settle them because Deck and the cockpit are not two readers of one file — they are two surfaces over ONE sidecar. "What the cockpit shows" is what `/api/render` returns, so asking the sidecar *is* asking the cockpit, and the answer is a string a check can read instead of a screen a person has to compare.

What the script measures, against notes in this repository, reverting every change with `git checkout`:

| step | what the script settles |
| --- | --- |
| 2, 3 | the file gains `- [x]` with the evidence, the actor and the date, in the cockpit's own form |
| 4 | the sidecar's render of that note changes and shows the box ticked, with nothing reloaded and nothing restarted |
| 7 | Deck's verbs are the sidecar's rows, in order, with the same `confirm` flags — checked on a note that HAS verbs, and failing if it turns out to have none |
| 8 | the transition moves the status, the reason Deck sent is under `## Decision record`, and the severity is in the frontmatter |
| — | a write carrying a stale modification time is refused, and changes no file |

**The script found a real defect the first time it ran**, which is the argument for having written it: [[ISS-0037-A-Decision-Made-In-Deck-Records-No-Reason]]. A decision made in Deck moved the status and recorded no grounds, because the field carrying them was dropped between the renderer and the shell. Nine months of walking this test by eye would not have caught it, because the walk's own expected result — "appends the decision callout" — is exactly what a person confirms by seeing a status change.

**What still needs a person, and why the script cannot take it:**

- **Steps 1, 2 and 5, as gestures.** The script calls the write client. It does not click a tick control, so it cannot show that a person can reach the write from the reader, or that Deck refuses a tick with no evidence at the moment of asking.
- **Step 6.** Finding a note whose rendered checkboxes carry no address means finding one where the sidecar's rendered count and its source count disagree. Neither application can conjure one on demand.
- **Step 9.** Two Deck windows, one change, and the question of whether the second window offers to take it rather than redrawing underneath you. That is a judgment about what a person notices.
- **Steps 10 and 11, the tablet.** Absent is not disabled, and only a person holding an iPad can say that nothing on the page is a verb. This is the half [[ADR-0003-Deck-Writes-Through-The-Shell]] turns on and it is not automatable here.

**It writes to this repository, so it refuses to start on a dirty working tree.** That is also why it is a script a person runs and not a check in the suite or the smoke run: neither of those may touch the repository they are checking.

## Adequacy (who verifies this test?)

A person, for the tablet and the gestures. The rest is measured — see the section above.

A person for the tablet, because the claim spans two applications, a file on disk and a second device. The automated half is [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]], which proves the channel against a fake sidecar and asserts the capability is false when served; it cannot prove that a real tablet shows nothing, and that is the part of [[ADR-0003-Deck-Writes-Through-The-Shell]] Edwin decided on.
