---
type: "[[test]]"
id: TST-0011
aliases: ["TST-0011"]
title: "Deck opens a workspace you add, and leaves nothing running when you quit"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-08
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

**Reopened 2026-09-08.** The pass of 2026-09-07 was marked with "I am not sure if it doesn't leave anything running when I quit???", and that doubt was correct: at the time, Deck's escalation from SIGTERM to SIGKILL was a timer that could not fire, because the process that would have run it had already gone ([[ISS-0021-A-Sidecar-Started-After-The-Quit-Began-Outlives-Deck]]). The quit was then fixed twice. The last step of this check is written so nobody has to guess again: you write down the sidecar's process id before quitting and look for that number afterwards. Two quits are walked, because two different ones were broken — the one from the menu, and the one that arrives as a signal from the terminal.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **A folder that is neither**, for the refusal: any directory with no `SNAPSHOT.yaml` and no `.obsidian` inside it. `/tmp` will do.
- **A terminal**, for the last two steps. The one command it needs is `pgrep -fl project_os_cockpit`, which prints one line per running sidecar: the process id first, then the command. It only lists; it stops nothing.
- **Do not stop anything by hand during this check.** A sidecar left behind is the result, and killing it destroys it. If one is left, say so in the ledger reason and leave it for the person reading.

## Procedure

- Start Deck with `cd desktop && npm start`.
- Press **+ add a workspace** in the rail and choose `/Users/Edwin/Dev/repos/project-os-deck`. Click the workspace to open it.
- Press **+ add a workspace** again and choose a folder that is neither a project-os repository nor a vault. Read the line at the foot of the window.
- If the cockpit is open on the same repository, read the status line when the workspace opens: it says whether Deck started a sidecar or reused the one already running.
- **The window quit.** In a terminal, run `pgrep -fl project_os_cockpit` and write down the process ids it prints. Quit Deck from the menu (⌘Q). Wait five seconds, run `pgrep -fl project_os_cockpit` again, and compare the two lists number by number.
- **The signal quit**, which is the second thing that was broken. Start Deck again with `cd desktop && npm start` and open the same workspace. Run `pgrep -fl project_os_cockpit` and write down the ids. Press Ctrl+C in the terminal Deck is running in. Wait five seconds, run `pgrep -fl project_os_cockpit` once more, and compare.

## Expected results

- The workspace appears in the rail with its name and kind, and its notes are drawn as cards.
- The folder that is neither is refused, and the message names what Deck was looking for.
- Opening a repository the cockpit already has open reuses that sidecar rather than starting a second one, and the status line says so.
- **After the window quit, every process id Deck started has gone from the list.** An id that was there before Deck started, because the cockpit started it, is still there afterwards, and that is correct: it is not Deck's to stop. If Deck reused the cockpit's sidecar, nothing should disappear at all.
- **After the signal quit, the same holds.** This is the path that used to leave a sidecar behind every time: `kill -TERM` and Ctrl+C both reached Deck, and Deck went without waiting for its children.
- Any id that is in the before list, is not the cockpit's, and is still there after five seconds is a fail, whichever quit produced it.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
