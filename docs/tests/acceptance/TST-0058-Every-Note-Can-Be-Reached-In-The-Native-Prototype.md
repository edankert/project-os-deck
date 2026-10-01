---
type: "[[test]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
scope: "feature"
entrypoint: ""
last_verified: ""
covers: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
issues: []
artifacts: []
adequacy: "Partial OS-input diagnostics exist; the complete acceptance walk has not been run."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: []
id: "TST-0058"
title: "Every note can be reached in the native prototype"
status: "retired"
level: "acceptance"
tasks: ["[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]", "[[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]", "[[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]"]
area: "Native Glass evaluation"
after: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Every note can be reached in the native prototype

## Purpose

Walk the complete native field and representative reader with real input. Every valid selected note must retain an identity, a stable place and a route into view.

## Setup

Build and run the prototype from the repository root with the commands in [its README](../../../prototypes/native-glass/README.md). For the committed functional fixture, run `prototypes/native-glass/target/release/deck-native-glass --fixture prototypes/native-glass/fixtures/small-200.json --metrics prototypes/native-glass/local/runs/acceptance-small.json`. For the largest real-workspace walk, substitute its exported all-notes fixture. Use a second `--view-fixture` argument to exercise view switching. Real fixture paths and run outputs stay under ignored `prototypes/native-glass/local/`.

Use Edwin's current Mac Studio and the frozen largest real-workspace fixture from [BENCHMARK.md](../../features/native-glass-evaluation/plan/BENCHMARK.md). Run the prototype's `tools/examples.mjs` against that fixture and its production adapter to freeze the keys used for active, quiet, capacity-excluded, long-body, linked and duplicate-displayed-ID notes without changing the fixture. Its output identifies a missing category as `null`; use the generated fixture for the right-to-left example absent from the current real export. Keep the native window in front. Record the build, fixture, machine and display settings. Start with no session pulls or reader open, and record source workspace status and content hashes.

## Steps

1. Open the fixture and inspect its selected, rejected and placed counts.
2. Search for the manifest's distant note beyond the current Deck's capacity, then activate Locate.
3. Zoom out until that note is drawn at its smallest representation, then hover it and click it.
4. Close the reader, locate a quiet note and pull it forward using the pointer gesture.
5. Switch to another fixture view and back, then locate the pulled note again.
6. Reset session pulls and locate the note at its base place.
7. Use the keyboard to focus search, locate the quiet note and invoke its pull action.
8. Open the long-body note and scroll its reader while the field remains visible.
9. Follow a local note link in the reader, then close the reader with Escape.
10. Type a title containing shortcut characters into search, then leave search and use the documented field zoom keys.
11. Zoom with the pointer over a known card and inspect whether its anchor stays under the pointer. Shift-drag through an occupied card and confirm that the field pans without opening or pulling that card.
12. Turn on reduced motion and repeat note opening, pull and reset.
13. Inspect the manifest's long-title, Unicode and right-to-left examples at readable scale.
14. Search for the duplicate displayed ID and open each distinct workspace/path result.
15. Prepare the synthetic add/remove files with `node prototypes/native-glass/tools/reload-fixture.mjs prepare prototypes/native-glass/fixtures/small-200.json prototypes/native-glass/local/reload-walk` from the repository root. Open `local/reload-walk/active.json` as the fixture. Run `node prototypes/native-glass/tools/reload-fixture.mjs set prototypes/native-glass/local/reload-walk added`, press U in the native window, locate `RELOAD-CHECK` and compare surviving note positions. Run the same `set` command with `removed`, press U again and confirm the synthetic note is absent while survivors stay fixed. Use a fresh local directory if the named one exists.
16. Compare source workspace content hashes and status with the starting record, then retain the captures and run identity.

## Expect

- The loaded valid fixture has equal selected and placed counts. Invalid input fails loading with an explanation; it is not silently discarded to produce a successful partial run. No valid record is omitted because a band is full.
- Locate makes each requested note visible. Hover and selection work even before a tiny note gains detailed drawing.
- Pull gives the note one active representation with a visible session marker. It remains pulled across a view switch and returns predictably on reset.
- Unrelated base positions stay fixed during camera motion, opening/closing the reader, view return and adding/removing another note.
- The reader contains real headings, paragraphs, lists, emphasis, code, a table and local links. Its long body scrolls without zooming the field.
- Search input keeps keyboard focus. Field shortcuts operate only in the appropriate context, and Escape performs the documented close/cancel action.
- Zoom keeps its pointer anchor. Reduced motion suppresses transitions if the prototype has any; when actions are already immediate, opening, pulling and resetting still work with the setting enabled.
- Text remains readable and clipped correctly. Unsupported reader constructs and missing selection/copy are explicitly recorded, with selection/copy absence flagged for migration.
- Duplicate displayed IDs open different records, identified by workspace and relative path.
- Source workspace files remain unchanged.

## Not this check

- Numerical performance and workload comparability belong to [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]] and the benchmark report.
- This walk does not prove complete Markdown, screen-reader, browser/tablet, multiwindow or production write parity.
- This is an isolated prototype walk. It does not close existing production Glass checks or issues.

## Evidence

Partial diagnostics have exercised OS-delivered keyboard view switching, pointer click, drag, field wheel and reader wheel. Their ignored raw records are `local/runs/real-input-small-r2.json`, `real-pointer-click-r4.json` and `real-reader-wheel.json`; see [EVIDENCE.md](../../features/native-glass-evaluation/plan/EVIDENCE.md). The reload unit tests cover surviving places, reader identity, content refresh and changed-view rejection. A real-window U-key run recorded 200→201→200 notes, and a capture shows the added-note state. Separate real-window records show reader wheel scrolling, Tab/Enter following a local link and Escape closing the pane. `duplicate-search-real-window-r3.json` records 23 exact `PLAN` displayed-ID matches and opens two distinct canonical paths through OS-delivered search and N cycling. The `omitted-note-real-input-r1.json` and `omitted-front-real-input-r1.json` runs locate and open two notes absent from production Glass's placed set, including an owed front-band test. `tiny-quiet-real-input-r1.json` records a pointer click opening a quiet note after twelve zoom-out keystrokes; the before/after captures show its tiny tile and open reader. `pull-view-real-input-r1.json` records pointer pull, view return, reset and keyboard pull with captures. A real 280,999-byte body opened and scrolled by visual distance in `long-reader-visual-scroll-r2.json`. `first-middle-last-real-input-r1.json` opened the first, middle and last real keys, a long-title note and a Unicode-title note. `rtl-generated-real-input-r1.json` opened the generated Arabic-title example; `reader-link-visual-scroll-real-input-r1.json` rechecked local-link follow and Escape on the current reader build. These runs retained their full selected populations, foreground focus and the intended display. A later reader capture shows styled headings, emphasis and code; table cells remain linear text. The focused records below add the survivor-position, reduced-motion and frozen source-hash checks; an aggregate acceptance verdict is still owed. The live Your Trainer docs have changed since the frozen export; the frozen copy still matches its recorded hash. Native arbitrary-range text selection and screen-reader parity remain migration gaps. No acceptance verdict is claimed.

An 18th Rust unit check now verifies that Shift-drag over a card pans without opening or pulling it. `shift-drag-real-input-r1.json` records an OS-delivered Shift-drag as a pan command with 200/200 notes, no focus loss and no errors; the particular drag origin was not visually confirmed as occupied. The new 10,000-note reader trace first failed because its four candidate pan origins were occupied; after Shift-drag routing, the same 20-second trace completed and followed its named local link. The failed run is retained. The later focused real-window check below covers the occupied-card part of step 11.

The focused `occupied-shift-anchor-real-window-r1.json` check found that the OS driver posted a Shift key event but its mouse press arrived without a Shift modifier, so a centred card was pulled. After `tools/real-input.swift` set Shift on each mouse event, `occupied-shift-anchor-real-window-r2.json` recorded a `pan` and a `zoom_field` command, no pull/open, 200/200 placement, no focus loss, no visibility loss and no application errors on the 3440 × 1440 monitor. The before/after PNGs under `local/runs/occupied-shift-{before,after}-r2.png` show the occupied card moving with the field. `occupied-anchor-after-r3.png` shows that an OS wheel event reduced card scale while the pointer still lay on that card; the camera inverse unit test checks the exact anchor transform. This completes the occupied-card part of step 11 and provides a visual pointer check, while the aggregate acceptance verdict remains open. The frozen real source tree was separately re-audited after this diagnostic, with all 3,174 selected bodies matching its recorded hash.

`search-shortcuts-real-window-r1.json` completes the step 10 input-routing check: OS input displayed `P+R` in search without a pull, reset or zoom command; after Escape, the field `+` key produced one zoom and a larger card in `search-shortcuts-zoom-r1.png`. The run retained focus, 200/200 placement and the pinned display. Attempting to enable the macOS reduced-motion preference with `defaults write com.apple.universalaccess reduceMotion -bool true` failed with “Could not write domain”; no setting was changed. The current prototype has no scene transitions to suppress, and the later Settings UI run below provides that observation.

Step 15 now has a complete synthetic real-window walk. `reload-survivors-real-window-r2.json` records OS U-key reloads from 200→201→200 notes. Its before, added and removed PNG captures have identical pixels in the 1,440 × 858 field rectangle below the status bar, demonstrating that visible surviving cards stayed fixed. `reload-locate-real-window-r3.json` then records OS search locating the new canonical `generated|__native-reload-check__.md` key at 201 notes. After a second U-key reload, its capture shows 200 notes and “No note matches reload-check”. Both runs kept the target monitor, focus and visibility; each intentionally records a timing-incomparable reload error. These acceptance records are not scored performance data.

`reader-command-equivalence-r1.json` reconciles a prior OS-input reader run with a current replay on the same committed fixture, 1,440 × 900 window and pinned display. Both command logs open N-00001, open the linked N-00002, record `follow_link` to N-00002 and close the reader in the same order with the same keys. The replay delivered 3/3 actions with no errors; both runs kept 200/200 placement and focus. This is direct reader-command evidence alongside the unit check for normalized open, scroll, link and close routing; it does not replace the remaining real-window acceptance steps.

Step 12 now has a foreground run with the macOS setting actually enabled. `reduced-motion-observation-r2.json` hashes the Settings and native captures, records `NSWorkspace.shared.accessibilityDisplayShouldReduceMotion` as false before, true during and false after, and records the restored original state. Under Reduce motion, `reduced-motion-real-window-r2.json` logged opening and closing N-00000, locating quiet N-00004, pulling it and resetting session pulls. Its captures show the reader opening, the quiet card leaving its base slot on pull and returning on reset. The run retained 200/200 placement, the pinned display, focus and visibility, with no application errors. The first attempt, `reduced-motion-real-window-r1.json`, did not close the reader and pulled the wrong note, so it is retained as a failed acceptance attempt. This prototype has no animated scene transitions in either setting; the check proves actions remain available under the OS preference, not a visible transition difference.

The final read-only fixture audit rechecked the frozen Your Trainer source after the current native runs: its 3,196 indexed Markdown files still hash to `71f0aeb990d6f8569fde2f756c88c50b9ed0466aa1e47d8a70ebc4257e6382c6`, and all 3,174 selected reader bodies still match the export. This checks step 16 against the actual frozen source used by the walk. The live sibling workspace has advanced independently since export, so its current Git status is not a substitute for the frozen source-tree comparison.

## Adequacy

Executable scene/input checks must detect a dropped record, an incorrect transform and an incorrectly routed reader wheel event. The walk adds evidence from real event delivery and visible content; state-only tests cannot replace it.

## Retired, 2026-10-01

The subject is gone. Edwin dropped the native Rust evaluation on 2026-10-01 and [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]] removed the prototype this test exercised, so it can no longer be run. Any result recorded above describes the prototype as it stood and says nothing about Deck.
