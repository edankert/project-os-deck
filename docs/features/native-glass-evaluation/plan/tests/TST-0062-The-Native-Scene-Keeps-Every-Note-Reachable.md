---
type: "[[test]]"
id: "TST-0062"
title: "The native scene keeps every note reachable"
status: "retired"
owner: "user:edwin"
created: "2026-10-01"
updated: "2026-10-01"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
scope: "feature"
level: "system"
entrypoint: "prototypes/native-glass/src/scene.rs"
kind: "manual"
last_verified: "2026-10-01"
covers: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
issues: []
tasks: ["[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]"]
artifacts: []
adequacy: "The tests reject a deliberately removed placement and a shifted hit-test camera. A forced overlap verifies that hit order agrees with the visible paint order; pointer routing excludes the reader and toolbar clipping areas. The full-fixture variant fails on a missing fixture instead of silently skipping."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]"]
---

# The native scene keeps every note reachable

## Purpose

Check complete placement, stable allocation, locate visibility, camera inversion and hit testing in the uncapped native scene. The executable check always uses the committed 200-note fixture. The same reachability audit can be run explicitly against the retained real and generated fixtures.

## Procedure

1. From the repository root, run `cargo test --locked --manifest-path prototypes/native-glass/Cargo.toml`. It runs the native tests, including the scene and pointer-routing checks on `fixtures/small-200.json`.
2. From `prototypes/native-glass`, set `DECK_NATIVE_SCENE_FIXTURE` to each required ignored fixture and run `cargo test --locked scene::tests::selected_fixture_is_complete_reachable_and_stable -- --exact --nocapture` separately: `local/exports/20260929T1049Z/your-trainer-all-notes.json`, `local/generated-10000-frozen-r2.json`, then `local/generated-50000-frozen-r2.json`. A missing named fixture is an error.
3. Read each output's selected, placed and reachable count and retain it with the fixture's SHA-256 before using it as acceptance evidence.

## Expected results

- Every selected key has exactly one placement. Locate centers it in a 1,440 × 900 camera, the visibility query includes it, the center hit returns that key, and the inverse camera transform returns its center.
- Loading the same fixture again reproduces base positions. Pull and reset restore the original positions. Insert/remove and reload tests keep surviving positions fixed, and switching away and back retains a view's camera and session pull.
- A deliberate missing placement and wrong camera transform fail the focused audit checks. When two cards overlap, hit testing selects the card drawn last.
- The exploratory 50,000-note result is reported separately from the required real and 10,000-note fixtures. This is a headless scene audit, not a rendering or speed result.

## Evidence

On 2026-10-01, `cargo test --locked` passed 71 native checks, including the committed-fixture reachability audit, omission and transform failures, overlap order, clipping, counters, camera/reader stability, view return and fixture reload. The release build's headless 200-note run printed 200 selected, zero rejected, 200 placed, 32 visible and 32 interactable at the starting camera. Explicit reachability runs passed for 3,174/3,174 frozen real notes, 10,000/10,000 generated notes and 50,000/50,000 exploratory notes. Their respective fixture SHA-256 hashes are `485370efadbddd6e64278914cf69b5672f4512d3b6c1ff364871fd251b19816d`, `2c21afea0d3fa58e53c2991990bf88d68af06d2585b72a17e0becf7448f6a6e3` and `0664599301b4d69ff1ac10d820465476712d757c20592e8cc66bac5363cc51a5`. The full-fixture runs took approximately 1.0, 2.4 and 12.0 seconds of test process time respectively; these are not renderer timings. The fixture files remain under ignored `prototypes/native-glass/local/`.

## Adequacy

The former real-export test used an obsolete path and silently returned when that path was absent. The replacement defaults to a committed fixture and fails if an explicitly named full fixture is missing. The omitted-record check removes one of 200 placements and receives `placed 199 of 200 notes`; the transform check shifts the located camera by 1,000 world units and no longer hits the requested key. The forced-overlap check reconciles the scene's visible paint order with reverse hit order. Foreground draw, clipping and delivered input remain the separate [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]] walk.

## Retired, 2026-10-01

The subject is gone. Edwin dropped the native Rust evaluation on 2026-10-01 and [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]] removed the prototype this test exercised, so it can no longer be run. Any result recorded above describes the prototype as it stood and says nothing about Deck.
