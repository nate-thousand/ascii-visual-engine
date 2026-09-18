# ASCII Visual Engine · Brief

**What it is.** A Canvas 2D ASCII rendering engine, shipped as a TypeScript library. It turns a grid of characters into a real time visual instrument: patterns, motion fields, simulations, live sources, audio and MIDI input, compositing, export. The host application owns the shell; the engine owns the grid.

**Who it is for.** Nate's own instruments first. Plantasonic and Signal 9 mount it through `@plantasonic/platform`. The vanilla demo at `examples/vanilla` is the harness used to exercise the engine; hosts own their UI.

**Status.** v0.2.0 on `release/0.2.0`, 2026-09-17: local stabilization work, GitHub main, and the platform's vendored copy consolidated. Not on npm; hosts pin a git tag. The live site at visual-engine.xyz is the older June build and is currently broken until this is deployed. See ROADMAP.md.

---

## The idea in one line

One grid, many inputs. Anything that can produce a number per cell (a pattern, a motion field, a simulation, a webcam frame, an FFT band, a MIDI knob) drives which glyph lands in that cell and how it moves. Presets describe the look as plain JSON. The engine interprets them at runtime.

## What it does today

| Area | Shipped |
| --- | --- |
| Core | `AsciiEngine` lifecycle (start, stop, destroy, resize), typed `EventBus`, `getDebugState()`, preset validation at load |
| Patterns | Radial symmetry, spiral, wave, grid, cellular, scanline; registered as plugins |
| Effects | Wave, burst, glitch, trails, noise |
| Motion | Blendable behaviors: flow field, organic growth, orbital, breathing, curl noise and more; weights and priorities |
| Simulation | Particles, boids, cellular automata, reaction diffusion, L-system, gravity, spring, fluid |
| Sources | Procedural, image, video, webcam, canvas; brightness, edge, contrast mapping to glyphs |
| Renderers | Canvas 2D (working), DOM, offscreen canvas; live switching with grid state preserved; WebGL is a stub |
| Compositing | Multi layer with blend modes and masks; post passes: feedback, smear, threshold, dither and more |
| Audio | Web Audio input, FFT, feature extraction, audio to control and note mapping, smoothing controls |
| MIDI and input | Web MIDI, MIDI learn, keyboard performance mapping, device presets (Akai, Launchkey, QWERTY) |
| Glyph language | Categories, semantic roles, morphing, animation; eleven glyph libraries |
| Export | PNG, SVG, GIF, ASCII text, JSON scene; frame recording with scrub and step |
| Scripting | Safe public `ScriptAPI` over presets, controls, simulations, layers, events; script gallery in the demo |
| Performance | Frame profiler, quality presets, object pooling, glyph cache, dirty region rendering, spatial grid for boids |
| Presets | 30 built in across basic, motion, simulation, compositing, audio, performance, and glyph families |
| Tests | 205 passing (vitest) |
| Build | ESM 284 KB, CJS 213 KB, TypeScript declarations |

## What it is not

- Not a product UI. No application chrome ships with the library.
- Not GPU accelerated. `WebGLRendererStub.render()` is a no op. Canvas 2D is the working path.
- Not on npm. Consumers use a local path or a git dependency.
- Not a video editor or timeline tool. It is a live instrument.

## Design principles

| Principle | Meaning |
| --- | --- |
| Modular | Core, renderer, effects, presets, and events evolve independently |
| Plugin based | Visual behavior is composed from registered plugins, not monolithic rendering code |
| Canvas 2D first | The working renderer is Canvas 2D. DOM and offscreen exist. WebGL is a placeholder |
| Realtime | Built for continuous animation at display refresh rates |
| Host owned UI | The engine is imported. The host decides layout, routing, and controls |
| Creative coding friendly | Presets, controls, and events map to knobs, sliders, MIDI, and audio |
| TypeScript first | Full type exports for consumers and plugin authors |
| Event driven | Notes, controls, presets, and custom events flow through one typed bus |
| Portable | Zero framework dependency. Browsers and bundlers with canvas support |

## The three surfaces

| Surface | Where | Purpose |
| --- | --- | --- |
| Library | `src/`, built to `dist/` | What Plantasonic and Signal 9 import |
| Harness | `examples/vanilla` | Eight sections, one per subsystem: Preset, Source, Renderer, Audio, Input, Export, Performance, Scripting. Sliders are generated from `preset.controls` filtered by `listLiveControls()`, so every control on screen changes the output. Each section ends with a `getDebugState()` readout |

## How it is used

```typescript
import { AsciiEngine, getPreset } from 'ascii-visual-engine';

const engine = new AsciiEngine({ canvas: document.querySelector('canvas')! });
engine.setPreset(getPreset('glyphOrganicBloom'));
engine.start();

engine.setControl('speed', 0.8);
engine.on('note', ({ note, velocity }) => { /* host reacts */ });
```

Presets are plain objects. `setPreset()` validates the shape and throws with every problem listed, so a preset loaded from JSON fails loudly instead of breaking mid frame.

## Run it

```bash
npm install
npm run dev          # demo at http://localhost:5173
npm test             # 189 tests
npm run build        # library to dist/
npm run build:demo   # static demo to dist-demo/
```

## Where the record lives

| Document | What is in it |
| --- | --- |
| ROADMAP.md | What is done, what remains, in what order |
| CHANGELOG.md | Release notes, including the unreleased local work |
| ARCHITECTURE.md | Engine internals and data flow |
| API.md · PLUGIN_API.md · PRESET_SCHEMA.md · SCRIPT_API.md | Public contracts |
| Subsystem guides | MOTION_SYSTEM, SOURCE_PIPELINE, RENDERER_PIPELINE, SIMULATION_ENGINE, COMPOSITING, POST_PROCESSING, AUDIO_REACTIVITY, MIDI_AND_INPUT, GLYPH_LANGUAGE, GLYPH_LIBRARY, GLYPH_AUTHORING, RECORDING, EXPORTING, SCRIPTING, PERFORMANCE, OPTIMIZATION_GUIDE, BENCHMARKS |
| INTEGRATION.md (on GitHub) | The basic functionality contract for hosts |
