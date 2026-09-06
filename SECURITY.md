---
type: security
id: SECURITY
status: active
owner: group:maintainers
created: 2026-01-26
updated: 2026-09-06
tags: [security]
---

# Security

Deck adds no write path of its own. Every write to a note goes through project-os-cockpit's sidecar and its guards: writes are loopback-only, human-only verbs refuse an agent, and the verb registry owns what can be done to which note. Those rules are the cockpit's (REQ-0026, REQ-0027 and RISK-0005 there) and Deck inherits them by calling the same endpoints.

When Deck is served from the sidecar over the LAN for a tablet, it is read-only, for the same reason the cockpit's own LAN surface is: there is no authentication anywhere in this tool, and loopback is the authorisation model. Parity for writes waits for an authenticated write path (the cockpit's ADR-0010).

Guidelines:
- Do not commit secrets, credentials, or proprietary tool binaries.
- Treat build outputs and logs as generated artifacts; keep them out of version control.
- Avoid embedding absolute internal paths into documentation; prefer environment variables or repo-relative paths.
