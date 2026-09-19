# ASCII Visual Engine

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](./CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-326%20passing-brightgreen.svg)](#development)

A Canvas 2D ASCII engine used by [Plantasonic](https://github.com/nate-thousand/plantasonic) and [Signal 9](https://github.com/nate-thousand/signal-9-live). Grid, frame loop, presets, plugins, audio, and MIDI — the host app owns the shell.

**v0.3.0** (unreleased on `release/0.3.0`): library plus harness. Not on npm; hosts pin a git tag. WebGL is a stub (`render()` is a no-op).

**Brief:** [BRIEF.md](./BRIEF.md) · **Roadmap:** [ROADMAP.md](./ROADMAP.md)

**Live demo:** [visual-engine.xyz](https://visual-engine.xyz), the engine harness: eight sections, one per subsystem. `H` hides the panel, `?preset=<id>` boots a preset.

---

## Project Overview

This is a TypeScript library, not a product UI. Plantasonic and Signal 9 mount it through `@plantasonic/platform`. The vanilla demo is the public face of the engine itself.

The engine handles grid management, frame timing, effect composition, preset loading, and event dispatch. The host application handles layout, routing, and whatever else the show needs.

---

## Core Philosophy

| Principle | Description |
| --- | --- |
| **Modular** | Systems are separated into core, renderer, effects, presets, and events. Each can evolve independently. |
| **Plugin based** | Visual behavior is composed from registered plugins and effects rather than monolithic rendering code. |
| **Canvas 2D first** | The working renderer is Canvas 2D. DOM and offscreen canvas exist. WebGL is a placeholder, not a backend. |
| **Realtime** | Built for continuous animation at display refresh rates. |
| **Host-owned UI** | The engine is imported. It does not ship an application chrome. |
| **Creative coding friendly** | Presets, controls, and events map to knobs, sliders, MIDI, and audio. |
| **TypeScript first** | Full type exports for consumers and plugin authors. |
| **Event driven** | Notes, controls, presets, and custom events flow through a typed event bus. |
| **Portable** | Zero framework dependency. Runs in browsers and bundlers with canvas support. |

---

## Features (v0.1.0 MVP)

| System | Highlights |
| --- | --- |
| **Core** | `AsciiEngine`, presets, controls, typed events, `getDebugState()` |
| **Plugins** | Effects (wave, burst, glitch, trails) and patterns (radial, spiral, grid, …) |
| **Motion** | Blendable motion fields — flow, organic growth, orbital, breathing, curl noise |
| **Simulation** | Particles, boids, CA, reaction diffusion, L-systems, gravity, spring, fluid |
| **Sources** | Image, video, webcam, canvas, procedural |
| **Renderers** | Canvas 2D (working), DOM, offscreen canvas. WebGL stub does not draw. |
| **Compositing** | Multi-layer blend modes, masks, post-processing passes |
| **Audio** | Web Audio FFT analysis and reactive control mapping |
| **MIDI** | Web MIDI, keyboard input, performance mapping, MIDI learn |
| **Glyphs** | Procedural glyph languages, categories, morphing, animation |
| **Export** | PNG, SVG, GIF, ASCII, JSON scene; recording and playback |
| **Scripting** | Safe `ScriptAPI`, example gallery, hot reload in dev |
| **Performance** | Frame profiler, quality presets, pooling, dirty region rendering |

**29 built-in presets** · **162 tests** · **Full TypeScript definitions**

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

Install from GitHub (not npm):

```bash
npm install github:nate-thousand/ascii-visual-engine#v0.1.0
```

Or a sibling checkout:

```bash
# In ascii-visual-engine/
npm run build

# In the host app package.json
"ascii-visual-engine": "file:../ascii-visual-engine"
```

Minimal usage:

```typescript
import { createEngine } from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const engine = createEngine(canvas, { preset: 'glyphOrganicBloom' });

engine.setControl('speed', 0.8);
engine.on('frame', ({ fps }) => console.log('FPS:', fps));
window.addEventListener('resize', () => engine.resize(window.innerWidth, window.innerHeight));
```

`createEngine()` returns the host surface: lifecycle, preset and control setters, glyph and color overrides, source loading, keyboard input, the script engine, and `on`/`off`. The full `AsciiEngine` is on `engine.engine` for anything past that, and `new AsciiEngine(options)` still works. TypeScript types are included; no `@types` package required.

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

Hosts pin a git tag. Not published to npm; `npm install ascii-visual-engine` will not resolve this package.

```bash
npm install github:nate-thousand/ascii-visual-engine#v0.3.0
```

The package's `prepare` script builds `dist/` when npm installs from git, so the import works without a checkout of this repo:

```typescript
import { createEngine } from 'ascii-visual-engine';
```

Move between versions by changing the tag. Tags are listed in CHANGELOG.md; nothing on `main` is a release until it is tagged. Verified: `npm install git+...#release/0.3.0` in an empty project yields `dist/` and `import { createEngine }` resolves. If your npm blocks install scripts, allow this package's `prepare` (`npm approve-scripts ascii-visual-engine`) or build `dist/` yourself.

### Development

```bash
git clone <repository-url>
cd ascii-visual-engine
npm install
```

### Build

```bash
npm run build          # Compile TypeScript + bundle to dist/
npm run typecheck      # Library and examples, without emitting
npm run test           # 265 tests
npm run test:coverage  # Same, with the coverage floor CI enforces
npm run docs:api       # TypeDoc reference into docs/api/
```

### Run the example

```bash
npm run dev
```

Opens the harness at `http://localhost:5173`. One collapsible section per subsystem: Preset (sliders generated from the controls the preset actually reads, plus composition toggles), Source, Renderer, Audio, Input, Export, Performance, Scripting. Each section ends with a readout from `getDebugState()`. `H` hides the panel, `Space` fires a burst, `?preset=<id>` boots a preset.

---

## Example Usage

### Smallest possible embed

[`examples/embed/index.html`](./examples/embed/index.html) is the whole thing: a canvas, one `createEngine()` call, pointer input on, resize wired. Nineteen lines including the HTML.

### React

[`examples/react/useAsciiEngine.ts`](./examples/react/useAsciiEngine.ts) mounts the engine for the life of a component (create on mount, `ResizeObserver` for size, destroy on unmount) and [`AsciiCanvas.tsx`](./examples/react/AsciiCanvas.tsx) wraps it with `preset`, `controls`, and `pointer` props. Both typecheck against `src/` as part of `npm run typecheck`.

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
