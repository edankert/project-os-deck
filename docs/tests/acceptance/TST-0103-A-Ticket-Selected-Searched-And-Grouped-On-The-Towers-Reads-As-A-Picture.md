---
type: "[[test]]"
id: TST-0103
aliases: ["TST-0103"]
title: "On Deck's towers a ticket's links, a search, what comes next, what needs you, the quiet towers, the weeks, the grouping by feature and the pictures are each read without reading a sentence"
status: draft
owner: user:edwin
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "The overview in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
issues: []
tasks: ["[[TASK-0187]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
area: "overview"
after: ["[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
---

# The towers' new parts read as pictures

## Purpose

**Edwin checks in Deck itself that the seven ideas from DES-0005's towers page work as they did on the page, and read as pictures.** It stays `draft` until TASK-0187 checks the steps against the build.

## Steps

1. Open Deck on Deck's own repository. The ring opens by phase.
2. Press a ticket with many links, such as a task of the focus feature. Expected: curves run to each linked ticket, the card names it, and the right pane shows its first paragraph, its linked tickets and its pictures.
3. Press `/` and type "wheel". Expected: the matches glow on the ring and the box says how many.
4. Read the next-up board. Expected: the focus feature's next task is marked NEXT, with who has it.
5. Read the needs-you panel, the age badges and the weeks without pointing at anything. Expected: what needs you, which towers are quiet and when work closed can each be said aloud.
6. Switch to by feature, quit Deck and open it again. Expected: it opens by feature; switch back to by phase.
7. Repeat steps 2 to 5 on your-trainer.

## Verdict

Recorded in the release ledger, not on this note.
