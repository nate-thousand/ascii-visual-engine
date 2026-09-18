# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased (0.3.0)

The API release. See ROADMAP.md section 2.

### Changed

- **Nested presets.** `AsciiPreset` groups its fields: `motion` (field, behaviors, motion knobs), `pattern`, `simulation` (behaviors, sim knobs), `post` (passes, post knobs), `audio` (mapping, analyzer knobs), `input`, `glyphs` (language, categories, rules, morphing, animation), plus top level `plugins`, `controls`, `layers`, `source`, and the four base values. Every group is optional; `{ id, name, glyphSet }` is a valid preset. A numeric field inside a group is the default for the control of the same name. `controls` is derived from the composition when absent. All 30 built ins are authored in the nested shape; the 0.2 flat versions are kept in `tests/fixtures/flat-presets.json` and `tests/preset-shape.test.ts` proves each normalizes to its nested form and renders the same frames.
- The flat shape still works everywhere a preset is accepted (`setPreset`, the constructor, `createEngine`, scene import). `validatePreset()` normalizes flat input, warns once per preset id that flat is deprecated at 1.0, and returns the nested preset. `assertValidPreset()` now returns the normalized preset. Legacy `effects`, `patterns`, and `motionField` are folded into `plugins` and `motion` by normalization instead of by each subsystem resolver.
- `GlyphRegistry.applyPresetConfig()` and `resolvePresetGlyphSet()` take `{ glyphSet, glyphs }`. The preset resolvers (`resolvePresetMotions`, `resolvePresetSimulations`, `resolvePresetPostProcessing`, `resolvePresetAudioMapping`, `resolvePresetInputMapping`, `resolvePresetPlugins`) read the nested groups.
- `ScriptAPI.createPreset()` returns a nested preset; its option names are unchanged.
- PRESET_SCHEMA.md rewritten for the nested shape with a flat to nested table; the 0.2 reference moved to `docs/PRESET_SCHEMA-0.2-flat.md`. Subsystem docs updated.

### Added

- `normalizePreset`, `flattenPreset`, `isFlatPreset`, `getPresetValue`, `presetControlValues`, `CONTROL_GROUP`, `BASE_DEFAULTS`; types `FlatPreset`, `PresetInput`, `PresetMotionConfig`, `PresetPatternConfig`, `PresetSimulationConfig`, `PresetPostConfig`, `PresetAudioConfig`, `PresetGlyphsConfig`.
- `createEngine(canvas, options)`: the host facade. Returns an `EngineHandle` with `start stop resize destroy`, `setPreset(preset | id)`, `setPresetById`, `getPreset`, `setControl`, `getControl`, `setGlyphSet`, `setColor`, `setBassGlyphScale`, `getLevel`, `loadSource`, `clearSource`, `enableKeyboardInput`, `disableKeyboardInput`, `getScriptEngine`, `on`, `off`, and `engine` (the underlying `AsciiEngine`). Options: `preset` (object or built in id), `width`, `height`, `autoStart`, `element`, `renderer`. Documented in API.md as the recommended entry point; README, BRIEF, and INTEGRATION quick starts use it. `AsciiEngine` is unchanged.

## Version 0.2.0 — 2026-09-17

Consolidation release: the local stabilization work, GitHub main, and the platform's vendored copy brought together on one branch.

### Added

- Preset schema validation at load time. `setPreset()` now throws with every structural problem listed (missing or mistyped `id`, `name`, `glyphSet`, `motionField`, `plugins`, `controls`, required numbers; bad control ranges; NaN values) and warns once per preset id on soft issues (out-of-range defaults, unknown control names). `validatePreset()` and `assertValidPreset()` are exported for hosts that load presets from JSON.
- Demo show chrome: six hero presets and four sliders up front, full harness behind Lab, `D`, or `?debug=1`.
- Host controls folded in from the platform's vendored copy: `setColor()`, `setGlyphSet()` (direct glyph override, bypasses the glyph language), `setBassGlyphScale()` (smoothed per glyph scale pulse from a bass level). Covered by `tests/host-controls.test.ts`.
- `GifExportOptions.width`, `height`, `filename`; GIF export waits up to 8 s for recorded frame blobs instead of failing on frames still encoding. `encodeGif`, `exportGifFromCanvases`, `captureCanvasBlob`, `downloadBlob` exported from the package root.
- Source `strength` control passed through `SourceSampler`.
- Validation also rejects unknown legacy `patterns` ids and names the preset in its error message; the constructor asserts the initial preset.
- From GitHub main: GitHub Actions CI, visual snapshot tests, consumer smoke test against `dist/`, `SECURITY.md`, `INTEGRATION.md`, `npm run test:all`.
- `listLiveControls(preset)`: the control names a preset's motions, patterns, effects, simulations, post passes, and audio mapping actually read. `CONTROL_CONSUMERS` is the table behind it, checked against the source by `tests/live-controls.test.ts`. `CONTROL_CATALOG` and `liveControlDefs()` give ranges and labels for every engine control. Hosts can intersect `preset.controls` with this to show only sliders that do something.
- `PlaybackStatus.active` and `engine.isPlaybackActive()`.
- `npm run typecheck` also checks `examples/vanilla` against `src/`.

### Changed

- Hero preset tuning (Organic Bloom, Digital Forest, CRT Terminal, Corrupted Broadcast speed, trail, and glitch defaults).
- README rewritten around what the engine is today: Canvas 2D, host-owned UI, WebGL stub.
- `ThresholdPass` decodes through a smoothstep with a small softness band (0.04) bounded to 0.25 to 0.75 instead of a hard cut.
- A pixel source (image, video, webcam, canvas) now owns the grid. Patterns no longer overwrite it: `sourceBlend` is the source's share of cell brightness (1 = source only, patterns skipped; 0 = pattern only; between = per cell mix). Before this, every pattern preset blended the source down to 10%, so video and webcam looked like nothing happened.
- The active source is engine state. `setPreset()` leaves it alone unless the preset declares `source`; switching looks keeps a running webcam.
- Recording playback owns the grid while active. The live source, motion, simulation, plugin, post, and glyph stages are skipped until `stopPlayback()`, so played, paused, stepped, and scrubbed frames are actually visible. `PlaybackStatus.active` and `engine.isPlaybackActive()` expose this. A playback frame that reaches the end now holds its last frame instead of releasing the grid.
- Every built in preset derives `controls` through `withLiveControls()`: the sliders a preset offers are exactly the controls its motions, patterns, effects, simulations, post passes, layers, and audio mapping read. An author declared range still wins for a live control. `motionControlDefs` is gone. A test asserts declared and live sets match for all 30 presets, and that every audio and MIDI mapping target is live.
- Presets whose mappings wrote into controls nothing read were fixed: Audio Bass, Voice, and Full Spectrum map to `amplitude` instead of `strength` (their flow field reads amplitude); Audio Bass and Full Spectrum gain the glitch effect so their glitch mappings work; the performance presets gain a low weight breathing motion so the device presets' strength knob works, and Akai gains feedback and smear passes for knobs 7 and 8.
- `stepPlayback()` and `scrubPlayback()` load the recorded timeline if nothing is loaded yet, so stepping works straight after a recording.
- Demo rebuilt as a harness: eight collapsible sections by subsystem (Preset, Source, Renderer, Audio, Input, Export, Performance, Scripting), preset sliders generated from `preset.controls` filtered by `listLiveControls()`, hero group at the top of one preset select, composition toggles under Preset, a `getDebugState()` readout per section, `?preset=<id>`, `H` hides the panel. Show chrome, the Lab toggle, the WebGL option, the layer editor, and the hand written motion, pattern, post, and sim sliders are gone. `tests/harness-ids.test.ts` fails on an id present in only one of `index.html` and `main.ts`.
- Quality preset scaling is relative to a base density, trail amount, and spawn rate captured from the preset and from host `setControl()` calls. Re-selecting a quality no longer compounds, adaptive quality steps no longer move the base, and `setPreset()` re-applies the current quality scaling once a quality preset has been chosen.

### Removed

- `blendWeight` control. It multiplied every motion weight and the blend then normalized by the total, so it could not change the output. Presets that still set it get the usual unknown control warning.

## Version 0.1.0 — 2026-06-28

Initial MVP Release.

### Foundation

- `AsciiEngine` lifecycle: start, stop, destroy, resize
- Typed `EventBus` and core type system (`AsciiPreset`, `GridState`, `NoteEvent`)
- ESM + CJS library build with TypeScript declarations
- Vanilla browser demo with fullscreen canvas rendering

### Pattern System

- Built-in patterns: radial symmetry, spiral, wave, grid, cellular, scanline
- Pattern plugin registration and preset configuration

### Plugin Architecture

- `PluginManager` with effect, pattern, input, and renderer plugin types
- Built-in effects: wave, burst, glitch, trails, noise

### Motion System

- Blendable motion behaviors: flow field, organic growth, orbital, breathing, curl noise, and more
- Motion weights, priorities, and preset configuration

### Simulation Engine

- Particle, boids, cellular automata, reaction diffusion, L-system, gravity, spring, fluid simulations
- Simulation controls and debug introspection

### Source Pipeline

- Procedural, image, video, webcam, and canvas sources
- Brightness, edge, and contrast mapping to glyphs

### Renderer Pipeline

- Canvas 2D, DOM, and offscreen canvas renderers
- Live renderer switching with grid state preservation
- WebGL renderer stub (planned implementation in a future milestone)

### Visual Compositing

- Multi-layer compositing with blend modes and masks
- Post-processing passes: feedback, smear, threshold, dither, and more

### Audio Reactivity

- Web Audio input, FFT analysis, feature extraction
- Audio-reactive control and note mapping

### MIDI Support

- Web MIDI input, keyboard performance mapping, MIDI learn
- Device presets and performance control routing

### Procedural Glyph Language

- Glyph categories, semantic roles, morphing, and animation
- Eleven built-in glyph libraries and eight glyph presets

### Recording & Export

- PNG, SVG, GIF, ASCII, and JSON scene export
- Frame recording and playback with scrub/step controls

### Scripting API

- Safe public `ScriptAPI` for presets, controls, simulations, layers, and events
- Example script gallery and script console in the demo

### Performance Optimization

- Frame profiler, quality presets, object pooling, glyph cache
- Dirty region rendering and spatial grid for boids

### Bug Fixes

- Preset control reset on `setPreset()` fully reinitializes controls
- Trails fade gated on trails plugin enabled state
- Glyph preset input mapping preserved through preset load
- Export and scripting debug state integrated into `getDebugState()`

### Documentation

- README, ARCHITECTURE, API, PLUGIN_API, PRESET_SCHEMA
- Subsystem guides: motion, source, renderer, simulation, compositing, audio, MIDI, glyphs, export, scripting, performance
- ROADMAP with milestone tracking

### Plantasonic Ready

- Importable as `ascii-visual-engine` with full TypeScript definitions
- Vercel-deployable static demo
- Integration examples for external projects

[0.1.0]: https://github.com/nate-thousand/ascii-visual-engine/releases/tag/v0.1.0
