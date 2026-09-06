---
type: "[[test]]"
id: TST-0010
aliases: ["TST-0010"]
title: "Deck served over the local network opens on a tablet, reads the notes and refuses writes"
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
covers: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "two hosts"
---

# Deck served over the local network opens on a tablet

## Purpose

The third exit criterion of [[PHASE-0001-Deck]]. It needs a tablet on the same network, which is why it is walked.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **Start Deck with the network host instead**: `cd desktop && npm run start:lan`. The console then reads `deck: serving ... on 0.0.0.0:<port>`, and that port is the one to use.
- **The Mac's address on your network.** `ipconfig getifaddr en0`, or `en1` on this machine. Together they give you the address for the tablet: `http://<address>:<port>/`.
- **A tablet on the same network**, and for the last step any tool on it that can send a POST.

## Procedure

- Start Deck with `npm run start:lan` and note the address and port it prints.
- On the tablet, open `http://<address>:<port>/` in Safari.
- Pick a workspace from the rail, move through the views, and open several cards.
- Look along the top bar: check that **Pop out** is not there at all, rather than there and greyed out.
- Look at the rail: check there is no **+ add a workspace**.
- From the tablet, send a `POST` to `http://<address>:<port>/deck/workspaces` and read the status code.

## Expected results

- The tablet shows the same views and the same cards as the window on the Mac.
- No shell-only control appears anywhere in the interface. They are absent, not disabled.
- The `POST` is refused with 405, and nothing in the repository changes.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
