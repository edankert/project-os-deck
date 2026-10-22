---
type: "[[test]]"
id: TST-0105
aliases: ["TST-0105"]
title: "A session's pane, its composer, the agents standing on the towers, the Agents list and the Work on this dialog are laid out from the conversation model on both workspaces"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0197]]"]
phase: "[[PHASE-0004-Parity]]"
scope: feature
level: unit
entrypoint: "desktop/tests/agent-pane.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh agent-pane"
covers: ["[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"]
issues: []
tasks: ["[[TASK-0197]]", "[[TASK-0198]]", "[[TASK-0199]]", "[[TASK-0200]]", "[[TASK-0201]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# The session screens are laid out from the conversation model

## Purpose

**This suite checks the pure layouts behind the session pane, the composer, the markers and Work on this, without a window.** It does not exist yet; [[TASK-0197]] creates `desktop/tests/agent-pane.test.mjs`.

## Checks

- Turns come in order, each request at its turn, the counts match, a waiting session ends with its waiting line, and no cost appears. (TASK-0197)
- The composer's state follows the session's: Send, Interrupt, Resume, Stop; no access level skips permissions. (TASK-0198)
- Each session's marker stands over its start ticket, the cockpit's over the first ticket they moved, and every session is in the Agents list once. (TASK-0199)
- Work on this fills the first prompt from the ticket and its dialog's defaults are Ask before acting and this checkout. (TASK-0200)
- The screen checks cover the new screens with a scripted session. (TASK-0201)
