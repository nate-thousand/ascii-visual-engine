# ASCII Visual Engine

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/nate-thousand/ascii-visual-engine/releases/tag/v0.1.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#development)

A reusable TypeScript framework for building expressive, real-time ASCII visual systems.

**v0.1.0 MVP** — core library ready for integration; see [INTEGRATION.md](./INTEGRATION.md) for the basic functionality contract.

---

## Project Overview

ASCII Visual Engine is a portable rendering and animation framework — designed similarly to a game engine or audio engine — that powers ASCII-based visuals in any JavaScript environment. It is **not** a demo. It is **not** tied to any single product or installation. It is a library intended to be imported, extended, and composed into larger creative systems.

Use it to build:

- Interactive installations and performances
- Visual synthesizers and generative instruments
- Creative coding sketches and live visuals
- Interactive art and museum exhibits
- Terminal and CLI visualizations
- Games and playful interfaces
- Data visualizations with character-based aesthetics
- Web experiences and embedded displays

The engine handles grid management, frame timing, effect composition, preset loading, and event dispatch. Your application handles UI, input routing, audio analysis, or whatever domain logic your project requires.

---

## Core Philosophy

| Principle | Description |
| --- | --- |
| **Modular** | Systems are separated into core, renderer, effects, presets, and events. Each can evolve independently. |
| **Plugin based** | Visual behavior is composed from registered plugins and effects rather than monolithic rendering code. |
| **Renderer agnostic** | The engine abstracts rendering behind a renderer interface. Canvas 2D is the first implementation; GPU renderers are planned. |
| **High performance** | Built for real-time animation with `requestAnimationFrame`, efficient grid updates, and planned worker/GPU backends (experimental in v0.1). |
| **Framework first** | Optimized for reuse across projects, not for a single demo or product. |
| **Creative coding friendly** | Presets, controls, and events map naturally to knobs, sliders, MIDI, OSC, and generative parameters. |
| **TypeScript first** | Full type exports for consumers, contributors, and plugin authors. |
| **Realtime** | Designed for continuous animation at display refresh rates. |
| **Event driven** | Notes, controls, presets, and custom events flow through a typed event bus. |
| **Portable** | Zero framework dependency. Runs in browsers, bundlers, and any environment with canvas support. |

---

## Features (v0.1.0 MVP)

### Stable (basic functionality contract)

| System | Highlights |
| --- | --- |
| **Core** | `AsciiEngine`, presets, controls, typed events, `getDebugState()`, preset validation |
| **Plugins** | Effects (wave, burst, glitch, trails) and patterns (radial, spiral, grid, …) |
| **Motion** | Blendable motion fields — flow, organic growth, orbital, breathing, curl noise |
| **Simulation** | Particles, boids, CA, reaction diffusion, L-systems, gravity, spring, fluid |
| **Sources** | Image, video, webcam, canvas, procedural |
| **Renderers** | Canvas 2D, DOM, offscreen canvas |
| **Compositing** | Multi-layer blend modes, masks, post-processing passes |
| **Audio** | Web Audio FFT analysis and reactive control mapping |
| **MIDI** | Web MIDI, keyboard input, performance mapping, MIDI learn |
| **Glyphs** | Procedural glyph languages, categories, morphing, animation |
| **Export** | PNG, SVG, GIF, ASCII, JSON scene; recording and playback |
| **Scripting** | Safe `ScriptAPI`, example gallery |
| **Performance** | Frame profiler, quality presets, pooling, dirty region rendering |

### Experimental (not integration-ready)

| System | Status |
| --- | --- |
| **WebGL renderer** | Stub only — `WebGLRendererStub` has no GPU draw path |
| **Worker offload** | Infrastructure only — sync fallback is identity passthrough |
| **Video export** | MP4, WebM, PDF planned — not implemented in v0.1 |

**30 built-in presets** · **Full TypeScript definitions**

See [INTEGRATION.md](./INTEGRATION.md) for the integration guide and verification steps.

Run the demo locally:

```bash
npm install
npm run dev
```

Build the library for integration:

```bash
npm run build
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [API.md](./API.md) for full reference.

---

## Integration (Plantasonic & external projects)

Full guide: **[INTEGRATION.md](./INTEGRATION.md)**

Install from the built package or link locally:

```bash
# In ascii-visual-engine/
npm run build
npm link

# In your project (e.g. Plantasonic)
npm link ascii-visual-engine
```

Minimal usage:

```typescript
import { AsciiEngine, getPreset } from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new AsciiEngine({
  canvas,
  preset: getPreset('ambient'),
  width: window.innerWidth,
  height: window.innerHeight,
});

engine.on('frame', ({ fps }) => {
  console.log('FPS:', fps);
});

window.addEventListener('resize', () => {
  engine.resize(window.innerWidth, window.innerHeight);
});
```

TypeScript types are included — no `@types` package required.

---

## Architecture

The engine is organized into distinct systems:

```
┌──────────────────────────────────────────────────────────────┐
│                        AsciiEngine                           │
│  Lifecycle · Controls · Presets · Patterns · Frame Loop      │
├────────────┬─────────────┬────────────┬────────────┬────────┤
│  Renderer  │  Motions    │  Patterns   │  Effects   │ Presets │
│ Canvas 2D  │ Flow·Wave   │ Radial·Grid │ Burst·Glitch│ ambient │
│            │ Organic·Wind│ Spiral·Scan │ Trails     │ chaotic │
└────────────┴─────────────┴────────────┴────────────┴────────┘
```

| System | Role |
| --- | --- |
| **Core** | Engine lifecycle, frame loop, control state, preset management |
| **Renderer** | Grid creation, glyph drawing, resize, density changes |
| **Plugins** | Unified registration for patterns, effects, inputs, renderers |
| **Patterns** | Procedural forms — flowers, spirals, waves, grids, decay, scanlines |
| **Effects** | Per-frame visual modifiers (motion, glitch, trails, burst) |
| **Motion** | Field generators (`NoiseField`, `WaveField`) that drive glyph selection |
| **Input** | Web MIDI, keyboard, performance mapping, MIDI learn |
| **Presets** | Declarative visual configurations (glyphs, effects, defaults) |
| **Events** | Typed pub/sub for notes, controls, frames, and custom payloads |
| **Examples** | Reference integrations (vanilla demo; more planned) |
| **Documentation** | Architecture, API, plugin guide, preset schema, contributing |

Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Installation

### As a dependency

```bash
npm install ascii-visual-engine
```

### Development

```bash
git clone <repository-url>
cd ascii-visual-engine
npm install
```

### Build & test

```bash
npm run build      # Compile TypeScript + bundle to dist/
npm run typecheck  # Type-check without emitting
npm test           # Unit and integration tests (src/)
npm run test:all   # Build + full suite including dist consumer smoke test
```

### Run the example

```bash
npm run dev
```

Opens the **control surface demo** at `http://localhost:5173` — a fullscreen ASCII canvas with a collapsible panel for every wired engine parameter.

**Demo features:**

| Section | Controls |
| --- | --- |
| **Presets** | All 30 built-in presets, burst/note test triggers |
| **Visuals** | Renderer, density/scale, speed, brightness, contrast, trails, glitch, layers, blend modes, post-processing |
| **Glyphs** | Glyph language selector, custom glyph set |
| **Patterns / Motion / Simulation / Effects** | Toggle plugins and tune sliders |
| **Sources** | Procedural, image, video, webcam, canvas source pipeline |
| **Audio** | Microphone, file upload, play/pause, live meters, reactive bass/mid/treble mapping |
| **MIDI** | Device connect, keyboard input, learn, note/CC monitors, panic |
| **Debug** | Live engine state, performance graph, export/recording, script console |

**Quick actions:** Reset Demo · Randomize · Copy Preset JSON

On mobile, tap **☰ Controls** to show/hide the panel. Spacebar triggers a center burst.

---

## Example Usage

### Basic engine creation

```typescript
import { AsciiEngine, basicPreset } from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new AsciiEngine({
  canvas,
  preset: basicPreset,
  width: window.innerWidth,
  height: window.innerHeight,
});
```

### Loading a preset with plugins

```typescript
import { terminalPreset } from 'ascii-visual-engine';

engine.setPreset(terminalPreset);
// Enables plugins declared in preset.plugins:
// noise, burst, glitch, trails, scanline, grid
```

### Toggling plugins live

```typescript
engine.enablePlugin('radialSymmetry');
engine.disablePlugin('glitch');
engine.getPlugin('burst');
```

### Changing controls and patterns

```typescript
engine.setControl('density', 1.5);
engine.setControl('symmetry', 8);
engine.setControl('petals', 7);
engine.setControl('cellularAmount', 0.65);
engine.setControl('scanlineAmount', 0.75);

engine.enablePattern('radialSymmetry');
engine.enablePattern('spiral');
engine.disablePattern('grid');
```

### Handling events

```typescript
engine.on('noteOn', (event) => {
  console.log(`Burst at (${event.x}, ${event.y}) intensity ${event.intensity}`);
});

engine.on('control', ({ name, value }) => {
  console.log(`Control ${name} → ${value}`);
});

engine.on('frame', ({ fps }) => {
  document.title = `ASCII Engine — ${fps} fps`;
});

// Trigger a burst programmatically
engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.2 });

// Custom events
engine.emit({ type: 'scene-change', data: { scene: 'intro' } });
engine.on('custom', (event) => {
  if (event.type === 'scene-change') {
    // handle scene transition
  }
});
```

---

## Repository Structure

```
ascii-visual-engine/
├── src/
│   ├── core/           Engine, event bus, shared types
│   ├── renderers/      Canvas renderer (future: WebGL, terminal)
│   ├── patterns/       Procedural pattern implementations
│   ├── plugins/        Plugin system (manager, typed wrappers)
│   ├── effects/        Effect implementations (wrapped as plugins)
│   ├── presets/        Built-in preset definitions
│   └── index.ts        Public API barrel export
├── examples/
│   └── vanilla/        Standalone browser demo
├── dist/               Compiled library output (generated)
├── README.md           Project overview (this file)
├── ROADMAP.md          Milestone-driven development plan
├── ARCHITECTURE.md     System design and data flow
├── API.md              Public class and interface reference
├── PLUGIN_API.md       Plugin development guide
├── PRESET_SCHEMA.md    Preset format specification
├── MIDI_AND_INPUT.md   MIDI, keyboard, and performance mapping guide
├── GLYPH_LANGUAGE.md   Procedural glyph system overview
├── GLYPH_LIBRARY.md    Built-in glyph category reference
├── GLYPH_AUTHORING.md  Custom glyph language authoring guide
├── EXPORTING.md        PNG, SVG, GIF, ASCII, and sequence export
├── RECORDING.md        Recording and playback guide
├── SCENE_FORMAT.md     JSON scene import/export schema
├── SCRIPTING.md        Scripting API overview
├── SCRIPT_API.md       Script API reference
├── EXAMPLES.md         Example script gallery
├── PERFORMANCE.md      Performance system overview
├── BENCHMARKS.md       Automated benchmark suite
├── OPTIMIZATION_GUIDE.md Tuning guide for 60/120 FPS
├── AUDIO_REACTIVITY.md Web Audio analysis and mapping guide
├── CONTRIBUTING.md     Contribution guidelines
├── CHANGELOG.md        Version history
├── LICENSE             MIT license
├── package.json        Package metadata and scripts
├── tsconfig.json       TypeScript configuration
└── vite.config.ts      Build and dev server configuration
```

---

## Roadmap Summary

Development follows nineteen milestones from foundation through version 1.0:

1. Foundation
2. Pattern System
3. Rendering Engine
4. Plugin Architecture
5. Motion Systems
6. Visual Effects
7. Preset System
8. Input Layer
9. Audio Reactivity
10. MIDI Integration
11. Touch & Gestures
12. Performance Optimization
13. GPU Rendering Research
14. Shader Pipeline
15. Examples
16. Documentation
17. Testing
18. NPM Publishing
19. Version 1.0

Current overall progress: **MVP shipped (v0.1.0)** — future milestones tracked below.

See [ROADMAP.md](./ROADMAP.md) for task-level detail and completion status.

---

## Long Term Vision

ASCII Visual Engine aims to become the **ASCII equivalent** of foundational creative libraries:

| Library | Domain | ASCII Visual Engine parallel |
| --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) | Web audio synthesis | Visual synthesis with presets, notes, and real-time parameters |
| [Three.js](https://threejs.org/) | 3D rendering | Character grid rendering with pluggable backends |
| [Matter.js](https://brm.io/matter-js/) | 2D physics | Motion fields and force-driven glyph behavior |
| [PixiJS](https://pixijs.com/) | 2D WebGL rendering | High-performance ASCII rendering pipeline |

The goal is a mature, documented, npm-published framework that any developer can install, extend with plugins, and integrate into installations, instruments, games, and creative tools — without carrying project-specific baggage.

---

## Documentation Index

| Document | Description |
| --- | --- |
| [INTEGRATION.md](./INTEGRATION.md) | External project integration and basic functionality contract |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engine design, pipelines, and extension points |
| [API.md](./API.md) | Public class and method reference |
| [PLUGIN_API.md](./PLUGIN_API.md) | How to build custom plugins and effects |
| [MOTION_SYSTEM.md](./MOTION_SYSTEM.md) | Motion engine and blending |
| [SOURCE_PIPELINE.md](./SOURCE_PIPELINE.md) | Image/video/webcam/canvas → ASCII |
| [RENDERER_PIPELINE.md](./RENDERER_PIPELINE.md) | Canvas, DOM, offscreen, WebGL stub backends |
| [SIMULATION_ENGINE.md](./SIMULATION_ENGINE.md) | Particle, boids, CA, reaction-diffusion, L-systems |
| [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) | Preset format specification with examples |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Coding standards and pull request guidelines |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [ROADMAP.md](./ROADMAP.md) | Milestone plan and progress |

---

## License

[MIT](./LICENSE)
