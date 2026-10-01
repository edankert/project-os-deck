---
type: "[[task]]"
id: "TASK-0091"
title: "Make the field interactive and open a representative native note reader"
status: "cancelled"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "L"
due: ""
depends: ["[[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]"]
blocks: ["[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]"]
related: ["[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]", "[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]"]
tests: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Exercise the field with real input and a native reader

## Outcome and ownership

A person can find, select, pull and read notes through the native window. This task owns input normalization, interaction state, focus, a representative native reader and reusable recorded input traces.

## Definition of Done

- [ ] Real pointer/keyboard input and replayed input reach the same application commands. The replay does not bypass hit testing or gesture arbitration.
- [ ] Hover, click/Enter, drag-to-pull, keyboard pull, reset, turn, pan, anchored wheel/pinch zoom and zoom shortcuts behave as specified in [PLAN.md](../PLAN.md).
- [ ] Search/locate reaches notes from every band and beyond production caps. Visible tiny notes remain interactive before drawing richer content.
- [ ] A pulled or opened note has one active representation. Closing the reader and resetting pulls restore the intended scene without moving unrelated base positions.
- [ ] The native reader displays the fixture's headings, paragraphs, lists, emphasis, code, table, local links and long scrollable body. Unsupported constructs are visible and recorded.
- [ ] Reader scrolling does not zoom the field. Search text input does not trigger field shortcuts. Escape and reduced motion preserve predictable actions.
- [ ] Keyboard traversal reaches field controls, search and reader. Native selection/copy is implemented or explicitly recorded as a migration blocker with its measured limitation.
- [ ] Input and reader costs are included in metrics and acceptance evidence. Source workspace state remains unchanged.

## Steps

1. Complete TASK-0090. Define gesture thresholds once, including click-versus-drag arbitration and cancellation.
2. Wire the window event path into scene commands and hit testing. Add replay at the event-normalization boundary with event timestamps preserved.
3. Add visible selection, hover label, pull marker, reset and a searchable identity list. Use fixture-provided examples to avoid arbitrary note selection.
4. Build the native reader slice with clipping, scrolling, link activation and text selection where supported. Include the link/neighbour context the frozen workload requires.
5. Exercise focus changes, search, reader scroll, reduced motion and rapid zoom/pull sequences through real window events.
6. Perform the acceptance walk and save captures. Record keyboard/accessibility gaps and reader omissions for TASK-0093.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]] is the real-window acceptance walk. Add focused behavior tests for gesture arbitration, focus routing, reduced motion, reader scrolling and command equivalence. Demonstrate that a wrong pointer transform or incorrectly routed reader wheel event makes the corresponding check fail.

Do not substitute screenshots or a short placeholder body for the reader. Stop scored runs if real input takes a different application route from replay, a visible note cannot be selected, or note opening changes unrelated placement. Missing full screen-reader support is migration evidence; it cannot be presented as delivered accessibility parity.

## Notes

Depends on [[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]. Full editing, embeds, plugins, multiwindow behavior, saved desks and browser/tablet delivery remain outside this task.

The U-key reload supports the add/remove acceptance step without moving surviving notes or losing an open reader's identity. The local `tools/reload-fixture.mjs` helper prepares a synthetic 200→201→200 sequence, and its 201-note fixture passed headless placement. Nineteen Rust unit tests pass, including replay-versus-pointer selection and drag equivalence, wheel routing, reload reconciliation, reader span styling and duplicate displayed-ID search. Replay now routes select, open and pull through the same hit test and gesture arbitration as OS pointer input, and routes pan, zoom and reader scrolling through shared pointer/wheel helpers; the reader command comparison is recorded below and broader gesture equivalence still needs its final audit. A real-window U-key run recorded both count changes; separate earlier runs recorded reader wheel scroll, local-link following, Escape and search cycling between two `PLAN` notes with distinct canonical keys. The `tools/examples.mjs` sidecar selects reproducible examples without altering frozen fixtures. Two OS-input runs opened notes omitted by production caps, including a front-band test; another clicked and opened a quiet note at its smallest drawn size after zooming out. Another real-input run pulled that quiet note by pointer, switched away and back, reset it and pulled it by keyboard. The reader now scrolls shaped visual rows; a real 280,999-byte body opened and scrolled in the native window. Further OS-input runs opened the first, middle and last real notes, a long and a Unicode title, the generated Arabic-title example, and followed a local link on the current reader build. Captures show these states. Two recent native foreground diagnostics were invalid because the window never gained focus or submitted a frame; they do not replace the earlier valid walks. A subsequent focused 20-second replay diagnostic completed on the intended display, opened a note, scrolled and followed its named local link, with no application errors. It does not replace real OS-input evidence. The acceptance evidence is assembled below; the final walk audit and the recorded arbitrary text-selection limitation remain open, so this task remains doing.

On the new 10,000-note fixture, replayed reader pan initially failed when every tried drag origin contained a card. The invalid run is retained. Shift-drag now pans through a card via the same pointer path as OS input; a rerun of the identical 20-second reader trace completed with 10,000/10,000 notes and a followed local link. Nineteen Rust tests pass, including a card-occupied Shift-drag test. One OS-delivered Shift-drag produced a `pan` command without errors or focus loss on the intended display; the final acceptance audit and broader gesture equivalence remain open.

The replay's `close_reader` action now calls the Escape input route. A new Rust sequence check compares the entire command log and final reader state for replay and normalized delivered input across open, scroll, local-link follow and close; 19 Rust tests pass. This checks the shared application route, not OS event delivery. A real-window occupied-card Shift-drag exposed a separate driver fault: its key event alone did not mark the mouse press as shifted, and the note was pulled. The driver now marks its mouse events with Shift. Repeating the same gesture on the centred `N-00000` card produced `pan` without `pull` or `open`, preserved 200/200 placement, foreground focus and the 3440 × 1440 monitor. Before/after captures show the card moving with the field. A subsequent OS wheel event shrank the card while the pointer remained over it; the camera inverse unit check covers exact anchor coordinates. The frozen real source tree was independently re-audited at hash `71f0aeb990d6f8569fde2f756c88c50b9ed0466aa1e47d8a70ebc4257e6382c6` with all 3,174 selected bodies intact. The remaining gesture audit and acceptance synthesis remain open.

In `search-shortcuts-real-window-r1.json`, OS-delivered search input displayed `P+R` without producing pull, reset or zoom commands. After Escape left search, the `+` key produced one `zoom_field` command and a visibly larger card. The run kept 200/200 placement, focus and the intended monitor. A command-line attempt to set macOS `com.apple.universalaccess reduceMotion` failed with “Could not write domain”; the preference was originally absent and was not changed. The later Settings UI run below supplies the reduced-motion observation; the failed preference command remains a recorded attempt, not a passed check.

The add/remove walk now has real-window survivor evidence. In `reload-survivors-real-window-r2.json`, U-key reload commands changed 200→201→200 placed notes with no focus or visibility loss. PNG captures before, after add and after remove have identical pixels across the 1,440 × 858 field rectangle below the status bar, so the visible surviving cards did not move. In `reload-locate-real-window-r3.json`, OS search located the added `generated|__native-reload-check__.md` key at 201 notes; after removal, the window showed “No note matches reload-check” at 200 notes. Both runs intentionally mark timing non-comparable because their fixture changed. This completes the synthetic add/remove acceptance step, while the final acceptance synthesis remains open.

The reader command route now also has an OS-versus-replay artifact. The prior OS-input `reader-link-visual-scroll-real-input-r1.json` and new current-binary `reader-os-command-equivalence-replay-r1.json` used the identical committed fixture hash, 1,440 × 900 window and 3440 × 1440 display. `reader-command-equivalence-r1.json` retains both source hashes and the normalized sequence: open note N-00001, open linked N-00002, follow that link and close the reader. The four commands and keys match exactly, both runs placed 200 notes and retained focus, and the replay completed all three declared actions without errors. This directly checks the reader command route; other OS and replay gesture evidence remains separate, so it is not a blanket input-parity verdict.

Under macOS Reduce motion enabled through Settings, `reduced-motion-real-window-r2.json` logged OS opening and closing N-00000, locating quiet N-00004, pulling it and resetting pulls. `reduced-motion-observation-r2.json` records the preference false before, true during and false after, with hashed captures and the restored original setting. The run kept 200/200 placement, focus and the intended display without application errors. The first attempt failed to close the reader and pulled the wrong note; its raw record remains visible. The prototype has no animated scene transitions in either setting, so this verifies that the actions remain available under the OS preference rather than a visible animation difference.

The reader now parses local Markdown links in its body and resolves relative paths against the open note. Keyboard link navigation lists those body links before the fixture's separate outgoing relationships, so it can follow a link a person actually sees. In the compatibility window, `native-compat-reader-link-os-r20.json` records OS pointer input opening `PHASES.md` and OS Enter following its `[docs/README.md](README.md)` link to canonical `your-trainer|README.md`; the new pane shows that note. The run kept focus and recorded no application errors. Rust tests cover relative-link resolution and navigation through the application reader. This narrows the link acceptance gap but does not complete the full TST-0058 walk or establish equal Markdown layout.

## Cancelled, 2026-10-01

Not finished and not going to be: Edwin dropped the native Rust evaluation on 2026-10-01 ([[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]], "Cancelled"). The unticked boxes above stay unticked. The text is kept as the record of what was done; the `prototypes/native-glass/` paths it names were removed by [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]].
