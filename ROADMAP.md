# Roadmap

Milestone-driven development plan for ASCII Visual Engine.

**v0.1.0 MVP shipped** — 2026-06-28. The engine includes foundation through performance optimization (see [CHANGELOG.md](./CHANGELOG.md)). Remaining items below are future milestones.

**Overall project progress: ~75% toward v1.0**

---

## Stabilization Pass — Controls & Effects

**Progress: 90%**

Hardening the existing engine before new architecture work. Ensures presets, sliders, effects, and patterns are wired correctly and visibly verifiable.

- [x] Audit UI → engine → renderer data flow
- [x] Fix preset control reset on `setPreset()` (full reinitialize from preset)
- [x] Verify slider → `setControl()` → effect/pattern context wiring
- [x] Gate trails fade on trails plugin enabled state
- [x] Exaggerate glitch, trails, and burst effect strengths for testing
- [x] Increase pattern blend weight for distinct pattern visuals
- [x] Console warnings for unknown controls, plugins, and presets
- [x] `getDebugState()` API on `AsciiEngine`
- [x] Debug panel in vanilla example (preset, effects, patterns, controls, FPS)
- [x] Manual test buttons: Trigger Burst, Max Glitch, Max Trails, Reset Controls
- [x] Integration tests for engine plugin pipeline
- [x] Automated visual regression snapshots (grid fingerprints)
- [x] Preset JSON schema validation at load time

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

## Milestone 02 — Pattern System

**Progress: 75%**

Reusable procedural pattern layer for flowers, spirals, waves, grids, cellular decay, and scanline visuals.

- [x] Define `Pattern` interface with `initialize`, `update`, `sample`, `destroy`
- [x] Implement `PatternRegistry` with register/unregister/enable/disable
- [x] Add engine API: `registerPattern`, `unregisterPattern`, `enablePattern`, `disablePattern`, `getPattern`
- [x] Integrate pattern sampling into frame loop between motion and post-effects
- [x] Add `RadialSymmetryPattern` for flowers, mandalas, and blooms
- [x] Add `SpiralPattern` for growth and orbiting motion
- [x] Add `WavePattern` for ambient flowing motion
- [x] Add `GridPattern` for structured lattice forms
- [x] Add `CellularPattern` for organic decay and crawling texture
- [x] Add `ScanlinePattern` for terminal and broadcast aesthetics
- [x] Extend preset schema with `patterns` array
- [x] Add pattern controls: symmetry, petals, spiralAmount, cellularAmount, scanlineAmount
- [x] Update built-in presets with pattern configurations
- [x] Update vanilla example with pattern selector and controls
- [ ] Add pattern blending modes (multiply, max, overlay)
- [ ] Support pattern-specific `params` in preset schema
- [ ] Add image/video sampling pattern for ASCII translation
- [x] Create pattern unit tests
- [ ] Add pattern preview/debug overlay

---

## Milestone 03 — Rendering Engine

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

## Milestone 04 — Plugin Architecture

**Progress: 70%**

Unified plugin system for patterns, effects, inputs, and renderers.

- [x] Define `Plugin` base interface with lifecycle hooks
- [x] Implement `PluginManager` class
- [x] Add plugin types: pattern, effect, input, renderer, utility
- [x] Add `engine.registerPlugin(plugin)` API
- [x] Add `engine.unregisterPlugin(id)` API
- [x] Add `engine.enablePlugin(id)` / `engine.disablePlugin(id)` API
- [x] Add `engine.getPlugin(id)` API
- [x] Refactor effects into `EffectPlugin` wrappers (Noise, Wave, Burst, Glitch, Trails)
- [x] Refactor patterns into `PatternPlugin` wrappers (all six patterns)
- [x] Extend preset schema with `plugins` array
- [x] Migrate legacy `effects` / `patterns` preset fields automatically
- [x] Update vanilla example with effect and pattern plugin toggles
- [x] Document plugin API and architecture
- [ ] Support plugin dependency ordering
- [ ] Add plugin sandboxing for third-party code
- [ ] Create example custom plugin in `examples/plugins/`
- [ ] Implement `InputPlugin` concrete adapters
- [ ] Implement `RendererPlugin` for alternate backends
- [ ] Add plugin conflict resolution and versioning
- [ ] Support plugin-provided preset contributions

---

## Milestone 05 — Motion Systems

**Progress: 85%**

Reusable motion engine combining multiple procedural behaviors with weighted blending.

- [x] Define `Motion` interface (`initialize`, `update`, `destroy`)
- [x] Implement `MotionManager` with register/enable/blend/weight/priority
- [x] Reusable `Float32Array` buffers — no per-frame allocations in blend loop
- [x] Integrate motion pipeline into `AsciiEngine` (before patterns/effects)
- [x] Per-cell motion properties: ox, oy, vx, vy, scale, rotation, deformation
- [x] Renderer uses motion offsets for glyph positioning
- [x] Built-in motions: FlowField, OrganicGrowth, Orbital, Wave, Gravity, Brownian, Flocking, Wind, Pulse, Breathing, Spiral, CurlNoise
- [x] Motion controls: speed, strength, randomness, frequency, amplitude, decay, drag, gravity, noiseScale, flowStrength, blendWeight
- [x] Preset `motions` array configuration with weight and priority
- [x] Six example presets: Ambient, Organic, Mechanical, Terminal, Chaotic, Minimal
- [x] Motion debug panel in vanilla example
- [x] Motion system unit tests (8 tests)
- [x] Documentation: [MOTION_SYSTEM.md](./MOTION_SYSTEM.md)
- [ ] Motion field preview/debug overlay on canvas
- [ ] Deterministic seed support for reproducible motion
- [ ] Motion-specific params in preset schema

---

## Milestone 05 — Source Pipeline

**Progress: 90%**

Reusable pipeline for translating external visual sources into ASCII.

- [x] Define `Source` interface with lifecycle hooks
- [x] Implement `SourceManager` with register/unregister/setActive/update/destroy
- [x] Implement `SourceSampler` — brightness, contrast, edge, glyph mapping
- [x] Add `ImageSource` with fit/fill/stretch/center modes
- [x] Add `VideoSource` with play/pause/loop/mute
- [x] Add `WebcamSource` with graceful permission denial
- [x] Add `CanvasSource` for HTMLCanvasElement input
- [x] Integrate source pipeline into `AsciiEngine` frame loop
- [x] Preset optional `source: { type, options }` field
- [x] Source mode selector in vanilla example
- [x] Source debug panel in vanilla example
- [x] Source pipeline unit tests (15 tests)
- [x] Documentation: [SOURCE_PIPELINE.md](./SOURCE_PIPELINE.md)
- [ ] VideoSource transport UI controls in demo
- [ ] Source-specific params in preset schema validation
- [ ] Worker/offscreen capture path for large sources

---

## Milestone 06 — Renderer Pipeline

**Progress: 90%**

Pluggable output backends — renderer agnostic engine architecture.

- [x] Define `Renderer` interface with lifecycle hooks
- [x] Implement `RendererManager` with register/setActive/render/resize/destroy
- [x] Refactor `CanvasRenderer` (legacy `CanvasAsciiRenderer` alias preserved)
- [x] Add `DomRenderer` for `<pre>` / terminal-style text output
- [x] Add `OffscreenCanvasRenderer` with feature detection and canvas fallback
- [x] Add `WebGLRendererStub` — interface only, planned GPU path
- [x] Shared `GridBuffer` for grid state across renderers
- [x] Engine option `renderer: 'canvas' | 'dom' | 'offscreen-canvas' | 'webgl'`
- [x] Live renderer switching with grid state transfer
- [x] Renderer selector + debug panel in vanilla example
- [x] Renderer pipeline unit tests (9 tests)
- [x] Documentation: [RENDERER_PIPELINE.md](./RENDERER_PIPELINE.md)
- [ ] Full WebGL/GPU renderer implementation
- [ ] Terminal renderer plugin
- [ ] Worker-based offscreen rendering path
- [ ] Renderer-specific capability flags in preset schema

---

## Milestone 07 — Simulation Engine

**Progress: 90%**

Emergent behavior systems that drive ASCII visuals independently from rendering.

- [x] Define `Simulation` interface with lifecycle hooks
- [x] Implement `SimulationManager` with register/enable/update/destroy
- [x] `ParticleSimulation` — spawn rate, lifespan, velocity, glyph assignment
- [x] `BoidsSimulation` — alignment, cohesion, separation, predator mode
- [x] `CellularAutomataSimulation` — custom rules, growth, decay, regeneration
- [x] `ReactionDiffusionSimulation` — Gray-Scott patterns
- [x] `LSystemSimulation` — grammar rules, branching, growth
- [x] `GravitySimulation` — wells, attractors, repulsors, orbits
- [x] `SpringSimulation` — mass-spring network, cloth-like motion
- [x] `FluidSimulation` — simple velocity field for smoke/fog
- [x] Integrate simulation pipeline into `AsciiEngine` frame loop
- [x] Preset `simulations[]` configuration
- [x] Simulation controls and debug panel in vanilla example
- [x] Object pooling and pre-allocated buffers
- [x] Simulation system unit tests (15 tests)
- [x] Documentation: [SIMULATION_ENGINE.md](./SIMULATION_ENGINE.md)
- [ ] Simulation-specific params in preset schema validation
- [ ] Web Worker simulation backends
- [ ] Simulation blending modes

---

---

## Milestone 08 — Visual Compositing & Post Processing

**Progress: 95%**

Layer compositing and CPU post processing before final render.

- [x] `Layer` — per-layer source, pattern, simulation, glyph set, opacity, blend mode, mask
- [x] `LayerManager` — add/remove/enable/disable/reorder/get/renderLayers
- [x] Blend modes: normal, add, multiply, screen, difference, max, min, overlay
- [x] Masks: radial, linear, noise, brightness
- [x] `PostProcessor` — nine passes (feedback, smear, displacement, threshold, invert, edge, posterize, scanline, dither)
- [x] Preset `layers[]` and `postProcessing[]` fields
- [x] Compositing Demo preset
- [x] Engine integration in frame loop (after effects, before render)
- [x] Compositing + post debug state in `getDebugState()`
- [x] Vanilla example: layer panel, post toggles, blend selector, reset composition
- [x] Compositing system unit tests (13 tests)
- [x] Documentation: [COMPOSITING.md](./COMPOSITING.md), [POST_PROCESSING.md](./POST_PROCESSING.md)
- [ ] Per-layer effect plugins
- [ ] Layer groups and nested compositing
- [ ] GPU compositing path (WebGL)

---

## Milestone 08 — Visual Effects

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

## Milestone 07 — Preset System

**Progress: 55%**

Declarative visual configuration format and management.

- [x] Define `AsciiPreset` schema with all core fields
- [x] Create `basic`, `terminal`, and `organic` built-in presets
- [x] Implement `setPreset(preset)` with effect pipeline rebuild
- [x] Implement `getPreset()` accessor
- [x] Add `listPresets()` and `getPreset(id)` helpers
- [x] Extend preset schema with `patterns` array and pattern control defaults
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

## Milestone 08 — Input Layer

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

## Milestone 09 — Audio Reactivity

**Progress: 95%**

Real-time audio analysis mapped to visual parameters.

- [x] `AudioInput` — microphone, HTMLAudioElement, MediaStream, external AnalyserNode
- [x] `AudioAnalyzer` — FFT and time-domain sampling
- [x] `AudioFeatureExtractor` — amplitude, bands, centroid, transients, beat
- [x] `AudioReactiveMapper` — controls, layer opacity, post passes, noteOn
- [x] Smoothing: attack, release, sensitivity, noise gate, min/max clamp
- [x] Engine API: connectAudio, disconnectAudio, setAudioMapping, getAudioFeatures
- [x] Preset `audioMapping` configuration
- [x] Five audio-reactive presets
- [x] Vanilla example: mic button, audio file, meters, mapping controls
- [x] Audio system unit tests
- [x] Documentation: [AUDIO_REACTIVITY.md](./AUDIO_REACTIVITY.md)
- [ ] Beat detection with BPM estimation
- [ ] Pitch/note frequency mapping
- [x] MIDI input layer (Milestone 10)

---

## Milestone 10 — MIDI & Performance Controls

**Progress: 100%**

Web MIDI, computer keyboard, and performance mapping for playing the engine like an instrument.

- [x] Web MIDI API: device detection, connect/disconnect
- [x] `MidiInput` — noteOn, noteOff, controlChange, pitchBend, aftertouch
- [x] `KeyboardInput` — QWERTY piano layout, octave shift, velocity fallback, stuck-note prevention
- [x] `PerformanceMapper` — notes → bursts, CC → controls, mod wheel, pitch bend, layers, plugins, presets
- [x] MIDI learn mode with localStorage persistence
- [x] Engine API: connectMidi, disconnectMidi, setInputMapping, inputPanic, and more
- [x] Device presets: Akai MPK Mini, Novation Launchkey, Generic MIDI, QWERTY
- [x] Four performance presets
- [x] Vanilla example: MIDI selector, learn mode, mapping table, note monitor, panic button
- [x] Input system unit tests
- [x] Documentation: [MIDI_AND_INPUT.md](./MIDI_AND_INPUT.md)
- [ ] MIDI clock for tempo-synced motion
- [ ] OSC input adapter

---

## Milestone 11 — Procedural Glyph Language

**Progress: 100%**

Intelligent glyph system with categories, semantic roles, morphing, and animation.

- [x] `Glyph` interface — id, character, category, weight, density, orientation, symmetry, animation rules
- [x] 11 built-in category libraries (organic, terminal, noise, geometric, etc.)
- [x] Semantic roles — seed, branch, leaf, flower, glitch, particle, explosion, and more
- [x] `GlyphClassifier` — role assignment from brightness, velocity, burst, noise, audio, simulation
- [x] `GlyphGenerator` — procedural glyph field generation
- [x] `GlyphMorpher` — smooth character evolution chains
- [x] `GlyphAnimator` — breathing, cycling, growth, erosion, bloom, corruption
- [x] `GlyphComposer` — combine multiple glyph languages
- [x] `GlyphRegistry` — registerGlyphSet, registerGlyphCategory, registerGlyphLanguage, enable/disable
- [x] Preset fields: glyphLanguage, glyphCategories, glyphRules, glyphMorphing, glyphAnimation
- [x] Eight glyph-language presets
- [x] Glyph Inspector in vanilla demo
- [x] GlyphAtlas caching for performance
- [x] Glyph system unit tests
- [x] Documentation: [GLYPH_LANGUAGE.md](./GLYPH_LANGUAGE.md), [GLYPH_LIBRARY.md](./GLYPH_LIBRARY.md), [GLYPH_AUTHORING.md](./GLYPH_AUTHORING.md)

---

## Milestone 12 — Recording & Export

**Progress: 100%**

Capture, replay, and export ASCII visuals in multiple formats.

- [x] `ExportManager`, `FrameRecorder`, `AnimationRecorder`, `ScreenshotExporter`
- [x] PNG screenshot with retina, transparency, clipboard copy
- [x] SVG vector export with glyph layout
- [x] ASCII plain text export (plain, ANSI, Unicode)
- [x] JSON scene export/import with full engine state
- [x] Animated GIF export from recorded frames
- [x] Numbered PNG frame sequence export
- [x] `RecordingSession`, `PlaybackSession`, `TimelineRecorder`
- [x] Recording: start, pause, resume, stop, cancel
- [x] Playback: scrub, step, loop, speed control
- [x] Engine API: exportPNG, exportSVG, exportGIF, exportJSON, exportASCII, startRecording, playRecording
- [x] Export & Recording panel in vanilla demo
- [x] Export system unit tests
- [x] Documentation: [EXPORTING.md](./EXPORTING.md), [RECORDING.md](./RECORDING.md), [SCENE_FORMAT.md](./SCENE_FORMAT.md)
- [ ] WebM/MP4 video recording via MediaRecorder
- [ ] PDF export
- [ ] Record MIDI/control automation timeline alongside visuals

---

## Milestone 13 — Scripting API

**Progress: 100%** ✅

Safe public scripting layer for creative coding and installations without modifying engine internals.

- [x] `ScriptEngine`, `ScriptContext`, `ScriptAPI`, `ScriptLoader`, `ScriptRunner`, `ScriptRegistry`
- [x] Public `ScriptAPI` facade — presets, controls, plugins, motions, simulations, layers, glyphs
- [x] Event hooks: frame, tick, noteOn, noteOff, control, audio, input, resize, preset, simulation
- [x] `createPreset()` — procedural preset authoring
- [x] `spawnParticles()`, `animateControl()`, scene composition helpers
- [x] Live reload, enable/disable, restart in development
- [x] Script console in vanilla demo (run, stop, logs, variable inspect)
- [x] Example gallery (`examples/scripts/`) — 13 scripts
- [x] Scripting unit tests
- [x] Documentation: [SCRIPTING.md](./SCRIPTING.md), [SCRIPT_API.md](./SCRIPT_API.md), [EXAMPLES.md](./EXAMPLES.md)
- [ ] JavaScript/TypeScript sandbox with isolated eval (future — current model uses registered modules)
- [ ] Script recording from live performance
- [ ] CLI runner for headless export
- [ ] OSC bridge for external control

**Next milestone: [Milestone 16 — GPU Rendering & WebGL](#milestone-16--gpu-rendering--webgl)**

---

## Milestone 14 — Performance Optimization

**Progress: 100%** ✅

CPU-first performance optimization for high frame rates and scalability.

- [x] `PerformanceManager`, `FrameProfiler`, `MemoryProfiler`, `ObjectPool`, `GlyphCache`
- [x] `SpatialGrid`, `DirtyRegionTracker`, `WorkerManager`
- [x] Per-phase frame profiling (script → render)
- [x] Quality presets: Ultra, High, Medium, Low, Battery Saver
- [x] Adaptive density when FPS below target
- [x] Grid cell object pooling
- [x] Glyph measureText cache
- [x] Dirty region partial canvas updates
- [x] Spatial grid for boids neighbor queries
- [x] Optional Web Worker offload
- [x] Performance debug panel + FPS graph in vanilla demo
- [x] Automated benchmark suite
- [x] Documentation: [PERFORMANCE.md](./PERFORMANCE.md), [BENCHMARKS.md](./BENCHMARKS.md), [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)
- [ ] Web Worker simulation offload (future)
- [ ] Move grid update to Web Worker (future)

**Next milestone: [Milestone 16 — GPU Rendering & WebGL](#milestone-16--gpu-rendering--webgl)**

---

## Milestone 16 — GPU Rendering & WebGL

**Progress: 0%** — **Next milestone**

WebGL renderer, shader pipeline, and GPU-accelerated glyph rendering research.

- [ ] Implement WebGL renderer (replace stub)
- [ ] GPU glyph atlas texture
- [ ] Shader-based post-processing
- [ ] Benchmark GPU vs CPU paths
- [ ] Document GPU rendering setup

---

## Milestone 14 — Touch & Gestures

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

## Milestone 15 — Performance Optimization

**Progress: 100%** ✅ — See [Milestone 14 — Performance Optimization](#milestone-14--performance-optimization) (renumbered in v0.14 release)

---

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

## Milestone 16 — GPU Rendering Research

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

## Milestone 17 — Shader Pipeline

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

## Milestone 18 — Examples

**Progress: 25%**

Reference integrations demonstrating engine capabilities.

- [x] Vanilla browser example with preset selector and controls
- [x] Pattern selector and pattern intensity controls in vanilla example
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

## Milestone 19 — Documentation

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

## Milestone 20 — Testing

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

## Milestone 21 — NPM Publishing

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

## Milestone 22 — Version 1.0

**Progress: 0%**

Stable public API with long-term support guarantees.

- [ ] Complete plugin architecture (Milestone 04)
- [ ] Complete preset system (Milestone 07)
- [ ] Complete pattern system (Milestone 02)
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
| 0.2.0 | Pattern system, pattern controls, preset patterns | Released |
| 0.3.0 | Plugin architecture, plugin presets | In progress |
| 0.4.0 | Performance, React hook, examples | Planned |
| 0.5.0 | GPU research, shader pipeline | Planned |
| 1.0.0 | Stable API, npm, tests, full docs | Planned |

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
