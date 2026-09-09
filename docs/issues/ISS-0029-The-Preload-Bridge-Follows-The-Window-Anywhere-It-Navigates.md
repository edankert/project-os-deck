---
type: "[[issue]]"
id: ISS-0029
aliases: ["ISS-0029"]
title: "Nothing stops a Deck window navigating away from its own host, and the preload bridge — which carries the write channel — goes with it"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: medium
component: main
parent: ""
related: ["[[FEAT-0013-The-First-Write]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[RISK-0002-Decks-Read-Only-Guarantee-Rests-On-The-Sidecars-Own-Checks]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# The bridge is attached to the window, not to the origin

## Problem

**`desktop/src/main/main.ts` registers no `will-navigate` handler and no `setWindowOpenHandler`.** A `BrowserWindow`'s preload runs on every document that `webContents` loads, so `window.deck.write.transition` and `window.deck.write.tick` are present on whatever page the window ends up showing — including one Deck does not serve.

**There is an injection point.** The reader sets `article.innerHTML = note.html` with markup rendered by the sidecar from a note's own Markdown. The page's Content Security Policy blocks script and form submission, but not a link a person clicks: a note containing `[a link](https://example.test)` navigates the window, and the bridge is still there when it arrives.

**Recorded as a lead rather than a demonstrated exploit.** Nobody has driven the click in Electron. What is verified is the absence of both guards and the presence of the injection point, and the guards are one line each.

**Why it matters more since 2026-09-09 than before.** Until this week the bridge carried reads, a clipboard and a window opener. It now carries a write path whose whole authorisation is that the request comes from the main process ([[ADR-0003-Deck-Writes-Through-The-Shell]]).

## Expected

A Deck window navigates within the origin Deck serves, and anything else opens in the person's browser or not at all.

## Next Actions
- [ ] Refuse navigation away from the host origin, and refuse a new window rather than opening one with a preload attached
- [ ] Check what a link in a rendered note should do instead, since opening it externally is a behaviour change a person will notice

## Fixed, 2026-09-09

**A Deck window stays on the origin Deck serves.** `will-navigate` refuses anything else and opens it in the person's browser instead — refusing silently would make a link in a note look broken. `setWindowOpenHandler` denies every new window: one would carry this preload with it, and a popped-out panel is opened through `deck:window:open-panel`, which is a route Deck controls.

**The comparison is by ORIGIN and never by prefix.** `http://127.0.0.1:7300.example.test` starts with the host origin and is somebody else's machine. `sameOriginAs` is in `desktop/src/shared/origin.ts` rather than beside its caller, so it can be driven without opening a window: ten cases, including a `javascript:` URL, a `file:` URL and a string that is not a URL at all.

**What is still not proved.** Nobody has driven a click in Electron. This closes on the guards being present and the origin rule being right, which is what the issue recorded as verifiable; the walk that would settle it is a person clicking a link in a note.
