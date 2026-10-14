---
type: "[[change]]"
id: CHG-20261014-A-Promoted-Quiet-Card-Stays-Dimmed
title: "A finished note zoomed until it becomes a card keeps the dim brightness of the tile it replaced, instead of lighting up like current work"
status: merged
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
source: ["[[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]], acceptance line 'A promoted card is still dimmed and still reads as finished work', found untrue on 2026-10-14"]
commit: "f3556dd"
pr: ""
impacts: ["desktop/src/shared/slots.ts", "desktop/src/renderer/glass.ts", "desktop/src/main/smoke-glass.ts", "desktop/tests/detail.test.mjs"]
issues: []
features: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TST-0055-Detail-Follows-Apparent-Size]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[PHASE-0002-Glass]]"]
---

# A promoted quiet card stays dimmed

## Summary

**In Glass, a finished note on the quiet shelf no longer brightens when a person zooms in far enough to turn it into a card.** Before, the painted tile was drawn at 75 percent opacity at most, and the card that replaced it was drawn as brightly as a card in the front band, up to fully opaque. Now the card keeps the tile's brightness at every bearing, so finished work still looks finished when it is close enough to read.

## Impact

- **Glass, the quiet band, zoomed in:** promoted cards are drawn at the same opacity their tiles were painted at, including the extra dimming on a back layer of the shelf. Their size, their detail and when they promote are unchanged.
- **Glass, every other band:** front, mid and outer cards are drawn exactly as before.
- **The code:** one function, `bandOpacity(band, phi, layer)` in `desktop/src/shared/slots.ts`, now says how opaque a note is drawn. The canvas paints quiet tiles with it and `place()` in `desktop/src/renderer/glass.ts` draws cards with it, so the two cannot drift apart again.
- **The checks:** [[TST-0055-Detail-Follows-Apparent-Size]] asserts a quiet note is dimmer than every other band at every bearing and that the other bands kept their values. The Glass smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]) measures a real promoted card's opacity against the brightest a tile is painted.
