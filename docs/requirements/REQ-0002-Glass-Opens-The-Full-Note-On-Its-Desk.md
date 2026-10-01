---
type: "[[requirement]]"
id: REQ-0002
title: "Glass opens the full note on its desk"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[DES-0003-Collections-And-Documents-On-Glass]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
priority: high
scope: "A note opened from a Glass card or collection row"
acceptance: ["Opening a row or field card immediately exposes its identified document on Glass and renders the full authored text as soon as available, with explicit loading/retry states, interruptible visual continuity and a direct reduced-motion transition.", "A document presents its title before compact ID and state, keeps full paths in details, and preserves links, checkboxes, guarded actions and the person's chosen reading size.", "The same note has one spatial representation; an already open note is located and raised, and closing restores its initiating row or control without a permanent ghost.", "A document and collection remain usable together; text dragging selects text, header dragging moves without resizing, and object scrolling never turns or zooms the field at its boundary.", "Neighbourhood movement preserves readable size and shared identity; source-backed relationship labels have an exact accessible linked list and off-screen objects have a return route.", "A narrow window or tablet provides explicit navigation between objects, visible keyboard focus and the existing read-only served-host authority."]
implements: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
verifies: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0069-The-Verb-Buttons-Take-A-Full-Height-Column-Beside-The-Reader]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Glass opens the full note on its desk

## Statement

Opening a note in Glass must immediately expose its identified document surface. Render the full authored text as soon as the sidecar makes it available, with an explicit loading state and retry on failure. A subject summary may share that document with the text; neither it nor the opening animation may become a gate before reading.

## Acceptance Criteria

- [ ] Opening a row or field card immediately exposes its identified document on Glass and renders the full authored text as soon as available, with explicit loading/retry states, interruptible visual continuity and a direct reduced-motion transition. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A document presents its title before compact ID and state, keeps full paths in details, and preserves links, checkboxes, guarded actions and the person's chosen reading size. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] The same note has one spatial representation; an already open note is located and raised, and closing restores its initiating row or control without a permanent ghost. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A document and collection remain usable together; text dragging selects text, header dragging moves without resizing, and object scrolling never turns or zooms the field at its boundary. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Neighbourhood movement preserves readable size and shared identity; source-backed relationship labels have an exact accessible linked list and off-screen objects have a return route. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A narrow window or tablet provides explicit navigation between objects, visible keyboard focus and the existing read-only served-host authority. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]
- Verified by: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
