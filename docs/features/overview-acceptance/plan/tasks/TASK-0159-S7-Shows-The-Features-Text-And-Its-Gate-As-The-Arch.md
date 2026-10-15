---
type: "[[task]]"
id: TASK-0159
title: "S7 shows the feature's text on the same page as Accept and Send back, and draws its gate as the arch"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Also the accept / send back option for a feature should show the feature text'", "Edwin 2026-10-15, approving: 'when focussing on the feature (when the accept and send back options show) we need the feature text to be shown on that page.'", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
parent: "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"
effort: M
due: ""
depends: ["[[TASK-0154]]"]
blocks: ["[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0148]]", "[[TASK-0149]]"]
tests: ["[[TST-0085-Flow-Scenes-And-Payloads-Keep-The-Recorded-Evidence]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0100-Accept-A-Feature-From-Its-Five-Lamps]]"]
---

# S7 shows the feature's text, and its gate as the arch

**When Edwin is asked to accept a feature or send it back, he needs to read what the feature is.** Today S7 shows the gate and the two buttons, but not the feature's text. This task puts the feature's note on the same page, in the scrolling note panel S3 already uses (TASK-0148), and replaces S7's five chips with the arch from TASK-0154.

## Definition of Done
- [ ] S7 shows the feature's full note text in S3's note panel, beside the gate and the Accept and Send back buttons, on both workspaces. The panel scrolls and its words are exempt from the 60-word count, as on S3.
- [ ] S7 draws its gate with the shared arch component (`desktop/src/shared/overview-gate.ts`), from the same `featureGate` data as today. The chips are no longer drawn anywhere.
- [ ] The arch's callouts carry the five bucket meanings, and "not reported" stays visible, as TASK-0154 draws them.
- [ ] Accept and Send back keep their current availability and refusals: unavailable while the cockpit advertises no feature transition ([[project-os-cockpit#ISS-0323]]), with the hover saying so.
- [ ] TST-0085 checks the panel is present with the note's text and the arch has five segments, on both fixtures. The window run TST-0093 opens S7 on both workspaces. `cd desktop && npm test` passes. Two independent Claude reviewers, each in a clean context, review it in two rounds at most (Codex stopped running on 2026-10-15, and Edwin asked for Claude only).

## Steps
- [ ] Reuse S3's note panel in S7's scene; read the text the way S3 does.
- [ ] Swap `gateChips` for the arch component.
- [ ] Extend TST-0085.

## Notes

Codex lane. Waits on TASK-0154, which moves the gate drawing into the drawing lane's module and draws the arch.
