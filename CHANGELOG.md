# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version 0.4.1 (2026-09-25)

Hardening after the first host report, plus the harness About page.

### Fixed

- **NaN no longer blanks the canvas.** A NaN in any cell's brightness or burst reached `buckets[NaN].push` in the canvas draw loop, which threw every frame and left the canvas black while the engine still reported running at 60 fps. Reported from the Plantasonic reference app on its two glitch-heavy worlds about two seconds in. Four layers now stop it: `setControl()`, `setBassGlyphScale()`, and `noteOn()` ignore non finite numbers and warn once per name (`warnNonFinite`); the burst effect guards its own note input; the canvas bucket treats a NaN cell as dark; and the reaction diffusion simulation, which was the one built in preset that produced NaN on its own (its explicit Euler step was past the stability limit and the fields diverged within seconds), now uses the standard 3x3 Gray-Scott kernel at a unit step with clamped fields, so its look has changed. `tests/nan-guard.test.ts` runs every built in preset for four seconds with bursts and checks every cell stays finite.

### Added

- **Harness About page.** An info button in the panel header (or `?`) opens a dialog with what the engine is, what it does, and how to use the harness, with the version and the git tag install line. `Esc`, Close, or a click outside closes it; `H` and `Space` are held while it is open.

## Version 0.4.0 (2026-09-20)

Live performance features, plus logos and type as sources. See ROADMAP.md section 3.

### Added

- **Logos and type as sources.** `TextSource` (`loadSource('text', { text, font, weight, size, align, lineHeight, letterSpacing, padding })`) rasterizes type at the grid's own pixel size, `size: 'fit'` by default, with `setText()`, `setOptions()`, and `getLayout()`; `layoutText()` is exported and pure. `ImageSource` accepts SVG files, `.svg` URLs, and `{ svg }` inline markup: the markup is sized before rasterizing (`sizeSvgMarkup`, `svgSize` option, default longest side 1024) so files without `width`/`height` draw, cross origin reads report an error instead of throwing, and pixels are read once per load rather than per frame. Sampling is alpha aware (transparent is background) with a `sourceInvert` control for dark artwork on a transparent ground. New `sourceMask` mode: every procedural stage runs, then the source is applied as a shape mask at the end of the frame, cells below `sourceThreshold` dimmed by `sourceBlend` and blanked at 1, so a logo or wordmark becomes a window onto the look instead of a grey ramp. `getDebugState().source.applyMode`. **Sub cell anti aliasing**: with `sourceSmooth` (default on) each cell averages the source over its whole footprint through a summed area table (`SourceSampler.areaBrightness`, `mapNormalizedToSourceF`), so strokes thinner than a cell keep their share of brightness instead of being hit or missed, and mask edges fade over a quarter of brightness below the threshold; 0 restores nearest pixel sampling. The table is built once per still image or text raster and once per frame for live sources. Harness Source section gains a Text mode (text, font family, weight) and Invert, Mask, Mask threshold, and Smooth controls; the image picker accepts `.svg`. `tests/logo-and-type.test.ts`.
- **Input recording and playback.** `startInputRecording()`, `stopInputRecording(name?)` (returns the take and loads it), `cancelInputRecording()`, `playInputRecording(take?, { loop, speed })`, `pauseInputPlayback()`, `resumeInputPlayback()`, `stopInputPlayback()`, `seekInputPlayback(s)`, `loadInputRecording()`, `getInputRecording()`, `getInputRecordingStatus()`, `getInputPlaybackStatus()` on the engine and input manager; record, stop, play, stop playback, and both statuses on the facade. `InputRecorder` stamps every event the mapper receives with its offset on the engine clock; `InputPlayer` replays a take per frame through the same mapper as live input, with `replayed: true` on the events so a playing take is not re-recorded, and releases held notes at the end, at a loop wrap, on stop, and on seek. `InputRecording` is plain JSON (`serializeInputRecording`, `parseInputRecording` with validation). A take made under `fixedTimestep` replays frame for frame; with the same seed the frames match, proven by `tests/input-recording.test.ts`. `InputDebugState` gains `recording` and `playback`. Harness Input section gets take controls, save and load.
- **Video recording.** `startVideoRecording(options)`, `pauseVideoRecording()`, `resumeVideoRecording()`, `stopVideoRecording({ download? })`, `cancelVideoRecording()`, `getVideoRecordingStatus()` on the engine and the export manager; `startVideoRecording`, `stopVideoRecording`, `getVideoRecordingStatus` on the facade. `VideoRecorder` captures the canvas with `captureStream()` and encodes it through `MediaRecorder` in real time, independent of the timeline recorder: VP9 or VP8 WebM where the browser has it, MP4 on Safari, or an explicit `mimeType`; `frameRate`, `videoBitsPerSecond`, host `audioTracks` to mux (left running afterwards), `maxSeconds`, `filename`. Unsupported browsers, the DOM renderer, and tainted canvases come back as `{ ok: false, error }`. Status is `{ state, supported, mimeType, duration, bytes }`, also in `getDebugState().export.video`. The recorder takes `MediaRecorder` and `captureStream` replacements so it is tested without a browser. `exportMP4()` and `exportWebM()` placeholders removed; `FUTURE_EXPORT_FORMATS` is now `['pdf']`. Harness Export section gets Record video, Stop and save, Discard, and a status line. `tests/video-recording.test.ts`.
- **Preset morphing.** `engine.morphTo(preset | id, { duration, easing, switchAt, exclude })` (and the facade's) blends every control the target sets from its current value to the target value over `duration` seconds along `easing` (`linear`, `easeIn`, `easeOut`, `easeInOut`, or a function), and switches the structure (plugins, motions, simulations, passes, layers, glyph set, mappings) in one step at `switchAt` (default halfway). Source and performance controls are engine state and are not blended. A control the host sets during the morph leaves the blend and keeps its value through the switch, as do `exclude`d ones; `setPreset()`, another `morphTo()`, `cancelMorph()`, and `destroy()` cancel it. Resolves `true` at the end, `false` when cancelled. `getMorphState()` and `getDebugState().morph` give `{ active, from, to, progress, eased, switched, duration }`; `morph` event at start, switch, and end. `PresetMorph` is exported for hosts that want the blend without the engine. Under a fixed timestep a morph is deterministic. Harness: the Preset section's morph seconds select makes the preset select blend instead of cut; the readout shows progress. `tests/preset-morph.test.ts`.
- **Deterministic seeds.** `Random` (mulberry32 with named forks) replaces every `Math.random()` in the engine's visual path: glitch, burst placement, brownian motion, particle spawns, boids, cellular automata, reaction diffusion, glyph animation. `AsciiEngineOptions.seed` and `CreateEngineOptions.seed` (number or string; fresh per engine when absent), `engine.getRandom(name)` for plugins, `setSeed()` (reseeds every stream in place and resets simulations and effects), `getSeed()`. `fixedTimestep` option and `setFixedTimestep(fps | null)` make `dt` constant so the same seed and preset replay a look frame for frame; verified by tests with irregular clocks. Scene documents carry `seed` and restore it on import. `Effect` gains optional `initialize(engine)`. Debug state and the harness Performance section show the seed and timestep, with a reseed field and a fixed timestep select.
- **MIDI clock.** `MidiClock` reads Timing Clock (24 per quarter note), Start, Continue, Stop, and Song Position Pointer from the connected device; `MidiInput` routes every status byte at or above `0xF0` to it. `getState(now)` gives `{ active, running, bpm, beat, phase, ticks }` with the phase interpolated between ticks. `engine.getTempo()` (and the facade's) is the one tempo the engine acts on: MIDI clock when active, else the audio beat detector, else `NO_TEMPO`; `TempoState` is `{ source, bpm, phase, barPhase, beat, confidence }`. Motions get it as `context.tempo`; new `tempoSync` control (motion group, default 0) blends `PulseMotion` (one cycle per beat) and `BreathingMotion` (one breath per bar) toward it; `tempoAngle()` helper. `getDebugState().input.clock` and `getDebugState().tempo`; harness Input and Preset readouts show them. `BeatState` gains a `beat` count so the audio tempo has a bar phase. `tests/midi-clock.test.ts`.
- **Beat detection with a tempo estimate.** `BeatDetector` replaces the fixed threshold bass gate in the feature extractor: an adaptive energy threshold over a one second window finds onsets, the intervals between the last 16 are folded into 60 to 200 BPM and clustered for a tempo, and confidence is the share that agree. New audio features `beatPhase` (0 to 1 sawtooth to the next predicted beat), `beatConfidence`, and `bpm`; `beat` is now a time based pulse instead of a per frame decay. All four are mappable; `bpm` maps as 0 to 1 over 60 to 200 (`normalizeBpm`, `BPM_MAP_RANGE`). The estimate holds through dropped kicks, fades when onsets stop, drops after four seconds of silence, and is frame rate independent. `extractor.getBeatDetector()`, `BeatDetector` and its options exported. Harness Audio readout shows tempo, confidence, and phase. `tests/beat-detection.test.ts`.

### Fixed

- Adaptive quality stepped density down to 95% on the first frame of every fresh engine and every preset change: the profiler had no history, reported fps 0, and the manager read that as a stall. It now waits 60 frames after construction or a preset change and ignores an fps of 0. Hosts with adaptive on saw every look start slightly under its declared density.
- Source fit modes compared the image's aspect ratio with the grid's cell count, as if cells were square; cells are 1.6 times taller than wide, so every image, video, and webcam frame drew 1.6 times too tall. Fit now uses the grid's pixel size. The last grid column and row also sampled one pixel past the image and came out blank; they now sample the image's edge.
- Every device input event was mapped twice: once as it arrived through the device's message handler and again when the frame drained the device queue. A key press therefore fired two bursts and every CC wrote its control twice. Events now go through `InputManager.dispatch()` once; the per frame `processQueuedEvents(dt, now)` drains device queues without redispatching and delivers replayed events.

### Changed

- Built in preset names lost their family prefix: `Glyph — Organic Bloom` is `Organic Bloom`, `Audio — Bass Reactive` is `Bass Reactive`, `Performance — Akai MPK Mini` is `Akai MPK Mini`, and so on for the glyph, audio, and performance families. Ids are unchanged; the id already carries the family. Hosts that matched on `preset.name` need the new strings.
- Harness Renderer select offers Canvas 2D and DOM text only. `offscreen-canvas` stays available through `renderer` and `setActiveRenderer()`; it buys nothing over `canvas` until rendering moves to a worker.
- `setPreset()` no longer resets source and performance control values (`sourceBlend`, `sourceContrast`, `sourceEdge`, `fpsTarget`, `perfQuality`, `adaptiveQuality`, `dirtyRendering`, `spatialGrid`, `workerOffload`) to their defaults: they are engine state, and their managers were never reset, so `getControl()` disagreed with what the engine was doing. The values set before the switch are kept.
- `GridBuffer.setDensity()` skips the rebuild when the new density lands on the same column count, so a morph step or an adaptive quality nudge no longer clears every cell.

## Version 0.3.0 (2026-09-18)

The API release. See ROADMAP.md section 2.

### Changed

- **Nested presets.** `AsciiPreset` groups its fields: `motion` (field, behaviors, motion knobs), `pattern`, `simulation` (behaviors, sim knobs), `post` (passes, post knobs), `audio` (mapping, analyzer knobs), `input`, `glyphs` (language, categories, rules, morphing, animation), plus top level `plugins`, `controls`, `layers`, `source`, and the four base values. Every group is optional; `{ id, name, glyphSet }` is a valid preset. A numeric field inside a group is the default for the control of the same name. `controls` is derived from the composition when absent. All 30 built ins are authored in the nested shape; the 0.2 flat versions are kept in `tests/fixtures/flat-presets.json` and `tests/preset-shape.test.ts` proves each normalizes to its nested form and renders the same frames.
- The flat shape still works everywhere a preset is accepted (`setPreset`, the constructor, `createEngine`, scene import). `validatePreset()` normalizes flat input, warns once per preset id that flat is deprecated at 1.0, and returns the nested preset. `assertValidPreset()` now returns the normalized preset. Legacy `effects`, `patterns`, and `motionField` are folded into `plugins` and `motion` by normalization instead of by each subsystem resolver.
- `GlyphRegistry.applyPresetConfig()` and `resolvePresetGlyphSet()` take `{ glyphSet, glyphs }`. The preset resolvers (`resolvePresetMotions`, `resolvePresetSimulations`, `resolvePresetPostProcessing`, `resolvePresetAudioMapping`, `resolvePresetInputMapping`, `resolvePresetPlugins`) read the nested groups.
- `ScriptAPI.createPreset()` returns a nested preset; its option names are unchanged.
- PRESET_SCHEMA.md rewritten for the nested shape with a flat to nested table; the 0.2 reference moved to `docs/PRESET_SCHEMA-0.2-flat.md`. Subsystem docs updated.

### Added

- Library hygiene (roadmap section 4): README installs by git tag with a `prepare` script that builds `dist/` on install from git; `examples/embed/index.html` (19 lines) and `examples/react/` (`useAsciiEngine` hook, `AsciiCanvas` component), both checked by `npm run typecheck`; `npm run docs:api` generates a TypeDoc reference into `docs/api/`; `npm run test:coverage` with a floor (77% statements and lines, 80% branches, 69% functions) that CI enforces; CI also builds the docs.
- Effect unit tests: `tests/effects-unit.test.ts` covers `NoiseField`, `WaveField`, `Glitch`, `GlyphBurst`, and `Trails` directly (16 tests), alongside the existing plugin manager integration tests.
- **Plugin params.** `PluginConfig.params` sets a plugin's own tunables from a preset; every built in pattern and effect declares params with defaults equal to the constants they replaced (`spiral` arms, twist, orbit; `radialSymmetry` mix weights and ring frequency; `cellular` scale, threshold; `scanline` spacing, line width, static; `grid` cols, rows, line width; `wavePattern` frequencies; `glitch` rate, symbol share; `noise` and `wave` scales and floor; `burst` radius, spread, life, gain; `trails` decay, fade). Params reset to defaults on every preset load, values are clamped, unknown names are ignored. `engine.describePluginParams(id)`, `getPluginParams(id)`, `setPluginParams(id, params)` (emits `plugin`), on the facade too. `exportPreset()` writes only changed params; validation rejects non numeric params. `ParamStore` and `Parameterized` exported for third party plugins; `PatternPlugin` and `EffectPlugin` forward them. `options` on a plugin config is deprecated in favor of `params`. Harness: a slider per param of every enabled plugin under Composition.
- **Preset export and loader.** `engine.exportPreset({ id?, name? })` captures the current look as a nested preset: enabled effect and pattern plugins, motions with weights and priorities, simulations, post passes with amounts, layers, the glyph configuration (or a plain `glyphSet` after a host `setGlyphSet()` override), and every control the composition reads at its current value; a round trip renders the same frames. `engine.loadPresetFromUrl(url, init?)` fetches, validates, and applies; on any failure (HTTP, not JSON, invalid shape) it rejects with the reasons and leaves the look alone. Standalone `exportPreset(engine)`, `loadPresetFromUrl(url)` (fetch and validate only), `parsePreset(json)`, `presetToJson(preset)`; `downloadJson` exported from the root. Facade has `exportPreset` and `loadPresetFromUrl`. An empty `controls` array now derives sliders like a missing one. Harness Preset section: Save this look as JSON, load a preset file, load a preset URL.
- **Engine state.** `getState()` returns `'idle' | 'running' | 'destroyed'` (also `isDestroyed()` and `getDebugState().state`), replacing the private `running` and `destroyed` flags. Every transition emits a `state` event. `start()` and `stop()` are idempotent, `destroy()` is idempotent, `start()` after `destroy()` throws, and `setPreset`, `setControl`, `resize`, `noteOn` on a destroyed engine warn once and do nothing instead of touching released subsystems. The facade has `getState()`.
- **Frame budget.** Every hero preset measured at 1920x1080, ratio 2 and 1, recorded in BENCHMARKS.md with the method. The first run had Organic Bloom, Digital Forest, and Flow Field at 18 to 20 ms per frame; `drawGridToCanvas` now groups cells by 32 quantized brightness levels and sets `fillStyle` once per level from a memoized table, and no longer calls `glyphCache.measure()` per cell. Render went from about 12 ms to about 3.3 ms for 8960 cells; all six heroes are now 2.8 to 10.7 ms per frame. `examples/vanilla/bench.ts` (`runFrameBudget`, `benchTable`), a **Run frame budget** button in the harness Performance section, and `window.bench()` in dev.
- **`PointerInput`.** Mouse, touch, and pen through Pointer Events on the canvas (or any element), registered next to `KeyboardInput` and sharing its queue and mapper. Position is exposed normalized (`engine.getPointerState()`, `getDebugState().input.pointer`); a press is a `noteOn` at that position with velocity from pressure, the release its `noteOff`, per pointer. `enablePointerInput(target?, options?)`, `disablePointerInput()`, `isPointerInputEnabled()` on the engine, `enablePointerInput(options?)`, `disablePointerInput()`, `getPointerState()` on the facade. Options `tapToNote` and `captureTouch` (sets `touch-action: none` while enabled). `InputEvent` gains `x`, `y`; `InputSource` gains `'pointer'`; `PerformanceMapper` places notes by the event position when present. Off by default. Harness Input section has the toggle and shows the pointer state.
- **HiDPI.** The canvas renderers scale their backing store by `devicePixelRatio` (capped at 2) and draw through a matching transform, so glyphs are crisp on Retina screens. Grid, draw calls, and reported sizes stay in CSS pixels. `AsciiEngineOptions.pixelRatio` and `CreateEngineOptions.pixelRatio` (`'auto'` default, or a number clamped to 0.5 to 2); `engine.setPixelRatio()`, `engine.getPixelRatio()`, `RendererDebugState.pixelRatio`; `resolvePixelRatio()` and `MAX_PIXEL_RATIO` exported. `resize()` re-reads the device ratio when auto. Measured at 2x on a 791x1049 viewport: 3 to 7 ms per frame across the six hero presets. The harness Renderer section has a pixel ratio select and shows the backing store size. The harness PNG export no longer doubles the ratio a second time.
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
