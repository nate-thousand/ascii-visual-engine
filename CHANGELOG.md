# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Preset schema validation at load time. `setPreset()` now throws with every structural problem listed (missing or mistyped `id`, `name`, `glyphSet`, `motionField`, `plugins`, `controls`, required numbers; bad control ranges; NaN values) and warns once per preset id on soft issues (out-of-range defaults, unknown control names). `validatePreset()` and `assertValidPreset()` are exported for hosts that load presets from JSON.
- Demo show chrome: six hero presets and four sliders up front, full harness behind Lab, `D`, or `?debug=1`.
- Host controls folded in from the platform's vendored copy: `setColor()`, `setGlyphSet()` (direct glyph override, bypasses the glyph language), `setBassGlyphScale()` (smoothed per glyph scale pulse from a bass level). Covered by `tests/host-controls.test.ts`.
- `GifExportOptions.width`, `height`, `filename`; GIF export waits up to 8 s for recorded frame blobs instead of failing on frames still encoding. `encodeGif`, `exportGifFromCanvases`, `captureCanvasBlob`, `downloadBlob` exported from the package root.
- Source `strength` control passed through `SourceSampler`.
- Validation also rejects unknown legacy `patterns` ids and names the preset in its error message; the constructor asserts the initial preset.
- From GitHub main: GitHub Actions CI, visual snapshot tests, consumer smoke test against `dist/`, `SECURITY.md`, `INTEGRATION.md`, `npm run test:all`.

### Changed

- Hero preset tuning (Organic Bloom, Digital Forest, CRT Terminal, Corrupted Broadcast speed, trail, and glitch defaults).
- README rewritten around what the engine is today: Canvas 2D, host-owned UI, WebGL stub.
- `ThresholdPass` decodes through a smoothstep with a small softness band (0.04) bounded to 0.25 to 0.75 instead of a hard cut.

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
