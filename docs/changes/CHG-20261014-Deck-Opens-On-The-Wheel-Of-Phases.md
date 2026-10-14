---
type: "[[change]]"
id: CHG-20261014-Deck-Opens-On-The-Wheel-Of-Phases
title: "Deck opens on a wheel of the project's phases, and a phase, a ticket and the unplaced tickets each open behind it as a picture"
status: merged
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]", "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"]
commit: "99eeeab"
pr: ""
impacts: ["desktop/src/shared/overview-scene.ts", "desktop/src/shared/overview-types.ts", "desktop/src/shared/overview-geometry.ts", "desktop/src/shared/overview-chrome.ts", "desktop/src/shared/overview-wheel.ts", "desktop/src/shared/overview-phase.ts", "desktop/src/shared/overview-ticket.ts", "desktop/src/shared/overview-rephase.ts", "desktop/src/renderer/overview.ts", "desktop/src/renderer/overview-pages.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/index.html", "desktop/src/renderer/deck.css", "desktop/scripts/copy-assets.mjs", "desktop/scripts/overview-plates.mjs", "desktop/scripts/overview-drive.cjs", "desktop/tests/overview-screens.test.mjs"]
issues: []
features: ["[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[CHG-20261014-Overview-Model-And-Screen-Checks]]", "[[CHG-20261014-Acceptance-From-Evidence]]"]
---

# Deck opens on the wheel of phases

## Summary

**Deck now opens on a wheel of the project's phases instead of the Glass field.** Each phase still to finish is a sector, each ticket a wedge coloured by its state. Finished phases sit on a shelf below, the backlog in a tray, and tickets with no phase in the middle. Pressing a sector opens the phase, pressing a wedge opens the ticket, and pressing the middle opens re-phasing. Pressing the Deck name at the left of the header leaves the overview for the field and comes back.

## Impact

- **Starting Deck:** with no address given, the desktop's main window opens on the wheel of the workspace it opens. A popped-out window keeps its panel. Switching workspace from the rail while the wheel is shown shows the new workspace's wheel.
- **Four new pages in the address grammar:** `?page=wheel`, `?page=phase&note=<PHASE>`, `?page=ticket&note=<id>` and `?page=rephase`. Copy address and Open address work on each. The three flows of FEAT-0029 sit beside them.
- **The overview layer** is fixed to the window under the header and beside the rail. It covers the navigator, the desk and the field, which are hidden while it shows. The field underneath is hidden while it shows. Pointing at a mark shows its callout, Tab and Enter reach every control, Escape goes back one screen, and L opens the list twin.
- **Re-phasing writes nothing.** Accepting a suggestion moves the tickets on screen for the session only.
- **The served page** still opens on the view the Mac shows, because it follows the Mac's store. Pressing its Deck name opens the same wheel, read only.
- **The look's palette** is written once in `overview-scene.ts`. The build writes it to `overview.css`, because the page's policy allows no inline style, and DES-0005's plates use the same module.
- **The checks:** [[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]] holds every screen to the look on Deck and your-trainer in node. [[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]] opened every screen in a real window on both on 2026-10-14. [[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]] and [[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]] are Edwin's and have not been run.

## Acceptance checks reopened

- [[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]] — Deck no longer opens in Glass; it opens on the wheel, and pressing the Deck name leads to Glass.
