---
type: "[[test]]"
id: TST-0011
aliases: ["TST-0011"]
title: "Deck opens a workspace you add, and leaves nothing running when you quit"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "shell"
---

# Deck opens a workspace you add

## Purpose

The claim a person settles for [[FEAT-0002-Deck-Opens-A-Workspace]]: Deck opens, a folder you point it at becomes a workspace or is refused with a reason, and quitting cleans up after itself.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **A folder that is neither**, for the refusal: any directory with no `SNAPSHOT.yaml` and no `.obsidian` inside it. `/tmp` will do.
- **A terminal**, for the last step.

## Procedure

- Start Deck with `cd desktop && npm start`.
- Press **+ add a workspace** in the rail and choose `/Users/Edwin/Dev/repos/project-os-deck`. Click the workspace to open it.
- Press **+ add a workspace** again and choose a folder that is neither a project-os repository nor a vault. Read the line at the foot of the window.
- If the cockpit is open on the same repository, read the status line when the workspace opens: it says whether Deck started a sidecar or reused the one already running.
- Quit Deck. In a terminal, run `pgrep -fl project_os_cockpit` and read what is left.

## Expected results

- The workspace appears in the rail with its name and kind, and its notes are drawn as cards.
- The folder that is neither is refused, and the message names what Deck was looking for.
- Opening a repository the cockpit already has open reuses that sidecar rather than starting a second one, and the status line says so.
- After quitting, no sidecar that Deck started is still running. A sidecar the cockpit started is still running, which is correct: it is not Deck's to stop.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
