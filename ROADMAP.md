# ASCII Visual Engine · Roadmap

Rewritten 2026-09-17 against the code, the tests, and CHANGELOG.md. Checkboxes here are verified, not aspirational. The June draft with its duplicate milestone numbers is kept at `docs/ROADMAP-2026-06-draft.md` for history.

**Where we are.** v0.1.0 shipped 2026-06-28. The local working tree carries unreleased work (demo show chrome, hero preset tuning, preset validation, README rewrite) that is ahead of both the June release and the current live site. GitHub `origin/main` has nine commits the local tree does not (CI, snapshot tests, consumer smoke tests, security policy) and an older demo. The live site is broken.

**Definition of complete for this pass:** the local build is the one true version, committed, deployed, and matching its own README.

---

## Decisions (settled 2026-09-17)

The grill on "simpler, more powerful, more responsive" closed with these. They rank everything below.

| # | Decision | Consequence |
| --- | --- | --- |
| 1 | The engine is a library that powers other apps. Hosts own the UI. The demo is a harness. | Engineering hours go to the API and the engine, not the demo |
| 2 | Simpler means two tiers: a small facade for app authors and nested, all optional presets for look authors. Nothing removed. | Facade = the twelve methods hosts call today (`start stop resize destroy setControl setPresetById setGlyphSet setColor setBassGlyphScale getLevel disableKeyboardInput getScriptEngine`) plus `on` |
| 3 | Flat presets keep working. `validatePreset()` normalizes flat to nested on load. Flat is deprecated at 1.0 | No host preset breaks in 0.3 |
| 4 | Target machine is a laptop driving a screen at 1080p, sometimes 4K. | Retina crispness and 60 fps at 1080p on every hero preset at default density are the bar. WebGL waits until Canvas 2D is measured at 4K |
| 5 | Responsive means, in order: frame rate, then input to visible change under 20 ms, then layout (a demo concern). | |
| 6 | Touch is an input plugin, not a demo feature: `PointerInput`, same shape as `KeyboardInput`, off by default. | |
| 7 | Hosts consume a git tag (`github:nate-thousand/ascii-visual-engine#vX.Y.Z`). Private npm when a third host appears. | The platform monorepo's vendored copy is folded back here and retired |
| 8 | No host drives the feature list. Section 3 follows its own order. | Signal 9 and other apps are separate projects |
| 9 | Sequencing: 0.2.0 consolidates only, 0.3.0 is the API work, 0.4.0 is section 3. | |
| 10 | Git: work on `release/0.2.0`, commit locally. Push and tag only after review. | |

---

## Done

### Engine (v0.1.0, verified in source and tests)

- [x] `AsciiEngine` lifecycle: start, stop, destroy, resize
- [x] Typed `EventBus`; core types (`AsciiPreset`, `GridState`, `NoteEvent`)
- [x] `getDebugState()` introspection
- [x] Plugin architecture: `PluginManager` with effect, pattern, input, renderer, utility types; built in registry
- [x] Patterns: radial symmetry, spiral, wave, grid, cellular, scanline
- [x] Effects: wave, burst, glitch, trails, noise
- [x] Motion system: blendable behaviors with weights and priorities (flow field, organic growth, orbital, breathing, curl noise, more)
- [x] Simulations: particle, boids, cellular automata, reaction diffusion, L-system, gravity, spring, fluid; controls and debug
- [x] Sources: procedural, image, video, webcam, canvas; brightness, edge, contrast mapping
- [x] Renderers: Canvas 2D (working), DOM, offscreen canvas; live switching with grid state preserved; renderer manager
- [x] Compositing: multi layer with blend modes and masks
- [x] Post processing: feedback, smear, displacement, threshold, invert, edge, posterize, scanline, dither
- [x] Audio: Web Audio input, FFT, feature extraction, audio to control and note mapping, attack, release, sensitivity, noise gate controls
- [x] MIDI and input: Web MIDI, MIDI learn, keyboard performance mapping, device presets (generic, Akai, Launchkey, QWERTY)
- [x] Procedural glyph language: categories, semantic roles, morphing, animation; eleven glyph libraries
- [x] Export: PNG, SVG, GIF, ASCII text, JSON scene document; frame recording with scrub and step; scene import via `applySceneDocument()`
- [x] Scripting: safe public `ScriptAPI`; example script gallery; script console in the harness
- [x] Performance: frame profiler, quality presets (ultra, high, medium, low, battery saver) with adaptive mode, object pooling, glyph cache, dirty region rendering, spatial grid for boids
- [x] 30 built in presets across basic, motion, simulation, compositing, audio, performance, and glyph families
- [x] Console warnings for unknown controls, plugins, motions, simulations, presets
- [x] ESM and CJS builds with TypeScript declarations

### Stabilization pass (local, 2026-08 to 2026-09)

- [x] Preset control reset on `setPreset()` fully reinitializes from the preset
- [x] Slider to `setControl()` to effect and pattern context wiring verified
- [x] Trails fade gated on trails plugin enabled state
- [x] Integration tests for the engine plugin pipeline
- [x] **Preset schema validation at load time.** `assertValidPreset()` runs inside `setPreset()`; throws with every structural error listed, warns once per preset on soft issues; `validatePreset()` exported for hosts. Nine tests, every built in preset passes
- [x] Demo show chrome: six hero looks and four sliders up front; full harness behind `Lab`, `D`, or `?debug=1`
- [x] Hero preset tuning: Organic Bloom, Digital Forest, CRT Terminal, Corrupted Broadcast
- [x] README rewritten to describe the engine as it is
- [x] Verified 2026-09-17: typecheck clean, 171 tests, library and demo build, all six looks animate at 60 fps, no console errors, clean at 375px

### Engine state ownership and harness rebuild (2026-09-18, on `release/0.2.0`)

- [x] A pixel source owns the grid: patterns blend by `1 - sourceBlend` instead of overwriting; the source survives `setPreset()`
- [x] Playback owns the grid: live stages skip while a recorded frame is held; step and scrub load the timeline without a play first
- [x] Quality scaling is base relative and re-applied on `setPreset()`; adaptive steps no longer move the base
- [x] `blendWeight` removed (a no-op by construction)
- [x] `listLiveControls(preset)`, `CONTROL_CATALOG`, `liveControlDefs()`, `withLiveControls()`: which controls a composition reads; all 30 presets derive `controls` from it. `tests/live-controls.test.ts` checks the consumer table against `getControl()` calls in the source, every preset's declared set against its live set, and every audio and MIDI mapping target
- [x] Harness rebuilt: eight sections by subsystem, sliders generated per preset, hero group in the preset select, show chrome and WebGL option removed, `?preset=`, `H` to hide. `tests/harness-ids.test.ts` fails on any orphan id in either direction
- [x] 205 tests

### Documentation

- [x] README, BRIEF, ARCHITECTURE, API, PLUGIN_API, PRESET_SCHEMA, SCRIPT_API, SCENE_FORMAT
- [x] Subsystem guides for every module (motion, sources, renderers, simulation, compositing, post processing, audio, MIDI, glyphs, recording, exporting, scripting, performance, optimization, benchmarks)
- [x] CHANGELOG with an Unreleased section for the local work

---

## To build, in order

### 1. Finalize and ship the local build

The only work that turns "local is better" into "the live site is better".

- [x] **Reconcile with GitHub.** `origin/main` has nine commits not here. Keep from GitHub: `.github/workflows/ci.yml`, `SECURITY.md`, `INTEGRATION.md`, `tests/visual-snapshot.test.ts`, `tests/consumer-smoke.test.ts`, `tests/pattern-system.test.ts`, `tests/helpers/mockCanvas.ts`. Keep from local: the demo show chrome (`examples/vanilla/*`), preset tuning, README, BRIEF, this roadmap. Resolve `src/core/validate.ts` and `tests/preset-validation.test.ts` by picking one implementation (GitHub's is older and in CI; local's is stricter and covers optional numeric fields). Done on `release/0.2.0`: local won, GitHub's extra cases merged into one test file, 189 tests pass
- [x] **Fold in the platform's vendored copy.** `plantasonic-platform/packages/visual-engine` (0.1.0 plus edits) adds `setColor()`, `setGlyphSet()`, `setBassGlyphScale()` and small edits in `ExportManager`, `GifExporter`, `SourceManager`, `SourceSampler`, `RendererManager`, `GlyphRegistry`, `ThresholdPass`. Done with `tests/host-controls.test.ts`
- [x] Commit as `0.2.0` on `release/0.2.0` with the CHANGELOG Unreleased section promoted
- [ ] Deploy `dist-demo/` to visual-engine.xyz and confirm the live page is the eight section harness (deferred: local design work first)
- [ ] Tag `v0.2.0` on GitHub

### 2. The API work (0.3.0)

Decisions 2 through 6. Each verifiable in the harness.

- [x] **Facade.** `createEngine(canvas, options)` returning `EngineHandle`: the host methods plus `on`/`off`, `loadSource`/`clearSource`, and `engine` for the rest. Documented in API.md as the recommended entry point; README, BRIEF, INTEGRATION quick starts use it. On `release/0.3.0`, `tests/create-engine.test.ts`, consumer smoke covers it through `dist/`. `getLevel()` reads the engine's own audio amplitude (the roadmap's `getLevel` came from the sound engine's API; hosts that have their own analysis use `setBassGlyphScale`)
- [x] **Nested presets.** Groups `motion`, `pattern`, `simulation`, `post`, `audio`, `input`, `glyphs`, plus top level `plugins`, `controls`, `layers`, `source`, base values; every group optional; `validatePreset()` normalizes flat input and warns once that flat is deprecated at 1.0. All 30 built ins converted; `tests/fixtures/flat-presets.json` holds the 0.2 originals and `tests/preset-shape.test.ts` proves normalize(flat) equals the converted preset and renders identical frames
- [x] **HiDPI.** Canvas and offscreen renderers scale the backing store by `devicePixelRatio` (capped at 2) behind a context transform; grid and draw calls stay in CSS pixels. `pixelRatio` option on the engine and facade, `setPixelRatio`, `getPixelRatio`, re-read on resize. `tests/hidpi.test.ts`
- [x] **`PointerInput` plugin.** Pointer Events on the canvas or any element; normalized position in `getPointerState()` and debug state; press to `noteOn` at that position, release to `noteOff`, per pointer; off by default; registered like `KeyboardInput` through the same queue and mapper. `tests/pointer-input.test.ts`
- [x] **Frame budget.** Measured at 1920x1080, ratios 2 and 1, recorded in BENCHMARKS.md. Three heroes were over (18 to 20 ms); the draw loop now sets `fillStyle` per quantized level instead of per cell and skips the per cell measure, render 12 ms to 3.3 ms, all six at 2.8 to 10.7 ms. No density lowered. Harness has a Run frame budget button
- [x] Engine state: `getState()` is `idle | running | destroyed`, `state` event on every transition, idempotent `start` `stop` `destroy`, `start()` throws after destroy, mutating calls after destroy warn once and are ignored. `tests/engine-state.test.ts`
- [x] Preset loader: `loadPresetFromUrl()` through `validatePreset()`, `parsePreset()`, `presetToJson()`; `exportPreset()` from current engine state with a round trip test; harness Save and Load. `tests/preset-io.test.ts`
- [x] Pattern and effect `params` in the preset schema: `PluginConfig.params`, `ParamStore`, every built in declares its tunables with defaults equal to the old constants, engine and facade get, set, describe; export writes changed params. `tests/plugin-params.test.ts`
- [x] Effect unit tests: `tests/effects-unit.test.ts` drives the five effect classes directly (determinism, ranges, glyph mapping, params, burst lifecycle, glitch rate under a deterministic random ramp, trails decay and fade transform)

### 3. Live performance features (0.4.0)

In this order. No host drives it (decision 8).

- [x] Beat detection with BPM estimate: `BeatDetector` (adaptive onset threshold, interval folding and clustering, confidence, hold and drop); `beat`, `beatPhase`, `beatConfidence`, `bpm` as mappable features. `tests/beat-detection.test.ts`
- [x] MIDI clock (`0xF8`, plus Start, Continue, Stop, Song Position) for tempo synced motion: `MidiClock`, `engine.getTempo()` unifying clock and audio beat, `tempoSync` control on pulse and breathing. `tests/midi-clock.test.ts`
- [x] Deterministic seed for motion, simulations, effects, and glyph animation: `Random` with named streams, `seed` option, `setSeed()`, `fixedTimestep`, seed in scene documents. `tests/determinism.test.ts` proves identical frames for the same seed under irregular clocks
- [x] Preset morphing: `morphTo(preset, { duration, easing, switchAt, exclude })` blends every control the target sets and switches the structure in one step at `switchAt`; host edits during the morph hold; `morph` event and state. `tests/preset-morph.test.ts`
- [x] WebM or MP4 recording via `MediaRecorder`: `VideoRecorder` and `startVideoRecording()` / `stopVideoRecording()`, real time capture of the canvas independent of the timeline recorder, host audio tracks muxed. `tests/video-recording.test.ts`
- [ ] Input recording and playback for rehearsals

### 4. Library hygiene

- [x] Git tag install instructions in README (decision 7), with a `prepare` script so `npm install github:...#tag` builds `dist/`; npm publish under a scope when a third host appears
- [x] Minimal embed example (`examples/embed/index.html`, 19 lines) and a React `useAsciiEngine` hook plus `AsciiCanvas` component (`examples/react/`), typechecked
- [x] TypeDoc API reference: `npm run docs:api` into `docs/api/` (ignored), built in CI
- [x] Coverage floor in CI: `npm run test:coverage`, 77 / 80 / 69 / 77 (statements, branches, functions, lines) as of 2026-09-19

### 5. Later, if ever

- [ ] Real WebGL renderer replacing `WebGLRendererStub` (instanced glyph atlas), shader post processing, GPU compositing
- [ ] Web Worker paths for simulation and grid update
- [ ] Terminal renderer (Node stdout)
- [ ] OSC input
- [ ] Plugin sandboxing and versioning for third party code

---

## Not doing

- A product UI inside the library. Hosts own the shell.
- A timeline or keyframe editor.
- Replacing Canvas 2D as the default path before a WebGL renderer proves faster at real grid sizes.

---

## Version plan

| Version | Contents | Status |
| --- | --- | --- |
| 0.1.0 | Foundation through scripting and performance | Released 2026-06-28 |
| 0.2.0 | Stabilization pass, preset validation, engine state ownership, live control discovery, harness rebuild, GitHub and vendored copy consolidated | Complete on `release/0.2.0` at `12376f6`, untagged |
| 0.3.0 | Section 2: facade, nested presets, HiDPI, PointerInput, frame budget, engine state, preset loader and export, params, effect tests | Section 2 complete on `release/0.3.0`, untagged |
| 0.4.0 | Section 3: beat detection, MIDI clock, seeds, morphing, video recording | In progress on `release/0.3.0` (branch to rename or split at tag time); beat detection, MIDI clock, seeds, morphing, video recording done |
| 1.0.0 | Section 4 plus a stable API and npm | Later |
