---
type: "[[issue]]"
id: ISS-0002
aliases: ["ISS-0002"]
title: "A second Deck cannot start and says nothing — the free-port probe binds loopback while the host binds every interface, so a port another Deck already holds looks free, and the failure is an unhandled rejection with no window and no message"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["Found while adding an npm script for the tablet walk, 2026-09-06: `npm run start:lan` with a Deck already running printed an unhandled rejection and opened no window."]
severity: high
component: main
parent: ""
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[TASK-0021-Decks-Own-Read-Only-Host]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]"]
tests: ["[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]"]
---

# A second Deck cannot start and says nothing

## Problem

**Deck opens no window and prints a stack trace.** Observed on 2026-09-06:

```
UnhandledPromiseRejectionWarning: Error: listen EADDRINUSE: address already in use 0.0.0.0:7300
```

Two faults, and the second is the one that makes it hard to diagnose.

## Fault one: the probe asks about the wrong interface

`freePort` decides a port is free by binding it on `127.0.0.1`. The host then binds `0.0.0.0` when Deck is started with `--lan`. A port that another process holds on every interface is still free on loopback, so the probe hands back a port that cannot be listened on. Starting a second Deck hits this every time, and starting one after another Deck was left running hits it too.

## Fault two: a startup failure is silent

`app.whenReady().then(async () => { ... })` has no `catch`. Everything after `startHost()` is skipped, so no window is created, and on macOS the application stays alive with nothing on the screen. The only sign is a warning on a console nobody is reading, and the person is left with an application that appears to do nothing when launched.

## What it should do

- Probe the interface the host will actually bind.
- Report a startup failure where a person will see it, and stop rather than linger with no window.

## Fix

`freePort` takes the interface it is probing for, and the host passes the one it is about to bind. Startup is wrapped: a failure is printed, shown in a dialog, and Deck stops rather than lingering with no window.

## Verified

Two Decks started one after the other on 2026-09-06, both with `--lan`: the first took 7300 and the second took 7301, where before the second opened nothing and printed a stack trace.

## What guards it

The port half is a check in the sidecar suite: a port held on every interface is not offered for every interface, and the test also confirms the port really is unusable there, which is what the caller hits. The message half is not automated. Showing a dialog needs a running Electron and a person to see it, and asserting that a dialog was called would test the mock rather than the behaviour.
