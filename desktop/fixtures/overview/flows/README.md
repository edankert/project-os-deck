# Recorded acceptance flows

The six `<workspace>-<flow>.json` files are the inputs to DES-0005's plate script. The shared scene functions read them directly. Images use filenames relative to `docs/designs/__attachments__/DES-0005/`.

The nine payloads in `raw/` were recorded on 2026-10-14 from the read-only builders used by the cockpit's GET routes. `raw/provenance.json` records the source commits. Design and feature reads retain rendered HTML and frontmatter; metadata HTML and backlink HTML are omitted. The release-test CLI payloads were also captured by running `python3 tools/scripts/release-test.py --release REL-0017 --platform <android|ios> --json` in Your Trainer. Nothing in either sibling repository was changed.

The sidecar retains steps that already received a result, so its release-test sections differ from the CLI's remaining work. The sidecar fixtures contain 462 printed steps on Android (433 result-bearing) and 964 on iOS (955 result-bearing). Captures belong to the section's screens; their labels name the source. The selected Android check is in the navigation section and has the workout-selection before and after pair.

Deck uses DES-0004, an empty desktop ring because it has no release, and FEAT-0024 at review. Your Trainer uses DES-0006, REL-0017 and FEAT-0130 at its actual `doing` status. None of Your Trainer's 135 feature notes is at review; that requested fixture state could not be recorded honestly.

`images.json` records the 25 copied sources and filenames. `sips -s format jpeg -s formatOptions 65 -Z 900` reduced each copy; their total is 1,604,537 bytes. The full source images remain in their original repositories. No source image was edited.

The fixtures assert no human verdict. Unknown command results stay unknown, and a model link is not a complete evidence inventory. The pure mapper joins acceptance tier rows to `view` rows to distinguish automation coverage from a dated automated verdict.
