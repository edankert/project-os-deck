# The sidecar's acceptance payload, as recorded

`app.json` is one answer from `GET /api/cockpit/acceptance?platform=app`, recorded on 2026-10-02 from the sidecar serving this repository's own notes (project-os-cockpit at commit `d1df13c`, this repository at `f80339f`). It is 21 checks, 7 of them with events in the ledger, 14 events in all.

Deck reads four things from this payload: `schema_version`, `ledger_platforms`, each check's standing verdict (`view.tiers[].areas[].items[]`) and its history (`view.history`). `desktop/tests/evidence.test.mjs` reads the file. When the cockpit changes the payload's shape, record it again with the same request: a suite that fails then is the warning RISK-0008 asks for.

The file is the sidecar's answer as it came. Nothing in it is edited by hand.
