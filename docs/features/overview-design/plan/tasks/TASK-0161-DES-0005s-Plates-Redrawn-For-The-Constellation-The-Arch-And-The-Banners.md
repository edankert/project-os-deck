---
type: "[[task]]"
id: TASK-0161
title: "DES-0005's plates are redrawn for the constellation, the 3D plane, the arch gate, S7's text and the needs-you banners"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested but do not add the extra text for the feature boxes instead redesign the feature boxes (boxes look wrong in the current design) also when focussing on the feature (when the accept and send back options show) we need the feature text to be shown on that page.'", "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: S
due: ""
depends: ["[[TASK-0153]]", "[[TASK-0154]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0157]]", "[[TASK-0158]]", "[[TASK-0159]]", "[[TASK-0160]]"]
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0150]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# DES-0005's plates are redrawn for the second revision

**Once the screens have changed, every DES-0005 plate is drawn again from the screen code, so the design and the build still match.** This is the same step TASK-0150 took after the first revision.

## Definition of Done
- [x] `node desktop/scripts/overview-plates.mjs` redraws every plate on Deck and your-trainer: the constellation in both colourings, S2 and S3 with the needs-you reasons and the banner, the arch on S3 and S7, and S7 with the feature's text.
- [x] New pictures from a real Deck window show the tilted plane at rest and after a turn and a zoom, on S1 and S2.
- [x] Each plate's caption gives its word count at rest, as the check counts it.
- [x] DES-0005's screen texts (S1, S3, S7) and "The look" describe what is now built; its status stays `proposed`.
- [x] TST-0094 passes. Codex reviews the plates against the screens, in two rounds at most.

## Steps
- [x] Run the plates script; take the window pictures in the batched window run, with Edwin's go-ahead.
- [x] Update DES-0005's captions and screen texts.

## Verification

Redrawn on 2026-10-15 by `node desktop/scripts/overview-plates.mjs` from the recaptured fixtures (Deck `65c6397`, 395 tickets; your-trainer, 2,747), with the window run's pictures (`window-*.jpg`: the wheel at rest and turned, S2, S3, and S7 with its text) on both workspaces and the 3D page's six pictures. DES-0005's look, S1, S3 and S7 captions are rewritten for the constellation, the 3D camera, the needs-you sentence, the arch and S7's text, with the plates' word counts (Deck 13 and your-trainer 42 on the wheel; 44 and 27 on S3; 30 on S7). TST-0094 passes on the new plates.

## Notes

Claude lane. Waits on every other task of the second revision (TASK-0153 to TASK-0160). The Level 2 page and its pictures come from TASK-0157 and are only linked here.
