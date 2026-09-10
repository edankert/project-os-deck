---
type: "[[test]]"
id: TST-0025
aliases: ["TST-0025"]
title: "A planted orphan and a cluster hanging by one edge are both visible in the orbit without being told where to look"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[PHASE-0002-Glass]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
issues: []
tasks: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
area: "glass"
---

# A planted orphan and a single-edge cluster are visible

## Purpose

The orbit arrangement's claim is structural: it shows what nothing links to, and which clusters hang by one edge, without the reader being told where to look. A list can answer the first question and cannot answer the second. This walk plants one of each in a copy of this repository and asks whether a person finds both by looking. It is the acceptance walk of [[FEAT-0001-The-Corpus-Has-An-Inside]] and it cannot be walked before that feature's five tasks have landed.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it here.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A scratch copy of this repository**, so that nothing planted reaches the record: `cp -R . /path/to/scratch` and work there. Deck scans nothing, so add the scratch copy as a workspace by hand: in the window, the left rail carries **+ add a workspace**; choose the scratch folder, which holds a `SNAPSHOT.yaml`.
- **Plant the orphan.** In the scratch copy, add one note under `docs/reference/` with valid frontmatter and a title, linking to nothing and linked from nowhere. Write its id down.
- **Plant the cluster.** In the scratch copy, add three notes under `docs/reference/` that link only to each other, and add one `[[wikilink]]` to the first of them from one existing note, so the three hang off the corpus by a single edge. Write the four ids down, and the sentence that carries the single link.
- **Not before** the five tasks this note lists have landed: without the graph payload, a kept layout, a chosen treatment, the orbit drawn in the field and landing, there is nothing to look at.

## Procedure

- Open the scratch workspace in Deck and switch to the orbit arrangement from the view switcher.
- Without searching for the ids you wrote down, look for a node with no edge. Say which id it is before checking.
- Without searching, look for a small cluster joined to the rest by one edge. Say which ids they are before checking.
- Hover the single edge that joins the cluster to the corpus. Read the sentence the callout shows.
- Land on the orphan. Watch where it goes and what opens.
- In the same session, click a `[[wikilink]]` in any open note and choose "show this in the field". Watch how the camera arrives.

## Expected results

- The orphan you named is the planted one, found by looking rather than by search.
- The cluster you named is the planted one, and the edge you hovered is the single link that joins it.
- The callout on that edge shows the sentence you wrote, not the target's title.
- Landing lifts the orphan onto the desk and opens it in Deck's reader; nothing inside the field offered a verb.
- "Show this in the field" flies to the note rather than cutting to it.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note. Record the planted ids beside it, so a later walk can tell whether it found the same thing.

## Automated half

**Added 2026-09-10.** The orbit marks both things this walk looks for, so a person does not have to be told where to look: a note with no link in or out stands in an orphan band along the top of the orbit with a ring round it, and a link that alone holds a cluster of three or more notes on is drawn in its own colour. [[TST-0047-The-Orbit-Layout-Is-Solved-Once-And-Kept]] plants both in a small corpus and finds them, and the navigator lists every orphan under "With no link in or out". None of the three real corpora measured on 2026-09-10 has a cluster held on by a single link, so the walk has to plant one, as its procedure says.
