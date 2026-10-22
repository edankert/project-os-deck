---
type: "[[plan]]"
title: "Plan for FEAT-0030: Agent sessions, Needs you and the overview panels are drawn before they are built"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]"]
implements: ["[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[PHASE-0004-Parity]]"]
---

# Plan for FEAT-0030

1. Record the sessions: a script reads the cockpit's session, approval and agent-state files in each repository and writes a fixture holding only what may be committed.
2. Draw the design page on the towers ring: agents at their towers, a session opened, Needs you, the overview panels, the shell drawer, starting a session from a ticket ([[TASK-0178]]).
3. Write DES-0006 with the pictures and the questions for Edwin; review it with two independent Claude reviewers.
