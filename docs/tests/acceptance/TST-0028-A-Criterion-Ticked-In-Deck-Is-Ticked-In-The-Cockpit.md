---
type: "[[test]]"
id: TST-0028
aliases: ["TST-0028"]
title: "A criterion ticked in Deck is ticked in the file and in the cockpit, one transition moves a status, and the tablet is offered no verb at all"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0013-The-First-Write]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0013-The-First-Write]]"]
issues: []
tasks: []
artifacts: []
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

## Adequacy (who verifies this test?)

A person, because the claim spans two applications, a file on disk and a second device. The automated half is [[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]], which proves the channel against a fake sidecar and asserts the capability is false when served; it cannot prove that a real tablet shows nothing, and that is the part of [[ADR-0003-Deck-Writes-Through-The-Shell]] Edwin decided on.
