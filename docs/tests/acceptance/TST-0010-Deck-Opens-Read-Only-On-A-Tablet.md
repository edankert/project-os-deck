---
type: "[[test]]"
id: TST-0010
aliases: ["TST-0010"]
title: "Deck served over the local network opens on a tablet, reads the notes and refuses writes"
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

**Reopened 2026-09-08.** The pass of 2026-09-07 was earned on a build that no longer exists, and two fixes made that day run straight through this check. A read from the served page used to kill the sidecar it arrived at while that sidecar was still indexing, so a tablet opening a large workspace got an empty screen ([[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]); only the served page could do it, which is to say only the tablet. And the host's list of paths it will forward now reads the query as well as the path ([[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]]), which is the refusal this check is about. Two steps are added below for exactly those two.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out*. The desk bar underneath carries *Save desk…* and the desk list.
- **Start Deck with the network host instead**: `cd desktop && npm run start:lan`. The console then reads `deck: serving ... on 0.0.0.0:<port>`, and that port is the one to use.
- **The Mac's address on your network.** `ipconfig getifaddr en0`, or `en1` on this machine. Together they give you the address for the tablet: `http://<address>:<port>/`.
- **A tablet on the same network**, and for the last two steps any tool on it that can send a POST and can show you a status code. Safari's own address bar cannot; a shortcut, a REST client app, or `curl` from another Mac on the network will do.
- **A large workspace**, for the step about a sidecar that is still starting: `/Users/Edwin/Dev/repos/your-trainer` holds about 2,700 notes and takes tens of seconds to index. This repository's thirty notes index too fast to see anything.

## Procedure

- Start Deck with `npm run start:lan` and note the address and port it prints.
- On the tablet, open `http://<address>:<port>/` in Safari.
- Pick a workspace from the rail, move through the views, and open several cards.
- Look along the top bar: check that **Pop out** is not there at all, rather than there and greyed out.
- Look at the rail: check there is no **+ add a workspace**.
- From the tablet, send a `POST` to `http://<address>:<port>/deck/workspaces` and read the status code.
- **A workspace that is still indexing.** In the Mac window, add `/Users/Edwin/Dev/repos/your-trainer` and click it. Go straight to the tablet and open that same workspace there while the Mac window is still filling. Read whatever line the tablet shows. Wait half a minute, reload the tablet, and open the workspace again.
- **A way out of an allowed path.** You need the workspace's id, which is sixteen characters of hex and not something to guess: in the Mac window press **Copy address** and read what sits between `deck://` and the next `/`. From the tablet, ask for `http://<address>:<port>/deck/sidecar/<id>/api/render?file=../../../../etc/passwd`, and again with the dots written as `%252e%252e%252f`, which is one encoding deeper. Read the status code for each. Then open a note whose name has a space or a percent sign in it, if the workspace has one, and check it still renders.

## Expected results

- The tablet shows the same views and the same cards as the window on the Mac.
- No shell-only control appears anywhere in the interface. They are absent, not disabled.
- The `POST` is refused with 405, and nothing in the repository changes.
- **The still-indexing workspace tells the tablet to wait, and survives being asked.** The tablet shows a sentence saying the sidecar for that workspace is still starting — not an empty screen, and not a line saying the sidecar exited or did not answer. After the wait and the reload, that workspace's notes are drawn: the read did not kill it. The Mac window fills normally throughout.
- **Both spellings of the traversal are refused**, with a 403 saying Deck does not forward that path, and the ordinary note with an awkward name still opens. A refusal from the sidecar rather than from Deck's host also fails this: the host is Deck's own lock, and it is the one being checked.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
