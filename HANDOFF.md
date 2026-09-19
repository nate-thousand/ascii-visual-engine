# ASCII Visual Engine · Handoff

Written 2026-09-17 when engine development moved out of the portfolio chat into its own session. Updated 2026-09-18 after the engine state fixes and the harness rebuild.

## Where things stand

- `release/0.2.0` is complete at `12376f6` (eight commits ahead of `origin/main`); tag `v0.2.0` there when the user says so. Nothing pushed, nothing tagged, nothing deployed.
- `release/0.3.0` branches from it and carries the 0.3.0 API work; `package.json` says 0.3.0. Done so far: `createEngine()` facade, nested presets (with flat normalization and a fixture backed compatibility test), HiDPI, `PointerInput`, frame budget (with a draw loop fix that took render from 12 ms to 3.3 ms at 1080p), engine state, preset export and loader, plugin params, effect unit tests, section 4 hygiene (git tag install with `prepare`, embed and React examples, TypeDoc, coverage floor in CI).
- 0.2.0 is the consolidation release: local stabilization work + GitHub main (CI, snapshot and smoke tests, SECURITY, INTEGRATION) + the platform monorepo's vendored additions (`setColor`, `setGlyphSet`, `setBassGlyphScale`, GIF export options, source strength, softened threshold).
- 2026-09-18: engine state ownership fixed (source, playback, quality scaling own the grid or their base values; `blendWeight` removed), `listLiveControls()` added, glyph presets derive their controls, demo rebuilt as an eight section harness. See the CHANGELOG 0.2.0 section and ROADMAP "Engine state ownership and harness rebuild".
- Verified: typecheck clean (library and demo), 205 tests, `npm run build` and `npm run build:demo` succeed, no console errors, panel clean at 375px, canvas source visible under pattern presets, playback holds a frame, quality scaling survives preset switches.
- Dev server: `npm run dev -- --port 5192 --strictPort` (the portfolio's `.claude/launch.json` has this as `ascii-engine`).

## Decisions

Settled in a grill on 2026-09-17 and recorded at the top of `ROADMAP.md`. Short form: engine for host apps, hosts own UI, demo is a harness; two tier API (facade + nested presets, nothing removed); laptop to 1080p screen at 60 fps is the bar; `PointerInput` as a plugin; hosts pin git tags; no host drives the feature list; 0.2.0 consolidates, 0.3.0 is the API work, 0.4.0 is live performance features; commit locally, push and tag only after review.

## Harness design (settled in a grill 2026-09-18)

Harness only, hosts own UI. Eight sections by subsystem. Preset sliders generated from `preset.controls` filtered by `listLiveControls()`; density and speed always shown. Hero group at the top of one preset select. Composition toggles under Preset. One `getDebugState()` readout per section. No persistence beyond `?preset=`. `tests/harness-ids.test.ts` guards against orphan ids. Layers editor and WebGL option removed.

## Next actions, in order

1. Keep working the local design until the user says push. All 30 presets now derive `controls` from their composition (`withLiveControls()`); the harness's "declared but unread" note only fires for host authored presets.
2. When the user says so: `git push -u origin release/0.2.0`, PR or merge to main, `git tag v0.2.0`, push the tag. Then deploy `dist-demo/` (hosting unknown; ask).
3. Roadmap sections 2 and 4 are complete; section 3 / 0.4.0 is complete on the same branch (beat detection, MIDI clock, deterministic seeds, preset morphing, video recording, input recording). The 0.3.0 and 0.4.0 work are both unreleased on `release/0.3.0`; decide at tag time whether 0.3.0 gets its own tag at `46801ad` (section 4 hygiene) with 0.4.0 continuing after, or everything ships together. Note: `npm ci` runs the `prepare` build unless `--ignore-scripts`; CI uses that flag.

## Related

- The platform monorepo still has `plantasonic-platform/packages/visual-engine`. Retiring it in favour of the tag is a platform change, not this repo's.
- The portfolio (`portfolio-2.0/work/ascii-engine.html`) has a case study for this engine; keep its numbers (tests, presets, version) in step with releases.
