# ASCII Visual Engine · Handoff

Written 2026-09-17 when engine development moved out of the portfolio chat into its own session. Updated 2026-09-18 after the engine state fixes and the harness rebuild.

## Where things stand

- Branch `release/0.2.0`, seven commits ahead of `origin/main`, working tree clean. Nothing pushed, nothing tagged, nothing deployed. The user has said: local design work until they say otherwise.
- 0.2.0 is the consolidation release: local stabilization work + GitHub main (CI, snapshot and smoke tests, SECURITY, INTEGRATION) + the platform monorepo's vendored additions (`setColor`, `setGlyphSet`, `setBassGlyphScale`, GIF export options, source strength, softened threshold).
- 2026-09-18: engine state ownership fixed (source, playback, quality scaling own the grid or their base values; `blendWeight` removed), `listLiveControls()` added, glyph presets derive their controls, demo rebuilt as an eight section harness. See the CHANGELOG 0.2.0 section and ROADMAP "Engine state ownership and harness rebuild".
- Verified: typecheck clean (library and demo), 203 tests, `npm run build` and `npm run build:demo` succeed, no console errors, panel clean at 375px, canvas source visible under pattern presets, playback holds a frame, quality scaling survives preset switches.
- Dev server: `npm run dev -- --port 5192 --strictPort` (the portfolio's `.claude/launch.json` has this as `ascii-engine`).

## Decisions

Settled in a grill on 2026-09-17 and recorded at the top of `ROADMAP.md`. Short form: engine for host apps, hosts own UI, demo is a harness; two tier API (facade + nested presets, nothing removed); laptop to 1080p screen at 60 fps is the bar; `PointerInput` as a plugin; hosts pin git tags; no host drives the feature list; 0.2.0 consolidates, 0.3.0 is the API work, 0.4.0 is live performance features; commit locally, push and tag only after review.

## Harness design (settled in a grill 2026-09-18)

Harness only, hosts own UI. Eight sections by subsystem. Preset sliders generated from `preset.controls` filtered by `listLiveControls()`; density and speed always shown. Hero group at the top of one preset select. Composition toggles under Preset. One `getDebugState()` readout per section. No persistence beyond `?preset=`. `tests/harness-ids.test.ts` guards against orphan ids. Layers editor and WebGL option removed.

## Next actions, in order

1. Keep working the local design until the user says push. Candidate next items: the 22 non glyph presets still declare `motionControlDefs` wholesale; the harness hides the unread ones and prints a note, but deriving their `controls` with `liveControlDefs()` the way the glyph presets do would remove the note.
2. When the user says so: `git push -u origin release/0.2.0`, PR or merge to main, `git tag v0.2.0`, push the tag. Then deploy `dist-demo/` (hosting unknown; ask).
3. Start 0.3.0 from `ROADMAP.md` section 2: facade `createEngine()`, nested presets with flat normalization, HiDPI, `PointerInput`, frame budget in BENCHMARKS.md.

## Related

- The platform monorepo still has `plantasonic-platform/packages/visual-engine`. Retiring it in favour of the tag is a platform change, not this repo's.
- The portfolio (`portfolio-2.0/work/ascii-engine.html`) has a case study for this engine; keep its numbers (tests, presets, version) in step with releases.
