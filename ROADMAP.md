# Roadmap

Milestone-driven development plan for ASCII Visual Engine.

Each milestone contains concrete, checkable tasks. Completion percentages reflect work done as of **v0.1.0**. Unfinished work is never marked complete.

**Overall project progress: ~12%**

---

## Milestone 01 — Foundation

**Progress: 85%**

Core engine scaffolding, types, build tooling, and project structure.

- [x] Initialize TypeScript project with Vite
- [x] Define core type system (`AsciiPreset`, `NoteEvent`, `Effect`, etc.)
- [x] Implement `AsciiEngine` class with constructor options
- [x] Implement engine lifecycle: `start()`, `stop()`, `destroy()`
- [x] Implement `resize(width, height)`
- [x] Set up ESM + CJS library build with declaration files
- [x] Create public barrel export (`src/index.ts`)
- [x] Configure `npm run dev`, `build`, and `typecheck` scripts
- [x] Add `.gitignore` and package metadata
- [ ] Extract engine configuration into dedicated config module
- [ ] Add engine state enum (idle, running, destroyed)
- [ ] Implement engine options validation with helpful errors
- [ ] Add debug mode with verbose logging
- [ ] Create internal utility module for shared math helpers

---

## Milestone 02 — Rendering Engine

**Progress: 55%**

Canvas-based ASCII grid renderer and renderer abstraction groundwork.

- [x] Implement `CanvasAsciiRenderer`
- [x] Create character grid from canvas dimensions and density
- [x] Support dynamic resize with grid rebuild
- [x] Support density changes at runtime
- [x] Render glyphs with brightness-based alpha
- [x] Implement `requestAnimationFrame` driven frame loop in engine
- [x] Expose `getGridState(time)` for effect access
- [ ] Define formal `AsciiRenderer` interface
- [ ] Decouple engine from concrete `CanvasAsciiRenderer`
- [ ] Support configurable font family and size strategy
- [ ] Support foreground and background color from presets
- [ ] Add terminal/DOM renderer prototype
- [ ] Add offscreen canvas rendering path
- [ ] Implement renderer capability detection
- [ ] Add renderer-specific performance metrics
- [ ] Support HiDPI / devicePixelRatio scaling

---

## Milestone 03 — Plugin Architecture

**Progress: 10%**

Formal plugin system for registering custom effects, render hooks, and extensions.

- [x] Define `Effect` interface with `update`, `onNoteOn`, `onNoteOff`, `reset`
- [ ] Implement `PluginManager` class
- [ ] Define `Plugin` base interface with lifecycle hooks
- [ ] Add `engine.registerPlugin(plugin)` API
- [ ] Add `engine.unregisterPlugin(id)` API
- [ ] Support plugin dependency ordering
- [ ] Support plugin enable/disable at runtime
- [ ] Add plugin metadata (id, name, version, author)
- [ ] Implement plugin initialization and teardown lifecycle
- [ ] Add plugin sandboxing for third-party code
- [ ] Create example custom plugin in `examples/plugins/`
- [ ] Document plugin discovery and lazy loading
- [ ] Add plugin conflict resolution (duplicate type registration)
- [ ] Support plugin-provided preset contributions
- [ ] Add plugin event subscription API

---

## Milestone 04 — Motion Systems

**Progress: 40%**

Field generators that drive glyph selection and spatial animation.

- [x] Implement `NoiseField` — organic sine-product motion
- [x] Implement `WaveField` — sine wave glyph animation
- [x] Wire motion field selection via preset `motionField` property
- [ ] Implement proper simplex/perlin noise generator
- [ ] Add `FlowField` — directional vector field motion
- [ ] Add `RadialField` — center-outward ripple motion
- [ ] Add `ScrollField` — directional scrolling marquee
- [ ] Support motion field blending between two fields
- [ ] Expose motion field parameters via preset `params`
- [ ] Add motion field preview/debug visualization
- [ ] Support time-scaled and spatially-scaled motion independently
- [ ] Add deterministic seed support for reproducible motion
- [ ] Create motion field unit tests

---

## Milestone 05 — Visual Effects

**Progress: 45%**

Post-motion visual modifiers applied per frame.

- [x] Implement `GlyphBurst` — radial burst on `noteOn`
- [x] Implement `Glitch` — random glyph corruption
- [x] Implement `Trails` — frame fade for motion persistence
- [x] Wire effect pipeline from preset `effects` array
- [x] Support effect enable/disable per preset
- [ ] Implement effect `params` configuration from presets
- [ ] Add `ColorShift` — hue/brightness cycling effect
- [ ] Add `Ripple` — sustained concentric wave from note
- [ ] Add `Dissolve` — character scatter and reform
- [ ] Add `Mirror` — horizontal/vertical grid symmetry
- [ ] Support effect ordering and compositing rules
- [ ] Add effect intensity master control
- [ ] Create effect combination presets (effect chains)
- [ ] Add effect unit tests

---

## Milestone 06 — Preset System

**Progress: 50%**

Declarative visual configuration format and management.

- [x] Define `AsciiPreset` schema with all core fields
- [x] Create `basic`, `terminal`, and `organic` built-in presets
- [x] Implement `setPreset(preset)` with effect pipeline rebuild
- [x] Implement `getPreset()` accessor
- [x] Add `listPresets()` and `getPreset(id)` helpers
- [x] Define `ControlDef` schema for UI metadata
- [ ] Implement preset JSON loader from URL or file
- [ ] Add preset validation utility with error messages
- [ ] Support preset interpolation / morphing
- [ ] Add preset export from current engine state
- [ ] Support preset inheritance (base + override)
- [ ] Add preset versioning field
- [ ] Create preset authoring CLI tool
- [ ] Add preset hot-reload in development mode
- [ ] Document preset migration between schema versions

---

## Milestone 07 — Input Layer

**Progress: 0%**

Unified input abstraction for routing external signals to engine events.

- [ ] Define `InputAdapter` interface
- [ ] Implement keyboard input adapter (note triggers, controls)
- [ ] Implement mouse/touch position to normalized coordinates
- [ ] Add input event mapping configuration
- [ ] Support input debouncing and rate limiting
- [ ] Route input events through engine event bus
- [ ] Add input recording and playback for rehearsals
- [ ] Support multi-pointer input
- [ ] Create input debug overlay
- [ ] Document input adapter plugin pattern

---

## Milestone 08 — Audio Reactivity

**Progress: 0%**

Utilities for mapping audio analysis data to visual parameters.

- [ ] Define `AudioAnalyzer` interface
- [ ] Create FFT bin to control mapping utility
- [ ] Map amplitude envelope to burst intensity
- [ ] Map frequency bands to glyph set index
- [ ] Support beat detection trigger to `noteOn`
- [ ] Add smoothing and attack/release for audio-driven controls
- [ ] Create audio-reactive example
- [ ] Document Web Audio API integration pattern
- [ ] Keep audio utilities as optional peer dependency
- [ ] Add performance guidelines for audio-visual sync

---

## Milestone 09 — MIDI Integration

**Progress: 0%**

MIDI input adapter for note-driven visuals.

- [ ] Evaluate Web MIDI API compatibility
- [ ] Implement `MidiInputAdapter`
- [ ] Map MIDI note number to `noteOn` / `noteOff`
- [ ] Map MIDI CC to engine controls
- [ ] Support MIDI channel filtering
- [ ] Add MIDI learn mode for control assignment
- [ ] Create MIDI example with virtual keyboard fallback
- [ ] Document MIDI note-to-visual mapping conventions
- [ ] Support MIDI clock for tempo-synced motion

---

## Milestone 10 — Touch & Gestures

**Progress: 0%**

Multi-touch and gesture recognition for interactive installations.

- [ ] Implement touch position tracking
- [ ] Map pinch gesture to density control
- [ ] Map swipe gesture to speed control
- [ ] Support multi-touch simultaneous bursts
- [ ] Add gesture configuration in presets
- [ ] Create touch-optimized example for tablets
- [ ] Document kiosk and installation touch setup
- [ ] Add palm rejection configuration

---

## Milestone 11 — Performance Optimization

**Progress: 5%**

Profiling, adaptive quality, and render path optimization.

- [x] Cap delta time to prevent spiral-of-death on tab switch
- [ ] Add frame time profiling and reporting
- [ ] Implement adaptive density based on FPS target
- [ ] Batch canvas fillText calls where possible
- [ ] Cache glyph measurements and font metrics
- [ ] Support render skipping for off-screen canvases
- [ ] Move grid update to Web Worker
- [ ] Implement object pooling for grid cells
- [ ] Add performance budget configuration
- [ ] Create performance benchmark suite
- [ ] Document performance tuning guide

---

## Milestone 12 — GPU Rendering Research

**Progress: 0%**

Investigate WebGL and compute-based ASCII rendering.

- [ ] Research glyph atlas rendering in WebGL
- [ ] Prototype instanced quad renderer for characters
- [ ] Benchmark GPU vs Canvas 2D at various grid sizes
- [ ] Evaluate texture-based character lookup
- [ ] Prototype compute shader grid update
- [ ] Document GPU renderer architecture proposal
- [ ] Define GPU renderer feature parity checklist
- [ ] Assess fallback strategy when WebGL unavailable

---

## Milestone 13 — Shader Pipeline

**Progress: 0%**

Post-processing and shader-based visual effects.

- [ ] Design shader effect interface
- [ ] Implement CRT scanline post-processing shader
- [ ] Implement bloom/glow post-processing shader
- [ ] Implement chromatic aberration shader
- [ ] Support shader parameter binding to engine controls
- [ ] Add shader hot-reload for development
- [ ] Create shader effect example
- [ ] Document GLSL contribution guidelines

---

## Milestone 14 — Examples

**Progress: 15%**

Reference integrations demonstrating engine capabilities.

- [x] Vanilla browser example with preset selector and controls
- [x] Burst trigger buttons and keyboard shortcut (Space)
- [ ] React example with `useAsciiEngine` hook
- [ ] Node.js terminal example (headless or stdout)
- [ ] Audio-reactive example
- [ ] MIDI-controlled example
- [ ] Multi-canvas example (dual display)
- [ ] Installation/kiosk example with touch
- [ ] Data visualization example (stream to grid)
- [ ] Minimal embed example (< 20 lines of integration code)
- [ ] Example preset pack with 10+ community presets

---

## Milestone 15 — Documentation

**Progress: 70%**

Professional open-source documentation for developers and contributors.

- [x] Rewrite README with project overview and philosophy
- [x] Create ROADMAP with milestone checkboxes
- [x] Create ARCHITECTURE with system diagrams
- [x] Create API reference for all public classes
- [x] Create PLUGIN_API guide for extension authors
- [x] Create PRESET_SCHEMA with full examples
- [x] Create CONTRIBUTING guidelines
- [x] Initialize CHANGELOG with semver
- [x] Add LICENSE (MIT)
- [ ] Generate API docs from TypeScript source (TypeDoc)
- [ ] Add inline JSDoc to all public methods
- [ ] Create quick-start tutorial (5-minute integration)
- [ ] Add troubleshooting and FAQ section
- [ ] Create documentation website (VitePress or similar)
- [ ] Add architecture decision records (ADRs)

---

## Milestone 16 — Testing

**Progress: 0%**

Automated test coverage for core systems.

- [ ] Set up test runner (Vitest)
- [ ] Unit tests for `EventBus`
- [ ] Unit tests for effect modules
- [ ] Unit tests for preset validation
- [ ] Integration test for engine lifecycle
- [ ] Snapshot tests for grid state after N frames
- [ ] Visual regression tests for renderer output
- [ ] CI pipeline running tests on push
- [ ] Code coverage reporting and thresholds
- [ ] Performance regression test baseline

---

## Milestone 17 — NPM Publishing

**Progress: 0%**

Package distribution and release automation.

- [ ] Configure npm package scope and name
- [ ] Add pre-publish build verification script
- [ ] Set up GitHub Actions release workflow
- [ ] Configure semantic-release or manual version bumping
- [ ] Add package size monitoring
- [ ] Publish v0.1.0 to npm
- [ ] Add npm badge and install instructions to README
- [ ] Create release notes template
- [ ] Document breaking change policy

---

## Milestone 18 — Version 1.0

**Progress: 0%**

Stable public API with long-term support guarantees.

- [ ] Complete plugin architecture (Milestone 03)
- [ ] Complete preset system (Milestone 06)
- [ ] At least two renderer backends (Canvas + one other)
- [ ] Comprehensive test suite with >80% coverage
- [ ] Full API documentation with examples
- [ ] At least five reference examples
- [ ] npm package published and stable
- [ ] Migration guide from 0.x to 1.0
- [ ] Performance benchmarks published
- [ ] Security audit of public API surface
- [ ] 1.0 release announcement and changelog
- [ ] Define LTS and support policy

---

## Version History

| Version | Milestone focus | Status |
| --- | --- | --- |
| 0.1.0 | Foundation, rendering, effects, presets, docs | Released |
| 0.2.0 | Plugin architecture, preset validation | Planned |
| 0.3.0 | Input layer, audio reactivity | Planned |
| 0.4.0 | Performance, React hook, examples | Planned |
| 0.5.0 | GPU research, shader pipeline | Planned |
| 1.0.0 | Stable API, npm, tests, full docs | Planned |

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
